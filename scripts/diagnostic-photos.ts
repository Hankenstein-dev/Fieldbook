import { mkdir, readFile, readdir, writeFile, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

interface PhotoMetadata {
  id: string;
  session: string;
  at: string;
  filename: string;
  bytes: number;
}
const safeId = (value: unknown): value is string =>
  typeof value === 'string' && /^[\w-]{1,80}$/.test(value);
export async function photoRequest(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  directory: string,
): Promise<boolean> {
  if (!path.startsWith('/__fieldbook_debug/photos')) return false;
  const folder = resolve(directory, 'photos');
  const reply = (code: number, value: unknown) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(value));
    return true;
  };
  if (req.method === 'GET' && path === '/__fieldbook_debug/photos') {
    const names = await readdir(folder).catch((e: NodeJS.ErrnoException) => {
      if (e.code === 'ENOENT') return [];
      throw e;
    });
    const photos: PhotoMetadata[] = [];
    for (const name of names.filter((n) => n.endsWith('.json')))
      photos.push(JSON.parse(await readFile(resolve(folder, name), 'utf8')));
    return reply(200, photos.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100));
  }
  const id = path.slice('/__fieldbook_debug/photos/'.length);
  if (!safeId(id)) return reply(400, { error: 'Invalid photo ID' });
  if (req.method === 'GET') {
    try {
      const bytes = await readFile(resolve(folder, `${id}.jpg`));
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.end(bytes);
      return true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT')
        return reply(404, { error: 'Photo not received' });
      throw e;
    }
  }
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  if (req.headers['content-type'] !== 'image/jpeg') return reply(415, { error: 'JPEG required' });
  let metadata: PhotoMetadata;
  try {
    metadata = JSON.parse(decodeURIComponent(String(req.headers['x-fieldbook-photo'])));
  } catch {
    return reply(400, { error: 'Invalid photo metadata' });
  }
  if (
    !metadata ||
    metadata.id !== id ||
    !safeId(metadata.session) ||
    typeof metadata.filename !== 'string' ||
    metadata.filename.length > 255 ||
    typeof metadata.at !== 'string' ||
    metadata.at.length > 40 ||
    !Number.isFinite(Date.parse(metadata.at))
  )
    return reply(400, { error: 'Invalid photo metadata' });
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8_000_000) return reply(413, { error: 'Photo exceeds 8 MB' });
    chunks.push(Buffer.from(chunk));
  }
  const bytes = Buffer.concat(chunks);
  if (
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[bytes.length - 2] !== 0xff ||
    bytes[bytes.length - 1] !== 0xd9
  )
    return reply(400, { error: 'Invalid JPEG' });
  await mkdir(folder, { recursive: true });
  const temp = resolve(folder, `${id}-${randomUUID()}.tmp`);
  try {
    await writeFile(temp, bytes);
    await rename(temp, resolve(folder, `${id}.jpg`));
    const { session, at, filename } = metadata;
    await writeFile(temp, JSON.stringify({ id, session, at, filename, bytes: size }, null, 2));
    await rename(temp, resolve(folder, `${id}.json`));
  } finally {
    await rm(temp, { force: true });
  }
  return reply(200, { accepted: id });
}
