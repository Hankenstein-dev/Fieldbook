import { useState } from 'react';
import { Leaf } from 'lucide-react';
import { enlargedImage, imageForSpecies } from '../../config/appearance';
import PhotoViewer from './PhotoViewer';
import type { Species } from '../types';

export default function SpeciesImage({
  species,
  large = false,
}: {
  species: Species;
  large?: boolean;
}) {
  const art = imageForSpecies(species);
  const [failed, setFailed] = useState<string>();
  const className = `species-photo${large ? ' large' : ''}${art?.pixelArt ? ' custom-pixel-art' : ''}`;
  return art && failed !== art.url ? (
    <PhotoViewer
      src={enlargedImage(art)}
      alt={species.commonName}
      credit={art}
      pixelArt={art.pixelArt}
    >
      <img
        className={className}
        src={art.url}
        alt={species.commonName}
        loading="lazy"
        onError={() => setFailed(art.url)}
      />
    </PhotoViewer>
  ) : (
    <span
      className={`${className} image-placeholder`}
      role="img"
      aria-label={`${species.commonName} · image unavailable`}
    >
      <Leaf size={large ? 40 : 28} strokeWidth={1.2} />
    </span>
  );
}

const images = new Map<string, Promise<HTMLImageElement | null>>();
export function speciesArt(species: Species) {
  const art = imageForSpecies(species);
  if (!art) return Promise.resolve(null);
  if (!images.has(art.url))
    images.set(
      art.url,
      new Promise((resolve) => {
        const image = new Image();
        // These map images are display-only; no canvas pixels are exported.
        // Some catalogue hosts allow image display but do not supply CORS headers.
        image.onload = () => resolve(image);
        image.onerror = () => {
          images.delete(art.url);
          resolve(null);
        };
        image.src = art.url;
      }),
    );
  return images.get(art.url)!;
}
