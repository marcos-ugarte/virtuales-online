import { Group } from "client/Graphics/Group";
import * as PIXI from "pixi.js";
import { AnimHelper } from "./Anim";

export class DiagonalFadeHelper {
  public static FadeDiagonal(group: Group, baseFactor: number, duration: number, fadeInDuration: number, fadeSpeed: number, fadeOutDuration: number, screenWidth: number, screenHeight: number): void {
    const maxDistance = Math.sqrt((screenWidth + screenHeight) * (screenWidth + screenHeight));

    for (const child of group.container.children) {
      if (child instanceof PIXI.Text || child instanceof PIXI.Sprite) {
        if (baseFactor < fadeInDuration) {
          const worldPosition = child.getGlobalPosition();
          const factor = fadeInDuration * (Math.sqrt((worldPosition.x + worldPosition.y) * (worldPosition.x + worldPosition.y)) / maxDistance);
          AnimHelper.animateIn(baseFactor, factor, 10, fadeSpeed, 0, 1, (x) => (child.alpha = x));
        } else if (baseFactor > duration - fadeOutDuration) {
          const worldPosition = child.getGlobalPosition();
          const factor = fadeOutDuration * (1.0 - Math.sqrt((worldPosition.x + worldPosition.y) * (worldPosition.x + worldPosition.y)) / maxDistance);
          AnimHelper.animateIn(baseFactor - duration + fadeOutDuration, factor, 10, fadeSpeed, 1, 0, (x) => (child.alpha = x));
        } else {
          child.alpha = 1.0;
        }
      }
    }

    for (const child of group.children) {
      if (child instanceof Group) {
        this.FadeDiagonal(child, baseFactor, duration, fadeInDuration, fadeSpeed, fadeOutDuration, screenWidth, screenHeight);
      }
    }
  }
}
