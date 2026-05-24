import { IAnimInterval } from "client/Logic/LogicDefinitions";
import { IOddType } from "./OddElement";
import * as PIXI from "pixi.js";
import { Logic, _s } from "client/Logic/Logic";

interface IColumns {
  [key: number]: number;
}
interface IRows {
  [key: number]: number;
}

interface IDimensions {
  columns: IColumns;
  rows: IRows;
}
export interface IColors {
  [key: number]: number[];
  green: [0];
  red: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  black: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
}

export class RouletteHelper {
  private static dimensions: IDimensions = {
    columns: {
      0: 342,
      1: 370.4,
      2: 435.5,
      3: 500.8,
      4: 565.5,
      5: 631.5,
      6: 696.5,
      7: 761.2,
      8: 826.8,
      9: 892.2,
      10: 957.2,
      11: 1022.6,
      12: 1087.9,
      13: 1183.7
    },
    rows: {
      1: 260,
      2: 303,
      3: 345,
      4: 388,
      5: 431,
      6: 473,
      7: 514,
      8: 585
    }
  };
  private static colors: IColors = {
    green: [0],
    red: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
    black: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]
  };
  private static betAreas: string[] = ["oddTxtSm", "evenTxtSm", "1_18", "19_36", "firstRow", "secondRow", "thirdRow", "1_12", "13_24", "25_36"];

  public static numberFieldWidth = 62;
  public static numberFieldHeight = 80;

  public static columnGapWidth = 4;

  public static getChanceToWin(type: IOddType, column: number, row: number): number {
    switch (type) {
      case IOddType.Single:
        return 36;
      case IOddType.SplitRow:
        return 18;
      case IOddType.SplitColumn:
        return 12;
      case IOddType.Street:
        return 12;
      case IOddType.Corner:
        return 9;
      case IOddType.DoubleStreet:
        return 6;
      case IOddType.ZeroSplit:
        return 18;
      case IOddType.Trio:
        return 12;
      case IOddType.Basket:
        return 9;
      case IOddType.Zero:
        return 36;
    }
    if (row === 7 || column === 13) {
      return 3;
    } else if (row === 8) {
      return 2;
    } else {
      console.error(`no chance for oddtype ${type}`);
      return 0;
    }
  }

  public static calculateCoordinates(row: number, column: number, type: IOddType): { x: number; y: number } {
    let xOffset;
    if (type === IOddType.Single || type === IOddType.SplitRow || type === IOddType.Street) {
      xOffset = (this.columnGapWidth + this.numberFieldWidth) / 2;
    } else {
      xOffset = 0;
    }
    const x = this.dimensions.columns[column] + xOffset;
    const y = this.dimensions.rows[row];
    return { x, y };
  }

  public static getColorForNumber(number: number): string | undefined {
    for (const key in this.colors) {
      if (Object.prototype.hasOwnProperty.call(this.colors, key)) {
        const element = this.colors[key];
        if (element.includes(number)) return key;
      }
    }
    console.error(`no color for number ${number}`);
    return undefined;
  }

  public static get allNumbers(): number[] {
    return [...RouletteHelper.colors.green, ...RouletteHelper.colors.black, ...RouletteHelper.colors.red].sort((a, b) => {
      return a - b;
    });
  }

  public static get lastWinnerTextStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "Roboto-Bold",
      fontSize: _s(170),
      fill: 0xffffff,
      trim: true,
      padding: 10,
      strokeThickness: 4
    });
  }
  public static get smallNumberTextStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(18),
      fill: 0xffffff,
      stroke: 0x000000,
      trim: true,
      padding: 10,
      strokeThickness: _s(1.1)
    });
  }
  public static get smallNumberHistorybarTextStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(22),
      fill: 0xffffff,
      stroke: 0x000000,
      trim: true,
      padding: 10,
      strokeThickness: _s(1.7)
    });
  }

  public static get bigNumberTextStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(21),
      fill: 0xffffff,
      trim: true,
      padding: 10,
      stroke: 0x000000
    });
  }

  public static get smallOddTextStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "Roboto-Regular",
      trim: true,
      padding: 10,
      fontSize: _s(17),
      fill: 0xaaaaaa
    });
  }

  public static get oddElementNumberTextStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "Roboto-Regular",
      fontSize: _s(13),
      trim: true,
      padding: 10,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: _s(1.8)
    });
  }

  public static get rouletteBoardNormalTextStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "Roboto-Bold",
      fontSize: _s(32),
      trim: true,
      padding: 10,
      fill: 0xffffff
    });
  }

  public static get rouletteBoardNarrowTextStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(28),
      trim: true,
      padding: 10,
      fill: 0xffffff
    });
  }

  public static get rouletteBoardSuperScriptTextStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(17),
      textBaseline: "bottom",
      trim: true,
      padding: 10,
      fill: 0xffffff
    });
  }

  public static get allAreas(): string[] {
    return RouletteHelper.betAreas;
  }

  public static statForNumber(number: number, rouletteStats: number[]): number {
    const allNumbers = RouletteHelper.allNumbers;
    const numberIndex = allNumbers.indexOf(number);
    return rouletteStats[numberIndex];
  }
}
