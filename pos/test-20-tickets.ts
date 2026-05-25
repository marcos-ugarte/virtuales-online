/**
 * Test 20 tickets in 3 minutes across all game types
 * Games: DOS, DOT, DOE, HOC (5 tickets each)
 */
import { chromium, Page } from 'playwright'

const CONFIG = {
  POS_URL: 'http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
  TICKETS_PER_GAME: 50,  // 50 tickets x 4 games = 200 tickets
  GAMES: ['dos', 'dot', 'doe', 'hoc'] as const,
  AMOUNTS: ['$25', '$50', '$100', '$200'] as const,
  TIME_LIMIT_MS: 3000000  // 50 minutes
}

interface TicketResult {
  game: string
  ticketNum: number
  amount: string
  runner: number
  success: boolean
  error?: string
  timestamp: string
}

const results: TicketResult[] = []
const startTime = Date.now()

async function login(page: Page): Promise<boolean> {
  try {
    await page.goto(CONFIG.POS_URL)
    await page.waitForTimeout(5000)

    // Check if already logged in
    const doeButton = page.getByRole('button', { name: 'doe' })
    if (await doeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ Already logged in')
      return true
    }

    // Login
    const operatorInput = page.getByRole('textbox', { name: 'ID DE OPERADOR' })
    if (await operatorInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await operatorInput.fill(CONFIG.OPERATOR_ID)
      await page.getByRole('textbox', { name: 'CONTRASENA' }).fill(CONFIG.PIN)
      await page.locator('.Login-module__loginButton__Ohodh').click()
      await page.waitForTimeout(5000)

      // Dismiss printer modal if present
      const okButton = page.getByRole('button', { name: 'OK' })
      if (await okButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await okButton.click()
        await page.waitForTimeout(500)
      }

      if (await doeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✅ Login successful')
        return true
      }
    }

    console.log('❌ Login failed')
    return false
  } catch (error) {
    console.log(`❌ Login error: ${error}`)
    return false
  }
}

async function isRaceActive(page: Page): Promise<boolean> {
  return await page.locator('text=CARRERA ACTIVA').isVisible({ timeout: 500 }).catch(() => false)
}

async function createTicket(page: Page, game: string, ticketNum: number): Promise<TicketResult & { skipped?: boolean }> {
  const amount = CONFIG.AMOUNTS[ticketNum % CONFIG.AMOUNTS.length]
  const maxRunners = game === 'doe' ? 8 : game === 'hoc' ? 7 : 6
  const runner = (ticketNum % maxRunners) + 1
  const timestamp = new Date().toISOString()

  try {
    // Select game
    await page.getByRole('button', { name: game, exact: true }).click()
    await page.waitForTimeout(500)

    // Check if race is active - if so, skip this game immediately
    if (await isRaceActive(page)) {
      return { game, ticketNum, amount, runner, success: false, error: 'SKIPPED: Race active', timestamp, skipped: true }
    }

    // Select runner
    await page.getByRole('button', { name: String(runner) }).first().click()
    await page.waitForTimeout(300)

    // Select amount
    await page.getByRole('button', { name: amount }).first().click()
    await page.waitForTimeout(300)

    // Submit ticket
    await page.getByRole('button', { name: 'Imprimir' }).click()
    await page.waitForTimeout(3000)

    // Check for error modal
    const errorModal = page.locator('[class*="error"], [class*="modal"]').filter({ hasText: /error|failed|not found|not open/i })
    if (await errorModal.isVisible({ timeout: 1000 }).catch(() => false)) {
      const errorText = await errorModal.textContent() || 'Unknown error'
      return { game, ticketNum, amount, runner, success: false, error: errorText.slice(0, 50), timestamp }
    }

    return { game, ticketNum, amount, runner, success: true, timestamp }
  } catch (error) {
    return { game, ticketNum, amount, runner, success: false, error: String(error).slice(0, 50), timestamp }
  }
}

async function runTest() {
  console.log('=' .repeat(60))
  console.log('  Extended Stress Test - All Games')
  console.log('=' .repeat(60))
  console.log(`Target: ${CONFIG.TICKETS_PER_GAME} tickets x ${CONFIG.GAMES.length} games = ${CONFIG.TICKETS_PER_GAME * CONFIG.GAMES.length} tickets`)
  console.log(`Time limit: ${CONFIG.TIME_LIMIT_MS / 60000} minutes\n`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } })
  const page = await context.newPage()

  // Capture console for debugging
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[PAGE ERROR] ${msg.text()}`)
  })

  try {
    // Login
    if (!await login(page)) {
      console.log('❌ Could not login, aborting test')
      await browser.close()
      return
    }

    // Run tickets - cycle through games, skip if race is active
    let ticketNum = 0
    const ticketsPerGame: Record<string, number> = {}
    CONFIG.GAMES.forEach(g => ticketsPerGame[g] = 0)

    const totalTarget = CONFIG.TICKETS_PER_GAME * CONFIG.GAMES.length
    let gameIndex = 0
    let consecutiveSkips = 0

    while (ticketNum < totalTarget && Date.now() - startTime < CONFIG.TIME_LIMIT_MS) {
      const game = CONFIG.GAMES[gameIndex]

      // Skip if this game already has enough tickets
      if (ticketsPerGame[game] >= CONFIG.TICKETS_PER_GAME) {
        gameIndex = (gameIndex + 1) % CONFIG.GAMES.length
        continue
      }

      ticketNum++
      ticketsPerGame[game]++
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)

      const result = await createTicket(page, game, ticketNum)

      // If skipped due to active race, try next game
      if ((result as any).skipped) {
        ticketNum--  // Don't count skipped
        ticketsPerGame[game]--
        consecutiveSkips++
        console.log(`  ⏭️ ${game.toUpperCase()} race active, trying next game...`)
        gameIndex = (gameIndex + 1) % CONFIG.GAMES.length

        // If all games skipped, wait a bit
        if (consecutiveSkips >= CONFIG.GAMES.length) {
          console.log(`  ⏳ All games active, waiting 5s...`)
          await page.waitForTimeout(5000)
          consecutiveSkips = 0
        }
        continue
      }

      consecutiveSkips = 0
      results.push(result)

      const status = result.success ? '✅' : '❌'
      const errorInfo = result.error ? ` (${result.error})` : ''
      console.log(`  ${status} #${ticketNum} ${game} runner ${result.runner} ${result.amount} [${elapsed}s]${errorInfo}`)

      // Move to next game for variety
      gameIndex = (gameIndex + 1) % CONFIG.GAMES.length

      // Small delay between tickets
      await page.waitForTimeout(500)
    }

    if (Date.now() - startTime >= CONFIG.TIME_LIMIT_MS) {
      console.log('\n⏱️ Time limit reached')
    }
  } finally {
    await browser.close()
  }

  // Print summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const successRate = ((successful / results.length) * 100).toFixed(0)

  console.log('\n' + '=' .repeat(60))
  console.log('  RESULTS SUMMARY')
  console.log('=' .repeat(60))
  console.log(`Total tickets: ${results.length}`)
  console.log(`Successful: ${successful} (${successRate}%)`)
  console.log(`Failed: ${failed}`)
  console.log(`Time: ${elapsed}s`)

  // Breakdown by game
  console.log('\nBy game:')
  for (const game of CONFIG.GAMES) {
    const gameResults = results.filter(r => r.game === game)
    const gameSuccess = gameResults.filter(r => r.success).length
    console.log(`  ${game.toUpperCase()}: ${gameSuccess}/${gameResults.length}`)
  }

  // Error breakdown
  if (failed > 0) {
    console.log('\nErrors:')
    const errors = results.filter(r => !r.success)
    const errorCounts: Record<string, number> = {}
    for (const e of errors) {
      const key = e.error || 'Unknown'
      errorCounts[key] = (errorCounts[key] || 0) + 1
    }
    for (const [error, count] of Object.entries(errorCounts)) {
      console.log(`  ${count}x: ${error}`)
    }
  }
}

runTest().catch(console.error)
