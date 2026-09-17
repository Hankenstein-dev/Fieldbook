import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { nativeAndroid } from './platform';
export async function exportJson(name: string, value: unknown) {
  const data = JSON.stringify(value, null, 2);
  if (nativeAndroid) {
    const { uri } = await Filesystem.writeFile({
      directory: Directory.Cache,
      path: name,
      data,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: 'Fieldbook export',
      url: uri,
      dialogTitle: 'Save or share your Fieldbook',
    });
    return;
  }
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportPhoto(name: string, photo: Blob) {
  if (nativeAndroid) {
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(photo);
    });
    const { uri } = await Filesystem.writeFile({ directory: Directory.Cache, path: name, data });
    await Share.share({ title: 'Fieldbook photo', url: uri });
  } else {
    const url = URL.createObjectURL(photo),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
