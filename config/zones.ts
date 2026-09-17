import data from './generated/zones.json';
import type { Polygon, MultiPolygon } from 'geojson';
import type { Point } from '../src/types';
export interface Zone {
  id: string;
  name: string;
  placeId: number;
  centre: Point;
  bounds: [number, number, number, number];
  geometry: Polygon | MultiPolygon;
  source: string;
}
export const zones = data.zones as Zone[];
