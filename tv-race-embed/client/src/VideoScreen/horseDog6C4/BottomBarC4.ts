import { Group } from "client/Graphics/Group";
import { Logic, _s, settings } from "client/Logic/Logic";
import { IColors, IGameInfo, IHorseC4Bonus, IRoundInfo } from "client/Logic/LogicDefinitions";
import { GameLength, GameType } from "common/Definitions";
import * as PIXI from "pixi.js";
import { AnimHelper } from "../common/Anim";
import { AnimatedNumber } from "../common/AnimatedNumber";
import { BonusBarC4 } from "./BonusBarC4";
import { BottomBarInfoC4 } from "./BottomBarInfoC4";

export class BottomBarC4 extends Group {
  private gameType: GameType;
  private gameLength: GameLength;
  private withBonus: boolean;
  private hasJackpotInfo: boolean = true;
  private leftSprite: PIXI.Sprite;
  private rightSprite: PIXI.Sprite;
  private bonusInfo1: BottomBarInfoC4;
  private bonusInfo2: BottomBarInfoC4;
  private bonusInfo3: BottomBarInfoC4;
  private bonusInfo4: BottomBarInfoC4;
  private bonusInfo5: BottomBarInfoC4;
  private bonusInfoNoJp1: BottomBarInfoC4;
  private bonusInfoNoJp2: BottomBarInfoC4;
  private animatedNumber: AnimatedNumber;
  // private animatedBonus: AnimatedBonus;

  public constructor(gameInfo: IGameInfo) {
    super();

    this.gameType = gameInfo.gameType;
    this.gameLength = gameInfo.gameLength;
    this.withBonus = gameInfo.haveDbPot;

    this.leftSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.rightSprite = new PIXI.Sprite(PIXI.Texture.WHITE);

    // this.add(this.leftSprite);
    this.add(this.rightSprite);

    // Add text
    const animatedNumberStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(31),
      fill: "white",
      align: "center"
    });

    this.animatedNumber = new AnimatedNumber(animatedNumberStyle);
    // this.add(this.animatedNumber);

    // this.animatedBonus = new AnimatedBonus(this.gameType, this.gameLength);
    // this.add(this.animatedBonus);

    const animDuration = 6;
    const pause = 3;
    this.bonusInfo1 = new BottomBarInfoC4(
      [
        { startTime: 1, duration: animDuration - pause },
        { startTime: animDuration * 5, duration: animDuration - pause },
        { startTime: animDuration * 10, duration: animDuration - pause },
        { startTime: animDuration * 15, duration: animDuration - pause },
        { startTime: animDuration * 20, duration: animDuration - pause },
        { startTime: animDuration * 25, duration: animDuration - pause },
        { startTime: animDuration * 30, duration: animDuration - pause }
      ],
      "leftInRightOut"
    );
    this.bonusInfo2 = new BottomBarInfoC4(
      [
        { startTime: animDuration * 1, duration: animDuration - pause },
        { startTime: animDuration * 6, duration: animDuration - pause },
        { startTime: animDuration * 11, duration: animDuration - pause },
        { startTime: animDuration * 16, duration: animDuration - pause },
        { startTime: animDuration * 21, duration: animDuration - pause },
        { startTime: animDuration * 26, duration: animDuration - pause },
        { startTime: animDuration * 31, duration: animDuration - pause }
      ],
      "topInBottomOut"
    );
    this.bonusInfo3 = new BottomBarInfoC4(
      [
        { startTime: animDuration * 2, duration: animDuration - pause },
        { startTime: animDuration * 7, duration: animDuration - pause },
        { startTime: animDuration * 12, duration: animDuration - pause },
        { startTime: animDuration * 17, duration: animDuration - pause },
        { startTime: animDuration * 22, duration: animDuration - pause },
        { startTime: animDuration * 27, duration: animDuration - pause },
        { startTime: animDuration * 32, duration: animDuration - pause }
      ],
      "leftInLeftOut"
    );
    this.bonusInfo4 = new BottomBarInfoC4(
      [
        { startTime: animDuration * 3, duration: animDuration - pause },
        { startTime: animDuration * 8, duration: animDuration - pause },
        { startTime: animDuration * 13, duration: animDuration - pause },
        { startTime: animDuration * 18, duration: animDuration - pause },
        { startTime: animDuration * 23, duration: animDuration - pause },
        { startTime: animDuration * 28, duration: animDuration - pause },
        { startTime: animDuration * 33, duration: animDuration - pause }
      ],
      "topInRightOut"
    );
    this.bonusInfo5 = new BottomBarInfoC4(
      [
        { startTime: animDuration * 4, duration: animDuration - pause },
        { startTime: animDuration * 9, duration: animDuration - pause },
        { startTime: animDuration * 14, duration: animDuration - pause },
        { startTime: animDuration * 19, duration: animDuration - pause },
        { startTime: animDuration * 24, duration: animDuration - pause },
        { startTime: animDuration * 29, duration: animDuration - pause }
      ],
      "bottomInTopOut"
    );

    const animDurationNoJp = 15;
    const pauseNoJp = 3;
    this.bonusInfoNoJp1 = new BottomBarInfoC4(
      [
        { startTime: 1, duration: animDurationNoJp - pauseNoJp - 1 },
        { startTime: animDurationNoJp * 2, duration: animDurationNoJp - pauseNoJp },
        { startTime: animDurationNoJp * 4, duration: animDurationNoJp - pauseNoJp },
        { startTime: animDurationNoJp * 6, duration: animDurationNoJp - pauseNoJp },
        { startTime: animDurationNoJp * 8, duration: animDurationNoJp - pauseNoJp },
        { startTime: animDurationNoJp * 10, duration: animDurationNoJp - pauseNoJp },
        { startTime: animDurationNoJp * 12, duration: animDurationNoJp - pauseNoJp }
      ],
      "bottomInTopOut"
    );
    this.bonusInfoNoJp2 = new BottomBarInfoC4(
      [
        { startTime: animDurationNoJp, duration: animDurationNoJp - pauseNoJp },
        { startTime: animDurationNoJp * 3, duration: animDurationNoJp - pauseNoJp },
        { startTime: animDurationNoJp * 5, duration: animDurationNoJp - pauseNoJp },
        { startTime: animDurationNoJp * 7, duration: animDurationNoJp - pauseNoJp },
        { startTime: animDurationNoJp * 9, duration: animDurationNoJp - pauseNoJp },
        { startTime: animDurationNoJp * 11, duration: animDurationNoJp - pauseNoJp }
      ],
      "bottomInTopOut"
    );

    this.add(this.bonusInfo2);
    this.add(this.bonusInfo1);
    this.add(this.bonusInfo3);
    this.add(this.bonusInfo4);
    this.add(this.bonusInfo5);

    this.add(this.bonusInfoNoJp1);
    this.add(this.bonusInfoNoJp2);
  }

  public onLayout(): void {
    const positionY = 645;
    const positionX = 45;
    const height = 49;
    const leftSpriteWidth = 260;

    // Add sprite shapes
    this.leftSprite.position.y = _s(positionY);
    this.leftSprite.position.x = _s(positionX);
    this.leftSprite.width = _s(leftSpriteWidth);
    this.leftSprite.height = _s(height);

    this.rightSprite.position.y = _s(positionY);
    this.rightSprite.position.x = _s(positionX + leftSpriteWidth);
    this.rightSprite.width = _s(1270 - leftSpriteWidth - positionX - positionX);
    this.rightSprite.height = _s(height);

    this.animatedNumber.position.y = _s(positionY + height / 2);
    this.animatedNumber.position.x = _s(positionX + 45);
    this.animatedNumber.setFontSize(_s(31));

    // this.animatedBonus.position.y = _s(positionY + height / 2);
    // this.animatedBonus.position.x = _s(positionX + 45);

    if (settings.debug) {
      this.leftSprite.alpha = 0.5;
      this.animatedNumber.alpha = 0.5;
      this.rightSprite.alpha = 0.5;
    }
  }

  public fill(roundInfo: IRoundInfo, bonus: IHorseC4Bonus, colors: IColors): void {
    console.log(roundInfo);
    this.leftSprite.tint = colors.panelColorBottomNumber;
    this.rightSprite.tint = colors.panelColorBottom;
    this.animatedNumber.fill(roundInfo.jackpotValue, roundInfo.oldJackpotValue);
    // this.animatedBonus.fill(this.gameType, this.gameLength, roundInfo);
    this.hasJackpotInfo = bonus?.infoText1 !== "";

    if (bonus) {
      if (!this.hasJackpotInfo) {
        this.bonusInfoNoJp1.fill(bonus?.infoText4);
        this.bonusInfoNoJp2.fill(bonus?.infoText5);
      } else {
        this.bonusInfo1.fill(bonus?.infoText1);
        this.bonusInfo2.fill(bonus?.infoText2);
        this.bonusInfo3.fill(bonus?.infoText3);
        this.bonusInfo4.fill(bonus?.infoText4);
        this.bonusInfo5.fill(bonus?.infoText5);
      }
    }
  }

  public update(dt: number): void {
    super.update(dt);
    if (!this.withBonus) {
      this.visible = false;
      return;
    }
    const currentTime = Logic.getVideoTime();

    const animation = [{ startTime: 0, duration: Logic.getIntroLength() }];
    const anim = Logic.getAnim(currentTime, animation, this);

    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;
    const baseFactor = currentTime - anim.startTime;
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 2, 0, 1, (val) => (this.alpha = val), 0.5, 0);
  }
}
