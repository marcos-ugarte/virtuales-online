import { oddsAlwayOnBottomBarTimings } from "../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, settings } from "client/Logic/Logic";
import { AnimHelper } from "../common/Anim";
import { oddsAlwaysOnStyles } from "./../../../settings/OddsAlwaysOnSettings";
import { DriverPattern, IAnimInterval, IColors, IDriver, IGameInfo } from "client/Logic/LogicDefinitions";
import { GameLength, GameType } from "common/Definitions";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { DogHelper } from "client/VideoScreen/dog/DogHelper";
import { bottomBarMode } from "client/VideoScreen/dog/BottomBarDog";
import { BottomBarItemDogAnim } from "client/VideoScreen/dog/BottomBarItemDog";
import { bottomBarSettings, BottomBarTimings } from "settings/BottomBarSettings";
import { UIHelper } from "client/VideoScreen/UIHelper";
import { Util } from "common/Util";

export type IExtendetAnimInterval = IAnimInterval & {
  fadeInFactor?: number | undefined;
  fadeOutFactor?: number | undefined;
  initAnimation?: boolean | undefined;
  startSm?: boolean | undefined;
  getDurationOffset?: (length: number) => number | undefined;
  subAnimations: SubAnim[] | undefined;
};

export type SubAnim = IAnimInterval & {
  fadeInFactor?: number | undefined;
  smoothness?: { in: number; out: number } | undefined;
  startSm?: boolean | undefined;
  fadeOutFactor?: number | undefined;
};

// Top Right Race number and timing
export class BottomItemDog extends Group {
  private gameInfo: IGameInfo;
  private index: number;
  private totalRaceTime: number = 0;
  private racerCount: number;
  private oddsAlwaysOn: boolean;
  private isDog8: boolean;
  private mode: bottomBarMode;

  // Dimensions
  private rows = 4;
  private lineHeight = 0;
  private lineHeightNumber = 0;
  private lineWidthNumber = 0;
  private lineWidthName = 0;
  private lineHeightName = 0;
  private lineHeightColor = 0;
  private seperatorLine = 0;
  private margin = 0;
  private lineWidth = 0;
  private lineWidthData = 0;

  private skewedPixels = 0;
  private skewedPixelsRacer = 0;
  private skewedPixelsNumber = 0;
  private skewedPixelsName = 0;
  private skewedPixelsRow = 0;

  private intialXName = 0;
  private intialXNumber = 0;
  private intialXRacer = 0;

  private dataContainer = new PIXI.Container();
  private nameBar1: PIXI.Sprite = new PIXI.Sprite();
  private nameBar2: PIXI.Sprite = new PIXI.Sprite();
  private numberBar: PIXI.Sprite = new PIXI.Sprite();
  private racerBar: PIXI.Graphics = new PIXI.Graphics();
  private colorBar: PIXI.Sprite = new PIXI.Sprite();
  private animBarBig: PIXI.Sprite = new PIXI.Sprite();

  private colorContainer = new PIXI.Container();

  private barContainer = new PIXI.Container();
  private barMask: PIXI.Graphics = new PIXI.Graphics();
  private colorBars: PIXI.Sprite[] = []; //3
  private lightBlueBars: PIXI.Sprite[] = []; //2
  private darkBlueBars: PIXI.Sprite[] = []; //4
  private barTex: PIXI.Sprite[] = [];

  //private updateTimeSpent = 0;

  public constructor(index: number, gameInfo: IGameInfo, helper: DogHelper, oddsAlwaysOn = false, mode: bottomBarMode, fieldCount = 4) {
    super();
    this.showDebug(settings.debug, undefined, "BottomItemDog");
    this.container.name = "BottomItemDog";
    this.gameInfo = gameInfo;
    this.racerCount = Logic.getRacerCount(gameInfo.gameType);
    this.oddsAlwaysOn = oddsAlwaysOn;
    this.isDog8 = gameInfo.gameType === "dog8";
    this.index = index;
    this.rows = fieldCount;
    this.mode = mode;
    this.showDebug(settings.debug, 0.7, this.container.name);

    const heightFactor = oddsAlwaysOn ? 1.0 : 0.81;
    const heightFactorInfo = oddsAlwaysOn ? 1.0 : 0.88;
    const widthFactor = oddsAlwaysOn ? 1.0 : 0.85;
    const widthFactorInfo = oddsAlwaysOn ? 1.0 : 0.95;

    this.visible = false;

    this.add(this.dataContainer);
    this.add(this.barContainer);
    this.dataContainer.addChild(this.colorContainer);

    const {
      lineHeight: lH,
      lineHeightNumber: lHNb,
      lineWidthNumber: lWN,
      lineHeightName: lHN,
      lineHeightColor: lHC,
      seperatorLine: sep,
      margin: ma,
      lineWidth: lW
    } = bottomBarSettings[this.gameInfo.gameType as keyof typeof bottomBarSettings];
    this.lineHeight = Math.ceil(_s(lH) * heightFactor);
    this.lineHeightNumber = _s(lHNb) * heightFactorInfo;
    this.lineWidthNumber = _s(lWN);
    this.lineHeightName = Math.ceil(_s(lHN) * heightFactorInfo);
    this.lineHeightColor = Math.ceil(_s(lHC) * heightFactorInfo);
    this.margin = _s(ma);
    this.seperatorLine = _s(sep);
    this.lineWidth = _s(lW) * widthFactorInfo;
    this.lineWidthData = _s(lW) * widthFactor;
    this.lineWidthName = this.lineWidth - this.margin - this.lineWidthNumber - _s(this.gameInfo.gameType === "dog8" ? 0 : 25);

    this.skewedPixels = UIHelper.getSkewedPixel(this.rows * this.lineHeight);
    this.skewedPixelsRacer = UIHelper.getSkewedPixel(this.lineHeightColor);
    this.skewedPixelsNumber = UIHelper.getSkewedPixel(this.lineHeightNumber);
    this.skewedPixelsName = UIHelper.getSkewedPixel(this.lineHeightName);
    this.skewedPixelsRow = UIHelper.getSkewedPixel(this.lineHeight);

    this.intialXNumber = -this.skewedPixels - this.skewedPixelsNumber;
    this.intialXName = this.intialXNumber + this.lineWidthNumber + this.skewedPixelsNumber + this.margin - this.skewedPixelsName;
    this.intialXRacer = this.intialXName - this.skewedPixelsRacer;

    this.barMask = DrawHelper.createSkewedRoundedRectangleGraphics(
      -this.skewedPixels,
      0,
      this.lineWidthData + this.skewedPixels,
      this.rows * this.lineHeight,
      UIHelper.getSkewedRadius(this.rows * this.lineHeight),
      this.skewedPixels
    );

    this.dataContainer.addChild(this.barMask);
    this.barContainer.mask = this.barMask;

    for (let i = 0; i < this.rows; i++) {
      if (i <= this.rows - 2) {
        this.colorBars[i] = new PIXI.Sprite();
        this.barContainer.addChild(this.colorBars[i]);
      }
      this.lightBlueBars[i] = new PIXI.Sprite();
      this.barContainer.addChild(this.lightBlueBars[i]);
      this.darkBlueBars[i] = new PIXI.Sprite();
      this.barContainer.addChild(this.darkBlueBars[i]);
    }

    this.numberBar = new PIXI.Sprite();
    this.dataContainer.addChild(this.numberBar);

    this.nameBar1 = new PIXI.Sprite();
    this.dataContainer.addChild(this.nameBar1);

    this.nameBar2 = new PIXI.Sprite();
    this.dataContainer.addChild(this.nameBar2);

    const nameBarMask = DrawHelper.createSkewedRoundedRectangleGraphics(
      this.intialXName,
      this.margin + this.rows * this.lineHeight,
      this.lineWidthName + this.skewedPixelsName,
      this.lineHeightName,
      UIHelper.getSkewedRadius(this.lineHeightName),
      this.skewedPixelsName
    );
    //nameBarMask.x = -this.skewedPixels - this.skewedPixelsName - this.skewedPixelsNumber + this.lineWidthNumber;
    //nameBarMask.y = this.margin + this.rows * this.lineHeight;
    this.nameBar2.mask = nameBarMask;
    this.dataContainer.addChild(nameBarMask as PIXI.DisplayObject);

    this.racerBar = new PIXI.Graphics();
    this.racerBar = DrawHelper.createSkewedRoundedRectangleGraphics(
      0,
      0,
      this.lineWidthName + this.skewedPixelsRacer,
      this.lineHeightColor,
      UIHelper.getSkewedRadius(this.lineHeightName),
      this.skewedPixelsRacer
    );
    this.racerBar.x = this.intialXRacer;
    this.racerBar.y = this.margin + this.rows * this.lineHeight + this.lineHeightName;
    this.dataContainer.addChild(this.racerBar);
    this.colorContainer.mask = this.racerBar;

    this.colorBar = new PIXI.Sprite();
    this.colorContainer.addChild(this.colorBar);

    this.animBarBig = new PIXI.Sprite();
    this.dataContainer.addChild(this.animBarBig);
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean, language: string): BottomBarItemDogAnim[] {
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
    if (gameType === "dog63") {
      if (this.oddsAlwaysOn) {
        if (gameLength === 360) {
          return oddsAlwayOnBottomBarTimings.dog63_6[this.mode].anims;
        }
        return oddsAlwayOnBottomBarTimings.dog63[this.mode].anims;
      }
    }
    // dog8
    if (this.oddsAlwaysOn) {
      return oddsAlwayOnBottomBarTimings.dog8[gameLength as 120 | 240 | 300].anims;
    }
    return BottomBarTimings.dog8.getAnims(gameLength as 120 | 240 | 300, withBonus, language === "it");
  }

  public fill(driver: IDriver, colors: IColors, withBonus: boolean, language: string) {
    //this.anims = this.createAnims(this.gameType, this.gameLength, withBonus, this.language);
    this.anims = this.createAnims(this.gameInfo.gameType, this.gameInfo.gameLength, withBonus, language);

    const barWidth = this.lineWidthData + this.skewedPixelsRow;

    for (let i = 0; i < this.rows; i++) {
      if (i <= this.rows - 2) {
        this.colorBars[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(barWidth, this.lineHeight, 0, this.skewedPixelsRow, {
          type: "solid",
          color: driver.color2 ? (i % 2 === 0 ? Util.rgbToHex(driver.color) : Util.rgbToHex(driver.color2)) : Util.rgbToHex(driver.color)
        });
        //this.colorBars[i].x = -this.skewedPixelsRow * (i + 1);
        this.colorBars[i].x = -this.skewedPixelsRow * (i + 1) - this.lineWidth * 10;
        this.colorBars[i].y = this.lineHeight * i;
        //this.colorBars[i].alpha = 0.85;009245
      }
      const colorStops = DrawHelper.calculateGradientStops(
        this.isDog8 ? "#009245" : DogHelper.getColorByGame(this.gameInfo.gameType, "#1658e5"),
        this.isDog8 ? "#006837" : DogHelper.getColorByGame(this.gameInfo.gameType, "#082969"),
        i + 1,
        this.rows
      );
      this.lightBlueBars[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(
        barWidth + (i === this.rows - 1 ? barWidth + 1 : i === this.rows - 2 ? barWidth / 2 : 0),
        this.lineHeight,
        0,
        this.skewedPixelsRow,
        {
          type: "gradient",
          verti: true,
          color: colorStops[0],
          color2: colorStops[1],
          opacity: 0.93
        }
      );
      //this.lightBlueBars[i].x = -this.skewedPixelsRow * (i + 1);
      this.lightBlueBars[i].x = -this.skewedPixelsRow * (i + 1) - this.lineWidth * 10;
      this.lightBlueBars[i].y = this.lineHeight * i;
      //this.lightBlueBars[i].alpha = 0.85;
      this.darkBlueBars[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(barWidth + 1, this.lineHeight, 0, this.skewedPixelsRow, [
        {
          type: "mixed",
          verti: true,
          color: this.isDog8 ? "#1e4a3a" : DogHelper.getColorByGame(this.gameInfo.gameType, "#022841"),
          color2: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameInfo.gameType, "#04172a"),
          stroke: [
            {
              verti: false,
              color: this.isDog8 ? "#7cabb2" : DogHelper.getColorByGame(this.gameInfo.gameType, "#029ad0"),
              color2: this.isDog8 ? "#5b7d82" : DogHelper.getColorByGame(this.gameInfo.gameType, "#04172a"),
              opacity: 0.43,
              width: this.seperatorLine
            }
          ],
          start: -0.34,
          end: 0.5,
          opacity: 0.72
        }
      ]);
      //this.darkBlueBars[i].x = -this.skewedPixelsRow * (i + 1);
      this.darkBlueBars[i].x = -this.skewedPixelsRow * (i + 1) - this.lineWidth * 10;
      this.darkBlueBars[i].y = this.lineHeight * i;
    }

    this.colorBar.texture = DrawHelper.getCachedPattern(
      this.lineWidthName + this.skewedPixelsRacer,
      this.lineHeightColor,
      this.skewedPixelsRacer,
      driver.color,
      driver.color2,
      driver.driverPattern,
      true
    );
  }

  public onLayout() {
    this.numberBar.texture = DrawHelper.createSkewedRoundedRectangleTexture(
      this.lineWidthNumber + this.skewedPixelsNumber,
      this.lineHeightNumber,
      UIHelper.getSkewedRadius(this.lineHeightNumber),
      this.skewedPixelsNumber,
      [
        {
          type: "mixed",
          verti: true,
          color: this.isDog8 ? "#329e69" : DogHelper.getColorByGame(this.gameInfo.gameType, "#1658E5"),
          color2: this.isDog8 ? "#004735" : DogHelper.getColorByGame(this.gameInfo.gameType, "#082969"),
          start: 0,
          end: 1.25,
          opacity: 1.0
        },
        {
          type: "mixed",
          verti: true,
          color: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameInfo.gameType, "#04172a"),
          color2: this.isDog8 ? "#1e4a3a" : DogHelper.getColorByGame(this.gameInfo.gameType, "#022841"),
          start: 0,
          end: 1.3,
          opacity: 0.54
        }
      ]
    );
    this.numberBar.alpha = 0;
    const bounds = this.numberBar.getBounds();
    this.numberBar.width = bounds.width;
    this.numberBar.height = bounds.height;
    this.numberBar.pivot.set(bounds.width / 2, bounds.height / 2);
    this.numberBar.x = this.intialXNumber + bounds.width / 2;
    this.numberBar.y = this.margin + this.rows * this.lineHeight + bounds.height / 2;

    this.animBarBig.texture = DrawHelper.createSkewedRoundedRectangleTexture(
      (this.lineWidthName + this.skewedPixelsName) / 3,
      this.lineHeightName,
      UIHelper.getSkewedRadius(this.lineHeightName),
      this.skewedPixelsName,
      {
        type: "gradient",
        verti: true,
        color: this.isDog8 ? "#1e4a3a" : DogHelper.getColorByGame(this.gameInfo.gameType, "#022841"),
        color2: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameInfo.gameType, "#04172a")
      }
    );
    this.animBarBig.x = -this.skewedPixels - this.skewedPixelsName - this.skewedPixelsNumber + this.lineWidthNumber;
    this.animBarBig.y = this.margin + this.rows * this.lineHeight;
    this.animBarBig.alpha = 0;

    this.nameBar1.x = this.intialXName;
    this.nameBar1.y = this.margin + this.rows * this.lineHeight;
    this.nameBar1.texture = DrawHelper.createSkewedRoundedRectangleTexture(
      this.lineWidthName + this.skewedPixelsName,
      this.lineHeightName,
      UIHelper.getSkewedRadius(this.lineHeightName),
      this.skewedPixelsName,
      [
        {
          type: "mixed",
          verti: true,
          color: this.isDog8 ? "#329e69" : DogHelper.getColorByGame(this.gameInfo.gameType, "#1658E5"),
          color2: this.isDog8 ? "#004735" : DogHelper.getColorByGame(this.gameInfo.gameType, "#082969"),
          start: -0.1,
          end: 1.4,
          opacity: 0.93
        },
        {
          type: "mixed",
          verti: true,
          color: this.isDog8 ? "#1e4a3a" : DogHelper.getColorByGame(this.gameInfo.gameType, "#022841"),
          color2: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameInfo.gameType, "#04172a"),
          start: 0,
          end: 1.25,
          opacity: 0.8
        }
      ]
    );
    this.nameBar1.alpha = UIHelper.calculateDoubleOpacity(UIHelper.getOverlappingOpacity([0.93, 0.8]));

    this.nameBar2.alpha = UIHelper.calculateDoubleOpacity(UIHelper.getOverlappingOpacity([0.93, 0.8]));
    this.nameBar2.texture = DrawHelper.createSkewedRoundedRectangleTexture(
      this.lineWidthName + this.skewedPixelsName,
      this.lineHeightName,
      UIHelper.getSkewedRadius(this.lineHeightName),
      this.skewedPixelsName,
      [
        {
          type: "mixed",
          verti: true,
          color: this.isDog8 ? "#329e69" : DogHelper.getColorByGame(this.gameInfo.gameType, "#1658E5"),
          color2: this.isDog8 ? "#004735" : DogHelper.getColorByGame(this.gameInfo.gameType, "#082969"),
          start: -0.1,
          end: 1.4,
          opacity: 0.93
        },
        {
          type: "mixed",
          verti: true,
          color: this.isDog8 ? "#1e4a3a" : DogHelper.getColorByGame(this.gameInfo.gameType, "#022841"),
          color2: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameInfo.gameType, "#04172a"),
          start: 0,
          end: 1.25,
          opacity: 0.8
        }
      ]
    );
    this.nameBar2.x = this.intialXName;
    this.nameBar2.y = this.margin + this.rows * this.lineHeight;

    this.colorBar.x = this.intialXRacer;
    this.colorBar.y = this.margin + this.rows * this.lineHeight + this.lineHeightName;
    this.colorBar.alpha = 0.95;
  }

  private anims: BottomBarItemDogAnim[] = [];

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);

    if (!anim) {
      if (this.visible) this.visible = false;
      return;
    }
    this.visible = true;

    const startVar = this.gameInfo.gameType === "dog8" ? 0 : 0.137;
    const endVar = this.gameInfo.gameType === "dog8" ? 0 : 0.096;

    const startOffset = anim.startTime + this.index * startVar;
    let endOffset = anim.startTime + (anim.fadeOutStart ?? anim.duration) - this.index * endVar + 0.8;
    //const endOffset2 = anim.startTime + anim.duration - this.index * 0.096;
    let startTime;
    const overlayOffset = 0.4;
    const startTimeInfo = anim.startTime - overlayOffset + (anim.infoStartTime ?? 0) + (anim.infoTime ?? 0) * this.index;
    const endTimeInfo = startTimeInfo + (anim.fadeOutStart ?? 0);
    let baseFactor: number;
    let duration = 1;
    const updateAnims = Logic.wasActionTriggered();

    if (!anim && !updateAnims) {
      return;
    }

    if (t >= Logic.getIntroEndTime()) {
      this.visible = false;
    }

    for (let i = 0; i < this.rows; i++) {
      if ((this.oddsAlwaysOn && t >= startOffset && t <= startOffset + 2.5) || (!this.oddsAlwaysOn && t >= startTimeInfo && t <= endTimeInfo)) {
        if (this.oddsAlwaysOn) {
          startTime = startOffset + 0.32 + i * 0.100333;
        } else {
          startTime = startTimeInfo + i * 0.100333;
        }
        baseFactor = t - startTime;
        duration = 0.45;
        AnimHelper.animateIn(baseFactor, 0, duration, 1, 2, 0, (f1) => {
          this.darkBlueBars[i].position.x = -this.skewedPixelsRow * (i + 1) - this.lineWidth * f1;
          this.lightBlueBars[i].position.x = -this.skewedPixelsRow * (i + 1) - (this.lineWidth + _s(5)) * f1;
          if (this.colorBars[i]) this.colorBars[i].position.x = -this.skewedPixelsRow * (i + 1) - this.lineWidth * f1 + (this.lineWidth - this.skewedPixelsRow - _s(25));
        });
      } else if ((this.oddsAlwaysOn && t >= startOffset + 2.5) || (!this.oddsAlwaysOn && t >= endTimeInfo)) {
        if (this.oddsAlwaysOn) {
          startTime = endOffset - 0.25 - i * 0.12;
          duration = 0.65;
        } else {
          startTime = endTimeInfo + (this.rows - i) * 0.1;
          duration = 1.5;
        }
        baseFactor = t - startTime;

        AnimHelper.animateIn(baseFactor, 0, duration, 1, 0, 2, (f1) => {
          this.darkBlueBars[i].position.x = -this.skewedPixelsRow * (i + 1) - this.lineWidth * f1;
          this.lightBlueBars[i].position.x = -this.skewedPixelsRow * (i + 1) - (this.lineWidth + _s(5)) * f1;
          if (this.colorBars[i]) this.colorBars[i].position.x = -this.skewedPixelsRow * (i + 1) - this.lineWidth * f1 + (this.lineWidth - this.skewedPixelsRow - _s(25));
        });
      } else {
        this.darkBlueBars[i].position.x = -this.skewedPixelsRow * (i + 1) - this.lineWidth * 2;
        this.lightBlueBars[i].position.x = -this.skewedPixelsRow * (i + 1) - (this.lineWidth + _s(5)) * 2;
        if (this.colorBars[i]) this.colorBars[i].position.x = -this.skewedPixelsRow * (i + 1) - this.lineWidth * 2 + (this.lineWidth - this.skewedPixelsRow - _s(25));
      }
    }
    endOffset = anim.startTime + anim.duration - this.index * 0.096 - 0.6;

    if (t >= anim.startTime && t <= anim.startTime + anim.duration - 2) {
      startTime = startOffset + 0.1;
      baseFactor = t - startTime;
      duration = 0.95;
      AnimHelper.animateIn(baseFactor, 0, duration, 1, 0, 1, (f1) => {
        if (f1 <= UIHelper.getOverlappingOpacity([0.93, 0.8]) || updateAnims) {
          this.nameBar1.alpha = UIHelper.calculateDoubleOpacity(f1);
        }
      });

      startTime = startOffset - 0.09; //1.91
      baseFactor = t - startTime;
      duration = 1.45;
      AnimHelper.animateIn(baseFactor, 0, duration, 1, 1, 0, (f1) => {
        this.nameBar2.position.x = this.intialXName - (this.lineWidthName + 1) * f1;
      });

      startTime = startOffset - 0.01; //1.99
      baseFactor = t - startTime;
      duration = 1.24;

      AnimHelper.animateIn(baseFactor, 0, duration, 1, 0, 1, (f1) => {
        this.numberBar.scale.x = f1;
        this.numberBar.scale.y = f1;
        this.numberBar.alpha = Math.min(2 * f1, 0.96024);
      });

      startTime = startOffset - 0.08;
      baseFactor = t - startTime;
      duration = 0.75;
      if (t >= startTime && t <= startTime + duration) {
        AnimHelper.animateIn(baseFactor, 0, duration, 1, 0, 1.05, (f1) => {
          if (f1 !== 1.05 || updateAnims) {
            const alphaOffset = f1 < 0.8 ? f1 * 5 : f1 > 0.8 ? (1 - f1) * 5 : 1;
            this.animBarBig.alpha = 0.986 * alphaOffset;
            this.animBarBig.position.x = this.lineWidthNumber * f1;
          }
        });
      } else {
        this.animBarBig.alpha = 0;
      }

      startTime = startOffset + 0.1;
      baseFactor = t - startTime;
      duration = 0.1;

      if (t >= startTime && t <= startTime + duration) {
        AnimHelper.animateIn(baseFactor, 0, duration, 1, 1, -0.05, (f1) => {
          if (f1 !== -0.05 || updateAnims) {
            this.animBarBig.alpha = 0.986 * f1;
          }
        });
      }

      startTime = startOffset + 0.3;
      baseFactor = t - startTime;
      duration = 0.25;
      AnimHelper.animateIn(baseFactor, 0, duration, 1, 1, 0, (f1) => {
        this.racerBar.position.x = this.intialXRacer + (this.lineWidthName + 1) * f1;
      });
    } else if (t <= anim.startTime + anim.duration + 2) {
      /*for (let i = 0; i < this.rows; i++) {
        startTime = endOffset - 0.25 - i * 0.12;
        baseFactor = t - startTime;
        duration = 0.65;

        AnimHelper.animateIn(baseFactor, 0, duration, 1, 0, 1.75, (f1) => {
          this.darkBlueBars[i].position.x = -this.skewedPixelsRow * (i + 1) - this.lineWidth * f1;
          if (this.colorBars[i]) this.colorBars[i].position.x = -this.skewedPixelsRow * (i + 1) + this.lineWidth * (1 - f1);
          if (this.lightBlueBars[i]) this.lightBlueBars[i].position.x = -this.skewedPixelsRow * (i + 1) + this.lineWidth * (1 - f1);
        });
      }*/

      startTime = endOffset + 0.1;
      baseFactor = t - startTime;
      duration = 0.95;
      AnimHelper.animateIn(baseFactor, 0, duration, 1, 1, 0, (f1) => {
        if (f1 <= UIHelper.getOverlappingOpacity([0.93, 0.8]) || updateAnims) {
          this.nameBar1.alpha = UIHelper.calculateDoubleOpacity(f1);
        }
      });

      startTime = endOffset - 0.09; //1.91
      baseFactor = t - startTime;
      duration = 1.45;
      AnimHelper.animateIn(baseFactor, 0, duration, 1, 0, 1, (f1) => {
        this.nameBar2.position.x = this.intialXName - (this.lineWidthName + 1) * f1;
      });

      startTime = endOffset - 0.01; //1.99
      baseFactor = t - startTime;
      duration = 1.24;

      AnimHelper.animateIn(baseFactor, 0, duration, 1, 1, 0, (f1) => {
        this.numberBar.scale.x = f1;
        this.numberBar.scale.y = f1;
        this.numberBar.alpha = Math.min(2 * f1, 0.96024);
      });

      startTime = endOffset - 0.08; //1.92
      baseFactor = t - startTime;
      duration = 0.75;

      if (t >= startTime && t <= startTime + duration) {
        AnimHelper.animateIn(baseFactor, 0, duration, 1, 1, -0.05, (f1) => {
          if (f1 !== -0.05 || updateAnims) {
            this.animBarBig.position.x = this.lineWidthNumber * f1;
            this.animBarBig.alpha = 0.986 * f1;
          }
        });
      } else {
        this.animBarBig.alpha = 0;
      }

      startTime = endOffset + 0.1;
      baseFactor = t - startTime;
      duration = 0.25;
      AnimHelper.animateIn(baseFactor, 0, duration, 1, 0, 1, (f1) => {
        this.racerBar.position.x = this.intialXRacer + (this.lineWidthName + 1) * f1;
      });
    }
  }
}
