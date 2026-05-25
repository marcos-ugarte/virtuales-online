import { chromium } from 'playwright'

async function main() {
  console.log('Starting debug...')

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()

  page.on('console', msg => console.log(`[PAGE] ${msg.text().slice(0, 150)}`))

  console.log('Navigating...')
  await page.goto('http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a')

  console.log('Waiting 10 seconds...')
  await new Promise(r => setTimeout(r, 10000))

  const text = await page.locator('body').innerText()
  console.log('\n=== PAGE TEXT ===')
  console.log(text.slice(0, 500))
  console.log('=================\n')

  await page.screenshot({ path: 'debug-screenshot.png' })
  console.log('Screenshot saved to debug-screenshot.png')

  await browser.close()
}

main().catch(console.error)
