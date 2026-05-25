import { chromium } from 'playwright'

async function debugCountdown() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1760, height: 858 } })

  try {
    console.log('Navigating to POS...')
    await page.goto('http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a')
    await page.waitForTimeout(5000)

    // Login
    const text = await page.locator('body').innerText()
    if (!text.includes('JUGADA')) {
      console.log('Logging in...')
      await page.waitForFunction(() => !document.body.innerText.includes('Conectando'), { timeout: 30000 })
      await page.waitForTimeout(2000)
      await page.getByRole('textbox', { name: 'ID DE OPERADOR' }).fill('001-001-001-004')
      await page.getByRole('textbox', { name: 'CONTRASENA' }).fill('123401')
      await page.locator('div').filter({ hasText: /^ACCESO$/ }).last().click()
      await page.waitForTimeout(5000)
      await page.getByRole('button', { name: 'OK' }).click().catch(() => {})
      await page.waitForTimeout(1000)
    }

    console.log('\n--- Analyzing countdown display ---\n')

    // Check if overlay is visible
    const overlayVisible = await page.locator('text=CARRERA ACTIVA').isVisible().catch(() => false)
    console.log(`Overlay (CARRERA ACTIVA) visible: ${overlayVisible}`)

    // Get the full body text
    const bodyText = await page.locator('body').innerText()

    // Search for SEG pattern
    const segMatch = bodyText.match(/SEG[\s\n]*(\d+)/i)
    console.log(`SEG pattern match: ${segMatch ? segMatch[0] : 'NOT FOUND'}`)

    // Search for countdown-related text
    const lines = bodyText.split('\n').filter(l => l.includes('SEG') || /\d{2,3}/.test(l))
    console.log('\nLines with SEG or numbers:')
    lines.slice(0, 10).forEach(l => console.log(`  "${l.trim()}"`))

    // Try to find the timer element directly
    const timerText = await page.locator('[class*="timer"]').first().innerText().catch(() => 'Not found')
    console.log(`\nTimer element text: "${timerText}"`)

    // Look for specific countdown structure
    const segElement = await page.locator('text=SEG').first().isVisible().catch(() => false)
    console.log(`SEG element visible: ${segElement}`)

    if (segElement) {
      const segParent = await page.locator('text=SEG').first().locator('..').innerText().catch(() => 'N/A')
      console.log(`SEG parent text: "${segParent}"`)
    }

    // Screenshot for visual inspection
    await page.screenshot({ path: 'test-results/countdown-debug.png' })
    console.log('\nScreenshot saved: test-results/countdown-debug.png')

    // Check each game's current state
    console.log('\n--- Game states ---')
    const games = ['dos', 'dot', 'doe', 'hoc']
    for (const game of games) {
      const gameBtn = page.locator(`button:has(img[alt="${game}"])`).first()
      const isVisible = await gameBtn.isVisible().catch(() => false)
      console.log(`${game.toUpperCase()} button visible: ${isVisible}`)
    }

    // Look at console messages for a few seconds
    console.log('\n--- Console messages (5 seconds) ---')
    page.on('console', msg => {
      const txt = msg.text()
      if (txt.includes('gameRound') || txt.includes('countdown') || txt.includes('timer')) {
        console.log(`[Console] ${txt.slice(0, 100)}`)
      }
    })
    await page.waitForTimeout(5000)

  } catch (error: any) {
    console.error('Error:', error.message)
  } finally {
    await browser.close()
  }
}

debugCountdown().catch(console.error)
