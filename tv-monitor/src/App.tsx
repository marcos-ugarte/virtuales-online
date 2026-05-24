/**
 * tv-monitor — minimal page that shows only the LiveMonitor.
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
import { LiveMonitor } from './components/LiveMonitor';
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

export default function App() {
  const { allGames, liveGames, clockOffsetMs, jackpotValue } = useRaceFeed({ wsUrl: WS_URL });
  return (
    <div className="tv-monitor-root">
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
