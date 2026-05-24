import { dog63Quotes3SideSettings, dog63Quotes3SideStyles } from "./../../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IAnimInterval, IDog63SuprimiEntry } from "client/Logic/LogicDefinitions";
import { GameType, GameLength } from "common/Definitions";
import { Dog63Helper } from "../Dog63Helper";
import { Dog63Quotes3SideEntry } from "./Dog63Quotes3SideEntry";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";

export class Dog63Quotes3Side extends Group {
  private titleText: PIXI.Text;
  private header1: PIXI.Text;
  private header2: PIXI.Text;
  private entries: Dog63Quotes3SideEntry[][] = [];

  private oddsAlwaysOn: boolean;

  public constructor(gameType: GameType, gameLength: GameLength, oddsAlwaysOn = false) {
    super();

    this.oddsAlwaysOn = oddsAlwaysOn;

    this.showDebug(settings.debug, undefined, "Quotes Side");

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(14),
        fill: "black",
        align: "center",
        letterSpacing: 1.0
      });
      if (this.oddsAlwaysOn) {
        const { title } = dog63Quotes3SideStyles;
        style.fontSize = _s(title.fontSize);
        style.fontFamily = title.fontFamily;
        style.letterSpacing = _s(title.letterSpacing);
      }

      this.titleText = Logic.createPixiText(style);
      this.titleText.anchor.set(0.5, 0);
      this.add(this.titleText);
    }
    {
      const styleLight = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(20),
        fill: Dog63Helper.getWhiteColor(),
        align: "center"
      });

      if (this.oddsAlwaysOn) {
        const { subTitles } = dog63Quotes3SideStyles;
        styleLight.letterSpacing = _s(subTitles.letterSpacing);
      }

      this.header1 = Logic.createPixiText(styleLight);
      this.header1.anchor.set(0.5, 0);
      this.add(this.header1);
      this.header2 = Logic.createPixiText(styleLight);
      this.header2.anchor.set(0.5, 0);
      this.add(this.header2);
    }
    for (let row = 0; row < 6; row++) {
      const rowEntries: Dog63Quotes3SideEntry[] = [];
      for (let column = 0; column < 4; column++) {
        const entry = new Dog63Quotes3SideEntry(gameType, gameLength, this.oddsAlwaysOn);
        rowEntries.push(entry);
        this.add(entry);
      }
      this.entries.push(rowEntries);
    }
  }

  public fill(drivers: IDriver[], oddsSide: IDog63SuprimiEntry[][]): void {
    this.titleText.text = _t("trioInOrder");
    this.header1.text = _t("twelfLowQ");
    this.header2.text = _t("twelfHeighQ");

    let minValue: number = 1000;
    let maxValue: number = 0;
    for (let row = 0; row < 6; row++) {
      for (let column = 0; column < 4; column++) {
        const oddsEntry = oddsSide[row][column];
        if (oddsEntry.quote < minValue) minValue = oddsEntry.quote;
        else if (oddsEntry.quote > maxValue) maxValue = oddsEntry.quote;
      }
    }

    for (let row = 0; row < 6; row++) {
      for (let column = 0; column < 4; column++) {
        const oddsEntry = oddsSide[row][column];
        this.entries[row][column].fill(drivers, oddsEntry.drivers, oddsEntry.quote, oddsEntry.betCodeId, minValue, maxValue);
      }
    }
  }

  public onLayout(): void {
    this.titleText.x = _s(125);
    this.titleText.y = _s(2);
    this.header1.x = _s(96);
    this.header1.y = _s(30);
    this.header2.x = _s(286);
    this.header2.y = _s(30);

    let rowOffsetY = 65;
    let rowHeight = 47.6;
    let columnOffsetX = 1;
    let columnWidth = 94.5;

    if (this.oddsAlwaysOn) {
      const { titleText, subTitle1, subTitle2, rowOffset, rowHeight: heigth, columnOffset, columnWidth: width } = dog63Quotes3SideSettings;

      this.titleText.x = _s(titleText.x);
      this.titleText.y = _s(titleText.y);
      this.header1.x = _s(subTitle1.x);
      this.header1.y = _s(subTitle1.y);
      this.header2.x = _s(subTitle2.x);
      this.header2.y = _s(subTitle2.y);

      rowOffsetY = rowOffset;
      rowHeight = heigth;
      columnOffsetX = columnOffset;
      columnWidth = width;
    }

    for (let row = 0; row < 6; row++) {
      for (let column = 0; column < 4; column++) {
        LayoutHelper.setScaledRectangle(this.entries[row][column], columnOffsetX + column * columnWidth, rowOffsetY + row * rowHeight, columnWidth, rowHeight);
      }
    }
  }
}
