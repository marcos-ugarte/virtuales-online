#!/usr/bin/env node
/**
 * Races Sync Service
 *
 * Connects to the Hostinger relay WebSocket and syncs race data
 * to the Azure API (same as ws-capture in virtual-racing-backend).
 *
 * Endpoints:
 *   POST /api/ingest/race-data/batch   - GameRounds (odds, competitors)
 *   POST /api/ingest/race-result/batch - GameResults (finish positions)
 *
 * Usage:
 *   node races-sync-service.js
 *
 * Environment variables:
 *   RELAY_URL       - WebSocket URL (default: ws://88.223.95.55:4081)
 *   API_URL         - Azure API URL (default: https://api.virtuales.bet)
 *   API_KEY         - Ingest API key (required)
 *   FLUSH_INTERVAL  - Batch flush interval in ms (default: 1000)
 *   LOG_LEVEL       - debug, info, warn, error (default: info)
 */

import WebSocket from 'ws'

// Configuration
const CONFIG = {
  relayUrl: process.env.RELAY_URL || 'ws://88.223.95.55:4081',
  apiUrl: process.env.API_URL || 'https://api.virtuales.bet',
  apiKey: process.env.API_KEY || '',
  flushIntervalMs: parseInt(process.env.FLUSH_INTERVAL || '1000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  maxBufferSize: 200,
  reconnectDelayMs: 5000,
  requestTimeoutMs: 10000
}

// Game type mapping (relay format -> API format)
// Based on gamesConfig from relay:
//   dos: CABALLOS (7 runners) -> horse
//   dot: DOG 6 + trifecta (6 runners) -> dog63
//   doe: DOG 8 (8 runners) -> dog8
//   hoc: DOG PRO RACE (8 runners) -> dog8
const GAME_TYPE_MAP = {
  'dos': { source: 'horse', betofferId: 251 },   // CABALLOS - 7 runners
  'dot': { source: 'dog63', betofferId: 741 },   // DOG 6 + trifecta
  'doe': { source: 'dog8', betofferId: 541 },    // DOG 8
  'hoc': { source: 'dog8', betofferId: 241 }     // DOG PRO RACE - 8 runners
}

// Allowed game types for API
const ALLOWED_SOURCES = new Set(['dog', 'dog8', 'dog63', 'horse'])

// Logger
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 }
const currentLogLevel = LOG_LEVELS[CONFIG.logLevel] || 1

function log(level, message, data = null) {
  if (LOG_LEVELS[level] < currentLogLevel) return
  const timestamp = new Date().toISOString()
  const prefix = { debug: '🔍', info: '📡', warn: '⚠️', error: '❌' }[level] || ''
  console.log(`[${timestamp}] ${prefix} ${message}`)
  if (data && level === 'debug') {
    console.log(JSON.stringify(data, null, 2))
  }
}

// Buffers for batching
const gameRoundBuffer = new Map()
const gameResultBuffer = new Map()

// Countdown tracking for automatic locking
const lastCountdown = new Map()  // externalId -> last countdown value
const lockedRounds = new Set()   // externalIds that have been locked

// Stats
const stats = {
  connected: false,
  messagesReceived: 0,
  gameRoundsQueued: 0,
  gameResultsQueued: 0,
  gameRoundsFlushed: 0,
  gameResultsFlushed: 0,
  flushErrors: 0,
  roundsLocked: 0,
  lockErrors: 0,
  lastFlushAt: null,
  startedAt: new Date().toISOString()
}

/**
 * Transform relay raceUpdate to API format
 */
function transformGameRound(message) {
  const gameConfig = GAME_TYPE_MAP[message.game]
  if (!gameConfig || !ALLOWED_SOURCES.has(gameConfig.source)) {
    return null
  }

  // Extract date and race number from raceId (format: 541_105_202602030324)
  const idParts = message.raceId?.split('_') || []
  const fullCode = idParts[2] || ''
  const raceDate = fullCode.slice(0, 8)
  const raceNumber = fullCode.slice(-4)

  // Build externalId in same format as ws-capture
  const externalId = `${gameConfig.betofferId}_105_${raceDate}${raceNumber}`

  return {
    externalId,
    source: gameConfig.source,
    raceNumber: parseInt(raceNumber, 10) || 0,
    winOdds: message.odds?.slice(0, 8) || [],
    odds: message.odds || [],
    oddsMatrix: null,  // Relay doesn't provide matrix
    updatedAt: new Date().toISOString()
  }
}

/**
 * Transform relay raceResult to API format
 */
function transformGameResult(message) {
  // Determine game type from raceId
  const idParts = message.raceId?.split('_') || []
  const betofferId = parseInt(idParts[0], 10)

  let source = null
  for (const [, config] of Object.entries(GAME_TYPE_MAP)) {
    if (config.betofferId === betofferId) {
      source = config.source
      break
    }
  }

  if (!source || !ALLOWED_SOURCES.has(source)) {
    return null
  }

  const fullCode = idParts[2] || ''
  const raceDate = fullCode.slice(0, 8)
  const raceNumber = fullCode.slice(-4)
  const externalId = `${betofferId}_105_${raceDate}${raceNumber}`

  // Extract positions from finish object
  const finish = message.finish || {}
  const first = finish['1']?.competitorIndex || null
  const second = finish['2']?.competitorIndex || null
  const third = finish['3']?.competitorIndex || null

  const positions = [first, second, third].filter(p => p !== null)

  return {
    externalId,
    source,
    raceNumber: parseInt(raceNumber, 10) || 0,
    result: positions.join(','),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Queue a game round for batch sending
 */
function queueGameRound(data) {
  if (!data) return

  // Enforce buffer limit
  if (gameRoundBuffer.size >= CONFIG.maxBufferSize) {
    const firstKey = gameRoundBuffer.keys().next().value
    gameRoundBuffer.delete(firstKey)
  }

  gameRoundBuffer.set(data.externalId, data)
  stats.gameRoundsQueued++
  log('debug', `Queued gameRound: ${data.externalId}`)
}

/**
 * Queue a game result for batch sending
 */
function queueGameResult(data) {
  if (!data) return

  if (gameResultBuffer.size >= CONFIG.maxBufferSize) {
    const firstKey = gameResultBuffer.keys().next().value
    gameResultBuffer.delete(firstKey)
  }

  gameResultBuffer.set(data.externalId, data)
  stats.gameResultsQueued++
  log('debug', `Queued gameResult: ${data.externalId}`)
}

/**
 * Send batch to API endpoint
 */
async function sendBatch(endpoint, items, type) {
  if (items.length === 0) return true

  const url = `${CONFIG.apiUrl}${endpoint}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ingest-Key': CONFIG.apiKey
      },
      body: JSON.stringify({ items }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorBody}`)
    }

    log('info', `Flushed ${items.length} ${type}(s) to API`)
    return true

  } catch (error) {
    log('error', `Batch send failed for ${type}: ${error.message}`)
    return false
  }
}

/**
 * Lock a round when countdown reaches ≤5 seconds
 * This prevents further betting on that round
 */
async function lockRound(externalId) {
  if (lockedRounds.has(externalId)) {
    return true  // Already locked
  }

  const url = `${CONFIG.apiUrl}/api/ingest/lock-round`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ingest-Key': CONFIG.apiKey
      },
      body: JSON.stringify({ externalId }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorBody}`)
    }

    lockedRounds.add(externalId)
    stats.roundsLocked++
    log('info', `🔒 Locked round: ${externalId}`)
    return true

  } catch (error) {
    stats.lockErrors++
    log('error', `Failed to lock round ${externalId}: ${error.message}`)
    return false
  }
}

/**
 * Check countdown and lock if needed (≤5 seconds)
 */
function checkAndLockIfNeeded(externalId, countdown) {
  const prevCountdown = lastCountdown.get(externalId) || countdown
  lastCountdown.set(externalId, countdown)

  // Lock when countdown transitions to ≤5 seconds (or starts at ≤5)
  // Only lock if we haven't already and countdown was previously >5 or this is first update
  if (countdown <= 5 && countdown > 0 && !lockedRounds.has(externalId)) {
    // Only lock if previously >5 or this is first time seeing this round
    if (prevCountdown > 5 || prevCountdown === countdown) {
      log('info', `⏱️ Countdown ${countdown}s for ${externalId} - triggering lock`)
      lockRound(externalId).catch(err => log('error', `Lock error: ${err.message}`))
    }
  }

  // Clean up old rounds from tracking (countdown 0 or negative means race started/finished)
  if (countdown <= 0) {
    // Keep in lockedRounds to avoid duplicate locks, but can clean up lastCountdown
    lastCountdown.delete(externalId)
  }
}

/**
 * Flush all buffers to API
 */
async function flush() {
  const roundsToSend = Array.from(gameRoundBuffer.values())
  const resultsToSend = Array.from(gameResultBuffer.values())

  // Clear buffers before sending
  gameRoundBuffer.clear()
  gameResultBuffer.clear()

  if (roundsToSend.length === 0 && resultsToSend.length === 0) {
    return
  }

  let success = true

  // Send game rounds
  if (roundsToSend.length > 0) {
    const ok = await sendBatch('/api/ingest/race-data/batch', roundsToSend, 'gameRound')
    if (ok) {
      stats.gameRoundsFlushed += roundsToSend.length
    } else {
      success = false
      // Re-queue failed items
      for (const item of roundsToSend) {
        if (gameRoundBuffer.size < CONFIG.maxBufferSize) {
          gameRoundBuffer.set(item.externalId, item)
        }
      }
    }
  }

  // Send game results
  if (resultsToSend.length > 0) {
    const ok = await sendBatch('/api/ingest/race-result/batch', resultsToSend, 'gameResult')
    if (ok) {
      stats.gameResultsFlushed += resultsToSend.length
    } else {
      success = false
      for (const item of resultsToSend) {
        if (gameResultBuffer.size < CONFIG.maxBufferSize) {
          gameResultBuffer.set(item.externalId, item)
        }
      }
    }
  }

  if (!success) {
    stats.flushErrors++
  }

  stats.lastFlushAt = new Date().toISOString()
}

/**
 * Transform allGamesUpdate message (legacy format from relay)
 * This format has basic data: raceNumber, countdown, serverTime, raceStartTime
 */
function transformAllGamesUpdate(message) {
  const results = []
  const games = message.games || {}

  for (const [game, data] of Object.entries(games)) {
    const gameConfig = GAME_TYPE_MAP[game]
    if (!gameConfig || !ALLOWED_SOURCES.has(gameConfig.source)) {
      continue
    }

    // Build date from current date (relay doesn't provide full date)
    const now = new Date()
    const raceDate = now.toISOString().slice(0, 10).replace(/-/g, '')
    const raceNumber = (data.raceNumber || '0000').padStart(4, '0')

    // Build externalId
    const externalId = `${gameConfig.betofferId}_105_${raceDate}${raceNumber}`

    results.push({
      externalId,
      source: gameConfig.source,
      raceNumber: parseInt(raceNumber, 10) || 0,
      // Basic data available from relay
      countdown: data.countdown || 0,
      serverTime: data.serverTime || null,
      raceStartTime: data.raceStartTime || null,
      // Empty arrays for odds (not available in this format)
      winOdds: [],
      odds: [],
      oddsMatrix: null,
      updatedAt: new Date().toISOString()
    })
  }

  return results
}

/**
 * Handle incoming WebSocket message
 * Supports both legacy format (msgType) and new format (type)
 */
function handleMessage(data) {
  try {
    const message = JSON.parse(data.toString())
    stats.messagesReceived++

    // Handle legacy format (msgType) from current relay
    const msgType = message.msgType || message.type

    switch (msgType) {
      // Legacy format from relay server.js
      case 'allGamesUpdate': {
        const transformed = transformAllGamesUpdate(message)
        for (const item of transformed) {
          queueGameRound(item)
          // Check if we need to lock this round based on countdown
          if (item.countdown !== undefined) {
            checkAndLockIfNeeded(item.externalId, item.countdown)
          }
        }
        if (transformed.length > 0) {
          log('info', `allGamesUpdate: ${transformed.length} games queued`)
        }
        break
      }

      case 'gameUpdate': {
        // Single game update (legacy format)
        const game = message.gamePrefix
        const data = message.data || {}
        const gameConfig = GAME_TYPE_MAP[game]

        if (gameConfig && ALLOWED_SOURCES.has(gameConfig.source)) {
          const now = new Date()
          const raceDate = now.toISOString().slice(0, 10).replace(/-/g, '')
          const raceNumber = (data.raceNumber || '0000').padStart(4, '0')
          const externalId = `${gameConfig.betofferId}_105_${raceDate}${raceNumber}`
          const countdown = data.countdown || 0

          queueGameRound({
            externalId,
            source: gameConfig.source,
            raceNumber: parseInt(raceNumber, 10) || 0,
            countdown,
            serverTime: data.serverTime || null,
            raceStartTime: data.raceStartTime || null,
            winOdds: [],
            odds: [],
            oddsMatrix: null,
            updatedAt: new Date().toISOString()
          })

          // Check if we need to lock this round based on countdown
          checkAndLockIfNeeded(externalId, countdown)

          log('debug', `gameUpdate ${game} #${raceNumber} countdown=${countdown}`)
        }
        break
      }

      // New format (type) - if relay gets upgraded
      case 'raceUpdate': {
        const transformed = transformGameRound(message)
        if (transformed) {
          queueGameRound(transformed)
          log('debug', `raceUpdate ${message.game} #${message.raceNumber}`)
        }
        break
      }

      case 'raceResult': {
        const transformed = transformGameResult(message)
        if (transformed) {
          queueGameResult(transformed)
          log('info', `raceResult ${message.game} -> ${transformed.result}`)
        }
        break
      }

      case 'gamepoolUpdate': {
        // Process all races in gamepool
        for (const [game, races] of Object.entries(message.gamepool || {})) {
          for (const race of races) {
            const fakeMessage = { ...race, game, type: 'raceUpdate' }
            const transformed = transformGameRound(fakeMessage)
            if (transformed) {
              queueGameRound(transformed)
            }
          }
        }
        log('info', `gamepoolUpdate: ${Object.keys(message.gamepool || {}).length} games`)
        break
      }

      case 'status':
        log('info', `Relay status: ${message.connected ? 'connected' : 'disconnected'} - ${message.message}`)
        break

      case 'captureStatus':
        log('info', `Capture: ${message.captureActive ? 'active' : 'paused'}`)
        break

      case 'timeSync':
        log('debug', `timeSync: ${message.serverTime}`)
        break

      default:
        log('debug', `Unknown message type: ${msgType}`)
    }

  } catch (error) {
    log('error', `Failed to parse message: ${error.message}`)
  }
}

/**
 * Connect to relay WebSocket
 */
function connect() {
  log('info', `Connecting to ${CONFIG.relayUrl}...`)

  const ws = new WebSocket(CONFIG.relayUrl)

  ws.on('open', () => {
    stats.connected = true
    log('info', 'Connected to relay server')
  })

  ws.on('message', handleMessage)

  ws.on('close', () => {
    stats.connected = false
    log('warn', 'Disconnected from relay')

    // Reconnect after delay
    setTimeout(connect, CONFIG.reconnectDelayMs)
  })

  ws.on('error', (error) => {
    log('error', `WebSocket error: ${error.message}`)
  })
}

/**
 * Print stats periodically
 */
function printStats() {
  const uptime = Math.floor((Date.now() - new Date(stats.startedAt).getTime()) / 1000)
  log('info', `Stats: msgs=${stats.messagesReceived} rounds=${stats.gameRoundsFlushed} results=${stats.gameResultsFlushed} locked=${stats.roundsLocked} errors=${stats.flushErrors}/${stats.lockErrors} uptime=${uptime}s`)
}

/**
 * Cleanup old entries from tracking maps (runs every 5 minutes)
 */
function cleanupOldTracking() {
  // Keep only entries from the last hour
  const oneHourAgo = new Date()
  oneHourAgo.setHours(oneHourAgo.getHours() - 1)
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  // Clean locked rounds from previous days
  for (const externalId of lockedRounds) {
    // Extract date from externalId (format: 541_105_YYYYMMDD0001)
    const parts = externalId.split('_')
    const dateCode = parts[2]?.slice(0, 8)
    if (dateCode && dateCode < todayStr) {
      lockedRounds.delete(externalId)
      lastCountdown.delete(externalId)
    }
  }

  log('debug', `Cleanup: ${lockedRounds.size} locked rounds, ${lastCountdown.size} countdowns tracked`)
}

/**
 * Main
 */
function main() {
  // Validate API key
  if (!CONFIG.apiKey) {
    console.error('ERROR: API_KEY environment variable is required')
    console.error('Usage: API_KEY=xxx node races-sync-service.js')
    process.exit(1)
  }

  console.log('='.repeat(50))
  console.log('RACES SYNC SERVICE')
  console.log('='.repeat(50))
  console.log(`Relay:     ${CONFIG.relayUrl}`)
  console.log(`API:       ${CONFIG.apiUrl}`)
  console.log(`Flush:     every ${CONFIG.flushIntervalMs}ms`)
  console.log(`Log level: ${CONFIG.logLevel}`)
  console.log('='.repeat(50))

  // Start flush timer
  setInterval(() => {
    flush().catch(err => log('error', `Flush error: ${err.message}`))
  }, CONFIG.flushIntervalMs)

  // Print stats every 60 seconds
  setInterval(printStats, 60000)

  // Cleanup old tracking entries every 5 minutes
  setInterval(cleanupOldTracking, 300000)

  // Connect to relay
  connect()

  // Graceful shutdown
  process.on('SIGINT', async () => {
    log('info', 'Shutting down...')
    await flush()  // Final flush
    printStats()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    log('info', 'Shutting down...')
    await flush()
    printStats()
    process.exit(0)
  })
}

main()
