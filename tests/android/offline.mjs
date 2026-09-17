import { _android } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const adb =
  process.env.ADB || `${process.env.HOME}/.local/share/fieldbook-android/sdk/platform-tools/adb`;
const device = (await _android.devices()).find((d) => d.serial().startsWith('emulator-'));
if (!device) throw new Error('Emulator required; this test never changes your phone network.');
const command = (...args) =>
  execFileSync(adb, ['-s', device.serial(), ...args], { encoding: 'utf8' });
const page = await (await device.webView({ pkg: 'com.fieldbook.app' })).page();
await page.waitForFunction(() => window.__fieldbookAcceptance);
assert.equal(
  await page.evaluate(() => window.__fieldbookAcceptance.references.referencePackStatus()),
  true,
);
try {
  if (command('reverse', '--list').includes('tcp:5174')) command('reverse', '--remove', 'tcp:5174');
  command('shell', 'svc', 'wifi', 'disable');
  command('shell', 'svc', 'data', 'disable');
  const result = await page.evaluate(
    async (base64) => {
      const { store, assets, engine, diagnosticStore } = window.__fieldbookAcceptance;
      const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], {
        type: 'image/jpeg',
      });
      const id = crypto.randomUUID();
      await diagnosticStore.saveDiagnosticPhoto({
        id,
        session: 'native-offline-acceptance',
        at: new Date().toISOString(),
        filename: 'native-offline-arbutus.jpg',
        photo: blob,
        sent: 0,
      });
      const range = await store.getRange('id:pt:country:country');
      const candidates = range.species.filter((s) =>
        [
          'Arbutus unedo',
          'Ceratonia siliqua',
          'Pistacia lentiscus',
          'Cortaderia selloana',
        ].includes(s.scientificName),
      );
      const inventory = await assets.modelInventory();
      const result = await engine.identify(blob, candidates, () => {});
      return {
        id,
        inventory,
        top: result.matches[0].species.scientificName,
        provider: result.provider,
        milliseconds: result.milliseconds,
        missingReferences: result.missingReferences,
        queue: await diagnosticStore.diagnosticQueueCounts(),
        cacheStorage: await caches.keys(),
        indexedDB: await indexedDB.databases(),
      };
    },
    (await readFile('tests/fixtures/arbutus-unedo.jpg')).toString('base64'),
  );
  assert.equal(result.inventory.ready, true);
  assert.equal(result.top, 'Arbutus unedo');
  assert.equal(result.missingReferences, 0);
  assert.ok(result.queue.photos > 0);
  assert.deepEqual(result.cacheStorage, []);
  assert.deepEqual(result.indexedDB, []);
  console.log(
    'Offline inference from native files and SQLite references; no browser databases/caches:',
    result,
  );
  await writeFile('/tmp/fieldbook-native-offline.json', JSON.stringify(result, null, 2));
} finally {
  command('shell', 'svc', 'wifi', 'enable');
  command('shell', 'svc', 'data', 'enable');
  command('reverse', 'tcp:5174', 'tcp:5174');
}
await page.waitForFunction(
  async () => {
    const q = await window.__fieldbookAcceptance.diagnosticStore.diagnosticQueueCounts();
    return q.photos === 0 && q.events === 0;
  },
  {},
  { timeout: 30000 },
);
console.log('Queued logs and photo automatically sent after reconnection.');
await device.close();
