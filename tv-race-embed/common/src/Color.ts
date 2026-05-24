import { Util } from "./Util";

export interface IColorValues {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class Color {
  public static fromFloat(r: number, g: number, b: number, a: number) {
    const argb = Math.floor(a) * 16777216 + Math.floor(r) * 65536 + Math.floor(g) * 256 + Math.floor(b);
    return argb;
  }

  public static RGBAtoARGB(rgba: number) {
    const r = (rgba / 16777216) & 0xff;
    const g = (rgba / 65536) & 0xff;
    const b = (rgba / 256) & 0xff;
    const a = (rgba / 1) & 0xff;
    const argb = a * 16777216 + r * 65536 + g * 256 + b;
    return argb;
  }

  public static ARGBtoRGBA(argb: number) {
    const a = (argb / 16777216) & 0xff;
    const r = (argb / 65536) & 0xff;
    const g = (argb / 256) & 0xff;
    const b = (argb / 1) & 0xff;
    const rgba = r * 16777216 + g * 65536 + b * 256 + a;
    return rgba;
  }

  public static ARGBtoHex(color: number): string {
    let hex = color.toString(16);
    while (hex.length < 8) {
      hex = "0" + hex;
    }
    const a = hex.slice(0, 2);
    const r = hex.slice(2, 4);
    const g = hex.slice(4, 6);
    const b = hex.slice(6, 8);
    return "#" + r + g + b;
  }

  public static calcRGBA(values: { r: number; g: number; b: number; a: number }) {
    const rgba = values.r * 16777216 + values.g * 65536 + values.b * 256 + values.a;
    return rgba;
  }

  public static calcARGB(values: { r: number; g: number; b: number; a: number }) {
    const argb = values.a * 16777216 + values.r * 65536 + values.g * 256 + values.b;
    return argb;
  }

  public static fillRGBA(rgba: number, out: { r: number; g: number; b: number; a: number }) {
    out.r = (rgba / 16777216) & 0xff;
    out.g = (rgba / 65536) & 0xff;
    out.b = (rgba / 256) & 0xff;
    out.a = (rgba / 1) & 0xff;
  }

  public static fillARGB(rgba: number, out: { r: number; g: number; b: number; a: number }) {
    out.a = (rgba / 16777216) & 0xff;
    out.r = (rgba / 65536) & 0xff;
    out.g = (rgba / 256) & 0xff;
    out.b = (rgba / 1) & 0xff;
  }

  public static mulValues(cc: IColorValues, gc: IColorValues) {
    const div = 255;
    const fc = Color.fromFloat((cc.r * gc.r) / div, (cc.g * gc.g) / div, (cc.b * gc.b) / div, (cc.a * gc.a) / div);
    return fc;
  }

  public static blendARGB(from: number, to: number, factor: number) {
    const fromValues: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 0 };
    const toValues: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 0 };
    this.fillARGB(from, fromValues);
    this.fillARGB(to, toValues);
    this.blendValues(fromValues, toValues, toValues, factor);
    return this.calcARGB(toValues);
  }

  public static blendValues(from: IColorValues, to: IColorValues, target: IColorValues, factor: number) {
    const f1 = Util.clamp(factor, 0, 1);
    const f2 = 1.0 - f1;
    target.r = Math.round(from.r * f2 + to.r * f1);
    target.g = Math.round(from.g * f2 + to.g * f1);
    target.b = Math.round(from.b * f2 + to.b * f1);
    target.a = Math.round(from.a * f2 + to.a * f1);
  }

  public static r(argb: number) {
    return (argb / 65536) & 0xff;
  }

  public static g(argb: number) {
    return (argb / 256) & 0xff;
  }

  public static b(argb: number) {
    return (argb / 1) & 0xff;
  }

  public static a(argb: number) {
    return (argb / 16777216) & 0xff;
  }

  public static updateAlpha(argb: number, a: number) {
    a = Util.clamp(Math.floor(a * 256), 0, 255);
    const na = a * 16777216;
    const c2 = argb & 0x00ffffff;
    const c3 = c2 + na;
    return c3;
  }
}
