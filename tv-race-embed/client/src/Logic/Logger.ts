/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import chalk from "chalk";

const ctx = new chalk.Instance({ level: 1 });

export interface ILogLevels {
  level: string;
  intVal: number;
}

export class LoggLevels {
  public static logLevels: ILogLevels[] = [
    {
      level: "TRACE",
      intVal: 5
    },
    {
      level: "DEBUG",
      intVal: 10
    },
    {
      level: "INFO",
      intVal: 20
    },
    {
      level: "WARN",
      intVal: 40
    },
    {
      level: "ERROR",
      intVal: 50
    }
  ];

  public static getLogLevelIntValue(level: string): number {
    const logLevel = this.logLevels.find((i) => i.level === level.toUpperCase());
    if (logLevel) {
      return logLevel.intVal;
    } else {
      return -1;
    }
  }
}

export class Logger {
  private static logGuards = false;
  private static enableExceptions = true;
  public static logLevel = 0;

  public static enableGuards(flag: boolean, exceptions: boolean): void {
    Logger.logGuards = flag;
    Logger.enableExceptions = exceptions;
  }

  private static log(message?: any, ...optionalParams: any[]) {
    console.log(message, ...optionalParams);
  }

  public static trace(message?: any, ...optionalParams: any[]): void {
    if (this.logLevel <= 5) this.log(ctx.white(Logger.getTimeString() + " - TRACE: ") + message, ...optionalParams);
  }

  public static debug(message?: any, ...optionalParams: any[]): void {
    if (this.logLevel <= 10) this.log(ctx.white(Logger.getTimeString() + " - DEBUG: ") + message, ...optionalParams);
  }

  private static logGuard(message?: any, ...optionalParams: any[]) {
    if (this.logLevel <= 20) this.log(ctx.greenBright(Logger.getTimeString() + " - GUARD: ") + message, ...optionalParams);
  }

  public static info(message?: any, ...optionalParams: any[]): void {
    if (this.logLevel <= 20) this.log(ctx.gray(Logger.getTimeString() + " - INFO: ") + message, ...optionalParams);
  }

  public static warn(message?: any, ...optionalParams: any[]): void {
    if (this.logLevel <= 40) this.log(ctx.magentaBright(Logger.getTimeString() + " - WARN: ") + message, ...optionalParams);
  }

  public static error(message?: any, ...optionalParams: any[]): void {
    if (this.logLevel <= 50) this.log(ctx.red(Logger.getTimeString() + " - ERROR: ") + message, ...optionalParams);
  }

  private static getTimeString(): string {
    const currentTime = new Date().toISOString();
    return currentTime;
  }

  public static async guardAsync<T>(name: string, p: () => Promise<T>): Promise<T | undefined> {
    if (!this.logGuards) return await p();
    const startStack = new Error().stack;
    await this.catchedAsync(
      async () => {
        this.logGuard("Before " + name);
        const ret = await p();
        this.logGuard("After " + name);
        return ret;
      },
      (e) => {
        Logger.error("GUARD Error: " + name, e, startStack);
      }
    );
  }

  public static guard(name: string, callback: () => any): any {
    if (!this.logGuards) return callback();
    const startStack = new Error().stack;
    this.catched(
      () => {
        this.logGuard("Before " + name);
        const ret = callback();
        this.logGuard("After " + name);
        return ret;
      },
      (e) => {
        Logger.error("GUARD Error: " + name, e, startStack);
      }
    );
  }

  public static catched<T>(fn: () => T, catched: string | ((e: Error) => void)): T | undefined {
    const withExceptions = false;
    if (withExceptions) {
      try {
        return fn();
      } catch (e: any) {
        if (typeof catched === "string") Logger.error(catched, e);
        else catched(e);
      }
    } else {
      // we want the debugger to catch the exception...
      return fn();
    }
  }

  public static async catchedAsync<T>(fn: () => Promise<T>, catched: string | ((e: Error) => void)) {
    const withExceptions = false;
    if (withExceptions) {
      try {
        return await fn();
      } catch (e: any) {
        if (typeof catched === "string") Logger.error(catched, e);
        else catched(e);
      }
    } else {
      // we want the debugger to catch the exception...
      return await fn();
    }
  }
}

export class HttpLogger {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  private sendLog(level: string, message: string) {
    fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ level, message })
    }).catch((error) => console.error("Error logging message:", JSON.stringify(error, Object.getOwnPropertyNames(error))));
  }

  private debug(message: string) {
    this.sendLog("debug", message);
  }

  private info(message: string) {
    this.sendLog("info", message);
  }

  private warn(message: string) {
    this.sendLog("warn", message);
  }

  private error(message: string) {
    this.sendLog("error", message);
  }

  public overrideConsoleLogs() {
    console.log = (...args: any[]) => {
      if (HttpLoggerLogic.httpLogger) HttpLoggerLogic.httpLogger.info(args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg)).join(" "));
    };

    console.warn = (...args: any[]) => {
      if (HttpLoggerLogic.httpLogger) HttpLoggerLogic.httpLogger.warn(args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg)).join(" "));
    };

    console.error = (...args: any[]) => {
      if (HttpLoggerLogic.httpLogger) HttpLoggerLogic.httpLogger.error(args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg)).join(" "));
    };
  }
}

export class HttpLoggerLogic {
  public static httpLogger: HttpLogger | null = null;

  public static setUpHttpLogger(logUrl?: string) {
    let logUrlSet = "http://localhost:3000" + "/ds_log_link_key";

    if (logUrl) {
      logUrlSet = logUrl + "/ds_log_link_key";
    }

    this.httpLogger = new HttpLogger(logUrlSet);
    this.httpLogger.overrideConsoleLogs();
  }
}
