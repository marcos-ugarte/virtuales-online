/**
 * PremiumIntro — React host for the Gold Luxe inter-race presentation.
 *
 * Mounts a single PIXI.Application sized to its container, awaits the DIN
 * faces, builds the scene once, and feeds the live countdown (`remainingSec`)
 * into the scene via a ref so re-renders never rebuild the PIXI tree.
 *
 * Used by LiveMonitor during the PRE phase when `?wait=premium`.
 */
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { GameKey, Race } from '../types/websocket';
import { PREMIUM_FONTS, COLORS } from './theme';
import { buildScene, type Scene } from './scene';
import {
  buildPremiumData, mockPremiumData, type PremiumData,
} from './data/PremiumData';

interface Props {
  /** Live race for the upcoming round (PRE phase). When absent, a mock is used. */
  race?: Race | null;
  gameKey: GameKey;
  /** Seconds to the off — updated ~1/s by the parent. */
  remainingSec: number;
  jackpotValue?: number;
}

async function awaitFonts() {
  if (!('fonts' in document)) return;
  try {
    await Promise.all(PREMIUM_FONTS.map((f) => (document as Document).fonts.load(f)));
  } catch {
    /* fall back to whatever is ready */
  }
}

export function PremiumIntro({ race, gameKey, remainingSec, jackpotValue }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const clockRef = useRef<number>(remainingSec);

  // keep the live clock fresh without rebuilding the scene
  clockRef.current = remainingSec;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let app: PIXI.Application | null = null;
    let scene: Scene | null = null;
    let ro: ResizeObserver | null = null;
    let cancelled = false;

    const data: PremiumData =
      race && Object.keys(race.competitors ?? {}).length
        ? buildPremiumData(race, gameKey, jackpotValue)
        : mockPremiumData(gameKey === 'dog8' ? 8 : 6, gameKey);

    (async () => {
      await awaitFonts();
      if (cancelled) return;
      app = new PIXI.Application({
        width: host.clientWidth || 1280,
        height: host.clientHeight || 720,
        backgroundColor: COLORS.charcoal,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      const canvas = app.view as HTMLCanvasElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      host.appendChild(canvas);

      scene = buildScene(app, data, clockRef);

      ro = new ResizeObserver(() => {
        if (!app) return;
        const w = host.clientWidth || 1280;
        const h = host.clientHeight || 720;
        app.renderer.resize(w, h);
        scene?.resize(w, h);
      });
      ro.observe(host);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      scene?.destroy();
      app?.destroy(true, { children: true, texture: false });
    };
    // gameKey/race identity drives a rebuild; also rebuild if the odds arrive
    // after mount (slim first frame → full odds), so WIN/EXACTA aren't left
    // empty. remainingSec deliberately omitted (it only feeds the clock ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, race?.id, race?.odds?.length]);

  return <div ref={hostRef} className="premium-intro" />;
}
