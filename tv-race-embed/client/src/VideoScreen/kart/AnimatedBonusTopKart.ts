import { oddsAlwaysOnBonusTopBarTimings } from "./../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { DynamicMeshRect, DynamicGeometry } from "client/Graphics/DynamicMesh";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t } from "client/Logic/Logic";
import { Util } from "common/Util";
import { IRoundInfo, IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimatedNumber } from "../common/AnimatedNumber";
import { GameLength } from "common/Definitions";

export class AnimatedBonusTopKart extends Group {
  private backgroundRect: DynamicMeshRect;
  private titleText: PIXI.Text;
  private animatedNumber: AnimatedNumber;
  private dg = new DynamicGeometry("Pos2Color", 16, 24);
  private hasBonus = false;
  private gameLength: GameLength;
  private anims: IAnimInterval[] = [];
  private oddsAlwaysOn: boolean;

  public constructor(gameLength: GameLength, oddsAlwaysOn = false) {
    super();

    this.gameLength = gameLength;
    this.backgroundRect = new DynamicMeshRect();
    this.oddsAlwaysOn = oddsAlwaysOn;
    this.backgroundRect.color = 0xffca290e;
    this.backgroundRect.alpha = 1.0;

    this.dg.add(this.backgroundRect);
    this.add(this.dg);

    this.animatedNumber = new AnimatedNumber();
    this.add(this.animatedNumber);
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Medium",
        fontSize: _s(13),
        fill: "white",
        align: "center"
      });
      this.titleText = Logic.createPixiText(style);
      this.titleText.anchor.set(0, 0.5);
      // this.text1.filters = [this.blurFilter];
      this.add(this.titleText);
    }
  }

  public fill(round: IRoundInfo) {
    this.titleText.text = _t("bonus");
    Logic.autoSize(this.titleText, _s(60));
    this.animatedNumber.fill(round.jackpotValue, round.oldJackpotValue);
    this.hasBonus = round.jackpotValue !== undefined;

    this.anims = this.createAnims(this.gameLength);
  }

  public onLayout() {
    this.backgroundRect.width = _s(130.5);
    this.backgroundRect.height = _s(22);

    this.titleText.position.x = _s(5);
    this.titleText.position.y = _s(10.8);

    this.animatedNumber.position.y = _s(10.8);
    this.animatedNumber.setFontSize(_s(13));
  }

  private createAnims(gameLength: GameLength): IAnimInterval[] {
    if (this.oddsAlwaysOn) return oddsAlwaysOnBonusTopBarTimings.kart[this.gameLength as 120 | 240 | 300];
    switch (gameLength) {
      case 120:
      case 180:
        return [{ startTime: 1.15, duration: Logic.getTimeUntilRaceForTimeBar() - 1.15 }];
      case 240:
        return [
          { startTime: 1.15, duration: 140.0 },
          { startTime: 151.0, duration: Logic.getTimeUntilRaceForTimeBar() - 151 }
        ];
      case 300:
        return [
          { startTime: 1.15, duration: 140.0 },
          { startTime: 158.0, duration: Logic.getTimeUntilRaceForTimeBar() - 158 }
        ];
    }
    return [];
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

    if (t < anim.startTime + anim.duration - 2) {
      const f = t - anim.startTime;
      this.backgroundRect.alpha = f * 2;
      this.titleText.alpha = (f - 0.2) * 2;
      this.animatedNumber.alpha = this.titleText.alpha;
    } else {
      const f = -(t - (anim.startTime + anim.duration));
      this.backgroundRect.alpha = f * 2;
      this.titleText.alpha = (f - 0.2) * 2;
      this.animatedNumber.alpha = this.titleText.alpha;
    }
  }

  public getFactor(current: number, startTime: number, endTime: number) {
    const factor = (current - startTime) / (endTime - startTime);
    return Util.clamp(factor, 0, 1);
  }
}
