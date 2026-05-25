/**
 * Test login via numpad on original POS
 */
import { chromium } from 'playwright'

const CONFIG = {
  POS_URL: 'https://624337b5938d3ea6f6a3d00ea99beb51.vgpos.net/gamepool/dist/',
  OPERATOR_ID: '5311',  // Sin guiones - solo números
  PIN: '123456'
}

async function clickNumpad(page: any, digit: string) {
  const button = page.locator(`button, div`).filter({ hasText: new RegExp(`^${digit}$`) }).first()
  await button.click()
  await page.waitForTimeout(100)
}

async function testLogin() {
  console.log('Testing login via numpad...')
  console.log(`URL: ${CONFIG.POS_URL}`)
  console.log(`Operator: ${CONFIG.OPERATOR_ID}`)
  console.log(`PIN: ${CONFIG.PIN}`)
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
          }
        }
        if (msg.msgType === 'error') {
          console.log('❌ Error:', msg.errorMsg)
        }
      } catch {}
    })
  })

  try {
    await page.goto(CONFIG.POS_URL)
    console.log('Page loaded')
    await page.waitForTimeout(3000)

    // Click on OPERATOR ID field
    const operatorField = page.locator('input[name="user"], input[id*="operator"], input[placeholder*="OPERATOR"]').first()
    await operatorField.click()
    console.log('Clicked operator field')
    await page.waitForTimeout(300)

    // Enter operator ID via numpad
    console.log('Entering operator ID:', CONFIG.OPERATOR_ID)
    for (const digit of CONFIG.OPERATOR_ID) {
      await clickNumpad(page, digit)
    }
    await page.waitForTimeout(500)

    // Click on PASSWORD field
    const passwordField = page.locator('input[name="password"], input[id*="password"], input[placeholder*="PASSWORD"]').first()
    await passwordField.click()
    console.log('Clicked password field')
    await page.waitForTimeout(300)

    // Enter PIN via numpad
    console.log('Entering PIN:', CONFIG.PIN)
    for (const digit of CONFIG.PIN) {
      await clickNumpad(page, digit)
    }
    await page.waitForTimeout(500)

    await page.screenshot({ path: '/tmp/login-numpad-before.png' })
    console.log('Screenshot: /tmp/login-numpad-before.png')

    // Click LOGIN button
    const loginButton = page.locator('button, div').filter({ hasText: /^LOGIN$/i }).first()
    await loginButton.click()
    console.log('Clicked LOGIN')

    await page.waitForTimeout(5000)
    await page.screenshot({ path: '/tmp/login-numpad-after.png' })
    console.log('Screenshot: /tmp/login-numpad-after.png')

  } catch (error) {
    console.log('Error:', error)
    await page.screenshot({ path: '/tmp/login-numpad-error.png' })
  } finally {
    await browser.close()
  }
}

testLogin().catch(console.error)
