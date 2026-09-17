import { webkit, devices } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import hosting from '../config/web-deploy.json' with { type: 'json' };

// Uses one real identification request and disposable browser data. Simulate
// only GPS: browser automation cannot supply the fresh hardware fix reliably.
const browser = await webkit.launch();
const context = await browser.newContext({
  ...devices['iPhone 13'],
  geolocation: { latitude: 37.1265, longitude: -8.604, accuracy: 8 },
  permissions: ['geolocation'],
});
const page = await context.newPage();
let stage = 'open',
  providerStatus;
page.on('response', (r) => {
  if (r.url().startsWith('https://my-api.plantnet.org/')) providerStatus = r.status();
});
try {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
      value: (success) =>
        success({
          coords: {
            latitude: 37.1265,
            longitude: -8.604,
            accuracy: 8,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        }),
    });
  });
  await page.goto(hosting.siteUrl, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Settings', exact: true }).waitFor();
  stage = 'recognition';
  await page
    .getByLabel('Photograph or choose an image')
    .setInputFiles('tests/fixtures/arbutus-unedo.jpg');
  await page.locator('.discovery-reveal').waitFor({ timeout: 45000 });
  await page.waitForFunction(() =>
    document.querySelector('.discovery-save')?.textContent?.includes('Added to your fieldbook'),
  );
  assert.equal(providerStatus, 200);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/iphone-live-recognition.png' });
  await page.getByRole('button', { name: 'Keep exploring' }).click();
  await page.screenshot({ path: 'artifacts/iphone-live-map.png' });
  stage = 'backup';
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Export my fieldbook' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download backup' }).click(),
  ]);
  const notebook = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(notebook.sightings.length, 1);
  assert.equal(notebook.sightings[0].species.scientificName, 'Arbutus unedo');
  assert.equal(notebook.sightings[0].lat, 37.1265);
  assert.match(notebook.sightings[0].photo.data, /^data:image\/jpeg;base64,/);
  console.log(
    'PASS live WebKit: photo upload → Pl@ntNet → saved sighting → downloadable photo backup (simulated GPS).',
  );
} catch (error) {
  console.error(
    `Live check failed at ${stage}: ${error.name}; provider status ${providerStatus ?? 'not received'}.`,
  );
  console.error(
    await page
      .getByRole('alert')
      .allTextContents()
      .catch(() => []),
  );
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
