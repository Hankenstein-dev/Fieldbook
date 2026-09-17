import { hostedWeb } from '../../config/build';
import { nativeAndroid } from '../native/platform';
import { useEffect, useState } from 'react';
import {
  checkStorageProtection,
  protectStorage,
  protectionState,
} from '../store/storageProtection';
import { backupState, restoreComputerSightings } from '../backup';
import { diagnostic } from '../diagnostics';

export default function StorageSafety() {
  const [status, setStatus] = useState({ ...protectionState, ...backupState });
  const [protection, setProtection] = useState(protectionState.message);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(false);
  useEffect(() => {
    void checkStorageProtection();
    const refresh = () => {
      setStatus({ ...protectionState, ...backupState });
      setProtection(protectionState.message);
    };
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <section>
      <h2>{nativeAndroid ? 'Saved on this phone' : 'Protect your sightings'}</h2>
      <p>{protection}</p>
      {!nativeAndroid && (
        <>
          <button
            className="secondary-button"
            onClick={() =>
              void protectStorage(true).then(() => {
                setProtection(protectionState.message);
                diagnostic('storage.protection', { message: protectionState.message });
              })
            }
          >
            Protect storage
          </button>
          <p>
            A compact extra copy of sighting names, times and locations stays on this device. Photos
            are included in Fieldbook exports. This extra browser copy can also be lost if browser
            data is cleared.
          </p>
        </>
      )}
      {status.recovered > 0 && (
        <p role="status">
          Recovered {status.recovered} sightings from the local safety copy. Restore from the
          computer or import your Fieldbook export to recover any backed-up photos.
        </p>
      )}
      {status.backupError && <p role="alert">{status.backupError}</p>}
      {!hostedWeb && <p>{status.message}</p>}
      {!hostedWeb && status.missing > 0 && (
        <p>{status.missing} backed-up sightings are missing from this device.</p>
      )}
      {!hostedWeb && status.count > 0 && (
        <button
          className="secondary-button"
          disabled={restoring}
          onClick={() => {
            setRestoring(true);
            setError('');
            void restoreComputerSightings()
              .then(() => window.location.reload())
              .catch((error) => {
                setError(String(error));
                setRestoring(false);
              });
          }}
        >
          {restoring ? 'Restoring…' : 'Restore sightings from computer'}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
