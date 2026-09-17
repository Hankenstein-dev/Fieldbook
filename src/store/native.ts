import { encodeEmbedding, decodeEmbedding } from './nativeEmbeddings';
import type {
  CandidateSet,
  Settings,
  Sighting,
  VisitedCell,
  Species,
  SeasonRecord,
  EmbeddingRecord,
  RangeSet,
} from '../types';
import { all, get, put, bulkPut, rows, remove, serial, database } from './nativeDatabase';
export const getQuery = (key: string) => get<CandidateSet>('queries', key);
export async function saveQuery(value: CandidateSet) {
  await saveSpecies(value.candidates.map((c) => c.species));
  await put('queries', value.key, value);
  return value.key;
}
export const getSightings = async () =>
  (await all<Sighting>('sightings'))
    .filter((s) => !s.retractedAt)
    .sort((a, b) => b.timestamp - a.timestamp);
export const retractSighting = (id: string) =>
  serial(async () => {
    const [row] = await rows('sightings', 'WHERE id = ?', [id]);
    if (row) await put('sightings', id, { ...JSON.parse(row.value), retractedAt: Date.now() });
  });
export const getRetractions = async () =>
  (await rows('sightings'))
    .map((row) => JSON.parse(row.value) as Sighting)
    .filter((s) => s.retractedAt)
    .map((s) => s.id);
export async function saveSighting(value: Sighting) {
  await put('sightings', value.id, value, true);
  return value.id;
}
export const sightingIds = async () => (await rows('sightings')).map((row) => row.id);
export const getSighting = (id: string) => get<Sighting>('sightings', id);
export const restoreSighting = (value: Sighting) =>
  serial(async () => {
    const existing = await getSighting(value.id);
    if (!existing) await put('sightings', value.id, value, true);
    else if (value.retractedAt && !existing.retractedAt) {
      const [row] = await rows('sightings', 'WHERE id = ?', [value.id]);
      await put('sightings', value.id, {
        ...JSON.parse(row.value),
        retractedAt: value.retractedAt,
      });
    } else if (!existing.photo && value.photo)
      await put('sightings', value.id, { ...existing, photo: value.photo });
  });
export const getSettings = () => get<Settings>('settings', 'preferences');
export async function saveSettings(value: Settings) {
  await put('settings', value.id, value);
  return value.id;
}
export const visitCell = (cell: string, taxonIds: number[]) =>
  serial(async () => {
    const old = await get<VisitedCell>('visitedCells', cell),
      time = Date.now();
    await put('visitedCells', cell, {
      cell,
      firstVisitedAt: old?.firstVisitedAt ?? time,
      lastVisitedAt: time,
      taxonIds: [...new Set([...(old?.taxonIds ?? []), ...taxonIds])],
    });
  });
interface Tile {
  key: string;
  data: ArrayBuffer;
  savedAt: number;
  bytes: number;
}
export const readTile = async (key: string) => (await get<Tile>('tiles', key))?.data;
let writes = 0;
export const saveTile = (key: string, data: ArrayBuffer) =>
  serial(async () => {
    await put('tiles', key, { key, data, savedAt: Date.now(), bytes: data.byteLength });
    if (++writes % 40 === 0) {
      const records = (await rows('tiles'))
        .map((row) => ({ id: row.id, ...JSON.parse(row.value) }))
        .sort((a, b) => a.savedAt - b.savedAt);
      let bytes = records.reduce((n, t) => n + t.bytes, 0);
      for (const row of records) {
        if (bytes < 96 * 1024 * 1024) break;
        await remove('tiles', row.id);
        bytes -= row.bytes;
      }
    }
  });
export const getVisitedCells = () => all<VisitedCell>('visitedCells');
export const getStoredSpecies = () => all<Species>('species');
export async function saveSpecies(species: Species[]) {
  await bulkPut(
    'species',
    species.map((value) => ({ id: value.id, value })),
  );
}
export const getSeason = (key: string) => get<SeasonRecord>('seasons', key);
export async function saveSeason(record: SeasonRecord) {
  await put('seasons', record.key, record);
  return record.key;
}
export const getEmbedding = async (key: string) => (await getEmbeddings([key]))[0];
export async function saveEmbedding(record: EmbeddingRecord) {
  await saveEmbeddings([record]);
  return record.key;
}
export async function getRange(key: string): Promise<RangeSet | undefined> {
  const saved = await get<Omit<RangeSet, 'species'> & { speciesIds: number[] }>('ranges', key);
  if (!saved) return undefined;
  const ids = new Set(saved.speciesIds);
  const { speciesIds: _, ...metadata } = saved;
  // Read the requested area's species, not every national reference/photograph.
  const selected = await rows('species', 'WHERE id IN (SELECT value FROM json_each(?))', [
    JSON.stringify([...ids].map(String)),
  ]);
  return { ...metadata, species: selected.map((row) => JSON.parse(row.value) as Species) };
}
export async function saveRange(record: RangeSet) {
  await saveSpecies(record.species);
  await put('ranges', record.key, {
    key: record.key,
    fetchedAt: record.fetchedAt,
    complete: record.complete,
    referencePack: record.referencePack,
    speciesIds: record.species.map((s) => s.id),
  });
  return record.key;
}
export async function getEmbeddings(keys: string[]) {
  const found = new Map<string, EmbeddingRecord>();
  for (let i = 0; i < keys.length; i += 50) {
    const chunk = keys.slice(i, i + 50);
    const result = await (
      await database('embeddings')
    ).query(
      `SELECT id, value, hex(vector) AS vectorHex FROM embeddings WHERE id IN (${chunk.map(() => '?').join(',')})`,
      chunk,
    );
    for (const row of result.values ?? []) found.set(row.id, decodeEmbedding(row));
  }
  return keys.map((key) => found.get(key));
}
export async function saveEmbeddings(records: EmbeddingRecord[]) {
  const db = await database('embeddings');
  for (let offset = 0; offset < records.length; offset += 100) {
    await db.executeSet(
      records.slice(offset, offset + 100).map((record) => {
        const encoded = encodeEmbedding(record);
        return {
          statement: 'INSERT OR REPLACE INTO embeddings (id,value,vector) VALUES (?,?,unhex(?))',
          values: [
            record.key,
            encoded.value,
            encoded.vector.map((byte) => byte.toString(16).padStart(2, '0')).join(''),
          ],
        };
      }),
      true,
    );
  }
}
export const getSeasonsForCell = async (cell: string) =>
  (await all<SeasonRecord>('seasons')).filter((row) => row.cell === cell);
export function watchCollection(
  next: (value: { species: Species[]; visits: VisitedCell[] }) => void,
  error: (e: unknown) => void,
) {
  let stopped = false,
    timer: ReturnType<typeof setTimeout>;
  const update = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      void Promise.all([getStoredSpecies(), getVisitedCells()])
        .then(([species, visits]) => {
          if (!stopped) next({ species, visits });
        })
        .catch(error);
    }, 50);
  };
  window.addEventListener('fieldbook-collection-change', update);
  update();
  return () => {
    stopped = true;
    clearTimeout(timer);
    window.removeEventListener('fieldbook-collection-change', update);
  };
}
export const searchStoredSpecies = async (query: string) => {
  const q = query.trim().toLocaleLowerCase();
  return (await getStoredSpecies())
    .filter((s) =>
      [s.commonName, s.scientificName, ...s.alternativeNames].some((n) =>
        n.toLocaleLowerCase().includes(q),
      ),
    )
    .slice(0, 30);
};
export async function storageStats() {
  const tiles = (await rows('tiles')).map((row) => JSON.parse(row.value));
  return {
    cells: (await getVisitedCells()).length,
    tiles: tiles.length,
    mapBytes: tiles.reduce((n, t) => n + t.bytes, 0) as number,
  };
}
export async function exportNotebook() {
  const visitedCells = await getVisitedCells(),
    ids = new Set(visitedCells.flatMap((v) => v.taxonIds));
  return {
    species: (await getStoredSpecies()).filter((s) => ids.has(s.id)),
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    visitedCells,
    preferences: await getSettings(),
    sightings: await Promise.all(
      (await all<Sighting>('sightings')).map(async (s) => ({
        ...s,
        photo: s.photo
          ? {
              type: s.photo.type,
              data: await new Promise<string>((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(String(r.result));
                r.onerror = () => reject(r.error);
                r.readAsDataURL(s.photo!);
              }),
            }
          : undefined,
      })),
    ),
  };
}
export const restoreVisit = (value: VisitedCell) =>
  serial(async () => {
    const old = await get<VisitedCell>('visitedCells', value.cell);
    await put('visitedCells', value.cell, {
      ...value,
      firstVisitedAt: Math.min(old?.firstVisitedAt ?? value.firstVisitedAt, value.firstVisitedAt),
      lastVisitedAt: Math.max(old?.lastVisitedAt ?? value.lastVisitedAt, value.lastVisitedAt),
      taxonIds: [...new Set([...(old?.taxonIds ?? []), ...value.taxonIds])],
    });
  });
