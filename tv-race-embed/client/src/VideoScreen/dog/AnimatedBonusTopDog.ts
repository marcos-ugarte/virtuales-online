import { oddsAlwaysOnBonusTopBarTimings } from "./../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { Util } from "common/Util";
import { IRoundInfo, IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimatedNumber } from "../common/AnimatedNumber";
import { GameType, GameLength } from "common/Definitions";

export class AnimatedBonusTopDog extends Group {
  private titleText: PIXI.Text;
  private animatedNumber: AnimatedNumber;
  private hasBonus = false;
  private anims: IAnimInterval[] = [];

  public constructor(gameType: GameType, gameLength: GameLength) {
    super();

    this.showDebug(settings.debug, 1, "AnimatedBonusTopDog");

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Medium",
        fontSize: _s(12),
        fill: "white",
        align: "center"
      });
      this.animatedNumber = new AnimatedNumber(style);
      this.add(this.animatedNumber);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-LightItalic",
        fontSize: _s(12),
        fill: "white",
        align: "center",
        fontStyle: "italic"
      });
      this.titleText = Logic.createPixiText(style);
      this.titleText.anchor.set(0, 0.5);
      // this.text1.filters = [this.blurFilter];
      this.add(this.titleText);
    }
  }

  private createAnims(gameType: GameType, gameLength: GameLength, hasBonus: boolean, oddsAlwaysOn: boolean): IAnimInterval[] {
    if (gameType === "dog6") {
      if (oddsAlwaysOn) {
        return oddsAlwaysOnBonusTopBarTimings.dog[gameLength as 120 | 240 | 300];
      }
      switch (gameLength) {
        case 120:
          return [
            { startTime: 0.3, duration: 25.2 },
            { startTime: 35.5, duration: Logic.getIntroEndTime() - 35.5 + 0.001 }
          ];
        case 180:
          return [
            { startTime: 0.3, duration: 79.8 },
            { startTime: 90.6, duration: Logic.getIntroEndTime() - 90.6 + 0.001 }
          ];
        case 240:
          return [
            { startTime: 0.3, duration: 136.0 },
            { startTime: 150.2, duration: Logic.getIntroEndTime() - 150.2 + 0.001 }
          ];
        case 300:
          return [
            { startTime: 0.3, duration: 135.3 },
            { startTime: 156.0, duration: Logic.getIntroEndTime() - 156.0 + 0.001 }
          ];
      }
      return [
        { startTime: 0.3, duration: 135.7 },
        { startTime: 150.2, duration: Logic.getIntroEndTime() - 150.2 + 0.001 }
      ];
    } else if (gameType === "dog8") {
      if (oddsAlwaysOn) {
        return oddsAlwaysOnBonusTopBarTimings.dog[gameLength as 120 | 240 | 300];
      }
      // dog8
      switch (gameLength) {
        case 120:
          return [
            { startTime: 0.3, duration: 25.0 },
            { startTime: 34.8, duration: Logic.getIntroEndTime() - 34.8 + 0.001 }
          ];
        case 180:
          return [
            { startTime: 0.3, duration: 79.8 },
            { startTime: 89.9, duration: Logic.getIntroEndTime() - 89.9 + 0.001 }
          ];
        case 240:
          return [
            { startTime: 1.0, duration: 139.2 },
            { startTime: 154.7, duration: Logic.getIntroEndTime() - 154.7 + 0.001 }
          ];
        case 300:
          return [
            { startTime: 0.3, duration: 139.8 },
            { startTime: 159.7, duration: Logic.getIntroEndTime() - 159.7 + 0.001 }
          ];
        case 320:
          return [
            { startTime: 0.3, duration: 149.5 },
            { startTime: 159.5, duration: Logic.getIntroEndTime() - 156.0 + 0.001 }
          ];
        case 384:
          return [
            { startTime: 0.3, duration: 147.8 },
            { startTime: 159.5, duration: Logic.getIntroEndTime() - 159.5 + 0.001 }
          ];
      }
    } else if (gameType === "horse" || gameType === "sulky") {
      if (oddsAlwaysOn) {
        return oddsAlwaysOnBonusTopBarTimings.horse;
      }
      return [
        { startTime: 0.2, duration: 147.7 },
        { startTime: 159.6, duration: Logic.getIntroEndTime() - 156.5 + 0.001 }
      ];
    } else if (gameType === "dog63") {
      if (oddsAlwaysOn) {
        return oddsAlwaysOnBonusTopBarTimings.dog63;
      }
      return [
        { startTime: 0.3, duration: 34 },
        { startTime: 56, duration: 39.8 },
        { startTime: 117.3, duration: 39.8 },
        { startTime: 193.5, duration: 29.5 }
      ];
    }
    return [
      { startTime: 1.0, duration: 143.0 },
      { startTime: 156.5, duration: Logic.getIntroEndTime() - 156.5 + 0.001 }
    ];
  }

  public fill(gameType: GameType, gameLength: GameLength, round: IRoundInfo, oddsAlwaysOn = false) {
    this.titleText.text = _t("bonus");
    Logic.autoSize(this.titleText, _s(100));
    this.animatedNumber.fill(round.jackpotValue, round.oldJackpotValue);
    this.hasBonus = round.jackpotValue !== undefined;
    this.anims = this.createAnims(gameType, gameLength, this.hasBonus, oddsAlwaysOn);
  }

  public onLayout() {
    this.titleText.position.x = _s(-35);
    this.titleText.position.y = _s(11.5);

    this.animatedNumber.position.x = _s(-46);
    this.animatedNumber.position.y = _s(11.5);
    this.animatedNumber.setFontSize(_s(12));
  }

  public update(dt: number) {
    super.update(dt);

    if (!this.hasBonus) {
      this.alpha = 0.0;
      this.visible = false;
      return;
    }
    this.alpha = 1.0;
    this.visible = true;

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    if (t < anim.startTime + anim.duration - 1) {
      const f = t - anim.startTime;
      this.setDebugFade(f * 2);
      this.titleText.alpha = f * 2;
      this.animatedNumber.alpha = this.titleText.alpha;
    } else {
      const f = -(t - (anim.startTime + anim.duration));
      this.setDebugFade(f * 2);
      this.titleText.alpha = f * 3;
      this.animatedNumber.alpha = this.titleText.alpha;
    }
  }

  public getFactor(current: number, startTime: number, endTime: number) {
    const factor = (current - startTime) / (endTime - startTime);
    return Util.clamp(factor, 0, 1);
  }
}
