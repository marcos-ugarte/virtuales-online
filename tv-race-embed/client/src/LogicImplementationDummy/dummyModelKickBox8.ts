import { IDriver, IModel, IResultBet, IQuotes, IFightInfo, IBoxRingPresentationFact, IFightHistoryRow, IFightVideos } from "client/Logic/LogicDefinitions";
// ITrack, IRoundHistory, IJackpotHistory, IRaceInterval,

const drivers: IDriver[] = [
  {
    color: 0x3da7ad,
    color2: 0x000000,
    firstName: "Bruno",
    lastName: "GazaniSuperLongthis here",
    driverInfos: [
      // { key: "QUOTE", value: "1.3" },
      { key: "HERITAGESUPERLONG:", value: "BRAZIL" },
      { key: "AGE:", value: "28" },
      { key: "WEIGHT_SUPERLONG:", value: "69.1 lbs" },
      { key: "WIN RATE:", value: "1.1" },
      { key: "KO RATE:", value: "0.37" },
      { key: "TYPE:", value: "ENDURANCE_SUPERLONG" }
    ],
    driverBarText: "DRIVER NO. 3 <b>JOHNNY DRIFT</b> CAME 2ND IN THE LAST 3/10 RACES",
    heritageShort: "BRA"
  },
  {
    color: 0x9b1b12,
    color2: 0xffffff,
    firstName: "Janio",
    lastName: "Mancha",
    driverInfos: [
      // { key: "QUOTE", value: "2.8" },
      { key: "HERITAGE:", value: "BRAZIL" },
      { key: "AGE:", value: "35" },
      { key: "WEIGHT:", value: "69.1 lbs" },
      { key: "WIN RATE:", value: "2.4" },
      { key: "KO RATE:", value: "0.67" },
      { key: "TYPE:", value: "AGGRESSIVE" }
    ],
    driverBarText: "DRIVER NO. 3 <b>JOHNNY DRIFT</b> CAME 2ND IN THE LAST 3/10 RACES",
    heritageShort: "BRA"
  }
];

const resultBet: IResultBet[][] = [
  [
    { r1: 1, r2: 1, r3: 1, quote: 6.4 },
    { r1: 1, r2: 1, r3: 2, quote: 11.8 },
    { r1: 1, r2: 1, r3: 0, quote: 9.5 },
    { r1: 1, r2: 2, r3: 1, quote: 34.6 },
    { r1: 1, r2: 0, r3: 1, quote: 31.2 },
    { r1: 1, r2: 0, r3: 0, quote: 171.9 },
    { r1: 2, r2: 1, r3: 1, quote: 6.3 },
    { r1: 2, r2: 1, r3: 0, quote: 34.6 },
    { r1: 2, r2: 0, r3: 1, quote: 31.2 },
    { r1: 0, r2: 1, r3: 1, quote: 33.6 },
    { r1: 0, r2: 1, r3: 0, quote: 185.6 },
    { r1: 0, r2: 2, r3: 1, quote: 51.1 },
    { r1: 0, r2: 0, r3: 1, quote: 167.0 }
  ],
  [
    { r1: 2, r2: 2, r3: 2, quote: 17.8 },
    { r1: 2, r2: 2, r3: 1, quote: 9.5 },
    { r1: 2, r2: 2, r3: 0, quote: 52.6 },
    { r1: 2, r2: 1, r3: 2, quote: 11.8 },
    { r1: 2, r2: 0, r3: 2, quote: 58.3 },
    { r1: 2, r2: 0, r3: 0, quote: 171.9 },
    { r1: 1, r2: 2, r3: 2, quote: 17.8 },
    { r1: 1, r2: 2, r3: 0, quote: 52.6 },
    { r1: 1, r2: 0, r3: 2, quote: 58.3 },
    { r1: 0, r2: 2, r3: 2, quote: 95.6 },
    { r1: 0, r2: 2, r3: 0, quote: 281.7 },
    { r1: 0, r2: 1, r3: 2, quote: 63.0 },
    { r1: 0, r2: 0, r3: 2, quote: 312.5 }
  ]
];

const fightQuotes: IQuotes = {
  fighters: [
    {
      rounds: [
        { result: "1", quote: 1.4 },
        { result: "2", quote: 1.7 },
        { result: "1", quote: 2.2 }
      ],
      result: "1",
      name: "Bruno Gazani super long name",
      winnerBet: 1.3,
      combiBet: 9.5
    },
    {
      rounds: [
        { result: "1", quote: 1.4 },
        { result: "2", quote: 1.7 },
        { result: "1", quote: 2.2 }
      ],
      result: "1",
      name: "Janio Mancha",
      winnerBet: 1.3,
      combiBet: 9.5
    }
  ],
  quotesTie: [
    { result: "1", quote: 3.8 },
    { result: "2", quote: 2.8 },
    { result: "x", quote: 5.6 }
  ],
  fight: 108
};

const fightResult: IFightInfo = {
  hits: [[]],
  roundResults: [
    { round: 1, fighter: -1 },
    { round: 2, fighter: 0 },
    { round: 3, fighter: 1 }
  ],
  result: {
    fighter: 1,
    roundResults: [
      { fighter: 0, quote: 1.4, blueFistCount: 0, blueKickCount: 0, redFistCount: 0, redKickCount: 0 },
      { fighter: -1, quote: 1.1, blueFistCount: 0, blueKickCount: 0, redFistCount: 0, redKickCount: 0 },
      { fighter: 1, quote: 4.2, blueFistCount: 0, blueKickCount: 0, redFistCount: 0, redKickCount: 0 }
    ],
    quote: 2.8,
    resultBetQuote: 17.8
  }
};

// const history: IRoundHistory[] = [
//   { round: 6, first: { driverIndex: 0, finishTime: "58.42:00", quote: 6.4, firstName: "Julian", lastName: "Steiner" }, second: { driverIndex: 1, finishTime: "59.13:00", quote: 17.4, firstName: "Andrew",  lastName: "Johnson" } },
//   { round: 5, first: { driverIndex: 2, finishTime: "57.41:00", quote: 5.2, firstName: "Gabriel", lastName: "Rodriguez" }, second: { driverIndex: 3, finishTime: "58.31:00", quote: 11.3, firstName: "Andrew",  lastName: "Johnson" } },
//   { round: 4, first: { driverIndex: 4, finishTime: "59.43:00", quote: 7.3, firstName: "William", lastName: "Andersson" }, second: { driverIndex: 3, finishTime: "59.42:00", quote: 2.8, firstName: "Andrew",  lastName: "Johnson" } },
//   { round: 3, first: { driverIndex: 3, finishTime: "58.24:00", quote: 8.8, firstName: "Thorsten", lastName: "Eide" }, second: { driverIndex: 2, finishTime: "59.38:00", quote: 11.9, firstName: "Gabriel", lastName: "Rodriguez" } },
//   { round: 2, first: { driverIndex: 0, finishTime: "58.91:00", quote: 6.7, firstName: "Julian", lastName: "Steiner" }, second: { driverIndex: 1, finishTime: "59.99:00", quote: 7.1, firstName: "Andrew",  lastName: "Johnson" } }
// ];

// const bonusHistory: IJackpotHistory[] = [
//   { round: 4, id: "9FWHJIO0023", date: "04.06.2019", time: "00:45:52", name: "BETTING SHOP 1", amount: "107,03€" },
//   { round: 3, id: "9FWHJIO0024", date: "04.06.2019", time: "00:47:45", name: "BETTING SHOP 2", amount: "104,56€" },
//   { round: 2, id: "9FWHJIO0025", date: "03.06.2019", time: "00:46:12", name: "SHORT", amount: "89,00€" },
//   { round: 1, id: "9FWHJIO0026", date: "03.06.2019", time: "00:49:25", name: "SOME LONGER TEXT", amount: "95,67€" },
// ];

// const raceIntervals: IRaceInterval[] = [
//   { title: "START POSITIONS START POSITIONS", startTime: 1.4, duration: 5.0 },
//   {
//     title: "INTERVAL 01", startTime: 13.4, duration: 4.6, drivers: [
//       { driverIndex: 3, time: "23.5" },
//       { driverIndex: 4, time: "24.3" }
//     ]
//   },
//   {
//     title: "INTERVAL 02", startTime: 24.8, duration: 4.6, drivers: [
//       { driverIndex: 4, time: "42.2" },
//       { driverIndex: 3, time: "44.8" }
//     ]
//   },
//   {
//     title: "INTERVAL 3", startTime: 36.4, duration: 4.6, drivers: [
//       { driverIndex: 3, time: "58.2" },
//       { driverIndex: 4, time: "59.8" }
//     ]
//   }
// ];

export const boxRingPresentationFacts: IBoxRingPresentationFact[] = [
  {
    startTime: 4.3,
    duration: 4.4,
    title: "ROUNDS",
    values: ["1", "2", "3"],
    postfix: ""
  },
  {
    startTime: 8.7,
    duration: 5.5,
    title: "DURATIONSUPERLONG",
    values: ["", "1", "2", "3", "4"],
    postfix: "MINS"
  },
  {
    startTime: 14.2,
    duration: 5,
    title: "WEIGHT",
    values: [],
    postfix: "CRUISER"
  }
];

export const fightHistory: IFightHistoryRow[] = [
  {
    fightNumber: "102",
    rounds: [
      {
        fighterIndex: 0,
        quote: 1.4,
        bar: 1
      },
      {
        fighterIndex: 1,
        quote: 1.7,
        bar: 1
      },
      {
        fighterIndex: 0,
        quote: 2.2,
        bar: 2
      }
    ],
    resultFighterIndex: 0,
    resultFighter: drivers[0],
    winningBet: 1.3,
    combiBet: 9.5
  },
  {
    fightNumber: "101",
    rounds: [
      {
        fighterIndex: 1,
        quote: 2.4,
        bar: 1
      },
      {
        fighterIndex: 1,
        quote: 1.9,
        bar: 1
      },
      {
        fighterIndex: 0,
        quote: 2.0,
        bar: 2
      }
    ],
    resultFighterIndex: 1,
    resultFighter: drivers[1],
    winningBet: 2.8,
    combiBet: 9.5
  },
  {
    fightNumber: "100",
    rounds: [
      {
        fighterIndex: 0,
        quote: 1.3,
        bar: 1
      },
      {
        fighterIndex: -1,
        quote: 6.2,
        bar: 1
      },
      {
        fighterIndex: 1,
        quote: 2.0,
        bar: 2
      }
    ],
    resultFighterIndex: 1,
    resultFighter: drivers[1],
    winningBet: 2.7,
    combiBet: 58.3
  },
  {
    fightNumber: "099",
    rounds: [
      {
        fighterIndex: 1,
        quote: 2.1,
        bar: 1
      },
      {
        fighterIndex: 1,
        quote: 1.4,
        bar: 1
      },
      {
        fighterIndex: 1,
        quote: 1.5,
        bar: 2
      }
    ],
    resultFighterIndex: 1,
    resultFighter: drivers[1],
    winningBet: 2.5,
    combiBet: 17.8
  },
  {
    fightNumber: "098",
    rounds: [
      {
        fighterIndex: 0,
        quote: 1.6,
        bar: 1
      },
      {
        fighterIndex: 1,
        quote: 2.4,
        bar: 1
      },
      {
        fighterIndex: -1,
        quote: 7.3,
        bar: 2
      }
    ],
    resultFighterIndex: 1,
    resultFighter: drivers[1],
    winningBet: 2.9,
    combiBet: 52.6
  },
  {
    fightNumber: "097",
    rounds: [
      {
        fighterIndex: 0,
        quote: 1.2,
        bar: 1
      },
      {
        fighterIndex: 1,
        quote: 3.3,
        bar: 1
      },
      {
        fighterIndex: 1,
        quote: 2.2,
        bar: 2
      }
    ],
    resultFighterIndex: 1,
    resultFighter: drivers[1],
    winningBet: 3.2,
    combiBet: 17.8
  },
  {
    fightNumber: "096",
    rounds: [
      {
        fighterIndex: 0,
        quote: 4.8,
        bar: 1
      },
      {
        fighterIndex: 1,
        quote: 3.3,
        bar: 1
      },
      {
        fighterIndex: 1,
        quote: 2.2,
        bar: 2
      }
    ],
    resultFighterIndex: 1,
    resultFighter: drivers[1],
    winningBet: 3.2,
    combiBet: 17.8
  },
  {
    fightNumber: "095",
    rounds: [
      {
        fighterIndex: -1,
        quote: 6.5,
        bar: 1
      },
      {
        fighterIndex: -1,
        quote: 5.2,
        bar: 1
      },
      {
        fighterIndex: 0,
        quote: 1.6,
        bar: 2
      }
    ],
    resultFighterIndex: 0,
    resultFighter: drivers[0],
    winningBet: 1.5,
    combiBet: 167.0
  }
];

export const fightVideos: IFightVideos = {
  fightName: "WGP19FG_Fight3",
  round1: [
    { name: "WGP19FG_Fight3_Clip4", url: "", jpg: "", length: 0 },
    { name: "WGP19FG_Fight3_Clip12", url: "", jpg: "", length: 0 },
    { name: "WGP19FG_Fight3_Clip16", url: "", jpg: "", length: 0 }
  ],
  round2: [
    { name: "WGP19FG_Fight3_Clip4", url: "", jpg: "", length: 0 },
    { name: "WGP19FG_Fight3_Clip21", url: "", jpg: "", length: 0 },
    { name: "WGP19FG_Fight3_Clip23", url: "", jpg: "", length: 0 }
  ],
  round3: [
    { name: "WGP19FG_Fight3_Clip37", url: "", jpg: "", length: 0 },
    { name: "WGP19FG_Fight3_Clip33", url: "", jpg: "", length: 0 }
  ],
  round1Result: {
    name: "WGP19FG_Fight1_Round_1_DRAW",
    url: "",
    jpg: "WGP19FG_Fight1_Round_1_DRAW_Stillframe_End",
    length: 6
  },
  round2Result: {
    name: "WGP19FG_Fight1_Round_2_BLUE",
    url: "",
    jpg: "WGP19FG_Fight1_Round_2_BLUE_Stillframe_End",
    length: 6
  },
  round3Result: {
    name: "WGP19FG_Fight1_Round_3_DRAW",
    url: "",
    jpg: "WGP19FG_Fight1_Round_3_DRAW_Stillframe_End",
    length: 6.49
  },
  finalResult: {
    //name: "WGP20FG_Fight8_Result_RED",
    name: "WGP19FG_Fight1_Result_RED",
    url: "",
    jpg: "WGP19FG_Fight1_Result_RED.jpg",
    length: 24
  }
};

export const dummyModelKickBox: IModel = {
  roundInfo: {
    gameId: 108,
    sendPlan: "433_104_20190829",
    raceNumber: "0127",
    raceStart: "29.08.2019 08:28:00",
    oldJackpotValue: 2000,
    jackpotValue: 3272.06
    // bonusValue: undefined
  },
  drivers,
  odds: [
    3.3910059244791846, 6.86639529844963, 3.4353526633868814, 7.6152565831820995, 4.483243114220721, 16.27875216556387, 17.537510481419258, 5.820480535195691, 18.08298183184477, 0.945436078347357,
    1.0296151624771177, 13.62817927522077, 13.628993157114312, 10.616823508411297, 16.87834726285162, 3.2619606534410295, 2.919027944131858, 16.59902929952599, 6.143738623107597, 2.6731746726465433,
    15.363809245052252, 19.29683223719557, 3.465750497251512, 0.228020774959381, 4.16549708600213
  ],
  track: { name: "bla", country: "bla", facts: [], items: [] },

  history: [],

  jackpotHistory: undefined, // TODO
  result: {
    first: { driverIndex: 2, time: "1:02.2" },
    second: { driverIndex: 3, time: "1:03.1" },
    clockEndTime: 46.0,
    jackpotWonText: "BONUS WIN IS <b>107,03€</b> WON AT <b>TEE TOWN INT.</b> BY <b>TICKET NO. 9FWHJI002</b>",
    roundBonusType: "x3"
  },
  raceIntervals: [],
  colors: {
    white: 0xffffffff,
    green: 0xff148912,
    red: 0xffd6301d,
    panelColor: 0xff242a2f,
    panelColorBottom: 0xff22282c,
    panelColorBottomNumber: 0xff070809
  },

  fightQuotes,
  resultBet,
  fightResult,
  boxRingPresentationFacts,
  fightHistory,
  fightVideos
};
