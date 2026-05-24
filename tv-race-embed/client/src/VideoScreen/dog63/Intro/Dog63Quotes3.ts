import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IAnimInterval, IDog63SuprimiEntry } from "client/Logic/LogicDefinitions";
//import { BonusAnnotationDog } from "./BonusAnnotationDog";
import { GameType, GameLength } from "common/Definitions";
import { Dog63Quotes3Main } from "./Dog63Quotes3Main";
import { Dog63Quotes3Side } from "./Dog63Quotes3Side";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { DiagonalFadeHelper } from "client/VideoScreen/common/DiagonalFadeHelper";

export class Dog63Quotes3 extends Group {
  private quotesMain: Dog63Quotes3Main;
  private quotesSide: Dog63Quotes3Side;

  private anims: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number })[] = [];
  private gameType: GameType;
  private gameLength: GameLength;

  public constructor(gameType: GameType, gameLength: GameLength) {
    super();

    this.gameType = gameType;
    this.gameLength = gameLength;

    this.showDebug(settings.debug, undefined, "Quotes3");

    this.quotesMain = new Dog63Quotes3Main(gameType, gameLength);
    this.add(this.quotesMain);
    this.quotesSide = new Dog63Quotes3Side(gameType, gameLength);
    this.add(this.quotesSide);
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean): IAnimInterval[] {
    {
      return [{ startTime: 75.8, duration: 19.8 }, withBonus ? { startTime: 208.2, duration: 14.8 } : { startTime: 197.7, duration: 19.8 }];
    }
  }

  public fill(drivers: IDriver[], odds: number[], oddsSide: IDog63SuprimiEntry[][], withBonus: boolean, oddsGridFirstTwoInOrder: boolean): void {
    this.anims = this.createAnims(this.gameType, Logic.implementation.getCurrentIntroGameLength(), withBonus);
    this.quotesMain.fill(drivers, odds, withBonus, oddsGridFirstTwoInOrder);
    this.quotesSide.fill(drivers, oddsSide); // TODO: FILL
  }

  public onLayout(): void {
    LayoutHelper.setScaledRectangle(this.quotesMain, 104, 150, 635, 361);
    LayoutHelper.setScaledRectangle(this.quotesSide, 794, 148, 384, 361);
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
    //this.visible = baseFactor >= 0 && baseFactor <= anim.duration;

    DiagonalFadeHelper.FadeDiagonal(this, baseFactor, anim.duration, 2, 0.5, 2, Logic.videoScreen.width, Logic.videoScreen.height);
  }
}
