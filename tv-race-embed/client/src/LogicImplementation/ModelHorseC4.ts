import { IHorseDog6C4Model, IRoundHistory } from "client/Logic/LogicDefinitions";

const history: IRoundHistory[] = [
  {
    round: 178,
    first: {
      driverIndex: 6,
      finishTime: "",
      quote: 6.4,
      firstName: "",
      lastName: ""
    },
    second: {
      driverIndex: 2,
      finishTime: "",
      quote: 7.2,
      firstName: "",
      lastName: ""
    }
  },
  {
    round: 810,
    first: {
      driverIndex: 2,
      finishTime: "",
      quote: 6.4,
      firstName: "",
      lastName: ""
    },
    second: {
      driverIndex: 1,
      finishTime: "",
      quote: 7.2,
      firstName: "",
      lastName: ""
    }
  },
  {
    round: 809,
    roundBonusType: undefined,
    first: {
      driverIndex: 3,
      finishTime: "",
      quote: 6.4,
      firstName: "",
      lastName: ""
    },
    second: {
      driverIndex: 4,
      finishTime: "",
      quote: 7.2,
      firstName: "",
      lastName: ""
    }
  },
  {
    round: 808,
    roundBonusType: "x3",
    first: {
      driverIndex: 4,
      finishTime: "",
      quote: 6.4,
      firstName: "",
      lastName: ""
    },
    second: {
      driverIndex: 0,
      finishTime: "",
      quote: 7.2,
      firstName: "",
      lastName: ""
    }
  },
  {
    round: 807,
    first: {
      driverIndex: 1,
      finishTime: "",
      quote: 6.4,
      firstName: "",
      lastName: ""
    },
    second: {
      driverIndex: 3,
      finishTime: "",
      quote: 7.2,
      firstName: "",
      lastName: ""
    }
  },
  {
    round: 898,
    roundBonusType: "x2",
    first: {
      driverIndex: 1,
      finishTime: "",
      quote: 6.4,
      firstName: "",
      lastName: ""
    },
    second: {
      driverIndex: 3,
      finishTime: "",
      quote: 7.2,
      firstName: "",
      lastName: ""
    }
  },
  {
    round: 123,
    first: {
      driverIndex: 1,
      finishTime: "",
      quote: 6.4,
      firstName: "",
      lastName: ""
    },
    second: {
      driverIndex: 3,
      finishTime: "",
      quote: 7.2,
      firstName: "",
      lastName: ""
    }
  },
  {
    round: 542,
    roundBonusType: "x2",
    first: {
      driverIndex: 1,
      finishTime: "",
      quote: 6.4,
      firstName: "",
      lastName: ""
    },
    second: {
      driverIndex: 3,
      finishTime: "",
      quote: 7.2,
      firstName: "",
      lastName: ""
    }
  }
];

export const ModelHorseC4: IHorseDog6C4Model = {
  prevRoundInfo: {
    sendPlan: "333_101_20190829",
    raceNumber: "0178",
    raceStart: ".0912",
    gameId: 812
  },
  roundInfo: {
    sendPlan: "333_101_20190829",
    raceNumber: "0555",
    raceStart: "09182038213.0912",
    gameId: 812
  },
  odds: [
    3.0, 11.3, 18.9, 17.6, 22.9, 10.5, 22.9, 13.0, 4.8, 35.2, 32.7, 42.5, 19.5, 42.5, 24.0, 38.5, 8.0, 60.2, 78.1, 35.9, 35.9, 22.1, 35.4, 59.7, 7.4, 72.0, 33.1, 33.1, 29.5, 47.4, 79.8, 74.2, 9.7,
    44.2, 44.2, 12.0, 19.2, 32.3, 30.0, 39.0, 4.4, 4.4, 12.0, 19.2, 32.3, 30.0, 39.0, 4.4, 4.4
  ],
  history,
  bonus: {
    value: 343.7,
    infoText1: "Paskutinis BONUS WIN: 1.79 | 21.11.2022 20:36:49",
    infoText2: "Paskutinis BONUS WIN ne:",
    infoText3: "Laimėjęs bilietas: 27c40aea9c2a3678",
    infoText4: "Smagu su RacingHorses",
    infoText5: "Darbartinis žaidimo ID 241_102_202212130178"
  },
  oldResult: {
    first: { driverIndex: 6, time: "12.9" },
    second: { driverIndex: 2, time: "113.4" }
  },
  result: {
    first: { driverIndex: 6, time: "12.9" },
    second: { driverIndex: 2, time: "113.4" }
  },
  colors: {
    white: 0xffffffff,
    green: 0x24b13d,
    red: 0xd1302c,
    panelColor: 0xff242a2f,
    panelColorBottom: 0x5a5a5a,
    panelColorBottomNumber: 0xde2e1a
  }
};
