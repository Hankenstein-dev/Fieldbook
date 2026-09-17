import { expect, it } from 'vitest';
import { encodeEmbedding, decodeEmbedding } from './nativeEmbeddings';
const record = { key: 'test', model: 'model', source: 'text:country-pack', savedAt: 1 };
it('preserves reference floats exactly in a compact binary vector', () => {
  const vector = Array.from(new Float32Array([0.1, -0.2, 0, 1, -0]));
  const encoded = encodeEmbedding({ ...record, vector });
  expect(encoded.vector).toHaveLength(vector.length * 4);
  expect(decodeEmbedding(encoded)).toEqual({ ...record, vector });
});
it('retains full precision for generated doubles rather than quantising them', () => {
  const vector = [Math.PI, Number.MIN_VALUE, 0.1, -0];
  const encoded = encodeEmbedding({ ...record, vector });
  expect(encoded.vector).toHaveLength(vector.length * 8);
  expect(decodeEmbedding(encoded)).toEqual({ ...record, vector });
});
it('reads earlier native JSON vectors without resetting the cache', () => {
  const value = { ...record, vector: [0.1, 0.2] };
  expect(decodeEmbedding({ value: JSON.stringify(value) })).toEqual(value);
});
