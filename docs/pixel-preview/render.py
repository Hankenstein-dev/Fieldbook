"""Stardew-style preview renderer: real Protomaps geometry -> cell grid -> autotiled pixel art."""
import json, sys, random, hashlib
import numpy as np
from PIL import Image, ImageDraw

S = "/tmp/claude-1000/-home-hankenstein-dev-SideBants-Fieldbook/a9b06d27-a186-40dd-8e91-4e12e8a04137/scratchpad"
T = 16  # tile px
sheet = Image.open(f"{S}/kenney/Tilemap/tilemap_packed.png").convert("RGBA")
def ktile(i):
    c, r = i % 12, i // 12
    return sheet.crop((c * T, r * T, c * T + T, r * T + T))

# ---- classes (priority order low -> high) ----
GRASS, FARM, SAND, WET, ROCK, PAVE, WATER, ROAD, PATH, BUILD = range(10)
LANDUSE = {
    'farmland': FARM, 'allotments': FARM, 'orchard': FARM, 'vineyard': FARM,
    'beach': SAND, 'sand': SAND, 'dune': SAND,
    'wetland': WET, 'marsh': WET, 'salt_marsh': WET,
    'bare_rock': ROCK, 'scree': ROCK, 'quarry': ROCK,
    'pedestrian': PAVE, 'industrial': PAVE, 'commercial': PAVE, 'railway': PAVE, 'pier': PAVE, 'aerodrome': PAVE,
}
TREE_LANDUSE = {'forest': 1 / 9, 'wood': 1 / 9, 'park': 1 / 30, 'scrub': 1 / 20, 'nature_reserve': 1 / 40, 'orchard': 1 / 12, 'meadow': 1 / 60, 'grass': 0, 'cemetery': 1 / 25, 'golf_course': 1 / 50}
ROAD_W = {'highway': 5, 'major_road': 3, 'minor_road': 2, 'other': 2, 'path': 1}

def load(name):
    return json.load(open(f"{S}/{name}.json"))

def signed_area(ring):
    a = 0
    for (x0, y0), (x1, y1) in zip(ring, ring[1:] + ring[:1]):
        a += x0 * y1 - x1 * y0
    return a / 2

def poly_mask(feature, cols, rows):
    """Rasterise an MVT polygon (outer rings + holes) to a boolean cell mask."""
    img = Image.new('L', (cols, rows), 0)
    d = ImageDraw.Draw(img)
    rings = [r for r in feature['geom'] if len(r) >= 3]
    if not rings:
        return None
    # MVT: exterior rings have one winding, holes the opposite. Largest ring decides which sign is 'outer'.
    outer_sign = np.sign(signed_area(max(rings, key=lambda r: abs(signed_area(r)))))
    for r in rings:
        if np.sign(signed_area(r)) == outer_sign:
            d.polygon([tuple(p) for p in r], fill=1)
    for r in rings:
        if np.sign(signed_area(r)) != outer_sign:
            d.polygon([tuple(p) for p in r], fill=0)
    return np.array(img, dtype=bool)

def classify(data):
    cols, rows = data['cols'], data['rows']
    cls = np.full((rows, cols), GRASS, dtype=np.int16)
    tree_density = np.zeros((rows, cols), dtype=np.float32)
    bid = np.zeros((rows, cols), dtype=np.int32)
    feats = data['features']
    # landuse
    for f in feats:
        if f['layer'] == 'landuse' and f['type'] == 3:
            m = poly_mask(f, cols, rows)
            if m is None: continue
            k = f['kind']
            if k in LANDUSE:
                cls[m] = LANDUSE[k]
            if k in TREE_LANDUSE:
                tree_density[m] = TREE_LANDUSE[k]
    # water polygons
    for f in feats:
        if f['layer'] == 'water' and f['type'] == 3:
            m = poly_mask(f, cols, rows)
            if m is not None: cls[m] = WATER
    # water lines (streams/canals) 1 cell wide
    for f in feats:
        if f['layer'] == 'water' and f['type'] == 2:
            img = Image.new('L', (cols, rows), 0); d = ImageDraw.Draw(img)
            for r in f['geom']: d.line([tuple(p) for p in r], fill=1, width=1)
            cls[np.array(img, dtype=bool)] = WATER
    # roads
    for wanted in (ROAD, PATH):
        for f in feats:
            if f['layer'] != 'roads' or f['type'] != 2: continue
            if f['kind'] in ('rail', 'ferry', 'aeroway') or f['props'].get('tunnel'): continue
            is_path = f['kind'] == 'path'
            if (PATH if is_path else ROAD) != wanted: continue
            w = ROAD_W.get(f['kind'], 2)
            img = Image.new('L', (cols, rows), 0); d = ImageDraw.Draw(img)
            for r in f['geom']:
                d.line([tuple(p) for p in r], fill=1, width=w, joint='curve')
            cls[np.array(img, dtype=bool)] = wanted
    # buildings
    n = 0
    for f in feats:
        if f['layer'] == 'buildings' and f['type'] == 3:
            m = poly_mask(f, cols, rows)
            if m is None or not m.any(): continue
            n += 1
            cls[m] = BUILD; bid[m] = n
    # point trees from POIs
    pts = [(p[0][0], p[0][1]) for f in feats if f['layer'] == 'pois' and f['kind'] == 'tree' for p in f['geom']]
    return cls, tree_density, bid, pts

# ---- procedural 16px tiles for what the pack lacks ----
def solid(color):
    return Image.new('RGBA', (T, T), color)
def speckle(base, dots, n, seed):
    im = solid(base); px = im.load(); rnd = random.Random(seed)
    for _ in range(n):
        x, y = rnd.randrange(T), rnd.randrange(T); px[x, y] = dots
    return im
def water_tile(seed):
    im = solid((66, 137, 200, 255)); d = ImageDraw.Draw(im); rnd = random.Random(seed)
    for _ in range(3):
        x, y = rnd.randrange(0, 11), rnd.randrange(T)
        d.line([(x, y), (x + rnd.randrange(2, 5), y)], fill=(140, 195, 235, 255))
    return im
def sand_tile(seed): return speckle((231, 213, 156, 255), (214, 190, 125, 255), 6, seed)
def wet_tile(seed):
    im = speckle((112, 150, 96, 255), (76, 110, 90, 255), 4, seed); d = ImageDraw.Draw(im); rnd = random.Random(seed + 7)
    for _ in range(2):
        x, y = rnd.randrange(T), rnd.randrange(4, T)
        d.line([(x, y), (x, y - 3)], fill=(58, 92, 60, 255))
    return im
def rock_tile(seed): return speckle((150, 146, 138, 255), (120, 116, 110, 255), 5, seed)
def road_tile(seed):
    im = solid((122, 112, 104, 255)); d = ImageDraw.Draw(im); rnd = random.Random(seed)
    for _ in range(5):
        x, y = rnd.randrange(0, 12), rnd.randrange(0, 12)
        d.rectangle([x, y, x + 3, y + 2], fill=(140, 130, 120, 255), outline=(104, 95, 88, 255))
    return im
GRASS_TILES = [ktile(0)] * 6 + [ktile(1), ktile(2)]
def base_tile(c, x, y):
    seed = (x * 73856093) ^ (y * 19349663)
    rnd = random.Random(seed)
    if c == GRASS: return rnd.choice(GRASS_TILES)
    if c == FARM: return ktile(13) if rnd.random() < 0.8 else ktile(rnd.choice([39, 40, 41, 42]))
    if c == PATH: return ktile(13)
    if c == PAVE: return ktile(109)
    if c == SAND: return sand_tile(seed)
    if c == WET: return wet_tile(seed)
    if c == ROCK: return rock_tile(seed)
    if c == WATER: return water_tile(seed)
    if c == ROAD: return road_tile(seed)
    return ktile(0)

EDGE = {  # colour of the 1px transition rim drawn on the higher-priority class where it meets a lower one
    FARM: (150, 110, 70, 255), SAND: (205, 180, 115, 255), WET: (70, 100, 70, 255), ROCK: (110, 106, 100, 255),
    PAVE: (95, 100, 110, 255), WATER: (36, 96, 160, 255), ROAD: (86, 78, 72, 255), PATH: (150, 110, 70, 255),
}
PRIORITY = {GRASS: 0, FARM: 1, SAND: 2, WET: 3, ROCK: 4, PAVE: 5, WATER: 6, PATH: 7, ROAD: 8, BUILD: 9}

def render(name, out):
    data = load(name)
    cols, rows = data['cols'], data['rows']
    cls, tree_density, bid, pts = classify(data)
    W, H = cols * T, rows * T
    img = Image.new('RGBA', (W, H))
    # ground
    for y in range(rows):
        for x in range(cols):
            c = int(cls[y, x])
            ground = GRASS if c == BUILD else c
            tile = base_tile(ground, x, y).copy()
            if ground in EDGE:
                d = ImageDraw.Draw(tile)
                def lower(nx, ny):
                    if not (0 <= nx < cols and 0 <= ny < rows): return False
                    nc = int(cls[ny, nx]); nc = GRASS if nc == BUILD else nc
                    return PRIORITY[nc] < PRIORITY[ground]
                col = EDGE[ground]
                if lower(x, y - 1): d.line([(0, 0), (T - 1, 0)], fill=col)
                if lower(x, y + 1): d.line([(0, T - 1), (T - 1, T - 1)], fill=col)
                if lower(x - 1, y): d.line([(0, 0), (0, T - 1)], fill=col)
                if lower(x + 1, y): d.line([(T - 1, 0), (T - 1, T - 1)], fill=col)
            img.paste(tile, (x * T, y * T))
    # sprites: buildings and trees, y-sorted by base row
    sprites = []  # (base_y, x_px, y_px, image)
    # buildings: one sprite per building id
    for b in range(1, bid.max() + 1):
        ys, xs = np.nonzero(bid == b)
        if len(ys) == 0: continue
        rnd = random.Random(b * 9176)
        red = rnd.random() < 0.55
        roof = ktile(53 if red else 49); roof_top = ktile(52 if red else 48)
        wall_plain = ktile(73 if rnd.random() < 0.6 else 77)
        door = ktile(rnd.choice([85, 86, 87])); window = ktile(84 if rnd.random() < 0.6 else 88)
        cells = set(zip(xs.tolist(), ys.tolist()))
        x0, y0, x1, y1 = xs.min(), ys.min() - 1, xs.max(), ys.max()
        sp = Image.new('RGBA', ((x1 - x0 + 1) * T, (y1 - y0 + 1) * T))
        south = sorted([(x, y) for (x, y) in cells if (x, y + 1) not in cells], key=lambda p: (p[1], p[0]))
        door_cell = south[len(south) // 2] if south else None
        outline = Image.new('L', sp.size, 0); od = ImageDraw.Draw(outline)
        for (x, y) in cells:
            px, py = (x - x0) * T, (y - y0) * T
            is_south = (x, y + 1) not in cells
            is_upper_wall = (not is_south) and (x, y + 1) in cells and (x, y + 2) not in cells and (x, y - 1) in cells
            # two wall rows on the south edge (door on the lower, windows on the upper), roof everywhere else,
            # plus a one-cell roof overhang above the north edge
            if is_south: tile = door if (x, y) == door_cell else wall_plain
            elif is_upper_wall: tile = window if (x + y) % 3 == 0 else wall_plain
            else: tile = roof
            sp.paste(tile, (px, py))
            if (x, y - 1) not in cells:
                sp.paste(roof_top, (px, py - T))
                od.rectangle([px, py - T, px + T - 1, py + T - 1], fill=1)
            od.rectangle([px, py, px + T - 1, py + T - 1], fill=1)
        # 1px dark outline around the whole sprite silhouette
        arr = np.array(outline, dtype=bool)
        er = arr.copy()
        er[1:, :] &= arr[:-1, :]; er[:-1, :] &= arr[1:, :]; er[:, 1:] &= arr[:, :-1]; er[:, :-1] &= arr[:, 1:]
        rim = arr & ~er
        spa = np.array(sp); spa[rim] = (52, 40, 44, 255); sp = Image.fromarray(spa)
        sprites.append((y1, x0 * T, y0 * T, sp))
    # trees: deterministic jittered grid by landuse density, plus real POI trees
    tree_imgs = [ktile(4), ktile(5), ktile(16), ktile(28)]
    tall = [(ktile(19), ktile(31)), (ktile(18), ktile(30)), (ktile(20), ktile(32))]
    def tree_sprite(rnd, big):
        if big:
            top, bot = rnd.choice(tall); im = Image.new('RGBA', (T, 2 * T)); im.paste(top, (0, 0)); im.paste(bot, (0, T)); return im
        return rnd.choice(tree_imgs)
    for y in range(rows):
        for x in range(cols):
            dens = float(tree_density[y, x])
            if dens <= 0 or cls[y, x] != GRASS: continue
            rnd = random.Random((x * 31337) ^ (y * 7919) ^ 5)
            if rnd.random() < dens:
                big = rnd.random() < 0.5
                im = tree_sprite(rnd, big)
                jx, jy = rnd.randrange(-4, 5), rnd.randrange(-4, 5)
                sprites.append((y + 0.5, x * T + jx, y * T + jy - (T if big else 0), im))
    for (px, py) in pts:
        cx, cy = int(px), int(py)
        if not (0 <= cx < cols and 0 <= cy < rows): continue
        if cls[cy, cx] == BUILD: continue
        rnd = random.Random(int(px * 100) ^ int(py * 100))
        im = tree_sprite(rnd, True)
        sprites.append((py, int(px * T) - T // 2, int(py * T) - 2 * T + 4, im))
    # bushes on scrub
    # character at centre
    ch = Image.new('RGBA', (T, 24)); d = ImageDraw.Draw(ch)
    d.rectangle([5, 12, 10, 21], fill=(60, 90, 160, 255)); d.rectangle([5, 4, 10, 11], fill=(236, 190, 150, 255))
    d.rectangle([4, 2, 11, 5], fill=(110, 70, 40, 255)); d.rectangle([6, 22, 9, 23], fill=(40, 40, 40, 255))
    d.point([(6, 7), (9, 7)], fill=(30, 30, 30, 255)); d.rectangle([2, 12, 4, 17], fill=(236, 190, 150, 255)); d.rectangle([11, 12, 13, 17], fill=(236, 190, 150, 255))
    sprites.append((rows / 2, cols // 2 * T, rows // 2 * T - 8, ch))
    for base, px, py, im in sorted(sprites, key=lambda s: s[0]):
        img.alpha_composite(im, (px, py)) if px >= 0 and py >= 0 and px + im.width <= W and py + im.height <= H else img.paste(im, (px, py), im)
    img.save(out)
    counts = {k: int((cls == v).sum()) for k, v in [('grass', GRASS), ('farm', FARM), ('sand', SAND), ('wet', WET), ('pave', PAVE), ('water', WATER), ('road', ROAD), ('path', PATH), ('building', BUILD)]}
    print(name, 'buildings', int(bid.max()), 'sprites', len(sprites), counts)

for name in sys.argv[1:]:
    render(name, f"{S}/{name}.png")
