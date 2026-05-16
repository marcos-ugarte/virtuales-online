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
import { GAME_KEYS } from '../types/websocket';
import { useTimer } from '../hooks/useTimer';

const GAME_LABELS: Record<GameKey, string> = {
  dog: 'Greyhound · 6',
  dog8: 'Greyhound · 8',
  horsec: 'Horse · 7',
};

interface Props {
  allGames: AllGames;
  clockOffsetMs: number;
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

function deriveRaceNumber(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const last = id.split('_').pop();
  if (!last || last.length < 4) return undefined;
  return last.slice(-4);
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

export function LiveMonitor({ allGames, clockOffsetMs }: Props) {
  // Hooks must run unconditionally — call useTimer once for each known game.
  const dogTimer = useTimer(allGames.dog?.videoStartDt, clockOffsetMs);
  const dog8Timer = useTimer(allGames.dog8?.videoStartDt, clockOffsetMs);
  const horsecTimer = useTimer(allGames.horsec?.videoStartDt, clockOffsetMs);

  const timers: Record<GameKey, ReturnType<typeof useTimer>> = {
    dog: dogTimer,
    dog8: dog8Timer,
    horsec: horsecTimer,
  };

  // Pick the race with the smallest remaining countdown (most "imminent").
  let pickedKey: GameKey | null = null;
  let lowest = Number.POSITIVE_INFINITY;
  for (const gk of GAME_KEYS) {
    const race = allGames[gk];
    if (!race) continue;
    const t = timers[gk];
    if (t.phase === 'idle') continue;
    if (t.remainingSec < lowest) {
      lowest = t.remainingSec;
      pickedKey = gk;
    }
  }

  const pickedRace: Race | null = pickedKey ? allGames[pickedKey] : null;
  const pickedTimer = pickedKey ? timers[pickedKey] : null;
  const jackpotValue = pickedRace?.jackpotInfo?.bonusValue ?? 0;

  return (
    <aside className="live-monitor" aria-label="Live race monitor">
      {/* Video / countdown area */}
      <div className="lm-video">
        {pickedRace && pickedTimer && pickedTimer.phase === 'live' && pickedRace.videoname?.mp4 ? (
          <VideoPlayer
            url={pickedRace.videoname.mp4}
            poster={pickedRace.videoname.jpg}
            videoStartDt={pickedRace.videoStartDt}
            clockOffsetMs={clockOffsetMs}
          />
        ) : pickedRace && pickedTimer && pickedTimer.phase === 'live' ? (
          <div className="lm-video-live">
            <span className="lm-video-text">LIVE</span>
            <span className="lm-video-game">{GAME_LABELS[pickedKey!]}</span>
          </div>
        ) : pickedRace && pickedTimer ? (
          <div className="lm-video-pre">
            <span className="lm-video-game">{GAME_LABELS[pickedKey!]}</span>
            <span className="lm-video-countdown">{fmt(pickedTimer.remainingSec)}</span>
            <span className="lm-video-label">UPCOMING</span>
          </div>
        ) : (
          <div className="lm-video-empty">Waiting for race…</div>
        )}
      </div>

      {/* Runners ticker */}
      {pickedRace ? (
        <div className="lm-ticker">
          <div className="lm-ticker-header">
            <span className="lm-ticker-title">
              {GAME_LABELS[pickedKey!]} · #{deriveRaceNumber(pickedRace.id) ?? '—'}
            </span>
            {pickedTimer && (
              <span className="lm-ticker-time">{fmt(pickedTimer.remainingSec)}</span>
            )}
          </div>
          <ul className="lm-ticker-list">
            {Object.entries(pickedRace.competitors)
              .map(([k, c]) => ({
                pos: parseInt(k, 10),
                name: c.name,
                odds: pickedRace.odds[parseInt(k, 10) - 1] ?? 0,
              }))
              .sort((a, b) => a.pos - b.pos)
              .map(({ pos, name, odds }) => (
                <li key={pos} className="lm-ticker-row">
                  <span className="lm-ticker-pos">{pos}</span>
                  <span className="lm-ticker-name">{name}</span>
                  <span className="lm-ticker-odd">{odds.toFixed(2)}</span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {/* Jackpot — pulled from the picked race's jackpotInfo.bonusValue */}
      <div className="lm-jackpot">
        <div className="lm-jackpot-label">GLOBAL JACKPOT</div>
        <div className="lm-jackpot-amount">
          €&nbsp;
          {jackpotValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
    </aside>
  );
}
