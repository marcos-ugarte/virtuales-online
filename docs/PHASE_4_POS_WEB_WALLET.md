# Phase 4 — Cashier ↔ Web wallet (load & cash-out by phone)

> **Goal:** a player funds and cashes out their **web/mobile** wallet at a
> cashier **POS**, identified by their **phone number** (no prefix, 10 digits,
> e.g. `8092344543`). Phone is the cross-system ID and is **unique** in the DB.
>
> Status: **DESIGN / not implemented.** This doc is the build plan. It is
> grounded in the real code: `web.*` schema (`00023_web_player_surface.sql`),
> the web API (`internal/web/`), and the POS `/pos-go-ds` protocol
> (`internal/wsserver/pos_go.go`). See also `PHASE_3_TICKETS_INTEGRATION.md`.

## 0. Where we are today (verified)
- `web.players.phone VARCHAR(32)` exists but is **nullable and NOT unique**.
- `web.wallets` (balance/bonus/locked + `version` optimistic lock) and
  `web.wallet_ledger` (types already include **`DEPOSIT`** and **`WITHDRAWAL`**,
  with a **unique `idempotency_key`** and `reference_type/id`).
- Crediting a wallet from the API is **admin-only** (`POST /v1/web/admin/adjustments`,
  superadmin JWT). `POST /v1/web/withdrawals` is a **501 stub**.
- POS over `/pos-go-ds`: `msgType` RPC; after `init` the client holds
  `posOperatorID / posSessionID / posLocationID`; operator limits include
  `dailyPayoutLimit/Current`, `maxPayoutAmount`. Ticket payout already flows
  through `sendTicketStatus("payout")`.
- **No POS → web-wallet bridge exists.** This phase builds it.

## 1. Identity: phone number
- **Format:** exactly 10 digits, no prefix/country code. Normalize on every
  write/lookup: strip all non-digits, require `^[0-9]{10}$` (reject otherwise).
  (DR mobile = `809|829|849` + 7; keep the area-code check configurable, default off.)
- **Uniqueness:** phone must be unique across `web.players`. Migration:
  1. Normalize existing `phone` values in place.
  2. Resolve any duplicates / invalid values (report + manual fix; the migration
     must NOT silently drop data).
  3. Add a **partial unique index**: `CREATE UNIQUE INDEX ON web.players (phone) WHERE phone IS NOT NULL`.
- Phone becomes **required** for any player who wants POS funding (enforced at
  registration / profile, not necessarily backfilled for legacy rows).
- App-level normalization lives in one helper reused by registration, POS
  lookup, deposit and cash-out (single source of truth).

## 2. Flows

### 2.1 LOAD (cargar saldo) — cashier deposit
Phone alone is enough to *credit* (depositing into someone's account is not
harmful; we still confirm identity to avoid typos).

1. Player gives the cashier their **phone + cash**.
2. POS → `webWalletLookup { phone }` → backend returns `{ found, maskedName,
   username, currency, status }`. Cashier confirms it's the right person.
3. POS → `webDeposit { phone, amount, idempotencyKey }`.
4. Backend: find player by normalized phone → credit `web.wallets` (+ `DEPOSIT`
   ledger row, `reference_type='pos_deposit'`, `reference_id=<session/receipt>`),
   under the wallet `version` optimistic lock; idempotent on `idempotencyKey`.
5. **Cashier accounting:** the cash entered the drawer → record as a session
   **pay-in** so the Z/`sendBalance` reconciliation stays correct.
6. POS prints a deposit receipt (`Printer_Payin = "Depositar:"` exists).
7. Player sees the new balance in the app (it already polls `GET /v1/web/wallet`).

### 2.2 CASH-OUT (cobrar) — cashier payout, **phone-only** (decision 2026-05-26)
Cashier-initiated, identified by phone alone (no app step, no code).

1. Player goes to the cashier and gives their **phone**.
2. POS → `webCashoutLookup { phone }` → backend returns `{ found, maskedName,
   username, availableBalance, currency, status }`.
3. Cashier **verifies the person** (confirm name shown, player physically present)
   and enters the **amount** (≤ available balance).
4. POS → `webCashoutPay { phone, amount, idempotencyKey }` → backend debits the
   wallet (`WITHDRAWAL` ledger, `reference_type='pos_cashout'`, records operator /
   session / location) under the `version` optimistic lock; idempotent.
5. Cashier hands cash + prints a payout receipt (`PayoutVoucher`).
6. **Cashier accounting:** record as a session **pay-out** for the Z.
- Respect operator `maxPayoutAmount` / `dailyPayoutLimit` and the wallet's
  available balance. **No KYC gate** (decision 2026-05-26).

> ⚠️ **Accepted security risk (Jorge, 2026-05-26):** phone is NOT a secret, so
> phone-only cash-out means anyone who knows a player's number could withdraw at
> a POS. Mitigations baked in: cashier must confirm the masked name with the
> player present, per-operator daily/max payout limits, and a full audit trail
> (operator/session/location/phone/amount/ledger id). The in-app **one-time
> code** model (§ earlier draft) stays available as a `cashoutRequireCode` flag
> we can switch on later with no schema change beyond `withdrawal_requests`.

## 3. Backend work (`virtuales-go`)
- **Migration** (`00025_web_phone_unique.sql`):
  - phone normalize + partial unique index (§1).
  - (No `withdrawal_requests` table for v1 — phone-only cash-out is a direct
    cashier debit. That table is only needed if the `cashoutRequireCode` flag is
    turned on later.)
- **Wallet service** (extend `internal/web/`):
  - `CreditByPhone(phone, amount, currency, ref, idemKey)` → DEPOSIT.
  - `CashoutByPhone(phone, amount, currency, operatorCtx, idemKey)` → WITHDRAWAL
    (checks available balance + operator payout limits).
  - Both reuse the ledger + `version` lock + idempotency already in place.
- **Web API**:
  - `GET /v1/web/wallet` (exists) + `GET /v1/web/transactions` (optional) so the
    player sees deposits/cash-outs in the app. The 501 `POST /v1/web/withdrawals`
    stub can stay (self-service withdrawals are out of scope for v1).
- **POS `/pos-go-ds` handlers** (new `msgType`s in `pos_go.go`, same shape as
  `handlePosGoSendTicket`, using `client.posOperatorID/SessionID/LocationID` for
  auth + audit): `webWalletLookup`, `webDeposit`, `webCashoutLookup`, `webCashoutPay`.
- **Audit**: every deposit/cash-out logs operator, session, location, phone,
  amount, ledger id (the auth/audit tables from migrations 00009–00014).
- **Session totals**: deposits add to pay-in, cash-outs to pay-out, so the
  cashier Z (`sendBalance`) reconciles.

## 4. Frontend work
- **POS** (`pos/`): two flows — "Cargar saldo" (phone → confirm name → amount →
  print) and "Pagar cobro" (phone → confirm name + available balance → amount →
  pay → print); 10-digit phone input with live normalization/validation; wire
  both into the cashier session totals; receipts via the existing printer service.
- **Web/mobile** (`web-lobby/`): a "Saldo / Cajero" screen that shows **your phone**
  (the player gives it + cash to load, or gives it to withdraw) and a transaction
  history (deposits/cash-outs). No in-app cash-out step (phone-only model).
  Capture **phone at registration** with the unique-validation error mapped to a
  friendly message ("ese teléfono ya está registrado").

## 5. Rules / edge cases
- Money `NUMERIC(18,2)`.
- **No per-transaction min/max limits for now** (decision 2026-05-26). The
  existing **operator** daily/max payout limits still apply server-side as a
  safety net; we just add no new deposit/cash-out amount caps.
- **Currency: DOP** (decision 2026-05-26). DOP is already supported (stake limits
  seeded for DOP). New registrations/wallets → `DOP`. **Operate in the wallet's
  own currency** (don't hardcode DOP in the op) so a mismatched wallet can't be
  silently funded in the wrong currency. ⚠️ The only seeded wallet visible in
  code is the **USD demo** (`demo-player-01`); confirm real wallets with one query
  — `SELECT currency, count(*) FROM web.wallets GROUP BY 1` — before migrating.
- **Phone not found on deposit/cash-out → error.** No quick-register at POS
  (decision 2026-05-26); the player must already exist (registered in the app).
- Idempotency keys on every POS write (safe across reconnects/retries).
- **No KYC gate** on cash-out (decision 2026-05-26); still enforce operator
  payout limits + available balance.
- Concurrency via wallet `version`.

## 6. Suggested phasing
0. Data model: phone-unique migration + `withdrawal_requests`.
1. Backend wallet ops + web API (deposit by phone, withdrawal request/redeem).
2. POS `/pos-go-ds` messages + POS UI (cargar + cobrar) + receipts + session accounting.
3. Web/mobile UI (deposit info + cash-out request) + phone at registration.
4. Limits / KYC / audit hardening + Z reconciliation tests.

## 7. Decisions
**Locked (2026-05-26):**
1. **Cash-out authorization** — **phone-only at the POS** (no code). Accepted
   security risk + mitigations documented in §2.2.
2. **Currency** — **DOP**.
3. **KYC** — **none** required to cash out.

4. **Limits** — **no new per-transaction limits** for now; keep existing operator payout limits.
5. **Quick-register at POS** — **no**; phone not found → error, player must register in the app first.
6. **Currency of existing wallets** — believed **DOP** already (to confirm with the one-line query above); operations run in the wallet's own currency regardless.

_All Phase-4 decisions are locked. Ready to build on confirmation._
