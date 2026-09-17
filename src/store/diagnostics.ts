import { hostedWeb } from '../../config/build';
import { nativeAndroid, readPreference, writePreference } from '../native/platform';
import { getSightings, sightingIds } from './index';
import * as web from './webDiagnostics';
import * as native from './nativeDiagnostics';
const store = nativeAndroid ? native : web;
export const saveDiagnostic = store.saveDiagnostic;
export const readDiagnostics = store.readDiagnostics;
export const pendingDiagnostics = store.pendingDiagnostics;
export const markDiagnosticsSent = store.markDiagnosticsSent;
export const readDiagnosticPhotos = store.readDiagnosticPhotos;
export const diagnosticQueueCounts = store.diagnosticQueueCounts;
export const pendingDiagnosticPhoto = store.pendingDiagnosticPhoto;
export const markDiagnosticPhotoSent = store.markDiagnosticPhotoSent;
export const saveDiagnosticPhoto = store.saveDiagnosticPhoto;
export function liveDiagnosticsEnabled() {
  if (hostedWeb) return false;
  try {
    return readPreference('fieldbook-live-diagnostics') !== 'false';
  } catch {
    return false;
  }
}
export function setLiveDiagnostics(enabled: boolean) {
  try {
    void writePreference('fieldbook-live-diagnostics', String(enabled));
  } catch {
    /* Export still works. */
  }
}
export async function diagnosticStorageContext() {
  let storageId = 'unavailable';
  try {
    storageId = readPreference('fieldbook-storage-id') ?? crypto.randomUUID();
    void writePreference('fieldbook-storage-id', storageId);
  } catch {
    /* Report unavailable rather than breaking startup. */
  }
  if (nativeAndroid)
    return {
      storageId,
      sightingCount: (await sightingIds()).length,
      storage: 'android-sqlite',
      persistent: true,
    };
  const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
  const persistent = await navigator.storage?.persisted?.().catch(() => undefined);
  const sightingCount = (await getSightings()).length;
  return { storageId, sightingCount, usage: estimate?.usage, quota: estimate?.quota, persistent };
}
