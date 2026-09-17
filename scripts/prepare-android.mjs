import { cp, mkdir, readdir, rm, writeFile, access } from 'node:fs/promises';
// Models and map archives are downloaded from the testing computer as needed.
await rm('public-android', { recursive: true, force: true });
await mkdir('public-android', { recursive: true });
for (const name of await readdir('public')) {
  if (['models', 'runtime', 'maps', 'recognition-downloads'].includes(name)) continue;
  await cp(`public/${name}`, `public-android/${name}`, { recursive: true });
}

// Trust only this local testing CA in debug builds. Never copy private keys.
let certificate = false;
try {
  await access('.certs/fieldbook-ca.crt');
  certificate = true;
} catch {}
await mkdir('android/app/src/debug/res/xml', { recursive: true });
if (certificate) {
  await mkdir('android/app/src/debug/res/raw', { recursive: true });
  await cp('.certs/fieldbook-ca.crt', 'android/app/src/debug/res/raw/fieldbook_test_ca.crt');
}
await writeFile(
  'android/app/src/debug/res/xml/debug_network_security.xml',
  `<network-security-config><debug-overrides><trust-anchors><certificates src="user" />${certificate ? '<certificates src="@raw/fieldbook_test_ca" />' : ''}</trust-anchors></debug-overrides></network-security-config>\n`,
);
