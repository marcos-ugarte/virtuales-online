/**
 * apiClient — thin fetch wrapper that handles:
 *   - Bearer token injection
 *   - 401 → refresh-and-retry-once (with concurrent-call deduplication)
 *   - {error, message, details} envelope translation into ApiError
 *   - Idempotency-Key header on POSTs that need it
 *
 * Lifecycle: AuthProvider calls `apiClient.configure(...)` on mount with
 * getters that always return the current access token + the refresh + the
 * "kick to login" callback. apiClient holds no auth state itself — it just
 * calls the configured functions.
 */

const BASE_URL =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? '/v1/web';

interface ApiClientConfig {
  /** Returns the current access token, or null if logged out. */
  getAccessToken: () => string | null;
  /** Attempts to refresh the session. Returns the new access token on
   *  success, null on failure. MUST persist the rotated refresh token
   *  internally before returning. */
  refresh: () => Promise<string | null>;
  /** Called when refresh fails irrecoverably (token replay, etc.). The
   *  AuthProvider should drop to anonymous + clear localStorage. */
  onForceLogout: () => void;
}

export interface BackendErrorBody {
  error?: string;
  message?: string;
  details?: unknown;
}

/** Strongly-typed HTTP failure surface. Components map `.code` to i18n. */
export class ApiError extends Error {
  constructor(
    public code: string,
    public httpStatus: number,
    message?: string,
    public details?: unknown,
  ) {
    super(message ?? code);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  body?: unknown;
  /** Optional UUID v4 to send as `Idempotency-Key`. Required on POST /tickets. */
  idempotencyKey?: string;
}

class ApiClient {
  private baseUrl = BASE_URL;
  private cfg: ApiClientConfig = {
    getAccessToken: () => null,
    refresh: async () => null,
    onForceLogout: () => {},
  };
  /** In-flight refresh promise (dedup so concurrent 401s share one refresh). */
  private refreshInflight: Promise<string | null> | null = null;

  configure(cfg: ApiClientConfig): void {
    this.cfg = cfg;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
    return this.request<T>('POST', path, { body, idempotencyKey });
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    opts: RequestOptions = {},
  ): Promise<T> {
    const url = this.baseUrl + path;

    const buildHeaders = (token: string | null): HeadersInit => {
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) h['Authorization'] = `Bearer ${token}`;
      if (opts.idempotencyKey) h['Idempotency-Key'] = opts.idempotencyKey;
      return h;
    };

    const doFetch = async (token: string | null): Promise<Response> => {
      return fetch(url, {
        method,
        headers: buildHeaders(token),
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    };

    let token = this.cfg.getAccessToken();
    let resp: Response;
    try {
      resp = await doFetch(token);
    } catch {
      throw new ApiError('network', 0);
    }

    // 401 → try refresh once, then retry.
    if (resp.status === 401) {
      const fresh = await this.refreshOnce();
      if (!fresh) {
        this.cfg.onForceLogout();
        throw new ApiError('unauthorized', 401);
      }
      try {
        resp = await doFetch(fresh);
      } catch {
        throw new ApiError('network', 0);
      }
      if (resp.status === 401) {
        // Even the refreshed token is unauthorized → force logout.
        this.cfg.onForceLogout();
        throw new ApiError('unauthorized', 401);
      }
    }

    if (resp.ok) {
      if (resp.status === 204) return undefined as T;
      return resp.json() as Promise<T>;
    }

    const errBody = (await resp.json().catch(() => ({}))) as BackendErrorBody;
    throw new ApiError(
      errBody.error ?? 'unknown',
      resp.status,
      errBody.message,
      errBody.details,
    );
  }

  /**
   * Dedup wrapper around the configured refresh. If multiple callers hit a
   * 401 simultaneously, they all share the same in-flight refresh promise —
   * critical to avoid replay-detection from the backend (rotate-on-use:
   * the second concurrent refresh would present an already-rotated token
   * and kill the entire token family).
   */
  private refreshOnce(): Promise<string | null> {
    if (this.refreshInflight) return this.refreshInflight;
    this.refreshInflight = this.cfg
      .refresh()
      .catch(() => null)
      .finally(() => {
        this.refreshInflight = null;
      });
    return this.refreshInflight;
  }
}

export const apiClient = new ApiClient();
