/**
 * Test: Nuestro POS (virteon-platform) — Autopay via SignalR
 * Mismo procedimiento que el test del vendor de esta mañana:
 * 1. Login, crear ticket ganador, reload sin balance
 * 2. Re-login → verificar autopay via SignalR
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

  // Capture SignalR messages (JSON protocol uses 0x1E separator)
  cdp.on('Network.webSocketFrameSent', p => {
    try {
      const parts = p.response.payloadData.split('\x1e').filter(Boolean);
      for (const part of parts) {
        const m = JSON.parse(part);
        if (m.type === 1 && m.target) {
          wsLog.push({ dir: 'SENT', t: ts(), target: m.target, args: m.arguments });
          if (['SendTicketStatus', 'sendTicket', 'SendBalance'].includes(m.target)) {
            log('>>> SENT ' + m.target + ': ' + JSON.stringify(m.arguments?.[0] || {}));
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
        // type=3 = completion (response to invoke)
        if (m.type === 3 && m.result) {
          const r = m.result;
          if (r.msgType === 'sendTicketStatus') {
            log('<<< RECV sendTicketStatus: ' + JSON.stringify(r));
            wsLog.push({ dir: 'RECV', t: ts(), target: 'sendTicketStatus', result: r });
          }
          if (r.success !== undefined && r.session) {
            const oldT = r.oldTicketsToPayout || [];
            const oldB = r.oldBalanceList || [];
            log('<<< RECV Init: session=' + (r.session?.sessionCode || '?') +
              ' oldTickets=' + oldT.length + ' oldBalance=' + oldB.length +
              ' resume=' + (r.resumeStartDateTime || 'null'));
            if (oldT.length > 0) log('    oldTicketsToPayout: ' + JSON.stringify(oldT));
            wsLog.push({ dir: 'RECV', t: ts(), target: 'Init', result: r });
          }
        }
        // type=1 with target = server push (gameResult, etc)
        if (m.type === 1 && m.target) {
          if (m.target === 'gameResult') {
            const args = m.arguments?.[0];
            log('<<< RECV gameResult ' + (args?.eventType || '?') +
              ' winner=#' + (args?.finish?.['1']?.competitorIndex || '?'));
            wsLog.push({ dir: 'RECV', t: ts(), target: 'gameResult', args });
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
  await page.waitForTimeout(10000);
  log('Login submitted');
}

async function waitBetting(page) {
  log('Waiting for betting phase...');
  for (let i = 0; i < 40; i++) {
    const overlay = page.locator('[class*="raceOverlay"], [class*="RaceActive"]').first();
    if (!await overlay.isVisible({ timeout: 500 }).catch(() => false)) {
      log('Betting open');
      return true;
    }
    await page.waitForTimeout(3000);
  }
  log('TIMEOUT betting');
  return false;
}

async function createTicketAllRunners(page) {
  log('Creating ticket: 6 runners x $25...');
  // Select each runner and add $25
  for (let r = 1; r <= 6; r++) {
    await page.locator('[data-testid="sel-first-' + r + '"]').click({ force: true }).catch(async () => {
      // Fallback: try clicking by position in the runner grid
      log('  data-testid not found for runner ' + r + ', trying alt selector...');
    });
    await page.waitForTimeout(300);
    await page.locator('[data-testid="coin-25"]').click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }
  // Print
  await page.locator('[data-testid="btn-print"]').click({ force: true }).catch(() => {});
  await page.waitForTimeout(5000);
  log('Ticket sent');
}

async function waitDogResult(sinceIdx) {
  log('Waiting for dog race result...');
  for (let i = 0; i < 150; i++) {
    const r = wsLog.slice(sinceIdx).find(m =>
      m.target === 'gameResult' && (m.args?.eventType === 'dog' || m.args?.eventType === 'dog6'));
    if (r) {
      log('Race done! Winner #' + (r.args?.finish?.['1']?.competitorIndex || '?'));
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  log('TIMEOUT race');
  return false;
}

(async () => {
  log('=== TEST: Autopay via SignalR (nuestro POS) ===');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } });
  const page = await context.newPage();

  // Capture POS console for autopay events
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('POS-EVENT') || text.includes('sendTicketStatus') ||
        text.includes('Autopay') || text.includes('autopay') || text.includes('Autopaid')) {
      log('CONSOLE: ' + text);
    }
  });

  await setupCDP(context, page);

  await page.goto(POS_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  // =============================================
  // STEP 1: Login + create ticket + crash
  // =============================================
  log('\n=== STEP 1: Login, ticket, crash ===');
  await login(page);
  await waitBetting(page);

  // Screenshot to verify UI state
  await page.screenshot({ path: 'tests/autopay-step1-dashboard.png' });

  await createTicketAllRunners(page);

  const raceIdx = wsLog.length;
  const raceOk = await waitDogResult(raceIdx);
  if (!raceOk) {
    log('No race result. Aborting.');
    await page.screenshot({ path: 'tests/autopay-no-race.png' });
    await browser.close();
    return;
  }

  await page.waitForTimeout(5000);

  // RELOAD without balance
  log('RELOAD without balance (crash)...');
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  // =============================================
  // STEP 2: Re-login → expect autopay
  // =============================================
  log('\n=== STEP 2: Re-login — expect autopay via SignalR ===');
  const beforeLogin2 = wsLog.length;
  await login(page);

  // Wait for autopay flow to complete
  await page.waitForTimeout(15000);
  await page.screenshot({ path: 'tests/autopay-step2-after-login.png' });

  // Analyze results
  const autopayMsgs = wsLog.slice(beforeLogin2).filter(m =>
    (m.target === 'SendTicketStatus' || m.target === 'sendTicketStatus') && m.dir === 'SENT');
  const autopayRecvs = wsLog.slice(beforeLogin2).filter(m =>
    m.target === 'sendTicketStatus' && m.dir === 'RECV');
  const initMsgs = wsLog.slice(beforeLogin2).filter(m => m.target === 'Init' && m.dir === 'RECV');

  log('\n========== RESULTS ==========');

  if (initMsgs.length > 0) {
    const init = initMsgs[0].result;
    const oldTickets = init?.oldTicketsToPayout || [];
    log('Init oldTicketsToPayout: ' + oldTickets.length + ' tickets');
    if (oldTickets.length > 0) log('  ' + JSON.stringify(oldTickets));
  }

  if (autopayMsgs.length > 0) {
    log('PASS: sendTicketStatus("autopayout") sent via SignalR (' + autopayMsgs.length + ' messages)');
    autopayMsgs.forEach(m => log('  SENT: ' + JSON.stringify(m.args)));
  } else {
    log('FAIL: No sendTicketStatus messages sent');
  }

  if (autopayRecvs.length > 0) {
    const allOk = autopayRecvs.every(m => m.result?.msgValue === 'ok');
    log((allOk ? 'PASS' : 'FAIL') + ': Backend responses: ' +
      autopayRecvs.map(m => m.result?.msgValue).join(', '));
  }

  // =============================================
  // STEP 3: Re-login again — verify clean
  // =============================================
  log('\n=== STEP 3: Verify clean session ===');
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  const beforeLogin3 = wsLog.length;
  await login(page);
  await page.waitForTimeout(8000);

  const init3 = wsLog.slice(beforeLogin3).filter(m => m.target === 'Init' && m.dir === 'RECV');
  if (init3.length > 0) {
    const tickets = init3[0].result?.oldTicketsToPayout || [];
    if (tickets.length === 0) {
      log('PASS: oldTicketsToPayout is empty — autopay worked correctly');
    } else {
      log('FAIL: oldTicketsToPayout still has ' + tickets.length + ' tickets');
    }
  }

  log('\n========== TEST COMPLETE ==========');
  await page.screenshot({ path: 'tests/autopay-final.png' });
  log('15s to inspect...');
  await page.waitForTimeout(15000);
  await browser.close();
})().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
