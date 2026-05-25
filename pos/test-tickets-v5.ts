/**
 * Test script v5: Robust ticket creation with 100% target
 * - Auto-reconnection on session loss
 * - Countdown verification before betting
 * - Better overlay handling with retries
 * - Screenshots on failures for debugging
 */

import { chromium, Page, Browser, BrowserContext } from 'playwright'
import * as fs from 'fs'

const CONFIG = {
  POS_URL: 'http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
  TOTAL_TICKETS: 20,
  INTERVAL_MS: 40000, // 40 seconds between tickets
  MIN_COUNTDOWN: 30, // Don't bet if countdown < 30 seconds
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
  screenshot?: string
}

const results: TicketResult[] = []
let lastTicketSuccess = false
let lastTicketId: string | undefined
let lastTicketError: string | undefined

const games = ['dos', 'dot', 'doe', 'hoc']

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getCountdown(page: Page): Promise<number> {
  try {
    // Look for the SEG countdown display
    const segText = await page.locator('text=SEG').first().locator('..').locator('div').last().innerText()
    const countdown = parseInt(segText.replace(/"/g, ''), 10)
    return isNaN(countdown) ? 999 : countdown
  } catch {
    return 999 // Assume high if can't read
  }
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

    // Check if already logged in
    if (await isLoggedIn(page)) {
      console.log('   [Login] Already logged in')
      await dismissModal(page)
      return true
    }

    // Wait for connection (not "Conectando")
    await page.waitForFunction(() => {
      const text = document.body.innerText || ''
      return !text.includes('Conectando')
    }, { timeout: 30000 })
    await delay(2000)

    // Fill credentials
    await page.getByRole('textbox', { name: 'ID DE OPERADOR' }).fill(CONFIG.OPERATOR_ID)
    await delay(300)
    await page.getByRole('textbox', { name: 'CONTRASENA' }).fill(CONFIG.PIN)
    await delay(300)

    // Click login
    await page.locator('div').filter({ hasText: /^ACCESO$/ }).last().click()
    await delay(6000)

    // Dismiss printer modal
    await dismissModal(page)

    // Verify
    if (await isLoggedIn(page)) {
      console.log('   [Login] Success')
      return true
    }

    console.log('   [Login] Failed')
    return false
  } catch (error: any) {
    console.log(`   [Login] Error: ${error.message}`)
    return false
  }
}

async function dismissModal(page: Page): Promise<void> {
  try {
    for (let i = 0; i < 3; i++) {
      const okBtn = page.getByRole('button', { name: 'OK' })
      if (await okBtn.isVisible().catch(() => false)) {
        await okBtn.click()
        await delay(500)
      }
    }
  } catch {}
}

async function ensureLoggedIn(page: Page): Promise<boolean> {
  if (await isLoggedIn(page)) return true

  console.log('   [Session] Lost, reconnecting...')
  await page.goto(CONFIG.POS_URL)
  await delay(5000)
  return await login(page)
}

async function selectGame(page: Page, game: string): Promise<boolean> {
  try {
    // Click JUGADA tab first
    await page.getByRole('button', { name: 'JUGADA' }).click().catch(() => {})
    await delay(500)

    // Select game
    const gameBtn = page.locator(`button:has(img[alt="${game}"])`).first()
    await gameBtn.click({ timeout: 5000 })
    await delay(2000) // Wait for game to load

    // IMPORTANT: Wait for overlay to clear AFTER game selection
    // Game change often triggers race animation overlay
    if (await isOverlayVisible(page)) {
      console.log('   [Game] Overlay appeared, waiting...')
      await waitForNoOverlay(page, 45000)
      await delay(2000) // Extra wait after overlay clears
    }

    return true
  } catch {
    return false
  }
}

async function selectRunner(page: Page, runner: number): Promise<boolean> {
  try {
    // Double-check no overlay before clicking
    if (await isOverlayVisible(page)) {
      console.log('   [Runner] Overlay blocking, waiting...')
      await waitForNoOverlay(page, 40000)
      await delay(1000)
    }

    // Find the runner button
    const runnerBtn = page.locator(`button:has(img[alt="${runner}"])`).first()
    await runnerBtn.click({ timeout: 5000, force: true }) // force to bypass any remaining overlay
    await delay(500)
    return true
  } catch (e: any) {
    console.log(`   [Runner] Click failed: ${e.message?.slice(0, 30)}`)
    return false
  }
}

async function selectAmount(page: Page, amount: number): Promise<boolean> {
  try {
    // Check for overlay before clicking
    if (await isOverlayVisible(page)) {
      console.log('   [Amount] Overlay blocking, waiting...')
      await waitForNoOverlay(page, 40000)
      await delay(1000)
    }

    const amountBtn = page.locator(`button:has(img[alt="$${amount}"])`).first()
    await amountBtn.click({ timeout: 5000, force: true })
    await delay(500)
    return true
  } catch (e: any) {
    console.log(`   [Amount] Click failed: ${e.message?.slice(0, 30)}`)
    return false
  }
}

async function clickImprimir(page: Page): Promise<boolean> {
  try {
    // Check for overlay before clicking
    if (await isOverlayVisible(page)) {
      console.log('   [Imprimir] Overlay blocking, waiting...')
      await waitForNoOverlay(page, 40000)
      await delay(1000)
    }

    const btn = page.getByRole('button', { name: 'Imprimir' })
    await btn.click({ timeout: 5000, force: true })
    return true
  } catch (e: any) {
    console.log(`   [Imprimir] Click failed: ${e.message?.slice(0, 30)}`)
    return false
  }
}

async function waitForTicketResult(page: Page, timeout: number = 6000): Promise<void> {
  const startTime = Date.now()
  lastTicketSuccess = false
  lastTicketId = undefined
  lastTicketError = undefined

  while (Date.now() - startTime < timeout) {
    // Check for success toast
    const successVisible = await page.locator('text=TICKET CREADO').isVisible().catch(() => false)
    if (successVisible) {
      lastTicketSuccess = true
      // Try to get ticket ID
      const idText = await page.locator('text=ID:').first().locator('..').innerText().catch(() => '')
      const match = idText.match(/ID:\s*"?([a-f0-9]+)"?/i)
      if (match) lastTicketId = match[1]
      return
    }

    // Check for error in page
    const pageText = await page.locator('body').innerText().catch(() => '')
    if (pageText.toLowerCase().includes('not open for betting')) {
      lastTicketError = 'GameRound not open'
      return
    }
    if (pageText.toLowerCase().includes('not found')) {
      lastTicketError = 'GameRound not found'
      return
    }
    if (pageText.toLowerCase().includes('not authenticated')) {
      lastTicketError = 'Session lost'
      return
    }

    await delay(500)
  }

  // If no result found, check one more time
  const finalText = await page.locator('body').innerText().catch(() => '')
  if (finalText.includes('TICKET CREADO')) {
    lastTicketSuccess = true
  }
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

  try {
    console.log(`\n#${attempt}: ${game.toUpperCase()} R${runner} $${amount}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`)

    // 1. Ensure logged in
    if (!await ensureLoggedIn(page)) {
      result.error = 'Could not login'
      result.duration = Date.now() - startTime
      return result
    }

    // 2. Wait for overlay to clear
    if (await isOverlayVisible(page)) {
      console.log('   Waiting for race to finish...')
      if (!await waitForNoOverlay(page)) {
        result.error = 'Overlay timeout'
        result.duration = Date.now() - startTime
        await page.screenshot({ path: `test-results/fail-${attempt}-overlay.png` })
        result.screenshot = `fail-${attempt}-overlay.png`
        return result
      }
    }

    // 3. Check countdown - don't bet if too low
    const countdown = await getCountdown(page)
    if (countdown < CONFIG.MIN_COUNTDOWN) {
      console.log(`   Countdown too low (${countdown}s), waiting for next round...`)
      await delay((countdown + 5) * 1000) // Wait for round to end + buffer
      await waitForNoOverlay(page, 40000)
    }

    // 4. Select game
    if (!await selectGame(page, game)) {
      result.error = 'Could not select game'
      result.duration = Date.now() - startTime
      await page.screenshot({ path: `test-results/fail-${attempt}-game.png` })
      result.screenshot = `fail-${attempt}-game.png`
      return result
    }

    // 5. Wait for overlay again (game change may trigger race view)
    if (await isOverlayVisible(page)) {
      console.log('   Race started after game change, waiting...')
      await waitForNoOverlay(page)
    }

    // 6. Re-check countdown after game selection
    const countdown2 = await getCountdown(page)
    if (countdown2 < CONFIG.MIN_COUNTDOWN) {
      console.log(`   Countdown low after game select (${countdown2}s), waiting...`)
      await delay((countdown2 + 5) * 1000)
      await waitForNoOverlay(page, 40000)
    }

    // 7. Select runner
    if (!await selectRunner(page, runner)) {
      result.error = 'Could not select runner'
      result.duration = Date.now() - startTime
      await page.screenshot({ path: `test-results/fail-${attempt}-runner.png` })
      result.screenshot = `fail-${attempt}-runner.png`
      return result
    }

    // 8. Select amount
    if (!await selectAmount(page, amount)) {
      result.error = 'Could not select amount'
      result.duration = Date.now() - startTime
      await page.screenshot({ path: `test-results/fail-${attempt}-amount.png` })
      result.screenshot = `fail-${attempt}-amount.png`
      return result
    }

    // 9. Final countdown check
    const countdown3 = await getCountdown(page)
    if (countdown3 < 10) {
      console.log(`   Countdown critical (${countdown3}s), aborting bet...`)
      result.error = 'Countdown too low'
      result.duration = Date.now() - startTime
      return result
    }

    // 10. Click Imprimir
    if (!await clickImprimir(page)) {
      result.error = 'Could not click Imprimir'
      result.duration = Date.now() - startTime
      return result
    }

    // 11. Wait for result
    await waitForTicketResult(page)

    if (lastTicketSuccess) {
      result.success = true
      result.ticketId = lastTicketId
    } else if (lastTicketError) {
      result.error = lastTicketError

      // If session lost, try to reconnect for next attempt
      if (lastTicketError === 'Session lost') {
        await ensureLoggedIn(page)
      }
    } else {
      result.error = 'No response detected'
      await page.screenshot({ path: `test-results/fail-${attempt}-noresponse.png` })
      result.screenshot = `fail-${attempt}-noresponse.png`
    }

    await delay(2000) // Wait for UI to settle

  } catch (error: any) {
    result.error = error.message?.slice(0, 50) || 'Unknown error'
    await page.screenshot({ path: `test-results/fail-${attempt}-error.png` }).catch(() => {})
    result.screenshot = `fail-${attempt}-error.png`
  }

  result.duration = Date.now() - startTime

  // Log result - always show something
  if (result.success) {
    console.log(`   OK - ID: ${result.ticketId || '?'} (${result.duration}ms)`)
  } else {
    console.log(`   FAIL: ${result.error || 'Unknown'} (${result.duration}ms)`)

    // Retry logic
    if (retryCount < CONFIG.MAX_RETRIES && shouldRetry(result.error)) {
      console.log(`   Retrying...`)
      await delay(5000)
      return createTicket(page, attempt, retryCount + 1)
    }
  }

  return result
}

function shouldRetry(error?: string): boolean {
  if (!error) return false
  const retryableErrors = [
    'Could not select',
    'Overlay timeout',
    'No response',
    'Session lost',
    'Countdown'
  ]
  return retryableErrors.some(e => error.includes(e))
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

    console.log('\nErrors:')
    Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([error, count]) => {
        console.log(`   ${count}x - ${error}`)
      })

    console.log('\nFailed tickets with screenshots:')
    results.filter(r => !r.success && r.screenshot).forEach(r => {
      console.log(`   #${r.attempt}: ${r.error} -> ${r.screenshot}`)
    })
  }

  console.log('\nBy game:')
  for (const game of games) {
    const gameResults = results.filter(r => r.game === game)
    const gameSuccess = gameResults.filter(r => r.success).length
    console.log(`   ${game.toUpperCase()}: ${gameSuccess}/${gameResults.length}`)
  }

  console.log('='.repeat(60))

  // Save results
  fs.writeFileSync('test-results/results-v5.json', JSON.stringify(results, null, 2))
  console.log('\nResults saved to test-results/results-v5.json')
}

async function main() {
  const testStartTime = Date.now()

  // Ensure test-results directory exists
  if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results')
  }

  console.log('Starting ticket test v5 (100% target)...')
  console.log(`Target: ${CONFIG.TOTAL_TICKETS} tickets`)
  console.log(`Interval: ${CONFIG.INTERVAL_MS / 1000}s`)
  console.log(`Min countdown: ${CONFIG.MIN_COUNTDOWN}s`)
  console.log(`Max retries: ${CONFIG.MAX_RETRIES}`)
  console.log(`URL: ${CONFIG.POS_URL}\n`)

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const context = await browser.newContext({
    viewport: { width: 1760, height: 858 }
  })

  const page = await context.newPage()

  // Capture console for debugging
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('Ticket submission failed')) {
      lastTicketError = text.replace('Ticket submission failed:', '').trim().slice(0, 40)
      console.log(`   [Console] ${lastTicketError}`)
    }
    if (text.includes('[handlePrint] Result:') && text.includes('ticketId')) {
      const match = text.match(/ticketId:\s*([a-f0-9]+)/i)
      if (match) {
        lastTicketSuccess = true
        lastTicketId = match[1]
      }
    }
  })

  try {
    // Initial login
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
        console.log(`\n--- ${i}/${CONFIG.TOTAL_TICKETS} | ${successful} OK (${(successful/i*100).toFixed(0)}%) | ${elapsed} min ---\n`)
      }

      if (i < CONFIG.TOTAL_TICKETS) {
        console.log(`   Waiting ${CONFIG.INTERVAL_MS / 1000}s...`)
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
