import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';

test('explicit updates discover a new build with another tab open and preserve stored data', async ({
  page,
  context,
}) => {
  // Serve the actual build with controllably different service-worker bytes.
  let version = 1;
  const server = createServer((req, res) => {
    void (async () => {
      const response = await fetch(`http://localhost:4173${req.url}`);
      res.writeHead(response.status, {
        'Content-Type': response.headers.get('content-type') ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      if (req.url === '/sw.js') {
        res.end(`${await response.text()}\nself.addEventListener('message', e => {
          if (e.data === 'test-version') e.ports[0].postMessage(${version});
        });`);
      } else res.end(Buffer.from(await response.arrayBuffer()));
    })().catch(() => {
      res.statusCode = 500;
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  const base = `http://127.0.0.1:${address.port}`;
  async function activeVersion() {
    return page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return new Promise<number>((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          channel.port1.close();
          resolve(event.data);
        };
        registration.active!.postMessage('test-version', [channel.port2]);
      });
    });
  }
  try {
    await page.goto(base);
    await expect.poll(activeVersion).toBe(1);
    await page.evaluate(async () => {
      localStorage.setItem('fieldbook-live-diagnostics', 'false');
      localStorage.setItem('update-storage-probe', 'retained');
      const cache = await caches.open('fieldbook-model-bioclip2-int8-v1');
      await cache.put('/models/update-probe', new Response('retained model bytes'));
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('fieldbook');
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction('sightings', 'readwrite');
          tx.objectStore('sightings').put({
            id: 'sighting-update-probe',
            taxonId: 82742,
            lat: 37.18,
            lng: -8.6,
            accuracy: 8,
            cell: 'eyc8e',
            timestamp: 1788960000000,
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
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('fieldbook-diagnostics');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('photos', 'readwrite');
          tx.objectStore('photos').put({
            id: 'update-probe',
            session: 'update-test',
            at: new Date().toISOString(),
            filename: 'retained.jpg',
            sent: 0,
            photo: new Blob(['retained photo bytes'], { type: 'image/jpeg' }),
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    });
    const other = await context.newPage();
    await other.goto(base);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Update and reload' })).toBeVisible();
    // No waiting worker or update event: the button itself must check the server.
    version = 2;
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', { name: 'Update and reload' }).click(),
    ]);
    await expect.poll(activeVersion).toBe(2);
    // Recovery URL works independently of the app's own update UI.
    version = 3;
    await page.goto(`${base}/__fieldbook_debug/update.html`);
    await page.getByRole('button', { name: 'Update and open Fieldbook' }).click();
    await expect(page).toHaveURL(`${base}/`);
    await expect.poll(activeVersion).toBe(3);
    expect(await page.evaluate(() => localStorage.getItem('update-storage-probe'))).toBe(
      'retained',
    );
    expect(
      await page.evaluate(async () =>
        (
          await (
            await caches.open('fieldbook-model-bioclip2-int8-v1')
          ).match('/models/update-probe')
        )?.text(),
      ),
    ).toBe('retained model bytes');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByText('Recent identification photos', { exact: true }).click();
    await expect(page.getByText(/^retained\.jpg · (Waiting to send|Saved on this device)$/)).toBeVisible();
    await page.getByText('App and storage details', { exact: true }).click();
    await expect(
      page.getByText('Saved sightings in this storage: 1', { exact: true }),
    ).toBeVisible();
    await other.close();
  } finally {
    await page.goto('about:blank').catch(() => undefined);
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
