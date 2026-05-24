import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, settings, _t } from "client/Logic/Logic";
import { MultiStyleText, ITextStyleSet } from "./../common/MultiStyleText";
import { IDriver, IFighterQuotes } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { RoundsDriverRound } from "./RoundsDriverRound";
import { KickboxHelper } from "./KickboxHelper";
import { Settings } from "common/Settings";
import { LanguagesBase } from "client/LogicImplementation/base/LocalisationBase";
import { Util } from "common/Util";

export class RoundsDriver extends Group {
  private isLeft: boolean;

  private name: MultiStyleText;
  private fighterNumber: PIXI.Text;

  private fighter: IDriver | undefined;

  public winnerQuote: PIXI.Text;
  private rounds: RoundsDriverRound[] = [];

  //private quote: PIXI.Text;

  public constructor(isLeft: boolean, showRounds: boolean) {
    super();
    this.showDebug(settings.debug, undefined, "DriverPresentationRounds");
    this.isLeft = isLeft;

    this.name = new MultiStyleText();
    this.name.anchor.set(this.isLeft ? 1.0 : 0.0, 0.5);
    this.add(this.name);

    const fighterNumberStyle = new PIXI.TextStyle({
      ...KickboxHelper.getFighterNumberStyleProperties(),
      fontSize: _s(60)
    });

    this.fighterNumber = Logic.createPixiText(fighterNumberStyle);
    this.fighterNumber.anchor.set(0.5, 0.5);
    this.add(this.fighterNumber);

    for (let line = 0; line < 3; line++) {
      this.rounds.push(new RoundsDriverRound(isLeft));
      if (!showRounds) this.rounds[line].visible = false;
      this.add(this.rounds[line]);
    }

    this.winnerQuote = Logic.createPixiText(new PIXI.TextStyle(KickboxHelper.getRoundValueStyleProperties()));
    this.winnerQuote.anchor.set(this.isLeft ? 1.0 : 0.0, 0.5);
    if (showRounds) this.winnerQuote.visible = false;
    this.add(this.winnerQuote);

    // this.anims = [{
    //     startTime: 3,
    //     duration: 9
    // }]
  }

  public fill(driver: IDriver, fighterQuotes: IFighterQuotes) {
    {
      this.fighter = driver;

      const heritageShort = driver.heritageShort ? driver.heritageShort : "";
      const driverText = `<b>${driver.firstName.toUpperCase()} ${driver.lastName.toUpperCase()}</b> (${heritageShort})`;
      this.name.text = driverText;
      this.fighterNumber.text = this.isLeft ? "1" : "2";
      if (driver.color2 !== undefined) this.fighterNumber.tint = driver.color2;
      {
        const nameStyleDefault = new PIXI.TextStyle({
          fontFamily: "DIN-HeavyItalic",
          fontSize: _s(20),
          fill: driver.color,
          fontStyle: "italic"
        });
        const nameStyleHeritage = new PIXI.TextStyle({
          fontFamily: "DIN-UltraLightItalic",
          fontSize: _s(20),
          fill: driver.color,
          fontStyle: "italic"
        });
        this.name.styles = { default: nameStyleHeritage, b: nameStyleDefault };
        KickboxHelper.autoSizeMultiStyleText(this.name, driverText, _s(340), { default: nameStyleHeritage, b: nameStyleDefault });
      }

      this.winnerQuote.text = Util.formatValue(fighterQuotes.winnerBet, Settings.kickboxQuotaDecimalPlaces, LanguagesBase.commaSymbol);
      if (driver.color2 !== undefined) this.winnerQuote.tint = driver.color2;

      for (let i = 0; i < 3; i++) {
        const quote = fighterQuotes.rounds[i];
        this.rounds[i].fill(_t("round") + " " + (i + 1), Util.formatValue(quote.quote, Settings.kickboxQuotaDecimalPlaces, LanguagesBase.commaSymbol), driver.color2);
      }

      this.onLayout();
    }
  }

  private updateText(multiText: MultiStyleText, text: string | undefined, styles?: ITextStyleSet) {
    if (text) {
      if (styles) multiText.styles = styles;
      multiText.text = text;
      multiText.visible = true;
    } else {
      multiText.visible = false;
    }
  }

  public onLayout() {
    const xOffset = this.isLeft ? 0 : this.width;

    this.name.x = xOffset + _s(this.isLeft ? 320 : -330);
    this.name.y = _s(-15);

    this.fighterNumber.x = xOffset + (this.isLeft ? _s(372) : _s(-376));
    this.fighterNumber.y = _s(3);

    this.winnerQuote.x = xOffset + _s(this.isLeft ? 325 : -326);
    this.winnerQuote.y = _s(22);

    const offsetX = this.isLeft ? _s(20) : _s(-20);
    const offsetY = _s(34);
    const startX = xOffset + _s(this.isLeft ? 172 : -327);
    const startY = _s(5);
    const spacing = _s(3);

    let line = 0;
    for (const round of this.rounds) {
      round.x = startX + line * offsetX;
      round.y = startY + line * offsetY + spacing * line;
      round.height = _s(34);
      round.width = _s(154);
      line++;
    }
  }

  public updateAnims(baseFactor: number, duration: number) {
    AnimHelper.animateInOut(0, 0, duration, 0, 0, 1, (x) => (this.alpha = x), 0, 0);

    AnimHelper.animateInOut(baseFactor, 0, duration, 0, 0, 1, (x) => (this.alpha = x), 0, 0);

    AnimHelper.animateInOut(baseFactor, 0.3, duration - 0.2, 1, 0, 1, (x) => this.fighterNumber.scale.set(x, x), 1, 0);
    AnimHelper.animateInOut(baseFactor, 0.7, duration - 0.5, 1, 0, 1, (x) => (this.winnerQuote.alpha = x), 0, 0);
    AnimHelper.animateInOut(baseFactor, 0.7, duration - 0.2, 1, 0, 1, (x) => (this.name.alpha = x), 0, 0);

    this.showDebugTime("Rounds", baseFactor);

    let row = 0;
    for (const round of this.rounds) {
      AnimHelper.animateInOut(baseFactor, 0 + row * 0.3, duration - row * 0.6, 1, 0, 1, (x) => (round.alpha = x), 1, 0);

      if (this.fighter && this.fighter.color2 !== undefined) {
        const start = 5.2 + row * 0.85;
        AnimHelper.animateColorInOut(baseFactor, start, start + 0.7, 0.2, this.fighter.color2, this.fighter.color, (x) => round.setColor(x), 0.2, this.fighter.color2);
      }
      row++;
    }

    // const baseFactor = t - anim.startTime;
  }
}
