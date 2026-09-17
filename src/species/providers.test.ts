import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../store', () => ({ getStoredSpecies: vi.fn().mockResolvedValue([]) }));
let api: typeof import('./fallbacks');
let fetcher: ReturnType<typeof vi.fn>;
const point = { lat: 37, lng: -8 };
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  api = await import('./fallbacks');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
it('paginates every GBIF species facet and resolves the final page with provider identities', async () => {
  fetcher.mockImplementation(async (url: string) => {
    const u = new URL(url);
    if (u.pathname.endsWith('/search'))
      return response({
        facets: [
          {
            field: 'SPECIES_KEY',
            counts:
              u.searchParams.get('facetOffset') === '0'
                ? Array.from({ length: 200 }, (_, i) => ({ name: String(i + 1), count: 2 }))
                : [{ name: '201', count: 3 }],
          },
        ],
      });
    const id = Number(u.pathname.split('/').pop());
    return response({
      key: id,
      canonicalName: `Example ${id}`,
      rank: 'SPECIES',
      kingdom: 'Plantae',
    });
  });
  const task = api.gbifCandidates(point, 8, ['plants'], new Map());
  await vi.runAllTimersAsync();
  const rows = await task;
  expect(rows).toHaveLength(201);
  expect(rows.at(-1)?.species).toMatchObject({
    id: -201,
    scientificName: 'Example 201',
    source: { provider: 'GBIF', key: 201 },
  });
  expect(
    fetcher.mock.calls
      .filter(([url]) => new URL(url).pathname.endsWith('/search'))
      .map(([url]) => new URL(url).searchParams.get('facetOffset')),
  ).toEqual(['0', '200']);
});
it('rejects a repeated full facet page instead of silently truncating the catalogue', async () => {
  fetcher.mockResolvedValue(
    response({
      facets: [
        {
          field: 'SPECIES_KEY',
          counts: Array.from({ length: 200 }, (_, i) => ({ name: String(i + 1), count: 1 })),
        },
      ],
    }),
  );
  // Each request needs a fresh response body.
  fetcher.mockImplementation(async () =>
    response({
      facets: [
        {
          field: 'SPECIES_KEY',
          counts: Array.from({ length: 200 }, (_, i) => ({ name: String(i + 1), count: 1 })),
        },
      ],
    }),
  );
  const assertion = expect(api.gbifCandidates(point, 8, ['plants'], new Map())).rejects.toThrow(
    'incomplete',
  );
  await vi.runAllTimersAsync();
  await assertion;
});
it('keeps successful OBIS records with source warnings when GBIF fails, and applies only configured interests', async () => {
  fetcher.mockImplementation(async (url: string) =>
    url.includes('api.gbif.org')
      ? response({}, 503)
      : response({
          total: 2,
          results: [
            {
              taxonID: 50,
              scientificName: 'Example marina',
              taxonRank: 'Species',
              kingdom: 'Plantae',
              records: 7,
            },
            {
              taxonID: 60,
              scientificName: 'Example animal',
              taxonRank: 'Species',
              kingdom: 'Animalia',
              records: 8,
            },
          ],
        }),
  );
  const task = api.supplementCandidates([], point, 8, ['plants']);
  await vi.runAllTimersAsync();
  const r = await task;
  expect(r.candidates).toHaveLength(1);
  expect(r.candidates[0].species.source?.provider).toBe('OBIS');
  expect(r.complete).toBe(false);
  expect(r.sourceWarnings).toEqual(['GBIF supplementary records unavailable']);
});
it('fails an incomplete OBIS checklist and honours GBIF rate-limit cooldown', async () => {
  fetcher.mockImplementation(async (url: string) =>
    url.includes('api.gbif.org') ? response({}, 429) : response({ total: 2, results: [] }),
  );
  const first = expect(api.gbifCandidates(point, 8, ['plants'], new Map())).rejects.toThrow();
  await vi.runAllTimersAsync();
  await first;
  const retry = expect(api.gbifCandidates(point, 8, ['plants'], new Map())).rejects.toThrow('busy');
  await vi.runAllTimersAsync();
  await retry;
  expect(fetcher).toHaveBeenCalledTimes(1);
  const obis = expect(api.obisCandidates(point, 8, ['plants'], new Map())).rejects.toThrow(
    'incomplete',
  );
  await vi.runAllTimersAsync();
  await obis;
});
