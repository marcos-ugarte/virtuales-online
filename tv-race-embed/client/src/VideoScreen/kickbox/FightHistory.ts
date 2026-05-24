import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, _t, settings } from "client/Logic/Logic";
import { IAnimInterval, IDriver, IFightHistoryRow } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { KickboxHelper } from "./KickboxHelper";
import { HistoryRow } from "./HistoryRow";
import { DrawHelper } from "../common/DrawHelper";

export class FightHistory extends Group {
  private title: PIXI.Text;
  private titles1: PIXI.Text[] = [];
  private titles1X: number[] = [];
  private titles2: PIXI.Text[] = [];

  //private columnMasks: PIXI.Sprite[] = [];

  private rows: HistoryRow[] = [];

  private anims: IAnimInterval[];

  public constructor() {
    super();
    this.showDebug(settings.debug, undefined, "History");

    this.title = Logic.createPixiText(KickboxHelper.getHeaderCenterStyle());
    this.title.anchor.set(0.5, 0.5);
    //this.add(this.title);

    const title1Style = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(11),
      fill: KickboxHelper.getWhiteColor(),
      fontStyle: "italic"
    });

    const title2Style = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLightItalic",
      fontSize: _s(8),
      fill: KickboxHelper.getWhiteColor(),
      fontStyle: "italic"
    });

    //const columnMaskTexture = DrawHelper.createSkewedRoundedRectangleTexture(100, 100, 0, 0,  { type: "solid", color: "white"});

    for (let i = 0; i < 7; i++) {
      const title1 = Logic.createPixiText(title1Style);
      this.titles1.push(title1);
      this.titles1X.push(0);
      this.add(title1);

      // const columnMask = new PIXI.Sprite(columnMaskTexture);
      // columnMask.alpha = 1.0;
      // this.columnMasks.push(columnMask);
      // this.add(columnMask);

      if (i < 5) {
        const title2 = Logic.createPixiText(title2Style);
        this.titles2.push(title2);
        this.add(title2);
      } else {
        this.titles1[i].anchor.set(0.5, 0.0);
      }
    }

    this.titles1[5].anchor.set(0.5, 0);
    this.titles1[6].anchor.set(0.5, 0);

    const ngonTexture = DrawHelper.createNGonTexture(20, 6, "white");
    const barTexture = DrawHelper.createSkewedRoundedRectangleTexture(40, 20, 0, _s(5.5), { type: "solid", color: "white" });

    for (let i = 0; i < 8; i++) {
      const row = new HistoryRow(
        ngonTexture,
        barTexture,
        null,
        null,
        null,
        null
        // this.columnMasks[0],
        // this.columnMasks[4],
        // this.columnMasks[5],
        // this.columnMasks[6]
      );
      this.rows.push(row);
      this.add(row);
    }

    this.anims = [
      {
        startTime: 70.3,
        duration: 22.5
      },
      {
        startTime: 171.35,
        duration: 22.5
      }
    ];
  }

  public fill(drivers: IDriver[], fightHistory: IFightHistoryRow[]) {
    this.title.text = _t("history");

    for (let i = 0; i < 3; i++) {
      this.titles1[i + 1].text = _t("round") + " " + (i + 1);
      this.titles2[i + 1].text = _t("winner") + " / " + _t("quotes");
    }
    this.titles1[4].text = _t("result");
    this.titles2[4].text = _t("winner") + " / " + _t("quotes");

    this.titles1[5].text = _t("winBet").replace("___LF___", "\n").replace("___LF___", "\n");
    this.titles1[6].text = _t("combiBet").replace("___LF___", "\n").replace("___LF___", "\n");

    for (let i = 0; i < fightHistory.length; i++) {
      this.rows[i].fill(drivers, fightHistory[i]);
    }

    this.onLayout();
  }

  // private updateText(
  //   multiText: MultiStyleText,
  //   text: string | undefined,
  //   styles?: ITextStyleSet
  // ) {
  //   if (text) {
  //     if (styles) multiText.styles = styles;
  //     multiText.text = text;
  //     multiText.visible = true;
  //   } else {
  //     multiText.visible = false;
  //   }
  // }

  public onLayout() {
    this.title.x = this.width / 2;
    this.title.y = _s(43);

    const startX = _s(204);
    const startY = _s(162);

    const xValues = [_s(0), _s(88), _s(237), _s(382), _s(536), _s(745), _s(824)];
    const yValueTitle1 = _s(16);
    const yValueTitle2 = _s(30);
    for (let column = 0; column < 7; column++) {
      this.titles1[column].x = xValues[column] + startX;
      this.titles1X[column] = this.titles1[column].x;
      this.titles1[column].y = yValueTitle1 + startY;

      // const mask = this.columnMasks[column];
      // if (column < 4)
      //   mask.x = xValues[column] + startX;
      // else
      //   mask.x = xValues[column] + startX - _s(50);
      // mask.y = yValueTitle1 + startY - _s(100);
      // mask.width = _s(200);
      // mask.height = _s(1000);

      if (column < this.titles2.length) {
        this.titles2[column].x = xValues[column] + startX;
        this.titles2[column].y = yValueTitle2 + startY;
        //this.titles2[column].mask = mask;
      }

      //this.titles1[column].mask = mask;
    }

    const startRowY = _s(48);
    const rowHeight = _s(41.36);
    const rowWidth = _s(882);
    for (let rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
      const row = this.rows[rowIndex];
      row.x = startX;
      row.y = startRowY + rowHeight * rowIndex + startY;
      row.width = rowWidth;
      row.height = rowHeight;
    }

    // LayoutHelper.setScaledRectangle(this.resultBetTables[0], 321, 122, 285, 533);
    // LayoutHelper.setScaledRectangle(this.resultBetTables[1], 681, 122, 285, 533);

    Logic.autoSize(this.titles1[5], _s(65));
    Logic.autoSize(this.titles1[6], _s(65));
  }

  public columnDurations: number[] = [7];

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    if (t > Logic.getIntroLength()) {
      this.alpha = 0;
      return;
    }

    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    AnimHelper.animateInOut(t, anim.startTime, anim.startTime + anim.duration, 0, 0, 1, (x) => (this.alpha = x), 0, 0);
    const baseFactor = t - anim.startTime;

    //const rowTimeOffset = 0.1;
    const columnOffset = 0.0;
    const fadeOutDuration = 0.5;
    for (let column = 0; column < this.titles1.length; column++) {
      const columnDuration = anim.duration - Math.abs(column - 2.5) * 0.1;
      this.columnDurations[column] = columnDuration;

      AnimHelper.animateIn(baseFactor, 0 + columnOffset, columnDuration, 1, _s(-100), _s(0), (x) => (this.titles1[column].x = x + this.titles1X[column]));
      AnimHelper.animateInOut(baseFactor, 0 + columnOffset + 0.4, columnDuration - 0.4, 0.3, 0, 1, (x) => (this.titles1[column].alpha = x), fadeOutDuration, 0);

      if (column < this.titles2.length) {
        this.titles2[column].alpha = 1;
        AnimHelper.animateIn(baseFactor, 0 + columnOffset, columnDuration, 1, _s(-100), _s(0), (x) => (this.titles2[column].x = x + this.titles1X[column]));
        AnimHelper.animateInOut(baseFactor, 0 + columnOffset + 0.4, columnDuration - 0.4, 0.3, 0, 1, (x) => (this.titles2[column].alpha = x), fadeOutDuration, 0);
      }

      // for (let row = 0; row < this.rows.length; row++){
      //   this.rows[row].updateAnims(baseFactor, columnDuration, row);
      // }
    }

    for (let row = 0; row < this.rows.length; row++) {
      this.rows[row].updateAnims(baseFactor, anim.duration, row, this.columnDurations);
    }
  }
}
