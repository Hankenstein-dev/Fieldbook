import Dexie, { type EntityTable } from 'dexie';
import type { DiagnosticEvent, DiagnosticPhoto } from '../diagnostics/types';
import { encodeWebPhoto, decodeWebPhoto } from './webPhotos';
class DiagnosticsDB extends Dexie {
  events!: EntityTable<DiagnosticEvent, 'id'>;
  photos!: EntityTable<DiagnosticPhoto, 'id'>;
  constructor() {
    super('fieldbook-diagnostics');
    this.version(1).stores({ events: '&id, at, sent' });
    this.version(2).stores({ photos: '&id, at, sent' });
    this.photos.hook('reading', decodeWebPhoto);
  }
}
const db = new DiagnosticsDB();
export async function saveDiagnostic(event: DiagnosticEvent) {
  await db.transaction('rw', db.events, async () => {
    await db.events.put({ ...event, sent: 0 });
    const excess = (await db.events.count()) - 1000;
    if (excess > 0) {
      const keys = await db.events.orderBy('at').limit(excess).primaryKeys();
      await db.events.bulkDelete(keys);
    }
  });
}
export const readDiagnostics = () => db.events.orderBy('at').toArray();
export const pendingDiagnostics = () =>
  db.events
    .orderBy('at')
    .filter((e) => e.sent === 0)
    .limit(20)
    .toArray();
export const markDiagnosticsSent = (ids: string[]) =>
  db.events.where('id').anyOf(ids).modify({ sent: 1 });
export const readDiagnosticPhotos = (limit = 100) =>
  db.photos.orderBy('at').reverse().limit(limit).toArray();
export const diagnosticQueueCounts = async () => ({
  events: await db.events.where('sent').equals(0).count(),
  photos: await db.photos.where('sent').equals(0).count(),
});
export const pendingDiagnosticPhoto = () =>
  db.photos
    .orderBy('at')
    .filter((p) => p.sent === 0)
    .first();
export const markDiagnosticPhotoSent = (id: string) => db.photos.update(id, { sent: 1 });
export async function saveDiagnosticPhoto(value: DiagnosticPhoto) {
  if (value.photo.size > 8_000_000) throw new Error('Testing photo exceeds the 8 MB limit.');
  const encoded = await encodeWebPhoto(value);
  await db.transaction('rw', db.photos, async () => {
    await db.photos.put(encoded);
    const rows = await db.photos.orderBy('at').toArray();
    let bytes = rows.reduce((sum, row) => sum + row.photo.size, 0),
      count = rows.length;
    for (const row of rows) {
      if (count <= 100 && bytes <= 100_000_000) break;
      await db.photos.delete(row.id);
      bytes -= row.photo.size;
      count--;
    }
  });
}
