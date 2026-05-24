import * as PIXI from "pixi.js";
import { Util } from "common/Util";
import { settings } from "client/Logic/Logic";

export class AnimatedText extends PIXI.Text {
  private fullText: string = "";

  public constructor(text: string, style: PIXI.TextStyle) {
    style.trim = true;
    style.padding = 10;

    if (settings.showDebugTextColor) {
      style.fill = "orange";
    }

    super(text, style);
    this.fullText = text;
    this.roundPixels = true;
  }

  public setText(val: string) {
    if (this.fullText !== val) {
      this.text = val;
      this.fullText = val;
    }
  }

  public animateText(factor: number) {
    factor = Util.clamp(factor, 0, 1);
    if (this.fullText.length > 0) {
      const lettersToShow = Math.round(this.fullText.length * factor);
      const lettersToShowForText = Util.clamp(this.fullText.length, 0, lettersToShow);
      if (lettersToShowForText !== this.text.length) {
        this.text = this.fullText.substr(0, lettersToShowForText);
      }
    }
  }
}
