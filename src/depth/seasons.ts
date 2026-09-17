import type { Point, SeasonRecord } from '../types';
import { cellCentre, cellFor, coveredRadius } from '../species/geo';
import { request } from '../species/client';
import { getSeason, saveSeason } from '../store';
const pending = new Map<string, Promise<SeasonRecord>>();
export { seasonSummary } from './summary';
export async function seasonalRecords(
  taxonId: number,
  point: Point,
): Promise<{ data: SeasonRecord; stale: boolean }> {
  const cell = cellFor(point),
    key = `${taxonId}:${cell}`,
    saved = await getSeason(key).catch(() => undefined);
  const stale = !saved || Date.now() - saved.fetchedAt > 30 * 86400000;
  if (saved && (!stale || !navigator.onLine)) return { data: saved, stale };
  let task = pending.get(key);
  if (!task) {
    task = (async () => {
      const centre = cellCentre(cell),
        radius = Math.max(25, coveredRadius(cell));
      const r = await request<{ results: { month_of_year: Record<string, number> } }>(
        '/observations/histogram',
        {
          taxon_id: taxonId,
          lat: centre.lat,
          lng: centre.lng,
          radius,
          interval: 'month_of_year',
          date_field: 'observed',
        },
      );
      const data = {
        key,
        taxonId,
        cell,
        radius,
        months: Array.from({ length: 12 }, (_, i) => r.results.month_of_year[String(i + 1)] ?? 0),
        fetchedAt: Date.now(),
      };
      await saveSeason(data);
      return data;
    })().finally(() => pending.delete(key));
    pending.set(key, task);
  }
  try {
    return { data: await task, stale: false };
  } catch (error) {
    if (saved) return { data: saved, stale: true };
    throw error;
  }
}
