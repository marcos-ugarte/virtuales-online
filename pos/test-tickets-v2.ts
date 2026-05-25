/**
 * Test script v2: Create 50 tickets over 30 minutes
 * Improved error detection based on actual UI behavior
 */

import { chromium, Page } from 'playwright'

const CONFIG = {
  POS_URL: 'http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
  TOTAL_TICKETS: 50,
  INTERVAL_MS: 36000, // 36 seconds between tickets
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
const games = ['dos', 'dot', 'doe', 'hoc']
const runnersPerGame: Record<string, number> = { dos: 6, dot: 6, doe: 8, hoc: 7 }

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function login(page: Page): Promise<boolean> {
  try {
    console.log('🔐 Logging in...')
    await page.goto(CONFIG.POS_URL)
    await delay(5000) // Wait for connection

    // Check if already logged in (game buttons visible)
    const gameButton = page.getByRole('button', { name: 'dos' })
    if (await gameButton.isVisible().catch(() => false)) {
      console.log('✅ Already logged in')
      // Dismiss printer modal if present
      const okBtn = page.getByRole('button', { name: 'OK' })
      if (await okBtn.isVisible().catch(() => false)) {
        await okBtn.click()
        await delay(500)
      }
      return true
    }

    // Wait for connection - "Conectando..." disappears
    console.log('   Waiting for connection...')
    await page.waitForFunction(() => {
      const text = document.body.innerText || ''
      // Must NOT contain "Conectando"
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
    const accesoBtn = page.locator('div').filter({ hasText: /^ACCESO$/ }).last()
    await accesoBtn.click()
    console.log('   Waiting for login response...')
    await delay(6000)

    // Dismiss printer modal if present
    const okBtn = page.getByRole('button', { name: 'OK' })
    if (await okBtn.isVisible().catch(() => false)) {
      await okBtn.click()
      await delay(500)
    }

    // Verify login success by checking if "JUGADA" tab is visible
    const pageText = await page.locator('body').innerText().catch(() => '')
    if (pageText.includes('JUGADA') && pageText.includes('CARRERA')) {
      console.log('✅ Login successful')
      return true
    }

    // Debug: take screenshot
    await page.screenshot({ path: 'login-failed-screenshot.png' })
    console.log('   Page text:', pageText.slice(0, 200))
    console.error('❌ Login failed (screenshot saved)')
    return false
  } catch (error: any) {
    console.error('❌ Login failed:', error.message)
    return false
  }
}

async function createTicket(page: Page, attempt: number): Promise<TicketResult> {
  const startTime = Date.now()
  const game = games[attempt % games.length]
  const maxRunners = runnersPerGame[game]
  const runner = (attempt % maxRunners) + 1
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

    // 1. Select game (use img alt text which matches game name)
    await page.locator(`button:has(img[alt="${game}"])`).click()
    await delay(500)

    // 2. Select runner (first row = 1st place = WIN bet)
    await page.getByRole('button', { name: String(runner) }).first().click()
    await delay(300)

    // 3. Select amount (button name is like "$25 25")
    await page.locator(`button:has(img[alt="$${amount}"])`).click()
    await delay(300)

    // 4. Click Imprimir
    await page.getByRole('button', { name: 'Imprimir' }).click()

    // 5. Wait for response (ticket creation or error)
    await delay(3000)

    // 6. Check for success message "TICKET CREADO"
    const successMsg = page.locator('text=TICKET CREADO')
    if (await successMsg.isVisible().catch(() => false)) {
      result.success = true
      // Try to extract ticket ID
      const idText = await page.locator('text=/ID: [a-f0-9]+/i').textContent().catch(() => null)
      if (idText) {
        result.ticketId = idText.replace('ID: ', '').trim()
      }
    } else {
      // Check for error toasts
      const errorToast = page.locator('.Toastify__toast--error')
      if (await errorToast.isVisible().catch(() => false)) {
        result.error = await errorToast.textContent().catch(() => 'Toast error')
        result.error = result.error?.slice(0, 150) || 'Unknown toast error'
      } else {
        // Check for specific error patterns in visible text
        const pageText = await page.locator('body').textContent().catch(() => '')

        if (/round.*closed/i.test(pageText || '')) {
          result.error = 'Round closed'
        } else if (/GameRound.*not.*found/i.test(pageText || '')) {
          result.error = 'GameRound not found'
        } else if (/betting.*closed/i.test(pageText || '')) {
          result.error = 'Betting closed'
        } else if (/connection.*lost/i.test(pageText || '')) {
          result.error = 'Connection lost'
        } else {
          // No success message and no error - might have failed silently
          result.error = 'No response (timeout)'
        }
      }
    }

    // 7. Wait for modal to auto-dismiss or click to dismiss
    await delay(1500)

  } catch (error: any) {
    result.error = error.message?.slice(0, 100) || 'Unknown error'
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
    console.log(`   ${game.toUpperCase()}: ${gameSuccess}/${gameResults.length} successful`)
  }

  // Failed attempts detail
  const failedResults = results.filter(r => !r.success)
  if (failedResults.length > 0 && failedResults.length <= 20) {
    console.log('\n📜 Failed attempts:')
    failedResults.forEach(r => {
      console.log(`   #${r.attempt} ${r.game.toUpperCase()} R${r.runner} $${r.amount} - ${r.error}`)
    })
  }

  const avgDuration = total > 0 ? results.reduce((sum, r) => sum + r.duration, 0) / total : 0
  console.log(`\n⏱️  Average duration: ${avgDuration.toFixed(0)}ms`)
  console.log(`🕐 Test duration: ${((Date.now() - testStartTime) / 1000 / 60).toFixed(1)} minutes`)
  console.log('='.repeat(70))
}

let testStartTime = Date.now()

async function main() {
  testStartTime = Date.now()

  console.log('🚀 Starting ticket test v2...')
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
    if (msg.type() === 'error' && !msg.text().includes('React DevTools')) {
      console.log(`   [PAGE] ${msg.text().slice(0, 100)}`)
    }
  })

  // Handle dialogs
  page.on('dialog', async dialog => {
    console.log(`   [DIALOG] ${dialog.type()}: ${dialog.message()}`)
    await dialog.accept()
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
        console.log(`\n--- Progress: ${i}/${CONFIG.TOTAL_TICKETS} | ${successful} OK | ${elapsed} min ---\n`)
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
