import { settings } from "./../../Logic/Logic";
import * as PIXI from "pixi.js";
import { Fill, DrawHelper } from "../common/DrawHelper";
import { UIHelper } from "../UIHelper";
import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import { IAnimInterval, VideoState } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { NineSlicePlane } from "pixi.js";
import { GameType } from "common/Definitions";

export interface IPanelParams {
  text?: string;
  texture?: PIXI.Texture;
  height: number;
  skewedRadius: number;
  fill: Fill[];
}

export class TopBarPanelAnim implements IAnimInterval {
  public startTime: number = 0;
  public duration: number = 0;
  public fill: Fill[] = [];
  public text?: string;
  public texture?: PIXI.Texture;
}

function shallowCompare(a: any, b: any) {
  if (Object.keys(a).length !== Object.keys(b).length) return false;

  for (const key in a) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export function calcLogoDisplaySize(imageWidth: number, imageHeight: number, targetHeight: number) {
  const height = Math.round(targetHeight);
  return {
    height,
    width: (height * imageWidth) / imageHeight
  };
}

export class TopBarLeftPanelDog extends Group {
  public currentBackgroundParams: IPanelParams = { text: "", height: 0, skewedRadius: 0, fill: [{ type: "gradient", color: "red", color2: "white" }] };
  public textures: PIXI.Texture[] = [];
  public infoText?: PIXI.Text;
  private logo?: PIXI.Sprite;
  public infoBackground: NineSlicePlane;
  private blinkTimer = 0;
  private anims: TopBarPanelAnim[] = [];
  private gameType: GameType;

  public constructor(gameType: GameType) {
    super();
    this.gameType = gameType;
    this.infoBackground = UIHelper.createNineSlicePlane();
    this.add(this.infoBackground);
    this.showDebug(settings.debug, 1, "TopBarLeftPanelDog");
  }

  public setAnims(anims: TopBarPanelAnim[]) {
    this.anims = anims;
    this.resetBlinkTimer();
  }

  private getTextStyle() {
    const style: PIXI.TextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLightItalic",
      fontSize: _s(25),
      letterSpacing: _s(0),
      fill: "white",
      align: "center",
      fontStyle: "italic"
    });
    return style;
  }

  private calcTextWidth(text: string) {
    if (!text) return _s(20);
    const metrics = PIXI.TextMetrics.measureText(text, this.getTextStyle());
    return metrics.width;
  }

  public setBackground(params: IPanelParams): void {
    if (!shallowCompare(this.currentBackgroundParams, params)) {
      this.textures = [];
      let contextWidth: number = _s(50);
      if (params.text) {
        if (!this.infoText) {
          this.infoText = Logic.createPixiText(this.getTextStyle(), "");
          this.infoText.anchor.set(0.5, 0.5);
          this.add(this.infoText);
        }
        this.infoText.text = params.text ? params.text : "";
        contextWidth = this.calcTextWidth(this.infoText.text);
      } else {
        if (this.infoText) {
          this.remove(this.infoBackground);
          this.infoText = undefined;
        }
      }
      if (params.texture) {
        if (!this.logo) {
          this.logo = new PIXI.Sprite();
          this.logo.anchor.set(0.5, 0.5);
          this.add(this.logo);
        }
        this.logo.texture = params.texture;
        contextWidth = calcLogoDisplaySize(this.logo.texture.width, this.logo.texture.height, this.getLogoTargetHeight()).width;
      } else {
        if (this.logo) {
          this.remove(this.logo);
          this.logo = undefined;
        }
      }
      this.textures.push(DrawHelper.createSkewedRoundedRectangleTexture(contextWidth, params.height, params.skewedRadius, 0, params.fill[0]));
      if (params.fill.length > 1) this.textures.push(DrawHelper.createSkewedRoundedRectangleTexture(contextWidth, params.height, params.skewedRadius, 0, params.fill[1]));
      this.infoBackground.texture = this.textures[0];
      this.currentBackgroundParams = params;
    }
  }

  private onLoaded() {}

  public onLayout() {
    UIHelper.fillNineSlicePlane(this.infoBackground, this.height);
    // this.infoBackground._refresh(); // TODO
  }

  public calcContentWidth(backgroundWidthFactor: number) {
    const skewedRadius = UIHelper.getSkewedRadius(this.height);
    const skewedBorder = UIHelper.getSkewedBorder(skewedRadius, 0);
    const targetWidth = this.infoBackground.texture.width * 1.25;

    return skewedBorder * 3 + backgroundWidthFactor * (targetWidth - skewedBorder * 2);
  }

  public update(dt: number) {
    let infoBackgroundOffset = 0;
    let infoTextOffset = 0;
    const raceEndTime = Logic.getRaceLength() + Logic.getIntroLength();

    let t = Logic.getVideoTime();

    if (t === 0 && Logic.isInIntro()) {
      t = Logic.getIntroLength();
    }

    const infoAnim = Logic.getAnim(t, this.anims, this.infoBackground); //, { clipTime: Logic.getRaceEndTime() - 2.0});

    const targetWidth = this.infoBackground.texture.width * 1.25;
    const skewedRadius = UIHelper.getSkewedRadius(this.height);
    const skewedBorder = UIHelper.getSkewedBorder(skewedRadius, 0);
    if (infoAnim) {
      if (infoAnim === this.anims[this.anims.length - 1]) infoAnim.duration = raceEndTime - infoAnim.startTime - 2;

      for (const fill of infoAnim.fill) {
        if (fill.type === "gradient") fill.verti = true;
      }

      this.setBackground({
        text: infoAnim.text,
        texture: infoAnim.texture,
        height: this.height,
        skewedRadius,
        fill: infoAnim.fill
      });

      this.infoBackground.visible = AnimHelper.inAnim(t, infoAnim);
      if (infoAnim.fill.length > 1 && this.textures.length > 1) {
        if (t - infoAnim.startTime > 0.3) this.blinkTimer += dt;
        else this.blinkTimer = 0;
        const textureIndex = Math.floor((this.blinkTimer * 3) % this.textures.length);
        this.infoBackground.texture = this.textures[textureIndex];
      }
      if (this.infoText) this.infoText.visible = this.infoBackground.visible;

      let f = t - infoAnim.startTime;

      let backgroundWidthFactor = 0;
      if (f < infoAnim.duration - 1) {
        // fadein
        backgroundWidthFactor = AnimHelper.easeOut(AnimHelper.clamp((f - 0.5) * 2), 3);

        // move background item back and then resize until target width
        infoBackgroundOffset = (targetWidth - skewedBorder * 2) * AnimHelper.clamp(1.0 - f * 2);
      } else {
        // fadeout
        f = infoAnim.startTime + infoAnim.duration - t;
        backgroundWidthFactor = AnimHelper.easeOut(AnimHelper.clamp(f * 3), 3);
      }

      this.infoBackground.width = skewedBorder * 3 + backgroundWidthFactor * (targetWidth - skewedBorder * 2);
      if (this.infoText) this.infoText.alpha = Math.pow(backgroundWidthFactor, 2.0);
      if (this.logo) this.logo.alpha = Math.pow(backgroundWidthFactor, 2.0);
      // move background item back and then resize until target width
      const scrollWidth = targetWidth * 0.5;
      infoTextOffset = -scrollWidth + scrollWidth * AnimHelper.clamp(backgroundWidthFactor);
    }
    this.infoBackground.visible = infoAnim !== undefined && t > infoAnim.startTime && t < infoAnim.startTime + infoAnim.duration;
    if (this.infoText) {
      this.infoText.visible = infoAnim !== undefined && this.infoText.alpha > 0;
      this.infoText.position.x = targetWidth * 0.5 + infoTextOffset;
      this.infoText.position.y = _s(17);
    }
    this.infoBackground.position.x = infoBackgroundOffset;

    if (this.logo) {
      this.logo.position.x = targetWidth * 0.5 + infoTextOffset;
      this.logo.visible = infoAnim !== undefined && this.logo.alpha > 0;
      this.logo.position.y = this.height * 0.5;
      const displaySize = calcLogoDisplaySize(this.logo.width, this.logo.height, this.getLogoTargetHeight());
      this.logo.width = displaySize.width;
      this.logo.height = displaySize.height;

      if (Logic.isFading && Logic.fadeTarget === VideoState.Race) {
        this.logo.visible = true;
        this.infoBackground.visible = true;
      }
    }
  }

  public resetBlinkTimer() {
    this.blinkTimer = 1.0;
  }

  private getLogoTargetHeight() {
    return this.height * 0.96;
  }
}
