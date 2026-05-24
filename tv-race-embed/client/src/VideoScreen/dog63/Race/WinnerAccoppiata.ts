import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { AnimHelper } from "./../../common/Anim";
import { IDriver, IDog63QuoteInfo } from "client/Logic/LogicDefinitions";
import { DrawHelper } from "../../common/DrawHelper";
import { GameType, GameLength } from "common/Definitions";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { DiagonalFadeHelper } from "client/VideoScreen/common/DiagonalFadeHelper";
import { Dog63Helper } from "../Dog63Helper";

export class WinnerAccoppiatta extends Group {
  private header: PIXI.Text;
  private subHeaders: PIXI.Text[] = [];
  private places: PIXI.Text[][] = [];
  private bars: PIXI.Sprite[][] = [];
  private quotes: PIXI.Text[] = [];

  public constructor(gameType: GameType, gameLength: GameLength) {
    super();
    this.showDebug(settings.debug, undefined, "Accoppiatta");

    this.header = Logic.createPixiText(Dog63Helper.getRaceResultHeaderStyle());
    this.header.anchor.set(0.5, 0);
    this.add(this.header);

    const placeStyle = Dog63Helper.getRaceResultPlaceStyle();
    const quoteStyle = Dog63Helper.getRaceResultQuoteStyle();

    for (let row = 0; row < 2; row++) {
      const subHeader = Logic.createPixiText(Dog63Helper.getRaceResultSubHeaderStyle());
      this.add(subHeader);
      this.subHeaders.push(subHeader);

      const placesForRow: PIXI.Text[] = [];
      const barsForRow: PIXI.Sprite[] = [];
      for (let i = 0; i < 2; i++) {
        const place = Logic.createPixiText(placeStyle);
        place.anchor.set(0.5, 0);
        placesForRow.push(place);
        this.add(place);

        const bar = new PIXI.Sprite();
        bar.anchor.set(0.5, 0.5);
        barsForRow.push(bar);
        this.add(bar);
      }
      this.places.push(placesForRow);
      this.bars.push(barsForRow);

      const quote = Logic.createPixiText(quoteStyle);
      quote.anchor.set(1, 0);
      this.add(quote);
      this.quotes.push(quote);
    }
  }

  public fill(withBonus: boolean, drivers: IDriver[], places: number[], quotes: IDog63QuoteInfo[]): void {
    this.header.text = _t("twoerPalces");
    this.subHeaders[0].text = _t("inOrder");
    this.subHeaders[1].text = _t("notInOrder");

    if (places[3] < places[2]) {
      const tmp = places[2];
      places[2] = places[3];
      places[3] = tmp;
    }

    this.places[0][0].text = (places[0] + 1).toString();
    this.places[0][1].text = (places[1] + 1).toString();
    this.places[1][0].text = (places[2] + 1).toString();
    this.places[1][1].text = (places[3] + 1).toString();

    this.quotes[0].text = Dog63Helper.formatQuote(quotes[0].quote, quotes[0].betCodeId);
    this.quotes[1].text = Dog63Helper.formatQuote(quotes[1].quote, quotes[1].betCodeId);

    this.bars[0][0].texture = DrawHelper.getCachedPattern(_s(6), _s(32), 0, drivers[places[0]].color, drivers[places[0]].color2, drivers[places[0]].driverPattern);
    this.bars[0][1].texture = DrawHelper.getCachedPattern(_s(6), _s(32), 0, drivers[places[1]].color, drivers[places[1]].color2, drivers[places[1]].driverPattern);
    this.bars[1][0].texture = DrawHelper.getCachedPattern(_s(6), _s(32), 0, drivers[places[2]].color, drivers[places[2]].color2, drivers[places[2]].driverPattern);
    this.bars[1][1].texture = DrawHelper.getCachedPattern(_s(6), _s(32), 0, drivers[places[3]].color, drivers[places[3]].color2, drivers[places[3]].driverPattern);
  }

  public onLayout(): void {
    this.header.x = _s(252);
    this.header.y = _s(5);

    //const rowOffsetY = 64;
    const rowOffsetX = -11;
    this.onLayoutRow(rowOffsetX);
  }

  private onLayoutRow(rowOffsetX: number) {
    const rowOffsetY = 64;

    for (let row = 0; row < 2; row++) {
      this.subHeaders[row].x = _s(30 + rowOffsetX * row);
      this.subHeaders[row].y = _s(54 + rowOffsetY * row);
      this.places[row][0].x = _s(156 + rowOffsetX * row);
      this.places[row][0].y = _s(46 + rowOffsetY * row);
      this.places[row][1].x = _s(184 + rowOffsetX * row);
      this.places[row][1].y = _s(46 + rowOffsetY * row);
      this.quotes[row].x = _s(297 + rowOffsetX * row - 1);
      this.quotes[row].y = _s(36 + rowOffsetY * row + 2);

      this.bars[row][0].rotation = (Math.PI * 90) / 180;
      this.bars[row][1].rotation = (Math.PI * 90) / 180;

      LayoutHelper.setScaledRectangleSprite(this.bars[row][0], 155 + rowOffsetX * row, 70 + rowOffsetY * row, 4, 26);
      LayoutHelper.setScaledRectangleSprite(this.bars[row][1], 184 + rowOffsetX * row, 70 + rowOffsetY * row, 4, 26);
    }
  }

  public updateAnim(baseFactor: number, duration: number): void {
    DiagonalFadeHelper.FadeDiagonal(this, baseFactor, duration, 0.9, 0.3, 1, Logic.videoScreen.width, Logic.videoScreen.height);
    for (const place of this.places) {
      for (const entry of place) entry.alpha = Math.min(entry.alpha, 0.6);
    }
    AnimHelper.animateIn(baseFactor, 0.3, 1, 0.5, -30, 0, (x) => this.onLayoutRow(-11 + x));
  }
}
