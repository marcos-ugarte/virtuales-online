/**
 * MobileBetslip — responsive (≤1280px) access to the betslip / tickets panel.
 *
 * On desktop the RightPanel lives as a sticky sidebar column. That column does
 * not work on narrow viewports (it floated over / clipped content), so below
 * 1280px we hide the inline panel (CSS) and instead show a floating action
 * button with the live selection count. Tapping it slides the SAME RightPanel
 * in from the right as a drawer over a dark backdrop — no overlap, and the
 * tickets/history tabs come along for free.
 *
 * Visibility is CSS-driven (`.bsd-fab` is shown only ≤1280px), so this renders
 * harmlessly on desktop without affecting the sidebar.
 */
import { useEffect, useState } from 'react';
import { RightPanel } from './RightPanel';
import { useBetslip } from '../state/betslip';
import { useLang } from '../i18n';

export function MobileBetslip() {
  const { t } = useLang();
  const { selections } = useBetslip();
  const [open, setOpen] = useState(false);

  // Close on Escape; lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="bsd-fab"
        onClick={() => setOpen(true)}
        aria-label={t('rp.tabTicket')}
      >
        <span className="bsd-fab-icon" aria-hidden="true">🧾</span>
        <span className="bsd-fab-label">{t('rp.tabTicket')}</span>
        {selections.length > 0 && (
          <span className="bsd-fab-count">{selections.length}</span>
        )}
      </button>

      {open && (
        <div
          className="bsd-backdrop"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="bsd-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('rp.aria')}
          >
            <button
              type="button"
              className="bsd-close"
              onClick={() => setOpen(false)}
              aria-label={t('rp.close')}
            >
              ✕
            </button>
            <RightPanel />
          </div>
        </div>
      )}
    </>
  );
}
