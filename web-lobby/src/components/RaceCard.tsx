/**
 * RaceCard — renders a single race card with:
 *   - Title bar (per-game gradient + optional bonus badge + weather chip)
 *   - Hero photo strip with countdown overlay
 *   - 8-column participant table (hat | name | last5 | perf | rating | win | place | show)
 */

import type { GameKey, Race, Competitor } from '../types/websocket';
import { useTimer } from '../hooks/useTimer';
import { CountdownOverlay } from './CountdownOverlay';

// ---------------------------------------------------------------------------
// Per-game theme constants
// ---------------------------------------------------------------------------
interface Theme {
  titleStart: string;
  titleEnd: string;
  titleColor: string;
  lightTitle: boolean;
  shieldDir: string;
  heroSrc: string;
  titleText: string;
}

// Per-game theme colors (matching virteon-platform's POS theme map):
//   dog    (betoffer 141) → deep blue       — greyhound 6
//   dog8   (betoffer 541) → deep olive      — greyhound 8
//   horsec (betoffer 241) → light grey      — horse classic 7
const THEMES: Record<GameKey, Theme> = {
  dog: {
    titleStart: '#05215c',
    titleEnd: '#021138',
    titleColor: '#fff',
    lightTitle: false,
    shieldDir: '/assets/dog-shields/dog-',
    heroSrc: '/assets/hero/dog-race.jpg',
    titleText: 'Greyhound Racing: London',
  },
  dog8: {
    titleStart: '#0e432d',
    titleEnd: '#0a241b',
    titleColor: '#fff',
    lightTitle: false,
    shieldDir: '/assets/dog8-shields/dog8-',
    heroSrc: '/assets/hero/dog-race-2.png',
    titleText: 'Greyhound Racing: Hove',
  },
  horsec: {
    titleStart: '#b0bac3',
    titleEnd: '#7a8390',
    titleColor: '#222',
    lightTitle: true,
    shieldDir: '/assets/horsec-shields/horsec-',
    heroSrc: '/assets/hero/horse-race-v2.png',
    titleText: 'Horse Racing: Royal Ascot',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stars from strike rate (1-5). Same formula as static prototype. */
function starsFromStrikeRate(strikeRate: number | undefined): number {
  return Math.max(1, Math.min(5, Math.round((strikeRate ?? 10) / 20)));
}

/**
 * Race number derived from the roundCode tail.
 * RoundCode format: "<betoff>_<scheduleId>_<YYYYMMDD><nnnn>"
 * The last 4 digits are the per-day race counter.
 */
function deriveRaceNumber(id: string): string | undefined {
  const last = id.split('_').pop();
  if (!last || last.length < 4) return undefined;
  return last.slice(-4);
}

/** Render star icons */
function StarRating({ stars }: { stars: number }) {
  return (
    <div className="star-rating">
      <span className="star-label">RTG</span>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < stars ? 'star-filled' : 'star-empty'}>
          {i < stars ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}

/** Last-5 forecast cells */
function ForecastCells({ last5 }: { last5: string | undefined }) {
  if (!last5) {
    return <span className="forecast-empty">—</span>;
  }
  const cells = last5.split('|');
  return (
    <div className="forecast-cells">
      {cells.map((val, idx) => {
        const isScratched = val === '0';
        return (
          <span key={idx} className={`fc-cell${isScratched ? ' fc-scratch' : ''}`}>
            {isScratched ? 'X' : val}
          </span>
        );
      })}
    </div>
  );
}

/** Performance bar */
function PerfBar({ performance }: { performance: number | undefined }) {
  const pct = Math.round((performance ?? 0) * 100);
  return (
    <div className="perf-wrap">
      <span className="perf-pct">{pct}%</span>
      <div className="perf-track">
        <div className="perf-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Odd box */
function OddBox({ value, className }: { value: string; className: string }) {
  return (
    <td className={`td-odd ${className}`}>
      <span className="odd-box">{value}</span>
    </td>
  );
}

/** Small weather/temperature chip in the title bar. */
function WeatherChip({
  weather,
  temperature,
  light,
}: {
  weather?: string;
  temperature?: number;
  light: boolean;
}) {
  if (!weather && temperature === undefined) return null;
  const icon = weatherIcon(weather);
  return (
    <span
      className="card-weather-chip"
      style={{
        color: light ? '#222' : '#fff',
        opacity: 0.85,
      }}
    >
      {icon}
      {temperature !== undefined ? `${Math.round(temperature)}°C` : ''}
    </span>
  );
}

function weatherIcon(weather?: string): string {
  if (!weather) return '';
  const w = weather.toLowerCase();
  if (w.includes('sun') || w.includes('fine')) return '☀️ ';
  if (w.includes('rain')) return '🌧 ';
  if (w.includes('cloud')) return '☁️ ';
  if (w.includes('fog') || w.includes('mist')) return '🌫 ';
  if (w.includes('snow')) return '❄️ ';
  return '🌡 ';
}

/** Bonus multiplier badge in the title bar. */
function BonusBadge({ bonus }: { bonus: number | undefined }) {
  if (!bonus || bonus <= 1) return null;
  return (
    <span className="card-bonus-badge" title={`x${bonus} bonus`}>
      x{bonus} BONUS
    </span>
  );
}

// ---------------------------------------------------------------------------
// Skeleton shown while race data is null
// ---------------------------------------------------------------------------
function SkeletonCard({ theme }: { theme: Theme }) {
  return (
    <div className="race-card">
      <div
        className={`card-title-bar${theme.lightTitle ? ' card-title-bar--light' : ''}`}
        style={{
          background: `linear-gradient(90deg, ${theme.titleStart}, ${theme.titleEnd})`,
          color: theme.titleColor,
        }}
      >
        <span className="card-race-title" style={{ color: theme.titleColor }}>
          {theme.titleText}
        </span>
      </div>
      <div className="card-hero" style={{ position: 'relative' }}>
        <img className="hero-img" src={theme.heroSrc} alt="" />
      </div>
      <div className="lobby-loading">
        <div className="spinner" aria-hidden="true" />
        <span>Waiting for data&hellip;</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface RaceCardProps {
  gameType: GameKey;
  race: Race | null;
  clockOffsetMs: number;
}

export function RaceCard({ gameType, race, clockOffsetMs }: RaceCardProps) {
  const theme = THEMES[gameType];
  const { remainingSec, phase } = useTimer(race?.videoStartDt, clockOffsetMs);

  if (!race) {
    return <SkeletonCard theme={theme} />;
  }

  // Convert competitors Record → sorted array by post position (key is 1-based string)
  const sortedEntries: Array<{ pos: number; comp: Competitor }> = Object.entries(
    race.competitors,
  )
    .map(([key, comp]) => ({ pos: parseInt(key, 10), comp }))
    .sort((a, b) => a.pos - b.pos);

  const raceNumber = deriveRaceNumber(race.id);
  const titleText = raceNumber
    ? `${theme.titleText} — Race #${raceNumber}`
    : theme.titleText;

  return (
    <div className="race-card">
      {/* ── 1. Title bar ── */}
      <div
        className={`card-title-bar${theme.lightTitle ? ' card-title-bar--light' : ''}`}
        style={{
          background: `linear-gradient(90deg, ${theme.titleStart}, ${theme.titleEnd})`,
          color: theme.titleColor,
        }}
      >
        <span className="card-race-title" style={{ color: theme.titleColor }}>
          {titleText}
        </span>
        <span className="card-title-meta">
          <BonusBadge bonus={race.bonus} />
          <WeatherChip
            weather={race.weather}
            temperature={race.temperature}
            light={theme.lightTitle}
          />
        </span>
        <a
          className="card-watch-link"
          href="#"
          aria-label="Watch live"
          style={{ color: theme.titleColor }}
        >
          <img
            className="watch-tv-icon"
            src="/assets/icons/tv.svg"
            alt=""
            aria-hidden="true"
          />
          WATCH
        </a>
      </div>

      {/* ── 2. Hero photo strip + countdown overlay ── */}
      <div className="card-hero" style={{ position: 'relative' }}>
        <img className="hero-img" src={theme.heroSrc} alt="" />
        <CountdownOverlay remainingSec={remainingSec} phase={phase} />
      </div>

      {/* ── 3. Participant table ── */}
      <div className="participants-table">
        <table>
          <colgroup>
            <col className="col-hat" />
            <col className="col-name" />
            <col className="col-forecast" />
            <col className="col-perf" />
            <col className="col-rating" />
            <col className="col-win" />
            <col className="col-place" />
            <col className="col-show" />
          </colgroup>
          <thead>
            <tr className="col-header-row">
              <th className="th-hat" aria-hidden="true"></th>
              <th className="th-name" aria-hidden="true"></th>
              <th className="th-forecast">Last Results</th>
              <th className="th-perf">Performance</th>
              <th className="th-rating">Rating</th>
              <th className="th-win">WIN</th>
              <th className="th-place">PLACE</th>
              <th className="th-show">SHOW</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map(({ pos, comp }) => {
              const i = pos - 1; // 0-based index for odds array
              const winOdd = race.odds[i] ?? 0;
              // PLACE / SHOW heuristics — the vendor `odds` array is a
              // matrix indexed by bettype; the first N entries are WIN.
              // PLACE / SHOW live at other offsets defined in
              // betoffer.bettypes[].oddsIndexStart, not modelled here yet.
              // The /2.2 and /3.8 multipliers preserve the visual demo
              // shape from the original Virtustec lobby.
              const placeOdd = winOdd / 2.2;
              const showOdd = winOdd / 3.8;
              const stars = starsFromStrikeRate(comp.strikeRate);

              return (
                <tr key={pos} className="participant-row">
                  {/* Hat / shield */}
                  <td className="td-hat">
                    <div className="hat-post-wrap">
                      <img
                        className="hat-img hat-img--shield"
                        src={`${theme.shieldDir}${pos}.svg`}
                        alt={`Post ${pos}`}
                      />
                    </div>
                  </td>

                  {/* Name */}
                  <td className="td-name">
                    <span className="participant-name">{comp.name}</span>
                  </td>

                  {/* Last 5 results */}
                  <td className="td-forecast">
                    <ForecastCells last5={comp.last5} />
                  </td>

                  {/* Performance bar */}
                  <td className="td-perf">
                    <PerfBar performance={comp.performance} />
                  </td>

                  {/* Star rating */}
                  <td className="td-rating">
                    <StarRating stars={stars} />
                  </td>

                  {/* WIN / PLACE / SHOW columns — match the Virtustec lobby. */}
                  <OddBox value={winOdd.toFixed(2)} className="td-win" />
                  <OddBox value={placeOdd.toFixed(2)} className="td-place" />
                  <OddBox value={showOdd.toFixed(2)} className="td-show" />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
