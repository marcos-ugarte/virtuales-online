# Virtustec Virtual Games — Static Mirror

**Date:** 2026-05-06
**Owner:** jorge@disercoin.com
**Status:** Approved (design phase)

## 1. Goal

Build a tool that produces a fully self-contained static mirror of `https://virtual-games.virtustec.com/demo/desktop/` (the lobby) plus 6 of its game iframes, so the result can be:

- Served from a local/static host and look identical to the original.
- Modified afterwards (branding, catalog, colors) without dependence on the source site.

The output is a directory tree of HTML/CSS/JS/font/image assets preserving the original URL paths, plus a small static server for verification.

This is a **mirror**, not a rebuild: minified Angular bundles are kept as-is. Customization happens in a later phase by editing CSS variables, theme files, and replacing image assets.

## 2. Non-goals

- Working backend / playable game logic. Game runtime XHR calls to Virtustec's servers will fail; only the visual shell is preserved. The user will plug their own backend later.
- De-minification or refactoring of the Angular code.
- Mobile variant (`/demo/mobile/`). Desktop only for v1.
- Continuous re-mirroring on a schedule.

## 3. Inputs

- Start URL: `https://virtual-games.virtustec.com/demo/desktop/`
- Game count: 6 (selection: first 6 iframes discovered in the lobby; user can override via CLI flag)
- Output directory: `mirror/` (gitignored)

## 4. Architecture

```
GoldenRaceScrapping/
├── mirror.py                # CLI orchestrator
├── lib/
│   ├── __init__.py
│   ├── discovery.py         # Scrapling: find iframe[src] in the lobby
│   ├── capture.py           # Scrapling page_action: record every HTTP response
│   ├── storage.py           # write responses to disk preserving URL path
│   └── rewrite.py           # post-pass: rewrite absolute URLs if needed
├── serve.py                 # local static server to verify the mirror
├── mirror/                  # output (gitignored)
│   └── virtual-games.virtustec.com/
│       └── demo/
│           ├── desktop/     # lobby
│           └── …/           # game iframes (paths follow original URLs)
└── docs/superpowers/specs/2026-05-06-virtustec-demo-mirror-design.md
```

### Module responsibilities

- **discovery.py** — `find_game_iframes(lobby_url, limit) -> list[str]`. Uses `StealthyFetcher.fetch(..., network_idle=True)` and reads `iframe[src]` from the rendered DOM.
- **capture.py** — `capture_page(url, output_root)`. Calls `StealthyFetcher.async_fetch(url, page_action=record_responses(output_root), network_idle=True)`. The `record_responses` factory returns an async `page_action` that registers `page.on("response", save)` on the raw Playwright page Scrapling hands over.
- **storage.py** — given a Playwright `response` and `output_root`, computes the on-disk path from the URL and writes the body. Handles binary vs text, query strings (appended as filename suffix only on collision), and 3xx/4xx skipping.
- **rewrite.py** — optional post-pass. Walks saved HTML/CSS/JS, rewrites absolute `https://virtual-games.virtustec.com/...` references to root-relative `/virtual-games.virtustec.com/...` so the mirror works behind any local server without DNS tricks.
- **mirror.py** — CLI entrypoint. Flags: `--games N` (default 6), `--out PATH` (default `./mirror`), `--no-rewrite`, `--include-game URL` (repeatable), `--skip-game URL`, `--skip-asset-pattern REGEX` (repeatable, e.g., to drop video/audio). Cookie injection is deferred — see risks table.
- **serve.py** — `python -m http.server`-style helper rooted at `mirror/`, default port 8000.

## 5. Capture strategy (the core piece)

For each URL (lobby + 6 games), instead of parsing HTML to find every asset (fragile for SPAs), we let Scrapling drive a real browser and we hook into the underlying Playwright page via `page_action` to record every HTTP response.

**Timing constraint**: Scrapling calls `page_action` *after* its own `network_idle` wait. By that point, the initial bundle CSS/JS, fonts, and first-pass XHRs have already loaded — too late to attach `page.on("response", ...)` and catch them. The fix is a **deliberate reload from inside `page_action`**: attach the listener first, then trigger a full reload so every request fires again with the listener active.

```python
from playwright.async_api import Page
from scrapling.fetchers import StealthyFetcher

def record_responses(out_root, manifest):
    async def page_action(page: Page):
        # 1. Attach listener BEFORE we make the page reissue requests.
        page.on("response", lambda r: schedule_save(r, out_root, manifest))

        # 2. Reload — every initial asset fires again and is now captured.
        await page.reload(wait_until="networkidle", timeout=60_000)

        # 3. Trigger lazy-loaded sprites (parallax, lazy <img>, intersection observers).
        await page.wait_for_timeout(1500)
        await page.mouse.wheel(0, 2000)
        await page.wait_for_load_state("networkidle")

    return page_action

await StealthyFetcher.async_fetch(
    url,
    headless=True,
    network_idle=True,
    page_action=record_responses(out_root, manifest),
)
```

Cost: each page is loaded twice. For 7 URLs (lobby + 6 games) at ~5-15s each, total mirror time stays under ~5 minutes — acceptable for a one-shot.

`schedule_save` wraps the response read in `asyncio.create_task` so the listener returns immediately and Playwright doesn't backpressure the event loop. The actual `save` coroutine:

1. Skips non-2xx responses.
2. Resolves the on-disk path from `response.url` (`scheme/host/path`); appends `index.html` for directory URLs; preserves query string only when needed to disambiguate (e.g., `?v=4.52.49` becomes part of the filename).
3. Writes the body. Logs to a manifest (`mirror/manifest.json`) with URL → on-disk path → bytes.

The manifest is the source of truth for the rewrite pass.

## 6. URL rewrite strategy

Two options handled by `--no-rewrite` flag:

- **Default (rewrite)**: walk every text response (HTML, CSS, JS, JSON), replace `https://virtual-games.virtustec.com/` with `/virtual-games.virtustec.com/`. The static server serves from the mirror root and all paths resolve.
- **Disabled** (`--no-rewrite`): keep absolute URLs. The user maps `virtual-games.virtustec.com` → `127.0.0.1` in their hosts file. Useful when the captured JS hard-codes the hostname in ways the regex would miss.

JS rewriting is risky (can break minified token boundaries), so the rewrite pass uses a tight regex anchored on the protocol+host literal and skips anything inside a likely string boundary check (only replaces inside `"..."` or `'...'` or `\`...\``).

## 7. Discovery flow detail

The lobby HTML is mostly empty until Angular hydrates; iframes only appear after JS runs. So discovery uses the same Camoufox path as capture, but reads the rendered DOM instead of saving responses. Note that the lobby may render game thumbnails as a grid and only mount the iframe when the user opens a game — in that case the listing comes from a JSON catalog endpoint (visible in network logs) or from a JS data structure. Discovery handles both:

```python
page = StealthyFetcher.fetch(lobby_url, headless=True, network_idle=True)
iframes = [el.attrib["src"] for el in page.css("iframe[src]")]
```

Fallback if no `iframe[src]` is present at lobby load: re-run discovery using `page_action` to interact with each game tile (`click`, wait for iframe to mount, capture `src`, navigate back). This branch is implemented only if the simple `iframe[src]` query returns 0 results.

If 6 unique game URLs aren't found by either path, the tool fails loudly — the user picks manually and passes them via `--include-game`.

## 8. Output structure

After a full run with default flags:

```
mirror/
├── manifest.json
└── virtual-games.virtustec.com/
    └── demo/
        ├── desktop/
        │   ├── index.html
        │   ├── styles.4710874a7fd81d21d1f9.bundle.css
        │   ├── theme-default.dc2553167a9bdedb8437.bundle.css
        │   ├── inline.…bundle.js
        │   ├── main.…bundle.js
        │   ├── vendor.…bundle.js
        │   ├── assets/{fonts,img,i18n}/...
        │   └── favicon.ico
        └── …/                   # 6 game iframes — paths follow whatever the iframe src URLs are; subdomains get their own top-level dir under mirror/
```

The exact tree under each game iframe URL is whatever Virtustec serves; the mirror preserves the structure 1:1. If a game's iframe lives on a different subdomain (e.g., `cdn.virtustec.com/...`), it gets its own top-level directory under `mirror/`.

## 9. Verification

`serve.py` boots a static server on `mirror/`. Manual checklist:

1. Open `http://localhost:8000/virtual-games.virtustec.com/demo/desktop/` — lobby loads, fonts and icons render.
2. Click into each of the 6 games — iframe loads its mirrored copy.
3. DevTools Network tab — every request is a `200` from `localhost`, no requests leak to `virtual-games.virtustec.com`.
4. Diff screenshots: original vs mirror at 1920x1080. Pixel-level identity is not required, but layout, colors, and typography must match.

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Game runtime XHR fails (auth, RNG, balance endpoints) | Out of scope — user replaces backend in phase 2. Capture continues on error. |
| Time-signed asset URLs (CDN tokens) | Re-run mirror at deploy time. Document expiry in `manifest.json`. |
| Cloudflare / anti-bot block | `StealthyFetcher` uses Camoufox which bypasses most checks. Fallback: add cookie injection inside `page_action` via `await page.context.add_cookies(...)` (flag introduced only when needed). |
| Bundle JS hard-codes the hostname | `--no-rewrite` mode + hosts file mapping. |
| Heavy size (50-200 MB per game) | Show progress; allow `--skip-asset-pattern` to drop video/audio. |
| Iframes that load late or after user interaction | Discovery has a 5s extra wait + a defensive scroll. If still missing, `--include-game` flag for manual override. |

## 11. Out-of-scope follow-ups (for later phases)

- Theme customization guide: which CSS variables in `theme-default.*.bundle.css` map to what.
- Logo/asset swap script: drop-in replacement of `assets/img/logo.*` files.
- Catalog edit: pointing the lobby's iframes to the user's own game URLs.
- Backend stub server that fakes the runtime XHRs so games actually animate.

## 12. Technology choices

- **Scrapling** (already in `venv/`) is the orchestrator for the whole pipeline — discovery *and* capture. Discovery uses `StealthyFetcher.fetch()` to read the rendered DOM. Capture uses `StealthyFetcher.async_fetch(..., page_action=...)`, where `page_action` receives the raw Playwright `Page` and is where we attach `page.on("response", ...)`.
- **Playwright** types (`Page`, `Response`) are used directly inside `page_action`, but only because Scrapling exposes the underlying Playwright object — we are not running Playwright as a parallel system.
- **Python 3.11+** — async/await syntax assumed.
- **No extra deps** beyond what Scrapling already pulls in.

## 13. Open questions (resolved during brainstorm)

- ✅ Scope: lobby + 6 games.
- ✅ Fidelity: full mirror, modify later.
- ✅ Game selection: first 6 iframes by default, overridable.
- ✅ URL rewrite: default on, with escape hatch.
- ✅ Backend behavior: out of scope, mirror visual shell only.
