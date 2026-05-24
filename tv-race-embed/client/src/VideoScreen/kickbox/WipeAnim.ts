import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, settings } from "client/Logic/Logic";
import { IAnimInterval, IDriver, IFightResultRound } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "client/VideoScreen/common/Anim";
import { Engine } from "client/Graphics/Engine";
import { LayoutHelper } from "../Util/LayoutHelper";
import { DrawHelper } from "../common/DrawHelper";
import { IRendererRenderOptions, IRenderOptions } from "pixi.js";

enum WipeAnimState {
  IDLE,
  FADEOUT,
  FADEIN
}

export class WipeAnim extends Group {
  private background: PIXI.Sprite;
  private maskBackgroundSprite: PIXI.Sprite;
  private maskSprite: PIXI.Sprite;
  private maskElements: PIXI.Container;
  private triangleTop: PIXI.Sprite;
  private triangleBottom: PIXI.Sprite;
  private maskTexture: PIXI.RenderTexture;
  private spitzTop: PIXI.Sprite;
  private spitzBottom: PIXI.Sprite;

  private spitzGreen: PIXI.Sprite;
  private spitzRed: PIXI.Sprite;

  private whiteOverlayBackground: PIXI.Sprite;
  private whiteOverlayMaskBackgroundSprite: PIXI.Sprite;
  private whiteLayerMaskSprite: PIXI.Sprite;
  private whiteLayerMaskElements: PIXI.Container;
  private whiteLayerTriangleTop: PIXI.Sprite;
  private whiteLayerTriangleBottom: PIXI.Sprite;
  private whiteLayerMaskTexture: PIXI.RenderTexture;

  private whiteLayerSpitzTop: PIXI.Sprite;
  private whiteLayerSpitzBottom: PIXI.Sprite;

  // private topHudSprite: PIXI.Sprite;

  private anims: IAnimInterval[] = [{ startTime: 0, duration: 6 }];

  private state: WipeAnimState = WipeAnimState.IDLE;

  private isDebugElement: boolean;
  private isFadeToResult: boolean;

  public constructor(isDebugElement: boolean, wipeBackground?: PIXI.Texture, isFadeToResult?: boolean) {
    super();

    this.isDebugElement = isDebugElement;
    this.isFadeToResult = isFadeToResult === true ? true : false;

    this.showDebug(settings.debug, undefined, "Wipe");
    this.background = new PIXI.Sprite(wipeBackground);

    const topTriangleTexture = DrawHelper.getCachedHausTexture(1024, 1024, "white", true);
    const bottomTriangleTexture = DrawHelper.getCachedHausTexture(1024, 1024, "white", false);
    const spitzBottomTexture = DrawHelper.getCachedTriangleTexture(1024, 1024, "white", false, 25 * 4);
    const spitzTopTexture = DrawHelper.getCachedTriangleTexture(1024, 1024, "white", true, 25 * 4);

    {
      this.triangleTop = new PIXI.Sprite(topTriangleTexture);
      this.triangleTop.tint = 0x000000;
      this.triangleTop.anchor.set(0.5, 1.0);
      this.triangleBottom = new PIXI.Sprite(bottomTriangleTexture);
      this.triangleBottom.tint = 0x000000;
      this.triangleBottom.anchor.set(0.5, 0.0);

      this.spitzTop = new PIXI.Sprite(spitzTopTexture);
      this.spitzTop.tint = 0x000000;
      this.spitzTop.anchor.set(0.5, 1.0);
      this.spitzBottom = new PIXI.Sprite(spitzBottomTexture);
      this.spitzBottom.tint = 0x000000;
      this.spitzBottom.anchor.set(0.5, 0.0);

      this.maskTexture = DrawHelper.getCachedRenderTexture(0, _s(1280), _s(720));
      this.maskElements = new PIXI.Container();

      this.maskBackgroundSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
      this.maskBackgroundSprite.width = _s(1280);
      this.maskBackgroundSprite.height = _s(720);
      this.maskElements.addChild(this.maskBackgroundSprite);

      this.maskElements.addChild(this.spitzTop);
      this.maskElements.addChild(this.spitzBottom);

      this.maskElements.addChild(this.triangleTop);
      this.maskElements.addChild(this.triangleBottom);
      this.maskSprite = new PIXI.Sprite(this.maskTexture);

      this.add(this.background);
      this.background.mask = this.maskSprite;
    }

    // white layer
    {
      this.whiteLayerTriangleTop = new PIXI.Sprite(topTriangleTexture);
      this.whiteLayerTriangleTop.tint = 0x000000;
      this.whiteLayerTriangleTop.anchor.set(0.5, 1.0);
      this.whiteLayerTriangleBottom = new PIXI.Sprite(bottomTriangleTexture);
      this.whiteLayerTriangleBottom.tint = 0x000000;
      this.whiteLayerTriangleBottom.anchor.set(0.5, 0.0);

      this.whiteLayerSpitzTop = new PIXI.Sprite(spitzTopTexture);
      this.whiteLayerSpitzTop.tint = 0x000000;
      this.whiteLayerSpitzTop.anchor.set(0.5, 1.0);
      this.whiteLayerSpitzBottom = new PIXI.Sprite(spitzBottomTexture);
      this.whiteLayerSpitzBottom.tint = 0x000000;
      this.whiteLayerSpitzBottom.anchor.set(0.5, 0.0);

      this.whiteLayerMaskTexture = DrawHelper.getCachedRenderTexture(1, _s(1280), _s(720));
      this.whiteLayerMaskElements = new PIXI.Container();

      this.whiteOverlayMaskBackgroundSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
      this.whiteOverlayMaskBackgroundSprite.width = _s(1280);
      this.whiteOverlayMaskBackgroundSprite.height = _s(720);
      this.whiteLayerMaskElements.addChild(this.whiteOverlayMaskBackgroundSprite);

      this.whiteLayerMaskElements.addChild(this.whiteLayerSpitzTop);
      this.whiteLayerMaskElements.addChild(this.whiteLayerSpitzBottom);

      this.whiteLayerMaskElements.addChild(this.whiteLayerTriangleTop);
      this.whiteLayerMaskElements.addChild(this.whiteLayerTriangleBottom);

      this.whiteLayerMaskSprite = new PIXI.Sprite(this.whiteLayerMaskTexture);

      this.whiteOverlayBackground = new PIXI.Sprite(PIXI.Texture.WHITE);
      this.whiteOverlayBackground.alpha = 0.3;
      this.add(this.whiteOverlayBackground);
      this.whiteOverlayBackground.mask = this.whiteLayerMaskSprite;
    }

    // red/green arrow
    this.spitzGreen = new PIXI.Sprite(new PIXI.Texture(spitzBottomTexture.baseTexture, new PIXI.Rectangle(0, 0, spitzTopTexture.width / 2, spitzTopTexture.height)));
    this.spitzGreen.tint = 0x2afcf8;
    this.spitzGreen.anchor.set(0.5, 0);
    this.spitzGreen.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    this.add(this.spitzGreen);

    this.spitzRed = new PIXI.Sprite(new PIXI.Texture(spitzBottomTexture.baseTexture, new PIXI.Rectangle(spitzTopTexture.width / 2, 0, spitzTopTexture.width / 2, spitzTopTexture.height)));
    this.spitzRed.tint = 0xff052a;
    this.spitzRed.anchor.set(0.5, 0);
    this.spitzRed.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    this.add(this.spitzRed);

    // this.topHudSprite = new PIXI.Sprite(Logic.gameInfo?.additionalTextures?.headerImage);
    // this.add(this.topHudSprite);

    this.setState(WipeAnimState.FADEOUT);
  }

  private setState(state: WipeAnimState) {
    if (state === this.state) return;

    if (state === WipeAnimState.FADEOUT) {
      this.maskBackgroundSprite.tint = 0x000000;
      this.whiteOverlayMaskBackgroundSprite.tint = 0x000000;

      this.triangleTop.tint = 0xffffff;
      this.triangleBottom.tint = 0xffffff;
      this.spitzTop.tint = 0xffffff;
      this.spitzBottom.tint = 0xffffff;
      this.spitzTop.alpha = 1;
      this.spitzBottom.alpha = 1;

      this.whiteLayerTriangleTop.tint = 0xffffff;
      this.whiteLayerTriangleBottom.tint = 0xffffff;
      this.whiteLayerSpitzTop.tint = 0xffffff;
      this.whiteLayerSpitzBottom.tint = 0xffffff;
    } else if (state === WipeAnimState.FADEIN) {
      this.maskBackgroundSprite.tint = 0xffffff;
      this.whiteOverlayMaskBackgroundSprite.tint = 0xffffff;

      this.triangleTop.tint = 0x000000;
      this.triangleBottom.tint = 0x000000;
      this.spitzTop.tint = 0x000000;
      this.spitzBottom.tint = 0x000000;
      this.spitzTop.alpha = 0;
      this.spitzBottom.alpha = 0;

      this.whiteLayerTriangleTop.tint = 0x000000;
      this.whiteLayerTriangleBottom.tint = 0x000000;
      this.whiteLayerSpitzTop.tint = 0x000000;
      this.whiteLayerSpitzBottom.tint = 0x000000;
    }
    this.state = state;
  }

  public fill(roundNumber: number, round: IFightResultRound, drivers: IDriver[]) {
    this.onLayout();
  }

  public onLayout() {
    const width = _s(1280);
    const height = _s(720);
    this.width = _s(100);
    this.height = _s(100);
    this.background.x = 0;
    this.background.y = 0;
    this.background.width = width;
    this.background.height = height;

    this.maskSprite.x = 0;
    this.maskSprite.y = 0;
    this.maskSprite.width = _s(1280);
    this.maskSprite.height = _s(720);

    this.width = this.maskSprite.width;
    this.height = this.maskSprite.height;

    // console.log("WipeAnim scale triangleTop");
    LayoutHelper.setScaledRectangleSprite(this.triangleTop, 1280 / 2, 1280, 1280, 1280 * 2);
    // console.log("WipeAnim scale triangleBottom");
    LayoutHelper.setScaledRectangleSprite(this.triangleBottom, 1280 / 2, 720 - 1280, 1280, 1280 * 2);

    // console.log("WipeAnim scale whiteOverlayBackground");
    LayoutHelper.setScaledRectangleSprite(this.whiteOverlayBackground, 0, 0, 1280, 720);
    // console.log("WipeAnim scale whiteLayerTriangleTop");
    LayoutHelper.setScaledRectangleSprite(this.whiteLayerTriangleTop, 1280 / 2, 0, 1280, 1280 * 2);
    // console.log("WipeAnim scale whiteLayerTriangleBottom");
    LayoutHelper.setScaledRectangleSprite(this.whiteLayerTriangleBottom, 1280 / 2, 720 - 1280, 1280, 1280 * 2);

    const widthSpitz = 1280 * 1.25;
    const heightSpitz = 1280 * 1;
    // console.log("WipeAnim scale spitzTop");
    LayoutHelper.setScaledRectangleSprite(this.spitzTop, 1280 / 2, 0, widthSpitz, heightSpitz);
    // console.log("WipeAnim scale spitzBottom");
    LayoutHelper.setScaledRectangleSprite(this.spitzBottom, 1280 / 2, 720 - widthSpitz, widthSpitz, heightSpitz);
    // console.log("WipeAnim scale whiteLayerSpitzTop");
    LayoutHelper.setScaledRectangleSprite(this.whiteLayerSpitzTop, 1280 / 2, 0, widthSpitz, heightSpitz);
    // console.log("WipeAnim scale whiteLayerSpitzBottom");
    LayoutHelper.setScaledRectangleSprite(this.whiteLayerSpitzBottom, 1280 / 2, 720 - widthSpitz, widthSpitz, heightSpitz);

    // console.log("WipeAnim scale spitzGreen");
    LayoutHelper.setScaledRectangleSprite(this.spitzGreen, 1280 / 4 - 80, 1280, widthSpitz / 2, heightSpitz);
    // console.log("WipeAnim scale spitzRed");
    LayoutHelper.setScaledRectangleSprite(this.spitzRed, 1280 / 4 + 1280 / 2 + 80, 1280, widthSpitz / 2, heightSpitz);

    // LayoutHelper.setScaledRectangleSprite(this.topHudSprite, 0, 0, 1280, 114);
  }

  public update(dt: number) {
    super.update(dt);
    if (this.isDebugElement) this.updateAnims(Logic.getVideoTime());
  }

  public updateAnims(t: number) {
    const baseFactor = t - this.anims[0].startTime;

    this.showDebugTime("Wipe", baseFactor);

    const inAnim = baseFactor > 0 && baseFactor < this.anims[0].duration;

    this.background.visible = inAnim;
    this.whiteOverlayBackground.visible = inAnim;
    this.spitzGreen.visible = inAnim;
    this.spitzRed.visible = inAnim;
    this.visible = inAnim;

    if (!inAnim) {
      this.alpha = 0;
      this.setDebugFade(this.alpha);
      return;
    } else this.alpha = 1;
    this.setDebugFade(this.alpha);
    // do the anims...
    {
      const animDurationFactor = 0.66;
      const animDuration = 3 * animDurationFactor;
      const triangleStart = 2.5 * animDurationFactor * 0.65;
      const fadeOutDuration = 4 * animDurationFactor;
      const fadeInDuration = 4 * animDurationFactor;

      const whiteLayerTriangleOffset = this.state === WipeAnimState.FADEIN ? -0.3 * animDurationFactor : 0;

      let fadeTime = baseFactor;

      if (baseFactor < fadeOutDuration) {
        // fadeout
        this.setState(WipeAnimState.FADEOUT);
      } else if (baseFactor < fadeOutDuration + fadeInDuration) {
        this.setState(WipeAnimState.FADEIN);
        fadeTime -= fadeOutDuration;
      } else {
        this.setState(WipeAnimState.IDLE);
      }

      AnimHelper.animateIn(fadeTime, triangleStart, 10, animDuration, 0, 1280 + 720, (x) => (this.triangleTop.y = _s(x)));
      AnimHelper.animateIn(fadeTime, triangleStart, 10, animDuration, 720, -1280, (x) => (this.triangleBottom.y = _s(x)));

      AnimHelper.animateIn(fadeTime, triangleStart + whiteLayerTriangleOffset, 3, animDuration, 0, 1280 + 720, (x) => (this.whiteLayerTriangleTop.y = _s(x)));
      AnimHelper.animateIn(fadeTime, triangleStart + whiteLayerTriangleOffset, 3, animDuration, 720, -1280, (x) => (this.whiteLayerTriangleBottom.y = _s(x)));

      const widthSpitz = 1280 * 1.1;

      AnimHelper.animateIn(fadeTime, 1 * animDurationFactor, 3 * animDurationFactor, animDuration, 0, widthSpitz + 720, (x) => (this.spitzTop.y = _s(x)));
      AnimHelper.animateIn(fadeTime, 1 * animDurationFactor, 3 * animDurationFactor, animDuration, 720, -widthSpitz, (x) => (this.spitzBottom.y = _s(x)));

      AnimHelper.animateIn(fadeTime, 1 * animDurationFactor, 3 * animDurationFactor, animDuration, 0, widthSpitz + 720, (x) => (this.whiteLayerSpitzTop.y = _s(x)));
      AnimHelper.animateIn(fadeTime, 1 * animDurationFactor, 3 * animDurationFactor, animDuration, 720, -widthSpitz, (x) => (this.whiteLayerSpitzBottom.y = _s(x)));

      // this happens only once
      if (!this.isFadeToResult) {
        AnimHelper.animateIn(baseFactor, 3 * animDurationFactor, 3 * animDurationFactor, animDuration, 720, -widthSpitz, (x) => (this.spitzGreen.y = _s(x)));
        AnimHelper.animateIn(baseFactor, 3 * animDurationFactor, 3 * animDurationFactor, animDuration, 720, -widthSpitz, (x) => (this.spitzRed.y = _s(x)));
      }

      // render(displayObject: IRenderableObject, renderTexture?: RenderTexture, clear?: boolean, transform?: Matrix, skipUpdateTransform?: boolean): void;

      const options: IRendererRenderOptions = {
        renderTexture: this.maskTexture
      };
      const whiteOptions: IRendererRenderOptions = {
        renderTexture: this.maskTexture
      };

      Engine.instance.getPixiApp().renderer.render(this.maskElements, options);
      if (!this.isFadeToResult) Engine.instance.getPixiApp().renderer.render(this.whiteLayerMaskElements, whiteOptions);
    }
  }
}
