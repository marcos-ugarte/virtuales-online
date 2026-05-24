import { settings } from "./../../Logic/Logic";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import { IAnimInterval, IGameInfo, RoundBonusType } from "client/Logic/LogicDefinitions";
import { DrawHelper, Fill } from "../common/DrawHelper";
import { UIHelper } from "../UIHelper";
import { GameLength, GameType } from "common/Definitions";
import { oddsAlwaysOnBonusBarTimings, oddsAlwaysOnSendPlanTimings } from "settings/OddsAlwaysOnSettings";
import { DogHelper } from "client/VideoScreen/dog/DogHelper";
import { AnimHelper } from "client/VideoScreen/common/Anim";

export class TopBarRight extends Group {
  private cacheGroup: Group;
  private raceBar: PIXI.Sprite;
  private countdownBar: PIXI.Sprite;
  private bonusBar: PIXI.Sprite;
  private timeBarBlue: PIXI.Sprite;
  private timeBarRed: PIXI.Sprite;
  private timeBarYellow: PIXI.Sprite;
  private mask: PIXI.Graphics;
  private timeMask: PIXI.Graphics;
  //private bonusType: RoundBonusType | undefined;

  private margin = 0;
  private lineHeight = 0;
  private lineHeightBottom = 0;
  private lineWidthBottom = 0;
  private gameWidth = 0;
  private timeWidth = 0;
  private gameType: GameType;
  private gameLength: GameLength;
  private anims: IAnimInterval[] = [];
  private raceStart: number | undefined;
  private isDog8: boolean;
  private hasBonus: boolean = false;
  private oddsAlwaysOn;
  private useOverlays: boolean;
  public constructor(gameInfo: IGameInfo) {
    super();
    this.gameType = gameInfo.gameType;
    this.gameLength = gameInfo.gameLength;
    this.isDog8 = gameInfo.gameType === "dog8";
    this.showDebug(settings.debug, undefined, "TopBarRight");
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.useOverlays = gameInfo.useOverlays;
    this.cacheGroup = new Group();
    this.anims = this.createAnims(gameInfo.gameType, gameInfo.gameLength);
    this.add(this.cacheGroup);

    this.margin = _s(3);
    this.lineHeight = _s(34);
    this.lineHeightBottom = _s(16);
    this.lineWidthBottom = _s(156);
    this.gameWidth = _s(120);
    this.timeWidth = _s(112);

    this.mask = DrawHelper.createSkewedRoundedRectangleGraphics(
      -UIHelper.getSkewedPixel(this.lineHeight),
      0,
      this.gameWidth + this.margin + this.timeWidth,
      this.lineHeight + 2 * (this.margin + this.lineHeightBottom),
      UIHelper.getSkewedRadius(this.lineHeight),
      UIHelper.getSkewedPixel(this.lineHeight + 2 * this.lineHeightBottom)
    );
    this.cacheGroup.add(this.mask as PIXI.DisplayObject);
    this.cacheGroup.container.mask = this.mask;

    this.timeMask = DrawHelper.createSkewedRoundedRectangleGraphics(
      this.gameWidth - this.margin,
      0,
      this.timeWidth,
      this.lineHeight,
      UIHelper.getSkewedRadius(this.lineHeight),
      UIHelper.getSkewedPixel(this.lineHeight)
    );
    this.cacheGroup.add(this.timeMask as PIXI.DisplayObject);

    this.timeBarBlue = new PIXI.Sprite();
    this.timeBarBlue.x = this.gameWidth - this.margin;
    this.timeBarBlue.y = 0;
    this.timeBarBlue.mask = this.timeMask;
    this.cacheGroup.add(this.timeBarBlue);
    this.timeBarRed = new PIXI.Sprite();
    this.timeBarRed.x = this.gameWidth - this.margin;
    this.timeBarRed.y = 0;
    this.cacheGroup.add(this.timeBarRed);
    this.timeBarYellow = new PIXI.Sprite();
    this.timeBarYellow.x = this.gameWidth - this.margin;
    this.timeBarYellow.y = 0;
    this.cacheGroup.add(this.timeBarYellow);

    this.raceBar = new PIXI.Sprite();
    this.raceBar.x = 0;
    this.raceBar.y = 0;
    this.raceBar.anchor.set(0, 0);
    this.cacheGroup.add(this.raceBar);

    this.countdownBar = new PIXI.Sprite();
    this.countdownBar.y = this.lineHeight + this.margin;
    this.cacheGroup.add(this.countdownBar);
    this.bonusBar = new PIXI.Sprite();
    this.bonusBar.y = this.lineHeight + this.margin + this.lineHeightBottom + this.margin;
    this.cacheGroup.add(this.bonusBar);
  }

  public createAnims(gameType: GameType, gameLength: GameLength): IAnimInterval[] {
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
    /*if (gameType === "dog6") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnSendPlanTimings.dog6;
      switch (gameLength) {
        case 300:
          return [{ startTime: 0.2, duration: 9.6 }];
        default: {
          return [{ startTime: 0.0, duration: 9.75 }];
        }
      }
    } else if (gameType === "dog63") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnSendPlanTimings.dog63;
      switch (gameLength) {
        case 300:
          return [{ startTime: 0.2, duration: 13.2 }];
        default: {
          return [{ startTime: 0.0, duration: 9.75 }];
        }
      }
    } else if (gameType === "dog8") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnSendPlanTimings.dog8;
      // dog8
      switch (gameLength) {
        case 300:
          return [{ startTime: 0.2, duration: 9.6 }];
        default: {
          return [{ startTime: 0.0, duration: 9.75 }];
        }
      }
    }
    // horse
    if (this.oddsAlwaysOn) return oddsAlwaysOnSendPlanTimings.horse;

    return [{ startTime: 0.0, duration: 9.75 }];*/
  }

  public fill(hasBonus: boolean, raceStart?: number) {
    this.raceStart = raceStart;
    this.hasBonus = hasBonus;
    if (hasBonus && this.useOverlays) {
      this.bonusBar.texture = DrawHelper.createSkewedRoundedRectangleTexture(
        this.lineWidthBottom,
        this.lineHeightBottom,
        UIHelper.getSkewedRadius(this.lineHeightBottom),
        UIHelper.getSkewedPixel(this.lineHeightBottom),
        {
          type: "gradient",
          verti: true,
          color: "#e00611",
          color2: "#bb100f",
          opacity: 0.93
        }
      );
      this.bonusBar.x = -2 * UIHelper.getSkewedPixel(this.lineHeightBottom);
    }
  }

  public onLayout() {
    if (this.useOverlays) {
      const fill: Fill[] =
        this.gameType === "dog8"
          ? [
              {
                type: "mixed",
                verti: false,
                color: "#004735",
                color2: "#194233",
                opacity: 0.9
              },
              {
                type: "mixed",
                verti: true,
                color: "#329e69",
                color2: "#004735",
                opacity: 0.85
              }
            ]
          : [
              {
                type: "mixed",
                verti: false,
                color: DogHelper.getColorByGame(this.gameType, "#04172a"),
                color2: DogHelper.getColorByGame(this.gameType, "#042c46"),
                start: 0.9,
                end: 1.5,
                opacity: 0.9
              },
              {
                type: "mixed",
                verti: true,
                color: DogHelper.getColorByGame(this.gameType, "#355cb5"),
                color2: DogHelper.getColorByGame(this.gameType, "#08294c"),
                start: 0.25,
                end: 1.15,
                opacity: 0.85
              }
            ];
      this.timeBarBlue.texture = DrawHelper.createSkewedRoundedRectangleTexture(
        this.timeWidth,
        this.lineHeight,
        UIHelper.getSkewedRadius(this.lineHeight),
        UIHelper.getSkewedPixel(this.lineHeight),
        fill
      );

      this.timeBarRed.texture = DrawHelper.createSkewedRoundedRectangleTexture(this.timeWidth, this.lineHeight, UIHelper.getSkewedRadius(this.lineHeight), UIHelper.getSkewedPixel(this.lineHeight), [
        {
          type: "mixed",
          verti: false,
          color: "#e0272d",
          color2: "#991f24",
          start: 0.25,
          end: 1.5
        },
        {
          type: "mixed",
          verti: true,
          color: "#e0272d",
          color2: "#991f24",
          start: 0.25,
          end: 1.15,
          opacity: 0.85
        }
      ]);

      this.timeBarYellow.texture = DrawHelper.createSkewedRoundedRectangleTexture(
        this.timeWidth,
        this.lineHeight,
        UIHelper.getSkewedRadius(this.lineHeight),
        UIHelper.getSkewedPixel(this.lineHeight),
        [
          {
            type: "mixed",
            verti: true,
            color: "#d8c54c",
            color2: "#4f4225",
            start: 0.25,
            end: 1.5,
            opacity: 0.93
          }
        ]
      );

      this.raceBar.texture = DrawHelper.createSkewedRoundedRectangleTexture(this.gameWidth, this.lineHeight, UIHelper.getSkewedRadius(this.lineHeight), UIHelper.getSkewedPixel(this.lineHeight), {
        type: "mixed",
        color: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameType, "#04172a"),
        color2: this.isDog8 ? "#10261e" : DogHelper.getColorByGame(this.gameType, "#022841"),
        start: -1,
        end: 1
      });
      this.countdownBar.texture = DrawHelper.createSkewedRoundedRectangleTexture(
        this.lineWidthBottom,
        this.lineHeightBottom,
        UIHelper.getSkewedRadius(this.lineHeightBottom),
        UIHelper.getSkewedPixel(this.lineHeightBottom),
        {
          type: "solid",
          color: "#e6e6e6"
        }
      );
      this.countdownBar.x = -UIHelper.getSkewedPixel(this.lineHeightBottom);
    }
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    const raceTime = Logic.getRaceVideoTime();
    const countdown = this.raceStart && this.useOverlays ? Logic.getExactTimeUntilRace(this.raceStart) : Logic.getTimeUntilRaceForTimeBar() - Logic.getVideoTime();

    const anim = Logic.getAnim(t, this.anims, this);

    this.visible = raceTime <= 0;

    let start: number;
    let duration: number;

    start = 0.25;
    duration = 1.1;
    AnimHelper.animateIn(t - start, 0, duration, duration, 1, 0, (f1) => {
      this.raceBar.position.x = -(this.lineHeight + this.gameWidth) * f1;
      this.mask.position.x = -this.lineHeight * f1;
    });

    start = 0.7;
    duration = 0.7;
    AnimHelper.animateIn(t - start, 0, duration, duration, 1, 0, (f1) => {
      this.timeBarBlue.position.x = this.gameWidth - this.margin - this.timeWidth * f1;
    });

    start = 0.35;
    duration = 1.3;
    AnimHelper.animateIn(t - start, 0, duration, duration, 1, 0, (f1) => {
      this.countdownBar.position.x = -UIHelper.getSkewedPixel(this.lineHeightBottom) - (this.lineHeight + this.lineWidthBottom) * f1;
    });

    if (anim) {
      if (t <= anim.startTime + anim.duration - 1) {
        start = anim.startTime;
        duration = 0.9;
        AnimHelper.animateIn(t - start, 0, duration, duration, 0, 1, (f1) => {
          this.bonusBar.position.x = -2 * UIHelper.getSkewedPixel(this.lineHeightBottom) - this.lineWidthBottom * f1;
        });
      } else {
        start = anim.startTime + anim.duration;
        duration = 0.9;
        AnimHelper.animateIn(t - start, 0, duration, duration, 1, 0, (f1) => {
          this.bonusBar.position.x = -2 * UIHelper.getSkewedPixel(this.lineHeightBottom) - this.lineWidthBottom * f1;
        });
      }
    } else {
      start = 0.65;
      duration = 1.2;
      AnimHelper.animateIn(t - start, 0, duration, duration, 1, 0, (f1) => {
        this.bonusBar.position.x = -2 * UIHelper.getSkewedPixel(this.lineHeightBottom) - (this.lineHeight + this.lineWidthBottom) * f1;
      });
    }

    if (countdown <= 11 && Logic.isInIntro()) {
      const val = countdown % 1 <= 0.5;
      this.timeBarRed.alpha = val ? 0.0 : 1.0;
      this.timeBarBlue.alpha = val ? 1.0 : 0.0;
      return;
    } else if (raceTime >= 0) {
      this.timeBarBlue.alpha = 0.0;
      this.timeBarRed.alpha = 0.0;
      this.timeBarYellow.alpha = 0.0;
      /*if (raceTime >= 30) {
        this.timeBarBlue.alpha = 0.0;
        this.timeBarYellow.alpha = 1.0;
      }
      this.bonusBar.alpha = 0.0;
      this.countdownBar.alpha = 0.0;
      return;*/
    } else {
      this.timeBarBlue.alpha = 1.0;
      this.timeBarRed.alpha = 0.0;
      this.timeBarYellow.alpha = 0.0;
    }
    this.countdownBar.alpha = 1.0;
    this.bonusBar.alpha = 1.0;
  }
}
