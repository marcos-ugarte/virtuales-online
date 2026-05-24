import { Logic, _s } from "client/Logic/Logic";
import * as PIXI from "pixi.js";
import { ITextStyleSet, MultiStyleText } from "../common/MultiStyleText";

export class KickboxHelper {
  private static blueColor = "0x3da7ad";
  private static redColor = "0x9b1b12";
  private static blueColorNumber = 0x3da7ad;
  private static redColorNumber = 0x9b1b12;
  private static grayBackgroundColor = 0xaeaeb0;
  private static grayTextColor = "0x46424B";
  private static grayTextColorNumber = 0x46424b;

  private static headerCenterStyle: PIXI.TextStyle;
  private static roundTextStyleProperties: any;
  private static roundValueStyleProperties: any;
  private static roundPlaceStyleProperties: any;
  private static fighterNumberStyle: any;

  public static fightRoundLength = 28;
  public static fightRoundResultLength = 6;
  public static fightResultLength = 26.8; //30.848;

  public static getBlueColor(): string {
    return this.blueColor;
  }
  public static getRedColor(): string {
    return this.redColor;
  }
  public static getBlueColorNumber(): number {
    return this.blueColorNumber;
  }
  public static getRedColorNumber(): number {
    return this.redColorNumber;
  }
  public static getGrayBackgroundColor(): number {
    return this.grayBackgroundColor;
  }
  public static getGrayTextColor(): string {
    return this.grayTextColor;
  }
  public static getGrayTextColorNumber(): number {
    return this.grayTextColorNumber;
  }

  public static getHeaderCenterStyle(): PIXI.TextStyle {
    if (!this.headerCenterStyle) {
      this.headerCenterStyle = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(36),
        fill: "orange", // overwritten when filling in infos,
        letterSpacing: 0.0,
        fontStyle: "italic"
      });
    }
    return this.headerCenterStyle;
  }

  public static getWhiteColor(): string {
    return "white";
  }

  public static getRoundTextStyleProperties(): any {
    if (!this.roundTextStyleProperties)
      this.roundTextStyleProperties = {
        fontFamily: "DIN-RegularItalic",
        fontSize: _s(24),
        valign: "top",
        maxLines: 1,
        fontStyle: "italic",
        fill: "white"
      };
    return this.roundTextStyleProperties;
  }
  public static getRoundValueStyleProperties(): any {
    if (!this.roundValueStyleProperties)
      this.roundValueStyleProperties = {
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(22),
        letterSpacing: _s(1),
        valign: "bottom",
        fontStyle: "italic",
        fill: "white"
      };
    return this.roundValueStyleProperties;
  }

  public static getRoundPlaceStyleProperties(): any {
    if (!this.roundPlaceStyleProperties)
      this.roundPlaceStyleProperties = {
        fontFamily: "DIN-Bold",
        fontSize: _s(70),
        fill: "white" // overwritten when filling in info
      };
    return this.roundPlaceStyleProperties;
  }

  public static getFighterNumberStyleProperties(): any {
    if (!this.fighterNumberStyle)
      this.fighterNumberStyle = {
        fontFamily: "DIN-Bold",
        fontSize: _s(70),
        fill: "white" // overwritten when filling in info
      };
    return this.fighterNumberStyle;
  }

  public static autoSizeMultiStyleText(multiText: MultiStyleText, text: string | undefined, targetWidth: number, styles?: ITextStyleSet): void {
    if (text) {
      if (styles) multiText.styles = styles;
      multiText.text = text;
      multiText.visible = true;
      if (styles) {
        // super hacky - resize the multitext according to the default font - working here because they have neary the same letterdistance
        // and the same fontsize
        // set the fontSize in the styleset
        Logic.autoSize(multiText, targetWidth);
        styles.b.fontSize = multiText.style.fontSize;
        styles.default.fontSize = multiText.style.fontSize;
        multiText.styles = styles;
        multiText.text = text;
        //multiText.updateText();
      }
      // if (styles)
      //   styles.default.fontSize = multiText.style.fontSize;
    } else {
      multiText.visible = false;
    }
  }

  // public static doRoundsAnim(isLeft: boolean, element: Group){

  // }
}
