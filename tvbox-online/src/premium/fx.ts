/**
 * fx.ts — reusable Gold Luxe building blocks for the premium intro scene.
 * Pure PIXI 7; no vendored tvkit dependency.
 */
import * as PIXI from 'pixi.js';
import { COLORS, FONTS, TRAP_COLORS, TRAP_IS_CHECKERED, hex } from './theme';

/** Build a PIXI texture from a canvas-drawn linear gradient. */
export function gradientTexture(
  w: number,
  h: number,
  stops: Array<[number, number]>, // [offset 0..1, color 0xRRGGBB]
  vertical = true,
): PIXI.Texture {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d')!;
  const g = vertical
    ? ctx.createLinearGradient(0, 0, 0, c.height)
    : ctx.createLinearGradient(0, 0, c.width, 0);
  for (const [off, col] of stops) g.addColorStop(off, hex(col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  return PIXI.Texture.from(c);
}

/** Radial charcoal background with a faint warm-gold glow toward the centre. */
export function radialBackground(w: number, h: number): PIXI.Sprite {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = hex(COLORS.charcoalDown);
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(
    w * 0.5, h * 0.42, h * 0.05,
    w * 0.5, h * 0.5, h * 0.95,
  );
  g.addColorStop(0, 'rgba(70,58,28,0.55)');
  g.addColorStop(0.45, 'rgba(33,32,26,0.6)');
  g.addColorStop(1, hex(COLORS.charcoalDown));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // vignette
  const v = ctx.createRadialGradient(
    w * 0.5, h * 0.5, h * 0.45,
    w * 0.5, h * 0.5, h * 0.95,
  );
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  return new PIXI.Sprite(PIXI.Texture.from(c));
}

export interface GlassPanelOpts {
  w: number;
  h: number;
  radius?: number;
  /** per-corner radii [topLeft, topRight, bottomRight, bottomLeft]; overrides radius */
  corners?: [number, number, number, number];
  /** gold border opacity 0..1 */
  border?: number;
  /** add a thin bright top sheen line */
  sheen?: boolean;
}

/** Trace a rounded-rect path with independent corner radii. */
function traceRR(
  g: PIXI.Graphics, x: number, y: number, w: number, h: number,
  tl: number, tr: number, br: number, bl: number,
): void {
  g.moveTo(x + tl, y);
  g.lineTo(x + w - tr, y);
  if (tr > 0) g.arcTo(x + w, y, x + w, y + tr, tr); else g.lineTo(x + w, y);
  g.lineTo(x + w, y + h - br);
  if (br > 0) g.arcTo(x + w, y + h, x + w - br, y + h, br); else g.lineTo(x + w, y + h);
  g.lineTo(x + bl, y + h);
  if (bl > 0) g.arcTo(x, y + h, x, y + h - bl, bl); else g.lineTo(x, y + h);
  g.lineTo(x, y + tl);
  if (tl > 0) g.arcTo(x, y, x + tl, y, tl); else g.lineTo(x, y);
  g.closePath();
}

/**
 * Glass panel — charcoal vertical-gradient fill, soft inner top sheen and a
 * gold hairline border. The signature surface of the Gold Luxe look.
 */
export function glassPanel(o: GlassPanelOpts): PIXI.Container {
  const { w, h, radius = 14, border = 0.6, sheen = true } = o;
  const [tl, tr, br, bl] = o.corners ?? [radius, radius, radius, radius];
  const cont = new PIXI.Container();

  const fill = new PIXI.Graphics();
  fill.beginFill(COLORS.charcoalUp, 0.92);
  traceRR(fill, 0, 0, w, h, tl, tr, br, bl);
  fill.endFill();
  // gradient overlay using a tinted sprite masked to the rounded rect
  const grad = new PIXI.Sprite(
    gradientTexture(w, h, [
      [0, COLORS.charcoalUp],
      [1, COLORS.charcoalDown],
    ]),
  );
  grad.width = w;
  grad.height = h;
  grad.alpha = 0.85;
  const mask = new PIXI.Graphics();
  mask.beginFill(0xffffff);
  traceRR(mask, 0, 0, w, h, tl, tr, br, bl);
  mask.endFill();
  grad.mask = mask;

  const stroke = new PIXI.Graphics();
  stroke.lineStyle({ width: 1.5, color: COLORS.gold, alpha: border });
  traceRR(stroke, 0.75, 0.75, w - 1.5, h - 1.5, tl, tr, br, bl);

  cont.addChild(fill, grad, mask, stroke);

  if (sheen) {
    const s = new PIXI.Graphics();
    s.lineStyle({ width: 1, color: COLORS.goldBright, alpha: 0.35 });
    s.moveTo(tl, 1.5);
    s.lineTo(w - tr, 1.5);
    cont.addChild(s);
  }
  return cont;
}

export type TextWeight = keyof typeof FONTS;

export function text(
  str: string,
  opts: {
    size: number;
    color?: number;
    weight?: TextWeight;
    letterSpacing?: number;
    align?: PIXI.TextStyleAlign;
  },
): PIXI.Text {
  const t = new PIXI.Text(str, {
    fontFamily: FONTS[opts.weight ?? 'medium'],
    fontSize: opts.size,
    fill: opts.color ?? COLORS.cream,
    letterSpacing: opts.letterSpacing ?? 0,
    align: opts.align ?? 'left',
  });
  t.resolution = 2;
  return t;
}

/** Trap colour chip (rounded square) with the trap number centred. */
export function trapBadge(trap: number, sz = 34): PIXI.Container {
  const c = new PIXI.Container();
  const base = TRAP_COLORS[trap] ?? COLORS.smoke;
  const g = new PIXI.Graphics();
  g.beginFill(base, 1).drawRoundedRect(0, 0, sz, sz, 7).endFill();
  if (TRAP_IS_CHECKERED[trap]) {
    // checker hint
    g.beginFill(0x222222, 1);
    const n = 4;
    const cell = sz / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if ((i + j) % 2 === 0) g.drawRect(i * cell, j * cell, cell, cell);
    g.endFill();
  }
  g.lineStyle({ width: 1, color: COLORS.gold, alpha: 0.5 }).drawRoundedRect(0.5, 0.5, sz - 1, sz - 1, 7);
  const dark = base === 0x1a1a1a || base === TRAP_COLORS[2] || base === TRAP_COLORS[1] || base === TRAP_COLORS[7];
  const num = text(String(trap), { size: sz * 0.55, weight: 'display', color: dark ? COLORS.cream : COLORS.ink });
  num.anchor.set(0.5);
  num.position.set(sz / 2, sz / 2 + 1);
  c.addChild(g, num);
  return c;
}

/** A text node whose numeric value can be tweened (count-up). */
export interface CountText {
  node: PIXI.Text;
  /** set displayed value with formatting */
  render: (v: number) => void;
  /** the proxy object gsap tweens (`.v`) */
  proxy: { v: number };
}

export function countText(
  initial: number,
  fmt: (v: number) => string,
  opts: Parameters<typeof text>[1],
): CountText {
  const proxy = { v: initial };
  const node = text(fmt(initial), opts);
  const render = (v: number) => {
    proxy.v = v;
    node.text = fmt(v);
  };
  return { node, render, proxy };
}

/** Draw a small sparkline polyline into a Graphics, normalised to box. */
export function sparkline(
  values: number[],
  w: number,
  h: number,
  color = COLORS.goldText,
): PIXI.Graphics {
  const g = new PIXI.Graphics();
  if (values.length < 2) return g;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = w / (values.length - 1);
  g.lineStyle({ width: 2, color, alpha: 0.9, join: 'round', cap: 'round' });
  values.forEach((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / span) * h;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  });
  return g;
}
