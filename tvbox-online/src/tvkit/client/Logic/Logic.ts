/**
 * SHIM Logic — for the tvbox RaceBarDog port.
 *
 * RaceBarDog (and its vendored closure: ChangeAbleText, the bonus stubs) depend
 * on the streaming_kit `Logic` engine singleton. Because our race videos are
 * RACE-ONLY (no intro), almost all of Logic collapses to constants, so we
 * implement only the exact surface those files reference instead of porting the
 * real engine.
 *
 * Surface actually used by the vendored closure (verified by grep):
 *   Logic.autoSize, Logic.createPixiText, Logic.getAnim, Logic.getFontSize,
 *   Logic.getVideoTime, Logic.getRaceVideoTime, Logic.getInGameRaceTime,
 *   Logic.getRaceEndTime, Logic.getRaceLength, Logic.getIntroLength,
 *   Logic.getState, Logic.isInIntro, Logic.getTimeUntilRaceForTimeBar,
 *   Logic.getExactTimeUntilRace, Logic.isFading, Logic.fadeX, Logic.fadeTime,
 *   Logic.fadeTarget, Logic.implementation,
 *   _s, _t, settings.{debug,scaleFactor}.
 *
 * Intro-less semantics: getIntroLength()===0, state is always Race, no fade.
 * Time is injected from the live <video>.currentTime via setTimeProvider.
 */
import * as PIXI from "pixi.js";
import { IAnimInterval, VideoState } from "client/Logic/LogicDefinitions";
import { GameType, GameLength } from "common/Definitions";

// ── settings ──────────────────────────────────────────────────────────────
// scaleFactor 1 => _s is identity (1280x720 design space rendered 1:1).
export const settings = {
  scaleFactor: 1,
  debug: false,
  showDebugTextColor: false,
};

// _s scales design-space units; _t resolves a translation key (identity here).
export function _s(v: number): number {
  return v * settings.scaleFactor;
}

// UI strings the ported components look up by key. Spanish for the TV-box.
const TEXTS: Record<string, string> = {
  race: 'CARRERA',
  countdown: '',
  // WinnerDog / WinnerDogLine string keys (Spanish for the TV-box).
  winner: 'GANADOR',
  forcastBet: 'EXACTA',
  first: 'PRIMERO',
  second: 'SEGUNDO',
  sec: 'SEG',
};

export function _t(key: string): string {
  return TEXTS[key] ?? key;
}

// ── implementation (LogicBase-derived behaviour, trimmed) ───────────────────
const implementation = {
  /** Replicates LogicBase.formatTime — "MM:SS" by default. */
  formatTime(time: number, options?: { minutes?: boolean; seconds?: boolean; hundredth?: boolean }): string {
    if (time < 0) time = 0;
    if (!options) options = { minutes: true, seconds: true };
    let str = "";
    if (options.minutes) {
      str = (str ? str + ":" : str) + Math.floor(time / 60).toString().padStart(2, "0");
    }
    if (options.seconds) {
      str = (str ? str + ":" : str) + (Math.floor(time) % 60).toString().padStart(2, "0");
    }
    if (options.hundredth) {
      str = (str ? str + "." : str) + Math.round((time * 100) % 100).toString().padStart(2, "0");
    }
    return str;
  },

  /** Replicates LogicBase.formatRound — 4-digit zero-pad. */
  formatRound(round: number): string {
    return round.toString(10).padStart(4, "0");
  },

  formatNumber(value: number, _commaCount: number): string {
    return value.toString();
  },

  /**
   * Replicates LogicBase.formatOdds → Util.formatValue(odds, comma, commaSymbol).
   * commaSymbol is "." for the non-Italian skin (LanguagesBase default). When
   * comma is omitted the real default is 1 (one decimal place). `getOddsForDriverDigits`
   * supplies the override count only on the Italian odds-always-on skin (null here).
   */
  formatOdds(oddsNumber: number, comma = 1): string {
    if (oddsNumber === undefined || oddsNumber === null || !isFinite(oddsNumber)) return "";
    let tmpstr: string;
    if (comma !== -1) {
      tmpstr = oddsNumber.toFixed(comma);
    } else {
      tmpstr = oddsNumber.toString();
    }
    return tmpstr.replace(".", ".");
  },

  getText(textId: string): string {
    return TEXTS[textId] ?? textId;
  },

  /**
   * Minimal IGameInfo surface WinnerDog/WinnerDogLine read: only `.gameLength`
   * (they branch `=== 300` for the dog5 long-race anim windows; our dog6/dog8
   * races are 240, so the non-300 branch is taken — matching the TV-box) and
   * `.gameType`. Returns the injected game length so the branch is data-driven.
   */
  getGameInfo(): { gameLength: number; gameType: GameType } {
    return { gameLength: Logic.gameLength, gameType: "dog6" };
  },

  getCurrentIntroGameLength(): GameLength {
    return Logic.gameLength;
  },

  reloadWindow(): void {
    // no-op in the embed; the real impl reloads on invalid video time.
  },
};

// ── Logic ───────────────────────────────────────────────────────────────────
export class Logic {
  public static languageId = "en";

  // Injected race length and game length (set from our feed by the wrapper).
  public static gameLength: GameLength = 240;
  private static raceLength = 30;
  private static timeProvider: () => number = () => 0;

  // Fade state — never fading in the intro-less embed.
  public static isFading = false;
  public static fadeX = 1;
  public static fadeTime = 0;
  public static fadeTarget: VideoState = VideoState.Race;

  public static implementation = implementation;

  // ── injection points ──────────────────────────────────────────────────
  public static setTimeProvider(fn: () => number): void {
    this.timeProvider = fn;
  }

  public static setRaceLength(seconds: number): void {
    this.raceLength = seconds;
  }

  public static setGameLength(len: GameLength): void {
    this.gameLength = len;
  }

  // ── time / state (intro-less) ──────────────────────────────────────────
  public static getVideoTime(): number {
    return this.timeProvider();
  }

  public static getIntroLength(): number {
    return 0;
  }

  public static getRaceVideoTime(): number {
    return this.getVideoTime();
  }

  public static getInGameRaceTime(_gameType: GameType): number {
    return this.getRaceVideoTime() - 1.0;
  }

  public static getRaceLength(): number {
    return this.raceLength;
  }

  public static getRaceEndTime(): number {
    return this.getRaceLength();
  }

  public static getIntroEndTime(): number {
    return 0;
  }

  public static getState(): VideoState {
    return VideoState.Race;
  }

  public static isInIntro(): boolean {
    return false;
  }

  public static getTimeUntilRaceForTimeBar(): number {
    return 0;
  }

  public static getExactTimeUntilRace(_raceStart: number): number {
    return 0;
  }

  // ── odds lookup (replicate streaming_kit Logic) ─────────────────────────
  /**
   * Replicates streaming_kit Logic.getOddsForDriver: indexes the flat WIN/EXACTA
   * odds[] array as `odds[first * racerCount + second]`. For a WIN quote the
   * caller passes first===second (diagonal). For the forecast (firstTwo) it
   * passes first/second of the two boxes.
   */
  public static getOddsForDriver(odds: number[], first: number, second: number, racerCount: number): number {
    return odds[first * racerCount + second];
  }

  /**
   * Replicates streaming_kit Logic.getOddsForDriverDigits: only the Italian
   * MODERN_ODDS_ALWAYS_ON skin overrides the decimal count (hardcoded per game
   * type). Our TV-box is not the Italian skin, so — exactly like the original's
   * fall-through — this returns null and formatOdds uses its default precision.
   */
  public static getOddsForDriverDigits(_odds: number[], _first: number, _second: number, _racerCount: number): number | null {
    return null;
  }

  // ── text helpers (replicate streaming_kit Logic) ────────────────────────
  public static createPixiText(style?: PIXI.TextStyle, text?: string, noTrim?: boolean): PIXI.Text {
    if (style !== undefined) {
      style.trim = noTrim ? false : true;
      style.padding = 10;
    } else {
      style = new PIXI.TextStyle({ trim: true, padding: 10 });
    }
    const pixiText = new PIXI.Text(text ? text : "", style);
    pixiText.roundPixels = true;
    return pixiText;
  }

  /**
   * Shrinks fontSize (and letterSpacing) until the text fits `width`.
   * Mirrors the real Logic.autoSize loop (20 steps), caching the original size.
   */
  public static autoSize(pixiText: PIXI.Text, width: number): void {
    if (!pixiText.style || pixiText.style.fontSize === undefined) return;

    const anyText = pixiText as any;
    if (anyText.originalFontSize === undefined) {
      anyText.originalFontSize = pixiText.style.fontSize;
      anyText.originalLetterSpacing = pixiText.style.letterSpacing;
    }

    const textString: string = pixiText.text;
    const ofs = anyText.originalFontSize as number;
    const ols = anyText.originalLetterSpacing as number | undefined;

    if (pixiText.style.fontSize !== ofs) pixiText.style.fontSize = ofs;
    if (ols !== undefined && pixiText.style.letterSpacing !== ols) pixiText.style.letterSpacing = ols;

    let tm = PIXI.TextMetrics.measureText(textString, pixiText.style, false);
    let index = 0;
    while (tm.width > width && index < 20) {
      pixiText.style.fontSize = (ofs * (20 - index)) / 20;
      if (ols !== undefined) pixiText.style.letterSpacing = (ols * (20 - index)) / 20;
      tm = PIXI.TextMetrics.measureText(textString, pixiText.style, false);
      index++;
    }
  }

  public static getFontSize(text: PIXI.Text): number {
    return text.style.fontSize as number;
  }

  /**
   * Replicates streaming_kit Logic.createPixiMask — a white rectangle PIXI.Graphics
   * used to clip text (RaceIntervalsDog / RaceIntervalItemDog). Dimensions are
   * design-space and scaled through _s. `debug` renders it at 50% alpha.
   */
  public static createPixiMask(
    xOffset: number = 0,
    yOffset: number = 0,
    width: number,
    height: number = 20,
    debug?: boolean,
  ): PIXI.Graphics {
    const mask = new PIXI.Graphics();

    mask.beginFill(0xffffff);
    mask.drawRect(_s(xOffset), _s(yOffset), _s(width), _s(height));
    mask.endFill();
    mask.alpha = debug ? 0.5 : 0;
    mask.renderable = true;
    // NB: the original sets cacheAsBitmap=true (fine on the Android TV WebView's
    // dedicated GPU), but these masks are MOVED every frame by the interval
    // reveal animation — in a normal browser cacheAsBitmap on a moving mask
    // re-renders the cache each frame and stutters the <video>. A plain rect
    // mask needs no caching, so we leave it off.
    mask.cacheAsBitmap = false;

    return mask;
  }

  // ── anim selection (replicate streaming_kit Logic.getAnim) ──────────────
  private static getAnimInternal<T extends IAnimInterval>(items: T[], time: number): T {
    let last = items[0];
    for (const item of items) {
      if (time < item.startTime) return last;
      last = item;
    }
    return last;
  }

  public static getAnim<T extends IAnimInterval>(
    time: number,
    items: T[] | undefined,
    group: { visible: boolean },
    _options?: { offsetTime?: number; clipTime?: number },
  ): T | undefined {
    if (!items) return undefined;
    const offsetTime = _options?.offsetTime ?? 0.0;
    time = time + offsetTime;
    const anyGroup: any = group as any;

    const anim = this.getAnimInternal(items, time);
    if (!anim) {
      anyGroup.visible = false;
      return undefined;
    }

    if (anim.duration < 0.0001) {
      anyGroup.visible = false;
      return undefined;
    }

    if (!anyGroup._anim || anyGroup._anim.startTime !== anim.startTime || time < anyGroup._wasInAnim) {
      anyGroup._anim = anim;
      anyGroup._wasInAnim = undefined;
    }

    const inAnim = time >= anim.startTime && time < anim.startTime + anim.duration;
    if (!inAnim) {
      if (time < anim.startTime) {
        anyGroup.visible = false;
        return undefined;
      }
      if (anyGroup._wasInAnim !== undefined && anyGroup._wasInAnim > anim.startTime + anim.duration + 4.0) {
        anyGroup.visible = false;
        return undefined;
      }
    }

    anyGroup._wasInAnim = time;
    anyGroup.visible = true;
    return anim;
  }
}
