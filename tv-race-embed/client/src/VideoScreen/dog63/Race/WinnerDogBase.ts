import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t } from "client/Logic/Logic";
import { DrawHelper } from "../../common/DrawHelper";
import { GameType, GameLength } from "common/Definitions";
import { Dog63Helper } from "../Dog63Helper";
import { IAnimInterval, IDog63QuoteInfo, IDriver } from "client/Logic/LogicDefinitions";

export class WinnerDogBase extends Group {
  //private anims: (IAnimInterval & {fadeInFactor?: number; fadeOutFactor?: number})[] = [];
  protected gameType: GameType;
  protected gameLength: GameLength;

  protected header: PIXI.Text;
  protected driverNumber: PIXI.Text;
  protected driverName: PIXI.Text;
  protected driverTime: PIXI.Text;
  protected quoteHeaders: PIXI.Text[] = [];
  protected quotes: PIXI.Text[] = [];

  protected bar: PIXI.Sprite;

  protected scaleFactor: number;

  public constructor(
    gameType: GameType,
    gameLength: GameLength,
    fontSizeHeader: number,
    fontSizeTitle: number,
    fontSizeQuoteHeader: number,
    fontSizeFirstQuote: number,
    fontSizeQuote: number,
    scaleFactor: number = 1
  ) {
    super();

    this.scaleFactor = scaleFactor;
    this.gameType = gameType;
    this.gameLength = gameLength;

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(fontSizeHeader),
        fill: Dog63Helper.getBlackColor(),
        letterSpacing: _s(4.5),
        align: "center"
      });
      this.header = Logic.createPixiText(style);
      this.header.anchor.set(0.5, 0);
      this.add(this.header);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(fontSizeTitle),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(0),
        align: "right"
      });
      this.driverNumber = Logic.createPixiText(style);
      this.driverNumber.anchor.set(1, 0.5);
      this.add(this.driverNumber);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-RegularItalic",
        fontSize: _s(fontSizeTitle),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(0.5),
        align: "left"
      });
      this.driverName = Logic.createPixiText(style);
      this.add(this.driverName);
      this.driverName.anchor.set(0, 0.5);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-LightItalic",
        fontSize: _s(fontSizeTitle),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(0),
        align: "right"
      });
      this.driverTime = Logic.createPixiText(style);
      this.driverTime.anchor.set(1, 0.5);
      //this.driverTime.alpha = 0.5;
      this.add(this.driverTime);
    }

    {
      const styleQuoteHeader = new PIXI.TextStyle({
        fontFamily: "DIN-LightItalic",
        fontSize: _s(fontSizeQuoteHeader),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(-0.25),
        align: "left"
      });
      const styleQuote = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(fontSizeQuote),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(-1),
        align: "right"
      });
      const styleFirstQuote = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(fontSizeFirstQuote),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(-1),
        align: "right"
      });

      for (let i = 0; i < 3; i++) {
        const header = Logic.createPixiText(styleQuoteHeader);
        this.quoteHeaders.push(header);
        this.add(header);

        const quote = Logic.createPixiText(i === 0 ? styleFirstQuote : styleQuote);
        quote.anchor.set(1, 0.5);
        this.quotes.push(quote);
        this.add(quote);
      }

      this.bar = new PIXI.Sprite();
      this.bar.anchor.set(0.5, 0.5);
      this.add(this.bar);
    }
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean): IAnimInterval[] {
    {
      return [{ startTime: 10, duration: 50.8 }];
    }
  }

  public fill(withBonus: boolean, driverNumber: number, driver: IDriver, driverTime: string, quotes: IDog63QuoteInfo[]): void {
    this.driverNumber.text = driverNumber.toString();
    this.driverName.text = driver.firstName;

    this.driverTime.text = driverTime;

    if (this.gameType === "dog63") {
      Logic.autoSize(this.driverName, this.driverTime.x - this.driverName.x + -this.driverTime.width - 5);
    }

    this.quotes[0].text = Dog63Helper.formatQuote(quotes[0].quote, quotes[0].betCodeId);
    if (quotes.length > 1) this.quotes[1].text = Dog63Helper.formatQuote(quotes[1].quote, quotes[1].betCodeId);
    if (quotes.length > 2) this.quotes[2].text = Dog63Helper.formatQuote(quotes[2].quote, quotes[2].betCodeId);
    this.quotes[2].visible = quotes.length > 2;

    this.bar.texture = DrawHelper.getCachedPattern(10, 20, 5, driver.color, driver.color2, driver.driverPattern);
    // DrawHelper.createSkewedRoundedRectangleTexture(20, 32, 0, 5, new FillStyle(){ fill:
    // this.bar.texture = DrawHelper.getCachedPattern(6, 32, 0, driver.color, driver.color2, driver.driverPattern);//
  }

  public onLayout(): void {
    this.header.x = _s(432 * this.scaleFactor);
    this.header.y = _s(7 * this.scaleFactor);
    this.bar.x = _s(274) * this.scaleFactor;
    this.bar.y = _s(36.5) * this.scaleFactor;
    this.bar.width = _s(7) * this.scaleFactor;
    this.bar.height = _s(19) * this.scaleFactor;

    const driverInfoY = 36 * this.scaleFactor;

    this.driverNumber.x = _s(266 * this.scaleFactor);
    this.driverNumber.y = _s(driverInfoY);
    this.driverName.x = _s(296 * this.scaleFactor);

    this.driverName.y = _s(driverInfoY);

    this.driverTime.x = _s(471 * this.scaleFactor);
    this.driverTime.y = _s(driverInfoY);

    this.quoteHeaders[0].visible = false; // turn it off for dog 1
    this.quotes[0].x = _s(459 * this.scaleFactor);
    this.quotes[0].y = _s(79 * this.scaleFactor);

    this.quoteHeaders[1].x = _s(380 * this.scaleFactor);
    this.quoteHeaders[1].y = _s(115 * this.scaleFactor);
    this.quotes[1].x = _s(451 * this.scaleFactor);
    this.quotes[1].y = _s(145 * this.scaleFactor);

    this.quoteHeaders[2].x = _s(370 * this.scaleFactor);
    this.quoteHeaders[2].y = _s(172 * this.scaleFactor);
    this.quotes[2].x = _s(441 * this.scaleFactor);
    this.quotes[2].y = _s(201 * this.scaleFactor);
  }

  public updateAnim(baseFactor: number, duration: number) {}
}
