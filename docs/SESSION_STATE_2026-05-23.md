# Embedded TV-race viewer — session state 2026-05-23

Snapshot of in-progress work building a PIXI-overlay-capable race monitor embedded in `virtuales-online`. The conversation rolled to a fresh session; this is the bootstrap doc.

## What we're trying to build

A standalone web page (`tv-monitor`) that:
1. Subscribes to the same race broadcast the lobby uses
2. Plays the MP4 race video at the correct elapsed time (so a late-connecting viewer sees the right moment of the race)
3. Will eventually overlay PIXI graphics (race number, countdown, runner names, finish positions) — the same overlays the VSTVAPP webview burns onto the TV-box video

The end goal: drop this into the lobby (or use it standalone) for a CDN-free, in-browser embed of the race feed.

## What's running on the VPS (187.124.95.45) right now

| Port | Process | What it serves |
|------|---------|----------------|
| 4099 | `tv-broadcaster` (Go) | `/web-ds`, `/tv-ds`, `/pos-ds` WS — main race broadcaster |
| 8082 | `raceapi` (Go) | `/v1/races/*` HTTP — FASE 3 public API |
| 8085 | python3 (unknown) | (system) |
| 8888 | `serve_webapp.py` | VSTVAPP webview bundle (the TV-box code) |
| 8889 | `serve_webapp.py` of `web-lobby/dist/` | Production lobby (built without `VITE_VIDEO_OVERRIDE_BASE` → uses CloudFront) |
| 8890 | `serve_webapp.py` of `tv-race-embed/dist/` | The mini.html test bench (older iteration) |
| 8891 | `serve_webapp.py` of `tv-monitor/dist/` | The NEW minimal viewer (current focus) |

All four `serve_webapp.py` instances are `tools/playwright/serve_webapp.py` from `virtuales-go`. The script provides HTTP-Range support which is required for `<video>` seek.

## Key files

| Path | Purpose |
|------|---------|
| `tv-monitor/src/App.tsx` | Minimal root — pulls `WS_URL` from `?ws=…` or `VITE_WS_URL` env; pinned game from `?gameType=…` |
| `tv-monitor/src/components/LiveMonitor.tsx` | Copied from web-lobby; renders the video element + race UI |
| `tv-monitor/src/services/videoUrl.ts` | `resolveVideoUrl` — rewrites CloudFront URL to `/videos/<gameType>/<filename>` when `VITE_VIDEO_OVERRIDE_BASE=/videos` |
| `tv-monitor/src/hooks/useRaceFeed.ts` | WS subscription, clock-sync via `time` ping, gamepool maintenance |
| `tv-monitor/dist/videos/dog6/R*_h.mp4` | 1006 symlinks → `/home/claude/projects/ds_assets/dog6/R*_h50.mp4` |
| `tv-monitor/dist/videos/dog6/R*_h.jpg` | 1006 poster symlinks |
| `tv-monitor/dist/videos/dog8/R*_h.mp4` | 414 symlinks → `/home/claude/projects/ds_assets/dog8/R*_crf27.mp4` |
| `web-lobby/dist/` | The lobby bundle — **was built WITHOUT `VITE_VIDEO_OVERRIDE_BASE`** so it pass-through uses CloudFront URLs |

The symlink farm at `tv-monitor/dist/videos/` is built AFTER `vite build` because vite copies symlink TARGETS not the symlinks themselves when they're in `public/`.

## The video URL handling — clarified 2026-05-23

The broadcaster sends CloudFront URLs in `gameResult.videoname.mp4` (e.g. `https://d1d5bk95n21f2z.cloudfront.net/dog6/R0987_h.mp4?Sig=…`). Three behaviours:

| Consumer | Resolved URL | Network result |
|----------|--------------|----------------|
| VSTVAPP webview (port 8888) | `/.local/dog6/R0987_h50.mp4` via local symlinks | ✅ works |
| Lobby production build (port 8889) | CloudFront URL pass-through | ✅ works in user's Chrome, ❌ fails in VPS-Playwright (CloudFront unreachable from VPS network) |
| tv-monitor (port 8891) | `/videos/dog6/R0987_h.mp4` via `VITE_VIDEO_OVERRIDE_BASE=/videos` | ✅ works everywhere |

**User's stated preference (2026-05-23):** the lobby in real production points at VPS-local paths, NOT CloudFront. The current `web-lobby/dist/` build on this VPS was built without that env var, so it doesn't match production. If/when we rebuild the lobby with `VITE_VIDEO_OVERRIDE_BASE=/videos` (or matching the webview's `/.local`), both consumers will be consistent and the Playwright tests will pass uniformly.

## CloudFront is DEAD — local serving is now mandatory (2026-05-23 PM)

Confirmed by curling a freshly-signed `videoname` URL from the WS:

```
HTTP/2 403 ; content-type: application/xml ; server: AmazonS3 ; x-cache: Error from cloudfront
<Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>
```

`server: AmazonS3` means the CloudFront signature was ACCEPTED (request reached S3) and `Expires` was NOT past — so **S3 itself denies the object** (object missing or the CloudFront OAI lost bucket permission). The `<video>` receives this XML, the browser blocks it with `net::ERR_BLOCKED_BY_ORB` → `MEDIA_ELEMENT_ERROR: Format error`. **Broken for every consumer, not just the VPS network.** The lobby frontend is doing the right thing; the CDN is the failure. → Local serving from the VPS is the only working path.

### Where the videos actually live

`/home/claude/projects/ds_assets/` (115 GB):

| Folder | Races | Variant(s) on disk | Backend `videoname` asks for |
|--------|-------|--------------------|------------------------------|
| `dog6` | 1006 | `_h50` **and** `_crf27` | `R####_h.mp4` |
| `dog8` | 414 | `_crf27` only | `R####_h.mp4` |
| `horse7` | 161 | `_h50` only | `R####_h.mp4` |
| `DSVideo/horse` | 358 | (legacy horse) | — |

The backend always emits the `_h` suffix, which is NOT a real file. Two ways the suffix gets resolved (both in place now):

### `_h` aliases created in ds_assets (master fix for all consumers)

Per Jorge ("los videos son los mismos independientemente del sufijo") created symlinks `R####_h.{mp4,jpg}` → real variant inside each `ds_assets/<type>/` (dog6→`_h50`, dog8→`_crf27`, horse7→`_h50`). Counts: dog6 2012, dog8 828, horse7 322. This makes the `_h` name a first-class alias so any consumer using a simple **directory** symlink (`/videos/<type> → ds_assets/<type>`) resolves the backend URL with no per-file farm.

### web-lobby PRODUCTION build (port 8889, served by serve_webapp.py)

- Rebuilt `web-lobby/dist/` with the FULL prod env in `.env.production` — the auth/WS config is baked at build time and MUST be included or the lobby silently reverts to mock auth (demo `demo-player-01`) + `ws://localhost:4099`:
  ```
  VITE_AUTH_MODE=http
  VITE_API_BASE=http://187.124.95.45:4101/v1/web   ← web auth/wallet/tickets API (port 4101, NOT 8082)
  VITE_WS_URL=ws://187.124.95.45:4099/web-ds
  VITE_VIDEO_OVERRIDE_BASE=/videos
  ```
  Login creds that work against 4101: `demo-player-do` / `demo-pass-do` (currency DOP). Bundle now rewrites CloudFront→`/videos/...`.
- `dist/videos/{dog6,dog8,horse7}` are **directory** symlinks → `ds_assets/<type>` (replaced the old README-only dir; recreated AFTER `vite build` since vite wipes outDir).
- Build caveat: `npm run build` (`tsc -b && vite build`) fails on **pre-existing** TS errors in `src/services/tickets.ts:170,173` (`crypto` possibly undefined, `toString` arg). Built with `npx vite build` directly (esbuild, no type-check). **KNOWN GAP: tickets.ts type errors unfixed.**
- curl `http://187.124.95.45:8889/videos/horse7/R1612_h.mp4` → 206, video/mp4, 179248005 bytes. ✅

### web-lobby DEV server (port 5173, `npm run dev`)

`vite.config.ts` already had `localRaceVideosPlugin` (middleware on `/videos/*` with Range + suffix fallback `crf27>h50>h`) + the `videoUrl.ts` client rewriter. Configured via `web-lobby/.env.local` (gitignored):

```
VITE_VIDEO_OVERRIDE_BASE=/videos
LOCAL_VIDEOS_DIR=/home/claude/projects/ds_assets
```

Folder names match the CDN paths → **no `PATH_REWRITES` needed**. Startup log: `[local-race-videos] serving /videos/* from /home/claude/projects/ds_assets`. curl verified: dog6 `_h.mp4`→200 (fallback to crf27, 77 MB), dog8 Range→206, horse7→200 (179 MB), poster jpg→200. The plugin's own suffix fallback means it works even without the ds_assets `_h` aliases.

## tv-monitor (8891): pinned-game now strict + defaults to dog6 (2026-05-23 PM)

Jorge reported the 8891 monitor "mixing" dog6 and dog8 (a dog6 race ends, a dog8 starts). Two bugs in `tv-monitor/src/components/LiveMonitor.tsx` game-pick logic:

1. **`pinnedGame` didn't actually pin.** Steps 2 (sticky) + 3 (auto) ran even when a game was pinned, iterating `MONITOR_GAMES=['dog','dog8']` — so a gap in the pinned game's cycle leaked the other game. Fix: guarded both fallback layers with `if (!pinnedGame …)`. When pinned and the game is neither live nor pre, we show the idle "waiting" state instead of another game.
2. **Bare URL had no pin** (`PINNED=null` → auto across dog6+dog8). Fix: `App.tsx` now falls back to `import.meta.env.VITE_PINNED_GAME`, and `tv-monitor/.env.production` sets `VITE_PINNED_GAME=dog` so `http://187.124.95.45:8891/` shows ONLY greyhound-6. `?gameType=…` still overrides. Lobby untouched.

tv-monitor `.env.production` (it had NO env files — rebuilding without these reverts WS to localhost + video to CloudFront):
```
VITE_WS_URL=ws://187.124.95.45:4099/web-ds
VITE_VIDEO_OVERRIDE_BASE=/videos
VITE_PINNED_GAME=dog
```
Also replaced tv-monitor's per-file symlink farm (`dist/videos/{dog6,dog8}` file-level, missing horse7) with **directory** symlinks `dist/videos/{dog6,dog8,horse7} → ds_assets/<type>` (uses the new `_h` aliases). Playwright on the bare URL verified: only dog6 ever requested, video plays HD (R0950 cur 3→43s, W=1920), no dog8 leak. New bundle hash → users must hard-refresh (Ctrl+Shift+R) to drop the old cached bundle.

## salida-missed FIXED + lobby WATCH pin made strict (2026-05-23 PM, option A variant)

Applied to BOTH `web-lobby` and `tv-monitor` `LiveMonitor.tsx` (identical copies):

1. **VideoPlayer no longer blindly seeks to elapsed.** Captures elapsed-at-mount once per clip (`joinRef`, keyed on url). On `loadedmetadata`: if elapsed-at-mount > `LATE_JOIN_THRESHOLD_SEC` (10s) → genuine mid-race join → seek to live elapsed; otherwise leave `currentTime=0` → **play from the salida**. Fixes "shows poster/black then video already started". Verified: race caught at start plays from cur≈0; a race already running when picked seeks to live.
2. **Pinned game is now strict** (both files): steps 2 (sticky) + 3 (auto) are guarded with `!pinnedGame`, so WATCH/`?gameType` shows ONLY that game and never leaks the other during a cycle gap. Lobby WATCH wires `pinnedGame` via `App.tsx` `setPinnedGame`.

Playwright (8889, logged in) end-to-end of WATCH=dog6: label WATCH→WATCHING, only dog6 requested, next fresh race plays from cur=0.58s. tv-monitor (8891) bare URL: only dog6, cur≈0.2s.

Behavior note (default no-pin lobby = "most recent event"): auto-pick still joins overlapping live races in sync (can't show two salidas at once); shows the salida when it catches a race at its start. This is by design, not a bug.

## The "salida missed" problem (was PENDING — see section above, now FIXED)

Symptom: viewer doesn't see the first 2–3 seconds of the race ("la salida").

Diagnosis (side-by-side WS log captured on 2026-05-23):
- `gameResult` containing `videoname` arrives at `videoStart + ~0.3s` (broadcaster gates `videoname` on a `raceOccurred` condition — `internal/protocol/protocol.go:116-120`)
- After receiving, the `<video>` element needs ~2.7s to load even a local MP4
- `loadedmetadata` handler sets `currentTime = elapsed` (elapsed ≈ 3s by that point)
- Result: playback starts at frame ~3s, salida invisible

Two fix options, no commitment yet:

**A) Don't sync currentTime** — remove the `el.currentTime = elapsedSec` assignment in `LiveMonitor.tsx`'s `VideoPlayer`. Pros: salida always visible. Cons: a viewer that opens mid-race sees the race ~3s behind reality (not catastrophic but not authentic).

**B) Broadcaster delivers `videoname` earlier** — modify `virtuales-go/internal/protocol/protocol.go` `raceOccurred` gate so `videoname` is exposed when `status=F` regardless of `videoEndDt`. Or earlier: when `status=S` and `videoStartDt` is < 5s away. Pros: salida visible AND elapsed-sync stays accurate. Cons: backend protocol change; needs Jorge's call on which gate condition to flip.

## Testing

Playwright with Google Chrome (`channel: "chrome"`) on Xvfb because Chromium's bundled Chromium doesn't ship h264. Args required:
```
--no-sandbox --disable-dev-shm-usage --use-gl=angle --use-angle=swiftshader
--enable-unsafe-swiftshader --autoplay-policy=no-user-gesture-required
```

Test scripts that proved current state:
- `/tmp/test_sxs_auth.js` — side-by-side lobby (logged in) + tv-monitor, captures WS frames and video state on both
- `/tmp/test_side_by_side.js` — same idea without lobby login

Last test confirmed: both connect to the SAME WS (`ws://187.124.95.45:4099/web-ds`), receive `gameResult` at the SAME millisecond, but the lobby's `<video>` stays W=0 because CloudFront is unreachable from the VPS Playwright network, while tv-monitor plays correctly via local symlinks.

## Pending tasks

| # | Task | Notes |
|---|------|-------|
| 1 | Decide salida-fix path (A or B above) | Needs Jorge's call |
| 2 | If B: implement `videoname` early delivery in `internal/protocol/protocol.go:116-120` + add `expert-review` agent pass before commit | Touches the locked TV-DS protocol — see `feedback_tv_ds_protocol_locked` memory; needs explicit confirmation |
| 3 | Integrate PIXI overlays (RaceBarDog + WinnerDog) on top of the video | Source: `../streaming_kit_webapp/` repo; needs render-on-top div over `<video>` |
| 4 | Optionally rebuild `web-lobby/dist` with `VITE_VIDEO_OVERRIDE_BASE=/videos` so it matches tv-monitor + production behaviour on this VPS | One-line vite build command |
| 5 | Once stable, consider promoting tv-monitor's approach to the canonical lobby video player (replace pass-through CloudFront logic for VPS-hosted deployments) | Bigger architectural choice |

## How to resume in a fresh session

```bash
# 1. Read this doc
cat /home/claude/projects/virtuales-online/docs/SESSION_STATE_2026-05-23.md

# 2. Verify the four servers are still up
ss -ltnp 2>/dev/null | grep -E ":(4099|8888|8889|8890|8891)"

# 3. Quick smoke test of tv-monitor
curl -sI http://187.124.95.45:8891/ | head -3
curl -sI http://187.124.95.45:8891/videos/dog6/R0001_h.mp4 | head -3
```

If a server died: re-launch from `virtuales-online/` with `python3 /home/claude/projects/virtuales-go/tools/playwright/serve_webapp.py <port> <docroot>`.
