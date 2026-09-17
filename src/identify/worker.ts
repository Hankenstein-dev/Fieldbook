import { setWorkerAssetRoot } from '../store/assetCache';
/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web/webgpu';
import { Tokenizer } from '@huggingface/tokenizers';
import { readModel, readTokenizer, readRuntime } from './assets';
import { photoTensor } from './image';
import { normalise } from './math';
import { identificationConfig as config } from '../../config/identification';
import { errorDetails } from '../diagnostics/types';
const report = (event: string, details: Record<string, unknown>, level = 'info') =>
  self.postMessage({ diagnostic: { event, details, level } });
let runtimeReady = false;
ort.env.wasm.numThreads = 1;
let imageSession: ort.InferenceSession | null = null,
  textSession: ort.InferenceSession | null = null,
  tokenizer: Tokenizer | null = null;
let queue = Promise.resolve();
let provider = 'wasm';
async function createSession(kind: 'image' | 'text') {
  const started = performance.now();
  report('model.loading', { kind });
  if (!runtimeReady) {
    const runtime = await readRuntime();
    ort.env.wasm.wasmPaths = {
      mjs: URL.createObjectURL(new Blob([runtime.module], { type: 'text/javascript' })),
    };
    ort.env.wasm.wasmBinary = runtime.binary;
    runtimeReady = true;
  }

  const bytes = await readModel(kind);
  if ('gpu' in navigator) {
    try {
      const session = await ort.InferenceSession.create(bytes, {
        executionProviders: ['webgpu', 'wasm'],
      });
      provider = 'WebGPU / WASM';
      report('model.ready', { kind, provider, milliseconds: performance.now() - started });
      return session;
    } catch (e) {
      report('model.wasm_fallback', { kind, ...errorDetails(e) }, 'warn');
    }
  }
  provider = 'wasm';
  const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
  report('model.ready', { kind, provider, milliseconds: performance.now() - started });
  return session;
}

self.onmessage = (
  event: MessageEvent<{
    assetRoot?: string;
    id: number;
    kind: 'image' | 'text';
    blob?: Blob;
    text?: string;
    reference?: boolean;
  }>,
) => {
  queue = queue.then(async () => {
    const { id, kind, blob, text, reference } = event.data;
    setWorkerAssetRoot(event.data.assetRoot);
    const start = performance.now();
    if (!reference) report('inference.start', { requestId: id, kind });
    try {
      let session: ort.InferenceSession, feed: ort.Tensor;
      if (kind === 'image') {
        if (textSession) {
          await textSession.release();
          textSession = null;
        }
        imageSession ??= await createSession('image');
        session = imageSession;
        feed = new ort.Tensor('float32', await photoTensor(blob!), [1, 3, 224, 224]);
      } else {
        if (imageSession) {
          await imageSession.release();
          imageSession = null;
        }
        textSession ??= await createSession('text');
        session = textSession;
        if (!tokenizer) {
          const [json, cfg] = await readTokenizer();
          tokenizer = new Tokenizer(json, cfg);
        }
        const encoded = tokenizer.encode(text!).ids;
        const ids = encoded.slice(0, 77);
        if (encoded.length > 77) ids[76] = 49407;
        while (ids.length < 77) ids.push(0);
        feed = new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, 77]);
      }
      const result = await session.run({ [config.files[kind].input]: feed });
      const vector = normalise(result[config.files[kind].output].data as Float32Array);
      if (!reference)
        report('inference.complete', {
          requestId: id,
          kind,
          provider,
          milliseconds: performance.now() - start,
        });
      self.postMessage({ id, vector, milliseconds: performance.now() - start, provider });
    } catch (e) {
      report(
        'inference.error',
        { requestId: id, kind, milliseconds: performance.now() - start, ...errorDetails(e) },
        'error',
      );
      self.postMessage({ id, error: e instanceof Error ? e.message : String(e) });
    }
  });
};
