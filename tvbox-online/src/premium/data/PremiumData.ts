/**
 * PremiumData — the normalised view-model the premium intro renders.
 * Built either from a live web-ds `Race` (buildPremiumData) or from a
 * realistic mock (mockPremiumData) for fast local iteration.
 */
import type { Race, GameKey } from '../../types/websocket';

export interface PremiumRunner {
  trap: number;        // 1-based post position
  name: string;
  strikeRate?: number; // 0..100
  bestLap?: number;
  wins?: number;
  trend?: number;      // negative = improving (lower is better) or vendor sign
  form: number[];      // parsed last5 / resultHistory, oldest→newest
  winOdds?: number;    // decimal-ish odds from odds[trap-1]
}

export interface PremiumData {
  gameKey: GameKey;
  runnerCount: number;          // 6 (dog) | 8 (dog8) | 7 (horsec)
  raceLabel: string;            // e.g. "GREYHOUND 6"
  raceNumber?: number;          // race-of-day number, parsed from the round id
  runners: PremiumRunner[];
  /** exacta[i][j] = odds for trap (i+1) over trap (j+1); NaN on diagonal. */
  exacta: number[][];
  jackpot?: number;
  jackpotHistory: Array<{ name: string; amount: number; date: string }>;
  recentWinners: number[];      // recent winning traps, newest first
  weather?: string;
  temperature?: number;
  wind?: string;
  courseConditions?: string;
}

const GAME_LABEL: Record<GameKey, string> = {
  dog: 'DOG 6',
  dog8: 'DOG 8',
  horsec: 'HORSE 7',
};

function parseForm(c: { last5?: string; resultHistory?: string }): number[] {
  const raw = c.last5 ?? c.resultHistory ?? '';
  return raw
    .split(/[|;,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
}

/**
 * Adapt a live Race into PremiumData.
 * odds layout (our betoffers): [0..N-1] = WIN per trap; [N..] = forecast
 * in-order pairs (i,j) for i≠j, i outer / j inner skipping i.
 */
export function buildPremiumData(
  race: Race,
  gameKey: GameKey,
  jackpotValue?: number,
): PremiumData {
  const keys = Object.keys(race.competitors)
    .map((k) => parseInt(k, 10))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const N = keys.length;

  const runners: PremiumRunner[] = keys.map((trap) => {
    const c = race.competitors[String(trap)];
    return {
      trap,
      name: c?.name ?? `Runner ${trap}`,
      strikeRate: c?.strikeRate,
      bestLap: c?.bestLap,
      wins: c?.numberOfWins,
      trend: c?.trend,
      form: c ? parseForm(c) : [],
      winOdds: race.odds?.[trap - 1],
    };
  });

  // forecast matrix
  const exacta: number[][] = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => NaN),
  );
  let idx = N; // WIN block occupies first N
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      exacta[i][j] = race.odds?.[idx] ?? NaN;
      idx++;
    }
  }

  // race-of-day number: round id is `<betoffer>_<x>_<YYYYMMDD><NNNN>`
  const idTail = race.id?.split('_').pop() ?? '';
  const raceNumber = idTail.length > 8 ? parseInt(idTail.slice(8), 10) : undefined;

  return {
    gameKey,
    runnerCount: N,
    raceLabel: GAME_LABEL[gameKey],
    raceNumber: Number.isFinite(raceNumber) ? raceNumber : undefined,
    runners,
    exacta,
    jackpot: jackpotValue ?? race.jackpotInfo?.bonusValue,
    jackpotHistory:
      race.jackpotInfo?.bonusHistory?.map((b) => ({
        name: b.name,
        amount: b.amount,
        date: b.date,
      })) ?? [],
    recentWinners: [],
    weather: race.weather,
    temperature: race.temperature,
    wind: race.wind,
    courseConditions: race.courseConditions,
  };
}

const MOCK_NAMES = [
  'Swift Comet', 'Golden Arrow', 'Midnight Bolt', 'Silver Streak',
  'Royal Thunder', 'Blazing Star', 'Iron Duke', 'Velvet Shadow',
];

/** Realistic mock for local visual iteration (default 6 runners). */
export function mockPremiumData(n = 6, gameKey: GameKey = 'dog'): PremiumData {
  const runners: PremiumRunner[] = Array.from({ length: n }, (_, k) => {
    const trap = k + 1;
    const seed = (trap * 37) % 100;
    return {
      trap,
      name: MOCK_NAMES[k % MOCK_NAMES.length],
      strikeRate: 28 + (seed % 45),
      bestLap: 28.1 + ((seed % 30) / 10),
      wins: 3 + (seed % 18),
      trend: (seed % 3) - 1,
      form: Array.from({ length: 5 }, (_, i) => 1 + ((seed + i * 13) % n)),
      winOdds: +(1.8 + (seed % 90) / 10).toFixed(1),
    };
  });
  const exacta = runners.map((_, i) =>
    runners.map((_, j) =>
      i === j ? NaN : +(4 + ((i * 7 + j * 11) % 60)).toFixed(0),
    ),
  );
  return {
    gameKey,
    runnerCount: n,
    raceLabel: gameKey === 'dog8' ? 'DOG 8' : 'DOG 6',
    raceNumber: 314,
    runners,
    exacta,
    jackpot: 184250,
    jackpotHistory: [
      { name: 'Player ****91', amount: 12500, date: '2026-05-24' },
      { name: 'Player ****07', amount: 8800, date: '2026-05-23' },
      { name: 'Player ****33', amount: 21400, date: '2026-05-22' },
    ],
    recentWinners: [3, 1, 5, 2, 4],
    weather: 'Fine',
    temperature: 21,
    wind: '5 NE',
    courseConditions: 'Fast',
  };
}
