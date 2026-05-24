import { test, expect } from '@playwright/test';

test('lobby renders race data from /web-ds', async ({ page }) => {
  const wsFrames: Array<{ dir: string; msgType?: string }> = [];
  page.on('websocket', ws => {
    ws.on('framesent', e => {
      try {
        const msg = JSON.parse(e.payload as string);
        wsFrames.push({ dir: 'out', msgType: msg.msgType });
      } catch {}
    });
    ws.on('framereceived', e => {
      try {
        const msg = JSON.parse(e.payload as string);
        wsFrames.push({ dir: 'in', msgType: msg.msgType });
      } catch {}
    });
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Wait up to 8s for the lobby to render at least one race card with a known game label.
  await expect(
    page.getByText(/Greyhound|Horse/i).first()
  ).toBeVisible({ timeout: 8000 });

  // Wait a bit more for some WS traffic
  await page.waitForTimeout(2000);

  console.log('FRAME COUNTS:');
  const counts: Record<string, number> = {};
  for (const f of wsFrames) {
    const key = `${f.dir}:${f.msgType ?? '?'}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k} = ${v}`);

  // Sanity: we should have at least sent init and received init+gameRound or init.
  const sentInit = wsFrames.some(f => f.dir === 'out' && f.msgType === 'init');
  const gotInit = wsFrames.some(f => f.dir === 'in' && f.msgType === 'init');
  expect(sentInit).toBe(true);
  expect(gotInit).toBe(true);
});
