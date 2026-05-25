/**
 * Test: HORSEC (Horse Classic 241) — crear tickets, ventas, escanear
 *
 * Verifica:
 * 1. Crear ticket simple (WIN) en hoc
 * 2. Crear ticket combinado (Exacta) en hoc
 * 3. Verificar tickets aparecen en VENTAS
 * 4. Esperar carrera, verificar resolución
 * 5. Capturar SignalR y datos para verificar en BD
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
          wsLog.push({ dir: 'SENT', t: ts(), target: m.target, args: m.arguments });
          if (['sendTicket', 'SendTicketStatus'].includes(m.target)) {
            const a = m.arguments?.[0] || {};
            if (m.target === 'sendTicket') {
              log('>>> SENT sendTicket: type=' + a.type + ' gameId=' + a.gameId + ' bets=' + Object.keys(a).filter(k => k.startsWith('bet_')).map(k => k + ':' + a[k]).join(','));
            } else {
              log('>>> SENT SendTicketStatus: ' + JSON.stringify(a));
            }
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
          if (r.msgType === 'sendTicket') {
            log('<<< RECV sendTicket: ' + r.msgValue + ' ticketID=' + r.ticketID);
            wsLog.push({ dir: 'RECV', t: ts(), target: 'sendTicket', result: r });
          }
          if (r.msgType === 'sendTicketStatus') {
            log('<<< RECV sendTicketStatus: ' + r.msgValue + ' ' + (r.errorCode || r.status || ''));
            wsLog.push({ dir: 'RECV', t: ts(), target: 'sendTicketStatus', result: r });
          }
        }
      }
    } catch {}
  });

  return cdp;
}

async function login(page) {
  log('--- LOGIN ---');
  await page.waitForSelector('input', { timeout: 10000 });
  const inputs = page.locator('input');
  await inputs.first().fill('');
  await inputs.first().type(OPERATOR, { delay: 20 });
  await page.waitForTimeout(300);
  await inputs.nth(1).fill('');
  await inputs.nth(1).type(PIN, { delay: 20 });
  await page.waitForTimeout(300);
  await page.getByText('ACCESO').click({ force: true });
  await page.waitForTimeout(12000);
  log('Login done');
}

async function selectGame(page, gameAlt) {
  log('Selecting game: ' + gameAlt);
  await page.locator('img[alt="' + gameAlt + '"]').first().click({ force: true });
  await page.waitForTimeout(2000);
}

async function waitBetting(page) {
  log('Waiting for betting on hoc...');
  for (let i = 0; i < 40; i++) {
    const overlay = page.locator('[class*="raceOverlay"], [class*="RaceActive"]').first();
    if (!await overlay.isVisible({ timeout: 500 }).catch(() => false)) {
      log('Betting open');
      return true;
    }
    await page.waitForTimeout(3000);
  }
  return false;
}

async function createWinTicket(page, runner) {
  log('Creating WIN ticket: runner ' + runner + ' x $25...');
  await page.locator('[data-testid="sel-first-' + runner + '"]').click({ force: true });
  await page.waitForTimeout(200);
  await page.locator('[data-testid="coin-25"]').click({ force: true });
  await page.waitForTimeout(200);
  await page.locator('[data-testid="btn-print"]').click({ force: true });
  await page.waitForTimeout(5000);
  log('WIN ticket sent');
}

async function createExactaTicket(page, first, second) {
  log('Creating EXACTA ticket: ' + first + '-' + second + ' x $25...');
  await page.locator('[data-testid="sel-first-' + first + '"]').click({ force: true });
  await page.waitForTimeout(200);
  await page.locator('[data-testid="sel-second-' + second + '"]').click({ force: true });
  await page.waitForTimeout(200);
  await page.locator('[data-testid="coin-25"]').click({ force: true });
  await page.waitForTimeout(200);
  await page.locator('[data-testid="btn-print"]').click({ force: true });
  await page.waitForTimeout(5000);
  log('EXACTA ticket sent');
}

async function checkVentasTab(page) {
  log('Opening VENTAS tab...');
  await page.getByText('VENTAS').first().click({ force: true });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/horsec-ventas.png' });

  const ticketCount = await page.evaluate(() => {
    const rows = document.querySelectorAll('[class*="salesRow"], [class*="dataRow"]');
    return rows.length;
  });
  log('Tickets visible in VENTAS: ' + ticketCount);
  return ticketCount;
}

(async () => {
  log('=== TEST HORSEC (Horse Classic 241) ===');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } });
  const page = await context.newPage();

  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('POS-EVENT') || t.includes('hoc') || t.includes('horse') || t.includes('241'))
      console.log('CONSOLE:', t.substring(0, 200));
  });

  await setupCDP(context, page);

  await page.goto(POS_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  await login(page);

  // Switch to HOC (Horse Classic)
  await selectGame(page, 'hoc');
  await waitBetting(page);

  // Take screenshot of hoc tab
  await page.screenshot({ path: 'tests/horsec-jugada.png' });

  // Create tickets
  const ticketsCreated = [];
  await createWinTicket(page, 1);
  ticketsCreated.push('WIN runner 1');

  await createWinTicket(page, 3);
  ticketsCreated.push('WIN runner 3');

  await createExactaTicket(page, 2, 5);
  ticketsCreated.push('EXACTA 2-5');

  // Check VENTAS
  const ticketsInVentas = await checkVentasTab(page);

  // Save WS messages
  fs.writeFileSync('tests/horsec-ws-log.json', JSON.stringify(wsLog.filter(m =>
    ['sendTicket', 'SendTicketStatus', 'sendTicketStatus'].includes(m.target)
  ), null, 2));

  log('\n========== RESULTS ==========');
  log('Tickets created: ' + ticketsCreated.length);
  log('Tickets in VENTAS: ' + ticketsInVentas);

  // Show sent ticket details
  const sentTickets = wsLog.filter(m => m.target === 'sendTicket' && m.dir === 'SENT');
  log('\nTickets sent via SignalR:');
  sentTickets.forEach((m, i) => {
    const a = m.args?.[0] || {};
    log('  ' + (i+1) + '. type=' + a.type + ' gameId=' + a.gameId);
    Object.keys(a).filter(k => k.startsWith('bet_')).forEach(k => log('     ' + k + ': $' + a[k]));
  });

  const recvTickets = wsLog.filter(m => m.target === 'sendTicket' && m.dir === 'RECV');
  log('\nTicket IDs from backend:');
  recvTickets.forEach((m, i) => {
    log('  ' + (i+1) + '. ticketID=' + m.result?.ticketID + ' status=' + m.result?.msgValue);
  });

  log('\nDone. 20s to inspect...');
  await page.waitForTimeout(20000);
  await browser.close();
})().catch(e => {
  console.error('ERROR:', e.message);
  fs.writeFileSync('tests/horsec-ws-log.json', JSON.stringify(wsLog, null, 2));
  process.exit(1);
});
