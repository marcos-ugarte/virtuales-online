import { Navbar } from './components/Navbar';
import { RaceCard } from './components/RaceCard';
import { LiveMonitor } from './components/LiveMonitor';
import { useRaceFeed } from './hooks/useRaceFeed';

const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ??
  'ws://localhost:4099/web-ds';

export default function App() {
  const { allGames, status, clockOffsetMs } = useRaceFeed({ wsUrl: WS_URL });

  return (
    <>
      <Navbar />
      <main className="lobby-main">
        <div className="lobby-section-header">
          <h1>Upcoming Races</h1>
          <span className="section-badge">
            {status === 'connected' ? 'LIVE' : status.toUpperCase()}
          </span>
          <span className="section-line" aria-hidden="true"></span>
        </div>
        <div className="lobby-shell">
          <div className="games-grid">
            <RaceCard gameType="dog" race={allGames.dog} clockOffsetMs={clockOffsetMs} />
            <RaceCard gameType="dog8" race={allGames.dog8} clockOffsetMs={clockOffsetMs} />
            <RaceCard gameType="horsec" race={allGames.horsec} clockOffsetMs={clockOffsetMs} />
          </div>
          <LiveMonitor allGames={allGames} clockOffsetMs={clockOffsetMs} />
        </div>
      </main>
      <footer className="lobby-footer" role="contentinfo">
        <div className="footer-left">
          <img src="/assets/goldenrace_logo.svg" alt="Golden Race" height="18" />
          <span>&copy; 2024 Golden Race &mdash; Virtual Sports Platform</span>
        </div>
        <div className="footer-right">
          <span>18+</span>
          &nbsp;&middot;&nbsp;
          <a href="#" aria-label="Responsible gambling">Responsible Gambling</a>
          &nbsp;&middot;&nbsp;
          <a href="#" aria-label="Terms and conditions">Terms &amp; Conditions</a>
        </div>
      </footer>
    </>
  );
}
