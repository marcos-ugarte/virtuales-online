"""Open the live Virtustec SPA, let it render games, then click into a race
to reach the markets detail page. Screenshots before+after for inspection,
plus logs candidate selectors so we can refine clicking.

Usage: python explore_markets.py
Outputs: explore_01_lobby.png, explore_02_detail.png, explore_log.txt
"""

import asyncio
import sys
from pathlib import Path

# Force stdout to utf-8 so non-cp1252 chars in the SPA's i18n list don't crash us.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from playwright.async_api import Page
from scrapling.fetchers import StealthyFetcher

LOBBY = "https://virtual-games.virtustec.com/demo/desktop/"
LOG = Path("explore_log.txt")
LOG.write_text("", encoding="utf-8")


def log(msg: str) -> None:
    safe = msg.encode("ascii", "replace").decode("ascii")  # for stdout safety
    print(safe, flush=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(msg + "\n")


async def explore(page: Page) -> None:
    log(f"Initial URL: {page.url}")

    # Let the SPA fully boot up + connect to WebSocket + render game catalog.
    log("Waiting 18s for SPA to render games inside the iframe...")
    await page.wait_for_timeout(18_000)

    await page.screenshot(path="explore_01_lobby.png", full_page=True)
    log("Saved explore_01_lobby.png")

    # The Golden Race SPA lives inside an <iframe>. Find it and operate on its
    # content frame, otherwise our DOM queries see only the wrapper page.
    iframes = page.frames
    log(f"\nTotal frames on the page: {len(iframes)}")
    for i, fr in enumerate(iframes):
        log(f"  frame[{i}] url={fr.url}")
    spa_frame = None
    for fr in iframes:
        if "/desktop/default" in fr.url:
            spa_frame = fr
            break
    if spa_frame is None:
        log("ERROR: could not locate the SPA frame; aborting.")
        return
    log(f"\nUsing SPA frame: {spa_frame.url}")

    # Inventory: focus on Angular component tags (app-*) and class names that
    # commonly anchor race tiles. Skip the language picker which is full of
    # non-ASCII names that just clutter the output.
    text_targets = await spa_frame.evaluate(
        """() => {
          const out = [];
          // Angular custom elements first
          for (const el of document.querySelectorAll('[class*="event-list"], [class*="event-tile"], [class*="event-card"], app-event-list-item, app-game, app-market, [class*="goToMarket"], [class*="bet-now"], a[href*="market"], a[href*="event"]')) {
            const cls = (el.className && typeof el.className === 'string') ? el.className.slice(0, 140) : '';
            const tag = el.tagName;
            const txt = (el.innerText || '').trim().slice(0, 60);
            out.push({ tag, txt, cls, role: 'tile-or-cta' });
            if (out.length > 30) break;
          }
          // Top-level Angular components present on the page
          const tagNames = {};
          for (const el of document.querySelectorAll('*')) {
            if (el.tagName.toLowerCase().startsWith('app-')) {
              tagNames[el.tagName] = (tagNames[el.tagName] || 0) + 1;
            }
          }
          return { tiles: out, tagCounts: Object.entries(tagNames).sort((a,b)=>b[1]-a[1]).slice(0,40) };
        }"""
    )
    log("\nSPA frame: tile/cta candidates (max 30):")
    for t in text_targets["tiles"]:
        log(f"  <{t['tag']}>  '{t['txt']}'  class='{t['cls']}'")
    log("\nAll <app-*> custom-element counts (top 40):")
    for tag_name, n in text_targets["tagCounts"]:
        log(f"  {n:4d}  {tag_name}")

    # Try selectors that should match a "go to all markets" link or a clickable
    # race tile inside the SPA frame.
    candidates = [
        'text=/go to all markets/i',
        'text=/all markets/i',
        'a:has-text("markets")',
        'button:has-text("markets")',
        '[class*="markets"]',
        '[class*="bet-now"]',
        '[class*="event-list-item"]',
        'app-event-list-item',
        '[class*="goToAll"]',
        'a[class*="link"]',
    ]
    clicked = False
    for sel in candidates:
        try:
            loc = spa_frame.locator(sel).first
            count = await loc.count()
            log(f"\nSelector {sel!r} matched {count} elements")
            if count == 0:
                continue
            if not await loc.is_visible():
                log("  not visible, skipping")
                continue
            log("  clicking first match...")
            await loc.click(timeout=5_000)
            clicked = True
            log("  clicked")
            break
        except Exception as e:
            log(f"  error: {e!r}")

    if not clicked:
        log("\nNo selector worked.")

    # Wait for the markets / detail view to render
    log("Waiting 12s for detail view...")
    await page.wait_for_timeout(12_000)
    await page.screenshot(path="explore_02_detail.png", full_page=True)
    log(f"Saved explore_02_detail.png  (top URL: {page.url}, spa frame URL: {spa_frame.url})")

    # Inventory after click
    try:
        text_targets2 = await spa_frame.evaluate(
            """() => {
              const out = [];
              const all = document.querySelectorAll('h1, h2, h3, h4, button, [class*="market"], [class*="odds"], [class*="participant"]');
              for (const el of all) {
                const txt = (el.innerText || '').trim().slice(0, 120);
                if (!txt) continue;
                const cls = (el.className && typeof el.className === 'string') ? el.className.slice(0, 120) : '';
                out.push({ tag: el.tagName, txt, cls });
                if (out.length > 80) break;
              }
              return out;
            }"""
        )
        log("\nSPA frame inventory after click (first 80):")
        for t in text_targets2:
            log(f"  <{t['tag']}>  '{t['txt']}'  class='{t['cls']}'")
    except Exception as e:
        log(f"After-click inventory failed: {e!r}")


async def main() -> None:
    log(f"Loading {LOBBY}")
    await StealthyFetcher.async_fetch(
        LOBBY,
        headless=True,
        network_idle=True,
        page_action=explore,
    )


if __name__ == "__main__":
    asyncio.run(main())
