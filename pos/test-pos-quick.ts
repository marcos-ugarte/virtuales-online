/**
 * Quick POS test - Login and create a ticket
 */
import { chromium } from 'playwright'

const POS_URL = 'http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a'
const OPERATOR_ID = '001-001-001-004'
const PIN = '123401'

async function testPOS() {
  console.log('🚀 Starting POS test...')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    // 1. Navigate to POS
    console.log('📍 Navigating to POS...')
    await page.goto(POS_URL)
    await page.waitForTimeout(3000)

    // 2. Login
    console.log('🔐 Logging in...')
    await page.getByRole('textbox', { name: 'ID DE OPERADOR' }).fill(OPERATOR_ID)
    await page.getByRole('textbox', { name: 'CONTRASENA' }).fill(PIN)
    await page.locator('.Login-module__loginButton__Ohodh').click()

    await page.waitForTimeout(3000)

    // 3. Dismiss printer modal if present
    const okButton = page.getByRole('button', { name: 'OK' })
    if (await okButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await okButton.click()
      console.log('📋 Dismissed printer modal')
    }

    await page.waitForTimeout(1000)

    // 4. Check if we see race data
    const raceInfo = await page.locator('.race-number, [class*="race"], [class*="carrera"]').first().isVisible({ timeout: 5000 }).catch(() => false)

    // 5. Select game DOE (most reliable)
    console.log('🎮 Selecting DOE game...')
    await page.getByRole('button', { name: 'doe' }).click()
    await page.waitForTimeout(1000)

    // 6. Select runner 1 for 1st place
    console.log('🏃 Selecting runner 1...')
    await page.getByRole('button', { name: '1' }).first().click()
    await page.waitForTimeout(500)

    // 7. Select amount $25
    console.log('💵 Selecting $25...')
    await page.getByRole('button', { name: '$25' }).click()
    await page.waitForTimeout(500)

    // 8. Click Imprimir
    console.log('🎫 Creating ticket...')
    await page.getByRole('button', { name: 'Imprimir' }).click()

    // 9. Wait for response
    await page.waitForTimeout(5000)

    // 10. Check VENTAS for ticket
    console.log('📊 Checking VENTAS...')
    await page.getByRole('button', { name: 'VENTAS' }).click()
    await page.waitForTimeout(2000)

    // Take screenshot
    await page.screenshot({ path: 'test-results/pos-test.png', fullPage: true })
    console.log('📸 Screenshot saved to test-results/pos-test.png')

    console.log('✅ Test completed!')

  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    await page.screenshot({ path: 'test-results/pos-error.png', fullPage: true })
  } finally {
    await browser.close()
  }
}

testPOS()
