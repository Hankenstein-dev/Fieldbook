import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function settings(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
}
async function collectionSize(page: Page) {
  return page.evaluate(
    async () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('fieldbook');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const query = db.transaction('sightings').objectStore('sightings').count();
          query.onsuccess = () => {
            resolve(query.result);
            db.close();
          };
          query.onerror = () => reject(query.error);
        };
      }),
  );
}

test('iPhone web build explains installation and does not offer unavailable downloads or computer sync', async ({
  page,
}) => {
  const debug: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('__fieldbook_debug')) debug.push(r.url());
  });
  await page.goto('/');
  await settings(page);
  await expect(page.getByText(/On iPhone, open this address in Safari/)).toBeVisible();
  await expect(page.getByText(/After each walk, save a backup/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Protect storage' })).toBeVisible();
  await page.getByRole('button', { name: 'Protect storage' }).click();
  await expect(
    page.getByText(
      /Browser storage protection is enabled|browser has not granted storage protection|Could not request browser storage protection/,
    ),
  ).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Automatically send/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByLabel('More identification options').click();
  await expect(page.getByRole('button', { name: 'Recognition downloads' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Describe', exact: true })).toHaveCount(0);
  expect(debug).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('photo backup survives export, a separate device, repeat import and reopening', async ({
  page,
  browser,
}) => {
  const photo = (await readFile('tests/fixtures/arbutus-unedo.jpg')).toString('base64');
  const original = {
    schemaVersion: 2,
    species: [],
    visitedCells: [],
    preferences: { id: 'preferences', interests: ['plants'], wanted: [82742] },
    sightings: [
      {
        id: 'iphone-backup-test',
        taxonId: 82742,
        timestamp: 1788960000000,
        lat: 37.18,
        lng: -8.6,
        accuracy: 8,
        cell: 'eyc8e',
        wasInCandidateSet: true,
        candidateSetAvailable: true,
        species: {
          id: 82742,
          scientificName: 'Ceratonia siliqua',
          commonName: 'Carob',
          group: 'plants',
          rank: 'species',
          alternativeNames: [],
        },
        photo: { type: 'image/jpeg', data: `data:image/jpeg;base64,${photo}` },
      },
    ],
  };
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await settings(page);
  await Promise.all([
    Promise.race([
      page.waitForEvent('load'),
      page
        .getByRole('alert')
        .waitFor()
        .then(async () => {
          throw new Error(await page.getByRole('alert').innerText());
        }),
    ]),
    page.getByLabel('Import a Fieldbook export').setInputFiles({
      name: 'original.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(original)),
    }),
  ]);
  await settings(page);
  await page.getByRole('button', { name: 'Export my fieldbook' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download backup' }).click(),
  ]);
  const exported = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(exported).sightings).toEqual(original.sightings);
  expect(JSON.parse(exported).preferences).toEqual(original.preferences);

  const otherContext = await browser.newContext({ baseURL: 'http://localhost:4175' });
  try {
    const other = await otherContext.newPage();
    await other.goto('/');
    await settings(other);
    expect(await collectionSize(other)).toBe(0);
    // Restore into a fresh device without access to the first device's storage.
    for (let i = 0; i < 2; i++) {
      await Promise.all([
        other.waitForEvent('load'),
        other.getByLabel('Import a Fieldbook export').setInputFiles({
          name: 'backup.json',
          mimeType: 'application/json',
          buffer: Buffer.from(exported),
        }),
      ]);
      await settings(other);
    }
    expect(await collectionSize(other)).toBe(1);
    await other.getByRole('button', { name: 'Export my fieldbook' }).click();
    const [restored] = await Promise.all([
      other.waitForEvent('download'),
      other.getByRole('link', { name: 'Download backup' }).click(),
    ]);
    expect(JSON.parse(await readFile((await restored.path())!, 'utf8')).sightings).toEqual(
      original.sightings,
    );
  } finally {
    await otherContext.close();
  }
  await page.reload();
  await settings(page);
  expect(await collectionSize(page)).toBe(1);
  // Physical iPhone offline reopening is a separate acceptance check: this
  // WebKit runner reports internal navigation/Blob errors in emulated offline mode.
  await page.getByRole('button', { name: 'Export my fieldbook' }).click();
  await expect(page.getByRole('link', { name: 'Download backup' })).toBeVisible();
});

test('sharing uses a fresh tap and cancellation keeps the downloadable backup', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => true });
    Object.defineProperty(navigator, 'share', {
      value: async (data: ShareData) => {
        (window as unknown as { shared: unknown }).shared = {
          active: navigator.userActivation.isActive,
          files: data.files?.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        };
        throw new DOMException('Cancelled', 'AbortError');
      },
    });
  });
  await page.goto('/');
  await settings(page);
  await page.getByRole('button', { name: 'Export my fieldbook' }).click();
  await page.getByRole('button', { name: 'Save or share backup' }).click();
  const shared = await page.evaluate(
    () =>
      (
        window as unknown as {
          shared: { active: boolean; files: { type: string; size: number }[] };
        }
      ).shared,
  );
  expect(shared.active).toBe(true);
  expect(shared.files[0].type).toBe('application/json');
  expect(shared.files[0].size).toBeGreaterThan(0);
  await expect(page.getByRole('link', { name: 'Download backup' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
