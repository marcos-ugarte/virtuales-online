import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, settings, _s, _t } from "client/Logic/Logic";
import { IAnimInterval, IFightVideos } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../common/Anim";
import { LayoutHelper } from "../../Util/LayoutHelper";
import { KickboxHelper } from "./../KickboxHelper";
import { WipeAnim } from "../WipeAnim";
import { LogicBase } from "client/Logic/LogicBase";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { SockServLogMessage } from "client/ServerWebSocket/base/ServerSocketLogicBase";
import { Errors } from "client/LogicImplementation/ErrorHandler";
import { ServerSocketLogic } from "client/ServerWebSocket/ServerSocketLogic";
import { Logger } from "client/Logic/Logger";

export class FadeResultToRace extends Group {
  private anims: IAnimInterval[] = [
    {
      startTime: KickboxHelper.fightRoundLength + KickboxHelper.fightRoundResultLength,
      duration: 1
    },
    { startTime: KickboxHelper.fightRoundLength * 2 + KickboxHelper.fightRoundResultLength * 2, duration: 1 }
  ];

  private wipeAnim: WipeAnim;
  private fightVideos: IFightVideos | undefined;
  private overlayTexture1: PIXI.Texture | null = null;
  private overlayTexture2: PIXI.Texture | null = null;
  private overlaySprite: PIXI.Sprite;
  private overlayMask: PIXI.Sprite;

  public constructor() {
    super();
    this.wipeAnim = new WipeAnim(false, Logic.gameInfo?.additionalTextures?.resultBackgroundTexture, true);
    this.fightVideos = undefined;

    this.add(this.wipeAnim);
    this.showDebug(settings.debug, undefined, "FadeResultToRace");

    const maskTexture = DrawHelper.getCachedHausTexture(1024, 1024, "white", true);
    this.overlayMask = new PIXI.Sprite(maskTexture);
    this.add(this.overlayMask);

    this.overlaySprite = new PIXI.Sprite();
    this.add(this.overlaySprite);
    this.overlaySprite.mask = this.overlayMask;
  }

  public fill(fightVideos: IFightVideos) {
    this.fightVideos = fightVideos;
    this.onLayout();
    this.loadOverlayImages();
  }

  private async loadOverlayImages() {
    // free old textures
    // for (let i = 0; i < this.overlayImages.length; i++){
    // }

    if (this.overlayTexture1) {
      this.overlayTexture1.destroy();
      this.overlayTexture1 = null;
    }

    if (this.overlayTexture2) {
      this.overlayTexture2.destroy();
      this.overlayTexture2 = null;
    }

    if (!this.fightVideos) return;

    // Remove when crossorigin solved on server
    this.overlayTexture1 = await Logic.loadTexture(this.fightVideos.round1Result.jpg, { crossOrigin: "Anonymous" });
    this.overlayTexture2 = await Logic.loadTexture(this.fightVideos.round2Result.jpg, { crossOrigin: "Anonymous" });

    this.printOverlayTextureDebugInfo();
  }

  private printOverlayTextureDebugInfo(): void {
    if (this.fightVideos) console.log("Loading overlayTexture1: " + this.fightVideos.round1Result.jpg);
    else {
      console.error("printOverlayTextureDebugInfo fightVideos not set");
    }
    if (this.overlayTexture1) {
      console.log("OverlayTexture1: " + this.overlayTexture1.toString());
      console.log("OverlayBaseTexture1: " + this.overlayTexture1.baseTexture.toString());
      console.log("OverlayBaseTexture1 width: " + this.overlayTexture1.baseTexture.width);
      console.log("OverlayTexture1Width: " + this.overlayTexture1.width);
    } else {
      console.error("printOverlayTextureDebugInfo overlayTexture1 not set");
    }
    if (this.fightVideos) console.log("Loading overlayTexture2: " + this.fightVideos.round2Result.jpg);
    if (this.overlayTexture2) {
      console.log("OverlayTexture2: " + this.overlayTexture2.toString());
      console.log("OverlayTexture1Width: " + this.overlayTexture2.width);
      console.log("OverlayBaseTexture2: " + this.overlayTexture2.baseTexture.toString());
      console.log("OverlayBaseTexture2 width: " + this.overlayTexture2.baseTexture.width);
    } else {
      console.error("printOverlayTextureDebugInfo overlayTexture2 not set");
    }
  }

  private getPrintOverlayTextureDebugInfo(): string {
    let strMessage = "";
    if (this.fightVideos) strMessage += " |Loading overlayTexture1: " + this.fightVideos.round1Result.jpg;
    else {
      strMessage += " |printOverlayTextureDebugInfo fightVideos not set";
    }
    if (this.overlayTexture1) {
      strMessage += " |OverlayTexture1: " + this.overlayTexture1.toString();
      strMessage += " |OverlayBaseTexture1: " + this.overlayTexture1.baseTexture.toString();
      strMessage += " |OverlayBaseTexture1 width: " + this.overlayTexture1.baseTexture.width;
      strMessage += " |OverlayTexture1Width: " + this.overlayTexture1.width;
    } else {
      strMessage += " |printOverlayTextureDebugInfo overlayTexture1 not set";
    }
    if (this.fightVideos) strMessage += " |Loading overlayTexture2: " + this.fightVideos.round2Result.jpg;
    if (this.overlayTexture2) {
      strMessage += " |OverlayTexture2: " + this.overlayTexture2.toString();
      strMessage += " |OverlayTexture1Width: " + this.overlayTexture2.width;
      strMessage += " |OverlayBaseTexture2: " + this.overlayTexture2.baseTexture.toString();
      strMessage += " |OverlayBaseTexture2 width: " + this.overlayTexture2.baseTexture.width;
    } else {
      strMessage += " |printOverlayTextureDebugInfo overlayTexture2 not set";
    }

    return strMessage;
  }

  public onLayout(): void {
    this.wipeAnim.width = _s(1280);
    this.wipeAnim.height = _s(720);
    this.wipeAnim.x = 0;
    this.wipeAnim.y = 0;
    console.log("FadeResultToRace scale overlaySprite");
    try {
      LayoutHelper.setScaledRectangleSprite(this.overlaySprite, 0, 0, 1280, 720);
    } catch (exc) {
      let objStr = "";
      let texturStr = "";
      if (this.overlaySprite) {
        objStr = this.overlaySprite.toString();
        texturStr = this.overlaySprite.texture.toString();
      } else {
        objStr = this.overlaySprite;
        texturStr = this.overlaySprite;
      }

      console.error("Error scaling Rectangle, overlaySprite: " + objStr + ", Exception: " + exc);
      console.error("Overlaysprite texture: " + texturStr);

      let exeptStr = "";
      let exeptStack = "";
      if (exc) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (exc.message) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          exeptStr = exc.message;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (exc.stack) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          exeptStack = exc.stack;
        }
      }

      const logMessage = new SockServLogMessage(
        Errors.SPRITE_NOT_SET_ERROR.code,
        "Error scaling Rectangle, overlaySprite:" + objStr + " Overlaysprite texture:" + texturStr + ", Exception: " + exeptStr + " stack" + exeptStack
      );
      this.printOverlayTextureDebugInfo();

      logMessage.errorMsg += this.getPrintOverlayTextureDebugInfo();

      ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
        Logger.error("Send log Error:" + JSON.stringify(error));
      });
    }

    console.log("FadeResultToRace scale overlayMask");
    LayoutHelper.setScaledRectangleSprite(this.overlayMask, 0 - 1280, 0, 1280 * 2, 720 * 4);
  }

  public update(dt: number) {
    super.update(dt);
    //this.showDebug(settings.debug, this.wipeAnim.alpha, "FadeResultToRace");

    const t = Logic.getRaceVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);

    if (!anim || t > anim.startTime + anim.duration || t < anim.startTime) {
      this.wipeAnim.alpha = 0;
      this.alpha = 0;
      this.setDebugFade(0);
      //this.wipeAnim.visible = false;
      return;
    }

    const baseFactor = t - anim.startTime;
    this.setDebugFade(baseFactor);
    if (baseFactor < 0) return;

    this.alpha = 1;
    this.wipeAnim.alpha = 1;

    if (anim.startTime === this.anims[0].startTime) {
      if (this.overlaySprite.texture !== this.overlayTexture1 && this.overlayTexture1) {
        this.overlaySprite.texture = this.overlayTexture1;
        console.log("Setting overlaysprite to texture1: " + this.overlayTexture1);
      }
    } else {
      if (this.overlaySprite.texture !== this.overlayTexture2 && this.overlayTexture2) {
        this.overlaySprite.texture = this.overlayTexture2;
        console.log("Setting overlaysprite to texture2: " + this.overlayTexture2);
      }
    }

    const wipeAnimT = (1 - baseFactor) * 1.9;

    AnimHelper.animateIn(baseFactor, 0, 10, 1, 0, -720 * 4, (val) => (this.overlayMask.y = _s(val)));

    this.wipeAnim.updateAnims(wipeAnimT);
  }
}
