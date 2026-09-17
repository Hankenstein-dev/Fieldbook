import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { readPrivateFile, writePrivateFile, removePrivateFile } from './nativeFiles';
export const tables = [
  'species',
  'seasons',
  'embeddings',
  'ranges',
  'queries',
  'sightings',
  'visitedCells',
  'settings',
  'tiles',
  'events',
  'photos',
] as const;
export type TableName = (typeof tables)[number];
const notebookTables = new Set<TableName>(['sightings', 'visitedCells', 'settings']);
let connection: Promise<{ notebook: SQLiteDBConnection; cache: SQLiteDBConnection }> | undefined;
export async function database(table: TableName = 'sightings') {
  connection ??= (async () => {
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    // JS can reload while Android retains the old native connections.
    await sqlite.checkConnectionsConsistency();
    const notebook = await sqlite.createConnection('fieldbook', false, 'no-encryption', 1, false);
    const cache = await sqlite.createConnection(
      'fieldbook-cache',
      false,
      'no-encryption',
      1,
      false,
    );
    await notebook.open();
    await cache.open();
    for (const [db, names] of [
      [notebook, tables.filter((t) => notebookTables.has(t))],
      [cache, tables.filter((t) => !notebookTables.has(t))],
    ] as const) {
      await db.execute(
        names
          .map(
            (name) =>
              `CREATE TABLE IF NOT EXISTS ${name} (id TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
          )
          .join('\n'),
      );
    }
    const columns = await cache.query('PRAGMA table_info(embeddings)');
    if (!columns.values?.some((column) => column.name === 'vector'))
      await cache.execute('ALTER TABLE embeddings ADD COLUMN vector BLOB;');
    return { notebook, cache };
  })().catch((error) => {
    connection = undefined;
    throw error;
  });
  const db = await connection;
  return notebookTables.has(table) ? db.notebook : db.cache;
}
let writes: Promise<unknown> = Promise.resolve();
export function serial<T>(work: () => Promise<T>): Promise<T> {
  const result = writes.then(work);
  writes = result.catch(() => undefined);
  return result;
}
export function changed() {
  window.dispatchEvent(new Event('fieldbook-collection-change'));
}
// Photos are immutable files. Commit their path only after a complete write.
export async function encodeRecord(value: unknown) {
  const record = { ...(value as Record<string, unknown>) };
  if (record.photo instanceof Blob) {
    const path = `photos/${crypto.randomUUID()}.jpg`;
    await writePrivateFile(path, record.photo);
    record.photo = { nativeFile: path, type: record.photo.type };
  }
  if (record.data instanceof ArrayBuffer) {
    const bytes = new Uint8Array(record.data);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    record.data = { base64: btoa(binary) };
  }
  return JSON.stringify(record);
}
const missingPhotos = new Set<string>();
export async function decodeRecord<T>(json: string): Promise<T> {
  const record = JSON.parse(json);
  if (record.photo?.nativeFile) {
    const path = record.photo.nativeFile;
    try {
      record.photo = await readPrivateFile(path, record.photo.type);
    } catch {
      // A missing attachment must not hide otherwise intact notebook records.
      record.photo = undefined;
      if (!missingPhotos.has(path)) {
        missingPhotos.add(path);
        window.dispatchEvent(new CustomEvent('fieldbook-photo-missing', { detail: { path } }));
      }
    }
  }
  if (record.data?.base64)
    record.data = Uint8Array.from(atob(record.data.base64), (c) => c.charCodeAt(0)).buffer;
  return record;
}
export async function rows(table: TableName, suffix = '', values: (string | number)[] = []) {
  const result = await (
    await database(table)
  ).query(`SELECT id, value FROM ${table} ${suffix}`, values);
  return (result.values ?? []) as { id: string; value: string }[];
}
export async function get<T>(table: TableName, id: string | number) {
  const [row] = await rows(table, 'WHERE id = ?', [String(id)]);
  return row ? decodeRecord<T>(row.value) : undefined;
}
export async function all<T>(table: TableName) {
  return Promise.all((await rows(table)).map((row) => decodeRecord<T>(row.value)));
}
export async function put(table: TableName, id: string | number, value: unknown, add = false) {
  const encoded = await encodeRecord(value);
  try {
    await (
      await database(table)
    ).run(`INSERT ${add ? '' : 'OR REPLACE '}INTO ${table} (id,value) VALUES (?,?)`, [
      String(id),
      encoded,
    ]);
  } catch (error) {
    const photo = JSON.parse(encoded).photo;
    if (photo?.nativeFile) await removePrivateFile(photo.nativeFile).catch(() => undefined);
    throw error;
  }
  if (table === 'species' || table === 'visitedCells') changed();
}
export async function bulkPut(
  table: TableName,
  records: { id: string | number; value: unknown }[],
) {
  for (let offset = 0; offset < records.length; offset += 100) {
    const set = await Promise.all(
      records.slice(offset, offset + 100).map(async (r) => ({
        statement: `INSERT OR REPLACE INTO ${table} (id,value) VALUES (?,?)`,
        values: [String(r.id), await encodeRecord(r.value)],
      })),
    );
    await (await database(table)).executeSet(set, true);
  }
  if (table === 'species' || table === 'visitedCells') changed();
}
export async function remove(table: TableName, id: string) {
  const [row] = await rows(table, 'WHERE id = ?', [id]);
  await (await database(table)).run(`DELETE FROM ${table} WHERE id = ?`, [id]);
  const photo = row && JSON.parse(row.value).photo;
  if (photo?.nativeFile) await removePrivateFile(photo.nativeFile).catch(() => undefined);
}
