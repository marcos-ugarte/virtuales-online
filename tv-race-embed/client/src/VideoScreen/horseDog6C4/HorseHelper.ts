import { _s } from "client/Logic/Logic";
import * as PIXI from "pixi.js";
import { ITextStyleSet } from "../common/MultiStyleText";
import { DogHelper } from "../dog/DogHelper";

export class HorseHelper extends DogHelper {
  public override getRacingHistoryTitleStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "DIN-Medium",
      fontSize: _s(22),
      letterSpacing: _s(-0.4),
      fill: DogHelper.getWhiteColor(),
      align: "center"
    });
  }

  public override getRacingHistoryRaceStyle(): PIXI.TextStyle {
    const style = super.getRacingHistoryRaceStyle();
    style.fontSize = _s(11);
    return style;
  }

  // public override getRacingHistoryRaceNumberStyle(): PIXI.TextStyle {
  //   const style = super.getRacingHistoryRaceNumberStyle();
  //   style.letterSpacing = _s(0);
  //   return style;
  // }

  public override getRacingHistoryDriverStyle(): ITextStyleSet {
    const driverNameSize = _s(18);
    return {
      default: {
        fontFamily: "DIN-Regular",
        fill: DogHelper.getWhiteColor(),
        fontSize: driverNameSize,
        valign: "middle",
        letterSpacing: _s(0),
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

  public override getDriverPresentationTitleStyle(): PIXI.TextStyle {
    const style = super.getDriverPresentationTitleStyle();
    style.fontSize = _s(8);
    style.letterSpacing = _s(9);
    return style;
  }

  public override getDriverPresentationNameStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(20),
      letterSpacing: _s(1.4),
      fill: DogHelper.getWhiteColor(),
      align: "center",
      fontStyle: "italic"
    });
  }

  public override getDriverPresentationQuoteStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(22),
      fill: DogHelper.getWhiteColor(),
      align: "right",
      fontStyle: "italic"
    });
  }

  //// TrackPresentation
  public override getTrackNameStyle(): PIXI.TextStyle {
    return new PIXI.TextStyle({
      fontFamily: "DIN-RegularItalic",
      fontSize: _s(20),
      letterSpacing: _s(3.6),
      // padding: _s(5),
      trim: false,
      fill: DogHelper.getBlackColor(),
      align: "center",
      fontStyle: "italic"
    });
  }
}
