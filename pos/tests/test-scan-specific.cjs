/**
 * Test: Escanear ticket específico horsec ganador y pagar manualmente
 */
const { chromium } = require('playwright');

const POS_URL = 'http://localhost:4070/?deviceId=3ba3e63251954dbcbe34984a982d5459';
const OPERATOR = '001-001-001-004';
const PIN = '123401';
const TICKET_NUMBER = '7854ce7196b749b4'; // Ticket horsec ganador

const wsLog = [];
function ts() { return new Date().toISOString().slice(11, 23); }
function log(msg) { console.log('[' + ts() + '] ' + msg); }

async function setupCDP(context, page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  cdp.on('Network.webSocketFrameSent', p => {
    try {
      const parts = p.response.payloadData.split('\x1e').filter(Boolean);
      for (const part of parts) {
        const m = JSON.parse(part);
        if (m.type === 1 && m.target) {
          if (['SendTicketStatus', 'PayTicket', 'GetTicket', 'GetTicketByNumber'].includes(m.target)) {
            log('  >>> ' + m.target + ': ' + JSON.stringify(m.arguments).substring(0, 200));
          }
          wsLog.push({ dir: 'SENT', target: m.target, args: m.arguments });
        }
      }
    } catch {}
  });
  cdp.on('Network.webSocketFrameReceived', p => {
    try {
      const parts = p.response.payloadData.split('\x1e').filter(Boolean);
      for (const part of parts) {
        const m = JSON.parse(part);
        if (m.type === 3 && m.result) {
          const r = m.result;
          if (r.msgType) {
            log('  <<< ' + r.msgType + ': ' + (r.msgValue || r.success || '') + ' ' + (r.errorCode || ''));
          } else if (r.success !== undefined) {
            log('  <<< response: success=' + r.success + ' status=' + (r.status||r.error||''));
            if (r.tips) log('       tips=' + r.tips.length + ' winAmount=' + r.winAmount);
          }
          wsLog.push({ dir: 'RECV', result: r });
        }
      }
    } catch {}
  });
}

async function login(page) {
  log('LOGIN...');
  const inputs = page.locator('input');
  await inputs.first().type(OPERATOR, { delay: 20 });
  await page.waitForTimeout(300);
  await inputs.nth(1).type(PIN, { delay: 20 });
  await page.waitForTimeout(300);
  await page.getByText('ACCESO').click({ force: true });
  await page.waitForTimeout(15000);
}

(async () => {
  log('=== TEST SCAN SPECIFIC TICKET ===');
  log('Ticket: ' + TICKET_NUMBER);
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } });
  const page = await context.newPage();
  await setupCDP(context, page);

  await page.goto(POS_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  await login(page);
  await page.waitForTimeout(8000);

  // Switch to hoc tab
  log('Switching to hoc...');
  await page.locator('img[alt="hoc"]').first().click({ force: true });
  await page.waitForTimeout(3000);

  // Click lupa/search button on active slide
  const activeSlide = page.locator('[data-testid="active-game-slide"]');
  log('Opening scan input...');
  await activeSlide.locator('[class*="searchButton"]').click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/scan-1-input-open.png' });

  // Type the ticket number
  log('Typing ticket: ' + TICKET_NUMBER);
  const scanInput = activeSlide.locator('[class*="ticketIdInput"] input, input[type="text"]:not([placeholder*="OPERADOR"]):not([placeholder*="USER"])').first();
  await scanInput.click({ force: true });
  await page.waitForTimeout(500);
  await scanInput.type(TICKET_NUMBER.toUpperCase(), { delay: 50 });
  await page.waitForTimeout(500);
  await scanInput.press('Enter');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'tests/scan-2-result.png' });

  // Look for payment dialog
  log('Looking for PAGAR button...');
  const pagarBtn = page.locator('text=PAGAR, text=Pagar').first();
  if (await pagarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    log('PAGAR found, clicking...');
    await pagarBtn.click({ force: true });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'tests/scan-3-paid.png' });
  } else {
    log('No PAGAR button — checking dialog state...');
    await page.screenshot({ path: 'tests/scan-3-no-pagar.png' });
    // Try clicking Sí (yes) on info modal
    const siBtn = page.locator('#infomodalPosButton, text=Sí, text=SÍ').first();
    if (await siBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      log('Found SÍ button...');
      await siBtn.click({ force: true });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'tests/scan-3-confirmed.png' });
    }
  }

  log('Done. 15s...');
  await page.waitForTimeout(15000);
  await browser.close();
})().catch(e => console.error('ERROR:', e.message));
