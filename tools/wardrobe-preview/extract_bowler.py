"""Extract approved bowler pixels; Python standard library only.

Run from any directory: python3 tools/wardrobe-preview/extract_bowler.py
The lower mask follows the brim, excluding the concept cat's head. Flood-fill
removes only exterior cream paper, preserving enclosed light inner-ear pixels.
No drawing, recoloring, or resizing is performed.
"""
from pathlib import Path
from collections import deque
import json
import struct
import zlib

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'concepts/luna/04-approved-wardrobe.png'
DEST = ROOT / 'concepts/luna/bowler-review'


def read_png(path):
    data = path.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    offset, compressed = 8, bytearray()
    while offset < len(data):
        size = struct.unpack('>I', data[offset:offset+4])[0]
        kind, body = data[offset+4:offset+8], data[offset+8:offset+8+size]
        if kind == b'IHDR':
            width, height, depth, color, _, _, interlace = struct.unpack('>IIBBBBB', body)
            assert depth == 8 and color == 2 and interlace == 0, 'Expected RGB8 PNG'
        if kind == b'IDAT':
            compressed.extend(body)
        offset += size+12
    raw, stride = zlib.decompress(compressed), width*3
    rows, previous = [], bytearray(stride)
    for y in range(height):
        start = y*(stride+1)
        mode, row = raw[start], bytearray(raw[start+1:start+1+stride])
        for x in range(stride):
            a, b, c = (row[x-3] if x >= 3 else 0), previous[x], (previous[x-3] if x >= 3 else 0)
            if mode == 1:
                row[x] = (row[x]+a) % 256
            elif mode == 2:
                row[x] = (row[x]+b) % 256
            elif mode == 3:
                row[x] = (row[x]+(a+b)//2) % 256
            elif mode == 4:
                p = a+b-c
                distances = [abs(p-a), abs(p-b), abs(p-c)]
                row[x] = (row[x]+[a,b,c][distances.index(min(distances))]) % 256
            else:
                assert mode == 0
        rows.append(row)
        previous = row
    return rows


def inside(x, y, polygon):
    result = False
    for (ax,ay),(bx,by) in zip(polygon,polygon[1:]+polygon[:1]):
        if (ay > y) != (by > y) and x < (bx-ax)*(y-ay)/(by-ay)+ax:
            result = not result
    return result


def chunk(kind, body):
    return struct.pack('>I',len(body))+kind+body+struct.pack('>I',zlib.crc32(kind+body))


def main():
    rows = read_png(SOURCE)
    x0,y0,width,height = 242,78,173,96
    # Coordinates are in the original 1254px concept board.
    mask = [[242,78],[415,78],[415,153],[411,158],[403,160],
            [388,160],[388,156],[380,156],[380,154],[374,154],
            [374,152],[312,152],[312,156],[310,156],[310,160],
            [280,160],[280,166],[265,166],[265,173],[255,173],
            [249,167],[242,164]]
    paper, queue = set(), deque()
    def cream(x,y):
        r,g,b = rows[y+y0][(x+x0)*3:(x+x0)*3+3]
        return r>210 and g>205 and b>190 and max(r,g,b)-min(r,g,b)<45
    for y in range(height):
        for x in range(width):
            if (x in (0,width-1) or y in (0,height-1)) and cream(x,y):
                paper.add((x,y));queue.append((x,y))
    while queue:
        x,y = queue.popleft()
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0<=nx<width and 0<=ny<height and (nx,ny) not in paper and cream(nx,ny):
                paper.add((nx,ny));queue.append((nx,ny))
    scanlines, visible = bytearray(), 0
    for y in range(height):
        scanlines.append(0)
        for x in range(width):
            rgb = rows[y+y0][(x+x0)*3:(x+x0)*3+3]
            alpha = 255 if (x,y) not in paper and inside(x+x0+.5,y+y0+.5,mask) else 0
            scanlines.extend(rgb if alpha else b'\0\0\0')
            scanlines.append(alpha)
            visible += bool(alpha)
    DEST.mkdir(parents=True,exist_ok=True)
    png = b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,6,0,0,0))
    png += chunk(b'IDAT',zlib.compress(scanlines,9))+chunk(b'IEND',b'')
    (DEST/'bowler.png').write_bytes(png)
    (DEST/'extraction.json').write_text(json.dumps({
        'source':'../04-approved-wardrobe.png','crop':[x0,y0,width,height],
        'mask':mask,'opaquePixels':visible,'method':'Original RGB pixels; exterior paper flood fill; lower brim mask'
    },indent=2)+'\n')
    print(f'Extracted {visible} original pixels to {DEST / "bowler.png"}')


if __name__ == '__main__':
    main()
