import { _android } from 'playwright';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const adb =
  process.env.ADB || `${process.env.HOME}/.local/share/fieldbook-android/sdk/platform-tools/adb`;
const device = (await _android.devices()).find((d) => d.serial().startsWith('emulator-'));
if (!device) throw Error('Emulator only');
try {
  execFileSync(adb, ['-s', device.serial(), 'emu', 'geo', 'fix', '-8.57', '37.17']);
  const page = await (await device.webView({ pkg: 'com.fieldbook.app' })).page();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(m.text().slice(0, 180));
  });
  await page.getByRole('button', { name: 'Explore home' }).click();
  await page.waitForTimeout(5000);
  await device.screenshot({ path: '/tmp/fieldbook-walking-native.png' });
  assert.equal(await page.locator('.map-panel').getAttribute('data-scene'), 'walking');
  const clickables = ['Identify', 'Settings', 'Fieldbook'];
  for (const name of clickables) {
    const button = page.getByRole('button', {
      name: name === 'Fieldbook' ? /^Fieldbook/ : name,
      exact: name !== 'Fieldbook',
    });
    const b = await button.boundingBox();
    assert.ok(
      b && b.y >= 0 && b.y + b.height <= (await page.evaluate(() => innerHeight)),
      `${name} fits in WebView`,
    );
  }
  await page.getByRole('button', { name: /^Fieldbook/ }).click();
  await page.getByRole('button', { name: 'Sightings', exact: true }).click();
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('.map-panel').getAttribute('data-scene'), 'atlas');
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('.map-panel').getAttribute('data-scene'), 'walking');
  assert.deepEqual(errors, []);
  console.log(
    'PASS: Android walking scene, visible controls, atlas navigation and return, no JS errors.',
  );
} finally {
  await device.close();
}
