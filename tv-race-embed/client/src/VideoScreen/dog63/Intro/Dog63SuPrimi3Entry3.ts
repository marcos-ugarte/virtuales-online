import { dog63SuPrimiSmallSettings, dog63SuPrimiSmallStyles } from "./../../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings } from "client/Logic/Logic";
import { IDriver, IDog63SuprimiEntry } from "client/Logic/LogicDefinitions";
//import { GameType, GameLength } from "common/Definitions";
import { Dog63Helper } from "../Dog63Helper";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";

export class Dog63SuPrimi3Entry3 extends Group {
  private first: PIXI.Text;
  private second: PIXI.Text;
  private third: PIXI.Text;
  private quote: PIXI.Text;
  private firstBar: PIXI.Sprite;
  private secondBar: PIXI.Sprite;
  private thirdBar: PIXI.Sprite;
  private oddsAlwaysOn: boolean;

  private quoteStyleRegular: PIXI.TextStyle;
  private quoteStyleBold: PIXI.TextStyle;

  public constructor(oddsAlwaysOn = false) {
    super();

    this.showDebug(settings.debug);
    this.oddsAlwaysOn = oddsAlwaysOn;

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
      // this.add(this.first);

      this.second = Logic.createPixiText(style);
      this.second.anchor.set(0.5, 0);
      //this.add(this.second);

      this.third = Logic.createPixiText(style);
      this.third.anchor.set(0.5, 0);
      //this.add(this.third);
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
        const { fontSize } = dog63SuPrimiSmallStyles.bigGrid.quotes;

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

    this.thirdBar = new PIXI.Sprite();
    //this.add(this.thirdBar);
  }

  public fill(drivers: IDriver[], suprimiEntry: IDog63SuprimiEntry, minValue: number, maxValue: number): void {
    this.first.text = "" + (suprimiEntry.drivers[0] + 1);
    this.second.text = "" + (suprimiEntry.drivers[1] + 1);
    this.third.text = "" + (suprimiEntry.drivers[2] + 1);
    this.quote.text = Dog63Helper.formatQuote(suprimiEntry.quote, suprimiEntry.betCodeId);

    this.quote.tint = Dog63Helper.getWhiteColorNumber();
    this.quote.style = this.quoteStyleRegular;
    if (suprimiEntry.quote === minValue) {
      this.quote.tint = Dog63Helper.getGreenColorNumber();
      this.quote.style = this.quoteStyleBold;
    } else if (suprimiEntry.quote === maxValue) {
      this.quote.tint = Dog63Helper.getRedColorNumber();
      this.quote.style = this.quoteStyleBold;
    }
    this.quote.style.trim = true;
    this.quote.style.padding = 10;

    const driverFirst = drivers[suprimiEntry.drivers[0]];
    const driverSecond = drivers[suprimiEntry.drivers[1]];
    const driverThird = drivers[suprimiEntry.drivers[2]];
    this.firstBar.texture = DrawHelper.getCachedPattern(6, 32, 0, driverFirst.color, driverFirst.color2, driverFirst.driverPattern);
    this.secondBar.texture = DrawHelper.getCachedPattern(6, 32, 0, driverSecond.color, driverSecond.color2, driverSecond.driverPattern);
    this.thirdBar.texture = DrawHelper.getCachedPattern(6, 32, 0, driverThird.color, driverThird.color2, driverThird.driverPattern);
  }

  public onLayout(): void {
    const numberY = 10;
    this.first.x = _s(24);
    this.first.y = _s(numberY);
    this.second.x = _s(52);
    this.second.y = _s(numberY);
    this.third.x = _s(84);
    this.third.y = _s(numberY);

    this.quote.x = _s(55);
    this.quote.y = _s(48);

    if (this.oddsAlwaysOn) {
      const { quotes } = dog63SuPrimiSmallSettings[0];

      this.quote.x = _s(quotes.x);
      this.quote.y = _s(quotes.y);
    }

    this.firstBar.rotation = (Math.PI * 90.0) / 180.0;
    LayoutHelper.setScaledRectangleSprite(this.firstBar, 39, 39, 5, 30);
    this.secondBar.rotation = (Math.PI * 90.0) / 180.0;
    LayoutHelper.setScaledRectangleSprite(this.secondBar, 39 + 30, 39, 5, 30);
    this.thirdBar.rotation = (Math.PI * 90.0) / 180.0;
    LayoutHelper.setScaledRectangleSprite(this.thirdBar, 39 + 60, 39, 5, 30);
  }

  public updateAnim(baseFactor: number, duration: number): void {}
}
