'use strict';

const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || '8765', 10);
const BLOCK_SEC = 240;
const LOOKAHEAD = 5; // races sent on gamepoolUpdate
const RESULT_LEAD_SEC = 5; // send raceResult this many seconds before block end
const TIMESYNC_INTERVAL_MS = 10_000;
const FIRST_TIMESYNC_DELAY_MS = 500;

// Game type → { key, offset }
const GAME_CONFIG = {
  dog:    { key: 'dos', offset: 0 },
  dog8:   { key: 'doe', offset: 80 },
  horsec: { key: 'hoc', offset: 160 },
};

// ---------------------------------------------------------------------------
// Fixture loading
// ---------------------------------------------------------------------------
function loadFixtures() {
  const fixturePath = path.join(__dirname, 'fixtures', 'ws-messages-raw.json');
  const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  // Collect all gamepool arrays from all messages
  const allRounds = [];
  for (const msg of raw.messages) {
    const data = msg.data;
    if (data && Array.isArray(data.gamepool)) {
      for (const round of data.gamepool) {
        if (round && round.eventType) {
          allRounds.push(round);
        }
      }
    }
  }

  // Group by eventType, dedupe by id (use id field as unique key)
  const byType = {};
  for (const round of allRounds) {
    const et = round.eventType;
    if (!GAME_CONFIG[et]) continue; // discard dog63 and anything else unknown
    if (!byType[et]) byType[et] = new Map();
    // use the id field as dedup key
    const key = round.id || round.idRace || JSON.stringify(round.videoStartDt);
    if (!byType[et].has(key)) {
      byType[et].set(key, round);
    }
  }

  // Convert maps to arrays
  const queues = {};
  for (const [et, map] of Object.entries(byType)) {
    const { key } = GAME_CONFIG[et];
    queues[key] = Array.from(map.values());
  }

  return queues;
}

// ---------------------------------------------------------------------------
// Cadence helpers
// ---------------------------------------------------------------------------
function toUtcString(epochMs) {
  return new Date(epochMs).toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Compute block timing info for a game given the current wall clock.
 *  offset: per-game phase offset in seconds
 */
function getBlock(nowMs, offset) {
  const nowSec = Math.floor(nowMs / 1000);
  const blockIndex = Math.floor((nowSec - offset) / BLOCK_SEC);
  const blockStartSec = blockIndex * BLOCK_SEC + offset;
  const blockEndSec = blockStartSec + BLOCK_SEC;
  const videoStartSec = blockStartSec + 195; // race starts 195 s into block
  const videoEndSec = blockEndSec;
  return { blockIndex, blockStartSec, blockEndSec, videoStartSec, videoEndSec };
}

/**
 * Build a single RaceData object for a given blockIndex, pulling from the queue.
 */
function buildRaceData(queue, gameKey, blockIndex, blockInfo) {
  const template = queue[((blockIndex % queue.length) + queue.length) % queue.length];
  const { videoStartSec, videoEndSec } = blockInfo;

  // Clone without mutating the original
  const race = Object.assign({}, template);

  // Override / normalise fields per spec
  race.id = `${gameKey}_${blockIndex}`;
  race.raceId = race.id;
  race.raceNumber = blockIndex;
  race.game = gameKey;
  race.videoStartDt = toUtcString(videoStartSec * 1000);
  race.videoEndDt = toUtcString(videoEndSec * 1000);
  race.roundInterval = BLOCK_SEC;

  return race;
}

/**
 * Build the next N races for a game starting at the given blockIndex.
 *
 * Skips the current block when its race has already started (we don't want
 * the lobby to show LIVE NOW the moment a client connects in the middle of
 * a race — the lobby shows the *upcoming* race for each game).
 */
function buildLookahead(queue, gameKey, offset, count, nowMs) {
  const races = [];
  const base = getBlock(nowMs, offset);
  const nowSec = Math.floor(nowMs / 1000);
  // If the current block's race has already started (now > videoStartSec),
  // shift forward by one block so the first race in the lookahead is the
  // next upcoming one.
  const startBi = nowSec >= base.videoStartSec ? base.blockIndex + 1 : base.blockIndex;
  for (let i = 0; i < count; i++) {
    const bi = startBi + i;
    const blockStartSec = bi * BLOCK_SEC + offset;
    const blockEndSec = blockStartSec + BLOCK_SEC;
    const blockInfo = {
      blockIndex: bi,
      blockStartSec,
      blockEndSec,
      videoStartSec: blockStartSec + 195,
      videoEndSec: blockEndSec,
    };
    races.push(buildRaceData(queue, gameKey, bi, blockInfo));
  }
  return races;
}

// ---------------------------------------------------------------------------
// Result synthesis
// ---------------------------------------------------------------------------
function buildFinish(template, nRunners) {
  // Use fixture finish if it exists and is an object with numeric keys
  if (template.finish && typeof template.finish === 'object') {
    return template.finish;
  }
  // Synthesise: random shuffle of runner indices
  const runners = Array.from({ length: nRunners }, (_, i) => i + 1);
  for (let i = runners.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [runners[i], runners[j]] = [runners[j], runners[i]];
  }
  const finish = {};
  runners.forEach((competitorIndex, pos) => {
    finish[String(pos + 1)] = { competitorIndex, time: null };
  });
  return finish;
}

// ---------------------------------------------------------------------------
// Safe send helper
// ---------------------------------------------------------------------------
function safeSend(ws, obj) {
  try {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  } catch (err) {
    console.error('[relay] send error:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Server-level scheduler (fires at block boundaries, shared across clients)
// ---------------------------------------------------------------------------
function scheduleNextBoundary(gameKey, offset, queues, broadcast, schedulers) {
  const nowMs = Date.now();
  const { blockEndSec, blockStartSec, blockIndex } = getBlock(nowMs, offset);

  // Next block starts at blockEndSec
  const nextBlockStartMs = blockEndSec * 1000;
  const delayMs = nextBlockStartMs - nowMs;

  const resultDelayMs = (blockEndSec - RESULT_LEAD_SEC) * 1000 - nowMs;

  // Schedule raceResult for the CURRENT block (if not already past)
  if (resultDelayMs > 0) {
    const resultTimer = setTimeout(() => {
      const nowMs2 = Date.now();
      const bi = getBlock(nowMs2, offset).blockIndex - 1; // the block that just ended
      // Actually: the block that triggered this timer is blockIndex (current)
      const queue = queues[gameKey];
      const nRunners = Object.keys(queue[0].competitors || {}).length || 6;
      const template = queue[((blockIndex % queue.length) + queue.length) % queue.length];
      const finish = buildFinish(template, nRunners);
      const raceResult = {
        type: 'raceResult',
        game: gameKey,
        raceId: `${gameKey}_${blockIndex}`,
        finish,
        eventType: template.eventType,
      };
      broadcast(raceResult);
    }, resultDelayMs);
    schedulers.timers.push(resultTimer);
  }

  // Schedule raceUpdate at block rollover
  const rolloverTimer = setTimeout(() => {
    const nowMs2 = Date.now();
    const block2 = getBlock(nowMs2, offset);
    const queue = queues[gameKey];
    const raceData = buildRaceData(queue, gameKey, block2.blockIndex, block2);

    console.log(
      `[relay] raceUpdate  game=${gameKey}  id=${raceData.id}  videoStartDt=${raceData.videoStartDt}`
    );

    broadcast({ type: 'raceUpdate', game: gameKey, ...raceData });

    // Chain to the next boundary
    scheduleNextBoundary(gameKey, offset, queues, broadcast, schedulers);
  }, delayMs);

  schedulers.timers.push(rolloverTimer);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  console.log('[relay] loading fixtures…');
  const queues = loadFixtures();

  for (const [gameKey, queue] of Object.entries(queues)) {
    console.log(`[relay]   ${gameKey}: ${queue.length} distinct rounds loaded`);
  }

  // Verify all 3 game keys are present
  const required = ['dos', 'doe', 'hoc'];
  for (const k of required) {
    if (!queues[k] || queues[k].length === 0) {
      console.warn(`[relay] WARNING: no rounds loaded for game key '${k}'`);
    }
  }

  const wss = new WebSocketServer({ host: '0.0.0.0', port: PORT });

  // Broadcast to all connected clients
  function broadcast(obj) {
    const payload = JSON.stringify(obj);
    for (const client of wss.clients) {
      try {
        if (client.readyState === client.OPEN) {
          client.send(payload);
        }
      } catch (err) {
        console.error('[relay] broadcast error:', err.message);
      }
    }
  }

  // Server-wide schedulers for block boundaries
  const schedulers = { timers: [] };
  for (const [et, cfg] of Object.entries(GAME_CONFIG)) {
    if (queues[cfg.key]) {
      scheduleNextBoundary(cfg.key, cfg.offset, queues, broadcast, schedulers);
    }
  }

  // TimeSync broadcast every 10 s
  setInterval(() => {
    const now = Date.now();
    broadcast({
      type: 'timeSync',
      serverTime: toUtcString(now),
      serverTimeUnix: now,
    });
  }, TIMESYNC_INTERVAL_MS);

  // Client connection handler
  wss.on('connection', (ws, req) => {
    const addr = req.socket.remoteAddress;
    console.log(`[relay] client connected  addr=${addr}`);

    // Send gamepoolUpdate immediately (next LOOKAHEAD races per game)
    const nowMs = Date.now();
    const gamepool = {};
    for (const [et, cfg] of Object.entries(GAME_CONFIG)) {
      if (queues[cfg.key]) {
        gamepool[cfg.key] = buildLookahead(queues[cfg.key], cfg.key, cfg.offset, LOOKAHEAD, nowMs);
      }
    }
    safeSend(ws, { type: 'gamepoolUpdate', gamepool, sourceMode: 'mock' });

    // Send first timeSync quickly so client doesn't wait 10 s
    setTimeout(() => {
      const now = Date.now();
      safeSend(ws, {
        type: 'timeSync',
        serverTime: toUtcString(now),
        serverTimeUnix: now,
      });
    }, FIRST_TIMESYNC_DELAY_MS);

    ws.on('close', () => {
      console.log(`[relay] client disconnected  addr=${addr}`);
    });

    ws.on('error', (err) => {
      console.error(`[relay] client error  addr=${addr}  err=${err.message}`);
    });
  });

  wss.on('listening', () => {
    console.log(`[relay] listening on ws://0.0.0.0:${PORT}`);
    console.log(`[relay] game keys: dos (dog6, offset=0s)  doe (dog8, offset=80s)  hoc (horsec, offset=160s)`);
    console.log(`[relay] cadence: ${BLOCK_SEC}s blocks, videoStart at blockStart+195s`);
  });

  wss.on('error', (err) => {
    console.error('[relay] server error:', err.message);
    process.exit(1);
  });

  // Graceful shutdown
  function shutdown() {
    console.log('[relay] shutting down…');
    for (const t of schedulers.timers) clearTimeout(t);
    wss.close(() => process.exit(0));
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
