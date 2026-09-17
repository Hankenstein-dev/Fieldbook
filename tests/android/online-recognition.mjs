import { _android } from 'playwright';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const adb = `${process.env.HOME}/.local/share/fieldbook-android/sdk/platform-tools/adb`;
let device = (await _android.devices()).find((d) => d.serial().startsWith('emulator-'));
if (!device) throw Error('Emulator only.');
const cmd = (...args) => execFileSync(adb, ['-s', device.serial(), ...args], { encoding: 'utf8' });
const rows = () =>
  cmd(
    'shell',
    'run-as',
    'com.fieldbook.app',
    'sqlite3',
    '-readonly',
    'databases/fieldbookSQLite.db',
    "'SELECT value FROM sightings ORDER BY id;'",
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(JSON.parse);
let moved = false;
try {
  cmd('shell', 'am', 'force-stop', 'com.fieldbook.app');
  // Temporarily put the emulator's existing model files aside. No deletion,
  // no phone connection, and restore them even if the test fails.
  cmd(
    'shell',
    'run-as',
    'com.fieldbook.app',
    'mv',
    'files/recognition',
    'files/recognition-online-test',
  );
  moved = true;
  cmd('shell', 'am', 'start', '-n', 'com.fieldbook.app/.MainActivity');
  cmd('emu', 'geo', 'fix', '-8.604', '37.1265');
  await device.close();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  device = (await _android.devices()).find((d) => d.serial().startsWith('emulator-'));
  console.log('Connected to restarted app');
  const page = await (await device.webView({ pkg: 'com.fieldbook.app' })).page();
  const cases = [
    ['4d90ec0f-3aba-4d79-b0f5-514d430345eb', 209889, 'White sapote'],
    ['b356484c-0e7c-4dad-b30a-d9192a6fe1fe', 76949, 'Loquat'],
    ['751da04c-0294-445c-b1d1-6b2c2240137d', 51594, 'Australian Cheesewood'],
  ];
  for (const [photo, id, name] of cases) {
    const before = rows().filter((s) => !s.retractedAt);
    const started = Date.now();
    await page
      .getByLabel('Photograph or choose an image')
      .setInputFiles(`data/diagnostics/photos/${photo}.jpg`);
    await page.locator('.discovery-reveal').waitFor({ timeout: 30000 });
    assert.equal(await page.locator('.discovery-reveal h1').textContent(), name);
    assert.equal(await page.locator('.download-card').count(), 0);
    const revealMs = Date.now() - started;
    await page.waitForFunction(() =>
      document.querySelector('.discovery-save')?.textContent?.includes('Added to your fieldbook'),
    );
    const added = rows().find((s) => !s.retractedAt && !before.some((b) => b.id === s.id));
    assert.equal(added.taxonId, id);
    assert.ok(added.identification.model.startsWith('plantnet:'));
    assert.equal(added.identification.scope, 'online');
    assert.ok(added.photo.nativeFile);
    if (id === 209889) await device.screenshot({ path: '/tmp/fieldbook-plantnet-reveal.png' });
    await page.getByRole('button', { name: 'Not this species?' }).click();
    await page.locator('.recognition-alternatives').waitFor();
    assert.deepEqual(
      rows().filter((s) => !s.retractedAt),
      before,
    );
    await page.getByRole('button', { name: 'Close identification' }).click();
    console.log('PASS native online without models:', name, { captureToRevealMs: revealMs });
  }
} finally {
  cmd('shell', 'am', 'force-stop', 'com.fieldbook.app');
  if (moved)
    cmd(
      'shell',
      'run-as',
      'com.fieldbook.app',
      'mv',
      'files/recognition-online-test',
      'files/recognition',
    );
  cmd('shell', 'am', 'start', '-n', 'com.fieldbook.app/.MainActivity');
  await device.close();
}
