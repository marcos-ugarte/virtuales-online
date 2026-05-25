/**
 * Extrae assets (SVG, imágenes, CSS) del panel de tickets EXPANDIDO del vendor POS
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const OUT_DIR = 'tests/extracted-ticket-panel';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: ['--allow-insecure-localhost', '--disable-web-security', '--allow-running-insecure-content', '--unsafely-treat-insecure-origin-as-secure=http://localhost:8085'],
  });
  const context = await browser.newContext({ viewport: { width: 1760, height: 858 } });
  const page = await context.newPage();

  await page.goto('https://5f40af0bf03611963f99fbbb51ec5d9c.vgpos.net/gamepool/dist/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  // Dismiss modals
  for (let i = 0; i < 5; i++) {
    const ok = page.locator('.modalButton').first();
    if (await ok.isVisible({ timeout: 1000 }).catch(() => false)) {
      await ok.click({ force: true });
      await page.waitForTimeout(1000);
    } else break;
  }

  // Login
  await page.locator('#user_input').click({ force: true });
  await page.keyboard.type('053001001001', { delay: 30 });
  await page.locator('#password_input').click({ force: true });
  await page.waitForTimeout(300);
  for (const d of '445464') {
    await page.locator('#logInPadNu' + d).click({ force: true });
    await page.waitForTimeout(150);
  }
  await page.getByText('ACCESO').click({ force: true });
  await page.waitForTimeout(15000);
  for (let i = 0; i < 5; i++) {
    const ok = page.locator('.modalButton').first();
    if (await ok.isVisible({ timeout: 1000 }).catch(() => false)) { await ok.click({ force: true }); await page.waitForTimeout(1000); } else break;
  }

  // Wait for betting
  for (let i = 0; i < 20; i++) {
    const r = await page.locator('#dos_gameRunning').evaluate(el => el && getComputedStyle(el).display !== 'none').catch(() => false);
    if (!r) break;
    await page.waitForTimeout(3000);
  }

  // Create 6 bets
  for (let r = 1; r <= 6; r++) {
    await page.locator('#dos_activeFirst' + r).click({ force: true });
    await page.waitForTimeout(150);
    await page.locator('#dos_coinBut0').click({ force: true });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1000);

  // Expand panel
  await page.locator('#dos_ticket_parent').click({ force: true }).catch(() => {});
  await page.waitForTimeout(2500);

  // Extract all SVG/img URLs from the ticket panel area + capture computed styles
  console.log('Extracting assets...');
  const assets = await page.evaluate(() => {
    const result = {
      images: [],
      bgImages: [],
      svgs: [],
      computedStyles: {},
    };

    // All elements within the bet panel area
    const ticketParent = document.querySelector('#dos_ticket_parent');
    if (!ticketParent) return { error: 'ticket_parent not found' };

    // Recursively find all elements in the ticket panel area
    const all = ticketParent.querySelectorAll('*');

    const seen = new Set();

    all.forEach((el) => {
      // <img> elements
      if (el.tagName === 'IMG' && el.src && !seen.has(el.src)) {
        seen.add(el.src);
        result.images.push({
          src: el.src,
          class: el.className?.toString()?.substring(0, 100),
          alt: el.alt,
        });
      }
      // background-image in computed style
      const styles = window.getComputedStyle(el);
      const bg = styles.backgroundImage;
      if (bg && bg !== 'none' && bg.includes('url(')) {
        const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (match && match[1] && !seen.has(match[1])) {
          seen.add(match[1]);
          result.bgImages.push({
            url: match[1],
            class: el.className?.toString()?.substring(0, 100),
            id: el.id,
          });
        }
      }
      // Inline SVG elements (capture full markup)
      if (el.tagName === 'svg' || el.tagName === 'SVG') {
        const id = el.id || el.parentElement?.className?.toString()?.substring(0, 50);
        if (!seen.has('svg-' + id)) {
          seen.add('svg-' + id);
          result.svgs.push({
            id,
            class: el.className?.toString()?.substring(0, 100),
            outerHTML: el.outerHTML.substring(0, 5000),
          });
        }
      }
    });

    // Capture key computed styles for the panel structure
    const targets = {
      ticketParent: '#dos_ticket_parent',
      ticketSwipe: '.ticketSwipe',
      tickOpenLiWarpClip: '.tickOpenLiWarpClip',
      tickOpenHead: '#dos_tickOpenHead',
      tickOpenColumns: '#dos_tickOpenColumns',
      ticketHintTxt: '.ticketHintTxt',
    };
    for (const [name, sel] of Object.entries(targets)) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      result.computedStyles[name] = {
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        bg: s.background,
        bgColor: s.backgroundColor,
        bgImage: s.backgroundImage,
        clipPath: s.clipPath,
        borderRadius: s.borderRadius,
        font: s.fontFamily,
        fontSize: s.fontSize,
        color: s.color,
      };
    }

    return result;
  });

  console.log('Found:');
  console.log('  Images:', assets.images?.length);
  console.log('  Background images:', assets.bgImages?.length);
  console.log('  Inline SVGs:', assets.svgs?.length);

  // Save metadata
  fs.writeFileSync(path.join(OUT_DIR, 'metadata.json'), JSON.stringify(assets, null, 2));

  // Download all unique URLs
  const allUrls = [
    ...(assets.images || []).map(i => i.src),
    ...(assets.bgImages || []).map(b => b.url),
  ];
  const unique = [...new Set(allUrls)];

  for (const url of unique) {
    try {
      const filename = path.basename(url.split('?')[0]) || ('asset_' + Math.random().toString(36).slice(2));
      const buf = await fetchUrl(url);
      fs.writeFileSync(path.join(OUT_DIR, filename), buf);
      console.log('  Downloaded: ' + filename);
    } catch (e) {
      console.warn('  Failed: ' + url + ' — ' + e.message);
    }
  }

  // Save inline SVGs
  (assets.svgs || []).forEach((svg, i) => {
    const filename = `inline_svg_${i}_${(svg.id || 'unknown').replace(/[^a-z0-9]/gi, '_')}.svg`;
    fs.writeFileSync(path.join(OUT_DIR, filename), svg.outerHTML);
  });

  // Take final screenshot
  await page.screenshot({ path: path.join(OUT_DIR, 'panel-expanded.png') });

  console.log('\nAll assets saved to ' + OUT_DIR);
  console.log('Closing in 10s...');
  await page.waitForTimeout(10000);
  await browser.close();
})().catch(e => console.error('ERROR:', e.message));
