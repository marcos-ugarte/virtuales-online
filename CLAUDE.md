# virtuales-online

Front-ends for a virtual greyhound/horse racing product.

## 👉 Start here
**Read `docs/HANDOFF_TVBOX_ONLINE.md` first** — it's the self-contained bootstrap
(the two apps, the ported PIXI overlay architecture, data shapes, environment
facts, how to run, git state, next steps). Deeper running log:
`docs/SESSION_STATE_2026-05-23.md`.

> The assistant's chat memory does NOT travel with the repo. These docs are the
> source of truth for continuing the work in a new session.

## Apps
- `web-lobby/` — full betting lobby (cards, auth/wallet/tickets, WATCH, LiveMonitor).
- `tvbox-online/` — standalone single-game race viewer with pixel-perfect PIXI
  overlays (RaceBar / RaceIntervals / Winner) ported UNMODIFIED from
  `streaming_kit_webapp` and driven by a shim `Logic` (`src/tvkit/`).

## Hard rules (details in the handoff)
- Vendored `tvbox-online/src/tvkit/**` streaming_kit files are copied VERBATIM —
  don't edit their semantics; only the shim, `RaceOverlay.tsx`, websocket model,
  fonts, and aliases are ours.
- Build with `npx vite build` (not `tsc -b`). `Logic.createPixiMask` must keep
  `cacheAsBitmap=false` (else the `<video>` stutters).
- CloudFront is dead → race videos are served locally (`VITE_VIDEO_OVERRIDE_BASE`
  + the dev `localRaceVideosPlugin` / `LOCAL_VIDEOS_DIR`).
- Commit/push only when asked; confirm before big/irreversible changes.

## Run tvbox-online locally
`cd tvbox-online && npm install && npm run dev` with a `.env.local` (see handoff):
`VITE_WS_URL=ws://187.124.95.45:4099/web-ds`, `VITE_VIDEO_OVERRIDE_BASE=/videos`,
`VITE_PINNED_GAME=dog`, `LOCAL_VIDEOS_DIR=<folder with dog6/ dog8/ horse7/>`.
