import { mainElementPositionSizes, oddsAlwayOnOddScreenTimings, oddsAlwaysOnItHeaderTimings, oddsAlwaysOnStyles, oddScreenSettings } from "./../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings, _t } from "client/Logic/Logic";
import { IColors, IDriver, IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { GameLength } from "common/Definitions";
import { Logger } from "client/Logic/Logger";
import { Color } from "common/Color";
import { IExtendetAnimInterval, SubAnim } from "../dog/OddsScreenDog";

export class OddsScreenKart extends Group {
  private oddsHeaderVicente: PIXI.Text;
  private oddsHeaderAccopiata: PIXI.Text;
  private oddsHeaderVicenteAnims: IAnimInterval[] = [];
  private oddsHeaderAccopiataAnims: IAnimInterval[] = [];
  private oddsTexts: PIXI.Text[] = [];
  private racers: IDriver[] = [];
  private first: PIXI.Text;
  private second: PIXI.Text;
  private gameLength: GameLength;
  private language: string;
  private oddsAlwaysOn: boolean;

  public constructor(racerCount: number, gameLength: GameLength, language: string, oddsAlwaysOn: boolean) {
    super();

    this.gameLength = gameLength;
    this.language = language;
    this.oddsAlwaysOn = oddsAlwaysOn;

    this.showDebug(settings.debug);
    let rowStartX = 145;
    let rowStartY = 90;
    let rowHeight = 46.5;
    let columnWidth = 148;

    if (this.oddsAlwaysOn) {
      const { rowStartX: startX, rowStartY: startY, rowHeight: rHeight, columnWidth: colWidth } = oddScreenSettings["kart5" as keyof typeof oddScreenSettings];
      rowStartX = startX;
      rowStartY = startY;
      rowHeight = rHeight;
      columnWidth = colWidth;
    }

    {
      for (let iRow = 0; iRow < racerCount; iRow++) {
        for (let iCol = 0; iCol < racerCount; iCol++) {
          const text = Logic.createPixiText();
          text.position.x = _s(rowStartX + iCol * columnWidth);
          text.position.y = _s(rowStartY + iRow * rowHeight);
          text.anchor.set(0.5);
          this.oddsTexts.push(text);
          this.add(text);
        }
      }
    }

    const stylePos = new PIXI.TextStyle({
      fontFamily: "DIN-Light",
      fontSize: _s(13),
      letterSpacing: _s(8),
      fill: "#AAAAAA",
      align: "center"
    });

    if (this.oddsAlwaysOn) {
      const { fontSize, letterSpacing } = oddsAlwaysOnStyles["kart5" as keyof typeof oddsAlwaysOnStyles].oddsScreen.firstSecond;
      stylePos.fontSize = _s(fontSize);
      stylePos.letterSpacing = _s(letterSpacing);
    }

    this.first = Logic.createPixiText(stylePos);
    this.first.anchor.set(0.5, 0.5);
    this.add(this.first);

    this.second = Logic.createPixiText(stylePos);
    this.second.anchor.set(0.5, 0.5);
    this.add(this.second);

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Regular",
        fontSize: _s(12),
        letterSpacing: _s(2),
        fill: "white",
        align: "center"
      });
      if (this.oddsAlwaysOn) {
        const { fontSize, letterSpacing } = oddsAlwaysOnStyles["kart5" as keyof typeof oddsAlwaysOnStyles].oddsScreen.oddsHeaderVincente;
        style.fontSize = _s(fontSize);
        style.letterSpacing = _s(letterSpacing);
      }
      this.oddsHeaderVicente = Logic.createPixiText(style);
      this.oddsHeaderVicente.anchor.set(0.5, 1.0);

      this.oddsHeaderAccopiata = Logic.createPixiText(style);
      this.oddsHeaderAccopiata.anchor.set(0.5, 1.0);

      if (language === "it") {
        this.add(this.oddsHeaderVicente);
        this.add(this.oddsHeaderAccopiata);
      }
    }
  }
  private anims: (IAnimInterval & {
    fadeInFactor?: number;
    fadeOutFactor?: number;
    initAnimation?: boolean;
    startSm?: boolean;
    getDurationOffset?: Function;
    subAnimations?: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number; smoothness?: { in: number; out: number } })[];
  })[] = [];
  public createOddsHeaderAnims(gameLength: GameLength, language: string): IAnimInterval[][] {
    if (language !== "it") return [];
    if (this.oddsAlwaysOn) {
      return oddsAlwaysOnItHeaderTimings.kart[gameLength as 240 | 300];
    }
    switch (gameLength) {
      case 300:
        return [
          [
            { startTime: 11.0, duration: 4.3 },
            { startTime: 100.1, duration: 6.0 },
            { startTime: 155.3, duration: 5.9 }
          ],
          [
            { startTime: 16.5, duration: 2.3 },
            { startTime: 107.5, duration: 3.0 },
            { startTime: 162.7, duration: 3.0 }
          ]
        ];
      default:
        return [
          [
            { startTime: 10.3, duration: 4.2 },
            { startTime: 90.35, duration: 5.7 },
            { startTime: 140.35, duration: 5.7 }
          ],
          [
            { startTime: 15.4, duration: 1.8 },
            { startTime: 97.5, duration: 2.9 },
            { startTime: 147.7, duration: 2.9 }
          ]
        ];
    }
  }

  public fill(racers: IDriver[], odds: number[], withBonus: boolean, colors: IColors) {
    this.racers = racers;
    const style = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(22),
      fill: "white",
      align: "center"
    });
    const styleBold = new PIXI.TextStyle({
      fontFamily: "DIN-Heavy",
      fontSize: _s(22),
      fill: "white",
      align: "center"
    });

    const minMax = Logic.calcOddsMinMax(odds, racers.length);
    if (this.oddsAlwaysOn) {
      const { fontSize, fontFamily } = oddsAlwaysOnStyles["kart5" as keyof typeof oddsAlwaysOnStyles].oddsScreen.odds;
      style.fontSize = _s(fontSize);
      styleBold.fontSize = _s(fontSize);
      styleBold.fontFamily = fontFamily;
    }
    for (let iRow = 0; iRow < racers.length; iRow++) {
      for (let iCol = 0; iCol < racers.length; iCol++) {
        const val = Logic.getOddsForDriver(odds, iRow, iCol, racers.length);
        const afterDigitsOverwrite = Logic.getOddsForDriverDigits(odds, iRow, iCol, racers.length);
        const oddsColor = Logic.getOddsColor(minMax, val, iRow, iCol);
        const text = this.oddsTexts[iCol + iRow * racers.length];
        if (afterDigitsOverwrite === null) {
          text.text = Logic.implementation.formatOdds(val);
        } else {
          text.text = Logic.implementation.formatOdds(val, afterDigitsOverwrite);
        }
        Logger.debug("Override of Digits Formated odd:" + text.text);

        text.style = oddsColor !== "white" ? styleBold : style;
        text.style.trim = true;
        text.style.padding = 10;
        const col = Color.ARGBtoHex(colors[oddsColor]);
        text.tint = col;
      }
    }

    this.first.text = _t("first");
    this.second.text = _t("second");

    this.anims = this.createAnims(this.gameLength, withBonus, this.language);

    this.oddsHeaderVicente.text = _t("winner");
    this.oddsHeaderAccopiata.text = _t("forcastBet");

    if (this.oddsAlwaysOn) Logic.autoSize(this.oddsHeaderAccopiata, _s(211));

    this.first.text = _t("first").replace("_", "");
    this.second.text = _t("second").replace("_", "");
    const headerAnims = this.createOddsHeaderAnims(this.gameLength, this.language);
    if (headerAnims.length > 1) {
      this.oddsHeaderVicenteAnims = headerAnims[0];
      this.oddsHeaderAccopiataAnims = headerAnims[1];
    }
  }

  private createAnims(gameLength: GameLength, withBonus: boolean, language: string): IAnimInterval[] {
    switch (gameLength) {
      case 120:
        if (this.oddsAlwaysOn) return oddsAlwayOnOddScreenTimings.kart[120];
        return [{ startTime: 0.1, duration: 12.7 }, withBonus ? { startTime: 35.1, duration: 13.7 } : { startTime: 30.0, duration: 19.0 }];
      case 180:
        return [withBonus ? { startTime: 0.1, duration: 18.1 } : { startTime: 0.1, duration: 22.7 }, withBonus ? { startTime: 90.0, duration: 18.8 } : { startTime: 90.0, duration: 18.8 }];
      case 240:
        if (this.oddsAlwaysOn) {
          return language === "it" ? oddsAlwayOnOddScreenTimings.kart.getItTimings(240) : oddsAlwayOnOddScreenTimings.kart[240];
        }
        return [
          language === "it" ? { startTime: 10.1, duration: 18.1 } : { startTime: 0.1, duration: 28.1 },
          { startTime: 90.1, duration: 28.1 },
          withBonus ? { startTime: 150.2, duration: 18.5 } : { startTime: 140.2, duration: 28.4 }
        ];
      case 300:
        if (this.oddsAlwaysOn) return language === "it" ? oddsAlwayOnOddScreenTimings.kart.getItTimings(300) : oddsAlwayOnOddScreenTimings.kart[300];
        return [
          language === "it" ? { startTime: 9.9, duration: 20.1 } : withBonus ? { startTime: 0.6, duration: 27.2 } : { startTime: 0.6, duration: 32.3 },
          withBonus ? { startTime: 90.3, duration: 27.9 } : { startTime: 100.1, duration: 28.1 },
          withBonus ? { startTime: 155.3, duration: 28.8 } : language === "it" ? { startTime: 155.5, duration: 29.0 } : { startTime: 155.5, duration: 29.0 }
          //withBonus ? { startTime: 160.2, duration: 23.9 } : { startTime: 164.3, duration: 20.1 },
        ];
    }
    return [];
  }

  public onLayout() {
    let oddsHeaderX = 185;
    let oddsHeaderY = 185;

    let secondOddsHeaderX = oddsHeaderX;
    let secondOddsHeaderY = oddsHeaderY;

    let firstX = 12;
    let firstY = 165;

    let secondX = 440;
    let secondY = 9;

    if (this.oddsAlwaysOn) {
      const { x: xFirst, y: yFirst } = oddScreenSettings["kart5" as keyof typeof oddScreenSettings].first;
      const { x: xSecond, y: ySecond } = oddScreenSettings["kart5" as keyof typeof oddScreenSettings].second;

      const { x: xHeader, y: yHeader } = oddScreenSettings["kart5" as keyof typeof oddScreenSettings].itHeader;

      secondOddsHeaderX = xHeader;
      secondOddsHeaderY = yHeader;

      oddsHeaderX = xHeader + 62;
      oddsHeaderY = yHeader;

      firstX = xFirst;
      firstY = yFirst;

      secondX = xSecond;
      secondY = ySecond;

      this.oddsHeaderVicente.anchor.set(0, 0.5);
      this.oddsHeaderAccopiata.anchor.set(0, 0.5);
    }

    this.first.position.x = _s(firstX);
    this.first.rotation = -Math.PI * 0.5;
    this.first.position.y = _s(firstY);

    this.second.position.x = _s(secondX);
    this.second.position.y = _s(secondY);

    this.oddsHeaderVicente.position.x = _s(oddsHeaderX);
    this.oddsHeaderVicente.position.y = _s(oddsHeaderY);
    this.oddsHeaderAccopiata.position.x = _s(secondOddsHeaderX);
    this.oddsHeaderAccopiata.position.y = _s(secondOddsHeaderY);
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    if (anim.getDurationOffset !== undefined) {
      anim.duration = Logic.getIntroLength() - anim.getDurationOffset(this.gameLength)!;
    } else if (anim.getDurationOffset === undefined && this.oddsAlwaysOn) {
      anim.duration = Logic.getIntroLength() - 4;
    }
    if (anim.startSm && t < 3) {
      const { oddsScreenPosXTo, oddsScreenPosYTo, oddsScreenScaleTo } = oddScreenSettings["kart5" as keyof typeof oddScreenSettings];
      this.container.scale.x = oddsScreenScaleTo;
      this.container.scale.y = oddsScreenScaleTo;

      this.container.position.x = _s(oddsScreenPosXTo);
      this.container.position.y = _s(oddsScreenPosYTo + 90);
    }

    const oddsHeaderVicenteAnim = Logic.getAnim(t, this.oddsHeaderVicenteAnims, this.oddsHeaderVicente);

    const oddsHeaderAccopiataAnim = Logic.getAnim(t, this.oddsHeaderAccopiataAnims, this.oddsHeaderAccopiata);

    if (oddsHeaderVicenteAnim)
      AnimHelper.animateInOut(t, oddsHeaderVicenteAnim.startTime, oddsHeaderVicenteAnim.startTime + oddsHeaderVicenteAnim.duration, 1, 0, 1, (alpha) => (this.oddsHeaderVicente.alpha = alpha), 0.2, 0);
    if (oddsHeaderAccopiataAnim)
      AnimHelper.animateInOut(
        t,
        oddsHeaderAccopiataAnim.startTime,
        oddsHeaderAccopiataAnim.startTime + oddsHeaderAccopiataAnim.duration,
        0.2,
        0,
        1,
        (alpha) => (this.oddsHeaderAccopiata.alpha = alpha),
        0.2,
        0
      );

    const racers = this.racers;
    const baseFactor = t - anim.startTime;
    if (baseFactor < anim.duration) {
      for (let iRow = 0; iRow < racers.length; iRow++) {
        const rowFactor = baseFactor - iRow * 0.1;
        for (let iCol = 0; iCol < racers.length; iCol++) {
          const index = iCol + iRow * racers.length;
          this.oddsTexts[index].alpha = rowFactor - iCol * 0.1;
        }
      }
      this.setDebugFade(AnimHelper.clamp(baseFactor));
      this.first.alpha = AnimHelper.clamp(baseFactor);
      this.second.alpha = this.first.alpha;

      if (this.oddsAlwaysOn) return this.updateOddsAlwaysOn(t, anim as IExtendetAnimInterval);
    } else {
      if (anim.startSm) {
        this.container.scale.x = 1;
        this.container.scale.y = 1;
        const xFrom = _s(mainElementPositionSizes["kart5" as keyof typeof mainElementPositionSizes].oddsScreen.x);
        const yFrom = _s(mainElementPositionSizes["kart5" as keyof typeof mainElementPositionSizes].oddsScreen.y);
        this.container.position.x = xFrom;
        this.container.position.y = yFrom;
      }
      this.animateOutScreen(baseFactor, anim);
    }
  }

  private animateOutScreen(baseFactor: number, anim: IAnimInterval) {
    baseFactor = AnimHelper.limit(baseFactor, anim.duration);
    for (let iRow = 0; iRow < this.racers.length; iRow++) {
      const rowFactor = baseFactor + iRow * 0.1;
      for (let iCol = 0; iCol < this.racers.length; iCol++) {
        const index = iCol + iRow * this.racers.length;
        this.oddsTexts[index].alpha = rowFactor;
      }
    }
    this.setDebugFade(AnimHelper.clamp(baseFactor));
    if (this.oddsAlwaysOn) {
      this.first.alpha = AnimHelper.clamp(baseFactor + 0.5);
      this.second.alpha = this.first.alpha;
    } else {
      this.first.alpha = AnimHelper.clamp(baseFactor);
      this.second.alpha = this.first.alpha;
    }
  }

  public updateOddsAlwaysOn(t: number, currentAnim: IExtendetAnimInterval) {
    const anim = Logic.getAnim(t, currentAnim.subAnimations, new PIXI.Container());

    // console.log("Current anim ", currentAnim);

    const currentSubAnim = anim as SubAnim;

    const currentIndex = currentAnim.subAnimations!.indexOf(currentSubAnim);
    // console.log("currentSubAnim ", currentSubAnim);
    if (!currentSubAnim) return;

    if (currentAnim.startSm) {
      currentAnim.subAnimations![0].startSm = true;
    }

    const start = currentSubAnim.startTime;
    const duration = currentSubAnim.startTime + currentSubAnim.duration;

    const fadeInFrom = 1;
    const fadeInTo = oddScreenSettings["kart5" as keyof typeof oddScreenSettings].oddsScreenScaleTo;
    const xFrom = _s(mainElementPositionSizes["kart5" as keyof typeof mainElementPositionSizes].oddsScreen.x);
    const yFrom = _s(mainElementPositionSizes["kart5" as keyof typeof mainElementPositionSizes].oddsScreen.y);
    const x = _s(oddScreenSettings["kart5" as keyof typeof oddScreenSettings].oddsScreenPosXTo);
    const y = _s(oddScreenSettings["kart5" as keyof typeof oddScreenSettings].oddsScreenPosYTo + (currentIndex === 0 && this.language === "it" ? 90 : 0));

    const fadeIn = currentSubAnim.fadeInFactor || 0.8;
    const fadeOut = currentSubAnim.fadeOutFactor || 0.8;
    const inSmoothness = currentSubAnim.smoothness?.in || 1.5;
    const outSmoothness = currentSubAnim.smoothness?.out || 1.5;

    if (t < duration - fadeOut) {
      if (currentSubAnim.startSm) return;
      this.animateIn(t, start, duration, fadeIn, fadeInFrom, fadeInTo, inSmoothness || 1.5, (val) => {
        this.container.scale.x = val;
        this.container.scale.y = val;
      });
      this.animateIn(t, start, duration, fadeIn, xFrom, x, inSmoothness || 1.5, (val) => (this.container.position.x = val));
      this.animateIn(t, start, duration, fadeIn, yFrom, y, inSmoothness || 1.5, (val) => (this.container.position.y = val));
    } else if (t > duration) {
      this.container.scale.x = fadeInFrom;
      this.container.scale.y = fadeInFrom;
      this.container.position.x = xFrom;
      this.container.position.y = yFrom;
      return;
    } else {
      this.animateOut(t, duration, fadeInTo, fadeInFrom, fadeOut, outSmoothness || 1.5, (val) => {
        this.container.scale.x = val;
        this.container.scale.y = val;
      });
      this.animateOut(t, duration, x, xFrom, fadeOut, outSmoothness || 1.5, (val) => (this.container.position.x = val));
      this.animateOut(t, duration, y, yFrom, fadeOut, outSmoothness || 1.5, (val) => (this.container.position.y = val));
    }
  }

  private animateOut(currentTime: number, end: number, fadeOutFrom: number, fadeOutTo: number, fadeOut: number, smoothness: number, fadeInCallback: (x: number) => any) {
    const val = fadeOutFrom + (fadeOutTo - fadeOutFrom) * AnimHelper.easeOutCirc((currentTime - (end - fadeOut)) / fadeOut, smoothness);
    fadeInCallback(val);
  }

  private animateIn(currentTime: number, start: number, duration: number, fadeIn: number, fadeInFrom: number, fadeInTo: number, smoothness: number, fadeInCallback: (x: number) => any) {
    if (currentTime < start) {
      fadeInCallback(fadeInFrom);
      return;
    } else if (currentTime - start > fadeIn && currentTime < duration) {
      fadeInCallback(fadeInTo);
      return;
    } else if (currentTime - start < fadeIn) {
      const val = fadeInFrom + (fadeInTo - fadeInFrom) * AnimHelper.easeOutCirc((currentTime - start) / fadeIn, smoothness);
      fadeInCallback(val);
      return;
    }
    fadeInCallback(fadeInTo);
    return;
  }
}
