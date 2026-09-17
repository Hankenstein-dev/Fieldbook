import { computerUrl } from '../native/platform';
import { getSighting, getRetractions, getSightings, sightingIds, restoreSighting } from '../store';
import { diagnosticStorageContext, liveDiagnosticsEnabled } from '../store/diagnostics';
import { encodeSighting, decodeSighting, safeBackupId } from './format';

export const backupState = { message: 'Waiting to check computer backups', count: 0, missing: 0 };
let remote: Set<string> | undefined,
  retracted = new Set<string>(),
  device: string | undefined,
  busy = false;
async function endpoint() {
  device ??= (await diagnosticStorageContext()).storageId;
  if (!safeBackupId(device) || device === 'unavailable')
    throw new Error('Device storage ID unavailable');
  return computerUrl(`/__fieldbook_debug/notebooks/${device}`);
}
async function readBackupIndex() {
  const response = await fetch(await endpoint(), {
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Backup index: HTTP ${response.status}`);
  const result = await response.json();
  if (!Array.isArray(result.ids) || !result.ids.every(safeBackupId))
    throw new Error('Invalid backup index');
  remote = new Set<string>(result.ids);
  retracted = new Set<string>(
    Array.isArray(result.retracted) ? result.retracted.filter(safeBackupId) : [],
  );
  backupState.count = remote.size;
}
export async function syncSightingBackup() {
  if (busy || !liveDiagnosticsEnabled()) return;
  busy = true;
  try {
    if (!remote) await readBackupIndex();
    const local = await sightingIds();
    const corrections = await getRetractions();
    const id = corrections.find((id) => !retracted.has(id)) ?? local.find((id) => !remote!.has(id));
    if (id) {
      const sighting = await getSighting(id);
      if (sighting) {
        const response = await fetch(`${await endpoint()}/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(await encodeSighting(sighting)),
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok || (await response.json()).accepted !== id)
          throw new Error(`Sighting backup: HTTP ${response.status}`);
        remote!.add(id);
        if (sighting.retractedAt) retracted.add(id);
      }
    }
    backupState.count = remote!.size;
    backupState.missing = [...remote!].filter((id) => !local.includes(id)).length;
    const pending = local.filter((id) => !remote!.has(id)).length;
    backupState.message = `${remote!.size} sightings backed up on the computer${pending ? ` · ${pending} waiting` : ''}`;
  } catch (error) {
    remote = undefined;
    backupState.message = `Computer backup pending: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    busy = false;
  }
}
export async function restoreComputerSightings() {
  if (busy) throw new Error('A backup is in progress. Try again in a moment.');
  busy = true;
  try {
    await readBackupIndex();
    for (const id of remote!) {
      const response = await fetch(`${await endpoint()}/${id}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`Restore: HTTP ${response.status}`);
      await restoreSighting(decodeSighting(await response.json()));
    }
    await getSightings();
    backupState.missing = 0;
    return remote!.size;
  } finally {
    busy = false;
  }
}
