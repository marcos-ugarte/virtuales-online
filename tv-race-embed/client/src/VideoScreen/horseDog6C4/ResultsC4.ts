import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IAnimInterval, IGameInfo, IIntervalDriver, RoundBonusType } from "client/Logic/LogicDefinitions";
import { GameLength, GameType, SkinType, SkinTypeDefinition } from "common/Definitions";
import * as PIXI from "pixi.js";
import gridBackgroundSmall from "../../../assets/c4/GridBackgroundSmall.png";
import resultNumbersDog6 from "../../../assets/c4/dog6/ResultNumbers.png";
import resultNumbersHorse from "../../../assets/c4/horse/ResultNumbers.png";
import resultNumbersLargeDog6 from "../../../assets/c4/dog6/ResultNumbersLarge.png";
import resultNumbersLargeHorse from "../../../assets/c4/horse/ResultNumbersLarge.png";
import arrow from "../../../assets/c4/horse/arrow.png";
import { AnimHelper } from "../common/Anim";
import bonusAnnotationLargeHorse from "../../../assets/c4/horse/BonusAnnotationLarge.png";
import bonusAnnotationLargeDog from "../../../assets/c4/dog6/BonusAnnotationLarge.png";

const wrapperHeight = 212;
const wrapperWidth = 849;

export class ResultsC4 extends Group {
  private gameType: GameType;
  private skinType: SkinType;
  private gameLength: GameLength;
  private withBonus: boolean;
  public anims: IAnimInterval[] = [];

  private firstPlaceBackground: PIXI.Sprite;
  private secondPlaceBackground: PIXI.Sprite;
  private firstPlaceBigSprite: PIXI.Sprite;
  private firstPlaceSmallSprite: PIXI.Sprite;
  private firstPlaceSmallText: PIXI.Text;
  private firstPlaceSmallTextAddition: PIXI.Text;
  private secondPlaceSmallText: PIXI.Text;
  private secondPlaceSmallTextAddition: PIXI.Text;
  private secondPlaceSmallSprite: PIXI.Sprite;
  private arrowSprite: PIXI.Sprite;
  private bonusAnnotationTexture: PIXI.Texture | undefined;
  private bonusAnnotation: PIXI.Sprite;
  private bonusAnnotation2: PIXI.Sprite;

  private firstPlaceBigText: PIXI.Text;
  private secondPlaceBigText: PIXI.Text;
  private winnerText: PIXI.Text;

  public constructor(gameInfo: IGameInfo) {
    super();
    this.gameType = gameInfo.gameType;
    this.skinType = gameInfo.gameSkin;
    this.gameLength = gameInfo.gameLength;
    this.withBonus = gameInfo.haveDbPot;

    // Add placeBackgrounds
    this.firstPlaceBackground = new PIXI.Sprite();
    this.add(this.firstPlaceBackground);
    this.secondPlaceBackground = new PIXI.Sprite();
    this.add(this.secondPlaceBackground);

    // Add firstPlaceBigSprite
    this.firstPlaceBigSprite = new PIXI.Sprite();
    this.add(this.firstPlaceBigSprite);

    // Add firstPlaceSmallSprite
    this.firstPlaceSmallSprite = new PIXI.Sprite();
    this.add(this.firstPlaceSmallSprite);

    // Add secondPlaceSmallSprite
    this.secondPlaceSmallSprite = new PIXI.Sprite();
    this.add(this.secondPlaceSmallSprite);

    // Add arrowSprite
    this.arrowSprite = new PIXI.Sprite();
    this.add(this.arrowSprite);

    // Add bonus annotation
    this.bonusAnnotation = new PIXI.Sprite();
    this.add(this.bonusAnnotation);
    this.bonusAnnotation2 = new PIXI.Sprite();
    this.add(this.bonusAnnotation2);

    // Add text
    const placeTimeStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Bold",
      fontSize: _s(107),
      fill: 0x111111
    });
    const labelStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(27),
      fill: 0xffffff
    });
    const labelAdditionStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(17),
      fill: 0xffffff
    });

    this.firstPlaceBigText = Logic.createPixiText(placeTimeStyle);
    this.add(this.firstPlaceBigText);

    this.firstPlaceSmallText = Logic.createPixiText(labelStyle);
    this.add(this.firstPlaceSmallText);

    this.firstPlaceSmallTextAddition = Logic.createPixiText(labelAdditionStyle);
    this.add(this.firstPlaceSmallTextAddition);

    this.secondPlaceSmallText = Logic.createPixiText(labelStyle);
    this.add(this.secondPlaceSmallText);

    this.secondPlaceSmallTextAddition = Logic.createPixiText(labelAdditionStyle);
    this.add(this.secondPlaceSmallTextAddition);

    this.secondPlaceBigText = Logic.createPixiText(placeTimeStyle);
    this.add(this.secondPlaceBigText);

    const winnterTextStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(42),
      fill: 0xffffff
    });
    this.winnerText = Logic.createPixiText(winnterTextStyle);
    this.add(this.winnerText);
  }

  public async init(): Promise<void> {
    // Init background sprite texture
    const placeBackgroundTexture = await Logic.loadTexture(gridBackgroundSmall);
    this.firstPlaceBackground.texture = placeBackgroundTexture.clone();
    this.secondPlaceBackground.texture = placeBackgroundTexture.clone();
  }

  public onLayout(): void {
    const firstPlaceWrapperY = this.withBonus ? 188 : 240;
    const firstPlaceWrapperX = 349;
    const secondPlaceWrapperY = this.withBonus ? 441 : 490;
    const secondPlaceWrapperX = 349;

    // Layout first place background
    this.firstPlaceBackground.position.x = _s(firstPlaceWrapperX);
    this.firstPlaceBackground.position.y = _s(firstPlaceWrapperY);
    this.firstPlaceBackground.width = _s(wrapperWidth);
    this.firstPlaceBackground.height = _s(wrapperHeight);

    // Layout second place background
    this.secondPlaceBackground.position.x = _s(secondPlaceWrapperX);
    this.secondPlaceBackground.position.y = _s(secondPlaceWrapperY);
    this.secondPlaceBackground.width = _s(wrapperWidth);
    this.secondPlaceBackground.height = _s(wrapperHeight);

    // Layout firstPlaceBigSprite
    this.firstPlaceBigSprite.anchor.y = 0.5;
    this.firstPlaceBigSprite.position.y = _s(firstPlaceWrapperY + wrapperHeight / 2 - 8);
    this.firstPlaceBigSprite.position.x = _s(firstPlaceWrapperX + 26);
    this.firstPlaceBigSprite.height = _s(133);
    this.firstPlaceBigSprite.width = _s(504);

    // Layout firstPlaceBigText
    this.firstPlaceBigText.anchor.y = 0.5;
    this.firstPlaceBigText.anchor.x = 1;
    this.firstPlaceBigText.position.y = _s(firstPlaceWrapperY + wrapperHeight / 2 - 3);
    this.firstPlaceBigText.position.x = _s(firstPlaceWrapperX + wrapperWidth - 46);

    // Layout bonus annotation
    this.bonusAnnotation.anchor.y = 0.5;
    this.bonusAnnotation.width = _s(80);
    this.bonusAnnotation.height = _s(80);
    this.bonusAnnotation.position.y = _s(firstPlaceWrapperY + wrapperHeight / 2 - 3);
    this.bonusAnnotation.position.x = _s(firstPlaceWrapperX + wrapperWidth - 15);

    // Layout bonus annotation
    this.bonusAnnotation2.anchor.y = 0.5;
    this.bonusAnnotation2.width = _s(80);
    this.bonusAnnotation2.height = _s(80);
    this.bonusAnnotation2.position.y = _s(secondPlaceWrapperY + wrapperHeight / 2 - 3);
    this.bonusAnnotation2.position.x = _s(firstPlaceWrapperX + wrapperWidth - 15);

    // Layout winnerText
    this.winnerText.anchor.y = 0.5;
    this.winnerText.position.y = _s(firstPlaceWrapperY + wrapperHeight / 2 - 4);
    this.winnerText.position.x = _s(firstPlaceWrapperX + 42);

    // Layout secondPlaceBigText
    this.secondPlaceBigText.anchor.y = 0.5;
    this.secondPlaceBigText.anchor.x = 1;
    this.secondPlaceBigText.position.y = _s(secondPlaceWrapperY + wrapperHeight / 2 - 3);
    this.secondPlaceBigText.position.x = _s(firstPlaceWrapperX + wrapperWidth - 46);

    // Layout firstPlaceSmallSprite
    this.firstPlaceSmallSprite.anchor.y = 0.5;
    this.firstPlaceSmallSprite.position.y = _s(secondPlaceWrapperY + wrapperHeight / 2 - 9);
    this.firstPlaceSmallSprite.position.x = _s(firstPlaceWrapperX + 24);
    this.firstPlaceSmallSprite.height = _s(136);
    this.firstPlaceSmallSprite.width = _s(245);

    this.firstPlaceSmallText.position.y = _s(secondPlaceWrapperY + 42);
    this.firstPlaceSmallText.position.x = _s(firstPlaceWrapperX + 40);
    this.firstPlaceSmallTextAddition.position.y = _s(secondPlaceWrapperY + 42);
    this.firstPlaceSmallTextAddition.position.x = _s(firstPlaceWrapperX + 55);

    // Layout secondPlaceSmallSprite
    this.secondPlaceSmallSprite.anchor.y = 0.5;
    this.secondPlaceSmallSprite.position.y = _s(secondPlaceWrapperY + wrapperHeight / 2 - 9);
    this.secondPlaceSmallSprite.position.x = _s(firstPlaceWrapperX + 283);
    this.secondPlaceSmallSprite.height = _s(136);
    this.secondPlaceSmallSprite.width = _s(245);

    this.secondPlaceSmallText.position.y = _s(secondPlaceWrapperY + 42);
    this.secondPlaceSmallText.position.x = _s(firstPlaceWrapperX + 290 + 13);
    this.secondPlaceSmallTextAddition.position.y = _s(secondPlaceWrapperY + 42);
    this.secondPlaceSmallTextAddition.position.x = _s(firstPlaceWrapperX + 290 + 31);

    // Layout arrowSprite
    this.arrowSprite.anchor.y = 0.5;
    this.arrowSprite.position.y = _s(firstPlaceWrapperY + wrapperHeight / 2);
    this.arrowSprite.position.x = _s(firstPlaceWrapperX + 278);
    this.arrowSprite.height = _s(68);
    this.arrowSprite.width = _s(50);

    if (settings.debug === true) {
      this.firstPlaceBigSprite.alpha = 0.5;
      this.firstPlaceSmallSprite.alpha = 0.5;
      this.secondPlaceSmallSprite.alpha = 0.5;
      this.firstPlaceBackground.alpha = 0.5;
      this.secondPlaceBackground.alpha = 0.5;
      this.firstPlaceBigSprite.alpha = 0.5;
      this.firstPlaceBigSprite.alpha = 0.5;
      this.firstPlaceSmallSprite.alpha = 0.5;
      this.firstPlaceSmallText.alpha = 0.5;
      this.firstPlaceSmallTextAddition.alpha = 0.5;
      this.secondPlaceSmallText.alpha = 0.5;
      this.secondPlaceSmallTextAddition.alpha = 0.5;
      this.secondPlaceSmallSprite.alpha = 0.5;
      this.arrowSprite.alpha = 0.5;
      this.bonusAnnotation.alpha = 0.5;

      this.firstPlaceBigText.alpha = 0.5;
      this.secondPlaceBigText.alpha = 0.5;
      this.winnerText.alpha = 0.5;
    }
  }

  public async fill(first: IIntervalDriver, second: IIntervalDriver, bonusRoundType: RoundBonusType): Promise<void> {
    const firstPlaceIndex = first.driverIndex;
    const secondPlaceIndex = second.driverIndex;

    // Fill firstPlaceBigSpriteTexture
    const placeSpriteTexture = await Logic.loadTexture(this.gameType === "dog6" ? resultNumbersLargeDog6 : resultNumbersLargeHorse);
    placeSpriteTexture.frame = new PIXI.Rectangle(0, firstPlaceIndex * 101, 350, 100);
    this.firstPlaceBigSprite.texture = placeSpriteTexture.clone();

    // Fill firstPlaceSmallSprite
    const placeSmallSpriteTexture = await Logic.loadTexture(this.gameType === "dog6" ? resultNumbersDog6 : resultNumbersHorse);
    placeSmallSpriteTexture.frame = new PIXI.Rectangle(0, firstPlaceIndex * 101, 180, 100);
    this.firstPlaceSmallSprite.texture = placeSmallSpriteTexture.clone();

    // Fill secondPlaceSmallSprite
    placeSmallSpriteTexture.frame = new PIXI.Rectangle(0, secondPlaceIndex * 101, 180, 100);
    this.secondPlaceSmallSprite.texture = placeSmallSpriteTexture.clone();

    // Fill arrowSprite
    const arrowSpriteTexture = await Logic.loadTexture(arrow);
    this.arrowSprite.texture = arrowSpriteTexture;

    // Fill text
    this.firstPlaceBigText.text = Logic.implementation.formatOddsC4(first.odds ?? 0);
    this.secondPlaceBigText.text = Logic.implementation.formatOddsC4(second.odds ?? 0);
    this.winnerText.text = _t("winnerTxt");
    this.firstPlaceSmallText.text = "1";
    this.firstPlaceSmallTextAddition.text = _t("1stPlaceSuffix");
    this.secondPlaceSmallText.text = "2";
    this.secondPlaceSmallTextAddition.text = _t("2ndPlaceSuffix");

    // Fill bonus annotation
    if (bonusRoundType) {
      if (this.gameType === "horse" && this.skinType === SkinTypeDefinition.CLASSIC) {
        this.bonusAnnotationTexture = await Logic.loadTexture(bonusAnnotationLargeHorse);
      } else {
        this.bonusAnnotationTexture = await Logic.loadTexture(bonusAnnotationLargeDog);
      }
      this.bonusAnnotationTexture.frame = new PIXI.Rectangle(0, bonusRoundType === "x2" ? 0 : 100, 116, 100);
      this.bonusAnnotation.texture = this.bonusAnnotationTexture.clone();
      this.bonusAnnotation.visible = true;
      this.bonusAnnotation2.texture = this.bonusAnnotationTexture.clone();
      this.bonusAnnotation2.visible = true;
    } else if (this.bonusAnnotation && this.bonusAnnotation2) {
      this.bonusAnnotation.visible = false;
      this.bonusAnnotation2.visible = false;
    }
  }

  public update(dt: number): void {
    super.update(dt);
    const animation = this.anims;
    const currentTime = Logic.getVideoTime();
    const anim = Logic.getAnim(currentTime, animation, this);

    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;
    const baseFactor = currentTime - anim.startTime;
    // AnimHelper.animateInOut(baseFactor, 0, anim.duration, 2, 0, 1, (val) => (this.alpha = val), 0.5, 0);

    // Animate first place background
    AnimHelper.animateInOut(
      baseFactor,
      0.1,
      anim.duration,
      0.7,
      0,
      1,
      (val) => {
        this.firstPlaceBackground.height = _s(wrapperHeight) * val;
        this.firstPlaceBackground.width = _s(wrapperWidth) * val;
      },
      0.7,
      0
    );

    // Animate second place background
    AnimHelper.animateInOut(
      baseFactor,
      0.1,
      anim.duration - 0.2,
      0.7,
      0,
      1,
      (val) => {
        this.secondPlaceBackground.height = _s(wrapperHeight) * val;
        this.secondPlaceBackground.width = _s(wrapperWidth) * val;
      },
      0.7,
      0
    );

    // Animate first place big sprite
    AnimHelper.animateInOut(
      baseFactor,
      0.5,
      anim.duration - 0.2,
      0.7,
      0,
      1,
      (val) => {
        this.firstPlaceBigSprite.alpha = val;
      },
      1,
      0
    );
    AnimHelper.animateInOut(
      baseFactor,
      0.5,
      anim.duration - 0.4,
      1.3,
      0,
      1,
      (val) => {
        this.firstPlaceBigText.alpha = val;
        this.winnerText.alpha = val;
        this.arrowSprite.alpha = val;
        this.bonusAnnotation.alpha = val;
        this.bonusAnnotation2.alpha = val;
      },
      1,
      0
    );

    // Animate first/second place small
    AnimHelper.animateInOut(
      baseFactor,
      0.7,
      anim.duration - 0.6,
      0.7,
      0,
      1,
      (val) => {
        this.firstPlaceSmallSprite.alpha = val;
        this.secondPlaceSmallSprite.alpha = val;
        this.firstPlaceSmallText.alpha = val;
        this.firstPlaceSmallTextAddition.alpha = val;
        this.secondPlaceSmallText.alpha = val;
        this.secondPlaceSmallTextAddition.alpha = val;
      },
      1,
      0
    );
    AnimHelper.animateInOut(
      baseFactor,
      0.8,
      anim.duration - 0.6,
      1.3,
      0,
      1,
      (val) => {
        this.secondPlaceBigText.alpha = val;
      },
      1,
      0
    );
  }
}
