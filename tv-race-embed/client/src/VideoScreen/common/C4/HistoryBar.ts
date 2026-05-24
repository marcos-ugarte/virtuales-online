import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IAnimInterval, IGameInfo, IRoundHistory, VideoState } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "client/VideoScreen/common/Anim";
import * as PIXI from "pixi.js";
import bonusAnnotationRed from "../../../../assets/c4/dog6/BonusAnnotation.png";
import numbersLeftDog6 from "../../../../assets/c4/dog6/NumbersLeft.png";
import arrowDownRed from "../../../../assets/c4/dog6/RedArrowDown.png";
import historyBarBackground from "../../../../assets/c4/historyBarBackground.png";
import historyBarItemBackground from "../../../../assets/c4/historyElement.png";
import arrowDownBlue from "../../../../assets/c4/horse/BlueArrowDown.png";
import bonusAnnotationBlue from "../../../../assets/c4/horse/BonusAnnotation.png";
import numbersLeftHorse from "../../../../assets/c4/horse/NumbersLeft.png";
import rouletteBallTexture from "../../../../assets/c4/roulette/NumbersLeft.png";
import rouletteArrowTexture from "../../../../assets/c4/roulette/VideoArrow.png";
import { GameLength, GameType, SkinType, SkinTypeDefinition } from "./../../../../../common/src/Definitions";
import { IRouletteRoundHistory } from "./../../../Logic/LogicDefinitions";
import { HistoryBarItem } from "./HistoryBarItem";
import { HistoryBarTimings } from "settings/C4Settings";
import { Logger } from "client/Logic/Logger";
import { SockServLogMessage } from "client/ServerWebSocket/base/ServerSocketLogicBase";
import { Errors } from "client/LogicImplementation/ErrorHandler";
import { ServerSocketLogic } from "client/ServerWebSocket/ServerSocketLogic";

export class HistoryBar extends Group {
  public static maxHistoryLength = 8;

  private gameType: GameType;
  private skinType: SkinType;
  private withBonus: boolean;
  private withAnimation?: boolean = false;
  private historyBarSprite: PIXI.Sprite = new PIXI.Sprite();
  private historyBarTexture: PIXI.Texture | undefined;
  private titleText: PIXI.Text;
  private arrowDownSprite: PIXI.Sprite = new PIXI.Sprite();
  private arrowDownSpriteTexture: PIXI.Texture | undefined;
  private historyBarMask = new PIXI.Graphics();
  private historyBarItems: HistoryBarItem[] = [];
  public anims: IAnimInterval[] = [];

  public constructor(gameInfo: IGameInfo, withAnimation?: boolean) {
    super();
    this.withBonus = gameInfo.haveDbPot;
    this.withAnimation = withAnimation;
    this.gameType = gameInfo.gameType;
    this.skinType = gameInfo.gameSkin;
    this.anims = this.createAnims(gameInfo.gameLength, gameInfo.gameType, gameInfo.gameSkin);
    this.width = 245.25;
    this.height = 540;

    // Init historybar components
    const titleTextStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Bold",
      fontSize: _s(22),
      fill: 0x111111
    });
    this.titleText = Logic.createPixiText(titleTextStyle);

    // Add historybar components
    this.add(this.historyBarSprite);
    this.add(this.arrowDownSprite);
    this.add(this.historyBarMask);
    this.add(this.titleText);

    // Add history bar items
    for (let index = 0; index < HistoryBar.maxHistoryLength; index++) {
      const historyBarItem = new HistoryBarItem(this.gameType);
      this.add(historyBarItem);
      this.historyBarItems.push(historyBarItem);
    }

    if (settings.debug) {
      this.historyBarSprite.alpha = 0.5;
    }
  }

  public createAnims(gameLength: GameLength, gameType: GameType, skinType: SkinType): IAnimInterval[] {
    const anim = HistoryBarTimings.getAnim(gameLength, Logic.getIntroLength(), gameType);
    return anim;
  }

  public onLayout(): void {
    let positionY = this.withBonus ? 105 : 157;

    if (this.gameType === "roulette") {
      positionY = 156.5;
      this.height = 536;
    }

    this.position.x = _s(45);
    this.position.y = _s(positionY);

    // Add sprite shapes
    this.historyBarSprite.width = _s(this.width);
    this.historyBarSprite.height = _s(this.height);
    // this.historyBarSprite.visible = false

    // Layout title
    this.titleText.anchor.x = 0.5;
    this.titleText.position.y = _s(11);
    this.titleText.position.x = _s(this.width / 2);

    // mask for animation history bar background & historyBarItems
    this.historyBarMask.cacheAsBitmap = false;
    this.historyBarMask.beginFill(0xffffff);
    this.historyBarMask.drawRect(_s(0), _s(0), _s(this.width), _s(this.height));
    this.historyBarMask.endFill();
    this.historyBarMask.pivot.set(0.5, 0.5);
    this.historyBarMask.cacheAsBitmap = true;

    // Set masks
    this.historyBarSprite.mask = this.historyBarMask;
    this.arrowDownSprite.mask = this.historyBarMask;
    this.titleText.mask = this.historyBarMask;
    this.historyBarItems.forEach((item) => {
      item.setMask(this.historyBarMask);
    });

    // Layout arrow down sprite
    this.arrowDownSprite.anchor.x = 0.5;
    this.arrowDownSprite.position.y = _s(33);
    this.arrowDownSprite.position.x = _s(this.width / 2 - (this.gameType === "dog6" ? 3 : 0));
    this.arrowDownSprite.width = _s(90);
    this.arrowDownSprite.height = _s(40);

    if (this.gameType === "roulette") {
      this.arrowDownSprite.height = _s(30);
      this.arrowDownSprite.position.y = _s(36);
    }
  }

  public async init(): Promise<void> {
    let numbersSpriteTexture: PIXI.Texture;
    let bonusAnnotationTexture: PIXI.Texture;

    // Init history bar texture
    this.historyBarTexture = await Logic.loadTexture(historyBarBackground);
    const historyBarItemTexture = await Logic.loadTexture(historyBarItemBackground);

    // Init bonus annotation texture
    if (this.gameType === "horse" && this.skinType === SkinTypeDefinition.CLASSIC) {
      bonusAnnotationTexture = await Logic.loadTexture(bonusAnnotationBlue);
    } else {
      bonusAnnotationTexture = await Logic.loadTexture(bonusAnnotationRed);
    }

    // set numbersprite texture here and pass copy to elemements
    // if loaded in element, texture has to be loaded 8 times, not performant
    if (this.gameType === "roulette" && this.skinType === SkinTypeDefinition.CLASSIC) {
      numbersSpriteTexture = await Logic.loadTexture(rouletteBallTexture);
    } else if (this.gameType === "horse" && this.skinType === SkinTypeDefinition.CLASSIC) {
      numbersSpriteTexture = await Logic.loadTexture(numbersLeftHorse);
    } else {
      numbersSpriteTexture = await Logic.loadTexture(numbersLeftDog6);
    }

    let frameWidth;
    let frameHeight;

    if (this.gameType === "roulette" && this.skinType === SkinTypeDefinition.CLASSIC) {
      this.arrowDownSpriteTexture = await Logic.loadTexture(rouletteArrowTexture);
      frameWidth = 146;
      frameHeight = 50;
    } else if (this.gameType === "horse" && this.skinType === SkinTypeDefinition.CLASSIC) {
      this.arrowDownSpriteTexture = await Logic.loadTexture(arrowDownBlue);
      frameWidth = 120;
      frameHeight = 50;
    } else {
      this.arrowDownSpriteTexture = await Logic.loadTexture(arrowDownRed);
      frameWidth = 120;
      frameHeight = 50;
    }

    const arrowDownSpriteTexture = this.arrowDownSpriteTexture.clone();
    arrowDownSpriteTexture.frame = new PIXI.Rectangle(0, 0, frameWidth, frameHeight);

    // Init history bar arrow dow texture
    this.historyBarSprite.texture = this.historyBarTexture;
    this.arrowDownSprite.texture = arrowDownSpriteTexture;

    let startY = _s(70);
    let historyBarItemOffset = _s(57.2);

    if (this.gameType === "roulette") {
      startY = _s(65.5);
      historyBarItemOffset = _s(57.5);
    }

    let index = 0;
    // Init history bar items
    for (const historyBarItem of this.historyBarItems) {
      historyBarItem.init(historyBarItemTexture.clone(), bonusAnnotationTexture.clone(), numbersSpriteTexture.clone());
      historyBarItem.position.y = startY + index * historyBarItemOffset;
      index++;
    }
  }

  public fill(history: IRoundHistory[] | IRouletteRoundHistory[], titleText?: string): void {
    // Fill title text
    this.titleText.text = _t(titleText ?? "ISTORIJA");

    if (history.length <= 0) {
      const errMsg = "No History Data, game Type:" + this.gameType;
      Logger.error(errMsg);
      const logMessage = new SockServLogMessage(Errors.INVALID_DATA.code, errMsg);
      ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
        Logger.error("Send log Error:" + JSON.stringify(errorData));
      });
      return;
    }

    // not enough rounds in history (happens after race break) or now more than before
    if (history.length < this.historyBarItems.length || (this.historyBarItems.length < 8 && history.length > this.historyBarItems.length)) {
      //clear history list
      this.historyBarItems = [];
      // Add number of history bar items that are possible
      for (let index = 0; index < history.length; index++) {
        // not more than max
        if (index >= HistoryBar.maxHistoryLength) {
          break;
        }
        const historyBarItem = new HistoryBarItem(this.gameType);
        this.add(historyBarItem);
        this.historyBarItems.push(historyBarItem);
      }

      // Init history bar items
      this.init().then(() => {
        // Fill history bar items
        this.fillHistoryBarItems(history);
      });
    } else {
      // Fill history bar items
      this.fillHistoryBarItems(history);
    }
  }

  private fillHistoryBarItems(history: IRoundHistory[] | IRouletteRoundHistory[]) {
    // Fill history bar items
    this.historyBarItems.forEach((historyBarItem, index) => {
      const item = history[index];                                                                                                                                                                       
      if (item == null) {                                                                                                                                                                                
        historyBarItem.visible = false;                                                                                                                                                                  
        return;                                                                                                                                                                                          
      }
      if (this.gameType === "roulette") {
        historyBarItem.fillRoulette(item as IRouletteRoundHistory);
      } else {
        historyBarItem.fill(item as IRoundHistory);
      }
    });
  }

  public update(dt: number): void {
    super.update(dt);
    const currentTime = Logic.getVideoTime();
    const anim = Logic.getAnim(currentTime, this.anims, this);

    if (!anim || (Logic.isFading && Logic.fadeTarget === VideoState.Race)) {
      this.visible = false;
      return;
    }
    this.visible = true;
    const baseFactor = currentTime - anim.startTime;
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0, 0, 1, (val) => (this.alpha = val), 0.00001, 0);

    if (this.withAnimation) {
      const delta = 0.07;

      // Animate history bar sprite
      AnimHelper.animateInOut(
        baseFactor,
        0.07,
        anim.duration,
        0.5,
        0,
        1,
        (val) => {
          this.historyBarSprite.height = _s(this.height) * val;
          this.historyBarSprite.width = _s(this.width);
        },
        0,
        0
      );

      // Animate title text and arrow down sprite
      AnimHelper.animateInOut(
        baseFactor,
        0.2,
        anim.duration,
        0.5,
        0,
        1,
        (val) => {
          this.titleText.alpha = val;
          this.arrowDownSprite.alpha = val;
        },
        0,
        0
      );

      this.historyBarItems.forEach((item, index) => {
        AnimHelper.animateIn(baseFactor, delta * index, 0, 0.3, 0, 1, (val) => (item.x = _s(0) - _s(400) * (1 - val)));
      });
    }
  }
}
