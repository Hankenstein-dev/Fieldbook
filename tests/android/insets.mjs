import { _android } from 'playwright';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const adb = process.env.ADB || `${process.env.HOME}/.local/share/fieldbook-android/sdk/platform-tools/adb`;
const device = (await _android.devices()).find((d) => d.serial().startsWith('emulator-'));
if (!device) throw new Error('This check only targets an emulator.');
const shell = (...args) => execFileSync(adb, ['-s', device.serial(), 'shell', ...args], { encoding: 'utf8' });
function webViewBounds() {
  shell('uiautomator', 'dump', '/sdcard/fieldbook-layout.xml');
  const xml = shell('cat', '/sdcard/fieldbook-layout.xml');
  const node = xml.match(/<node\b[^>]*class="android.webkit.WebView"[^>]*>/)?.[0];
  assert.ok(node, 'Native WebView is visible');
  return node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/).slice(1).map(Number);
}

try {
  const page = await (await device.webView({ pkg: 'com.fieldbook.app' })).page();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const initial = webViewBounds();
  const size = shell('wm', 'size').match(/Physical size: (\d+)x(\d+)/);
  assert.ok(initial[1] > 0, 'WebView starts below the status bar');
  assert.ok(initial[3] < Number(size[2]), 'WebView ends above navigation controls');
  await page.evaluate(() => window.scrollTo(0, 80));
  assert.ok(await page.evaluate(() => scrollY > 0), 'Exercise document scrolling');
  assert.deepEqual(webViewBounds(), initial, 'Scrolling cannot remove native safe space');
  await device.screenshot({ path: '/tmp/fieldbook-native-insets-scrolled.png' });

  const height = await page.evaluate(() => innerHeight);
  await page.getByRole('textbox', { name: 'Testing computer' }).click();
  await page.waitForFunction((previous) => innerHeight < previous - 100, height);
  const keyboard = webViewBounds();
  assert.equal(keyboard[1], initial[1], 'Keyboard preserves top safe area');
  assert.ok(keyboard[3] < initial[3] - 100, 'WebView stays above keyboard');
  shell('input', 'keyevent', 'KEYCODE_BACK');
  await page.waitForFunction((previous) => Math.abs(innerHeight - previous) < 2, height);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  console.log('PASS: native system-bar space survives scrolling, keyboard open/close, and navigation.', { initial, keyboard });
} finally {
  await device.close();
}
