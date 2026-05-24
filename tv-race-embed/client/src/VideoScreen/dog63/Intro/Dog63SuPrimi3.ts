import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IAnimInterval, IDog63Suprimi } from "client/Logic/LogicDefinitions";
//import { BonusAnnotationDog } from "./BonusAnnotationDog";
import { GameType, GameLength } from "common/Definitions";
import { Dog63SuPrimi3Entry2 } from "./Dog63SuPrimi3Entry2";
import { Dog63SuPrimi3Entry3 } from "./Dog63SuPrimi3Entry3";
import { Dog63Helper } from "../Dog63Helper";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { DiagonalFadeHelper } from "client/VideoScreen/common/DiagonalFadeHelper";

export class Dog63SuPrimi3 extends Group {
  // private titleText: PIXI.Text;
  // private rows: RowItem[] = [];
  private anims: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number })[] = [];
  private gameType: GameType;
  private gameLength: GameLength;

  private title1: PIXI.Text;
  private title2: PIXI.Text;
  private title3: PIXI.Text;
  private subTitle1: PIXI.Text;
  private subTitle2: PIXI.Text;
  private subTitle3: PIXI.Text;

  private entries1: Dog63SuPrimi3Entry2[][] = [];
  private entries2: Dog63SuPrimi3Entry2[][] = [];
  private entries3: Dog63SuPrimi3Entry3[][] = [];

  public constructor(gameType: GameType, gameLength: GameLength) {
    super();

    this.gameType = gameType;
    this.gameLength = gameLength;

    this.showDebug(settings.debug, undefined, "SuPrimi3");

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(12),
        fill: Dog63Helper.getBlackColor(),
        align: "center",
        letterSpacing: _s(1)
      });
      this.title1 = Logic.createPixiText(style);
      this.title1.anchor.set(0.5);
      this.add(this.title1);
      this.title2 = Logic.createPixiText(style);
      this.title2.anchor.set(0.5);
      this.add(this.title2);
      this.title3 = Logic.createPixiText(style);
      this.title3.anchor.set(0.5);
      this.add(this.title3);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(19),
        fill: Dog63Helper.getWhiteColor(),
        align: "center",
        letterSpacing: _s(0)
      });
      this.subTitle1 = Logic.createPixiText(style);
      this.subTitle1.anchor.set(0.5);
      this.add(this.subTitle1);
      this.subTitle2 = Logic.createPixiText(style);
      this.subTitle2.anchor.set(0.5);
      this.add(this.subTitle2);
      this.subTitle3 = Logic.createPixiText(style);
      this.subTitle3.anchor.set(0.5);
      this.add(this.subTitle3);
    }

    for (let row = 0; row < 5; row++) {
      const part1: Dog63SuPrimi3Entry2[] = [];
      const part2: Dog63SuPrimi3Entry2[] = [];
      const part3: Dog63SuPrimi3Entry3[] = [];
      for (let i = 0; i < 3; i++) {
        const entry1 = new Dog63SuPrimi3Entry2();
        part1.push(entry1);
        this.add(entry1);
        const entry2 = new Dog63SuPrimi3Entry2();
        part2.push(entry2);
        this.add(entry2);
      }
      this.entries1.push(part1);
      this.entries2.push(part2);

      for (let i = 0; i < 4; i++) {
        const entry3 = new Dog63SuPrimi3Entry3();
        part3.push(entry3);
        this.add(entry3);
      }
      this.entries3.push(part3);
    }
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean): IAnimInterval[] {
    return [{ startTime: 55.3, duration: 19.6 }, withBonus ? { startTime: 192.4, duration: 14.8 } : { startTime: 177.4, duration: 19.4 }];
  }

  public fill(drivers: IDriver[], suprimi: IDog63Suprimi, withBonus: boolean): void {
    this.anims = this.createAnims(this.gameType, Logic.implementation.getCurrentIntroGameLength(), withBonus);
    this.title1.text = _t("twoPlacedInTwo");
    this.title2.text = _t("twoPlacedInThree");
    this.title3.text = _t("trioNotInO");
    this.subTitle1.text = _t("firstThreeNiOsh");
    this.subTitle2.text = _t("firstTwoNiOsh");
    this.subTitle3.text = _t("firstThreeAnyOrder");

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
      for (let i = 0; i < 3; i++) {
        this.entries1[row][i].fill(drivers, suprimi.block1[row][i], minValuePerBlock[0], maxValuePerBlock[0]);
        this.entries2[row][i].fill(drivers, suprimi.block2[row][i], minValuePerBlock[1], maxValuePerBlock[1]);
      }
      for (let i = 0; i < 4; i++) {
        this.entries3[row][i].fill(drivers, suprimi.block3[row][i], minValuePerBlock[2], maxValuePerBlock[2]);
      }
    }
  }

  public onLayout(): void {
    const titleY = 11;
    const subTitleY = 39;
    this.title1.x = _s(162);
    this.title1.y = _s(titleY);
    this.title2.x = _s(498);
    this.title2.y = _s(titleY);
    this.title3.x = _s(844);
    this.title3.y = _s(titleY);

    this.subTitle1.x = _s(186);
    this.subTitle1.y = _s(subTitleY);
    this.subTitle2.x = _s(554);
    this.subTitle2.y = _s(subTitleY);
    this.subTitle3.x = _s(975);
    this.subTitle3.y = _s(subTitleY);

    const row1Y = 61;
    const rowHeight = 82.5;
    const colWidth = 103;
    const col1X = 32;
    const col2X = 398;
    const col3X = 765;

    for (let row = 0; row < 5; row++) {
      for (let i = 0; i < 3; i++) {
        LayoutHelper.setScaledRectangle(this.entries1[row][i], col1X + colWidth * i, row1Y + rowHeight * row, colWidth, rowHeight);
        LayoutHelper.setScaledRectangle(this.entries2[row][i], col2X + colWidth * i, row1Y + rowHeight * row, colWidth, rowHeight);
      }
      for (let i = 0; i < 4; i++) {
        LayoutHelper.setScaledRectangle(this.entries3[row][i], col3X + colWidth * i, row1Y + rowHeight * row, colWidth, rowHeight);
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

    this.showDebugTime("SuPrimi3", baseFactor);

    DiagonalFadeHelper.FadeDiagonal(this, baseFactor, anim.duration, 3, 1, 2.5, Logic.videoScreen.width, Logic.videoScreen.height);
  }
}
