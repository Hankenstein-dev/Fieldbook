import NotebookBackup from './components/NotebookBackup';
import { offlineRecognitionAvailable } from '../config/build';
import { nativeAndroid } from './native/platform';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Diagnostics from './components/Diagnostics';
import { protectStorage } from './store/storageProtection';
import { appUpdateAvailable, applyAppUpdate } from './appUpdate';
import { diagnostic, diagnosticId, errorDetails, photoId } from './diagnostics';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Camera,
  Compass,
  Download,
  Leaf,
  LocateFixed,
  MapPin,
  MoreHorizontal,
  Star,
  Search,
  Settings as SettingsIcon,
  WifiOff,
  X,
} from 'lucide-react';
import {
  country,
  defaultInterests,
  groupConfig,
  habitatNotes,
  referenceSpecies,
  storyIndex,
} from '../config/app';
import { discoveryAchievements, walkingSuggestions, todaysSightings } from './collection/discovery';
import { prepareEncounter, type EncounterPreparation } from './collection/encounter';
import { themedCollections, themeIncludes } from '../config/discovery';
import { zones } from '../config/zones';
import { contains } from './map/geometry';
import { habitatLabels } from '../config/habitats';
import type { CandidateSet, RankedCandidate, Sighting, Species } from './types';
import { useLocation } from './hooks/useLocation';
import { useHeading } from './hooks/useHeading';
import { useOnline } from './hooks/useOnline';
import { cellFor } from './species/geo';
import { getCandidates } from './species/candidates';
import { identificationCandidates } from './identify/ranges';
import { searchTaxa } from './species/client';
import {
  getSettings,
  searchStoredSpecies,
  getSeasonsForCell,
  getSightings,
  saveSettings,
  saveSighting,
  retractSighting,
  storageStats,
  visitCell,
} from './store';
import { seasonalRecords } from './depth/seasons';
import { rankCandidates } from './rank';
import { habitatAt, type HabitatResult } from './map/habitat';
import LocalPhoto from './components/LocalPhoto';
import SpeciesImage from './components/SpeciesImage';
import SpeciesSheet from './components/SpeciesSheet';
const Identify = lazy(() => import('./screens/Identify'));
const Places = lazy(() => import('./screens/Places'));
const Collection = lazy(() => import('./screens/Collection'));
const SourceCredits = lazy(() => import('./components/SourceCredits'));
const FieldMap = lazy(() => import('./map/FieldMap'));
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
type View = 'explore' | 'zones' | 'sightings' | 'settings' | 'collection' | 'identify' | 'name';
const unknown: HabitatResult = { habitat: 'unknown', source: 'unavailable' };
const word = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function PlantRow({ item, onOpen }: { item: RankedCandidate; onOpen: (species: Species) => void }) {
  return (
    <div className="plant-row" data-testid={`plant-${item.species.id}`}>
      <div className="plant-art">
        <SpeciesImage species={item.species} />
        {item.seen && (
          <span className="photo-check">
            <Check size={12} />
          </span>
        )}
      </div>
      <button className="photo-row-details" onClick={() => onOpen(item.species)}>
        <span className="plant-description">
          <strong>{word(item.species.commonName)}</strong>
          <span className="latin">{item.species.scientificName}</span>
          <span className={`collection-status ${item.seen ? 'collected' : 'missing'}`}>
            {item.seen ? 'Collected' : 'Not yet collected'}
          </span>
          <span className="plant-reason">
            {item.affinity ? (
              <>
                <Leaf size={12} /> Suits this habitat
              </>
            ) : item.story ? (
              <>
                <BookOpen size={12} /> Natural history & uses
              </>
            ) : (
              <>
                <MapPin size={12} /> {item.count ? 'Recorded nearby' : 'Species reference'}
              </>
            )}
          </span>
          {item.seasonLabel && <small className="plant-season">{item.seasonLabel}</small>}
        </span>
        <ArrowRight className="row-arrow" size={17} />
      </button>
    </div>
  );
}
export default function App() {
  const location = useLocation(),
    compass = useHeading(),
    online = useOnline();
  const capture = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const [captureFile, setCaptureFile] = useState<File | undefined>();
  const [identifyMode, setIdentifyMode] = useState<'photo' | 'describe' | 'offline'>('photo');
  const [wanted, setWanted] = useState<number[]>([]);
  const wantedSaving = useRef(false);
  const [lookupPhoto, setLookupPhoto] = useState<Blob | undefined>();
  const [storedNames, setStoredNames] = useState<Species[]>([]);
  const [attachment, setAttachment] = useState<{
    photo?: Blob;
    identification?: Sighting['identification'];
  }>({});
  const [seasons, setSeasons] = useState<Record<number, number[]>>({});
  const [where, setWhere] = useState<{ species: Species; cells: string[] } | null>(null);
  const [view, setView] = useState<View>('explore'),
    [mapMode, setMapMode] = useState<'explore' | 'places' | 'sightings'>('explore');
  const [returnView, setReturnView] = useState<View>('explore');
  const [settingsReturn, setSettingsReturn] = useState<View>('explore');
  const [zoneId, setZoneId] = useState<string | null>(null);
  const activeZone = zones.find((z) => z.id === zoneId);
  const [sightingSpecies, setSightingSpecies] = useState<Species | null>(null);
  const isFieldbook = ['collection', 'zones', 'sightings'].includes(view);
  const following = view === 'explore';
  const focus = location.fix ?? country.start;
  const [habitat, setHabitat] = useState<HabitatResult>(unknown);
  const [interests, setInterests] = useState(defaultInterests),
    [loaded, setLoaded] = useState(false),
    [settingsSaving, setSettingsSaving] = useState(false);
  const [sightings, setSightings] = useState<Sighting[]>([]),
    [storageError, setStorageError] = useState('');
  const [field, setField] = useState<CandidateSet | null>(null),
    [fieldStatus, setFieldStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [stale, setStale] = useState(false),
    [fieldError, setFieldError] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [showAll, setShowAll] = useState(false),
    [query, setQuery] = useState(''),
    [externalSearch, setExternalSearch] = useState(false);
  const [externalResults, setExternalResults] = useState<Species[]>([]),
    [searchStatus, setSearchStatus] = useState('');
  const [selected, setSelected] = useState<Species | null>(null),
    [saving, setSaving] = useState(false),
    [toast, setToast] = useState('');
  const savingRef = useRef(false),
    lastRefresh = useRef(0);
  const [refresh, setRefresh] = useState(0),
    [install, setInstall] = useState<InstallEvent | null>(null),
    [update, setUpdate] = useState(appUpdateAvailable),
    [updating, setUpdating] = useState(false),
    [updateError, setUpdateError] = useState('');
  const [stats, setStats] = useState({ cells: 0, tiles: 0, mapBytes: 0 });
  useEffect(() => {
    if (view === 'explore') setMapMode('explore');
    if (view === 'zones') setMapMode('places');
    if (view === 'sightings') setMapMode('sightings');
  }, [view]);
  const interestKey = interests.slice().sort().join(','),
    focusCell = cellFor(focus),
    physicalCell = location.fix ? cellFor(location.fix) : '';
  const seenCount = new Set(sightings.map((s) => s.species.scientificName.toLocaleLowerCase()))
    .size;
  const seen = useMemo(() => {
    const ids = new Set(sightings.map((s) => s.taxonId)),
      names = new Set(sightings.map((s) => s.species.scientificName.toLocaleLowerCase()));
    for (const s of [...referenceSpecies, ...(field?.candidates.map((c) => c.species) ?? [])])
      if (names.has(s.scientificName.toLocaleLowerCase())) ids.add(s.id);
    return ids;
  }, [sightings, field]);
  useEffect(() => {
    let active = true;
    Promise.all([getSettings(), getSightings()])
      .then(([preferences, rows]) => {
        if (!active) return;
        if (preferences) {
          setInterests(preferences.interests.filter((id) => id in groupConfig));
          setWanted(preferences.wanted ?? []);
        }
        setSightings(rows);
      })
      .catch(() => {
        if (active)
          setStorageError(
            nativeAndroid
              ? 'Could not open your saved fieldbook. Please reopen the app.'
              : 'Local storage is unavailable. Enable it to keep your sightings.',
          );
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    const before = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    const updated = () => setUpdate(true),
      cacheFull = () => setToast('Map caching is full. Your existing sightings are still saved.'),
      photoMissing = () =>
        setToast(
          'A saved photo is unavailable. Your sighting is still recorded; a computer backup may contain the photo.',
        );
    window.addEventListener('beforeinstallprompt', before);
    window.addEventListener('fieldbook-update', updated);
    if (appUpdateAvailable()) updated();
    window.addEventListener('fieldbook-cache-full', cacheFull);
    window.addEventListener('fieldbook-photo-missing', photoMissing);
    return () => {
      active = false;
      window.removeEventListener('beforeinstallprompt', before);
      window.removeEventListener('fieldbook-update', updated);
      window.removeEventListener('fieldbook-cache-full', cacheFull);
      window.removeEventListener('fieldbook-photo-missing', photoMissing);
    };
  }, []);
  useEffect(() => {
    let active = true;
    habitatAt(focus)
      .then((result) => {
        if (active) setHabitat(result);
      })
      .catch(() => {
        if (active) setHabitat(unknown);
      });
    return () => {
      active = false;
    };
  }, [focus]);
  useEffect(() => {
    if (!loaded || !interests.length) {
      if (loaded) {
        setField(null);
        setFieldStatus('ready');
      }
      return;
    }
    let active = true;
    setFieldStatus('loading');
    setFieldError('');
    setField((previous) => (previous?.cell === focusCell ? previous : null));
    // Only the stable cell and tile-derived habitat trigger field-list changes.
    getCandidates(focus, habitat.habitat, interests, refresh > lastRefresh.current)
      .then((result) => {
        if (active) {
          setField(result.data);
          setStale(result.stale);
          setFieldStatus('ready');
        }
      })
      .catch((error) => {
        if (active) {
          setField(null);
          setFieldStatus('error');
          setFieldError(error instanceof Error ? error.message : 'Could not load this list.');
        }
      });
    lastRefresh.current = refresh;
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCell, habitat.habitat, interestKey, loaded, online, refresh]);
  useEffect(() => {
    if (!loaded || !location.fix || !interests.length) return;
    const actualFix = location.fix;
    // An explored map point never enters the visited-cell union.
    getCandidates(actualFix, 'unknown', interests)
      .then(({ data }) =>
        visitCell(
          data.cell,
          data.candidates.map((c) => c.species.id),
        ),
      )
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [physicalCell, interestKey, loaded, online]);
  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => setToast(''), 6500);
      return () => clearTimeout(timeout);
    }
  }, [toast]);
  useEffect(() => {
    if (view === 'settings')
      void storageStats()
        .then(setStats)
        .catch(() => undefined);
  }, [view, sightings]);
  useEffect(() => {
    if (!externalSearch || query.trim().length < 2 || !online) {
      setExternalResults([]);
      setSearchStatus('');
      return;
    }
    const controller = new AbortController();
    setSearchStatus('Looking up names…');
    const timer = setTimeout(() => {
      searchTaxa(query.trim(), controller.signal)
        .then((rows) => {
          setExternalResults(rows);
          setSearchStatus(rows.length ? '' : 'No matching names found.');
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setSearchStatus(error instanceof Error ? error.message : 'Name search is unavailable.');
        });
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, externalSearch, online]);
  const rows = useMemo(
    () =>
      rankCandidates(
        field?.candidates ?? [],
        habitat.habitat,
        storyIndex,
        habitatNotes,
        seen,
        groupConfig,
        seasons,
      ),
    [field, habitat.habitat, seen, interestKey, seasons],
  );
  useEffect(() => {
    let active = true;
    setSeasons({});
    void getSeasonsForCell(focusCell)
      .then((records) => {
        if (active) setSeasons(Object.fromEntries(records.map((r) => [r.taxonId, r.months])));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [focusCell]);
  useEffect(() => {
    if (!field) return;
    let active = true;
    // Enrich the visible card only; a country catalogue must not create thousands of requests.
    const featured = rankCandidates(
      field.candidates,
      habitat.habitat,
      storyIndex,
      habitatNotes,
      seen,
      groupConfig,
    )
      .filter((c) => c.story && c.species.id > 0)
      .slice(0, 8);
    void (async () => {
      for (const c of featured) {
        if (!active) break;
        try {
          const { data } = await seasonalRecords(c.species.id, focus);
          if (active) setSeasons((old) => ({ ...old, [c.species.id]: data.months }));
        } catch {
          /* No seasonal evidence means no bonus. */
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [field?.key]);
  const searched = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return rows.filter(
      (r) =>
        !q ||
        [r.species.commonName, r.species.scientificName, ...r.species.alternativeNames].some((s) =>
          s.toLocaleLowerCase().includes(q),
        ),
    );
  }, [rows, query]);
  const discoveryRows = [...searched].sort((a, b) => Number(a.seen) - Number(b.seen));
  const suggestionHistory = useRef<{ habitat: string; ids: number[] }>({ habitat: '', ids: [] });
  const suggestions = walkingSuggestions(
    discoveryRows,
    suggestionHistory.current.habitat === habitat.habitat ? suggestionHistory.current.ids : [],
    wanted,
  );
  useEffect(() => {
    if (suggestions.length)
      suggestionHistory.current = {
        habitat: habitat.habitat,
        ids: suggestions.map((s) => s.species.id),
      };
  }, [suggestions.map((s) => s.species.id).join(','), habitat.habitat]);
  const displayed = showAll ? discoveryRows.slice(0, visibleCount) : suggestions;
  const today = todaysSightings(sightings);
  useEffect(() => setVisibleCount(50), [query, focusCell, showAll]);
  const localNameResults = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (q.length < 2) return [];
    const species = new Map(
      [
        ...referenceSpecies,
        ...(field?.candidates.map((c) => c.species) ?? []),
        ...sightings.map((s) => s.species),
      ].map((s) => [s.id, s]),
    );
    return [...species.values()]
      .filter((s) =>
        [s.commonName, s.scientificName, ...s.alternativeNames].some((n) =>
          n.toLocaleLowerCase().includes(q),
        ),
      )
      .slice(0, 30);
  }, [query, field, sightings]);
  useEffect(() => {
    let active = true;
    setStoredNames([]);
    if (!externalSearch || query.trim().length < 2) return;
    const timer = setTimeout(() => {
      void Promise.all([searchStoredSpecies(query), import('../config/countryCatalogue')])
        .then(([saved, { countryCatalogue }]) => {
          const q = query.trim().toLowerCase();
          const rows = [
            ...saved,
            ...countryCatalogue
              .filter((s) =>
                [s.commonName, s.scientificName, ...s.alternativeNames].some((name) =>
                  name.toLowerCase().includes(q),
                ),
              )
              .slice(0, 30),
          ];
          if (active) setStoredNames(rows);
        })
        .catch(() => undefined);
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [externalSearch, query]);
  const nameResults = [
    ...new Map(
      [...externalResults, ...localNameResults, ...storedNames].map((s) => [s.id, s]),
    ).values(),
  ];
  const openSpecies = (species: Species) => {
    setToast('');
    setAttachment({ photo: view === 'name' ? lookupPhoto : undefined });
    setSelected(species);
  };
  const locate = useCallback(() => {
    void location.requestFix().catch((error) => setToast(error.message));
  }, [location.requestFix]);
  const prepareDiscovery = (operation: string) =>
    prepareEncounter(
      location.requestFix,
      async (fix) => ({
        species: await identificationCandidates(fix, 'local', AbortSignal.timeout(5000)),
        complete: true,
      }),
      operation,
    );
  const record = async (discovery?: {
    species: Species;
    photo?: Blob;
    identification: NonNullable<Sighting['identification']>;
    preparation: Promise<EncounterPreparation>;
    onPrepared: (sighting: Sighting) => void;
  }): Promise<Sighting | undefined> => {
    if ((!selected && !discovery) || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const species = discovery?.species ?? selected!;
    const attached = discovery
      ? { photo: discovery.photo, identification: discovery.identification }
      : attachment;
    const operation = diagnosticId();
    const started = performance.now();
    diagnostic('sighting.start', {
      operation,
      taxonId: species.id,
      photoId: attached.photo && photoId(attached.photo),
    });
    void protectStorage();
    try {
      const prepared = await (discovery?.preparation ??
        prepareEncounter(
          location.requestFix,
          async (fix) => {
            if (attached.identification || !groupConfig[species.group])
              return {
                species: await identificationCandidates(fix, 'local', AbortSignal.timeout(5000)),
                complete: true,
              };
            const result = await getCandidates(fix, 'unknown', Object.keys(groupConfig));
            return {
              species: result.data.candidates.map((c) => c.species),
              complete: result.data.complete,
            };
          },
          operation,
        ));
      if (!prepared.ok) throw prepared.error;
      const { fix, complete: candidateSetAvailable } = prepared;
      const actualCandidates = prepared.species.map((s) => s.id);
      const present = prepared.species.some(
        (s) =>
          s.id === species.id ||
          s.scientificName.trim().toLocaleLowerCase() ===
            species.scientificName.trim().toLocaleLowerCase(),
      );
      const sighting: Sighting = {
        id: crypto.randomUUID(),
        taxonId: species.id,
        lat: fix.lat,
        lng: fix.lng,
        accuracy: fix.accuracy,
        timestamp: fix.timestamp,
        cell: cellFor(fix),
        wasInCandidateSet: present,
        candidateSetAvailable,
        species,
        achievements: discoveryAchievements(
          species,
          sightings,
          cellFor(fix),
          candidateSetAvailable && !present,
        ),
        ...attached,
      };
      diagnostic('sighting.prepared', {
        operation,
        encounterOperation: prepared.operation,
        milliseconds: performance.now() - started,
        achievements: sighting.achievements?.map((award) => award.id),
      });
      discovery?.onPrepared(sighting);
      const writeStarted = performance.now();
      await saveSighting(sighting);
      diagnostic('sighting.saved', {
        operation,
        sightingId: sighting.id,
        encounterOperation: prepared.operation,
        persistenceMilliseconds: performance.now() - writeStarted,
        totalMilliseconds: performance.now() - started,
        taxonId: species.id,
        accuracy: fix.accuracy,
        photoBytes: attached.photo?.size,
        candidateSetAvailable,
        wasInCandidateSet: present,
      });
      // We already own this complete record and its photo. Do not reload every
      // private photo from SQLite/files just to add a single encounter to the UI.
      setSightings((previous) => [sighting, ...previous].sort((a, b) => b.timestamp - a.timestamp));
      setLookupPhoto(undefined);
      setAttachment({});
      if (!discovery && (view === 'identify' || view === 'name' || view === 'explore')) {
        setSelected(null);
        setView(view === 'explore' ? 'explore' : returnView);
        setExternalSearch(false);
      }
      const visitStarted = performance.now();
      void visitCell(sighting.cell, actualCandidates)
        .then(() => {
          diagnostic('sighting.visit', {
            operation,
            milliseconds: performance.now() - visitStarted,
          });
        })
        .catch((error) =>
          diagnostic('sighting.visit_error', { operation, ...errorDetails(error) }, 'warn'),
        );
      if (!discovery)
        setToast(
          `${word(species.commonName)} saved${!candidateSetAvailable ? ' · local records unavailable.' : present ? '.' : ' · unusual here.'}`,
        );
      return sighting;
    } catch (error) {
      diagnostic('sighting.error', { operation, ...errorDetails(error) }, 'error');
      if (discovery) throw error;
      setToast(error instanceof Error ? error.message : 'Could not save this sighting.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const toggleInterest = async (id: string) => {
    if (settingsSaving) return;
    const previous = interests;
    const next = interests.includes(id) ? interests.filter((i) => i !== id) : [...interests, id];
    setInterests(next);
    setSettingsSaving(true);
    try {
      await saveSettings({ ...(await getSettings()), id: 'preferences', interests: next });
    } catch {
      setInterests(previous);
      setToast('Could not save your preferences.');
    } finally {
      setSettingsSaving(false);
    }
  };
  const toggleWanted = async (species: Species) => {
    if (wantedSaving.current) return;
    wantedSaving.current = true;
    const next = wanted.includes(species.id)
      ? wanted.filter((id) => id !== species.id)
      : [...wanted, species.id];
    try {
      await saveSettings({ ...(await getSettings()), id: 'preferences', interests, wanted: next });
      setWanted(next);
    } catch {
      setToast('Could not save your look-out list.');
    } finally {
      wantedSaving.current = false;
    }
  };
  const undoDiscovery = async (id: string) => {
    await retractSighting(id);
    diagnostic('sighting.retracted', { sightingId: id });
    setSightings(await getSightings());
  };
  const navigate = (next: View) => {
    setNearbyOpen(false);
    setView(next);
    setExternalSearch(false);
    setQuery('');
    setShowAll(false);
    setLookupPhoto(undefined);
    setCaptureFile(undefined);
    setAttachment({});
    window.scrollTo(0, 0);
  };
  const startIdentify = () => capture.current?.click();
  const captured = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setReturnView('explore');
    navigate('identify');
    setIdentifyMode('photo');
    setCaptureFile(file);
  };
  const startName = () => {
    setReturnView(view);
    setView('name');
    setExternalSearch(true);
    setShowAll(true);
    setQuery('');
  };
  const openWhere = (species: Species, cells: string[] = []) => {
    setSelected(null);
    setWhere({ species, cells });
    setZoneId(null);
    setView('zones');
  };
  const openSightings = (species: Species | null = null) => {
    setSelected(null);
    setSightingSpecies(species);
    setView('sightings');
  };
  const visibleSightings = useMemo(
    () =>
      sightings.filter((s) =>
        view === 'sightings'
          ? !sightingSpecies ||
            s.species.scientificName.toLowerCase() === sightingSpecies.scientificName.toLowerCase()
          : interests.includes(s.species.group),
      ),
    [sightings, view, sightingSpecies, interests],
  );
  return (
    <div className={`app view-${view}${view === 'explore' && showAll ? ' walk-expanded' : ''}`}>
      <input
        ref={capture}
        hidden
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Photograph or choose an image"
        onChange={(e) => captured(e.currentTarget)}
      />
      <input
        ref={upload}
        hidden
        type="file"
        accept="image/*"
        aria-label="Choose an existing photo"
        onChange={(e) => captured(e.currentTarget)}
      />
      <header className="app-header">
        <button className="brand" onClick={() => navigate('explore')} aria-label="Explore home">
          <Leaf size={26} strokeWidth={1.6} />
          <span>fieldbook</span>
        </button>
        <div className="header-end">
          {view === 'explore' ? (
            <button className="secondary-button" onClick={() => navigate('collection')}>
              <BookOpen size={18} /> Fieldbook <span className="count-badge">{seenCount}</span>
            </button>
          ) : (
            <button className="secondary-button" onClick={() => navigate('explore')}>
              <Compass size={18} /> Explore
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Settings"
            onClick={() => {
              setSettingsReturn(view === 'identify' || view === 'name' ? returnView : view);
              navigate('settings');
            }}
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>
      {isFieldbook && (
        <nav className="fieldbook-nav" aria-label="Fieldbook views">
          <span>
            <BookOpen size={18} /> My fieldbook
          </span>
          <button
            aria-current={view === 'collection' ? 'page' : undefined}
            onClick={() => navigate('collection')}
          >
            Species
          </button>
          <button
            aria-current={view === 'zones' ? 'page' : undefined}
            onClick={() => {
              setWhere(null);
              if (!zoneId && location.fix)
                setZoneId(zones.find((z) => contains(location.fix!, z.geometry))?.id ?? null);
              navigate('zones');
            }}
          >
            Places
          </button>
          <button
            aria-current={view === 'sightings' ? 'page' : undefined}
            onClick={() => openSightings()}
          >
            Sightings
          </button>
        </nav>
      )}
      {(view === 'identify' || view === 'name' || view === 'settings') && (
        <div className="flow-back">
          <button
            className="text-button"
            onClick={() => navigate(view === 'settings' ? settingsReturn : returnView)}
          >
            <ArrowLeft size={18} /> {view === 'settings' ? 'Back' : 'Close identification'}
          </button>
        </div>
      )}
      {!online && (
        <div className="status-banner">
          <WifiOff size={14} /> Offline
        </div>
      )}
      {storageError && (
        <div className="status-banner error" role="alert">
          {storageError}
        </div>
      )}
      <main className="workspace">
        <aside
          id="field-panel"
          className="field-panel"
          hidden={view === 'explore' && !!location.fix && !nearbyOpen}
        >
          {(view === 'explore' || view === 'name') && (
            <>
              {view === 'name' ? (
                <div className="field-heading">
                  <h1>Find by name</h1>
                </div>
              ) : (
                <div className="walk-heading">
                  <h1>{showAll ? 'Nearby species' : 'Look out for'}</h1>
                  <span data-testid="active-habitat">{habitatLabels[habitat.habitat]}</span>
                  <button
                    className="icon-button"
                    aria-label="Search the species list"
                    onClick={() => {
                      setShowAll(true);
                      setTimeout(() => document.getElementById('plant-search')?.focus(), 20);
                    }}
                  >
                    <Search size={18} />
                  </button>
                  {location.fix && (
                    <button
                      className="icon-button"
                      aria-label="Close nearby species"
                      onClick={() => {
                        setNearbyOpen(false);
                        document.getElementById('nearby-toggle')?.focus();
                      }}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              )}
              {(showAll || externalSearch) && (
                <div className="search-area">
                  <label className="search-box">
                    <Search size={17} />
                    <input
                      id="plant-search"
                      placeholder={
                        externalSearch
                          ? 'Common or scientific name…'
                          : 'Search the full nearby list…'
                      }
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label="Search species"
                    />
                    {query && (
                      <button aria-label="Clear search" onClick={() => setQuery('')}>
                        <X size={15} />
                      </button>
                    )}
                  </label>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (view === 'name') setView('identify');
                      setShowAll(false);
                      setExternalSearch(false);
                      setQuery('');
                    }}
                  >
                    <ArrowLeft size={13} />{' '}
                    {view === 'name' ? 'Back to identification' : 'Back to walk'}
                  </button>
                </div>
              )}
              {view === 'explore' && !location.fix ? (
                <div className="empty-state">
                  <LocateFixed size={28} />
                  <h3>Find your surroundings</h3>

                  <button className="secondary-button" onClick={locate}>
                    Use my location
                  </button>
                  <button className="text-button" onClick={() => navigate('collection')}>
                    Open fieldbook
                  </button>
                </div>
              ) : !interests.length && !externalSearch ? (
                <div className="empty-state">
                  <Leaf size={28} />
                  <h3>No interests selected</h3>

                  <button className="secondary-button" onClick={() => setView('settings')}>
                    Choose interests
                  </button>
                </div>
              ) : externalSearch ? (
                <div className="plant-list">
                  {query.length < 2 && <p className="inline-note">Enter a species name.</p>}
                  {!online && (
                    <p className="inline-note">Searching names already saved on this device.</p>
                  )}
                  {searchStatus && (
                    <p className="inline-note" role="status">
                      {searchStatus}
                    </p>
                  )}
                  {nameResults.map((species) => (
                    <PlantRow
                      key={species.id}
                      item={{
                        species,
                        count: 0,
                        affinity: false,
                        seen: seen.has(species.id),
                        score: 0,
                        story: storyIndex.get(species.id),
                      }}
                      onOpen={openSpecies}
                    />
                  ))}
                </div>
              ) : fieldStatus === 'error' ? (
                <div className="empty-state">
                  <WifiOff size={28} />
                  <h3>No saved list for this spot yet</h3>
                  <p>{fieldError}</p>
                  <button className="secondary-button" onClick={() => setRefresh((n) => n + 1)}>
                    Try again
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      startName();
                    }}
                  >
                    Find a species by name
                  </button>
                </div>
              ) : (
                <>
                  {fieldStatus === 'loading' && (
                    <div className="loading-line" role="status">
                      <span className="spinner" /> {field ? 'Updating…' : 'Finding nearby species…'}
                    </div>
                  )}
                  <div
                    className={showAll ? 'plant-list' : 'lookout-cards'}
                    aria-busy={fieldStatus === 'loading'}
                  >
                    {displayed.map((item) =>
                      showAll ? (
                        <PlantRow key={item.species.id} item={item} onOpen={openSpecies} />
                      ) : (
                        <div
                          className="lookout-card"
                          key={item.species.id}
                          data-testid={`plant-${item.species.id}`}
                        >
                          <SpeciesImage species={item.species} large />
                          <button
                            className="lookout-name"
                            onClick={() => openSpecies(item.species)}
                          >
                            <strong>{word(item.species.commonName)}</strong>
                          </button>
                          <span className="lookout-reason">
                            {wanted.includes(item.species.id) && !item.seen
                              ? 'On your list'
                              : item.seen
                                ? 'Collected'
                                : themedCollections.some((t) => themeIncludes(t, item.species))
                                  ? `${themedCollections.find((t) => themeIncludes(t, item.species))!.name} collection`
                                  : 'New to you'}
                          </span>
                          <button
                            className="lookout-pin icon-button"
                            aria-label={`${wanted.includes(item.species.id) ? 'Stop looking for' : 'Look out for'} ${item.species.commonName}`}
                            aria-pressed={wanted.includes(item.species.id)}
                            onClick={() => void toggleWanted(item.species)}
                          >
                            <Star
                              size={15}
                              fill={wanted.includes(item.species.id) ? 'currentColor' : 'none'}
                            />
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                  {fieldStatus === 'ready' && !displayed.length && (
                    <div className="empty-state">
                      <Leaf size={25} />
                      <h3>
                        {query ? 'No matching species in this list' : 'More to discover here'}
                      </h3>
                      <p>
                        {query
                          ? 'Try another name, or look beyond the nearby records.'
                          : 'No nearby species records are available yet. You can still identify and record an encounter.'}
                      </p>
                    </div>
                  )}
                  {showAll && displayed.length < searched.length && (
                    <button className="see-all" onClick={() => setVisibleCount((n) => n + 50)}>
                      Show more · {displayed.length} of {searched.length.toLocaleString()}{' '}
                      <ArrowDown size={16} />
                    </button>
                  )}
                  {!showAll && field && (
                    <button className="see-all" onClick={() => setShowAll(true)}>
                      See all {field.total.toLocaleString()} species <ArrowRight size={16} />
                    </button>
                  )}
                  {field && (
                    <details className="source-details">
                      <summary>Nearby records</summary>
                      <p className="source-note">
                        {stale
                          ? 'Saved list · unable to refresh just now.'
                          : `${[...new Set(field.candidates.flatMap((c) => c.sources?.map((s) => s.provider) ?? [c.species.source?.provider ?? 'iNaturalist']))].join(' / ') || 'Species'} records · saved ${new Date(field.fetchedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
                      </p>
                    </details>
                  )}
                </>
              )}
              {view === 'explore' && today.length > 0 && (
                <section className="today-finds">
                  <h2>
                    Today <span>{today.length}</span>
                  </h2>
                  <div>
                    {today.map((s) => (
                      <div className="today-find" key={s.id}>
                        {s.photo ? (
                          <LocalPhoto photo={s.photo} alt={s.species.commonName} />
                        ) : (
                          <SpeciesImage species={s.species} />
                        )}
                        <button
                          onClick={() => openSpecies(s.species)}
                          aria-label={`Today: ${s.species.commonName}`}
                        >
                          {s.species.commonName}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
          {view === 'sightings' && (
            <>
              <div className="field-heading">
                <h1>{sightingSpecies ? sightingSpecies.commonName : 'Your sightings'}</h1>
                <p>{visibleSightings.length} sightings</p>
              </div>
              {sightingSpecies && (
                <button className="text-button" onClick={() => setSightingSpecies(null)}>
                  Show all sightings
                </button>
              )}
              {visibleSightings.length ? (
                <div className="sighting-list">
                  {visibleSightings.map((s) => (
                    <div className="sighting-row" key={s.id}>
                      <>
                        {s.photo ? (
                          <LocalPhoto photo={s.photo} alt="Your sighting photograph" />
                        ) : (
                          <SpeciesImage species={s.species} />
                        )}
                      </>
                      <button className="photo-row-details" onClick={() => openSpecies(s.species)}>
                        <span>
                          <strong>{word(s.species.commonName)}</strong>
                          <span className="latin">{s.species.scientificName}</span>
                          <small>
                            {new Date(s.timestamp).toLocaleString(undefined, {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {s.achievements?.some((a) => a.id === 'first-here') &&
                              ' · First discovery here'}
                          </small>
                        </span>
                        <Check size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state notebook-empty">
                  <BookOpen size={36} strokeWidth={1} />
                  <h3>No sightings yet</h3>
                  <button className="secondary-button" onClick={() => setView('explore')}>
                    Explore nearby species <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </>
          )}

          {view === 'identify' && (
            <Suspense fallback={<p>Opening recognition…</p>}>
              <Identify
                point={location.fix ?? focus}
                initialPhoto={lookupPhoto}
                initialFile={captureFile}
                initialMode={identifyMode}
                onPrepare={prepareDiscovery}
                onDiscover={async (species, photo, identification, preparation, onPrepared) => {
                  const result = await record({
                    species,
                    photo,
                    identification,
                    preparation,
                    onPrepared,
                  });
                  if (!result) throw new Error('A sighting is already being saved.');
                  return result;
                }}
                onUndo={undoDiscovery}
                onContinue={() => navigate('explore')}
                onSelect={(species, photo, identification) => {
                  openSpecies(species);
                  setAttachment({ photo, identification });
                }}
                onName={(photo) => {
                  setLookupPhoto(photo);
                  setView('name');
                  setExternalSearch(true);
                  setShowAll(true);
                  setQuery('');
                }}
              />
            </Suspense>
          )}
          {view === 'zones' && (
            <Suspense fallback={<p>Opening places…</p>}>
              <Places
                zoneId={zoneId}
                onZone={setZoneId}
                sightings={sightings}
                interests={interests}
                onOpen={openSpecies}
                findSpecies={where?.species}
              />
            </Suspense>
          )}
          {view === 'collection' && (
            <Suspense fallback={<p>Opening your collection…</p>}>
              <Collection
                sightings={sightings}
                interests={interests}
                onOpen={openSpecies}
                onWhere={openWhere}
                onSightings={openSightings}
              />
            </Suspense>
          )}
          {view === 'settings' && (
            <>
              <div className="field-heading">
                <h1>Settings</h1>
              </div>
              <div className="settings-content">
                <Diagnostics />
                <Suspense fallback={null}><SourceCredits /></Suspense>
                <section>
                  <h2>Your interests</h2>

                  {Object.entries(groupConfig).map(([id, g]) => (
                    <label className="interest-option" key={id}>
                      <span>
                        <Leaf size={20} />
                        {g.label}
                      </span>
                      <input
                        type="checkbox"
                        disabled={settingsSaving}
                        checked={interests.includes(id)}
                        onChange={() => void toggleInterest(id)}
                      />
                    </label>
                  ))}
                </section>
                <section>
                  <h2>Location & compass</h2>
                  <p>
                    {location.fix
                      ? `Location accuracy: about ${Math.round(location.fix.accuracy)} metres.`
                      : 'Location is needed to save where you see something.'}
                  </p>
                  <button className="secondary-button" onClick={locate}>
                    <LocateFixed size={16} /> Use my location
                  </button>
                  <p>
                    {compass.heading !== null
                      ? `Heading: ${Math.round(compass.heading)}°`
                      : 'No compass reading yet. Your map stays north-up.'}
                  </p>
                  {compass.permission === 'needed' && (
                    <button className="secondary-button" onClick={() => void compass.request()}>
                      <Compass size={16} /> Enable compass
                    </button>
                  )}
                </section>
                <NotebookBackup />
                <section>
                  <p className="small-note">
                    {stats.cells} visited areas · {stats.tiles} saved map tiles ·{' '}
                    {(stats.mapBytes / 1024 / 1024).toFixed(1)} MB
                  </p>
                </section>
                {!nativeAndroid && (
                  <section>
                    <h2>Install</h2>
                    {install ? (
                      <button
                        className="primary-button"
                        onClick={() =>
                          void install
                            .prompt()
                            .then(() => install.userChoice)
                            .then((choice) => {
                              if (choice.outcome === 'accepted') setInstall(null);
                            })
                        }
                      >
                        <Download size={16} /> Install Fieldbook
                      </button>
                    ) : (
                      <p className="small-note">
                        On iPhone, open this address in Safari, tap Share, then Add to Home Screen.
                        Enable Open as Web App if offered. Open Fieldbook from that icon before
                        saving your first sighting.
                      </p>
                    )}
                      <p className="small-note">
                        {update ? 'A new version is available.' : 'Get the latest app and species notes.'}{' '}
                        <button
                          className="text-button"
                          disabled={updating}
                          onClick={() => {
                            setUpdating(true);
                            setUpdateError('');
                            void applyAppUpdate()
                              .catch((error) => setUpdateError(String(error)))
                              .finally(() => setUpdating(false));
                          }}
                        >
                          {updating ? 'Updating…' : 'Update and reload'}
                        </button>
                      </p>
                    {updateError && <p role="alert">{updateError}</p>}
                  </section>
                )}
              </div>
            </>
          )}
        </aside>
        <div className="map-column" hidden={!['explore', 'zones', 'sightings'].includes(view)}>
          <Suspense fallback={<div className="map-panel map-loading">Opening your map…</div>}>
            <FieldMap
              zone={activeZone}
              onZone={setZoneId}
              mode={mapMode}
              where={view === 'zones' ? where : null}
              onCloseWhere={() => setWhere(null)}
              focus={focus}
              habitat={habitat}
              fix={location.fix}
              heading={compass.heading}
              following={following}
              sightings={visibleSightings}
              onLocate={locate}
              onOpenSighting={(s) => openSpecies(s.species)}
            />
          </Suspense>
          <div className="map-footer">
            <span>
              <span className="legend-dot wood" /> Woodland
            </span>
            <span>
              <span className="legend-dot wetland" /> Wetland
            </span>
            <span>
              <span className="legend-dot water" /> Water
            </span>
            <span className="map-footer-end">
              {compass.heading !== null ? `${Math.round(compass.heading)}° · north-up` : 'NORTH-UP'}
            </span>
          </div>
        </div>
      </main>
      {view !== 'identify' && view !== 'name' && view !== 'settings' && (
        <div className="identify-action">
          <button
            className="primary-button camera-action"
            aria-label="Identify"
            onClick={startIdentify}
          >
            <Camera size={28} />
          </button>
          <details className="capture-menu">
            <summary aria-label="More identification options">
              <MoreHorizontal size={23} />
            </summary>
            <div>
              <button onClick={() => upload.current?.click()}>Choose a photo</button>
              {offlineRecognitionAvailable && (
                <button
                  onClick={() => {
                    setReturnView('explore');
                    navigate('identify');
                    setIdentifyMode('describe');
                  }}
                >
                  Describe
                </button>
              )}
              <button onClick={startName}>Find by name</button>
              {offlineRecognitionAvailable && (
                <button
                  onClick={() => {
                    setReturnView('explore');
                    navigate('identify');
                    setIdentifyMode('offline');
                  }}
                >
                  Recognition downloads
                </button>
              )}
            </div>
          </details>
        </div>
      )}
      {view === 'explore' && (
        <div className="walk-chips">
          <button
            id="nearby-toggle"
            className="walk-chip"
            aria-expanded={!location.fix || nearbyOpen}
            aria-controls="field-panel"
            disabled={!location.fix}
            onClick={() => setNearbyOpen((open) => !open)}
          >
            <Leaf size={16} /> Nearby
          </button>
          {today.length > 0 && (
            <button className="walk-chip" onClick={() => openSightings()}>
              <BookOpen size={16} /> Today <strong>{today.length}</strong>
            </button>
          )}
        </div>
      )}
      {selected && (
        <SpeciesSheet
          key={selected.id}
          species={selected}
          story={storyIndex.get(selected.id)}
          candidate={
            view === 'explore'
              ? field?.candidates.find((c) => c.species.id === selected.id)
              : undefined
          }
          wanted={wanted.includes(selected.id)}
          onWant={() => void toggleWanted(selected)}
          achievements={sightings
            .filter((s) => s.taxonId === selected.id)
            .flatMap((s) => s.achievements ?? [])}
          seen={seen.has(selected.id)}
          saving={saving}
          interestLabel={
            !interests.includes(selected.group) ? groupConfig[selected.group]?.label : undefined
          }
          onEnableInterest={() => void toggleInterest(selected.group)}
          message={toast}
          canLocate={!!location.fix}
          onClose={() => setSelected(null)}
          onSave={() => void record()}
          onWhere={isFieldbook ? () => openWhere(selected) : undefined}
          onSightings={
            isFieldbook && seen.has(selected.id) ? () => openSightings(selected) : undefined
          }
        />
      )}
      {toast && !selected && (
        <div className="toast" role="status">
          <Check size={16} />
          <span>{toast}</span>
          <button aria-label="Dismiss message" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
