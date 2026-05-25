/**
 * Simple one-shot test - no retries
 */
import { chromium } from 'playwright'

const CONFIG = {
  POS_URL: 'http://localhost:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a',
  OPERATOR_ID: '001-001-001-004',
  PIN: '123401',
}

async function test() {
  console.log('Starting simple test...')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } })
  const page = await context.newPage()

  page.on('console', msg => console.log(`[PAGE] ${msg.text()}`))

  try {
    await page.goto(CONFIG.POS_URL)
    console.log('Page loaded, waiting 10s for connection...')
    await page.waitForTimeout(10000)

    // Check if logged in
    const doeButton = page.getByRole('button', { name: 'doe' })
    if (await doeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ Already logged in! Testing ticket...')

      // Try to create a ticket
      await doeButton.click()
      await page.waitForTimeout(500)
      await page.getByRole('button', { name: '5' }).first().click()
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: '$25' }).click()
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: 'Imprimir' }).click()
      await page.waitForTimeout(5000)

      console.log('✅ Ticket submitted!')
    } else {
      console.log('Not logged in, checking for login form...')

      // Try to login
      const operatorInput = page.getByRole('textbox', { name: 'ID DE OPERADOR' })
      if (await operatorInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Login form visible, filling credentials...')
        await operatorInput.fill(CONFIG.OPERATOR_ID)
        await page.getByRole('textbox', { name: 'CONTRASENA' }).fill(CONFIG.PIN)
        await page.getByText('ACCESO').click()
        await page.waitForTimeout(5000)

        // Check result
        if (await doeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('✅ Login successful!')
        } else {
          console.log('❌ Login failed')
        }
      } else {
        // Check for error modal
        const pageContent = await page.content()
        if (pageContent.includes('already connected')) {
          console.log('❌ Error: Device already connected')
        } else {
          console.log('❌ Unknown state')
        }
      }
    }
  } finally {
    await browser.close()
  }
}

test().catch(console.error)
