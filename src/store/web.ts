import Dexie, { liveQuery, type EntityTable } from 'dexie';
import { keepSightingSafety, readSightingSafety } from './sightingSafety';
import { protectionState } from './storageProtection';
import { encodeWebPhoto, decodeWebPhoto } from './webPhotos';
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
interface TileRecord {
  key: string;
  data: ArrayBuffer;
  savedAt: number;
  bytes: number;
}
export class FieldbookDB extends Dexie {
  species!: EntityTable<Species, 'id'>;
  seasons!: EntityTable<SeasonRecord, 'key'>;
  embeddings!: EntityTable<EmbeddingRecord, 'key'>;
  ranges!: EntityTable<RangeSet, 'key'>;
  queries!: EntityTable<CandidateSet, 'key'>;
  sightings!: EntityTable<Sighting, 'id'>;
  visitedCells!: EntityTable<VisitedCell, 'cell'>;
  settings!: EntityTable<Settings, 'id'>;
  tiles!: EntityTable<TileRecord, 'key'>;
  constructor(name = 'fieldbook') {
    super(name);
    this.version(1).stores({
      queries: '&key, cell, fetchedAt',
      sightings: '&id, taxonId, timestamp, cell',
      visitedCells: '&cell, lastVisitedAt',
      settings: '&id',
      tiles: '&key, savedAt',
    });
    this.version(2)
      .stores({
        species: '&id, group',
        seasons: '&key, taxonId, cell',
        embeddings: '&key, model, taxonId',
        ranges: '&key, fetchedAt',
      })
      .upgrade(async (tx) => {
        const records = new Map<number, Species>();
        for (const query of await tx.table('queries').toArray())
          for (const candidate of query.candidates)
            records.set(candidate.species.id, candidate.species);
        for (const sighting of await tx.table('sightings').toArray())
          records.set(sighting.species.id, sighting.species);
        await tx.table('species').bulkPut([...records.values()]);
      });
    this.sightings.hook('reading', decodeWebPhoto);
  }
}
export const db = new FieldbookDB();
export const getQuery = (key: string) => db.queries.get(key);
export async function saveQuery(value: CandidateSet) {
  return db.transaction('rw', db.queries, db.species, async () => {
    await db.species.bulkPut(value.candidates.map((c) => c.species));
    return db.queries.put(value);
  });
}
let recovery: Promise<void> | undefined;
async function recoverSightings() {
  recovery ??= (async () => {
    const saved = readSightingSafety();
    await db.transaction('rw', db.sightings, async () => {
      for (const sighting of saved) {
        if (!(await db.sightings.get(sighting.id))) {
          await db.sightings.add(sighting);
          protectionState.recovered++;
        }
      }
    });
  })().catch((error) => {
    recovery = undefined;
    throw error;
  });
  return recovery;
}
export async function getSightings() {
  await recoverSightings();
  const rows = await db.sightings.orderBy('timestamp').reverse().toArray();
  keepSightingSafety(rows);
  return rows.filter((s) => !s.retractedAt);
}
export async function retractSighting(id: string) {
  await db.sightings.update(id, { retractedAt: Date.now() });
  const row = await db.sightings.get(id);
  if (row) keepSightingSafety([row]);
}
export const getRetractions = async () =>
  (await db.sightings.filter((s) => !!s.retractedAt).toArray()).map((s) => s.id);
export async function saveSighting(value: Sighting) {
  const id = await db.sightings.add(await encodeWebPhoto(value));
  keepSightingSafety([value]);
  return id;
}
export const sightingIds = () => db.sightings.toCollection().primaryKeys();
export const getSighting = (id: string) => db.sightings.get(id);
export async function restoreSighting(value: Sighting) {
  const encoded = await encodeWebPhoto(value);
  await db.transaction('rw', db.sightings, async () => {
    const existing = await db.sightings.get(value.id);
    if (!existing) await db.sightings.add(encoded);
    else if (value.retractedAt && !existing.retractedAt)
      await db.sightings.update(value.id, { retractedAt: value.retractedAt });
    else if (!existing.photo && value.photo) {
      const restored = {
        ...existing,
        photo: encoded.photo,
        photoBytes: encoded.photoBytes,
        photoType: encoded.photoType,
      };
      await db.sightings.put(restored);
    }
  });
  const restored = await db.sightings.get(value.id);
  if (restored) keepSightingSafety([restored]);
}
export const getSettings = () => db.settings.get('preferences');
export const saveSettings = (value: Settings) => db.settings.put(value);
export async function visitCell(cell: string, taxonIds: number[]) {
  await db.transaction('rw', db.visitedCells, async () => {
    const old = await db.visitedCells.get(cell),
      time = Date.now();
    await db.visitedCells.put({
      cell,
      firstVisitedAt: old?.firstVisitedAt ?? time,
      lastVisitedAt: time,
      taxonIds: [...new Set([...(old?.taxonIds ?? []), ...taxonIds])],
    });
  });
}
export const readTile = async (key: string) => (await db.tiles.get(key))?.data;
let writes = 0;
export async function saveTile(key: string, data: ArrayBuffer) {
  await db.tiles.put({ key, data, savedAt: Date.now(), bytes: data.byteLength });
  if (++writes % 40 === 0) {
    const rows = await db.tiles.orderBy('savedAt').toArray();
    let bytes = rows.reduce((sum, row) => sum + row.bytes, 0);
    const remove: string[] = [];
    for (const row of rows) {
      if (bytes < 96 * 1024 * 1024) break;
      remove.push(row.key);
      bytes -= row.bytes;
    }
    if (remove.length) await db.tiles.bulkDelete(remove);
  }
}
export async function exportNotebook() {
  const visits = await db.visitedCells.toArray(),
    ids = new Set(visits.flatMap((v) => v.taxonIds));
  return {
    species: (await getStoredSpecies()).filter((s) => ids.has(s.id)),
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    sightings: await Promise.all(
      (await db.sightings.orderBy('timestamp').reverse().toArray()).map(async (s) => ({
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
    visitedCells: visits,
    preferences: await getSettings(),
  };
}
export async function storageStats() {
  const tiles = await db.tiles.toArray();
  return {
    cells: await db.visitedCells.count(),
    tiles: tiles.length,
    mapBytes: tiles.reduce((n, t) => n + t.bytes, 0),
  };
}

export const getVisitedCells = () => db.visitedCells.toArray();
export const getStoredSpecies = () => db.species.toArray();
export const saveSpecies = (species: Species[]) => db.species.bulkPut(species);
export const getSeason = (key: string) => db.seasons.get(key);
export const saveSeason = (record: SeasonRecord) => db.seasons.put(record);
export const getEmbedding = (key: string) => db.embeddings.get(key);
export const saveEmbedding = (record: EmbeddingRecord) => db.embeddings.put(record);
export const getRange = (key: string) => db.ranges.get(key);
export async function saveRange(record: RangeSet) {
  await saveSpecies(record.species);
  return db.ranges.put(record);
}

export const getEmbeddings = (keys: string[]) => db.embeddings.bulkGet(keys);
export const saveEmbeddings = (records: EmbeddingRecord[]) => db.embeddings.bulkPut(records);
export const getSeasonsForCell = (cell: string) => db.seasons.where('cell').equals(cell).toArray();
export function watchCollection(
  next: (value: { species: Species[]; visits: VisitedCell[] }) => void,
  error: (e: unknown) => void,
) {
  const sub = liveQuery(async () => ({
    species: await getStoredSpecies(),
    visits: await getVisitedCells(),
  })).subscribe({ next, error });
  return () => sub.unsubscribe();
}

export const searchStoredSpecies = (query: string) => {
  const q = query.trim().toLocaleLowerCase();
  return db.species
    .filter((s) =>
      [s.commonName, s.scientificName, ...s.alternativeNames].some((n) =>
        n.toLocaleLowerCase().includes(q),
      ),
    )
    .limit(30)
    .toArray();
};

export async function restoreVisit(value: VisitedCell) {
  await db.transaction('rw', db.visitedCells, async () => {
    const old = await db.visitedCells.get(value.cell);
    await db.visitedCells.put({
      ...value,
      firstVisitedAt: Math.min(old?.firstVisitedAt ?? value.firstVisitedAt, value.firstVisitedAt),
      lastVisitedAt: Math.max(old?.lastVisitedAt ?? value.lastVisitedAt, value.lastVisitedAt),
      taxonIds: [...new Set([...(old?.taxonIds ?? []), ...value.taxonIds])],
    });
  });
}
