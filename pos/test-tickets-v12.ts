/**
 * Test script v12: NEVER FAIL - Persistent retry with diagnostics
 *
 * Strategy: A ticket MUST succeed. If all games are locked:
 * 1. Try all 4 games with game rotation
 * 2. If all fail, wait for a full race cycle (~3 min) and try again
 * 3. Repeat until success
 *
 * Also includes diagnostic logging to understand WHY rounds are locked
 */

import { chromium, Page } from 'playwright'
import * as fs from 'fs'

const CONFIG = {
  POS_URL: 'http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
  TOTAL_TICKETS: 50,
  INTERVAL_MS: 30000,
  MIN_COUNTDOWN_AFTER_GAME: 150,
  MAX_GAME_RETRIES: 4,        // Try all 4 games
  MAX_CYCLE_RETRIES: 10,      // Retry up to 10 full cycles (never give up)
  CYCLE_WAIT_MS: 180000,      // Wait 3 minutes between full cycle retries
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
  cycleRetries: number
  countdownAfterGame?: number
  diagnostics?: string[]
}

const results: TicketResult[] = []

let pendingTicketResult: {
  success: boolean
  ticketId?: string
  error?: string
  resolved: boolean
} = { success: false, resolved: false }

let sessionNeedsRelogin = false

const games = ['dos', 'dot', 'doe', 'hoc']

// Diagnostic log for current ticket
let currentDiagnostics: string[] = []

function log(msg: string): void {
  console.log(msg)
  currentDiagnostics.push(`${new Date().toISOString().substr(11, 8)} ${msg}`)
}

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
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'SEG' && lines[i + 1]) {
        const num = parseInt(lines[i + 1].trim())
        if (!isNaN(num) && num > 0 && num < 300) {
          return num
        }
      }
    }
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

async function forceLogin(page: Page): Promise<boolean> {
  try {
    log('   [Login] Full re-login...')
    await page.goto(CONFIG.POS_URL)
    await delay(5000)

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
      log('   [Login] Success')
      sessionNeedsRelogin = false
      return true
    }

    log('   [Login] Failed')
    return false
  } catch (error: any) {
    log(`   [Login] Error: ${error.message?.slice(0, 40)}`)
    return false
  }
}

async function ensureLoggedIn(page: Page): Promise<boolean> {
  if (sessionNeedsRelogin) {
    log('   [Session] Needs re-login due to prior auth failure')
    return await forceLogin(page)
  }
  if (await isLoggedIn(page)) return true
  log('   [Session] Lost, reconnecting...')
  return await forceLogin(page)
}

async function forceClick(page: Page, locator: any, name: string): Promise<boolean> {
  try {
    await locator.click({ force: true, timeout: 3000 })
    return true
  } catch {
    log(`   [${name}] Click failed`)
    return false
  }
}

async function getGameCountdown(page: Page, game: string): Promise<number> {
  const gameBtn = page.locator(`button:has(img[alt="${game}"])`).first()
  await forceClick(page, gameBtn, `Game ${game.toUpperCase()}`)
  await delay(1000)
  return await getCountdown(page)
}

async function findBestGame(page: Page): Promise<{ game: string; countdown: number } | null> {
  // Check all games and find the one with highest countdown
  let bestGame: string | null = null
  let bestCountdown = 0

  for (const game of games) {
    if (await isOverlayVisible(page)) {
      await waitForNoOverlay(page, 30000)
      await delay(2000)
    }

    const countdown = await getGameCountdown(page, game)
    log(`   [Scan] ${game.toUpperCase()}: ${countdown}s`)

    if (countdown > bestCountdown) {
      bestCountdown = countdown
      bestGame = game
    }
  }

  if (bestGame && bestCountdown >= CONFIG.MIN_COUNTDOWN_AFTER_GAME) {
    return { game: bestGame, countdown: bestCountdown }
  }

  return null
}

async function waitForAnyFreshRound(page: Page): Promise<{ game: string; countdown: number }> {
  // Keep scanning all games until we find one with fresh countdown
  for (let attempt = 0; attempt < 40; attempt++) { // ~3.3 minutes max wait
    const best = await findBestGame(page)
    if (best) {
      log(`   [Fresh] ${best.game.toUpperCase()} has ${best.countdown}s - selecting`)
      return best
    }

    // Get the highest countdown we found to estimate wait time
    let maxFound = 0
    for (const game of games) {
      const cd = await getGameCountdown(page, game)
      if (cd > maxFound) maxFound = cd
    }

    if (maxFound > 0 && maxFound < CONFIG.MIN_COUNTDOWN_AFTER_GAME) {
      const waitTime = (CONFIG.MIN_COUNTDOWN_AFTER_GAME - maxFound + 10) * 1000
      log(`   [Wait] Best countdown is ${maxFound}s, waiting ~${Math.round(waitTime/1000)}s for fresh round...`)
      await delay(Math.min(waitTime, 30000))
    } else {
      log(`   [Wait] No valid countdown found, waiting 5s...`)
      await delay(5000)
    }
  }

  throw new Error('Timeout waiting for fresh round')
}

async function tryCreateTicket(
  page: Page,
  game: string,
  runner: number,
  amount: number
): Promise<{ success: boolean; ticketId?: string; error?: string; countdown: number }> {

  // Select game
  const gameBtn = page.locator(`button:has(img[alt="${game}"])`).first()
  await forceClick(page, gameBtn, `Game ${game.toUpperCase()}`)
  await delay(500)

  const countdown = await getCountdown(page)

  // Select runner
  const runnerBtn = page.locator(`button:has(img[alt="${runner}"])`).first()
  if (!await forceClick(page, runnerBtn, `Runner ${runner}`)) {
    return { success: false, error: 'Could not select runner', countdown }
  }
  await delay(300)

  // Select amount
  const amountBtn = page.locator(`button:has(img[alt="$${amount}"])`).first()
  if (!await forceClick(page, amountBtn, `Amount $${amount}`)) {
    return { success: false, error: 'Could not select amount', countdown }
  }
  await delay(300)

  // Submit
  resetPendingResult()
  const imprimirBtn = page.getByRole('button', { name: 'Imprimir' })
  if (!await forceClick(page, imprimirBtn, 'Imprimir')) {
    return { success: false, error: 'Could not click Imprimir', countdown }
  }

  log(`   [Submit] ${game.toUpperCase()} R${runner} $${amount} (countdown: ${countdown}s)`)

  // Wait for response
  const maxWaitMs = 10000
  const waitStart = Date.now()
  while (Date.now() - waitStart < maxWaitMs) {
    if (pendingTicketResult.resolved) break
    await delay(250)
  }

  if (pendingTicketResult.resolved) {
    if (pendingTicketResult.success && isValidTicketId(pendingTicketResult.ticketId)) {
      return { success: true, ticketId: pendingTicketResult.ticketId, countdown }
    } else if (pendingTicketResult.error) {
      return { success: false, error: pendingTicketResult.error, countdown }
    }
  }

  return { success: false, error: 'No server response', countdown }
}

async function createTicketWithRetry(
  page: Page,
  attempt: number
): Promise<TicketResult> {
  const startTime = Date.now()
  const baseGameIndex = (attempt - 1) % games.length
  const runner = ((attempt - 1) % 5) + 1
  const amounts = [25, 50, 100]
  const amount = amounts[(attempt - 1) % amounts.length]

  currentDiagnostics = []

  const result: TicketResult = {
    attempt,
    timestamp: new Date().toISOString(),
    game: games[baseGameIndex],
    runner,
    amount,
    success: false,
    duration: 0,
    retries: 0,
    cycleRetries: 0,
  }

  log(`\n#${attempt}: Target ${games[baseGameIndex].toUpperCase()} R${runner} $${amount}`)

  // Ensure logged in
  if (!await ensureLoggedIn(page)) {
    result.error = 'Login failed'
    result.duration = Date.now() - startTime
    result.diagnostics = currentDiagnostics
    return result
  }

  // Click JUGADA tab
  await page.getByRole('button', { name: 'JUGADA' }).click().catch(() => {})
  await delay(300)

  // Cycle retry loop - NEVER GIVE UP
  for (let cycleRetry = 0; cycleRetry < CONFIG.MAX_CYCLE_RETRIES; cycleRetry++) {
    result.cycleRetries = cycleRetry

    if (cycleRetry > 0) {
      log(`   [Cycle ${cycleRetry}] Waiting ${CONFIG.CYCLE_WAIT_MS/1000}s for new race cycle...`)
      await delay(CONFIG.CYCLE_WAIT_MS)

      // Re-ensure logged in after long wait
      if (!await ensureLoggedIn(page)) {
        continue
      }
      await page.getByRole('button', { name: 'JUGADA' }).click().catch(() => {})
      await delay(300)
    }

    // Try each game in rotation
    for (let gameRetry = 0; gameRetry < CONFIG.MAX_GAME_RETRIES; gameRetry++) {
      result.retries = cycleRetry * CONFIG.MAX_GAME_RETRIES + gameRetry

      const gameIndex = (baseGameIndex + gameRetry) % games.length
      const game = games[gameIndex]

      // Wait for overlay if present
      if (await isOverlayVisible(page)) {
        log('   [Wait] Race active, waiting...')
        await waitForNoOverlay(page, 60000)
        await delay(3000)
      }

      // Check countdown for this game
      const countdown = await getGameCountdown(page, game)

      if (countdown < CONFIG.MIN_COUNTDOWN_AFTER_GAME) {
        log(`   [Skip] ${game.toUpperCase()} countdown ${countdown}s < ${CONFIG.MIN_COUNTDOWN_AFTER_GAME}s`)
        continue
      }

      log(`   [Try] ${game.toUpperCase()} countdown ${countdown}s >= ${CONFIG.MIN_COUNTDOWN_AFTER_GAME}s`)

      const tryResult = await tryCreateTicket(page, game, runner, amount)
      result.countdownAfterGame = tryResult.countdown

      if (tryResult.success) {
        result.success = true
        result.ticketId = tryResult.ticketId
        result.game = game
        result.duration = Date.now() - startTime
        result.diagnostics = currentDiagnostics
        log(`   ✓ OK - ID: ${result.ticketId} (${result.duration}ms)`)
        return result
      }

      // Handle specific errors
      if (tryResult.error?.includes('Not authenticated')) {
        log('   [Auth] Session lost, forcing re-login...')
        sessionNeedsRelogin = true
        await forceLogin(page)
        await page.getByRole('button', { name: 'JUGADA' }).click().catch(() => {})
        await delay(300)
        gameRetry-- // Retry same game
        continue
      }

      if (tryResult.error?.includes('not open')) {
        log(`   [Locked] ${game.toUpperCase()} round locked despite ${countdown}s countdown`)
        // Try next game
        continue
      }

      log(`   [Error] ${tryResult.error}`)
    }

    log(`   [Cycle ${cycleRetry}] All games exhausted, will retry after waiting...`)
  }

  // If we get here, we've exhausted all retries (should never happen with MAX_CYCLE_RETRIES=10)
  result.error = 'Exhausted all retries'
  result.duration = Date.now() - startTime
  result.diagnostics = currentDiagnostics
  log(`   ✗ FAIL: ${result.error}`)
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

  // Retry statistics
  const totalRetries = results.reduce((sum, r) => sum + r.retries, 0)
  const totalCycleRetries = results.reduce((sum, r) => sum + r.cycleRetries, 0)
  console.log(`\nRetry stats: ${totalRetries} game retries, ${totalCycleRetries} cycle retries`)

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
    successfulTickets.slice(0, 20).forEach(t => {
      console.log(`   #${t.attempt} ${t.game.toUpperCase()} R${t.runner} $${t.amount} -> ID: ${t.ticketId}`)
    })
    if (successfulTickets.length > 20) {
      console.log(`   ... and ${successfulTickets.length - 20} more`)
    }
  }

  console.log('='.repeat(60))

  if (!fs.existsSync('test-results')) fs.mkdirSync('test-results')
  fs.writeFileSync('test-results/results-v12.json', JSON.stringify(results, null, 2))
  console.log('\nResults saved to test-results/results-v12.json')
}

async function main() {
  const testStartTime = Date.now()

  console.log('='.repeat(60))
  console.log('TICKET TEST v12 - NEVER FAIL (Persistent Retry)')
  console.log('='.repeat(60))
  console.log(`Target: ${CONFIG.TOTAL_TICKETS} tickets`)
  console.log(`Min countdown: ${CONFIG.MIN_COUNTDOWN_AFTER_GAME}s`)
  console.log(`Max game retries: ${CONFIG.MAX_GAME_RETRIES}`)
  console.log(`Max cycle retries: ${CONFIG.MAX_CYCLE_RETRIES}`)
  console.log(`Cycle wait: ${CONFIG.CYCLE_WAIT_MS / 1000}s`)
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
        log(`   [API] Ticket created: ${ticketIdMatch[1]}`)
      }
    }

    if (text.includes('Ticket submission failed')) {
      const errorMsg = text.replace(/.*Ticket submission failed:\s*/i, '').trim().slice(0, 40)
      pendingTicketResult = {
        success: false,
        error: errorMsg,
        resolved: true
      }
      log(`   [API] Error: ${errorMsg}`)
    }

    if (text.includes('User not authenticated') || text.includes('not authenticated')) {
      pendingTicketResult = {
        success: false,
        error: 'Not authenticated',
        resolved: true
      }
      sessionNeedsRelogin = true
      log('   [API] Session lost - will re-login')
    }
  })

  try {
    await page.goto(CONFIG.POS_URL)
    await delay(5000)

    if (!await forceLogin(page)) {
      console.error('Initial login failed, aborting')
      return
    }

    for (let i = 1; i <= CONFIG.TOTAL_TICKETS; i++) {
      const result = await createTicketWithRetry(page, i)
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
        log(`   [Wait] ${CONFIG.INTERVAL_MS / 1000}s until next ticket...`)
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
