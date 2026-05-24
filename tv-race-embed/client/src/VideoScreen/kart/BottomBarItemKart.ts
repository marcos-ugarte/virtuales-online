import { oddsAlwayOnBottomBarTimings, oddsAlwaysOnBottomBarFactor } from "./../../../settings/OddsAlwaysOnSettings";
import { AnimHelper } from "./../common/Anim";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { DynamicGeometry, DynamicMeshRect } from "client/Graphics/DynamicMesh";
import { Logic, _s, settings } from "client/Logic/Logic";
import { IColors, IDriver, IAnimInterval } from "client/Logic/LogicDefinitions";
import { MultiStyleText } from "./../common/MultiStyleText";
import { GameLength } from "common/Definitions";
import { Color } from "common/Color";

import StatArrow from "../../../assets/general/arrow_stat_white.svg";
import { DogHelper } from "../dog/DogHelper";
type AnimType = IAnimInterval & ({ infoTime?: undefined } | { infoStart: number; infoTime: number; infoFadeOut: number; fadeSpeedFactor?: number });

export class BottomBarItemKart extends Group {
  private index: number;
  private numberText: PIXI.Text;
  private driverName!: MultiStyleText;
  private dg = new DynamicGeometry("Pos2Color", 16, 24);
  private redRect: DynamicMeshRect;
  private mainRect: DynamicMeshRect;
  private colorMarker: DynamicMeshRect;
  private numberRect: DynamicMeshRect;
  private infoKeys: PIXI.Text[] = [];
  private infoValues: PIXI.Text[] = [];
  private infoGroup: PIXI.Container;
  private gameLength: GameLength;
  private language: string;
  private anims: AnimType[] = [];
  private oddsAlwaysOn: boolean;
  private trendArrow = new PIXI.Sprite();

  public constructor(index: number, gameLength: GameLength, langauge: string, oddsAlwaysOn = false) {
    super();

    this.index = index;
    this.gameLength = gameLength;
    this.language = langauge;
    this.oddsAlwaysOn = oddsAlwaysOn;

    this.redRect = new DynamicMeshRect();
    // this.dg.add(this.redRect);

    this.mainRect = new DynamicMeshRect();
    // this.dg.add(this.mainRect);

    this.numberRect = new DynamicMeshRect();
    // this.dg.add(this.numberRect);

    this.colorMarker = new DynamicMeshRect();
    // this.dg.add(this.colorMarker);

    Logic.loadSVG(StatArrow as string, { width: _s(12) }).then((texture) => {
      this.trendArrow.texture = texture;
    });

    this.add(this.dg);

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-HeavyItalic",
        fontSize: _s(22),
        fill: 0xffffff,
        fontStyle: "italic"
      });
      this.numberText = Logic.createPixiText(style, "" + (index + 1));
      this.numberText.position.y = _s(12);
      this.numberText.anchor.set(0.5);
      // this.container.addChild(this.numberText);
    }

    this.driverName = new MultiStyleText();
    this.add(this.driverName);
    this.driverName.position.x = _s(50);

    const infoGroupWithMask = new PIXI.Container();
    this.add(infoGroupWithMask);
    this.infoGroup = new PIXI.Container();
    infoGroupWithMask.addChild(this.infoGroup);
    {
      const greyStyle = new PIXI.TextStyle({
        fontFamily: "DIN-UltraLight",
        fontSize: _s(12),
        fill: 0xbfbfbf
      });
      const whiteStyle = new PIXI.TextStyle({
        fontFamily: "DIN-Regular",
        fontSize: _s(13),
        fill: 0xffffff
      });
      this.infoGroup.addChild(this.trendArrow);

      const offsetX = _s(105);
      for (let i = 0; i < 5; i++) {
        const key = Logic.createPixiText(greyStyle);
        key.x = _s(75 - 12 * i);
        key.y = _s(0 + 25 * i);
        this.infoKeys.push(key);
        this.infoGroup.addChild(key);

        const value = Logic.createPixiText(whiteStyle);
        value.x = key.x + offsetX;
        value.y = key.y;
        this.infoValues.push(value);
        this.infoGroup.addChild(value);
      }

      const maskG = new PIXI.Graphics();
      maskG.beginFill(0x555555);
      maskG.drawRect(_s(0), _s(-200), _s(500), _s(200));
      maskG.endFill();
      infoGroupWithMask.addChild(maskG);
      infoGroupWithMask.mask = maskG;
    }
  }

  public fill(driver: IDriver, colors: IColors, withBonus: boolean) {
    this.redRect.color = settings.colors.debugRed;
    this.mainRect.color = colors.panelColorBottom;
    this.numberRect.color = colors.panelColorBottomNumber;
    this.colorMarker.color = driver.color;

    this.numberText.tint = Color.ARGBtoHex(driver.color);
    this.driverName.text = driver.firstName.toUpperCase() + " <b>" + driver.lastName.toUpperCase() + "</b>";
    this.driverName.styles = {
      default: {
        fontFamily: "DIN-UltraLight",
        fill: "white",
        fontSize: _s(14),
        valign: "middle",
        letterSpacing: _s(1),
        maxLines: 1,
        wordWrap: true,
        wordWrapWidth: _s(150)
      },
      b: { fontFamily: "DIN-Medium", fill: "white", fontSize: _s(14), valign: "middle", letterSpacing: _s(1) }
    };
    this.driverName.anchor.set(0, 0.51);

    for (let i = 0; i < this.infoKeys.length; i++) {
      this.infoKeys[i].text = driver.driverInfos[i].key;

      if (this.infoKeys[i].text.includes("TREND") || (i === 4 && parseInt(driver.driverInfos[i].value, 10) > 0 && parseInt(driver.driverInfos[i].value, 10) <= 5)) {
        this.trendArrow.x = this.infoValues[i].x + this.trendArrow.width * 0.5;
        this.trendArrow.anchor.set(0.5);
        this.trendArrow.y = this.infoValues[i].y + this.trendArrow.height * 0.5;

        const trend = parseInt(driver.driverInfos[i].value, 16);
        this.addTrendArrow(trend);
      } else {
        this.infoValues[i].text = driver.driverInfos[i].value;
      }
      Logic.autoSize(this.infoKeys[i], _s(100));
      Logic.autoSize(this.infoValues[i], _s(80));
    }
    this.trendArrow.visible = this.infoKeys[4].text.includes("TREND") || (parseInt(driver.driverInfos[4].value, 10) > 0 && parseInt(driver.driverInfos[4].value, 10) <= 5);
    this.anims = this.createAnims(this.gameLength, withBonus, this.language);
  }

  private addTrendArrow(trend: number) {
    const arrowColors = DogHelper.getStatArrowColors();
    this.trendArrow.cacheAsBitmap = false;
    this.trendArrow.tint = 0xffffff;
    this.trendArrow.rotation = 0;
    switch (trend) {
      case 1:
        this.trendArrow.rotation = Math.PI / 2;
        this.trendArrow.tint = arrowColors.DOWN90;
        break;
      case 2:
        this.trendArrow.tint = arrowColors.DOWN45;
        this.trendArrow.rotation = Math.PI / 4;
        break;
      case 3:
        this.trendArrow.tint = arrowColors.NEUTRAL;
        break;
      case 4:
        this.trendArrow.rotation = -Math.PI / 4;
        this.trendArrow.tint = arrowColors.UP45;
        break;
      case 5:
        this.trendArrow.rotation = -Math.PI / 2;
        this.trendArrow.tint = arrowColors.UP90;
        break;
    }
    this.trendArrow.cacheAsBitmap = true;
  }

  private createAnims(gameLength: GameLength, withBonus: boolean, language: string): AnimType[] {
    if (this.oddsAlwaysOn) return oddsAlwayOnBottomBarTimings.kart.anims[gameLength as 120 | 240 | 300];
    switch (gameLength) {
      case 120:
        return [
          withBonus
            ? { startTime: 0.75, duration: 11.2, infoStart: 2.9, infoTime: 1.567, infoFadeOut: 2.252, fadeSpeedFactor: 2.0 }
            : { startTime: 0.75, duration: 11.2, infoStart: 2.9, infoTime: 1.567, infoFadeOut: 2.252, fadeSpeedFactor: 2.0 },
          withBonus
            ? { startTime: 35.7, duration: 14.3, infoStart: 3.255, infoTime: 1.88, infoFadeOut: 2.252, fadeSpeedFactor: 1.7 }
            : { startTime: 30.7, duration: 19.3, infoStart: 4.11, infoTime: 2.712, infoFadeOut: 2.52, fadeSpeedFactor: 1.3 }
        ];
      case 180:
        return [
          withBonus
            ? { startTime: 0.75, duration: 16.3, infoStart: 3.69, infoTime: 2.33, infoFadeOut: 2.5, fadeSpeedFactor: 1.5 }
            : { startTime: 0.56, duration: 21.4, infoStart: 4.67, infoTime: 3.084, infoFadeOut: 2.92, fadeSpeedFactor: 1.3 },
          withBonus ? { startTime: 59.5, duration: 19.3 } : { startTime: 69.3, duration: 19.6 },
          withBonus
            ? { startTime: 90.6, duration: 19.5, infoStart: 4.2, infoTime: 2.71, infoFadeOut: 2.52, fadeSpeedFactor: 1.3 }
            : { startTime: 90.6, duration: 19.5, infoStart: 4.2, infoTime: 2.71, infoFadeOut: 2.52, fadeSpeedFactor: 1.3 }
        ];
      case 240:
        return [
          language === "it"
            ? { startTime: 10.6, duration: 18.2, infoStart: 7.37, infoTime: 1.88, infoFadeOut: 2.265, fadeSpeedFactor: 1.8 }
            : { startTime: 0.56, duration: 26.3, infoStart: 5.45, infoTime: 3.84, infoFadeOut: 2.72 },
          { startTime: 69.1, duration: 20.0, infoStart: 26.93, infoTime: 3.84, infoFadeOut: 2.72 },
          language === "it"
            ? { startTime: 90.6, duration: 28.3, infoStart: 11.1, infoTime: 3.09, infoFadeOut: 2.1 }
            : { startTime: 90.6, duration: 26.3, infoStart: 5.45, infoTime: 3.84, infoFadeOut: 2.72 },
          withBonus
            ? { startTime: 150.7, duration: 19.5, infoStart: 4.15, infoTime: 2.705, infoFadeOut: 2.96, fadeSpeedFactor: 1.5 }
            : language === "it"
              ? { startTime: 140.7, duration: 29.0, infoStart: 11.35, infoTime: 3.25, infoFadeOut: 2.16 }
              : { startTime: 140.7, duration: 29.0, infoStart: 5.88, infoTime: 4.35, infoFadeOut: 3.14 }
        ];
      case 300:
        return [
          language === "it"
            ? { startTime: 10.6, duration: 23.2, infoStart: 9.2, infoTime: 2.5, infoFadeOut: 2.32, fadeSpeedFactor: 1.3 }
            : withBonus
              ? { startTime: 0.56, duration: 26.2, infoStart: 5.45, infoTime: 3.84, infoFadeOut: 2.8, fadeSpeedFactor: 1.0 }
              : { startTime: 0.56, duration: 31.1, infoStart: 6.35, infoTime: 4.6, infoFadeOut: 3.32, fadeSpeedFactor: 1.0 },
          withBonus ? { startTime: 69.3, duration: 19.7 } : { startTime: 79.4, duration: 19.5 },
          withBonus
            ? { startTime: 90.5, duration: 26.5, infoStart: 5.6, infoTime: 3.85, infoFadeOut: 3.6, fadeSpeedFactor: 1.3 }
            : language === "it"
              ? { startTime: 101.0, duration: 28.0, infoStart: 10.8, infoTime: 3.08, infoFadeOut: 3.02, fadeSpeedFactor: 1.3 }
              : { startTime: 101.0, duration: 26.0, infoStart: 5.2, infoTime: 3.82, infoFadeOut: 3.7, fadeSpeedFactor: 1.3 },
          withBonus
            ? { startTime: 155.5, duration: 29.5, infoStart: 6.1, infoTime: 4.353, infoFadeOut: 3.17 }
            : language === "it"
              ? { startTime: 155.5, duration: 29.5, infoStart: 11.7, infoTime: 3.2, infoFadeOut: 3.15, fadeSpeedFactor: 1.3 }
              : { startTime: 155.5, duration: 29.5, infoStart: 6.2, infoTime: 4.353, infoFadeOut: 4.2, fadeSpeedFactor: 1.3 }
        ];
    }
    return [];
  }

  public onLayout() {
    this.redRect.height = this.height;
    this.mainRect.height = this.height;
    this.numberRect.height = this.height;

    this.colorMarker.width = _s(4);
    this.colorMarker.height = this.height;

    this.driverName.position.y = this.height * 0.5;
  }

  public update(dt: number) {
    super.update(dt);

    const ct = Logic.getVideoTime();
    const anim = Logic.getAnim(ct, this.anims, this);
    if (!anim) return;

    let indexFactor = this.index;
    if (this.oddsAlwaysOn) {
      indexFactor = this.index * oddsAlwaysOnBottomBarFactor.kart5.bottomBar.factor * (ct >= anim.startTime + anim.duration - 1 ? -1 : 1);
    }
    let baseFactor = ct - (anim.startTime + 0.1 * indexFactor);
    const fadeOutFactor = AnimHelper.clamp((baseFactor - anim.duration) * 2);
    this.container.alpha = 1.0 - fadeOutFactor;

    const redFactor = AnimHelper.clampedRange(baseFactor, 0, 0.8);
    this.redRect.width = AnimHelper.easeOut(redFactor) * this.width;
    this.redRect.alpha = 1.0 - AnimHelper.easeIn(redFactor, 3.0);

    const backgroundWidth = AnimHelper.easeOut(AnimHelper.clampedRange(baseFactor, 0.2, 1.0)) * this.width;
    this.numberRect.width = AnimHelper.clamp(backgroundWidth, 0, 44);
    this.mainRect.x = _s(this.numberRect.width);
    this.mainRect.width = backgroundWidth - this.mainRect.x;

    this.driverName.alpha = AnimHelper.clamp((baseFactor - 0.8) * 2);

    const f = AnimHelper.easeOut(AnimHelper.clampedRange(baseFactor, 0.5, 1.0));
    this.numberText.alpha = f;
    this.numberText.x = _s(23 + (1.0 - f) * 100);

    this.colorMarker.x = _s((1.0 - f) * 100);
    this.colorMarker.alpha = f;

    if (anim.infoTime) {
      const sf = anim.fadeSpeedFactor ? anim.fadeSpeedFactor : 1;

      let indexFactor = this.index;
      if (this.oddsAlwaysOn) {
        indexFactor = 0;
      }

      let infoFactorBase = (baseFactor - (anim.infoStart + anim.infoTime * indexFactor)) * sf;

      let fade = AnimHelper.easeOut(infoFactorBase * 1.2, 4);
      const startFadeOut = anim.infoFadeOut;

      if (infoFactorBase >= startFadeOut) {
        if (this.oddsAlwaysOn) {
          baseFactor = ct - (anim.startTime + 0.1 * (this.index - 2) * -1);

          infoFactorBase = (baseFactor - (anim.infoStart + anim.infoTime * indexFactor)) * sf;
        }
        fade = AnimHelper.easeOut((1.0 - (infoFactorBase - startFadeOut)) * 2.0, 4);
      }
      this.infoGroup.y = _s(fade * -118);
      this.infoGroup.alpha = fade;
    }

    // this.mainRect.x += dt * 0.1;
  }
}
