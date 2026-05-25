/**
 * Test EXHAUSTIVO de larga duración para nuestro POS (NO vendor)
 * - Crea ~10 tickets/hora en varios juegos (dos, doe, dot, hoc)
 * - Mezcla WIN y EXACTA
 * - Espera resultados → escanea tickets ganadores → paga
 * - Cada hora: hace BALANCE y vuelve a logear
 * - Loguea TODO a tests/overnight-report.json
 */
const { chromium } = require('playwright');
const fs = require('fs');

const POS_URL = 'http://localhost:4070/?deviceId=3ba3e63251954dbcbe34984a982d5459';
const OPERATOR = '001-001-001-004';
const PIN = '123401';
const REPORT_FILE = 'tests/overnight-report.json';
const DURATION_MS = 6 * 60 * 60 * 1000; // 6 horas
const TICKET_INTERVAL_MS = 6 * 60 * 1000; // 1 ticket cada 6 min
const BALANCE_INTERVAL_MS = 60 * 60 * 1000; // BALANCE cada hora

const GAMES = ['dos', 'doe', 'dot', 'hoc']
const RUNNERS_BY_GAME = { dos: 6, doe: 8, dot: 6, hoc: 7 }

const report = {
  startedAt: new Date().toISOString(),
  events: [],
  errors: [],
  ticketsCreated: 0,
  ticketsPaid: 0,
  balancesDone: 0,
  loginsCount: 0,
}

function ts() { return new Date().toISOString().slice(11, 23); }
function log(msg) {
  const line = '[' + ts() + '] ' + msg;
  console.log(line);
  report.events.push({ t: new Date().toISOString(), msg });
  saveReport();
}
function logError(err, ctx) {
  report.errors.push({ t: new Date().toISOString(), ctx, error: err?.message || String(err) });
  saveReport();
}
function saveReport() {
  try { fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2)); } catch {}
}

async function dismissModals(page) {
  for (let i = 0; i < 5; i++) {
    const ok = page.locator('.modalButton, #infomodalPosButton').first();
    if (await ok.isVisible({ timeout: 800 }).catch(() => false)) {
      await ok.click({ force: true }).catch(() => {});
      await page.waitForTimeout(800);
    } else break;
  }
}

async function login(page) {
  log('LOGIN attempt');
  try {
    const inputs = page.locator('input');
    await inputs.first().fill('').catch(() => {});
    await inputs.first().type(OPERATOR, { delay: 20 });
    await page.waitForTimeout(300);
    await inputs.nth(1).fill('').catch(() => {});
    await inputs.nth(1).type(PIN, { delay: 20 });
    await page.waitForTimeout(300);
    await page.getByText('ACCESO').click({ force: true });
    await page.waitForTimeout(15000);
    await dismissModals(page);
    report.loginsCount++;
    log('LOGIN ok (#' + report.loginsCount + ')');
    return true;
  } catch (e) {
    logError(e, 'login');
    return false;
  }
}

async function selectGame(page, prefix) {
  try {
    // Game selectors are inside each slide. We target the ACTIVE slide so we
    // hit the visible buttons (not the off-screen carousel slides).
    const activeSlide = page.locator('[data-testid="active-game-slide"]');
    const btn = activeSlide.locator('button img[alt="' + prefix + '"]').first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click({ force: true });
      await page.waitForTimeout(2500);
      return true;
    }
    // Fallback: any visible game selector button with that alt
    const all = page.locator('button img[alt="' + prefix + '"]');
    const count = await all.count();
    for (let i = 0; i < count; i++) {
      const el = all.nth(i);
      if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
        const box = await el.boundingBox().catch(() => null);
        if (box && box.x >= 0 && box.x < 1760) {
          await el.click({ force: true });
          await page.waitForTimeout(2500);
          return true;
        }
      }
    }
    log('  selectGame ' + prefix + ' — no visible button found');
    return false;
  } catch (e) {
    logError(e, 'selectGame ' + prefix);
    return false;
  }
}

async function waitBetting(page) {
  for (let i = 0; i < 30; i++) {
    const overlay = await page.locator('[class*="raceOverlay"]').first().isVisible({ timeout: 500 }).catch(() => false);
    if (!overlay) return true;
    await page.waitForTimeout(3000);
  }
  return false;
}

async function createTicket(page, game) {
  const maxRunners = RUNNERS_BY_GAME[game];
  const useExacta = Math.random() < 0.4;
  try {
    if (useExacta) {
      const a = 1 + Math.floor(Math.random() * maxRunners);
      let b = 1 + Math.floor(Math.random() * maxRunners);
      if (a === b) b = (b % maxRunners) + 1;
      await page.locator('[data-testid="sel-first-' + a + '"]').click({ force: true });
      await page.waitForTimeout(150);
      await page.locator('[data-testid="sel-second-' + b + '"]').click({ force: true });
      await page.waitForTimeout(150);
      await page.locator('[data-testid="coin-25"]').click({ force: true });
      await page.waitForTimeout(150);
      log('  ticket EXACTA ' + game + ' ' + a + '-' + b);
    } else {
      const r = 1 + Math.floor(Math.random() * maxRunners);
      await page.locator('[data-testid="sel-first-' + r + '"]').click({ force: true });
      await page.waitForTimeout(150);
      await page.locator('[data-testid="coin-25"]').click({ force: true });
      await page.waitForTimeout(150);
      log('  ticket WIN ' + game + ' #' + r);
    }
    await page.locator('[data-testid="btn-print"]').click({ force: true });
    await page.waitForTimeout(4000);
    await dismissModals(page);
    report.ticketsCreated++;
    return true;
  } catch (e) {
    logError(e, 'createTicket ' + game);
    return false;
  }
}

async function clickBalance(page, game) {
  try {
    log('BALANCE attempt for ' + game);
    const activeSlide = page.locator('[data-testid="active-game-slide"]');
    await activeSlide.locator('text=VENTAS').first().click({ force: true });
    await page.waitForTimeout(1500);
    const btn = activeSlide.locator('[class*="balanceButton"]').first();
    if (!await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      log('  BALANCE button not visible, skipping');
      return false;
    }
    await btn.click({ force: true });
    // Wait for the balance flow + autopay receipts + sendBalance
    await page.waitForTimeout(20000);
    await dismissModals(page);
    report.balancesDone++;
    log('  BALANCE done (#' + report.balancesDone + ')');
    return true;
  } catch (e) {
    logError(e, 'clickBalance');
    return false;
  }
}

async function reloadAndLogin(page) {
  log('RELOAD + RE-LOGIN');
  try {
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    return await login(page);
  } catch (e) {
    logError(e, 'reloadAndLogin');
    return false;
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--allow-insecure-localhost', '--disable-web-security', '--allow-running-insecure-content', '--unsafely-treat-insecure-origin-as-secure=http://localhost:8085'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1760, height: 858 } });
  const page = await ctx.newPage();

  // Capture WS messages for autopay tracking
  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('Autopaid') || t.includes('payout confirmed')) {
      log('  ' + t.substring(0, 200));
      if (t.includes('Autopaid') || t.includes('payout')) report.ticketsPaid++;
    }
  });

  await page.goto(POS_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  await login(page);

  const startTime = Date.now();
  let lastBalance = startTime;
  let nextTicketTime = startTime + 30000; // Primer ticket a los 30s

  while (Date.now() - startTime < DURATION_MS) {
    const now = Date.now();

    // BALANCE cada hora
    if (now - lastBalance > BALANCE_INTERVAL_MS) {
      const game = GAMES[Math.floor(Math.random() * GAMES.length)];
      await selectGame(page, game);
      await clickBalance(page, game);
      await page.waitForTimeout(5000);
      // After balance, may need re-login
      const loginVisible = await page.locator('input').first().isVisible({ timeout: 2000 }).catch(() => false);
      if (loginVisible) await login(page);
      lastBalance = Date.now();
      continue;
    }

    // Crear ticket
    if (now >= nextTicketTime) {
      const game = GAMES[Math.floor(Math.random() * GAMES.length)];
      const ok = await selectGame(page, game);
      if (ok && await waitBetting(page)) {
        await createTicket(page, game);
      }
      nextTicketTime = now + TICKET_INTERVAL_MS;
    }

    await page.waitForTimeout(10000);
  }

  log('=== TEST COMPLETE ===');
  log('Created: ' + report.ticketsCreated + ' tickets');
  log('Paid: ' + report.ticketsPaid + ' tickets');
  log('Balances: ' + report.balancesDone);
  log('Logins: ' + report.loginsCount);
  log('Errors: ' + report.errors.length);
  report.endedAt = new Date().toISOString();
  saveReport();
  await browser.close();
})().catch(e => {
  logError(e, 'main');
  saveReport();
});
