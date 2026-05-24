import { IDriver } from "client/Logic/LogicDefinitions";

export const driversBox: IDriver[] = [
  {
    color: 0x3da7ad,
    color2: 0x000000,
    firstName: "PEREIRA",
    lastName: "FREITAS",
    driverInfos: [
      // { key: "QUOTE", value: "1.3" },
      { key: "HERITAGE:", value: "BRAZIL" },
      { key: "AGE:", value: "29" },
      { key: "WEIGHT:", value: "142 lbs" },
      { key: "WIN RATE:", value: "1.1" },
      { key: "KO RATE:", value: "0.37" },
      { key: "TYPE:", value: "ENDURANCE" }
    ],
    driverBarText: "DRIVER NO. 3 <b>JOHNNY DRIFT</b> CAME 2ND IN THE LAST 3/10 RACES",
    heritageShort: "BRA"
  },
  {
    color: 0x9b1b12,
    color2: 0xffffff,
    firstName: "WILSON",
    lastName: "DJAVAN",
    driverInfos: [
      // { key: "QUOTE", value: "2.8" },
      { key: "HERITAGE:", value: "BRAZIL" },
      { key: "AGE:", value: "24" },
      { key: "WEIGHT:", value: "154 lbs" },
      { key: "WIN RATE:", value: "2.4" },
      { key: "KO RATE:", value: "0.67" },
      { key: "TYPE:", value: "AGGRESSIVE" }
    ],
    driverBarText: "DRIVER NO. 3 <b>JOHNNY DRIFT</b> CAME 2ND IN THE LAST 3/10 RACES",
    heritageShort: "BRA"
  }
];
