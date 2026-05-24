import { ColorsHelper } from "./../Util/ColorsHelper";
import { mainElementPositionSizes, oddsAlwayOnOddScreenTimings, oddsAlwaysOnItHeaderTimings, oddsAlwaysOnStyles, oddScreenSettings } from "./../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings, _t } from "client/Logic/Logic";
import { IColors, IDriver, IAnimInterval, IGameInfo } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { GameType, GameLength } from "common/Definitions";
import { DogHelper } from "./DogHelper";
import { Dog63Arrow } from "../dog63/Intro/OddsAlwaysOn/Dog63Arrow";

export type IExtendetAnimInterval = IAnimInterval & {
  fadeInFactor?: number | undefined;
  fadeOutFactor?: number | undefined;
  initAnimation?: boolean | undefined;
  startSm?: boolean | undefined;
  getDurationOffset?: (length: number) => number | undefined;
  subAnimations: SubAnim[] | undefined;
};

export type SubAnim = IAnimInterval & {
  fadeInFactor?: number | undefined;
  smoothness?: { in: number; out: number } | undefined;
  startSm?: boolean | undefined;
  fadeOutFactor?: number | undefined;
};

export class OddsScreenDog extends Group {
  private oddsHeaderVicente: PIXI.Text;
  private oddsHeaderAccopiata: PIXI.Text;
  private oddsHeaderVicenteAnims: IAnimInterval[] = [];
  private oddsHeaderAccopiataAnims: IAnimInterval[] = [];
  private oddsTexts: PIXI.Text[] = [];
  private racers: IDriver[] = [];
  private first: PIXI.Text;
  private second: PIXI.Text;
  private gameType: GameType;
  private gameLength: GameLength;
  private racerCount: number;
  private language: string;
  private oddsAlwaysOn: boolean;
  private useOverlays: boolean;
  private textContainer = new Group();
  private arrowContainer = new Group();

  // create texts, pixi objects and so on in constructor => if possible
  public constructor(gameInfo: IGameInfo) {
    super();
    this.gameType = gameInfo.gameType;
    this.gameLength = gameInfo.gameLength;
    this.language = gameInfo.videoLanguage;
    const racerCount = Logic.getRacerCount(gameInfo.gameType);
    this.racerCount = racerCount;
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.useOverlays = gameInfo.useOverlays;
    this.showDebug(settings.debug, 0.7, "OddScreenDog");

    const isDog8 = gameInfo.gameType === "dog8";
    const isDog63 = gameInfo.gameType === "dog63";
    const isHorse = gameInfo.gameType === "horse" || gameInfo.gameType === "sulky";
    let rowStartX = isDog8 ? 95 : 153;
    let rowStartY = isDog8 ? 58 : 68;
    let rowHeight = isDog8 ? 41.5 : 47.6;
    let columnWidth = isDog8 ? 83 : 95;

    if (gameInfo.gameType === "dog63" && this.oddsAlwaysOn) {
      this.addArrowElements();
    }

    if (this.oddsAlwaysOn) {
      const { rowStartX: startX, rowStartY: startY, rowHeight: rHeight, columnWidth: colWidth } = oddScreenSettings[this.gameType as keyof typeof oddScreenSettings];
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
          this.textContainer.add(text);
        }
      }
      this.add(this.textContainer);
      this.textContainer.container.pivot.set(_s(467.2), _s(230.4));
      this.textContainer.container.position.set(_s(467.2), _s(230.4));
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(10),
        letterSpacing: _s(0),
        fill: DogHelper.getBlackColor(),
        align: "center"
      });

      if (this.oddsAlwaysOn) {
        style.fontSize = _s(oddsAlwaysOnStyles[this.gameType as keyof typeof oddsAlwaysOnStyles].oddsScreen.oddsHeaderVincente.fontSize);
        style.letterSpacing = _s(oddsAlwaysOnStyles[this.gameType as keyof typeof oddsAlwaysOnStyles].oddsScreen.oddsHeaderVincente.letterSpacing);
      }

      this.oddsHeaderVicente = Logic.createPixiText(style);
      this.oddsHeaderVicente.anchor.set(0.5, 1.0);

      this.oddsHeaderAccopiata = Logic.createPixiText(style);
      this.oddsHeaderAccopiata.anchor.set(0.5, 1.0);

      if (gameInfo.videoLanguage === "it" || (this.gameType === "dog63" && this.oddsAlwaysOn)) {
        this.add(this.oddsHeaderVicente);
        this.add(this.oddsHeaderAccopiata);
      }
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: isHorse || isDog63 ? "DIN-Bold" : "DIN-Light",
        fontSize: isHorse ? _s(10) : _s(8),
        letterSpacing: _s(2),
        fill: DogHelper.getBlackColor(),
        align: "center"
      });
      if (this.oddsAlwaysOn) {
        const { fontSize, letterSpacing } = oddsAlwaysOnStyles[this.gameType as keyof typeof oddsAlwaysOnStyles].oddsScreen.firstSecond;
        style.fontSize = _s(fontSize);
        style.letterSpacing = _s(letterSpacing);
      }

      this.first = Logic.createPixiText(style);
      this.first.anchor.set(0.5, 0.45);
      this.add(this.first);

      this.second = Logic.createPixiText(style);
      this.second.anchor.set(0.5, 0.4);
      this.add(this.second);
    }
  }

  private addArrowElements() {
    const arrowTwo = new Dog63Arrow(_s(36), _s(0.5), _s(15), _s(6.5));
    const arrowOne = new Dog63Arrow(_s(52), _s(0.5), _s(15), _s(6.5));

    const textStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(28),
      letterSpacing: _s(0.1),
      fill: DogHelper.getWhiteColor(),
      align: "center"
    });

    const textOne = new PIXI.Text(_t("numberSign"), textStyle);
    const textTwo = new PIXI.Text(_t("numberSignTwo"), textStyle);

    arrowOne.container.rotation = Math.PI / 2;

    this.arrowContainer.add(arrowTwo);
    this.arrowContainer.add(arrowOne);
    this.arrowContainer.add(textOne);
    this.arrowContainer.add(textTwo);

    textOne.position.set(_s(27.5), _s(55));
    textTwo.position.set(_s(61), _s(20));

    arrowTwo.position.set(textTwo.position.x + textTwo.width + _s(5), _s(31));
    arrowOne.position.set(_s(33), _s(93));
    this.add(this.arrowContainer);
  }

  public createOddsHeaderAnims(gameType: GameType, gameLength: GameLength, language: string, withBonus = false): IAnimInterval[][] {
    if (this.oddsAlwaysOn && this.gameType === "dog63") {
    } else if (language !== "it") {
      return [];
    }

    if (this.oddsAlwaysOn) {
      let key: string = this.gameType;

      if (this.language !== "it") {
        key = this.gameType + (withBonus ? "_bonus" : "_default");
      }
      return oddsAlwaysOnItHeaderTimings[key as "dog6" | "dog8" | "horse" | "sulky" | "dog63" | "dog63_default" | "dog63_bonus"];
    }
    if (gameType === "dog6") {
      switch (gameLength) {
        case 300:
          return [
            [
              { startTime: 10.3, duration: 3.7 },
              { startTime: 100.6, duration: 4.45 },
              { startTime: 155.8, duration: 5.8 }
            ],
            [
              { startTime: 14.65, duration: 2.2 },
              { startTime: 105.6, duration: 2.6 },
              { startTime: 162.3, duration: 3.4 }
            ]
          ];
        case 240:
          return [
            [
              { startTime: 10.3, duration: 3.0 },
              { startTime: 90.7, duration: 4.3 },
              { startTime: 140.8, duration: 5.7 }
            ],
            [
              { startTime: 13.7, duration: 1.7 },
              { startTime: 95.57, duration: 2.6 },
              { startTime: 147.25, duration: 3.4 }
            ]
          ];
      }
    } else if (gameType === "dog8") {
      switch (gameLength) {
        case 300:
          return [
            [
              { startTime: 10.1, duration: 4.35 },
              { startTime: 110.15, duration: 4.55 },
              { startTime: 160.4, duration: 5.9 }
            ],
            [
              { startTime: 14.85, duration: 1.9 },
              { startTime: 114.8, duration: 1.9 },
              { startTime: 166.6, duration: 2.6 }
            ]
          ];
        case 240:
          return [
            [
              { startTime: 10, duration: 3.5 },
              { startTime: 100, duration: 4.6 },
              { startTime: 145.3, duration: 5.9 }
            ],
            [
              { startTime: 13.9, duration: 1.5 },
              { startTime: 104.8, duration: 1.8 },
              { startTime: 151.5, duration: 2.5 }
            ]
          ];
      }
    } else if (gameType === "dog63") {
    }
    return [];
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean, language: string): OddsScreenDog["anims"] {
    if (this.oddsAlwaysOn && language !== "it") language = "default";
    if (gameType === "horse") {
      if (this.oddsAlwaysOn) {
        return oddsAlwayOnOddScreenTimings.horse[language as "default" | "it"];
      }
      return [
        { startTime: 1.3, duration: 24.8, fadeInFactor: 0.75 },
        { startTime: 101.7, duration: 18.3, fadeInFactor: 0.75 },
        withBonus ? { startTime: 161.0, duration: 15.3, fadeInFactor: 0.75 } : { startTime: 156.3, duration: 19.7, fadeInFactor: 0.75 }
      ];
    } else if (gameType === "sulky") {
      if (this.oddsAlwaysOn) {
        return oddsAlwayOnOddScreenTimings.sulky[language as "default" | "it"];
      }
      return [
        { startTime: 1.3, duration: 24.8, fadeInFactor: 0.75 },
        { startTime: 101.7, duration: 18.3, fadeInFactor: 0.75 },
        withBonus ? { startTime: 161.0, duration: 15.3, fadeInFactor: 0.75 } : { startTime: 156.3, duration: 19.7, fadeInFactor: 0.75 }
      ];
    } else if (gameType === "dog6") {
      switch (gameLength) {
        case 120:
          if (this.oddsAlwaysOn) {
            return oddsAlwayOnOddScreenTimings.dog6[120];
          }
          return [
            { startTime: 1.8, duration: 13.2, fadeInFactor: 0.75 },
            withBonus ? { startTime: 35.6, duration: 21.5, fadeInFactor: 0.75 } : { startTime: 30.7, duration: 26.2, fadeInFactor: 0.75 }
          ];
        case 180:
          return [
            withBonus ? { startTime: 1.8, duration: 17.5, fadeInFactor: 0.75 } : { startTime: 1.75, duration: 22.5, fadeInFactor: 0.75 },
            withBonus ? { startTime: 90.8, duration: 26.0 } : { startTime: 90.8, duration: 26.2 }
          ];
        case 240:
          if (this.oddsAlwaysOn) {
            return oddsAlwayOnOddScreenTimings.dog6[language === "it" ? "it" : 240];
          }
          return [
            language === "it" ? { startTime: 10.2, duration: 18.4 } : { startTime: 1.8, duration: 27.0 },
            { startTime: 91.0, duration: 26.5 },
            withBonus ? { startTime: 150.2, duration: 27.3, fadeOutFactor: 0.7 } : { startTime: 140.8, duration: 36.2 }
          ];
        case 300:
          if (this.oddsAlwaysOn) {
            return oddsAlwayOnOddScreenTimings.dog6.it;
          }
          return [
            withBonus
              ? { startTime: 1.8, duration: withBonus ? 27.0 : 31.7 }
              : language === "it"
                ? { startTime: 10.3, duration: withBonus ? 27.0 : 23.5, fadeOutFactor: 0.5 }
                : { startTime: 1.8, duration: withBonus ? 27.0 : 31.7 },
            withBonus ? { startTime: 90.9, duration: 27.1 } : { startTime: 101.0, duration: 26.5 },
            { startTime: 156.3, duration: 35.3 }
          ];
        default: {
          return [{ startTime: 4.5, duration: 24.0 }, { startTime: 112.7, duration: 24.5 }, withBonus ? { startTime: 161, duration: 15.5 } : { startTime: 146, duration: 15.5 }];
        }
      }
    }

    if (gameType === "dog63") {
      if (gameLength === 360) return oddsAlwayOnOddScreenTimings.dog63_6;
      if (withBonus) return oddsAlwayOnOddScreenTimings.dog63.bonus;
      return oddsAlwayOnOddScreenTimings.dog63[language as keyof typeof oddsAlwayOnOddScreenTimings.dog63];
    }
    // dog
    switch (gameLength) {
      case 120:
        if (this.oddsAlwaysOn) {
          return oddsAlwayOnOddScreenTimings.dog8[120];
        }
        return [
          { startTime: 1.1, duration: withBonus ? 12.0 : 11.8, fadeInFactor: 0.55 },
          withBonus ? { startTime: 35.5, duration: 21.5, fadeInFactor: 0.75 } : { startTime: 30.5, duration: 26.5, fadeInFactor: 0.75 }
        ];
      case 180:
        return [
          { startTime: withBonus ? 1.1 : 1.2, duration: withBonus ? 17.0 : 21.7, fadeInFactor: 0.7 },
          { startTime: 91.0, duration: 26.0 } // maybe with bonus??
        ];
      case 240:
        if (this.oddsAlwaysOn) {
          return oddsAlwayOnOddScreenTimings.dog8[language === "it" ? "it" : 240];
        }
        return [
          language === "it" ? { startTime: 10.2, duration: 18.7, fadeOutFactor: 1.3 } : { startTime: 1.2, duration: 26.5, fadeOutFactor: 1.3 },
          { startTime: 100.8, duration: 22.2 }, // maybe with bonus??
          withBonus ? { startTime: 155.5, duration: 21.3 } : { startTime: 146.2, duration: 30.0, fadeInFactor: 1.1 }
        ];
      case 300:
        if (this.oddsAlwaysOn) {
          return oddsAlwayOnOddScreenTimings.dog8.it;
        }
        return [
          language === "it" ? { startTime: withBonus ? 1.1 : 10.3, duration: withBonus ? 27.0 : 23.0 } : { startTime: withBonus ? 1.1 : 1.3, duration: withBonus ? 27.0 : 31.2 },
          withBonus ? { startTime: 100.8, duration: 22.3 } : { startTime: 110.8, duration: 22.2 }, // maybe with bonus??
          { startTime: 161.0, duration: 31.0, fadeInFactor: 1.2 }
        ];
      default: {
        return [
          { startTime: 4.8, duration: 31.0 },
          withBonus
            ? { startTime: 157.5, duration: 19.0 } // maybe with bonus??
            : { startTime: 152.7, duration: 21.0 }
        ];
      }
    }
  }

  // fill texts with infos from model
  public fill(racers: IDriver[], odds: number[], colors: IColors, withBonus: boolean) {
    this.racers = racers;
    const style = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(22),
      fill: DogHelper.getWhiteColor(), // "white",
      align: "center"
    });
    const styleBold = new PIXI.TextStyle({
      fontFamily: "DIN-Heavy",
      fontSize: _s(22),
      fill: DogHelper.getWhiteColor(), // "white",
      align: "center"
    });

    if (this.oddsAlwaysOn) {
      const { fontSize, fontFamily } = oddsAlwaysOnStyles[this.gameType as keyof typeof oddsAlwaysOnStyles].oddsScreen.odds;
      style.fontSize = _s(fontSize);
      styleBold.fontSize = _s(fontSize);
      styleBold.fontFamily = fontFamily;
    }

    if (this.gameType === "dog63") {
      const mappedOdds: number[] = [];

      for (let iRow = 0; iRow < this.racerCount; iRow++) {
        for (let iCol = 0; iCol < this.racerCount; iCol++) {
          const val = Logic.getDog63OddsForDriver(odds, iRow, iCol, this.racerCount, true);
          mappedOdds.push(val);
        }
      }

      odds = mappedOdds;
    }
    const minMax = Logic.calcOddsMinMax(odds, racers.length);

    for (let iRow = 0; iRow < this.racerCount; iRow++) {
      for (let iCol = 0; iCol < this.racerCount; iCol++) {
        const val = Logic.getOddsForDriver(odds, this.gameType === "dog63" ? iCol : iRow, this.gameType === "dog63" ? iRow : iCol, this.racerCount);
        const afterDigitsOverwrite = Logic.getOddsForDriverDigits(odds, this.gameType === "dog63" ? iCol : iRow, this.gameType === "dog63" ? iRow : iCol, this.racerCount);

        let oddsColor;
        const text = this.oddsTexts[iCol + iRow * this.racerCount];

        if (afterDigitsOverwrite === null) {
          text.text = Logic.implementation.formatOdds(val);
        } else {
          text.text = Logic.implementation.formatOdds(val, afterDigitsOverwrite);
        }

        text.style = oddsColor !== "white" ? styleBold : style;

        if (this.gameType === "dog63") {
          oddsColor = Logic.getOddsColor(minMax, val, iCol, iRow);
          if (iRow === iCol) {
            text.text = Logic.implementation.formatOdds(val, 2);
          }
        } else {
          oddsColor = Logic.getOddsColor(minMax, val, iRow, iCol);
        }

        text.style = oddsColor !== "white" ? styleBold : style;
        text.tint = ColorsHelper.toColor(colors[oddsColor]);

        if (settings.showDebugTextColor) text.style.fill = "orange";

        text.style.trim = true;
        text.style.padding = 10;
      }
    }

    this.oddsHeaderVicente.text = _t("winner");
    this.oddsHeaderAccopiata.text = _t("forcastBet");

    if (this.oddsAlwaysOn && (this.gameType === "horse" || this.gameType === "sulky")) {
      Logic.autoSize(this.oddsHeaderAccopiata, _s(193));
    } else if (this.oddsAlwaysOn && this.gameType === "dog8") {
      Logic.autoSize(this.oddsHeaderAccopiata, _s(279));
    } else if (this.oddsAlwaysOn && this.gameType === "dog6") {
      Logic.autoSize(this.oddsHeaderAccopiata, _s(360));
    }

    this.first.text = _t("first").replace("_", "");
    this.second.text = _t("second").replace("_", "");

    this.anims = this.createAnims(this.gameType, this.gameLength, withBonus, this.language);
    const headerAnims = this.createOddsHeaderAnims(this.gameType, this.gameLength, this.language, withBonus);
    if (headerAnims.length > 1) {
      this.oddsHeaderVicenteAnims = headerAnims[0];
      this.oddsHeaderAccopiataAnims = headerAnims[1];
    }
  }

  // set positions and sizes when layout changes
  public onLayout() {
    const isDog8 = this.gameType === "dog8";
    const isHorse = this.gameType === "horse" || this.gameType === "sulky";

    let oddsHeaderX = isDog8 ? 113 : 167;
    let oddsHeaderY = -3;
    let firstX = isDog8 ? -6 : 36;
    let firstY = isDog8 ? 333 : isHorse ? 338 : 292;
    let secondY = isHorse ? -6 : -5;
    let secondX = isDog8 ? 682 : isHorse ? 730 : 634;

    if (this.oddsAlwaysOn) {
      const { x: xFirst, y: yFirst } = oddScreenSettings[this.gameType as keyof typeof oddScreenSettings].first;
      const { x: xSecond, y: ySecond } = oddScreenSettings[this.gameType as keyof typeof oddScreenSettings].second;

      const { x: xHeader, y: yHeader } = oddScreenSettings[this.gameType as keyof typeof oddScreenSettings].itHeader;

      oddsHeaderX = xHeader;
      oddsHeaderY = yHeader;

      firstX = xFirst;
      firstY = yFirst;

      secondX = xSecond;
      secondY = ySecond;

      this.oddsHeaderVicente.anchor.set(0, 0.5);
      this.oddsHeaderAccopiata.anchor.set(0, 0.5);
    }

    this.oddsHeaderVicente.position.x = _s(oddsHeaderX);
    this.oddsHeaderVicente.position.y = _s(oddsHeaderY);
    this.oddsHeaderAccopiata.position.x = this.oddsHeaderVicente.position.x;
    this.oddsHeaderAccopiata.position.y = this.oddsHeaderVicente.position.y;

    this.first.position.x = _s(firstX);
    this.first.rotation = -Math.PI * 0.5;
    this.first.position.y = _s(firstY);

    this.second.position.x = _s(secondX);
    this.second.position.y = _s(secondY);
  }

  // the startTime and duration of the appearance -> can be more than one
  private anims: (IAnimInterval & {
    fadeInFactor?: number;
    fadeOutFactor?: number;
    initAnimation?: boolean;
    startSm?: boolean;
    getDurationOffset?: Function;
    subAnimations?: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number; smoothness?: { in: number; out: number } })[];
  })[] = []; // = createEmptyDogAnims();

  // use update for fading, animations and so on...
  public update(dt: number) {
    super.update(dt);

    // get animation if there is one for current videotime...
    const t = Logic.getVideoTime();
    //const updateAnims = Logic.wasActionTriggered();
    const anim = Logic.getAnim(t, this.anims, this, { offsetTime: 1 });
    if (!anim) {
      if (this.oddsAlwaysOn && Logic.wasActionTriggered()) {
        this.container.scale.x = 1;
        this.container.scale.y = 1;
        const xFrom = _s(mainElementPositionSizes[this.gameType as keyof typeof mainElementPositionSizes].oddsScreen.x);
        const yFrom = _s(mainElementPositionSizes[this.gameType as keyof typeof mainElementPositionSizes].oddsScreen.y);
        this.container.position.x = xFrom;
        this.container.position.y = yFrom;
      }
      return;
    }

    if (anim.startTime < 1.2 && this.useOverlays) {
      anim.startTime = anim.startTime + 0.7;
      anim.duration = anim.duration - 0.7;
    }

    if (anim.getDurationOffset !== undefined) {
      anim.duration = Logic.getIntroLength() - anim.getDurationOffset(this.gameLength)!;
    } else if (anim.getDurationOffset === undefined && this.oddsAlwaysOn) {
      anim.duration = Logic.getIntroLength() - 4;
    }

    const fadeInFactor = anim.fadeInFactor ? anim.fadeInFactor : 1;
    const fadeOutFactor = anim.fadeOutFactor ? anim.fadeOutFactor : 1;

    const baseFactor = t - anim.startTime;

    const oddsHeaderVicenteAnim = Logic.getAnim(t, this.oddsHeaderVicenteAnims, this.oddsHeaderVicente);
    const oddsHeaderAccopiataAnim = Logic.getAnim(t, this.oddsHeaderAccopiataAnims, this.oddsHeaderAccopiata);

    if (oddsHeaderVicenteAnim) {
      AnimHelper.animateInOut(t, oddsHeaderVicenteAnim.startTime, oddsHeaderVicenteAnim.startTime + oddsHeaderVicenteAnim.duration, 1, 0, 1, (alpha) => (this.oddsHeaderVicente.alpha = alpha), 0.2, 0);
    }
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

    if (anim.startSm) {
      const { oddsScreenPosXTo, oddsScreenPosYTo, oddsScreenScaleTo } = oddScreenSettings[this.gameType as keyof typeof oddScreenSettings];
      this.container.scale.x = oddsScreenScaleTo;
      this.container.scale.y = oddsScreenScaleTo;

      this.container.position.x = _s(oddsScreenPosXTo);
      this.container.position.y = _s(oddsScreenPosYTo);
    }

    if (baseFactor < anim.duration - 1) {
      for (let iRow = 0; iRow < this.racerCount; iRow++) {
        const rowFactor = baseFactor - iRow * 0.1 * fadeInFactor;
        for (let iCol = 0; iCol < this.racerCount; iCol++) {
          const index = iCol + iRow * this.racerCount;
          this.oddsTexts[index].alpha = rowFactor - iCol * 0.1 * fadeInFactor;
        }
      }
      this.arrowContainer.alpha = AnimHelper.clamp(baseFactor);
      this.setDebugFade(AnimHelper.clamp(baseFactor));
      if (this.gameType === "dog6") {
        this.first.alpha = AnimHelper.clamp(baseFactor);
        this.second.alpha = this.first.alpha;
      } else {
        this.first.alpha = AnimHelper.clamp((baseFactor - 0.3) * 2);
        this.second.alpha = AnimHelper.clamp((baseFactor - 0.4) * 2);
      }
      if (this.oddsAlwaysOn) return this.updateOddsAlwaysOn(t, anim as IExtendetAnimInterval);
    } else {
      if (anim.startSm) {
        this.container.scale.x = 1;
        this.container.scale.y = 1;
        const xFrom = _s(mainElementPositionSizes[this.gameType as keyof typeof mainElementPositionSizes].oddsScreen.x);
        const yFrom = _s(mainElementPositionSizes[this.gameType as keyof typeof mainElementPositionSizes].oddsScreen.y);
        this.container.position.x = xFrom;
        this.container.position.y = yFrom;
      }
      this.animateOutScreen(baseFactor, anim, fadeOutFactor);
    }
  }

  private animateOutScreen(baseFactor: number, anim: IAnimInterval, fadeOutFactor: number) {
    const limitedBaseFactor = AnimHelper.limit(baseFactor, anim.duration);
    for (let iRow = 0; iRow < this.racerCount; iRow++) {
      const rowFactor = limitedBaseFactor + (this.racerCount - iRow) * 0.05 * fadeOutFactor;
      for (let iCol = 0; iCol < this.racerCount; iCol++) {
        const index = iCol + iRow * this.racerCount;
        // this.oddsTexts[index].alpha = rowFactor;
        this.oddsTexts[index].alpha = rowFactor - iCol * 0.05 * fadeOutFactor;
      }
    }
    this.setDebugFade(AnimHelper.clamp(baseFactor));
    this.arrowContainer.alpha = AnimHelper.clamp((anim.duration - baseFactor + 2) * 2);
    if (this.oddsAlwaysOn) {
      this.first.alpha = AnimHelper.clamp((anim.duration - baseFactor + 1.1) * 2);
      this.second.alpha = AnimHelper.clamp((anim.duration - baseFactor + 1.1) * 2);
    } else if (this.gameType === "dog6") {
      this.first.alpha = AnimHelper.clamp((anim.duration - baseFactor + 0.3) * 2);
      this.second.alpha = AnimHelper.clamp((anim.duration - baseFactor + 1) * 2);
    } else {
      this.first.alpha = AnimHelper.clamp((anim.duration - baseFactor + 0.5) * 2);
      this.second.alpha = AnimHelper.clamp((anim.duration - baseFactor + 0.0) * 2);
    }
  }

  public updateOddsAlwaysOn(t: number, currentAnim: IExtendetAnimInterval) {
    const anim = Logic.getAnim(t, currentAnim.subAnimations, new PIXI.Container());
    const xFrom = _s(mainElementPositionSizes[this.gameType as keyof typeof mainElementPositionSizes].oddsScreen.x);
    const yFrom = _s(mainElementPositionSizes[this.gameType as keyof typeof mainElementPositionSizes].oddsScreen.y);
    const currentSubAnim = anim as SubAnim;

    if (!currentSubAnim) {
      this.container.scale.x = 1;
      this.container.scale.y = 1;
      this.container.position.x = xFrom;
      this.container.position.y = yFrom;
      return;
    }

    if (currentAnim.startSm) {
      currentAnim.subAnimations![0].startSm = true;
    }

    const start = currentSubAnim.startTime;
    const duration = currentSubAnim.startTime + currentSubAnim.duration;

    const fadeInFrom = 1;
    const fadeInTo = oddScreenSettings[this.gameType as keyof typeof oddScreenSettings].oddsScreenScaleTo;
    const x = _s(oddScreenSettings[this.gameType as keyof typeof oddScreenSettings].oddsScreenPosXTo);
    const y = _s(oddScreenSettings[this.gameType as keyof typeof oddScreenSettings].oddsScreenPosYTo);

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
    const val =
      fadeOutFrom +
      (fadeOutTo - fadeOutFrom) *
        (this.gameType === "dog63" ? AnimHelper.easeOutSine((currentTime - (end - fadeOut)) / fadeOut, smoothness) : AnimHelper.easeOutCirc((currentTime - (end - fadeOut)) / fadeOut, smoothness));
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
      const val =
        fadeInFrom +
        (fadeInTo - fadeInFrom) * (this.gameType === "dog63" ? AnimHelper.easeOutSine((currentTime - start) / fadeIn, smoothness) : AnimHelper.easeOutCirc((currentTime - start) / fadeIn, smoothness));
      fadeInCallback(val);
      return;
    }
    fadeInCallback(fadeInTo);
    return;
  }
}
