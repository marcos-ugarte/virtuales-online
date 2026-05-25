/**
 * Extrae mediciones DETALLADAS del panel: columnas, fuentes, alineaciones, banda amarilla
 */
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--allow-insecure-localhost', '--disable-web-security', '--allow-running-insecure-content', '--unsafely-treat-insecure-origin-as-secure=http://localhost:8085'],
  });
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } });
  const page = await context.newPage();

  await page.goto('https://5f40af0bf03611963f99fbbb51ec5d9c.vgpos.net/gamepool/dist/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  for (let i = 0; i < 5; i++) {
    const ok = page.locator('.modalButton').first();
    if (await ok.isVisible({ timeout: 1000 }).catch(() => false)) { await ok.click({ force: true }); await page.waitForTimeout(1000); } else break;
  }

  await page.locator('#user_input').click({ force: true });
  await page.keyboard.type('053001001001', { delay: 30 });
  await page.locator('#password_input').click({ force: true });
  await page.waitForTimeout(300);
  for (const d of '445464') { await page.locator('#logInPadNu' + d).click({ force: true }); await page.waitForTimeout(150); }
  await page.getByText('ACCESO').click({ force: true });
  await page.waitForTimeout(15000);
  for (let i = 0; i < 5; i++) {
    const ok = page.locator('.modalButton').first();
    if (await ok.isVisible({ timeout: 1000 }).catch(() => false)) { await ok.click({ force: true }); await page.waitForTimeout(1000); } else break;
  }

  for (let i = 0; i < 20; i++) {
    const r = await page.locator('#dos_gameRunning').evaluate(el => el && getComputedStyle(el).display !== 'none').catch(() => false);
    if (!r) break; await page.waitForTimeout(3000);
  }

  for (let r = 1; r <= 6; r++) {
    await page.locator('#dos_activeFirst' + r).click({ force: true }); await page.waitForTimeout(150);
    await page.locator('#dos_coinBut0').click({ force: true }); await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1000);
  await page.locator('#dos_ticket_parent').click({ force: true }).catch(() => {});
  await page.waitForTimeout(2500);

  console.log('Capturing detailed measurements...');
  const data = await page.evaluate(() => {
    const get = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return {
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        bg: s.backgroundColor,
        bgImage: s.backgroundImage,
        color: s.color,
        font: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        fontStyle: s.fontStyle,
        textAlign: s.textAlign,
        padding: s.padding,
        margin: s.margin,
        border: s.border,
        clipPath: s.clipPath,
        textTransform: s.textTransform,
        letterSpacing: s.letterSpacing,
        lineHeight: s.lineHeight,
        transform: s.transform,
        text: el.textContent?.trim()?.substring(0, 60),
      };
    };

    const result = {};

    // Yellow band (total)
    result.yellowBand = get('.tickHeadColumn.tickHeadColumnAmount, .tickHeadColumnAmount');
    result.yellowBandText = get('#dos_tickOpenSum, .tickOpenSum, .ticHeadSum');

    // Column headers
    result.headColumns = get('#dos_tickOpenColumns');
    result.headNu = get('.tickHeadColumn.tickHeadColumnNr');
    result.headCuotas = null;
    result.headMonto = null;
    // Find all header column spans
    const headers = document.querySelectorAll('#dos_tickOpenColumns .tickHeadColumn');
    result.headerColumnsList = Array.from(headers).map(el => {
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return {
        text: el.textContent?.trim(),
        class: el.className,
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        font: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        textAlign: s.textAlign,
        color: s.color,
        bg: s.backgroundColor,
      };
    });

    // First bet row in expanded panel
    const firstRow = document.querySelector('.tickOpenLi:not(.openHide), [class*="tickOpenLi"]:not(.openHide)');
    if (firstRow) {
      result.firstRow = {
        rect: firstRow.getBoundingClientRect(),
        cells: Array.from(firstRow.querySelectorAll('span, div, td')).filter(el => {
          const r = el.getBoundingClientRect();
          return r.width > 10 && r.height > 5 && el.children.length === 0;
        }).slice(0, 10).map(el => {
          const r = el.getBoundingClientRect();
          const s = window.getComputedStyle(el);
          return {
            text: el.textContent?.trim()?.substring(0, 30),
            class: el.className?.toString()?.substring(0, 50),
            x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height),
            font: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, fontStyle: s.fontStyle,
            textAlign: s.textAlign, color: s.color, transform: s.transform,
          };
        }),
      };
    }

    // Yellow column "TICKET" with total
    const allYellow = document.querySelectorAll('[class*="ticHeadSum"], [class*="tickOpenSum"], [class*="tickHeadColumnAmount"]');
    result.yellowElements = Array.from(allYellow).filter(el => {
      const r = el.getBoundingClientRect();
      return r.x > -200 && r.x < 1800 && r.y < 858;
    }).map(el => {
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return {
        text: el.textContent?.trim()?.substring(0, 30),
        class: el.className?.toString()?.substring(0, 100),
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        bg: s.backgroundColor, bgImage: s.backgroundImage,
        font: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, fontStyle: s.fontStyle,
        color: s.color, padding: s.padding, transform: s.transform, clipPath: s.clipPath,
      };
    });

    return result;
  });

  fs.writeFileSync('tests/panel-detailed-measurements.json', JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));

  console.log('Done. 10s...');
  await page.waitForTimeout(10000);
  await browser.close();
})().catch(e => console.error('ERROR:', e.message));
