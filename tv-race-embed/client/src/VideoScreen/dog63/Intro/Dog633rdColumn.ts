import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver } from "client/Logic/LogicDefinitions";
import { GameType, GameLength } from "common/Definitions";
import { Dog63Helper } from "../Dog63Helper";

export class Dog633rdColumn extends Group {
  private headers: PIXI.Text[] = [];
  private driverName: PIXI.Text;
  private quotes: PIXI.Text[] = [];

  private quoteStyleRegular: PIXI.TextStyle;
  private quoteStyleBold: PIXI.TextStyle;

  public constructor() {
    super();

    this.showDebug(settings.debug);

    const headerStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Bold",
      fontSize: _s(14),
      fill: "black",
      align: "center"
    });

    this.quoteStyleRegular = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(20),
      fill: Dog63Helper.getWhiteColor(),
      align: "center",
      letterSpacing: _s(-0.5)
    });
    this.quoteStyleBold = new PIXI.TextStyle({
      fontFamily: "DIN-Bold",
      fontSize: _s(20),
      fill: Dog63Helper.getWhiteColor(),
      align: "center"
    });

    for (let i = 0; i < 3; i++) {
      const header1 = Logic.createPixiText(headerStyle);
      header1.anchor.set(0.5, 0);
      this.headers.push(header1);
      this.add(header1);
    }
    {
      const driverNameStyle = new PIXI.TextStyle({
        fontFamily: "DIN-LightItalic",
        fontSize: _s(18),
        fill: Dog63Helper.getWhiteColor(),
        align: "center",
        letterSpacing: _s(0.5)
      });
      this.driverName = Logic.createPixiText(driverNameStyle);
      this.driverName.anchor.set(1, 0);
      this.driverName.rotation = (-Math.PI * 90) / 180.0;
      this.add(this.driverName);
    }

    for (let i = 0; i < 25; i++) {
      const quote = Logic.createPixiText(this.quoteStyleRegular);
      quote.anchor.set(0.5, 0);
      this.quotes.push(quote);
      this.add(quote);
    }
  }

  public fill(drivers: IDriver[], driverIndex: number, quotes: number[], withBonus: boolean, lowestQuotes: number[], highestQuotes: number[]): void {
    const columnDriver = drivers[driverIndex];

    this.headers[0].text = _t("numberSign");
    this.headers[1].text = _t("numberSignTwo");
    this.headers[2].text = _t("numberSignThree");
    this.driverName.text = columnDriver.firstName;

    const values = [1, 2, 3, 4, 5, 6];
    values.splice(values.indexOf(driverIndex + 1), 1);
    const otherDrivers = values;

    for (let i = 0; i < 5; i++) {
      const placements = [...otherDrivers];
      placements.splice(otherDrivers.indexOf(otherDrivers[i]), 1);
      for (let j = 0; j < 4; j++) {
        this.quotes[i * 4 + j].text = Dog63Helper.formatQuote(quotes[i * 4 + j], 6);
        this.quotes[i * 4 + j].tint = Dog63Helper.getWhiteColorNumber();
        const quoteValue = quotes[i * 4 + j];
        if (lowestQuotes.indexOf(quoteValue) >= 0) {
          this.quotes[i * 4 + j].tint = Dog63Helper.getGreenColorNumber();
          this.quotes[i * 4 + j].style = lowestQuotes[0] === quoteValue ? this.quoteStyleBold : this.quoteStyleRegular;
          this.quotes[i * 4 + j].style.trim = true;
          this.quotes[i * 4 + j].style.padding = 10;
        } else if (highestQuotes.indexOf(quoteValue) >= 0) {
          this.quotes[i * 4 + j].style = highestQuotes[highestQuotes.length - 1] === quoteValue ? this.quoteStyleBold : this.quoteStyleRegular;
          this.quotes[i * 4 + j].style.trim = true;
          this.quotes[i * 4 + j].style.padding = 10;

          this.quotes[i * 4 + j].tint = Dog63Helper.getRedColorNumber();
        }
      }
    }
  }

  public onLayout(): void {
    const rowHeight = 30.7;
    const rowBlockHeight = rowHeight * 4; // 122;

    const rowOffsetY = 28;
    const rowOffsetX = 15;

    const columnWidth = 38;

    this.driverName.y = _s(54);
    this.driverName.x = _s(11);

    for (let i = 0; i < 3; i++) {
      this.headers[i].x = _s(rowOffsetX + (columnWidth - 1) * i - 2 + 6);
      this.headers[i].y = _s(7);
    }

    for (let i = 0; i < 5; i++) {
      for (let r = 0; r < 4; r++) {
        const thirdPlacementY = rowOffsetY + rowBlockHeight * i + rowHeight * r;
        this.quotes[i * 4 + r].x = _s(156);
        this.quotes[i * 4 + r].y = _s(thirdPlacementY);
      }
    }
  }
}
