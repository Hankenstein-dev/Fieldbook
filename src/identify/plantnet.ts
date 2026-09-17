import { CapacitorHttp } from '@capacitor/core';
import { onlineIdentificationConfig as config } from '../../config/identification';
import { countryCatalogue } from '../../config/countryCatalogue';
import { referenceSpecies } from '../../config/app';
import { nativeAndroid, readPreference, writePreference } from '../native/platform';
import { searchTaxa } from '../species/client';
import { diagnostic } from '../diagnostics';
import type { Species } from '../types';

export const onlineRecognitionConfigured = () => !!config.apiKey;
export class OnlineRecognitionError extends Error {
  constructor(public code: 'quota' | 'network' | 'configuration' | 'no-match' | 'taxonomy') {
    super(
      {
        quota:
          'Online recognition has reached its daily limit. Try offline recognition or return tomorrow.',
        network: 'Could not reach online recognition. Try again or use offline recognition.',
        configuration: 'Online recognition is not available with this app’s current key.',
        'no-match': 'No plant matched this photo. Try another view or find it by name.',
        taxonomy: 'The suggested species could not be opened. Try again or find it by name.',
      }[code],
    );
  }
}
export interface PlantnetSuggestion {
  score: number;
  species: {
    scientificNameWithoutAuthor: string;
    commonNames?: string[];
    family?: { scientificNameWithoutAuthor: string };
  };
  gbif?: { id: string | number };
}
interface PlantnetResponse {
  version?: string;
  remainingIdentificationRequests?: number;
  results?: PlantnetSuggestion[];
}
const nameKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');
const catalogue = new Map<string, Species>();
for (const species of [...referenceSpecies, ...countryCatalogue]) {
  catalogue.set(nameKey(species.scientificName), species);
  for (const name of species.alternativeNames) catalogue.set(nameKey(name), species);
}
export async function resolvePlantnetSpecies(
  row: PlantnetSuggestion,
  signal: AbortSignal,
): Promise<Species | null> {
  const name = row.species.scientificNameWithoutAuthor;
  const known = catalogue.get(nameKey(name));
  if (known) return known;
  // Global identifiers permit discoveries outside every downloaded checklist.
  const gbif = Number(row.gbif?.id);
  if (Number.isSafeInteger(gbif) && gbif > 0)
    return {
      id: -gbif,
      scientificName: name,
      commonName: row.species.commonNames?.[0] || name,
      alternativeNames: [],
      group: config.group,
      rank: 'species',
      family: row.species.family?.scientificNameWithoutAuthor,
      source: { provider: 'GBIF', key: gbif, url: `https://www.gbif.org/species/${gbif}` },
    };
  try {
    const matches = await searchTaxa(name, signal);
    return (
      matches.find((s) =>
        [s.scientificName, ...s.alternativeNames].some((n) => nameKey(n) === nameKey(name)),
      ) ?? null
    );
  } catch {
    signal.throwIfAborted();
    return null;
  }
}
const quotaKey = 'fieldbook-plantnet-quota';
function quotaBlocked() {
  try {
    return JSON.parse(readPreference(quotaKey) ?? '{}').blockedUntil > Date.now();
  } catch {
    return false;
  }
}
function rememberQuota(remaining: number | undefined, exhausted: boolean) {
  const now = new Date();
  const blockedUntil =
    exhausted || remaining === 0
      ? Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
      : 0;
  void writePreference(quotaKey, JSON.stringify({ remaining, blockedUntil })).catch(
    () => undefined,
  );
}
function cancellable<T>(task: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const cancel = () => reject(signal.reason);
    if (signal.aborted) {
      void task.catch(() => undefined);
      reject(signal.reason);
      return;
    }
    signal.addEventListener('abort', cancel, { once: true });
    task.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
  });
}
async function base64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192)
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
export async function identifyOnline(photos: Blob[], signal: AbortSignal, operation: string) {
  signal.throwIfAborted();
  if (!config.apiKey) throw new OnlineRecognitionError('configuration');
  if (quotaBlocked()) throw new OnlineRecognitionError('quota');
  if (!photos.length || photos.length > 5) throw new OnlineRecognitionError('no-match');
  const started = performance.now();
  const url = new URL(config.endpoint);
  url.searchParams.set('api-key', config.apiKey);
  url.searchParams.set('nb-results', '10');
  url.searchParams.set('lang', 'en');
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(config.timeout)]);
  let status: number, data: PlantnetResponse;
  diagnostic('online.start', {
    operation,
    provider: config.provider,
    photos: photos.length,
    bytes: photos.reduce((n, p) => n + p.size, 0),
  });
  try {
    if (nativeAndroid) {
      const entries = (
        await Promise.all(
          photos.map(async (photo) => [
            {
              key: 'images',
              type: 'base64File',
              value: await base64(photo),
              fileName: 'plant.jpg',
              contentType: photo.type || 'image/jpeg',
            },
            { key: 'organs', type: 'string', value: 'auto' },
          ]),
        )
      ).flat();
      requestSignal.throwIfAborted();
      const response = await cancellable(
        CapacitorHttp.post({
          url: url.href,
          headers: { 'Content-Type': 'multipart/form-data', Origin: config.clientOrigin },
          dataType: 'formData',
          data: entries,
          responseType: 'json',
          connectTimeout: config.timeout,
          readTimeout: config.timeout,
        }),
        requestSignal,
      );
      status = response.status;
      data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } else {
      const body = new FormData();
      for (const photo of photos) {
        body.append('images', photo, 'plant.jpg');
        body.append('organs', 'auto');
      }
      const response = await fetch(url, { method: 'POST', body, signal: requestSignal });
      status = response.status;
      data = await response.json();
    }
  } catch {
    // Native HTTP errors may contain the URL/key. Never log or propagate them.
    signal.throwIfAborted();
    throw new OnlineRecognitionError('network');
  }
  signal.throwIfAborted();
  rememberQuota(data.remainingIdentificationRequests, status === 429);
  const rows = (data.results ?? []).filter(
    (r) => Number.isFinite(r.score) && !!r.species?.scientificNameWithoutAuthor,
  );
  diagnostic('online.result', {
    operation,
    provider: config.provider,
    status,
    model: data.version,
    milliseconds: performance.now() - started,
    remaining: data.remainingIdentificationRequests,
    matches: rows.map((r) => ({
      scientificName: r.species.scientificNameWithoutAuthor,
      score: r.score,
    })),
  });
  if (status === 429) throw new OnlineRecognitionError('quota');
  if (status === 401 || status === 403) throw new OnlineRecognitionError('configuration');
  if (status === 404 || (status === 200 && !rows.length))
    throw new OnlineRecognitionError('no-match');
  if (status !== 200) throw new OnlineRecognitionError('network');
  const mappingSignal = AbortSignal.any([signal, AbortSignal.timeout(3000)]);
  const resolved = await Promise.all(
    rows.map(async (row) => ({
      species: await resolvePlantnetSpecies(row, mappingSignal).catch(() => null),
      similarity: row.score,
    })),
  );
  signal.throwIfAborted();
  // Never silently promote a runner-up because the winner was absent locally.
  if (!resolved[0]?.species) throw new OnlineRecognitionError('taxonomy');
  const matches = resolved.filter(
    (r): r is { species: Species; similarity: number } => !!r.species,
  );
  const model = `plantnet:${data.version ?? 'unknown'}`;
  return {
    matches: matches.map((m) => ({ ...m, model })),
    provider: 'plantnet',
    milliseconds: performance.now() - started,
  };
}
