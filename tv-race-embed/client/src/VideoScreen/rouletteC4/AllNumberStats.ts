import * as PIXI from "pixi.js";
import { RouletteHelper } from "./RouletteHelper";
import { AnimHelper } from "./../common/Anim";
import { IAnimInterval } from "./../../Logic/LogicDefinitions";
import { Group } from "client/Graphics/Group";
import { Logic, settings, _s } from "client/Logic/Logic";
import { IGameInfo, IRoundInfo } from "client/Logic/LogicDefinitions";
import { StatOddNumber } from "./StatOddNumber";
import { RouletteNumberStatsTimings } from "settings/C4Settings";

export class AllNumberStats extends Group {
  private oddElements: StatOddNumber[] = [];
  private gameInfo: IGameInfo;
  private anims: IAnimInterval[] = [{ startTime: 0.0, duration: 0.0 }];
  private preRenderedNumbers = new PIXI.Sprite();
  public constructor(gameInfo: IGameInfo) {
    super();
    this.gameInfo = gameInfo;
    this.add(this.preRenderedNumbers);
    for (const number of RouletteHelper.allNumbers) {
      const nu = new StatOddNumber(gameInfo, number, true, true, false, false);
      this.oddElements.push(nu);
      this.add(nu);
    }
  }

  public onLayout(): void {
    this.oddElements.forEach((oddElement) => oddElement.onLayout());
    this.createGridLayout(this.oddElements);

    this.preRenderedNumbers.x = _s(-16);
    this.preRenderedNumbers.y = _s(-16);

    if (settings.debug) {
      this.oddElements.forEach((oddElement) => (oddElement.alpha = 0.6));
    }
  }

  public fill(roundInfo: IRoundInfo, rouletteStats: number[]): void {
    this.anims = this.createAnims();

    let highestOddForNumber = -Infinity;

    // First loop to find the highest oddForNumber
    this.oddElements.forEach((oddElement) => {
      const oddForNumber = RouletteHelper.statForNumber(oddElement.number, rouletteStats);
      if (oddForNumber > highestOddForNumber) {
        highestOddForNumber = oddForNumber;
      }
    });

    console.log("highestOddForNumber", highestOddForNumber);

    this.oddElements.forEach((oddElement) => {
      const oddForNumber = RouletteHelper.statForNumber(oddElement.number, rouletteStats);
      oddElement.fill(oddForNumber, undefined, highestOddForNumber);
    });
  }

  public init(numberTexture: PIXI.Texture, allStatsCombined: PIXI.Texture): void {
    this.preRenderedNumbers.texture = allStatsCombined;

    const originalWidth = this.preRenderedNumbers.texture.width;
    const originalHeight = this.preRenderedNumbers.texture.height;
    const aspectRatio = originalWidth / originalHeight;

    this.preRenderedNumbers.width = _s(722);
    this.preRenderedNumbers.height = this.preRenderedNumbers.width / aspectRatio;
    this.oddElements.forEach((oddElement) => oddElement.init(numberTexture.clone()));
  }

  public createAnims(): IAnimInterval[] {
    const result = [RouletteNumberStatsTimings[this.gameInfo.gameLength as 60 | 120 | 240][0]] as IAnimInterval[];
    return result;
  }

  public update(dt: number): void {
    super.update(dt);
    const currentTime = Logic.getVideoTime();
    const anim = Logic.getAnim(currentTime, this.anims, this);

    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;
    const baseFactor = currentTime - anim.startTime;
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 2, 0, 1, (val) => (this.alpha = val), 0.5, 0);
  }

  private createGridLayout(numbers: StatOddNumber[]) {
    let row = 0;
    let column = 0;
    for (const number of numbers) {
      number.position.x = _s(230) * column;
      number.position.y = _s(48.2) * row;
      row += 1;
      if (number.number === 9 || number.number === 18 || number.number === 27) {
        column += 1;
        row = 1;
      }
    }
  }
}
