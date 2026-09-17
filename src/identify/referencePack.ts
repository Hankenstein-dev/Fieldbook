import { modelCache } from '../store/modelAssets';
import { fetchRecognitionAsset, recognitionDownloadInfo } from '../store/recognitionDownload';
import { identificationConfig as config } from '../../config/identification';
import { getEmbeddings, saveEmbeddings, saveRange, getRange } from '../store';
import { countryId } from '../../config/app';
import type { Species, EmbeddingRecord } from '../types';
interface Pack {
  model: string;
  country: string;
  fetchedAt: number;
  species: Species[];
  files: { url: string; sha256: string; bytes: number; ids: number[]; kind: 'image' | 'text' }[];
}
const packHash = recognitionDownloadInfo.files['/models/references.json'].sha256;
const countryKey = `id:${countryId}:country:country`;
async function hash(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
export async function prepareReferencePack(
  progress: (done: number, total: number) => void,
  signal?: AbortSignal,
) {
  const cache = await modelCache();
  let response = await cache.match('/models/references.json');
  let manifest = response ? await response.arrayBuffer() : undefined;
  if (manifest && (await hash(manifest)) !== packHash) manifest = undefined;
  if (!manifest) {
    response = await fetchRecognitionAsset('/models/references.json', signal);
    if (!response.ok) throw new Error('Reference pack is unavailable.');
    await cache.put('/models/references.json', response.clone());
    manifest = await response.arrayBuffer();
  }
  const pack = JSON.parse(new TextDecoder().decode(manifest)) as Pack;
  if (pack.model !== config.id || pack.country !== countryId)
    throw new Error('Reference pack does not match the model or country.');
  let done = 0;
  const total = pack.files.reduce((n, f) => n + f.ids.length, 0);
  for (const file of pack.files) {
    signal?.throwIfAborted();
    const keys = file.ids.map(
      (id) => `${config.id}:${config.referenceVersion}:${id}${file.kind === 'text' ? ':text' : ''}`,
    );
    const saved = await getEmbeddings(keys);
    // Upgrade/resume reuses imported chunks, including imports made before the
    // pack revision marker existed. Do not rewrite the whole native index.
    if (
      saved.length === keys.length &&
      saved.every((record) => record?.vector.length === config.dimensions)
    ) {
      done += file.ids.length;
      progress(done, total);
      continue;
    }
    let result = await cache.match(file.url);
    if (!result) {
      result = await fetchRecognitionAsset(file.url, signal);
      if (!result.ok) throw new Error('Reference download failed.');
      const bytes = await result.arrayBuffer();
      if ((await hash(bytes)) !== file.sha256) throw new Error('Reference integrity check failed');
      result = new Response(bytes);
      await cache.put(file.url, result.clone());
    }
    const vector = new Float32Array(await result.arrayBuffer());
    if (vector.length !== file.ids.length * config.dimensions)
      throw new Error('Invalid reference dimensions');
    const records: EmbeddingRecord[] = [];
    for (let i = 0; i < file.ids.length; i++) {
      const id = file.ids[i];
      const record: EmbeddingRecord = {
        key: keys[i],
        taxonId: id,
        model: config.id,
        source: `${file.kind}:country-pack`,
        savedAt: Date.now(),
        vector: Array.from(vector.slice(i * config.dimensions, (i + 1) * config.dimensions)),
      };
      records.push(record);
      done++;
    }
    await saveEmbeddings(records);
    progress(done, total);
  }
  signal?.throwIfAborted();
  await saveRange({
    key: countryKey,
    species: pack.species,
    fetchedAt: pack.fetchedAt,
    complete: true,
    referencePack: packHash,
  });
}

export async function referencePackStatus() {
  const saved = await getRange(countryKey);
  return !!saved?.complete && saved.referencePack === packHash;
}
