import { IDriver, ITrack, IRoundHistory, IJackpotHistory, IRaceInterval, IModel } from "client/Logic/LogicDefinitions";

const drivers: IDriver[] = [
  {
    color: 0xffff8433,
    firstName: "Johnny",
    lastName: "Drift",
    driverInfos: [
      { key: "NATIONALITY:", value: "UNITED KINGDOMS" },
      { key: "HEIGHT:", value: "179CM" },
      { key: "WEIGHT:", value: "73KG" },
      { key: "NUMBER OF WINS:", value: "2" },
      { key: "TREND:", value: "1" }
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
      { key: "TREND:", value: "2" }
    ],
    driverBarText: "DRIVER NO. 2 <b>FRANK LINES</b> CAME 2ND IN THE LAST 3/10 RACES"
  },
  {
    color: 0xffffffff,
    firstName: "Christian",
    lastName: "Drebinaugh",
    driverInfos: [
      { key: "NATIONALITY:", value: "AUSTRIAN" },
      { key: "HEIGHT:", value: "179CM" },
      { key: "WEIGHT:", value: "73KG" },
      { key: "NUMBER OF WINS:", value: "2" },
      { key: "TREND:", value: "4" }
    ],
    driverBarText: "DRIVER NO. 3 <b>CHRIS DREBIN</b> CAME 2ND IN THE LAST 3/10 RACES"
  },
  {
    color: 0xff62a4cc,
    firstName: "Michael",
    lastName: "Turbosprinter",
    driverInfos: [
      { key: "NATIONALITY:", value: "GERMAN" },
      { key: "HEIGHT:", value: "182CM" },
      { key: "WEIGHT:", value: "75KG" },
      { key: "NUMBER OF WINS:", value: "4" },
      { key: "TREND:", value: "1" }
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
      { key: "TREND:", value: "5" }
    ],
    driverBarText: "DRIVER NO. 3 <b>STEVE POWERS</b> CAME 2ND IN THE LAST 3/10 RACES"
  }
];

const track: ITrack = {
  name: "TEE TOWN\nINTERNATIONAL\nRACE CIRCUIT",
  country: "AUSTRIA",
  facts: [
    { key: "LAP LENGTH", value: "476M / 1557FT" },
    { key: "NUMBER OF LAPS", value: "121" },
    { key: "RACE DISTANCE", value: "538 / 1886FT" }
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

const history: IRoundHistory[] = [
  {
    round: 6,
    first: { driverIndex: 0, finishTime: "58.42:00", quote: 6.4, firstName: "Julian", lastName: "Steiner" },
    second: { driverIndex: 1, finishTime: "59.13:00", quote: 17.4, firstName: "Andrew", lastName: "Johnson" }
  },
  {
    round: 5,
    first: { driverIndex: 2, finishTime: "57.41:00", quote: 5.2, firstName: "Gabriel", lastName: "Rodriguez" },
    second: { driverIndex: 3, finishTime: "58.31:00", quote: 11.3, firstName: "Andrew", lastName: "Johnson" }
  },
  {
    round: 4,
    first: { driverIndex: 4, finishTime: "59.43:00", quote: 7.3, firstName: "William", lastName: "Andersson" },
    second: { driverIndex: 3, finishTime: "59.42:00", quote: 2.8, firstName: "Andrew", lastName: "Johnson" }
  },
  {
    round: 3,
    first: { driverIndex: 3, finishTime: "58.24:00", quote: 8.8, firstName: "Thorsten", lastName: "Eide" },
    second: { driverIndex: 2, finishTime: "59.38:00", quote: 11.9, firstName: "Gabriel", lastName: "Rodriguez" }
  },
  {
    round: 2,
    first: { driverIndex: 0, finishTime: "58.91:00", quote: 6.7, firstName: "Julian", lastName: "Steiner" },
    second: { driverIndex: 1, finishTime: "59.99:00", quote: 7.1, firstName: "Andrew", lastName: "Johnson" }
  }
];

const bonusHistory: IJackpotHistory[] = [
  { round: 4, id: "9FWHJIO0023", date: "04.06.2019", time: "00:45:52", name: "BETTING SHOP 1", amount: "107,03€", amountUnformated: 107.03 },
  { round: 3, id: "9FWHJIO0024", date: "04.06.2019", time: "00:47:45", name: "BETTING SHOP 2", amount: "104,56€", amountUnformated: 104.56 },
  { round: 2, id: "9FWHJIO0025", date: "03.06.2019", time: "00:46:12", name: "SHORT", amount: "89,00€", amountUnformated: 89.0 },
  { round: 1, id: "9FWHJIO0026", date: "03.06.2019", time: "00:49:25", name: "SOME LONGER TEXT", amount: "95,67€", amountUnformated: 95.67 }
];

const raceIntervals: IRaceInterval[] = [
  { title: "START POSITIONS START POSITIONS", startTime: 1.4, duration: 5.0 },
  {
    title: "INTERVAL 01",
    startTime: 13.4,
    duration: 4.6,
    drivers: [
      { driverIndex: 3, time: "23.5" },
      { driverIndex: 4, time: "24.3" }
    ]
  },
  {
    title: "INTERVAL 02",
    startTime: 24.8,
    duration: 4.6,
    drivers: [
      { driverIndex: 4, time: "42.2" },
      { driverIndex: 3, time: "44.8" }
    ]
  },
  {
    title: "INTERVAL 3",
    startTime: 36.4,
    duration: 4.6,
    drivers: [
      { driverIndex: 3, time: "58.2" },
      { driverIndex: 4, time: "59.8" }
    ]
  }
];

export const dummyModelKart5: IModel = {
  roundInfo: {
    gameId: 234,
    sendPlan: "433_104_20190829",
    raceNumber: "0127",
    raceStart: "29.08.2019 08:28:00",
    oldJackpotValue: 2000,
    jackpotValue: 3272.06
    // bonusValue: undefined
  },
  drivers,
  odds: [
    6.3910059244791846, 23.03639529844963, 24.4353526633868814, 43.7152565831820995, 30.083243114220721, 20.07875216556387, 3.537510481419258, 11.620480535195691, 20.68298183184477,
    14.345436078347357, 1.0296151624771177, 13.62817927522077, 13.628993157114312, 10.616823508411297, 16.87834726285162, 43.8619606534410295, 2.919027944131858, 16.59902929952599, 6.143738623107597,
    2.6731746726465433, 15.363809245052252, 19.29683223719557, 3.465750497251512, 0.228020774959381, 4.60549708600213
  ],
  track,
  history,
  jackpotHistory: bonusHistory,
  result: {
    first: { driverIndex: 2, time: "1:02.2" },
    second: { driverIndex: 3, time: "1:03.1" },
    clockEndTime: 46.0,
    jackpotWonText: "BONUS WIN IS <b>107,03€</b> WON AT <b>TEE TOWN INT.</b> BY <b>TICKET NO. 9FWHJI002</b>",
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
