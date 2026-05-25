#!/usr/bin/env npx tsx
/**
 * Test Relay Server Connection
 *
 * Simulates how the POS app connects to the relay server and receives race data.
 *
 * Usage:
 *   npx tsx scripts/test-relay-connection.ts [relay-url]
 *
 * Examples:
 *   npx tsx scripts/test-relay-connection.ts                              # Local (ws://localhost:4081)
 *   npx tsx scripts/test-relay-connection.ts ws://172.210.106.85:4081     # Azure
 *   npx tsx scripts/test-relay-connection.ts ws://88.223.95.55:4081       # Hostinger
 */

import WebSocket from 'ws'

// Configuration
const RELAY_URL = process.argv[2] || 'ws://localhost:4081'
const TIMEOUT_MS = 60000  // 1 minute timeout

// Message types (same as useRealRaceData.ts)
interface RaceData {
  type: 'raceUpdate'
  game: string
  raceId: string
  raceNumber: string
  videoStartDt: string
  videoEndDt: string
  odds: number[]
}

interface RaceResult {
  type: 'raceResult'
  game: string
  raceId: string
  finish: Record<string, { competitorIndex: number; time: number | null }>
  bonus: number
}

interface TimeSync {
  type: 'timeSync'
  serverTime: string
  serverTimeUnix: number
}

interface GamepoolUpdate {
  type: 'gamepoolUpdate'
  gamepool: Record<string, RaceData[]>
}

interface ConnectionStatus {
  type: 'status'
  connected: boolean
  message: string
}

// Stats
const stats = {
  connected: false,
  messagesReceived: 0,
  timeSyncs: 0,
  raceUpdates: 0,
  raceResults: 0,
  gamepoolUpdates: 0,
  statusUpdates: 0,
  errors: 0,
  games: new Set<string>(),
  lastTimeSync: null as string | null,
  startTime: Date.now()
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`
}

function printStats() {
  const duration = formatDuration(Date.now() - stats.startTime)
  console.log('\n' + '='.repeat(60))
  console.log('CONNECTION STATS')
  console.log('='.repeat(60))
  console.log(`Duration:         ${duration}`)
  console.log(`Connected:        ${stats.connected ? '✅ Yes' : '❌ No'}`)
  console.log(`Messages:         ${stats.messagesReceived}`)
  console.log(`  - timeSync:     ${stats.timeSyncs}`)
  console.log(`  - raceUpdate:   ${stats.raceUpdates}`)
  console.log(`  - raceResult:   ${stats.raceResults}`)
  console.log(`  - gamepool:     ${stats.gamepoolUpdates}`)
  console.log(`  - status:       ${stats.statusUpdates}`)
  console.log(`Errors:           ${stats.errors}`)
  console.log(`Games seen:       ${[...stats.games].join(', ') || 'none'}`)
  console.log(`Last time sync:   ${stats.lastTimeSync || 'none'}`)
  console.log('='.repeat(60))
}

function main() {
  console.log('='.repeat(60))
  console.log('RELAY SERVER CONNECTION TEST')
  console.log('='.repeat(60))
  console.log(`URL:      ${RELAY_URL}`)
  console.log(`Timeout:  ${TIMEOUT_MS / 1000}s`)
  console.log('='.repeat(60))
  console.log('')
  console.log('Connecting...')

  const ws = new WebSocket(RELAY_URL)

  // Connection opened
  ws.on('open', () => {
    stats.connected = true
    console.log('✅ Connected to relay server\n')
    console.log('Waiting for messages... (press Ctrl+C to stop)\n')
  })

  // Message received
  ws.on('message', (data: Buffer) => {
    stats.messagesReceived++

    try {
      const message = JSON.parse(data.toString())
      const timestamp = new Date().toISOString().slice(11, 19)

      switch (message.type) {
        case 'timeSync':
          stats.timeSyncs++
          stats.lastTimeSync = message.serverTime
          console.log(`[${timestamp}] ⏱️  timeSync: ${message.serverTime}`)
          break

        case 'raceUpdate':
          stats.raceUpdates++
          stats.games.add(message.game)
          console.log(`[${timestamp}] 🏁 raceUpdate: ${message.game.toUpperCase()} #${message.raceNumber}`)
          break

        case 'raceResult':
          stats.raceResults++
          stats.games.add(message.game)
          const first = message.finish?.['1']?.competitorIndex
          const second = message.finish?.['2']?.competitorIndex
          console.log(`[${timestamp}] 🏆 raceResult: ${message.game.toUpperCase()} - 1st:${first} 2nd:${second}`)
          break

        case 'gamepoolUpdate':
          stats.gamepoolUpdates++
          const games = Object.entries(message.gamepool)
            .map(([game, races]) => `${game}:${(races as any[]).length}`)
            .join(', ')
          console.log(`[${timestamp}] 📦 gamepoolUpdate: ${games}`)
          Object.keys(message.gamepool).forEach(g => stats.games.add(g))
          break

        case 'status':
          stats.statusUpdates++
          const icon = message.connected ? '🟢' : '🔴'
          console.log(`[${timestamp}] ${icon} status: ${message.message}`)
          break

        case 'resultsHistory':
          console.log(`[${timestamp}] 📜 resultsHistory: ${message.game} (${message.results?.length || 0} races)`)
          break

        default:
          console.log(`[${timestamp}] ❓ unknown: ${message.type}`)
      }
    } catch (error) {
      stats.errors++
      console.error(`[ERROR] Failed to parse message:`, error)
    }
  })

  // Connection closed
  ws.on('close', (code, reason) => {
    stats.connected = false
    console.log(`\n❌ Connection closed (code: ${code}, reason: ${reason || 'none'})`)
    printStats()
    process.exit(code === 1000 ? 0 : 1)
  })

  // Connection error
  ws.on('error', (error) => {
    stats.errors++
    console.error(`\n❌ Connection error:`, error.message)
  })

  // Timeout
  setTimeout(() => {
    console.log('\n⏰ Timeout reached')
    ws.close(1000, 'Test timeout')
  }, TIMEOUT_MS)

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Interrupted by user')
    ws.close(1000, 'User interrupted')
  })
}

main()
