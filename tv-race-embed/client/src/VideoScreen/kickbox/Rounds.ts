import * as PIXI from "pixi.js";
import { Logic, settings, _s, _t } from "client/Logic/Logic";
//import { MultiStyleText, ITextStyleSet, } from "./../common/MultiStyleText";
import { IDriver, IQuotes } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { LayoutHelper } from "../Util/LayoutHelper";
import { KickboxHelper } from "./KickboxHelper";
import { RoundsDriverRound } from "./RoundsDriverRound";
import { RoundBetBase } from "./RoundBetBase";
import { Settings } from "common/Settings";
import { LanguagesBase } from "client/LogicImplementation/base/LocalisationBase";
import { Util } from "common/Util";

export class Rounds extends RoundBetBase {
  // private isLeft: boolean;

  private tieFighterNumber: PIXI.Text;
  private roundTies: RoundsDriverRound[] = [];
  private fighters: IDriver[] = [];

  public constructor() {
    super(true);
    this.anims = [
      { startTime: 23.9, duration: 12.6 },
      { startTime: 125.1, duration: 12.6 },
      { startTime: 205.5, duration: 12.6 }
    ];

    this.showDebug(settings.debug, undefined, "Rounds");

    const fighterNumberStyle = new PIXI.TextStyle({
      ...KickboxHelper.getFighterNumberStyleProperties(),
      fontSize: _s(56)
    });
    this.tieFighterNumber = Logic.createPixiText(fighterNumberStyle);
    this.tieFighterNumber.anchor.set(0.5, 0.5);
    this.add(this.tieFighterNumber);

    // TIE?
    for (let i = 0; i < 3; i++) {
      this.roundTies.push(new RoundsDriverRound(i !== 1));
      this.add(this.roundTies[i]);
    }
  }

  public fill(titleText: string, drivers: IDriver[], fighterQuotes: IQuotes) {
    super.fill(titleText, drivers, fighterQuotes);

    this.fighters = drivers;

    this.tieFighterNumber.text = "X";
    this.tieFighterNumber.scale.set(0.8, 0.8);
    this.tieFighterNumber.style.fill = KickboxHelper.getGrayTextColor();

    for (let round = 0; round < 3; round++) {
      const quote = fighterQuotes.quotesTie[round];
      this.roundTies[round].fill(_t("round") + " " + (round + 1), Util.formatValue(quote.quote, Settings.kickboxQuotaDecimalPlaces, LanguagesBase.commaSymbol), KickboxHelper.getGrayTextColor());
    }
  }

  // private updateText(
  //   multiText: MultiStyleText,
  //   text: string | undefined,
  //   styles?: ITextStyleSet
  // ) {
  //   if (text) {
  //     if (styles) multiText.styles = styles;
  //     multiText.text = text;
  //     multiText.visible = true;
  //   } else {
  //     multiText.visible = false;
  //   }
  // }

  public onLayout() {
    super.onLayout();
    LayoutHelper.setScaledRectangle(this.roundTies[0], 436, 568, 154, 34);
    LayoutHelper.setScaledRectangle(this.roundTies[1], 688, 568, 154, 34);
    LayoutHelper.setScaledRectangle(this.roundTies[2], 557, 605, 170, 34);

    LayoutHelper.setScaledText(this.tieFighterNumber, 641, 566);
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const baseFactor = t - anim.startTime;

    // set complete group - getAnim gets anims even when they are outside startTime+duration?
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0, 0, 1, (x) => (this.alpha = x), 0, 0);
    // const baseFactor = t - anim.startTime;
    //AnimHelper.animateInOut(baseFactor, 12, 20, 0.5, 0, 1, x => this.tieFighterNumber.alpha = x, 0.5, 0);

    const startOffset = 1.1;

    const additionalEndOffset = 0.0;

    AnimHelper.animateInOut(baseFactor, 0 + startOffset, anim.duration - additionalEndOffset - startOffset, 1, 0, 1, (x) => this.tieFighterNumber.scale.set(x, x), 0.5, 0);
    AnimHelper.animateInOut(baseFactor, 0 + startOffset, anim.duration - additionalEndOffset - startOffset, 0.5, 0, 1, (x) => (this.roundTies[0].alpha = x), 1, 0);
    AnimHelper.animateInOut(baseFactor, 0.1 + startOffset, anim.duration - additionalEndOffset - startOffset, 1, 0, 1, (x) => (this.roundTies[1].alpha = x), 1, 0);
    AnimHelper.animateInOut(baseFactor, 0.2 + startOffset, anim.duration - additionalEndOffset - startOffset, 1, 0, 1, (x) => (this.roundTies[2].alpha = x), 1, 0);

    {
      const start = 5.2;
      const rowOffset = 0.85;
      const duration = 0.7;
      AnimHelper.animateColorInOut(baseFactor, start, start + duration, 0.2, 0, KickboxHelper.getGrayBackgroundColor(), (x) => this.roundTies[0].setColor(x), 0.2, 0);
      AnimHelper.animateColorInOut(baseFactor, start + rowOffset, start + rowOffset + duration, 0.2, 0, KickboxHelper.getGrayBackgroundColor(), (x) => this.roundTies[1].setColor(x), 0.2, 0);
      AnimHelper.animateColorInOut(baseFactor, start + rowOffset * 2, start + rowOffset * 2 + duration, 0.2, 0, KickboxHelper.getGrayBackgroundColor(), (x) => this.roundTies[2].setColor(x), 0.2, 0);
    }
  }
}
