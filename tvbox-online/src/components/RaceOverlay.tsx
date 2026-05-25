/**
 * RaceOverlay — transparent PIXI canvas drawn ON TOP of the race <video>.
 *
 * v1 ports the REAL streaming_kit `RaceBarDog` overlay (top-right race number +
 * in-race timer), vendored UNMODIFIED under src/tvkit/. It is driven by a SHIM
 * `Logic` (src/tvkit/client/Logic/Logic.ts): because our race videos are
 * race-only (no intro), Logic collapses to constants and time comes straight
 * from the live `<video>.currentTime`.
 *
 * Design space is 1280x720 (matching streaming_kit's VideoScreenDog); the canvas
 * is CSS-stretched to fill the `.lm-video` box. RaceBarDog is laid out exactly as
 * the real VideoScreenDog places it: width 185, height 61, top-right with an 8px
 * right margin.
 *
 * The winner-name block is preserved as a lightweight extra path layered under
 * the ported bar; the priority is the RaceBarDog number + timer.
 */
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { Competitor } from '../types/websocket';
import { Logic, _s } from '../tvkit/client/Logic/Logic';
import { RaceBarDog } from '../tvkit/client/VideoScreen/dog/RaceBarDog';
import { RaceIntervalsDog } from '../tvkit/client/VideoScreen/dog/Race/RaceIntervalsDog';
import { WinnerDog } from '../tvkit/client/VideoScreen/dog/Race/WinnerDog';
import type {
  IRoundInfo,
  IResult,
  IRaceInterval,
  IIntervalDriver,
  IDriver,
  ITrack,
  IAnimInterval,
} from '../tvkit/client/Logic/LogicDefinitions';

const W = 1280;
const H = 720;

// Fonts the ported RaceBarDog renders with. We await these before the first
// PIXI text draw so the bar doesn't flash a fallback face.
const DIN_FONTS = [
  '20px "DIN-UltraLightItalic"',
  '20px "DIN-LightItalic"',
  '20px "DIN-BoldItalic"',
  '20px "DIN-Medium"',
  '20px "DIN-Regular"',
  '20px "DIN-RegularItalic"',
  '20px "DIN-Bold"',
];

function parseVendorTs(ts?: string): number | undefined {
  if (!ts) return undefined;
  return Date.parse(ts.replace(' ', 'T') + 'Z');
}

export interface RaceOverlayProps {
  raceId: string;
  competitors: Record<string, Competitor>;
  finish?: Record<string, { competitorIndex: number; time?: number }>;
  /** Mid-race split data — drives the ported RaceIntervalsDog leaders box. */
  interval?: Record<string, Record<string, { competitorIndex: number; time: number }>>;
  /** Flat odds matrix — WinnerDog indexes it via Logic.getOddsForDriver. */
  odds?: number[];
  videoStartDt: string;
  clockOffsetMs: number;
  phase: 'pre' | 'live' | 'idle';
  remainingSec: number;
}

// ── RaceIntervalsDog base templates (vendored verbatim from streaming_kit
//    ModelDog.ts: raceIntervalsDog6 / raceIntervalsDog8). Titles + durations
//    come from these; drivers + startTime are filled from our `interval` feed.
const raceIntervalsDog6: IRaceInterval[] = [
  { title: 'START POSITIONS', startTime: 0.3, duration: 2.05 },
  {
    title: 'INTERVAL 1',
    startTime: 9.0,
    duration: 6.38,
    drivers: [
      { driverIndex: 3, time: '11:04' },
      { driverIndex: 4, time: '11:10' },
    ],
  },
  {
    title: 'INTERVAL 2',
    startTime: 24.0,
    duration: 6.38,
    drivers: [
      { driverIndex: 3, time: '29:03' },
      { driverIndex: 1, time: '29:20' },
    ],
  },
];

const raceIntervalsDog8: IRaceInterval[] = [
  { title: 'START POSITIONS', startTime: 0.3, duration: 2.05 },
  {
    title: 'INTERVAL 1',
    startTime: 9.0,
    duration: 6.05,
    drivers: [
      { driverIndex: 3, time: '11:04' },
      { driverIndex: 4, time: '11:10' },
    ],
  },
  {
    title: 'INTERVAL 2',
    startTime: 24.0,
    duration: 5.3,
    drivers: [
      { driverIndex: 3, time: '29:03' },
      { driverIndex: 1, time: '29:20' },
    ],
  },
];

/**
 * Replicates streaming_kit GamesModel (DOG branch, ~L1641-1711): copies the
 * base template, then fills raceIntervals[1] & [2] drivers + startTime from
 * the vendor `interval` block. Splits "1" and "2", ranks "1" and "2".
 * Returns [] when there's no interval data (matches `data.interval === null`).
 */
function toRaceIntervals(
  gameType: 'dog6' | 'dog8',
  interval: RaceOverlayProps['interval'],
): IRaceInterval[] {
  if (!interval || !interval['1'] || !interval['2']) return [];

  const base = gameType === 'dog8' ? raceIntervalsDog8 : raceIntervalsDog6;
  const raceIntervals: IRaceInterval[] = base.map((item) => Object.assign({}, item));

  const fmt = (t: number) =>
    Logic.implementation.formatTime(t, { minutes: false, seconds: true, hundredth: true });

  let intervalOffset1 = 0.92;
  let intervalOffset2 = 0.92;
  if (gameType === 'dog8') {
    intervalOffset1 = 0.85;
    intervalOffset2 = 0.7;
  }

  const split1: IIntervalDriver[] = [
    { driverIndex: interval['1']['1'].competitorIndex - 1, time: fmt(interval['1']['1'].time) },
    { driverIndex: interval['1']['2'].competitorIndex - 1, time: fmt(interval['1']['2'].time) },
  ];
  raceIntervals[1].drivers = split1;
  raceIntervals[1].startTime = interval['1']['1'].time + intervalOffset1;

  const split2: IIntervalDriver[] = [
    { driverIndex: interval['2']['1'].competitorIndex - 1, time: fmt(interval['2']['1'].time) },
    { driverIndex: interval['2']['2'].competitorIndex - 1, time: fmt(interval['2']['2'].time) },
  ];
  raceIntervals[2].drivers = split2;
  raceIntervals[2].startTime = interval['2']['1'].time + intervalOffset2;

  return raceIntervals;
}

/**
 * Build the IDriver[] RaceIntervalItemDog indexes into (0-based, by post
 * position). RaceIntervalItemDog.fill only reads `driver.firstName`; the rest
 * is filled with safe empties to satisfy the interface.
 */
function toDrivers(competitors: Record<string, Competitor>): IDriver[] {
  const posKeys = Object.keys(competitors)
    .map((k) => parseInt(k, 10))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  return posKeys.map((pos) => {
    const c = competitors[String(pos)];
    return {
      color: 0xffffff,
      firstName: c?.name ?? '',
      lastName: '',
      driverInfos: [],
      driverBarText: '',
    } as IDriver;
  });
}

/** Minimal ITrack — RaceIntervalsDog.fill stores it but reads nothing from it. */
const EMPTY_TRACK: ITrack = { name: '', country: '', facts: [], items: [] };

/** Race number our feed exposes: last 4 chars of the raceId tail. */
function raceNumberOf(raceId: string): number {
  const tail = raceId.split('_').pop() || raceId;
  const digits = tail.slice(-4).replace(/\D/g, '');
  return parseInt(digits || '0', 10);
}

/** Build the IRoundInfo RaceBarDog.fill expects from our props. */
function toRoundInfo(p: RaceOverlayProps): IRoundInfo {
  return {
    gameId: raceNumberOf(p.raceId),
    sendPlan: '',
    raceNumber: String(raceNumberOf(p.raceId)),
    raceStart: p.videoStartDt,
  };
}

/**
 * Build the IResult RaceBarDog.fillRace AND WinnerDog.fill expect.
 *  - clockEndTime caps the RaceBar timer.
 *  - first / second carry the real winners (box number + finish time) so the
 *    ported WinnerDog shows BOX + NAME + TIME. driverIndex is 0-based (post-1),
 *    time is formatted exactly like the original (SS.hh).
 */
function toResult(p: RaceOverlayProps): IResult {
  const finishArr = p.finish ? Object.values(p.finish) : [];
  const maxFinish = finishArr.reduce((m, f) => Math.max(m, f.time ?? 0), 0);

  const fmt = (t?: number) =>
    t === undefined
      ? ''
      : Logic.implementation.formatTime(t, { minutes: false, seconds: true, hundredth: true });

  const f1 = p.finish?.['1'];
  const f2 = p.finish?.['2'];
  const first: IIntervalDriver = f1
    ? { driverIndex: f1.competitorIndex - 1, time: fmt(f1.time) }
    : { driverIndex: 0, time: '' };
  const second: IIntervalDriver = f2
    ? { driverIndex: f2.competitorIndex - 1, time: fmt(f2.time) }
    : { driverIndex: 0, time: '' };

  return {
    first,
    second,
    clockEndTime: maxFinish > 0 ? maxFinish : undefined,
  };
}

export function RaceOverlay(props: RaceOverlayProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  // Signature so we only re-fill RaceBarDog on round change.
  const roundSigRef = useRef<string>('');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    // Boot after the DIN faces are available so PIXI text measures correctly.
    // Boot once the DIN faces we need are loaded — but NEVER block on the
    // page's other webfonts (the lobby's Google Fonts can hang). We load only
    // our DIN faces and cap the wait with a 2s timeout so the overlay always
    // boots even if a font request stalls. (Do NOT await document.fonts.ready:
    // it waits for ALL document fonts and can hang the overlay indefinitely.)
    const fontsReady = Promise.race([
      Promise.all(DIN_FONTS.map((f) => document.fonts.load(f).catch(() => undefined))),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);

    fontsReady.then(() => {
      if (disposed || !hostRef.current) return;

      let app: PIXI.Application;
      try {
        app = new PIXI.Application({
          width: W,
          height: H,
          backgroundAlpha: 0,
          antialias: true,
        });
      } catch (err) {
        // No WebGL renderer available (e.g. a headless CI box with no GPU/GL).
        // The overlay is purely cosmetic, so skip it rather than crash the page.
        // eslint-disable-next-line no-console
        console.warn('[RaceOverlay] PIXI renderer unavailable, overlay disabled:', err);
        return;
      }
      app.ticker.maxFPS = 24;
      appRef.current = app;
      const canvas = app.view as unknown as HTMLCanvasElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      host.appendChild(canvas);

      // The live race <video> is a sibling of this overlay's host inside
      // `.lm-video`; drive Logic time from its currentTime.
      const videoEl = host.parentElement?.querySelector<HTMLVideoElement>('.lm-video-el') ?? null;
      Logic.setTimeProvider(() => {
        const v = host.parentElement?.querySelector<HTMLVideoElement>('.lm-video-el') ?? videoEl;
        return v && Number.isFinite(v.currentTime) ? v.currentTime : 0;
      });
      Logic.setGameLength(240);

      // ── Ported RaceBarDog (number + in-race timer) ──────────────────────
      // gameType dog6, oddsAlwaysOn=true (our skin is the always-on skin, 11).
      const raceBar = new RaceBarDog('dog6', 240, Logic.languageId, false, true);
      raceBar.width = 185;
      raceBar.height = 61;
      raceBar.position.x = W - raceBar.width - 8;
      raceBar.position.y = 7 / 2;
      raceBar.updateLayout();
      app.stage.addChild(raceBar.container);

      // ── Ported RaceIntervalsDog (mid-race top-2 leaders box) ────────────
      // Positioned exactly as VideoScreenDog places it.
      const raceIntervals = new RaceIntervalsDog('dog6');
      raceIntervals.position.x = _s(1008);
      raceIntervals.position.y = _s(44);
      raceIntervals.width = _s(253);
      raceIntervals.height = _s(202);
      raceIntervals.updateLayout();
      app.stage.addChild(raceIntervals.container);

      // ── Ported WinnerDog x3 (final winners panel: BOX + NAME + TIME) ────
      // VideoScreenDog creates THREE: ["winner","winner","firstTwo"]. The first
      // "winner" reveals @32s for 7.5s; the second "winner" + the "firstTwo"
      // forecast reveal @40.5s and run for the rest of the race. The non-300
      // gameLength branch (our 240s dog6/dog8) is taken inside WinnerDog. Anims
      // and x/y/width/height are copied verbatim from VideoScreenDog
      // (createWinnerDogAnims + winnerDogSettings, scaled through _s).
      const winnerAnims: IAnimInterval[][] = [
        [{ startTime: 32.0, duration: 7.5 }],
        [{ startTime: 40.5, duration: Logic.getRaceLength() }],
        [{ startTime: 40.5, duration: Logic.getRaceLength() }],
      ];
      const winnerSettings = [
        { x: 62, y: 152, width: 648, height: 296 },
        { x: 62, y: 152, width: 648, height: 296 },
        { x: 485, y: 208.5, width: 566, height: 274 },
      ];
      const winnerTypes = ['winner', 'winner', 'firstTwo'] as const;
      const winnerDogs: WinnerDog[] = [];
      for (let i = 0; i < 3; i++) {
        const w = new WinnerDog('dog6', 240, winnerAnims[i], winnerTypes[i], Logic.languageId);
        w.position.x = _s(winnerSettings[i].x);
        w.position.y = _s(winnerSettings[i].y);
        w.width = _s(winnerSettings[i].width);
        w.height = _s(winnerSettings[i].height);
        winnerDogs.push(w);
        app.stage.addChild(w.container);
      }

      const tick = () => {
        const p = propsRef.current;

        // Keep RaceBarDog fed; set race length from the finish times, re-fill on
        // round change.
        const result = toResult(p);
        Logic.setRaceLength(result.clockEndTime && result.clockEndTime > 0 ? result.clockEndTime : 30);

        // Re-fill on round change (raceId changes) AND when interval/finish
        // data first arrives for the same round (both land AFTER the round
        // starts, via the gameResult/poll merge), so the signature includes an
        // interval flag and a finish flag.
        const sig = `${p.raceId}|${p.interval ? 'i' : '-'}|${p.finish?.['1'] ? 'f' : '-'}`;
        if (sig !== roundSigRef.current) {
          roundSigRef.current = sig;
          const startUnix = parseVendorTs(p.videoStartDt);
          raceBar.fill(toRoundInfo(p), Logic.languageId, startUnix ? startUnix / 1000 : undefined);
          raceBar.fillRace(result);
          const drivers = toDrivers(p.competitors);
          raceIntervals.fill(EMPTY_TRACK, toRaceIntervals('dog6', p.interval), drivers);
          // Only fill WinnerDog once the winners are known (finish["1"] present);
          // WinnerDog.fill reads drivers[first.driverIndex] and indexes odds.
          if (p.finish?.['1']) {
            const odds = p.odds ?? [];
            for (const w of winnerDogs) w.fill(result, drivers, odds);
          }
        }

        // Overlays show ONLY while the race video is actively playing. Gate on
        // a real, non-ended <video>: phase stays 'live' for a moment after the
        // clip ends (frozen on the last frame), and the WinnerDog forecast anim
        // window extends past the clip — without the `!ended` guard the winners
        // panel lingered into the countdown to the next race. When not playing
        // we force every overlay hidden AND skip update() (update() re-asserts
        // visibility via Logic.getAnim, which would override the force-hide).
        const dt = app.ticker.deltaMS / 1000;
        const v = host.parentElement?.querySelector<HTMLVideoElement>('.lm-video-el');
        const racePlaying = p.phase === 'live' && !!v && !v.ended;

        if (racePlaying) {
          raceBar.visible = true;
          raceBar.update(dt);
          raceIntervals.update(dt); // self-gates visibility via its anim
          for (const w of winnerDogs) w.update(dt); // self-gate @32s/40.5s
        } else {
          raceBar.visible = false;
          raceIntervals.visible = false;
          for (const w of winnerDogs) w.visible = false;
        }
      };
      app.ticker.add(tick);

      cleanup = () => {
        app.ticker.remove(tick);
        app.destroy(true, { children: true });
        appRef.current = null;
      };
    });

    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, []);

  return <div ref={hostRef} className="lm-overlay" aria-hidden="true" />;
}
