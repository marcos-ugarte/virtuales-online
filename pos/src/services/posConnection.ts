/**
 * POS Connection Service — virtuales-go `/pos-go-ds` transport (Phase 1).
 *
 * This class previously spoke Microsoft SignalR to a .NET hub. It now speaks
 * the raw-WebSocket JSON protocol `/pos-go-ds` (see
 * docs/MANUAL_PROTOCOL_POS_GO_DS.md). The PUBLIC interface (method names,
 * return shapes, callback setters) is preserved 1:1 so usePOSConnection.ts,
 * the context, and the UI keep working unchanged.
 *
 * PHASE 1 SCOPE: discover → open WS → deviceLogin → init (operator login) →
 * main screen. Tickets / balance / payments / race-data feed are NOT wired yet;
 * those methods are safe no-op stubs that return well-formed error envelopes so
 * the UI never crashes (clearly marked PHASE-2 STUB below).
 */

import { PosGoDsClient, type PosGoDsMessage } from './posGoDsClient'
import type {
  DiscoveryResponse,
  DiscoveryError,
  DeviceLoginResult,
  InitResult,
  TimeResponse,
  SessionInfo,
  POSConnectionEvents,
  POSConnectionState,
  DeviceSettings,
  OperatorLimits,
  DeviceConnectionInfo,
  SendTicketResult,
  CancelTicketResult,
  PayTicketResult,
  GetTicketResult,
  BetIndexMap,
  ReserveTicketResult,
  ConfirmTicketResult,
  SendBalanceData,
  SendBalanceResult,
  ResumeTicket,
  DeviceInfo,
  OldBalanceEntry,
  OldTicketToPayout,
  GameTypeConfig
} from '@/types/websocket'
import { BetType, GAME_CONFIGS } from '@/types/websocket'

// ============================================================================
// Configuration
// ============================================================================

interface POSConnectionConfig {
  apiUrl: string
  events?: POSConnectionEvents
}

// ============================================================================
// Custom Errors  (unchanged — UI catches on .code)
// ============================================================================

export class POSDiscoveryError extends Error {
  code: 'DEVICE_NOT_FOUND' | 'DEVICE_INACTIVE' | 'OFFLINE' | 'NETWORK_ERROR'
  deviceId?: string

  constructor(
    code: 'DEVICE_NOT_FOUND' | 'DEVICE_INACTIVE' | 'OFFLINE' | 'NETWORK_ERROR',
    message?: string,
    deviceId?: string
  ) {
    super(message || code)
    this.name = 'POSDiscoveryError'
    this.code = code
    this.deviceId = deviceId
  }
}

export class POSDeviceLoginError extends Error {
  code: string
  details?: { ip?: string; browser?: string; connectedAt?: string; idleMinutes?: number }

  constructor(code: string, message?: string, details?: { ip?: string; browser?: string; connectedAt?: string; idleMinutes?: number }) {
    super(message || code)
    this.name = 'POSDeviceLoginError'
    this.code = code
    this.details = details
  }
}

export class POSLoginError extends Error {
  code: string

  constructor(code: string, message?: string) {
    super(message || code)
    this.name = 'POSLoginError'
    this.code = code
  }
}

// ============================================================================
// /pos-go-ds response shapes (only the fields we map in Phase 1)
// ============================================================================

interface PosGoSetting {
  currency?: string
  currency_symbol?: string
  decimal_places?: number
  language?: string
  timezone?: string
  locationName?: string
  max_bet_per_tip?: number
  coin_1?: number; coin_2?: number; coin_3?: number; coin_4?: number; coin_5?: number
  betoffers?: Array<{ id: number; eventtype: string; numberCompetitor: number }>
  [key: string]: unknown
}

// ============================================================================
// POS Connection Class
// ============================================================================

/**
 * Shape surfaced to race-broadcast subscribers. The vendor wire is passed
 * through verbatim (same as TV / web-ds): `gameRound` carries `gamepool[]`,
 * `gameResult` carries `gameresult{}`. Consumers (useRealRaceData) translate
 * these into their own internal structures.
 */
export type RaceBroadcast =
  | { kind: 'gameRound'; msg: PosGoDsMessage }
  | { kind: 'gameResult'; msg: PosGoDsMessage }

type RaceBroadcastHandler = (b: RaceBroadcast) => void

export class POSConnection {
  private client: PosGoDsClient | null = null
  private config: POSConnectionConfig

  // Multi-subscriber registry for race broadcasts (gameRound / gameResult)
  // arriving on the SINGLE authenticated /pos-go-ds socket. The race-data
  // layer subscribes here instead of opening a second WebSocket.
  private raceBroadcastHandlers = new Set<RaceBroadcastHandler>()
  // Last gameRound/gameResult seen, replayed to late subscribers so a hook
  // that mounts after the first broadcast still gets primed immediately.
  private lastGameRound: PosGoDsMessage | null = null
  // round code → odds[] (full matrix) from the gamepool feed. Used by
  // sendTicket to stamp each tip with server-fed odds (the /pos-go-ds backend
  // stores the tip odds and settlement pays `amount * odds * bonus`, so the
  // POS must supply the authoritative round odds, NOT a client-typed value).
  private roundOddsById: Map<string, number[]> = new Map()
  private deviceId: string = ''
  private wsUrl: string = ''
  private keepaliveInterval: ReturnType<typeof setInterval> | null = null
  private state: POSConnectionState = { state: 'disconnected' }

  // Cached data
  private deviceSettings: DeviceSettings | null = null
  private sessionInfo: SessionInfo | null = null
  private operatorLimits: OperatorLimits | null = null
  private lastResumeTickets: ResumeTicket[] = []
  private locationName: string = ''
  private locationId: string = ''
  private deviceName: string = ''
  private connectionInfo: DeviceConnectionInfo | null = null
  private simulatorUrl: string | null = null
  private discoveryGames: string[] = []
  private printerRequired: boolean = true
  private printerMode: string = 'vendor'
  private sessionTimeoutMinutes: number = 600

  // Auto re-login credentials (kept for parity; re-login = re-send init)
  private lastOperatorCode: string = ''
  private lastPin: string = ''

  // Ticket tracking (used by PHASE-2 stubs only)
  private msgIdCounter: number = 0

  constructor(config: POSConnectionConfig) {
    this.config = config

    // Detect network drop INSTANTLY via browser events — same UX as before.
    if (typeof window !== 'undefined') {
      window.addEventListener('offline', () => {
        console.warn('[POS] navigator.onLine=false — forcing reconnecting state')
        this.setState({ state: 'reconnecting' })
      })
      window.addEventListener('online', () => {
        console.info('[POS] navigator.onLine=true — network back')
      })
    }
  }

  // ==========================================================================
  // State Management (unchanged public surface)
  // ==========================================================================

  private setState(updates: Partial<POSConnectionState>) {
    this.state = { ...this.state, ...updates }
    this.config.events?.onStateChange?.(this.state)
  }

  getState(): POSConnectionState {
    return { ...this.state }
  }

  getDeviceId(): string {
    return this.deviceId
  }

  getLocationName(): string {
    return this.locationName
  }

  getSettings(): DeviceSettings | null {
    return this.deviceSettings
  }

  getSession(): SessionInfo | null {
    return this.sessionInfo
  }

  getLimits(): OperatorLimits | null {
    return this.operatorLimits
  }

  getResumeTickets(): ResumeTicket[] {
    return this.lastResumeTickets
  }

  getConnectionInfo(): DeviceConnectionInfo | null {
    return this.connectionInfo
  }

  // ==========================================================================
  // Race broadcast subscription (Phase 2)
  //
  // The /pos-go-ds backend broadcasts live race data (gameRound / gameResult,
  // vendor wire) on the SINGLE authenticated device socket. Consumers
  // subscribe here to receive those broadcasts instead of opening their own
  // WebSocket (which would trip "device already connected"). The most recent
  // gameRound is replayed to a new subscriber so it primes immediately.
  // ==========================================================================

  onRaceBroadcast(handler: RaceBroadcastHandler): () => void {
    this.raceBroadcastHandlers.add(handler)
    // Replay last gameRound so a late subscriber renders without waiting for
    // the next 4-minute broadcast.
    if (this.lastGameRound) {
      try { handler({ kind: 'gameRound', msg: this.lastGameRound }) } catch { /* ignore */ }
    }
    return () => { this.raceBroadcastHandlers.delete(handler) }
  }

  private emitRaceBroadcast(b: RaceBroadcast): void {
    for (const h of this.raceBroadcastHandlers) {
      try { h(b) } catch (err) { console.warn('[POSConnection] race broadcast handler error', err) }
    }
  }

  // ==========================================================================
  // Device ID Extraction (unchanged)
  // ==========================================================================

  extractDeviceIdFromHostname(): string {
    const hostname = window.location.hostname
    const urlParams = new URLSearchParams(window.location.search)

    const desktopDeviceId = (window as any).desktopApp?.config?.deviceId
    if (desktopDeviceId) return desktopDeviceId

    const queryDeviceId = urlParams.get('deviceId')
    if (queryDeviceId) {
      localStorage.setItem('dev_deviceId', queryDeviceId)
      return queryDeviceId
    }

    const isDevEnvironment = hostname === 'localhost'
      || hostname === '127.0.0.1'
      || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)

    if (isDevEnvironment) {
      const localStorageId = localStorage.getItem('dev_deviceId')
      if (localStorageId) return localStorageId
      const envDeviceId = import.meta.env.VITE_DEV_DEVICE_ID
      if (envDeviceId) return envDeviceId
      return 'dev-device-001'
    }

    const parts = hostname.split('.')
    if (parts.length >= 2) return parts[0]

    throw new Error(`Invalid hostname format: ${hostname}. Expected: {deviceId}.pos.domain.com or use ?deviceId=xxx`)
  }

  // ==========================================================================
  // Step 1: Discovery  (HTTP GET — same endpoint, slightly different payload)
  // ==========================================================================

  async discover(deviceId?: string): Promise<DiscoveryResponse> {
    this.deviceId = deviceId || this.extractDeviceIdFromHostname()
    this.setState({ state: 'connecting', deviceId: this.deviceId })

    const baseUrl = this.config.apiUrl || ''
    const url = `${baseUrl}/api/ws/discover?deviceId=${this.deviceId}&deviceType=pos`

    try {
      const response = await fetch(url)

      if (!response.ok) {
        // Older shape returned {error,message}. /pos-go-ds returns 200 with
        // deviceRegistered:false instead, so a non-200 here is a real HTTP error.
        let errorData: DiscoveryError | null = null
        try { errorData = await response.json() } catch { /* ignore */ }
        const code = (errorData?.error as DiscoveryError['error']) || 'DEVICE_NOT_FOUND'
        this.setState({ state: 'error', error: errorData?.message || code, errorCode: code })
        throw new POSDiscoveryError(code, errorData?.message, this.deviceId)
      }

      const data: any = await response.json()

      // /pos-go-ds discover signals "unknown device" with deviceRegistered:false
      if (data.deviceRegistered === false) {
        this.setState({ state: 'error', error: 'Dispositivo no registrado', errorCode: 'DEVICE_NOT_FOUND' })
        throw new POSDiscoveryError('DEVICE_NOT_FOUND', 'Dispositivo no registrado', this.deviceId)
      }

      // Normalize to the DiscoveryResponse shape the rest of the code expects.
      const normalized: DiscoveryResponse = {
        url: data.url,
        deviceType: data.deviceType ?? 'pos',
        serverTime: data.serverTime,
        msgType: data.msgType ?? 'WebSocketResponse',
        deviceRegistered: data.deviceRegistered ?? true,
        deviceName: data.deviceName ?? '',
        locationId: String(data.locationId ?? ''),
        locationName: data.locationName ?? '',
        simulatorUrl: data.simulatorUrl,
        printerRequired: data.printerRequired,
        printerMode: data.printerMode,
        sessionTimeoutMinutes: data.sessionTimeoutMinutes,
      }
      ;(normalized as any).games = data.games || []

      this.locationName = normalized.locationName
      this.locationId = normalized.locationId
      this.deviceName = normalized.deviceName
      return normalized
    } catch (error) {
      if (error instanceof POSDiscoveryError) throw error
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
      const code = isOffline ? 'OFFLINE' : 'NETWORK_ERROR'
      const msg = isOffline ? 'Sin conexión a internet' : 'No se pudo conectar al servidor'
      this.setState({ state: 'error', error: msg, errorCode: code })
      throw new POSDiscoveryError(code, msg, this.deviceId)
    }
  }

  /**
   * Resolve the WebSocket URL to connect to.
   *
   * Priority:
   *  1. VITE_WS_URL env override (explicit, wins always).
   *  2. Empty apiUrl (prod same-origin) → derive ws(s):// from page location.
   *  3. discover.url, with a dev fallback: when the page is served over plain
   *     HTTP, a `wss://host/pos-go-ds` advertised url is unusable from the
   *     browser in this deployment (TLS proxy doesn't expose the path → 404).
   *     The raw Go port (:4099) is the reachable endpoint, so rewrite
   *     `wss://host[/pos-go-ds]` → `ws://host:4099/pos-go-ds`.
   */
  private resolveWsUrl(discovery: DiscoveryResponse): string {
    const override = import.meta.env.VITE_WS_URL as string | undefined
    if (override) return override

    if (!this.config.apiUrl) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${proto}//${window.location.host}/pos-go-ds`
    }

    let url = discovery.url || ''
    const pageIsHttp = typeof window !== 'undefined' && window.location.protocol === 'http:'
    if (pageIsHttp && url.startsWith('wss://')) {
      try {
        const u = new URL(url)
        // Drop TLS + any TLS port, target the raw Go WS port 4099.
        url = `ws://${u.hostname}:4099/pos-go-ds`
        console.log('[POS] Rewrote wss discover url → reachable raw port:', url)
      } catch { /* keep original */ }
    }
    return url
  }

  // ==========================================================================
  // Step 2: WebSocket Connection
  // ==========================================================================

  async connect(deviceId?: string): Promise<void> {
    console.log('[POS] Starting connect (/pos-go-ds)...')
    const discovery = await this.discover(deviceId)
    console.log('[POS] Discovery complete:', discovery)

    if (discovery.simulatorUrl) this.simulatorUrl = discovery.simulatorUrl
    this.printerRequired = discovery.printerRequired ?? true
    this.printerMode = discovery.printerMode ?? 'vendor'
    this.sessionTimeoutMinutes = discovery.sessionTimeoutMinutes ?? 600
    this.discoveryGames = (discovery as any).games || []

    this.wsUrl = this.resolveWsUrl(discovery)
    console.log('[POS] Connecting to /pos-go-ds WebSocket:', this.wsUrl)

    this.client = new PosGoDsClient()

    // deviceLock broadcast → existing onDeviceLock callback (UI overlay).
    this.client.onBroadcast('deviceLock', (msg: PosGoDsMessage) => {
      const locked = Boolean(msg.locked)
      console.warn('[POSConnection] deviceLock broadcast:', msg)
      this.config.events?.onDeviceLock?.({
        locked,
        reason: (msg.reason as string) || undefined,
        lockedBy: (msg.lockedBy as string) || undefined,
      })
    })

    // gameRound / gameResult broadcasts → forward to existing single-callback
    // events AND fan out to the multi-subscriber race-broadcast registry
    // (Phase 2: race-data layer subscribes here, no 2nd socket).
    this.client.onBroadcast('gameRound', (msg) => {
      this.config.events?.onGameRoundOpened?.(msg)
      this.lastGameRound = msg
      this.cacheRoundOdds(msg)
      this.emitRaceBroadcast({ kind: 'gameRound', msg })
    })
    this.client.onBroadcast('gameResult', (msg) => {
      this.config.events?.onGameResult?.(msg)
      this.emitRaceBroadcast({ kind: 'gameResult', msg })
    })

    this.client.onClose(() => {
      this.stopKeepalive()
      this.setState({ state: 'disconnected' })
      this.config.events?.onDisconnected?.()
    })

    await this.client.connect(this.wsUrl)
    this.setState({ state: 'connected', locationName: this.locationName })
  }

  // ==========================================================================
  // Step 3: Device Login  → mapped onto DeviceLoginResult
  // ==========================================================================

  async deviceLogin(version: string = '1.0.0'): Promise<DeviceLoginResult> {
    if (!this.client || !this.client.isOpen()) {
      throw new POSDeviceLoginError('NO_SESSION', 'Not connected')
    }

    this.setState({ state: 'deviceLogin' })

    let reply: PosGoDsMessage
    try {
      reply = await this.client.request({
        msgId: this.client.nextMsgId(),
        msgType: 'deviceLogin',
        deviceType: 'pos',
        initID: this.deviceId,
        version,
        clientDt: this.formatClientDt(),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'deviceLogin failed'
      this.setState({ state: 'error', error: msg, errorCode: 'INTERNAL_ERROR' })
      throw new POSDeviceLoginError('INTERNAL_ERROR', msg)
    }

    // Error envelope: {msgValue:"error", error|errorCode}
    if (reply.msgValue === 'error') {
      const code = this.mapDeviceErrorCode((reply.errorCode as string) || (reply.error as string))
      const errMsg = (reply.errorMessage as string) || (reply.error as string)
      this.setState({ state: 'error', error: errMsg, errorCode: code })
      throw new POSDeviceLoginError(code, errMsg)
    }

    // Device may already be locked at connect time (spec §9.1).
    if (reply.locked === true) {
      this.config.events?.onDeviceLock?.({
        locked: true,
        reason: (reply.lockReason as string) || undefined,
        lockedBy: (reply.lockedBy as string) || undefined,
      })
    }

    const setting = (reply.setting as PosGoSetting) || {}
    if (setting.locationName) this.locationName = setting.locationName

    this.deviceSettings = this.mapSettings(setting)

    // Populate connectionInfo (timezone/currency/etc.) for the UI header.
    this.connectionInfo = {
      timeZone: setting.timezone,
      currency: setting.currency,
      currencySymbol: setting.currency_symbol,
      language: setting.language,
      deviceName: this.deviceName || undefined,
      locationId: this.locationId,
      simulatorUrl: this.simulatorUrl ?? undefined,
      printerRequired: this.printerRequired,
      printerMode: this.printerMode,
      sessionTimeoutMinutes: this.sessionTimeoutMinutes,
      games: this.discoveryGames,
    }

    const result: DeviceLoginResult = {
      success: true,
      sessionId: (reply.posInitId as string) || '',
      device: this.buildDeviceInfo(),
      settings: this.deviceSettings,
      gameTypes: this.buildGameTypes(setting),
      serverTime: (reply.serverTime as string) || '',
    }

    this.setState({
      state: 'ready',
      locationName: this.locationName,
      settings: this.deviceSettings,
      connectionInfo: this.connectionInfo ?? undefined,
    })

    return result
  }

  // ==========================================================================
  // Step 4: User Login (init) → mapped onto InitResult
  // ==========================================================================

  async login(operatorCode: string, pin: string): Promise<InitResult> {
    if (!this.client || !this.client.isOpen()) {
      throw new POSLoginError('NO_SESSION', 'Not connected')
    }

    this.setState({ state: 'userLogin' })

    let reply: PosGoDsMessage
    try {
      reply = await this.client.request({
        msgId: this.client.nextMsgId(),
        msgType: 'init',
        deviceType: 'pos',
        initID: this.deviceId,
        user: operatorCode,
        pass: pin,
        historyGames: 3,
        futureGames: 20,
        version: '1.0.0',
        clientDt: this.formatClientDt(),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'init failed'
      this.setState({ state: 'ready', error: msg, errorCode: 'INTERNAL_ERROR' })
      throw new POSLoginError('INTERNAL_ERROR', msg)
    }

    if (reply.msgValue === 'error') {
      const rawCode = (reply.errorCode as string) || (reply.error as string) || 'INTERNAL_ERROR'
      const code = this.mapInitErrorCode(rawCode)
      const errMsg = (reply.errorMessage as string) || rawCode
      this.setState({ state: 'ready', error: errMsg, errorCode: code })
      throw new POSLoginError(code, errMsg)
    }

    // Store credentials for re-login (parity with prior behavior).
    this.lastOperatorCode = operatorCode
    this.lastPin = pin

    this.sessionInfo = this.mapSession(reply, operatorCode)
    this.operatorLimits = this.mapLimits(reply)
    this.lastResumeTickets = this.mapResumeTickets(reply)

    const result: InitResult = {
      success: true,
      sessionId: this.sessionInfo.sessionId,
      session: this.sessionInfo,
      limits: this.operatorLimits ?? undefined,
      gamePool: reply.gamepool,
      serverTime: (reply.serverTime as string) || '',
      oldBalanceList: (reply.oldBalanceList as OldBalanceEntry[]) || [],
      oldTicketsToPayout: this.mapOldTicketsToPayout(reply),
      resumeStartDateTime: (reply.resumeStartDateTime as string) ?? null,
      resumeTicketList: this.lastResumeTickets,
      resumeStake: (reply.resumeStake as number) ?? null,
      resumeWin: (reply.resumeWin as number) ?? null,
      resumeTicketCount: (reply.resumeTicketCount as number) ?? null,
      resumeTipCount: (reply.resumeTipCount as number) ?? null,
    }

    console.log('[POS] /pos-go-ds init session data:', {
      sessionID: this.sessionInfo.sessionCode,
      operatorID: this.sessionInfo.operatorId,
      oldBalances: result.oldBalanceList?.length ?? 0,
      oldTicketsToPayout: result.oldTicketsToPayout?.length ?? 0,
      resumeTickets: result.resumeTicketList?.length ?? 0,
    })

    this.setState({
      state: 'authenticated',
      session: this.sessionInfo,
      limits: this.operatorLimits ?? undefined,
      error: undefined,
      errorCode: undefined,
    })

    // Prime the race-data feed with the init gamepool. /pos-go-ds returns the
    // full window (history + future) on init, but live gameRound broadcasts
    // only fire when a round's clock advances (~every roundInterval). Without
    // this, the Dashboard would block on "CONECTANDO" until the next broadcast.
    // Surface it as a synthetic gameRound so subscribers (useRealRaceData) get
    // the same shape as a real broadcast, and replay it to late subscribers.
    if (Array.isArray(reply.gamepool) && reply.gamepool.length > 0) {
      const synthetic: PosGoDsMessage = {
        msgType: 'gameRound',
        gamepool: reply.gamepool,
        serverTime: (reply.serverTime as string) || '',
      }
      this.lastGameRound = synthetic
      this.cacheRoundOdds(synthetic)
      this.emitRaceBroadcast({ kind: 'gameRound', msg: synthetic })
    }

    this.startKeepalive()
    return result
  }

  // ==========================================================================
  // Field mappers: /pos-go-ds → existing TS shapes
  // ==========================================================================

  private mapSettings(setting: PosGoSetting): DeviceSettings {
    const coins = [setting.coin_1, setting.coin_2, setting.coin_3, setting.coin_4, setting.coin_5]
      .filter((c): c is number => typeof c === 'number' && c > 0)
    return {
      currency: setting.currency ?? 'USD',
      currencySymbol: setting.currency_symbol ?? '$',
      coins: coins.length ? coins : [25, 50, 100, 200],
      maxBetPerTip: setting.max_bet_per_tip ?? 0,
      decimalPlaces: setting.decimal_places ?? 2,
      language: setting.language ?? 'es',
      timezone: setting.timezone,
    }
  }

  private buildDeviceInfo(): DeviceInfo {
    return {
      deviceId: this.deviceId,
      locationId: this.locationId,
      locationName: this.locationName,
      deviceType: 0, // pos; /pos-go-ds doesn't return a numeric deviceType — STUBBED 0
    }
  }

  /** Derive GameTypeConfig[] from the betoffers in `setting` (best-effort). */
  private buildGameTypes(setting: PosGoSetting): GameTypeConfig[] {
    const offers = Array.isArray(setting.betoffers) ? setting.betoffers : []
    return offers.map(o => ({
      gameTypeId: o.id,
      isEnabled: true,
      minBet: 0,                                 // STUBBED — not provided per-offer
      maxBet: setting.max_bet_per_tip ?? 0,      // closest available value
    }))
  }

  private mapSession(reply: PosGoDsMessage, operatorCode: string): SessionInfo {
    const sessionCode = (reply.sessionID as string) || ''
    const addr = (reply.address as { name1?: string }) || {}
    return {
      sessionId: sessionCode,                    // /pos-go-ds uses sessionID as the code; reuse it
      sessionCode,
      deviceId: this.deviceId,
      locationId: this.locationId,
      locationName: this.locationName,
      operatorId: (reply.operatorID as string) || operatorCode,
      operatorName: addr.name1 || operatorCode,
      balance: 0,                                // STUBBED — no operator cash balance in init (Phase 2)
    }
  }

  private mapLimits(reply: PosGoDsMessage): OperatorLimits | null {
    const l = reply.limits as Partial<OperatorLimits> | undefined
    if (!l) return null
    // /pos-go-ds already uses the exact OperatorLimits field names.
    return {
      dailySalesLimit: l.dailySalesLimit ?? undefined,
      dailySalesCurrent: l.dailySalesCurrent ?? 0,
      dailyPayoutLimit: l.dailyPayoutLimit ?? undefined,
      dailyPayoutCurrent: l.dailyPayoutCurrent ?? 0,
      singleTicketMaxAmount: l.singleTicketMaxAmount ?? undefined,
      maxPayoutAmount: l.maxPayoutAmount ?? undefined,
      canPayHighWinners: l.canPayHighWinners ?? false,
      highWinnerThreshold: l.highWinnerThreshold ?? undefined,
    }
  }

  private mapResumeTickets(reply: PosGoDsMessage): ResumeTicket[] {
    const list = reply.resumeTicketList
    if (!Array.isArray(list)) return []
    return list.map((t: any): ResumeTicket => ({
      ticketId: t.ticketId,
      status: t.status,
      totalAmount: t.amount ?? 0,
      amount: t.amount,
      payout: t.winAmount ?? 0,
      winAmount: t.winAmount,
      gameType: t.gameType,
      gameId: t.gameId,
      createdAt: t.createdAt,
      isPaid: t.isPaid,
      bets: Array.isArray(t.tips)
        ? t.tips.map((tip: any) => ({
            lineNumber: tip.line,
            selection1: tip.selection1 ?? null,
            selection2: tip.selection2 ?? null,
            amount: tip.amount ?? 0,
            odds: tip.odds ?? null,
          }))
        : undefined,
    }))
  }

  private mapOldTicketsToPayout(reply: PosGoDsMessage): OldTicketToPayout[] {
    const list = reply.oldTicketsToPayout
    if (!Array.isArray(list)) return []
    return list.map((t: any): OldTicketToPayout => ({
      ticketId: t.ticketId,
      amount: t.amount ?? 0,
      gameId: t.gameId,
      gameType: t.gameType,
    }))
  }

  private mapDeviceErrorCode(code: string): string {
    const c = (code || '').toLowerCase()
    if (c.includes('not found') || c === 'device_not_found') return 'DEVICE_NOT_FOUND'
    if (c.includes('inactive') || c === 'device_inactive') return 'DEVICE_INACTIVE'
    if (c.includes('lock') || c === 'device_locked') return 'DEVICE_LOCKED'
    return 'INTERNAL_ERROR'
  }

  private mapInitErrorCode(code: string): string {
    switch (code) {
      case 'INVALID_PIN':
        return 'INVALID_CREDENTIALS'
      case 'OPERATOR_NOT_FOUND':
      case 'OPERATOR_INACTIVE':
      case 'OPERATOR_LOCKED':
      case 'OPERATOR_NOT_AUTHORIZED':
        return 'INVALID_CREDENTIALS'
      case 'DEVICE_NOT_FOUND':
        return 'NO_DEVICE'
      case 'DEVICE_LOCKED':
        return 'NO_DEVICE'
      case 'EMPTY_FIELDS':
        return 'EMPTY_FIELDS'
      default:
        return 'INTERNAL_ERROR'
    }
  }

  private formatClientDt(): string {
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}.00`
  }

  // ==========================================================================
  // Step 5: Keepalive
  //
  // /pos-go-ds has no `Time` keepalive handler in Phase-1 scope, and a healthy
  // socket needs no application-level ping (the server streams gameRound/
  // gameResult broadcasts continuously, which keeps the connection warm).
  //
  // IMPORTANT: the keepalive must NOT downgrade connection state on its own.
  // A real socket closure is detected by the native `onClose` handler wired in
  // connect() (→ state 'disconnected' + onDisconnected), which is the single
  // source of truth for "the socket died". The previous implementation also
  // polled isOpen() here and, on a (transiently) non-open socket, forced
  // state 'ready' + onSessionExpired — a second, conflicting downgrade path that
  // raced with onClose and could revert a freshly-authenticated session. We keep
  // the interval as a pure liveness log so it can never expire a live session.
  // ==========================================================================

  private startKeepalive(): void {
    this.stopKeepalive()
    this.keepaliveInterval = setInterval(() => {
      // Liveness probe only — never mutate state here. onClose owns disconnect.
      if (!this.client || !this.client.isOpen()) {
        console.debug('[POS] keepalive: socket not open (onClose will handle disconnect)')
      }
    }, 30000)
  }

  private stopKeepalive(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval)
      this.keepaliveInterval = null
    }
  }

  // ==========================================================================
  // Logout & Disconnect
  // ==========================================================================

  async logout(): Promise<boolean> {
    this.stopKeepalive()
    this.lastOperatorCode = ''
    this.lastPin = ''
    // /pos-go-ds has no explicit Logout handler in Phase-1 scope; closing the
    // socket / re-init is the session boundary. Clear local state.
    this.sessionInfo = null
    this.operatorLimits = null
    this.setState({ state: 'ready', session: undefined, limits: undefined })
    return true
  }

  async disconnect(): Promise<void> {
    this.stopKeepalive()
    if (this.client) {
      this.client.close()
      this.client = null
    }
    this.sessionInfo = null
    this.operatorLimits = null
    this.deviceSettings = null
    this.setState({ state: 'disconnected' })
  }

  async gracefulShutdown(): Promise<void> {
    this.stopKeepalive()
    this.sessionInfo = null
    this.operatorLimits = null
    this.deviceSettings = null
    if (this.client) {
      this.client.close()
      this.client = null
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  async ping(): Promise<string> {
    return this.client?.isOpen() ? 'ok' : 'disconnected'
  }

  /**
   * sendLog — /pos-go-ds Phase 1 has no log handler; no-op (never throws).
   * The login flow calls this; it must not crash.
   */
  async sendLog(_message: string, _level: string = 'info'): Promise<void> {
    /* PHASE-2 STUB: no server log channel yet */
  }

  async requestTimeSync(): Promise<TimeResponse> {
    return {
      success: true,
      serverTime: new Date().toISOString(),
      serverTimeUnix: Date.now(),
      sessionExpired: false,
    }
  }

  isConnected(): boolean {
    return this.client?.isOpen() ?? false
  }

  isAuthenticated(): boolean {
    return this.state.state === 'authenticated' && this.sessionInfo !== null
  }

  // ==========================================================================
  // Bet index helpers (static, pure — unchanged, used by Phase 2)
  // ==========================================================================

  private nextMsgId(): number {
    return ++this.msgIdCounter
  }

  static calculateWinIndex(selection: number): number {
    return selection - 1
  }

  static calculateExactaIndex(first: number, second: number, participants: number): number {
    const factor = participants - 1
    const offset = second > first ? 1 : 0
    return first * factor + second - offset
  }

  static buildBetIndexMap(
    bets: Array<{ betType: BetType; selection1: number; selection2?: number; amount: number }>,
    gameType: string
  ): BetIndexMap {
    const config = GAME_CONFIGS[gameType]
    if (!config) throw new Error(`Unknown game type: ${gameType}`)

    const indexMap: BetIndexMap = {}
    for (const bet of bets) {
      let index: number
      switch (bet.betType) {
        case BetType.WIN:
          index = POSConnection.calculateWinIndex(bet.selection1)
          break
        case BetType.EXACTA:
          if (!bet.selection2) throw new Error('EXACTA bet requires selection2')
          index = POSConnection.calculateExactaIndex(bet.selection1, bet.selection2, config.participants)
          break
        default:
          throw new Error(`Unsupported bet type: ${bet.betType}`)
      }
      const key = `bet_${index}`
      indexMap[key] = (indexMap[key] || 0) + bet.amount
    }
    return indexMap
  }

  // ==========================================================================
  // PHASE-2 STUBS — tickets / balance / payments.
  // Not in Phase-1 scope. Each returns a well-formed error envelope (or a
  // safe value) so the UI never throws while these flows are unimplemented.
  // ==========================================================================

  // Cache each round's odds[] from a gameRound/gamepool message so sendTicket
  // can stamp tips with authoritative round odds.
  private cacheRoundOdds(msg: PosGoDsMessage): void {
    const pool = (msg as any)?.gamepool
    if (!Array.isArray(pool)) return
    for (const r of pool) {
      if (r?.id && Array.isArray(r.odds)) this.roundOddsById.set(String(r.id), r.odds as number[])
    }
  }

  /**
   * Create a ticket over /pos-go-ds. Mirrors the virteon SignalR sendTicket
   * flow (same bet→index math, same result shape) but sends a structured
   * `tips[]` payload — the Go backend stores each tip's odds and settlement
   * pays `amount * odds * bonus`, so we stamp tips with the authoritative
   * round odds fed over the gamepool (NOT a client-typed value). Bonus is
   * resolved server-side. Win/exacta index math is shared with buildBetIndexMap.
   */
  async sendTicket(
    gameType: string,
    gameId: string,
    bets: Array<{ betType: BetType; selection1: number; selection2?: number; amount: number }>
  ): Promise<SendTicketResult> {
    const msgId = this.nextMsgId()
    if (!this.client || !this.client.isOpen()) {
      return { msgType: 'sendTicket', msgId, msgValue: 'error', errorCode: 'NO_SESSION', errorMessage: 'Not connected' }
    }
    if (!this.isAuthenticated()) {
      return { msgType: 'sendTicket', msgId, msgValue: 'error', errorCode: 'NOT_AUTHENTICATED', errorMessage: 'User not authenticated' }
    }

    const config = GAME_CONFIGS[gameType]
    const participants = config?.participants ?? 8
    const roundOdds = this.roundOddsById.get(gameId)

    const tips = bets.map((bet, i) => {
      const isExacta = bet.betType === BetType.EXACTA && bet.selection2 != null && bet.selection2 > 0
      const oddsIndex = isExacta
        ? POSConnection.calculateExactaIndex(bet.selection1, bet.selection2!, participants)
        : POSConnection.calculateWinIndex(bet.selection1)
      const odds = roundOdds && typeof roundOdds[oddsIndex] === 'number' ? roundOdds[oddsIndex] : 0
      return {
        line: i + 1,
        betType: isExacta ? 2 : 1,
        betTypeName: isExacta ? 'Forecast in order' : 'Winner',
        selection1: bet.selection1,
        selection2: isExacta ? bet.selection2 : null,
        amount: bet.amount,
        odds,
        oddsIndex,
      }
    })

    try {
      const reply = await this.client.request({
        msgId,
        msgType: 'sendTicket',
        type: gameType,
        gameId,
        sendDt: this.formatClientDt(),
        tips,
      })

      if (reply.msgValue === 'ok') {
        const success: SendTicketSuccess = {
          msgType: 'sendTicket',
          msgId,
          msgValue: 'ok',
          ticketID: (reply.ticketID as string) || '',
          ticketNumber: (reply.ticketID as string) || undefined,
          checksum: (reply.checksum as string) || '',
          limitProfitWarning: Boolean(reply.limitProfitWarning),
          limitTurnoverWarning: Boolean(reply.limitTurnoverWarning),
          serverTime: (reply.serverTime as string) || '',
        }
        this.config.events?.onTicketCreated?.(success)
        return success
      }

      const error: SendTicketError = {
        msgType: 'sendTicket',
        msgId,
        msgValue: 'error',
        errorCode: ((reply.errorCode as string) || 'INTERNAL_ERROR') as SendTicketError['errorCode'],
        errorMessage: (reply.errorMessage as string) || (reply.error as string) || 'Ticket creation failed',
      }
      this.config.events?.onTicketError?.(error)
      return error
    } catch (err) {
      const error: SendTicketError = {
        msgType: 'sendTicket',
        msgId,
        msgValue: 'error',
        errorCode: 'INTERNAL_ERROR',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      }
      this.config.events?.onTicketError?.(error)
      return error
    }
  }

  // Raw bet-index variant kept for parity; the /pos-go-ds path uses the
  // structured sendTicket above. Resolve selections from the index map would
  // lose odds context, so route advanced callers through sendTicket instead.
  async sendTicketRaw(_gameType: string, _gameId: string, _betIndexMap: BetIndexMap): Promise<SendTicketResult> {
    return { msgType: 'sendTicket', msgId: this.nextMsgId(), msgValue: 'error', errorCode: 'INTERNAL_ERROR', errorMessage: 'Use sendTicket() on /pos-go-ds' }
  }

  // /pos-go-ds has NO reserve/confirm handshake — `sendTicket` creates the
  // ticket atomically in PostgreSQL. So on this transport "reserve" == create:
  // we delegate to sendTicket and surface the result in the ReserveTicketResult
  // shape (ticketNumber + tips) the printerRequired flow expects; confirmTicket
  // is then a no-op success. ⚠️ Because the ticket is already persisted, a
  // printerRequired device that fails its printer check AFTER reserve would
  // leave an orphan — our devices are printerRequired:false (direct sendTicket
  // path), so this path is defensive. A real backend reserve/confirm is the
  // proper fix if a printer-gated device is ever deployed.
  async reserveTicket(
    gameType: string,
    gameId: string,
    bets: Array<{ betType: BetType; selection1: number; selection2?: number; amount: number }>
  ): Promise<ReserveTicketResult> {
    const result = await this.sendTicket(gameType, gameId, bets)
    if (result.msgValue === 'ok') {
      const config = GAME_CONFIGS[gameType]
      const participants = config?.participants ?? 8
      const roundOdds = this.roundOddsById.get(gameId)
      const tips = bets.map((bet) => {
        const isExacta = bet.betType === BetType.EXACTA && bet.selection2 != null && bet.selection2 > 0
        const oddsIndex = isExacta
          ? POSConnection.calculateExactaIndex(bet.selection1, bet.selection2!, participants)
          : POSConnection.calculateWinIndex(bet.selection1)
        const odds = roundOdds && typeof roundOdds[oddsIndex] === 'number' ? roundOdds[oddsIndex] : 0
        return { selection1: bet.selection1, selection2: isExacta ? bet.selection2 : undefined, amount: bet.amount, odds, possibleWin: bet.amount * odds }
      })
      return { msgType: 'reserveTicket', msgId: result.msgId, msgValue: 'ok', ticketNumber: result.ticketID, reservationId: result.ticketID, expiresAt: '', serverTime: result.serverTime || '', tips } as ReserveTicketResult
    }
    return { msgType: 'reserveTicket', msgId: result.msgId, msgValue: 'error', errorCode: result.errorCode, errorMessage: result.errorMessage } as ReserveTicketResult
  }

  // No-op success: on /pos-go-ds the ticket was already persisted by reserve.
  async confirmTicket(ticketNumber: string): Promise<ConfirmTicketResult> {
    return { success: true, ticketNumber, ticketID: ticketNumber, confirmedAt: this.formatClientDt() }
  }

  async getBalance(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'NOT_IMPLEMENTED' }
  }

  async closeShiftAndLogout(): Promise<{ success: boolean; error?: string }> {
    await this.logout()
    return { success: true }
  }

  // Close/reconcile a session over /pos-go-ds. Mirrors virteon's sendBalance
  // payload (totals + balanceSessionID + isAutobalance), adapted to our WS
  // transport. The Go backend (handlePosGoSendBalance → pgpos.InsertBalance) is
  // server-authoritative: it recomputes the balance from DB totals and stores
  // ours as the "reported" reconciliation values. Used for shift-close (Z) AND
  // for auto-balancing previous sessions during login (processPendingSessions).
  // Fails open to success so a backend hiccup never blocks logout/login (the Z
  // was already printed) — same policy as virteon.
  async sendBalance(data: SendBalanceData): Promise<SendBalanceResult> {
    if (!this.client || !this.client.isOpen() || !this.isAuthenticated()) {
      return { success: false, error: 'NOT_AUTHENTICATED', errorMessage: 'User not authenticated' }
    }
    const sessionCode = data.balanceSessionID || this.sessionInfo?.sessionCode || ''
    try {
      const reply = await this.client.request({
        msgId: this.nextMsgId(),
        msgType: 'sendBalance',
        sendDt: this.formatClientDt(),
        balanceSessionID: sessionCode,
        sessionID: sessionCode,
        totalBet: data.totalBet,
        totalWin: data.totalWin,
        totalCassa: data.totalBet - data.totalWin,
        countTip: data.countTip,
        countTicketCancel: data.countTicketCancel,
        ticketData: data.ticketData,
        isAutobalance: data.isAutobalance ? 'y' : 'n',
      })
      return { success: reply.msgValue === 'ok' }
    } catch (err) {
      // Fail open: the balance receipt was already printed; don't block the flow.
      console.warn('[POS] sendBalance failed (treating as success):', err)
      return { success: true }
    }
  }

  getSessionCode(): string {
    return this.sessionInfo?.sessionCode || ''
  }

  async reLogin(): Promise<InitResult | null> {
    if (!this.lastOperatorCode || !this.lastPin) return null
    try {
      return await this.login(this.lastOperatorCode, this.lastPin)
    } catch {
      return null
    }
  }

  // Pay or cancel a ticket over /pos-go-ds. Mirrors virteon's sendTicketStatus
  // (ticketId + newStatus + confirm). The Go backend maps payout/autopayout→paid,
  // cancel/autocancel→cancelled (pgpos.UpdateTicketStatus) and resolves the
  // session from client state. Used for manual pay/cancel AND auto-payout of old
  // unpaid tickets / auto-cancel from previous sessions (processPendingSessions).
  async sendTicketStatus(
    ticketId: string,
    newStatus: 'payout' | 'autopayout' | 'cancel' | 'autocancel'
  ): Promise<{ msgType: string; msgId: number; msgValue: string; status?: string; errorCode?: string; errorMessage?: string }> {
    const msgId = this.nextMsgId()
    if (!this.client || !this.client.isOpen() || !this.isAuthenticated()) {
      return { msgType: 'sendTicketStatus', msgId, msgValue: 'error', errorCode: 'NOT_AUTHENTICATED', errorMessage: 'User not authenticated' }
    }
    try {
      const reply = await this.client.request({
        msgId,
        msgType: 'sendTicketStatus',
        ticketId,
        newStatus,
        sessionID: this.sessionInfo?.sessionCode || '',
        confirm: 'confirm',
      })
      return {
        msgType: 'sendTicketStatus',
        msgId,
        msgValue: (reply.msgValue as string) || 'error',
        status: reply.status as string | undefined,
        errorCode: reply.errorCode as string | undefined,
        errorMessage: (reply.errorMessage as string) || (reply.error as string) || undefined,
      }
    } catch (err) {
      return { msgType: 'sendTicketStatus', msgId, msgValue: 'error', errorCode: 'INTERNAL_ERROR', errorMessage: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Look up a ticket by its code (typed or scanned) via /pos-go-ds
  // `queryTicketCode` and map the reply → the GetTicketSuccess shape the UI
  // (search modal, pay/cancel/rebet) consumes. `ticketId` is a numeric
  // placeholder — pay/cancel key off `ticketNumber` (our codes are hex strings).
  async getTicket(ticketIdentifier: string): Promise<GetTicketResult> {
    if (!this.client || !this.client.isOpen() || !this.isAuthenticated()) {
      return { success: false, error: 'NOT_AUTHENTICATED', errorMessage: 'User not authenticated' }
    }
    try {
      const reply = await this.client.request({
        msgId: this.nextMsgId(),
        msgType: 'queryTicketCode',
        code: ticketIdentifier.trim(),
      })
      if (reply.msgValue !== 'ok') {
        return { success: false, error: 'TICKET_NOT_FOUND', errorMessage: (reply.errorMessage as string) || 'Boleto no encontrado' }
      }
      const status = String(reply.status ?? '')
      const rawTips = Array.isArray(reply.tips) ? reply.tips : []
      return {
        success: true,
        ticketId: 0,
        ticketNumber: String(reply.ticketID ?? ''),
        ticketUUID: String(reply.ticketID ?? ''),
        deviceId: this.deviceId,
        status,
        gameTypeName: reply.gameType as string | undefined,
        gameTypeId: Number(reply.betofferId ?? 0),
        roundCode: reply.roundCode as string | undefined,
        betAmount: Number(reply.betAmount ?? 0),
        winAmount: Number(reply.winAmount ?? 0),
        possibleWin: Number(reply.possibleWin ?? 0),
        isPaid: Boolean(reply.isPaid),
        isCancelled: status === 'cancelled',
        createdAt: String(reply.createdAt ?? ''),
        tips: rawTips.map((t: any) => ({
          lineNumber: Number(t.line ?? 0),
          betTypeName: t.betTypeName as string | undefined,
          selection1: Number(t.selection1 ?? 0),
          selection2: t.selection2 != null ? Number(t.selection2) : undefined,
          amount: Number(t.amount ?? 0),
          odds: Number(t.odds ?? 0),
          winAmount: Number(t.winAmount ?? 0),
          status: String(t.status ?? ''),
        })),
      }
    } catch (err) {
      return { success: false, error: 'TICKET_NOT_FOUND', errorMessage: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Cancel a ticket by its number (manual cashier flow). Looks the ticket up
  // first to validate + get the amount for the receipt, then sendTicketStatus.
  async cancelTicket(ticketNumber: string): Promise<CancelTicketResult> {
    const t = await this.getTicket(ticketNumber)
    if (!t.success) return { success: false, error: 'TICKET_NOT_FOUND', errorMessage: t.errorMessage }
    if (t.isCancelled) return { success: false, error: 'ALREADY_CANCELLED', errorMessage: 'Ticket ya cancelado' }
    if (t.isPaid) return { success: false, error: 'ALREADY_PAID', errorMessage: 'Ticket ya pagado' }
    const res = await this.sendTicketStatus(ticketNumber, 'cancel')
    if (res.msgValue !== 'ok') {
      return { success: false, error: 'TICKET_NOT_FOUND', errorMessage: res.errorMessage || 'No se pudo cancelar' }
    }
    return { success: true, ticketId: 0, ticketNumber, cancelledAmount: t.betAmount, cancelledAt: this.formatClientDt() }
  }

  // Pay a winning ticket by its number. Looks it up for the payout amount,
  // then sendTicketStatus('payout').
  async payTicket(ticketNumber: string): Promise<PayTicketResult> {
    const t = await this.getTicket(ticketNumber)
    if (!t.success) return { success: false, error: 'TICKET_NOT_FOUND', errorMessage: t.errorMessage }
    if (t.isPaid) return { success: false, error: 'ALREADY_PAID', errorMessage: 'Ticket ya pagado' }
    const res = await this.sendTicketStatus(ticketNumber, 'payout')
    if (res.msgValue !== 'ok') {
      return { success: false, error: 'TICKET_NOT_FOUND', errorMessage: res.errorMessage || 'No se pudo pagar' }
    }
    return { success: true, ticketId: 0, ticketNumber, paidAmount: t.winAmount, paidAt: this.formatClientDt() }
  }
}

// ============================================================================
// Singleton Instance (unchanged)
// ============================================================================

let posConnectionInstance: POSConnection | null = null

export function getPOSConnection(config?: POSConnectionConfig): POSConnection {
  if (!posConnectionInstance && config) {
    posConnectionInstance = new POSConnection(config)
  }
  if (!posConnectionInstance) {
    throw new Error('POSConnection not initialized. Call getPOSConnection with config first.')
  }
  return posConnectionInstance
}

export async function resetPOSConnection(): Promise<void> {
  if (posConnectionInstance) {
    await posConnectionInstance.gracefulShutdown()
    posConnectionInstance = null
  }
}
