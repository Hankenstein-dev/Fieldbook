import type { Sighting } from '../types.ts';
export type SightingBackup = Omit<Sighting, 'photo'> & { photo?: string };
export const safeBackupId = (id: unknown): id is string =>
  typeof id === 'string' && /^[\w-]{1,80}$/.test(id);
export function validSightingBackup(value: unknown): value is SightingBackup {
  if (!value || typeof value !== 'object') return false;
  const s = value as SightingBackup;
  return (
    safeBackupId(s.id) &&
    (s.retractedAt === undefined || (Number.isFinite(s.retractedAt) && s.retractedAt > 0)) &&
    (s.achievements === undefined ||
      (Array.isArray(s.achievements) &&
        s.achievements.every(
          (a) => a && typeof a.id === 'string' && typeof a.label === 'string',
        ))) &&
    Number.isInteger(s.taxonId) &&
    Number.isFinite(s.timestamp) &&
    s.timestamp > 0 &&
    Number.isFinite(s.lat) &&
    Math.abs(s.lat) <= 90 &&
    Number.isFinite(s.lng) &&
    Math.abs(s.lng) <= 180 &&
    Number.isFinite(s.accuracy) &&
    s.accuracy >= 0 &&
    typeof s.cell === 'string' &&
    s.cell.length <= 20 &&
    typeof s.wasInCandidateSet === 'boolean' &&
    typeof s.candidateSetAvailable === 'boolean' &&
    !!s.species &&
    s.species.id === s.taxonId &&
    typeof s.species.scientificName === 'string' &&
    typeof s.species.commonName === 'string' &&
    typeof s.species.group === 'string' &&
    Array.isArray(s.species.alternativeNames) &&
    s.species.alternativeNames.every((n) => typeof n === 'string') &&
    (s.photo === undefined ||
      (typeof s.photo === 'string' &&
        /^data:image\/jpeg;base64,[A-Za-z0-9+/]*={0,2}$/.test(s.photo)))
  );
}
export async function encodeSighting(sighting: Sighting): Promise<SightingBackup> {
  const { photo, ...metadata } = sighting;
  if (!photo) return metadata;
  return {
    ...metadata,
    photo: await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(photo);
    }),
  };
}
export function decodeSighting(value: unknown): Sighting {
  if (!validSightingBackup(value)) throw new Error('Invalid sighting backup');
  const { photo, ...metadata } = value;
  if (!photo) return metadata;
  const bytes = Uint8Array.from(atob(photo.split(',')[1]), (c) => c.charCodeAt(0));
  return { ...metadata, photo: new Blob([bytes], { type: 'image/jpeg' }) };
}
