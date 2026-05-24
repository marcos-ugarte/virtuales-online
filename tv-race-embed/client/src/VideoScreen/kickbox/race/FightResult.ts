import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _t } from "client/Logic/Logic";
import { IAnimInterval, IDriver, IFightInfo } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../common/Anim";
import { LayoutHelper } from "../../Util/LayoutHelper";
import { KickboxHelper } from "./../KickboxHelper";
import { FightResultFighter } from "./FightResultFighter";

export class FightResult extends Group {
  private resultHeader: PIXI.Text;
  private fightResultFighter: FightResultFighter;

  private anims: IAnimInterval[] = [{ startTime: KickboxHelper.fightRoundLength * 3 + KickboxHelper.fightRoundResultLength * 3, duration: KickboxHelper.fightResultLength }];

  public constructor() {
    super();
    //this.showDebug(settings.debug, undefined, "FightResult");

    // TODO: CHECK IF THIS NEEDS TO BE DECONSTRUCTED
    const resultHeaderStyle = new PIXI.TextStyle(KickboxHelper.getHeaderCenterStyle());
    this.resultHeader = Logic.createPixiText(resultHeaderStyle);
    this.resultHeader.anchor.set(0.5, 0.5);
    this.add(this.resultHeader);

    this.fightResultFighter = new FightResultFighter();
    this.add(this.fightResultFighter);
  }

  public fill(fightInfo: IFightInfo, drivers: IDriver[]) {
    //this.anims = [{ startTime: fightInfo.result.startTime, duration: 30 }]

    // TODO: needed?
    //this.resultHeader.text = _t("RESULTS");
    this.fightResultFighter.fill(fightInfo.result, drivers);
    this.onLayout();
  }

  public onLayout() {
    LayoutHelper.setScaledText(this.resultHeader, 645, 44);
    this.resultHeader.x = this.width / 2.0;

    LayoutHelper.setScaledRectangle(this.fightResultFighter, 148, 79, 795, 626);
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getRaceVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const baseFactor = t - anim.startTime;
    this.showDebugTime("FightResult", baseFactor);

    //const baseFactor = t - anim.startTime;

    this.fightResultFighter.updateAnims(baseFactor, anim.duration);

    AnimHelper.animateInOut(t, anim.startTime, anim.startTime + anim.duration, 0, 0, 1, (x) => (this.alpha = x), 0, 0);
    // const baseFactor = t - anim.startTime;
  }
}
