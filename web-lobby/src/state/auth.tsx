/**
 * AuthProvider — single source of truth for "who is the player?".
 *
 * Status machine:
 *   loading      ← booting; trying to restore a previous session
 *   anonymous    ← no valid session; show LoginScreen
 *   authenticated← we have a player + access token; show the lobby
 *
 * Tokens:
 *   accessToken  → kept in a ref (no re-renders on rotation).
 *   refreshToken → localStorage. Rotated-on-use — every refresh response
 *                  contains a NEW refresh token that must be persisted
 *                  before the next use, or the backend kills the family.
 *
 * Wires `apiClient` on mount so the rest of the app can fetch with Bearer
 * + auto-refresh-on-401 without touching auth internals.
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
import { AuthError, makeAuthService, type Player } from '../services/auth';
import { apiClient } from '../services/apiClient';

type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

interface AuthCtx {
  status: AuthStatus;
  user: Player | null;
  /** Throws `AuthError` on failure so the LoginScreen can render a specific message. */
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Current access token, or null if not authenticated. */
  getAccessToken: () => string | null;
}

const Ctx = createContext<AuthCtx | null>(null);

const STORAGE_REFRESH = 'wp:refreshToken';
const STORAGE_PLAYER = 'wp:player';

export function AuthProvider({ children }: { children: ReactNode }) {
  const serviceRef = useRef(makeAuthService());
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<Player | null>(null);
  // accessToken is intentionally NOT in React state — re-renders shouldn't
  // happen on token rotation. A ref is enough for getters.
  const accessTokenRef = useRef<string | null>(null);

  // --- Auth primitives shared by boot, login, logout, and apiClient. -----

  /** Tear down the local session (no backend call). Idempotent. */
  const forceLogoutLocal = useCallback(() => {
    localStorage.removeItem(STORAGE_REFRESH);
    localStorage.removeItem(STORAGE_PLAYER);
    accessTokenRef.current = null;
    setUser(null);
    setStatus('anonymous');
  }, []);

  /** Try to mint a new access token using the stored refresh token.
   *  Persists the rotated refresh token before resolving so subsequent
   *  callers see the latest. Returns null on failure. */
  const refreshSession = useCallback(async (): Promise<string | null> => {
    const oldRefresh = localStorage.getItem(STORAGE_REFRESH);
    if (!oldRefresh) return null;
    try {
      const resp = await serviceRef.current.refresh(oldRefresh);
      localStorage.setItem(STORAGE_REFRESH, resp.refreshToken);
      accessTokenRef.current = resp.accessToken;
      return resp.accessToken;
    } catch {
      return null;
    }
  }, []);

  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  // --- Wire apiClient once on mount. -----
  useEffect(() => {
    apiClient.configure({
      getAccessToken,
      refresh: refreshSession,
      onForceLogout: forceLogoutLocal,
    });
  }, [getAccessToken, refreshSession, forceLogoutLocal]);

  // --- Boot: revive a saved session if any. -----
  // bootedRef guards against React 19 StrictMode's effect double-invoke in
  // dev (which would fire `refresh()` twice with the same token and trip
  // backend replay detection).
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    const playerJson = localStorage.getItem(STORAGE_PLAYER);
    if (!localStorage.getItem(STORAGE_REFRESH) || !playerJson) {
      setStatus('anonymous');
      return;
    }
    (async () => {
      const newAccess = await refreshSession();
      if (newAccess) {
        try {
          setUser(JSON.parse(playerJson) as Player);
          setStatus('authenticated');
        } catch {
          forceLogoutLocal();
        }
      } else {
        forceLogoutLocal();
      }
    })();
  }, [refreshSession, forceLogoutLocal]);

  // --- Multi-tab sync. -----
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_REFRESH && e.newValue === null) {
        accessTokenRef.current = null;
        setUser(null);
        setStatus('anonymous');
      } else if (e.key === STORAGE_PLAYER && e.newValue) {
        try {
          setUser(JSON.parse(e.newValue) as Player);
        } catch {
          /* malformed — ignore */
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // --- Public actions. -----

  const login = useCallback(async (username: string, password: string) => {
    const resp = await serviceRef.current.login(username, password);
    localStorage.setItem(STORAGE_REFRESH, resp.refreshToken);
    localStorage.setItem(STORAGE_PLAYER, JSON.stringify(resp.player));
    accessTokenRef.current = resp.accessToken;
    setUser(resp.player);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(STORAGE_REFRESH);
    if (refreshToken) {
      // Fire-and-forget; don't block the user on a slow logout API.
      serviceRef.current.logout(refreshToken).catch(() => {
        /* best-effort */
      });
    }
    forceLogoutLocal();
  }, [forceLogoutLocal]);

  const value = useMemo<AuthCtx>(
    () => ({ status, user, login, logout, getAccessToken }),
    [status, user, login, logout, getAccessToken],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>');
  return c;
}

export { AuthError };
