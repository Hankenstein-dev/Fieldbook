import { Filesystem, Directory } from '@capacitor/filesystem';
import { nativeAndroid } from '../native/platform';
import { privateUrl, writePrivateFile } from './nativeFiles';
import { identificationConfig } from '../../config/identification';
const directory = `recognition/${identificationConfig.id}`;
let workerRoot: string | undefined;
export function setWorkerAssetRoot(root?: string) {
  workerRoot = root;
}
export async function nativeAssetRoot() {
  return nativeAndroid ? privateUrl(directory) : undefined;
}
const filename = (path: string) => path.replaceAll('/', '_');
export async function assetCache(name: string): Promise<Pick<Cache, 'match' | 'put'>> {
  if (!nativeAndroid && !workerRoot) return caches.open(name);
  return {
    async match(request) {
      const path =
        typeof request === 'string' ? request : request instanceof URL ? request.href : request.url;
      const file = `${directory}/${filename(path)}`;
      if (!workerRoot) {
        try {
          await Filesystem.stat({ directory: Directory.Data, path: file });
        } catch {
          return undefined;
        }
      }
      const url = workerRoot ? `${workerRoot}/${filename(path)}` : await privateUrl(file);
      // Inventory checks must not read hundreds of MB. Open the file only when its
      // response body is consumed; use no HTTP cache beside the durable native file.
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      return new Response(
        new ReadableStream<Uint8Array>(
          {
            async pull(controller) {
              try {
                if (!reader) {
                  const response = await fetch(url, { cache: 'no-store' });
                  if (!response.ok || !response.body)
                    throw new Error('Saved recognition file is unavailable. Download to resume.');
                  reader = response.body.getReader();
                }
                const next = await reader.read();
                if (next.done) controller.close();
                else controller.enqueue(next.value);
              } catch (error) {
                controller.error(error);
              }
            },
            async cancel() {
              await reader?.cancel();
            },
          },
          { highWaterMark: 0 },
        ),
      );
    },
    async put(request, response) {
      const path =
        typeof request === 'string' ? request : request instanceof URL ? request.href : request.url;
      const file = `${directory}/${filename(path)}`,
        temporary = `${file}.partial`;
      await writePrivateFile(temporary, await response.blob());
      await Filesystem.rename({ directory: Directory.Data, from: temporary, to: file });
    },
  };
}
