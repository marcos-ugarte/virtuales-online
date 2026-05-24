import { IGameRoundResultData, ISockServGameResultResponse, SockServMessageType } from "common/Definitions";
import { ErrorHandler } from "client/LogicImplementation/ErrorHandler";
import { GamesModel } from "client/LogicImplementation/GamesModel";
import { Logger } from "client/Logic/Logger";
import { WebSocketClientBase } from "./base/ServerSocketClientBase";
import { Logic } from "client/Logic/Logic";
import { LogicImplementation } from "client/LogicImplementation/LogicImplementation";

export class WebSocketClient extends WebSocketClientBase {
  public gamesModel?: GamesModel;

  public constructor() {
    super();
  }

  protected handleActiveMessages(message: any) {
    // TODO TEST
    // message.msgType = SockServMessageType.Error;

    switch (message.msgType) {
      case SockServMessageType.GameResult: {
        Logger.debug("Received Game Result");

        const gameResultMessage = message as ISockServGameResultResponse;
        Logger.info("Received Game Result Data" + JSON.stringify(gameResultMessage));

        // TODO TEST
        // const initResult = (Logic.implementation as LogicImplementation).getInitResult();
        // if(initResult){
        //   if(gameResultMessage.gameresult.id === "441_104_20210526" + (initResult.setting.betoffers[0].nbrEvents + 1).toString().padStart(4, "0")){
        //     return;
        //   }
        //   else if(gameResultMessage.gameresult.id === "441_104_20210526" + (initResult.setting.betoffers[0].nbrEvents + 2).toString().padStart(4, "0")){
        //     return;
        //   } else if(gameResultMessage.gameresult.id === "441_104_20210526" + (initResult.setting.betoffers[0].nbrEvents + 3).toString().padStart(4, "0")){
        //     return;
        //   }
        // }

        // TODO TEST
        // const initResult2 = (Logic.implementation as LogicImplementation).getInitResult();
        // if (initResult2) {
        //   const startNoRoundNumber = 586;
        //
        //   if (gameResultMessage.gameresult.id === "321_103_20240523" + (startNoRoundNumber + 0).toString().padStart(4, "0")) {
        //     return;
        //   }
        //   // else if (gameResultMessage.gameresult.id === "241_102_20240523" + (startNoRoundNumber + 1).toString().padStart(4, "0")) {
        //   //   return;
        //   // } else if (gameResultMessage.gameresult.id === "241_102_20240523" + (startNoRoundNumber + 2).toString().padStart(4, "0")) {
        //   //   return;
        //   // }
        // }

        if (this.gamesModel) {
          const gameResultData: IGameRoundResultData = gameResultMessage.gameresult;
          gameResultData.rttStatistics = gameResultMessage.rttStatistics;
          this.gamesModel.updateGameResult(gameResultMessage.gameresult.id, gameResultMessage.gameresult as IGameRoundResultData, true);
        }

        break;
      }
      case SockServMessageType.Error: {
        Logger.error("Received ERROR");

        ErrorHandler.instance.normalErrorHandler(message, true);

        break;
      }
      default: {
        throw new Error("MessageType not handled: " + message.msgType);
      }
    }
  }
}
