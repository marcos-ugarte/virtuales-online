import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { DynamicMesh } from "client/Graphics/DynamicMesh";
//import { GameType } from "common/Definitions";
import { WipeAnim } from "../kickbox/WipeAnim";
import { Logic } from "client/Logic/Logic";

interface ITexDescription {
  type: "round";
  tex: PIXI.Texture;
  radius: number;
}

export class FadeVideoKickBox extends Group {
  //private gameType: GameType;

  private wipeAnim: WipeAnim;

  public constructor() {
    // gameType: GameType
    super();

    //this.gameType = gameType;

    this.wipeAnim = new WipeAnim(false, Logic.gameInfo?.additionalTextures?.wipeBackgroundTexture);
    this.add(this.wipeAnim);
  }

  public onLayout() {
    //LayoutHelper.setScaledRectangle(this.wipeAnim, 0, 0, 1280, 720);
    this.wipeAnim.onLayout();
  }

  public update(dt: number) {
    super.update(dt);
  }

  public getTotalFadeDuration(): number {
    return 2.2;
  }

  public getVideoFadeDuration(): number {
    return this.getTotalFadeDuration() * 0.5;
  }

  public setFadeX(inFactor: number, overlayImage: DynamicMesh, force?: boolean) {
    // inFactor runs from 1 --> 0

    const visible = inFactor <= 0 || inFactor >= 1.0 ? false : true;
    const f = 1 - inFactor;

    this.wipeAnim.visible = visible;

    //overlayImage.setPositions([0, 0, 0, 0, 0, this.height, 0, this.height]);

    if (visible) {
      this.wipeAnim.updateAnims(f * 6);
      if (f >= 0.5) {
        if (!Logic.isVideoPlaying()) {
          overlayImage.alpha = 1;
          overlayImage.setPositions([0, 0, this.width, 0, this.width, this.height, 0, this.height]);
          overlayImage.setUvs([0, 0, 1, 0, 1, 1, 0, 1]);
        }
      } else {
        overlayImage.alpha = 0;
      }
    }

    // update overlay image
    // const fo = Math.max((1.0 - fxFactor) * 1.25 - 0.1); // * 0.8 + 0.1;
    // if ((this as any).lastFx !== fo || force) {
    //   const dx = this.getDx();

    //   overlayImage.setUvs([0, 0, fo, 0, fo + dx / this.width, 1,  0, 1]);
    //   (this as any).lastFx = fo;
    // }
  }
}
