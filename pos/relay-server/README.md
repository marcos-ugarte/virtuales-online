# Virtual Racing Relay Server

WebSocket relay server for Virtual Racing POS that captures race data from the original VG POS and relays it to consumer clients.

## Current Status (2026-02-05)

**The relay server is RUNNING on Hostinger VPS:**
- Host: `88.223.95.55` (Hostinger VPS)
- WebSocket: `ws://88.223.95.55:4081` ✅ Working
- HTTP API: `http://88.223.95.55:4082`
- Directory: `/opt/virtual-racing-relay`
- Receives race data for all games (dos, dot, doe, hoc) with competitors, odds, etc.

**Azure POS App configured to connect:**
- VITE_WS_URL: `ws://88.223.95.55:4081`

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  VG POS Original    │     │   Relay Server       │     │   Azure POS App     │
│  (vgpos.net)        │────▶│   (Hostinger VPS)    │────▶│   (Azure Container  │
│                     │     │   88.223.95.55:4081  │     │    Apps)            │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

## Components

### server.js - WebSocket Relay Server
- Listens on port 8765 (WebSocket) for connections
- Accepts capture client on `/capture` endpoint
- Accepts consumer clients on root `/` endpoint
- HTTP control API on port 8766 for pause/resume/status

### capture.js - Data Capture Service
- Uses Playwright to login to the original VG POS
- Captures race data for 4 games: dos, dot, doe, hoc
- Sends data to relay server via WebSocket
- Starts in paused state to allow manual control

### races-sync-service.js - Azure API Sync
- Connects to relay WebSocket as consumer
- Transforms messages to Azure API format
- Batches and sends to Azure API every 1 second
- Endpoints:
  - `POST /api/ingest/race-data/batch` - GameRounds
  - `POST /api/ingest/race-result/batch` - GameResults

### monitor.js - Debug/Monitoring Tool
- Connects to relay and displays messages in real-time
- Usage: `node monitor.js 88.223.95.55 --verbose`

## Ports

| Internal | External | Purpose |
|----------|----------|---------|
| 8765 | 4081 | WebSocket relay |
| 8766 | 4082 | HTTP control API |

## Docker Services

| Service | Container | Purpose |
|---------|-----------|---------|
| relay-server | virtual-racing-relay | WebSocket relay + capture |
| races-sync | virtual-racing-sync | Sync to Azure API |

## Running with Docker

### Deploy to Hostinger (recommended)
```bash
cd relay-server
API_KEY=$INGEST_API_KEY ./deploy.sh root@88.223.95.55  # key in gsd/credentials.md
```

### Start locally (for testing)
```bash
cd relay-server
API_KEY=xxx docker-compose up -d --build
```

### Check status
```bash
docker-compose ps
docker-compose logs -f
```

### Stop the server
```bash
docker-compose down
```

### Restart the server
```bash
docker-compose restart
```

## HTTP Control API (Port 4082)

### Get Status
```bash
curl http://88.223.95.55:4082/status
```

Response:
```json
{
  "captureActive": true,
  "captureConnected": true,
  "consumers": 3
}
```

### Pause Capture
```bash
curl -X POST http://88.223.95.55:4082/pause
```

### Resume Capture
```bash
curl -X POST http://88.223.95.55:4082/resume
```

### Toggle Capture
```bash
curl -X POST http://88.223.95.55:4082/toggle
```

## Azure POS Configuration

The Azure POS app connects to this relay server. Configuration:

| Variable | Value |
|----------|-------|
| VITE_WS_URL | `ws://88.223.95.55:4081` |
| VITE_API_URL | `https://api.virtuales.bet` |
| VITE_DEV_MODE | `false` |

### Azure Container App
- Name: `pos`
- URL: `pos.proudplant-abfc9fde.eastus.azurecontainerapps.io`
- Image: `lotterylite.azurecr.io/frontend:latest`

## Firewall Requirements

Ensure these ports are open on the server (88.223.95.55):
- 4081/tcp - WebSocket relay
- 4082/tcp - HTTP control API

## Troubleshooting

### Check if relay server is running
```bash
curl http://88.223.95.55:4082/status
```

### Check Docker container
```bash
docker ps | grep virtual-racing-relay
docker logs virtual-racing-relay
```

### Restart with fresh build
```bash
docker-compose down
docker-compose up -d --build
```

### Connection Issues
1. Verify firewall allows ports 4081 and 4082
2. Check Docker container is running
3. Check capture status via HTTP API
4. Verify Azure POS has correct VITE_WS_URL

## Important Notes

1. **Session Management**: The capture service manages a single session with the original VG POS. If capture is active, another login will fail.

2. **Pause When Not Needed**: Use the pause feature when the POS is not in use to release the session.

3. **Auto-Restart**: Docker compose is configured with `restart: always` - the server will restart automatically after crashes or server reboots.

4. **Session Rotation**: The capture service automatically rotates sessions every 4-8 hours to avoid detection.

## Testing

### Quick Test
```bash
node test-connection.js 88.223.95.55
```

### Simple WebSocket Test
```bash
node test-ws-simple.js 88.223.95.55
```

### Expected Output
```
=== Virtual Racing Relay Server Test ===
✅ WebSocket connection
✅ Received initial data
   - Message type: status
   - Connected: true
✅ Race data received
   - Game: dos
   - Race #: 0113
   - Competitors: 6
```

## Message Format (Current)

### Status Message
```json
{
  "type": "status",
  "connected": true,
  "message": "Connected to POS"
}
```

### Race Update Message
```json
{
  "type": "raceUpdate",
  "game": "dos",
  "raceId": "141_101_202602030113",
  "raceNumber": "0113",
  "videoStartDt": "2026-02-03 06:28:00",
  "videoEndDt": "2026-02-03 06:28:45",
  "eventType": "dog",
  "roundInterval": 240,
  "odds": [5.2, 6.5, ...],
  "competitors": {
    "1": { "name": "Gale", "weight": 32, ... }
  }
}
```

## Hostinger VPS Deployment

The relay server runs on a **Hostinger VPS**:
- Host: `88.223.95.55`
- Directory: `/opt/virtual-racing-relay`
- Port 4081: WebSocket relay
- Port 4082: HTTP control API

### Deploy
```bash
cd relay-server
./deploy.sh root@88.223.95.55
```

### Check Status
```bash
curl http://88.223.95.55:4082/status
```

### View Logs
```bash
ssh root@88.223.95.55 'docker logs -f virtual-racing-relay'
```

### Restart
```bash
ssh root@88.223.95.55 'cd /opt/virtual-racing-relay && docker-compose restart'
```

## Monitor Tool

Monitor incoming messages in real-time:
```bash
# Basic
node monitor.js 88.223.95.55

# Verbose (show odds, competitors)
node monitor.js 88.223.95.55 --verbose

# JSON output (for piping)
node monitor.js 88.223.95.55 --json

# With stats every 30s
node monitor.js 88.223.95.55 --stats
```

## History

- 2026-02-05: Created races-sync-service.js for Azure API sync
- 2026-02-05: Added Dockerfile.sync and docker-compose multi-service
- 2026-02-05: Created monitor.js for real-time message monitoring
- 2026-02-05: Documented Hostinger VPS deployment (not Azure)
- 2026-02-03: Added docker-compose.yml with restart policy
- 2026-02-03: Configured Azure POS with VITE_WS_URL=ws://88.223.95.55:4081
- 2026-02-03: Created test scripts (test-connection.js, test-ws-simple.js)
- 2026-02-03: Verified relay server working - receiving race data
