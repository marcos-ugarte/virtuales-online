/**
 * Test Tickets v13 - Lightweight Diagnostic Test
 *
 * Purpose: Verify if the relay server fix works (timing data + SignalR registration)
 *
 * This test:
 * 1. Connects to the POS at Hostinger (88.223.95.55:4069)
 * 2. Logs in with Dinamica01 credentials
 * 3. Attempts ONE ticket per game type
 * 4. Logs detailed error information for diagnosis
 * 5. NO RETRIES - pure diagnostic mode
 */

import { chromium, Page, Browser } from 'playwright'

const CONFIG = {
  // Using localhost with Dinamica01 device (connects to Azure backend)
  POS_URL: 'http://localhost:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
  TIMEOUT_MS: 10000,
  GAMES: ['dos', 'dot', 'doe', 'hoc'] as const,
}

interface TicketResult {
  game: string
  success: boolean
  ticketId?: string
  error?: string
  roundStatus?: string
  countdown?: number
  timestamp: string
}

async function dismissModal(page: Page): Promise<void> {
  // Try various ways to dismiss modals
  const dismissSelectors = [
    'button:has-text("OK")',
    'button:has-text("CERRAR")',
    'button:has-text("ACEPTAR")',
    '.BaseModal-module__overlay__rRCKB',
    '[class*="overlay"]',
  ]

  for (const selector of dismissSelectors) {
    try {
      const el = page.locator(selector).first()
      if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
        await el.click({ force: true })
        console.log(`   Dismissed modal via: ${selector}`)
        await page.waitForTimeout(500)
      }
    } catch {
      // Continue to next selector
    }
  }

  // Also try pressing Escape
  await page.keyboard.press('Escape').catch(() => {})
}

async function login(page: Page): Promise<boolean> {
  try {
    console.log('🔐 Logging in...')
    await page.goto(CONFIG.POS_URL)

    // Wait for page to fully load
    await page.waitForTimeout(5000)

    // Check if already logged in (look for game buttons)
    const doeButton = page.getByRole('button', { name: 'doe' })
    if (await doeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ Already logged in')
      return true
    }

    // Dismiss any modal that might be blocking
    await dismissModal(page)
    await page.waitForTimeout(1000)

    // Wait for login form or game buttons
    const operatorInput = page.getByRole('textbox', { name: 'ID DE OPERADOR' })

    // Try up to 3 times to login
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`   Attempt ${attempt}/3...`)

      // Check if we're now logged in
      if (await doeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('✅ Login successful')
        return true
      }

      // Dismiss modal
      await dismissModal(page)

      // Fill operator ID if visible
      if (await operatorInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await operatorInput.fill(CONFIG.OPERATOR_ID)
        await page.waitForTimeout(300)
        await page.getByRole('textbox', { name: 'CONTRASENA' }).fill(CONFIG.PIN)
        await page.waitForTimeout(300)

        // Click login button
        try {
          await page.getByText('ACCESO').click({ force: true, timeout: 3000 })
        } catch {
          // Try alternative click
          await page.locator('[class*="loginButton"]').first().click({ force: true }).catch(() => {})
        }

        await page.waitForTimeout(5000)

        // Dismiss any modals after login attempt
        await dismissModal(page)
        await page.waitForTimeout(2000)
      } else {
        // Login form not visible - maybe we need to wait more
        await page.waitForTimeout(3000)
        await dismissModal(page)
      }
    }

    // Final check
    if (await doeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ Login successful')
      return true
    }

    console.log('❌ Could not verify login after 3 attempts')
    return false
  } catch (error) {
    console.error('❌ Login failed:', error)
    return false
  }
}

async function getGameRoundInfo(page: Page, game: string): Promise<{ countdown?: number; status?: string }> {
  try {
    // Try to extract round info from the UI
    const countdownEl = page.locator(`[data-game="${game}"] .countdown, .countdown-${game}`)
    const countdownText = await countdownEl.textContent({ timeout: 1000 }).catch(() => null)

    let countdown: number | undefined
    if (countdownText) {
      const match = countdownText.match(/(\d+)/)
      if (match) countdown = parseInt(match[1])
    }

    return { countdown, status: countdown !== undefined && countdown > 0 ? 'O' : 'L' }
  } catch {
    return {}
  }
}

async function createTicket(page: Page, game: string): Promise<TicketResult> {
  const result: TicketResult = {
    game,
    success: false,
    timestamp: new Date().toISOString(),
  }

  try {
    console.log(`\n🎮 Testing ${game.toUpperCase()}...`)

    // Get round info before attempting
    const roundInfo = await getGameRoundInfo(page, game)
    result.countdown = roundInfo.countdown
    result.roundStatus = roundInfo.status

    // Click game button
    await page.getByRole('button', { name: game }).click()
    await page.waitForTimeout(500)

    // Select runner 5
    await page.getByRole('button', { name: '5' }).first().click()
    await page.waitForTimeout(300)

    // Select $25
    await page.getByRole('button', { name: '$25' }).click()
    await page.waitForTimeout(300)

    // Click Imprimir
    console.log(`   Submitting ticket...`)
    await page.getByRole('button', { name: 'Imprimir' }).click()

    // Wait for response
    await page.waitForTimeout(3000)

    // Check for success - look for ticket in VENTAS or success indicator
    const ventasButton = page.getByRole('button', { name: 'VENTAS' })
    await ventasButton.click()
    await page.waitForTimeout(1000)

    // Look for recent ticket
    const ticketRow = page.locator('tr, .ticket-row').first()
    const ticketText = await ticketRow.textContent({ timeout: 2000 }).catch(() => '')

    if (ticketText && ticketText.toLowerCase().includes('pending')) {
      result.success = true
      // Try to extract ticket ID
      const idMatch = ticketText.match(/[a-f0-9]{4}/i)
      if (idMatch) result.ticketId = idMatch[0]
      console.log(`   ✅ SUCCESS: Ticket created (${result.ticketId || 'ID unknown'})`)
    } else {
      // Check for error message
      const errorEl = page.locator('.error, .toast-error, [data-testid="error"]')
      const errorText = await errorEl.textContent({ timeout: 1000 }).catch(() => null)

      if (errorText) {
        result.error = errorText
        console.log(`   ❌ FAILED: ${errorText}`)
      } else {
        result.error = 'Unknown error - no ticket found in VENTAS'
        console.log(`   ❌ FAILED: Unknown error`)
      }
    }

    // Go back to main screen
    await page.getByRole('button', { name: 'JUEGO' }).click().catch(() => {})
    await page.waitForTimeout(500)

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
    console.log(`   ❌ FAILED: ${result.error}`)
  }

  return result
}

async function runDiagnostic(): Promise<void> {
  console.log('=' .repeat(60))
  console.log('🔬 TICKET DIAGNOSTIC TEST v13')
  console.log('=' .repeat(60))
  console.log(`📍 URL: ${CONFIG.POS_URL}`)
  console.log(`📅 Started: ${new Date().toISOString()}`)
  console.log('')

  let browser: Browser | null = null
  const results: TicketResult[] = []

  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport: { width: 1760, height: 858 },
    })
    const page = await context.newPage()

    // Enable console logging from the page
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('error') || msg.text().includes('Error')) {
        console.log(`   [PAGE] ${msg.text()}`)
      }
    })

    // Login
    const loginSuccess = await login(page)
    if (!loginSuccess) {
      console.error('❌ Cannot proceed without login')
      return
    }

    // Test each game
    for (const game of CONFIG.GAMES) {
      const result = await createTicket(page, game)
      results.push(result)
      await page.waitForTimeout(2000)
    }

  } finally {
    if (browser) await browser.close()
  }

  // Print summary
  console.log('\n' + '=' .repeat(60))
  console.log('📊 DIAGNOSTIC RESULTS')
  console.log('=' .repeat(60))

  const successes = results.filter(r => r.success).length
  const failures = results.filter(r => !r.success).length

  console.log(`\n✅ Successes: ${successes}/${results.length}`)
  console.log(`❌ Failures: ${failures}/${results.length}`)

  if (failures > 0) {
    console.log('\n📝 FAILURE DETAILS:')
    for (const result of results.filter(r => !r.success)) {
      console.log(`   ${result.game.toUpperCase()}: ${result.error}`)
      if (result.countdown !== undefined) {
        console.log(`      Countdown was: ${result.countdown}s, Status: ${result.roundStatus}`)
      }
    }
  }

  console.log('\n📋 FULL RESULTS:')
  console.log(JSON.stringify(results, null, 2))

  // Diagnosis
  console.log('\n' + '=' .repeat(60))
  console.log('🔍 DIAGNOSIS')
  console.log('=' .repeat(60))

  if (successes === results.length) {
    console.log('✅ ALL TICKETS SUCCESSFUL - System is working correctly!')
  } else if (failures === results.length) {
    console.log('❌ ALL TICKETS FAILED - Likely root cause:')
    console.log('   1. Relay server not sending timing data (VideoStartDt)')
    console.log('   2. registerGameRound() disabled in relay')
    console.log('   3. Backend not opening rounds automatically')
    console.log('')
    console.log('   FIX: Deploy updated server/index.ts to Hostinger:')
    console.log('   ssh root@88.223.95.55')
    console.log('   cd /home/jorge/projects/virtual-racing-pos')
    console.log('   git pull && docker compose up -d --build relay-server')
  } else {
    console.log('⚠️ PARTIAL SUCCESS - Some games work, others fail')
    console.log('   Possible causes:')
    console.log('   1. Timing issue - some rounds were open, others locked')
    console.log('   2. Game-specific backend configuration')
    console.log('   3. Race cycle timing - try again in a few minutes')
  }
}

runDiagnostic().catch(console.error)
