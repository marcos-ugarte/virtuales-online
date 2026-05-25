#!/usr/bin/env node
/**
 * Simple WebSocket test - shows raw data received
 */
import WebSocket from 'ws'

const HOST = process.argv[2] || '88.223.95.55'
const PORT = HOST === 'localhost' ? 8765 : 4081
const URL = `ws://${HOST}:${PORT}`

console.log(`Connecting to ${URL}...`)

const ws = new WebSocket(URL)

ws.on('open', () => {
  console.log('✅ Connected!')
  console.log('Waiting for data (10 seconds)...\n')
})

ws.on('message', (data) => {
  const msg = data.toString()
  console.log('--- Message received ---')
  try {
    const json = JSON.parse(msg)
    console.log(JSON.stringify(json, null, 2))
  } catch {
    console.log(msg.substring(0, 500))
  }
  console.log('')
})

ws.on('error', (e) => {
  console.error('❌ Error:', e.message)
})

ws.on('close', () => {
  console.log('Connection closed')
})

setTimeout(() => {
  console.log('\n⏱️  Timeout - closing connection')
  ws.close()
  process.exit(0)
}, 10000)
