/**
 * scene.ts — the premium intro PIXI scene (Gold Luxe), MATRIX-CENTRIC.
 *
 * Faithful to the original intro's script: a brief brand open, then the EXACTA
 * odds matrix is the persistent centrepiece, and a ~75s animation cycle repeats
 * 2× over the 180s wait. Within each cycle the matrix slides aside to reveal
 * runner data (below) and the jackpot history (right). A countdown finale lands
 * at the off.
 *
 * The whole "film" is a paused GSAP timeline SCRUBBED each frame to
 * (FILM - remainingSec) from `clockRef`, so it always finishes at the off even
 * if we mount mid-wait. One PIXI root in a 1280×720 design space, scaled to fit.
 */
import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { GlowFilter } from '@pixi/filter-glow';
import { AdvancedBloomFilter } from '@pixi/filter-advanced-bloom';
import { COLORS, DESIGN_W, DESIGN_H } from './theme';
import {
  radialBackground, glassPanel, text, trapBadge, countText, sparkline,
} from './fx';
import type { PremiumData } from './data/PremiumData';

export interface Scene {
  resize: (w: number, h: number) => void;
  destroy: () => void;
}

function fmtClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function dotTexture(app: PIXI.Application): PIXI.Texture {
  const g = new PIXI.Graphics();
  g.beginFill(COLORS.goldBright, 1).drawCircle(8, 8, 8).endFill();
  const tex = app.renderer.generateTexture(g);
  g.destroy();
  return tex;
}

const STAGE_TOP = 76;
const STAGE_H = DESIGN_H - STAGE_TOP;

export function buildScene(
  app: PIXI.Application,
  data: PremiumData,
  clockRef: { current: number },
): Scene {
  const root = new PIXI.Container();
  app.stage.addChild(root);
  const N = data.runnerCount;

  // ── background + particles ────────────────────────────────────────────────
  // The bg covers the WHOLE canvas (resized in `resize`), not just the 16:9
  // design box — so a non-16:9 viewport shows the Gold Luxe gradient edge-to-edge
  // instead of empty letterbox bars.
  const bg = radialBackground(DESIGN_W, DESIGN_H);
  app.stage.addChildAt(bg, 0);
  const dotTex = dotTexture(app);
  const particles = new PIXI.Container();
  root.addChild(particles);
  const tweens: gsap.core.Tween[] = [];
  for (let i = 0; i < 32; i++) {
    const p = new PIXI.Sprite(dotTex);
    p.anchor.set(0.5);
    p.scale.set(0.08 + Math.random() * 0.2);
    p.x = Math.random() * DESIGN_W;
    p.y = Math.random() * DESIGN_H;
    p.alpha = 0.05 + Math.random() * 0.22;
    particles.addChild(p);
    const dur = 9 + Math.random() * 12;
    tweens.push(gsap.to(p, {
      y: p.y - (120 + Math.random() * 220), alpha: 0, duration: dur, repeat: -1,
      delay: -Math.random() * dur, ease: 'none',
      onRepeat: () => { p.y = DESIGN_H + 20; p.x = Math.random() * DESIGN_W; p.alpha = 0.05 + Math.random() * 0.22; },
    }));
  }

  // ── persistent header (race label + live clock) ───────────────────────────
  const header = new PIXI.Container();
  header.position.set(0, 8); // near the top edge → NEXT RACE sits flush under the jackpot bar
  root.addChild(header);
  // Left-aligned title: "NEXT RACE" then "RACE <n> · GREYHOUND 6". Clock right.
  const titleStr = data.raceNumber != null ? `RACE ${data.raceNumber} · ${data.raceLabel}` : data.raceLabel;
  const kicker = text('NEXT RACE', { size: 13, weight: 'medium', color: COLORS.gold, letterSpacing: 5 });
  kicker.position.set(56, 2);
  const raceTitle = text(titleStr, { size: 28, weight: 'display', color: COLORS.cream, letterSpacing: 2 });
  raceTitle.position.set(55, 18);
  const clockLabel = text('STARTS IN', { size: 12, weight: 'medium', color: COLORS.smoke, letterSpacing: 4 });
  clockLabel.anchor.set(1, 0); clockLabel.position.set(DESIGN_W - 56, 4);
  const clock = text(fmtClock(clockRef.current), { size: 30, weight: 'display', color: COLORS.goldBright, letterSpacing: 2 });
  clock.anchor.set(1, 0); clock.position.set(DESIGN_W - 56, 18);
  clock.filters = [new GlowFilter({ distance: 9, outerStrength: 0.8, color: COLORS.gold, quality: 0.3 })];
  const rule = new PIXI.Graphics();
  rule.lineStyle({ width: 2, color: COLORS.gold, alpha: 0.8 }).moveTo(56, 60).lineTo(DESIGN_W - 56, 60);
  rule.scale.x = 0;
  header.addChild(kicker, raceTitle, clockLabel, clock, rule);
  gsap.fromTo([kicker, raceTitle], { alpha: 0, x: '-=24' }, { alpha: 1, x: '+=24', duration: 0.9, ease: 'power3.out', stagger: 0.12 });
  gsap.fromTo([clockLabel, clock], { alpha: 0 }, { alpha: 1, duration: 0.9, delay: 0.3 });
  gsap.to(rule.scale, { x: 1, duration: 1.1, delay: 0.2, ease: 'power2.inOut' });

  const stage = new PIXI.Container();
  stage.position.set(0, STAGE_TOP);
  root.addChild(stage);

  const midX = DESIGN_W / 2;
  const sh = STAGE_H;

  // ── Brand open + weather/track ────────────────────────────────────────────
  const brand = new PIXI.Container();
  brand.alpha = 0;
  stage.addChild(brand);
  const lfx = midX - 300, lfy = sh * 0.28;
  const barT = new PIXI.Graphics(); barT.beginFill(COLORS.gold, 1).drawRect(0, 0, 340, 7).endFill();
  barT.position.set(lfx, lfy); barT.scale.x = 0;
  const barL = new PIXI.Graphics(); barL.beginFill(COLORS.gold, 1).drawRect(0, 0, 7, 150).endFill();
  barL.position.set(lfx, lfy); barL.scale.y = 0;
  brand.addChild(barT, barL);
  {
    const tag = text('LIVE VIRTUAL RACING', { size: 22, weight: 'medium', color: COLORS.gold, letterSpacing: 10 });
    tag.anchor.set(0.5); tag.position.set(midX, sh * 0.28);
    const big = text(data.raceLabel, { size: 100, weight: 'display', color: COLORS.cream, letterSpacing: 4 });
    big.anchor.set(0.5); big.position.set(midX, sh * 0.44);
    big.filters = [new GlowFilter({ distance: 26, outerStrength: 0.9, color: COLORS.gold, quality: 0.3 })];
    brand.addChild(tag, big);
    const chipDefs: [string, string][] = [];
    if (data.weather) chipDefs.push(['WEATHER', String(data.weather).toUpperCase()]);
    if (data.temperature != null) chipDefs.push(['TEMP', `${data.temperature}°C`]);
    if (data.wind) chipDefs.push(['WIND', String(data.wind).toUpperCase()]);
    if (data.courseConditions) chipDefs.push(['TRACK', String(data.courseConditions).toUpperCase()]);
    const chipsRow = new PIXI.Container();
    let cxx = 0; const chipH = 60, padX = 24, gap = 16;
    chipDefs.forEach(([lab, val]) => {
      const lt = text(lab, { size: 12, weight: 'medium', color: COLORS.smoke, letterSpacing: 3 });
      const vt = text(val, { size: 22, weight: 'display', color: COLORS.goldText });
      const w = Math.max(lt.width, vt.width) + padX * 2;
      const chip = glassPanel({ w, h: chipH, radius: 10, border: 0.5 });
      lt.position.set(padX, 11); vt.position.set(padX, 28);
      chip.addChild(lt, vt); chip.position.set(cxx, 0);
      chipsRow.addChild(chip); cxx += w + gap;
    });
    chipsRow.position.set(midX - (cxx - gap) / 2, sh * 0.62);
    brand.addChild(chipsRow);
  }

  // ── EXACTA matrix (the persistent centrepiece) ────────────────────────────
  const matrix = new PIXI.Container();
  matrix.alpha = 0;
  stage.addChild(matrix);
  // title/legend live on a fixed header (NOT inside the matrix) so they don't
  // clip when the matrix slides aside.
  const mHead = new PIXI.Container(); mHead.alpha = 0; stage.addChild(mHead); // (no label over the board)

  const mAreaW = DESIGN_W - 112;
  const headH = 44;
  const leftW = 60; // narrow — trap badge only, NO names (reference style)
  // smaller cells + vertical breathing room so the whole board is always visible
  const cellW = Math.min(146, (mAreaW - leftW) / N);
  const cellH = Math.min(66, (sh - 64 - headH) / N);
  const gridW = leftW + N * cellW, gridH = headH + N * cellH;
  const mTop = Math.max(8, (sh - gridH) / 8); // high, just under the header (empty space goes to the bottom)
  const startX = 56 + (mAreaW - gridW) / 2;     // horizontally centred
  const cellsX = startX + leftW, cellsY = mTop + headH;
  const bsz = Math.min(32, cellH * 0.5);

  // corners: top-left & bottom-right rounded, top-right & bottom-left sharp
  const mPanel = glassPanel({ w: gridW, h: gridH, border: 0.55, corners: [24, 0, 24, 0] });
  mPanel.position.set(startX, mTop); matrix.addChild(mPanel);

  // Odds colouring (vendor formula): two groups — diagonal = WIN, off-diagonal =
  // EXACTA. Lowest odd in a group = green, highest = red, the rest white. Ties
  // are coloured too (every cell equal to the group min/max), so 2–3 of the same
  // colour can appear; and each group has its own green+red.
  let winLo = Infinity, winHi = -Infinity, exLo = Infinity, exHi = -Infinity;
  for (let k = 0; k < N; k++) { const w = data.runners[k]?.winOdds; if (w != null) { winLo = Math.min(winLo, w); winHi = Math.max(winHi, w); } }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { if (i === j) continue; const v = data.exacta[i]?.[j]; if (Number.isFinite(v)) { exLo = Math.min(exLo, v); exHi = Math.max(exHi, v); } }
  const oddsColor = (val: number, lo: number, hi: number) => (val === lo ? COLORS.oddsGreen : val === hi ? COLORS.oddsRed : COLORS.cream);

  const headerBadges: PIXI.Container[] = [];
  const leftBadges: PIXI.Container[] = [];
  for (let k = 0; k < N; k++) {
    const top = trapBadge(k + 1, bsz);
    top.position.set(cellsX + k * cellW + (cellW - bsz) / 2, mTop + (headH - bsz) / 2);
    top.alpha = 0;
    const left = trapBadge(k + 1, bsz);
    left.position.set(startX + (leftW - bsz) / 2, cellsY + k * cellH + (cellH - bsz) / 2);
    left.alpha = 0;
    matrix.addChild(top, left);
    headerBadges.push(top); leftBadges.push(left);
  }

  const grid = new PIXI.Graphics();
  grid.lineStyle({ width: 1, color: COLORS.hairline, alpha: 0.6 });
  for (let c = 0; c <= N; c++) grid.moveTo(cellsX + c * cellW, cellsY).lineTo(cellsX + c * cellW, cellsY + N * cellH);
  for (let r = 0; r <= N; r++) grid.moveTo(cellsX, cellsY + r * cellH).lineTo(cellsX + N * cellW, cellsY + r * cellH);
  matrix.addChild(grid);

  // Axis labels, anchored to the PANEL EDGES (so they read as part of the board,
  // not floating chips): PRIMERO = rows/1st place → vertical tab emerging from the
  // LEFT edge, centred on it; SEGUNDO = columns/2nd place → horizontal tab centred
  // on the TOP edge. Both are children of `matrix`, so the move/scale animations
  // carry them with the board as one unit. Dark semi-transparent pills.
  const pill = (str: string, rot: number) => {
    const c = new PIXI.Container();
    const t = text(str, { size: 11, weight: 'medium', color: COLORS.cream, letterSpacing: 2 });
    const padX = 8, padY = 4;
    const bw = t.width + padX * 2, bh = t.height + padY * 2;
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.6).drawRoundedRect(0, 0, bw, bh, 4).endFill();
    t.position.set(padX, padY);
    c.addChild(bg, t);
    c.pivot.set(bw / 2, bh / 2);
    c.rotation = rot;
    return c;
  };
  const lblPrimero = pill('PRIMERO', -Math.PI / 2); // reads bottom→top
  // left edge, vertically centred. NOTE: PIXI's .width/.height are LOCAL bounds
  // (ignore rotation), so for this −90° pill the on-screen horizontal extent is
  // its .height — use that (not .width) so the inner side hugs the panel border.
  lblPrimero.position.set(startX - lblPrimero.height / 2 + 2, mTop + gridH / 2);
  const lblSegundo = pill('SEGUNDO', 0);
  // top edge, horizontally centred (its lower side touches the panel border)
  lblSegundo.position.set(startX + gridW / 2, mTop - lblSegundo.height / 2);
  matrix.addChild(lblPrimero, lblSegundo);

  const matrixRows: { row: PIXI.Container; counts: Array<() => gsap.core.Tween> }[] = [];
  for (let i = 0; i < N; i++) {
    const rowC = new PIXI.Container(); rowC.alpha = 0;
    const counts: Array<() => gsap.core.Tween> = [];
    for (let j = 0; j < N; j++) {
      const cx = cellsX + j * cellW, cy = cellsY + i * cellH;
      if (i === j) {
        const win = data.runners[i]?.winOdds;
        const tint = new PIXI.Graphics();
        tint.beginFill(COLORS.gold, 0.07).drawRect(cx + 1, cy + 1, cellW - 2, cellH - 2).endFill(); // faint WIN marker
        rowC.addChild(tint);
        const col = win != null ? oddsColor(win, winLo, winHi) : COLORS.smoke;
        const wct = countText(0, (val) => (win != null ? val.toFixed(1) : '–'), { size: cellH * 0.34, weight: 'display', color: col });
        wct.node.anchor.set(0.5); wct.node.position.set(cx + cellW / 2, cy + cellH / 2);
        rowC.addChild(wct.node);
        if (win != null) counts.push(() => gsap.to(wct.proxy, { v: win, duration: 0.9, ease: 'power2.out', onUpdate: () => wct.render(wct.proxy.v) }));
        continue;
      }
      const v = data.exacta[i]?.[j];
      const col = Number.isFinite(v) ? oddsColor(v, exLo, exHi) : COLORS.smoke;
      const ct = countText(0, (val) => (Number.isFinite(v) ? Math.round(val).toString() : '–'), { size: cellH * 0.36, weight: 'display', color: col });
      ct.node.anchor.set(0.5); ct.node.position.set(cx + cellW / 2, cy + cellH / 2);
      rowC.addChild(ct.node);
      if (Number.isFinite(v)) counts.push(() => gsap.to(ct.proxy, { v, duration: 0.9, ease: 'power2.out', onUpdate: () => ct.render(ct.proxy.v) }));
    }
    matrix.addChild(rowC); matrixRows.push({ row: rowC, counts });
  }

  // matrix repositions around the stage centre; pivot at its visual centre
  const mPivX = startX + gridW / 2, mPivY = mTop + gridH / 2;
  matrix.pivot.set(mPivX, mPivY);
  const HOME = { x: mPivX, y: mPivY, s: 1 };
  const UP = { x: mPivX, y: mPivY - 70, s: 0.8 };
  const LEFT = { x: mPivX - 232, y: mPivY - 6, s: 0.72 };
  // RIGHT: 80% scale (−20%) shifted right, right-aligned to the content margin so
  // it stays fully on-screen for both dog6 and dog8 (dog8's board is wider).
  const RIGHT = { x: DESIGN_W - 56 - 0.4 * gridW, y: mPivY, s: 0.8 };
  matrix.position.set(HOME.x, HOME.y);

  // ── Runner-data strip (appears BELOW the matrix) ──────────────────────────
  const strip = new PIXI.Container();
  strip.alpha = 0; stage.addChild(strip);
  const stripTop = sh - 132, stripH = 116, sGap = 12;
  const cardW = (DESIGN_W - 112 - (N - 1) * sGap) / N;
  const stripCards: PIXI.Container[] = [];
  data.runners.forEach((r, k) => {
    const card = new PIXI.Container();
    card.position.set(56 + k * (cardW + sGap), stripTop);
    const panel = glassPanel({ w: cardW, h: stripH, radius: 12, border: 0.4 });
    card.addChild(panel);
    const badge = trapBadge(r.trap, 30); badge.position.set(12, 12);
    const nm = text(r.name.toUpperCase(), { size: 14, weight: 'display', color: COLORS.cream, letterSpacing: 0.5 });
    nm.position.set(50, 16);
    while (nm.width > cardW - 60 && nm.text.length > 3) nm.text = nm.text.slice(0, -1);
    card.addChild(badge, nm);
    const stat = (lab: string, val: string, x: number) => {
      const l = text(lab, { size: 9, weight: 'medium', color: COLORS.smoke, letterSpacing: 1 });
      l.position.set(x, 54);
      const vv = text(val, { size: 15, weight: 'display', color: COLORS.goldText });
      vv.position.set(x, 67);
      card.addChild(l, vv);
    };
    if (r.strikeRate != null) stat('STRIKE', `${Math.round(r.strikeRate)}%`, 14);
    if (r.bestLap != null) stat('BEST', r.bestLap.toFixed(2), 74);
    if (r.wins != null) stat('WINS', String(r.wins), 138);
    if (r.form.length >= 2) {
      const inv = r.form.map((f) => (N + 1) - f);
      const sp = sparkline(inv, cardW - 28, 22, COLORS.goldText);
      sp.position.set(14, stripH - 30); card.addChild(sp);
    }
    strip.addChild(card); stripCards.push(card);
  });

  // ── Jackpot history panel (appears to the RIGHT of the matrix) ────────────
  const jp = new PIXI.Container();
  jp.alpha = 0; stage.addChild(jp);
  const jpW = 360, jpX = DESIGN_W - 56 - jpW, jpTop = 52, jpH = sh - jpTop - 24;
  const jpPanel = glassPanel({ w: jpW, h: jpH, radius: 16, border: 0.7 });
  jpPanel.position.set(jpX, jpTop); jp.addChild(jpPanel);
  const jpLabel = text('PROGRESSIVE JACKPOT', { size: 14, weight: 'medium', color: COLORS.smoke, letterSpacing: 3 });
  jpLabel.anchor.set(0.5, 0); jpLabel.position.set(jpX + jpW / 2, jpTop + 26); jp.addChild(jpLabel);
  const jpCt = countText(0, (v) => '$' + Math.round(v).toLocaleString('en-US'), { size: 50, weight: 'display', color: COLORS.goldBright });
  jpCt.node.anchor.set(0.5); jpCt.node.position.set(jpX + jpW / 2, jpTop + 70);
  jpCt.node.filters = [new AdvancedBloomFilter({ threshold: 0.25, bloomScale: 0.7, blur: 6, quality: 4 })];
  jp.addChild(jpCt.node);
  const wLabel = text('RECENT WINNERS', { size: 13, weight: 'medium', color: COLORS.smoke, letterSpacing: 3 });
  wLabel.position.set(jpX + 24, jpTop + 110); jp.addChild(wLabel);
  const jpWinners = new PIXI.Container();
  data.recentWinners.slice(0, 6).forEach((trap, i) => { const bb = trapBadge(trap, 40); bb.position.set(i * 50, 0); jpWinners.addChild(bb); });
  jpWinners.position.set(jpX + 24, jpTop + 134); jp.addChild(jpWinners);
  const hLabel = text('BONUS HISTORY', { size: 13, weight: 'medium', color: COLORS.smoke, letterSpacing: 3 });
  hLabel.position.set(jpX + 24, jpTop + 200); jp.addChild(hLabel);
  data.jackpotHistory.slice(0, 4).forEach((h, i) => {
    const row = text(h.name, { size: 14, weight: 'regular', color: COLORS.cream });
    row.position.set(jpX + 24, jpTop + 228 + i * 30);
    const amt = text('$' + h.amount.toLocaleString('en-US'), { size: 14, weight: 'display', color: COLORS.goldText });
    amt.anchor.set(1, 0); amt.position.set(jpX + jpW - 24, jpTop + 228 + i * 30);
    jp.addChild(row, amt);
  });

  // ── Countdown finale ──────────────────────────────────────────────────────
  const finale = new PIXI.Container();
  finale.alpha = 0; stage.addChild(finale);
  const fk = text('RACE STARTS IN', { size: 24, weight: 'medium', color: COLORS.gold, letterSpacing: 10 });
  fk.anchor.set(0.5); fk.position.set(midX, sh * 0.26);
  const ring = new PIXI.Graphics(); ring.position.set(midX, sh * 0.56);
  const finaleNum = text('0', { size: 104, weight: 'display', color: COLORS.goldBright });
  finaleNum.anchor.set(0.5); finaleNum.position.set(midX, sh * 0.56);
  finaleNum.filters = [new AdvancedBloomFilter({ threshold: 0.2, bloomScale: 1.0, blur: 8, quality: 4 })];
  const fsub = text('GET READY', { size: 22, weight: 'display', color: COLORS.cream, letterSpacing: 8 });
  fsub.anchor.set(0.5); fsub.position.set(midX, sh * 0.82);
  finale.addChild(fk, ring, finaleNum, fsub);

  // ── entrance builders ─────────────────────────────────────────────────────
  const playBrand = () => {
    const tl = gsap.timeline();
    tl.fromTo(barT.scale, { x: 0 }, { x: 1, duration: 0.55, ease: 'power3.out' }, 0);
    tl.fromTo(barL.scale, { y: 0 }, { y: 1, duration: 0.55, ease: 'power3.out' }, 0.12);
    return tl;
  };
  const playMatrixBuild = () => {
    const tl = gsap.timeline();
    headerBadges.forEach((b, k) => tl.fromTo(b, { alpha: 0, y: b.y - 14 }, { alpha: 1, y: b.y, duration: 0.3, ease: 'power2.out' }, k * 0.05));
    leftBadges.forEach((b, k) => tl.fromTo(b, { alpha: 0, x: b.x - 14 }, { alpha: 1, x: b.x, duration: 0.3, ease: 'power2.out' }, 0.2 + k * 0.05));
    matrixRows.forEach((mr, i) => {
      tl.fromTo(mr.row, { alpha: 0, y: -10 }, { alpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.4 + i * 0.08);
      mr.counts.forEach((c) => tl.add(c(), '<'));
    });
    return tl;
  };
  const playStrip = () => {
    const tl = gsap.timeline();
    stripCards.forEach((c, k) => tl.fromTo(c, { alpha: 0, y: c.y + 24 }, { alpha: 1, y: c.y, duration: 0.4, ease: 'power3.out' }, k * 0.07));
    return tl;
  };
  const playJackpot = () => {
    const tl = gsap.timeline();
    tl.add(gsap.to(jpCt.proxy, { v: data.jackpot ?? 0, duration: 1.4, ease: 'power2.out', onUpdate: () => jpCt.render(jpCt.proxy.v) }));
    jpWinners.children.forEach((b, i) => tl.fromTo(b, { alpha: 0, y: 12 }, { alpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, i * 0.07));
    return tl;
  };

  // ── master film (paused, scrubbed by remaining time) ──────────────────────
  const FILM = 180;
  const master = gsap.timeline({ paused: true });
  master.set([brand, strip, jp, finale], { alpha: 0 }, 0);

  // helper: show a side panel within [t0,t1]
  const panel = (cont: PIXI.Container, t0: number, t1: number, build?: () => gsap.core.Timeline) => {
    master.to(cont, { alpha: 1, duration: 0.6, ease: 'power2.out' }, t0);
    if (build) master.add(build(), t0 + 0.1);
    master.to(cont, { alpha: 0, duration: 0.5, ease: 'power2.in' }, t1 - 0.5);
  };
  // helper: move the matrix to a target pose at time t
  const move = (t: number, to: { x: number; y: number; s: number }, dur = 1.0) => {
    master.to(matrix.position, { x: to.x, y: to.y, duration: dur, ease: 'power2.inOut' }, t);
    master.to(matrix.scale, { x: to.s, y: to.s, duration: dur, ease: 'power2.inOut' }, t);
  };

  // FOR NOW (Jorge): ONLY the EXACTA odds matrix, centred from the start, no
  // names (reference style). The venue/stadium presentation = the deferred
  // animated background. Runner strip, jackpot panel, cycles and countdown are
  // wired but PARKED until this opening is approved.
  void playBrand; void playStrip; void playJackpot; void panel; void move;
  void UP; void LEFT; void finale; void barT; void barL; void mHead;

  // ── Beat (10–15s): the board scales to 80% (−20%) and slides right ────────
  // fromTo so the scrubbed timeline is deterministic regardless of mount time.
  master.fromTo(matrix.position, { x: HOME.x, y: HOME.y },
    { x: RIGHT.x, y: RIGHT.y, duration: 5, ease: 'power2.inOut' }, 10);
  master.fromTo(matrix.scale, { x: 1, y: 1 },
    { x: RIGHT.s, y: RIGHT.s, duration: 5, ease: 'power2.inOut' }, 10);

  master.to({}, { duration: 0.01 }, FILM);

  // The matrix entrance plays IMMEDIATELY on mount (NOT scrubbed by the clock),
  // so the odds appear right away — even when the wait is longer than FILM, where
  // the scrub would otherwise clamp at 0 and delay the build several seconds.
  matrix.alpha = 0; matrix.scale.set(0.92);
  const intro = gsap.timeline();
  intro.to(matrix, { alpha: 1, duration: 0.4, ease: 'power2.out' }, 0);
  intro.to(matrix.scale, { x: 1, y: 1, duration: 0.7, ease: 'power3.out' }, 0);
  intro.add(playMatrixBuild(), 0.15);

  // ── per-frame: clock + scrub + finale number/ring ─────────────────────────
  // The clock ref only changes ~1×/s, but the film is scrubbed every frame — so
  // interpolate a CONTINUOUS remaining time between updates, otherwise the
  // scrubbed animations (e.g. the 10–15s move) jump once per second ("trompicones").
  // Extrapolation is capped at 1s so a static/frozen clock can't run the film ahead.
  let lastRem = clockRef.current;
  let lastChangeMs = performance.now();
  const tick = () => {
    const rem = clockRef.current;
    if (rem !== lastRem) { lastRem = rem; lastChangeMs = performance.now(); }
    const since = Math.min(1, (performance.now() - lastChangeMs) / 1000);
    const smoothRem = Math.max(0, lastRem - since);
    clock.text = fmtClock(rem); // displayed countdown stays whole-second
    master.time(Math.min(FILM, Math.max(0, FILM - smoothRem)));
    finaleNum.text = String(Math.max(0, Math.ceil(rem)));
    ring.clear();
    const frac = Math.max(0, Math.min(1, smoothRem / 30));
    ring.lineStyle({ width: 9, color: COLORS.hairline, alpha: 0.35 }).drawCircle(0, 0, 78);
    ring.lineStyle({ width: 9, color: rem <= 5 ? 0xff5a3c : COLORS.goldBright, alpha: 0.95 });
    ring.arc(0, 0, 78, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  };
  app.ticker.add(tick);

  function resize(w: number, h: number) {
    bg.width = w; bg.height = h; // fill the whole canvas (no empty bars)
    const scale = Math.min(w / DESIGN_W, h / DESIGN_H);
    root.scale.set(scale);
    root.position.set((w - DESIGN_W * scale) / 2, (h - DESIGN_H * scale) / 2);
  }
  resize(app.screen.width, app.screen.height);

  function destroy() {
    app.ticker.remove(tick);
    master.kill();
    intro.kill();
    tweens.forEach((t) => t.kill());
    gsap.killTweensOf([kicker, raceTitle, clockLabel, clock, rule]);
    root.destroy({ children: true });
    bg.destroy(true);
    dotTex.destroy(true);
  }

  return { resize, destroy };
}
