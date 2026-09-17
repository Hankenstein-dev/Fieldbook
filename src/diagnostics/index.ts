import { exportJson } from '../native/export';
import { computerUrl, nativeAndroid } from '../native/platform';
import {
  saveDiagnostic,
  readDiagnostics,
  pendingDiagnostics,
  markDiagnosticsSent,
  liveDiagnosticsEnabled,
  saveDiagnosticPhoto,
  pendingDiagnosticPhoto,
  markDiagnosticPhotoSent,
  diagnosticStorageContext,
} from '../store/diagnostics';
import { identificationConfig } from '../../config/identification';
import type { DiagnosticEvent } from './types';
import { syncSightingBackup } from '../backup';
export { errorDetails } from './types';
export const diagnosticId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const session = diagnosticId();
let pending = Promise.resolve();
let started = false;
let sending = false;
const photos = new WeakMap<Blob, string>();
export const tagPhoto = (photo: Blob, id: string) => photos.set(photo, id);
export const photoId = (photo: Blob) => photos.get(photo);
export async function retainDiagnosticPhoto(photo: Blob, id: string, filename: string) {
  await saveDiagnosticPhoto({
    id,
    session,
    at: new Date().toISOString(),
    filename: filename.slice(0, 255),
    photo,
    sent: 0,
  });
  diagnostic('photo.retained', { photoId: id, bytes: photo.size });
}
let receiverReady = false;
let backupsAvailable = false;
export const syncState = { message: 'Waiting for the testing computer', lastSent: '', error: '' };
export function diagnostic(
  event: string,
  details: Record<string, unknown> = {},
  level: DiagnosticEvent['level'] = 'info',
) {
  // Keep logs bounded and serialisable. Never pass photo bytes, vectors or whole API responses.
  let safe: Record<string, unknown>;
  try {
    const json = JSON.stringify(details);
    safe = json.length > 12000 ? { truncated: json.slice(0, 12000) } : JSON.parse(json);
  } catch {
    safe = { message: 'Unserialisable diagnostic detail' };
  }
  const entry: DiagnosticEvent = {
    id: diagnosticId(),
    session,
    at: new Date().toISOString(),
    level,
    event,
    details: safe,
  };
  console[level === 'info' ? 'info' : level]('[Fieldbook]', entry);
  pending = pending
    .then(() => saveDiagnostic(entry))
    .catch(() => {
      /* Logging must never break an encounter. */
    });
}
export async function flushDiagnostics() {
  if (sending || !liveDiagnosticsEnabled() || !navigator.onLine) return;
  sending = true;
  let stage = 'Checking receiver';
  try {
    if (!receiverReady) {
      const status = await fetch(computerUrl('/__fieldbook_debug/status'), {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (!status.ok) throw new Error(`HTTP ${status.status}`);
      const capabilities = await status.json();
      backupsAvailable = capabilities?.sightingBackup === true;
      receiverReady =
        capabilities?.fieldbookDiagnostics === true && capabilities?.photoUpload === true;
      if (!receiverReady) {
        syncState.message = 'Testing receiver unavailable; retained on this device';
        syncState.error = 'This address did not advertise the logs and photos receiver.';
        return;
      }
    }
    await pending;
    stage = 'Reading queued logs';
    const events = await pendingDiagnostics();
    if (events.length) {
      stage = 'Sending logs';
      const response = await fetch(computerUrl('/__fieldbook_debug/events'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      });
      if (!response.ok) throw await receiverError(response);
      const result = await response.json();
      if (result.accepted !== events.length) throw new Error('Logs were not acknowledged');
      stage = 'Acknowledging logs on this device';
      await markDiagnosticsSent(events.map((e) => e.id));
      syncState.lastSent = new Date().toISOString();
    }
    stage = 'Reading queued photo';
    const photo = await pendingDiagnosticPhoto();
    if (photo) {
      stage = 'Sending photo';
      const { id, session, at, filename } = photo;
      const response = await fetch(computerUrl(`/__fieldbook_debug/photos/${id}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'image/jpeg',
          'X-Fieldbook-Photo': encodeURIComponent(JSON.stringify({ id, session, at, filename })),
        },
        body: photo.photo,
        signal: AbortSignal.timeout(20000),
        cache: 'no-store',
      });
      if (!response.ok) throw await receiverError(response);
      if ((await response.json()).accepted !== id) throw new Error('Photo was not acknowledged');
      stage = 'Acknowledging photo on this device';
      await markDiagnosticPhotoSent(id);
      syncState.lastSent = new Date().toISOString();
    }
    syncState.message = 'Connected to the testing computer';
    syncState.error = '';
    if (backupsAvailable) void syncSightingBackup();
  } catch (error) {
    receiverReady = false;
    syncState.message = 'Waiting to reconnect; logs and photos remain queued';
    const detail =
      `${stage}: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`.slice(
        0,
        500,
      );
    // Retain a useful error without adding the same failure every two-second retry.
    if (detail !== syncState.error)
      diagnostic(
        'diagnostics.sync_error',
        { stage, message: detail, origin: location.origin },
        'warn',
      );
    syncState.error = detail;
    /* Retain unsent events for reconnection or export. */
  } finally {
    sending = false;
  }
}
async function receiverError(response: Response) {
  const body = await response.json().catch(() => null);
  return new Error(
    `HTTP ${response.status}${typeof body?.error === 'string' ? `: ${body.error.slice(0, 200)}` : ''}`,
  );
}
export async function exportDiagnostics() {
  await pending;
  const events = await readDiagnostics();
  await exportJson(`fieldbook-diagnostics-${new Date().toISOString().slice(0, 10)}.json`, {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    events,
  });
}
export function startDiagnostics() {
  if (started) return;
  started = true;
  diagnostic('session.start', {
    build: import.meta.env.VITE_APP_BUILD,
    mode: import.meta.env.MODE,
    model: identificationConfig.id,
    origin: window.location.origin,
    displayMode: nativeAndroid
      ? 'native-android'
      : window.matchMedia('(display-mode: standalone)').matches
        ? 'standalone'
        : 'browser',
    userAgent: navigator.userAgent,
    secureContext: window.isSecureContext,
    online: navigator.onLine,
    webGPU: 'gpu' in navigator,
    wasm: typeof WebAssembly !== 'undefined',
    hardwareConcurrency: navigator.hardwareConcurrency,
  });
  void diagnosticStorageContext()
    .then((context) => diagnostic('storage.context', context))
    .catch(() => undefined);
  window.addEventListener('fieldbook-photo-missing', (event) =>
    diagnostic('storage.photo_missing', (event as CustomEvent).detail, 'warn'),
  );
  window.addEventListener('error', (e) => {
    diagnostic(
      'app.error',
      {
        message: e.message,
        file: e.filename,
        line: e.lineno,
        stack: e.error?.stack?.slice(0, 4000),
      },
      'error',
    );
  });
  window.addEventListener('unhandledrejection', (e) => {
    diagnostic(
      'app.unhandled_rejection',
      {
        message: String(e.reason),
        stack: e.reason instanceof Error ? e.reason.stack?.slice(0, 4000) : undefined,
      },
      'error',
    );
  });
  window.addEventListener('online', () => {
    diagnostic('connection.online');
    void flushDiagnostics();
  });
  window.addEventListener('offline', () => diagnostic('connection.offline'));
  setInterval(() => void flushDiagnostics(), 2000);
}
