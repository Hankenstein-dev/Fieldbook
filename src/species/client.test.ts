import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../config/app', () => ({
  apiConfig: { base: 'https://example.test/v1', locale: 'en', requestInterval: 0 },
  groupConfig: { flora: { iconicTaxa: ['Plantae'] } },
}));
let client: typeof import('./client');
beforeEach(async () => {
  vi.resetModules();
  client = await import('./client');
});
afterEach(() => vi.unstubAllGlobals());
const row = (id: number) => ({
  count: 3,
  taxon: { id, name: `Species ${id}`, iconic_taxon_name: 'Plantae' },
});
it('fetches every page beyond the story seed, without seasonal or quality filters', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          total_results: 301,
          results: Array.from({ length: 200 }, (_, i) => row(i)),
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          total_results: 301,
          results: Array.from({ length: 101 }, (_, i) => row(i + 200)),
        }),
      ),
    );
  vi.stubGlobal('fetch', fetch);
  const result = await client.fetchCandidates(1, 2, 8, ['Plantae']);
  expect(result.candidates).toHaveLength(301);
  const url = fetch.mock.calls[1][0] as URL;
  expect(url.searchParams.get('page')).toBe('2');
  expect(url.searchParams.has('month')).toBe(false);
  expect(url.searchParams.has('quality_grade')).toBe(false);
});
it('rejects incomplete pagination instead of presenting a capped list as complete', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ total_results: 3, results: [] }))),
  );
  await expect(client.fetchCandidates(1, 2, 8, ['Plantae'])).rejects.toThrow('incomplete');
});
it('backs off after quota exhaustion with no paid or retry fallback', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '120' } }));
  vi.stubGlobal('fetch', fetch);
  await expect(client.searchTaxa('name')).rejects.toThrow('busy');
  await expect(client.searchTaxa('name')).rejects.toThrow('busy');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('keeps unknown groups loggable and preserves photo licence labels for private testing', () => {
  const s = client.normaliseTaxon({
    id: 1,
    name: 'Example',
    iconic_taxon_name: 'Aves',
    default_photo: { id: 3, url: 'https://example.test/square.jpg', license_code: 'cc-by-nd' },
  });
  expect(s.group).toBe('other');
  expect(s.photo?.license).toBe('cc-by-nd');
  const reserved = client.normaliseTaxon({
    id: 2,
    name: 'Example',
    default_photo: { id: 4, url: 'https://example.test/square.jpg' },
  });
  expect(reserved.photo).toMatchObject({
    license: 'all-rights-reserved',
    url: 'https://example.test/medium.jpg',
  });
});
