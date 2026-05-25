/**
 * Test script v10: Wait for fresh rounds only
 *
 * Key insight: Backend locks rounds early for security (anti-fraud).
 * Solution: Only bet on FRESH rounds (countdown > 170s after game selection)
 * This ensures we're betting on newly opened rounds, not mid-cycle ones.
 */

import { chromium, Page } from 'playwright'
import * as fs from 'fs'

const CONFIG = {
  POS_URL: 'http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
  TOTAL_TICKETS: 20,
  INTERVAL_MS: 30000, // 30 seconds between tickets (faster since we wait for fresh rounds)
  MIN_COUNTDOWN_AFTER_GAME: 150, // Only bet if countdown > 150s AFTER game selection
  MAX_RETRIES: 3,
}

interface TicketResult {
  attempt: number
  timestamp: string
  game: string
  runner: number
  amount: number
  success: boolean
  ticketId?: string
  error?: string
  duration: number
  retries: number
  countdownAfterGame?: number
}

const results: TicketResult[] = []

let pendingTicketResult: {
  success: boolean
  ticketId?: string
  error?: string
  resolved: boolean
} = { success: false, resolved: false }

const games = ['dos', 'dot', 'doe', 'hoc']

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function resetPendingResult(): void {
  pendingTicketResult = { success: false, resolved: false }
}

function isValidTicketId(id: string | undefined): boolean {
  if (!id) return false
  return /^[a-f0-9]{4,}$/i.test(id)
}

async function getCountdown(page: Page): Promise<number> {
  try {
    const text = await page.locator('body').innerText()

    // Pattern: SEG followed by newline then number
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'SEG' && lines[i + 1]) {
        const num = parseInt(lines[i + 1].trim())
        if (!isNaN(num) && num > 0 && num < 300) {
          return num
        }
      }
    }

    // Fallback pattern
    const match = text.match(/SEG[\s\n]+(\d{1,3})\b/i)
    if (match && parseInt(match[1]) < 300) {
      return parseInt(match[1], 10)
    }
  } catch {}
  return -1
}

async function isOverlayVisible(page: Page): Promise<boolean> {
  return await page.locator('text=CARRERA ACTIVA').isVisible().catch(() => false)
}

async function waitForNoOverlay(page: Page, maxWait: number = 60000): Promise<boolean> {
  const startTime = Date.now()
  while (Date.now() - startTime < maxWait) {
    if (!await isOverlayVisible(page)) return true
    await delay(2000)
  }
  return false
}

async function isLoggedIn(page: Page): Promise<boolean> {
  const text = await page.locator('body').innerText().catch(() => '')
  return text.includes('JUGADA') && text.includes('CARRERA')
}

async function login(page: Page): Promise<boolean> {
  try {
    console.log('   [Login] Starting...')

    if (await isLoggedIn(page)) {
      console.log('   [Login] Already logged in')
      await dismissModal(page)
      return true
    }

    await page.waitForFunction(() => {
      const text = document.body.innerText || ''
      return !text.includes('Conectando')
    }, { timeout: 30000 })
    await delay(2000)

    await page.getByRole('textbox', { name: 'ID DE OPERADOR' }).fill(CONFIG.OPERATOR_ID)
    await delay(200)
    await page.getByRole('textbox', { name: 'CONTRASENA' }).fill(CONFIG.PIN)
    await delay(200)

    await page.locator('div').filter({ hasText: /^ACCESO$/ }).last().click()
    await delay(5000)

    await dismissModal(page)

    if (await isLoggedIn(page)) {
      console.log('   [Login] Success')
      return true
    }

    console.log('   [Login] Failed')
    return false
  } catch (error: any) {
    console.log(`   [Login] Error: ${error.message?.slice(0, 40)}`)
    return false
  }
}

async function dismissModal(page: Page): Promise<void> {
  for (let i = 0; i < 3; i++) {
    try {
      const okBtn = page.getByRole('button', { name: 'OK' })
      if (await okBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await okBtn.click()
        await delay(400)
      }
    } catch {}
  }
}

async function ensureLoggedIn(page: Page): Promise<boolean> {
  if (await isLoggedIn(page)) return true

  console.log('   [Session] Lost, reconnecting...')
  await page.goto(CONFIG.POS_URL)
  await delay(5000)
  return await login(page)
}

async function forceClick(page: Page, locator: any, name: string): Promise<boolean> {
  try {
    await locator.click({ force: true, timeout: 3000 })
    return true
  } catch {
    console.log(`   [${name}] Click failed`)
    return false
  }
}

async function waitForFreshRound(page: Page, game: string): Promise<number> {
  // Select game first to see its actual countdown
  const gameBtn = page.locator(`button:has(img[alt="${game}"])`).first()

  for (let attempt = 0; attempt < 20; attempt++) {
    // Check for overlay
    if (await isOverlayVisible(page)) {
      console.log('   [Wait] Race active, waiting...')
      await waitForNoOverlay(page, 60000)
      await delay(3000)
    }

    // Click game to update countdown display
    await forceClick(page, gameBtn, `Game ${game.toUpperCase()}`)
    await delay(1000)

    const countdown = await getCountdown(page)

    if (countdown >= CONFIG.MIN_COUNTDOWN_AFTER_GAME) {
      console.log(`   [Fresh] Countdown ${countdown}s >= ${CONFIG.MIN_COUNTDOWN_AFTER_GAME}s - OK!`)
      return countdown
    }

    if (countdown > 0) {
      console.log(`   [Wait] Countdown ${countdown}s < ${CONFIG.MIN_COUNTDOWN_AFTER_GAME}s, waiting for fresh round...`)

      // If countdown is low, wait for race to finish
      if (countdown < 30) {
        await delay(countdown * 1000 + 5000)
        await waitForNoOverlay(page, 60000)
        await delay(3000)
      } else {
        await delay(5000)
      }
    } else {
      await delay(3000)
    }
  }

  return 0
}

async function createTicket(page: Page, attempt: number, retryCount: number = 0): Promise<TicketResult> {
  const startTime = Date.now()
  const game = games[(attempt - 1) % games.length]
  const runner = ((attempt - 1) % 5) + 1
  const amounts = [25, 50, 100]
  const amount = amounts[(attempt - 1) % amounts.length]

  const result: TicketResult = {
    attempt,
    timestamp: new Date().toISOString(),
    game,
    runner,
    amount,
    success: false,
    duration: 0,
    retries: retryCount
  }

  resetPendingResult()

  try {
    console.log(`\n#${attempt}: ${game.toUpperCase()} R${runner} $${amount}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`)

    // 1. Ensure logged in
    if (!await ensureLoggedIn(page)) {
      result.error = 'Login failed'
      result.duration = Date.now() - startTime
      return result
    }

    // 2. Click JUGADA tab
    await page.getByRole('button', { name: 'JUGADA' }).click().catch(() => {})
    await delay(300)

    // 3. Wait for fresh round (countdown > 150s after selecting game)
    const countdownAfterGame = await waitForFreshRound(page, game)
    if (countdownAfterGame === 0) {
      result.error = 'No fresh round available'
      result.duration = Date.now() - startTime
      return result
    }
    result.countdownAfterGame = countdownAfterGame

    // 4. Select runner (game already selected in waitForFreshRound)
    const runnerBtn = page.locator(`button:has(img[alt="${runner}"])`).first()
    if (!await forceClick(page, runnerBtn, `Runner ${runner}`)) {
      result.error = 'Could not select runner'
      result.duration = Date.now() - startTime
      return result
    }
    await delay(300)

    // 5. Select amount
    const amountBtn = page.locator(`button:has(img[alt="$${amount}"])`).first()
    if (!await forceClick(page, amountBtn, `Amount $${amount}`)) {
      result.error = 'Could not select amount'
      result.duration = Date.now() - startTime
      return result
    }
    await delay(300)

    // 6. Final check - countdown should still be high
    const finalCountdown = await getCountdown(page)
    console.log(`   [Check] Countdown before submit: ${finalCountdown}s`)

    // 7. Click Imprimir
    resetPendingResult()
    const imprimirBtn = page.getByRole('button', { name: 'Imprimir' })
    if (!await forceClick(page, imprimirBtn, 'Imprimir')) {
      result.error = 'Could not click Imprimir'
      result.duration = Date.now() - startTime
      return result
    }

    // 8. Wait for response
    console.log('   [Submit] Waiting for response...')
    const maxWaitMs = 10000
    const waitStart = Date.now()

    while (Date.now() - waitStart < maxWaitMs) {
      if (pendingTicketResult.resolved) break
      await delay(250)
    }

    // 9. Process result
    if (pendingTicketResult.resolved) {
      if (pendingTicketResult.success && isValidTicketId(pendingTicketResult.ticketId)) {
        result.success = true
        result.ticketId = pendingTicketResult.ticketId
      } else if (pendingTicketResult.error) {
        result.error = pendingTicketResult.error

        // Retry on "not open" - wait for next fresh round
        if (result.error.includes('not open') && retryCount < CONFIG.MAX_RETRIES) {
          console.log('   [Retry] Round locked, waiting for fresh round...')
          await delay(5000)
          return createTicket(page, attempt, retryCount + 1)
        }
      } else {
        result.error = 'Invalid response'
      }
    } else {
      result.error = 'No server response'
      if (retryCount < CONFIG.MAX_RETRIES) {
        await delay(3000)
        return createTicket(page, attempt, retryCount + 1)
      }
    }

    await delay(1000)

  } catch (error: any) {
    result.error = error.message?.slice(0, 50) || 'Unknown error'
  }

  result.duration = Date.now() - startTime

  if (result.success) {
    console.log(`   OK - ID: ${result.ticketId} (countdown: ${result.countdownAfterGame}s, ${result.duration}ms)`)
  } else {
    console.log(`   FAIL: ${result.error} (countdown: ${result.countdownAfterGame}s, ${result.duration}ms)`)
  }

  return result
}

function printSummary(): void {
  console.log('\n' + '='.repeat(60))
  console.log('TEST SUMMARY')
  console.log('='.repeat(60))

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const total = results.length
  const rate = total > 0 ? (successful / total * 100).toFixed(0) : '0'

  console.log(`\nTotal: ${total} | OK: ${successful} (${rate}%) | Failed: ${failed}`)

  if (failed > 0) {
    const errorCounts: Record<string, number> = {}
    results.filter(r => !r.success).forEach(r => {
      const error = r.error || 'Unknown'
      errorCounts[error] = (errorCounts[error] || 0) + 1
    })

    console.log('\nError breakdown:')
    Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([error, count]) => {
        console.log(`   ${count}x - ${error}`)
      })
  }

  console.log('\nBy game:')
  for (const game of games) {
    const gameResults = results.filter(r => r.game === game)
    const gameSuccess = gameResults.filter(r => r.success).length
    const rate = gameResults.length > 0 ? (gameSuccess / gameResults.length * 100).toFixed(0) : '0'
    console.log(`   ${game.toUpperCase()}: ${gameSuccess}/${gameResults.length} (${rate}%)`)
  }

  const successfulTickets = results.filter(r => r.success)
  if (successfulTickets.length > 0) {
    console.log('\nSuccessful tickets:')
    successfulTickets.forEach(t => {
      console.log(`   #${t.attempt} ${t.game.toUpperCase()} R${t.runner} $${t.amount} -> ID: ${t.ticketId} (${t.countdownAfterGame}s)`)
    })
  }

  console.log('='.repeat(60))

  if (!fs.existsSync('test-results')) fs.mkdirSync('test-results')
  fs.writeFileSync('test-results/results-v10.json', JSON.stringify(results, null, 2))
  console.log('\nResults saved to test-results/results-v10.json')
}

async function main() {
  const testStartTime = Date.now()

  console.log('='.repeat(60))
  console.log('TICKET TEST v10 - Fresh Rounds Only')
  console.log('='.repeat(60))
  console.log(`Target: ${CONFIG.TOTAL_TICKETS} tickets`)
  console.log(`Interval: ${CONFIG.INTERVAL_MS / 1000}s`)
  console.log(`Min countdown after game: ${CONFIG.MIN_COUNTDOWN_AFTER_GAME}s`)
  console.log(`Games: ${games.join(', ').toUpperCase()}`)
  console.log(`URL: ${CONFIG.POS_URL}`)
  console.log('='.repeat(60))
  console.log('')

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const context = await browser.newContext({
    viewport: { width: 1760, height: 858 }
  })

  const page = await context.newPage()

  // Console listener
  page.on('console', msg => {
    const text = msg.text()

    if (text.includes('[handlePrint] Result:')) {
      const ticketIdMatch = text.match(/ticketId:\s*([a-f0-9]{4,})/i)
      if (ticketIdMatch && isValidTicketId(ticketIdMatch[1])) {
        pendingTicketResult = {
          success: true,
          ticketId: ticketIdMatch[1],
          resolved: true
        }
        console.log(`   [API] Ticket created: ${ticketIdMatch[1]}`)
      }
    }

    if (text.includes('Ticket submission failed')) {
      const errorMsg = text.replace(/.*Ticket submission failed:\s*/i, '').trim().slice(0, 40)
      pendingTicketResult = {
        success: false,
        error: errorMsg,
        resolved: true
      }
      console.log(`   [API] Error: ${errorMsg}`)
    }

    if (text.includes('User not authenticated') || text.includes('not authenticated')) {
      pendingTicketResult = {
        success: false,
        error: 'Not authenticated',
        resolved: true
      }
      console.log('   [API] Session lost')
    }
  })

  try {
    await page.goto(CONFIG.POS_URL)
    await delay(5000)

    if (!await login(page)) {
      console.error('Initial login failed, aborting')
      return
    }

    for (let i = 1; i <= CONFIG.TOTAL_TICKETS; i++) {
      const result = await createTicket(page, i)
      results.push(result)

      if (i % 5 === 0) {
        const successful = results.filter(r => r.success).length
        const elapsed = ((Date.now() - testStartTime) / 1000 / 60).toFixed(1)
        const rate = (successful / i * 100).toFixed(0)
        console.log(`\n${'─'.repeat(50)}`)
        console.log(`Progress: ${i}/${CONFIG.TOTAL_TICKETS} | OK: ${successful} (${rate}%) | ${elapsed} min`)
        console.log(`${'─'.repeat(50)}\n`)
      }

      if (i < CONFIG.TOTAL_TICKETS) {
        console.log(`   [Wait] ${CONFIG.INTERVAL_MS / 1000}s until next ticket...`)
        await delay(CONFIG.INTERVAL_MS)
      }
    }

  } catch (err: any) {
    console.error('Test error:', err.message)
  } finally {
    printSummary()
    await browser.close()
  }
}

main().catch(console.error)
