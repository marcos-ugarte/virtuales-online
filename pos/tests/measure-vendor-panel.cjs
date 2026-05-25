/**
 * Mide el panel de apuestas EXPANDIDO del vendor POS
 * Aplica:
 *  - feedback_playwright_printer.md (flags Chromium)
 *  - TEST_ORIGINAL_POS_PLAYWRIGHT.md (numpad login)
 *  - UI_MEASUREMENT_METHODOLOGY.md (getBoundingClientRect + getComputedStyle)
 */
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Launching vendor POS...');
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--allow-insecure-localhost',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--unsafely-treat-insecure-origin-as-secure=http://localhost:8085',
    ],
  });
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } });
  const page = await context.newPage();

  await page.goto('https://5f40af0bf03611963f99fbbb51ec5d9c.vgpos.net/gamepool/dist/', {
    waitUntil: 'networkidle', timeout: 30000,
  });
  await page.waitForTimeout(5000);

  // Dismiss printer/info modals
  for (let i = 0; i < 5; i++) {
    const ok = page.locator('.modalButton').first();
    if (await ok.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('Dismissing modal...');
      await ok.click({ force: true });
      await page.waitForTimeout(1000);
    } else break;
  }

  // Login (operator via keyboard, PIN via numpad)
  console.log('Login...');
  await page.locator('#user_input').click({ force: true });
  await page.waitForTimeout(300);
  await page.keyboard.type('053001001001', { delay: 30 });
  await page.waitForTimeout(300);
  await page.locator('#password_input').click({ force: true });
  await page.waitForTimeout(300);
  for (const d of '445464') {
    await page.locator('#logInPadNu' + d).click({ force: true });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(500);
  await page.getByText('ACCESO').click({ force: true });
  await page.waitForTimeout(15000);

  // Dismiss post-login modals
  for (let i = 0; i < 5; i++) {
    const ok = page.locator('.modalButton').first();
    if (await ok.isVisible({ timeout: 1000 }).catch(() => false)) {
      await ok.click({ force: true });
      await page.waitForTimeout(1000);
    } else break;
  }

  // Wait for betting (no race overlay)
  console.log('Waiting for betting...');
  for (let i = 0; i < 20; i++) {
    const running = await page.locator('#dos_gameRunning')
      .evaluate(el => el && getComputedStyle(el).display !== 'none').catch(() => false);
    if (!running) break;
    await page.waitForTimeout(3000);
  }
  console.log('Betting open');

  // Create 6 bets
  console.log('Creating 6 bets...');
  for (let r = 1; r <= 6; r++) {
    await page.locator('#dos_activeFirst' + r).click({ force: true });
    await page.waitForTimeout(150);
    await page.locator('#dos_coinBut0').click({ force: true });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1000);

  // Click ticket parent to expand panel
  console.log('Expanding panel...');
  await page.locator('#dos_ticket_parent').click({ force: true }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/vendor-panel-expanded.png' });

  // Capture all visible elements with "ticket" or "bet" in their class/id
  console.log('Capturing measurements...');
  const measurements = await page.evaluate(() => {
    const result = {};
    // Use specific known IDs from the vendor POS
    const targets = {
      ticketParent: '#dos_ticket_parent',
      ticketScannAct: '#dos_ticketScannAct',
      printAction: '#dos_printAction',
      delButt: '#dos_delButt',
    };
    for (const [name, sel] of Object.entries(targets)) {
      const el = document.querySelector(sel);
      if (!el) { result[name] = { error: 'not found' }; continue; }
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      result[name] = {
        x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height),
        bg: s.backgroundColor,
        color: s.color,
        font: s.fontFamily.split(',')[0].trim(),
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
      };
    }
    // Also dump all visible elements in the bottom-left area (where the panel is)
    const allEls = document.querySelectorAll('*');
    const inBottomLeft = [];
    allEls.forEach(el => {
      const r = el.getBoundingClientRect();
      // Bottom-left quadrant: x < 800, y > 400, visible, has size
      if (r.x < 600 && r.y > 400 && r.width > 50 && r.height > 30 && el.offsetParent !== null) {
        const id = el.id || el.className?.toString()?.substring(0, 50) || el.tagName;
        inBottomLeft.push({
          tag: el.tagName,
          id: el.id,
          class: el.className?.toString()?.substring(0, 80),
          text: el.textContent?.trim()?.substring(0, 30),
          x: Math.round(r.x), y: Math.round(r.y),
          w: Math.round(r.width), h: Math.round(r.height),
        });
      }
    });
    result.bottomLeftElements = inBottomLeft.slice(0, 30);
    return result;
  });

  fs.writeFileSync('tests/vendor-panel-measurements.json', JSON.stringify(measurements, null, 2));
  console.log('Saved tests/vendor-panel-measurements.json');
  console.log('Saved tests/vendor-panel-expanded.png');

  console.log('20s to inspect manually...');
  await page.waitForTimeout(20000);
  await browser.close();
  console.log('DONE');
})().catch(e => console.error('ERROR:', e.message));
