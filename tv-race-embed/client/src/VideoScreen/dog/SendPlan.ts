import { oddsAlwaysOnSendPlanTimings, oddsAlwaysOnStyles, sendPlanSettings } from "./../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings, _t } from "client/Logic/Logic";
import { IAnimInterval, IGameInfo } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { GameType, GameLength } from "common/Definitions";
import { MultiStyleText } from "../common/MultiStyleText";
import { DrawHelper, Fill } from "client/VideoScreen/common/DrawHelper";
import { DogHelper } from "client/VideoScreen/dog/DogHelper";

export class SendPlan extends Group {
  private headers: PIXI.Text[] = [];
  private sendPlanNumber: PIXI.Text;
  private raceNumber: MultiStyleText;
  private raceStart: PIXI.Text;
  private headerX: PIXI.Sprite[] = [];
  private rowsX: PIXI.Sprite[] = [];
  private rowsXMask: PIXI.Graphics[] = [];

  private rowHeightHeader = 0;
  private rowHeight = 0;
  private rowWidth = 0;
  private lineWidthHeader = 0;
  private lineWidthTable = 0;
  private rowCount = 7;

  private offset = 0;
  private additionalYOffset = 0;

  private gameType: GameType;
  private gameLength: GameLength;
  private oddsAlwaysOn;
  private useOverlays;
  private isDog8;
  // create texts, pixi objects and so on in constructor => if possible
  public constructor(gameInfo: IGameInfo) {
    super();
    this.gameType = gameInfo.gameType;
    this.gameLength = gameInfo.gameLength;
    this.showDebug(settings.debug, undefined, "SendPlan");
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.useOverlays = gameInfo.useOverlays;
    this.isDog8 = gameInfo.gameType === "dog8";
    this.offset = _s(8);
    this.additionalYOffset = _s(4);

    if (this.useOverlays) {
      this.lineWidthTable = _s(sendPlanSettings[this.gameType as keyof typeof sendPlanSettings].lineWidthTable);
      this.lineWidthHeader = _s(sendPlanSettings[this.gameType as keyof typeof sendPlanSettings].lineWidthHeader);
      if (this.oddsAlwaysOn) {
        this.rowHeightHeader = _s(sendPlanSettings[this.gameType as keyof typeof sendPlanSettings].rowHeightHeader);
        this.rowHeight = Math.round(_s(sendPlanSettings[this.gameType as keyof typeof sendPlanSettings].lineHeight));
        this.rowWidth = _s(sendPlanSettings[this.gameType as keyof typeof sendPlanSettings].rowWidth);
      } else {
        this.additionalYOffset = -_s(6);
        this.rowHeightHeader = _s(34);
        this.rowHeight = Math.round(_s(41));
        this.rowWidth = _s(820);
      }

      const mask = DrawHelper.createSkewedRoundedRectangleGraphics(
        this.offset,
        this.additionalYOffset + this.offset,
        this.rowWidth,
        this.rowHeightHeader + this.rowHeight * this.rowCount,
        this.rowHeightHeader,
        0
      );
      this.container.mask = mask;
      this.add(mask);

      for (let i = 2; i >= 0; i--) {
        this.headerX[i] = new PIXI.Sprite();
        this.add(this.headerX[i]);
      }

      for (let i = this.rowCount * 3 - 1; i >= 0; i--) {
        this.rowsX[i] = new PIXI.Sprite();
        this.add(this.rowsX[i]);
      }
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(20),
        letterSpacing: _s(0),
        fill: "white",
        align: "center"
      });
      if (this.oddsAlwaysOn) {
        style.fontSize = _s(oddsAlwaysOnStyles[this.gameType as keyof typeof oddsAlwaysOnStyles].sendPlan.sendPlanNumber.fontSize);
      }
      for (let i = 0; i < 3; i++) {
        const header = Logic.createPixiText(style);
        header.anchor.set(0.0, 0.5);
        this.headers.push(header);
        this.add(header);
      }
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(20),
        letterSpacing: _s(0),
        fill: "white",
        align: "center"
      });

      if (this.oddsAlwaysOn) {
        style.fontSize = _s(oddsAlwaysOnStyles[this.gameType as keyof typeof oddsAlwaysOnStyles].sendPlan.sendPlanNumber.fontSize);
      }

      this.sendPlanNumber = Logic.createPixiText(style);
      this.sendPlanNumber.anchor.set(0.0, 0.5);
      this.add(this.sendPlanNumber);
      this.raceNumber = new MultiStyleText();
      this.raceNumber.anchor.set(0.0, 0.5);
      this.add(this.raceNumber);
      this.raceStart = Logic.createPixiText(style);
      this.raceStart.anchor.set(0.0, 0.5);
      this.add(this.raceStart);
    }
  }

  public createAnims(gameType: GameType, gameLength: GameLength): IAnimInterval[] {
    if (gameType === "dog6") {
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

    return [{ startTime: 0.0, duration: 9.75 }];
  }

  // fill texts with infos from model
  public fill(sendPlan: string, raceNumber: string, raceStart: string) {
    this.anims = this.createAnims(this.gameType, Logic.implementation.getCurrentIntroGameLength());
    this.headers[0].text = _t("sheduleId") + ":";
    this.headers[1].text = _t("eventId") + ":";
    this.headers[2].text = _t("raceStart") + ":";

    this.sendPlanNumber.text = sendPlan;

    this.raceNumber.styles = {
      default: {
        fontFamily: "DIN-Bold",
        fontSize: _s(20),
        letterSpacing: _s(0),
        fill: "white",
        align: "center"
      },
      yellow: {
        fontFamily: "DIN-Bold",
        fontSize: _s(20),
        letterSpacing: _s(0),
        fill: "yellow",
        align: "center"
      }
    };
    this.raceNumber.text = raceNumber;
    this.raceStart.text = raceStart;
  }

  // set positions and sizes when layout changes
  public onLayout() {
    const x = _s(41);
    const firstLineY = _s(56);
    let lineHeight = _s(41);

    if (this.oddsAlwaysOn) {
      lineHeight = _s(sendPlanSettings[this.gameType as keyof typeof sendPlanSettings].lineHeight);
      lineHeight = this.useOverlays ? Math.round(lineHeight) : lineHeight;
    }

    for (let i = 0; i < this.headers.length; i++) {
      this.headers[i].position.x = x;
      this.headers[i].position.y = firstLineY + lineHeight * i * 2;
    }

    this.sendPlanNumber.position.x = x;
    this.sendPlanNumber.position.y = firstLineY + lineHeight;

    this.raceNumber.position.x = x;
    this.raceNumber.position.y = firstLineY + lineHeight * 3;
    this.raceStart.position.x = x;
    this.raceStart.position.y = firstLineY + lineHeight * 5;

    if (this.useOverlays) {
      for (let i = 2; i >= 0; i--) {
        let styleX: Fill = {
          type: "gradient",
          verti: true,
          color: "#04172a",
          color2: "#031e33",
          stroke: [
            {
              verti: false,
              solid: true,
              color: "#029ad0",
              width: this.lineWidthHeader
            }
          ]
        };
        if (i === 1) {
          styleX = {
            type: "gradient",
            verti: true,
            color: "#1658E5",
            color2: "#082969"
          };
        } else if (i === 2) {
          styleX = {
            type: "gradient",
            verti: true,
            color: "#04172a",
            color2: "#031e33"
          };
        }

        this.headerX[i].x = this.offset;
        this.headerX[i].y = this.additionalYOffset + this.offset;
        this.headerX[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.rowWidth, this.rowHeightHeader, 0, 0, styleX);
        this.headerX[i].width = this.rowWidth;
        this.headerX[i].height = this.rowHeightHeader;
        this.headerX[i].alpha = i === 0 ? 0.85 : i === 1 ? 0.5 : 0.38;
        //this.headerX[i].scale.x = 0;
      }

      for (let i = this.rowCount * 3 - 1; i >= 0; i--) {
        const colorIndex = Math.floor(i / this.rowCount);

        let style: Fill = {
          type: "gradient",
          verti: true,
          color: "#031f36",
          color2: "#04192d"
        };
        if (colorIndex === 1) {
          style = {
            type: "gradient",
            verti: true,
            color: "#1658E5",
            color2: "#082969"
          };
        } else if (colorIndex === 0) {
          style = {
            type: "gradient",
            verti: true,
            color: "#031f36",
            color2: "#04192d",
            stroke: [
              {
                verti: false,
                color: "#029ad0",
                color2: "#04172a",
                opacity: 0.24,
                width: this.lineWidthTable
              },
              {
                verti: true,
                color: this.isDog8 ? "#7cabb2" : DogHelper.getColorByGame(this.gameType, "#029ad0"),
                color2: this.isDog8 ? "#5b7d82" : DogHelper.getColorByGame(this.gameType, "#04172a"),
                width: this.lineWidthTable,
                opacity: 0.3,
                table: {
                  row: i,
                  count: this.rowCount
                }
              }
            ]
          };
        }

        this.rowsX[i].x = this.offset;
        this.rowsX[i].y = this.additionalYOffset + this.offset + this.rowHeightHeader + (i % this.rowCount) * this.rowHeight;
        this.rowsX[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.rowWidth, this.rowHeight, 0, 0, style);
        this.rowsX[i].alpha = colorIndex === 0 ? 0.85 : colorIndex === 1 ? 0.5 : 0.38;
      }
    }
  }

  // the startTime and duration of the appearance -> can be more than one
  private anims: IAnimInterval[] = []; // = createEmptyDogAnims();

  // use update for fading, animations and so on...
  public update(dt: number) {
    super.update(dt);

    // get animation if there is one for current videotime...
    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const baseFactor = t - anim.startTime;

    this.visible = baseFactor >= 0 && baseFactor < anim.duration;

    const animStarts = [0.8, 0.85, 0.9, 0.95, 1.0, 1.05];
    const animDurationOffset = [1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3];

    AnimHelper.animateInOut(baseFactor, animStarts[0], anim.duration - animDurationOffset[0], 1, 0, 1, (alpha) => (this.headers[0].alpha = alpha), 0.2, 0);
    AnimHelper.animateInOut(baseFactor, animStarts[1], anim.duration - animDurationOffset[1], 1, 0, 1, (alpha) => (this.sendPlanNumber.alpha = alpha), 0.2, 0);
    AnimHelper.animateInOut(baseFactor, animStarts[2], anim.duration - animDurationOffset[2], 1, 0, 1, (alpha) => (this.headers[1].alpha = alpha), 0.2, 0);
    AnimHelper.animateInOut(baseFactor, animStarts[3], anim.duration - animDurationOffset[3], 1, 0, 1, (alpha) => (this.raceNumber.alpha = alpha), 0.2, 0);
    AnimHelper.animateInOut(baseFactor, animStarts[4], anim.duration - animDurationOffset[4], 1, 0, 1, (alpha) => (this.headers[2].alpha = alpha), 0.2, 0);
    AnimHelper.animateInOut(baseFactor, animStarts[5], anim.duration - animDurationOffset[5], 1, 0, 1, (alpha) => (this.raceStart.alpha = alpha), 0.2, 0);

    if (this.useOverlays) {
      const animStartsHeader = [0.6, 0.5, 0.4];
      const animDurationOffsetHeader = [0.75, 0.6, 0.45];
      for (let i = 2; i >= 0; i--) {
        AnimHelper.animateInOut(baseFactor, animStartsHeader[i], anim.duration - animDurationOffsetHeader[i], 0.5, 0, 1, (x) => (this.headerX[i].scale.x = x), 0.2, 0);
      }

      for (let i = this.rowCount * 3 - 1; i >= 0; i--) {
        const animStartsBody = [0.65, 0.5, 0.4];
        const animDurationOffsetBody = [0.85, 0.7, 0.55];
        const rowOffset = (i % this.rowCount) * 0.1;
        const layer = Math.floor(i / this.rowCount);
        /*const startTime = anim.startTime + anim.duration - 1.5 + 0.85 - 0.1 * (2 - layer) - 0.06 * (i % this.rowCount);
        const duration = 0.45;*/
        AnimHelper.animateInOut(baseFactor, animStartsBody[layer] + rowOffset, anim.duration - animDurationOffsetBody[layer] - rowOffset, 0.5, 0, 1, (x) => (this.rowsX[i].scale.x = x), 0.2, 0);
      }
    }
  }
}
