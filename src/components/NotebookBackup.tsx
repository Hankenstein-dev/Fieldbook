import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { exportNotebook } from '../store';
import { importNotebook } from '../store/importNotebook';
import { nativeAndroid } from '../native/platform';
import { exportJson } from '../native/export';

export default function NotebookBackup() {
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<{ file: File; url: string }>();
  const [message, setMessage] = useState('');
  useEffect(
    () => () => {
      if (prepared) URL.revokeObjectURL(prepared.url);
    },
    [prepared],
  );
  const prepare = async () => {
    setBusy(true);
    setPrepared(undefined);
    setMessage('');
    try {
      const data = await exportNotebook();
      const name = `fieldbook-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      if (nativeAndroid) await exportJson(name, data);
      else {
        const file = new File([JSON.stringify(data)], name, { type: 'application/json' });
        setPrepared({ file, url: URL.createObjectURL(file) });
      }
    } catch {
      setMessage('Could not prepare your backup. Your sightings are still on this device.');
    } finally {
      setBusy(false);
    }
  };
  // A second tap preserves Safari's required user activation after reading photos
  // and assembling a potentially large export. Never claim the OS saved the file.
  const share = () => {
    if (!prepared) return;
    void navigator.share({ files: [prepared.file], title: 'Fieldbook backup' }).catch((error) => {
      if (error?.name !== 'AbortError')
        setMessage('Sharing was unavailable. Use Download backup instead.');
    });
  };
  let canShare = false;
  try {
    canShare =
      !!prepared && !!navigator.share && !!navigator.canShare?.({ files: [prepared.file] });
  } catch {
    /* The direct download remains available. */
  }
  return (
    <section>
      <h2>Keep a backup</h2>
      <p>
        {nativeAndroid
          ? 'Your sightings and photos are saved in this app. Export a copy before uninstalling or changing phones.'
          : 'After each walk, save a backup with your photos to Files or iCloud Drive. A copy in this browser is not a separate backup.'}
      </p>
      <button className="secondary-button" disabled={busy} onClick={() => void prepare()}>
        <Download size={16} /> {busy ? 'Preparing backup…' : 'Export my fieldbook'}
      </button>
      {prepared && (
        <div role="status">
          <p>
            Backup ready · {(prepared.file.size / 1024 / 1024).toFixed(1)} MB. Save this copy before
            leaving this screen.
          </p>
          {canShare && (
            <button className="secondary-button" onClick={share}>
              Save or share backup
            </button>
          )}
          <a className="secondary-button" href={prepared.url} download={prepared.file.name}>
            Download backup
          </a>
          {canShare && (
            <p className="small-note">
              Choose Save to Files in the share sheet, then select iCloud Drive or a folder.
            </p>
          )}
        </div>
      )}
      <label className="secondary-button">
        Import a Fieldbook export
        <input
          type="file"
          accept="application/json,.json"
          hidden
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setBusy(true);
            setPrepared(undefined);
            setMessage('');
            void file
              .text()
              .then(importNotebook)
              .then(() => window.location.reload())
              .catch((error) => {
                setBusy(false);
                setMessage(
                  `Import could not finish: ${error instanceof Error ? error.message : 'could not read the file'}. Retrying the same export will not duplicate sightings.`,
                );
              });
          }}
        />
      </label>
      <p className="small-note">
        Import adds records to this device. To keep separate collections, each person should restore
        only their own backup.
      </p>
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
