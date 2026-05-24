import { ColorsHelper } from "./../Util/ColorsHelper";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, settings, _t } from "client/Logic/Logic";
import { DynamicGeometry } from "client/Graphics/DynamicMesh";
import { Util } from "common/Util";

import { Logic } from "client/Logic/Logic";
import { IDriver, IAnimInterval, DriverPattern, IGameInfo } from "client/Logic/LogicDefinitions";
import { DrawHelper } from "../common/DrawHelper";
import { GameType, GameLength } from "common/Definitions";
import { DogHelper } from "./DogHelper";
import { UIHelper } from "client/VideoScreen/UIHelper";
import { Engine } from "client/Graphics/Engine";
import DRIVER_1 from "assets/dog/6/driver/img/1.png";
import DRIVER_2 from "assets/dog/6/driver/img/2.png";
import DRIVER_3 from "assets/dog/6/driver/img/3.png";
import DRIVER_4 from "assets/dog/6/driver/img/4.png";
import DRIVER_5 from "assets/dog/6/driver/img/5.png";
import DRIVER_6 from "assets/dog/6/driver/img/6.png";
import { AnimHelper } from "client/VideoScreen/common/Anim";

type AnimInterval = IAnimInterval & { addLast: number; addSecondToLast?: number; pause: number };

export class DriverPresentationDog extends Group {
  private driverTitle: PIXI.Text;
  private driverName: PIXI.Text;
  private driverNumberCol1: PIXI.Text[] = [];
  private driverNumberCol2: PIXI.Text[] = [];
  private driverNumberfirstLine1: PIXI.Sprite[] = [];
  private driverNumberfirstLine2: PIXI.Sprite[] = [];
  private driverNumberFirstText: PIXI.Text[] = [];
  private driverNumberSecondText: PIXI.Text[] = [];
  private driverOdds: PIXI.Text[] = [];
  private driverNameBox: PIXI.Sprite | undefined;
  private driverRunnerBox: PIXI.Sprite | undefined;
  private driverOddsRow: PIXI.Sprite[] = [];
  private driverOddsHighlightRow: PIXI.Sprite[] = [];
  private driverOddsBoxMask: PIXI.Graphics | undefined;
  private driverImageBox: PIXI.Sprite | undefined;
  private driverImage: PIXI.Sprite | undefined;
  private driverImageBoxShadow: PIXI.Sprite | undefined;
  private driverOddsBoxShadow: PIXI.Sprite | undefined;
  private driverAnimElements: PIXI.Sprite[] = [];
  private driverAnimMask: PIXI.Graphics | undefined;
  private driverOddsContainer: Group | undefined;
  private currentDriverIndex: number = -1;
  private drivers: IDriver[] = [];
  private odds: number[] = [];

  private offset: number = 64;
  private offsetHeight: number = 360;
  private rows: number = 0;
  private originY: number = 0;
  private rowHeight = 42;
  private rowWidth = _s(190);
  private imgBoxHeight = _s(153);
  private imgBoxWidth = _s(413);
  private nameBoxHeight = _s(30);
  private nameBoxWidth = _s(165);
  private runnerBoxHeight = _s(13);
  private runnerBoxWidth = _s(100);
  private rowStartY = 0;
  private rowStartX = _s(20);
  private seperatorLine = _s(1.6);
  private skewedOdds = 0;
  private skewedRow = 0;
  private initialX = 0;
  private initialY = 0;
  private gameType: GameType;
  private gameLength: GameLength;
  private racerCount: number;
  private isDog8: boolean;
  private anim: AnimInterval | AnimInterval[] = { startTime: 0.0, duration: 0.0, addLast: 0, pause: 0 };
  private helper: DogHelper;
  public oddsAlwaysOn;
  private useOverlays: boolean;
  public constructor(gameInfo: IGameInfo, helper: DogHelper) {
    super();
    this.helper = helper;
    this.gameType = gameInfo.gameType;
    this.gameLength = gameInfo.gameLength;
    this.racerCount = Logic.getRacerCount(gameInfo.gameType);
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.useOverlays = gameInfo.useOverlays;
    this.rows = this.racerCount + 1;
    this.rowStartY = this.gameType === "dog8" ? 31 : 86;
    this.isDog8 = this.gameType === "dog8";
    const dg = new DynamicGeometry("Pos2Color", 100, 150);
    this.add(dg);
    this.showDebug(settings.debug, 1, "DriverPresentationDog");
    this.skewedOdds = UIHelper.getSkewedPixel(Math.ceil(_s(this.rowHeight)) * this.rows);
    this.skewedRow = this.skewedOdds / (this.rows - 0.5);

    /*const testlayer = DrawHelper.createSkewedRoundedRectangleGraphics(
      this.rowStartX,
      this.rowStartY,
      this.rowWidth + UIHelper.getSkewedPixel(this.rowHeight * this.rows),
      this.rowHeight * (this.rows - 0.5),
      this.rowHeight * 0.5,
      UIHelper.getSkewedPixel(this.rowHeight * this.rows)
    );
    this.add(testlayer);*/

    if (this.useOverlays) {
      this.driverAnimMask = DrawHelper.createSkewedRoundedRectangleGraphics(_s(-400), _s(-100), _s(700), _s(500), UIHelper.getSkewedRadius(2 * this.imgBoxHeight), UIHelper.getSkewedPixel(_s(500)));
      this.add(this.driverAnimMask as PIXI.DisplayObject);
      this.container.mask = this.driverAnimMask;

      this.driverImageBoxShadow = new PIXI.Sprite();
      this.driverImageBoxShadow.anchor.set(0.5, 0.5);
      this.add(this.driverImageBoxShadow);
      this.driverOddsBoxShadow = new PIXI.Sprite();
      this.add(this.driverOddsBoxShadow);

      this.driverImageBox = new PIXI.Sprite();
      this.driverImageBox.anchor.set(0.5, 0.5);
      this.add(this.driverImageBox);

      this.driverNameBox = new PIXI.Sprite();
      this.add(this.driverNameBox);

      this.driverImage = new PIXI.Sprite();
      this.driverImage.x = _s(-36);
      this.driverImage.y = _s(84);
      this.driverImage.width = _s(476);
      this.driverImage.anchor.set(0.5, 0.5);
      this.add(this.driverImage);

      this.driverAnimElements[0] = new PIXI.Sprite();
      this.driverAnimElements[0].y = _s(-100);
      this.driverAnimElements[1] = new PIXI.Sprite();
      this.driverAnimElements[1].y = _s(-100);
      this.add(this.driverAnimElements[0]);
      this.add(this.driverAnimElements[1]);

      this.driverOddsContainer = new Group();
      this.add(this.driverOddsContainer);

      this.driverOddsBoxMask = DrawHelper.createSkewedRoundedRectangleGraphics(
        this.rowStartX,
        _s(this.rowStartY),
        this.rowWidth + this.skewedOdds,
        Math.ceil(_s(this.rowHeight)) * (this.rows - 0.5),
        Math.ceil(_s(this.rowHeight)) * 0.5,
        this.skewedOdds
      );
      this.add(this.driverOddsBoxMask as PIXI.DisplayObject);
      this.driverOddsContainer.container.mask = this.driverOddsBoxMask;

      for (let i = 0; i < this.rows; i++) {
        this.driverOddsRow[i] = new PIXI.Sprite();
        this.driverOddsContainer.add(this.driverOddsRow[i]);
        if (i < this.rows - 1) {
          this.driverOddsHighlightRow[i] = new PIXI.Sprite();
          this.driverOddsContainer.add(this.driverOddsHighlightRow[i]);
        }
      }

      this.driverRunnerBox = new PIXI.Sprite();
      this.add(this.driverRunnerBox);

      //this.driverImage.visible = false;
      //this.driverNameBox.visible = false;
      //this.driverImageBox.visible = false;
      //this.driverImageBoxShadow.visible = false;
      //this.driverOddsBoxShadow.visible = false;
    }

    this.driverTitle = Logic.createPixiText(this.helper.getDriverPresentationTitleStyle());
    this.driverTitle.anchor.set(0.5, 0.5);
    this.add(this.driverTitle);

    this.driverName = Logic.createPixiText(this.helper.getDriverPresentationNameStyle());
    this.driverName.anchor.set(0, 0.5);
    this.add(this.driverName);

    const styleOdds = this.helper.getDriverPresentationQuoteStyle();

    const styleBoldSmall = this.helper.getDriverPresentationSmallBoldStyle();
    for (let i = 0; i < this.racerCount; i++) {
      this.driverNumberCol1.push(Logic.createPixiText(styleBoldSmall));
      this.driverNumberCol1[i].anchor.set(0.5);
      this.driverNumberCol1[i].roundPixels = true;
      this.add(this.driverNumberCol1[i]);

      const spriteLine1 = new PIXI.Sprite();
      const spriteLine2 = new PIXI.Sprite();
      this.driverNumberfirstLine1.push(spriteLine1);
      this.driverNumberfirstLine2.push(spriteLine2);
      if (gameInfo.gameType !== "horse" && gameInfo.gameType !== "sulky") {
        this.add(spriteLine1);
        this.add(spriteLine2);
      }

      const firstText = Logic.createPixiText(this.helper.getFirstTextStyle());
      this.driverNumberFirstText.push(firstText);
      if (gameInfo.gameType === "horse" || gameInfo.gameType === "sulky") this.add(firstText);

      const secondText = Logic.createPixiText(this.helper.getFirstTextStyle());
      this.driverNumberSecondText.push(secondText);
      if (gameInfo.gameType === "horse" || gameInfo.gameType === "sulky") this.add(secondText);

      this.driverNumberCol2.push(Logic.createPixiText(styleBoldSmall));
      this.driverNumberCol2[i].anchor.set(0.5);
      this.driverNumberCol2[i].roundPixels = true;
      this.add(this.driverNumberCol2[i]);
      this.driverOdds.push(Logic.createPixiText(styleOdds));
      this.driverOdds[i].anchor.set(1.0, 0.5);
      this.driverOdds[i].roundPixels = true;
      this.add(this.driverOdds[i]);
    }
  }

  //
  public static createAnim(gameType: GameType, gameLength: GameLength, withBonus: boolean, oddsAlwaysOn = false): { top: AnimInterval | AnimInterval[]; bar: AnimInterval | AnimInterval[] } {
    if (oddsAlwaysOn) {
      return {
        top: { startTime: 0, duration: 0, pause: 0, addLast: 0.0 },
        bar: { startTime: 0, duration: 0, pause: 0, addLast: 0.0 }
      };
    }
    if (gameType === "horse" || gameType === "sulky") {
      return {
        top: [
          { startTime: 70.8, duration: 4.0, pause: 0.0, addSecondToLast: 0.2, addLast: 0.4 },
          { startTime: 74.8, duration: 4.0, pause: 0.0, addSecondToLast: 0.2, addLast: 0.4 },
          { startTime: 78.8, duration: 4.0, pause: 0.0, addSecondToLast: 0.2, addLast: 0.4 },
          { startTime: 82.8, duration: 4.0, pause: 0.0, addSecondToLast: 0.2, addLast: 0.4 },
          { startTime: 86.8, duration: 4.0, pause: 0.0, addSecondToLast: 0.2, addLast: 0.4 },
          { startTime: 90.8, duration: 4.5, pause: 0.0, addSecondToLast: 0.2, addLast: 0.4 },
          { startTime: 95.5, duration: 4.3, pause: 0.0, addSecondToLast: 0.2, addLast: 0.4 }
        ],
        bar: [
          { startTime: 70.8, duration: 4.3, pause: 0.0, addLast: 0.0 },
          { startTime: 75.15, duration: 3.7, pause: 0.0, addLast: 0.0 },
          { startTime: 79.25, duration: 3.5, pause: 0.0, addLast: 0.0 },
          { startTime: 83.2, duration: 3.6, pause: 0.0, addLast: 0.0 },
          { startTime: 86.95, duration: 3.85, pause: 0.0, addLast: 0.0 },
          { startTime: 91.2, duration: 3.6, pause: 0.0, addLast: 0.0 },
          withBonus ? { startTime: 95.5, duration: 3.3 /*3.1*/, pause: 0.0, addLast: 0.0 } : { startTime: 95.25, duration: 3.65, pause: 0.0, addLast: 0.0 }
        ]
      };
    }
    if (gameType === "dog6") {
      switch (gameLength) {
        case 120:
          return {
            top: { startTime: 0, duration: 0, pause: 0, addLast: 0.0 },
            bar: { startTime: 0, duration: 0, pause: 0, addLast: 0.0 }
          };
        case 180:
          return {
            top: withBonus ? { startTime: 60.9, duration: 2.95, pause: 0.15, addLast: 0.2 } : { startTime: 70.7, duration: 3.04, pause: 0.1, addLast: 0.2 },
            bar: withBonus ? { startTime: 60.9, duration: 2.95, pause: 0.15, addLast: 0.0 } : { startTime: 70.7, duration: 3.04, pause: 0.1, addLast: 0.0 }
          };
        case 240:
          return {
            top: { startTime: 71.1, duration: 2.85, pause: 0.2, addLast: 0.3 },
            bar: { startTime: 70.6, duration: 3.1, pause: 0.05, addLast: -0.05 }
          };
        case 300:
          return {
            top: withBonus ? { startTime: 70.75, duration: 2.95, pause: 0.2, addLast: 0.18 } : { startTime: 80.8, duration: 2.85 /*3.1*/, pause: 0.3, addLast: 0.2 },
            bar: withBonus ? { startTime: 70.75, duration: 2.95, pause: 0.2, addLast: 0.0 } : { startTime: 80.8, duration: 2.85 /*3.1*/, pause: 0.3, addLast: 0.0 }
          };
        default:
          return {
            top: { startTime: 70.5, duration: 4.26, pause: 0.3, addLast: 0.4 },
            bar: { startTime: 70.5, duration: 4.26, pause: 0.3, addLast: 0.0 }
          };
      }
    }
    // dog8
    switch (gameLength) {
      case 120:
        return {
          top: { startTime: 0, duration: 0, pause: 0, addLast: 0.0 },
          bar: { startTime: 0, duration: 0, pause: 0, addLast: 0.0 }
        };
      case 180:
        return {
          top: withBonus ? { startTime: 60.5, duration: 2.32, pause: 0.05, addLast: 0.2 } : { startTime: 70.5, duration: 2.32, pause: 0.05, addLast: 0.2 },
          bar: withBonus ? { startTime: 60.2, duration: 2.48, pause: 0, addLast: 0.0 } : { startTime: 70.2, duration: 2.48, pause: 0, addLast: 0.0 }
        };
      case 240:
        return {
          top: { startTime: 70.7, duration: 3.4, pause: 0.2, addLast: 0.2 },
          bar: { startTime: 70.4, duration: 3.45, pause: 0.2, addLast: 0.0 }
        };
      case 300:
        return {
          top: withBonus ? { startTime: 70.5, duration: 3.6, pause: 0, addLast: 0.2 } : { startTime: 80.5, duration: 3.6, pause: 0, addLast: 0.2 },
          bar: withBonus ? { startTime: 70.5, duration: 3.7, pause: 0, addLast: 0.0 } : { startTime: 80.5, duration: 3.7, pause: 0, addLast: 0.0 }
        };
      default:
        return {
          top: { startTime: 76.92, duration: 6.52, pause: 0.3, addLast: 0.2 },
          bar: { startTime: 76.92, duration: 6.52, pause: 0.3, addLast: 0.0 }
        };
    }
  }

  public fill(drivers: IDriver[], odds: number[], withBonus: boolean) {
    const anims = DriverPresentationDog.createAnim(this.gameType, Logic.implementation.getCurrentIntroGameLength(), withBonus, this.oddsAlwaysOn);
    this.anim = anims.top;

    this.drivers = drivers;
    this.odds = odds;
  }

  private getPattern(pattern: DriverPattern | undefined, color1: number, color2: number | undefined): PIXI.Texture {
    if (pattern === DriverPattern.BLACK_WHITE_6)
      // the black_white pattern looks different in the tilted driverpresentation...
      return DrawHelper.getCachedPattern(10, 32, 5, color2 === undefined ? 0xff000000 : color2, color1, DriverPattern.BLACK_WHITE_6_b);
    return DrawHelper.getCachedPattern(10, 32, 5, color1, color2, pattern);
  }

  public updateDriverTexts(index: number) {
    const odds = this.odds;
    const drivers = this.drivers;
    if (!drivers || !drivers[index]) {
      return false;
    }

    this.driverTitle.text = this.gameType === "horse" || this.gameType === "sulky" ? _t("runner") : _t("dogRunner");
    Logic.autoSize(this.driverTitle, _s(90));

    const driver = drivers[index];
    this.driverName.text = driver.firstName.toUpperCase();
    Logic.autoSize(this.driverName, _s(140));

    const driverNumber = "" + (index + 1);

    {
      this.driverNumberCol1[0].text = driverNumber;
      this.driverNumberCol2[0].text = "";

      const texture = this.getPattern(driver.driverPattern, driver.color, driver.color2);
      this.driverNumberfirstLine1[0].texture = texture;
      this.driverNumberfirstLine1[0].alpha = 0;

      const oddsCurrentDriver = Logic.getOddsForDriver(odds, index, index, drivers.length);
      const afterDigitsOverwrite2 = Logic.getOddsForDriverDigits(odds, index, index, drivers.length);
      if (afterDigitsOverwrite2 === null) {
        this.driverOdds[0].text = Logic.implementation.formatOdds(oddsCurrentDriver);
      } else {
        this.driverOdds[0].text = Logic.implementation.formatOdds(oddsCurrentDriver, afterDigitsOverwrite2);
      }

      this.driverNumberFirstText[0].text = _t("numberSign");
      this.driverNumberSecondText[1].text = "";

      if (this.useOverlays) {
        const animTexture = DrawHelper.createSkewedRoundedRectangleTexture(_s(600), _s(350), UIHelper.getSkewedRadius(2 * this.imgBoxHeight), UIHelper.getSkewedPixel(_s(2 * this.imgBoxHeight)), {
          type: "solid",
          color: Util.rgbToHex(driver.color),
          opacity: 0.5
        });

        this.driverAnimElements[0].texture = animTexture;
        this.driverAnimElements[1].texture = animTexture;

        Logic.loadSVG(this.getDriver(index + 1), { width: _s(476), mipmap: PIXI.MIPMAP_MODES.OFF }).then((el) => {
          if (this.driverImage) {
            this.driverImage.height = el.height;
            this.driverImage.texture = el;
          }
          //console.log(el.width + " " + this.driverImage.width + " " + el.resolution + " " + el.height + " " + this.driverImage.height);
        });
      }
    }

    for (let i = 1; i < this.racerCount; i++) {
      this.driverNumberCol1[i].text = "" + driverNumber;
      const otherDriverIndex = i - 1 + (index <= i - 1 ? 1 : 0);
      this.driverNumberCol2[i].text = "" + (otherDriverIndex + 1);
      // this.driverNumberCol2[i].tint = drivers[otherDriverIndex].color;

      this.driverNumberFirstText[i].text = _t("numberSign");
      this.driverNumberSecondText[i].text = _t("numberSignTwo");

      this.driverNumberfirstLine1[i].texture = this.getPattern(driver.driverPattern, driver.color, driver.color2);
      this.driverNumberfirstLine2[i].texture = this.getPattern(drivers[otherDriverIndex].driverPattern, drivers[otherDriverIndex].color, drivers[otherDriverIndex].color2);

      const oddsCurrentDriver = Logic.getOddsForDriver(odds, index, otherDriverIndex, drivers.length);
      const afterDigitsOverwrite3 = Logic.getOddsForDriverDigits(odds, index, otherDriverIndex, drivers.length);
      if (afterDigitsOverwrite3 === null) {
        this.driverOdds[i].text = Logic.implementation.formatOdds(oddsCurrentDriver);
      } else {
        this.driverOdds[i].text = Logic.implementation.formatOdds(oddsCurrentDriver, afterDigitsOverwrite3);
      }
    }

    return true;
  }

  private static shiftXByOffset(originX: number, originY: number, targetY: number, offset: number, offsetHeight: number) {
    return originX + (originY - targetY) * (offset / offsetHeight);
  }

  private shiftXByOffset(originX: number, targetY: number) {
    return DriverPresentationDog.shiftXByOffset(originX, this.originY, targetY, this.offset, this.offsetHeight);
  }
  public onLayout() {
    this.initialX = this.container.position.x;
    this.initialY = this.container.position.y;
    this.originY = this.height / _s(1);

    const rowShiftX = this.gameType === "dog8" ? 0 : 10;

    if (this.gameType === "horse" || this.gameType === "sulky") {
      this.driverTitle.position.y = _s(-22);
      this.driverTitle.position.x = _s(136);
    } else {
      this.driverTitle.position.y = _s(this.gameType === "dog8" ? -77 : -21);
      this.driverTitle.position.x = _s(138);
    }

    this.driverName.position.x = _s(this.shiftXByOffset(42, 2));
    this.driverName.position.y = _s(this.gameType === "dog8" ? 13 : 69);

    const rowStartY = this.gameType === "dog8" ? 51 : 109;

    for (let i = 0; i < this.racerCount; i++) {
      this.driverNumberCol1[i].y = _s(rowStartY) + i * Math.ceil(_s(this.rowHeight));
      this.driverNumberCol1[i].x = _s(rowShiftX + this.shiftXByOffset(32, rowStartY + i * this.rowHeight));
      this.driverNumberCol2[i].y = _s(rowStartY) + i * Math.ceil(_s(this.rowHeight));
      this.driverNumberCol2[i].x = _s(rowShiftX + this.shiftXByOffset(80, rowStartY + i * this.rowHeight));
      if (this.gameType === "horse" || this.gameType === "sulky") {
        this.driverOdds[i].y = _s(rowStartY) + i * Math.ceil(_s(this.rowHeight));
        this.driverOdds[i].x = _s(rowShiftX + this.shiftXByOffset(184, rowStartY + i * this.rowHeight) - 3);
      } else {
        this.driverOdds[i].y = _s(rowStartY) + i * Math.ceil(_s(this.rowHeight));
        this.driverOdds[i].x = _s(rowShiftX + this.shiftXByOffset(179, rowStartY + i * this.rowHeight));
      }

      this.driverNumberFirstText[i].y = _s(rowStartY - 18) + i * Math.ceil(_s(this.rowHeight));
      this.driverNumberFirstText[i].x = _s(rowShiftX + this.shiftXByOffset(43, rowStartY + i * this.rowHeight));
      this.driverNumberSecondText[i].y = _s(rowStartY - 18) + i * Math.ceil(_s(this.rowHeight));
      this.driverNumberSecondText[i].x = _s(rowShiftX + this.shiftXByOffset(90, rowStartY + i * this.rowHeight));

      this.driverNumberfirstLine1[i].y = _s(rowStartY + 4) + i * Math.ceil(_s(this.rowHeight)) - Math.ceil(_s(this.rowHeight)) / 2;
      this.driverNumberfirstLine1[i].x = _s(rowShiftX + this.shiftXByOffset(38, rowStartY + 4 + i * this.rowHeight - this.rowHeight / 2));
      this.driverNumberfirstLine1[i].width = _s(10);
      this.driverNumberfirstLine1[i].height = _s(32);

      this.driverNumberfirstLine2[i].y = _s(rowStartY + 4) + i * Math.ceil(_s(this.rowHeight)) - Math.ceil(_s(this.rowHeight)) / 2;
      this.driverNumberfirstLine2[i].x = _s(rowShiftX + this.shiftXByOffset(84, rowStartY + 4 + i * this.rowHeight - this.rowHeight / 2));
      this.driverNumberfirstLine2[i].width = _s(10);
      this.driverNumberfirstLine2[i].height = _s(32);
    }
    if (this.useOverlays) {
      for (let i = 0; i < this.rows; i++) {
        const colorStops = DrawHelper.calculateGradientStops(DogHelper.getColorByGame(this.gameType, "#1658e5"), DogHelper.getColorByGame(this.gameType, "#082969"), i + 1, this.rows);
        this.driverOddsRow[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.rowWidth + this.skewedRow, Math.ceil(_s(this.rowHeight)), 0, this.skewedRow, [
          {
            type: "gradient",
            color: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameType, "#04172a"),
            color2: this.isDog8 ? "#1e4a3a" : DogHelper.getColorByGame(this.gameType, "#022841")
          },
          {
            type: "mixed",
            color: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameType, "#022841"),
            color2: this.isDog8 ? "#1e4a3a" : DogHelper.getColorByGame(this.gameType, "#04172a"),
            start: -0.34,
            end: 0.5,
            opacity: 0.85
          },
          {
            type: "mixed",
            verti: true,
            color: colorStops[0],
            color2: colorStops[1],
            opacity: 0.93
          },
          {
            type: "mixed",
            verti: true,
            color: this.isDog8 ? "#1e4a3a" : DogHelper.getColorByGame(this.gameType, "#022841"),
            color2: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameType, "#04172a"),
            stroke: [
              {
                verti: false,
                color: this.isDog8 ? "#7cabb2" : DogHelper.getColorByGame(this.gameType, "#029ad0"),
                color2: this.isDog8 ? "#5b7d82" : DogHelper.getColorByGame(this.gameType, "#04172a"),
                opacity: 0.43,
                width: this.seperatorLine
              }
            ],
            start: -0.34,
            end: 0.5,
            opacity: 0.84
          }
        ]);
        this.driverOddsRow[i].x = this.rowStartX + this.skewedRow * (this.rows - 1 - i) - this.skewedRow / 2;
        this.driverOddsRow[i].y = _s(this.rowStartY) + i * Math.ceil(_s(this.rowHeight));

        if (i < this.rows - 1) {
          this.driverOddsHighlightRow[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.rowWidth + this.skewedRow, Math.ceil(_s(this.rowHeight)), 0, this.skewedRow, {
            type: "mixed",
            color: this.isDog8 ? "#1e4a3a" : DogHelper.getColorByGame(this.gameType, "#1658e5"),
            color2: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameType, "#082969"),
            start: 0.2,
            end: 1.4,
            opacity: 0.93
          });
          this.driverOddsHighlightRow[i].x = this.rowStartX + this.skewedRow * (this.rows - 1 - i) - this.skewedRow / 2;
          this.driverOddsHighlightRow[i].y = _s(this.rowStartY) + i * Math.ceil(_s(this.rowHeight));
          this.driverOddsHighlightRow[i].visible = false;
        }
      }

      if (this.driverOddsBoxShadow) {
        this.driverOddsBoxShadow.texture = DrawHelper.createSkewedRoundedRectangleTexture(
          this.rowWidth + this.skewedOdds,
          Math.ceil(_s(this.rowHeight)) * (this.rows - 0.5),
          Math.ceil(_s(this.rowHeight)) * 0.5,
          this.skewedOdds,
          {
            type: "gradient",
            color: "#04172a",
            color2: "#022841",
            opacity: 0.4
          }
        );
        this.driverOddsBoxShadow.x = this.rowStartX - _s(15);
        this.driverOddsBoxShadow.y = _s(this.rowStartY) + _s(15);
      }

      if (this.driverImageBox) {
        this.driverImageBox.texture = DrawHelper.createSkewedRoundedRectangleTexture(
          this.imgBoxWidth,
          this.imgBoxHeight,
          UIHelper.getSkewedRadius(this.imgBoxHeight),
          UIHelper.getSkewedPixel(this.imgBoxHeight),
          [
            {
              type: "gradient",
              color: "#04172a",
              color2: "#022841"
            },
            {
              type: "gradient",
              verti: true,
              color: "#1658e5",
              color2: "#082969",
              opacity: 0.93
            },
            {
              type: "mixed",
              verti: true,
              color: "#022841",
              color2: "#04172a",
              start: 0,
              end: 0.33
            }
          ]
        );
        this.driverImageBox.x = _s(-20);
        this.driverImageBox.y = _s(64);
      }

      if (this.driverImageBoxShadow) {
        this.driverImageBoxShadow.texture = DrawHelper.createSkewedRoundedRectangleTexture(
          this.imgBoxWidth,
          this.imgBoxHeight,
          UIHelper.getSkewedRadius(this.imgBoxHeight),
          UIHelper.getSkewedPixel(this.imgBoxHeight),
          {
            type: "gradient",
            color: "#04172a",
            color2: "#022841",
            opacity: 0.5
          }
        );
        this.driverImageBoxShadow.x = _s(-20) + _s(15);
        this.driverImageBoxShadow.y = _s(64) + _s(15);
      }

      if (this.driverNameBox) {
        this.driverNameBox.texture = DrawHelper.createSkewedRoundedRectangleTexture(
          this.nameBoxWidth + UIHelper.getSkewedPixel(this.nameBoxHeight),
          this.nameBoxHeight,
          UIHelper.getSkewedRadius(this.nameBoxHeight),
          UIHelper.getSkewedPixel(this.nameBoxHeight),
          {
            type: "mixed",
            verti: true,
            color: this.isDog8 ? "#1e4a3a" : DogHelper.getColorByGame(this.gameType, "#1658e5"),
            color2: this.isDog8 ? "#060f0d" : DogHelper.getColorByGame(this.gameType, "#082969"),
            start: 0.2,
            end: 1.4,
            opacity: 0.93
          }
        );
        this.driverNameBox.x = _s(95);
        this.driverNameBox.y = _s(55);
      }

      if (this.driverRunnerBox) {
        this.driverRunnerBox.texture = DrawHelper.createSkewedRoundedRectangleTexture(
          this.runnerBoxWidth + UIHelper.getSkewedPixel(this.runnerBoxHeight),
          this.runnerBoxHeight,
          UIHelper.getSkewedRadius(this.runnerBoxHeight),
          UIHelper.getSkewedPixel(this.runnerBoxHeight),
          {
            type: "solid",
            color: "#e6e6e6"
          }
        );
        this.driverRunnerBox.x = _s(-20) + this.imgBoxWidth / 2;
        this.driverRunnerBox.y = _s(64) - this.imgBoxHeight / 2 - _s(2);
        this.driverRunnerBox.anchor.set(1, 1);
      }
    }
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();

    const currentAnim = !Array.isArray(this.anim) ? this.anim : Logic.getAnim(t, this.anim, this);

    if (!currentAnim) return;

    if (Array.isArray(this.anim)) {
      if (t > currentAnim.startTime + currentAnim.duration) {
        this.visible = false;
        return;
      }
    }

    this.visible = true;

    let driverIndex = Util.clamp(Math.floor((t - currentAnim.startTime) / (currentAnim.duration + currentAnim.pause)), 0, this.racerCount - 1);
    let driverAnim = {
      startTime: currentAnim.startTime + driverIndex * (currentAnim.duration + currentAnim.pause),
      duration: currentAnim.duration + (driverIndex >= this.racerCount - 1 ? currentAnim.addLast : 0)
    };
    if (Array.isArray(this.anim)) {
      driverIndex = this.anim.indexOf(currentAnim);
      //driverIndex = Util.clamp(Math.floor((t - this.anim[0].startTime) / (this.anim[0].duration + currentAnim.pause)), 0, this.racerCount - 1);
      driverAnim = currentAnim; // { startTime: currentAnim.startTime + driverIndex * (currentAnim.duration + currentAnim.pause), duration: currentAnim.duration + ((driverIndex >= this.racerCount - 1) ? currentAnim.addLast : 0)};
    } else {
      // if (driverIndex === this.racerCount -2 && this.anim.addSecondToLast)
      //   driverAnim.duration += this.anim.addSecondToLast;
      if (driverIndex >= this.racerCount - 1) driverAnim.duration += currentAnim.addLast;
    }

    const anim = Logic.getAnim(t, [driverAnim], this);
    if (!anim) return;

    if (driverIndex !== this.currentDriverIndex) {
      if (this.updateDriverTexts(driverIndex)) this.currentDriverIndex = driverIndex;
      this.alpha = 1.0;
    }

    {
      const fif = t - anim.startTime;
      const fadeOutTime = currentAnim.pause * 0.5; // TODO: nicht überall 0!
      const baseFactor = fif < anim.duration - fadeOutTime ? fif : (anim.duration - fif) / fadeOutTime;
      this.setDebugFade(baseFactor);

      if (this.useOverlays) {
        //fade in all
        AnimHelper.animateIn(fif, 0, 1, 0.7, 1.3, 1, (f1) => {
          this.container.position.x = this.initialX - ((f1 - 1) * this.initialX) / 2;
          this.container.position.y = this.initialY - (f1 - 1) * this.initialY;
          this.container.scale.x = f1;
          this.container.scale.y = f1;
        });

        //nameBar
        let start = anim.startTime + 0.25;
        let duration = 0;

        AnimHelper.animateIn(t - start, 0, duration, 0.5, 0, 1, (f1) => {
          if (this.driverNameBox) {
            this.driverNameBox.scale.x = f1;
            if (this.driverRunnerBox) this.driverRunnerBox.scale.x = f1;
          }
        });

        //driverImage
        start = anim.startTime + 0.05;
        duration = 0.7;

        AnimHelper.animateIn(t - start, 0, duration, 0.5, 1, 0, (f1) => {
          if (this.driverImage) {
            this.driverImage.position.x = _s(-36) - _s(100) * f1;
            this.driverImage.position.y = _s(84) - _s(10) * f1;
            if (this.driverImageBox) {
              this.driverImageBox.position.x = _s(-20) - _s(250) * f1;
              this.driverImageBox.position.y = _s(64) - _s(65) * f1;
            }
          }
        });
        start = anim.startTime;
        AnimHelper.animateIn(t - start, 0, duration, 0.2, 0, 1, (f1) => {
          if (this.driverImageBox) {
            if (this.driverImage) this.driverImage.alpha = f1;
            this.driverImageBox.alpha = f1;
          }
        });

        start = anim.startTime + 0.4;
        AnimHelper.animateIn(t - start, 0, duration, 0.4, 0, 1, (f1) => {
          if (this.driverOddsBoxShadow) {
            if (this.driverImageBoxShadow) this.driverImageBoxShadow.alpha = f1;
            this.driverOddsBoxShadow.alpha = f1;
          }
        });

        start = anim.startTime;
        duration = 2;
        AnimHelper.animateIn(t - start, 0, duration, 0.7, 0, 1, (f1) => {
          this.driverAnimElements[0].position.x = _s(-950) + _s(1400) * f1;
        });
        start = anim.startTime + 0.15;
        duration = 2;
        AnimHelper.animateIn(t - start, 0, duration, 0.7, 0, 1, (f1) => {
          this.driverAnimElements[1].position.x = _s(-950) + _s(1200) * f1;
        });
      }
      this.driverName.alpha = baseFactor;
      this.driverTitle.alpha = baseFactor;

      const lineOffset = 0.05;
      const rowOffset = 0.05;
      const startOffset = 0.01;

      for (let i = 0; i < this.racerCount; i++) {
        this.driverNumberCol1[i].alpha = baseFactor - (startOffset + lineOffset + i * lineOffset);
        this.driverNumberCol2[i].alpha = baseFactor - (startOffset + lineOffset + i * lineOffset + rowOffset);
        this.driverOdds[i].alpha = baseFactor - (startOffset + lineOffset + i * lineOffset + rowOffset * 2);
        this.driverNumberfirstLine1[i].alpha = 1;
        this.driverNumberfirstLine1[i].alpha = baseFactor - (startOffset + lineOffset + i * lineOffset);
        this.driverNumberfirstLine2[i].alpha = baseFactor - (startOffset + lineOffset + i * lineOffset + rowOffset);

        this.driverNumberFirstText[i].alpha = baseFactor - (startOffset + lineOffset + i * lineOffset);
        this.driverNumberSecondText[i].alpha = baseFactor - (startOffset + lineOffset + i * lineOffset + rowOffset);
      }

      if (this.useOverlays) {
        //fade in and highlight rows
        for (let i = 0; i < this.rows; i++) {
          const startTimeFadeIn = anim.startTime + i * rowOffset;
          const durationFadeIn = 0.5;
          AnimHelper.animateIn(t - startTimeFadeIn, 0, durationFadeIn, 0.5, 1, -0.5, (f1) => {
            //this.driverOddsRow[i].position.x = -this.rowWidth * f1;
            const val = f1 >= 0 ? f1 : 0;
            this.driverOddsRow[i].position.x = this.rowStartX + this.skewedRow * (this.rows - 1 - i) - this.skewedRow / 2 - (this.rowWidth + 2) * val;
          });
          if (i < this.rows - 1) {
            const timePerRow = currentAnim.duration / this.racerCount;
            const startTimeHighlight = anim.startTime + currentAnim.pause / 2 + i * timePerRow;
            this.driverOddsHighlightRow[i].visible = t >= startTimeHighlight && t <= startTimeHighlight + timePerRow;
          }
        }

        //fade out all
        if (t >= anim.startTime + anim.duration - 0.25) {
          const startT = anim.startTime + anim.duration - 0.25;
          const durationT = 0.5;
          AnimHelper.animateIn(t - startT, 0, durationT, 0.5, 1, -0.25, (f1) => {
            this.alpha = f1 >= 0 ? f1 : 0;
          });
        }
      }
    }
  }

  private getDriver(driverNumber: number): string {
    switch (driverNumber) {
      case 1:
        return String(DRIVER_1);
      case 2:
        return String(DRIVER_2);
      case 3:
        return String(DRIVER_3);
      case 4:
        return String(DRIVER_4);
      case 5:
        return String(DRIVER_5);
      case 6:
        return String(DRIVER_6);
    }
    return "";
  }
}
