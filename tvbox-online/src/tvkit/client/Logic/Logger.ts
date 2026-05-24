/**
 * TRIMMED vendored Logger — for the tvbox RaceBarDog port.
 *
 * The real Logger pulls in chalk and the Settings/transport stack. RaceBarDog
 * only calls Logger.warn / Logger.error, so we map them straight to console.
 */
export class Logger {
  public static info(...args: any[]): void {
    // eslint-disable-next-line no-console
    console.info("[tvkit]", ...args);
  }
  public static warn(...args: any[]): void {
    // eslint-disable-next-line no-console
    console.warn("[tvkit]", ...args);
  }
  public static error(...args: any[]): void {
    // eslint-disable-next-line no-console
    console.error("[tvkit]", ...args);
  }
  public static guard(_label: string, fn: () => void): void {
    fn();
  }
}
