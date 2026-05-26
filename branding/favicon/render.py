#!/usr/bin/env python3
"""Velocity Luxe — virtual-sports favicon generator.

A gold finish-flag signet on a dusk-stadium field. Rendered at 4x supersampling
and downscaled with LANCZOS for loupe-clean edges, then exported to the favicon
sizes a browser tab actually needs (+ multi-res .ico).
"""
import math
from PIL import Image, ImageDraw, ImageFilter

OUT = "/home/claude/projects/virtuales-online/branding/favicon"

# ---- palette (Gold Luxe) -------------------------------------------------
GREEN_TOP   = (16, 64, 47)     # deep emerald — turf at dusk
GREEN_BOT   = (6, 20, 15)      # near-black green
GOLD_HI     = (250, 228, 156)  # high catchlight
GOLD_MID    = (232, 184, 70)   # bright checker square
GOLD_DEEP   = (150, 110, 32)   # burnished shadow
GOLD_ALT    = (104, 73, 18)    # darker checker square — more contrast for small sizes
RING_GOLD   = (212, 169, 70)

S = 4                # supersample factor
BASE = 1024          # master output size
W = BASE * S         # working canvas


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(len(a)))


def vgrad(size, top, bot):
    """Vertical gradient image."""
    w, h = size
    g = Image.new("RGB", (1, h))
    px = g.load()
    for y in range(h):
        px[0, y] = lerp(top, bot, y / max(1, h - 1))
    return g.resize((w, h))


# ---- 1. field (squircle background) -------------------------------------
canvas = Image.new("RGBA", (W, W), (0, 0, 0, 0))

# squircle mask (superellipse n=4) for a soft-shouldered app-icon shape
mask = Image.new("L", (W, W), 0)
mp = mask.load()
cx = cy = W / 2.0
r = W / 2.0
n = 4.0
for y in range(W):
    for x in range(W):
        dx = abs(x - cx) / r
        dy = abs(y - cy) / r
        v = dx ** n + dy ** n
        if v <= 1.0:
            # smooth 1px-ish edge in working space
            edge = (1.0 - v) * r
            mp[x, y] = 255 if edge > 2 * S else int(255 * max(0, edge) / (2 * S))

bg = vgrad((W, W), GREEN_TOP, GREEN_BOT).convert("RGBA")

# radial gold glow behind the emblem
glow = Image.new("L", (W, W), 0)
gd = ImageDraw.Draw(glow)
gr = int(W * 0.40)
gd.ellipse([cx - gr, cy - gr * 0.95, cx + gr, cy + gr * 0.95], fill=70)
glow = glow.filter(ImageFilter.GaussianBlur(W * 0.10))
gold_layer = Image.new("RGBA", (W, W), GOLD_MID + (255,))
bg = Image.composite(gold_layer, bg, glow.point(lambda v: int(v * 0.45)))

canvas.paste(bg, (0, 0), mask)


# ---- 2. finish flag ------------------------------------------------------
# geometry (in working space)
pole_x = W * 0.345
pole_top = W * 0.205
pole_bot = W * 0.815
flag_x0 = pole_x
flag_x1 = W * 0.760
flag_y0 = W * 0.250          # top edge of flag band at the pole
flag_h = W * 0.300           # band height
COLS, ROWS = 4, 3
wave_amp = W * 0.030
wave_len = (flag_x1 - flag_x0) * 0.92

flag = Image.new("RGBA", (W, W), (0, 0, 0, 0))
fd = ImageDraw.Draw(flag)


def wave_y(x):
    return wave_amp * math.sin(2 * math.pi * (x - flag_x0) / wave_len)


def taper(x):
    # band height eases slightly toward the free edge for a furled feel
    t = (x - flag_x0) / (flag_x1 - flag_x0)
    return flag_h * (1.0 - 0.10 * t)

cell_w = (flag_x1 - flag_x0) / COLS
for c in range(COLS):
    xL = flag_x0 + c * cell_w
    xR = xL + cell_w
    for rrow in range(ROWS):
        is_gold = (c + rrow) % 2 == 0
        col = GOLD_MID if is_gold else GOLD_ALT
        # top/bottom of this row at left & right edges, following wave + taper
        def edge(x, row):
            top = flag_y0 + wave_y(x)
            h = taper(x)
            return top + h * row / ROWS, top + h * (row + 1) / ROWS
        tL, bL = edge(xL, rrow)
        tR, bR = edge(xR, rrow)
        fd.polygon([(xL, tL), (xR, tR), (xR, bR), (xL, bL)], fill=col + (255,))

# sheen: vertical light→dark overlay masked to the flag shape
flag_alpha = flag.split()[3]
sheen = Image.new("RGBA", (W, W), (0, 0, 0, 0))
sp = sheen.load()
# build a light-to-shadow vertical gloss across the flag band region
y_lo = int(flag_y0 - wave_amp)
y_hi = int(flag_y0 + flag_h + wave_amp)
for y in range(max(0, y_lo), min(W, y_hi)):
    t = (y - y_lo) / max(1, (y_hi - y_lo))
    if t < 0.5:
        a = int(90 * (1 - t / 0.5)); col = (255, 245, 215, a)   # highlight up top
    else:
        a = int(70 * ((t - 0.5) / 0.5)); col = (40, 24, 0, a)    # shadow at base
    for x in range(int(flag_x0), int(flag_x1)):
        sp[x, y] = col
sheen.putalpha(Image.composite(sheen.split()[3], Image.new("L", (W, W), 0), flag_alpha))
flag = Image.alpha_composite(flag, sheen)

# thin seam lines between cells for crisp definition
for c in range(1, COLS):
    x = flag_x0 + c * cell_w
    pts = [(x, flag_y0 + wave_y(x) - 2), (x, flag_y0 + wave_y(x) + taper(x) + 2)]
    fd2 = ImageDraw.Draw(flag)
    fd2.line(pts, fill=(0, 0, 0, 40), width=max(1, S))

# drop shadow for the whole flag
shadow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
shadow.paste((0, 0, 0, 120), (0, 0), flag.split()[3])
shadow = shadow.filter(ImageFilter.GaussianBlur(W * 0.008))
off = int(W * 0.009)
canvas.alpha_composite(shadow, (off, off))
canvas = Image.alpha_composite(canvas, flag)

# ---- 3. pole -------------------------------------------------------------
pole = Image.new("RGBA", (W, W), (0, 0, 0, 0))
pd = ImageDraw.Draw(pole)
pw = W * 0.026
# gold gradient rod: deep edge → bright core → deep edge
steps = 24
for i in range(steps):
    t = i / (steps - 1)
    xx = pole_x - pw / 2 + pw * t
    shade = lerp(GOLD_DEEP, GOLD_HI, 1 - abs(t - 0.42) / 0.58)
    pd.line([(xx, pole_top), (xx, pole_bot)], fill=shade + (255,), width=max(1, int(pw / steps) + S))
# rounded caps
pd.ellipse([pole_x - pw/2, pole_top - pw/2, pole_x + pw/2, pole_top + pw/2], fill=GOLD_MID + (255,))
pd.ellipse([pole_x - pw/2, pole_bot - pw/2, pole_x + pw/2, pole_bot + pw/2], fill=GOLD_DEEP + (255,))
# finial ball
fr = pw * 1.45
fcx, fcy = pole_x, pole_top - fr * 0.55
pd.ellipse([fcx - fr, fcy - fr, fcx + fr, fcy + fr], fill=GOLD_MID + (255,))
pd.ellipse([fcx - fr*0.5, fcy - fr*0.55, fcx + fr*0.1, fcy + fr*0.05], fill=GOLD_HI + (255,))
canvas = Image.alpha_composite(canvas, pole)

# ---- 4. inner ring border ------------------------------------------------
ring = Image.new("RGBA", (W, W), (0, 0, 0, 0))
rd = ImageDraw.Draw(ring)
inset = int(W * 0.055)
rw = max(2, int(W * 0.010))
# draw ring by stroking the squircle: approximate with rounded rect
rad = int(W * 0.225)
rd.rounded_rectangle([inset, inset, W - inset, W - inset], radius=rad,
                     outline=RING_GOLD + (180,), width=rw)
canvas = Image.alpha_composite(canvas, ring)

# re-apply squircle mask so nothing spills past the field
canvas.putalpha(Image.composite(canvas.split()[3], Image.new("L", (W, W), 0), mask))

# ---- downscale master & export ------------------------------------------
master = canvas.resize((BASE, BASE), Image.LANCZOS)
master.save(f"{OUT}/icon-master-1024.png")

sizes = [16, 32, 48, 64, 96, 128, 180, 192, 256, 512]
for s in sizes:
    master.resize((s, s), Image.LANCZOS).save(f"{OUT}/favicon-{s}.png")

# multi-resolution .ico
master.save(f"{OUT}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("done")
