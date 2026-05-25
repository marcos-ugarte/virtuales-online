/**
 * WebSocket types for /web-ds (mobile-vendor wire).
 *
 * Names and shapes mirror the captured vendor wire 1:1 so that frames
 * deserialise into these types with minimal transformation. The lobby
 * canonical game keys are the vendor's eventType strings:
 *
 *   dog     (betoffer 141)  → greyhound 6
 *   dog8    (betoffer 541)  → greyhound 8
 *   horsec  (betoffer 241)  → horse classic 7
 *
 * The vendor wire also publishes `horse` (251), `dog63` (741), `kart` (441),
 * `wgp` (600). They are out of lobby scope and ignored by the parser.
 */

export type GameKey = 'dog' | 'dog8' | 'horsec';

export const GAME_KEYS: readonly GameKey[] = ['dog', 'dog8', 'horsec'] as const;

/**
 * Competitor — fields the vendor emits for a single runner.
 * Optional fields appear only for some event types (e.g. age/sex on horsec).
 */
export interface Competitor {
  name: string;
  weight?: number;
  bestLap?: number;
  performance?: number;        // 0..1
  strikeRate?: number;         // 0..100
  numberOfRaces?: number;
  numberOfWins?: number;
  numberOfSecond?: number;
  racesForStatistic?: number;
  last5?: string;              // e.g. "5|3|4|2|8"
  resultHistory?: string;      // e.g. "5;3;4;2;8" (semicolon variant)
  nbr1?: number;
  nbr2?: number;
  nbr3?: number;
  trend?: number;
  // horsec only:
  age?: number;
  sex?: string;
}

/**
 * VideoName — pre-signed CloudFront URLs for the recorded race video.
 * Both fields rotate per session; the asset path before `?` is stable.
 */
export interface VideoName {
  mp4?: string;
  jpg?: string;
}

/**
 * JackpotInfo — per-race bonus accrual snapshot.
 * Only emitted for dog/dog8/horsec (null for kart/wgp/dog63).
 */
export interface JackpotInfo {
  bonusValue?: number;
  oldBonusValue?: number;
  bonusHistory?: Array<{
    round: string;
    id: string;
    date: string;
    time: string;
    name: string;
    amount: number;
  }>;
}

/**
 * Race — one entry from gameRound.gamepool[]. Field names are the
 * vendor's verbatim, except where TypeScript convention demands camelCase
 * (vendor already uses camelCase everywhere we consume).
 */
export interface Race {
  /** Unique round identifier, e.g. "141_101_202605160056". Wire field is `id`. */
  id: string;
  /** Vendor betoffer id (141/541/251/241). */
  idBetoffer: number;
  /** Vendor eventType string; one of GAME_KEYS (or out-of-scope). */
  eventType: GameKey;
  /** UTC string "YYYY-MM-DD HH:MM:SS" — when the video starts. */
  videoStartDt: string;
  /** UTC string "YYYY-MM-DD HH:MM:SS" — when the video ends. */
  videoEndDt: string;
  /** Round period in seconds (e.g. 240 for dog6/dog8, 320 for horsec). */
  roundInterval: number;
  /** Bonus multiplier for this round (1/2/3). 1 = no bonus. */
  bonus?: number;
  /** Runners keyed by post position (1-based string). */
  competitors: Record<string, Competitor>;
  /**
   * Flat odds array — actually a matrix indexed by bettype.
   * For dog6 it's 36 entries (6×6), dog8 64 (8×8), horsec 49 (7×7).
   * Layout per bettype is defined by the betoffer's bettypes[].oddsIndexStart.
   * Our 3 in-scope betoffers (141 dog, 541 dog8, 241 horsec) expose only:
   *   - bettypeId 1 "Winner"           — first N entries (one per dorsal)
   *   - bettypeId 2 "Forecast in order" — N²-N entries: (i,j) pairs for i≠j
   * PLACE/SHOW are NOT in the vendor wire for these games (they exist on
   * dog63/741 but not on ours). Do not synthesise them.
   */
  odds: number[];
  weather?: string;            // "sunny", "fine", "cloudy", "fog", ...
  temperature?: number;        // °C
  humidity?: number;           // %
  wind?: string;               // e.g. "5 NE"
  courseConditions?: string;   // "fast", "soft", ...
  videoname?: VideoName;
  jackpotInfo?: JackpotInfo | null;
  /** Finish data — only set after gameResult arrives. */
  finish?: Record<string, { competitorIndex: number; time?: number }>;
  /**
   * Mid-race split data (vendor `interval` block). Keyed by split number
   * ("1","2"), then rank ("1","2") → { competitorIndex, time }. Arrives in the
   * raw gamepool payload and rides through the `...payload` spread in
   * useRaceFeed; drives the ported RaceIntervalsDog leaders box.
   */
  interval?: Record<string, Record<string, { competitorIndex: number; time: number }>>;
}

/**
 * AllGames — one current race per lobby game key.
 * Null while waiting for data.
 */
export type AllGames = Record<GameKey, Race | null>;

/** Connection status surfaced by useRaceFeed. */
export type FeedStatus = 'connecting' | 'connected' | 'reconnecting' | 'error';
