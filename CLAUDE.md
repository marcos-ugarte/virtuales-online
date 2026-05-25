# virtuales-online

Front-ends for a virtual greyhound/horse racing product.

## 👉 Start here
Self-contained bootstraps (chat memory does NOT travel with the repo — these docs are the source of truth):
- **`docs/HANDOFF_TVBOX_ONLINE.md`** — tvbox-online PIXI race overlays (RaceBar/Intervals/Winner).
- **`docs/HANDOFF_POS.md`** — the cashier POS adapted to virtuales-go's `/pos-go-ds` WebSocket (login + race feed working; ticketing = next phase).
- Deeper running log: `docs/SESSION_STATE_2026-05-23.md`.

> The assistant's chat memory does NOT travel with the repo. These docs are the
> source of truth for continuing the work in a new session.

## Apps
- `web-lobby/` — full betting lobby (cards, auth/wallet/tickets, WATCH, LiveMonitor).
  The LiveMonitor now carries the SAME PIXI overlays as tvbox-online (RaceBar /
  RaceIntervals / Winner), driven by the real gameType (dog6/dog8). `src/tvkit/**`
  is a VERBATIM copy of tvbox-online's; only `RaceOverlay.tsx`, the vite/tsconfig
  aliases, the `fonts.css` import and the `interval` field on the `Race` type are
  ours. Verify via `vite build` + `vite preview` (dev server can't load the
  vendored type-only imports — same as tvbox-online); preview serves `/videos`
  too (`configurePreviewServer`). Login: mock `demo-player-01` / `demo-pass-01`.
- `tvbox-online/` — standalone single-game race viewer with pixel-perfect PIXI
  overlays (RaceBar / RaceIntervals / Winner) ported UNMODIFIED from
  `streaming_kit_webapp` and driven by a shim `Logic` (`src/tvkit/`).
- `pos/` — cashier POS (fork of virteon-platform `apps/pos`), transport swapped
  from SignalR/.NET to virtuales-go `/pos-go-ds` WebSocket. Login + race feed
  work; tickets/balance pending. See `docs/HANDOFF_POS.md`. (FORK — do not
  subtree-sync; we diverge on protocol.)

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
