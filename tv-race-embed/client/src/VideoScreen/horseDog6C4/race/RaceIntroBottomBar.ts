import { Group } from "client/Graphics/Group";
import { _s, settings, Logic } from "client/Logic/Logic";
import { MultiStyleText, ITextStyleSet, IExtendedTextStyle } from "../../common/MultiStyleText";
import { AnimHelper } from "../../common/Anim";
import { IAnimInterval, IDriver } from "client/Logic/LogicDefinitions";
import { HorseHelper } from "../HorseHelper";
import { BottomBarEntry } from "./BottomBarEntry";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { Texture } from "pixi.js";

import IconF from "assets/horse/sex_f.svg";
import IconM from "assets/horse/sex_m.svg";
import IconG from "assets/horse/sex_g.svg";
import { Engine } from "client/Graphics/Engine";

// top right lap info for trackpresentation
// TODO: fade in/out
// TODO: change Text accordingly
// TODO: clip with roundedskewedRectangle mask?
export class RaceIntroBottomBar extends Group {
  private entries: BottomBarEntry[] = [];
  private overlayFadeInBegin: number = 0;
  private overlayFadeInDuration: number = 0;
  private overlayFadeOutBegin: number = 0;
  private overlayFadeOutDuration: number = 0;
  private sexIcons: Texture[] = [];

  public constructor() {
    super();

    Logic.loadSVG(IconF, { width: 24 * Math.max(Engine.instance.resolution, 1.5) }).then((el) => {
      this.sexIcons[0] = el;
    });
    Logic.loadSVG(IconM, { width: 24 * Math.max(Engine.instance.resolution, 1.5) }).then((el) => {
      this.sexIcons[1] = el;
    });
    Logic.loadSVG(IconG, { width: 24 * Math.max(Engine.instance.resolution, 1.5) }).then((el) => {
      this.sexIcons[2] = el;
    });

    this.showDebug(settings.debug, undefined, "BBEntry");
    for (let i = 0; i < 7; i++) {
      const entry = new BottomBarEntry(this.sexIcons);
      this.entries.push(entry);
      this.add(entry);
    }
  }

  public fill(drivers: IDriver[], overlayFadeInBegin: number, overlayFadeInDuration: number, overlayFadeOutBegin: number, overlayFadeOutDuration: number): void {
    this.overlayFadeInBegin = overlayFadeInBegin;
    this.overlayFadeInDuration = overlayFadeInDuration;
    this.overlayFadeOutDuration = overlayFadeOutDuration;
    this.overlayFadeOutBegin = overlayFadeOutBegin;

    for (let i = 0; i < Math.min(drivers.length, this.entries.length); i++) {
      this.entries[i].fill(drivers[i]);
    }
  }

  public onLayout(): void {
    const leftX = 10;
    const topY = 468;
    const width = 200;
    const height = 223;
    const offset = 177;

    let index = 0;
    for (const entry of this.entries) {
      LayoutHelper.setScaledRectangle(entry, leftX + offset * index, topY, width, height);
      // todo: layout
      index++;
    }
    // this.line1.x = (this.alignLeft ? _s(0) : this.width - _s(0));
    // this.line1.y = _s(8 + 7);
  }

  public update(delta: number): void {
    super.update(delta);
    // const t = Logic.getVideoTime();
    // //const anim = Logic.getAnim(t, this.anims, this);
    // if (!anim) {
    //   this.visible = false;
    //   return;
    // }
    // this.visible = true;

    // const baseFactor = t - anim.startTime;

    const t = Logic.getRaceVideoTime();
    if (t < 0) {
      this.visible = false;
      return;
    }

    this.visible = true;

    const entryFadeInOffset = 0.1;
    const entryFadeOutOffset = 0.1;

    // duration is 13.8 per default
    const duration = this.overlayFadeOutBegin - this.overlayFadeInBegin + this.overlayFadeOutDuration;
    const tWithFadeInBegin = t - this.overlayFadeInBegin;

    const fadeInFactor = this.overlayFadeInDuration / 1.5; // 1.5 is the normal fadein, speed it up depending on this factor
    //console.log(`tWithFadeIn: ${duration}, fadeInFactor: ${fadeInFactor}`);

    for (let i = 0; i < this.entries.length; i++) {
      this.entries[i].updateAnims(tWithFadeInBegin - (entryFadeInOffset * i + 0.45) * fadeInFactor, duration - entryFadeInOffset * i * fadeInFactor - entryFadeOutOffset * i, fadeInFactor);
    }

    // AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.6, 0, 1, (val) => this.line1.alpha = val, 0.5, 0);
    // if (t < anim.startTime + anim.duration - 1)
    //   AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.5, 0, 1, (val) => this.line1.scale.x = val, 0.5, 0);
  }
}
