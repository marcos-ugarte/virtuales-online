import { IAnimInterval, IGameInfo, ITrackInfo } from "./../../Logic/LogicDefinitions";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, settings, Logic } from "client/Logic/Logic";
import { AnimHelper } from "../common/Anim";
import { DogHelper } from "./DogHelper";
import { GameType } from "common/Definitions";
import { DrawHelper } from "../common/DrawHelper";
import { UIHelper } from "../UIHelper";
import { ITexDescription } from "./FadeAnimations/TrackPresentationFade";

export class TrackPresentationLapInfo extends Group {
  private line1: PIXI.Text;
  private line2: PIXI.Text;
  public fadeInTime: number = 0;
  public fadeOutTime: number = Number.MAX_VALUE;
  public anims: any[] = [];

  private redBackground: PIXI.NineSlicePlane = UIHelper.createNineSlicePlane();
  private whiteBackground: PIXI.NineSlicePlane = UIHelper.createNineSlicePlane();

  //private backgroundMask: PIXI.Graphics = new PIXI.Graphics();

  private gameType: GameType;
  private oddsAlwaysOn: boolean;
  private useOverlays: boolean;

  private whiteTexture = this.createWhiteTexture(_s(6));
  private redTexture = this.createRedTexture(_s(6));

  public createWhiteTexture(radius: number) {
    const radiusInfo: ITexDescription = {
      type: "round",
      tex: DrawHelper.createSkewedRoundedRectangleTexture(_s(radius * 2) + 16, _s(radius * 2) + 16, radius, _s(0), { type: "solid", color: "white" }),
      radius
    };
    return radiusInfo;
  }
  public createRedTexture(radius: number) {
    const radiusInfo: ITexDescription = {
      type: "round",
      tex: DrawHelper.createSkewedRoundedRectangleTexture(_s(radius * 2) + 16, _s(radius * 2) + 16, radius, _s(0), {
        type: "gradient",
        color: "#E0272D",
        color2: "#991F24",
        verti: true
      }),
      radius
    };
    return radiusInfo;
  }

  private createRound(item: PIXI.NineSlicePlane, desc: ITexDescription, width: number, height: number, tint?: PIXI.ColorSource, alpha?: number) {
    item.texture = desc.tex;
    item.leftWidth = desc.radius;
    item.rightWidth = desc.radius;
    item.topHeight = desc.radius;
    item.bottomHeight = desc.radius;

    if (tint !== undefined) item.tint = tint;
    item.width = width;
    item.height = height;
    item.transform.setFromMatrix(UIHelper.getSkewMatrix(item.height));
    if (alpha !== undefined) item.alpha = alpha;
  }

  public constructor(gameInfo: IGameInfo) {
    super();

    this.gameType = gameInfo.gameType;
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.useOverlays = gameInfo.useOverlays;
    this.showDebug(settings.debug, 1, "TrackPresentationLapInfo");

    UIHelper.fillNineSlicePlane(this.redBackground, _s(30));
    UIHelper.fillNineSlicePlane(this.whiteBackground, _s(18));
    const skewedRadius = UIHelper.getSkewedRadius(_s(30));
    const skewedRadius2 = UIHelper.getSkewedRadius(_s(36 + 18));

    this.redBackground.texture = DrawHelper.createSkewedRoundedRectangleTexture(
      UIHelper.getSkewedBorder(skewedRadius, 0) * 2,
      _s(30),
      skewedRadius,
      0,
      {
        type: "gradient",
        // color: "white",
        // color2: "blue",
        color: "#E0272D",
        color2: "#991F24",
        verti: true
      },
      { mipmap: PIXI.MIPMAP_MODES.OFF }
    );

    this.whiteBackground.texture = DrawHelper.createSkewedRoundedRectangleTexture(
      UIHelper.getSkewedBorder(skewedRadius2, 0) * 2,
      _s(18),
      skewedRadius2,
      0,
      {
        type: "solid",
        // color: "green"
        color: "#E6E6E6"
      },
      { mipmap: PIXI.MIPMAP_MODES.OFF }
    );

    //this.backgroundMask.alpha = 0.4;

    this.add(this.redBackground);
    this.add(this.whiteBackground);
    const line1Style = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(12),
      fill: DogHelper.getBlackColor(),
      align: "right",
      fontStyle: "italic"
    });

    const line2Style = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(24),
      fill: DogHelper.getWhiteColor(),
      align: "right",
      fontStyle: "italic"
    });

    this.line1 = Logic.createPixiText(line1Style);
    this.line1.anchor.set(1, 0.5);
    this.add(this.line1);
    //this.add(this.backgroundMask);

    this.line2 = Logic.createPixiText(line2Style);
    this.line2.anchor.set(1, 0.5);
    this.add(this.line2);

    this.line1.text = "AVG TIME:";
    this.line2.text = "30 secs";

    /*this.whiteBackground.mask = this.backgroundMask;
    this.redBackground.mask = this.backgroundMask;
    this.line1.mask = this.backgroundMask;
    this.line2.mask = this.backgroundMask;*/
  }

  public onLayout() {
    this.createRound(this.whiteBackground, this.whiteTexture, _s(140), _s(18), "#E6E6E6", 1);
    this.createRound(this.redBackground, this.redTexture, _s(140), _s(30), "#E6E6E6", 1);

    this.redBackground.position.set(_s(4), _s(18));
    this.whiteBackground.position.set(_s(7), _s(0));

    /*this.backgroundMask.height = this.height;
    this.backgroundMask.width = _s(170);
    this.backgroundMask.x = -_s(25);

    this.backgroundMask.beginFill(0xff0000);
    this.backgroundMask.drawRect(0, 0, _s(200), this.height);
    this.backgroundMask.endFill();*/

    this.line1.x = _s(138);
    this.line1.y = _s(8);

    this.line2.x = _s(132);
    this.line2.y = _s(32);

    if (this.oddsAlwaysOn) {
      this.line1.y = _s(10);
      this.line2.y = _s(32);
    }
    if (!this.useOverlays) {
      this.whiteBackground.visible = false;
      this.redBackground.visible = false;
    }
  }
  public update(dt: number) {
    super.update(dt);
    const t = Logic.getVideoTime();
    this.updateBackground(t);
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const baseFactor = t - anim.startTime;
    let line1Width = 120;
    if (this.oddsAlwaysOn) line1Width = 84;

    if (anim.key !== this.line1.text) {
      this.line1.text = anim.key;
      Logic.autoSize(this.line1, _s(line1Width));
    }
    if (anim.value !== this.line2.text) {
      this.line2.text = anim.value;
      Logic.autoSize(this.line2, _s(line1Width));
    }

    let xAnimOffset1 = 139;
    let xAnimOffset2 = 132;

    AnimHelper.animateInOut(baseFactor, 0.2, anim.duration, 0.7, 0, 1, (val) => (this.line2.alpha = val * val), 0.3, 0);
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.3, 0, 1, (val) => (this.line1.alpha = val * val), 0.3, 0);
    AnimHelper.animateInOut(baseFactor, 0.2, anim.duration, 0.3, 0, 1, (val) => (this.line2.alpha = val * val), 0.3, 0);

    if (this.oddsAlwaysOn) {
      xAnimOffset1 = 133;
      xAnimOffset2 = 127;
    }

    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.3, 70, xAnimOffset1, (val) => (this.line1.x = _s(val)), 0.3, 0);
    AnimHelper.animateInOut(baseFactor, 0.2, anim.duration, 0.3, 70, xAnimOffset2, (val) => (this.line2.x = _s(val)), 0.3, 0);
  }
  private updateBackground(currentTime: number) {
    /*const bgAnims: IAnimInterval[] = [
      {
        startTime: 56.4,
        duration: 2.5
      },
      {
        startTime: 59.15,
        duration: 2.5
      },
      {
        startTime: 62.03,
        duration: 3.15
      },
      {
        startTime: 65.26,
        duration: 3.7
      }
    ];*/

    const container = new PIXI.Container();
    const currentAnim = Logic.getAnim(currentTime, this.anims, this);

    if (!currentAnim || !this.useOverlays) {
      this.redBackground.visible = false;
      this.whiteBackground.visible = false;
      return;
    }

    this.redBackground.visible = true;
    this.whiteBackground.visible = true;
    const newBaseFac = currentTime - currentAnim?.startTime;

    AnimHelper.animateInOut(newBaseFac, 0, currentAnim.duration, 0.04, 0, 1, (val) => (this.whiteBackground.scale.x = val), 0.4, 0);
    AnimHelper.animateInOut(newBaseFac, 0, currentAnim.duration, 0.5, -_s(170) / 2 + _s(50), _s(7), (val) => (this.whiteBackground.position.x = val), 0.2, -_s(170) / 2 + _s(50));

    AnimHelper.animateInOut(newBaseFac, 0.2, currentAnim.duration + 0.05, 0.12, 0, 1, (val) => (this.redBackground.scale.x = val), 0.4, 0);
    AnimHelper.animateInOut(newBaseFac, 0.25, currentAnim.duration + 0.1, 0.5, -_s(170) / 2 + _s(50), _s(3), (val) => (this.redBackground.position.x = val), 0.2, -_s(170) / 2 + _s(50));
  }
}
