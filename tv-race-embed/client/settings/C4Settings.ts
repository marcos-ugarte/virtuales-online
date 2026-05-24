import { IAnimInterval } from "client/Logic/LogicDefinitions";
import { GameType } from "common/Definitions";

export const RouletteNumberStatsTimings = {
  60: [
    { startTime: 7, duration: 8 },
    { startTime: 15, duration: 8 }
  ],
  120: [
    { startTime: 15, duration: 20 },
    { startTime: 35, duration: 20 }
  ],
  240: [
    { startTime: 15, duration: 63 },
    { startTime: 78, duration: 63.5 }
  ]
};

export const RouletteBoardTimings = {
  getAnim(gameLength: number, introLength: number) {
    if (gameLength === 120) {
      return [{ startTime: 55, duration: introLength - 55 }];
    } else {
      return [{ startTime: 141.5, duration: introLength - 142 }];
    }
  }
};

export const HistoryBarTimings = {
  getAnim(gameLength: number, introLength: number, gameType: GameType): IAnimInterval[] {
    if (gameType === "roulette") {
      return getRouletteHistoryTimings(gameLength, introLength);
    } else if (gameType === "horse" || gameType === "dog6") {
      return [{ startTime: 0, duration: introLength - 5 }];
    }
    return [{ startTime: 0, duration: introLength - 5 }];
  }
};

const getRouletteHistoryTimings = (gameLength: number, introLength: number) => {
  if (gameLength === 120) {
    return [{ startTime: 0.01, duration: introLength - 0.01 }];
  } else {
    return [{ startTime: 0.01, duration: introLength - 0.01 }];
  }
};

export const RaceInfoTimings = {
  getAnim(introLength: number, gameType: GameType): IAnimInterval[] {
    const prevGameLength = gameType === "roulette" ? (introLength <= 60 ? 7 : 14.5) : 15;
    return [
      { startTime: 0, duration: prevGameLength },
      { startTime: prevGameLength, duration: introLength - prevGameLength - 0.1 }
    ];
  }
};
