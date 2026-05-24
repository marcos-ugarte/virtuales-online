import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, _t, settings } from "client/Logic/Logic";
import { IDriver, IResult, IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../common/Anim";
import { WinnerHorseLine } from "./WinnerHorseLine";
import { GameType } from "common/Definitions";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { HorseHelper } from "client/VideoScreen/horse/HorseHelper";

type WinnerType = "winner" | "firstTwo";
type ScreenType = "winnerJust" | "Two";

export class WinnerHorse extends Group {
  public gameType: GameType;
  public winnerText: PIXI.Text;
  public winnerQuote: PIXI.Text;
  public winnerType: WinnerType;
  public screenType: ScreenType;
  public winnerDescriptionBg: PIXI.Sprite;
  public winnerDescription: PIXI.Text;

  private forceFadeToSecondTimeStart?: number;

  public anims: IAnimInterval[];

  public winnerDogLine1: WinnerHorseLine;
  public winnerDogLine2: WinnerHorseLine;
  private gameLength: number;

  public constructor(gameType: GameType, gameLength: number, anims: IAnimInterval[], type: WinnerType, language: string, screen: ScreenType) {
    super();

    this.gameType = gameType;
    this.gameLength = gameLength;
    this.winnerType = type;
    this.screenType = screen;
    this.anims = anims;
    this.showDebug(settings.debug, undefined, "WinnerHorse");

    {
      const winnerStyle = new PIXI.TextStyle({
        fontFamily: "DIN-RegularItalic",
        fontSize: _s(9),
        letterSpacing: _s(5),
        fill: "black",
        align: "center",
        fontStyle: "italic"
      });
      this.winnerText = Logic.createPixiText(winnerStyle);
      this.winnerText.anchor.set(0.5, 0.46);
      this.add(this.winnerText);
    }

    this.winnerDogLine1 = new WinnerHorseLine(anims);
    this.add(this.winnerDogLine1);
    this.winnerDogLine2 = new WinnerHorseLine(anims);
    this.add(this.winnerDogLine2);

    {
      const quoteStyle = new PIXI.TextStyle({
        fontFamily: "DIN-HeavyItalic",
        fontSize: _s(40),
        fill: HorseHelper.getWhiteColor(), // "white",
        align: "center",
        fontStyle: "italic"
      });
      this.winnerQuote = Logic.createPixiText(quoteStyle);
      this.winnerQuote.anchor.set(0.5, 0.5);
      this.add(this.winnerQuote);
    }
    {
      const bgTexture = DrawHelper.createSkewedRoundedRectangleTexture(
        _s(210),
        _s(30),
        _s(3),
        _s(6),
        gameType === "dog8" ? { type: "gradient", color: "#49A371", color2: "#20593F", verti: true } : { type: "gradient", color: "#3850A1", color2: "#13274A", verti: true }
      );
      this.winnerDescriptionBg = new PIXI.Sprite(bgTexture);
      // if (language === "it") this.add(this.winnerDescriptionBg);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(16),
        fill: HorseHelper.getWhiteColor(), // "white",
        align: "right",
        fontStyle: "italic"
      });
      this.winnerDescription = Logic.createPixiText(style);
      this.winnerDescription.anchor.set(0.0, 0.5);
      // if (language === "it") this.add(this.winnerDescription);
    }
  }

  private setTopText(text: string, force?: boolean) {
    if (this.winnerText.text !== text || force) {
      this.winnerText.text = text;
      Logic.autoSize(this.winnerText, _s(96));
    }
  }

  public setAnims(anims: IAnimInterval[], fadeToSecondTimeStart: number): void {
    this.anims = anims;
    this.winnerDogLine1.anims = anims;
    this.winnerDogLine2.anims = anims;
    this.forceFadeToSecondTimeStart = fadeToSecondTimeStart;
  }

  public fill(result: IResult, drivers: IDriver[], odds: number[]) {
    // this.setTopText(this.winnerText, true);
    this.winnerDescription.text = this.winnerType === "winner" ? _t("winner") : _t("forcastBet");

    const first = result.first;
    const second = result.second;

    const secondDriverIndex = this.winnerType === "firstTwo" ? second.driverIndex : first.driverIndex;
    const oddsForDriver = Logic.getOddsForDriver(odds, first.driverIndex, secondDriverIndex, drivers.length);
    this.winnerQuote.text = Logic.implementation.formatOdds(oddsForDriver);
    Logic.autoSize(this.winnerQuote, _s(75));
    this.winnerDogLine1.fill(drivers[first.driverIndex].firstName.toUpperCase(), first.time);
    if (this.winnerType === "firstTwo") this.winnerDogLine2.fill(drivers[second.driverIndex].firstName.toUpperCase(), second.time);
    else this.winnerDogLine2.visible = false;

    this.onLayout();
  }

  public onLayout() {
    // top right
    const right = this.width;

    this.winnerText.x = right - _s(50);
    this.winnerText.y = _s(this.winnerType === "firstTwo" ? 7 : 6);

    let winLine1Y = 46 - 30;
    if (this.screenType === "winnerJust") {
      winLine1Y = 46 - 32;
    }

    this.winnerDogLine1.x = right - _s(251);
    this.winnerDogLine1.y = _s(winLine1Y);
    this.winnerDogLine1.width = _s(251);
    this.winnerDogLine1.height = _s(29);
    this.winnerDogLine2.x = right - _s(258);
    this.winnerDogLine2.y = _s(46);
    this.winnerDogLine2.width = _s(251);
    this.winnerDogLine2.height = _s(29);

    this.winnerDescription.x = right - _s(170);
    if (this.screenType === "winnerJust") {
      this.winnerDescription.y = _s(-18);
    } else {
      this.winnerDescription.y = _s(-14);
    }

    this.winnerDescriptionBg.x = right - _s(190);
    this.winnerDescriptionBg.y = _s(-30);
    this.winnerDescriptionBg.width = _s(195);
    this.winnerDescriptionBg.height = _s(30);

    // this.winnerNumber.x = _s(right - 231);
    // this.winnerNumber.y = _s(top);
    // this.winnerName.x = _s(right - 182);
    // this.winnerName.y = _s(top);
    // this.winnerTime.x = _s(right - 17);
    // this.winnerTime.y = _s(top);
    this.winnerQuote.x = right - _s(56);

    this.winnerQuote.y = _s(this.winnerType === "firstTwo" ? 100 : 73);
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getRaceVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const baseFactor = t - anim.startTime;
    this.showDebugTime("WinnerDog", baseFactor);

    this.visible = baseFactor >= 0 && baseFactor <= anim.duration;

    AnimHelper.animateInOut(baseFactor, 0.7, anim.duration - 0.5, 0.5, 0, 1, (val) => (this.winnerQuote.alpha = val), 0.8, 0);
    // AnimHelper.animateIn(baseFactor, 0, 3, 1, -50, 19, (val) => this.line2.y = val);

    if (this.winnerType === "firstTwo") {
      if (this.gameLength === 300) {
        const switchTime = this.gameType === "horse" ? 29 : 32.6;
        AnimHelper.animateInOut(baseFactor, 0.0, switchTime, 0.9, 0, 1, (val) => (this.winnerDescriptionBg.alpha = val), 1, 0.2);
        AnimHelper.animateInOut(baseFactor, 0.0, switchTime, 0.9, 0, 1, (val) => (this.winnerDescription.alpha = val), 1, 0.2);
        AnimHelper.animateInOut(baseFactor, 0.0, switchTime, 0.9, 0, 1, (val) => (this.winnerDogLine1.alpha = val), 1, 0.2);
        AnimHelper.animateInOut(baseFactor, switchTime, anim.duration - 0.6, 0.9, 0.2, 1, (val) => (this.winnerDogLine2.alpha = val), 1, 0.2);
        //this.winnerDogLine1.alpha = Math.max((15.9 - baseFactor) * 4, 0.2);
        //this.winnerDogLine2.alpha = Math.max((baseFactor - 3.7) * 3, 0.2);
      } else {
        let switchTime = 9.1;
        if (this.forceFadeToSecondTimeStart) switchTime = this.forceFadeToSecondTimeStart - 0.2;
        this.winnerDescriptionBg.alpha = Math.max((switchTime - baseFactor) * 4, 0.2);
        this.winnerDescription.alpha = Math.max((switchTime - baseFactor) * 4, 0.2);
        this.winnerDogLine1.alpha = Math.max((switchTime - baseFactor) * 4, 0.2);
        this.winnerDogLine2.alpha = Math.max((baseFactor - switchTime) * 3, 0.2);
      }

      let fadeToSecondTimeStart = this.gameLength === 300 ? 33.15 : 9.4;
      if (this.forceFadeToSecondTimeStart) fadeToSecondTimeStart = this.forceFadeToSecondTimeStart;
      const fadeToSecondTime = fadeToSecondTimeStart + 0.1;
      // if (this.gameType === "horse"){
      //   fadeToSecondTimeStart = 29;
      //   fadeToSecondTime = fadeToSecondTimeStart + 0.1;
      // }

      if (baseFactor < fadeToSecondTimeStart) {
        this.setTopText(_t("first"));
        AnimHelper.animateInOut(baseFactor, 0.6, fadeToSecondTimeStart - 0.8 /*3.5*/, 0.5, 0, 1, (val) => (this.winnerText.alpha = val), 0.3, 0);
        AnimHelper.animateInOut(baseFactor, 0.6, fadeToSecondTimeStart - 0.8 /*3.5*/, 0.5, 0, 1, (val) => (this.winnerDescription.alpha = val), 0.3, 0);
        AnimHelper.animateInOut(baseFactor, 0.6, fadeToSecondTimeStart - 0.8 /*3.5*/, 0.5, 0, 1, (val) => (this.winnerDescriptionBg.alpha = val), 0.3, 0);
      } else {
        this.setTopText(_t("second"));
        AnimHelper.animateInOut(baseFactor, fadeToSecondTime + 0.5, fadeToSecondTime + anim.duration - 0.5 - 0.5, 0.5, 0, 1, (val) => (this.winnerText.alpha = val), 0.5, 0);
        AnimHelper.animateInOut(baseFactor, fadeToSecondTime, fadeToSecondTime + anim.duration - 0.5, 0.5, 0, 1, (val) => (this.winnerDescription.alpha = val), 0.5, 0);
        AnimHelper.animateInOut(baseFactor, fadeToSecondTime, fadeToSecondTime + anim.duration - 0.5, 0.5, 0, 1, (val) => (this.winnerDescriptionBg.alpha = val), 0.5, 0);
      }
    } else {
      this.setTopText(_t("winner"));
      AnimHelper.animateInOut(baseFactor, 0.6, anim.duration - 0.5, 0.5, 0, 1, (val) => (this.winnerText.alpha = val), 0.5, 0);
      AnimHelper.animateInOut(baseFactor, 0.6, anim.duration - 0.5, 0.5, 0, 1, (val) => (this.winnerDescription.alpha = val), 0.5, 0);
      AnimHelper.animateInOut(baseFactor, 0.6, anim.duration - 0.5, 0.5, 0, 1, (val) => (this.winnerDescriptionBg.alpha = val), 0.5, 0);
    }
  }
}
