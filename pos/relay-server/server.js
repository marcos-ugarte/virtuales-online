import { WebSocketServer } from 'ws'
import http from 'http'

const PORT = 8765
const HTTP_PORT = 8766

// Store connected clients
const consumers = new Set()
let captureClient = null
let captureActive = false // Start paused by default

// Game configurations (verified via POS investigation 2025-12-20)
const GAMES = {
  dos: { name: 'CABALLOS', runners: 7, trifecta: false, gameTypeId: 251 },
  dot: { name: 'CARRERA DE DOG 6', runners: 6, trifecta: true, gameTypeId: 741 },
  doe: { name: 'CARRERA DE DOG 8', runners: 8, trifecta: false, gameTypeId: 541 },
  hoc: { name: 'DOG PRO RACE', runners: 8, trifecta: false, gameTypeId: 241 }
}

// Store latest race data for ALL 4 games
const gamesData = {
  dos: { raceNumber: '----', countdown: 0, serverTime: '--:--:--', raceStartTime: '--:--:--', progress: 0 },
  dot: { raceNumber: '----', countdown: 0, serverTime: '--:--:--', raceStartTime: '--:--:--', progress: 0 },
  doe: { raceNumber: '----', countdown: 0, serverTime: '--:--:--', raceStartTime: '--:--:--', progress: 0 },
  hoc: { raceNumber: '----', countdown: 0, serverTime: '--:--:--', raceStartTime: '--:--:--', progress: 0 }
}

/**
 * Transform simple race data to full format expected by useRealRaceData hook
 */
function transformToFullFormat(game, data) {
  const gameConfig = GAMES[game]
  if (!gameConfig) return null

  const now = new Date()
  const countdown = data.countdown || 0
  const raceNumber = (data.raceNumber || '0000').replace('#', '').padStart(4, '0')

  // Calculate video times from countdown
  const videoStartDt = new Date(now.getTime() + countdown * 1000)
  const videoEndDt = new Date(videoStartDt.getTime() + 60000) // 60 second video

  // Build raceId: gameTypeId_scheduleId_YYYYMMDD+raceNumber
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const raceId = `${gameConfig.gameTypeId}_105_${dateStr}${raceNumber}`

  return {
    type: 'raceUpdate',
    game,
    raceId,
    raceNumber,
    videoStartDt: videoStartDt.toISOString().replace('T', ' ').slice(0, 19),
    videoEndDt: videoEndDt.toISOString().replace('T', ' ').slice(0, 19),
    eventType: game,
    roundInterval: 240,
    odds: [], // Not available from simple capture
    competitors: {} // Not available from simple capture
  }
}

/**
 * Build gamepool from all games data
 */
function buildGamepool() {
  const gamepool = {}

  for (const [game, data] of Object.entries(gamesData)) {
    if (data.raceNumber && data.raceNumber !== '----') {
      const raceData = transformToFullFormat(game, data)
      if (raceData) {
        gamepool[game] = [raceData]
      }
    }
  }

  return gamepool
}

// HTTP server for control API
const httpServer = http.createServer((req, res) => {
  // CORS headers — restrict to known origins
  const allowedOrigins = ['http://localhost:4069', 'http://88.223.95.55:4069', 'https://88.223.95.55:4069']
  const reqOrigin = req.headers.origin || ''
  if (allowedOrigins.includes(reqOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // GET /status - Get capture status
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      captureActive,
      captureConnected: captureClient !== null,
      consumers: consumers.size
    }))
    return
  }

  // POST /pause - Pause capture
  if (req.method === 'POST' && req.url === '/pause') {
    if (captureClient && captureClient.readyState === 1) {
      captureClient.send(JSON.stringify({ command: 'pause' }))
      captureActive = false
      console.log('⏸️  Capture paused by user')

      // Notify all consumers
      broadcastStatus()
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true, captureActive: false }))
    return
  }

  // POST /resume - Resume capture
  if (req.method === 'POST' && req.url === '/resume') {
    if (captureClient && captureClient.readyState === 1) {
      captureClient.send(JSON.stringify({ command: 'resume' }))
      captureActive = true
      console.log('▶️  Capture resumed by user')

      // Notify all consumers
      broadcastStatus()
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true, captureActive: true }))
    return
  }

  // POST /toggle - Toggle capture state
  if (req.method === 'POST' && req.url === '/toggle') {
    if (captureClient && captureClient.readyState === 1) {
      const newState = !captureActive
      captureClient.send(JSON.stringify({ command: newState ? 'resume' : 'pause' }))
      captureActive = newState
      console.log(newState ? '▶️  Capture resumed by user' : '⏸️  Capture paused by user')

      // Notify all consumers
      broadcastStatus()
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true, captureActive }))
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

let captureError = null
let captureConnecting = false

function broadcastStatus() {
  const statusMsg = JSON.stringify({
    msgType: 'captureStatus',
    captureActive,
    captureConnected: captureClient !== null,
    captureConnecting,
    error: captureError
  })

  consumers.forEach((consumer) => {
    if (consumer.readyState === 1) {
      consumer.send(statusMsg)
    }
  })
}

// WebSocket server
const wss = new WebSocketServer({ port: PORT })

console.log(`🚀 Relay server running on ws://localhost:${PORT}`)
console.log(`🎮 Supporting 4 games: ${Object.keys(GAMES).join(', ')}`)
console.log(`🎛️  Control API on http://localhost:${HTTP_PORT}`)

httpServer.listen(HTTP_PORT)

wss.on('connection', (ws, req) => {
  const clientType = req.url === '/capture' ? 'capture' : 'consumer'

  if (clientType === 'consumer') {
    consumers.add(ws)
    console.log(`📱 Consumer connected (${consumers.size} total)`)

    // Send current data in new format (gamepoolUpdate)
    const gamepool = buildGamepool()
    ws.send(JSON.stringify({
      type: 'gamepoolUpdate',
      gamepool,
      timestamp: Date.now()
    }))

    // Send initial timeSync
    const now = new Date()
    ws.send(JSON.stringify({
      type: 'timeSync',
      serverTime: now.toISOString().replace('T', ' ').slice(0, 19),
      serverTimeUnix: Math.floor(now.getTime() / 1000)
    }))

    // Also send legacy format for races-sync-service compatibility
    ws.send(JSON.stringify({
      msgType: 'allGamesUpdate',
      games: gamesData,
      gamesConfig: GAMES,
      captureActive,
      timestamp: Date.now()
    }))
  } else {
    captureClient = ws
    captureActive = true
    console.log('🎯 Capture client connected')
    broadcastStatus()
  }

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())

      if (message.msgType === 'raceData') {
        const prefix = message.gamePrefix || 'dos'

        if (gamesData[prefix]) {
          gamesData[prefix] = {
            raceNumber: message.raceNumber || gamesData[prefix].raceNumber,
            countdown: message.countdown ?? gamesData[prefix].countdown,
            serverTime: message.serverTime || gamesData[prefix].serverTime,
            raceStartTime: message.raceStartTime || gamesData[prefix].raceStartTime,
            progress: message.progress ?? gamesData[prefix].progress
          }
        }

        const broadcast = JSON.stringify({
          msgType: 'gameUpdate',
          gamePrefix: prefix,
          gameName: GAMES[prefix]?.name || 'Unknown',
          runners: GAMES[prefix]?.runners || 6,
          data: gamesData[prefix],
          timestamp: Date.now()
        })

        consumers.forEach((consumer) => {
          if (consumer.readyState === 1) {
            consumer.send(broadcast)
          }
        })

        console.log(`📡 [${prefix.toUpperCase()}] Race #${gamesData[prefix].raceNumber} | ⏱️ ${gamesData[prefix].countdown}s`)
      }

      if (message.msgType === 'allGamesData') {
        for (const [prefix, data] of Object.entries(message.games || {})) {
          if (gamesData[prefix]) {
            gamesData[prefix] = { ...gamesData[prefix], ...data }
          }
        }

        // Send new format (gamepoolUpdate) for useRealRaceData hook
        const gamepool = buildGamepool()
        const newFormatBroadcast = JSON.stringify({
          type: 'gamepoolUpdate',
          gamepool,
          timestamp: Date.now()
        })

        // Send timeSync
        const now = new Date()
        const timeSyncBroadcast = JSON.stringify({
          type: 'timeSync',
          serverTime: now.toISOString().replace('T', ' ').slice(0, 19),
          serverTimeUnix: Math.floor(now.getTime() / 1000)
        })

        // Send legacy format for races-sync-service
        const legacyBroadcast = JSON.stringify({
          msgType: 'allGamesUpdate',
          games: gamesData,
          gamesConfig: GAMES,
          captureActive,
          timestamp: Date.now()
        })

        consumers.forEach((consumer) => {
          if (consumer.readyState === 1) {
            consumer.send(newFormatBroadcast)
            consumer.send(timeSyncBroadcast)
            consumer.send(legacyBroadcast)
          }
        })

        console.log(`📡 All games updated`)
      }

      // Capture status update
      if (message.msgType === 'captureStatus') {
        captureActive = message.active
        captureConnecting = message.connecting || false
        captureError = message.error || null
        if (captureConnecting) {
          console.log('🔄 Capture connecting...')
        }
        if (captureError) {
          console.log(`❌ Capture error: ${captureError}`)
        }
        broadcastStatus()
      }
    } catch (error) {
      console.error('Error parsing message:', error)
    }
  })

  ws.on('close', () => {
    if (clientType === 'consumer') {
      consumers.delete(ws)
      console.log(`📱 Consumer disconnected (${consumers.size} remaining)`)
    } else {
      captureClient = null
      console.log('🎯 Capture client disconnected')
      broadcastStatus()
    }
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down relay server...')
  httpServer.close()
  wss.close()
  process.exit(0)
})
