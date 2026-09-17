import type { Photo, Species } from '../src/types';
import type { StyleSpecification } from 'maplibre-gl';
import recoveredPhotos from './generated/species-photos.json';

export interface Artwork extends Photo {
  pixelArt?: boolean;
}
// Add artwork by stable taxon ID. Unspecified species keep their credited photograph.
export const speciesArtwork: Record<number, Artwork> = {};
export const appearance: { character?: Artwork; pixelMap: boolean; mapStyle?: StyleSpecification } =
  {
    pixelMap: false,
  };
export const imageForSpecies = (species: Species): Artwork | undefined =>
  speciesArtwork[species.id] ??
  species.photo ??
  (recoveredPhotos as Record<string, Photo>)[species.id];

export function enlargedImage(art: Artwork): string {
  const url = new URL(art.url, 'https://fieldbook.invalid');
  if (
    !art.pixelArt &&
    ['static.inaturalist.org', 'inaturalist-open-data.s3.amazonaws.com'].includes(url.hostname)
  )
    return art.url.replace(/\/(?:square|small|medium)\./, '/large.');
  return art.url;
}
