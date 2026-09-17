import type { Sighting } from '../types';
import { protectionState } from './storageProtection';

const key = 'fieldbook-sighting-safety-v1';
type SafetyRecord = Omit<Sighting, 'photo'>;

export function readSightingSafety(): SafetyRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (
      !Array.isArray(value) ||
      value.some(
        (s) =>
          !s ||
          typeof s.id !== 'string' ||
          !Number.isFinite(s.lat) ||
          !Number.isFinite(s.lng) ||
          !Number.isFinite(s.timestamp) ||
          typeof s.species?.scientificName !== 'string',
      )
    )
      throw new Error('Invalid safety copy');
    return value;
  } catch {
    protectionState.backupError = 'Could not read the local sighting safety copy.';
    return [];
  }
}

// Local Storage survived the reported IndexedDB/cache loss. Keep compact sighting
// metadata there too; JPEGs belong in the full computer backup, not this small store.
// Sightings are append-only. Never replace an older nonempty copy with an empty DB.
export function keepSightingSafety(rows: Sighting[]) {
  if (!rows.length) return;
  try {
    const records = new Map(readSightingSafety().map((s) => [s.id, s]));
    for (const { photo: _photo, ...record } of rows) records.set(record.id, record);
    localStorage.setItem(key, JSON.stringify([...records.values()]));
    protectionState.backupError = '';
  } catch {
    protectionState.backupError =
      'The extra local sighting copy could not be saved. Your primary sighting record is still saved; check the computer backup.';
  }
}
