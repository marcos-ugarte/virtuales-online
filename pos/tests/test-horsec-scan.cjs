/**
 * Test: HORSEC — Crear ticket ganador, esperar carrera, escanear y pagar manualmente
 */
const { chromium } = require('playwright');

const POS_URL = 'http://localhost:4070/?deviceId=3ba3e63251954dbcbe34984a982d5459';
const OPERATOR = '001-001-001-004';
const PIN = '123401';

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
          if (['SendTicketStatus', 'PayTicket', 'sendTicket', 'GetTicket'].includes(m.target)) {
            const a = m.arguments?.[0] || {};
            log('  >>> ' + m.target + ': ' + JSON.stringify(a).substring(0, 150));
            wsLog.push({ dir: 'SENT', target: m.target, args: m.arguments });
          }
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
          if (r.msgType === 'sendTicket' && r.ticketID) {
            log('  <<< sendTicket: ' + r.msgValue + ' ticketID=' + r.ticketID);
          }
          if (r.msgType === 'sendTicketStatus') {
            log('  <<< sendTicketStatus: ' + r.msgValue + ' ' + (r.errorCode || ''));
          }
          if (r.success !== undefined && (r.ticketNumber || r.ticketId)) {
            log('  <<< GetTicket/PayTicket: ' + JSON.stringify(r).substring(0, 200));
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
  log('=== TEST SCAN HORSEC ===');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } });
  const page = await context.newPage();
  await setupCDP(context, page);

  await page.goto(POS_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  await login(page);
  await page.waitForTimeout(8000);

  // Switch to hoc
  log('Switching to hoc...');
  await page.locator('img[alt="hoc"]').first().click({ force: true });
  await page.waitForTimeout(2000);

  // Wait for betting
  for (let i = 0; i < 30; i++) {
    const overlay = page.locator('[class*="raceOverlay"]').first();
    if (!await overlay.isVisible({ timeout: 500 }).catch(() => false)) break;
    await page.waitForTimeout(3000);
  }

  // Create a ticket: bet on all 7 runners (guaranteed winner)
  log('Creating ticket: 7 WIN bets...');
  let lastTicketId = null;
  for (let r = 1; r <= 7; r++) {
    await page.locator('[data-testid="sel-first-' + r + '"]').click({ force: true });
    await page.waitForTimeout(150);
    await page.locator('[data-testid="coin-25"]').click({ force: true });
    await page.waitForTimeout(150);
  }
  await page.locator('[data-testid="btn-print"]').click({ force: true });
  await page.waitForTimeout(5000);

  // Get the ticket ID from wsLog
  const ticketRecv = wsLog.find(m => m.dir === 'RECV' && m.result?.msgType === 'sendTicket' && m.result?.ticketID);
  const ticketIdShort = ticketRecv?.result?.ticketID;
  log('Ticket short ID: ' + ticketIdShort);

  // Wait for race to finish (~3-5 min)
  log('Waiting for race to resolve (~4 min)...');
  await page.waitForTimeout(240000);

  // Open scan input (lupa button)
  log('Opening scan...');
  await page.locator('[class*="searchButton"]').first().click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/horsec-scan-open.png' });

  // Find the scan input and type the ticket UUID
  // The scanner expects 16-char uuid (sessionCode + ticketID)
  // Let's get sessionCode from the active session
  const sessionCode = await page.evaluate(() => {
    // Try to get from window or common places
    return window.posSessionCode || document.querySelector('[class*="sessionCode"]')?.textContent || null;
  });
  log('Session code: ' + sessionCode);

  // Search input
  const searchInput = page.locator('[class*="ticketIdInput"] input, [class*="TicketIdInput"] input, input[placeholder*="ticket"], input[placeholder*="ID"]').first();
  if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    log('Typing ticket ID...');
    // Get full UUID from local DB query — just try the short ID first
    if (ticketIdShort) {
      await searchInput.type(ticketIdShort, { delay: 50 });
      await searchInput.press('Enter');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'tests/horsec-scan-result.png' });
    }
  } else {
    log('No scan input found');
  }

  // Look for the pay button if found ticket is a winner
  await page.waitForTimeout(3000);
  const payBtn = page.locator('text=PAGAR').first();
  if (await payBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    log('PAGAR button found, clicking...');
    await payBtn.click({ force: true });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'tests/horsec-scan-paid.png' });
  } else {
    log('No PAGAR button found');
  }

  log('Done. 15s...');
  await page.waitForTimeout(15000);
  await browser.close();
})().catch(e => console.error('ERROR:', e.message));
