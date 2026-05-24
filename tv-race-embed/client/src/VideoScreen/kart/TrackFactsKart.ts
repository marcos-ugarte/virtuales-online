import { kartTrackFactsTimings } from "./../../../settings/OddsAlwaysOnSettings";
import { AnimatedText } from "../common/AnimatedText";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings } from "client/Logic/Logic";
import { ITrack, IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { GameLength } from "common/Definitions";

type Anim = IAnimInterval;

export class TrackFactsKart extends Group {
  private headers: AnimatedText[] = [];
  private values: AnimatedText[] = [];
  private gameLength: GameLength;
  private anims: Anim[] = [];
  private oddsAlwaysOn: boolean;

  public constructor(gameLength: GameLength, oddsAlwaysOn = false) {
    super();

    this.oddsAlwaysOn = oddsAlwaysOn;
    this.gameLength = gameLength;
    this.showDebug(settings.debug, undefined, "TrackFactsKart");

    const styleLight = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLight",
      fontSize: _s(17),
      fill: "white",
      align: "right"
    });

    const styleNormal = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(17),
      fill: "white",
      align: "right"
    });

    if (this.oddsAlwaysOn) {
      styleLight.fontSize = _s(6.8);
      styleLight.letterSpacing = _s(0.5);
      styleNormal.letterSpacing = _s(0.5);
      styleNormal.fontSize = _s(6.8);
    }

    for (let i = 0; i < 3; i++) {
      const value = new AnimatedText("", styleLight);
      value.anchor.set(1.0, 0.5);
      this.add(value);
      this.values.push(value);

      const header = new AnimatedText("", styleNormal);
      header.anchor.set(1.0, 0.5);
      this.add(header);
      this.headers.push(header);
    }
  }

  public fill(track: ITrack, withBonus: boolean) {
    for (let i = 0; i < track.facts.length; i++) {
      const fact = track.facts[i];
      this.headers[i].setText(fact.key);
      this.values[i].setText(fact.value);
    }
    this.anims = this.createAnims(this.gameLength, withBonus);
  }

  public onLayout() {
    let rightX = 169;
    let rowOffset = 52;
    let firstLineStart = 13;
    let secondLineStart = 30;

    if (this.oddsAlwaysOn) {
      rightX = 97.5;
      rowOffset = 20.8;
      firstLineStart = 10;
      secondLineStart = 17;
    }

    for (let i = 0; i < this.headers.length; i++) {
      const header = this.headers[i];
      header.position.x = _s(rightX);
      header.position.y = _s(firstLineStart + rowOffset * i);
      const value = this.values[i];
      value.position.x = _s(rightX);
      value.position.y = _s(secondLineStart + rowOffset * i);
    }
  }

  private createAnims(gameLength: GameLength, withBonus: boolean): Anim[] {
    if (this.oddsAlwaysOn) return kartTrackFactsTimings[gameLength as 120 | 240 | 300];
    switch (gameLength) {
      case 120:
        return [];
      case 180:
        return [withBonus ? { startTime: 40.0, duration: 18.5 } : { startTime: 50.0, duration: 18.5 }];
      case 240:
        return [withBonus ? { startTime: 50.0, duration: 18.5 } : { startTime: 50.0, duration: 18.5 }];
      case 300:
        return [withBonus ? { startTime: 50.3, duration: 18.5 } : { startTime: 60.5, duration: 18.5 }];
    }
    return [];
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;

    const baseFactor = AnimHelper.limit(t - anim.startTime, anim.duration);

    this.setDebugFade(AnimHelper.clamp(baseFactor));
    for (let i = 0; i < this.headers.length; i++) {
      this.headers[i].animateText(AnimHelper.clamp(baseFactor - (0.0 + 0.4 * i)) * 4);
      this.values[i].animateText(AnimHelper.clamp(baseFactor - (0.2 + 0.4 * i)) * 4);
    }
  }
}
