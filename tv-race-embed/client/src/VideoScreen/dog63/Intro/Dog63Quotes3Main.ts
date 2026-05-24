import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IAnimInterval, IDog63RoundHistory, DriverPattern } from "client/Logic/LogicDefinitions";
//import { BonusAnnotationDog } from "./BonusAnnotationDog";
import { GameType, GameLength } from "common/Definitions";
import { Dog63Helper } from "../Dog63Helper";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";

export class Dog63Quotes3Main extends Group {
  private titleText: PIXI.Text;
  private subTitleText: PIXI.Text;
  private subTitleTextVert: PIXI.Text;
  private numbersHorizontal: PIXI.Text[] = [];
  private numbersVertical: PIXI.Text[] = [];
  private barsHorizontal: PIXI.Sprite[] = [];
  private barsVertical: PIXI.Sprite[] = [];

  private horzHeader: PIXI.Text;
  private vertHeader: PIXI.Text;
  private quotes: PIXI.Text[][] = [];

  // private rows: RowItem[] = [];
  private anims: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number })[] = [];
  private gameType: GameType;
  private gameLength: GameLength;

  private quotesStyleRegular: PIXI.TextStyle;
  private quotesStyleBold: PIXI.TextStyle;

  public constructor(gameType: GameType, gameLength: GameLength) {
    super();

    this.gameType = gameType;
    this.gameLength = gameLength;

    this.showDebug(settings.debug, undefined, "Quotes Main");

    this.quotesStyleRegular = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(26),
      fill: Dog63Helper.getWhiteColor(),
      trim: true,
      padding: 10,
      align: "center",
      letterSpacing: _s(-1)
    });
    this.quotesStyleBold = new PIXI.TextStyle({
      fontFamily: "DIN-Bold",
      fontSize: _s(26),
      fill: Dog63Helper.getWhiteColor(),
      trim: true,
      padding: 10,
      align: "center",
      letterSpacing: _s(-1)
    });

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(14),
        trim: true,
        padding: 10,
        fill: "black",
        align: "center",
        letterSpacing: 1
      });
      this.titleText = Logic.createPixiText(style);
      this.titleText.anchor.set(0.5, 0);
      this.add(this.titleText);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(10),
        trim: true,
        padding: 10,
        fill: Dog63Helper.getBlackColor(),
        letterSpacing: 2,
        align: "center"
      });
      this.subTitleText = Logic.createPixiText(style);
      this.subTitleText.roundPixels = false;
      this.subTitleText.anchor.set(0.5);
      this.add(this.subTitleText);
      this.subTitleTextVert = Logic.createPixiText(style);
      this.subTitleTextVert.anchor.set(0.5);
      this.add(this.subTitleTextVert);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Regular",
        fontSize: _s(20),
        fill: Dog63Helper.getWhiteColor(),
        align: "center"
      });
      this.horzHeader = Logic.createPixiText(style);
      //this.add(this.horzHeader);
      this.vertHeader = Logic.createPixiText(style);
      //this.add(this.vertHeader);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(28),
        fill: Dog63Helper.getWhiteColor(),
        align: "center"
      });
      for (let i = 0; i < 6; i++) {
        const numberHorz = Logic.createPixiText(style);
        numberHorz.anchor.set(0.5, 0);
        this.numbersHorizontal.push(numberHorz);
        //this.add(numberHorz);

        const numberVert = Logic.createPixiText(style);
        numberVert.anchor.set(0.5, 0);
        this.numbersVertical.push(numberVert);
        //this.add(numberVert);

        const barHorz = new PIXI.Sprite();
        barHorz.anchor.set(0.5, 0.5);
        this.barsHorizontal.push(barHorz);
        //this.add(barHorz);

        const barVert = new PIXI.Sprite();
        barVert.anchor.set(0.5, 0.5);
        this.barsVertical.push(barVert);
        //this.add(barVert);
      }
    }
    {
      for (let row = 0; row < 6; row++) {
        const rowQuotes: PIXI.Text[] = [];
        for (let column = 0; column < 6; column++) {
          const quote = Logic.createPixiText(this.quotesStyleRegular);
          quote.anchor.set(0.5);
          rowQuotes.push(quote);
          this.add(quote);
        }
        this.quotes.push(rowQuotes);
      }
    }
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean): IAnimInterval[] {
    {
      return [{ startTime: 30.3, duration: 15.3 }, { startTime: 96.1, duration: 14.6 }, { startTime: 148.9, duration: withBonus ? 10.5 : 15.0 } as IAnimInterval];
    }
  }

  public fill(drivers: IDriver[], odds: number[], withBonus: boolean, oddsGridFirstTwoInOrder: boolean): void {
    this.titleText.text = _t("firstTwoInOrder");
    this.subTitleText.text = _t("second");
    this.subTitleTextVert.text = _t("winner");

    this.horzHeader.text = _t("numberSign");
    this.vertHeader.text = _t("numberSignTwo");

    for (let i = 0; i < 6; i++) {
      this.numbersHorizontal[i].text = (i + 1).toString();
      this.numbersVertical[i].text = (i + 1).toString();

      const driver = drivers[i];
      this.barsHorizontal[i].texture = DrawHelper.getCachedPattern(
        6,
        32,
        0,
        driver.color,
        driver.color2,
        driver.driverPattern === DriverPattern.BLACK_WHITE_6 ? DriverPattern.BLACK_WHITE_6_b : driver.driverPattern
      );
      this.barsVertical[i].texture = DrawHelper.getCachedPattern(6, 32, 0, driver.color, driver.color2, driver.driverPattern);
    }

    const racerCount = drivers.length;

    const mappedOdds: number[] = [];

    for (let iRow = 0; iRow < racerCount; iRow++) {
      for (let iCol = 0; iCol < racerCount; iCol++) {
        const val = Logic.getDog63OddsForDriver(odds, iRow, iCol, racerCount, oddsGridFirstTwoInOrder);
        mappedOdds.push(val);
      }
    }

    odds = mappedOdds;
    const minMax = Logic.calcOddsMinMax(odds, drivers.length);

    for (let iRow = 0; iRow < racerCount; iRow++) {
      for (let iCol = 0; iCol < racerCount; iCol++) {
        const val = Logic.getOddsForDriver(odds, iCol, iRow, racerCount);
        const oddsColor = Logic.getOddsColor(minMax, val, iRow, iCol);
        const text = this.quotes[iRow][iCol];

        if (iRow === iCol) {
          text.text = Dog63Helper.formatQuote(val, 1);
          // winnerbet
          text.style = oddsColor !== "white" ? this.quotesStyleBold : this.quotesStyleRegular; // TODO: MS Correct winnerbet calculation - is off in DogOddsscreen ? makes everything bold that's not white
        } else {
          text.text = Dog63Helper.formatQuote(val, 2);
          text.style = this.quotesStyleRegular;
        }

        if (oddsColor === "green") text.tint = Dog63Helper.getGreenColorNumber();
        else if (oddsColor === "red") text.tint = Dog63Helper.getRedColorNumber();
        else text.tint = 0xffffff;
      }
    }

    // for (let row = 0; row < 6; row++){
    //   for (let column = 0; column < 6; column++){
    //     // this.quotes[row][column].text = odds[row][column].toFixed(2);
    //     this.quotes[row][column].text = Dog63Helper.formatQuote(odds[row*6+column]);
    //   }
    // }

    this.anims = this.createAnims(this.gameType, Logic.implementation.getCurrentIntroGameLength(), withBonus);
  }

  public onLayout(): void {
    let winnerTop = 10;
    if (Logic.isMacAddressDevice) {
      winnerTop = 9;
    }

    this.titleText.x = _s(164);
    this.titleText.y = _s(0);
    this.subTitleText.x = _s(588);
    this.subTitleText.y = _s(winnerTop);
    // this.horzHeader.x = _s(25);
    // this.horzHeader.y = _s(27);
    // this.vertHeader.x = _s(10);
    // this.vertHeader.y = _s(49);

    const columnOffsetX = 108;
    const rowOffsetY = 85;

    const columnWidth = 94;
    const rowHeight = 47.5;

    let subVertX = -11;
    if (Logic.isMacAddressDevice) {
      subVertX = -17;
    }

    this.subTitleTextVert.x = _s(subVertX);
    this.subTitleTextVert.y = _s(308);
    this.subTitleTextVert.rotation = (-90 * Math.PI) / 180;

    const quotesY: number[] = [107, 200, 296, 391, 488, 578];

    for (let row = 0; row < 6; row++) {
      this.numbersVertical[row].x = _s(23);
      this.numbersVertical[row].y = _s(rowOffsetY + rowHeight * row);

      for (let column = 0; column < 6; column++) {
        if (row === 0) {
          this.numbersHorizontal[column].x = _s(columnOffsetX + columnWidth * column);
          this.numbersHorizontal[column].y = _s(25);
        }

        this.quotes[row][column].x = _s(quotesY[column]); // _s(columnOffsetX + column*columnWidth);
        this.quotes[row][column].y = _s(rowOffsetY + rowHeight * row);
      }

      const column = row;
      this.barsHorizontal[row].rotation = (-Math.PI * 90.0) / 180.0;
      LayoutHelper.setScaledRectangleSprite(this.barsHorizontal[row], columnOffsetX + column * columnWidth, 60, 6, 68);
      LayoutHelper.setScaledRectangleSprite(this.barsVertical[row], 51, row * rowHeight + rowOffsetY + 13, 6, 38);
    }
  }
}
