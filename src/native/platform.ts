import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
export const nativeAndroid = Capacitor.getPlatform() === 'android';
const preferences = new Map<string, string>();
export async function initialiseNative() {
  if (!nativeAndroid) return;
  for (const key of [
    'fieldbook-storage-id',
    'fieldbook-live-diagnostics',
    'fieldbook-computer-url',
    'fieldbook-plantnet-quota',
  ]) {
    const { value } = await Preferences.get({ key });
    if (value !== null) preferences.set(key, value);
  }
  if (!preferences.has('fieldbook-storage-id')) {
    const value = crypto.randomUUID();
    await Preferences.set({ key: 'fieldbook-storage-id', value });
    preferences.set('fieldbook-storage-id', value);
  }
}
export function readPreference(key: string) {
  return nativeAndroid ? (preferences.get(key) ?? null) : localStorage.getItem(key);
}
export async function writePreference(key: string, value: string) {
  if (nativeAndroid) {
    await Preferences.set({ key, value });
    preferences.set(key, value);
  } else localStorage.setItem(key, value);
}
export const computerAddress = () =>
  readPreference('fieldbook-computer-url') ?? import.meta.env.VITE_COMPUTER_URL ?? '';
export const computerUrl = (path: string) => {
  if (!nativeAndroid) return path;
  const address = computerAddress();
  if (!address) throw new Error('Set the testing computer address in Settings.');
  return new URL(path, address).href;
};
