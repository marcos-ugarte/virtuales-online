import { Group } from "client/Graphics/Group";
import { Logic, _s, settings } from "client/Logic/Logic";
import { IAnimInterval } from "client/Logic/LogicDefinitions";
import * as PIXI from "pixi.js";
import { AnimHelper } from "../common/Anim";

type AnimationType = "topInBottomOut" | "bottomInTopOut" | "leftInLeftOut" | "leftInRightOut" | "topInRightOut";
export class BottomBarInfoC4 extends Group {
  private bonusText: PIXI.Text;
  private animation: IAnimInterval[];
  private anmiationType?: AnimationType;

  public constructor(animation: IAnimInterval[], animationType?: AnimationType) {
    super();
    this.animation = animation;
    this.anmiationType = animationType;

    // Add text
    const textStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Light",
      fontSize: _s(25),
      fill: 0xffffff
    });
    this.bonusText = Logic.createPixiText(textStyle);
    this.add(this.bonusText);
  }

  public onLayout(): void {
    const positionY = 645;
    const height = 49;

    const bonusTextPositionX = 750;
    this.bonusText.anchor.x = 0.5;
    this.bonusText.anchor.y = 0.5;
    this.bonusText.position.y = _s(positionY + height / 2);
    this.bonusText.position.x = _s(bonusTextPositionX);

    if (settings.debug) {
      this.bonusText.alpha = 0.5;
    }
  }

  public fill(bonusInfoText: string): void {
    this.bonusText.text = bonusInfoText ?? "";
  }

  public update(dt: number): void {
    super.update(dt);
    const currentTime = Logic.getVideoTime();

    const bonusTextAnim = Logic.getAnim(currentTime, this.animation, this.bonusText);

    if (!bonusTextAnim) return;

    const textBaseFactor = currentTime - bonusTextAnim.startTime;
    const delta = 0.15;
    AnimHelper.animateInOut(textBaseFactor + delta, 0, bonusTextAnim.duration, 1.0, 0, 1, (val) => (this.bonusText.alpha = val), 0.5, 0);

    if (this.anmiationType === "leftInLeftOut") {
      AnimHelper.animateInOut(textBaseFactor + delta, 0, bonusTextAnim.duration, 1.0, 0, 1, (val) => (this.bonusText.x = _s(750) - _s(400) * (1 - val)), 0.5, 0);
    } else if (this.anmiationType === "leftInRightOut") {
      AnimHelper.animateInOut(textBaseFactor + delta, 0, bonusTextAnim.duration, 1.0, 0, 1, (val) => (this.bonusText.x = _s(750) - _s(400) * (1 - val)), 0.5, 2);
    } else if (this.anmiationType === "topInRightOut") {
      AnimHelper.animateInOut(textBaseFactor, 1, bonusTextAnim.duration - 1.7, 0.2, 1, 0, (val) => (this.alpha = val), 0, 1);
      AnimHelper.animateIn(textBaseFactor + delta, 0, bonusTextAnim.duration, 1.0, 0, 1, (val) => (this.bonusText.y = _s(670) - _s(30) * (1 - val)));
      AnimHelper.animateInOut(textBaseFactor + delta, 0, bonusTextAnim.duration, 1.0, 0, 1, (val) => (this.bonusText.x = _s(670) - _s(30) * (1 - val)), 0.5, 2);
    } else if (this.anmiationType === "topInBottomOut") {
      AnimHelper.animateInOut(textBaseFactor, 1, bonusTextAnim.duration - 1.7, 0.2, 1, 0, (val) => (this.alpha = val), 0, 1);
      AnimHelper.animateInOut(textBaseFactor + delta, 0, bonusTextAnim.duration, 1.0, 0, 1, (val) => (this.bonusText.y = _s(670) - _s(30) * (1 - val)), 0.5, 2);
    } else if (this.anmiationType === "bottomInTopOut") {
      AnimHelper.animateInOut(textBaseFactor + delta, 0, bonusTextAnim.duration, 1.0, 0, 1, (val) => (this.bonusText.y = _s(670) + _s(30) * (1 - val)), 0.5, 2);
    } else {
      return;
    }
  }
}
