import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { AnimHelper } from "./../../common/Anim";
import { IDog63QuoteInfo } from "client/Logic/LogicDefinitions";
import { GameType, GameLength } from "common/Definitions";
import { DiagonalFadeHelper } from "client/VideoScreen/common/DiagonalFadeHelper";
import { Dog63Helper } from "../Dog63Helper";

export class WinnerBottom extends Group {
  private subHeaders: PIXI.Text[] = [];
  private placeText: PIXI.Text[] = [];
  private placePre: PIXI.Text[] = [];
  private placeQuote: PIXI.Text[] = [];

  public constructor(gameType: GameType, gameLength: GameLength) {
    super();

    this.showDebug(settings.debug, undefined, "WinnerBottom");

    const headerStyle = Dog63Helper.getRaceResultHeaderStyle();
    headerStyle.fontSize = _s(11);

    for (let i = 0; i < 3; i++) {
      const subHeader = Logic.createPixiText(headerStyle);
      subHeader.anchor.set(0.5, 0);
      this.subHeaders.push(subHeader);
      this.add(subHeader);
    }

    for (let i = 0; i < 4; i++) {
      const placeText = Logic.createPixiText(Dog63Helper.getRaceResultSubHeaderStyle());
      placeText.anchor.set(1, 0);
      this.placeText.push(placeText);
      this.add(placeText);

      const quoteStyle = Dog63Helper.getRaceResultPlaceStyle();
      quoteStyle.letterSpacing = _s(-1);
      const quote = Logic.createPixiText(quoteStyle);
      quote.anchor.set(0, 0);
      this.placeQuote.push(quote);
      this.add(quote);

      const pre = Logic.createPixiText(Dog63Helper.getRaceResultPlaceStyle());
      pre.anchor.set(1, 0);
      pre.tint = Dog63Helper.getBlueColorNumber();
      this.placePre.push(pre);
      this.add(pre);
    }
  }

  public fill(withBonus: boolean, prePlaces: number[], quotes: IDog63QuoteInfo[], oddEvenTxt: string, overUnderTxt: string): void {
    this.subHeaders[0].text = _t("oddTxt") + " / " + _t("evenTxt");
    this.subHeaders[1].text = _t("underTxt") + " / " + _t("overTxt");
    Logic.autoSize(this.subHeaders[0], _s(160));
    Logic.autoSize(this.subHeaders[1], _s(160));
    this.subHeaders[2].text = _t("sumPlaces");

    this.placeText[0].text = oddEvenTxt;
    Logic.autoSize(this.placeText[0], _s(76));
    this.placeText[1].text = overUnderTxt;
    Logic.autoSize(this.placeText[1], _s(76));
    this.placeText[2].text = _t("sumPlaceSh2");
    this.placeText[3].text = _t("sumPlaceSh3");

    this.placePre[2].text = prePlaces[0].toString();
    this.placePre[3].text = prePlaces[1].toString();

    for (let i = 0; i < 4; i++) {
      this.placeQuote[i].text = Dog63Helper.formatQuote(quotes[i].quote, quotes[i].betCodeId);
    }
  }

  public onLayout(): void {
    this.onLayoutwithOffset(0);
  }

  public onLayoutwithOffset(offsetX: number): void {
    this.subHeaders[0].x = _s(110 + offsetX);
    this.subHeaders[1].x = _s(292 + offsetX);
    this.subHeaders[2].x = _s(493 + offsetX);
    for (let i = 0; i < 3; i++) {
      this.subHeaders[i].y = _s(4);
    }

    const preX = [0, 0, 428, 608];
    const textX = [84, 272, 472, 654];
    const quoteX = [100, 287, 487, 667];
    for (let i = 0; i < 4; i++) {
      this.placePre[i].x = _s(preX[i] + offsetX);
      this.placeText[i].x = _s(textX[i] + offsetX);
      this.placeQuote[i].x = _s(quoteX[i] + offsetX);

      this.placePre[i].y = _s(32);
      this.placeText[i].y = _s(36);
      this.placeQuote[i].y = _s(32);
    }
  }

  public updateAnim(baseFactor: number, duration: number): void {
    DiagonalFadeHelper.FadeDiagonal(this, baseFactor + 0.15, duration, 0.9, 0.3, 1, Logic.videoScreen.width, Logic.videoScreen.height);
    AnimHelper.animateIn(baseFactor, 0.3, 1, 0.5, -50, 0, (x) => this.onLayoutwithOffset(x));
  }
}
