/**
 * MobileActionBar — sticky bottom Betslip summary + sheet shells for
 * Betslip and MyBets. Renders nothing on desktop (CSS hides it). The
 * surrounding components (Navbar's MIS APUESTAS button, the WIN cells
 * driving the slip) reach it through the `useMobileActionBar` hook.
 *
 * State is a tiny module-level subject so any component can call
 * `openMyBets()` without a Provider in the tree.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Betslip } from './Betslip';
import { MyBetsList } from './MyBetsList';
import { useBetslip } from '../state/betslip';
import { useLang } from '../i18n';

type Sheet = 'closed' | 'betslip' | 'mybets';

const listeners = new Set<() => void>();
let sheetState: Sheet = 'closed';

function setSheet(next: Sheet) {
  if (next === sheetState) return;
  sheetState = next;
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useMobileActionBar(): {
  sheet: Sheet;
  openBetslip(): void;
  openMyBets(): void;
  close(): void;
} {
  const sheet = useSyncExternalStore(
    subscribe,
    () => sheetState,
    () => sheetState,
  );
  return {
    sheet,
    openBetslip: () => setSheet('betslip'),
    openMyBets: () => setSheet('mybets'),
    close: () => setSheet('closed'),
  };
}

export function MobileActionBar() {
  const { t, formatMoney } = useLang();
  const { selections } = useBetslip();
  const { sheet, openBetslip, close } = useMobileActionBar();

  const totalStake = selections.reduce((acc, s) => acc + s.stake, 0);
  const totalPayout = selections.reduce((acc, s) => acc + s.stake * s.odds, 0);
  const count = selections.length;

  // Lock body scroll while a sheet is open so the underlying lobby
  // doesn't scroll behind it.
  useEffect(() => {
    if (sheet === 'closed') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheet]);

  // Close any open sheet on Esc.
  useEffect(() => {
    if (sheet === 'closed') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, close]);

  return (
    <>
      {count > 0 && (
        <button
          type="button"
          className="mab-bar"
          onClick={openBetslip}
          aria-label={t('mobile.bar.openSlip') || 'Open betslip'}
        >
          <span className="mab-bar-summary">
            <span className="mab-bar-count">
              🎫 <strong>{count}</strong>{' '}
              {count === 1
                ? t('mobile.bar.selectionOne')
                : t('mobile.bar.selectionMany')}
            </span>
            <span className="mab-bar-totals">
              <strong>{formatMoney(totalStake)}</strong>
              <span className="mab-bar-sep">·</span>
              <span className="mab-bar-payout">
                {t('mobile.bar.win')} {formatMoney(totalPayout)}
              </span>
            </span>
          </span>
          <span className="mab-bar-cta">
            {t('mobile.bar.openCta')} <span aria-hidden="true">↑</span>
          </span>
        </button>
      )}

      {sheet !== 'closed' && (
        <div
          className="mab-sheet-backdrop"
          onClick={close}
          role="presentation"
        >
          <div
            className="mab-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={
              sheet === 'betslip'
                ? t('betslip.title')
                : t('mybets.title')
            }
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mab-sheet-header">
              <span className="mab-sheet-grabber" aria-hidden="true" />
              <h2 className="mab-sheet-title">
                {sheet === 'betslip'
                  ? t('betslip.title')
                  : t('mybets.title')}
              </h2>
              <button
                type="button"
                className="mab-sheet-close"
                onClick={close}
                aria-label={t('results.close')}
              >
                ×
              </button>
            </header>
            <div className="mab-sheet-body">
              {sheet === 'betslip' && <Betslip />}
              {sheet === 'mybets' && <MobileMyBets />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Tabbed wrapper for the MyBets sheet (active/history). */
function MobileMyBets() {
  const { t } = useLang();
  const [tab, setTab] = useTabState();
  return (
    <div className="mab-mybets">
      <div className="mab-mybets-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'open'}
          className={`mab-mybets-tab${tab === 'open' ? ' mab-mybets-tab--active' : ''}`}
          onClick={() => setTab('open')}
        >
          {t('mybets.openTab')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'settled'}
          className={`mab-mybets-tab${tab === 'settled' ? ' mab-mybets-tab--active' : ''}`}
          onClick={() => setTab('settled')}
        >
          {t('mybets.settledTab')}
        </button>
      </div>
      <div className="mab-mybets-body">
        <MyBetsList tab={tab} />
      </div>
    </div>
  );
}

function useTabState() {
  return useState<'open' | 'settled'>('open');
}
