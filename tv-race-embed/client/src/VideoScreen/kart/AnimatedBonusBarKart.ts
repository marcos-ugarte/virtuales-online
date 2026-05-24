import { oddsAlwaysOnBonusBarTimings } from "./../../../settings/OddsAlwaysOnSettings";
import { settings } from "./../../Logic/Logic";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, _t } from "client/Logic/Logic";
import { AnimHelper } from "./../common/Anim";
import { IRoundInfo, IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimatedNumber } from "./../common/AnimatedNumber";
import { GameLength } from "common/Definitions";

type Anim = IAnimInterval & { speedFactor?: number };

export class AnimatedBonusBarKart extends Group {
  private animatedNumber: AnimatedNumber;
  private text: PIXI.Text;
  private hasBonus = false;
  private gameLength: GameLength;
  private anims: Anim[] = [];
  private oddsAlwaysOn;

  public constructor(gameLength: GameLength, oddsAlwaysOn = false) {
    super();

    this.showDebug(settings.debug, 1, "AnimatedBonusBarDog");

    this.oddsAlwaysOn = oddsAlwaysOn;
    this.gameLength = gameLength;

    this.animatedNumber = new AnimatedNumber(undefined, this.oddsAlwaysOn);
    this.add(this.animatedNumber);

    const style = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(35),
      fill: "white",
      align: "center",
      fontStyle: "italic"
    });

    if (this.oddsAlwaysOn) style.fontSize = _s(20);
    this.text = Logic.createPixiText(style);
    this.text.anchor.set(0, 0.5);
    this.add(this.text);
  }

  public fill(roundInfo: IRoundInfo) {
    this.text.text = _t("curBonus");
    Logic.autoSize(this.text, _s(400));
    this.animatedNumber.fill(roundInfo.jackpotValue, roundInfo.oldJackpotValue);
    this.hasBonus = roundInfo.jackpotValue !== undefined;

    this.anims = this.createAnims(this.gameLength, this.hasBonus);
  }

  public onLayout() {
    this.text.x = _s(20);
    this.text.y = this.height * 0.5;
    this.animatedNumber.position.x = _s(435);
    if (this.oddsAlwaysOn) this.animatedNumber.position.x = _s(242);
    this.animatedNumber.position.y = this.height * 0.5;
    this.animatedNumber.setFontSize(_s(this.oddsAlwaysOn ? 22 : 30));
  }

  private createAnims(gameLength: GameLength, withBonus: boolean): Anim[] {
    if (this.oddsAlwaysOn) return oddsAlwaysOnBonusBarTimings.kart[gameLength as 120 | 240];
    switch (gameLength) {
      case 120:
        return [{ startTime: 25.9, duration: 8.5 }];
      case 180:
        return [{ startTime: 80.8, duration: 8.5 }];
      case 240:
        return [{ startTime: 135.8, duration: 13.5 }];
      case 300:
        return [{ startTime: 135.2, duration: 19.8, speedFactor: 0.5 }];
    }
    return [];
  }

  public update(dt: number) {
    super.update(dt);

    if (!this.hasBonus) {
      this.alpha = 0.0;
      return;
    }
    this.alpha = 1.0;

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const speedFactor = anim.speedFactor ? anim.speedFactor : 1;
    let baseFactor = t - anim.startTime;
    if (baseFactor > anim.duration - 1.5 / speedFactor) baseFactor = (anim.duration - baseFactor) * speedFactor;
    else baseFactor = baseFactor * speedFactor;
    const fade = AnimHelper.easeOut(AnimHelper.clamp(baseFactor - 0.3, 0, 1));
    this.text.alpha = fade;
    this.animatedNumber.alpha = AnimHelper.easeOut(AnimHelper.clamp(baseFactor - 1.0, 0, 1));
    /*const f1 = AnimHelper.easeOut(AnimHelper.clamp(baseFactor * 2));

    const w = this.height * 0.5;
    this.background.setPositions([
      w * 1 / 3, 0,
      w * 1 / 3 + (this.width - w * 1 / 3) * f1, 0,
      -w * 2 / 3 + (this.width + w * 2 / 3) * f1, this.height,
      -w * 2 / 3, this.height]);*/

    this.alpha = fade;
  }
}
