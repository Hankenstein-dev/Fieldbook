import fs from 'node:fs';
import { PMTiles } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader as Pbf } from 'pbf';
import zlib from 'node:zlib';

// usage: node dump.mjs <lat> <lng> <zoom> <cellMetres> <cols> <rows> <out> [sourceUrl]
const lat = parseFloat(process.argv[2]), lng = parseFloat(process.argv[3]);
const Z = parseInt(process.argv[4]); const cellM = parseFloat(process.argv[5]);
const cols = parseInt(process.argv[6]), rows = parseInt(process.argv[7]); const out = process.argv[8];
const remote = process.argv[9];
const EXT = 4096;
class FileSource {
  constructor(p) { this.p = p; this.fd = fs.openSync(p, 'r'); }
  getKey() { return this.p; }
  async getBytes(offset, length) {
    const buf = Buffer.alloc(length);
    fs.readSync(this.fd, buf, 0, length, offset);
    return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + length) };
  }
}
const manifest = JSON.parse(fs.readFileSync('config/generated/maps.json', 'utf8'));
const n = 2 ** Z;
const metresPerUnit = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (n * EXT);
const cellUnits = cellM / metresPerUnit;
const wx = ((lng + 180) / 360) * n * EXT;
const latR = (lat * Math.PI) / 180;
const wy = ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n * EXT;
const x0 = wx - (cols * cellUnits) / 2, y0 = wy - (rows * cellUnits) / 2;
const x1 = x0 + cols * cellUnits, y1 = y0 + rows * cellUnits;
const tiles = [];
for (let tx = Math.floor(x0 / EXT); tx <= Math.floor((x1 - 1) / EXT); tx++)
  for (let ty = Math.floor(y0 / EXT); ty <= Math.floor((y1 - 1) / EXT); ty++) tiles.push([tx, ty]);
const features = []; const kinds = {};
let remotePm;
for (const [tx, ty] of tiles) {
  let pm;
  if (remote) { remotePm ??= new PMTiles(remote); pm = remotePm; }
  else {
    const lat2 = (y) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
    const b = [(tx / n) * 360 - 180, lat2(ty + 1), ((tx + 1) / n) * 360 - 180, lat2(ty)];
    const arch = manifest.archives.find(a => !(a.bounds[0] > b[2] || a.bounds[2] < b[0] || a.bounds[1] > b[3] || a.bounds[3] < b[1]));
    if (!arch) { console.error('no archive for', tx, ty); continue; }
    pm = new PMTiles(new FileSource('public' + arch.url));
  }
  const res = await pm.getZxy(Z, tx, ty);
  if (!res) { console.error('no tile', tx, ty); continue; }
  let data = Buffer.from(res.data);
  if (data[0] === 0x1f && data[1] === 0x8b) data = zlib.gunzipSync(data);
  const vt = new VectorTile(new Pbf(data));
  for (const name of Object.keys(vt.layers)) {
    const layer = vt.layers[name];
    for (let i = 0; i < layer.length; i++) {
      const f = layer.feature(i);
      const scale = EXT / layer.extent;
      const geom = f.loadGeometry().map(ring => ring.map(p => [
        +((tx * EXT + p.x * scale - x0) / cellUnits).toFixed(2),
        +((ty * EXT + p.y * scale - y0) / cellUnits).toFixed(2)]));
      const m = 4; // margin cells
      if (!geom.some(r => r.some(([x, y]) => x > -m && x < cols + m && y > -m && y < rows + m))) {
        // keep big polygons that might enclose the window entirely
        const xs = geom.flat().map(p => p[0]), ys = geom.flat().map(p => p[1]);
        if (!(Math.min(...xs) < 0 && Math.max(...xs) > cols && Math.min(...ys) < 0 && Math.max(...ys) > rows)) continue;
      }
      const kind = f.properties.kind ?? '';
      kinds[`${name}:${kind}`] = (kinds[`${name}:${kind}`] || 0) + 1;
      const p = f.properties;
      features.push({ layer: name, type: f.type, kind, props: { height: p.height, name: p.name, bridge: p.is_bridge, tunnel: p.is_tunnel, kind_detail: p.kind_detail }, geom });
    }
  }
}
// geom is now in CELL coordinates (0..cols, 0..rows)
fs.writeFileSync(out, JSON.stringify({ zoom: Z, cellMetres: cellM, cols, rows, lat, lng, features }));
console.log('tiles', tiles.length, 'features in window', features.length, 'metres/unit', metresPerUnit.toFixed(3));
console.log(Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 25).map(e => e.join('=')).join('  '));
