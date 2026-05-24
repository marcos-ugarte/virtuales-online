import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, settings } from "client/Logic/Logic";
import { AnimHelper } from "../common/Anim";
import {
  mainElementPositionSizes,
  oddsAlwayOnBottomBarTimings,
  oddsAlwayOnOddScreenTimings,
  oddsAlwaysOnItHeaderTimings,
  oddsAlwaysOnStyles,
  oddScreenSettings
} from "./../../../settings/OddsAlwaysOnSettings";
import { IAnimInterval, IDriver } from "client/Logic/LogicDefinitions";
import { GameLength, GameType } from "common/Definitions";
import { DrawHelper, Fill } from "client/VideoScreen/common/DrawHelper";
import { DogHelper } from "client/VideoScreen/dog/DogHelper";
import { BottomBarItemDogAnim } from "client/VideoScreen/dog/BottomBarItemDog";
import { BottomBarTimings } from "settings/BottomBarSettings";

export type SubAnim = IAnimInterval & {
  fadeInFactor?: number | undefined;
  smoothness?: { in: number; out: number } | undefined;
  startSm?: boolean | undefined;
  fadeOutFactor?: number | undefined;
};

// Top Right Race number and timing
export class OddsUIDog extends Group {
  private gameType: GameType;
  private gameLength: GameLength;
  private language: string;
  private racerCount: number;
  private oddsAlwaysOn: boolean;
  private isDog8: boolean;

  // Dimensions
  private rowHeight = 0;
  private rowHeightHeader = 0;
  private rowHeightFooter = 0;
  private columnWidth = 0;
  private columnWidthHeader = 0;
  private margin = {
    r: 0,
    l: 0,
    t: 0,
    b: 0
  };
  private lineWidthHeader = 0;
  private lineWidthTable = 0;

  private driverIconX = 0;
  private driverIconY = 0;

  private fullHeight = 0;
  private fullWidth = 0;

  private startXY = 0;
  private rectA = 0;
  private rectB = 0;

  // Graphics for white rectangular areas, possibly for borders or backgrounds
  private secondRect = new PIXI.Sprite();
  private firstRect = new PIXI.Sprite();

  private posContainer = new PIXI.Container();
  private oddsContainer = new PIXI.Container();
  private fsContainer = new PIXI.Container();

  // Arrays to hold rows and cells, which might represent each row and cell in the grid
  private rowsX: PIXI.Sprite[] = [];
  private rowsXMask: PIXI.Graphics[] = [];
  private cells: PIXI.Sprite[] = [];
  private headerY: PIXI.Sprite[] = [];
  private headerX: PIXI.Sprite[] = [];

  private oddsHeaderVicente: PIXI.Sprite;
  private oddsHeaderAccopiata: PIXI.Sprite;
  private oddsHeaderVicenteAnims: IAnimInterval[] = [];
  private oddsHeaderAccopiataAnims: IAnimInterval[] = [];

  // Containers for driver labels or icons along X and Y axes
  private driverContainerX = new PIXI.Container();
  private driverLogoX: PIXI.Sprite[] = [];
  private driverTextX: PIXI.Text[] = [];
  private maskX = new PIXI.Graphics();
  private driverContainerY = new PIXI.Container();
  private driverLogoY: PIXI.Sprite[] = [];
  private driverTextY: PIXI.Text[] = [];
  private maskY = new PIXI.Graphics();

  public constructor(gameType: GameType, gameLength: GameLength, language: string, oddsAlwaysOn = false) {
    super();
    this.showDebug(settings.debug, undefined, "OddsUI");
    this.container.name = "OddsUI";
    this.gameType = gameType;
    this.gameLength = gameLength;
    this.isDog8 = gameType === "dog8";
    this.language = language;
    const racerCount = Logic.getRacerCount(gameType);
    this.racerCount = racerCount;
    this.oddsAlwaysOn = oddsAlwaysOn;
    this.showDebug(settings.debug, 0.7, this.container.name);

    const factor = this.oddsAlwaysOn ? 1 : 0.6575;

    //this.alpha = 0;

    this.add(this.fsContainer);
    this.add(this.oddsContainer);
    this.add(this.posContainer);

    const {
      rowHeight: i_rowHeight,
      columnWidth: i_columnWidth,
      columnWidthHeader: i_columnWidthHeader,
      rowHeightHeader: i_rowHeightHeader,
      margin: i_margin,
      fsRectA: i_fsRectA,
      fsRectB: i_fsRectB,
      lineWidthHeader: i_lineWidthHeader,
      lineWidthTable: i_lineWidthTable
    } = oddScreenSettings[this.gameType as keyof typeof oddScreenSettings];
    this.rowHeight = Math.round(_s(i_rowHeight) * factor);
    this.columnWidth = _s(i_columnWidth) * factor;
    this.rowHeightHeader = Math.round(_s(i_rowHeightHeader) * factor);
    this.columnWidthHeader = _s(i_columnWidthHeader) * factor;
    this.fullHeight = Math.round(_s(i_rowHeightHeader + i_margin.t + i_rowHeight * racerCount + i_margin.b) * factor);
    this.fullWidth = _s(i_columnWidthHeader + i_margin.l + i_columnWidth * racerCount + i_margin.r) * factor;
    this.rowHeightFooter = Math.round(_s(i_margin.b + i_rowHeight) * factor);
    this.rectA = _s(i_fsRectA) * factor;
    this.rectB = _s(i_fsRectB) * factor;
    this.lineWidthHeader = _s(i_lineWidthHeader) * factor;
    this.lineWidthTable = _s(i_lineWidthTable) * factor;
    this.margin = {
      r: _s(i_margin.r) * factor,
      l: _s(i_margin.l) * factor,
      t: _s(i_margin.t) * factor,
      b: _s(i_margin.b) * factor
    };
    this.startXY = this.oddsAlwaysOn ? _s(17) * factor : _s(64) * factor;

    this.driverIconX = 0.7 * this.columnWidth;
    this.driverIconY = 0.8 * this.rowHeight;

    if (this.oddsAlwaysOn) {
      this.posContainer.x += this.startXY;
      this.posContainer.y += this.startXY;
      this.oddsContainer.x += this.startXY;
      this.oddsContainer.y += this.startXY;
    } else {
      this.posContainer.x += this.startXY;
      this.oddsContainer.x += this.startXY;
      /*this.fsContainer.x -= this.startXY - _s(42);
      this.fsContainer.y -= this.startXY;*/
    }

    const style = new PIXI.TextStyle({
      fontFamily: "DIN-Bold",
      fontSize: _s(10),
      letterSpacing: _s(0),
      fill: DogHelper.getWhiteColor(),
      align: "center"
    });

    style.fontSize = _s(oddsAlwaysOnStyles[this.gameType as keyof typeof oddsAlwaysOnStyles].oddsScreen.oddsHeaderVincente.fontSize) * factor;
    style.letterSpacing = _s(oddsAlwaysOnStyles[this.gameType as keyof typeof oddsAlwaysOnStyles].oddsScreen.oddsHeaderVincente.letterSpacing) * factor;

    this.firstRect = new PIXI.Sprite();
    this.fsContainer.addChild(this.firstRect);
    this.secondRect = new PIXI.Sprite();
    this.fsContainer.addChild(this.secondRect);

    this.oddsHeaderVicente = new PIXI.Sprite();
    this.fsContainer.addChild(this.oddsHeaderVicente);
    this.oddsHeaderAccopiata = new PIXI.Sprite();
    this.fsContainer.addChild(this.oddsHeaderAccopiata);

    /*const secondRectMask = new PIXI.Graphics();
    this.secondRect.mask = secondRectMask;
    this.fsContainer.addChild(secondRectMask as PIXI.DisplayObject);*/

    // White FIRST place rectangle left

    /*const firstRectMask = new PIXI.Graphics();
    this.firstRect.mask = firstRectMask;
    this.fsContainer.addChild(firstRectMask as PIXI.DisplayObject);*/

    // Draw rows
    for (let j = 2; j > -1; j--) {
      for (let i = 1; i < this.racerCount + 1; i++) {
        const index = i + (this.racerCount + 1) * j;
        this.rowsX[index] = new PIXI.Sprite();
        this.oddsContainer.addChild(this.rowsX[index]);
        if (j === 0) {
          this.rowsXMask[index] = new PIXI.Graphics();
          this.oddsContainer.addChild(this.rowsXMask[index]);
        }
      }
    }

    // Draw cells
    for (let i = 0; i < this.racerCount * this.racerCount; i++) {
      this.cells[i] = new PIXI.Sprite();
      this.oddsContainer.addChild(this.cells[i]);
    }

    const bodyMask = DrawHelper.createCustomSkewedRoundedRectangleGraphics(
      this.columnWidthHeader,
      this.rowHeightHeader,
      this.fullWidth - this.columnWidthHeader,
      this.fullHeight - this.rowHeightHeader,
      0,
      {
        topLeft: 0,
        bottomLeft: 0,
        bottomRight: this.rowHeightHeader,
        topRight: 0
      }
    );
    this.posContainer.addChild(bodyMask as PIXI.DisplayObject);
    this.oddsContainer.mask = bodyMask;

    const headerXMask = DrawHelper.createCustomSkewedRoundedRectangleGraphics(0, 0, this.fullWidth, this.rowHeightHeader, 0, {
      topLeft: this.rowHeightHeader,
      bottomLeft: 0,
      bottomRight: 0,
      topRight: 0
    });
    this.posContainer.addChild(headerXMask as PIXI.DisplayObject);

    for (let j = 2; j >= 0; j--) {
      this.headerX[j] = new PIXI.Sprite();
      this.headerY[j] = new PIXI.Sprite();
      this.headerX[j].mask = headerXMask;
      this.posContainer.addChild(this.headerX[j]);
      this.posContainer.addChild(this.headerY[j]);

      /*const headerXMask = new PIXI.Graphics();
      const headerYMask = new PIXI.Graphics();
      this.headerX[j].mask = headerXMask;
      this.headerY[j].mask = headerYMask;
      this.posContainer.addChild(headerXMask as PIXI.DisplayObject);
      this.posContainer.addChild(headerYMask as PIXI.DisplayObject);*/
    }

    this.posContainer.addChild(this.driverContainerX);
    this.driverContainerX.x = this.columnWidthHeader;
    this.driverContainerX.y = 0;

    this.posContainer.addChild(this.driverContainerY);
    this.driverContainerY.x = 0;
    this.driverContainerY.y = this.rowHeightHeader;

    for (let j = 0; j < this.racerCount; j++) {
      const index = this.racerCount - j - 1;
      this.driverLogoX[index] = new PIXI.Sprite();
      this.driverContainerX.addChild(this.driverLogoX[index]);

      this.driverTextX[index] = new PIXI.Text(j + 1);
      this.driverTextX[index].style = style;
      this.driverContainerX.addChild(this.driverTextX[index]);

      this.driverLogoY[index] = new PIXI.Sprite();
      this.driverContainerY.addChild(this.driverLogoY[index]);

      this.driverTextY[index] = new PIXI.Text(j + 1);
      this.driverTextY[index].style = style;
      this.driverContainerY.addChild(this.driverTextY[index]);
    }

    /*const testBar = new PIXI.Sprite();
    this.add(testBar);
    testBar.x = 0;
    testBar.y = 0;
    testBar.texture = DrawHelper.createSkewedRoundedRectangleTexture(500, 600, 50, 80, [
      {
        type: "mixed",
        verti: true,
        color: "#00ff00",
        color2: "#008800",
        line: 40,
        lineColor: "#ffffff",
        start: -0.34,
        end: 0.5,
        opacity: 0.44
      },
      {
        type: "gradient",
        verti: false,
        color: "#ff0000",
        color2: "#880000",
        opacity: 0.44
      },
      {
        type: "mixed",
        color: "#0000ff",
        color2: "#000088",
        line: 10,
        lineColor: "#ff0000",
        start: 0,
        end: 1,
        opacity: 0.39
      }
    ]);*/
  }

  public fill(drivers: IDriver[], withBonus: boolean) {
    this.anims = this.createAnims(this.gameType, this.gameLength, withBonus, this.language);
    this.highlightCellAnim = this.createCellAnims(this.gameType, this.gameLength, withBonus, this.language);

    for (let j = 0; j < this.racerCount; j++) {
      const index = this.racerCount - j - 1;

      const yValueX = (this.rowHeightHeader - _s(10)) / 2;
      const xValueY = (this.columnWidthHeader - _s(10)) / 2;

      this.driverTextX[index].x = this.columnWidth * j + this.columnWidth / 2;
      this.driverTextX[index].y = yValueX;
      this.driverTextX[index].anchor.set(0.5, 0.5);

      this.driverLogoX[index].x = this.columnWidth * index + this.columnWidth / 2;
      this.driverLogoX[index].y = this.rowHeightHeader - _s(6) - this.lineWidthTable;
      this.driverLogoX[index].texture = DrawHelper.drawPatternTexture(this.driverIconX, _s(10), 0, drivers[index].color, drivers[index].color2, drivers[index].driverPattern, true);
      this.driverLogoX[index].anchor.set(0.5, 0.5);

      this.driverTextY[index].x = xValueY;
      this.driverTextY[index].y = this.rowHeight * j + this.rowHeight / 2;
      this.driverTextY[index].anchor.set(0.5, 0.5);

      this.driverLogoY[index].x = this.columnWidthHeader - _s(6) - this.lineWidthTable;
      this.driverLogoY[index].y = index * this.rowHeight + this.rowHeight / 2;
      this.driverLogoY[index].texture = DrawHelper.drawPatternTexture(_s(10), this.driverIconY, 0, drivers[index].color, drivers[index].color2, drivers[index].driverPattern, false);
      this.driverLogoY[index].anchor.set(0.5, 0.5);
      console.log(drivers);
    }

    const headerAnims = this.createOddsHeaderAnims(this.gameType, Logic.implementation.getCurrentIntroGameLength(), this.language, withBonus);
    if (headerAnims.length > 1) {
      this.oddsHeaderVicenteAnims = headerAnims[0];
      this.oddsHeaderAccopiataAnims = headerAnims[1];
    }
  }

  public onLayout() {
    const isDog8 = this.gameType === "dog8";
    for (let j = 2; j >= 0; j--) {
      let styleX: Fill = isDog8
        ? {
            type: "mixed",
            verti: false,
            color: "#060f0d",
            color2: "#0d241a",
            start: -0.5,
            end: 0.85,
            stroke: [
              {
                verti: false,
                solid: true,
                it: this.language === "it",
                it_width: this.columnWidthHeader,
                color: "#7cabb2",
                width: this.lineWidthHeader
              }
            ]
          }
        : {
            type: "gradient",
            verti: true,
            color: DogHelper.getColorByGame(this.gameType, "#04172a"),
            color2: DogHelper.getColorByGame(this.gameType, "#031e33"),
            opacity: 0.85,
            stroke: [
              {
                verti: false,
                solid: true,
                it: this.language === "it",
                it_width: this.columnWidthHeader,
                color: DogHelper.getColorByGame(this.gameType, "#029ad0"),
                width: this.lineWidthHeader
              }
            ]
          };
      let styleY: Fill = isDog8
        ? {
            type: "mixed",
            color: "#0d1a11",
            color2: "#060f0d",
            start: 0.15,
            end: 2,
            stroke: [
              {
                verti: true,
                solid: true,
                color: "#7cabb2",
                width: this.lineWidthHeader
              }
            ]
          }
        : {
            type: "gradient",
            color: DogHelper.getColorByGame(this.gameType, "#04172a"),
            color2: DogHelper.getColorByGame(this.gameType, "#031e33"),
            opacity: 0.85,
            stroke: [
              {
                verti: true,
                solid: true,
                color: DogHelper.getColorByGame(this.gameType, "#029ad0"),
                width: this.lineWidthHeader
              }
            ]
          };
      if (j === 1) {
        styleX = {
          type: "gradient",
          verti: true,
          color: this.isDog8 ? "#329e69" : DogHelper.getColorByGame(this.gameType, "#1658E5"),
          color2: this.isDog8 ? "#004735" : DogHelper.getColorByGame(this.gameType, "#082969")
        };
        styleY = {
          type: "gradient",
          color: this.isDog8 ? "#329e69" : DogHelper.getColorByGame(this.gameType, "#1658E5"),
          color2: this.isDog8 ? "#004735" : DogHelper.getColorByGame(this.gameType, "#082969")
        };
      } else if (j === 2) {
        styleX = {
          type: "gradient",
          verti: true,
          color: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameType, "#04172a"),
          color2: this.isDog8 ? "#0d1a11" : DogHelper.getColorByGame(this.gameType, "#031e33")
        };
        styleY = {
          type: "gradient",
          color: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameType, "#04172a"),
          color2: this.isDog8 ? "#0d1a11" : DogHelper.getColorByGame(this.gameType, "#031e33")
        };
      }

      this.headerX[j].x = -this.rowHeightHeader;
      this.headerX[j].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.fullWidth + 2 * this.rowHeightHeader, this.rowHeightHeader + 1, 0, this.rowHeightHeader, styleX);
      this.headerX[j].height = this.rowHeightHeader;
      this.headerX[j].width = this.fullWidth + 2 * this.rowHeightHeader;

      this.headerY[j].y = this.rowHeightHeader;
      this.headerY[j].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.columnWidthHeader, this.fullHeight - this.rowHeightHeader + 1, 0, 0, styleY);
      this.headerY[j].width = this.columnWidthHeader;
      this.headerY[j].height = this.fullHeight - this.rowHeightHeader;

      if (j === 0) {
        this.maskX = DrawHelper.createSkewedRoundedRectangleGraphics(0, 0, this.fullWidth + 2 * this.rowHeightHeader, this.rowHeightHeader, 0, this.rowHeightHeader);
        this.maskX.x = -this.rowHeightHeader;
        this.posContainer.addChild(this.maskX as PIXI.DisplayObject);
        this.driverContainerX.mask = this.maskX;

        this.maskY = DrawHelper.createSkewedRoundedRectangleGraphics(0, 0, this.columnWidthHeader, this.fullHeight - this.rowHeightHeader, 0, 0);
        this.maskY.y = this.rowHeightHeader;
        this.posContainer.addChild(this.maskY as PIXI.DisplayObject);
        this.driverContainerY.mask = this.maskY;
      }
    }

    for (let j = 2; j > -1; j--) {
      let style: Fill | Fill[] = {
        type: "gradient",
        verti: true,
        color: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameType, "#04172a"),
        color2: this.isDog8 ? "#1e4a3a" : DogHelper.getColorByGame(this.gameType, "#022841"),
        opacity: 0.38,
        margin: {
          r: this.margin.r,
          l: this.margin.l,
          t: 0,
          b: 0
        }
      };
      if (j === 1) {
        style = {
          type: "gradient",
          verti: true,
          color: this.isDog8 ? "#329e69" : DogHelper.getColorByGame(this.gameType, "#1658E5"),
          color2: this.isDog8 ? "#004735" : DogHelper.getColorByGame(this.gameType, "#082969"),
          opacity: 0.5,
          margin: {
            r: this.margin.r,
            l: this.margin.l,
            t: 0,
            b: 0
          }
        };
      }
      for (let i = 1; i < this.racerCount + 1; i++) {
        if (j === 0) {
          style = isDog8
            ? [
                {
                  type: "mixed",
                  color: "#060f0d",
                  color2: "#1f3b29",
                  start: -0.5,
                  end: 0.75,
                  opacity: 0.85
                },
                {
                  type: "mixed",
                  verti: true,
                  color: "#182e1f",
                  color2: "#060f0d",
                  start: 0.25,
                  end: 1.35,
                  opacity: 0.85,
                  stroke: [
                    {
                      verti: false,
                      start: 0.75,
                      end: 1.35,
                      color: "#7cabb2",
                      color2: "#5b7d82",
                      opacity: 0.531,
                      width: this.lineWidthTable
                    },
                    {
                      verti: true,
                      color: "#7cabb2",
                      color2: "#5b7d82",
                      start: 0,
                      end: 1,
                      width: this.lineWidthTable,
                      count: this.racerCount,
                      opacity: 0.59,
                      table: {
                        row: i,
                        count: this.racerCount
                      }
                    }
                  ],
                  margin: {
                    r: this.margin.r,
                    l: this.margin.l,
                    t: i === 0 ? this.margin.t : 0,
                    b: i === this.racerCount ? this.margin.b : 0
                  }
                }
              ]
            : {
                type: "mixed",
                verti: true,
                color: DogHelper.getColorByGame(this.gameType, "#022841"),
                color2: DogHelper.getColorByGame(this.gameType, "#04172a"),
                start: -0.34,
                end: 0.5,
                opacity: 0.85,
                stroke: [
                  {
                    verti: false,
                    color: DogHelper.getColorByGame(this.gameType, "#029ad0"),
                    color2: DogHelper.getColorByGame(this.gameType, "#04172a"),
                    opacity: 0.41,
                    width: this.lineWidthTable
                  },
                  {
                    verti: true,
                    color: DogHelper.getColorByGame(this.gameType, "#029ad0"),
                    color2: DogHelper.getColorByGame(this.gameType, "#04172a"),
                    width: this.lineWidthTable,
                    count: this.racerCount,
                    opacity: 0.2,
                    table: {
                      row: i,
                      count: this.racerCount
                    }
                  }
                ],
                margin: {
                  r: this.margin.r,
                  l: this.margin.l,
                  t: i === 0 ? this.margin.t : 0,
                  b: i === this.racerCount ? this.margin.b : 0
                }
              };
        }
        const index = i + (this.racerCount + 1) * j;
        this.rowsX[index].x = this.columnWidthHeader;
        this.rowsX[index].y = (i - 1) * this.rowHeight + this.rowHeightHeader;
        if (i === this.racerCount) {
          this.rowsX[index].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.fullWidth - this.columnWidthHeader, this.rowHeightFooter, 0, 0, style);
          this.rowsX[index].height = this.rowHeightFooter;
        } else {
          this.rowsX[index].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.fullWidth - this.columnWidthHeader, this.rowHeight, 0, 0, style);
          this.rowsX[index].height = this.rowHeight;
        }
        this.rowsX[index].width = this.fullWidth - this.columnWidthHeader;
        if (j === 0) {
          this.rowsXMask[index].x = this.columnWidthHeader;
          this.rowsXMask[index].y = (i - 1) * this.rowHeight + this.rowHeightHeader;
          this.rowsXMask[index].beginFill(0x555555);
          this.rowsXMask[index].drawRect(0, 0, this.fullWidth - this.columnWidthHeader, i === this.racerCount ? this.rowHeightFooter + 1 : this.rowHeight + 1);
          this.rowsXMask[index].endFill();
          this.rowsX[index].mask = this.rowsXMask[index];
        }
      }
    }

    for (let i = 0; i < this.racerCount * this.racerCount; i++) {
      const row = Math.floor(i / this.racerCount);
      const column = i % this.racerCount;
      this.cells[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.columnWidth, this.rowHeight, 0, 0, {
        type: "solid",
        color: this.isDog8 ? "#329e69" : DogHelper.getColorByGame(this.gameType, "#1658E5"),
        opacity: 0.5
      });
      this.cells[i].height = this.rowHeight;
      this.cells[i].x = this.columnWidthHeader + column * this.columnWidth + this.margin.l;
      this.cells[i].y = row * this.rowHeight + this.rowHeightHeader + this.margin.t;
      this.cells[i].alpha = 0;
    }

    this.firstRect.x = this.startXY - this.rectB;
    this.firstRect.y = this.oddsAlwaysOn ? this.startXY + this.fullHeight - this.rectA : this.fullHeight - this.rectA;
    this.firstRect.texture = DrawHelper.createCustomSkewedRoundedRectangleTexture(
      this.rectB,
      this.rectA,
      0,
      {
        topLeft: this.rectB / 2,
        bottomLeft: this.rectB / 2,
        bottomRight: 0,
        topRight: 0
      },
      {
        type: "solid",
        color: "#e6e6e6"
      }
    );

    this.secondRect.x = this.startXY + this.fullWidth - this.rectA;
    this.secondRect.y = this.oddsAlwaysOn ? this.startXY - this.rectB : -this.rectB;
    this.secondRect.pivot.set(1, 0);
    this.secondRect.texture = DrawHelper.createCustomSkewedRoundedRectangleTexture(
      this.rectA,
      this.rectB,
      0,
      {
        topLeft: this.rectB / 2,
        bottomLeft: 0,
        bottomRight: 0,
        topRight: this.rectB / 2
      },
      {
        type: "solid",
        color: "#e6e6e6"
      }
    );
    const itHeaderHeight = this.oddsAlwaysOn ? _s(50) : _s(15);

    this.oddsHeaderVicente.x = this.startXY + this.rowHeightHeader - _s(10);
    this.oddsHeaderVicente.y = this.oddsAlwaysOn ? this.startXY - _s(50) : -itHeaderHeight;
    this.oddsHeaderVicente.pivot.set(1, 0);
    this.oddsHeaderVicente.texture = DrawHelper.createCustomSkewedRoundedRectangleTexture(
      this.oddsAlwaysOn ? _s(180) : _s(175),
      itHeaderHeight,
      0,
      {
        topLeft: itHeaderHeight / 2,
        bottomLeft: 0,
        bottomRight: 0,
        topRight: itHeaderHeight / 2
      },
      {
        type: "solid",
        color: "#e6e6e6"
      }
    );

    this.oddsHeaderAccopiata.x = this.startXY + this.rowHeightHeader - _s(10);
    this.oddsHeaderAccopiata.y = this.oddsAlwaysOn ? this.startXY - _s(50) : -itHeaderHeight;
    this.oddsHeaderAccopiata.pivot.set(1, 0);
    this.oddsHeaderAccopiata.texture = DrawHelper.createCustomSkewedRoundedRectangleTexture(
      this.oddsAlwaysOn ? _s(375) : _s(175),
      itHeaderHeight,
      0,
      {
        topLeft: itHeaderHeight / 2,
        bottomLeft: 0,
        bottomRight: 0,
        topRight: itHeaderHeight / 2
      },
      {
        type: "solid",
        color: "#e6e6e6"
      }
    );
  }

  // the startTime and duration of the appearance -> can be more than one
  private anims: (IAnimInterval & {
    fadeInFactor?: number;
    fadeOutFactor?: number;
    initAnimation?: boolean;
    startSm?: boolean;
    getDurationOffset?: Function;
    subAnimations?: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number; smoothness?: { in: number; out: number } })[];
  })[] = []; // = createEmptyDogAnims();

  private highlightCellAnim: BottomBarItemDogAnim[] = [];

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    const updateAnims = Logic.wasActionTriggered();

    const anim = Logic.getAnim(t, this.anims, this, { offsetTime: 1 });

    const cellAnim = Logic.getAnim(t, this.highlightCellAnim, this.oddsHeaderVicente);

    const endOffset = this.getAnimOutTime(t, this.anims);
    const startOffset = (anim?.startTime ?? 0) - 1.1;

    if (!Logic.isInIntro() || !anim) {
      this.visible = false;
      return;
    }
    this.visible = true;

    if (anim.startTime < 1.2) {
      anim.startTime = anim.startTime + 0.7;
      anim.duration = anim.duration - 0.7;
    }

    /*if (startUpdate !== 0 && startUpdate > this.lastUpd && startUpdate - this.lastUpd < 40) {
      // 40 -> 25fps
      return;
    } else {
      this.lastUpd = startUpdate;
    }*/
    const oddsHeaderVicenteAnim = Logic.getAnim(t, this.oddsHeaderVicenteAnims, this.oddsHeaderVicente);
    const oddsHeaderAccopiataAnim = Logic.getAnim(t, this.oddsHeaderAccopiataAnims, this.oddsHeaderAccopiata);

    if (oddsHeaderVicenteAnim && t >= oddsHeaderVicenteAnim.startTime && t <= oddsHeaderVicenteAnim.startTime + oddsHeaderVicenteAnim.duration + 0.2) {
      AnimHelper.animateInOut(t, oddsHeaderVicenteAnim.startTime, oddsHeaderVicenteAnim.startTime + oddsHeaderVicenteAnim.duration, 1, 0, 1, (alpha) => (this.oddsHeaderVicente.alpha = alpha), 0.2, 0);
      for (let i = 0; i < this.racerCount; i++) {
        AnimHelper.animateInOut(
          t,
          oddsHeaderVicenteAnim.startTime,
          oddsHeaderVicenteAnim.startTime + oddsHeaderVicenteAnim.duration,
          1,
          0,
          1,
          (alpha) => (this.cells[i * (this.racerCount + 1)].alpha = alpha),
          0.2,
          0
        );
      }
      /*for (let i = 0; i < this.racerCount * this.racerCount; i++) {
        if (i % 7 === 0) {
          AnimHelper.animateInOut(t, oddsHeaderVicenteAnim.startTime, oddsHeaderVicenteAnim.startTime + oddsHeaderVicenteAnim.duration, 1, 0, 1, (alpha) => (this.cells[i].alpha = alpha), 0.2, 0);
        } else {
          this.cells[i].alpha = 0;
        }
      }*/
    } else if (updateAnims && !(cellAnim && t >= cellAnim.startTime && t <= cellAnim.startTime + cellAnim.duration + 0.8)) {
      this.oddsHeaderVicente.alpha = 0;
      for (let i = 0; i < this.racerCount; i++) {
        this.cells[i * (this.racerCount + 1)].alpha = 0;
      }
    } else {
      this.oddsHeaderVicente.alpha = 0;
    }
    if (oddsHeaderAccopiataAnim && t >= oddsHeaderAccopiataAnim.startTime && t <= oddsHeaderAccopiataAnim.startTime + oddsHeaderAccopiataAnim.duration + 0.2) {
      AnimHelper.animateInOut(
        t,
        oddsHeaderAccopiataAnim.startTime,
        oddsHeaderAccopiataAnim.startTime + oddsHeaderAccopiataAnim.duration,
        0.2,
        0,
        1,
        (alpha) => (this.oddsHeaderAccopiata.alpha = alpha),
        0.2,
        0
      );
      for (let i = 0; i < this.racerCount * this.racerCount; i++) {
        if (i % 7 !== 0) {
          AnimHelper.animateInOut(
            t,
            oddsHeaderAccopiataAnim.startTime,
            oddsHeaderAccopiataAnim.startTime + oddsHeaderAccopiataAnim.duration,
            0.2,
            0,
            1,
            (alpha) => (this.cells[i].alpha = alpha),
            0.2,
            0
          );
        } else {
          this.cells[i].alpha = 0;
        }
      }
    } else if (updateAnims) {
      this.oddsHeaderAccopiata.alpha = 0;
      for (let i = 0; i < this.racerCount * this.racerCount; i++) {
        if (i % 7 !== 0) {
          this.cells[i].alpha = 0;
        }
      }
    }

    if (cellAnim && t >= cellAnim.startTime && t <= cellAnim.startTime + cellAnim.duration + 0.8) {
      for (let i = 0; i < this.racerCount; i++) {
        const overlayOffset = 0.4;
        const startTimeInfo = cellAnim.startTime - overlayOffset + (cellAnim.infoStartTime ?? 0) + (cellAnim.infoTime ?? 0) * i;
        const endTimeInfo = startTimeInfo + (cellAnim.fadeOutStart ?? 0);
        AnimHelper.animateInOut(t, startTimeInfo, endTimeInfo, 0.2, 0, 1, (alpha) => (this.cells[i * (this.racerCount + 1)].alpha = alpha), 0.2, 0);
      }
    } else if (updateAnims && !(oddsHeaderVicenteAnim && t >= oddsHeaderVicenteAnim.startTime && t <= oddsHeaderVicenteAnim.startTime + oddsHeaderVicenteAnim.duration + 0.2)) {
      for (let i = 0; i < this.racerCount; i++) {
        this.cells[i * (this.racerCount + 1)].alpha = 0;
      }
    }

    if (anim.startSm) {
      const { oddsScreenPosXTo, oddsScreenPosYTo, oddsScreenScaleTo } = oddScreenSettings[this.gameType as keyof typeof oddScreenSettings];
      this.container.scale.x = oddsScreenScaleTo;
      this.container.scale.y = oddsScreenScaleTo;

      this.container.position.x = _s(oddsScreenPosXTo);
      this.container.position.y = _s(oddsScreenPosYTo);
    }

    if (anim) {
      this.anims.map((a) => {
        const sub: SubAnim | null = this.getSubAnim(t, a.subAnimations);
        if (sub && this.oddsAlwaysOn) {
          this.updateOddsAlwaysOn(t, sub);
        } else if (!sub && this.oddsAlwaysOn) {
          this.container.scale.x = 1;
          this.container.scale.y = 1;
          const xFrom = _s(mainElementPositionSizes[this.gameType as keyof typeof mainElementPositionSizes].oddsScreen.x);
          const yFrom = _s(mainElementPositionSizes[this.gameType as keyof typeof mainElementPositionSizes].oddsScreen.y);
          this.container.position.x = xFrom;
          this.container.position.y = yFrom;
        }
      });

      if ((t >= startOffset && t <= startOffset + 5) || updateAnims) {
        for (let i = 0; i < this.headerY.length; i++) {
          const startTime = startOffset + 0.6 + (2 - i) * 0.225;
          const baseFactor = t - startTime;
          const duration = 0.35 + 0.15 * (2 - i);

          AnimHelper.animateIn(baseFactor, 0, duration, 0.8, 0, 1, (f1) => {
            this.headerY[i].scale.y = f1;
            if (i === 0) this.maskY.scale.y = f1;
          });
        }

        for (let i = 0; i < this.headerX.length; i++) {
          const startTime = startOffset + 0.65 + (2 - i) * 0.125;
          const baseFactor = t - startTime;
          const duration = 0.5;

          AnimHelper.animateIn(baseFactor, 0, duration, 0.85, 1, 0, (f1) => {
            this.headerX[i].position.x = -this.rowHeightHeader + (-this.rowHeightHeader - this.fullWidth) * f1;
            if (i === 0) this.maskX.position.x = -this.rowHeightHeader + (-this.rowHeightHeader - this.fullWidth) * f1;
          });
        }

        for (let j = 0; j < 3; j++) {
          for (let i = 1; i < this.racerCount + 1; i++) {
            const index = i + (this.racerCount + 1) * j;

            //const elemWidth = i % (this.racerCount + 1) === 0 ? this.fullWidth : this.fullWidth + this.columnWidthHeader;
            const startTime = startOffset + 1 + (i - 1) / 10 + (2 - j) * 0.125;
            const baseFactor = t - startTime;
            const duration = 0.5;

            AnimHelper.animateIn(baseFactor, 0, duration, 0.85, 0, 1, (f1) => {
              //mask.drawRect(0, 0, elemWidth * f1, this.rowHeightFooter + this.rowHeightHeader + this.racerCount * this.rowHeight);
              if (j === 0) {
                this.rowsXMask[index].position.x = this.columnWidthHeader - (this.fullWidth - this.columnWidthHeader + 2) * (1 - f1);
              } else {
                this.rowsX[index].scale.x = f1;
              }
            });
          }
        }

        for (let i = 0; i < this.racerCount; i++) {
          const index = this.racerCount - i - 1;
          const startTime = startOffset + 1;
          const baseFactor = t - startTime;
          const duration = 0.35 + (0.2 / this.racerCount) * i;

          //this.driverContainerX.mask = this.rowsX[0].mask;

          AnimHelper.animateIn(baseFactor, 0, duration, 0.6, 0.5, 1, (x) => {
            this.driverLogoX[index].x = (this.columnWidth * index + this.columnWidth / 2) * x;
            this.driverTextX[index].x = (this.columnWidth * i + this.columnWidth / 2) * x;
          });
        }

        for (let i = 0; i < this.racerCount; i++) {
          const index = this.racerCount - i - 1;
          const startTime = startOffset + 1.05 + (0.4 / this.racerCount) * i;
          const baseFactor = t - startTime;
          const duration = 0.15;

          //this.driverContainerY.mask = this.headerY[0].mask;

          AnimHelper.animateIn(baseFactor, 0, duration, 0.3, 0, 1, (x) => {
            this.driverLogoY[i].x = (this.columnWidthHeader - _s(6) - this.lineWidthTable) * x;
            this.driverTextY[index].x = ((this.columnWidthHeader - _s(10)) / 2) * x;
          });
        }
      }
    }

    if (t >= 2 && ((endOffset !== 0 && t >= endOffset && t <= endOffset + 4) || updateAnims)) {
      for (let i = 0; i < this.headerY.length; i++) {
        let startTime;
        let baseFactor;
        let duration;
        if (this.oddsAlwaysOn) {
          startTime = endOffset + 0.54 + i * 0.26;
          baseFactor = t - startTime;
          duration = 0.38 - 0.03 * i;
        } else {
          startTime = endOffset + 0.3 + i * 0.26;
          baseFactor = t - startTime;
          duration = 1.5;
        }

        AnimHelper.animateIn(baseFactor, 0, duration, 0.8, 1, 0, (f1) => {
          this.headerY[i].scale.y = f1;
          if (i === 0) this.maskY.scale.y = f1;
        });

        startTime = endOffset + 1 + i * 0.06;
        baseFactor = t - startTime;
        duration = 0.43;

        AnimHelper.animateIn(baseFactor, 0, duration, 0.85, 0, 1, (f1) => {
          this.headerX[i].position.x = -this.rowHeightHeader + (-this.rowHeightHeader - this.fullWidth) * f1;
          if (i === 0) this.maskX.position.x = -this.rowHeightHeader + (-this.rowHeightHeader - this.fullWidth) * f1;
        });
      }

      for (let j = 0; j < 3; j++) {
        for (let i = 1; i < this.racerCount + 1; i++) {
          const index = i + (this.racerCount + 1) * j;

          const startTime = endOffset + 0.45 + (this.racerCount - i) / 10 + j * 0.06;
          const baseFactor = t - startTime;
          const duration = 0.43;

          AnimHelper.animateIn(baseFactor, 0, duration, 0.85, 1, 0, (f1) => {
            if (j === 0) {
              this.rowsXMask[index].position.x = this.columnWidthHeader - (this.fullWidth - this.columnWidthHeader + 2) * (1 - f1);
            } else {
              this.rowsX[index].scale.x = f1;
            }
          });
        }
      }

      for (let i = 0; i < this.racerCount; i++) {
        const index = this.racerCount - i - 1;
        const startTime = endOffset + 1;
        const baseFactor = t - startTime;
        const duration = 0.35 + (0.2 / this.racerCount) * i;

        //this.driverContainerX.mask = this.rowsX[0].mask;

        AnimHelper.animateIn(baseFactor, 0, duration, 0.6, 1, 0.5, (x) => {
          this.driverLogoX[index].x = (this.columnWidth * index + this.columnWidth / 2) * x;
          this.driverTextX[index].x = (this.columnWidth * i + this.columnWidth / 2) * x;
        });
      }

      for (let i = 0; i < this.racerCount; i++) {
        const index = this.racerCount - i - 1;
        const startTime = endOffset + 0.55 + (0.4 / this.racerCount) * i;
        const baseFactor = t - startTime;
        const duration = 0.15;

        //this.driverContainerY.mask = this.headerY[0].mask;

        AnimHelper.animateIn(baseFactor, 0, duration, 0.3, 1, 0, (x) => {
          this.driverLogoY[i].x = (this.columnWidthHeader - _s(6) - this.lineWidthTable) * x;
          this.driverTextY[index].x = ((this.columnWidthHeader - _s(10)) / 2) * x;
        });
      }
    }

    if (this.firstRect && this.secondRect) {
      let startTime;
      let baseFactor;
      let duration;

      if (startOffset === 0 && endOffset === 0) {
        this.firstRect.scale.y = 0;
        this.secondRect.scale.x = 0;
      } else if (t >= startOffset && t < endOffset) {
        startTime = startOffset + 1.2;
        baseFactor = t - startTime;
        duration = 0.3;

        AnimHelper.animateIn(baseFactor, 0, duration, duration, 0, 1, (f1) => {
          this.firstRect.scale.y = f1;
        });

        startTime = startOffset + 1.3;
        baseFactor = t - startTime;
        duration = 0.4;

        AnimHelper.animateIn(baseFactor, 0, duration, duration, 0, 1, (f1) => {
          this.secondRect.scale.x = f1;
        });
      } else if (t >= 2 && t >= endOffset) {
        if (this.oddsAlwaysOn) {
          startTime = endOffset + 0.8;
          baseFactor = t - startTime;
          duration = 0.18;
        } else {
          startTime = endOffset;
          baseFactor = t - startTime;
          duration = 0.3;
        }

        AnimHelper.animateIn(baseFactor, 0, duration, 0.8, 1, 0, (f1) => {
          this.firstRect.scale.y = f1;
        });

        if (this.oddsAlwaysOn) {
          startTime = endOffset + 0.9;
          baseFactor = t - startTime;
          duration = 0.16;
        } else {
          startTime = endOffset + 0.9;
          baseFactor = t - startTime;
          duration = 0.4;
        }

        AnimHelper.animateIn(baseFactor, 0, duration, 0.8, 1, 0, (f1) => {
          this.secondRect.scale.x = f1;
        });
      } else {
        this.firstRect.scale.y = 0;
        this.secondRect.scale.x = 0;
      }
    }
  }

  public updateOddsAlwaysOn(t: number, sub: SubAnim) {
    const start = sub.startTime;
    const duration = sub.startTime + sub.duration;

    const fadeInFrom = 1;
    const fadeInTo = oddScreenSettings[this.gameType as keyof typeof oddScreenSettings].oddsScreenScaleTo;
    const xFrom = _s(mainElementPositionSizes[this.gameType as keyof typeof mainElementPositionSizes].oddsScreen.x);
    const yFrom = _s(mainElementPositionSizes[this.gameType as keyof typeof mainElementPositionSizes].oddsScreen.y);
    const x = _s(oddScreenSettings[this.gameType as keyof typeof oddScreenSettings].oddsScreenPosXTo);
    const y = _s(oddScreenSettings[this.gameType as keyof typeof oddScreenSettings].oddsScreenPosYTo);

    const fadeIn = sub.fadeInFactor || 0.8;
    const fadeOut = sub.fadeOutFactor || 0.8;
    const inSmoothness = sub.smoothness?.in || 1.5;
    const outSmoothness = sub.smoothness?.out || 1.5;

    if (t < duration - fadeOut) {
      if (sub.startSm) return;
      this.animateIn(t, start, duration, fadeIn, fadeInFrom, fadeInTo, inSmoothness || 1.5, (val) => {
        this.container.scale.x = val;
        this.container.scale.y = val;
      });
      this.animateIn(t, start, duration, fadeIn, xFrom, x, inSmoothness || 1.5, (val) => (this.container.position.x = val));
      this.animateIn(t, start, duration, fadeIn, yFrom, y, inSmoothness || 1.5, (val) => (this.container.position.y = val));
    } else if (t > duration) {
      this.container.scale.x = fadeInFrom;
      this.container.scale.y = fadeInFrom;
      this.container.position.x = xFrom;
      this.container.position.y = yFrom;
      return;
    } else {
      this.animateOut(t, duration, fadeInTo, fadeInFrom, fadeOut, outSmoothness || 1.5, (val) => {
        this.container.scale.x = val;
        this.container.scale.y = val;
      });
      this.animateOut(t, duration, x, xFrom, fadeOut, outSmoothness || 1.5, (val) => (this.container.position.x = val));
      this.animateOut(t, duration, y, yFrom, fadeOut, outSmoothness || 1.5, (val) => (this.container.position.y = val));
    }
  }

  private animateOut(currentTime: number, end: number, fadeOutFrom: number, fadeOutTo: number, fadeOut: number, smoothness: number, fadeInCallback: (x: number) => any) {
    const val =
      fadeOutFrom +
      (fadeOutTo - fadeOutFrom) *
        (this.gameType === "dog63" ? AnimHelper.easeOutSine((currentTime - (end - fadeOut)) / fadeOut, smoothness) : AnimHelper.easeOutCirc((currentTime - (end - fadeOut)) / fadeOut, smoothness));
    fadeInCallback(val);
  }

  private animateIn(currentTime: number, start: number, duration: number, fadeIn: number, fadeInFrom: number, fadeInTo: number, smoothness: number, fadeInCallback: (x: number) => any) {
    if (currentTime < start) {
      fadeInCallback(fadeInFrom);
      return;
    } else if (currentTime - start > fadeIn && currentTime < duration) {
      fadeInCallback(fadeInTo);
      return;
    } else if (currentTime - start < fadeIn) {
      const val =
        fadeInFrom +
        (fadeInTo - fadeInFrom) * (this.gameType === "dog63" ? AnimHelper.easeOutSine((currentTime - start) / fadeIn, smoothness) : AnimHelper.easeOutCirc((currentTime - start) / fadeIn, smoothness));
      fadeInCallback(val);
      return;
    }
    fadeInCallback(fadeInTo);
    return;
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean, language: string): OddsUIDog["anims"] {
    if (this.oddsAlwaysOn && language !== "it") language = "default";
    if (gameType === "horse") {
      if (this.oddsAlwaysOn) {
        return oddsAlwayOnOddScreenTimings.horse[language as "default" | "it"];
      }
      return [
        { startTime: 1.3, duration: 24.8, fadeInFactor: 0.75 },
        { startTime: 101.7, duration: 18.3, fadeInFactor: 0.75 },
        withBonus ? { startTime: 161.0, duration: 15.3, fadeInFactor: 0.75 } : { startTime: 156.3, duration: 19.7, fadeInFactor: 0.75 }
      ];
    } else if (gameType === "sulky") {
      if (this.oddsAlwaysOn) {
        return oddsAlwayOnOddScreenTimings.sulky[language as "default" | "it"];
      }
      return [
        { startTime: 1.3, duration: 24.8, fadeInFactor: 0.75 },
        { startTime: 101.7, duration: 18.3, fadeInFactor: 0.75 },
        withBonus ? { startTime: 161.0, duration: 15.3, fadeInFactor: 0.75 } : { startTime: 156.3, duration: 19.7, fadeInFactor: 0.75 }
      ];
    } else if (gameType === "dog6") {
      switch (gameLength) {
        case 120:
          if (this.oddsAlwaysOn) {
            return oddsAlwayOnOddScreenTimings.dog6[120];
          }
          return [
            { startTime: 1.8, duration: 13.2, fadeInFactor: 0.75 },
            withBonus ? { startTime: 35.6, duration: 21.5, fadeInFactor: 0.75 } : { startTime: 30.7, duration: 26.2, fadeInFactor: 0.75 }
          ];
        case 180:
          return [
            withBonus ? { startTime: 1.8, duration: 17.5, fadeInFactor: 0.75 } : { startTime: 1.75, duration: 22.5, fadeInFactor: 0.75 },
            withBonus ? { startTime: 90.8, duration: 26.0 } : { startTime: 90.8, duration: 26.2 }
          ];
        case 240:
          if (this.oddsAlwaysOn) {
            return oddsAlwayOnOddScreenTimings.dog6[language === "it" ? "it" : 240];
          }
          return [
            language === "it" ? { startTime: 10.2, duration: 18.4 } : { startTime: 1.8, duration: 27.0 },
            { startTime: 91.0, duration: 26.5 },
            withBonus ? { startTime: 150.2, duration: 27.3, fadeOutFactor: 0.7 } : { startTime: 140.8, duration: 36.2 }
          ];
        case 300:
          if (this.oddsAlwaysOn) {
            return oddsAlwayOnOddScreenTimings.dog6.it;
          }
          return [
            withBonus
              ? { startTime: 1.8, duration: withBonus ? 27.0 : 31.7 }
              : language === "it"
                ? { startTime: 10.3, duration: withBonus ? 27.0 : 23.5, fadeOutFactor: 0.5 }
                : { startTime: 1.8, duration: withBonus ? 27.0 : 31.7 },
            withBonus ? { startTime: 90.9, duration: 27.1 } : { startTime: 101.0, duration: 26.5 },
            { startTime: 156.3, duration: 35.3 }
          ];
        default: {
          return [{ startTime: 4.5, duration: 24.0 }, { startTime: 112.7, duration: 24.5 }, withBonus ? { startTime: 161, duration: 15.5 } : { startTime: 146, duration: 15.5 }];
        }
      }
    }

    if (gameType === "dog63") {
      if (gameLength === 360) return oddsAlwayOnOddScreenTimings.dog63_6;
      if (withBonus) return oddsAlwayOnOddScreenTimings.dog63.bonus;
      return oddsAlwayOnOddScreenTimings.dog63[language as keyof typeof oddsAlwayOnOddScreenTimings.dog63];
    }
    // dog
    switch (gameLength) {
      case 120:
        if (this.oddsAlwaysOn) {
          return oddsAlwayOnOddScreenTimings.dog8[120];
        }
        return [
          { startTime: 1.1, duration: withBonus ? 12.0 : 11.8, fadeInFactor: 0.55 },
          withBonus ? { startTime: 35.5, duration: 21.5, fadeInFactor: 0.75 } : { startTime: 30.5, duration: 26.5, fadeInFactor: 0.75 }
        ];
      case 180:
        return [
          { startTime: withBonus ? 1.1 : 1.2, duration: withBonus ? 17.0 : 21.7, fadeInFactor: 0.7 },
          { startTime: 91.0, duration: 26.0 } // maybe with bonus??
        ];
      case 240:
        if (this.oddsAlwaysOn) {
          return oddsAlwayOnOddScreenTimings.dog8[language === "it" ? "it" : 240];
        }
        return [
          language === "it" ? { startTime: 10.2, duration: 18.7, fadeOutFactor: 1.3 } : { startTime: 1.2, duration: 26.5, fadeOutFactor: 1.3 },
          { startTime: 100.8, duration: 22.2 }, // maybe with bonus??
          withBonus ? { startTime: 155.5, duration: 21.3 } : { startTime: 146.2, duration: 30.0, fadeInFactor: 1.1 }
        ];
      case 300:
        if (this.oddsAlwaysOn) {
          return oddsAlwayOnOddScreenTimings.dog8.it;
        }
        return [
          language === "it" ? { startTime: withBonus ? 1.1 : 10.3, duration: withBonus ? 27.0 : 23.0 } : { startTime: withBonus ? 1.1 : 1.3, duration: withBonus ? 27.0 : 31.2 },
          withBonus ? { startTime: 100.8, duration: 22.3 } : { startTime: 110.8, duration: 22.2 }, // maybe with bonus??
          { startTime: 161.0, duration: 31.0, fadeInFactor: 1.2 }
        ];
      default: {
        return [
          { startTime: 4.8, duration: 31.0 },
          withBonus
            ? { startTime: 157.5, duration: 19.0 } // maybe with bonus??
            : { startTime: 152.7, duration: 21.0 }
        ];
      }
    }
  }

  public createOddsHeaderAnims(gameType: GameType, gameLength: GameLength, language: string, withBonus = false): IAnimInterval[][] {
    if (this.oddsAlwaysOn && this.gameType === "dog63") {
    } else if (language !== "it") {
      return [];
    }

    if (this.oddsAlwaysOn) {
      let key: string = this.gameType;

      if (this.language !== "it") {
        key = this.gameType + (withBonus ? "_bonus" : "_default");
      }
      return oddsAlwaysOnItHeaderTimings[key as "dog6" | "dog8" | "horse" | "sulky" | "dog63" | "dog63_default" | "dog63_bonus"];
    }
    if (gameType === "dog6") {
      switch (gameLength) {
        case 300:
          return [
            [
              { startTime: 10.3, duration: 3.7 },
              { startTime: 100.6, duration: 4.45 },
              { startTime: 155.8, duration: 5.8 }
            ],
            [
              { startTime: 14.65, duration: 2.2 },
              { startTime: 105.6, duration: 2.6 },
              { startTime: 162.3, duration: 3.4 }
            ]
          ];
        case 240:
          return [
            [
              { startTime: 10.3, duration: 3.0 },
              { startTime: 90.7, duration: 4.3 },
              { startTime: 140.8, duration: 5.7 }
            ],
            [
              { startTime: 13.7, duration: 1.7 },
              { startTime: 95.57, duration: 2.6 },
              { startTime: 147.25, duration: 3.4 }
            ]
          ];
      }
    } else if (gameType === "dog8") {
      switch (gameLength) {
        case 300:
          return [
            [
              { startTime: 10.1, duration: 4.35 },
              { startTime: 110.15, duration: 4.55 },
              { startTime: 160.4, duration: 5.9 }
            ],
            [
              { startTime: 14.85, duration: 1.9 },
              { startTime: 114.8, duration: 1.9 },
              { startTime: 166.6, duration: 2.6 }
            ]
          ];
        case 240:
          return [
            [
              { startTime: 10, duration: 3.5 },
              { startTime: 100, duration: 4.6 },
              { startTime: 145.3, duration: 5.9 }
            ],
            [
              { startTime: 13.9, duration: 1.5 },
              { startTime: 104.8, duration: 1.8 },
              { startTime: 151.5, duration: 2.5 }
            ]
          ];
      }
    } else if (gameType === "dog63") {
    }
    return [];
  }

  public createCellAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean, language: string): BottomBarItemDogAnim[] {
    if (gameType === "horse" || gameType === "sulky") {
      if (this.oddsAlwaysOn) {
        return oddsAlwayOnBottomBarTimings.horse[384].anims;
      }
      return BottomBarTimings.horse.getAnims(withBonus);
    }
    if (gameType === "dog6") {
      if (this.oddsAlwaysOn) {
        return oddsAlwayOnBottomBarTimings.dog[gameLength as 120 | 240 | 300].anims;
      }
      return BottomBarTimings.dog6.getAnims(gameLength as 120 | 240 | 300, withBonus, language === "it");
    }
    /*if (gameType === "dog63") {
      if (this.oddsAlwaysOn) {
        if (gameLength === 360) {
          return oddsAlwayOnBottomBarTimings.dog63_6[this.mode].anims;
        }
        return oddsAlwayOnBottomBarTimings.dog63[this.mode].anims;
      }
    }*/
    // dog8
    if (this.oddsAlwaysOn) {
      return oddsAlwayOnBottomBarTimings.dog8[gameLength as 120 | 240 | 300].anims;
    }
    return BottomBarTimings.dog8.getAnims(gameLength as 120 | 240 | 300, withBonus, language === "it");
  }

  private getSubAnim(
    t: number,
    subs:
      | (IAnimInterval & {
          fadeInFactor?: number;
          fadeOutFactor?: number;
          smoothness?: { in: number; out: number };
        })[]
      | undefined
  ) {
    return subs?.find((sub) => t >= sub.startTime && t <= sub.startTime + sub.duration) || null;
  }

  private getAnim(
    t: number,
    anims:
      | (IAnimInterval & {
          fadeInFactor?: number;
          fadeOutFactor?: number;
          initAnimation?: boolean;
          startSm?: boolean;
          getDurationOffset?: Function;
          subAnimations?: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number; smoothness?: { in: number; out: number } })[];
        })[]
      | undefined
  ) {
    return anims?.find((a) => t >= a.startTime - 1.1 && t <= a.startTime + a.duration) || null;
  }

  private getAnimOutTime(
    t: number,
    anims:
      | (IAnimInterval & {
          fadeInFactor?: number;
          fadeOutFactor?: number;
          initAnimation?: boolean;
          startSm?: boolean;
          getDurationOffset?: Function;
          subAnimations?: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number; smoothness?: { in: number; out: number } })[];
        })[]
      | undefined
  ) {
    const anim = anims?.find((a) => t >= a.startTime && t <= a.startTime + a.duration + 3);
    return anim ? anim.startTime + anim.duration : 0;
  }
}
