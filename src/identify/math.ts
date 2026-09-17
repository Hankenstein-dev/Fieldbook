export function normalise(vector: ArrayLike<number>): number[] {
  const n = Math.hypot(...Array.from(vector));
  if (!Number.isFinite(n) || n === 0) throw new Error('Model returned an invalid embedding');
  return Array.from(vector, (v) => v / n);
}
export function similarity(a: ArrayLike<number>, b: ArrayLike<number>) {
  if (a.length !== b.length) throw new Error('Embedding dimensions differ');
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
export function matchReferences<T extends { vector: number[] }>(
  query: number[],
  references: T[],
  limit = 10,
) {
  return references
    .map((r) => ({ ...r, similarity: similarity(query, r.vector) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
