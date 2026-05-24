import {
  IDriver,
  ITrack,
  IRoundHistory,
  IJackpotHistory,
  IRaceInterval,
  IModel,
  DriverPattern,
  IDog63RoundHistory,
  IDog63Suprimi,
  IDog63Quotes,
  IDog633rd,
  IDog63SuprimiEntry
} from "client/Logic/LogicDefinitions";

const drivers: IDriver[] = [
  {
    firstName: "INGE",
    lastName: "",
    driverInfos: [
      { key: "WEIGHT:", value: "70lb" },
      { key: "RUNS:", value: "023" },
      { key: "WINS:", value: "006" },
      { key: "STRIKE RATE:", value: "1" }
    ],
    color: 0xffc6073b,
    driverBarText: "DOG NO.1 JAMES WON 5 IN THE LAST 20 RACES",
    driverPattern: DriverPattern.COLOR_ONLY
  },
  {
    firstName: "FLUFFY",
    lastName: "",
    driverInfos: [
      { key: "WEIGHT:", value: "65lb" },
      { key: "RUNS:", value: "018" },
      { key: "WINS:", value: "002" },
      { key: "STRIKE RATE:", value: "13" }
    ],
    color: 0xff1d4dd3,
    driverBarText: "DOG NO.2 ARCHIE WON 3 IN THE LAST 12 RACES",
    driverPattern: DriverPattern.COLOR_ONLY
  },
  {
    firstName: "OSCAR",
    lastName: "",
    driverInfos: [
      { key: "WEIGHT:", value: "68lb" },
      { key: "RUNS:", value: "020" },
      { key: "WINS:", value: "008" },
      { key: "STRIKE RATE:", value: "18,41" }
    ],
    color: 0xfffef5f6,
    driverBarText: "DOG NO.3 APOLLO WON 1 IN THE LAST 7 RACES",
    driverPattern: DriverPattern.COLOR_ONLY
  },
  {
    firstName: "BOBBI",
    lastName: "",
    driverInfos: [
      { key: "WEIGHT:", value: "70lb" },
      { key: "RUNS:", value: "009" },
      { key: "WINS:", value: "005" },
      { key: "STRIKE RATE:", value: "18,01" }
    ],
    color: 0xff080503,
    driverBarText: "DOG NO.4 GIDEO WON 6 IN THE LAST 13 RACES",
    driverPattern: DriverPattern.COLOR_ONLY
  },
  {
    firstName: "BETTANY",
    lastName: "",
    driverInfos: [
      { key: "WEIGHT:", value: "70lb" },
      { key: "RUNS:", value: "023" },
      { key: "WINS:", value: "006" },
      { key: "STRIKE RATE:", value: "17,18" }
    ],
    color: 0xfff19c21,
    driverBarText: "DOG NO.5 JUX VON 2 IN THE LAST 10 RACES",
    driverPattern: DriverPattern.COLOR_ONLY
  },
  {
    firstName: "NISSE",
    lastName: "",
    driverInfos: [
      { key: "WEIGHT:", value: "68lb" },
      { key: "RUNS:", value: "003" },
      { key: "WINS:", value: "002" },
      { key: "STRIKE RATE:", value: "10,21" }
    ],
    color: 0xffe9e6e5,
    driverBarText: "DOG NO.6 MICKEY WON 2 IN THE LAST 5 RACES",
    driverPattern: DriverPattern.BLACK_WHITE_6
  }
];

const track: ITrack = {
  name: "TOWCESTER RACECOURSE Long",
  country: "UK",
  facts: [
    { key: "LAP LENGTH:", value: "400m" }, // fade in 62.14, fade out 64.38
    { key: "NUMBER OF LAPS:", value: "1.2 (480m)" }, // fade in 64.78, fade out 67.04
    { key: "AVG TIME:", value: "30 secs" }, // fade in 67.61, fade out 70.58
    {
      key: "COURSE CONDITIONS:",
      value: "30 secs Long" // fade in 70.81, fade out 70.58
    }
  ],
  lapMapFacts: ["WEATHER: <b>CLOUDY</b>", "TEMP: <b>18°C</b>", "HUMIDITY: <b>72%</b>", "WIND: <b>3 NWN</b>"],
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
      line1: "100m",
      lapNumber: ""
    },
    {
      line1: "200m",
      lapNumber: ""
    },
    {
      line1: "300m",
      lapNumber: ""
    },
    {
      line1: "400m",
      lapNumber: "1"
    }
  ]
};

const quotesSide: IDog63SuprimiEntry[][] = [
  [
    { drivers: [4, 2, 5], quote: 37.5, betCodeId: 6 },
    { drivers: [4, 2, 3], quote: 48.0, betCodeId: 6 },
    { drivers: [1, 0, 3], quote: 321.8, betCodeId: 6 },
    { drivers: [1, 0, 5], quote: 251.4, betCodeId: 6 }
  ],
  [
    { drivers: [4, 5, 2], quote: 37.6, betCodeId: 6 },
    { drivers: [4, 5, 3], quote: 48.8, betCodeId: 6 },
    { drivers: [1, 3, 0], quote: 309.7, betCodeId: 6 },
    { drivers: [1, 0, 2], quote: 248.1, betCodeId: 6 }
  ],
  [
    { drivers: [2, 4, 5], quote: 38.3, betCodeId: 6 },
    { drivers: [2, 4, 3], quote: 49.0, betCodeId: 6 },
    { drivers: [0, 1, 3], quote: 306.5, betCodeId: 6 },
    { drivers: [0, 1, 5], quote: 239.4, betCodeId: 6 }
  ],
  [
    { drivers: [5, 4, 2], quote: 38.6, betCodeId: 6 },
    { drivers: [5, 4, 3], quote: 50.0, betCodeId: 6 },
    { drivers: [3, 1, 0], quote: 285.0, betCodeId: 6 },
    { drivers: [0, 1, 2], quote: 236.3, betCodeId: 6 }
  ],
  [
    { drivers: [2, 5, 4], quote: 39.5, betCodeId: 6 },
    { drivers: [4, 3, 2], quote: 51.9, betCodeId: 6 },
    { drivers: [0, 3, 1], quote: 278.0, betCodeId: 6 },
    { drivers: [1, 0, 4], quote: 229.7, betCodeId: 6 }
  ],
  [
    { drivers: [5, 2, 4], quote: 39.7, betCodeId: 6 },
    { drivers: [4, 3, 5], quote: 52.6, betCodeId: 6 },
    { drivers: [3, 0, 1], quote: 268.6, betCodeId: 6 },
    { drivers: [1, 5, 0], quote: 227.7, betCodeId: 6 }
  ]
];

const dog63Suprimi: IDog63Suprimi = {
  block1: [
    [
      { drivers: [0, 1], quote: 9.25, betCodeId: 10 },
      { drivers: [1, 2], quote: 5.88, betCodeId: 10 },
      { drivers: [2, 4], quote: 2.41, betCodeId: 10 }
    ],
    [
      { drivers: [0, 2], quote: 3.92, betCodeId: 10 },
      { drivers: [1, 3], quote: 7.54, betCodeId: 10 },
      { drivers: [2, 5], quote: 2.59, betCodeId: 10 }
    ],
    [
      { drivers: [0, 3], quote: 5.01, betCodeId: 10 },
      { drivers: [1, 4], quote: 5.48, betCodeId: 10 },
      { drivers: [3, 4], quote: 3.02, betCodeId: 10 }
    ],
    [
      { drivers: [0, 4], quote: 3.67, betCodeId: 10 },
      { drivers: [1, 5], quote: 5.95, betCodeId: 10 },
      { drivers: [3, 5], quote: 3.26, betCodeId: 10 }
    ],
    [
      { drivers: [0, 5], quote: 3.97, betCodeId: 10 },
      { drivers: [2, 3], quote: 3.23, betCodeId: 10 },
      { drivers: [4, 5], quote: 2.43, betCodeId: 10 }
    ]
  ],
  block2: [
    [
      { drivers: [0, 1], quote: 31.5, betCodeId: 5 },
      { drivers: [1, 2], quote: 18.8, betCodeId: 5 },
      { drivers: [2, 4], quote: 6.67, betCodeId: 5 }
    ],
    [
      { drivers: [0, 2], quote: 12.6, betCodeId: 5 },
      { drivers: [1, 3], quote: 25.2, betCodeId: 5 },
      { drivers: [2, 5], quote: 7.39, betCodeId: 5 }
    ],
    [
      { drivers: [0, 3], quote: 16.2, betCodeId: 5 },
      { drivers: [1, 4], quote: 17.2, betCodeId: 5 },
      { drivers: [3, 4], quote: 8.9, betCodeId: 5 }
    ],
    [
      { drivers: [0, 4], quote: 11.1, betCodeId: 5 },
      { drivers: [1, 5], quote: 19.1, betCodeId: 5 },
      { drivers: [3, 5], quote: 9.86, betCodeId: 5 }
    ],
    [
      { drivers: [0, 5], quote: 12.3, betCodeId: 5 },
      { drivers: [2, 3], quote: 9.72, betCodeId: 5 },
      { drivers: [4, 5], quote: 6.77, betCodeId: 5 }
    ]
  ],
  block3: [
    [
      { drivers: [0, 1, 2], quote: 35.3, betCodeId: 7 },
      { drivers: [0, 2, 4], quote: 11.2, betCodeId: 7 },
      { drivers: [1, 2, 3], quote: 27.6, betCodeId: 7 },
      { drivers: [1, 4, 5], quote: 18.2, betCodeId: 7 }
    ],
    [
      { drivers: [0, 1, 3], quote: 49.0, betCodeId: 7 },
      { drivers: [0, 2, 5], quote: 12.6, betCodeId: 7 },
      { drivers: [1, 2, 4], quote: 17.9, betCodeId: 7 },
      { drivers: [2, 3, 4], quote: 8.76, betCodeId: 7 }
    ],
    [
      { drivers: [0, 1, 4], quote: 31.9, betCodeId: 7 },
      { drivers: [0, 3, 4], quote: 15.6, betCodeId: 7 },
      { drivers: [1, 2, 5], quote: 20.2, betCodeId: 7 },
      { drivers: [2, 3, 5], quote: 9.88, betCodeId: 7 }
    ],
    [
      { drivers: [0, 1, 5], quote: 35.9, betCodeId: 7 },
      { drivers: [0, 3, 5], quote: 17.6, betCodeId: 7 },
      { drivers: [1, 3, 4], quote: 24.9, betCodeId: 7 },
      { drivers: [2, 4, 5], quote: 6.41, betCodeId: 7 }
    ],
    [
      { drivers: [0, 2, 3], quote: 17.3, betCodeId: 7 },
      { drivers: [0, 4, 5], quote: 11.4, betCodeId: 7 },
      { drivers: [1, 3, 5], quote: 28.0, betCodeId: 7 },
      { drivers: [3, 4, 5], quote: 8.91, betCodeId: 7 }
    ]
  ]
};

const quotes: IDog63Quotes = {
  entries: [
    {
      driverIndex: 0,
      quotes: [
        { quote: 6.65, betCodeId: 1 },
        { quote: 6.08, betCodeId: 13 },
        { quote: 5.55, betCodeId: 14 },
        { quote: 3.15, betCodeId: 3 },
        { quote: 2.01, betCodeId: 4 }
      ],
      peso: "23.5",
      ultime5: [3, 2, 5, 2, 4],
      val: 1
    },
    {
      driverIndex: 1,
      quotes: [
        { quote: 9.91, betCodeId: 1 },
        { quote: 8.76, betCodeId: 13 },
        { quote: 1.36, betCodeId: 14 },
        { quote: 4.65, betCodeId: 3 },
        { quote: 2.87, betCodeId: 4 }
      ],
      peso: "26.8",
      ultime5: [5, 6, 5, 4, 5],
      val: 2
    },
    {
      driverIndex: 2,
      quotes: [
        { quote: 4.1, betCodeId: 1 },
        { quote: 9.91, betCodeId: 13 },
        { quote: 4.47, betCodeId: 14 },
        { quote: 2.09, betCodeId: 3 },
        { quote: 1.43, betCodeId: 4 }
      ],
      peso: "29.1",
      ultime5: [2, 1, 2, 3, 3],
      val: 3
    },
    {
      driverIndex: 3,
      quotes: [
        { quote: 5.32, betCodeId: 1 },
        { quote: 5.14, betCodeId: 13 },
        { quote: 4.94, betCodeId: 14 },
        { quote: 2.62, betCodeId: 3 },
        { quote: 1.36, betCodeId: 4 }
      ],
      peso: "28.0",
      ultime5: [3, 4, 2, 5, 2],
      val: 4
    },
    {
      driverIndex: 4,
      quotes: [
        { quote: 3.8, betCodeId: 1 },
        { quote: 4.05, betCodeId: 13 },
        { quote: 4.41, betCodeId: 14 },
        { quote: 1.96, betCodeId: 3 },
        { quote: 1.36, betCodeId: 4 }
      ],
      peso: "25.4",
      ultime5: [2, 1, 2, 1, 3],
      val: 5
    },
    {
      driverIndex: 5,
      quotes: [
        { quote: 4.16, betCodeId: 1 },
        { quote: 4.29, betCodeId: 13 },
        { quote: 4.49, betCodeId: 14 },
        { quote: 2.11, betCodeId: 3 },
        { quote: 1.44, betCodeId: 4 }
      ],
      peso: "22.9",
      ultime5: [3, 3, 2, 2, 2],
      val: 2
    }
  ],
  middleEntries: [
    [
      { quote: 31.54, betCodeId: 12 },
      { quote: 12.15, betCodeId: 12 },
      { quote: 8.72, betCodeId: 12 },
      { quote: 7.72, betCodeId: 12 },
      { quote: 4.13, betCodeId: 12 },
      { quote: 4.94, betCodeId: 12 },
      { quote: 4.03, betCodeId: 12 },
      { quote: 9.86, betCodeId: 12 },
      { quote: 6.77, betCodeId: 12 }
    ],
    [
      { quote: 35.29, betCodeId: 11 },
      { quote: 48.95, betCodeId: 11 },
      { quote: 11.19, betCodeId: 11 },
      { quote: 6.52, betCodeId: 11 },
      { quote: 5.02, betCodeId: 11 },
      { quote: 6.81, betCodeId: 11 },
      { quote: 4.21, betCodeId: 11 },
      { quote: 6.4, betCodeId: 11 },
      { quote: 26.41, betCodeId: 11 },
      { quote: 888.91, betCodeId: 11 }
    ]
  ],
  bottomEntries: [
    { places: [1, 3, 5], quote: 1.52, betCodeId: 9 },
    { places: [2, 4, 6], quote: 1.89, betCodeId: 9 },
    { places: [1, 2, 3], quote: 2.01, betCodeId: 8 },
    { places: [4, 5, 6], quote: 1.45, betCodeId: 8 }
  ]
};

const quotes3rd: IDog633rd = {
  quotesPerColumn: [
    [236.3, 306.5, 218.8, 239.4, 200.2, 107.5, 76.7, 84.0, 278.0, 115.1, 106.5, 116.5, 180.8, 74.8, 97.1, 75.8, 203.6, 84.3, 109.3, 78.0],
    [248.1, 321.8, 229.7, 251.4, 224.0, 182.1, 130.0, 142.3, 309.7, 194.2, 179.8, 196.7, 202.6, 127.0, 164.7, 128.7, 227.7, 142.8, 185.2, 132.2],
    [182.6, 98.1, 70.0, 76.7, 194.6, 158.2, 113.0, 123.6, 93.7, 141.9, 54.4, 59.5, 60.2, 91.2, 49.0, 38.3, 68.1, 103.1, 55.4, 39.5],
    [268.6, 111.1, 102.9, 112.6, 285.0, 178.7, 165.4, 181.0, 99.2, 150.3, 57.6, 63.0, 89.5, 135.6, 56.1, 56.8, 100.9, 152.9, 63.3, 58.6],
    [161.5, 66.9, 86.7, 67.7, 172.4, 108.1, 140.2, 109.5, 59.0, 89.4, 48.0, 37.5, 82.8, 125.4, 51.9, 52.6, 60.0, 90.9, 37.6, 48.8],
    [186.4, 77.1, 100.1, 71.4, 198.5, 124.5, 161.4, 115.2, 68.3, 103.6, 55.6, 39.7, 95.6, 144.8, 60.0, 55.5, 61.5, 93.2, 38.6, 50.0]
  ]
};

const dog63History: IDog63RoundHistory[] = [
  {
    round: 5,
    roundBonusType: "x2",
    drivers: [
      { driverIndex: 0, quote: 5.07, firstName: "", lastName: "", finishTime: "", betCodeId: 1 },
      { driverIndex: 2, quote: 5.32, firstName: "", lastName: "", finishTime: "", betCodeId: 13 },
      { driverIndex: 4, quote: 4.62, firstName: "", lastName: "", finishTime: "", betCodeId: 14 }
    ],
    p2p3: [
      { name: "SHADOW", quoteP2: { quote: 2.53, betCodeId: 3 }, quoteP3: { quote: 1.68, betCodeId: 4 } },
      { name: "MICKEY", quoteP2: { quote: 2.7, betCodeId: 3 }, quoteP3: { quote: 1.78, betCodeId: 4 } },
      { name: "GÄNSEBLÜM.", quoteP3: { quote: 1.45, betCodeId: 4 } }
    ],
    accoppiata: {
      nioio: { nio: { quote: 12.7, betCodeId: 5 }, io: { quote: 25.2, betCodeId: 2 } },
      entries: [
        { firstDriverIndex: 2, secondDriverIndex: 0, quote: 2.34, betCodeId: 10 },
        { firstDriverIndex: 4, secondDriverIndex: 0, quote: 2.34, betCodeId: 10 },
        { firstDriverIndex: 4, secondDriverIndex: 1, quote: 2.34, betCodeId: 10 }
      ]
    },
    trio: {
      nio: { quote: 13.3, betCodeId: 7 },
      io: { quote: 84.2, betCodeId: 6 }
    },
    disparyText: "DISPARI",
    disparyQuote: { quote: 1.77, betCodeId: 9 },
    bassoText: "BASSO",
    bassoQuote: { quote: 1.73, betCodeId: 8 },
    somma2Number: 4,
    somma2Quote: { quote: 12.7, betCodeId: 12 },
    somma3Number: 9,
    somma3Quote: { quote: 5.06, betCodeId: 11 }
  },
  {
    round: 4,
    roundBonusType: "x3",
    drivers: [
      { driverIndex: 4, quote: 4.58, firstName: "", lastName: "", finishTime: "", betCodeId: 1 },
      { driverIndex: 1, quote: 6.21, firstName: "", lastName: "", finishTime: "", betCodeId: 13 },
      { driverIndex: 0, quote: 4.64, firstName: "", lastName: "", finishTime: "", betCodeId: 14 }
    ],
    p2p3: [
      { name: "SHADOW", quoteP2: { quote: 2.53, betCodeId: 3 }, quoteP3: { quote: 1.68, betCodeId: 4 } },
      { name: "MICKEY", quoteP2: { quote: 2.7, betCodeId: 3 }, quoteP3: { quote: 1.78, betCodeId: 4 } },
      { name: "GÄNSEBLÜM.", quoteP3: { quote: 1.45, betCodeId: 4 } }
    ],
    accoppiata: {
      nioio: { nio: { quote: 13.9, betCodeId: 5 }, io: { quote: 26.9, betCodeId: 2 } },
      entries: [
        { firstDriverIndex: 4, secondDriverIndex: 1, quote: 2.37, betCodeId: 10 },
        { firstDriverIndex: 4, secondDriverIndex: 0, quote: 2.37, betCodeId: 10 },
        { firstDriverIndex: 1, secondDriverIndex: 0, quote: 2.37, betCodeId: 10 }
      ]
    },
    trio: {
      nio: { quote: 15.1, betCodeId: 7 },
      io: { quote: 93.2, betCodeId: 6 }
    },
    disparyText: "DISPARI",
    disparyQuote: { quote: 1.98, betCodeId: 9 },
    bassoText: "BASSO",
    bassoQuote: { quote: 1.63, betCodeId: 8 },
    somma2Number: 7,
    somma2Quote: { quote: 3.92, betCodeId: 12 },
    somma3Number: 8,
    somma3Quote: { quote: 5.98, betCodeId: 11 }
  },
  {
    round: 3,
    roundBonusType: undefined,
    drivers: [
      { driverIndex: 1, quote: 4.58, firstName: "", lastName: "", finishTime: "", betCodeId: 1 },
      { driverIndex: 3, quote: 6.21, firstName: "", lastName: "", finishTime: "", betCodeId: 13 },
      { driverIndex: 5, quote: 4.64, firstName: "", lastName: "", finishTime: "", betCodeId: 14 }
    ],
    p2p3: [
      { name: "SHADOW", quoteP2: { quote: 2.53, betCodeId: 3 }, quoteP3: { quote: 1.68, betCodeId: 4 } },
      { name: "MICKEY", quoteP2: { quote: 2.7, betCodeId: 3 }, quoteP3: { quote: 1.78, betCodeId: 4 } },
      { name: "GÄNSEBLÜM.", quoteP3: { quote: 1.45, betCodeId: 4 } }
    ],
    accoppiata: {
      nioio: { nio: { quote: 13.2, betCodeId: 5 }, io: { quote: 28.3, betCodeId: 2 } },
      entries: [
        { firstDriverIndex: 5, secondDriverIndex: 3, quote: 2.34, betCodeId: 10 },
        { firstDriverIndex: 5, secondDriverIndex: 1, quote: 2.34, betCodeId: 10 },
        { firstDriverIndex: 3, secondDriverIndex: 1, quote: 2.34, betCodeId: 10 }
      ]
    },
    trio: {
      nio: { quote: 25.8, betCodeId: 7 },
      io: { quote: 157.2, betCodeId: 6 }
    },
    disparyText: "PARI",
    disparyQuote: { quote: 1.53, betCodeId: 9 },
    bassoText: "BASSO",
    bassoQuote: { quote: 1.61, betCodeId: 8 },
    somma2Number: 6,
    somma2Quote: { quote: 4.77, betCodeId: 12 },
    somma3Number: 12,
    somma3Quote: { quote: 5.07, betCodeId: 11 }
  },
  {
    round: 2,
    roundBonusType: "x2",
    drivers: [
      { driverIndex: 2, quote: 4.74, firstName: "", lastName: "", finishTime: "", betCodeId: 1 },
      { driverIndex: 1, quote: 5.54, firstName: "", lastName: "", finishTime: "", betCodeId: 13 },
      { driverIndex: 0, quote: 4.73, firstName: "", lastName: "", finishTime: "", betCodeId: 14 }
    ],
    p2p3: [
      { name: "SHADOW", quoteP2: { quote: 2.53, betCodeId: 3 }, quoteP3: { quote: 1.68, betCodeId: 4 } },
      { name: "MICKEY", quoteP2: { quote: 2.7, betCodeId: 3 }, quoteP3: { quote: 1.78, betCodeId: 4 } },
      { name: "GÄNSEBLÜM.", quoteP3: { quote: 1.45, betCodeId: 4 } }
    ],
    accoppiata: {
      nioio: { nio: { quote: 12.4, betCodeId: 5 }, io: { quote: 24.3, betCodeId: 2 } },
      entries: [
        { firstDriverIndex: 2, secondDriverIndex: 1, quote: 2.37, betCodeId: 10 },
        { firstDriverIndex: 2, secondDriverIndex: 0, quote: 2.37, betCodeId: 10 },
        { firstDriverIndex: 1, secondDriverIndex: 0, quote: 2.37, betCodeId: 10 }
      ]
    },
    trio: {
      nio: { quote: 13.9, betCodeId: 7 },
      io: { quote: 85.5, betCodeId: 6 }
    },
    disparyText: "DISPARI",
    disparyQuote: { quote: 1.75, betCodeId: 9 },
    bassoText: "BASSO",
    bassoQuote: { quote: 1.74, betCodeId: 8 },
    somma2Number: 5,
    somma2Quote: { quote: 6.03, betCodeId: 12 },
    somma3Number: 6,
    somma3Quote: { quote: 13.9, betCodeId: 11 }
  },
  {
    round: 1,
    roundBonusType: undefined,
    drivers: [
      { driverIndex: 0, quote: 6.05, firstName: "", lastName: "", finishTime: "", betCodeId: 1 },
      { driverIndex: 4, quote: 4.29, firstName: "", lastName: "", finishTime: "", betCodeId: 13 },
      { driverIndex: 5, quote: 6.21, firstName: "", lastName: "", finishTime: "", betCodeId: 14 }
    ],
    p2p3: [
      { name: "SHADOW", quoteP2: { quote: 2.53, betCodeId: 3 }, quoteP3: { quote: 1.68, betCodeId: 4 } },
      { name: "MICKEY", quoteP2: { quote: 2.7, betCodeId: 3 }, quoteP3: { quote: 1.78, betCodeId: 4 } },
      { name: "GÄNSEBLÜM.", quoteP3: { quote: 1.45, betCodeId: 4 } }
    ],
    accoppiata: {
      nioio: { nio: { quote: 11.1, betCodeId: 5 }, io: { quote: 23.2, betCodeId: 2 } },
      entries: [
        { firstDriverIndex: 5, secondDriverIndex: 4, quote: 2.34, betCodeId: 10 },
        { firstDriverIndex: 3, secondDriverIndex: 0, quote: 2.34, betCodeId: 10 },
        { firstDriverIndex: 4, secondDriverIndex: 0, quote: 2.34, betCodeId: 10 }
      ]
    },
    trio: {
      nio: { quote: 23.3, betCodeId: 7 },
      io: { quote: 134.8, betCodeId: 2 }
    },
    disparyText: "DISPARI",
    disparyQuote: { quote: 1.73, betCodeId: 9 },
    bassoText: "BASSO",
    bassoQuote: { quote: 1.74, betCodeId: 8 },
    somma2Number: 6,
    somma2Quote: { quote: 5.0, betCodeId: 12 },
    somma3Number: 12,
    somma3Quote: { quote: 5.5, betCodeId: 11 }
  }
];

const history: IRoundHistory[] = [
  // {
  //   round: 811,
  //   roundBonusType: "x2",
  //   first: { driverIndex: 0, finishTime: "34:52", quote: 6.4, firstName: "James Long", lastName: "" },
  //   second: { driverIndex: 4, finishTime: "35:00", quote: 133.5, firstName: "Jux", lastName: "" }
  // },
  // {
  //   round: 810,
  //   roundBonusType: "x2",
  //   first: { driverIndex: 2, finishTime: "31:57", quote: 5.1, firstName: "Apollo", lastName: "" },
  //   second: { driverIndex: 1, finishTime: "32:15", quote: 128.9, firstName: "Archie", lastName: "" }
  // },
  // {
  //   round: 809,
  //   roundBonusType: undefined,
  //   first: { driverIndex: 3, finishTime: "30:25", quote: 9.2, firstName: "Mickey", lastName: "" },
  //   second: { driverIndex: 4, finishTime: "31:47", quote: 131.5, firstName: "Jux", lastName: "" }
  // },
  // {
  //   round: 808,
  //   roundBonusType: "x3",
  //   first: { driverIndex: 4, finishTime: "33:20", quote: 2.1, firstName: "Jux", lastName: "" },
  //   second: { driverIndex: 0, finishTime: "33:56", quote: 110.5, firstName: "James", lastName: "" }
  // },
  // {
  //   round: 807,
  //   roundBonusType: "x2",
  //   first: { driverIndex: 1, finishTime: "30:19", quote: 7.5, firstName: "Archie", lastName: "" },
  //   second: { driverIndex: 3, finishTime: "31:45", quote: 140.5, firstName: "Gideon", lastName: "" }
  // },
  // {
  //   round: 806,
  //   roundBonusType: "x2",
  //   first: { driverIndex: 0, finishTime: "34:52", quote: 6.4, firstName: "James", lastName: "" },
  //   second: { driverIndex: 4, finishTime: "35:00", quote: 133.5, firstName: "Jux", lastName: "" }
  // },
  // {
  //   round: 805,
  //   roundBonusType: "x3",
  //   first: { driverIndex: 2, finishTime: "31:57", quote: 5.1, firstName: "Apollo", lastName: "" },
  //   second: { driverIndex: 1, finishTime: "32:15", quote: 128.9, firstName: "Archie", lastName: "" }
  // }
];

const bonusHistory: IJackpotHistory[] = [
  { round: 714, id: "9FWHJIO0023Long", date: "04.06.2019", time: "11:39:07", name: "BETTING SHOP 1", amount: "107,03€", amountUnformated: 107.03 },
  { round: 638, id: "9FWHJIO0024", date: "04.06.2019", time: "00:47:45", name: "BETTING SHOP 2", amount: "104,56€", amountUnformated: 104.56 },
  { round: 553, id: "9FWHJIO0025", date: "03.06.2019", time: "00:46:12", name: "SHORT", amount: "89,00€", amountUnformated: 89.0 },
  { round: 492, id: "9FWHJIO0026", date: "03.06.2019", time: "00:49:25", name: "SOME EVEN LONGER TEXT", amount: "95,67€", amountUnformated: 95.67 }
];

const raceIntervals: IRaceInterval[] = [
  { title: "START POSITIONS", startTime: 0.3, duration: 2.05 },
  {
    title: "INTERVAL 1",
    startTime: 8.7,
    duration: 6.2,
    drivers: [
      { driverIndex: 3, time: "11:04" },
      { driverIndex: 4, time: "11:10" },
      { driverIndex: 2, time: "11:10" }
    ]
  },
  {
    title: "INTERVAL 2",
    startTime: 24.0,
    duration: 6.2,
    drivers: [
      { driverIndex: 3, time: "29:03" },
      { driverIndex: 1, time: "29:20" },
      { driverIndex: 2, time: "29:20" }
    ]
  }
];

export const dummyModelDog63: IModel = {
  roundInfo: {
    sendPlan: "333_101_20190829",
    raceNumber: "120398123",
    raceStart: "09182038213.0912",
    gameId: 812,
    oldJackpotValue: 2000,
    jackpotValue: 3272.06
  },
  drivers,
  oddsGridFirstTwoInOrder: false,
  odds: [
    0, 1, 2, 1003, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
    51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,
    100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138,
    139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177,
    178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216,
    217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251
  ],
  // odds: [
  //   6.54, 64.6, 23.2, 31.9, 21.1, 23.6,
  //   61.6, 9.91, 35.2, 48.4, 31.9, 35.8,
  //   25.5, 40.5, 4.10, 20.0, 13.2, 14.8,
  //   33.1, 52.6, 18.9, 5.32, 17.1, 19.2,
  //   23.6, 37.5, 13.6, 18.5, 3.8, 13.7,
  //   25.8, 41.1, 14.8, 20.3, 13.4, 4.16,
  //   6.54, 64.6, 23.2, 31.9, 21.1, 23.6,
  //   61.6, 9.91, 35.2, 48.4, 31.9, 35.8,
  //   25.5, 40.5, 4.10, 20.0, 13.2, 14.8,
  //   33.1, 52.6, 18.9, 5.32, 17.1, 19.2,
  //   23.6, 37.5, 13.6, 18.5, 3.8, 13.7,
  //   25.8, 41.1, 14.8, 20.3, 13.4, 4.16,
  //   6.54, 64.6, 23.2, 31.9, 21.1, 23.6,
  //   61.6, 9.91, 35.2, 48.4, 31.9, 35.8,
  //   25.5, 40.5, 4.10, 20.0, 13.2, 14.8,
  //   33.1, 52.6, 18.9, 5.32, 17.1, 19.2,
  //   23.6, 37.5, 13.6, 18.5, 3.8, 13.7,
  //   25.8, 41.1, 14.8, 20.3, 13.4, 4.16,
  //   6.54, 64.6, 23.2, 31.9, 21.1, 23.6,
  //   61.6, 9.91, 35.2, 48.4, 31.9, 35.8,
  //   25.5, 40.5, 4.10, 20.0, 13.2, 14.8,
  //   33.1, 52.6, 18.9, 5.32, 17.1, 19.2,
  //   23.6, 37.5, 13.6, 18.5, 3.8, 13.7,
  //   25.8, 41.1, 14.8, 20.3, 13.4, 4.16,
  //   6.54, 64.6, 23.2, 31.9, 21.1, 23.6,
  //   61.6, 9.91, 35.2, 48.4, 31.9, 35.8,
  //   25.5, 40.5, 4.10, 20.0, 13.2, 14.8,
  //   33.1, 52.6, 18.9, 5.32, 17.1, 19.2,
  //   23.6, 37.5, 13.6, 18.5, 3.8, 13.7,
  //   25.8, 41.1, 14.8, 20.3, 13.4, 4.16,
  //   6.54, 64.6, 23.2, 31.9, 21.1, 23.6,
  //   61.6, 9.91, 35.2, 48.4, 31.9, 35.8,
  //   25.5, 40.5, 4.10, 20.0, 13.2, 14.8,
  //   33.1, 52.6, 18.9, 5.32, 17.1, 19.2,
  //   23.6, 37.5, 13.6, 18.5, 3.8, 13.7,
  //   25.8, 41.1, 14.8, 20.3, 13.4, 4.16,
  //   6.54, 64.6, 23.2, 31.9, 21.1, 23.6,
  //   61.6, 9.91, 35.2, 48.4, 31.9, 35.8,
  //   25.5, 40.5, 4.10, 20.0, 13.2, 14.8,
  //   33.1, 52.6, 18.9, 5.32, 17.1, 19.2,
  //   23.6, 37.5, 13.6, 18.5, 3.8, 13.7,
  //   25.8, 41.1, 14.8, 20.3, 13.4, 4.16,
  //   6.54, 64.6, 23.2, 31.9, 21.1, 23.6,
  //   61.6, 9.91, 35.2, 48.4, 31.9, 35.8,
  //   25.5, 40.5, 4.10, 20.0, 13.2, 14.8,
  //   33.1, 52.6, 18.9, 5.32, 17.1, 19.2,
  //   23.6, 37.5, 13.6, 18.5, 3.8, 13.7,
  //   25.8, 41.1, 14.8, 20.3, 13.4, 4.16

  // ],
  track,
  history,
  dog63History,
  dog63Suprimi,
  dog63Quotes: quotes,
  dog63rd: quotes3rd,
  dog63QuotesSide: quotesSide,
  jackpotHistory: bonusHistory,
  result: {
    first: { driverIndex: 3, time: "34:19" },
    second: { driverIndex: 1, time: "35:03" },
    third: { driverIndex: 2, time: "00:23:03" },
    clockEndTime: 35,
    jackpotWonText: "BONUS WIN IS <b>107,03€</b> WON AT <b>TOWCESTER</b> BY <b>TICKET NO. 9FWHJIO002</b>",
    roundBonusType: "x3"
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
