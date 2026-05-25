/**
 * WebSocket Relay Server
 *
 * Connects to the original POS via Playwright, intercepts WebSocket communication,
 * and relays race data to our React application.
 *
 * Also registers game rounds with the backend API for ticket submission.
 *
 * Ports:
 * - 4081: WebSocket relay
 * - 4082: HTTP control API (status/pause/resume)
 */

import { chromium, Page, BrowserContext, Browser } from 'playwright'
import { WebSocketServer, WebSocket } from 'ws'
import * as signalR from '@microsoft/signalr'
import * as http from 'http'

// Configuration - use environment variables or defaults
// Device 1 (vgpos.net) for relay, Device 2 (pos.proudplant-abfc9fde.eastus.azurecontainerapps.io) for backend registration
const CONFIG = {
  POS_URL: process.env.POS_URL || 'https://5fd76331325cc0c7b0ba3883ae3d491d.vgpos.net/gamepool/dist/',
  OPERATOR_ID: process.env.OPERATOR_ID || '053001002001',
  PIN: process.env.PIN || '989900',
  RELAY_PORT: 4081,
  CONTROL_PORT: 4082,
  VIEWPORT: { width: 1760, height: 858 },
  RECONNECT_DELAY_MS: 5000,
  HEARTBEAT_INTERVAL_MS: 30000,
  // Backend API for registering game rounds - uses RELAY-specific deviceId to avoid conflicts with POS
  BACKEND_API_URL: process.env.BACKEND_API_URL || 'https://api.virtuales.bet',
  BACKEND_DEVICE_ID: process.env.BACKEND_DEVICE_ID || 'relay-server-001',
  // Elasticsearch for storing game data (Azure Elastic Cloud)
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || '',
  ELASTICSEARCH_API_KEY: process.env.ELASTICSEARCH_API_KEY || '',
  ELASTICSEARCH_INDEX: process.env.ELASTICSEARCH_INDEX || 'vg-pos-messages',
  // Elasticsearch for POS logs (separate index)
  ELASTICSEARCH_LOGS_INDEX: process.env.ELASTICSEARCH_LOGS_INDEX || 'pos-logs',
  // Ingest API for SQL Server persistence (Option B: write to both ES and SQL)
  INGEST_API_URL: process.env.INGEST_API_URL || 'https://api.virtuales.bet',
  INGEST_API_KEY: process.env.INGEST_API_KEY || process.env.API_KEY || ''
}

// Human-like behavior helpers
const randomDelay = (min: number, max: number): Promise<void> => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

const humanTypeDelay = (): number => Math.floor(Math.random() * 150) + 50

async function humanMouseMove(page: Page, x: number, y: number): Promise<void> {
  const steps = Math.floor(Math.random() * 10) + 5
  await page.mouse.move(x, y, { steps })
  await randomDelay(100, 300)
}

async function humanClick(page: Page, x: number, y: number): Promise<void> {
  await humanMouseMove(page, x, y)
  await randomDelay(50, 150)
  await page.mouse.click(x, y)
  await randomDelay(200, 500)
}

// Types for normalized race data
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
  errorCode?: 'SESSION_ACTIVE' | 'LOGIN_FAILED' | 'CONNECTION_LOST' | 'PRINTER_ERROR'
}

interface GamepoolUpdate {
  type: 'gamepoolUpdate'
  gamepool: Record<string, RaceData[]>  // All races grouped by game type
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

// POS Log entry from frontend
interface POSLogEntry {
  type: 'log'
  level: 'info' | 'warn' | 'error' | 'debug'
  event: string           // Event type: 'ticket_created', 'connection_lost', 'login', etc.
  message: string         // Human-readable message
  deviceId: string        // POS terminal ID
  operatorId?: string     // Logged in operator
  sessionId?: string      // Current session ID
  data?: Record<string, unknown>  // Additional event-specific data
  clientTimestamp: string // When the event occurred on client
}

type RelayMessage = RaceData | RaceResult | TimeSync | ConnectionStatus | GamepoolUpdate | ResultsHistoryUpdate

// Map eventType to game prefix - this is the source of truth from the POS
function getGameFromEventType(eventType: string): string | null {
  switch (eventType) {
    case 'dog':
      return 'dos' // 6 dogs
    case 'dog8':
      return 'doe' // 8 dogs
    case 'dog63':
      return 'dot' // 6 dogs trifecta
    case 'horsec':
      return 'hoc' // horses
    default:
      // Log unknown event types for debugging
      console.log(`⚠️ Unknown eventType: ${eventType}`)
      return null
  }
}

// Map betoffer eventtype to game prefix for historical results
function getGameFromBetofferEventType(eventtype: string): string | null {
  switch (eventtype) {
    case 'dog':
      return 'dos'
    case 'dog8':
      return 'doe'
    case 'dog63':
      return 'dot'
    case 'horsec':
      return 'hoc'
    default:
      return null
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
// Backend Client - Connects to pos.proudplant-abfc9fde.eastus.azurecontainerapps.io to register game rounds
// ============================================================================

class BackendClient {
  private connection: signalR.HubConnection | null = null
  private isConnected = false
  private deviceId: string
  private registeredRounds: Set<string> = new Set() // Track registered gameIds

  constructor() {
    this.deviceId = CONFIG.BACKEND_DEVICE_ID
  }

  async connect(): Promise<boolean> {
    if (this.isConnected && this.connection) {
      return true
    }

    try {
      // First discover the WebSocket URL
      const discoveryUrl = `${CONFIG.BACKEND_API_URL}/api/ws/discover?deviceId=${this.deviceId}&deviceType=pos`
      console.log(`🔍 [Backend] Discovering WebSocket URL...`)

      const response = await fetch(discoveryUrl)
      if (!response.ok) {
        console.error(`❌ [Backend] Discovery failed: ${response.status}`)
        return false
      }

      const discovery = await response.json()
      console.log(`✅ [Backend] Discovery OK: ${discovery.locationName}`)

      // Build SignalR hub URL
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

      // Handle connection rejected (device already in use)
      this.connection.on('connectionrejected', (data: any) => {
        console.error('❌ [Backend] Connection REJECTED: Device already in use!')
        console.error('   Another session is active with deviceId:', this.deviceId)
        console.error('   Close the other session to allow relay to register game rounds.')
        this.isConnected = false
      })

      await this.connection.start()
      console.log(`✅ [Backend] Connected to SignalR hub`)
      this.isConnected = true

      return true
    } catch (error) {
      console.error(`❌ [Backend] Connection error:`, error)
      return false
    }
  }

  async registerGameRound(gameRound: any): Promise<boolean> {
    const gameId = gameRound.id

    // Skip if already registered
    if (this.registeredRounds.has(gameId)) {
      return true
    }

    if (!this.isConnected || !this.connection) {
      console.log(`⚠️ [Backend] Not connected, cannot register ${gameId}`)
      return false
    }

    try {
      // Map eventType to gameType for backend
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
        // Limit cache size
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
      // Method might not exist yet - log but don't fail
      console.log(`⚠️ [Backend] registerGameRound not available: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }

  async sendToElasticsearch(docType: string, data: any): Promise<boolean> {
    if (!CONFIG.ELASTICSEARCH_URL || !CONFIG.ELASTICSEARCH_API_KEY) {
      return false // Elasticsearch not configured
    }

    try {
      const doc = {
        ...data,
        docType,
        '@timestamp': new Date().toISOString(),
        capturedAt: new Date().toISOString(),
        deviceId: this.deviceId
      }

      const response = await fetch(`${CONFIG.ELASTICSEARCH_URL}/${CONFIG.ELASTICSEARCH_INDEX}/_doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${CONFIG.ELASTICSEARCH_API_KEY}`
        },
        body: JSON.stringify(doc)
      })

      return response.ok
    } catch (error) {
      console.error(`❌ [ES] Error:`, error)
      return false
    }
  }

  disconnect() {
    if (this.connection) {
      this.connection.stop()
      this.connection = null
      this.isConnected = false
    }
  }

  /**
   * Lock a round (close betting) via Ingest API
   * Called when countdown transitions to ≤5 seconds
   */
  async lockRound(externalId: string): Promise<boolean> {
    if (!CONFIG.INGEST_API_URL) {
      return false
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (CONFIG.INGEST_API_KEY || process.env.API_KEY) {
        headers['X-Ingest-Key'] = CONFIG.INGEST_API_KEY || process.env.API_KEY || ''
      }

      const response = await fetch(`${CONFIG.INGEST_API_URL}/api/ingest/lock-round`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ExternalId: externalId })
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error(`❌ [Ingest] lock-round error ${response.status}: ${errorBody.slice(0, 200)}`)
        return false
      }

      const result = await response.json()
      console.log(`🔒 [Ingest] Round locked: ${externalId} (status: ${result.status || result.Status})`)
      return true
    } catch (error) {
      console.error(`❌ [Ingest] lock-round error:`, error)
      return false
    }
  }

  /**
   * Send race data to Ingest API for SQL Server persistence
   * Called when gameRound is received - stores odds data
   */
  async sendRaceDataToIngestAPI(games: any[]): Promise<boolean> {
    if (!CONFIG.INGEST_API_URL) {
      return false
    }

    try {
      const items = games.map(game => {
        const raceNumber = parseInt(extractRaceNumber(game.id)) || 0

        // Build odds matrix from oddsMatrix if available
        let oddsMatrix: number[][] | undefined
        if (game.oddsMatrix && Array.isArray(game.oddsMatrix)) {
          oddsMatrix = game.oddsMatrix
        }

        return {
          ExternalId: game.id,
          Source: game.eventType,
          RaceNumber: raceNumber,
          WinOdds: game.winOdds || null,
          Odds: game.odds || null,
          OddsMatrix: oddsMatrix || null,
          UpdatedAt: new Date().toISOString(),
          // CRITICAL: Timing data required for round status management
          VideoStartDt: game.videoStartDt || null,
          VideoEndDt: game.videoEndDt || null,
          RoundInterval: game.roundInterval || null,
          CompetitorsCount: game.competitorsCount || null
        }
      }).filter(item => item.ExternalId)

      if (items.length === 0) return true

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
        return false
      }

      const result = await response.json()
      // Log with timing info for debugging
      const roundsWithTiming = items.filter(i => i.VideoStartDt).length
      console.log(`✅ [Ingest] race-data: ${result.Processed || result.processed} items (${roundsWithTiming} with timing data)`)
      return true
    } catch (error) {
      console.error(`❌ [Ingest] race-data error:`, error)
      return false
    }
  }

  /**
   * Send race result to Ingest API for SQL Server persistence
   * Called when gameResult is received - triggers settlement
   */
  async sendRaceResultToIngestAPI(result: any): Promise<boolean> {
    if (!CONFIG.INGEST_API_URL) {
      return false
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

      const items = [{
        ExternalId: result.id,
        Source: result.eventType,
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
        return false
      }

      const resultResponse = await response.json()
      console.log(`✅ [Ingest] race-result: ${result.id} (settled: ${resultResponse.Settled || resultResponse.settled || 0})`)
      return true
    } catch (error) {
      console.error(`❌ [Ingest] race-result error:`, error)
      return false
    }
  }
}

// ============================================================================
// Relay Server Class
// ============================================================================

// Relay server class
class RelayServer {
  private wss: WebSocketServer
  private controlServer: http.Server
  private clients: Set<WebSocket> = new Set()
  private browser: BrowserContext | null = null
  private page: Page | null = null
  private isConnected = false
  private isPaused = false
  private latestData: Map<string, RelayMessage> = new Map()
  // Track when each race started to avoid switching too early
  private raceStartTimes: Map<string, number> = new Map()
  // Backend client for registering game rounds
  private backendClient: BackendClient
  // Countdown tracking for automatic locking (when countdown ≤ 5 seconds)
  private lastCountdown: Map<string, number> = new Map()  // externalId -> last countdown
  private lockedRounds: Set<string> = new Set()  // externalIds that have been locked
  // Statistics for status endpoint
  private stats = {
    startedAt: new Date().toISOString(),
    messagesRelayed: 0,
    racesProcessed: 0,
    ticketsRegistered: 0,
    lastMessageAt: null as string | null
  }

  constructor() {
    this.wss = new WebSocketServer({ port: CONFIG.RELAY_PORT })
    this.backendClient = new BackendClient()
    this.controlServer = this.createControlServer()
    this.setupWebSocketServer()
  }

  private createControlServer(): http.Server {
    const server = http.createServer((req, res) => {
      // CORS headers — restrict to known origins
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
        res.writeHead(200)
        res.end(JSON.stringify({
          status: this.isPaused ? 'paused' : 'running',
          connected: this.isConnected,
          paused: this.isPaused,
          clients: this.clients.size,
          stats: this.stats,
          config: {
            relayPort: CONFIG.RELAY_PORT,
            controlPort: CONFIG.CONTROL_PORT,
            posUrl: CONFIG.POS_URL.substring(0, 50) + '...'
          }
        }, null, 2))
        return
      }

      if (req.method === 'POST' && url === '/pause') {
        this.isPaused = true
        console.log('⏸️  Relay PAUSED via control API')
        res.writeHead(200)
        res.end(JSON.stringify({ success: true, status: 'paused' }))
        return
      }

      if (req.method === 'POST' && url === '/resume') {
        this.isPaused = false
        console.log('▶️  Relay RESUMED via control API')
        res.writeHead(200)
        res.end(JSON.stringify({ success: true, status: 'running' }))
        return
      }

      if (req.method === 'POST' && url === '/toggle') {
        this.isPaused = !this.isPaused
        console.log(`${this.isPaused ? '⏸️' : '▶️'}  Relay ${this.isPaused ? 'PAUSED' : 'RESUMED'} via control API`)
        res.writeHead(200)
        res.end(JSON.stringify({ success: true, status: this.isPaused ? 'paused' : 'running' }))
        return
      }

      res.writeHead(404)
      res.end(JSON.stringify({ error: 'Not found', endpoints: ['GET /status', 'POST /pause', 'POST /resume', 'POST /toggle'] }))
    })

    server.listen(CONFIG.CONTROL_PORT, () => {
      console.log(`🎛️  Control API listening on port ${CONFIG.CONTROL_PORT}`)
    })

    return server
  }

  private setupWebSocketServer() {
    console.log(`\n🚀 Relay server starting on port ${CONFIG.RELAY_PORT}...`)

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

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('📱 Client connected')
      this.clients.add(ws)
      ;(ws as any).isAlive = true

      ws.on('pong', () => {
        (ws as any).isAlive = true
      })

      // Send current status
      this.sendToClient(ws, {
        type: 'status',
        connected: this.isConnected,
        message: this.isConnected ? 'Connected to POS' : 'Connecting to POS...'
      })

      // Send latest cached data
      for (const data of this.latestData.values()) {
        this.sendToClient(ws, data)
      }

      // Handle incoming messages from clients (logs)
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString())
          if (message.type === 'log') {
            await this.handleLogMessage(message as POSLogEntry)
          }
        } catch (error) {
          console.error('❌ Error parsing client message:', error)
        }
      })

      ws.on('close', () => {
        console.log('📱 Client disconnected')
        this.clients.delete(ws)
      })

      ws.on('error', (error) => {
        console.error('Client error:', error)
        this.clients.delete(ws)
      })
    })

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error)
    })

    console.log(`✅ Relay server listening on ws://localhost:${CONFIG.RELAY_PORT}`)
  }

  private sendToClient(client: WebSocket, data: RelayMessage) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data))
    }
  }

  private broadcast(data: RelayMessage) {
    // Skip broadcasting if paused (but still update internal state)
    if (this.isPaused) {
      return
    }

    const message = JSON.stringify(data)
    const now = new Date().toISOString()
    let sentCount = 0
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
        sentCount++
      }
    }

    // Update statistics
    this.stats.messagesRelayed++
    this.stats.lastMessageAt = now
    if (data.type === 'raceUpdate') {
      this.stats.racesProcessed++
    }

    if (data.type === 'raceUpdate' || data.type === 'raceResult') {
      console.log(`📤 Broadcast to ${sentCount} clients [${now}]`)
    }
  }

  // Handle log messages from POS clients
  private async handleLogMessage(log: POSLogEntry) {
    const levelIcon = {
      'info': 'ℹ️',
      'warn': '⚠️',
      'error': '❌',
      'debug': '🔍'
    }[log.level] || '📝'

    console.log(`${levelIcon} [LOG] ${log.deviceId} | ${log.event}: ${log.message}`)

    // Send to Elasticsearch
    await this.sendLogToElasticsearch(log)
  }

  // Send log entry to Elasticsearch (pos-logs index)
  private async sendLogToElasticsearch(log: POSLogEntry): Promise<boolean> {
    if (!CONFIG.ELASTICSEARCH_URL || !CONFIG.ELASTICSEARCH_API_KEY) {
      return false // Elasticsearch not configured
    }

    try {
      const doc = {
        '@timestamp': new Date().toISOString(),
        level: log.level,
        event: log.event,
        message: log.message,
        deviceId: log.deviceId,
        operatorId: log.operatorId || null,
        sessionId: log.sessionId || null,
        data: log.data || {},
        clientTimestamp: log.clientTimestamp,
        serverTimestamp: new Date().toISOString()
      }

      const response = await fetch(`${CONFIG.ELASTICSEARCH_URL}/${CONFIG.ELASTICSEARCH_LOGS_INDEX}/_doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${CONFIG.ELASTICSEARCH_API_KEY}`
        },
        body: JSON.stringify(doc)
      })

      if (!response.ok) {
        console.error(`❌ [ES-LOGS] Error: ${response.status} ${response.statusText}`)
        return false
      }

      return true
    } catch (error) {
      console.error(`❌ [ES-LOGS] Error:`, error)
      return false
    }
  }

  // Recursively clean data: remove _ fields
  private cleanData(obj: any): any {
    if (obj === null || obj === undefined) return obj
    if (typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(item => this.cleanData(item))

    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      // Skip fields starting with _ (reserved by ES)
      if (!key.startsWith('_')) {
        result[key] = this.cleanData(value)
      }
    }
    return result
  }

  // Send WebSocket message to Elasticsearch (vg-pos-messages index)
  // direction: 'IN' = from server to POS, 'OUT' = from POS to server
  private async sendToElasticsearch(msgType: string, data: any, direction: 'IN' | 'OUT' = 'IN'): Promise<boolean> {
    if (!CONFIG.ELASTICSEARCH_URL || !CONFIG.ELASTICSEARCH_API_KEY) {
      return false // Elasticsearch not configured
    }

    try {
      // Clean data: remove _ fields
      const cleanedData = this.cleanData(data)

      // Format matching vgcontrol-collector indices
      const doc = {
        msgType,
        direction,
        timestamp: new Date().toISOString(),
        collector: 'vgcontrol-pos-relay',
        ...cleanedData
      }

      const response = await fetch(`${CONFIG.ELASTICSEARCH_URL}/${CONFIG.ELASTICSEARCH_INDEX}/_doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${CONFIG.ELASTICSEARCH_API_KEY}`
        },
        body: JSON.stringify(doc)
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error(`❌ [ES] Error ${response.status}: ${errorBody.slice(0, 200)}`)
        return false
      }

      console.log(`✅ [ES] Saved ${msgType}`)
      return true
    } catch (error) {
      console.error(`❌ [ES] Error:`, error)
      return false
    }
  }

  async connectToPOS() {
    console.log('\n🔌 Connecting to original POS...')

    // NOTE: SignalR connection disabled - relay should use Ingest API with X-Ingest-Key
    // The relay is NOT a POS device, it's a data ingestion service
    // Game rounds are registered via /api/ingest/race-data/batch
    console.log('📡 Using Ingest API for race data (SignalR disabled)')
    // const backendConnected = await this.backendClient.connect()
    // if (backendConnected) {
    //   console.log('✅ Backend API connected - game rounds will be registered')
    // } else {
    //   console.log('⚠️ Backend API not connected - game rounds won\'t be registered')
    // }

    try {
      console.log('🚀 Launching Chromium browser...')
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-infobars',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--no-zygote',
        ]
      })
      console.log('✅ Chromium browser launched successfully')

      const context: BrowserContext = await this.browser.newContext({
        viewport: CONFIG.VIEWPORT,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'es-ES',
        timezoneId: 'Europe/Madrid',
      })

      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      })

      this.page = await context.newPage()

      // Setup WebSocket interception
      this.page.on('websocket', ws => {
        console.log(`\n🔌 POS WebSocket connected: ${ws.url()}`)

        // Capture INCOMING messages (server -> POS)
        ws.on('framereceived', event => {
          const payload = event.payload as string
          try {
            const msg = JSON.parse(payload)
            if (msg.msgType === 'gameRound' || msg.msgType === 'gameResult' || msg.msgType === 'time') {
              console.log(`📥 IN: ${msg.msgType} [${new Date().toISOString()}]`)
            }
          } catch {}
          this.handlePOSMessage(payload, 'IN')
        })

        // Capture OUTGOING messages (POS -> server)
        ws.on('framesent', event => {
          const payload = event.payload as string
          try {
            const msg = JSON.parse(payload)
            console.log(`📤 OUT: ${msg.msgType} [${new Date().toISOString()}]`)
            // Send to Elasticsearch with direction OUT
            this.sendToElasticsearch(msg.msgType || 'unknown', msg, 'OUT')
          } catch {
            // Non-JSON message, ignore
          }
        })

        ws.on('close', () => {
          console.log('\n⚠️ POS WebSocket disconnected')
          this.isConnected = false
          this.broadcast({
            type: 'status',
            connected: false,
            message: 'POS WebSocket disconnected, reconnecting...'
          })
          // Attempt reconnection
          setTimeout(() => this.reconnect(), CONFIG.RECONNECT_DELAY_MS)
        })
      })

      // Navigate and login
      await this.loginToPOS()

      this.isConnected = true
      this.broadcast({
        type: 'status',
        connected: true,
        message: 'Connected to POS'
      })

      // Keep alive with periodic mouse movements
      this.startKeepAlive()

    } catch (error) {
      console.error('❌ Failed to connect to POS:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Check if it's a session conflict
      if (errorMessage.includes('SESSION_ACTIVE')) {
        this.broadcast({
          type: 'status',
          connected: false,
          message: 'Cannot connect: Another session is already active. Close the other session and retry.',
          errorCode: 'SESSION_ACTIVE'
        })
        // Wait longer before retrying for session conflicts (2 minutes)
        console.log('⏳ Waiting 2 minutes before retry (session conflict)...')
        setTimeout(() => this.reconnect(), 120000)
      } else {
        this.broadcast({
          type: 'status',
          connected: false,
          message: `Connection failed: ${errorMessage}`
        })
        // Normal reconnection delay
        setTimeout(() => this.reconnect(), CONFIG.RECONNECT_DELAY_MS)
      }
    }
  }

  private async loginToPOS() {
    if (!this.page) return

    console.log('📡 Navigating to POS...')
    await this.page.goto(CONFIG.POS_URL, { waitUntil: 'networkidle', timeout: 60000 })

    // Wait for page to be fully loaded
    await this.page.waitForLoadState('domcontentloaded')
    await randomDelay(3000, 5000)

    // Login
    console.log('🔐 Logging in...')
    const userInput = this.page.locator('#user_input')
    await userInput.waitFor({ state: 'visible', timeout: 30000 })

    const userBox = await userInput.boundingBox()
    if (userBox) {
      await humanClick(this.page, userBox.x + userBox.width / 2, userBox.y + userBox.height / 2)
    }

    for (const char of CONFIG.OPERATOR_ID) {
      await this.page.keyboard.type(char, { delay: humanTypeDelay() })
    }
    await randomDelay(500, 1000)

    // Enter PIN
    console.log('🔢 Entering PIN...')
    for (const digit of CONFIG.PIN) {
      const numpadButton = this.page.locator(`#logInPadNu${digit}`)
      const box = await numpadButton.boundingBox()
      if (box) {
        const offsetX = (Math.random() - 0.5) * 10
        const offsetY = (Math.random() - 0.5) * 10
        await humanClick(this.page, box.x + box.width / 2 + offsetX, box.y + box.height / 2 + offsetY)
      }
      await randomDelay(150, 350)
    }

    await randomDelay(500, 1000)

    // Click login
    const loginButton = this.page.locator('#loginButton')
    const loginBox = await loginButton.boundingBox()
    if (loginBox) {
      await humanClick(this.page, loginBox.x + loginBox.width / 2, loginBox.y + loginBox.height / 2)
    }

    await randomDelay(4000, 6000)

    // Check for error modals (session active, login failed, etc.)
    try {
      // Look for error modal content
      const modalText = await this.page.locator('.modal-body, .error-message, [class*="modal"] [class*="content"]').textContent({ timeout: 2000 })

      if (modalText) {
        const lowerText = modalText.toLowerCase()

        // Check for session already active error
        if (lowerText.includes('sesión') || lowerText.includes('session') ||
            lowerText.includes('logged') || lowerText.includes('conectado') ||
            lowerText.includes('already') || lowerText.includes('activa')) {
          console.log('⚠️ Session already active detected!')
          this.broadcast({
            type: 'status',
            connected: false,
            message: 'Another session is already active with these credentials',
            errorCode: 'SESSION_ACTIVE'
          })

          // Try to dismiss modal
          const okButton = this.page.locator('text=OK').first()
          if (await okButton.isVisible({ timeout: 1000 })) {
            await okButton.click()
          }

          throw new Error('SESSION_ACTIVE: Another session is already active')
        }

        // Check for login failed
        if (lowerText.includes('error') || lowerText.includes('invalid') ||
            lowerText.includes('incorrect') || lowerText.includes('inválido')) {
          console.log('❌ Login failed!')
          this.broadcast({
            type: 'status',
            connected: false,
            message: 'Login failed: Invalid credentials',
            errorCode: 'LOGIN_FAILED'
          })
          throw new Error('LOGIN_FAILED: Invalid credentials')
        }

        // Printer error - dismiss and continue
        if (lowerText.includes('printer') || lowerText.includes('impresora')) {
          console.log('⚠️ Printer error modal - dismissing...')
          const okButton = this.page.locator('text=OK').first()
          if (await okButton.isVisible({ timeout: 1000 })) {
            await okButton.click()
            await randomDelay(1000, 2000)
          }
        }
      }
    } catch (error) {
      if (error instanceof Error &&
          (error.message.includes('SESSION_ACTIVE') || error.message.includes('LOGIN_FAILED'))) {
        throw error // Re-throw login errors
      }
      // Other errors (modal not found) - continue
    }

    // Verify login was successful by checking for main interface elements
    try {
      const mainInterface = this.page.locator('#gameContainer, .game-panel, [class*="game"]').first()
      await mainInterface.waitFor({ state: 'visible', timeout: 10000 })
      console.log('✅ Logged in to POS successfully')
    } catch {
      console.log('⚠️ Could not verify login success, continuing anyway...')
    }
  }

  private handlePOSMessage(payload: string, direction: 'IN' | 'OUT' = 'IN') {
    try {
      const message = JSON.parse(payload)

      // Send ALL WebSocket messages to Elasticsearch with direction
      this.sendToElasticsearch(message.msgType || 'unknown', message, direction)

      switch (message.msgType) {
        case 'gameRound':
          this.handleGameRound(message)
          break
        case 'gameResult':
          this.handleGameResult(message)
          break
        case 'time':
          this.handleTimeSync(message)
          break
        case 'init':
          // Check for login errors in init response
          if (message.msgValue === 'error' || message.error) {
            const errorMsg = message.errorMsg || message.error || 'Unknown login error'
            console.log(`❌ Init error: ${errorMsg}`)

            // Detect session already active
            const lowerError = errorMsg.toLowerCase()
            if (lowerError.includes('session') || lowerError.includes('sesión') ||
                lowerError.includes('logged') || lowerError.includes('active')) {
              this.broadcast({
                type: 'status',
                connected: false,
                message: `Session conflict: ${errorMsg}`,
                errorCode: 'SESSION_ACTIVE'
              })
            } else {
              this.broadcast({
                type: 'status',
                connected: false,
                message: `Login error: ${errorMsg}`,
                errorCode: 'LOGIN_FAILED'
              })
            }
            break
          }

          // Successful login
          if (message.msgValue === 'ok') {
            console.log(`✅ Init OK - Session: ${message.sessionID}`)
            this.isConnected = true
            this.broadcast({
              type: 'status',
              connected: true,
              message: `Connected to POS (Session: ${message.sessionID})`
            })
          }

          // Initial gamepool data - use same filtering as gameRound
          if (message.gamepool) {
            this.handleGameRound({ gamepool: message.gamepool })
          }
          // Extract historical results from setting.betoffers[].stats.history
          if (message.setting?.betoffers) {
            this.handleInitialResults(message.setting.betoffers)
          }
          break
      }
    } catch (error) {
      // Non-JSON or invalid message, ignore
    }
  }

  private handleGameRound(message: any) {
    if (!message.gamepool) return

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
      // This ensures the backend knows the round is available for betting
      this.backendClient.registerGameRound(game).catch((err) => {
        console.log(`⚠️ Failed to register gameRound via SignalR: ${err}`)
      })
    }

    // Send to Ingest API for SQL Server persistence (includes timing data)
    this.backendClient.sendRaceDataToIngestAPI(message.gamepool).catch((err) => {
      console.log(`⚠️ Failed to send race data to Ingest API: ${err}`)
    })

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
      if (countdown <= 5 && countdown > 0) {
        if (prevCountdown > 5 || prevCountdown === countdown) {
          console.log(`⏱️ Countdown ≤5s for ${game.id}: ${countdown}s - triggering lock`)
          this.lockedRounds.add(game.id)
          this.backendClient.lockRound(game.id).catch((err) => {
            console.log(`⚠️ Failed to lock round: ${err}`)
            this.lockedRounds.delete(game.id) // Allow retry
          })
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
      const now = Date.now()
      let nextRace = sortedGames[sortedGames.length - 1]
      for (const game of sortedGames) {
        const startTime = new Date(game.videoStartDt.replace(' ', 'T') + 'Z').getTime()
        if (startTime > now) {
          nextRace = game
          break
        }
      }
      this.processGamePoolEntry(nextRace)
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

  private processGamePoolEntry(game: any) {
    const gameType = getGameFromEventType(game.eventType)
    if (!gameType) return // Skip unknown event types

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

    // Cache and broadcast
    const cacheKey = `race_${gameType}`
    this.latestData.set(cacheKey, raceData)
    this.broadcast(raceData)

    console.log(`📊 Race update: ${gameType.toUpperCase()} #${raceNumber} [${new Date().toISOString()}]`)
  }

  private handleGameResult(message: any) {
    if (!message.gameresult) return

    const result = message.gameresult
    const gameType = getGameFromEventType(result.eventType)
    if (!gameType) return // Skip unknown event types

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

    // Send to Ingest API for SQL Server persistence and settlement (Option B)
    this.backendClient.sendRaceResultToIngestAPI(result).catch((err) => {
      console.log(`⚠️ Failed to send race result to Ingest API: ${err}`)
    })

    // Log finishing positions
    const positions = Object.entries(result.finish)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .slice(0, 3)
      .map(([pos, data]) => `${pos}:${(data as any).competitorIndex}`)
      .join(', ')

    console.log(`🏁 Result: ${gameType.toUpperCase()} - ${positions}`)
  }

  private handleTimeSync(message: any) {
    const timeSync: TimeSync = {
      type: 'timeSync',
      serverTime: message.serverTime,
      serverTimeUnix: message.serverTimeUnix
    }

    console.log(`🕐 TimeSync broadcast: ${message.serverTime}`)
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

  private startKeepAlive() {
    setInterval(async () => {
      if (this.page && this.isConnected) {
        try {
          // Simulate activity with mouse movement
          const randomX = Math.floor(Math.random() * CONFIG.VIEWPORT.width)
          const randomY = Math.floor(Math.random() * CONFIG.VIEWPORT.height)
          await humanMouseMove(this.page, randomX, randomY)
        } catch {
          // Page might be closed
        }
      }
    }, CONFIG.HEARTBEAT_INTERVAL_MS)
  }

  private async reconnect() {
    console.log('\n🔄 Attempting to reconnect...')

    try {
      if (this.browser) {
        await this.browser.close()
      }
    } catch {
      // Browser already closed
    }

    await this.connectToPOS()
  }

  async start() {
    console.log('=' .repeat(60))
    console.log('  Virtual Racing POS - WebSocket Relay Server')
    console.log('=' .repeat(60))

    // Log Elasticsearch configuration status
    if (CONFIG.ELASTICSEARCH_URL && CONFIG.ELASTICSEARCH_API_KEY) {
      console.log(`✅ Elasticsearch configured: ${CONFIG.ELASTICSEARCH_URL}`)
      console.log(`   - Logs index: ${CONFIG.ELASTICSEARCH_LOGS_INDEX}`)
    } else {
      console.log('⚠️ Elasticsearch not configured (logs only to console)')
    }

    await this.connectToPOS()

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down...')
      try {
        if (this.browser) {
          await this.browser.close()
        }
        this.wss.close()
        this.controlServer.close()
      } catch {
        // Ignore errors during shutdown
      }
      process.exit(0)
    })
  }
}

// Start the server
const server = new RelayServer()
server.start().catch(console.error)
