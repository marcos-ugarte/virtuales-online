/**
 * MyBetsProvider — caches the player's tickets (active + history) and keeps
 * them refreshed.
 *
 * Refresh strategy:
 *   - Login (auth → authenticated) → first refreshActive()
 *   - 30s polling while authenticated → refreshActive()
 *   - History is loaded on demand (drawer-open + paginated)
 *   - Callers (Betslip after placement, App on gameResult push) can call
 *     `refreshActive()` for an immediate pull.
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
import { listTickets, type Ticket } from '../services/tickets';
import { useAuth } from './auth';

const POLL_ACTIVE_MS = 30_000;
const PAGE_SIZE = 20;

type ListStatus = 'idle' | 'loading' | 'ready' | 'error';

interface MyBetsCtx {
  active: Ticket[];
  history: Ticket[];
  activeCount: number;
  activeStatus: ListStatus;
  historyStatus: ListStatus;
  hasMoreHistory: boolean;
  refreshActive: () => Promise<void>;
  refreshHistoryHead: () => Promise<void>;
  loadMoreHistory: () => Promise<void>;
}

const Ctx = createContext<MyBetsCtx | null>(null);

export function MyBetsProvider({ children }: { children: ReactNode }) {
  const { status: authStatus } = useAuth();
  const [active, setActive] = useState<Ticket[]>([]);
  const [history, setHistory] = useState<Ticket[]>([]);
  const [activeStatus, setActiveStatus] = useState<ListStatus>('idle');
  const [historyStatus, setHistoryStatus] = useState<ListStatus>('idle');
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);

  const refreshActive = useCallback(async () => {
    if (authStatus !== 'authenticated') return;
    setActiveStatus((prev) => (prev === 'ready' ? 'ready' : 'loading'));
    try {
      const page = await listTickets({ status: 'open', limit: PAGE_SIZE });
      setActive(page.items);
      setActiveStatus('ready');
    } catch {
      setActiveStatus('error');
    }
  }, [authStatus]);

  const refreshHistoryHead = useCallback(async () => {
    if (authStatus !== 'authenticated') return;
    setHistoryStatus('loading');
    try {
      const page = await listTickets({ status: 'settled', limit: PAGE_SIZE });
      setHistory(page.items);
      setHistoryCursor(page.nextCursor);
      setHasMoreHistory(Boolean(page.nextCursor));
      setHistoryStatus('ready');
    } catch {
      setHistoryStatus('error');
    }
  }, [authStatus]);

  const loadMoreHistory = useCallback(async () => {
    if (authStatus !== 'authenticated' || !historyCursor) return;
    setHistoryStatus('loading');
    try {
      const page = await listTickets({
        status: 'settled',
        limit: PAGE_SIZE,
        cursor: historyCursor,
      });
      setHistory((prev) => {
        // Dedupe by ticketId in case the cursor overlaps.
        const seen = new Set(prev.map((t) => t.ticketId));
        const fresh = page.items.filter((t) => !seen.has(t.ticketId));
        return [...prev, ...fresh];
      });
      setHistoryCursor(page.nextCursor);
      setHasMoreHistory(Boolean(page.nextCursor));
      setHistoryStatus('ready');
    } catch {
      setHistoryStatus('error');
    }
  }, [authStatus, historyCursor]);

  // Lifecycle — pull on login, clear on logout.
  useEffect(() => {
    if (authStatus === 'authenticated') {
      void refreshActive();
    } else if (authStatus === 'anonymous') {
      setActive([]);
      setHistory([]);
      setActiveStatus('idle');
      setHistoryStatus('idle');
      setHistoryCursor(null);
      setHasMoreHistory(false);
    }
  }, [authStatus, refreshActive]);

  // Background polling for ACTIVE only — history is on-demand.
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const id = window.setInterval(() => {
      void refreshActive();
    }, POLL_ACTIVE_MS);
    return () => window.clearInterval(id);
  }, [authStatus, refreshActive]);

  const value = useMemo<MyBetsCtx>(
    () => ({
      active,
      history,
      activeCount: active.length,
      activeStatus,
      historyStatus,
      hasMoreHistory,
      refreshActive,
      refreshHistoryHead,
      loadMoreHistory,
    }),
    [
      active,
      history,
      activeStatus,
      historyStatus,
      hasMoreHistory,
      refreshActive,
      refreshHistoryHead,
      loadMoreHistory,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMyBets(): MyBetsCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMyBets must be used inside <MyBetsProvider>');
  return c;
}
