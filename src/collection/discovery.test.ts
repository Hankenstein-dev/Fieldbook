import { describe, expect, it } from 'vitest';
import { discoveryAchievements, walkingSuggestions, todaysSightings } from './discovery';
import type { RankedCandidate, Sighting, Species } from '../types';
const species = (id: number): Species => ({
  id,
  scientificName: `Species ${id}`,
  commonName: `Species ${id}`,
  group: 'plants',
  rank: 'species',
  alternativeNames: [],
});
const sighting = (id: number, cell = 'home'): Sighting => ({
  id: String(id),
  taxonId: id,
  species: species(id),
  cell,
  lat: 0,
  lng: 0,
  accuracy: 1,
  timestamp: Date.now(),
  wasInCandidateSet: true,
  candidateSetAvailable: true,
});
const row = (id: number, score: number, seen = false): RankedCandidate => ({
  species: species(id),
  score,
  seen,
  count: 1,
  affinity: false,
});
describe('discovery rewards', () => {
  it('awards local firsts independently of lifetime novelty and only once in that area', () => {
    expect(discoveryAchievements(species(1), [sighting(1, 'elsewhere')], 'home', true)).toEqual([
      { id: 'first-here', label: 'First discovery here' },
    ]);
    expect(discoveryAchievements(species(1), [sighting(1)], 'home', true)).toEqual([]);
    expect(discoveryAchievements(species(1), [], 'home', false).map((a) => a.id)).toEqual([
      'new-species',
    ]);
  });
  it('counts lifetime species, excludes retractions, and recognises exact-name aliases', () => {
    const previous = [1, 2, 3, 4].map((id) => sighting(id));
    expect(discoveryAchievements(species(5), previous, 'home', false).map((a) => a.id)).toContain(
      'milestone-5',
    );
    expect(discoveryAchievements({ ...species(1), id: 999 }, previous, 'home', false)).toEqual([]);
    expect(
      discoveryAchievements(
        species(5),
        [...previous, { ...sighting(5), retractedAt: Date.now() }],
        'home',
        false,
      ).map((a) => a.id),
    ).toContain('new-species');
  });
  it('celebrates a themed completion only when its missing member is discovered', () => {
    expect(
      discoveryAchievements(species(63621), [sighting(82723)], 'home', false).map((a) => a.id),
    ).toContain('collection-pines');
    expect(
      discoveryAchievements(species(63621), [sighting(82723), sighting(63621)], 'home', false),
    ).toEqual([]);
  });
});
it('keeps suggestions steady through ranking changes, prioritises wanted discoveries, and replaces collected items', () => {
  const rows = [row(1, 1), row(2, 2), row(3, 3), row(4, 100)];
  expect(walkingSuggestions(rows, [1, 2, 3], []).map((r) => r.species.id)).toEqual([1, 2, 3]);
  expect(walkingSuggestions(rows, [1, 2, 3], [4]).map((r) => r.species.id)).toEqual([4, 1, 2]);
  expect(
    walkingSuggestions([row(1, 1, true), ...rows.slice(1)], [1, 2, 3], []).map((r) => r.species.id),
  ).toEqual([2, 3, 4]);
});
it('today uses the local calendar day and ignores corrected sightings', () => {
  const now = new Date(2026, 8, 10, 1);
  expect(
    todaysSightings(
      [
        { ...sighting(1), timestamp: +new Date(2026, 8, 10, 0) },
        { ...sighting(2), timestamp: +new Date(2026, 8, 9, 23) },
        { ...sighting(3), timestamp: +now, retractedAt: +now },
      ],
      now,
    ).map((s) => s.id),
  ).toEqual(['1']);
});
