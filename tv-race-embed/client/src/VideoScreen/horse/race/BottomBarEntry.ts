import { Group } from "client/Graphics/Group";
import { _s, settings, Logic } from "client/Logic/Logic";
import { AnimHelper } from "../../common/Anim";
import { IDriver } from "client/Logic/LogicDefinitions";
import { HorseHelper } from "./../HorseHelper";
import * as PIXI from "pixi.js";
import { Texture } from "pixi.js";
import { HorseGender } from "client/LogicImplementation/ModelHorse";
// top right lap info for trackpresentation
// TODO: fade in/out
// TODO: change Text accordingly
// TODO: clip with roundedskewedRectangle mask?
export class BottomBarEntry extends Group {
  private factsKeys: PIXI.Text[] = [];
  private factValues: PIXI.Text[] = [];

  private sexIcon: PIXI.Sprite;
  private sexIconTextures: Texture[] = [];

  public constructor(sexIconTextures: Texture[]) {
    super();

    this.showDebug(settings.debug, undefined, "BBEntry");

    this.sexIconTextures = sexIconTextures;
    this.sexIcon = new PIXI.Sprite(sexIconTextures[0]);
    this.sexIcon.anchor.set(1, 1);
    this.add(this.sexIcon);

    const styleKeys = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLightItalic",
      fontSize: _s(24),
      fill: HorseHelper.getWhiteColor()
    });
    const styleValues = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(28),
      letterSpacing: _s(1),
      fill: HorseHelper.getWhiteColor()
    });

    // create the facts
    for (let i = 0; i < 3; i++) {
      const key = Logic.createPixiText(styleKeys);
      key.anchor.set(0, 1);
      this.factsKeys.push(key);
      this.add(key);

      const value = Logic.createPixiText(styleValues);
      value.anchor.set(1, 1);
      this.factValues.push(value);
      this.add(value);
    }
  }

  public fill(driver: IDriver): void {
    if (!driver.driverRaceInfos) return;
    for (let i = 0; i < this.factsKeys.length; i++) {
      this.factsKeys[i].text = driver.driverRaceInfos[i].key;
      this.factValues[i].text = driver.driverRaceInfos[i].value;

      Logic.autoSize(this.factsKeys[i], _s(65));

      if (i === 2) {
        Logic.autoSize(this.factValues[i], _s(65));
      }
    }

    if (this.sexIcon) {
      const sexValue = driver.driverRaceInfos[1].value as HorseGender;
      if (sexValue === HorseGender.female) this.sexIcon.texture = this.sexIconTextures[0];
      else if (sexValue === HorseGender.male) this.sexIcon.texture = this.sexIconTextures[1];
      else if (sexValue === HorseGender.gelding) this.sexIcon.texture = this.sexIconTextures[2];
    }
  }

  public onLayout(): void {
    const offsetKeyX = 35;
    const offsetValueX = 163;
    const offsetY = 81 + 14;
    const rowOffsetX = -8;
    const rowOffsetY = 56;

    for (let i = 0; i < this.factsKeys.length; i++) {
      const value = this.factValues[i];
      const key = this.factsKeys[i];
      // todo: layout stuff
      value.x = _s(offsetValueX + rowOffsetX * i);
      value.y = _s(offsetY + 1 + i * rowOffsetY);
      key.y = _s(offsetY + i * rowOffsetY);
      key.x = _s(offsetKeyX + rowOffsetX * i);
    }

    if (this.sexIcon) {
      this.sexIcon.x = this.factValues[1].x;
      this.sexIcon.y = this.factValues[1].y - _s(3);
      const heightFactor = 72 / 60;
      this.sexIcon.width = _s(22);
      this.sexIcon.height = _s(22 * heightFactor);
    }
    this.factValues[1].visible = !this.sexIcon;

    // this.line1.x = (this.alignLeft ? _s(0) : this.width - _s(0));
    // this.line1.y = _s(8 + 7);
  }

  public updateAnims(baseFactor: number, duration: number, fadeInSpeedFactor: number = 1): void {
    this.showDebugTime("BBEntry", baseFactor);
    // const t = Logic.getVideoTime();
    // //const anim = Logic.getAnim(t, this.anims, this);
    // if (!anim) {
    //   this.visible = false;
    //   return;
    // }
    // this.visible = true;

    // const baseFactor = t - anim.startTime;

    const fadeInDuration = 0.5 * fadeInSpeedFactor;

    // AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.6, 0, 1, (val) => this.line1.alpha = val, 0.5, 0);
    // if (t < anim.startTime + anim.duration - 1)
    //   AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.5, 0, 1, (val) => this.line1.scale.x = val, 0.5, 0);
    for (let i = 0; i < this.factsKeys.length; i++) {
      AnimHelper.animateInOut(baseFactor, 0.05, duration, fadeInDuration, 0, 1, (alpha) => (this.factsKeys[i].alpha = alpha), 0.5, 0);
      AnimHelper.animateInOut(baseFactor, 0.1 * fadeInSpeedFactor, duration - 0.1 * fadeInSpeedFactor, 0.5, 0, 1, (alpha) => (this.factValues[i].alpha = alpha), 0.5, 0);
    }
    AnimHelper.animateInOut(baseFactor, 0.1 * fadeInSpeedFactor, duration - 0.1 * fadeInSpeedFactor, 0.5, 0, 1, (alpha) => (this.sexIcon.alpha = alpha), 0.5, 0);
  }
}
