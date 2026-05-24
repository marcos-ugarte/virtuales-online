import { IColors, RouletteHelper } from "./RouletteHelper";
import { AnimHelper } from "./../common/Anim";
import { IAnimInterval } from "./../../Logic/LogicDefinitions";
import { settings } from "../../Logic/Logic";
import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import { IGameInfo, IRoundInfo } from "client/Logic/LogicDefinitions";
import * as PIXI from "pixi.js";
import { DisplayObject } from "pixi.js";

export class StatOddNumber extends Group {
  public number: number;
  private numberSprite: PIXI.Sprite = new PIXI.Sprite();
  private numberTexture: PIXI.Texture | undefined;
  private winnerNumber: PIXI.Text = Logic.createPixiText();
  private oddNumber: PIXI.Text = Logic.createPixiText();
  private oddBar: PIXI.Graphics = new PIXI.Graphics();
  private isBig: boolean;
  private showNumber: boolean;
  private gameInfo: IGameInfo;
  private anims: IAnimInterval[] = [{ startTime: 0.0, duration: 0.0 }];
  private winnerColor: string | undefined;

  /**
   *
   * @param gameInfo standart gameInfo
   * @param number current odd nuber
   * @param showStatBar show the stat bar
   * @param showNumber show the number
   * @param big has a size of 45 pxls, if false has a size of 32 pxls
   */
  public constructor(gameInfo: IGameInfo, number: number, showStatBar: boolean = true, showNumber: boolean = true, big: boolean = false, showBallSprite = true) {
    super();
    this.gameInfo = gameInfo;
    this.isBig = big;
    this.showNumber = showNumber;

    this.numberSprite.anchor.set(0.5, 0.5);

    this.number = number;
    this.winnerColor = RouletteHelper.getColorForNumber(this.number);

    this.oddBar.lineStyle(_s(13), 0xaaaaaa);

    // Add text
    this.winnerNumber.anchor.set(0.5, 0.5);
    this.oddNumber.anchor.set(0, 0.5);

    this.winnerNumber.style = this.isBig ? RouletteHelper.bigNumberTextStyle : RouletteHelper.smallNumberTextStyle;
    this.oddNumber.style = RouletteHelper.smallOddTextStyle;

    if (showStatBar) {
      this.add(this.oddNumber);
      this.add(this.oddBar);
    }
    if (showBallSprite) this.add(this.numberSprite);
    if (this.showNumber) this.add(this.winnerNumber);
  }

  public onLayout(): void {
    const height = this.isBig ? 45 : 32;
    const width = this.isBig ? 45 : 32;
    // Add sprite shapes
    this.numberSprite.width = _s(width);
    this.numberSprite.height = _s(height);

    if (settings.debug) {
      this.numberSprite.tint = 0x000;
      this.numberSprite.alpha = 0.6;
    }
  }
  public resetOddBar(): void {
    this.oddBar.clear();
    this.oddBar.lineStyle(_s(13), 0xaaaaaa);
  }
  public fill(oddNumber?: number, updatedNumber?: number, highestOdd?: number): void {
    if (updatedNumber !== undefined) {
      this.number = updatedNumber;
      this.winnerColor = RouletteHelper.getColorForNumber(this.number);
    }

    this.updateColor();
    if (this.numberTexture) this.numberTexture.updateUvs();

    if (this.oddBar !== undefined && oddNumber !== undefined) {
      const maxOddsBig = this.gameInfo.gameLength === 120 ? (highestOdd && highestOdd > 400 ? highestOdd : 400) : highestOdd && highestOdd > 200 ? highestOdd : 200;
      const maxOddsSmall = highestOdd || 30;

      const maxOdd = this.isBig ? maxOddsBig : maxOddsSmall;
      const maxWidth = _s(120);
      const width = (maxWidth / maxOdd) * oddNumber;
      this.resetOddBar();

      this.oddBar.moveTo(0, 0);
      this.oddBar.lineTo(width, 0);

      this.oddBar.position.x = _s(26);
      this.oddNumber.position.x = this.isBig ? _s(38) + width : _s(35) + width;
      this.oddNumber.text = oddNumber.toString();
      this.oddBar.updateTransform();
    }
    this.winnerNumber.text = this.number.toString();
  }

  private updateColor(): void {
    if (this.winnerColor === "red" && this.numberTexture) this.numberTexture.frame.y = 0;
    else if (this.winnerColor === "black" && this.numberTexture) this.numberTexture.frame.y = 58;
    else if (this.winnerColor === "green" && this.numberTexture) this.numberTexture.frame.y = 116;
  }

  public init(texture: PIXI.Texture): void {
    this.numberTexture = texture;
    this.numberTexture.frame = new PIXI.Rectangle(0, 0, 58, 58);
    this.numberSprite.texture = this.numberTexture;
  }

  public update(dt: number): void {
    super.update(dt);
  }
}
