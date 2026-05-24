import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDog63QuoteBottomEntry } from "client/Logic/LogicDefinitions";
import { Dog63Helper } from "../Dog63Helper";

export class Dog63QuotesBottom extends Group {
  private headers: PIXI.Text[] = [];
  private first: PIXI.Text[] = [];
  private quotes: PIXI.Text[] = [];
  private oddsAlwaysOn: boolean;

  public constructor(oddsAlwaysOn = false) {
    super();
    this.oddsAlwaysOn = oddsAlwaysOn;
    this.showDebug(settings.debug, undefined, "QuotesBottom");

    {
      const headerStyle = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(22),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(0),
        align: "center"
      });
      const firstStyle = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(22),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(-1),
        align: "left"
      });
      const secondStyle = new PIXI.TextStyle({
        fontFamily: "DIN-Medium",
        fontSize: _s(22),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(-1),
        align: "right"
      });
      for (let i = 0; i < 4; i++) {
        const header = Logic.createPixiText(headerStyle);
        header.anchor.set(0.5, 0);
        this.headers.push(header);
        this.add(header);

        const first = Logic.createPixiText(firstStyle);
        first.anchor.set(1, 0);
        this.first.push(first);
        this.add(first);

        const second = Logic.createPixiText(secondStyle);
        second.anchor.set(1, 0);
        this.quotes.push(second);
        this.add(second);
      }
    }
  }

  public fill(entries: IDog63QuoteBottomEntry[]): void {
    this.headers[0].text = _t("oddTxt");
    this.headers[1].text = _t("evenTxt");
    this.headers[2].text = _t("underTxt");
    this.headers[3].text = _t("overTxt");

    for (let i = 0; i < 4; i++) {
      const entry = entries[i];

      this.first[i].text = entry.places.join("/");
      this.quotes[i].text = Dog63Helper.formatQuote(entry.quote, entry.betCodeId);
    }
  }

  public onLayout(): void {
    const headerOffsetY = 15;

    const lowerOffsetY = 60;
    // const placeOffsetX = 44;
    // const placeSpacingX = 140;
    // const quoteOffsetX = 104;
    // const quoteSpacingX = 140;

    const headerPositions: number[] = [75, 209, 354, 495];
    const placePositions: number[] = [69, 211, 352, 493];
    const quotePositions: number[] = [118, 260, 402, 544];

    for (let i = 0; i < 4; i++) {
      this.headers[i].x = _s(headerPositions[i]); // _s(headerOffsetX + headerSpacingX*i);
      this.headers[i].y = _s(headerOffsetY);

      this.first[i].x = _s(placePositions[i]); // _s(placeOffsetX + placeSpacingX*i);
      this.first[i].y = _s(lowerOffsetY);

      this.quotes[i].x = _s(quotePositions[i]); // _s(quoteOffsetX + quoteSpacingX*i);
      this.quotes[i].y = _s(lowerOffsetY);
    }
  }

  public updateAnim(baseFactor: number, duration: number): void {}
}
