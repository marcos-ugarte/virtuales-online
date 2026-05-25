/**
 * Test WebSocket credentials for direct connection
 */
import WebSocket from 'ws'

const CONFIG = {
  WS_URL: 'wss://vgcontrol.com:1229/pos',
  DEVICE_ID: '63a3235d2b313063411ac7298414ac8e',
  OPERATOR_ID: '001-001-001-001',
  PIN: '445464'
}

let msgId = 0

function formatDate(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

console.log('Testing WebSocket credentials...')
console.log(`Device: ${CONFIG.DEVICE_ID}`)
console.log(`Operator: ${CONFIG.OPERATOR_ID}`)
console.log(`WebSocket: ${CONFIG.WS_URL}`)
console.log('')

const ws = new WebSocket(CONFIG.WS_URL)

ws.on('open', () => {
  console.log('✅ WebSocket connected')

  // Step 1: Device Login
  const deviceLoginMsg = {
    msgId: ++msgId,
    msgType: 'deviceLogin',
    deviceType: 'pos',
    deviceId: CONFIG.DEVICE_ID,
    uniqueId: `test-${Date.now()}`,
    version: '3.0.1000',
    clientDt: formatDate()
  }

  console.log('📤 Sending deviceLogin...')
  ws.send(JSON.stringify(deviceLoginMsg))
})

ws.on('message', (data) => {
  try {
    const raw = data.toString()
    console.log('📥 RAW:', raw.slice(0, 300))
    const msg = JSON.parse(raw)

    if (msg.msgType === 'deviceLogin') {
      if (msg.posInitId) {
        console.log('✅ deviceLogin OK - posInitId:', msg.posInitId)
        console.log('   Language:', msg.setting?.language)
        console.log('   Currency:', msg.setting?.currency)

        // Step 2: User Login
        const initMsg = {
          msgId: ++msgId,
          msgType: 'init',
          user: CONFIG.OPERATOR_ID,
          pass: CONFIG.PIN,
          historyGames: -8,
          futureGames: 22
        }

        console.log('')
        console.log('📤 Sending init (user login)...')
        ws.send(JSON.stringify(initMsg))
      } else {
        console.log('❌ deviceLogin failed:', JSON.stringify(msg).slice(0, 200))
        ws.close()
      }
    }

    if (msg.msgType === 'init') {
      if (msg.msgValue === 'ok') {
        console.log('✅ init OK - Session:', msg.sessionID)
        console.log('   Operator:', msg.operatorID)
        console.log('   Gamepool races:', msg.gamepool?.length || 0)

        // Show available games
        if (msg.gamepool) {
          const eventTypes = [...new Set(msg.gamepool.map((g: any) => g.eventType))]
          console.log('   Event types:', eventTypes.join(', '))
        }

        console.log('')
        console.log('🎉 CREDENTIALS VALID - Ready for direct WebSocket connection!')

        // Close after success
        setTimeout(() => {
          ws.close()
          process.exit(0)
        }, 1000)
      } else {
        console.log('❌ init failed:', msg.msgValue, msg.errorMsg || '')
        ws.close()
        process.exit(1)
      }
    }

    if (msg.msgType === 'time') {
      // Ignore time sync messages
    }

  } catch (e) {
    console.log('Parse error:', e)
  }
})

ws.on('error', (err) => {
  console.log('❌ WebSocket error:', err.message)
  process.exit(1)
})

ws.on('close', () => {
  console.log('WebSocket closed')
})

// Timeout after 10 seconds
setTimeout(() => {
  console.log('❌ Timeout - no response')
  ws.close()
  process.exit(1)
}, 10000)
