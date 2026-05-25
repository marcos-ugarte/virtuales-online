# Authentication Flow - Virtual Racing POS

Complete documentation of the authentication and connection flow for the POS system.

---

## Overview

The system uses a **two-level authentication** model:

1. **Device Authentication** - Identifies the physical terminal
2. **User Authentication** - Identifies the operator using the terminal

---

## Device ID (deviceId)

### What is it?

The `deviceId` is a **32-character MD5 hash** that uniquely identifies each POS terminal.

```
deviceId: 5fd76331325cc0c7b0ba3883ae3d491d
Format:   32 hexadecimal characters (MD5 hash)
```

### Where does it come from?

The `deviceId` is **embedded in the URL subdomain** used to access the POS:

```
https://5fd76331325cc0c7b0ba3883ae3d491d.vgpos.net/gamepool/dist/
        └──────────────────────────────┘
                   deviceId
```

The JavaScript code extracts the `deviceId` from the URL hostname:

```javascript
// Pseudocode - how the original POS extracts deviceId
const hostname = window.location.hostname;  // "5fd76331325cc0c7b0ba3883ae3d491d.vgpos.net"
const deviceId = hostname.split('.')[0];    // "5fd76331325cc0c7b0ba3883ae3d491d"
```

### How is it generated?

The `deviceId` is likely an **MD5 hash** of one of the following:
- Device MAC address
- Device serial number
- A UUID generated during terminal registration
- A combination of hardware identifiers

**Important**: The `deviceId` must be **pre-registered** in the Racing Dogs system. Unregistered devices are assigned to a different WebSocket server (different port).

### Registered vs Unregistered Devices

| deviceId | WebSocket Port | Status |
|----------|----------------|--------|
| `5fd76331325cc0c7b0ba3883ae3d491d` | **1229** | Registered |
| `test123` | 1223 | Unregistered |
| `abc` | 1223 | Unregistered |
| Any random value | 1223 | Unregistered |

The server uses port **1229** for registered devices and port **1223** for unregistered/unknown devices.

---

## Complete Connection Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE AUTHENTICATION FLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐                                    ┌──────────────────┐
│   POS Terminal   │                                    │   Racing Dogs    │
│   (Browser)      │                                    │   Server         │
└────────┬─────────┘                                    └────────┬─────────┘
         │                                                       │
         │  ┌─────────────────────────────────────────────────┐  │
         │  │ STEP 0: User navigates to POS URL               │  │
         │  │ https://5fd76331...vgpos.net/gamepool/dist/     │  │
         │  │ Browser extracts deviceId from subdomain        │  │
         │  └─────────────────────────────────────────────────┘  │
         │                                                       │
         │  ══════════════════════════════════════════════════   │
         │  ║ PHASE 1: WEBSOCKET DISCOVERY (HTTP)            ║   │
         │  ══════════════════════════════════════════════════   │
         │                                                       │
         │  GET /dsa4/?cmd=WebSocketRequest&deviceId=xxx         │
         │ ─────────────────────────────────────────────────────>│
         │                                                       │
         │                    { "url": "wss://...:1229/pos" }    │
         │ <─────────────────────────────────────────────────────│
         │                                                       │
         │  ══════════════════════════════════════════════════   │
         │  ║ PHASE 2: WEBSOCKET CONNECTION                  ║   │
         │  ══════════════════════════════════════════════════   │
         │                                                       │
         │  WebSocket Connect to wss://vgcontrol.com:1229/pos    │
         │ ─────────────────────────────────────────────────────>│
         │                                                       │
         │  ══════════════════════════════════════════════════   │
         │  ║ PHASE 3: DEVICE AUTHENTICATION                 ║   │
         │  ══════════════════════════════════════════════════   │
         │                                                       │
         │  deviceLogin {                                        │
         │    deviceId: "5fd76331...",                          │
         │    deviceType: "pos",                                 │
         │    version: "3.0.1000"                               │
         │  }                                                    │
         │ ─────────────────────────────────────────────────────>│
         │                                                       │
         │                    deviceLogin {                      │
         │                      posInitId: "session-uuid",       │
         │                      setting: { ... },                │
         │                      translations: { ... }            │
         │                    }                                  │
         │ <─────────────────────────────────────────────────────│
         │                                                       │
         │  ┌─────────────────────────────────────────────────┐  │
         │  │ At this point:                                  │  │
         │  │ - Device is recognized                          │  │
         │  │ - UI translations are loaded                    │  │
         │  │ - Login screen is displayed                     │  │
         │  └─────────────────────────────────────────────────┘  │
         │                                                       │
         │  ══════════════════════════════════════════════════   │
         │  ║ PHASE 4: USER AUTHENTICATION                   ║   │
         │  ══════════════════════════════════════════════════   │
         │                                                       │
         │  User enters operatorID + PIN on virtual numpad       │
         │                                                       │
         │  init {                                               │
         │    user: "001-001-002-001",                          │
         │    pass: "989900",                                    │
         │    historyGames: -8,                                  │
         │    futureGames: 22                                    │
         │  }                                                    │
         │ ─────────────────────────────────────────────────────>│
         │                                                       │
         │                    init {                             │
         │                      msgValue: "ok",                  │
         │                      sessionID: "b08d86a97b99",       │
         │                      operatorID: "001-001-002-001",   │
         │                      gamepool: [...],                 │
         │                      setting: { betoffers: [...] },   │
         │                      oldBalanceList: [...]            │
         │                    }                                  │
         │ <─────────────────────────────────────────────────────│
         │                                                       │
         │  ┌─────────────────────────────────────────────────┐  │
         │  │ At this point:                                  │  │
         │  │ - User is authenticated                         │  │
         │  │ - Session is created                            │  │
         │  │ - Race data is received                         │  │
         │  │ - Dashboard is displayed                        │  │
         │  └─────────────────────────────────────────────────┘  │
         │                                                       │
         │  ══════════════════════════════════════════════════   │
         │  ║ PHASE 5: REAL-TIME DATA STREAM                 ║   │
         │  ══════════════════════════════════════════════════   │
         │                                                       │
         │                    gameRound { ... }  (race data)     │
         │ <─────────────────────────────────────────────────────│
         │                                                       │
         │                    gameResult { ... } (results)       │
         │ <─────────────────────────────────────────────────────│
         │                                                       │
         │                    time { ... } (sync)                │
         │ <────────────────────────────────────────────────────>│
         │                                                       │
```

---

## Phase Details

### Phase 1: WebSocket Discovery (HTTP)

**Endpoint:**
```
GET https://rdweb.racingdogs.eu/dsa4/
    ?rt=3
    &out=json
    &cmd=WebSocketRequest
    &deviceId=5fd76331325cc0c7b0ba3883ae3d491d
    &deviceType=pos
```

**Response (registered device):**
```json
{
  "url": "wss://vgcontrol.com:1229/pos",
  "deviceType": "pos",
  "serverTime": "1767271088.127",
  "msgType": "WebSocketResponse"
}
```

**Response (unregistered device):**
```json
{
  "url": "wss://vgcontrol.com:1223/pos",
  "deviceType": "pos",
  "serverTime": "1767272416.836",
  "msgType": "WebSocketResponse"
}
```

**Key Difference**: Port 1229 (registered) vs Port 1223 (unregistered)

---

### Phase 2: WebSocket Connection

Connect to the URL received from Phase 1:

```javascript
const ws = new WebSocket("wss://vgcontrol.com:1229/pos");
```

---

### Phase 3: Device Authentication

**Request (POS → Server):**
```json
{
  "msgId": 1,
  "msgType": "deviceLogin",
  "deviceType": "pos",
  "deviceId": "5fd76331325cc0c7b0ba3883ae3d491d",
  "uniqueId": "uuid-generated-by-client",
  "version": "3.0.1000",
  "clientDt": "2025-12-31 12:47:50"
}
```

**Response (Server → POS):**
```json
{
  "msgType": "deviceLogin",
  "msgId": 1,
  "deviceId": "5fd76331325cc0c7b0ba3883ae3d491d",
  "posInitId": "unique-session-id",
  "connectionSetting": {
    "timeout": 3000
  },
  "setting": {
    "language": "es",
    "currency": "DOP",
    "currency_symbol": "RD$",
    "decimal_places": 2,
    "coin_1": 25,
    "coin_2": 50,
    "coin_3": 100,
    "coin_4": 200,
    "max_bet_per_tip": 500,
    "betoffers": [...]
  },
  "translations": { ... },
  "translationsCommon": { ... }
}
```

**What happens:**
- Device is recognized
- UI settings are received (currency, language)
- Translations are loaded
- Login screen is displayed

---

### Phase 4: User Authentication

**Request (POS → Server):**
```json
{
  "msgId": 2,
  "msgType": "init",
  "user": "001-001-002-001",
  "pass": "989900",
  "historyGames": -8,
  "futureGames": 22
}
```

**Response (Server → POS):**
```json
{
  "msgType": "init",
  "msgId": 2,
  "msgValue": "ok",
  "serverTime": "2025-12-31 11:50:34.61",
  "sessionID": "b08d86a97b99",
  "sessionType": "pos",
  "userID": "user-id",
  "operatorID": "001-001-002-001",
  "gameLength": 4,
  "nextTransactionID": 0,
  "oldTicketsToPayout": [],
  "oldBalanceList": [...],
  "prepTicketList": [],
  "setting": {
    "betoffers": [
      {
        "id": 141,
        "eventtype": "dog",
        "stats": {
          "history": [[3,5,4,6,2,1], ...]
        }
      }
    ]
  },
  "gamepool": [...]
}
```

**What happens:**
- User credentials are verified
- Session is created (`sessionID`)
- Race data is received (`gamepool`)
- Historical results are received (`stats.history`)
- Dashboard is displayed

---

## Authentication Summary

| Level | When | Data Sent | Purpose | Result |
|-------|------|-----------|---------|--------|
| **Discovery** | Page load | `deviceId` (from URL) | Get WebSocket URL | WebSocket URL + port |
| **Device** | WS connect | `deviceId`, `version` | Identify terminal | Settings, translations |
| **User** | Login form | `operatorID`, `PIN` | Authenticate operator | Session, race data |

---

## Identifiers

| Identifier | Format | Source | Lifetime | Example |
|------------|--------|--------|----------|---------|
| `deviceId` | MD5 hash (32 hex chars) | URL subdomain | Permanent | `5fd76331325cc0c7b0ba3883ae3d491d` |
| `posInitId` | UUID | Server (deviceLogin) | Per connection | `unique-session-id` |
| `sessionID` | 12 hex chars | Server (init) | Per login | `b08d86a97b99` |
| `operatorID` | `XXX-XXX-XXX-XXX` | User input | Permanent | `001-001-002-001` |

---

## For Our Implementation

### To replicate this flow in our Azure system:

1. **Device Registration**
   - Generate unique `deviceId` (MD5 of UUID or hardware ID)
   - Register in database with operator assignment
   - Create subdomain or use query parameter

2. **WebSocket Discovery Endpoint**
   ```
   GET /api/ws-discover?deviceId=xxx
   Response: { "url": "wss://our-signalr.azure.com/pos" }
   ```

3. **Device Authentication**
   - Validate `deviceId` against registered devices
   - Return device settings and translations

4. **User Authentication**
   - Validate `operatorID` + `PIN` against database
   - Create session, return race data

### Database Tables Needed

```sql
-- Registered POS devices
CREATE TABLE Devices (
    id INT PRIMARY KEY IDENTITY,
    device_id VARCHAR(32) UNIQUE NOT NULL,  -- MD5 hash
    name VARCHAR(100),
    operator_id VARCHAR(20),  -- Assigned operator
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT GETDATE()
);

-- Operators (users)
CREATE TABLE Operators (
    id INT PRIMARY KEY IDENTITY,
    operator_id VARCHAR(20) UNIQUE NOT NULL,  -- 001-001-002-001
    pin_hash VARCHAR(256) NOT NULL,
    name VARCHAR(100),
    balance DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT GETDATE()
);

-- Sessions
CREATE TABLE Sessions (
    id INT PRIMARY KEY IDENTITY,
    session_id VARCHAR(12) UNIQUE NOT NULL,
    device_id VARCHAR(32) NOT NULL,
    operator_id VARCHAR(20) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    expires_at DATETIME,
    FOREIGN KEY (device_id) REFERENCES Devices(device_id),
    FOREIGN KEY (operator_id) REFERENCES Operators(operator_id)
);
```

---

## Security Considerations

1. **Device ID is not secret** - It's in the URL, but only registered devices can connect to the production WebSocket server

2. **PIN is transmitted in plaintext** over WebSocket - Should use WSS (WebSocket Secure) and consider hashing

3. **Session ID is short** (12 chars) - May want to use longer, more secure tokens

4. **No rate limiting visible** - Should implement for brute force protection
