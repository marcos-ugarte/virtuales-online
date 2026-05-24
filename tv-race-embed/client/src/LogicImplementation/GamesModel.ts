import { Logger } from "client/Logic/Logger";
import { Logic, settings } from "client/Logic/Logic";
import { IVideoUrls } from "client/Logic/LogicBase";
import {
  IBoxRingPresentationFact,
  IDog633rd,
  IDog63Quotes,
  IDog63RoundHistory,
  IDog63Suprimi,
  IDog63SuprimiEntry,
  IDriverInfo,
  IFightHistoryRow,
  IFightHistoryRowRound,
  IFightInfo,
  IFightResultRound,
  IFightRoundResult,
  IFightVideo,
  IFightVideos,
  IHistoryDriverDog63,
  IHit,
  IIntervalDriver,
  IQuotes,
  IResult,
  IResultBet,
  IRouletteStats,
  IRoundHistory,
  IRoundInfo,
  RoundBonusType,
  VideoState,
  VideoUrlInfo
} from "client/Logic/LogicDefinitions";
import { Dog63QuotesHelper, ITextAndQuote } from "client/LogicImplementation/Dog63Quotes";
import { avgHorseTime, driversHorse, raceIntervalsHorse, trackHorse } from "client/LogicImplementation/ModelHorse";
import { driversBox } from "client/LogicImplementation/ModelKickbox";
import { avgSulkyTime, driversSulky, raceIntervalsSulky, trackSulky } from "client/LogicImplementation/ModelSulky";
import { boxRingPresentationFacts } from "client/LogicImplementationDummy/dummyModelKickBox";
import { ServerSocketLogic } from "client/ServerWebSocket/ServerSocketLogic";
import { SockServGameRoundMessage, SockServLogMessage } from "client/ServerWebSocket/base/ServerSocketLogicBase";
import { KickboxHelper } from "client/VideoScreen/kickbox/KickboxHelper";
import {
  GameLength,
  GameType,
  ICompetitorDataDog,
  ICompetitorDataHorse,
  ICompetitorKart,
  IGameResult,
  IGameRoundData,
  IGameRoundResultData,
  IGameRoundResultVideo,
  IRttStatistic,
  ISockServGameResultData,
  ISockServResponseMessageGameRound,
  IWgpInfo,
  IWgpRounds,
  SkinTypeDefinition
} from "common/Definitions";
import { Settings } from "common/Settings";
import { Util } from "common/Util";
import { ErrorHandler, Errors } from "./ErrorHandler";
import { Languages } from "./Localisation";
import { GAME_LOOP_LENGTH, INIT_NUMB_FUTURE, INIT_NUMB_PAST, LogicImplementation, RACE_BREAK_REQU_INTERVAL } from "./LogicImplementation";
import { avgDog6Time, avgDog8Time, driversDog6, driversDog8, raceIntervalsDog6, raceIntervalsDog63, raceIntervalsDog8, trackDog } from "./ModelDog";
import { driversKart, raceIntervalsKart, trackKart } from "./ModelKart";
import { GameTimerBase, ModelBase } from "./base/GamesModelBase";
import { LanguagesBase } from "./base/LocalisationBase";
import { modelRouletteC4 } from "client/LogicImplementation/ModelRouletteC4";
import { ModelHorseC4 } from "client/LogicImplementation/ModelHorseC4";
import { ModelDogC4 } from "client/LogicImplementation/ModelDog6C4";
import { ErrorsBase } from "client/LogicImplementation/base/ErrorHandlerBase";

export interface IGameResultInfos extends IResult {
  videoUrl: string;
}

export interface ICheckMaxGameNumberResult {
  isRaceBreak: boolean;
  updatedCurIndex: boolean;
}

export class GamesModel {
  public static RASTER_SIZE: number = 5;
  public static HISTROY_LENGTH: number = 5;
  public static HISTROY_LENGTH_BOX: number = 8;
  public static HISTROY_LENGTH_C4: number = 8;

  private gamesList: ModelBase[] = []; // order of list: 0 --> heigest game Id (future)
  private indexCurGame: number = 1;
  private curGameId: string = "";
  private haveDbPot: boolean = false;
  private savedGameResult: ISockServGameResultData | null = null;
  private _raceBreak = false;
  private _showRaceBreakAtStart = false;
  private _showRaceBreakAfterStartVideo = false;
  private _raceBreakShown = false;
  private _nextRaceStartTime: string | null = null;

  private _historyLength: number = GamesModel.HISTROY_LENGTH;

  public constructor() {
    ServerSocketLogic.instance.serverSocketClient.gamesModel = this;
  }

  public get raceBreak() {
    return this._raceBreak;
  }
  public get raceBreakShown() {
    return this._raceBreakShown;
  }
  public get showRaceBreakAtStart() {
    return this._showRaceBreakAtStart;
  }
  public set showRaceBreakAtStart(value: boolean) {
    this._showRaceBreakAtStart = value;
  }
  get showRaceBreakAfterStartVideo(): boolean {
    return this._showRaceBreakAfterStartVideo;
  }
  set showRaceBreakAfterStartVideo(value: boolean) {
    this._showRaceBreakAfterStartVideo = value;
  }
  get nextRaceStartTime(): string | null {
    return this._nextRaceStartTime;
  }
  set nextRaceStartTime(value: string | null) {
    this._nextRaceStartTime = value;
  }
  get historyLength(): number {
    return this._historyLength;
  }

  set historyLength(value: number) {
    this._historyLength = value;
  }

  private updateCurGameIndex() {
    let found = false;

    for (let i = 0; i < this.gamesList.length; i++) {
      if (this.gamesList[i].roundInfo.fullGameId === this.curGameId) {
        this.indexCurGame = i;
        found = true;
        break;
      }
    }

    if (!found) {
      const error = Errors.GAME_NOT_IN_LIST;
      error.message = "Current game id not in list:" + this.curGameId;
      ErrorHandler.instance.normalErrorHandler(error, false);
    }
  }

  public initalGamesSet(gamesList: ModelBase[], nubmerFuture: number) {
    this.gamesList = gamesList;
    this.indexCurGame = nubmerFuture;

    // no games in list --> throw Error
    if (this.gamesList.length <= 0) {
      Logger.error("NO Games in list!!!!");
      throw new Error("NO Games in List!");
    }

    this.indexCurGame = Math.min(this.indexCurGame, this.gamesList.length - 1);
    this.curGameId = this.gamesList[this.indexCurGame].roundInfo.fullGameId;

    for (let i = 0; i < this.gamesList.length; i++) {
      if (i + 1 > this.gamesList.length - 1) {
        break;
      }

      if (this.gamesList[i + 1].result !== null) {
        // before games have allready a result
        this.setHistoryDatas(this.gamesList[i], this.historyLength);
      }
    }
    Logger.debug("Set initial Game length");
    if (Logic.implementation.getIsMultipleGameLengthes()) {
      const curGameData = this.getCurrentGameData();
      const beforeGameData = this.getBeforeGameData();

      let curRoundInterval: GameLength = 240;
      if (curGameData) {
        curRoundInterval = curGameData.roundInfo.roundInterval;
      }

      let beforeRoundInterval: GameLength = curRoundInterval;
      if (beforeGameData) {
        beforeRoundInterval = beforeGameData.roundInfo.roundInterval;
      }

      Logic.implementation.updateGameLoopLength(curRoundInterval, beforeRoundInterval, true);
    }

    Logger.info("Init Games");
    this.logGameIds();
  }

  public checkMaxGameNumberReached(updateIndexCurrent: boolean, currentServerTime: number): ICheckMaxGameNumberResult {
    let raceBreak = false;
    let indexCurrent = this.indexCurGame;
    let currentSet = false;

    for (let i = 0; i < this.gamesList.length; i++) {
      // current game is first where start is not after current server time
      if (!currentSet && this.gamesList[i].getGameStartTime() / 1000 <= currentServerTime) {
        currentSet = true;
        indexCurrent = i;
      }
    }

    if (updateIndexCurrent && this.indexCurGame !== indexCurrent) {
      this.indexCurGame = indexCurrent;
      this.curGameId = this.gamesList[this.indexCurGame].roundInfo.fullGameId;
      Logger.debug("-----------------> Update current index to:" + this.indexCurGame);
    }

    if (this.checkIfLastBeforeABreak(indexCurrent, null)) {
      // check if current game is Last before a Race Break

      raceBreak = true;
      Logger.debug("-----------------> Set Racebreake true, index:" + this.indexCurGame);
    }

    return { isRaceBreak: raceBreak, updatedCurIndex: updateIndexCurrent };
  }

  public setRaceBreak(value: boolean) {
    Logger.debug("Set RACE Break:" + value);
    this._raceBreak = value;
  }

  public checkIsMaxGameNumberInFutureGames(): boolean {
    let indexMaxRound = -1;
    let beforeGameStartTime = -1;
    let indexMaxRoundInterval = -1;

    for (let i = 0; i < this.gamesList.length; i++) {
      if ((Logic.implementation as LogicImplementation).getMaxRoundNumber() === this.gamesList[i].roundInfo.gameId) {
        indexMaxRound = i;
      }

      if (i < this.indexCurGame) {
        const curGameStart = this.gamesList[i].getGameStartTime();

        if (beforeGameStartTime < 0) {
          beforeGameStartTime = curGameStart;
        } else {
          if (Math.abs(curGameStart - beforeGameStartTime) > GAME_LOOP_LENGTH + 2) {
            indexMaxRoundInterval = i;
          }
        }
      }
    }

    if (indexMaxRoundInterval >= 0) {
      return true;
    }

    if (indexMaxRound >= 0 && indexMaxRound < this.indexCurGame) {
      return true;
    }

    return false;
  }

  public checkNewestIsMaxGameNumber(indexGame: number): boolean {
    if (this.checkIfLastBeforeABreak(indexGame, null)) {
      return true;
    }
    return false;
  }

  public checkIfLastBeforeABreak(indexGame: number, serverTime: number | null): boolean {
    if (indexGame > 0) {
      const startIndex = this.gamesList[indexGame].getGameStartTime();
      const startNext = this.gamesList[indexGame - 1].getGameStartTime();

      Logger.debug(
        "GAME_LOOP_LENGTH:" +
          GAME_LOOP_LENGTH +
          " current RoundInterval:" +
          this.gamesList[indexGame].roundInfo.roundInterval +
          "  next RoundInterval:" +
          this.gamesList[indexGame - 1].roundInfo.roundInterval +
          " diff:" +
          (startNext - startIndex) / 1000
      );

      let clalulateGameLoopLength = GAME_LOOP_LENGTH;
      if (Logic.implementation.getIsMultipleGameLengthes()) {
        clalulateGameLoopLength = this.gamesList[indexGame].roundInfo.roundInterval;
      }

      if (startNext - startIndex > (clalulateGameLoopLength + 2) * 1000) {
        this._nextRaceStartTime = Util.formatDateFromUtcStandardDateString(this.gamesList[indexGame - 1].roundInfo.videoStartDt, Languages.instance.getText("dateFormatMin"));
        return true;
      } else {
        if (serverTime !== null) {
          if (startIndex > serverTime) {
            this._nextRaceStartTime = Util.formatDateFromUtcStandardDateString(this.gamesList[indexGame].roundInfo.videoStartDt, Languages.instance.getText("dateFormatMin"));
            return true;
          }
        }

        this._nextRaceStartTime = null;
      }
    } else if (indexGame === 0) {
      if (serverTime !== null) {
        const curGame = this.gamesList[indexGame];
        if (curGame.getGameStartTime() <= serverTime && curGame.getGameStartTime() + GAME_LOOP_LENGTH * 1000 > serverTime) {
          return false;
        } else {
          if (curGame.getGameStartTime() > serverTime) {
            this._nextRaceStartTime = Util.formatDateFromUtcStandardDateString(this.gamesList[indexGame].roundInfo.videoStartDt, Languages.instance.getText("dateFormatMin"));
          }
        }
      } else {
        this._nextRaceStartTime = null;
        return true;
      }
    }

    return false;
  }

  // onStartIntro data
  public getNextGameData() {
    return this.gamesList[this.indexCurGame + -1];
  }

  // onStartRace Data
  public getCurrentGameData(): ModelBase {
    return this.gamesList[this.indexCurGame];
  }

  public getBeforeGameData(): ModelBase {
    return this.gamesList[this.indexCurGame + 1];
  }

  public addNewGameData(newGames: ModelBase[]) {
    const maxfullGameId = this.gamesList[0].roundInfo.fullGameId;
    const addModels: ModelBase[] = [];
    let addNow = false;

    for (const item of newGames) {
      if (addNow) {
        addModels.unshift(item);
      } else {
        if (Logic.implementation.hasJackpotBounus()) {
          // for games already in list update the current jackpot bonus
          for (const inGameListItem of this.gamesList) {
            if (inGameListItem.roundInfo.fullGameId === item.roundInfo.fullGameId) {
              inGameListItem.roundInfo.jackpotValue = item.roundInfo.jackpotValue;
              inGameListItem.roundInfo.oldJackpotValue = item.roundInfo.oldJackpotValue;
              inGameListItem.jackpotHistory = item.jackpotHistory;

              Logger.debug(
                "Updated jackpot Values for roundID:" +
                  inGameListItem.roundInfo.fullGameId +
                  " old Jackpot Value:" +
                  inGameListItem.roundInfo.oldJackpotValue +
                  " jackpot Value:" +
                  inGameListItem.roundInfo.jackpotValue
              );
            }
          }
        }
      }

      if (item.roundInfo.fullGameId === maxfullGameId) {
        addNow = true;
      }
    }

    if (!addNow) {
      // add all games bacaus none off them allready in list
      for (const curModel of newGames) {
        addModels.unshift(curModel);
      }
    }

    this.gamesList = addModels.concat(this.gamesList);
    this.updateCurGameIndex();

    Logger.info("Added new Games");
    this.logGameIds();
  }

  public raceStarted() {
    if (this.indexCurGame < 2) {
      let isError = true;

      if (this.indexCurGame === 1) {
        isError = false;
      } else if (this.indexCurGame === 0) {
        // index 0

        if (this._raceBreak) {
          // in Race break --> no switch
          return;
        } else {
          this.setRaceBreak(true);
          this.showGamePauseView(true);
          isError = false;
          return;
        }
      }

      if (isError) {
        const error = Errors.GAME_NOT_LOADED;
        error.message = "Not enough future games are loaded,  indexCurGame:" + this.indexCurGame;
        ErrorHandler.instance.normalErrorHandler(error, false);
      }
    }

    this.indexCurGame--;
    this.curGameId = this.gamesList[this.indexCurGame].roundInfo.fullGameId;

    if (this.gamesList.length >= INIT_NUMB_PAST + INIT_NUMB_FUTURE) {
      // remove oldest game
      this.gamesList.pop();
    }

    this.calculateHistoryData();

    // Last race before break is started
    if (this.checkNewestIsMaxGameNumber(this.indexCurGame)) {
      this.setRaceBreak(true);
      this.showGamePauseView(false);
    }

    this.updateGameLength();

    Logger.info("Game Modlel round switch, gameLength:" + GAME_LOOP_LENGTH);
    this.logGameIds();
  }

  public updateGameLength() {
    // set Game Loop Length by current game
    if (Logic.implementation.getIsMultipleGameLengthes()) {
      const curGameData = this.getCurrentGameData();
      const beforeGameData = this.getBeforeGameData();

      let curRoundInterval: GameLength = 240;
      if (curGameData) {
        curRoundInterval = curGameData.roundInfo.roundInterval;
      }
      let beforeRoundInterval: GameLength = curRoundInterval;

      if (beforeGameData) {
        beforeRoundInterval = beforeGameData.roundInfo.roundInterval;
      }

      Logic.implementation.updateGameLoopLength(curRoundInterval, beforeRoundInterval, false);

      // TODO TEST
      // if (this.gamesList[this.indexCurGame].roundInfo.gameId % 2 === 0) {
      //   Logic.implementation.updateGameLoopLength(120);
      // } else {
      //   Logic.implementation.updateGameLoopLength(240);
      // }
    }
  }

  public calculateHistoryData() {
    let isKickbox = false;

    if (this.gamesList.length > 0) {
      if (this.gamesList[0].gameType === "box") {
        isKickbox = true;
      }
    }

    if (!isKickbox) {
      for (let i = 0; i < this.gamesList.length; i++) {
        if (i + 1 > this.gamesList.length - 1) {
          break;
        }

        if (this.gamesList[i + 1].result !== null || this.gamesList[i + 1].gotNoResult) {
          // before games have allready a result
          const curModel = this.gamesList[i];
          if (curModel.history.length > 0) {
            // weher history is not allready calculated
            break;
          }

          this.setHistoryDatas(this.gamesList[i], this.historyLength);
        }
      }
    } else {
      for (let i = 0; i < this.gamesList.length; i++) {
        if (i + 1 > this.gamesList.length - 1) {
          break;
        }

        if (this.gamesList[i + 1].result !== null || this.gamesList[i + 1].gotNoResult) {
          // before games have allready a result
          const curModel = this.gamesList[i];
          if (curModel.history.length > 0) {
            // weher history is not allready calculated
            break;
          }

          this.setHistoryDatas(this.gamesList[i], GamesModel.HISTROY_LENGTH_BOX);
        }
      }
    }
  }

  public updateGameResult(roundId: string, result: IGameRoundResultData, checkVideoFade: boolean): ModelBase | null {
    Logger.debug("update Game Result");

    if (this.gamesList.length <= 0) {
      Logger.info("Result was send before Init --> save the result");

      this.savedGameResult = {
        id: roundId,
        finish: result.finish,
        interval: result.interval,
        bonus: result.bonus,
        videoname: result.videoname,
        jackpot: result.jackpot,
        rttStatistics: result.rttStatistics
      };

      Logger.info("saved result:" + JSON.stringify(this.savedGameResult));
      Logger.warn("**** New Result in checkStartRaceVideo: " + this.savedGameResult.id + "  J: " + this.savedGameResult.jackpot + "  BT: " + this.savedGameResult.bonus);
      return null;
    }

    const gameModel: ModelBase = this.getGameWithId(roundId);

    if (gameModel) {
      gameModel.setResultData(result, true);

      Logger.info("updated Result for gameId:" + roundId + " Result:" + JSON.stringify(result));
      Logger.info("Result for gameId:" + roundId + " came at time " + Logic.getExactTimeUntilRace(gameModel.roundInfo.videoStartUnix));

      if (checkVideoFade) {
        (Logic.implementation as LogicImplementation).checkStartRaceVideo(gameModel);
      }

      this.calculateHistoryData();

      return gameModel;
    } else {
      const error = Errors.GAME_NOT_IN_LIST;
      error.message = "Result game id not in list:" + roundId;
      ErrorHandler.instance.normalErrorHandler(error, false);
      return null;
    }
  }

  public setHistoryDatas(gameModel: ModelBase, count: number) {
    if (gameModel.gameType === "box") {
      this.setKicboxHistoryDatas(gameModel, GamesModel.HISTROY_LENGTH_BOX);
    } else if (gameModel.gameType === "dog63") {
      this.setDog63HistoryData(gameModel, GamesModel.HISTROY_LENGTH);
    } else if (gameModel.gameType === "roulette") {
      this.setRouletteHistoryData(gameModel, GamesModel.HISTROY_LENGTH_C4);
    } else {
      const index = this.getIndexWithGameId(gameModel.roundInfo.fullGameId);

      gameModel.history = [];

      for (let i = index + 1; i < index + 1 + count; i++) {
        if (i >= this.gamesList.length) {
          Logger.info("Not enough history games");
          break;
        }

        const hisGame: ModelBase = this.gamesList[i];

        if (hisGame.isDummyGame) {
          continue;
        }

        let firstData: any = null;
        let secondData: any = null;
        if (hisGame.result !== null) {
          const firstTime = Logic.implementation.formatTime(parseFloat(hisGame.result.first.time), { minutes: true, seconds: true, hundredth: true });
          const secondTime = Logic.implementation.formatTime(parseFloat(hisGame.result.second.time), { minutes: true, seconds: true, hundredth: true });
          firstData = {
            driverIndex: hisGame.result.first.driverIndex,
            finishTime: firstTime,
            quote: hisGame.getWinnerOdd(hisGame.result.first.driverIndex),
            firstName: hisGame.drivers[hisGame.result.first.driverIndex].firstName,
            lastName: hisGame.drivers[hisGame.result.first.driverIndex].lastName,
            color: hisGame.drivers[hisGame.result.first.driverIndex].color
          } as any;
          secondData = {
            driverIndex: hisGame.result.second.driverIndex,
            finishTime: secondTime,
            quote: hisGame.getForcastOdd(hisGame.result.first.driverIndex, hisGame.result.second.driverIndex),
            firstName: hisGame.drivers[hisGame.result.second.driverIndex].firstName,
            lastName: hisGame.drivers[hisGame.result.second.driverIndex].lastName,
            color: hisGame.drivers[hisGame.result.second.driverIndex].color
          } as any;

          const roundBonusType = hisGame.result.roundBonusType;
          const newHistory: IRoundHistory = {
            round: hisGame.roundInfo.gameId,
            roundBonusType,
            first: firstData,
            second: secondData,
            it_code_event: hisGame.roundInfo.it_code_event
          };
          gameModel.history.push(newHistory);
        } else {
          Logger.error("Result no set for history Game:" + hisGame.roundInfo.fullGameId);
          const logMessage = new SockServLogMessage(Errors.NO_HIS_RES.code, "Result no set for history Game:" + hisGame.roundInfo.fullGameId);
          ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
            Logger.error("Send log Error:" + JSON.stringify(error));
          });
        }
      }

      // Logger.info("calcualted history data for game:" + gameModel.roundInfo.gameId);
    }
  }

  public setKicboxHistoryDatas(gameModel: ModelBase, count: number) {
    const index = this.getIndexWithGameId(gameModel.roundInfo.fullGameId);

    gameModel.history = [];
    const boxModel = gameModel as ModelBox;
    boxModel.fightHistory = [];

    for (let i = index + 1; i < index + 1 + count; i++) {
      if (i >= this.gamesList.length) {
        Logger.info("Not enough history games");
        break;
      }

      const hisGame: ModelBox = this.gamesList[i] as ModelBox;
      let roundBonusType: RoundBonusType;
      if (hisGame.result) {
        roundBonusType = hisGame.result.roundBonusType;
      }

      if (hisGame.isDummyGame) {
        continue;
      }

      if (hisGame.fightResult) {
        // bar value calculate
        const entireRound1 =
          hisGame.fightResult.result.roundResults[0].redFistCount +
          hisGame.fightResult.result.roundResults[0].redKickCount +
          hisGame.fightResult.result.roundResults[0].blueFistCount +
          hisGame.fightResult.result.roundResults[0].blueKickCount;
        let barRound1 = 2;
        if (hisGame.fightResult.result.roundResults[0].fighter === 0) {
          barRound1 = ((hisGame.fightResult.result.roundResults[0].blueFistCount + hisGame.fightResult.result.roundResults[0].blueKickCount) / entireRound1) * 2;
        }
        if (hisGame.fightResult.result.roundResults[0].fighter === 1) {
          barRound1 = ((hisGame.fightResult.result.roundResults[0].redFistCount + hisGame.fightResult.result.roundResults[0].redKickCount) / entireRound1) * 2;
        }
        const entireRound2 =
          hisGame.fightResult.result.roundResults[1].redFistCount +
          hisGame.fightResult.result.roundResults[1].redKickCount +
          hisGame.fightResult.result.roundResults[1].blueFistCount +
          hisGame.fightResult.result.roundResults[1].blueKickCount;
        let barRound2 = 2;
        if (hisGame.fightResult.result.roundResults[1].fighter === 0) {
          barRound2 = ((hisGame.fightResult.result.roundResults[1].blueFistCount + hisGame.fightResult.result.roundResults[1].blueKickCount) / entireRound2) * 2;
        }
        if (hisGame.fightResult.result.roundResults[1].fighter === 1) {
          barRound2 = ((hisGame.fightResult.result.roundResults[1].redFistCount + hisGame.fightResult.result.roundResults[1].redKickCount) / entireRound2) * 2;
        }

        const entireRound3 =
          hisGame.fightResult.result.roundResults[2].redFistCount +
          hisGame.fightResult.result.roundResults[2].redKickCount +
          hisGame.fightResult.result.roundResults[2].blueFistCount +
          hisGame.fightResult.result.roundResults[2].blueKickCount;
        let barRound3 = 2;
        if (hisGame.fightResult.result.roundResults[2].fighter === 0) {
          barRound3 = ((hisGame.fightResult.result.roundResults[2].blueFistCount + hisGame.fightResult.result.roundResults[2].blueKickCount) / entireRound3) * 2;
        }
        if (hisGame.fightResult.result.roundResults[2].fighter === 1) {
          barRound3 = ((hisGame.fightResult.result.roundResults[2].redFistCount + hisGame.fightResult.result.roundResults[2].redKickCount) / entireRound3) * 2;
        }

        Logger.debug("Round Bars calcualted: gameid:" + hisGame.roundInfo.fullGameId + " Round1:" + barRound1 + " Round2:" + barRound2 + " Round3:" + barRound3);

        const fighterRounds: IFightHistoryRowRound[] = [
          {
            fighterIndex: hisGame.fightResult.result.roundResults[0].fighter,
            quote: hisGame.fightResult.result.roundResults[0].quote,
            bar: barRound1
          },
          {
            fighterIndex: hisGame.fightResult.result.roundResults[1].fighter,
            quote: hisGame.fightResult.result.roundResults[1].quote,
            bar: barRound2
          },
          {
            fighterIndex: hisGame.fightResult.result.roundResults[2].fighter,
            quote: hisGame.fightResult.result.roundResults[2].quote,
            bar: barRound3
          }
        ];

        const newHistory: IFightHistoryRow = {
          fightNumber: hisGame.roundInfo.gameId.toString(),
          resultFighterIndex: hisGame.fightResult.result.fighter,
          resultFighter: hisGame.drivers[hisGame.fightResult.result.fighter],
          rounds: fighterRounds,
          combiBet: hisGame.fightResult.result.resultBetQuote,
          winningBet: hisGame.fightResult.result.quote
        };
        boxModel.fightHistory.push(newHistory);
      }
    }

    // Logger.info("calcualted history data for game:" + gameModel.roundInfo.gameId);
  }

  public setDog63HistoryData(gameModel: ModelBase, count: number) {
    gameModel.history = [];
    const dog63Model = gameModel as ModelDog63;
    dog63Model.dog63History = [];

    const index = this.getIndexWithGameId(gameModel.roundInfo.fullGameId);

    for (let i = index + 1; i < index + 1 + count; i++) {
      if (i >= this.gamesList.length) {
        Logger.info("Not enough history games");
        break;
      }

      const hisGame: ModelDog63 = this.gamesList[i] as ModelDog63;

      if (hisGame.isDummyGame) {
        continue;
      }

      if (hisGame.result !== null) {
        const dog63Quotes = new Dog63QuotesHelper(hisGame.serverOdds);

        if (hisGame.result.third) {
          const drivers: IHistoryDriverDog63[] = [
            {
              driverIndex: hisGame.result.first.driverIndex,
              quote: hisGame.getWinnerOdd(hisGame.result.first.driverIndex),
              betCodeId: 1,
              firstName: "",
              lastName: "",
              finishTime: ""
            },
            {
              driverIndex: hisGame.result.second.driverIndex,
              quote: dog63Quotes.getSecondOdd(hisGame.result.second.driverIndex),
              betCodeId: 13,
              firstName: "",
              lastName: "",
              finishTime: ""
            },
            {
              driverIndex: hisGame.result.third.driverIndex,
              quote: dog63Quotes.getThirdOdd(hisGame.result.third.driverIndex),
              betCodeId: 14,
              firstName: "",
              lastName: "",
              finishTime: ""
            }
          ];

          const p2p3 = [
            {
              name: hisGame.drivers[hisGame.result.first.driverIndex].firstName,
              quoteP2: dog63Quotes.getInFirstTwoWithBetId(hisGame.result.first.driverIndex),
              quoteP3: dog63Quotes.getInFirstThreeWithBetId(hisGame.result.first.driverIndex)
            },
            {
              name: hisGame.drivers[hisGame.result.second.driverIndex].firstName,
              quoteP2: dog63Quotes.getInFirstTwoWithBetId(hisGame.result.second.driverIndex),
              quoteP3: dog63Quotes.getInFirstThreeWithBetId(hisGame.result.second.driverIndex)
            },
            {
              name: hisGame.drivers[hisGame.result.third.driverIndex].firstName,
              quoteP3: dog63Quotes.getInFirstThreeWithBetId(hisGame.result.third.driverIndex)
            }
          ];

          const accippiataList = dog63Quotes.getTwoInThreeNotInOrder(hisGame.result.first.driverIndex, hisGame.result.second.driverIndex, hisGame.result.third.driverIndex);

          let accoppiata = {
            nioio: {
              nio: { quote: 11.1, betCodeId: 5 },
              io: { quote: 23.2, betCodeId: 2 }
            },
            entries: [
              {
                firstDriverIndex: 2,
                secondDriverIndex: 0,
                quote: 2.34,
                betCodeId: 10
              },
              {
                firstDriverIndex: 4,
                secondDriverIndex: 0,
                quote: 2.34,
                betCodeId: 10
              },
              {
                firstDriverIndex: 4,
                secondDriverIndex: 1,
                quote: 2.34,
                betCodeId: 10
              }
            ]
          };

          if (accippiataList.length >= 3) {
            accoppiata = {
              nioio: {
                nio: dog63Quotes.getFirstTwoNotInOrderWithBetCodeid(hisGame.result.first.driverIndex, hisGame.result.second.driverIndex),
                io: {
                  quote: hisGame.getForcastOdd(hisGame.result.first.driverIndex, hisGame.result.second.driverIndex),
                  betCodeId: 2
                }
              },
              entries: [accippiataList[0], accippiataList[1], accippiataList[2]]
            };
          } else {
            Logger.error("Three not in order to less entries for history Game:" + hisGame.roundInfo.fullGameId);
            const logMessage = new SockServLogMessage(Errors.NO_HIS_RES.code, "Three not in order to less entries for history Game:" + hisGame.roundInfo.fullGameId);
            ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
              Logger.error("Send log Error:" + JSON.stringify(error));
            });
          }

          const trio = {
            nio: dog63Quotes.getTrioNotInOrderWidthBetCodeId(hisGame.result.first.driverIndex, hisGame.result.second.driverIndex, hisGame.result.third.driverIndex),
            io: dog63Quotes.getTrioInOrderWithBetCodeId(hisGame.result.first.driverIndex, hisGame.result.second.driverIndex, hisGame.result.third.driverIndex)
          };

          const oddEvenData: ITextAndQuote = dog63Quotes.getOddEven(hisGame.result.first.driverIndex);
          const heighLowData: ITextAndQuote = dog63Quotes.getHeighLow(hisGame.result.first.driverIndex);

          const somma2Number = hisGame.result.first.driverIndex + 1 + (hisGame.result.second.driverIndex + 1);
          const somma2Quote = dog63Quotes.getQuotaSumTwo(somma2Number);

          const somma3Number = hisGame.result.first.driverIndex + 1 + (hisGame.result.second.driverIndex + 1) + (hisGame.result.third.driverIndex + 1);
          const somma3Quote = dog63Quotes.getQuotaSumThree(somma3Number);

          const roundBonusType = hisGame.result.roundBonusType;

          let roundNumber = hisGame.roundInfo.gameId;
          // at italian betoffers use it_code_event
          if (Logic.implementation.getGameInfo().videoLanguage === "it" && hisGame.roundInfo.it_code_event) {
            roundNumber = parseInt(hisGame.roundInfo.it_code_event);
          }

          const newHistory: IDog63RoundHistory = {
            round: roundNumber,
            roundBonusType,
            drivers,
            p2p3,
            accoppiata,
            trio,
            disparyText: oddEvenData.text,
            disparyQuote: { quote: oddEvenData.quote, betCodeId: 9 },
            bassoText: heighLowData.text,
            bassoQuote: { quote: heighLowData.quote, betCodeId: 8 },
            somma2Number,
            somma2Quote: { quote: somma2Quote, betCodeId: 12 },
            somma3Number,
            somma3Quote: { quote: somma3Quote, betCodeId: 11 }
          };

          dog63Model.dog63History.push(newHistory);
        } else {
          Logger.error("No third result for history Game:" + hisGame.roundInfo.fullGameId);
          const logMessage = new SockServLogMessage(Errors.NO_HIS_RES.code, "No third result for history Game:" + hisGame.roundInfo.fullGameId);
          ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
            Logger.error("Send log Error:" + JSON.stringify(error));
          });
        }
      } else {
        Logger.error("Result no set for history Game:" + hisGame.roundInfo.fullGameId);
        const logMessage = new SockServLogMessage(Errors.NO_HIS_RES.code, "Result no set for history Game:" + hisGame.roundInfo.fullGameId);
        ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
          Logger.error("Send log Error:" + JSON.stringify(error));
        });
      }
    }

    // Logger.info("calcualted history data for game:" + gameModel.roundInfo.gameId);
  }

  public setRouletteHistoryData(gameModel: ModelBase, count: number) {
    gameModel.history = [];

    const index = this.getIndexWithGameId(gameModel.roundInfo.fullGameId);

    for (let i = index + 1; i < index + 1 + count; i++) {
      if (i >= this.gamesList.length) {
        Logger.info("Not enough history games");
        break;
      }

      const hisGame: ModelRtt = this.gamesList[i] as ModelRtt;

      if (hisGame.isDummyGame) {
        continue;
      }

      if (hisGame.result !== null) {
        let firstData: any = null;
        let secondData: any = null;

        const firstTime = "";
        const secondTime = "";
        firstData = {
          driverIndex: hisGame.result.first.driverIndex,
          finishTime: firstTime,
          quote: 0,
          firstName: "",
          lastName: "",
          color: 0
        } as any;
        secondData = {
          driverIndex: hisGame.result.second.driverIndex,
          finishTime: secondTime,
          quote: 0,
          firstName: "",
          lastName: "",
          color: 0
        } as any;

        const roundBonusType = hisGame.result.roundBonusType;
        const newHistory: IRoundHistory = {
          round: hisGame.roundInfo.gameId,
          roundBonusType,
          first: firstData,
          second: secondData,
          it_code_event: hisGame.roundInfo.it_code_event
        };
        gameModel.history.push(newHistory);
      } else {
        Logger.error("Result no set for history Game:" + hisGame.roundInfo.fullGameId);
        const logMessage = new SockServLogMessage(Errors.NO_HIS_RES.code, "Result no set for history Game:" + hisGame.roundInfo.fullGameId);
        ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
          Logger.error("Send log Error:" + JSON.stringify(error));
        });
      }
    }

    // Logger.info("calcualted history data for game:" + gameModel.roundInfo.gameId);
  }

  public showGamePauseView(immediately: boolean) {
    Logger.debug("Show Race Break view");

    let startString = "";

    if (this._nextRaceStartTime !== null) {
      startString = this._nextRaceStartTime;
    } else {
      const initResult = (Logic.implementation as LogicImplementation).getInitResult();
      if (initResult !== null) {
        startString = Util.formatRaceBreakTime(initResult.setting.betoffers[0].starttime);
      }
    }

    let pausStartType: "intro" | "race" | "immediately" | false = "intro";

    if (immediately) {
      pausStartType = "immediately";
    }

    Logic.showPauseOverlay(pausStartType, {
      pauseEndTimeText: startString,
      bottomText: Logic.implementation.getText("raceBreakTxt")
    });
    this._raceBreakShown = true;
  }
  public hideGamePauseView() {
    Logger.debug("Hide Race Break view");
    this._raceBreakShown = false;
    this._nextRaceStartTime = null;
    Logic.showPauseOverlay(false);
  }

  public getGameWithId(roundId: string) {
    const gameModel: ModelBase | undefined = this.gamesList.find((item) => item.roundInfo.fullGameId === roundId);

    if (typeof gameModel === "undefined") {
      throw new TypeError("Game with id:" + roundId + " Not in List");
    }

    return gameModel;
  }

  public getIndexWithGameId(roundId: string): number {
    let gameIndex = -1;
    let index: number = 0;
    for (const entry of this.gamesList) {
      if (entry.roundInfo.fullGameId === roundId) {
        gameIndex = index;
        break;
      }
      index++;
    }

    if (gameIndex < 0) {
      throw new TypeError("Index, Game with id:" + roundId + " Not in List");
    }

    return gameIndex;
  }

  private logGameIds() {
    let index: number = 0;
    for (const entry of this.gamesList) {
      let gameLength = "";
      if (Logic.implementation.getIsMultipleGameLengthes()) {
        gameLength = " gameLength:" + entry.roundInfo.roundInterval;
      }
      Logger.debug("index:" + index + " gameId:" + entry.roundInfo.fullGameId + "  game start Time:" + entry.roundInfo.videoStartDt + gameLength);
      index++;
    }

    Logger.debug("Curent game index:" + this.indexCurGame + " gameId:" + this.curGameId);
  }

  public simulateNextGameStatusAtInit() {
    this.indexCurGame += 1;
    this.curGameId = this.gamesList[this.indexCurGame].roundInfo.fullGameId;
    Logger.info("Simulate Next Game status at init");
    this.logGameIds();
  }

  public simulateRaceStartedAtInit() {
    this.indexCurGame -= 1;
    this.curGameId = this.gamesList[this.indexCurGame].roundInfo.fullGameId;
    Logger.info("Simulate Start Race at init");
    this.logGameIds();
  }

  public addIndexCurrent(addNumber: number) {
    this.indexCurGame += addNumber;
    this.curGameId = this.gamesList[this.indexCurGame].roundInfo.fullGameId;
    Logger.info("Updated Index Current");
    this.logGameIds();
  }

  public getGamesList(): ModelBase[] {
    return this.gamesList;
  }

  public clearGamesList() {
    this.gamesList = [];
  }

  public getIndexCurGame(): number {
    return this.indexCurGame;
  }

  public getSaveGameResult(): ISockServGameResultData | null {
    return this.savedGameResult;
  }

  public resetSavedGameResult() {
    this.savedGameResult = null;
  }
}

export interface IRoundInfoEx extends IRoundInfo {
  fullGameId: string;
  videoStartDt: string;
  videoEndDt: string;
  videoStartUnix: number;
  videoEndUnix: number;
  roundInterval: GameLength;
}

export interface IResultExtern extends IResult {
  bonus: number;
  videoname: IGameRoundResultVideo;
}

export class ModelKart extends ModelBase {
  constructor(gameType: GameType) {
    super(gameType);
  }

  public setServerData(data: IGameRoundData) {
    const gameId = parseInt(data.id.replace(data.idSchedule, ""), 10);

    let bonusValue: number | undefined;
    let oldBonusValue: number | undefined;

    if (Logic.implementation.hasJackpotBounus()) {
      if (data.jackpotInfo !== null) {
        bonusValue = data.jackpotInfo.bonusValue;
        oldBonusValue = data.jackpotInfo.oldBonusValue;
        this.jackpotHistory = this.getHistoryDataFromResult(data.jackpotInfo.bonusHistory);
      } else {
        Logger.error("Bonus Flag set but no bonus values given!!");
        this.jackpotHistory = undefined;
      }
    } else {
      this.jackpotHistory = undefined;
    }

    // eslint-disable-next-line max-len
    this.roundInfo = {
      fullGameId: data.id,
      gameId,
      jackpotValue: bonusValue,
      oldJackpotValue: oldBonusValue,
      videoStartDt: data.videoStartDt,
      videoEndDt: data.videoEndDt,
      videoStartUnix: Util.getSecondsSinceFromUTCDate(Util.getDatFromStandardString(data.videoStartDt)),
      videoEndUnix: Util.getSecondsSinceFromUTCDate(Util.getDatFromStandardString(data.videoEndDt)),
      sendPlan: data.idSchedule,
      raceStart: Util.formatDateFromUtcStandardDateString(data.videoStartDt, Languages.instance.getText("dateTimeFormat")),
      raceNumber: gameId.toString().padStart(4, "0"),
      it_code_schedule: data.it_code_schedule,
      it_code_event: data.it_code_event,
      roundInterval: data.roundInterval
    };

    this.drivers = [];

    for (const item of driversKart) {
      this.drivers.push(Object.assign({}, item));
    }

    let drivIndex: number = 0;
    const weightSign = Languages.instance.getText("weightSign");

    for (const prop in data.competitors) {
      if (data.competitors.hasOwnProperty(prop)) {
        const curCompet: ICompetitorKart = data.competitors[prop];
        const curDriver = this.drivers[drivIndex];
        curDriver.firstName = curCompet.firstName;
        curDriver.lastName = curCompet.lastName;

        const driverInfos: IDriverInfo[] = [];
        if (weightSign === "lb") {
          // Logger.debug("Weight in KG:" + curCompet.weight);
          curCompet.weight = curCompet.weight * 2.20462;
          // Logger.debug("Weight in LB:" + curCompet.weight);
        }

        let countryTxt = "-";
        if (curCompet.nationality) {
          countryTxt = Languages.instance.getText("country" + curCompet.nationality);
        }
        driverInfos.push({
          key: Languages.instance.getText("nationality"),
          value: countryTxt
        });
        driverInfos.push({
          key: Languages.instance.getText("weight"),
          value: "" + Logic.implementation.formatNumber(curCompet.weight, 1) + weightSign
        });
        driverInfos.push({
          key: Languages.instance.getText("wins"),
          value: "" + (curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1.toString() : "")
        });
        driverInfos.push({
          key: Languages.instance.getText("theLastFive"),
          value: "" + (curCompet.last5 ? curCompet.last5.split("|").join("-") : "")
        });
        driverInfos.push({
          key: Languages.instance.getText("trendTxt"),
          value: curCompet.trend !== undefined && curCompet.trend !== null ? curCompet.trend.toString() : "3",
          arrow: true
        });

        curDriver.driverInfos = driverInfos;

        if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) > 0) {
          let text = Languages.instance.getText("txtDriverWin");

          if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) % 10 === 1) {
            //for 1, 11, 21, ....
            text = Languages.instance.getText("txtDriverWin1");
          } else if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) % 10 === 0) {
            //for 10,20,30 ...
            text = Languages.instance.getText("txtDriverWin10");
          }

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            // number of race text is for 10,20,30 ...
            Logger.warn("Text is for 10th races");
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName + " " + curDriver.lastName)
            .replace("__RACES__", curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "")
            .replace("__WON__", curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1.toString() : "");
        } else if ((curCompet.nbr2 !== undefined && curCompet.nbr2 !== null ? curCompet.nbr2 : 0) > 0) {
          let text = Languages.instance.getText("txtDriver10"); //for 10,20,30 ...

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            text = Languages.instance.getText("txtDriver"); //for 2-9, 12-19 ...
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName + " " + curDriver.lastName)
            .replace(
              "__RACES__",
              curCompet.nbr2 !== undefined && curCompet.nbr2 !== null
                ? curCompet.nbr2.toString()
                : "" + "/" + (curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "")
            );
        } else {
          let text = Languages.instance.getText("txtDriverNon10"); //for 10,20,30 ...

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            text = Languages.instance.getText("txtDriverNon"); //for 2-9, 12-19 ...
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName + " " + curDriver.lastName)
            .replace("__RACES__", curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "");
        }

        drivIndex++;
      }
    }

    // for ( let i = 0 ; i < this.drivers.length ; i++) {
    //   this.drivers[i].lastName = data.competitors[i + 1];
    // }

    this.serverOdds = data.odds;
    this.track = trackKart;
    // newModel.history = history;

    this.setResultData(data);

    this.colors = {
      white: 0xffffffff,
      green: 0xff148912,
      red: 0xffd6301d,
      panelColor: 0xff242a2f,
      panelColorBottom: 0xff22282c,
      panelColorBottomNumber: 0xff070809
    };
  }

  public setResultData(data: IGameRoundResultData) {
    if (data.finish === null) {
      this.result = null;
    } else {
      // TODO TEST
      // data.jackpot = {
      //   ticketId: "defd77b8230b0c1f",
      //   amount: 783.16,
      //   currency: "€",
      //   location: "Test Loc 2"
      // };

      const curBonusText: string | undefined = this.getJackpotWinString(data);

      let roundBonusType: RoundBonusType;
      if (data.bonus === 2) {
        roundBonusType = "x2";
      } else if (data.bonus === 3) {
        roundBonusType = "x3";
      }

      this.result = {
        first: {
          driverIndex: data.finish[1].competitorIndex - 1,
          time: data.finish[1].time.toString()
        },
        second: {
          driverIndex: data.finish[2].competitorIndex - 1,
          time: data.finish[2].time.toString()
        },
        clockEndTime: data.finish[2].time,
        bonus: data.bonus,
        videoname: data.videoname,
        jackpotWonText: curBonusText,
        roundBonusType
      };
    }

    if (data.interval === null) {
      this.raceIntervals = [];
    } else {
      this.raceIntervals = [];

      for (const item of raceIntervalsKart) {
        this.raceIntervals.push(Object.assign({}, item));
      }

      let varIntDrivers: IIntervalDriver[] = [];

      varIntDrivers.push(
        {
          driverIndex: data.interval["1"][1].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["1"][1].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        },
        {
          driverIndex: data.interval["1"][2].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["1"][2].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        }
      );

      this.raceIntervals[1].drivers = varIntDrivers;
      this.raceIntervals[1].startTime = data.interval["1"][1].time + 1.85;

      varIntDrivers = [];

      varIntDrivers.push(
        {
          driverIndex: data.interval["2"][1].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["2"][1].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        },
        {
          driverIndex: data.interval["2"][2].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["2"][2].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        }
      );

      this.raceIntervals[2].drivers = varIntDrivers;
      this.raceIntervals[2].startTime = data.interval["2"][1].time + 1.85;

      varIntDrivers = [];

      varIntDrivers.push(
        {
          driverIndex: data.interval["3"][1].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["3"][1].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        },
        {
          driverIndex: data.interval["3"][2].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["3"][2].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        }
      );

      this.raceIntervals[3].drivers = varIntDrivers;
      this.raceIntervals[3].startTime = data.interval["3"][1].time + 1.85;
    }

    this.videoname = data.videoname;
  }
}

export class ModelDog extends ModelBase {
  constructor(gameType: GameType) {
    super(gameType);
  }

  public setServerData(data: IGameRoundData) {
    const gameId = parseInt(data.id.replace(data.idSchedule, ""), 10);

    let bonusValue: number | undefined;
    let oldBonusValue: number | undefined;

    if (Logic.implementation.hasJackpotBounus()) {
      if (data.jackpotInfo !== null) {
        bonusValue = data.jackpotInfo.bonusValue;
        oldBonusValue = data.jackpotInfo.oldBonusValue;
        this.jackpotHistory = this.getHistoryDataFromResult(data.jackpotInfo.bonusHistory);
      } else {
        Logger.error("Bonus Flag set but no bonus values given!!");
        this.jackpotHistory = undefined;
      }
    } else {
      this.jackpotHistory = undefined;
    }

    // eslint-disable-next-line max-len
    this.roundInfo = {
      fullGameId: data.id,
      gameId,
      jackpotValue: bonusValue,
      oldJackpotValue: oldBonusValue,
      videoStartDt: data.videoStartDt,
      videoEndDt: data.videoEndDt,
      videoStartUnix: Util.getSecondsSinceFromUTCDate(Util.getDatFromStandardString(data.videoStartDt)),
      videoEndUnix: Util.getSecondsSinceFromUTCDate(Util.getDatFromStandardString(data.videoEndDt)),
      sendPlan: data.idSchedule,
      raceStart: Util.formatDateFromUtcStandardDateString(data.videoStartDt, Languages.instance.getText("dateTimeFormat")),
      raceNumber: gameId.toString().padStart(4, "0"),
      it_code_schedule: data.it_code_schedule,
      it_code_event: data.it_code_event,
      roundInterval: data.roundInterval
    };

    this.drivers = [];
    let combCount = 0;

    switch (this.gameType) {
      case "dog6":
        for (const item of driversDog6) {
          this.drivers.push(Object.assign({}, item));
          combCount++;
          if (combCount >= GamesModel.RASTER_SIZE) {
            break;
          }
        }
        break;
      case "dog8":
        for (const item of driversDog8) {
          this.drivers.push(Object.assign({}, item));
          combCount++;
          if (combCount >= GamesModel.RASTER_SIZE) {
            break;
          }
        }
        break;

      default:
        Logger.error("Illegal Dog game Type:" + this.gameType);
    }

    let drivIndex: number = 0;
    const weightSign = Languages.instance.getText("weightSign");

    for (const prop in data.competitors) {
      if (data.competitors.hasOwnProperty(prop)) {
        const curCompet: ICompetitorDataDog = data.competitors[prop];
        const curDriver = this.drivers[drivIndex];
        curDriver.firstName = curCompet.name;
        curDriver.lastName = "";

        const driverInfos = [];

        if (weightSign === "lb") {
          // Logger.debug("Weight in KG:" + curCompet.weight);
          curCompet.weight = curCompet.weight * 2.20462;
          // Logger.debug("Weight in LB:" + curCompet.weight);
        }

        driverInfos.push({
          key: Languages.instance.getText("weight"),
          value: /*"65lb"*/ Logic.implementation.formatNumber(curCompet.weight, 1) + weightSign
        });
        driverInfos.push({
          key: Languages.instance.getText("wins"),
          value: curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1.toString() : ""
        });
        driverInfos.push({
          key: Languages.instance.getText("theLastFive"),
          value: curCompet.last5 ? curCompet.last5.split("|").join("-") : ""
        });
        driverInfos.push({
          key: Languages.instance.getText("trendTxt"),
          value: curCompet.trend !== undefined && curCompet.trend !== null ? curCompet.trend.toString() : "3",
          arrow: true
        });

        curDriver.driverInfos = driverInfos;

        if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) > 0) {
          let text = Languages.instance.getText("txtDogWin");

          if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) % 10 === 1) {
            //for 1, 11, 21, ....
            text = Languages.instance.getText("txtDogWin1");
          } else if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) % 10 === 0) {
            //for 10,20,30 ...
            text = Languages.instance.getText("txtDogWin10");
          }

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            // number of race text is for 10,20,30 ...
            Logger.warn("Text is for 10th races");
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName.toUpperCase() + " " + curDriver.lastName.toUpperCase())
            .replace("__RACES__", curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "")
            .replace("__WON__", curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1.toString() : "");
        } else if ((curCompet.nbr2 !== undefined && curCompet.nbr2 !== null ? curCompet.nbr2 : 0) > 0) {
          let text = Languages.instance.getText("txtDogInf10"); //for 10,20,30 ...

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            text = Languages.instance.getText("txtDogInf"); //for 2-9, 12-19 ...
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName.toUpperCase() + " " + curDriver.lastName.toUpperCase())
            .replace(
              "__RACES__",
              curCompet.nbr2 !== undefined && curCompet.nbr2 !== null
                ? curCompet.nbr2.toString()
                : "" + "/" + (curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "")
            );
        } else {
          let text = Languages.instance.getText("txtDogNon10"); //for 10,20,30 ...

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            text = Languages.instance.getText("txtDogNon"); //for 2-9, 12-19 ...
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName.toUpperCase() + " " + curDriver.lastName.toUpperCase())
            .replace("__RACES__", curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "");
        }

        drivIndex++;
      }
    }

    // for ( let i = 0 ; i < this.drivers.length ; i++) {
    //   this.drivers[i].lastName = data.competitors[i + 1];
    // }

    this.serverOdds = data.odds;
    this.track = trackDog;

    let info = trackDog.facts.find((i) => i.key === Languages.instance.getText("avgTime") + ":");
    if (info) {
      if (this.gameType === "dog6") {
        info.value = Util.formatValue(avgDog6Time, 2, LanguagesBase.commaSymbol);
      } else if (this.gameType === "dog8") {
        info.value = Util.formatValue(avgDog8Time, 2, LanguagesBase.commaSymbol);
      }
    }

    // TODO TEST
    // data.courseConditions = "slow";
    // data.	weather =  "bad";
    // data.	temperature =  12;
    // data.	humidity =  65;
    // data.	wind =  "5 SW";

    info = this.track.facts.find((i) => i.key === Languages.instance.getText("courseCond") + ":");
    if (info) {
      if (data.courseConditions) {
        info.value = Languages.instance.getText(data.courseConditions);
      }
    }

    let weatherTxt = "FINE";

    if (data.weather) {
      weatherTxt = Languages.instance.getText(data.weather);
    }

    this.track.lapMapFacts = [
      Languages.instance.getText("weather") + ": <b>" + weatherTxt + "</b>",
      Languages.instance.getText("tempShort") + ": <b>" + data.temperature + "°C</b>",
      Languages.instance.getText("humidity") + ": <b>" + data.humidity + "%</b>",
      Languages.instance.getText("wind") + ": <b>" + data.wind + "</b>"
    ];

    // newModel.history = history;

    this.setResultData(data);

    if (Logic.gameInfo?.gameSkin === SkinTypeDefinition.CLASSIC) {
      this.colors = ModelDogC4.colors;
    } else {
      this.colors = {
        white: 0xffffffff,
        green: 0xff148912,
        red: 0xffd6301d,
        panelColor: 0xff242a2f,
        panelColorBottom: 0xff22282c,
        panelColorBottomNumber: 0xff070809
      };
    }
  }

  public setResultData(data: IGameRoundResultData) {
    if (data.finish === null) {
      this.result = null;
    } else {
      // TODO TEST
      // data.jackpot = {
      //   ticketId: "defd77b8230b0c1f",
      //   amount: 783.16,
      //   currency: "€",
      //   location: "Test Loc 2"
      // };

      const curBonusText: string | undefined = this.getJackpotWinString(data);
      let roundBonusType: RoundBonusType;
      if (data.bonus === 2) {
        roundBonusType = "x2";
      } else if (data.bonus === 3) {
        roundBonusType = "x3";
      }

      this.result = {
        first: {
          driverIndex: data.finish[1].competitorIndex - 1,
          time: data.finish[1].time.toString()
        },
        second: {
          driverIndex: data.finish[2].competitorIndex - 1,
          time: data.finish[2].time.toString()
        },
        clockEndTime: data.finish[2].time,
        bonus: data.bonus,
        videoname: data.videoname,
        jackpotWonText: curBonusText,
        roundBonusType
      };

      // TODO TEST
      // this.result.videoname.mp4 = "https://d1d5bk95n21f2z.cloudfront.net/dog6/R001_text_h.mp4?Expires=1796914389&Signature=Dn5x1nE8YCwduMJfAIPFiRMTXCIaV-j3YqhJkMWJzT5rbY9E20bdxrmdjuuBK8~umCGjX-x19gfKkQkZ0zdrj2DoPPhsKJPDvbNGcLPKNLJNl7zgKwkXINddANvMpNryssktVq9T3RxGr1i8~9hPVGHWkobEv7qfnU2SU5LRrG5Nt603QQimJb3GeBmbR8monafr4HwG765sfaGkVu2HWpL489seDYaxMagm7aqh0CsmzAgL0k9mKTmfn-bB1h8e3yjHt9eUjJZ7UK2XyEW-~K8J0x~BeKDxbccJcj1WMsXfFjkE30yDzggUiU4X609eWXhzKlKYMNGOBAl2jc32vg__&Key-Pair-Id=APKAJZ22HNAJBPFO2JSA";
      // this.result.videoname.jpg = "https://d1d5bk95n21f2z.cloudfront.net/dog6/R001_text_h.jpg?Expires=1796914389&Signature=jAC78aPWEcNSjo7o7shQzDp9wATvxBTejWTBdxvmbCX5~jJ-yP7KupOgIYBQEIzmHkLLYfN1qePE5A0veCLlr7JFi0ps3DoPC671ru7r2tRnqMFViCSdP~RII8wRDR0LN3L-sNr-Y1vLeYuJNY114lpmVeQ3YcOSehEdxUJjR~Iag~Xr9B4R6wGl-vbFHaMEgO8NYQOKXvojqPLyuE7k94WwluOBfKuBRoy~L9yEoZt70ei8rBPTV4MWC~~rHYqTqU815ozA~JMpxgvplH7Ii2bIkpCFne6XpgGDIOMuaG5WF-J0hxHqu6ulOmDNsEPCYJsUxfxPhrTKecIyfgZifg__&Key-Pair-Id=APKAJZ22HNAJBPFO2JSA";
    }

    if (data.interval === null) {
      this.raceIntervals = [];
    } else {
      this.raceIntervals = [];
      let raceIntervalsDogs = raceIntervalsDog6;
      if (this.gameType === "dog6") {
        raceIntervalsDogs = raceIntervalsDog6;
      } else if (this.gameType === "dog8") {
        raceIntervalsDogs = raceIntervalsDog8;
      }

      for (const item of raceIntervalsDogs) {
        this.raceIntervals.push(Object.assign({}, item));
      }

      let varIntDrivers: IIntervalDriver[] = [];

      varIntDrivers.push(
        {
          driverIndex: data.interval["1"][1].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["1"][1].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        },
        {
          driverIndex: data.interval["1"][2].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["1"][2].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        }
      );

      let intervalOffset1 = 0.92;
      let intervalOffset2 = 0.92;

      if (this.gameType === "dog8") {
        intervalOffset1 = 0.85;
        intervalOffset2 = 0.7;
      }

      this.raceIntervals[1].drivers = varIntDrivers;
      this.raceIntervals[1].startTime = data.interval["1"][1].time + intervalOffset1;

      varIntDrivers = [];

      varIntDrivers.push(
        {
          driverIndex: data.interval["2"][1].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["2"][1].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        },
        {
          driverIndex: data.interval["2"][2].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["2"][2].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        }
      );

      this.raceIntervals[2].drivers = varIntDrivers;
      this.raceIntervals[2].startTime = data.interval["2"][1].time + intervalOffset2;
    }

    this.videoname = data.videoname;
  }
}

export class ModelBox extends ModelBase {
  public static DUMMY_LAST_FIST_KICK = 999999999999999999999;

  public resultBet?: IResultBet[][] = [
    [
      { r1: 1, r2: 1, r3: 1, quote: 0.0 },
      { r1: 1, r2: 1, r3: 2, quote: 0.0 },
      { r1: 1, r2: 1, r3: 0, quote: 0.0 },
      { r1: 1, r2: 2, r3: 1, quote: 0.0 },
      { r1: 1, r2: 0, r3: 1, quote: 0.0 },
      { r1: 1, r2: 0, r3: 0, quote: 0.0 },
      { r1: 2, r2: 1, r3: 1, quote: 0.0 },
      { r1: 2, r2: 1, r3: 0, quote: 0.0 },
      { r1: 2, r2: 0, r3: 1, quote: 0.0 },
      { r1: 0, r2: 1, r3: 1, quote: 0.0 },
      { r1: 0, r2: 1, r3: 0, quote: 0.0 },
      { r1: 0, r2: 2, r3: 1, quote: 0.0 },
      { r1: 0, r2: 0, r3: 1, quote: 0.0 }
    ],
    [
      { r1: 2, r2: 2, r3: 2, quote: 0.0 },
      { r1: 2, r2: 2, r3: 1, quote: 0.0 },
      { r1: 2, r2: 2, r3: 0, quote: 0.0 },
      { r1: 2, r2: 1, r3: 2, quote: 0.0 },
      { r1: 2, r2: 0, r3: 2, quote: 0.0 },
      { r1: 2, r2: 0, r3: 0, quote: 0.0 },
      { r1: 1, r2: 2, r3: 2, quote: 0.0 },
      { r1: 1, r2: 2, r3: 0, quote: 0.0 },
      { r1: 1, r2: 0, r3: 2, quote: 0.0 },
      { r1: 0, r2: 2, r3: 2, quote: 0.0 },
      { r1: 0, r2: 2, r3: 0, quote: 0.0 },
      { r1: 0, r2: 1, r3: 2, quote: 0.0 },
      { r1: 0, r2: 0, r3: 2, quote: 0.0 }
    ]
  ];
  public fightQuotes?: IQuotes = {
    fighters: [
      {
        rounds: [
          { result: "1", quote: 0.0 },
          { result: "1", quote: 0.0 },
          { result: "1", quote: 0.0 }
        ],
        result: "1",
        name: "",
        winnerBet: 0.0,
        combiBet: 0.0
      },
      {
        rounds: [
          { result: "1", quote: 0.0 },
          { result: "1", quote: 0.0 },
          { result: "1", quote: 0.0 }
        ],
        result: "1",
        name: "",
        winnerBet: 0.0,
        combiBet: 0.0
      }
    ],
    quotesTie: [
      { result: "1", quote: 0.0 },
      { result: "1", quote: 0.0 },
      { result: "x", quote: 0.0 }
    ],
    fight: 0
  };
  public fightResult?: IFightInfo;
  public fightHistory?: IFightHistoryRow[];
  public boxRingPresentationFacts?: IBoxRingPresentationFact[];
  public fightVideos?: IFightVideos;
  public wgpInfo?: IWgpInfo;
  protected clipOffset: number = 0;
  protected blueFistNumber: number = 0;
  protected blueKickNumber: number = 0;
  protected redFistNumber: number = 0;
  protected redKickNumber: number = 0;

  constructor(gameType: GameType) {
    super(gameType);
  }

  public convertFromServerOdds() {
    this.odds = this.serverOdds;
    Logger.info("Odds Set           :" + this.odds);
  }

  public setServerData(data: IGameRoundData) {
    const gameId = parseInt(data.id.replace(data.idSchedule, ""), 10);

    let bonusValue: number | undefined;
    let oldBonusValue: number | undefined;

    if (Logic.implementation.hasJackpotBounus()) {
      if (data.jackpotInfo !== null) {
        bonusValue = data.jackpotInfo.bonusValue;
        oldBonusValue = data.jackpotInfo.oldBonusValue;
        this.jackpotHistory = this.getHistoryDataFromResult(data.jackpotInfo.bonusHistory);
      } else {
        Logger.error("Bonus Flag set but no bonus values given!!");
        this.jackpotHistory = undefined;
      }
    } else {
      this.jackpotHistory = undefined;
    }

    this.roundInfo = {
      fullGameId: data.id,
      gameId,
      jackpotValue: bonusValue,
      oldJackpotValue: oldBonusValue,
      videoStartDt: data.videoStartDt,
      videoEndDt: data.videoEndDt,
      videoStartUnix: Util.getSecondsSinceFromUTCDate(Util.getDatFromStandardString(data.videoStartDt)),
      videoEndUnix: Util.getSecondsSinceFromUTCDate(Util.getDatFromStandardString(data.videoEndDt)),
      sendPlan: data.idSchedule,
      raceStart: Util.formatDateFromUtcStandardDateString(data.videoStartDt, Languages.instance.getText("dateTimeFormat")),
      raceNumber: gameId.toString().padStart(4, "0"),
      roundInterval: data.roundInterval
    };
    this.serverOdds = data.odds;
    this.convertFromServerOdds();

    this.wgpInfo = data.wgpInfo;
    if (data.wgpInfo) {
      let firstName = "";
      let lastName = "";
      const indexFirstSpace = data.wgpInfo.fighterBlue.name.indexOf(" ");
      if (indexFirstSpace > 0) {
        firstName = data.wgpInfo.fighterBlue.name.substr(0, indexFirstSpace);
        lastName = data.wgpInfo.fighterBlue.name.substr(indexFirstSpace + 1, data.wgpInfo.fighterBlue.name.length);
      } else {
        firstName = data.wgpInfo.fighterBlue.name;
        lastName = "";
      }
      let firstNameRed = "";
      let lastNameRed = "";
      const indexFirstSpaceRed = data.wgpInfo.fighterRed.name.indexOf(" ");
      if (indexFirstSpaceRed > 0) {
        firstNameRed = data.wgpInfo.fighterRed.name.substr(0, indexFirstSpaceRed);
        lastNameRed = data.wgpInfo.fighterRed.name.substr(indexFirstSpaceRed + 1, data.wgpInfo.fighterRed.name.length);
      } else {
        firstNameRed = data.wgpInfo.fighterRed.name;
        lastNameRed = "";
      }

      const weightSign = Languages.instance.getText("weightSign");
      let blueWeight = data.wgpInfo.fighterBlue.weight;
      let redWeight = data.wgpInfo.fighterRed.weight;

      if (weightSign === "lb") {
        // Logger.debug("Weight in KG:" + blueWeight);
        blueWeight = blueWeight * 2.20462;
        // Logger.debug("Weight in LB:" + blueWeight);
        // Logger.debug("Weight in KG:" + redWeight);
        redWeight = redWeight * 2.20462;
        // Logger.debug("Weight in LB:" + redWeight);
      }

      let winRateBlue = "0";
      let strikeRateBlue = "0";
      if (data.wgpInfo.fighterBlue.winRate && data.wgpInfo.fighterBlue.strikeRate) {
        winRateBlue = Logic.implementation.formatNumber(data.wgpInfo.fighterBlue.winRate, 2);
        strikeRateBlue = Logic.implementation.formatNumber(data.wgpInfo.fighterBlue.strikeRate, 2);
      }
      let winRateRed = "0";
      let strikeRateRed = "0";
      if (data.wgpInfo.fighterBlue.winRate && data.wgpInfo.fighterBlue.strikeRate) {
        winRateRed = Logic.implementation.formatNumber(data.wgpInfo.fighterRed.winRate, 2);
        strikeRateRed = Logic.implementation.formatNumber(data.wgpInfo.fighterRed.strikeRate, 2);
      }

      this.drivers = [
        {
          color: driversBox[0].color,
          color2: driversBox[0].color2,
          firstName,
          lastName,
          driverInfos: [
            {
              key: Languages.instance.getText("heritage") + ":",
              value: Languages.instance.getText("wgp_ctr" + data.wgpInfo.fighterBlue.heritageLong)
            },
            {
              key: Languages.instance.getText("ageTxt") + ":",
              value: data.wgpInfo.fighterBlue.age.toString()
            },
            {
              key: Languages.instance.getText("weight") + ":",
              value: Logic.implementation.formatNumber(blueWeight, 2) + " " + weightSign
            },
            {
              key: Languages.instance.getText("winRate") + ":",
              value: winRateBlue
            },
            {
              key: Languages.instance.getText("strikeRateWgp") + ":",
              value: strikeRateBlue
            },
            {
              key: Languages.instance.getText("wgpType") + ":",
              value: Languages.instance.getText("wgp_ty" + data.wgpInfo.fighterBlue.type)
            }
          ],
          driverBarText: "",
          heritageShort: Languages.instance.getText("wgp_cts" + data.wgpInfo.fighterBlue.heritageShort)
        },
        {
          color: driversBox[1].color,
          color2: driversBox[1].color2,
          firstName: firstNameRed,
          lastName: lastNameRed,
          driverInfos: [
            {
              key: Languages.instance.getText("heritage") + ":",
              value: Languages.instance.getText("wgp_ctr" + data.wgpInfo.fighterRed.heritageLong)
            },
            {
              key: Languages.instance.getText("ageTxt") + ":",
              value: data.wgpInfo.fighterRed.age.toString()
            },
            {
              key: Languages.instance.getText("weight") + ":",
              value: Logic.implementation.formatNumber(redWeight, 2) + " " + weightSign
            },
            {
              key: Languages.instance.getText("winRate") + ":",
              value: winRateRed
            },
            {
              key: Languages.instance.getText("strikeRateWgp") + ":",
              value: strikeRateRed
            },
            {
              key: Languages.instance.getText("wgpType") + ":",
              value: Languages.instance.getText("wgp_ty" + data.wgpInfo.fighterRed.type)
            }
          ],
          driverBarText: "",
          heritageShort: Languages.instance.getText("wgp_cts" + data.wgpInfo.fighterRed.heritageShort)
        }
      ];
    }
    this.boxRingPresentationFacts = boxRingPresentationFacts;

    let weightclassTxt = "";
    if (data.wgpInfo) {
      weightclassTxt = Languages.instance.getText("wgp_Wc" + data.wgpInfo.weightClass.replace(/\s/g, ""));
    }

    this.boxRingPresentationFacts[0].title = Languages.instance.getText("rounds");
    this.boxRingPresentationFacts[0].values = ["1", "2", "3"];
    this.boxRingPresentationFacts[1].title = Languages.instance.getText("duration");
    this.boxRingPresentationFacts[1].values = ["", "1", "2", "3"];
    this.boxRingPresentationFacts[1].postfix = Languages.instance.getText("shortMinutes");
    this.boxRingPresentationFacts[2].title = Languages.instance.getText("weight");
    this.boxRingPresentationFacts[2].values = [];
    this.boxRingPresentationFacts[2].postfix = weightclassTxt;

    if (this.resultBet) {
      this.resultBet[0][0].quote = this.odds[11];
      this.resultBet[0][1].quote = this.odds[12];
      this.resultBet[0][2].quote = this.odds[13];
      this.resultBet[0][3].quote = this.odds[14];
      this.resultBet[0][4].quote = this.odds[17];
      this.resultBet[0][5].quote = this.odds[19];
      this.resultBet[0][6].quote = this.odds[20];
      this.resultBet[0][7].quote = this.odds[22];
      this.resultBet[0][8].quote = this.odds[26];
      this.resultBet[0][9].quote = this.odds[29];
      this.resultBet[0][10].quote = this.odds[31];
      this.resultBet[0][11].quote = this.odds[32];
      this.resultBet[0][12].quote = this.odds[35];

      this.resultBet[1][0].quote = this.odds[24];
      this.resultBet[1][1].quote = this.odds[23];
      this.resultBet[1][2].quote = this.odds[25];
      this.resultBet[1][3].quote = this.odds[21];
      this.resultBet[1][4].quote = this.odds[27];
      this.resultBet[1][5].quote = this.odds[28];
      this.resultBet[1][6].quote = this.odds[15];
      this.resultBet[1][7].quote = this.odds[16];
      this.resultBet[1][8].quote = this.odds[18];
      this.resultBet[1][9].quote = this.odds[33];
      this.resultBet[1][10].quote = this.odds[34];
      this.resultBet[1][11].quote = this.odds[30];
      this.resultBet[1][12].quote = this.odds[36];
    }

    if (this.fightQuotes) {
      if (data.wgpInfo) {
        this.fightQuotes.fight = data.wgpInfo?.raceID;
        this.fightQuotes.fighters[0].name = data.wgpInfo.fighterBlue.name;
        this.fightQuotes.fighters[0].rounds[0].quote = this.odds[2];
        this.fightQuotes.fighters[0].rounds[1].quote = this.odds[5];
        this.fightQuotes.fighters[0].rounds[2].quote = this.odds[8];
        this.fightQuotes.fighters[0].winnerBet = this.odds[0];
        this.fightQuotes.fighters[1].name = data.wgpInfo.fighterBlue.name;
        this.fightQuotes.fighters[1].rounds[0].quote = this.odds[3];
        this.fightQuotes.fighters[1].rounds[1].quote = this.odds[6];
        this.fightQuotes.fighters[1].rounds[2].quote = this.odds[9];
        this.fightQuotes.fighters[1].winnerBet = this.odds[1];
        this.fightQuotes.quotesTie[0].quote = this.odds[4];
        this.fightQuotes.quotesTie[1].quote = this.odds[7];
        this.fightQuotes.quotesTie[2].quote = this.odds[10];
      }
    }

    this.track = trackKart;

    this.setResultData(data);

    this.colors = {
      white: 0xffffffff,
      green: 0xff148912,
      red: 0xffd6301d,
      panelColor: 0xff242a2f,
      panelColorBottom: 0xff22282c,
      panelColorBottomNumber: 0xff070809
    };
  }

  public setResultData(data: IGameRoundResultData) {
    Logger.debug("Set Result round:" + this.roundInfo.fullGameId);

    if (data.finish === null) {
      this.result = null;
    } else {
      // TODO TEST
      // data.jackpot = {
      //   ticketId: "defd77b8230b0c1f",
      //   amount: 783.16,
      //   currency: "€",
      //   location: "Test Loc 2"
      // };

      const curBonusText: string | undefined = this.getJackpotWinString(data);

      let roundBonusType: RoundBonusType;
      if (data.bonus === 2) {
        roundBonusType = "x2";
      } else if (data.bonus === 3) {
        roundBonusType = "x3";
      }

      this.result = {
        first: {
          driverIndex: data.finish[1].competitorIndex - 1,
          time: "1:02"
        },
        second: {
          driverIndex: data.finish[2].competitorIndex - 1,
          time: "1:03"
        },
        clockEndTime: 46,
        bonus: data.bonus,
        videoname: data.videoname,
        jackpotWonText: curBonusText,
        roundBonusType
      };

      // TODO TEST RESULT VIDEO
      // this.result.videoname.mp4 = "/.local/box/WGP19FG_Fight1_Result_RED.mp4"
      // this.result.videoname.jpg = "/.local/box/WGP19FG_Fight1_Result_RED.jpg"

      // TODO TEST ROUND RESULT VIDEOS
      // if(data.wgpRounds){
      // data.wgpRounds.round1.mp4 =  ".local/wpg/WGP19FG_Fight1_Round_1_DRAW.mp4"
      // data.wgpRounds.round1.jpg = ".local/wpg/WGP19FG_Fight1_Round_1_DRAW_Stillframe_End.jpg"
      // data.wgpRounds.round2.mp4 =  ".local/wpg/WGP19FG_Fight1_Round_2_BLUE.mp4"
      // data.wgpRounds.round2.jpg = ".local/wpg/WGP19FG_Fight1_Round_2_BLUE_Stillframe_End.jpg"
      // data.wgpRounds.round3.mp4 =  ".local/wpg/WGP19FG_Fight1_Round_3_DRAW.mp4"
      // data.wgpRounds.round3.jpg = ".local/wpg/WGP19FG_Fight1_Round_3_DRAW_Stillframe_End"
      // }

      if (data.finish["3"] && data.finish["4"] && data.wgpRounds) {
        const roundResults: IFightRoundResult[] = [
          { round: 1, fighter: data.finish["2"].competitorIndex - 1 },
          { round: 2, fighter: data.finish["3"].competitorIndex - 1 },
          { round: 3, fighter: data.finish["4"].competitorIndex - 1 }
        ];
        const roundQuotes: IFightResultRound[] = [
          {
            fighter: data.finish["2"].competitorIndex - 1,
            quote: this.getRoundWinnerQuote(1, data.finish["2"].competitorIndex),
            blueFistCount: data.wgpRounds?.round1.blueFistCount,
            blueKickCount: data.wgpRounds?.round1.blueKickCount,
            redFistCount: data.wgpRounds?.round1.redFistCount,
            redKickCount: data.wgpRounds.round1.redKickCount
          },
          {
            fighter: data.finish["3"].competitorIndex - 1,
            quote: this.getRoundWinnerQuote(2, data.finish["3"].competitorIndex),
            blueFistCount: data.wgpRounds?.round2.blueFistCount,
            blueKickCount: data.wgpRounds?.round2.blueKickCount,
            redFistCount: data.wgpRounds?.round2.redFistCount,
            redKickCount: data.wgpRounds.round2.redKickCount
          },
          {
            fighter: data.finish["4"].competitorIndex - 1,
            quote: this.getRoundWinnerQuote(3, data.finish["4"].competitorIndex),
            blueFistCount: data.wgpRounds?.round3.blueFistCount,
            blueKickCount: data.wgpRounds?.round3.blueKickCount,
            redFistCount: data.wgpRounds?.round3.redFistCount,
            redKickCount: data.wgpRounds.round3.redKickCount
          }
        ];
        this.fightResult = {
          hits: [],
          roundResults,
          result: {
            roundResults: roundQuotes,
            resultBetQuote: this.getRoundBetsResultsQuote(data.finish),
            quote: this.getWinnerBetQuote(data.finish),
            fighter: data.finish["1"].competitorIndex - 1
          }
        };

        if (data.wgpRounds) {
          this.calculateRoundsHits(data.wgpRounds);
        } else {
          // TODO send log bei allen Fhelern hier
          Logger.error("Error Kickbox Result: no wgpRound Data");
          const logMessage = new SockServLogMessage(Errors.KICKBOX_DATA_ERROR.code, "Error Kickbox Result: no wgpRound Data");
          ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
            Logger.error("Send log Error:" + JSON.stringify(errorData));
          });
        }

        if (this.fightQuotes) {
          this.fightQuotes.fighters[0].combiBet = this.getRoundBetsResultsQuote(data.finish);
          this.fightQuotes.fighters[1].combiBet = this.getRoundBetsResultsQuote(data.finish);
        } else {
          Logger.error("Error Kickbox Result: no fighter Quotes!");
          const logMessage = new SockServLogMessage(Errors.KICKBOX_DATA_ERROR.code, "Error Kickbox Result: no fighter Quotes!");
          ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
            Logger.error("Send log Error:" + JSON.stringify(errorData));
          });
        }
      } else {
        Logger.error("Error Kickbox Result: finish3 or finish 4 not set!");
        const logMessage = new SockServLogMessage(Errors.KICKBOX_DATA_ERROR.code, "Error Kickbox Result: finish3 or finish 4 not set!");
        ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
          Logger.error("Send log Error:" + JSON.stringify(errorData));
        });
      }
      const fightVideosRound1: IFightVideo[] = [];
      const fightVideosRound2: IFightVideo[] = [];
      const fightVideosRound3: IFightVideo[] = [];

      if (data.wgpRounds) {
        let lengthRound1 = 0;
        let lengthRound2 = 0;
        let lengthRound3 = 0;
        let filePathPre = "";

        if (settings.sdCardPath && settings.isTerminalVideoscreen) {
          filePathPre = "file:///" + settings.sdCardPath;
        }

        lengthRound1 = this.setFighterVideoData(data.wgpRounds, fightVideosRound1, 1);
        lengthRound2 = this.setFighterVideoData(data.wgpRounds, fightVideosRound2, 2);
        lengthRound3 = this.setFighterVideoData(data.wgpRounds, fightVideosRound3, 3);

        // TODO set Fight name
        this.fightVideos = {
          fightName: "t",
          round1: fightVideosRound1,
          round2: fightVideosRound2,
          round3: fightVideosRound3,
          round1Result: {
            name: data.wgpRounds.round1.filename,
            url: filePathPre + data.wgpRounds.round1.mp4,
            jpg: filePathPre + data.wgpRounds.round1.jpg,
            length: 6
          },
          round2Result: {
            name: data.wgpRounds.round2.filename,
            url: filePathPre + data.wgpRounds.round2.mp4,
            jpg: filePathPre + data.wgpRounds.round2.jpg,
            length: 6
          },
          round3Result: {
            name: data.wgpRounds.round3.filename,
            url: filePathPre + data.wgpRounds.round3.mp4,
            jpg: filePathPre + data.wgpRounds.round3.jpg,
            length: 6.49
          },
          finalResult: {
            name: "result_video",
            url: filePathPre + data.videoname.mp4,
            jpg: filePathPre + data.videoname.jpg,
            length: KickboxHelper.fightResultLength
          }
          //finalResult: {name: "result_video", url: data.videoname.mp4, jpg: data.videoname.jpg, length: 24.55 }
        };
      } else {
        Logger.error("Error Kickbox Result: Could not prepare video infos!");
        const logMessage = new SockServLogMessage(Errors.KICKBOX_DATA_ERROR.code, "Error Kickbox Result: Could not prepare video infos!");
        ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
          Logger.error("Send log Error:" + JSON.stringify(errorData));
        });
      }

      // const kickboxScreen = Logic.videoScreen as VideoScreenKickBox;
      // if (kickboxScreen !== undefined && this.fightVideos && this.fightResult){
      //   // for kickbox resolve the necessary fightvideo names with the help of hit the hit json file to their corresponding urls - additionaly parse the hits and set them up in the fightresult structure
      //   this.prepareKickboxVideoInfos(this.fightVideos, this.fightResult);
      // } else {
      //   Logger.error("Error Kickbox Result: Could not prepare video infos!");
      //   const logMessage = new SockServLogMessage(Errors.KICKBOX_DATA_ERROR.code, "Error Kickbox Result: Could not prepare video infos!");
      //   ServerSocketLogic.instance.sendLogRequest(logMessage).catch( (errorData) => {
      //     Logger.error("Send log Error:" + JSON.stringify(errorData));
      //   });
      // }
    }
  }

  private getRoundWinnerQuote(rundNumber: number, fighterIndex: number): number {
    switch (rundNumber) {
      case 1: {
        if (fighterIndex === 1) {
          return this.odds[2];
        } else if (fighterIndex === 2) {
          return this.odds[3];
        } else if (fighterIndex === 3) {
          return this.odds[4];
        }

        break;
      }
      case 2: {
        if (fighterIndex === 1) {
          return this.odds[5];
        } else if (fighterIndex === 2) {
          return this.odds[6];
        } else if (fighterIndex === 3) {
          return this.odds[7];
        }
        break;
      }
      case 3: {
        if (fighterIndex === 1) {
          return this.odds[8];
        } else if (fighterIndex === 2) {
          return this.odds[9];
        } else if (fighterIndex === 3) {
          return this.odds[10];
        }
        break;
      }
      default:
        break;
    }

    return 0;
  }

  private getRoundBetsResultsQuote(finish: IGameResult): number {
    if (finish["3"] && finish["4"]) {
      if (finish["2"].competitorIndex === 1 && finish["3"].competitorIndex === 1 && finish["4"]?.competitorIndex === 1) {
        return this.odds[11];
      } else if (finish["2"].competitorIndex === 1 && finish["3"].competitorIndex === 1 && finish["4"]?.competitorIndex === 2) {
        return this.odds[12];
      } else if (finish["2"].competitorIndex === 1 && finish["3"].competitorIndex === 1 && finish["4"]?.competitorIndex === 3) {
        return this.odds[13];
      } else if (finish["2"].competitorIndex === 1 && finish["3"].competitorIndex === 2 && finish["4"]?.competitorIndex === 1) {
        return this.odds[14];
      } else if (finish["2"].competitorIndex === 1 && finish["3"].competitorIndex === 2 && finish["4"]?.competitorIndex === 2) {
        return this.odds[15];
      } else if (finish["2"].competitorIndex === 1 && finish["3"].competitorIndex === 2 && finish["4"]?.competitorIndex === 3) {
        return this.odds[16];
      } else if (finish["2"].competitorIndex === 1 && finish["3"].competitorIndex === 3 && finish["4"]?.competitorIndex === 1) {
        return this.odds[17];
      } else if (finish["2"].competitorIndex === 1 && finish["3"].competitorIndex === 3 && finish["4"]?.competitorIndex === 2) {
        return this.odds[18];
      } else if (finish["2"].competitorIndex === 1 && finish["3"].competitorIndex === 3 && finish["4"]?.competitorIndex === 3) {
        return this.odds[19];
      } else if (finish["2"].competitorIndex === 2 && finish["3"].competitorIndex === 1 && finish["4"]?.competitorIndex === 1) {
        return this.odds[20];
      } else if (finish["2"].competitorIndex === 2 && finish["3"].competitorIndex === 1 && finish["4"]?.competitorIndex === 2) {
        return this.odds[21];
      } else if (finish["2"].competitorIndex === 2 && finish["3"].competitorIndex === 1 && finish["4"]?.competitorIndex === 3) {
        return this.odds[22];
      } else if (finish["2"].competitorIndex === 2 && finish["3"].competitorIndex === 2 && finish["4"]?.competitorIndex === 1) {
        return this.odds[23];
      } else if (finish["2"].competitorIndex === 2 && finish["3"].competitorIndex === 2 && finish["4"]?.competitorIndex === 2) {
        return this.odds[24];
      } else if (finish["2"].competitorIndex === 2 && finish["3"].competitorIndex === 2 && finish["4"]?.competitorIndex === 3) {
        return this.odds[25];
      } else if (finish["2"].competitorIndex === 2 && finish["3"].competitorIndex === 3 && finish["4"]?.competitorIndex === 1) {
        return this.odds[26];
      } else if (finish["2"].competitorIndex === 2 && finish["3"].competitorIndex === 3 && finish["4"]?.competitorIndex === 2) {
        return this.odds[27];
      } else if (finish["2"].competitorIndex === 2 && finish["3"].competitorIndex === 3 && finish["4"]?.competitorIndex === 3) {
        return this.odds[28];
      } else if (finish["2"].competitorIndex === 3 && finish["3"].competitorIndex === 1 && finish["4"]?.competitorIndex === 1) {
        return this.odds[29];
      } else if (finish["2"].competitorIndex === 3 && finish["3"].competitorIndex === 1 && finish["4"]?.competitorIndex === 2) {
        return this.odds[30];
      } else if (finish["2"].competitorIndex === 3 && finish["3"].competitorIndex === 1 && finish["4"]?.competitorIndex === 3) {
        return this.odds[31];
      } else if (finish["2"].competitorIndex === 3 && finish["3"].competitorIndex === 2 && finish["4"]?.competitorIndex === 1) {
        return this.odds[32];
      } else if (finish["2"].competitorIndex === 3 && finish["3"].competitorIndex === 2 && finish["4"]?.competitorIndex === 2) {
        return this.odds[33];
      } else if (finish["2"].competitorIndex === 3 && finish["3"].competitorIndex === 2 && finish["4"]?.competitorIndex === 3) {
        return this.odds[34];
      } else if (finish["2"].competitorIndex === 3 && finish["3"].competitorIndex === 3 && finish["4"]?.competitorIndex === 1) {
        return this.odds[35];
      } else if (finish["2"].competitorIndex === 3 && finish["3"].competitorIndex === 3 && finish["4"]?.competitorIndex === 2) {
        return this.odds[36];
      }
    } else {
      Logger.error("Error Kickbox get Result Quotes: No finish 3 or finish 4!");
      const logMessage = new SockServLogMessage(Errors.KICKBOX_DATA_ERROR.code, "Error Kickbox get Result Quotes: No finish 3 or finish 4!");
      ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
        Logger.error("Send log Error:" + JSON.stringify(errorData));
      });
    }

    return 0;
  }

  private getWinnerBetQuote(finish: IGameResult): number {
    if (finish["1"].competitorIndex === 1) {
      return this.odds[0];
    } else if (finish["1"].competitorIndex === 2) {
      return this.odds[1];
    }

    return 0;
  }

  private calculateRoundsHits(wgpRounds: IWgpRounds) {
    if (this.fightResult) {
      this.fightResult.hits = [];
      this.fightResult.hits[0] = [];
      this.fightResult.hits[1] = [];
      this.clipOffset = 0;

      this.blueFistNumber = 0;
      this.blueKickNumber = 0;
      this.redFistNumber = 0;
      this.redKickNumber = 0;

      this.calculateRoundsHitsClipRound(wgpRounds, 1, 1, this.fightResult.hits, this.clipOffset);
      this.calculateRoundsHitsClipRound(wgpRounds, 1, 2, this.fightResult.hits, this.clipOffset);
      this.calculateRoundsHitsClipRound(wgpRounds, 1, 3, this.fightResult.hits, this.clipOffset);
      this.calculateRoundsHitsClipRound(wgpRounds, 1, 4, this.fightResult.hits, this.clipOffset);

      this.blueFistNumber = 0;
      this.blueKickNumber = 0;
      this.redFistNumber = 0;
      this.redKickNumber = 0;
      this.clipOffset += KickboxHelper.fightRoundResultLength;

      this.calculateRoundsHitsClipRound(wgpRounds, 2, 1, this.fightResult.hits, this.clipOffset);
      this.calculateRoundsHitsClipRound(wgpRounds, 2, 2, this.fightResult.hits, this.clipOffset);
      this.calculateRoundsHitsClipRound(wgpRounds, 2, 3, this.fightResult.hits, this.clipOffset);
      this.calculateRoundsHitsClipRound(wgpRounds, 2, 4, this.fightResult.hits, this.clipOffset);

      this.blueFistNumber = 0;
      this.blueKickNumber = 0;
      this.redFistNumber = 0;
      this.redKickNumber = 0;
      this.clipOffset += KickboxHelper.fightRoundResultLength;

      this.calculateRoundsHitsClipRound(wgpRounds, 3, 1, this.fightResult.hits, this.clipOffset);
      this.calculateRoundsHitsClipRound(wgpRounds, 3, 2, this.fightResult.hits, this.clipOffset);
      this.calculateRoundsHitsClipRound(wgpRounds, 3, 3, this.fightResult.hits, this.clipOffset);
      this.calculateRoundsHitsClipRound(wgpRounds, 3, 4, this.fightResult.hits, this.clipOffset);

      Logger.debug("Calculated hits:");
      for (const curHit of this.fightResult.hits) {
        Logger.debug(JSON.stringify(curHit));
      }
    } else {
      Logger.error("Error Kickbox calculate Hits: No fighter Result!");
      const logMessage = new SockServLogMessage(Errors.KICKBOX_DATA_ERROR.code, "Error Kickbox calculate Hits: No fighter Result!");
      ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
        Logger.error("Send log Error:" + JSON.stringify(errorData));
      });
    }
  }

  private calculateRoundsHitsClipRound(wgpRounds: IWgpRounds, roundNumber: number, clibNumber: number, hits: IHit[][], clipOffset: number) {
    const clipField = ("clip" + clibNumber) as keyof typeof wgpRounds.round1;
    const roundField = ("round" + roundNumber) as keyof typeof wgpRounds;

    if (wgpRounds[roundField]) {
      if (wgpRounds[roundField][clipField]) {
        let blueFistIndex = 0;
        let blueKickIndex = 0;
        let redFistIndex = 0;
        let redKickIndex = 0;

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const blueFistTokensStr = wgpRounds[roundField][clipField].blueFistEvents.split(";");
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const blueKickTokensStr = wgpRounds[roundField][clipField].blueKickEvents.split(";");
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const redFistTokensStr = wgpRounds[roundField][clipField].redFistEvents.split(";");
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const redKickTokensStr = wgpRounds[roundField][clipField].redKickEvents.split(";");
        const blueFistTokens: number[] = [];
        const blueKickTokens: number[] = [];
        const redFistTokens: number[] = [];
        const redKickTokens: number[] = [];

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.clipOffset += wgpRounds[roundField][clipField].length;

        for (const curToken of blueFistTokensStr) {
          blueFistTokens.push(parseFloat(curToken));
        }
        for (const curToken of blueKickTokensStr) {
          blueKickTokens.push(parseFloat(curToken));
        }
        for (const curToken of redFistTokensStr) {
          redFistTokens.push(parseFloat(curToken));
        }
        for (const curToken of redKickTokensStr) {
          redKickTokens.push(parseFloat(curToken));
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (wgpRounds[roundField][clipField].blueFistEvents === "") {
          blueFistTokens[0] = ModelBox.DUMMY_LAST_FIST_KICK;
        } else {
          blueFistTokens.push(ModelBox.DUMMY_LAST_FIST_KICK);
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (wgpRounds[roundField][clipField].blueKickEvents === "") {
          blueKickTokens[0] = ModelBox.DUMMY_LAST_FIST_KICK;
        } else {
          blueKickTokens.push(ModelBox.DUMMY_LAST_FIST_KICK);
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (wgpRounds[roundField][clipField].redFistEvents === "") {
          redFistTokens[0] = ModelBox.DUMMY_LAST_FIST_KICK;
        } else {
          redFistTokens.push(ModelBox.DUMMY_LAST_FIST_KICK);
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (wgpRounds[roundField][clipField].redKickEvents === "") {
          redKickTokens[0] = ModelBox.DUMMY_LAST_FIST_KICK;
        } else {
          redKickTokens.push(ModelBox.DUMMY_LAST_FIST_KICK);
        }

        do {
          if (
            blueFistTokens[blueFistIndex] <= blueKickTokens[blueKickIndex] &&
            blueFistTokens[blueFistIndex] <= redFistTokens[redFistIndex] &&
            blueFistTokens[blueFistIndex] <= redKickTokens[redKickIndex]
          ) {
            if (blueFistTokens[blueFistIndex] !== ModelBox.DUMMY_LAST_FIST_KICK) {
              this.blueFistNumber++;
              hits[0].push({
                round: roundNumber,
                timestamp: blueFistTokens[blueFistIndex] + clipOffset,
                fist: this.blueFistNumber,
                kick: this.blueKickNumber
              });

              if (blueFistIndex < blueFistTokens.length - 1) {
                blueFistIndex++;
              }
            }
          }

          if (
            blueKickTokens[blueKickIndex] <= blueFistTokens[blueFistIndex] &&
            blueKickTokens[blueKickIndex] <= redFistTokens[redFistIndex] &&
            blueKickTokens[blueKickIndex] <= redKickTokens[redKickIndex]
          ) {
            if (blueKickTokens[blueKickIndex] !== ModelBox.DUMMY_LAST_FIST_KICK) {
              this.blueKickNumber++;
              hits[0].push({
                round: roundNumber,
                timestamp: blueKickTokens[blueKickIndex] + clipOffset,
                fist: this.blueFistNumber,
                kick: this.blueKickNumber
              });

              if (blueKickIndex < blueKickTokens.length - 1) {
                blueKickIndex++;
              }
            }
          }

          if (
            redFistTokens[redFistIndex] <= blueFistTokens[blueFistIndex] &&
            redFistTokens[redFistIndex] <= blueKickTokens[blueKickIndex] &&
            redFistTokens[redFistIndex] <= redKickTokens[redKickIndex]
          ) {
            if (redFistTokens[redFistIndex] !== ModelBox.DUMMY_LAST_FIST_KICK) {
              this.redFistNumber++;
              hits[1].push({
                round: roundNumber,
                timestamp: redFistTokens[redFistIndex] + clipOffset,
                fist: this.redFistNumber,
                kick: this.redKickNumber
              });

              if (redFistIndex < redFistTokens.length - 1) {
                redFistIndex++;
              }
            }
          }

          if (
            redKickTokens[redKickIndex] <= blueFistTokens[blueFistIndex] &&
            redKickTokens[redKickIndex] <= blueKickTokens[blueKickIndex] &&
            redKickTokens[redKickIndex] <= redFistTokens[redFistIndex]
          ) {
            if (redKickTokens[redKickIndex] !== ModelBox.DUMMY_LAST_FIST_KICK) {
              this.redKickNumber++;
              hits[1].push({
                round: roundNumber,
                timestamp: redKickTokens[redKickIndex] + clipOffset,
                fist: this.redFistNumber,
                kick: this.redKickNumber
              });

              if (redKickIndex < redKickTokens.length - 1) {
                redKickIndex++;
              }
            }
          }
        } while (blueFistIndex < blueFistTokens.length - 1 || blueKickIndex < blueKickTokens.length - 1 || redFistIndex < redFistTokens.length - 1 || redKickIndex < redKickTokens.length - 1);
      }
    } else {
      Logger.error("Error Kickbox calculate Hits: No Round, number:" + roundNumber);
      const logMessage = new SockServLogMessage(Errors.KICKBOX_DATA_ERROR.code, "Error Kickbox calculate Hits: No Round, number:" + roundNumber);
      ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
        Logger.error("Send log Error:" + JSON.stringify(errorData));
      });
    }
  }

  public setFighterVideoData(wgpRounds: IWgpRounds, fightVideosRound1: IFightVideo[], round: number): number {
    let lenght = 0;
    let filePathPre = "";

    if (settings.sdCardPath && settings.isTerminalVideoscreen) {
      filePathPre = "file:///" + settings.sdCardPath;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (wgpRounds["round" + round].clip1) {
      fightVideosRound1.push({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        name: wgpRounds["round" + round].clip1.filename,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        url: filePathPre + wgpRounds["round" + round].clip1.mp4,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        jpg: filePathPre + wgpRounds["round" + round].clip1.jpg,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        length: wgpRounds["round" + round].clip1.length
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      lenght += wgpRounds["round" + round].clip1.length;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (wgpRounds["round" + round].clip2) {
      fightVideosRound1.push({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        name: wgpRounds["round" + round].clip2.filename,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        url: filePathPre + wgpRounds["round" + round].clip2.mp4,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        jpg: filePathPre + wgpRounds["round" + round].clip2.jpg,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        length: wgpRounds["round" + round].clip2.length
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      lenght += wgpRounds["round" + round].clip2.length;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (wgpRounds["round" + round].clip3) {
      fightVideosRound1.push({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        name: wgpRounds["round" + round].clip3.filename,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        url: filePathPre + wgpRounds["round" + round].clip3.mp4,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        jpg: filePathPre + wgpRounds["round" + round].clip3.jpg,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        length: wgpRounds["round" + round].clip3.length
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      lenght += wgpRounds["round" + round].clip3.length;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (wgpRounds["round" + round].clip4) {
      fightVideosRound1.push({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        name: wgpRounds["round" + round].clip4.filename,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        url: filePathPre + wgpRounds["round" + round].clip4.mp4,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        jpg: filePathPre + wgpRounds["round" + round].clip4.jpg,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        length: wgpRounds["round" + round].clip4.length
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      lenght += wgpRounds["round" + round].clip4.length;
    }

    return lenght;
  }

  public getIntroKickBoxUrls(wgpInfo?: IWgpInfo): IVideoUrls {
    if (wgpInfo) {
      let videoData = {
        video: wgpInfo.mp4,
        image: wgpInfo.jpg,
        sound: wgpInfo.mp3
      };
      // TODO TEST
      // videoData = { video: "/.local/wgp/WGP19FG_Fight1_Intro_without_transition.mp4", image: "/.local/wgp/WGP19FG_Fight1_Intro_without_transition.jpg", sound: "/.local/wgp/intro.mp3" };

      if (settings.sdCardPath && settings.isTerminalVideoscreen) {
        videoData = {
          video: "file:///" + settings.sdCardPath + wgpInfo.mp4,
          image: "file:///" + settings.sdCardPath + wgpInfo.jpg,
          sound: "file:///" + settings.sdCardPath + wgpInfo.mp3
        };
      }

      Logger.debug("Intro Video Data:" + JSON.stringify(videoData));
      return (Logic.implementation as LogicImplementation).fixVideoUrlsPath(videoData);
    } else {
      return { video: "", image: "" };
    }
  }

  // get hit_json from server, get the corresponding fight segments and setup the video urls
  // get the hit timings from the hit_json file and set them to the fightInfo hits
  public prepareKickboxVideoInfos(fightVideos: IFightVideos, fightInfo: IFightInfo) {
    const jsonVideoInfoUrl = ""; //this.getBaseUrl("box") + "/Hit_json.json";
    const xhr = new XMLHttpRequest();
    xhr.open("GET", jsonVideoInfoUrl, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send();
    // TODO: error handling
    fightInfo.hits = [];
    fightInfo.hits.push([]);
    fightInfo.hits.push([]);

    const jsonVideoInfo = JSON.parse(xhr.response);
    let timeOffsetInSeconds = 0;
    this.prepareKickboxRoundInfo(jsonVideoInfo, fightInfo, fightVideos.fightName, fightVideos.round1, 1, timeOffsetInSeconds);
    timeOffsetInSeconds += KickboxHelper.fightRoundLength + KickboxHelper.fightRoundResultLength;
    this.prepareKickboxRoundInfo(jsonVideoInfo, fightInfo, fightVideos.fightName, fightVideos.round2, 2, timeOffsetInSeconds);
    timeOffsetInSeconds += KickboxHelper.fightRoundLength + KickboxHelper.fightRoundResultLength;
    this.prepareKickboxRoundInfo(jsonVideoInfo, fightInfo, fightVideos.fightName, fightVideos.round3, 3, timeOffsetInSeconds);

    for (let i = 0; i < 2; i++) {
      let fists = 0;
      let kicks = 0;
      for (const hit of fightInfo.hits[i]) {
        fists = hit.fist + fists;
        kicks = hit.kick + kicks;
        hit.fist = fists;
        hit.kick = kicks;
      }
    }
  }

  private prepareKickboxRoundInfo(jsonVideoInfo: any, fightInfo: IFightInfo, fightName: string, round: IFightVideo[], roundNumber: number, timeOffsetInSeconds: number) {
    round.forEach((element) => {
      const fight1Info = jsonVideoInfo[fightName];
      const jsonInfo = fight1Info.filter((jsonElement: any) => jsonElement.name === element.name)[0];
      element.url = ""; //this.getBaseUrl("box") + element.name + ".mp4";
      if (jsonInfo === undefined) {
        console.warn("not found: " + element.name);
      }
      element.length = Number.parseInt(jsonInfo.length, 10);

      // fill in the hits - these are directly dependent on the fight videos
      const blueHits = [...this.parseHits(jsonInfo.fist_blue, "fist", roundNumber, timeOffsetInSeconds), ...this.parseHits(jsonInfo.kick_blue, "kick", roundNumber, timeOffsetInSeconds)].sort(
        (a, b) => (a.timestamp > b.timestamp ? 1 : -1)
      );
      const redHits = [...this.parseHits(jsonInfo.fist_red, "fist", roundNumber, timeOffsetInSeconds), ...this.parseHits(jsonInfo.kick_red, "kick", roundNumber, timeOffsetInSeconds)].sort((a, b) =>
        a.timestamp > b.timestamp ? 1 : -1
      );

      // count up the hits to get absolute numbers
      fightInfo.hits[0].push(...blueHits);
      fightInfo.hits[1].push(...redHits);

      timeOffsetInSeconds += element.length;
    });
  }

  public getRaceVideoInfos(): VideoUrlInfo[] {
    if (this.fightVideos) {
      const raceVideos = [
        ...this.fightVideos.round1,
        this.fightVideos.round1Result,
        ...this.fightVideos.round2,
        this.fightVideos.round2Result,
        ...this.fightVideos.round3,
        this.fightVideos.round3Result,
        this.fightVideos.finalResult
      ];
      return raceVideos;
    } else {
      Logger.error("No fighter videos at Kickbox Race infos!!");
      const logMessage = new SockServLogMessage(Errors.KICKBOX_DATA_ERROR.code, "No fighter videos at Kickbox Race infos!!");
      ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
        Logger.error("Send log Error:" + JSON.stringify(errorData));
      });
      return [{ url: "R0001", length: Logic.getRaceLength() }];
    }
  }

  public getRaceVideos(): string[] {
    if (this.fightVideos) {
      const raceVideos = [
        ...this.fightVideos.round1.map((x) => x.url),
        this.fightVideos.round1Result.url,
        ...this.fightVideos.round2.map((x) => x.url),
        this.fightVideos.round2Result.url,
        ...this.fightVideos.round3.map((x) => x.url),
        this.fightVideos.round3Result.url,
        this.fightVideos.finalResult.url
      ];
      return raceVideos;
    } else {
      Logger.error("No fighter videos at Kickbox!!");
      return [];
    }
  }

  private parseHits(hitArray: any, type: "fist" | "kick", roundNumber: number, timeOffsetInSeconds: number): IHit[] {
    if (hitArray === undefined) return [];
    const result: IHit[] = hitArray.map((x: any) => {
      const timeSplit = x.time.replace("<", "").split(":");
      const time = Number.parseInt(timeSplit[0], 10) + timeOffsetInSeconds + Number.parseInt(timeSplit[1], 10) / 1000.0;
      return {
        round: roundNumber,
        fist: type === "fist" ? 1 : 0,
        kick: type === "kick" ? 1 : 0,
        timestamp: time
      };
    });
    return result;
  }
}

export class ModelDog63 extends ModelBase {
  public oddsGridFirstTwoInOrder?: boolean;
  public dog63History?: IDog63RoundHistory[];
  public dog63Suprimi?: IDog63Suprimi;
  public dog63Quotes?: IDog63Quotes;
  public dog63rd?: IDog633rd;
  public dog63QuotesSide?: IDog63SuprimiEntry[][];

  constructor(gameType: GameType) {
    super(gameType);
  }

  public convertFromServerOdds() {
    this.odds = this.serverOdds;
    Logger.info("Odds Set           :" + this.odds);
  }

  public setServerData(data: IGameRoundData) {
    const gameId = parseInt(data.id.replace(data.idSchedule, ""), 10);

    let bonusValue: number | undefined;
    let oldBonusValue: number | undefined;

    if (Logic.implementation.hasJackpotBounus()) {
      if (data.jackpotInfo !== null) {
        bonusValue = data.jackpotInfo.bonusValue;
        oldBonusValue = data.jackpotInfo.oldBonusValue;
        this.jackpotHistory = this.getHistoryDataFromResult(data.jackpotInfo.bonusHistory);
      } else {
        Logger.error("Bonus Flag set but no bonus values given!!");
        this.jackpotHistory = undefined;
      }
    } else {
      this.jackpotHistory = undefined;
    }

    this.roundInfo = {
      fullGameId: data.id,
      gameId,
      jackpotValue: bonusValue,
      oldJackpotValue: oldBonusValue,
      videoStartDt: data.videoStartDt,
      videoEndDt: data.videoEndDt,
      videoStartUnix: Util.getSecondsSinceFromUTCDate(Util.getDatFromStandardString(data.videoStartDt)),
      videoEndUnix: Util.getSecondsSinceFromUTCDate(Util.getDatFromStandardString(data.videoEndDt)),
      sendPlan: data.idSchedule,
      raceStart: Util.formatDateFromUtcStandardDateString(data.videoStartDt, Languages.instance.getText("dateTimeFormat")),
      raceNumber: gameId.toString().padStart(4, "0"),
      it_code_schedule: data.it_code_schedule,
      it_code_event: data.it_code_event,
      roundInterval: data.roundInterval
    };

    this.drivers = [];
    let combCount = 0;

    switch (this.gameType) {
      case "dog63":
        for (const item of driversDog6) {
          this.drivers.push(Object.assign({}, item));
          combCount++;
          if (combCount >= GamesModel.RASTER_SIZE) {
            break;
          }
        }
        break;

      default:
        Logger.error("Illegal Dog game Type:" + this.gameType);
    }

    let drivIndex: number = 0;
    const weightSign = Languages.instance.getText("weightSign");

    for (const prop in data.competitors) {
      if (data.competitors.hasOwnProperty(prop)) {
        const curCompet: ICompetitorDataDog = data.competitors[prop];
        const curDriver = this.drivers[drivIndex];
        curDriver.firstName = curCompet.name.toUpperCase();
        curDriver.lastName = "";

        const driverInfos = [];

        if (weightSign === "lb") {
          // Logger.debug("Weight in KG:" + curCompet.weight);
          curCompet.weight = curCompet.weight * 2.20462;
          // Logger.debug("Weight in LB:" + curCompet.weight);
        }

        driverInfos.push({
          key: Languages.instance.getText("theLastTwHead"),
          value: ""
        });
        driverInfos.push({
          key: Languages.instance.getText("wins"),
          value: curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1.toString() : ""
        });
        driverInfos.push({
          key: Languages.instance.getText("secondPlaces"),
          value: curCompet.nbr2 !== undefined && curCompet.nbr2 !== null ? curCompet.nbr2.toString() : ""
        });
        driverInfos.push({
          key: Languages.instance.getText("thirdPlace"),
          value: curCompet.nbr3 !== undefined && curCompet.nbr3 !== null ? curCompet.nbr3.toString() : ""
        });

        curDriver.driverInfos = driverInfos;

        if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) > 0) {
          let text = Languages.instance.getText("txtDogWin");

          if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) % 10 === 1) {
            //for 1, 11, 21, ....
            text = Languages.instance.getText("txtDogWin1");
          } else if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) % 10 === 0) {
            //for 10,20,30 ...
            text = Languages.instance.getText("txtDogWin10");
          }

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            // number of race text is for 10,20,30 ...
            Logger.warn("Text is for 10th races");
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName.toUpperCase() + " " + curDriver.lastName.toUpperCase())
            .replace("__RACES__", curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "")
            .replace("__WON__", curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1.toString() : "");
        } else if (curCompet.nbr2 !== undefined && curCompet.nbr2 !== null ? curCompet.nbr2 : 0 > 0) {
          let text = Languages.instance.getText("txtDogInf10"); //for 10,20,30 ...

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            text = Languages.instance.getText("txtDogInf"); //for 2-9, 12-19 ...
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName.toUpperCase() + " " + curDriver.lastName.toUpperCase())
            .replace(
              "__RACES__",
              curCompet.nbr2 !== undefined && curCompet.nbr2 !== null
                ? curCompet.nbr2.toString()
                : "" + "/" + (curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "")
            );
        } else {
          let text = Languages.instance.getText("txtDogNon10"); //for 10,20,30 ...

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            text = Languages.instance.getText("txtDogNon"); //for 2-9, 12-19 ...
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName.toUpperCase() + " " + curDriver.lastName.toUpperCase())
            .replace("__RACES__", curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "");
        }

        drivIndex++;
      }
    }

    // for ( let i = 0 ; i < this.drivers.length ; i++) {
    //   this.drivers[i].lastName = data.competitors[i + 1];
    // }

    this.serverOdds = data.odds;
    this.track = trackDog;

    let info = trackDog.facts.find((i) => i.key === Languages.instance.getText("avgTime") + ":");
    if (info) {
      if (this.gameType === "dog6") {
        info.value = Util.formatValue(avgDog6Time, 2, LanguagesBase.commaSymbol);
      } else if (this.gameType === "dog8") {
        info.value = Util.formatValue(avgDog8Time, 2, LanguagesBase.commaSymbol);
      }
    }

    // TODO TEST
    // data.courseConditions = "slow";
    // data.	weather =  "bad";
    // data.	temperature =  12;
    // data.	humidity =  65;
    // data.	wind =  "5 SW";

    info = this.track.facts.find((i) => i.key === Languages.instance.getText("courseCond") + ":");
    if (info) {
      if (data.courseConditions) {
        info.value = Languages.instance.getText(data.courseConditions);
      }
    }

    let weatherTxt = "FINE";

    if (data.weather) {
      weatherTxt = Languages.instance.getText(data.weather);
    }

    this.track.lapMapFacts = [
      Languages.instance.getText("weather") + ": <b>" + weatherTxt + "</b>",
      Languages.instance.getText("tempShort") + ": <b>" + data.temperature + "°C</b>",
      Languages.instance.getText("humidity") + ": <b>" + data.humidity + "%</b>",
      Languages.instance.getText("wind") + ": <b>" + data.wind + "</b>"
    ];

    let lastRounds1: number[] = [];
    let lastRounds2: number[] = [];
    let lastRounds3: number[] = [];
    let lastRounds4: number[] = [];
    let lastRounds5: number[] = [];
    let lastRounds6: number[] = [];

    // TODO TEST
    // lastRounds1 = [3, 2, 5, 2, 4];
    // lastRounds2 = [3, 2, 5, 2, 4];
    // lastRounds3 = [3, 2, 5, 2, 4];
    // lastRounds4 = [3, 2, 5, 2, 4];
    // lastRounds5 = [3, 2, 5, 2, 4];
    // lastRounds6 = [3, 2, 5, 2, 4];

    if (data.competitors[1].last5) {
      lastRounds1 = data.competitors[1].last5.split("|");
    }
    if (data.competitors[2].last5) {
      lastRounds2 = data.competitors[2].last5.split("|");
    }
    if (data.competitors[3].last5) {
      lastRounds3 = data.competitors[3].last5.split("|");
    }
    if (data.competitors[4].last5) {
      lastRounds4 = data.competitors[4].last5.split("|");
    }
    if (data.competitors[5].last5) {
      lastRounds5 = data.competitors[5].last5.split("|");
    }
    if (data.competitors[6].last5) {
      lastRounds6 = data.competitors[6].last5.split("|");
    }

    this.dog63Quotes = {
      entries: [
        {
          driverIndex: 0,
          quotes: [
            { quote: this.serverOdds[0], betCodeId: 1 },
            { quote: this.serverOdds[241], betCodeId: 13 },
            { quote: this.serverOdds[247], betCodeId: 14 },
            { quote: this.serverOdds[36], betCodeId: 3 },
            { quote: this.serverOdds[42], betCodeId: 4 }
          ],
          peso: Logic.implementation.formatNumber(data.competitors[1].weight, 1) + weightSign,
          ultime5: lastRounds1,
          val: data.competitors[1].trend !== undefined && data.competitors[1].trend !== null ? data.competitors[1].trend : "3"
        },
        {
          driverIndex: 1,
          quotes: [
            { quote: this.serverOdds[1], betCodeId: 1 },
            { quote: this.serverOdds[242], betCodeId: 13 },
            { quote: this.serverOdds[248], betCodeId: 14 },
            { quote: this.serverOdds[37], betCodeId: 3 },
            { quote: this.serverOdds[43], betCodeId: 4 }
          ],
          peso: Logic.implementation.formatNumber(data.competitors[2].weight, 1) + weightSign,
          ultime5: lastRounds2,
          val: data.competitors[2].trend !== undefined && data.competitors[2].trend !== null ? data.competitors[2].trend : "3"
        },
        {
          driverIndex: 2,
          quotes: [
            { quote: this.serverOdds[2], betCodeId: 1 },
            { quote: this.serverOdds[243], betCodeId: 13 },
            { quote: this.serverOdds[249], betCodeId: 14 },
            { quote: this.serverOdds[38], betCodeId: 3 },
            { quote: this.serverOdds[44], betCodeId: 4 }
          ],
          peso: Logic.implementation.formatNumber(data.competitors[3].weight, 1) + weightSign,
          ultime5: lastRounds3,
          val: data.competitors[3].trend !== undefined && data.competitors[3].trend !== null ? data.competitors[3].trend : "3"
        },
        {
          driverIndex: 3,
          quotes: [
            { quote: this.serverOdds[3], betCodeId: 1 },
            { quote: this.serverOdds[244], betCodeId: 13 },
            { quote: this.serverOdds[250], betCodeId: 14 },
            { quote: this.serverOdds[39], betCodeId: 3 },
            { quote: this.serverOdds[45], betCodeId: 4 }
          ],
          peso: Logic.implementation.formatNumber(data.competitors[4].weight, 1) + weightSign,
          ultime5: lastRounds4,
          val: data.competitors[4].trend !== undefined && data.competitors[4].trend !== null ? data.competitors[4].trend : "3"
        },
        {
          driverIndex: 4,
          quotes: [
            { quote: this.serverOdds[4], betCodeId: 1 },
            { quote: this.serverOdds[245], betCodeId: 13 },
            { quote: this.serverOdds[251], betCodeId: 14 },
            { quote: this.serverOdds[40], betCodeId: 3 },
            { quote: this.serverOdds[46], betCodeId: 4 }
          ],
          peso: Logic.implementation.formatNumber(data.competitors[5].weight, 1) + weightSign,
          ultime5: lastRounds5,
          val: data.competitors[5].trend !== undefined && data.competitors[5].trend !== null ? data.competitors[5].trend : "3"
        },
        {
          driverIndex: 5,
          quotes: [
            { quote: this.serverOdds[5], betCodeId: 1 },
            { quote: this.serverOdds[246], betCodeId: 13 },
            { quote: this.serverOdds[252], betCodeId: 14 },
            { quote: this.serverOdds[41], betCodeId: 3 },
            { quote: this.serverOdds[47], betCodeId: 4 }
          ],
          peso: Logic.implementation.formatNumber(data.competitors[6].weight, 1) + weightSign,
          ultime5: lastRounds6,
          val: data.competitors[6].trend !== undefined && data.competitors[6].trend !== null ? data.competitors[6].trend : "3"
        }
      ],
      middleEntries: [
        [
          { quote: this.serverOdds[232], betCodeId: 12 },
          { quote: this.serverOdds[233], betCodeId: 12 },
          { quote: this.serverOdds[234], betCodeId: 12 },
          { quote: this.serverOdds[235], betCodeId: 12 },
          { quote: this.serverOdds[236], betCodeId: 12 },
          { quote: this.serverOdds[237], betCodeId: 12 },
          { quote: this.serverOdds[238], betCodeId: 12 },
          { quote: this.serverOdds[239], betCodeId: 12 },
          { quote: this.serverOdds[240], betCodeId: 12 }
        ],
        [
          { quote: this.serverOdds[222], betCodeId: 11 },
          { quote: this.serverOdds[223], betCodeId: 11 },
          { quote: this.serverOdds[224], betCodeId: 11 },
          { quote: this.serverOdds[225], betCodeId: 11 },
          { quote: this.serverOdds[226], betCodeId: 11 },
          { quote: this.serverOdds[227], betCodeId: 11 },
          { quote: this.serverOdds[228], betCodeId: 11 },
          { quote: this.serverOdds[229], betCodeId: 11 },
          { quote: this.serverOdds[230], betCodeId: 11 },
          { quote: this.serverOdds[231], betCodeId: 11 }
        ]
      ],
      bottomEntries: [
        { places: [1, 3, 5], quote: this.serverOdds[205], betCodeId: 9 },
        { places: [2, 4, 6], quote: this.serverOdds[206], betCodeId: 9 },
        { places: [1, 2, 3], quote: this.serverOdds[203], betCodeId: 8 },
        { places: [4, 5, 6], quote: this.serverOdds[204], betCodeId: 8 }
      ]
    };

    this.dog63Suprimi = {
      block1: [
        [
          { drivers: [0, 1], quote: this.serverOdds[207], betCodeId: 10 },
          { drivers: [1, 2], quote: this.serverOdds[212], betCodeId: 10 },
          { drivers: [2, 4], quote: this.serverOdds[217], betCodeId: 10 }
        ],
        [
          { drivers: [0, 2], quote: this.serverOdds[208], betCodeId: 10 },
          { drivers: [1, 3], quote: this.serverOdds[213], betCodeId: 10 },
          { drivers: [2, 5], quote: this.serverOdds[218], betCodeId: 10 }
        ],
        [
          { drivers: [0, 3], quote: this.serverOdds[209], betCodeId: 10 },
          { drivers: [1, 4], quote: this.serverOdds[214], betCodeId: 10 },
          { drivers: [3, 4], quote: this.serverOdds[219], betCodeId: 10 }
        ],
        [
          { drivers: [0, 4], quote: this.serverOdds[210], betCodeId: 10 },
          { drivers: [1, 5], quote: this.serverOdds[215], betCodeId: 10 },
          { drivers: [3, 5], quote: this.serverOdds[220], betCodeId: 10 }
        ],
        [
          { drivers: [0, 5], quote: this.serverOdds[211], betCodeId: 10 },
          { drivers: [2, 3], quote: this.serverOdds[216], betCodeId: 10 },
          { drivers: [4, 5], quote: this.serverOdds[221], betCodeId: 10 }
        ]
      ],
      block2: [
        [
          { drivers: [0, 1], quote: this.serverOdds[48], betCodeId: 5 },
          { drivers: [1, 2], quote: this.serverOdds[53], betCodeId: 5 },
          { drivers: [2, 4], quote: this.serverOdds[58], betCodeId: 5 }
        ],
        [
          { drivers: [0, 2], quote: this.serverOdds[49], betCodeId: 5 },
          { drivers: [1, 3], quote: this.serverOdds[54], betCodeId: 5 },
          { drivers: [2, 5], quote: this.serverOdds[59], betCodeId: 5 }
        ],
        [
          { drivers: [0, 3], quote: this.serverOdds[50], betCodeId: 5 },
          { drivers: [1, 4], quote: this.serverOdds[55], betCodeId: 5 },
          { drivers: [3, 4], quote: this.serverOdds[60], betCodeId: 5 }
        ],
        [
          { drivers: [0, 4], quote: this.serverOdds[51], betCodeId: 5 },
          { drivers: [1, 5], quote: this.serverOdds[56], betCodeId: 5 },
          { drivers: [3, 5], quote: this.serverOdds[61], betCodeId: 5 }
        ],
        [
          { drivers: [0, 5], quote: this.serverOdds[52], betCodeId: 5 },
          { drivers: [2, 3], quote: this.serverOdds[57], betCodeId: 5 },
          { drivers: [4, 5], quote: this.serverOdds[62], betCodeId: 5 }
        ]
      ],
      block3: [
        [
          { drivers: [0, 1, 2], quote: this.serverOdds[183], betCodeId: 7 },
          { drivers: [0, 2, 4], quote: this.serverOdds[188], betCodeId: 7 },
          { drivers: [1, 2, 3], quote: this.serverOdds[193], betCodeId: 7 },
          { drivers: [1, 4, 5], quote: this.serverOdds[198], betCodeId: 7 }
        ],
        [
          { drivers: [0, 1, 3], quote: this.serverOdds[184], betCodeId: 7 },
          { drivers: [0, 2, 5], quote: this.serverOdds[189], betCodeId: 7 },
          { drivers: [1, 2, 4], quote: this.serverOdds[194], betCodeId: 7 },
          { drivers: [2, 3, 4], quote: this.serverOdds[199], betCodeId: 7 }
        ],
        [
          { drivers: [0, 1, 4], quote: this.serverOdds[185], betCodeId: 7 },
          { drivers: [0, 3, 4], quote: this.serverOdds[190], betCodeId: 7 },
          { drivers: [1, 2, 5], quote: this.serverOdds[195], betCodeId: 7 },
          { drivers: [2, 3, 5], quote: this.serverOdds[200], betCodeId: 7 }
        ],
        [
          { drivers: [0, 1, 5], quote: this.serverOdds[186], betCodeId: 7 },
          { drivers: [0, 3, 5], quote: this.serverOdds[191], betCodeId: 7 },
          { drivers: [1, 3, 4], quote: this.serverOdds[196], betCodeId: 7 },
          { drivers: [2, 4, 5], quote: this.serverOdds[201], betCodeId: 7 }
        ],
        [
          { drivers: [0, 2, 3], quote: this.serverOdds[187], betCodeId: 7 },
          { drivers: [0, 4, 5], quote: this.serverOdds[192], betCodeId: 7 },
          { drivers: [1, 3, 5], quote: this.serverOdds[197], betCodeId: 7 },
          { drivers: [3, 4, 5], quote: this.serverOdds[202], betCodeId: 7 }
        ]
      ]
    };

    const trioInOrder: ITwelfLowestHeighestData[] = [];
    let twelfLowestTrioInOrder: ITwelfLowestHeighestData[] = [];
    let twelfHeighestTrioInOrder: ITwelfLowestHeighestData[] = [];

    let counter = 0;
    let first = 0;
    let second = 1;
    let third = 2;
    for (let i = 63; i <= 182; i++) {
      const dataEntry: ITwelfLowestHeighestData = {
        first,
        second,
        third,
        odd: this.serverOdds[i]
      };
      trioInOrder.push(dataEntry);

      // Logger.debug("TRIO IN ORDER LIST added: first:" + (dataEntry.first + 1) + " second:" + (dataEntry.second + 1) + " third:" + (dataEntry.third + 1) + " oddID:" + i + " odd:" + dataEntry.odd);

      counter++;
      if (counter % 20 === 0) {
        first++;
        third = 0;
      }
      if (counter % 4 === 0) {
        second++;
        if (second >= 6) {
          second = 0;
        }
        if (first === second) {
          second++;
        }
      }
      third++;
      if (third >= 6) {
        third = 0;
      }
      let saveCount = 0; // to prevent endless count
      while ((first === third || second === third) && saveCount < 10000) {
        third++;
        if (third >= 6) {
          third = 0;
        }
        saveCount++;
      }
    }

    const copy = trioInOrder.slice();
    copy.sort((a, b) => a.odd - b.odd);
    twelfLowestTrioInOrder = copy.splice(0, 12);

    const copyHeighest = trioInOrder.slice();
    copyHeighest.sort((a, b) => b.odd - a.odd);
    twelfHeighestTrioInOrder = copyHeighest.splice(0, 12);

    this.dog63QuotesSide = [
      [
        { drivers: [twelfLowestTrioInOrder[0].first, twelfLowestTrioInOrder[0].second, twelfLowestTrioInOrder[0].third], quote: twelfLowestTrioInOrder[0].odd, betCodeId: 6 },
        { drivers: [twelfLowestTrioInOrder[6].first, twelfLowestTrioInOrder[6].second, twelfLowestTrioInOrder[6].third], quote: twelfLowestTrioInOrder[6].odd, betCodeId: 6 },
        {
          drivers: [twelfHeighestTrioInOrder[0].first, twelfHeighestTrioInOrder[0].second, twelfHeighestTrioInOrder[0].third],
          quote: twelfHeighestTrioInOrder[0].odd,
          betCodeId: 6
        },
        {
          drivers: [twelfHeighestTrioInOrder[6].first, twelfHeighestTrioInOrder[6].second, twelfHeighestTrioInOrder[6].third],
          quote: twelfHeighestTrioInOrder[6].odd,
          betCodeId: 6
        }
      ],
      [
        { drivers: [twelfLowestTrioInOrder[1].first, twelfLowestTrioInOrder[1].second, twelfLowestTrioInOrder[1].third], quote: twelfLowestTrioInOrder[1].odd, betCodeId: 6 },
        { drivers: [twelfLowestTrioInOrder[7].first, twelfLowestTrioInOrder[7].second, twelfLowestTrioInOrder[7].third], quote: twelfLowestTrioInOrder[7].odd, betCodeId: 6 },
        {
          drivers: [twelfHeighestTrioInOrder[1].first, twelfHeighestTrioInOrder[1].second, twelfHeighestTrioInOrder[1].third],
          quote: twelfHeighestTrioInOrder[1].odd,
          betCodeId: 6
        },
        {
          drivers: [twelfHeighestTrioInOrder[7].first, twelfHeighestTrioInOrder[7].second, twelfHeighestTrioInOrder[7].third],
          quote: twelfHeighestTrioInOrder[7].odd,
          betCodeId: 6
        }
      ],
      [
        { drivers: [twelfLowestTrioInOrder[2].first, twelfLowestTrioInOrder[2].second, twelfLowestTrioInOrder[2].third], quote: twelfLowestTrioInOrder[2].odd, betCodeId: 6 },
        { drivers: [twelfLowestTrioInOrder[8].first, twelfLowestTrioInOrder[8].second, twelfLowestTrioInOrder[8].third], quote: twelfLowestTrioInOrder[8].odd, betCodeId: 6 },
        {
          drivers: [twelfHeighestTrioInOrder[2].first, twelfHeighestTrioInOrder[2].second, twelfHeighestTrioInOrder[2].third],
          quote: twelfHeighestTrioInOrder[2].odd,
          betCodeId: 6
        },
        {
          drivers: [twelfHeighestTrioInOrder[8].first, twelfHeighestTrioInOrder[8].second, twelfHeighestTrioInOrder[8].third],
          quote: twelfHeighestTrioInOrder[8].odd,
          betCodeId: 6
        }
      ],
      [
        { drivers: [twelfLowestTrioInOrder[3].first, twelfLowestTrioInOrder[3].second, twelfLowestTrioInOrder[3].third], quote: twelfLowestTrioInOrder[3].odd, betCodeId: 6 },
        { drivers: [twelfLowestTrioInOrder[9].first, twelfLowestTrioInOrder[9].second, twelfLowestTrioInOrder[9].third], quote: twelfLowestTrioInOrder[9].odd, betCodeId: 6 },
        {
          drivers: [twelfHeighestTrioInOrder[3].first, twelfHeighestTrioInOrder[3].second, twelfHeighestTrioInOrder[3].third],
          quote: twelfHeighestTrioInOrder[3].odd,
          betCodeId: 6
        },
        {
          drivers: [twelfHeighestTrioInOrder[9].first, twelfHeighestTrioInOrder[9].second, twelfHeighestTrioInOrder[9].third],
          quote: twelfHeighestTrioInOrder[9].odd,
          betCodeId: 6
        }
      ],
      [
        { drivers: [twelfLowestTrioInOrder[4].first, twelfLowestTrioInOrder[4].second, twelfLowestTrioInOrder[4].third], quote: twelfLowestTrioInOrder[4].odd, betCodeId: 6 },
        { drivers: [twelfLowestTrioInOrder[10].first, twelfLowestTrioInOrder[10].second, twelfLowestTrioInOrder[10].third], quote: twelfLowestTrioInOrder[10].odd, betCodeId: 6 },
        {
          drivers: [twelfHeighestTrioInOrder[4].first, twelfHeighestTrioInOrder[4].second, twelfHeighestTrioInOrder[4].third],
          quote: twelfHeighestTrioInOrder[4].odd,
          betCodeId: 6
        },
        {
          drivers: [twelfHeighestTrioInOrder[10].first, twelfHeighestTrioInOrder[10].second, twelfHeighestTrioInOrder[10].third],
          quote: twelfHeighestTrioInOrder[10].odd,
          betCodeId: 6
        }
      ],
      [
        { drivers: [twelfLowestTrioInOrder[5].first, twelfLowestTrioInOrder[5].second, twelfLowestTrioInOrder[5].third], quote: twelfLowestTrioInOrder[5].odd, betCodeId: 6 },
        { drivers: [twelfLowestTrioInOrder[11].first, twelfLowestTrioInOrder[11].second, twelfLowestTrioInOrder[11].third], quote: twelfLowestTrioInOrder[11].odd, betCodeId: 6 },
        {
          drivers: [twelfHeighestTrioInOrder[5].first, twelfHeighestTrioInOrder[5].second, twelfHeighestTrioInOrder[5].third],
          quote: twelfHeighestTrioInOrder[5].odd,
          betCodeId: 6
        },
        {
          drivers: [twelfHeighestTrioInOrder[11].first, twelfHeighestTrioInOrder[11].second, twelfHeighestTrioInOrder[11].third],
          quote: twelfHeighestTrioInOrder[11].odd,
          betCodeId: 6
        }
      ]
    ];

    this.dog63rd = {
      quotesPerColumn: [
        [
          this.serverOdds[63],
          this.serverOdds[64],
          this.serverOdds[65],
          this.serverOdds[66],
          this.serverOdds[67],
          this.serverOdds[68],
          this.serverOdds[69],
          this.serverOdds[70],
          this.serverOdds[71],
          this.serverOdds[72],
          this.serverOdds[73],
          this.serverOdds[74],
          this.serverOdds[75],
          this.serverOdds[76],
          this.serverOdds[77],
          this.serverOdds[78],
          this.serverOdds[79],
          this.serverOdds[80],
          this.serverOdds[81],
          this.serverOdds[82]
        ],
        [
          this.serverOdds[83],
          this.serverOdds[84],
          this.serverOdds[85],
          this.serverOdds[86],
          this.serverOdds[87],
          this.serverOdds[88],
          this.serverOdds[89],
          this.serverOdds[90],
          this.serverOdds[91],
          this.serverOdds[92],
          this.serverOdds[93],
          this.serverOdds[94],
          this.serverOdds[95],
          this.serverOdds[96],
          this.serverOdds[97],
          this.serverOdds[98],
          this.serverOdds[99],
          this.serverOdds[100],
          this.serverOdds[101],
          this.serverOdds[102]
        ],
        [
          this.serverOdds[103],
          this.serverOdds[104],
          this.serverOdds[105],
          this.serverOdds[106],
          this.serverOdds[107],
          this.serverOdds[108],
          this.serverOdds[109],
          this.serverOdds[110],
          this.serverOdds[111],
          this.serverOdds[112],
          this.serverOdds[113],
          this.serverOdds[114],
          this.serverOdds[115],
          this.serverOdds[116],
          this.serverOdds[117],
          this.serverOdds[118],
          this.serverOdds[119],
          this.serverOdds[120],
          this.serverOdds[121],
          this.serverOdds[122]
        ],
        [
          this.serverOdds[123],
          this.serverOdds[124],
          this.serverOdds[125],
          this.serverOdds[126],
          this.serverOdds[127],
          this.serverOdds[128],
          this.serverOdds[129],
          this.serverOdds[130],
          this.serverOdds[131],
          this.serverOdds[132],
          this.serverOdds[133],
          this.serverOdds[134],
          this.serverOdds[135],
          this.serverOdds[136],
          this.serverOdds[137],
          this.serverOdds[138],
          this.serverOdds[139],
          this.serverOdds[140],
          this.serverOdds[141],
          this.serverOdds[142]
        ],
        [
          this.serverOdds[143],
          this.serverOdds[144],
          this.serverOdds[145],
          this.serverOdds[146],
          this.serverOdds[147],
          this.serverOdds[148],
          this.serverOdds[149],
          this.serverOdds[150],
          this.serverOdds[151],
          this.serverOdds[152],
          this.serverOdds[153],
          this.serverOdds[154],
          this.serverOdds[155],
          this.serverOdds[156],
          this.serverOdds[157],
          this.serverOdds[158],
          this.serverOdds[159],
          this.serverOdds[160],
          this.serverOdds[161],
          this.serverOdds[162]
        ],
        [
          this.serverOdds[163],
          this.serverOdds[164],
          this.serverOdds[165],
          this.serverOdds[166],
          this.serverOdds[167],
          this.serverOdds[168],
          this.serverOdds[169],
          this.serverOdds[170],
          this.serverOdds[171],
          this.serverOdds[172],
          this.serverOdds[173],
          this.serverOdds[174],
          this.serverOdds[175],
          this.serverOdds[176],
          this.serverOdds[177],
          this.serverOdds[178],
          this.serverOdds[179],
          this.serverOdds[180],
          this.serverOdds[181],
          this.serverOdds[182]
        ]
      ]
    };

    this.setResultData(data);

    this.colors = {
      white: 0xffffffff,
      green: 0xff148912,
      red: 0xffd6301d,
      panelColor: 0xff242a2f,
      panelColorBottom: 0xff22282c,
      panelColorBottomNumber: 0xff070809
    };
  }

  public setResultData(data: IGameRoundResultData) {
    if (data.finish === null) {
      this.result = null;
    } else {
      // TODO TEST
      // data.jackpot = {
      //   ticketId: "defd77b8230b0c1f",
      //   amount: 783.16,
      //   currency: "€",
      //   location: "Test Loc 2"
      // };

      const curBonusText: string | undefined = this.getJackpotWinString(data);
      let roundBonusType: RoundBonusType;
      if (data.bonus === 2) {
        roundBonusType = "x2";
      } else if (data.bonus === 3) {
        roundBonusType = "x3";
      }

      if (data.finish[3]) {
        this.result = {
          first: {
            driverIndex: data.finish[1].competitorIndex - 1,
            time: data.finish[1].time.toString()
          },
          second: {
            driverIndex: data.finish[2].competitorIndex - 1,
            time: data.finish[2].time.toString()
          },
          third: {
            driverIndex: data.finish[3].competitorIndex - 1,
            time: data.finish[3].time.toString()
          },
          clockEndTime: data.finish[2].time,
          bonus: data.bonus,
          videoname: data.videoname,
          jackpotWonText: curBonusText,
          roundBonusType
        };

        // TODO TEST
        // this.result.videoname.mp4 = "/.local/dog63/R0001_5_h.mp4?token=ZMQF9G3MSX3UQZWC";
        // this.result.videoname.jpg = "/.local/dog63/R0001_5_h.jpg?token=ZMQF9G3MSX3UQZWC";
        // this.result.videoname.mp4 = "https://d1d5bk95n21f2z.cloudfront.net/dog6/R001_text_h.mp4?Expires=1796914389&Signature=Dn5x1nE8YCwduMJfAIPFiRMTXCIaV-j3YqhJkMWJzT5rbY9E20bdxrmdjuuBK8~umCGjX-x19gfKkQkZ0zdrj2DoPPhsKJPDvbNGcLPKNLJNl7zgKwkXINddANvMpNryssktVq9T3RxGr1i8~9hPVGHWkobEv7qfnU2SU5LRrG5Nt603QQimJb3GeBmbR8monafr4HwG765sfaGkVu2HWpL489seDYaxMagm7aqh0CsmzAgL0k9mKTmfn-bB1h8e3yjHt9eUjJZ7UK2XyEW-~K8J0x~BeKDxbccJcj1WMsXfFjkE30yDzggUiU4X609eWXhzKlKYMNGOBAl2jc32vg__&Key-Pair-Id=APKAJZ22HNAJBPFO2JSA";
        // this.result.videoname.jpg = "https://d1d5bk95n21f2z.cloudfront.net/dog6/R001_text_h.jpg?Expires=1796914389&Signature=jAC78aPWEcNSjo7o7shQzDp9wATvxBTejWTBdxvmbCX5~jJ-yP7KupOgIYBQEIzmHkLLYfN1qePE5A0veCLlr7JFi0ps3DoPC671ru7r2tRnqMFViCSdP~RII8wRDR0LN3L-sNr-Y1vLeYuJNY114lpmVeQ3YcOSehEdxUJjR~Iag~Xr9B4R6wGl-vbFHaMEgO8NYQOKXvojqPLyuE7k94WwluOBfKuBRoy~L9yEoZt70ei8rBPTV4MWC~~rHYqTqU815ozA~JMpxgvplH7Ii2bIkpCFne6XpgGDIOMuaG5WF-J0hxHqu6ulOmDNsEPCYJsUxfxPhrTKecIyfgZifg__&Key-Pair-Id=APKAJZ22HNAJBPFO2JSA";
      } else {
      }
    }

    if (data.interval === null) {
      this.raceIntervals = [];
    } else {
      this.raceIntervals = [];
      let raceIntervalsDogs = raceIntervalsDog6;
      if (this.gameType === "dog6") {
        raceIntervalsDogs = raceIntervalsDog6;
      } else if (this.gameType === "dog8") {
        raceIntervalsDogs = raceIntervalsDog8;
      } else if (this.gameType === "dog63") {
        raceIntervalsDogs = raceIntervalsDog63;
      }

      for (const item of raceIntervalsDogs) {
        this.raceIntervals.push(Object.assign({}, item));
      }

      let varIntDrivers: IIntervalDriver[] = [];

      varIntDrivers.push(
        {
          driverIndex: data.interval["1"][1].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["1"][1].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        },
        {
          driverIndex: data.interval["1"][2].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["1"][2].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        },
        {
          driverIndex: data.interval["1"][3].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["1"][3].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        }
      );

      const intervalOffset1 = 0.85;
      const intervalOffset2 = 0.85;

      this.raceIntervals[1].drivers = varIntDrivers;
      this.raceIntervals[1].startTime = data.interval["1"][1].time + intervalOffset1;

      varIntDrivers = [];

      varIntDrivers.push(
        {
          driverIndex: data.interval["2"][1].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["2"][1].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        },
        {
          driverIndex: data.interval["2"][2].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["2"][2].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        },
        {
          driverIndex: data.interval["2"][3].competitorIndex - 1,
          time: Logic.implementation.formatTime(data.interval["2"][3].time, {
            minutes: false,
            seconds: true,
            hundredth: true
          })
        }
      );

      this.raceIntervals[2].drivers = varIntDrivers;
      this.raceIntervals[2].startTime = data.interval["2"][1].time + intervalOffset2;
    }

    this.videoname = data.videoname;
  }
}

export class GameTimer extends GameTimerBase {
  constructor(logic: LogicImplementation, syncTimeout: number, setUpTimeout: number, gameLoopLength: number, gameVideoStartMs: number, readInterval: number) {
    super(logic, syncTimeout, setUpTimeout, gameLoopLength, gameVideoStartMs, readInterval);
  }

  protected tick() {
    this.gameLoopSec += 1;
    this.videoStartSec += 1;

    this.lastTimeSetTimestamp = Date.now();

    this.videoRefSec = Logic.getVideoTime();
    const withoutIntro = Logic.getGameInfo()?.gameLength === 60 && Logic.getGameInfo()?.gameType !== "roulette";

    const lastReloadTime = parseInt(localStorage.getItem("last_stuck_reload") || "0", 10);

    if (this.videoRefSec !== this.lastVideoRefSec) {
      this.lastVideoChangeTimestamp = Date.now();
      this.lastVideoRefSec = this.videoRefSec;
    }

    if (Date.now() - this.lastVideoChangeTimestamp > 5_000 && !this.logic.getGamesModel().raceBreak && Date.now() - lastReloadTime > 15_000) {
      Logger.error(`Video freeze detected: video.currentTime hasn't changed in 5s – reloading page`);
      localStorage.setItem("last_stuck_reload", String(Date.now()));
      Logic.implementation.reloadWindow();
      return;
    }

    if (
      withoutIntro &&
      ((this.videoStartSec >= 8 && this.videoStartSec <= 55 && this.videoRefSec != null && this.videoRefSec < 1.5) ||
        (this.videoStartSec >= 8 && this.videoStartSec <= 55 && this.videoRefSec != null && this.videoRefSec > 60) ||
        this.videoStartSec >= 66) &&
      !this.logic.getGamesModel().raceBreak &&
      Date.now() - lastReloadTime > 15_000
    ) {
      Logger.error(`Video stuck detected: gameTimer=${this.videoStartSec}s, video.currentTime=${this.videoRefSec}s – reloading page`);
      localStorage.setItem("last_stuck_reload", String(Date.now()));
      Logic.implementation.reloadWindow();
      return;
    }

    Logger.trace("Game loop Tick:" + this.gameLoopSec + "   video Sec:" + this.videoStartSec + "   videoRef Sec:" + this.videoRefSec);

    if (!this.logic.getGamesModel().raceBreak) {
      if (this.gameLoopSec >= this._gameLoopLength) {
        // start next game Loop
        this.gameLoopSec = 0;
        Logger.debug("Gameloop Reset:" + this.gameLoopSec + "   video Sec:" + this.videoStartSec);
        this.logic.getGamesModel().raceStarted();
      }

      const curGame: ModelBase = this.logic.getGamesModel().getCurrentGameData();

      this.logic.checkSetUpPlay(this.videoStartSec);

      // 5 seconds after race start, not already requested for this round, and race result alredy received (because winner info needed for number of wins)
      if (
        (this.videoStartSec > this.logic.getRoundRequestSecond() && !this.roundRequestDone && curGame.result !== null) ||
        (!this.roundRequestDone && this.videoStartSec >= this._gameLoopLength - 7)
      ) {
        // at least seven seconds before next video round start, for safety

        clearTimeout(this.retryTimout);
        this.roundRequestDone = true;

        if (this.countInitInterval % this.readInterval === 0) {
          const loadAsync = async () => {
            try {
              const sendData = new SockServGameRoundMessage(null, 0, this.logic.getGamesModel().getIndexCurGame() + this.readInterval);
              const result: ISockServResponseMessageGameRound = await ServerSocketLogic.instance.sendGameRequest(sendData);

              this.countInitInterval = 1;
              const gamesList: ModelBase[] = [];

              for (const item of result.gamepool) {
                let newModel = new ModelKart(Logic.implementation.getGameInfo().gameType);

                switch (Logic.implementation.getGameInfo().gameType) {
                  case "kart5":
                    newModel = new ModelKart(Logic.implementation.getGameInfo().gameType);
                    break;
                  case "dog6":
                    newModel = new ModelDog(Logic.implementation.getGameInfo().gameType);
                    break;
                  case "dog8":
                    newModel = new ModelDog(Logic.implementation.getGameInfo().gameType);
                    break;
                  case "box":
                    newModel = new ModelBox(Logic.implementation.getGameInfo().gameType);
                    break;
                  case "dog63":
                    newModel = new ModelDog63(Logic.implementation.getGameInfo().gameType);
                    break;
                  case "horse":
                    newModel = new ModelHorse(Logic.implementation.getGameInfo().gameType);
                    break;
                  case "sulky":
                    newModel = new ModelSulky(Logic.implementation.getGameInfo().gameType);
                    break;
                  case "roulette":
                    newModel = new ModelRtt(Logic.implementation.getGameInfo().gameType);
                    break;
                }

                if (newModel === null) {
                  throw new Error("Invalied Game Type:" + Logic.implementation.getGameInfo().gameType);
                } else {
                  newModel.setServerData(item);

                  newModel.convertFromServerOdds();
                  gamesList.push(newModel);
                }
              }

              this.logic.getGamesModel().addNewGameData(gamesList);
            } catch (error) {
              // to force retry request after some time
              this.retryTimout = setTimeout(() => {
                this.roundRequestDone = false;
              }, 5000);
            }
          };

          // TODO TEST
          // return;

          loadAsync();
        } else {
          this.countInitInterval += 1;
        }

        // should be loaded before fade to race
      }

      this.logic.checkStartNextVideoLoop(this.videoStartSec);

      if (this.lastServerTimeRequestTime > this.gameLoopSec) {
        // last sync was in before game loop
        this.lastServerTimeRequestTime -= this._gameLoopLength;

        if (this.lastServerTimeRequestTime > 0) {
          // for safety
          this.lastServerTimeRequestTime = 2;
        }
      }

      if (this.lastServerTimeRequestTime <= this.gameLoopSec - this.timeRequestIntevall) {
        // synchronize with server time every n second
        this.lastServerTimeRequestTime = this.gameLoopSec;
        if (this.timeRquestNthCount >= this.syncEveryNth) {
          try {
            this.synchronizeGameLoop(false);
          } catch (error) {
            // error allready handled
          }
        } else {
          this.sendServerTimeReuqest();
        }
      }

      if (this.videoStartSec >= Util.floatNumber(this._gameVideoStartMs / 1000, 3) + Settings.noResultWaitSeconds && !this.receivedResultCheck) {
        // start next game Loop
        this.receivedResultCheck = true;
        Logger.info("Check if Result received");
        this.logic.checkResultDalayToBig();
      }
    } else {
      // in race break

      // show Race Break view after last race ended
      if (this.videoStartSec >= this._gameLoopLength && !this.logic.getGamesModel().raceBreakShown) {
        Logic.fadeTo(VideoState.Intro);
      }

      if (this.logic.getGamesModel().getIndexCurGame() < INIT_NUMB_FUTURE) {
        // not enough future games read

        if (this.countRaceBreakReqestInterval % RACE_BREAK_REQU_INTERVAL === 0) {
          const loadAsync = async () => {
            try {
              const sendData = new SockServGameRoundMessage(null, 0, 2); // TODO future games from init
              const result: ISockServResponseMessageGameRound = await ServerSocketLogic.instance.sendGameRequest(sendData);

              this.countRaceBreakReqestInterval = 1;
              const gamesList: ModelBase[] = [];

              for (const item of result.gamepool) {
                let newModel = new ModelKart(Logic.implementation.getGameInfo().gameType);

                switch (Logic.implementation.getGameInfo().gameType) {
                  case "kart5":
                    newModel = new ModelKart(Logic.implementation.getGameInfo().gameType);
                    break;
                  case "dog6":
                    newModel = new ModelDog(Logic.implementation.getGameInfo().gameType);
                    break;
                  case "dog8":
                    newModel = new ModelDog(Logic.implementation.getGameInfo().gameType);
                    break;
                  case "box":
                    newModel = new ModelBox(Logic.implementation.getGameInfo().gameType);
                    break;
                  case "dog63":
                    newModel = new ModelDog63(Logic.implementation.getGameInfo().gameType);
                    break;
                  case "horse":
                    newModel = new ModelHorse(Logic.implementation.getGameInfo().gameType);
                    break;
                  case "sulky":
                    newModel = new ModelSulky(Logic.implementation.getGameInfo().gameType);
                    break;
                  case "roulette":
                    newModel = new ModelRtt(Logic.implementation.getGameInfo().gameType);
                    break;
                }

                if (newModel === null) {
                  throw new Error("Invalied Game Type:" + Logic.implementation.getGameInfo().gameType);
                } else {
                  newModel.setServerData(item);

                  newModel.convertFromServerOdds();
                  gamesList.push(newModel);
                }
              }

              this.logic.getGamesModel().addNewGameData(gamesList);
            } catch (error) {}
          };

          // TODO TEST
          // return;

          loadAsync();
        } else {
          this.countRaceBreakReqestInterval += 1;
        }
      } else {
        // already enough future games read
        // check if next game start with in a round length
        const checkReturn: INextGameWithinCheck = this.checkNextGameWithinGameLength();

        if (checkReturn.isWithin) {
          // if so set gameloop values as if a last game was running
          this.gameLoopSec = checkReturn.calcGameLoopSec;
          this.videoStartSec = Util.floatNumber(this.gameLoopSec + this._gameVideoStartMs / 1000, 3);

          if (this.videoStartSec >= this._gameLoopLength) {
            this.videoStartSec -= this._gameLoopLength;
          }

          this.countInitInterval = 1; // future games are set
          // and enable tick
          this.logic.getGamesModel().setRaceBreak(false);
          this.logic.getGamesModel().showRaceBreakAtStart = false;
        }
      }

      if (this.lastServerTimeRequestTime <= this.gameLoopSec - this.timeRequestIntevall) {
        // synchronize with server time every n second
        this.lastServerTimeRequestTime = this.gameLoopSec;
        if (this.timeRquestNthCount >= this.syncEveryNth) {
          try {
            this.synchronizeGameLoop(false);
          } catch (error) {
            // error allready handled
          }
        } else {
          this.sendServerTimeReuqest();
        }
      }

      // last race before racebreak is currently running
      if (!this.receivedResultCheck && this.getCurrentServerTimeUnix() - this.logic.getGamesModel().getCurrentGameData().getGameStartTime() < (GAME_LOOP_LENGTH - 30) * 1000) {
        // check if got result
        if (this.videoStartSec >= Util.floatNumber(this._gameVideoStartMs / 1000, 3) + Settings.noResultWaitSeconds && !this.receivedResultCheck) {
          // start next game Loop
          this.receivedResultCheck = true;
          Logger.info("Check if Result received in race breake");
          this.logic.checkResultDalayToBig();
        }
      }
    }
  }
}

export class ModelHorse extends ModelBase {
  constructor(gameType: GameType) {
    super(gameType);
  }

  public setServerData(data: IGameRoundData) {
    const gameId = parseInt(data.id.replace(data.idSchedule, ""), 10);

    let bonusValue: number | undefined;
    let oldBonusValue: number | undefined;

    if (Logic.implementation.hasJackpotBounus()) {
      if (data.jackpotInfo !== null) {
        bonusValue = data.jackpotInfo.bonusValue;
        oldBonusValue = data.jackpotInfo.oldBonusValue;
        this.jackpotHistory = this.getHistoryDataFromResult(data.jackpotInfo.bonusHistory);
      } else {
        Logger.error("Bonus Flag set but no bonus values given!!");
        this.jackpotHistory = undefined;
      }
    } else {
      this.jackpotHistory = undefined;
    }

    // eslint-disable-next-line max-len
    this.roundInfo = {
      fullGameId: data.id,
      gameId,
      jackpotValue: bonusValue,
      oldJackpotValue: oldBonusValue,
      videoStartDt: data.videoStartDt,
      videoEndDt: data.videoEndDt,
      videoStartUnix: Util.getSecondsSinceFromUTCDate(Util.getDatFromStandardString(data.videoStartDt)),
      videoEndUnix: Util.getSecondsSinceFromUTCDate(Util.getDatFromStandardString(data.videoEndDt)),
      sendPlan: data.idSchedule,
      raceStart: Util.formatDateFromUtcStandardDateString(data.videoStartDt, Languages.instance.getText("dateTimeFormat")),
      raceNumber: gameId.toString().padStart(4, "0"),
      it_code_schedule: data.it_code_schedule,
      it_code_event: data.it_code_event,
      roundInterval: data.roundInterval
    };

    this.drivers = [];
    let combCount = 0;

    for (const item of driversHorse) {
      this.drivers.push(Object.assign({}, item));
      combCount++;
      if (combCount >= GamesModel.RASTER_SIZE) {
        break;
      }
    }

    let drivIndex: number = 0;
    const weightSign = Languages.instance.getText("weightSign");

    for (const prop in data.competitors) {
      if (data.competitors.hasOwnProperty(prop)) {
        const curCompet: ICompetitorDataHorse = data.competitors[prop];
        const curDriver = this.drivers[drivIndex];
        curDriver.firstName = curCompet.name;
        curDriver.lastName = "";

        const driverInfos = [];

        if (weightSign === "lb") {
          // Logger.debug("Weight in KG:" + curCompet.weight);
          curCompet.weight = curCompet.weight * 2.20462;
          // Logger.debug("Weight in LB:" + curCompet.weight);
        }

        driverInfos.push({
          key: Languages.instance.getText("weight"),
          value: /*"65lb"*/ Logic.implementation.formatNumber(curCompet.weight, 0) + weightSign
        });
        driverInfos.push({
          key: Languages.instance.getText("wins"),
          value: curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1.toString() : ""
        });
        driverInfos.push({
          key: Languages.instance.getText("theLastFive"),
          value: curCompet.last5 ? curCompet.last5.split("|").join("-") : ""
        });
        driverInfos.push({
          key: Languages.instance.getText("trendTxt"),
          value: curCompet.trend !== undefined && curCompet.trend !== null ? curCompet.trend.toString() : "3",
          arrow: true
        });

        curDriver.driverInfos = driverInfos;

        const driverRaceInfos = [];
        driverRaceInfos.push({
          key: Languages.instance.getText("ageTxt"),
          value: curCompet.age.toString()
        });
        driverRaceInfos.push({
          key: Languages.instance.getText("sexTxt"),
          value: curCompet.sex
        });
        driverRaceInfos.push({
          key: Languages.instance.getText("weight"),
          value: Logic.implementation.formatNumber(curCompet.weight, 0) + weightSign
        });

        curDriver.driverRaceInfos = driverRaceInfos;

        if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) > 0) {
          let text = Languages.instance.getText("txtHorWin");

          if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) % 10 === 1) {
            //for 1, 11, 21, ....
            text = Languages.instance.getText("txtHorWin1");
          } else if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) % 10 === 0) {
            //for 10,20,30 ...
            text = Languages.instance.getText("txtHorWin10");
          }

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            // number of race text is for 10,20,30 ...
            Logger.warn("Text is for 10th races");
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName.toUpperCase() + " " + curDriver.lastName.toUpperCase())
            .replace("__RACES__", curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "")
            .replace("__WON__", curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1.toString() : "");
        } else if ((curCompet.nbr2 !== undefined && curCompet.nbr2 !== null ? curCompet.nbr2 : 0) > 0) {
          let text = Languages.instance.getText("txtHorInf10"); //for 10,20,30 ...

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            text = Languages.instance.getText("txtHorInf"); //for 2-9, 12-19 ...
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName.toUpperCase() + " " + curDriver.lastName.toUpperCase())
            .replace(
              "__RACES__",
              curCompet.nbr2 !== undefined && curCompet.nbr2 !== null
                ? curCompet.nbr2.toString()
                : "" + "/" + (curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "")
            );
        } else {
          let text = Languages.instance.getText("txtHorNon10"); //for 10,20,30 ...

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            text = Languages.instance.getText("txtHorNon"); //for 2-9, 12-19 ...
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName.toUpperCase() + " " + curDriver.lastName.toUpperCase())
            .replace("__RACES__", curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "");
        }

        drivIndex++;
      }
    }

    // for ( let i = 0 ; i < this.drivers.length ; i++) {
    //   this.drivers[i].lastName = data.competitors[i + 1];
    // }

    this.serverOdds = data.odds;
    this.track = trackHorse;

    let info = trackHorse.facts.find((i) => i.key === Languages.instance.getText("avgTime") + ":");
    if (info) {
      info.value = Logic.implementation.formatTime(avgHorseTime, {
        minutes: true,
        seconds: true,
        hundredth: true
      });
    }

    // TODO TEST
    // data.courseConditions = "slow";
    // data.	weather =  "bad";
    // data.	temperature =  12;
    // data.	humidity =  65;
    // data.	wind =  "5 SW";

    info = this.track.facts.find((i) => i.key === Languages.instance.getText("courseCond") + ":");
    if (info) {
      if (data.courseConditions) {
        info.value = Languages.instance.getText(data.courseConditions);
      }
    }

    let weatherTxt = "FINE";

    if (data.weather) {
      weatherTxt = Languages.instance.getText(data.weather);
    }

    this.track.lapMapFacts = [
      Languages.instance.getText("weather") + ": <b>" + weatherTxt + "</b>",
      Languages.instance.getText("tempShort") + ": <b>" + data.temperature + "°C</b>",
      Languages.instance.getText("humidity") + ": <b>" + data.humidity + "%</b>",
      Languages.instance.getText("wind") + ": <b>" + data.wind + "</b>"
    ];

    // newModel.history = history;

    this.setResultData(data);

    if (Logic.gameInfo?.gameSkin === SkinTypeDefinition.CLASSIC) {
      this.colors = ModelHorseC4.colors;
    } else {
      this.colors = {
        white: 0xffffffff,
        green: 0xff148912,
        red: 0xffd6301d,
        panelColor: 0xff242a2f,
        panelColorBottom: 0xff22282c,
        panelColorBottomNumber: 0xff070809
      };
    }
  }

  public setResultData(data: IGameRoundResultData) {
    if (data.finish === null) {
      this.result = null;
    } else {
      // TODO TEST
      // data.jackpot = {
      //   ticketId: "defd77b8230b0c1f",
      //   amount: 783.16,
      //   currency: "€",
      //   location: "Test Loc 2"
      // };

      //TODO TEST
      // data.finish[1].time = 64.66;
      // data.finish[2].time = 65.06;
      // data.overlayStart = "00:00:08.68";
      // data.overlayEnd = "00:00:16.36";
      // if(data.interval){
      //   data.interval[1][1] = { competitorIndex: 3, time: 14.36 };
      //   data.interval[1][2] = { competitorIndex: 1, time: 14.64 };
      // }
      // if(data.interval){
      //   data.interval[2][1] = { competitorIndex: 3, time: 39.36 };
      //   data.interval[2][2] = { competitorIndex: 1, time: 39.5 };
      // }

      // TODO TEST
      // if(this.roundInfo.gameId === 205){
      //   data.bonus = 2;
      // }

      const curBonusText: string | undefined = this.getJackpotWinString(data);
      let roundBonusType: RoundBonusType;
      if (data.bonus === 2) {
        roundBonusType = "x2";
      } else if (data.bonus === 3) {
        roundBonusType = "x3";
      }

      this.result = {
        first: {
          driverIndex: data.finish[1].competitorIndex - 1,
          time: data.finish[1].time.toString()
        },
        second: {
          driverIndex: data.finish[2].competitorIndex - 1,
          time: data.finish[2].time.toString()
        },
        clockEndTime: data.finish[2].time,
        bonus: data.bonus,
        videoname: data.videoname,
        jackpotWonText: curBonusText,
        roundBonusType,
        overlayStart: data.overlayStart,
        overlayEnd: data.overlayEnd,
        resultOffsetTime: data.finish[1].time
      };

      // TODO TEST
      // this.result.videoname.mp4 = "/.local/horse/R0001_h.mp4?token=ZMQF9G3MSX3UQZWC";
      // this.result.videoname.jpg = "/.local/horse/R0001_h.jpg?token=ZMQF9G3MSX3UQZWC";
    }

    if (data.interval === null) {
      this.raceIntervals = [];
    } else {
      this.raceIntervals = [];
      const raceIntervalsDogs = raceIntervalsHorse;

      for (const item of raceIntervalsDogs) {
        this.raceIntervals.push(Object.assign({}, item));
      }

      let varIntDrivers: IIntervalDriver[] = [];

      varIntDrivers.push(
        { driverIndex: data.interval["1"][1].competitorIndex - 1, time: Logic.implementation.formatTime(data.interval["1"][1].time, { minutes: true, seconds: true, hundredth: true }) },
        { driverIndex: data.interval["1"][2].competitorIndex - 1, time: Logic.implementation.formatTime(data.interval["1"][2].time, { minutes: true, seconds: true, hundredth: true }) }
      );

      const intervalOffset1 = 0.85;
      const intervalOffset2 = 0.85;

      this.raceIntervals[1].drivers = varIntDrivers;
      this.raceIntervals[1].startTime = data.interval["1"][1].time + intervalOffset1;

      varIntDrivers = [];

      varIntDrivers.push(
        { driverIndex: data.interval["2"][1].competitorIndex - 1, time: Logic.implementation.formatTime(data.interval["2"][1].time, { minutes: true, seconds: true, hundredth: true }) },
        { driverIndex: data.interval["2"][2].competitorIndex - 1, time: Logic.implementation.formatTime(data.interval["2"][2].time, { minutes: true, seconds: true, hundredth: true }) }
      );

      this.raceIntervals[2].drivers = varIntDrivers;
      this.raceIntervals[2].startTime = data.interval["2"][1].time + intervalOffset2;
    }

    this.videoname = data.videoname;
  }
}

export class ModelSulky extends ModelBase {
  constructor(gameType: GameType) {
    super(gameType);
  }

  public setServerData(data: IGameRoundData) {
    const gameId = parseInt(data.id.replace(data.idSchedule, ""), 10);

    let bonusValue: number | undefined;
    let oldBonusValue: number | undefined;

    if (Logic.implementation.hasJackpotBounus()) {
      if (data.jackpotInfo !== null) {
        bonusValue = data.jackpotInfo.bonusValue;
        oldBonusValue = data.jackpotInfo.oldBonusValue;
        this.jackpotHistory = this.getHistoryDataFromResult(data.jackpotInfo.bonusHistory);
      } else {
        Logger.error("Bonus Flag set but no bonus values given!!");
        this.jackpotHistory = undefined;
      }
    } else {
      this.jackpotHistory = undefined;
    }

    // eslint-disable-next-line max-len
    this.roundInfo = {
      fullGameId: data.id,
      gameId,
      jackpotValue: bonusValue,
      oldJackpotValue: oldBonusValue,
      videoStartDt: data.videoStartDt,
      videoEndDt: data.videoEndDt,
      videoStartUnix: Util.getSecondsSinceFromUTCDate(Util.getDatFromStandardString(data.videoStartDt)),
      videoEndUnix: Util.getSecondsSinceFromUTCDate(Util.getDatFromStandardString(data.videoEndDt)),
      sendPlan: data.idSchedule,
      raceStart: Util.formatDateFromUtcStandardDateString(data.videoStartDt, Languages.instance.getText("dateTimeFormat")),
      raceNumber: gameId.toString().padStart(4, "0"),
      it_code_schedule: data.it_code_schedule,
      it_code_event: data.it_code_event,
      roundInterval: data.roundInterval
    };

    this.drivers = [];
    let combCount = 0;

    for (const item of driversSulky) {
      this.drivers.push(Object.assign({}, item));
      combCount++;
      if (combCount >= GamesModel.RASTER_SIZE) {
        break;
      }
    }

    let drivIndex: number = 0;
    const weightSign = Languages.instance.getText("weightSign");

    for (const prop in data.competitors) {
      if (data.competitors.hasOwnProperty(prop)) {
        const curCompet: ICompetitorDataHorse = data.competitors[prop];
        const curDriver = this.drivers[drivIndex];
        curDriver.firstName = curCompet.name;
        curDriver.lastName = "";

        const driverInfos = [];

        if (weightSign === "lb") {
          // Logger.debug("Weight in KG:" + curCompet.weight);
          curCompet.weight = curCompet.weight * 2.20462;
          // Logger.debug("Weight in LB:" + curCompet.weight);
        }

        driverInfos.push({ key: Languages.instance.getText("weight"), value: /*"65lb"*/ Logic.implementation.formatNumber(curCompet.weight, 0) + weightSign });
        driverInfos.push({ key: Languages.instance.getText("wins"), value: curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1.toString() : "" });
        driverInfos.push({ key: Languages.instance.getText("theLastFive"), value: curCompet.last5 ? curCompet.last5.split("|").join("-") : "" });
        driverInfos.push({ key: Languages.instance.getText("trendTxt"), value: curCompet.trend !== undefined && curCompet.trend !== null ? curCompet.trend.toString() : "3", arrow: true });

        curDriver.driverInfos = driverInfos;

        const driverRaceInfos = [];
        driverRaceInfos.push({ key: Languages.instance.getText("ageTxt"), value: curCompet.age.toString() });
        driverRaceInfos.push({ key: Languages.instance.getText("sexTxt"), value: curCompet.sex });
        driverRaceInfos.push({ key: Languages.instance.getText("weight"), value: Logic.implementation.formatNumber(curCompet.weight, 0) + weightSign });

        curDriver.driverRaceInfos = driverRaceInfos;

        if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) > 0) {
          let text = Languages.instance.getText("txtHorWin");

          if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) % 10 === 1) {
            //for 1, 11, 21, ....
            text = Languages.instance.getText("txtHorWin1");
          } else if ((curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1 : 0) % 10 === 0) {
            //for 10,20,30 ...
            text = Languages.instance.getText("txtHorWin10");
          }

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            // number of race text is for 10,20,30 ...
            Logger.warn("Text is for 10th races");
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName.toUpperCase() + " " + curDriver.lastName.toUpperCase())
            .replace("__RACES__", curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "")
            .replace("__WON__", curCompet.nbr1 !== undefined && curCompet.nbr1 !== null ? curCompet.nbr1.toString() : "");
        } else if ((curCompet.nbr2 !== undefined && curCompet.nbr2 !== null ? curCompet.nbr2 : 0) > 0) {
          let text = Languages.instance.getText("txtHorInf10"); //for 10,20,30 ...

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            text = Languages.instance.getText("txtHorInf"); //for 2-9, 12-19 ...
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName.toUpperCase() + " " + curDriver.lastName.toUpperCase())
            .replace(
              "__RACES__",
              curCompet.nbr2 !== undefined && curCompet.nbr2 !== null
                ? curCompet.nbr2.toString()
                : "" + "/" + (curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "")
            );
        } else {
          let text = Languages.instance.getText("txtHorNon10"); //for 10,20,30 ...

          if ((curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic : 0) % 10 !== 0) {
            text = Languages.instance.getText("txtHorNon"); //for 2-9, 12-19 ...
          }

          curDriver.driverBarText = text
            .replace("__NUM__", (drivIndex + 1).toString())
            .replace("__NAME__", curDriver.firstName.toUpperCase() + " " + curDriver.lastName.toUpperCase())
            .replace("__RACES__", curCompet.racesForStatistic !== undefined && curCompet.racesForStatistic !== null ? curCompet.racesForStatistic.toString() : "");
        }

        drivIndex++;
      }
    }

    // for ( let i = 0 ; i < this.drivers.length ; i++) {
    //   this.drivers[i].lastName = data.competitors[i + 1];
    // }

    this.serverOdds = data.odds;
    this.track = trackSulky;

    let info = trackSulky.facts.find((i) => i.key === Languages.instance.getText("avgTime") + ":");
    if (info) {
      info.value = Logic.implementation.formatTime(avgSulkyTime, { minutes: true, seconds: true, hundredth: true });
    }

    // TODO TEST
    // data.courseConditions = "slow";
    // data.	weather =  "bad";
    // data.	temperature =  12;
    // data.	humidity =  65;
    // data.	wind =  "5 SW";

    info = this.track.facts.find((i) => i.key === Languages.instance.getText("courseCond") + ":");
    if (info) {
      if (data.courseConditions) {
        info.value = Languages.instance.getText(data.courseConditions);
      }
    }

    let weatherTxt = "FINE";

    if (data.weather) {
      weatherTxt = Languages.instance.getText(data.weather);
    }

    this.track.lapMapFacts = [
      Languages.instance.getText("weather") + ": <b>" + weatherTxt + "</b>",
      Languages.instance.getText("tempShort") + ": <b>" + data.temperature + "°C</b>",
      Languages.instance.getText("humidity") + ": <b>" + data.humidity + "%</b>",
      Languages.instance.getText("wind") + ": <b>" + data.wind + "</b>"
    ];

    // newModel.history = history;

    this.setResultData(data);

    this.colors = {
      white: 0xffffffff,
      green: 0xff148912,
      red: 0xffd6301d,
      panelColor: 0xff242a2f,
      panelColorBottom: 0xff22282c,
      panelColorBottomNumber: 0xff070809
    };
  }

  public setResultData(data: IGameRoundResultData) {
    if (data.finish === null) {
      this.result = null;
    } else {
      // TODO TEST
      // data.jackpot = {
      //   ticketId: "defd77b8230b0c1f",
      //   amount: 783.16,
      //   currency: "€",
      //   location: "Test Loc 2"
      // };

      //TODO TEST
      // data.finish[1].time = 64.66;
      // data.finish[2].time = 65.06;
      // data.overlayStart = "00:00:08.68";
      // data.overlayEnd = "00:00:16.36";
      // if(data.interval){
      //   data.interval[1][1] = { competitorIndex: 3, time: 14.36 };
      //   data.interval[1][2] = { competitorIndex: 1, time: 14.64 };
      // }
      // if(data.interval){
      //   data.interval[2][1] = { competitorIndex: 3, time: 39.36 };
      //   data.interval[2][2] = { competitorIndex: 1, time: 39.5 };
      // }

      const curBonusText: string | undefined = this.getJackpotWinString(data);
      let roundBonusType: RoundBonusType;
      if (data.bonus === 2) {
        roundBonusType = "x2";
      } else if (data.bonus === 3) {
        roundBonusType = "x3";
      }

      this.result = {
        first: { driverIndex: data.finish[1].competitorIndex - 1, time: data.finish[1].time.toString() },
        second: { driverIndex: data.finish[2].competitorIndex - 1, time: data.finish[2].time.toString() },
        clockEndTime: data.finish[2].time,
        bonus: data.bonus,
        videoname: data.videoname,
        jackpotWonText: curBonusText,
        roundBonusType,
        overlayStart: data.overlayStart,
        overlayEnd: data.overlayEnd,
        resultOffsetTime: data.finish[1].time
      };

      // TODO TEST
      // this.result.videoname.mp4 = "/.local/sulky7/R0015_h50.mp4?token=ZMQF9G3MSX3UQZWC";
      // this.result.videoname.jpg = "/.local/sulky7/R0015_h50.jpg?token=ZMQF9G3MSX3UQZWC";
    }

    if (data.interval === null) {
      this.raceIntervals = [];
    } else {
      this.raceIntervals = [];
      const raceIntervalsDogs = raceIntervalsSulky;

      for (const item of raceIntervalsDogs) {
        this.raceIntervals.push(Object.assign({}, item));
      }

      let varIntDrivers: IIntervalDriver[] = [];

      varIntDrivers.push(
        { driverIndex: data.interval["1"][1].competitorIndex - 1, time: Logic.implementation.formatTime(data.interval["1"][1].time, { minutes: true, seconds: true, hundredth: true }) },
        { driverIndex: data.interval["1"][2].competitorIndex - 1, time: Logic.implementation.formatTime(data.interval["1"][2].time, { minutes: true, seconds: true, hundredth: true }) }
      );

      const intervalOffset1 = 0.95;
      const intervalOffset2 = 0.95;

      this.raceIntervals[1].drivers = varIntDrivers;
      this.raceIntervals[1].startTime = data.interval["1"][1].time + intervalOffset1;

      varIntDrivers = [];

      varIntDrivers.push(
        { driverIndex: data.interval["2"][1].competitorIndex - 1, time: Logic.implementation.formatTime(data.interval["2"][1].time, { minutes: true, seconds: true, hundredth: true }) },
        { driverIndex: data.interval["2"][2].competitorIndex - 1, time: Logic.implementation.formatTime(data.interval["2"][2].time, { minutes: true, seconds: true, hundredth: true }) }
      );

      this.raceIntervals[2].drivers = varIntDrivers;
      this.raceIntervals[2].startTime = data.interval["2"][1].time + intervalOffset2;
    }

    this.videoname = data.videoname;
  }
}

export class ModelRtt extends ModelBase {
  public static getSatisicDataFromRequestData(rttStatisitc: IRttStatistic): IRouletteStats {
    const statusData = modelRouletteC4.rouletteStats;
    statusData.allNumbers = [];
    for (const numberData of rttStatisitc.numbers) {
      statusData.allNumbers.push(numberData.count);
    }
    statusData.generalStats.hotNumbers = [];
    for (const numberElm of rttStatisitc.hotNumbers) {
      statusData.generalStats.hotNumbers.push(numberElm.number);
    }
    statusData.generalStats.coldNumbers = [];
    for (const numberElm of rttStatisitc.coldNumbers) {
      statusData.generalStats.coldNumbers.push(numberElm.number);
    }
    statusData.generalStats.red = rttStatisitc.countRed;
    statusData.generalStats.black = rttStatisitc.countBlack;
    statusData.generalStats.areas = [
      rttStatisitc.countOdd,
      rttStatisitc.countEven,
      rttStatisitc.countLow,
      rttStatisitc.countHigh,
      rttStatisitc.countColumn1,
      rttStatisitc.countColumn2,
      rttStatisitc.countColumn3,
      rttStatisitc.countDozen1,
      rttStatisitc.countDozen2,
      rttStatisitc.countDozen3
    ];

    return statusData;
  }

  get statusData(): IRouletteStats {
    return this._statusData;
  }

  private _statusData: IRouletteStats = modelRouletteC4.rouletteStats;
  private _rttStatisitc: IRttStatistic | undefined = undefined;

  constructor(gameType: GameType) {
    super(gameType);
  }

  public setServerData(data: IGameRoundData) {
    const gameId = parseInt(data.id.replace(data.idSchedule, ""), 10);

    let bonusValue: number | undefined;
    let oldBonusValue: number | undefined;

    if (Logic.implementation.hasJackpotBounus()) {
      if (data.jackpotInfo !== null) {
        bonusValue = data.jackpotInfo.bonusValue;
        oldBonusValue = data.jackpotInfo.oldBonusValue;
        this.jackpotHistory = this.getHistoryDataFromResult(data.jackpotInfo.bonusHistory);
      } else {
        Logger.error("Bonus Flag set but no bonus values given!!");
        this.jackpotHistory = undefined;
      }
    } else {
      this.jackpotHistory = undefined;
    }

    // eslint-disable-next-line max-len
    this.roundInfo = {
      fullGameId: data.id,
      gameId,
      jackpotValue: bonusValue,
      oldJackpotValue: oldBonusValue,
      videoStartDt: data.videoStartDt,
      videoEndDt: data.videoEndDt,
      videoStartUnix: Util.getSecondsSinceFromUTCDate(Util.getDatFromStandardString(data.videoStartDt)),
      videoEndUnix: Util.getSecondsSinceFromUTCDate(Util.getDatFromStandardString(data.videoEndDt)),
      sendPlan: data.idSchedule,
      raceStart: Util.formatDateFromUtcStandardDateString(data.videoStartDt, Languages.instance.getText("dateTimeFormat")),
      raceNumber: gameId.toString().padStart(4, "0"),
      it_code_schedule: data.it_code_schedule,
      it_code_event: data.it_code_event,
      roundInterval: data.roundInterval
    };

    this.drivers = [];

    this.serverOdds = data.odds;

    this.setResultData(data, false);

    this.colors = {
      white: 0xffffffff,
      green: 0xff148912,
      red: 0xffd6301d,
      panelColor: 0xff242a2f,
      panelColorBottom: 0xff22282c,
      panelColorBottomNumber: 0xff070809
    };
  }

  public setResultData(data: IGameRoundResultData, checkStatisticData?: boolean) {
    if (data.finish === null) {
      this.result = null;
    } else {
      // TODO TEST
      // data.finish[1].competitorIndex = 0;
      // data.jackpot = {
      //   ticketId: "defd77b8230b0c1f",
      //   amount: 783.16,
      //   currency: "€",
      //   location: "Test Loc 2"
      // };

      const curBonusText: string | undefined = this.getJackpotWinString(data);
      let roundBonusType: RoundBonusType;
      if (data.bonus === 2) {
        roundBonusType = "x2";
      } else if (data.bonus === 3) {
        roundBonusType = "x3";
      }

      this.result = {
        first: {
          driverIndex: data.finish[1].competitorIndex,
          time: ""
        },
        second: {
          driverIndex: -1,
          time: ""
        },
        clockEndTime: 0,
        bonus: data.bonus,
        videoname: data.videoname,
        jackpotWonText: curBonusText,
        roundBonusType
      };

      if (data.rttStatistics) {
        this._rttStatisitc = data.rttStatistics;
        this._statusData = ModelRtt.getSatisicDataFromRequestData(this._rttStatisitc);
      } else {
        if (checkStatisticData === true) {
          Logger.error("Roulett statistics Data is missing:" + this.roundInfo.fullGameId);
          const logMessage = new SockServLogMessage(ErrorsBase.INVALID_DATA.code, "Roulett statistics Data is missing:" + this.roundInfo.fullGameId);
          ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
            Logger.error("Send log Error:" + JSON.stringify(error));
          });
        }
      }

      // TODO TEST
      // this.result.videoname.mp4 = "https://d1d5bk95n21f2z.cloudfront.net/dog6/R001_text_h.mp4?Expires=1796914389&Signature=Dn5x1nE8YCwduMJfAIPFiRMTXCIaV-j3YqhJkMWJzT5rbY9E20bdxrmdjuuBK8~umCGjX-x19gfKkQkZ0zdrj2DoPPhsKJPDvbNGcLPKNLJNl7zgKwkXINddANvMpNryssktVq9T3RxGr1i8~9hPVGHWkobEv7qfnU2SU5LRrG5Nt603QQimJb3GeBmbR8monafr4HwG765sfaGkVu2HWpL489seDYaxMagm7aqh0CsmzAgL0k9mKTmfn-bB1h8e3yjHt9eUjJZ7UK2XyEW-~K8J0x~BeKDxbccJcj1WMsXfFjkE30yDzggUiU4X609eWXhzKlKYMNGOBAl2jc32vg__&Key-Pair-Id=APKAJZ22HNAJBPFO2JSA";
      // this.result.videoname.jpg = "https://d1d5bk95n21f2z.cloudfront.net/dog6/R001_text_h.jpg?Expires=1796914389&Signature=jAC78aPWEcNSjo7o7shQzDp9wATvxBTejWTBdxvmbCX5~jJ-yP7KupOgIYBQEIzmHkLLYfN1qePE5A0veCLlr7JFi0ps3DoPC671ru7r2tRnqMFViCSdP~RII8wRDR0LN3L-sNr-Y1vLeYuJNY114lpmVeQ3YcOSehEdxUJjR~Iag~Xr9B4R6wGl-vbFHaMEgO8NYQOKXvojqPLyuE7k94WwluOBfKuBRoy~L9yEoZt70ei8rBPTV4MWC~~rHYqTqU815ozA~JMpxgvplH7Ii2bIkpCFne6XpgGDIOMuaG5WF-J0hxHqu6ulOmDNsEPCYJsUxfxPhrTKecIyfgZifg__&Key-Pair-Id=APKAJZ22HNAJBPFO2JSA";
    }

    this.raceIntervals = [];

    this.videoname = data.videoname;
  }

  public convertFromServerOdds() {}

  public setRttStatisitc(value: IRttStatistic | undefined) {
    this._rttStatisitc = value;
    if (this._rttStatisitc) {
      this._statusData = ModelRtt.getSatisicDataFromRequestData(this._rttStatisitc);
    }
  }
}

export interface INextGameWithinCheck {
  isWithin: boolean;
  calcGameLoopSec: number;
}

export interface IAccoppiataNoOrderThree {
  firstDriverIndex: number;
  secondDriverIndex: number;
  quote: number;
  betCodeId: number;
}

export interface ITwelfLowestHeighestData {
  first: number;
  second: number;
  third: number;
  odd: number;
}
