import { _android } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const adb =
  process.env.ADB || `${process.env.HOME}/.local/share/fieldbook-android/sdk/platform-tools/adb`;
const devices = await _android.devices();
let device = devices.find((d) => d.serial().startsWith('emulator-'));
if (!device) throw new Error('This test only runs against an emulator, never your phone.');
const shell = (...args) =>
  execFileSync(adb, ['-s', device.serial(), ...args], { encoding: 'utf8' });
let page = await (await device.webView({ pkg: 'com.fieldbook.app' })).page();
await page.waitForFunction(() => window.__fieldbookAcceptance);
await page.waitForFunction(
  async () =>
    (await window.__fieldbookAcceptance.store.searchStoredSpecies('Arbutus unedo')).length > 0,
);
const photo = (await readFile('tests/fixtures/arbutus-unedo.jpg')).toString('base64');
const result = await page.evaluate(async (base64) => {
  const { store, diagnostics, diagnosticStore } = window.__fieldbookAcceptance;
  const species = (await store.searchStoredSpecies('Arbutus unedo'))[0];
  if (!species) throw new Error('Fixture species absent from local catalogue');
  const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], {
    type: 'image/jpeg',
  });
  const id = crypto.randomUUID();
  const record = {
    id,
    taxonId: species.id,
    species,
    lat: 37.2,
    lng: -8.6,
    accuracy: 6,
    timestamp: Date.now(),
    cell: 'ey9g9',
    photo: blob,
    wasInCandidateSet: true,
    candidateSetAvailable: true,
  };
  await store.saveSighting(record);
  const repeat = crypto.randomUUID();
  await store.saveSighting({
    ...record,
    id: repeat,
    lat: 37.21,
    timestamp: record.timestamp + 1000,
  });
  let duplicateRejected = false;
  try {
    await store.saveSighting({ ...record, lat: 0 });
  } catch {
    duplicateRejected = true;
  }
  if (!duplicateRejected) throw new Error('Duplicate overwrote the original');
  await Promise.all([
    store.visitCell('native-test', [1, 2]),
    store.visitCell('native-test', [2, 3]),
  ]);
  const visit = (await store.getVisitedCells()).find((v) => v.cell === 'native-test');
  if (visit.taxonIds.join(',') !== '1,2,3') throw new Error('Concurrent visits lost data');
  await diagnostics.retainDiagnosticPhoto(
    blob,
    crypto.randomUUID(),
    'native-acceptance-arbutus.jpg',
  );
  await diagnostics.flushDiagnostics();
  return {
    id,
    repeat,
    bytes: blob.size,
    timestamp: record.timestamp,
    context: await diagnosticStore.diagnosticStorageContext(),
  };
}, photo);
console.log(
  'SQLite saves, repeat sightings, duplicate protection, concurrent visits and photo write:',
  result,
);
await page.screenshot({ path: '/tmp/fieldbook-native-map.png' });
await device.close();
shell('shell', 'am', 'force-stop', 'com.fieldbook.app');
shell('shell', 'am', 'start', '-n', 'com.fieldbook.app/.MainActivity');
device = (await _android.devices()).find((d) => d.serial().startsWith('emulator-'));
page = await (await device.webView({ pkg: 'com.fieldbook.app' })).page();
await page.waitForFunction(() => window.__fieldbookAcceptance);
async function verify() {
  return page.evaluate(async ({ id, repeat }) => {
    const { store, diagnosticStore } = window.__fieldbookAcceptance;
    const first = await store.getSighting(id),
      second = await store.getSighting(repeat);
    return {
      lat: first.lat,
      repeatLat: second.lat,
      bytes: first.photo.size,
      timestamp: first.timestamp,
      context: await diagnosticStore.diagnosticStorageContext(),
    };
  }, result);
}
let restored = await verify();
assert.equal(restored.lat, 37.2);
assert.equal(restored.repeatLat, 37.21);
assert.equal(restored.bytes, result.bytes);
assert.equal(restored.timestamp, result.timestamp);
assert.equal(restored.context.storageId, result.context.storageId);
console.log(
  'Force-stop/reopen retained SQLite records, exact location/time, photo and device identity.',
);
await page.reload();
await page.waitForFunction(() => window.__fieldbookAcceptance);
restored = await verify();
assert.equal(restored.bytes, result.bytes);
console.log('WebView reload reconnects to the existing native database.');
await writeFile('/tmp/fieldbook-native-acceptance.json', JSON.stringify(result, null, 2));
await device.close();
