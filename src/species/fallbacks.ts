import { groupConfig } from '../../config/app';
import type { Candidate, Point, Species } from '../types';
import { getStoredSpecies } from '../store';
import { referenceSpecies } from '../../config/app';

export type Provider = 'GBIF' | 'OBIS';
export const externalId = (provider: Provider, key: number) =>
  provider === 'GBIF' ? -key : -(1_000_000_000_000 + key);
export const nameKey = (name: string) => name.trim().toLocaleLowerCase();
export function mergeCandidates(primary: Candidate[], extra: Candidate[]): Candidate[] {
  const rows = new Map<string, Candidate>(
    primary.map((c) => [
      nameKey(c.species.scientificName),
      {
        ...c,
        sources: c.sources ?? [
          {
            provider: 'iNaturalist' as const,
            count: c.count,
            url: `https://www.inaturalist.org/taxa/${c.species.id}`,
          },
        ],
      },
    ]),
  );
  for (const c of extra) {
    const key = nameKey(c.species.scientificName),
      old = rows.get(key);
    if (old)
      rows.set(key, {
        ...old,
        count: Math.max(old.count, c.count),
        sources: [...(old.sources ?? []), ...(c.sources ?? [])],
      });
    else rows.set(key, c);
  }
  // Aggregators can share observations. Never add their counts together.
  return [...rows.values()];
}
export function queryPolygon(point: Point, radius: number) {
  const coords = Array.from({ length: 33 }, (_, i) => {
    const a = (i / 32) * 2 * Math.PI,
      r = radius / Math.cos(Math.PI / 32);
    return `${point.lng + (Math.cos(a) * r) / (111.195 * Math.cos((point.lat * Math.PI) / 180))} ${point.lat + (Math.sin(a) * r) / 111.195}`;
  });
  coords[32] = coords[0];
  return `POLYGON((${coords.join(',')}))`;
}
let queue = Promise.resolve(),
  last = 0;
const blockedUntil = new Map<string, number>();
async function request<T>(url: string): Promise<T> {
  const run = queue.then(async () => {
    await new Promise((r) => setTimeout(r, Math.max(0, 120 - (Date.now() - last))));
    const host = new URL(url).host;
    if ((blockedUntil.get(host) ?? 0) > Date.now())
      throw new Error('Supplementary records are busy; try again later.');
    last = Date.now();
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (r.status === 429) {
      const retry = r.headers.get('Retry-After'),
        seconds = Number(retry);
      blockedUntil.set(
        host,
        Date.now() +
          Math.max(
            60000,
            Number.isFinite(seconds)
              ? seconds * 1000
              : Date.parse(retry ?? '') - Date.now() || 60000,
          ),
      );
    }
    if (!r.ok) throw new Error('Supplementary species records are unavailable.');
    return r.json() as Promise<T>;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
interface GbifTaxon {
  key: number;
  canonicalName: string;
  rank: string;
  family?: string;
  kingdom?: string;
  class?: string;
  phylum?: string;
}
interface ObisTaxon {
  taxonID: number;
  scientificName: string;
  taxonRank: string;
  records: number;
  family?: string;
  kingdom?: string;
  class?: string;
  phylum?: string;
}
function configuredGroup(
  taxon: { kingdom?: string; class?: string; phylum?: string },
  interests: string[],
) {
  return interests.find((id) =>
    groupConfig[id]?.sourceTaxa?.some((rule) =>
      Object.entries(rule).every(([key, value]) => taxon[key as keyof typeof taxon] === value),
    ),
  );
}
function resolveSpecies(
  provider: Provider,
  key: number,
  name: string,
  rank: string,
  group: string,
  family: string | undefined,
  known: Map<string, Species>,
): Species {
  return (
    known.get(nameKey(name)) ?? {
      id: externalId(provider, key),
      scientificName: name,
      commonName: name,
      alternativeNames: [],
      rank: rank.toLocaleLowerCase(),
      group,
      family,
      source: {
        provider,
        key,
        url:
          provider === 'GBIF'
            ? `https://www.gbif.org/species/${key}`
            : `https://obis.org/taxon/${key}`,
      },
    }
  );
}
export async function gbifCandidates(
  point: Point,
  radius: number,
  interests: string[],
  known: Map<string, Species>,
): Promise<Candidate[]> {
  const counts = new Map<number, number>();
  const kingdoms = [...new Set(interests.flatMap((id) => groupConfig[id]?.gbifKingdomKeys ?? []))];
  if (!kingdoms.length) return [];
  for (const kingdom of kingdoms) {
    let offset = 0;
    while (true) {
      const params = new URLSearchParams({
        geometry: queryPolygon(point, radius),
        kingdomKey: String(kingdom),
        occurrenceStatus: 'PRESENT',
        hasCoordinate: 'true',
        facet: 'speciesKey',
        facetLimit: '200',
        facetOffset: String(offset),
        limit: '0',
      });
      const r = await request<{
        facets: { field: string; counts: { name: string; count: number }[] }[];
      }>(`https://api.gbif.org/v1/occurrence/search?${params}`);
      const batch = r.facets.find((f) => f.field === 'SPECIES_KEY')?.counts ?? [];
      const before = counts.size;
      batch.forEach((c) => counts.set(Number(c.name), c.count));
      if (batch.length < 200) break;
      if (before === counts.size) throw new Error('GBIF returned an incomplete species list.');
      offset += batch.length;
    }
  }
  const result: Candidate[] = [];
  for (const [id, count] of counts) {
    const t = await request<GbifTaxon>(`https://api.gbif.org/v1/species/${id}`);
    const group = configuredGroup(t, interests);
    if (!group || !t.canonicalName) continue;
    result.push({
      species: resolveSpecies('GBIF', id, t.canonicalName, t.rank, group, t.family, known),
      count,
      sources: [
        { provider: 'GBIF', count, url: `https://www.gbif.org/occurrence/search?taxon_key=${id}` },
      ],
    });
  }
  return result;
}
export async function obisCandidates(
  point: Point,
  radius: number,
  interests: string[],
  known: Map<string, Species>,
): Promise<Candidate[]> {
  const r = await request<{ total: number; results: ObisTaxon[] }>(
    `https://api.obis.org/v3/checklist?${new URLSearchParams({ geometry: queryPolygon(point, radius), absence: 'false' })}`,
  );
  if (r.results.length < r.total) throw new Error('OBIS returned an incomplete checklist.');
  return r.results.flatMap((t) => {
    const group = configuredGroup(t, interests);
    if (!group || !['species', 'subspecies', 'variety'].includes(t.taxonRank.toLocaleLowerCase()))
      return [];
    return [
      {
        species: resolveSpecies(
          'OBIS',
          t.taxonID,
          t.scientificName,
          t.taxonRank,
          group,
          t.family,
          known,
        ),
        count: t.records,
        sources: [
          {
            provider: 'OBIS' as const,
            count: t.records,
            url: `https://obis.org/taxon/${t.taxonID}`,
          },
        ],
      },
    ];
  });
}
export async function supplementCandidates(
  primary: Candidate[],
  point: Point,
  radius: number,
  interests: string[],
) {
  const stored = await getStoredSpecies().catch(() => []),
    known = new Map(
      [...referenceSpecies, ...stored, ...primary.map((c) => c.species)]
        .filter((s) => s.id > 0)
        .map((s) => [nameKey(s.scientificName), s]),
    );
  const providers = [
    gbifCandidates(point, radius, interests, known),
    obisCandidates(point, radius, interests, known),
  ];
  const results = await Promise.allSettled(providers);
  let candidates = primary;
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') candidates = mergeCandidates(candidates, r.value);
    else failed.push(i === 0 ? 'GBIF' : 'OBIS');
  });
  if (!candidates.length && failed.length === results.length)
    throw new Error('Species record providers are unavailable.');
  return {
    candidates,
    total: candidates.length,
    complete: failed.length === 0,
    sourceWarnings: failed.map((p) => `${p} supplementary records unavailable`),
  };
}
