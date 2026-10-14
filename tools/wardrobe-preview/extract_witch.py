"""Extract the approved witch hat and ears without redrawing or recoloring.

Run: python3 tools/wardrobe-preview/extract_witch.py
Writes a preview-only PNG and source-mask record in concepts/luna/wardrobe-review.
The mask excludes the source cat's head and the shoulder touching the rear brim.
"""
from collections import deque
import json
import struct
import zlib
import sys
sys.dont_write_bytecode = True
from extract_bowler import ROOT, SOURCE, read_png, inside, chunk

DEST = ROOT / 'concepts/luna/wardrobe-review'
CROP = [588, 28, 215, 162]
MASK = [[588,28],[803,28],[803,133],[792,137],[783,143],
        [773,143],[773,137],[765,135],[751,135],[751,141],
        [730,141],[730,147],[718,147],[718,153],[706,153],
        [706,160],[694,160],[694,165],[680,165],[680,173],
        [668,173],[668,179],[655,179],[655,187],[626,187],
        [626,182],[619,182],[619,169],[588,169]]


def main():
    rows = read_png(SOURCE)
    x0,y0,width,height = CROP
    paper,queue = set(),deque()
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
    scanlines,visible = bytearray(),0
    for y in range(height):
        scanlines.append(0)
        for x in range(width):
            rgb = rows[y+y0][(x+x0)*3:(x+x0)*3+3]
            alpha = 255 if (x,y) not in paper and inside(x+x0+.5,y+y0+.5,MASK) else 0
            # The antialiased underside meets grey/white fur. Exclude that
            # narrow light fringe without changing any retained RGB pixels.
            if y+y0>=130 and min(rgb)>90 and not inside(x+x0+.5,y+y0+6.5,MASK):
                alpha = 0
            scanlines.extend(rgb if alpha else b'\0\0\0');scanlines.append(alpha)
            visible += bool(alpha)
    DEST.mkdir(parents=True,exist_ok=True)
    png = b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,6,0,0,0))
    png += chunk(b'IDAT',zlib.compress(scanlines,9))+chunk(b'IEND',b'')
    (DEST/'witch-concept.png').write_bytes(png)
    (DEST/'witch-extraction.json').write_text(json.dumps({
        'source':'../04-approved-wardrobe.png','crop':CROP,'mask':MASK,
        'opaquePixels':visible,'status':'preview-only-awaiting-owner-review',
        'method':'Original RGB pixels; exterior paper flood fill; brim mask; light fur fringe excluded within six pixels of lower edge after y=130'
    },indent=2)+'\n')
    print(f'Extracted {visible} original pixels to {DEST / "witch-concept.png"}')


if __name__ == '__main__':
    main()
