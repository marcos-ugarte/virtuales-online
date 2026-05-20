/**
 * RightPanel — tabbed right-column container.
 *
 *   ┌─ TICKET (N)   ACTIVAS (M)   HISTORIAL ─┐
 *   │                                         │
 *   │   <Betslip /> | <MyBetsList … />        │
 *   │                                         │
 *   └─────────────────────────────────────────┘
 *
 * Auto-switches to TICKET when the user adds a new selection from a card.
 */

import { useEffect, useRef, useState } from 'react';
import { Betslip } from './Betslip';
import { MyBetsList } from './MyBetsList';
import { useBetslip } from '../state/betslip';
import { useMyBets } from '../state/myBets';
import { useLang } from '../i18n';

type Tab = 'ticket' | 'open' | 'settled';

export function RightPanel() {
  const { t } = useLang();
  const { selections } = useBetslip();
  const { activeCount } = useMyBets();
  const [tab, setTab] = useState<Tab>('ticket');

  // Auto-switch to TICKET when the slip grows (user clicked an odd).
  const prevSelCountRef = useRef(selections.length);
  useEffect(() => {
    if (selections.length > prevSelCountRef.current) {
      setTab('ticket');
    }
    prevSelCountRef.current = selections.length;
  }, [selections.length]);

  return (
    <section className="rp" aria-label={t('rp.aria')}>
      <div className="rp-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'ticket'}
          className={`rp-tab${tab === 'ticket' ? ' rp-tab--active' : ''}`}
          onClick={() => setTab('ticket')}
        >
          <span>{t('rp.tabTicket')}</span>
          {selections.length > 0 && (
            <span className="rp-tab-count">{selections.length}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'open'}
          className={`rp-tab${tab === 'open' ? ' rp-tab--active' : ''}`}
          onClick={() => setTab('open')}
        >
          <span>{t('mybets.openTab')}</span>
          {activeCount > 0 && (
            <span className="rp-tab-count">{activeCount}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'settled'}
          className={`rp-tab${tab === 'settled' ? ' rp-tab--active' : ''}`}
          onClick={() => setTab('settled')}
        >
          <span>{t('mybets.settledTab')}</span>
        </button>
      </div>

      <div className="rp-body">
        {tab === 'ticket' && <Betslip />}
        {tab === 'open' && <MyBetsList tab="open" />}
        {tab === 'settled' && <MyBetsList tab="settled" />}
      </div>
    </section>
  );
}
