"""Render the code-native pixel seedling icon; Python standard library only."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1] / 'public'
RECTS = [(15, 13, 2, 12, '#284f3d'), (9, 11, 6, 3, '#628653'), (11, 14, 5, 3, '#628653'), (17, 8, 6, 3, '#8faa6a'), (17, 11, 4, 3, '#8faa6a'), (10, 25, 12, 2, '#284f3d')]
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><rect width="32" height="32" fill="#f5f3e9"/>' + ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/>' for x, y, w, h, c in RECTS) + '</svg>\n'
(ROOT / 'favicon.svg').write_text(svg)
def rgb(c): return bytes.fromhex(c.lstrip('#'))
def chunk(t, data): return struct.pack('>I', len(data)) + t + data + struct.pack('>I', zlib.crc32(t + data))
for size in (192, 512):
    rows = bytearray()
    for py in range(size):
        rows.append(0)
        for px in range(size):
            col = '#f5f3e9'
            for x, y, w, h, c in RECTS:
                if x <= px * 32 / size < x + w and y <= py * 32 / size < y + h: col = c
            rows.extend(rgb(col))
    (ROOT / f'icon-{size}.png').write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b''))
