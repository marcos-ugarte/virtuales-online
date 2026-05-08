/**
 * LiveMonitor — small "TV monitor" panel pinned to the right of the lobby.
 * Shows a placeholder for the currently-running race (video) and a live
 * ticker with the race's runners + their finish positions/times when a
 * gameResult arrives. For now it picks whichever game has the smallest
 * remaining countdown — the "next to finish" — and shows that.
 */

import type { GameKey, RaceData } from '../types/websocket';
import { useTimer } from '../hooks/useTimer';

const GAME_LABELS: Record<GameKey, string> = {
  dos: 'Greyhound · 6',
  doe: 'Greyhound · 8',
  hoc: 'Horse · 7',
};

interface Props {
  allGames: Record<GameKey, RaceData | null>;
  clockOffsetMs: number;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function LiveMonitor({ allGames, clockOffsetMs }: Props) {
  // Pick the race with the smallest remaining countdown (most "imminent").
  const games = (Object.entries(allGames) as Array<[GameKey, RaceData | null]>)
    .filter(([, r]) => r !== null) as Array<[GameKey, RaceData]>;

  // Hooks must run unconditionally — call useTimer once for each known game,
  // then pick the one with the lowest remaining time.
  const dosTimer = useTimer(allGames.dos?.videoStartDt, clockOffsetMs);
  const doeTimer = useTimer(allGames.doe?.videoStartDt, clockOffsetMs);
  const hocTimer = useTimer(allGames.hoc?.videoStartDt, clockOffsetMs);

  const timers: Record<GameKey, ReturnType<typeof useTimer>> = {
    dos: dosTimer,
    doe: doeTimer,
    hoc: hocTimer,
  };

  let pickedKey: GameKey | null = null;
  let lowest = Number.POSITIVE_INFINITY;
  for (const [key] of games) {
    const t = timers[key];
    if (t.phase === 'idle') continue;
    if (t.remainingSec < lowest) {
      lowest = t.remainingSec;
      pickedKey = key;
    }
  }

  const pickedRace = pickedKey ? allGames[pickedKey] : null;
  const pickedTimer = pickedKey ? timers[pickedKey] : null;

  return (
    <aside className="live-monitor" aria-label="Live race monitor">
      {/* Video placeholder area */}
      <div className="lm-video">
        {pickedRace && pickedTimer && pickedTimer.phase === 'live' ? (
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

      {/* Race-in-progress ticker / runners list */}
      {pickedRace ? (
        <div className="lm-ticker">
          <div className="lm-ticker-header">
            <span className="lm-ticker-title">
              {GAME_LABELS[pickedKey!]} · #{pickedRace.raceNumber ?? '—'}
            </span>
            {pickedTimer && (
              <span className="lm-ticker-time">{fmt(pickedTimer.remainingSec)}</span>
            )}
          </div>
          <ul className="lm-ticker-list">
            {Object.entries(pickedRace.competitors)
              .map(([k, c]) => ({ pos: parseInt(k, 10), name: c.name, odds: pickedRace.odds[parseInt(k, 10) - 1] ?? 0 }))
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

      {/* Jackpot teaser (purely cosmetic for now) */}
      <div className="lm-jackpot">
        <div className="lm-jackpot-label">GLOBAL JACKPOT</div>
        <div className="lm-jackpot-amount">€&nbsp;0.00</div>
      </div>
    </aside>
  );
}
