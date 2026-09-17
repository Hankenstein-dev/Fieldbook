import type { DiagnosticEvent, DiagnosticPhoto } from '../diagnostics/types';
import { all, get, put, rows, remove, database, serial } from './nativeDatabase';
export const saveDiagnostic = (event: DiagnosticEvent) =>
  serial(async () => {
    await put('events', event.id, { ...event, sent: 0 });
    const records = await readDiagnostics();
    for (const row of records.slice(0, Math.max(0, records.length - 1000)))
      await remove('events', row.id);
  });
export const readDiagnostics = async () =>
  (await all<DiagnosticEvent>('events')).sort((a, b) => a.at.localeCompare(b.at));
export const pendingDiagnostics = async () =>
  (await readDiagnostics()).filter((e) => e.sent === 0).slice(0, 20);
export async function markDiagnosticsSent(ids: string[]) {
  for (const id of ids)
    await (
      await database('events')
    ).run("UPDATE events SET value = json_set(value, '$.sent', 1) WHERE id = ?", [id]);
}
export const readDiagnosticPhotos = async (limit = 100) => {
  const recent = (await rows('photos'))
    .map((r) => ({ id: r.id, at: JSON.parse(r.value).at as string }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
  return (await Promise.all(recent.map((r) => get<DiagnosticPhoto>('photos', r.id)))).filter(
    (p): p is DiagnosticPhoto => !!p?.photo,
  );
};
export async function diagnosticQueueCounts() {
  const pending = async (table: 'events' | 'photos') =>
    (await rows(table)).filter((r) => JSON.parse(r.value).sent === 0).length;
  return { events: await pending('events'), photos: await pending('photos') };
}
export async function pendingDiagnosticPhoto() {
  const record = (await rows('photos'))
    .map((r) => JSON.parse(r.value))
    .filter((r) => r.sent === 0)
    .sort((a, b) => a.at.localeCompare(b.at))[0];
  if (!record) return undefined;
  const { get } = await import('./nativeDatabase');
  return get<DiagnosticPhoto>('photos', record.id);
}
export const markDiagnosticPhotoSent = async (id: string) => {
  await (
    await database('photos')
  ).run("UPDATE photos SET value = json_set(value, '$.sent', 1) WHERE id = ?", [id]);
};
export const saveDiagnosticPhoto = (value: DiagnosticPhoto) =>
  serial(async () => {
    if (value.photo.size > 8_000_000) throw new Error('Testing photo exceeds the 8 MB limit.');
    await put('photos', value.id, { ...value, bytes: value.photo.size });
    const records = (await rows('photos'))
      .map((r) => JSON.parse(r.value))
      .sort((a, b) => a.at.localeCompare(b.at));
    let bytes = records.reduce((n, r) => n + r.bytes, 0),
      count = records.length;
    for (const row of records) {
      if (count <= 100 && bytes <= 100_000_000) break;
      await remove('photos', row.id);
      bytes -= row.bytes;
      count--;
    }
  });
