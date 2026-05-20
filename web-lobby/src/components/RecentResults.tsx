/**
 * RecentResults — compact list of the last finished races across all 3
 * game types. Sits below the LiveMonitor in the right rail.
 *
 * Each row: circular game-type logo · RACE #nnnn + ENDED hh:mm:ss · two
 * runner shields for 1st and 2nd. Click → full position table modal.
 */

import { useMemo, useState } from 'react';
import type { GameKey, Race } from '../types/websocket';
import { useLang } from '../i18n';

interface Props {
  results: Race[];
}

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

const GAME_LABEL_KEY: Record<GameKey, string> = {
  dog: 'results.chip.dog',
  dog8: 'results.chip.dog8',
  horsec: 'results.chip.horsec',
};

/** "2026-05-18 12:16:45" → "12:16:45" in local time. */
function fmtTimeSec(videoEndDt: string | undefined): string {
  if (!videoEndDt) return '—';
  const ms = Date.parse(videoEndDt.replace(' ', 'T') + 'Z');
  if (Number.isNaN(ms)) return '—';
  const d = new Date(ms);
  return (
    d.getHours().toString().padStart(2, '0') +
    ':' +
    d.getMinutes().toString().padStart(2, '0') +
    ':' +
    d.getSeconds().toString().padStart(2, '0')
  );
}

/** Last 4 digits of the round id → human race number. */
function deriveRaceNumber(id: string): string | undefined {
  const last = id.split('_').pop();
  if (!last || last.length < 4) return undefined;
  return last.slice(-4);
}

/**
 * From a race's `finish` map ({pos: {competitorIndex}}), pull the dorsal
 * for the requested finishing position (1-based). Returns null if missing.
 */
function dorsalAt(race: Race, pos: number): number | null {
  if (!race.finish) return null;
  const entry = race.finish[String(pos)];
  return entry ? entry.competitorIndex : null;
}

function nameAt(race: Race, dorsal: number): string {
  return race.competitors[String(dorsal)]?.name ?? `#${dorsal}`;
}

export function RecentResults({ results }: Props) {
  const { t } = useLang();
  const [openId, setOpenId] = useState<string | null>(null);

  const openRace = useMemo(
    () => (openId ? results.find((r) => r.id === openId) ?? null : null),
    [openId, results],
  );

  if (results.length === 0) {
    return (
      <section className="recent-results recent-results--empty" aria-label="Recent results">
        <header className="rr-header">
          <h2 className="rr-title">{t('results.title')}</h2>
        </header>
        <div className="rr-empty">{t('results.empty')}</div>
      </section>
    );
  }

  return (
    <section className="recent-results" aria-label="Recent results">
      <header className="rr-header">
        <h2 className="rr-title">{t('results.title')}</h2>
        <span className="rr-count">{results.length}</span>
      </header>

      <ul className="rr-list">
        {results.map((race) => {
          const number = deriveRaceNumber(race.id) ?? '—';
          const ended = fmtTimeSec(race.videoEndDt);
          const first = dorsalAt(race, 1);
          const second = dorsalAt(race, 2);
          const ariaParts = [
            t(GAME_LABEL_KEY[race.eventType]),
            `#${number}`,
            first !== null ? `1st ${nameAt(race, first)}` : null,
            second !== null ? `2nd ${nameAt(race, second)}` : null,
          ].filter(Boolean);

          return (
            <li key={race.id}>
              <button
                type="button"
                className="rr-row"
                onClick={() => setOpenId(race.id)}
                aria-label={ariaParts.join(' — ')}
              >
                <span
                  className={`rr-logo rr-logo--${race.eventType}`}
                  aria-hidden="true"
                >
                  <img src={GAME_LOGO[race.eventType]} alt="" />
                </span>

                <span className="rr-meta">
                  <span className="rr-meta-kicker">
                    {t('results.kicker')}
                    {race.bonus && race.bonus > 1 ? (
                      <BonusChip bonus={race.bonus} />
                    ) : null}
                  </span>
                  <span className="rr-meta-number">{number}</span>
                  <span className="rr-meta-ended">
                    {t('results.ended')} {ended}
                  </span>
                </span>

                <span className="rr-shields">
                  <ShieldSlot
                    gameType={race.eventType}
                    dorsal={first}
                    place={1}
                  />
                  <ShieldSlot
                    gameType={race.eventType}
                    dorsal={second}
                    place={2}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {openRace && (
        <RaceDetailModal race={openRace} onClose={() => setOpenId(null)} />
      )}
    </section>
  );
}

/** Small "×2" / "×3" chip rendered on rows / in the modal header when the
 *  race carried a multiplier. Hidden when bonus is undefined or 1. */
function BonusChip({ bonus }: { bonus: number }) {
  return (
    <span
      className={`rr-bonus rr-bonus--x${bonus}`}
      title={`x${bonus} bonus`}
      aria-label={`x${bonus} bonus`}
    >
      ×{bonus}
    </span>
  );
}

function ShieldSlot({
  gameType,
  dorsal,
  place,
}: {
  gameType: GameKey;
  dorsal: number | null;
  place: 1 | 2;
}) {
  if (dorsal === null) {
    return (
      <span className="rr-shield rr-shield--empty">
        <span className="rr-shield-sup">{place === 1 ? '1ˢᵗ' : '2ⁿᵈ'}</span>
      </span>
    );
  }
  return (
    <span className="rr-shield">
      <img
        src={`${SHIELD_DIR[gameType]}${dorsal}.svg`}
        alt={`Runner ${dorsal}`}
      />
      <span className="rr-shield-sup">{place === 1 ? '1ˢᵗ' : '2ⁿᵈ'}</span>
    </span>
  );
}

/**
 * RaceDetailModal — full position table for one finished race.
 */
function RaceDetailModal({ race, onClose }: { race: Race; onClose: () => void }) {
  const { t } = useLang();
  const rows = useMemo(() => {
    if (!race.finish) return [];
    return Object.keys(race.finish)
      .map(Number)
      .sort((a, b) => a - b)
      .map((pos) => {
        const entry = race.finish![String(pos)];
        const dorsal = entry.competitorIndex;
        const comp = race.competitors[String(dorsal)];
        const winOdds = race.odds[dorsal - 1] ?? 0;
        return {
          pos,
          dorsal,
          name: comp?.name ?? `#${dorsal}`,
          winOdds,
          finishTime: entry.time,
        };
      });
  }, [race]);

  const showFinishTime = rows.some((r) => r.finishTime !== undefined);
  const endTime = fmtTimeSec(race.videoEndDt);
  const number = deriveRaceNumber(race.id) ?? '—';

  return (
    <div
      className="rr-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Race ${race.id}`}
      onClick={onClose}
    >
      <div className="rr-modal" onClick={(e) => e.stopPropagation()}>
        <header className="rr-modal-header">
          <div className="rr-modal-header-left">
            <span className={`rr-logo rr-logo--${race.eventType}`}>
              <img src={GAME_LOGO[race.eventType]} alt="" />
            </span>
            <div className="rr-modal-titles">
              <span className="rr-modal-kicker">
                {t('results.kicker')} <strong>{number}</strong>
                {race.bonus && race.bonus > 1 ? (
                  <BonusChip bonus={race.bonus} />
                ) : null}
              </span>
              <span className="rr-modal-ended">
                {t('results.ended')} {endTime}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="rr-modal-close"
            onClick={onClose}
            aria-label={t('results.close')}
          >
            ×
          </button>
        </header>

        <table className="rr-modal-table">
          <thead>
            <tr>
              <th>{t('results.pos')}</th>
              <th>{t('results.runner')}</th>
              <th>{t('results.win')}</th>
              {showFinishTime && <th>{t('results.time')}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.pos} className={`rr-modal-row rr-modal-row--p${r.pos}`}>
                <td className="rr-modal-pos">{r.pos}</td>
                <td>
                  <img
                    className="rr-modal-shield"
                    src={`${SHIELD_DIR[race.eventType]}${r.dorsal}.svg`}
                    alt={`Runner ${r.dorsal}`}
                  />
                  <span className="rr-modal-name">{r.name}</span>
                </td>
                <td className="rr-modal-odds">{r.winOdds.toFixed(2)}</td>
                {showFinishTime && (
                  <td className="rr-modal-finishtime">
                    {r.finishTime !== undefined ? r.finishTime.toFixed(2) : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
