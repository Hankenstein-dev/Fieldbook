import { _android } from 'playwright';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const adb = process.env.ADB || `${process.env.HOME}/.local/share/fieldbook-android/sdk/platform-tools/adb`;
const device = (await _android.devices()).find((d) => d.serial().startsWith('emulator-'));
if (!device) throw new Error('Emulator only.');
const cmd = (...args) => execFileSync(adb, ['-s', device.serial(), ...args], { encoding: 'utf8' });
const active = () => cmd('shell', 'run-as', 'com.fieldbook.app', 'sqlite3', '-readonly', 'databases/fieldbookSQLite.db', "'SELECT value FROM sightings ORDER BY id;'").trim().split('\n').filter(Boolean).map(JSON.parse).filter((s) => !s.retractedAt);
try {
  cmd('shell', 'pm', 'grant', 'com.fieldbook.app', 'android.permission.ACCESS_FINE_LOCATION');
  cmd('shell', 'pm', 'grant', 'com.fieldbook.app', 'android.permission.ACCESS_COARSE_LOCATION');
  cmd('emu', 'geo', 'fix', '-8.604', '37.1265');
  const page = await (await device.webView({ pkg: 'com.fieldbook.app' })).page();
  await page.evaluate(() => scrollTo(0, 0));
  const explore = page.getByRole('button', { name: 'Explore', exact: true });
  if (await explore.isVisible()) await explore.click();
  const before = active();
  await page.getByLabel('Photograph or choose an image').setInputFiles('data/diagnostics/photos/751da04c-0294-445c-b1d1-6b2c2240137d.jpg');
  await page.locator('.discovery-reveal').waitFor({ timeout: 90000 });
  await page.waitForFunction(() => document.querySelector('.discovery-save')?.textContent?.includes('Added to your fieldbook'), { timeout: 30000 });
  const after = active();
  assert.equal(after.length, before.length + 1);
  const added = after.find((s) => !before.some((old) => old.id === s.id));
  assert.equal(added.taxonId, 51594, 'Retained Pittosporum photograph is recognised');
  if (process.env.FIELDBOOK_EXPECTED_MODEL_PREFIX)
    assert.ok(added.identification.model.startsWith(process.env.FIELDBOOK_EXPECTED_MODEL_PREFIX));
  assert.ok(added.photo.nativeFile.startsWith('photos/'));
  assert.ok(added.achievements.some((a) => a.id === 'new-species'));
  await device.screenshot({ path: '/tmp/fieldbook-discovery-native.png' });
  await page.getByRole('button', { name: 'Not this species?' }).click();
  await page.locator('.recognition-alternatives').waitFor();
  assert.deepEqual(active(), before, 'Correction restores the previous collection');
  const tombstone = JSON.parse(cmd('shell', 'run-as', 'com.fieldbook.app', 'sqlite3', '-readonly', 'databases/fieldbookSQLite.db', `"SELECT value FROM sightings WHERE id='${added.id}';"`));
  assert.ok(tombstone.retractedAt);
  assert.equal(tombstone.photo.nativeFile, added.photo.nativeFile, 'Correction retains the original private photo file');
  await page.getByRole('button', { name: 'Close identification' }).click();
  console.log('PASS: Android automatic photo recognition, reveal, SQLite save and correction.', { name: added.species.scientificName, id: added.id });
} finally { await device.close(); }
