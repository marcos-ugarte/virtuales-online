const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome-stable',
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  const DEVICE = '00:1E:3F:33:01:01';
  const URL = `http://localhost:4071/?deviceid=${DEVICE}&startImmediately=true`;
  const SCREENSHOTS = '/home/jorge/projects/virteon-platform/docs/screenshots';

  console.log('Navigating to:', URL);
  await page.goto(URL);

  // Wait for init + intro load
  console.log('Waiting 15s for init + intro...');
  await page.waitForTimeout(15000);
  await page.screenshot({ path: `${SCREENSHOTS}/tvbox-jorge-05-xvfb-intro.png` });
  console.log('Screenshot 1: intro');

  // Wait for odds/runner info overlay
  console.log('Waiting 30s for overlay cycle...');
  await page.waitForTimeout(30000);
  await page.screenshot({ path: `${SCREENSHOTS}/tvbox-jorge-06-xvfb-odds.png` });
  console.log('Screenshot 2: odds/info');

  // Wait for jackpot/bonus view
  console.log('Waiting 30s more...');
  await page.waitForTimeout(30000);
  await page.screenshot({ path: `${SCREENSHOTS}/tvbox-jorge-07-xvfb-jackpot.png` });
  console.log('Screenshot 3: jackpot/bonus');

  // Wait for race to start (up to 3 min more)
  console.log('Waiting up to 180s for race...');
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(30000);
    await page.screenshot({ path: `${SCREENSHOTS}/tvbox-jorge-08-xvfb-race-${i}.png` });
    console.log(`Screenshot race-${i}`);
  }

  // Final screenshot
  await page.screenshot({ path: `${SCREENSHOTS}/tvbox-jorge-09-xvfb-final.png` });
  console.log('Done');

  await browser.close();
})();
