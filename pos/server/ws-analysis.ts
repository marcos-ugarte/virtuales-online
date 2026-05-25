/**
 * WebSocket Analysis Script
 *
 * Connects to the original POS and intercepts all WebSocket communication
 * to document the message structure for our relay server implementation.
 *
 * Simulates human-like behavior to avoid detection.
 */

import { chromium, Page, BrowserContext } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const CONFIG = {
  POS_URL: 'https://5fd76331325cc0c7b0ba3883ae3d491d.vgpos.net/gamepool/dist/',
  OPERATOR_ID: '053001002001',
  PIN: '989900',
  CAPTURE_DURATION_MS: 180000, // 3 minutes to capture full race cycles
  OUTPUT_DIR: path.join(__dirname, '..', 'docs'),
  VIEWPORT: { width: 1760, height: 858 }
}

// Human-like behavior helpers
const randomDelay = (min: number, max: number): Promise<void> => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

const humanTypeDelay = (): number => Math.floor(Math.random() * 150) + 50

// Move mouse in a human-like curve
async function humanMouseMove(page: Page, x: number, y: number): Promise<void> {
  const steps = Math.floor(Math.random() * 10) + 5
  await page.mouse.move(x, y, { steps })
  await randomDelay(100, 300)
}

// Click with human-like behavior
async function humanClick(page: Page, x: number, y: number): Promise<void> {
  await humanMouseMove(page, x, y)
  await randomDelay(50, 150)
  await page.mouse.click(x, y)
  await randomDelay(200, 500)
}

// Type with human-like delays
async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.click(selector)
  await randomDelay(100, 300)

  for (const char of text) {
    await page.keyboard.type(char, { delay: humanTypeDelay() })
  }
  await randomDelay(200, 400)
}

// Message storage
interface WSMessage {
  timestamp: number
  direction: 'sent' | 'received'
  data: unknown
  raw?: string
}

const messages: WSMessage[] = []

// Analysis results
interface MessageTypeInfo {
  count: number
  samples: unknown[]
  fields: Set<string>
}

async function main() {
  console.log('=' .repeat(70))
  console.log('  WebSocket Analysis - POS Original')
  console.log('  Simulating human behavior for natural interaction')
  console.log('=' .repeat(70))
  console.log('')

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true })
  }

  console.log('🚀 Launching browser...')

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-dev-shm-usage',
    ]
  })

  const context: BrowserContext = await browser.newContext({
    viewport: CONFIG.VIEWPORT,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
  })

  // Remove webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })

  // Store WebSocket URL for later
  let capturedWsUrl: string | undefined

  const page = await context.newPage()

  // Intercept WebSocket using Playwright's native CDP support
  page.on('websocket', ws => {
    capturedWsUrl = ws.url()
    console.log(`\n🔌 WebSocket opened: ${ws.url()}`)

    ws.on('framesent', event => {
      try {
        const parsed = JSON.parse(event.payload as string)
        messages.push({
          timestamp: Date.now(),
          direction: 'sent',
          data: parsed
        })
        console.log(`📤 Sent: ${(event.payload as string).substring(0, 100)}...`)
      } catch {
        messages.push({
          timestamp: Date.now(),
          direction: 'sent',
          raw: event.payload as string
        })
      }
    })

    ws.on('framereceived', event => {
      try {
        const parsed = JSON.parse(event.payload as string)
        messages.push({
          timestamp: Date.now(),
          direction: 'received',
          data: parsed
        })
        // Only log first 150 chars for readability
        const preview = (event.payload as string).substring(0, 150)
        if (messages.length % 10 === 0) {
          console.log(`📥 Received (${messages.length}): ${preview}...`)
        }
      } catch {
        messages.push({
          timestamp: Date.now(),
          direction: 'received',
          raw: event.payload as string
        })
      }
    })

    ws.on('close', () => {
      console.log(`\n🔌 WebSocket closed`)
    })
  })

  try {
    // Navigate to POS
    console.log('📡 Navigating to POS...')
    await page.goto(CONFIG.POS_URL, { waitUntil: 'networkidle', timeout: 60000 })

    // Human-like initial wait (looking at the page)
    console.log('👀 Viewing login page...')
    await randomDelay(2000, 4000)

    // Move mouse around naturally
    await humanMouseMove(page, 500, 300)
    await randomDelay(500, 1000)
    await humanMouseMove(page, 800, 400)
    await randomDelay(300, 600)

    // Login process
    console.log('🔐 Logging in (human-like)...')

    // Click on user input field
    const userInput = page.locator('#user_input')
    await userInput.waitFor({ state: 'visible', timeout: 10000 })

    // Move to input field area and click
    const userBox = await userInput.boundingBox()
    if (userBox) {
      await humanClick(page, userBox.x + userBox.width / 2, userBox.y + userBox.height / 2)
    }

    // Type operator ID with human-like delays
    for (const char of CONFIG.OPERATOR_ID) {
      await page.keyboard.type(char, { delay: humanTypeDelay() })
    }
    await randomDelay(500, 1000)

    // Enter PIN using numpad (human-like)
    console.log('🔢 Entering PIN...')
    for (const digit of CONFIG.PIN) {
      const numpadButton = page.locator(`#logInPadNu${digit}`)
      const box = await numpadButton.boundingBox()
      if (box) {
        // Add slight randomness to click position
        const offsetX = (Math.random() - 0.5) * 10
        const offsetY = (Math.random() - 0.5) * 10
        await humanClick(page, box.x + box.width / 2 + offsetX, box.y + box.height / 2 + offsetY)
      }
      await randomDelay(150, 350)
    }

    await randomDelay(500, 1000)

    // Click login button
    console.log('🔓 Clicking login...')
    const loginButton = page.locator('#loginButton')
    const loginBox = await loginButton.boundingBox()
    if (loginBox) {
      await humanClick(page, loginBox.x + loginBox.width / 2, loginBox.y + loginBox.height / 2)
    }

    // Wait for WebSocket connection
    console.log('⏳ Waiting for WebSocket connection...')
    await randomDelay(4000, 6000)

    // Take screenshot after login attempt
    await page.screenshot({ path: path.join(CONFIG.OUTPUT_DIR, 'after-login.png') })
    console.log('📸 Screenshot saved: after-login.png')

    // Handle printer error modal - click OK button
    try {
      // Look for the OK button in the modal (yellow button with "OK" text)
      const okButton = page.locator('text=OK').first()
      if (await okButton.isVisible({ timeout: 3000 })) {
        console.log('⚠️ Found printer error modal, clicking OK...')
        await page.screenshot({ path: path.join(CONFIG.OUTPUT_DIR, 'error-modal.png') })
        await okButton.click()
        console.log('✅ Modal closed')
        await randomDelay(1000, 2000)
      }
    } catch {
      console.log('ℹ️ No modal found or already closed')
    }

    // Also try clicking by coordinates if the button is still there
    try {
      const okButton2 = page.getByRole('button', { name: 'OK' })
      if (await okButton2.isVisible({ timeout: 1000 })) {
        await okButton2.click()
        await randomDelay(500, 1000)
      }
    } catch {
      // Button not found
    }

    // Wait more for WebSocket to be established
    await randomDelay(5000, 8000)
    await page.screenshot({ path: path.join(CONFIG.OUTPUT_DIR, 'main-screen.png') })
    console.log('📸 Screenshot saved: main-screen.png')

    // Check WebSocket URL
    console.log(`\n📡 WebSocket URL: ${capturedWsUrl || 'Not captured yet'}`)

    // Debug: Check if we're in the game screen
    const pageContent = await page.evaluate(() => document.body.innerText.substring(0, 500))
    console.log(`\n📄 Page content preview:\n${pageContent.substring(0, 300)}...`)

    // Capture messages for specified duration
    console.log(`\n📊 Capturing WebSocket messages for ${CONFIG.CAPTURE_DURATION_MS / 1000} seconds...`)
    console.log('   (This will capture multiple race cycles)\n')

    const startTime = Date.now()
    let lastCount = 0

    while (Date.now() - startTime < CONFIG.CAPTURE_DURATION_MS) {
      await randomDelay(5000, 7000)

      // Occasionally move mouse to simulate activity
      if (Math.random() > 0.7) {
        const randomX = Math.floor(Math.random() * CONFIG.VIEWPORT.width)
        const randomY = Math.floor(Math.random() * CONFIG.VIEWPORT.height)
        await humanMouseMove(page, randomX, randomY)
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000)

      if (messages.length > lastCount) {
        const newMsgs = messages.length - lastCount
        console.log(`⏱️ ${elapsed}s - Total messages: ${messages.length} (+${newMsgs} new)`)
        lastCount = messages.length
      } else {
        console.log(`⏱️ ${elapsed}s - Total messages: ${messages.length}`)
      }
    }

    // Messages are already in the global array
    console.log('\n📥 Collecting captured messages...')
    const collectedMessages: WSMessage[] = messages

    console.log(`\n✅ Captured ${collectedMessages.length} messages`)

    // Analyze messages
    console.log('\n📊 Analyzing message structure...\n')

    const receivedTypes: Record<string, MessageTypeInfo> = {}
    const sentTypes: Record<string, MessageTypeInfo> = {}

    for (const msg of collectedMessages) {
      const types = msg.direction === 'received' ? receivedTypes : sentTypes
      const data = msg.data as any

      if (data && data.msgType) {
        const msgType = data.msgType

        if (!types[msgType]) {
          types[msgType] = {
            count: 0,
            samples: [],
            fields: new Set()
          }
        }

        types[msgType].count++

        if (types[msgType].samples.length < 3) {
          types[msgType].samples.push(data)
        }

        // Collect field names
        for (const key of Object.keys(data)) {
          types[msgType].fields.add(key)
        }
      }
    }

    // Generate documentation
    let documentation = `# WebSocket Communication Analysis - POS Original

Generated: ${new Date().toISOString()}

## Connection Details

- **WebSocket URL**: \`${capturedWsUrl}\`
- **Capture Duration**: ${CONFIG.CAPTURE_DURATION_MS / 1000} seconds
- **Total Messages Captured**: ${collectedMessages.length}
- **Messages Received**: ${collectedMessages.filter(m => m.direction === 'received').length}
- **Messages Sent**: ${collectedMessages.filter(m => m.direction === 'sent').length}

---

## Message Types Received (Server → POS)

| Type | Count | Description |
|------|-------|-------------|
${Object.entries(receivedTypes)
  .sort((a, b) => b[1].count - a[1].count)
  .map(([type, info]) => `| \`${type}\` | ${info.count} | Fields: ${Array.from(info.fields).join(', ')} |`)
  .join('\n')}

### Detailed Message Structures

`

    // Add detailed samples for received messages
    for (const [type, info] of Object.entries(receivedTypes).sort((a, b) => b[1].count - a[1].count)) {
      documentation += `
#### ${type} (${info.count} messages)

**Fields**: ${Array.from(info.fields).join(', ')}

**Sample**:
\`\`\`json
${JSON.stringify(info.samples[0], null, 2)}
\`\`\`

`
    }

    documentation += `
---

## Message Types Sent (POS → Server)

| Type | Count | Description |
|------|-------|-------------|
${Object.entries(sentTypes)
  .sort((a, b) => b[1].count - a[1].count)
  .map(([type, info]) => `| \`${type}\` | ${info.count} | Fields: ${Array.from(info.fields).join(', ')} |`)
  .join('\n')}

### Detailed Message Structures

`

    // Add detailed samples for sent messages
    for (const [type, info] of Object.entries(sentTypes).sort((a, b) => b[1].count - a[1].count)) {
      documentation += `
#### ${type} (${info.count} messages)

**Fields**: ${Array.from(info.fields).join(', ')}

**Sample**:
\`\`\`json
${JSON.stringify(info.samples[0], null, 2)}
\`\`\`

`
    }

    // Add relevant messages section
    documentation += `
---

## Messages Relevant for Our Implementation

Based on the analysis, these are the messages we need to intercept:

### For Race Data (countdown, race number, status)
- Look for messages containing: raceNumber, countdown, gameState, etc.

### For Odds/Quotes
- Look for messages containing odds/quotes data

### For Results
- Look for messages containing race results (positions)

---

## Raw Messages Sample

First 50 messages (chronological):

\`\`\`json
${JSON.stringify(collectedMessages.slice(0, 50), null, 2)}
\`\`\`

---

## Implementation Notes

1. **WebSocket URL**: ${capturedWsUrl}
2. **The POS connects automatically after login**
3. **Messages are JSON formatted with \`msgType\` field**
4. **Server pushes data - we only need to listen**

`

    // Save documentation
    const docPath = path.join(CONFIG.OUTPUT_DIR, 'WEBSOCKET_ANALYSIS.md')
    fs.writeFileSync(docPath, documentation)
    console.log(`📄 Documentation saved to: ${docPath}`)

    // Save raw messages
    const rawPath = path.join(CONFIG.OUTPUT_DIR, 'ws-messages-raw.json')
    fs.writeFileSync(rawPath, JSON.stringify({
      wsUrl: capturedWsUrl,
      captureDate: new Date().toISOString(),
      captureDuration: CONFIG.CAPTURE_DURATION_MS,
      messages: collectedMessages
    }, null, 2))
    console.log(`💾 Raw messages saved to: ${rawPath}`)

    // Print summary
    console.log('\n' + '='.repeat(70))
    console.log('  ANALYSIS SUMMARY')
    console.log('='.repeat(70))
    console.log(`\nWebSocket URL: ${capturedWsUrl}`)
    console.log(`\nReceived Message Types:`)
    for (const [type, info] of Object.entries(receivedTypes).sort((a, b) => b[1].count - a[1].count)) {
      console.log(`  - ${type}: ${info.count} messages`)
    }
    console.log(`\nSent Message Types:`)
    for (const [type, info] of Object.entries(sentTypes).sort((a, b) => b[1].count - a[1].count)) {
      console.log(`  - ${type}: ${info.count} messages`)
    }

  } catch (error) {
    console.error('❌ Error:', error)

    // Take screenshot on error
    try {
      await page.screenshot({ path: path.join(CONFIG.OUTPUT_DIR, 'error-screenshot.png') })
      console.log('📸 Error screenshot saved')
    } catch {}

  } finally {
    await browser.close()
    console.log('\n✅ Analysis complete!')
  }
}

main().catch(console.error)
