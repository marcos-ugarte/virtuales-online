import { Util } from "common/Util";
import { DriverPresentationDog } from "./DriverPresentationDog";
import { GameLength, GameType } from "common/Definitions";
import { DogHelper } from "./DogHelper";
import { AnimHelper } from "./../common/Anim";
import { IAnimInterval, IGameInfo } from "./../../Logic/LogicDefinitions";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, settings } from "client/Logic/Logic";
import { IDriver } from "client/Logic/LogicDefinitions";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { UIHelper } from "client/VideoScreen/UIHelper";

type AnimInterval = IAnimInterval & { addLast: number; addSecondToLast?: number; pause: number };
export class DriverInfoBarDog extends Group {
  public driverBarInfoText: PIXI.Text;
  public driverBarInfo: PIXI.Sprite | undefined;
  public driverBarInfoAnimElement: PIXI.Sprite[] = [];
  private gameType: "dog6" | "dog8" | "dog63" | "horse" | "sulky";
  private isDog8: boolean;
  private gameLength: 120 | 180 | 240 | 300;
  private helper: DogHelper;
  public anims: AnimInterval[] | AnimInterval = [{ startTime: 0.0, duration: 0.0, addLast: 0.0, pause: 0.0 }];
  public drivers: IDriver[] = [];
  private currentDriverIndex: number = -1;
  private racerCount: number;
  private oddsAlwaysOn;
  private useOverlays: boolean;

  public constructor(gameInfo: IGameInfo, helper: DogHelper) {
    super();
    this.gameType = gameInfo.gameType as "dog6" | "dog8" | "dog63" | "horse" | "sulky";
    this.isDog8 = gameInfo.gameType === "dog8";
    this.gameLength = gameInfo.gameLength as 120 | 180 | 240 | 300;
    this.helper = helper;
    this.showDebug(settings.debug, undefined, "DriverInfoBar");
    this.racerCount = Logic.getRacerCount(this.gameType);
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.useOverlays = gameInfo.useOverlays;

    const defaultStyle = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLightItalic",
      fontSize: _s(12),
      fill: "#EEE",
      letterSpacing: _s(1.6),
      align: "center",
      fontStyle: "italic"
    });

    if (this.useOverlays) {
      this.driverBarInfo = new PIXI.Sprite();
      this.driverBarInfo.anchor.set(0.5);
      this.add(this.driverBarInfo);

      this.driverBarInfoAnimElement[0] = new PIXI.Sprite();
      this.driverBarInfoAnimElement[0].anchor.set(0.5);
      this.add(this.driverBarInfoAnimElement[0]);
      this.driverBarInfoAnimElement[1] = new PIXI.Sprite();
      this.driverBarInfoAnimElement[1].anchor.set(0.5);
      this.add(this.driverBarInfoAnimElement[1]);
    }

    this.driverBarInfoText = Logic.createPixiText(defaultStyle);
    this.driverBarInfoText.anchor.set(0.5);
    this.add(this.driverBarInfoText);
  }

  public fill(drivers: IDriver[], withBonus: boolean): void {
    this.drivers = drivers;
    this.anims = DriverPresentationDog.createAnim(this.gameType, Logic.implementation.getCurrentIntroGameLength(), withBonus, this.oddsAlwaysOn).bar;
  }

  public onLayout(): void {
    if (this.useOverlays) {
      if (this.driverBarInfo) {
        this.driverBarInfo.texture = DrawHelper.createSkewedRoundedRectangleTexture(this.width, this.height, UIHelper.getSkewedRadius(this.height), UIHelper.getSkewedPixel(this.height), {
          type: "mixed",
          verti: true,
          color: this.isDog8 ? "#1e4a3a" : DogHelper.getColorByGame(this.gameType, "#022841"),
          color2: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameType, "#04172a"),
          start: 0.4,
          end: 0.6,
          opacity: 0.57
        });
        this.driverBarInfo.x = this.width / 2;
        this.driverBarInfo.y = this.height / 2;
      }

      for (let i = 0; i < 2; i++) {
        this.driverBarInfoAnimElement[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(
          this.height / 2,
          this.height,
          UIHelper.getSkewedRadius(this.height),
          UIHelper.getSkewedPixel(this.height),
          {
            type: "solid",
            color: this.isDog8 ? "#329e69" : DogHelper.getColorByGame(this.gameType, "#1658E5")
          }
        );
        this.driverBarInfoAnimElement[i].x = this.width / 2;
        this.driverBarInfoAnimElement[i].y = this.height / 2;
      }
    }

    this.driverBarInfoText.x = this.width * 0.5;
    this.driverBarInfoText.y = this.height * 0.5;
    this.driverBarInfoText.alpha = 1;
  }

  public updateTexts(currentIndex: number): boolean {
    const drivers = this.drivers;
    if (!drivers || !drivers[currentIndex]) {
      return false;
    }
    const driver = drivers[currentIndex];
    this.driverBarInfoText.text = driver.driverBarText;
    return true;
  }

  public update(): void {
    const currentTime = Logic.getVideoTime();
    const currentBarAnim = !Array.isArray(this.anims) ? this.anims : Logic.getAnim(currentTime, this.anims, this);
    if (!currentBarAnim) return;

    if (Array.isArray(currentBarAnim)) {
      if (currentTime > currentBarAnim.startTime + currentBarAnim.duration) {
        this.visible = false;
        return;
      }
    }
    this.visible = true;

    let barDriverIndex = Util.clamp(Math.floor((currentTime - currentBarAnim.startTime) / (currentBarAnim.duration + currentBarAnim.pause)), 0, this.racerCount - 1);
    let barAnim = {
      startTime: currentBarAnim.startTime + barDriverIndex * (currentBarAnim.duration + currentBarAnim.pause),
      duration: currentBarAnim.duration + (barDriverIndex >= this.racerCount - 1 ? currentBarAnim.addLast : 0)
    };

    if (Array.isArray(this.anims)) {
      barDriverIndex = this.anims.indexOf(currentBarAnim);
      barAnim = currentBarAnim;
    }

    if (barDriverIndex !== undefined && barDriverIndex !== this.currentDriverIndex) {
      if (this.updateTexts(barDriverIndex)) this.currentDriverIndex = barDriverIndex;
    }
    const barAnimRelativeStartTime = currentTime - barAnim?.startTime;
    const dur2 = currentBarAnim.duration - 1.0;

    if (barAnimRelativeStartTime < dur2) {
      const value = (barAnimRelativeStartTime - 0.33) * 3;
      const position = value <= 0 ? this.width / 2 : value >= 1 ? this.width : this.width / 2 + (this.width / 2) * value;
      this.driverBarInfoText.alpha = value;
      if (this.useOverlays) {
        if (this.driverBarInfo) this.driverBarInfo.scale.x = value <= 0 ? 0 : value >= 1 ? 1 : value;
        this.driverBarInfoAnimElement[0].position.x = position;
        this.driverBarInfoAnimElement[1].position.x = this.width - position;
        this.driverBarInfoAnimElement[0].alpha = position === this.width || position === this.width / 2 ? 0 : 1;
        this.driverBarInfoAnimElement[1].alpha = position === this.width || position === this.width / 2 ? 0 : 1;
      }
    } else {
      const value = (1.0 - (barAnimRelativeStartTime - dur2)) * 3;
      const position = value <= 0 ? this.width / 2 : value >= 1 ? this.width : this.width / 2 + (this.width / 2) * value;
      this.driverBarInfoText.alpha = value;
      if (this.useOverlays) {
        if (this.driverBarInfo) this.driverBarInfo.scale.x = value >= 1 ? 1 : value <= 0 ? 0 : value;
        this.driverBarInfoAnimElement[0].position.x = position;
        this.driverBarInfoAnimElement[1].position.x = this.width - position;
        this.driverBarInfoAnimElement[0].alpha = position === this.width / 2 || position === this.width ? 0 : 1;
        this.driverBarInfoAnimElement[1].alpha = position === this.width / 2 || position === this.width ? 0 : 1;
      }
    }
  }
}
