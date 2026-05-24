import { dog63SuPrimiSmallSettings, dog63SuPrimiSmallStyles } from "./../../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IAnimInterval, IDog63RoundHistory, IDog63RoundHistoryP2P3, IDog63SuprimiEntry } from "client/Logic/LogicDefinitions";
import { GameType, GameLength } from "common/Definitions";
import { Dog63Helper } from "../Dog63Helper";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";

export class Dog63SuPrimi3Entry2 extends Group {
  private first: PIXI.Text;
  private second: PIXI.Text;
  private quote: PIXI.Text;
  private firstBar: PIXI.Sprite;
  private secondBar: PIXI.Sprite;

  private oddsAlwaysOn: boolean;

  private quoteStyleRegular: PIXI.TextStyle;
  private quoteStyleBold: PIXI.TextStyle;

  public constructor(oddsAlwaysOn = false) {
    super();
    this.oddsAlwaysOn = oddsAlwaysOn;
    this.showDebug(settings.debug);

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(24),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(0),
        align: "left"
      });
      this.first = Logic.createPixiText(style);
      this.first.anchor.set(0.5, 0);
      //this.add(this.first);

      this.second = Logic.createPixiText(style);
      this.second.anchor.set(0.5, 0);
      //this.add(this.second);
    }

    {
      this.quoteStyleRegular = new PIXI.TextStyle({
        fontFamily: "DIN-Regular",
        fontSize: _s(24),
        fill: Dog63Helper.getWhiteColor(),
        align: "left"
      });
      this.quoteStyleBold = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(24),
        fill: Dog63Helper.getWhiteColor(),
        align: "left"
      });

      if (oddsAlwaysOn) {
        const { fontSize } = dog63SuPrimiSmallStyles.smallGrid.quotes;
        this.quoteStyleRegular.fontSize = _s(fontSize);
        this.quoteStyleBold.fontSize = _s(fontSize);
      }

      this.quote = Logic.createPixiText(this.quoteStyleRegular);
      this.quote.anchor.set(0.5, 0);
      this.add(this.quote);
    }

    this.firstBar = new PIXI.Sprite();
    //this.add(this.firstBar);

    this.secondBar = new PIXI.Sprite();
    //this.add(this.secondBar);
  }

  public fill(drivers: IDriver[], suprimiEntry: IDog63SuprimiEntry, minValue: number, maxValue: number): void {
    this.first.text = "" + (suprimiEntry.drivers[0] + 1);
    this.second.text = "" + (suprimiEntry.drivers[1] + 1);
    this.quote.text = Dog63Helper.formatQuote(suprimiEntry.quote, suprimiEntry.betCodeId);
    this.quote.tint = Dog63Helper.getWhiteColorNumber();
    this.quote.style = this.quoteStyleRegular;
    if (suprimiEntry.quote === minValue) {
      this.quote.tint = Dog63Helper.getGreenColorNumber();
      this.quote.style = this.quoteStyleBold;
      this.quote.style.trim = true;
      this.quote.style.padding = 10;
    } else if (suprimiEntry.quote === maxValue) {
      this.quote.tint = Dog63Helper.getRedColorNumber();
      this.quote.style = this.quoteStyleBold;
      this.quote.style.trim = true;
      this.quote.style.padding = 10;
    }

    const driverFirst = drivers[suprimiEntry.drivers[0]];
    const driverSecond = drivers[suprimiEntry.drivers[1]];
    this.firstBar.texture = DrawHelper.getCachedPattern(6, 32, 0, driverFirst.color, driverFirst.color2, driverFirst.driverPattern);
    this.secondBar.texture = DrawHelper.getCachedPattern(6, 32, 0, driverSecond.color, driverSecond.color2, driverSecond.driverPattern);
  }

  public onLayout(): void {
    const numberY = 10;
    this.first.x = _s(36);
    this.first.y = _s(numberY);
    this.second.x = _s(66);
    this.second.y = _s(numberY);

    this.quote.x = _s(55);
    this.quote.y = _s(48);

    if (this.oddsAlwaysOn) {
      const { quotes } = dog63SuPrimiSmallSettings[1];

      this.quote.x = _s(quotes.x);
      this.quote.y = _s(quotes.y);
    }

    this.firstBar.rotation = (Math.PI * 90.0) / 180.0;
    LayoutHelper.setScaledRectangleSprite(this.firstBar, 36 + 15, 39, 5, 30);
    this.secondBar.rotation = (Math.PI * 90.0) / 180.0;
    LayoutHelper.setScaledRectangleSprite(this.secondBar, 66 + 15, 39, 5, 30);
  }

  public updateAnim(baseFactor: number, duration: number): void {}
}
