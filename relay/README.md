# virteon-relay

A pure-mock WebSocket relay that replays virteon virtual-racing fixtures on the
real 240-second block cadence. No real backend required.

## What it does

Serves fixture data from `fixtures/ws-messages-raw.json` (captured from the real
virteon POS WebSocket). On each new client connection it immediately pushes the next
5 upcoming races for each game type, then continuously broadcasts block-boundary
updates on the same timing as the live system.

## Game keys produced

| Game key | Source event type | Runners | Phase offset |
|----------|-------------------|---------|--------------|
| `dos`    | `dog`             | 6       | 0 s          |
| `doe`    | `dog8`            | 8       | 80 s         |
| `hoc`    | `horsec`          | 7       | 160 s        |

(`dog63` entries are discarded.)

## Cadence

Each game uses 240-second blocks. The three games are staggered by 80 s so their
countdowns are never in phase. Within each block:

- `videoStartDt` = block start + 195 s (45 s of race + result video at end of block)
- `videoEndDt`   = block end

## Messages emitted

| Type            | When                                              |
|-----------------|---------------------------------------------------|
| `gamepoolUpdate`| Immediately on connect — next 5 races per game    |
| `raceUpdate`    | At each 240 s block boundary per game             |
| `raceResult`    | ~5 s before the current block ends per game       |
| `timeSync`      | Every 10 s broadcast (also ~0.5 s after connect)  |

## How to run

```bash
cd relay
npm install        # installs ws@^8
node index.js      # listens on ws://0.0.0.0:8765
```

Override the port:

```bash
PORT=9000 node index.js
```

## How to test

```bash
npx wscat -c ws://localhost:8765
```

Or with Node directly:

```bash
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8765');
ws.on('message', m => console.log(m.toString().slice(0, 300)));
setTimeout(() => ws.close(), 12000);
"
```

Expected output: first message is `gamepoolUpdate` with keys `dos`, `doe`, `hoc`.
A `timeSync` arrives within ~0.5 s. `raceUpdate` messages arrive at block boundaries.
