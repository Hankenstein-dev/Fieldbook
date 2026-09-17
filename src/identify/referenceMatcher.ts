import type { Species } from '../types';
import { modelCache } from '../store/modelAssets';
import { getEmbeddings } from '../store';
import { recognitionDownloadInfo } from '../store/recognitionDownload';
import { identificationConfig as config } from '../../config/identification';
import { countryId } from '../../config/app';
import { similarity } from './math';

interface ReferenceFile {
  url: string;
  sha256: string;
  ids: number[];
  kind: 'image' | 'text';
}
async function digest(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
// Read the existing verified binary chunks directly. Expanding 25,000 vectors
// into JSON through Android's SQLite bridge needlessly adds seconds and memory.
export async function matchPreparedReferences(
  query: number[],
  candidates: Species[],
  progress: (done: number, total: number) => void,
  signal?: AbortSignal,
) {
  if (query.length !== config.dimensions) throw new Error('Embedding dimensions differ');
  const cache = await modelCache();
  const wanted = new Map(candidates.map((species) => [species.id, species]));
  const found = new Set<number>();
  const matches: { species: Species; similarity: number }[] = [];
  const manifest = await cache.match('/models/references.json');
  let files: ReferenceFile[] = [];
  if (manifest) {
    const bytes = await manifest.arrayBuffer();
    if ((await digest(bytes)) === recognitionDownloadInfo.files['/models/references.json'].sha256) {
      const pack = JSON.parse(new TextDecoder().decode(bytes));
      if (pack.model === config.id && pack.country === countryId) files = pack.files;
    }
  }
  let packedReferences = 0;
  for (const file of files) {
    signal?.throwIfAborted();
    if (file.kind !== 'text' || !file.ids.some((id) => wanted.has(id))) continue;
    const response = await cache.match(file.url);
    if (!response) continue;
    const bytes = await response.arrayBuffer();
    if (
      bytes.byteLength !== file.ids.length * config.dimensions * 4 ||
      (await digest(bytes)) !== file.sha256
    )
      continue;
    const vectors = new Float32Array(bytes);
    for (let row = 0; row < file.ids.length; row++) {
      const id = file.ids[row],
        species = wanted.get(id);
      if (!species || found.has(id)) continue;
      let score = 0;
      const offset = row * config.dimensions;
      for (let column = 0; column < query.length; column++)
        score += query[column] * vectors[offset + column];
      matches.push({ species, similarity: score });
      found.add(id);
      packedReferences++;
    }
    progress(found.size, candidates.length);
  }
  // Reuse legacy cached additions or an intact SQLite index if a packed file
  // is unavailable. This path never downloads or generates a reference.
  const remaining = candidates.filter((species) => !found.has(species.id));
  for (let offset = 0; offset < remaining.length; offset += 500) {
    signal?.throwIfAborted();
    const batch = remaining.slice(offset, offset + 500);
    const saved = await getEmbeddings(
      batch.map((s) => `${config.id}:${config.referenceVersion}:${s.id}:text`),
    );
    batch.forEach((species, i) => {
      if (!saved[i]) return;
      matches.push({ species, similarity: similarity(query, saved[i]!.vector) });
      found.add(species.id);
    });
    progress(found.size, candidates.length);
  }
  signal?.throwIfAborted();
  return {
    matches: matches.sort((a, b) => b.similarity - a.similarity).slice(0, 10),
    unsupported: candidates.filter((species) => !found.has(species.id)),
    comparedReferences: found.size,
    packedReferences,
  };
}
