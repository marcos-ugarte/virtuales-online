/**
 * useRealRaceData — simplified WebSocket hook for web-lobby.
 * Connects to the relay, tracks one RaceData per game key,
 * and applies server clock offset for countdown accuracy.
 *
 * Adapted from virteon-platform/apps/pos-go/src/hooks/useRealRaceData.ts
 * (betting, ticket and session logic stripped out).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  GameKey,
  RaceData,
  RelayMessage,
  RaceUpdate,
} from '../types/websocket';

type Status = 'connecting' | 'connected' | 'reconnecting' | 'error';

type AllGames = Record<GameKey, RaceData | null>;

const GAME_KEYS: GameKey[] = ['dos', 'doe', 'hoc'];

const BACKOFF_STEPS = [1000, 2000, 5000, 10000];

function makeEmpty(): AllGames {
  return { dos: null, doe: null, hoc: null };
}

export function useRealRaceData(opts: { relayUrl: string }): {
  allGames: AllGames;
  status: Status;
  clockOffsetMs: number;
} {
  const { relayUrl } = opts;

  const [allGames, setAllGames] = useState<AllGames>(makeEmpty);
  const [status, setStatus] = useState<Status>('connecting');
  const [clockOffsetMs, setClockOffsetMs] = useState(0);

  // Refs so closures always see latest values without re-triggering the effect
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffIndexRef = useRef(0);
  const mountedRef = useRef(true);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    setStatus('connecting');

    const ws = new WebSocket(relayUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      backoffIndexRef.current = 0;
      setStatus('connected');
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;

      let msg: RelayMessage;
      try {
        msg = JSON.parse(event.data as string) as RelayMessage;
      } catch {
        return;
      }

      if (msg.type === 'gamepoolUpdate') {
        const { gamepool } = msg;
        setAllGames(prev => {
          const next = { ...prev };
          let changed = false;
          for (const key of GAME_KEYS) {
            const pool = gamepool[key];
            const first = (pool && pool.length > 0) ? pool[0] : null;
            if (next[key] !== first) {
              next[key] = first ?? null;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      } else if (msg.type === 'raceUpdate') {
        const update = msg as RaceUpdate;
        const game = update.game;
        if (!GAME_KEYS.includes(game)) return;
        // Strip the 'type' field to get a plain RaceData
        const { type: _type, ...raceData } = update;
        setAllGames(prev => {
          const next = { ...prev, [game]: raceData as RaceData };
          return next;
        });
      } else if (msg.type === 'raceResult') {
        // Ignored in v1 lobby — no betting state to update
        console.debug('[relay] raceResult', msg);
      } else if (msg.type === 'timeSync') {
        // Relay sends serverTimeUnix already in milliseconds (Date.now() style).
        // Guard for legacy seconds-precision senders too: anything below 1e12
        // is unambiguously seconds-since-epoch (would mean before 2001 in ms).
        let serverMs: number;
        if (msg.serverTimeUnix && msg.serverTimeUnix > 0) {
          serverMs = msg.serverTimeUnix < 1e12
            ? msg.serverTimeUnix * 1000
            : msg.serverTimeUnix;
        } else {
          serverMs = Date.parse(msg.serverTime.replace(' ', 'T') + 'Z');
        }
        setClockOffsetMs(serverMs - Date.now());
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setStatus('reconnecting');
      wsRef.current = null;
      const delay = BACKOFF_STEPS[Math.min(backoffIndexRef.current, BACKOFF_STEPS.length - 1)];
      backoffIndexRef.current = Math.min(backoffIndexRef.current + 1, BACKOFF_STEPS.length - 1);
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };

    ws.onerror = () => {
      // onclose fires after onerror, so reconnect logic lives there
      console.warn('[relay] WebSocket error');
    };
  }, [relayUrl]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      if (wsRef.current) {
        // Prevent onclose from scheduling another reconnect
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, clearReconnectTimer]);

  return { allGames, status, clockOffsetMs };
}
