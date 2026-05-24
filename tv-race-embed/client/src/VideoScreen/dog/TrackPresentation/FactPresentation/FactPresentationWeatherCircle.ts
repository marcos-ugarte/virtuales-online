import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, settings, Logic } from "client/Logic/Logic";
import { IAnimInterval, IGameInfo } from "client/Logic/LogicDefinitions";

import { GameType } from "common/Definitions";
import { AnimHelper } from "client/VideoScreen/common/Anim";
import Moon from "../../../../../assets/general/moon.svg";
import Sun from "../../../../../assets/general/sun.svg";

export class TrackPresentationWeatherCircle extends Group {
  public fadeInTime: number = 0;
  public fadeOutTime: number = Number.MAX_VALUE;
  private oddsAlwaysOn;
  private useOverlays;

  private nightContainer = new PIXI.Container();
  private moon = new PIXI.Sprite();
  private dayContainer = new PIXI.Container();
  private sun = new PIXI.Sprite();

  private circle = new PIXI.Graphics();

  private anims: IAnimInterval[] = [];

  public constructor(gameInfo: IGameInfo) {
    super();
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.useOverlays = gameInfo.useOverlays;
    this.showDebug(settings.debug);

    if (this.useOverlays) {
      const { night } = WheaterCircleStyles.getCircleTextures();

      this.nightContainer.addChild(this.moon);
      this.dayContainer.addChild(this.sun);

      this.dayContainer.pivot.set(0, _s(117.7));
      this.dayContainer.position.set(0, _s(117.7));

      this.nightContainer.pivot.set(0, _s(117.7));
      this.nightContainer.position.set(0, _s(117.7));

      this.dayContainer.rotation = -0.55;

      Logic.loadSVG(Moon as string, { width: _s(60) }).then((el) => {
        this.moon.texture = el;
        this.moon.width = _s(30);
        this.moon.height = el.orig.height * (_s(30) / el.orig.width);
      });

      Logic.loadSVG(Sun as string, { width: _s(60) }).then((el) => {
        this.sun.texture = el;
        this.sun.width = _s(30);
        this.sun.height = el.orig.height * (_s(30) / el.orig.width);
      });

      this.circle.lineStyle(_s(2), 0xffffff); // White border _s(2)px thick
      this.circle = this.createCircle(night, true);
      this.circle.drawCircle(0, 0, _s(30));
      this.add(this.circle);

      const mask = new PIXI.Graphics();
      mask.lineStyle(_s(2), 0xffffff); // White border _s(2)px thick
      mask.beginFill(0xffffff);

      mask.drawCircle(0, 0, _s(30));
      this.add(mask);

      this.dayContainer.mask = mask;
      this.nightContainer.mask = mask;

      this.moon.anchor.set(0.5);
      this.sun.anchor.set(0.5);

      this.add(this.dayContainer);
      this.add(this.nightContainer);
    }
  }

  public fill(anims: IAnimInterval[]) {
    this.anims = anims;
  }

  private createCircle(texture: PIXI.Texture, border?: boolean) {
    const circle = new PIXI.Graphics()
      .beginTextureFill({ texture, matrix: new PIXI.Matrix().translate(-_s(30), -_s(30)) })
      .drawCircle(0, 0, _s(30))
      .endFill();

    if (border) {
      circle.lineStyle(_s(2), 0xffffff);
    }
    return circle;
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim || !this.useOverlays) {
      this.visible = false;
      return;
    }
    this.visible = true;

    const baseFactor = t - anim.startTime;

    AnimHelper.animateIn(baseFactor, 0, 10, 0.5, 0, 1, (val) => this.container.scale.set(val));

    AnimHelper.animateIn(baseFactor, 2, 12, 0.5, 0, 0.55, (val) => (this.nightContainer.rotation = val));
    AnimHelper.animateIn(baseFactor, 2, 10, 0.5, -0.55, 0, (val) => (this.dayContainer.rotation = val));

    AnimHelper.animateGradientIn(
      baseFactor,
      2,
      2 + 0.7,
      0.2,
      {
        color: new PIXI.Color(0x04172a),
        color2: new PIXI.Color(0x022841),
        steps: [0.376296, 0.783039]
      },
      {
        color: new PIXI.Color(0xe30613),
        color2: new PIXI.Color(0xb5110f),
        steps: [0, 1]
      },
      (x) => {
        const texture = DrawHelper.createCircleTexture(_s(30), { type: "gradient", color: x.color.toHex(), color2: x.color2.toHex(), stops: x.steps });
        this.circle.clear();
        this.circle.beginTextureFill({ texture, matrix: new PIXI.Matrix().translate(-_s(30), -_s(30)) });
        this.circle.lineStyle(_s(2), 0xffffff);
        this.circle.drawCircle(0, 0, _s(30));
        this.circle.endFill();
      }
    );
  }
}

export const WheaterCircleStyles = {
  getCircleTextures() {
    const gameType = Logic.getGameInfo()?.gameType;
    return {
      night: DrawHelper.createCircleTexture(_s(30), {
        type: "gradient",
        color: gameType === "dog8" ? "#060f0d" : "#04172A",
        color2: gameType === "dog8" ? "#133327" : "#022841",
        stops: [0.376296, 0.783039]
      }),
      day: DrawHelper.createCircleTexture(_s(30), { type: "gradient", color: "#E30613", color2: "#B5110F", stops: [0, 1] })
    };
  }
};
