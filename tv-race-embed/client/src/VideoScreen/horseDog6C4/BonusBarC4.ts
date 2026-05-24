import { Group } from "client/Graphics/Group";
import { Logic, _s, settings } from "client/Logic/Logic";
import { IAnimInterval, IColors, IRoundInfo } from "client/Logic/LogicDefinitions";
import { LanguagesBase } from "client/LogicImplementation/base/LocalisationBase";
import { Util } from "common/Util";
import * as PIXI from "pixi.js";
import { AnimHelper } from "../common/Anim";
import { AnimatedNumberC4 } from "./AnimatedNumberC4";

export class BonusBarC4 extends Group {
  public anims: IAnimInterval[] = [];
  private startTime: number;
  private duration: number;
  private animated? = false;
  private withAnimation?: boolean = false;
  private withBonus?: boolean = false;
  private bgSprite: PIXI.Sprite;
  private animatedNumber: AnimatedNumberC4;
  private notAnimatedNumber: PIXI.Text;

  public constructor(startTime: number, duration: number, animated?: boolean, withAnimation?: boolean, withBonus?: boolean) {
    super();
    this.startTime = startTime;
    this.duration = duration;
    this.animated = animated;
    this.withAnimation = withAnimation;
    this.withBonus = withBonus;
    this.anims = [{ startTime, duration }];
    this.bgSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.add(this.bgSprite);

    const style = new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(31),
      fill: "white",
      align: "center"
    });
    this.animatedNumber = new AnimatedNumberC4(style, this.startTime);
    this.notAnimatedNumber = Logic.createPixiText(style);
    this.add(this.animated ? this.animatedNumber : this.notAnimatedNumber);
  }

  public fill(round: IRoundInfo, colors: IColors): void {
    this.bgSprite.tint = colors.panelColorBottomNumber;
    this.notAnimatedNumber.text =
      Util.formatValue(round.jackpotValue ?? 0, 2, LanguagesBase.commaSymbol)
        .split(".")
        .map((el, index) => (index === 0 ? el.padStart(3, "0") : el))
        .join(".") ?? "0";

    this.animatedNumber.fill(round.jackpotValue, round.oldJackpotValue);
  }

  public onLayout(): void {
    const positionY = 645;
    const positionX = 45;
    const height = 49;
    const width = 260;

    // Add sprite shapes
    this.bgSprite.position.y = _s(positionY);
    this.bgSprite.position.x = _s(positionX);
    this.bgSprite.width = _s(width);
    this.bgSprite.height = _s(height);

    this.animatedNumber.position.y = _s(positionY + height / 2);
    this.animatedNumber.position.x = _s(positionX + 25);
    this.animatedNumber.setFontSize(_s(31));

    this.notAnimatedNumber.anchor.x = 0.5;
    this.notAnimatedNumber.anchor.y = 0.5;
    this.notAnimatedNumber.position.y = _s(positionY + height / 2);
    this.notAnimatedNumber.position.x = _s(positionX + width / 2);

    if (settings.debug) {
      this.bgSprite.alpha = 0.5;
      this.animatedNumber.alpha = 0.5;
    }
  }

  public update(dt: number): void {
    super.update(dt);
    const currentTime = Logic.getVideoTime();
    const anim = Logic.getAnim(currentTime, this.anims, this);

    if (!anim || !this.withBonus) {
      this.visible = false;
      return;
    }
    this.visible = true;
    const baseFactor = currentTime - anim.startTime;
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0, 0, 1, (val) => (this.alpha = val), 0.00001, 0);

    if (this.withAnimation) {
      AnimHelper.animateIn(baseFactor, 0, anim.duration, 0.5, 0, 1, (val) => {
        this.animatedNumber.alpha = val;
        this.notAnimatedNumber.alpha = val;
        this.bgSprite.alpha = val;
      });
    }
  }

  public getFactor(current: number, startTime: number, endTime: number) {
    const factor = (current - startTime) / (endTime - startTime);
    return Util.clamp(factor, 0, 1);
  }
}
