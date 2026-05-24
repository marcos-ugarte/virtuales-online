import * as PIXI from "pixi.js";

export class UIHelper {
  public static getSkewedRadius(height: number) {
    return height * 0.15;
  }

  public static getSkewedPixel(height: number) {
    return height * 0.17;
  }

  public static getSkewedBorder(skewedRadius: number, skewedPixel: number) {
    return skewedRadius + skewedPixel + 1;
  }

  public static getOverlappingOpacity(alpha: number[]) {
    return 1 - alpha.reduce((acc, value) => acc * (1 - value), 1);
  }

  public static calculateDoubleOpacity(targetOpacity: number): number {
    return 1 - Math.sqrt(1 - targetOpacity);
  }

  public static getSkewMatrix(height: number) {
    const skewFactor = this.getSkewedPixel(height) / height;
    return new PIXI.Matrix(1, 0, -skewFactor, 1, 0, 0);
  }

  public static setPixiSkew(sprite: PIXI.DisplayObject, height: number) {
    sprite.skew.set(-this.getSkewedPixel(1), 0);
  }

  public static createNineSlicePlane() {
    return new PIXI.NineSlicePlane(PIXI.Texture.WHITE, 0, 0, 0, 0);
  }

  public static fillNineSlicePlane(item: PIXI.NineSlicePlane, height: number) {
    const skewedRadius = UIHelper.getSkewedRadius(height);
    item.leftWidth = UIHelper.getSkewedBorder(skewedRadius, 0);
    item.rightWidth = item.leftWidth;
    item.height = height;
    UIHelper.setPixiSkew(item, height);
  }
}
