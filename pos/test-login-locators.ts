/**
 * Test login using proper locators
 */
import { chromium } from 'playwright'

const CONFIG = {
  POS_URL: 'https://624337b5938d3ea6f6a3d00ea99beb51.vgpos.net/gamepool/dist/',
  OPERATOR_ID: '5311',
  PIN: '123456'
}

async function testLogin() {
  console.log('Testing login via locators...')
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

    // Get all elements for debugging
    const buttons = await page.locator('button').all()
    console.log(`Found ${buttons.length} buttons`)

    // Try to find numpad by class or structure
    const numpadButtons = await page.locator('[class*="numpad"] button, [class*="keypad"] button, .key, .numkey').all()
    console.log(`Found ${numpadButtons.length} numpad buttons`)

    // Alternative: Find by aria/role
    const allClickables = await page.locator('[role="button"], button, [onclick]').count()
    console.log(`Found ${allClickables} clickable elements`)

    // Let's inspect the page structure
    const html = await page.content()

    // Find input fields
    const inputs = await page.locator('input').all()
    console.log(`Found ${inputs.length} inputs`)
    for (const input of inputs) {
      const id = await input.getAttribute('id')
      const name = await input.getAttribute('name')
      const placeholder = await input.getAttribute('placeholder')
      console.log(`  Input: id=${id}, name=${name}, placeholder=${placeholder}`)
    }

    // Click on operator input
    const operatorInput = page.locator('#user_input, input[name="user"], input[placeholder*="OPERATOR" i]').first()
    await operatorInput.click()
    console.log('Clicked operator input')
    await page.waitForTimeout(500)

    // Try typing directly (some apps accept keyboard input even with readonly)
    await page.keyboard.type(CONFIG.OPERATOR_ID, { delay: 100 })
    await page.waitForTimeout(500)

    // Check if it worked
    const operatorValue = await operatorInput.inputValue()
    console.log('Operator value after typing:', operatorValue)

    if (!operatorValue) {
      // Need to use numpad - find the buttons by looking at their structure
      console.log('Keyboard typing did not work, trying to find numpad...')

      // Look for buttons with numbers
      for (const digit of CONFIG.OPERATOR_ID) {
        // Try different selectors
        const numButton = page.locator(`text="${digit}"`).first()
        if (await numButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await numButton.click()
          await page.waitForTimeout(100)
          console.log(`Clicked ${digit}`)
        }
      }
    }

    await page.screenshot({ path: '/tmp/login-locators-debug.png' })
    console.log('Screenshot: /tmp/login-locators-debug.png')

    // Try to click password field
    const passwordInput = page.locator('#password_input, input[name="password"], input[placeholder*="PASSWORD" i]').first()
    await passwordInput.click()
    console.log('Clicked password input')
    await page.waitForTimeout(500)

    // Type PIN
    await page.keyboard.type(CONFIG.PIN, { delay: 100 })

    await page.waitForTimeout(500)
    await page.screenshot({ path: '/tmp/login-locators-before.png' })

    // Click LOGIN
    const loginBtn = page.locator('text="LOGIN"').first()
    await loginBtn.click()
    console.log('Clicked LOGIN')

    await page.waitForTimeout(5000)
    await page.screenshot({ path: '/tmp/login-locators-after.png' })

    if (loginSuccess) {
      console.log('')
      console.log('🎉 CREDENTIALS VALID!')
    }

  } catch (error) {
    console.log('Error:', error)
    await page.screenshot({ path: '/tmp/login-locators-error.png' }).catch(() => {})
  } finally {
    await browser.close()
  }
}

testLogin().catch(console.error)
