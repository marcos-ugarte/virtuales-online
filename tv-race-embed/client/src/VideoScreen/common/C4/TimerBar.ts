import { VideoRef } from "client/VideoScreen/VideoRef";
import { GameLength, GameType, SkinType, SkinTypeDefinition } from "./../../../../../common/src/Definitions";
import { AnimHelper } from "./../Anim";
import { _t, settings } from "./../../../Logic/Logic";
import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import { IAnimInterval, IGameInfo, IRoundInfo, VideoState } from "client/Logic/LogicDefinitions";
import * as PIXI from "pixi.js";
import loadingBarDog6Texture from "../../../../assets/c4/dog6/GaugeLeft.png";
import loadingBarHorseTexture from "../../../../assets/c4/horse/GaugeLeft.png";
import loadingBarRouletteTexture from "../../../../assets/c4/roulette/GaugeLeft.png";

export class TimerBar extends Group {
  private isSmall: boolean;
  private gameType: GameType;
  private gameLength: GameLength;
  private skinType: SkinType;
  private anims: IAnimInterval[] = [{ startTime: 0, duration: Logic.getIntroLength() - 5 }];
  private timerBarSprite: PIXI.Sprite = new PIXI.Sprite();
  private timerBarLoadingSprite: PIXI.Sprite = new PIXI.Sprite();
  private timerBarTexture: PIXI.Texture | undefined;
  private timerBarText: PIXI.Text;
  private loadingMask: PIXI.Graphics;
  private blinkTimes = { duration: 1000, frequenzy: 4 };
  private alphaChange = (1 / this.blinkTimes.duration) * (this.blinkTimes.frequenzy / 2);

  public constructor(gameInfo: IGameInfo, gameType: GameType, isSmall = false) {
    super();
    this.gameType = gameType;
    this.isSmall = isSmall;
    this.gameType = gameInfo.gameType;
    this.gameLength = gameInfo.gameLength;
    this.skinType = gameInfo.gameSkin;
    this.add(this.timerBarSprite);
    this.add(this.timerBarLoadingSprite);

    this.loadingMask = new PIXI.Graphics();
    this.timerBarLoadingSprite.mask = this.loadingMask;
    this.add(this.loadingMask);

    // TEXT
    const topBarSpriteTextStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(15.5),
      align: "right",
      fill: 0xffffff
    });
    this.timerBarText = Logic.createPixiText(topBarSpriteTextStyle);
    this.timerBarText.anchor.set(0.5, 0.5);

    this.add(this.timerBarText);
  }

  public onLayout(): void {
    const positionY = this.isSmall ? 70 : 120.5;
    const positionX = 341.5;
    const height = 78;
    const width = 523;

    // this.timerBarLoadingSprite.texture.frame = new PIXI.Rectangle(0, 104 / 2, 683 / 2, 104 / 2);
    // Add sprite shapes
    this.timerBarSprite.position.y = _s(positionY);
    this.timerBarSprite.position.x = _s(positionX);
    this.timerBarSprite.width = _s(width);
    this.timerBarSprite.height = _s(height / 2);

    this.timerBarLoadingSprite.position.y = _s(positionY);
    this.timerBarLoadingSprite.position.x = _s(positionX);
    this.timerBarLoadingSprite.width = _s(width);
    this.timerBarLoadingSprite.height = _s(height / 2);
    this.timerBarLoadingSprite.zIndex = 1;

    this.loadingMask.cacheAsBitmap = false;
    this.loadingMask.beginFill(0xffffff);
    this.loadingMask.drawRect(_s(0), _s(positionY - height / 2), _s(width), _s(height));
    this.loadingMask.endFill();
    this.loadingMask.renderable = false;
    this.loadingMask.cacheAsBitmap = true;

    this.timerBarText.position.y = _s(positionY + height * 0.23);
    this.timerBarText.position.x = _s(positionX + width * 0.95);
    this.timerBarText.anchor.set(1, 0.5);

    if (settings.debug) {
      this.timerBarLoadingSprite.alpha = 0.6;
      this.timerBarSprite.alpha = 0.6;
      this.timerBarText.alpha = 0.6;
      this.timerBarSprite.tint = 0x000;

      this.timerBarLoadingSprite.tint = 0x000;
    }
  }

  private getLoadingBarTexture(gameType: GameType, skinType: SkinType): string {
    if (gameType === "dog6" && skinType === SkinTypeDefinition.CLASSIC) {
      return loadingBarDog6Texture as string;
    } else if (gameType === "horse" && skinType === SkinTypeDefinition.CLASSIC) {
      return loadingBarHorseTexture as string;
    } else if (gameType === "roulette" && skinType === SkinTypeDefinition.CLASSIC) {
      return loadingBarRouletteTexture as string;
    } else {
      return loadingBarHorseTexture as string;
    }
  }

  public async init(): Promise<void> {
    this.timerBarTexture = await Logic.loadTexture(this.getLoadingBarTexture(this.gameType, this.skinType));
    const timerBarSpriteTexture = this.timerBarTexture.clone();
    const timerBarLoadingSpriteTexture = this.timerBarTexture.clone();
    timerBarSpriteTexture.frame = new PIXI.Rectangle(0, 0, 683, 52);
    timerBarLoadingSpriteTexture.frame = new PIXI.Rectangle(0, 52, 683, 52);

    this.timerBarSprite.texture = timerBarSpriteTexture;
    this.timerBarLoadingSprite.texture = timerBarLoadingSpriteTexture;
  }

  public fill(): void {
    this.anims = this.createAnims(this.gameType, this.skinType);
    this.timerBarText.text = "";
  }

  public createAnims(gameType: GameType, skinType: SkinType): IAnimInterval[] {
    if (gameType === "roulette" && skinType === SkinTypeDefinition.CLASSIC) {
      return [{ startTime: 0.001, duration: 201 }];
    } else if (gameType === "horse" && skinType === SkinTypeDefinition.CLASSIC) {
      return [{ startTime: 0.001, duration: Logic.getIntroLength() - 3 }];
    } else if (gameType === "dog6" && skinType === SkinTypeDefinition.CLASSIC) {
      return [{ startTime: 0.001, duration: Logic.getIntroLength() - 3 }];
    } else {
      return [{ startTime: 0, duration: Logic.getIntroLength() - 5 }];
    }
  }

  public update(dt: number): void {
    super.update(dt);
    const currentTime = Logic.getVideoTime();
    const anim = Logic.getAnim(currentTime, this.anims, this);
    const state = Logic.getState();
    const inIntro = state === VideoState.Intro;
    const isFading = Logic.isFading;

    if (!anim || !inIntro || isFading) {
      this.visible = false;
      return;
    }
    this.visible = true;

    const baseFactor = currentTime - anim.startTime;

    if (baseFactor < 2) {
      AnimHelper.animateIn(baseFactor, 0, anim.duration, 0.5, 0, 1, (val) => (this.timerBarText.alpha = val));
    }
    AnimHelper.animateIn(baseFactor, 0, anim.duration, 0.5, 0, 1, (val) => (this.timerBarSprite.alpha = val));
    AnimHelper.animateIn(baseFactor, 0, anim.duration, 0.5, 0, 1, (val) => (this.timerBarLoadingSprite.alpha = val));

    let remainingTime = Logic.getIntroLength() - 1 - currentTime;
    if (Number(remainingTime) <= 0) remainingTime = 0;
    this.timerBarText.text = Math.floor(remainingTime).toString() + " " + _t("sekClassic");
    const percentage = 100 - Logic.getPercentageInRange(Number(remainingTime.toFixed(6)), anim.startTime, this.gameLength);
    this.loadingMask.x = _s(342) - (_s(523) * percentage) / 100;

    if (Number(remainingTime) <= 5) {
      this.timerBarText.alpha += this.alphaChange * dt * 1000;
      this.timerBarText.alpha = Math.max(0, Math.min(1, this.timerBarText.alpha));
      if (this.timerBarText.alpha <= 0 || this.timerBarText.alpha >= 1) {
        this.alphaChange *= -1;
      }
    } else {
      this.timerBarText.alpha = 1;
    }
  }
}
