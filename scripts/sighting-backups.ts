import { mkdir, readFile, readdir, writeFile, link, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { safeBackupId, validSightingBackup } from '../src/backup/format.ts';

export async function sightingBackupRequest(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  directory: string,
) {
  const prefix = '/__fieldbook_debug/notebooks/';
  if (!path.startsWith(prefix)) return false;
  const reply = (status: number, value: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(value));
    return true;
  };
  const [device, id, extra] = path.slice(prefix.length).split('/');
  if (!safeBackupId(device) || (id !== undefined && !safeBackupId(id)) || extra !== undefined)
    return reply(400, { error: 'Invalid backup ID' });
  const folder = resolve(directory, 'notebooks', device);
  if (req.method === 'GET' && id === undefined) {
    const files = await readdir(folder).catch((e: NodeJS.ErrnoException) => {
      if (e.code === 'ENOENT') return [];
      throw e;
    });
    return reply(200, {
      ids: files.filter((name) => name.endsWith('.json')).map((name) => name.slice(0, -5)),
      retracted: files
        .filter((name) => name.endsWith('.retracted'))
        .map((name) => name.slice(0, -10)),
    });
  }
  if (!id) return reply(405, { error: 'Sighting ID required' });
  const file = resolve(folder, `${id}.json`);
  if (req.method === 'GET') {
    try {
      const original = JSON.parse(await readFile(file, 'utf8'));
      const correction = await readFile(resolve(folder, `${id}.retracted`), 'utf8').catch(
        (e: NodeJS.ErrnoException) => {
          if (e.code === 'ENOENT') return null;
          throw e;
        },
      );
      return reply(200, { ...original, ...(correction ? JSON.parse(correction) : {}) });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        return reply(404, { error: 'Backup not found' });
      throw error;
    }
  }
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (!req.headers['content-type']?.startsWith('application/json'))
    return reply(415, { error: 'JSON required' });
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 12_000_000) return reply(413, { error: 'Sighting backup too large' });
    chunks.push(Buffer.from(chunk));
  }
  let sighting: unknown;
  try {
    sighting = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return reply(400, { error: 'Invalid JSON' });
  }
  if (!validSightingBackup(sighting) || sighting.id !== id)
    return reply(400, { error: 'Invalid sighting backup' });
  await mkdir(folder, { recursive: true });
  const temp = resolve(folder, `${randomUUID()}.tmp`);
  try {
    await writeFile(temp, JSON.stringify(sighting), { mode: 0o600 });
    // Atomic, append-only: retries and an empty/reset phone cannot erase a backup.
    try {
      await link(temp, file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  } finally {
    await rm(temp, { force: true });
  }
  if (sighting.retractedAt) {
    // Preserve the original photo/result; append the correction separately.
    await writeFile(
      resolve(folder, `${id}.retracted`),
      JSON.stringify({ retractedAt: sighting.retractedAt }),
      { flag: 'wx', mode: 0o600 },
    ).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== 'EEXIST') throw e;
    });
  }
  return reply(200, { accepted: id });
}
