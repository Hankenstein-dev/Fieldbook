import type { Geometry, Position } from 'geojson';
import type { Point } from '../types';
export function tileAt(point: Point, z: number) {
  const n = 2 ** z,
    lat = (Math.max(-85.051128, Math.min(85.051128, point.lat)) * Math.PI) / 180;
  return {
    z,
    x: Math.min(n - 1, Math.max(0, Math.floor(((point.lng + 180) / 360) * n))),
    y: Math.min(
      n - 1,
      Math.max(0, Math.floor(((1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2) * n)),
    ),
  };
}
export function tileBounds(z: number, x: number, y: number): number[] {
  const n = 2 ** z,
    lat = (v: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * v) / n))) * 180) / Math.PI;
  return [(x / n) * 360 - 180, lat(y + 1), ((x + 1) / n) * 360 - 180, lat(y)];
}
export function intersects(a: readonly number[], b: readonly number[]) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}
function inRing(point: Point, ring: Position[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i],
      [xj, yj] = ring[j];
    // Treat the boundary as part of a polygon, including tile-clipped edges.
    const cross = (point.lng - xi) * (yj - yi) - (point.lat - yi) * (xj - xi);
    if (
      Math.abs(cross) < 1e-12 &&
      point.lng >= Math.min(xi, xj) &&
      point.lng <= Math.max(xi, xj) &&
      point.lat >= Math.min(yi, yj) &&
      point.lat <= Math.max(yi, yj)
    )
      return true;
    if (
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
    )
      inside = !inside;
  }
  return inside;
}
export function contains(point: Point, geometry: Geometry): boolean {
  const polygon = (rings: Position[][]) =>
    !!rings.length && inRing(point, rings[0]) && !rings.slice(1).some((r) => inRing(point, r));
  if (geometry.type === 'Polygon') return polygon(geometry.coordinates);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.some(polygon);
  return false;
}
/** Distance to a mapped line, in metres; local equirectangular projection. */
export function distanceToLine(point: Point, geometry: Geometry): number {
  const lines =
    geometry.type === 'LineString'
      ? [geometry.coordinates]
      : geometry.type === 'MultiLineString'
        ? geometry.coordinates
        : [];
  const project = ([lng, lat]: Position) => [
    (lng - point.lng) * 111195 * Math.cos((point.lat * Math.PI) / 180),
    (lat - point.lat) * 111195,
  ];
  let best = Infinity;
  for (const line of lines)
    for (let i = 1; i < line.length; i++) {
      const a = project(line[i - 1]),
        b = project(line[i]),
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        length = dx * dx + dy * dy,
        t = length ? Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / length)) : 0;
      best = Math.min(best, Math.hypot(a[0] + t * dx, a[1] + t * dy));
    }
  return best;
}
