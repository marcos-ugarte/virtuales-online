/**
 * POS Logger Service
 *
 * Sends structured client-side events to the backend API which forwards them
 * to Elasticsearch. Focuses on events the backend can't observe directly
 * (print failures, connectivity blips, JS exceptions, scan-no-action, etc.).
 *
 * Ticket lifecycle (create/pay/cancel) is intentionally NOT logged here —
 * the .NET backend AuditLog already captures those with user/IP/path.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogPayload {
  [key: string]: unknown
}

interface POSLogEntry {
  level: LogLevel
  event: string
  message?: string
  ts: string
  sessionId?: string
  operatorId?: string
  appVersion?: string
  payload?: LogPayload
}

/**
 * Canonical event names — MUST match the AllowedEvents whitelist in
 * PosLogsController.cs. Unknown names still index but get flagged
 * isKnownEvent=false in ES.
 */
export const LogEvents = {
  // Session
  LOGIN_SUCCESS: 'pos_login_success',
  LOGIN_FAILED: 'pos_login_failed',
  SESSION_STARTED: 'pos_session_started',
  SESSION_ENDED: 'pos_session_ended',

  // Print / transactional
  TICKET_PRINT_FAILED: 'ticket_print_failed',
  BALANCE_PRINTED: 'balance_printed',
  BALANCE_PRINT_FAILED: 'balance_print_failed',
  SCAN_NO_ACTION: 'scan_no_action',

  // Connectivity
  WS_DISCONNECTED: 'ws_disconnected',
  WS_RECONNECTED: 'ws_reconnected',
  API_TIMEOUT: 'api_timeout',

  // Client errors
  JS_EXCEPTION: 'js_exception',
  LOCAL_VALIDATION_FAILED: 'local_validation_failed',

  // SPA lifecycle
  APP_STARTED: 'app_started',
  APP_RELOADED: 'app_reloaded',

  // Diagnostic
  PRINTER_STATUS_SNAPSHOT: 'printer_status_snapshot',
} as const

export type LogEventName = typeof LogEvents[keyof typeof LogEvents]

const ENDPOINT = '/api/pos-logs/batch'
const BATCH_MAX = 25
const FLUSH_INTERVAL_MS = 2000
const MAX_QUEUE = 200
const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev'

class POSLogger {
  private deviceId = ''
  private operatorId = ''
  private sessionId = ''
  private apiBase = ''
  private batch: POSLogEntry[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  /** Initialize logger. apiBase example: https://api.virtuales.bet */
  init(deviceId: string, apiBase: string = '') {
    this.deviceId = deviceId
    this.apiBase = apiBase
  }

  setOperator(operatorId: string, sessionId?: string) {
    this.operatorId = operatorId
    if (sessionId) this.sessionId = sessionId
  }

  clearOperator() {
    this.operatorId = ''
    this.sessionId = ''
  }

  info(event: LogEventName | string, message?: string, payload?: LogPayload) {
    this.enqueue('info', event, message, payload)
  }

  warn(event: LogEventName | string, message?: string, payload?: LogPayload) {
    this.enqueue('warn', event, message, payload)
  }

  error(event: LogEventName | string, message?: string, payload?: LogPayload) {
    this.enqueue('error', event, message, payload)
  }

  debug(event: LogEventName | string, message?: string, payload?: LogPayload) {
    this.enqueue('debug', event, message, payload)
  }

  private enqueue(level: LogLevel, event: string, message?: string, payload?: LogPayload) {
    const entry: POSLogEntry = {
      level,
      event,
      message,
      ts: new Date().toISOString(),
      sessionId: this.sessionId || undefined,
      operatorId: this.operatorId || undefined,
      appVersion: APP_VERSION,
      payload,
    }

    // Mirror to console for local dev visibility
    const consoleFn = level === 'error' ? console.error
      : level === 'warn' ? console.warn
      : level === 'debug' ? console.debug
      : console.log
    consoleFn(`[POS] ${event}${message ? ': ' + message : ''}`, payload || '')

    if (this.batch.length >= MAX_QUEUE) {
      // Hard cap to avoid runaway memory on long network outages
      this.batch.shift()
    }
    this.batch.push(entry)

    if (this.batch.length >= BATCH_MAX) {
      this.flush()
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), FLUSH_INTERVAL_MS)
    }
  }

  private flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    if (this.batch.length === 0) return

    const logs = this.batch.splice(0)
    const url = `${this.apiBase}${ENDPOINT}`
    const body = JSON.stringify({
      deviceId: this.deviceId,
      sessionId: this.sessionId || undefined,
      operatorId: this.operatorId || undefined,
      appVersion: APP_VERSION,
      logs,
    })

    // Fire-and-forget; do NOT block POS flow on log delivery
    // NOTE: no custom 'X-Device-ID' header — it is not on the backend's CORS
    // allow-list, so adding it turns this into a preflighted cross-origin request
    // that the server rejects (noisy console errors). The deviceId is already in
    // the JSON body, so the header is redundant. Keeping only 'Content-Type'
    // (a CORS-safelisted value for application/json triggers no preflight beyond
    // what the endpoint already accepts).
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      keepalive: true,
    }).catch(() => {
      /* swallow — logging must never break the POS */
    })
  }

  /** Force-flush remaining batch (e.g. before unload). Best-effort. */
  flushNow() {
    try {
      this.flush()
    } catch {
      /* ignore */
    }
  }
}

export const posLogger = new POSLogger()

// Best-effort flush on page hide / unload so we don't lose the last batch
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => posLogger.flushNow())
  window.addEventListener('beforeunload', () => posLogger.flushNow())
}
