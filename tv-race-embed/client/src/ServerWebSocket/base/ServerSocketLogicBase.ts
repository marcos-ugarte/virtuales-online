import { WebSocketClient } from "../ServerSocketClient";
import { ErrorHandler } from "client/LogicImplementation/ErrorHandler";
import { Util } from "common/Util";
import {
  SockServMessageType,
  ISockServIdMessage,
  DeviceTypes,
  ISockServResponseMessageTime,
  ISockServResponseMessageGameRound,
  ISockServResponseMessageInit,
  ISockServResponseMessageTranslation,
  EventType,
  ISockServResponseMessageReconnect
} from "common/Definitions";
import { INIT_NUMB_FUTURE, INIT_NUMB_PAST } from "client/LogicImplementation/LogicImplementation";
import { Logger } from "client/Logic/Logger";
import { Settings } from "common/Settings";
import { settings } from "client/Logic/Logic";

export class ServerSocketLogicBase {
  public static socketServerUrl: string = Settings.defaultSocketUrl;

  public id?: string;
  public serverSocketClient: WebSocketClient;
  protected wsUrl: string = Settings.defaultSocketUrl;

  // TODO TEST
  // private count = 0;

  protected constructor() {
    this.serverSocketClient = new WebSocketClient();
    this.wsUrl = ServerSocketLogicBase.socketServerUrl;
  }

  public setSocketServerUrl(wsUrl: string) {
    this.wsUrl = wsUrl;
  }

  public async connectWebSocketClient() {
    ErrorHandler.instance.isOpening = true;

    const __ip4 = window.location.hostname;
    const __port = window.location.port ? window.location.port : 443;
    const __wsProtocol = window.location.protocol.startsWith("https:") ? "wss:" : "ws:";
    // const port = window.location.protocol.startsWith("http:") ? 65336 : 65336;

    Logger.info("WS: " + this.wsUrl);

    // TODO TEST
    // this.count++;
    // if (this.count > 0) {
    //   this.wsUrl = "";
    // }

    try {
      await this.serverSocketClient.open(this.wsUrl);
      ErrorHandler.instance.hideErrorDialog();
    } catch (e) {
      Logger.error("Error setting up Web Socket:" + JSON.stringify(e));
      ErrorHandler.instance.normalErrorHandler(e, false);
    }
  }

  public async sendInitRequest(deviceId: string): Promise<ISockServResponseMessageInit> {
    const initMessage: SockServInitMessage = new SockServInitMessage(
      settings.deviceType,
      deviceId,
      INIT_NUMB_PAST * -1,
      INIT_NUMB_FUTURE,
      "3.0.1000",
      Util.getStandardNow(),
      settings.urlParamEventType,
      settings.screenId,
      settings.forceLanguage,
      settings.streamScreen
    );
    try {
      const answere: ISockServResponseMessageInit = await this.serverSocketClient.sendMessageAsync(initMessage);

      Logger.info("Init Request Answere:" + JSON.stringify(answere));
      return answere;
    } catch (error) {
      Logger.error("Error:" + JSON.stringify(error));
      throw error;
    }
  }

  public async sendReconnectRequest(deviceId: string): Promise<ISockServResponseMessageReconnect> {
    const reconnectMessage: SockServReconnectMessage = new SockServReconnectMessage(settings.deviceType, deviceId, Util.getStandardNow(), settings.screenId);
    try {
      const answere: ISockServResponseMessageReconnect = await this.serverSocketClient.sendMessageAsync(reconnectMessage);

      Logger.info("Reconect Request Answere:" + JSON.stringify(answere));
      return answere;
    } catch (error) {
      Logger.error("Error Reconect Request:" + JSON.stringify(error));
      throw error;
    }
  }

  public async sendTranslationRequest(): Promise<ISockServResponseMessageTranslation> {
    const translationMessage: SockServTranslationMessage = new SockServTranslationMessage();
    try {
      const answere: ISockServResponseMessageTranslation = await this.serverSocketClient.sendMessageAsync(translationMessage);

      Logger.info("Translation Request Answere:" + JSON.stringify(answere));
      return answere;
    } catch (error) {
      Logger.error("Error:" + JSON.stringify(error));
      throw error;
    }
  }

  public async sendGameRequest(gameRoundMessage: SockServGameRoundMessage): Promise<ISockServResponseMessageGameRound> {
    try {
      Logger.debug("RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR send Game Request");
      const answere: ISockServResponseMessageGameRound = await this.serverSocketClient.sendMessageAsync(gameRoundMessage);

      // TODO TEST
      // for (const gameRound of answere.gamepool) {
      //   if (gameRound.id === "251_102_202405290162") {
      //     const array = Object.getOwnPropertyNames(gameRound.competitors);
      //     for (let i = 0; i < array.length; i++) {
      //       const comp = gameRound.competitors[array[i]];
      //       comp.nbr1 = undefined;
      //       comp.nbr2 = undefined;
      //       comp.nbr3 = undefined;
      //       comp.trend = undefined;
      //       comp.last5 = undefined;
      //       comp.racesForStatistic = undefined;
      //     }
      //   }
      // }

      Logger.info("Game Request Answere:" + JSON.stringify(answere));
      return answere;
    } catch (error) {
      Logger.error("Error Game Request:" + JSON.stringify(error));
      ErrorHandler.instance.normalErrorHandler(error, false);
      throw error;
    }
  }

  public async sendTimeRequest(): Promise<ISockServResponseMessageTime> {
    const timeMessage: SockServerTimeMessage = new SockServerTimeMessage(Util.getStandardNow());
    try {
      const answere: ISockServResponseMessageTime = await this.serverSocketClient.sendMessageAsync(timeMessage);

      Logger.info("Server Time Request Answere:" + JSON.stringify(answere));
      return answere;
    } catch (error) {
      Logger.error("Error Time Request:" + JSON.stringify(error));
      ErrorHandler.instance.normalErrorHandler(error, false);
      throw error;
    }
  }

  public async sendLogRequest(logMessage: SockServLogMessage): Promise<any> {
    if (!this.serverSocketClient.isWebsocketOpenState()) {
      Logger.error("Websocket not open!!!!");
      return null;
    }
    if (this.serverSocketClient.isWebsocketConnectingState()) {
      Logger.error("Websocket is Connecting!!!!");
      return null;
    }

    try {
      const answere: ISockServIdMessage = await this.serverSocketClient.sendMessageAsync(logMessage);

      Logger.info("Server Log Request Answere:" + JSON.stringify(answere));

      return answere;
    } catch (error) {
      Logger.error("Error Log Request:" + JSON.stringify(error));
      throw error;
    }
  }
}

export class SockServInitMessage implements ISockServIdMessage {
  public msgId: number = 0;
  public msgType: SockServMessageType = SockServMessageType.Init;

  public deviceType: DeviceTypes;
  public deviceId: string;
  public historyGames: number;
  public futureGames: number;
  public version: string;
  public clientDt: string;
  public eventType?: EventType;
  public screenId?: string;
  public language?: string;
  public streamScreen?: boolean;

  public constructor(
    deviceType: DeviceTypes,
    deviceId: string,
    historyGames: number,
    futureGames: number,
    version: string,
    clientDt: string,
    eventType?: EventType,
    screenId?: string,
    language?: string,
    streamScreen?: boolean
  ) {
    this.deviceType = deviceType;
    this.deviceId = deviceId;
    this.historyGames = historyGames;
    this.futureGames = futureGames;
    this.version = version;
    this.clientDt = clientDt;
    this.eventType = eventType;
    this.screenId = screenId;
    this.language = language;
    this.streamScreen = streamScreen;
  }
}

export class SockServReconnectMessage implements ISockServIdMessage {
  public msgId: number = 0;
  public msgType: SockServMessageType = SockServMessageType.DeviceReconnect;
  public deviceType: DeviceTypes;
  public deviceId: string;
  public screenId?: string;

  public clientDt: string;

  public constructor(deviceType: DeviceTypes, deviceId: string, clientDt: string, screenId?: string) {
    this.deviceType = deviceType;
    this.deviceId = deviceId;
    this.screenId = screenId;
    this.clientDt = clientDt;
  }
}

export class SockServTranslationMessage implements ISockServIdMessage {
  public msgId: number = 0;
  public msgType: SockServMessageType = SockServMessageType.Translation;

  public constructor() {}
}

export class SockServGameRoundMessage implements ISockServIdMessage {
  public msgId: number = 0;
  public msgType: SockServMessageType = SockServMessageType.GameRound;

  public gameId: string | null;
  public historyGames: number;
  public futureGames: number;

  public constructor(gameId: string | null, historyGames: number, futureGames: number) {
    this.gameId = gameId;
    this.historyGames = historyGames;
    this.futureGames = futureGames;
  }
}
export class SockServerTimeMessage implements ISockServIdMessage {
  public msgId: number = 0;
  public msgType: SockServMessageType = SockServMessageType.ServerTime;

  public clientDt: string;

  public constructor(clientDt: string) {
    this.clientDt = clientDt;
  }
}

export class SockServLogMessage implements ISockServIdMessage {
  public msgId: number = 0;
  public msgType: SockServMessageType = SockServMessageType.SendLog;

  public errorId: string;
  public errorMsg: string;
  public clientDt: string;

  public constructor(errorId: string, text: string, clientDt?: string) {
    this.errorId = errorId;
    this.errorMsg = text;
    if (clientDt) {
      this.clientDt = clientDt;
    } else {
      this.clientDt = Util.getStandardNow();
    }
  }
}
