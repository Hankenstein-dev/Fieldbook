import { apiConfig, groupConfig } from '../../config/app';
import type { Candidate, Photo, Species } from '../types';

interface InatPhoto {
  id: number;
  url?: string;
  square_url?: string;
  medium_url?: string;
  attribution?: string;
  license_code?: string;
}
export interface InatTaxon {
  id: number;
  name: string;
  preferred_common_name?: string;
  rank?: string;
  iconic_taxon_name?: string;
  default_photo?: InatPhoto;
  names?: { name: string }[];
  ancestors?: { name: string; rank: string }[];
}
export function normaliseTaxon(t: InatTaxon): Species {
  const group =
    Object.entries(groupConfig).find(([, g]) =>
      g.iconicTaxa.includes(t.iconic_taxon_name ?? ''),
    )?.[0] ?? 'other';
  const p = t.default_photo;
  let photo: Photo | undefined;
  if (p && (p.medium_url || p.square_url || p.url)) {
    photo = {
      url: (p.medium_url || p.square_url || p.url)!.replace('/square.', '/medium.'),
      attribution: p.attribution || 'iNaturalist contributor',
      license: p.license_code || 'all-rights-reserved',
      sourceUrl: `https://www.inaturalist.org/photos/${p.id}`,
    };
  }
  return {
    id: t.id,
    scientificName: t.name,
    commonName: t.preferred_common_name || t.name,
    alternativeNames: t.names?.map((n) => n.name) ?? [],
    rank: t.rank || 'species',
    group,
    photo,
    family: t.ancestors?.find((a) => a.rank === 'family')?.name,
  };
}
let queue: Promise<unknown> = Promise.resolve();
let lastRequest = 0;
let blockedUntil = 0;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export async function request<T>(
  path: string,
  params: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<T> {
  const run = queue.then(async () => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (Date.now() < blockedUntil)
      throw new Error('iNaturalist is busy. Please try again in a little while.');
    await wait(Math.max(0, apiConfig.requestInterval - (Date.now() - lastRequest)));
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    lastRequest = Date.now();
    const url = new URL(apiConfig.base + path);
    for (const [key, value] of Object.entries({ locale: apiConfig.locale, ...params }))
      url.searchParams.set(key, String(value));
    const timeout = AbortSignal.timeout(20000);
    const response = await fetch(url, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (response.status === 429) {
      const retry = response.headers.get('Retry-After');
      const delay =
        retry && /^\d+$/.test(retry)
          ? Number(retry) * 1000
          : retry
            ? Math.max(0, Date.parse(retry) - Date.now())
            : 60000;
      blockedUntil = Date.now() + (Number.isFinite(delay) ? Math.max(60000, delay) : 60000);
      throw new Error('iNaturalist is busy. Your saved lists are still available.');
    }
    if (!response.ok) throw new Error('Could not reach iNaturalist. Please try again.');
    return response.json() as Promise<T>;
  });
  queue = run.catch(() => undefined);
  return run;
}
export async function fetchCandidates(
  lat: number,
  lng: number,
  radius: number,
  iconicTaxa: string[],
): Promise<{ candidates: Candidate[]; total: number }> {
  const candidates = new Map<number, Candidate>();
  let total = 0,
    page = 1;
  do {
    const result = await request<{
      total_results: number;
      results: { count: number; taxon: InatTaxon }[];
    }>('/observations/species_counts', {
      lat,
      lng,
      radius,
      iconic_taxa: iconicTaxa.join(','),
      per_page: 200,
      page,
    });
    total = result.total_results;
    const before = candidates.size;
    for (const row of result.results)
      candidates.set(row.taxon.id, { count: row.count, species: normaliseTaxon(row.taxon) });
    if (candidates.size === before && candidates.size < total)
      throw new Error('The species list was incomplete. Please try again.');
    page++;
  } while (candidates.size < total);
  return { candidates: [...candidates.values()], total };
}
export async function searchTaxa(query: string, signal?: AbortSignal): Promise<Species[]> {
  const response = await request<{ results: InatTaxon[] }>(
    '/taxa/autocomplete',
    { q: query, per_page: 20, is_active: 'true' },
    signal,
  );
  return response.results.map(normaliseTaxon);
}

export async function speciesCounts(
  params: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<Candidate[]> {
  const found = new Map<number, Candidate>();
  let page = 1,
    total = 0;
  do {
    const r = await request<{
      total_results: number;
      results: { taxon: InatTaxon; count: number }[];
    }>('/observations/species_counts', { ...params, per_page: 200, page }, signal);
    total = r.total_results;
    const before = found.size;
    for (const row of r.results)
      found.set(row.taxon.id, { species: normaliseTaxon(row.taxon), count: row.count });
    if (found.size === before && found.size < total) throw new Error('Incomplete species list');
    page++;
  } while (found.size < total);
  return [...found.values()];
}
