import { nativeAndroid } from '../native/platform';
export const protectionState = {
  message: 'Checking storage protection…',
  recovered: 0,
  backupError: '',
};
let requested = false;
export async function checkStorageProtection() {
  if (nativeAndroid) {
    protectionState.message = 'Sightings are saved in the Android app’s own database.';
    return true;
  }
  const protectedStorage = await navigator.storage?.persisted?.().catch(() => false);
  protectionState.message = protectedStorage
    ? 'Browser storage protection is enabled.'
    : 'Browser storage protection is not enabled.';
  return protectedStorage === true;
}
export async function protectStorage(explicit = false) {
  if (nativeAndroid) return;
  if (requested && !explicit) return;
  requested = true;
  try {
    const protectedStorage =
      (await checkStorageProtection()) || (await navigator.storage?.persist?.());
    protectionState.message = protectedStorage
      ? 'Browser storage protection is enabled.'
      : 'The browser has not granted storage protection. Keep a backup of your sightings.';
  } catch {
    protectionState.message =
      'Could not request browser storage protection. Keep a backup of your sightings.';
  }
}
