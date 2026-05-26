#!/usr/bin/env python3
"""Velocity Luxe — TVBox favicon.

Same gold signet as the lobby favicon, but the emblem is a TV/monitor on a
pedestal with a play triangle (the race-viewer motif), with geometry taken from
tvbox-online's own tv-play.svg. The screen is punched out as dark emerald glass.
"""
import math
from PIL import Image, ImageDraw, ImageFilter

OUT = "/home/claude/projects/virtuales-online/branding/favicon/tvbox"

# ---- palette (shared Gold Luxe) -----------------------------------------
GREEN_TOP   = (16, 64, 47)
GREEN_BOT   = (6, 20, 15)
GOLD_HI     = (250, 228, 156)
GOLD_MID    = (232, 184, 70)
GOLD_DEEP   = (150, 110, 32)
RING_GOLD   = (212, 169, 70)
SCREEN_TOP  = (18, 74, 55)     # glass — slightly brighter than field so it "glows"
SCREEN_BOT  = (7, 26, 19)

S = 4
BASE = 1024
W = BASE * S


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(len(a)))


def vgrad(size, top, bot):
    w, h = size
    g = Image.new("RGB", (1, h))
    px = g.load()
    for y in range(h):
        px[0, y] = lerp(top, bot, y / max(1, h - 1))
    return g.resize((w, h))


# ---- field (identical signet to the lobby) ------------------------------
canvas = Image.new("RGBA", (W, W), (0, 0, 0, 0))
cx = cy = W / 2.0
r = W / 2.0
n = 4.0
mask = Image.new("L", (W, W), 0)
mp = mask.load()
for y in range(W):
    for x in range(W):
        v = (abs(x - cx) / r) ** n + (abs(y - cy) / r) ** n
        if v <= 1.0:
            edge = (1.0 - v) * r
            mp[x, y] = 255 if edge > 2 * S else int(255 * max(0, edge) / (2 * S))

bg = vgrad((W, W), GREEN_TOP, GREEN_BOT).convert("RGBA")
glow = Image.new("L", (W, W), 0)
gr = int(W * 0.40)
ImageDraw.Draw(glow).ellipse([cx - gr, cy - gr * 0.95, cx + gr, cy + gr * 0.95], fill=70)
glow = glow.filter(ImageFilter.GaussianBlur(W * 0.10))
bg = Image.composite(Image.new("RGBA", (W, W), GOLD_MID + (255,)), bg,
                     glow.point(lambda v: int(v * 0.45)))
canvas.paste(bg, (0, 0), mask)

# ---- emblem transform (art units: 126 x 120, from tv-play.svg) ----------
EW = 0.560                      # emblem width as fraction of icon
scale = (EW * W) / 126.0
art_w, art_h = 126 * scale, 120 * scale
ox = (W - art_w) / 2.0
oy = (W - art_h) / 2.0


def X(x): return ox + x * scale
def Y(y): return oy + y * scale
def R(v): return v * scale       # radius/length in art units → working px


# 1) gold silhouette mask: pedestal base + neck + TV body
sil = Image.new("L", (W, W), 0)
sd = ImageDraw.Draw(sil)
sd.rounded_rectangle([X(38), Y(105), X(89), Y(120)], radius=R(7.5), fill=255)   # base
sd.rectangle([X(55), Y(97), X(70.65), Y(105)], fill=255)                        # neck
sd.rounded_rectangle([X(0), Y(0), X(126), Y(97)], radius=R(20), fill=255)       # TV body

# 2) metallic grading across the emblem's vertical extent
grad = Image.new("RGBA", (W, W), (0, 0, 0, 0))
grad.paste(vgrad((W, int(art_h) + 2), GOLD_HI, GOLD_DEEP), (0, int(oy)))
emblem = Image.new("RGBA", (W, W), (0, 0, 0, 0))
emblem.paste(grad, (0, 0), sil)

# 3) punch the screen as emerald glass
scr = Image.new("L", (W, W), 0)
ImageDraw.Draw(scr).rounded_rectangle([X(15), Y(15), X(111), Y(82)], radius=R(6), fill=255)
screen_rgb = Image.new("RGBA", (W, W), (0, 0, 0, 0))
screen_rgb.paste(vgrad((W, int(R(67)) + 2), SCREEN_TOP, SCREEN_BOT), (0, int(Y(15))))
emblem.paste(screen_rgb, (0, 0), scr)

# subtle diagonal glass highlight on the screen
gloss = Image.new("RGBA", (W, W), (0, 0, 0, 0))
ImageDraw.Draw(gloss).polygon(
    [(X(15), Y(15)), (X(70), Y(15)), (X(15), Y(60))], fill=(255, 255, 255, 26))
emblem = Image.alpha_composite(emblem, Image.composite(
    gloss, Image.new("RGBA", (W, W), (0, 0, 0, 0)), scr))

# 4) play triangle (centered in the screen)
tri = [(X(46), Y(29)), (X(46), Y(68)), (X(85), Y(48.5))]
td = ImageDraw.Draw(emblem)
td.polygon(tri, fill=GOLD_HI + (255,))

# 5) inner bezel line around the screen for depth
ImageDraw.Draw(emblem).rounded_rectangle(
    [X(15), Y(15), X(111), Y(82)], radius=R(6),
    outline=GOLD_DEEP + (170,), width=max(2, int(R(1.4))))

# ---- shadow + composite --------------------------------------------------
shadow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
shadow.paste((0, 0, 0, 120), (0, 0), emblem.split()[3])
shadow = shadow.filter(ImageFilter.GaussianBlur(W * 0.008))
off = int(W * 0.009)
canvas.alpha_composite(shadow, (off, off))
canvas = Image.alpha_composite(canvas, emblem)

# ---- inner ring (identical to lobby) ------------------------------------
ring = Image.new("RGBA", (W, W), (0, 0, 0, 0))
inset = int(W * 0.055)
ImageDraw.Draw(ring).rounded_rectangle(
    [inset, inset, W - inset, W - inset], radius=int(W * 0.225),
    outline=RING_GOLD + (180,), width=max(2, int(W * 0.010)))
canvas = Image.alpha_composite(canvas, ring)
canvas.putalpha(Image.composite(canvas.split()[3], Image.new("L", (W, W), 0), mask))

# ---- export --------------------------------------------------------------
import os
os.makedirs(OUT, exist_ok=True)
master = canvas.resize((BASE, BASE), Image.LANCZOS)
master.save(f"{OUT}/icon-master-1024.png")
for s in [16, 32, 48, 64, 96, 128, 180, 192, 256, 512]:
    master.resize((s, s), Image.LANCZOS).save(f"{OUT}/favicon-{s}.png")
master.save(f"{OUT}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("done")
