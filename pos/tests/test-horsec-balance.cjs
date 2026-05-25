/**
 * Test: HORSEC — Balance manual con tickets ganadores
 * Login → click BALANCE → verifica que paga ganadores y cierra sesión
 */
const { chromium } = require('playwright');
const fs = require('fs');

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
          if (['SendTicketStatus', 'SendBalance'].includes(m.target)) {
            const a = m.arguments?.[0] || {};
            if (m.target === 'SendTicketStatus') {
              log('  >>> ' + m.target + ' ticket=' + a.ticketId + ' status=' + a.newStatus);
            } else {
              log('  >>> ' + m.target + ' bet=' + a.totalBet + ' win=' + a.totalWin);
            }
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
          if (['sendTicketStatus', 'sendBalance'].includes(r.msgType)) {
            log('  <<< ' + r.msgType + ': ' + r.msgValue + ' ' + (r.errorCode || ''));
            wsLog.push({ dir: 'RECV', target: r.msgType, result: r });
          }
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
  log('=== TEST BALANCE HORSEC ===');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } });
  const page = await context.newPage();
  await setupCDP(context, page);

  await page.goto(POS_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  await login(page);

  // Wait for any auto-flow to finish (resume balance, autopay, etc.)
  await page.waitForTimeout(10000);

  // Switch to hoc tab
  log('Switching to hoc tab...');
  await page.locator('img[alt="hoc"]').first().click({ force: true });
  await page.waitForTimeout(3000);

  // Open VENTAS in hoc slide
  log('Opening VENTAS...');
  // Find the VENTAS button on the active slide (hoc)
  const activeSlide = page.locator('[data-testid="active-game-slide"]');
  await activeSlide.locator('text=VENTAS').click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/horsec-ventas-before-balance.png' });

  // Capture VENTAS totals
  const totals = await page.evaluate(() => {
    const get = (sel) => document.querySelector(sel)?.textContent?.trim();
    return {
      jugadas: get('[class*="colJugadas"] [class*="summaryValue"]'),
      monto: get('[class*="colMonto"] [class*="summaryValue"]'),
      inversion: get('[class*="colInversion"] [class*="summaryValue"]'),
      pagar: get('[class*="colPagar"] [class*="summaryValue"]'),
      balance: get('[class*="colBalance"] [class*="summaryValue"]'),
    };
  });
  log('VENTAS totals: ' + JSON.stringify(totals));

  // Click BALANCE
  log('Clicking BALANCE...');
  const beforeBal = wsLog.length;
  await activeSlide.locator('[class*="balanceButton"]').first().click({ force: true });
  await page.waitForTimeout(20000);
  await page.screenshot({ path: 'tests/horsec-after-balance.png' });

  log('\n========== BALANCE RESULTS ==========');
  const sentStatus = wsLog.slice(beforeBal).filter(m => m.target === 'SendTicketStatus' && m.dir === 'SENT');
  const recvStatus = wsLog.slice(beforeBal).filter(m => m.target === 'sendTicketStatus' && m.dir === 'RECV');
  const sentBalance = wsLog.slice(beforeBal).filter(m => m.target === 'SendBalance' && m.dir === 'SENT');
  const recvBalance = wsLog.slice(beforeBal).filter(m => m.target === 'sendBalance' && m.dir === 'RECV');

  log('sendTicketStatus sent: ' + sentStatus.length);
  log('sendTicketStatus OK: ' + recvStatus.filter(m => m.result?.msgValue === 'ok').length);
  log('sendTicketStatus errors: ' + recvStatus.filter(m => m.result?.msgValue !== 'ok').length);
  log('sendBalance sent: ' + sentBalance.length);
  log('sendBalance OK: ' + recvBalance.filter(m => m.result?.msgValue === 'ok').length);

  if (sentBalance.length > 0) {
    const a = sentBalance[0].args?.[0];
    log('Balance details: bet=' + a.totalBet + ' win=' + a.totalWin + ' cassa=' + a.totalCassa);
  }

  fs.writeFileSync('tests/horsec-balance-log.json', JSON.stringify(wsLog, null, 2));
  log('Saved log');
  log('Done. 10s...');
  await page.waitForTimeout(10000);
  await browser.close();
})().catch(e => {
  console.error('ERROR:', e.message);
  fs.writeFileSync('tests/horsec-balance-log.json', JSON.stringify(wsLog, null, 2));
  process.exit(1);
});
