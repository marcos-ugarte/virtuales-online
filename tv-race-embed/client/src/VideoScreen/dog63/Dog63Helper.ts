import { _s, Logic } from "client/Logic/Logic";
import * as PIXI from "pixi.js";
import { LogicImplementation } from "client/LogicImplementation/LogicImplementation";

export class Dog63Helper {
  private static blueColor = "0x64c4f4";
  private static blueColorNumber = 0x64c4f4;
  private static whiteColorNumber = 0xffffff;
  private static whiteColor = "0xFFFFFF"; // "0x9b1b12";
  //private static whiteColor = "0x9b1b12";
  private static yellowColor = 0xf8e90f;
  private static redColor = 0xd33529;
  private static greenColor = 0x35a321;
  private static headerCenterStyle: PIXI.TextStyle;
  private static blackColor = "0x000000";

  public static getBlackColor(): string {
    return this.blackColor;
  }
  public static getBlueColor(): string {
    return this.blueColor;
  }
  public static getBlueColorNumber(): number {
    return this.blueColorNumber;
  }
  public static getWhiteColor(): string {
    return this.whiteColor;
  }
  public static getWhiteColorNumber(): number {
    return this.whiteColorNumber;
  }
  public static getYellowColorNumber(): number {
    return this.yellowColor;
  }
  public static getGreenColorNumber(): number {
    return this.greenColor;
  }
  public static getRedColorNumber(): number {
    return this.redColor;
  }

  public static getHeaderCenterStyle(): PIXI.TextStyle {
    if (!this.headerCenterStyle) {
      this.headerCenterStyle = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(36),
        fill: Dog63Helper.whiteColor, // overwritten when filling in infos,
        letterSpacing: 0.0
      });
    }
    return this.headerCenterStyle;
  }

  public static formatQuote(quote: number, betCodeId: number): string {
    let numberDecimalPlaces = 2;

    const betCodeDecimals = Logic.implementation.getBetTypeDecimalPlaces();
    if (betCodeDecimals) {
      const numberDecimalsLookUp = betCodeDecimals.find((i) => i.betCodeId === betCodeId);
      if (numberDecimalsLookUp) {
        numberDecimalPlaces = numberDecimalsLookUp.decimalPlaces;
      }
    }
    return Logic.implementation.formatNumber(quote, numberDecimalPlaces);
  }

  public static turnQuoteIntoNumber(quote: string, comma: string): number {
    quote = quote.replace(comma, ".");
    return Number(quote);
  }

  public static findMinMaxValues(arr: string[]): { maxVal: number; minVal: number } {
    const numberArr = arr.map((el) => {
      return this.turnQuoteIntoNumber(el, ",");
    });
    let minVal = numberArr[0];
    let maxVal = numberArr[0];

    for (let i = 1; i < numberArr.length; i++) {
      if (numberArr[i] < minVal) {
        minVal = numberArr[i];
      }
      if (numberArr[i] > maxVal) {
        maxVal = numberArr[i];
      }
    }
    return { maxVal, minVal };
  }

  public static getRaceResultHeaderStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(11),
      fill: Dog63Helper.getBlackColor(), // overwritten when filling in infos,
      letterSpacing: _s(4.75)
    });
  }

  public static getRaceResultSubHeaderStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "DIN-LightItalic",
      fontSize: _s(16),
      fill: Dog63Helper.getWhiteColor(), // overwritten when filling in infos,
      letterSpacing: _s(1)
    });
  }

  public static getRaceResultPlaceStyle(): PIXI.TextStyle {
    const placeStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(26),
      fill: Dog63Helper.getWhiteColor(),
      letterSpacing: _s(0),
      align: "left"
    });
    return placeStyle;
  }

  public static getRaceResultQuoteStyle(): PIXI.TextStyle {
    const quoteStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(37),
      fill: Dog63Helper.getWhiteColor(),
      letterSpacing: _s(-1),
      align: "right"
    });
    return quoteStyle;
  }
}
