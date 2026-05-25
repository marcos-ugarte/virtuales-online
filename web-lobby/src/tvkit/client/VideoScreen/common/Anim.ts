import { Util } from "common/Util";
import { IAnimInterval } from "client/Logic/LogicDefinitions";
import { Color } from "pixi.js";

export enum AnimState {
  Stopped,
  Started
}

export class Anim {
  public time: number = 0;
  public state: AnimState;

  public constructor(state?: AnimState) {
    if (!state) state = AnimState.Stopped;
    this.state = state;
  }

  public update(dt: number) {
    if (this.state === AnimState.Started) this.time += dt;
  }

  public start() {
    this.state = AnimState.Started;
  }

  public stop() {
    this.state = AnimState.Stopped;
  }

  public restart() {
    this.time = 0;
    this.start();
  }
}

export class AnimHelper {
  public static animateIn(time: number, start: number, end: number, fadeIn: number, fadeInFrom: number, fadeInTo: number, fadeInCallback: (x: number) => any): void {
    if (time < start) {
      fadeInCallback(fadeInFrom);
      return;
    } else if (time - start > fadeIn && time < end) {
      fadeInCallback(fadeInTo);
      return;
    } else if (time - start < fadeIn) {
      const val = fadeInFrom + (fadeInTo - fadeInFrom) * this.easeOut((time - start) / fadeIn, 5);
      fadeInCallback(val);
      return;
    }
    fadeInCallback(fadeInTo);
    return;
  }

  public static animateInOut(
    time: number,
    start: number,
    end: number,
    fadeIn: number,
    fadeInFrom: number,
    fadeInTo: number,
    fadeInCallback: (x: number) => any,
    fadeOut: number,
    fadeOutTo: number
  ): void {
    this.animateInOutDifferentParameters(time, start, end, fadeIn, fadeInFrom, fadeInTo, fadeInCallback, fadeOut, fadeInTo, fadeOutTo, fadeInCallback);
  }
  public static animateInOutDifferentParameters(
    time: number,
    start: number,
    end: number,
    fadeIn: number,
    fadeInFrom: number,
    fadeInTo: number,
    fadeInCallback: (x: number) => any,
    fadeOut: number,
    fadeOutFrom: number,
    fadeOutTo: number,
    fadeOutCallback: (x: number) => any
  ): void {
    if (time < end - fadeOut) {
      if (fadeInCallback !== fadeOutCallback) fadeOutCallback(fadeInFrom);
      return this.animateIn(time, start, end, fadeIn, fadeInFrom, fadeInTo, fadeInCallback);
    } else if (time > end) {
      fadeOutCallback(fadeOutTo);
      return;
    } else {
      const val = fadeOutFrom + (fadeOutTo - fadeInTo) * this.easeIn((time - (end - fadeOut)) / fadeOut, 5);
      fadeOutCallback(val);
    }
  }

  public static animateGradientIn(
    time: number,
    start: number,
    end: number,
    fadeIn: number,
    fadeInFrom: { color: Color; color2: Color; steps: [number, number] },
    fadeInTo: { color: Color; color2: Color; steps: [number, number] },
    fadeInCallback: (x: { color: Color; color2: Color; steps: [number, number] }) => any
  ): { color: Color; color2: Color } {
    // split color to rgba

    const r1source = fadeInFrom.color.red;
    const g1source = fadeInFrom.color.green;
    const b1source = fadeInFrom.color.blue;
    const a1source = fadeInFrom.color.alpha;

    const r2source = fadeInFrom.color2.red;
    const g2source = fadeInFrom.color2.green;
    const b2source = fadeInFrom.color2.blue;
    const a2source = fadeInFrom.color2.alpha;

    const r1target = fadeInTo.color.red;
    const g1target = fadeInTo.color.green;
    const b1target = fadeInTo.color.blue;
    const a1target = fadeInTo.color.alpha;

    const r2target = fadeInTo.color2.red;
    const g2target = fadeInTo.color2.green;
    const b2target = fadeInTo.color2.blue;
    const a2target = fadeInTo.color2.alpha;

    let r1 = 0;
    let b1 = 0;
    let g1 = 0;
    let a1 = 0;

    let r2 = 0;
    let b2 = 0;
    let g2 = 0;
    let a2 = 0;

    let step1 = 0;
    let step2 = 0;

    AnimHelper.animateIn(time, start, end, fadeIn, a1source, a1target, (x) => (a1 = x));
    AnimHelper.animateIn(time, start, end, fadeIn, r1source, r1target, (x) => (r1 = x));
    AnimHelper.animateIn(time, start, end, fadeIn, g1source, g1target, (x) => (g1 = x));
    AnimHelper.animateIn(time, start, end, fadeIn, b1source, b1target, (x) => (b1 = x));

    AnimHelper.animateIn(time, start, end, fadeIn, a2source, a2target, (x) => (a2 = x));
    AnimHelper.animateIn(time, start, end, fadeIn, r2source, r2target, (x) => (r2 = x));
    AnimHelper.animateIn(time, start, end, fadeIn, g2source, g2target, (x) => (g2 = x));
    AnimHelper.animateIn(time, start, end, fadeIn, b2source, b2target, (x) => (b2 = x));

    AnimHelper.animateIn(time, start, end, fadeIn, fadeInFrom.steps[0], fadeInTo.steps[0], (x) => (step1 = x));
    AnimHelper.animateIn(time, start, end, fadeIn, fadeInFrom.steps[1], fadeInTo.steps[1], (x) => (step2 = x));

    const result = new Color([r1, g1, b1, a1]); // TODO: CLAMP VALUES
    const result2 = new Color([r2, g2, b2, a2]); // TODO: CLAMP VALUES
    fadeInCallback({
      color: result,
      color2: result2,
      steps: [step1, step2]
    });
    return {
      color: result,
      color2: result2
    };
  }
  public static animateColorInOut(
    time: number,
    start: number,
    end: number,
    fadeIn: number,
    fadeInFrom: number,
    fadeInTo: number,
    fadeInCallback: (x: number) => any,
    fadeOut: number,
    fadeOutTo: number
  ): number {
    // split color to rgba

    const rSource = (fadeInFrom / 16777216) & 0xff;
    const gSource = (fadeInFrom / 65536) & 0xff;
    const bSource = (fadeInFrom / 256) & 0xff;
    const aSource = (fadeInFrom / 1) & 0xff;

    const rTarget = (fadeInTo / 16777216) & 0xff;
    const gTarget = (fadeInTo / 65536) & 0xff;
    const bTarget = (fadeInTo / 256) & 0xff;
    const aTarget = (fadeInTo / 1) & 0xff;

    let r = 0;
    let b = 0;
    let g = 0;
    let a = 0;

    // animated rgba separately
    //this.animateInOutDifferentParameters(time, start, end, fadeIn, fadeInFrom, fadeInTo, fadeInCallback, fadeOut, fadeInTo, fadeOutTo, fadeInCallback);

    // combine again to color

    // let the text blink
    AnimHelper.animateInOut(time, start, end, fadeIn, aSource, aTarget, (x) => (a = x), fadeOut, aSource);
    AnimHelper.animateInOut(time, start, end, fadeIn, rSource, rTarget, (x) => (r = x), fadeOut, rSource);
    AnimHelper.animateInOut(time, start, end, fadeIn, gSource, gTarget, (x) => (g = x), fadeOut, gSource);
    AnimHelper.animateInOut(time, start, end, fadeIn, bSource, bTarget, (x) => (b = x), fadeOut, bSource);

    r = Math.floor(r);
    g = Math.floor(g);
    b = Math.floor(b);
    a = Math.floor(a);

    // r = r & 0xFF;
    // g = b & 0xFF;
    // b = b & 0xFF;
    // a = a & 0xFF;

    const result = r * 16777216 + g * 65536 + b * 256 + a; // TODO: CLAMP VALUES
    fadeInCallback(result);
    return result;
  }

  public static clamp(value: number, min?: number, max?: number) {
    if (min === undefined) min = 0.0;
    if (max === undefined) max = 1.0;
    return Util.clamp(value, min, max);
  }

  public static range(val: number, start: number, end: number) {
    return (val - start) / (end - start);
  }

  public static clampedRange(val: number, start: number, end: number) {
    return this.clamp(this.range(val, start, end));
  }

  private static sigmoidBase(t: number, sharpnessFactor: number) {
    return 1 / (1 + Math.exp(-sharpnessFactor * t)) - 0.5;
  }

  public static sigmoid(value: number, smoothness?: number) {
    if (smoothness === undefined) smoothness = 5.0;

    const correction = 0.5 / this.sigmoidBase(1, smoothness);
    const ct = Util.clamp(value, 0, 1);
    return correction * this.sigmoidBase(2 * ct - 1, smoothness) + 0.5;
  }

  public static easeIn(value: number, smoothness?: number) {
    value = Util.clamp(value * 0.5, 0, 0.5);
    return this.sigmoid(value, smoothness) * 2.0;
  }

  public static easeOut(value: number, smoothness?: number) {
    value = Util.clamp(value * 0.5 + 0.5, 0.5, 1.0);
    return (this.sigmoid(value, smoothness) - 0.5) * 2.0;
  }

  public static easeOutCirc(t: number, smoothness: number): number {
    return 1 - Math.pow(1 - Math.pow(t, 1 / smoothness), 2);
  }

  public static easeOutSine(t: number, smoothness: number = 1): number {
    return Math.sin((t / smoothness) * (Math.PI / 2));
  }

  public static limit(val: number, x: number) {
    if (val > x) val = 1.0 + (x - val);
    return val;
  }

  public static limit2(val: number, x: number, time: number) {
    if (val > x - time) val = x - val;
    return val;
  }

  public static inAnim(t: number, anim: IAnimInterval) {
    return t >= anim.startTime && t < anim.startTime + anim.duration;
  }
  /**
   * Berechnet den Wert des Ease-Out-Circ Easing-Effekts innerhalb eines bestimmten Zeitraums.
   *
   * @param elapsedTime Die vergangene Zeit innerhalb des Easing-Zeitraums (in Millisekunden).
   * @param startValue Der Startwert, von dem das Easing beginnt.
   * @param targetValue Der Zielwert, zu dem das Easing endet.
   * @param duration Die Dauer des Easing-Effekts (in Millisekunden).
   * @param smoothness Die Glättung des Easing-Effekts (optional, Standardwert ist 2).
   * @returns Der berechnete Wert des Ease-Out-Circ Easing-Effekts zum gegebenen Zeitpunkt.
   */
  public static easeOutCircWithTime(elapsedTime: number, startValue: number, targetValue: number, duration: number, smoothness = 2): number {
    if (Number(elapsedTime.toFixed(2)) >= duration) {
      return targetValue; // Easing-Zeitraum ist abgelaufen, geben Sie den Zielwert zurück.
    }

    // Berechne den Fortschritt innerhalb des Easing-Zeitraums (Wert zwischen 0 und 1).
    const progress = elapsedTime / duration;

    // Berechne den Easing-Effekt und wende ihn auf den Startwert an, um den aktuellen Wert zu erhalten.
    const easedValue = startValue + (targetValue - startValue) * (1 - Math.pow(1 - Math.pow(progress, 1 / smoothness), 2));
    console.log("eased val ", easedValue.toFixed(6));

    return Number(easedValue.toFixed(6));
  }
}
