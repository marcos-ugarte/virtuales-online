import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, _t, Logic, settings } from "client/Logic/Logic";
//import { MultiStyleText, ITextStyleSet, IExtendedTextStyle, } from "./../common/MultiStyleText";
import { IAnimInterval, IDriver, IResultBet } from "client/Logic/LogicDefinitions";
import { ResultBetEntry } from "./ResultBetEntry";
import { DrawHelper } from "../common/DrawHelper";
import { AnimHelper } from "../common/Anim";
import { Settings } from "common/Settings";
import { LanguagesBase } from "client/LogicImplementation/base/LocalisationBase";
import { Util } from "common/Util";
//import { AnimHelper } from "../common/Anim";

export class ResultBetTable extends Group {
  //private isLeft: boolean;

  private headers: PIXI.Text[] = [];
  private quoteHeader: PIXI.Text;
  private headersX: number[] = [];
  private rounds: ResultBetEntry[][] = [];
  private quotes: PIXI.Text[] = [];
  private quotesX: number[] = [];

  //private clippingMaskQuotes: PIXI.Sprite;
  private isLeft: boolean = false;

  //private mainMask: PIXI.Sprite|undefined;
  //private driverInfos: MultiStyleText[] = [];

  //private quote: PIXI.Text;

  private anims: IAnimInterval[] = [
    { startTime: 37, duration: 33 },
    { startTime: 132.8, duration: 33.03 },
    { startTime: 219.2, duration: 30.4 }
  ];

  public constructor(isLeft: boolean, mask: PIXI.Sprite | undefined) {
    super();
    this.showDebug(settings.debug, undefined, "ResultBetTable");

    //this.mainMask = mask;
    this.isLeft = isLeft;

    const headerStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(14),
      fill: "white",
      fontStyle: "italic"
    });

    for (let i = 0; i < 3; i++) {
      const header = Logic.createPixiText(headerStyle);
      header.anchor.set(0.5, 0.5);
      // if (mask)
      //   header.mask = mask;
      this.headers.push(header);
      this.headersX.push(0);
      this.add(header);
    }

    this.quoteHeader = Logic.createPixiText(headerStyle);
    // if (mask)
    //   this.quoteHeader.mask = mask;
    this.quoteHeader.anchor.set(0.5, 0.5);
    this.headersX.push(0);
    this.add(this.quoteHeader);

    // const roundStyle  = new PIXI.TextStyle({
    //   fontFamily: "DIN-Bold",
    //   fontSize: _s(10),
    //   fill: "white",
    // });

    const numRows = 13;

    const backgroundTexture = DrawHelper.createNGonTexture(30, 6, "white");

    for (let column = 0; column < 3; column++) {
      this.rounds.push([]);
      const columnList = this.rounds[column];
      for (let row = 0; row < numRows; row++) {
        const resultBetEntry = new ResultBetEntry(backgroundTexture, mask);
        columnList.push(resultBetEntry);
        this.add(resultBetEntry);
      }
    }

    // this.clippingMaskQuotes = new PIXI.Sprite(PIXI.Texture.WHITE);
    // this.add(this.clippingMaskQuotes);

    const quoteStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(18),
      fill: "white",
      fontStyle: "italic"
    });

    for (let row = 0; row < numRows; row++) {
      const quoteText = Logic.createPixiText(quoteStyle);
      // if (mask)
      //   quoteText.mask = mask;
      // else
      //   quoteText.mask = this.clippingMaskQuotes;
      quoteText.anchor.set(0.5, 0.5);
      this.quotes.push(quoteText);
      this.quotesX.push(0);
      this.add(quoteText);
    }

    // this.anims = [{
    //     startTime: 3,
    //     duration: 9
    // }]
  }

  public fill(drivers: IDriver[], bets: IResultBet[]) {
    let row = 0;

    this.headers[0].text = _t("roundShort") + "1";
    this.headers[1].text = _t("roundShort") + "2";
    this.headers[2].text = _t("roundShort") + "3";
    this.quoteHeader.text = _t("quote");

    for (const bet of bets) {
      this.quotes[row].text = Util.formatValue(bet.quote, Settings.kickboxQuotaDecimalPlaces, LanguagesBase.commaSymbol);
      this.rounds[0][row].fill(bet.r1, drivers);
      this.rounds[1][row].fill(bet.r2, drivers);
      this.rounds[2][row].fill(bet.r3, drivers);
      row++;
    }

    Logic.autoSize(this.headers[0], _s(40));
    Logic.autoSize(this.headers[1], _s(40));
    Logic.autoSize(this.headers[2], _s(40));
    Logic.autoSize(this.quoteHeader, _s(50));

    this.onLayout();
  }

  public onLayout() {
    const columnsX = [_s(26), _s(71), _s(116.5), _s(224)];
    const headerY = _s(22);

    const columnsXHeader = [_s(40), _s(85), _s(131), _s(222)];

    this.headers[0].x = columnsXHeader[0];
    this.headers[1].x = columnsXHeader[1];
    this.headers[2].x = columnsXHeader[2];
    this.quoteHeader.x = columnsXHeader[3];

    this.headersX[0] = this.headers[0].x;
    this.headersX[1] = this.headers[1].x;
    this.headersX[2] = this.headers[2].x;
    this.headersX[3] = this.quoteHeader.x;

    this.headers[0].y = headerY;
    this.headers[1].y = headerY;
    this.headers[2].y = headerY;
    this.quoteHeader.y = headerY;

    const firstRowY = _s(43);
    const lineHeight = _s(37);

    // this.clippingMaskQuotes.width = _s(67);
    // this.clippingMaskQuotes.height = _s(700);
    // this.clippingMaskQuotes.y = _s(0);
    // this.clippingMaskQuotes.x = this.isLeft ? _s(512-321) : _s(867-681);

    //LayoutHelper.setScaledRectangleSprite(this.clippingMaskQuotes, this.isLeft ? _s(512) : _s(867), _s(54), _s(67), _s(700));

    // this.clippingMaskQuotes.x
    // {
    //   this.clippingMaskQuotes.cacheAsBitmap = false;
    //   this.clippingMaskQuotes.beginFill(0xFFFFFF);
    //   this.clippingMaskQuotes.drawRect(this.isLeft ? _s(512) : _s(867), _s(54), _s(67), _s(7000));
    //   this.clippingMaskQuotes.endFill();
    //   this.clippingMaskQuotes.renderable = true;
    //   this.clippingMaskQuotes.cacheAsBitmap = true;
    // }

    const rowCount = 13;
    for (let column = 0; column < 3; column++) {
      for (let row = 0; row < rowCount; row++) {
        const curY = firstRowY + lineHeight * row;
        this.rounds[column][row].x = columnsX[column];
        this.rounds[column][row].y = curY;
        this.rounds[column][row].width = _s(30);
        this.rounds[column][row].height = _s(30);
        if (column === 0) {
          this.quotes[row].x = columnsX[3] - _s(3);
          this.quotesX[row] = this.quotes[row].x;
          this.quotes[row].y = curY + _s(13);
        }
      }
    }
  }

  public updateAnims(baseFactor: number, duration: number, doNotFadeOut: boolean) {
    this.showDebugTime("ResultBetTable", baseFactor);

    const timeOffset = 0.1;
    let i = 0;
    for (const header of this.headers) {
      AnimHelper.animateIn(baseFactor, 0.8 + i * timeOffset, 2, 0.5, 0, 1, (x) => (header.alpha = x));
      AnimHelper.animateIn(baseFactor, 0.8 + i * timeOffset, 2, 0.5, _s(-30), 0, (x) => (header.x = this.headersX[i] + x));
      i++;
    }

    // quoteHeader
    AnimHelper.animateIn(baseFactor, 0.8 + 3 * timeOffset, 2, 0.5, 0, 1, (x) => (this.quoteHeader.alpha = x));
    AnimHelper.animateIn(baseFactor, 0.8 + 3 * timeOffset, 2, 0.5, _s(-30), 0, (x) => (this.quoteHeader.x = this.headersX[3] + x));

    i = 0;
    const quoteLineTimeOffset = 0.095;
    for (const quote of this.quotes) {
      AnimHelper.animateIn(baseFactor, (this.isLeft ? 1.32 : 1.6) + i * quoteLineTimeOffset, 2, 0.3, _s(-100), 0, (x) => (quote.x = this.quotesX[i] + x));
      AnimHelper.animateIn(baseFactor, (this.isLeft ? 1.32 : 1.6) + i * quoteLineTimeOffset, 2, 0.3, 0, 1, (x) => (quote.alpha = x));
      i++;
    }

    const rowOffset = 0.125;
    const columnOffset = 0.1;

    for (let column = 0; column < this.rounds.length; column++) {
      for (let row = 0; row < this.rounds[column].length; row++) {
        AnimHelper.animateIn(baseFactor, (this.isLeft ? 1.0 : 1.2) + row * rowOffset + column * columnOffset, 10, 0.3, 0, _s(1), (x) => this.rounds[column][row].scaleBackground(x));
        AnimHelper.animateIn(baseFactor, (this.isLeft ? 1.0 : 1.2) + row * rowOffset + column * columnOffset, 10, 0.3, 0, 1, (x) => this.rounds[column][row].scaleText(x));
      }
    }

    const rowBlinkStart = 11.8;
    const rowBlinkDuration = 0.75;
    const rowBlinkFadeTime = 0.3;
    const rowBlinkOffset = 0.76;

    for (let row = 0; row < this.quotes.length; row++) {
      AnimHelper.animateColorInOut(
        baseFactor,
        rowBlinkStart + rowBlinkOffset * row,
        rowBlinkStart + rowBlinkOffset * row + rowBlinkDuration,
        rowBlinkFadeTime,
        0xffffff,
        0,
        (x) => (this.quotes[row].tint = x),
        rowBlinkFadeTime,
        0xffffff
      );
    }

    const fadeOutDuration = 0.5;
    const fadeOutRowOffset = 0.1;
    //if (this.mainMask === undefined)
    {
      for (let row = 0; row < this.quotes.length; row++) {
        //const timeFactor = baseFactor - (duration - fadeOutStart) - (this.quotes.length - row)*fadeOutRowOffset;
        if (baseFactor > 10) AnimHelper.animateInOut(baseFactor, 0, duration - row * fadeOutRowOffset, 0, 0, 1, (x) => (this.quotes[row].alpha = x), fadeOutDuration, doNotFadeOut ? 1 : 0); // do not fade out

        for (let column = 0; column < 3; column++) {
          AnimHelper.animateInOut(baseFactor, 0, duration - row * fadeOutRowOffset, 0, 0, 1, (x) => (this.rounds[column][row].alpha = x), fadeOutDuration, doNotFadeOut ? 1 : 0);
        }

        //this.quotes[row].alpha = 1;
      }
    }
  }
}
