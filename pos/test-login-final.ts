/**
 * Test login - final version with force click
 */
import { chromium } from 'playwright'

const CONFIG = {
  POS_URL: 'https://624337b5938d3ea6f6a3d00ea99beb51.vgpos.net/gamepool/dist/',
  OPERATOR_ID: '5311',
  PIN: '123456'
}

async function testLogin() {
  console.log('Testing login...')
  console.log(`Operator: ${CONFIG.OPERATOR_ID}`)
  console.log('')

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

    // Click operator input and type
    const operatorInput = page.locator('#user_input')
    await operatorInput.click()
    await page.keyboard.type(CONFIG.OPERATOR_ID, { delay: 50 })
    await page.waitForTimeout(300)

    const operatorValue = await operatorInput.inputValue()
    console.log('Operator entered:', operatorValue)

    // Click password input and type
    const passwordInput = page.locator('#password_input')
    await passwordInput.click()
    await page.keyboard.type(CONFIG.PIN, { delay: 50 })
    await page.waitForTimeout(300)

    const passwordValue = await passwordInput.inputValue()
    console.log('Password entered:', passwordValue.replace(/./g, '*'))

    // Click LOGIN with force
    const loginBtn = page.locator('.loginButtonText').first()
    await loginBtn.click({ force: true })
    console.log('Clicked LOGIN')

    await page.waitForTimeout(8000)
    await page.screenshot({ path: '/tmp/login-final.png' })

    if (loginResult === 'success') {
      console.log('')
      console.log('🎉 CREDENTIALS VALID!')
    } else if (loginResult) {
      console.log('')
      console.log('❌ Login result:', loginResult)
    }

  } catch (error: any) {
    console.log('Error:', error.message)
    await page.screenshot({ path: '/tmp/login-final-error.png' }).catch(() => {})
  } finally {
    await browser.close()
  }
}

testLogin().catch(console.error)
