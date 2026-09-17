import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  get: vi.fn(),
  save: vi.fn(),
  supplement: vi.fn(),
}));
vi.mock('./fallbacks', () => ({
  supplementCandidates: mocks.supplement,
}));
vi.mock('./client', () => ({ fetchCandidates: mocks.fetch }));
vi.mock('../store', () => ({ getQuery: mocks.get, saveQuery: mocks.save }));
vi.mock('../../config/app', () => ({
  apiConfig: { cacheDays: 14 },
  countryId: 'test',
  groupConfig: { flora: { iconicTaxa: ['Plantae'] } },
  starterSet: { key: 'not-this-cell' },
}));
let api: typeof import('./candidates');
const point = { lat: 37.1265, lng: -8.604 };
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubGlobal('navigator', { onLine: true });
  mocks.get.mockResolvedValue(undefined);
  mocks.save.mockResolvedValue(undefined);
  mocks.supplement.mockRejectedValue(new Error('incomplete'));
  api = await import('./candidates');
});
afterEach(() => vi.unstubAllGlobals());
it('shares a complete cell query between habitats and keeps both habitat keys', async () => {
  mocks.fetch.mockResolvedValue({ total: 100, candidates: [] });
  const first = await api.getCandidates(point, 'coast', ['flora']);
  const next = await api.getCandidates(point, 'wetland', ['flora']);
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(first.data.key).not.toBe(next.data.key);
  expect(next.data.habitat).toBe('wetland');
});
it('widens sparse areas automatically to 25 kilometres', async () => {
  mocks.fetch
    .mockResolvedValueOnce({ total: 10, candidates: [] })
    .mockResolvedValueOnce({ total: 60, candidates: [] });
  const result = await api.getCandidates(point, 'coast', ['flora']);
  expect(mocks.fetch.mock.calls.map((c) => c[2])).toEqual([8.2, 25]);
  expect(result.data.radius).toBe(25);
});
it('retains a stale saved list when refresh fails', async () => {
  mocks.get.mockResolvedValue({
    key: 'old',
    cell: 'old',
    habitat: 'unknown',
    fetchedAt: 0,
    candidates: [],
    total: 10,
  });
  mocks.fetch.mockRejectedValue(new Error('offline'));
  expect((await api.getCandidates(point, 'wetland', ['flora'])).stale).toBe(true);
});
it('does not cache a partial failed query as a complete catalogue', async () => {
  mocks.fetch.mockRejectedValue(new Error('incomplete'));
  await expect(api.getCandidates(point, 'wetland', ['flora'])).rejects.toThrow('incomplete');
  expect(mocks.save).not.toHaveBeenCalled();
});
it('serves the saved list offline without any API request', async () => {
  vi.stubGlobal('navigator', { onLine: false });
  mocks.get.mockResolvedValue({ key: 'old', fetchedAt: 0, candidates: [], total: 10 });
  expect((await api.getCandidates(point, 'coast', ['flora'])).data.total).toBe(10);
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it('retains first-radius records when widening fails and never marks the partial list complete', async () => {
  const candidate = { species: { id: 1 }, count: 1 };
  mocks.fetch
    .mockResolvedValueOnce({ total: 1, candidates: [candidate] })
    .mockRejectedValueOnce(new Error('busy'));
  mocks.supplement.mockImplementation(async (candidates) => ({
    candidates,
    total: candidates.length,
    complete: true,
    sourceWarnings: [],
  }));
  const r = await api.getCandidates(point, 'coast', ['flora']);
  expect(r.data.candidates).toEqual([candidate]);
  expect(r.data.complete).toBe(false);
  expect(r.data.radius).toBe(8.2);
  expect(r.data.sourceWarnings).toContain('Wider iNaturalist records unavailable');
});
it('makes primary outages explicit when supplementary records succeed', async () => {
  mocks.fetch.mockRejectedValue(new Error('busy'));
  mocks.supplement.mockResolvedValue({
    candidates: [],
    total: 0,
    complete: true,
    sourceWarnings: [],
  });
  const r = await api.getCandidates(point, 'coast', ['flora']);
  expect(r.data.complete).toBe(false);
  expect(r.data.sourceWarnings).toContain('iNaturalist records unavailable');
});
