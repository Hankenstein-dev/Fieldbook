import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
export async function writePrivateFile(path: string, blob: Blob) {
  // Bound bridge messages; never base64-encode an entire model in one allocation.
  const chunk = 512 * 1024;
  for (let offset = 0; offset < Math.max(blob.size, 1); offset += chunk) {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob.slice(offset, offset + chunk));
    });
    if (offset === 0)
      await Filesystem.writeFile({ directory: Directory.Data, path, data, recursive: true });
    else await Filesystem.appendFile({ directory: Directory.Data, path, data });
  }
}
export async function privateUrl(path: string) {
  const { uri } = await Filesystem.getUri({ directory: Directory.Data, path });
  return Capacitor.convertFileSrc(uri);
}
export async function readPrivateFile(path: string, type = 'application/octet-stream') {
  const response = await fetch(await privateUrl(path));
  if (!response.ok) throw new Error(`Saved file unavailable: ${path}`);
  return new Blob([await response.arrayBuffer()], { type });
}
export const removePrivateFile = (path: string) =>
  Filesystem.deleteFile({ directory: Directory.Data, path });
