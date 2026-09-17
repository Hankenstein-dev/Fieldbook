import { expect, it } from 'vitest';
import { externalId, mergeCandidates, queryPolygon } from './fallbacks';
import type { Species } from '../types';
it('deduplicates exact names while retaining provenance and avoids adding shared observations', () => {
  const s = { id: 123, scientificName: 'Arbutus unedo' } as Species;
  const rows = mergeCandidates(
    [{ species: s, count: 10 }],
    [
      {
        species: { ...s, id: -123 },
        count: 20,
        sources: [{ provider: 'GBIF', count: 20, url: 'https://gbif.org' }],
      },
    ],
  );
  expect(rows).toHaveLength(1);
  expect(rows[0].species.id).toBe(123);
  expect(rows[0].count).toBe(20);
  expect(rows[0].sources?.map((s) => s.provider)).toEqual(['iNaturalist', 'GBIF']);
});
it('keeps provider identifiers separate from iNaturalist and each other', () => {
  expect(externalId('GBIF', 123)).not.toBe(externalId('OBIS', 123));
  expect(externalId('OBIS', 123)).toBeLessThan(0);
  expect(queryPolygon({ lat: 37, lng: -8 }, 8)).toMatch(/^POLYGON\(\(/);
});
