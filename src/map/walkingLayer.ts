import * as THREE from 'three';
import { MercatorCoordinate, type CustomLayerInterface, type Map as LibreMap } from 'maplibre-gl';
import { walkingScene as config } from '../../config/walking';
import { appearance } from '../../config/appearance';
import { contains, distanceToLine } from './geometry';
import type { Point } from '../types';

interface WalkingState {
  point: Point | null;
  heading: number | null;
  active: boolean;
}

// A small scene shares MapLibre's depth buffer and exact Mercator projection.
// All meshes are replaceable presentation, never occurrence data.
export function walkingLayer(state: () => WalkingState): CustomLayerInterface {
  let map: LibreMap, renderer: THREE.WebGLRenderer;
  const scene = new THREE.Scene(),
    camera = new THREE.Camera();
  const avatar = new THREE.Group(),
    landscape = new THREE.Group();
  const materials: THREE.Material[] = [],
    geometries: THREE.BufferGeometry[] = [];
  const material = (colour: string) => {
    const m = new THREE.MeshLambertMaterial({ color: colour });
    materials.push(m);
    return m;
  };
  const geometry = <T extends THREE.BufferGeometry>(g: T) => {
    geometries.push(g);
    return g;
  };
  const box = geometry(new THREE.BoxGeometry(1, 1, 1));
  const sphere = geometry(new THREE.IcosahedronGeometry(1, 1));
  // Precompute faceted normals. Fragment derivatives produced noisy lighting
  // on the Android emulator's older WebView/graphics driver.
  sphere.computeVertexNormals();
  const cylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 10).rotateX(Math.PI / 2));
  const shirt = material(config.colours.shirt),
    skin = material(config.colours.skin);
  const trousers = material(config.colours.trousers),
    pack = material(config.colours.backpack);
  const hat = material('#efdfb8'),
    boots = material('#665244');
  function part(
    parent: THREE.Group,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    position: number[],
    scale: number[],
  ) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    parent.add(mesh);
    return mesh;
  }
  part(avatar, sphere, shirt, [0, 0, 1.45], [0.44, 0.3, 0.58]);
  part(avatar, sphere, skin, [0, 0, 2.18], [0.31, 0.29, 0.34]);
  part(avatar, cylinder, hat, [0, 0, 2.39], [0.53, 0.53, 0.075]);
  part(avatar, cylinder, hat, [0, 0, 2.52], [0.31, 0.31, 0.23]);
  part(avatar, sphere, pack, [0, -0.31, 1.5], [0.36, 0.23, 0.43]);
  part(avatar, box, hat, [0, -0.51, 1.35], [0.4, 0.04, 0.17]);
  const legs: THREE.Group[] = [],
    arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.19, 0, 1.02);
    avatar.add(leg);
    legs.push(leg);
    part(leg, box, trousers, [0, 0, -0.36], [0.24, 0.25, 0.7]);
    part(leg, sphere, boots, [0, 0.07, -0.83], [0.19, 0.29, 0.16]);
    const arm = new THREE.Group();
    arm.position.set(side * 0.42, 0, 1.8);
    avatar.add(arm);
    arms.push(arm);
    part(arm, sphere, shirt, [side * 0.025, 0, -0.16], [0.16, 0.17, 0.32]);
    part(arm, sphere, skin, [side * 0.035, 0, -0.49], [0.12, 0.12, 0.21]);
  }
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 64;
  const ctx = shadowCanvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
  gradient.addColorStop(0, '#264c4370');
  gradient.addColorStop(1, '#264c4300');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
  });
  materials.push(shadowMaterial);
  const plane = geometry(new THREE.PlaneGeometry(1, 1));
  const shadow = new THREE.Mesh(plane, shadowMaterial);
  shadow.scale.set(25, 19, 1);
  shadow.position.z = 0.1;
  scene.add(shadow, avatar, landscape);
  scene.add(new THREE.AmbientLight('#fff6df', 2));
  const sunlight = new THREE.DirectionalLight('#fff1cb', 2.3);
  sunlight.position.set(-80, -100, 180);
  scene.add(sunlight);
  const leaves = new THREE.InstancedMesh(sphere, material('#79a461'), config.treeLimit);
  const trunks = new THREE.InstancedMesh(cylinder, material('#89745a'), config.treeLimit);
  const shadows = new THREE.InstancedMesh(plane, shadowMaterial, config.treeLimit);
  leaves.count = trunks.count = shadows.count = 0;
  landscape.add(shadows, trunks, leaves);
  const dummy = new THREE.Object3D(),
    tint = new THREE.Color();
  let anchor: MercatorCoordinate | null = null,
    target: Point | null = null;
  let from = new THREE.Vector3(),
    to = new THREE.Vector3(),
    started = 0,
    walking = false;
  let landscapeKey = '',
    activeBefore = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const local = (point: Point) => {
    const p = MercatorCoordinate.fromLngLat(point),
      scale = anchor!.meterInMercatorCoordinateUnits();
    return new THREE.Vector3((p.x - anchor!.x) / scale, -(p.y - anchor!.y) / scale, 0);
  };
  function scenery() {
    if (!anchor || !state().active) return;
    const centre = map.getCenter();
    const features = map.queryRenderedFeatures(undefined, {
      layers: ['wood', 'cover-wood', 'scrub', 'roads', 'water', 'buildings'],
    });
    const key = `${Math.round(centre.lng * 4000)}:${Math.round(centre.lat * 4000)}:${features.length}`;
    if (key === landscapeKey) return;
    landscapeKey = key;
    const forests = features.filter((f) => ['wood', 'cover-wood', 'scrub'].includes(f.layer.id));
    const obstacles = features.filter((f) => ['roads', 'water', 'buildings'].includes(f.layer.id));
    const p = MercatorCoordinate.fromLngLat(centre),
      step = config.treeGrid;
    const cx = Math.round(p.x / step),
      cy = Math.round(p.y / step);
    let n = 0;
    // Stable world grid: decorative canopies stay put as tiles/camera change.
    for (let radius = 0; radius <= 12 && n < config.treeLimit; radius++)
      for (let dx = -radius; dx <= radius && n < config.treeLimit; dx++)
        for (let dy = -radius; dy <= radius && n < config.treeLimit; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const ix = cx + dx,
            iy = cy + dy;
          const noise = Math.abs(Math.sin(ix * 127.1 + iy * 311.7));
          const jitter = Math.abs(Math.sin(ix * 269.5 + iy * 183.3));
          const ll = new MercatorCoordinate(
            (ix + noise * 0.8) * step,
            (iy + jitter * 0.8) * step,
          ).toLngLat();
          if (!forests.some((f) => contains(ll, f.geometry))) continue;
          if (
            obstacles.some((f) => contains(ll, f.geometry) || distanceToLine(ll, f.geometry) < 10)
          )
            continue;
          const position = local(ll),
            height = 6 + noise * 6;
          dummy.position.copy(position).z = height * 0.55;
          dummy.scale.set(1, 1, height);
          dummy.updateMatrix();
          trunks.setMatrixAt(n, dummy.matrix);
          dummy.position.z = height;
          dummy.scale.set(5 + noise * 3, 5 + noise * 3, height * 0.65);
          dummy.updateMatrix();
          leaves.setMatrixAt(n, dummy.matrix);
          tint.setHSL(0.25 + noise * 0.035, 0.25, 0.43 + noise * 0.13);
          leaves.setColorAt(n, tint);
          dummy.position.set(position.x + 3, position.y - 3, 0.12);
          dummy.scale.set(20, 16, 1);
          dummy.updateMatrix();
          shadows.setMatrixAt(n, dummy.matrix);
          n++;
        }
    for (const mesh of [leaves, trunks, shadows]) {
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    map.triggerRepaint();
  }
  return {
    id: 'walking-world',
    type: 'custom',
    renderingMode: '3d',
    onAdd(instance, gl) {
      map = instance;
      renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl });
      renderer.autoClear = false;
      map.on('idle', scenery);
    },
    render(_gl, args) {
      const current = state();
      if (!current.active || !current.point || document.hidden) {
        activeBefore = false;
        return;
      }
      const now = performance.now();
      if (!anchor) anchor = MercatorCoordinate.fromLngLat(current.point);
      if (!target || target.lat !== current.point.lat || target.lng !== current.point.lng) {
        from = avatar.position.clone();
        to = local(current.point);
        const distance = from.distanceTo(to);
        walking =
          !!target && distance > 2 && distance < 100 && activeBefore && !reducedMotion.matches;
        if (!walking) from.copy(to);
        started = now;
        target = current.point;
      }
      const t = Math.min(1, (now - started) / config.followMilliseconds);
      avatar.position.lerpVectors(from, to, t * t * (3 - 2 * t));
      shadow.position.set(avatar.position.x + 3, avatar.position.y - 3, 0.1);
      const scale = config.characterScale * 2 ** (config.zoom - map.getZoom());
      avatar.scale.setScalar(scale);
      shadow.scale.set(2.3 * scale, 1.7 * scale, 1);
      avatar.visible = !appearance.character;
      if (current.heading !== null) avatar.rotation.z = (-current.heading * Math.PI) / 180;
      else if (walking) avatar.rotation.z = -Math.atan2(to.x - from.x, to.y - from.y);
      const stride = walking && t < 1 ? Math.sin((now - started) / 115) * 0.42 : 0;
      legs[0].rotation.x = stride;
      legs[1].rotation.x = -stride;
      arms[0].rotation.x = -stride * 0.65;
      arms[1].rotation.x = stride * 0.65;
      const s = anchor.meterInMercatorCoordinateUnits();
      const transform = new THREE.Matrix4()
        .makeTranslation(anchor.x, anchor.y, 0)
        .scale(new THREE.Vector3(s, -s, s));
      camera.projectionMatrix.fromArray(args.defaultProjectionData.mainMatrix).multiply(transform);
      renderer.resetState();
      renderer.render(scene, camera);
      renderer.resetState();
      activeBefore = true;
      if (walking && t < 1) map.triggerRepaint();
    },
    onRemove() {
      map.off('idle', scenery);
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      leaves.dispose();
      trunks.dispose();
      shadows.dispose();
      shadowTexture.dispose();
      renderer.dispose();
    },
  };
}
