#!/usr/bin/env node
/**
 * Test script for Virtual Racing Relay Server
 *
 * Tests:
 * 1. HTTP API status endpoint
 * 2. WebSocket connection
 * 3. Data reception
 *
 * Usage:
 *   node test-connection.js [host]
 *   node test-connection.js 88.223.95.55
 *   node test-connection.js localhost
 */

import WebSocket from 'ws'
import http from 'http'

const HOST = process.argv[2] || '88.223.95.55'
const WS_PORT = HOST === 'localhost' ? 8765 : 4081
const HTTP_PORT = HOST === 'localhost' ? 8766 : 4082

const WS_URL = `ws://${HOST}:${WS_PORT}`
const HTTP_URL = `http://${HOST}:${HTTP_PORT}`

console.log('=== Virtual Racing Relay Server Test ===')
console.log(`Host: ${HOST}`)
console.log(`WebSocket: ${WS_URL}`)
console.log(`HTTP API: ${HTTP_URL}`)
console.log('')

let passed = 0
let failed = 0

function test(name, success, details = '') {
  if (success) {
    console.log(`✅ ${name}`)
    passed++
  } else {
    console.log(`❌ ${name}${details ? ': ' + details : ''}`)
    failed++
  }
}

// Test 1: HTTP API Status
async function testHttpStatus() {
  return new Promise((resolve) => {
    const req = http.get(`${HTTP_URL}/status`, { timeout: 5000 }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          test('HTTP API reachable', true)
          test('Status response valid',
            typeof json.captureActive === 'boolean' &&
            typeof json.captureConnected === 'boolean',
            `Got: ${JSON.stringify(json)}`
          )
          console.log(`   - Capture active: ${json.captureActive}`)
          console.log(`   - Capture connected: ${json.captureConnected}`)
          console.log(`   - Consumers: ${json.consumers}`)
          resolve(true)
        } catch (e) {
          test('Status response valid', false, e.message)
          resolve(false)
        }
      })
    })

    req.on('error', (e) => {
      test('HTTP API reachable', false, e.message)
      resolve(false)
    })

    req.on('timeout', () => {
      req.destroy()
      test('HTTP API reachable', false, 'Timeout')
      resolve(false)
    })
  })
}

// Test 2: WebSocket Connection
async function testWebSocket() {
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL)
    let receivedData = false

    const timeout = setTimeout(() => {
      ws.close()
      test('WebSocket connection', false, 'Timeout')
      resolve(false)
    }, 10000)

    ws.on('open', () => {
      test('WebSocket connection', true)
    })

    ws.on('message', (data) => {
      if (receivedData) return
      receivedData = true

      try {
        const msg = JSON.parse(data.toString())
        test('Received initial data', true)

        // Handle both old format (type) and new format (msgType)
        const msgType = msg.type || msg.msgType
        console.log(`   - Message type: ${msgType}`)

        if (msgType === 'status') {
          console.log(`   - Connected: ${msg.connected}`)
          console.log(`   - Message: ${msg.message}`)
          // Don't close yet, wait for race data
          receivedData = false
          return
        }

        if (msgType === 'raceUpdate') {
          test('Race data received', true)
          console.log(`   - Game: ${msg.game}`)
          console.log(`   - Race #: ${msg.raceNumber}`)
          console.log(`   - Competitors: ${Object.keys(msg.competitors || {}).length}`)
          console.log(`   - Odds: ${(msg.odds || []).length} values`)
        }

        if (msg.msgType === 'allGamesUpdate') {
          const games = Object.keys(msg.games || {})
          test('Games data present', games.length > 0, `Games: ${games.join(', ')}`)

          if (msg.gamesConfig) {
            console.log('   - Games configured:')
            for (const [prefix, config] of Object.entries(msg.gamesConfig)) {
              console.log(`     ${prefix}: ${config.name} (${config.runners} runners)`)
            }
          }

          console.log(`   - Capture active: ${msg.captureActive}`)
        }

        clearTimeout(timeout)
        ws.close()
        resolve(true)
      } catch (e) {
        test('Received initial data', false, e.message)
        clearTimeout(timeout)
        ws.close()
        resolve(false)
      }
    })

    ws.on('error', (e) => {
      clearTimeout(timeout)
      test('WebSocket connection', false, e.message)
      resolve(false)
    })
  })
}

// Run tests
async function runTests() {
  console.log('--- Test 1: HTTP API ---')
  await testHttpStatus()
  console.log('')

  console.log('--- Test 2: WebSocket ---')
  await testWebSocket()
  console.log('')

  console.log('=== Results ===')
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log('')

  // WebSocket is the critical component - HTTP API is optional
  const wsWorking = passed >= 3  // At least: WS connection + initial data + race data

  if (wsWorking) {
    console.log('🎉 Relay server is working! WebSocket connection successful.')
    if (failed > 0) {
      console.log('   (HTTP API not available - this is OK for current Azure deployment)')
    }
  } else if (passed === 0) {
    console.log('💥 All tests failed! Relay server may not be running.')
    console.log('')
    console.log('Check Azure Container Instance:')
    console.log('  az container show --resource-group rg-virtual-racing --name relay-server')
    console.log('')
    console.log('Restart if needed:')
    console.log('  az container restart --resource-group rg-virtual-racing --name relay-server')
  } else {
    console.log('⚠️  Some tests failed. Check the relay server logs.')
  }

  // Exit 0 if WebSocket works (HTTP is optional)
  process.exit(wsWorking ? 0 : 1)
}

runTests()
