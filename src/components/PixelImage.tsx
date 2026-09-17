import { useEffect, useRef } from 'react';
import type { Species } from '../types';
import { palette } from '../../config/palette';
import { pixelate } from './pixelate';
const cache = new Map<number, Promise<HTMLCanvasElement>>();
function fallback(id: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 48;
  const c = canvas.getContext('2d')!;
  c.fillStyle = palette[7];
  c.fillRect(0, 0, 48, 48);
  c.fillStyle = palette[1];
  c.fillRect(23, 16, 3, 24);
  c.fillRect(19, 39, 12, 2);
  c.fillStyle = palette[3];
  c.fillRect(12, 24, 12, 6);
  c.fillRect(9, 20, 9, 6);
  c.fillRect(26, 29, 11, 5);
  c.fillRect(32, 25, 7, 6);
  c.fillStyle = palette[[26, 28, 30][id % 3]];
  c.fillRect(18, 10, 14, 7);
  c.fillRect(21, 7, 8, 13);
  c.fillStyle = palette[21];
  c.fillRect(23, 12, 4, 4);
  return canvas;
}
export function speciesArt(species: Species) {
  const existing = cache.get(species.id);
  if (existing) return existing;
  const result = new Promise<HTMLCanvasElement>((resolve) => {
    if (!species.photo) {
      resolve(fallback(species.id));
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => {
      image.src = '';
      resolve(fallback(species.id));
      cache.delete(species.id);
    }, 10000);
    image.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 48;
        const context = canvas.getContext('2d')!;
        const size = Math.min(image.naturalWidth, image.naturalHeight);
        context.drawImage(
          image,
          (image.naturalWidth - size) / 2,
          (image.naturalHeight - size) / 2,
          size,
          size,
          0,
          0,
          48,
          48,
        );
        const pixels = context.getImageData(0, 0, 48, 48);
        pixels.data.set(pixelate(pixels.data));
        context.putImageData(pixels, 0, 0);
        resolve(canvas);
      } catch {
        resolve(fallback(species.id));
      }
    };
    image.onerror = () => {
      clearTimeout(timeout);
      resolve(fallback(species.id));
      cache.delete(species.id);
    };
    image.src = species.photo.url;
  });
  cache.set(species.id, result);
  return result;
}
export default function PixelImage({
  species,
  large = false,
}: {
  species: Species;
  large?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    speciesArt(species).then((art) => {
      if (active && ref.current) ref.current.getContext('2d')?.drawImage(art, 0, 0);
    });
    return () => {
      active = false;
    };
  }, [species]);
  return (
    <canvas
      ref={ref}
      width={48}
      height={48}
      className={`pixel-photo${large ? ' large' : ''}`}
      role="img"
      aria-label={species.commonName}
    />
  );
}
