/**
 * WalletProvider — keeps the player's wallet in sync with the backend.
 *
 * Lifecycle:
 *   - Subscribes to auth status. When `authenticated` → first fetch.
 *     When `anonymous` → clear.
 *   - Exposes `refresh()` so callers (e.g. Betslip after a successful POST)
 *     can pull the latest balance on demand.
 *   - Near-real-time cross-session sync (the balance lives server-side and the
 *     vendor race WebSocket is a public feed, so it can't push per-player
 *     balance): while authenticated we POLL the wallet every POLL_MS and also
 *     re-fetch whenever the tab/app regains focus. So if the SAME player spends
 *     from another device, this session converges within a few seconds. (True
 *     instant push would need an authenticated wallet channel on the backend.)
 *
 * The wallet shape is the parsed snake-of-numbers version of the backend's
 * string-money WalletDTO.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchWallet } from '../services/wallet';
import type { Wallet } from '../services/money';
import { useAuth } from './auth';

type WalletStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Background poll cadence for cross-session balance sync. */
const POLL_MS = 15000;

interface WalletCtx {
  wallet: Wallet | null;
  status: WalletStatus;
  /** Force a re-fetch from the backend. Resolves once state is updated. */
  refresh: () => Promise<void>;
}

const Ctx = createContext<WalletCtx | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { status: authStatus } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [status, setStatus] = useState<WalletStatus>('idle');
  const inFlightRef = useRef(false);

  // `silent` background fetches (polling / refocus) don't flip the status to
  // 'loading', so the navbar balance never flickers between updates.
  const doFetch = useCallback(async (silent: boolean) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) setStatus('loading');
    try {
      const w = await fetchWallet();
      setWallet(w);
      setStatus('ready');
    } catch {
      if (!silent) setStatus('error');
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const refresh = useCallback(() => doFetch(false), [doFetch]);

  // Drive wallet state off auth state.
  useEffect(() => {
    if (authStatus === 'authenticated') {
      void refresh();
    } else if (authStatus === 'anonymous') {
      setWallet(null);
      setStatus('idle');
    }
  }, [authStatus, refresh]);

  // Near-real-time sync while authenticated: poll + refetch on refocus.
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const tick = () => {
      if (!document.hidden) void doFetch(true); // skip polling while hidden
    };
    const onFocus = () => {
      if (!document.hidden) void doFetch(true);
    };
    const id = window.setInterval(tick, POLL_MS);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [authStatus, doFetch]);

  const value = useMemo<WalletCtx>(
    () => ({ wallet, status, refresh }),
    [wallet, status, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useWallet must be used inside <WalletProvider>');
  return c;
}
