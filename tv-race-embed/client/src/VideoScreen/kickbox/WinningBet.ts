import { Logic, settings } from "client/Logic/Logic";
//import { MultiStyleText, ITextStyleSet, } from "./../common/MultiStyleText";
import { AnimHelper } from "../common/Anim";
import { RoundBetBase } from "./RoundBetBase";
import { IDriver, IQuotes } from "client/Logic/LogicDefinitions";

export class WinningBet extends RoundBetBase {
  // private isLeft: boolean;

  private fighters: IDriver[] = [];

  public constructor() {
    super(false);
    this.anims = [
      { startTime: 13, duration: 10 },
      { startTime: 114, duration: 10 },
      { startTime: 195, duration: 10 }
    ];

    this.showDebug(settings.debug, undefined, "Rounds");
  }

  public fill(titleText: string, drivers: IDriver[], fighterQuotes: IQuotes) {
    super.fill(titleText, drivers, fighterQuotes);

    this.fighters = drivers;
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
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const baseFactor = t - anim.startTime;

    // set complete group - getAnim gets anims even when they are outside startTime+duration?
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0, 0, 1, (x) => (this.alpha = x), 0, 0);

    for (let i = 0; i < this.fighters.length; i++) {
      const fighter = this.fighters[i];
      if (fighter.color2 !== undefined) {
        const start1 = 3.6;
        const start2 = 5.4;
        const fadeTime = 0.3;
        const duration = 0.6;
        if (baseFactor < start1 + duration)
          AnimHelper.animateColorInOut(baseFactor, start1, start1 + duration, fadeTime, fighter.color2, fighter.color, (x) => (this.drivers[i].winnerQuote.tint = x), fadeTime, fighter.color2);
        else if (baseFactor < start2 + duration)
          AnimHelper.animateColorInOut(
            baseFactor,
            start2,
            start2 + duration,
            fadeTime,
            fighter.color2,
            fighter.color,
            (x) => {
              this.drivers[i].winnerQuote.tint = x;
            },
            fadeTime,
            fighter.color2
          );
      }
    }
  }
}
