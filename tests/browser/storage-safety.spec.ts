import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('sightings recover after database loss and full computer backups restore their photos', async ({
  page,
  context,
  request,
}) => {
  const photo = (await readFile('tests/fixtures/arbutus-unedo.jpg')).toString('base64');
  const id = `recovery-test-${Date.now()}`;
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Automatically send logs and photos to this computer' })
    .uncheck();
  await page.evaluate(
    async ({ id, photo }) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('fieldbook');
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction('sightings', 'readwrite');
          tx.objectStore('sightings').put({
            id,
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
            photo: new Blob([Uint8Array.from(atob(photo), (c) => c.charCodeAt(0))], {
              type: 'image/jpeg',
            }),
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      });
    },
    { id, photo },
  );
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('fieldbook-sighting-safety-v1') ?? '[]').length,
      ),
    )
    .toBe(1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Automatically send logs and photos to this computer' })
    .check();
  const device = await page.evaluate(() => localStorage.getItem('fieldbook-storage-id'));
  const endpoint = `/__fieldbook_debug/notebooks/${device}/${id}`;
  await expect.poll(async () => (await request.get(endpoint)).status()).toBe(200);
  expect((await (await request.get(endpoint)).json()).photo).toBe(
    `data:image/jpeg;base64,${photo}`,
  );
  // Reproduce the observed loss of IndexedDB/cache while Local Storage survives.
  const cdp = await context.newCDPSession(page);
  await page.goto('about:blank');
  await cdp.send('Storage.clearDataForOrigin', {
    origin: 'http://localhost:4173',
    storageTypes: 'indexeddb,cache_storage',
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByText(/Recovered 1 sightings from the local safety copy/)).toBeVisible();
  await page.getByText('App and storage details', { exact: true }).click();
  await expect(page.getByText('Saved sightings in this storage: 1', { exact: true })).toBeVisible();
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Restore sightings from computer' }).click(),
  ]);
  const restored = await page.evaluate(
    (id) =>
      new Promise<{ lat: number; lng: number; timestamp: number; bytes: number }>(
        (resolve, reject) => {
          const request = indexedDB.open('fieldbook');
          request.onsuccess = () => {
            const db = request.result,
              record = db.transaction('sightings').objectStore('sightings').get(id);
            record.onsuccess = () => {
              const s = record.result;
              resolve({
                lat: s.lat,
                lng: s.lng,
                timestamp: s.timestamp,
                bytes: s.photoBytes?.byteLength ?? s.photo?.size,
              });
              db.close();
            };
            record.onerror = () => reject(record.error);
          };
        },
      ),
    id,
  );
  expect(restored).toEqual({
    lat: 37.18,
    lng: -8.6,
    timestamp: 1788960000000,
    bytes: Buffer.from(photo, 'base64').length,
  });
});
