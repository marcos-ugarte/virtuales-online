/**
 * useRaceFeed — subscribe to /web-ds (mobile-vendor wire) and expose:
 *   - allGames: one current Race per lobby game key (dog/dog8/horsec)
 *   - status:   WebSocket connection state
 *   - clockOffsetMs: server-time minus client-time, refreshed every 5s
 *
 * The vendor's `setting.betoffers` and the static payloads (translations,
 * rcx_info, betCodeDecimals) are ignored here — the lobby UI doesn't need
 * them. If a future feature does, expose them through this hook too.
 *
 * Frame contract (server → client, mobile vendor wire):
 *   init       — initial setting + gamepool window (history + upcoming)
 *   gameRound  — periodic poll response with current gamepool window
 *   gameResult — push when a race finishes (this hook lets the next poll
 *                advance the current race; finish data is consumed via the
 *                next gamepool refresh that includes the resolved finish[])
 *   time       — response to client `time` ping, carries serverTime
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AllGames, FeedStatus, GameKey, Race } from '../types/websocket';
import { GAME_KEYS } from '../types/websocket';

const BACKOFF_STEPS = [1000, 2000, 5000, 10000] as const;
const TIME_PING_INTERVAL_MS = 5_000;
const GAME_ROUND_POLL_INTERVAL_MS = 30_000;

function makeEmpty(): AllGames {
  return { dog: null, dog8: null, horsec: null };
}

/**
 * The vendor's eventType strings. Out-of-scope types (`horse`, `dog63`,
 * `kart`, `wgp`) are filtered here.
 */
const IN_SCOPE: ReadonlySet<string> = new Set<GameKey>(GAME_KEYS);

function parseVendorTs(ts: string): number {
  // "YYYY-MM-DD HH:MM:SS" — vendor emits UTC string without timezone marker.
  return Date.parse(ts.replace(' ', 'T') + 'Z');
}

/**
 * Pick the most relevant race per game key: the first race whose
 * videoEndDt is still in the future. That naturally tracks:
 *   - upcoming race → selected (countdown phase)
 *   - running race  → selected (LIVE phase)
 *   - finished race → moved past, next selected
 */
/**
 * Pick the race each card should display.
 *
 * We prefer the NEXT race that hasn't started yet (still open for betting):
 * placing a wager on the live-running race would always be rejected with
 * `betting_closed` because the server has already locked the round.
 *
 * Fallback order:
 *   1. earliest race whose `videoStartDt` is in the future,
 *   2. a currently-live race (`videoEndDt > now` but already started),
 *   3. the latest known race for that game type.
 */
/**
 * Slice the gamepool into two per-game-type views:
 *
 *   bet      → the NEXT race per game type (videoStartDt in the future).
 *              That's what the player CAN bet on; the lobby cards display
 *              this. Picking a live race here causes the backend to
 *              reject placements with "betting_closed".
 *   live     → the currently-running race per game type (started but its
 *              videoEndDt is still in the future). The LiveMonitor video
 *              uses this to play the race that's on-air right now.
 */
function pickGames(
  gamepool: Race[],
  serverNowMs: number,
): { bet: AllGames; live: AllGames } {
  const byGame: Record<GameKey, Race[]> = { dog: [], dog8: [], horsec: [] };
  for (const entry of gamepool) {
    if (IN_SCOPE.has(entry.eventType)) {
      byGame[entry.eventType].push(entry);
    }
  }
  const bet: AllGames = { dog: null, dog8: null, horsec: null };
  const live: AllGames = { dog: null, dog8: null, horsec: null };
  for (const gk of GAME_KEYS) {
    const sorted = byGame[gk].slice().sort((a, b) =>
      a.videoStartDt.localeCompare(b.videoStartDt),
    );

    // bet: prefer a currently-LIVE race so the card stays on it while
    // the round runs (showing the "LIVE NOW" overlay). The runner table
    // disables WIN cells in that state — see RaceCard. If no race is
    // live, pick the earliest upcoming one. If neither, leave null.
    let liveCandidate: Race | null = null;
    for (const e of sorted) {
      const startMs = parseVendorTs(e.videoStartDt);
      const endMs = parseVendorTs(e.videoEndDt);
      if (startMs <= serverNowMs && endMs > serverNowMs) {
        liveCandidate = e;
        break;
      }
    }
    if (liveCandidate) {
      bet[gk] = liveCandidate;
    } else {
      for (const e of sorted) {
        if (parseVendorTs(e.videoStartDt) > serverNowMs) {
          bet[gk] = e;
          break;
        }
      }
    }

    // live: most recent race that has started, hasn't finished, AND has
    // a playable mp4 URL. Skipping races without `videoname.mp4` avoids
    // the "LIVE" text-only state — better UX to show "waiting for race"
    // than a black box with the word LIVE.
    for (const e of sorted) {
      const startMs = parseVendorTs(e.videoStartDt);
      const endMs = parseVendorTs(e.videoEndDt);
      if (
        startMs <= serverNowMs &&
        endMs > serverNowMs &&
        e.videoname?.mp4
      ) {
        live[gk] = e;
        break;
      }
    }
  }
  return { bet, live };
}

function formatClientDt(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function randomInitID(): string {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return (
    'web-lobby-' +
    Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
  );
}

/**
 * Merge two snapshots of the same race (same id) so that fields the new
 * version omits keep the value from the previous one. The server is
 * inconsistent about which fields it includes per phase of a round — in
 * particular `videoname.mp4` arrives at init and disappears on later
 * pushes once the race is in progress, even though the asset is still
 * valid. Without this merge the LiveMonitor loses the video URL mid-race.
 */
function mergeRace(prev: Race, fresh: Race): Race {
  const merged: Race = { ...prev };
  for (const key of Object.keys(fresh) as Array<keyof Race>) {
    const v = fresh[key];
    if (v !== null && v !== undefined) {
      // Special case: don't replace a non-empty `videoname` block with an
      // empty `{}` — keep the URL we already had.
      if (key === 'videoname' && typeof v === 'object') {
        const oldV = prev.videoname;
        merged.videoname = {
          mp4: (v as Race['videoname'])?.mp4 ?? oldV?.mp4,
          jpg: (v as Race['videoname'])?.jpg ?? oldV?.jpg,
        };
      } else {
        // Type assertion needed because TS can't track the per-key types
        // across a `keyof` iteration.
        (merged as unknown as Record<string, unknown>)[key] = v;
      }
    }
  }
  return merged;
}

/** Max number of past results we keep in memory for the Recent Results panel. */
const MAX_RECENT_RESULTS = 20;

/** A race is "finished" once its `finish` field is non-empty. */
function isFinished(r: Race): boolean {
  return !!r.finish && Object.keys(r.finish).length > 0;
}

export function useRaceFeed(opts: { wsUrl: string }): {
  /** Next race per game type (still open for betting). Cards display this. */
  allGames: AllGames;
  /** Currently-running race per game type. LiveMonitor video uses this. */
  liveGames: AllGames;
  status: FeedStatus;
  clockOffsetMs: number;
  /** Most recent finished races across all 3 game types, newest first. */
  recentResults: Race[];
  /** Highest bonusValue seen across the whole gamepool. The picked
   *  next/live race often has bonusValue=0 (server hasn't computed yet);
   *  using the pool max keeps the JACKPOT figure stable through the
   *  gap between rounds. */
  jackpotValue: number;
} {
  const { wsUrl } = opts;

  const [allGames, setAllGames] = useState<AllGames>(makeEmpty);
  const [liveGames, setLiveGames] = useState<AllGames>(makeEmpty);
  const [status, setStatus] = useState<FeedStatus>('connecting');
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [recentResults, setRecentResults] = useState<Race[]>([]);
  const [jackpotValue, setJackpotValue] = useState<number>(0);
  // Keep the last gamepool batch so we can re-evaluate "what's live now"
  // every second between polls — otherwise a finished race stays in
  // liveGames for up to GAME_ROUND_POLL_INTERVAL_MS and the LiveMonitor
  // keeps playing the video past its videoEndDt.
  const latestGamepoolRef = useRef<Race[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIdRef = useRef(0);
  const clockOffsetRef = useRef(0);
  const backoffIndexRef = useRef(0);
  const mountedRef = useRef(true);

  const sendFrame = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const id = ++msgIdRef.current;
    ws.send(
      JSON.stringify({
        ...payload,
        msgId: id,
        clientDt: formatClientDt(),
        version: '3.0.1000',
      }),
    );
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (timeTimerRef.current !== null) {
      clearInterval(timeTimerRef.current);
      timeTimerRef.current = null;
    }
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Pure recompute against a known gamepool — extracted so the per-second
  // tick can re-run it without going through the WS message path.
  const recompute = useCallback((gamepool: Race[], sawInBatchSource: 'ws' | 'tick') => {
    const serverNowMs = Date.now() + clockOffsetRef.current;
    const { bet, live } = pickGames(gamepool, serverNowMs);
    // On a WS message we honour the "no clobber when type missing" rule.
    // On a tick (no new data) we trust the latest gamepool fully — every
    // type in the cache is considered "fresh enough" because it's the most
    // recent batch we ever received.
    const sawInBatch: Record<GameKey, boolean> =
      sawInBatchSource === 'tick'
        ? { dog: true, dog8: true, horsec: true }
        : { dog: false, dog8: false, horsec: false };
    if (sawInBatchSource === 'ws') {
      for (const r of gamepool) {
        if (IN_SCOPE.has(r.eventType)) sawInBatch[r.eventType] = true;
      }
    }
    setAllGames((prev) => {
      let changed = false;
      const merged: AllGames = { ...prev };
      for (const gk of GAME_KEYS) {
        const candidate = bet[gk];
        if (!sawInBatch[gk]) continue;
        if (candidate?.id !== prev[gk]?.id) {
          merged[gk] = candidate;
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
    setLiveGames((prev) => {
      let changed = false;
      const merged: AllGames = { ...prev };
      for (const gk of GAME_KEYS) {
        if (live[gk]?.id !== prev[gk]?.id) {
          merged[gk] = live[gk];
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  }, []);

  const handleGamepool = useCallback((gamepool: Race[]) => {
    // Merge into the running pool by id rather than replacing. Two
    // reasons:
    //   1. The periodic poll asks for a slim window (`futureGames: 1`)
    //      so it'd otherwise erase races we already know about.
    //   2. The same race id arrives twice during its lifecycle:
    //      first at init/upcoming with a full `videoname` block, then
    //      at gameResult / poll WITHOUT that field (the server doesn't
    //      re-emit it). A naive overwrite drops the URL and the
    //      LiveMonitor renders "LIVE" text without video.
    //
    // Defensive merge: per-id, keep fields from the previous copy when
    // the new one doesn't provide them (null / undefined).
    const byId = new Map<string, Race>();
    for (const r of latestGamepoolRef.current) byId.set(r.id, r);
    for (const r of gamepool) {
      const prev = byId.get(r.id);
      byId.set(r.id, prev ? mergeRace(prev, r) : r);
    }
    // Sort by start time; trim to a sliding window so the cache doesn't
    // grow unbounded across long sessions.
    const merged = Array.from(byId.values()).sort((a, b) =>
      a.videoStartDt.localeCompare(b.videoStartDt),
    );
    const MAX_POOL = 60;
    latestGamepoolRef.current =
      merged.length > MAX_POOL ? merged.slice(-MAX_POOL) : merged;
    recompute(latestGamepoolRef.current, 'ws');

    // Highest jackpot across the entire merged pool. The picked race
    // (live or upcoming) can have bonusValue=0 while a sibling round in
    // the same pool carries the running total — picking the max keeps
    // the figure stable.
    let maxJp = 0;
    for (const r of latestGamepoolRef.current) {
      if (!IN_SCOPE.has(r.eventType)) continue; // exclude out-of-scope feeds (horse 251, dog63, …)
      const v = r.jackpotInfo?.bonusValue ?? 0;
      if (v > maxJp) maxJp = v;
    }
    setJackpotValue((prev) => (prev === maxJp ? prev : maxJp));

    // Recent results — gather every finished in-scope race from this batch,
    // merge with what we already have, dedupe by id (last write wins so
    // late-arriving result data overrides earlier partial entries), sort
    // newest first by videoEndDt, cap at MAX_RECENT_RESULTS.
    //
    // Use the MERGED race (from latestGamepoolRef) rather than the raw
    // batch entry so we never drop fields like `videoEndDt` that the
    // gameResult push omits.
    const mergedById = new Map(latestGamepoolRef.current.map((r) => [r.id, r]));
    const incoming = gamepool
      .filter((r) => IN_SCOPE.has(r.eventType) && isFinished(r))
      .map((r) => mergedById.get(r.id) ?? r);
    if (incoming.length === 0) return;
    setRecentResults((prev) => {
      const byId = new Map<string, Race>();
      for (const r of prev) byId.set(r.id, r);
      for (const r of incoming) byId.set(r.id, r);
      const merged = Array.from(byId.values()).sort((a, b) =>
        b.videoEndDt.localeCompare(a.videoEndDt),
      );
      return merged.slice(0, MAX_RECENT_RESULTS);
    });
  }, [recompute]);

  // Time-driven re-evaluation: every second, re-pick allGames/liveGames
  // against the latest known gamepool + current wall clock. Catches races
  // that crossed videoStartDt / videoEndDt between polls so the LiveMonitor
  // stops the video the moment a race actually finishes.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (latestGamepoolRef.current.length === 0) return;
      recompute(latestGamepoolRef.current, 'tick');
    }, 1000);
    return () => window.clearInterval(id);
  }, [recompute]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    setStatus('connecting');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      backoffIndexRef.current = 0;
      setStatus('connected');
      // init handshake — small recent + upcoming window so the lobby
      // has something to render immediately.
      sendFrame({
        msgType: 'init',
        initID: randomInitID(),
        deviceType: 'prepare',
        // -8 history per type seeds enough finished races to fill the
        // Recent Results panel (3 game types × 8 ≈ 24 candidates).
        // futureGames bumped to 5 so we have multiple upcoming races
        // pre-loaded WITH `videoname.mp4` — the periodic poll's slim
        // response may omit that field for races it has already sent.
        historyGames: -8,
        futureGames: 5,
      });
      timeTimerRef.current = setInterval(() => {
        sendFrame({ msgType: 'time' });
      }, TIME_PING_INTERVAL_MS);
      pollTimerRef.current = setInterval(() => {
        sendFrame({
          msgType: 'gameRound',
          gameId: null,
          historyGames: 0,
          // Bumped from 1 → 3 so the poll re-delivers the next few races
          // (with their `videoname`) and not just the immediate next.
          // Otherwise a new round that lands between polls only arrives
          // in the slim form and the LiveMonitor has no URL to play.
          futureGames: 3,
        });
      }, GAME_ROUND_POLL_INTERVAL_MS);
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;
      let msg: { msgType?: string; [k: string]: unknown };
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      switch (msg.msgType) {
        case 'init':
        case 'gameRound': {
          const gp = msg.gamepool;
          if (Array.isArray(gp)) handleGamepool(gp as Race[]);
          break;
        }
        case 'gameResult': {
          // A push that a race has just finished. The payload mirrors a
          // Race object with `finish` populated. We treat it as a one-race
          // "mini gamepool" so it flows through the same recent-results
          // bookkeeping (dedupe by id, sort, cap).
          const gr = msg.gameresult as Race | undefined;
          if (gr && IN_SCOPE.has(gr.eventType) && isFinished(gr)) {
            handleGamepool([gr]);
          }
          break;
        }
        case 'time': {
          const serverUnix = msg.serverTimeUnix as number | undefined;
          if (typeof serverUnix === 'number' && serverUnix > 0) {
            const serverMs =
              serverUnix < 1e12 ? serverUnix * 1000 : serverUnix;
            const offset = serverMs - Date.now();
            clockOffsetRef.current = offset;
            setClockOffsetMs(offset);
          } else if (typeof msg.serverTime === 'string') {
            const serverMs = parseVendorTs(msg.serverTime);
            const offset = serverMs - Date.now();
            clockOffsetRef.current = offset;
            setClockOffsetMs(offset);
          }
          break;
        }
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      clearTimers();
      setStatus('reconnecting');
      wsRef.current = null;
      const delay =
        BACKOFF_STEPS[
          Math.min(backoffIndexRef.current, BACKOFF_STEPS.length - 1)
        ];
      backoffIndexRef.current = Math.min(
        backoffIndexRef.current + 1,
        BACKOFF_STEPS.length - 1,
      );
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };

    ws.onerror = () => {
      console.warn('[web-ds] WebSocket error');
    };
  }, [wsUrl, sendFrame, clearTimers, handleGamepool]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      clearTimers();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, clearReconnectTimer, clearTimers]);

  return {
    allGames,
    liveGames,
    status,
    clockOffsetMs,
    recentResults,
    jackpotValue,
  };
}
