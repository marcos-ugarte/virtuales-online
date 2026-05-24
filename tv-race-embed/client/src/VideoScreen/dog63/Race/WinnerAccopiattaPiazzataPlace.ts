import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IDog63QuoteInfo } from "client/Logic/LogicDefinitions";
import { DrawHelper } from "../../common/DrawHelper";
import { GameType, GameLength } from "common/Definitions";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { Dog63Helper } from "../Dog63Helper";

export class WinnerAccoppiattaPiazzataPlace extends Group {
  private places: PIXI.Text[] = [];
  private bars: PIXI.Sprite[] = [];
  private quote: PIXI.Text;

  public constructor(gameType: GameType, gameLength: GameLength, index: number) {
    super();

    this.showDebug(settings.debug, undefined, "P" + index);
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(17),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(0),
        align: "left"
      });
      for (let i = 0; i < 2; i++) {
        const place = Logic.createPixiText(style);
        place.anchor.set(0.5, 1.0);
        place.alpha = 0.6;
        this.add(place);
        this.places.push(place);

        const bar = new PIXI.Sprite();
        bar.anchor.set(0.5, 0.5);
        this.bars.push(bar);
        this.add(bar);
      }
    }

    // quote
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(24),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(-1),
        align: "left"
      });
      this.quote = Logic.createPixiText(style);
      this.quote.anchor.set(1, 1);
      this.add(this.quote);
    }
  }

  public fill(places: number[], drivers: IDriver[], quote: IDog63QuoteInfo): void {
    this.places[0].text = (places[0] + 1).toString();
    this.places[1].text = (places[1] + 1).toString();
    this.quote.text = Dog63Helper.formatQuote(quote.quote, quote.betCodeId);

    const driverFirst = drivers[places[0]];
    const driverSecond = drivers[places[1]];
    this.bars[0].texture = DrawHelper.getCachedPattern(6, 32, 0, driverFirst.color, driverFirst.color2, driverFirst.driverPattern);
    this.bars[1].texture = DrawHelper.getCachedPattern(6, 32, 0, driverSecond.color, driverSecond.color2, driverSecond.driverPattern);
  }

  public onLayout(): void {
    this.places[0].x = _s(17);
    this.places[0].y = _s(15);
    this.places[1].x = _s(34);
    this.places[1].y = _s(15);
    this.quote.x = _s(44);
    this.quote.y = _s(41);

    this.bars[0].rotation = (Math.PI * 90) / 180;
    this.bars[1].rotation = (Math.PI * 90) / 180;
    LayoutHelper.setScaledRectangleSprite(this.bars[0], 15, 18, 4, 17);
    LayoutHelper.setScaledRectangleSprite(this.bars[1], 34, 18, 4, 17);
  }

  public updateAnim(baseFactor: number): void {
    this.places[0].alpha = Math.min(this.places[0].alpha, 0.6);
    this.places[1].alpha = Math.min(this.places[0].alpha, 0.6);
  }
}
