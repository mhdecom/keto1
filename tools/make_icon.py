"""
Generates the app icon set for It's a Match.

The mark is two overlapping circles with the intersection filled: the overlap
is what the product actually computes — shared level, shared calendar, shared
court, and it is the brightest thing in the frame.

No tennis seam: on an outlined mark the seam can only be drawn by cutting
through the ring, which reads as a defect rather than as a ball. The tennis
identity comes from the palette — court green and ball yellow — and the mark
stays legible down to 29 pixels, which a seam would not.

Rendered with an analytic signed-distance field rather than supersampling, so
edges stay clean at every size without a 16x buffer.
"""
import math
import struct
import zlib
from pathlib import Path

COURT = (11, 61, 44)
COURT_DEEP = (7, 43, 31)
BALL = (212, 227, 75)
WHITE = (255, 255, 255)


def write_png(path, width, height, rgba):
    raw = b''.join(b'\x00' + bytes(row) for row in rgba)
    def chunk(tag, data):
        body = tag + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xffffffff)
    Path(path).write_bytes(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b'')
    )


def coverage(sdf, feather=1.0):
    """Antialiased coverage from a signed distance: inside is negative."""
    return min(1.0, max(0.0, 0.5 - sdf / feather))


def over(dst, src, alpha):
    return tuple(round(dst[i] + (src[i] - dst[i]) * alpha) for i in range(3))


def render(size, *, opaque, scale=1.0, monochrome=False):
    """One frame of the mark. `scale` shrinks the art inside the canvas."""
    s = size / 1024.0
    cx, cy = size / 2, size / 2

    radius = 252 * s * scale
    offset = 172 * s * scale          # how far each circle sits from centre
    stroke = 52 * s * scale

    left = (cx - offset, cy)
    right = (cx + offset, cy)

    fg = WHITE if monochrome else BALL
    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            px, py = x + 0.5, y + 0.5

            dl = math.hypot(px - left[0], py - left[1]) - radius
            dr = math.hypot(px - right[0], py - right[1]) - radius

            if opaque and not monochrome:
                # Subtle radial lift so the tile is not a flat rectangle.
                t = min(1.0, math.hypot(px - cx, py - cy) / (size * 0.72))
                base = tuple(round(COURT[i] + (COURT_DEEP[i] - COURT[i]) * t) for i in range(3))
                alpha = 1.0
            else:
                base = COURT
                alpha = 0.0

            colour = base

            # Filled intersection.
            lens = coverage(max(dl, dr))
            if lens > 0:
                colour = over(colour, fg, lens)
                alpha = max(alpha, lens)

            # The two rings.
            for d in (dl, dr):
                ring = coverage(abs(d) - stroke / 2)
                if ring > 0:
                    colour = over(colour, fg, ring)
                    alpha = max(alpha, ring)

            row += bytes(colour) + bytes([round(min(1.0, alpha) * 255)])
        rows.append(row)
    return rows


def solid(size, rgb):
    row = bytes(rgb) + b'\xff'
    return [bytearray(row * size) for _ in range(size)]


OUT = Path('assets/images')
OUT.mkdir(parents=True, exist_ok=True)

# App Store icon: fully opaque, no alpha channel content, no rounded corners.
write_png(OUT / 'icon.png', 1024, 1024, render(1024, opaque=True))
# Android adaptive icon: art on transparency, inside the 66% safe zone.
write_png(OUT / 'android-icon-foreground.png', 1024, 1024, render(1024, opaque=False, scale=0.62))
write_png(OUT / 'android-icon-background.png', 1024, 1024, solid(1024, COURT))
write_png(OUT / 'android-icon-monochrome.png', 1024, 1024,
          render(1024, opaque=False, scale=0.62, monochrome=True))
# Splash: the mark alone, the screen behind it supplies the colour.
write_png(OUT / 'splash-icon.png', 512, 512, render(512, opaque=False, scale=0.78))
write_png(OUT / 'favicon.png', 64, 64, render(64, opaque=True))
print('icon set written')
