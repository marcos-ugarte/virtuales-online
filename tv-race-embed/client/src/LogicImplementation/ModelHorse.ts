import { DriverPattern, IDriver, IRaceInterval, ITrack } from "client/Logic/LogicDefinitions";

export enum HorseGender {
  female = "female",
  male = "male",
  gelding = "gelding"
}

export const driversHorse: IDriver[] = [
  {
    firstName: "James VeryLong",
    lastName: "",
    driverInfos: [
      { key: "WEIGHT:", value: "70lb" },
      { key: "RUNS:", value: "023" },
      { key: "WINS:", value: "006" },
      { key: "STRIKE RATE LONG:", value: "17,18" }
    ],
    driverRaceInfos: [
      { key: "AGE:", value: "4" },
      { key: "SEX:", value: "G" },
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
      { key: "STRIKE RATE:", value: "15,21" },
      { key: "AGE:", value: "4" }
    ],
    driverRaceInfos: [
      { key: "AGE:", value: "4" },
      { key: "SEX:", value: "G" },
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
      { key: "STRIKE RATE:", value: "18,41" }
    ],
    driverRaceInfos: [
      { key: "AGE:", value: "4" },
      { key: "SEX:", value: "G" },
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
      { key: "STRIKE RATE:", value: "18,01" }
    ],
    driverRaceInfos: [
      { key: "AGE:", value: "4" },
      { key: "SEX:", value: "G" },
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
      { key: "STRIKE RATE:", value: "17,18" }
    ],
    driverRaceInfos: [
      { key: "AGE:", value: "4" },
      { key: "SEX:", value: "G" },
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
      { key: "STRIKE RATE:", value: "10,21" }
    ],
    driverRaceInfos: [
      { key: "AGE:", value: "4" },
      { key: "SEX:", value: "G" },
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
      { key: "STRIKE RATE:", value: "10" }
    ],
    driverRaceInfos: [
      { key: "AGE:", value: "4" },
      { key: "SEX:", value: "G" },
      { key: "WEIGHT:", value: "57,5" }
    ],
    color: 0xffe9e6e5,
    driverBarText: "DOG NO.7 JASON WON 2 IN THE LAST 5 RACES",
    driverPattern: DriverPattern.BLACK_WHITE_6
  }
];

export const trackHorse: ITrack = {
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
  lapMapFacts: ["WEATHER: <b>FINE</b>", "TEMP: <b>14°C</b>", "HUMIDITY Long: <b>67%</b>", "WIND: <b>6 NWN</b>"],
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

export const avgHorseTime: number = 87.08;

export const raceIntervalsHorse: IRaceInterval[] = [
  { title: "START POSITIONS", startTime: 0.3, duration: 2.05 },
  {
    title: "INTERVAL 1",
    startTime: 8.7,
    duration: 7.3,
    drivers: [
      { driverIndex: 3, time: "11:04" },
      { driverIndex: 4, time: "11:10" }
    ]
  },
  {
    title: "INTERVAL 2",
    startTime: 24.0,
    duration: 7.3,
    drivers: [
      { driverIndex: 3, time: "29:03" },
      { driverIndex: 1, time: "29:20" }
    ]
  }
];
