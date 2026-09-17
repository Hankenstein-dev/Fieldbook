import { hostedWeb } from '../../config/build';
import { computerUrl, computerAddress, nativeAndroid, writePreference } from '../native/platform';
import { exportPhoto } from '../native/export';
import { useEffect, useState } from 'react';
import { exportDiagnostics, diagnostic, flushDiagnostics, syncState } from '../diagnostics';
import {
  liveDiagnosticsEnabled,
  setLiveDiagnostics,
  readDiagnosticPhotos,
  diagnosticQueueCounts,
  diagnosticStorageContext,
} from '../store/diagnostics';
import type { DiagnosticPhoto } from '../diagnostics/types';
import LocalPhoto from './LocalPhoto';
import StorageSafety from './StorageSafety';
export default function Diagnostics() {
  const [address, setAddress] = useState(() => (nativeAndroid ? computerAddress() : ''));
  const [available, setAvailable] = useState(false);
  const [live, setLive] = useState(liveDiagnosticsEnabled);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState<DiagnosticPhoto[]>([]);
  const [status, setStatus] = useState('');
  const [storageId, setStorageId] = useState('Checking…');
  const [sightingCount, setSightingCount] = useState<number>();
  const [syncError, setSyncError] = useState('');
  useEffect(() => {
    void diagnosticStorageContext()
      .then((context) => {
        setStorageId(context.storageId);
        setSightingCount(context.sightingCount);
      })
      .catch(() => setStorageId('Could not read storage details'));
  }, []);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const [photos, counts] = await Promise.all([
          readDiagnosticPhotos(6),
          diagnosticQueueCounts(),
        ]);
        if (!active) return;
        setPhotos(photos);
        setSyncError(syncState.error);
        setStatus(
          `${syncState.message} · ${counts.events} logs and ${counts.photos} photos waiting${syncState.lastSent ? ` · last sent ${new Date(syncState.lastSent).toLocaleTimeString()}` : ''}`,
        );
      } catch {
        if (active) setError('Could not read the retained testing photos.');
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    if (hostedWeb) return;
    const controller = new AbortController();
    void fetch(computerUrl('/__fieldbook_debug/status'), {
      cache: 'no-store',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(3000)]),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => setAvailable(r?.fieldbookDiagnostics === true))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  return (
    <section>
      <h2>Testing & diagnostics</h2>
      {nativeAndroid && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const url = new URL(address);
              if (url.protocol !== 'https:' || url.username || url.password)
                throw new Error('Use the HTTPS address of your testing computer.');
              void writePreference('fieldbook-computer-url', url.origin)
                .then(() => window.location.reload())
                .catch(() => setError('Could not save the computer address.'));
            } catch {
              setError('Enter the HTTPS address of your testing computer.');
            }
          }}
        >
          <label>
            Testing computer{' '}
            <input
              type="url"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="https://192.168.0.97:5174"
              required
            />
          </label>
          <button className="secondary-button" type="submit">
            Save address
          </button>
        </form>
      )}
      {(available || live) && (
        <label className="interest-option">
          <span>Automatically send logs and photos to this computer</span>
          <input
            type="checkbox"
            checked={live}
            onChange={(e) => {
              setLive(e.target.checked);
              setLiveDiagnostics(e.target.checked);
              diagnostic('diagnostics.live', { enabled: e.target.checked });
              void flushDiagnostics();
            }}
          />
        </label>
      )}
      <p className="small-note" role="status">
        {hostedWeb
          ? 'Testing photos and logs stay on this device. Export diagnostics to share feedback.'
          : live
            ? status
            : 'Automatic sending paused; photos and logs remain on this device.'}
      </p>
      {live && syncError && <p className="small-note">{syncError}</p>}
      {live && (
        <button className="secondary-button" onClick={() => void flushDiagnostics()}>
          Sync now
        </button>
      )}
      <details>
        <summary>App and storage details</summary>
        <p>Address: {window.location.origin}</p>
        <p>Build: {import.meta.env.VITE_APP_BUILD}</p>
        <p>
          Opened as:{' '}
          {nativeAndroid
            ? 'Android app'
            : window.matchMedia('(display-mode: standalone)').matches
              ? 'installed app'
              : 'browser tab'}
        </p>
        <p>Storage ID: {storageId}</p>
        <p>Saved sightings in this storage: {sightingCount ?? 'Unavailable'}</p>
      </details>
      {available && (
        <p>
          <a href={computerUrl('/__fieldbook_debug')} target="_blank" rel="noreferrer">
            Open the live log viewer
          </a>{' '}
          at this app’s address on your computer. Sessions distinguish the phone from desktop tests.
        </p>
      )}
      <details>
        <summary>Recent identification photos</summary>
        <p>
          These are testing records, including rejected matches. Download a JPEG here to keep your
          own copy. Recording a sighting is separate.
        </p>
        {photos.length === 0 && <p>No testing photos retained yet.</p>}
        {photos.map((record) => (
          <figure key={record.id}>
            <LocalPhoto photo={record.photo} alt={record.filename} />
            <figcaption>
              {record.filename} ·{' '}
              {record.sent
                ? 'Sent to computer'
                : hostedWeb
                  ? 'Saved on this device'
                  : 'Waiting to send'}
            </figcaption>
            <button
              className="text-button"
              onClick={() => {
                void exportPhoto(`fieldbook-${record.id}.jpg`, record.photo).catch(() =>
                  setError('Could not export photo.'),
                );
              }}
            >
              Download photo
            </button>
          </figure>
        ))}
      </details>
      <button
        className="secondary-button"
        onClick={() =>
          void exportDiagnostics().catch(() => setError('Could not export diagnostics.'))
        }
      >
        Export diagnostics
      </button>
      {error && <p role="alert">{error}</p>}
      <StorageSafety />
    </section>
  );
}
