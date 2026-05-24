import Axios, { AxiosProgressEvent } from "axios";
import { IFileInfo, IndexDB } from "./IndexDB";
import { Logger } from "client/Logic/Logger";
import { settings } from "client/Logic/Logic";

export interface IDownloadCallbacks {
  onProgress?: (progress: IDownloadProgress[]) => void;
}

export interface IDownloadProgress {
  filePath: string;
  loaded: number;
  total: number;
  finished: boolean;
  success: boolean;
}

export interface IFetchOptions {
  auth?: {
    username: string;
    password: string;
  };
}

export class LocalCache {
  private static db: IndexDB | undefined = new IndexDB("diplomat", 4);
  private static cache: any = {};
  private static ignoreParams = true;

  public static get(_url: string): string {
    if (!settings.useCache) return _url;
    const fixedUrl = this.fixUrl(_url);
    if (this.isLocal(fixedUrl)) return _url;
    if (this.cache[fixedUrl])
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.cache[fixedUrl];
    return _url;
  }

  public static isLocal(url: string): boolean {
    const lc = url.toLowerCase();
    // Logger.info("IsLocal? " + lc);
    if (lc.startsWith("/.local/") || lc.startsWith("/sdcard/")) return true;
    if (settings.sdCardPath && url.startsWith(settings.sdCardPath)) return true;
    // Logger.info("IsLocal - No " + settings.sdCardPath);
    return false;
  }

  public static async cacheFiles(files: string[], options: IFetchOptions, callbacks?: IDownloadCallbacks): Promise<boolean> {
    if (!this.db) {
      Logger.warn("No indexdb!");
      return false;
    }

    // remove local files
    files = files.filter((f) => {
      return !this.isLocal(f);
    });

    // remove duplicates
    files = files.filter((elem, pos, array) => {
      return array.indexOf(elem) === pos;
    });

    if (files.length === 0) {
      Logger.info("No files to cache!");
      return true;
    }

    const ret = await this.batchFetch(files, 4, options, callbacks);
    return ret === files.length;
  }

  private static batchFetch(filePaths: string[], concurrentRequestsLimit: number, options: IFetchOptions, callbacks?: IDownloadCallbacks) {
    if (filePaths.length === 0) return Promise.resolve(true);
    return new Promise((resolve) => {
      let index = 0;
      let done = 0;
      let success = 0;

      const progress: IDownloadProgress[] = [];
      for (const f of filePaths) {
        progress.push({ filePath: f, loaded: 0, total: 0, finished: false, success: false });
      }

      const recursiveFetch = async () => {
        if (index === filePaths.length) {
          return;
        }
        const currentIndex = index++;
        const ret = await this.cacheFile(filePaths[currentIndex], options, (loaded: number, total: number) => {
          const poInner = progress[currentIndex];
          poInner.loaded = loaded;
          poInner.total = total;
          if (callbacks && callbacks.onProgress) callbacks.onProgress(progress);
        });
        const po = progress[currentIndex];
        po.finished = true;
        if (ret) {
          po.success = true;
          success++;
        }
        done++;
        if (done === filePaths.length) {
          resolve(success);
        } else {
          recursiveFetch();
        }
      };

      for (let i = 0; i < concurrentRequestsLimit; i++) {
        recursiveFetch();
      }
    });
  }

  private static async downloadFile(filePath: string, options: IFetchOptions, callback?: (loaded: number, total: number) => void) {
    if (!this.db) return undefined;

    try {
      const file = await Axios.get(filePath, {
        auth: options.auth,
        responseType: "blob",
        onDownloadProgress: (ev: AxiosProgressEvent) => {
          const loaded = ev.loaded || 0;
          const total = ev.total || 0;
          if (callback) callback(loaded, total);
          Logger.info("Loaded: " + loaded + " " + total + " " + filePath);
        }
      });
      return file;
    } catch (e) {
      Logger.error("Failed to download file: " + filePath, e);
      return undefined;
    }
  }

  public static async delete() {
    if (this.db) await this.db.delete();
  }

  public static fixUrl(file: string) {
    if (this.ignoreParams) return this.removeParams(file);
    return file;
  }

  public static removeParams(file: string): string {
    const index = file.indexOf("?");
    if (index === -1) return file;
    return file.substr(0, index);
  }

  private static async getFromDb(filePath: string) {
    if (!this.db) return undefined;

    const ret = await this.db.readFileInfo(filePath);
    if (ret) {
      const rf = await this.db.readFile(filePath);
      if (rf) {
        const check = new Promise<void>((resolve, reject) => {
          const sizeToLoad = Math.min(4, rf.size);
          const reader = new FileReader();
          reader.onloadend = (ev) => {
            if (ev.loaded === sizeToLoad) resolve(undefined);
            else reject("Failed to load file!");
          };
          reader.readAsDataURL(rf.slice(0, sizeToLoad));
        });

        try {
          await check;
          return URL.createObjectURL(rf);
        } catch (e) {
          Logger.warn("LocalCache FileCheck failed: " + filePath, e);
        }
      }
    }
  }

  public static async enumCache(callback: (f: IFileInfo, folderName: string) => void): Promise<false | undefined> {
    if (!this.db) return false;

    await this.db.enumFiles(callback);
  }

  private static async cacheFile(filePath: string, options: IFetchOptions, callback?: (loaded: number, total: number) => void) {
    if (!this.db) return false;

    const fixedUrl = this.fixUrl(filePath);
    let objectUrl = await this.getFromDb(fixedUrl);

    if (!objectUrl) {
      const file = await this.downloadFile(filePath, options, callback);
      if (file && file.status === 200) {
        await this.db.writeFile(fixedUrl, file.data, file.data.size, "");
        const rf = await this.db.readFile(fixedUrl);
        if (rf) objectUrl = URL.createObjectURL(rf);
      }
    }

    if (objectUrl) {
      this.cache[fixedUrl] = objectUrl;
      return true;
    }
    return false;
  }
}
