import { BonusHistorySettings, oddsAlwaysOnBonusHistoryTimings } from "./../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { AnimHelper } from "./../common/Anim";
import { IAnimInterval, IJackpotHistory } from "client/Logic/LogicDefinitions";
import { GameLength } from "common/Definitions";

let rowOffset = 40;
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

type Anim = IAnimInterval & { speedFactor?: number };

export class BonusHistoryKart extends Group {
  private titleText: PIXI.Text;
  private rows: RowItem[] = [];
  private anims: Anim[] = [];
  private gameLength: GameLength;
  private oddsAlwaysOn: boolean;

  public constructor(gameLength: GameLength, oddsAlwaysOn = false) {
    super();

    this.oddsAlwaysOn = oddsAlwaysOn;
    this.gameLength = gameLength;

    this.showDebug(settings.debug);

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(19),
        fill: "white",
        align: "center",
        fontStyle: "italic"
      });

      if (this.oddsAlwaysOn) {
        style.fontSize = _s(13);
        style.letterSpacing = _s(0.6);
      }
      this.titleText = Logic.createPixiText(style);
      this.titleText.anchor.set(0, 0.5);
      this.titleText.roundPixels = true;
      this.add(this.titleText);
    }

    const idStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(16),
      letterSpacing: _s(1),
      fill: "white",
      align: "center"
    });

    const timeStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Light",
      fontSize: _s(15),
      fill: "#AAA",
      align: "center"
    });

    const dateStyle = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLight",
      fontSize: _s(16),
      fill: "#AAA",
      align: "center"
    });

    const nameStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Light",
      fontSize: _s(17),
      fill: "#EEE",
      align: "center"
    });

    const amountStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Light",
      fontSize: _s(17),
      fill: "#FFF",
      align: "right"
    });

    const raceStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(13),
      fill: "#888",
      align: "center"
    });

    const raceNumberStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(12.5),
      letterSpacing: _s(1),
      fill: "white",
      align: "center"
    });

    if (this.oddsAlwaysOn) {
      dateStyle.fontSize = _s(12);
      raceStyle.fontSize = _s(14);
      raceNumberStyle.fontSize = _s(14);
      raceNumberStyle.fontFamily = "DIN-Bold";
      amountStyle.fontFamily = "DIN-Bold";
      idStyle.fontFamily = "DIN-Bold";
      idStyle.letterSpacing = _s(0.1);
      amountStyle.fontSize = _s(12);
      idStyle.fontSize = _s(12);
      nameStyle.fontSize = _s(11);
      nameStyle.fontFamily = "DIN-Regular";
      nameStyle.letterSpacing = _s(0.6);
      timeStyle.fontSize = _s(12);
    }

    for (let i = 0; i < rowCount; i++) {
      const raceText = Logic.createPixiText(raceStyle);
      raceText.anchor.set(0.5, 0);
      this.add(raceText);
      const raceNumber = Logic.createPixiText(raceNumberStyle);
      raceNumber.anchor.set(0.5, 0);
      this.add(raceNumber);
      const idText = Logic.createPixiText(idStyle);
      idText.anchor.set(0.5, 0.5);
      this.add(idText);
      const timeText = Logic.createPixiText(timeStyle);
      timeText.anchor.set(0.5, 0.5);
      this.add(timeText);
      const dateText = Logic.createPixiText(dateStyle);
      dateText.anchor.set(0.5, 0.5);
      this.add(dateText);
      const nameText = Logic.createPixiText(nameStyle);
      nameText.anchor.set(0.5, 0.5);
      this.add(nameText);
      const amountText = Logic.createPixiText(amountStyle);
      amountText.anchor.set(1.0, 0.5);
      this.add(amountText);
      const row = new RowItem(raceText, raceNumber, idText, dateText, timeText, nameText, amountText);
      this.rows.push(row);
    }
  }

  public fill(history: IJackpotHistory[], withBonus: boolean) {
    this.titleText.text = _t("bonusHistory");

    for (let i = 0; i < history.length; i++) {
      const item = history[i];

      const row = this.rows[i];
      row.raceText.text = _t("raceMotor").toUpperCase();
      Logic.autoSize(row.raceText, _s(65));
      row.raceNumber.text = Logic.implementation.formatRound(item.round);
      row.idText.text = item.id;
      row.dateText.text = item.date;
      row.timeText.text = item.time;
      row.nameText.text = item.name;
      if (this.oddsAlwaysOn) Logic.autoSize(row.nameText, _s(95));
      row.amountText.text = item.amount;
    }

    this.anims = this.createAnims(this.gameLength, withBonus);
  }

  private createAnims(gameLength: GameLength, withBonus: boolean): Anim[] {
    if (!withBonus) return [];
    if (this.oddsAlwaysOn) return oddsAlwaysOnBonusHistoryTimings.kart[gameLength as 120 | 240];
    switch (gameLength) {
      case 120:
        return [{ startTime: 25.9, duration: 7.7, speedFactor: 1.2 }];
      case 180:
        return [{ startTime: 80.8, duration: 7.7, speedFactor: 1.0 }];
      case 240:
        return [{ startTime: 135.8, duration: 12.7 }];
      case 300:
        return [{ startTime: 135.4, duration: 18.2, speedFactor: 0.6 }];
    }
    return [];
  }

  public onLayout() {
    if (this.oddsAlwaysOn) return this.createSmallGrid();
    this.titleText.position.x = _s(110);
    this.titleText.position.y = _s(14);

    let rowIndex = 0;
    for (const row of this.rows) {
      row.raceText.position.x = _s(46);
      row.raceText.position.y = _s(32 + rowIndex * rowOffset);
      row.raceNumber.position.x = _s(46);
      row.raceNumber.position.y = _s(47 + rowIndex * rowOffset);
      row.idText.position.x = _s(177);
      row.idText.position.y = _s(47 + rowIndex * rowOffset);
      row.dateText.position.x = _s(345);
      row.dateText.position.y = row.idText.position.y;
      row.timeText.position.x = _s(470);
      row.timeText.position.y = row.idText.position.y;
      row.nameText.position.x = _s(650);
      row.nameText.position.y = row.idText.position.y;
      row.amountText.position.x = _s(865);
      row.amountText.position.y = row.idText.position.y;

      // matchMedia,es toString,es üpomts

      rowIndex++;
    }
  }

  private createSmallGrid() {
    const { x, y } = BonusHistorySettings.kart5.title;
    rowOffset = BonusHistorySettings.kart5.rowOffset;
    this.titleText.position.x = _s(x);
    this.titleText.position.y = _s(y);

    let rowIndex = 0;
    const firstCol = 0;
    const secCol = 59;
    for (const row of this.rows) {
      row.raceText.position.x = _s(29);
      row.raceText.position.y = _s(57 + rowIndex * rowOffset);
      row.raceNumber.position.x = _s((firstCol + secCol) / 2);
      row.raceNumber.position.y = _s(70.5 + rowIndex * rowOffset);
      row.idText.position.x = _s(122);
      row.idText.position.y = _s(57 + rowIndex * rowOffset);
      row.dateText.position.x = _s(244);
      row.dateText.position.y = row.idText.position.y;
      row.timeText.position.x = _s(244);
      row.timeText.position.y = _s(85 + rowIndex * rowOffset);
      row.nameText.anchor.set(0.5, 0.5);
      row.nameText.position.x = _s(127);
      row.nameText.position.y = _s(85.5 + rowIndex * rowOffset);
      row.amountText.anchor.set(0.5, 0.5);
      row.amountText.position.x = _s(328);
      row.amountText.position.y = row.idText.position.y;

      rowIndex++;
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

    const speedFactor = anim.speedFactor ? anim.speedFactor : 1;
    let baseFactor = time - anim.startTime;
    if (baseFactor >= anim.duration) {
      baseFactor = 1.0 - (baseFactor - anim.duration) * speedFactor * 2;
      this.setDebugFade(AnimHelper.clamp(baseFactor));
      this.titleText.alpha = (baseFactor + 0.2) * 2;

      let rowIndex = 0;
      for (const row of this.rows) {
        const rowFactor = baseFactor + rowIndex * 0.05;
        row.raceNumber.alpha = rowFactor;
        row.raceText.alpha = rowFactor;
        row.idText.alpha = rowFactor;
        row.dateText.alpha = rowFactor;
        row.timeText.alpha = rowFactor;
        row.nameText.alpha = rowFactor;
        row.amountText.alpha = rowFactor;
        rowIndex++;
      }
    } else {
      baseFactor = baseFactor * speedFactor;
      this.setDebugFade(AnimHelper.clamp(baseFactor));
      this.titleText.alpha = baseFactor - 0.2;

      let rowIndex = 0;
      for (const row of this.rows) {
        const rowFactor = baseFactor - (0.38 + rowIndex * 0.1);
        row.raceNumber.alpha = rowFactor;
        row.raceText.alpha = rowFactor;
        row.idText.alpha = rowFactor - 0.025;
        row.dateText.alpha = rowFactor - 0.05;
        row.timeText.alpha = rowFactor - 0.075;
        row.nameText.alpha = rowFactor - 0.1;
        row.amountText.alpha = rowFactor - 0.125;
        rowIndex++;
      }
    }
  }
}
