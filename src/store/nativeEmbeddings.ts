import type { EmbeddingRecord } from '../types';
export function encodeEmbedding(record: EmbeddingRecord) {
  const { vector, ...metadata } = record;
  // Pack references already contain float32 values. Keep float64 for any vector
  // that needs it: this is storage encoding, not another model quantisation.
  const bits = vector.every((value) => Object.is(Math.fround(value), value)) ? 32 : 64;
  const bytes = new Uint8Array(vector.length * (bits / 8));
  const view = new DataView(bytes.buffer);
  vector.forEach((value, index) => {
    if (bits === 32) view.setFloat32(index * 4, value, true);
    else view.setFloat64(index * 8, value, true);
  });
  return { value: JSON.stringify({ ...metadata, vectorBits: bits }), vector: Array.from(bytes) };
}
export function decodeEmbedding(row: {
  value: string;
  vector?: number[] | null;
  vectorHex?: string | null;
}): EmbeddingRecord {
  const { vectorBits, ...record } = JSON.parse(row.value);
  // Read the first development builds without deleting or re-downloading anything.
  if (row.vector == null && !row.vectorHex && Array.isArray(record.vector)) return record;
  if ((!row.vector && typeof row.vectorHex !== 'string') || ![32, 64].includes(vectorBits))
    throw new Error('Invalid cached recognition vector');
  const bytes = row.vector
      ? Uint8Array.from(row.vector)
      : Uint8Array.from(row.vectorHex!.match(/../g) ?? [], (hex) => parseInt(hex, 16)),
    stride = vectorBits / 8;
  if (bytes.length % stride) throw new Error('Incomplete cached recognition vector');
  const view = new DataView(bytes.buffer);
  return {
    ...record,
    vector: Array.from({ length: bytes.length / stride }, (_, i) =>
      vectorBits === 32 ? view.getFloat32(i * 4, true) : view.getFloat64(i * 8, true),
    ),
  };
}
