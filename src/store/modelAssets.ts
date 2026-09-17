import { assetCache } from './assetCache';
import { identificationConfig as config } from '../../config/identification';
import { fetchRecognitionAsset, recognitionDownloadBytes } from './recognitionDownload';
export const runtimeFiles = [
  '/runtime/ort-wasm-simd-threaded.asyncify.mjs',
  '/runtime/ort-wasm-simd-threaded.asyncify.wasm',
];
const cacheName = `fieldbook-model-${config.id}`;
export interface Progress {
  done: number;
  total: number;
  label: string;
  asset?: string;
  source?: 'cache' | 'network';
}
export async function modelInventory() {
  const cache = await assetCache(cacheName);
  const paths = [...config.files.image.parts, ...config.files.text.parts].map((p) => p.url);
  paths.push(...runtimeFiles, config.tokenizer, config.tokenizerConfig);
  const missing = (
    await Promise.all(paths.map(async (path) => ((await cache.match(path)) ? null : path)))
  ).filter((path): path is string => path !== null);
  return {
    cacheName,
    expectedFiles: paths.length,
    savedFiles: paths.length - missing.length,
    missing,
    ready: missing.length === 0,
  };
}
export const modelStatus = async () => (await modelInventory()).ready;
export async function downloadModels(progress: (p: Progress) => void, signal?: AbortSignal) {
  const cache = await assetCache(cacheName);
  let done = 0;
  const paths = [
    ...config.files.image.parts.map((part) => part.url),
    ...config.files.text.parts.map((part) => part.url),
    config.tokenizer,
    config.tokenizerConfig,
    ...runtimeFiles,
  ];
  const total = paths.reduce((sum, path) => sum + recognitionDownloadBytes(path), 0);
  for (const path of paths) {
    signal?.throwIfAborted();
    const saved = await cache.match(path);
    progress({
      done,
      total,
      label: 'Downloading recognition models',
      asset: path,
      source: saved ? 'cache' : 'network',
    });
    if (!saved) {
      const response = await fetchRecognitionAsset(path, signal);
      await cache.put(path, response);
    }
    done += recognitionDownloadBytes(path);
    progress({ done, total, label: 'Downloading recognition models' });
  }
}
export async function readModel(kind: 'image' | 'text') {
  const cache = await assetCache(cacheName),
    file = config.files[kind],
    result = new Uint8Array(file.bytes);
  let offset = 0;
  for (const p of file.parts) {
    const response = await cache.match(p.url);
    if (!response) throw new Error('Download the recognition models first.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    result.set(bytes, offset);
    offset += bytes.length;
  }
  return result;
}
export async function readTokenizer() {
  const cache = await assetCache(cacheName);
  const a = await cache.match(config.tokenizer),
    b = await cache.match(config.tokenizerConfig);
  if (!a || !b) throw new Error('Download the recognition models first.');
  return [await a.json(), await b.json()];
}

export const modelCache = () => assetCache(cacheName);
export async function readRuntime() {
  const cache = await modelCache();
  const mjs = await cache.match(runtimeFiles[0]),
    wasm = await cache.match(runtimeFiles[1]);
  if (!mjs || !wasm) throw new Error('Download the recognition runtime first.');
  return { module: await mjs.text(), binary: new Uint8Array(await wasm.arrayBuffer()) };
}
