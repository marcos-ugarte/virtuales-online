/**
 * Compara el panel de apuestas expandido: vendor vs nuestro
 * Captura medidas, posiciones, colores y screenshots side-by-side
 */
const { chromium } = require('playwright');
const fs = require('fs');

const VENDOR_URL = 'https://5f40af0bf03611963f99fbbb51ec5d9c.vgpos.net/gamepool/dist/';
const OUR_URL = 'http://localhost:4070/?deviceId=3ba3e63251954dbcbe34984a982d5459';
const VIEWPORT = { width: 1760, height: 858 };

function ts() { return new Date().toISOString().slice(11, 23); }
function log(msg) { console.log('[' + ts() + '] ' + msg); }

async function dismissModals(page) {
  for (let i = 0; i < 5; i++) {
    const ok = page.locator('.modalButton').first();
    if (await ok.isVisible({ timeout: 1000 }).catch(() => false)) {
      await ok.click({ force: true });
      await page.waitForTimeout(1000);
    } else break;
  }
}

async function loginVendor(page) {
  log('Vendor: login...');
  await page.locator('#user_input').click({ force: true });
  await page.keyboard.type('053001001001', { delay: 30 });
  await page.locator('#password_input').click({ force: true });
  await page.waitForTimeout(300);
  for (const d of '445464') {
    await page.locator('#logInPadNu' + d).click({ force: true });
    await page.waitForTimeout(150);
  }
  await page.getByText('ACCESO').click({ force: true });
  await page.waitForTimeout(12000);
  await dismissModals(page);
}

async function loginOurs(page) {
  log('Ours: login...');
  const inputs = page.locator('input');
  await inputs.first().type('001-001-001-004', { delay: 20 });
  await page.waitForTimeout(300);
  await inputs.nth(1).type('123401', { delay: 20 });
  await page.waitForTimeout(300);
  await page.getByText('ACCESO').click({ force: true });
  await page.waitForTimeout(15000);
}

async function measure(page, selectors, label) {
  return await page.evaluate((sels) => {
    const result = {};
    for (const [name, selector] of Object.entries(sels)) {
      const el = document.querySelector(selector);
      if (!el) {
        result[name] = { error: 'not found', selector };
        continue;
      }
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      result[name] = {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        bg: styles.backgroundColor,
        color: styles.color,
        font: styles.fontFamily.split(',')[0].trim(),
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        padding: styles.padding,
        borderRadius: styles.borderRadius,
      };
    }
    return result;
  }, selectors);
}

(async () => {
  log('=== COMPARE BET PANELS ===');
  const browser = await chromium.launch({
    headless: false,
    args: ['--allow-insecure-localhost', '--disable-web-security', '--allow-running-insecure-content', '--unsafely-treat-insecure-origin-as-secure=http://localhost:8085'],
  });

  // === VENDOR ===
  log('--- VENDOR ---');
  const vctx = await browser.newContext({ viewport: VIEWPORT });
  const vp = await vctx.newPage();
  await vp.goto(VENDOR_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await vp.waitForTimeout(5000);
  await dismissModals(vp);
  await loginVendor(vp);

  // Wait for betting
  log('Vendor: waiting for betting...');
  for (let i = 0; i < 20; i++) {
    const overlay = await vp.locator('#dos_gameRunning').evaluate(el => el && getComputedStyle(el).display !== 'none').catch(() => false);
    if (!overlay) break;
    await vp.waitForTimeout(3000);
  }

  // Create 6 bets on vendor
  log('Vendor: creating 6 bets...');
  for (let r = 1; r <= 6; r++) {
    await vp.locator('#dos_activeFirst' + r).click({ force: true });
    await vp.waitForTimeout(150);
    await vp.locator('#dos_coinBut0').click({ force: true });
    await vp.waitForTimeout(150);
  }
  await vp.waitForTimeout(1000);

  // Click ticket panel to expand it
  log('Vendor: expanding panel...');
  await vp.locator('#dos_ticket_parent').click({ force: true }).catch(() => {});
  await vp.waitForTimeout(2000);
  await vp.screenshot({ path: 'tests/cmp-vendor-expanded.png' });

  // Measure vendor expanded panel elements
  const vendorMeasures = await measure(vp, {
    panel: '#dos_ticket_parent',
    yellowBanner: '[class*="ticTotalSumCo"], [class*="totalContent"]',
    table: '[class*="ticketBetsTable"], [class*="ticketTable"]',
    bottomBar: '[class*="ticketHintTxt"], [class*="closeTicketHint"]',
    trashBtn: '[class*="trashButton"], #dos_deletAction',
    printBtn: '[class*="printAction"], #dos_printAction',
  });
  log('Vendor measures captured');

  // === OURS ===
  log('--- OURS ---');
  const octx = await browser.newContext({ viewport: VIEWPORT });
  const op = await octx.newPage();
  await op.goto(OUR_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await op.waitForTimeout(5000);
  await loginOurs(op);

  for (let i = 0; i < 20; i++) {
    const overlay = await op.locator('[class*="raceOverlay"]').first().isVisible({ timeout: 500 }).catch(() => false);
    if (!overlay) break;
    await op.waitForTimeout(3000);
  }

  log('Ours: creating 6 bets...');
  for (let r = 1; r <= 6; r++) {
    await op.locator('[data-testid="sel-first-' + r + '"]').click({ force: true });
    await op.waitForTimeout(150);
    await op.locator('[data-testid="coin-25"]').click({ force: true });
    await op.waitForTimeout(150);
  }
  await op.waitForTimeout(1000);

  log('Ours: expanding panel...');
  await op.locator('[class*="apuestaPanel"]').first().click({ force: true });
  await op.waitForTimeout(2000);
  await op.screenshot({ path: 'tests/cmp-ours-expanded.png' });

  const oursMeasures = await measure(op, {
    panel: '[class*="apuestaPanel"]',
    yellowBanner: '[class*="apuestaHeaderBanner"]',
    expandedContent: '[class*="apuestaContent"]',
    flagsArea: '[class*="apuestaFlagsArea"]',
    deleteBtn: '[data-testid="btn-delete"]',
    printBtn: '[data-testid="btn-print"]',
  });
  log('Ours measures captured');

  // Save comparison
  const comparison = {
    viewport: VIEWPORT,
    vendor: vendorMeasures,
    ours: oursMeasures,
  };
  fs.writeFileSync('tests/bet-panel-comparison.json', JSON.stringify(comparison, null, 2));
  log('\n========== COMPARISON SAVED ==========');
  log('  tests/bet-panel-comparison.json');
  log('  tests/cmp-vendor-expanded.png');
  log('  tests/cmp-ours-expanded.png');

  log('\nVendor:');
  for (const [k, v] of Object.entries(vendorMeasures)) {
    log('  ' + k + ': ' + JSON.stringify(v));
  }
  log('\nOurs:');
  for (const [k, v] of Object.entries(oursMeasures)) {
    log('  ' + k + ': ' + JSON.stringify(v));
  }

  log('\n30s to inspect both windows...');
  await op.waitForTimeout(30000);
  await browser.close();
})().catch(e => console.error('ERROR:', e.message));
