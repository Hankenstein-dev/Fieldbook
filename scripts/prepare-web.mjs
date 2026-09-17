import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { updatePage } from './diagnostic-update.ts';

// Maps remain available on walks. Only optional offline inference assets are omitted.
await rm('public-web', { recursive: true, force: true });
await mkdir('public-web', { recursive: true });
for (const name of await readdir('public')) {
  if (['models', 'runtime', 'recognition-downloads'].includes(name)) continue;
  await cp(`public/${name}`, `public-web/${name}`, { recursive: true });
}
// This path bypasses the navigation fallback in already-installed service workers.
await mkdir('public-web/__fieldbook_debug', { recursive: true });
await writeFile('public-web/__fieldbook_debug/update.html', updatePage);
// Stable filenames must be revalidated; hashed app chunks are already versioned.
// No Functions, proxy, credentials, raw research or personal data are deployed.
await writeFile('public-web/_headers', `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Robots-Tag: noindex, nofollow
/index.html
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/manifest.webmanifest
  Cache-Control: no-cache
/maps/*
  Cache-Control: public, max-age=0, must-revalidate
`);
