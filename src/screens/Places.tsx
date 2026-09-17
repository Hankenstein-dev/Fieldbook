import { useMemo, useState, useEffect } from 'react';
import { Check, MapPin } from 'lucide-react';
import { zones } from '../../config/zones';
import { country } from '../../config/app';
import { countryCatalogue } from '../../config/countryCatalogue';
import rawChecklists from '../../config/generated/zone-checklists.json';
import SpeciesImage from '../components/SpeciesImage';
import type { Species, Sighting } from '../types';
type Checklist = {
  counts: Record<string, number>;
  fetchedAt: number;
  source: string;
  complete: boolean;
};
const checklists: Record<string, Checklist> = rawChecklists;
const index = new Map(countryCatalogue.map((s) => [s.id, s]));

export default function Places({
  zoneId,
  onZone,
  sightings,
  interests,
  onOpen,
  findSpecies,
}: {
  zoneId: string | null;
  onZone: (id: string) => void;
  sightings: Sighting[];
  interests: string[];
  onOpen: (species: Species) => void;
  findSpecies?: Species;
}) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(50);
  const names = useMemo(
    () => new Set(sightings.map((s) => s.species.scientificName.toLowerCase())),
    [sightings],
  );
  const zone = zones.find((z) => z.id === zoneId);
  const speciesFor = (id: string) => [
    ...new Map(
      Object.keys(checklists[id]?.counts ?? {})
        .map(Number)
        .map((id) => index.get(id))
        .filter((s): s is Species => !!s && interests.includes(s.group))
        .map((species) => [species.scientificName.toLowerCase(), species]),
    ).values(),
  ];
  const entries = zone ? speciesFor(zone.id) : [];
  const seen = (s: Species) => names.has(s.scientificName.toLowerCase());
  const missing = entries.filter((s) => !seen(s)).length;
  const filtered = entries
    .filter((s) =>
      [s.commonName, s.scientificName, ...s.alternativeNames].some((name) =>
        name.toLowerCase().includes(query.toLowerCase()),
      ),
    )
    .sort((a, b) => Number(seen(a)) - Number(seen(b)) || a.commonName.localeCompare(b.commonName));
  useEffect(() => {
    setQuery('');
    setLimit(50);
  }, [zoneId]);
  return (
    <>
      <div className="field-heading">
        <h1>{findSpecies ? 'Where to find it' : 'Places'}</h1>
        <p>{findSpecies ? `Recorded areas for ${findSpecies.commonName}.` : country.name}</p>
      </div>
      <div className="zone-list" aria-label="Zones">
        {zones.map((z) => {
          const species = speciesFor(z.id);
          const count = species.filter((s) => !seen(s)).length;
          const occurs =
            !findSpecies ||
            species.some(
              (s) => s.scientificName.toLowerCase() === findSpecies.scientificName.toLowerCase(),
            );
          return (
            <button
              key={z.id}
              className={`zone-option${z.id === zoneId ? ' active' : ''}`}
              aria-pressed={z.id === zoneId}
              onClick={() => onZone(z.id)}
            >
              <span>{z.name}</span>
              <small>
                {findSpecies
                  ? occurs
                    ? 'Recorded here'
                    : 'No records in this checklist'
                  : `${count.toLocaleString()} to discover`}
              </small>
            </button>
          );
        })}
      </div>
      {zone ? (
        <>
          <div className="list-heading">
            <div>
              <h2>{zone.name}</h2>
              <span data-testid="zone-progress">
                {entries.length - missing} of {entries.length.toLocaleString()} collected ·{' '}
                {missing.toLocaleString()} to discover
              </span>
            </div>
          </div>

          <label className="search-box">
            <input
              aria-label="Search zone species"
              placeholder="Search this zone…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(50);
              }}
            />
          </label>
          <div className="plant-list">
            {filtered.slice(0, limit).map((species) => (
              <div className="plant-row" key={species.id} data-testid={`plant-${species.id}`}>
                <SpeciesImage species={species} />
                <button className="photo-row-details" onClick={() => onOpen(species)}>
                  <span className="plant-description">
                    <strong>{species.commonName}</strong>
                    <span className="latin">{species.scientificName}</span>
                    <span
                      className={`collection-status ${seen(species) ? 'collected' : 'missing'}`}
                    >
                      {seen(species) ? (
                        <>
                          <Check size={12} /> Collected
                        </>
                      ) : (
                        'Not yet collected'
                      )}
                    </span>
                  </span>
                </button>
              </div>
            ))}
          </div>
          {!filtered.length && <p>No matching species in this saved checklist.</p>}
          {filtered.length > limit && (
            <button className="see-all" onClick={() => setLimit((n) => n + 50)}>
              Show more · {limit} of {filtered.length}
            </button>
          )}
          <p className="source-note">
            <a href={checklists[zone.id]?.source} target="_blank" rel="noreferrer">
              iNaturalist records
            </a>{' '}
            · {new Date(checklists[zone.id]?.fetchedAt).toLocaleDateString()}
          </p>
        </>
      ) : (
        <p className="inline-note">
          <MapPin size={16} /> Choose a zone
        </p>
      )}
    </>
  );
}
