/**
 * Test script v3: Create 100 tickets over ~1 hour
 * Fixed: error detection, runner selection, HOC handling
 */

import { chromium, Page } from 'playwright'

const CONFIG = {
  POS_URL: 'http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
  TOTAL_TICKETS: 100,
  INTERVAL_MS: 30000, // 30 seconds between tickets (~50 min total)
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
const pageErrors: string[] = []

// All games now configured (HOC fixed)
const games = ['dos', 'dot', 'doe', 'hoc']
const runnersPerGame: Record<string, number> = { dos: 6, dot: 6, doe: 8, hoc: 7 }

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function login(page: Page): Promise<boolean> {
  try {
    console.log('🔐 Logging in...')
    await page.goto(CONFIG.POS_URL)
    await delay(5000)

    // Check if already logged in
    const pageText = await page.locator('body').innerText().catch(() => '')
    if (pageText.includes('JUGADA') && pageText.includes('CARRERA')) {
      console.log('✅ Already logged in')
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
    console.log('   Filling credentials...')
    await page.getByRole('textbox', { name: 'ID DE OPERADOR' }).fill(CONFIG.OPERATOR_ID)
    await delay(300)
    await page.getByRole('textbox', { name: 'CONTRASENA' }).fill(CONFIG.PIN)
    await delay(300)

    // Click login button
    console.log('   Clicking ACCESO...')
    await page.locator('div').filter({ hasText: /^ACCESO$/ }).last().click()
    console.log('   Waiting for login response...')
    await delay(6000)

    // Dismiss any modals
    await dismissModal(page)

    // Verify login success
    const textAfter = await page.locator('body').innerText().catch(() => '')
    if (textAfter.includes('JUGADA') && textAfter.includes('CARRERA')) {
      console.log('✅ Login successful')
      return true
    }

    console.error('❌ Login failed')
    await page.screenshot({ path: 'login-failed.png' })
    return false
  } catch (error: any) {
    console.error('❌ Login failed:', error.message)
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
  const game = games[attempt % games.length]
  const maxRunners = runnersPerGame[game]
  // Use runners 1-5 to avoid edge cases with runner selection
  const runner = ((attempt - 1) % 5) + 1
  const amounts = [25, 50, 100]
  const amount = amounts[attempt % amounts.length]

  const result: TicketResult = {
    attempt,
    timestamp: new Date().toISOString(),
    game,
    runner,
    amount,
    success: false,
    duration: 0
  }

  try {
    console.log(`\n📝 #${attempt}: ${game.toUpperCase()} - Runner ${runner} - $${amount}`)

    // 1. Select game - click on game button with img
    const gameBtn = page.locator(`button:has(img[alt="${game}"])`).first()
    await gameBtn.click({ timeout: 10000 })
    await delay(1000) // Wait for UI to update after game change

    // 2. Select runner (first row = 1st place = WIN bet)
    const runnerBtn = page.getByRole('button', { name: String(runner) }).first()
    await runnerBtn.click({ timeout: 10000 })
    await delay(500)

    // 3. Select amount
    const amountBtn = page.locator(`button:has(img[alt="$${amount}"])`).first()
    await amountBtn.click({ timeout: 10000 })
    await delay(500)

    // 4. Click Imprimir
    const imprimirBtn = page.getByRole('button', { name: 'Imprimir' })
    await imprimirBtn.click({ timeout: 10000 })

    // 5. Wait for response
    await delay(4000)

    // 6. Check for success or error
    const pageContent = await page.locator('body').innerText().catch(() => '')

    // Check for TICKET CREADO (success) - check both visible text and any recent logs
    if (pageContent.includes('TICKET CREADO') || pageContent.includes('✓')) {
      result.success = true
      // Extract ticket ID
      const idMatch = pageContent.match(/ID:\s*([a-f0-9]+)/i)
      if (idMatch) {
        result.ticketId = idMatch[1]
      }
    } else {
      // Check for specific errors in page content
      const lowerContent = pageContent.toLowerCase()
      if (lowerContent.includes('not open for betting') || lowerContent.includes('round_not_open')) {
        result.error = 'ROUND_NOT_OPEN'
      } else if (lowerContent.includes('gameround not found') || lowerContent.includes('round_not_found')) {
        result.error = 'ROUND_NOT_FOUND'
      } else if (lowerContent.includes('round closed')) {
        result.error = 'ROUND_CLOSED'
      } else if (lowerContent.includes('connection') && lowerContent.includes('lost')) {
        result.error = 'CONNECTION_LOST'
      } else if (pageErrors.length > 0) {
        // Check captured page errors
        const recentError = pageErrors[pageErrors.length - 1]
        if (recentError.includes('not open') || recentError.includes('not found')) {
          result.error = recentError.slice(0, 50)
        } else {
          result.error = 'No success message'
        }
      } else {
        result.error = 'No success message'
      }
    }

    // Wait for any modal/toast to auto-dismiss
    await delay(1500)

  } catch (error: any) {
    result.error = error.message?.slice(0, 80) || 'Unknown error'
  }

  result.duration = Date.now() - startTime

  if (result.success) {
    console.log(`   ✅ Success - ID: ${result.ticketId || '?'} (${result.duration}ms)`)
  } else {
    console.log(`   ❌ Failed: ${result.error} (${result.duration}ms)`)
  }

  return result
}

function printSummary(): void {
  console.log('\n' + '='.repeat(70))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(70))

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const total = results.length

  console.log(`\nTotal attempts: ${total}`)
  console.log(`✅ Successful: ${successful} (${total > 0 ? (successful/total*100).toFixed(1) : 0}%)`)
  console.log(`❌ Failed: ${failed} (${total > 0 ? (failed/total*100).toFixed(1) : 0}%)`)

  // Group errors by type
  const errorCounts: Record<string, number> = {}
  results.filter(r => !r.success).forEach(r => {
    const error = r.error || 'Unknown'
    errorCounts[error] = (errorCounts[error] || 0) + 1
  })

  if (Object.keys(errorCounts).length > 0) {
    console.log('\n📋 Error breakdown:')
    Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([error, count]) => {
        console.log(`   ${count}x - ${error}`)
      })
  }

  // Group by game
  console.log('\n🎮 By game:')
  for (const game of games) {
    const gameResults = results.filter(r => r.game === game)
    const gameSuccess = gameResults.filter(r => r.success).length
    const gameErrors = gameResults.filter(r => !r.success)
    console.log(`   ${game.toUpperCase()}: ${gameSuccess}/${gameResults.length} successful`)
    if (gameErrors.length > 0) {
      const errorTypes = [...new Set(gameErrors.map(e => e.error))]
      console.log(`      Errors: ${errorTypes.join(', ')}`)
    }
  }

  // Success rate over time (first 10, middle, last 10)
  if (total >= 20) {
    const first10 = results.slice(0, 10).filter(r => r.success).length
    const last10 = results.slice(-10).filter(r => r.success).length
    console.log(`\n📈 Trend: First 10: ${first10}/10 | Last 10: ${last10}/10`)
  }

  const avgDuration = total > 0 ? results.reduce((sum, r) => sum + r.duration, 0) / total : 0
  console.log(`\n⏱️  Average duration: ${avgDuration.toFixed(0)}ms`)
  console.log(`🕐 Test duration: ${((Date.now() - testStartTime) / 1000 / 60).toFixed(1)} minutes`)
  console.log('='.repeat(70))

  // Save results to JSON for analysis
  const fs = require('fs')
  fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2))
  console.log('\n📄 Results saved to test-results.json')
}

let testStartTime = Date.now()

async function main() {
  testStartTime = Date.now()

  console.log('🚀 Starting ticket test v3...')
  console.log(`   Target: ${CONFIG.TOTAL_TICKETS} tickets`)
  console.log(`   Interval: ${CONFIG.INTERVAL_MS / 1000}s between attempts`)
  console.log(`   Games: ${games.join(', ')} (HOC skipped - not configured)`)
  console.log(`   URL: ${CONFIG.POS_URL}`)
  console.log(`   Started: ${new Date().toISOString()}\n`)

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const context = await browser.newContext({
    viewport: { width: 1760, height: 858 }
  })

  const page = await context.newPage()

  // Capture page errors (uses global pageErrors array)
  page.on('console', msg => {
    const text = msg.text()
    if (msg.type() === 'error' && !text.includes('React DevTools')) {
      pageErrors.push(text.slice(0, 100))
      if (text.includes('Ticket submission failed')) {
        console.log(`   [PAGE] ${text.slice(0, 100)}`)
      }
    }
  })

  try {
    const loggedIn = await login(page)
    if (!loggedIn) {
      console.error('❌ Could not login, aborting')
      return
    }

    for (let i = 1; i <= CONFIG.TOTAL_TICKETS; i++) {
      const result = await createTicket(page, i)
      results.push(result)

      // Progress report every 10 tickets
      if (i % 10 === 0) {
        const successful = results.filter(r => r.success).length
        const elapsed = ((Date.now() - testStartTime) / 1000 / 60).toFixed(1)
        console.log(`\n--- Progress: ${i}/${CONFIG.TOTAL_TICKETS} | ${successful} OK (${(successful/i*100).toFixed(0)}%) | ${elapsed} min ---\n`)
      }

      if (i < CONFIG.TOTAL_TICKETS) {
        console.log(`   ⏳ Waiting ${CONFIG.INTERVAL_MS / 1000}s...`)
        await delay(CONFIG.INTERVAL_MS)
      }
    }

  } catch (err: any) {
    console.error('❌ Test error:', err.message)
  } finally {
    printSummary()
    await browser.close()
  }
}

main().catch(console.error)
