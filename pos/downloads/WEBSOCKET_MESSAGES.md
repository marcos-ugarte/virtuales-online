# WebSocket Protocol - Virtual Racing POS

Complete documentation of the WebSocket protocol used by the original POS system.

---

## Table of Contents

1. [Connection Flow](#connection-flow)
2. [Authentication Messages](#authentication-messages)
3. [Race Data Messages](#race-data-messages)
4. [Ticket Operations](#ticket-operations)
5. [Balance & Sales](#balance--sales)
6. [System Messages](#system-messages)
7. [Relay Server Messages](#messages-relayed-to-react-app)
8. [Reference Tables](#reference-tables)

---

## Connection Flow

### Step 1: WebSocket Discovery (HTTP)

Before connecting to WebSocket, the POS makes an HTTP request to discover the WebSocket URL.

**Request:**
```
GET https://rdweb.racingdogs.eu/dsa4/
    ?rt=3
    &out=json
    &cmd=WebSocketRequest
    &deviceId=5fd76331325cc0c7b0ba3883ae3d491d
    &deviceType=pos
```

**Response:**
```json
{
  "url": "wss://vgcontrol.com:1229/pos",
  "deviceType": "pos",
  "serverTime": "1767271088.127",
  "msgType": "WebSocketResponse"
}
```

### Step 2: WebSocket Connection

Connect to the URL received from the discovery endpoint:
```
wss://vgcontrol.com:1229/pos
```

### Step 3: Authentication Flow

```
┌─────────────┐                      ┌─────────────┐
│   POS       │                      │   Server    │
└──────┬──────┘                      └──────┬──────┘
       │                                    │
       │  1. deviceLogin (device auth)      │
       │ ─────────────────────────────────> │
       │                                    │
       │  2. deviceLogin (settings, i18n)   │
       │ <───────────────────────────────── │
       │                                    │
       │  3. init (user credentials)        │
       │ ─────────────────────────────────> │
       │                                    │
       │  4. init (session, gamepool)       │
       │ <───────────────────────────────── │
       │                                    │
       │  5. gameRound (race data, odds)    │
       │ <───────────────────────────────── │
       │                                    │
       │  6. gameResult (race results)      │
       │ <───────────────────────────────── │
       │                                    │
       │  7. time (periodic sync)           │
       │ <──────────────────────────────>   │
       │                                    │
```

---

## Authentication Messages

### 1. `deviceLogin` - Device Authentication

**Sent by POS:**
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

**Response from Server:**
```json
{
  "msgType": "deviceLogin",
  "msgId": 1,
  "deviceId": "5fd76331325cc0c7b0ba3883ae3d491d",
  "posInitId": "unique-session-id",
  "connectionSetting": { "timeout": 3000 },
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
  "translations": {...},
  "translationsCommon": {...}
}
```

---

### 2. `init` - User Login

**Sent by POS (user credentials):**
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

**Response from Server (session data):**
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
  "oldBalanceList": [
    {
      "operatorID": "001-001-002-001",
      "sessionID": "34db2a721c01"
    }
  ],
  "prepTicketList": [],
  "address": {...},
  "setting": {
    "language": "es",
    "currency": "DOP",
    "currency_symbol": "RD$",
    "coin_1": 25,
    "coin_2": 50,
    "coin_3": 100,
    "coin_4": 200,
    "betoffers": [
      {
        "id": 141,
        "eventtype": "dog",
        "roundInterval": 240,
        "numberCompetitor": 6,
        "stats": {
          "history": [
            [3, 5, 4, 6, 2, 1],
            [2, 6, 1, 3, 4, 5],
            [5, 3, 6, 4, 1, 2]
          ],
          "newestGame": "141_101_202512310193",
          "oldestGame": "141_101_202512310174"
        }
      }
    ]
  },
  "gamepool": [...]
}
```

**Key fields:**
| Field | Description |
|-------|-------------|
| `sessionID` | Current session identifier |
| `operatorID` | Logged in operator |
| `nextTransactionID` | Next available transaction ID for tickets |
| `oldTicketsToPayout` | Pending tickets to pay out |
| `oldBalanceList` | Historical balance records |
| `prepTicketList` | Prepared (pending) tickets |
| `setting.betoffers[].stats.history` | ~20 historical race results per game |

---

## Race Data Messages

### 3. `gameRound` - Race Data & Odds

Sent when new race data is available. Contains the gamepool with races and their odds.

```json
{
  "msgType": "gameRound",
  "msgId": 8,
  "gamepool": [
    {
      "id": "541_105_202512310193",
      "idBetoffer": 541,
      "idSchedule": "541_105_20251231",
      "videoStartDt": "2025-12-31 11:51:30",
      "videoEndDt": "2025-12-31 11:52:15",
      "eventType": "dog8",
      "roundInterval": 240,
      "odds": [
        6.4, 4.9, 5.1, 9.1, 7.8, 10, 5.7, 9.9,
        32.2, 33.4, 59.7, 51, 65.6, 37.9, 65.4, 30.6
      ],
      "competitors": {
        "1": {
          "name": "Willow",
          "weight": 39.3,
          "numberOfRaces": 2,
          "numberOfWins": 1,
          "strikeRate": 13.94,
          "bestLap": 37.08,
          "performance": 0.507,
          "last5": "5|3|4|2|8",
          "trend": 3
        },
        "2": {
          "name": "Shadow",
          "weight": 38.1,
          "numberOfRaces": 5,
          "numberOfWins": 2,
          "strikeRate": 15.2,
          "bestLap": 36.95,
          "performance": 0.612,
          "last5": "1|2|4|3|1",
          "trend": 2
        }
      }
    }
  ]
}
```

**Key fields:**
| Field | Description |
|-------|-------------|
| `gamepool[].id` | Race identifier (`{betofferId}_{schedule}_{raceNumber}`) |
| `gamepool[].eventType` | Game type (`dog`, `dog8`, `dog63`, `horsec`) |
| `gamepool[].videoStartDt` | When race video starts (UTC) |
| `gamepool[].videoEndDt` | When race video ends (UTC) |
| `gamepool[].roundInterval` | Seconds between races (240 = 4 min) |
| `gamepool[].odds` | Array of betting odds |
| `gamepool[].competitors` | Competitor stats |

**Odds array structure (6 competitors):**
- Index 0-5: Winner odds for competitors 1-6
- Index 6-35: Exacta/Forecast odds (1st + 2nd combinations)

**Odds array structure (8 competitors):**
- Index 0-7: Winner odds for competitors 1-8
- Index 8-63: Exacta/Forecast odds

---

### 4. `gameResult` - Race Result

Sent when a race finishes with the finishing positions.

```json
{
  "msgType": "gameResult",
  "msgId": null,
  "serverTime": "2025-12-31 11:51:29.81",
  "gameresult": {
    "id": "541_105_202512310193",
    "finish": {
      "1": { "competitorIndex": 5, "time": 29.58 },
      "2": { "competitorIndex": 2, "time": 29.65 },
      "3": { "competitorIndex": 8, "time": null },
      "4": { "competitorIndex": 4, "time": null },
      "5": { "competitorIndex": 1, "time": null },
      "6": { "competitorIndex": 3, "time": null },
      "7": { "competitorIndex": 7, "time": null },
      "8": { "competitorIndex": 6, "time": null }
    },
    "bonus": 1,
    "eventType": "dog8",
    "roundInterval": 240,
    "videoname": {
      "mp4": "/sdcard/dog8/R0393_h.mp4",
      "jpg": "/sdcard/dog8/R0393_h.jpg"
    }
  }
}
```

**Key fields:**
| Field | Description |
|-------|-------------|
| `gameresult.id` | Race identifier |
| `gameresult.finish` | Finishing positions (key = position) |
| `gameresult.finish[].competitorIndex` | Which competitor finished in that position |
| `gameresult.finish[].time` | Finish time (null for positions after 2nd) |
| `gameresult.bonus` | Multiplier (1=normal, 2=2x, 3=3x) |
| `gameresult.eventType` | Game type |

---

## Ticket Operations

All ticket operations are performed via WebSocket messages.

### 5. `SendTicket` - Create Bet Ticket

**Sent by POS:**
```json
{
  "msgType": "SendTicket",
  "msgId": 10,
  "transactionID": 1,
  "bets": [
    {
      "gameId": "141_101_202512310193",
      "betType": "winner",
      "selection": 3,
      "odds": 5.1,
      "stake": 100
    }
  ],
  "totalStake": 100
}
```

**Response from Server:**
```json
{
  "msgType": "TicketStatus",
  "msgId": 10,
  "transactionID": 1,
  "status": "accepted",
  "ticketCode": "ABC123456",
  "serverTime": "2025-12-31 11:52:00.00"
}
```

### Related Ticket Messages

| Message Type | Direction | Purpose |
|--------------|-----------|---------|
| `SendTicket` | POS → Server | Submit bet ticket |
| `TicketStatus` | Server → POS | Ticket confirmation/status |
| `TicketStatusGet` | POS → Server | Query ticket status |
| `TicketTimeout` | Server → POS | Ticket timeout notification |
| `TicketTurnover` | Server → POS | Ticket turnover data |
| `PrepardeTicket` | POS → Server | Pre-validate ticket |
| `PrepardeTicketPlayed` | Server → POS | Prepared ticket was played |
| `PrepardeTicketStatus` | Server → POS | Prepared ticket status |
| `QueryTicketCode` | POS → Server | Query ticket by barcode |

---

## Balance & Sales

### 6. Balance Data in `init`

Balance and sales data comes with the `init` response:

```json
{
  "msgType": "init",
  "nextTransactionID": 0,
  "oldTicketsToPayout": [],
  "oldBalanceList": [
    {
      "operatorID": "001-001-002-001",
      "sessionID": "34db2a721c01",
      "date": "2025-12-30",
      "totalSales": 5000,
      "totalPayout": 3500,
      "balance": 1500
    }
  ],
  "prepTicketList": []
}
```

### Balance/Financial Messages

| Message Type | Direction | Purpose |
|--------------|-----------|---------|
| `SendBalance` | Bidirectional | Update/send balance |
| `Turnover` | Server → POS | Turnover statistics |
| `Win` | Server → POS | Win notification |
| `CREDIT` | Server → POS | Credit operation |
| `PayinVoucher` | POS → Server | Deposit voucher |
| `PayoutVoucher` | POS → Server | Withdrawal voucher |
| `CashoutVoucher` | POS → Server | Cash out voucher |

---

## System Messages

### 7. `time` - Time Sync

Periodic time synchronization between client and server.

**Sent by POS:**
```json
{
  "msgId": 4,
  "msgType": "time",
  "clientDt": "2025-12-31 12:48:27"
}
```

**Response from Server:**
```json
{
  "msgType": "time",
  "msgId": 4,
  "deviceId": "5fd76331325cc0c7b0ba3883ae3d491d",
  "serverTimeUnix": 1767181707.05127,
  "serverTime": "2025-12-31 11:48:27.05"
}
```

### Other System Messages

| Message Type | Direction | Purpose |
|--------------|-----------|---------|
| `DeviceLogout` | POS → Server | Device logout |
| `DeviceReconnect` | POS → Server | Reconnection after disconnect |
| `DeviceRelog` | POS → Server | Re-authentication |
| `Error` | Server → POS | Error responses |
| `Translation` | Server → POS | UI translations |
| `UserSettings` | Bidirectional | User preferences |
| `SendLog` | POS → Server | Client logging to server |
| `SendTracking` | POS → Server | Analytics/tracking data |

### Error Response Example

```json
{
  "msgType": "error",
  "msgId": 0,
  "errorId": 4205,
  "errorMsg": "MsgType not found!",
  "serverTime": "2025-12-30 10:47:17.18"
}
```

---

## Messages Relayed to React App

The relay server transforms and broadcasts the following messages to our React application:

### 1. `gamepoolUpdate`

Sent when gamepool data is received. Contains all races grouped by game type.

```json
{
  "type": "gamepoolUpdate",
  "gamepool": {
    "dos": [{ "raceId": "...", "raceNumber": "0193", "odds": [...] }],
    "doe": [{ "raceId": "...", "raceNumber": "0193", "odds": [...] }],
    "dot": [{ "raceId": "...", "raceNumber": "0193", "odds": [...] }],
    "hoc": [{ "raceId": "...", "raceNumber": "0193", "odds": [...] }]
  }
}
```

### 2. `raceUpdate`

Sent for individual race updates.

```json
{
  "type": "raceUpdate",
  "game": "dos",
  "raceId": "141_101_202512310193",
  "raceNumber": "0193",
  "videoStartDt": "2025-12-31 11:51:30",
  "videoEndDt": "2025-12-31 11:52:15",
  "eventType": "dog",
  "roundInterval": 240,
  "odds": [6.4, 4.9, 5.1, 9.1, 7.8, 10],
  "competitors": {...}
}
```

### 3. `raceResult`

Sent when a race finishes.

```json
{
  "type": "raceResult",
  "game": "dos",
  "raceId": "141_101_202512310193",
  "finish": {
    "1": { "competitorIndex": 5, "time": 29.58 },
    "2": { "competitorIndex": 2, "time": 29.65 }
  },
  "bonus": 1,
  "eventType": "dog"
}
```

### 4. `resultsHistory`

Sent on initial connection with historical race results (~20 per game).

```json
{
  "type": "resultsHistory",
  "game": "dos",
  "results": [
    { "raceNumber": "0193", "first": 3, "second": 5 },
    { "raceNumber": "0192", "first": 2, "second": 6 },
    { "raceNumber": "0191", "first": 5, "second": 3 }
  ]
}
```

### 5. `timeSync`

Periodic time synchronization.

```json
{
  "type": "timeSync",
  "serverTime": "2025-12-31 11:48:27.05",
  "serverTimeUnix": 1767181707.05127
}
```

### 6. `status`

Connection status updates.

```json
{
  "type": "status",
  "connected": true,
  "message": "Connected to POS"
}
```

---

## Reference Tables

### Event Type Mapping

| POS eventType | Game Code | Description        | Competitors |
|---------------|-----------|--------------------| ------------|
| `dog`         | `dos`     | Dog Race 6         | 6 dogs      |
| `dog8`        | `doe`     | Dog Race 8         | 8 dogs      |
| `dog63`       | `dot`     | Dog Race Trifecta  | 6 dogs      |
| `horsec`      | `hoc`     | Horse Race         | 7 horses    |

### Betoffer IDs

| ID  | Game Type      | Competitors | Round Interval |
|-----|----------------|-------------|----------------|
| 141 | Dog Race (6)   | 6 dogs      | 240s (4 min)   |
| 241 | Dog Race (6)   | 6 dogs      | 240s (4 min)   |
| 541 | Dog Race (8)   | 8 dogs      | 240s (4 min)   |
| 741 | Horse Race     | 7 horses    | 240s (4 min)   |

### Race ID Format

Race IDs follow the pattern: `{betofferId}_{scheduleId}_{dateRaceNumber}`

Example: `141_101_202512310193`
- `141` = Betoffer ID (DOS - 6 dogs)
- `101` = Schedule ID
- `202512310193` = Date (20251231) + Race number (0193)

To extract race number: Take last 4 digits → `0193`

### Race Timing

| Event | Timing |
|-------|--------|
| Round Interval | 240 seconds (4 minutes) |
| Video Duration | ~45 seconds (from videoStartDt to videoEndDt) |
| Betting closes | ~5 seconds before videoStartDt |
| Race runs | During video duration |

---

## Complete Message Type List

### From POS to Server

| Message Type | Purpose |
|--------------|---------|
| `deviceLogin` | Device authentication |
| `init` | User login with credentials |
| `time` | Time sync request |
| `SendTicket` | Submit bet ticket |
| `TicketStatusGet` | Query ticket status |
| `PrepardeTicket` | Pre-validate ticket |
| `QueryTicketCode` | Query ticket by barcode |
| `SendBalance` | Send balance update |
| `PayinVoucher` | Deposit voucher |
| `PayoutVoucher` | Withdrawal voucher |
| `CashoutVoucher` | Cash out voucher |
| `DeviceLogout` | Device logout |
| `DeviceReconnect` | Reconnection |
| `DeviceRelog` | Re-authentication |
| `SendLog` | Client logging |
| `SendTracking` | Analytics data |

### From Server to POS

| Message Type | Purpose |
|--------------|---------|
| `deviceLogin` | Device auth response |
| `init` | User login response with session |
| `time` | Time sync response |
| `gameRound` | Race data with odds |
| `gameResult` | Race results |
| `TicketStatus` | Ticket confirmation |
| `TicketTimeout` | Ticket timeout |
| `TicketTurnover` | Turnover data |
| `PrepardeTicketStatus` | Prepared ticket status |
| `PrepardeTicketPlayed` | Prepared ticket played |
| `Turnover` | Turnover statistics |
| `Win` | Win notification |
| `CREDIT` | Credit operation |
| `Error` | Error responses |
| `Translation` | UI translations |
| `UserSettings` | User preferences |
