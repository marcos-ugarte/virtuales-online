import { Logger } from "client/Logic/Logger";
import { ServerSocketLogicBase } from "./base/ServerSocketLogicBase";
import { Settings } from "common/Settings";

export class ServerSocketLogic extends ServerSocketLogicBase {
  private constructor() {
    super();
  }

  private static internalInstance: ServerSocketLogic;
  static get instance(): ServerSocketLogic {
    if (this.internalInstance == null) this.internalInstance = new ServerSocketLogic();
    return this.internalInstance;
  }

  public disconnect(): void {
    try {
      this.serverSocketClient?.disconnect?.();
    } catch (e) {
      Logger.error("Disconnect failed in ServerSocketLogic", e);
    }
  }

  public static getServerUrlByDomain(): string {
    let socketUrl = "";

    for (const item of Settings.socketUrls) {
      Logger.debug("url:" + window.location.href + " search String:" + item.domain);
      if (window.location.href.includes(item.domain)) {
        socketUrl = item.socketUrl;
      }
    }

    Logger.debug("Settings Web Socket URL set:" + socketUrl);
    return socketUrl;
  }

  public static getSocketUrlRequest(deviceId: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "https://api.virtuales.bet/dsa4/?rt=3&out=json&cmd=WebSocketRequest&deviceId=" + deviceId + "&deviceType=AndroidTv2");

      xhr.setRequestHeader("Content-type", "application/json");
      xhr.onreadystatechange = function () {
        const DONE = 4; // readyState 4 means the request is done.
        const OK = 200; // status 200 is a successful return.
        if (xhr.readyState === DONE) {
          if (xhr.status === OK) {
            Logger.debug("Ajax read Data:" + xhr.responseText);

            const result = JSON.parse(xhr.responseText);

            if (result.type === "Exception") {
              Logger.error(xhr.responseText);
              reject("Get Socket Url Error" + result.errorMessage);
            } else {
              const resultAnswer: IWebSocketRequestResponse = result;
              var urlPlusType : string = (resultAnswer.url + "?gameType=" + resultAnswer.gameType);
              Logger.debug("Read Socket Url:" + urlPlusType);
              resolve(urlPlusType);
            }
          } else {
            Logger.error("Error: " + xhr.status); // An error occurred during the request.
            reject("Socket Url Request Error:" + xhr.status);
          }
        }
      };

      xhr.send();
    });
  }

  /*

    Request for this implementation to be added here

    public async sendLogRequest(logMessage: SockServLogMessage): Promise<any> {

      if (!this.serverSocketClient.isWebsocketConncting()) {
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
  */
}

interface IWebSocketRequestResponse {
  msgType: string;
  serverTime: string;
  url: string;
  gameType: string;
  encryptedLicense: string;
}
