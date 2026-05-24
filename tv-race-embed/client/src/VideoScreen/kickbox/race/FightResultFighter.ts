import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, _t, settings } from "client/Logic/Logic";
import { IDriver, IFightResult } from "client/Logic/LogicDefinitions";
import { KickboxHelper } from "./../KickboxHelper";
import { IExtendedTextStyle, MultiStyleText } from "client/VideoScreen/common/MultiStyleText";
import { FightResultRound } from "./FightResultRound";
import { AnimHelper } from "client/VideoScreen/common/Anim";
import { Settings } from "common/Settings";
import { LanguagesBase } from "client/LogicImplementation/base/LocalisationBase";
import { Util } from "common/Util";

export class FightResultFighter extends Group {
  private fighterNameStartX: number = 0;
  private fighterName: MultiStyleText;
  private fighterNumber: PIXI.Text;
  private quoteStartX: number = 0;
  private quote: PIXI.Text;
  private roundBetText: PIXI.Text;
  private roundBetTextStartX: number = 0;
  private resultBetText: PIXI.Text;
  private resultBetTextStartX: number = 0;
  private resultBetQuote: PIXI.Text;
  private resultBetQuoteStartX: number = 0;
  private roundResult: FightResultRound[] = [];
  private roundResultStartX: number[] = [];

  //private anims: IAnimInterval[] = [{startTime: 37, duration: 32}];

  public constructor() {
    super();
    this.showDebug(settings.debug, undefined, "FightResultFighter");

    this.fighterName = new MultiStyleText();
    this.fighterName.anchor.set(1.0, 0.5);
    this.add(this.fighterName);

    const fighterNumberStyle = new PIXI.TextStyle({
      ...KickboxHelper.getFighterNumberStyleProperties(),
      fontSize: _s(58),
      fill: "white"
    });
    this.fighterNumber = Logic.createPixiText(fighterNumberStyle);
    this.fighterNumber.anchor.set(0.5, 0.5);
    this.add(this.fighterNumber);

    const quoteStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(22),
      fill: "white",
      fontStyle: "italic"
    });
    this.quote = Logic.createPixiText(quoteStyle);
    this.quote.anchor.set(0.5, 0.5);
    this.add(this.quote);

    const roundBetStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(16),
      fill: "white",
      fontStyle: "italic"
    });
    this.roundBetText = Logic.createPixiText(roundBetStyle);
    this.roundBetText.anchor.set(0.0, 0.5);
    this.add(this.roundBetText);

    const resultBetStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(16),
      fill: "white",
      letterSpacing: _s(0),
      fontStyle: "italic"
    });
    this.resultBetText = Logic.createPixiText(resultBetStyle);
    this.resultBetText.anchor.set(0.0, 0.5);
    this.add(this.resultBetText);

    const resultBetQuoteStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(16),
      fill: "white",
      fontStyle: "italic"
    });
    this.resultBetQuote = Logic.createPixiText(resultBetQuoteStyle);
    this.resultBetQuote.anchor.set(1.0, 0.5);
    this.add(this.resultBetQuote);

    for (let i = 0; i < 3; i++) {
      const resultRound = new FightResultRound();
      this.roundResult.push(resultRound);
      this.add(resultRound);
      this.roundResultStartX.push(0);
    }

    // this.anims = [{
    //     startTime: 3,
    //     duration: 9
    // }]
  }

  public fill(fightResult: IFightResult, drivers: IDriver[]): void {
    const fighter = drivers[fightResult.fighter];

    this.resultBetText.text = _t("wgpResultBet");
    this.roundBetText.text = _t("roundBet");

    const defaultStyle: IExtendedTextStyle = {
      fontFamily: "DIN-LightItalic",
      fontSize: _s(20),
      fill: "white",
      // valign: "top",
      maxLines: 1,
      trim: true,
      padding: 10,
      // wordWrap: true,
      // wordWrapWidth: _s(availableWidth) // _s(90)
      fontStyle: "italic"
    };
    const boldStyle: IExtendedTextStyle = {
      fontFamily: "DIN-HeavyItalic",
      fontSize: _s(20),
      fill: "white",
      letterSpacing: _s(1),
      padding: 10,
      trim: true,
      // valign: "bottom",
      fontStyle: "italic"
    };

    const heritageShort = fighter.heritageShort ? fighter.heritageShort : "";
    const fighterNameText = `<b>${fighter.firstName.toUpperCase()} ${fighter.lastName.toUpperCase()}</b> (${heritageShort})`;
    this.fighterName.text = fighterNameText;
    this.fighterName.styles = { default: defaultStyle, b: boldStyle };
    this.fighterName.tint = fighter.color;

    this.fighterNumber.text = "" + (fightResult.fighter + 1);
    this.quote.text = "" + Util.formatValue(fightResult.quote, Settings.kickboxQuotaDecimalPlaces, LanguagesBase.commaSymbol);
    this.resultBetQuote.text = "" + Util.formatValue(fightResult.resultBetQuote, Settings.kickboxQuotaDecimalPlaces, LanguagesBase.commaSymbol);

    if (fighter.color2 !== undefined) {
      this.fighterNumber.tint = fighter.color2;
      this.quote.tint = fighter.color2;
    }

    KickboxHelper.autoSizeMultiStyleText(this.fighterName, fighterNameText, _s(260), { default: defaultStyle, b: boldStyle });
    this.onLayout();

    for (let i = 0; i < this.roundResult.length; i++) this.roundResult[i].fill(i + 1, fightResult.roundResults[i], drivers);
  }

  public onLayout(): void {
    this.fighterName.x = _s(554);
    this.fighterNameStartX = this.fighterName.x;
    this.fighterName.y = _s(339);

    this.fighterNumber.x = _s(605);
    this.fighterNumber.y = _s(356);

    this.quote.x = _s(539);
    this.quoteStartX = this.quote.x;
    this.quote.y = _s(375);

    this.roundBetText.x = _s(365);
    this.roundBetTextStartX = this.roundBetText.x;
    this.roundBetText.y = _s(389);

    this.resultBetText.x = _s(437);
    this.resultBetTextStartX = this.resultBetText.x;
    this.resultBetText.y = _s(503);

    this.resultBetQuote.x = _s(673);
    this.resultBetQuoteStartX = this.resultBetQuote.x;
    this.resultBetQuote.y = _s(503);

    const resultRoundStartX = _s(355);
    const resultRoundStartY = _s(403);
    const resultRoundWidth = _s(295);
    const resultRoundHeight = _s(27);
    const resultRoundOffsetX = _s(16);
    const resultRoundOffsetY = _s(29);
    for (let i = 0; i < 3; i++) {
      const resultRound = this.roundResult[i];
      resultRound.x = resultRoundStartX + resultRoundOffsetX * i;
      resultRound.y = resultRoundStartY + resultRoundOffsetY * i;
      this.roundResultStartX[i] = resultRound.x;
      resultRound.width = resultRoundWidth;
      resultRound.height = resultRoundHeight;
    }

    Logic.autoSize(this.roundBetText, _s(100));
    Logic.autoSize(this.resultBetText, _s(170));
  }

  public updateAnims(baseFactor: number, duration: number): void {
    this.showDebugTime("FightResultFighter", baseFactor);
    //const baseFactor = t - anim.startTime;

    //AnimHelper.animateInOut(t, anim.startTime, anim.startTime+anim.duration, 0, 0, 1, x => this.alpha = x, 0, 0);
    // const baseFactor = t - anim.startTime;

    const additionalTime = 2.4;

    AnimHelper.animateInOut(baseFactor, 4.1, 20.5 + additionalTime, 0.6, 0, 1, (x) => this.fighterNumber.scale.set(x, x), 0.4, 0);

    AnimHelper.animateInOut(baseFactor, 4.3, 20.4 + additionalTime, 0.6, 0, 1, (x) => (this.fighterName.alpha = x), 0.3, 0);
    AnimHelper.animateIn(baseFactor, 4.1, duration, 0.6, this.fighterNameStartX + _s(200), this.fighterNameStartX, (x) => (this.fighterName.x = x));

    AnimHelper.animateInOut(baseFactor, 4.7, 20.2 + additionalTime, 0.3, 0, 1, (x) => (this.quote.alpha = x), 0.2, 0);
    AnimHelper.animateIn(baseFactor, 4.5, duration, 0.5, this.quoteStartX + _s(100), this.quoteStartX, (x) => (this.quote.x = x));

    AnimHelper.animateInOut(baseFactor, 4.8, 19.9 + additionalTime, 0.2, 0, 1, (x) => (this.roundBetText.alpha = x), 0.2, 0);
    AnimHelper.animateIn(baseFactor, 4.7, duration, 0.4, this.roundBetTextStartX - _s(100), this.roundBetTextStartX, (x) => (this.roundBetText.x = x));

    AnimHelper.animateInOut(baseFactor, 5.8, 19.18 + additionalTime, 0.3, 0, 1, (x) => (this.resultBetText.alpha = x), 0.3, 0);
    AnimHelper.animateIn(baseFactor, 5.7, duration, 0.5, this.resultBetTextStartX - _s(100), this.resultBetTextStartX, (x) => (this.resultBetText.x = x));

    AnimHelper.animateInOut(baseFactor, 5.9, 19.18 + additionalTime, 0.3, 0, 1, (x) => (this.resultBetQuote.alpha = x), 0.3, 0);
    AnimHelper.animateIn(baseFactor, 5.9, duration, 1.0, this.resultBetQuoteStartX - _s(30), this.resultBetQuoteStartX, (x) => (this.resultBetQuote.x = x));

    const timeOffset = 0.3;
    const fadeOutTimeOffset = 0.15;
    for (let i = 0; i < this.roundResult.length; i++) {
      this.roundResult[i].updateAnims(baseFactor - 4.8 - timeOffset * i, 19.2);
      AnimHelper.animateIn(baseFactor, baseFactor - 4.8 - timeOffset * i, duration, 1.0, this.roundResultStartX[i] - _s(50), this.roundResultStartX[i], (x) => (this.roundResult[i].x = x));
      AnimHelper.animateInOut(baseFactor, baseFactor - 4.8 - timeOffset * i, 19.6 - fadeOutTimeOffset * i + additionalTime, 0, 0, 1, (x) => (this.roundResult[i].alpha = x), 0.2, 0);
    }

    // AnimHelper.animateColorInOut(baseFactor, 14.8, 16.5, 0.3, 0xFFFFFFFF, 0x46424B, x => {
    //   this.resultBetText.tint = x;
    //   ///this.resultBetQuote.tint = x;
    // }, 0.5, 0xFFFFFFFF);

    // AnimHelper.animateColorInOut(baseFactor, 14.8, 16.5, 0.3, 0xFFFFFFFF, 0x000000, x => {
    //   //this.resultBetText.tint = x;
    //   this.resultBetQuote.tint = x;
    // }, 0.5, 0xFFFFFFFF);

    AnimHelper.animateColorInOut(baseFactor, 14.8, 16.5, 0.5, 0xffffff, 0x000000, (x) => (this.resultBetText.tint = x), 0.5, 0xffffff);
    AnimHelper.animateColorInOut(baseFactor, 14.8, 16.5, 0.5, 0xffffff, 0x000000, (x) => (this.resultBetQuote.tint = x), 0.5, 0xffffff);
  }
}
