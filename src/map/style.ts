import type { StyleSpecification, LayerSpecification } from 'maplibre-gl';
import { colours, palette } from '../../config/palette';
import { mapConfig } from '../../config/app';
import { appearance } from '../../config/appearance';
import { walkingScene } from '../../config/walking';
export function mapStyle(): StyleSpecification {
  if (appearance.mapStyle) return appearance.mapStyle;
  const fill = (
    id: string,
    sourceLayer: string,
    colour: string,
    kinds?: string[],
  ): LayerSpecification => ({
    id,
    type: 'fill',
    source: 'world',
    'source-layer': sourceLayer,
    // Tile layers can contain polygons, lines and labels. Filling a stream's
    // open line closes it into a spurious lake, so every fill requires an area.
    filter: kinds
      ? ['all', ['==', ['geometry-type'], 'Polygon'], ['in', ['get', 'kind'], ['literal', kinds]]]
      : ['==', ['geometry-type'], 'Polygon'],
    paint: { 'fill-color': colour, 'fill-antialias': true },
  });
  return {
    version: 8,
    light: { anchor: 'map', color: '#fff5de', intensity: 0.45, position: [1.5, 220, 35] },
    sources: {
      world: {
        type: 'vector',
        tiles: ['fieldbook://tiles/{z}/{x}/{y}'],
        minzoom: 0,
        maxzoom: mapConfig.maxZoom,
        attribution:
          '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> · <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a>',
      },
    },
    layers: [
      { id: 'sea', type: 'background', paint: { 'background-color': colours.water } },
      fill('earth', 'earth', colours.land),
      fill('cover-wood', 'landcover', colours.wood, ['forest']),
      fill('cover-grass', 'landcover', colours.grass, ['grassland', 'scrub']),
      fill('cover-farm', 'landcover', palette[20], ['farmland']),
      fill('farmland', 'landuse', palette[20], ['farmland', 'farmyard', 'orchard', 'vineyard']),
      fill('urban', 'landuse', palette[22], [
        'residential',
        'commercial',
        'industrial',
        'neighbourhood',
      ]),
      fill('grass', 'landuse', colours.grass, [
        'grass',
        'meadow',
        'park',
        'recreation_ground',
        'golf_course',
      ]),
      fill('scrub', 'landuse', palette[5], ['scrub', 'heath']),
      fill('wood', 'landuse', colours.wood, ['forest', 'wood']),
      fill('sand', 'landuse', colours.sand, ['beach', 'sand', 'bare_rock']),
      fill('wetland', 'landuse', colours.wetland, ['wetland', 'marsh']),
      {
        id: 'streams',
        type: 'line',
        source: 'world',
        'source-layer': 'water',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': colours.water,
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 13, 1.5, 17, 3],
        },
      },
      fill('water', 'water', colours.water),
      {
        id: 'water-edge',
        type: 'line',
        source: 'world',
        'source-layer': 'water',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'line-color': walkingScene.colours.shore, 'line-width': 2, 'line-opacity': 0.6 },
      },
      {
        id: 'roads-edge',
        type: 'line',
        source: 'world',
        'source-layer': 'roads',
        filter: ['!=', ['get', 'kind'], 'rail'],
        paint: {
          'line-color': palette[19],
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 13, 7, 17, 15],
        },
      },
      {
        id: 'roads',
        type: 'line',
        source: 'world',
        'source-layer': 'roads',
        filter: ['!=', ['get', 'kind'], 'rail'],
        paint: {
          'line-color': colours.road,
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 13, 4, 17, 10],
        },
      },
      fill('buildings', 'buildings', colours.building),
      {
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'world',
        'source-layer': 'buildings',
        minzoom: 14,
        filter: ['==', ['geometry-type'], 'Polygon'],
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color': walkingScene.colours.buildings,
          'fill-extrusion-height': ['coalesce', ['get', 'height'], 6],
          'fill-extrusion-opacity': 0.95,
        },
      },
    ],
  };
}
