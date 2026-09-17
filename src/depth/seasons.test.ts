import { expect, it } from 'vitest';
import { seasonSummary } from './seasons';
import { rankCandidates } from '../rank';
import type { Species } from '../types';
it('does not invent seasonal certainty from sparse records', () => {
  expect(seasonSummary([0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0], 2).bonus).toBe(0);
});
it('seasonal evidence changes order without hiding out-of-season candidates', () => {
  const species = (id: number) => ({ id, group: 'plants' }) as Species;
  const candidates = [
    { species: species(1), count: 10 },
    { species: species(2), count: 10 },
  ];
  const months = [50, 40, 35, 1, 2, 1, 1, 1, 1, 1, 1, 1];
  const rows = rankCandidates(
    candidates,
    'unknown',
    new Map(),
    {},
    new Set(),
    {},
    { 1: months, 2: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 40, 50] },
    11,
  );
  expect(rows.map((r) => r.species.id)).toEqual([2, 1]);
  expect(rows[1].seasonLabel).toBe('Fewer records at this time of year');
});
