/**
 * WalletProvider — keeps the player's wallet in sync with the backend.
 *
 * Lifecycle:
 *   - Subscribes to auth status. When `authenticated` → first fetch.
 *     When `anonymous` → clear.
 *   - Exposes `refresh()` so callers (e.g. Betslip after a successful POST)
 *     can pull the latest balance on demand.
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
  useState,
  type ReactNode,
} from 'react';
import { fetchWallet } from '../services/wallet';
import type { Wallet } from '../services/money';
import { useAuth } from './auth';

type WalletStatus = 'idle' | 'loading' | 'ready' | 'error';

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

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      const w = await fetchWallet();
      setWallet(w);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  // Drive wallet state off auth state.
  useEffect(() => {
    if (authStatus === 'authenticated') {
      void refresh();
    } else if (authStatus === 'anonymous') {
      setWallet(null);
      setStatus('idle');
    }
  }, [authStatus, refresh]);

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
