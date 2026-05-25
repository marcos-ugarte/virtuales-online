/**
 * Diagnóstico: ver qué pasa al hacer click en print
 * - Captura TODOS los console msgs + errors
 * - Captura requests a WebPosPrinter (:8085) y print-server-dogs (:4053)
 * - Reporta printerMode en uso
 */
const { chromium } = require('playwright');

const POS_URL = 'http://localhost:4070/?deviceId=3ba3e63251954dbcbe34984a982d5459';
const OPERATOR = '001-001-001-004';
const PIN = '123401';

function ts() { return new Date().toISOString().slice(11, 23); }
function log(msg) { console.log('[' + ts() + '] ' + msg); }

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--allow-insecure-localhost', '--disable-web-security', '--allow-running-insecure-content'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1760, height: 858 } });
  const page = await ctx.newPage();

  // ALL console
  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('Printer') || t.includes('printer') || t.includes('print') ||
        t.includes('Ticket') || t.includes('ticket') || t.includes('vendor') ||
        t.includes('WebPos') || msg.type() === 'error') {
      log('[' + msg.type() + '] ' + t.substring(0, 300));
    }
  });
  page.on('pageerror', err => log('[pageerror] ' + err.message));

  // Capture printer requests
  page.on('request', req => {
    const u = req.url();
    if (u.includes(':8085') || u.includes(':4053') || u.includes('printer')) {
      log('→ REQ ' + req.method() + ' ' + u);
    }
  });
  page.on('response', res => {
    const u = res.url();
    if (u.includes(':8085') || u.includes(':4053') || u.includes('printer')) {
      log('← RES ' + res.status() + ' ' + u);
    }
  });
  page.on('requestfailed', req => {
    const u = req.url();
    if (u.includes(':8085') || u.includes(':4053') || u.includes('printer')) {
      log('✗ FAILED ' + u + ' — ' + req.failure()?.errorText);
    }
  });

  await page.goto(POS_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  log('LOGIN');
  const inputs = page.locator('input');
  await inputs.first().type(OPERATOR, { delay: 20 });
  await page.waitForTimeout(300);
  await inputs.nth(1).type(PIN, { delay: 20 });
  await page.waitForTimeout(300);
  await page.getByText('ACCESO').click({ force: true });
  await page.waitForTimeout(15000);

  // Read printerMode from window
  const printerInfo = await page.evaluate(() => {
    const ls = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      ls[k] = localStorage.getItem(k);
    }
    return ls;
  });
  log('localStorage keys: ' + Object.keys(printerInfo).join(', '));

  log('--- Creating ticket on dos ---');
  await page.locator('[data-testid="sel-first-1"]').click({ force: true });
  await page.waitForTimeout(300);
  await page.locator('[data-testid="coin-25"]').click({ force: true });
  await page.waitForTimeout(300);
  log('--- Clicking PRINT ---');
  await page.locator('[data-testid="btn-print"]').click({ force: true });
  await page.waitForTimeout(8000);

  log('--- Done. Closing in 5s ---');
  await page.waitForTimeout(5000);
  await browser.close();
})().catch(e => console.error('ERROR:', e.message));
