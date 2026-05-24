import stringify from "json-stringify-safe";
import { Logger } from "client/Logic/Logger";
import { Color } from "./Color";
import dateFormat from "dateformat";
import { DeviceTypes, EventType } from "common/Definitions";
import { Settings } from "common/Settings";

type INewable<T> = new (...params: any[]) => T;

export interface ITimezoneData {
  timeZoneOffset: number;
  timezoneId: string;
  geoLat: number;
  geoLong: number;
}

export enum TimzoneStorageStatus {
  VALID,
  TO_OLD,
  NO_DATA
}

export interface ITimezoneStorageData {
  timeZoneData: ITimezoneData | null;
  status: TimzoneStorageStatus;
  statusLastStart: TimzoneStorageStatus;
}

export class Util {
  public static timeZoneOffset: number = 0;
  public static useSetTimeZoneOffset: boolean = false;
  public static geoResult: any;
  public static geoLat: number;
  public static geoLong: number;
  public static timezoneId: string;
  public static geoResultOffset: number = 0;
  public static geoResultTimezone: string = "";
  public static geoResultIp: string = "";
  public static testCounter: number = 0;

  public static isA<T>(obj: any, constructor: INewable<T>): boolean {
    return obj instanceof constructor;
  }

  public static getA<T>(obj: any, constructor: INewable<T>): T | null {
    if (!Util.isA<T>(obj, constructor)) return null;
    return obj as T;
  }

  // 6.1.7 The Object Type
  // https://tc39.github.io/ecma262/#sec-object-type
  public static isObject<T>(x: T | undefined | null | boolean | string | symbol | number): x is T {
    return typeof x === "object" ? x !== null : typeof x === "function";
  }

  public static isString(object: any): object is string {
    return typeof object === "string";
  }

  public static isNumber(object: any): object is number {
    return typeof object === "number";
  }

  public static toNumber(newVal: any): number {
    if (Util.isString(newVal)) return parseFloat(newVal);
    else if (Util.isNumber(newVal)) return newVal;
    return 0;
  }

  public static toIntNumber(newVal: any, radix?: number): number {
    if (!radix) radix = 10;
    if (Util.isString(newVal)) return parseInt(newVal, radix);
    else if (Util.isNumber(newVal)) return newVal;
    return 0;
  }

  public static isArray(object: any): object is any[] {
    return Array.isArray(object);
  }

  public static isFunction(object: any): any {
    const getType = {};
    return object && getType.toString.call(object) === "[object Function]";
  }

  public static capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  public static parseQueryParams(qs: string): any {
    qs = qs.split("+").join(" ");

    const params: any = {};
    const re = /[?&]?([^=]+)=([^&]*)/g;
    let tokens = re.exec(qs);

    while (tokens) {
      params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
      tokens = re.exec(qs);
    }

    return params;
  }

  public static isValidEmail(email: string): boolean {
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

  public static classNames(...args: any[]): string {
    let classes: string[] = [];

    for (const a of args) {
      if (Util.isString(a)) classes.push(a);
      else if (Util.isArray(a) && a.length > 0) {
        const arr = a as string[];
        classes = classes.concat(arr);
      } else if (typeof a === "object") {
        for (const key in a) {
          if (a) {
            // eslint-disable-next-line @typescript-eslint/unbound-method
            const hasOwn = {}.hasOwnProperty;
            if (hasOwn.call(a, key) && a[key]) {
              classes.push(key);
            }
          }
        }
      }
    }
    return classes.join(" ");
  }

  public static componentToHex(c: number): string {
    const hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }

  public static rgbComponentsToHex(r: number, g: number, b: number): string {
    return "#" + Util.componentToHex(r) + Util.componentToHex(g) + Util.componentToHex(b);
  }

  public static rgbToHex(argb: number): string {
    const out = { a: 0, r: 0, g: 0, b: 0 };
    Color.fillARGB(argb, out);
    return "#" + Util.componentToHex(out.r) + Util.componentToHex(out.g) + Util.componentToHex(out.b);
  }

  public static stringify(obj: any): string {
    return stringify(obj, null, 2);
  }

  public static getVariableName<TResult>(name: () => TResult): string {
    const varExtractor = /\(\) => (.*\.)*(.+)/g;
    const nameString = name + "";
    const m = varExtractor.exec(nameString);
    if (m == null) throw new Error("The function does not contain a statement matching 'return variableName;'");
    return m[m.length - 1];
  }

  public static asString(pathes: string | string[]): string {
    if (Array.isArray(pathes)) return pathes[0];
    return pathes;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public static ensureArray = (obj: any): any[] => {
    if (Array.isArray(obj)) {
      return obj;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return [obj];
    }
  };

  public static isEmpty(obj: any): boolean {
    for (const prop in obj) {
      if (obj.hasOwnProperty(prop)) return false;
    }
    return true;
  }

  public static getTimestampWithAge(days: number, hours?: number, minutes?: number, seconds?: number): number {
    const timestamp = Date.now() - this.getTimestampDuration(days, hours, minutes, seconds);
    return timestamp;
  }

  public static getTimestampDuration(days: number, hours?: number, minutes?: number, seconds?: number): number {
    let duration = days * 24 * 60 * 60 * 1000;
    if (hours !== undefined) duration += hours * 60 * 60 * 1000;
    if (minutes !== undefined) duration += minutes * 60 * 1000;
    if (seconds !== undefined) duration += seconds * 1000;
    return duration;
  }

  public static toPosix(path: string): string {
    return path.split("\\").join("/");
  }

  public static round(num: number, decimals: number): number {
    if (!isNaN(num) && isFinite(num)) {
      const decimalPower = 10 ** decimals;
      return Math.round(num * decimalPower) / decimalPower;
    }
    return NaN;
  }

  public static getUrlParameter(urlString: string, param: string): string | undefined {
    const url = new URL(urlString);
    const ret = url.searchParams.get(param);
    if (ret === null) return undefined;
    return ret;
  }

  public static getUrlParameterBool(urlString: string, param: string, defaultValue: boolean): boolean {
    const query = this.getUrlParameter(urlString, param);
    if (query !== undefined) return query === "" || query === "true" ? true : false;
    return defaultValue;
  }

  public static getUrlParameterIntOrUndefined(urlString: string, param: string): number | undefined {
    const query = this.getUrlParameter(urlString, param);
    if (query !== undefined) return parseInt(query, 10);
    return undefined;
  }

  public static getUrlParameterInt(urlString: string, param: string, defaultValue: number): number {
    const query = this.getUrlParameter(urlString, param);
    if (query !== undefined) return parseInt(query, 10);
    return defaultValue;
  }

  public static getUrlParameterFloat(urlString: string, param: string, defaultValue: number): number {
    const query = this.getUrlParameter(urlString, param);
    if (query !== undefined) return parseFloat(query);
    return defaultValue;
  }

  public static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(min, value), max);
  }

  public static lerp(from: number, to: number, factor: number): number {
    return from * (1.0 - factor) + to * factor;
  }

  public static waitDelay(ms: number): Promise<unknown> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public static parseBoolean(value: string): boolean {
    if (value === "true") {
      return true;
    }

    return false;
  }

  /**
   * creates
   * @param array
   * @returns
   */
  public static copyArrayOfObjects<T>(array: T[]): T[] {
    return array.map((el) => ({ ...el }));
  }

  public static getStandardNow(): string {
    const now = new Date();
    return dateFormat(now, "yyyy-mm-dd HH:MM:ss");
  }

  public static formatStandardDate(date: Date): string {
    return dateFormat(date, "yyyy-mm-dd HH:MM:ss");
  }

  public static getDatFromStandardString(dateStr: string | null): Date {
    if (dateStr === null || dateStr === "") {
      Logger.error("Invalide Date to create:" + dateStr);
      return new Date(0);
    }

    const retDate = new Date();

    retDate.setFullYear(parseInt(dateStr.substr(0, 4), 10));
    retDate.setMonth(parseInt(dateStr.substr(5, 2), 10) - 1);
    retDate.setDate(parseInt(dateStr.substr(8, 2), 10));
    retDate.setHours(parseInt(dateStr.substr(11, 2), 10));
    retDate.setMinutes(parseInt(dateStr.substr(14, 2), 10));
    retDate.setSeconds(parseInt(dateStr.substr(17, 2), 10));
    retDate.setMilliseconds(0);

    // Logger.debug("Created standard date:" + Util.formatStandardDate(retDate));

    return retDate;
  }

  public static getDatFromStandardShortString(dateStr: string | null): Date {
    if (dateStr === null || dateStr === "") {
      Logger.error("Invalide Date to create:" + dateStr);
      return new Date(0);
    }

    const retDate = new Date();

    retDate.setFullYear(parseInt(dateStr.substr(0, 4), 10));
    retDate.setMonth(parseInt(dateStr.substr(5, 2), 10) - 1);
    retDate.setDate(parseInt(dateStr.substr(8, 2), 10));
    retDate.setHours(0);
    retDate.setMinutes(0);
    retDate.setSeconds(0);
    retDate.setMilliseconds(0);

    // Logger.debug("Created standard date:" + Util.formatStandardDate(retDate));

    return retDate;
  }

  public static getTimeZoneOffset(utcDate: Date): number {
    if (this.useSetTimeZoneOffset) {
      return this.timeZoneOffset;
    }

    return utcDate.getTimezoneOffset();
  }

  public static getSecondsSinceFromUTCDate(utcDate: Date): number {
    const timezoneoffset = utcDate.getTimezoneOffset();
    Logger.debug("Javascript Timezone offset:" + timezoneoffset);
    return utcDate.getTime() - timezoneoffset * 60000;
  }

  public static getTimezoneSecondsSinceFromUTCDate(utcDate: Date): number {
    const timezoneoffset = this.getTimeZoneOffset(utcDate);
    Logger.debug("Javascript Timezone offset:" + timezoneoffset);
    return utcDate.getTime() - timezoneoffset * 60000;
  }

  public static formatStandardUTCSecondsScince(utcTimestamp: number): string {
    const utcDate = new Date(utcTimestamp);
    const timezoneoffset = utcDate.getTimezoneOffset();

    const retDate = new Date(utcDate.getTime() + timezoneoffset * 60000);

    return Util.formatStandardDate(retDate);
  }

  public static formatDate(date: Date, formatString: string): string {
    return dateFormat(date, formatString);
  }

  public static formatDateFromUtcStandardDateString(dateStr: string, formatString: string): string {
    const date = Util.getDatFromStandardString(dateStr);

    const timezoneDate = new Date(Util.getTimezoneSecondsSinceFromUTCDate(date));

    return dateFormat(timezoneDate, formatString);
  }

  public static formatRaceBreakTime(timeStr: string): string {
    const date = new Date();
    const tokens = timeStr.split(":");
    date.setHours(parseInt(tokens[0], 10));
    date.setMinutes(parseInt(tokens[1], 10));
    date.setSeconds(parseInt(tokens[2], 10));

    Logger.debug("local Date:" + date + "Timezon from UTC:" + this.getTimeZoneOffset(date));

    const timezoneDate = new Date(date.getTime() - this.getTimeZoneOffset(date) * 60000);

    return timezoneDate.getHours().toString(10).padStart(2, "0") + ":" + timezoneDate.getMinutes().toString(10).padStart(2, "0");
  }

  public static async setTimezoneOffsetFromGeolocation(timeout: number): Promise<void> {
    // TODO TEST
    // Util.testCounter++;
    // if (Util.testCounter <= 2) {
    //   Settings.geolocRequestUrl = "müll" + Settings.geolocRequestUrl;
    // } else {
    //   Settings.geolocRequestUrl =
    //     "https://pro.ip-api.com/json/?key=vijXq4nIVhdbfsl&fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,offset,currency,isp,org,as,mobile,query";
    // }

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", Settings.geolocRequestUrl);
      xhr.timeout = timeout;

      xhr.setRequestHeader("Content-type", "application/json");
      xhr.onreadystatechange = () => {
        const DONE = 4; // readyState 4 means the request is done.
        const OK = 200; // status 200 is a successful return.
        if (xhr.readyState === DONE) {
          if (xhr.status === OK) {
            Logger.debug("Ajax read Data:" + xhr.responseText);

            const result = JSON.parse(xhr.responseText);
            this.geoResult = result;
            this.geoResultOffset = this.geoResult.offset / 60;
            this.geoResultTimezone = result.timezone;
            this.geoResultIp = result.query;

            const xhrTimeOffset = new XMLHttpRequest();
            xhrTimeOffset.open("GET", "https://api.virtuales.bet/dsa4/?rt=3&out=json&cmd=geonamesRequest&lat=" + result.lat + "&lng=" + result.lon);

            xhrTimeOffset.setRequestHeader("Content-type", "application/json");
            xhrTimeOffset.onreadystatechange = () => {
              if (xhrTimeOffset.readyState === DONE) {
                if (xhrTimeOffset.status === OK) {
                  Logger.debug("Ajax read Data:" + xhrTimeOffset.responseText);
                  const resultTimeOffset = JSON.parse(xhrTimeOffset.responseText);

                  if (resultTimeOffset.msgType === "error") {
                    Logger.error(xhr.responseText);
                    reject("Time offset Request Result Error");
                  } else {
                    // TODO TEST
                    // resultTimeOffset.geonames.timezoneId = "America/New_York";

                    const date = new Date();

                    const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
                    const tzDate = new Date(date.toLocaleString("en-US", { timeZone: resultTimeOffset.geonames.timezoneId }));
                    const offset = (utcDate.getTime() - tzDate.getTime()) / 60000; // time offset in minutes
                    Logger.debug("Timezone:" + resultTimeOffset.geonames.timezoneId);
                    Logger.debug("Timezone offset to UTC:" + offset);

                    this.setTimezoneData(offset, resultTimeOffset.geonames.timezoneId, this.geoResult.lat, this.geoResult.lon);
                    const timezondata: ITimezoneData = { timeZoneOffset: this.timeZoneOffset, timezoneId: this.timezoneId, geoLat: this.geoResult.lat, geoLong: this.geoResult.lon };

                    window.localStorage.setItem("timeData", JSON.stringify(timezondata));
                    window.localStorage.setItem("timeDataTimestamp", new Date().getTime().toString());

                    resolve();
                  }
                } else {
                  Logger.error("Error: " + xhrTimeOffset.status); // An error occurred during the request.
                  reject("Time offset Request answer Error:" + xhrTimeOffset.status);
                }
              }
            };

            xhrTimeOffset.onerror = (exetpion) => {
              Logger.error("Error: " + xhr.status); // An error occurred during the request.
              reject("Time offset Request xhr Error:" + JSON.stringify(exetpion, Object.getOwnPropertyNames(exetpion)) + " status:" + xhr.status);
            };
            xhrTimeOffset.ontimeout = (exetpion) => {
              Logger.error("Error: " + xhr.status); // An error occurred during the request.
              reject("Time offset Request timeout Error:" + JSON.stringify(exetpion, Object.getOwnPropertyNames(exetpion)) + " status:" + xhr.status);
            };

            xhrTimeOffset.send();
          } else {
            Logger.error("Error: " + xhr.status); // An error occurred during the request.
            reject("Geo Loc Request Answare Error:" + xhr.status);
          }
        }
      };

      xhr.onerror = (exetpion) => {
        Logger.error("Error: " + xhr.status); // An error occurred during the request.
        reject("Geo Loc Request xhr Error:" + JSON.stringify(exetpion, Object.getOwnPropertyNames(exetpion)) + " status:" + xhr.status);
      };
      xhr.ontimeout = (exetpion) => {
        Logger.error("Error: " + xhr.status); // An error occurred during the request.
        reject("Geo Loc Request  timeout Error:" + JSON.stringify(exetpion, Object.getOwnPropertyNames(exetpion)) + " status:" + xhr.status);
      };

      xhr.send();
    });
  }

  public static getTimezoneDataFromLocalStorage(): ITimezoneStorageData {
    const timezodDataString = window.localStorage.getItem("timeData");
    const timezoneTimeStampString = window.localStorage.getItem("timeDataTimestamp");
    const timezoneLastStartString = window.localStorage.getItem("timeLastStart");

    const retData: ITimezoneStorageData = { timeZoneData: null, status: TimzoneStorageStatus.NO_DATA, statusLastStart: TimzoneStorageStatus.TO_OLD };
    const now = new Date().getTime();

    if (timezoneTimeStampString && timezodDataString) {
      retData.status = TimzoneStorageStatus.VALID;
      retData.timeZoneData = JSON.parse(timezodDataString);
    }

    if (timezoneLastStartString) {
      const timezoneLastStart = parseInt(timezoneLastStartString);
      if (now - timezoneLastStart > 60000 * 60 * 48) {
        retData.statusLastStart = TimzoneStorageStatus.TO_OLD;
      } else {
        retData.statusLastStart = TimzoneStorageStatus.VALID;
      }
    }

    return retData;
  }

  public static setTimezoneData(offset: number, timezoneId: string, geoLat: number, geoLong: number) {
    this.geoLat = geoLat;
    this.geoLong = geoLong;
    this.timeZoneOffset = offset;
    this.useSetTimeZoneOffset = true;
    this.timezoneId = timezoneId;
  }

  public static sleep(ms: number): Promise<any> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public static formatValueC4(value: number, coma: number) {
    return this.formatValue(value, coma, ".");
  }
  public static formatValue(value: number, coma: number, comaSymbol: string) {
    let tmpstr;
    if (coma !== -1) {
      tmpstr = value.toFixed(coma);
    } else {
      tmpstr = value.toString();
    }
    tmpstr = tmpstr.replace(".", comaSymbol);

    return tmpstr;
  }

  public static floatNumber(value: number, percision: number): number {
    return parseFloat(value.toFixed(percision));
  }

  public static memoize<ARGS extends any[], R>(fn: (...args: ARGS) => R, additionalCallback?: () => any) {
    const cache: { [key: string]: R } = {};
    return (...args: ARGS) => {
      const keyObject = additionalCallback ? { args, __additional: additionalCallback() } : args;
      const key = JSON.stringify(keyObject);
      if (cache[key]) {
        // console.log("Cached: " + key + " " + cache[key]);
        return cache[key];
      }

      const r: R = fn(...args);
      cache[key] = r;
      // console.log("Calculated: " + key + " " + r);
      return r;
    };
  }

  public static callDelayed(callback: () => void, _delayTime?: number) {
    // const delayTime = Math.random() * 5000;
    const delayTime = _delayTime || 0;
    if (delayTime > 0) {
      setTimeout(() => {
        // Logger.debug("callDelayed");
        callback();
      }, delayTime);
    } else {
      callback();
    }
  }

  public static deepCopy<T>(source: T): T {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return Array.isArray(source)
      ? // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        (source.map((item) => this.deepCopy(item)) as unknown as T)
      : source instanceof Date
        ? (new Date(source.getTime()) as unknown as T)
        : source && typeof source === "object"
          ? Object.getOwnPropertyNames(source).reduce(
              (o, prop) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                Object.defineProperty(o, prop, Object.getOwnPropertyDescriptor(source, prop));
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                o[prop] = this.deepCopy(source[prop]);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return o;
              },
              Object.create(Object.getPrototypeOf(source))
            )
          : source;
  }

  public static getDeviceTypeFromString(deviceType: string | undefined): DeviceTypes {
    if (deviceType === DeviceTypes.Terminal.toString()) {
      return DeviceTypes.Terminal;
    }
    return DeviceTypes.Androidtv2;
  }

  public static getEvenTypeFromString(evenType: string | undefined): EventType | undefined {
    if (typeof evenType === "undefined") {
      return undefined;
    }

    let retEventType: EventType = "dog";
    if (evenType) {
      retEventType = evenType as EventType;
    }

    Logger.info("Set Url game type:" + retEventType);

    return retEventType;
  }

  public static getStackTrace(): string | undefined {
    const err = new Error();
    return err.stack;
  }

  public static addParameterToUrl(url: string | null, param: string, value: string): string {
    const parser = new URL(url || window.location.href);
    parser.searchParams.set(param, value);
    return parser.href;
  }
}
