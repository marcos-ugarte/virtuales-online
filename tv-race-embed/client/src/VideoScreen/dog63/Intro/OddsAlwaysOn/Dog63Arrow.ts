import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, settings } from "client/Logic/Logic";
import { Sprite } from "pixi.js";
export class Dog63Arrow extends Group {
  private line: PIXI.Sprite;
  private arrow: PIXI.Sprite;

  private arrWidth;
  private arrHeight;
  private lineHeight;
  private gesWidth;

  public constructor(width = 56, lineHeight = 8, arrowWidth = 56, arrowHeight = 20) {
    super();

    this.arrWidth = arrowWidth;
    this.arrHeight = arrowHeight;

    this.gesWidth = width;
    this.lineHeight = lineHeight;
    this.showDebug(settings.debug, undefined, "bar");

    this.line = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.line.anchor.set(0, 0.5);
    this.add(this.line);

    const arrowTexture = DrawHelper.getCachedFilledTriangleTexture(this.arrWidth, this.arrHeight, "white");
    this.arrow = new Sprite(arrowTexture);
    this.arrow.anchor.set(0, 0.5);
    this.arrow.position.set(width, 0);
    this.add(this.arrow);
  }

  public fill(): void {
    this.onLayout();
  }

  public onLayout(): void {
    this.line.height = this.lineHeight;
    this.line.width = this.gesWidth;
  }

  public updateAnim(): void {}
}
