import type { Point, Species } from '../types';
import { country, countryId } from '../../config/app';
import { identificationConfig as config } from '../../config/identification';
import { getRange, saveRange } from '../store';
import { cellFor, cellCentre, coveredRadius } from '../species/geo';
import { speciesCounts } from '../species/client';
export type IdentificationScope = 'local' | 'regional' | 'country';
const pending = new Map<string, Promise<Species[]>>();
export function mergeRecognitionCandidates(countrySpecies: Species[], areaSpecies: Species[]) {
  const result = new Map(countrySpecies.map((species) => [species.id, species]));
  for (const species of areaSpecies) result.set(species.id, species);
  return [...result.values()];
}

export async function recognitionCandidates(
  point: Point,
  scope: IdentificationScope,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const countryRange = await getRange(`id:${countryId}:country:country`);
  if (!countryRange?.complete)
    throw new Error('Prepare the downloaded country references before identifying.');
  const key = `id:${countryId}:${cellFor(point)}:${scope}`;
  let area = scope === 'country' ? undefined : await getRange(key);
  // First identification can use the installed country immediately. A live
  // local list describes occurrence; it must not exclude stronger photo matches.
  if (scope === 'regional' && !area?.complete && navigator.onLine) {
    const species = await identificationCandidates(point, scope, signal);
    area = { key, species, fetchedAt: Date.now(), complete: true };
  } else if (scope === 'local' && navigator.onLine) {
    void identificationCandidates(point, scope).catch(() => undefined);
  }
  signal?.throwIfAborted();
  const areaSpecies = area?.complete ? area.species : [];
  return {
    candidates: mergeRecognitionCandidates(countryRange.species, areaSpecies),
    areaSpecies,
    areaAvailable: !!area?.complete,
    referencePack: countryRange.referencePack,
  };
}
function cancellable<T>(task: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return task;
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const cancel = () => reject(signal.reason);
    signal.addEventListener('abort', cancel, { once: true });
    task.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
  });
}
export async function identificationCandidates(
  point: Point,
  scope: IdentificationScope,
  signal?: AbortSignal,
): Promise<Species[]> {
  signal?.throwIfAborted();
  const cell = cellFor(point),
    key = `id:${countryId}:${scope === 'country' ? 'country' : cell}:${scope}`,
    old = await getRange(key);
  signal?.throwIfAborted();
  const refresh = () => {
    let task = pending.get(key);
    if (!task) {
      task = (async () => {
        const centre = cellCentre(cell),
          params: Record<string, string | number> =
            scope === 'country'
              ? { place_id: country.iNatPlaceId }
              : {
                  lat: centre.lat,
                  lng: centre.lng,
                  radius: scope === 'regional' ? config.regionalRadius : coveredRadius(cell),
                };
        // No interest or iconic-taxon restriction. Background and foreground widening share this request.
        const species = (await speciesCounts(params)).map((c) => c.species);
        await saveRange({ key, species, fetchedAt: Date.now(), complete: true });
        return species;
      })().finally(() => pending.delete(key));
      pending.set(key, task);
    }
    return task;
  };
  if (old?.complete) {
    // The downloaded country list is tied to its prepared reference pack.
    // Live local/regional lists can refresh independently, but must not replace it.
    if (scope !== 'country' && navigator.onLine && Date.now() - old.fetchedAt >= 14 * 86400000)
      void refresh().catch(() => undefined);
    return old.species;
  }
  if (!navigator.onLine)
    throw new Error(
      'This area’s species list is not saved. Widen to the downloaded country list, or find a saved species by name.',
    );
  return cancellable(refresh(), signal);
}
