import { afterEach, expect, it } from 'vitest';
import { db, exportNotebook, getSightings, saveSighting, visitCell } from './index';
import type { Sighting } from '../types';
afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});
it('retains separate sightings at their recorded coordinates, including unusual records', async () => {
  const first = {
    id: 'first',
    taxonId: 123,
    lat: 37.1,
    lng: -8.6,
    timestamp: 100,
    cell: 'cell',
    wasInCandidateSet: false,
    candidateSetAvailable: true,
    accuracy: 8,
    species: { id: 123, commonName: 'Example' },
  } as Sighting;
  await saveSighting(first);
  await saveSighting({ ...first, id: 'second', timestamp: 200 });
  db.close();
  await db.open();
  const rows = await getSightings();
  expect(rows.map((r) => r.id)).toEqual(['second', 'first']);
  expect(rows[1]).toEqual(first);
});
it('unions overlapping physically visited candidate sets and exports provenance', async () => {
  await visitCell('one', [1, 2]);
  await visitCell('one', [2, 3]);
  await visitCell('two', [2, 4]);
  const exported = await exportNotebook();
  expect(exported.visitedCells.find((c) => c.cell === 'one')?.taxonIds).toEqual([1, 2, 3]);
  expect(new Set(exported.visitedCells.flatMap((c) => c.taxonIds))).toEqual(new Set([1, 2, 3, 4]));
});

it('upgrades an existing notebook without losing sightings or visited lists', async () => {
  const { default: Dexie } = await import('dexie');
  const { FieldbookDB } = await import('./index');
  const name = 'fieldbook-upgrade-test',
    old = new Dexie(name);
  old.version(1).stores({
    queries: '&key, cell, fetchedAt',
    sightings: '&id, taxonId, timestamp, cell',
    visitedCells: '&cell, lastVisitedAt',
    settings: '&id',
    tiles: '&key, savedAt',
  });
  const species = {
    id: 777,
    scientificName: 'Example species',
    commonName: 'Example',
    group: 'plants',
    rank: 'species',
    alternativeNames: [],
  };
  await old
    .table('queries')
    .put({ key: 'old-query', cell: 'one', candidates: [{ species, count: 4 }] });
  await old.table('visitedCells').put({ cell: 'one', taxonIds: [777], lastVisitedAt: 1 });
  await old
    .table('sightings')
    .put({ id: 'old-sighting', taxonId: 777, timestamp: 1, cell: 'one', species });
  old.close();
  const next = new FieldbookDB(name);
  await next.open();
  expect(await next.species.get(777)).toEqual(species);
  expect(await next.sightings.count()).toBe(1);
  expect((await next.visitedCells.get('one'))?.taxonIds).toEqual([777]);
  next.close();
  await Dexie.delete(name);
});

it('correction survives reload, an older backup restore, and notebook export', async () => {
  const { retractSighting, restoreSighting, getSighting } = await import('./index');
  const original: Sighting = {
    id: 'corrected',
    taxonId: 1,
    species: {
      id: 1,
      scientificName: 'Example species',
      commonName: 'Example',
      rank: 'species',
      group: 'plants',
      alternativeNames: [],
    },
    lat: 37,
    lng: -8,
    accuracy: 4,
    timestamp: 100,
    cell: 'cell',
    wasInCandidateSet: false,
    candidateSetAvailable: true,
    achievements: [{ id: 'first-here', label: 'First discovery here' }],
  };
  await saveSighting(original);
  await retractSighting(original.id);
  await restoreSighting(original);
  db.close();
  await db.open();
  expect(await getSightings()).toEqual([]);
  expect((await getSighting(original.id))?.retractedAt).toBeGreaterThan(0);
  expect((await exportNotebook()).sightings[0].retractedAt).toBeGreaterThan(0);
});
