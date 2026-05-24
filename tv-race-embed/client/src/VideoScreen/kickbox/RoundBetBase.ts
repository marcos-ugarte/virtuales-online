import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, settings, _t } from "client/Logic/Logic";
//import { MultiStyleText, ITextStyleSet, } from "./../common/MultiStyleText";
import { IAnimInterval, IDriver, IQuotes } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { RoundsDriver } from "./RoundsDriver";
import { LayoutHelper } from "../Util/LayoutHelper";
import { KickboxHelper } from "./KickboxHelper";

export class RoundBetBase extends Group {
  // private isLeft: boolean;
  private roundBetText: PIXI.Text;
  protected drivers: RoundsDriver[] = [];

  protected anims: IAnimInterval[] = [];

  public constructor(showRounds: boolean) {
    super();
    this.showDebug(settings.debug, undefined, "Rounds");

    this.roundBetText = Logic.createPixiText(KickboxHelper.getHeaderCenterStyle());
    this.roundBetText.anchor.set(0.5, 0.5);
    //this.add(this.roundBetText); // no header texts

    const driverLeft = new RoundsDriver(true, showRounds);
    this.drivers.push(driverLeft);
    this.add(driverLeft);

    const driverRight = new RoundsDriver(false, showRounds);
    this.drivers.push(driverRight);
    this.add(driverRight);
  }

  public fill(titleText: string, drivers: IDriver[], fighterQuotes: IQuotes) {
    this.roundBetText.text = _t(titleText);

    {
      this.drivers[0].fill(drivers[0], fighterQuotes.fighters[0]);
      this.drivers[1].fill(drivers[1], fighterQuotes.fighters[1]);
    }
  }

  public onLayout() {
    LayoutHelper.setScaledText(this.roundBetText, 645, 44);
    this.roundBetText.x = this.width / 2.0;
    LayoutHelper.setScaledRectangle(this.drivers[0], 165, 430, 416, 168);
    LayoutHelper.setScaledRectangle(this.drivers[1], 1112 - 410, 430, 416, 168);
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);

    if (t > Logic.getIntroLength() && this.alpha > 0) {
      this.alpha = 0;
      for (const driver of this.drivers) {
        driver.visible = false;
      }
      return;
    } else if (t > Logic.getIntroLength() && this.alpha === 0) {
      // this.alpha = 1;
      for (const driver of this.drivers) {
        driver.visible = true;
      }
      return;
    }

    if (!anim) return;

    const baseFactor = t - anim.startTime;

    // set complete group - getAnim gets anims even when they are outside startTime+duration?
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0, 0, 1, (x) => (this.alpha = x), 0, 0);
    // const baseFactor = t - anim.startTime;

    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.5, 0, 1, (x) => (this.roundBetText.alpha = x), 0.5, 0);

    for (const driver of this.drivers) driver.updateAnims(baseFactor, anim.duration);
  }
}
