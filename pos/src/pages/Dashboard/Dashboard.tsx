import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import ScaleWrapper from '@/components/ScaleWrapper/ScaleWrapper'
import { useRaceData, type GamePrefix } from '@/hooks/useRaceData'
import { useNumberSelection } from '@/hooks/useNumberSelection'
import { useBetManagement } from '@/hooks/useBetManagement'
import { getGameTheme, getGameThemeForSkin, getThemeCSSVariables, type GameType } from '@/hooks/useGameTheme'
import { useSkin } from '@/contexts/SkinContext'
import { getGameAssets } from '@/hooks/useGameAssets'
import { useImagePreload } from '@/hooks/useImagePreload'
import { useRealRaceData, type FormattedRaceResult } from '@/hooks/useRealRaceData'
import { useSalesTracker } from '@/hooks/useSalesTracker'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import Loading from '@/components/Loading'
import { usePOSConnectionState } from '@/contexts/POSConnectionContext'
import { getPOSConnection } from '@/services/posConnection'
import { posLogger, LogEvents } from '@/services/posLogger'
import { BetType, GAME_CONFIGS } from '@/types/websocket'
import type { GetTicketSuccess, GetTicketTipResult } from '@/types/websocket'
import { PrinterService, setPrinterMode } from '@/services/printer'
import type { PrintTicketData, PrintBalanceData } from '@/services/printer'
import PrinterErrorModal from '@/components/PrinterErrorModal'
import { savePending, removePending, getPending, clearExpired } from '@/services/pendingTickets'
import GameSlide from './GameSlide'
import DashboardOverlays from './DashboardOverlays'
import OrderTicket from '@/components/OrderTicket'
import BaseModal from '@/components/BaseModal'
import RechargeModal from '@/components/RechargeModal/RechargeModal'
import type { PrepTicket } from '@/components/OrderTicket/OrderTicket'
import styles from './Dashboard.module.css'

// Import background images per game
import backgroundDos from '@/assets/svg/bg_214_backgroundImage_dos_backgroundImage_stdText.jpeg'
import backgroundDoe from '@/assets/svg/bg_111_doe_backgroundImage_backgroundImage_stdText_gameSe.jpeg'
import backgroundHoc from '@/assets/svg/bg_307_hoc_backgroundImage_backgroundImage_stdText.jpeg'

// Constants moved outside component to avoid recreation on each render
// Order: dog6(dos), dog8(doe), trifecta(dot), horse(hoc)
const GAME_PREFIXES: GamePrefix[] = ['dos', 'doe', 'dot', 'hoc']
const RUNNERS_BY_GAME: Record<GamePrefix, number> = {
  dos: 6,
  dot: 6,  // DOT has different layout, skip for now
  doe: 8,
  hoc: 7
}
// Map game prefix to game type for ticket submission
const GAME_PREFIX_TO_TYPE: Record<GamePrefix, string> = {
  dos: 'dog6',
  dot: 'dog63',
  doe: 'dog8',
  hoc: 'horsec'
}

// Discovery (`connectionInfo.games`) lists games by *type* name (e.g.
// "dog", "dog8"), but the dashboard works in POS *prefixes* ("dos", "doe").
// Translate the types we support so the carousel can match them. Unknown
// types pass through unchanged (and get filtered out by GAME_PREFIXES).
const DISCOVERY_TYPE_TO_PREFIX: Record<string, GamePrefix> = {
  dog: 'dos',
  dog6: 'dos',
  dog8: 'doe',
}

// Reverse map: backend ticket gameTypeId → game prefix. Derived from
// GAME_CONFIGS so values stay in sync. The extra 241 entry covers
// horse_classic ("Caballos") on devices like Fortuna03 — the backend
// uses a different gameTypeId than the modern 251 horsec.
const TICKET_TYPE_ID_TO_PREFIX: Record<number, GamePrefix> = {
  ...Object.fromEntries(
    (Object.entries(GAME_PREFIX_TO_TYPE) as [GamePrefix, string][]).map(
      ([prefix, key]) => [GAME_CONFIGS[key].gameTypeId, prefix]
    )
  ),
  241: 'hoc'
}

// Background images by game
const BACKGROUND_IMAGES: Record<'dos' | 'doe' | 'hoc', string> = {
  dos: backgroundDos,
  doe: backgroundDoe,
  hoc: backgroundHoc
}

// Consolidate raw bet rows (one entry per coin click) into one entry per
// (first, second) selection, summing amounts. Matches the format the
// original ticket uses, so the cancellation receipt prints the same row
// count as the bet receipt instead of listing every individual click.
type ConsolidatedBet = { first: number; second?: number; amount: number }
function consolidateTicketBets<T extends { first: number; second?: number | null; amount: number }>(rawBets: T[]): ConsolidatedBet[] {
  const grouped = new Map<string, ConsolidatedBet>()
  for (const b of rawBets) {
    const key = `${b.first}_${b.second ?? 0}`
    const existing = grouped.get(key)
    if (existing) {
      existing.amount += b.amount
    } else {
      grouped.set(key, { first: b.first, second: b.second ?? undefined, amount: b.amount })
    }
  }
  return Array.from(grouped.values())
}

interface DashboardProps {
  onLogout?: () => void
  onReady?: () => void
}

export default function Dashboard({ onLogout, onReady }: DashboardProps) {
  // Preload all game images in background for instant switching
  useImagePreload()

  // POS Connection state - for showing connection lost overlay and timezone
  const { connectionState, connectionInfo, session, locationName, limits: operatorLimits } = usePOSConnectionState()
  const isSignalRDisconnectedRaw = connectionState === 'disconnected' || connectionState === 'error'
  const isReconnecting = connectionState === 'reconnecting'

  // Debounced SignalR disconnection state
  // Only show overlay after 3 seconds of disconnection AND if we were previously connected
  const [showSignalRDisconnected, setShowSignalRDisconnected] = useState(false)
  const signalRWasEverConnected = useRef(false)
  const signalRDisconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const isConnected = connectionState === 'connected'
    if (isConnected) {
      // Connected - clear any pending timer and hide overlay
      signalRWasEverConnected.current = true
      if (signalRDisconnectTimer.current) {
        clearTimeout(signalRDisconnectTimer.current)
        signalRDisconnectTimer.current = null
      }
      setShowSignalRDisconnected(false)
    } else if (signalRWasEverConnected.current && isSignalRDisconnectedRaw && !signalRDisconnectTimer.current) {
      // Disconnected after being connected - start 3s timer
      signalRDisconnectTimer.current = setTimeout(() => {
        setShowSignalRDisconnected(true)
        signalRDisconnectTimer.current = null
      }, 3000)
    }

    return () => {
      if (signalRDisconnectTimer.current) {
        clearTimeout(signalRDisconnectTimer.current)
      }
    }
  }, [connectionState, isSignalRDisconnectedRaw])

  // Use debounced state for overlay display
  const isConnectionLost = showSignalRDisconnected

  // Ready state - starts false, becomes true after React paints everything
  const [isReady, setIsReady] = useState(false)

  // Wait for React to finish painting before showing the dashboard
  useEffect(() => {
    // Double requestAnimationFrame ensures browser has painted
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsReady(true)
        onReady?.()
      })
    })
  }, [onReady])

  // Read enabled games from desktop config (e.g. ["doe"]) or use web defaults
  const desktopGames = (window as unknown as Record<string, unknown>).desktopApp
    ? ((window as unknown as Record<string, { config?: { games?: string[] } }>).desktopApp?.config?.games || [])
    : []
  // Games from discovery API (connectionInfo), mapped from type names to
  // POS prefixes (e.g. "dog"/"dog8" → "dos"/"doe"). Direct prefixes still match.
  const discoveryGames: string[] = ((connectionInfo as any)?.games || [])
    .map((g: string) => DISCOVERY_TYPE_TO_PREFIX[g] ?? g)
  const WEB_DEFAULT_GAMES: GamePrefix[] = ['dos', 'doe']
  const enabledPrefixes = desktopGames.length > 0
    ? GAME_PREFIXES.filter(g => desktopGames.includes(g))
    : discoveryGames.length > 0
      ? GAME_PREFIXES.filter(g => discoveryGames.includes(g))
      : GAME_PREFIXES.filter(g => WEB_DEFAULT_GAMES.includes(g))
  const defaultGame = enabledPrefixes[0] || 'dos'

  // Real-time race data from relay server with game selection
  const {
    gamesConfig,
    activeGame,
    setActiveGame
  } = useRaceData({
    enabled: false, // Disabled - using custom hooks
    activeGame: defaultGame
  })

  // Race data WebSocket — resolved from API discover (simulatorUrl field)
  // Fallback chain: discover API → ?simulatorUrl= query param → auto-constructed from host
  const desktopConfig = (window as unknown as Record<string, unknown>).desktopApp as { config?: { simulatorUrl?: string } } | undefined
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const simulatorUrlParam = urlParams?.get('simulatorUrl') ?? null

  // Priority: API discover > desktop config > query param > auto-constructed
  const apiSimulatorUrl = connectionInfo?.simulatorUrl ?? null
  const desktopSimulatorUrl = desktopConfig?.config?.simulatorUrl ?? null
  const relayUrl = apiSimulatorUrl || desktopSimulatorUrl || simulatorUrlParam || undefined

  const { connected: relayConnected, availableGames, getGameData, getGameOdds, getGameResults, isDataStale, sourceMode } = useRealRaceData({
    relayUrl,
    timezone: connectionInfo?.timeZone
  })

  // Get data for active game
  const currentData = getGameData(activeGame)
  const oddsData = getGameOdds(activeGame)
  const resultsData = getGameResults(activeGame)
  // runningRaceNumber: the race currently running (for overlay title)
  // raceNumber: the race whose info we're displaying (may be next race)
  const { raceNumber, serverTime, raceStartTime: _raceStartTime, raceState, runningRaceNumber: _runningRaceNumber, runningRaceId: _runningRaceId } = currentData

  // Wait for relay WebSocket to connect and have race data before hiding loading overlay
  const [waitingForData, setWaitingForData] = useState(true)
  const [relayTimeout, setRelayTimeout] = useState(false)
  const [showPrinterError, setShowPrinterError] = useState(false)
  const [showRecharge, setShowRecharge] = useState(false)

  // Set printer mode from discovery and check printer availability on startup
  useEffect(() => {
    const printerMode = connectionInfo?.printerMode as string | undefined
    if (printerMode) setPrinterMode(printerMode)

    const printerRequired = connectionInfo?.printerRequired ?? true
    if (printerRequired) {
      // Retry printer check: first attempt after 1s, retry after 3s if failed
      const checkWithRetry = async () => {
        await new Promise(r => setTimeout(r, 1000))
        const status = await PrinterService.checkStatus()
        if (!status.serverRunning) {
          // Retry once after 3s before showing error
          await new Promise(r => setTimeout(r, 3000))
          const retry = await PrinterService.checkStatus()
          if (!retry.serverRunning) {
            setShowPrinterError(true)
          }
        }
      }
      checkWithRetry()
    }
  }, [connectionInfo?.printerMode, connectionInfo?.printerRequired])

  const relayLoggedRef = useRef(false)
  useEffect(() => {
    if (relayConnected && availableGames.length > 0) {
      if (!relayLoggedRef.current) {
        console.info(`[POS-EVENT] relay_ready games=${availableGames.join(',')} url=${relayUrl}`)
        relayLoggedRef.current = true
      }
      setWaitingForData(false)
      setRelayTimeout(false)
    } else if (!relayConnected) {
      relayLoggedRef.current = false
    }
  }, [relayConnected, availableGames])

  // Determine if a relay URL is configured
  const hasRelayConfigured = Boolean(relayUrl)

  // Safety timeout: if NO relay is configured, unblock after 15s (SignalR-only mode).
  // If relay IS configured but can't connect, keep blocking but show error message.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasRelayConfigured) {
        // Relay configured but no data yet — show error, keep blocking
        setRelayTimeout(true)
      } else {
        // No relay configured — unblock (SignalR-only mode)
        setWaitingForData(false)
      }
    }, 15000)
    return () => clearTimeout(timer)
  }, [hasRelayConfigured])

  // Detect stale race data — no timeSync means no data flowing
  // Don't check stale until 30s after data loaded (avoid false positive on startup)
  const [staleCheckReady, setStaleCheckReady] = useState(false)
  useEffect(() => {
    if (!waitingForData) {
      const t = setTimeout(() => setStaleCheckReady(true), 5000)
      return () => clearTimeout(t)
    }
  }, [waitingForData])
  const isRelayStale = staleCheckReady && relayConnected && isDataStale(25000)

  // Sales tracking - accumulates tickets created during the session
  const { tickets, salesRecords, addTicket, addWalletMovement, updateTicketStatus, markTicketPaid, cancelTicket, cancelPendingTickets, clearTickets, replaceTickets } = useSalesTracker()

  // On mount, hydrate the sales list from SignalR Init resumeTicketList.
  // If there is an unclosed previous session, its tickets come back here and
  // we restore them into state so the operator sees them in Ventas. When there
  // is no resume data, start fresh (clearTickets).
  useEffect(() => {
    const conn = getPOSConnection()
    const resume = conn.getResumeTickets?.() ?? []
    if (resume.length === 0) {
      clearTickets()
      return
    }

    const BACKEND_TO_PREFIX: Record<string, string> = {
      dog6: 'dos', dog8: 'doe', dog63: 'dot', horsec: 'hoc', horse_classic: 'hoc'
    }
    const mapStatus = (s: string): 'pending' | 'win' | 'lost' | 'cancelled' => {
      switch (s) {
        case 'pending': return 'pending'
        case 'won':
        case 'paid': return 'win'
        case 'lost': return 'lost'
        case 'cancelled': return 'cancelled'
        default: return 'pending'
      }
    }
    const parseUtc = (iso?: string): Date => {
      if (!iso) return new Date()
      const m = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(iso)
        ? iso.replace(' ', 'T') + 'Z'
        : iso
      return new Date(m)
    }

    const hydrated = resume.map(rt => {
      const gameId = rt.gameId || ''
      const parts = gameId.split('_')
      const dateRace = parts[2] || ''
      const raceNumber = dateRace.slice(-4)
      const bets = (rt.bets ?? []).map(b => ({
        first: b.selection1 ?? 0,
        second: b.selection2 ?? undefined,
        amount: b.amount
      }))
      const total = rt.totalAmount ?? rt.amount ?? bets.reduce((s, b) => s + b.amount, 0)
      return {
        ticketId: rt.ticketId,
        gameId,
        gameType: rt.gameType,
        gamePrefix: BACKEND_TO_PREFIX[rt.gameType] ?? rt.gameType,
        raceNumber,
        bets,
        totalAmount: total,
        createdAt: parseUtc(rt.createdAt),
        status: mapStatus(rt.status),
        payout: rt.payout ?? rt.winAmount ?? 0,
        isPaid: rt.status === 'paid' || (rt as any).isPaid === true,
      }
    })

    // Newest first (matches addTicket ordering)
    hydrated.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    replaceTickets(hydrated)
    console.info(`[POS-EVENT] Hydrated ${hydrated.length} tickets from resume session`)
  }, [session?.sessionCode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cancel pending tickets when connection is lost (uses RAW state, not debounced)
  // This protects against tickets being left in "pending" state when we can't verify results
  const prevSignalRConnectedRaw = useRef(true)
  // Track if there was ever a real disconnection (to avoid logging "restored" on first connect)
  const signalRHadDisconnection = useRef(false)

  useEffect(() => {
    // SignalR disconnection - main operations server (immediate, not debounced)
    if (prevSignalRConnectedRaw.current && isSignalRDisconnectedRaw && signalRWasEverConnected.current) {
      signalRHadDisconnection.current = true
      posLogger.warn(LogEvents.WS_DISCONNECTED, 'SignalR disconnected', {
        channel: 'signalr',
        pendingTicketsCancelled: true,
      })
      cancelPendingTickets('signalr_connection_lost')
    } else if (!prevSignalRConnectedRaw.current && !isSignalRDisconnectedRaw && signalRHadDisconnection.current) {
      posLogger.info(LogEvents.WS_RECONNECTED, 'SignalR connection restored', { channel: 'signalr' })
    }
    prevSignalRConnectedRaw.current = !isSignalRDisconnectedRaw
  }, [isSignalRDisconnectedRaw, cancelPendingTickets])

  // Relay disconnection effect removed — relay disabled

  // Retry pending tickets on reconnect (print-first flow recovery)
  // When the session reconnects and authenticates, check localStorage for tickets
  // that were reserved+printed but never confirmed (e.g. due to network loss).
  useEffect(() => {
    if (connectionState !== 'authenticated') return
    if (!relayConnected) return

    const retryPending = async () => {
      clearExpired()
      const pending = getPending()
      if (pending.length === 0) return

      console.log(`[PendingRetry] Found ${pending.length} pending ticket(s), retrying...`)
      const connection = getPOSConnection()

      for (const record of pending) {
        try {
          // Try to print again first
          const printResult = await PrinterService.printTicket(record.printData)
          if (printResult.success) {
            // Print OK — confirm the reservation
            const confirmResult = await connection.confirmTicket(record.ticketNumber)
            if (confirmResult.success) {
              console.log(`[PendingRetry] Confirmed ticket ${record.ticketNumber}`)
              removePending(record.ticketNumber)
              // Add to sales tracker
              addTicket(
                record.ticketNumber,
                record.gameId,
                record.gameType,
                record.gameName as GamePrefix,
                record.printData.bets.map(b => {
                  const parts = b.jugada.split('-')
                  return {
                    first: parseInt(parts[0], 10),
                    second: parts[1] ? parseInt(parts[1], 10) : undefined,
                    amount: parseFloat(b.monto)
                  }
                }),
                record.printData.maxBenefit,
                record.printData.bets.map(b => b.cuota)
              )
            } else if (confirmResult.error === 'RESERVATION_EXPIRED') {
              // Reservation expired — ticket was never charged, just clean up
              console.log(`[PendingRetry] Reservation expired for ${record.ticketNumber}, removing`)
              removePending(record.ticketNumber)
            } else {
              console.warn(`[PendingRetry] Confirm failed for ${record.ticketNumber}:`, confirmResult.error)
              removePending(record.ticketNumber)
            }
          } else {
            console.warn(`[PendingRetry] Print still failing for ${record.ticketNumber}:`, printResult.error)
            // Leave in localStorage for next retry
          }
        } catch (error) {
          console.error(`[PendingRetry] Error retrying ${record.ticketNumber}:`, error)
        }
      }
    }

    retryPending()
  }, [connectionState, relayConnected, addTicket])

  // Update ticket status when race results arrive — for ALL games, not just the active tab.
  // The POS may have open pending tickets across multiple games (dos/doe/dot/hoc) because
  // the operator bets on one game, switches tabs, bets on another, etc. If we only processed
  // results for the active tab, tickets of inactive games would stay "pending" forever,
  // leaving them excluded from the balance at close-of-shift.
  const prevResultsByGameRef = useRef<Record<string, FormattedRaceResult[]>>({})
  useEffect(() => {
    const games: GamePrefix[] = ['dos', 'doe', 'dot', 'hoc']
    for (const game of games) {
      const gameResults = getGameResults(game)
      if (!gameResults || gameResults.length === 0) continue

      const prevResults = prevResultsByGameRef.current[game] || []
      const newResults = gameResults.filter(
        r => !prevResults.some(pr => pr.raceNumber === r.raceNumber)
      )
      if (newResults.length === 0) {
        prevResultsByGameRef.current[game] = gameResults
        continue
      }

      const allOdds = getGameOdds(game)
      const gameType = GAME_PREFIX_TO_TYPE[game]
      for (const result of newResults) {
        const raceOdds = allOdds.find(o => o.raceNumber === result.raceNumber)
        updateTicketStatus({
          raceId: result.raceNumber,
          gameType,
          first: result.first,
          second: result.second,
          odds: raceOdds?.odds,
          bonus: result.multiplier,
        })
      }
      prevResultsByGameRef.current[game] = gameResults
    }
  }, [getGameResults, getGameOdds, updateTicketStatus])

  // Overlay exit animation state
  const [isOverlayExiting, setIsOverlayExiting] = useState(false)
  const prevRaceStateRef = useRef(raceState)
  const prevActiveGameRef = useRef(activeGame)

  // Handle overlay exit animation only
  // Show/hide is derived synchronously from raceState (no useEffect delay)
  useEffect(() => {
    const prevState = prevRaceStateRef.current
    const prevGame = prevActiveGameRef.current
    const gameChanged = prevGame !== activeGame

    prevRaceStateRef.current = raceState
    prevActiveGameRef.current = activeGame

    // Log race state changes
    if (raceState !== prevState) {
      console.info(`[POS-EVENT] race_state_change game=${activeGame} race=${raceNumber} ${prevState}->${raceState}`)
    }
    if (gameChanged) {
      console.info(`[POS-EVENT] game_switch ${prevGame}->${activeGame}`)
    }

    if (raceState === 'closing' || raceState === 'running') {
      setIsOverlayExiting(false)
      // Switch away from RESULTADOS during race to avoid spoilers
      if (activeMenu === 'RESULTADOS') setActiveMenu('JUGADA')
    } else if (gameChanged) {
      // Switched to a game in betting state - no exit animation
      setIsOverlayExiting(false)
    } else if (prevState === 'running' && raceState === 'betting') {
      // Race ended on same game - start exit animation
      setIsOverlayExiting(true)
      setTimeout(() => {
        setIsOverlayExiting(false)
      }, 2000) // Match fadeOut animation duration
    }
  }, [raceState, activeGame])

  // Overlay visible only when race is running (after closing dialog), or during exit animation
  const showOverlay = raceState === 'running' || isOverlayExiting

  // Timer now handled inside each GameSlide (per-game timer)

  // Get runners count from config or use defaults
  const totalRunners = gamesConfig?.[activeGame]?.runners ?? RUNNERS_BY_GAME[activeGame]

  // Get game key for current game (fallback to DOS for DOT)
  const gameKey = activeGame === 'dot' ? 'dos' : activeGame as 'dos' | 'doe' | 'hoc'

  // Background for current game - still needed for ScaleWrapper
  const currentBackground = useMemo(() => BACKGROUND_IMAGES[gameKey], [gameKey])

  // Game theme and assets based on active game, adjusted for the active skin
  // ('web' skin returns a unified corporate palette but keeps runnerCount).
  const { skin } = useSkin()
  const gameTheme = useMemo(
    () => getGameThemeForSkin(activeGame as GameType, skin),
    [activeGame, skin],
  )

  const [activeMenu, setActiveMenu] = useState('JUGADA')
  const [ticketNotification, setTicketNotification] = useState<{ show: boolean; ticketId: string; total: number } | null>(null)
  const [betsExpanded, setBetsExpanded] = useState(false)

  // When switching games, always collapse the bet panel. Previously the state
  // was shared across games, so a panel opened in DOS kept covering elements
  // in DOE/DOT/HOC (especially visible while a race animation was running in
  // the new game). The panel content itself is already partitioned per game
  // by useBetManagement, so showing it expanded on entry would be misleading.
  useEffect(() => {
    setBetsExpanded(false)
  }, [activeGame])
  const [prepTickets] = useState<PrepTicket[]>([]) // TODO: Connect to actual prep tickets from mobile
  const [showOrderTicket, setShowOrderTicket] = useState(false)
  const pendingTickets = prepTickets.filter(t => t.status === 'pending').length
  const [tipLimitMessage, setTipLimitMessage] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [resultsPageSize, setResultsPageSize] = useState<5 | 10 | 15 | 20>(15)
  const [cuotasPageSize, setCuotasPageSize] = useState<5 | 10 | 15 | 20>(15)
  const [showTicketIdInput, setShowTicketIdInput] = useState(false)
  const [ticketIdValue, setTicketIdValue] = useState('')
  const [searchedTicket, setSearchedTicket] = useState<GetTicketSuccess | null>(null)
  const [ticketSearchError, setTicketSearchError] = useState<string | null>(null)
  const [isSearchingTicket, setIsSearchingTicket] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [isClosingSettings, setIsClosingSettings] = useState(false)
  const [autoChangeEnabled, setAutoChangeEnabled] = useState(true)
  const [reprintingIndex, setReprintingIndex] = useState<number | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isBalancing, setIsBalancing] = useState(false)
  const [printingCuotasCount, setPrintingCuotasCount] = useState<number | null>(null)
  const [printingResultsCount, setPrintingResultsCount] = useState<number | null>(null)

  // Printer status cache — avoids HTTP round-trip on rapid successive tickets
  const printerCacheRef = useRef<{ ok: boolean; serverRunning: boolean; printerConnected: boolean; time: number }>({ ok: false, serverRunning: false, printerConnected: false, time: 0 })
  const cachedPrinterCheck = useCallback(async () => {
    const now = Date.now()
    if (now - printerCacheRef.current.time < 10_000 && printerCacheRef.current.ok) {
      return printerCacheRef.current
    }
    const status = await PrinterService.checkStatus()
    const ok = status.serverRunning && status.printerConnected
    printerCacheRef.current = { ok, serverRunning: status.serverRunning, printerConnected: status.printerConnected, time: now }
    return printerCacheRef.current
  }, [])

  // Jackpot cache — fetched once on mount, refreshed every 30s in background
  const jackpotRef = useRef('0.00')
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    if (!apiUrl) return

    const fetchJackpot = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/jackpot/pool/1`, { signal: AbortSignal.timeout(2000) })
        if (res.ok) {
          const pool = await res.json()
          jackpotRef.current = (pool.currentAmount ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }
      } catch { /* ignore — keep last known value */ }
    }

    fetchJackpot()
    const interval = setInterval(fetchJackpot, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Number selection hook with DOT trifecta support
  const {
    selectedFirst,
    selectedSecond,
    selectedThird,
    betMode,
    orderMode,
    handleFirstSelect,
    handleSecondSelect,
    handleThirdSelect,
    handleGemela,
    handleContra,
    handleTrio,
    setBetMode,
    setOrderMode,
    clearSelections,
    setSelectedFirst,
    setSelectedSecond,
    setSelectedThird
  } = useNumberSelection({ totalRunners, activeGame })

  // Sum value state for DOT SUMA betting
  const [sumValue, setSumValue] = useState('')

  // Check if current game is DOT (trifecta enabled) — kept as comment for future use
  // const isDotGame = activeGame === 'dot'

  // Drag-to-select functionality for runner buttons
  // dragMode: 'add' if started on unselected, 'remove' if started on selected
  const isMouseDownRef = useRef(false)
  const dragModeRef = useRef<'add' | 'remove'>('add')

  // Global mouse up listener
  useEffect(() => {
    const handleMouseUp = () => { isMouseDownRef.current = false }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // Mouse down on a selection button — toggle immediately + set drag mode
  const handleSelectionMouseDown = useCallback((row: 'first' | 'second' | 'third', num: number) => {
    isMouseDownRef.current = true
    const selected = row === 'first' ? selectedFirst : row === 'second' ? selectedSecond : selectedThird
    const isSelected = selected.includes(num)
    dragModeRef.current = isSelected ? 'remove' : 'add'
    // Toggle the pressed button immediately (visual feedback on press)
    const handler = row === 'first' ? handleFirstSelect : row === 'second' ? handleSecondSelect : handleThirdSelect
    handler(num)
  }, [selectedFirst, selectedSecond, selectedThird, handleFirstSelect, handleSecondSelect, handleThirdSelect])

  // Mouse enter during drag — add or remove based on drag mode
  const handleSelectionMouseEnter = useCallback((row: 'first' | 'second' | 'third', num: number) => {
    if (!isMouseDownRef.current) return
    const setter = row === 'first' ? setSelectedFirst : row === 'second' ? setSelectedSecond : setSelectedThird
    if (dragModeRef.current === 'add') {
      setter(prev => prev.includes(num) ? prev : [...prev, num])
    } else {
      setter(prev => prev.filter(n => n !== num))
    }
  }, [setSelectedFirst, setSelectedSecond, setSelectedThird])

  // Bet management hook — state is partitioned per activeGame so
  // switching games does not carry bets across.
  const {
    bets,
    handleDenominationSelect: handleDenomination,
    toggleRueda,
    toggleMediaRueda,
    ruedaMode,
    addBet,
    removeBet,
    clearBets,
    clearBetsForGame
  } = useBetManagement({ activeGame })

  // When a game's race transitions to `running`, wipe any pending bets the
  // cashier left without printing a ticket — they are no longer valid for
  // that round. Runs for ALL games (even the inactive ones), so a cashier
  // working on DOE does not come back to DOS to find stale bets from a
  // race that already started.
  const prevRaceStatesRef = useRef<Record<string, string | null>>({})
  useEffect(() => {
    const games: GamePrefix[] = ['dos', 'doe', 'dot', 'hoc']
    for (const game of games) {
      const data = getGameData(game)
      const state = data?.raceState ?? null
      const prev = prevRaceStatesRef.current[game] ?? null
      if (state && prev !== state) {
        prevRaceStatesRef.current[game] = state
        if (state === 'running' && prev !== 'running') {
          clearBetsForGame(game)
        }
      }
    }
  }, [
    getGameData('dos')?.raceState,
    getGameData('doe')?.raceState,
    getGameData('dot')?.raceState,
    getGameData('hoc')?.raceState,
    getGameData,
    clearBetsForGame,
  ])

  // Keyboard shortcut: ESC or F12 to logout
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'F12') {
      e.preventDefault()
      onLogout?.()
    }
  }, [onLogout])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Session timeout — auto-logout after configured time
  useEffect(() => {
    const timeoutMinutes = connectionInfo?.sessionTimeoutMinutes ?? 600
    const timeoutMs = timeoutMinutes * 60 * 1000
    console.log(`[POS] Session timeout set: ${timeoutMinutes} minutes`)

    const timer = setTimeout(() => {
      console.warn('[POS-EVENT] session_timeout minutes=' + timeoutMinutes)
      setTicketNotification({ show: true, ticketId: 'SESIÓN EXPIRADA', total: 0 })
      setTimeout(() => onLogout?.(), 1500)
    }, timeoutMs)

    return () => clearTimeout(timer)
  }, [connectionInfo?.sessionTimeoutMinutes, onLogout])

  // Balance button handler — full flow matching reference POS:
  // 1. Check printer  2. Auto-cancel pending  3. Auto-payout winners
  // 4. Calculate totals  5. Print balance  6. SendBalance to backend  7. Logout
  const balancingRef = useRef(false)
  const handleBalance = useCallback(async () => {
    if (balancingRef.current) return
    balancingRef.current = true
    setIsBalancing(true)
    try {
    console.log('[POS-EVENT] balance_clicked')
    const printerRequired = connectionInfo?.printerRequired ?? true
    const conn = getPOSConnection()

    // Step 1: Check printer
    if (printerRequired) {
      const printerStatus = await PrinterService.checkStatus()
      if (!printerStatus.serverRunning) {
        setShowPrinterError(true)
        return
      }
      if (!printerStatus.printerConnected) {
        setTicketNotification({ show: true, ticketId: 'ERROR_PRINTER_DISCONNECTED', total: 0 })
        setTimeout(() => setTicketNotification(null), 3000)
        return
      }
    }

    // Step 2: Auto-cancel pending tickets sequentially — print a cancel
    // receipt for each so the cashier has a physical audit trail.
    const pendingTickets = tickets.filter(t => t.status === 'pending')
    if (pendingTickets.length > 0) {
      console.log(`[handleBalance] Auto-cancelling ${pendingTickets.length} pending tickets...`)
      for (const ticket of pendingTickets) {
        try {
          const result = await conn.sendTicketStatus(ticket.ticketId, 'autocancel')
          console.log(`[handleBalance] autocancel ${ticket.ticketId}:`, result.msgValue)
          cancelTicket(ticket.ticketId)

          if (printerRequired) {
            const now = new Date()
            const cancelPrintData = {
              ticketId: ticket.ticketId,
              date: now.toLocaleDateString('es-ES'),
              time: now.toLocaleTimeString('es-ES'),
              gameId: ticket.gameId || '-',
              sitio: session?.locationName || '',
              terminalId: conn.getDeviceId(),
              operadorId: session?.operatorId || '',
              juego: getGameTheme(ticket.gamePrefix as GameType).name,
              bets: consolidateTicketBets(ticket.bets).map((b, i) => ({
                num: i + 1,
                jugada: b.second != null && b.second > 0 ? `${b.first}-${b.second}` : `${b.first}`,
                cuota: ticket.betCuotas?.[i] ?? '-',
                monto: b.amount.toFixed(2)
              })),
              importeCancelacion: ticket.totalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            }
            const printResult = await PrinterService.printCancelTicket(cancelPrintData)
              .catch(err => ({ success: false as const, error: String(err) }))
            if (!printResult.success) {
              console.warn(`[handleBalance] print cancel receipt failed for ${ticket.ticketId}:`, printResult.error)
              PrinterService.checkStatus()
                .then(status => posLogger.error(LogEvents.TICKET_PRINT_FAILED, 'Autocancel print failed', {
                  ticketId: ticket.ticketId,
                  action: 'cancel',
                  flowOrigin: 'autocancel_balance',
                  backendConfirmed: true,
                  printerStatusAtFailure: status,
                  errorDetail: printResult.error ?? null,
                }))
                .catch(() => posLogger.error(LogEvents.TICKET_PRINT_FAILED, 'Autocancel print failed', {
                  ticketId: ticket.ticketId,
                  action: 'cancel',
                  flowOrigin: 'autocancel_balance',
                  backendConfirmed: true,
                  printerStatusAtFailure: null,
                  errorDetail: printResult.error ?? null,
                }))
            }
          }
        } catch (err) {
          console.warn(`[handleBalance] autocancel failed for ${ticket.ticketId}:`, err)
        }
      }
    }

    // Step 3: Payout winning tickets (print payout receipt + sendTicketStatus)
    const wonTickets = tickets.filter(t => t.status === 'win' && t.payout > 0 && !t.isPaid)
    for (const ticket of wonTickets) {
      console.log(`[handleBalance] Paying out ticket ${ticket.ticketId}: $${ticket.payout}`)
      const printerRequired = connectionInfo?.printerRequired ?? true
      if (printerRequired) {
        const payoutPrintRes = await PrinterService.printPayTicket({
          ticketId: ticket.ticketId,
          date: new Date().toLocaleDateString('es-ES'),
          time: new Date().toLocaleTimeString('es-ES'),
          gameId: ticket.gameId || '',
          sitio: session?.locationName || '',
          terminalId: conn.getDeviceId(),
          operadorId: session?.operatorId || '',
          juego: getGameTheme(ticket.gamePrefix as GameType).name,
          bets: (ticket.bets?.filter(b => b.isWinner) || []).map((b, i) => ({
            num: i + 1,
            jugada: `${b.first}${b.second ? '-' + b.second : ''}`,
            cuota: (b.winOdds || 0).toFixed(1),
            monto: b.amount.toFixed(2),
          })),
          ganancia: ticket.payout.toFixed(2),
          bonoWon: false,
          isAutopay: true,
        }).catch(err => ({ success: false as const, error: String(err) }))
        if (!payoutPrintRes.success) {
          console.warn(`[handleBalance] payout print failed for ${ticket.ticketId}:`, payoutPrintRes.error)
          PrinterService.checkStatus()
            .then(status => posLogger.error(LogEvents.TICKET_PRINT_FAILED, 'Autopay (balance) print failed', {
              ticketId: ticket.ticketId,
              action: 'pay',
              flowOrigin: 'autopay_balance',
              backendConfirmed: false,
              printerStatusAtFailure: status,
              errorDetail: payoutPrintRes.error ?? null,
            }))
            .catch(() => posLogger.error(LogEvents.TICKET_PRINT_FAILED, 'Autopay (balance) print failed', {
              ticketId: ticket.ticketId,
              action: 'pay',
              flowOrigin: 'autopay_balance',
              backendConfirmed: false,
              printerStatusAtFailure: null,
              errorDetail: payoutPrintRes.error ?? null,
            }))
        }
      }
      try {
        await conn.sendTicketStatus(ticket.ticketId, 'payout')
        markTicketPaid(ticket.ticketId)
        console.log(`[handleBalance] payout confirmed: ${ticket.ticketId}`)
      } catch (err) {
        console.warn(`[handleBalance] payout sendTicketStatus failed for ${ticket.ticketId}:`, err)
      }
    }

    // Step 4: Calculate totals
    const settledTickets = tickets.filter(t => t.status !== 'cancelled' && t.status !== 'pending')
    const cancelledCount = tickets.filter(t => t.status === 'cancelled').length + pendingTickets.length
    const totalBet = settledTickets.reduce((sum, t) => sum + t.totalAmount, 0)
    const totalWin = settledTickets.reduce((sum, t) => sum + t.payout, 0)

    // Step 5: Print balance receipt
    const now = new Date()
    const firstTicket = tickets.length > 0 ? tickets[tickets.length - 1] : null
    const sessionStart = firstTicket ? firstTicket.createdAt : now
    const fmtDt = (d: Date) => `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`

    const balancePrintData: PrintBalanceData = {
      operadorId: session?.operatorId || '-',
      sesionId: session?.sessionCode || '-',
      iniciar: fmtDt(sessionStart),
      fin: fmtDt(now),
      posiciones: String(new Set(tickets.map(t => t.gamePrefix)).size),
      tickets: String(settledTickets.length),
      cancelacionTickets: String(cancelledCount),
      apuesta: totalBet.toFixed(2).replace('.', ','),
      ganancias: totalWin.toFixed(2).replace('.', ','),
      balance: (totalBet - totalWin).toFixed(2).replace('.', ','),
    }

    try {
      const printResult = await PrinterService.printBalance(balancePrintData)
      if (!printResult.success) {
        setShowPrinterError(true)
        PrinterService.checkStatus()
          .then(status => posLogger.error(LogEvents.BALANCE_PRINT_FAILED, 'Balance print failed', {
            sessionCode: session?.sessionCode ?? null,
            printerStatusAtFailure: status,
            errorDetail: printResult.error ?? null,
          }))
          .catch(() => posLogger.error(LogEvents.BALANCE_PRINT_FAILED, 'Balance print failed', {
            sessionCode: session?.sessionCode ?? null,
            printerStatusAtFailure: null,
            errorDetail: printResult.error ?? null,
          }))
        return
      }
      posLogger.info(LogEvents.BALANCE_PRINTED, 'Balance receipt printed', {
        sessionCode: session?.sessionCode ?? null,
        type: 'close',
      })
    } catch (err) {
      console.error('[handleBalance] Print failed:', err)
      setShowPrinterError(true)
      posLogger.error(LogEvents.BALANCE_PRINT_FAILED, 'Balance print threw', {
        sessionCode: session?.sessionCode ?? null,
        printerStatusAtFailure: null,
        errorDetail: err instanceof Error ? err.message : String(err),
      })
      return
    }

    // Step 6: Send balance to backend (.NET) to formally close the session
    const ticketData = JSON.stringify(
      tickets.map(t => ({
        ticketId: t.ticketId,
        status: t.status,
        totalAmount: t.totalAmount,
        payout: t.payout,
        gameType: t.gamePrefix,
        gameId: t.gameId,
      }))
    )

    try {
      await conn.sendBalance({
        totalBet,
        totalWin,
        countTip: settledTickets.length,
        countTicketCancel: cancelledCount,
        ticketData,
        isAutobalance: false,
      })
      console.log('[POS-EVENT] balance_sent_to_server')
    } catch (err) {
      console.warn('[handleBalance] SendBalance to server failed (session still closing):', err)
    }

    // Step 7: Logout
    onLogout?.()
    } finally {
      balancingRef.current = false
      setIsBalancing(false)
    }
  }, [connectionInfo?.printerRequired, tickets, session, onLogout])

  // Reprint ticket from Ventas list
  const handleReprint = useCallback(async (index: number) => {
    // tickets array is newest-first (same order as salesRecords)
    const ticket = tickets[index]
    if (!ticket || reprintingIndex !== null) return

    setReprintingIndex(index)

    const printerStatus = await PrinterService.checkStatus()
    if (!printerStatus.serverRunning) {
      setShowPrinterError(true)
      setReprintingIndex(null)
      return
    }
    if (!printerStatus.printerConnected) {
      setTicketNotification({ show: true, ticketId: 'ERROR_PRINTER_DISCONNECTED', total: 0 })
      setTimeout(() => setTicketNotification(null), 3000)
      setReprintingIndex(null)
      return
    }

    const dt = ticket.createdAt
    const printData: PrintTicketData = {
      ticketId: ticket.ticketId,
      date: `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getFullYear()}`,
      time: `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}`,
      gameId: ticket.gameId,
      sitio: locationName || '',
      terminalId: session?.deviceId || '',
      operadorId: session?.operatorId || '',
      juego: getGameTheme(ticket.gamePrefix as GameType).name,
      bets: ticket.bets.map((b, i) => ({
        num: i + 1,
        jugada: b.second != null && b.second > 0 ? `${b.first}-${b.second}` : `${b.first}`,
        cuota: ticket.betCuotas?.[i] ?? '-',
        monto: b.amount.toFixed(2)
      })),
      total: ticket.totalAmount.toFixed(2),
      maxBenefit: ticket.maxBenefit ?? '0',
      jackpot: '0'
    }

    try {
      await Promise.all([
        PrinterService.printTicketCopia(printData),
        new Promise(r => setTimeout(r, 1500))
      ])
    } catch (err) {
      console.error('[handleReprint] Print failed:', err)
      setShowPrinterError(true)
    } finally {
      setReprintingIndex(null)
    }
  }, [tickets, locationName, session, reprintingIndex])

  // Operator info from session
  const operatorId = session?.operatorId || '-'
  const sessionCode = session?.sessionCode || '------------'
  const deviceId = session?.deviceId || ''
  void __APP_VERSION__ // version displayed as hardcoded 2.60.05
  // Denomination selection handler using the bet management hook
  const handleDenominationSelect = useCallback((value: number) => {
    // Check per-tip limit (singleTicketMaxAmount) before adding bet
    // Validates both WIN (first only) and EXACTA (first+second) combinations
    const tipLimit = operatorLimits?.singleTicketMaxAmount
    if (tipLimit && selectedFirst.length > 0) {
      const isExacta = selectedSecond.length > 0
      for (const first of selectedFirst) {
        if (isExacta) {
          for (const second of selectedSecond) {
            if (first === second) continue
            const currentAmount = bets
              .filter(b => b.first === first && b.second === second)
              .reduce((sum, b) => sum + b.amount, 0)
            if (currentAmount + value > tipLimit) {
              console.warn(`[TIP-LIMIT] Exacta ${first}-${second}: $${currentAmount} + $${value} > limit $${tipLimit}`)
              setTipLimitMessage(`La apuesta máxima por tip es: ${tipLimit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`)
              setTimeout(() => setTipLimitMessage(null), 3000)
              return
            }
          }
        } else {
          const currentAmount = bets
            .filter(b => b.first === first && b.second === undefined)
            .reduce((sum, b) => sum + b.amount, 0)
          if (currentAmount + value > tipLimit) {
            console.warn(`[TIP-LIMIT] Win ${first}: $${currentAmount} + $${value} > limit $${tipLimit}`)
            setTipLimitMessage(`La apuesta máxima por tip es: ${tipLimit.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`)
            setTimeout(() => setTipLimitMessage(null), 3000)
            return
          }
        }
      }
    }

    const currentRaceOdds = oddsData.find(o => o.raceNumber === raceNumber)?.odds
    handleDenomination(value, selectedFirst, selectedSecond, totalRunners, clearSelections, currentRaceOdds)
  }, [handleDenomination, selectedFirst, selectedSecond, totalRunners, clearSelections, oddsData, raceNumber, operatorLimits, bets])

  // Delete all selections and bets
  const handleDelete = useCallback(() => {
    clearSelections()
    clearBets()
  }, [clearSelections, clearBets])


  const handlePrint = useCallback(async () => {
    if (bets.length === 0 || isPrinting) return

    // Safety check: block betting if race data is stale (no timeSync in 25 seconds)
    // Note: timeSync arrives every ~20 seconds, so threshold must be > 20s
    if (isDataStale(25000)) {
      console.warn('[handlePrint] Blocked: race data is stale')
      posLogger.warn(LogEvents.LOCAL_VALIDATION_FAILED, 'Betting blocked due to stale race data', { rule: 'stale_race_data' })
      setTicketNotification({ show: true, ticketId: 'ERROR_STALE_DATA', total: 0 })
      return
    }

    setIsPrinting(true)
    const total = bets.reduce((sum, b) => sum + b.amount, 0)
    const gameType = GAME_PREFIX_TO_TYPE[activeGame]
    const gameId = currentData.raceId

    // Check daily sales limit before sending ticket
    if (operatorLimits?.dailySalesLimit && operatorLimits.dailySalesCurrent + total > operatorLimits.dailySalesLimit) {
      console.warn(`[handlePrint] Blocked: daily sales limit would be exceeded`)
      setTicketNotification({ show: true, ticketId: 'LIMITE_DIARIO_EXCEDIDO', total: 0 })
      setIsPrinting(false)
      return
    }

    // Check printer requirement before proceeding
    const printerRequired = connectionInfo?.printerRequired ?? true
    const t0 = performance.now()

    // Printer pre-check moved to parallel block below (print-first flow)
    // For no-printer flow, this is skipped entirely

    // Look up odds for the current race to populate cuota/maxBenefit
    const participants = RUNNERS_BY_GAME[activeGame] || 8
    const currentRaceOdds = oddsData.find(o => o.raceNumber === raceNumber)?.odds
    const getBetOddsIndex = (first: number, second?: number): number => {
      if (second == null || second <= 0) return first - 1
      const factor = participants - 1
      const offset = second > first ? 1 : 0
      return first * factor + second - offset
    }
    const getBetCuota = (b: { first: number; second?: number }): string => {
      if (!currentRaceOdds) return '-'
      const idx = getBetOddsIndex(b.first, b.second)
      const odd = currentRaceOdds[idx]
      return odd != null && odd > 0 ? odd.toFixed(1) : '-'
    }
    const maxBenefit = currentRaceOdds
      ? bets.reduce((sum, b) => {
          const idx = getBetOddsIndex(b.first, b.second)
          const odd = currentRaceOdds[idx]
          return sum + (odd != null && odd > 0 ? b.amount * odd : 0)
        }, 0).toFixed(2)
      : '0.00'

    // Dev mode: simulate ticket creation
    const isDevMode = (window as any).desktopApp?.config?.devMode || import.meta.env.VITE_DEV_MODE === 'true'
    if (isDevMode) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const mockTicketId = `DEV-${raceNumber}-${Date.now().toString(36).toUpperCase()}`
      console.log('[DEV MODE] Mock ticket created:', { mockTicketId, bets, total, gameType, gameId })

      const ticketBetsForTracker = bets.map(bet => ({
        first: bet.first,
        second: bet.second,
        amount: bet.amount
      }))
      addTicket(mockTicketId, gameId || `dev_${raceNumber}`, gameType, activeGame, ticketBetsForTracker, maxBenefit, bets.map(b => getBetCuota(b)))

      setTicketNotification({ show: true, ticketId: mockTicketId, total })
      clearBets()
      clearSelections()
      setIsPrinting(false)

      PrinterService.printTicket({
        ticketId: mockTicketId,
        date: new Date().toLocaleDateString('es-ES'),
        time: new Date().toLocaleTimeString('es-ES'),
        gameId: gameId || `dev_${raceNumber}`,
        sitio: locationName || '',
        terminalId: deviceId,
        operadorId: operatorId,
        juego: gameTheme.name,
        bets: bets.map((b, i) => ({
          num: i + 1,
          jugada: b.second != null && b.second > 0 ? `${b.first}-${b.second}` : `${b.first}`,
          cuota: getBetCuota(b),
          monto: b.amount.toFixed(2)
        })),
        total: total.toFixed(2),
        maxBenefit,
        jackpot: '0.00'
      }).catch(err => console.warn('[Print] Failed:', err))

      setTimeout(() => setTicketNotification(null), 1000)
      return
    }

    if (!gameId) {
      console.error('No race ID available for ticket submission')
      setTicketNotification({ show: true, ticketId: 'ERROR', total: 0 })
      setIsPrinting(false)
      setTimeout(() => setTicketNotification(null), 3000)
      return
    }

    // Convert bets to sendTicket format
    // Note: bet.second can be 0 (falsy but not undefined) from rebet flow — treat as WIN
    const ticketBets = bets.map(bet => ({
      betType: bet.second != null && bet.second > 0 ? BetType.EXACTA : BetType.WIN,
      selection1: bet.first,
      selection2: bet.second != null && bet.second > 0 ? bet.second : undefined,
      amount: bet.amount
    }))

    const jackpotAmount = jackpotRef.current

    // Build printData once (used in both printer-required and retry flows)

    if (printerRequired) {
      // ================================================================
      // PRINT-FIRST FLOW: printerCheck + reserve (parallel) → optimistic UI → confirm (background)
      // ================================================================
      console.log('[handlePrint] Print-first flow: parallel printerCheck + reserve...', { gameType, gameId, ticketBets })

      try {
        const connection = getPOSConnection()
        const tParallelStart = performance.now()

        // Run printer check and reserve in parallel
        const [printerResult, reserveResult] = await Promise.all([
          cachedPrinterCheck(),
          connection.reserveTicket(gameType, gameId, ticketBets)
        ])
        const tParallelEnd = performance.now()
        console.log(`[TIMING] parallel printerCheck+reserve: ${(tParallelEnd - tParallelStart).toFixed(0)}ms`)

        // Validate printer
        if (!printerResult.serverRunning) {
          console.warn('[handlePrint] Blocked: print server not running')
          setShowPrinterError(true)
          setIsPrinting(false)
          return
        }
        if (!printerResult.printerConnected) {
          console.warn('[handlePrint] Blocked: printer not connected')
          setTicketNotification({ show: true, ticketId: 'ERROR_PRINTER_DISCONNECTED', total: 0 })
          setIsPrinting(false)
          return
        }

        // Validate reserve
        if (reserveResult.msgValue !== 'ok') {
          const errCode = 'errorCode' in reserveResult ? reserveResult.errorCode : undefined
          console.error('Ticket reservation failed:', reserveResult.errorMessage || errCode)
          setTicketNotification({ show: true, ticketId: `ERROR: ${errCode}`, total: 0 })
          setIsPrinting(false)
          setTimeout(() => setTicketNotification(null), 3000)
          return
        }

        // Both passed — build print data
        const ticketNumber = reserveResult.ticketNumber
        const serverTips = (reserveResult as any).tips as Array<{ selection1: number; selection2?: number; amount: number; odds: number; possibleWin: number }> | undefined
        const printData: PrintTicketData = {
          ticketId: ticketNumber,
          date: new Date().toLocaleDateString('es-ES'),
          time: new Date().toLocaleTimeString('es-ES'),
          gameId: gameId!,
          sitio: locationName || '',
          terminalId: deviceId,
          operadorId: operatorId,
          juego: gameTheme.name,
          bets: serverTips
            ? serverTips.map((t, i) => ({
                num: i + 1,
                jugada: t.selection2 ? `${t.selection1}-${t.selection2}` : `${t.selection1}`,
                cuota: t.odds > 0 ? t.odds.toFixed(1) : '-',
                monto: t.amount.toFixed(2)
              }))
            : bets.map((b, i) => ({
                num: i + 1,
                jugada: b.second != null && b.second > 0 ? `${b.first}-${b.second}` : `${b.first}`,
                cuota: getBetCuota(b),
                monto: b.amount.toFixed(2)
              })),
          total: (serverTips ? serverTips.reduce((s, t) => s + t.amount, 0) : total).toFixed(2),
          maxBenefit: (reserveResult as any).possibleWin?.toFixed(2) || maxBenefit,
          jackpot: jackpotAmount
        }

        // Save to localStorage in case app closes before confirm
        savePending({
          ticketNumber,
          gameType,
          gameId: gameId!,
          gameName: activeGame,
          printData,
          reservedAt: Date.now()
        })

        // Optimistic UI: clear bets and release UI immediately after reserve
        clearBets()
        clearSelections()
        setIsPrinting(false)
        console.log(`[TIMING] UI released (click to ready): ${(performance.now() - t0).toFixed(0)}ms`)

        // Fire print (don't wait for physical printing)
        console.log('[handlePrint] printData:', JSON.stringify(printData))
        PrinterService.printTicket(printData)
          .then(() => console.log(`[TIMING] printTicket completed: ${(performance.now() - tParallelEnd).toFixed(0)}ms`))
          .catch(err => console.warn('[Print] Failed:', err))

        // Confirm ticket in background (don't block UI)
        connection.confirmTicket(ticketNumber).then(confirmResult => {
          const tConfirmEnd = performance.now()
          console.log(`[TIMING] confirmTicket (bg): ${(tConfirmEnd - tParallelEnd).toFixed(0)}ms`)
          console.log(`[TIMING] TOTAL (click to confirmed): ${(tConfirmEnd - t0).toFixed(0)}ms`)

          if (confirmResult.success) {
            removePending(ticketNumber)
            const ticketBetsForTracker = bets.map(bet => ({
              first: bet.first,
              second: bet.second,
              amount: bet.amount
            }))
            addTicket(ticketNumber, gameId!, gameType, activeGame, ticketBetsForTracker, printData.maxBenefit, printData.bets.map(b => b.cuota))
          } else {
            console.error('[handlePrint] Confirm failed:', confirmResult.error, confirmResult.errorMessage)
            posLogger.warn(LogEvents.LOCAL_VALIDATION_FAILED, `Confirm failed for ${ticketNumber}`, {
              rule: 'ticket_confirm_failed',
              ticketNumber,
              error: confirmResult.error,
            })
          }
        }).catch(err => {
          console.error('[handlePrint] confirmTicket error:', err)
          posLogger.error(LogEvents.JS_EXCEPTION, `Confirm error for ${ticketNumber}`, {
            source: 'confirmTicket',
            ticketNumber,
            message: err instanceof Error ? err.message : String(err),
          })
        })
      } catch (error) {
        console.error('Print-first ticket flow error:', error)
        posLogger.error(LogEvents.JS_EXCEPTION, 'Print-first ticket flow failed', {
          source: 'handlePrint_printFirst',
          gameType,
          gameId,
          message: error instanceof Error ? error.message : String(error),
        })
        setTicketNotification({ show: true, ticketId: 'ERROR', total: 0 })
        setIsPrinting(false)
      }

      setTimeout(() => setTicketNotification(null), 3000)
    } else {
      // ================================================================
      // NO-PRINTER FLOW: send ticket directly (existing behavior)
      // ================================================================
      console.log('[handlePrint] No-printer flow: sending ticket directly...', { gameType, gameId, ticketBets })

      try {
        const connection = getPOSConnection()
        const tSendStart = performance.now()
        const result = await connection.sendTicket(gameType, gameId, ticketBets)
        const tSendEnd = performance.now()
        console.log(`[TIMING] sendTicket: ${(tSendEnd - tSendStart).toFixed(0)}ms`)
        console.log(`[TIMING] TOTAL (click to done): ${(tSendEnd - t0).toFixed(0)}ms`)
        console.log('[handlePrint] Result:', result)

        if (result.msgValue === 'ok') {
          // Check limit warnings from backend (only present on success responses)
          if (result.limitTurnoverWarning) {
            console.warn('[handlePrint] WARNING: Approaching daily sales limit')
            setTimeout(() => setTicketNotification({ show: true, ticketId: 'AVISO_LIMITE_VENTAS', total: 0 }), 3000)
          }
          if (result.limitProfitWarning) {
            console.warn('[handlePrint] WARNING: Approaching daily payout limit')
            setTimeout(() => setTicketNotification({ show: true, ticketId: 'AVISO_LIMITE_PAGOS', total: 0 }), 3000)
          }

          const ticketId = result.ticketNumber || result.ticketID

          const ticketBetsForTracker = bets.map(bet => ({
            first: bet.first,
            second: bet.second,
            amount: bet.amount
          }))
          addTicket(ticketId, gameId!, gameType, activeGame, ticketBetsForTracker, maxBenefit, bets.map(b => getBetCuota(b)))

          clearBets()
          clearSelections()

          // Print the ticket. printerRequired=false means the printer is
          // OPTIONAL (it never blocks ticket creation), but if a printer/print
          // server is configured we still print — fire-and-forget so a missing
          // printer never delays the sale. (Previously this flow only showed the
          // on-screen notification and never printed.)
          const printData: PrintTicketData = {
            ticketId,
            date: new Date().toLocaleDateString('es-ES'),
            time: new Date().toLocaleTimeString('es-ES'),
            gameId: gameId!,
            sitio: locationName || '',
            terminalId: deviceId,
            operadorId: operatorId,
            juego: gameTheme.name,
            bets: bets.map((b, i) => ({
              num: i + 1,
              jugada: b.second != null && b.second > 0 ? `${b.first}-${b.second}` : `${b.first}`,
              cuota: getBetCuota(b),
              monto: b.amount.toFixed(2)
            })),
            total: total.toFixed(2),
            maxBenefit,
            jackpot: jackpotAmount
          }
          console.log('[handlePrint] no-printer flow printData:', JSON.stringify(printData))
          PrinterService.printTicket(printData)
            .then(() => console.log('[handlePrint] printTicket completed'))
            .catch(err => console.warn('[Print] Failed:', err))

          // Show success notification on screen
          setTicketNotification({ show: true, ticketId, total })
        } else {
          console.error('Ticket submission failed:', result.errorMessage || result.errorCode)
          setTicketNotification({ show: true, ticketId: `ERROR: ${result.errorCode}`, total: 0 })
        }
      } catch (error) {
        console.error('Ticket submission error:', error)
        posLogger.error(LogEvents.JS_EXCEPTION, 'Ticket submission failed', {
          source: 'handlePrint_noPrinter',
          gameType,
          gameId,
          message: error instanceof Error ? error.message : String(error),
        })
        setTicketNotification({ show: true, ticketId: 'ERROR', total: 0 })
      } finally {
        setIsPrinting(false)
      }

      setTimeout(() => setTicketNotification(null), 3000)
    }
  }, [bets, isPrinting, activeGame, currentData.raceId, raceNumber, clearBets, clearSelections, addTicket, isDataStale, connectionInfo, oddsData, locationName, sessionCode, operatorId, gameTheme.name])

  // Memoized styles for dynamic visibility — kept as comment for future use
  // const hiddenWhenExpandedStyle = useMemo(() => ({
  //   visibility: betsExpanded ? 'hidden' as const : 'visible' as const
  // }), [betsExpanded])

  // Show JUGADA content only when on JUGADA tab
  const isJugadaTab = activeMenu === 'JUGADA'
  const isResultadosTab = activeMenu === 'RESULTADOS'
  const isCuotasTab = activeMenu === 'CUOTAS'
  const isVentasTab = activeMenu === 'VENTAS'

  // Memoized Bets component style
  // Original POS: top=78.90vh, height=20.89vh, width=19.90vw, bottom=99.09vh
  const betsStyle = useMemo(() => ({
    top: '78.90vh',
    height: '18.44cqb',
    width: '15.78cqi', // Visible width from left edge to right edge
    transform: 'skewX(-10deg)',
    zIndex: betsExpanded ? 70 : 5
  }), [betsExpanded])

  // Dashboard visibility style - invisible until ready, then instant show
  // Also includes theme CSS variables for dynamic colors
  const dashboardVisibilityStyle = useMemo(() => ({
    opacity: isReady ? 1 : 0,
    transition: isReady ? 'none' : 'none', // No transition, instant appear
    ...getThemeCSSVariables(gameTheme)
  }), [isReady, gameTheme])

  // Cycle to next game when clicking on the game logo (only enabled games)
  const handleGameLogoClick = useCallback(() => {
    const currentIndex = enabledPrefixes.indexOf(activeGame)
    const nextIndex = (currentIndex + 1) % enabledPrefixes.length
    setActiveGame(enabledPrefixes[nextIndex])
  }, [activeGame, setActiveGame, enabledPrefixes])

  // Tickets belong to a specific game's race. The cashier may be looking at
  // a different game when they scan, so we can't rely on the active game's
  // raceState — we have to check the ticket's own game.
  const isTicketForRunningRace = useCallback((result: GetTicketSuccess): boolean => {
    if (!result.roundCode) return false
    const ticketGame = TICKET_TYPE_ID_TO_PREFIX[result.gameTypeId]
    if (!ticketGame) return false
    const data = getGameData(ticketGame)
    if (!data) return false
    const state = data.raceState
    if (state !== 'running' && state !== 'closing') return false
    return data.runningRaceId === result.roundCode
  }, [getGameData])

  // Ticket pending cuya carrera ya corrió pero settlement aún no aplicó.
  // Sin este check, el modal ofrecería CANCELAR un ticket que ya no se puede cancelar.
  const isTicketSettlementPending = useCallback((result: GetTicketSuccess): boolean => {
    if (result.status !== 'pending') return false
    if (!result.roundCode) return false
    const ticketGame = TICKET_TYPE_ID_TO_PREFIX[result.gameTypeId]
    if (!ticketGame) return false
    const data = getGameData(ticketGame)
    if (!data || !data.raceId) return false
    return data.raceId !== result.roundCode
  }, [getGameData])

  const handleTicketSearch = useCallback(async () => {
    const query = ticketIdValue.trim()
    if (!query || isSearchingTicket) return

    setIsSearchingTicket(true)
    setTicketSearchError(null)

    try {
      const result = await getPOSConnection().getTicket(query)
      if (result.success) {
        if (isTicketForRunningRace(result)) {
          setSearchedTicket({ status: '_active' } as any)
        } else if (isTicketSettlementPending(result)) {
          // Carrera ya corrió pero settlement aún no aplicó (1-7s típico).
          // Mostrar TICKET ACTIVO en vez de CANCELAR — más honesto y seguro:
          // la cajera reescanea pasados unos segundos y ve PAGAR/REBET correcto.
          setSearchedTicket({ status: '_active' } as any)
        } else {
          setSearchedTicket(result)
        }
        setShowTicketIdInput(false)
        setTicketIdValue('')
      } else {
        setTicketSearchError(result.errorMessage || 'Boleto no encontrado')
        setTimeout(() => setTicketSearchError(null), 3000)
      }
    } catch {
      setTicketSearchError('Error de conexión')
      setTimeout(() => setTicketSearchError(null), 3000)
    } finally {
      setIsSearchingTicket(false)
    }
  }, [ticketIdValue, isSearchingTicket, isTicketForRunningRace, isTicketSettlementPending])

  // Direct ticket search by code (used by barcode scanner)
  const handleScannedTicket = useCallback(async (code: string) => {
    const query = code.trim()
    if (!query || isSearchingTicket) return

    setIsSearchingTicket(true)
    setTicketSearchError(null)

    try {
      const result = await getPOSConnection().getTicket(query)
      if (result.success) {
        if (isTicketForRunningRace(result)) {
          setSearchedTicket({ status: '_active' } as any)
        } else if (isTicketSettlementPending(result)) {
          // Carrera ya corrió pero settlement aún no aplicó (1-7s típico).
          // Mostrar TICKET ACTIVO en vez de CANCELAR — más honesto y seguro:
          // la cajera reescanea pasados unos segundos y ve PAGAR/REBET correcto.
          setSearchedTicket({ status: '_active' } as any)
        } else {
          setSearchedTicket(result)
        }
        setShowTicketIdInput(false)
        setTicketIdValue('')
      } else {
        setTicketSearchError(result.errorMessage || 'Boleto no encontrado')
        setTimeout(() => setTicketSearchError(null), 3000)
      }
    } catch {
      setTicketSearchError('Error de conexión')
      setTimeout(() => setTicketSearchError(null), 3000)
    } finally {
      setIsSearchingTicket(false)
    }
  }, [isSearchingTicket, isTicketForRunningRace, isTicketSettlementPending])

  // Barcode/QR scanner: auto-search tickets when scanned
  useBarcodeScanner({
    onScan: handleScannedTicket,
    enabled: true,
  })

  const handleTicketPay = useCallback(async (ticketId: string) => {
    setIsPaying(true)
    try {
      const result = await getPOSConnection().payTicket(ticketId)
      if (!result.success) {
        setTicketSearchError(result.errorMessage || 'Error al pagar')
        setTimeout(() => setTicketSearchError(null), 3000)
        return
      }

      // Print pay ticket
      const ticket = searchedTicket
      if (ticket) {
        const now = new Date()
        const printData = {
          ticketId: result.ticketNumber,
          date: now.toLocaleDateString('es-ES'),
          time: now.toLocaleTimeString('es-ES'),
          gameId: ticket.roundCode || '-',
          sitio: locationName || '',
          terminalId: deviceId,
          operadorId: operatorId,
          juego: ticket.gameTypeName || '-',
          bets: ticket.tips.filter(t => t.winAmount > 0).map((t, i) => ({
            num: i + 1,
            jugada: t.selection2 ? `${t.selection1}-${t.selection2}` : `${t.selection1}`,
            cuota: t.odds.toFixed(1),
            monto: t.amount.toFixed(2),
          })),
          ganancia: result.paidAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          bonoWon: false,
          bonoAmount: ''
        }
        const printRes = await PrinterService.printPayTicket(printData)
          .catch(err => ({ success: false as const, error: String(err) }))
        if (!printRes.success) {
          console.warn('[handleTicketPay] Print failed:', printRes.error)
          setTicketSearchError(`Pago OK pero falló impresión: ${printRes.error ?? 'sin detalle'}. Imprimir manual.`)
          setTimeout(() => setTicketSearchError(null), 8000)
          // Capture printer status post-failure for diagnostics (fire-and-forget)
          PrinterService.checkStatus()
            .then(status => posLogger.error(LogEvents.TICKET_PRINT_FAILED, 'Manual pay print failed', {
              ticketId: result.ticketNumber,
              action: 'pay',
              flowOrigin: 'manual',
              backendConfirmed: true,
              printerStatusAtFailure: status,
              errorDetail: printRes.error ?? null,
            }))
            .catch(() => posLogger.error(LogEvents.TICKET_PRINT_FAILED, 'Manual pay print failed', {
              ticketId: result.ticketNumber,
              action: 'pay',
              flowOrigin: 'manual',
              backendConfirmed: true,
              printerStatusAtFailure: null,
              errorDetail: printRes.error ?? null,
            }))
        }
      }

      // Mark as paid in sales tracker (if it's from current session)
      if (result.ticketNumber) markTicketPaid(result.ticketNumber)
      setSearchedTicket(null)
    } catch {
      setTicketSearchError('Error de conexión')
      setTimeout(() => setTicketSearchError(null), 3000)
    } finally {
      setIsPaying(false)
    }
  }, [searchedTicket, locationName, deviceId, operatorId, markTicketPaid])

  const handleTicketCancel = useCallback(async (ticketId: string) => {
    // Block cancel during active race
    if (currentData.raceState === 'running' || currentData.raceState === 'closing') {
      setTicketSearchError('No se puede cancelar durante carrera activa')
      setTimeout(() => setTicketSearchError(null), 3000)
      return
    }

    setIsCancelling(true)
    try {
      const result = await getPOSConnection().cancelTicket(ticketId)
      if (!result.success) {
        setTicketSearchError(result.errorMessage || 'Error al cancelar')
        setTimeout(() => setTicketSearchError(null), 3000)
        return
      }

      // Print cancel receipt - match print server cancelTicketSchema
      const now = new Date()
      const ticket = tickets.find(t => t.ticketId === result.ticketNumber)
      const printData = {
        ticketId: result.ticketNumber,
        date: now.toLocaleDateString('es-ES'),
        time: now.toLocaleTimeString('es-ES'),
        gameId: ticket?.gameId || '-',
        sitio: locationName || '',
        terminalId: deviceId,
        operadorId: operatorId,
        juego: ticket?.gamePrefix ? getGameTheme(ticket.gamePrefix as GameType).name : '-',
        bets: ticket ? consolidateTicketBets(ticket.bets).map((b, i) => ({
          num: i + 1,
          jugada: b.second != null && b.second > 0 ? `${b.first}-${b.second}` : `${b.first}`,
          cuota: '-',
          monto: b.amount.toFixed(2)
        })) : [{ num: 1, jugada: '-', cuota: '-', monto: result.cancelledAmount.toFixed(2) }],
        importeCancelacion: result.cancelledAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }

      // Update sales tracker
      cancelTicket(result.ticketNumber)

      const printResult = await PrinterService.printCancelTicket(printData)
      if (!printResult.success) {
        setTicketSearchError('Ticket cancelado pero no se pudo imprimir recibo. Verifique impresora.')
        setTimeout(() => setTicketSearchError(null), 5000)
        PrinterService.checkStatus()
          .then(status => posLogger.error(LogEvents.TICKET_PRINT_FAILED, 'Manual cancel print failed', {
            ticketId: result.ticketNumber,
            action: 'cancel',
            flowOrigin: 'manual',
            backendConfirmed: true,
            printerStatusAtFailure: status,
            errorDetail: printResult.error ?? null,
          }))
          .catch(() => posLogger.error(LogEvents.TICKET_PRINT_FAILED, 'Manual cancel print failed', {
            ticketId: result.ticketNumber,
            action: 'cancel',
            flowOrigin: 'manual',
            backendConfirmed: true,
            printerStatusAtFailure: null,
            errorDetail: printResult.error ?? null,
          }))
      }

      setSearchedTicket(null)
    } catch {
      setTicketSearchError('Error de conexión')
      setTimeout(() => setTicketSearchError(null), 3000)
    } finally {
      setIsCancelling(false)
    }
  }, [locationName, deviceId, operatorId, tickets])

  // Pending rebet: bets are deferred until activeGame actually flips to the
  // target. addBet's closure is bound to the active game at render time, so
  // calling it before the game switch would push the bets onto the wrong
  // game's pool (visible as bets briefly appearing on the source game and
  // then disappearing when the carousel slides over).
  const [pendingRebet, setPendingRebet] = useState<{ game: GamePrefix, tips: GetTicketTipResult[] } | null>(null)

  useEffect(() => {
    if (!pendingRebet || activeGame !== pendingRebet.game) return
    for (const tip of pendingRebet.tips) {
      addBet({
        first: tip.selection1,
        second: tip.selection2 != null && tip.selection2 > 0 ? tip.selection2 : undefined,
        amount: tip.amount,
        odds: tip.odds
      })
    }
    setPendingRebet(null)
  }, [pendingRebet, activeGame, addBet])

  // Re-bet: switch to the original ticket's game first, then queue the bets
  // to be added once the game switch has rendered.
  const handleRebet = useCallback((ticket: GetTicketSuccess) => {
    setSearchedTicket(null)

    const targetGame = TICKET_TYPE_ID_TO_PREFIX[ticket.gameTypeId]
    if (!targetGame) {
      console.warn('[handleRebet] unknown gameTypeId on ticket — skipping rebet:', ticket.gameTypeId)
      return
    }

    setActiveGame(targetGame)
    setActiveMenu('JUGADA')
    setPendingRebet({ game: targetGame, tips: ticket.tips })
  }, [setActiveGame])

  // Print cuotas (odds table)
  const handlePrintCuotas = useCallback(async (count: number) => {
    console.log('[handlePrintCuotas] clicked:', count, 'oddsData:', oddsData.length)
    if (printingCuotasCount !== null) return

    const printerStatus = await PrinterService.checkStatus()
    if (!printerStatus.serverRunning || !printerStatus.printerConnected) {
      setShowPrinterError(true)
      return
    }

    setPrintingCuotasCount(count)
    try {
      const runners = RUNNERS_BY_GAME[activeGame] || 6
      const racesToPrint = oddsData.slice(0, count)
      const now = new Date()

      // Build cuotas: each juego = 1 race with NxN exacta matrix
      // odds[0..N-1] = WIN, odds[N..] = EXACTA
      // EXACTA index: first * (N-1) + second - offset (offset=1 if second>first)
      const printData = {
        fechaDeImprenta: `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`,
        juegos: racesToPrint.map(race => {
          // Build NxN matrix from flat exacta odds
          const matrix: string[][] = []
          for (let first = 0; first < runners; first++) {
            const row: string[] = []
            for (let second = 0; second < runners; second++) {
              if (first === second) {
                // WIN odds on the diagonal
                row.push(race.odds[first] > 0 ? race.odds[first].toFixed(1) : '-')
              } else {
                // EXACTA: index = first * (N-1) + second - offset
                const offset = second > first ? 1 : 0
                const idx = runners + first * (runners - 1) + second - offset
                const odd = race.odds[idx]
                row.push(odd != null && odd > 0 ? odd.toFixed(1) : '-')
              }
            }
            matrix.push(row)
          }
          return { id: race.raceNumber, cuotas: matrix }
        }),
        juego: gameTheme.name
      }

      await Promise.all([
        PrinterService.printCuotas(printData),
        new Promise(r => setTimeout(r, 1500))
      ])
    } catch (err) {
      console.error('[handlePrintCuotas] Failed:', err)
      setShowPrinterError(true)
    } finally {
      setPrintingCuotasCount(null)
    }
  }, [printingCuotasCount, oddsData, activeGame, gameTheme.name])

  // Print results
  const handlePrintResults = useCallback(async (count: number) => {
    console.log('[handlePrintResults] clicked:', count, 'resultsData:', resultsData.length)
    if (printingResultsCount !== null) return

    const printerStatus = await PrinterService.checkStatus()
    if (!printerStatus.serverRunning || !printerStatus.printerConnected) {
      setShowPrinterError(true)
      return
    }

    setPrintingResultsCount(count)
    try {
      const resultsToPrint = resultsData.slice(0, count)
      const now = new Date()

      const printData = {
        fechaDeImprenta: `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`,
        carreras: resultsToPrint.map(r => ({
          id: r.raceNumber,
          iniciar: r.startTime ?? '',
          resultado: `${r.first}-${r.second}`,
          bonus: r.multiplier === 2 ? 'x2' : r.multiplier === 3 ? 'x3' : ''
        })),
        juego: gameTheme.name
      }

      await Promise.all([
        PrinterService.printResults(printData),
        new Promise(r => setTimeout(r, 1500))
      ])
    } catch (err) {
      console.error('[handlePrintResults] Failed:', err)
      setShowPrinterError(true)
    } finally {
      setPrintingResultsCount(null)
    }
  }, [printingResultsCount, resultsData, gameTheme.name])

  return (
    <ScaleWrapper backgroundImage={currentBackground}>
      {waitingForData && <Loading fullScreen text={relayTimeout ? "SIN DATOS DE CARRERAS — VERIFICAR CONEXION" : "CONECTANDO..."} />}
      {/* No supported games for this device → tell the cashier instead of
         showing an empty board (only the background). */}
      {enabledPrefixes.length === 0 && (
        <BaseModal title="SIN JUEGOS" height={320}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 40px', textAlign: 'center', gap: '12px' }}>
            <span style={{ fontSize: '26px', fontWeight: 700 }}>No hay juegos configurados</span>
            <span style={{ fontSize: '18px', opacity: 0.85 }}>Este punto de venta no tiene juegos habilitados. Contacte al administrador.</span>
          </div>
        </BaseModal>
      )}
      <div className={styles.dashboard} style={dashboardVisibilityStyle}>
        {/* Source Mode Badge - shown when simulator is in test mode */}
        {sourceMode === 'test' && (
          <div className={styles.sourceModeBadge}>MODO TEST</div>
        )}
        {/* Cashier "Cargar saldo" (recarga) modal — opened by the RECARGAS
            tab button inside GameSlide (web skin) via onRecharge. */}
        <RechargeModal
          open={showRecharge}
          onClose={() => setShowRecharge(false)}
          onSuccess={(kind, amount, phone) => addWalletMovement(kind, amount, phone)}
        />
        {/* ============================================================
           FULL-PANEL GAME CAROUSEL
           Each slide is a complete game panel including header, background,
           selection buttons, function buttons, coins, delete/print, DOT panels.
           ALL elements slide together (header + content) like the original POS.
           Overlays stay OUTSIDE. Animation ~630ms matches original VG POS.
        ============================================================ */}
        <div className={styles.gameCarousel} style={{ overflow: betsExpanded ? 'visible' : undefined }}>
          <div
            className={styles.gameCarouselTrack}
            style={{ transform: `translateX(-${enabledPrefixes.indexOf(activeGame) * 100}%)` }}
          >
            {enabledPrefixes.map((prefix) => {
              const slideData = getGameData(prefix)
              const slideGameKey = (prefix === 'dot' ? 'dos' : prefix) as 'dos' | 'doe' | 'hoc'
              return (
                <GameSlide
                  key={prefix}
                  prefix={prefix}
                  activeGame={activeGame}
                  // Header — menu
                  activeMenu={activeMenu}
                  setActiveMenu={setActiveMenu}
                  // Header — per-game race data
                  raceNumber={slideData.raceNumber}
                  raceStartTime={slideData.raceStartTime}
                  serverTime={slideData.serverTime}
                  raceState={slideData.raceState}
                  serverCountdown={slideData.countdown}
                  roundInterval={slideData.roundInterval}
                  // Header — game
                  setActiveGame={setActiveGame}
                  enabledPrefixes={enabledPrefixes}
                  gameKey={slideGameKey}
                  gameAssets={getGameAssets(prefix as any)}
                  handleGameLogoClick={handleGameLogoClick}
                  // Header — operator
                  operatorId={operatorId}
                  sessionCode={sessionCode}
                  // Header — pending tickets
                  pendingTickets={pendingTickets}
                  // Header — settings
                  showSettingsMenu={showSettingsMenu}
                  setShowSettingsMenu={setShowSettingsMenu}
                  isClosingSettings={isClosingSettings}
                  setIsClosingSettings={setIsClosingSettings}
                  autoChangeEnabled={autoChangeEnabled}
                  setAutoChangeEnabled={setAutoChangeEnabled}
                  // Header — ticket search
                  showTicketIdInput={showTicketIdInput}
                  setShowTicketIdInput={setShowTicketIdInput}
                  ticketIdValue={ticketIdValue}
                  setTicketIdValue={setTicketIdValue}
                  ticketSearchError={ticketSearchError}
                  isSearchingTicket={isSearchingTicket}
                  handleTicketSearch={handleTicketSearch}
                  // Header — next game info
                  getGameData={getGameData}
                  // Tab state
                  isJugadaTab={isJugadaTab}
                  isResultadosTab={isResultadosTab}
                  isCuotasTab={isCuotasTab}
                  isVentasTab={isVentasTab}
                  // Tab content
                  resultsData={getGameResults(prefix)}
                  resultsPageSize={resultsPageSize}
                  setResultsPageSize={setResultsPageSize}
                  handlePrintResults={handlePrintResults}
                  printingResultsCount={printingResultsCount}
                  oddsData={getGameOdds(prefix)}
                  cuotasPageSize={cuotasPageSize}
                  setCuotasPageSize={setCuotasPageSize}
                  handlePrintCuotas={handlePrintCuotas}
                  printingCuotasCount={printingCuotasCount}
                  salesRecords={salesRecords}
                  handleBalance={handleBalance}
                  isBalancing={isBalancing}
                  handleReprint={handleReprint}
                  reprintingIndex={reprintingIndex}
                  // Selections
                  selectedFirst={selectedFirst}
                  selectedSecond={selectedSecond}
                  selectedThird={selectedThird}
                  handleSelectionMouseDown={handleSelectionMouseDown}
                  handleSelectionMouseEnter={handleSelectionMouseEnter}
                  betMode={betMode}
                  orderMode={orderMode}
                  setBetMode={setBetMode}
                  setOrderMode={setOrderMode}
                  sumValue={sumValue}
                  setSumValue={setSumValue}
                  handleGemela={handleGemela}
                  handleContra={handleContra}
                  handleTrio={handleTrio}
                  toggleRueda={toggleRueda}
                  toggleMediaRueda={toggleMediaRueda}
                  ruedaMode={ruedaMode}
                  handleDenominationSelect={handleDenominationSelect}
                  handleDelete={handleDelete}
                  handlePrint={handlePrint}
                  isPrinting={isPrinting}
                  bets={bets}
                  onRemoveBet={removeBet}
                  betsExpanded={betsExpanded}
                  setBetsExpanded={setBetsExpanded}
                  betsStyle={betsStyle}
                  onOrderTicketClick={() => setShowOrderTicket(true)}
                  onRecharge={() => setShowRecharge(true)}
                />
              )
            })}
          </div>
        </div>

        {/* Order Ticket Screen */}
        <OrderTicket
          visible={showOrderTicket}
          onClose={() => setShowOrderTicket(false)}
          tickets={prepTickets}
          serverTime={serverTime}
          pendingCount={pendingTickets}
        />

        {/* Overlays — stay outside the carousel so they don't slide */}
        <DashboardOverlays
          ticketNotification={ticketNotification}
          showOverlay={showOverlay}
          isJugadaTab={isJugadaTab}
          raceState={raceState}
          isOverlayExiting={isOverlayExiting}
          activeGame={activeGame}
          isConnectionLost={isConnectionLost}
          isReconnecting={isReconnecting}
          isRelayStale={isRelayStale}
          searchedTicket={searchedTicket}
          setSearchedTicket={setSearchedTicket}
          isCancelling={isCancelling}
          isPaying={isPaying}
          handleTicketPay={handleTicketPay}
          handleTicketCancel={handleTicketCancel}
          handleRebet={handleRebet}
        />
      </div>
      {showPrinterError && (
        <PrinterErrorModal onAccept={() => setShowPrinterError(false)} />
      )}

      {/* Tip Limit Overlay — slide-up dark panel over coins area */}
      {tipLimitMessage && (
        <div className={styles.tipLimitOverlay}>
          <div className={styles.tipLimitText}>
            <span>¡Límite de tip alcanzado!</span>
            <span>{tipLimitMessage}</span>
          </div>
        </div>
      )}
    </ScaleWrapper>
  )
}
