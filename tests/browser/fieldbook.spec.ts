import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { walkingScene } from '../../config/walking';
const actual = { latitude: 37.1265, longitude: -8.604, accuracy: 8 };
async function mockGps(page: Page, context: BrowserContext, fresh = actual) {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation(actual);
  // Chromium 153's CDP override returns POSITION_UNAVAILABLE for maximumAge:0.
  // Stub only the fresh-fix hardware boundary; watchPosition, storage and app logic stay real.
  await page.addInitScript((position) => {
    Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {
      value: (
        success: PositionCallback,
        _error: PositionErrorCallback,
        options: PositionOptions,
      ) => {
        if (options.maximumAge !== 0) throw new Error('Recording must request a fresh fix');
        setTimeout(
          () =>
            success({
              coords: {
                ...position,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
                toJSON: () => position,
              },
              timestamp: Date.now(),
              toJSON: () => ({}),
            }),
          0,
        );
      },
    });
  }, fresh);
}
async function records(page: Page, table: string) {
  return page.evaluate(
    (table) =>
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const request = indexedDB.open('fieldbook');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const rows = db.transaction(table).objectStore(table).getAll();
          rows.onsuccess = () => {
            resolve(
              table === 'sightings'
                ? rows.result.filter((s: { retractedAt?: number }) => !s.retractedAt)
                : rows.result,
            );
            db.close();
          };
          rows.onerror = () => reject(rows.error);
        };
      }),
    table,
  );
}
async function tapPoint(page: Page, lat: number, lng: number, centre = actual) {
  // Project onto the north-up, pitched walking camera (MapLibre's default FOV).
  const box = await page.getByTestId('field-map').boundingBox();
  if (!box) throw new Error('No map');
  const scale = 512 * 2 ** walkingScene.zoom,
    y = (lat: number) => (1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2;
  const dy = (y(lat) - y(centre.latitude)) * scale;
  const pitch = (walkingScene.pitch * Math.PI) / 180;
  const perspective = (box.height * 1.5) / (box.height * 1.5 - dy * Math.sin(pitch));
  await page.getByTestId('field-map').click({
    position: {
      x: box.width / 2 + ((lng - centre.longitude) / 360) * scale * perspective,
      y: box.height / 2 + dy * Math.cos(pitch) * perspective,
    },
  });
}
async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('active-habitat')).toHaveText('Wetland');
  await expect(page.locator('.map-loading')).toHaveCount(0);
  await expect(page.locator('.lookout-card')).toHaveCount(3);
  const nearby = page.getByRole('button', { name: 'Nearby', exact: true });
  await expect(nearby).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#field-panel')).toBeHidden();
  await nearby.click();
  await expect(page.locator('#field-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Close nearby species' }).click();
  await expect(page.locator('#field-panel')).toBeHidden();
  await nearby.click();
}
async function openBook(page: Page, section = 'Species') {
  if (!(await page.getByRole('navigation', { name: 'Fieldbook views' }).isVisible())) {
    if (!(await page.getByRole('button', { name: /^Fieldbook/ }).isVisible()))
      await page.getByRole('button', { name: 'Explore', exact: true }).click();
    await page.getByRole('button', { name: /^Fieldbook/ }).click();
  }
  await page.getByRole('button', { name: section, exact: true }).click();
}
async function closeSpecies(page: Page) {
  if (await page.getByRole('dialog').isVisible())
    await page.getByRole('button', { name: 'Close species' }).click();
}
async function identifyAction(page: Page) {
  if (!(await page.getByRole('button', { name: 'Identify', exact: true }).isVisible()))
    await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByLabel('More identification options').click();
  await page.getByRole('button', { name: 'Recognition downloads', exact: true }).click();
}

test('Explore follows the walk, ignores remote map taps, and saves back onto the map', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mockGps(page, context);
  await ready(page);
  await expect(page.getByTestId('field-map')).toHaveAttribute('data-mode', 'explore');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
  const first = await page.locator('.lookout-card').first().getAttribute('data-testid');
  await tapPoint(page, 37.127, -8.6035);
  await expect(page.getByTestId('active-habitat')).toHaveText('Wetland');
  await expect(page.locator('.lookout-card').first()).toHaveAttribute('data-testid', first!);
  await page.locator('.lookout-name').first().click();
  await page.getByRole('button', { name: 'I’ve seen this', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'saved' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('field-map')).toHaveAttribute('data-sightings', '1');
  const sightings = await records(page, 'sightings');
  expect(sightings[0]).toMatchObject({
    lat: actual.latitude,
    lng: actual.longitude,
    wasInCandidateSet: true,
  });
  await page.reload();
  await expect(page.getByTestId('field-map')).toHaveAttribute('data-mode', 'explore');
  await expect(page.getByTestId('field-map')).toHaveAttribute('data-sightings', '1');
  // Keep the previous sighting in the closer walking camera's visible ground.
  const moved = { ...actual, latitude: actual.latitude + 0.0002 };
  await context.setGeolocation(moved);
  await expect(page.getByTestId('field-map')).toHaveAttribute('data-lat', String(moved.latitude));
  await page.waitForTimeout(1500);
  await tapPoint(page, actual.latitude, actual.longitude, moved);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('In your sightings', { exact: true })).toBeVisible();
  await closeSpecies(page);
  await openBook(page, 'Sightings');
  await expect(page.locator('.sighting-row')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test('mobile catalogue is uncapped, name logging accepts unusual species, interests persist', async ({
  page,
  context,
}) => {
  await mockGps(page, context);
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.getByRole('button', { name: 'See all 1,019 species' }).click();
  await expect(page.locator('.plant-row')).toHaveCount(50);
  await page.getByRole('button', { name: /Show more/ }).click();
  await expect(page.locator('.plant-row')).toHaveCount(100);
  await page.getByLabel('More identification options').click();
  await page.getByRole('button', { name: 'Find by name', exact: true }).click();
  await page.route('https://api.inaturalist.org/v1/taxa/autocomplete**', (route) =>
    route.fulfill({
      json: {
        results: [
          {
            id: 999999999,
            name: 'Test taxon',
            preferred_common_name: 'Test plant',
            iconic_taxon_name: 'Plantae',
            rank: 'species',
          },
        ],
      },
    }),
  );
  await page.getByRole('textbox', { name: 'Search species' }).fill('Test plant');
  await page.getByTestId('plant-999999999').click();
  await expect(page.locator('.reference-facts')).toBeVisible();
  await expect(page.locator('.story-prose')).not.toContainText('story coming');
  await page.getByRole('button', { name: 'I’ve seen this', exact: true }).click();
  await context.setGeolocation(actual);
  await expect(page.getByRole('status').filter({ hasText: 'saved' })).toContainText('unusual here');
  expect((await records(page, 'sightings'))[0].wasInCandidateSet).toBe(false);
  await closeSpecies(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Plants' }).uncheck();
  await expect(page.getByRole('checkbox', { name: 'Plants' })).toBeEnabled();
  await page.reload();
  await page.getByRole('button', { name: 'Nearby', exact: true }).click();
  await expect(page.getByText('No interests selected')).toBeVisible();
  await openBook(page, 'Sightings');
  await expect(page.locator('.sighting-row')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('production service worker reopens offline with cached map, lists and sightings', async ({
  page,
  context,
}) => {
  await mockGps(page, context);
  await ready(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.locator('.lookout-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Nearby', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cache = await caches.open('species-photos');
        return (await cache.keys()).length;
      }),
    )
    .toBeGreaterThan(0);
  await page.locator('.lookout-name').first().click();
  await page.getByRole('button', { name: 'I’ve seen this', exact: true }).click();
  await context.setGeolocation(actual);
  await expect(page.getByRole('status').filter({ hasText: 'saved' })).toBeVisible();
  await closeSpecies(page);
  await expect.poll(async () => (await records(page, 'tiles')).length).toBeGreaterThan(0);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Offline', { exact: false })).toBeVisible();
  await expect(page.getByTestId('field-map')).toHaveAttribute('data-sightings', '1');
  await expect(page.locator('.lookout-card')).toHaveCount(3);
  await expect(page.getByTestId('active-habitat')).toHaveText('Wetland');
  await expect(page.locator('.map-loading')).toHaveCount(0);
  await expect(page.locator('.map-error')).toHaveCount(0);
});
test('denied location leaves browsing available but never invents a sighting', async ({
  page,
  context,
}) => {
  await context.clearPermissions();
  await page.goto('/');
  await expect(page.getByText('Find your surroundings')).toBeVisible();
  await openBook(page);
  await page.locator('.collection-entry > button').first().click();
  await page.getByRole('button', { name: 'Use location to record' }).click();
  await expect(page.locator('.save-message')).toContainText('Allow location');
  expect(await records(page, 'sightings')).toHaveLength(0);
  expect(await records(page, 'visitedCells')).toHaveLength(0);
});

test('fixed zone browsing never creates visits and offline logging still uses fresh physical location', async ({
  page,
  context,
}) => {
  const fresh = { latitude: 41.2, longitude: -7.8, accuracy: 9 };
  await mockGps(page, context, fresh);
  await ready(page);
  await expect.poll(async () => (await records(page, 'visitedCells')).length).toBe(1);
  const before = await records(page, 'visitedCells');
  await openBook(page, 'Places');
  await page.getByRole('button', { name: /^Algarve / }).click();
  await page.getByRole('textbox', { name: 'Search zone species' }).fill('Suaeda vera');
  await expect(page.locator('.plant-row')).toHaveCount(1);
  expect(await records(page, 'visitedCells')).toEqual(before);
  await page.locator('.plant-row').click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'I’ve seen this', exact: true }).click();
  await expect(page.locator('.save-message')).toContainText('local records unavailable');
  const saved = (await records(page, 'sightings'))[0];
  expect(saved).toMatchObject({
    lat: fresh.latitude,
    lng: fresh.longitude,
    candidateSetAvailable: false,
  });
  const visited = await records(page, 'visitedCells');
  expect(visited).toHaveLength(2);
  expect(visited.find((c) => c.cell === saved.cell)?.taxonIds).toEqual([]);
});

test('water rendering leaves inland ground dry and still fills the sea', async ({
  page,
  context,
}) => {
  const centre = { latitude: 37.16, longitude: -8.64, accuracy: 81 };
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation(centre);
  await page.route('https://api.inaturalist.org/v1/observations/species_counts**', (route) =>
    route.fulfill({ json: { total_results: 0, results: [] } }),
  );
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Nearby', exact: true })).toBeEnabled();
  await expect(page.locator('.map-loading')).toHaveCount(0);
  await page.waitForTimeout(1500); // Let the initial GPS-follow animation finish.
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
    await page.waitForTimeout(400);
  }
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await page.waitForTimeout(1000); // Finish GPS centring and the zoom animation before sampling.
  const canvas = page.locator('.maplibregl-canvas');
  // Sample the geographical layer, without the new floating field-guide tray.
  await page.addStyleTag({
    content:
      '.view-explore .field-panel, .identify-action, .map-controls, .map-panel::after { visibility: hidden !important; }',
  });
  const box = await canvas.boundingBox();
  if (!box) throw new Error('No rendered map');
  const scale = 512 * 2 ** (walkingScene.zoom - 5);
  const y = (lat: number) => (1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2;
  const samples = [
    { lng: -8.67, lat: 37.18 }, // Woodland incorrectly flooded by a stream LineString fill.
    { lng: -8.65, lat: 37.18 }, // A second inland point under the same false lake.
    { lng: -8.63, lat: 37.118 }, // Actual sea polygon must remain blue.
  ].map(({ lng, lat }) => {
    const dy = (y(lat) - y(centre.latitude)) * scale;
    const pitch = (walkingScene.pitch * Math.PI) / 180;
    const perspective = (box.height * 1.5) / (box.height * 1.5 - dy * Math.sin(pitch));
    return {
      x: Math.round(box.width / 2 + ((lng - centre.longitude) / 360) * scale * perspective),
      y: Math.round(box.height / 2 + dy * Math.cos(pitch) * perspective),
    };
  });
  const png = (await canvas.screenshot()).toString('base64');
  const colours = await page.evaluate(
    async ({ png, samples }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${png}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const c = canvas.getContext('2d')!;
      c.drawImage(image, 0, 0);
      return samples.map(({ x, y }) => [...c.getImageData(x, y, 1, 1).data].slice(0, 3));
    },
    { png, samples },
  );
  const water = walkingScene.colours.water
    .slice(1)
    .match(/../g)!
    .map((byte) => parseInt(byte, 16));
  expect(colours[0]).not.toEqual(water);
  expect(colours[1]).not.toEqual(water);
  expect(colours[2]).toEqual(water);
});

test('country and zone checklists share collected status and retain every repeat sighting', async ({
  page,
  context,
}) => {
  await mockGps(page, context);
  await ready(page);
  await openBook(page);
  const original = await page.getByTestId('collection-progress').innerText();
  expect(original).toMatch(/^0 of [\d,]+ collected/);
  await page.getByRole('textbox', { name: 'Search your fieldbook' }).fill('Arbutus unedo');
  await page.locator('.collection-entry > button').first().click();
  await page.getByRole('button', { name: 'I’ve seen this', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Record another sighting' }).click();
  await expect.poll(async () => (await records(page, 'sightings')).length).toBe(2);
  await closeSpecies(page);
  await expect(page.getByTestId('collection-progress')).toHaveText(original.replace(/^0 /, '1 '));
  await page.getByRole('button', { name: 'Where to find it', exact: true }).click();
  await expect(page.locator('.where-panel')).toContainText('Shaded zones');
  await page.getByRole('button', { name: /^Porto / }).click();
  await page.getByRole('textbox', { name: 'Search zone species' }).fill('Arbutus unedo');
  await expect(page.locator('.plant-row')).toContainText('Collected');
  await expect(page.getByTestId('field-map')).toHaveAttribute('data-sightings', '0');
  await openBook(page, 'Sightings');
  await expect(page.locator('.sighting-row')).toHaveCount(2);
  await expect(page.getByTestId('field-map')).toHaveAttribute('data-sightings', '2');
  await page.reload();
  await openBook(page);
  await expect(page.getByTestId('collection-progress')).toHaveText(original.replace(/^0 /, '1 '));
});

test('real recognition and photo logging work after an offline reload', async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const { default: downloads } = await import('../../config/generated/recognition-downloads.json', {
    with: { type: 'json' },
  });
  const assets = Object.values(downloads.files);
  const requested: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (/^\/(recognition-downloads|models|runtime)\//.test(path)) requested.push(path);
  });
  // Fail after one completed chunk; a reload/retry must reuse that saved chunk.
  await page.route(`**${assets[1].url}`, (route) => route.fulfill({ status: 503 }), { times: 1 });
  const { default: starter } = await import('../../config/generated/starter.json', {
    with: { type: 'json' },
  });
  await mockGps(page, context);
  await page.route('https://api.inaturalist.org/**', (route) => {
    if (route.request().url().includes('species_counts'))
      return route.fulfill({
        json: {
          total_results: starter.candidates.length,
          results: starter.candidates.map((c) => ({
            count: c.count,
            taxon: {
              id: c.species.id,
              name: c.species.scientificName,
              preferred_common_name: c.species.commonName,
              iconic_taxon_name: 'Plantae',
              rank: 'species',
            },
          })),
        },
      });
    return route.fulfill({ json: { results: { month_of_year: {} } } });
  });
  await ready(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await identifyAction(page);
  await expect(page.locator('.download-card')).toContainText(
    `${(downloads.downloadBytes / 1e6).toFixed(0)} MB`,
  );
  await page.getByRole('button', { name: 'Download recognition files' }).click();
  await expect(page.getByRole('alert')).toContainText('tap download to resume');
  await page.reload();
  await identifyAction(page);
  await page.getByRole('button', { name: 'Download recognition files' }).click();
  await expect(page.locator('.download-card')).toHaveCount(0, { timeout: 60000 });
  expect(new Set(requested)).toEqual(new Set(assets.map((asset) => asset.url)));
  expect(requested.filter((url) => url === assets[0].url)).toHaveLength(1);
  expect(requested.filter((url) => url === assets[1].url)).toHaveLength(2);
  await context.setOffline(true);
  await page.reload();
  await identifyAction(page);
  await page
    .getByLabel('Photograph or choose an image')
    .setInputFiles('tests/fixtures/arbutus-unedo.jpg');
  await expect(page.locator('.discovery-reveal')).toContainText('Arbutus unedo', {
    timeout: 30000,
  });
  await expect(page.locator('.discovery-save')).toContainText('Added to your fieldbook');
  await expect(page.locator('.discovery-awards')).toContainText('New to your fieldbook');
  expect(await records(page, 'sightings')).toHaveLength(1);
  await page.getByRole('button', { name: 'Keep exploring' }).click();
  await expect(page.getByTestId('field-map')).toHaveAttribute('data-mode', 'explore');
  const rows = await records(page, 'sightings');
  expect(rows[0]).toMatchObject({ taxonId: 82689, lat: actual.latitude, lng: actual.longitude });
  const photoBytes = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const r = indexedDB.open('fieldbook');
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const q = r.result.transaction('sightings').objectStore('sightings').getAll();
          q.onsuccess = () => {
            resolve(q.result[0].photoBytes?.byteLength ?? q.result[0].photo?.size ?? 0);
            r.result.close();
          };
        };
      }),
  );
  expect(photoBytes).toBeGreaterThan(1000);
  await openBook(page, 'Sightings');
  // The saved photograph must draw inside the marker even with no network.
  // A flat green fallback has only one colour in this central crop.
  await expect
    .poll(() =>
      page.locator('.map-overlay').evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const pixels = canvas
          .getContext('2d')!
          .getImageData(
            Math.floor(canvas.width / 2) - 8,
            Math.floor(canvas.height / 2) - 8,
            16,
            16,
          ).data;
        const colours = new Set<string>();
        for (let i = 0; i < pixels.length; i += 4)
          if (pixels[i + 3] === 255) colours.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
        return colours.size;
      }),
    )
    .toBeGreaterThan(30);
  await closeSpecies(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Export my fieldbook' }).click();
  const exported = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download backup' }).click();
  const download = await exported;
  const path = await download.path();
  const { readFile } = await import('node:fs/promises');
  const notebook = JSON.parse(await readFile(path!, 'utf8'));
  expect(notebook.schemaVersion).toBe(2);
  expect(notebook.sightings[0].photo.data).toMatch(/^data:image\/jpeg;base64,/);
  const diagnosticsDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export diagnostics' }).click();
  const diagnosticsPath = await (await diagnosticsDownload).path();
  const journal = JSON.parse(await readFile(diagnosticsPath!, 'utf8'));
  const events = journal.events as { event: string; details: Record<string, any> }[];
  expect(events.find((e) => e.event === 'download.error')?.details.cause.status).toBe(503);
  expect(events.some((e) => e.event === 'model.ready')).toBe(true);
  expect(events.some((e) => e.event === 'inference.complete')).toBe(true);
  expect(
    events.some(
      (e) => e.event === 'recognition.storage' && e.details.ready && e.details.referencePackReady,
    ),
  ).toBe(true);
  expect(events.some((e) => e.event === 'download.progress' && e.details.source === 'cache')).toBe(
    true,
  );
  expect(events.find((e) => e.event === 'session.start')?.details.origin).toBe(
    'http://localhost:4173',
  );
  expect(
    events.some((e) => e.event === 'storage.context' && e.details.storageId !== 'unavailable'),
  ).toBe(true);
  const recognition = events.find((e) => e.event === 'identify.result')!;
  expect(recognition.details.matches[0].scientificName).toBe('Arbutus unedo');
  expect(recognition.details.inferenceMilliseconds).toBeGreaterThan(0);
  expect(events.find((e) => e.event === 'sighting.saved')?.details.sightingId).toBe(rows[0].id);
  const operation = recognition.details.operation;
  const preparation = events.filter(
    (e) => e.details.operation === operation && e.event.startsWith('encounter.'),
  );
  expect(preparation.map((e) => e.event)).toEqual([
    'encounter.start',
    'encounter.location',
    'encounter.records',
  ]);
  expect(events.indexOf(preparation[2])).toBeLessThan(events.indexOf(recognition));
  const prepared = events.find((e) => e.event === 'sighting.prepared')!;
  expect(prepared.details.encounterOperation).toBe(operation);
  expect(prepared.details.achievements).toContain('new-species');
  expect(events.indexOf(prepared)).toBeLessThan(
    events.findIndex((e) => e.event === 'sighting.saved'),
  );
  expect(
    events.find((e) => e.event === 'sighting.saved')?.details.persistenceMilliseconds,
  ).toBeGreaterThanOrEqual(0);

  expect(JSON.stringify(journal)).not.toContain('data:image');
  await identifyAction(page);
  await page.getByText('Other options', { exact: true }).click();
  await page.getByRole('button', { name: 'Describe instead', exact: true }).click();
  await page.getByLabel('Describe what you saw').fill('a photo of Arbutus unedo');
  await page.getByRole('button', { name: 'Identify description', exact: true }).click();
  await expect(page.locator('.discovery-reveal')).toContainText('Arbutus unedo', {
    timeout: 30000,
  });
  await expect(page.locator('.discovery-save')).toContainText('Added to your fieldbook');
  await page.getByRole('button', { name: 'Not this species?' }).click();
  await expect(page.locator('.recognition-alternatives')).toBeVisible();
  expect(await records(page, 'sightings')).toHaveLength(1);
  await page.getByRole('button', { name: 'Close identification' }).click();
  // Photo capture starts recognition without a second identify button.
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Identify', exact: true }).click();
  await (await chooser).setFiles('tests/fixtures/arbutus-unedo.jpg');
  await expect(page.locator('.discovery-reveal')).toContainText('Arbutus unedo', {
    timeout: 30000,
  });
  await expect(page.locator('.discovery-save')).toContainText('Added to your fieldbook');
  await page.getByRole('button', { name: 'Not this species?' }).click();
  await expect(page.locator('.recognition-alternatives')).toBeVisible();
  await page.getByRole('button', { name: 'Find by name', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search species' }).fill('Arbutus unedo');
  await page.getByTestId('plant-82689').click();
  await page.getByRole('button', { name: 'Record another sighting' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'saved' })).toBeVisible();
  expect(await records(page, 'sightings')).toHaveLength(2);
  const savedPhotoSizes = await page.evaluate(
    () =>
      new Promise<number[]>((resolve, reject) => {
        const r = indexedDB.open('fieldbook');
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const q = r.result.transaction('sightings').objectStore('sightings').getAll();
          q.onsuccess = () => {
            resolve(
              q.result
                .filter((s) => !s.retractedAt)
                .map((s) => s.photoBytes?.byteLength ?? s.photo?.size ?? 0),
            );
            r.result.close();
          };
        };
      }),
  );
  expect(savedPhotoSizes.every((size) => size > 1000)).toBe(true);
});

test('supplementary sources survive a primary outage without invented provenance or unusual flags', async ({
  page,
  context,
}) => {
  const remote = { latitude: 37.5, longitude: -8.6, accuracy: 8 };
  await mockGps(page, context, remote);
  await context.setGeolocation(remote);
  await page.route('https://api.inaturalist.org/**', (r) =>
    r.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.route('https://api.gbif.org/**', (r) =>
    r.fulfill({
      json: r.request().url().includes('/occurrence/search')
        ? { facets: [{ field: 'SPECIES_KEY', counts: [{ name: '123', count: 10 }] }] }
        : { key: 123, canonicalName: 'Arbutus unedo', rank: 'SPECIES', kingdom: 'Plantae' },
    }),
  );
  await page.route('https://api.obis.org/**', (r) =>
    r.fulfill({
      json: {
        total: 1,
        results: [
          {
            taxonID: 50,
            scientificName: 'Example marina',
            taxonRank: 'Species',
            kingdom: 'Plantae',
            records: 7,
          },
        ],
      },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Nearby', exact: true }).click();
  await expect(page.getByRole('button', { name: 'See all 2 species' })).toBeVisible();
  await page.getByRole('button', { name: 'See all 2 species' }).click();
  await expect(page.locator('.source-note')).toContainText('GBIF / OBIS records');
  await page.getByTestId('plant--1000000000050').click();
  await expect(page.getByRole('link', { name: 'View on OBIS' })).toHaveAttribute(
    'href',
    'https://obis.org/taxon/50',
  );
  await page.getByRole('button', { name: 'I’ve seen this', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'saved' })).toContainText(
    'local records unavailable',
  );
  const rows = await records(page, 'sightings');
  expect(rows[0]).toMatchObject({ taxonId: -1000000000050, candidateSetAvailable: false });
});

test('Fieldbook stays browsable offline and identification cancellation returns without a sighting', async ({
  page,
  context,
}) => {
  await mockGps(page, context);
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await openBook(page, 'Places');
  await page.getByRole('button', { name: /^Porto / }).click();
  const progress = await page.getByTestId('zone-progress').innerText();
  await context.setOffline(true);
  await identifyAction(page);
  await page
    .getByLabel('Photograph or choose an image')
    .setInputFiles('tests/fixtures/arbutus-unedo.jpg');
  await expect(page.locator('.discovery-original .local-photo')).toHaveCount(1);
  await page.getByText('Other options', { exact: true }).click();
  await page.getByRole('button', { name: 'Find by name', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search species' }).fill('Arbutus unedo');
  await expect(page.getByTestId('plant-82689')).toBeVisible();
  await page.getByRole('button', { name: 'Back to identification' }).click();
  await expect(page.locator('.discovery-original .local-photo')).toHaveCount(1);
  await page.getByRole('button', { name: 'Close identification' }).click();
  expect(await records(page, 'sightings')).toHaveLength(0);
  await expect(page.getByTestId('field-map')).toHaveAttribute('data-mode', 'explore');
  await expect(page.getByTestId('active-habitat')).toHaveText('Wetland');
  await page.reload();
  await openBook(page, 'Places');
  await page.getByRole('button', { name: /^Porto / }).click();
  await expect(page.getByTestId('zone-progress')).toHaveText(progress);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('returning from Fieldbook after resizing keeps the walking map centred on the user', async ({
  page,
  context,
}) => {
  await mockGps(page, context);
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.locator('.lookout-name').first().click();
  await page.getByRole('button', { name: 'I’ve seen this', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'saved' })).toBeVisible();
  await openBook(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await page.waitForTimeout(1500);
  await tapPoint(page, actual.latitude, actual.longitude);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('In your sightings', { exact: true })).toBeVisible();
});

test('wanted discoveries persist and themed collections are browsable without recording', async ({
  page,
  context,
}) => {
  await mockGps(page, context);
  await ready(page);
  const first = page.locator('.lookout-card').first();
  const id = await first.getAttribute('data-testid');
  await first.getByRole('button', { name: /^Look out for/ }).click();
  await expect(first).toContainText('On your list');
  await page.reload();
  await expect(page.locator(`[data-testid="${id}"]`)).toContainText('On your list');
  expect((await records(page, 'settings'))[0].wanted).toHaveLength(1);
  await openBook(page);
  await page.getByRole('button', { name: /^Oaks/ }).click();
  await expect(page.locator('.collection-entry')).toHaveCount(5);
  await page.getByRole('button', { name: /^Pines/ }).click();
  await expect(page.locator('.collection-entry')).toHaveCount(2);
  expect(await records(page, 'sightings')).toHaveLength(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Plants' }).uncheck();
  expect((await records(page, 'settings'))[0].wanted).toHaveLength(1);
});
