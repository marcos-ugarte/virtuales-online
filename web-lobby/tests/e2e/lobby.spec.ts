import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Test 1: Structural render
// ---------------------------------------------------------------------------
test('renders navbar, section header, and three race cards', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.navbar')).toBeVisible();
  await expect(page.locator('.lobby-section-header h1')).toHaveText(/Upcoming Races/i);
  await expect(page.locator('.race-card')).toHaveCount(3);
});

// ---------------------------------------------------------------------------
// Test 2: Status badge becomes LIVE when relay is connected
// ---------------------------------------------------------------------------
test('section badge shows LIVE once relay is connected', async ({ page }) => {
  await page.goto('/');
  // Initially might say CONNECTING; expect it to flip to LIVE within 5 s
  await expect(page.locator('.section-badge')).toHaveText(/LIVE|CONNECTED/i, { timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// Test 3: Each card has its expected title text
// ---------------------------------------------------------------------------
test('each card shows its game-type title', async ({ page }) => {
  await page.goto('/');
  // Wait for content to populate (data arrives from relay)
  await expect(page.locator('.race-card').first()).toBeVisible();

  const card1Title = page.locator('.race-card').nth(0).locator('.card-race-title');
  const card2Title = page.locator('.race-card').nth(1).locator('.card-race-title');
  const card3Title = page.locator('.race-card').nth(2).locator('.card-race-title');

  await expect(card1Title).toContainText(/Greyhound Racing.*London/i);
  await expect(card2Title).toContainText(/Greyhound Racing.*Hove/i);
  await expect(card3Title).toContainText(/Horse Racing.*Royal Ascot/i);
});

// ---------------------------------------------------------------------------
// Test 4: Countdowns show valid MM:SS and tick down
// ---------------------------------------------------------------------------
test('countdown shows MM:SS and decrements after 1 s', async ({ page }) => {
  await page.goto('/');

  // Use the outer overlay div which is always unique within a card
  const overlay = page.locator('.race-card').first().locator('.card-countdown-overlay');
  await expect(overlay).toBeVisible({ timeout: 5_000 });

  // Read initial value via innerText to collapse the whole overlay content
  const text1 = await overlay.innerText();

  // If LIVE NOW (race already started): test passes — not all cards will be in pre-state at any moment.
  if (text1 && /LIVE/i.test(text1)) {
    return; // covered in another test
  }

  // Else expect STARTS IN MM:SS format
  expect(text1).toMatch(/STARTS IN \d{2}:\d{2}/);

  // Wait 1.5 s and expect value to have decreased (or stayed if at boundary)
  await page.waitForTimeout(1500);
  const text2 = await overlay.innerText();
  expect(text2).toMatch(/STARTS IN \d{2}:\d{2}|LIVE NOW/);

  // Parse seconds and assert text2 <= text1 (allowing boundary flip to LIVE)
  const parse = (t: string) => {
    if (/LIVE/i.test(t)) return -1; // ahead of countdown
    const m = t.match(/(\d{2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  };
  const s1 = parse(text1!);
  const s2 = parse(text2!);
  expect(s2).toBeLessThanOrEqual(s1);
});

// ---------------------------------------------------------------------------
// Test 5: Each card lists the right number of participant rows
// ---------------------------------------------------------------------------
test('participant counts: dos=6, doe=8, hoc=7', async ({ page }) => {
  await page.goto('/');
  // Wait for tables to populate
  await expect(page.locator('.race-card').first().locator('.participant-row')).toHaveCount(6, { timeout: 10_000 });
  await expect(page.locator('.race-card').nth(1).locator('.participant-row')).toHaveCount(8);
  await expect(page.locator('.race-card').nth(2).locator('.participant-row')).toHaveCount(7);
});

// ---------------------------------------------------------------------------
// Test 6: Each row shows hat shield + name + odds
// ---------------------------------------------------------------------------
test('first card has hat images and odds in every row', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.race-card').first();
  await expect(card.locator('.hat-img--shield').first()).toBeVisible({ timeout: 10_000 });
  await expect(card.locator('.hat-img--shield')).toHaveCount(6);

  const winCells = card.locator('.td-win .odd-box');
  await expect(winCells).toHaveCount(6);
  // Every WIN cell should contain a number with two decimals
  for (let i = 0; i < 6; i++) {
    await expect(winCells.nth(i)).toHaveText(/\d+\.\d{2}/);
  }
});

// ---------------------------------------------------------------------------
// Test 7: Hero photos load (200 OK, not broken)
// ---------------------------------------------------------------------------
test('hero photos load successfully', async ({ page }) => {
  await page.goto('/');
  // Wait for cards to mount
  await expect(page.locator('.race-card').first()).toBeVisible({ timeout: 5_000 });

  // Check each card's hero img has naturalWidth > 0
  const heroes = page.locator('.race-card .card-hero img');
  await expect(heroes).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    const w = await heroes.nth(i).evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(w).toBeGreaterThan(0);
  }
});
