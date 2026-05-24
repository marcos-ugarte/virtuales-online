import { BonusHistorySettings, oddsAlwaysOnBonusHistoryTimings, racingHistorySettings } from "./../../../settings/OddsAlwaysOnSettings";
import { DogHelper } from "./DogHelper";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { AnimHelper } from "./../common/Anim";
import { IJackpotHistory, IAnimInterval, IGameInfo } from "client/Logic/LogicDefinitions";
import { GameType, GameLength } from "common/Definitions";
import { DrawHelper, Fill } from "client/VideoScreen/common/DrawHelper";

const rowCount = 4;

class RowItem {
  public raceText: PIXI.Text;
  public raceNumber: PIXI.Text;
  public idText: PIXI.Text;
  public dateText: PIXI.Text;
  public timeText: PIXI.Text;
  public nameText: PIXI.Text;
  public amountText: PIXI.Text;

  public constructor(raceText: PIXI.Text, raceNumber: PIXI.Text, idText: PIXI.Text, dateText: PIXI.Text, timeText: PIXI.Text, nameText: PIXI.Text, amountText: PIXI.Text) {
    this.raceText = raceText;
    this.raceNumber = raceNumber;
    this.idText = idText;
    this.dateText = dateText;
    this.timeText = timeText;
    this.nameText = nameText;
    this.amountText = amountText;
  }
}

export class BonusHistoryDog extends Group {
  private titleText: PIXI.Text;
  private rows: RowItem[] = [];
  private anims: IAnimInterval[] = [];
  private gameType: GameType;
  private oddsAlwaysOn;
  private isDog8;
  private useOverlays: boolean;

  private headerX: PIXI.Sprite[] = [];
  private headerY: PIXI.Sprite[] = [];
  private rowsX: PIXI.Sprite[] = [];
  private rowsXMask: PIXI.Graphics[] = [];

  private rowHeightHeader = 0;
  private rowHeight = 0;
  private rowWidth = 0;
  private columnWidthHeader = 0;
  private lineWidthHeader = 0;
  private lineWidthTable = 0;
  private rowCount = 0;
  private cell = [1, 1, 1.8];
  private dataWidth = 0;
  private cellSum = 0;
  private yOffset = 0;

  public constructor(gameInfo: IGameInfo, withBonus: boolean) {
    super();

    this.gameType = gameInfo.gameType;
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.isDog8 = gameInfo.gameType === "dog8";
    this.anims = this.createAnims(gameInfo.gameType, gameInfo.gameLength, withBonus);
    this.useOverlays = gameInfo.useOverlays;
    this.showDebug(settings.debug, undefined, "BonusHistoryDog");

    const isHorse = this.gameType === "horse" || this.gameType === "sulky";
    const key = isHorse ? "horse" : this.gameType;

    if (this.oddsAlwaysOn) {
      const { rowHeight, rowWidthSmall, rowHeightHeader, columnWidthHeader, lineWidthHeader, lineWidthTable } = BonusHistorySettings[key as keyof typeof BonusHistorySettings];

      this.rowHeightHeader = Math.round(_s(rowHeightHeader));
      this.rowHeight = Math.round(_s(rowHeight));
      this.rowWidth = Math.round(_s(rowWidthSmall));
      this.columnWidthHeader = Math.round(_s(columnWidthHeader));
      this.lineWidthHeader = Math.round(_s(lineWidthHeader));
      this.lineWidthTable = Math.round(_s(lineWidthTable));
      this.yOffset = _s(12);
      this.rowCount = 9;
    } else {
      const { rowWidthBig, lineWidthHeader, lineWidthTable } = BonusHistorySettings[key as keyof typeof BonusHistorySettings];
      this.rowHeightHeader = Math.round(_s(37));
      this.rowWidth = Math.round(_s(rowWidthBig));
      this.rowHeight = Math.round(_s(41.5));
      this.columnWidthHeader = Math.round(_s(66));
      this.lineWidthHeader = Math.round(_s(lineWidthHeader));
      this.lineWidthTable = Math.round(_s(lineWidthTable));
      this.rowCount = 5;
    }

    this.dataWidth = this.rowWidth - this.columnWidthHeader;
    this.cellSum = this.cell.reduce((accumulator, currentValue) => accumulator + currentValue, 0);

    if (this.useOverlays) {
      const mask = DrawHelper.createSkewedRoundedRectangleGraphics(0, this.yOffset, this.rowWidth, this.rowHeightHeader + this.rowHeight * (this.rowCount - 0.5), this.rowHeightHeader, 0);
      this.container.mask = mask;
      this.add(mask);

      for (let i = 2; i >= 0; i--) {
        this.headerY[i] = new PIXI.Sprite();
        this.headerX[i] = new PIXI.Sprite();
        this.add(this.headerY[i]);
        this.add(this.headerX[i]);
      }

      for (let i = this.rowCount * 3 - 1; i >= 0; i--) {
        this.rowsX[i] = new PIXI.Sprite();
        this.add(this.rowsX[i]);

        if (i < this.rowCount) {
          this.rowsXMask[i] = new PIXI.Graphics();
          this.add(this.rowsXMask[i] as PIXI.DisplayObject);
          this.rowsX[i].mask = this.rowsXMask[i];
        }
      }
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Regular",
        fontSize: _s(21),
        fill: "white",
        align: "center"
      });
      if (this.oddsAlwaysOn) {
        style.fontSize = _s(17);
      }
      this.titleText = Logic.createPixiText(style);
      this.titleText.anchor.set(0, 0.5);
      this.titleText.roundPixels = true;
      this.add(this.titleText);
    }

    const { idStyle, timeStyle, dateStyle, nameStyle, amountStyle, raceStyle, raceNumberStyle } = DogHelper.getBonusHistoryStyles(this.oddsAlwaysOn);

    for (let i = 0; i < rowCount; i++) {
      const raceText = Logic.createPixiText(raceStyle);
      raceText.anchor.set(0.5, 0.5);
      this.add(raceText);

      const raceNumber = Logic.createPixiText(raceNumberStyle);
      raceNumber.anchor.set(0.5, 0.5);
      this.add(raceNumber);

      const idText = Logic.createPixiText(idStyle);
      idText.anchor.set(0.0, 0.5);
      this.add(idText);

      const timeText = Logic.createPixiText(timeStyle);
      timeText.anchor.set(0.0, 0.5);
      this.add(timeText);

      const dateText = Logic.createPixiText(dateStyle);
      dateText.anchor.set(0.0, 0.5);
      this.add(dateText);

      const nameText = Logic.createPixiText(nameStyle);
      nameText.anchor.set(0.0, 0.5);
      this.add(nameText);

      const amountText = Logic.createPixiText(amountStyle);
      amountText.anchor.set(1.0, 0.5);
      this.add(amountText);

      const row = new RowItem(raceText, raceNumber, idText, dateText, timeText, nameText, amountText);
      this.rows.push(row);
    }
  }

  private createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean): IAnimInterval[] {
    if (!withBonus) return [];

    if (gameType === "horse") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnBonusHistoryTimings.horse[384];
      switch (gameLength) {
        case 320:
          return [{ startTime: 150.5, duration: 8.8 }];
      }
    }

    if (gameType === "sulky") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnBonusHistoryTimings.horse[384];
      return [{ startTime: 148.8, duration: 10.7 }];
    }

    if (gameType === "dog6") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnBonusHistoryTimings.dog[gameLength as 120 | 240 | 300];
      switch (gameLength) {
        case 120:
          return [{ startTime: 25.5, duration: 9.3 }];
        case 180:
          return [{ startTime: 80.7, duration: 9.2 }];
        case 240:
          return [{ startTime: 135.7, duration: 14.0 }];
        case 300:
          return [{ startTime: 135.7, duration: 19.2 }];
      }
      return [{ startTime: 139.0, duration: 10.2 }];
    }

    if (gameType === "dog63") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnBonusHistoryTimings.dog63[gameLength as 120 | 240 | 300];
      switch (gameLength) {
        case 300:
          return [{ startTime: 157.2, duration: 19.5 }];
      }
      return [{ startTime: 157.7, duration: 19.2 }];
    } else {
      // dog 8
      if (this.oddsAlwaysOn) return oddsAlwaysOnBonusHistoryTimings.dog[gameLength as 120 | 240 | 300];
      switch (gameLength) {
        case 120:
          return [{ startTime: 25.0, duration: 10.1 }];
        case 180:
          return [{ startTime: 80.3, duration: 9.3 }];
        case 240:
          return [{ startTime: 140.4, duration: 13.8 }];
        case 300:
          return [{ startTime: 140.4, duration: 19.2 }];
      }
      return [{ startTime: 146.5, duration: 10.2 }];
    }
  }

  public fill(history: IJackpotHistory[], withBonus: boolean) {
    if (!withBonus) this.anims = [];

    this.titleText.text = _t("bonusHistory");

    for (let i = 0; i < history.length; i++) {
      const item = history[i];

      const row = this.rows[i];
      row.raceText.text = _t("race").toUpperCase();
      Logic.autoSize(row.raceText, _s(65));
      row.raceNumber.text = Logic.implementation.formatRound(item.round);
      row.idText.text = item.id;
      Logic.autoSize(row.idText, _s(this.oddsAlwaysOn ? 90 : 125));
      row.dateText.text = item.date;
      row.timeText.text = item.time;
      row.nameText.text = item.name;
      Logic.autoSize(row.nameText, _s(this.oddsAlwaysOn ? 80 : 160));
      row.amountText.text = item.amount;
    }
  }

  public onLayout() {
    if (this.oddsAlwaysOn) return this.createSmallGrid();
    this.titleText.position.x = this.columnWidthHeader;
    this.titleText.position.y = this.yOffset + this.rowHeightHeader / 2;
    let rowIndex = 0;
    for (const row of this.rows) {
      row.raceText.position.x = _s(32);
      row.raceText.position.y = _s(47) + rowIndex * this.rowHeight;
      row.raceNumber.position.x = _s(32);
      row.raceNumber.position.y = _s(62) + rowIndex * this.rowHeight;
      row.idText.position.x = _s(91);
      row.idText.position.y = _s(58) + rowIndex * this.rowHeight;
      row.dateText.position.x = _s(248);
      row.dateText.position.y = row.idText.position.y;
      row.timeText.position.x = _s(383);
      row.timeText.position.y = row.idText.position.y;
      row.nameText.position.x = _s(500);
      row.nameText.position.y = row.idText.position.y;
      row.amountText.position.x = _s(774);
      row.amountText.position.y = row.idText.position.y;

      // matchMedia,es toString,es üpomts

      rowIndex++;
    }
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
        let styleY: Fill = {
          type: "gradient",
          color: "#04172a",
          color2: "#031e33",
          stroke: [
            {
              verti: true,
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
          styleY = {
            type: "gradient",
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
          styleY = {
            type: "gradient",
            color: "#04172a",
            color2: "#031e33"
          };
        }

        this.headerY[i].x = 0;
        this.headerY[i].y = this.yOffset + this.rowHeightHeader;
        this.headerY[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.columnWidthHeader, this.rowCount * this.rowHeight, 0, 0, styleY);
        this.headerY[i].width = this.columnWidthHeader;
        this.headerY[i].height = this.rowCount * this.rowHeight;
        this.headerY[i].alpha = i === 0 ? 0.85 : i === 1 ? 0.5 : 0.38;
        this.headerY[i].scale.y = 0;

        this.headerX[i].x = 0;
        this.headerX[i].y = this.yOffset;
        this.headerX[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.columnWidthHeader + this.rowWidth, this.rowHeightHeader, 0, 0, styleX);
        this.headerX[i].width = this.columnWidthHeader + this.rowWidth;
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
                position: [
                  {
                    visible: true,
                    singleRow: false,
                    position: 0.185
                  },
                  {
                    visible: true,
                    singleRow: false,
                    position: 0.19
                  },
                  {
                    visible: true,
                    singleRow: false,
                    position: 0.47
                  },
                  {
                    visible: true,
                    singleRow: false,
                    position: 0.72
                  }
                ],
                table: {
                  row: i,
                  count: this.rowCount
                }
              }
            ]
          };
        }

        this.rowsX[i].x = this.columnWidthHeader;
        this.rowsX[i].y = this.yOffset + this.rowHeightHeader + (i % this.rowCount) * this.rowHeight;
        this.rowsX[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.columnWidthHeader + this.rowWidth, this.rowHeight, 0, 0, style);
        this.rowsX[i].alpha = colorIndex === 0 ? 0.85 : colorIndex === 1 ? 0.5 : 0.38;

        if (i < this.rowCount) {
          this.rowsXMask[i].x = this.columnWidthHeader;
          this.rowsXMask[i].y = this.yOffset + this.rowHeightHeader + (i % this.rowCount) * this.rowHeight;
          this.rowsXMask[i].beginFill(0x555555);
          this.rowsXMask[i].drawRect(0, 0, this.columnWidthHeader + this.rowWidth, this.rowHeight);
          this.rowsXMask[i].endFill();
          this.rowsXMask[i].scale.x = 0;
        }
      }
    }
  }

  private createSmallGrid() {
    this.titleText.position.x = this.columnWidthHeader;
    this.titleText.position.y = this.yOffset + this.rowHeightHeader / 2;

    let rowIndex = 0;
    const firstCol = 0;
    const secCol = 59;
    for (const row of this.rows) {
      row.raceText.position.x = _s(33);
      row.raceText.position.y = _s(50) + rowIndex * this.rowHeight;
      row.raceNumber.position.x = _s((firstCol + secCol) / 2);
      row.raceNumber.position.y = _s(62) + rowIndex * this.rowHeight;
      row.idText.position.x = _s(75);
      row.idText.position.y = _s(57) + rowIndex * this.rowHeight;
      row.dateText.position.x = _s(198);
      row.dateText.position.y = row.idText.position.y;
      row.timeText.position.x = _s(205);
      row.timeText.position.y = _s(89) + rowIndex * this.rowHeight;
      row.nameText.anchor.set(0.5, 0.5);
      row.nameText.position.x = _s(118);
      row.nameText.position.y = _s(90) + rowIndex * this.rowHeight;
      row.amountText.anchor.set(0.5, 0.5);
      row.amountText.position.x = _s(325);
      row.amountText.position.y = row.idText.position.y;

      rowIndex += 2;
    }

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
        let styleY: Fill = {
          type: "gradient",
          color: "#04172a",
          color2: "#031e33",
          stroke: [
            {
              verti: true,
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
          styleY = {
            type: "gradient",
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
          styleY = {
            type: "gradient",
            color: "#04172a",
            color2: "#031e33"
          };
        }

        this.headerY[i].x = 0;
        this.headerY[i].y = this.yOffset + this.rowHeightHeader;
        this.headerY[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.columnWidthHeader, this.rowCount * this.rowHeight, 0, 0, styleY);
        this.headerY[i].width = this.columnWidthHeader;
        this.headerY[i].height = this.rowCount * this.rowHeight;
        this.headerY[i].alpha = i === 0 ? 0.85 : i === 1 ? 0.5 : 0.38;
        this.headerY[i].scale.y = 0;

        this.headerX[i].x = 0;
        this.headerX[i].y = this.yOffset;
        this.headerX[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.columnWidthHeader + this.rowWidth, this.rowHeightHeader, 0, 0, styleX);
        this.headerX[i].width = this.columnWidthHeader + this.rowWidth;
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
              }
            ]
          };
        }

        this.rowsX[i].x = this.columnWidthHeader;
        this.rowsX[i].y = this.yOffset + this.rowHeightHeader + (i % this.rowCount) * this.rowHeight;
        this.rowsX[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.columnWidthHeader + this.rowWidth, this.rowHeight, 0, 0, style);
        this.rowsX[i].alpha = colorIndex === 0 ? 0.85 : colorIndex === 1 ? 0.5 : 0.38;

        if (i < this.rowCount) {
          this.rowsXMask[i].x = this.columnWidthHeader;
          this.rowsXMask[i].y = this.yOffset + this.rowHeightHeader + (i % this.rowCount) * this.rowHeight;
          this.rowsXMask[i].beginFill(0x555555);
          this.rowsXMask[i].drawRect(0, 0, this.columnWidthHeader + this.rowWidth, this.rowHeight);
          this.rowsXMask[i].endFill();
          this.rowsXMask[i].scale.x = 0;
        }
      }
    }
  }

  public update(dt: number) {
    super.update(dt);

    const time = Logic.getVideoTime();
    const anim = Logic.getAnim(time, this.anims, this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;

    let baseFactor = time - anim.startTime;
    if (baseFactor >= anim.duration - 2.0) {
      baseFactor = anim.duration - baseFactor;
      this.setDebugFade(AnimHelper.clamp(baseFactor));
      this.titleText.alpha = (baseFactor - 0.4) * 2;

      const ff = (row: number, col: number) => {
        return (baseFactor - 0.38 - row * 0.18 - col * 0.085) * 3;
      };

      let rowIndex = 0;
      for (const row of this.rows) {
        row.raceNumber.alpha = ff(rowIndex, 0);
        row.raceText.alpha = ff(rowIndex, 0);
        row.idText.alpha = ff(rowIndex, 1);
        row.dateText.alpha = ff(rowIndex, 2);
        row.timeText.alpha = ff(rowIndex, 3);
        row.nameText.alpha = ff(rowIndex, 4);
        row.amountText.alpha = ff(rowIndex, 5);
        rowIndex++;
      }
      if (this.useOverlays) {
        for (let i = 2; i >= 0; i--) {
          const startTimeX = anim.startTime + anim.duration - 1.5 + 0.55 - 0.1 * (2 - i);
          const durationX = 0.35;
          AnimHelper.animateIn(time - startTimeX, 0, durationX, 1.4, 0, 1, (x) => {
            this.headerX[i].position.x = (this.columnWidthHeader + this.rowWidth) * x;
          });

          const startTimeY = anim.startTime + anim.duration - 1.5 + 0.75 - 0.15 * (2 - i);
          const durationY = 0.5;
          AnimHelper.animateIn(time - startTimeY, 0, durationY, 0.85, 1, 0, (y) => {
            this.headerY[i].scale.y = y;
          });
        }

        for (let i = this.rowCount * 3 - 1; i >= 0; i--) {
          const layer = Math.floor(i / this.rowCount);
          const startTime = anim.startTime + anim.duration - 1.5 + 0.85 - 0.1 * (2 - layer) - 0.06 * (i % this.rowCount);
          const duration = 0.45;
          AnimHelper.animateIn(time - startTime, 0, duration, 0.5, 1, 0, (x) => {
            if (i < this.rowCount) {
              this.rowsXMask[i].scale.x = x;
            } else {
              this.rowsX[i].scale.x = x;
            }
          });
        }
      }
    } else {
      this.setDebugFade(AnimHelper.clamp(baseFactor));
      this.titleText.alpha = baseFactor - 0.2;

      const ff = (row: number, col: number) => {
        return (baseFactor - 0.38 - row * 0.18 - col * 0.085) * 2;
      };

      let rowIndex = 0;
      for (const row of this.rows) {
        row.raceNumber.alpha = ff(rowIndex, 0);
        row.raceText.alpha = ff(rowIndex, 0);
        row.idText.alpha = ff(rowIndex, 1);
        row.dateText.alpha = ff(rowIndex, 2);
        row.timeText.alpha = ff(rowIndex, 3);
        row.nameText.alpha = ff(rowIndex, 4);
        row.amountText.alpha = ff(rowIndex, 5);
        rowIndex++;
      }
      if (this.useOverlays) {
        for (let i = 2; i >= 0; i--) {
          const startTimeX = anim.startTime + 0.1 * (2 - i);
          const durationX = 0.2;
          AnimHelper.animateIn(time - startTimeX, 0, durationX, 1.4, 1, 0, (x) => {
            this.headerX[i].position.x = (this.columnWidthHeader + this.rowWidth) * x;
          });

          const startTimeY = anim.startTime + 0.3 + 0.15 * (2 - i);
          const durationY = 0.8;
          AnimHelper.animateIn(time - startTimeY, 0, durationY, 0.6, 0, 1, (y) => {
            this.headerY[i].scale.y = y;
          });
        }

        for (let i = this.rowCount * 3 - 1; i >= 0; i--) {
          const layer = Math.floor(i / this.rowCount);
          const startTime = anim.startTime + 0.3 + 0.08 * (2 - layer) + 0.08 * (i % this.rowCount);
          const duration = 0.6;
          AnimHelper.animateIn(time - startTime, 0, duration, 1, 0, 1, (x) => {
            if (i < this.rowCount) {
              this.rowsXMask[i].scale.x = x;
            } else {
              this.rowsX[i].scale.x = x;
            }
          });
        }
      }
    }
  }
}
