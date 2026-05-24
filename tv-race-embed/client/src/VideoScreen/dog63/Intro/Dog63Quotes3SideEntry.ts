import { dog63Quotes3SideEntrySettings } from "./../../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IAnimInterval, IDog63RoundHistory } from "client/Logic/LogicDefinitions";
//import { BonusAnnotationDog } from "./BonusAnnotationDog";
import { GameType, GameLength } from "common/Definitions";
import { Dog63Helper } from "../Dog63Helper";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { TilingSprite } from "pixi.js";

export class Dog63Quotes3SideEntry extends Group {
  private places: PIXI.Text[] = [];
  private quote: PIXI.Text;
  private firstBar: PIXI.Sprite;
  private secondBar: PIXI.Sprite;
  private thirdBar: PIXI.Sprite;

  private quoteStyleRegular: PIXI.TextStyle;
  private quoteStyleBold: PIXI.TextStyle;
  private oddsAlwaysOn: boolean;

  public constructor(gameType: GameType, gameLength: GameLength, oddsAlwaysOn = false) {
    super();

    this.oddsAlwaysOn = oddsAlwaysOn;
    this.showDebug(settings.debug);

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(18),
        fill: Dog63Helper.getWhiteColor(),
        align: "center"
      });
      for (let i = 0; i < 3; i++) {
        const place = Logic.createPixiText(style);
        place.anchor.set(0.5, 0);
        this.places.push(place);
        this.add(place);
      }
    }
    {
      this.quoteStyleRegular = new PIXI.TextStyle({
        fontFamily: "DIN-Regular",
        fontSize: _s(18),
        fill: Dog63Helper.getWhiteColor(),
        align: "center",
        letterSpacing: _s(-0.5)
      });
      this.quoteStyleBold = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(18),
        fill: Dog63Helper.getWhiteColor(),
        align: "center",
        letterSpacing: _s(-0.5)
      });
      this.quote = Logic.createPixiText(this.quoteStyleRegular);
      this.quote.anchor.set(0.5, 0);
      this.add(this.quote);
    }

    this.firstBar = new PIXI.Sprite();
    this.add(this.firstBar);

    this.secondBar = new PIXI.Sprite();
    this.add(this.secondBar);

    this.thirdBar = new PIXI.Sprite();
    this.add(this.thirdBar);
  }

  public fill(drivers: IDriver[], driverIndices: number[], quote: number, quoteId: number, minValue: number, maxValue: number): void {
    this.quote.text = Dog63Helper.formatQuote(quote, 6);
    this.quote.tint = Dog63Helper.getWhiteColorNumber();
    if (quote === minValue) {
      this.quote.tint = Dog63Helper.getGreenColorNumber();
      this.quote.style = this.quoteStyleBold;
    } else if (quote === maxValue) {
      this.quote.tint = Dog63Helper.getRedColorNumber();
      this.quote.style = this.quoteStyleBold;
    } else {
      this.quote.style = this.quoteStyleRegular;
    }

    this.quote.style.trim = true;
    this.quote.style.padding = 10;

    this.places[0].text = (1 + driverIndices[0]).toString();
    this.places[1].text = (1 + driverIndices[1]).toString();
    this.places[2].text = (1 + driverIndices[2]).toString();

    const driverFirst = drivers[driverIndices[0]];
    const driverSecond = drivers[driverIndices[1]];
    const driverThird = drivers[driverIndices[2]];
    this.firstBar.texture = DrawHelper.getCachedPattern(6, 32, 0, driverFirst.color, driverFirst.color2, driverFirst.driverPattern);
    this.secondBar.texture = DrawHelper.getCachedPattern(6, 32, 0, driverSecond.color, driverSecond.color2, driverSecond.driverPattern);
    this.thirdBar.texture = DrawHelper.getCachedPattern(6, 32, 0, driverThird.color, driverThird.color2, driverThird.driverPattern);
  }

  public onLayout(): void {
    const placeOffsetY = 0;
    this.places[0].x = _s(19);
    this.places[0].y = _s(placeOffsetY);
    this.places[1].x = _s(47);
    this.places[1].y = _s(placeOffsetY);
    this.places[2].x = _s(73);
    this.places[2].y = _s(placeOffsetY);
    this.quote.x = _s(45);
    this.quote.y = _s(26);

    let barWidth = 26;
    let barOffsetX = 20;
    let barOffsetY = 17;

    if (this.oddsAlwaysOn) {
      const { firstX, secondX, thirdX, quote, barWidth: width, barOffsetX: xOffset, barOffsetY: yOffset } = dog63Quotes3SideEntrySettings;

      this.places[0].x = _s(firstX);
      this.places[1].x = _s(secondX);
      this.places[2].x = _s(thirdX);

      this.quote.y = _s(quote.y);
      this.quote.x = _s(quote.x);

      barWidth = width;
      barOffsetX = xOffset;
      barOffsetY = yOffset;
    }

    this.firstBar.rotation = (Math.PI * 90.0) / 180.0;
    LayoutHelper.setScaledRectangleSprite(this.firstBar, barOffsetX + barWidth / 2, barOffsetY, 5, barWidth);
    this.secondBar.rotation = (Math.PI * 90.0) / 180.0;
    LayoutHelper.setScaledRectangleSprite(this.secondBar, barOffsetX + barWidth / 2 + barWidth, barOffsetY, 5, barWidth);
    this.thirdBar.rotation = (Math.PI * 90.0) / 180.0;
    LayoutHelper.setScaledRectangleSprite(this.thirdBar, barOffsetX + barWidth / 2 + barWidth * 2, barOffsetY, 5, barWidth);
  }
}
