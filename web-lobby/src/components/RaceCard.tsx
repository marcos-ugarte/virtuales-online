/**
 * RaceCard — renders a single race card with:
 *   - Title bar (per-game gradient + optional bonus badge + weather chip)
 *   - Hero photo strip with countdown overlay
 *   - 6-column participant table (hat | name | last5 | perf | rating | win)
 *
 * Only WIN is rendered. PLACE/SHOW are not native markets for our 3
 * betoffers (141/541/241) — the vendor wire only exposes Winner +
 * Forecast in order for those. Forecast (EXACTA — pick 1st + 2nd in
 * order) is the wire-native "second position" market and belongs in a
 * separate panel, not as a per-runner column.
 */

import type { GameKey, Race, Competitor } from '../types/websocket';
import { useTimer } from '../hooks/useTimer';
import { CountdownOverlay } from './CountdownOverlay';
import { useLang } from '../i18n';
import { useBetslip, useIsSelected } from '../state/betslip';

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
    /** titleText holds the prefix-key + ": location"; rendered via t() */
    titleText: 'card.dog6:London',
  },
  dog8: {
    titleStart: '#0e432d',
    titleEnd: '#0a241b',
    titleColor: '#fff',
    lightTitle: false,
    shieldDir: '/assets/dog8-shields/dog8-',
    heroSrc: '/assets/hero/dog-race-2.png',
    titleText: 'card.dog8:Hove',
  },
  horsec: {
    titleStart: '#b0bac3',
    titleEnd: '#7a8390',
    titleColor: '#222',
    lightTitle: true,
    shieldDir: '/assets/horsec-shields/horsec-',
    heroSrc: '/assets/hero/horse-race-v2.png',
    titleText: 'card.horse7:Royal Ascot',
  },
};

/** Convert "card.greyhound:London" → "Greyhound Racing: London" (or ES). */
function formatTitle(key: string, t: (k: string) => string): string {
  const [k, loc] = key.split(':');
  return loc ? `${t(k)}: ${loc}` : t(k);
}

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
function StarRating({ stars, label }: { stars: number; label: string }) {
  return (
    <div className="star-rating">
      <span className="star-label">{label}</span>
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

/** Clickable WIN odd cell — toggles the runner into the betslip.
 *  When `disabled` (race is in live phase), shown grey + not interactive. */
function WinOddCell({
  value,
  onClick,
  selected,
  disabled,
  ariaLabel,
  tooltip,
}: {
  value: string;
  onClick: () => void;
  selected: boolean;
  disabled: boolean;
  ariaLabel: string;
  tooltip: string;
}) {
  return (
    <td className="td-odd td-win">
      <button
        type="button"
        className={
          'odd-box' +
          (selected ? ' odd-box--selected' : '') +
          (disabled ? ' odd-box--disabled' : '')
        }
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-pressed={selected}
        title={tooltip}
      >
        {value}
      </button>
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
  const { t } = useLang();
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
          {formatTitle(theme.titleText, t)}
        </span>
      </div>
      <div className="card-hero" style={{ position: 'relative' }}>
        <img className="hero-img" src={theme.heroSrc} alt="" />
      </div>
      <div className="lobby-loading">
        <div className="spinner" aria-hidden="true" />
        <span>{t('card.waiting')}</span>
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
  /** True when this card is the one currently driving the LiveMonitor. */
  isWatching: boolean;
  /** Fired when the user clicks WATCH on this card. */
  onWatch: () => void;
}

export function RaceCard({ gameType, race, clockOffsetMs, isWatching, onWatch }: RaceCardProps) {
  const theme = THEMES[gameType];
  const { t } = useLang();
  const { toggleWin } = useBetslip();
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
  const baseTitle = formatTitle(theme.titleText, t);
  const titleText = raceNumber
    ? `${baseTitle} — ${t('card.race')} #${raceNumber}`
    : baseTitle;

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
        <WeatherChip
          weather={race.weather}
          temperature={race.temperature}
          light={theme.lightTitle}
        />
        <span className="card-title-spacer" aria-hidden="true" />
        <BonusBadge bonus={race.bonus} />
        <button
          type="button"
          className={`card-watch-link${isWatching ? ' card-watch-link--active' : ''}${phase !== 'live' ? ' card-watch-link--disabled' : ''}`}
          onClick={onWatch}
          // Only a live race can be watched. While WAITING (countdown /
          // between races) the button is inert.
          disabled={phase !== 'live'}
          aria-pressed={isWatching}
          aria-label="Watch this race on the monitor"
          style={{ color: theme.titleColor }}
        >
          <img
            className="watch-tv-icon"
            src="/assets/icons/tv.svg"
            alt=""
            aria-hidden="true"
          />
          {/* Three states driven by the race's own phase:
              - not started yet / between races (phase 'pre'|'idle') → WAITING
                (shown regardless of selection, incl. on first app load)
              - live + this card is the one being shown → WATCHING
              - live + not selected → WATCH (click to watch it)
              When the live race ends the data advances to the next race
              (phase 'pre') so it flips back to WAITING automatically; picking
              another card clears isWatching → WATCHING falls back to WATCH. */}
          {phase !== 'live' ? 'WAITING' : isWatching ? 'WATCHING' : 'WATCH'}
        </button>
      </div>

      {/* ── 2. Hero photo strip + countdown overlay ── */}
      <div className="card-hero" style={{ position: 'relative' }}>
        <img className="hero-img" src={theme.heroSrc} alt="" />
        <CountdownOverlay
          remainingSec={remainingSec}
          phase={phase}
          scheduledAt={race.videoStartDt}
        />
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
          </colgroup>
          <thead>
            <tr className="col-header-row">
              <th className="th-hat" aria-hidden="true"></th>
              <th className="th-name" aria-hidden="true"></th>
              <th className="th-forecast">{t('col.lastResults')}</th>
              <th className="th-perf">{t('col.performance')}</th>
              <th className="th-rating">{t('col.rating')}</th>
              <th className="th-win">{t('col.win')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map(({ pos, comp }) => {
              const i = pos - 1; // 0-based index for odds array
              const winOdd = race.odds[i] ?? 0;
              const stars = starsFromStrikeRate(comp.strikeRate);

              return (
                <ParticipantRow
                  key={pos}
                  pos={pos}
                  comp={comp}
                  winOdd={winOdd}
                  stars={stars}
                  theme={theme}
                  raceId={race.id}
                  raceLabel={titleText}
                  gameType={gameType}
                  onToggleWin={toggleWin}
                  bettingClosed={phase === 'live'}
                  t={t}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * One <tr> per runner. Extracted as a component so `useIsSelected` (which
 * subscribes to the betslip context) only re-renders the rows that changed.
 */
function ParticipantRow({
  pos,
  comp,
  winOdd,
  stars,
  theme,
  raceId,
  raceLabel,
  gameType,
  onToggleWin,
  bettingClosed,
  t,
}: {
  pos: number;
  comp: Competitor;
  winOdd: number;
  stars: number;
  theme: Theme;
  raceId: string;
  raceLabel: string;
  gameType: GameKey;
  onToggleWin: ReturnType<typeof useBetslip>['toggleWin'];
  bettingClosed: boolean;
  t: (k: string) => string;
}) {
  const selected = useIsSelected(raceId, pos, 'win');
  const handleClick = () => {
    if (bettingClosed) return;
    onToggleWin({
      raceId,
      raceLabel,
      gameType,
      runnerPos: pos,
      runnerName: comp.name,
      odds: winOdd,
    });
  };

  return (
    <tr className="participant-row">
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
        <StarRating stars={stars} label={t('col.rtg')} />
      </td>

      <WinOddCell
        value={winOdd.toFixed(2)}
        onClick={handleClick}
        selected={selected}
        disabled={bettingClosed}
        ariaLabel={`${comp.name} ${t('betslip.win')} @ ${winOdd.toFixed(2)}`}
        tooltip={
          bettingClosed
            ? t('countdown.liveNow')
            : selected
              ? t('betslip.tooltipRemove')
              : t('betslip.tooltipAdd')
        }
      />
    </tr>
  );
}
