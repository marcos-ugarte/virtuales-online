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
- **Dashboard.tsx `enabledPrefixes` (~152) — EMPTY BOARD BUG (2026-05-25).** Symptom: after login the dashboard mounts but the carousel renders **zero** GameSlides — only the game background photo shows ("solo se ve el fondo de los perros"), no bets/carousel. Root cause: the `/pos-go-ds` discover returns `games` by **type name** (`["dog","dog8","horse","dog63","horsec"]`) but `enabledPrefixes` filtered them against POS **prefixes** (`['dos','doe','dot','hoc']`) → zero matches → empty carousel (the `['dos','doe']` fallback only fires when discovery `games` is *empty*, not when it's non-empty-but-unmatched). Fix: map discovery type names → prefixes via `DISCOVERY_TYPE_TO_PREFIX` (`dog`/`dog6`→`dos`, `dog8`→`doe`; direct prefixes still pass through) before the filter. Also added a **"SIN JUEGOS / No hay juegos configurados"** `BaseModal` when `enabledPrefixes` ends up empty, instead of a silent blank board. Verified live: login → carousel shows dos+doe, 6 runner selectors render. NOTE the feed/backend were never at fault — `init` delivers a full fresh 117-round gamepool.

## Game-code mapping
`dog`/`dog6`→`dos` (141) · `dog8`→`doe` (541) · `dog63`→`dot` (341/741) · `horsec`/`horse`→`hoc` (241/251). Race number = last 4 of the round id (`141_101_202605240352` → `0352`). dog8 = 8 runners / 64-odds matrix; dog6 = 6 / 36.

## Status
- ✅ **Phase 1 — login**: discover → deviceLogin → init → dashboard, session persists. Verified in a real browser.
- ✅ **Phase 2 — race feed**: gamepool + broadcasts over the single socket; all game types incl. **dog8**; betting enabled. Verified in a real browser ("pone todos los datos").
- 🟡 **Phase 3 — tickets** (IN PROGRESS, 2026-05-25): **`sendTicket` IMPLEMENTED** in `posConnection.ts` (was a stub returning `INTERNAL_ERROR` "Tickets not implemented yet (Phase 2)" — that was the "internal error al imprimir"). Mirrors virteon's `sendTicket` logic/flow (same `calculateWinIndex`/`calculateExactaIndex`, same `SendTicketResult` shape + `onTicketCreated`/`onTicketError` events) but adapts the wire to `/pos-go-ds`: sends the **structured `tips[]`** payload (`{line,betType,betTypeName,selection1,selection2,amount,odds,oddsIndex}`), NOT `bet_N`. **Why tips+odds:** the Go backend `handlePosGoSendTicket` stores each tip's odds and settlement pays `amount*odds*bonus` (`pgpos/settle.go:214`); its `bet_N` path hard-codes `odds=1.0` (TODO not implemented), so the POS must supply authoritative odds. We stamp each tip with the round odds from the **gamepool feed** (`roundOddsById` map, populated in the `gameRound` broadcast handler + init priming; `cacheRoundOdds()`) — server-fed, not cashier-typed. Bonus is resolved server-side. Verified live (Dinamica, `001-001-001-001`/`1234`): WIN runner-1 $25 on round `141_101_202605260031` → `{msgValue:ok, ticketID:9f9fb27f21f397a3}`, appears in VENTAS, odds resolved to **4.8** (`odds[0]`), so payout is correct. **STILL STUBS:** `reserveTicket`/`confirmTicket` (printerRequired=true flow — Dinamica is printerRequired=false so `sendTicket` direct path is used), `sendTicketRaw`. Printer print step is separate (printer emulator). NOTE backend `/pos-go-ds` runs locally on this machine too (`localhost:4099/4101`) for end-to-end testing.
- 🖨️ **Printing fix (2026-05-26)** — ticket created but didn't print. `handlePrint` has two branches: `printerRequired===true` (reserve → printerCheck → `PrinterService.printTicket` → confirm) and the **`else` "no-printer flow"** (printerRequired:false, Dinamica's case) which created via `sendTicket` and showed only the on-screen notification, **never calling `printTicket`**. Fix: the no-printer flow now also builds `printData` + fires `PrinterService.printTicket()` **fire-and-forget** (printer OPTIONAL, never blocks the sale). Printing (`printer.ts`): mode `vendor` → POST XML to `WebPosPrinter.exe` `http://localhost:8085/printer/` (Dinamica `printerMode:'vendor'`); mode `node` → `http://localhost:4053`. Print path verified executing with correct printData; physical print needs WebPosPrinter on the terminal (absent in headless test env).
- 🟡 **Phase 4 — pay/cancel + balance** (IN PROGRESS, 2026-05-26): **`sendBalance` and `sendTicketStatus` IMPLEMENTED** (were stubs faking success/ok). Both mirror virteon's payloads adapted to the `/pos-go-ds` WS: `sendBalance` → `{totalBet,totalWin,totalCassa,countTip,countTicketCancel,balanceSessionID,isAutobalance,...}` (backend `handlePosGoSendBalance`→`InsertBalance`, server-authoritative; fails open to success so logout/login never blocks); `sendTicketStatus(ticketId,newStatus)` → `{ticketId,newStatus:cancel|payout|autocancel|autopayout,confirm,sessionID}` (backend maps cancel→cancelled, payout→paid via `UpdateTicketStatus`). This makes **previous-session reconciliation actually communicate**: `usePOSConnection.processPendingSessions` already orchestrated it from the init `oldBalanceList`/`oldTicketsToPayout`/`resumeTicketList`, and the field names are confirmed adapted to our backend (`OldBalance` json `operatorID/sessionID/totalBet/totalWin/totalCassa`; `buildTicketList` emits `ticketId/gameId/amount` — backend even comments "ticketId (not ticketID)…"). Verified live round-trip: sendTicket→ok, sendTicketStatus(cancel)→ok status:cancel, sendBalance→ok. **`getTicket`/`payTicket`/`cancelTicket`/`reserveTicket`/`confirmTicket` IMPLEMENTED too (2026-05-26):**
- `getTicket(code)` → `queryTicketCode`, maps reply → `GetTicketSuccess` (ticketNumber, status, betAmount/winAmount/possibleWin, isPaid, roundCode, gameTypeId=betofferId, tips). `ticketId` is a numeric placeholder (0) — **our ticket codes are hex strings, so pay/cancel now key off `ticketNumber`**; the modal/handler/method signatures were widened from `number`→`string` (TicketActionModal, TicketDetailModal, DashboardOverlays props, Dashboard handleTicketPay/Cancel, posConnection payTicket/cancelTicket) and the modals call `onPay/onCancel(ticket.ticketNumber)`.
- `cancelTicket(num)`/`payTicket(num)` → getTicket (validate + amount for receipt) then `sendTicketStatus(num,'cancel'|'payout')`.
- `reserveTicket`/`confirmTicket`: **/pos-go-ds has no reserve/confirm handshake** (`sendTicket` creates atomically), so reserve == create (delegates to sendTicket, returns ReserveTicketResult shape + tips) and confirm is a no-op success. ⚠️ printerRequired devices risk an orphan if the printer check fails after reserve — our devices are printerRequired:false (direct sendTicket path); a real backend reserve/confirm is the proper fix if a printer-gated device is deployed.
Verified live round-trip: create→ok, queryTicketCode→ok (status pending, odds 4.3 stored), sendTicketStatus(cancel)→ok, requery→status **cancelled**. **STILL STUB:** `getBalance` (unused — balance comes from the session/init).

## POS client-logs → Elasticsearch (2026-05-26)
The POS `posLogger` batches client events and POSTs `/api/pos-logs/batch`
(`{deviceId,sessionId,operatorId,appVersion,logs[]}`). virtuales-go had no such
route → **404** (harmless, the client is fire-and-forget, but logs were lost).
Implemented in **virtuales-go** (`cmd/api/poslogs.go`, branch `feat/pos-logs-es`
commit `11dfaf6`, deployed to the running `virtuales-api` container): `POST
/api/pos-logs` + `/batch` index one doc per log into the **`vg-pos-client-logs`**
ES index (Elastic Cloud, sibling of `vg-pos-messages`), device→location/provider
resolved from PG. Modeled on the .NET `PosLogsController` + what virteon sends.
ES creds live in virtuales-go `.env` (`ES_ENABLED/ES_HOST/ES_API_KEY/POS_LOGS_ES_INDEX`,
wired via `docker-compose.override.yml`). Verified e2e (direct + via nginx HTTPS):
`{ok,count}` 200 and docs land in ES. Query: `vg-pos-client-logs/_search`.

## HTTPS access on the VPS (required for printing — 2026-05-26)
Printing needs a **secure context** (`canReachLocalPrintServer()` is https-only:
Chrome lets an HTTPS page fetch `http://localhost:8085` WebPosPrinter, an HTTP
page can't). The POS is served on this VPS (187.124.95.45) by the **vite dev
server on :4069** (this repo, HMR — code changes are live without a build) and
exposed over **HTTPS by system nginx** via the `pos-test` site → one origin
`https://187.124.95.45/` routing UI→4069, `/api/*`→4101, `/pos-go-ds`(wss)→4099.
Two gotchas hit while wiring this up:
- **`sites-enabled/pos-test` is a regular COPY, not a symlink** to
  `sites-available/` — edit the enabled copy (then `nginx -t && systemctl reload
  nginx`). `pos-test` had **no `server_name`**, so the bare IP fell through to
  `ds-capture` (its dashboard). Fix: added `server_name 187.124.95.45;` to the
  `:443` block of the enabled `pos-test`. (Re-apply if nginx configs are regen'd.)
- **`pos/.env` must use same-origin**: set `VITE_API_URL=` (empty) so discovery
  is relative (`/api/ws/discover`) and the WS is `wss://<host>/pos-go-ds` derived
  from the page origin (resolveWsUrl). A non-empty `http://…:4101` causes
  **mixed-content** ("sin conexión / reconectando") on the HTTPS page. Restart
  vite after editing `.env`.
Use **`https://187.124.95.45/?deviceId=ce0b8aa81d6378ed42b077e6042b07b5`** (accept
the self-signed cert), NOT `http://…:4069` (no printing, and same-origin discover
won't resolve without nginx).

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
