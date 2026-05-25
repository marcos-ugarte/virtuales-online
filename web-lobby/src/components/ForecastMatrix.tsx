/**
 * ForecastMatrix — the EXACTA / Forecast odds for a race (pick 1st + 2nd in
 * exact order). Two presentations sharing one pick callback:
 *   - WIDE (≥700px): full N×N grid (rows = 1st place, cols = 2nd place,
 *     diagonal blocked).
 *   - NARROW (<700px): a 2-step picker (choose 1st, then 2nd) — an N×N grid is
 *     unreadable / un-tappable on a phone.
 * Picking a pair bubbles up via `onPickPair`, which opens the shared stake
 * popover (same amount UI as WIN) to add it to the betslip.
 */
import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { Competitor } from '../types/websocket';
import { forecastOdd } from '../services/odds';
import { useBetslip } from '../state/betslip';
import { useLang } from '../i18n';
import { useMediaQuery } from '../hooks/useMediaQuery';

export interface ForecastPick {
  first: number;
  second: number;
  firstName: string;
  secondName: string;
  odds: number;
}

interface Props {
  raceId: string;
  competitors: Record<string, Competitor>;
  odds: number[];
  bettingClosed: boolean;
  onPickPair: (pick: ForecastPick, rect: DOMRect) => void;
}

function useRunners(competitors: Record<string, Competitor>) {
  return useMemo(() => {
    return Object.keys(competitors)
      .map((k) => parseInt(k, 10))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b)
      .map((pos) => ({ pos, name: competitors[String(pos)]?.name ?? '' }));
  }, [competitors]);
}

export function ForecastMatrix({ raceId, competitors, odds, bettingClosed, onPickPair }: Props) {
  const narrow = useMediaQuery('(max-width: 699px)');
  const { t } = useLang();
  const { selections } = useBetslip();
  const runners = useRunners(competitors);
  const n = runners.length;

  const isInSlip = (first: number, second: number) =>
    selections.some(
      (s) => s.raceId === raceId && s.type === 'forecast' && s.runnerPos === first && s.second === second,
    );

  const pick = (first: number, second: number, e: ReactMouseEvent<HTMLButtonElement>) => {
    if (bettingClosed || first === second) return;
    onPickPair(
      {
        first,
        second,
        firstName: runners.find((r) => r.pos === first)?.name ?? '',
        secondName: runners.find((r) => r.pos === second)?.name ?? '',
        odds: forecastOdd(odds, first, second, n),
      },
      e.currentTarget.getBoundingClientRect(),
    );
  };

  if (n === 0) return null;

  // ── NARROW: 2-step picker ──────────────────────────────────────────────
  if (narrow) {
    return <TwoStep runners={runners} odds={odds} n={n} bettingClosed={bettingClosed}
      isInSlip={isInSlip} pick={pick} t={t} />;
  }

  // ── WIDE: full grid ────────────────────────────────────────────────────
  return (
    <div className="fc">
      <div className="fc-legend">{t('forecast.legend')}</div>
      <div className="fc-grid" role="grid" aria-label={t('forecast.title')}
        style={{ gridTemplateColumns: `var(--fc-head) repeat(${n}, 1fr)` }}>
        {/* header row */}
        <div className="fc-corner" aria-hidden="true">1°\2°</div>
        {runners.map((r) => (
          <div key={`h${r.pos}`} className="fc-head fc-head-col">{r.pos}</div>
        ))}
        {/* body rows */}
        {runners.map((rowR) => (
          <Row key={`r${rowR.pos}`} rowR={rowR} runners={runners} odds={odds} n={n}
            bettingClosed={bettingClosed} isInSlip={isInSlip} pick={pick} />
        ))}
      </div>
    </div>
  );
}

function Row({ rowR, runners, odds, n, bettingClosed, isInSlip, pick }: {
  rowR: { pos: number; name: string };
  runners: { pos: number; name: string }[];
  odds: number[]; n: number; bettingClosed: boolean;
  isInSlip: (a: number, b: number) => boolean;
  pick: (a: number, b: number, e: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <>
      <div className="fc-head fc-head-row">{rowR.pos}</div>
      {runners.map((colR) => {
        if (rowR.pos === colR.pos) {
          return <div key={colR.pos} className="fc-cell-blocked" aria-hidden="true">—</div>;
        }
        const odd = forecastOdd(odds, rowR.pos, colR.pos, n);
        return (
          <button
            key={colR.pos}
            type="button"
            className={`fc-cell${isInSlip(rowR.pos, colR.pos) ? ' fc-cell-active' : ''}`}
            disabled={bettingClosed}
            onClick={(e) => pick(rowR.pos, colR.pos, e)}
            aria-label={`${rowR.pos} → ${colR.pos} @ ${odd.toFixed(2)}`}
          >
            {odd.toFixed(odd >= 100 ? 0 : 1)}
          </button>
        );
      })}
    </>
  );
}

function TwoStep({ runners, odds, n, bettingClosed, isInSlip, pick, t }: {
  runners: { pos: number; name: string }[];
  odds: number[]; n: number; bettingClosed: boolean;
  isInSlip: (a: number, b: number) => boolean;
  pick: (a: number, b: number, e: ReactMouseEvent<HTMLButtonElement>) => void;
  t: (k: string) => string;
}) {
  const [first, setFirst] = useState<number | null>(null);
  return (
    <div className="fc fc-twostep">
      <div className="fc-legend">{t('forecast.step1')}</div>
      <div className="fc-chips">
        {runners.map((r) => (
          <button key={r.pos} type="button"
            className={`fc-chip${first === r.pos ? ' fc-chip-active' : ''}`}
            onClick={() => setFirst(r.pos)}>
            {r.pos}
          </button>
        ))}
      </div>
      {first != null && (
        <>
          <div className="fc-legend">{t('forecast.step2')}</div>
          <div className="fc-chips">
            {runners.filter((r) => r.pos !== first).map((r) => {
              const odd = forecastOdd(odds, first, r.pos, n);
              return (
                <button key={r.pos} type="button"
                  className={`fc-chip fc-chip-odd${isInSlip(first, r.pos) ? ' fc-chip-active' : ''}`}
                  disabled={bettingClosed}
                  onClick={(e) => pick(first, r.pos, e)}>
                  <span className="fc-chip-pos">{r.pos}</span>
                  <span className="fc-chip-val">{odd.toFixed(odd >= 100 ? 0 : 1)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
