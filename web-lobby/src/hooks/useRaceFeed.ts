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
function pickCurrentRace(gamepool: Race[], serverNowMs: number): AllGames {
  const byGame: Record<GameKey, Race[]> = { dog: [], dog8: [], horsec: [] };
  for (const entry of gamepool) {
    if (IN_SCOPE.has(entry.eventType)) {
      byGame[entry.eventType].push(entry);
    }
  }
  const result: AllGames = { dog: null, dog8: null, horsec: null };
  for (const gk of GAME_KEYS) {
    const sorted = byGame[gk].slice().sort((a, b) =>
      a.videoStartDt.localeCompare(b.videoStartDt),
    );
    let chosen: Race | null = null;
    for (const e of sorted) {
      if (parseVendorTs(e.videoEndDt) > serverNowMs) {
        chosen = e;
        break;
      }
    }
    if (chosen === null && sorted.length > 0) {
      chosen = sorted[sorted.length - 1];
    }
    result[gk] = chosen;
  }
  return result;
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

export function useRaceFeed(opts: { wsUrl: string }): {
  allGames: AllGames;
  status: FeedStatus;
  clockOffsetMs: number;
} {
  const { wsUrl } = opts;

  const [allGames, setAllGames] = useState<AllGames>(makeEmpty);
  const [status, setStatus] = useState<FeedStatus>('connecting');
  const [clockOffsetMs, setClockOffsetMs] = useState(0);

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

  const handleGamepool = useCallback((gamepool: Race[]) => {
    const serverNowMs = Date.now() + clockOffsetRef.current;
    const next = pickCurrentRace(gamepool, serverNowMs);
    setAllGames((prev) => {
      let changed = false;
      const merged: AllGames = { ...prev };
      for (const gk of GAME_KEYS) {
        if (next[gk]?.id !== prev[gk]?.id) {
          merged[gk] = next[gk];
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  }, []);

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
        historyGames: -2,
        futureGames: 2,
      });
      timeTimerRef.current = setInterval(() => {
        sendFrame({ msgType: 'time' });
      }, TIME_PING_INTERVAL_MS);
      pollTimerRef.current = setInterval(() => {
        sendFrame({
          msgType: 'gameRound',
          gameId: null,
          historyGames: 0,
          futureGames: 0,
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
          // The next gameRound poll picks up the resolved finish[] from
          // the vendor's response. Logged here for debugging only.
          if (typeof console !== 'undefined') {
            const gr = msg.gameresult as { id?: string } | undefined;
            console.debug('[web-ds] gameResult', gr?.id);
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

  return { allGames, status, clockOffsetMs };
}
