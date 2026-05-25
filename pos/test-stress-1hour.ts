/**
 * 1 Hour Stress Test - 50 tickets per minute
 * Total: 3000 tickets across all game types
 */
import { chromium, Page } from 'playwright'

const CONFIG = {
  POS_URL: 'http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
  TICKETS_PER_MINUTE: 50,
  DURATION_MINUTES: 60,
  GAMES: ['dos', 'dot', 'doe', 'hoc'] as const,
  AMOUNTS: ['$25', '$50', '$100', '$200'] as const
}

const TOTAL_TICKETS = CONFIG.TICKETS_PER_MINUTE * CONFIG.DURATION_MINUTES
const DELAY_BETWEEN_TICKETS = Math.floor(60000 / CONFIG.TICKETS_PER_MINUTE) // ~1200ms

interface TicketResult {
  ticket: number
  game: string
  runner: number
  amount: string
  success: boolean
  error?: string
  gameRoundError: boolean
  timestamp: string
}

const results: TicketResult[] = []
const startTime = Date.now()
let gameRoundErrorCount = 0

// Stats tracking
const stats = {
  byMinute: new Map<number, { success: number; failed: number; grErrors: number }>(),
  byGame: new Map<string, { success: number; failed: number; grErrors: number }>()
}

async function login(page: Page): Promise<boolean> {
  try {
    await page.goto(CONFIG.POS_URL)
    await page.waitForTimeout(3000)

    // Dismiss any modal overlay
    const modalOverlay = page.locator('.BaseModal-module__overlay__rRCKB')
    if (await modalOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      const okButton = page.getByRole('button', { name: 'OK' })
      if (await okButton.isVisible({ timeout: 500 }).catch(() => false)) {
        await okButton.click()
      } else {
        await page.keyboard.press('Escape')
      }
      await page.waitForTimeout(1000)
    }

    // Check if already logged in
    const doeButton = page.getByRole('button', { name: 'doe' })
    if (await doeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Already logged in')
      return true
    }

    // Login
    const operatorInput = page.getByRole('textbox', { name: 'ID DE OPERADOR' })
    if (await operatorInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await operatorInput.fill(CONFIG.OPERATOR_ID)
      await page.getByRole('textbox', { name: 'CONTRASENA' }).fill(CONFIG.PIN)
      await page.locator('.Login-module__loginButton__Ohodh').click({ force: true })
      await page.waitForTimeout(5000)

      const okBtn = page.getByRole('button', { name: 'OK' })
      if (await okBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await okBtn.click()
        await page.waitForTimeout(500)
      }

      if (await doeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Login successful')
        return true
      }
    }

    console.log('Login failed')
    return false
  } catch (error) {
    console.log(`Login error: ${error}`)
    return false
  }
}

async function createTicket(page: Page, ticketNum: number, game: string, consoleErrors: string[]): Promise<TicketResult> {
  const amount = CONFIG.AMOUNTS[ticketNum % CONFIG.AMOUNTS.length]
  const maxRunners = game === 'doe' ? 8 : game === 'hoc' ? 7 : 6
  const runner = (ticketNum % maxRunners) + 1
  const timestamp = new Date().toISOString()

  consoleErrors.length = 0

  try {
    await page.getByRole('button', { name: game, exact: true }).click()
    await page.waitForTimeout(300)

    if (await page.locator('text=CARRERA ACTIVA').isVisible({ timeout: 200 }).catch(() => false)) {
      return { ticket: ticketNum, game, runner, amount, success: false, error: 'RACE_ACTIVE', gameRoundError: false, timestamp }
    }

    await page.getByRole('button', { name: String(runner) }).first().click()
    await page.waitForTimeout(150)
    await page.getByRole('button', { name: amount }).first().click()
    await page.waitForTimeout(150)
    await page.getByRole('button', { name: 'Imprimir' }).click()
    await page.waitForTimeout(800)

    const hasGameRoundError = consoleErrors.some(e => e.includes('GameRound not found'))
    if (hasGameRoundError) gameRoundErrorCount++

    return { ticket: ticketNum, game, runner, amount, success: true, gameRoundError: hasGameRoundError, timestamp }
  } catch (error) {
    const hasGameRoundError = consoleErrors.some(e => e.includes('GameRound not found'))
    if (hasGameRoundError) gameRoundErrorCount++
    return { ticket: ticketNum, game, runner, amount, success: false, error: String(error).slice(0, 30), gameRoundError: hasGameRoundError, timestamp }
  }
}

function printProgress(ticketNum: number, result: TicketResult, currentMinute: number) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  const rate = (ticketNum / (Date.now() - startTime) * 60000).toFixed(1)
  const status = result.success ? 'OK' : 'FAIL'
  const grError = result.gameRoundError ? ' [GR]' : ''
  const errorInfo = result.error && result.error !== 'RACE_ACTIVE' ? ` (${result.error.slice(0, 20)})` : ''

  // Print every 10th ticket or on error
  if (ticketNum % 10 === 0 || !result.success) {
    console.log(`[${elapsed}s] #${ticketNum}/${TOTAL_TICKETS} ${result.game.toUpperCase()} ${status}${grError}${errorInfo} | ${rate}/min | Min ${currentMinute}`)
  }
}

function printMinuteSummary(minute: number) {
  const minuteStats = stats.byMinute.get(minute)
  if (!minuteStats) return

  const total = minuteStats.success + minuteStats.failed
  const successRate = ((minuteStats.success / total) * 100).toFixed(0)
  console.log(`\n--- Minute ${minute} Summary: ${minuteStats.success}/${total} (${successRate}%) | GR Errors: ${minuteStats.grErrors} ---\n`)
}

async function runTest() {
  console.log('='.repeat(70))
  console.log('  1 HOUR STRESS TEST - 50 tickets/minute')
  console.log('='.repeat(70))
  console.log(`Target: ${TOTAL_TICKETS} tickets over ${CONFIG.DURATION_MINUTES} minutes`)
  console.log(`Rate: ${CONFIG.TICKETS_PER_MINUTE} tickets/min (~${DELAY_BETWEEN_TICKETS}ms between tickets)`)
  console.log(`Games: ${CONFIG.GAMES.join(', ').toUpperCase()}`)
  console.log(`Started: ${new Date().toISOString()}\n`)

  // Initialize game stats
  CONFIG.GAMES.forEach(g => stats.byGame.set(g, { success: 0, failed: 0, grErrors: 0 }))

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } })
  const page = await context.newPage()

  const consoleErrors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  try {
    if (!await login(page)) {
      console.log('Could not login, aborting')
      await browser.close()
      return
    }

    console.log('\nStarting ticket creation...\n')

    let ticketNum = 0
    let gameIndex = 0
    let lastMinute = 0
    let skippedInRow = 0

    while (ticketNum < TOTAL_TICKETS) {
      const currentMinute = Math.floor((Date.now() - startTime) / 60000) + 1

      // Initialize minute stats if new minute
      if (!stats.byMinute.has(currentMinute)) {
        if (lastMinute > 0) printMinuteSummary(lastMinute)
        stats.byMinute.set(currentMinute, { success: 0, failed: 0, grErrors: 0 })
        lastMinute = currentMinute
      }

      const game = CONFIG.GAMES[gameIndex]
      ticketNum++

      const ticketStart = Date.now()
      const result = await createTicket(page, ticketNum, game, consoleErrors)

      if (result.error === 'RACE_ACTIVE') {
        ticketNum--
        skippedInRow++
        gameIndex = (gameIndex + 1) % CONFIG.GAMES.length
        if (skippedInRow >= CONFIG.GAMES.length) {
          console.log(`[${Math.floor((Date.now() - startTime) / 1000)}s] All games active, waiting 3s...`)
          await page.waitForTimeout(3000)
          skippedInRow = 0
        }
        continue
      }

      skippedInRow = 0
      results.push(result)

      // Update stats
      const minuteStats = stats.byMinute.get(currentMinute)!
      const gameStats = stats.byGame.get(game)!
      if (result.success) {
        minuteStats.success++
        gameStats.success++
      } else {
        minuteStats.failed++
        gameStats.failed++
      }
      if (result.gameRoundError) {
        minuteStats.grErrors++
        gameStats.grErrors++
      }

      printProgress(ticketNum, result, currentMinute)

      // Rotate game
      gameIndex = (gameIndex + 1) % CONFIG.GAMES.length

      // Pace control - maintain target rate
      const ticketDuration = Date.now() - ticketStart
      const waitTime = Math.max(0, DELAY_BETWEEN_TICKETS - ticketDuration)
      if (waitTime > 0) await page.waitForTimeout(waitTime)
    }

    // Print last minute summary
    printMinuteSummary(lastMinute)

  } finally {
    await browser.close()
  }

  // Final summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const elapsedMinutes = ((Date.now() - startTime) / 60000).toFixed(1)
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const withGRError = results.filter(r => r.gameRoundError).length
  const actualRate = (results.length / (Date.now() - startTime) * 60000).toFixed(1)

  console.log('\n' + '='.repeat(70))
  console.log('  FINAL RESULTS - 1 HOUR STRESS TEST')
  console.log('='.repeat(70))
  console.log(`Duration: ${elapsedMinutes} minutes (${elapsed}s)`)
  console.log(`Total tickets: ${results.length}`)
  console.log(`Successful: ${successful} (${((successful / results.length) * 100).toFixed(1)}%)`)
  console.log(`Failed: ${failed}`)
  console.log(`Actual rate: ${actualRate} tickets/min`)
  console.log('')
  console.log('*** GAMEROUND ERROR CHECK ***')
  console.log(`Tickets with "GameRound not found": ${withGRError}`)
  if (withGRError === 0) {
    console.log('SUCCESS: No GameRound errors detected!')
  } else {
    console.log(`WARNING: ${withGRError} tickets had GameRound errors (${((withGRError / results.length) * 100).toFixed(1)}%)`)
  }

  console.log('\nBy game:')
  for (const [game, s] of stats.byGame) {
    const total = s.success + s.failed
    console.log(`  ${game.toUpperCase()}: ${s.success}/${total} success, ${s.grErrors} GR errors`)
  }

  if (failed > 0) {
    console.log('\nError breakdown:')
    const errorCounts: Record<string, number> = {}
    for (const r of results.filter(r => !r.success)) {
      const key = r.error || 'Unknown'
      errorCounts[key] = (errorCounts[key] || 0) + 1
    }
    for (const [error, count] of Object.entries(errorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`  ${count}x: ${error}`)
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log(`Finished: ${new Date().toISOString()}`)
}

runTest().catch(console.error)
