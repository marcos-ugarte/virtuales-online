import { IRouletteModel, IRouletteRoundHistory } from "./../Logic/LogicDefinitions";

const history: IRouletteRoundHistory[] = [
  {
    round: 180,
    winnerNumber: 14
  },
  {
    round: 179,
    winnerNumber: 32
  },
  {
    round: 178,
    winnerNumber: 0
  },
  {
    round: 177,
    winnerNumber: 0
  },
  {
    round: 176,
    winnerNumber: 8
  },
  {
    round: 175,
    winnerNumber: 5
  },
  {
    round: 174,
    winnerNumber: 8
  },
  {
    round: 173,
    winnerNumber: 25
  }
];

export const modelRouletteC4: IRouletteModel = {
  lastRoundInfo: {
    winningNumber: 5,
    sendPlan: "333_101_20190829",
    raceNumber: "180",
    raceStart: "09182038213.0912",
    gameId: 812
  },
  roundInfo: {
    sendPlan: "333_101_20190829",
    raceNumber: "181",
    raceStart: "09182038213.0912",
    gameId: 812
  },
  history,
  rouletteStats: {
    allNumbers: [12, 12, 9, 9, 6, 21, 10, 13, 9, 4, 5, 7, 15, 5, 9, 13, 9, 8, 9, 10, 14, 9, 8, 11, 9, 11, 8, 4, 13, 10, 11, 5, 16, 10, 8, 12, 9],
    generalStats: {
      hotNumbers: [2, 11, 14, 21, 26],
      coldNumbers: [1, 12, 15, 22, 27],
      red: 195,
      black: 161,
      areas: [174, 177, 173, 178, 105, 134, 112, 120, 114, 117]
    }
  }
};
