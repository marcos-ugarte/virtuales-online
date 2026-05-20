/**
 * Auth service — login / refresh / logout / me.
 *
 * Two implementations behind the same interface so the UI never has to
 * change as we move from demo to production:
 *
 *   - MockAuthService — local, no network. Accepts a single demo account.
 *     Used while no backend is reachable (e.g. local-only dev).
 *   - HttpAuthService — fetches the real `/v1/web/auth/*` per
 *     `docs/MANUAL_WEB_PLAYER.md`. Drop-in replacement.
 *
 * Switch via `VITE_AUTH_MODE=mock|http`. Default: mock.
 *
 * Important contract details from the real backend:
 *   - Refresh is **rotate-on-use**: the response carries a NEW refreshToken
 *     and the presented one is revoked atomically. The client MUST persist
 *     the new one immediately or the next refresh trips replay detection
 *     and the whole token family is killed.
 *   - Money is wire-stringy (`"1000.00"`). We parse on receive.
 *   - Errors come as `{error, message, details?}` with enumerated codes.
 */

import { parseWallet, type WalletDTO } from './money';
import type { Currency } from '../i18n';

export interface Player {
  id: string;
  username: string;
  displayName: string;
  currency: Currency;
  balance: number;
  locale: 'en' | 'es';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  player: Player;
}

export interface RefreshResponse {
  accessToken: string;
  /** New refresh token — backend rotates on every refresh. Persist it. */
  refreshToken: string;
}

/** Strongly-typed login/refresh failure so the UI can render specific i18n
 *  messages without parsing strings. Codes mirror MANUAL_WEB_PLAYER §3.1. */
export class AuthError extends Error {
  constructor(public code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
  }
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'account_locked'
  | 'account_suspended'
  | 'account_closed'
  | 'self_excluded'
  | 'invalid_refresh'
  | 'token_replay'
  | 'rate_limit'
  | 'network'
  | 'unknown';

export interface AuthService {
  login(username: string, password: string): Promise<AuthResponse>;
  refresh(refreshToken: string): Promise<RefreshResponse>;
  logout(refreshToken: string): Promise<void>;
  me(accessToken: string): Promise<Player>;
}

// ---------------------------------------------------------------------------
// Mock — local-only, used until we point at a real environment.
// ---------------------------------------------------------------------------
const DEMO_USER = 'demo-player-01';
const DEMO_PASS = 'demo-pass-01';
const MOCK_INITIAL_BALANCE = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function fakeToken(prefix: string): string {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}-${id}`;
}

export class MockAuthService implements AuthService {
  async login(username: string, password: string): Promise<AuthResponse> {
    await sleep(280);
    if (username !== DEMO_USER || password !== DEMO_PASS) {
      throw new AuthError('invalid_credentials');
    }
    const player: Player = {
      id: 'mock-' + fakeToken('p'),
      username,
      displayName: username,
      currency: 'USD',
      balance: MOCK_INITIAL_BALANCE,
      locale: 'es',
    };
    return {
      accessToken: fakeToken('mock-access'),
      refreshToken: fakeToken('mock-refresh'),
      player,
    };
  }

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    await sleep(120);
    if (!refreshToken.startsWith('mock-refresh-')) {
      throw new AuthError('invalid_refresh');
    }
    // Match the real backend: refresh is rotated on use.
    return {
      accessToken: fakeToken('mock-access'),
      refreshToken: fakeToken('mock-refresh'),
    };
  }

  async logout(_refreshToken: string): Promise<void> {
    await sleep(40);
  }

  async me(_accessToken: string): Promise<Player> {
    await sleep(40);
    return {
      id: 'mock-me',
      username: DEMO_USER,
      displayName: DEMO_USER,
      currency: 'USD',
      balance: MOCK_INITIAL_BALANCE,
      locale: 'es',
    };
  }
}

// ---------------------------------------------------------------------------
// HTTP — real backend per docs/MANUAL_WEB_PLAYER.md.
// ---------------------------------------------------------------------------

interface BackendError {
  error?: string;
  message?: string;
  details?: unknown;
}

interface LoginResponseDTO {
  accessToken: string;
  refreshToken: string;
  player: {
    id: string;
    username: string;
    currency: string;
    locale: string;
    balance: WalletDTO;
  };
}

function mapErrorCode(httpStatus: number, code: string | undefined): AuthErrorCode {
  if (httpStatus === 429) return 'rate_limit';
  switch (code) {
    case 'invalid_credentials':
      return 'invalid_credentials';
    case 'account_locked':
      return 'account_locked';
    case 'account_suspended':
      return 'account_suspended';
    case 'account_closed':
      return 'account_closed';
    case 'self_excluded':
      return 'self_excluded';
    case 'invalid_refresh':
      return 'invalid_refresh';
    case 'token_replay':
      return 'token_replay';
    default:
      return httpStatus === 401 ? 'invalid_credentials' : 'unknown';
  }
}

function normaliseCurrency(c: string): Currency {
  return c === 'DOP' ? 'DOP' : 'USD';
}

function normaliseLocale(l: string): 'en' | 'es' {
  return l === 'es' ? 'es' : 'en';
}

function playerFromDto(dto: LoginResponseDTO['player']): Player {
  const wallet = parseWallet(dto.balance);
  return {
    id: dto.id,
    username: dto.username,
    displayName: dto.username,
    currency: normaliseCurrency(dto.currency),
    // For the login snapshot we expose `available` as the "balance" the UI
    // shows — that's the spendable amount. The full wallet (locked, bonus)
    // will live in WalletProvider once we add it in the next phase.
    balance: wallet.available,
    locale: normaliseLocale(dto.locale),
  };
}

export class HttpAuthService implements AuthService {
  constructor(private baseUrl: string) {}

  private async request<T>(
    path: string,
    init: RequestInit & { authToken?: string } = {},
  ): Promise<T> {
    const { authToken, headers, ...rest } = init;
    let resp: Response;
    try {
      resp = await fetch(this.baseUrl + path, {
        ...rest,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(headers ?? {}),
        },
      });
    } catch {
      throw new AuthError('network');
    }
    if (resp.ok) {
      // 204 No Content path
      if (resp.status === 204) return undefined as T;
      return resp.json() as Promise<T>;
    }
    // Backend envelope: { error, message, details? }
    const body = (await resp.json().catch(() => ({}))) as BackendError;
    throw new AuthError(mapErrorCode(resp.status, body.error), body.message);
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const dto = await this.request<LoginResponseDTO>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return {
      accessToken: dto.accessToken,
      refreshToken: dto.refreshToken,
      player: playerFromDto(dto.player),
    };
  }

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    return this.request<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout(refreshToken: string): Promise<void> {
    // Logout endpoint is JWT-authed per the manual, but the refresh token
    // is the thing to revoke. We send what we have; if the access already
    // expired the server still removes the session row by refresh hash.
    await this.request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async me(accessToken: string): Promise<Player> {
    const dto = await this.request<LoginResponseDTO['player']>('/me', {
      method: 'GET',
      authToken: accessToken,
    });
    return playerFromDto(dto);
  }
}

// ---------------------------------------------------------------------------
// Singleton factory — picks the implementation from env at boot.
// ---------------------------------------------------------------------------
export function makeAuthService(): AuthService {
  const mode = (import.meta.env.VITE_AUTH_MODE as string | undefined) ?? 'mock';
  if (mode === 'http') {
    const base =
      (import.meta.env.VITE_API_BASE as string | undefined) ?? '/v1/web';
    return new HttpAuthService(base);
  }
  return new MockAuthService();
}
