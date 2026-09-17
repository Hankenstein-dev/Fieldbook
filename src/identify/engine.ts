import { nativeAssetRoot } from '../store/assetCache';
import type { Species } from '../types';
import { normalise } from './math';
import { matchPreparedReferences } from './referenceMatcher';
import { diagnostic } from '../diagnostics';
let worker: Worker | null = null,
  id = 0;
const requests = new Map<
  number,
  { resolve: (result: EmbeddingResult) => void; reject: (error: Error) => void }
>();
export interface EmbeddingResult {
  vector: number[];
  milliseconds: number;
  provider: string;
}
export async function embed(input: Blob | string, reference = false): Promise<EmbeddingResult> {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      if (event.data.diagnostic) {
        const { event: name, details, level } = event.data.diagnostic;
        diagnostic(name, details, level);
        return;
      }
      const r = requests.get(event.data.id);
      requests.delete(event.data.id);
      if (event.data.error) r?.reject(new Error(event.data.error));
      else r?.resolve(event.data);
    };
    worker.onerror = (event) => {
      diagnostic(
        'worker.error',
        { message: event.message, file: event.filename, line: event.lineno },
        'error',
      );
      for (const r of requests.values())
        r.reject(new Error('Recognition worker stopped. Reload and try again.'));
      requests.clear();
      worker?.terminate();
      worker = null;
    };
  }
  const assetRoot = await nativeAssetRoot();
  const requestId = ++id;
  return new Promise((resolve, reject) => {
    requests.set(requestId, { resolve, reject });
    worker!.postMessage(
      typeof input === 'string'
        ? { assetRoot, id: requestId, kind: 'text', text: input, reference }
        : { assetRoot, id: requestId, kind: 'image', blob: input },
    );
  });
}
export async function identify(
  input: Blob | string | Blob[],
  candidates: Species[],
  progress: (done: number, total: number) => void,
  signal?: AbortSignal,
  operation?: string,
) {
  const inputs = Array.isArray(input) ? input : [input];
  if (!inputs.length) throw new Error('Add a photo first.');
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  const cancel = () => {
    worker?.terminate();
    worker = null;
    for (const r of requests.values()) r.reject(new DOMException('Cancelled', 'AbortError'));
    requests.clear();
  };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    progress(0, candidates.length);
    const embedded = await Promise.all(inputs.map((input) => embed(input)));
    const query = {
      ...embedded[0],
      vector: normalise(
        embedded[0].vector.map(
          (_, i) => embedded.reduce((n, e) => n + e.vector[i], 0) / embedded.length,
        ),
      ),
      milliseconds: embedded.reduce((n, e) => n + e.milliseconds, 0),
    };
    // Preserve the actual phone output for replay: a desktop inference can
    // differ slightly by image resampling or execution provider. Float64 keeps
    // the normalised values exactly and fits within the bounded event payload.
    const queryBytes = new Uint8Array(query.vector.length * 8);
    const queryView = new DataView(queryBytes.buffer);
    query.vector.forEach((value, index) => queryView.setFloat64(index * 8, value, true));
    diagnostic('identify.query_embedding', {
      operation,
      encoding: 'float64-le-base64',
      dimensions: query.vector.length,
      data: btoa(String.fromCharCode(...queryBytes)),
    });
    signal?.throwIfAborted();
    const referenceStart = performance.now();
    const result = await matchPreparedReferences(query.vector, candidates, progress, signal);
    const referenceMilliseconds = performance.now() - referenceStart;
    const missingReferences = result.unsupported.length;
    diagnostic('identify.references', {
      operation,
      candidates: candidates.length,
      missingReferences,
      packedReferences: result.packedReferences,
      missingTaxa: result.unsupported.map((s) => ({
        id: s.id,
        name: s.scientificName,
        rank: s.rank,
      })),
    });
    diagnostic('identify.references_ready', {
      operation,
      missingReferences,
      referenceMilliseconds,
    });
    if (!result.comparedReferences)
      throw new Error(
        'These candidates are not in the downloaded recognition pack. Update recognition files or find it by name.',
      );
    return {
      ...result,
      milliseconds: query.milliseconds,
      provider: query.provider,
      missingReferences,
      referenceMilliseconds,
    };
  } finally {
    signal?.removeEventListener('abort', cancel);
  }
}

export function releaseRecognition() {
  worker?.terminate();
  worker = null;
  for (const r of requests.values()) r.reject(new DOMException('Cancelled', 'AbortError'));
  requests.clear();
}
