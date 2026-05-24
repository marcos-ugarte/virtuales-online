import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, settings } from "client/Logic/Logic";
export class Dog63Bar extends Group {
  private left: PIXI.Sprite;
  private right: PIXI.Sprite;
  private line: PIXI.Sprite;
  private bar: PIXI.Sprite;

  private val: number = 0;
  private lineHeight;
  private lineWidth;
  private smallLineWidth;
  private barHeight;

  public constructor(lineHeight = 20, lineWidth = 56, smallLineWidth = 2, barHeight = 12) {
    super();

    this.lineHeight = lineHeight;
    this.lineWidth = lineWidth;
    this.smallLineWidth = smallLineWidth;
    this.barHeight = barHeight;
    this.showDebug(settings.debug, undefined, "bar");

    this.left = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.left.anchor.set(0, 0.5);
    this.add(this.left);

    this.right = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.right.anchor.set(1, 0.5);
    this.add(this.right);

    this.line = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.line.anchor.set(0, 0.5);
    this.add(this.line);

    this.bar = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.bar.anchor.set(0, 0.5);
    this.add(this.bar);
  }

  public fill(value: number): void {
    this.val = value;
    this.onLayout();
  }

  public onLayout(): void {
    this.left.width = _s(this.smallLineWidth);
    this.left.height = _s(this.lineHeight);

    this.right.x = _s(this.lineWidth);
    this.right.width = _s(this.smallLineWidth);
    this.right.height = _s(this.lineHeight);

    this.line.height = _s(this.smallLineWidth);
    this.line.width = _s(this.lineWidth);

    this.bar.height = _s(this.barHeight);
    this.bar.width = _s(this.val * this.lineWidth);
  }

  public updateAnim(): void {}
}
