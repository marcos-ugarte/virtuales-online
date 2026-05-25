import { chromium } from 'playwright'

async function quickLoginTest() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1760, height: 858 } })

  try {
    console.log('Navigating to POS...')
    await page.goto('http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a')

    console.log('Waiting for page load...')
    await page.waitForTimeout(5000)

    // Check page content
    const text = await page.locator('body').innerText()
    console.log('Page contains:', text.slice(0, 300))

    // Check if already logged in
    if (text.includes('JUGADA')) {
      console.log('Already logged in!')
      await browser.close()
      return
    }

    // Wait for connection
    console.log('Waiting for connection...')
    await page.waitForFunction(() => {
      const text = document.body.innerText || ''
      return !text.includes('Conectando')
    }, { timeout: 30000 }).catch(e => console.log('Connection wait error:', e.message))

    await page.waitForTimeout(2000)

    // Take screenshot before login
    await page.screenshot({ path: 'test-results/before-login.png' })
    console.log('Screenshot saved: test-results/before-login.png')

    // Check for login form
    const operatorField = page.getByRole('textbox', { name: 'ID DE OPERADOR' })
    const isVisible = await operatorField.isVisible().catch(() => false)
    console.log('Operator field visible:', isVisible)

    if (!isVisible) {
      console.log('Login form not visible')
      const bodyText = await page.locator('body').innerText()
      console.log('Body text:', bodyText.slice(0, 500))
      await browser.close()
      return
    }

    console.log('Filling credentials...')
    await operatorField.fill('001-001-001-004')
    await page.getByRole('textbox', { name: 'CONTRASENA' }).fill('123401')

    console.log('Clicking ACCESO...')
    await page.locator('div').filter({ hasText: /^ACCESO$/ }).last().click()

    await page.waitForTimeout(6000)

    // Take screenshot after login
    await page.screenshot({ path: 'test-results/after-login.png' })
    console.log('Screenshot saved: test-results/after-login.png')

    // Check login result
    const newText = await page.locator('body').innerText()
    if (newText.includes('JUGADA')) {
      console.log('LOGIN SUCCESSFUL!')
    } else {
      console.log('Login might have failed. Text:', newText.slice(0, 300))
    }

  } catch (error: any) {
    console.error('Error:', error.message)
    await page.screenshot({ path: 'test-results/login-error.png' }).catch(() => {})
  } finally {
    await browser.close()
  }
}

quickLoginTest().catch(console.error)
