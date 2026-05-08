/**
 * WebSocket relay message types — simplified for web-lobby (no betting).
 * Adapted from virteon-platform/apps/pos-go/src/types/websocket.ts
 */

export type GameKey = 'dos' | 'doe' | 'hoc';

export interface Competitor {
  name: string;
  weight?: number;
  numberOfRaces?: number;
  numberOfWins?: number;
  numberOfSecond?: number;
  strikeRate?: number;
  bestLap?: number;
  performance?: number;     // 0..1
  resultHistory?: string;
  last5?: string;            // e.g. '5|3|4|2|8'
  nbr1?: number;
  nbr2?: number;
  nbr3?: number;
  trend?: number;
}

export interface RaceData {
  id: string;
  raceId?: string;
  raceNumber?: string;
  game: GameKey;
  videoStartDt: string;     // 'YYYY-MM-DD HH:mm:ss' (UTC)
  videoEndDt: string;
  roundInterval: number;     // 240
  competitors: Record<string, Competitor>;
  odds: number[];
  bonus?: number;
  eventType?: string;
}

export interface RaceFinishEntry {
  position: number;
  competitorIndex: number;
  time?: number;
}

export interface RaceResult {
  type: 'raceResult';
  game: GameKey;
  raceId: string;
  finish: Record<string, RaceFinishEntry> | RaceFinishEntry[];
  bonus?: number;
  eventType?: string;
}

export interface RaceUpdate extends RaceData {
  type: 'raceUpdate';
}

export interface GamepoolUpdate {
  type: 'gamepoolUpdate';
  gamepool: Partial<Record<GameKey, RaceData[]>>;
  sourceMode: 'mock' | 'live';
}

export interface TimeSync {
  type: 'timeSync';
  serverTime: string;
  serverTimeUnix: number;
}

export type RelayMessage = GamepoolUpdate | RaceUpdate | RaceResult | TimeSync;
