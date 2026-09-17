import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { Map as LibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Expand, LocateFixed, Minus, Plus } from 'lucide-react';
import type { FeatureCollection, Geometry } from 'geojson';
import { country, mapConfig } from '../../config/app';
import { contains } from './geometry';
import { walkingZoom } from '../../config/discovery';
import { walkingScene } from '../../config/walking';
import { walkingLayer } from './walkingLayer';
import { palette } from '../../config/palette';
import { appearance } from '../../config/appearance';
import { zones } from '../../config/zones';
import type { Zone } from '../../config/zones';
import checklists from '../../config/generated/zone-checklists.json';
import type { Fix, Point, Sighting, Species } from '../types';
import { vectorTile } from './tiles';
import { pointInBounds } from '../species/geo';
import { mapStyle } from './style';
import { clusterSightings } from './clusters';
import { sightingArt } from './sightingArt';
import type { HabitatResult } from './habitat';

let protocolAdded = false;
function protocol() {
  if (protocolAdded) return;
  protocolAdded = true;
  maplibregl.setWorkerUrl(workerUrl);
  maplibregl.addProtocol('fieldbook', async (params, controller) => {
    const match = params.url.match(/tiles\/(\d+)\/(\d+)\/(\d+)/);
    if (!match) throw new Error('Invalid tile URL');
    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const data = await vectorTile(Number(match[1]), Number(match[2]), Number(match[3]));
    // MapLibre transfers this buffer to its worker. Keep the shared cache intact
    // for habitat lookup and later renders of the same tile.
    return { data: data?.slice(0) ?? new ArrayBuffer(0) };
  });
}
interface Props {
  mode: 'explore' | 'places' | 'sightings';
  zone?: Zone;
  onZone: (id: string) => void;
  where?: { species: Species; cells: string[] } | null;
  onCloseWhere?: () => void;
  focus: Point;
  habitat: HabitatResult;
  fix: Fix | null;
  heading: number | null;
  sightings: Sighting[];
  following: boolean;
  onLocate: () => void;
  onOpenSighting: (sighting: Sighting) => void;
}
export default function FieldMap(props: Props) {
  const container = useRef<HTMLDivElement>(null),
    overlay = useRef<HTMLCanvasElement>(null),
    map = useRef<LibreMap | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [ready, setReady] = useState(false),
    [error, setError] = useState('');
  const art = useRef(new Map<Sighting, Awaited<ReturnType<typeof sightingArt>>>());
  const drawn = useRef<{ x: number; y: number; sighting: Sighting }[]>([]);
  const cameras = useRef<
    Partial<Record<Props['mode'], { center: [number, number]; zoom: number }>>
  >({});
  const previousMode = useRef<Props['mode']>('explore');
  const character = useRef<HTMLImageElement | null>(null);
  const worldReady = useRef(false);
  useEffect(() => {
    if (appearance.character) {
      const image = new Image();
      image.onload = () => {
        character.current = image;
        map.current?.triggerRepaint();
      };
      image.src = appearance.character.url;
    }
  }, []);
  useEffect(() => {
    if (!container.current) return;
    protocol();
    let instance: LibreMap;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style: mapStyle(),
        center: [country.start.lng, country.start.lat],
        zoom: walkingZoom,
        minZoom: 5,
        maxZoom: walkingScene.maxZoom,
        bearing: 0,
        pitch: walkingScene.pitch,
        pixelRatio: appearance.pixelMap ? 0.25 : Math.min(window.devicePixelRatio || 1, 2),
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        canvasContextAttributes: { antialias: !appearance.pixelMap },
        fadeDuration: 0,
      });
    } catch {
      setError('This browser could not open the map. You can still browse and record sightings.');
      return;
    }
    map.current = instance;
    if (import.meta.env.VITE_NATIVE_ACCEPTANCE === 'true')
      Object.assign(window, { __fieldbookMap: instance });
    instance.touchZoomRotate.disableRotation();
    instance.on('load', () => {
      try {
        instance.addLayer(
          walkingLayer(() => ({
            point: latest.current.fix,
            heading: latest.current.heading,
            active: latest.current.mode === 'explore' && !!container.current?.clientWidth,
          })),
        );
        worldReady.current = true;
      } catch (error) {
        console.warn('Walking scene unavailable; using the location marker.', error);
      }
      instance.addSource('selected-zone', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      instance.addLayer({
        id: 'selected-outline',
        type: 'line',
        source: 'selected-zone',
        paint: {
          'line-color': palette[1],
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 0.55,
        },
      });
      instance.addSource('visited-range', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      instance.addLayer({
        id: 'visited-range-fill',
        type: 'fill',
        source: 'visited-range',
        paint: { 'fill-color': palette[1], 'fill-opacity': 0.16 },
      });
      instance.addLayer({
        id: 'visited-range-line',
        type: 'line',
        source: 'visited-range',
        paint: { 'line-color': palette[1], 'line-width': 2, 'line-dasharray': [2, 2] },
      });
      instance.addSource('fieldbook-zones', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: zones.map((zone) => ({
            type: 'Feature',
            properties: { id: zone.id },
            geometry: zone.geometry,
          })),
        },
      });
      instance.addLayer({
        id: 'zone-fill',
        type: 'fill',
        source: 'fieldbook-zones',
        paint: { 'fill-color': '#568666', 'fill-opacity': 0.08 },
      });
      instance.addLayer({
        id: 'zone-border',
        type: 'line',
        source: 'fieldbook-zones',
        paint: { 'line-color': '#426c52', 'line-width': 1.5, 'line-opacity': 0.8 },
      });
      setReady(true);
    });
    instance.on('error', () =>
      setError(
        navigator.onLine
          ? 'Some map tiles could not load. Try moving the map again.'
          : 'Only map tiles you have already visited are available offline.',
      ),
    );
    instance.on('idle', () => {
      if (instance.areTilesLoaded()) setError('');
    });
    instance.on('click', (event) => {
      const hit = drawn.current.find(
        (d) => Math.hypot(d.x - event.point.x, d.y - event.point.y) < 22,
      );
      if (hit) latest.current.onOpenSighting(hit.sighting);
      else if (latest.current.mode === 'places') {
        const zone = instance.queryRenderedFeatures(event.point, { layers: ['zone-fill'] })[0];
        if (zone?.properties?.id) latest.current.onZone(String(zone.properties.id));
      }
    });
    const draw = () => {
      const canvas = overlay.current;
      if (!canvas || !container.current) return;
      const width = container.current.clientWidth,
        height = container.current.clientHeight;
      const ratio = appearance.pixelMap ? 0.25 : Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.ceil(width * ratio),
        h = Math.ceil(height * ratio);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const c = canvas.getContext('2d')!;
      c.setTransform(ratio, 0, 0, ratio, 0, 0);
      c.imageSmoothingEnabled = !appearance.pixelMap;
      c.clearRect(0, 0, width, height);
      const current = latest.current;
      const projected = (current.mode === 'places' ? [] : current.sightings)
        .map((sighting) => {
          const p = instance.project([sighting.lng, sighting.lat]);
          return { sighting, x: p.x, y: p.y };
        })
        .filter((p) => p.x > -30 && p.y > -30 && p.x < width + 30 && p.y < height + 30);
      drawn.current = [];
      for (const cluster of clusterSightings(projected, 44)) {
        const x = cluster.x,
          y = cluster.y,
          artwork = art.current.get(cluster.sightings[0]),
          image = artwork?.image;
        c.save();
        c.beginPath();
        c.arc(x, y, 21, 0, Math.PI * 2);
        c.fillStyle = '#fff';
        c.fill();
        c.strokeStyle = '#284f3d';
        c.lineWidth = 2;
        c.stroke();
        c.beginPath();
        c.arc(x, y, 18, 0, Math.PI * 2);
        c.clip();
        if (image) {
          c.imageSmoothingEnabled = !artwork?.pixelArt;
          const size = Math.min(image.naturalWidth, image.naturalHeight);
          c.drawImage(
            image,
            (image.naturalWidth - size) / 2,
            (image.naturalHeight - size) / 2,
            size,
            size,
            x - 18,
            y - 18,
            36,
            36,
          );
        } else {
          c.fillStyle = '#578468';
          c.fillRect(x - 18, y - 18, 36, 36);
        }
        c.restore();
        if (cluster.sightings.length > 1) {
          c.fillStyle = '#284f3d';
          c.beginPath();
          c.arc(x + 15, y + 15, 11, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#fff';
          c.font = 'bold 11px Arial';
          c.textAlign = 'center';
          c.fillText(String(cluster.sightings.length), x + 15, y + 19);
        }
        drawn.current.push({ x, y, sighting: cluster.sightings[0] });
      }
      if (current.fix && current.mode === 'explore') {
        const p = instance.project([current.fix.lng, current.fix.lat]);
        c.save();
        c.translate(p.x, p.y);
        if (current.heading !== null) c.rotate((current.heading * Math.PI) / 180);
        if (character.current) {
          c.imageSmoothingEnabled = !appearance.character?.pixelArt;
          c.drawImage(character.current, -22, -28, 44, 56);
        } else if (!worldReady.current) {
          if (current.heading !== null) {
            c.beginPath();
            c.moveTo(0, -28);
            c.lineTo(-12, -10);
            c.lineTo(12, -10);
            c.closePath();
            c.fillStyle = '#387cf077';
            c.fill();
          }
          c.beginPath();
          c.arc(0, 0, 17, 0, Math.PI * 2);
          c.fillStyle = '#387cf022';
          c.fill();
          c.beginPath();
          c.arc(0, 0, 8, 0, Math.PI * 2);
          c.fillStyle = '#3079dc';
          c.fill();
          c.strokeStyle = '#fff';
          c.lineWidth = 3;
          c.stroke();
        }
        c.restore();
      }
      c.fillStyle = '#ffffffee';
      c.beginPath();
      c.arc(width - 30, 31, 18, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#284f3d';
      c.font = 'bold 13px Arial';
      c.textAlign = 'center';
      c.fillText('N', width - 30, 36);
    };
    instance.on('render', draw);
    const observer = new ResizeObserver(() => {
      instance.resize();
      const current = latest.current;
      if (
        current.mode === 'explore' &&
        current.following &&
        current.fix &&
        container.current?.clientWidth
      )
        instance.setCenter([current.fix.lng, current.fix.lat]);
      draw();
    });
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      map.current = null;
      worldReady.current = false;
      instance.remove();
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    const data: FeatureCollection<Geometry> = {
      type: 'FeatureCollection',
      features:
        props.mode === 'places' && props.zone
          ? [{ type: 'Feature', properties: {}, geometry: props.zone.geometry }]
          : [],
    };
    (map.current.getSource('selected-zone') as maplibregl.GeoJSONSource)?.setData(data);
    map.current.triggerRepaint();
  }, [
    props.habitat,
    props.focus,
    props.fix,
    props.following,
    props.zone,
    props.mode,
    props.sightings,
    ready,
  ]);
  // Ignore tiny compass noise while standing still; keep the actual heading
  // in `latest` and repaint only after a visible change in direction.
  const headingStep = props.heading === null ? null : Math.round(props.heading / 5);
  useEffect(() => {
    map.current?.triggerRepaint();
  }, [headingStep]);
  useEffect(() => {
    let active = true;
    const current = new Set(props.sightings);
    for (const sighting of art.current.keys())
      if (!current.has(sighting)) art.current.delete(sighting);
    for (const s of props.sightings)
      if (!art.current.get(s)?.image)
        void sightingArt(s).then((image) => {
          if (!active) return;
          art.current.set(s, image);
          map.current?.triggerRepaint();
        });
    map.current?.triggerRepaint();
    return () => {
      active = false;
    };
  }, [props.sightings]);
  useEffect(() => {
    if (props.following && props.fix && ready)
      map.current?.easeTo({
        center: [props.fix.lng, props.fix.lat],
        duration: walkingScene.followMilliseconds,
      });
  }, [props.fix, props.following, ready]);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    m.resize();
    const old = previousMode.current;
    if (old !== props.mode) {
      cameras.current[old] = {
        center: m.getCenter().toArray() as [number, number],
        zoom: m.getZoom(),
      };
      previousMode.current = props.mode;
    }
    const exploring = props.mode === 'explore';
    for (const control of [
      m.dragPan,
      m.scrollZoom,
      m.doubleClickZoom,
      m.keyboard,
      m.touchZoomRotate,
    ]) {
      if (exploring) control.disable();
      else control.enable();
    }
    m.touchZoomRotate.disableRotation();
    if (exploring)
      m.jumpTo({
        center: props.fix ? [props.fix.lng, props.fix.lat] : [country.start.lng, country.start.lat],
        zoom: cameras.current.explore?.zoom ?? walkingZoom,
        pitch: walkingScene.pitch,
      });
    else if (old !== props.mode) {
      const camera = cameras.current[props.mode];
      if (camera) m.jumpTo({ ...camera, pitch: 0 });
      else if (props.mode === 'places')
        m.fitBounds(
          [
            [country.bbox[0], country.bbox[1]],
            [country.bbox[2], country.bbox[3]],
          ],
          { padding: 35, duration: 0, pitch: 0 },
        );
      else m.setPitch(0);
    }
    if (m.getLayer('buildings-3d'))
      m.setLayoutProperty('buildings-3d', 'visibility', exploring ? 'visible' : 'none');
    const sceneColours: Record<string, string> = {
      earth: walkingScene.colours.ground,
      wood: walkingScene.colours.woodland,
      'cover-wood': walkingScene.colours.woodland,
      grass: walkingScene.colours.grass,
      'cover-grass': walkingScene.colours.grass,
      water: walkingScene.colours.water,
    };
    const base = mapStyle();
    for (const [id, colour] of Object.entries(sceneColours)) {
      const layer = base.layers.find((l) => l.id === id);
      if (layer?.type === 'fill' && m.getLayer(id))
        m.setPaintProperty(id, 'fill-color', exploring ? colour : layer.paint?.['fill-color']);
    }
    for (const [id, colour] of Object.entries({
      streams: walkingScene.colours.water,
      roads: walkingScene.colours.road,
      'roads-edge': walkingScene.colours.roadEdge,
    })) {
      const layer = base.layers.find((l) => l.id === id);
      if (layer?.type === 'line' && m.getLayer(id))
        m.setPaintProperty(id, 'line-color', exploring ? colour : layer.paint?.['line-color']);
    }
    const sea = base.layers.find((l) => l.id === 'sea');
    if (sea?.type === 'background' && m.getLayer('sea'))
      m.setPaintProperty(
        'sea',
        'background-color',
        exploring ? walkingScene.colours.water : sea.paint?.['background-color'],
      );
    for (const id of ['zone-fill', 'zone-border'])
      m.setLayoutProperty(id, 'visibility', props.mode === 'places' ? 'visible' : 'none');
    if (m.getLayer('species-density')) m.removeLayer('species-density');
    if (m.getSource('species-density')) m.removeSource('species-density');
  }, [props.mode, ready]);
  useEffect(() => {
    const m = map.current;
    if (ready && m && props.mode === 'places' && props.zone)
      m.fitBounds(
        [
          [props.zone.bounds[0], props.zone.bounds[1]],
          [props.zone.bounds[2], props.zone.bounds[3]],
        ],
        { padding: 65, maxZoom: 12 },
      );
  }, [props.zone, props.mode, ready]);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const records = checklists as Record<string, { counts: Record<string, number> }>;
    if (m.getLayer('species-density')) m.removeLayer('species-density');
    if (m.getSource('species-density')) m.removeSource('species-density');
    const features =
      props.mode === 'places' && props.where
        ? zones
            .filter((zone) => records[zone.id]?.counts[String(props.where!.species.id)])
            .map((zone) => ({ type: 'Feature' as const, properties: {}, geometry: zone.geometry }))
        : [];
    (m.getSource('visited-range') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features,
    });
    if (props.mode === 'places' && props.where && features.length) {
      const bounds = new maplibregl.LngLatBounds();
      for (const zone of zones.filter(
        (z) => records[z.id]?.counts[String(props.where!.species.id)],
      )) {
        bounds.extend([zone.bounds[0], zone.bounds[1]]);
        bounds.extend([zone.bounds[2], zone.bounds[3]]);
      }
      m.fitBounds(bounds, { padding: 50 });
    }
  }, [props.mode, props.where, ready]);
  const sightingKey = props.sightings.map((s) => s.id).join(',');
  useEffect(() => {
    if (ready && props.mode === 'sightings') overview();
  }, [sightingKey, props.mode, ready]);
  const countryDensity = () => {
    const m = map.current;
    if (!m || !props.where) return;
    if (!m.getSource('species-density')) {
      m.addSource('species-density', {
        type: 'raster',
        tiles: [
          `https://tiles.inaturalist.org/v1/heatmap/{z}/{x}/{y}.png?taxon_id=${props.where.species.id}`,
        ],
        tileSize: 256,
        attribution: 'iNaturalist observation density',
      });
      m.addLayer({
        id: 'species-density',
        type: 'raster',
        source: 'species-density',
        paint: { 'raster-opacity': 0.55, 'raster-resampling': 'nearest' },
      });
    }
    m.fitBounds(
      [
        [country.bbox[0], country.bbox[1]],
        [country.bbox[2], country.bbox[3]],
      ],
      { padding: 50 },
    );
  };
  function overview() {
    const points = props.sightings.map((s) => [s.lng, s.lat] as [number, number]);

    if (points.length > 1) {
      const bounds = new maplibregl.LngLatBounds(points[0], points[0]);
      points.forEach((p) => bounds.extend(p));
      map.current?.fitBounds(bounds, { padding: 80, maxZoom: 13 });
    } else if (points.length === 1) map.current?.easeTo({ center: points[0], zoom: 14 });
    else
      map.current?.fitBounds(
        [
          [country.bbox[0], country.bbox[1]],
          [country.bbox[2], country.bbox[3]],
        ],
        { padding: 50 },
      );
  }
  return (
    <section
      className={`map-panel${appearance.pixelMap ? ' custom-pixel-map' : ''}`}
      aria-label={
        props.mode === 'explore'
          ? 'Your surroundings'
          : props.mode === 'places'
            ? 'Browse zone map'
            : 'Your sighting map'
      }
      data-scene={props.mode === 'explore' ? 'walking' : 'atlas'}
    >
      <div
        ref={container}
        className="map-canvas"
        data-testid="field-map"
        data-mode={props.mode}
        data-lat={props.fix?.lat}
        data-lng={props.fix?.lng}
        data-sightings={props.mode === 'places' ? 0 : props.sightings.length}
      />
      <canvas ref={overlay} className="map-overlay" aria-hidden="true" />
      {props.where && (
        <div className="where-panel">
          <strong>{props.where.species.commonName}</strong>
          <span>Shaded zones have records of this species</span>
          {props.where.species.id > 0 && (
            <button onClick={countryDensity}>Country observation density</button>
          )}
          <button onClick={props.onCloseWhere}>Close range</button>
        </div>
      )}
      {props.mode === 'explore' && (
        <div className="map-caption">
          <span className="live-dot" />
          <span>
            {props.fix
              ? (zones.find((z) => contains(props.fix!, z.geometry))?.name ?? 'Explore')
              : 'Finding location…'}
          </span>
        </div>
      )}
      {!ready && !error && (
        <div className="map-loading">
          <span className="spinner" /> Opening your map…
        </div>
      )}
      {error && (
        <div className="map-error" role="status">
          {error}
        </div>
      )}
      <div className="map-controls">
        <button aria-label="Zoom in" onClick={() => map.current?.zoomIn()}>
          <Plus size={18} />
        </button>
        <button aria-label="Zoom out" onClick={() => map.current?.zoomOut()}>
          <Minus size={18} />
        </button>
        <span />
        {props.mode === 'sightings' && (
          <button aria-label="Show all my sightings" onClick={overview}>
            <Expand size={18} />
          </button>
        )}
        {props.mode === 'explore' && (
          <button aria-label="Use my location" onClick={props.onLocate}>
            <LocateFixed size={18} />
          </button>
        )}
      </div>

      {!mapConfig.archives.some((archive) => pointInBounds(props.focus, archive.bounds)) && (
        <div className="map-error" role="status">
          Map coverage is unavailable here. You can still record a sighting.
        </div>
      )}
    </section>
  );
}
