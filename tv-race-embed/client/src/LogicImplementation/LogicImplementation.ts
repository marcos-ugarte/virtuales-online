import { ErrorObj } from "./base/ErrorHandlerBase";
import { ModelBase } from "./base/GamesModelBase";
import { ErrorHandler, Errors } from "./ErrorHandler";
import { GamesModel, GameTimer, IResultExtern, ModelBox, ModelDog, ModelDog63, ModelHorse, ModelKart, ModelRtt, ModelSulky } from "./GamesModel";
import { Languages } from "./Localisation";
import { ISyncInfo } from "./SyncHelper";
import { IVideoUrls, LogicBase } from "../Logic/LogicBase";
import { IGameInfo, IHorseC4Bonus, IHorseDog6C4Model, IInitData, ILogicImplementation, IModel, IRouletteRoundHistory, VideoState, VideoUrlInfo } from "../Logic/LogicDefinitions";
import { VideoScreenRouletteC4 } from "../VideoScreen/rouletteC4/VideoScreenRouletteC4";
import fightResultHexUrl from "assets/kickbox/roundresult_hexagon.png";
import headerImageUrl from "assets/kickbox/WGP_Header.png";
import inFightImageUrl from "assets/kickbox/WGP_Infight_Display.png";
import inFightImageBigUrl from "assets/kickbox/WGP_Overlay_edBG_Big.png";
import resultBackgroundImageUrl from "client/assets/kickbox/Round_Result_Stilframe_Start.png";
import wipeBackgroundImageUrl from "client/assets/kickbox/WipeBackground.png";
import { Logger } from "client/Logic/Logger";
import { Logic, settings } from "client/Logic/Logic";
import { ModelHorseC4 } from "client/LogicImplementation/ModelHorseC4";
import { RtcLogic } from "client/Rtc/RtcLogic";
import { ServerSocketLogicBase, SockServGameRoundMessage, SockServLogMessage } from "client/ServerWebSocket/base/ServerSocketLogicBase";
import { ServerSocketLogic } from "client/ServerWebSocket/ServerSocketLogic";
import { ISoftware, ISystem } from "client/Ternimal/IpcChannelInterface";
import { VideoScreenDog63 } from "client/VideoScreen/dog63/VideoScreenDog63";
import { VideoScreenHorseC4 } from "client/VideoScreen/horseDog6C4/VideoScreenHorseDog6C4";
import { VideoScreenKickBox } from "client/VideoScreen/kickbox/VideoScreenKickBox";
import {
  BetofferTypes,
  DeviceTypes,
  GameLength,
  GameType,
  IBetCodeDecimals,
  IGameRoundResultData,
  IInitSettings,
  IMultipleIntroVideos,
  ISockServResponseMessageGameRound,
  ISockServResponseMessageInit,
  ISockServResponseMessageTranslation,
  PerformanceSetting,
  SkinType,
  SkinTypeDefinition
} from "common/Definitions";
import { FadeDurations } from "common/FadeDurations";
import { Settings } from "common/Settings";
import { ITimezoneStorageData, TimzoneStorageStatus, Util } from "common/Util";
import { HardwareRelatedSettings } from "client/LogicImplementation/HardwareRelatedSettings";

declare global {
  interface Window {
    system: ISystem;
    software: ISoftware;
    _videoWatchdogStarted?: boolean;
  }
}

export const INIT_INTERVAL = 1;
export const INIT_NUMB_FUTURE = 2;
export const INIT_NUMB_PAST = 8;
export const RACE_BREAK_REQU_INTERVAL = 60; // in Seconds, every nth second at race break a request for new games is made
// TODO TEST
// export const RACE_BREAK_REQU_INTERVAL = 1; // in Seconds, every nth second at race break a request for new games is made

export let GAME_VIDEO_START_MS = 169000; // in milliseconds, its the time when countoun shows 0 ( INTRO_VIDEO_LENGTH - fade Time - 1 Second 0 shown)
export let INTRO_VIDEO_LENGTH = 172; // in seconds, its the time when Viualisation VideoState changes from Intro to Race
export let GAME_LOOP_LENGTH: GameLength = 240; // in seconds
export let START_NEXT_TO_SEC_DELAY = 900; // in seconds
export let START_NEXT_VIDEO_START_OFFSET = 2; // in seconds
export let RACE_AFTER_CONTOWN_ZERO_DELAY = 1; // in seconds, race always starts some time after countdown 0
export const VIDEO_START_DELAY_TIME = 0.1; // in seconds
export const MAX_START_OFFSET = 200; // in milliseconds
export const MAX_INTRO_OFFSET = 400; // in milliseconds
export const MAX_RACE_OFFSET = 800; // in milliseconds
export let SETUP_OFFSET_FOR_PLAY = 1; // in seconds

const performance: PerformanceSetting = "high";

//TODO TEST
// let testCount = 0;

export class LogicImplementation extends LogicBase implements ILogicImplementation {
  private initStettingsData!: IInitSettings;
  private gamesModel = new GamesModel();
  private setNextModel!: ModelBase;
  private nextVideoStarted = false;
  private roundRequestSecond = 0;
  private intiVideoStartTime = 0; // seconds since game round start
  private intiVideoStartTimestamp = 0; // sys time when should have first started
  private gameTimer: GameTimer = new GameTimer(this, 500, 10000, GAME_LOOP_LENGTH, GAME_VIDEO_START_MS, INIT_INTERVAL);
  public lastStartRaceId: string = "";
  private startNextTimer!: ReturnType<typeof setTimeout>;
  private canPlayOnSetUp: boolean = true;
  private setUpCanplayReceived: boolean = false;
  private setUpVideoStarted: boolean = false;
  private _programmSetup: boolean = true;
  private raceVideoStarted: boolean = false;
  private fadeToRaceReceived = false;
  private canPlayIntroReceived = false;
  private initResult: ISockServResponseMessageInit | null = null;
  private deviceId: string = "";
  public registered: boolean = true;

  private countVidUpdate = 0;
  private raceVideoDelay = 2400; // delay of race video to servertime video Loop in milliseconds
  private countRaceVidDoneUpd: number = 0;
  private extraLoadTime: number = 0; // in milliseconds
  private continiousSync: boolean = false; // if true synchronization with server will be checked continiuslly,
  private streamScreen: boolean = false; // for checking if stream is muted or not
  // otherwise only at start of a video Loop
  private maxRaceSyncUpdates: number = 5; // to be not complete unfluent update only several times, than leaf delayed
  private maxRoundNumber: number = 10000000000;
  private beforeBreakNumber: number = 10000000000;
  private postMessageTargetOrigin: string = Settings.terminalSettings.targetOrigin;
  private hardwareRelatedSettings: HardwareRelatedSettings = new HardwareRelatedSettings();
  private geologTimout!: ReturnType<typeof setTimeout>;
  private geologInterval!: ReturnType<typeof setTimeout>;
  private geologIntervalCoount: number = 0;
  private withIntro: boolean = true;

  public isRegistered(): boolean {
    return this.registered;
  }

  // initialize logic => prepare first round ...
  public async onInit(): Promise<void> {
    Logger.debug("On Init");
    this.deviceId = settings.deviceId;
    this.streamScreen = settings.streamScreen;

    const hardwareType = Util.getUrlParameter(window.location.href, "hardwareType");
    if (hardwareType) {
      this.hardwareRelatedSettings.setHardwareType(hardwareType);
    }
    // for terminal shorter setup offset to have new video build up faster
    if (settings.deviceType === DeviceTypes.Terminal) {
      SETUP_OFFSET_FOR_PLAY = 0.3;
    }
    // develop target Origin for develop pc
    if (window.location.href.includes(Settings.terminalSettings.targetOriginCompareStr)) {
      this.postMessageTargetOrigin = Settings.terminalSettings.targetOriginDev;
    }

    try {
      // socket sever Url is read from an request by device ID
      ServerSocketLogicBase.socketServerUrl = await ServerSocketLogic.getSocketUrlRequest(this.deviceId);
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const error = new ErrorObj(Errors.SOCKET_SERVER_URL_REQUEST.code, e.toString());
      if (typeof e === "object" && e !== null && "errorId" in e && (e as { errorId: number }).errorId === 4303) {
        this.registered = false;
        this.handleInactiveOrUnregisteredDeviceError();
      } else {
        this.errorHandler(error, true);
      }
      return;
    }

    const settingSocketServerUrl = ServerSocketLogic.getServerUrlByDomain();
    if (settingSocketServerUrl !== "") {
      // it can be overwritten by settings (for example for development on local host)
      ServerSocketLogicBase.socketServerUrl = settingSocketServerUrl;
    }
    ServerSocketLogic.instance.setSocketServerUrl(ServerSocketLogicBase.socketServerUrl);

    await this.init(true);
  }

  public async init(firstSetUp: boolean): Promise<void> {
    await this.initServerAction(firstSetUp);

    if ((this.initResult && (this.initResult as any).errorId === "4303") || !this.initResult || typeof this.initResult !== "object") {
      this.registered = false;
      this.handleInactiveOrUnregisteredDeviceError();
      return;
    }

    await this.initialSetUp(this.initResult);
  }

  private handleInactiveOrUnregisteredDeviceError(): void {
    Logger.error(Errors.DEVICE_NOT_REGISTERED_OR_INACTIVE.message);
    //Errors.DEVICE_NOT_REGISTERED_OR_INACTIVE.code;
    try {
      this.stopEverything();
    } catch (e) {
      Logger.error("Stop failed: ", e);
    }

    //ErrorHandler.instance.showErrorDialog("Device not active / unregistered device!", ErrorHandler.instance.getErrorCommunicationErrorText());
    ErrorHandler.instance.normalErrorHandler(Errors.DEVICE_NOT_REGISTERED_OR_INACTIVE, true);

    /*setTimeout(() => {
      window.location.reload();
    }, 3000);*/
  }

  private stopEverything(): void {
    try {
      Logic.videoRef?.stop();
      Logic.videoRef?.exit();
    } catch {}

    try {
      this.gameTimer?.stopGameLoop();
    } catch {}

    try {
      ServerSocketLogic.instance?.disconnect();
    } catch {}

    try {
      Logic.introMusic?.pause();
    } catch {}
  }

  public async tryRestart() {
    Logger.debug("Try Restart");
    Logger.debug("Stack trace:" + Util.getStackTrace());
    //connect to server and read static settings for device
    await this.initServerAction(false);

    if (!this.isAllreadySetUp()) {
      //touch on browser version can not be done jet --> reload window
      Logger.debug("Reload Window");
      this.reloadWindow();
    } else {
      //dynamic datas are set up each restart
      this.initAction(false);
    }
  }

  private async cacheMediaFiles(initResult: ISockServResponseMessageInit) {
    // await LocalCache.delete(); // delete old cache since urls are different on each start....
    const introInfo = this.getIntroUrls(initResult);
    if (introInfo && (!introInfo.video.includes("intro_1") || initResult.setting.betoffers[0].eventtype === "rtt")) {
      const files: string[] = [];
      files.push(introInfo.image);
      files.push(introInfo.video);
      if (introInfo.sound && this.isIntroSoundEnabled()) files.push(introInfo.sound);

      // Todo: "delete unused files..."
      // const filesWithoutParams = files.map((f) => LocalCache.removeParams(f));
      // await LocalCache.enumCache((file, folder) => {
      //   const fullPath = folder + "/" + file.name;
      //  if (!filesWithoutParams.includes(fullPath))
      //    console.log("Delete: ...");
      //  console.log("FullPath: " + fullPath);
      // });

      await Logic.cacheFiles(files);
    }
  }

  public async initialSetUp(initResult: ISockServResponseMessageInit) {
    if (initResult.setting.betoffers[0].eventtype !== "wgp") {
      await this.cacheMediaFiles(initResult);
    }

    // ----------------- Game settings Parameters ------------------------------

    let gameType: GameType = "kart5";
    let eventType: string = "kart5";
    // TODO vom init Result lesen
    let skinVersion: SkinType = 10;
    let useOverlays: boolean = false;

    // TODO TEST
    // if(this.initResult)
    // this.initResult.setting.betoffers[0].nbrEvents = 233;
    // this.initResult.setting.betoffers[0].roundInterval = 241;

    GAME_LOOP_LENGTH = initResult.setting.betoffers[0].roundInterval;
    eventType = initResult.setting.betoffers[0].eventtype;
    skinVersion = initResult.setting.skinVersion as SkinType;
    useOverlays = initResult.setting.useOverlays ?? false;

    // -------------- Sync Prameters ---------------------------------------------

    this.extraLoadTime = this.hardwareRelatedSettings.getExtraLoadTime(); // set extra load time by hardware type
    this.continiousSync = Util.getUrlParameterBool(window.location.href, "contsync", initResult.param.contsync);
    const extraLoadTimeParam = Util.getUrlParameterInt(window.location.href, "extraload", initResult.param.extraload);
    // override extraLoadTime if there is an url parameter value
    if (extraLoadTimeParam !== 0) {
      this.extraLoadTime = extraLoadTimeParam;
    }
    this.maxRaceSyncUpdates = Util.getUrlParameterInt(window.location.href, "maxraceupd", initResult.param.maxraceupd);

    Logger.debug(
      "Sync Parameters, continiousSync:" + this.continiousSync + " extraLoadTime:" + this.extraLoadTime + " maxRaceSyncUpdates:" + this.maxRaceSyncUpdates + " streamScreen:" + this.streamScreen
    );

    // ---------------------------------------------------------------------------

    FadeDurations.setFadeDurations(gameType, skinVersion);

    gameType = this.setGameTypeDependingValues(initResult, skinVersion);
    this.setGameLengthDependingValues(initResult, skinVersion);

    Logger.debug("Inital time const, START_NEXT_VIDEO_START_OFFSET:" + START_NEXT_VIDEO_START_OFFSET + " START_NEXT_TO_SEC_DELAY:" + START_NEXT_TO_SEC_DELAY);

    Logger.debug("correc time const, START_NEXT_VIDEO_START_OFFSET:" + START_NEXT_VIDEO_START_OFFSET + " START_NEXT_TO_SEC_DELAY:" + START_NEXT_TO_SEC_DELAY);

    this.gameTimer = new GameTimer(this, 500, 10000, GAME_LOOP_LENGTH, GAME_VIDEO_START_MS, INIT_INTERVAL);

    const gameInfo: IGameInfo = {
      // TODO TEST
      // videoLanguage: "it", // it for italian mode

      videoLanguage: initResult.setting.videoLanguage, // it for italian mode
      gameType,
      eventType,
      gameSkin: skinVersion,
      gameLength: GAME_LOOP_LENGTH,
      currentIntroGameLength: GAME_LOOP_LENGTH,
      performance,
      music: initResult.music,
      speakerTimesArray: [],
      haveDbPot: initResult.haveDbPot,
      useOverlays,
      oddsAlwaysOn: skinVersion === SkinTypeDefinition.MODERN_ODDS_ALWAYS_ON
    };

    if (gameType === "box") {
      const headerTexture = await Logic.loadTexture(headerImageUrl as string);
      const inFightTexture = await Logic.loadTexture(inFightImageUrl as string);
      const inFightTextureBig = await Logic.loadTexture(inFightImageBigUrl as string);
      const fightResultHexTexture = await Logic.loadTexture(fightResultHexUrl as string);
      const wipeBackgroundTexture = await Logic.loadTexture(wipeBackgroundImageUrl as string);
      const resultBackgroundTexture = await Logic.loadTexture(resultBackgroundImageUrl as string);
      gameInfo.additionalTextures = {
        headerImage: headerTexture,
        inFightImage: inFightTexture,
        inFightImageBig: inFightTextureBig,
        fightResultHexImage: fightResultHexTexture,
        wipeBackgroundTexture,
        resultBackgroundTexture
      };
    }
    // TODO TEST
    // initResult.setting.videooverlayLogo = "none";

    if (initResult.setting.videooverlayLogo !== "none") {
      if (gameInfo.gameSkin === SkinTypeDefinition.CLASSIC) {
        const logoTexture = await Logic.loadTexture(
          "https://api.virtuales.bet/dsa4/?rt=3&cmd=logoRequest&type=videooverlay&name=" + initResult.setting.videooverlayLogo + "&game_type=" + gameInfo.eventType,
          { crossOrigin: "anonymous", mipmap: true }
        );
        const logoBackground = await Logic.loadTexture(
          "https://api.virtuales.bet/dsa4/?rt=3&cmd=logoRequest&type=videooverlay&name=" + initResult.setting.videooverlayLogo + "&variant=background&game_type=" + gameInfo.eventType,
          { crossOrigin: "anonymous", mipmap: true }
        );
        const logoText = await Logic.loadTexture(
          "https://api.virtuales.bet/dsa4/?rt=3&cmd=logoRequest&type=videooverlay&name=" + initResult.setting.videooverlayLogo + "&variant=text&game_type=" + gameInfo.eventType,
          { crossOrigin: "anonymous", mipmap: true }
        );

        gameInfo.companyLogo = { image: logoTexture, imageBackground: logoBackground, imageText: logoText };
      } else {
        const logoTexture = await Logic.loadTexture("https://api.virtuales.bet/dsa4/?rt=3&cmd=logoRequest&type=videooverlayTv2&name=" + initResult.setting.videooverlayLogo, {
          crossOrigin: "anonymous",
          mipmap: true
        });
        gameInfo.companyLogo = { image: logoTexture };
      }
    }

    Logger.debug("Game Type:" + gameInfo.gameType);
    Logger.debug("Music settings:" + JSON.stringify(gameInfo.music));

    // set language and transletion which have been read from server
    Languages.instance.setTranslations(initResult.translations);
    let toSetLanguage = initResult.setting.languageId;
    if (settings.forceLanguage) {
      toSetLanguage = settings.forceLanguage;
    }
    Languages.instance.updateLanguage(toSetLanguage, false);

    this.initGame(gameInfo);

    Languages.instance.setLangFields();

    // load intro texture => should be loaded before fade to intro ...
    if (gameInfo.gameType !== "box") {
      const introUrls = this.getIntroUrls(initResult);
      if (this.withIntro) {
        this.fillIntroTexture(await this.loadTexture(introUrls.image, true));
      }
      // when intro video was loaded (note async await...) => start video at a certain position
      if (introUrls.sound && this.isIntroSoundEnabled()) Logic.loadIntroMusic(introUrls.sound);
    } else {
      // kickbox intro first picture read when round info is set
      const introUrls = this.getIntroUrls(initResult);
      if (introUrls.sound && this.isIntroSoundEnabled()) Logic.loadIntroMusic(introUrls.sound);
    }
    // await this.sendMessage({ type: "test", data: { x: 2, data: "Message from WebView to React" } });
    // return { gameType: "kart5" };
  }

  public setGameTypeDependingValues(initResult: ISockServResponseMessageInit, skinVersion: SkinTypeDefinition): GameType {
    let gameType: GameType = "kart5";
    if (initResult.setting.betoffers[0].eventtype === "dog") {
      gameType = "dog6";
      this.raceVideoDelay = 2400;
      this.gamesModel.historyLength = GamesModel.HISTROY_LENGTH;

      if (skinVersion === SkinTypeDefinition.CLASSIC) {
        this.gamesModel.historyLength = GamesModel.HISTROY_LENGTH_C4;
      }
    } else if (initResult.setting.betoffers[0].eventtype === "dog8") {
      gameType = initResult.setting.betoffers[0].eventtype;
      this.raceVideoDelay = 2100;
      this.gamesModel.historyLength = GamesModel.HISTROY_LENGTH;
    } else if (initResult.setting.betoffers[0].eventtype === "kart") {
      gameType = "kart5";
      this.raceVideoDelay = 2100;
      this.gamesModel.historyLength = GamesModel.HISTROY_LENGTH;
    } else if (initResult.setting.betoffers[0].eventtype === "wgp") {
      gameType = "box";
      this.raceVideoDelay = 2100;
      this.gamesModel.historyLength = GamesModel.HISTROY_LENGTH_BOX;
    } else if (initResult.setting.betoffers[0].eventtype === "dog63") {
      gameType = "dog63";
      this.raceVideoDelay = 2400;
      this.gamesModel.historyLength = GamesModel.HISTROY_LENGTH;
    } else if (initResult.setting.betoffers[0].eventtype === "horse") {
      gameType = "horse";
      this.raceVideoDelay = 2400;
      this.gamesModel.historyLength = GamesModel.HISTROY_LENGTH;

      if (skinVersion === SkinTypeDefinition.CLASSIC) {
        this.gamesModel.historyLength = GamesModel.HISTROY_LENGTH_C4;
      }
    } else if (initResult.setting.betoffers[0].eventtype === "sulky") {
      gameType = "sulky";
      this.raceVideoDelay = 2400;
    } else if (initResult.setting.betoffers[0].eventtype === "rtt") {
      gameType = "roulette";
      this.raceVideoDelay = 2400;
      this.gamesModel.historyLength = GamesModel.HISTROY_LENGTH;

      if (skinVersion === SkinTypeDefinition.CLASSIC) {
        this.gamesModel.historyLength = GamesModel.HISTROY_LENGTH_C4;
      }
    }
    return gameType;
  }

  public setGameLengthDependingValues(initResult: ISockServResponseMessageInit, skinVersion: SkinTypeDefinition) {
    if (initResult.setting.betoffers[0].eventtype === "dog") {
      START_NEXT_VIDEO_START_OFFSET = 2;
      START_NEXT_TO_SEC_DELAY = 710;

      if (skinVersion === SkinTypeDefinition.CLASSIC) {
        switch (GAME_LOOP_LENGTH) {
          case 240: {
            GAME_VIDEO_START_MS = 193000;
            INTRO_VIDEO_LENGTH = 195;

            START_NEXT_VIDEO_START_OFFSET = 1;
            START_NEXT_TO_SEC_DELAY = 600;
            break;
          }
          default: {
            const error = Errors.INVALID_LENGTH;
            error.message = error.message + ":" + GAME_LOOP_LENGTH;
            ErrorHandler.instance.normalErrorHandler(Errors.INVALID_LENGTH, true);
            return;
          }
        }
      } else {
        switch (GAME_LOOP_LENGTH) {
          case 60: {
            this.withIntro = false;
            GAME_VIDEO_START_MS = 0;
            INTRO_VIDEO_LENGTH = 0;
            break;
          }
          case 120: {
            GAME_VIDEO_START_MS = 57200;
            INTRO_VIDEO_LENGTH = 60.2;
            break;
          }
          case 180: {
            GAME_VIDEO_START_MS = 117200;
            INTRO_VIDEO_LENGTH = 120.2;
            break;
          }
          case 240: {
            GAME_VIDEO_START_MS = 177200;
            INTRO_VIDEO_LENGTH = 180.2;
            break;
          }
          case 300: {
            GAME_VIDEO_START_MS = 192200;
            INTRO_VIDEO_LENGTH = 195.2;
            START_NEXT_VIDEO_START_OFFSET = 2;
            START_NEXT_TO_SEC_DELAY = 610;
            break;
          }
          default: {
            const error = Errors.INVALID_LENGTH;
            error.message = error.message + ":" + GAME_LOOP_LENGTH;
            ErrorHandler.instance.normalErrorHandler(Errors.INVALID_LENGTH, true);
            return;
          }
        }
      }
    } else if (initResult.setting.betoffers[0].eventtype === "dog8") {
      START_NEXT_VIDEO_START_OFFSET = 2;
      START_NEXT_TO_SEC_DELAY = 710;

      switch (GAME_LOOP_LENGTH) {
        case 60: {
          this.withIntro = false;
          GAME_VIDEO_START_MS = 0;
          INTRO_VIDEO_LENGTH = 0;
          break;
        }
        case 120: {
          GAME_VIDEO_START_MS = 57200;
          INTRO_VIDEO_LENGTH = 60.2;
          break;
        }
        case 180: {
          GAME_VIDEO_START_MS = 117200;
          INTRO_VIDEO_LENGTH = 120.2;
          break;
        }
        case 240: {
          GAME_VIDEO_START_MS = 177200;
          INTRO_VIDEO_LENGTH = 180.2;
          break;
        }
        case 300: {
          GAME_VIDEO_START_MS = 192371;
          INTRO_VIDEO_LENGTH = 195.371;
          START_NEXT_VIDEO_START_OFFSET = 2;
          START_NEXT_TO_SEC_DELAY = 610;
          break;
        }
        default: {
          const error = Errors.INVALID_LENGTH;
          error.message = error.message + ":" + GAME_LOOP_LENGTH;
          ErrorHandler.instance.normalErrorHandler(Errors.INVALID_LENGTH, true);
          return;
        }
      }
    } else if (initResult.setting.betoffers[0].eventtype === "kart") {
      START_NEXT_VIDEO_START_OFFSET = 2;
      START_NEXT_TO_SEC_DELAY = 760;

      switch (GAME_LOOP_LENGTH) {
        case 60: {
          this.withIntro = false;
          GAME_VIDEO_START_MS = 0;
          INTRO_VIDEO_LENGTH = 0;
          break;
        }
        case 120: {
          GAME_VIDEO_START_MS = 49100;
          INTRO_VIDEO_LENGTH = 52.1;
          break;
        }
        case 180: {
          GAME_VIDEO_START_MS = 109100;
          INTRO_VIDEO_LENGTH = 112.1;
          break;
        }
        case 240: {
          GAME_VIDEO_START_MS = 169100;
          INTRO_VIDEO_LENGTH = 172.1;
          break;
        }
        case 300: {
          GAME_VIDEO_START_MS = 184040;
          INTRO_VIDEO_LENGTH = 187.04;
          break;
        }
        default: {
          const error = Errors.INVALID_LENGTH;
          error.message = error.message + ":" + GAME_LOOP_LENGTH;
          ErrorHandler.instance.normalErrorHandler(Errors.INVALID_LENGTH, true);
          return;
        }
      }
    } else if (initResult.setting.betoffers[0].eventtype === "wgp") {
      START_NEXT_VIDEO_START_OFFSET = 2;
      START_NEXT_TO_SEC_DELAY = 760;
      RACE_AFTER_CONTOWN_ZERO_DELAY = 2;

      switch (GAME_LOOP_LENGTH) {
        case 384: {
          GAME_VIDEO_START_MS = 246466.667;
          INTRO_VIDEO_LENGTH = 249.661333;

          break;
        }
        default: {
          const error = Errors.INVALID_LENGTH;
          error.message = error.message + ":" + GAME_LOOP_LENGTH;
          ErrorHandler.instance.normalErrorHandler(Errors.INVALID_LENGTH, true);
          return;
        }
      }
    } else if (initResult.setting.betoffers[0].eventtype === "dog63") {
      START_NEXT_VIDEO_START_OFFSET = 2;
      START_NEXT_TO_SEC_DELAY = 710;

      switch (GAME_LOOP_LENGTH) {
        case 60: {
          this.withIntro = false;
          GAME_VIDEO_START_MS = 5;
          INTRO_VIDEO_LENGTH = 0;
          break;
        }
        case 120: {
          GAME_VIDEO_START_MS = 57200;
          INTRO_VIDEO_LENGTH = 60.2;
          break;
        }
        case 180: {
          GAME_VIDEO_START_MS = 117200;
          INTRO_VIDEO_LENGTH = 120.2;
          break;
        }
        case 240: {
          GAME_VIDEO_START_MS = 177200;
          INTRO_VIDEO_LENGTH = 180.2;
          break;
        }
        case 300: {
          if (initResult.setting.videoLanguage === "it") {
            GAME_VIDEO_START_MS = 192000;
            INTRO_VIDEO_LENGTH = 195;
          } else {
            GAME_VIDEO_START_MS = 237200;
            INTRO_VIDEO_LENGTH = 240.2;
          }

          START_NEXT_VIDEO_START_OFFSET = 2;
          START_NEXT_TO_SEC_DELAY = 610;
          break;
        }
        case 360: {
          if (initResult.setting.videoLanguage === "it") {
            GAME_VIDEO_START_MS = 297000;
            INTRO_VIDEO_LENGTH = 300;
          } else {
            GAME_VIDEO_START_MS = 297200;
            INTRO_VIDEO_LENGTH = 300.2;
          }

          START_NEXT_VIDEO_START_OFFSET = 2;
          START_NEXT_TO_SEC_DELAY = 610;
          break;
        }
        default: {
          const error = Errors.INVALID_LENGTH;
          error.message = error.message + ":" + GAME_LOOP_LENGTH;
          ErrorHandler.instance.normalErrorHandler(Errors.INVALID_LENGTH, true);
          return;
        }
      }
    } else if (initResult.setting.betoffers[0].eventtype === "horse") {
      START_NEXT_VIDEO_START_OFFSET = 2;
      START_NEXT_TO_SEC_DELAY = 710;

      if (skinVersion === SkinTypeDefinition.CLASSIC) {
        this.gamesModel.historyLength = GamesModel.HISTROY_LENGTH_C4;
        switch (GAME_LOOP_LENGTH) {
          case 240: {
            GAME_VIDEO_START_MS = 195000;
            INTRO_VIDEO_LENGTH = 197;

            START_NEXT_VIDEO_START_OFFSET = 1;
            START_NEXT_TO_SEC_DELAY = 600;
            break;
          }
          default: {
            const error = Errors.INVALID_LENGTH;
            error.message = error.message + ":" + GAME_LOOP_LENGTH;
            ErrorHandler.instance.normalErrorHandler(Errors.INVALID_LENGTH, true);
            return;
          }
        }
      } else {
        switch (GAME_LOOP_LENGTH) {
          case 60: {
            this.withIntro = false;
            GAME_VIDEO_START_MS = 0;
            INTRO_VIDEO_LENGTH = 0;
            break;
          }
          case 120: {
            GAME_VIDEO_START_MS = 57200;
            INTRO_VIDEO_LENGTH = 60.2;
            break;
          }
          case 180: {
            GAME_VIDEO_START_MS = 117200;
            INTRO_VIDEO_LENGTH = 120.2;
            break;
          }
          case 240: {
            GAME_VIDEO_START_MS = 177200;
            INTRO_VIDEO_LENGTH = 180.2;
            break;
          }
          case 300: {
            GAME_VIDEO_START_MS = 192200;
            INTRO_VIDEO_LENGTH = 195.2;
            START_NEXT_VIDEO_START_OFFSET = 2;
            START_NEXT_TO_SEC_DELAY = 610;
            break;
          }
          case 320: {
            GAME_VIDEO_START_MS = 177000;
            INTRO_VIDEO_LENGTH = 180;
            START_NEXT_VIDEO_START_OFFSET = 2;
            START_NEXT_TO_SEC_DELAY = 610;

            break;
          }
          case 360: {
            GAME_VIDEO_START_MS = 177000;
            INTRO_VIDEO_LENGTH = 180;
            START_NEXT_VIDEO_START_OFFSET = 2;
            START_NEXT_TO_SEC_DELAY = 610;

            break;
          }
          default:
            {
              const error = Errors.INVALID_LENGTH;
              error.message = error.message + ":" + GAME_LOOP_LENGTH;
              ErrorHandler.instance.normalErrorHandler(Errors.INVALID_LENGTH, true);
              return;
            }
            break;
        }
      }
    } else if (initResult.setting.betoffers[0].eventtype === "sulky") {
      START_NEXT_VIDEO_START_OFFSET = 2;
      START_NEXT_TO_SEC_DELAY = 710;

      switch (GAME_LOOP_LENGTH) {
        case 384: {
          GAME_VIDEO_START_MS = 177000;
          INTRO_VIDEO_LENGTH = 180;
          START_NEXT_VIDEO_START_OFFSET = 2;
          START_NEXT_TO_SEC_DELAY = 610;
          break;
        }
        case 432: {
          GAME_VIDEO_START_MS = 177000;
          INTRO_VIDEO_LENGTH = 180;
          START_NEXT_VIDEO_START_OFFSET = 2;
          START_NEXT_TO_SEC_DELAY = 610;
          break;
        }
        default: {
          const error = Errors.INVALID_LENGTH;
          error.message = error.message + ":" + GAME_LOOP_LENGTH;
          ErrorHandler.instance.normalErrorHandler(Errors.INVALID_LENGTH, true);
          return;
        }
      }
    } else if (initResult.setting.betoffers[0].eventtype === "rtt") {
      START_NEXT_VIDEO_START_OFFSET = 2;
      START_NEXT_TO_SEC_DELAY = 710;

      if (skinVersion === SkinTypeDefinition.CLASSIC) {
        switch (GAME_LOOP_LENGTH) {
          case 240: {
            GAME_VIDEO_START_MS = 202000;
            INTRO_VIDEO_LENGTH = 204;

            START_NEXT_VIDEO_START_OFFSET = 1;
            START_NEXT_TO_SEC_DELAY = 600;
            this.raceVideoDelay = 0;

            break;
          }
          case 120: {
            GAME_VIDEO_START_MS = 82000;
            INTRO_VIDEO_LENGTH = 84;

            START_NEXT_VIDEO_START_OFFSET = 1;
            START_NEXT_TO_SEC_DELAY = 600;
            this.raceVideoDelay = 0;

            break;
          }
          case 60: {
            GAME_VIDEO_START_MS = 22000;
            INTRO_VIDEO_LENGTH = 24;

            START_NEXT_VIDEO_START_OFFSET = 1;
            START_NEXT_TO_SEC_DELAY = 600;
            this.raceVideoDelay = 0;

            break;
          }
          default: {
            const error = Errors.INVALID_LENGTH;
            error.message = error.message + ":" + GAME_LOOP_LENGTH;
            ErrorHandler.instance.normalErrorHandler(Errors.INVALID_LENGTH, true);
            return;
          }
        }
      }
    }

    // set prepare for new game loop sync time bcause of extra time parameter
    if (this.extraLoadTime > START_NEXT_TO_SEC_DELAY) {
      const rest = this.extraLoadTime % 1000;
      const seconds = (this.extraLoadTime - rest) / 1000;

      if (this.withIntro) {
        START_NEXT_VIDEO_START_OFFSET += seconds + 1;
      } else {
        START_NEXT_VIDEO_START_OFFSET += seconds + 3;
      }

      START_NEXT_TO_SEC_DELAY = 1000 - (this.extraLoadTime - START_NEXT_TO_SEC_DELAY);
    } else {
      START_NEXT_TO_SEC_DELAY -= this.extraLoadTime;
    }
  }

  public isAllreadySetUp(): boolean {
    if (this.gameInfo !== undefined && this.gameInfo !== null) {
      return true;
    }

    return false;
  }

  // called when player touches the VideoOverlay -> start the video with the current server time
  public async onStarted() {
    Logger.debug("On Started");
    await this.initAction(true);
  }

  private async errorHandler(e: any, firstSetUp: boolean) {
    try {
      // set Language token if not allready set
      if (Languages.instance.getTranslations() === null) {
        const translationResult: ISockServResponseMessageTranslation = await ServerSocketLogic.instance.sendTranslationRequest();
        Languages.instance.setTranslations(translationResult.translations);
      }
    } catch (error) {
      // ignore error
    }

    if (e.code === Errors.TIME_REQUEST_TO_LONG.code || !firstSetUp) {
      Logger.error("Error:" + JSON.stringify(e, Object.getOwnPropertyNames(e)));

      setTimeout(() => {
        // restart automatic after some time
        this.tryRestart();
      }, Settings.onlineRetryTime);
    } else if (e.errorId === parseInt(Errors.DEV_NOT_ACTIVE.code, 10) || e.errorId === parseInt(Errors.DEV_REGISTERED.code, 10)) {
      const errElem = document.getElementById("startInfo");
      if (errElem) {
        let message = "";

        if (Languages.instance.getTranslations() !== null) {
          message = Languages.instance.getText("errTxt_" + e.errorId);
        } else {
          message = Errors.DEV_NOT_ACTIVE.message;

          if (e.errorId === parseInt(Errors.DEV_REGISTERED.code, 10)) {
            message = Errors.DEV_REGISTERED.message;
          }
        }

        message = message.replace("___DEVID___", "<span style='display:inline-block;margin:10px 0px;'>" + this.deviceId + "</span>");

        const msgElem = document.getElementById("startInfoMsg");
        if (msgElem) {
          msgElem.innerHTML = message;
        }

        errElem.style.display = "block";
      }
    } else {
      Logger.error("Set Up Error:" + JSON.stringify(e, Object.getOwnPropertyNames(e)));
      const errObj = new ErrorObj();
      if (e.code === Errors.SOCKET_SERVER_URL_REQUEST.code) {
        errObj.message =
          "There was an error in communication.<br/>Please check the stability of your internet.<br/>The software tries to reconnect.<br/>___ANIM___ Socket Server link request no connection.";

        if (Languages.instance.getTranslations() !== null) {
          errObj.message = Languages.instance.getText("err_comm_urll");
        }
        errObj.message = errObj.message.replace("___ANIM___", "<div class='dotLoaderAnim'></div>");
        errObj.code = Errors.SOCKET_SERVER_URL_REQUEST.code;
      } else {
        errObj.message = JSON.stringify(e, Object.getOwnPropertyNames(e));
        errObj.code = Errors.SETUP.code;
      }

      ErrorHandler.instance.normalErrorHandler(errObj, true, () => {
        // reload window on confirm
        this.reloadWindow();
      });

      setTimeout(() => {
        // reload window automatic after some time
        this.reloadWindow();
      }, Settings.onlineRetryTime);
    }
  }

  /**
   * connects to server and reads static settings for device
   * @param firstSetUp
   */
  public async initServerAction(firstSetUp: boolean) {
    try {
      if (!ServerSocketLogic.instance.serverSocketClient.isWebsocketOpen()) {
        await ServerSocketLogic.instance.connectWebSocketClient();
      }

      this.initResult = null;
      ErrorHandler.instance.clearReinitTimout();
      ErrorHandler.instance.hideErrorDialog();
      console.log(this.streamScreen);

      this.initResult = await ServerSocketLogic.instance.sendInitRequest(this.deviceId);

      if (firstSetUp) {
        // log when device started
        let startMsg = "Started Device, Version:" + Settings.versionNumber;

        const reloadType = Util.getUrlParameter(window.location.href, "reloadType");
        if (reloadType) {
          startMsg += " reload Type:" + reloadType;
        }
        if (this.streamScreen) {
          startMsg += " streamScreen:" + this.streamScreen;
        }
        const logMessage = new SockServLogMessage(Errors.LOG_INFO.code, startMsg);
        ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
          Logger.error("Send log Error:" + JSON.stringify(error));
        });
      }

      // mac adress device
      if (this.deviceId.length === 17 && this.deviceId.indexOf(":") > 1) {
        // device ID is a mac address
        Logic.isMacAddressDevice = true;

        // timezone not already set
        if (!Util.useSetTimeZoneOffset) {
          try {
            let timezoneStorageData: ITimezoneStorageData = { status: TimzoneStorageStatus.NO_DATA, statusLastStart: TimzoneStorageStatus.TO_OLD, timeZoneData: null };

            try {
              // read last set timezone from local storage
              timezoneStorageData = Util.getTimezoneDataFromLocalStorage();
              // set last device start
              window.localStorage.setItem("timeLastStart", new Date().getTime().toString());
            } catch (error) {
              // error reading timezone from storage
              this.startGeologRetryInterval(Settings.geolocIntervalTryTime);
              const logMessage = new SockServLogMessage(Errors.GEOLOG_REQUEST.code, "Error reading Geoloc from storage:" + error);
              ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
                Logger.error("Send log Error:" + JSON.stringify(errorData));
              });
            }
            // timezone data in storage and last device start not to long ago
            if (timezoneStorageData.status !== TimzoneStorageStatus.NO_DATA && timezoneStorageData.timeZoneData && timezoneStorageData.statusLastStart === TimzoneStorageStatus.VALID) {
              // use this data from local storage
              Util.setTimezoneData(
                timezoneStorageData.timeZoneData.timeZoneOffset,
                timezoneStorageData.timeZoneData.timezoneId,
                timezoneStorageData.timeZoneData.geoLat,
                timezoneStorageData.timeZoneData.geoLong
              );
              // to recheck start read timezone interval
              this.startGeologRetryInterval(Settings.geolocIntervalTryTime);

              const logMessage = new SockServLogMessage(
                Errors.LOG_INFO.code,
                "Set From storage Geolocation lat:" + Util.geoLat + " lon:" + Util.geoLong + " Timezone:" + Util.timezoneId + "  offset to UTC:" + Util.timeZoneOffset
              );
              ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
                Logger.error("Send log Error:" + JSON.stringify(errorData));
              });
            } else {
              // no timezone data in local storage or last device start to old
              // read from geoloc
              try {
                await Util.setTimezoneOffsetFromGeolocation(Settings.geolocTimout);
                const logMessage = new SockServLogMessage(
                  Errors.LOG_INFO.code,
                  "Geolocation lat:" +
                    Util.geoLat +
                    " lon:" +
                    Util.geoLong +
                    " Timezone:" +
                    Util.timezoneId +
                    "  offset to UTC:" +
                    Util.timeZoneOffset +
                    " geoloc result ip:" +
                    Util.geoResultIp +
                    "  geoloc result Offset:" +
                    Util.geoResultOffset +
                    "  geoloc result timezone:" +
                    Util.geoResultTimezone
                );
                ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
                  Logger.error("Send log Error:" + JSON.stringify(errorData));
                });
              } catch (error) {
                // error reading timezone
                // --> start retry interval
                this.startGeologRetryInterval(Settings.geolocIntervalTryTime);
                const logMessage = new SockServLogMessage(Errors.GEOLOG_REQUEST.code, "Error reading Geoloc:" + error);
                ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
                  Logger.error("Send log Error:" + JSON.stringify(errorData));
                });
              }
            }
          } catch (error) {
            const logMessage = new SockServLogMessage(Errors.GEOLOG_REQUEST.code, "Error getting timezone:" + error);
            ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
              Logger.error("Send log Error:" + JSON.stringify(errorData));
            });
          }
        }
      }

      // TODO TEST
      // throw new Error("e");
    } catch (e) {
      if (typeof e === "object" && e !== null && "errorId" in e && (e as { errorId: number }).errorId === 4303) {
        this.registered = false;
        this.handleInactiveOrUnregisteredDeviceError();
      } else {
        this.errorHandler(e, firstSetUp);
      }
    }
  }

  private startGeologRetryInterval(interval: number): void {
    this.geologIntervalCoount = 0;
    this.geologInterval = setInterval(() => {
      this.geologIntervalCoount++;
      if (this.geologIntervalCoount > Settings.geolocIntervalMaxCount) {
        clearInterval(this.geologInterval);
        Logger.info("-------------------------- Stopped Geolog Interval");
        return;
      }
      const oldOffset = Util.timeZoneOffset;
      const oldTimezone = Util.timezoneId;
      Util.setTimezoneOffsetFromGeolocation(Settings.geolocIntervalTimeout)
        .then(() => {
          clearInterval(this.geologInterval);
          if (oldOffset !== Util.timeZoneOffset || oldTimezone !== Util.timezoneId) {
            const logMessage = new SockServLogMessage(
              Errors.LOG_INFO.code,
              "Need to correct Interval Geolocation lat:" +
                Util.geoLat +
                " lon:" +
                Util.geoLong +
                " Timezone:" +
                Util.timezoneId +
                "  offset to UTC:" +
                Util.timeZoneOffset +
                " geoloc result ip:" +
                Util.geoResultIp +
                "  geoloc result Offset:" +
                Util.geoResultOffset +
                "  geoloc result timezone:" +
                Util.geoResultTimezone
            );
            ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
              Logger.error("Send log Error:" + JSON.stringify(errorData));
            });
            this.tryRestart();
          } else {
            const logMessage = new SockServLogMessage(
              Errors.LOG_INFO.code,
              "Checked and was OK, Interval Geolocation lat:" +
                Util.geoLat +
                " lon:" +
                Util.geoLong +
                " Timezone:" +
                Util.timezoneId +
                "  offset to UTC:" +
                Util.timeZoneOffset +
                " geoloc result ip:" +
                Util.geoResultIp +
                "  geoloc result Offset:" +
                Util.geoResultOffset +
                "  geoloc result timezone:" +
                Util.geoResultTimezone
            );
            ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
              Logger.error("Send log Error:" + JSON.stringify(errorData));
            });
          }
        })
        .catch((error) => {});
    }, interval);
  }

  /**
   * Reads current round infos from Server
   * calls initSettings
   * and handles race breaks
   * @param firstSetUp
   */
  public async initAction(firstSetUp: boolean) {
    this.canPlayOnSetUp = true;
    this.setUpCanplayReceived = false;
    this.setUpVideoStarted = false;
    this._programmSetup = true;

    if (this.initResult !== null) {
      try {
        // TODO TEST
        // await Util.sleep(10000);

        // read actual init games
        const sendData = new SockServGameRoundMessage(null, INIT_NUMB_PAST * -1, INIT_NUMB_FUTURE);
        const result: ISockServResponseMessageGameRound = await ServerSocketLogic.instance.sendGameRequest(sendData);

        // TODO TEST no past games
        // for(let n = 0 ; n < 7 ; n++){
        //   result.gamepool.shift();
        // }

        // TODO TEST
        // for(const game of result.gamepool){
        //
        //   if(game.id === "541_105_20210608" + "0262"){
        //     game.finish = null;
        //   }
        // }

        Logger.info("After init send Game round");
        const initData = { initResult: this.initResult, gamepool: result.gamepool, rttStatistics: result.rttStatistics };

        this.maxRoundNumber = initData.initResult.setting.betoffers[0].firstNumber + initData.initResult.setting.betoffers[0].nbrEvents - 1;

        // hide racebreak screen if it was shown before because of no internet connection
        if (!firstSetUp) {
          this.getGamesModel().hideGamePauseView();
          this.getGamesModel().setRaceBreak(false);
          this.getGamesModel().showRaceBreakAtStart = false;
        }

        // TODO TEST
        // await Util.sleep(10000);

        await this.initSettings(initData);

        if (this.gamesModel.showRaceBreakAtStart) {
          Logger.info("Game Paused at start:");
          this.canPlayOnSetUp = false;
          this.gamesModel.showGamePauseView(false);
        } else {
          Logger.info("Set Start video Time:" + this.intiVideoStartTime);
          Logic.startPlayingWithTime(this.intiVideoStartTime);
        }
        this._programmSetup = false;
        // TODO TEST
        // if(testCount === 1)
        //   throw new Error("e");

        // testCount++;
      } catch (e) {
        if (typeof e === "object" && e !== null && "errorId" in e && (e as { errorId: number }).errorId === 4303) {
          this.registered = false;
          this.handleInactiveOrUnregisteredDeviceError();
        } else {
          this.errorHandler(e, firstSetUp);
        }
      }
    } else {
      ErrorHandler.instance.normalErrorHandler(Errors.INIT_RES_NOT, true);
    }
  }

  // destroy resources ...
  public onExit(): void {}

  public onCanPlay(preparedVideoTime: number) {
    Logger.info("onCanPlay: " + preparedVideoTime);
    Logger.debug("Exact Video Second:" + this.gameTimer.getExactVideoSec());

    if (this.gamesModel.showRaceBreakAfterStartVideo) {
      this.gamesModel.showRaceBreakAfterStartVideo = false;
      this.getGamesModel().showGamePauseView(false);
    }

    if (this.canPlayOnSetUp) {
      this.canPlayOnSetUp = false;
      this.setUpCanplayReceived = true; // remember set up can play received

      if (Logic.getState() === VideoState.Intro) {
        this.canPlayIntroReceived = true;
      }
      Logger.info("Start first Playing of video preparedVideoTime:" + preparedVideoTime + " getVideoSec:" + this.gameTimer.getVideoSec());
      if ((this.gameTimer.getVideoSec() - preparedVideoTime) * 1000 > MAX_START_OFFSET) {
        // can play came to late

        // Update video time and play emediatly

        let setStartTime = this.gameTimer.getExactVideoSec();

        // the race start is delayed for some milliseconds after countdown 0
        if (Logic.getState() === VideoState.Race) {
          Logger.debug("Race first start, countdown 0 delay:" + RACE_AFTER_CONTOWN_ZERO_DELAY);
          setStartTime = setStartTime - RACE_AFTER_CONTOWN_ZERO_DELAY;
        }

        Logger.info("Start first Playing of video force, Set Start video Time:" + setStartTime);
        Logic.setVideoTime(setStartTime + VIDEO_START_DELAY_TIME + this.extraLoadTime / 1000);
        this.setUpVideoStarted = true; // remember that allready started
        Logic.play();
        // at terminal vidoescreen send to main process that vidoe is playing now
        if (settings.isTerminalVideoscreen && window.software) {
          window.software.hideVideoLoadScreen();
        }
        if (settings.isTerminalInGameVideoscreen && window.parent) {
          this.sendCloseLoadingScreenToParent();
        }
        Logger.debug("Start Play 1");
        if (Logic.getState() === VideoState.Race) {
          this.raceVideoStarted = true;
        }
      } else if (this.gamesModel.raceBreak) {
        this.setUpVideoStarted = true;
        // at terminal vidoescreen send to main process that vidoe is playing now
        if (settings.isTerminalVideoscreen && window.software) {
          window.software.hideVideoLoadScreen();
        }
        if (settings.isTerminalInGameVideoscreen && window.parent) {
          this.sendCloseLoadingScreenToParent();
        }
        Logger.info("In Race Break, handle as started");
      }
    } else {
      if (Logic.getState() === VideoState.Intro) {
        // Intro Video Can play

        let timeChanged: boolean = false;
        if (!this.canPlayIntroReceived) {
          // just hadle first can play event

          Logger.info("Can Play Intro Video, video Second:" + this.gameTimer.getVideoSec());
          this.canPlayIntroReceived = true;
          // Can play came to late
          const exactVideoSecond = this.gameTimer.getExactVideoSec();

          // for safety if intro video starts to late
          if ((exactVideoSecond - preparedVideoTime) * 1000 > MAX_INTRO_OFFSET && this.gameTimer.getVideoSec() < GAME_LOOP_LENGTH - 30) {
            Logger.info("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC needed to correct intro video time:" + exactVideoSecond);
            if (exactVideoSecond > 10) {
              // to not change state with time update
              Logger.info("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC much to late!!!");
            } else {
              // Correct Video Time
              Logic.setStateTime(exactVideoSecond + VIDEO_START_DELAY_TIME + this.extraLoadTime / 1000);
              timeChanged = true;
            }
          }
        } else {
          Logger.debug("Can Play not first time!");
        }

        Logic.play();
        Logger.debug("Start Play 2");

        if (timeChanged) {
          // When time was changed force fade to be finished
          Logger.info("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC Stop Fading");
          Logic.videoScreen.stopFading();
        }
      } else {
        this.raceVideoStarted = true;
        Logic.play(); // Race Video spimply play
        Logger.debug("Start Play 3");
      }
    }
  }

  public checkSetUpPlay(videoSec: number) {
    // when canplay was received within Time
    // start playing of video at this full second
    const withinTolerance = Math.abs(videoSec - this.intiVideoStartTime) < MAX_INTRO_OFFSET / 1000;

    if (this.setUpCanplayReceived && !this.setUpVideoStarted && (withinTolerance || videoSec >= this.intiVideoStartTime)) {
      this.setUpVideoStarted = true;
      Logger.debug("Start play check start, prepare Video Second:" + this.intiVideoStartTime + "  current Video Second:" + videoSec);

      if (!withinTolerance) {
        // checkSetUpPlay came after setup time -> adjust Video Time to current video second
        const setVideoTime = videoSec + this.extraLoadTime / 1000;
        Logic.setVideoTime(setVideoTime);
        Logger.debug("Check Play to late, set video time to:" + this.intiVideoStartTime + "  current Video Second:" + videoSec);
      } else if (Logic.getState() === VideoState.Intro) {
        //some mini time for start of video
        Logic.setStateTime(this.intiVideoStartTime + VIDEO_START_DELAY_TIME + this.extraLoadTime / 1000);
      }

      Logic.play();
      // at terminal vidoescreen send to main process that vidoe is playing now
      if (settings.isTerminalVideoscreen && window.software) {
        window.software.hideVideoLoadScreen();
      }
      if (settings.isTerminalInGameVideoscreen && window.parent) {
        this.sendCloseLoadingScreenToParent();
      }

      Logger.debug("Start Play 4");
      Logger.info("Start first Playing of video");
    }
  }

  // it is time to fade to another video state (e.g. end of video, ...)
  public onTimeForFade(targetState: VideoState) {
    if (targetState === VideoState.Race) {
      // Fade To RACE
      Logger.info("Time for fade to Race ");
      this.fadeToRaceReceived = true;

      const nextModel = this.withIntro ? this.getRaceDataModelByVideoSecondsState() : this.gamesModel.getCurrentGameData();
      if (nextModel) {
        nextModel.fadeToRaceReiceived = true;

        if (nextModel.result !== null) {
          // result for to be started race allready set

          Logger.info("Next Race Model result set, fade emediatly:" + nextModel.roundInfo.fullGameId);
          const f = async () => {
            if (nextModel.result !== null) {
              let raceFirstImageUrl = "";
              Logger.debug("**** New Result in onTimeForFade: " + nextModel.roundInfo.gameId + "  J: " + nextModel.roundInfo.jackpotValue + "  BT: " + nextModel.result.roundBonusType);

              if (nextModel.gameType === "box") {
                const nextModelbox = nextModel as ModelBox;
                if (nextModelbox.fightVideos) {
                  if (nextModelbox.fightVideos.round1.length > 0) {
                    // to fit with standard logic from other game
                    // result first image must be set with first image of first fight
                    raceFirstImageUrl = nextModelbox.fightVideos.round1[0].jpg;
                  } else {
                    Logger.error("Should at least have one clip!!");
                  }
                } else {
                  Logger.error("Should have fighter Videos!!");
                }
              } else {
                console.log("image url: " + this.getResultRaceUrl(nextModel.result).image);
                raceFirstImageUrl = this.getResultRaceUrl(nextModel.result).image;
              }

              this.fillRaceTexture(await this.loadTexture(raceFirstImageUrl, false));

              Logger.debug("**** New Image and round: " + nextModel.roundInfo.gameId + "  Img: " + this.getResultRaceUrl(nextModel.result).image);

              Logic.fadeTo(targetState);
            }
          };
          this.fadeToRaceReceived = false;
          f();
        } else {
          Logger.debug("Current Model result not set on fade time:" + nextModel.roundInfo.fullGameId);
        }
      } else {
        if (!this.gamesModel.raceBreak) {
          const error = Errors.GAME_NOT_LOADED;
          error.message = "Not enough future games are loaded,  no next Game";
          ErrorHandler.instance.normalErrorHandler(error, false);
        }
      }
    } else if (targetState === VideoState.Paused) {
      Logic.fadeTo(targetState);
    }
  }

  public getCurrentGameId(): number {
    return this.gamesModel.getCurrentGameData().roundInfo.gameId;
  }

  // is called when result is received from Server
  public checkStartRaceVideo(resModel: IModel) {
    console.log("tescanplay " + Logic.getExactTimeUntilRace(this.gamesModel.getNextGameData().getGameStartTime()) + " " + this.fadeToRaceReceived);
    if (this.fadeToRaceReceived) {
      // result fot from server after intro video finished
      this.fadeToRaceReceived = false;

      const nextModel = this.getRaceDataModelByVideoSecondsState();

      if (nextModel.roundInfo.gameId !== resModel.roundInfo.gameId) {
        const error = Errors.RESULT_WRONG_GAME;
        error.message = Errors.RESULT_WRONG_GAME.message + ", id Next:" + nextModel.roundInfo.gameId + ", id Result:" + resModel.roundInfo.gameId;
        ErrorHandler.instance.normalErrorHandler(error, false);
      }

      if (nextModel.result !== null) {
        Logger.info("Current Model result set, fade to race after result received:" + resModel.roundInfo.gameId);
        const f = async () => {
          if (nextModel.result !== null) {
            let raceFirstImageUrl = "";

            if (nextModel.gameType === "box") {
              const nextModelbox = nextModel as ModelBox;
              if (nextModelbox.fightVideos) {
                if (nextModelbox.fightVideos.round1.length > 0) {
                  // to fit with standard logic from other game
                  // result first image must be set with first image of first fight
                  raceFirstImageUrl = nextModelbox.fightVideos.round1[0].jpg;
                } else {
                  Logger.error("Should at least have one clip!!");
                }
              } else {
                Logger.error("Should have fighter Videos!!");
              }
            } else {
              raceFirstImageUrl = this.getResultRaceUrl(nextModel.result).image;
            }

            this.fillRaceTexture(await this.loadTexture(raceFirstImageUrl, false));

            Logic.fadeTo(VideoState.Race);
          }
        };
        f();
      }
    }
    return false;
  }

  public checkResultDalayToBig() {
    const curModel = this.gamesModel.getCurrentGameData();

    if (curModel.fadeToRaceReiceived && curModel.result === null) {
      curModel.gotNoResult = true;
      const nextRaceModel = this.gamesModel.getNextGameData();

      if (nextRaceModel !== null && typeof nextRaceModel !== "undefined") {
        let bottomText = Logic.implementation.getText("roundCanceled");
        // when no result because of no internet connection, giv info
        if (!ServerSocketLogic.instance.serverSocketClient.isWebsocketOpenState()) {
          bottomText = Logic.implementation.getText("noConnection");
        }

        Logic.showPauseOverlay("immediately", {
          pauseEndTimeText: Logic.implementation.getText("canceled"),
          bottomText,
          nextRaceTime: new Date(nextRaceModel.roundInfo.videoStartUnix),
          nextRound: nextRaceModel.roundInfo,
          canceledRace: true
        });
      } else {
        // no next game round
        // show race breake screen with standart races start time
        let startString = "";
        const initResult = (Logic.implementation as LogicImplementation).getInitResult();
        if (initResult !== null) {
          startString = Util.formatRaceBreakTime(initResult.setting.betoffers[0].starttime);
        }

        Logic.showPauseOverlay("immediately", {
          pauseEndTimeText: startString,
          bottomText: Logic.implementation.getText("raceBreakTxt")
        });

        // when no result because of no internet connection, giv info
        if (!ServerSocketLogic.instance.serverSocketClient.isWebsocketOpenState()) {
          ErrorHandler.instance.showErrorDialog(Languages.instance.getText("err_head"), ErrorHandler.instance.getErrorCommunicationErrorText());
        }
      }

      const logMessage = new SockServLogMessage(Errors.RESULT_NOT_RECEIVED.code, Errors.RESULT_NOT_RECEIVED.message + curModel.roundInfo.fullGameId);
      ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
        Logger.error("Send log Error:" + JSON.stringify(errorData));
      });
    } else {
      curModel.gotNoResult = true;
      const nextRaceModel = this.gamesModel.getNextGameData();

      // fade to race not received, no next model, but race shuld allready
      // have been started --> show race breake view
      if (!(nextRaceModel !== null && typeof nextRaceModel !== "undefined") && !ServerSocketLogic.instance.serverSocketClient.isWebsocketOpenState()) {
        // no next game round
        // show race breake screen with standart races start time
        let startString = "";
        const initResult = (Logic.implementation as LogicImplementation).getInitResult();
        if (initResult !== null) {
          startString = Util.formatRaceBreakTime(initResult.setting.betoffers[0].starttime);
        }

        Logic.showPauseOverlay("immediately", {
          pauseEndTimeText: startString,
          bottomText: Logic.implementation.getText("raceBreakTxt")
        });

        // when no result because of no internet connection, giv info
        if (!ServerSocketLogic.instance.serverSocketClient.isWebsocketOpenState()) {
          ErrorHandler.instance.showErrorDialog(Languages.instance.getText("err_head"), ErrorHandler.instance.getErrorCommunicationErrorText());
        }
      }
    }
  }

  // it is time to start playing
  public onTimeForPlay(targetState: VideoState) {
    console.log("tescanplay " + Logic.getExactTimeUntilRace(this.gamesModel.getNextGameData().getGameStartTime()) + " " + this.fadeToRaceReceived);
    Logger.info("onTimeForPlay: " + targetState);

    // if (targetState === VideoState.Intro) {
    //   this.canPlayIntroReceived = false;
    // }

    // at multiple game legth betoffer
    if (Logic.implementation.getIsMultipleGameLengthes() && targetState === VideoState.Intro) {
      // before next intro starts
      // game length for intro must be updated with current round data
      Logic.implementation.updateIntroGameLength(Logic.implementation.getGameInfo().gameLength);
    }

    Logic.startPlayingWithState(targetState, targetState === VideoState.Intro ? 0.0 : 0.0);
  }

  public onFillStateInfo(state: VideoState): VideoUrlInfo[] {
    Logger.debug("onFillStateInfo: " + state);

    if (
      this.gamesModel.raceBreak && // dont react during race break
      !(state === VideoState.Race && this.gamesModel.checkIfLastBeforeABreak(this.getRaceDataIndexByVideoSecondsState(), null))
    ) {
      // only if last race is started
      Logger.debug("Is in race braek: " + state);
      return [];
    }

    if (state === VideoState.Intro) {
      Logger.info("onStartIntro");
      const initCurModel = this.onStartIntroAction(false, false);
      if (initCurModel && initCurModel.gameType === "box") {
        // const logMessage = new SockServLogMessage(Errors.LOG_INFO.code,"Intro Path:" + ((initCurModel as ModelBox).getIntroKickBoxUrls((initCurModel as ModelBox).wgpInfo).video));
        // ServerSocketLogic.instance.sendLogRequest(logMessage).catch( (error) => {
        //   Logger.error("Send log Error:" + JSON.stringify(error));
        // });

        return [
          {
            url: (initCurModel as ModelBox).getIntroKickBoxUrls((initCurModel as ModelBox).wgpInfo).video,
            length: Logic.getIntroLength()
          }
        ];
      } else {
        //return [this.getIntroUrls(this.initResult!).video];
        return [
          {
            url: this.getIntroUrls(this.initResult!).video,
            length: Logic.getIntroLength()
          }
        ];
      }

      //return this.getIntroUrls(this.initResult!).video;
    } else {
      Logger.info("onStartRace");

      const curModel = this.getRaceDataModelByVideoSecondsState();
      this.lastStartRaceId = curModel.roundInfo.fullGameId;
      if (!this.getGamesModel().raceBreak && typeof this.setNextModel !== "undefined" && this.setNextModel !== null) {
        if (this.setNextModel.roundInfo.fullGameId !== curModel.roundInfo.fullGameId) {
          Logger.error("Preview of race and started are different!!! preview:" + this.setNextModel.roundInfo.fullGameId + " start:" + curModel.roundInfo.fullGameId);

          const logMessage = new SockServLogMessage(
            Errors.RACES_DIFF.code,
            "Preview of race and started are different!!! preview:" + this.setNextModel.roundInfo.fullGameId + " start:" + curModel.roundInfo.fullGameId
          );
          ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
            Logger.error("Send log Error:" + JSON.stringify(error));
          });
        }
      }

      //TODO TEST
      //curModel.result = null;

      if (!this.withIntro && curModel.result === null && this.getGameTimer().getExactVideoSec() >= GAME_LOOP_LENGTH - 4) {
        Logger.debug("Between 56 and 60 seconds - No new result ready yet. Retry!");
        /*this.onFillStateInfo(VideoState.Race);
        return [];*/
        this.reloadWindow();
      }

      if (curModel.result === null) {
        const errorObj = Errors.RESULT_NOT_START_RACE;
        errorObj.message = errorObj.message + curModel.roundInfo.fullGameId;
        ErrorHandler.instance.normalErrorHandler(errorObj, false);

        return [];
      } else {
        Logger.info("Start Race Video Set Data:" + curModel.roundInfo.fullGameId + " Result:" + JSON.stringify(curModel.result));

        // format result time
        const formatedResul = Object.assign({}, curModel.result);
        formatedResul.first = Object.assign({}, curModel.result.first);
        formatedResul.second = Object.assign({}, curModel.result.second);
        if (curModel.result.third) {
          formatedResul.third = Object.assign({}, curModel.result.third);
        }
        const firstTime = parseFloat(curModel.result.first.time);
        if (firstTime < 60) {
          formatedResul.first.time = Logic.implementation.formatTime(firstTime, {
            minutes: false,
            seconds: true,
            hundredth: true
          });
        } else {
          formatedResul.first.time = Logic.implementation.formatTime(firstTime, {
            minutes: true,
            seconds: true,
            hundredth: true
          });
        }
        const secondTime = parseFloat(curModel.result.second.time);
        if (secondTime < 60) {
          formatedResul.second.time = Logic.implementation.formatTime(secondTime, {
            minutes: false,
            seconds: true,
            hundredth: true
          });
        } else {
          formatedResul.second.time = Logic.implementation.formatTime(secondTime, {
            minutes: true,
            seconds: true,
            hundredth: true
          });
        }

        if (formatedResul.third && curModel.result.third) {
          const thirdTime = parseFloat(curModel.result.third.time);
          if (thirdTime < 60) {
            formatedResul.third.time = Logic.implementation.formatTime(thirdTime, {
              minutes: false,
              seconds: true,
              hundredth: true
            });
          } else {
            formatedResul.third.time = Logic.implementation.formatTime(thirdTime, {
              minutes: true,
              seconds: true,
              hundredth: true
            });
          }
        }

        Logger.debug("Fill Result:" + curModel.roundInfo.fullGameId + " Result:" + JSON.stringify(formatedResul));
        if (Logic.videoScreen instanceof VideoScreenHorseC4) {
          Logic.videoScreen.fillResult(formatedResul);
        } else if (!(Logic.videoScreen instanceof VideoScreenHorseC4)) {
          Logic.videoScreen.fillResult(curModel.track, curModel.roundInfo, curModel.colors, formatedResul, curModel.raceIntervals, curModel.drivers, curModel.odds);
        }

        // at horse video mute time depends on finish1 time
        if ((curModel.gameType === "horse" || curModel.gameType === "sulky") && formatedResul.resultOffsetTime) {
          Logic.videoRef.horseMuteTime = formatedResul.resultOffsetTime;
        }

        if (curModel.gameType === "box") {
          const kickboxScreen = Logic.videoScreen as VideoScreenKickBox;
          const kickboxModel = curModel as ModelBox;
          let resolvedUrls: string[] = [];

          if (kickboxScreen !== undefined && kickboxModel.fightResult && kickboxModel.fightVideos) {
            // for kickbox we need some additional data
            // additionally the videourls need to be set up correctly
            kickboxScreen.fillAdditionalResult(kickboxModel.drivers, kickboxModel.fightResult, kickboxModel.fightVideos);

            Logger.debug("Set Hits:" + JSON.stringify(kickboxModel.fightResult.hits));

            resolvedUrls = (curModel as ModelBox).getRaceVideos();
            const raceVideoInfos = (curModel as ModelBox).getRaceVideoInfos();

            const result = resolvedUrls.map((x) => {
              return {
                url: x,
                length: raceVideoInfos.filter((info) => x.includes(info.url))[0].length
              };
            });

            Logger.debug("Set Kickbox Videos:" + JSON.stringify(result));

            return result;
          } else {
            Logger.error("Error kickbox no screen fighterResult of fighterVideos");
            const logMessage = new SockServLogMessage(Errors.KICKBOX_DATA_ERROR.code, "Error kickbox no screen fighterResult of fighterVideos");
            ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
              Logger.error("Send log Error:" + JSON.stringify(errorData));
            });
          }
        } else {
          const videoUrl = this.getResultRaceUrl(curModel.result).video;
          return [
            {
              url: videoUrl,
              length: Logic.getRaceLength()
            }
          ];
        }
      }
    }

    return [];
  }

  private isHorseC4Model(object: unknown): object is IHorseDog6C4Model {
    return Object.prototype.hasOwnProperty.call(object, "prevRoundInfo");
  }

  public getIntroUrls(initResult: ISockServResponseMessageInit): IVideoUrls {
    if (initResult !== null) {
      let videoData = {
        video: "",
        image: "",
        sound: ""
      };

      if (this.getIsMultipleGameLengthes()) {
        const introVideos = initResult.intro as IMultipleIntroVideos[];
        let videosSet = false;
        for (const introVideo of introVideos) {
          if (introVideo.roundInterval === GAME_LOOP_LENGTH) {
            videoData = {
              video: introVideo.mp4,
              image: introVideo.jpg,
              sound: introVideo.mp3
            };
            videosSet = true;
          }
        }

        if (!videosSet) {
          Logger.error("NO matching intro video");
          const logMessage = new SockServLogMessage(Errors.NO_MATCHING_INTRO.code, "NO matching intro video, gameLength:" + GAME_LOOP_LENGTH);
          ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
            Logger.error("Send log Error:" + JSON.stringify(error));
          });
        }

        //TODO TEST
        // if (GAME_LOOP_LENGTH === 240) {
        //   videoData = {
        //     video: "/.local/dog63/intro_4_oao_h.mp4?token=ZMQF9G3MSX3UQZWC",
        //     image: "/.local/dog63/intro_4_oao_h.jpg?token=ZMQF9G3MSX3UQZWC",
        //     sound: "/.local/horse/intro.mp3?token=ZMQF9G3MSX3UQZWC"
        //   };
        // } else if (GAME_LOOP_LENGTH === 300) {
        //   videoData = {
        //     video: "/.local/dog63/intro_5_oao_h.mp4?token=ZMQF9G3MSX3UQZWC",
        //     image: "/.local/dog63/intro_5_oao_h.jpg?token=ZMQF9G3MSX3UQZWC",
        //     sound: "/.local/horse/intro.mp3?token=ZMQF9G3MSX3UQZWC"
        //   };
        // } else if (GAME_LOOP_LENGTH === 360) {
        //   videoData = {
        //     video: "/.local/dog63/intro_6_oao_crf27.mp4?token=ZMQF9G3MSX3UQZWC",
        //     image: "/.local/dog63/intro_6_oao_crf27.jpg?token=ZMQF9G3MSX3UQZWC",
        //     sound: "/.local/horse/intro.mp3?token=ZMQF9G3MSX3UQZWC"
        //   };
        // }
      } else {
        const initVideoData = initResult.intro as IMultipleIntroVideos;
        videoData = {
          video: initVideoData.mp4,
          image: initVideoData.jpg,
          sound: initVideoData.mp3
        };
      }
      if (settings.sdCardPath && settings.isTerminalVideoscreen) {
        const initVideoData = initResult.intro as IMultipleIntroVideos;
        videoData = {
          video: "file:///" + settings.sdCardPath + initVideoData.mp4,
          image: "file:///" + settings.sdCardPath + initVideoData.jpg,
          sound: "file:///" + settings.sdCardPath + initVideoData.mp3
        };
      }

      // TODO TEST
      // if(initResult.setting.betoffers.length > 0){
      //   if(this.initResult?.setting.betoffers[0].eventtype === "horse"){
      //     videoData = {video: "/.local/horse/intro_5_h.mp4?token=ZMQF9G3MSX3UQZWC", image: "/.local/horse/intro_5_h.jpg?token=ZMQF9G3MSX3UQZWC", sound: "/.local/horse/intro.mp3?token=ZMQF9G3MSX3UQZWC"};
      //   }
      // }
      // TODO TEST
      // if (initResult.setting.betoffers.length > 0) {
      //   if (this.initResult?.setting.betoffers[0].eventtype === "dog63") {
      //     videoData = {video: "/.local/dog63/intro_5_it_h.mp4?token=ZMQF9G3MSX3UQZWC", image: "/.local/dog63/intro_5_it_h.jpg?token=ZMQF9G3MSX3UQZWC", sound: "/.local/dog63/intro.mp3?token=ZMQF9G3MSX3UQZWC"};
      //   }
      // }
      // TODO TEST
      // videoData.image = "/.local/sulky7/intro_6_h50.jpg?token=ZMQF9G3MSX3UQZWC";
      // videoData.sound =  "/.local/sulky7/intro.mp3?token=ZMQF9G3MSX3UQZWC";
      // if(initResult.setting.betoffers.length > 0){
      //   if(this.initResult?.setting.betoffers[0].eventtype === "sulky"){
      //     videoData = {video: "/.local/sulky7/intro_6_h50.mp4?token=ZMQF9G3MSX3UQZWC", image: "/.local/sulky7/intro_6_h50.jpg?token=ZMQF9G3MSX3UQZWC", sound: "/.local/sulky7/intro.mp3?token=ZMQF9G3MSX3UQZWC"};
      //   }
      // }

      // // TODO TEST
      // if(initResult.setting.betoffers.length > 0){
      //   if(this.initResult?.setting.betoffers[0].eventtype === "horse"){
      //     videoData = {video: "/.local/horse_c4/intro_4_h.mp4?token=ZMQF9G3MSX3UQZWC", image: "/.local/horse_c4/intro_4_h.jpg?token=ZMQF9G3MSX3UQZWC", sound: "/.local/horse_c4/intro.mp3?token=ZMQF9G3MSX3UQZWC"};
      //     // videoData = {video: "/sdcard/DSVideo/horse/intro_4_h.mp4?token=ZMQF9G3MSX3UQZWC", image: "/sdcard/DSVideo/horse/intro_4_h.jpg?token=ZMQF9G3MSX3UQZWC", sound: "/sdcard/DSVideo/horse/intro.mp3?token=ZMQF9G3MSX3UQZWC"};
      //   }
      // }

      // // TODO TEST
      // if(initResult.setting.betoffers.length > 0){
      //   if(this.initResult?.setting.betoffers[0].eventtype === "dog"){
      //     videoData = {video: "/.local/dog6_c4/intro_4_h.mp4?token=ZMQF9G3MSX3UQZWC", image: "/.local/dog6_c4/intro_4_h.jpg?token=ZMQF9G3MSX3UQZWC", sound: "/.local/dog6_c4/intro.mp3?token=ZMQF9G3MSX3UQZWC"};
      //     // videoData = {video: "/sdcard/DSVideo/dog/intro_4_h.mp4?token=ZMQF9G3MSX3UQZWC", image: "/sdcard/DSVideo/dog/intro_4_h.jpg?token=ZMQF9G3MSX3UQZWC", sound: "/sdcard/DSVideo/dog/intro.mp3?token=ZMQF9G3MSX3UQZWC"};
      //   }
      // }

      // TODO TEST
      // if (initResult.setting.betoffers.length > 0) {
      //   if (this.initResult?.setting.betoffers[0].eventtype === "rtt") {
      //     videoData = {
      //       video: "/.local/roulette_c4/intro_2_h.mp4?token=ZMQF9G3MSX3UQZWC",
      //       image: "/.local/roulette_c4/intro_2_h.jpg?token=ZMQF9G3MSX3UQZWC",
      //       sound: "/.local/roulette_c4/intro.mp3?token=ZMQF9G3MSX3UQZWC"
      //     };
      //     // videoData = {video: "/sdcard/DSVideo/rtt17/intro_4_h.mp4?token=ZMQF9G3MSX3UQZWC", image: "/sdcard/DSVideo/rtt17/intro.jpg?token=ZMQF9G3MSX3UQZWC", sound: "/sdcard/DSVideo/rtt17/intro.mp3?token=ZMQF9G3MSX3UQZWC"};
      //   }
      // }

      if (initResult.setting.useOverlays) {
        //initResult.setting.useOverlays
        console.log(videoData.video);
        const split_1 = videoData.video.split("intro");
        videoData.video = "";
        videoData.image = "";
        const split_2 = split_1[1].split("?");
        split_2[0] = "intro_4_oao_crf27_gridcheck02.";
        videoData.video += split_1[0] + split_2[0] + "mp4" + (split_2[1] ? "?" + split_2[1] : "");
        videoData.image += split_1[0] + split_2[0] + "jpg" + (split_2[1] ? "?" + split_2[1] : "");
        console.log(videoData.video);
      }

      Logger.debug("Intro Video Data:" + JSON.stringify(videoData));
      return this.fixVideoUrlsPath(videoData);
    } else {
      return { video: "", image: "" };
    }
  }

  public getResultRaceUrl(result: IResultExtern): IVideoUrls {
    // TODO TEST
    // if(this.initResult){
    //   if(this.initResult.setting.betoffers.length > 0) {
    //     if (this.initResult?.setting.betoffers[0].eventtype === "horse") {
    //       const vidUrls: IVideoUrls = {video: "/.local/horse_c4/R0001_h.mp4", sound: "/.local/horse_c4/intro.mp3", image: "/.local/horse_c4/R0001_h.jpg"}
    //       // const vidUrls: IVideoUrls = {video: "/sdcard/DSVideo/horse/R0001_h.mp4", sound: "/sdcard/DSVideo/horse/intro.mp3", image: "/sdcard/DSVideo/horse/R0001_h.jpg"}
    //       return vidUrls;
    //     }
    //   }
    // }
    // TODO TEST
    // if(this.initResult){
    //   if(this.initResult.setting.betoffers.length > 0) {
    //     if (this.initResult?.setting.betoffers[0].eventtype === "dog") {
    //       const vidUrls: IVideoUrls = {video: "/.local/dog6_c4/R0001_h.mp4", sound: "/.local/dog6_c4/intro.mp3", image: "/.local/dog6_c4/R0001_h.jpg"}
    //       // const vidUrls: IVideoUrls = {video: "/sdcard/DSVideo/dog/R0001_h.mp4", sound: "/sdcard/DSVideo/dog/intro.mp3", image: "/sdcard/DSVideo/dog/R0001_h.jpg"}
    //       return vidUrls;
    //     }
    //   }
    // }
    // TODO TEST
    // if(this.initResult){
    //   if(this.initResult.setting.betoffers.length > 0) {
    //     if (this.initResult?.setting.betoffers[0].eventtype === "rtt") {
    //       const vidUrls: IVideoUrls = {video: "/.local/roulette_c4/R0001_h.mp4", sound: "/.local/roulette_c4/intro.mp3", image: "/.local/roulette_c4/R0001_h.jpg"}
    //       // const vidUrls: IVideoUrls = {video: "/sdcard/DSVideo/rtt17/00_01_g.fhd.mp4", sound: "/sdcard/DSVideo/rtt17/intro.mp3", image: "/sdcard/DSVideo/rtt17/00_01_g.fhd.jpg"}
    //       return vidUrls;
    //     }
    //   }
    // }

    // TODO TEST
    // if (settings.isTerminalVideoscreen) {
    //   switch (Logic.gameInfo?.gameType) {
    //     case "dog6":
    //       const vidUrls: IVideoUrls = { video: "/sdcard/dog6/R0001_h.mp4", sound: "/sdcard/dog6/intro.mp3", image: "/sdcard/dog6/R0001_h.jpg" };
    //       return vidUrls;
    //       break;
    //     case "dog8":
    //       const vidUrlsdog8: IVideoUrls = { video: "/sdcard/dog8/R0001_h.mp4", sound: "/sdcard/dog8/intro.mp3", image: "/sdcard/dog8/R0001_h.jpg" };
    //       return vidUrlsdog8;
    //       break;
    //
    //     case "dog63":
    //       const vidUrlsdog63: IVideoUrls = { video: "/sdcard/dog63/R0001_5_h.mp4", sound: "/sdcard/dog63/intro.mp3", image: "/sdcard/dog63/R0001_5_h.jpg" };
    //       return vidUrlsdog63;
    //       break;
    //
    //     case "horse":
    //       const vidUrlshorse: IVideoUrls = { video: "/sdcard/horse7/R0001_h.mp4", sound: "/sdcard/horse7/intro.mp3", image: "/sdcard/horse7/R0001_h.jpg" };
    //       return vidUrlshorse;
    //       break;
    //
    //     case "kart5":
    //       const vidUrlskart: IVideoUrls = { video: "/sdcard/kart5/R0001_h.mp4", sound: "/sdcard/kart5/intro.mp3", image: "/sdcard/kart5/R0001_h.jpg" };
    //       return vidUrlskart;
    //       break;
    //
    //     case "sulky":
    //       const vidUrlssulky: IVideoUrls = { video: "/sdcard/sulky7/R0015_h50.mp4", sound: "/sdcard/sulky7/intro.mp3", image: "/sdcard/sulky7/R0015_h50.jpg" };
    //       return vidUrlssulky;
    //       break;
    //
    //     default:
    //   }
    // }
    const videoUrls = this.getVideoUrlsWithLink(result.videoname);

    if (settings.sdCardPath && settings.isTerminalVideoscreen) {
      // at terminal use sdcard Path
      videoUrls.video = "file:///" + settings.sdCardPath + videoUrls.video;
      videoUrls.image = "file:///" + settings.sdCardPath + videoUrls.image;
      if (videoUrls.sound) {
        videoUrls.sound = "file:///" + settings.sdCardPath + videoUrls.sound;
      }
    }
    return videoUrls;
  }

  public getRaceDataModelByVideoSecondsState(): ModelBase {
    // when round switch done in Game Model
    if (!this.withIntro && this.gameTimer.getVideoSec() >= GAME_LOOP_LENGTH - 4) {
      return this.gamesModel.getNextGameData();
    }
    if (this.gameTimer.getVideoSec() >= Util.floatNumber(GAME_VIDEO_START_MS / 1000, 3)) {
      // to be started race is current
      return this.gamesModel.getCurrentGameData();
    } else {
      // video time before round switch

      // to be started race is next
      return this.gamesModel.getNextGameData();
    }
  }

  public getRaceDataIndexByVideoSecondsState(): number {
    // when round switch done in Game Model
    if (this.gameTimer.getVideoSec() >= Util.floatNumber(GAME_VIDEO_START_MS / 1000, 3)) {
      // to be started race is current
      return this.gamesModel.getIndexCurGame();
    } else {
      // video time before round switch

      // to be started race is next
      return this.gamesModel.getIndexCurGame() - 1;
    }
  }

  public getRaceStartTime(): number {
    if (this.gamesModel.getNextGameData() && this.gamesModel.getNextGameData().roundInfo && this.gamesModel.getNextGameData().roundInfo.videoStartUnix)
      return this.gamesModel.getNextGameData().roundInfo.videoStartUnix;
    else return this.getCurrentIntroGameLength();
  }

  public raceStarted(): boolean {
    return this.raceVideoStarted;
  }

  public onStartIntroAction(simulateGameSwitchDone: boolean, ignoreRaceBreak: boolean): ModelBase {
    if (!this.withIntro) {
      Logger.debug("Skip intro");
      return this.getGamesModel().getCurrentGameData();
    }
    if (this.gamesModel.raceBreak && !ignoreRaceBreak) {
      Logger.debug("ON Start Intro Action return because off racebreak"); // TODO Handle racebreak correctly!
      const model = this.gamesModel.getCurrentGameData();
      return model;
    }

    let curModel: ModelBase | null = null;
    let beforeModel: ModelBase | null = null;

    Logger.debug(
      "ON Start Intro Action getVideoSec:" +
        this.gameTimer.getVideoSec() +
        " GAME_VIDEO_START_MS/ 1000:" +
        Util.floatNumber(GAME_VIDEO_START_MS / 1000, 3) +
        " INTRO_VIDEO_LENGTH:" +
        INTRO_VIDEO_LENGTH
    );

    // at start up when game loop switch allready done, but intro video not finished
    if (this.gameTimer.getVideoSec() >= Util.floatNumber(GAME_VIDEO_START_MS, 3) / 1000 && this.gameTimer.getVideoSec() < INTRO_VIDEO_LENGTH && !simulateGameSwitchDone) {
      Logger.debug(
        "ON Start Intro Action, take current race data at start up, getVideoSec:" +
          this.gameTimer.getVideoSec() +
          " GAME_VIDEO_START_MS:" +
          GAME_VIDEO_START_MS +
          " INTRO_VIDEO_LENGTH:" +
          INTRO_VIDEO_LENGTH
      );
      // take current (allready started game) data
      curModel = this.gamesModel.getCurrentGameData();
      if (Logic.videoScreen instanceof VideoScreenHorseC4 || Logic.videoScreen instanceof VideoScreenRouletteC4) {
        beforeModel = this.gamesModel.getBeforeGameData();
      }
    } else {
      // normal loop take nex game data
      curModel = this.gamesModel.getNextGameData();
      if (Logic.videoScreen instanceof VideoScreenHorseC4 || Logic.videoScreen instanceof VideoScreenRouletteC4) {
        beforeModel = this.gamesModel.getCurrentGameData();
      }
    }

    this.setNextModel = curModel;
    // model.currentRound++;
    Logger.info(
      "BBBBBBBBBBBBBBBBBB for round:" +
        curModel.roundInfo.gameId +
        " bonus Value:" +
        curModel.roundInfo.jackpotValue +
        " Old bonus Value:" +
        curModel.roundInfo.oldJackpotValue +
        " bonus History:" +
        curModel.jackpotHistory
    );
    Logger.debug("BBBBBBBBBBBBBBBBBB history:" + JSON.stringify(curModel.history));

    if (curModel.roundInfo.jackpotValue && curModel.roundInfo.oldJackpotValue) {
      if (curModel.roundInfo.oldJackpotValue > curModel.roundInfo.jackpotValue) {
        // when jackpot was won, old is bigger than new --> set old to new to not count down
        curModel.roundInfo.oldJackpotValue = curModel.roundInfo.jackpotValue;
        Logger.debug("Set old to new Jackpot Value:" + curModel.roundInfo.oldJackpotValue + " for round:" + curModel.roundInfo.fullGameId);
      }
    }

    let setRoundInfo = curModel.roundInfo;
    let setHistory = curModel.history;
    this.hasItalianShedule = false;
    if (
      curModel.roundInfo.it_code_event !== undefined &&
      curModel.roundInfo.it_code_event !== null &&
      curModel.roundInfo.it_code_event !== "" &&
      curModel.roundInfo.it_code_schedule !== undefined &&
      curModel.roundInfo.it_code_schedule !== null &&
      curModel.roundInfo.it_code_schedule !== ""
    ) {
      this.hasItalianShedule = true;

      setRoundInfo = Object.assign({}, curModel.roundInfo);
      setRoundInfo.sendPlan = curModel.roundInfo.it_code_schedule;
      setRoundInfo.raceNumber = curModel.roundInfo.it_code_event;
      setRoundInfo.gameId = parseInt(curModel.roundInfo.it_code_event, 10);

      setHistory = [];

      for (const curHistory of curModel.history) {
        const copyHist = Object.assign({}, curHistory);
        if (copyHist.it_code_event) {
          copyHist.round = parseInt(copyHist.it_code_event, 10);
        }
        setHistory.push(copyHist);
      }
    }
    if (Logic.videoScreen instanceof VideoScreenRouletteC4) {
      const rttHistory: IRouletteRoundHistory[] = [];
      for (const histElem of setHistory) {
        rttHistory.push({ round: histElem.round, winnerNumber: histElem.first.driverIndex });
      }

      if (beforeModel) {
        const lastRoundInfo = beforeModel.roundInfo;
        lastRoundInfo.winningNumber = beforeModel?.result?.first.driverIndex;
        Logic.videoScreen.fillLastRoundInfo(lastRoundInfo);
      } else {
        Logger.error("No before Model data");
      }

      Logic.videoScreen.fillRound(setRoundInfo, rttHistory, (beforeModel as ModelRtt).statusData);
    } else if (Logic.videoScreen instanceof VideoScreenHorseC4) {
      if (beforeModel) {
        Logic.videoScreen.fillPrevRound(beforeModel.roundInfo);
      } else {
        const errMsg = "Before Model not set game:" + this.gameInfo.gameType;
        Logger.error(errMsg);
        const logMessage = new SockServLogMessage(Errors.INVALID_DATA.code, errMsg);
        ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
          Logger.error("Send log Error:" + JSON.stringify(errorData));
        });
      }

      const bonus: IHorseC4Bonus = ModelHorseC4.bonus;

      if (curModel.roundInfo.jackpotValue) {
        bonus.value = curModel.roundInfo.jackpotValue;
      }

      bonus.infoText4 = Languages.instance.getText("infotext_lotoffun") + " " + Languages.instance.getText("c4GameNa" + this.gameInfo.eventType);
      bonus.infoText5 = Languages.instance.getText("infotext_current_id") + " " + curModel.roundInfo.fullGameId;

      console.log(curModel.jackpotHistory);

      if (curModel.jackpotHistory && curModel.jackpotHistory.length > 0) {
        const curJackpotData = curModel.jackpotHistory[0];
        bonus.infoText1 = Languages.instance.getText("infotext_last_bonus") + " " + Util.formatValueC4(curJackpotData.amountUnformated, 2) + " | " + curJackpotData.date + " " + curJackpotData.time;
        bonus.infoText2 = Languages.instance.getText("infotext_last_bonus_win") + " " + curJackpotData.name;
        bonus.infoText3 = Languages.instance.getText("infotext_winning_ticket") + " " + curJackpotData.id;
      } else {
        bonus.infoText1 = "";
        bonus.infoText2 = "";
        bonus.infoText3 = "";
      }

      Logic.videoScreen.fillRound(setRoundInfo, curModel.odds, curModel.colors, setHistory, bonus);
      if (beforeModel && beforeModel.result) {
        beforeModel.result.first.odds = beforeModel.serverOdds[beforeModel.result.first.driverIndex];
        beforeModel.result.second.odds = beforeModel.getForcastOdd(beforeModel.result.first.driverIndex, beforeModel.result.second.driverIndex);
        Logic.videoScreen.fillLastRoundResult(beforeModel.result);
      } else {
        const errMsg = "Before Model not set or no result, game:" + this.gameInfo.gameType + " current round:" + curModel.roundInfo.fullGameId;
        Logger.error(errMsg);
        const logMessage = new SockServLogMessage(Errors.INVALID_DATA.code, errMsg);
        ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
          Logger.error("Send log Error:" + JSON.stringify(errorData));
        });
      }
    } else {
      Logic.videoScreen.fillRound(setRoundInfo, curModel.drivers, curModel.odds, setHistory, curModel.jackpotHistory, curModel.track, curModel.colors);
    }

    if (curModel.gameType === "box") {
      const kickboxScreen = Logic.videoScreen as VideoScreenKickBox;
      const kickboxModel = curModel as ModelBox;
      if (kickboxModel.resultBet && kickboxModel.fightQuotes && kickboxModel.fightHistory && kickboxModel.boxRingPresentationFacts) {
        kickboxScreen.fillRoundAdditional(kickboxModel.drivers, kickboxModel.resultBet, kickboxModel.fightQuotes, kickboxModel.fightHistory, kickboxModel.boxRingPresentationFacts);
      } else {
        Logger.error("Error, Not all kickbox data set!!");
        const logMessage = new SockServLogMessage(Errors.KICKBOX_DATA_ERROR.code, "Error, Not all kickbox data set!!");
        ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
          Logger.error("Send log Error:" + JSON.stringify(errorData));
        });
      }

      if (kickboxModel.wgpInfo) {
        let filePathPre = "";
        if (settings.sdCardPath && settings.isTerminalVideoscreen) {
          filePathPre = "file:///" + settings.sdCardPath;
        }

        // load first image of Intro Video
        this.loadTexture(filePathPre + kickboxModel.wgpInfo?.jpg, true).then((textureImg) => {
          this.fillIntroTexture(textureImg);
        });
      } else {
        Logger.error("Error, kickbox data wpgInfo not set!!");
        const logMessage = new SockServLogMessage(Errors.KICKBOX_DATA_ERROR.code, "Error, kickbox data wpgInfo not set!!");
        ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
          Logger.error("Send log Error:" + JSON.stringify(errorData));
        });
      }
    } else if (curModel.gameType === "dog63") {
      // fill additional Data for dog63
      const dog63Screen = Logic.videoScreen as VideoScreenDog63;
      const dog63Model = curModel as ModelDog63;
      let oddsGridFirstTwoInOrder = true;
      if (this.initResult) {
        oddsGridFirstTwoInOrder = this.initResult.setting.oddsGridFirstTwoInOrder;
      }

      if (dog63Model.dog63History && dog63Model.dog63Suprimi && dog63Model.dog63Quotes && dog63Model.dog63rd && dog63Model.dog63QuotesSide)
        dog63Screen.fillRoundAdditional(
          dog63Model.roundInfo,
          dog63Model.drivers,
          dog63Model.dog63History,
          dog63Model.dog63Suprimi,
          dog63Model.dog63Quotes,
          dog63Model.dog63rd,
          dog63Model.odds,
          dog63Model.dog63QuotesSide,
          oddsGridFirstTwoInOrder
        );
    }

    ErrorHandler.instance.checkHideErrorDialog();
    return curModel;
  }

  //  called from time to time with time of video (there might be a little gap between intro and race...)
  // this might be used to load data from server (e.g. prefil model for next round or race....)
  public onVideoTimeUpdate(videoTime: number) {
    if (videoTime === 0) {
      Logger.debug("OnTimeUpdate: " + videoTime + ", timestamp:" + Date.now());
    } else {
      // Logger.debug("OnTimeUpdate: " + videoTime );
    }
  }

  // general update event -> fired more often and even if no video plays
  public onUpdate(deltaTime: number) {
    //console.log("tescanplay " + Logic.getExactTimeUntilRace(this.gamesModel.getNextGameData().getGameStartTime()) + " " + this.fadeToRaceReceived);
    if (this.continiousSync && !this.getGamesModel().raceBreakShown) {
      // do not handle during race break time
      this.countVidUpdate++;

      // check on every nth update
      if (this.countVidUpdate % 30 === 0 && this.countVidUpdate > 0) {
        if (!ServerSocketLogic.instance.serverSocketClient.isWebsocketOpenState()) {
          Logger.error("Websocket not open, no sync");
          return;
        }
        if (ServerSocketLogic.instance.serverSocketClient.isWebsocketConnectingState()) {
          Logger.error("Websocket is Connecting!!!!");
          return null;
        }

        const exactServerVideoSecond = this.gameTimer.getExactVideoSec();

        const exactVideoVideoSecond = Logic.getVideoTime();
        const difference = Math.abs(exactServerVideoSecond - exactVideoVideoSecond) * 1000;
        // Logger.debug("1---- GameLoop Video Seconds:" + exactServerVideoSecond);
        // Logger.debug("2---- Video Video Seconds:" + exactVideoVideoSecond);
        // Logger.debug("D---- Difference:" + difference);

        // check intro delay
        /*if (exactServerVideoSecond < INTRO_VIDEO_LENGTH - 5 && exactServerVideoSecond > 5 && this.setUpVideoStarted) {
          // Logger.debug("Check Intro");
          if (difference > MAX_INTRO_OFFSET) {
            // Correct Video Time
            Logger.debug("UUUUUUUUUUUUUUUUUU Udate video Seconds difference:" + difference + " exact server seconds:" + exactServerVideoSecond + " exactVideoVideoSecond:" + exactVideoVideoSecond);
            Logic.setStateTime(exactServerVideoSecond + VIDEO_START_DELAY_TIME + this.extraLoadTime / 1000);
          }
        }*/

        // check race video delay
        if (exactServerVideoSecond > INTRO_VIDEO_LENGTH + 5 && exactServerVideoSecond < GAME_LOOP_LENGTH - 5 && this.raceVideoStarted) {
          // Logger.debug("Check Race, countVidUpdate:" + this.countRaceVidDoneUpd);

          if (difference > MAX_RACE_OFFSET + this.raceVideoDelay + this.extraLoadTime && this.countRaceVidDoneUpd < this.maxRaceSyncUpdates) {
            // to be not complete unfluent update only several times, than leaf delayed
            // Correct Video Time
            Logger.debug("RUUUUUUUUUUUUUUUUUU Udate video Seconds!!!!!!!!!!!!!!!!!! raceVideoDelay:" + this.raceVideoDelay + " netto difference:" + (difference - this.raceVideoDelay / 1000));
            Logger.debug("Set Video Time:" + (exactServerVideoSecond + VIDEO_START_DELAY_TIME - this.raceVideoDelay / 1000 + this.extraLoadTime / 1000));
            Logic.setStateTime(exactServerVideoSecond + VIDEO_START_DELAY_TIME - this.raceVideoDelay / 1000 - Logic.getIntroLength() + this.extraLoadTime / 1000);
            this.countRaceVidDoneUpd++;
          }
        }
      }

      if (this.countVidUpdate >= Number.MAX_SAFE_INTEGER) {
        this.countVidUpdate = 0;
      }
    }
  }

  public checkStartNextVideoLoop(vidoeSec: number) {
    let noFadeOffset = 0;

    if (this.withIntro) {
      if (this.gamesModel.raceBreakShown) {
        noFadeOffset = START_NEXT_VIDEO_START_OFFSET + 1; // start intro after race break, no fade time
      }

      // the next round might start before the video has ended => ...
      if (vidoeSec >= GAME_LOOP_LENGTH - START_NEXT_VIDEO_START_OFFSET - 1 + noFadeOffset && !this.nextVideoStarted) {
        this.nextVideoStarted = true;
        this.raceVideoStarted = false;
        this.countRaceVidDoneUpd = 0;

        let toScecondTimeout = START_NEXT_TO_SEC_DELAY;

        if (vidoeSec >= GAME_LOOP_LENGTH - START_NEXT_VIDEO_START_OFFSET) {
          // when start up is one second before next video loop
          toScecondTimeout = 0; // emediatly start nex video loop;
        }

        Logger.debug("Race break shown:" + this.gamesModel.raceBreakShown + " noFadeOffset:" + noFadeOffset);
        Logger.info("Start nex video to second offset:" + toScecondTimeout);

        clearTimeout(this.startNextTimer);
        this.startNextTimer = setTimeout(() => {
          Logger.debug("--------------- > Start nex video Video, timestamp:" + Date.now());
          this.canPlayIntroReceived = false;

          if (this.gamesModel.raceBreakShown) {
            // first intro after a race break period
            Logger.debug("Set Pause Overlay to false");
            this.getGamesModel().hideGamePauseView();
          } else {
            // normal intro start
            Logic.fadeTo(VideoState.Intro); // do intro fade
          }
        }, toScecondTimeout);
      }
      if (vidoeSec >= GAME_LOOP_LENGTH) {
        Logger.debug("--------------- > Start nex video loop, timestamp:" + Date.now());

        this.nextVideoStarted = false;
        this.raceVideoStarted = false;
        this.countRaceVidDoneUpd = 0;
        this.fadeToRaceReceived = false;
        this.gameTimer.resetTimes();
      }
    } else {
      const useNextRound = this.gameTimer.getExactVideoSec() > GAME_LOOP_LENGTH;
      const result = useNextRound ? this.gamesModel.getCurrentGameData().result : this.gamesModel.getNextGameData().result;
      // Sofort-Transition, wenn Resultat verfügbar
      if (this.gameTimer.getExactVideoSec() > GAME_LOOP_LENGTH && result) {
        Logger.debug("--------------- > Start nex video Video, timestamp:" + Date.now());
        if (this.gamesModel.raceBreakShown) {
          // first intro after a race break period
          Logger.debug("Set Pause Overlay to false");
          this.getGamesModel().hideGamePauseView();
        }
        this.onTimeForFade(VideoState.Race);
        Logger.debug("--------------- > Start nex video loop, timestamp:" + Date.now());

        this.nextVideoStarted = false;
        this.raceVideoStarted = false;
        this.countRaceVidDoneUpd = 0;
        this.fadeToRaceReceived = false;
        this.gameTimer.resetTimes();
      }
    }
  }

  // get the localized text for a certain textid...
  public getText(textId: string) {
    // Logger.debug("Get Text ID<" + textId + ">");
    return Languages.instance.getText(textId);
  }

  /**
   * Sets up the rounds from actual round info (must be read from server before call)
   * sets game settings
   * synchronizes and starts game loop
   * @param initData
   * @private
   */
  private async initSettings(initData: IInitData) {
    Logger.info(" - Init settings -");

    const gamesList: ModelBase[] = [];
    const numberFutureGames = INIT_NUMB_FUTURE;

    this.initStettingsData = initData.initResult.setting;

    GamesModel.RASTER_SIZE = this.initStettingsData.betoffers[0].numberCompetitor;

    for (const item of initData.gamepool) {
      let newModel = null;

      switch (this.gameInfo.gameType) {
        case "kart5":
          newModel = new ModelKart(this.gameInfo.gameType);
          break;
        case "dog6":
          newModel = new ModelDog(this.gameInfo.gameType);
          break;
        case "dog8":
          newModel = new ModelDog(this.gameInfo.gameType);
          break;
        case "box":
          newModel = new ModelBox(this.gameInfo.gameType);
          break;
        case "dog63":
          newModel = new ModelDog63(this.gameInfo.gameType);
          break;
        case "horse":
          newModel = new ModelHorse(this.gameInfo.gameType);
          break;
        case "roulette":
          newModel = new ModelRtt(this.gameInfo.gameType);
          break;
        case "sulky":
          newModel = new ModelSulky(this.gameInfo.gameType);
          break;
      }

      if (newModel === null) {
        throw new Error("Invalied Game Type:" + this.gameInfo.gameType);
      } else {
        newModel.setServerData(item);

        newModel.convertFromServerOdds();
        gamesList.unshift(newModel);
      }
    }

    this.gamesModel.initalGamesSet(gamesList, numberFutureGames);

    if (this.gameInfo.gameType === "roulette") {
      // set statistic data at all possible current games
      // will be updated by game result
      const beforeGame = this.gamesModel.getBeforeGameData() as ModelRtt;
      if (beforeGame) {
        beforeGame.setRttStatisitc(initData.rttStatistics);
      }
      const currentGame = this.gamesModel.getCurrentGameData() as ModelRtt;
      if (currentGame) {
        currentGame.setRttStatisitc(initData.rttStatistics);
      }
      const nextGame = this.gamesModel.getNextGameData() as ModelRtt;
      if (nextGame) {
        nextGame.setRttStatisitc(initData.rttStatistics);
      }
    }

    const savedGameResult = this.gamesModel.getSaveGameResult();

    if (savedGameResult !== null) {
      Logger.info("Result was read before Init --> set in Games list");
      this.gamesModel.updateGameResult(savedGameResult.id, savedGameResult as IGameRoundResultData, false);
      this.gamesModel.resetSavedGameResult();
    }

    this.nextVideoStarted = false;

    this.intiVideoStartTime = await this.gameTimer.synchronizeGameLoop(true);
    this.intiVideoStartTime = this.intiVideoStartTime + SETUP_OFFSET_FOR_PLAY;

    this.intiVideoStartTime = Math.min(this.intiVideoStartTime, GAME_LOOP_LENGTH); // not more than video length, intro video will be started emedeatly

    // raceOnly: skip the intro phase entirely. The intro MP4 has UI scaffold
    // burned-in (matrix grid, runner stat boxes) which we don't want in the
    // embed. By forcing intiVideoStartTime past introLength, the bundle's
    // VideoState resolver (Logic.getStateForTime) returns VideoState.Race
    // and only the race video plays. See VideoScreenDog.ts guards for the
    // companion change disabling intro-phase PIXI components.
    if (settings.raceOnly) {
      const introLen = Logic.getIntroLength();
      if (this.intiVideoStartTime < introLen) {
        Logger.info(`[raceOnly] skipping intro: intiVideoStartTime ${this.intiVideoStartTime}s → ${introLen}s`);
        this.intiVideoStartTime = introLen;
      }
    }

    this.intiVideoStartTimestamp = Date.now();

    Logger.info("Start game loop initial video Start time:" + this.intiVideoStartTime);
    Logger.debug("Timestamp vor video start time:" + this.intiVideoStartTimestamp);

    this.roundRequestSecond = Util.floatNumber(GAME_VIDEO_START_MS / 1000 + 5, 3);
    if (this.gameTimer.getVideoSec() > this.roundRequestSecond) {
      this.gameTimer.roundRequestDone = true;
    } else {
      this.gameTimer.roundRequestDone = false;
    }

    // if (this.intiVideoStartTime > this.videStartSecond) {
    //   numberFutureGames += 1;
    // }

    Logger.debug("intiVideoStartTime:" + this.intiVideoStartTime + " INTRO_VIDEO_LENGTH:" + INTRO_VIDEO_LENGTH);

    if (
      this.intiVideoStartTime >= INTRO_VIDEO_LENGTH && // at start up Start intro Action must be simulated if video loop is in race allredy started state
      this.lastStartRaceId !== this.gamesModel.getCurrentGameData().roundInfo.fullGameId && // at reinit it is possible that race hase been started before
      this.gamesModel.getIndexCurGame() < this.gamesModel.getGamesList().length - 1 // and there are enough games in list
    ) {
      // and not in race break time

      Logger.debug("getVideoSec:" + this.gameTimer.getVideoSec() + " GAME_VIDEO_START_MS / 1000:" + Util.floatNumber(GAME_VIDEO_START_MS / 1000, 3));
      let simulateSwitch = false;

      if (this.gameTimer.getVideoSec() >= Util.floatNumber(GAME_VIDEO_START_MS / 1000, 3)) {
        simulateSwitch = true;
        this.gamesModel.simulateNextGameStatusAtInit(); // because race switch was allready done, decrease current index to simulate before race start state
      }

      this.onStartIntroAction(simulateSwitch, true);

      if (this.gameTimer.getVideoSec() >= Util.floatNumber(GAME_VIDEO_START_MS / 1000, 3)) {
        this.gamesModel.simulateRaceStartedAtInit(); // set to correct state again
      }
    }
  }

  public reloadWindow() {
    // reload window
    Logger.info("reload Window: reloadWindow");
    const reloadUrl = Util.addParameterToUrl(window.location.href, "reloadType", "logicReload");
    window.location.href = reloadUrl;
  }

  public getGamesModel(): GamesModel {
    return this.gamesModel;
  }

  public getGameTimer(): GameTimer {
    return this.gameTimer;
  }

  public getMaxRoundNumber(): number {
    return this.maxRoundNumber;
  }

  public getBeforeBreakNumber(): number {
    return this.beforeBreakNumber;
  }

  public setBeforeBreakNumber(beforeBreakeNumber: number): number {
    return (this.beforeBreakNumber = beforeBreakeNumber);
  }

  public getRoundRequestSecond(): number {
    return this.roundRequestSecond;
  }

  public getInitResult(): ISockServResponseMessageInit | null {
    return this.initResult;
  }

  public getBetTypeDecimalPlaces(): IBetCodeDecimals[] | null | undefined {
    if (this.initResult) {
      return this.initResult.betCodeDecimals;
    }

    return null;
  }

  public hasJackpotBounus(): boolean {
    if (this.initResult !== null) {
      return this.initResult.haveDbPot;
    }
    return false;
  }

  private calcSyncInfo(videoTime?: number) {
    const serverVideoTime = this.gameTimer.getExactVideoSec();
    videoTime = videoTime !== undefined ? videoTime : Logic.getVideoTime();
    const diff = (videoTime - serverVideoTime) * 1000;
    const diffAbs = Math.abs(diff);
    const info: ISyncInfo = {
      serverVideoTime,
      videoTime,
      diff,
      diffAbs
    };
    return info;
  }

  hasItalianSchedule(): boolean {
    return this.hasItalianShedule;
  }

  public isIntroSoundEnabled(): boolean {
    if (this.initResult) {
      // TODO TEST
      // this.initResult.setting.enableSound = true;

      // at producer classic skin needs sound
      if (RtcLogic.instance.consumer) {
        if ((this.initResult.setting.skinVersion as SkinType) === SkinTypeDefinition.CLASSIC) {
          // do not load sound for classic skin
          Logger.debug("INTRO SOUND ENABLED: false");
          return false;
        }
      } else if (!this.initResult.setting.enableSound) {
        Logger.error("Producer must have sound enabled!");
      }

      Logger.debug("INTRO SOUND ENABLED:" + this.initResult.setting.enableSound);
      return this.initResult.setting.enableSound;
    }
    Logger.debug("INTRO SOUND ENABLED: false");
    return false;
  }

  private sendCloseLoadingScreenToParent() {
    const message = Settings.terminalSettings.closeLoadScreenMessage;
    const targetOrigin = this.postMessageTargetOrigin; // Ursprung des übergeordneten Fensters
    window.parent.postMessage(message, targetOrigin);
    Logger.debug("sent close overlay to parent, targetOrigin" + this.postMessageTargetOrigin);
  }

  public getIsProgrammInSetup(): boolean {
    return this._programmSetup;
  }

  public inRaceBreak(): boolean {
    return this.gamesModel.raceBreak;
  }

  /**
   * Sets the Gamelopp value and updates gamloop depending timing values
   *
   * New Gameloop interval starts with race start,
   * but intro of before Race is playing some seconds into new round
   * so update length for intro when next intro starts
   *
   * @param gameLength
   * @param isSetUp
   */
  public updateGameLoopLength(gameLength: GameLength, beforeGameLength: GameLength, isSetUp: boolean) {
    GAME_LOOP_LENGTH = gameLength;
    const beforeGameVideoStartMs = GAME_VIDEO_START_MS;
    this.gameInfo.gameLength = GAME_LOOP_LENGTH;
    if (isSetUp) {
      // at set up no interception from old intro to new gameloop
      this.gameInfo.currentIntroGameLength = GAME_LOOP_LENGTH;
    } else {
      this.gameInfo.currentIntroGameLength = beforeGameLength;
      // intro game loop will be updated before fading to new intro
      // because before intro ist played some seconds into new game loop
    }
    this.gameTimer.gameLoopLength = GAME_LOOP_LENGTH;
    if (this.initResult) {
      this.setGameLengthDependingValues(this.initResult, this.initResult.setting.skinVersion);
      this.roundRequestSecond = Util.floatNumber(GAME_VIDEO_START_MS / 1000 + 5, 3);
      this.gameTimer.setGameVideoStartMs(GAME_VIDEO_START_MS);
    }
    if (beforeGameLength !== GAME_LOOP_LENGTH) {
      // this.gameTimer.correctVideoStartSec(GAME_LOOP_LENGTH - beforeGameLength);
      this.gameTimer.correctVideoStartSec((GAME_VIDEO_START_MS - beforeGameVideoStartMs) / 1000);
    }
    Logger.info("Updated Game Loop length to:" + GAME_LOOP_LENGTH + " GAME_VIDEO_START_MS:" + GAME_VIDEO_START_MS);
  }

  getIsMultipleGameLengthes(): boolean {
    if (this.initResult) {
      const betoffers = this.initResult.setting.betoffers;
      if (betoffers.length > 0) {
        if (betoffers[0].type === BetofferTypes.template) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * New Gameloop interval starts with race start,
   * but intro of before Race is playing some seconds into new round
   * so update length for intro when next intro starts
   * @param gameLength
   */
  updateIntroGameLength(gameLength: GameLength): void {
    this.gameInfo.currentIntroGameLength = gameLength;
    Logger.debug("Game length set for next Intro:" + this.gameInfo.currentIntroGameLength);
  }

  /**
   * New Gameloop interval starts with race start,
   * but intro of before Race is playing some seconds into new round
   * so game length for intro is separated
   */
  getCurrentIntroGameLength(): GameLength {
    if (this.gameInfo) {
      return this.gameInfo.currentIntroGameLength;
    }
    return GAME_LOOP_LENGTH;
  }

  public getExtraLoadTime(): number {
    return this.extraLoadTime;
  }
}
