import { dog63SuPrimiSmallSettings, dog63SuPrimiSmallTimings, dog63_6SuPrimiSmallTimings } from "./../../../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IAnimInterval, IDog63Suprimi } from "client/Logic/LogicDefinitions";
import { Dog63SuPrimi3Entry3 } from "../Dog63SuPrimi3Entry3";
import { Dog63Helper } from "../../Dog63Helper";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { DiagonalFadeHelper } from "client/VideoScreen/common/DiagonalFadeHelper";
import { oddsScreenMode } from "../../VideoScreenDog63";
import { Dog63SuPrimi3Entry2 } from "../Dog63SuPrimi3Entry2";
import { GameLength } from "common/Definitions";

export class Dog63SuPrimiSmall extends Group {
  private anims: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number })[] = [];

  private title: PIXI.Text;
  private subTitle: PIXI.Text;
  private screenMode: oddsScreenMode;
  private gameLength: GameLength;

  private entries2: Dog63SuPrimi3Entry2[][] = [];
  private entries3: Dog63SuPrimi3Entry3[][] = [];

  public constructor(mode: oddsScreenMode, gameLenght: GameLength) {
    super();
    this.screenMode = mode;
    this.gameLength = gameLenght;
    this.showDebug(settings.debug, undefined, "SuPrimi3Small " + mode);

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Medium",
        fontSize: _s(9),
        fill: Dog63Helper.getBlackColor(),
        align: "center",
        letterSpacing: _s(2.8)
      });
      this.title = Logic.createPixiText(style);
      this.title.anchor.set(0, 0);
      this.add(this.title);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-UltraLight",
        fontSize: _s(16),
        fill: Dog63Helper.getWhiteColor(),
        align: "center",
        letterSpacing: _s(0)
      });
      this.subTitle = Logic.createPixiText(style);
      this.subTitle.anchor.set(0.5, 0);
      this.add(this.subTitle);
    }

    for (let row = 0; row < 5; row++) {
      const entries2: Dog63SuPrimi3Entry2[] = [];
      const entries3: Dog63SuPrimi3Entry3[] = [];

      if (mode === oddsScreenMode.THREE_IN_THREE) {
        for (let i = 0; i < 4; i++) {
          const entry = new Dog63SuPrimi3Entry3(true);
          entries3.push(entry);
          this.add(entry);
        }
        this.entries3.push(entries3);
      } else {
        for (let i = 0; i < 3; i++) {
          const entry = new Dog63SuPrimi3Entry2(true);
          entries2.push(entry);
          this.add(entry);
        }
        this.entries2.push(entries2);
      }
    }
  }

  public createAnims(): IAnimInterval[] {
    if (Logic.implementation.getCurrentIntroGameLength() === 360) {
      return dog63_6SuPrimiSmallTimings[this.screenMode];
    }
    return dog63SuPrimiSmallTimings[this.screenMode];
  }

  public fill(drivers: IDriver[], suprimi: IDog63Suprimi, withBonus: boolean): void {
    this.anims = this.createAnims();

    let title;
    let subTitle;
    let autoSizePix = 300;
    switch (this.screenMode) {
      case oddsScreenMode.THREE_IN_THREE:
        title = _t("trioNotInO");
        subTitle = _t("firstThreeNiOsh");
        autoSizePix = 105;
        break;
      case oddsScreenMode.TWO_IN_TWO:
        title = _t("twoPlacedInTwo");
        subTitle = _t("firstThreeNiOsh");
        break;
      case oddsScreenMode.TWO_IN_THREE:
        title = _t("twoPlacedInThree");
        subTitle = _t("firstTwoNiOsh");
        autoSizePix = 150;
        break;
    }

    this.title.text = title;
    this.title.style.trim = true;
    Logic.autoSize(this.title, _s(autoSizePix));

    this.subTitle.text = subTitle;

    const minValuePerBlock: number[] = [1000, 1000, 1000];
    const maxValuePerBlock: number[] = [0, 0, 0];
    for (let row = 0; row < 5; row++) {
      for (let i = 0; i < 3; i++) {
        if (suprimi.block1[row][i].quote < minValuePerBlock[0]) minValuePerBlock[0] = suprimi.block1[row][i].quote;
        if (suprimi.block2[row][i].quote < minValuePerBlock[1]) minValuePerBlock[1] = suprimi.block2[row][i].quote;
        if (suprimi.block3[row][i].quote < minValuePerBlock[2]) minValuePerBlock[2] = suprimi.block3[row][i].quote;

        if (suprimi.block1[row][i].quote > maxValuePerBlock[0]) maxValuePerBlock[0] = suprimi.block1[row][i].quote;
        if (suprimi.block2[row][i].quote > maxValuePerBlock[1]) maxValuePerBlock[1] = suprimi.block2[row][i].quote;
        if (suprimi.block3[row][i].quote > maxValuePerBlock[2]) maxValuePerBlock[2] = suprimi.block3[row][i].quote;
      }
    }
    for (let row = 0; row < 5; row++) {
      if (this.screenMode === oddsScreenMode.THREE_IN_THREE) {
        for (let i = 0; i < 4; i++) {
          this.entries3[row][i].fill(drivers, suprimi.block3[row][i], minValuePerBlock[2], maxValuePerBlock[2]);
        }
      } else {
        const blockMode = this.screenMode === oddsScreenMode.TWO_IN_THREE ? suprimi.block2 : suprimi.block1;
        for (let i = 0; i < 3; i++) {
          this.entries2[row][i].fill(
            drivers,
            blockMode[row][i],
            minValuePerBlock[this.screenMode === oddsScreenMode.TWO_IN_THREE ? 1 : 0],
            maxValuePerBlock[this.screenMode === oddsScreenMode.TWO_IN_THREE ? 1 : 0]
          );
        }
      }
    }
  }

  public onLayout(): void {
    const { title, subTitle, rowOffset, rowHeight, columnOffset, columnWidth } = dog63SuPrimiSmallSettings[this.screenMode === oddsScreenMode.THREE_IN_THREE ? 0 : 1];

    this.title.anchor.set(0, 0.5);
    this.title.x = _s(title.x);
    this.title.y = _s(title.y);

    this.subTitle.x = _s(subTitle.x);
    this.subTitle.y = _s(subTitle.y);

    for (let row = 0; row < 5; row++) {
      if (this.screenMode === oddsScreenMode.THREE_IN_THREE) {
        for (let i = 0; i < 4; i++) {
          LayoutHelper.setScaledRectangle(this.entries3[row][i], columnOffset + columnWidth * i, rowOffset + rowHeight * row, columnWidth, rowHeight);
        }
      } else {
        for (let i = 0; i < 3; i++) {
          LayoutHelper.setScaledRectangle(this.entries2[row][i], columnOffset + columnWidth * i, rowOffset + rowHeight * row, columnWidth, rowHeight);
        }
      }
    }
  }

  public update(dt: number): void {
    super.update(dt);

    const time = Logic.getVideoTime();
    const anim = Logic.getAnim(time, this.anims, this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;
    const baseFactor = time - anim.startTime;
    this.visible = baseFactor >= 0 && baseFactor < anim.duration;

    DiagonalFadeHelper.FadeDiagonal(this, baseFactor, anim.duration, 3, 1, 2.5, Logic.videoScreen.width, Logic.videoScreen.height);
  }
}
