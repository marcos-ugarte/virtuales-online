import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, settings, _t } from "client/Logic/Logic";
import { IAnimInterval, IDriver, IFightInfo, IFightRoundResult } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../common/Anim";
import { KickboxHelper } from "./../KickboxHelper";
import { IExtendedTextStyle, ITextStyleSet, MultiStyleText } from "client/VideoScreen/common/MultiStyleText";
import { Settings } from "common/Settings";
import { LanguagesBase } from "client/LogicImplementation/base/LocalisationBase";
import { Util } from "common/Util";

export class RoundResult extends Group {
  private fighterName: MultiStyleText;
  private fighterNumber: PIXI.Text;
  private quote: PIXI.Text;

  // private anims: IAnimInterval[] = [
  //   {startTime: KickboxHelper.fightRoundLength, duration: KickboxHelper.fightRoundResultLength},
  //   {startTime: KickboxHelper.fightRoundLength*2, duration: KickboxHelper.fightRoundResultLength}
  // ];
  private fightInfo?: IFightInfo = undefined;
  private roundResults: IFightRoundResult[] = [];

  // private driver1TextStyle: ITextStyleSet = {};
  // private driver2TextStyle: ITextStyleSet = {};
  // private drawTextStyle: ITextStyleSet = {};

  private drivers: IDriver[] = [];

  public constructor() {
    super();
    this.showDebug(settings.debug, undefined, "RoundResult");

    this.fighterName = new MultiStyleText();
    this.fighterName.anchor.set(1.0, 0.5);
    this.add(this.fighterName);

    const fighterNumberStyle = new PIXI.TextStyle({
      ...KickboxHelper.getFighterNumberStyleProperties()
    });

    this.fighterNumber = Logic.createPixiText(fighterNumberStyle);
    this.fighterNumber.anchor.set(0.5, 0.5);
    this.add(this.fighterNumber);

    const quoteStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(28),
      fill: "white",
      fontStyle: "italic"
    });
    this.quote = Logic.createPixiText(quoteStyle);
    this.quote.anchor.set(0.0, 0.5);
    this.add(this.quote);

    // this.anims = [{
    //     startTime: 3,
    //     duration: 9
    // }]
  }

  public fill(fightInfo: IFightInfo, drivers: IDriver[]) {
    this.roundResults = fightInfo.roundResults;
    this.drivers = drivers;
    this.fightInfo = fightInfo;

    const driver = drivers[0];

    this.fighterNumber.text = "2";
    if (driver.color2 !== undefined) {
      this.fighterNumber.tint = driver.color2;
      this.quote.tint = driver.color2;
    }
    this.fighterNumber.roundPixels = false;
    // Quotes get filled by setRoundInfo
    this.quote.text = "-";

    this.quote.roundPixels = false;

    const defaultStyle: IExtendedTextStyle = {
      fontFamily: "DIN-LightItalic",
      fontSize: _s(24),
      fill: "white",
      // valign: "top",
      trim: true,
      padding: 10,
      maxLines: 1,
      // wordWrap: true,
      // wordWrapWidth: _s(availableWidth) // _s(90)
      fontStyle: "italic"
    };

    const boldStyle: IExtendedTextStyle = {
      fontFamily: "DIN-HeavyItalic",
      fontSize: _s(24),
      letterSpacing: _s(0.3),
      fill: "white",
      trim: true,
      padding: 10,
      // valign: "bottom",
      fontStyle: "italic"
    };

    this.fighterName.styles = { default: defaultStyle, b: boldStyle };

    this.setRoundInfo(0);

    this.onLayout();
  }

  public setRoundInfo(round: number): void {
    const currentRound = this.roundResults[round];

    if (currentRound.fighter > 1 || currentRound.fighter < 0) {
      this.fighterName.tint = KickboxHelper.getGrayBackgroundColor();
      this.fighterName.text = "<b>" + _t("wgpDraw") + "</b>";
      //this.fighterNumber.text = "✖";
      this.fighterNumber.text = "X";
      this.fighterNumber.scale.set(0.8, 0.8);
      this.fighterName.roundPixels = false;

      this.fighterNumber.tint = 0;
      this.quote.tint = 0;
    } else {
      const driver = this.drivers[currentRound.fighter];
      this.fighterName.tint = driver.color;
      if (driver.color2 !== undefined) {
        this.fighterNumber.tint = driver.color2;
        this.quote.tint = driver.color2;
      }
      let heritageString = "";
      if (driver.heritageShort) heritageString = `(${driver.heritageShort})`;
      this.fighterName.text = `<b>${driver.firstName.toUpperCase()} ${driver.lastName.toUpperCase()}</b> ${heritageString}`;
      {
        const defaultStyle: IExtendedTextStyle = {
          fontFamily: "DIN-LightItalic",
          fontSize: _s(24),
          fill: "white",
          // valign: "top",
          trim: true,
          padding: 10,
          maxLines: 1,
          // wordWrap: true,
          // wordWrapWidth: _s(availableWidth) // _s(90)
          fontStyle: "italic"
        };

        const boldStyle: IExtendedTextStyle = {
          fontFamily: "DIN-HeavyItalic",
          fontSize: _s(24),
          letterSpacing: _s(0.3),
          fill: "white",
          trim: true,
          padding: 10,
          // valign: "bottom",
          fontStyle: "italic"
        };
        KickboxHelper.autoSizeMultiStyleText(this.fighterName, this.fighterName.text, _s(350), { default: defaultStyle, b: boldStyle });
      }
      this.fighterNumber.text = "" + (currentRound.fighter + 1);
      this.fighterNumber.scale.set(1, 1);
    }
    if (this.fightInfo) this.quote.text = Util.formatValue(this.fightInfo.result.roundResults[round].quote, Settings.kickboxQuotaDecimalPlaces, LanguagesBase.commaSymbol);

    Logic.autoSize(this.quote, _s(55));
  }

  private fighterNameStartX: number = 0;
  private quoteStartX: number = 0;

  public onLayout() {
    const scaledOffsetX = _s(-795 / 2 - 96);
    const scaledOffsetY = _s(-426 / 2 - 72);

    this.fighterName.x = _s(422) + scaledOffsetX;
    this.fighterNameStartX = this.fighterName.x;
    this.fighterName.y = _s(344) + scaledOffsetY;

    this.fighterNumber.x = _s(478) + scaledOffsetX;
    this.fighterNumber.y = _s(363) + scaledOffsetY;

    this.quote.x = _s(376) + scaledOffsetX;
    this.quoteStartX = this.quote.x;
    this.quote.y = _s(386) + scaledOffsetY;
  }

  public updateAnims(baseFactor: number, duration: number) {
    this.showDebugTime("RoundResult", baseFactor);

    AnimHelper.animateInOut(baseFactor, 0, duration, 0, 0, 1, (x) => (this.alpha = x), 0, 0);
    // const baseFactor = t - anim.startTime;

    // const centerX = _s(529);
    // const centerY = _s(274);

    // var scaledLeft = _s(148);
    // var scaledTop = _s(79);

    // const scaledWidth = _s(795);
    // const scaledHeight = _s(426);

    const scaleDuration = duration;
    const from = 0.85;
    const to = 1.09;

    AnimHelper.animateIn(baseFactor, -0.3, duration * 2, duration * 2, from, from + (to - from) * 1.2, (x) => this.container.scale.set(x, x));

    AnimHelper.animateIn(baseFactor, 1.2, 1, 1, 0, 1, (x) => this.fighterNumber.scale.set(x, x));
    AnimHelper.animateInOut(baseFactor, 0.3, duration - 0.3, 0, 1, 1, (x) => (this.fighterNumber.alpha = x), 0.1, 0);

    AnimHelper.animateIn(baseFactor, 1.5, duration, 0.2, _s(300), 0, (x) => (this.fighterName.x = this.fighterNameStartX + x));
    AnimHelper.animateInOut(baseFactor, 1.5, duration - 0.2, 0.3, 0, 1, (x) => (this.fighterName.alpha = x), 0.5, 0);

    AnimHelper.animateIn(baseFactor, 1.7, duration, 0.2, _s(100), 0, (x) => (this.quote.x = this.quoteStartX + x));
    AnimHelper.animateInOut(baseFactor, 1.75, duration - 0.2, 0.3, 0, 1, (x) => (this.quote.alpha = x), 0.5, 0);
  }
}
