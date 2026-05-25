/**
 * Test script: Create 50 tickets over 30 minutes and log failures
 */

import { chromium, Page } from 'playwright'

const CONFIG = {
  POS_URL: 'http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
  TOTAL_TICKETS: 50,
  INTERVAL_MS: 36000,
}

interface TicketResult {
  attempt: number
  timestamp: string
  game: string
  runner: number
  amount: number
  success: boolean
  error?: string
  duration: number
}

const results: TicketResult[] = []
const games = ['dos', 'dot', 'doe', 'hoc']

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function login(page: Page): Promise<boolean> {
  try {
    console.log('🔐 Logging in...')
    await page.goto(CONFIG.POS_URL)
    await delay(4000)

    // Check if already logged in (look for game buttons)
    const gameButton = page.getByRole('button', { name: 'dos' })
    if (await gameButton.isVisible().catch(() => false)) {
      console.log('✅ Already logged in')
      return true
    }

    // Fill login form
    await page.getByRole('textbox', { name: 'ID DE OPERADOR' }).fill(CONFIG.OPERATOR_ID)
    await page.getByRole('textbox', { name: 'CONTRASENA' }).fill(CONFIG.PIN)

    // Click login button (more specific selector)
    await page.locator('.Login-module__loginButton__Ohodh').click()
    await delay(4000)

    // Dismiss printer modal if present
    const okButton = page.getByRole('button', { name: 'OK' })
    if (await okButton.isVisible().catch(() => false)) {
      await okButton.click()
      await delay(500)
    }

    console.log('✅ Login successful')
    return true
  } catch (error: any) {
    console.error('❌ Login failed:', error.message)
    return false
  }
}

async function createTicket(page: Page, attempt: number): Promise<TicketResult> {
  const startTime = Date.now()
  const game = games[attempt % games.length]
  const runner = (attempt % 6) + 1
  const amount = [25, 50, 100][attempt % 3]

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
    console.log(`\n📝 Attempt ${attempt}: ${game.toUpperCase()} - Runner ${runner} - $${amount}`)

    // Click game tab
    await page.getByRole('button', { name: game }).click()
    await delay(800)

    // Select runner (first position = WIN bet)
    const runnerBtn = page.getByRole('button', { name: String(runner) }).first()
    await runnerBtn.click()
    await delay(500)

    // Select amount
    await page.getByRole('button', { name: `$${amount}` }).click()
    await delay(500)

    // Click Imprimir
    await page.getByRole('button', { name: 'Imprimir' }).click()

    // Wait for response
    await delay(4000)

    // Check page for errors
    const pageContent = await page.content()

    const errorPatterns = [
      { pattern: /round.*closed/i, msg: 'Round closed' },
      { pattern: /not.*found/i, msg: 'Round not found' },
      { pattern: /GameRound.*not.*found/i, msg: 'GameRound not found' },
      { pattern: /invalid.*round/i, msg: 'Invalid round' },
      { pattern: /betting.*closed/i, msg: 'Betting closed' },
      { pattern: /error/i, msg: 'Generic error' },
    ]

    for (const { pattern, msg } of errorPatterns) {
      if (pattern.test(pageContent)) {
        result.error = msg
        break
      }
    }

    // Check for toast messages
    const toastError = await page.locator('.Toastify__toast--error').textContent().catch(() => null)
    if (toastError) {
      result.error = toastError.slice(0, 100)
    }

    // If no error detected, assume success
    if (!result.error) {
      result.success = true
    }

    // Dismiss any modal
    for (const btnName of ['OK', 'Cerrar', 'Close']) {
      const btn = page.getByRole('button', { name: btnName })
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        await delay(300)
      }
    }

  } catch (error: any) {
    result.error = error.message?.slice(0, 100) || 'Unknown error'
  }

  result.duration = Date.now() - startTime

  if (result.success) {
    console.log(`   ✅ Success (${result.duration}ms)`)
  } else {
    console.log(`   ❌ Failed: ${result.error} (${result.duration}ms)`)
  }

  return result
}

function printSummary(): void {
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const total = results.length

  console.log(`Total attempts: ${total}`)
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

  // Failed attempts detail
  const failedResults = results.filter(r => !r.success)
  if (failedResults.length > 0) {
    console.log('\n📜 Failed attempts:')
    failedResults.forEach(r => {
      console.log(`   #${r.attempt} [${r.timestamp}] ${r.game} R${r.runner} $${r.amount} - ${r.error}`)
    })
  }

  const avgDuration = total > 0 ? results.reduce((sum, r) => sum + r.duration, 0) / total : 0
  console.log(`\n⏱️ Average duration: ${avgDuration.toFixed(0)}ms`)
  console.log('='.repeat(60))
}

async function main() {
  console.log('🚀 Starting ticket test...')
  console.log(`   Target: ${CONFIG.TOTAL_TICKETS} tickets`)
  console.log(`   Interval: ${CONFIG.INTERVAL_MS / 1000}s between attempts`)
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

  // Log page errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`   [PAGE] ${msg.text().slice(0, 80)}`)
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

      if (i % 10 === 0) {
        const successful = results.filter(r => r.success).length
        console.log(`\n--- Progress: ${i}/${CONFIG.TOTAL_TICKETS} (${successful} successful) ---\n`)
      }

      if (i < CONFIG.TOTAL_TICKETS) {
        console.log(`   ⏳ Waiting ${CONFIG.INTERVAL_MS / 1000}s...`)
        await delay(CONFIG.INTERVAL_MS)
      }
    }

  } finally {
    printSummary()
    await browser.close()
  }
}

main().catch(console.error)
