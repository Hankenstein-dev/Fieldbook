import { distanceToLine } from './map/geometry';
import { describe, expect, it } from 'vitest';
import {
  cellFor,
  cellBounds,
  cellCentre,
  coveredRadius,
  distanceKm,
  pointInBounds,
} from './species/geo';
import { contains, tileAt, tileBounds } from './map/geometry';
import { clusterSightings } from './map/clusters';
import { rankCandidates } from './rank';
import { pixelate } from './components/pixelate';
import { circularDelta } from './hooks/useHeading';
import { palette } from '../config/palette';
import type { Candidate, Sighting, Species, Story } from './types';
const species = (id: number): Species => ({
  id,
  scientificName: `Taxon ${id}`,
  commonName: `Name ${id}`,
  alternativeNames: [],
  group: 'test',
  rank: 'species',
});
const candidate = (id: number, count = 1): Candidate => ({ species: species(id), count });
const story = { summary: 'An interesting plant.' } as Story;
const groups = { test: { notabilityStrategy: 'stories', rankingWeight: 1, ignoreList: [] } };

describe('cell and tile geometry', () => {
  it('round-trips cells and covers at least five kilometres from every cell corner', () => {
    for (const p of [
      { lat: 37.1265, lng: -8.604 },
      { lat: 0, lng: 0 },
      { lat: 41.8, lng: -6.2 },
      { lat: 32.7, lng: -17 },
      { lat: -45, lng: 120 },
    ]) {
      const cell = cellFor(p),
        bounds = cellBounds(cell),
        centre = cellCentre(cell);
      expect(cellFor(centre)).toBe(cell);
      expect(pointInBounds(p, bounds)).toBe(true);
      const [w, s, e, n] = bounds;
      for (const [lng, lat] of [
        [w, s],
        [w, n],
        [e, s],
        [e, n],
      ])
        expect(coveredRadius(cell) - distanceKm(centre, { lat, lng })).toBeGreaterThanOrEqual(5);
    }
  });
  it('keeps neighbouring cells stable and rejects invalid hashes', () => {
    expect(cellFor({ lat: 37.1265, lng: -8.604 })).toBe(cellFor({ lat: 37.12651, lng: -8.60401 }));
    expect(() => cellBounds('!')).toThrow();
  });
  it('projects a point into its containing Mercator tile', () => {
    const p = { lat: 37.1265, lng: -8.604 };
    const { z, x, y } = tileAt(p, 13);
    expect(pointInBounds(p, tileBounds(z, x, y))).toBe(true);
  });
  it('respects holes, multiple polygons and clipped outer boundaries', () => {
    const outer = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
      hole = [
        [3, 3],
        [7, 3],
        [7, 7],
        [3, 7],
        [3, 3],
      ];
    const polygon = { type: 'Polygon' as const, coordinates: [outer, hole] };
    expect(contains({ lat: 1, lng: 1 }, polygon)).toBe(true);
    expect(contains({ lat: 5, lng: 5 }, polygon)).toBe(false);
    expect(contains({ lat: 0, lng: 5 }, polygon)).toBe(true);
    expect(contains({ lat: 11, lng: 5 }, polygon)).toBe(false);
    expect(contains({ lat: 1, lng: 1 }, { type: 'MultiPolygon', coordinates: [[outer]] })).toBe(
      true,
    );
  });
});
describe('ranking', () => {
  it('promotes stories without dropping uncurated, seen or ignored taxa', () => {
    const input = [candidate(1, 10000), candidate(2), candidate(3)];
    const ranked = rankCandidates(input, 'unknown', new Map([[2, story]]), {}, new Set([2]), {
      test: { ...groups.test, ignoreList: [2, 3] },
    });
    expect(ranked[0].species.id).toBe(2);
    expect(ranked).toHaveLength(3);
    expect(input[0].species.id).toBe(1);
  });
  it('changes the leading story with habitat while preserving the full list', () => {
    const input = [candidate(1, 30), candidate(2, 20)];
    const stories = new Map([
      [1, story],
      [2, story],
    ]);
    const notes = {
      1: { habitats: ['coast' as const], evidence: [] },
      2: { habitats: ['wetland' as const], evidence: [] },
    };
    expect(rankCandidates(input, 'coast', stories, notes, new Set(), groups)[0].species.id).toBe(1);
    expect(rankCandidates(input, 'wetland', stories, notes, new Set(), groups)[0].species.id).toBe(
      2,
    );
  });
  it('selects likelihood scoring from group configuration', () => {
    const ranked = rankCandidates(
      [candidate(1, 100), candidate(2)],
      'unknown',
      new Map([[2, story]]),
      {},
      new Set(),
      { test: { ...groups.test, notabilityStrategy: 'likelihood' } },
    );
    expect(ranked[0].species.id).toBe(1);
  });
  it('breaks ties deterministically', () => {
    expect(
      rankCandidates([candidate(9), candidate(2)], 'unknown', new Map(), {}, new Set(), groups).map(
        (r) => r.species.id,
      ),
    ).toEqual([2, 9]);
  });
});
describe('sighting grouping', () => {
  const p = (id: string, taxonId: number, x: number) => ({
    sighting: { id, taxonId } as Sighting,
    x,
    y: 0,
  });
  it('groups only the same species and stores every original sighting', () => {
    const input = [p('b', 1, 10), p('a', 1, 0), p('c', 2, 0)];
    const groups = clusterSightings(input, 44);
    expect(groups).toHaveLength(2);
    expect(groups[0].x).toBe(5);
    expect(groups[0].sightings).toHaveLength(2);
    expect(input[0].sighting.id).toBe('b');
  });
  it('splits a cluster when zoom increases its screen-space separation', () => {
    expect(clusterSightings([p('a', 1, 0), p('b', 1, 20)], 44)).toHaveLength(1);
    expect(clusterSightings([p('a', 1, 0), p('b', 1, 80)], 44)).toHaveLength(2);
  });
  it('is independent of input order', () => {
    const input = [p('a', 1, 0), p('b', 1, 30), p('c', 1, 65)];
    expect(clusterSightings(input, 44)).toEqual(clusterSightings(input.reverse(), 44));
  });
});
it('quantises to the shared palette, preserving alpha without mutating the input', () => {
  const input = new Uint8ClampedArray([127, 82, 62, 200, 240, 230, 220, 0]),
    copy = input.slice();
  const output = pixelate(input);
  expect(input).toEqual(copy);
  expect(output[3]).toBe(200);
  expect(output[7]).toBe(0);
  const hex = '#' + [...output.slice(0, 3)].map((v) => v.toString(16).padStart(2, '0')).join('');
  expect(palette).toContain(hex);
  expect(pixelate(input)).toEqual(output);
});
it('smooths compass headings through north by the shortest angle', () => {
  expect(circularDelta(359, 1)).toBe(2);
  expect(circularDelta(1, 359)).toBe(-2);
  expect(circularDelta(90, 270)).toBe(-180);
});

it('treats streams as lines with a narrow tolerance, never as filled lake polygons', () => {
  const line = {
    type: 'LineString' as const,
    coordinates: [
      [0, 0],
      [0, 0.01],
      [0.01, 0.01],
    ],
  };
  expect(distanceToLine({ lat: 0.005, lng: 0 }, line)).toBe(0);
  expect(distanceToLine({ lat: 0.005, lng: 0.005 }, line)).toBeGreaterThan(500);
  expect(distanceToLine({ lat: 0.005, lng: 0.00005 }, line)).toBeLessThan(10);
});
