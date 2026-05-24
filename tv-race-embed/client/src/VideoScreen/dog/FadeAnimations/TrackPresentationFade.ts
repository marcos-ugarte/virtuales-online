import { Group } from "client/Graphics/Group";
import { _s } from "client/Logic/Logic";
import { Color, ColorSource, Graphics, NineSlicePlane, Sprite, Texture } from "pixi.js";
import { GameType } from "common/Definitions";
import { UIHelper } from "client/VideoScreen/UIHelper";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { AnimHelper } from "client/VideoScreen/common/Anim";
import { Track } from "client/VideoScreen/common/TrackHelper";

export interface ITexDescription {
  type: "round";
  tex: Texture;
  radius: number;
}

export class TrackPresentationFade extends Group {
  private gameType: GameType;
  private blueBig: NineSlicePlane = UIHelper.createNineSlicePlane();
  private blueBigMask: NineSlicePlane = UIHelper.createNineSlicePlane();
  private blueBig2: NineSlicePlane = UIHelper.createNineSlicePlane();
  private blueBigMask2: NineSlicePlane = UIHelper.createNineSlicePlane();

  private blueMedium: NineSlicePlane = UIHelper.createNineSlicePlane();
  private blueMediumMask: NineSlicePlane = UIHelper.createNineSlicePlane();
  private blueMedium2: NineSlicePlane = UIHelper.createNineSlicePlane();
  private blueMediumMask2: NineSlicePlane = UIHelper.createNineSlicePlane();

  private blueSmall: NineSlicePlane = UIHelper.createNineSlicePlane();
  private blueSmallMask: NineSlicePlane = UIHelper.createNineSlicePlane();
  private whiteBarBig: NineSlicePlane = UIHelper.createNineSlicePlane();
  private whiteBarBigMask: NineSlicePlane = UIHelper.createNineSlicePlane();

  private whiteBarBig2: NineSlicePlane = UIHelper.createNineSlicePlane();
  private whiteBarBigMask2: NineSlicePlane = UIHelper.createNineSlicePlane();

  private whiteBar: Sprite = new Sprite(Texture.WHITE);
  private trackGraphics = new Track(600, 1000, 22, 0xffffff, Math.PI / 4);

  private texRadius100 = this.createTexRound(_s(100));
  private texRadius70 = this.createTexRound(_s(70));
  private texRadius0 = this.createTexRound(_s(0));
  private textSingleRadius = this.createTexRoundOneCorner(_s(70));

  private blueBigColor;
  private blueMiddleColor;

  public onFinalFade = false;

  public constructor(gameType: GameType) {
    super();
    this.container.name = "FadeVideoTrack";
    this.gameType = gameType;

    this.blueBigColor = gameType === "dog8" ? "#215443" : "#022841";
    this.blueMiddleColor = gameType === "dog8" ? "#215443" : "#022841";

    this.add(this.blueBig);
    this.add(this.blueBigMask);
    this.blueBig.mask = this.blueBigMask;

    this.add(this.blueMedium);
    this.add(this.blueMediumMask);
    this.blueMedium.mask = this.blueMediumMask;

    this.add(this.blueSmall);
    this.add(this.blueSmallMask);
    this.blueSmall.mask = this.blueSmallMask;

    this.add(this.whiteBar);

    this.add(this.whiteBarBig);
    this.add(this.whiteBarBigMask);
    this.whiteBarBig.mask = this.whiteBarBigMask;

    [this.whiteBarBig2, this.whiteBarBigMask2, this.blueBig2, this.blueBigMask2, this.blueMedium2, this.blueMediumMask2].forEach((el) => {
      el.visible = false;
      this.add(el);
    });

    this.whiteBarBig2.mask = this.whiteBarBigMask2;
    this.blueBig2.mask = this.blueBigMask2;
    this.blueMedium2.mask = this.blueMediumMask2;

    this.trackGraphics.container.name = "trackGraphics";
    this.add(this.trackGraphics);
  }

  public getDx() {
    return -this.height * 0.17;
  }

  public createTexRound(radius: number) {
    const radiusInfo: ITexDescription = {
      type: "round",
      tex: DrawHelper.createSkewedRoundedRectangleTexture(_s(radius * 2) + 16, _s(radius * 2) + 16, radius, _s(0), { type: "solid", color: "white" }),
      radius
    };
    return radiusInfo;
  }

  private createTexRoundOneCorner(radius: number) {
    const radiusInfo: ITexDescription = {
      type: "round",
      tex: DrawHelper.createCustomSkewedRoundedRectangleTexture(
        _s(400),
        _s(200),
        _s(30),
        {
          topLeft: 0,
          bottomLeft: 0,
          bottomRight: radius,
          topRight: 0
        },
        { type: "solid", color: "white" }
      ),
      radius
    };
    return radiusInfo;
  }

  private createRound(item: NineSlicePlane, desc: ITexDescription, width: number, height: number, tint: ColorSource, alpha?: number) {
    item.texture = desc.tex;
    item.leftWidth = desc.radius;
    item.rightWidth = desc.radius;
    item.topHeight = desc.radius;
    item.bottomHeight = desc.radius;

    item.tint = tint;
    item.width = width;
    item.height = height;
    item.transform.setFromMatrix(UIHelper.getSkewMatrix(item.height));
    if (alpha !== undefined) item.alpha = alpha;
  }

  private createBar(item: Sprite, width: number, height: number, tint: number, alpha: number) {
    item.tint = tint;
    item.transform.setFromMatrix(UIHelper.getSkewMatrix(this.height));
    item.width = width;
    item.height = height;
    item.alpha = alpha;
  }

  public onLayout() {
    const textSingleRadius = this.createTexRoundOneCorner(_s(70));

    this.blueBigMask.height = _s(591);
    this.blueBigMask.width = this.width;

    this.blueSmallMask.height = _s(591);
    this.blueSmallMask.width = this.width * 1.8;

    this.trackGraphics.position.set(_s(30), _s(0 - 250));

    this.createRound(this.blueBigMask, this.texRadius0, this.width * 1.5, _s(591), "#39FF14", 0.5);
    this.createRound(this.blueSmallMask, this.texRadius0, this.width * 1.5, _s(180), "#39FF14", 0.5);

    const blueBigColor = this.gameType === "dog8" ? "#215443" : "#022841";
    this.createRound(this.blueBig, this.texRadius100, this.width * 1.2, _s(591), blueBigColor, 0.75);
    this.blueBig.y = -(_s(591) - this.height) / 2;
    this.blueBigMask.y = -(_s(591) - this.height) / 2;

    this.createRound(this.blueMedium, this.texRadius70, this.width * 0.7, this.height, this.blueMiddleColor, 0.5);
    this.createRound(this.blueMediumMask, this.texRadius0, this.width * 1.5, this.height, "red", 0.5);

    const blueSmallColor = this.gameType === "dog8" ? "#329e69" : "#385CB5";
    this.createRound(this.blueSmall, this.texRadius100, this.width * 1.5, _s(170), blueSmallColor, 0.93);
    this.blueSmall.y = this.height - _s(170);
    this.blueSmallMask.y = this.height - _s(175);
    this.blueMediumMask.width = _s(405);
    this.createBar(this.whiteBar, this.width * 0.4, _s(38), 0xffffff, 0.5);

    this.createRound(this.whiteBarBig, textSingleRadius, this.width * 1, _s(262), "#ffffff", 0.8);
    this.createRound(this.whiteBarBigMask, this.texRadius0, this.width, _s(262), "#39FF14", 0.8);
  }

  public setToFinalFade() {
    this.onFinalFade = true;

    [this.whiteBarBig2, this.whiteBarBigMask2, this.blueBig2, this.blueBigMask2, this.blueMedium2, this.blueMediumMask2].forEach((el) => (el.visible = true));

    this.blueBig.alpha = 0.5;
    this.whiteBarBig.alpha = 0.5;

    this.createRound(this.whiteBarBig2, this.textSingleRadius, this.width, _s(262), "white", 0.85);
    this.createRound(this.whiteBarBigMask2, this.texRadius0, this.width, _s(262), "red", 0.8);

    this.createRound(this.blueBigMask, this.texRadius0, this.width * 1.5, _s(684), "#39FF14", 0.5);
    this.createRound(this.blueBig, this.texRadius100, this.width * 1.2, _s(684), this.blueBigColor, 0.75);

    this.createRound(this.blueMedium2, this.texRadius70, this.width * 0.7, this.height, this.blueMiddleColor, 0.5);
    this.createRound(this.blueMediumMask2, this.texRadius0, this.width * 1.5, this.height, "#39FF14", 0.5);

    this.createRound(this.blueBigMask2, this.texRadius0, this.width * 1.5, _s(684), "#39FF14", 0.5);
    this.createRound(this.blueBig2, this.texRadius100, this.width * 1.2, _s(684), this.blueBigColor, 0.5);

    this.blueBigMask2.y = this.blueBig2.y = -_s(80);
    this.blueBigMask.y = this.blueBig.y = -_s(120);
  }

  public setTestFadeX(
    currentTime: number,
    startTimes: {
      start: number;
      skipTrackAnim?: boolean;
    }[]
  ) {
    const currentAnim = startTimes.reduce((prev, curr) => (currentTime > curr.start ? curr : prev), { start: 0 });
    const { skipTrackAnim, start: globalStartTime } = currentAnim;

    if (!skipTrackAnim) {
      const trackStartsAt = 0.37;
      const speedOfTrackAnim = 0.6;
      const start = globalStartTime + 0.256;
      const duration = 1.22;

      this.trackGraphics.drawAnimatedTrack(
        {
          start,
          end: start + duration
        },
        currentTime,
        {
          trackStartsAt,
          speedOfTrackAnim,
          shrinkAnimation: true,
          speedOfShrinkAnim: 0.82,
          initialTrackLength: 0.4
        }
      );

      const fx = trackStartsAt + this.getFactorForElement(start, currentTime, 51.55) * speedOfTrackAnim;
      this.trackGraphics.alpha = 0.485;
      this.trackGraphics.position.x = _s(-50 + fx * 200);
    }
    {
      const start = globalStartTime + 0.57;
      const duration = 1.21;

      const fx = this.getFactorForElement(start, currentTime, start + duration);
      const visible = fx > 0;

      const easedFx = this.calcEasedFactor(fx);

      this.blueMedium.x = _s(-80 + Math.min(fx, 0.8) * 250);
      this.blueMediumMask.x = _s(-490 + easedFx * 1100);
      this.blueMedium.visible = visible;

      this.whiteBarBig.x = _s(-265 + Math.min(fx, 0.8) * 250);
      this.whiteBarBig.y = this.height - _s(261);
      this.whiteBarBig.visible = visible;

      this.whiteBarBigMask.x = _s(-265 + Math.pow(fx, 2) * 600);
      this.whiteBarBigMask.width = _s(Math.max(fx, 0) * 700);
      this.whiteBarBigMask.y = this.height - _s(261);
    }
    {
      const fx = this.getFactorForElement(globalStartTime, currentTime);
      this.blueBig.x = _s(-160 + fx * 150);

      const w = 500;
      this.blueBigMask.width = _s(w);
      this.blueBigMask.x = _s(-w - 170 + fx * 1200);
    }
    {
      const start = globalStartTime + 0.13;
      const duration = 1.03;
      const fx = this.getFactorForElement(start, currentTime, start + duration);
      const visible = fx > 0 && !this.onFinalFade;

      this.blueSmall.x = _s(-400 + fx * 100);
      this.blueSmallMask.x = _s(-120 + Math.pow(fx, 2) * 650);
      this.blueSmallMask.width = _s(Math.max(fx, 0) * 500);
      this.blueSmall.visible = visible;

      this.whiteBar.anchor.set(1, 0.5);
      this.whiteBar.x = _s(-150 + fx * 500);
      this.whiteBar.width = _s(Math.max(Math.sin(fx * Math.PI * 1.2), 0) * 180);
      this.whiteBar.y = this.height - _s(38 / 2);
      this.whiteBar.visible = visible;
    }

    if (!this.onFinalFade) return;
    {
      const fx = this.getFactorForElement(globalStartTime, currentTime);
      this.blueBig2.x = _s(-fx * 250);

      const w = 400;
      this.blueBigMask2.width = _s(w);
      this.blueBigMask2.x = _s(w + 300 - fx * 2500);
    }
    {
      const start = globalStartTime + 0.1;
      const duration = 4;

      const fx = this.getFactorForElement(start, currentTime, start + duration);
      const visible = fx > 0;

      this.blueMedium2.x = _s(200 - fx * 200);
      this.blueMediumMask2.width = _s(300);
      this.blueMediumMask2.x = _s(800 - fx * 1050);
      this.blueMedium2.visible = visible;

      this.whiteBarBig2.x = _s(0 - fx * 120);
      this.whiteBarBig2.y = this.height - _s(261);
      this.whiteBarBig2.visible = visible;

      this.whiteBarBigMask2.alpha = 0.4;
      this.whiteBarBigMask2.x = _s(1020 - fx * 2000);
      this.whiteBarBigMask2.width = _s(360);
      this.whiteBarBigMask2.y = this.height - _s(261);
    }

    {
      const fx = this.getFactorForElement(globalStartTime + 0.2, currentTime);
      this.blueBig.x = _s(-160 + fx * 300);

      const w = 450;
      this.blueBigMask.width = _s(w);
      this.blueBigMask.x = _s(-w - 350 + fx * 2600);
    }

    {
      const start = globalStartTime + 0.5;
      const duration = 1.21;

      const fx = this.getFactorForElement(start, currentTime, start + duration);
      const visible = fx > 0;

      this.blueMedium.x = _s(-80 + Math.min(fx, 0.8) * 500);
      this.blueMediumMask.width = _s(400);
      this.blueMediumMask.x = _s(-550 + fx * 2000);
      this.blueMedium.visible = visible;

      this.whiteBarBig.x = _s(-265 + Math.min(fx, 0.8) * 500);
      this.whiteBarBig.y = this.height - _s(261);
      this.whiteBarBig.visible = visible;

      this.whiteBarBigMask.x = _s(-265 + fx * 1400);
      this.whiteBarBigMask.width = _s(Math.max(fx, 0) * 700);
      this.whiteBarBigMask.y = this.height - _s(261);
    }
  }

  public getFactorForElement(startTime: number, currentTime: number, endTime?: number) {
    if (currentTime < startTime) return 0;
    if (endTime && currentTime > endTime) return 0;
    const baseFactor = currentTime - startTime;
    return Math.max(0, baseFactor);
  }

  private calcEasedFactor(factor: number) {
    const tb = 0.0;
    const te = 0.0;
    const factorEased = AnimHelper.sigmoid(factor, 3.0);
    const ret = te + factorEased * (1 - te + tb);
    // if (factor > 0 && factor < 1)
    //  console.log("Factor: " + factor + " " + factorEased + " " + ret);
    return ret;
  }
}
