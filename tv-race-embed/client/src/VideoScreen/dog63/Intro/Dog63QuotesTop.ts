import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IDog63QuoteEntry } from "client/Logic/LogicDefinitions";
import { Dog63Helper } from "../Dog63Helper";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { Dog63Bar } from "./RacingHistory/Dog63Bar";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";

export class Dog63QuotesTop extends Group {
  private title: PIXI.Text;
  private headers: PIXI.Text[] = [];
  private subHeaders: PIXI.Text[] = [];
  private headersVert: PIXI.Text[] = [];
  private names: PIXI.Text[] = [];
  private bars: PIXI.Sprite[] = [];
  private quotes: PIXI.Text[][] = [];
  private pesoQuotes: PIXI.Text[] = [];
  private ultime5: PIXI.Text[][] = [];
  private valueBars: Dog63Bar[] = [];

  public constructor() {
    super();

    this.showDebug(settings.debug, 0.1, "Top");

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(24),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(0),
        align: "left"
      });
      this.title = Logic.createPixiText(style);
      this.title.anchor.set(0.5, 0);
      this.add(this.title);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(22),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(0),
        align: "left"
      });
      for (let i = 0; i < 8; i++) {
        const header = Logic.createPixiText(style);
        header.anchor.set(0.5, 0);
        this.headers.push(header);
        this.add(header);
      }
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(10),
        fill: Dog63Helper.getBlackColor(),
        letterSpacing: _s(2),
        align: "center"
      });
      for (let i = 0; i < 8; i++) {
        const subHeader = Logic.createPixiText(style);
        subHeader.anchor.set(0.5, 0);
        this.subHeaders.push(subHeader);
        this.add(subHeader);
      }
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(24),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(0),
        align: "left"
      });
      for (let i = 0; i < 6; i++) {
        const vertHeader = Logic.createPixiText(style);
        vertHeader.anchor.set(0.5, 0);
        this.headersVert.push(vertHeader);
        //this.add(vertHeader);
      }
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-LightItalic",
        fontSize: _s(22),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(0.6),
        align: "left"
      });
      for (let i = 0; i < 6; i++) {
        const name = Logic.createPixiText(style);
        this.names.push(name);
        this.add(name);
      }
    }

    const quotesStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(22),
      fill: Dog63Helper.getWhiteColor(),
      letterSpacing: _s(0),
      align: "left"
    });
    {
      for (let i = 0; i < 6; i++) {
        const quoteRow: PIXI.Text[] = [];
        for (let j = 0; j < 5; j++) {
          const quote = Logic.createPixiText(quotesStyle);
          quote.anchor.set(0.5, 0);
          quoteRow.push(quote);
          this.add(quote);
        }
        this.quotes.push(quoteRow);

        const ultimeRow: PIXI.Text[] = [];
        for (let j = 0; j < 5; j++) {
          const ultime = Logic.createPixiText(quotesStyle);
          ultime.anchor.set(0.5, 0);
          ultimeRow.push(ultime);
          this.add(ultime);
        }
        this.ultime5.push(ultimeRow);

        const pesoQuote = Logic.createPixiText(quotesStyle);
        pesoQuote.anchor.set(0.5, 0);
        this.pesoQuotes.push(pesoQuote);
        this.add(pesoQuote);

        const bar = new PIXI.Sprite();
        bar.anchor.set(0.5, 0.5);
        this.bars.push(bar);
        //this.add(bar);

        const valueBar = new Dog63Bar();
        this.valueBars.push(valueBar);
        this.add(valueBar);
      }
    }
  }

  public fill(drivers: IDriver[], quoteEntries: IDog63QuoteEntry[]): void {
    this.headers[0].text = _t("numberSign");
    this.headers[1].text = _t("numberSignTwo");
    this.headers[2].text = _t("numberSignThree");
    this.headers[3].text = _t("placeBet");
    this.headers[4].text = _t("showBet");
    this.headers[5].text = _t("weight");
    this.headers[6].text = _t("theLastFive");
    this.headers[7].text = _t("theValue");

    this.subHeaders[0].text = _t("quote");
    this.subHeaders[1].text = _t("noteHead");

    for (let i = 0; i < 6; i++) {
      const quoteEntry = quoteEntries[i];
      this.headersVert[i].text = (i + 1).toString();
      this.names[i].text = drivers[i].firstName.toUpperCase();

      this.pesoQuotes[i].text = quoteEntry.peso;
      for (let j = 0; j < 5; j++) {
        this.quotes[i][j].text = Dog63Helper.formatQuote(quoteEntry.quotes[j].quote, quoteEntry.quotes[j].betCodeId);
        this.quotes[i][j].tint = Dog63Helper.getWhiteColorNumber();
        this.ultime5[i][j].text = "" + quoteEntry.ultime5[j];
        this.ultime5[i][j].tint = quoteEntry.ultime5[j] === 1 ? Dog63Helper.getYellowColorNumber() : Dog63Helper.getWhiteColorNumber();
      }

      const driver = drivers[i];
      this.bars[i].texture = DrawHelper.getCachedPattern(6, 32, 0, driver.color, driver.color2, driver.driverPattern);

      this.valueBars[i].fill(quoteEntry.val);
    }

    let minValue = 10000;
    let maxValue = -10000;

    for (let column = 0; column < 5; column++) {
      for (let row = 0; row < 5; row++) {
        const val = quoteEntries[row].quotes[column].quote;
        if (val < minValue) minValue = val;
        if (val > maxValue) maxValue = val;
      }
    }

    for (let column = 0; column < 5; column++) {
      for (let row = 0; row < 5; row++) {
        const val = quoteEntries[row].quotes[column].quote;
        if (val === minValue) this.quotes[row][column].tint = Dog63Helper.getGreenColorNumber();
        else if (val === maxValue) this.quotes[row][column].tint = Dog63Helper.getRedColorNumber();
      }
    }
  }

  public onLayout(): void {
    const headerOffsetY = 10;
    const headerOffsetX = 22;
    const nameOffsetX = 66;

    const pesoOffsetX = 726;
    const ultimeOffsetX = 836;
    const ultimeSpacingX = 19;
    const columnCenters = [252, 340, 428, 516, 603, pesoOffsetX, ultimeOffsetX];

    const rowHeight = 47.3;
    const rowOffsetY = 55;

    for (let i = 0; i < 7; i++) {
      this.headers[i].x = _s(columnCenters[i]);
      this.headers[i].y = _s(headerOffsetY);
    }

    let subHeadPos = -12.5;
    if (Logic.isMacAddressDevice) {
      subHeadPos = -13.5;
    }

    this.subHeaders[0].x = _s(255);
    this.subHeaders[0].y = _s(subHeadPos);
    this.subHeaders[1].x = _s(730);
    this.subHeaders[1].y = _s(subHeadPos);

    this.headers[7].x = _s(951);
    this.headers[7].y = _s(headerOffsetY);

    for (let row = 0; row < 6; row++) {
      const rowY = rowOffsetY + rowHeight * row;

      this.names[row].x = _s(nameOffsetX) + _s(2);
      this.names[row].y = _s(rowY);

      this.headersVert[row].x = _s(headerOffsetX);
      this.headersVert[row].y = _s(rowY) - _s(2);

      for (let i = 0; i < 5; i++) {
        this.quotes[row][i].x = _s(columnCenters[i]);
        this.quotes[row][i].y = _s(rowY);

        this.ultime5[row][i].x = _s(ultimeOffsetX + (-2 + i) * ultimeSpacingX);
        this.ultime5[row][i].y = _s(rowY);
      }

      this.pesoQuotes[row].x = _s(pesoOffsetX);
      this.pesoQuotes[row].y = _s(rowY);

      this.bars[row].x = _s(nameOffsetX - 20);
      this.bars[row].y = _s(rowY + 14);
      this.bars[row].height = _s(35);
      this.bars[row].width = _s(6);

      LayoutHelper.setScaledRectangle(this.valueBars[row], 921, rowY + 8, 68, 76);
    }
  }

  public updateAnim(baseFactor: number, duration: number): void {}
}
