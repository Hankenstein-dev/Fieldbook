import { test, expect } from '@playwright/test';

test('phone photo diagnostics persist offline, relay after reconnect and export', async ({
  page,
  context,
  request,
}) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Automatically send logs and photos to this computer' }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  const filename = `phone-test-${Date.now()}.jpg`;
  // An unreadable camera file should produce a user error and a correlated diagnostic.
  await page
    .getByLabel('Choose an existing photo')
    .setInputFiles({ name: filename, mimeType: 'image/jpeg', buffer: Buffer.from('broken image') });
  await expect(page.getByRole('alert')).toContainText('could not be opened');
  await expect
    .poll(async () => {
      const events = await (await request.get('/__fieldbook_debug/events')).json();
      return events.some(
        (e: { details: { filename?: string } }) => e.details.filename === filename,
      );
    })
    .toBe(true);
  await context.setOffline(true);
  await page
    .getByLabel('Choose an existing photo')
    .setInputFiles('tests/fixtures/arbutus-unedo.jpg');
  await expect(page.getByAltText('Your photo 1')).toBeVisible();
  await page.getByRole('button', { name: 'Close identification', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export diagnostics' }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  const events = exported.events;
  const selected = events.find(
    (e: { details: { filename?: string } }) => e.details.filename === filename,
  );
  expect(
    events.some(
      (e: { event: string; details: { photoId?: string } }) =>
        e.event === 'photo.error' && e.details.photoId === selected.details.photoId,
    ),
  ).toBe(true);
  expect(events.some((e: { event: string }) => e.event === 'photo.prepared')).toBe(true);
  expect(
    events.find((e: { event: string }) => e.event === 'session.start').details.secureContext,
  ).toBe(true);
  expect(JSON.stringify(events)).not.toContain('data:image');
  const retained = events.find((e: { event: string }) => e.event === 'photo.retained');
  expect(retained.details.photoId).toBeTruthy();
  // Dismissed identification survives a full offline reload without becoming a sighting.
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText('Recent identification photos', { exact: true }).click();
  await expect(page.getByAltText('arbutus-unedo.jpg')).toBeVisible();
  const jpegDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download photo', exact: true }).click();
  expect((await jpegDownload).suggestedFilename()).toBe(
    `fieldbook-${retained.details.photoId}.jpg`,
  );
  const uploadedPath = `/__fieldbook_debug/photos/${retained.details.photoId}`;
  // A failed upload must retry from the persistent queue.
  await page.route(`**${uploadedPath}`, (route) => route.fulfill({ status: 503 }), { times: 1 });
  await context.setOffline(false);
  await expect
    .poll(async () => {
      const received = await (await request.get('/__fieldbook_debug/events')).json();
      return received.some(
        (e: { session: string; event: string }) =>
          e.session === selected.session && e.event === 'photo.prepared',
      );
    })
    .toBe(true);
  await expect.poll(async () => (await request.get(uploadedPath)).status()).toBe(200);
  const uploaded = await request.get(uploadedPath);
  expect(uploaded.headers()['content-type']).toBe('image/jpeg');
  expect((await uploaded.body()).length).toBe(retained.details.bytes);
  await expect(page.getByText('Sent to computer', { exact: false })).toBeVisible();
  const viewer = await context.newPage();
  await viewer.goto('/__fieldbook_debug');
  await viewer.getByRole('textbox', { name: 'Filter logs' }).fill(retained.details.photoId);
  await expect(viewer.locator('main img').first()).toBeVisible();
  await viewer.close();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Automatically send logs and photos to this computer' }),
  ).toBeChecked();
});
