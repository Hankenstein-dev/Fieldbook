import { beforeEach, expect, it, vi } from 'vitest';
import { prepareEncounter } from './encounter';
import { diagnostic } from '../diagnostics';
import type { Fix } from '../types';

vi.mock('../diagnostics', () => ({
  diagnostic: vi.fn(),
  errorDetails: (error: unknown) => ({ message: String(error) }),
}));
const fix: Fix = { lat: 37, lng: -8, accuracy: 12, timestamp: 1234 };
beforeEach(() => vi.clearAllMocks());

it('starts a single fresh fix immediately, then prepares records for that physical position', async () => {
  let located!: (fix: Fix) => void;
  const gps = vi.fn(
    () =>
      new Promise<Fix>((resolve) => {
        located = resolve;
      }),
  );
  const records = vi.fn(async () => ({ species: [], complete: true }));
  const pending = prepareEncounter(gps, records, 'recognition-operation');
  expect(gps).toHaveBeenCalledTimes(1);
  expect(records).not.toHaveBeenCalled();
  located(fix);
  expect(await pending).toEqual({
    ok: true,
    operation: 'recognition-operation',
    fix,
    species: [],
    complete: true,
  });
  expect(records).toHaveBeenCalledExactlyOnceWith(fix);
  // Reusing preparation for a correction does not acquire a different location.
  expect((await pending).ok).toBe(true);
  expect(gps).toHaveBeenCalledTimes(1);
  expect(vi.mocked(diagnostic).mock.calls.map(([event]) => event)).toEqual([
    'encounter.start',
    'encounter.location',
    'encounter.records',
  ]);
});

it('retains the physical fix when records are unavailable, without inventing first-discovery coverage', async () => {
  const prepared = await prepareEncounter(
    async () => fix,
    async () => {
      throw new Error('Offline');
    },
    'offline',
  );
  expect(prepared).toMatchObject({ ok: true, fix, complete: false, species: [] });
});

it('contains a GPS failure even if recognition is cancelled and preparation is never consumed', async () => {
  const error = new Error('Location unavailable');
  const records = vi.fn();
  await expect(
    prepareEncounter(
      async () => {
        throw error;
      },
      records,
      'cancelled',
    ),
  ).resolves.toEqual({ ok: false, operation: 'cancelled', error });
  expect(records).not.toHaveBeenCalled();
});
