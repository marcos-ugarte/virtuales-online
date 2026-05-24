import { oddsAlwaysOnRaceHistoryTimings, racingHistorySettings } from "./../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { AnimHelper } from "./../common/Anim";
import { IRoundHistory, IDriver, IAnimInterval, IGameInfo } from "client/Logic/LogicDefinitions";
import { BonusAnnotationDog } from "./BonusAnnotationDog";
import { MultiStyleText } from "./../common/MultiStyleText";
import { DrawHelper, Fill } from "../common/DrawHelper";
import { GameType, GameLength } from "common/Definitions";
import { DogHelper } from "./DogHelper";
import { UIHelper } from "client/VideoScreen/UIHelper";
import TableRow from "assets/dog/6/textures/table-row-b-seperator.svg";

class RowItem {
  public raceText: PIXI.Text;
  public raceNumber: PIXI.Text;
  public firstNumber: PIXI.Text;
  public firstNumber2: PIXI.Text;
  public secondNumber: PIXI.Text;
  public firstName: MultiStyleText;
  public firstName2: MultiStyleText;
  public secondName: MultiStyleText;
  public firstLine1: PIXI.Sprite;
  public firstLine2: PIXI.Sprite;
  public secondLine: PIXI.Sprite;
  public firstTime: PIXI.Text;
  public firstTime2: PIXI.Text;
  public secondTime: PIXI.Text;
  public quotesFirst: PIXI.Text;
  public quotesSecond: PIXI.Text;
  public bonusAnnotation: BonusAnnotationDog;

  public firstLineText: PIXI.Text; // horse first line 1st
  public secondLineFirstText: PIXI.Text; // horse second line 1st
  public secondLineSecondText: PIXI.Text; // horse 2nd

  public constructor(
    raceText: PIXI.Text,
    raceNumber: PIXI.Text,
    firstNumber: PIXI.Text,
    firstNumber2: PIXI.Text,
    secondNumber: PIXI.Text,
    firstLine1: PIXI.Sprite,
    firstLine2: PIXI.Sprite,
    secondLine: PIXI.Sprite,
    firstName: MultiStyleText,
    firstName2: MultiStyleText,
    secondName: MultiStyleText,
    firstTime: PIXI.Text,
    firstTime2: PIXI.Text,
    secondTime: PIXI.Text,
    quotesFirst: PIXI.Text,
    quotesSecond: PIXI.Text,
    bonusAnnotation: BonusAnnotationDog,
    firstLineText: PIXI.Text,
    secondLineFirstText: PIXI.Text,
    secondLineSecondText: PIXI.Text
  ) {
    this.raceText = raceText;
    this.raceNumber = raceNumber;
    this.firstNumber = firstNumber;
    this.firstNumber2 = firstNumber2;
    this.secondNumber = secondNumber;
    this.firstLine1 = firstLine1;
    this.firstLine2 = firstLine2;
    this.secondLine = secondLine;
    this.firstName = firstName;
    this.firstName2 = firstName2;
    this.secondName = secondName;
    this.firstTime = firstTime;
    this.firstTime2 = firstTime2;
    this.secondTime = secondTime;
    this.quotesFirst = quotesFirst;
    this.quotesSecond = quotesSecond;
    this.bonusAnnotation = bonusAnnotation;
    this.firstLineText = firstLineText;
    this.secondLineFirstText = secondLineFirstText;
    this.secondLineSecondText = secondLineSecondText;
  }
}

export class RacingHistoryDog extends Group {
  private dogHelper: DogHelper;
  private titleText: PIXI.Text;
  private rows: RowItem[] = [];
  private anims: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number })[] = [];
  private gameType: GameType;
  private gameLength: GameLength;
  private oddsAlwaysOn: boolean;
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
  private xOffset = 15;
  private isDog8: boolean;

  public constructor(gameInfo: IGameInfo, dogHelper: DogHelper) {
    super();

    this.gameType = gameInfo.gameType;
    this.gameLength = gameInfo.gameLength;
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.dogHelper = dogHelper;
    this.isDog8 = gameInfo.gameType === "dog8";
    this.useOverlays = gameInfo.useOverlays;
    this.showDebug(settings.debug, 0.6, "RaceHistoryDog");

    /*this.rowHeightHeader = 30;
    this.rowHeight = 39;
    this.rowWidth = 286;
    this.columnWidthHeader = 63;
    this.rowCount = 10;
    this.xOffset = 15;
    if (!oddsAlwaysOn) {
      this.rowHeightHeader = 40;
      this.rowWidth = 895;
      this.lineHeight = 45.3;
      this.lineWidthHeader = 74;
      this.cell = [1, 1, 1.95, 1.95, 1.5, 1.5, 1.6];
      this.xOffset = 0;
    }*/

    const isHorse = this.gameType === "horse" || this.gameType === "sulky";
    const key = isHorse ? "horse" : this.gameType;

    if (this.oddsAlwaysOn) {
      const { rowHeight, rowWidthSmall, rowHeightHeader, columnWidthHeader, lineWidthHeader, lineWidthTable } = racingHistorySettings[key as keyof typeof racingHistorySettings];

      this.rowHeightHeader = Math.round(_s(rowHeightHeader));
      this.rowHeight = Math.ceil(_s(rowHeight));
      this.rowWidth = Math.round(_s(rowWidthSmall));
      this.columnWidthHeader = Math.round(_s(columnWidthHeader));
      this.lineWidthHeader = Math.round(_s(lineWidthHeader));
      this.lineWidthTable = Math.round(_s(lineWidthTable));
      this.rowCount = 10;
      this.xOffset = this.gameType === "dog8" ? _s(5) : _s(15);
    } else {
      const { rowWidthBig, lineWidthHeader, lineWidthTable } = racingHistorySettings[key as keyof typeof racingHistorySettings];
      this.rowHeightHeader = Math.round(_s(37));
      this.rowWidth = Math.round(_s(rowWidthBig));
      this.rowHeight = Math.ceil(_s(41));
      this.columnWidthHeader = Math.round(_s(66));
      this.lineWidthHeader = Math.round(_s(lineWidthHeader));
      this.lineWidthTable = Math.round(_s(lineWidthTable));
      this.rowCount = 10;
      this.xOffset = 0;
    }

    if (this.useOverlays) {
      const mask = DrawHelper.createSkewedRoundedRectangleGraphics(this.xOffset, 0, this.rowWidth, this.rowHeightHeader + this.rowHeight * this.rowCount, this.rowHeightHeader, 0);
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
      this.titleText = Logic.createPixiText(dogHelper.getRacingHistoryTitleStyle(this.oddsAlwaysOn));
      this.titleText.roundPixels = true;
      this.titleText.anchor.set(0, 0.5);
      this.add(this.titleText);
    }

    const quotesStyle = dogHelper.getRacingHistoryQuotesStyle(this.oddsAlwaysOn);
    const timeStyle = dogHelper.getRacingHistoryTimeStyle();
    const raceStyle = dogHelper.getRacingHistoryRaceStyle(this.oddsAlwaysOn);
    const raceNumberStyle = dogHelper.getRacingHistoryRaceNumberStyle(this.oddsAlwaysOn);
    const numberStyle = dogHelper.getRacingHistoryNumberStyle(this.oddsAlwaysOn);

    for (let i = 0; i < 5; i++) {
      const raceText = Logic.createPixiText(raceStyle);
      raceText.anchor.set(1, 0.5);
      this.add(raceText);
      const raceNumber = Logic.createPixiText(raceNumberStyle);
      raceNumber.anchor.set(1, 0.5);
      this.add(raceNumber);
      const firstNumber = Logic.createPixiText(numberStyle);
      firstNumber.anchor.set(0.5);
      this.add(firstNumber);
      const firstNumber2 = Logic.createPixiText(numberStyle);
      firstNumber2.anchor.set(0.5);
      this.add(firstNumber2);
      const secondNumber = Logic.createPixiText(numberStyle);
      secondNumber.anchor.set(0.5);
      this.add(secondNumber);
      const firstLine1 = new PIXI.Sprite();
      const firstLine2 = new PIXI.Sprite();
      const secondLine = new PIXI.Sprite();
      const firstName = new MultiStyleText();
      const firstName2 = new MultiStyleText();
      const secondName = new MultiStyleText();

      const firstTime = Logic.createPixiText(timeStyle);
      firstTime.anchor.set(0.5);

      const firstTime2 = Logic.createPixiText(timeStyle);
      firstTime2.anchor.set(0.5);

      const secondTime = Logic.createPixiText(timeStyle);
      secondTime.anchor.set(0.5);

      if (!this.oddsAlwaysOn) {
        this.add(firstName);
        this.add(firstName2);
        this.add(secondName);
        this.add(firstTime);
        this.add(firstTime2);
        this.add(secondTime);
      }
      if (this.gameType !== "horse" && this.gameType !== "sulky") {
        this.add(firstLine1);
        this.add(firstLine2);
        this.add(secondLine);
      }

      const quotesFirst = Logic.createPixiText(quotesStyle);
      quotesFirst.anchor.set(0.5);
      this.add(quotesFirst);
      const quotesSecond = Logic.createPixiText(quotesStyle);
      quotesSecond.anchor.set(0.5);
      this.add(quotesSecond);
      const bonusAnnotation = new BonusAnnotationDog(this.oddsAlwaysOn);
      this.add(bonusAnnotation);

      const firstTextStyle = this.dogHelper.getFirstTextStyle();

      const firstLineText = Logic.createPixiText(firstTextStyle);
      const secondLineFirstText = Logic.createPixiText(firstTextStyle);
      const secondLineSecondText = Logic.createPixiText(firstTextStyle);

      if (gameInfo.gameType === "horse" || gameInfo.gameType === "sulky") {
        this.add(firstLineText);
        this.add(secondLineFirstText);
        this.add(secondLineSecondText);
      }

      const row = new RowItem(
        raceText,
        raceNumber,
        firstNumber,
        firstNumber2,
        secondNumber,
        firstLine1,
        firstLine2,
        secondLine,
        firstName,
        firstName2,
        secondName,
        firstTime,
        firstTime2,
        secondTime,
        quotesFirst,
        quotesSecond,
        bonusAnnotation,
        firstLineText,
        secondLineFirstText,
        secondLineSecondText
      );
      this.rows.push(row);
    }
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean): RacingHistoryDog["anims"] {
    if (this.oddsAlwaysOn) {
      const animArr = [
        { startTime: 21.7, duration: 18.2, fadeInFactor: 0.58, fadeOutFactor: 0.8 },
        { startTime: 84.7, duration: 18.1, fadeInFactor: 0.58, fadeOutFactor: 0.8 }
      ];
      if (!withBonus) animArr.push({ startTime: 148, duration: 12.8, fadeInFactor: 0.5, fadeOutFactor: 0.8 });
      // return animArr;
    }
    if (gameType === "horse" || gameType === "sulky") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnRaceHistoryTimings.horse[384].getAnim(withBonus);
      switch (gameLength) {
        case 384:
          return [
            { startTime: 30.5, duration: 18.0, fadeInFactor: 0.98, fadeOutFactor: 1.2 },
            withBonus ? { startTime: 123.6, duration: 22.7, fadeInFactor: 0.5, fadeOutFactor: 1.2 } : { startTime: 123.4, duration: 29.7, fadeInFactor: 0.5, fadeOutFactor: 1.2 }
          ];
        default:
          return [
            { startTime: 30.5, duration: 18.0, fadeInFactor: 0.98, fadeOutFactor: 1.2 },
            withBonus ? { startTime: 123.4, duration: 24.7, fadeInFactor: 0.5, fadeOutFactor: 1.2 } : { startTime: 123.4, duration: 29.7, fadeInFactor: 0.5, fadeOutFactor: 1.2 }
          ];
      }
    }
    if (gameType === "dog6") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnRaceHistoryTimings.dog6[gameLength as 120 | 180 | 240 | 300].getAnim(withBonus);
      switch (gameLength) {
        case 120:
          return [withBonus ? { startTime: 15.0, duration: 8.8, fadeInFactor: 0.7 } : { startTime: 15.5, duration: 13.2, fadeInFactor: 0.7 }];
        case 180:
          return [withBonus ? { startTime: 20.7, duration: 17.6 } : { startTime: 26.3, duration: 21.8, fadeInFactor: 1.2, fadeOutFactor: 1.5 }];
        case 240:
          return [
            { startTime: 30.7, duration: 17.7 },
            withBonus ? { startTime: 120.6, duration: withBonus ? 13.0 : 17.4, fadeInFactor: 0.9 } : { startTime: 120.8, duration: withBonus ? 13.0 : 17.4 }
          ];
        case 300:
          return [
            withBonus ? { startTime: 30.8, duration: 17.3 } : { startTime: 36.2, duration: 21.6, fadeInFactor: 1.2, fadeOutFactor: 1.2 },
            withBonus ? { startTime: 120.3, duration: 13.0 } : { startTime: 131.2, duration: 21.7, fadeInFactor: 1.3, fadeOutFactor: 1.2 }
          ];
        default: {
          return [
            { startTime: 30.3, duration: 15.3, fadeInFactor: 0.9 },
            { startTime: 96.1, duration: 14.6, fadeInFactor: 0.9 },
            { startTime: 148.9, duration: withBonus ? 10.5 : 15.0, fadeInFactor: 0.75 } as IAnimInterval
          ];
        }
      }
    }
    // dog8
    if (this.oddsAlwaysOn) return oddsAlwaysOnRaceHistoryTimings.dog8[gameLength as 120 | 180 | 240 | 300].getAnim(withBonus);
    switch (gameLength) {
      case 120:
        return [withBonus ? { startTime: 15.0, duration: 8.5, fadeInFactor: 0.7 } : { startTime: 15.0, duration: 13.5, fadeInFactor: 0.7 }];
      case 180:
        return [withBonus ? { startTime: 20.5, duration: 17.8, fadeInFactor: 1.1 } : { startTime: 25.7, duration: 22.1, fadeInFactor: 1.3, fadeOutFactor: 1.2 }];
      case 240:
        return [
          { startTime: 30.5, duration: 17.5 },
          { startTime: 124.5, duration: withBonus ? 13.4 : 18.8 }
        ];
      case 300:
        return [withBonus ? { startTime: 31.0, duration: 17.4 } : { startTime: 35.8, duration: 22.2 }, withBonus ? { startTime: 124.5, duration: 13.3 } : { startTime: 134.5, duration: 23.8 }];
      default: {
        return [
          { startTime: 37.8, duration: 17.4 },
          { startTime: 134.5, duration: withBonus ? 9.5 : 15.0, fadeInFactor: 0.5 }
        ];
      }
    }
  }

  public fill(history: IRoundHistory[], drivers: IDriver[], withBonus: boolean) {
    this.titleText.text = _t("raceHistory");

    if (this.oddsAlwaysOn) Logic.autoSize(this.titleText, _s(220));

    this.anims = this.createAnims(this.gameType, this.gameLength, withBonus);

    for (let i = 0; i < history.length; i++) {
      const historyItem = history[i];
      const first = historyItem.first;
      const second = historyItem.second;

      const row = this.rows[i];
      if (row === undefined) continue; // MS TODO: remove skip, is just for now
      row.raceText.text = _t("race");
      Logic.autoSize(row.raceText, _s(65));
      row.raceNumber.text = Logic.implementation.formatRound(history[i].round);

      if (this.oddsAlwaysOn) {
        Logic.autoSize(row.raceText, _s(22));
      }

      row.firstNumber.text = "" + (first.driverIndex + 1);
      row.firstNumber2.text = "" + (first.driverIndex + 1);
      row.secondNumber.text = "" + (second.driverIndex + 1);

      row.firstLineText.text = _t("numberSign");
      row.secondLineFirstText.text = _t("numberSign");
      row.secondLineSecondText.text = _t("numberSignTwo");

      const firstDriver = drivers[first.driverIndex];
      row.firstLine1.texture = DrawHelper.getCachedPattern(4, 32, 0, firstDriver.color, firstDriver.color2, firstDriver.driverPattern);
      row.secondLine.texture = DrawHelper.getCachedPattern(4, 32, 0, firstDriver.color, firstDriver.color2, firstDriver.driverPattern);
      const secondDriver = drivers[second.driverIndex];
      row.firstLine2.texture = DrawHelper.getCachedPattern(4, 32, 0, secondDriver.color, secondDriver.color2, secondDriver.driverPattern);

      row.firstName.styles = this.dogHelper.getRacingHistoryDriverStyle();
      row.firstName.anchor.set(0, 0.5);
      row.firstName.text = first.firstName.toUpperCase() + " <b>" + first.lastName.toUpperCase() + "</b>";
      row.firstName2.styles = this.dogHelper.getRacingHistoryDriverStyle();
      row.firstName2.anchor.set(0, 0.5);
      row.firstName2.text = first.firstName.toUpperCase() + " <b>" + first.lastName.toUpperCase() + "</b>";
      row.secondName.styles = this.dogHelper.getRacingHistoryDriverStyle();
      row.secondName.anchor.set(0, 0.5);
      row.secondName.text = second.firstName.toUpperCase() + " <b>" + second.lastName.toUpperCase() + "</b>";

      row.firstTime.text = historyItem.first.finishTime;
      row.firstTime2.text = historyItem.first.finishTime;
      row.secondTime.text = historyItem.second.finishTime;

      const winnerQuoteOverwrite = Logic.getWinnerDigitsOverwrite();
      if (winnerQuoteOverwrite === null) {
        row.quotesFirst.text = Logic.implementation.formatOdds(historyItem.first.quote);
      } else {
        row.quotesFirst.text = Logic.implementation.formatOdds(historyItem.first.quote, winnerQuoteOverwrite);
      }

      const forecastQuoteOverwrite = Logic.getForcastDigitsOverwrite();
      if (forecastQuoteOverwrite === null) {
        row.quotesSecond.text = Logic.implementation.formatOdds(historyItem.second.quote);
      } else {
        row.quotesSecond.text = Logic.implementation.formatOdds(historyItem.second.quote, forecastQuoteOverwrite);
      }

      row.bonusAnnotation.fill(historyItem.roundBonusType);
      row.bonusAnnotation.visible = historyItem.roundBonusType !== undefined;
    }
  }

  public onLayout() {
    const isHorse = this.gameType === "horse" || this.gameType === "sulky";
    const isDog8 = this.gameType === "dog8";
    const key = isHorse ? "horse" : this.gameType;

    this.titleText.position.x = _s(isHorse ? 80 : 92);
    this.titleText.position.y = this.rowHeightHeader / 2;

    const rowOffset = this.rowHeight;
    let rowIndex = 0;

    if (this.useOverlays) {
      for (let i = 2; i >= 0; i--) {
        let styleX: Fill = isDog8
          ? {
              type: "mixed",
              verti: true,
              color: "#060f0d",
              color2: "#0d1a11",
              start: -2.5,
              end: 0.8,
              stroke: [
                {
                  verti: false,
                  solid: true,
                  color: "#7cabb2",
                  width: this.lineWidthHeader
                }
              ]
            }
          : {
              type: "gradient",
              verti: true,
              color: "#04172a",
              color2: "#031e33",
              opacity: 0.85,
              stroke: [
                {
                  verti: false,
                  solid: true,
                  color: "#029ad0",
                  width: this.lineWidthHeader
                }
              ]
            };
        let styleY: Fill = isDog8
          ? {
              type: "mixed",
              verti: false,
              color: "#0d1a11",
              color2: "#060f0d",
              start: 0.2,
              end: 2.5,
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
              color: "#04172a",
              color2: "#031e33",
              opacity: 0.85,
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
            color: isDog8 ? "#329e69" : "#1658E5",
            color2: isDog8 ? "#004735" : "#082969",
            opacity: 0.5
          };
          styleY = {
            type: "gradient",
            color: isDog8 ? "#329e69" : "#1658E5",
            color2: isDog8 ? "#004735" : "#082969",
            opacity: 0.5
          };
        } else if (i === 2) {
          styleX = {
            type: "gradient",
            verti: true,
            color: isDog8 ? "#060f0d" : "#04172a",
            color2: isDog8 ? "#0d1a11" : "#031e33",
            opacity: 0.38
          };
          styleY = {
            type: "gradient",
            color: isDog8 ? "#060f0d" : "#04172a",
            color2: isDog8 ? "#0d1a11" : "#031e33",
            opacity: 0.38
          };
        }

        this.headerY[i].x = this.xOffset;
        this.headerY[i].y = this.rowHeightHeader;
        this.headerY[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.columnWidthHeader, this.rowCount * this.rowHeight, 0, 0, styleY);
        this.headerY[i].width = this.columnWidthHeader;
        this.headerY[i].height = this.rowCount * this.rowHeight;
        this.headerY[i].scale.y = 0;

        this.headerX[i].x = this.xOffset;
        this.headerX[i].y = 0;
        this.headerX[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.columnWidthHeader + this.rowWidth, this.rowHeightHeader, 0, 0, styleX);
        this.headerX[i].width = this.columnWidthHeader + this.rowWidth;
        this.headerX[i].height = this.rowHeightHeader;
        this.headerX[i].scale.x = 0;
      }

      for (let i = this.rowCount * 3 - 1; i >= 0; i--) {
        const colorIndex = Math.floor(i / this.rowCount);

        let style: Fill | Fill[] = {
          type: "gradient",
          verti: true,
          color: isDog8 ? "#0d1a11" : "#031f36",
          color2: isDog8 ? "#060f0d" : "#04192d",
          opacity: 0.38
        };
        if (colorIndex === 1) {
          style = {
            type: "gradient",
            verti: true,
            color: isDog8 ? "#329e69" : "#1658E5",
            color2: isDog8 ? "#004735" : "#082969",
            opacity: 0.5
          };
        } else if (colorIndex === 0) {
          if (this.oddsAlwaysOn) {
            style = isDog8
              ? [
                  {
                    type: "mixed",
                    color: "#060f0d",
                    color2: "#1f3b29",
                    start: 0.5,
                    end: 1.05,
                    opacity: 0.9
                  },
                  {
                    type: "mixed",
                    verti: true,
                    color: "#182e1f",
                    color2: "#060f0d",
                    opacity: 0.85,
                    start: 0.35,
                    end: 1,
                    stroke: [
                      {
                        verti: false,
                        color: "#5b7d82",
                        color2: "#7cabb2",
                        opacity: 0.531,
                        start: 0,
                        end: 1,
                        width: this.lineWidthTable
                      },
                      {
                        verti: true,
                        color: "#7cabb2",
                        color2: "#5b7d82",
                        width: this.lineWidthTable,
                        opacity: 0.531,
                        position: [
                          {
                            visible: i >= 2,
                            singleRow: false,
                            position: 0.01
                          },
                          {
                            visible: true,
                            singleRow: false,
                            position: 0.19
                          },
                          {
                            visible: true,
                            singleRow: false,
                            position: 0.38
                          }
                        ],
                        table: {
                          row: i,
                          count: this.rowCount
                        }
                      }
                    ]
                  }
                ]
              : {
                  type: "gradient",
                  verti: true,
                  color: "#031f36",
                  color2: "#04192d",
                  opacity: 0.85,
                  stroke: [
                    {
                      verti: false,
                      color: "#029ad0",
                      color2: "#04172a",
                      opacity: 0.59,
                      width: this.lineWidthTable
                    }
                  ]
                };
          } else {
            style = isDog8
              ? [
                  {
                    type: "mixed",
                    color: "#060f0d",
                    color2: "#1f3b29",
                    start: 0.5,
                    end: 1.05,
                    opacity: 0.9
                  },
                  {
                    type: "mixed",
                    verti: true,
                    color: "#182e1f",
                    color2: "#060f0d",
                    opacity: 0.85,
                    start: 0.35,
                    end: 1,
                    stroke: [
                      {
                        verti: false,
                        color: "#5b7d82",
                        color2: "#7cabb2",
                        opacity: 0.59,
                        width: this.lineWidthTable
                      },
                      {
                        verti: true,
                        color: "#7cabb2",
                        color2: "#5b7d82",
                        width: this.lineWidthTable,
                        opacity: 0.6,
                        position: [
                          {
                            visible: i >= 2,
                            singleRow: false,
                            position: 0.003
                          },
                          {
                            visible: true,
                            singleRow: false,
                            position: 0.083
                          },
                          {
                            visible: true,
                            singleRow: false,
                            position: 0.163
                          },
                          {
                            visible: true,
                            singleRow: false,
                            position: 0.168
                          },
                          {
                            visible: i % 2 === 1,
                            singleRow: true,
                            position: 0.333
                          },
                          {
                            visible: true,
                            singleRow: false,
                            position: 0.498
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
                  }
                ]
              : {
                  type: "gradient",
                  verti: true,
                  color: isDog8 ? "#0d1a11" : "#031f36",
                  color2: isDog8 ? "#060f0d" : "#04192d",
                  opacity: 0.85,
                  stroke: [
                    {
                      verti: false,
                      color: isDog8 ? "#7cabb2" : "#029ad0",
                      color2: isDog8 ? "#060f0d" : "#04172a",
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
                          visible: i >= 2,
                          singleRow: false,
                          position: 0.003
                        },
                        {
                          visible: true,
                          singleRow: false,
                          position: 0.083
                        },
                        {
                          visible: true,
                          singleRow: false,
                          position: 0.163
                        },
                        {
                          visible: true,
                          singleRow: false,
                          position: 0.168
                        },
                        {
                          visible: i % 2 === 1,
                          singleRow: true,
                          position: 0.333
                        },
                        {
                          visible: true,
                          singleRow: false,
                          position: 0.498
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
        }

        this.rowsX[i].x = this.xOffset + this.columnWidthHeader;
        this.rowsX[i].y = this.rowHeightHeader + (i % this.rowCount) * this.rowHeight;
        this.rowsX[i].texture = DrawHelper.createSkewedRoundedRectangleTexture(this.columnWidthHeader + this.rowWidth, this.rowHeight, 0, 0, style);

        if (i < this.rowCount) {
          this.rowsXMask[i].x = this.xOffset + this.columnWidthHeader;
          this.rowsXMask[i].y = this.rowHeightHeader + (i % this.rowCount) * this.rowHeight;
          this.rowsXMask[i].beginFill(0x555555);
          this.rowsXMask[i].drawRect(0, 0, this.columnWidthHeader + this.rowWidth, this.rowHeight);
          this.rowsXMask[i].endFill();
          this.rowsXMask[i].scale.x = 0;
        }
      }
    }

    if (this.oddsAlwaysOn) {
      const { titleText } = racingHistorySettings[key as keyof typeof racingHistorySettings];

      this.titleText.position.x = _s(titleText.x);
      this.titleText.position.y = this.rowHeightHeader / 2;
    }

    const firstRowCenterY = rowOffset / 2;

    const additionalOffset = isHorse ? 2 : 0;
    const additionalOffsetNumberX = isHorse ? 5 : 0;
    const additionalOffsetNumber2X = isHorse ? -3 : 0;

    for (const row of this.rows) {
      row.raceText.position.x = _s(50);
      row.raceText.position.y = this.rowHeightHeader + _s(10 + additionalOffset) + rowIndex * rowOffset;
      row.raceNumber.position.x = _s(50);
      row.raceNumber.position.y = this.rowHeightHeader + _s(26) + rowIndex * rowOffset;
      row.firstNumber.position.x = _s(95 + additionalOffsetNumberX);
      row.firstNumber.position.y = this.rowHeightHeader + firstRowCenterY + rowIndex * rowOffset;
      row.firstNumber2.position.x = row.firstNumber.position.x;
      row.firstNumber2.position.y = this.rowHeightHeader + firstRowCenterY + rowOffset + rowIndex * rowOffset;
      row.secondNumber.position.x = row.firstNumber.position.x + _s(73 + additionalOffsetNumber2X);
      row.secondNumber.position.y = row.firstNumber2.position.y;
      row.firstLineText.x = row.firstNumber.position.x + _s(8);
      row.firstLineText.y = this.rowHeightHeader + rowIndex * rowOffset + _s(8);
      row.secondLineFirstText.x = row.firstNumber.position.x + _s(8);
      row.secondLineFirstText.y = this.rowHeightHeader + (rowIndex + 1) * rowOffset + _s(8);
      row.secondLineSecondText.x = row.firstNumber.position.x + _s(73 + additionalOffsetNumber2X + 8);
      row.secondLineSecondText.y = this.rowHeightHeader + (rowIndex + 1) * rowOffset + _s(8);
      row.secondNumber.position.y = row.firstNumber2.position.y;
      row.firstLine1.x = _s(111);
      row.firstLine1.y = this.rowHeightHeader + _s(4) + rowIndex * rowOffset;
      row.firstLine1.width = _s(4);
      row.firstLine1.height = _s(32);
      row.firstLine2.x = _s(184);
      row.firstLine2.y = this.rowHeightHeader + _s(4) + rowOffset + rowIndex * rowOffset;
      row.firstLine2.width = _s(4);
      row.firstLine2.height = _s(32);

      row.secondLine.x = row.firstLine1.x;
      row.secondLine.y = this.rowHeightHeader + _s(4) + rowOffset + rowIndex * rowOffset;
      row.secondLine.width = _s(4);
      row.secondLine.height = _s(32);
      row.firstName.x = _s(230);
      row.firstName.y = this.rowHeightHeader + firstRowCenterY + rowIndex * rowOffset + additionalOffset;
      row.firstName2.x = row.firstName.x;
      row.firstName2.y = this.rowHeightHeader + firstRowCenterY + rowOffset + rowIndex * rowOffset + additionalOffset;
      row.secondName.x = row.firstName.x + _s(140);
      row.secondName.y = row.firstName2.y;
      row.firstTime.x = _s(544);
      row.firstTime.y = this.rowHeightHeader + firstRowCenterY + rowIndex * rowOffset + additionalOffset;
      row.firstTime2.x = row.firstTime.x;
      row.firstTime2.y = this.rowHeightHeader + firstRowCenterY + rowOffset + rowIndex * rowOffset + additionalOffset;
      row.secondTime.x = row.firstTime.x + _s(105);
      row.secondTime.y = row.firstTime2.y;
      row.quotesFirst.x = _s(761);
      row.quotesFirst.y = this.rowHeightHeader + firstRowCenterY + rowIndex * rowOffset + additionalOffset;
      row.quotesSecond.x = row.quotesFirst.x;
      row.quotesSecond.y = this.rowHeightHeader + firstRowCenterY + rowOffset + rowIndex * rowOffset + additionalOffset;
      row.bonusAnnotation.x = _s(0);
      row.bonusAnnotation.y = _s(31) + rowIndex * rowOffset;
      row.bonusAnnotation.width = _s(100);
      row.bonusAnnotation.height = _s(40);

      if (this.oddsAlwaysOn) {
        const { row: singleRow } = racingHistorySettings[key as "dog6" | "dog8" | "horse"];

        row.raceNumber.position.y = this.rowHeightHeader + _s(singleRow.raceNumber.yOffset) + rowIndex * rowOffset;
        row.raceNumber.position.x = _s(singleRow.raceNumber.x);

        row.bonusAnnotation.y = _s(singleRow.bonusAnnotation.y) + rowIndex * rowOffset;
        row.bonusAnnotation.x = _s(singleRow.bonusAnnotation.x);

        row.raceText.position.x = _s(singleRow.raceText.x);

        row.firstNumber.position.x = _s(singleRow.firstNumbers.x + additionalOffsetNumberX);
        row.firstNumber2.position.x = _s(singleRow.firstNumbers.x + additionalOffsetNumberX);

        row.secondNumber.position.x = row.firstNumber.position.x + _s(singleRow.secondNumber.x + additionalOffsetNumber2X);
        row.secondNumber.position.y = row.firstNumber2.position.y;

        row.quotesFirst.x = _s(singleRow.quotes.x);
        row.quotesSecond.x = _s(singleRow.quotes.x);

        row.quotesSecond.y = row.firstNumber2.position.y;

        row.firstLine1.x = _s(singleRow.firstLine1.x);
        row.firstLine1.y = this.rowHeightHeader + _s(singleRow.firstLine1.yOffset) + rowIndex * rowOffset;

        if (singleRow.firstLine2) {
          row.firstLine2.x = _s(singleRow.firstLine2.x);
          row.firstLine2.y = this.rowHeightHeader + _s(singleRow.firstLine2.yOffset) + rowOffset + rowIndex * rowOffset;
        }

        row.firstLineText.x = row.firstNumber.position.x + _s(singleRow.firstLineText.xOffset);
        row.firstLineText.y = this.rowHeightHeader + _s(singleRow.firstLine1.yOffset) + rowIndex * rowOffset;

        row.secondLineFirstText.x = row.firstNumber.position.x + _s(singleRow.secondLineFirstText.xOffset);
        row.secondLineFirstText.y = this.rowHeightHeader + _s(singleRow.firstLine1.yOffset) + (rowIndex + 1) * rowOffset;

        row.secondLineSecondText.x = row.firstNumber.position.x + _s(70 + additionalOffsetNumber2X + singleRow.secondLineSecondText.xOffset);
        row.secondLineSecondText.y = this.rowHeightHeader + _s(singleRow.firstLine1.yOffset) + (rowIndex + 1) * rowOffset;

        row.secondLine.x = row.firstLine1.x;
        row.secondLine.y = this.rowHeightHeader + _s(+singleRow.secondLine.yOffset) + rowOffset + rowIndex * rowOffset;

        row.firstLine1.width = _s(singleRow.allLines.width);
        row.firstLine1.height = _s(singleRow.allLines.height);
        row.firstLine2.width = _s(singleRow.allLines.width);
        row.firstLine2.height = _s(singleRow.allLines.height);
        row.secondLine.width = _s(singleRow.allLines.width);
        row.secondLine.height = _s(singleRow.allLines.height);
      }
      rowIndex += 2;
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

    if (baseFactor >= anim.duration - 1.0) {
      baseFactor = 1.0 - (baseFactor - anim.duration);
      this.setDebugFade(AnimHelper.clamp(baseFactor));
      this.titleText.alpha = (baseFactor - 0.2) * 2;

      const sf = anim.fadeOutFactor ? anim.fadeOutFactor : 1.0;
      const ff = (row: number, subRow: number, col: number) => {
        return (baseFactor - (row * 2 + subRow) * 0.08 * sf - col * 0.05 * sf) * 3;
      };

      if (this.useOverlays) {
        for (let i = 2; i >= 0; i--) {
          const startTimeX = anim.startTime + anim.duration + 0.55 - 0.1 * (2 - i);
          const durationX = 0.35;
          AnimHelper.animateIn(time - startTimeX, 0, durationX, 1.4, 1, 0, (x) => {
            this.headerX[i].scale.x = x;
          });

          const startTimeY = anim.startTime + anim.duration + 0.75 - 0.15 * (2 - i);
          const durationY = 0.5;
          AnimHelper.animateIn(time - startTimeY, 0, durationY, 0.85, 1, 0, (y) => {
            this.headerY[i].scale.y = y;
          });
        }

        for (let i = this.rowCount * 3 - 1; i >= 0; i--) {
          const layer = Math.floor(i / this.rowCount);
          const startTime = anim.startTime + anim.duration + 0.85 - 0.1 * (2 - layer) - 0.06 * (i % this.rowCount);
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

      let rowIndex = 0;
      for (const row of this.rows) {
        row.raceText.alpha = ff(rowIndex, 0, 0);
        row.raceNumber.alpha = ff(rowIndex, 0, 0);
        row.bonusAnnotation.alpha = ff(rowIndex, 1, 0);

        row.firstNumber.alpha = ff(rowIndex, 0, 1);
        row.firstLine1.alpha = ff(rowIndex, 0, 1);
        row.firstLineText.alpha = ff(rowIndex, 0, 1);

        row.firstNumber2.alpha = ff(rowIndex, 0, 1);
        row.firstLine2.alpha = ff(rowIndex, 1, 1);
        row.secondLine.alpha = ff(rowIndex, 1, 2);
        row.secondLineFirstText.alpha = ff(rowIndex, 0, 1);
        row.secondNumber.alpha = ff(rowIndex, 1, 2);
        row.secondLineSecondText.alpha = ff(rowIndex, 1, 2);

        row.firstName.alpha = ff(rowIndex, 0, 3);
        row.firstName2.alpha = ff(rowIndex, 1, 3);
        row.secondName.alpha = ff(rowIndex, 1, 4);

        row.firstTime.alpha = ff(rowIndex, 0, 5);
        row.firstTime2.alpha = ff(rowIndex, 1, 5);
        row.secondTime.alpha = ff(rowIndex, 1, 6);
        row.quotesFirst.alpha = ff(rowIndex, 0, 7);
        row.quotesSecond.alpha = ff(rowIndex, 1, 7);
        rowIndex++;
      }
    } else {
      // fadeIn
      this.setDebugFade(AnimHelper.clamp(baseFactor));
      this.titleText.alpha = baseFactor - 0.3;

      const sf = anim.fadeInFactor ? anim.fadeInFactor : 1.0;
      const ff = (row: number, subRow: number, col: number) => {
        return (baseFactor - 0.54 - (row * 2 + subRow) * 0.14 * sf - col * 0.06 * sf) * 3;
      };

      if (this.useOverlays) {
        for (let i = 2; i >= 0; i--) {
          const startTimeX = anim.startTime + 0.1 * (2 - i);
          const durationX = 0.2;
          AnimHelper.animateIn(time - startTimeX, 0, durationX, 1.4, 0, 1, (x) => {
            this.headerX[i].scale.x = x;
            //if (i === 2) this.lines[0].scale.x = x;
          });

          const startTimeY = anim.startTime + 0.3 + 0.15 * (2 - i);
          const durationY = 0.8;
          AnimHelper.animateIn(time - startTimeY, 0, durationY, 0.6, 0, 1, (y) => {
            this.headerY[i].scale.y = y;
            //if (i === 2) this.lines[1].scale.y = y;
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

      let rowIndex = 0;
      for (const row of this.rows) {
        row.raceText.alpha = ff(rowIndex, 0, 0);
        row.raceNumber.alpha = ff(rowIndex, 0, 0);
        row.bonusAnnotation.alpha = ff(rowIndex, 1, 0);

        row.firstNumber.alpha = ff(rowIndex, 0, 1);
        row.firstLine1.alpha = ff(rowIndex, 0, 1);
        row.firstLineText.alpha = ff(rowIndex, 0, 1);

        row.firstNumber2.alpha = ff(rowIndex, 0, 1);
        row.firstLine2.alpha = ff(rowIndex, 1, 1);
        row.secondLine.alpha = ff(rowIndex, 1, 2);
        row.secondLineFirstText.alpha = ff(rowIndex, 0, 1);
        row.secondNumber.alpha = ff(rowIndex, 1, 2);
        row.secondLineSecondText.alpha = ff(rowIndex, 1, 2);

        row.firstName.alpha = ff(rowIndex, 0, 3);
        row.firstName2.alpha = ff(rowIndex, 1, 3);
        row.secondName.alpha = ff(rowIndex, 1, 4);

        row.firstTime.alpha = ff(rowIndex, 0, 5);
        row.firstTime2.alpha = ff(rowIndex, 1, 5);
        row.secondTime.alpha = ff(rowIndex, 1, 6);
        row.quotesFirst.alpha = ff(rowIndex, 0, 7);
        row.quotesSecond.alpha = ff(rowIndex, 1, 7);
        rowIndex++;
      }
    }
  }
}
