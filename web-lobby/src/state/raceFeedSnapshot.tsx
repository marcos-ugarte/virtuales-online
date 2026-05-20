/**
 * RaceFeedSnapshotProvider — exposes the current WS race-feed state to any
 * descendant (allGames + recentResults). The provider is updated by the
 * Lobby root using `useRaceFeed`; downstream components that just need to
 * "look up a race by id" subscribe via `useRaceFeedSnapshot`.
 *
 * Why a separate context rather than calling useRaceFeed at consumer level:
 * `useRaceFeed` opens a WebSocket and pings the server periodically. We
 * want exactly ONE such hook live per signed-in session.
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { AllGames, Race } from '../types/websocket';

export interface RaceFeedSnapshot {
  allGames: AllGames;
  recentResults: Race[];
}

const Ctx = createContext<RaceFeedSnapshot | null>(null);

export function RaceFeedSnapshotProvider({
  allGames,
  recentResults,
  children,
}: {
  allGames: AllGames;
  recentResults: Race[];
  children: ReactNode;
}) {
  const value = useMemo<RaceFeedSnapshot>(
    () => ({ allGames, recentResults }),
    [allGames, recentResults],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Returns the current snapshot, or null when no provider is mounted (e.g.
 *  during the login screen). */
export function useRaceFeedSnapshot(): RaceFeedSnapshot | null {
  return useContext(Ctx);
}
