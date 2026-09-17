import { expect, it } from 'vitest';
import { zones } from '../../config/zones';
import { country } from '../../config/app';
import { countryCatalogue } from '../../config/countryCatalogue';
import checklists from '../../config/generated/zone-checklists.json';
import { contains } from '../map/geometry';

it('has fixed polygons and complete checklists whose taxa all resolve in the country catalogue', () => {
  const ids = new Set(countryCatalogue.map((s) => s.id));
  expect(new Set(zones.map((z) => z.id)).size).toBe(zones.length);
  expect(Object.keys(checklists).sort()).toEqual(zones.map((z) => z.id).sort());
  for (const list of Object.values(checklists)) {
    expect(list.complete).toBe(true);
    expect(Object.keys(list.counts).every((id) => ids.has(Number(id)))).toBe(true);
  }
  const home = zones.filter((z) => contains(country.start, z.geometry));
  expect(home).toHaveLength(1);
  expect(home[0].bounds[0]).toBeLessThan(country.start.lng);
  expect(home[0].bounds[2]).toBeGreaterThan(country.start.lng);
});
