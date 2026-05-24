import { IAnimInterval, IResult } from "./../../../Logic/LogicDefinitions";
import { GameType, SkinType, SkinTypeDefinition } from "common/Definitions";
import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import { IGameInfo } from "client/Logic/LogicDefinitions";
import * as PIXI from "pixi.js";
import topBackground from "../../../../assets/c4/topBackground.png";
import topBackgroundS from "../../../../assets/c4/topBackground_s.png";
import { settings } from "./../../../Logic/Logic";
import { AnimHelper } from "./../Anim";
import bonusAnnotationLargeHorse from "../../../../assets/c4/horse/BonusAnnotationLarge_round.png";
import bonusAnnotationLargeDog from "../../../../assets/c4/dog6/BonusAnnotationLarge_round.png";

export class TopInfoBar extends Group {
  private gameInfo: IGameInfo;
  private withBonus: boolean;
  private skinType: SkinType;
  private topBarSprite = new PIXI.Sprite();
  private topBarSpriteTexture: PIXI.Texture | undefined;
  private topBarMask: PIXI.Graphics = new PIXI.Graphics();
  private gameLogo = new PIXI.Sprite();
  private gameLogoBackground = new PIXI.Sprite();
  private gameLogoText = new PIXI.Sprite();
  private bonusAnnotation = new PIXI.Sprite();
  private bonusAnnotationTexture: PIXI.Texture | undefined;

  public constructor(gameInfo: IGameInfo, withBonus = false) {
    super();

    this.add(this.topBarSprite);

    this.gameInfo = gameInfo;
    this.withBonus = withBonus;
    this.skinType = gameInfo.gameSkin;

    let logoBackground;
    let logo;
    let logoText;

    if (gameInfo.companyLogo) {
      logoBackground = gameInfo.companyLogo.imageBackground;
      logo = gameInfo.companyLogo.image;
      logoText = gameInfo.companyLogo.imageText!;
    }

    if (logo) this.gameLogo.texture = logo;
    if (logoBackground) this.gameLogoBackground.texture = logoBackground;
    if (logoText) this.gameLogoText.texture = logoText;

    this.topBarSprite.mask = this.topBarMask;
    this.add(this.topBarMask);
    this.add(this.gameLogoBackground);
    this.add(this.gameLogo);
    this.add(this.gameLogoText);
    this.add(this.bonusAnnotation);
  }

  public onLayout(): void {
    const positionY = 26;
    const positionX = 280.25;
    const height = this.withBonus ? 85 : 136;
    const width = 955;

    this.topBarMask.cacheAsBitmap = false;
    this.topBarMask.beginFill(0xffffff);
    this.topBarMask.drawRect(_s(positionX), _s(positionY), _s(width), _s(height) * 1.0);
    this.topBarMask.endFill();
    this.topBarMask.alpha = 1;
    this.topBarMask.renderable = false;
    this.topBarMask.cacheAsBitmap = true;

    // Add sprite shapes
    this.topBarSprite.position.y = _s(positionY);
    this.topBarSprite.position.x = _s(positionX);
    this.topBarSprite.width = _s(width);
    this.topBarSprite.height = _s(height);

    // gameLogo
    this.gameLogo.width = this.withBonus ? _s(50) : _s(101.9);
    this.gameLogo.height = this.gameLogo.width / (this.gameLogo.texture.width / this.gameLogo.texture.height);
    this.gameLogo.position.x = this.withBonus ? _s(1115) : _s(1088.5);
    this.gameLogo.position.y = this.withBonus ? _s(45) : _s(48.9);

    // gameLogo background
    this.gameLogoBackground.width = this.withBonus ? _s(58) : _s(119.9);
    this.gameLogoBackground.height = this.gameLogoBackground.width / (this.gameLogoBackground.texture.width / this.gameLogoBackground.texture.height);
    this.gameLogoBackground.position.x = this.withBonus ? _s(1111) : _s(1079.5);
    this.gameLogoBackground.position.y = this.withBonus ? _s(40) : _s(37);

    // gameLogo Text
    this.gameLogoText.width = this.withBonus ? _s(140) : this.gameInfo.gameType === "horse" || this.gameInfo.gameType === "dog6" ? _s(181) : _s(190);
    this.gameLogoText.height = this.gameLogoText.width / (this.gameLogoText.texture.width / this.gameLogoText.texture.height);
    this.gameLogoText.position.x = this.withBonus ? _s(957) : this.gameInfo.gameType === "horse" || this.gameInfo.gameType === "dog6" ? _s(875) : _s(866);
    this.gameLogoText.position.y = this.withBonus ? _s(75) : _s(120);

    // bonus annotation
    this.bonusAnnotation.width = _s(80);
    this.bonusAnnotation.height = this.bonusAnnotation.width / (this.bonusAnnotation.texture.width / this.bonusAnnotation.texture.height);
    this.bonusAnnotation.position.x = this.withBonus ? _s(1097) : _s(1097);
    this.bonusAnnotation.position.y = this.withBonus ? _s(120) : _s(198);

    if (settings.debug) {
      // this.topBarSprite.tint = 0x000;
      this.topBarSprite.alpha = 0.8;
    }
  }

  public async init(): Promise<void> {
    this.topBarSpriteTexture = await Logic.loadTexture(this.withBonus ? topBackgroundS : topBackground);
    this.topBarSprite.texture = this.topBarSpriteTexture;
  }

  public async fillRace(result: IResult): Promise<void> {
    if (!result.roundBonusType) {
      this.bonusAnnotation.alpha = 0;
      return;
    }

    this.bonusAnnotation.alpha = 1;
    if (this.gameInfo.gameType === "horse" && this.skinType === SkinTypeDefinition.CLASSIC) {
      this.bonusAnnotationTexture = await Logic.loadTexture(bonusAnnotationLargeHorse);
    } else {
      this.bonusAnnotationTexture = await Logic.loadTexture(bonusAnnotationLargeDog);
    }
    this.bonusAnnotationTexture.frame = new PIXI.Rectangle(0, result.roundBonusType === "x2" ? 0 : 100, 108, 100);
    this.bonusAnnotation.texture = this.bonusAnnotationTexture.clone();
  }

  public getAnims(gameType: GameType): IAnimInterval[] {
    switch (gameType) {
      case "roulette":
        return [
          { startTime: 0, duration: Logic.getIntroLength() },
          { startTime: Logic.getIntroLength(), duration: Logic.getRaceLength() }
        ];
      case "horse":
        return [
          { startTime: 0, duration: 200 },
          { startTime: Logic.getIntroLength(), duration: Logic.getRaceLength() }
        ];
      case "dog6":
        return [
          { startTime: 0, duration: 200 },
          { startTime: Logic.getIntroLength(), duration: Logic.getRaceLength() }
        ];
      default:
        return [{ startTime: 0, duration: Logic.getIntroLength() - 5 }];
    }
  }

  public update(dt: number): void {
    super.update(dt);
    const currentTime = Logic.getVideoTime();
    const anims = this.getAnims(this.gameInfo.gameType);
    const anim = Logic.getAnim(currentTime, anims, this);

    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;
    const baseFactor = currentTime - anim.startTime;
    AnimHelper.animateIn(baseFactor, 0, anim.duration, 0.5, _s(-953), 0, (val) => (this.topBarMask.x = val));
    AnimHelper.animateIn(baseFactor, 0, anim.duration, 2, 0, 1, (val) => (this.alpha = val));
    if (currentTime > Logic.getIntroLength()) {
      this.topBarSprite.visible = false;
      this.gameLogoBackground.visible = false;
      this.gameLogoText.visible = false;
      this.bonusAnnotation.visible = true;
      this.gameLogo.visible = true;
    } else {
      this.topBarSprite.visible = true;
      this.gameLogoBackground.visible = true;
      this.gameLogoText.visible = true;
      this.bonusAnnotation.visible = false;
      this.gameLogo.visible = true;
    }
  }
}
