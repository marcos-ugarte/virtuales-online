import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, _t, Logic, settings } from "client/Logic/Logic";
import { IAnimInterval, IDriver, IResult, VideoState } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../common/Anim";
import { WinnerDogLine } from "./WinnerDogLine";
import { GameType } from "common/Definitions";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { HorseHelper } from "client/VideoScreen/horse/HorseHelper";

type WinnerType = "winner" | "firstTwo";

export class WinnerDog extends Group {
  public gameType: GameType;
  public winnerText: PIXI.Text;
  public winnerQuote: PIXI.Text;
  public winnerType: WinnerType;
  public winnerDescriptionBg: PIXI.Sprite;
  public winnerDescription: PIXI.Text;

  public anims: IAnimInterval[];

  public winnerDogLine1: WinnerDogLine;
  public winnerDogLine2: WinnerDogLine;
  private gameLength: number;
  public useOverlays: boolean;

  public constructor(gameType: GameType, gameLength: number, anims: IAnimInterval[], type: WinnerType, language: string) {
    super();

    this.gameType = gameType;
    this.gameLength = gameLength;
    this.winnerType = type;
    this.anims = anims;
    this.useOverlays = false; // TODO when using overlays
    this.showDebug(settings.debug, undefined, "WinnerDog");

    {
      const winnerStyle = new PIXI.TextStyle({
        fontFamily: "DIN-RegularItalic",
        fontSize: _s(10),
        letterSpacing: _s(5),
        fill: "black",
        align: "center",
        fontStyle: "italic"
      });
      this.winnerText = Logic.createPixiText(winnerStyle);
      this.winnerText.anchor.set(0.5, 0.5);
      this.add(this.winnerText);
    }

    this.winnerDogLine1 = new WinnerDogLine(anims, this.useOverlays);
    this.add(this.winnerDogLine1);
    this.winnerDogLine2 = new WinnerDogLine(anims, this.useOverlays);
    this.add(this.winnerDogLine2);

    {
      const quoteStyle = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(36),
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
      if (language === "it") this.add(this.winnerDescriptionBg);
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
      if (language === "it") this.add(this.winnerDescription);
    }
  }

  private setTopText(text: string, force?: boolean) {
    if (this.winnerText.text !== text || force) {
      this.winnerText.text = text;
      Logic.autoSize(this.winnerText, _s(96));
    }
  }

  public fill(result: IResult, drivers: IDriver[], odds: number[]) {
    // this.setTopText(this.winnerText, true);
    this.winnerDescription.text = this.winnerType === "winner" ? _t("winner") : _t("forcastBet");

    const first = result.first;
    const second = result.second;

    const secondDriverIndex = this.winnerType === "firstTwo" ? second.driverIndex : first.driverIndex;
    const oddsForDriver = Logic.getOddsForDriver(odds, first.driverIndex, secondDriverIndex, drivers.length);
    const afterDigitsOverwrite = Logic.getOddsForDriverDigits(odds, first.driverIndex, secondDriverIndex, drivers.length);
    if (afterDigitsOverwrite === null) {
      this.winnerQuote.text = Logic.implementation.formatOdds(oddsForDriver);
    } else {
      this.winnerQuote.text = Logic.implementation.formatOdds(oddsForDriver, afterDigitsOverwrite);
    }

    Logic.autoSize(this.winnerQuote, _s(70));

    if (this.winnerType === "firstTwo") {
      this.winnerDogLine1.fill(first, drivers[first.driverIndex], 1);
      this.winnerDogLine2.fill(second, drivers[second.driverIndex], 2);
    } else {
      this.winnerDogLine1.fill(first, drivers[first.driverIndex], 0);
      this.winnerDogLine2.alpha = 0.0;
    }

    this.onLayout();
  }

  public onLayout() {
    // top right
    const right = this.width;

    if (this.useOverlays) {
      this.winnerText.x = right - _s(54);
      this.winnerText.y = _s(8);
      this.winnerDogLine1.x = right - _s(500);
      this.winnerDogLine1.y = _s(46 - 30);
      this.winnerDogLine1.width = _s(498);
      this.winnerDogLine1.height = _s(206);
      this.winnerDogLine2.x = right - _s(505);
      this.winnerDogLine2.y = _s(48);
      this.winnerDogLine2.width = _s(498);
      this.winnerDogLine2.height = _s(206);

      this.winnerDescription.x = right - _s(170);
      this.winnerDescription.y = _s(-15);

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
      this.winnerQuote.x = right - _s(62);

      this.winnerQuote.y = _s(this.winnerType === "firstTwo" ? 104 : 74);
    } else {
      this.winnerText.x = right - _s(54);
      this.winnerText.y = _s(8);
      this.winnerDogLine1.x = right - _s(250);
      this.winnerDogLine1.y = _s(46 - 28);
      this.winnerDogLine1.width = _s(251);
      this.winnerDogLine1.height = _s(29);
      this.winnerDogLine2.x = right - _s(258);
      this.winnerDogLine2.y = _s(48);
      this.winnerDogLine2.width = _s(251);
      this.winnerDogLine2.height = _s(29);

      this.winnerDescription.x = right - _s(170);
      this.winnerDescription.y = _s(-15);

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
      this.winnerQuote.x = right - _s(62);

      this.winnerQuote.y = _s(this.winnerType === "firstTwo" ? 100 : 76);
    }
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getRaceVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim || Logic.getState() !== VideoState.Race) return;

    const baseFactor = t - anim.startTime;
    this.showDebugTime("WinnerDog", baseFactor);

    this.visible = baseFactor >= 0 && baseFactor <= anim.duration;

    AnimHelper.animateInOut(baseFactor, 0.7, anim.duration - 0.5, 0.5, 0, 1, (val) => (this.winnerQuote.alpha = val), 0.8, 0);
    // AnimHelper.animateIn(baseFactor, 0, 3, 1, -50, 19, (val) => this.line2.y = val);

    if (this.winnerType === "firstTwo") {
      if (Logic.implementation.getGameInfo().gameLength === 300) {
        AnimHelper.animateInOut(baseFactor, 0.0, 32.6, 0.9, 0, 1, (val) => (this.winnerDescriptionBg.alpha = val), 1, 0.2);
        AnimHelper.animateInOut(baseFactor, 0.0, 32.6, 0.9, 0, 1, (val) => (this.winnerDescription.alpha = val), 1, 0.2);
        if (this.useOverlays) {
          AnimHelper.animateInOut(baseFactor, 0.0, 32.6, 0.9, 0, 1, (val) => (this.winnerDogLine1.alpha = val), 1, 0.2);
          AnimHelper.animateInOut(baseFactor, 32.5, anim.duration - 0.6, 0.9, 0.2, 1, (val) => (this.winnerDogLine2.alpha = val), 1, 0.2);
        }
        //this.winnerDogLine1.alpha = Math.max((15.9 - baseFactor) * 4, 0.2);
        //this.winnerDogLine2.alpha = Math.max((baseFactor - 3.7) * 3, 0.2);
      } else {
        this.winnerDescriptionBg.alpha = Math.max((9.1 - baseFactor) * 4, 0.2);
        this.winnerDescription.alpha = Math.max((9.1 - baseFactor) * 4, 0.2);
        //this.winnerDogLine1.alpha = Math.max((9.1 - baseFactor) * 4, 0.2);
        //this.winnerDogLine2.alpha = Math.max((baseFactor - 9.1) * 3, 0.2);
      }

      const fadeToSecondTimeStart = Logic.implementation.getGameInfo().gameLength === 300 ? 33.15 : 9.4;
      const fadeToSecondTime = fadeToSecondTimeStart + 0.1;

      if (baseFactor < fadeToSecondTimeStart) {
        this.setTopText(_t("first"));
        AnimHelper.animateInOut(baseFactor, 0.6, fadeToSecondTimeStart - 0.8 /*3.5*/, 0.5, 0, 1, (val) => (this.winnerText.alpha = val), 0.3, 0);
        AnimHelper.animateInOut(baseFactor, 0.6, fadeToSecondTimeStart - 0.8 /*3.5*/, 0.5, 0, 1, (val) => (this.winnerDescription.alpha = val), 0.3, 0);
        AnimHelper.animateInOut(baseFactor, 0.6, fadeToSecondTimeStart - 0.8 /*3.5*/, 0.5, 0, 1, (val) => (this.winnerDescriptionBg.alpha = val), 0.3, 0);
      } else {
        this.setTopText(_t("second"));
        AnimHelper.animateInOut(baseFactor, fadeToSecondTime, fadeToSecondTime + anim.duration - 0.5, 0.5, 0, 1, (val) => (this.winnerText.alpha = val), 0.5, 0);
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
