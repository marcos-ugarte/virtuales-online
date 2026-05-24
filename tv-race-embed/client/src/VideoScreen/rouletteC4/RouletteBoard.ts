import { RouletteboardOddArea } from "./RoulettteboardOddArea";
import { AnimHelper } from "./../common/Anim";
import { IAnimInterval } from "./../../Logic/LogicDefinitions";
import { settings } from "../../Logic/Logic";
import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import { IGameInfo, IRoundInfo } from "client/Logic/LogicDefinitions";
import * as PIXI from "pixi.js";
import rouletteGridTexture from "../../../assets/c4/roulette/combined/Board.png";
import { RouletteBoardTimings } from "settings/C4Settings";

export class RouletteBoard extends Group {
  private rouletteBoard: PIXI.Sprite = new PIXI.Sprite();
  private rouletteBoardOddArea: RouletteboardOddArea;
  private gameInfo: IGameInfo;
  private anims: IAnimInterval[] = [{ startTime: 0.0, duration: 0.0 }];

  /**
   * basic container for the rouletteboard
   * contains background, rouletteboard
   * RouletteBoardOddArea: all odds and areas
   * @param {IGameInfo} gameInfo standart gameinfo, will be passed always
   */
  public constructor(gameInfo: IGameInfo) {
    super();
    this.gameInfo = gameInfo;

    this.rouletteBoardOddArea = new RouletteboardOddArea(gameInfo);

    this.showDebug(settings.debug, undefined, "RouletteBoard");
    this.rouletteBoard.anchor.set(0.5, 0.5);

    this.add(this.rouletteBoard);
    this.add(this.rouletteBoardOddArea);
  }

  public onLayout(): void {
    this.rouletteBoardOddArea.onLayout();

    const positionY = _s(420);
    const positionX = _s(764);
    const height = _s(400);
    const width = _s(900);

    // Adjust positions
    this.rouletteBoard.position.y = positionY;
    this.rouletteBoard.position.x = positionX;

    if (settings.debug) {
      this.rouletteBoard.tint = 0x000;
      this.rouletteBoard.alpha = 0.6;
    }
  }

  public async init(): Promise<void> {
    await this.rouletteBoardOddArea.init();
    const rouletteBoardTexture = await Logic.loadTexture(rouletteGridTexture);
    this.rouletteBoard.texture = rouletteBoardTexture;
  }

  public fill(roundInfo: IRoundInfo): void {
    this.anims = this.createAnims();
    this.rouletteBoardOddArea.fill(roundInfo);
  }

  public createAnims(): IAnimInterval[] {
    const result = RouletteBoardTimings.getAnim(this.gameInfo.gameLength, Logic.getIntroLength());
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
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.9, 0, _s(0.58593), (val) => (this.rouletteBoard.scale.x = val), 0, 0);
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.9, 0, _s(0.58737), (val) => (this.rouletteBoard.scale.y = val), 0, 0);
  }
}
