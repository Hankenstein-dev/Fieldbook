import { useEffect, useMemo, useState } from 'react';
import type { Sighting, Species, VisitedCell } from '../types';
import { watchCollection } from '../store';
import { referenceSpecies, country } from '../../config/app';
import { countryCatalogue } from '../../config/countryCatalogue';
import { buildCollection, sortCollection } from '../collection';
import { themedCollections, themeIncludes, themeProgress } from '../../config/discovery';
import SpeciesImage from '../components/SpeciesImage';
export default function Collection({
  sightings,
  interests,
  onOpen,
  onWhere,
  onSightings,
}: {
  sightings: Sighting[];
  interests: string[];
  onOpen: (s: Species) => void;
  onWhere: (s: Species, cells: string[]) => void;
  onSightings: (s: Species) => void;
}) {
  const [data, setData] = useState<{ species: Species[]; visits: VisitedCell[] }>({
    species: referenceSpecies,
    visits: [],
  });
  const [error, setError] = useState('');
  const [sort, setSort] = useState<'group' | 'recency'>('group');
  const [query, setQuery] = useState('');
  const [themeId, setThemeId] = useState<string | null>(null);
  const theme = themedCollections.find((t) => t.id === themeId);
  const [limit, setLimit] = useState(60);
  useEffect(
    () =>
      watchCollection(
        ({ species, visits }) => setData({ species: [...referenceSpecies, ...species], visits }),
        () => setError('Could not read your saved collection.'),
      ),
    [],
  );
  const book = useMemo(
    () =>
      buildCollection(
        [...countryCatalogue, ...data.species],
        data.visits,
        sightings,
        interests,
        countryCatalogue.map((s) => s.id),
      ),
    [data, sightings, interests],
  );
  const entries = sortCollection(book.entries, sort).filter(
    (entry) =>
      (!theme || themeIncludes(theme, entry.species)) &&
      [
        entry.species.commonName,
        entry.species.scientificName,
        ...entry.species.alternativeNames,
      ].some((name) => name.toLowerCase().includes(query.toLowerCase())),
  );
  useEffect(() => setLimit(60), [query]);
  return (
    <>
      <div className="field-heading">
        <h1>Your fieldbook</h1>
        <p data-testid="collection-progress">
          {book.seen} of {book.total.toLocaleString()} collected · {country.name}
        </p>
        {book.extraSeen > 0 && <p>+ {book.extraSeen} discoveries elsewhere</p>}
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="theme-collections" aria-label="Collections">
        <button aria-pressed={!themeId} onClick={() => setThemeId(null)}>
          All species
        </button>
        {themedCollections.map((t) => (
          <button key={t.id} aria-pressed={themeId === t.id} onClick={() => setThemeId(t.id)}>
            <strong>{t.name}</strong>
            <span>
              {themeProgress(
                t,
                book.entries.filter((e) => e.seen).map((e) => e.species),
              )}{' '}
              / {t.taxonIds.length}
            </span>
          </button>
        ))}
      </div>
      <div className="collection-tools">
        <label className="search-box">
          <input
            aria-label="Search your fieldbook"
            placeholder="Search your fieldbook…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Order{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="group">By group</option>
            <option value="recency">Recently seen</option>
          </select>
        </label>
      </div>
      <div className="collection-grid">
        {entries.slice(0, limit).map((e) => (
          <div className="collection-entry" key={e.species.id}>
            <div className={e.seen ? 'collection-image' : 'collection-image unseen'}>
              <SpeciesImage species={e.species} />
            </div>
            <button
              onClick={() => onOpen(e.species)}
              className={e.seen ? '' : 'unseen'}
              aria-label={`${e.species.commonName}${e.seen ? ' · collected' : ' · not yet collected'}`}
            >
              <strong>{e.species.commonName}</strong>
              <span className={`collection-status ${e.seen ? 'collected' : 'missing'}`}>
                {e.seen ? 'Collected' : 'Not yet collected'}
              </span>
            </button>
            {(e.cells.length > 0 || e.species.id > 0) && (
              <button className="text-button" onClick={() => onWhere(e.species, e.cells)}>
                Where to find it
              </button>
            )}
            {e.seen && (
              <button className="text-button" onClick={() => onSightings(e.species)}>
                {e.sightings} {e.sightings === 1 ? 'sighting' : 'sightings'} · view on map
              </button>
            )}
          </div>
        ))}
      </div>
      {!entries.length && (
        <p>No matching entries. Try another name or check your interests in Settings.</p>
      )}
      {limit < entries.length && (
        <button className="see-all" onClick={() => setLimit((n) => n + 60)}>
          Show more · {limit} of {entries.length}
        </button>
      )}

      {book.unresolved > 0 && <p>{book.unresolved} saved taxa still need their names restored.</p>}
    </>
  );
}
