import type { Fix, Species } from '../types';
import { diagnostic, errorDetails } from '../diagnostics';

export type EncounterPreparation =
  | { ok: true; operation: string; fix: Fix; species: Species[]; complete: boolean }
  | { ok: false; operation: string; error: unknown };

// Start with recognition, before the species is known. Resolve failures as data:
// an abandoned/failed identification must not leave an unhandled GPS rejection.
export async function prepareEncounter(
  requestFix: () => Promise<Fix>,
  loadRecords: (fix: Fix) => Promise<{ species: Species[]; complete: boolean }>,
  operation: string,
): Promise<EncounterPreparation> {
  const started = performance.now();
  diagnostic('encounter.start', { operation });
  let fix: Fix;
  try {
    fix = await requestFix();
    diagnostic('encounter.location', {
      operation,
      milliseconds: performance.now() - started,
      accuracy: fix.accuracy,
    });
  } catch (error) {
    diagnostic(
      'encounter.location_error',
      {
        operation,
        milliseconds: performance.now() - started,
        ...errorDetails(error),
      },
      'error',
    );
    return { ok: false, operation, error };
  }
  const recordsStarted = performance.now();
  let records: { species: Species[]; complete: boolean } = { species: [], complete: false };
  try {
    records = await loadRecords(fix);
  } catch (error) {
    // Offline/missing local coverage never prevents recording a sighting.
    diagnostic('encounter.records_error', { operation, ...errorDetails(error) }, 'warn');
  }
  diagnostic('encounter.records', {
    operation,
    milliseconds: performance.now() - recordsStarted,
    totalMilliseconds: performance.now() - started,
    count: records.species.length,
    complete: records.complete,
  });
  return { ok: true, operation, fix, ...records };
}
