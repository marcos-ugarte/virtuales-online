import { chromium } from 'playwright'
import WebSocket from 'ws'

// Configuration
const POS_URL = 'https://5fd76331325cc0c7b0ba3883ae3d491d.vgpos.net/'
const RELAY_URL = 'ws://localhost:8765/capture'
const CREDENTIALS = {
  username: '053001002001',
  password: '989900'
}

// All 4 game prefixes
const GAME_PREFIXES = ['dos', 'dot', 'doe', 'hoc']

// Session rotation: reconnect every 4-8 hours (like a work shift)
const SESSION_DURATION_MS = (4 + Math.random() * 4) * 60 * 60 * 1000

// Human-like User-Agent (Chrome on Windows 10)
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

let ws = null
let browser = null
let page = null
let context = null
let sessionStartTime = null
let isPaused = true // Start paused by default
let captureInterval = null

async function connectToRelay() {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(RELAY_URL)

    ws.on('open', () => {
      console.log('✅ Connected to relay server')
      resolve(ws)
    })

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString())

        // Handle pause/resume commands from server
        if (message.command === 'pause') {
          await pauseCapture()
        } else if (message.command === 'resume') {
          await resumeCapture()
        }
      } catch (error) {
        console.error('Error parsing command:', error.message)
      }
    })

    ws.on('error', (error) => {
      console.error('❌ Relay connection error:', error.message)
      reject(error)
    })

    ws.on('close', () => {
      console.log('🔌 Relay connection closed')
      // Attempt reconnect after 3 seconds
      setTimeout(connectToRelay, 3000)
    })
  })
}

async function pauseCapture() {
  if (isPaused) return

  isPaused = true
  console.log('⏸️  Pausing capture - closing browser to free POS session...')

  // Stop capture interval
  if (captureInterval) {
    clearInterval(captureInterval)
    captureInterval = null
  }

  // Close browser to release POS session
  if (browser) {
    try {
      await browser.close()
    } catch (e) {
      // Ignore close errors
    }
    browser = null
    page = null
    context = null
  }

  // Notify relay of status
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ msgType: 'captureStatus', active: false }))
  }

  console.log('⏸️  Capture paused - POS session released')
}

async function resumeCapture() {
  if (!isPaused) return

  isPaused = false
  console.log('▶️  Resuming capture...')

  // Notify relay that we're connecting
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ msgType: 'captureStatus', active: false, connecting: true, error: null }))
  }

  try {
    // Restart browser and login
    await launchBrowserAndLogin()

    // Notify relay of success
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ msgType: 'captureStatus', active: true, connecting: false, error: null }))
    }

    startCaptureLoop()
    console.log('▶️  Capture resumed')
  } catch (error) {
    console.error('❌ Failed to resume capture:', error.message)
    isPaused = true

    // Notify relay of error
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        msgType: 'captureStatus',
        active: false,
        connecting: false,
        error: 'No se pudo conectar. Posible sesión activa en otro dispositivo.'
      }))
    }

    // Close browser if it was opened
    if (browser) {
      try { await browser.close() } catch {}
      browser = null
      page = null
      context = null
    }
  }
}

// Simulate human-like behavior
async function simulateHumanActivity(page) {
  try {
    const x = 200 + Math.floor(Math.random() * 800)
    const y = 200 + Math.floor(Math.random() * 400)
    await page.mouse.move(x, y)

    if (Math.random() < 0.3) {
      await page.mouse.wheel(0, Math.random() < 0.5 ? 10 : -10)
    }
  } catch {
    // Ignore errors from human simulation
  }
}

function randomDelay(min, max) {
  return new Promise(resolve => setTimeout(resolve, min + Math.random() * (max - min)))
}

async function login(page) {
  console.log('🔐 Logging in...')

  await page.waitForSelector('#user_input', { timeout: 10000 })
  await randomDelay(500, 1500)
  await page.fill('#user_input', CREDENTIALS.username)
  await randomDelay(300, 800)
  await page.click('#password_input')
  await randomDelay(200, 500)

  for (const char of CREDENTIALS.password) {
    await page.keyboard.type(char)
    await randomDelay(50, 150)
  }

  await randomDelay(500, 1000)
  await page.click('#loginButton', { force: true })
  await page.waitForSelector('#dos_raceNumb, #dot_raceNumb, #doe_raceNumb, #hoc_raceNumb', { timeout: 30000 })

  try {
    await page.click('#errmodalPosButton', { timeout: 3000 })
    console.log('📋 Closed printer error modal')
  } catch {
    // Modal didn't appear
  }

  console.log('✅ Login successful')
}

async function captureAllGamesData(page) {
  try {
    const data = await page.evaluate((prefixes) => {
      const games = {}

      const getText = (id) => {
        const el = document.getElementById(id)
        return el ? el.textContent?.trim() || '' : ''
      }

      for (const prefix of prefixes) {
        const wrapper = document.getElementById(`${prefix}_wrapper`)
        if (!wrapper) continue

        const raceNumber = getText(`${prefix}_raceNumb`)
        const serverTime = getText(`${prefix}_servtime`)
        const raceStartTime = getText(`${prefix}_raceStart`)
        const countdownText = getText(`${prefix}_countDownTime`)
        const countdown = countdownText ? parseInt(countdownText, 10) : 0

        const timerBar = document.getElementById(`${prefix}_timerbarLine`)
        let progress = 0
        if (timerBar && timerBar.style.width) {
          progress = parseFloat(timerBar.style.width)
        }

        games[prefix] = {
          raceNumber,
          serverTime,
          raceStartTime,
          countdown,
          progress
        }
      }

      return games
    }, GAME_PREFIXES)

    return data
  } catch (error) {
    console.error('Error capturing data:', error.message)
    return null
  }
}

async function launchBrowserAndLogin() {
  browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-web-security',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080'
    ]
  })

  context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1920, height: 1080 },
    locale: 'es-ES',
    timezoneId: 'America/Bogota',
    permissions: ['geolocation'],
    screen: { width: 1920, height: 1080 },
    extraHTTPHeaders: {
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    }
  })

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' }
      ]
    })
    Object.defineProperty(navigator, 'languages', { get: () => ['es-ES', 'es', 'en'] })
  })

  page = await context.newPage()
  await page.goto(POS_URL)
  await login(page)
}

function startCaptureLoop() {
  let captureCount = 0
  sessionStartTime = Date.now()

  console.log('📡 Starting data capture loop for all games...')
  const sessionHours = Math.round(SESSION_DURATION_MS / 3600000 * 10) / 10
  console.log(`⏰ Session will rotate in ~${sessionHours} hours`)

  captureInterval = setInterval(async () => {
    if (isPaused) return

    // Check if session needs rotation
    if (Date.now() - sessionStartTime > SESSION_DURATION_MS) {
      console.log('🔄 Session rotation...')
      await pauseCapture()
      const waitTime = 60000 + Math.random() * 240000
      console.log(`⏳ Waiting ${Math.round(waitTime / 1000)}s before reconnecting...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      isPaused = false
      await launchBrowserAndLogin()
      startCaptureLoop()
      return
    }

    if (!page) return

    const gamesData = await captureAllGamesData(page)

    if (gamesData && ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        msgType: 'allGamesData',
        games: gamesData
      }))

      captureCount++
      if (captureCount % 10 === 0) {
        const activeGames = Object.entries(gamesData)
          .filter(([_, data]) => data.raceNumber && data.raceNumber !== '----')
          .map(([prefix, data]) => `${prefix}:#${data.raceNumber}(${data.countdown}s)`)

        if (activeGames.length > 0) {
          console.log(`📡 ${activeGames.join(' | ')}`)
        }
      }

      if (captureCount % (60 + Math.floor(Math.random() * 60)) === 0) {
        await simulateHumanActivity(page)
      }
    }
  }, 500)
}

async function startCapture() {
  console.log('🚀 Capture service ready')
  console.log(`🎮 Games: ${GAME_PREFIXES.join(', ')}`)
  console.log(`⏸️  Starting in PAUSED state - waiting for user to start`)

  try {
    await connectToRelay()

    // Notify relay that we're paused and ready
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ msgType: 'captureStatus', active: false, connecting: false, error: null }))
    }

    console.log('✅ Connected to relay - waiting for start command')
  } catch (error) {
    console.error('❌ Relay connection error:', error)
    console.log('🔄 Retrying in 30 seconds...')
    setTimeout(startCapture, 30000)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down capture...')
  if (captureInterval) clearInterval(captureInterval)
  if (ws) ws.close()
  if (browser) await browser.close()
  process.exit(0)
})

// Start
startCapture()
