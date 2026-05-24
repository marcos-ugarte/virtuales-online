import { Util } from "common/Util";
import { Logic } from "client/Logic/Logic";
//import {Logic, _s } from "client/Logic/Logic";
import { settings, _s } from "client/Logic/Logic";
import * as PIXI from "pixi.js";
import { ITextStyleSet } from "../common/MultiStyleText";
//import { ITextStyleSet, MultiStyleText } from "../common/MultiStyleText";

interface IBonusHistoryStyle {
  [key: string]: PIXI.TextStyle;
}

export class DogHelper {
  private static whiteColor = "white";
  private static blackColor = "black";
  private static whiteColorNumber = 0x3da7ad;
  private static blackColorNumber = 0x9b1b12;
  private static lightBrownColor = "";
  private static darkBrownColor = "#865A26";
  private static lightGrayColorNumber = "0xbfbfbfff";

  private static statArrowColors = {
    UP90: 0x50ff33,
    UP45: 0x74af57,
    NEUTRAL: 0x9a9a9a,
    DOWN45: 0xae4e4e,
    DOWN90: 0xff2727
  };

  // private static grayBackgroundColor = 0xAEAEB0;
  // private static grayTextColor =  "0x46424B";
  // private static grayTextColorNumber =  0x46424B;

  // private static headerCenterStyle: PIXI.TextStyle;
  // private static roundTextStyleProperties: any;
  // private static roundValueStyleProperties: any;
  // private static roundPlaceStyleProperties: any;
  // private static fighterNumberStyle: any;

  public static fightRoundLength = 28;
  public static fightRoundResultLength = 6;
  public static fightResultLength = 26.8; //30.848;

  public static getWhiteColor(): string {
    return settings.devUser === "BDR-MSA" ? "0x3da7ad" : this.whiteColor;
  }
  public static getBlackColor(): string {
    return settings.devUser === "BDR-MSA" ? "0x9b1b12" : this.blackColor;
  }
  public static getLightGrayColorNumber(): number | string {
    return settings.devUser === "BDR-MSA" ? 0xad0dad : this.lightGrayColorNumber;
  }
  public static getLightBrownColor(): string {
    return this.lightBrownColor;
  }
  public static getDarkBrownColor(): string {
    return this.darkBrownColor;
  }
  public static getWhiteColorNumber(): number {
    return this.whiteColorNumber;
  }
  public static getBlackColorNumber(): number {
    return this.blackColorNumber;
  }
  public static getStatArrowColors() {
    return this.statArrowColors;
  }
  public static getChangedHueColor(rgb: string, hue: number) {
    function hexToRgb(hex: string): [number, number, number] {
      hex = hex.replace(/^#/, "");
      const bigint = parseInt(hex, 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    }

    function rgbToHex(r: number, g: number, b: number): string {
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
      (r /= 255), (g /= 255), (b /= 255);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h: number;
      let s: number;
      const l: number = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
          default:
            h = 0;
        }
        h *= 60;
      }
      return [h, s, l];
    }

    function hslToRgb(h: number, s: number, l: number): [number, number, number] {
      let r: number;
      let g: number;
      let b: number;

      function hueToRgb(p: number, q: number, t: number): number {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      }

      if (s === 0) {
        r = g = b = l;
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hueToRgb(p, q, h / 360 + 1 / 3);
        g = hueToRgb(p, q, h / 360);
        b = hueToRgb(p, q, h / 360 - 1 / 3);
      }

      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    let [r, g, b] = hexToRgb(rgb);
    let [h, s, l] = rgbToHsl(r, g, b);
    h = (h + hue) % 360;
    if (h < 0) h += 360;
    [r, g, b] = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
  }
  public static getColorByGame(gameType: string, rgb: string) {
    switch (gameType) {
      case "dog6":
        return rgb;
      case "horse":
        return this.getChangedHueColor(rgb, 180);
      case "sulky":
        return this.getChangedHueColor(rgb, 110);
      default:
        return rgb;
    }
  }
  public static getBonusValueForTime(oldBonusValue: number, newBonusValue: number, time: number) {
    const rt = Logic.getTimeUntilRaceForTimeBar();
    const oldBonusTime = 10.0; // if there is an oldBonus -> fade fast to oldBonusTime and then slow...

    const oldBonusFactor = this.getFactor(time, 0, oldBonusTime);
    const oldBonusValueToShow = oldBonusFactor * oldBonusValue + 0.00001; // AnimFactor.fromTime(oldBonusFactor).sigmoid(10).val * this.oldBonusValue + 0.0001;
    const bonusFactor = this.getFactor(time, oldBonusTime, rt);
    // const bonusValueToShow = this.oldBonusValue + bonusFactor * (this.bonusValue - this.oldBonusValue) + 0.0001;
    const bonusValueToShow = bonusFactor >= 1.0 ? newBonusValue : oldBonusValue + this.easeFunction(bonusFactor) * (newBonusValue - oldBonusValue) + 0.00001;

    const lerpFactor = Util.clamp(time - oldBonusTime + 1.0, 0, 1);

    return Util.lerp(oldBonusValueToShow, bonusValueToShow, lerpFactor);
  }

  public static getFactor(current: number, startTime: number, endTime: number) {
    const factor = (current - startTime) / (endTime - startTime);
    return Util.clamp(factor, 0, 1);
  }

  private static easeFunction(t: number) {
    const m0 = 3;
    const m1 = 3;
    const t2 = t * t;
    const t3 = t2 * t;
    return (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) + (t3 - t2) * m1;
  }
  public getRacingHistoryTitleStyle(oddsAlwaysOn = false): PIXI.TextStyle {
    const styles = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(22),
      fill: DogHelper.getWhiteColor(),
      align: "center"
    });
    if (oddsAlwaysOn) {
      styles.fontSize = _s(18);
      styles.align = "left";
    }

    return styles;
  }

  public getRacingHistoryQuotesStyle(oddsAlwaysOn = false): PIXI.TextStyle {
    const style = new PIXI.TextStyle({
      fontFamily: "DIN-Heavy",
      fontSize: _s(20),
      fill: DogHelper.getWhiteColor(),
      align: "center"
    });
    if (oddsAlwaysOn) {
      style.fontFamily = "DIN-Medium";
      style.fontSize = _s(16);
    }
    return style;
  }

  public getRacingHistoryTimeStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "DIN-UltraLight",
      fontSize: _s(18),
      fill: "#CCC",
      align: "center"
    });
  }

  public getRacingHistoryRaceStyle(oddsAlwaysOn = false): PIXI.TextStyle {
    const style = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLight",
      fontSize: _s(12),
      fill: DogHelper.getWhiteColor(),
      align: "center"
    });
    if (oddsAlwaysOn) style.fontFamily = "DIN-Regular";
    return style;
  }

  public getRacingHistoryRaceNumberStyle(oddsAlwaysOn = false): PIXI.TextStyle {
    const style = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(18),
      fill: DogHelper.getWhiteColor(),
      align: "center"
    });
    if (oddsAlwaysOn) style.fontSize = _s(15);
    return style;
  }

  public getRacingHistoryNumberStyle(oddsAlwaysOn = false): PIXI.TextStyle {
    const style = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(22),
      fill: DogHelper.getWhiteColor(),
      align: "center"
    });
    if (oddsAlwaysOn) style.fontSize = _s(18);
    return style;
  }

  public getRacingHistoryDriverStyle(): ITextStyleSet {
    const driverNameSize = _s(16);
    return {
      default: {
        fontFamily: "DIN-UltraLight",
        fill: DogHelper.getWhiteColor(),
        fontSize: driverNameSize,
        valign: "middle",
        letterSpacing: _s(1),
        maxLines: 1,
        wordWrap: true,
        wordWrapWidth: _s(105)
      },
      b: {
        fontFamily: "DIN-Medium",
        fill: DogHelper.getWhiteColor(),
        fontSize: driverNameSize,
        valign: "middle",
        letterSpacing: _s(1)
      }
    };
  }

  public getBottomBarItemNameStyle(): ITextStyleSet {
    return {
      default: {
        fontFamily: "DIN-UltraLightItalic",
        fill: DogHelper.getWhiteColor(),
        fontSize: _s(14),
        valign: "middle",
        letterSpacing: _s(1.5),
        maxLines: 1,
        wordWrap: true,
        wordWrapWidth: _s(70),
        fontStyle: "italic"
      },
      b: { fontFamily: "DIN-Medium", fill: DogHelper.getWhiteColor(), fontSize: _s(14), valign: "middle", letterSpacing: _s(1) }
    };
  }

  public getBottomBarItemNameLongStyle(): ITextStyleSet {
    return {
      default: {
        fontFamily: "DIN-UltraLightItalic",
        fill: DogHelper.getWhiteColor(),
        fontSize: _s(10),
        valign: "middle",
        letterSpacing: _s(1),
        maxLines: 1,
        wordWrap: true,
        wordWrapWidth: _s(70),
        fontStyle: "italic"
      },
      b: { fontFamily: "DIN-Medium", fill: DogHelper.getWhiteColor(), fontSize: _s(14), valign: "middle", letterSpacing: _s(1) }
    };
  }

  //// DriverPresentation --------------------------------------------------------------------------------
  public getDriverPresentationTitleStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "DIN-RegularItalic",
      fontSize: _s(8),
      letterSpacing: _s(9),
      fill: DogHelper.getBlackColor(),
      align: "center",
      fontStyle: "italic"
    });
  }

  public getDriverPresentationNameStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "DIN-RegularItalic",
      fontSize: _s(20),
      letterSpacing: _s(1.4),
      fill: DogHelper.getWhiteColor(),
      align: "center",
      fontStyle: "italic"
    });
  }

  public getDriverPresentationNumberMainStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "DIN-HeavyItalic",
      fontSize: _s(26),
      fill: DogHelper.getWhiteColor(),
      align: "center",
      fontStyle: "italic"
    });
  }

  public getDriverPresentationQuoteStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "DIN-MediumItalic",
      fontSize: _s(22),
      fill: DogHelper.getWhiteColor(),
      align: "right",
      fontStyle: "italic"
    });
  }

  public getDriverPresentationSmallBoldStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "DIN-RegularItalic",
      fontSize: _s(20),
      fill: DogHelper.getWhiteColor(),
      align: "center",
      fontStyle: "italic"
    });
  }

  public getFirstTextStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(12),
      fill: DogHelper.getWhiteColor(),
      align: "center"
    });
  }

  //// TrackPresentation
  public getTrackNameStyle(oddsAlwaysOn = false): PIXI.TextStyle {
    const style = new PIXI.TextStyle({
      fontFamily: "DIN-RegularItalic",
      fontSize: _s(20),
      letterSpacing: _s(5),
      // padding: _s(5),
      trim: false,
      fill: DogHelper.getBlackColor(),
      align: "center",
      fontStyle: "italic"
    });
    return style;
  }

  public static getBonusHistoryStyles(oddsAlwaysOn = false): IBonusHistoryStyle {
    const idStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(17),
      // letterSpacing: _s(1),
      fill: "white",
      align: "center"
    });

    const timeStyle = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLight",
      fontSize: _s(17),
      fill: "#AAA",
      align: "center"
    });

    const dateStyle = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLight",
      fontSize: _s(17),
      fill: "#AAA",
      align: "center"
    });

    const nameStyle = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLight",
      fontSize: _s(17),
      fill: "#EEE",
      align: "center"
    });

    const amountStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Light",
      fontSize: _s(17),
      fill: "#FFF",
      align: "right"
    });

    const raceStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(10),
      fill: "#888",
      align: "center"
    });

    const raceNumberStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(16),
      letterSpacing: _s(1),
      fill: "white",
      align: "center"
    });

    if (oddsAlwaysOn) {
      raceStyle.fontSize = _s(8);
      raceNumberStyle.fontSize = _s(12);
      amountStyle.fontSize = _s(14);
      nameStyle.fontSize = _s(14);
      dateStyle.fontSize = _s(14);
      idStyle.fontSize = _s(13);
      timeStyle.fontSize = _s(15);
    }

    return { idStyle, timeStyle, dateStyle, nameStyle, amountStyle, raceStyle, raceNumberStyle };
  }
}
