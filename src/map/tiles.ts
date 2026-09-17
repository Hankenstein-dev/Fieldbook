import { computerUrl } from '../native/platform';
import { PMTiles } from 'pmtiles';
import { mapConfig } from '../../config/app';
import { readTile, saveTile } from '../store';
import { intersects, tileBounds } from './geometry';

const archives = new Map<string, PMTiles>();
const memory = new Map<string, ArrayBuffer>();
const pending = new Map<string, Promise<ArrayBuffer | undefined>>();
export async function vectorTile(
  z: number,
  x: number,
  y: number,
): Promise<ArrayBuffer | undefined> {
  const key = `${mapConfig.source}:${z}/${x}/${y}`;
  const existing = memory.get(key);
  if (existing) return existing;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const request = (async () => {
    const cached = await readTile(key).catch(() => undefined);
    if (cached) {
      remember(key, cached);
      return cached;
    }
    const bounds = tileBounds(z, x, y);
    for (const archive of mapConfig.archives.filter((a) => intersects(bounds, a.bounds))) {
      let pm = archives.get(archive.url);
      if (!pm) {
        pm = new PMTiles(new URL(computerUrl(archive.url), window.location.origin).href);
        archives.set(archive.url, pm);
      }
      const result = await pm.getZxy(z, x, y);
      if (result) {
        remember(key, result.data);
        void saveTile(key, result.data).catch(() =>
          window.dispatchEvent(new Event('fieldbook-cache-full')),
        );
        return result.data;
      }
    }
    return undefined;
  })().finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
function remember(key: string, data: ArrayBuffer) {
  memory.set(key, data);
  if (memory.size > 160) memory.delete(memory.keys().next().value!);
}
