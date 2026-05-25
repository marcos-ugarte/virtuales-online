/**
 * WebSocket Communication Types
 * Based on POS_WEBSOCKET_CLIENT_GUIDE.md
 */

// ============================================================================
// Discovery Types
// ============================================================================

export interface DiscoveryResponse {
  url: string
  deviceType: string
  serverTime: number
  msgType: string
  deviceRegistered: boolean
  deviceName: string
  locationId: string
  locationName: string
  simulatorUrl?: string
  printerRequired?: boolean
  printerMode?: string
  sessionTimeoutMinutes?: number
}

export interface DiscoveryError {
  error: 'DEVICE_NOT_FOUND' | 'DEVICE_INACTIVE'
  message: string
  deviceId: string
}

// ============================================================================
// Connection Types
// ============================================================================

export interface ConnectedEvent {
  connectionId: string
  sessionId: string
  serverTime: string
  serverTimeUnix: number
  message: string
  // Extended fields from relay server
  timeZone?: string           // e.g., "Atlantic Standard Time"
  currency?: string           // e.g., "DOP"
  currencySymbol?: string     // e.g., "RD$"
  language?: string           // e.g., "es"
  deviceRegistered?: boolean
  deviceId?: string
  deviceName?: string
  locationId?: string
  locationName?: string
}

// ============================================================================
// Device Login Types
// ============================================================================

export interface DeviceInfo {
  deviceId: string
  locationId: string
  locationName: string
  deviceType: number
}

export interface DeviceSettings {
  currency: string
  currencySymbol: string
  coins: number[]
  maxBetPerTip: number
  decimalPlaces: number
  language: string
  timezone?: string  // e.g., "-04:00" or "America/Santo_Domingo"
}

export interface GameTypeConfig {
  gameTypeId: number
  isEnabled: boolean
  minBet: number
  maxBet: number
}

export interface DeviceLoginSuccess {
  success: true
  sessionId: string
  device: DeviceInfo
  settings: DeviceSettings
  gameTypes: GameTypeConfig[]
  serverTime: string
}

export interface DeviceLoginError {
  success: false
  error: 'NO_SESSION' | 'DEVICE_NOT_FOUND' | 'DEVICE_INACTIVE' | 'DEVICE_ALREADY_CONNECTED' | 'INTERNAL_ERROR'
  errorMessage?: string
}

export type DeviceLoginResult = DeviceLoginSuccess | DeviceLoginError

// ============================================================================
// User Login (Init) Types
// ============================================================================

export interface SessionInfo {
  sessionId: string
  sessionCode: string    // 12-char hex code for display
  deviceId: string
  locationId: string
  locationName: string
  operatorId: string
  operatorName: string
  shiftId?: number
  shiftNumber?: string
  balance: number
}

export interface OperatorLimits {
  dailySalesLimit?: number
  dailySalesCurrent: number
  dailyPayoutLimit?: number
  dailyPayoutCurrent: number
  singleTicketMaxAmount?: number
  maxPayoutAmount?: number
  canPayHighWinners: boolean
  highWinnerThreshold?: number
}

export interface InitSuccess {
  success: true
  sessionId: string
  session: SessionInfo
  limits?: OperatorLimits
  gamePool?: unknown
  serverTime: string
  // Session resume fields (from previous session without balance close)
  oldBalanceList?: OldBalanceEntry[]
  oldTicketsToPayout?: OldTicketToPayout[]
  resumeStartDateTime?: string | null
  resumeTicketList?: ResumeTicket[] | null
  resumeStake?: number | null
  resumeWin?: number | null
  resumeTicketCount?: number | null
  resumeTipCount?: number | null
}

export interface InitError {
  success: false
  error: 'NO_SESSION' | 'NO_DEVICE' | 'EMPTY_FIELDS' | 'INVALID_CREDENTIALS' | 'INTERNAL_ERROR'
  errorMessage?: string
}

export type InitResult = InitSuccess | InitError

// ============================================================================
// Balance & Session Close Types
// ============================================================================

export interface OldBalanceEntry {
  operatorID: string
  sessionID: string
  startDT: string
  endDT: string
  totalBet: number
  totalWin: number
  totalCassa: number
  totalCancel: number
  countTip: number
  countTicket: number
  countTicketCancel: number
  totalPayout: number
  totalPayoutTax: number
}

export interface OldTicketToPayout {
  ticketId: string
  amount: number
  gameId: string
  gameType: string
  tips?: Array<{
    quote: number
    stake: number
    multibonus?: number
    winAmount: number
    winner: number
    second: number
  }>
}

export interface ResumeTicketBet {
  lineNumber: number
  selection1?: number | null
  selection2?: number | null
  amount: number
  odds?: number | null
}

export interface ResumeTicket {
  ticketId: string
  ticketNumber?: string
  status: 'pending' | 'won' | 'lost' | 'cancelled' | 'paid'
  totalAmount: number
  amount?: number                 // server sends Amount; keep totalAmount as alias
  payout: number
  winAmount?: number              // server sends WinAmount
  gameType: string
  gameId: string
  createdAt?: string              // ISO UTC
  bets?: ResumeTicketBet[]        // individual tips / selections
  isPaid?: boolean
  isCancelled?: boolean
}

export interface SendBalanceData {
  totalBet: number
  totalWin: number
  countTip: number
  countTicketCancel: number
  ticketData: string  // JSON string of ticket details
  isAutobalance?: boolean
  balanceSessionID?: string
}

export interface SendBalanceResult {
  success: boolean
  error?: string
  errorMessage?: string
}

// ============================================================================
// Time/Keepalive Types
// ============================================================================

export interface TimeResponse {
  success: boolean
  serverTime: string
  serverTimeUnix: number
  sessionExpired: boolean
}

// ============================================================================
// Error Codes
// ============================================================================

export type DiscoveryErrorCode = 'DEVICE_NOT_FOUND' | 'DEVICE_INACTIVE'

export type DeviceLoginErrorCode =
  | 'NO_SESSION'
  | 'DEVICE_NOT_FOUND'
  | 'DEVICE_INACTIVE'
  | 'DEVICE_ALREADY_CONNECTED'
  | 'INTERNAL_ERROR'

export type InitErrorCode =
  | 'NO_SESSION'
  | 'NO_DEVICE'
  | 'EMPTY_FIELDS'
  | 'INVALID_CREDENTIALS'
  | 'INTERNAL_ERROR'

// ============================================================================
// Connection State
// ============================================================================

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'deviceLogin'
  | 'ready'
  | 'userLogin'
  | 'authenticated'
  | 'reconnecting'
  | 'error'

export interface DeviceConnectionInfo {
  timeZone?: string           // e.g., "Atlantic Standard Time"
  currency?: string           // e.g., "DOP"
  currencySymbol?: string     // e.g., "RD$"
  language?: string           // e.g., "es"
  deviceName?: string
  locationId?: string
  simulatorUrl?: string       // Race data WS URL from discover (e.g., "wss://ws.virtuales.bet/pos-ds")
  printerRequired?: boolean   // true = block tickets without printer; false = allow
  printerMode?: string        // "vendor" = WebPosPrinter:8085, "node" = print-server-dogs:4053
  sessionTimeoutMinutes?: number // Auto-logout after this time (default 600 = 10 hours)
  games?: string[]               // list of game prefixes enabled on this device (dos/doe/dot/hoc)
}

export interface POSConnectionState {
  state: ConnectionState
  error?: string
  errorCode?: string
  deviceId?: string
  locationName?: string
  session?: SessionInfo
  settings?: DeviceSettings
  limits?: OperatorLimits
  connectionInfo?: DeviceConnectionInfo
}

// ============================================================================
// Server Push Events
// ============================================================================

/**
 * Payload for forceDisconnect event
 * Sent when admin forces session closure
 */
export interface ForceDisconnectPayload {
  type: 'forceDisconnect'
  reason: string           // Technical reason for the closure
  message: string          // User-friendly message to display
  sessionCode: string      // 12-char hex session code
  timestamp: string        // ISO 8601 timestamp
}

/**
 * Payload for timeSync event
 * Server-initiated time synchronization
 */
export interface TimeSyncPayload {
  serverTime: string       // ISO 8601 timestamp from server
  timezone?: string        // Server timezone
}

// ============================================================================
// Events
// ============================================================================

export interface POSConnectionEvents {
  onStateChange?: (state: POSConnectionState) => void
  onConnected?: (data: ConnectedEvent) => void
  onDisconnected?: (error?: Error) => void
  onReconnecting?: () => void
  onReconnected?: () => void
  onSessionExpired?: () => void
  onGameRoundOpened?: (round: unknown) => void
  onGameResult?: (result: unknown) => void
  onForceLogout?: (reason: string) => void
  onForceDisconnect?: (payload: ForceDisconnectPayload) => void
  onTimeSync?: (payload: TimeSyncPayload) => void
  onConfigUpdate?: (config: unknown) => void
  onTicketCreated?: (result: SendTicketSuccess) => void
  onTicketError?: (error: SendTicketError) => void
  onDeviceLock?: (data: { locked: boolean; reason?: string; lockedBy?: string }) => void
}

// ============================================================================
// Ticket Types
// ============================================================================

/**
 * Bet index map for sendTicket request
 * Keys are "bet_0", "bet_1", ..., "bet_N" representing bet indices
 * Values are the amounts bet on each index
 */
export type BetIndexMap = Record<string, number>

/**
 * SendTicket request - Legacy format compatible with DS Virtual
 */
export interface SendTicketRequest {
  msgId: number
  msgType: 'sendTicket'
  type: string                    // Game type: "dog8", "dog6", "horsec", etc.
  gameId: string                  // Format: "{gameTypeId}_{roundId}_{roundCode}"
  sendDt: string                  // Format: "YYYY-MM-DD HH:mm:ss"
  ticketTransactionId: number     // Sequential ID per session
  prepTicketID: number            // -1 if not applicable
  [key: `bet_${number}`]: number  // Dynamic bet indices with amounts
}

/**
 * SendTicket success response
 */
export interface SendTicketSuccess {
  msgType: 'sendTicket'
  msgId: number
  msgValue: 'ok'
  ticketID: string               // Hex ticket ID (e.g., "c9bb")
  ticketNumber?: string          // Full ticket number (e.g., "20260103-000042")
  checksum: string               // "NOT IMPLEMENTED" currently
  limitProfitWarning: boolean    // Warning if approaching profit limit
  limitTurnoverWarning: boolean  // Warning if approaching sales limit
  serverTime: string             // "YYYY-MM-DD HH:mm:ss.ff"
  jackpotContribution?: number   // Amount contributed to jackpot pool
}

/**
 * SendTicket error response
 */
export interface SendTicketError {
  msgType: 'sendTicket'
  msgId: number
  msgValue: 'error'
  errorCode: SendTicketErrorCode
  errorMessage: string
}

export type SendTicketResult = SendTicketSuccess | SendTicketError

export type SendTicketErrorCode =
  | 'NO_SESSION'
  | 'NOT_AUTHENTICATED'
  | 'NO_TIPS'
  | 'ROUND_NOT_FOUND'
  | 'ROUND_NOT_OPEN'
  | 'TICKET_EXCEEDS_LIMIT'
  | 'DAILY_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'

// ============================================================================
// Cancel Ticket Types
// ============================================================================

export interface CancelTicketSuccess {
  success: true
  ticketId: number
  ticketNumber: string
  cancelledAmount: number
  cancelledAt: string
}

export interface CancelTicketError {
  success: false
  error: CancelTicketErrorCode
  errorMessage?: string
}

export type CancelTicketResult = CancelTicketSuccess | CancelTicketError

export type CancelTicketErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'TICKET_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'ALREADY_CANCELLED'
  | 'ALREADY_PAID'
  | 'ROUND_LOCKED'

// ============================================================================
// Pay Ticket Types
// ============================================================================

export interface PayTicketSuccess {
  success: true
  ticketId: number
  ticketNumber: string
  paidAmount: number
  paidAt: string
}

export interface PayTicketError {
  success: false
  error: PayTicketErrorCode
  errorMessage?: string
}

export type PayTicketResult = PayTicketSuccess | PayTicketError

export type PayTicketErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'TICKET_NOT_FOUND'
  | 'ALREADY_PAID'
  | 'TICKET_CANCELLED'
  | 'NOT_WINNER'
  | 'HIGH_WINNER_LIMIT'
  | 'MAX_PAYOUT_EXCEEDED'
  | 'DAILY_PAYOUT_EXCEEDED'

// ============================================================================
// Get Ticket Types
// ============================================================================

export interface GetTicketTipResult {
  lineNumber: number
  betTypeName?: string
  selection1: number
  selection2?: number
  amount: number
  odds: number
  winAmount: number
  status: string // "P" | "W" | "L" | "C"
}

export interface GetTicketSuccess {
  success: true
  ticketId: number
  ticketNumber: string
  ticketUUID: string
  deviceId: string
  status: string // "pending" | "won" | "lost" | "paid" | "cancelled"
  gameTypeName?: string
  gameTypeId: number
  roundCode?: string
  betAmount: number
  winAmount: number
  possibleWin: number
  isPaid: boolean
  isCancelled: boolean
  createdAt: string
  paidAt?: string
  tips: GetTicketTipResult[]
}

export interface GetTicketError {
  success: false
  error: GetTicketErrorCode
  errorMessage?: string
}

export type GetTicketResult = GetTicketSuccess | GetTicketError

export type GetTicketErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'TICKET_NOT_FOUND'
  | 'INTERNAL_ERROR'

// ============================================================================
// Bet Calculation Helpers
// ============================================================================

/**
 * Bet type IDs
 */
export const BetType = {
  WIN: 1,        // 1st place
  PLACE: 2,      // 1st or 2nd
  SHOW: 3,       // 1st, 2nd, or 3rd
  EXACTA: 4,     // 1st and 2nd in exact order
  QUINELLA: 5,   // 1st and 2nd any order
  TRIFECTA: 6,   // 1st, 2nd, 3rd in exact order
  SUPERFECTA: 7  // 1st, 2nd, 3rd, 4th in exact order
} as const

export type BetType = (typeof BetType)[keyof typeof BetType]

/**
 * Game bet configuration for index calculation
 */
export interface GameBetConfig {
  gameTypeId: number
  eventType: string
  participants: number
  winIndexEnd: number      // Last WIN index (participants - 1)
  exactaIndexStart: number // First EXACTA index (participants)
  exactaIndexEnd: number   // Last EXACTA index
}

export const GAME_CONFIGS: Record<string, GameBetConfig> = {
  dog6: { gameTypeId: 141, eventType: 'dog', participants: 6, winIndexEnd: 5, exactaIndexStart: 6, exactaIndexEnd: 35 },
  dog8: { gameTypeId: 541, eventType: 'dog8', participants: 8, winIndexEnd: 7, exactaIndexStart: 8, exactaIndexEnd: 63 },
  horsec: { gameTypeId: 251, eventType: 'horsec', participants: 7, winIndexEnd: 6, exactaIndexStart: 7, exactaIndexEnd: 48 },
  dog63: { gameTypeId: 741, eventType: 'dog63', participants: 6, winIndexEnd: 5, exactaIndexStart: 6, exactaIndexEnd: 35 }
}

// ============================================================================
// Reserve / Confirm Ticket Types (print-first flow)
// ============================================================================

/**
 * ReserveTicket success response — ticket is reserved but not yet charged.
 * Must be confirmed within the TTL (10 minutes) or it expires automatically.
 */
export interface ReserveTicketSuccess {
  msgType: 'reserveTicket'
  msgId: number
  msgValue: 'ok'
  ticketNumber: string
  reservationId: string
  expiresAt: string          // ISO 8601 — when the reservation expires
  serverTime: string
}

/**
 * ReserveTicket error response
 */
export interface ReserveTicketError {
  msgType: 'reserveTicket'
  msgId: number
  msgValue: 'error'
  errorCode: ReserveTicketErrorCode
  errorMessage: string
}

export type ReserveTicketResult = ReserveTicketSuccess | ReserveTicketError

export type ReserveTicketErrorCode =
  | 'NO_SESSION'
  | 'NOT_AUTHENTICATED'
  | 'SESSION_LOST'
  | 'RECONNECTING'
  | 'NO_TIPS'
  | 'ROUND_NOT_FOUND'
  | 'ROUND_NOT_OPEN'
  | 'TICKET_EXCEEDS_LIMIT'
  | 'DAILY_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'

/**
 * ConfirmTicket success response — ticket is now charged and finalized.
 */
export interface ConfirmTicketSuccess {
  success: true
  ticketNumber: string
  ticketID: string
  confirmedAt: string
  jackpotContribution?: number
}

/**
 * ConfirmTicket error response
 */
export interface ConfirmTicketError {
  success: false
  error: ConfirmTicketErrorCode
  errorMessage?: string
}

export type ConfirmTicketResult = ConfirmTicketSuccess | ConfirmTicketError

export type ConfirmTicketErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'RESERVATION_NOT_FOUND'
  | 'RESERVATION_EXPIRED'
  | 'ALREADY_CONFIRMED'
  | 'INTERNAL_ERROR'
