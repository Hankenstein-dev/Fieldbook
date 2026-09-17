import { expect, it } from 'vitest';
import { buildCollection, sortCollection } from './index';
import type { Species, Sighting, VisitedCell } from '../types';
const species = (id: number, group = 'plants'): Species => ({
  id,
  group,
  scientificName: `Species ${id}`,
  commonName: `Species ${id}`,
  rank: 'species',
  alternativeNames: [],
});
const visit = (cell: string, ids: number[]): VisitedCell => ({
  cell,
  taxonIds: ids,
  firstVisitedAt: 1,
  lastVisitedAt: 2,
});
const sighting = (s: Species, timestamp = 3) =>
  ({ id: String(timestamp), taxonId: s.id, species: s, timestamp }) as Sighting;
it('counts the physical union once, applies interests, and keeps out-of-catalogue sightings outside the denominator', () => {
  const s = [species(1), species(2), species(3, 'other'), species(4), species(5)];
  const b = buildCollection(
    s,
    [visit('one', [1, 2, 3]), visit('two', [2, 3])],
    [sighting(s[0]), sighting(s[0], 4), sighting(s[3])],
    ['plants'],
  );
  expect([b.seen, b.total, b.extraSeen]).toEqual([1, 2, 1]);
  expect(b.entries.map((e) => e.species.id)).toEqual([1, 2, 4]);
  expect(b.entries.find((e) => e.species.id === 2)?.cells).toEqual(['one', 'two']);
  expect(sortCollection(b.entries, 'recency')[0].sightings).toBe(2);
});
it('does not count remotely browsed species, and reports unresolved historical metadata', () => {
  const b = buildCollection([species(1), species(2)], [visit('here', [1, 999])], [], ['plants']);
  expect(b.total).toBe(1);
  expect(b.unresolved).toBe(1);
});
it('recognises one exact scientific name across fallback and primary records', () => {
  const primary = species(1),
    fallback = { ...primary, id: -987 };
  const b = buildCollection(
    [primary, fallback],
    [visit('here', [-987, 1])],
    [sighting(fallback)],
    ['plants'],
  );
  expect([b.total, b.seen, b.entries.length]).toEqual([1, 1, 1]);
});

it('keeps an oak species and its same-name complex as separate cards and sightings', () => {
  const oak = { ...species(56133), scientificName: 'Quercus robur', commonName: 'English oak' };
  const complex = { ...oak, id: 1520309, rank: 'complex', commonName: 'Pedunculate Oak Complex' };
  const b = buildCollection([oak, complex], [visit('here', [complex.id])], [sighting(oak)], ['plants'], [oak.id, complex.id]);
  expect(b.total).toBe(2);
  expect(b.entries.find((e) => e.species.id === oak.id)).toMatchObject({ seen: true, sightings: 1, cells: [] });
  expect(b.entries.find((e) => e.species.id === complex.id)).toMatchObject({ seen: false, sightings: 0, cells: ['here'] });
});

it('fills country and zone checklists from a sighting anywhere, without requiring a visit', () => {
  const tree = species(1),
    flower = species(2);
  const logs = [sighting(tree), sighting(tree, 4)];
  const country = buildCollection([tree, flower], [], logs, ['plants'], [1, 2]);
  const anotherZone = buildCollection([tree, flower], [], logs, ['plants'], [1]);
  expect([country.seen, country.total]).toEqual([1, 2]);
  expect([anotherZone.seen, anotherZone.total]).toEqual([1, 1]);
  expect(country.entries[0].sightings).toBe(2);
  expect(country.entries[0].cells).toEqual([]);
});

it('does not change the country denominator when browsing or visiting another area', () => {
  const taxa = [species(1), species(2), species(3)];
  const before = buildCollection(taxa, [], [], ['plants'], [1, 2]);
  const after = buildCollection(taxa, [visit('new', [2, 3])], [], ['plants'], [1, 2]);
  expect(after.total).toBe(before.total);
  expect(after.entries.map((e) => e.species.id)).toEqual([1, 2]);
});
