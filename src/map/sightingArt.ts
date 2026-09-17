import { speciesArtwork } from '../../config/appearance';
import { speciesArt } from '../components/SpeciesImage';
import type { Sighting } from '../types';

export async function sightingArt(sighting: Sighting) {
  const override = speciesArtwork[sighting.taxonId];
  if (override) {
    const image = await speciesArt(sighting.species);
    if (image) return { image, pixelArt: !!override.pixelArt };
  }
  if (sighting.photo) {
    const url = URL.createObjectURL(sighting.photo);
    try {
      const image = await new Promise<HTMLImageElement | null>((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = url;
      });
      if (image) return { image, pixelArt: false };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return { image: await speciesArt(sighting.species), pixelArt: false };
}
