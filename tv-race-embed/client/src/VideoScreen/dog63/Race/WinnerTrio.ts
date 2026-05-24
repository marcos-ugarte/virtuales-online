import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { AnimHelper } from "./../../common/Anim";
import { IDriver, IDog63QuoteInfo } from "client/Logic/LogicDefinitions";
import { DrawHelper } from "../../common/DrawHelper";
import { GameType, GameLength } from "common/Definitions";
import { DiagonalFadeHelper } from "client/VideoScreen/common/DiagonalFadeHelper";
import { Dog63Helper } from "../Dog63Helper";

export class WinnerTrio extends Group {
  private header: PIXI.Text;
  private subHeaders: PIXI.Text[] = [];
  private places: PIXI.Text[][] = [];
  private bars: PIXI.Sprite[][] = [];
  private quotes: PIXI.Text[] = [];

  public constructor(gameType: GameType, gameLength: GameLength) {
    super();

    this.showDebug(settings.debug, undefined, "WinnerTrio");

    this.header = Logic.createPixiText(Dog63Helper.getRaceResultHeaderStyle());
    this.header.anchor.set(0.5, 0);
    this.add(this.header);

    const placeStyle = Dog63Helper.getRaceResultPlaceStyle();
    const quoteStyle = Dog63Helper.getRaceResultQuoteStyle();

    for (let i = 0; i < 2; i++) {
      const subHeader = Logic.createPixiText(Dog63Helper.getRaceResultSubHeaderStyle());

      this.subHeaders.push(subHeader);
      this.add(subHeader);

      const quote = Logic.createPixiText(quoteStyle);
      quote.anchor.set(1, 1);
      this.quotes.push(quote);
      this.add(quote);

      const placeRow: PIXI.Text[] = [];
      const barsForRow: PIXI.Sprite[] = [];
      for (let p = 0; p < 3; p++) {
        const place = Logic.createPixiText(placeStyle);
        place.anchor.set(0.5, 1);

        placeRow.push(place);
        this.add(place);

        const bar = new PIXI.Sprite();
        bar.anchor.set(0.5, 0.5);
        barsForRow.push(bar);
        this.add(bar);
      }
      this.places.push(placeRow);
      this.bars.push(barsForRow);
    }
  }

  public fill(places: number[][], drivers: IDriver[], quotes: IDog63QuoteInfo[], withBonus: boolean): void {
    this.header.text = _t("theTrio");
    this.subHeaders[0].text = _t("inOrder");
    this.subHeaders[1].text = _t("notInOrder");

    const sortedQuotes = [places[0], places[1].sort()];

    for (let i = 0; i < 2; i++) {
      for (let p = 0; p < 3; p++) {
        this.places[i][p].text = (sortedQuotes[i][p] + 1).toString();
        this.bars[i][p].texture = DrawHelper.getCachedPattern(_s(4), _s(26), 0, drivers[sortedQuotes[i][p]].color, drivers[sortedQuotes[i][p]].color2, drivers[sortedQuotes[i][p]].driverPattern);
      }
      this.quotes[i].text = Dog63Helper.formatQuote(quotes[i].quote, quotes[i].betCodeId);
    }
  }

  public onLayout(): void {
    this.header.x = _s(278);
    this.header.y = _s(6);

    const rowOffsetX = -11;
    this.onLayoutRow(rowOffsetX);
  }

  private onLayoutRow(rowOffsetX: number) {
    const rowHeight = 64;
    const placeOffsetX = 28;

    for (let row = 0; row < 2; row++) {
      this.subHeaders[row].x = _s(36 + rowOffsetX * row);
      this.subHeaders[row].y = _s(54 + rowHeight * row);

      this.quotes[row].x = _s(302 + rowOffsetX * row - 1);
      this.quotes[row].y = _s(66 + rowHeight * row);

      for (let p = 0; p < 3; p++) {
        this.bars[row][p].rotation = (Math.PI * 90) / 180;
        this.bars[row][p].x = _s(141 + rowOffsetX * row + placeOffsetX * p);
        this.bars[row][p].y = _s(70 + rowHeight * row);

        this.places[row][p].x = _s(141 + rowOffsetX * row + placeOffsetX * p);
        this.places[row][p].y = _s(64 + rowHeight * row);
      }
    }
  }

  public updateAnim(baseFactor: number, duration: number): void {
    DiagonalFadeHelper.FadeDiagonal(this, baseFactor, duration, 0.9, 0.3, 1, Logic.videoScreen.width, Logic.videoScreen.height);
    for (const placeRow of this.places) for (const entry of placeRow) entry.alpha = Math.min(entry.alpha, 0.6);
    AnimHelper.animateIn(baseFactor, 0.3, 1, 0.5, -300, 0, (x) => this.onLayoutRow(-11 + x));
  }
}
