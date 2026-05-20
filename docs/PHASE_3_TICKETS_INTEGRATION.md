# Tickets integration — Phases 2 + 3 + 5

> **Status:** design doc, not yet implemented.
> **Goal:** close the bet loop so the lobby can place real tickets, show
> live balance, and let the player consult their active + historical bets.
> **Estimate:** ~6 hours total. Dependencies: backend `feat/web-player-surface`
> deployed (✅, validated 2026-05-18 with `demo-player-01`).
>
> Backend contract reference: `virtuales-go/docs/MANUAL_WEB_PLAYER.md`.

## 1. Current state — what works, what's mock

| Concern | Status | Notes |
|---|---|---|
| Race data (`/web-ds` WS) | ✅ Real | `useRaceFeed` consumes live gamepool + gameResult pushes. |
| Login (`/v1/web/auth/login`) | ✅ Real | `HttpAuthService` switched on via `VITE_AUTH_MODE=http`. Refresh-rotate-on-use works. |
| Navbar balance | 🟡 Mock-ish | Reads `user.balance` from the login snapshot (`player.balance.available`). Doesn't auto-refresh after bets. |
| **PLACE BET** | ❌ Mock | `Betslip.handlePlace()` only toasts `betslip.placed` and `clearAll()`. **No HTTP call.** |
| Active bets ("MIS APUESTAS · ACTIVAS") | ❌ Missing | No UI, no service. |
| History ("MIS APUESTAS · HISTORIAL") | ❌ Missing | No UI, no service. |
| Settlement push (`/web-player` WS) | ❌ Missing | No client. Phase 4 — out of scope of this doc. |

End-to-end verified against the real backend with a node script
(`relay/` workspace, see chat transcript 2026-05-18 01:48 UTC):

```
POST /v1/web/auth/login    → 200, accessToken issued
POST /v1/web/tickets       → 201, ticketId f93..., wallet locked +1.00
GET  /v1/web/wallet        → balance debited correctly
```

So the **backend is ready**; the gap is purely in the client.

---

## 2. Phase 2 — Wallet live (~1h)

### Goal
After every state-changing action (placement, settlement) the Navbar reflects
the real wallet without a page reload.

### New module: `src/services/wallet.ts`

```ts
import { apiClient } from './apiClient';      // new helper, §2.3
import { parseWallet, type WalletDTO, type Wallet } from './money';

export async function fetchWallet(accessToken: string): Promise<Wallet> {
  const dto = await apiClient.get<WalletDTO>('/wallet', accessToken);
  return parseWallet(dto);
}
```

### New state: `src/state/wallet.tsx`

`WalletProvider` (React context):
- `state: { wallet: Wallet | null; status: 'idle'|'loading'|'error' }`
- `refresh(): Promise<void>` — calls `fetchWallet`, updates state.
- Subscribes to auth status: on `authenticated` → first fetch. On `anonymous` → clear.
- Exposes `refresh()` so the Betslip can trigger after a successful POST.

### Generic HTTP helper: `src/services/apiClient.ts`

Why: every authed call needs Bearer header + auto-retry on 401 (refresh once, then logout).

```ts
class ApiClient {
  constructor(private baseUrl: string, private auth: AuthService) {}
  get<T>(path: string, accessToken: string): Promise<T>
  post<T>(path: string, body: unknown, accessToken: string, idemKey?: string): Promise<T>
}
```

On 401:
1. Try `auth.refresh()` (uses stored refresh token).
2. If refresh succeeds → persist new tokens → retry the original request once.
3. If refresh fails → emit a `forceLogout` event → AuthProvider goes to `anonymous`.

### Navbar wiring

```diff
- const balance = formatMoney(user?.balance ?? 0);
+ const { wallet } = useWallet();
+ const balance = formatMoney(wallet?.available ?? 0);
```

### Acceptance

- Right after login, the Navbar shows the value from `GET /wallet` (not from the login snapshot).
- After PLACE BET succeeds, the Navbar drops by the stake amount within ~500ms.

---

## 3. Phase 3 — Real placement (~3-4h)

### Goal
`Betslip.handlePlace()` posts a real ticket, handles all rejection codes,
refreshes the wallet, and gives the user clear feedback.

### New module: `src/services/tickets.ts`

```ts
export interface PlaceTicketRequest {
  raceId: string;
  currency: 'USD' | 'DOP';
  selections: Array<{
    betType: 'win';
    selection: { runner: number };
    odds: number;
    stake: string;                  // wire format: "5.00"
  }>;
}

export interface PlaceTicketResponse {
  ticketId: string;
  status: 'accepted' | 'rejected';
  rejectReason?: TicketRejectReason;
  totalStake: string;
  potentialPayout: string;
  wallet: WalletDTO;
}

export type TicketRejectReason =
  | 'betting_closed'
  | 'odds_changed'
  | 'race_not_found'
  | 'selection_runner_not_in_race'
  | 'selection_duplicate_runners'
  | 'selection_malformed'
  | 'insufficient_funds'
  | 'stake_below_min'
  | 'stake_above_max'
  | 'kyc_required'
  | 'self_excluded'
  | 'account_suspended'
  | 'account_closed';

export async function placeTicket(
  req: PlaceTicketRequest,
  accessToken: string,
): Promise<PlaceTicketResponse> {
  const idemKey = crypto.randomUUID();  // UUID v4 — MANUAL_WEB_PLAYER §6
  return apiClient.post<PlaceTicketResponse>(
    '/tickets',
    req,
    accessToken,
    idemKey,
  );
}
```

### Idempotency strategy

The backend requires `Idempotency-Key: <UUID v4>` and persists the SHA-256
of the canonical body for divergence detection. Two valid approaches:

| Approach | Pros | Cons |
|---|---|---|
| Generate per-click on PLACE BET | Simple. Each PLACE BET attempt gets a fresh key. | If the request succeeds but the response is lost, retry creates a new ticket. |
| Generate when slip becomes non-empty, regenerate after success | Safer (retries collapse). | Need to track key lifecycle. |

Recommendation: **per-click is enough for v1**. Real network blips are
rare against the same host. If we observe issues, escalate to lifecycle-tracked.

### Betslip change

`Betslip.handlePlace()` becomes:

```ts
const handlePlace = async () => {
  if (selections.length === 0) return;
  setSubmitting(true);
  try {
    const req: PlaceTicketRequest = {
      raceId: selections[0].raceId,  // assume single-race for now; see §6
      currency,
      selections: selections.map(s => ({
        betType: 'win',
        selection: { runner: s.runnerPos },
        odds: s.odds,
        stake: formatMoneyWire(s.stake),
      })),
    };
    const resp = await placeTicket(req, await getAccessToken());
    if (resp.status === 'accepted') {
      setConfirmation(t('betslip.placed'));
      clearAll();
      refreshWallet();
    } else {
      setError(t(`betslip.reject.${resp.rejectReason}`));
    }
  } catch (e) {
    setError(t('betslip.reject.network'));
  } finally {
    setSubmitting(false);
  }
};
```

### i18n — reject reasons

| Code | Spanish | English |
|---|---|---|
| `betting_closed` | "La carrera ya empezó." | "Race already started." |
| `odds_changed` | "Las cuotas cambiaron. Revisa el ticket." | "Odds changed. Review your ticket." |
| `race_not_found` | "Carrera no encontrada." | "Race not found." |
| `insufficient_funds` | "Saldo insuficiente." | "Insufficient funds." |
| `stake_below_min` | "Importe por debajo del mínimo." | "Stake below minimum." |
| `stake_above_max` | "Importe por encima del máximo." | "Stake above maximum." |
| `kyc_required` | "Verifica tu cuenta para apostar más." | "KYC required for this stake." |
| `self_excluded` | "Tu cuenta está autoexcluida." | "Account is self-excluded." |
| `account_suspended` | "Cuenta suspendida. Contacta soporte." | "Account suspended." |
| `account_closed` | "Cuenta cerrada." | "Account closed." |
| `selection_*` | "Selección inválida." | "Invalid selection." |
| `network` | "Error de conexión. Inténtalo de nuevo." | "Network error. Try again." |

### Acceptance

- Successful POST → `Ticket placed` toast + slip empties + wallet drops within 500ms.
- Each rejection code maps to a specific user-facing message.
- 401 mid-request → refresh + auto-retry once.
- Two rapid clicks on PLACE BET produce one ticket (same Idempotency-Key in flight).

---

## 4. Phase 5 — "MIS APUESTAS" view (~2-3h)

### Entry point — Navbar button

```
[bandera] [moneda] 👤 demo-player-01  [MIS APUESTAS (3)]  $ 994.50  [Cerrar sesión]
```

Badge `(3)` = count of `status='open'` tickets, fetched on login + after
every placement. Click → open `MyBetsDrawer`.

### Drawer layout

```
┌─ MIS APUESTAS ──────────────────────────────────────  ×
│
│  [ ACTIVAS (3) ]  [ HISTORIAL ]
│
│  ── ACTIVAS — ordenadas por carrera más próxima ──
│
│  ┌────────────────────────────────────────────────┐
│  │ 🐕 CARRERA 0207 · Galgos 6 · empieza en 01:24  │
│  │    Lassie · GANA @ 5.20                        │
│  │    APUESTA $5.00       POSIBLE GANANCIA $26.00 │
│  └────────────────────────────────────────────────┘
│
│  ┌────────────────────────────────────────────────┐
│  │ 🐎 CARRERA 0208 · Caballos 7 · empieza en 04:50│
│  │    Eldir · GANA @ 8.30                         │
│  │    APUESTA $2.00       POSIBLE GANANCIA $16.60 │
│  └────────────────────────────────────────────────┘
│
│  [ Cargar más ]
│
│  ── HISTORIAL ─ últimas 20, paginadas ──
│
│  ┌────────────────────────────────────────────────┐
│  │ ✅ GANADA · CARRERA 0204 · Galgos 6            │
│  │    Lassie · GANA @ 5.20 → 1º                   │
│  │    APUESTA $1.00       PAGO $5.20              │
│  │    Liquidada hace 4 minutos                    │
│  └────────────────────────────────────────────────┘
│
│  ┌────────────────────────────────────────────────┐
│  │ ❌ PERDIDA · CARRERA 0203 · Caballos 7         │
│  │    Wing · GANA @ 6.50 → 4º                     │
│  │    APUESTA $1.00       PAGO $0                 │
│  │    Liquidada hace 8 minutos                    │
│  └────────────────────────────────────────────────┘
│
│  [ Cargar más ]
└─────────────────────────────────────────────────────
```

### Data source

```
GET /v1/web/tickets?status=open&limit=20
GET /v1/web/tickets?status=settled&limit=20&cursor=<opaque>
GET /v1/web/tickets/{ticketId}    ← detail (full selections + race info)
```

Response shape (verified vs `MANUAL_WEB_PLAYER §3.6`):

```json
{
  "items": [
    {
      "ticketId": "uuid",
      "createdAt": "2026-05-18 12:34:56Z",
      "status": "open" | "won" | "lost" | "void" | "partially_settled",
      "race": { "id": "...", "eventType": "dog", "videoStartDt": "..." },
      "selections": [
        { "betType": "win", "selection": {"runner": 3}, "odds": "5.20", "stake": "1.00", "result": "pending|won|lost|void" }
      ],
      "totalStake": "1.00",
      "potentialPayout": "5.20",
      "payout": null | "5.20",
      "settledAt": null | "2026-05-18 12:38:30Z"
    }
  ],
  "nextCursor": "base64..." // null if no more
}
```

### State module: `src/state/myBets.tsx`

```ts
interface MyBetsCtx {
  active: Ticket[];
  history: Ticket[];
  activeCount: number;       // for the navbar badge
  status: { active: 'idle'|'loading'|'error', history: 'idle'|'loading'|'error' };
  hasMoreHistory: boolean;
  refreshActive(): Promise<void>;
  loadMoreHistory(): Promise<void>;
  refreshHistoryHead(): Promise<void>;  // re-fetch first page (used after settlement)
}
```

### Refresh strategy

| Trigger | Action |
|---|---|
| Login | `refreshActive()` |
| Successful placement | `refreshActive()` |
| Drawer opens | `refreshActive()` + `refreshHistoryHead()` |
| Every 30s while drawer open | `refreshActive()` only |
| Race ends (gameResult on `/web-ds`) | Optimistic: move any `open` ticket on that race to `loading_settle` and call `refreshActive()` in 1s |
| Phase 4 — WS push `ticketSettled` | Move that ticket into history list with the pushed result |

### Acceptance

- Place a bet → it appears in ACTIVAS within 500ms.
- Race ends → ticket disappears from ACTIVAS, appears at top of HISTORIAL as won/lost.
- Pagination works with opaque cursor.
- Badge count in Navbar updates after every placement / settlement.

---

## 5. Component file map

| Path | Role | Status |
|---|---|---|
| `src/services/apiClient.ts` | Generic Bearer + auto-refresh client | NEW |
| `src/services/wallet.ts` | `fetchWallet()` | NEW |
| `src/services/tickets.ts` | `placeTicket`, `listTickets`, `getTicket` | NEW |
| `src/state/wallet.tsx` | `WalletProvider`, `useWallet()` | NEW |
| `src/state/myBets.tsx` | `MyBetsProvider`, `useMyBets()` | NEW |
| `src/components/MyBetsDrawer.tsx` | Drawer UI with ACTIVAS/HISTORIAL tabs | NEW |
| `src/components/TicketCard.tsx` | One ticket row inside the drawer | NEW |
| `src/components/Navbar.tsx` | Add MIS APUESTAS button + badge | EDIT |
| `src/components/Betslip.tsx` | Call real `placeTicket`, handle errors | EDIT |
| `src/i18n.tsx` | New strings (reject reasons, mybets.*, etc.) | EDIT |
| `src/main.tsx` | Wrap with `WalletProvider` + `MyBetsProvider` | EDIT |
| `src/styles/global.css` | Drawer styles, ticket card styles | EDIT |

---

## 6. Open decisions

1. **Single-race vs multi-race ticket POST**
   The current `POST /tickets` body has a single `raceId` with `selections[]`.
   Our Betslip can hold selections from multiple races. Two options:
   a. **Reject multi-race at the client** — disable PLACE BET if more than one
      `raceId` is in the slip, show "split into separate tickets" hint.
   b. **Auto-split into N POSTs** — one ticket per race, sequentially with
      unique idem keys. Refresh wallet once at the end.
   _Recommendation: (a)_ for v1. Cleaner mental model and prevents partial-success
   weirdness (one ticket succeeds, another fails on `betting_closed`).
   _Alternative for the patient_: implement (b) but show per-race progress
   in the UI.

2. **Master vs per-tip stake on placement**
   The model is currently per-tip (each `BetSelection.stake` is independent).
   The backend POST body takes per-selection stakes, so this is fine. No
   change needed.

3. **Where the drawer lives**
   - Side drawer (slide-in from right, ~70% width) — recommended.
   - Full-screen overlay — too disruptive.
   - Embedded section below the Betslip — too cramped at 280px column.

4. **Auto-open MIS APUESTAS after placement?**
   No. Show a confirmation toast in the Betslip area; the user can click the
   Navbar badge to verify. Auto-opening interrupts flow.

5. **Cursor format**
   Opaque per `MANUAL_WEB_PLAYER §3.6`. Client treats as a string. We pass
   it back verbatim. No parsing.

6. **Demo account starting balance**
   `demo-player-01` is shared across whoever tests. Real demos should pre-seed
   a per-tester account (`demo-jorge`, etc.) so balances don't conflict.
   Note for the backend team, not blocking this work.

---

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `odds_changed` rejection — odds drift between click and placement | Medium | Show the new odds in the reject message and offer "accept new odds" button. v1: just error out. |
| Race rotates between click and placement (`betting_closed`) | Medium | Same — show clear message. Already happens with 240s cycles + slow click. |
| 401 storm during refresh-rotate-on-use | Low | The single-shot dedupe in AuthProvider (`bootedRef`) prevents the boot case. The apiClient does serial retry (not parallel). |
| Network blackhole on placement (request sent, response lost) | Low | Idempotency-Key collapses the retry. v1 doesn't auto-retry on network error; user clicks again. |
| User has selections from a now-expired race | Medium | `pruneToActiveRaces` already drops them. Acceptable. |

---

## 8. Out of scope (defer)

- WS push for settlement (`/web-player`) — Phase 4. Polling at 30s is fine for demo.
- Cash-out — backend doesn't expose it.
- Bet sharing / social — not in scope.
- Print/PDF ticket receipt — not in scope.
- Multi-currency wallet selector — backend currently single-currency per player.

---

## 9. Execution checklist (when ready to code)

1. [ ] `apiClient.ts` with Bearer + 401-retry pattern.
2. [ ] `wallet.ts` service + `WalletProvider` + Navbar wiring.
3. [ ] `tickets.ts` service (`placeTicket` first).
4. [ ] Betslip → real placement + error mapping + wallet refresh.
5. [ ] Smoke test: place ticket, see Navbar drop, retry shows idempotent response.
6. [ ] `myBets.tsx` provider with active polling.
7. [ ] `MyBetsDrawer.tsx` + `TicketCard.tsx`.
8. [ ] Navbar "MIS APUESTAS (n)" button + badge.
9. [ ] History pagination + cursor handling.
10. [ ] Full end-to-end Playwright run: login → bet → see active → wait → see history.
