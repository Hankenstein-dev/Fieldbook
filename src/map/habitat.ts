import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import type { Feature, Geometry } from 'geojson';
import { habitatKinds, habitatPriority } from '../../config/habitats';
import { mapConfig } from '../../config/app';
import type { Habitat, Point } from '../types';
import { contains, distanceToLine, tileAt } from './geometry';
import { vectorTile } from './tiles';
import { pointInBounds } from '../species/geo';
export interface HabitatResult {
  habitat: Habitat;
  detail?: string;
  feature?: Feature<Geometry>;
  source: 'tile' | 'unavailable';
}
export async function habitatAt(point: Point): Promise<HabitatResult> {
  if (!mapConfig.archives.some((a) => pointInBounds(point, a.bounds)))
    return { habitat: 'unknown', source: 'unavailable' };
  const { z, x, y } = tileAt(point, mapConfig.maxZoom);
  const bytes = await vectorTile(z, x, y);
  if (!bytes) return { habitat: 'unknown', source: 'unavailable' };
  const tile = new VectorTile(new PbfReader(new Uint8Array(bytes)));
  let detail: string | undefined;
  let habitat: Habitat = 'ocean',
    feature: Feature<Geometry> | undefined;
  for (const layerId of ['earth', 'landcover', 'landuse', 'buildings', 'water']) {
    const layer = tile.layers[layerId];
    if (!layer) continue;
    for (let i = 0; i < layer.length; i++) {
      const f = layer.feature(i),
        kind = String(f.properties.kind ?? (layerId === 'buildings' ? 'building' : ''));
      const kindDetail = String(f.properties.kind_detail ?? '');
      const candidate = habitatKinds[kindDetail] ?? habitatKinds[kind];
      if (!candidate || habitatPriority[candidate] < habitatPriority[habitat]) continue;
      const geo = f.toGeoJSON(x, y, z);
      const watercourse =
        layerId === 'water' && candidate === 'river' && distanceToLine(point, geo.geometry) <= 10;
      if (contains(point, geo.geometry) || watercourse) {
        detail = watercourse ? 'Mapped watercourse within 10 metres' : undefined;
        habitat = candidate;
        feature = { ...geo, properties: { habitat } };
      }
    }
  }
  return { habitat, feature, detail, source: 'tile' };
}
