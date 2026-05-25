/**
 * Quick single ticket test to check if betting is working
 */

import { chromium, Page } from 'playwright'

const CONFIG = {
  POS_URL: 'http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
}

const games = ['dos', 'dot', 'doe', 'hoc']

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getCountdown(page: Page): Promise<number> {
  try {
    const text = await page.locator('body').innerText()
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'SEG' && lines[i + 1]) {
        const num = parseInt(lines[i + 1].trim())
        if (!isNaN(num) && num > 0 && num < 300) return num
      }
    }
  } catch {}
  return -1
}

async function main() {
  console.log('Quick ticket test - checking if rounds are open...\n')

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } })
  const page = await context.newPage()

  let ticketCreated = false

  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('[handlePrint] Result:')) {
      const match = text.match(/ticketId:\s*([a-f0-9]{4,})/i)
      if (match) {
        console.log(`✓ TICKET CREATED: ${match[1]}`)
        ticketCreated = true
      }
    }
    if (text.includes('Ticket submission failed')) {
      console.log(`✗ Error: ${text.replace(/.*Ticket submission failed:\s*/i, '').trim()}`)
    }
  })

  try {
    await page.goto(CONFIG.POS_URL)
    await delay(5000)

    // Login
    await page.waitForFunction(() => !document.body.innerText?.includes('Conectando'), { timeout: 30000 })
    await delay(2000)
    await page.getByRole('textbox', { name: 'ID DE OPERADOR' }).fill(CONFIG.OPERATOR_ID)
    await page.getByRole('textbox', { name: 'CONTRASENA' }).fill(CONFIG.PIN)
    await page.locator('div').filter({ hasText: /^ACCESO$/ }).last().click()
    await delay(5000)
    await page.getByRole('button', { name: 'OK' }).click().catch(() => {})

    console.log('Logged in. Trying each game...\n')

    // Try each game
    for (const game of games) {
      console.log(`Testing ${game.toUpperCase()}...`)

      // Click game
      await page.locator(`button:has(img[alt="${game}"])`).first().click({ force: true })
      await delay(1000)

      const countdown = await getCountdown(page)
      console.log(`  Countdown: ${countdown}s`)

      if (countdown > 60) {
        // Select runner and amount
        await page.locator('button:has(img[alt="1"])').first().click({ force: true })
        await delay(200)
        await page.locator('button:has(img[alt="$25"])').first().click({ force: true })
        await delay(200)

        // Try to create ticket
        await page.getByRole('button', { name: 'Imprimir' }).click({ force: true })
        console.log('  Submitting...')

        await delay(8000)

        if (ticketCreated) {
          console.log(`\n✓ SUCCESS! ${game.toUpperCase()} round is open for betting.\n`)
          break
        }
      }
    }

    if (!ticketCreated) {
      console.log('\n✗ All rounds appear to be locked. Relay may not be running.\n')
    }

  } catch (err: any) {
    console.error('Error:', err.message)
  } finally {
    await browser.close()
  }
}

main().catch(console.error)
