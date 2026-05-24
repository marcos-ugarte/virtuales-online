import { IDriver, ITrack, IRaceInterval } from "client/Logic/LogicDefinitions";

export const driversKart: IDriver[] = [
  {
    color: 0xffff8433,
    firstName: "Johnny",
    lastName: "Drift",
    driverInfos: [
      { key: "NATIONALITY:", value: "AUSTRIAN" },
      { key: "HEIGHT:", value: "179CM" },
      { key: "WEIGHT:", value: "73KG" },
      { key: "NUMBER OF WINS:", value: "2" },
      { key: "BEST LAP:", value: "00:45:02" }
    ],
    driverBarText: "DRIVER NO. 3 <b>JOHNNY DRIFT</b> CAME 2ND IN THE LAST 3/10 RACES"
  },
  {
    color: 0xffe3be37,
    firstName: "Frank",
    lastName: "Lines",
    driverInfos: [
      { key: "NATIONALITY:", value: "GERMAN" },
      { key: "HEIGHT:", value: "182CM" },
      { key: "WEIGHT:", value: "75KG" },
      { key: "NUMBER OF WINS:", value: "4" },
      { key: "BEST LAP:", value: "00:45:27" }
    ],
    driverBarText: "DRIVER NO. 2 <b>FRANK LINES</b> CAME 2ND IN THE LAST 3/10 RACES"
  },
  {
    color: 0xffffffff,
    firstName: "Chris",
    lastName: "Drebin",
    driverInfos: [
      { key: "NATIONALITY:", value: "AUSTRIAN" },
      { key: "HEIGHT:", value: "179CM" },
      { key: "WEIGHT:", value: "73KG" },
      { key: "NUMBER OF WINS:", value: "2" },
      { key: "BEST LAP:", value: "00:45:02" }
    ],
    driverBarText: "DRIVER NO. 3 <b>CHRIS DREBIN</b> CAME 2ND IN THE LAST 3/10 RACES"
  },
  {
    color: 0xff62a4cc,
    firstName: "Mike",
    lastName: "Sprinter",
    driverInfos: [
      { key: "NATIONALITY:", value: "GERMAN" },
      { key: "HEIGHT:", value: "182CM" },
      { key: "WEIGHT:", value: "75KG" },
      { key: "NUMBER OF WINS:", value: "4" },
      { key: "BEST LAP:", value: "00:45:27" }
    ],
    driverBarText: "DRIVER NO. 3 <b>MIKE SPRINTER</b> CAME 2ND IN THE LAST 3/10 RACES"
  },
  {
    color: 0xffc61e01,
    firstName: "Steve",
    lastName: "Powers",
    driverInfos: [
      { key: "NATIONALITY:", value: "AUSTRIAN" },
      { key: "HEIGHT:", value: "179CM" },
      { key: "WEIGHT:", value: "73KG" },
      { key: "NUMBER OF WINS:", value: "2" },
      { key: "BEST LAP:", value: "00:45:02" }
    ],
    driverBarText: "DRIVER NO. 3 <b>STEVE POWERS</b> CAME 2ND IN THE LAST 3/10 RACES"
  }
];

export const trackKart: ITrack = {
  name: "TEE TOWN\nINTERNATIONAL\nRACE CIRCUIT",
  country: "AUSTRIA",
  facts: [
    { key: "LAP LENGTH", value: "476M / 1562FT" },
    { key: "NUMBER OF LAPS", value: "1.21" },
    { key: "RACE DISTANCE", value: "576M / 1890FT" }
  ],
  items: [
    {
      abbr: "F",
      line1: "FINISH <b>LINE</b>"
    },
    {
      abbr: "S",
      line1: "START <b>LINE</b>"
    },
    {
      abbr: "T1",
      line1: "TURN <b>01/08</b>",
      line2: "SIR JACKSON <b>HAIRPIN</b>",
      curveType: "SINISTRA / 110°"
    },
    {
      abbr: "T2",
      line1: "TURN <b>02/09</b>",
      line2: "THE BLAKE <b>CURVE</b>",
      curveType: "LEFT / 110°"
    },
    {
      abbr: "T3",
      line1: "TURN <b>03</b>",
      line2: "THE HARWOOD <b>BEND</b>",
      interval: "INTERVAL 01"
    },
    {
      abbr: "T4",
      line1: "TURN <b>04</b>",
      line2: "THE GRAND <b>BEND</b>",
      curveType: "RIGHT / 70°"
    },
    {
      abbr: "T5",
      line1: "TURN <b>05</b>",
      line2: "THE MICHAEL <b>CAROUSEL</b>",
      interval: "INTERVAL 02"
    },
    {
      abbr: "HS1",
      line1: "HIGH SPEED Section 1"
    },
    {
      abbr: "T6",
      line1: "TURN <b>06</b>",
      line2: "SOUTH END <b>HAIRPIN</b>",
      curveType: "U-TURN"
    },
    {
      abbr: "H",
      line1: "THE JUST <b>HILL</b>",
      line2: "MAX Elevation: 1.5m"
    },
    {
      abbr: "T7",
      interval: "INTERVAL 03",
      line1: "TURN <b>07</b>",
      line2: "THE PARABOLICA <b>BEND</b>",
      curveType: "RIGHT / 70°"
    },
    {
      abbr: "HS2",
      line1: "HIGH SPEED Section 2"
    }
  ]
};

export const raceIntervalsKart: IRaceInterval[] = [
  { title: "START POSITIONS", startTime: 0, duration: 5.0 },
  {
    title: "INTERVAL 01",
    startTime: 12,
    duration: 4.35,
    drivers: [
      { driverIndex: 3, time: "11.3" },
      { driverIndex: 4, time: "11.7" }
    ]
  },
  {
    title: "INTERVAL 02",
    startTime: 23.4,
    duration: 4.35,
    drivers: [
      { driverIndex: 4, time: "22.7" },
      { driverIndex: 3, time: "22.3" }
    ]
  },
  {
    title: "INTERVAL 3",
    startTime: 35,
    duration: 4.35,
    drivers: [
      { driverIndex: 3, time: "33.8" },
      { driverIndex: 4, time: "34.0" }
    ]
  }
];
