import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Species } from '../types';
const mocks = vi.hoisted(() => ({ get: vi.fn(), posts: vi.fn(), diagnostic: vi.fn() }));
vi.mock('../store', () => ({ getEmbeddings: mocks.get }));
vi.mock('../../config/identification', () => ({
  identificationConfig: { id: 'test', referenceVersion: 'v1', dimensions: 2 },
}));
vi.mock('../store/assetCache', () => ({ nativeAssetRoot: async () => undefined }));
vi.mock('../store/modelAssets', () => ({
  modelCache: async () => ({ match: async () => undefined }),
}));
vi.mock('../diagnostics', () => ({ diagnostic: mocks.diagnostic }));
import { identify, releaseRecognition } from './engine';
const species = (id: number): Species => ({
  id,
  scientificName: `Species ${id}`,
  commonName: `Species ${id}`,
  group: 'plants',
  rank: 'species',
  alternativeNames: [],
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'Worker',
    class {
      onmessage?: (event: { data: unknown }) => void;
      terminate() {}
      postMessage(message: { id: number; kind: string }) {
        mocks.posts(message);
        queueMicrotask(() =>
          this.onmessage?.({
            data: {
              id: message.id,
              vector: [1, 0],
              milliseconds: 1,
              provider: 'test',
            },
          }),
        );
      }
    },
  );
});
afterEach(() => {
  releaseRecognition();
  vi.unstubAllGlobals();
});

it('reports missing candidates and embeds only the photograph, never taxonomy text', async () => {
  mocks.get.mockResolvedValue([{ vector: [1, 0] }, undefined, { vector: [0, 1] }]);
  const result = await identify(
    new Blob(['photo']),
    [species(1), species(2), species(3)],
    () => {},
  );
  expect(result.matches[0].species.id).toBe(1);
  expect(result.unsupported.map((s) => s.id)).toEqual([2]);
  expect(result.comparedReferences).toBe(2);
  expect(result.missingReferences).toBe(1);
  expect(mocks.posts.mock.calls.map(([message]) => message.kind)).toEqual(['image']);
});
it('reports absent references without trying to generate any', async () => {
  mocks.get.mockResolvedValue([undefined]);
  await expect(identify(new Blob(), [species(1)], () => {})).rejects.toThrow(
    'not in the downloaded',
  );
  expect(mocks.posts.mock.calls.map(([message]) => message.kind)).toEqual(['image']);
});
it('still supports a user description without generating missing taxonomic references', async () => {
  mocks.get.mockResolvedValue([{ vector: [1, 0] }, undefined]);
  await identify('red flowers', [species(1), species(2)], () => {});
  expect(mocks.posts).toHaveBeenCalledTimes(1);
  expect(mocks.posts.mock.calls[0][0]).toMatchObject({
    kind: 'text',
    text: 'red flowers',
    reference: false,
  });
});
