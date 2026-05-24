import { HttpLoggerLogic, Logger, LoggLevels } from "./Logic/Logger";
import { ErrorHandler, Errors } from "./LogicImplementation/ErrorHandler";
import { MainHelpers } from "./MainHelper";
import { RtcLogic } from "./Rtc/RtcLogic";
import { SockServLogMessage } from "./ServerWebSocket/base/ServerSocketLogicBase";
import { ServerSocketLogic } from "./ServerWebSocket/ServerSocketLogic";
import "./styles.css";
import { ReactConsumer } from "./Ui/ReactConsumer";
import { ReactProducer } from "./Ui/ReactProducer";
import { Logic, settings } from "client/Logic/Logic";
import { DeviceTypes, GameLength, GameType, PerformanceSetting, SkinType } from "common/Definitions";
import { Util } from "common/Util";

function queryDeviceId() {
  let deviceId = Util.getUrlParameter(window.location.href, "deviceid");
  deviceId = deviceId?.replace("%3A", ":");
  if (!deviceId) {
    // TODO give Error
    deviceId = "90:00:00:00:00:01";
    // ErrorHandler.instance.normalErrorHandler(Errors.NO_URL_DEV, true);
    // return;
  }
  return deviceId;
}

export class App {
  public constructor() {
    Logger.info("Start App: " + new Date(webpackConfig.buildTime).toUTCString());

    if (Logic.introMusic) Logic.introMusic.pause();

    window.onerror = (event: Event | string, source?: string, lineno?: number, colno?: number, error?: Error) => {
      let errorMessage = `Unhandled exception (src: ${source}(${lineno})${typeof event === "string" ? event : JSON.stringify(event)}${JSON.stringify(error)}\n`;
      if (error) {
        errorMessage += error.stack;
      }

      Logger.error(errorMessage);

      const errorObj = Errors.RUNTIM_ERROR;

      ErrorHandler.instance.normalErrorHandler(errorObj, true);

      const logMessage = new SockServLogMessage(Errors.RUNTIM_ERROR.code, errorMessage);
      ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
        Logger.error("Send log Error:" + JSON.stringify(errorData));
      });
    };

    window.addEventListener("unhandledrejection", (event) => {
      // log unhandled rejections
      const errorMessage = "Unhandled Promise Rejection: " + event.reason;
      Logger.error(errorMessage);

      const logMessage = new SockServLogMessage(Errors.PROMISE_ERROR.code, errorMessage);
      ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
        Logger.error("Send log Error:" + JSON.stringify(errorData));
      });
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (typeof AndroidMsgBridge !== "undefined") {
      // when apk interface
      // send info to apk that javascript is started
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      AndroidMsgBridge.videoserverStarted("true");
    }

    const id = Util.getUrlParameter(window.location.href, "id"); // ? queryId : Math.random().toString(36).substring(7);
    const roomId = Util.getUrlParameter(window.location.href, "roomId");
    const type = Util.getUrlParameter(window.location.href, "type"); // producer // consumer
    const dpr = window.devicePixelRatio;
    settings.screen.width = Util.getUrlParameterInt(window.location.href, "width", window.innerWidth * dpr);
    settings.showUI = Util.getUrlParameterBool(window.location.href, "showUI", false);
    settings.devUser = Util.getUrlParameter(window.location.href, "devUser");
    settings.forceDummyLogic = Util.getUrlParameterBool(window.location.href, "forceDummyLogic", false);
    settings.useCache = Util.getUrlParameterBool(window.location.href, "useCache", false);
    settings.forceGameType = Util.getUrlParameter(window.location.href, "gameType") as GameType;
    const gameSkinParameter = Util.getUrlParameter(window.location.href, "gameSkin");
    if (gameSkinParameter) {
      settings.forceGameSkin = parseInt(gameSkinParameter, 10) as SkinType;
    }
    settings.forceGameLength = Util.getUrlParameterIntOrUndefined(window.location.href, "gameLength") as GameLength;
    settings.showBonus = Util.getUrlParameterBool(window.location.href, "showBonus", false);
    settings.forcePerformance = Util.getUrlParameter(window.location.href, "performance") as PerformanceSetting;
    settings.forceReloadContent = Util.getUrlParameterBool(window.location.href, "forceReloadContent", false);
    settings.startImmediately = Util.getUrlParameterBool(window.location.href, "startImmediately", false);
    settings.playbackSpeed = Util.getUrlParameterFloat(window.location.href, "speed", 1.0);
    settings.showText = Util.getUrlParameterBool(window.location.href, "showText", false);
    settings.debug = Util.getUrlParameterBool(window.location.href, "showDebug", false);
    settings.stopAfterSeek = Util.getUrlParameterBool(window.location.href, "stopAfterSeek", false);
    settings.showDebugTextColor = Util.getUrlParameterBool(window.location.href, "showDebugTextColor", false);
    settings.videoStartTime = Util.getUrlParameterFloat(window.location.href, "videoStartTime", 0);
    settings.sdCardPath = Util.getUrlParameter(window.location.href, "sdCardPath");
    settings.syncStartTimeParameter = Util.getUrlParameterBool(window.location.href, "syncStartTimeParameter", false);
    // raceOnly: skip intro phase + hide intro-phase PIXI components.
    // Used by virtuales-online/web-lobby to embed the bundle as a "TV-box-
    // like" viewer inside the LiveMonitor. See VideoScreenDog.ts guards
    // and LogicImplementation.ts for skip-intro behavior.
    settings.raceOnly = Util.getUrlParameterBool(window.location.href, "raceOnly", false);
    settings.languageId = Util.getUrlParameter(window.location.href, "languageId");
    settings.forceLanguage = Util.getUrlParameter(window.location.href, "forceLanguage");
    settings.deviceType = Util.getDeviceTypeFromString(Util.getUrlParameter(window.location.href, "deviceType"));
    settings.urlParamEventType = Util.getEvenTypeFromString(Util.getUrlParameter(window.location.href, "eventType"));
    settings.screenId = Util.getUrlParameter(window.location.href, "screenId");
    settings.isTerminalVideoscreen = settings.deviceType === DeviceTypes.Terminal;
    settings.isTerminalInGameVideoscreen = Util.getUrlParameterBool(window.location.href, "inGameRender", false);
    settings.deviceId = queryDeviceId();
    settings.forceUseOverlays = Util.getUrlParameterBool(window.location.href, "useOverlays", true);
    //settings.forceSpecificIntro = Util.getUrlParameter(window.location.href, "forceSpecificIntro");
    settings.raw = Util.getUrlParameterBool(window.location.href, "raw", false);
    settings.streamScreen = Util.getUrlParameterBool(window.location.href, "streamScreen", false);

    settings.screen.height = Util.getUrlParameterInt(window.location.href, "height", window.innerHeight * dpr);
    settings.screen.width = Math.round(settings.screen.width);
    settings.screen.height = Math.round(settings.screen.height);
    settings.viewport.width = settings.screen.width / dpr;
    settings.viewport.height = settings.screen.height / dpr;
    settings.scaleFactor = settings.screen.width / 1280;

    // Set up File logging by url parameters
    const fileLogLevel = Util.getUrlParameter(window.location.href, "fileLogLevel");
    const fileLogServerUrl = Util.getUrlParameter(window.location.href, "logServerUrl");

    if (fileLogLevel) {
      // log level is given by url parameter
      const logLevel = LoggLevels.getLogLevelIntValue(fileLogLevel);
      if (logLevel > 0) {
        // valid log level
        Logger.logLevel = logLevel;
        HttpLoggerLogic.setUpHttpLogger(fileLogServerUrl);
      }
    }

    Logger.info("HostName: " + window.location.hostname + " ID: " + id);
    if (id) {
      const autoDisconnect = Util.getUrlParameter(window.location.href, "autoDisconnect");
      Logger.info("autoDisconnect: " + autoDisconnect);
      RtcLogic.instance.init(id, roomId, type, { deviceId: settings.deviceId, autoDisconnect: autoDisconnect ? +autoDisconnect : undefined });
    }

    const f = async () => {
      try {
        if (id) {
          await RtcLogic.instance.connectRtcClient();
        }

        if (RtcLogic.instance.isProducer() || RtcLogic.instance.isPlayer()) MainHelpers.render(ReactProducer);
        else MainHelpers.render(ReactConsumer);
      } catch (e) {
        Logger.error("App constructor: " + e);
      }
    };
    f();
  }

  public exit(): void {}
}
