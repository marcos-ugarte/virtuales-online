import * as PIXI from "pixi.js";
import { Logger } from "./Logger";
import { Logic, settings } from "./Logic";
import { IGameInfo, ILogicImplementation } from "./LogicDefinitions";
import { MessageBridge } from "./MessageBridge";
import { MessageType } from "./Messages";
import { LanguagesBase } from "client/LogicImplementation/base/LocalisationBase";
import { LocalCache } from "client/Update/LocalCache";
import { GameLength, GameType, IGameRoundResultVideo, PerformanceSetting, SkinType, SkinTypeDefinition } from "common/Definitions";
import { Util } from "common/Util";

export interface IVideoUrls {
  video: string;
  image: string;
  sound?: string;
}

export class LogicBase implements Partial<ILogicImplementation> {
  public gameInfo!: IGameInfo;
  public frameRate: number = 50;
  protected hasItalianShedule = false;
  // private textureCache: any = {};

  private messageBridge = new MessageBridge<MessageType>(
    (messageBridge: MessageBridge<MessageType>) => {
      if (!(window as any).ReactNativeWebView) return false;
      const mr = {
        onMessage: (m: string) => {
          Logger.info("OnReceive message VideoServer: " + JSON.stringify(m));
          messageBridge.onReceive(m);
        }
      };
      (window as any).MessageReceiver = mr;
      return true;
    },
    (packet) => {
      Logger.info("OnPostMessage VideoServer: " + JSON.stringify(packet));
      if (!(window as any).ReactNativeWebView) return false;
      (window as any).ReactNativeWebView.postMessage(JSON.stringify(packet));
      return true;
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    async (message) => {
      Logger.info("OnMessage VideoServer: " + JSON.stringify(message));
      return 7;
    }
  );

  public formatTime(time: number, options?: { minutes?: boolean; seconds?: boolean; hundredth?: boolean }) {
    if (time < 0) time = 0;
    if (!options) options = { minutes: true, seconds: true };
    let str = "";
    if (options.minutes)
      str =
        (str ? str + ":" : str) +
        Math.floor(time / 60)
          .toString()
          .padStart(2, "0");
    if (options.seconds) str = (str ? str + ":" : str) + (Math.floor(time) % 60).toString().padStart(2, "0");
    if (options.hundredth)
      str =
        (str ? str + LanguagesBase.timeMillisecSymbol : str) +
        Math.round((time * 100) % 100)
          .toString()
          .padStart(2, "0"); // Math.round to avoid overflow errors
    return str;
  }

  public formatOdds(oddsNumber: number, comma = 1) {
    return Util.formatValue(oddsNumber, comma, LanguagesBase.commaSymbol);
  }

  public formatOddsC4(oddsNumber: number) {
    return Util.formatValue(oddsNumber, 1, ".");
  }

  public formatNumber(value: number, commaCount: number) {
    return Util.formatValue(value, commaCount, LanguagesBase.commaSymbol);
  }

  public formatRound(round: number) {
    if (this.gameInfo?.videoLanguage === "it" && !this.gameInfo?.oddsAlwaysOn) {
      return round.toString();
    } else {
      return round.toString(10).padStart(4, "0");
    }
  }

  public fillIntroTexture(tex: PIXI.Texture | undefined) {
    Logic.videoScreen.fillIntroTexture(tex);
  }

  public fillRaceTexture(tex: PIXI.Texture | undefined) {
    Logic.videoScreen.fillRaceTexture(tex);
  }

  public async loadTexture(url: string, cached: boolean): Promise<PIXI.Texture> {
    const ret = LocalCache.get(url);
    if (ret) url = ret;

    return await this.loadTextureInternal(url, cached, settings.crossOrigin);
  }

  private async loadTextureInternal(url: string, cached: boolean, crossOrigin?: string): Promise<PIXI.Texture> {
    if (!cached) {
      return await Logic.loadTexture(url, { crossOrigin });
    }

    if (!PIXI.utils.BaseTextureCache[url]) {
      const tex = await Logic.loadTexture(url, { crossOrigin });
      PIXI.utils.BaseTextureCache[url] = tex.baseTexture;
    }
    return new PIXI.Texture(PIXI.utils.BaseTextureCache[url]);
  }

  public async sendMessage(message: MessageType) {
    const ret = await this.messageBridge.send(message);
    Logger.info("SendMessage Ret: " + ret);
    return ret;
  }

  public isInApp() {
    if ((window as any).isRNWebView) return true;
    return false;
  }

  public getServerUrl() {
    if (this.isInApp()) return "https://api.virtuales.bet";
    else return "";
  }

  private getPerformanceLetter(performanceSetting: PerformanceSetting) {
    switch (performanceSetting) {
      case "high":
        return "h";
      case "medium":
        return "m";
      case "low":
        return "l";
    }
    throw new Error("Invalid performance setting!");
  }

  public getBasePath() {
    if (settings.sdCardPath) return settings.sdCardPath;
    return "/.local/";
  }

  public fixPath<T extends string | undefined>(inputPath: T) {
    if (inputPath !== undefined && inputPath.startsWith("/sdcard/")) return inputPath.replace("/scarf/", this.getBasePath());
    return inputPath;
  }

  public fixVideoUrlsPath(videoUrls: IVideoUrls) {
    return {
      video: this.fixPath(videoUrls.video),
      image: this.fixPath(videoUrls.image),
      sound: this.fixPath(videoUrls.sound)
    };
  }

  public getVideoUrls(
    names: string[],
    lengthAgnosticVideos: boolean,
    gameType: GameType,
    gameSkin: SkinType,
    gameLength: GameLength,
    performance: PerformanceSetting,
    bonus: boolean,
    showText: boolean,
    languageId: string | undefined
  ): IVideoUrls[] {
    return names.map((name) => this.getVideoUrl(name, lengthAgnosticVideos, gameType, gameSkin, gameLength, performance, bonus, showText, languageId));
  }

  protected getBaseUrl(gameType: GameType, gameSkin: SkinType) {
    let folderName;
    const basePath = this.getBasePath();
    const bp = basePath.endsWith("/") ? basePath : basePath + "/";
    if (gameType === "sulky") folderName = "sulky7";
    else if (gameType === "box") folderName = "wpg";
    else if (gameType === "horse" && gameSkin === SkinTypeDefinition.CLASSIC) folderName = "horse_c4";
    else if (gameType === "dog6" && gameSkin === SkinTypeDefinition.CLASSIC) folderName = "dog6_c4";
    else if (gameType === "roulette" && gameSkin === SkinTypeDefinition.CLASSIC) folderName = "roulette_c4";
    else folderName = gameType;

    const gi = gameType ? folderName + "/" : "";
    return bp + gi;
  }

  public getVideoUrl(
    name: string,
    lengthAgnosticVideos: boolean,
    gameType: GameType,
    gameSkin: SkinType,
    gameLength: GameLength,
    performance: PerformanceSetting,
    bonus: boolean,
    showText: boolean,
    languageId: string | undefined,
    oddsAlwaysOn = false
  ): IVideoUrls {
    const token = "ZMQF9G3MSX3UQZWC";
    const mins = (gameLength / 60).toFixed(0);

    const baseName = this.getBaseUrl(gameType, gameSkin) + name;
    let video = baseName;
    let image = baseName;
    let sound = baseName;

    if (name === "intro") {
      video = this.addParam(video, mins);
      image = this.addParam(image, mins);

      if (oddsAlwaysOn) {
        video = this.addParam(video, "oao");
        image = this.addParam(image, "oao");
      }

      if (bonus) {
        video = this.addParam(video, "bonus");
        image = this.addParam(image, "bonus");
      }

      if (languageId && languageId !== "default") {
        video = this.addParam(video, languageId);
        image = this.addParam(image, languageId);
      }
    }

    if (settings.raw) {
      video = this.addParam(video, "raw");
    }

    if (!lengthAgnosticVideos && showText) {
      video = this.addParam(video, "text");
      image = this.addParam(image, "text");
    }

    if (!lengthAgnosticVideos) {
      video = this.addParam(video, this.getPerformanceLetter(performance));
      image = this.addParam(image, this.getPerformanceLetter(performance));
    }

    // !temp, framerate only on sulky videos
    if (gameType === "sulky" || oddsAlwaysOn) {
      video = video + this.frameRate;
      image = image + this.frameRate;
    }

    video = video + ".mp4?token=" + token;
    image = image + ".jpg?token=" + token;

    if (gameType === "box") {
      if (name === "intro") {
        // TODO: REMOVE
        if (settings.showText) video = "/.local/wpg/intro_5_text_h.mp4";
        else video = "/.local/wpg/WGP19FG_Fight1_Intro_without_transition.mp4";
      } else {
        video = "/.local/wpg/" + name + ".mp4";
        image = "/.local/wpg/" + name + ".jpg";
      }
    }

    // TODO: CORRECT Image here!
    //image = (lengthAgnosticVideos ? image.replace(name, "white") : image) + ".jpg?token=" + token;
    sound = sound + ".mp3?token=" + token;

    return {
      video,
      image,
      sound
    };
  }

  private addParam(name: string, param: string) {
    return name + "_" + param;
  }

  public getVideoUrlsWithLink(videoname: IGameRoundResultVideo): IVideoUrls {
    const urls = {
      video: videoname.mp4,
      image: videoname.jpg
    };
    return this.fixVideoUrlsPath(urls);
  }

  public initGame(gameInfo: IGameInfo) {
    this.gameInfo = gameInfo;

    // create sound times array out of set string
    const soundTimesTokens = this.gameInfo.music.speakerTime.split(";");
    this.gameInfo.speakerTimesArray = [];
    for (const soundTok of soundTimesTokens) {
      this.gameInfo.speakerTimesArray.push(parseInt(soundTok, 10));
    }

    Logic.initVideoScreen(gameInfo);
  }

  public setLanguageId(languageId: string) {
    Logic.setLanguageId(languageId);
  }

  public getGameInfo(): IGameInfo {
    return this.gameInfo;
  }
}
