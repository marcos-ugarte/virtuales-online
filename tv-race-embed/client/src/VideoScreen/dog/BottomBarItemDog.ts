import { BottomBarTimings } from "./../../../settings/BottomBarSettings";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { Dog63Helper } from "./../dog63/Dog63Helper";
import { IDog63QuoteInfo } from "./../../Logic/LogicDefinitions";
import { _t } from "./../../Logic/Logic";
import { oddsAlwaysOnStyles, bottomBarSettings, oddsAlwaysOnBottomBarFactor, oddsAlwayOnBottomBarTimings } from "./../../../settings/OddsAlwaysOnSettings";
import { AnimHelper } from "./../common/Anim";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings } from "client/Logic/Logic";
import { IColors, IDriver, IGameInfo, IAnimInterval } from "client/Logic/LogicDefinitions";
import { MultiStyleText } from "./../common/MultiStyleText";
import { DrawHelper } from "../common/DrawHelper";
import { Util } from "common/Util";
import { GameType, GameLength } from "common/Definitions";
import { DogHelper } from "./DogHelper";
import { bottomBarMode } from "./BottomBarDog";
import { Dog63Bar } from "../dog63/Intro/RacingHistory/Dog63Bar";
import StatArrow from "../../../assets/general/arrow_stat_white.svg";
import { ColorsHelper } from "../Util/ColorsHelper";
import { trackKart } from "client/LogicImplementation/ModelKart";
export class BottomBarItemDogAnim implements IAnimInterval {
  public startTime: number = 0;
  public duration: number = 0;
  public infoStartTime?: number;
  public infoTime?: number;
  public fadeInTime?: number;
  public fadeOutStart?: number;
  public fadeOutTime?: number;
  public fadeTimePerLine?: number = 0.12;
  public atOnce?: boolean;
  public factor?: number;
  public instant?: { in: boolean; out: boolean };
}
export class BottomBarItemDog extends Group {
  private index: number;
  private numberText: PIXI.Text;
  /*private nameGroup: PIXI.Container;
  private driverName: MultiStyleText[] = [];*/
  private driverName!: MultiStyleText;
  private infoKeys: PIXI.Text[] = [];
  private infoValues: PIXI.Text[] = [];
  private infoGroup: PIXI.Container;
  private infoGroupWithMask: PIXI.Container;
  private infoGroupMask: PIXI.Sprite;
  private nameBar: PIXI.Graphics;

  private fieldCount: number;
  private lineHeight: number;
  private xOffsetPerField: number = 20 / 4;
  private gameInfo: IGameInfo;
  private racerCount: number;
  private _helper: DogHelper;
  private oddsAlwaysOn;
  private useOverlays;
  private mode: bottomBarMode;

  private trendArrow = new PIXI.Sprite();

  public constructor(index: number, gameInfo: IGameInfo, helper: DogHelper, oddsAlwaysOn = false, mode: bottomBarMode, fieldCount = 4) {
    super();
    this.showDebug(settings.debug, 1, "BottomBarItemDog");

    this.fieldCount = fieldCount;
    this.gameInfo = gameInfo;
    this.racerCount = Logic.getRacerCount(gameInfo.gameType);
    this.lineHeight = 88 / this.fieldCount;
    this._helper = helper;
    this.mode = mode;
    this.oddsAlwaysOn = oddsAlwaysOn;
    this.index = index;
    this.useOverlays = gameInfo.useOverlays;

    let maskWidth = _s(152.5);
    let maskHeigth = _s(87.5);

    if (this.oddsAlwaysOn) {
      const {
        lineHeigth,
        xOffsetPerField,
        mask: { width, heigth }
      } = bottomBarSettings[this.gameInfo.gameType as keyof typeof bottomBarSettings][mode];

      this.lineHeight = lineHeigth / this.fieldCount;
      this.xOffsetPerField = xOffsetPerField;

      maskWidth = _s(width);
      maskHeigth = _s(heigth);
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-HeavyItalic",
        fontSize: _s(22),
        fill: DogHelper.getWhiteColorNumber(),
        fontStyle: "italic"
      });
      this.numberText = Logic.createPixiText(style, "" + (index + 1));
      this.numberText.position.y = _s(19);
      this.numberText.position.x = _s(29);
      this.numberText.anchor.set(0.5);
      this.container.addChild(this.numberText);
      this.numberText.visible = this.useOverlays;
    }

    /*this.nameGroup = new PIXI.Container();
    this.nameGroup.x = this.oddsAlwaysOn ? _s(49 + this.xOffsetName) : _s(46 + this.xOffsetName);
    this.add(this.nameGroup);*/

    this.driverName = new MultiStyleText();
    this.driverName.x = _s(55);
    this.driverName.y = _s(12);
    this.add(this.driverName);

    this.nameBar = new PIXI.Graphics();
    this.nameBar.x = _s(49);
    this.add(this.nameBar);

    this.infoGroupWithMask = new PIXI.Container();
    this.add(this.infoGroupWithMask);

    this.infoGroup = new PIXI.Container();
    this.infoGroupWithMask.addChild(this.infoGroup);

    this.infoGroup.addChild(this.trendArrow);

    {
      const greyStyle = new PIXI.TextStyle({
        fontFamily: "DIN-UltraLightItalic",
        fontSize: _s(12),
        fill: DogHelper.getLightGrayColorNumber(),
        fontStyle: "italic"
      });
      const whiteStyle = new PIXI.TextStyle({
        fontFamily: "DIN-RegularItalic",
        fontSize: _s(12),
        fill: DogHelper.getWhiteColor(),
        fontStyle: "italic"
      });

      if (this.oddsAlwaysOn) {
        const {
          bottomBar: { fontSize }
        } = oddsAlwaysOnStyles[this.gameInfo.gameType as keyof typeof oddsAlwaysOnStyles];
        greyStyle.fontSize = _s(fontSize);
        whiteStyle.fontSize = _s(fontSize);
      }

      // detail info per driver
      for (let i = 0; i < this.fieldCount; i++) {
        const key = Logic.createPixiText(greyStyle);
        key.x = _s(250 - this.xOffsetPerField * i);
        key.y = _s(10 + this.lineHeight * i);

        if (this.oddsAlwaysOn) {
          const {
            key: { xOffset, yOffset }
          } = bottomBarSettings[this.gameInfo.gameType as "dog6" | "dog8" | "horse" | "sulky"][mode];
          key.x = _s(xOffset - this.xOffsetPerField * i);
          key.y = _s(yOffset + this.lineHeight * i);
        }

        key.anchor.set(0, 0.5);
        this.infoKeys.push(key);
        this.infoGroup.addChild(key);

        const value = Logic.createPixiText(whiteStyle);
        value.x = key.x;
        value.y = key.y;
        value.anchor.set(1, 0.5);
        this.infoValues.push(value);
        this.infoGroup.addChild(value);
      }

      Logic.loadSVG(StatArrow as string, { width: _s(12) }).then((texture) => {
        this.trendArrow.texture = texture;
      });

      const maskTexture = DrawHelper.createSkewedRoundedRectangleTexture(maskWidth, maskHeigth, _s(12.5), _s(19), { type: "solid", color: "red" });
      this.infoGroupMask = new PIXI.Sprite(maskTexture);
      this.infoGroupMask.alpha = 1;
      this.infoGroupWithMask.addChild(this.infoGroupMask);
      this.infoGroupWithMask.mask = this.infoGroupMask; // comment/uncomment mask
    }
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean, language: string): BottomBarItemDogAnim[] {
    if (gameType === "horse" || gameType === "sulky") {
      if (this.oddsAlwaysOn) {
        return oddsAlwayOnBottomBarTimings.horse[384].anims;
      }
      return BottomBarTimings.horse.getAnims(withBonus);
    }
    if (gameType === "dog6") {
      if (this.oddsAlwaysOn) {
        return oddsAlwayOnBottomBarTimings.dog[gameLength as 120 | 240 | 300].anims;
      }
      return BottomBarTimings.dog6.getAnims(gameLength as 120 | 240 | 300, withBonus, language === "it");
    }
    if (gameType === "dog63") {
      if (this.oddsAlwaysOn) {
        if (gameLength === 360) {
          return oddsAlwayOnBottomBarTimings.dog63_6[this.mode].anims;
        }
        return oddsAlwayOnBottomBarTimings.dog63[this.mode].anims;
      }
    }
    // dog8
    if (this.oddsAlwaysOn) {
      return oddsAlwayOnBottomBarTimings.dog8[gameLength as 120 | 240 | 300].anims;
    }
    return BottomBarTimings.dog8.getAnims(gameLength as 120 | 240 | 300, withBonus, language === "it");
  }

  private addTrendArrow(value: string | number, x: number, y: number) {
    this.trendArrow.x = x;
    this.trendArrow.anchor.set(0.5);
    this.trendArrow.y = y;

    const trend = parseInt(value + "", 16);

    const arrowColors = DogHelper.getStatArrowColors();
    this.trendArrow.cacheAsBitmap = false;
    this.trendArrow.tint = 0xffffff;
    this.trendArrow.rotation = 0;
    switch (trend) {
      case 1:
        this.trendArrow.rotation = Math.PI / 2;
        this.trendArrow.tint = arrowColors.DOWN90;
        break;
      case 2:
        this.trendArrow.tint = arrowColors.DOWN45;
        this.trendArrow.rotation = Math.PI / 4;
        break;
      case 3:
        this.trendArrow.tint = arrowColors.NEUTRAL;
        break;
      case 4:
        this.trendArrow.rotation = -Math.PI / 4;
        this.trendArrow.tint = arrowColors.UP45;
        break;
      case 5:
        this.trendArrow.rotation = -Math.PI / 2;
        this.trendArrow.tint = arrowColors.UP90;
        break;
    }
    this.trendArrow.cacheAsBitmap = true;
  }

  public fill(driver: IDriver, colors: IColors, withBonus: boolean, language: string): void {
    /*for (const item of this.driverName) {
      if (item) this.nameGroup.removeChild(item);
    }
    for (let i = 0; i < driver.firstName.length; i++) {
      this.driverName[i] = new MultiStyleText();
      this.driverName[i].text = driver.firstName.toUpperCase()[i]; //  + " <b>" + driver.lastName.toUpperCase() + "</b>";
      if (driver.firstName.length >= 12) {
        this.driverName[i].styles = this._helper.getBottomBarItemNameLongStyle();
      } else {
        this.driverName[i].styles = this._helper.getBottomBarItemNameStyle();
      }
      this.driverName[i].y = this.oddsAlwaysOn ? _s(3 + this.yOffsetName) : _s(1 + this.yOffsetName);
      this.driverName[i].x = this.getWidth(this.driverName, i, driver.firstName.length);
      this.driverName[i].anchor.set(0, 0.51);
      this.nameGroup.addChild(this.driverName[i]);
    }*/
    //this.numberText.tint = ColorsHelper.toColor(driver.color);
    this.numberText.style.fill = DogHelper.getWhiteColor();
    this.driverName.text = driver.firstName.toUpperCase(); //  + " <b>" + driver.lastName.toUpperCase() + "</b>";
    this.driverName.styles = this._helper.getBottomBarItemNameStyle();
    this.driverName.anchor.set(0, 0.51);

    for (let i = 0; i < this.infoKeys.length; i++) {
      this.infoKeys[i].text = driver.driverInfos[i].key;
      this.trendArrow.visible = false;

      if (driver.driverInfos[i].arrow) {
        const trend = driver.driverInfos[i].value;
        this.addTrendArrow(trend, this.infoValues[i].x + _s(this.infoGroup.width - 30), this.infoValues[i].y);
        this.trendArrow.visible = true;
      } else {
        this.infoValues[i].text = driver.driverInfos[i].value;
      }
      Logic.autoSize(this.infoValues[i], _s(50));
      Logic.autoSize(this.infoKeys[i], _s(85));
    }

    this.anims = this.createAnims(this.gameInfo.gameType, this.gameInfo.gameLength, withBonus, language);
  }

  public fillAdditionalChanceInformation(peso: string, ultime5: number[], val: number, driver: IDriver) {
    this.driverName.text = driver.firstName.toUpperCase(); //  + " <b>" + driver.lastName.toUpperCase() + "</b>";
    this.driverName.styles = this._helper.getBottomBarItemNameStyle();
    this.driverName.anchor.set(0, 0.51);

    const ultime5String = ultime5.join("-");

    const chanceHeaders = [_t("weight"), _t("theLastFive"), _t("trendTxt")];
    const chanceValues = [peso, ultime5String, ""];

    for (let i = 0; i < this.infoKeys.length; i++) {
      this.addTrendArrow(val, this.infoValues[i].x + _s(this.infoGroup.width - 30), this.infoValues[i].y);

      this.infoKeys[i].text = chanceHeaders[i];
      // resize fontsize to fit in box
      Logic.autoSize(this.infoKeys[i], _s(85));
      this.infoValues[i].text = chanceValues[i];
      Logic.autoSize(this.infoValues[i], _s(50));
    }
    this.anims = this.createAnims(this.gameInfo.gameType, this.gameInfo.gameLength, false, "it");
  }

  public fillAdditionalQuoteInformation(
    quotes: IDog63QuoteInfo[],
    minMaxQuotes: (
      | {
          big: number;
          i: number;
          small?: undefined;
        }
      | {
          small: number;
          i: number;
          big?: undefined;
        }
      | undefined
    )[],
    driver: IDriver
  ) {
    this.driverName.text = driver.firstName.toUpperCase(); //  + " <b>" + driver.lastName.toUpperCase() + "</b>";
    this.driverName.styles = this._helper.getBottomBarItemNameStyle();
    this.driverName.anchor.set(0, 0.51);

    const chanceHeaders = [_t("numberSign"), _t("numberSignTwo"), _t("numberSignThree"), _t("placeBet"), _t("showBet")];
    const formattedQuotes: string[] = [];
    quotes.forEach((quote) => {
      formattedQuotes.push(Dog63Helper.formatQuote(quote.quote, quote.betCodeId));
    });

    for (let row = 0; row < this.infoKeys.length; row++) {
      this.infoKeys[row].text = chanceHeaders[row];
      this.infoValues[row].text = formattedQuotes[row];

      const isElMinMax = minMaxQuotes.find((el) => el?.i === row);
      if (!isElMinMax) {
        this.infoValues[row].tint = Dog63Helper.getWhiteColorNumber();
      } else if (isElMinMax?.big) {
        this.infoValues[row].tint = Dog63Helper.getRedColorNumber();
      } else if (isElMinMax?.small) {
        this.infoValues[row].tint = Dog63Helper.getGreenColorNumber();
      }
      Logic.autoSize(this.infoValues[row], _s(50));
    }
    this.trendArrow.visible = false;
    this.anims = this.createAnims(this.gameInfo.gameType, this.gameInfo.gameLength, false, "it");
  }

  public onLayout() {
    //this.nameGroup.position.y = this.height * 0.5 + _s(1);
    //this.driverName.position.y = this.height * 0.5 + _s(1);
    //this.driverName.style.letterSpacing = 0;

    this.infoGroupWithMask.y = _s(-88);
    this.infoGroupWithMask.x = _s(17);

    if (this.oddsAlwaysOn) {
      const { infoGroupWithMask } = bottomBarSettings[this.gameInfo.gameType as keyof typeof bottomBarSettings][this.mode];

      this.infoGroupWithMask.y = _s(infoGroupWithMask.y);
      this.infoGroupWithMask.x = _s(infoGroupWithMask.x);
    }
  }
  private anims: BottomBarItemDogAnim[] = [];

  public update(dt: number) {
    super.update(dt);

    const horse_oao = this.oddsAlwaysOn && this.gameInfo.gameType === "horse";
    const dogPro_oao = this.oddsAlwaysOn && this.gameInfo.gameType === "dog63";

    const ct = Logic.getVideoTime();
    const anim = Logic.getAnim(ct, this.anims, this);
    if (!anim) return;

    // baseFactor is 0 from startTime of the video
    const baseFactor = ct - (anim.startTime + 0.1 * this.index);
    let indexFactor = this.index;
    if (this.oddsAlwaysOn) indexFactor = 0;

    const fadeOutFactor = AnimHelper.clamp((ct - (anim.startTime - 0.1 * indexFactor) - anim.duration) * 2);
    this.container.alpha = 1.0 - fadeOutFactor;

    if (ct < anim.startTime + anim.duration - (anim.instant?.in || anim.instant?.out ? 0 : 2.0) || Logic.wasActionTriggered()) {
      // fadein
      this.driverName.alpha = 1;

      const driverNameFactor = ct - (anim.startTime + 0.13 * this.index);
      // some movement to the right and back
      //this.nameGroup.x = _s(horse_oao ? 64 : 64) + (anim.instant?.in ? 0 : Math.sin(Util.clamp(driverNameFactor * 5, 0, Math.PI)) * 10);
      // fake letterspacing animation with scale - blurred...
      /*this.driverName.scale.x = 1 + (anim.instant?.in ? 0 : Math.sin(Util.clamp(driverNameFactor * 6, 0, Math.PI)) * 0.15);
      // some alpha animation
      this.driverName.alpha = anim.instant?.in ? 1 : driverNameFactor;*/

      AnimHelper.animateIn(driverNameFactor, 0, 0.1, 1, 0, 1, (f1) => {
        if (f1 !== 1 || Logic.wasActionTriggered()) {
          this.driverName.alpha = f1;
        }
      });

      /*AnimHelper.animateIn(driverNameFactor, 0, anim.duration, 1, 0, 1, (f1) => {
        if (f1 !== 1 || Logic.wasActionTriggered()) {
          //if (this.index === 1) console.log(this.nameGroup.children.length);
          for (let i = 0; i < this.driverName.length; i++) {
            this.driverName[i].x = this.getWidth(this.driverName, i, this.driverName.length) * f1;
          }
        }
      });*/
      /*this.driverName.cacheAsBitmap = false;
      const baseLetterSpacing = _s(1.5); // oder der gewünschte Endwert
      AnimHelper.animateIn(driverNameFactor, 0, anim.duration, 1, 0, 1, (f1) => {
        // Multipliziere den animierten Faktor mit dem Zielwert
        const newLetterSpacing = baseLetterSpacing * f1;
        this.driverName.setTagStyle("default", { letterSpacing: newLetterSpacing });
        this.driverName.updateText();
      });
      this.driverName.cacheAsBitmap = true;*/
    } else {
      if (anim.instant?.out !== undefined && !anim.instant.out) {
        AnimHelper.animateIn(ct, anim.startTime + anim.duration, 2, 0.5, 1, 0, (val) => (this.driverName.alpha = val));
      } else this.driverName.alpha = anim.instant?.out ? 0 : (anim.startTime + anim.duration - ct - 0.14 * this.index) * 2;
    }

    const f = AnimHelper.easeOut(AnimHelper.clampedRange(baseFactor, 0.5, 1.0));
    this.numberText.alpha = f;
    //this.numberText.x = _s(30 + (1.0 - f) * 100);
    this.numberText.scale.x = f;
    this.numberText.scale.y = f;

    if (anim.infoTime) {
      let infoFactorBase = ct - (anim.startTime + (anim.infoStartTime ? anim.infoStartTime : 0) + anim.infoTime * this.index);

      // let fade = AnimHelper.easeOut(infoFactorBase * 1.5, 5);
      const fadeInTime = anim.fadeInTime === undefined ? 1 : anim.fadeInTime;

      const lastRacer = this.index === this.racerCount - 1;
      const fadeOutTime = anim.fadeOutTime === undefined ? 1 : anim.fadeOutTime;
      const fadeOutStartNormal = anim.fadeOutStart === undefined ? 1 : anim.fadeOutStart;
      // MS fadeOutStartLast does not exist?
      const fadeOutStartLast = fadeOutStartNormal; // anim.fadeOutStartLast ? anim.fadeOutStartLast : fadeOutStartNormal;
      const fadeOutStart = lastRacer ? fadeOutStartLast : fadeOutStartNormal;
      const fadeTimePerLine = anim.fadeTimePerLine === undefined ? 0.12 : anim.fadeTimePerLine;
      if (anim.atOnce) {
        let factor = anim.factor ? anim.factor : oddsAlwaysOnBottomBarFactor[this.gameInfo.gameType as keyof typeof oddsAlwaysOnBottomBarFactor].bottomBar.factor;
        if (!(infoFactorBase * fadeTimePerLine <= fadeInTime) && factor !== 0.0) factor = -0.1;
        infoFactorBase = ct - (anim.startTime + (anim.infoStartTime ? anim.infoStartTime : 0) + anim.infoTime + this.index * factor);
      }
      for (let i = 0; i < this.infoKeys.length; i++) {
        let fade: number = 1.0;
        let fadeDistance = 140;

        if (infoFactorBase - i * fadeTimePerLine <= fadeInTime) {
          fade = AnimHelper.easeOut((infoFactorBase - i * fadeTimePerLine) * (1.0 / fadeInTime), 5);
        } else {
          fade = AnimHelper.easeIn(1.0 - (infoFactorBase - fadeOutStart + i * fadeTimePerLine) * (1.0 / fadeOutTime), 5);
          fadeDistance = 70;
        }

        const fadeX = fade;
        const alpha = fade * fade;

        let xPositionKey = 24;
        let xPositionValue = 118;
        if (this.oddsAlwaysOn) {
          const { finalKeyValXPos } = bottomBarSettings[this.gameInfo.gameType as keyof typeof bottomBarSettings][this.mode];
          xPositionKey = finalKeyValXPos.key;
          xPositionValue = finalKeyValXPos.value;
        }
        this.infoKeys[i].x = _s((1.0 - fadeX) * -fadeDistance) + _s(xPositionKey - this.xOffsetPerField * i);
        this.infoValues[i].x = this.infoKeys[i].x + _s(xPositionValue);
        this.trendArrow.x = this.infoKeys[i].x + _s(xPositionValue - 6);
        this.trendArrow.alpha = alpha;
        this.infoKeys[i].alpha = alpha;
        this.infoValues[i].alpha = alpha;
      }

      this.infoGroup.alpha = 1;
    } else {
      this.infoGroup.alpha = 0;
    }
  }

  private getWidth(s: MultiStyleText[], i: number, l: number): number {
    let width: number = 0;
    let factor = 2.25;
    if (l >= 12) {
      factor = 2.5;
    }

    for (let n = 0; n < i; n++) {
      let w = s[n].width;
      if (s[n].text === "I") {
        w = w / 1.6;
      }
      /* else if (s[n].text === "L" || s[n].text === "E") {
        w = w / 1.3;
      } else if (s[n].text === "M") {
        w = w / 1.15;
      }*/
      width += _s(w / factor);
    }

    return width + ((1.5 - _s(1)) * width) / 2.25;
  }
}
