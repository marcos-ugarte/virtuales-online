/**
 * Test rápido: crear 1 ticket en cada juego (dos, doe, dot, hoc)
 */
const { chromium } = require('playwright');

const POS_URL = 'http://localhost:4070/?deviceId=3ba3e63251954dbcbe34984a982d5459';
const OPERATOR = '001-001-001-004';
const PIN = '123401';

const created = [];
function ts() { return new Date().toISOString().slice(11, 23); }
function log(msg) { console.log('[' + ts() + '] ' + msg); }

async function selectGame(page, prefix) {
  log('→ Switching to ' + prefix);
  const activeSlide = page.locator('[data-testid="active-game-slide"]');
  const btn = activeSlide.locator('button img[alt="' + prefix + '"]').first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click({ force: true });
    await page.waitForTimeout(2500);
    return true;
  }
  return false;
}

async function waitBetting(page) {
  for (let i = 0; i < 30; i++) {
    const overlay = await page.locator('[class*="raceOverlay"]').first().isVisible({ timeout: 500 }).catch(() => false);
    if (!overlay) return true;
    await page.waitForTimeout(3000);
  }
  return false;
}

async function createWinTicket(page, prefix, runner) {
  log('  Creating WIN ticket: runner ' + runner);
  try {
    await page.locator('[data-testid="sel-first-' + runner + '"]').click({ force: true, timeout: 5000 });
    await page.waitForTimeout(200);
    await page.locator('[data-testid="coin-25"]').click({ force: true, timeout: 5000 });
    await page.waitForTimeout(200);
    await page.locator('[data-testid="btn-print"]').click({ force: true, timeout: 5000 });
    await page.waitForTimeout(4000);
    log('  ✓ ticket sent');
    return true;
  } catch (e) {
    log('  ✗ failed: ' + e.message.split('\n')[0]);
    return false;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1760, height: 858 } });
  const page = await ctx.newPage();

  // Capture tickets created via console
  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('ticket sent') || t.includes('Ticket added') || t.includes('sendTicket')) {
      const m = t.match(/ticketId[:\s"]+([a-f0-9]{16})/);
      if (m && !created.includes(m[1])) {
        created.push(m[1]);
      }
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

  for (const game of ['dos', 'doe', 'dot', 'hoc']) {
    await selectGame(page, game);
    if (await waitBetting(page)) {
      await createWinTicket(page, game, 1);
    } else {
      log('  ✗ no betting available');
    }
  }

  log('\n=== RESULT ===');
  log('Tickets created: ' + created.length);
  created.forEach(t => log('  ' + t));

  await page.waitForTimeout(5000);
  await browser.close();
})().catch(e => console.error('ERROR:', e.message));
