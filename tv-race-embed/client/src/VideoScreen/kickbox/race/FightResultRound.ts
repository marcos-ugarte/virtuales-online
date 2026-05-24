import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, _t, settings } from "client/Logic/Logic";
import { IAnimInterval, IDriver, IFightResultRound } from "client/Logic/LogicDefinitions";
import { Sprite } from "pixi.js";
import { AnimHelper } from "client/VideoScreen/common/Anim";
import { KickboxHelper } from "../KickboxHelper";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { Settings } from "common/Settings";
import { LanguagesBase } from "client/LogicImplementation/base/LocalisationBase";
import { Util } from "common/Util";

export class FightResultRound extends Group {
  private roundNumber = 0;
  private roundText: PIXI.Text;
  private roundBackground: Sprite;
  private fighterNumber: PIXI.Text;
  private fighterName: PIXI.Text;
  private quote: PIXI.Text;

  private darkGray = 0x141414;

  private anims: IAnimInterval[] = [{ startTime: 37, duration: 32 }];

  public constructor() {
    super();
    this.showDebug(settings.debug, undefined, "R");

    const grayTextColor = this.darkGray; //  KickboxHelper.getGrayTextColorNumber();

    const roundTextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(16),
      fill: "white",
      fontStyle: "italic"
    });
    this.roundText = Logic.createPixiText(roundTextStyle);
    this.roundText.anchor.set(0.0, 0.5);
    this.roundText.tint = grayTextColor;
    this.add(this.roundText);

    const backgroundTexture = DrawHelper.createNGonTexture(13, 6, "white");
    this.roundBackground = new PIXI.Sprite(backgroundTexture); // TODO: NGon-Texture
    this.roundBackground.anchor.set(0.5, 0.5);

    this.add(this.roundBackground);

    const fighterNumberStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(17),
      fill: "white",
      fontStyle: "italic"
    });
    this.fighterNumber = Logic.createPixiText(fighterNumberStyle);
    this.fighterNumber.anchor.set(0.0, 0.5);
    this.add(this.fighterNumber);

    const fighterNameStyle = new PIXI.TextStyle({
      fontFamily: "DIN-LightItalic",
      fontSize: _s(15),
      letterSpacing: _s(0),
      fill: "white",
      fontStyle: "italic"
    });
    this.fighterName = Logic.createPixiText(fighterNameStyle);
    this.fighterName.tint = grayTextColor;
    this.fighterName.anchor.set(0.0, 0.5);
    this.add(this.fighterName);

    const quoteStyle = new PIXI.TextStyle({
      fontFamily: "DIN-RegularItalic",
      fontSize: _s(16),
      fill: "white",
      fontStyle: "italic"
    });
    this.quote = Logic.createPixiText(quoteStyle);
    this.quote.tint = grayTextColor;
    this.quote.anchor.set(1.0, 0.5);
    this.add(this.quote);
  }

  public fill(roundNumber: number, round: IFightResultRound, drivers: IDriver[]) {
    this.roundNumber = roundNumber;
    this.roundText.text = _t("roundShort") + roundNumber;

    // draw result
    if (round.fighter >= 2 || round.fighter < 0) {
      this.fighterNumber.text = "X"; // "✖";

      this.fighterNumber.scale.set(0.8, 0.8);
      this.fighterName.text = `DRAW`;
      this.fighterNumber.tint = this.darkGray; //  KickboxHelper.getGrayTextColorNumber();
      this.roundBackground.tint = KickboxHelper.getGrayBackgroundColor();
    } else {
      this.fighterNumber.scale.set(1, 1);
      this.fighterNumber.text = "" + (round.fighter + 1);
      this.fighterName.text = `${drivers[round.fighter].firstName.toUpperCase()} ${drivers[round.fighter].lastName.toUpperCase()}`;
      this.roundBackground.tint = drivers[round.fighter].color;
      const fighterColor2 = drivers[round.fighter].color2;
      this.fighterNumber.tint = fighterColor2 ? fighterColor2 : 0;
    }

    this.quote.text = "" + Util.formatValue(round.quote, Settings.kickboxQuotaDecimalPlaces, LanguagesBase.commaSymbol);

    Logic.autoSize(this.fighterName, _s(120));
    this.onLayout();
  }

  public onLayout() {
    const yOffset = _s(13);
    this.roundText.x = _s(26);
    this.roundText.y = yOffset;

    if (this.fighterNumber.text === "X") this.fighterNumber.x = _s(55);
    else this.fighterNumber.x = _s(54);

    this.fighterNumber.y = yOffset;

    this.roundBackground.x = _s(59);
    this.roundBackground.y = yOffset;
    // this.roundBackground.width = _s(6);
    // this.roundBackground.height = _s(6);

    this.fighterName.x = _s(79);
    this.fighterName.y = yOffset;

    this.quote.x = _s(272);
    this.quote.y = yOffset;
  }

  public updateAnims(baseFactor: number, duration: number) {
    this.showDebugTime("R", baseFactor);
    AnimHelper.animateIn(baseFactor, 0, duration, 0.6, 0, 1, (x) => {
      this.fighterName.alpha = x;
      this.fighterNumber.alpha = x;
      this.roundText.alpha = x;
      this.quote.alpha = x;
      this.roundBackground.alpha = x;
    });

    AnimHelper.animateIn(baseFactor, 0, duration, _s(0.6), 0, _s(1), (x) => this.roundBackground.scale.set(x, x));

    const roundNumberOffset = (this.roundNumber - 1) * 1.7;
    // gray color not used? 0x46424B

    AnimHelper.animateColorInOut(
      baseFactor,
      4 + roundNumberOffset,
      5.7 + roundNumberOffset,
      0.5,
      this.darkGray,
      0xffffff,
      (x) => {
        this.fighterName.tint = x;
        //this.quote.tint = x;
      },
      0.5,
      0x46424b
    );

    AnimHelper.animateColorInOut(
      baseFactor,
      4 + roundNumberOffset,
      5.7 + roundNumberOffset,
      0.5,
      0x000000,
      0xffffff,
      (x) => {
        //this.fighterName.tint = x;
        this.quote.tint = x;
      },
      0.5,
      0x000000
    );
  }
}
