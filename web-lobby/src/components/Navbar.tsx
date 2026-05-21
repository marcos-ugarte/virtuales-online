/**
 * Navbar — top header.
 *
 * Desktop (>720px): single row with Lang toggle, user info, balance,
 * logout. No jackpot or mybets buttons here (they live in lobby-rail
 * and RightPanel respectively).
 *
 * Mobile (<=720px): single row with logo + jackpot chip + balance +
 * MIS APUESTAS button + hamburger. The hamburger expands a panel
 * below the bar with Lang/Currency/Player/Logout — the desktop-only
 * items that no longer fit.
 */
import { useEffect, useState } from 'react';
import { useLang } from '../i18n';
import { LangToggle } from './LangToggle';
import { CurrencyToggle } from './CurrencyToggle';
import { useAuth } from '../state/auth';
import { useWallet } from '../state/wallet';
import { useMyBets } from '../state/myBets';
import { useRaceFeedSnapshot } from '../state/raceFeedSnapshot';
import { useMobileActionBar } from './MobileActionBar';

function formatJackpotChip(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value.toFixed(0)}`;
}

export function Navbar() {
  const { t, formatMoney, currency, setCurrency } = useLang();
  const { user, logout } = useAuth();
  const { wallet, status: walletStatus } = useWallet();
  const { activeCount } = useMyBets();
  const snapshot = useRaceFeedSnapshot();
  const { openMyBets } = useMobileActionBar();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (wallet && wallet.currency !== currency) {
      setCurrency(wallet.currency as typeof currency);
    }
  }, [wallet, currency, setCurrency]);

  const available = wallet?.available ?? user?.balance ?? 0;
  const balance = formatMoney(available);
  const balanceLoading = walletStatus === 'loading' && !wallet;
  const displayName = user?.displayName ?? user?.username ?? '—';
  const jackpotValue = snapshot?.jackpotValue ?? 0;
  const jackpotChip = formatJackpotChip(jackpotValue);

  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark bg-dark"
      role="navigation"
      aria-label="Main navigation"
    >
      <a className="navbar-brand" href="./">
        <img src="/assets/virtualrace_logo.png" alt="Virtual Race" height="28" />
      </a>

      {/* Mobile-only: jackpot chip — shown next to brand on small screens. */}
      <span
        className="navbar-jackpot-chip"
        title={`${t('monitor.jackpot')}: ${jackpotChip}`}
        aria-label={`${t('monitor.jackpot')} ${jackpotChip}`}
      >
        <span className="navbar-jackpot-chip-label">🏆</span>
        <span className="navbar-jackpot-chip-value">{jackpotChip}</span>
      </span>

      <div className="collapse navbar-collapse" id="main-menu">
        <ul className="navbar-nav mr-auto" role="list"></ul>

        <div className="navbar-user">
          <LangToggle />
          <span className="fa fa-user" aria-hidden="true"></span>
          <span className="user-name">{displayName}</span>
          <span
            className={`user-balance${balanceLoading ? ' user-balance--loading' : ''}`}
            title={t('nav.balance')}
            aria-label={`${t('nav.balance')}: ${balance} ${currency}`}
          >
            {balance}
          </span>
          <button
            className="btn btn-outline-light btn-sm"
            type="button"
            aria-label={t('nav.signout')}
            onClick={() => { void logout(); }}
          >
            {t('nav.signout')}&nbsp;<span className="fa fa-sign-out" aria-hidden="true"></span>
          </button>
        </div>
      </div>

      {/* Mobile-only right cluster: balance + MIS APUESTAS + hamburger. */}
      <div className="navbar-mobile-cluster">
        <span
          className={`user-balance navbar-mobile-balance${balanceLoading ? ' user-balance--loading' : ''}`}
          aria-label={`${t('nav.balance')}: ${balance} ${currency}`}
        >
          {balance}
        </span>
        <button
          type="button"
          className="navbar-mybets-btn"
          aria-label={t('rp.mobile.openMyBets') || 'Mis apuestas'}
          onClick={() => openMyBets()}
        >
          🎫
          {activeCount > 0 && (
            <span className="navbar-mybets-badge" aria-hidden="true">
              {activeCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`navbar-hamburger${menuOpen ? ' navbar-hamburger--open' : ''}`}
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span aria-hidden="true">☰</span>
        </button>
      </div>

      {menuOpen && (
        <div className="navbar-mobile-menu" role="menu">
          <div className="navbar-mobile-menu-row">
            <span className="navbar-mobile-menu-label">{t('nav.user')}</span>
            <span className="navbar-mobile-menu-value">{displayName}</span>
          </div>
          <div className="navbar-mobile-menu-row">
            <span className="navbar-mobile-menu-label">{t('lang.label')}</span>
            <LangToggle />
          </div>
          <div className="navbar-mobile-menu-row">
            <span className="navbar-mobile-menu-label">{t('currency.label') || 'Moneda'}</span>
            <CurrencyToggle />
          </div>
          <button
            type="button"
            className="btn btn-outline-light btn-sm navbar-mobile-menu-logout"
            onClick={() => { setMenuOpen(false); void logout(); }}
          >
            {t('nav.signout')}
          </button>
        </div>
      )}
    </nav>
  );
}
