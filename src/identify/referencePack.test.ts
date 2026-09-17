import { beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({
  cache: new Map<string, Response>(),
  vectors: new Map<string, { vector: number[] }>(),
  fetch: vi.fn(),
  save: vi.fn(),
  range: undefined as unknown,
}));
vi.mock('../../config/app', () => ({ countryId: 'test' }));
vi.mock('../../config/identification', () => ({
  identificationConfig: { id: 'model', referenceVersion: 'v1', dimensions: 2 },
}));
vi.mock('../store', () => ({
  getRange: async () => fixture.range,
  saveRange: async (range: unknown) => {
    fixture.range = range;
  },
  getEmbeddings: async (keys: string[]) => keys.map((key) => fixture.vectors.get(key)),
  saveEmbeddings: fixture.save,
}));
vi.mock('../store/modelAssets', () => ({
  modelCache: async () => ({
    match: async (path: string) => fixture.cache.get(path)?.clone(),
    put: async (path: string, response: Response) => {
      fixture.cache.set(path, response);
    },
  }),
}));
vi.mock('../store/recognitionDownload', async () => {
  const { createHash } = await import('node:crypto');
  const vector = new Float32Array([1, 0]);
  const sha256 = createHash('sha256').update(new Uint8Array(vector.buffer)).digest('hex');
  const manifest = JSON.stringify({
    model: 'model',
    country: 'test',
    fetchedAt: 123,
    species: [],
    files: [1, 2].map((id) => ({ url: `/chunk-${id}`, sha256, bytes: 8, ids: [id], kind: 'text' })),
  });
  return {
    recognitionDownloadInfo: {
      files: {
        '/models/references.json': {
          sha256: createHash('sha256').update(manifest).digest('hex'),
        },
      },
    },
    fetchRecognitionAsset: async (path: string) => {
      fixture.fetch(path);
      return new Response(path === '/models/references.json' ? manifest : vector.buffer.slice(0));
    },
  };
});
import { prepareReferencePack, referencePackStatus } from './referencePack';
beforeEach(() => {
  vi.clearAllMocks();
  fixture.cache.clear();
  fixture.vectors.clear();
  fixture.range = undefined;
  fixture.save.mockImplementation(async (records: { key: string; vector: number[] }[]) => {
    for (const record of records) fixture.vectors.set(record.key, record);
  });
});

it('upgrades the old country pack, downloads only additions and retains previously imported vectors', async () => {
  fixture.range = { complete: true, species: [], fetchedAt: 0 };
  fixture.cache.set('/models/references.json', new Response('{"old":"manifest"}'));
  const old = { vector: [1, 0] };
  fixture.vectors.set('model:v1:1:text', old);
  expect(await referencePackStatus()).toBe(false);
  await prepareReferencePack(() => {});
  expect(fixture.fetch.mock.calls.map(([path]) => path)).toEqual([
    '/models/references.json',
    '/chunk-2',
  ]);
  expect(fixture.vectors.get('model:v1:1:text')).toBe(old);
  expect(await referencePackStatus()).toBe(true);
});
it('does not mark preparation complete after an interrupted database import and can resume', async () => {
  fixture.save.mockRejectedValueOnce(new Error('disk write interrupted'));
  await expect(prepareReferencePack(() => {})).rejects.toThrow('disk write interrupted');
  expect(await referencePackStatus()).toBe(false);
  await prepareReferencePack(() => {});
  expect(await referencePackStatus()).toBe(true);
  expect(fixture.vectors.size).toBe(2);
});
it('does not mark an aborted preparation complete', async () => {
  const controller = new AbortController();
  await expect(
    prepareReferencePack(() => controller.abort(), controller.signal),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(await referencePackStatus()).toBe(false);
});
