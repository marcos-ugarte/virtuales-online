/**
 * Test login using coordinates (based on 1760x858 viewport)
 */
import { chromium } from 'playwright'

const CONFIG = {
  POS_URL: 'https://624337b5938d3ea6f6a3d00ea99beb51.vgpos.net/gamepool/dist/',
  OPERATOR_ID: '5311',
  PIN: '123456'
}

// Numpad coordinates (approximate based on screenshot)
// Numpad is on the right side, buttons are roughly 60x50px
const NUMPAD = {
  '1': { x: 680, y: 158 },
  '2': { x: 755, y: 158 },
  '3': { x: 830, y: 158 },
  '4': { x: 680, y: 218 },
  '5': { x: 755, y: 218 },
  '6': { x: 830, y: 218 },
  '7': { x: 680, y: 278 },
  '8': { x: 755, y: 278 },
  '9': { x: 830, y: 278 },
  '0': { x: 755, y: 338 },
  'back': { x: 680, y: 338 }
}

// Field positions
const FIELDS = {
  operator: { x: 170, y: 158 },
  password: { x: 420, y: 158 },
  login: { x: 295, y: 218 }
}

async function testLogin() {
  console.log('Testing login via coordinates...')
  console.log(`Operator: ${CONFIG.OPERATOR_ID}`)
  console.log(`PIN: ${CONFIG.PIN}`)
  console.log('')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } })
  const page = await context.newPage()

  let loginSuccess = false

  page.on('websocket', ws => {
    console.log('🔌 WebSocket:', ws.url())

    ws.on('framereceived', event => {
      try {
        const msg = JSON.parse(event.payload as string)
        if (msg.msgType === 'init') {
          if (msg.msgValue === 'ok') {
            console.log('✅ LOGIN OK - Session:', msg.sessionID)
            console.log('   Operator:', msg.operatorID)
            loginSuccess = true
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
    console.log('Clicking operator field...')
    await page.mouse.click(FIELDS.operator.x, FIELDS.operator.y)
    await page.waitForTimeout(300)

    // Enter operator ID via numpad
    console.log('Entering operator ID:', CONFIG.OPERATOR_ID)
    for (const digit of CONFIG.OPERATOR_ID) {
      const pos = NUMPAD[digit as keyof typeof NUMPAD]
      if (pos) {
        await page.mouse.click(pos.x, pos.y)
        await page.waitForTimeout(150)
      }
    }
    await page.waitForTimeout(300)

    // Click on PASSWORD field
    console.log('Clicking password field...')
    await page.mouse.click(FIELDS.password.x, FIELDS.password.y)
    await page.waitForTimeout(300)

    // Enter PIN via numpad
    console.log('Entering PIN:', CONFIG.PIN)
    for (const digit of CONFIG.PIN) {
      const pos = NUMPAD[digit as keyof typeof NUMPAD]
      if (pos) {
        await page.mouse.click(pos.x, pos.y)
        await page.waitForTimeout(150)
      }
    }
    await page.waitForTimeout(300)

    await page.screenshot({ path: '/tmp/login-coords-before.png' })
    console.log('Screenshot before login: /tmp/login-coords-before.png')

    // Click LOGIN button
    console.log('Clicking LOGIN...')
    await page.mouse.click(FIELDS.login.x, FIELDS.login.y)

    await page.waitForTimeout(5000)
    await page.screenshot({ path: '/tmp/login-coords-after.png' })
    console.log('Screenshot after login: /tmp/login-coords-after.png')

    if (loginSuccess) {
      console.log('')
      console.log('🎉 CREDENTIALS VALID!')
    }

  } catch (error) {
    console.log('Error:', error)
    await page.screenshot({ path: '/tmp/login-coords-error.png' })
  } finally {
    await browser.close()
  }
}

testLogin().catch(console.error)
