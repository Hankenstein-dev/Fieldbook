import { themedCollections, themeIncludes, themeProgress } from '../../config/discovery';
import type { RankedCandidate, Sighting, Species } from '../types';

export const sameSpecies = (a: Species, b: Species) =>
  a.id === b.id || a.scientificName.trim().toLowerCase() === b.scientificName.trim().toLowerCase();

export function discoveryAchievements(
  species: Species,
  sightings: Sighting[],
  cell: string,
  firstInRecords: boolean,
) {
  const previous = sightings.filter((s) => !s.retractedAt);
  const fresh = !previous.some((s) => sameSpecies(s.species, species));
  const awards: NonNullable<Sighting['achievements']> = [];
  if (fresh) awards.push({ id: 'new-species', label: 'New to your fieldbook' });
  if (firstInRecords && !previous.some((s) => s.cell === cell && sameSpecies(s.species, species)))
    awards.push({ id: 'first-here', label: 'First discovery here' });
  const unique =
    new Set(previous.map((s) => s.species.scientificName.trim().toLowerCase())).size +
    Number(fresh);
  if (fresh && [5, 10, 25, 50, 100, 250, 500, 1000].includes(unique))
    awards.push({ id: `milestone-${unique}`, label: `${unique} species discovered` });
  for (const theme of themedCollections) {
    if (
      fresh &&
      themeIncludes(theme, species) &&
      themeProgress(theme, [...previous.map((s) => s.species), species]) === theme.taxonIds.length
    )
      awards.push({ id: `collection-${theme.id}`, label: `${theme.name} collection complete` });
  }

  return awards;
}

export function walkingSuggestions(
  rows: RankedCandidate[],
  previous: number[],
  wanted: number[],
  limit = 3,
) {
  const order = (r: RankedCandidate) =>
    wanted.includes(r.species.id) && !r.seen ? 0 : !r.seen ? 1 : 2;
  return [...rows]
    .sort((a, b) => {
      const priority = order(a) - order(b);
      if (priority) return priority;
      const ai = previous.indexOf(a.species.id),
        bi = previous.indexOf(b.species.id);
      if (ai >= 0 || bi >= 0) return ai < 0 ? 1 : bi < 0 ? -1 : ai - bi;
      return b.score - a.score || a.species.id - b.species.id;
    })
    .slice(0, limit);
}

export function todaysSightings(sightings: Sighting[], now = new Date()) {
  return sightings.filter(
    (s) => !s.retractedAt && new Date(s.timestamp).toDateString() === now.toDateString(),
  );
}
