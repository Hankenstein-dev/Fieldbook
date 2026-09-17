import { offlineRecognitionAvailable } from '../../config/build';
import { useEffect, useRef, useState } from 'react';
import { Camera, Sparkles, Check, ArrowRight, RotateCcw } from 'lucide-react';
import type { Point, Species, Sighting } from '../types';
import { identificationConfig as config } from '../../config/identification';
import { downloadModels, modelInventory, type Progress } from '../identify/assets';
import { referencePackStatus, prepareReferencePack } from '../identify/referencePack';
import { identifyOnline, onlineRecognitionConfigured } from '../identify/plantnet';
import { useOnline } from '../hooks/useOnline';
import { identify, releaseRecognition } from '../identify/engine';
import {
  identificationCandidates,
  recognitionCandidates,
  type IdentificationScope,
} from '../identify/ranges';
import { downscalePhoto } from '../identify/image';
import { recognitionDownloadInfo } from '../store/recognitionDownload';
import { country } from '../../config/app';
import LocalPhoto from '../components/LocalPhoto';
import { cellFor } from '../species/geo';
import SpeciesImage from '../components/SpeciesImage';
import {
  diagnostic,
  diagnosticId,
  errorDetails,
  photoId,
  tagPhoto,
  retainDiagnosticPhoto,
} from '../diagnostics';
import type { EncounterPreparation } from '../collection/encounter';
type Match = { species: Species; similarity: number; model?: string };
export default function Identify({
  point: currentPoint,
  initialFile,
  initialMode = 'photo',
  onPrepare,
  onDiscover,
  onUndo,
  onContinue,
  initialPhoto,
  onSelect,
  onName,
}: {
  point: Point;
  initialFile?: File;
  initialMode?: 'photo' | 'describe' | 'offline';
  onPrepare: (operation: string) => Promise<EncounterPreparation>;
  onDiscover: (
    species: Species,
    photo: Blob | undefined,
    identification: NonNullable<Sighting['identification']>,
    preparation: Promise<EncounterPreparation>,
    onPrepared: (sighting: Sighting) => void,
  ) => Promise<Sighting>;
  onUndo: (id: string) => Promise<void>;
  onContinue: () => void;
  initialPhoto?: Blob;
  onSelect: (
    s: Species,
    photo?: Blob,
    identification?: { model: string; similarity: number; scope: string },
  ) => void;
  onName: (photo?: Blob) => void;
}) {
  const point = useRef(currentPoint).current;
  const online = useOnline();
  const canIdentifyOnline = online && onlineRecognitionConfigured();
  const [forceOffline, setForceOffline] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [offlineOptions, setOfflineOptions] = useState(initialMode === 'offline');
  const [saved, setSaved] = useState<Sighting | null>(null);
  const [savingDiscovery, setSavingDiscovery] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [correcting, setCorrecting] = useState(false);
  const [revealed, setRevealed] = useState<Match | null>(null);
  const preparation = useRef<Promise<EncounterPreparation> | null>(null);
  const [awards, setAwards] = useState<Sighting['achievements']>([]);
  const commitment = useRef<Promise<Sighting> | null>(null);
  const autoPhoto = useRef<Blob | null>(null);
  const receivedFile = useRef<File | undefined>(undefined);
  const [ready, setReady] = useState(false),
    [checking, setChecking] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [progress, setProgress] = useState<Progress | null>(null);
  const [photos, setPhotos] = useState<Blob[]>(initialPhoto ? [initialPhoto] : []),
    [text, setText] = useState(''),
    [describe, setDescribe] = useState(initialMode === 'describe'),
    [scope, setScope] = useState<IdentificationScope>('local'),
    [matches, setMatches] = useState<Match[]>([]),
    [unsupported, setUnsupported] = useState<Species[]>([]),
    [areaIds, setAreaIds] = useState<Set<number> | null>(null),
    [alternatives, setAlternatives] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    gallery = useRef<HTMLInputElement>(null),
    abort = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!offlineRecognitionAvailable) {
      setChecking(false);
      return;
    }
    let active = true;
    void Promise.all([modelInventory(), referencePackStatus()])
      .then(([model, pack]) => {
        diagnostic('recognition.storage', { ...model, referencePackReady: pack });
        if (active) setReady(model.ready && pack);
      })
      .catch((error) => {
        diagnostic('recognition.storage_error', errorDetails(error), 'error');
        if (active)
          setError(
            'Could not check saved recognition files. Close and reopen identification to retry.',
          );
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
      abort.current?.abort();
      releaseRecognition();
    };
  }, []);
  useEffect(() => {
    abort.current?.abort();
    setMatches([]);
    setUnsupported([]);
    setScope('local');
  }, [cellFor(point)]);
  const download = async () => {
    const started = performance.now();
    diagnostic('download.start', {
      model: config.id,
      downloadBytes: recognitionDownloadInfo.downloadBytes,
    });
    abort.current = new AbortController();
    setBusy(true);
    setDownloading(true);
    setError('');
    try {
      let label = '';
      await downloadModels((progress) => {
        setProgress(progress);
        if ((progress.asset ?? progress.label) !== label) {
          label = progress.asset ?? progress.label;
          diagnostic('download.progress', { ...progress });
        }
      }, abort.current.signal);
      await prepareReferencePack((done, total) => {
        setProgress({ done, total, label: 'Preparing recognition references' });
        diagnostic('download.references', { done, total });
      }, abort.current.signal);
      await identificationCandidates(point, 'local', abort.current.signal).catch((e) => {
        if (abort.current?.signal.aborted) throw e;
        setError(
          'Recognition files are saved. The local list is not available yet; country search is available offline.',
        );
      });
      setReady(true);
      diagnostic('download.ready', { milliseconds: performance.now() - started });
    } catch (e) {
      diagnostic(
        'download.error',
        { milliseconds: performance.now() - started, ...errorDetails(e) },
        'error',
      );
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setDownloading(false);
      setProgress(null);
    }
  };
  const run = async (next: IdentificationScope = scope, offline = forceOffline) => {
    const operation = diagnosticId(),
      started = performance.now();
    diagnostic('identify.start', {
      operation,
      scope: next,
      input: describe ? 'description' : 'photos',
      photos: describe ? [] : photos.map((p) => ({ id: photoId(p), bytes: p.size })),
    });
    setBusy(true);
    setMatches([]);
    setUnsupported([]);
    setAlternatives(false);
    setError('');
    setScope(next);
    // Acquire this encounter's position and occurrence context during recognition.
    preparation.current = onPrepare(operation);
    abort.current = new AbortController();
    try {
      if (!describe && !offline && canIdentifyOnline) {
        setProgress({ done: 0, total: 1, label: 'Recognising your photo' });
        const result = await identifyOnline(photos, abort.current.signal, operation);
        abort.current.signal.throwIfAborted();
        setAreaIds(null);
        setMatches(result.matches);
        diagnostic('identify.result', {
          operation,
          provider: result.provider,
          photos: photos.map((p) => ({ id: photoId(p), bytes: p.size })),
          totalMilliseconds: performance.now() - started,
          matches: result.matches.map((m) => ({
            taxonId: m.species.id,
            scientificName: m.species.scientificName,
            similarity: m.similarity,
            model: m.model,
          })),
        });
        void discover(result.matches[0], 'online');
        return;
      }
      if (!ready)
        throw new Error(
          offlineRecognitionAvailable
            ? 'Connect to identify online, or download offline recognition from Other options.'
            : 'Connect to the internet to identify a photo, or find the plant by name.',
        );
      if (!describe) setForceOffline(true);
      setProgress({ done: 0, total: 1, label: 'Loading candidate species' });
      const candidateSet = await recognitionCandidates(point, next, abort.current.signal);
      const { candidates, areaSpecies, areaAvailable, referencePack } = candidateSet;
      setAreaIds(areaAvailable ? new Set(areaSpecies.map((s) => s.id)) : null);
      diagnostic('identify.candidates', {
        operation,
        count: candidates.length,
        country: country.name,
        referencePack,
        cell: cellFor(point),
        areaAvailable,
        areaCount: areaSpecies.length,
        milliseconds: performance.now() - started,
      });
      // The pack revision identifies the national candidates. Record area IDs
      // in bounded events so a future mismatch can be replayed without guessing.
      for (let offset = 0; offset < areaSpecies.length; offset += 500)
        diagnostic('identify.area_candidates', {
          operation,
          offset,
          total: areaSpecies.length,
          taxonIds: areaSpecies.slice(offset, offset + 500).map((s) => s.id),
        });
      if (!candidates.length)
        throw new Error(
          'No local reference species were found. Widen the search or find it by name.',
        );
      abort.current.signal.throwIfAborted();
      const result = await identify(
        describe ? text : photos,
        candidates,
        () => setProgress({ done: 0, total: 1, label: 'Recognising your photo or description' }),
        abort.current.signal,
        operation,
      );
      abort.current.signal.throwIfAborted();
      setMatches(result.matches);
      setUnsupported(result.unsupported);
      diagnostic('identify.result', {
        operation,
        photos: describe ? [] : photos.map((p) => ({ id: photoId(p), bytes: p.size })),
        provider: result.provider,
        inferenceMilliseconds: result.milliseconds,
        referenceMilliseconds: result.referenceMilliseconds,
        missingReferences: result.missingReferences,
        totalMilliseconds: performance.now() - started,
        matches: result.matches.map((m) => ({
          taxonId: m.species.id,
          scientificName: m.species.scientificName,
          similarity: m.similarity,
          recordedInArea: areaAvailable ? areaSpecies.some((s) => s.id === m.species.id) : null,
        })),
      });
      if (result.matches[0]) void discover(result.matches[0], next);
      else setError('No match found. Try another view.');
      // Regional additions are fetched only when the correction fallback is used.
    } catch (e) {
      diagnostic(
        abort.current.signal.aborted ? 'identify.cancelled' : 'identify.error',
        { operation, milliseconds: performance.now() - started, ...errorDetails(e) },
        abort.current.signal.aborted ? 'info' : 'error',
      );
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };
  const clearMatch = () => {
    setMatches([]);
    setUnsupported([]);
    setScope('local');
    setError('');
  };
  const selectFile = async (file: File) => {
    setError('');
    const id = diagnosticId(),
      started = performance.now();
    diagnostic('photo.selected', {
      photoId: id,
      filename: file.name,
      mime: file.type,
      bytes: file.size,
      lastModified: file.lastModified,
    });
    try {
      const photo = await downscalePhoto(file, (dimensions) =>
        diagnostic('photo.dimensions', { photoId: id, ...dimensions }),
      );
      tagPhoto(photo, id);
      // Keep rejected images independently, without blocking recognition on
      // the diagnostic database/file queue.
      void retainDiagnosticPhoto(photo, id, file.name).catch((e) => {
        diagnostic('photo.retention_error', { photoId: id, ...errorDetails(e) }, 'error');
        setError(
          'The photo can be identified, but could not be kept for debugging. Device storage may be full.',
        );
      });
      diagnostic('photo.prepared', {
        photoId: id,
        bytes: photo.size,
        mime: photo.type,
        milliseconds: performance.now() - started,
      });
      setPhotos([photo]);
      setSaved(null);
      setRevealed(null);
      setDescribe(false);
      setMatches([]);
      setScope('local');
      setForceOffline(false);
    } catch (e) {
      diagnostic('photo.error', { photoId: id, ...errorDetails(e) }, 'error');
      setError('That image could not be opened. Try another photo.');
    }
  };
  const selectPhoto = (element: HTMLInputElement) => {
    const file = element.files?.[0];
    element.value = '';
    if (file) void selectFile(file);
  };
  useEffect(() => {
    if (initialFile && receivedFile.current !== initialFile) {
      receivedFile.current = initialFile;
      void selectFile(initialFile);
    }
  }, [initialFile]);
  useEffect(() => {
    const photo = photos[photos.length - 1];
    if (
      (!canIdentifyOnline && (!ready || checking)) ||
      busy ||
      describe ||
      !photo ||
      autoPhoto.current === photo
    )
      return;
    autoPhoto.current = photo;
    void run('local');
  }, [ready, checking, busy, describe, photos, canIdentifyOnline]);

  const discover = async (
    match: Match,
    next: string = match.model?.startsWith('plantnet:') ? 'online' : scope,
  ) => {
    setAwards([]);
    setAlternatives(false);
    setSaved(null);
    setSaveError('');
    setSavingDiscovery(true);
    const encounter = preparation.current ?? onPrepare(diagnosticId());
    preparation.current = encounter;
    const task = onDiscover(
      match.species,
      describe ? undefined : photos[0],
      {
        model: match.model ?? config.id,
        similarity: match.similarity,
        scope: next,
      },
      encounter,
      (sighting) => {
        // Reveal the species and its rewards together, before the persistence wait.
        setRevealed(match);
        setAwards(sighting.achievements);
      },
    );
    commitment.current = task;
    try {
      setSaved(await task);
    } catch (e) {
      setRevealed(match);
      setSaveError(e instanceof Error ? e.message : 'Could not save this discovery.');
      if (!(await encounter).ok) preparation.current = null;
    } finally {
      setSavingDiscovery(false);
    }
  };
  const correct = async () => {
    if (correcting) return;
    setCorrecting(true);
    try {
      const previous = await commitment.current?.catch(() => null);
      if (previous) await onUndo(previous.id);
      setSaved(null);
      setRevealed(null);
      setAlternatives(true);
      setSaveError('');
    } catch {
      setSaveError('Could not undo this sighting. Try again.');
    } finally {
      setCorrecting(false);
    }
  };
  const scanning = (busy || savingDiscovery) && !downloading && !revealed && photos.length > 0;
  return (
    <div
      className={`identify-flow ${scanning ? 'is-scanning' : ''} ${revealed ? 'is-revealed' : ''}`}
    >
      <input
        hidden
        disabled={busy || savingDiscovery}
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Retake photo"
        onChange={(e) => selectPhoto(e.currentTarget)}
      />
      <input
        hidden
        disabled={busy || savingDiscovery}
        ref={gallery}
        type="file"
        accept="image/*"
        aria-label="Choose another photo"
        onChange={(e) => selectPhoto(e.currentTarget)}
      />
      {(photos.length > 0 || revealed) && (
        <div className="discovery-portrait">
          {photos[0] && (
            <div className="discovery-original" inert={!!revealed}>
              <LocalPhoto photo={photos[0]} alt="Your photo 1" />
            </div>
          )}
          {revealed && (
            <div className="discovery-species">
              <SpeciesImage species={revealed.species} large />
            </div>
          )}
          {scanning && (
            <div className="scan-overlay" aria-hidden="true">
              <span />
            </div>
          )}
        </div>
      )}
      {revealed ? (
        <section className="discovery-reveal" aria-label="Discovery">
          <h1>{revealed.species.commonName}</h1>
          <p className="latin">{revealed.species.scientificName}</p>
          <div className="discovery-awards">
            {awards?.map((award, index) => (
              <span
                className={`discovery-award ${award.id === 'first-here' ? 'first-here' : ''}`}
                key={award.id}
                style={{ animationDelay: `${index * 180}ms` }}
              >
                <Sparkles size={18} />
                {award.label}
              </span>
            ))}
          </div>
          <p className="discovery-save" role="status">
            {savingDiscovery ? (
              'Adding to your fieldbook…'
            ) : saved ? (
              <>
                <Check size={16} /> Added to your fieldbook
              </>
            ) : (
              ''
            )}
          </p>
          {saveError && <p role="alert">{saveError}</p>}
          {saveError && !saved && (
            <button
              className="primary-button"
              disabled={savingDiscovery}
              onClick={() => void discover(revealed)}
            >
              Save discovery
            </button>
          )}
          <div className="discovery-actions">
            <button
              className="primary-button"
              disabled={savingDiscovery || correcting}
              onClick={onContinue}
            >
              Keep exploring <ArrowRight size={17} />
            </button>
            <button
              className="secondary-button"
              disabled={savingDiscovery || correcting}
              onClick={() => onSelect(revealed.species)}
            >
              Species card
            </button>
          </div>
          <button
            className="text-button correction-action"
            disabled={correcting}
            onClick={() => void correct()}
          >
            Not this species?
          </button>
        </section>
      ) : alternatives ? (
        <section className="recognition-alternatives">
          <h1>Another match?</h1>
          {matches.map((match) => (
            <div className="plant-row" key={match.species.id}>
              <SpeciesImage species={match.species} />
              <button className="photo-row-details" onClick={() => void discover(match)}>
                <span className="identification-match-labels">
                  <strong>{match.species.commonName}</strong>
                  <span className="latin">{match.species.scientificName}</span>
                  {areaIds?.has(match.species.id) && <small>Recorded nearby</small>}
                </span>
              </button>
            </div>
          ))}
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <Camera size={18} /> Take another photo
          </button>
          {scope === 'local' && !matches[0]?.model?.startsWith('plantnet:') && (
            <button className="text-button" disabled={busy} onClick={() => void run('regional')}>
              Check wider-area records
            </button>
          )}
          <button className="text-button" onClick={() => onName(photos[0])}>
            Find by name
          </button>
        </section>
      ) : (
        <>
          {checking && !canIdentifyOnline && <p role="status">Preparing…</p>}
          {scanning && (
            <p className="scan-status" role="status">
              {progress?.label === 'Loading candidate species'
                ? 'Opening your field guide…'
                : 'Finding your discovery…'}
            </p>
          )}
          {!photos.length && !describe && (
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              <Camera size={22} /> Take a photo
            </button>
          )}
          {describe && (
            <>
              <h1>Describe</h1>
              <textarea
                aria-label="Describe what you saw"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  clearMatch();
                }}
                placeholder="Shape, colour, leaves, flowers…"
              />
              {ready && (
                <button
                  className="primary-button"
                  disabled={busy || !text.trim()}
                  onClick={() => void run()}
                >
                  Identify description
                </button>
              )}
            </>
          )}
          {offlineRecognitionAvailable &&
            !checking &&
            !ready &&
            (offlineOptions || describe || !canIdentifyOnline) &&
            !scanning && (
              <section className="download-card">
                <h2>Offline recognition</h2>
                <p>
                  {(recognitionDownloadInfo.downloadBytes / 1e6).toFixed(0)} MB download ·{' '}
                  {(recognitionDownloadInfo.bytes / 1e6).toFixed(0)} MB installed
                </p>
                <button className="primary-button" disabled={busy} onClick={() => void download()}>
                  Download recognition files
                </button>
              </section>
            )}
          {!offlineRecognitionAvailable && !canIdentifyOnline && !scanning && (
            <p role="status">
              {onlineRecognitionConfigured()
                ? 'Photo identification needs an internet connection. You can still find a plant by name.'
                : 'Photo identification is not configured for this test build yet. You can find a plant by name.'}
            </p>
          )}
          {busy && !scanning && progress && (
            <div role="status">
              <p>
                {progress.label} ·{' '}
                {progress.label === 'Downloading recognition models'
                  ? `${(progress.done / 1e6).toFixed(0)} / ${(progress.total / 1e6).toFixed(0)} MB`
                  : `${progress.done.toLocaleString()} / ${progress.total.toLocaleString()}`}
              </p>
              <progress value={progress.done} max={progress.total} />
            </div>
          )}
          {busy && (
            <button className="text-button" onClick={() => abort.current?.abort()}>
              Cancel
            </button>
          )}
          {error && (
            <>
              <p role="alert">{error}</p>
              {ready && !describe && !forceOffline && (
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => {
                    setForceOffline(true);
                    void run('local', true);
                  }}
                >
                  Use offline recognition
                </button>
              )}
              <button className="secondary-button" disabled={busy} onClick={() => void run()}>
                <RotateCcw size={16} /> Try again
              </button>
            </>
          )}
          {!busy && (
            <details className="recognition-options">
              <summary>Other options</summary>
              <button onClick={() => gallery.current?.click()}>Choose a photo</button>
              {offlineRecognitionAvailable && (
                <button
                  onClick={() => {
                    setDescribe(!describe);
                    clearMatch();
                  }}
                >
                  {describe ? 'Use a photo' : 'Describe instead'}
                </button>
              )}
              <button onClick={() => onName(photos[0])}>Find by name</button>
              {offlineRecognitionAvailable && (
                <button onClick={() => setOfflineOptions(!offlineOptions)}>
                  Offline recognition
                </button>
              )}
              {ready && photos.length > 0 && (
                <button
                  onClick={() => {
                    setForceOffline(true);
                    void run('local', true);
                  }}
                >
                  Use offline recognition
                </button>
              )}
              {ready && !photos.length && <p>Offline recognition is downloaded.</p>}
              {onlineRecognitionConfigured() && (
                <a href="https://my.plantnet.org/" target="_blank" rel="noreferrer">
                  Plant recognition by Pl@ntNet
                </a>
              )}
            </details>
          )}
        </>
      )}
      {unsupported.length > 0 && (
        <details className="source-details">
          <summary>Recognition coverage</summary>
          <p>{unsupported.length} entries unavailable in this recognition pack.</p>
          <p>{unsupported.map((s) => s.scientificName).join(', ')}</p>
        </details>
      )}
    </div>
  );
}
