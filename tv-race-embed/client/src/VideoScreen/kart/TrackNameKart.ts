import { kartTrackNameTimings } from "./../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings } from "client/Logic/Logic";
import { AnimatedText } from "../common/AnimatedText";
import { ITrack, IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { GameLength } from "common/Definitions";

type Anim = IAnimInterval;

export class TrackNameKart extends Group {
  private trackName: AnimatedText;
  private trackCountry: PIXI.Text;
  private gameLength: GameLength;
  private anims: Anim[] = [];
  private oddsAlwaysOn;

  public constructor(gameLength: GameLength, oddsAlwaysOn = false) {
    super();

    this.oddsAlwaysOn = oddsAlwaysOn;
    this.gameLength = gameLength;
    this.showDebug(settings.debug, undefined, "TrackNameKart");

    const styleLight = new PIXI.TextStyle({
      fontFamily: "DIN-Light",
      fontSize: _s(17),
      fill: "white",
      lineHeight: _s(17),
      align: "center"
    });

    if (this.oddsAlwaysOn) {
      styleLight.fontSize = _s(7);
      styleLight.lineHeight = _s(7);
      styleLight.letterSpacing = _s(0.6);
      styleLight.align = "left";
    }
    this.trackName = new AnimatedText("", styleLight);
    this.trackName.anchor.set(0.5);
    this.trackName.roundPixels = true;
    this.add(this.trackName);

    const styleNormal = new PIXI.TextStyle({
      fontFamily: "DIN-Medium",
      fontSize: _s(16),
      fill: "white",
      align: "center"
    });
    if (this.oddsAlwaysOn) {
      styleNormal.fontSize = _s(8);
      styleNormal.align = "left";
    }
    this.trackCountry = Logic.createPixiText(styleNormal);
    this.trackCountry.anchor.set(0.5);
    this.add(this.trackCountry);
  }

  public fill(track: ITrack, withBonus: boolean) {
    this.trackName.setText(track.name);
    this.trackCountry.text = track.country;

    this.anims = this.createAnim(this.gameLength, withBonus);

    Logic.autoSize(this.trackName, _s(180));
  }

  public onLayout() {
    this.trackName.position.x = _s(92);
    this.trackName.position.y = _s(42);

    this.trackCountry.position.x = _s(85);
    this.trackCountry.position.y = _s(94);

    if (this.oddsAlwaysOn) {
      this.trackName.anchor.set(0, 0);
      this.trackName.position.x = _s(5);
      this.trackName.position.y = _s(7);

      this.trackCountry.position.x = _s(20);
      this.trackCountry.position.y = _s(38);
    }
  }

  private createAnim(gameLength: GameLength, withBonus: boolean) {
    if (this.oddsAlwaysOn) return kartTrackNameTimings[gameLength as 120 | 240 | 300];
    switch (gameLength) {
      case 120:
        return [];
      case 180:
        return [withBonus ? { startTime: 40.0, duration: 18.5 } : { startTime: 50.0, duration: 18.5 }];
      case 240:
        return [withBonus ? { startTime: 50.0, duration: 18.5 } : { startTime: 50.0, duration: 18.5 }];
      case 300:
        return [withBonus ? { startTime: 50.0, duration: 19.5 } : { startTime: 59.5, duration: 20.0 }];
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
    this.setDebugFade(baseFactor);
    this.trackName.animateText(baseFactor * 0.5);
    this.trackCountry.alpha = baseFactor - 0.2;
  }
}
