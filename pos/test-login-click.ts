/**
 * Test login with mouse click on LOGIN button
 */
import { chromium } from 'playwright'

const CONFIG = {
  POS_URL: 'https://624337b5938d3ea6f6a3d00ea99beb51.vgpos.net/gamepool/dist/',
  OPERATOR_ID: '5311',
  PIN: '123456'
}

async function testLogin() {
  console.log('Testing login...')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } })
  const page = await context.newPage()

  let loginResult = ''

  page.on('websocket', ws => {
    ws.on('framereceived', event => {
      try {
        const msg = JSON.parse(event.payload as string)
        if (msg.msgType === 'init') {
          if (msg.msgValue === 'ok') {
            console.log('✅ LOGIN OK - Session:', msg.sessionID)
            console.log('   Operator:', msg.operatorID)
            loginResult = 'success'
          } else if (msg.errorMsg) {
            console.log('❌ LOGIN FAILED:', msg.errorMsg)
            loginResult = msg.errorMsg
          }
        }
        if (msg.msgType === 'error') {
          console.log('❌ Error:', msg.errorMsg)
          loginResult = msg.errorMsg
        }
      } catch {}
    })
  })

  try {
    await page.goto(CONFIG.POS_URL)
    await page.waitForTimeout(3000)

    // Enter operator
    await page.locator('#user_input').click()
    await page.keyboard.type(CONFIG.OPERATOR_ID, { delay: 50 })
    await page.waitForTimeout(300)
    console.log('Operator entered')

    // Enter password
    await page.locator('#password_input').click()
    await page.keyboard.type(CONFIG.PIN, { delay: 50 })
    await page.waitForTimeout(300)
    console.log('Password entered')

    // Get LOGIN button bounding box and click center
    const loginBtn = page.locator('.loginButtonText')
    const box = await loginBtn.boundingBox()
    if (box) {
      const x = box.x + box.width / 2
      const y = box.y + box.height / 2
      console.log(`LOGIN button at (${x}, ${y})`)
      await page.mouse.click(x, y)
      console.log('Clicked LOGIN via mouse')
    } else {
      // Fallback: try dispatchEvent
      await loginBtn.dispatchEvent('click')
      console.log('Dispatched click event')
    }

    await page.waitForTimeout(8000)
    await page.screenshot({ path: '/tmp/login-click.png' })

    if (loginResult === 'success') {
      console.log('\n🎉 CREDENTIALS VALID!')
    } else if (loginResult) {
      console.log('\n❌ Result:', loginResult)
    } else {
      console.log('\nNo WebSocket response received')
    }

  } catch (error: any) {
    console.log('Error:', error.message)
  } finally {
    await browser.close()
  }
}

testLogin().catch(console.error)
