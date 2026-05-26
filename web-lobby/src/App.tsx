import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { RaceCard } from './components/RaceCard';
import { LiveMonitor } from './components/LiveMonitor';
import { RightPanel } from './components/RightPanel';
import { MobileBetslip } from './components/MobileBetslip';
import { LoginScreen } from './components/LoginScreen';
import { RecentResults } from './components/RecentResults';
import { useRaceFeed } from './hooks/useRaceFeed';
import { useLang } from './i18n';
import { useBetslip } from './state/betslip';
import { useAuth } from './state/auth';
import { RaceFeedSnapshotProvider } from './state/raceFeedSnapshot';
import { RaceOverlay, type OverlayGameType } from './components/RaceOverlay';
import type { GameKey } from './types/websocket';

const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ??
  'ws://localhost:4099/web-ds';

/** Dev-only isolation harness for the embedded-monitor PIXI overlay.
 *  ?overlayDemo=dog6|dog8 — mounts RaceOverlay over a dummy live video with
 *  mock competitors/odds/finish/interval so all 3 overlays draw immediately,
 *  with no WS/auth and no live-phase timing. Used to diagnose dog8 vs dog6. */
function OverlayDemo({ gameType }: { gameType: OverlayGameType }) {
  const N = gameType === 'dog8' ? 8 : 6;
  const now = Date.now();
  const iso = (ms: number) =>
    new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
  const competitors: Record<string, { name: string; bestLap?: number }> = {};
  for (let i = 1; i <= N; i++) competitors[String(i)] = { name: `RUNNER ${i}`, bestLap: 28 + i / 10 };
  const odds = Array.from({ length: N * N }, (_, k) => 2 + (k % 40));
  // competitorIndex is 1-based (post position); toResult subtracts 1.
  const finish: Record<string, { competitorIndex: number; time?: number }> = {
    '1': { competitorIndex: 3, time: 29.4 },
    '2': { competitorIndex: 1, time: 29.7 },
    '3': { competitorIndex: 5, time: 30.1 },
  };
  const interval = {
    '1': { '1': { competitorIndex: 3, time: 11.04 }, '2': { competitorIndex: 4, time: 11.1 } },
    '2': { '1': { competitorIndex: 3, time: 24.5 }, '2': { competitorIndex: 1, time: 24.7 } },
  };
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <div className="lm-video" style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* real local clip so the overlay's video-time gating advances */}
        <video
          className="lm-video-el"
          src={`/videos/${gameType === 'dog8' ? 'dog8' : 'dog6'}/R0001_h.mp4`}
          autoPlay
          muted
          loop
          playsInline
          style={{ width: '100%', height: '100%' }}
        />
        <RaceOverlay
          gameType={gameType}
          raceId={`demo_${gameType}_1`}
          competitors={competitors as never}
          finish={finish}
          interval={interval as never}
          odds={odds}
          videoStartDt={iso(now - 28000)}
          videoEndDt={iso(now + 20000)}
          clockOffsetMs={0}
          phase="live"
          remainingSec={0}
        />
      </div>
    </div>
  );
}

export default function App() {
  const { status } = useAuth();

  const od = new URLSearchParams(window.location.search).get('overlayDemo');
  if (od === 'dog6' || od === 'dog8') return <OverlayDemo gameType={od} />;

  if (status === 'loading') {
    return <BootSplash />;
  }
  if (status === 'anonymous') {
    return <LoginScreen />;
  }
  return <Lobby />;
}

/**
 * Minimal boot screen shown while the AuthProvider tries to revive a saved
 * session (the refresh call takes ~150ms). Keeps the user from seeing a
 * jarring flash of LoginScreen → Lobby on every reload of an authenticated
 * session.
 */
function BootSplash() {
  return (
    <div className="boot-splash">
      <img
        src="/assets/virtualrace_logo.png"
        alt="Virtual Race"
        className="boot-splash-logo"
      />
      <div className="boot-splash-spinner" aria-hidden="true" />
    </div>
  );
}

/**
 * The real lobby. Only mounts when the user is authenticated, so the WS
 * connection is opened only for signed-in players.
 */
function Lobby() {
  const {
    allGames,
    liveGames,
    status,
    clockOffsetMs,
    recentResults,
    jackpotValue,
  } = useRaceFeed({ wsUrl: WS_URL });
  const { t } = useLang();
  const { pruneToActiveRaces } = useBetslip();
  // null = LiveMonitor auto-picks; non-null = pinned to a specific game
  // because the user clicked WATCH on that card.
  const [pinnedGame, setPinnedGame] = useState<GameKey | null>(null);

  // When a race rotates to its next round, drop slip entries that refer to
  // the now-finished race so the slip never disagrees with what the cards
  // show. Only depends on the race ids — not the full race objects — so
  // odds/timer updates don't trigger pruning.
  const dogId = allGames.dog?.id;
  const dog8Id = allGames.dog8?.id;
  const horsecId = allGames.horsec?.id;
  useEffect(() => {
    pruneToActiveRaces(
      [dogId, dog8Id, horsecId].filter((x): x is string => Boolean(x)),
    );
  }, [dogId, dog8Id, horsecId, pruneToActiveRaces]);

  const statusLabel =
    status === 'connected'
      ? t('lobby.status.connected')
      : status === 'connecting'
      ? t('lobby.status.connecting')
      : status === 'reconnecting'
      ? t('lobby.status.reconnecting')
      : t('lobby.status.error');

  return (
    <RaceFeedSnapshotProvider allGames={allGames} recentResults={recentResults}>
      <Navbar />
      <main className="lobby-main">
        <div className="lobby-section-header">
          <h1>{t('lobby.upcoming')}</h1>
          <span className="section-badge">{statusLabel}</span>
          <span className="section-line" aria-hidden="true"></span>
        </div>
        <div className="lobby-shell">
          <div className="games-grid">
            <RaceCard
              gameType="dog"
              race={allGames.dog}
              clockOffsetMs={clockOffsetMs}
              isWatching={pinnedGame === 'dog'}
              onWatch={() => setPinnedGame(pinnedGame === 'dog' ? null : 'dog')}
            />
            <RaceCard
              gameType="dog8"
              race={allGames.dog8}
              clockOffsetMs={clockOffsetMs}
              isWatching={pinnedGame === 'dog8'}
              onWatch={() => setPinnedGame(pinnedGame === 'dog8' ? null : 'dog8')}
            />
            <RaceCard
              gameType="horsec"
              race={allGames.horsec}
              clockOffsetMs={clockOffsetMs}
              isWatching={pinnedGame === 'horsec'}
              onWatch={() => setPinnedGame(pinnedGame === 'horsec' ? null : 'horsec')}
            />
          </div>
          <div className="lobby-rail">
            <LiveMonitor
              allGames={liveGames}
              betGames={allGames}
              clockOffsetMs={clockOffsetMs}
              jackpotValue={jackpotValue}
              pinnedGame={pinnedGame}
            />
            <RecentResults results={recentResults} />
          </div>
          <RightPanel />
        </div>
        {/* Responsive (≤1280px): the sidebar RightPanel is hidden via CSS and
            the betslip/tickets are reached through this FAB + drawer instead. */}
        <MobileBetslip />
      </main>
      <footer className="lobby-footer" role="contentinfo">
        <div className="footer-left">
          <img src="/assets/virtualrace_logo.png" alt="Virtual Race" height="18" />
          <span>{t('footer.copyright')}</span>
        </div>
        <div className="footer-right">
          <span>18+</span>
          &nbsp;&middot;&nbsp;
          <a href="#" aria-label={t('footer.responsible')}>{t('footer.responsible')}</a>
          &nbsp;&middot;&nbsp;
          <a href="#" aria-label={t('footer.terms')}>{t('footer.terms')}</a>
        </div>
      </footer>
    </RaceFeedSnapshotProvider>
  );
}
