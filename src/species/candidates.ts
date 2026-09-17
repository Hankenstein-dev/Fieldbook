import { apiConfig, countryId, groupConfig, starterSet } from '../../config/app';
import type { CandidateSet, Habitat, Point } from '../types';
import { getQuery, saveQuery } from '../store';
import { cellCentre, cellFor, coveredRadius } from './geo';
import { supplementCandidates } from './fallbacks';
import { fetchCandidates } from './client';

const pending = new Map<string, Promise<CandidateSet>>();
const memory = new Map<string, CandidateSet>();
export function queryKey(cell: string, habitat: Habitat, interests: string[]) {
  return `${countryId}:${[...interests].sort().join(',')}:${cell}:${habitat}`;
}
export async function getCandidates(
  point: Point,
  habitat: Habitat,
  interests: string[],
  refresh = false,
): Promise<{ data: CandidateSet; stale: boolean }> {
  const cell = cellFor(point),
    centre = cellCentre(cell),
    key = queryKey(cell, habitat, interests);
  const baseKey = queryKey(cell, 'unknown', interests);
  let cached = memory.get(key) ?? (await getQuery(key).catch(() => undefined));
  cached ??= memory.get(baseKey) ?? (await getQuery(baseKey).catch(() => undefined));
  // The bundled starter is an actual, dated local query, never the national story corpus.
  if (!cached && starterSet.key === baseKey) cached = starterSet;
  const expired =
    !cached ||
    Date.now() - cached.fetchedAt >
      (cached.complete === false ? 3600000 : apiConfig.cacheDays * 86400000);
  if (cached && ((!expired && !refresh) || !navigator.onLine)) {
    const data = { ...cached, key, habitat };
    memory.set(key, data);
    void saveQuery(data).catch(() => undefined);
    return { data, stale: expired };
  }
  let loading = pending.get(baseKey);
  if (!loading) {
    loading = (async () => {
      let radius = coveredRadius(cell);
      const iconic = interests.flatMap((id) => groupConfig[id]?.iconicTaxa ?? []);
      let primaryUnavailable = false;
      let result:
        | {
            candidates: CandidateSet['candidates'];
            total: number;
            sourceWarnings?: string[];
            complete?: boolean;
          }
        | undefined;
      try {
        result = await fetchCandidates(centre.lat, centre.lng, radius, iconic);
        if (result.total < 40) {
          const widened = await fetchCandidates(centre.lat, centre.lng, 25, iconic);
          radius = 25;
          result = widened;
        }
      } catch (error) {
        if (cached) throw error;
        primaryUnavailable = true;
        // Preserve a successful first query if widening fails.
        if (result)
          result = {
            ...result,
            complete: false,
            sourceWarnings: ['Wider iNaturalist records unavailable'],
          };
      }
      if (!result || result.total < 40) {
        const previousWarnings =
          result?.sourceWarnings ?? (primaryUnavailable ? ['iNaturalist records unavailable'] : []);
        result = await supplementCandidates(result?.candidates ?? [], centre, radius, interests);
        result.sourceWarnings = [...previousWarnings, ...(result.sourceWarnings ?? [])];
        result.complete = result.complete !== false && previousWarnings.length === 0;
      }
      const data: CandidateSet = {
        key: baseKey,
        cell,
        habitat: 'unknown',
        centre,
        radius,
        ...result,
        fetchedAt: Date.now(),
        complete: result.complete ?? true,
      };
      memory.set(baseKey, data);
      await saveQuery(data).catch(() => undefined);
      return data;
    })().finally(() => pending.delete(baseKey));
    pending.set(baseKey, loading);
  }
  try {
    const data = { ...(await loading), key, habitat };
    memory.set(key, data);
    await saveQuery(data).catch(() => undefined);
    return { data, stale: false };
  } catch (error) {
    if (cached) return { data: { ...cached, key, habitat }, stale: true };
    throw error;
  }
}
