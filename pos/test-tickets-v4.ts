/**
 * Test script v4: Create tickets with improved detection
 * Fixes: success detection via console logs, overlay handling, better selectors
 */

import { chromium, Page } from 'playwright'

const CONFIG = {
  POS_URL: 'http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
  TOTAL_TICKETS: 20, // Start with 20 for testing
  INTERVAL_MS: 35000, // 35 seconds between tickets
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
}

const results: TicketResult[] = []
let lastTicketResult: { success: boolean; ticketId?: string; error?: string } | null = null

const games = ['dos', 'dot', 'doe', 'hoc']
const runnersPerGame: Record<string, number> = { dos: 6, dot: 6, doe: 8, hoc: 7 }

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForNoOverlay(page: Page, maxWait: number = 40000): Promise<void> {
  const startTime = Date.now()
  while (Date.now() - startTime < maxWait) {
    const hasOverlay = await page.locator('text=CARRERA ACTIVA').isVisible().catch(() => false)
    if (!hasOverlay) return
    console.log('   [Waiting for race to finish...]')
    await delay(5000)
  }
}

async function login(page: Page): Promise<boolean> {
  try {
    console.log('Logging in...')
    await page.goto(CONFIG.POS_URL)
    await delay(5000)

    // Check if already logged in
    const pageText = await page.locator('body').innerText().catch(() => '')
    if (pageText.includes('JUGADA') && pageText.includes('CARRERA')) {
      console.log('Already logged in')
      await dismissModal(page)
      return true
    }

    // Wait for connection
    console.log('   Waiting for connection...')
    await page.waitForFunction(() => {
      const text = document.body.innerText || ''
      return !text.includes('Conectando')
    }, { timeout: 30000 })
    await delay(2000)
    console.log('   Connected!')

    // Fill login form
    await page.getByRole('textbox', { name: 'ID DE OPERADOR' }).fill(CONFIG.OPERATOR_ID)
    await delay(300)
    await page.getByRole('textbox', { name: 'CONTRASENA' }).fill(CONFIG.PIN)
    await delay(300)

    // Click login button
    await page.locator('div').filter({ hasText: /^ACCESO$/ }).last().click()
    await delay(6000)

    // Dismiss any modals
    await dismissModal(page)

    // Verify login success
    const textAfter = await page.locator('body').innerText().catch(() => '')
    if (textAfter.includes('JUGADA') && textAfter.includes('CARRERA')) {
      console.log('Login successful')
      return true
    }

    console.error('Login failed')
    return false
  } catch (error: any) {
    console.error('Login failed:', error.message)
    return false
  }
}

async function dismissModal(page: Page): Promise<void> {
  try {
    const okBtn = page.getByRole('button', { name: 'OK' })
    if (await okBtn.isVisible().catch(() => false)) {
      await okBtn.click()
      await delay(500)
    }
  } catch {}
}

async function createTicket(page: Page, attempt: number): Promise<TicketResult> {
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
    duration: 0
  }

  // Reset last ticket result
  lastTicketResult = null

  try {
    console.log(`\n#${attempt}: ${game.toUpperCase()} R${runner} $${amount}`)

    // Wait for any overlay to disappear
    await waitForNoOverlay(page)

    // 1. Click JUGADA tab first to ensure we're on the right view
    await page.getByRole('button', { name: 'JUGADA' }).click().catch(() => {})
    await delay(500)

    // 2. Select game
    const gameBtn = page.locator(`button:has(img[alt="${game}"])`).first()
    await gameBtn.click({ timeout: 5000 })
    await delay(1500) // Wait for game to fully load

    // Wait for overlay again (game change might trigger race animation)
    await waitForNoOverlay(page, 35000)

    // 3. Select runner - use nth(0) to get first row only
    // The runner buttons in first row (1°) come before second row (2°)
    const runnerLocator = page.locator(`button:has(img[alt="${runner}"])`).first()
    await runnerLocator.click({ timeout: 5000 })
    await delay(500)

    // 4. Select amount
    const amountBtn = page.locator(`button:has(img[alt="$${amount}"])`).first()
    await amountBtn.click({ timeout: 5000 })
    await delay(500)

    // 5. Click Imprimir
    const imprimirBtn = page.getByRole('button', { name: 'Imprimir' })
    await imprimirBtn.click({ timeout: 5000 })

    // 6. Wait for response (check via captured console logs)
    await delay(5000)

    // Check result from console capture
    if (lastTicketResult) {
      result.success = lastTicketResult.success
      result.ticketId = lastTicketResult.ticketId
      result.error = lastTicketResult.error
    } else {
      // Fallback: check page content
      const pageContent = await page.locator('body').innerText().catch(() => '')
      if (pageContent.includes('TICKET CREADO')) {
        result.success = true
        const idMatch = pageContent.match(/ID:\s*([a-f0-9]+)/i)
        if (idMatch) result.ticketId = idMatch[1]
      } else {
        result.error = 'No response captured'
      }
    }

    await delay(1500)

  } catch (error: any) {
    result.error = error.message?.slice(0, 60) || 'Unknown error'
  }

  result.duration = Date.now() - startTime

  if (result.success) {
    console.log(`   OK - ID: ${result.ticketId || '?'} (${result.duration}ms)`)
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

  console.log(`\nTotal: ${total} | OK: ${successful} (${total > 0 ? (successful/total*100).toFixed(0) : 0}%) | Failed: ${failed}`)

  // Group errors by type
  const errorCounts: Record<string, number> = {}
  results.filter(r => !r.success).forEach(r => {
    const error = r.error || 'Unknown'
    errorCounts[error] = (errorCounts[error] || 0) + 1
  })

  if (Object.keys(errorCounts).length > 0) {
    console.log('\nErrors:')
    Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([error, count]) => {
        console.log(`   ${count}x - ${error}`)
      })
  }

  // Group by game
  console.log('\nBy game:')
  for (const game of games) {
    const gameResults = results.filter(r => r.game === game)
    const gameSuccess = gameResults.filter(r => r.success).length
    console.log(`   ${game.toUpperCase()}: ${gameSuccess}/${gameResults.length}`)
  }

  console.log('='.repeat(60))

  // Save results
  const fs = require('fs')
  fs.writeFileSync('test-results-v4.json', JSON.stringify(results, null, 2))
  console.log('\nResults saved to test-results-v4.json')
}

let testStartTime = Date.now()

async function main() {
  testStartTime = Date.now()

  console.log('Starting ticket test v4...')
  console.log(`Target: ${CONFIG.TOTAL_TICKETS} tickets`)
  console.log(`Interval: ${CONFIG.INTERVAL_MS / 1000}s`)
  console.log(`URL: ${CONFIG.POS_URL}\n`)

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const context = await browser.newContext({
    viewport: { width: 1760, height: 858 }
  })

  const page = await context.newPage()

  // Capture console logs to detect ticket results
  page.on('console', msg => {
    const text = msg.text()

    // Detect successful ticket
    if (text.includes('[handlePrint] Result:') && text.includes('sendTicket')) {
      // Parse the result - look for ticketId in the message
      const ticketMatch = text.match(/ticketId:\s*([a-f0-9]+)/i)
      lastTicketResult = {
        success: true,
        ticketId: ticketMatch ? ticketMatch[1] : undefined
      }
    }

    // Detect errors
    if (text.includes('Ticket submission failed')) {
      const errorMsg = text.replace('Ticket submission failed:', '').trim().slice(0, 50)
      lastTicketResult = {
        success: false,
        error: errorMsg
      }
      console.log(`   [ERROR] ${errorMsg}`)
    }
  })

  try {
    const loggedIn = await login(page)
    if (!loggedIn) {
      console.error('Could not login, aborting')
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
