# Project: Virtual Racing App

## Quick Reference (IMPORTANT LINKS)

| Task | Documentation |
|------|---------------|
| **POS Azure** | https://virteon-aio.azurewebsites.net/?deviceId=b7c1a85e2f294268abae155298ad62be |
| **POS Hostinger** | http://88.223.95.55:4069/?deviceId=6a14a153eed64076b29d79d2dd60fd3a |
| **POS Operations Guide** | [gsd/docs/pos-operations.md](../../gsd/docs/pos-operations.md) |
| **Production Architecture** | [docs/PRODUCTION_ARCHITECTURE.md](docs/PRODUCTION_ARCHITECTURE.md) |
| **Create Tickets** | [Creating Tickets (Step-by-Step)](#creating-tickets-step-by-step) |
| **Credentials & Locations** | [docs/ACCESO.md](docs/ACCESO.md) |
| **Server Config & Device ID** | [Server Configuration](#server-configuration--device-id-architecture) |
| **Positioning & Coordinates** | [Positioning](#positioning--coordinates) |
| **Backend API (Azure)** | `https://api.virtuales.bet` |
| **Relay Server** | [Relay Server](#relay-server-race-data-capture) - `ws://88.223.95.55:4081` |

---

## POS Hostinger (ALWAYS USE THIS)

**URL:** http://88.223.95.55:4069/?deviceId=`<DEVICE_ID>`
**Credenciales:** ver `gsd/credentials.md` (operator ID, PIN, device IDs)

### Relay Control (same server)
```bash
# Check status
curl http://88.223.95.55:4082/status

# Resume capture (if paused)
curl -X POST http://88.223.95.55:4082/resume

# Pause capture
curl -X POST http://88.223.95.55:4082/pause
```

### Session Management (Force Disconnect)

Use these endpoints when you get "Device is already connected from another location" error.

**Note:** These endpoints require JWT authentication. Get a token first via `/api/auth/login`.

```bash
# Step 1: Get JWT token (credentials in gsd/credentials.md)
TOKEN=$(curl -s -X POST "https://api.virtuales.bet/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "<USER>", "password": "<PASSWORD>"}' | jq -r '.accessToken')

# Step 2: Force close device connection by Device ID
curl -X POST "https://api.virtuales.bet/api/active-sessions/connections/device/6a14a153eed64076b29d79d2dd60fd3a/close" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason": "Force disconnect for testing"}'

# Alternative: Logout operator from ALL devices (keeps connections, just logs out user)
curl -X POST "https://api.virtuales.bet/api/active-sessions/operator-sessions/user/{userId}/logout-all" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reason": "Logout for testing"}'
```

| Endpoint | Purpose | Effect |
|----------|---------|--------|
| `POST /api/active-sessions/connections/device/{deviceId}/close` | Force disconnect device | Closes WebSocket, frees device |
| `POST /api/active-sessions/operator-sessions/{sessionId}/logout` | Logout operator only | Keeps connection, clears auth |
| `POST /api/active-sessions/operator-sessions/user/{userId}/logout-all` | Logout user everywhere | Clears auth on all devices |

---

## Stack
- React 18+
- TypeScript (strict mode)
- Vite
- Tailwind CSS

## Language Rules
- All code in English (variables, functions, components, comments)
- All documentation in English
- Git commits in English
- UI text: use i18n keys, Spanish only in translation files

## TypeScript Rules
- Strict typing, never use 'any'
- Interfaces for component props
- Types for data models
- Use inference when obvious

## Design Rules
- Mobile-first responsive
- Tailwind classes: sm:, md:, lg:, xl:
- Fluid flex/grid layouts
- Minimum 44px touch target for buttons

## Structure
/src
  /components    # Reusable components
  /pages         # Views/pages
  /types         # Interfaces and types
  /hooks         # Custom hooks
  /utils         # Utility functions
  /i18n          # Translation files
    /locales
      en.json
      es.json

## Docker

### Quick Start (persists after SSH disconnect)
```bash
# Start in background (detached mode)
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Commands
```bash
# Development (with hot reload)
docker compose up -d

# Production build
docker compose --profile prod up -d virtual-racing-pos-prod

# Rebuild after code changes
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f virtual-racing-pos

# Stop container
docker compose down

# Restart
docker compose restart
```

### Port
- Always runs on port **4069**
- Access: http://localhost:4069 or http://<server-ip>:4069

### Persistence
- `restart: unless-stopped` ensures container survives:
  - SSH session disconnect
  - Server reboot
  - Container crashes
- Only stops with explicit `docker compose down`

## Positioning & Coordinates

**User measures positions with AutoHotkey in Windows.**

- Coordinates are relative to the browser window, NOT the full screen
- Use `windowRelative.x` and `windowRelative.y` for positioning elements
- Apply `position: absolute` to the element
- Ensure the parent container has `position: relative`
- When user provides pixel coordinates, convert to container query units relative to **1760x858** (actual window viewport):
  - `cqi = (x / 1760) * 100`
  - `cqb = (y / 858) * 100`
- For center positioning, subtract half the element size after conversion

### Original POS Replication

**IMPORTANT:** When replicating components from the original POS, consult **[docs/positioning.md](docs/positioning.md)**.

This document contains:
- Viewport reference (1760x858)
- Conversion formulas (px to cqi/cqb)
- Playwright extraction methods
- Game-specific selectors
- Verified examples

### Original POS Access (Client's Existing System - Reference Only)

**This is the CLIENT'S original POS** that we study for UI/UX replication. NOT our app.

**Credentials and access info:** See **[docs/ACCESO.md](docs/ACCESO.md)**

Quick reference for original POS: ver `gsd/credentials.md` para URL, operator ID y PIN.

### Our App (Development)

**Our app runs at:** `http://localhost:4069`

- Device ID comes from `.env` (`VITE_DEV_DEVICE_ID`) during development
- In production, device ID extracted from subdomain automatically
- See "Server Configuration & Device ID Architecture" section below for details

## MANDATORY Layout Rules - Container Query Units

**CRITICAL: Do NOT mix measurement reference systems.**

### Rule 1: Container Query Units Only Inside Containers
Every component that lives inside a container with container queries MUST use EXCLUSIVELY container-based units:
- `cqi` - Container Query Inline (width-based)
- `cqb` - Container Query Block (height-based)
- `cqmin` - Smaller of cqi/cqb
- `cqmax` - Larger of cqi/cqb

### Rule 2: Viewport Units Are PROHIBITED Inside Containers
It is **FORBIDDEN** to use `vw`, `vh`, `vmin`, or `vmax` inside components that depend on a container.

**Viewport units (`vw/vh`) can ONLY be used in:**
- Root layouts
- Fullscreen backgrounds
- Elements that truly need viewport-relative sizing

### Rule 3: Container Declaration
Before defining sizes, the root component must explicitly declare:
```css
container-type: size; /* or inline-size */
container-name: app;  /* optional but recommended */
```

### Rule 4: Consistent Reference System
All internal measurements (width, height, padding, margin, font-size, position offsets) MUST derive from the same container reference system.

### Rule 5: Use clamp() with Container Units
If you need to limit extreme sizes, use `clamp()` combined with `cqi/cqb`, NEVER with `vw/vh`.

**Correct example:**
```css
width: clamp(80px, 12cqi, 160px);
```

**Incorrect example:**
```css
width: 10vw; /* WRONG - mixing systems */
```

### Rule 6: Images and Logos Scale with Container
If an image or logo is inside the container, it MUST scale with the container, NOT with the viewport.

### Conversion Formulas (1760x858 viewport)
```
cqi = (pixels / 1760) * 100
cqb = (pixels / 858) * 100
```

## Server Configuration & Device ID Architecture

### CRITICAL: Development Server Settings

**The app MUST ALWAYS run on:**
- **Port:** 4069 (fixed, no exceptions)
- **Host:** 0.0.0.0 (allows external access from any network interface)

```typescript
// vite.config.ts - DO NOT CHANGE THESE VALUES
server: {
  port: 4069,          // ALWAYS use port 4069
  host: '0.0.0.0',     // Allow external access
  strictPort: true,    // Fail if port is already in use
}
```

### Device ID Extraction (posConnection.ts:149-175)

The system extracts the device ID differently based on environment:

```typescript
extractDeviceIdFromHostname(): string {
  const hostname = window.location.hostname

  // DEVELOPMENT: localhost or 127.0.0.1
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Priority: localStorage > env variable > default
    return localStorage.getItem('dev_deviceId')
        || import.meta.env.VITE_DEV_DEVICE_ID
        || 'dev-device-001'
  }

  // PRODUCTION: extract from subdomain
  // {deviceId}.pos.domain.com → parts[0] = deviceId
  const parts = hostname.split('.')
  return parts[0]
}
```

### Operation Modes

| Mode | URL | Device ID Source | Backend |
|------|-----|------------------|---------|
| **Azure AIO (PRIMARY)** | `https://virteon-aio.azurewebsites.net/?deviceId=XXX` | Query param (obligatorio) | Azure |
| **Hostinger** | `http://88.223.95.55:4069/?deviceId=XXX` | Query param | Azure |
| **Local Dev** | `localhost:4069` | `.env` (`VITE_DEV_DEVICE_ID`) | Azure |

### How Backend Connection Works

**IMPORTANT: El backend siempre está en Azure, no hay backend local.**

1. **Local Development:**
   - `.env` has `VITE_API_URL=https://api.virtuales.bet`
   - Browser connects directly to Azure backend
   - Device ID from `.env` (`VITE_DEV_DEVICE_ID`)

2. **Production (Azure Container Apps):**
   - URL: `https://pos.proudplant-abfc9fde.eastus.azurecontainerapps.io/?deviceId=XXX`
   - Device ID from query parameter or subdomain
   - Same Azure backend

### Configuration Files

```
.env                          # Environment variables (VITE_DEV_DEVICE_ID, VITE_API_URL)
vite.config.ts                # Server port (4069), host (0.0.0.0), proxy config
src/services/posConnection.ts # Device ID extraction logic (line 149-175)
```

### Subdomain Format

Production URLs follow this pattern:
```
https://{deviceId}.pos.virtualracing.com
        └── 32 hex characters (GUID without dashes)

Example:
https://5fd76331325cc0c7b0ba3883ae3d491d.pos.virtualracing.com
        └── This becomes the deviceId
```

---

## Backend Connection

### SignalR Backend (Azure)

The POS communicates with a .NET SignalR backend hosted in **Azure** (NOT localhost).

| Endpoint | URL |
|----------|-----|
| **API Base** | `https://api.virtuales.bet` |
| **SignalR Hub** | `wss://api.virtuales.bet/hubs/pos` |
| **Discovery** | `GET /api/ws/discover?deviceId=XXX&deviceType=pos` |

#### Configuration (.env)
```bash
# Backend API - Azure (PRODUCTION)
VITE_API_URL=https://api.virtuales.bet

# DEV_MODE=false for real tickets, true for UI-only testing
VITE_DEV_MODE=false

# Device ID (must be registered in backend)
VITE_DEV_DEVICE_ID=6a14a153eed64076b29d79d2dd60fd3a
```

#### Connection Flow
```
1. Discovery: GET https://api.virtuales.bet/api/ws/discover?deviceId=XXX&deviceType=pos
   → Returns WebSocket URL and device info

2. WebSocket: wss://api.virtuales.bet/hubs/pos
   → SignalR connection

3. DeviceLogin(deviceId, version)
   → Authenticate device

4. Init(operatorId, pin)
   → Login user/operator

5. SubscribeToAllGames()
   → Receive gameRound/gameResult events

6. sendTicket(request)
   → Create ticket with bet_X format
```

#### Ticket Format (Legacy)
```javascript
{
  msgType: "sendTicket",
  msgId: 123,
  gameId: "141_101_202601040188",  // gameTypeId_scheduleId_roundCode
  type: "dog8",
  sendDt: "2026-01-04 12:30:00",
  ticketTransactionId: 1,
  bet_0: 25,   // WIN runner 1
  bet_8: 100   // EXACTA 1-2
}
```

#### Bet Index Calculation
- **WIN:** `bet_{runner - 1}` → Runner 3 = `bet_2`
- **EXACTA:** `bet_{1st*(N-1) + 2nd - offset}` where offset=1 if 2nd>1st

#### Documentation
- Protocol: `docs/POS_WEBSOCKET_PROTOCOL.md`
- Client Guide: `docs/POS_WEBSOCKET_CLIENT_GUIDE.md`
- Tickets: `docs/WEBSOCKET_TICKET_PROTOCOL.md`

## Creating Tickets (Step-by-Step)

**CRITICAL:** When asked to create tickets, follow these EXACT steps:

### Prerequisites
1. Backend en Azure accesible (verificar con `curl "https://api.virtuales.bet/api/ws/discover?deviceId={DEVICE_ID}&deviceType=pos"`)
2. `.env` has correct `VITE_DEV_DEVICE_ID` for the location (see credentials table below)
3. `.env` has `VITE_API_URL=https://api.virtuales.bet`
4. `.env` has `VITE_DEV_MODE=false`
5. App running at `http://localhost:4069`

### Login Flow (Playwright)

**Note:** Use credentials from the table below based on location. Example uses Dinamica01:

```javascript
// 1. Navigate to app
await page.goto('http://localhost:4069/');

// 2. Wait for connection (shows location name)
await page.waitForTimeout(3000);

// 3. Enter operator ID (varies by location - see gsd/credentials.md)
await page.getByRole('textbox', { name: 'ID DE OPERADOR' }).fill('<OPERATOR_ID>');

// 4. Enter PIN (varies by location - see gsd/credentials.md)
await page.getByRole('textbox', { name: 'CONTRASENA' }).fill('<PIN>');

// 5. Click ACCESO
await page.locator('div').filter({ hasText: /^ACCESO$/ }).click();

// 6. Wait for login and dismiss printer modal
await page.waitForTimeout(3000);
await page.getByRole('button', { name: 'OK' }).click();  // Dismiss printer error
```

### Creating a Ticket (Playwright)
```javascript
// 1. Select game (dos, dot, doe, hoc)
await page.getByRole('button', { name: 'doe' }).click();

// 2. Select runner for 1st place (e.g., runner 5)
await page.getByRole('button', { name: '5' }).first().click();

// 3. (Optional) Select runner for 2nd place for EXACTA bet
// await page.getByRole('button', { name: '3' }).nth(1).click();

// 4. Select amount ($25, $50, $100, $200)
await page.getByRole('button', { name: '$25' }).click();

// 5. Click Imprimir to submit
await page.getByRole('button', { name: 'Imprimir' }).click();

// 6. Wait for response
await page.waitForTimeout(3000);
```

### Verify in VENTAS
```javascript
// Click VENTAS tab
await page.getByRole('button', { name: 'VENTAS' }).click();

// Ticket should appear at top with status "pending"
```

### Credentials (User will specify location)

> Ver `gsd/credentials.md` para la tabla completa de locations, device IDs, operator IDs y PINs.

**To change location:** Update `VITE_DEV_DEVICE_ID` in `.env` and use corresponding credentials from `gsd/credentials.md`.

### Game Types
| Game | Type | Runners | Game Type ID |
|------|------|---------|--------------|
| DOS  | dog6 | 6       | 141          |
| DOT  | dog63| 6       | 341          |
| DOE  | dog8 | 8       | 541          |
| HOC  | horsec| 7      | 241          |

### Common Issues
1. **"GameRound not found"**: The gameId doesn't match backend's registered rounds. Try a different game (DOE works reliably).
2. **Connection lost**: Reload page and login again.
3. **Printer error modal**: Just click OK to dismiss - tickets still work without printer.
4. **DEV_MODE=true**: Creates mock tickets only - set to `false` for real tickets.

---

## Relay Server (Race Data Capture)

The relay server captures real-time race data from the original VG POS and relays it to our app.

### Current Status
- **WebSocket**: `ws://88.223.95.55:4081` ✅ Working
- **Control API**: `http://88.223.95.55:4082` (pause/resume/status)
- **Hosting**: Hostinger VPS (88.223.95.55)
- **Data**: Race updates for all games (dos, dot, doe, hoc)

### Architecture (Option B - Consolidated)
```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  VG POS Original    │     │   Relay Server       │     │   Our POS App       │
│  (vgpos.net)        │────▶│   (server/index.ts)  │────▶│   (Azure/Local)     │
└─────────────────────┘     │   Port 4081          │     └─────────────────────┘
                            │                      │
                            │   Sends to:          │
                            │   ├─ Elasticsearch   │
                            │   └─ SQL Server API  │
                            │      ├─ race-data    │
                            │      ├─ race-result  │
                            │      └─ lock-round   │
                            └──────────────────────┘
```

**Data Flow:**
1. Playwright intercepts WebSocket messages from VG POS
2. On `gameRound`: Sends odds to ES + `/api/ingest/race-data/batch`
3. On countdown ≤5s: Calls `/api/ingest/lock-round` (locks betting)
4. On `gameResult`: Sends results to ES + `/api/ingest/race-result/batch` (triggers settlement)

### Test Relay Connection
```bash
cd relay-server
node test-connection.js 88.223.95.55
```

### Relay Control Commands
```bash
# Check status
curl http://88.223.95.55:4082/status

# Resume capture (starts scraping VG Control)
curl -X POST http://88.223.95.55:4082/resume

# Pause capture (stops scraping, frees VG Control session)
curl -X POST http://88.223.95.55:4082/pause

# View logs (SSH to Hostinger)
ssh root@88.223.95.55 'docker logs -f virtual-racing-relay'
```

### Message Format
```json
{
  "type": "raceUpdate",
  "game": "dos",
  "raceNumber": "0113",
  "odds": [5.2, 6.5, ...],
  "competitors": { "1": { "name": "Gale", ... } }
}
```

### Files
- `server/index.ts` - **Main relay server** (Playwright capture + ES + SQL Server)
- `relay-server/server.js` - Simple WebSocket relay (legacy)
- `relay-server/races-sync-service.js` - **DEPRECATED** (functionality moved to server/index.ts)
- `relay-server/README.md` - Full documentation
- `relay-server/test-connection.js` - Connection test script

### Hostinger Services Summary
| Service | Port | URL |
|---------|------|-----|
| **POS App** | 4069 | http://88.223.95.55:4069/?deviceId=XXX |
| **Relay WebSocket** | 4081 | ws://88.223.95.55:4081 |
| **Relay Control API** | 4082 | http://88.223.95.55:4082 |
