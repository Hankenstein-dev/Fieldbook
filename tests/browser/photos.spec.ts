import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  serviceWorkers: 'block',
});

test('photos enlarge throughout the app, pinch zoom, and return to the underlying species', async ({
  page,
  context,
}) => {
  await page.route('**/photos/**', (route) =>
    route.fulfill({ path: 'tests/fixtures/arbutus-unedo.jpg', contentType: 'image/jpeg' }),
  );
  await page.goto('/');
  // New Android WebViews draw behind system bars and expose these Capacitor
  // insets. Check real controls, including dialogs rendered outside the app root.
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--safe-area-inset-top', '48px');
    document.documentElement.style.setProperty('--safe-area-inset-bottom', '24px');
  });
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  expect((await settings.boundingBox())!.y).toBeGreaterThanOrEqual(48);
  await settings.click();
  await expect(page.locator('.app')).toHaveClass(/view-settings/);
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByRole('button', { name: /^Fieldbook/ }).click();
  await page.getByLabel('Search your fieldbook').fill('Ceratonia siliqua');
  const entry = page.locator('.collection-entry').first();
  await expect(entry.locator('img')).toBeVisible();
  // Restored default photo also works for older stored metadata lacking a photo.
  await expect(entry.locator('img')).toHaveAttribute('src', /74990935\/medium.jpg/);
  // Test fallback before the larger rendition has entered the browser's image cache.
  await page.route('**/photos/**/large.*', (route) => route.abort());
  await entry.getByRole('button', { name: /^Enlarge photo:/ }).click();
  const viewer = page.getByRole('dialog', { name: /^Photo viewer:/ });
  expect(
    (await viewer.getByRole('button', { name: 'Close photo' }).boundingBox())!.y,
  ).toBeGreaterThanOrEqual(48);
  await expect(viewer.locator('img')).toHaveAttribute('src', /medium.jpg/);
  await viewer.getByRole('button', { name: 'Close photo' }).click();
  await page.unroute('**/photos/**/large.*');
  await entry.getByRole('button', { name: /^Enlarge photo:/ }).click();
  await expect(viewer.locator('img')).toHaveAttribute('src', /74990935\/large.jpg/);
  await expect(viewer).toContainText('all-rights-reserved');
  await expect
    .poll(() => viewer.locator('img').evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/photo-viewer-mobile.png' });
  await viewer.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(viewer.locator('.photo-stage')).toHaveAttribute('data-zoom', '1.50');
  await viewer.getByRole('button', { name: 'Fit photo' }).click();
  const box = (await viewer.locator('.photo-stage').boundingBox())!;
  const cdp = await context.newCDPSession(page);
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: x - 30, y },
      { x: x + 30, y },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: x - 80, y },
      { x: x + 80, y },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect
    .poll(async () => Number(await viewer.locator('.photo-stage').getAttribute('data-zoom')))
    .toBeGreaterThan(2);
  await viewer.getByRole('button', { name: 'Close photo' }).click();
  await entry.getByRole('button', { name: /not yet collected/ }).click();
  const sheet = page.locator('.species-dialog');
  await sheet.getByRole('button', { name: /^Enlarge photo:/ }).click();
  await expect(viewer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Close species' }).click();
  await page
    .getByLabel('Choose an existing photo')
    .setInputFiles('tests/fixtures/arbutus-unedo.jpg');
  await page.getByRole('button', { name: 'Enlarge photo: Your photo 1' }).click();
  await expect(viewer.locator('img')).toHaveAttribute('src', /^blob:/);
  await viewer.getByRole('button', { name: 'Close photo' }).click();
  await expect(page.getByAltText('Your photo 1')).toBeVisible();
  expect(await page.locator('button button').count()).toBe(0);
});
