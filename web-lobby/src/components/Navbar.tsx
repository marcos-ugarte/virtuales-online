/**
 * Navbar — port of the custom-lobby nav bar with a language toggle.
 * Pure presentational component with mock user data.
 */
import { useEffect } from 'react';
import { useLang } from '../i18n';
import { LangToggle } from './LangToggle';
import { useAuth } from '../state/auth';
import { useWallet } from '../state/wallet';

export function Navbar() {
  const { t, formatMoney, currency, setCurrency } = useLang();
  const { user, logout } = useAuth();
  const { wallet, status: walletStatus } = useWallet();

  // Force the display currency to match the wallet currency. The toggle
  // was removed because the player wallet is single-currency on the
  // backend — pretending the balance is in a different currency just by
  // changing the symbol misleads the user.
  useEffect(() => {
    if (wallet && wallet.currency !== currency) {
      setCurrency(wallet.currency as typeof currency);
    }
  }, [wallet, currency, setCurrency]);
  // Prefer the live wallet snapshot; fall back to the login snapshot
  // (user.balance) during the brief window before WalletProvider fetches.
  const available =
    wallet?.available ?? user?.balance ?? 0;
  const balance = formatMoney(available);
  const balanceLoading = walletStatus === 'loading' && !wallet;
  const displayName = user?.displayName ?? user?.username ?? '—';
  return (
    <nav
      className="navbar navbar-dark bg-dark"
      role="navigation"
      aria-label="Main navigation"
    >
      <a className="navbar-brand" href="./">
        <img src="/assets/virtualrace_logo.png" alt="Virtual Race" height="28" />
      </a>

      {/* User info + balance — ALWAYS visible (not behind a collapse), so it
          shows on mobile too. Compacted via CSS on narrow screens. */}
      <div className="navbar-user">
        <LangToggle />
        <span className="navbar-user-id">
          <span className="fa fa-user" aria-hidden="true"></span>
          <span className="user-name">{displayName}</span>
        </span>
        <span
          className={`user-balance${balanceLoading ? ' user-balance--loading' : ''}`}
          title={t('nav.balance')}
          aria-label={`${t('nav.balance')}: ${balance} ${currency}`}
        >
          {balance}
        </span>
        <button
          className="btn btn-outline-light btn-sm navbar-signout"
          type="button"
          aria-label={t('nav.signout')}
          onClick={() => { void logout(); }}
        >
          <span className="navbar-signout-text">{t('nav.signout')}&nbsp;</span>
          <span className="fa fa-sign-out" aria-hidden="true"></span>
        </button>
      </div>
    </nav>
  );
}
