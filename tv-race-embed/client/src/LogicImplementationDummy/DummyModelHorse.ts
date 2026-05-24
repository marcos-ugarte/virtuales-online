import { IDriver, ITrack, IRoundHistory, IJackpotHistory, IRaceInterval, IModel, DriverPattern } from "client/Logic/LogicDefinitions";

const drivers: IDriver[] = [
  {
    firstName: "James VeryLong",
    lastName: "",
    driverInfos: [
      { key: "WEIGHT:", value: "70lb" },
      { key: "RUNS:", value: "023" },
      { key: "WINS:", value: "006" },
      { key: "TREND:", value: "1" }
    ],
    driverRaceInfos: [
      { key: "AGE:", value: "4" },
      { key: "SEX:", value: "female" },
      { key: "WEIGHT:", value: "57,5" }
    ],
    color: 0xffc6073b,
    driverBarText: "DOG NO.1 JAMES WON 5 IN THE LAST 20 RACES",
    driverPattern: DriverPattern.COLOR_ONLY
  },
  {
    firstName: "Archie",
    lastName: "",
    driverInfos: [
      { key: "WEIGHT:", value: "65lb" },
      { key: "RUNS:", value: "018" },
      { key: "WINS:", value: "002" },
      { key: "TREND:", value: "3" }
    ],
    driverRaceInfos: [
      { key: "AGE:", value: "4" },
      { key: "SEX:", value: "male" },
      { key: "WEIGHT:", value: "57,5" }
    ],
    color: 0xff1d4dd3,
    driverBarText: "DOG NO.2 ARCHIE WON 3 IN THE LAST 12 RACES",
    driverPattern: DriverPattern.COLOR_ONLY
  },
  {
    firstName: "Apollo",
    lastName: "",
    driverInfos: [
      { key: "WEIGHT:", value: "68lb" },
      { key: "RUNS:", value: "020" },
      { key: "WINS:", value: "008" },
      { key: "TREND:", value: "5" }
    ],
    driverRaceInfos: [
      { key: "AGE:", value: "4" },
      { key: "SEX:", value: "gelding" },
      { key: "WEIGHT:", value: "57,5" }
    ],
    color: 0xfffef5f6,
    driverBarText: "DOG NO.3 APOLLO WON 1 IN THE LAST 7 RACES",
    driverPattern: DriverPattern.COLOR_ONLY
  },
  {
    firstName: "Gideon",
    lastName: "",
    driverInfos: [
      { key: "WEIGHT:", value: "70lb" },
      { key: "RUNS:", value: "009" },
      { key: "WINS:", value: "005" },
      { key: "TREND:", value: "1" }
    ],
    driverRaceInfos: [
      { key: "AGE:", value: "4" },
      { key: "SEX:", value: "male" },
      { key: "WEIGHT:", value: "57,5" }
    ],
    color: 0xff080503,
    driverBarText: "DOG NO.4 GIDEO WON 6 IN THE LAST 13 RACES",
    driverPattern: DriverPattern.COLOR_ONLY
  },
  {
    firstName: "Jux",
    lastName: "",
    driverInfos: [
      { key: "WEIGHT:", value: "70lb" },
      { key: "RUNS:", value: "023" },
      { key: "WINS:", value: "006" },
      { key: "TREND:", value: "3" }
    ],
    driverRaceInfos: [
      { key: "AGE:", value: "4" },
      { key: "SEX:", value: "male" },
      { key: "WEIGHT:", value: "57,5" }
    ],
    color: 0xfff19c21,
    driverBarText: "DOG NO.5 JUX VON 2 IN THE LAST 10 RACES",
    driverPattern: DriverPattern.COLOR_ONLY
  },
  {
    firstName: "Mickey Long",
    lastName: "",
    driverInfos: [
      { key: "WEIGHT:", value: "68lb" },
      { key: "RUNS:", value: "003" },
      { key: "WINS:", value: "002" },
      { key: "TREND:", value: "1" }
    ],
    driverRaceInfos: [
      { key: "AGE:", value: "4" },
      { key: "SEX:", value: "male" },
      { key: "WEIGHT:", value: "57,5" }
    ],
    color: 0xffe9e6e5,
    driverBarText: "DOG NO.6 MICKEY WON 2 IN THE LAST 5 RACES",
    driverPattern: DriverPattern.BLACK_WHITE_6
  },
  {
    firstName: "JASON",
    lastName: "",
    driverInfos: [
      { key: "WEIGHT:", value: "68lb" },
      { key: "RUNS:", value: "003" },
      { key: "WINS:", value: "00" },
      { key: "TREND:", value: "4" }
    ],
    driverRaceInfos: [
      { key: "AGE:", value: "4" },
      { key: "SEX:", value: "gelding" },
      { key: "WEIGHT:", value: "57,5" }
    ],
    color: 0xffe9e6e5,
    driverBarText: "DOG NO.7 JASON WON 2 IN THE LAST 5 RACES",
    driverPattern: DriverPattern.BLACK_WHITE_6
  }
];

const track: ITrack = {
  name: "KINCSEMPARK RACECOURSE",
  country: "HUN",
  facts: [
    { key: "LAP LENGTH:", value: "1600m" }, // fade in 62.14, fade out 64.38
    { key: "NUMBER OF LAPS:", value: "1.2 (480m)" }, // fade in 64.78, fade out 67.04
    { key: "AVG TIME:", value: "30 secs" }, // fade in 67.61, fade out 70.58
    {
      key: "COURSE CONDITIONS:",
      value: "FAST" // fade in 70.81, fade out 70.58
    }
  ],
  lapMapFacts: ["WEATHER: <b>FINE</b>", "TEMP: <b>14°C</b>", "HUMIDITY: <b>67%</b>", "WIND: <b>6 NWN</b>"],
  items: [
    {
      line1: "FINISH"
    },
    {
      line1: "START BOX Long",
      line2: "01"
    },
    {
      line1: "START BOX",
      line2: "02"
    },
    {
      line1: "START BOX",
      line2: "03"
    },
    {
      line1: "START BOX",
      line2: "04"
    }
  ],
  segments: [
    {
      line1: "350m",
      lapNumber: ""
    },
    {
      line1: "650m",
      lapNumber: ""
    },
    {
      line1: "1000m",
      lapNumber: ""
    },
    {
      line1: "1300m",
      lapNumber: ""
    }
    // {
    //   line1: "480m",
    //   lapNumber: "1.2"
    // }
  ]
};

const history: IRoundHistory[] = [
  {
    round: 811,
    roundBonusType: "x2",
    first: {
      driverIndex: 0,
      finishTime: "34:52",
      quote: 6.4,
      firstName: "James Long",
      lastName: ""
    },
    second: {
      driverIndex: 4,
      finishTime: "35:00",
      quote: 133.5,
      firstName: "Jux",
      lastName: ""
    }
  },
  {
    round: 810,
    roundBonusType: "x2",
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
  // { round: 806, roundBonusType: "x2",
  //   first: { driverIndex: 0, finishTime: "34:52", quote: 6.4, firstName: "James", lastName: ""},
  //   second: { driverIndex: 4, finishTime: "35:00", quote: 133.5, firstName: "Jux",  lastName: ""}
  // },
  // { round: 805, roundBonusType: "x3",
  //   first: { driverIndex: 2, finishTime: "31:57", quote: 5.1, firstName: "Apollo", lastName: ""},
  //   second: { driverIndex: 1, finishTime: "32:15", quote: 128.9, firstName: "Archie",  lastName: ""}
  // },
];

const bonusHistory: IJackpotHistory[] = [
  {
    round: 714,
    id: "9FWHJIO0023Long",
    date: "04.06.2019",
    time: "11:39:07",
    name: "BETTING SHOP 1",
    amount: "107,03€",
    amountUnformated: 107.03
  },
  {
    round: 638,
    id: "9FWHJIO0024",
    date: "04.06.2019",
    time: "00:47:45",
    name: "BETTING SHOP 2",
    amount: "104,56€",
    amountUnformated: 104.56
  },
  {
    round: 553,
    id: "9FWHJIO0025",
    date: "03.06.2019",
    time: "00:46:12",
    name: "SHORT",
    amount: "89,00€",
    amountUnformated: 89.0
  },
  {
    round: 492,
    id: "9FWHJIO0026",
    date: "03.06.2019",
    time: "00:49:25",
    name: "SOME EVEN LONGER TEXT",
    amount: "95,67€",
    amountUnformated: 95.67
  }
];

const raceIntervals: IRaceInterval[] = [
  { title: "START POSITIONS", startTime: 0.3, duration: 2.05 },
  {
    title: "INTERVAL 1",
    startTime: 28.3,
    duration: 7.2,
    drivers: [
      { driverIndex: 2, time: "00:14.21" },
      { driverIndex: 0, time: "00:14.38" }
    ]
  },
  {
    title: "INTERVAL 2",
    startTime: 61.6,
    duration: 7.2,
    drivers: [
      { driverIndex: 3, time: "01:04.21" },
      { driverIndex: 1, time: "01:06.23" }
    ]
  }
];

export const dummyModelHorse: IModel = {
  roundInfo: {
    sendPlan: "333_101_20190829",
    raceNumber: "120398123",
    raceStart: "09182038213.0912",
    gameId: 812,
    oldJackpotValue: 2000,
    jackpotValue: 3272.06
  },
  drivers,
  odds: [
    3.0, 11.3, 18.9, 17.6, 22.9, 10.5, 22.9, 13.0, 4.8, 35.2, 32.7, 42.5, 19.5, 42.5, 24.0, 38.5, 8.0, 60.2, 78.1, 35.9, 35.9, 22.1, 35.4, 59.7, 7.4, 72.0, 33.1, 33.1, 29.5, 47.4, 79.8, 74.2, 9.7,
    44.2, 44.2, 12.0, 19.2, 32.3, 30.0, 39.0, 4.4, 4.4, 12.0, 19.2, 32.3, 30.0, 39.0, 4.4, 4.4
  ],
  track,
  history,
  jackpotHistory: bonusHistory,
  result: {
    first: { driverIndex: 3, time: "01:04.66" },
    second: { driverIndex: 1, time: "01:05.06" },
    clockEndTime: 35,
    jackpotWonText: "BONUS WIN IS <b>107,03€</b> WON AT <b>TOWCESTER</b> BY <b>TICKET NO. 9FWHJIO002</b>",
    roundBonusType: "x3",
    overlayStart: "00:00:01.28",
    overlayEnd: "00:00:13.36",
    resultOffsetTime: 81.1
  },
  raceIntervals,
  colors: {
    white: 0xffffffff,
    green: 0xff148912,
    red: 0xffd6301d,
    panelColor: 0xff242a2f,
    panelColorBottom: 0xff22282c,
    panelColorBottomNumber: 0xff070809
  }
};
