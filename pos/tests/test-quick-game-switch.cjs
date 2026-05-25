/**
 * Test rápido: probar que selectGame funciona para los 4 juegos
 */
const { chromium } = require('playwright');

const POS_URL = 'http://localhost:4070/?deviceId=3ba3e63251954dbcbe34984a982d5459';
const OPERATOR = '001-001-001-004';
const PIN = '123401';

function ts() { return new Date().toISOString().slice(11, 23); }
function log(msg) { console.log('[' + ts() + '] ' + msg); }

async function selectGame(page, prefix) {
  log('Selecting game: ' + prefix);
  const activeSlide = page.locator('[data-testid="active-game-slide"]');
  const btn = activeSlide.locator('button img[alt="' + prefix + '"]').first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click({ force: true });
    await page.waitForTimeout(2500);
    log('  ✓ clicked');
    return true;
  }
  log('  ✗ button not visible');
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1760, height: 858 } });
  const page = await ctx.newPage();

  await page.goto(POS_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  // Login
  log('LOGIN...');
  const inputs = page.locator('input');
  await inputs.first().type(OPERATOR, { delay: 20 });
  await page.waitForTimeout(300);
  await inputs.nth(1).type(PIN, { delay: 20 });
  await page.waitForTimeout(300);
  await page.getByText('ACCESO').click({ force: true });
  await page.waitForTimeout(15000);

  // Verify which game we're on
  const initialActive = await page.evaluate(() => {
    const slide = document.querySelector('[data-testid="active-game-slide"]');
    return slide?.getAttribute('data-game');
  });
  log('Initial active game: ' + initialActive);

  // Try switching to all 4 games
  for (const game of ['doe', 'dot', 'hoc', 'dos', 'dot', 'hoc']) {
    await selectGame(page, game);
    const current = await page.evaluate(() => {
      const slide = document.querySelector('[data-testid="active-game-slide"]');
      return slide?.getAttribute('data-game');
    });
    log('  → active is now: ' + current + (current === game ? ' ✓' : ' ✗'));
  }

  log('Done. Closing in 5s...');
  await page.waitForTimeout(5000);
  await browser.close();
})().catch(e => console.error('ERROR:', e.message));
