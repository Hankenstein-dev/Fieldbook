import { referenceSpecies } from './app';
import type { Species } from '../src/types';
import { walkingScene } from './walking';
// Small, explicit collections drawn from the existing country catalogue.
// Membership is presentation config, independent of recording and recognition.
export const themedCollections = [
  { id: 'oaks', name: 'Oaks', taxonIds: [50868, 82980, 82946, 82942, 125848] },
  { id: 'pines', name: 'Pines', taxonIds: [82723, 63621] },
];
export const walkingZoom = walkingScene.zoom;
export const storyBadgeLabels: Record<string, string> = {
  cultural: 'Culture & uses',
  edible: 'Food uses',
  toxic: 'Toxic',
  invasive: 'Invasive',
  medicinal: 'Medicinal history',
};

// Catalogue snapshots can contain multiple taxon IDs for the same scientific name.
// Themes share the fieldbook's exact-name identity rule.
export function themeMemberMatches(id: number, species: Species) {
  return (
    species.id === id ||
    referenceSpecies.find((s) => s.id === id)?.scientificName.toLowerCase() ===
      species.scientificName.toLowerCase()
  );
}
export function themeIncludes(theme: (typeof themedCollections)[number], species: Species) {
  return theme.taxonIds.some((id) => themeMemberMatches(id, species));
}
export function themeProgress(theme: (typeof themedCollections)[number], species: Species[]) {
  return theme.taxonIds.filter((id) => species.some((s) => themeMemberMatches(id, s))).length;
}
