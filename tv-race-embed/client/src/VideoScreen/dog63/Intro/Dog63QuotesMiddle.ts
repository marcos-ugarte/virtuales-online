import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { Dog63Helper } from "../Dog63Helper";
import { IDog63QuoteInfo } from "client/Logic/LogicDefinitions";

export class Dog63QuotesMiddle extends Group {
  private title: PIXI.Text;
  private headersVertical: PIXI.Text[] = [];
  private places: PIXI.Text[][] = [];
  private quotes: PIXI.Text[][] = [];
  private oddsAlwaysOn: boolean;

  public constructor(oddsAlwaysOn = false) {
    super();
    this.oddsAlwaysOn = oddsAlwaysOn;
    this.showDebug(settings.debug, undefined, "Middle");

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(22),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(0),
        align: "left"
      });
      this.title = Logic.createPixiText(style);
      this.add(this.title);

      const headersStyle = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(22),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(0.5),
        align: "left"
      });
      for (let i = 0; i < 2; i++) {
        const header = Logic.createPixiText(headersStyle);
        this.headersVertical.push(header);
        header.anchor.set(0, 0.5);
        this.add(header);
      }
    }

    const placeStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Light",
      fontSize: _s(22),
      fill: Dog63Helper.getWhiteColor(),
      letterSpacing: _s(-1),
      align: "left"
    });
    const quoteStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Medium",
      fontSize: _s(17.6),
      fill: Dog63Helper.getWhiteColor(),
      letterSpacing: _s(-1),
      align: "right"
    });

    for (let line = 0; line < 2; line++) {
      const placeLine: PIXI.Text[] = [];
      const quoteLine: PIXI.Text[] = [];
      for (let column = 0; column < 10; column++) {
        const place = Logic.createPixiText(placeStyle);
        place.anchor.set(0, 0.5);
        placeLine.push(place);
        this.add(place);

        const quote = Logic.createPixiText(quoteStyle);
        quote.anchor.set(1, 0.5);
        quoteLine.push(quote);
        this.add(quote);
      }
      this.places.push(placeLine);
      this.quotes.push(quoteLine);
    }
  }

  public fill(quotes: IDog63QuoteInfo[][]): void {
    this.title.text = _t("sumPlaces");
    this.headersVertical[0].text = _t("sumPlaceSh2");
    this.headersVertical[1].text = _t("sumPlaceSh3");

    const suPlaces = [
      [3, 4, 5, 6, 7, 8, 9, 10, 11],
      [6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    ];

    for (let line = 0; line < 2; line++) {
      const formattedArray = [];

      for (let column = 0; column < 10; column++) {
        if (line === 0 && column === 9) continue;

        this.places[line][column].text = "" + suPlaces[line][column] + ":";

        this.quotes[line][column].text = Dog63Helper.formatQuote(quotes[line][column].quote, quotes[line][column].betCodeId);
        this.quotes[line][column].tint = Dog63Helper.getWhiteColorNumber();

        formattedArray.push(Dog63Helper.formatQuote(quotes[line][column].quote, quotes[line][column].betCodeId));
        Logic.autoSize(this.quotes[line][column], _s(40));
      }
      const { maxVal, minVal } = Dog63Helper.findMinMaxValues(formattedArray);
      const maxEl = this.quotes[line].findIndex((el) => Dog63Helper.turnQuoteIntoNumber(el.text, ",") === maxVal);
      const minEl = this.quotes[line].findIndex((el) => Dog63Helper.turnQuoteIntoNumber(el.text, ",") === minVal);

      this.quotes[line][minEl].tint = Dog63Helper.getGreenColorNumber();
      this.quotes[line][maxEl].tint = Dog63Helper.getRedColorNumber();
    }
  }

  public onLayout(): void {
    this.title.x = _s(38);
    this.title.y = _s(12);

    const rowHeight = 48;
    const headerOffsetX = 23;
    const headerHeight = 40.5;
    const rowOffsetY = 17;

    const columnPositionsPlace: number[] = [123.5, 212, 300, 387, 475, 563, 651, 740, 828, 917];
    const columnPositionQuote: number[] = [190, 279, 366, 454, 542, 630, 718, 806, 893, 981];

    for (let line = 0; line < 2; line++) {
      this.headersVertical[line].position.x = _s(headerOffsetX);
      this.headersVertical[line].position.y = _s(rowOffsetY + rowHeight * line + rowHeight);

      for (let column = 0; column < 10; column++) {
        this.places[line][column].position.x = _s(columnPositionsPlace[column]); // _s(placeOffsetX + columnSpacingX*column);
        this.quotes[line][column].position.x = _s(columnPositionQuote[column]);
        this.places[line][column].position.y = _s(headerHeight + rowHeight * line + rowHeight / 2);
        this.quotes[line][column].position.y = _s(headerHeight + rowHeight * line + rowHeight / 2);
      }
    }
  }

  public updateAnim(baseFactor: number, duration: number): void {}
}
