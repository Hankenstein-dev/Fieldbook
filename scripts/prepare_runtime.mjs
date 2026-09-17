import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('public/runtime', { recursive: true });
for (const file of ['ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm'])
  await copyFile(`node_modules/onnxruntime-web/dist/${file}`, `public/runtime/${file}`);

import { writeFile, stat } from 'node:fs/promises';
let bytes = 0;
for (const file of ['ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm'])
  bytes += (await stat(`public/runtime/${file}`)).size;
await writeFile('config/generated/runtime.json', JSON.stringify({ bytes }) + '\n');

await import('./prepare_downloads.mjs');
