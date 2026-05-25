/**
 * Test 100 tickets across all game types
 * Verifies GameRound errors are fixed after polling implementation
 */
import { chromium, Page } from 'playwright'

const CONFIG = {
  POS_URL: 'http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
  TOTAL_TICKETS: 100,
  GAMES: ['dos', 'dot', 'doe', 'hoc'] as const,
  AMOUNTS: ['$25', '$50', '$100', '$200'] as const
}

interface TicketResult {
  ticket: number
  game: string
  runner: number
  amount: string
  success: boolean
  error?: string
  gameRoundError: boolean
}

const results: TicketResult[] = []
const startTime = Date.now()
let gameRoundErrorCount = 0

async function login(page: Page): Promise<boolean> {
  try {
    await page.goto(CONFIG.POS_URL)
    await page.waitForTimeout(3000)

    // Dismiss any modal overlay that might be blocking
    const modalOverlay = page.locator('.BaseModal-module__overlay__rRCKB')
    if (await modalOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('Dismissing modal overlay...')
      // Try clicking OK button or pressing Escape
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

      // Click login button with force to bypass overlay
      await page.locator('.Login-module__loginButton__Ohodh').click({ force: true })
      await page.waitForTimeout(5000)

      // Dismiss printer modal if present
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

  // Clear previous errors
  consoleErrors.length = 0

  try {
    // Select game
    await page.getByRole('button', { name: game, exact: true }).click()
    await page.waitForTimeout(400)

    // Check if race is active
    if (await page.locator('text=CARRERA ACTIVA').isVisible({ timeout: 300 }).catch(() => false)) {
      return {
        ticket: ticketNum, game, runner, amount,
        success: false, error: 'RACE_ACTIVE', gameRoundError: false
      }
    }

    // Select runner
    await page.getByRole('button', { name: String(runner) }).first().click()
    await page.waitForTimeout(200)

    // Select amount
    await page.getByRole('button', { name: amount }).first().click()
    await page.waitForTimeout(200)

    // Submit ticket
    await page.getByRole('button', { name: 'Imprimir' }).click()
    await page.waitForTimeout(2500)

    // Check for GameRound errors in console
    const hasGameRoundError = consoleErrors.some(e => e.includes('GameRound not found'))
    if (hasGameRoundError) {
      gameRoundErrorCount++
    }

    // Check for error modal
    const errorModal = page.locator('[class*="error"], [class*="modal"]').filter({ hasText: /error|failed/i })
    if (await errorModal.isVisible({ timeout: 500 }).catch(() => false)) {
      const errorText = await errorModal.textContent() || 'Unknown error'
      return {
        ticket: ticketNum, game, runner, amount,
        success: false, error: errorText.slice(0, 40), gameRoundError: hasGameRoundError
      }
    }

    return { ticket: ticketNum, game, runner, amount, success: true, gameRoundError: hasGameRoundError }
  } catch (error) {
    const hasGameRoundError = consoleErrors.some(e => e.includes('GameRound not found'))
    if (hasGameRoundError) gameRoundErrorCount++
    return {
      ticket: ticketNum, game, runner, amount,
      success: false, error: String(error).slice(0, 40), gameRoundError: hasGameRoundError
    }
  }
}

async function runTest() {
  console.log('='.repeat(70))
  console.log('  100 Ticket Stress Test - GameRound Polling Validation')
  console.log('='.repeat(70))
  console.log(`Target: ${CONFIG.TOTAL_TICKETS} tickets across ${CONFIG.GAMES.length} games`)
  console.log(`Games: ${CONFIG.GAMES.join(', ').toUpperCase()}`)
  console.log(`Amounts: ${CONFIG.AMOUNTS.join(', ')}\n`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } })
  const page = await context.newPage()

  // Capture console errors
  const consoleErrors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  try {
    if (!await login(page)) {
      console.log('Could not login, aborting')
      await browser.close()
      return
    }

    console.log('\nCreating tickets...\n')

    let gameIndex = 0
    let skippedInRow = 0

    for (let i = 1; i <= CONFIG.TOTAL_TICKETS; i++) {
      const game = CONFIG.GAMES[gameIndex]
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)

      const result = await createTicket(page, i, game, consoleErrors)

      if (result.error === 'RACE_ACTIVE') {
        skippedInRow++
        i-- // Don't count this attempt
        gameIndex = (gameIndex + 1) % CONFIG.GAMES.length

        if (skippedInRow >= CONFIG.GAMES.length) {
          console.log(`  [${elapsed}s] All games active, waiting 5s...`)
          await page.waitForTimeout(5000)
          skippedInRow = 0
        }
        continue
      }

      skippedInRow = 0
      results.push(result)

      const status = result.success ? 'OK' : 'FAIL'
      const grError = result.gameRoundError ? ' [GR_ERROR]' : ''
      const errorInfo = result.error ? ` (${result.error})` : ''

      console.log(`  #${String(i).padStart(3)} ${game.toUpperCase()} R${result.runner} ${result.amount.padEnd(4)} ${status}${grError}${errorInfo} [${elapsed}s]`)

      // Rotate to next game
      gameIndex = (gameIndex + 1) % CONFIG.GAMES.length

      // Brief pause between tickets
      await page.waitForTimeout(300)
    }
  } finally {
    await browser.close()
  }

  // Print summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const withGRError = results.filter(r => r.gameRoundError).length

  console.log('\n' + '='.repeat(70))
  console.log('  RESULTS SUMMARY')
  console.log('='.repeat(70))
  console.log(`Total tickets attempted: ${results.length}`)
  console.log(`Successful: ${successful} (${((successful / results.length) * 100).toFixed(0)}%)`)
  console.log(`Failed: ${failed}`)
  console.log(`Time: ${elapsed}s`)
  console.log('')
  console.log('*** GAMEROUND ERROR CHECK ***')
  console.log(`Tickets with "GameRound not found" error: ${withGRError}`)
  if (withGRError === 0) {
    console.log('SUCCESS: No GameRound errors detected!')
  } else {
    console.log(`WARNING: ${withGRError} tickets had GameRound errors`)
  }

  // Breakdown by game
  console.log('\nBy game:')
  for (const game of CONFIG.GAMES) {
    const gameResults = results.filter(r => r.game === game)
    const gameSuccess = gameResults.filter(r => r.success).length
    const gameGRErrors = gameResults.filter(r => r.gameRoundError).length
    console.log(`  ${game.toUpperCase()}: ${gameSuccess}/${gameResults.length} success, ${gameGRErrors} GR errors`)
  }

  // Error breakdown
  if (failed > 0) {
    console.log('\nError types:')
    const errors = results.filter(r => !r.success && r.error)
    const errorCounts: Record<string, number> = {}
    for (const e of errors) {
      const key = e.error || 'Unknown'
      errorCounts[key] = (errorCounts[key] || 0) + 1
    }
    for (const [error, count] of Object.entries(errorCounts)) {
      console.log(`  ${count}x: ${error}`)
    }
  }

  console.log('\n' + '='.repeat(70))
}

runTest().catch(console.error)
