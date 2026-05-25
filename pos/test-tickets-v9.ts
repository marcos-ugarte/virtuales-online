/**
 * Test script v9: Fixed countdown detection
 *
 * Key fixes:
 * - Better countdown regex (SEG followed by newline then number)
 * - Log the actual countdown value for debugging
 * - Proper wait for safe betting window
 * - Skip if countdown shows round is closed
 */

import { chromium, Page } from 'playwright'
import * as fs from 'fs'

const CONFIG = {
  POS_URL: 'http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
  TOTAL_TICKETS: 20,
  INTERVAL_MS: 50000, // 50 seconds between tickets
  MIN_COUNTDOWN: 40,  // Need at least 40s to complete all steps
  ABORT_COUNTDOWN: 12, // Abort if countdown drops below this
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
  countdownAtStart?: number
}

const results: TicketResult[] = []

let pendingTicketResult: {
  success: boolean
  ticketId?: string
  error?: string
  resolved: boolean
} = { success: false, resolved: false }

// Use all 4 games
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

    // The countdown is displayed as "SEG\n62" or "SEG 62"
    // Try multiple patterns

    // Pattern 1: SEG followed by newline then number
    let match = text.match(/SEG[\s\n]+(\d{1,3})\b/i)
    if (match && parseInt(match[1]) < 200) {
      return parseInt(match[1], 10)
    }

    // Pattern 2: Look for the main countdown (first SEG occurrence with reasonable number)
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'SEG' && lines[i + 1]) {
        const num = parseInt(lines[i + 1].trim())
        if (!isNaN(num) && num > 0 && num < 200) {
          return num
        }
      }
    }

    // Pattern 3: SEG followed by space and number on same line
    match = text.match(/SEG\s+(\d{1,3})/i)
    if (match && parseInt(match[1]) < 200) {
      return parseInt(match[1], 10)
    }

  } catch (e) {
    console.log(`   [Countdown] Error reading: ${(e as Error).message?.slice(0, 30)}`)
  }
  return -1 // Return -1 if cannot read (not 999)
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
  } catch (error: any) {
    console.log(`   [${name}] Click failed`)
    return false
  }
}

async function waitForSafeCountdown(page: Page): Promise<number> {
  for (let i = 0; i < 30; i++) {
    // First check for overlay
    if (await isOverlayVisible(page)) {
      console.log('   [Wait] Race active (overlay)...')
      await waitForNoOverlay(page, 60000)
      await delay(3000)
      continue
    }

    const countdown = await getCountdown(page)

    // If countdown couldn't be read, wait and retry
    if (countdown < 0) {
      console.log('   [Wait] Cannot read countdown, waiting...')
      await delay(3000)
      continue
    }

    if (countdown >= CONFIG.MIN_COUNTDOWN) {
      return countdown
    }

    // If countdown is very low, wait for next round
    if (countdown < 10) {
      console.log(`   [Wait] Round ending (${countdown}s), waiting for next...`)
      await delay(countdown * 1000 + 5000)
      await waitForNoOverlay(page, 60000)
      await delay(3000)
    } else {
      console.log(`   [Wait] Countdown ${countdown}s < ${CONFIG.MIN_COUNTDOWN}s...`)
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

    // 2. Wait for safe countdown
    const safeCountdown = await waitForSafeCountdown(page)
    if (safeCountdown === 0) {
      result.error = 'Countdown timeout'
      result.duration = Date.now() - startTime
      return result
    }
    result.countdownAtStart = safeCountdown
    console.log(`   [Ready] Countdown: ${safeCountdown}s`)

    // 3. Click JUGADA tab
    await page.getByRole('button', { name: 'JUGADA' }).click().catch(() => {})
    await delay(300)

    // 4. Select game
    const gameBtn = page.locator(`button:has(img[alt="${game}"])`).first()
    if (!await forceClick(page, gameBtn, `Game ${game.toUpperCase()}`)) {
      result.error = `Could not select game`
      result.duration = Date.now() - startTime
      if (retryCount < CONFIG.MAX_RETRIES) {
        await delay(3000)
        return createTicket(page, attempt, retryCount + 1)
      }
      return result
    }
    await delay(800)

    // 5. Check countdown after game selection
    let currentCountdown = await getCountdown(page)
    console.log(`   [Check] Countdown after game: ${currentCountdown}s`)
    if (currentCountdown > 0 && currentCountdown < CONFIG.ABORT_COUNTDOWN) {
      console.log(`   [Abort] Countdown too low (${currentCountdown}s)`)
      result.error = `Countdown dropped to ${currentCountdown}s`
      result.duration = Date.now() - startTime
      if (retryCount < CONFIG.MAX_RETRIES) {
        await delay(currentCountdown * 1000 + 8000)
        return createTicket(page, attempt, retryCount + 1)
      }
      return result
    }

    // 6. Check for overlay after game selection
    if (await isOverlayVisible(page)) {
      console.log('   [Wait] Race started after game select...')
      await waitForNoOverlay(page, 60000)
      await delay(2000)

      // After waiting, re-check countdown
      currentCountdown = await getCountdown(page)
      console.log(`   [Check] Countdown after overlay: ${currentCountdown}s`)
      if (currentCountdown > 0 && currentCountdown < CONFIG.MIN_COUNTDOWN) {
        console.log(`   [Wait] Still low, waiting more...`)
        await waitForSafeCountdown(page)
      }
    }

    // 7. Select runner
    const runnerBtn = page.locator(`button:has(img[alt="${runner}"])`).first()
    if (!await forceClick(page, runnerBtn, `Runner ${runner}`)) {
      result.error = `Could not select runner`
      result.duration = Date.now() - startTime
      return result
    }
    await delay(300)

    // 8. Check countdown after runner
    currentCountdown = await getCountdown(page)
    console.log(`   [Check] Countdown after runner: ${currentCountdown}s`)
    if (currentCountdown > 0 && currentCountdown < CONFIG.ABORT_COUNTDOWN) {
      console.log(`   [Abort] Countdown too low`)
      result.error = `Countdown dropped to ${currentCountdown}s`
      result.duration = Date.now() - startTime
      return result
    }

    // 9. Select amount
    const amountBtn = page.locator(`button:has(img[alt="$${amount}"])`).first()
    if (!await forceClick(page, amountBtn, `Amount $${amount}`)) {
      result.error = `Could not select amount`
      result.duration = Date.now() - startTime
      return result
    }
    await delay(300)

    // 10. Final countdown check before submit
    currentCountdown = await getCountdown(page)
    console.log(`   [Check] Countdown before submit: ${currentCountdown}s`)
    if (currentCountdown > 0 && currentCountdown < CONFIG.ABORT_COUNTDOWN) {
      console.log(`   [Abort] Countdown critical`)
      result.error = `Countdown critical at ${currentCountdown}s`
      result.duration = Date.now() - startTime
      return result
    }

    // 11. Click Imprimir
    resetPendingResult()
    const imprimirBtn = page.getByRole('button', { name: 'Imprimir' })
    if (!await forceClick(page, imprimirBtn, 'Imprimir')) {
      result.error = 'Could not click Imprimir'
      result.duration = Date.now() - startTime
      return result
    }

    // 12. Wait for console response
    console.log('   [Submit] Waiting for response...')
    const maxWaitMs = 10000
    const waitStart = Date.now()

    while (Date.now() - waitStart < maxWaitMs) {
      if (pendingTicketResult.resolved) break
      await delay(250)
    }

    // 13. Process result
    if (pendingTicketResult.resolved) {
      if (pendingTicketResult.success && isValidTicketId(pendingTicketResult.ticketId)) {
        result.success = true
        result.ticketId = pendingTicketResult.ticketId
      } else if (pendingTicketResult.error) {
        result.error = pendingTicketResult.error

        // Log the countdown when we get "not open" error
        if (result.error.includes('not open')) {
          const finalCountdown = await getCountdown(page)
          console.log(`   [Debug] Countdown at error: ${finalCountdown}s, overlay: ${await isOverlayVisible(page)}`)

          // Retry
          if (retryCount < CONFIG.MAX_RETRIES) {
            console.log('   [Retry] Round closed, waiting for next...')
            await delay(10000)
            return createTicket(page, attempt, retryCount + 1)
          }
        }
      } else {
        result.error = 'Invalid response'
      }
    } else {
      result.error = 'No server response'
      if (retryCount < CONFIG.MAX_RETRIES) {
        console.log('   [Retry] No response, trying again...')
        await delay(5000)
        return createTicket(page, attempt, retryCount + 1)
      }
    }

    await delay(1000)

  } catch (error: any) {
    result.error = error.message?.slice(0, 50) || 'Unknown error'
  }

  result.duration = Date.now() - startTime

  if (result.success) {
    console.log(`   OK - ID: ${result.ticketId} (${result.duration}ms)`)
  } else {
    console.log(`   FAIL: ${result.error} (${result.duration}ms)`)
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
      console.log(`   #${t.attempt} ${t.game.toUpperCase()} R${t.runner} $${t.amount} -> ID: ${t.ticketId} (start: ${t.countdownAtStart}s)`)
    })
  }

  // Failed tickets with countdown info
  const failedTickets = results.filter(r => !r.success)
  if (failedTickets.length > 0) {
    console.log('\nFailed tickets:')
    failedTickets.forEach(t => {
      console.log(`   #${t.attempt} ${t.game.toUpperCase()} R${t.runner} $${t.amount} -> ${t.error} (start: ${t.countdownAtStart}s)`)
    })
  }

  console.log('='.repeat(60))

  if (!fs.existsSync('test-results')) fs.mkdirSync('test-results')
  fs.writeFileSync('test-results/results-v9.json', JSON.stringify(results, null, 2))
  console.log('\nResults saved to test-results/results-v9.json')
}

async function main() {
  const testStartTime = Date.now()

  console.log('='.repeat(60))
  console.log('TICKET TEST v9 - Fixed Countdown Detection')
  console.log('='.repeat(60))
  console.log(`Target: ${CONFIG.TOTAL_TICKETS} tickets`)
  console.log(`Interval: ${CONFIG.INTERVAL_MS / 1000}s`)
  console.log(`Min countdown: ${CONFIG.MIN_COUNTDOWN}s`)
  console.log(`Abort countdown: ${CONFIG.ABORT_COUNTDOWN}s`)
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

  // Console listener for success/failure detection
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
