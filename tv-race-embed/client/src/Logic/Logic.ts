import { configure, makeObservable, observable } from "mobx";
import * as PIXI from "pixi.js";
import { ErrorHelper } from "./ErrorHelper";
import { Logger } from "./Logger";
import { IAnimInterval, IGameInfo, ILogicImplementation, IRoundInfo, VideoState } from "./LogicDefinitions";
import { ITextStyleSet } from "../VideoScreen/common/MultiStyleText";
import { Engine } from "client/Graphics/Engine";
import { Errors } from "client/LogicImplementation/ErrorHandler";
import { HardcodedItalianOddsDigits } from "client/LogicImplementation/HardcodedOddsDigits";
import { RtcLogic } from "client/Rtc/RtcLogic";
import { SockServLogMessage } from "client/ServerWebSocket/base/ServerSocketLogicBase";
import { ServerSocketLogic } from "client/ServerWebSocket/ServerSocketLogic";
import { downloadObject } from "client/Ui/UpdateOverlay";
import { LocalCache } from "client/Update/LocalCache";
import { AnimHelper } from "client/VideoScreen/common/Anim";
import { MultiStyleText } from "client/VideoScreen/common/MultiStyleText";
import { VideoScreenDog } from "client/VideoScreen/dog/VideoScreenDog";
import { VideoScreenDog63 } from "client/VideoScreen/dog63/VideoScreenDog63";
import { VideoScreenHorse } from "client/VideoScreen/horse/VideoScreenHorse";
import { VideoScreenHorseC4 } from "client/VideoScreen/horseDog6C4/VideoScreenHorseDog6C4";
import { VideoScreenKart } from "client/VideoScreen/kart/VideoScreenKart";
import { KickboxHelper } from "client/VideoScreen/kickbox/KickboxHelper";
import { VideoScreenKickBox } from "client/VideoScreen/kickbox/VideoScreenKickBox";
import { VideoScreenRouletteC4 } from "client/VideoScreen/rouletteC4/VideoScreenRouletteC4";
import { VideoRef } from "client/VideoScreen/VideoRef";
import { DeviceTypes, EventType, GameLength, GameType, PerformanceSetting, SkinType, SkinTypeDefinition } from "common/Definitions";
import { FadeDurations } from "common/FadeDurations";
import { Util } from "common/Util";

const initialWidth = 1920;
const initialHeight = 1080;

configure({
  enforceActions: "never"
});

interface ILowestHighest {
  lowest: number;
  highest: number;
}

interface IMinMax {
  firstOnly: ILowestHighest;
  firstSecond: ILowestHighest;
}

interface ISettings {
  debug: boolean;
  viewport: { width: number; height: number };
  screen: { width: number; height: number };
  showUI: boolean;
  scaleFactor: number;
  colors: { debugRed: number };
  devUser?: string;
  forceDummyLogic?: boolean;
  forceGameType?: GameType;
  forceGameSkin?: SkinType;
  forceGameLength?: GameLength;
  forcePerformance?: PerformanceSetting;
  forceUseOverlays?: boolean;
  //forceSpecificIntro?: string | undefined;
  forceReloadContent?: boolean;
  startImmediately?: boolean;
  stopAfterSeek?: boolean;
  crossOrigin?: "" | "anonymous" | "use-credentials" | undefined;
  videoStartTime: number;
  syncStartTimeParameter: boolean;
  showText: boolean;
  showBonus: boolean;
  sdCardPath?: string;
  showDebugTextColor?: boolean;
  languageId: string | undefined;
  forceLanguage: string | undefined;
  useCache: boolean;
  deviceId: string;
  playbackSpeed: number;
  deviceType: DeviceTypes;
  urlParamEventType?: EventType;
  screenId?: string;
  isTerminalVideoscreen: boolean;
  isTerminalInGameVideoscreen: boolean;
  raw?: boolean;
  streamScreen: boolean;
  /**
   * raceOnly — when true, the bundle skips the intro phase (matrix of
   * odds, runner stats, history panel, runner presentation) and renders
   * ONLY the race phase overlays (raceBar, raceIntervals, winnerDogs,
   * bonusInfoBar). Used by virtuales-online/web-lobby to embed this
   * bundle in the LiveMonitor as a "TV-box-like" viewer that shows just
   * the race playback, leaving the betting UI to the lobby itself.
   *
   * Activated via URL param `?raceOnly=true`.
   * See VideoScreenDog.ts for the guarded `this.add()` calls.
   */
  raceOnly?: boolean;
}

export const settings: ISettings = {
  debug: false,
  screen: {
    width: initialWidth,
    height: initialHeight
  },
  viewport: {
    width: initialWidth,
    height: initialHeight
  },
  showUI: false,
  scaleFactor: 1,
  colors: {
    debugRed: 0xffd6301d
  },
  crossOrigin: "",
  syncStartTimeParameter: false,
  videoStartTime: 0,
  showText: false,
  showBonus: true,
  languageId: undefined,
  forceLanguage: undefined,
  useCache: false,
  deviceId: "",
  playbackSpeed: 1,
  deviceType: DeviceTypes.Androidtv2,
  urlParamEventType: "dog",
  screenId: "0",
  isTerminalVideoscreen: false,
  isTerminalInGameVideoscreen: false,
  raw: false,
  streamScreen: false
};

export function _s(val: number): number;
export function _s(val: number[]): number[];
export function _s(val: number | number[]): number | number[] {
  if (Util.isArray(val)) return val.map((v) => v * settings.scaleFactor);
  else return val * settings.scaleFactor;
}

export function __t(textId: string): string {
  // Logger.debug("GetId: " + textId);
  return Logic.implementation.getText(textId);
}

export const _t = Util.memoize(__t, () => ({ lang: Logic.languageId }));

export class Logic {
  public static videoRef: VideoRef;
  public static videoScreen: VideoScreenKart | VideoScreenDog | VideoScreenKickBox | VideoScreenDog63 | VideoScreenHorse | VideoScreenHorseC4 | VideoScreenRouletteC4;
  public static implementation: ILogicImplementation;
  public static timeForFadeTarget = VideoState.None;
  public static timeForPlayTarget = VideoState.None;
  public static currentPlayGameId = 0;
  public static isStarted = false;
  public static gameInfo: IGameInfo | undefined;
  public static languageId: string = "default";
  public static introMusic: HTMLAudioElement | undefined;
  public static fadeX: number = 0;
  public static pauseOverlayRequested: "intro" | "race" | "immediately" | false = false;
  public static isMacAddressDevice: boolean = false;
  public static lastActionTime: number | null = null;

  public static wasActionTriggered(): boolean {
    if (!this.lastActionTime) return false;
    const now = this.getVideoTime();
    if (now < this.lastActionTime) return false;
    return now - this.lastActionTime <= 0.1; // Innerhalb von 1 Sekunde
  }

  public static isInIntro(): boolean {
    return this.getVideoTime() <= this.getIntroLength() + 0.001;
  }

  public static isInitialized(): boolean {
    return this.videoRef !== undefined;
  }

  public static async init(videoRef1: HTMLVideoElement, videoRef2: HTMLVideoElement, implementation: ILogicImplementation): Promise<void | undefined> {
    if (settings.forceReloadContent) {
      Logger.info("!!! Delete local cache !!!");
      await LocalCache.delete();
    }

    this.implementation = implementation;
    this.videoRef = new VideoRef(videoRef1, videoRef2, (from, to) => Logic.onSwitchVideoSlot(from, to));
    makeObservable(this, { videoRef: observable });
    const gameInfo = await Logger.guardAsync("Logic.init", async () => {
      return await this.implementation.onInit();
    });

    await this.videoScreen.init();

    return gameInfo;
  }

  public static showPauseOverlay(
    flag: "intro" | "race" | "immediately" | false,
    options?: {
      pauseEndTimeText?: string;
      bottomText?: string;
      nextRaceTime?: Date;
      nextRound?: IRoundInfo;
      canceledRace?: boolean;
    }
  ): void {
    //TODO TEST
    // const logMessage = new SockServLogMessage(Errors.SPRITE_NOT_SET_ERROR.code, "Show race breake, flag: " + flag + " stack:" + Util.getStackTrace());
    // ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
    //   Logger.error("Send log Error:" + JSON.stringify(error));
    // });

    if (flag) {
      if (options?.pauseEndTimeText) this.videoScreen.pauseOverlay.setTimeText(options.pauseEndTimeText);
      if (options?.bottomText) this.videoScreen.pauseOverlay.setBottomText(options.bottomText);
      this.videoScreen.pauseOverlay.setNextRaceTime(options?.nextRaceTime);
      this.videoScreen.pauseOverlay.setNextRound(options?.nextRound);
      this.videoScreen.pauseOverlay.raceCanceled = options?.canceledRace === true;
      this.pauseOverlayRequested = flag;
      if (!this.videoScreen.pauseOverlay.visible) {
        if (!this.isStarted || this.pauseOverlayRequested === "immediately") {
          this.fadeTo(VideoState.Paused);
          this.videoRef.stop();
        }
      }
    } else {
      if (this.pauseOverlayRequested) {
        this.fadeTo(VideoState.Intro);
      }
      this.pauseOverlayRequested = false;
    }
  }

  public static isPausOverlayVisible(): boolean {
    return this.videoScreen.pauseOverlay.visible;
  }

  public static isDog(gameType: GameType, gameSkin: SkinType): boolean {
    switch (gameType) {
      case "dog6":
      case "dog8":
        if (gameSkin === SkinTypeDefinition.MODERN || gameSkin === SkinTypeDefinition.MODERN_ODDS_ALWAYS_ON) {
          return true;
        }
    }
    return false;
  }

  public static isKart(gameType: GameType): boolean {
    switch (gameType) {
      case "kart5":
        return true;
    }
    return false;
  }

  public static isKickBox(gameType: GameType): boolean {
    if (gameType === "box") return true;
    return false;
  }

  public static isDog63(gameType: GameType): boolean {
    if (gameType === "dog63") return true;
    return false;
  }

  public static isHorse(gameType: GameType, gameSkin: SkinType): boolean {
    if (gameType === "horse" && (gameSkin === SkinTypeDefinition.MODERN || gameSkin === SkinTypeDefinition.MODERN_ODDS_ALWAYS_ON)) return true;
    return false;
  }

  public static isHorseC4(gameType: GameType, gameSkin: SkinType): boolean {
    if (gameType === "horse" && gameSkin === SkinTypeDefinition.CLASSIC) return true;
    return false;
  }

  public static isDog6C4(gameType: GameType, gameSkin: SkinType): boolean {
    if (gameType === "dog6" && gameSkin === SkinTypeDefinition.CLASSIC) return true;
    return false;
  }

  public static isRouletteC4(gameType: GameType, gameSkin: SkinType): boolean {
    if (gameType === "roulette" && gameSkin === SkinTypeDefinition.CLASSIC) return true;
    return false;
  }

  public static isSulky(gameType: GameType): boolean {
    if (gameType === "sulky") return true;
    return false;
  }

  public static getRacerCount(gameType: GameType): 6 | 8 | 7 | 5 | -1 | 2 {
    switch (gameType) {
      case "dog6":
        return 6;
      case "dog63":
        return 6;
      case "dog8":
        return 8;
      case "horse":
        return 7;
      case "sulky":
        return 7;
      case "kart5":
        return 5;
      case "box":
        return 2;
      case "roulette":
        return -1;
      default:
        Logger.error("Invalid gameType", gameType);
        return -1;
    }
  }

  private static createVideoScreen(gameInfo: IGameInfo) {
    if (this.isKart(gameInfo.gameType)) return new VideoScreenKart(gameInfo);
    else if (this.isDog(gameInfo.gameType, gameInfo.gameSkin)) return new VideoScreenDog(gameInfo);
    else if (this.isKickBox(gameInfo.gameType)) return new VideoScreenKickBox(gameInfo);
    else if (this.isDog63(gameInfo.gameType)) return new VideoScreenDog63(gameInfo);
    else if (this.isHorse(gameInfo.gameType, gameInfo.gameSkin)) return new VideoScreenHorse(gameInfo);
    else if (this.isHorseC4(gameInfo.gameType, gameInfo.gameSkin)) return new VideoScreenHorseC4(gameInfo);
    else if (this.isRouletteC4(gameInfo.gameType, gameInfo.gameSkin)) return new VideoScreenRouletteC4(gameInfo);
    else if (this.isSulky(gameInfo.gameType)) return new VideoScreenHorse(gameInfo);
    else if (this.isDog6C4(gameInfo.gameType, gameInfo.gameSkin)) return new VideoScreenHorseC4(gameInfo);
    return undefined;
  }

  public static initVideoScreen(gameInfo: IGameInfo): void {
    if (this.videoScreen) throw new Error("VideoScreen already created!");
    this.gameInfo = gameInfo;
    const vs = this.createVideoScreen(gameInfo);
    if (vs) {
      this.videoScreen = vs;
      this.videoScreen.width = settings.screen.width;
      this.videoScreen.height = settings.screen.height;
      Engine.instance.add(this.videoScreen);
    } else {
      throw new Error("Failed to initialize video screen!");
    }
  }

  public static getGameInfo(): IGameInfo | undefined {
    return this.gameInfo;
  }

  public static onSwitchVideoSlot(from: number, to: number): void {
    if (this.videoScreen && this.videoScreen.videoSprite && this.videoScreen.videoSprite2) {
      if (to === 1) {
        this.videoScreen.videoSprite.alpha = 0; //.height = 0;
        this.videoScreen.videoSprite2.alpha = 1; //height = this.videoScreen.height;
      } else {
        this.videoScreen.videoSprite2.alpha = 0;
        this.videoScreen.videoSprite.alpha = 1; //this.videoScreen.height;
      }

      // if (to === 1){
      //   this.videoScreen.videoSprite.texture = Texture.from(Logic.videoRef.getInternalRef2()!); // , { crossOrigin: "" }); TODO: not supported anymore?
      // }
      // else
      //   this.videoScreen.videoSprite.texture = Texture.from(Logic.videoRef.getInternalRef()!); // , { crossOrigin: "" }); TODO: not supported anymore?
    }
  }

  public static updateVideoSpriteSize(): void {
    const videoScreen = this.videoScreen;
    {
      const videoSprite = videoScreen.videoSprite;
      if (videoSprite) {
        // && this.activeVideo === 0) {
        if (videoSprite.width !== videoScreen.width || videoSprite.height !== videoScreen.height) {
          // console.log("UpdateVideoSpriteSize: " + videoScreen.width + " " + videoScreen.height);
          videoSprite.width = videoScreen.width;
          videoSprite.height = videoScreen.height;
          videoSprite.texture.updateUvs();
        }
      }
    }
    {
      const videoSprite2 = videoScreen.videoSprite2;
      if (videoSprite2) {
        // && this.activeVideo === 1) {
        if (videoSprite2.width !== videoScreen.width || videoSprite2.height !== videoScreen.height) {
          // console.log("UpdateVideoSpriteSize: " + videoScreen.width + " " + videoScreen.height);
          videoSprite2.width = videoScreen.width;
          videoSprite2.height = videoScreen.height;
          videoSprite2.texture.updateUvs();
        }
      }
    }
  }

  public static startVideoScreen(): void {
    Logger.guardAsync("Logic.onStarted", () => this.implementation.onStarted()).then(() => {
      this.isStarted = true;

      if (this.videoScreen.videoSprite) {
        this.videoScreen.videoSprite.texture = PIXI.Texture.from(Logic.videoRef.getInternalRef()!); // , { crossOrigin: "" }); TODO: not supported anymore?
        this.updateVideoSpriteSize();
        // this.videoScreen.videoSprite.alpha = 0.5;
      }
      if (this.videoScreen.videoSprite2) {
        this.videoScreen.videoSprite2.texture = PIXI.Texture.from(Logic.videoRef.getInternalRef2()!); // , { crossOrigin: "" }); TODO: not supported anymore?
        this.updateVideoSpriteSize();
        // this.videoScreen.videoSprite.alpha = 0.5;
      }

      if (RtcLogic.instance.isProducer()) Logic.publish();
    });
  }

  public static exit(): void {
    if (this.implementation) {
      this.implementation.onExit();
      (this.implementation as any) = undefined;
    }
    if (this.videoRef) {
      this.videoRef.exit();
      (this.videoRef as any) = undefined;
    }

    if (this.videoScreen) {
      Engine.instance.remove(this.videoScreen);
      (this.videoScreen as any) = undefined;
    }
  }

  public static update(dt: number): void {
    if (this.implementation && this.isStarted && this.implementation.isRegistered()) {
      try {
        this.implementation.onUpdate(dt);
        Logic.updateVideoSpriteSize();
      } catch (e) {
        Logger.error("Logic.update failed: ", e);
      }
    }
  }

  public static getRaceVideoTime(): number {
    return this.getVideoTime() - this.getIntroLength();
  }

  public static getInGameRaceTime(gameType: GameType): number {
    switch (gameType) {
      case "kart5":
        return this.getRaceVideoTime() - 2.45;
      case "dog6":
        return this.getRaceVideoTime() - 1.0;
      case "dog8":
        return this.getRaceVideoTime() - 1.0;
      case "box":
        return this.getRaceVideoTime() - 1.0;
      case "horse":
        return this.getRaceVideoTime() - 1.0;
      case "sulky":
        return this.getRaceVideoTime() - 1.0;
      case "roulette":
        return this.getRaceVideoTime() - 1.0;
    }
    return this.getRaceVideoTime();
  }

  public static getVideoTime(): number {
    const gameType = this.implementation.getGameInfo().gameType;
    const gameLength = this.implementation.getGameInfo().gameLength;
    if (!settings.forceDummyLogic && this.gameInfo?.useOverlays && gameLength !== 60) {
      const countdown = this.getExactTimeUntilRace(this.implementation.getRaceStartTime()) + FadeDurations.fadeDuration + this.showZeroTime(gameType);
      const intro = this.getIntroLength();
      const race = this.getRaceLength();
      if (this.getState() === VideoState.Intro) {
        const offset = intro - countdown;
        const time = offset <= 0 ? offset + intro + race : offset;
        return time >= 0 ? time : intro;
      }
    }
    return this.videoRef.getTime();
  }

  public static get isFading(): boolean {
    return this.videoScreen.fadeVideo.isFading;
  }

  public static get fadeTime(): number {
    return this.videoScreen.fadeVideo.currentTime;
  }

  public static get fadeTarget(): VideoState {
    return this.videoScreen.fadeVideo.targetState;
  }

  public static startPlayingWithTime(time: number): void {
    const t = time; // time + 20;
    console.log("StartPlayingWithTime: " + t);
    Logic.videoRef.setTime(t, true); // check if we can get rid of it
    this.lastActionTime = this.getVideoTime(); // Update Anims
  }

  public static setVideoTime(time: number): void {
    // check if we can get rid of it
    console.log("setVideoTime: " + time);
    this.timeForFadeTarget = VideoState.None;
    this.timeForPlayTarget = VideoState.None;
    this.videoRef.setTime(time, false);
    this.lastActionTime = this.getVideoTime(); // Update Anims
  }

  public static setStateTime(time: number): void {
    // check if we can get rid of it
    console.log("setStateTime: " + time);
    this.videoRef.setStateTime(time);
    this.lastActionTime = this.getVideoTime(); // Update Anims
  }

  public static getProducerTools(): {
    getObservableTime: () => number;
    setVideoTime: (time: number) => void;
    setStopAfterSeek: () => void;
    triggerFade: () => void;
    looseContext: () => void;
  } {
    // for Producer Tools only
    return {
      getObservableTime: () => this.videoRef.observableTime,
      setVideoTime: (time: number) => {
        console.log("DevTools - setVideoTime");
        this.timeForFadeTarget = VideoState.None;
        this.timeForPlayTarget = VideoState.None;
        this.videoRef.setTime(time, false);
        this.lastActionTime = this.getVideoTime(); // Update Anims
        console.log("lastActionTime " + this.lastActionTime);
      },
      setStopAfterSeek: () => {
        if (this.videoRef) {
          this.videoRef.stopAfterSeek = true;
        }
      },
      triggerFade: () => {
        if (this.videoRef) {
          if (this.videoRef.getState() === VideoState.Intro) {
            this.videoRef.fadeTo(VideoState.Race);
          } else if (this.videoRef.getState() === VideoState.Race) {
            this.videoRef.fadeTo(VideoState.Intro);
          }
        }
      },
      looseContext: () => {
        if (this.videoRef) {
          const canvas = Engine.instance.getPixiApp().renderer.view; // as WebGLRenderer;// as Renderer;// as WebGlRenderer;
          //renderer.forceContextLoss();
          //const canvas = Engine.instance.view;
          const gl = canvas.getContext("webgl2");
          if (gl) {
            const looseContextExtension = gl.getExtension("WEBGL_lose_context");
            if (looseContextExtension) {
              console.warn("Simulating Context lost");
              looseContextExtension.loseContext();
            }
          }
        }
      }
    };
  }

  public static isVideoPlaying(): boolean {
    return this.videoRef && this.videoRef.isPlaying();
  }

  public static async toggleVideoPlay(): Promise<void> {
    try {
      if (this.videoRef) {
        if (this.isVideoPlaying()) this.videoRef.stop();
        else await this.videoRef.play();
      }
    } catch (e) {
      console.log("toggleVideoPlay failed ", e);
    }
  }

  public static showZeroTime(gameType: GameType) {
    switch (gameType) {
      case "kart5":
        return 1.6;
      case "horse":
        return 0.5;
      case "roulette":
        return 0.5;
      case "dog63":
        return 0.5;
      case "dog6":
        return 0.5;
      case "dog8":
        return 0.7;
      case "box":
        return 1.2;
      case "sulky":
        return 0.5;
    }
    return 1.0;
  }
  public static getTimeUntilRaceForTimeBar(): number {
    // must not be changed without changing GAME_VIDEO_START_MS !!!!!!!!!!!!!!!!!!!!
    const showZeroTime = 1.0; // looks nicer - if shown for a certain amount
    return this.getIntroLength() - FadeDurations.fadeDuration - showZeroTime;

    // return this.getIntroLength() - VIDEO_FADE_DURATION - this.showZeroTime(Logic.getGameInfo()!.gameType || "dog6");
  }

  public static getExactTimeUntilRace(raceStart: number): number {
    const now = new Date();
    const start = new Date(raceStart);

    return (start.getTime() - now.getTime()) / 1000; // Differenz in Sekunden
  }

  public static fadeToRace() {
    if (this.videoRef && this.videoRef.getState() === VideoState.Intro) {
      //Logic.startPlayingWithState(VideoState.Race, 0.0);
      //this.videoRef.fadeTo(VideoState.Race);
      this.onTimeForFade(VideoState.Race);
      //this.videoRef.fadeTo(VideoState.Race);
      //this.onTimeForPlay(VideoState.Race);
    }
  }

  public static getIntroLength(): number {
    const gameInfo = this.gameInfo;
    const gameType = gameInfo ? gameInfo.gameType : "kart5";
    const language = gameInfo ? gameInfo.videoLanguage : "default";
    let gameLength = gameInfo ? gameInfo.gameLength : 240;
    const skinType = gameInfo ? gameInfo.gameSkin : SkinTypeDefinition.MODERN;
    const oddsAlwaysOn = skinType === SkinTypeDefinition.MODERN_ODDS_ALWAYS_ON;
    const langIt = language === "it";

    if (Logic.implementation.getIsMultipleGameLengthes()) {
      // length of last round must be taken
      // until start of next intro
      // because Gameloop Round switch (and game Length update) ist done before last intro has ended
      gameLength = gameInfo ? gameInfo.currentIntroGameLength : 240;
    }

    if (gameLength === 60 && gameType !== "roulette") {
      return 0;
    }

    switch (gameType) {
      case "kart5":
        if (gameLength === 300) return 187.04;
        return gameLength - 68 + 0.053333;
      case "dog6":
        if (skinType === SkinTypeDefinition.CLASSIC) {
          return gameLength - 45;
        } else if (SkinTypeDefinition.MODERN_ODDS_ALWAYS_ON) {
          if (gameLength === 300) return 195.05333;
          if (gameLength === 120) return 60.02;
          return gameLength - 60.32;
        } else {
          if (gameLength === 300) return 195.05333;
          return gameLength - 60 + 0.053333;
        }
      case "dog63":
        if (langIt && oddsAlwaysOn && gameLength === 360) return 300.02;
        if (langIt && oddsAlwaysOn && gameLength === 240) return 180.02;
        if (langIt && oddsAlwaysOn) return 195.02;
        if (gameLength === 300) return 240.0427;
        return gameLength - 60 + 0.053333;
      case "dog8":
        if (gameLength === 300) return 195.370667;
        if (gameLength === 240) return 180.32;
        return gameLength - 60 + 0.053333;
      case "horse":
        if (skinType === SkinTypeDefinition.CLASSIC) {
          return gameLength - 43;
        } else {
          if (gameLength === 320 || gameLength === 360) {
            return 180.288;
          } else {
            return gameLength - 60 + 0.309333;
          }
        }
      case "roulette":
        if (skinType === SkinTypeDefinition.CLASSIC) {
          if (gameLength === 240) {
            return 204.0;
          } else if (gameLength === 120) {
            return 84.033333;
          } else if (gameLength === 60) {
            return 24.033333;
          } else {
            return 204.0;
          }
        }

      case "sulky":
        if (gameLength === 384 || gameLength === 432) return 180.28;
        return gameLength - 60 + 0.309333;
      case "box":
        return 249.661333;
      default:
        throw new Error("GameType not supported so far: " + gameType);
    }
  }

  public static getRaceLength(): number /*: 114.090667 | 69.077333 | 105.053333 | 60.053333*/ {
    // TODO: add kickboxLength?
    const gameInfo = this.gameInfo;
    const gameType = gameInfo ? gameInfo.gameType : "kart5";
    const language = gameInfo ? gameInfo?.videoLanguage : "default";
    const gameLength = gameInfo ? gameInfo.gameLength : 240;
    const gameSkin = gameInfo ? gameInfo.gameSkin : SkinTypeDefinition.MODERN;
    const oddsAlwaysOn = gameSkin === SkinTypeDefinition.MODERN_ODDS_ALWAYS_ON;
    const langIt = language === "it";

    switch (gameType) {
      case "kart5":
        return gameLength === 300 ? 114.090667 : 69.077333; // ??
      case "dog6":
        if (gameSkin === SkinTypeDefinition.CLASSIC) {
          return 45;
        } else {
          return gameLength === 300 ? 105.053333 : 60.053333;
        }
      case "dog63":
        if ((langIt && oddsAlwaysOn && gameLength === 240) || (langIt && oddsAlwaysOn && gameLength === 360)) return 60.02;
        if (langIt && oddsAlwaysOn) return 105;
        return 60.053333;
      case "dog8":
        return gameLength === 300 ? 105.053333 : 60.053333;
      case "horse":
        if (language === "it") {
          return 180.01;
        }
        if (gameSkin === SkinTypeDefinition.CLASSIC) {
          return 40;
        } else {
          return 140.074667;
        }

        return 140.074667;
      case "sulky":
        if (language === "it") {
          return 252.01;
        } else {
          return 203.72;
        }
      case "roulette":
        return 22.24;
      case "box":
        return KickboxHelper.fightRoundLength * 3 + KickboxHelper.fightRoundResultLength * 3 + 0.49 + KickboxHelper.fightResultLength;
      default:
        throw new Error("GameType not supported so far: " + gameType);
    }
  }

  public static getRaceEndTime(): number {
    return this.videoRef ? this.videoRef.getRaceEndTime() : 0;
  }

  public static getIntroEndTime(): number {
    return this.videoRef ? this.videoRef.getIntroEndTime() : 0;
  }

  public static getOddsForDriver(odds: number[], first: number, second: number, racerCount: number): number {
    // driver * driver
    return odds[first * racerCount + second];
  }
  public static getOddsForDriverDigits(odds: number[], first: number, second: number, racerCount: number): number | null {
    if (this.gameInfo && this.gameInfo.videoLanguage === "it" && this.gameInfo.gameSkin === SkinTypeDefinition.MODERN_ODDS_ALWAYS_ON) {
      let afterDigitsOverwrite: number | null = null;

      if (this.gameInfo.gameType === "dog8") {
        if (first === second) {
          afterDigitsOverwrite = HardcodedItalianOddsDigits.dog8WinnerDigit;
        } else {
          afterDigitsOverwrite = HardcodedItalianOddsDigits.dog8ForcastDigit;
        }
        Logger.debug("Overwrite of Digits, gameType:" + this.gameInfo.gameType + " first:" + first + " second:" + second + " digits:" + afterDigitsOverwrite);
      }
      if (this.gameInfo.gameType === "kart5") {
        if (first === second) {
          afterDigitsOverwrite = HardcodedItalianOddsDigits.kartWinnerDigit;
        } else {
          afterDigitsOverwrite = HardcodedItalianOddsDigits.kartForcastDigit;
        }
        Logger.debug("Overwrite of Digits, gameType:" + this.gameInfo.gameType + " first:" + first + " second:" + second + " digits:" + afterDigitsOverwrite);
      }

      return afterDigitsOverwrite;
    }

    return null;
  }
  public static getWinnerDigitsOverwrite(): number | null {
    if (this.gameInfo && this.gameInfo.videoLanguage === "it" && this.gameInfo.gameSkin === SkinTypeDefinition.MODERN_ODDS_ALWAYS_ON) {
      let afterDigitsOverwrite: number | null = null;

      if (this.gameInfo.gameType === "dog8") {
        afterDigitsOverwrite = HardcodedItalianOddsDigits.dog8WinnerDigit;
        Logger.debug("Overwrite of Winner Digits, gameType:" + this.gameInfo.gameType + " digits:" + afterDigitsOverwrite);
      }
      if (this.gameInfo.gameType === "kart5") {
        afterDigitsOverwrite = HardcodedItalianOddsDigits.kartWinnerDigit;
        Logger.debug("Overwrite of Winner Digits, gameType:" + this.gameInfo.gameType + " digits:" + afterDigitsOverwrite);
      }

      return afterDigitsOverwrite;
    }

    return null;
  }
  public static getForcastDigitsOverwrite(): number | null {
    if (this.gameInfo && this.gameInfo.videoLanguage === "it" && this.gameInfo.gameSkin === SkinTypeDefinition.MODERN_ODDS_ALWAYS_ON) {
      let afterDigitsOverwrite: number | null = null;

      if (this.gameInfo.gameType === "dog8") {
        afterDigitsOverwrite = HardcodedItalianOddsDigits.dog8ForcastDigit;
        Logger.debug("Overwrite of Forcast Digits, gameType:" + this.gameInfo.gameType + " digits:" + afterDigitsOverwrite);
      }
      if (this.gameInfo.gameType === "kart5") {
        afterDigitsOverwrite = HardcodedItalianOddsDigits.kartForcastDigit;
        Logger.debug("Overwrite of Forcast Digits, gameType:" + this.gameInfo.gameType + " digits:" + afterDigitsOverwrite);
      }

      return afterDigitsOverwrite;
    }

    return null;
  }

  public static getDog63OddsForDriver(odds: number[], first: number, second: number, racerCount: number, oddsGridFirstTwoInOrder: boolean): number {
    const index = first * racerCount + second;
    const mapArrayFirstTwoInOrder = [0, 11, 16, 21, 26, 31, 6, 1, 17, 22, 27, 32, 7, 12, 2, 23, 28, 33, 8, 13, 18, 3, 29, 34, 9, 14, 19, 24, 4, 35, 10, 15, 20, 25, 30, 5];
    // const mapArrayFirstTwoNotInOrder = [0, 6, 7, 8, 9, 10, 11, 1, 12, 13, 14, 15, 16, 17, 2, 18, 19, 20, 21, 22, 23, 3, 24, 25, 26, 27, 28, 29, 4, 30, 31, 32, 33, 34, 35, 5]; tslint unused warning...
    const mappedValue = mapArrayFirstTwoInOrder[index];
    return odds[mappedValue];
  }

  public static calcOddsMinMax(
    odds: number[],
    racerCount: number
  ): {
    firstOnly: { lowest: number; highest: number };
    firstSecond: { lowest: number; highest: number };
  } {
    const firstOnly = { lowest: Number.MAX_VALUE, highest: Number.MIN_VALUE };
    const firstSecond = { lowest: Number.MAX_VALUE, highest: Number.MIN_VALUE };
    for (let iRow = 0; iRow < racerCount; iRow++) {
      for (let iCol = 0; iCol < racerCount; iCol++) {
        const o = Logic.getOddsForDriver(odds, iRow, iCol, racerCount);
        const minMax = iRow === iCol ? firstOnly : firstSecond;
        if (o < minMax.lowest) minMax.lowest = o;
        if (o > minMax.highest) minMax.highest = o;
      }
    }
    return { firstOnly, firstSecond };
  }

  public static getOddsColor(minMax: IMinMax, val: number, iRow: number, iCol: number): "green" | "red" | "white" {
    const lh = iRow === iCol ? minMax.firstOnly : minMax.firstSecond;
    if (lh.lowest === val) return "green";
    else if (lh.highest === val) return "red";
    return "white";
  }

  public static createPixiText(style?: PIXI.TextStyle, text?: string, noTrim?: boolean): PIXI.Text {
    if (settings.showDebugTextColor === true) {
      if (style !== undefined) style.fill = "orange";
      else {
        style = new PIXI.TextStyle({
          fill: "orange"
        });
      }
    }

    if (style !== undefined) {
      style.trim = noTrim ? false : true;
      style.padding = 10;
    } else {
      style = new PIXI.TextStyle({
        trim: true,
        padding: 10
      });
    }

    const pixiText = new PIXI.Text(text ? text : "", style);
    pixiText.roundPixels = true;

    return pixiText;
  }

  /**
   * Sets the fontsize and letterspacing to fit into the desired width
   * If the text is not vertically centered, place the anchor to .5 on the Y axis.
   * If thats not possible, set the pixi style "trim" to true
   * @param pixiText The Pixi Text Element
   * @param width The desired width
   * @param canInflucenceOthers if it can influence others (if other elements depend on its width)
   * @param removeMultiStyleTag remove multistyle tag
   * @returns void
   */
  public static autoSize(pixiText: PIXI.Text, width: number, canInflucenceOthers?: boolean, removeMultiStyleTag = false): void {
    if (!pixiText.style || pixiText.style.fontSize === undefined) return;

    const anyText = pixiText as any;
    if (anyText.originalFontSize === undefined) {
      anyText.originalFontSize = pixiText.style.fontSize;
      anyText.originalLetterSpacing = pixiText.style.letterSpacing;
      anyText.textStyleCloned = false;
    }
    let textString: string = anyText.fullText ? anyText.fullText : pixiText.text;

    if (removeMultiStyleTag) {
      textString = textString.replace("<b>", "").replace("</b>", "");
    }

    const ofs = anyText.originalFontSize;
    const ols = anyText.originalLetterSpacing;

    if (pixiText.style.fontSize !== ofs) pixiText.style.fontSize = ofs;
    if (pixiText.style.letterSpacing !== ols) pixiText.style.letterSpacing = ols;

    let tm = PIXI.TextMetrics.measureText(textString, pixiText.style, false);
    let index = 0;
    while (tm.width > width && index < 20) {
      if (!anyText.textStyleCloned && !canInflucenceOthers) {
        anyText.style = anyText.style.clone();
        anyText.textStyleCloned = true;
      }
      pixiText.style.fontSize = (ofs * (20 - index)) / 20;
      if (ols !== undefined) pixiText.style.letterSpacing = (ols * (20 - index)) / 20;
      // text.style = undefined;
      // text.style = text.style;
      tm = PIXI.TextMetrics.measureText(textString, pixiText.style, false);
      index++;
    }
  }

  public static autoSizeMultiStyleText(multiText: MultiStyleText, text: string | undefined, targetWidth: number, styles?: ITextStyleSet, removeMultiStyleTag = false): void {
    if (text) {
      if (styles) multiText.styles = styles;
      multiText.text = text;
      multiText.visible = true;
      if (styles) {
        // super hacky - resize the multitext according to the default font - working here because they have neary the same letterdistance
        // and the same fontsize
        // set the fontSize in the styleset
        Logic.autoSize(multiText, targetWidth, false, removeMultiStyleTag);
        styles.b.fontSize = multiText.style.fontSize;
        styles.default.fontSize = multiText.style.fontSize;
        multiText.styles = styles;
        multiText.text = text;
      }
    } else {
      multiText.visible = false;
    }
  }

  public static getFontSize(text: PIXI.Text): number {
    return text.style.fontSize as number;
  }

  public static async loadSVG(svgSrc: string, _options?: { width?: number; mipmap?: PIXI.MIPMAP_MODES }): Promise<PIXI.Texture> {
    const options = { width: undefined, ..._options };
    return new Promise((resolve, reject) => {
      const svgImage = new Image();
      svgImage.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = options.width === undefined ? svgImage.width : options.width;
        canvas.height = (svgImage.height * canvas.width) / svgImage.width;
        const context = canvas.getContext("2d");
        if (context) {
          /*context.fillStyle = "#f0f";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = "#00f";
          context.fillRect(50, 0, 50, canvas.height);*/
          context.drawImage(svgImage, 0, 0, svgImage.width, svgImage.height, 0, 0, canvas.width, canvas.height);
        }
        const baseTexture = new PIXI.BaseTexture(canvas, { mipmap: options.mipmap ? options.mipmap : PIXI.MIPMAP_MODES.POW2 }); // don't cache
        const texture = new PIXI.Texture(baseTexture);
        // const texture = PIXI.Texture.from(canvas);
        resolve(texture);
      };
      svgImage.onerror = (e) => {
        Logger.error("Couldn't load svg image!");
        reject(e);
      };
      svgImage.src = svgSrc;
    });
  }

  public static async loadTexture(url: string, options?: { crossOrigin?: string; mipmap?: true }): Promise<PIXI.Texture> {
    // const tex2 = PIXI.Texture.from(url);
    // return tex2;
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = url;
      if (options?.crossOrigin !== undefined) {
        image.crossOrigin = options?.crossOrigin;
      }
      image.onload = () => {
        // const texture = PIXI.Texture.from(image, { mipmap: options?.mipmap });
        const baseTexture = new PIXI.BaseTexture(image, {
          mipmap: options?.mipmap ? PIXI.MIPMAP_MODES.ON : PIXI.MIPMAP_MODES.OFF
        }); // don't cache
        // MS: logging to find the baseTexture/width not set
        if (!baseTexture) {
          console.error("BaseTexture for Url not set: " + url);

          const logMessage = new SockServLogMessage(Errors.SPRITE_NOT_SET_ERROR.code, "BaseTexture for Url not set: " + url);
          ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
            Logger.error("Send log Error:" + JSON.stringify(error));
          });
        } else if (baseTexture && baseTexture.width === 0) {
          console.error("BaseTexture set, but width is zero: " + url);
          const logMessage = new SockServLogMessage(Errors.SPRITE_NOT_SET_ERROR.code, "BaseTexture set, but width is zero: " + url);
          ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
            Logger.error("Send log Error:" + JSON.stringify(error));
          });
        }

        const texture = new PIXI.Texture(baseTexture);
        if (!texture) {
          console.log("Texture for Url not set: " + url);
          const logMessage = new SockServLogMessage(Errors.SPRITE_NOT_SET_ERROR.code, "Texture for Url not set: " + url);
          ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
            Logger.error("Send log Error:" + JSON.stringify(error));
          });
        } else if (texture && texture.width === 0) {
          console.error("Texture set, but width is zero: " + url);
          const logMessage = new SockServLogMessage(Errors.SPRITE_NOT_SET_ERROR.code, "Texture set, but width is zero: " + url);
          ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
            Logger.error("Send log Error:" + JSON.stringify(error));
          });
        }
        resolve(texture);
      };
      image.onerror = (e) => {
        console.log(e, options);
        ErrorHelper.showAssetNotFoundError(url, e);

        const lastReloadTime = parseInt(localStorage.getItem("last_stuck_reload") || "0", 10);
        const now = Date.now();
        const timeSinceLastReload = now - lastReloadTime;

        if (timeSinceLastReload > 15_000) {
          localStorage.setItem("last_stuck_reload", String(now));
          Logic.implementation.reloadWindow();
        } else {
          setTimeout(() => {
            const delayedNow = Date.now();
            localStorage.setItem("last_stuck_reload", String(delayedNow));
            Logic.implementation.reloadWindow();
          }, 60_000); // 60 Sekunden warten
        }

        reject(e);
      };
      /*const loader = new PIXI.Loader();
      loader.add(url, url, {loadType: PIXI.LoaderResource.TYPE.IMAGE});*/
      /*crossOrigin ? : boolean | string;
      loadType ? : number;
      xhrType ? : string;
      metadata ? : {
          loadElement?: HTMLImageElement | HTMLAudioElement | HTMLVideoElement;
          skipSource?: boolean;
          mimeType?: string | string[];
      };*/

      /*loader.load((l: PIXI.Loader, resources: any) => {
        const tex = resources[url].texture as PIXI.Texture;
        resolve(tex);
      });
      loader.onError.add((e: any) => {
        Logger.error("Error loading texture: ", e);
      });*/
    });
  }

  private static getAnimInternal<T extends IAnimInterval>(items: T[], time: number) {
    let last = items[0];
    for (const item of items) {
      if (time < item.startTime) return last;
      last = item;
    }
    return last;
  }
  /**
   * gets the right animation for the current time in the video
   * @param time current time of the video
   * @param items the array full of animations
   * @param group the group this method gets called from
   * @param _options ??
   * @returns the right animation for the time provided
   */
  public static getAnim<T extends IAnimInterval>(time: number, items: T[] | undefined, group: { visible: boolean }, _options?: { offsetTime?: number; clipTime?: number }): T | undefined {
    if (!items) return undefined;
    const options = { offsetTime: 0.0, clipTime: undefined, ..._options };
    time = time + options.offsetTime;
    const anyGroup: any = group as any;
    const anim = this.getAnimInternal(items, time);
    if (!anim) {
      anyGroup.visible = false;
      return undefined;
    }

    if (Logic.videoRef.switchToIntroAtTime !== undefined && options.clipTime !== undefined) {
      // switch race to intro => fade (top center _result)
      if (anim.startTime + options.offsetTime <= options.clipTime && anim.startTime + options.offsetTime + anim.duration > options.clipTime)
        anim.duration = Logic.videoRef.switchToIntroAtTime - anim.startTime;
    }

    if (anim.duration < 0.0001) {
      anyGroup.visible = false;
      return undefined;
    }

    if (!anyGroup._anim || anyGroup._anim.startTime !== anim.startTime || time < anyGroup._wasInAnim) {
      anyGroup._anim = anim;
      anyGroup._wasInAnim = undefined;
    }

    if (!AnimHelper.inAnim(time, anim)) {
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

  public static onVideoEnded(): void {
    if (!(Logic.getGameInfo()?.gameLength === 60 && Logic.getGameInfo()?.gameType !== "roulette")) {
      Logic.onTimeForFade(this.videoRef.getState() === VideoState.Race ? VideoState.Intro : VideoState.Race);
    }
  }

  public static onTimeForFade(targetState: VideoState): void {
    if (targetState === VideoState.Intro && this.pauseOverlayRequested === "intro") targetState = VideoState.Paused;
    else if (targetState === VideoState.Race && this.pauseOverlayRequested === "race") targetState = VideoState.Paused;
    if (this.timeForFadeTarget !== targetState) {
      // just call once
      this.timeForFadeTarget = targetState;
      Logger.guard("onTimeForFade: " + targetState, () => {
        Logger.info("OnTimeForFade: " + targetState);
        this.implementation.onTimeForFade(targetState);
      });
    }
  }

  /**
   * create a mask to any element (the mask still has to be applied to the element and added to the context)
   * @param xOffset the offset on the x axis (from applied element)
   * @param yOffset the offset on the y axis (from applied element)
   * @param width the widht of the mask (preferably use width of applied element)
   * @param height the height of the mask (preferably use height of applied element)
   * @param debug if set to true, the mask will be shown in white color
   * @returns the mask, has to be applied to element
   */
  public static createPixiMask(xOffset: number = 0, yOffset: number = 0, width: number, height: number = 20, debug?: boolean): PIXI.Graphics {
    const mask = new PIXI.Graphics();

    mask.cacheAsBitmap = false;
    mask.beginFill(0xffffff);
    mask.drawRect(_s(xOffset), _s(yOffset), _s(width), _s(height));
    mask.endFill();
    mask.alpha = debug ? 0.5 : 0;
    mask.renderable = true;
    mask.cacheAsBitmap = true;

    return mask;
  }

  /*Logic.fadeTo(VideoState.PauseOverlay);
  Logic.videoScreen.pauseOverlay.visible = true;

  Util.callDelayed(() => {
    //Logic.onTimeForPlay(VideoState.Intro);
    Logic.fadeTo(VideoState.Intro);
  }, 3000);*/

  public static onTimeForPlay(targetState: VideoState): void {
    const gameId = this.implementation.getCurrentGameId();
    if (this.timeForPlayTarget !== targetState) {
      // just call once
      this.timeForPlayTarget = targetState;
      Logger.guard("onTimeForPlay: " + targetState, () => {
        this.implementation.onTimeForPlay(targetState);
      });
    } else if (this.gameInfo?.gameLength === 60 && this.gameInfo?.gameType !== "roulette" && gameId !== this.currentPlayGameId) {
      console.log(gameId);
      this.currentPlayGameId = gameId;
      // just call once
      Logger.guard("onTimeForPlay: " + targetState, () => {
        this.implementation.onTimeForPlay(targetState);
      });
    }
  }

  public static startPlayingWithState(state: VideoState, timeOffset?: number): void {
    if (timeOffset === undefined) timeOffset = 0.0;
    Logic.videoRef.setState(state, timeOffset, true);
  }

  public static calcStateTime(state: VideoState, time: number): number {
    return state === VideoState.Intro ? time : time - Logic.getIntroLength();
  }

  public static getStateForTime(time: number): VideoState.Intro | VideoState.Race {
    const state = time >= this.getIntroLength() ? VideoState.Race : VideoState.Intro;
    return state;
  }

  public static getPercentageInRange(value: number, minValue: number, maxValue: number) {
    const valueRange = maxValue - minValue;
    const valueOffset = value - minValue;
    const percentage = (valueOffset / valueRange) * 100;
    return percentage;
  }

  public static fadeTo(state: VideoState): void {
    console.log("FadeTo: " + state + " (" + this.timeForFadeTarget + ")");
    this.timeForFadeTarget = state; // there might be a fade although timeForFade was not called before
    this.timeForPlayTarget = VideoState.None;
    try {
      Logic.videoRef.fadeTo(state);
    } catch (e) {
      Logger.info("FadeTo: " + state + " (" + this.timeForFadeTarget + ")");
      Logger.error("FadeTo called: ", e);
    }
  }

  public static getState(): VideoState {
    return Logic.videoRef.getState();
  }

  public static async play(): Promise<void> {
    try {
      await Logic.videoRef.play();
    } catch (e) {
      console.log("Logiv.play failed", e);
    }
  }

  private static published = false;
  public static async publish(): Promise<void> {
    try {
      if (!this.published) {
        Logger.info("Publish!");
        const canvas = Engine.instance.view;
        const stream = (canvas as any).captureStream() as MediaStream;
        // const media = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
        // const displayMedia = await (navigator.me1diaDevices as any).getDisplayMedia({audio: true, video: true})
        // stream.addTrack(displayMedia.getAudioTracks()[0]);
        // const tracks = mediaStream.getAudioTracks();

        // stream.addTrack(Logic.introMusic.
        const videoElement = this.videoRef.getInternalRef();
        if (videoElement && Logic.introMusic) {
          const audioCtx = new AudioContext();
          const dest = audioCtx.createMediaStreamDestination();
          try {
            const source = audioCtx.createMediaElementSource(videoElement);
            source.connect(dest);
          } catch (e) {
            console.log("Exception: ", e);
          }

          const source2 = audioCtx.createMediaElementSource(Logic.introMusic);
          // audio.play();
          source2.connect(dest);
          const audioTrack = dest.stream.getAudioTracks()[0];
          stream.addTrack(audioTrack);
        }
        try {
          const maxBitRate: number | undefined = Util.getUrlParameterIntOrUndefined(window.location.href, "maxBitrate");
          const maxBitRateLow: number | undefined = Util.getUrlParameterIntOrUndefined(window.location.href, "maxBitrateLow");
          const codecIndex = Util.getUrlParameterInt(window.location.href, "codecIndex", -1);
          await RtcLogic.instance.producer!.publishStream(stream, { codecIndex, maxBitRate, maxBitRateLow });
          this.published = true;
        } catch (e) {
          Logger.error("Logic: Failed to publish");
        }
      }
    } catch (e) {
      Logger.error("Failed to create session description: ", e);
    }
  }

  public static setLanguageId(languageId: string): void {
    this.languageId = languageId;
  }

  public static loadIntroMusic(url: string): void {
    url = LocalCache.get(url);
    this.loadIntroMusicInternal(url, settings.crossOrigin);
  }

  private static loadIntroMusicInternal(url: string, crossOrigin?: string) {
    const audio = new Audio(url);
    audio.crossOrigin = crossOrigin !== undefined ? crossOrigin : null;
    audio.onerror = (e) => {
      console.log(e);
      const logMessage = new SockServLogMessage(Errors.NO_SOUND_FILE.code, Errors.NO_SOUND_FILE.message + ": " + url);
      ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
        Logger.error("Send log Error:" + JSON.stringify(error));
      });
    };
    audio.loop = true;
    audio.pause();
    Logic.introMusic = audio;
  }

  public static async fadeMusic(element: HTMLAudioElement, to: number, duration: number): Promise<void> {
    const originalVolume = element.volume;
    const delta = to - originalVolume;
    const interval = 20;
    const easing = (f: number) => f;
    if (!delta || !duration || !easing || !interval) {
      element.volume = to;
      return Promise.resolve();
    }
    const ticks = Math.floor(duration / interval);
    let tick = 1;
    return new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        element.volume = originalVolume + easing(tick / ticks) * delta;
        if (++tick === ticks) {
          clearInterval(timer);
          resolve();
        }
      }, interval);
    });
  }

  public static async cacheFiles(files: string[]): Promise<void> {
    console.log("CacheFiles: " + settings.useCache);
    if (!settings.useCache) return;
    downloadObject.loading = true;
    await LocalCache.cacheFiles(
      files,
      {},
      {
        onProgress: (progress) => {
          downloadObject.files = observable(progress);
        }
      }
    );
    Logger.debug("LocalCache.ready!");
    downloadObject.loading = false;
  }
}

const hm = module as any;
if (hm.hot) {
  hm.hot.dispose((data: any) => {
    if (Logic.introMusic) Logic.introMusic.pause();
  });
}
