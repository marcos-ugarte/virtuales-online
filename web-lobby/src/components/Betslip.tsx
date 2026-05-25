/**
 * Betslip — order ticket panel.
 *
 * Per-tip stake model: each row owns its own stake. Click a row to select
 * it; the −/+ buttons in the footer (and the input) then edit ONLY that
 * tip's stake. The most-recently added tip is the implicit selection if
 * the user hasn't clicked one explicitly.
 *
 *   ORDENAR TICKET
 *   ─────────────────────────────────────────
 *   [logo]  CARRERA   ·     N Apuestas   Todos×
 *           NNNN
 *
 *   ▸ CUOTA X.XX   APUESTA X.XX   [shield 1st]    ×
 *     CUOTA X.XX   APUESTA X.XX   [shield…]       ×
 *   …
 *   ─────────────────────────────────────────
 *   APUESTA          [−] X.XX CCY [+]   ← edits selected
 *   APUESTA TOTAL                  X.XX CCY
 *   POSIBLE BENEFICIO              X.XX CCY
 *
 *      [        ORDENAR TICKET        ]
 */

import { useEffect, useRef, useState } from 'react';
import { useBetslip } from '../state/betslip';
import { useLang } from '../i18n';
import { useWallet } from '../state/wallet';
import { useMyBets } from '../state/myBets';
import { placeTicket, type TicketRejectReason } from '../services/tickets';
import { ApiError } from '../services/apiClient';
import type { GameKey } from '../types/websocket';

const GAME_LOGO: Record<GameKey, string> = {
  dog: '/assets/icons/games/dog_logo.svg',
  dog8: '/assets/icons/games/dog8_logo.svg',
  horsec: '/assets/icons/games/horc_logo.svg',
};

const SHIELD_DIR: Record<GameKey, string> = {
  dog: '/assets/dog-shields/dog-',
  dog8: '/assets/dog8-shields/dog8-',
  horsec: '/assets/horsec-shields/horsec-',
};

function deriveRaceNumber(id: string): string {
  const last = id.split('_').pop();
  return last && last.length >= 4 ? last.slice(-4) : '—';
}

export function Betslip() {
  const { t, formatMoney } = useLang();
  const {
    selections,
    removeSelection,
    clearAll,
    selectTip,
    effectiveSelectionId,
    effectiveStake,
    setEffectiveStake,
    bumpEffectiveStake,
    limits,
  } = useBetslip();
  const { wallet, refresh: refreshWallet } = useWallet();
  // The placement currency is ALWAYS the wallet currency, not the display
  // toggle in the Navbar. The toggle is a presentation preference; the
  // wallet is single-currency on the backend (USD for demo-player-01).
  // Sending the wrong currency triggers stake_below_min / insufficient_funds
  // because the player has no balance in the toggled currency.
  const currency = wallet?.currency ?? 'USD';
  const { refreshActive: refreshActiveBets } = useMyBets();
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stakeInput, setStakeInput] = useState<string>(effectiveStake.toFixed(2));

  // Keep the visible input in sync when buttons / external code change stake.
  // A focus ref prevents overwriting the user while they type.
  const stakeFocusedRef = useRef(false);
  useEffect(() => {
    if (!stakeFocusedRef.current) {
      setStakeInput(effectiveStake.toFixed(2));
    }
  }, [effectiveStake, effectiveSelectionId]);

  const totalStake = selections.reduce((acc, s) => acc + s.stake, 0);
  const totalPayout = selections.reduce((acc, s) => acc + s.stake * s.odds, 0);

  const uniqueRaceIds = new Set(selections.map((s) => s.raceId));
  const singleRace = uniqueRaceIds.size === 1 ? selections[0] : null;
  // Backend POST /tickets is single-race per call. Multi-race tickets are
  // disabled at the client (see PHASE_3_TICKETS_INTEGRATION.md §6 decision 1).
  const multiRace = uniqueRaceIds.size > 1;

  const handlePlace = async () => {
    if (selections.length === 0 || totalStake <= 0 || submitting) return;
    if (multiRace) {
      setErrorMsg(t('betslip.reject.multipleRaces'));
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const raceId = selections[0].raceId;
      const result = await placeTicket({
        raceId,
        currency,
        selections: selections.map((s) => ({
          betType: s.type,
          runnerPos: s.runnerPos,
          second: s.second,
          odds: s.odds,
          stake: s.stake,
        })),
      });
      if (result.status === 'accepted') {
        setConfirmation(t('betslip.placed'));
        clearAll();
        void refreshWallet();
        void refreshActiveBets();
        window.setTimeout(() => setConfirmation(null), 2500);
      } else {
        const code: TicketRejectReason = result.rejectReason ?? 'unknown';
        setErrorMsg(t(`betslip.reject.${code}`));
        // Even on rejection the server returns a wallet snapshot — keep
        // ours in sync (locked may have changed, etc.).
        void refreshWallet();
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'unauthorized') {
        // apiClient already triggered force-logout; the UI will swap to
        // the LoginScreen on the next render. No message needed.
        return;
      }
      const code = err instanceof ApiError ? err.code : 'network';
      const i18nKey =
        code && code !== 'unknown'
          ? `betslip.reject.${code}`
          : 'betslip.reject.network';
      const candidate = t(i18nKey);
      // If the code wasn't in our i18n table, fall back to generic network.
      setErrorMsg(candidate === i18nKey ? t('betslip.reject.network') : candidate);
    } finally {
      setSubmitting(false);
    }
  };

  const onStakeChange = (raw: string) => {
    setStakeInput(raw);
    const n = parseFloat(raw);
    if (Number.isFinite(n)) setEffectiveStake(n);
  };

  const onStakeBlur = () => {
    stakeFocusedRef.current = false;
    setStakeInput(effectiveStake.toFixed(2));
  };

  if (selections.length === 0) {
    return (
      <div className="betslip betslip--empty">
        <header className="bs-header">
          <h2 className="bs-title">{t('betslip.title')}</h2>
        </header>
        {confirmation ? (
          <div className="bs-confirmation">{confirmation}</div>
        ) : (
          <div className="bs-empty">
            <span className="bs-empty-arrow" aria-hidden="true">
              ←
            </span>
            <span>{t('betslip.empty')}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="betslip">
      <header className="bs-header">
        <h2 className="bs-title">{t('betslip.title')}</h2>
      </header>

      <div className="bs-race-header">
        {singleRace ? (
          <span
            className={`bs-race-logo bs-race-logo--${singleRace.gameType}`}
            aria-hidden="true"
          >
            <img src={GAME_LOGO[singleRace.gameType]} alt="" />
          </span>
        ) : (
          <span className="bs-race-logo bs-race-logo--multi" aria-hidden="true">
            ●
          </span>
        )}

        <div className="bs-race-meta">
          {singleRace ? (
            <>
              <span className="bs-race-kicker">{t('betslip.race')}</span>
              <span className="bs-race-number">
                {deriveRaceNumber(singleRace.raceId)}
              </span>
            </>
          ) : (
            <span className="bs-race-kicker">{t('betslip.multipleRaces')}</span>
          )}
        </div>

        <div className="bs-bets-count">
          <span className="bs-bets-n">{selections.length}</span>
          <span className="bs-bets-label">{t('betslip.bets')}</span>
        </div>

        <button
          type="button"
          className="bs-clear-all"
          onClick={clearAll}
          aria-label={t('betslip.clearAll')}
        >
          <span>{t('betslip.clearAll')}</span>
          <span className="bs-x" aria-hidden="true">
            ×
          </span>
        </button>
      </div>

      <ul className="bs-list">
        {selections.map((s) => {
          const isSelected = s.id === effectiveSelectionId;
          return (
            <li key={s.id} className={`bs-item${isSelected ? ' bs-item--selected' : ''}`}>
              <button
                type="button"
                className="bs-item-select"
                onClick={() => selectTip(s.id)}
                aria-pressed={isSelected}
                aria-label={`Select ${s.runnerName} @ ${s.odds.toFixed(2)}`}
              >
                <span className="bs-cell bs-cell--odds">
                  <span className="bs-cell-label">{t('betslip.odds')}</span>
                  <span className="bs-cell-value">{s.odds.toFixed(2)}</span>
                </span>
                <span className="bs-cell bs-cell--stake">
                  <span className="bs-cell-label">{t('betslip.stake')}</span>
                  <span className="bs-cell-value">{s.stake.toFixed(2)}</span>
                </span>
                <span className="bs-cell bs-cell--shields">
                  <span className="bs-item-shield">
                    <img
                      src={`${SHIELD_DIR[s.gameType]}${s.runnerPos}.svg`}
                      alt={`Runner ${s.runnerPos}`}
                    />
                    <span className="bs-shield-sup">1ˢᵗ</span>
                  </span>
                  {s.type === 'forecast' && s.second != null && (
                    <span className="bs-item-shield">
                      <img
                        src={`${SHIELD_DIR[s.gameType]}${s.second}.svg`}
                        alt={`Runner ${s.second}`}
                      />
                      <span className="bs-shield-sup">2ⁿᵈ</span>
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                className="bs-item-remove"
                onClick={() => removeSelection(s.id)}
                aria-label={t('betslip.remove')}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      <div className="bs-footer">
        <div className="bs-master-row">
          <span className="bs-master-label">{t('betslip.stake')}</span>
          <button
            type="button"
            className="bs-master-btn bs-master-btn--minus"
            onClick={() => bumpEffectiveStake(-limits.step)}
            aria-label="−"
            disabled={effectiveStake <= limits.min}
          >
            −
          </button>
          <input
            type="text"
            inputMode="decimal"
            className="bs-master-input"
            value={stakeInput}
            onFocus={() => {
              stakeFocusedRef.current = true;
            }}
            onChange={(e) => onStakeChange(e.target.value)}
            onBlur={onStakeBlur}
            aria-label={t('betslip.stake')}
          />
          <span className="bs-master-currency">{currency}</span>
          <button
            type="button"
            className="bs-master-btn bs-master-btn--plus"
            onClick={() => bumpEffectiveStake(limits.step)}
            aria-label="+"
            disabled={effectiveStake >= limits.max}
          >
            +
          </button>
        </div>

        <div className="bs-totals-row">
          <span className="bs-totals-label">{t('betslip.totalStake')}</span>
          <span className="bs-totals-value">{formatMoney(totalStake)}</span>
        </div>
        <div className="bs-totals-row bs-totals-row--win">
          <span className="bs-totals-label">{t('betslip.totalPayout')}</span>
          <span className="bs-totals-value">{formatMoney(totalPayout)}</span>
        </div>
      </div>

      {errorMsg && (
        <div className="bs-error" role="alert">
          {errorMsg}
        </div>
      )}
      {confirmation && !errorMsg && (
        <div className="bs-confirmation">{confirmation}</div>
      )}

      <button
        type="button"
        className="bs-submit"
        onClick={() => {
          void handlePlace();
        }}
        disabled={totalStake <= 0 || submitting || multiRace}
      >
        {submitting ? t('betslip.placing') : t('betslip.place')}
      </button>
    </div>
  );
}
