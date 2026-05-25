# Handoff — tvbox-online race overlays (READ THIS FIRST in a new session)

This is the bootstrap doc to **continue development in a fresh Claude Code session
(e.g. on Windows)**. The detailed running log is `docs/SESSION_STATE_2026-05-23.md`;
this file is the concise "what is this, where are we, how to run, what's next".

> ⚠️ The assistant's persistent memory does NOT travel with the repo — it lived on
> the VPS where this was built. Everything needed to continue is in THIS file +
> `SESSION_STATE_2026-05-23.md` + the code. Treat these as the source of truth.

## The two front-end apps in this repo

| App | Path | What it is |
|-----|------|------------|
| **web-lobby** | `web-lobby/` | Full betting lobby: 3 race cards, auth/wallet/tickets, WATCH button, side LiveMonitor. |
| **tvbox-online** | `tvbox-online/` | Standalone single-game race viewer (no auth/cards). Plays the race video full-bleed + **pixel-perfect PIXI overlays** ported from the real TV-box. Default-pinned to greyhound-6. |

(There's also `VSTVAPP/` — the REAL production TV-box webview, and `streaming_kit_webapp/` — the source of the PIXI overlay components we ported. Both are sibling reference repos, not deployed from here.)

## What we built in tvbox-online (current state — all working)

Real streaming_kit TV-box overlays, vendored **UNMODIFIED** under `tvbox-online/src/tvkit/`, rendered on a transparent PIXI canvas over the `<video>`:

1. **RaceBarDog** — race number ("CARRERA NNNN") + in-race timer, top-right.
2. **RaceIntervalsDog** — mid-race leaders (box · name · split time), 2 reveals (~10s, ~24s).
3. **WinnerDog** ×3 — winner @32s + forecast/exacta @40.5s (box · name · time).

These are driven by a **shim `Logic`** (`tvbox-online/src/tvkit/client/Logic/Logic.ts`) instead of the real streaming_kit engine. It works because **our race videos are RACE-ONLY (no intro)**, so most of `Logic` collapses to constants: `getIntroLength()=0`, `getState()=Race`, `isInIntro()=false`, `fadeX=1`, no fades; **time comes from the live `<video>.currentTime`** via `Logic.setTimeProvider`.

The overlay wrapper is `tvbox-online/src/components/RaceOverlay.tsx` (our code) — boots PIXI, instantiates the 3 components, maps our wire data → the streaming_kit interfaces, drives `update(dt)` each tick. Mounted from `LiveMonitor.tsx` inside `.lm-video`.

### Architecture rules that MUST be kept
- **Vendored streaming_kit files are copied verbatim — do NOT edit their semantics.** Only the shim, `RaceOverlay.tsx`, the websocket model, fonts, and Vite/tsconfig aliases are "ours".
- Path aliases (`tvbox-online/vite.config.ts` + `tsconfig.app.json`): `client/*`,`common/*`,`settings/*`,`assets/*` → `src/tvkit/*`. They're prefix-scoped so they don't touch tvbox-online's own code.
- Design space is **1280×720, `_s()` = identity** (streaming_kit `scaleFactor` is always 1; PIXI app is 720-tall, CSS-stretched). Component coords from the source are used 1:1.
- **DIN Next LT Pro fonts** are vendored in `src/tvkit/assets/fonts/` + declared in `src/tvkit/fonts.css` (imported in `main.tsx`). Family names: `DIN-UltraLightItalic`, `DIN-LightItalic`, `DIN-BoldItalic`, `DIN-Regular`, `DIN-RegularItalic`, `DIN-Bold`, `DIN-Medium`. RaceOverlay awaits them (with a 2s timeout — never block on `document.fonts.ready`, which waits for unrelated page fonts and can hang the overlay).
- **PERF GOTCHA:** `Logic.createPixiMask` must use `cacheAsBitmap=false`. The original sets `true` (fine on the Android-TV WebView's GPU) but a cached mask that animates every frame **stutters the `<video>` in a browser**.
- `tsc -b` fails on pre-existing quirks (a 10-arg `AnimHelper.animateInOut` call, etc.); **build with `npx vite build`** (esbuild, no type-check), like the existing pipeline. After building on the VPS, recreate symlinks (see below).
- Build wipes `dist/`; on the VPS the video symlinks must be recreated after each build:
  `mkdir -p dist/videos && for t in dog6 dog8 horse7; do ln -sfn /home/claude/projects/ds_assets/$t dist/videos/$t; done`

### Overlay visibility (important)
Overlays render ONLY while the race video is actively playing — gated in
`RaceOverlay.tsx` on `phase==='live' && <video> exists && !video.ended`, and when
not playing we force every overlay `visible=false` AND skip its `update()`
(calling `update()` re-asserts visibility via `Logic.getAnim`). Needed because
phase stays 'live' for a moment on the frozen last frame and WinnerDog's forecast
anim window extends past the clip — otherwise the winners panel lingered into the
next-race countdown.

### Stubbed (not needed yet)
- Bonus number + x2/x3 badge (`AnimatedBonusTopDog`, `BonusAnnotationRaceBarDog`) are no-op stubs.
- Italian (`it`) odds-digit override path (we're not that skin).

## The data (web-ds wire → our overlays)

Backend sends `gameResult` on `ws://187.124.95.45:4099/web-ds`. Relevant fields (modelled in `tvbox-online/src/types/websocket.ts`, merged onto the `Race` in `useRaceFeed.ts`):

- `id` → race number = `id.split('_').pop().slice(-4)`.
- `videoStartDt` → when the video starts; drives elapsed/timer.
- `competitors: Record<postPos,{name,…}>` → runner names (from the gamepool, not the gameResult).
- `finish?: Record<pos,{competitorIndex,time}>` → final order (winners). `driverIndex = competitorIndex-1`.
- `interval?: Record<"1"|"2", Record<"1"|"2",{competitorIndex,time}>>` → mid-race splits (2 splits, top-2). Confirmed real shape: `interval["1"]["1"]={competitorIndex:5,time:7.81}`, etc.
- `odds: number[]` → flat WIN/EXACTA matrix; `getOddsForDriver(odds,a,b,n)=odds[a*n+b]`.

Skin: backend sends **skinVersion=11 (MODERN_ODDS_ALWAYS_ON)** for dog6/dog8. dog6 vs dog8 share the same `dog/` components (differ by `gameType==="dog8"` conditionals).

## CRITICAL environment facts

- **CloudFront is DEAD.** `gameResult.videoname.mp4` is a signed CloudFront URL that returns **403 AccessDenied** (S3 denies the object) for everyone. Videos MUST be served locally. The frontend rewrites the URL to `/videos/<type>/R####_h.mp4` when `VITE_VIDEO_OVERRIDE_BASE=/videos` (`src/services/videoUrl.ts`).
- Backend asks for `R####_h.mp4`; real files are `_h50`/`_crf27` (dog8 only `_crf27`). On the VPS we created `_h.{mp4,jpg}` alias symlinks in `ds_assets/<type>/`. The Vite **dev server has a `localRaceVideosPlugin`** (`vite.config.ts`) that serves `/videos/*` from `LOCAL_VIDEOS_DIR` with a suffix fallback (`crf27>h50>h`) — so locally you just point at your video folder.

### Backend services (reachable over the network from anywhere, incl. Windows)
| Port | What |
|------|------|
| `ws://187.124.95.45:4099/web-ds` | race feed (gameResult) — `VITE_WS_URL` |
| `http://187.124.95.45:4101/v1/web` | web auth/wallet/tickets API (lobby only) — `VITE_API_BASE` |
| `http://187.124.95.45:8889/` | deployed lobby (prod build) |
| `http://187.124.95.45:8891/` | deployed tvbox-online (prod build) |

Lobby login: `demo-player-do` / `demo-pass-do` (currency DOP).

## How to RUN tvbox-online locally (Windows dev) — fluid, no network buffering

```
cd tvbox-online
npm install                       # installs pixi.js@7 etc.
# create tvbox-online/.env.local (gitignored):
#   VITE_WS_URL=ws://187.124.95.45:4099/web-ds
#   VITE_VIDEO_OVERRIDE_BASE=/videos
#   VITE_PINNED_GAME=dog
#   LOCAL_VIDEOS_DIR=C:/path/to/your/videos   (folder containing dog6/ dog8/ horse7/)
npm run dev                       # open the printed URL
```
The race **video is served from your local disk** (via the dev plugin) while the **WS feed comes from the VPS**. The startup log should show `[local-race-videos] serving /videos/* from …`. If a race has no local file the `<video>` 404s (only that race).

> If it stutters on the VPS-served `:8891` but is smooth locally → it was network buffering of the MP4. If it stutters locally too → overlay render cost; optimize (lower `app.ticker.maxFPS` in RaceOverlay, simplify masks).

## Git state
- Branch: **`feat/local-video-serving-and-salida-fix`**. Latest commit `182d4b2` (overlays + lobby fixes) on top of `9e16aa3` (local video serving).
- The VPS could not push (creds `vsoftwaresolutions` lack write to `marcos-ugarte/virtuales-online` → 403). **Push from a machine that has write access**, then `git pull` on Windows.
- Not committed (gitignored): `dist/`, `node_modules/`, `.env.local`. `.env.production` IS committed (no secrets, just VPS URLs).

## Known gaps / candidate next steps
- **Performance** on lower-end browsers — the 3 overlays + masks. cacheAsBitmap already disabled; could lower FPS / simplify if needed.
- **Bonus overlays** (jackpot number, x2/x3 badge) stubbed — port `AnimatedBonusTopDog`/`BonusAnnotationRaceBarDog` (+ `AnimatedNumber`/`RunningNumber`/`DrawHelper`) if wanted.
- **dog8 / horsec**: overlays are instantiated as `'dog6'` in RaceOverlay; for dog8 the components have `gameType==='dog8'` branches (colors/offsets) — pass the real pinned gameType if showing dog8.
- **web-lobby** does NOT have the PIXI overlays (only tvbox-online does) — decide if it should.
- **tickets.ts** TS errors in web-lobby block `tsc -b` (build via `npx vite build`).

## NEXT FEATURE (PLANNED, not started): premium inter-race "intro" presentation
During the wait between race videos, show an optional **premium animated presentation** (console-sports-broadcast quality), built **FROM SCRATCH** with our own data — NOT a port of the streaming_kit intro overlays, NOT playing the real intro MP4. (Decision "B".)

- **Target duration ≈ 180s** (3 min): we broadcast every **4 min (round 240s)**; the real intro for that round is `intro_4_oao` (≈179.7s). NOT the 1-min `intro_2_oao` (that's for round 120; the 60s clip loops ~2× in shorter rounds). Verified durations via ffprobe in `ds_assets`.
- **Optional toggle** (`VITE_WAIT_MODE` / `?wait=`): `image` (current static hero+countdown) vs `premium`.
- **Tech:** PIXI 7 (already installed) + **GSAP** (`npm i gsap @pixi/filter-glow @pixi/filter-advanced-bloom`, not yet installed) for timelines/easing; bloom, parallax, animated odds counters. Framer Motion is NOT the tool (DOM-based; stutters with broadcast graphics).
- **Reference (what the real intro does, for inspiration only):** the `intro_N_oao` MP4 is cinematic venue footage + EMPTY 3D odds boards (WIN tiles + 8×8 EXACTA matrix); the webview overlays live odds/names on top, timed to the video. We are NOT replicating that pipeline — building our own.
- **All data is available** on the web-ds wire (confirmed): `competitors[].{name,strikeRate,bestLap,last5,resultHistory,trend,numberOfWins,…}`, `odds[]` (WIN+EXACTA), `resultHistory`, `jackpotInfo.bonusHistory`, `weather/temperature/wind/courseConditions`, `videoStartDt`.
- **Proposed storyboard (~180s):** 0–15s opening/brand + weather → 15–70s runner presentation (one by one) → 70–120s odds matrix (WIN+EXACTA, animated counters) → 120–160s history/jackpot → 160–180s countdown to start.
- **Next concrete step:** run `ui-ux-pro-max` for the visual direction (palette/type/effects), then PoC the **runner-presentation** panel with PIXI+GSAP fed by real data; verify locally (fast), then extend to the full sequence.

## Also done since the overlay milestone
- **Winner-phase race bar fix** (`RaceOverlay.tsx` + `LiveMonitor.tsx`, commit 4d10ba1): the race number + timer stayed hidden during the winners panel because `getRaceLength()` (bar visibility window) was set from the finish time (~29s) so the bar faded before WinnerDog (32s/40.5s). Now `getRaceLength` = VIDEO duration (`videoEndDt-videoStartDt`); the timer's frozen value stays the finish time (`totalRaceTime=clockEndTime`) → race number + "00:29" stay visible during winners. Also: overlays hidden when the video isn't actively playing (winner no longer lingers into the next countdown).

## Overlays ported into the web-lobby LiveMonitor (2026-05-25)
The lobby's embedded race monitor now shows the SAME overlays as tvbox-online.
- **What was copied:** `tvbox-online/src/tvkit/**` → `web-lobby/src/tvkit/**` VERBATIM (33 files incl. DIN fonts). `pixi.js@^7.4.3` added to web-lobby.
- **Ours in the lobby:** `web-lobby/src/components/RaceOverlay.tsx` (ported from tvbox but takes a real `gameType` prop instead of hardcoding `'dog6'`), the resolve/path **aliases** in `vite.config.ts` + `tsconfig.app.json`, the `import './tvkit/fonts.css'` in `main.tsx`, an `.lm-overlay` CSS block in `global.css`, and the `interval` field added to the `Race` type in `types/websocket.ts` (it already arrived at runtime via the `...payload` spread; the lobby's `useRaceFeed.ts` is byte-identical to tvbox's).
- **Mount:** `LiveMonitor.tsx` maps `pickedKey` → `OVERLAY_GAME_TYPE` (`dog→dog6`, `dog8→dog8`, `horsec→null` = no overlay; no horse PIXI components are vendored) and mounts `<RaceOverlay>` inside `.lm-video`. The video keeps `className="lm-video-el"` (the overlay finds it as a sibling for the time provider).
- **GOTCHA — dev server cannot load the vendored files.** The streaming_kit files do `import { GameLength } from "common/Definitions"` where `GameLength` is a **type** (not `import type`). Under `verbatimModuleSyntax`, Vite's per-file dev transform keeps it as a runtime import → browser throws *"does not provide an export named 'GameLength'"*. **tvbox-online has the EXACT same failure in `npm run dev`** — both apps are meant to be verified through `vite build` + `vite preview` (rollup elides the type-only import). This is why CLAUDE.md says "build with vite build". Do NOT "fix" it by editing the vendored files.
- **Preview serves videos:** the dev-only `localRaceVideosPlugin` was given a `configurePreviewServer` (shared `register()`) so `/videos/*` works under `vite preview` too — needed to see a real race clip when verifying.
- **Verified (Playwright, swiftshader):** logged in with mock `demo-player-01`/`demo-pass-01`, caught a live dog8 race (RaceBar + intervals box + WinnerDog panels @ t≈26–42s) and a live dog6 from the salida (RaceBar + INTERVAL-1 leaders box @ t≈11s). No runtime errors (only harmless swiftshader GPU-stall warnings).

## Access gate (login) added 2026-05-25
tvbox-online (previously open) now sits behind a **client-side** username/password gate.
- **Credentials (fixed):** user `tvbox` / pass `015166`. In `src/services/tvboxAuth.ts`.
- **Components:** `src/services/tvboxAuth.ts` + `src/components/TvboxLogin.tsx` (`<TvboxAuthGate>` wraps the viewer in `App.tsx`; the WS feed only mounts once authed). Login CSS at the end of `src/styles/global.css` (`.tvbox-login-*`, `.tvbox-logout`).
- **Session is remembered per device** (localStorage key `tvbox_auth_v`), with a small ⏻ logout button bottom-right.
- **"Log out ALL devices" / force re-login:** bump `AUTH_VERSION` in `tvboxAuth.ts` (currently `'2026-05-25.1'`), then rebuild + relink + redeploy. A device is authed only while its stored token equals AUTH_VERSION, so bumping it invalidates every device on its next page load. NOTE: this is CLIENT-SIDE only (not strong security) and already-open pages won't re-prompt until they reload.
- Verified on :8891 (login shows, wrong pass errors, tvbox/015166 enters, persists across reload, logout returns to login).

## Working-style notes (carry these)
- Document findings/changes in the same step as the work (this repo's docs are the memory).
- Pixel-perfect = port the REAL component (camino A), don't approximate. Verify visually with Playwright screenshots (Chrome channel + Xvfb + swiftshader flags on the VPS; locally just a normal browser).
- Keep behavior uniform across game types; confirm before big/irreversible changes; commit/push only when asked.
