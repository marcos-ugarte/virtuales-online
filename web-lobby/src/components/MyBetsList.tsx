/**
 * MyBetsList — pure list view for the right-column "ACTIVAS" / "HISTORIAL"
 * tabs. Renders one TicketCard per item, handles loading / error / empty.
 *
 * No drawer chrome — the parent (RightPanel) owns the tab strip and frame.
 */

import { useEffect, useState } from 'react';
import { useLang } from '../i18n';
import { useMyBets } from '../state/myBets';
import { useRaceFeedSnapshot } from '../state/raceFeedSnapshot';
import { getTicket, type Ticket, type TicketStatus } from '../services/tickets';
import type { GameKey, Race } from '../types/websocket';

interface Props {
  tab: 'open' | 'settled';
}

const GAME_LOGO: Record<string, string> = {
  dog: '/assets/icons/games/dog_logo.svg',
  dog8: '/assets/icons/games/dog8_logo.svg',
  horsec: '/assets/icons/games/horc_logo.svg',
};

const SHIELD_DIR: Record<string, string> = {
  dog: '/assets/dog-shields/dog-',
  dog8: '/assets/dog8-shields/dog8-',
  horsec: '/assets/horsec-shields/horsec-',
};

const GAME_LABEL_KEY: Record<string, string> = {
  dog: 'results.chip.dog',
  dog8: 'results.chip.dog8',
  horsec: 'results.chip.horsec',
};

function deriveRaceNumber(raceId: string | null): string {
  if (!raceId) return '—';
  const last = raceId.split('_').pop();
  return last && last.length >= 4 ? last.slice(-4) : '—';
}

function parseUtc(ts: string | undefined | null): number | null {
  if (!ts) return null;
  // Backend sends RFC3339 with "Z" suffix already (e.g. "2026-05-18T12:34:56Z");
  // older flat "YYYY-MM-DD HH:MM:SS" also possible.
  const s = ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z';
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : ms;
}

function fmtTimeSec(ts: string | null | undefined): string {
  const ms = parseUtc(ts ?? undefined);
  if (ms === null) return '—';
  const d = new Date(ms);
  return (
    d.getHours().toString().padStart(2, '0') +
    ':' +
    d.getMinutes().toString().padStart(2, '0') +
    ':' +
    d.getSeconds().toString().padStart(2, '0')
  );
}

function fmtCountdown(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function MyBetsList({ tab }: Props) {
  const { t } = useLang();
  const {
    active,
    history,
    activeStatus,
    historyStatus,
    hasMoreHistory,
    refreshActive,
    refreshHistoryHead,
    loadMoreHistory,
  } = useMyBets();

  // Pull history the first time the user opens this tab.
  useEffect(() => {
    if (tab === 'settled' && historyStatus === 'idle') {
      void refreshHistoryHead();
    }
  }, [tab, historyStatus, refreshHistoryHead]);

  const showingActive = tab === 'open';
  const tickets = showingActive ? active : history;
  const listStatus = showingActive ? activeStatus : historyStatus;

  if (listStatus === 'loading' && tickets.length === 0) {
    return <div className="mb-empty">{t('mybets.loading')}</div>;
  }

  if (listStatus === 'error' && tickets.length === 0) {
    return (
      <div className="mb-error">
        <span>{t('mybets.error')}</span>
        <button
          type="button"
          className="mb-retry"
          onClick={() => {
            if (showingActive) void refreshActive();
            else void refreshHistoryHead();
          }}
        >
          {t('mybets.retry')}
        </button>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="mb-empty">
        {t(showingActive ? 'mybets.empty.open' : 'mybets.empty.settled')}
      </div>
    );
  }

  return (
    <>
      <ul className="mb-list">
        {tickets.map((tk) => (
          <li key={tk.ticketId}>
            <TicketCard ticket={tk} />
          </li>
        ))}
      </ul>

      {!showingActive && hasMoreHistory && listStatus !== 'error' && (
        <button
          type="button"
          className="mb-load-more"
          onClick={() => void loadMoreHistory()}
          disabled={historyStatus === 'loading'}
        >
          {historyStatus === 'loading'
            ? t('mybets.loading')
            : t('mybets.loadMore')}
        </button>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// TicketCard
// ---------------------------------------------------------------------------

function statusBadgeClass(s: TicketStatus): string {
  switch (s) {
    case 'won': return 'mb-status mb-status--won';
    case 'lost': return 'mb-status mb-status--lost';
    case 'void': return 'mb-status mb-status--void';
    case 'partially_settled': return 'mb-status mb-status--partial';
    default: return 'mb-status mb-status--open';
  }
}

function statusKey(s: TicketStatus): string | null {
  switch (s) {
    case 'won': return 'mybets.status.won';
    case 'lost': return 'mybets.status.lost';
    case 'void': return 'mybets.status.void';
    case 'partially_settled': return 'mybets.status.partially_settled';
    default: return null;
  }
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  const { t, formatMoney } = useLang();
  const isOpen = ticket.status === 'open';

  // The list response doesn't include selections (or raceId). Fetch the
  // full ticket lazily on mount so we can show the race chip + shields.
  // Cache the detail in component state — TicketCard mounts once per
  // ticket in the list so this is a single fetch per row.
  const enriched = useEnrichedTicket(ticket);

  // Enrich raceId with the latest race object from the WS feed (gives us
  // eventType, videoStartDt). When the race isn't in the feed any more
  // (older history), we still show race-number + status from the ticket.
  const raceFromFeed = useRaceFromFeed(enriched.primaryRaceId);
  const gameKey: GameKey = (raceFromFeed?.eventType as GameKey) ?? 'dog';
  const startMs = parseUtc(raceFromFeed?.videoStartDt);
  const countdownMs = useCountdownToMs(isOpen ? startMs : null);
  const sBadgeKey = statusKey(ticket.status);

  return (
    <article
      className={`mb-card${isOpen ? '' : ' mb-card--settled'}`}
      data-status={ticket.status}
    >
      <header className="mb-card-header">
        <span
          className={`bs-race-logo bs-race-logo--${gameKey}`}
          aria-hidden="true"
        >
          <img src={GAME_LOGO[gameKey] ?? GAME_LOGO.dog} alt="" />
        </span>
        <div className="mb-card-title">
          <span className="mb-card-kicker">
            {raceFromFeed
              ? t(GAME_LABEL_KEY[gameKey] ?? 'results.chip.dog')
              : t('betslip.race')}
          </span>
          <span className="mb-card-number">
            {t('betslip.race')} {deriveRaceNumber(enriched.primaryRaceId)}
          </span>
        </div>
        {isOpen ? (
          countdownMs !== null ? (
            <span className="mb-card-countdown" title={t('mybets.startsIn')}>
              {fmtCountdown(countdownMs)}
            </span>
          ) : (
            <span className={statusBadgeClass(ticket.status)}>
              {t('mybets.status.partially_settled')}
            </span>
          )
        ) : (
          sBadgeKey && (
            <span className={statusBadgeClass(ticket.status)}>
              {t(sBadgeKey)}
            </span>
          )
        )}
      </header>

      {enriched.selections && enriched.selections.length > 0 && (
        <ul className="mb-card-selections">
          {enriched.selections.map((sel, idx) => {
            const runner = sel.selection.runner;
            return (
              <li key={idx} className={`mb-sel mb-sel--${sel.result}`}>
                {runner !== undefined && (
                  <img
                    className="mb-sel-shield"
                    src={`${SHIELD_DIR[gameKey] ?? SHIELD_DIR.dog}${runner}.svg`}
                    alt=""
                  />
                )}
                <span className="mb-sel-label">
                  {t('betslip.win')} @ {sel.odds.toFixed(2)}
                </span>
                {!isOpen && (
                  <span className={`mb-sel-result mb-sel-result--${sel.result}`}>
                    {sel.result === 'won' ? '✓' : sel.result === 'lost' ? '✗' : '—'}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mb-card-footer">
        <span className="mb-card-cell">
          <span className="mb-card-cell-label">{t('mybets.stake')}</span>
          <span className="mb-card-cell-value">{formatMoney(ticket.totalStake)}</span>
        </span>
        {isOpen ? (
          <span className="mb-card-cell mb-card-cell--accent">
            <span className="mb-card-cell-label">
              {t('mybets.potentialPayout')}
            </span>
            <span className="mb-card-cell-value">
              {formatMoney(ticket.potentialPayout)}
            </span>
          </span>
        ) : (
          <span className="mb-card-cell mb-card-cell--accent">
            <span className="mb-card-cell-label">{t('mybets.payout')}</span>
            <span className="mb-card-cell-value">
              {formatMoney(ticket.payout)}
            </span>
          </span>
        )}
      </footer>

      <div className="mb-card-meta">
        {isOpen
          ? `${t('mybets.placedAt')} ${fmtTimeSec(ticket.placedAt)}`
          : ticket.settledAt
            ? `${t('mybets.settledAt')} ${fmtTimeSec(ticket.settledAt)}`
            : `${t('mybets.placedAt')} ${fmtTimeSec(ticket.placedAt)}`}
      </div>
    </article>
  );
}

/** Look up a race by id from the most-recent WS feed snapshot (live races +
 *  recent results). Returns null when the race is no longer in the feed. */
/** If the ticket arrived without selections (list response), fetch the
 *  detail and return the merged ticket. Caches per ticketId so re-renders
 *  don't refetch. */
function useEnrichedTicket(initial: Ticket): Ticket {
  const [detail, setDetail] = useState<Ticket | null>(null);
  useEffect(() => {
    if (initial.selections !== null) return; // already complete
    let cancelled = false;
    void getTicket(initial.ticketId)
      .then((full) => {
        if (!cancelled) setDetail(full);
      })
      .catch(() => {
        /* leave selections null; card renders the skeleton fields */
      });
    return () => {
      cancelled = true;
    };
  }, [initial.ticketId, initial.selections]);
  return detail ?? initial;
}

function useRaceFromFeed(raceId: string | null): Race | null {
  const snapshot = useRaceFeedSnapshot();
  if (!raceId || !snapshot) return null;
  // Match by exact id.
  if (snapshot.allGames.dog?.id === raceId) return snapshot.allGames.dog;
  if (snapshot.allGames.dog8?.id === raceId) return snapshot.allGames.dog8;
  if (snapshot.allGames.horsec?.id === raceId) return snapshot.allGames.horsec;
  const fromRecent = snapshot.recentResults.find((r) => r.id === raceId);
  return fromRecent ?? null;
}

function useCountdownToMs(targetMs: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (targetMs === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);
  if (targetMs === null) return null;
  return targetMs - now;
}
