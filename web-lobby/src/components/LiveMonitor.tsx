/**
 * LiveMonitor — small "TV monitor" panel pinned to the right of the lobby.
 * Picks the next race to fire (smallest remaining countdown across the 3
 * game keys) and either:
 *   - renders the recorded MP4 with currentTime synced to videoStartDt
 *     (LIVE phase), or
 *   - renders a thumbnail + countdown overlay (PRE phase).
 *
 * It also surfaces the running global jackpot when the picked race carries
 * a jackpotInfo (only dog / dog8 / horsec do — the others are null).
 */

import { useEffect, useRef } from 'react';
import type { AllGames, GameKey, Race } from '../types/websocket';
import { useTimer } from '../hooks/useTimer';
import { useLang } from '../i18n';
import { JackpotDisplay } from './JackpotDisplay';
import { resolveVideoUrl, resolveVideoPoster } from '../services/videoUrl';

/** Game types the LiveMonitor will render video for. Horsec is on the
 *  roadmap but excluded for now — video assets aren't ready. The cards
 *  for excluded types still show on the lobby, the JACKPOT still adds
 *  their pool, and bets still place; they just don't drive the monitor. */
const MONITOR_GAMES: GameKey[] = ['dog', 'dog8'];

const GAME_LABEL_KEYS: Record<GameKey, string> = {
  dog: 'monitor.label.dog',
  dog8: 'monitor.label.dog8',
  horsec: 'monitor.label.horsec',
};

/** Generic per-game-type hero image used as the upcoming-race poster.
 *  The backend's `videoname.jpg` arrives unreliably for future races,
 *  so we fall back on these — always available, no network dep. */
const GAME_HERO: Record<GameKey, string> = {
  dog: '/assets/hero/dog-race.jpg',
  dog8: '/assets/hero/dog-race-2.png',
  horsec: '/assets/hero/horse-race-v2.png',
};

interface Props {
  /** Currently-running races per type. Used to pick which video to play. */
  allGames: AllGames;
  /** Next bet-able races per type. Drives the pre-phase overlay. */
  betGames: AllGames;
  clockOffsetMs: number;
  /** Highest bonusValue across the full gamepool. Stable through gaps. */
  jackpotValue: number;
  /** Game type the user explicitly clicked WATCH on, or null for auto. */
  pinnedGame: GameKey | null;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function parseVendorTs(ts: string | undefined): number | undefined {
  if (!ts) return undefined;
  return Date.parse(ts.replace(' ', 'T') + 'Z');
}

/**
 * VideoPlayer — auto-syncs <video> currentTime to the elapsed time since
 * videoStartDt so a late viewer joins mid-race. Re-syncs whenever the URL
 * changes (i.e. when the picked race advances).
 */
function VideoPlayer({
  url,
  poster,
  videoStartDt,
  clockOffsetMs,
}: {
  url: string;
  poster?: string;
  videoStartDt: string;
  clockOffsetMs: number;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleLoaded = () => {
      const startMs = parseVendorTs(videoStartDt);
      if (startMs === undefined) return;
      const elapsedSec = Math.max(0, (Date.now() + clockOffsetMs - startMs) / 1000);
      if (elapsedSec < el.duration) {
        el.currentTime = elapsedSec;
      }
      el.play().catch(() => {
        /* autoplay might be blocked; user has to interact */
      });
    };
    el.addEventListener('loadedmetadata', handleLoaded);
    return () => el.removeEventListener('loadedmetadata', handleLoaded);
  }, [url, videoStartDt, clockOffsetMs]);

  return (
    <video
      ref={ref}
      className="lm-video-el"
      src={url}
      poster={poster}
      autoPlay
      muted
      playsInline
      controls={false}
    />
  );
}

export function LiveMonitor({
  allGames,
  betGames,
  clockOffsetMs,
  jackpotValue,
  pinnedGame,
}: Props) {
  const { t } = useLang();
  // Hooks must run unconditionally — one timer per slot.
  const dogLiveTimer    = useTimer(allGames.dog?.videoStartDt, clockOffsetMs);
  const dog8LiveTimer   = useTimer(allGames.dog8?.videoStartDt, clockOffsetMs);
  const horsecLiveTimer = useTimer(allGames.horsec?.videoStartDt, clockOffsetMs);
  const dogBetTimer     = useTimer(betGames.dog?.videoStartDt, clockOffsetMs);
  const dog8BetTimer    = useTimer(betGames.dog8?.videoStartDt, clockOffsetMs);
  const horsecBetTimer  = useTimer(betGames.horsec?.videoStartDt, clockOffsetMs);

  const liveTimers: Record<GameKey, ReturnType<typeof useTimer>> = {
    dog: dogLiveTimer,
    dog8: dog8LiveTimer,
    horsec: horsecLiveTimer,
  };
  const betTimers: Record<GameKey, ReturnType<typeof useTimer>> = {
    dog: dogBetTimer,
    dog8: dog8BetTimer,
    horsec: horsecBetTimer,
  };

  // Pick what to show. Three layers, in order:
  //   1. If the user clicked WATCH on a card (pinnedGame), show that
  //      game's current race (live or pre-phase).
  //   2. If we were already showing a game with a live race, KEEP showing
  //      it until that race ends — avoids one race "stepping on" another
  //      mid-cycle when several go live overlapping.
  //   3. Otherwise auto-pick: live first (longest-running wins), else
  //      next-to-start (smallest pre countdown).
  //
  // Auto-pick is restricted to MONITOR_GAMES (excludes horsec for now).
  // The user CAN still pin horsec via its WATCH button — that's
  // intentional, so when the asset library is ready it lights up without
  // a code change.
  const lastPickRef = useRef<GameKey | null>(null);

  let pickedKey: GameKey | null = null;
  let pickedRace: Race | null = null;
  let pickedTimer: ReturnType<typeof useTimer> | null = null;

  const pickFor = (gk: GameKey): boolean => {
    // Prefer live race for this type, else its bet (pre) race.
    const live = allGames[gk];
    if (live && liveTimers[gk].phase === 'live') {
      pickedKey = gk;
      pickedRace = live;
      pickedTimer = liveTimers[gk];
      return true;
    }
    const next = betGames[gk];
    if (next && betTimers[gk].phase === 'pre') {
      pickedKey = gk;
      pickedRace = next;
      pickedTimer = betTimers[gk];
      return true;
    }
    return false;
  };

  // 1. User pin
  if (pinnedGame) pickFor(pinnedGame);

  // 2. Sticky: keep the last-shown game if its race is still live
  if (!pickedKey) {
    const last = lastPickRef.current;
    if (
      last &&
      MONITOR_GAMES.includes(last) &&
      allGames[last] &&
      liveTimers[last].phase === 'live'
    ) {
      pickedKey = last;
      pickedRace = allGames[last];
      pickedTimer = liveTimers[last];
    }
  }

  // 3. Auto: prefer any live in MONITOR_GAMES, else smallest pre countdown
  if (!pickedKey) {
    for (const gk of MONITOR_GAMES) {
      if (allGames[gk] && liveTimers[gk].phase === 'live') {
        pickedKey = gk;
        pickedRace = allGames[gk];
        pickedTimer = liveTimers[gk];
        break;
      }
    }
  }
  if (!pickedKey) {
    let lowest = Number.POSITIVE_INFINITY;
    for (const gk of MONITOR_GAMES) {
      const race = betGames[gk];
      if (!race) continue;
      const tm = betTimers[gk];
      if (tm.phase !== 'pre') continue;
      if (tm.remainingSec < lowest) {
        lowest = tm.remainingSec;
        pickedKey = gk;
        pickedRace = race;
        pickedTimer = tm;
      }
    }
  }

  // Remember the pick for next render's stickiness check.
  lastPickRef.current = pickedKey;
  // jackpotValue is pre-computed by useRaceFeed across the full gamepool
  // — see the hook's `jackpotValue` field for why we don't re-derive it
  // from the per-type picks here.

  return (
    <aside className="live-monitor" aria-label="Live race monitor">
      {/* Jackpot — sits on top of the embedded screen. */}
      <div className="lm-jackpot">
        <div className="lm-jackpot-label">{t('monitor.jackpot')}</div>
        <JackpotDisplay target={jackpotValue} />
      </div>

      {/* Video / countdown area */}
      <div className="lm-video">
        {pickedRace && pickedTimer && pickedTimer.phase === 'live' && pickedRace.videoname?.mp4 ? (
          <VideoPlayer
            url={resolveVideoUrl(pickedRace.videoname.mp4)!}
            poster={resolveVideoPoster(pickedRace.videoname.jpg)}
            videoStartDt={pickedRace.videoStartDt}
            clockOffsetMs={clockOffsetMs}
          />
        ) : pickedRace && pickedTimer && pickedTimer.phase === 'live' ? (
          <div className="lm-video-live">
            <span className="lm-video-text">{t('monitor.live')}</span>
            <span className="lm-video-game">{t(GAME_LABEL_KEYS[pickedKey!])}</span>
          </div>
        ) : pickedRace && pickedTimer ? (
          <div
            className="lm-video-pre"
            style={{ backgroundImage: `url(${GAME_HERO[pickedKey!]})` }}
          >
            <span className="lm-video-game">{t(GAME_LABEL_KEYS[pickedKey!])}</span>
            <span className="lm-video-countdown">{fmt(pickedTimer.remainingSec)}</span>
            <span className="lm-video-label">{t('monitor.upcoming')}</span>
          </div>
        ) : (
          <div className="lm-video-empty">{t('monitor.waiting')}</div>
        )}
      </div>

    </aside>
  );
}
