// Static gzip payloads: no hosting-specific Content-Encoding rules are required.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';

const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const model = await json('config/generated/identification.json');
const references = await json('public/models/references.json');
const expectedHashes = new Map(
  [...model.files.image.parts, ...model.files.text.parts, ...references.files].map((part) => [
    part.url,
    part.sha256,
  ]),
);
const paths = [
  ...model.files.image.parts.map((part) => part.url),
  ...model.files.text.parts.map((part) => part.url),
  '/models/tokenizer.json',
  '/models/tokenizer_config.json',
  '/runtime/ort-wasm-simd-threaded.asyncify.mjs',
  '/runtime/ort-wasm-simd-threaded.asyncify.wasm',
  '/models/references.json',
  ...references.files.map((part) => part.url),
];
const directory = 'public/recognition-downloads';
const manifestPath = 'config/generated/recognition-downloads.json';
await mkdir(directory, { recursive: true });
let previous = { files: {} };
try {
  previous = await json(manifestPath);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const files = {};
for (const path of paths) {
  const raw = await readFile(`public${path}`);
  const sha256 = hash(raw);
  if (expectedHashes.has(path) && expectedHashes.get(path) !== sha256)
    throw new Error(`Source asset integrity check failed: ${path}`);
  const url = `/recognition-downloads/${sha256}.gz`;
  const old = previous.files[path];
  let packed;
  if (old?.sha256 === sha256 && old.url === url) {
    try {
      packed = await readFile(`public${url}`);
      if (hash(packed) !== old.compressedSha256) packed = undefined;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (!packed) {
    packed = gzipSync(raw, { level: 6 });
    if (hash(gunzipSync(packed)) !== sha256) throw new Error(`Gzip round trip failed: ${path}`);
    await writeFile(`public${url}.tmp`, packed);
    await rename(`public${url}.tmp`, `public${url}`);
  }
  files[path] = {
    url,
    bytes: raw.length,
    downloadBytes: packed.length,
    sha256,
    compressedSha256: hash(packed),
  };
}
const manifest = {
  bytes: Object.values(files).reduce((sum, file) => sum + file.bytes, 0),
  downloadBytes: Object.values(files).reduce((sum, file) => sum + file.downloadBytes, 0),
  files,
};
await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + '\n');
await rename(`${manifestPath}.tmp`, manifestPath);
// Retain old content-addressed files: already installed APKs can still request
// them while a new pack is published. Cleanup requires retiring those builds.
console.log(
  `Recognition download: ${(manifest.downloadBytes / 1e6).toFixed(2)} MB; unpacked assets: ${(manifest.bytes / 1e6).toFixed(2)} MB.`,
);
