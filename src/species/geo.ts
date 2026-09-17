import type { Point } from '../types';
const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
export function cellFor(point: Point, precision = 5): string {
  let lat = [-90, 90],
    lng = [-180, 180],
    even = true,
    bit = 0,
    value = 0,
    result = '';
  while (result.length < precision) {
    const range = even ? lng : lat,
      coordinate = even ? point.lng : point.lat,
      mid = (range[0] + range[1]) / 2;
    value = value * 2;
    if (coordinate >= mid) {
      value++;
      range[0] = mid;
    } else range[1] = mid;
    even = !even;
    if (++bit === 5) {
      result += base32[value];
      bit = 0;
      value = 0;
    }
  }
  return result;
}
export function cellBounds(hash: string): [number, number, number, number] {
  const lat = [-90, 90],
    lng = [-180, 180];
  let even = true;
  for (const char of hash) {
    const value = base32.indexOf(char);
    if (value < 0) throw new Error('Invalid cell');
    for (let mask = 16; mask > 0; mask >>= 1) {
      const range = even ? lng : lat,
        mid = (range[0] + range[1]) / 2;
      if (value & mask) range[0] = mid;
      else range[1] = mid;
      even = !even;
    }
  }
  return [lng[0], lat[0], lng[1], lat[1]];
}
export function cellCentre(hash: string): Point {
  const [w, s, e, n] = cellBounds(hash);
  return { lat: (s + n) / 2, lng: (w + e) / 2 };
}
export function distanceKm(a: Point, b: Point): number {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function coveredRadius(hash: string): number {
  const [w, s, e, n] = cellBounds(hash),
    c = cellCentre(hash);
  return Math.max(
    8,
    Math.ceil(
      (5 +
        Math.max(
          ...[
            [w, s],
            [w, n],
            [e, s],
            [e, n],
          ].map(([lng, lat]) => distanceKm(c, { lat, lng })),
        )) *
        10,
    ) / 10,
  );
}
export function pointInBounds(p: Point, b: readonly number[]): boolean {
  return p.lng >= b[0] && p.lng <= b[2] && p.lat >= b[1] && p.lat <= b[3];
}
