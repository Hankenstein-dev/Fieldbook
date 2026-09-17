import { beforeEach, expect, it, vi } from 'vitest';
import type { Species } from '../types';
const fixture = vi.hoisted(() => ({
  cache: new Map<string, Response>(),
  get: vi.fn(),
  manifest: '',
}));
vi.mock('../../config/identification', () => ({
  identificationConfig: { id: 'test', referenceVersion: 'v1', dimensions: 2 },
}));
vi.mock('../../config/app', () => ({ countryId: 'test' }));
vi.mock('../store', () => ({ getEmbeddings: fixture.get }));
vi.mock('../store/modelAssets', () => ({
  modelCache: async () => ({ match: async (path: string) => fixture.cache.get(path)?.clone() }),
}));
vi.mock('../store/recognitionDownload', async () => {
  const { createHash } = await import('node:crypto');
  fixture.manifest = JSON.stringify({
    model: 'test',
    country: 'test',
    files: [
      {
        url: '/vectors',
        kind: 'text',
        ids: [1, 2],
        sha256: createHash('sha256')
          .update(new Uint8Array(new Float32Array([1, 0, 0, 1]).buffer))
          .digest('hex'),
      },
    ],
  });
  return {
    recognitionDownloadInfo: {
      files: {
        '/models/references.json': {
          sha256: createHash('sha256').update(fixture.manifest).digest('hex'),
        },
      },
    },
  };
});
import { matchPreparedReferences } from './referenceMatcher';
const species = (id: number): Species => ({
  id,
  scientificName: String(id),
  commonName: String(id),
  group: 'plants',
  rank: 'species',
  alternativeNames: [],
});
beforeEach(() => {
  fixture.cache.clear();
  vi.clearAllMocks();
  fixture.cache.set('/models/references.json', new Response(fixture.manifest));
  fixture.cache.set('/vectors', new Response(new Float32Array([1, 0, 0, 1]).buffer));
  fixture.get.mockImplementation(async (keys: string[]) => keys.map(() => undefined));
});
it('compares packed float32 vectors directly, without sending them through the database bridge', async () => {
  const result = await matchPreparedReferences([0.6, 0.8], [species(1), species(2)], () => {});
  expect(result.matches.map((m) => [m.species.id, m.similarity])).toEqual([
    [2, 0.8],
    [1, 0.6],
  ]);
  expect(result.packedReferences).toBe(2);
  expect(fixture.get).not.toHaveBeenCalled();
});
it('keeps unmatched additions eligible via saved references and reports truly unsupported candidates', async () => {
  fixture.get.mockResolvedValue([{ vector: [1, 0] }, undefined]);
  const result = await matchPreparedReferences(
    [1, 0],
    [species(2), species(3), species(4)],
    () => {},
  );
  expect(fixture.get).toHaveBeenCalledWith(['test:v1:3:text', 'test:v1:4:text']);
  expect(result.matches[0].species.id).toBe(3);
  expect(result.unsupported.map((s) => s.id)).toEqual([4]);
});
it('falls back to the stored index if a packed chunk fails its integrity check', async () => {
  fixture.cache.set('/vectors', new Response(new Float32Array([0, 0, 0, 0]).buffer));
  fixture.get.mockResolvedValue([{ vector: [1, 0] }]);
  const result = await matchPreparedReferences([1, 0], [species(1)], () => {});
  expect(result.packedReferences).toBe(0);
  expect(result.matches[0].similarity).toBe(1);
  expect(result.unsupported).toEqual([]);
});
