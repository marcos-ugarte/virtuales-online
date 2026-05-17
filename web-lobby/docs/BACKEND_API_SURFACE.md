# virtuales-go API surface — for web-lobby consumption

> Generated 2026-05-17 from an audit of `virtuales-go` (HEAD).
> Scope: everything a React web-lobby would need to consume from the existing `virtuales-go` codebase. Every endpoint cited below was verified against the source at the indicated `file:line`. Where a capability does **not** exist, Section 5 says so explicitly.

The repo ships **two long-running HTTP binaries** and one cmd-only MCP/CLI surface:

- `cmd/api` — HTTP-only JSON API on port **4098** (env `API_PORT`). Admin dashboard, public race read-API (`/v1/races/*`), legacy `/api/races/*`, device-config. No WebSocket.
- `cmd/tv-broadcaster` — WebSocket server on port **4097** (env `PORT`). All `/tv-ds`, `/pos-go-ds`, `/web-ds`, `/race-results`, `/api/subscribe`, plus a `/health` and `/metrics`.

The web-lobby will talk to **both** binaries: HTTP to `cmd/api`, WebSocket to `cmd/tv-broadcaster`.

---

## 1. Auth

### Binary, port, configuration

`cmd/api/main.go:121-138` — `main()` reads:

| Env var | Default | Purpose |
|---|---|---|
| `API_PORT` | `4098` | HTTP listen port (`cmd/api/main.go:122`) |
| `APP_ENV` | `dev` | `prod`/`staging` → fail-closed on missing secrets |
| `JWT_SECRET` | dev-only fallback `virtuales-dev-secret-CHANGE-ME` | HS256 signing key. Required in prod/staging. (`cmd/api/main.go:65-75`) |
| `JWT_SECRET_PREVIOUS` | `""` | Rotation grace: validation-only, never used to sign |
| `DATABASE_URL` | `postgres://virtuales:virtuales@localhost:5432/virtuales_v2?sslmode=disable` | Postgres DSN for admin/auth |
| `API_KEY` | `""` | Optional `X-API-Key` gate on *everything except* `/api/health` |

### Routes

All defined in `internal/admin/admin.go` via `RegisterRoutes`:

| Method | Path | Handler file:line | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | `internal/admin/admin.go:45` → `internal/admin/auth.go:61` (`handleLogin`) | public |
| POST | `/api/auth/refresh` | `internal/admin/admin.go:46` → `internal/admin/auth.go:208` (`handleRefresh`) | public |
| GET | `/api/auth/me` | `internal/admin/admin.go:53` → `internal/admin/auth.go:288` (`handleMe`) | Bearer |

There are **no other `/api/auth/*` routes**. There is no `/api/auth/logout` (revocation is server-side via `/api/admin/tokens/{id}` for auth-v2 only — that surface is dashboard-internal, not consumer-facing).

### Request / response structs (verbatim from source)

`internal/admin/auth.go:43-46`:

```go
type loginRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
}
```

`internal/admin/auth.go:48-59`:

```go
type loginResponse struct {
    AccessToken  string   `json:"accessToken"`
    RefreshToken string   `json:"refreshToken"`
    User         AuthUser `json:"user"`
    MustChangePassword bool `json:"mustChangePassword"`
}
```

`internal/admin/auth.go:29-41`:

```go
type AuthUser struct {
    UserID      int      `json:"userId"`
    Username    string   `json:"username"`
    FullName    string   `json:"fullName"`
    FirstName   *string  `json:"firstName"`
    LastName    *string  `json:"lastName"`
    Role        string   `json:"role"`
    RoleName    *string  `json:"roleName"`
    RoleID      *int     `json:"roleId"`
    ProviderID  int      `json:"providerId"`
    LocationID  *string  `json:"locationId"`
    Permissions []string `json:"permissions"`
}
```

Refresh body is anonymous (`internal/admin/auth.go:209-211`):

```go
var req struct {
    RefreshToken string `json:"refreshToken"`
}
```

Refresh response (`internal/admin/auth.go:283-285`) is just `{"accessToken": "<jwt>"}`. The refresh-token is **not** rotated.

### JWT details

- Signing: HS256, claims struct `internal/middleware/auth.go:17-23`:
  ```go
  type Claims struct {
      UserID     int    `json:"userId"`
      Username   string `json:"username"`
      Role       string `json:"role"`
      ProviderID int    `json:"providerId"`
      jwt.RegisteredClaims
  }
  ```
- Access TTL: **24 hours** (`internal/admin/auth.go:156`)
- Refresh TTL: **7 days** (`internal/admin/auth.go:175`)
- Refresh model: client POSTs the refresh token → server returns a new access token (same claims, refreshed `exp`). No refresh rotation, no revocation list on the JWT path.
- Lockout: 10 failed `bcrypt` attempts → account locked (`internal/admin/auth.go:115-120`).

### Bearer presentation

Header `Authorization: Bearer <accessToken>` (`internal/middleware/auth.go:74-80`). Algorithm-confusion guarded — only `*jwt.SigningMethodHMAC` accepted.

### Roles / scopes

`Claims.Role` is a free-text string read from `admin_users.role`. The middleware enforces named roles only here:

- `middleware.RequireRole("superadmin")` is wired to mutations on `/api/operator-roles` (`internal/admin/admin.go:102-107`) and `/api/admin/tokens` (`internal/admin/tokens.go:134-137`).

There is **no role gate on read endpoints** — every authenticated admin can hit `/api/dashboard`, `/api/tickets/report`, etc. The auth model is admin-vs-superadmin; there is no per-player role.

---

## 2. Race data (HTTP read)

Two parallel surfaces. **Prefer `/v1/races/*`** — the `/api/races/*` set is wrapped with RFC 8594 `Deprecation` + `Sunset` headers pointing at the `/v1` successors (`cmd/api/main.go:306-316`).

### `/v1/races/*` (preferred)

Registered in `internal/raceapi/handlers.go:58-64` via `Register()` in `internal/raceapi/server.go:24-46`. Mounted at `/v1/races/` (path stripped before sub-mux). Chain: recover → metrics → maxBytes → requestID → cors → rateLimit. ETag + `If-None-Match` honored; `Cache-Control` is state-aware.

| Method | Path | Handler file:line | Purpose |
|---|---|---|---|
| GET | `/v1/races/current/{gameType}` | `internal/raceapi/handlers.go:170` | freshest in-progress / latest round for a game type — full DTO |
| GET | `/v1/races/upcoming/{gameType}` | `internal/raceapi/handlers.go:284` | paginated upcoming. `?limit=N` (1–50, default 20), `?cursor=<opaque>`, `?detail=summary\|full` |
| GET | `/v1/races/live/{gameType}` | `internal/raceapi/handlers.go:392` | paginated recent finished rounds (newest-first), same query knobs as `/upcoming` |
| GET | `/v1/races/detail/{roundCode}` | `internal/raceapi/handlers.go:254` | one race by `roundCode` (regex `^[A-Za-z0-9_]{1,64}$`) — full DTO |
| GET | `/v1/races/subscribe` | `internal/raceapi/sse.go:73` | SSE stream (see below) |

`{gameType}` is allow-listed in `internal/raceapi/handlers.go:37-43`: `dog6`, `dog8`, `dog63`, `horse`, `horse_classic`.

### Response shapes

**Summary** envelope returned by `/upcoming`, `/live`:

```go
// internal/raceapi/handlers.go:17-20
type listEnvelope struct {
    Items      []RacePublicDTO `json:"items"`
    NextCursor string          `json:"nextCursor,omitempty"`
}
```

`RacePublicDTO` (`internal/raceapi/dto.go:45-60`):

```go
type RacePublicDTO struct {
    RoundCode       string             `json:"roundCode"`
    GameType        string             `json:"gameType"`
    ScheduledAt     time.Time          `json:"scheduledAt"`
    State           string             `json:"state"`          // "open" | "final" | "closed"
    Bonus           int                `json:"bonus"`          // 1, 2, or 3
    Participants    []Participant      `json:"participants"`
    FinishOrder     []FinishOrderEntry `json:"finishOrder,omitempty"`
    Payouts         []Payout           `json:"payouts,omitempty"`
    ServerTimestamp time.Time          `json:"serverTimestamp"`
}
```

with `Participant{dorsal, name, displayOrder, winOdds?}`, `FinishOrderEntry{position, dorsal, finishTime?}`, `Payout{betType, selection, amount}` (currently `betType="win"` only — see `internal/raceapi/dto.go:63-85`).

**Full** DTO (returned unconditionally by `/current` and `/detail`, and by list endpoints with `?detail=full`) — `internal/raceapi/dto_full.go:36-81`. It **embeds** `RacePublicDTO` (flat-promoted on the wire) then adds vendor-mirror fields: `id`, `eventType`, `roundInterval`, `videoStartDt`/`videoEndDt`, `courseConditions`, `weather`, `temperature`, `humidity`, `wind`, `competitors` (map keyed by dorsal-as-string of `RunnerStats`), `odds` (flat float array, WIN then EXACTA), `finish` (vendor map), `interval` (sector times), `videoname` (replay URLs), `jackpotInfo`, `creDt`.

### SSE — `/v1/races/subscribe`

Handler `internal/raceapi/sse.go:73-199`. Query: `?gameType=<allowed>` (optional filter), `?heartbeat=N` seconds (clamped 5–120, default 15). Honors `Last-Event-ID` for replay.

Event types emitted (`internal/raceapi/sse.go:247-283`):

- `event: race` — `data:` is a `LiveResultDTO` (`internal/raceapi/dto.go:91-98`):
  ```go
  type LiveResultDTO struct {
      EventID         string        `json:"eventId"`
      RoundCode       string        `json:"roundCode"`
      GameType        string        `json:"gameType"`
      State           string        `json:"state"`
      ServerTimestamp time.Time     `json:"serverTimestamp"`
      Payload         RacePublicDTO `json:"payload"`
  }
  ```
- `event: lag` — `data:` is `{"reason":"buffer_overflow","missedSince":"<lastEventID>"}`; no `id:` field.
- SSE comments `: connected` and `: heartbeat` (no `event:`/`data:`).

### Legacy `/api/races/*` (deprecated)

Wrapped with `raceapi.DeprecationMiddleware` pointing at the `/v1` equivalents (`cmd/api/main.go:306-316`). Sunset default `2027-01-01T00:00:00Z` via `RACEAPI_LEGACY_SUNSET`.

| Method | Path | Handler file:line | Successor |
|---|---|---|---|
| GET | `/api/races/live/{gameType}` | `cmd/api/main.go:312` → `handleLive` (`cmd/api/main.go:416`) | `/v1/races/live/{gameType}` |
| GET | `/api/races/current/{gameType}` | `cmd/api/main.go:313` → `handleCurrent` (`cmd/api/main.go:456`) | `/v1/races/current/{gameType}` |
| GET | `/api/races/upcoming/{gameType}` | `cmd/api/main.go:314` → `handleUpcoming` (`cmd/api/main.go:474`) | `/v1/races/upcoming/{gameType}` |
| GET | `/api/races/results/{gameType}` | `cmd/api/main.go:315` → `handleResults` (`cmd/api/main.go:500`) | `/v1/races/live/{gameType}` |
| GET | `/api/races/detail/{roundCode}` | `cmd/api/main.go:316` → `handleDetail` (`cmd/api/main.go:543`) | `/v1/races/detail/{roundCode}` |

These return vendor-shaped `GamePoolEntry` objects (`internal/models/models.go:85+`), not the cleaner `RacePublicDTO`. Use `/v1` unless you specifically need the vendor JSON.

### Other read endpoints on `cmd/api`

| Method | Path | Handler file:line | Purpose |
|---|---|---|---|
| GET | `/api/health` | `cmd/api/main.go:292` → `handleHealth` (`cmd/api/main.go:373`) | health + per-game stats |
| GET | `/api/game-status/{gameType}` | `cmd/api/main.go:293` → `handleGameStatus` (`cmd/api/main.go:384`) | total/finished count + currentRace |
| GET | `/api/device-config/{deviceId}` | `cmd/api/main.go:318` → `pgdevice.HandleDeviceConfig` | POS/TV bootstrap — not for web |
| GET | `/v1/healthz` | `internal/raceapi/server.go:68` | `{status:"ok"}` |
| GET | `/v1/readyz` | `internal/raceapi/server.go:69` | poller + multisource + SSE-slot probe |
| GET | `/metrics` | `cmd/api/main.go:323` | Prometheus |

---

## 3. WebSocket endpoints

**All WebSockets live in `cmd/tv-broadcaster` (port 4097 by default).** `cmd/api` does **not** expose any WebSocket. There is **no `/ws/` URL prefix** in the codebase — paths are at the root.

Registrations in `internal/wsserver/wsserver.go:239-262` (`setupRoutes`):

| Route | File:line | Binary | Purpose |
|---|---|---|---|
| `GET /tv-ds` | `wsserver.go:241-243` | tv-broadcaster | TV display client, ds-static config + game pool, broadcast `gameResult` + `gameRound` |
| `GET /tv` | `wsserver.go:244-246` | tv-broadcaster | TV "gen" variant (legacy) |
| `GET /pos-ds` | `wsserver.go:249-251` | tv-broadcaster | alias to `/pos-go-ds` |
| `GET /pos-go-ds` | `wsserver.go:252-254` | tv-broadcaster | POS terminal (PostgreSQL-direct ticketing) |
| `GET /race-results` | `wsserver.go:255` | tv-broadcaster | lightweight pure-push results stream, `?gameType=dog6,dog8` |
| `GET /api/subscribe` | `wsserver.go:256` | tv-broadcaster | partner subscriber, `?key=<SUBSCRIBE_API_KEY>&games=…` |
| `GET /web-ds` | `wsserver.go:259` | tv-broadcaster | public mobile-vendor wire replica (anonymous browser) |
| `GET /dsa4/` | `wsserver.go:257` | tv-broadcaster | HTTP, not WS — discovery handshake for TV |

### Origin / auth behavior

- `/tv-ds`, `/tv`, `/pos-ds`, `/pos-go-ds`, `/race-results` — `websocket.Accept` with `InsecureSkipVerify: true` (`wsserver.go:300-302`, `results_stream.go:23-25`). **No origin gate.** No bearer auth. Identity is established via the in-band `init` / `deviceLogin` frames against PostgreSQL `devices` rows.
- `/api/subscribe` — `?key=` matched against `SUBSCRIBE_API_KEY` env var (`subscribe.go:30-40`). Returns 503 if env unset, 401 if mismatched.
- `/web-ds` — Origin allow-list from `WEB_DS_ALLOWED_ORIGINS` (csv). When empty (dev default) accepts any origin (`web_ds.go:87-94`, `webDsOriginPatterns` at `web_ds.go:160-173`).

### `/pos-go-ds` protocol — verbatim structs

Inbound `msgType` values dispatched at `wsserver.go:353-376`: `deviceLogin`, `init`, `gameRound`, `time`, `sendLog`, **`sendTicket`**, **`sendBalance`**, **`sendTicketStatus`**, `queryTicketCode`.

**`deviceLogin` request** (`internal/wsserver/pos_go.go:30-38`):

```go
var req struct {
    MsgID      int    `json:"msgId"`
    DeviceType string `json:"deviceType"`
    InitID     string `json:"initID"`
    DeviceID   string `json:"deviceId"`
    UniqueID   string `json:"uniqueId"`
    Version    string `json:"version"`
    ClientDt   string `json:"clientDt"`
}
```

**`init` request** (`internal/wsserver/pos_go.go:146-157`) — this is operator login:

```go
var req struct {
    MsgID        int    `json:"msgId"`
    MsgType      string `json:"msgType"`
    DeviceType   string `json:"deviceType"`
    InitID       string `json:"initID"`
    User         string `json:"user"`
    Pass         string `json:"pass"`
    HistoryGames int    `json:"historyGames"`
    FutureGames  int    `json:"futureGames"`
    Version      string `json:"version"`
    ClientDt     string `json:"clientDt"`
}
```

**`sendTicket` request** — parsed as a free-form `map[string]interface{}` (`internal/wsserver/pos_go.go:485-490`). It reads `msgId`, `frontendID`, `type` (game type), `gameId` (or `roundCode`), and dynamic `bet_<N>` (WIN) / `bet_<N>_<M>` (EXACTA) numeric fields; alternatively a structured `tips: []pgpos.Tip` array. The session/operator/device/location IDs are taken from the connection's `posSessionID`/`posOperatorID`/`posDeviceDBID`/`posLocationID` set during `init` — **the client never sends them on `sendTicket`**.

**`sendTicket` response** (`internal/wsserver/pos_go.go:677-687`):

```go
resp := map[string]interface{}{
    "msgType":              "sendTicket",
    "msgId":                int(msgID),
    "msgValue":             "ok",
    "ticketID":             strings.TrimSpace(result.TicketNumber),
    "frontendID":           frontendID,
    "serverTime":           now.Format("2006-01-02 15:04:05.00"),
    "limitTurnoverWarning": turnoverWarn,
    "limitProfitWarning":   profitWarn,
    "checksum":             "NOT IMPLEMENTED",
}
```

Errors come back as `{msgType:"sendTicket", msgValue:"error", errorCode, errorMessage}` via `sendPosGoTicketError`. Known `errorCode`s: `SESSION_NOT_FOUND`, `DEVICE_LOCKED`, `INVALID_BET`, `DAILY_LIMIT_EXCEEDED`, `TICKET_ERROR`.

**`sendBalance` request** (`internal/wsserver/pos_go.go:701-714`):

```go
var req struct {
    MsgID             int      `json:"msgId"`
    SessionID         string   `json:"sessionID"`
    BalanceSessionID  string   `json:"balanceSessionID"`
    TotalBet          *float64 `json:"totalBet"`
    TotalWin          *float64 `json:"totalWin"`
    TotalCassa        *float64 `json:"totalCassa"`
    CountTip          *int     `json:"countTip"`
    CountCancel       *int     `json:"countCancel"`
    CountTicketCancel *int     `json:"countTicketCancel"`
    TotalPayout       *float64 `json:"totalPayout"`
    TotalPayoutTax    *float64 `json:"totalPayoutTax"`
}
```

This is a **session settlement** (cashier shift close) — NOT a player balance query.

**`sendTicketStatus` request** (`internal/wsserver/pos_go.go:768-775`):

```go
var req struct {
    MsgID     int    `json:"msgId"`
    TicketID  string `json:"ticketId"`
    NewStatus string `json:"newStatus"`   // "cancel" | "autocancel" | "payout" | "autopayout"
    SessionID string `json:"sessionID"`
    Confirm   string `json:"confirm"`
}
```

**`queryTicketCode` request** (`internal/wsserver/pos_go.go:859-861`):

```go
var req struct {
    MsgID      int    `json:"msgId"`
    TicketCode string `json:"code"`
}
```

Returns the full ticket including `tips[]`, `betAmount`, `winAmount`, `possibleWin`, `status`, `isPaid`, `roundCode`.

### Outbound push frames (server-initiated)

- `gameResult` + `gameRound` broadcast to TV/POS/stream clients (`wsserver.go:170-237`).
- `deviceLock` push from PG `LISTEN device_lock_changed` (`internal/wsserver/lock_listener.go`).

### `/web-ds` (current web-lobby endpoint)

Inbound (`web_ds.go:140-150`): `init`, `gameRound`, `time` only. **No ticketing, no auth, no per-user state.** It is a one-way replica of the vendor mobile wire — useful only for read-only race display. Mints an anonymous 12-hex `sessionID` per connection.

---

## 4. Tickets / wallet / sessions

Everything ticket- or session-related is **POS-bound** — it requires a registered `devices` row, a `device_sessions` row, and an `operators` row in PostgreSQL. There is no player-keyed surface.

### Place a ticket — POS only

WS frame `sendTicket` on `/pos-go-ds` (`internal/wsserver/pos_go.go:485`). Requires the connection to have completed `deviceLogin` + `init` first, which authenticates the **device** (by `hardware_id`) and the **operator** (by `user`/`pass` against `operators` table). `device_id`, `session_id`, `operator_id`, `location_id` are pulled from the connection state — the client never sends them per-ticket. Daily-limit enforcement uses `pgpos.LoadOperatorLimitsAndTotals` + `pgpos.CheckTicketLimits` (`pos_go.go:636-642`).

### Query a ticket

- POS WS: `queryTicketCode` on `/pos-go-ds` (`pos_go.go:858`). Takes a 16-char ticket code; returns full ticket + tips.
- Admin HTTP: `GET /api/tickets/report` (`internal/admin/admin.go:123` → `internal/admin/tickets.go:59`). Bearer-protected. Filters: `locationId`, `deviceId`, `deviceSessionId`/`sessionId`, `from`, `to`, paginated. **This is a back-office report, scoped per device/location/session — not per player.**

### See a balance

- `sendBalance` on `/pos-go-ds` is a **cashier shift settlement** report, not a wallet read.
- Admin HTTP: `POST /api/balances/turnover` — turnover report by provider/location/device, Bearer-protected, dashboard-only.

### Sessions

`GET /api/sessions` returns POS device sessions (`device_sessions` table) — **not** player sessions.

### What "device_id / session_id / operator_id" mean

- `device_id`: PK in `devices` (POS terminal / TV). Registered out-of-band by an admin.
- `session_id`: PK in `device_sessions`, opened on POS `deviceLogin` + `init`, closed on `sendBalance`. Each ticket belongs to exactly one device session.
- `operator_id`: PK in `operators` (the cashier). Has a daily sales cap (`OperatorLimits`).
- `location_id`: PK in `locations` (the physical betting shop).

These are physical-presence / brick-and-mortar concepts. None of them maps to an anonymous web user.

---

## 5. Gaps for a web bettor (anonymous browser player)

The following do **not exist** in `virtuales-go`. Confirmed by exhaustive grep across `cmd/`, `internal/admin/`, `internal/auth/`, `internal/wsserver/`, `internal/raceapi/`:

- **Web-player login endpoint (not admin login).** The only login is `POST /api/auth/login`, which authenticates against the `admin_users` table. It is operated by humans with `Role` strings like `superadmin`. There is no `players` table, no player registration endpoint.
- **Per-player wallet endpoint.** No wallet/balance read keyed by user.
- **Per-player ticket history endpoint.** `GET /api/tickets/report` scopes by `locationId`/`deviceId`/`sessionId` only — there is no `playerId` filter, no schema column to filter by.
- **Per-player settlement push WS.** `BroadcastResult` fan-outs to every connected client of a given `betofferId` — no targeted single-recipient delivery.
- **Logout / token revocation API for end users.**
- **Password reset / forgot-password.**

If the web-lobby needs any of the above, it has to be built — `virtuales-go` is, end-to-end, a B2B retail-betting platform with admin and POS-terminal clients only.

---

## 6. Reference table

| Endpoint | Method | Auth | File:line | Purpose |
|---|---|---|---|---|
| `/api/auth/login` | POST | none | `internal/admin/admin.go:45` | admin login → access + refresh JWT |
| `/api/auth/refresh` | POST | none | `internal/admin/admin.go:46` | new access token from refresh token |
| `/api/auth/me` | GET | Bearer | `internal/admin/admin.go:53` | current admin profile |
| `/api/health` | GET | none | `cmd/api/main.go:292` | health + per-game stats |
| `/api/game-status/{gameType}` | GET | none | `cmd/api/main.go:293` | counts + currentRace id |
| `/api/races/live/{gameType}` | GET | none | `cmd/api/main.go:312` | DEPRECATED — game pool window |
| `/api/races/current/{gameType}` | GET | none | `cmd/api/main.go:313` | DEPRECATED — current round |
| `/api/races/upcoming/{gameType}` | GET | none | `cmd/api/main.go:314` | DEPRECATED — upcoming list |
| `/api/races/results/{gameType}` | GET | none | `cmd/api/main.go:315` | DEPRECATED — recent results |
| `/api/races/detail/{roundCode}` | GET | none | `cmd/api/main.go:316` | DEPRECATED — one race |
| `/api/device-config/{deviceId}` | GET | none | `cmd/api/main.go:318` | POS/TV bootstrap |
| `/v1/races/current/{gameType}` | GET | none | `internal/raceapi/handlers.go:59` | freshest round (full DTO) |
| `/v1/races/upcoming/{gameType}` | GET | none | `internal/raceapi/handlers.go:60` | paginated upcoming |
| `/v1/races/detail/{roundCode}` | GET | none | `internal/raceapi/handlers.go:61` | one race (full DTO) |
| `/v1/races/live/{gameType}` | GET | none | `internal/raceapi/handlers.go:62` | paginated recent results |
| `/v1/races/subscribe` | GET (SSE) | none | `internal/raceapi/handlers.go:63` | server-sent events, `race` + `lag` |
| `/v1/healthz` | GET | none | `internal/raceapi/server.go:68` | liveness |
| `/v1/readyz` | GET | none | `internal/raceapi/server.go:69` | readiness |
| `/v1/admin/observability/raceapi` | GET | X-API-Key | `internal/raceapi/server.go:95` | internal metrics |
| `/api/tickets/report` | GET | Bearer | `internal/admin/admin.go:123` | admin ticket report (no player filter) |
| `/api/sessions` | GET | Bearer | `internal/admin/admin.go:120` | POS device sessions list |
| `/api/balances/turnover` | POST | Bearer | `internal/admin/admin.go:126` | turnover report by provider/loc/device |
| `/api/dashboard` | GET | Bearer | `internal/admin/admin.go:129` | dashboard stats |
| `/api/devices/online` | GET | none | `internal/admin/admin.go:49` | online device count (polled by dashboard) |
| `/api/admin/tokens` (and friends) | varied | Bearer + superadmin | `internal/admin/tokens.go:134-137` | opaque token admin |
| `/metrics` | GET | none | `cmd/api/main.go:323` | Prometheus |
| `/tv-ds` (WS) | GET | none | `internal/wsserver/wsserver.go:241` | TV display client |
| `/tv` (WS) | GET | none | `internal/wsserver/wsserver.go:244` | TV "gen" variant |
| `/pos-ds` (WS) | GET | none | `internal/wsserver/wsserver.go:249` | alias → `/pos-go-ds` |
| `/pos-go-ds` (WS) | GET | none (device+operator login in-band) | `internal/wsserver/wsserver.go:252` | POS ticketing |
| `/race-results` (WS) | GET | none | `internal/wsserver/wsserver.go:255` | pure-push results fan-out |
| `/api/subscribe` (WS) | GET | `?key=<SUBSCRIBE_API_KEY>` | `internal/wsserver/wsserver.go:256` | partner subscriber |
| `/web-ds` (WS) | GET | `WEB_DS_ALLOWED_ORIGINS` allow-list | `internal/wsserver/wsserver.go:259` | anonymous browser race read |
| `/dsa4/` (HTTP) | GET | none | `internal/wsserver/wsserver.go:257` | TV discovery / geonames |
| `/health` (tv-broadcaster) | GET | none | `internal/wsserver/wsserver.go:240` | broadcaster health |

---

## 7. Bottom line for the web-lobby

**Race data — already wired and working:**
- `/web-ds` WS (current) → keep, it's the richest stream we have for live race display.
- Alternative: `/v1/races/*` + SSE on `:4098` — cleaner DTO if we ever want to drop the vendor wire.

**Betslip — fundamental gap:**
- No web-bettor surface exists. The only ticket-placement path is `/pos-go-ds` (POS terminal) which requires a registered device + operator credentials in PostgreSQL.
- Three adaptation options (ordered by build cost):
  1. **Keep betslip decorative** — `PLACE BET` continues to be a demo affordance until the backend grows a player surface.
  2. **Speak POS-DS protocol from web** with a synthetic device + operator + session. Zero backend changes, but contaminates POS reports and pretends a browser is a cashier terminal. Daily limits + cancellation flows apply.
  3. **Build a `/web-player` surface** in `virtuales-go` (new tables: `web_players`, `web_wallet`, `web_wallet_ledger`; new endpoints under `/api/web/*`; new WS `/web-player?token=…`). Cleanest, biggest delta.

**Auth — admin only.** `POST /api/auth/login` works against `admin_users` (humans with roles `superadmin`/`admin`/`viewer`). It is **not** suitable for a public web player. Reusing it would either grant browser users admin-level access or require role gating in middleware that doesn't exist yet.
