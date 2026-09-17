import { computerUrl } from '../native/platform';
import manifest from '../../config/generated/recognition-downloads.json';

interface Asset {
  url: string;
  bytes: number;
  downloadBytes: number;
  sha256: string;
}
const files: Record<string, Asset> = manifest.files;
export const recognitionDownloadInfo = manifest;
export const recognitionDownloadBytes = (path: string) => files[path].downloadBytes;

export async function fetchRecognitionAsset(path: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const asset = files[path];
  if (!asset) throw new Error('Recognition asset is missing from the download manifest.');
  // The decoded Cache API entry is the durable copy. Avoid a second HTTP-cache copy.
  let response: Response;
  try {
    response = await fetch(computerUrl(asset.url), { signal, cache: 'no-store' });
  } catch (error) {
    throw new Error('Recognition download failed; tap download to resume.', {
      cause: { asset: path, message: error instanceof Error ? error.message : String(error) },
    });
  }
  if (!response.ok)
    throw new Error('Recognition download failed; tap download to resume.', {
      cause: { asset: path, status: response.status },
    });
  let bytes = await response.arrayBuffer();
  const header = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
  // Usually an ordinary gzip file; also accept hosts that transparently HTTP-decode it.
  if (header[0] === 0x1f && header[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    bytes = await new Response(stream).arrayBuffer();
  }
  signal?.throwIfAborted();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  if (bytes.byteLength !== asset.bytes || hash !== asset.sha256)
    throw new Error('Recognition integrity check failed. Please retry the download.', {
      cause: { asset: path },
    });
  signal?.throwIfAborted();
  return new Response(bytes);
}
