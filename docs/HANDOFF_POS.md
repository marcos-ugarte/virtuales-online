# Handoff — POS adapted to `/pos-go-ds` (READ before touching `pos/`)

The cashier POS (`virtuales-online/pos/`) is a **fork of virteon-platform's `apps/pos`** whose
backend transport was swapped from Microsoft **SignalR/.NET** to **virtuales-go's plain-WebSocket
`/pos-go-ds`** protocol. Login + race feed work; ticketing is the next phase.

> The assistant's chat memory does NOT travel with the repo. This file + the code are the source of truth.

## What it is / stack
- `pos/` — React 19 + Vite + TS, port **4069** (dev). Multi-game cashier POS (tabs DOS/DOT/DOE/HOC).
- Self-contained (no monorepo `packages/*` deps). Cloned, then adapted. It is a FORK — we diverge from virteon's POS on purpose (protocol), so don't subtree-sync it.
- Build: `npm run build` (`tsc -b && vite build`). Dev: `npm run dev`.
- **Vite first load is slow** (on-demand transform of ~745 modules, >120s in a cold browser). For Playwright/visual verification, prefer **`npm run build` + serve `dist/` statically** (instant load) over the dev server.

## Backend wiring (virtuales-go `/pos-go-ds`)
- WS: `ws://187.124.95.45:4099/pos-go-ds`
- Discover: `GET http://187.124.95.45:4101/api/ws/discover?deviceId=<hw>&deviceType=pos` (returns `url`, `simulatorUrl`, `games`, `printerRequired`, …)
- `pos/.env` (gitignored): `VITE_API_URL=http://187.124.95.45:4101`, `VITE_DEV_DEVICE_ID=ce0b8aa81d6378ed42b077e6042b07b5`, `VITE_DEV_MODE=false`.
- Protocol spec: `../virtuales-go/docs/MANUAL_PROTOCOL_POS_GO_DS.md` (sections 5.1 discover, 5.2 deviceLogin, 5.3 init, 5.4 sendTicket, 5.5 sendBalance, 5.6 sendTicketStatus, 5.7 queryTicketCode, 9 broadcasts).
- **Why this works cleanly:** the POS already builds the vendor messages (`sendTicket` with `bet_N`, `sendTicketStatus`, `sendBalance`) under SignalR; `/pos-go-ds` implements the SAME vendor protocol natively. We only replaced the transport.

## Test credentials
- Device (POS Dinamica01): `ce0b8aa81d6378ed42b077e6042b07b5` · Operator `001-001-001-001` · PIN `1234`.

## The transport swap (where the work lives)
- **`pos/src/services/posGoDsClient.ts`** (NEW, ours) — raw `WebSocket` client to `/pos-go-ds`: `request(msg)` sends JSON and awaits the reply correlated by `msgType`; `send()` fire-and-forget; `onBroadcast(type,h)` for unsolicited `gameRound`/`gameResult`/`deviceLock`; `onClose`.
- **`pos/src/services/posConnection.ts`** (REWRITTEN) — `POSConnection` drives `PosGoDsClient`. Public interface (methods, return shapes, callback setters) preserved 1:1 so `usePOSConnection`/context/UI are untouched. Maps `/pos-go-ds` `deviceLogin`/`init` replies → the existing `DeviceLoginResult`/`InitResult` shapes. Adds `onRaceBroadcast(handler)` (multi-subscriber) and, after `init`, surfaces the init **gamepool** as a synthetic `gameRound` (primes the dashboard through the inter-round gap).
- **`pos/src/hooks/useRealRaceData.ts`** — no longer opens its own socket; subscribes to `posConnection.onRaceBroadcast()` and translates vendor `gamepool`/`gameRound`/`gameResult` → the internal `RaceData`/`RaceResult`/gamepool the Dashboard already consumes. **Single WebSocket only** (a 2nd connection = "device already connected" + no broadcasts without auth).

## Fixes applied (so it stays on the dashboard, betting enabled)
- **App.tsx** — dashboard-mount gate now requires `connectionState==='authenticated'` (not just images preloaded); added `hadAuthenticatedRef` guard so a transient `'ready'` during the connecting splash doesn't auto-logout. (Root cause of the earlier "login bounces back to login": image preloader finished before `login()` pushed `'authenticated'`.)
- **usePOSConnection.ts (~480)** — empty/stale-resume guard: when `init` returns an old `resumeStartDateTime` but empty `resumeTicketList`/zero balances, DON'T auto-balance + reLogin (that churn threw a transient "✓ ERROR Intente de nuevo" and disrupted the socket every login). Real pending sessions still balance.
- **useRealRaceData.ts (~862)** — `isDataStale` no longer keys off broadcast recency. `/pos-go-ds` broadcasts are **bursty** (e.g. 12 in 5s, then silent for ~70s), which falsely tripped the "RECONECTANDO Servidor de Carreras (Relay) / apuestas deshabilitadas" overlay. Now only stale when the socket is actually down (`connectionRef.isConnected()` + we hold gamepool data).
- **posLogger.ts (~162)** — removed the `X-Device-ID` request header on `POST /api/pos-logs/batch` (rejected by CORS; `deviceId` is already in the JSON body).
- **posConnection.ts keepalive** — no longer downgrades connection state; `onClose` is the single source of truth for real disconnects.

## Game-code mapping
`dog`/`dog6`→`dos` (141) · `dog8`→`doe` (541) · `dog63`→`dot` (341/741) · `horsec`/`horse`→`hoc` (241/251). Race number = last 4 of the round id (`141_101_202605240352` → `0352`). dog8 = 8 runners / 64-odds matrix; dog6 = 6 / 36.

## Status
- ✅ **Phase 1 — login**: discover → deviceLogin → init → dashboard, session persists. Verified in a real browser.
- ✅ **Phase 2 — race feed**: gamepool + broadcasts over the single socket; all game types incl. **dog8**; betting enabled. Verified in a real browser ("pone todos los datos").
- ⏳ **Phase 3 — tickets** (NEXT): `sendTicket` (native `bet_N`/`bet_N_M`, `gameId=<betofferId>_<x>_<roundCode>`), `reserveTicket`/`confirmTicket`, + printing (a printer emulator is available). These methods are currently **Phase-2 stubs returning error envelopes** in `posConnection.ts`.
- ⏳ **Phase 4 — pay/cancel + balance**: `sendTicketStatus` (payout/cancel), `queryTicketCode`, `sendBalance`. Implementing the REAL `sendBalance` closes the session server-side and removes the stale-resume churn at the source (the empty-resume guard is just a safety net).

## How to run & verify
```
cd pos && npm install
# .env as above
npm run dev            # http://localhost:4069/?deviceId=ce0b8aa81d6378ed42b077e6042b07b5
# OR (faster for headless verification):
npm run build && python3 ../../virtuales-go/tools/playwright/serve_webapp.py 8892 dist
# login: operator 001-001-001-001 / PIN 1234
```
A static build of the current state was served at `http://187.124.95.45:8892/` during development (may not be running in a new session — rebuild + reserve).

## Notes
- Don't re-point to the .NET SignalR backend — we deliberately moved to `/pos-go-ds`.
- Keep `posConnection`/`usePOSConnection`/`useRealRaceData` PUBLIC interfaces stable; the UI is untouched.
- `tsc -b` passes. Build via `npm run build`.
