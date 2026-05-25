/**
 * Test login credentials via Playwright on original POS
 */
import { chromium } from 'playwright'

const CONFIG = {
  POS_URL: 'https://624337b5938d3ea6f6a3d00ea99beb51.vgpos.net/gamepool/dist/',
  OPERATOR_ID: '53-1-1',
  PIN: '123456'
}

async function testLogin() {
  console.log('Testing login via Playwright...')
  console.log(`URL: ${CONFIG.POS_URL}`)
  console.log(`Operator: ${CONFIG.OPERATOR_ID}`)
  console.log('')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } })
  const page = await context.newPage()

  // Capture WebSocket messages
  page.on('websocket', ws => {
    console.log('🔌 WebSocket:', ws.url())

    ws.on('framereceived', event => {
      try {
        const msg = JSON.parse(event.payload as string)
        if (msg.msgType === 'init') {
          if (msg.msgValue === 'ok') {
            console.log('✅ LOGIN OK - Session:', msg.sessionID)
            console.log('   Operator:', msg.operatorID)
          } else if (msg.msgType === 'error' || msg.errorMsg) {
            console.log('❌ LOGIN ERROR:', msg.errorMsg)
          }
        }
        if (msg.msgType === 'error') {
          console.log('❌ Error:', msg.errorMsg)
        }
      } catch {}
    })

    ws.on('framesent', event => {
      try {
        const msg = JSON.parse(event.payload as string)
        if (msg.msgType === 'init') {
          console.log('📤 init sent - user:', msg.user)
        }
      } catch {}
    })
  })

  try {
    await page.goto(CONFIG.POS_URL)
    console.log('Page loaded')

    await page.waitForTimeout(3000)

    // Take screenshot to see current state
    await page.screenshot({ path: '/tmp/login-test-1.png' })
    console.log('Screenshot saved to /tmp/login-test-1.png')

    // Try to find login fields
    const operatorInput = page.locator('input[type="text"]').first()
    const pinInput = page.locator('input[type="password"]').first()

    if (await operatorInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Found login form')

      // Enter credentials
      await operatorInput.fill(CONFIG.OPERATOR_ID)
      await page.waitForTimeout(500)

      await pinInput.fill(CONFIG.PIN)
      await page.waitForTimeout(500)

      await page.screenshot({ path: '/tmp/login-test-2.png' })
      console.log('Screenshot after filling form: /tmp/login-test-2.png')

      // Find and click login button
      const loginButton = page.locator('button, div').filter({ hasText: /login|acceso|enter/i }).first()
      if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await loginButton.click()
        console.log('Clicked login button')
      } else {
        // Try clicking any prominent button
        await page.keyboard.press('Enter')
        console.log('Pressed Enter')
      }

      await page.waitForTimeout(5000)
      await page.screenshot({ path: '/tmp/login-test-3.png' })
      console.log('Screenshot after login attempt: /tmp/login-test-3.png')

    } else {
      console.log('Login form not found, checking page state...')
      await page.screenshot({ path: '/tmp/login-test-state.png' })
    }

    await page.waitForTimeout(3000)

  } catch (error) {
    console.log('Error:', error)
  } finally {
    await browser.close()
  }
}

testLogin().catch(console.error)
