import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const adb =
  process.env.ADB || `${process.env.HOME}/.local/share/fieldbook-android/sdk/platform-tools/adb`;
const serial = execFileSync(adb, ['devices'], { encoding: 'utf8' })
  .split('\n')
  .map((l) => l.split('\t')[0])
  .find((s) => s.startsWith('emulator-'));
if (!serial) throw new Error('This upgrade test only targets an emulator.');
const command = (...args) =>
  execFileSync(adb, ['-s', serial, ...args], { maxBuffer: 64 * 1024 * 1024 });
const text = (...args) =>
  command(...args)
    .toString()
    .trim();
const hash = (b) => createHash('sha256').update(b).digest('hex');
const model = JSON.parse(readFileSync('config/generated/identification.json')).id;
const assets = JSON.parse(readFileSync('config/generated/recognition-downloads.json')).files;
function snapshot() {
  const records = text(
    'shell',
    'run-as',
    'com.fieldbook.app',
    'sqlite3',
    '-readonly',
    'databases/fieldbookSQLite.db',
    "'SELECT value FROM sightings ORDER BY id;'",
  )
    .split('\n')
    .filter(Boolean)
    .map(JSON.parse);
  assert.ok(records.length >= 2, 'Run the native acceptance test first');
  const photos = {};
  for (const r of records) {
    const path = r.photo?.nativeFile;
    if (!path) continue;
    assert.match(path, /^photos\/[\w-]+\.jpg$/);
    photos[r.id] = hash(command('exec-out', 'run-as', 'com.fieldbook.app', 'cat', `files/${path}`));
  }
  // Hash on the device: large `adb exec-out` pipe captures can truncate even
  // though the file itself is intact. Never infer file loss from a short capture.
  assert.match(model, /^[\w-]+$/);
  const checksums = text(
    'shell',
    'run-as',
    'com.fieldbook.app',
    'sh',
    '-c',
    `'sha256sum files/recognition/${model}/*'`,
  );
  const actual = new Map(
    checksums.split('\n').map((line) => {
      const [digest, path] = line.trim().split(/\s+/);
      return [path.split('/').pop(), digest];
    }),
  );
  const models = {};
  for (const [path, asset] of Object.entries(assets)) {
    const filename = path.replaceAll('/', '_');
    assert.equal(actual.get(filename), asset.sha256, path);
    models[path] = actual.get(filename);
  }
  return { records, photos, models };
}
command('shell', 'am', 'force-stop', 'com.fieldbook.app');
const before = snapshot();
console.log(
  `Before update: ${before.records.length} sightings, ${Object.keys(before.photos).length} photos, ${Object.keys(before.models).length} verified recognition files.`,
);
console.log(text('install', '-r', 'android/app/build/outputs/apk/debug/app-debug.apk'));
const after = snapshot();
assert.deepEqual(after, before);
command('shell', 'am', 'start', '-n', 'com.fieldbook.app/.MainActivity');
console.log('PASS: APK update retained every sighting field and byte-identical photos/models.');
writeFileSync(
  '/tmp/fieldbook-native-upgrade.json',
  JSON.stringify(
    {
      sightings: after.records.length,
      photos: Object.keys(after.photos).length,
      recognitionFiles: Object.keys(after.models).length,
      passed: true,
    },
    null,
    2,
  ),
);
