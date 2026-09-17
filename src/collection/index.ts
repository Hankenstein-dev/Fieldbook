import type { Species, Sighting, VisitedCell } from '../types';
export interface CollectionEntry {
  species: Species;
  seen: boolean;
  lastSeen: number;
  sightings: number;
  cells: string[];
  inVisitedCatalogue: boolean;
}
export function buildCollection(
  species: Species[],
  visits: VisitedCell[],
  sightings: Sighting[],
  interests: string[],
  checklistIds?: number[],
) {
  const catalogue = new Map(species.map((s) => [s.id, s]));
  sightings.forEach((s) => catalogue.set(s.taxonId, s.species));
  // Merge provider aliases, but never merge a species with a broader complex
  // sharing its scientific name. Each has its own identity, notes and sightings.
  const identity = (s: Species) =>
    [s.group, s.rank, s.scientificName].map((part) => part.trim().toLocaleLowerCase()).join('\u0000');
  const byName = new Map<string, Species>();
  for (const s of catalogue.values()) {
    const key = identity(s);
    if (!byName.has(key) || s.id > 0) byName.set(key, s);
  }
  const canonical = (id: number) => {
    const s = catalogue.get(id);
    return s ? byName.get(identity(s))!.id : id;
  };
  const cells = new Map<number, string[]>();
  for (const visit of visits)
    for (const id of new Set(visit.taxonIds.map(canonical)))
      cells.set(id, [...(cells.get(id) ?? []), visit.cell]);
  const observed = new Map<number, Sighting[]>();
  for (const s of sightings)
    observed.set(canonical(s.taxonId), [...(observed.get(canonical(s.taxonId)) ?? []), s]);
  const checklist = new Set((checklistIds ?? [...cells.keys()]).map(canonical));
  const entries: CollectionEntry[] = [];
  let unresolved = 0;
  for (const id of new Set([...checklist, ...observed.keys()])) {
    const s = catalogue.get(id);
    if (!s) {
      unresolved++;
      continue;
    }
    if (!interests.includes(s.group)) continue;
    const logs = observed.get(id) ?? [];
    entries.push({
      species: s,
      seen: !!logs.length,
      lastSeen: Math.max(0, ...logs.map((s) => s.timestamp)),
      sightings: logs.length,
      cells: cells.get(id) ?? [],
      inVisitedCatalogue: checklist.has(id),
    });
  }
  const total = entries.filter((e) => e.inVisitedCatalogue).length,
    seen = entries.filter((e) => e.inVisitedCatalogue && e.seen).length;
  return {
    entries,
    total,
    seen,
    extraSeen: entries.filter((e) => !e.inVisitedCatalogue && e.seen).length,
    unresolved,
  };
}
export function sortCollection(entries: CollectionEntry[], sort: 'group' | 'recency') {
  return [...entries].sort((a, b) =>
    sort === 'recency'
      ? b.lastSeen - a.lastSeen || a.species.scientificName.localeCompare(b.species.scientificName)
      : a.species.group.localeCompare(b.species.group) ||
        Number(!!b.species.photo) - Number(!!a.species.photo) ||
        a.species.commonName.localeCompare(b.species.commonName),
  );
}
