/**
 * tvbox-online — minimal page that shows only the LiveMonitor.
 *
 * Copy of the lobby's LiveMonitor with all the rest stripped (no auth,
 * no betslip, no wallet, no race cards, no nav). Used as a standalone
 * test bench / embed where we only need the race video + countdown +
 * jackpot — the same pieces that already work in production in the lobby.
 *
 * URL params:
 *   ?ws=<url>        override the WS feed URL (default ws://host:4099/web-ds)
 *   ?gameType=<key>  pin a specific gameType (dog | dog8 | horsec); default: auto
 */
import { useEffect, useState } from 'react';
import { LiveMonitor } from './components/LiveMonitor';
import { TvboxAuthGate } from './components/TvboxLogin';
import { PremiumIntro } from './premium/PremiumIntro';
import { useRaceFeed } from './hooks/useRaceFeed';
import type { GameKey } from './types/websocket';

const params = new URLSearchParams(window.location.search);
const WS_URL =
  params.get('ws') ||
  (import.meta.env.VITE_WS_URL as string | undefined) ||
  'ws://localhost:4099/web-ds';
// Pin priority: ?gameType=… in the URL wins; otherwise fall back to the
// build-time default VITE_PINNED_GAME (set to `dog` for the 8891 deploy so
// the bare URL shows ONLY greyhound-6 and never leaks dog8). null = auto.
const PINNED =
  (params.get('gameType') as GameKey | null) ||
  (import.meta.env.VITE_PINNED_GAME as GameKey | undefined) ||
  null;

/** The actual viewer — only mounted once authenticated, so the WebSocket feed
 *  doesn't connect on the login screen. */
function Viewer() {
  const { allGames, liveGames, clockOffsetMs, jackpotValue } = useRaceFeed({ wsUrl: WS_URL });
  return (
    <div className="tvbox-online-root">
      <LiveMonitor
        allGames={liveGames}
        betGames={allGames}
        clockOffsetMs={clockOffsetMs}
        jackpotValue={jackpotValue}
        pinnedGame={PINNED}
      />
    </div>
  );
}

/** Dev-only standalone preview of the premium intro with mock data, so the
 *  scene can be verified deterministically without a live PRE race.
 *  Enable with ?premiumDemo=1 (optionally &gameType=dog8&t=95). */
function PremiumDemo() {
  const g = (params.get('gameType') as GameKey | null) || 'dog';
  const t0 = Number(params.get('t')) || 92;
  // The clock ticks down by default (like a real wait); &play=0 freezes it.
  // &speed=N decrements N sec per real second (default 1 = real-time).
  const play = params.get('play') !== '0';
  const speed = Number(params.get('speed')) || 1;
  const [rem, setRem] = useState(t0);
  useEffect(() => {
    if (!play) return;
    const id = setInterval(() => setRem((r) => (r <= 0 ? t0 : r - speed)), 1000);
    return () => clearInterval(id);
  }, [play, speed, t0]);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#14140f' }}>
      <PremiumIntro gameKey={g} remainingSec={play ? rem : t0} />
    </div>
  );
}

export default function App() {
  if (params.get('premiumDemo')) return <PremiumDemo />;
  return (
    <TvboxAuthGate>
      <Viewer />
    </TvboxAuthGate>
  );
}
