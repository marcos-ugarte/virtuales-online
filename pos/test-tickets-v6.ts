/**
 * Test script v6: Robust ticket creation with CORRECT success detection
 *
 * Key fix: Detect success via console logs from the actual API response,
 * not by checking UI text which can have false positives.
 *
 * Success = console shows "[handlePrint] Result:" with valid ticketId (4+ hex chars)
 * Failure = console shows "Ticket submission failed:" or no valid response
 */

import { chromium, Page } from 'playwright'
import * as fs from 'fs'

const CONFIG = {
  POS_URL: 'http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
  TOTAL_TICKETS: 20,
  INTERVAL_MS: 45000, // 45 seconds between tickets
  MIN_COUNTDOWN: 40,  // Don't bet if countdown < 40 seconds
  MAX_RETRIES: 2,
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
}

const results: TicketResult[] = []

// Global state for console-based detection
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
  // Valid ticket IDs are 4+ hex characters
  return /^[a-f0-9]{4,}$/i.test(id)
}

async function getCountdown(page: Page): Promise<number> {
  try {
    // Look for the main countdown display (SEG followed by number)
    const text = await page.locator('body').innerText()
    const match = text.match(/SEG["\s]*(\d+)/i)
    if (match) {
      return parseInt(match[1], 10)
    }
  } catch {}
  return 999
}

async function isOverlayVisible(page: Page): Promise<boolean> {
  return await page.locator('text=CARRERA ACTIVA').isVisible().catch(() => false)
}

async function waitForNoOverlay(page: Page, maxWait: number = 45000): Promise<boolean> {
  const startTime = Date.now()
  while (Date.now() - startTime < maxWait) {
    if (!await isOverlayVisible(page)) return true
    await delay(3000)
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
    await delay(300)
    await page.getByRole('textbox', { name: 'CONTRASENA' }).fill(CONFIG.PIN)
    await delay(300)

    await page.locator('div').filter({ hasText: /^ACCESO$/ }).last().click()
    await delay(6000)

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
        await delay(500)
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

async function waitForCountdownSafe(page: Page): Promise<boolean> {
  // Wait until countdown is safe (> MIN_COUNTDOWN)
  for (let i = 0; i < 10; i++) {
    const countdown = await getCountdown(page)
    if (countdown >= CONFIG.MIN_COUNTDOWN) return true

    console.log(`   [Wait] Countdown ${countdown}s < ${CONFIG.MIN_COUNTDOWN}s, waiting...`)

    // If countdown is very low, wait for next round
    if (countdown < 15) {
      await delay(countdown * 1000 + 5000) // Wait for round to end + buffer
      await waitForNoOverlay(page, 45000)
    } else {
      await delay(5000)
    }
  }
  return false
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

  // Reset console detection state
  resetPendingResult()

  try {
    console.log(`\n#${attempt}: ${game.toUpperCase()} R${runner} $${amount}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`)

    // 1. Ensure logged in
    if (!await ensureLoggedIn(page)) {
      result.error = 'Login failed'
      result.duration = Date.now() - startTime
      return result
    }

    // 2. Wait for overlay to clear
    if (await isOverlayVisible(page)) {
      console.log('   [Wait] Race active, waiting...')
      if (!await waitForNoOverlay(page)) {
        result.error = 'Overlay timeout'
        result.duration = Date.now() - startTime
        return result
      }
      await delay(2000)
    }

    // 3. Wait for safe countdown
    if (!await waitForCountdownSafe(page)) {
      result.error = 'Countdown unsafe'
      result.duration = Date.now() - startTime
      return result
    }

    // 4. Click JUGADA tab
    await page.getByRole('button', { name: 'JUGADA' }).click().catch(() => {})
    await delay(500)

    // 5. Select game
    const gameBtn = page.locator(`button:has(img[alt="${game}"])`).first()
    await gameBtn.click({ timeout: 5000 })
    await delay(2000)

    // 6. Check for overlay after game selection
    if (await isOverlayVisible(page)) {
      console.log('   [Wait] Race started after game select...')
      await waitForNoOverlay(page, 45000)
      await delay(2000)
    }

    // 7. Re-check countdown
    const countdown = await getCountdown(page)
    if (countdown < 20) {
      console.log(`   [Skip] Countdown too low (${countdown}s)`)
      result.error = 'Countdown too low after setup'
      result.duration = Date.now() - startTime
      // Retry with fresh round
      if (retryCount < CONFIG.MAX_RETRIES) {
        await delay(countdown * 1000 + 10000)
        return createTicket(page, attempt, retryCount + 1)
      }
      return result
    }

    // 8. Select runner (with overlay check)
    if (await isOverlayVisible(page)) {
      await waitForNoOverlay(page, 40000)
      await delay(1000)
    }
    const runnerBtn = page.locator(`button:has(img[alt="${runner}"])`).first()
    await runnerBtn.click({ timeout: 5000 })
    await delay(500)

    // 9. Select amount (with overlay check)
    if (await isOverlayVisible(page)) {
      await waitForNoOverlay(page, 40000)
      await delay(1000)
    }
    const amountBtn = page.locator(`button:has(img[alt="$${amount}"])`).first()
    await amountBtn.click({ timeout: 5000 })
    await delay(500)

    // 10. Final countdown check before submit
    const finalCountdown = await getCountdown(page)
    if (finalCountdown < 10) {
      console.log(`   [Abort] Countdown critical (${finalCountdown}s)`)
      result.error = 'Countdown critical before submit'
      result.duration = Date.now() - startTime
      return result
    }

    // 11. Click Imprimir (with overlay check)
    if (await isOverlayVisible(page)) {
      await waitForNoOverlay(page, 40000)
      await delay(1000)
    }

    // Reset detection state just before clicking
    resetPendingResult()

    const imprimirBtn = page.getByRole('button', { name: 'Imprimir' })
    await imprimirBtn.click({ timeout: 5000 })

    // 12. Wait for console response (the REAL detection)
    console.log('   [Submit] Waiting for server response...')
    const maxWaitMs = 8000
    const waitStart = Date.now()

    while (Date.now() - waitStart < maxWaitMs) {
      if (pendingTicketResult.resolved) break
      await delay(300)
    }

    // 13. Process result from console detection
    if (pendingTicketResult.resolved) {
      if (pendingTicketResult.success && isValidTicketId(pendingTicketResult.ticketId)) {
        result.success = true
        result.ticketId = pendingTicketResult.ticketId
      } else if (pendingTicketResult.error) {
        result.error = pendingTicketResult.error
      } else {
        result.error = 'Invalid response'
      }
    } else {
      result.error = 'No server response'
    }

    await delay(2000)

  } catch (error: any) {
    result.error = error.message?.slice(0, 50) || 'Unknown error'
  }

  result.duration = Date.now() - startTime

  // Log result
  if (result.success) {
    console.log(`   ✅ OK - ID: ${result.ticketId} (${result.duration}ms)`)
  } else {
    console.log(`   ❌ FAIL: ${result.error} (${result.duration}ms)`)

    // Retry on certain errors
    if (retryCount < CONFIG.MAX_RETRIES) {
      const retryableErrors = ['No server response', 'Overlay', 'Countdown', 'timeout']
      if (retryableErrors.some(e => result.error?.includes(e))) {
        console.log('   [Retry] Attempting again...')
        await delay(5000)
        return createTicket(page, attempt, retryCount + 1)
      }
    }
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

  console.log(`\nTotal: ${total} | ✅ OK: ${successful} (${rate}%) | ❌ Failed: ${failed}`)

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

  // List successful tickets
  const successfulTickets = results.filter(r => r.success)
  if (successfulTickets.length > 0) {
    console.log('\nSuccessful tickets:')
    successfulTickets.forEach(t => {
      console.log(`   #${t.attempt} ${t.game.toUpperCase()} R${t.runner} $${t.amount} -> ID: ${t.ticketId}`)
    })
  }

  console.log('='.repeat(60))

  // Save results
  if (!fs.existsSync('test-results')) fs.mkdirSync('test-results')
  fs.writeFileSync('test-results/results-v6.json', JSON.stringify(results, null, 2))
  console.log('\nResults saved to test-results/results-v6.json')
}

async function main() {
  const testStartTime = Date.now()

  console.log('='.repeat(60))
  console.log('TICKET TEST v6 - Correct Detection')
  console.log('='.repeat(60))
  console.log(`Target: ${CONFIG.TOTAL_TICKETS} tickets`)
  console.log(`Interval: ${CONFIG.INTERVAL_MS / 1000}s`)
  console.log(`Min countdown: ${CONFIG.MIN_COUNTDOWN}s`)
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

  // CRITICAL: Console listener for REAL success/failure detection
  page.on('console', msg => {
    const text = msg.text()

    // Detect successful ticket creation
    // Format: [handlePrint] Result: {msgType: sendTicket, ..., ticketId: xxxx, ...}
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

    // Detect ticket submission failure
    // Format: Ticket submission failed: <error message>
    if (text.includes('Ticket submission failed')) {
      const errorMsg = text.replace(/.*Ticket submission failed:\s*/i, '').trim().slice(0, 40)
      pendingTicketResult = {
        success: false,
        error: errorMsg,
        resolved: true
      }
      console.log(`   [API] Error: ${errorMsg}`)
    }

    // Detect authentication errors
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

      // Progress report every 5 tickets
      if (i % 5 === 0) {
        const successful = results.filter(r => r.success).length
        const elapsed = ((Date.now() - testStartTime) / 1000 / 60).toFixed(1)
        const rate = (successful / i * 100).toFixed(0)
        console.log(`\n${'─'.repeat(50)}`)
        console.log(`Progress: ${i}/${CONFIG.TOTAL_TICKETS} | ✅ ${successful} (${rate}%) | ⏱️ ${elapsed} min`)
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
