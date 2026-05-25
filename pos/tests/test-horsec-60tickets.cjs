/**
 * Test: HORSEC — 60 tickets, esperar resoluciones
 */
const { chromium } = require('playwright');
const fs = require('fs');

const POS_URL = 'http://localhost:4070/?deviceId=3ba3e63251954dbcbe34984a982d5459';
const OPERATOR = '001-001-001-004';
const PIN = '123401';
const TICKET_COUNT = 60;

const tickets = [];
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
        if (m.type === 1 && m.target === 'sendTicket') {
          wsLog.push({ dir: 'SENT', target: 'sendTicket', args: m.arguments });
        }
      }
    } catch {}
  });
  cdp.on('Network.webSocketFrameReceived', p => {
    try {
      const parts = p.response.payloadData.split('\x1e').filter(Boolean);
      for (const part of parts) {
        const m = JSON.parse(part);
        if (m.type === 3 && m.result?.msgType === 'sendTicket') {
          tickets.push({ ticketID: m.result.ticketID, status: m.result.msgValue });
          log('  ticket #' + tickets.length + ': ' + m.result.ticketID);
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

async function selectHoc(page) {
  await page.locator('img[alt="hoc"]').first().click({ force: true });
  await page.waitForTimeout(2000);
}

async function waitBetting(page) {
  for (let i = 0; i < 40; i++) {
    const overlay = page.locator('[class*="raceOverlay"], [class*="RaceActive"]').first();
    if (!await overlay.isVisible({ timeout: 500 }).catch(() => false)) return true;
    await page.waitForTimeout(3000);
  }
  return false;
}

async function createTicket(page, kind) {
  // kind: 'win-N' or 'exacta-A-B'
  const parts = kind.split('-');
  if (parts[0] === 'win') {
    const r = parseInt(parts[1]);
    await page.locator('[data-testid="sel-first-' + r + '"]').click({ force: true });
  } else {
    const a = parseInt(parts[1]);
    const b = parseInt(parts[2]);
    await page.locator('[data-testid="sel-first-' + a + '"]').click({ force: true });
    await page.waitForTimeout(150);
    await page.locator('[data-testid="sel-second-' + b + '"]').click({ force: true });
  }
  await page.waitForTimeout(150);
  await page.locator('[data-testid="coin-25"]').click({ force: true });
  await page.waitForTimeout(150);
  await page.locator('[data-testid="btn-print"]').click({ force: true });
  await page.waitForTimeout(2500);
}

(async () => {
  log('=== TEST 60 TICKETS HORSEC ===');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } });
  const page = await context.newPage();
  await setupCDP(context, page);

  await page.goto(POS_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  await login(page);
  await selectHoc(page);

  // Build ticket plan: mix WIN (7) + EXACTA combos
  const plan = [];
  // 30 WIN tickets (7 runners × 4-5 each)
  for (let i = 0; i < 30; i++) {
    plan.push('win-' + ((i % 7) + 1));
  }
  // 30 EXACTA tickets (varied combos)
  const exactaCombos = [];
  for (let a = 1; a <= 7; a++) {
    for (let b = 1; b <= 7; b++) {
      if (a !== b) exactaCombos.push([a, b]);
    }
  }
  for (let i = 0; i < 30; i++) {
    const [a, b] = exactaCombos[i % exactaCombos.length];
    plan.push('exacta-' + a + '-' + b);
  }

  log('Plan: 30 WIN + 30 EXACTA = ' + plan.length + ' tickets');

  let i = 0;
  while (i < plan.length) {
    if (!await waitBetting(page)) { log('No betting, retry'); continue; }
    log('Creating ticket ' + (i+1) + '/' + plan.length + ': ' + plan[i]);
    try {
      await createTicket(page, plan[i]);
      i++;
    } catch (err) {
      log('  ERROR: ' + err.message + ' — retry');
      await page.waitForTimeout(2000);
    }
  }

  log('\n========== ' + tickets.length + '/' + plan.length + ' tickets created ==========');

  // Save list
  fs.writeFileSync('tests/horsec-60-tickets.json', JSON.stringify(tickets, null, 2));
  log('Saved ticket IDs to tests/horsec-60-tickets.json');

  // Wait for races to settle (~5 minutes max)
  log('Waiting 5 min for race resolutions...');
  await page.waitForTimeout(300000);

  await browser.close();
})().catch(e => {
  console.error('ERROR:', e.message);
  fs.writeFileSync('tests/horsec-60-tickets.json', JSON.stringify(tickets, null, 2));
  process.exit(1);
});
