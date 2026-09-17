import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(), counts: vi.fn() }));
vi.mock('../store', () => ({ getRange: mocks.get, saveRange: mocks.save }));
vi.mock('../species/client', () => ({ speciesCounts: mocks.counts }));
let ranges: typeof import('./ranges');
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubGlobal('navigator', { onLine: true });
  mocks.get.mockResolvedValue(undefined);
  mocks.save.mockResolvedValue(undefined);
  ranges = await import('./ranges');
});
afterEach(() => vi.unstubAllGlobals());
const point = { lat: 37, lng: -8 };
it('shares widening requests, and cancelling a caller does not discard another caller’s result', async () => {
  let finish: (r: unknown) => void = () => {};
  mocks.counts.mockReturnValue(new Promise((r) => (finish = r)));
  const controller = new AbortController();
  const first = ranges.identificationCandidates(point, 'regional', controller.signal);
  const rejection = expect(first).rejects.toMatchObject({ name: 'AbortError' });
  const second = ranges.identificationCandidates(point, 'regional');
  await vi.waitFor(() => expect(mocks.counts).toHaveBeenCalledTimes(1));
  controller.abort();
  await rejection;
  finish([{ species: { id: 3 } }]);
  expect(await second).toEqual([{ id: 3 }]);
  expect(mocks.save).toHaveBeenCalledTimes(1);
  expect(mocks.counts.mock.calls[0][0]).not.toHaveProperty('iconic_taxa');
});
it('returns stale saved species immediately while refreshing in the background', async () => {
  mocks.get.mockResolvedValue({ complete: true, fetchedAt: 0, species: [{ id: 1 }] });
  mocks.counts.mockResolvedValue([{ species: { id: 2 } }]);
  expect(await ranges.identificationCandidates(point, 'regional')).toEqual([{ id: 1 }]);
  await vi.waitFor(() => expect(mocks.save).toHaveBeenCalled());
});
it('keeps the downloaded country snapshot paired with its references instead of refreshing it live', async () => {
  mocks.get.mockResolvedValue({
    complete: true,
    fetchedAt: 0,
    referencePack: 'current',
    species: [{ id: 1 }],
  });
  expect(await ranges.identificationCandidates(point, 'country')).toEqual([{ id: 1 }]);
  expect(mocks.counts).not.toHaveBeenCalled();
});
it('uses downloaded country data offline and explains a missing local list without requesting the network', async () => {
  vi.stubGlobal('navigator', { onLine: false });
  await expect(ranges.identificationCandidates(point, 'local')).rejects.toThrow('not saved');
  mocks.get.mockResolvedValue({ complete: true, fetchedAt: 0, species: [{ id: 1 }] });
  expect(await ranges.identificationCandidates(point, 'country')).toEqual([{ id: 1 }]);
  expect(mocks.counts).not.toHaveBeenCalled();
});
it('includes a country species absent from local observations, without duplicating shared taxa', async () => {
  vi.stubGlobal('navigator', { onLine: false });
  mocks.get.mockImplementation(async (key: string) =>
    key.includes(':country:country')
      ? { complete: true, species: [{ id: 1 }, { id: 2 }], referencePack: 'pack' }
      : { complete: true, species: [{ id: 1, commonName: 'local' }, { id: 3 }] },
  );
  const result = await ranges.recognitionCandidates(point, 'local');
  expect(result.candidates).toEqual([{ id: 1, commonName: 'local' }, { id: 2 }, { id: 3 }]);
  expect(result.areaSpecies).toHaveLength(2);
  expect(result.referencePack).toBe('pack');
});
it('can identify offline in an unseen area using the prepared country instead of waiting on a local query', async () => {
  vi.stubGlobal('navigator', { onLine: false });
  mocks.get.mockImplementation(async (key: string) =>
    key.includes(':country:country') ? { complete: true, species: [{ id: 2 }] } : undefined,
  );
  const result = await ranges.recognitionCandidates(point, 'local');
  expect(result.candidates).toEqual([{ id: 2 }]);
  expect(result.areaAvailable).toBe(false);
  expect(mocks.counts).not.toHaveBeenCalled();
});
