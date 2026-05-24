import { oddsAlwaysOnRaceHistoryTimings, racingHistorySettings } from "./../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { DynamicGeometry, DynamicMeshRect } from "client/Graphics/DynamicMesh";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { AnimHelper } from "./../common/Anim";
import { IRoundHistory, IDriver, IAnimInterval } from "client/Logic/LogicDefinitions";
import { BonusAnnotationKart } from "./BonusAnnotationKart";
import { MultiStyleText } from "./../common/MultiStyleText";
import { GameLength } from "common/Definitions";
import { Color } from "common/Color";

class RowItem {
  public raceText: PIXI.Text;
  public raceNumber: PIXI.Text;
  public firstNumber: PIXI.Text;
  public firstNumber2: PIXI.Text;
  public secondNumber: PIXI.Text;
  public firstName: MultiStyleText;
  public firstName2: MultiStyleText;
  public secondName: MultiStyleText;
  public firstLine: DynamicMeshRect;
  public secondLine: DynamicMeshRect;
  public firstTime: PIXI.Text;
  public firstTime2: PIXI.Text;
  public secondTime: PIXI.Text;
  public quotesFirst: PIXI.Text;
  public quotesSecond: PIXI.Text;
  public bonusAnnotation: BonusAnnotationKart;

  public constructor(
    raceText: PIXI.Text,
    raceNumber: PIXI.Text,
    firstNumber: PIXI.Text,
    firstNumber2: PIXI.Text,
    secondNumber: PIXI.Text,
    firstLine: DynamicMeshRect,
    secondLine: DynamicMeshRect,
    firstName: MultiStyleText,
    firstName2: MultiStyleText,
    secondName: MultiStyleText,
    firstTime: PIXI.Text,
    firstTime2: PIXI.Text,
    secondTime: PIXI.Text,
    quotesFirst: PIXI.Text,
    quotesSecond: PIXI.Text,
    bonusAnnotation: BonusAnnotationKart
  ) {
    this.raceText = raceText;
    this.raceNumber = raceNumber;
    this.firstNumber = firstNumber;
    this.firstNumber2 = firstNumber2;
    this.secondNumber = secondNumber;
    this.firstLine = firstLine;
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
  }
}

type Anim = IAnimInterval & { speedFactor?: number };

export class RacingHistoryKart extends Group {
  private titleText: PIXI.Text;
  private rows: RowItem[] = [];
  private anims: Anim[] = [];
  private gameLength: GameLength;
  private oddsAlwaysOn;

  public constructor(racerCount: number, gameLength: GameLength, oddsAlwaysOn = false) {
    super();

    this.gameLength = gameLength;
    this.oddsAlwaysOn = oddsAlwaysOn;

    const dg = new DynamicGeometry("Pos2Color", 100, 150);
    this.add(dg);
    this.showDebug(settings.debug, undefined, "RacingHistoryKart");

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(20),
        fill: "white",
        align: "center",
        fontStyle: "italic"
      });
      if (oddsAlwaysOn) {
        style.fontSize = _s(17);
        style.letterSpacing = _s(0.95);
      }
      this.titleText = Logic.createPixiText(style);
      this.titleText.roundPixels = true;
      this.add(this.titleText);
    }

    const quotesStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Heavy",
      fontSize: _s(20),
      fill: "white",
      align: "center"
    });

    const timeStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(15),
      fill: "#CCC",
      align: "center"
    });

    const raceStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Heavy",
      fontSize: _s(16),
      fill: "white",
      align: "center"
    });

    const raceNumberStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(16),
      fill: "white",
      align: "center"
    });

    const numberStyle = new PIXI.TextStyle({
      fontFamily: "DIN-HeavyItalic",
      fontSize: _s(30),
      fill: "white",
      align: "center",
      fontStyle: "italic"
    });

    if (oddsAlwaysOn) {
      numberStyle.fontSize = _s(26);
    }

    for (let i = 0; i < racerCount; i++) {
      const raceText = Logic.createPixiText(raceStyle);
      raceText.anchor.set(0.5, 0);
      this.add(raceText);
      const raceNumber = Logic.createPixiText(raceNumberStyle);
      raceNumber.anchor.set(0.5, 0);
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
      const firstLine = new DynamicMeshRect();
      dg.add(firstLine);
      const secondLine = new DynamicMeshRect();
      dg.add(secondLine);
      const firstName = new MultiStyleText();
      const firstName2 = new MultiStyleText();
      const secondName = new MultiStyleText();
      const firstTime = Logic.createPixiText(timeStyle);
      firstTime.anchor.set(0.5);
      const firstTime2 = Logic.createPixiText(timeStyle);
      firstTime2.anchor.set(0.5);
      const secondTime = Logic.createPixiText(timeStyle);
      secondTime.anchor.set(0.5);
      const quotesFirst = Logic.createPixiText(quotesStyle);
      quotesFirst.anchor.set(0.5);
      this.add(quotesFirst);
      const quotesSecond = Logic.createPixiText(quotesStyle);
      quotesSecond.anchor.set(0.5);
      this.add(quotesSecond);
      const bonusAnnotation = new BonusAnnotationKart("RaceHistory");
      this.add(bonusAnnotation);

      if (!this.oddsAlwaysOn) {
        this.add(firstName);
        this.add(firstName2);
        this.add(firstTime);
        this.add(secondTime);
        this.add(firstTime2);
        this.add(secondName);
      }

      const row = new RowItem(
        raceText,
        raceNumber,
        firstNumber,
        firstNumber2,
        secondNumber,
        firstLine,
        secondLine,
        firstName,
        firstName2,
        secondName,
        firstTime,
        firstTime2,
        secondTime,
        quotesFirst,
        quotesSecond,
        bonusAnnotation
      );
      this.rows.push(row);
    }
  }

  private createAnims(gameLength: GameLength, withBonus: boolean): Anim[] {
    switch (gameLength) {
      case 120:
        if (this.oddsAlwaysOn) return oddsAlwaysOnRaceHistoryTimings.kart[120];
        return [withBonus ? { startTime: 15.2, duration: 7.2, speedFactor: 0.8 } : { startTime: 15.2, duration: 12.2, speedFactor: 0.8 }];
      case 180:
        return [withBonus ? { startTime: 20.4, duration: 17.5 } : { startTime: 24.9, duration: 22.4, speedFactor: 0.7 }];
      case 240:
        if (this.oddsAlwaysOn) return oddsAlwaysOnRaceHistoryTimings.kart[240].getAnim(withBonus);
        return [
          { startTime: 30.2, duration: 17.5 },
          { startTime: 120.3, duration: withBonus ? 12.5 : 17.5 }
        ];
      case 300:
        if (this.oddsAlwaysOn) return oddsAlwaysOnRaceHistoryTimings.kart[300];
        return [
          withBonus ? { startTime: 30.2, duration: 17.1 } : { startTime: 34.0, duration: 22.3, speedFactor: 0.5 },
          withBonus ? { startTime: 119.9, duration: 12.9 } : { startTime: 129.5, duration: 23.1, speedFactor: 0.8 },
          ...(withBonus ? [] : []) // { startTime: 150.5, duration: 10.5, speedFactor: 0.5 }
        ];
    }
    return [];
  }

  public fill(history: IRoundHistory[], drivers: IDriver[], withBonus: boolean) {
    this.titleText.text = _t("racingHis");

    this.anims = this.createAnims(this.gameLength, withBonus);

    for (let i = 0; i < history.length; i++) {
      const historyItem = history[i];
      const first = historyItem.first;
      const second = historyItem.second;

      const row = this.rows[i];
      row.raceText.text = _t("raceMotor");
      Logic.autoSize(row.raceText, _s(65));
      row.raceNumber.text = Logic.implementation.formatRound(history[i].round);

      row.firstNumber.text = "" + (first.driverIndex + 1);
      row.firstNumber.tint = Color.ARGBtoHex(drivers[first.driverIndex].color);
      row.firstNumber2.text = "" + (first.driverIndex + 1);
      row.firstNumber2.tint = Color.ARGBtoHex(drivers[first.driverIndex].color);
      row.secondNumber.tint = Color.ARGBtoHex(drivers[second.driverIndex].color);
      row.secondNumber.text = "" + (second.driverIndex + 1);

      row.firstLine.color = drivers[first.driverIndex].color;
      row.secondLine.color = drivers[second.driverIndex].color;

      const driverNameSize = _s(16);
      row.firstName.styles = {
        default: {
          fontFamily: "DIN-UltraLight",
          fill: "white",
          fontSize: driverNameSize,
          valign: "middle",
          letterSpacing: _s(1),
          maxLines: 1,
          wordWrap: true,
          wordWrapWidth: _s(300)
        },
        b: {
          fontFamily: "DIN-Medium",
          fill: "white",
          fontSize: driverNameSize,
          valign: "middle",
          letterSpacing: _s(1)
        }
      };
      row.firstName.anchor.set(0, 0.5);
      row.firstName.text = first.firstName.toUpperCase() + " <b>" + first.lastName.toUpperCase() + "</b>";
      row.firstName2.styles = {
        default: {
          fontFamily: "DIN-UltraLight",
          fill: "white",
          fontSize: driverNameSize,
          valign: "middle",
          letterSpacing: _s(1),
          maxLines: 1,
          wordWrap: true,
          wordWrapWidth: _s(150)
        },
        b: {
          fontFamily: "DIN-Medium",
          fill: "white",
          fontSize: driverNameSize,
          valign: "middle",
          letterSpacing: _s(1)
        }
      };
      row.firstName2.anchor.set(0, 0.5);
      row.firstName2.text = first.firstName.toUpperCase() + " <b>" + first.lastName.toUpperCase() + "</b>";
      row.secondName.styles = {
        default: {
          fontFamily: "DIN-UltraLight",
          fill: "white",
          fontSize: driverNameSize,
          valign: "middle",
          letterSpacing: _s(1),
          maxLines: 1,
          wordWrap: true,
          wordWrapWidth: _s(150)
        },
        b: {
          fontFamily: "DIN-Medium",
          fill: "white",
          fontSize: driverNameSize,
          valign: "middle",
          letterSpacing: _s(1)
        }
      };
      row.secondName.anchor.set(0, 0.5);
      row.secondName.text = second.firstName.toUpperCase() + " <b>" + second.lastName.toUpperCase() + "</b>";

      row.firstTime.text = historyItem.first.finishTime;
      row.firstTime2.text = historyItem.first.finishTime;
      row.secondTime.text = historyItem.second.finishTime;

      const overwriteWinnerDigits = Logic.getWinnerDigitsOverwrite();
      if (overwriteWinnerDigits === null) {
        row.quotesFirst.text = Logic.implementation.formatOdds(historyItem.first.quote);
      } else {
        row.quotesFirst.text = Logic.implementation.formatOdds(historyItem.first.quote, overwriteWinnerDigits);
      }

      const overwriteForcastDigits = Logic.getForcastDigitsOverwrite();
      if (overwriteForcastDigits === null) {
        row.quotesSecond.text = Logic.implementation.formatOdds(historyItem.second.quote);
      } else {
        row.quotesSecond.text = Logic.implementation.formatOdds(historyItem.second.quote, overwriteForcastDigits);
      }

      row.bonusAnnotation.fill(historyItem.roundBonusType);
      row.bonusAnnotation.visible = historyItem.roundBonusType !== undefined;
    }
  }

  public onLayout() {
    this.titleText.position.x = _s(115);
    this.titleText.position.y = _s(8);
    let rowOffset = 80;

    if (this.oddsAlwaysOn) {
      const { titleText, rowOffset: rowOff } = racingHistorySettings.kart5;

      this.titleText.position.x = _s(titleText.x);
      this.titleText.position.y = _s(titleText.y);
      rowOffset = rowOff;
    }
    let rowIndex = 0;
    for (const row of this.rows) {
      row.raceText.position.x = _s(46);
      row.raceText.position.y = _s(54 + rowIndex * rowOffset);
      row.raceNumber.position.x = _s(46);
      row.raceNumber.position.y = _s(74 + rowIndex * rowOffset);
      row.firstNumber.position.x = _s(115);
      row.firstNumber.position.y = _s(49 + rowIndex * rowOffset);
      row.firstNumber2.position.x = row.firstNumber.position.x;
      row.firstNumber2.position.y = _s(91 + rowIndex * rowOffset);
      row.secondNumber.position.x = row.firstNumber.position.x + _s(54);
      row.secondNumber.position.y = row.firstNumber2.position.y;
      row.firstLine.y = _s(31 + rowIndex * rowOffset);
      row.firstLine.width = _s(4);
      row.firstLine.height = _s(rowOffset);
      row.secondLine.y = _s(71 + rowIndex * rowOffset);
      row.secondLine.width = _s(4);
      row.secondLine.height = _s(rowOffset * 0.5);
      row.firstName.x = _s(205);
      row.firstName.y = _s(50 + rowIndex * rowOffset);
      row.firstName2.x = row.firstName.x;
      row.firstName2.y = _s(90 + rowIndex * rowOffset);
      row.secondName.x = row.firstName.x + _s(208);
      row.secondName.y = row.firstName2.y;
      row.firstTime.x = _s(650);
      row.firstTime.y = _s(49 + rowIndex * rowOffset);
      row.firstTime2.x = row.firstTime.x;
      row.firstTime2.y = _s(91 + rowIndex * rowOffset);
      row.secondTime.x = row.firstTime.x + _s(98);
      row.secondTime.y = row.firstTime2.y;
      row.quotesFirst.x = _s(840);
      row.quotesFirst.y = _s(49 + rowIndex * rowOffset);
      row.quotesSecond.x = row.quotesFirst.x;
      row.quotesSecond.y = _s(89 + rowIndex * rowOffset);
      row.bonusAnnotation.x = _s(0);
      row.bonusAnnotation.y = _s(31 + rowIndex * rowOffset);
      row.bonusAnnotation.width = _s(100);
      row.bonusAnnotation.height = _s(40);

      if (this.oddsAlwaysOn) {
        const { row: singleRow } = racingHistorySettings.kart5;

        row.raceNumber.position.y = _s(80 + singleRow.raceNumber.yOffset + rowIndex * rowOffset);
        row.raceNumber.position.x = _s(singleRow.raceNumber.x);

        row.bonusAnnotation.y = _s(singleRow.bonusAnnotation.y + rowIndex * rowOffset);
        row.bonusAnnotation.x = _s(singleRow.bonusAnnotation.x);

        row.raceText.position.x = _s(singleRow.raceText.x);
        row.raceText.position.y = _s(singleRow.raceText.y + rowIndex * rowOffset);

        row.firstNumber.position.x = _s(singleRow.firstNumbers.x);
        row.firstNumber.position.y = _s(singleRow.firstNumbers.y + rowIndex * rowOffset);
        row.firstNumber2.position.x = _s(singleRow.firstNumbers.x);

        row.firstNumber2.position.y = _s(85.5 + rowIndex * rowOffset);
        row.secondNumber.position.y = row.firstNumber2.position.y;

        row.secondNumber.position.x = row.firstNumber.position.x + _s(singleRow.secondNumber.x);
        row.secondNumber.position.y = row.firstNumber2.position.y;

        row.quotesFirst.x = _s(singleRow.quotes.x);
        row.quotesSecond.x = _s(singleRow.quotes.x);
        row.quotesFirst.y = _s(singleRow.quotes.firstY + rowIndex * rowOffset);
        row.quotesSecond.y = _s(singleRow.quotes.secondY + rowIndex * rowOffset);

        row.firstLine.y = _s(0 + singleRow.firstLine1.yOffset + rowIndex * rowOffset);
        row.secondLine.y = _s(50 + singleRow.secondLine.yOffset + rowOffset / 2 + rowIndex * rowOffset);
        row.secondLine.x = _s(70);

        row.firstLine.width = _s(singleRow.allLines.width);
        row.firstLine.height = _s(singleRow.firstLine1.height);

        row.secondLine.width = _s(singleRow.allLines.width);
        row.secondLine.height = _s(singleRow.secondLine.height);
      }

      rowIndex++;
    }
  }

  public update(dt: number) {
    super.update(dt);

    const time = Logic.getVideoTime();
    const anim = Logic.getAnim(time, this.anims, this);
    if (!anim) return;
    const { row: singleRow } = racingHistorySettings.kart5;
    const speedFactor = anim.speedFactor ? anim.speedFactor : 1;
    let baseFactor = time - anim.startTime;
    if (baseFactor >= anim.duration) {
      baseFactor = 1.0 - (baseFactor - anim.duration) * speedFactor;
      this.setDebugFade(AnimHelper.clamp(baseFactor));
      this.titleText.alpha = (baseFactor + 0.2) * 2;

      let rowIndex = 0;
      for (const row of this.rows) {
        const rowFactor = baseFactor + rowIndex * 0.1;
        const firstLineFactor = AnimHelper.clamp(rowFactor * 2);
        const secondLineFactor = AnimHelper.clamp((rowFactor + 0.1) * 2);

        if (this.oddsAlwaysOn) {
          row.firstLine.x = _s(singleRow.firstLine1.x - (1.0 - firstLineFactor) * 100);
          row.secondLine.x = _s(singleRow.secondLine.x - (1.0 - secondLineFactor) * 100);
        } else {
          row.firstLine.x = _s(86 - (1.0 - firstLineFactor) * 100);
          row.secondLine.x = _s(139 - (1.0 - secondLineFactor) * 100);
        }

        row.firstLine.alpha = firstLineFactor;
        row.secondLine.alpha = firstLineFactor;
        const numberFactor = AnimHelper.clamp((rowFactor + 0.0) * 2);
        row.firstNumber.alpha = numberFactor;
        row.firstNumber2.alpha = numberFactor;
        row.secondNumber.alpha = numberFactor;
        const textFactor1 = AnimHelper.clamp((rowFactor + 0.0) * 2);
        const textFactor2 = AnimHelper.clamp((rowFactor + 0.0) * 2);
        row.firstName.alpha = textFactor1;
        row.firstName2.alpha = textFactor2;
        row.secondName.alpha = textFactor2;
        row.firstTime.alpha = textFactor1;
        row.firstTime2.alpha = textFactor2;
        row.secondTime.alpha = textFactor2;
        row.quotesFirst.alpha = textFactor1;
        row.quotesSecond.alpha = textFactor2;
        const raceNumberFactor = AnimHelper.clamp((rowFactor + 0.2) * 2);
        row.raceText.alpha = raceNumberFactor;
        row.raceNumber.alpha = raceNumberFactor;
        row.bonusAnnotation.alpha = textFactor1;
        row.bonusAnnotation.x = _s(-10 + textFactor1 * 10);
        rowIndex++;
      }
    } else {
      baseFactor = baseFactor * speedFactor;
      this.setDebugFade(AnimHelper.clamp(baseFactor));
      this.titleText.alpha = baseFactor - 0.2;

      let rowIndex = 0;
      for (const row of this.rows) {
        const rowFactor = baseFactor - (0.38 + rowIndex * 0.1);
        const firstLineFactor = AnimHelper.clamp(rowFactor * 2);
        const secondLineFactor = AnimHelper.clamp((rowFactor - 0.2) * 2);

        if (this.oddsAlwaysOn) {
          row.firstLine.x = _s(singleRow.firstLine1.x - (1.0 - firstLineFactor) * 100);
          row.secondLine.x = _s(singleRow.secondLine.x - (1.0 - secondLineFactor) * 100);
        } else {
          row.firstLine.x = _s(86 - (1.0 - firstLineFactor) * 100);
          row.secondLine.x = _s(139 - (1.0 - secondLineFactor) * 100);
        }

        row.firstLine.alpha = firstLineFactor;
        row.secondLine.alpha = firstLineFactor;
        const numberFactor = AnimHelper.clamp((rowFactor - 0.6) * 2);
        row.firstNumber.alpha = numberFactor;
        row.firstNumber2.alpha = numberFactor;
        row.secondNumber.alpha = numberFactor;
        const textFactor1 = AnimHelper.clamp((rowFactor - 0.3) * 2);
        const textFactor2 = AnimHelper.clamp((rowFactor - 0.35) * 2);
        row.firstName.alpha = textFactor1;
        row.firstName2.alpha = textFactor2;
        row.secondName.alpha = textFactor2;
        row.firstTime.alpha = textFactor1;
        row.firstTime2.alpha = textFactor2;
        row.secondTime.alpha = textFactor2;
        row.quotesFirst.alpha = textFactor1;
        row.quotesSecond.alpha = textFactor2;
        const raceNumberFactor = AnimHelper.clamp((rowFactor - 0.2) * 2);
        row.raceText.alpha = raceNumberFactor;
        row.raceNumber.alpha = raceNumberFactor;
        row.bonusAnnotation.alpha = textFactor1;
        row.bonusAnnotation.x = _s(-20 + textFactor1 * 20);
        rowIndex++;
      }
    }
  }
}
