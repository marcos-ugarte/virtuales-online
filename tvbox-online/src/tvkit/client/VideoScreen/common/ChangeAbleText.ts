import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import * as PIXI from "pixi.js";
export class ChangeAbleText extends Group {
  public pixiText: PIXI.Text;
  public textContainer: PIXI.Container;
  constructor(text: string, style?: PIXI.TextStyle) {
    super();

    if (!style) {
      style = new PIXI.TextStyle({
        trim: true,
        padding: 10
      });
    } else {
      style.trim = true;
      style.padding = 400;
    }

    this.pixiText = Logic.createPixiText(style, text);

    this.pixiText.anchor.set(0.5, 0.5);
    this.textContainer = new PIXI.Container();

    this.container.name = "ChangeAbleText - " + text;
    this.textContainer.addChild(this.pixiText);
    this.add(this.textContainer);
  }

  public setAnchor(x: number, y: number) {
    this.pixiText.anchor.set(x, y);
  }

  public setText(text: string) {
    const oldWidth = JSON.parse(JSON.stringify(this.pixiText.width));
    this.pixiText.text = text;
    const TextMetrics = PIXI.TextMetrics.measureText(this.pixiText.text, this.pixiText.style);
    const newWidth = this.pixiText.width;

    if (oldWidth !== newWidth) {
      this.textContainer.position.x = newWidth / 2 - TextMetrics.width / 2;
    }
  }

  public setStyle(style: PIXI.TextStyle) {
    if (!style.trim) style.trim = true;
    if (!style.padding) style.padding = 10;

    this.pixiText.style = style;
  }

  update() {}
}
