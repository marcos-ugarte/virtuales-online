/**
 * TRIMMED vendored Util — for the tvbox RaceBarDog port.
 *
 * The real streaming_kit common/src/Util.ts pulls in Settings, Logger (chalk),
 * Color, dateformat and json-stringify-safe. The kept closure files (Group,
 * Anim, MultiStyleText, AnimatedBonusTopDog) only use Util.clamp and
 * Util.isNumber; the WinnerDog/DrawHelper port adds rgbToHex (driver colours)
 * — so we expose just those to keep the import graph closed.
 */
export class Util {
  public static isNumber(object: any): object is number {
    return typeof object === "number" && isFinite(object);
  }

  public static clamp(value: number, min: number, max: number): number {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  private static componentToHex(c: number): string {
    const hex = (c & 0xff).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }

  /**
   * Replicates streaming_kit common/Util.rgbToHex: takes a packed 0xAARRGGBB
   * (or 0xRRGGBB) colour and returns a "#rrggbb" string. The real impl routes
   * through Color.fillARGB; here we extract the channels directly (the alpha
   * byte is ignored by the "#rrggbb" output exactly as in the original).
   */
  public static rgbToHex(argb: number): string {
    const r = (argb >> 16) & 0xff;
    const g = (argb >> 8) & 0xff;
    const b = argb & 0xff;
    return "#" + Util.componentToHex(r) + Util.componentToHex(g) + Util.componentToHex(b);
  }
}
