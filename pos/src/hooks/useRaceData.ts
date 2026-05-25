import { useEffect, useState, useCallback, useRef } from 'react'

export type GamePrefix = 'dos' | 'dot' | 'doe' | 'hoc'

export interface GameConfig {
  name: string
  runners: number
}

export interface GameData {
  raceNumber: string
  countdown: number
  serverTime: string
  raceStartTime: string
  progress: number
}

export interface AllGamesData {
  dos: GameData
  dot: GameData
  doe: GameData
  hoc: GameData
}

export interface GamesConfig {
  dos: GameConfig
  dot: GameConfig
  doe: GameConfig
  hoc: GameConfig
}

interface UseRaceDataOptions {
  url?: string
  enabled?: boolean
  activeGame?: GamePrefix
  onGameUpdate?: (prefix: GamePrefix, data: GameData) => void
}

interface UseRaceDataReturn {
  // Current active game data
  data: GameData | null
  // All games data
  allGames: AllGamesData | null
  // Games configuration (names, runners)
  gamesConfig: GamesConfig | null
  // Active game prefix
  activeGame: GamePrefix
  // Set active game
  setActiveGame: (prefix: GamePrefix) => void
  // Connection status
  connected: boolean
  error: string | null
  reconnect: () => void
  // Capture service status
  captureActive: boolean
  captureConnected: boolean
  captureConnecting: boolean
  captureError: string | null
}

// Get WebSocket URL dynamically based on current page host
function getRelayUrl(): string {
  // Check Electron desktop config first (runtime)
  const desktopRelay = (window as any).desktopApp?.config?.relayUrl
  if (desktopRelay) return desktopRelay

  // Check environment variable (build time)
  if (import.meta.env.VITE_RELAY_URL) {
    return import.meta.env.VITE_RELAY_URL
  }
  // In browser, use same host as page but port 8765
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    return `${protocol}//${host}:8765`
  }
  return 'ws://localhost:8765'
}

const DEFAULT_GAME_DATA: GameData = {
  raceNumber: '----',
  countdown: 0,
  serverTime: '--:--:--',
  raceStartTime: '--:--:--',
  progress: 0
}

const DEFAULT_ALL_GAMES: AllGamesData = {
  dos: { ...DEFAULT_GAME_DATA },
  dot: { ...DEFAULT_GAME_DATA },
  doe: { ...DEFAULT_GAME_DATA },
  hoc: { ...DEFAULT_GAME_DATA }
}

export function useRaceData(options: UseRaceDataOptions = {}): UseRaceDataReturn {
  const { url, enabled = true, activeGame: initialGame = 'dos', onGameUpdate } = options

  // Get WebSocket URL - use provided or detect from current host
  const wsUrl = url || getRelayUrl()

  const [allGames, setAllGames] = useState<AllGamesData | null>(null)
  const [gamesConfig, setGamesConfig] = useState<GamesConfig | null>(null)
  const [activeGame, setActiveGame] = useState<GamePrefix>(initialGame)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captureActive, setCaptureActive] = useState(true)
  const [captureConnected, setCaptureConnected] = useState(false)
  const [captureConnecting, setCaptureConnecting] = useState(false)
  const [captureError, setCaptureError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onGameUpdateRef = useRef(onGameUpdate)

  // Keep onGameUpdate ref current
  useEffect(() => {
    onGameUpdateRef.current = onGameUpdate
  }, [onGameUpdate])

  const connect = useCallback(() => {
    if (!enabled) return

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }

    try {
      console.log(`[useRaceData] Connecting to ${wsUrl}...`)
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[useRaceData] Connected')
        setConnected(true)
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)

          // Handle all games update (sent on connect or bulk updates)
          if (message.msgType === 'allGamesUpdate') {
            setAllGames(message.games)
            if (message.gamesConfig) {
              setGamesConfig(message.gamesConfig)
            }
            // Update capture status from allGamesUpdate
            if (typeof message.captureActive === 'boolean') {
              setCaptureActive(message.captureActive)
              setCaptureConnected(true)
            }
          }

          // Handle capture status updates
          if (message.msgType === 'captureStatus') {
            setCaptureActive(message.captureActive)
            setCaptureConnected(message.captureConnected ?? true)
            setCaptureConnecting(message.captureConnecting ?? false)
            setCaptureError(message.error || null)
          }

          // Handle single game update
          if (message.msgType === 'gameUpdate') {
            const prefix = message.gamePrefix as GamePrefix
            const gameData: GameData = message.data

            setAllGames(prev => {
              if (!prev) return { ...DEFAULT_ALL_GAMES, [prefix]: gameData }
              return { ...prev, [prefix]: gameData }
            })

            onGameUpdateRef.current?.(prefix, gameData)
          }

          // Legacy: Handle old raceUpdate format for backwards compatibility
          if (message.msgType === 'raceUpdate') {
            const prefix = (message.gamePrefix || 'dos') as GamePrefix
            const gameData: GameData = {
              raceNumber: message.raceNumber,
              countdown: message.countdown,
              serverTime: message.serverTime,
              raceStartTime: message.raceStartTime,
              progress: message.progress
            }

            setAllGames(prev => {
              if (!prev) return { ...DEFAULT_ALL_GAMES, [prefix]: gameData }
              return { ...prev, [prefix]: gameData }
            })
          }
        } catch (err) {
          console.error('[useRaceData] Error parsing message:', err)
        }
      }

      ws.onerror = () => {
        console.error('[useRaceData] WebSocket error')
        setError('Connection error')
      }

      ws.onclose = () => {
        console.log('[useRaceData] Disconnected')
        setConnected(false)

        // Auto-reconnect after 3 seconds
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[useRaceData] Attempting reconnect...')
            connect()
          }, 3000)
        }
      }
    } catch (err) {
      console.error('[useRaceData] Failed to connect:', err)
      setError('Failed to connect')
      setConnected(false)
    }
  }, [wsUrl, enabled])

  const reconnect = useCallback(() => {
    connect()
  }, [connect])

  // Connect on mount
  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect, enabled])

  // Get current active game data
  const data = allGames?.[activeGame] ?? null

  return {
    data,
    allGames,
    gamesConfig,
    activeGame,
    setActiveGame,
    connected,
    error,
    reconnect,
    captureActive,
    captureConnected,
    captureConnecting,
    captureError
  }
}

export default useRaceData
