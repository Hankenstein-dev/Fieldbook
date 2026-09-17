// Some WebKit builds reject Blob writes to IndexedDB. Store the exact binary
// bytes and reconstruct a Blob on reads. Existing Blob records remain readable.
// Keep this representation inside the browser store; exports and native storage
// continue to use the existing photo format.
type PhotoRecord = { photo?: Blob; photoBytes?: ArrayBuffer; photoType?: string };
export async function encodeWebPhoto<T extends { photo?: Blob }>(
  record: T,
): Promise<T & PhotoRecord> {
  if (!record.photo) return record;
  return {
    ...record,
    photo: undefined,
    photoBytes: await record.photo.arrayBuffer(),
    photoType: record.photo.type,
  };
}
export function decodeWebPhoto<T extends PhotoRecord>(record: T): T {
  if (!record || !(record.photoBytes instanceof ArrayBuffer)) return record;
  const { photoBytes, photoType, ...metadata } = record;
  return { ...metadata, photo: new Blob([photoBytes], { type: photoType || 'image/jpeg' }) } as T;
}
