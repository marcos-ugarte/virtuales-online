import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, settings, _s, _t } from "client/Logic/Logic";
import { IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../common/Anim";
import { LayoutHelper } from "../../Util/LayoutHelper";
import { KickboxHelper } from "./../KickboxHelper";
import { WipeAnim } from "../WipeAnim";

export class FadeToResult extends Group {
  private anims: IAnimInterval[] = [
    {
      startTime: KickboxHelper.fightRoundLength - 0.95,
      duration: 1
    },
    { startTime: KickboxHelper.fightRoundLength * 2 + KickboxHelper.fightRoundResultLength - 0.95, duration: 1 },
    { startTime: KickboxHelper.fightRoundLength * 3 + KickboxHelper.fightRoundResultLength * 2 - 0.95, duration: 1 }
  ];

  private wipeAnim: WipeAnim;

  public constructor() {
    super();
    this.wipeAnim = new WipeAnim(false, Logic.gameInfo?.additionalTextures?.resultBackgroundTexture, true);
    this.add(this.wipeAnim);
    this.showDebug(settings.debug, undefined, "WipeAnim");
  }

  public fill() {
    //
    this.onLayout();
  }

  public onLayout() {
    this.wipeAnim.width = _s(1280);
    this.wipeAnim.height = _s(720);
    this.wipeAnim.x = 0;
    this.wipeAnim.y = 0;
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getRaceVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim || t > anim.startTime + anim.duration || t < anim.startTime) {
      this.wipeAnim.alpha = 0;
      //this.wipeAnim.visible = false;
      this.setDebugFade(0);
      return;
    }

    this.wipeAnim.alpha = 1;
    //this.wipeAnim.visible = true;
    const baseFactor = t - anim.startTime;
    this.setDebugFade(baseFactor);
    this.wipeAnim.updateAnims(baseFactor * 1.9);
  }
}
