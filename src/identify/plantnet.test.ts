import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  native: false,
  post: vi.fn(),
  search: vi.fn(),
  prefs: new Map<string, string>(),
}));
vi.mock('@capacitor/core', () => ({ CapacitorHttp: { post: mocks.post } }));
vi.mock('../native/platform', () => ({
  get nativeAndroid() {
    return mocks.native;
  },
  readPreference: (key: string) => mocks.prefs.get(key),
  writePreference: async (key: string, value: string) => {
    mocks.prefs.set(key, value);
  },
}));
vi.mock('../../config/identification', () => ({
  onlineIdentificationConfig: {
    apiKey: 'private-test-key',
    endpoint: 'https://my-api.plantnet.org/v2/identify/all',
    group: 'plants',
    timeout: 12000,
    provider: 'plantnet',
    clientOrigin: 'https://fieldbook.example',
  },
}));
vi.mock('../diagnostics', () => ({ diagnostic: vi.fn() }));
vi.mock('../species/client', () => ({ searchTaxa: mocks.search }));
import { identifyOnline, resolvePlantnetSpecies } from './plantnet';
import { diagnostic } from '../diagnostics';
const suggestion = (name: string, score = 0.9) => ({
  score,
  species: { scientificNameWithoutAuthor: name },
});
const result = (name = 'Casimiroa edulis') => ({
  version: 'test-model',
  remainingIdentificationRequests: 20,
  results: [suggestion(name)],
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.native = false;
  mocks.prefs.clear();
  vi.stubGlobal('fetch', vi.fn());
});

it('recognises without any offline pack and maps the winning global species to its existing fieldbook identity', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(result())));
  const r = await identifyOnline(
    [new Blob(['photo'], { type: 'image/jpeg' })],
    new AbortController().signal,
    'operation',
  );
  expect(r.matches[0]).toMatchObject({
    species: { id: 209889, scientificName: 'Casimiroa edulis' },
    model: 'plantnet:test-model',
  });
  expect(mocks.search).not.toHaveBeenCalled();
  const [, request] = vi.mocked(fetch).mock.calls[0];
  expect((request?.body as FormData).getAll('images')).toHaveLength(1);
  expect(JSON.stringify(vi.mocked(diagnostic).mock.calls)).not.toContain('private-test-key');
});
it('keeps a global GBIF species outside downloaded lists eligible instead of promoting a local runner-up', async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      JSON.stringify({
        results: [
          { ...suggestion('Unknown species'), gbif: { id: '123456' } },
          suggestion('Casimiroa edulis', 0.5),
        ],
      }),
    ),
  );
  const r = await identifyOnline([new Blob(['photo'])], new AbortController().signal, 'outside');
  expect(r.matches[0].species).toMatchObject({
    id: -123456,
    scientificName: 'Unknown species',
    source: { provider: 'GBIF' },
  });
});
it('resolves a synonym to an exact iNaturalist alias, never a fuzzy first search result', async () => {
  mocks.search.mockResolvedValue([
    { id: 1, scientificName: 'Other plant', alternativeNames: [] },
    { id: 76949, scientificName: 'Eriobotrya japonica', alternativeNames: ['Rhaphiolepis bibas'] },
  ]);
  expect(
    await resolvePlantnetSpecies(suggestion('Rhaphiolepis bibas'), new AbortController().signal),
  ).toMatchObject({ id: 76949 });
});
it('remembers quota exhaustion and makes no retry or paid fallback request', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 429 }));
  for (let i = 0; i < 2; i++)
    await expect(
      identifyOnline([new Blob(['photo'])], new AbortController().signal, 'quota'),
    ).rejects.toMatchObject({ code: 'quota' });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('a rejected image produces no match rather than an automatic fallback guess', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 404 }));
  await expect(
    identifyOnline([new Blob(['photo'])], new AbortController().signal, 'reject'),
  ).rejects.toMatchObject({ code: 'no-match' });
});
it('serialises native multipart bytes and contains key-bearing transport errors', async () => {
  mocks.native = true;
  mocks.post.mockResolvedValue({ status: 200, data: result() });
  await identifyOnline(
    [new Blob(['JPEG'], { type: 'image/jpeg' })],
    new AbortController().signal,
    'native',
  );
  expect(mocks.post.mock.calls[0][0]).toMatchObject({
    dataType: 'formData',
    data: [
      { key: 'images', type: 'base64File', value: btoa('JPEG'), contentType: 'image/jpeg' },
      { key: 'organs', type: 'string', value: 'auto' },
    ],
  });
  mocks.post.mockRejectedValue(new Error('https://example.test?api-key=private-test-key'));
  await expect(
    identifyOnline([new Blob(['JPEG'])], new AbortController().signal, 'error'),
  ).rejects.toMatchObject({ code: 'network' });
  expect(JSON.stringify(vi.mocked(diagnostic).mock.calls)).not.toContain('private-test-key');
});
it('cancelling a native upload ignores its eventual result', async () => {
  mocks.native = true;
  let finish!: (r: unknown) => void;
  mocks.post.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const controller = new AbortController();
  const pending = identifyOnline([new Blob(['photo'])], controller.signal, 'cancel');
  await vi.waitFor(() => expect(mocks.post).toHaveBeenCalled());
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  finish({ status: 200, data: result() });
  expect(vi.mocked(diagnostic).mock.calls.some(([name]) => name === 'online.result')).toBe(false);
});

it('native recognition sends the authorized client origin for the shared browser-enabled key', async () => {
  mocks.native = true;
  mocks.post.mockResolvedValue({ status: 200, data: result() });
  const response = await identifyOnline(
    [new Blob(['photo'], { type: 'image/jpeg' })],
    new AbortController().signal,
    'shared-key',
  );
  expect(response.matches[0].species.id).toBe(209889);
  expect(mocks.post).toHaveBeenCalledWith(
    expect.objectContaining({
      headers: { 'Content-Type': 'multipart/form-data', Origin: 'https://fieldbook.example' },
    }),
  );
});
