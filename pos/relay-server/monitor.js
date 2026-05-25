#!/usr/bin/env node
/**
 * Relay Server Monitor
 *
 * Connects to the relay WebSocket and monitors incoming messages.
 * Shows real-time data, detects stale data, and displays statistics.
 *
 * Usage:
 *   node monitor.js [host] [options]
 *   node monitor.js 88.223.95.55
 *   node monitor.js localhost --verbose
 *   node monitor.js 88.223.95.55 --json
 *
 * Options:
 *   --verbose    Show full message content
 *   --json       Output messages as JSON (for piping to other tools)
 *   --stats      Show statistics every 30 seconds
 */

import WebSocket from 'ws'

// Parse arguments
const args = process.argv.slice(2)
const HOST = args.find(a => !a.startsWith('--')) || '88.223.95.55'
const VERBOSE = args.includes('--verbose')
const JSON_OUTPUT = args.includes('--json')
const SHOW_STATS = args.includes('--stats')

const WS_PORT = HOST === 'localhost' ? 8765 : 4081
const WS_URL = `ws://${HOST}:${WS_PORT}`

// Statistics
const stats = {
  connected: false,
  connectedAt: null,
  messagesReceived: 0,
  messagesByType: {},
  lastMessageAt: null,
  lastTimeSyncAt: null,
  reconnects: 0,
  errors: []
}

// Stale data threshold (30 seconds)
const STALE_THRESHOLD_MS = 30000

function timestamp() {
  return new Date().toISOString()
}

function log(message, data = null) {
  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ timestamp: timestamp(), message, data }))
  } else {
    console.log(`[${timestamp()}] ${message}`)
    if (data && VERBOSE) {
      console.log(JSON.stringify(data, null, 2))
    }
  }
}

function logMessage(msg) {
  stats.messagesReceived++
  stats.lastMessageAt = Date.now()
  stats.messagesByType[msg.type] = (stats.messagesByType[msg.type] || 0) + 1

  if (msg.type === 'timeSync') {
    stats.lastTimeSyncAt = Date.now()
  }

  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ timestamp: timestamp(), type: 'message', data: msg }))
    return
  }

  // Format based on message type
  switch (msg.type) {
    case 'gamepoolUpdate':
      const games = Object.entries(msg.gamepool || {})
        .map(([game, races]) => `${game}:${races.length}`)
        .join(', ')
      log(`GAMEPOOL UPDATE - ${games}`)
      break

    case 'raceUpdate':
      log(`RACE UPDATE - ${msg.game} #${msg.raceNumber} (${msg.raceId})`)
      if (VERBOSE) {
        console.log(`   Odds: [${msg.odds?.slice(0, 5).join(', ')}${msg.odds?.length > 5 ? '...' : ''}]`)
        console.log(`   Competitors: ${Object.keys(msg.competitors || {}).length}`)
        console.log(`   Video: ${msg.videoStartDt} -> ${msg.videoEndDt}`)
      }
      break

    case 'raceResult':
      const first = msg.finish?.['1']?.competitorIndex
      const second = msg.finish?.['2']?.competitorIndex
      log(`RACE RESULT - ${msg.game} ${msg.raceId} -> 1st:${first} 2nd:${second} bonus:${msg.bonus}`)
      break

    case 'resultsHistory':
      log(`RESULTS HISTORY - ${msg.game} (${msg.results?.length || 0} races)`)
      if (VERBOSE && msg.results) {
        msg.results.slice(0, 5).forEach(r => {
          console.log(`   #${r.raceNumber}: 1st=${r.first}, 2nd=${r.second}`)
        })
      }
      break

    case 'timeSync':
      log(`TIME SYNC - Server: ${msg.serverTime} (unix: ${msg.serverTimeUnix})`)
      break

    case 'status':
      log(`STATUS - ${msg.connected ? 'CONNECTED' : 'DISCONNECTED'} - ${msg.message}`)
      break

    default:
      log(`UNKNOWN MESSAGE TYPE: ${msg.type}`)
      if (VERBOSE) {
        console.log(JSON.stringify(msg, null, 2))
      }
  }
}

function printStats() {
  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ timestamp: timestamp(), type: 'stats', data: stats }))
    return
  }

  console.log('')
  console.log('=== STATISTICS ===')
  console.log(`Connected: ${stats.connected}`)
  console.log(`Connected at: ${stats.connectedAt || 'N/A'}`)
  console.log(`Messages received: ${stats.messagesReceived}`)
  console.log(`Messages by type:`)
  Object.entries(stats.messagesByType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`)
  })
  console.log(`Last message: ${stats.lastMessageAt ? new Date(stats.lastMessageAt).toISOString() : 'N/A'}`)
  console.log(`Last timeSync: ${stats.lastTimeSyncAt ? new Date(stats.lastTimeSyncAt).toISOString() : 'N/A'}`)
  console.log(`Reconnects: ${stats.reconnects}`)
  if (stats.errors.length > 0) {
    console.log(`Recent errors:`)
    stats.errors.slice(-5).forEach(e => console.log(`   ${e}`))
  }
  console.log('==================')
  console.log('')
}

function checkStaleData() {
  if (!stats.connected) return

  const now = Date.now()

  // Check last message
  if (stats.lastMessageAt && (now - stats.lastMessageAt) > STALE_THRESHOLD_MS) {
    log(`WARNING: No messages received in ${Math.round((now - stats.lastMessageAt) / 1000)}s`)
  }

  // Check last timeSync specifically
  if (stats.lastTimeSyncAt && (now - stats.lastTimeSyncAt) > STALE_THRESHOLD_MS) {
    log(`WARNING: No timeSync received in ${Math.round((now - stats.lastTimeSyncAt) / 1000)}s`)
  }
}

function connect() {
  log(`Connecting to ${WS_URL}...`)

  const ws = new WebSocket(WS_URL)

  ws.on('open', () => {
    stats.connected = true
    stats.connectedAt = timestamp()
    log('Connected to relay server')
  })

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      logMessage(msg)
    } catch (e) {
      stats.errors.push(`Parse error: ${e.message}`)
      log(`ERROR parsing message: ${e.message}`)
    }
  })

  ws.on('close', () => {
    stats.connected = false
    log('Disconnected from relay server')

    // Reconnect after 5 seconds
    setTimeout(() => {
      stats.reconnects++
      connect()
    }, 5000)
  })

  ws.on('error', (error) => {
    stats.errors.push(`WebSocket error: ${error.message}`)
    log(`ERROR: ${error.message}`)
  })
}

// Main
if (!JSON_OUTPUT) {
  console.log('=== Relay Server Monitor ===')
  console.log(`Target: ${WS_URL}`)
  console.log(`Options: verbose=${VERBOSE}, json=${JSON_OUTPUT}, stats=${SHOW_STATS}`)
  console.log('Press Ctrl+C to exit')
  console.log('')
}

// Start connection
connect()

// Check for stale data every 10 seconds
setInterval(checkStaleData, 10000)

// Show stats periodically if enabled
if (SHOW_STATS) {
  setInterval(printStats, 30000)
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  if (!JSON_OUTPUT) {
    console.log('')
    printStats()
    console.log('Goodbye!')
  }
  process.exit(0)
})
