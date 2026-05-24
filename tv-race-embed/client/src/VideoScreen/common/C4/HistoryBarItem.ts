import { Group } from "client/Graphics/Group";
import { Logic, _s, settings } from "client/Logic/Logic";
import { GameType } from "common/Definitions";
import * as PIXI from "pixi.js";
import { AnimHelper } from "../Anim";
import { IRouletteRoundHistory, IRoundHistory } from "./../../../Logic/LogicDefinitions";
import { RouletteHelper } from "./../../rouletteC4/RouletteHelper";

export class HistoryBarItem extends Group {
  private historyBarItemSprite: PIXI.Sprite;
  private bonusAnnotationSprite: PIXI.Sprite;
  private bonusAnnotationSpriteTexture: PIXI.Texture | undefined;
  private historyBarItemText: PIXI.Text;
  private historyBarWinnerNumberText?: PIXI.Text;
  private numbersLeftSprite?: PIXI.Sprite;
  private numbersSpriteTexture: PIXI.Texture | undefined;
  private numbersRightSprite: PIXI.Sprite;
  private gameType: GameType;
  private winnerColor: string | undefined;

  public constructor(gameType: GameType) {
    super();
    this.gameType = gameType;
    this.historyBarItemSprite = new PIXI.Sprite();
    this.bonusAnnotationSprite = new PIXI.Sprite();
    const historyBarItemTextStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Regular",
      fontSize: _s(22),
      fill: 0x3d3d3d
    });
    this.historyBarItemText = Logic.createPixiText(historyBarItemTextStyle);

    this.add(this.historyBarItemSprite);
    this.add(this.historyBarItemText);

    this.numbersRightSprite = new PIXI.Sprite();
    this.add(this.numbersRightSprite);
    if (this.gameType !== "roulette") {
      this.numbersLeftSprite = new PIXI.Sprite();
      this.add(this.numbersLeftSprite);
      this.add(this.bonusAnnotationSprite);
    } else {
      this.historyBarWinnerNumberText = Logic.createPixiText();
      this.historyBarWinnerNumberText.style = RouletteHelper.smallNumberHistorybarTextStyle;
      this.add(this.historyBarWinnerNumberText);
    }
  }

  public onLayout(): void {
    const bgYOffset = 0;
    const bgXOffset = 1.5;
    const bgHeight = 54;
    const bgWidth = 237;
    let numberSpriteDimension = 45;
    let numberLeftYOffset = -3;
    let numberRightYOffset = -3;
    let numberLeftXOffset = 123;
    let numberRightXOffset = 168;
    const itemTextXOffset = 32;

    if (this.gameType === "roulette") {
      numberSpriteDimension = 40;
      numberLeftYOffset = 0;
      numberRightYOffset = 0;
      numberLeftXOffset = 30;
      numberRightXOffset = 190.5;
    }

    // Layout bg element
    this.historyBarItemSprite.position.y = _s(bgYOffset);
    this.historyBarItemSprite.position.x = _s(bgXOffset);
    this.historyBarItemSprite.height = _s(bgHeight);
    this.historyBarItemSprite.width = _s(bgWidth);

    // Layout bonus annotation
    this.bonusAnnotationSprite.anchor.x = 1;
    this.bonusAnnotationSprite.position.y = _s(bgYOffset + 4);
    this.bonusAnnotationSprite.position.x = _s(bgXOffset + bgWidth - 3);
    this.bonusAnnotationSprite.height = _s(30);
    this.bonusAnnotationSprite.width = _s(35);

    // Layout text
    this.historyBarItemText.anchor.y = 0.5;
    this.historyBarItemText.position.y = _s(bgYOffset + bgHeight / 2);
    this.historyBarItemText.position.x = _s(bgXOffset + itemTextXOffset);

    // Layout left number
    if (this.numbersLeftSprite) {
      this.numbersLeftSprite.anchor.y = 0.5;
      this.numbersLeftSprite.anchor.x = 0.5;
      this.numbersLeftSprite.height = _s(numberSpriteDimension);
      this.numbersLeftSprite.width = _s(numberSpriteDimension);
      this.numbersLeftSprite.position.y = _s(bgHeight / 2 + numberLeftYOffset);
      this.numbersLeftSprite.position.x = _s(bgXOffset + numberLeftXOffset);
    }

    // Layout right number
    this.numbersRightSprite.anchor.y = 0.5;
    this.numbersRightSprite.anchor.x = 0.5;
    this.numbersRightSprite.height = _s(numberSpriteDimension);
    this.numbersRightSprite.width = _s(numberSpriteDimension);
    this.numbersRightSprite.position.y = _s(bgHeight / 2 + numberRightYOffset);
    this.numbersRightSprite.position.x = _s(bgXOffset + numberRightXOffset);

    if (this.historyBarWinnerNumberText) {
      this.historyBarWinnerNumberText.anchor.set(0.5, 0.5);
      this.historyBarWinnerNumberText.position.x = this.numbersRightSprite.position.x;
      this.historyBarWinnerNumberText.position.y = _s(bgHeight / 2);
    }

    if (settings.debug === true) {
      this.historyBarItemSprite.alpha = 0.7;
      this.numbersRightSprite.alpha = 0.4;
    }
  }

  public init(historyBarItemTexture: PIXI.Texture, bonusAnnotationTexture: PIXI.Texture, numbersSpriteTexture: PIXI.Texture): void {
    // Init history bar sprite
    this.historyBarItemSprite.texture = historyBarItemTexture;
    this.numbersSpriteTexture = numbersSpriteTexture;

    // Init bonus annotation sprite
    this.bonusAnnotationSpriteTexture = bonusAnnotationTexture;
  }

  public setMask(mask: PIXI.Graphics) {
    this.historyBarItemSprite.mask = mask;
    this.numbersRightSprite.mask = mask;
    this.historyBarItemText.mask = mask;
    if (this.numbersLeftSprite) this.numbersLeftSprite.mask = mask;
    if (this.historyBarWinnerNumberText) this.historyBarWinnerNumberText.mask = mask;
    if (this.bonusAnnotationSprite) this.bonusAnnotationSprite.mask = mask;
  }

  public fill(historyItem: IRoundHistory): void {
    // Fill text
    this.historyBarItemText.text = `0${historyItem.round}`;
    const rectangleSize = 69;

    // Fill left numbers
    if (this.numbersLeftSprite && this.numbersSpriteTexture) {
      const firstNumber = historyItem.first.driverIndex;
      const clonedNumbersLeftSpriteTexture = this.numbersSpriteTexture.clone();

      clonedNumbersLeftSpriteTexture.frame = new PIXI.Rectangle(0, firstNumber * 70, rectangleSize, rectangleSize);
      this.numbersLeftSprite.texture = clonedNumbersLeftSpriteTexture;
    }

    // Fill right numbers right
    const secondNumber = historyItem.second.driverIndex;
    if (this.numbersSpriteTexture) {
      const clonedNumbersRightSpriteTexture = this.numbersSpriteTexture.clone();
      clonedNumbersRightSpriteTexture.frame = new PIXI.Rectangle(0, secondNumber * 70, rectangleSize, rectangleSize);
      this.numbersRightSprite.texture = clonedNumbersRightSpriteTexture;
    }

    // Fill bonus annotation
    if (this.bonusAnnotationSpriteTexture) {
      const clonedBonusAnnotationSpriteTexture = this.bonusAnnotationSpriteTexture.clone();
      const showBonusAnnotation = !!historyItem?.roundBonusType;
      const roundBonusType = showBonusAnnotation && historyItem.roundBonusType;

      clonedBonusAnnotationSpriteTexture.frame = showBonusAnnotation ? new PIXI.Rectangle(roundBonusType === "x3" ? 44 : 0, 0, 43, 36) : new PIXI.Rectangle(0, 0, 0, 0);
      this.bonusAnnotationSprite.texture = clonedBonusAnnotationSpriteTexture;
    }
  }
  public fillRoulette(historyItem: IRouletteRoundHistory): void {
    // Fill text
    if (!this.numbersSpriteTexture) return;

    const clonedNumbersRightSpriteTexture = this.numbersSpriteTexture;
    clonedNumbersRightSpriteTexture.frame = new PIXI.Rectangle(0, 0, 58, 58);
    this.numbersRightSprite.texture = clonedNumbersRightSpriteTexture;
    this.historyBarItemText.text = `0${String(historyItem.round)}`;

    this.winnerColor = RouletteHelper.getColorForNumber(historyItem.winnerNumber);

    if (this.winnerColor === "red") clonedNumbersRightSpriteTexture.frame.y = 0;
    else if (this.winnerColor === "black") clonedNumbersRightSpriteTexture.frame.y = 58;
    else if (this.winnerColor === "green") clonedNumbersRightSpriteTexture.frame.y = 116;

    clonedNumbersRightSpriteTexture.updateUvs();

    if (this.historyBarWinnerNumberText && historyItem.winnerNumber !== undefined) {
      this.historyBarWinnerNumberText.text = historyItem.winnerNumber.toString();
    }
  }

  public update(dt: number): void {
    super.update(dt);
  }
}
