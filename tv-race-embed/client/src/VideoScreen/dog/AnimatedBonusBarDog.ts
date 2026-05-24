import { oddsAlwaysOnBonusBarTimings } from "./../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, _t, settings } from "client/Logic/Logic";
import { AnimHelper } from "./../common/Anim";
import { IRoundInfo, IAnimInterval, IGameInfo } from "client/Logic/LogicDefinitions";
import { AnimatedNumber } from "./../common/AnimatedNumber";
import { GameType, GameLength } from "common/Definitions";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { UIHelper } from "client/VideoScreen/UIHelper";

export class AnimatedBonusBarDog extends Group {
  private animatedNumber: AnimatedNumber;
  private bonusBar: PIXI.Sprite | undefined;
  private text: PIXI.Text;
  private hasBonus = false;
  private anims: IAnimInterval[] = [];
  private oddsAlwaysOn;
  private useOverlays;

  public constructor(gameInfo: IGameInfo) {
    super();
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.anims = this.createAnims(gameInfo.gameType, gameInfo.gameLength);
    this.useOverlays = gameInfo.useOverlays;
    this.showDebug(settings.debug, 1, "AnimatedBonusBarDog");

    const bonusStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Medium",
      fontSize: _s(13),
      letterSpacing: this.oddsAlwaysOn ? _s(1) : _s(2),
      fill: "white",
      align: "right"
    });

    if (this.useOverlays) {
      this.bonusBar = new PIXI.Sprite();
      this.add(this.bonusBar);
    }

    this.animatedNumber = new AnimatedNumber(bonusStyle);
    this.add(this.animatedNumber);

    const style = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLightItalic",
      fontSize: _s(30),
      fill: "white",
      align: "center",
      fontStyle: "italic"
    });

    if (this.oddsAlwaysOn) style.fontSize = _s(26);

    this.text = Logic.createPixiText(style);
    this.text.anchor.set(0, 0.5);
    this.add(this.text);
  }

  private createAnims(gameType: GameType, gameLength: GameLength): IAnimInterval[] {
    if (gameType === "horse") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnBonusBarTimings.horse[384];
      switch (gameLength) {
        case 320:
          return [{ startTime: 151.5, duration: 7.3 }];
      }
    }

    if (gameType === "sulky") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnBonusBarTimings.horse[384];
      return [{ startTime: 149.4, duration: 9.5 }];
    }

    if (gameType === "dog6") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnBonusBarTimings.dog[gameLength as 120 | 240 | 300];
      switch (gameLength) {
        case 120:
          return [{ startTime: 26.8, duration: 7.3 }];
        case 180:
          return [{ startTime: 81.1, duration: 8.5 }];
        case 240:
          return [{ startTime: 136.5, duration: 12.7 }];
        case 300:
          return [{ startTime: 136.5, duration: 17.3 }];
      }
      return [{ startTime: 139.7, duration: 10 }];
    }

    if (gameType === "dog63") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnBonusBarTimings.dog63[gameLength as 120 | 240 | 300];
      switch (gameLength) {
        case 300:
          return [{ startTime: 158.4, duration: 17.6 }];
      }
      return [{ startTime: 158.4, duration: 17.6 }];
    } else {
      // dog8
      if (this.oddsAlwaysOn) return oddsAlwaysOnBonusBarTimings.dog[gameLength as 120 | 240 | 300];
      switch (gameLength) {
        case 120:
          return [{ startTime: 25.8, duration: 9.0 }];
        case 180:
          return [{ startTime: 81.1, duration: 7.9 }];
        case 240:
          return [{ startTime: 141.0, duration: 13.3 }];
        case 300:
          return [{ startTime: 141.0, duration: 17.8 }];
      }
      return [{ startTime: 146.8, duration: 156.0 - 146.8 }];
    }
  }

  public fill(roundInfo: IRoundInfo) {
    this.text.text = _t("curBonus");
    Logic.autoSize(this.text, _s(400));

    this.animatedNumber.fill(roundInfo.jackpotValue, roundInfo.oldJackpotValue);
    this.hasBonus = roundInfo.jackpotValue !== undefined;

    if (this.hasBonus && this.useOverlays && this.bonusBar) {
      this.bonusBar.texture = DrawHelper.createSkewedRoundedRectangleTexture(this.width, this.height, UIHelper.getSkewedRadius(this.height), UIHelper.getSkewedPixel(this.height), {
        type: "gradient",
        verti: true,
        color: "#e30613",
        color2: "#b5110f"
      });
    }
  }

  public onLayout() {
    this.text.y = this.height * 0.5;
    this.animatedNumber.position.y = this.height * 0.5;

    this.animatedNumber.setFontSize(_s(this.oddsAlwaysOn ? 26 : 30));

    const bonusBarMask = DrawHelper.createSkewedRoundedRectangleGraphics(0, 0, this.width, this.height, UIHelper.getSkewedRadius(this.height), UIHelper.getSkewedPixel(this.height));
    this.add(bonusBarMask as PIXI.DisplayObject);
    this.container.mask = bonusBarMask;
  }

  public update(dt: number) {
    super.update(dt);

    if (!this.hasBonus) {
      this.alpha = 0.0;
      return;
    }
    this.alpha = 1.0;

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const startTime = anim.startTime;
    const duration = 0.1;
    AnimHelper.animateInOut(
      t - startTime,
      0,
      anim.duration,
      1.0,
      1,
      0,
      (x) => {
        if (this.bonusBar) this.bonusBar.position.x = -this.width * x;
      },
      0,
      1
    );

    const baseFactor = t - anim.startTime;
    const delta = 0.15;
    AnimHelper.animateInOut(baseFactor + delta, 0, anim.duration, 1.0, 0, 1, (val) => (this.text.alpha = val), 0.5, 0);
    AnimHelper.animateInOut(baseFactor + delta, 0, anim.duration, 1.0, 0, 1, (val) => (this.text.x = _s(20) - _s(50) * (1 - val)), 0.5, 0);
    AnimHelper.animateInOut(baseFactor + delta, 0.0, anim.duration, 1.0, 0, 1, (val) => (this.animatedNumber.alpha = val), 0.5, 0);
    AnimHelper.animateInOut(baseFactor + delta, 0.0, anim.duration, 1.0, 0, 1, (val) => (this.animatedNumber.x = _s(this.oddsAlwaysOn ? 203 : 280) - _s(50) * (1 - val)), 0.5, 0);
  }
}
