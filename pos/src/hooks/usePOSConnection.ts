/**
 * React Hook for POS WebSocket Connection
 * Implements the connection flow from POS_WEBSOCKET_CLIENT_GUIDE.md
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  POSConnection,
  POSDiscoveryError,
  POSDeviceLoginError,
  POSLoginError,
  getPOSConnection,
  resetPOSConnection
} from '@/services/posConnection'
import type {
  POSConnectionState,
  ConnectionState,
  SessionInfo,
  DeviceSettings,
  OperatorLimits,
  InitResult,
  InitSuccess,
  DeviceConnectionInfo,
  ForceDisconnectPayload,
  TimeSyncPayload
} from '@/types/websocket'
import { PrinterService } from '@/services/printer'
import type { PrintBalanceData } from '@/services/printer'
import { posLogger, LogEvents } from '@/services/posLogger'

// ============================================================================
// Error Types for UI
// ============================================================================

export type DeviceErrorType = 'DEVICE_NOT_FOUND' | 'DEVICE_IN_USE' | 'DEVICE_IN_USE_RETRYING' | 'DEVICE_INACTIVE' | 'DEVICE_NOT_CONFIGURED' | 'OFFLINE' | 'NETWORK_ERROR' | null
export type LoginErrorType = 'EMPTY_FIELDS' | 'INVALID_CREDENTIALS' | null

export interface POSConnectionHookState {
  // Connection state
  connectionState: ConnectionState
  isInitializing: boolean
  isLoggingIn: boolean

  // Device info
  deviceId: string | null
  locationName: string | null
  connectionInfo: DeviceConnectionInfo | null

  // Session info (after user login)
  session: SessionInfo | null
  settings: DeviceSettings | null
  limits: OperatorLimits | null

  // Errors
  deviceError: DeviceErrorType
  activeSessionDetails: { ip?: string; browser?: string; connectedAt?: string; idleMinutes?: number } | null
  loginError: LoginErrorType
  errorMessage: string | null

  // Force disconnect info
  wasForceDisconnected: boolean
  forceDisconnectMessage: string | null

  // Server time sync
  serverTime: string | null

  // Remote device lock (live state via SignalR DeviceLock event)
  deviceLocked: boolean
  deviceLockReason: string | null
  deviceLockedBy: string | null
}

export interface POSConnectionHook extends POSConnectionHookState {
  // Actions
  initialize: (deviceId?: string) => Promise<boolean>
  login: (operatorCode: string, pin: string) => Promise<boolean>
  logout: () => Promise<boolean>
  disconnect: () => Promise<void>
  clearErrors: () => void
  clearForceDisconnect: () => void
}

// ============================================================================
// Configuration
// ============================================================================

// Empty string = use relative URLs (production with Nginx proxy)
// Set VITE_API_URL for development (e.g., http://localhost:4500)
const API_URL = import.meta.env.VITE_API_URL || ''
const APP_VERSION = (window as any).desktopApp?.config?.appVersion || import.meta.env.VITE_APP_VERSION || '1.0.0'
// Dev mode: skip backend connection, allow UI testing
// Enabled via VITE_DEV_MODE=true in .env OR devMode=true in Electron config.json
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'
  || (window as unknown as Record<string, any>).desktopApp?.config?.devMode === true

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePOSConnection(): POSConnectionHook {
  // Connection instance ref
  const connectionRef = useRef<POSConnection | null>(null)

  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [isInitializing, setIsInitializing] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [locationName, setLocationName] = useState<string | null>(null)
  const [connectionInfo, setConnectionInfo] = useState<DeviceConnectionInfo | null>(null)

  const [session, setSession] = useState<SessionInfo | null>(null)
  const [settings, setSettings] = useState<DeviceSettings | null>(null)
  const [limits, setLimits] = useState<OperatorLimits | null>(null)
  const [deviceLocked, setDeviceLocked] = useState(false)
  const [deviceLockReason, setDeviceLockReason] = useState<string | null>(null)
  const [deviceLockedBy, setDeviceLockedBy] = useState<string | null>(null)

  const [deviceError, setDeviceError] = useState<DeviceErrorType>(null)
  const [activeSessionDetails, setActiveSessionDetails] = useState<{ ip?: string; browser?: string; connectedAt?: string; idleMinutes?: number } | null>(null)
  const [loginError, setLoginError] = useState<LoginErrorType>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Force disconnect state
  const [wasForceDisconnected, setWasForceDisconnected] = useState(false)
  const [forceDisconnectMessage, setForceDisconnectMessage] = useState<string | null>(null)

  // Server time sync
  const [serverTime, setServerTime] = useState<string | null>(null)

  // ==========================================================================
  // Initialize Connection (Discovery + Connect + DeviceLogin)
  // ==========================================================================

  const initialize = useCallback(async (customDeviceId?: string): Promise<boolean> => {
    setIsInitializing(true)
    setDeviceError(null)
    setLoginError(null)
    setErrorMessage(null)

    // Dev mode: skip backend connection, use mock data
    if (DEV_MODE) {
      console.log('[usePOSConnection] DEV MODE: Skipping backend connection')
      setDeviceId(customDeviceId || 'dev-device')
      setLocationName('Development POS')
      setSettings({
        currency: 'DOP',
        currencySymbol: 'RD$',
        coins: [25, 50, 100, 200],
        maxBetPerTip: 10000,
        decimalPlaces: 2,
        language: 'es'
      })
      setConnectionState('ready')
      setIsInitializing(false)
      return true
    }

    // Desktop app without deviceId configured → show config error
    const desktopConfig = (window as unknown as Record<string, any>).desktopApp?.config
    if (desktopConfig && !desktopConfig.devMode && !desktopConfig.deviceId) {
      console.error('[usePOSConnection] Desktop app has no deviceId configured')
      setDeviceError('DEVICE_NOT_CONFIGURED')
      setConnectionState('error')
      setIsInitializing(false)
      return false
    }

    try {
      // Get or create connection instance
      const connection = getPOSConnection({
        apiUrl: API_URL,
        events: {
          onStateChange: (state: POSConnectionState) => {
            setConnectionState(state.state)
            if (state.locationName) setLocationName(state.locationName)
            if (state.connectionInfo) setConnectionInfo(state.connectionInfo)
            if (state.session) setSession(state.session)
            if (state.settings) setSettings(state.settings)
            if (state.limits) setLimits(state.limits)
            // Handle device already connected error from OnConnectedAsync
            if (state.errorCode === 'DEVICE_ALREADY_CONNECTED') {
              setDeviceError('DEVICE_IN_USE')
              setConnectionState('error')
            }
          },
          onSessionExpired: () => {
            console.warn('[POS-EVENT] session_expired')
            setSession(null)
            setConnectionState('ready')
            setErrorMessage('Su sesion ha expirado. Inicie sesion nuevamente.')
          },
          onDisconnected: () => {
            console.warn('[POS-EVENT] signalr_disconnected')
            // Don't overwrite 'error' state (e.g. DEVICE_ALREADY_CONNECTED) with 'disconnected'
            // — the error modal needs the 'error' state to stay visible
            setConnectionState(prev => prev === 'error' ? prev : 'disconnected')
          },
          onReconnecting: () => {
            console.warn('[POS-EVENT] signalr_reconnecting')
            setConnectionState('reconnecting')
          },
          onReconnected: () => {
            console.info('[POS-EVENT] signalr_reconnected')
            setConnectionState('connected')
          },
          onForceLogout: (reason: string) => {
            console.warn('[POS-EVENT] force_logout:', reason)
            setSession(null)
            setConnectionState('ready')
            // NightlyCutoff: backend closed session at Location.ClosingTime. The session
            // is marked as un-balanced server-side; next operator login will trigger the
            // oldBalanceList flow which prints the pending balance Z.
            const msg = reason === 'NightlyCutoff'
              ? 'Sesion cerrada por horario. Se imprimira el balance al volver a entrar.'
              : `Sesion terminada: ${reason}`
            setErrorMessage(msg)
          },
          onForceDisconnect: (payload: ForceDisconnectPayload) => {
            console.warn('[POS-EVENT] force_disconnect:', payload.reason, payload.message)
            setSession(null)
            setLimits(null)
            setConnectionState('disconnected')
            setWasForceDisconnected(true)
            setForceDisconnectMessage(payload.message || 'Su sesión ha sido cerrada por el administrador')
          },
          onTimeSync: (payload: TimeSyncPayload) => {
            setServerTime(payload.serverTime)
          },
          onDeviceLock: (data) => {
            console.warn('[POS-EVENT] device_lock:', data)
            setDeviceLocked(data.locked)
            setDeviceLockReason(data.locked ? (data.reason || null) : null)
            setDeviceLockedBy(data.locked ? (data.lockedBy || null) : null)
          }
        }
      })
      connectionRef.current = connection

      // Step 1 & 2: Discovery + WebSocket Connect
      setConnectionState('connecting')
      console.info('[POS-EVENT] connecting deviceId:', customDeviceId || 'auto')
      await connection.connect(customDeviceId)
      setDeviceId(connection.getDeviceId())
      console.info('[POS-EVENT] signalr_connected deviceId:', connection.getDeviceId())

      // Step 3: Device Login
      setConnectionState('deviceLogin')
      const deviceResult = await connection.deviceLogin(APP_VERSION)

      if (deviceResult.success) {
        console.info('[POS-EVENT] device_login_ok location:', deviceResult.device.locationName)
        setLocationName(deviceResult.device.locationName)
        setSettings(deviceResult.settings)
        setConnectionState('ready')
        setIsInitializing(false)
        return true
      }

      console.error('[POS-EVENT] device_login_failed:', deviceResult.error)
      return false

    } catch (error) {
      console.error('[POS-EVENT] init_error:', error instanceof Error ? error.message : error)

      // Capture deviceId from connection if available
      const currentDeviceId = connectionRef.current?.getDeviceId() || null
      setDeviceId(currentDeviceId)

      // Only show modal for specific device errors
      if (error instanceof POSDiscoveryError) {
        if (error.code === 'DEVICE_NOT_FOUND') {
          setDeviceError('DEVICE_NOT_FOUND')
          if (error.deviceId) setDeviceId(error.deviceId)
        } else if (error.code === 'OFFLINE' || error.code === 'NETWORK_ERROR') {
          // No internet — schedule auto-retry after 3s and show offline state
          setDeviceError(error.code as DeviceErrorType)
          setTimeout(() => { initialize() }, 3000)
        }
      } else if (error instanceof POSDeviceLoginError) {
        if (error.code === 'DEVICE_NOT_FOUND') {
          setDeviceError('DEVICE_NOT_FOUND')
        } else if (error.code === 'DEVICE_ALREADY_CONNECTED') {
          // Common scenario after an unclean disconnect: backend hasn't cleaned up
          // the previous session yet (60s server timeout). Auto-retry every 5s
          // and show a soft status — NOT the hard "another location" modal.
          setDeviceError('DEVICE_IN_USE_RETRYING')
          setActiveSessionDetails(error.details || null)
          console.info('[POS] DEVICE_ALREADY_CONNECTED — auto-retry in 5s (stale session likely)')
          setTimeout(() => { initialize() }, 5000)
        }
        // Other errors (INTERNAL_ERROR, etc.) - no modal, just log
      }

      setConnectionState('error')
      setIsInitializing(false)
      return false
    }
  }, [])

  // ==========================================================================
  // Process Pending Sessions (auto-balance from previous session)
  // Reference: virtuales-pos usePOSConnection.ts:538-669
  // ==========================================================================

  const processPendingSessions = useCallback(async (connection: POSConnection, initResult: InitSuccess) => {
    const fmtDt = (d: Date | string) => {
      // Backend sends UTC timestamps as "yyyy-MM-dd HH:mm:ss" (no timezone suffix).
      // JS treats that string as LOCAL by default, so we'd print UTC hours as if they
      // were local → the balance ticket showed impossible values like inicio 22:29 UTC
      // vs fin 18:34 local. Force UTC parsing by appending 'Z' to bare timestamps.
      let date: Date
      if (typeof d === 'string') {
        const isoLike = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(d)
          ? d.replace(' ', 'T') + 'Z'
          : d
        date = new Date(isoLike)
      } else {
        date = d
      }
      return `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}:${date.getSeconds().toString().padStart(2,'0')}`
    }

    // 1. Process oldBalanceList: print balance + sendBalance for each pending session
    const oldBalances = initResult.oldBalanceList || []
    if (oldBalances.length > 0) {
      console.info(`[POS-EVENT] Processing ${oldBalances.length} old balance(s) from previous session(s)`)

      // Small delay so backend registers the new session first
      await new Promise(r => setTimeout(r, 500))

      for (const entry of oldBalances) {
        console.info(`[POS-EVENT] Old balance: operator=${entry.operatorID} session=${entry.sessionID} bet=${entry.totalBet} win=${entry.totalWin}`)

        // Print balance receipt for the old session
        const printData: PrintBalanceData = {
          operadorId: entry.operatorID,
          sesionId: entry.sessionID,
          iniciar: fmtDt(entry.startDT),
          fin: fmtDt(entry.endDT),
          posiciones: '-',
          tickets: String(entry.countTicket),
          cancelacionTickets: String(entry.countTicketCancel),
          apuesta: entry.totalBet.toFixed(2).replace('.', ','),
          ganancias: entry.totalWin.toFixed(2).replace('.', ','),
          balance: entry.totalCassa.toFixed(2).replace('.', ','),
        }

        await PrinterService.printBalance(printData).catch(err =>
          console.warn('[POS] Old balance print failed:', err)
        )

        // Send balance to backend to formally close the old session
        await connection.sendBalance({
          totalBet: entry.totalBet,
          totalWin: entry.totalWin,
          countTip: entry.countTip,
          countTicketCancel: entry.countTicketCancel,
          ticketData: '[]',
          isAutobalance: true,
          balanceSessionID: entry.sessionID,
        }).catch(err =>
          console.warn('[POS] Old balance send failed:', err)
        )
      }

      console.info(`[POS-EVENT] Old balances processed: ${oldBalances.length}`)
    }

    // 2. Autopay winning tickets from previous sessions FIRST (before balance)
    // Vendor sequence: sendTicketStatus("autopayout") → print receipt → then sendBalance
    const GAME_NAME_MAP: Record<string, string> = {
      dog6: '6 Galgos', dog: '6 Galgos', dos: '6 Galgos',
      dog8: '8 Galgos', doe: '8 Galgos',
      dog63: 'Dog6 Pro', dot: 'Dog6 Pro',
      horsec: 'Caballos', horse: 'Caballos', hoc: 'Caballos',
    }
    const ticketsToPay = initResult.oldTicketsToPayout || []
    if (ticketsToPay.length > 0) {
      console.info(`[POS-EVENT] Autopaying ${ticketsToPay.length} winning tickets from previous session`)
      for (const ticket of ticketsToPay) {
        try {
          // Print autopay receipt
          let printerStatus: { serverRunning: boolean; printerConnected: boolean } | null = null
          try {
            printerStatus = await PrinterService.checkStatus()
            posLogger.info(LogEvents.PRINTER_STATUS_SNAPSHOT, 'Printer status pre-autopay', {
              source: 'pre_autopay_session_start',
              serverRunning: printerStatus.serverRunning,
              printerConnected: printerStatus.printerConnected,
            })
            if (printerStatus.serverRunning && printerStatus.printerConnected) {
              const tips = ticket.tips || []
              const winningTips = tips.filter(t => (t.winAmount || 0) > 0)
              const mappedBets = winningTips.map((tip, i) => ({
                num: i + 1,
                jugada: tip.second ? `${tip.winner}-${tip.second}` : `${tip.winner}`,
                cuota: (tip.quote || 0).toFixed(1),
                monto: (tip.stake || 0).toFixed(2),
              }))
              const totalWin = tips.reduce((s, t) => s + (t.winAmount || 0), 0)
              const now = new Date()
              const autopayPrintRes = await PrinterService.printPayTicket({
                ticketId: ticket.ticketId,
                date: now.toLocaleDateString('es-ES'),
                time: now.toLocaleTimeString('es-ES'),
                gameId: ticket.gameId || '',
                sitio: connection.getLocationName?.() || '',
                terminalId: connection.getDeviceId?.() || '',
                operadorId: initResult.session.operatorId || '',
                juego: GAME_NAME_MAP[ticket.gameType] || ticket.gameType || '',
                bets: mappedBets,
                ganancia: totalWin > 0 ? totalWin.toFixed(2) : ticket.amount.toFixed(2),
                bonoWon: false,
                isAutopay: true,
              }).catch(err => ({ success: false as const, error: String(err) }))
              if (!autopayPrintRes.success) {
                posLogger.error(LogEvents.TICKET_PRINT_FAILED, 'Autopay (session start) print failed', {
                  ticketId: ticket.ticketId,
                  action: 'pay',
                  flowOrigin: 'autopay_session_start',
                  backendConfirmed: false,
                  printerStatusAtFailure: printerStatus,
                  errorDetail: autopayPrintRes.error ?? null,
                })
              }
            } else {
              // Printer not available — skip print but still sendTicketStatus below.
              // This is the "silent skip" that diverges from manual pay behavior.
              posLogger.warn(LogEvents.TICKET_PRINT_FAILED, 'Autopay (session start) print skipped: printer offline', {
                ticketId: ticket.ticketId,
                action: 'pay',
                flowOrigin: 'autopay_session_start',
                backendConfirmed: false,
                printerStatusAtFailure: printerStatus,
                errorDetail: 'printer_offline_skip',
              })
            }
          } catch (printErr) {
            console.warn(`[POS-EVENT] Autopay print failed: ${ticket.ticketId}`, printErr)
            posLogger.error(LogEvents.TICKET_PRINT_FAILED, 'Autopay (session start) print threw', {
              ticketId: ticket.ticketId,
              action: 'pay',
              flowOrigin: 'autopay_session_start',
              backendConfirmed: false,
              printerStatusAtFailure: printerStatus,
              errorDetail: printErr instanceof Error ? printErr.message : String(printErr),
            })
          }
          // Mark as autopaid in backend
          await connection.sendTicketStatus(ticket.ticketId, 'autopayout')
          console.info(`[POS-EVENT] Autopaid: ${ticket.ticketId} $${ticket.amount}`)
        } catch (err) {
          console.warn(`[POS-EVENT] Autopay failed: ${ticket.ticketId}`, err)
        }
      }
    }

    // 3. Process resume session: auto-close ONLY if the previous session is old
    //    enough that it represents a real day-of-work. Recent sessions (<8h) are
    //    just reconnects (wifi blip, browser refresh) — let the operator continue
    //    in the same session to avoid inflating session counts and wasting paper
    //    on empty balance prints. Sessions are formally closed only by:
    //    - explicit cashier balance, OR
    //    - NightlyCutoff (backend) at Location.ClosingTime → ForceLogout event.
    const resumeTickets = initResult.resumeTicketList || []
    if (initResult.resumeStartDateTime) {
      const hasPending = resumeTickets.some(t => t.status === 'pending')
      const resumeStart = new Date(initResult.resumeStartDateTime)
      const ageHours = (Date.now() - resumeStart.getTime()) / 3_600_000
      const isOldEnoughToBalance = ageHours >= 8

      // Guard against the "stale empty resume" churn (Phase 2 / sendBalance no-op).
      //
      // The backend keeps returning the SAME old resumeStartDateTime on every
      // init because sendBalance is still a no-op (it never formally closes the
      // prior session). When the resume carries no activity at all
      // (no tickets, zero stake/win, no oldBalance), the auto-balance branch
      // below would run printBalance + sendBalance + reLogin() on EVERY login —
      // a pointless re-init that throws the transient "✓ ERROR Intente de nuevo"
      // and disrupts the live socket / race feed. There is nothing to balance,
      // so skip it entirely. The legitimate "real pending session to balance"
      // path (non-empty resume) is unaffected.
      const totalStake = initResult.resumeStake ?? resumeTickets.reduce((s, t) => s + t.totalAmount, 0)
      const totalWinAmt = initResult.resumeWin ?? resumeTickets.reduce((s, t) => s + t.payout, 0)
      const hasOldBalances = (initResult.oldBalanceList?.length ?? 0) > 0
      const isEmptyResume =
        resumeTickets.length === 0 &&
        totalStake === 0 &&
        totalWinAmt === 0 &&
        !hasOldBalances

      if (isEmptyResume) {
        // No activity to close — resume the existing session silently. No
        // balance print, no sendBalance, no reLogin (avoids the churn loop).
        console.info(`[POS-EVENT] Resume session is empty (no tickets/stake/win, age ${ageHours.toFixed(1)}h) — silent resume, no auto-balance`)
      } else if (!hasPending && isOldEnoughToBalance) {
        const totalBet = initResult.resumeStake ?? resumeTickets.reduce((s, t) => s + t.totalAmount, 0)
        const totalWin = initResult.resumeWin ?? resumeTickets.reduce((s, t) => s + t.payout, 0)
        const totalTips = resumeTickets.filter(t => t.status !== 'cancelled').reduce((s, t) => s + (t.bets?.length || 1), 0)

        console.info(`[POS-EVENT] Resume auto-balance: bet=${totalBet} win=${totalWin} tickets=${resumeTickets.length}`)

        const printData: PrintBalanceData = {
          operadorId: initResult.session.operatorId,
          sesionId: initResult.session.sessionCode,
          iniciar: fmtDt(initResult.resumeStartDateTime),
          fin: fmtDt(new Date()),
          posiciones: String(totalTips),
          tickets: String(resumeTickets.filter(t => t.status !== 'cancelled').length),
          cancelacionTickets: String(resumeTickets.filter(t => t.status === 'cancelled').length),
          apuesta: totalBet.toFixed(2).replace('.', ','),
          ganancias: totalWin.toFixed(2).replace('.', ','),
          balance: (totalBet - totalWin).toFixed(2).replace('.', ','),
        }

        await PrinterService.printBalance(printData).catch(err =>
          console.warn('[POS] Resume balance print failed:', err)
        )

        await connection.sendBalance({
          totalBet,
          totalWin,
          countTip: resumeTickets.filter(t => t.status !== 'cancelled').length,
          countTicketCancel: resumeTickets.filter(t => t.status === 'cancelled').length,
          ticketData: JSON.stringify(resumeTickets),
          isAutobalance: true,
          balanceSessionID: initResult.session.sessionCode,
        }).catch(err =>
          console.warn('[POS] Resume balance send failed:', err)
        )

        // Re-login to start fresh session
        console.info('[POS-EVENT] Resume session closed — re-logging in...')
        await connection.reLogin()
      } else if (!hasPending && !isOldEnoughToBalance) {
        // Recent reconnect (wifi blip / browser refresh): silently resume same session.
        console.info(`[POS-EVENT] Resume session is recent (${ageHours.toFixed(1)}h) — silent resume, no auto-balance`)
      } else {
        // Pending tickets exist — load them into the current session (operator must resolve manually)
        console.info(`[POS-EVENT] Resume session has ${resumeTickets.filter(t => t.status === 'pending').length} pending tickets — not auto-closing`)
      }
    }
  }, [])

  // ==========================================================================
  // User Login (Init)
  // ==========================================================================

  const login = useCallback(async (operatorCode: string, pin: string): Promise<boolean> => {
    setIsLoggingIn(true)
    setLoginError(null)
    setErrorMessage(null)

    // Dev mode: accept any credentials
    if (DEV_MODE) {
      console.log('[usePOSConnection] DEV MODE: Mock login for', operatorCode)
      setSession({
        sessionId: 'dev-session-' + Date.now(),
        sessionCode: 'dev123456789',
        deviceId: 'dev-device',
        locationId: '001-001-002',
        locationName: 'Development POS',
        operatorId: operatorCode,
        operatorName: 'Dev Operator',
        balance: 50000
      })
      setConnectionState('authenticated')
      setIsLoggingIn(false)
      return true
    }

    try {
      const connection = connectionRef.current
      if (!connection) {
        setErrorMessage('No conectado al servidor')
        setIsLoggingIn(false)
        return false
      }

      const result: InitResult = await connection.login(operatorCode, pin)

      if (result.success) {
        console.info('[POS-EVENT] login_success operator:', operatorCode, 'location:', result.session?.locationName)
        setSession(result.session)
        setLimits(result.limits || null)
        setConnectionState('authenticated')
        setIsLoggingIn(false)

        posLogger.setOperator(operatorCode, result.session?.sessionId)
        posLogger.info(LogEvents.SESSION_STARTED, 'DeviceSession created post-login', {
          sessionId: result.session?.sessionId,
          sessionCode: result.session?.sessionCode,
          locationId: result.session?.locationId,
          locationName: result.session?.locationName,
          operatorId: operatorCode,
        })

        // Send login log
        await connection.sendLog(`User Logged in: ${operatorCode}`, 'info')

        // Process pending sessions from previous operator (auto-balance)
        // Reference: virtuales-pos usePOSConnection.ts:538-669
        await processPendingSessions(connection, result)

        return true
      }

      console.warn('[POS-EVENT] login_failed operator:', operatorCode, 'error:', result.error)
      posLogger.warn(LogEvents.LOGIN_FAILED, 'Login failed', {
        operatorId: operatorCode,
        error: result.error,
        errorMessage: result.errorMessage,
      })
      return false

    } catch (error) {
      console.error('[POS-EVENT] login_error:', error instanceof Error ? error.message : error)
      posLogger.error(LogEvents.LOGIN_FAILED, 'Login threw', {
        operatorId: operatorCode,
        error: error instanceof Error ? error.message : String(error),
      })

      if (error instanceof POSLoginError) {
        switch (error.code) {
          case 'EMPTY_FIELDS':
            setLoginError('EMPTY_FIELDS')
            setErrorMessage('Please fill in all input fields')
            break
          case 'INVALID_CREDENTIALS':
            setLoginError('INVALID_CREDENTIALS')
            setErrorMessage('Invalid Operator ID or Pin')
            break
          case 'NO_DEVICE':
            setErrorMessage('Error de configuracion. Reconectando...')
            // Should re-initialize
            break
          case 'NO_SESSION':
            setErrorMessage('Conexion perdida. Reconectando...')
            // Should re-initialize
            break
          default:
            setErrorMessage(error.message || 'Error al iniciar sesion')
        }
      } else {
        setErrorMessage('Error al iniciar sesion. Intente nuevamente.')
      }

      setIsLoggingIn(false)
      return false
    }
  }, [])

  // ==========================================================================
  // Logout
  // ==========================================================================

  const logout = useCallback(async (): Promise<boolean> => {
    try {
      const connection = connectionRef.current
      if (!connection) return false

      const success = await connection.logout()
      if (success) {
        console.info('[POS-EVENT] logout_success')
        setSession(null)
        setLimits(null)
        setConnectionState('ready')
      }
      return success

    } catch (error) {
      console.error('[POS-EVENT] logout_error:', error instanceof Error ? error.message : error)
      return false
    }
  }, [])

  // ==========================================================================
  // Disconnect
  // ==========================================================================

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await connectionRef.current?.disconnect()
      resetPOSConnection()
      connectionRef.current = null

      setSession(null)
      setSettings(null)
      setLimits(null)
      setDeviceId(null)
      setLocationName(null)
      setConnectionInfo(null)
      setConnectionState('disconnected')

    } catch (error) {
      console.error('[usePOSConnection] Disconnect error:', error)
    }
  }, [])

  // ==========================================================================
  // Clear Errors
  // ==========================================================================

  const clearErrors = useCallback(() => {
    setDeviceError(null)
    setLoginError(null)
    setErrorMessage(null)
  }, [])

  const clearForceDisconnect = useCallback(() => {
    setWasForceDisconnected(false)
    setForceDisconnectMessage(null)
  }, [])

  // ==========================================================================
  // Cleanup on unmount + beforeunload/pagehide
  // ==========================================================================

  useEffect(() => {
    const handlePageClose = () => {
      connectionRef.current?.gracefulShutdown()
    }

    // beforeunload fires when closing tab/browser (desktop browsers)
    window.addEventListener('beforeunload', handlePageClose)
    // pagehide is more reliable on mobile and in iframes
    window.addEventListener('pagehide', handlePageClose)

    return () => {
      window.removeEventListener('beforeunload', handlePageClose)
      window.removeEventListener('pagehide', handlePageClose)
      connectionRef.current?.gracefulShutdown()
    }
  }, [])

  // ==========================================================================
  // Return Hook Interface
  // ==========================================================================

  return {
    // State
    connectionState,
    isInitializing,
    isLoggingIn,
    deviceId,
    locationName,
    connectionInfo,
    session,
    settings,
    limits,
    deviceError,
    activeSessionDetails,
    loginError,
    errorMessage,

    // Force disconnect info
    wasForceDisconnected,
    forceDisconnectMessage,

    // Server time sync
    serverTime,

    // Device lock
    deviceLocked,
    deviceLockReason,
    deviceLockedBy,

    // Actions
    initialize,
    login,
    logout,
    disconnect,
    clearErrors,
    clearForceDisconnect
  }
}

export default usePOSConnection
