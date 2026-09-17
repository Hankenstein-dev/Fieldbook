import { afterEach, expect, it } from 'vitest';
import { db, getSighting, getVisitedCells } from './index';
import { importNotebook, parseNotebook } from './importNotebook';
afterEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});
const species = {
  id: 1,
  scientificName: 'Arbutus unedo',
  commonName: 'Strawberry tree',
  group: 'plants',
  rank: 'species',
  alternativeNames: [],
};
const sighting = {
  id: 'original',
  taxonId: 1,
  species,
  lat: 37.2,
  lng: -8.6,
  accuracy: 6,
  timestamp: 123456,
  cell: 'example',
  wasInCandidateSet: true,
  candidateSetAvailable: true,
};
const notebook = {
  schemaVersion: 2,
  species: [species],
  sightings: [sighting],
  visitedCells: [{ cell: 'example', firstVisitedAt: 100, lastVisitedAt: 200, taxonIds: [1] }],
};
it('imports original times and locations, merges repeats by ID, and fills a missing photo', async () => {
  await importNotebook(JSON.stringify(notebook));
  await importNotebook(
    JSON.stringify({
      ...notebook,
      sightings: [
        { ...sighting, lat: 0, photo: { type: 'image/jpeg', data: 'data:image/jpeg;base64,AQID' } },
      ],
    }),
  );
  const restored = await getSighting('original');
  expect(restored?.lat).toBe(37.2);
  expect(restored?.timestamp).toBe(123456);
  expect(new Uint8Array(await restored!.photo!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  expect(await db.sightings.count()).toBe(1);
  expect((await getVisitedCells())[0].firstVisitedAt).toBe(100);
});
it('rejects a malformed photo instead of silently dropping it', () => {
  expect(() =>
    parseNotebook(JSON.stringify({ ...notebook, sightings: [{ ...sighting, photo: 'broken' }] })),
  ).toThrow('Invalid photo');
});
it('validates the entire import before writing any records', async () => {
  await expect(
    importNotebook(
      JSON.stringify({ ...notebook, sightings: [sighting, { ...sighting, id: 'bad', lat: 999 }] }),
    ),
  ).rejects.toThrow();
  expect(await db.sightings.count()).toBe(0);
});
