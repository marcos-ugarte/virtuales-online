/**
 * WebSocket Direct Relay Server
 *
 * Connects directly to vgcontrol.com WebSocket without Playwright.
 * Optimized for cloud deployment - no browser, minimal resources.
 *
 * Ports:
 * - 4081: WebSocket relay to POS clients
 * - 4082: HTTP control API (status/pause/resume)
 */

import WebSocket from 'ws'
import { WebSocketServer } from 'ws'
import * as http from 'http'
import * as signalR from '@microsoft/signalr'

// Configuration
const CONFIG = {
  // VG Control WebSocket
  DISCOVERY_URL: 'https://rdweb.racingdogs.eu/dsa4/',
  DEVICE_ID: process.env.DEVICE_ID || '5fd76331325cc0c7b0ba3883ae3d491d',
  OPERATOR_ID: process.env.OPERATOR_ID || '001-001-002-001',
  PIN: process.env.PIN || '989900',

  // Relay ports
  RELAY_PORT: parseInt(process.env.RELAY_PORT || '4081'),
  CONTROL_PORT: parseInt(process.env.CONTROL_PORT || '4082'),

  // Timing
  HEARTBEAT_INTERVAL_MS: 5000,
  RECONNECT_DELAY_MS: 5000,
  GAMEROUND_POLL_INTERVAL_MS: 5000,  // Poll for gameRound updates every 5 seconds

  // Betoffer IDs for polling (DOS=141, HOC=241, DOE=541, DOT=741)
  BETOFFER_IDS: [141, 241, 541, 741],

  // Backend API (for Ingest and SignalR)
  BACKEND_API_URL: process.env.BACKEND_API_URL || 'https://api.virtuales.bet',
  BACKEND_DEVICE_ID: process.env.BACKEND_DEVICE_ID || 'relay-server-001',
  INGEST_API_URL: process.env.INGEST_API_URL || 'https://api.virtuales.bet',
  INGEST_API_KEY: process.env.INGEST_API_KEY || process.env.API_KEY || '',

  // Elasticsearch
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || '',
  ELASTICSEARCH_API_KEY: process.env.ELASTICSEARCH_API_KEY || '',
  ELASTICSEARCH_INDEX: process.env.ELASTICSEARCH_INDEX || 'vg-pos-messages'
}

// Types
interface CompetitorData {
  name: string
  weight: number
  numberOfRaces: number
  numberOfWins: number
  strikeRate: number
  bestLap: number
  performance: number
  last5: string
  trend: number
}

interface RaceData {
  type: 'raceUpdate'
  game: string
  raceId: string
  raceNumber: string
  videoStartDt: string
  videoEndDt: string
  eventType: string
  roundInterval: number
  odds: number[]
  competitors: Record<string, CompetitorData>
}

interface RaceResult {
  type: 'raceResult'
  game: string
  raceId: string
  finish: Record<string, { competitorIndex: number; time: number | null }>
  bonus: number
  eventType: string
}

interface TimeSync {
  type: 'timeSync'
  serverTime: string
  serverTimeUnix: number
}

interface ConnectionStatus {
  type: 'status'
  connected: boolean
  message: string
}

interface GamepoolUpdate {
  type: 'gamepoolUpdate'
  gamepool: Record<string, RaceData[]>
}

interface ResultsHistoryUpdate {
  type: 'resultsHistory'
  game: string
  results: Array<{
    raceNumber: string
    first: number
    second: number
  }>
}

type RelayMessage = RaceData | RaceResult | TimeSync | ConnectionStatus | GamepoolUpdate | ResultsHistoryUpdate

interface Stats {
  messagesReceived: number
  messagesSent: number
  gameRounds: number
  gameResults: number
  errors: number
  lastMessageAt: string | null
  uptime: number
}

// Map eventType to game prefix - MUST match Playwright version exactly
function getGameFromEventType(eventType: string): string | null {
  switch (eventType) {
    case 'dog': return 'dos'      // 6 dogs
    case 'dog8': return 'doe'     // 8 dogs
    case 'dog63': return 'dot'    // 6 dogs trifecta
    case 'horsec': return 'hoc'   // horses
    default:
      console.log(`⚠️ Unknown eventType: ${eventType}`)
      return null
  }
}

// Map betoffer eventtype to game prefix for historical results
function getGameFromBetofferEventType(eventtype: string): string | null {
  switch (eventtype) {
    case 'dog': return 'dos'
    case 'dog8': return 'doe'
    case 'dog63': return 'dot'
    case 'horsec': return 'hoc'
    default: return null
  }
}

// Extract race number from ID (format: betofferId_schedule_raceNumber)
function extractRaceNumber(id: string): string {
  const parts = id.split('_')
  if (parts.length >= 3) {
    // Last part is like "202512310193" - extract last 4 digits as race number
    const lastPart = parts[2]
    return lastPart.slice(-4)
  }
  return '0000'
}

// ============================================================================
// Backend Client - SignalR connection for registering game rounds
// NOTE: SignalR is OPTIONAL. The Ingest API provides the same functionality
// for race data sync. SignalR may fail if relay device is not registered.
// ============================================================================

class BackendClient {
  private connection: signalR.HubConnection | null = null
  private isConnected = false
  private deviceId: string
  private registeredRounds: Set<string> = new Set()
  private connectionAttempted = false

  constructor() {
    this.deviceId = CONFIG.BACKEND_DEVICE_ID
  }

  async connect(): Promise<boolean> {
    if (this.isConnected && this.connection) {
      return true
    }

    // Only attempt connection once at startup
    if (this.connectionAttempted) {
      return false
    }
    this.connectionAttempted = true

    try {
      const discoveryUrl = `${CONFIG.BACKEND_API_URL}/api/ws/discover?deviceId=${this.deviceId}&deviceType=pos`
      console.log(`🔍 [Backend] Discovering WebSocket URL...`)

      const response = await fetch(discoveryUrl)
      if (!response.ok) {
        console.log(`⚠️ [Backend] Device not registered (${this.deviceId})`)
        console.log(`   SignalR is OPTIONAL - Ingest API will handle race data sync`)
        return false
      }

      const discovery = await response.json()
      console.log(`✅ [Backend] Discovery OK: ${discovery.locationName}`)

      const hubUrl = `${CONFIG.BACKEND_API_URL}/hubs/pos`

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build()

      this.connection.onclose(() => {
        console.log('🔌 [Backend] Connection closed')
        this.isConnected = false
      })

      this.connection.onreconnected(() => {
        console.log('🔄 [Backend] Reconnected')
        this.isConnected = true
      })

      this.connection.on('connectionrejected', () => {
        console.error('❌ [Backend] Connection REJECTED: Device already in use!')
        this.isConnected = false
      })

      await this.connection.start()
      console.log(`✅ [Backend] Connected to SignalR hub`)
      this.isConnected = true

      return true
    } catch (error) {
      console.log(`⚠️ [Backend] SignalR connection failed (non-critical)`)
      console.log(`   Ingest API will handle race data sync`)
      return false
    }
  }

  async registerGameRound(gameRound: any): Promise<boolean> {
    const gameId = gameRound.id

    if (this.registeredRounds.has(gameId)) {
      return true
    }

    // SignalR is optional - silently skip if not connected
    if (!this.isConnected || !this.connection) {
      return false
    }

    try {
      const gameTypeMap: Record<string, string> = {
        'dog': 'dog6',
        'dog8': 'dog8',
        'dog63': 'dog63',
        'horsec': 'horsec'
      }
      const gameType = gameTypeMap[gameRound.eventType] || gameRound.eventType

      const request = {
        msgType: 'registerGameRound',
        gameId: gameId,
        gameType: gameType,
        raceNumber: extractRaceNumber(gameId),
        competitorsCount: gameRound.competitorsCount,
        countdown: gameRound.countdown,
        roundInterval: gameRound.roundInterval,
        videoStartDt: gameRound.videoStartDt,
        videoEndDt: gameRound.videoEndDt,
        odds: gameRound.odds,
        oddsMatrix: gameRound.oddsMatrix,
        winOdds: gameRound.winOdds,
        competitors: gameRound.competitors,
        serverTime: gameRound.serverTime
      }

      const result = await this.connection.invoke('registerGameRound', request)

      if (result?.msgValue === 'ok') {
        console.log(`✅ [Backend] Registered gameRound: ${gameId}`)
        this.registeredRounds.add(gameId)
        if (this.registeredRounds.size > 1000) {
          const firstKey = this.registeredRounds.values().next().value
          if (firstKey) this.registeredRounds.delete(firstKey)
        }
        return true
      } else {
        console.log(`⚠️ [Backend] Failed to register ${gameId}: ${result?.errorMessage || 'Unknown error'}`)
        return false
      }
    } catch (error) {
      console.log(`⚠️ [Backend] registerGameRound not available: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }
}

class DirectRelayServer {
  private wsClient: WebSocket | null = null
  private wss: WebSocketServer
  private controlServer: http.Server
  private clients: Set<WebSocket> = new Set()
  private isPaused = false
  private isConnected = false
  private msgId = 0
  private heartbeatInterval: NodeJS.Timeout | null = null
  private gameRoundPollInterval: NodeJS.Timeout | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private currentBetofferIndex = 0  // Rotate through betoffers
  private startTime = Date.now()
  private lockedRounds: Set<string> = new Set()
  private lastCountdown: Map<string, number> = new Map()
  private backendClient: BackendClient
  // Cache for new client connections - matches Playwright's latestData pattern
  private latestData: Map<string, RelayMessage> = new Map()

  private stats: Stats = {
    messagesReceived: 0,
    messagesSent: 0,
    gameRounds: 0,
    gameResults: 0,
    errors: 0,
    lastMessageAt: null,
    uptime: 0
  }

  constructor() {
    // Initialize backend client for SignalR
    this.backendClient = new BackendClient()
    this.backendClient.connect().catch(err => {
      console.log(`⚠️ [Backend] Initial connection failed: ${err}`)
    })

    // Create WebSocket server for POS clients
    this.wss = new WebSocketServer({ port: CONFIG.RELAY_PORT })
    this.setupRelayServer()

    // Create HTTP control server
    this.controlServer = this.createControlServer()

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         WebSocket Direct Relay Server (No Playwright)         ║
╠═══════════════════════════════════════════════════════════════╣
║  Relay WebSocket:  ws://0.0.0.0:${CONFIG.RELAY_PORT}                        ║
║  Control API:      http://0.0.0.0:${CONFIG.CONTROL_PORT}                       ║
║  Device ID:        ${CONFIG.DEVICE_ID.slice(0, 20)}...              ║
║  Operator:         ${CONFIG.OPERATOR_ID}                          ║
╚═══════════════════════════════════════════════════════════════╝
    `)

    // Start connection
    this.connect()
  }

  private setupRelayServer() {
    // Ping all clients every 30 seconds to keep connections alive
    const pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if ((ws as any).isAlive === false) {
          console.log('📱 Client unresponsive, terminating')
          return ws.terminate()
        }
        (ws as any).isAlive = false
        ws.ping()
      })
    }, 30000)

    this.wss.on('close', () => {
      clearInterval(pingInterval)
    })

    this.wss.on('connection', (ws) => {
      this.clients.add(ws)
      ;(ws as any).isAlive = true
      console.log(`📱 Client connected (${this.clients.size} total)`)

      ws.on('pong', () => {
        (ws as any).isAlive = true
      })

      // Send current status
      this.sendToClient(ws, {
        type: 'status',
        connected: this.isConnected,
        message: this.isConnected ? 'Connected to VG Control' : 'Connecting...'
      })

      // Send latest cached data - matches Playwright behavior
      for (const data of this.latestData.values()) {
        this.sendToClient(ws, data)
      }

      ws.on('close', () => {
        this.clients.delete(ws)
        console.log(`📱 Client disconnected (${this.clients.size} total)`)
      })

      ws.on('error', (err) => {
        console.log(`❌ Client error: ${err.message}`)
        this.clients.delete(ws)
      })
    })
  }

  private sendToClient(client: WebSocket, data: RelayMessage) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data))
    }
  }

  private createControlServer(): http.Server {
    const server = http.createServer((req, res) => {
      const allowedOrigins = ['http://localhost:4069', 'http://88.223.95.55:4069', 'https://88.223.95.55:4069']
      const reqOrigin = req.headers.origin || ''
      if (allowedOrigins.includes(reqOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', reqOrigin)
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Content-Type', 'application/json')

      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      const url = req.url || '/'

      if (req.method === 'GET' && url === '/status') {
        this.stats.uptime = Math.floor((Date.now() - this.startTime) / 1000)
        res.writeHead(200)
        res.end(JSON.stringify({
          status: this.isPaused ? 'paused' : 'running',
          connected: this.isConnected,
          clients: this.clients.size,
          stats: this.stats,
          config: {
            deviceId: CONFIG.DEVICE_ID,
            operator: CONFIG.OPERATOR_ID
          }
        }))
        return
      }

      if (req.method === 'POST' && url === '/pause') {
        this.pause()
        res.writeHead(200)
        res.end(JSON.stringify({ success: true, status: 'paused' }))
        return
      }

      if (req.method === 'POST' && url === '/resume') {
        this.resume()
        res.writeHead(200)
        res.end(JSON.stringify({ success: true, status: 'running' }))
        return
      }

      if (req.method === 'POST' && url === '/toggle') {
        if (this.isPaused) {
          this.resume()
          res.writeHead(200)
          res.end(JSON.stringify({ success: true, status: 'running' }))
        } else {
          this.pause()
          res.writeHead(200)
          res.end(JSON.stringify({ success: true, status: 'paused' }))
        }
        return
      }

      res.writeHead(404)
      res.end(JSON.stringify({ error: 'Not found' }))
    })

    server.listen(CONFIG.CONTROL_PORT)
    return server
  }

  private async discoverWebSocketUrl(): Promise<string> {
    const url = `${CONFIG.DISCOVERY_URL}?rt=3&out=json&cmd=WebSocketRequest&deviceId=${CONFIG.DEVICE_ID}&deviceType=pos`

    const response = await fetch(url)
    const data = await response.json()

    if (data.url) {
      return data.url
    }
    throw new Error('WebSocket URL not found in discovery response')
  }

  private async connect() {
    if (this.isPaused) {
      console.log('⏸️ Paused - not connecting')
      return
    }

    try {
      console.log('🔍 Discovering WebSocket URL...')
      const wsUrl = await this.discoverWebSocketUrl()
      console.log(`🔌 Connecting to ${wsUrl}`)

      this.wsClient = new WebSocket(wsUrl)

      this.wsClient.on('open', () => {
        console.log('✅ WebSocket connected')
        this.sendDeviceLogin()
      })

      this.wsClient.on('message', (data) => {
        this.handleMessage(data.toString())
      })

      this.wsClient.on('close', () => {
        console.log('🔌 WebSocket closed')
        this.isConnected = false
        this.stopHeartbeat()
        this.stopGameRoundPolling()
        this.broadcast({ type: 'status', connected: false, message: 'Disconnected' })
        this.scheduleReconnect()
      })

      this.wsClient.on('error', (err) => {
        console.log(`❌ WebSocket error: ${err.message}`)
        this.stats.errors++
      })

    } catch (error: any) {
      console.log(`❌ Connection failed: ${error.message}`)
      this.stats.errors++
      this.scheduleReconnect()
    }
  }

  private sendDeviceLogin() {
    const msg = {
      msgId: ++this.msgId,
      msgType: 'deviceLogin',
      deviceType: 'pos',
      deviceId: CONFIG.DEVICE_ID,
      uniqueId: `relay-${Date.now()}`,
      version: '3.0.1000',
      clientDt: this.formatDate()
    }

    this.send(msg)
    console.log('📤 deviceLogin sent')
  }

  private sendInit() {
    const msg = {
      msgId: ++this.msgId,
      msgType: 'init',
      user: CONFIG.OPERATOR_ID,
      pass: CONFIG.PIN,
      historyGames: -8,
      futureGames: 22
    }

    this.send(msg)
    console.log('📤 init sent')
  }

  private sendHeartbeat() {
    const msg = {
      msgId: ++this.msgId,
      msgType: 'time',
      clientDt: this.formatDate()
    }

    this.send(msg)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.wsClient?.readyState === WebSocket.OPEN) {
        this.sendHeartbeat()
      }
    }, CONFIG.HEARTBEAT_INTERVAL_MS)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // GameRound polling - request updates from server (like VG POS browser does)
  private sendGameRoundRequest(betofferId: number) {
    const msg = {
      msgId: ++this.msgId,
      msgType: 'gameRound',
      betofferId: betofferId,
      futureGames: 22,
      historyGames: 0,
      gameId: null
    }
    this.send(msg)
  }

  private startGameRoundPolling() {
    this.stopGameRoundPolling()
    console.log(`🔄 Starting gameRound polling for betoffers: ${CONFIG.BETOFFER_IDS.join(', ')}`)

    // Poll for gameRound updates, rotating through betoffers
    this.gameRoundPollInterval = setInterval(() => {
      if (this.isConnected && this.wsClient?.readyState === WebSocket.OPEN) {
        // Get next betoffer in rotation
        const betofferId = CONFIG.BETOFFER_IDS[this.currentBetofferIndex]
        this.sendGameRoundRequest(betofferId)

        // Move to next betoffer for next poll
        this.currentBetofferIndex = (this.currentBetofferIndex + 1) % CONFIG.BETOFFER_IDS.length
      }
    }, CONFIG.GAMEROUND_POLL_INTERVAL_MS)
  }

  private stopGameRoundPolling() {
    if (this.gameRoundPollInterval) {
      clearInterval(this.gameRoundPollInterval)
      this.gameRoundPollInterval = null
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    if (!this.isPaused) {
      console.log(`🔄 Reconnecting in ${CONFIG.RECONNECT_DELAY_MS / 1000}s...`)
      this.reconnectTimeout = setTimeout(() => this.connect(), CONFIG.RECONNECT_DELAY_MS)
    }
  }

  private handleMessage(data: string) {
    try {
      const msg = JSON.parse(data)
      this.stats.messagesReceived++
      this.stats.lastMessageAt = new Date().toISOString()

      // Log all message types for debugging (except time which is frequent)
      if (msg.msgType !== 'time') {
        const hasGamepool = msg.gamepool ? ` (${msg.gamepool.length} races)` : ''
        console.log(`📨 Message: ${msg.msgType}${hasGamepool}`)
      }

      // Send to Elasticsearch
      this.sendToElasticsearch(msg.msgType || 'unknown', msg, 'IN')

      switch (msg.msgType) {
        case 'deviceLogin':
          if (msg.posInitId) {
            console.log('✅ deviceLogin OK')
            this.sendInit()
          } else if (msg.errorMsg) {
            console.log(`❌ deviceLogin error: ${msg.errorMsg}`)
            this.stats.errors++
          }
          break

        case 'init':
          if (msg.msgValue === 'ok') {
            console.log(`✅ init OK - Session: ${msg.sessionID}`)
            this.isConnected = true
            this.broadcast({ type: 'status', connected: true, message: `Connected (Session: ${msg.sessionID})` })
            this.startHeartbeat()
            this.startGameRoundPolling()

            // Initial gamepool data - use same filtering as gameRound
            if (msg.gamepool) {
              this.handleGameRound({ gamepool: msg.gamepool })
            }

            // Extract historical results from setting.betoffers[].stats.history
            if (msg.setting?.betoffers) {
              this.handleInitialResults(msg.setting.betoffers)
            }
          } else if (msg.errorMsg) {
            console.log(`❌ init error: ${msg.errorMsg}`)
            this.stats.errors++
          }
          break

        case 'gameRound':
          this.handleGameRound(msg)
          break

        case 'gameResult':
          this.handleGameResult(msg)
          break

        case 'time':
          // Heartbeat response - update time sync
          this.handleTimeSync(msg)
          // Check if time message contains gamepool (some servers send updates this way)
          if (msg.gamepool && Array.isArray(msg.gamepool) && msg.gamepool.length > 0) {
            console.log(`📦 Gamepool found in time message: ${msg.gamepool.length} races`)
            this.handleGameRound({ gamepool: msg.gamepool })
          }
          break

        case 'error':
          console.log(`❌ Server error: ${msg.errorMsg}`)
          this.stats.errors++
          break

        default:
          // Log unknown message types for debugging
          if (msg.msgType && msg.msgType !== 'time') {
            console.log(`⚠️ Unknown msgType: ${msg.msgType}`)
          }
          // Still check for gamepool in unknown message types
          if (msg.gamepool && Array.isArray(msg.gamepool) && msg.gamepool.length > 0) {
            console.log(`📦 Gamepool found in ${msg.msgType} message: ${msg.gamepool.length} races`)
            this.handleGameRound({ gamepool: msg.gamepool })
          }
          break
      }

    } catch (error) {
      // Non-JSON message, ignore
    }
  }

  private handleGameRound(message: any) {
    if (!message.gamepool) return

    this.stats.gameRounds++

    // Debug: log all event types in this message
    const eventTypes = [...new Set(message.gamepool.map((g: any) => g.eventType))]
    console.log(`🎮 Gamepool received with eventTypes: ${eventTypes.join(', ')}`)

    // Group games by game TYPE (not betoffer) to combine both schedules (141+241 -> dos)
    const gamesByGameType: Record<string, any[]> = {}

    for (const game of message.gamepool) {
      const gameType = getGameFromEventType(game.eventType)
      if (!gameType) continue

      if (!gamesByGameType[gameType]) {
        gamesByGameType[gameType] = []
      }
      gamesByGameType[gameType].push(game)

      // Register game round with backend API (SignalR) - OPENS the round
      this.backendClient.registerGameRound(game).catch((err) => {
        console.log(`⚠️ Failed to register gameRound via SignalR: ${err}`)
      })
    }

    // Send to Ingest API for SQL Server persistence (includes timing data)
    this.sendRaceDataToIngestAPI(message.gamepool)

    // Check countdown and lock rounds when countdown ≤ 5 seconds
    const now = Date.now()
    for (const game of message.gamepool) {
      if (!game.id || !game.videoStartDt) continue

      // Calculate countdown from videoStartDt
      const videoStart = new Date(game.videoStartDt.replace(' ', 'T') + 'Z').getTime()
      const countdown = Math.floor((videoStart - now) / 1000)

      // Skip if already locked or countdown is not relevant
      if (this.lockedRounds.has(game.id)) continue

      const prevCountdown = this.lastCountdown.get(game.id) ?? countdown
      this.lastCountdown.set(game.id, countdown)

      // Lock when countdown transitions from >5 to ≤5 (or starts at ≤5)
      // MUST match Playwright: prevCountdown > 5 || prevCountdown === countdown
      if (countdown <= 5 && countdown > 0) {
        if (prevCountdown > 5 || prevCountdown === countdown) {
          console.log(`⏱️ Countdown ≤5s for ${game.id}: ${countdown}s - triggering lock`)
          this.lockedRounds.add(game.id)
          this.lockRound(game.id)
        }
      }

      // Clean up old entries (avoid memory leak)
      if (countdown < -60) {
        this.lastCountdown.delete(game.id)
      }
    }

    // Clean up lockedRounds periodically (keep only last 100)
    if (this.lockedRounds.size > 100) {
      const arr = Array.from(this.lockedRounds)
      arr.slice(0, arr.length - 100).forEach(id => this.lockedRounds.delete(id))
    }

    // Build full gamepool with all races converted to RaceData format
    const fullGamepool: Record<string, RaceData[]> = {}

    for (const [gameType, games] of Object.entries(gamesByGameType)) {
      if (games.length === 0) continue

      // Sort by videoStartDt
      const sortedGames = games.sort((a, b) => {
        const timeA = new Date(a.videoStartDt.replace(' ', 'T') + 'Z').getTime()
        const timeB = new Date(b.videoStartDt.replace(' ', 'T') + 'Z').getTime()
        return timeA - timeB
      })

      // Convert all games to RaceData format
      fullGamepool[gameType] = sortedGames.map(game => this.convertToRaceData(game, gameType))

      // Also find and broadcast the "current" race for backwards compatibility
      const currentTime = Date.now()
      let nextRace = sortedGames[sortedGames.length - 1]
      for (const game of sortedGames) {
        const startTime = new Date(game.videoStartDt.replace(' ', 'T') + 'Z').getTime()
        if (startTime > currentTime) {
          nextRace = game
          break
        }
      }
      this.processGamePoolEntry(nextRace, gameType)
    }

    // Broadcast full gamepool so React can cache and switch by time
    const gamepoolUpdate: GamepoolUpdate = {
      type: 'gamepoolUpdate',
      gamepool: fullGamepool
    }
    this.latestData.set('gamepool', gamepoolUpdate)
    this.broadcast(gamepoolUpdate)
    console.log(`📦 Gamepool broadcast: ${Object.entries(fullGamepool).map(([k, v]) => `${k}:${v.length}`).join(', ')}`)
  }

  private convertToRaceData(game: any, gameType: string): RaceData {
    const raceNumber = extractRaceNumber(game.id)

    const raceData: RaceData = {
      type: 'raceUpdate',
      game: gameType,
      raceId: game.id,
      raceNumber,
      videoStartDt: game.videoStartDt,
      videoEndDt: game.videoEndDt,
      eventType: game.eventType,
      roundInterval: game.roundInterval,
      odds: game.odds || [],
      competitors: {}
    }

    // Process competitors
    if (game.competitors) {
      for (const [key, comp] of Object.entries(game.competitors)) {
        const c = comp as any
        raceData.competitors[key] = {
          name: c.name,
          weight: c.weight,
          numberOfRaces: c.numberOfRaces,
          numberOfWins: c.numberOfWins,
          strikeRate: c.strikeRate,
          bestLap: c.bestLap,
          performance: c.performance,
          last5: c.last5,
          trend: c.trend
        }
      }
    }

    return raceData
  }

  private processGamePoolEntry(game: any, gameType: string) {
    const raceData = this.convertToRaceData(game, gameType)

    // Cache and broadcast
    const cacheKey = `race_${gameType}`
    this.latestData.set(cacheKey, raceData)
    this.broadcast(raceData)

    console.log(`📊 Race update: ${gameType.toUpperCase()} #${raceData.raceNumber} [${new Date().toISOString()}]`)
  }

  private handleGameResult(msg: any) {
    if (!msg.gameresult) return

    this.stats.gameResults++

    const result = msg.gameresult
    const gameType = getGameFromEventType(result.eventType)
    if (!gameType) return // Skip unknown event types

    console.log(`🏁 gameResult: ${result.id} [${result.eventType}]`)

    // Send to Ingest API
    this.sendRaceResultToIngestAPI(result)

    const raceResult: RaceResult = {
      type: 'raceResult',
      game: gameType,
      raceId: result.id,
      finish: result.finish,
      bonus: result.bonus,
      eventType: result.eventType
    }

    // Cache and broadcast
    this.latestData.set(`result_${gameType}`, raceResult)
    this.broadcast(raceResult)

    // Log finishing positions
    const positions = Object.entries(result.finish)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .slice(0, 3)
      .map(([pos, data]) => `${pos}:${(data as any).competitorIndex}`)
      .join(', ')

    console.log(`🏁 Result: ${gameType.toUpperCase()} - ${positions}`)
  }

  private handleTimeSync(msg: any) {
    const timeSync: TimeSync = {
      type: 'timeSync',
      serverTime: msg.serverTime,
      serverTimeUnix: msg.serverTimeUnix
    }

    this.broadcast(timeSync)
  }

  private handleInitialResults(betoffers: any[]) {
    // Extract historical results from each betoffer's stats.history
    for (const betoffer of betoffers) {
      if (!betoffer.stats?.history || !betoffer.eventtype) continue

      const gameType = getGameFromBetofferEventType(betoffer.eventtype)
      if (!gameType) continue

      const history = betoffer.stats.history
      const newestGame = betoffer.stats.newestGame || ''
      const oldestGame = betoffer.stats.oldestGame || ''

      // Extract race numbers from newestGame/oldestGame
      // Format: "141_101_202512310193" -> last 4 digits are race number
      const newestRaceNum = parseInt(newestGame.slice(-4)) || 0
      const oldestRaceNum = parseInt(oldestGame.slice(-4)) || 0

      // Transform history array to our result format
      // history[0] = most recent race, history[1] = previous race, etc.
      // Each entry is [1st, 2nd, 3rd, 4th, 5th, 6th] (finishing positions by competitor)
      const results: Array<{ raceNumber: string; first: number; second: number }> = []

      for (let i = 0; i < history.length; i++) {
        const finishOrder = history[i]
        if (!Array.isArray(finishOrder) || finishOrder.length < 2) continue

        // Calculate race number (newest - index)
        const raceNum = newestRaceNum - i
        const raceNumber = String(raceNum).padStart(4, '0')

        // finishOrder[0] = competitor who finished 1st
        // finishOrder[1] = competitor who finished 2nd
        results.push({
          raceNumber,
          first: finishOrder[0],
          second: finishOrder[1]
        })
      }

      if (results.length > 0) {
        const historyUpdate: ResultsHistoryUpdate = {
          type: 'resultsHistory',
          game: gameType,
          results
        }

        // Cache and broadcast
        this.latestData.set(`resultsHistory_${gameType}`, historyUpdate)
        this.broadcast(historyUpdate)

        console.log(`📜 Historical results: ${gameType.toUpperCase()} - ${results.length} races (${oldestRaceNum}-${newestRaceNum})`)
      }
    }
  }

  private async sendRaceDataToIngestAPI(gamepool: any[]) {
    if (!CONFIG.INGEST_API_KEY) return

    // Backend API expects 'horse' not 'horsec'
    const sourceMap: Record<string, string> = {
      'horsec': 'horse'
    }

    try {
      const items = gamepool.map(game => {
        const raceNumber = parseInt(extractRaceNumber(game.id)) || 0

        // Build odds matrix from oddsMatrix if available
        let oddsMatrix: number[][] | null = null
        if (game.oddsMatrix && Array.isArray(game.oddsMatrix)) {
          oddsMatrix = game.oddsMatrix
        }

        // Map eventType to backend-expected Source (horsec -> horse)
        const source = sourceMap[game.eventType] || game.eventType

        return {
          ExternalId: game.id,
          Source: source,  // horsec -> horse for backend compatibility
          RaceNumber: raceNumber,
          WinOdds: game.winOdds || null,
          Odds: game.odds || null,
          OddsMatrix: oddsMatrix,
          UpdatedAt: new Date().toISOString(),
          // CRITICAL: Timing data required for round status management
          VideoStartDt: game.videoStartDt || null,
          VideoEndDt: game.videoEndDt || null,
          RoundInterval: game.roundInterval || null,
          CompetitorsCount: game.competitorsCount || null  // null not 8 - must match Playwright
        }
      }).filter(item => item.ExternalId)

      if (items.length === 0) return

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (CONFIG.INGEST_API_KEY) {
        headers['X-Ingest-Key'] = CONFIG.INGEST_API_KEY
      }

      const response = await fetch(`${CONFIG.INGEST_API_URL}/api/ingest/race-data/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ Items: items })
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error(`❌ [Ingest] race-data error ${response.status}: ${errorBody.slice(0, 200)}`)
      } else {
        const result = await response.json()
        const roundsWithTiming = items.filter(i => i.VideoStartDt).length
        console.log(`✅ [Ingest] race-data: ${result.Processed || result.processed} items (${roundsWithTiming} with timing data)`)
      }
    } catch (error: any) {
      console.error(`❌ [Ingest] race-data error:`, error)
    }
  }

  private async sendRaceResultToIngestAPI(result: any) {
    if (!CONFIG.INGEST_API_KEY) return

    // Backend API expects 'horse' not 'horsec'
    const sourceMap: Record<string, string> = {
      'horsec': 'horse'
    }

    try {
      const raceNumber = parseInt(extractRaceNumber(result.id)) || 0

      // Convert finish object to "1,2,3" format (positions by competitor number)
      let resultString = ''
      if (result.finish) {
        const positions = Object.entries(result.finish)
          .map(([pos, data]) => ({
            position: parseInt(pos),
            competitorNumber: (data as any).competitorIndex
          }))
          .sort((a, b) => a.position - b.position)
          .map(p => p.competitorNumber)

        resultString = positions.join(',')
      }

      // Map eventType to backend-expected Source (horsec -> horse)
      const source = sourceMap[result.eventType] || result.eventType

      const items = [{
        ExternalId: result.id,
        Source: source,  // horsec -> horse for backend compatibility
        RaceNumber: raceNumber,
        Result: resultString,
        UpdatedAt: new Date().toISOString()
      }]

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (CONFIG.INGEST_API_KEY) {
        headers['X-Ingest-Key'] = CONFIG.INGEST_API_KEY
      }

      const response = await fetch(`${CONFIG.INGEST_API_URL}/api/ingest/race-result/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ Items: items })
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error(`❌ [Ingest] race-result error ${response.status}: ${errorBody.slice(0, 200)}`)
      } else {
        const resultResponse = await response.json()
        console.log(`✅ [Ingest] race-result: ${result.id} (settled: ${resultResponse.Settled || resultResponse.settled || 0})`)
      }
    } catch (error: any) {
      console.error(`❌ [Ingest] race-result error:`, error)
    }
  }

  private async lockRound(externalId: string) {
    if (!CONFIG.INGEST_API_KEY) return

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (CONFIG.INGEST_API_KEY) {
        headers['X-Ingest-Key'] = CONFIG.INGEST_API_KEY
      }

      const response = await fetch(`${CONFIG.INGEST_API_URL}/api/ingest/lock-round`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ExternalId: externalId })
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error(`❌ [Ingest] lock-round error ${response.status}: ${errorBody.slice(0, 200)}`)
        this.lockedRounds.delete(externalId) // Allow retry
      } else {
        const result = await response.json()
        console.log(`🔒 [Ingest] Round locked: ${externalId} (status: ${result.status || result.Status})`)
      }
    } catch (error: any) {
      console.error(`❌ [Ingest] lock-round error:`, error)
      this.lockedRounds.delete(externalId)
    }
  }

  private async sendToElasticsearch(msgType: string, message: any, direction: string) {
    if (!CONFIG.ELASTICSEARCH_URL || !CONFIG.ELASTICSEARCH_API_KEY) return

    try {
      // Clean data: remove _ fields (reserved by ES)
      const cleanData = (obj: any): any => {
        if (obj === null || obj === undefined) return obj
        if (typeof obj !== 'object') return obj
        if (Array.isArray(obj)) return obj.map(item => cleanData(item))

        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
          if (!key.startsWith('_')) {
            result[key] = cleanData(value)
          }
        }
        return result
      }

      const cleanedMessage = cleanData(message)

      const doc = {
        msgType,
        direction,
        timestamp: new Date().toISOString(),
        collector: 'ws-direct-relay',
        deviceId: CONFIG.DEVICE_ID,
        ...cleanedMessage
      }

      await fetch(`${CONFIG.ELASTICSEARCH_URL}/${CONFIG.ELASTICSEARCH_INDEX}/_doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${CONFIG.ELASTICSEARCH_API_KEY}`
        },
        body: JSON.stringify(doc)
      })
    } catch (error) {
      // Silently ignore ES errors
    }
  }

  private send(msg: any) {
    if (this.wsClient?.readyState === WebSocket.OPEN) {
      this.wsClient.send(JSON.stringify(msg))
      this.stats.messagesSent++
    }
  }

  private broadcast(data: RelayMessage) {
    // Skip broadcasting if paused (but still update internal state)
    if (this.isPaused) {
      return
    }

    const message = JSON.stringify(data)
    let sentCount = 0
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
        sentCount++
      }
    }

    if (data.type === 'raceUpdate' || data.type === 'raceResult') {
      console.log(`📤 Broadcast to ${sentCount} clients [${new Date().toISOString()}]`)
    }
  }

  private formatDate(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 19)
  }

  private pause() {
    this.isPaused = true
    this.stopHeartbeat()
    this.stopGameRoundPolling()
    if (this.wsClient) {
      this.wsClient.close()
      this.wsClient = null
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    console.log('⏸️ Relay paused')
  }

  private resume() {
    this.isPaused = false
    console.log('▶️ Relay resumed')
    this.connect()
  }
}

// Start server
new DirectRelayServer()
