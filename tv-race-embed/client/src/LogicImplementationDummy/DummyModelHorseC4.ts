import { IHorseDog6C4Model, IRoundHistory } from "client/Logic/LogicDefinitions";

const history: IRoundHistory[] = [
  {
    round: 178,
    roundBonusType: "x3",
    first: {
      driverIndex: 6,
      finishTime: "34:52",
      quote: 6.4,
      firstName: "James Long",
      lastName: ""
    },
    second: {
      driverIndex: 2,
      finishTime: "35:00",
      quote: 133.5,
      firstName: "Jux",
      lastName: ""
    }
  },
  {
    round: 810,
    first: {
      driverIndex: 2,
      finishTime: "31:57",
      quote: 5.1,
      firstName: "Apollo",
      lastName: ""
    },
    second: {
      driverIndex: 1,
      finishTime: "32:15",
      quote: 128.9,
      firstName: "Archie",
      lastName: ""
    }
  },
  {
    round: 809,
    roundBonusType: undefined,
    first: {
      driverIndex: 3,
      finishTime: "30:25",
      quote: 9.2,
      firstName: "Mickey",
      lastName: ""
    },
    second: {
      driverIndex: 4,
      finishTime: "31:47",
      quote: 131.5,
      firstName: "Jux",
      lastName: ""
    }
  },
  {
    round: 808,
    roundBonusType: "x3",
    first: {
      driverIndex: 4,
      finishTime: "33:20",
      quote: 2.1,
      firstName: "Jux",
      lastName: ""
    },
    second: {
      driverIndex: 0,
      finishTime: "33:56",
      quote: 110.5,
      firstName: "James",
      lastName: ""
    }
  },
  {
    round: 807,
    first: {
      driverIndex: 1,
      finishTime: "30:19",
      quote: 7.5,
      firstName: "Archie",
      lastName: ""
    },
    second: {
      driverIndex: 3,
      finishTime: "31:45",
      quote: 140.5,
      firstName: "Gideon",
      lastName: ""
    }
  },
  {
    round: 898,
    roundBonusType: "x2",
    first: {
      driverIndex: 1,
      finishTime: "30:19",
      quote: 7.5,
      firstName: "Archie",
      lastName: ""
    },
    second: {
      driverIndex: 3,
      finishTime: "31:45",
      quote: 140.5,
      firstName: "Gideon",
      lastName: ""
    }
  },
  {
    round: 123,
    first: {
      driverIndex: 1,
      finishTime: "30:19",
      quote: 7.5,
      firstName: "Archie",
      lastName: ""
    },
    second: {
      driverIndex: 3,
      finishTime: "31:45",
      quote: 140.5,
      firstName: "Gideon",
      lastName: ""
    }
  },
  {
    round: 542,
    roundBonusType: "x2",
    first: {
      driverIndex: 1,
      finishTime: "30:19",
      quote: 7.5,
      firstName: "Archie",
      lastName: ""
    },
    second: {
      driverIndex: 3,
      finishTime: "31:45",
      quote: 140.5,
      firstName: "Gideon",
      lastName: ""
    }
  }
];

export const dummyModelHorseC4: IHorseDog6C4Model = {
  prevRoundInfo: {
    sendPlan: "333_101_20190829",
    raceNumber: "0178",
    raceStart: ".0912",
    gameId: 812,
    jackpotValue: 360.2
  },
  roundInfo: {
    sendPlan: "333_101_20190829",
    raceNumber: "0555",
    raceStart: "09182038213.0912",
    gameId: 812,
    jackpotValue: 1799.9
    // oldJackpotValue: 300.9,
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
    first: { driverIndex: 6, time: "6.2", odds: 14.5 },
    second: { driverIndex: 2, time: "24.1", odds: 6.5 },
    roundBonusType: "x3"
  },
  result: {
    first: { driverIndex: 6, time: "6.2", odds: 14.5 },
    second: { driverIndex: 2, time: "24.1", odds: 6.5 },
    roundBonusType: "x3"
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
