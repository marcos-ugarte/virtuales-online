/**
 * Test completo: 3 escenarios de login del POS
 *
 * 1. BALANCE manual con tickets ganadores sin escanear
 * 2. Resume session con tickets pendientes (carrera no terminada)
 * 3. Cierre sucio con tickets cancelados y premiados → autopay al re-login
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
          wsLog.push({ dir: 'SENT', t: ts(), target: m.target, args: m.arguments });
          if (['SendTicketStatus', 'sendTicket', 'SendBalance'].includes(m.target)) {
            const a = m.arguments?.[0] || {};
            if (m.target === 'SendTicketStatus')
              log('>>> SENT SendTicketStatus: ticket=' + a.ticketId + ' status=' + a.newStatus);
            else if (m.target === 'sendTicket')
              log('>>> SENT sendTicket: gameId=' + a.gameId + ' type=' + a.type);
            else
              log('>>> SENT ' + m.target);
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
          if (r.msgType === 'sendTicketStatus') {
            log('<<< RECV sendTicketStatus: ' + r.msgValue + ' ' + (r.errorCode || r.status || ''));
            wsLog.push({ dir: 'RECV', t: ts(), target: 'sendTicketStatus', result: r });
          }
          if (r.msgType === 'sendTicket') {
            log('<<< RECV sendTicket: ' + r.msgValue + ' ticketID=' + (r.ticketID || ''));
            wsLog.push({ dir: 'RECV', t: ts(), target: 'sendTicket', result: r });
          }
          if (r.msgType === 'sendBalance') {
            log('<<< RECV sendBalance: ' + r.msgValue);
            wsLog.push({ dir: 'RECV', t: ts(), target: 'sendBalance', result: r });
          }
          if (r.success !== undefined && r.session) {
            const oldT = r.oldTicketsToPayout || [];
            const oldB = r.oldBalanceList || [];
            log('<<< RECV Init: oldTickets=' + oldT.length + ' oldBalance=' + oldB.length +
              ' resume=' + (r.resumeStartDateTime || 'null'));
            if (oldT.length > 0) log('    oldTicketsToPayout: ' + JSON.stringify(oldT.map(t => ({ id: t.ticketId, amt: t.amount }))));
            wsLog.push({ dir: 'RECV', t: ts(), target: 'Init', result: r });
          }
        }
        if (m.type === 1 && m.target === 'gameResult') {
          const a = m.arguments?.[0];
          if (a) {
            log('<<< RECV gameResult ' + a.eventType + ' winner=#' + a.finish?.['1']?.competitorIndex);
            wsLog.push({ dir: 'RECV', t: ts(), target: 'gameResult', args: a });
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

async function waitBetting(page) {
  log('Waiting for betting...');
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

async function createTicket(page) {
  log('Creating ticket: 6 runners x $25...');
  for (let r = 1; r <= 6; r++) {
    await page.locator('[data-testid="sel-first-' + r + '"]').click({ force: true });
    await page.waitForTimeout(200);
    await page.locator('[data-testid="coin-25"]').click({ force: true });
    await page.waitForTimeout(200);
  }
  await page.locator('[data-testid="btn-print"]').click({ force: true });
  await page.waitForTimeout(5000);
  log('Ticket created');
}

async function waitDogResult(page) {
  log('Waiting for dog race result (via console)...');
  return new Promise((resolve) => {
    let resolved = false;
    const handler = msg => {
      const t = msg.text();
      if (t.includes('raceResult') && (t.includes('dos') || t.includes('dog'))) {
        if (!resolved) { resolved = true; page.off('console', handler); log('Race result detected'); resolve(true); }
      }
    };
    page.on('console', handler);
    // Also check race_state_change: running->betting means race ended
    const handler2 = msg => {
      const t = msg.text();
      if (t.includes('race_state_change') && t.includes('dos') && t.includes('running->betting')) {
        if (!resolved) { resolved = true; page.off('console', handler); page.off('console', handler2); log('Race ended (state change)'); resolve(true); }
      }
    };
    page.on('console', handler2);
    setTimeout(() => { if (!resolved) { resolved = true; page.off('console', handler); page.off('console', handler2); resolve(false); } }, 300000);
  });
}

async function clickBalance(page) {
  log('Opening VENTAS...');
  await page.getByText('VENTAS').first().click({ force: true });
  await page.waitForTimeout(1000);

  log('Clicking BALANCE button...');
  // Use the specific balance button class, not generic text "BALANCE"
  await page.locator('[class*="balanceButton"]').first().click({ force: true });
  await page.waitForTimeout(15000);
}

(async () => {
  log('=== FULL TEST: 3 Login Scenarios ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } });
  const page = await context.newPage();

  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('POS-EVENT') || t.includes('sendTicketStatus') ||
        t.includes('Autopay') || t.includes('autopay') || t.includes('handleBalance'))
      console.log('CONSOLE:', t);
  });

  await setupCDP(context, page);

  await page.goto(POS_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  // =============================================
  // ESCENARIO 1: BALANCE manual con tickets ganadores
  // =============================================
  log('\n============================================');
  log('ESCENARIO 1: BALANCE con tickets ganadores');
  log('============================================');

  await login(page);
  await waitBetting(page);
  await createTicket(page);

  if (!await waitDogResult(page)) {
    log('SKIP: no race result');
    await browser.close();
    return;
  }

  // Wait for ticket status to update
  log('Waiting 30s for ticket to settle...');
  await page.waitForTimeout(30000);

  // Screenshot VENTAS before balance
  await page.screenshot({ path: 'tests/esc1-before-balance.png' });

  const balIdx = wsLog.length;
  await clickBalance(page);
  await page.screenshot({ path: 'tests/esc1-after-balance.png' });

  log('\n--- ESCENARIO 1 RESULTS ---');
  const balMsgs = wsLog.slice(balIdx).filter(m =>
    ['SendTicketStatus', 'sendTicketStatus', 'SendBalance', 'sendBalance'].includes(m.target));
  if (balMsgs.length > 0) {
    balMsgs.forEach(m => {
      if (m.target === 'SendTicketStatus' || m.target === 'sendTicketStatus')
        log(m.dir + ' sendTicketStatus: ' + JSON.stringify(m.args?.[0] || m.result));
      else
        log(m.dir + ' sendBalance');
    });
    log('PASS: Balance flow sent messages via SignalR');
  } else {
    log('WARN: No sendTicketStatus/sendBalance messages captured');
  }
  log('--- END ESCENARIO 1 ---\n');

  // Wait for balance to complete and return to login
  log('Waiting for login screen...');
  for (let i = 0; i < 20; i++) {
    if (await page.locator('input').first().isVisible({ timeout: 1000 }).catch(() => false)) break;
    await page.waitForTimeout(2000);
  }
  await page.waitForTimeout(3000);

  // =============================================
  // ESCENARIO 2: Resume session con tickets pendientes
  // =============================================
  log('\n============================================');
  log('ESCENARIO 2: Resume con tickets pendientes');
  log('============================================');

  await login(page);
  await waitBetting(page);
  await createTicket(page);

  // DON'T wait for race — reload immediately so ticket is still pending
  log('RELOAD with pending ticket (race not finished)...');
  await page.waitForTimeout(2000);
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  const esc2Idx = wsLog.length;
  await login(page);
  await page.waitForTimeout(10000);
  await page.screenshot({ path: 'tests/esc2-resume.png' });

  log('\n--- ESCENARIO 2 RESULTS ---');
  const init2 = wsLog.slice(esc2Idx).filter(m => m.target === 'Init' && m.dir === 'RECV');
  if (init2.length > 0) {
    const r = init2[0].result;
    const resume = r.resumeStartDateTime;
    const resumeTickets = r.resumeTicketList || [];
    const pending = resumeTickets.filter(t => t.status === 'pending');
    if (resume && pending.length > 0) {
      log('PASS: Resume session detected with ' + pending.length + ' pending tickets');
      log('  resumeStartDateTime: ' + resume);
      log('  Not auto-closing (pending tickets must be resolved)');
    } else if (resume) {
      log('INFO: Resume session but no pending tickets — auto-balanced');
    } else {
      log('INFO: No resume session');
    }
  }
  log('--- END ESCENARIO 2 ---\n');

  // Wait for the race to finish (for scenario 3)
  log('Waiting for race to finish (for scenario 3)...');
  await waitDogResult(page);
  await page.waitForTimeout(5000);

  // =============================================
  // ESCENARIO 3: Cierre sucio con tickets premiados
  // =============================================
  log('\n============================================');
  log('ESCENARIO 3: Cierre sucio + autopay re-login');
  log('============================================');

  // Reload WITHOUT balance (crash with winning ticket)
  log('RELOAD without balance (winning ticket pending)...');
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  const esc3Idx = wsLog.length;
  await login(page);
  await page.waitForTimeout(15000);
  await page.screenshot({ path: 'tests/esc3-autopay.png' });

  log('\n--- ESCENARIO 3 RESULTS ---');
  const init3 = wsLog.slice(esc3Idx).filter(m => m.target === 'Init' && m.dir === 'RECV');
  const autopay3 = wsLog.slice(esc3Idx).filter(m =>
    (m.target === 'SendTicketStatus' || m.target === 'sendTicketStatus'));

  if (init3.length > 0) {
    const oldT = init3[0].result?.oldTicketsToPayout || [];
    log('Init oldTicketsToPayout: ' + oldT.length + ' tickets');
    if (oldT.length > 0) log('  ' + JSON.stringify(oldT.map(t => ({ id: t.ticketId, amt: t.amount }))));
  }

  const sentAutopay = autopay3.filter(m => m.dir === 'SENT');
  const recvAutopay = autopay3.filter(m => m.dir === 'RECV');
  if (sentAutopay.length > 0) {
    log('PASS: Autopay sent ' + sentAutopay.length + ' sendTicketStatus("autopayout") via SignalR');
    const allOk = recvAutopay.every(m => m.result?.msgValue === 'ok');
    log('Backend responses: ' + recvAutopay.map(m => m.result?.msgValue).join(', ') + (allOk ? ' (all OK)' : ' (some errors)'));
  } else {
    log('INFO: No autopay messages (no winning tickets or already paid)');
  }

  // Verify clean on next login
  log('\nVerifying clean session...');
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  const cleanIdx = wsLog.length;
  await login(page);
  await page.waitForTimeout(8000);

  const initClean = wsLog.slice(cleanIdx).filter(m => m.target === 'Init' && m.dir === 'RECV');
  if (initClean.length > 0) {
    const oldT = initClean[initClean.length - 1].result?.oldTicketsToPayout || [];
    log(oldT.length === 0 ? 'PASS: Clean session — no repeated tickets' : 'FAIL: Still ' + oldT.length + ' tickets');
  }
  log('--- END ESCENARIO 3 ---\n');

  log('\n========== ALL TESTS COMPLETE ==========');
  await page.screenshot({ path: 'tests/all-scenarios-final.png' });
  log('10s to inspect...');
  await page.waitForTimeout(10000);
  await browser.close();
})().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
