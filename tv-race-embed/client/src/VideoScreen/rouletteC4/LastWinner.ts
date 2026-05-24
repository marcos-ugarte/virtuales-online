import { RouletteHelper } from "./RouletteHelper";
import { AnimHelper } from "./../common/Anim";
import { IAnimInterval } from "./../../Logic/LogicDefinitions";
import { settings } from "../../Logic/Logic";
import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import { IGameInfo, IRoundInfo } from "client/Logic/LogicDefinitions";
import * as PIXI from "pixi.js";
import lastWinnerBackground from "../../../assets/c4/roulette/NumbersBigBackground.png";
import rouletteBallBig from "../../../assets/c4/roulette/NumbersBig.png";

export class LastWinner extends Group {
  private numberBackground: PIXI.Sprite = new PIXI.Sprite();
  private number: PIXI.Sprite = new PIXI.Sprite();
  private numberTexture: PIXI.Texture | undefined;
  private winnerNumber: PIXI.Text = Logic.createPixiText();
  private gameInfo: IGameInfo;
  private anims: IAnimInterval[] = [{ startTime: 0.0, duration: 0.0 }];
  private winnerColor: string | undefined;

  /**
   * display the last winning number
   * @param gameInfo standart gameinfo
   */
  public constructor(gameInfo: IGameInfo) {
    super();
    this.gameInfo = gameInfo;

    this.numberBackground.anchor.set(0.5, 0.5);
    this.number.anchor.set(0.5, 0.5);
    this.winnerNumber.anchor.set(0.5, 0.5);

    this.winnerNumber.style = RouletteHelper.lastWinnerTextStyle;

    this.add(this.numberBackground);
    this.add(this.number);
    this.add(this.winnerNumber);
  }

  public async init(): Promise<void> {
    const numberBackgroundTexture = await Logic.loadTexture(lastWinnerBackground);
    this.numberTexture = await Logic.loadTexture(rouletteBallBig);

    this.numberTexture.frame = new PIXI.Rectangle(0, 0, 256, 256);
    this.numberBackground.texture = numberBackgroundTexture;
    this.number.texture = this.numberTexture;
  }

  public onLayout(): void {
    const positionY = _s(455);
    const positionX = _s(795);
    const height = _s(150);
    const width = _s(150);

    this.numberBackground.position.y = positionY;
    this.numberBackground.position.x = positionX;
    this.numberBackground.width = width * 2.4;
    this.numberBackground.height = height * 2.4;

    this.number.position.y = positionY;
    this.number.position.x = positionX;
    this.number.width = width;
    this.number.height = height;

    this.winnerNumber.y = positionY;
    this.winnerNumber.x = positionX;

    if (settings.debug) {
      this.numberBackground.tint = 0x000;
      this.numberBackground.alpha = 0.6;

      this.winnerNumber.alpha = 0.6;

      this.number.tint = 0x000;
      this.number.alpha = 0.6;
    }
  }

  /**
   * apply last winning number as text and
   * set color of the respective number
   * @param lastWinner the winning number from last round
   */
  public fill(lastWinner: number): void {
    this.anims = this.createAnims();

    this.winnerColor = RouletteHelper.getColorForNumber(lastWinner);
    this.winnerNumber.text = lastWinner.toString();

    if (this.numberTexture && this.winnerColor === "red") this.numberTexture.frame.y = 0;
    else if (this.numberTexture && this.winnerColor === "black") this.numberTexture.frame.y = 256;
    else if (this.numberTexture && this.winnerColor === "green") this.numberTexture.frame.y = 512;
    if (this.numberTexture) this.numberTexture.updateUvs();
  }

  public createAnims(): IAnimInterval[] {
    if (this.gameInfo.gameLength === 60) {
      return [{ startTime: 0, duration: 7 }];
    } else {
      return [{ startTime: 0, duration: 14.5 }];
    }
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
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.9, 0, _s(1.171875), (val) => (this.number.scale.x = val), 0.5, 0);
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.9, 0, _s(1.146615), (val) => (this.number.scale.y = val), 0.5, 0);
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.5, 0, _s(1.146615), (val) => (this.number.alpha = val), 0.2, 0);
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.9, 0, _s(1.263155), (val) => (this.numberBackground.scale.x = val), 0.5, 0);
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.9, 0, _s(1.272085), (val) => (this.numberBackground.scale.y = val), 0.5, 0);
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.5, 0, _s(1.272085), (val) => (this.numberBackground.alpha = val), 0.2, 0);
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.9, 0, 1, (val) => (this.winnerNumber.scale.x = val), 0.5, 0);
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.9, 0, 1, (val) => (this.winnerNumber.scale.y = val), 0.5, 0);
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.5, 0, 1, (val) => (this.winnerNumber.alpha = val), 0.2, 0);
  }
}
