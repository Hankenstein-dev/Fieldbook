import { expect, it } from 'vitest';
import { matchReferences, normalise, similarity } from './math';
it('ranks by normalised similarity without converting it to a confidence probability', () => {
  const q = normalise([3, 4]);
  expect(similarity(q, q)).toBeCloseTo(1);
  const rows = matchReferences(
    q,
    [
      { id: 1, vector: [-1, 0] },
      { id: 2, vector: q },
      { id: 3, vector: [1, 0] },
    ],
    2,
  );
  expect(rows.map((r) => r.id)).toEqual([2, 3]);
});
it('rejects invalid vectors and incompatible model dimensions', () => {
  expect(() => normalise([0, 0])).toThrow();
  expect(() => normalise([NaN, 1])).toThrow();
  expect(() => similarity([1], [1, 0])).toThrow();
});
