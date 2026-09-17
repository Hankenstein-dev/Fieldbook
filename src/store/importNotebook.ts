import { decodeSighting } from '../backup/format';
import { getSettings, restoreSighting, restoreVisit, saveSettings, saveSpecies } from './index';
import type { Species, VisitedCell } from '../types';
export function parseNotebook(text: string) {
  const value = JSON.parse(text);
  if (
    value?.schemaVersion !== 2 ||
    !Array.isArray(value.sightings) ||
    !Array.isArray(value.visitedCells)
  )
    throw new Error('Choose a Fieldbook JSON export.');
  const sightings = value.sightings.map((s: Record<string, unknown>) => {
    if (
      s.photo !== undefined &&
      (!s.photo ||
        typeof s.photo !== 'object' ||
        typeof (s.photo as { data?: unknown }).data !== 'string')
    )
      throw new Error('Invalid photo in export.');
    return decodeSighting({ ...s, photo: (s.photo as { data?: string } | undefined)?.data });
  });
  const visits = value.visitedCells as VisitedCell[];
  if (
    !visits.every(
      (v) =>
        typeof v.cell === 'string' &&
        v.cell.length <= 20 &&
        Number.isFinite(v.firstVisitedAt) &&
        Number.isFinite(v.lastVisitedAt) &&
        Array.isArray(v.taxonIds) &&
        v.taxonIds.every(Number.isInteger),
    )
  )
    throw new Error('Invalid visited areas in export.');
  const species = (value.species ?? []) as Species[];
  if (
    !Array.isArray(species) ||
    !species.every(
      (s) =>
        Number.isInteger(s.id) &&
        typeof s.commonName === 'string' &&
        typeof s.scientificName === 'string' &&
        typeof s.group === 'string' &&
        Array.isArray(s.alternativeNames) &&
        s.alternativeNames.every((n) => typeof n === 'string'),
    )
  )
    throw new Error('Invalid species in export.');
  const preferences = value.preferences;
  if (
    preferences !== undefined &&
    (preferences?.id !== 'preferences' ||
      !Array.isArray(preferences.interests) ||
      !preferences.interests.every((s: unknown) => typeof s === 'string') ||
      (preferences.wanted !== undefined &&
        (!Array.isArray(preferences.wanted) || !preferences.wanted.every(Number.isInteger))))
  )
    throw new Error('Invalid preferences in export.');
  return { sightings, visits, species, preferences };
}
export async function importNotebook(text: string) {
  // Validate the whole export before any writes. Re-imports merge by original ID;
  // a failed disk write can be retried without duplicating or replacing sightings.
  const value = parseNotebook(text);
  await saveSpecies(value.species);
  for (const sighting of value.sightings) await restoreSighting(sighting);
  for (const visit of value.visits) await restoreVisit(visit);
  if (value.preferences && !(await getSettings())) await saveSettings(value.preferences);
  return value.sightings.length;
}
