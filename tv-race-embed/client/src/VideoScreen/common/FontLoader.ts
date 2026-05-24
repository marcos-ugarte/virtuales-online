import * as WebFont from "webfontloader";
import { Logger } from "client/Logic/Logger";

export class FontLoader {
  public static startLoading(fonts: { name: string; path: string; fontStyle: string }[]) {
    Logger.info("FontLoader::startLoading");
    const promises = [];
    for (const font of fonts) {
      try {
        promises.push(this.loadFont(font.name, font.path));
      } catch (e) {
        Logger.error("Failed to load font: " + font.name + " " + font.path, e);
      }
    }
    return { promise: Promise.all(promises) };
  }

  public static calcCss(fonts: { name: string; path: string; fontStyle: string }[]): any {
    const cssFonts = [];
    for (const font of fonts) {
      cssFonts.push({
        fontFamily: font.name,
        src: 'url("' + font.path + '")',
        fontStyle: font.fontStyle
      });
    }
    return cssFonts as any;
  }

  private static async loadFont(name: string, path: string) {
    return new Promise<void>((resolve, reject) => {
      const WebFontConfig = {
        classes: false,
        active: () => {
          Logger.info("Resolve loadFont: " + name + " " + path);
          resolve(undefined);
        },
        inactive: () => {
          Logger.warn("Reject loadFont: " + name + " " + path);
          reject();
        },
        custom: {
          families: [name]
        }
      };
      try {
        WebFont.load(WebFontConfig);
      } catch (e) {
        Logger.error("Exception: " + e);
      }
    });
  }
}
