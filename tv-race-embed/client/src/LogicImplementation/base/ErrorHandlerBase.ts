import { Logic, settings } from "client/Logic/Logic";
import { LogicImplementation } from "../LogicImplementation";
import { ServerSocketLogic } from "client/ServerWebSocket/ServerSocketLogic";
import { Languages } from "../Localisation";
import { Logger } from "client/Logic/Logger";
import { SockServLogMessage } from "client/ServerWebSocket/base/ServerSocketLogicBase";
import { Settings } from "common/Settings";
import { ErrorHandler } from "client/LogicImplementation/ErrorHandler";
import { Util } from "common/Util";

export class ErrorObj {
  public code: string;
  public message: string;

  public constructor(code?: string, message?: string) {
    this.code = code || "-1";
    this.message = message || "";
  }
}

export class ErrorsBase extends ErrorObj {
  public static readonly DEVICE_NOT_REGISTERED_OR_INACTIVE = new ErrorObj("4303", "Device not active / unregistered device!");
  public static readonly DEVICE_NOT_REGISTERED = new ErrorObj("4304", "");
  public static readonly GAME_NOT_IN_LIST = new ErrorObj("9001", "");
  public static readonly GAME_NOT_LOADED = new ErrorObj("9002", "");
  public static readonly HISTORY_NOT_ENOUGTH = new ErrorObj("9003", "");
  public static readonly SOCKET_SERVER = new ErrorObj("9004", "Socket Server Error");
  public static readonly SOCKET_SERV_CLOSE = new ErrorObj("9005", "Socket Server Closed");
  public static readonly SOCKET_SERV_TIMEOUT = new ErrorObj("9014", "Socket Server Timeout");
  public static readonly SETUP = new ErrorObj("9006", "Error during set Up");
  public static readonly NO_HIS_RES = new ErrorObj("9007", "");
  public static readonly RACES_DIFF = new ErrorObj("9008", "");
  public static readonly INV_PEND_RESP = new ErrorObj("9009", "");
  public static readonly LOCALISATION = new ErrorObj("9010", "");
  public static readonly RESULT_WRONG_GAME = new ErrorObj("9011", "Next game Id and Result Game ID are not equal!");
  public static readonly RESULT_NOT_RECEIVED = new ErrorObj("9012", "Got no result to Long for Game Id");
  public static readonly TIME_REQUEST_TO_LONG = new ErrorObj("9013", "Time request lasted to long, no sync, duration:");
  public static readonly NO_URL_DEV = new ErrorObj("9015", "Missing URL Paramter: deviceid");
  public static readonly INIT_RES_NOT = new ErrorObj("9016", "Init Result is null!");
  public static readonly INVALID_LENGTH = new ErrorObj("9017", "Invalid Gamelength");
  public static readonly RUNTIM_ERROR = new ErrorObj("9018", "Runtime Error");
  public static readonly ASSET_LOAD = new ErrorObj("9019", "Asset Load Error");
  public static readonly RESULT_NOT_START_RACE = new ErrorObj("9020", "Result not set at start of Race:");
  public static readonly SOCKET_SERVER_URL_REQUEST = new ErrorObj("9021", "Socket Server URL Request");
  public static readonly KICKBOX_DATA_ERROR = new ErrorObj("9022", "Kickbox Data:");
  public static readonly SPRITE_NOT_SET_ERROR = new ErrorObj("9023", "Sprite is null");
  public static readonly LOST_WEBGL_CONTEXT_ERROR = new ErrorObj("9024", "Lost Webgl context --> refresh");
  public static readonly INVALID_DATA = new ErrorObj("9025", "Invalid Data");
  public static readonly NO_SOUND_FILE = new ErrorObj("9026", "Sound file was not found");
  public static readonly NO_MATCHING_INTRO = new ErrorObj("9027", "No matching intro");
  public static readonly PROMISE_ERROR = new ErrorObj("9028", "Unhandled Promise Rejection");
  public static readonly GEOLOG_REQUEST = new ErrorObj("9029", "Geolog Request Error");
  public static readonly FREEZE_ON_START = new ErrorObj("9030", "Freeze on video start at gamelength 60 --> refresh");
  public static readonly LOG_INFO = new ErrorObj("9099", "");

  public static readonly DEV_REGISTERED = new ErrorObj(
    "10200",
    "<b>The device<br/>___DEVID___<br/> has been registered.</b><br/><br/><br/>Please contact the Operator<br/>to activate the device.<br/><br/>After activation restart the device."
  );
  public static readonly DEV_NOT_ACTIVE = new ErrorObj(
    "10201",
    "<b>The device<br/>___DEVID___<br/> is not active!</b><br/><br/><br/>Please contact the Operator<br/>to activate the device.<br/><br/>After activation restart the device."
  );

  public toString(): string {
    return this.code + ": " + this.message;
  }
}

export abstract class ErrorHandlerBase {
  protected static internalInstance: ErrorHandlerBase;

  public callBackFuntion: any;

  public isOpening = false;
  protected reinitTimeout: NodeJS.Timeout | null = null;
  protected reconnectTimeout: NodeJS.Timeout | null = null;
  protected doHideAssetLoadNextRound: boolean = false;
  protected _connectionLostTime: number = 0;
  protected _retryAttempts: number = 0;

  get connectionLostTime(): number {
    return this._connectionLostTime;
  }

  set connectionLostTime(value: number) {
    this._connectionLostTime = value;
  }

  get retryAttempts(): number {
    return this._retryAttempts;
  }

  set retryAttempts(value: number) {
    this._retryAttempts = value;
  }

  protected constructor() {
    const errButElem = document.getElementById("errButt");
    if (errButElem) {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      errButElem.addEventListener("click", this.okAction);
    }
  }

  public normalErrorHandler(errorObj: any, showError: boolean, callback?: any): void {
    const errObj = new ErrorObj();
    let isSet = false;
    if ("message" in errorObj) {
      errObj.message = errorObj.message;
      isSet = true;
    }

    if ("code" in errorObj) {
      errObj.code = errorObj.code;
      isSet = true;
    }

    if (!isSet) {
      errObj.message = JSON.stringify(errorObj);
      errObj.code = "-1";
    }

    Logger.error("ERROR: id:" + errObj.code + " message:" + errObj.message);

    if (errObj.code === ErrorsBase.ASSET_LOAD.code) {
      this.doHideAssetLoadNextRound = false;
    }

    if (showError) {
      if (errObj.code === ErrorsBase.ASSET_LOAD.code) {
        this.doHideAssetLoadNextRound = true;
      }

      const msgheader = "ERROR";

      let msgTxt = errObj.message;

      if (errObj.code === ErrorsBase.SOCKET_SERVER.code || errObj.code === ErrorsBase.SOCKET_SERV_CLOSE.code) {
        msgTxt = this.getErrorCommunicationErrorText();
      } else if (errObj.code === ErrorsBase.SETUP.code) {
        msgTxt = Languages.instance.getText("err_setup");
      } else if (errObj.code === ErrorsBase.SOCKET_SERV_TIMEOUT.code || errObj.code === ErrorsBase.TIME_REQUEST_TO_LONG.code) {
        msgTxt = Languages.instance.getText("err_timeout"); //  "There was an error in communication. Please check the stability of your internet. The software tries to reconect.";
      }

      msgTxt = this.setMessageText(errObj, msgTxt);

      this.showErrorDialog(msgheader, msgTxt, callback);
    }

    const sendAsync = async () => {
      Logger.info("Send Log Message ");
      const logMessage = new SockServLogMessage(errObj.code, errObj.message);
      await ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
        Logger.error("Send log Error:" + JSON.stringify(error));
      });
    };
    sendAsync();

    // network error at running Programm --> try ro reconect without showing error
    if ((errObj.code === ErrorsBase.SOCKET_SERV_CLOSE.code || errObj.code === ErrorsBase.SOCKET_SERVER.code) && !Logic.implementation.getIsProgrammInSetup()) {
      this.startReconnectTimeout();
      // game cant go on with this fatal errors --> reinit
    } else if (this.isFatalErrorAllGames(errObj) || this.isFatalError(errObj)) {
      Logger.error("Stop Loop because of fatal Error");

      (Logic.implementation as LogicImplementation).getGameTimer().stopGameLoop();

      if (errObj.code === ErrorsBase.SOCKET_SERVER.code || errObj.code === ErrorsBase.SOCKET_SERV_CLOSE.code || errObj.code === ErrorsBase.RESULT_NOT_START_RACE.code) {
        if (this.reinitTimeout !== null) {
          clearTimeout(this.reinitTimeout);
        }

        let reinitTimeout = Settings.onlineRetryTime;

        if (errObj.code === ErrorsBase.SOCKET_SERVER.code || errObj.code === ErrorsBase.SOCKET_SERV_CLOSE.code) {
          reinitTimeout = Settings.socketClosedRetryTime;
        }

        this.reIntWithTimout(reinitTimeout);
      } else {
        this.reIntWithTimout(Settings.onlineRetryTime);
      }
    }
  }

  public showErrorDialog(msgheader: string, msgTxt: string, callback?: any): void {
    //When allredy an error Window shown, keep that, because it is the inital error
    let allreadySown = false;
    const errElemWind = document.getElementById("errBack");
    if (errElemWind !== null) {
      if (errElemWind.style.display !== "none") {
        allreadySown = true;
      }
    }

    if (!allreadySown) {
      this.callBackFuntion = callback;

      const errElem = document.getElementById("errBack");
      if (errElem) {
        const errHead = document.getElementById("errHead");
        if (errHead) errHead.innerHTML = msgheader;

        const errMsg = document.getElementById("errMsg");
        if (errMsg) errMsg.innerHTML = msgTxt;

        errElem.style.display = "block";
      }

      const errButElem = document.getElementById("errButt");
      if (errButElem) {
        if (callback === undefined) {
          errButElem.style.display = "none";
        } else {
          errButElem.style.display = "block";
        }
      }
    }
  }

  public getErrorCommunicationErrorText(): string {
    let msgTxt =
      "<div style='text-align: center; width: 100%'>There was an error in communication.<br>No connection since: ___TIME___<br/>Please check the stability of your internet.<br/>The software tries to reconnect.<br/>___ANIM___ ___NUMRET___ attempts to reconnect.</div>";
    if (Languages.instance.getTranslations() !== null) {
      msgTxt = "<div style='text-align: center; width: 100%'>" + Logic.implementation.getText("err_no_con_ext") + "</div>";
    }

    if (ErrorHandler.instance.connectionLostTime === 0) {
      ErrorHandler.instance.connectionLostTime = Date.now();
    }

    msgTxt = msgTxt
      .replace("___TIME___", Util.formatDateFromUtcStandardDateString(Util.formatStandardUTCSecondsScince(ErrorHandler.instance.connectionLostTime), Languages.instance.getText("dateTimeFormat")))
      .replace("___ANIM___", "<div class='dotLoaderAnim'></div>")
      .replace("___NUMRET___", "<div id='errmodalNumRetry'>" + ErrorHandler.instance.retryAttempts + "</div>");

    return msgTxt;
  }

  public reIntWithTimout(reinitTimeout: number) {
    this.reinitTimeout = setTimeout(async () => {
      Logger.error("Timeout Reinit Programm because of fatal Error");
      this.reinitTimeout = null;
      ErrorHandler.instance.retryAttempts++;
      (Logic.implementation as LogicImplementation).getGamesModel().clearGamesList();
      await (Logic.implementation as LogicImplementation).tryRestart();
    }, reinitTimeout);
  }

  public clearReinitTimout() {
    if (this.reinitTimeout) {
      clearTimeout(this.reinitTimeout);
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }

  public startReconnectTimeout(time = 50) {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
    }

    // when allready in Race breake
    // give aditional info that in race breake because of no connection
    if (Logic.isPausOverlayVisible() && Logic.implementation.inRaceBreak()) {
      ErrorHandler.instance.showErrorDialog(Languages.instance.getText("err_head"), ErrorHandler.instance.getErrorCommunicationErrorText());
    }

    this.reconnectTimeout = setTimeout(async () => {
      if (!ServerSocketLogic.instance.serverSocketClient.isWebsocketOpen() && !ServerSocketLogic.instance.serverSocketClient.isWebsocketConnectingState()) {
        try {
          ErrorHandler.instance.retryAttempts++;
          const elemNuRetry = document.getElementById("errmodalNumRetry");
          if (elemNuRetry) {
            elemNuRetry.classList.add("newNumb");
            setTimeout(() => {
              elemNuRetry.innerHTML = ErrorHandler.instance.retryAttempts.toString();
              elemNuRetry.classList.remove("newNumb");
            }, time);
          }

          ServerSocketLogic.instance.serverSocketClient.isReconnecting = true;
          await ServerSocketLogic.instance.connectWebSocketClient();
          await ServerSocketLogic.instance.sendReconnectRequest(settings.deviceId);

          // when allready pouse overlay shown because data missing
          // or an fatal error has occured
          if (Logic.isPausOverlayVisible() || (Logic.implementation as LogicImplementation).getGameTimer().gameLoopStopped) {
            // --> reinit Porgramm
            await (Logic.implementation as LogicImplementation).tryRestart();
          }
        } catch (e: any) {
          Logger.error("Error while reconnecting");
          if ((e.errorId = ErrorsBase.DEVICE_NOT_REGISTERED.code)) {
            // when device not registered Error at reconnect
            // --> reinit Programm
            await (Logic.implementation as LogicImplementation).tryRestart();
          } else {
            ServerSocketLogic.instance.serverSocketClient.isReconnecting = false;
            this.startReconnectTimeout();
          }
        }
      }
    }, Settings.socketClosedRetryTime);
  }

  public isFatalErrorAllGames(errObj: ErrorObj): boolean {
    if (
      errObj.code === ErrorsBase.GAME_NOT_LOADED.code ||
      errObj.code === ErrorsBase.GAME_NOT_IN_LIST.code ||
      errObj.code === ErrorsBase.HISTORY_NOT_ENOUGTH.code ||
      errObj.code === ErrorsBase.SOCKET_SERV_CLOSE.code ||
      errObj.code === ErrorsBase.SOCKET_SERVER.code ||
      errObj.code === ErrorsBase.RESULT_NOT_RECEIVED.code ||
      errObj.code === ErrorsBase.RESULT_NOT_START_RACE.code ||
      errObj.code === ErrorsBase.SOCKET_SERV_TIMEOUT.code ||
      errObj.code === ErrorsBase.RUNTIM_ERROR.code
    ) {
      return true;
    }

    return false;
  }

  public abstract isFatalError(errObj: ErrorObj): boolean;

  public abstract setMessageText(errObj: ErrorObj, mesgText: string): string;

  public hideErrorDialog(): void {
    const errElem = document.getElementById("errBack");
    if (errElem) {
      // errElem.innerHTML = errObj.code + "<br/>" + errObj.message;
      errElem.style.display = "none";
    }
  }

  public checkHideErrorDialog(): void {
    if (this.doHideAssetLoadNextRound) {
      this.doHideAssetLoadNextRound = false;
      this.hideErrorDialog();
    }
  }

  public abstract okAction(): void;
}
