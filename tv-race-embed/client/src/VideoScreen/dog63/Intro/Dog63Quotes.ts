import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IAnimInterval, IDog63RoundHistory, IDog63Quotes } from "client/Logic/LogicDefinitions";
//import { BonusAnnotationDog } from "./BonusAnnotationDog";
import { GameType, GameLength } from "common/Definitions";
import { Dog63QuotesTop } from "./Dog63QuotesTop";
import { Dog63QuotesMiddle } from "./Dog63QuotesMiddle";
import { Dog63QuotesBottom } from "./Dog63QuotesBottom";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { DiagonalFadeHelper } from "client/VideoScreen/common/DiagonalFadeHelper";

export class Dog63Quotes extends Group {
  private top: Dog63QuotesTop;
  private middle: Dog63QuotesMiddle;
  private bottom: Dog63QuotesBottom;

  private anims: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number })[] = [];
  private gameType: GameType;
  private gameLength: GameLength;

  public constructor(gameType: GameType, gameLength: GameLength) {
    super();

    this.gameType = gameType;
    this.gameLength = gameLength;

    this.showDebug(settings.debug);

    this.top = new Dog63QuotesTop();
    this.add(this.top);
    this.middle = new Dog63QuotesMiddle();
    this.add(this.middle);
    this.bottom = new Dog63QuotesBottom();
    this.add(this.bottom);
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean): IAnimInterval[] {
    return [{ startTime: 35.4, duration: 18.7 }, withBonus ? { startTime: 177.8, duration: 13.7 } : { startTime: 157.2, duration: 18.7 }];
  }

  public fill(drivers: IDriver[], quotes: IDog63Quotes, withBonus: boolean): void {
    this.anims = this.createAnims(this.gameType, Logic.implementation.getCurrentIntroGameLength(), withBonus);

    this.top.fill(drivers, quotes.entries);
    this.middle.fill(quotes.middleEntries);
    this.bottom.fill(quotes.bottomEntries);
  }

  public onLayout(): void {
    LayoutHelper.setScaledRectangle(this.top, 144, 80, 992, 336);
    LayoutHelper.setScaledRectangle(this.middle, 144, 428, 992, 143);
    LayoutHelper.setScaledRectangle(this.bottom, 144, 584, 580, 100);
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
    this.visible = baseFactor >= 0 && baseFactor <= anim.duration;

    DiagonalFadeHelper.FadeDiagonal(this, baseFactor, anim.duration, 2, 0.5, 2, Logic.videoScreen.width, Logic.videoScreen.height);
  }
}
