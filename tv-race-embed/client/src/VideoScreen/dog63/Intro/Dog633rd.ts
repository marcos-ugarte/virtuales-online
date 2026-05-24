import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IAnimInterval, IDog633rd } from "client/Logic/LogicDefinitions";
//import { BonusAnnotationDog } from "./BonusAnnotationDog";
import { GameType, GameLength } from "common/Definitions";
import { Dog633rdColumn } from "./Dog633rdColumn";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { Dog63Helper } from "../Dog63Helper";
import { DiagonalFadeHelper } from "client/VideoScreen/common/DiagonalFadeHelper";

export class Dog633rd extends Group {
  // private titleText: PIXI.Text;
  // private rows: RowItem[] = [];
  private anims: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number })[] = [];
  private gameType: GameType;
  private gameLength: GameLength;

  private headerVert: PIXI.Text;
  private columns: Dog633rdColumn[] = [];

  public constructor(gameType: GameType, gameLength: GameLength) {
    super();

    this.gameType = gameType;
    this.gameLength = gameLength;

    this.showDebug(settings.debug, 1, "dog633rd");

    {
      const driverNameStyle = new PIXI.TextStyle({
        fontFamily: "DIN-UltraLight",
        fontSize: _s(20),
        fill: Dog63Helper.getWhiteColor(),
        align: "center",
        letterSpacing: _s(1)
      });
      this.headerVert = Logic.createPixiText(driverNameStyle);
      this.headerVert.anchor.set(0, 0);
      this.headerVert.rotation = (-Math.PI * 90) / 180.0;
      this.add(this.headerVert);
    }

    for (let i = 0; i < 6; i++) {
      const column = new Dog633rdColumn();
      this.columns.push(column);
      this.add(column);
    }
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean): IAnimInterval[] {
    return [{ startTime: 95.8, duration: 20.4 }, withBonus ? { startTime: 223.2, duration: 16.4 } : { startTime: 217.7, duration: 21.1 }];
  }

  public fill(drivers: IDriver[], quotes3rd: IDog633rd, withBonus: boolean): void {
    this.anims = this.createAnims(this.gameType, Logic.implementation.getCurrentIntroGameLength(), withBonus);

    this.headerVert.text = _t("trioInOrder");

    const allQuotes: number[] = [];
    for (const column of quotes3rd.quotesPerColumn) {
      allQuotes.push(...column);
    }
    const sortedQuotes = allQuotes.sort((n1, n2) => n1 - n2);
    const highestQuotes = sortedQuotes.slice(-12);
    const lowestQuotes = sortedQuotes.slice(0, 12);

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < this.columns.length; i++) {
      this.columns[i].fill(drivers, i, quotes3rd.quotesPerColumn[i], withBonus, lowestQuotes, highestQuotes);
    }
  }

  public onLayout(): void {
    this.headerVert.x = _s(37);
    this.headerVert.y = _s(698);

    const xOffset = 57;
    const yOffset = 70;
    const width = 198.5;
    const height = 644;
    for (let i = 0; i < this.columns.length; i++) {
      LayoutHelper.setScaledRectangle(this.columns[i], xOffset + width * i, yOffset, width, height);
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
    this.visible = baseFactor >= 0 && baseFactor <= anim.duration;

    DiagonalFadeHelper.FadeDiagonal(this, baseFactor - 0.6, anim.duration - 0.3, 1.2, 0.3, 1.4, Logic.videoScreen.width, Logic.videoScreen.height);
  }
}
