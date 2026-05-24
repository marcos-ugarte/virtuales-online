import { ISockServIdMessage, ISockServResponseMessage, ISockServResponseMessageGameRound, SockServMessageType } from "common/Definitions";
import { ErrorHandler, Errors } from "client/LogicImplementation/ErrorHandler";
import { GamesModel } from "client/LogicImplementation/GamesModel";
import { ServerSocketLogic } from "../ServerSocketLogic";
import { Logger } from "client/Logic/Logger";
import { SockServLogMessage } from "./ServerSocketLogicBase";
import { LogicImplementation } from "client/LogicImplementation/LogicImplementation";
import { Logic } from "client/Logic/Logic";

interface IPendingResponse {
  id: number;
  callback: (response?: any) => void;
  errCallback: (error?: any) => void;
  sendTimestamp: number;
}

export abstract class WebSocketClientBase {
  get isReconnecting(): boolean {
    return this._isReconnecting;
  }

  set isReconnecting(value: boolean) {
    this._isReconnecting = value;
  }
  private ws!: WebSocket;
  private pendingResponses: IPendingResponse[] = [];
  private consumeCallback?: (ms: MediaStream[]) => void;

  public gamesModel?: GamesModel;

  public constructor() {}

  private messageId: number = 0;

  private _isReconnecting = false;

  public sendMessage(data: ISockServIdMessage, callback?: (responseData: any) => void, errCallback?: (responseData: any) => void) {
    const mid = this.getNextMessageId();
    data.msgId = mid;
    Logger.info("Send Message:" + JSON.stringify(data));
    const sendTime = Date.now();
    this.ws.send(JSON.stringify(data));
    if (callback !== undefined && errCallback) {
      this.pendingResponses.push({ id: mid, callback, errCallback, sendTimestamp: sendTime });
    }
  }

  public async sendMessageAsync(data: ISockServIdMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      this.sendMessage(
        data,
        (response: any) => {
          Logger.info("Respons:" + JSON.stringify(response));

          resolve(response);
        },
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  public async open(url: string) {
    this.ws = new WebSocket(url);

    return new Promise<void>((resolve, reject) => {
      this.ws.onopen = (ev) => {
        Logger.info("*********************************** Opend Web Socket");
        ErrorHandler.instance.isOpening = false;
        this.isReconnecting = false;
        // this.initMediaSoup();
        // Logger.debug("deleay.......");

        ErrorHandler.instance.connectionLostTime = 0;
        ErrorHandler.instance.retryAttempts = 0;

        // setTimeout(() => {
        resolve(undefined);
        // }, 10000);
      };

      this.ws.onclose = (ev) => {
        Logger.info("Closed!");
        this.pendingResponses = [];

        let showError = false;
        if (Logic.implementation.getIsProgrammInSetup()) {
          showError = true;
        }
        if (ErrorHandler.instance.connectionLostTime == 0) {
          ErrorHandler.instance.connectionLostTime = Date.now();
        }
        ErrorHandler.instance.normalErrorHandler(Errors.SOCKET_SERV_CLOSE, showError);
      };

      this.ws.onerror = (ev) => {
        Logger.error("OnError");
        if (this.isReconnecting) {
          Logger.error("Ignore Socket Error while reconnectiong");
        } else {
          if (ErrorHandler.instance.connectionLostTime == 0) {
            ErrorHandler.instance.connectionLostTime = Date.now();
          }
          if (this) reject(Errors.SOCKET_SERVER);
        }
      };

      this.ws.onmessage = (ev) => {
        Logger.debug("Event Data" + ev.data);
        const receiveTimestamp = Date.now();
        const message = JSON.parse(ev.data);
        const respondMessage = message as ISockServResponseMessage;
        Logger.info("Received Message:" + JSON.stringify(message));

        if (respondMessage.msgId !== null) {
          // reponse to a before send message

          const index = this.pendingResponses.findIndex((e) => e.id === respondMessage.msgId);
          if (index !== -1) {
            // TODO TEST
            // if (respondMessage.msgType === SockServMessageType.ServerTime) {
            //   respondMessage.msgType = SockServMessageType.Error;
            // }
            // TODO TEST
            // if (respondMessage.msgType === SockServMessageType.GameRound) {
            //
            //    const gameRoundRes =  message as  ISockServResponseMessageGameRound;
            //    const initResult = (Logic.implementation as LogicImplementation).getInitResult();
            //
            //    if(initResult){
            //      for(let i = gameRoundRes.gamepool.length - 1 ; i >= 0 ; i--){
            //
            //        if(gameRoundRes.gamepool[i].id === "441_104_20210526" + (initResult.setting.betoffers[0].nbrEvents + 1).toString().padStart(4, "0")){
            //          gameRoundRes.gamepool.splice(i,1);
            //        }
            //        else if(gameRoundRes.gamepool[i].id === "441_104_20210526" + (initResult.setting.betoffers[0].nbrEvents + 2).toString().padStart(4, "0")){
            //          gameRoundRes.gamepool.splice(i,1);
            //        } else if(gameRoundRes.gamepool[i].id === "441_104_20210526" + (initResult.setting.betoffers[0].nbrEvents + 3).toString().padStart(4, "0")){
            //          gameRoundRes.gamepool.splice(i,1);
            //        }
            //      }
            //    }
            //
            //   Logger.info("Set Message:" + JSON.stringify(gameRoundRes));
            // }

            // TODO TEST
            // if (respondMessage.msgType === SockServMessageType.GameRound) {
            //   const gameRoundRes = message as ISockServResponseMessageGameRound;
            //   const initResult = (Logic.implementation as LogicImplementation).getInitResult();
            //
            //   if (initResult) {
            //     const startNoRoundNumber = 586;
            //
            //     for (let i = gameRoundRes.gamepool.length - 1; i >= 0; i--) {
            //       if (gameRoundRes.gamepool[i].id === "321_103_20240523" + (startNoRoundNumber + 0).toString().padStart(4, "0")) {
            //         gameRoundRes.gamepool.splice(i, 1);
            //       }
            //       //        else if(gameRoundRes.gamepool[i].id === "441_104_20210527" + (startNoRoundNumber + 1).toString().padStart(4, "0")){
            //       // gameRoundRes.gamepool.splice(i, 1);
            //       //        }
            //       // else if(gameRoundRes.gamepool[i].id === "441_104_20210527" + (startNoRoundNumber + 2).toString().padStart(4, "0")){
            //       //   gameRoundRes.gamepool.splice(i,1);
            //       // }
            //     }
            //   }
            // }

            if (respondMessage.msgType === SockServMessageType.Error) {
              const errorCallback = this.pendingResponses[index].errCallback;
              this.pendingResponses.splice(index, 1);
              errorCallback(respondMessage);
            } else {
              const response: IPendingResponse = this.pendingResponses[index];
              const callback = response.callback;
              this.pendingResponses.splice(index, 1);
              respondMessage.duration = receiveTimestamp - response.sendTimestamp;
              callback(respondMessage);
            }
          } else {
            Logger.error("Error! Invalid pending response! msgId:" + respondMessage.msgId);

            const logMessage = new SockServLogMessage(Errors.INV_PEND_RESP.code, "Error! Invalid pending response! msgId:" + respondMessage.msgId);
            ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
              Logger.error("Send log Error:" + JSON.stringify(error));
            });
          }
        } else {
          // send acrive from server

          this.handleActiveMessages(message);
        }
      };
    });
  }

  protected abstract handleActiveMessages(message: any): void;

  private getNextMessageId() {
    if (this.messageId < Number.MAX_VALUE) {
      this.messageId++;
    } else {
      this.messageId = 1;
    }

    return this.messageId;
  }

  public isWebsocketOpen(): boolean {
    if (!this.ws) {
      return false;
    }

    if (this.ws.readyState === WebSocket.CLOSING || this.ws.readyState === WebSocket.CLOSED) {
      return false;
    }

    return true;
  }

  public isWebsocketConnectingState(): boolean {
    if (!this.ws) {
      return false;
    }

    if (this.ws.readyState === WebSocket.CONNECTING) {
      return true;
    }

    return false;
  }

  public isWebsocketOpenState(): boolean {
    if (!this.ws) {
      return true;
    }

    if (this.ws.readyState === WebSocket.OPEN) {
      return true;
    }

    return false;
  }

  public disconnect(): void {
    try {
      if (this.ws) {
        Logger.info("manual websocket-disconnect");
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      }
      this.pendingResponses = [];
    } catch (e) {
      Logger.error("error on websocket-disconnect:", e);
    }
  }
}
