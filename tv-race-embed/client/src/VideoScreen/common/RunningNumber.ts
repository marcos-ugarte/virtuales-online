import * as PIXI from "pixi.js";
import { _s, Logic } from "client/Logic/Logic";
import { TextStyle } from "pixi.js";

export class RunningNumber extends PIXI.Container {
  private numbers: PIXI.Text[] = [];
  private clippingMask: PIXI.Graphics;
  private style: PIXI.TextStyle;
  private fontSizeNumber: number = 12;

  public constructor(style?: TextStyle) {
    super();
    if (style === undefined) {
      style = new PIXI.TextStyle({
        fontFamily: "DIN-Medium",
        fill: "white",
        align: "left"
      });
    }

    this.style = style;
    for (let index = 0; index < 2; index++) {
      this.numbers[index] = Logic.createPixiText(style);
      this.numbers[index].anchor.set(0, 0.5);
      // this.text1.filters = [this.blurFilter];
      this.addChild(this.numbers[index]);
    }
    this.clippingMask = new PIXI.Graphics();
    this.addChild(this.clippingMask);
    this.mask = this.clippingMask;

    this.setFontSize(_s(13));
  }

  public setValue(value: number, scroll: number) {
    const f = 3 + this.fontSizeNumber * 0.9;
    this.numbers[0].text = "" + (value % 10);
    this.numbers[1].text = "" + ((value + 1) % 10);
    this.numbers[0].y = f * -scroll;
    this.numbers[1].y = f * (1 - scroll);
  }

  public setFontSize(size: number) {
    this.fontSizeNumber = size;
    this.style.fontSize = size;

    this.clippingMask.cacheAsBitmap = false;
    this.clippingMask.beginFill(0xffffff);
    this.clippingMask.drawRect(0, -size * 0.6, size * 0.8, size * 1.2);
    this.clippingMask.endFill();
    this.clippingMask.renderable = true;
    this.clippingMask.cacheAsBitmap = true;
  }

  public setLetterSpacing(spacing: number) {
    this.style.letterSpacing = spacing;
  }
}
