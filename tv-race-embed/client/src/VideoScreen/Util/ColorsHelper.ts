export class ColorsHelper {
  public static toColor(num: number): string {
    num >>>= 0;
    const b = num & 0xff;
    const g = (num & 0xff00) >>> 8;
    const r = (num & 0xff0000) >>> 16;
    const a = ((num & 0xff000000) >>> 24) / 255;
    return "rgba(" + [r, g, b, a].join(",") + ")";
  }
}
