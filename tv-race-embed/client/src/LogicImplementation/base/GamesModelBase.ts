import { IColors, IDriver, IJackpotHistory, IModel, IRaceInterval, IRoundHistory, ITrack } from "client/Logic/LogicDefinitions";
import { GameType, IBonusHistoryResultData, IGameRoundData, IGameRoundResultData, IGameRoundResultVideo, ISockServResponseMessageTime } from "common/Definitions";
import { ServerSocketLogic } from "client/ServerWebSocket/ServerSocketLogic";
import { Errors, ErrorHandler } from "../ErrorHandler";
import { GAME_LOOP_LENGTH, INTRO_VIDEO_LENGTH, LogicImplementation } from "../LogicImplementation";
import { Util } from "common/Util";
import { Languages } from "../Localisation";
import { Logic } from "client/Logic/Logic";
import { Logger } from "client/Logic/Logger";
import { IRoundInfoEx, IResultExtern, GamesModel, INextGameWithinCheck, ICheckMaxGameNumberResult } from "../GamesModel";
import { LanguagesBase } from "./LocalisationBase";

export abstract class ModelBase implements IModel {
  public roundInfo!: IRoundInfoEx;
  public drivers: IDriver[] = [];
  public odds: number[] = [];
  public serverOdds: number[] = [];
  public track!: ITrack;
  public history: IRoundHistory[] = [];
  public jackpotHistory: IJackpotHistory[] | undefined;
  public result!: IResultExtern | null;
  public gotNoResult: boolean = false;
  public raceIntervals: IRaceInterval[] = [];
  public colors!: IColors;
  public videoname: IGameRoundResultVideo = { mp4: "", jpg: "" };
  public fadeToRaceReiceived: boolean = false;
  public gameType: GameType = "kart5";
  public isDummyGame: boolean = false;

  constructor(gameType: GameType) {
    this.gameType = gameType;
  }

  public convertFromServerOdds() {
    Logger.debug("Server Odds:" + this.serverOdds);

    this.odds = [];

    let offset = 0;
    for (let i = 0; i < GamesModel.RASTER_SIZE; i++) {
      this.odds.push(this.serverOdds[i]);

      if (i === GamesModel.RASTER_SIZE - 1) {
        continue;
      }

      for (let n = 0; n < GamesModel.RASTER_SIZE; n++) {
        this.odds.push(this.serverOdds[GamesModel.RASTER_SIZE + offset + n]);
      }

      offset = offset + GamesModel.RASTER_SIZE;
    }
    Logger.info("Odds Set           :" + this.odds);
  }

  public getWinnerOdd(winIndex: number): number {
    return this.serverOdds[winIndex];
  }

  public getForcastOdd(winIndex: number, secondIndex: number): number {
    let odd: number = 0.0;
    let countSec = GamesModel.RASTER_SIZE;

    // Logger.debug("Get forcast odd, winIndex:" + winIndex + " secIndex:" + secondIndex);

    for (let i = 0; i < GamesModel.RASTER_SIZE; i++) {
      for (let n = 0; n < GamesModel.RASTER_SIZE; n++) {
        if (i === n) {
          // winbet
          continue;
        }

        if (i === winIndex && n === secondIndex) {
          odd = this.serverOdds[countSec];

          // Logger.debug("Server Ods Index:" + countSec);
          // Logger.debug("Odd:" + odd);

          break;
        }
        countSec++;
      }
    }

    return odd;
  }

  public abstract setServerData(data: IGameRoundData): void;

  public abstract setResultData(data: IGameRoundResultData, checkStatisticData?: boolean): void;

  public getHistoryDataFromResult(resultHistory: IBonusHistoryResultData[]): IJackpotHistory[] {
    const bonHistory: IJackpotHistory[] = [];

    for (const entry of resultHistory) {
      bonHistory.push({
        round: entry.round,
        id: entry.id,
        date: Util.formatDate(Util.getDatFromStandardShortString(entry.date), Languages.instance.getText("dateFormat")),
        time: entry.time,
        name: entry.name,
        amount: Util.formatValue(entry.amount, 2, LanguagesBase.commaSymbol),
        amountUnformated: entry.amount
      });
    }

    return bonHistory;
  }

  public getJackpotWinString(data: IGameRoundResultData): string | undefined {
    let curBonusText: string | undefined;

    if (data.jackpot !== null && data.jackpot !== undefined) {
      curBonusText = Languages.instance
        .getText("bonusWin")
        .replace("___WIN___", Logic.implementation.formatNumber(data.jackpot.amount, 2))
        .replace("___LOC___", data.jackpot.location.toUpperCase())
        .replace("___CUR___", data.jackpot.currency)
        .replace("___TICK___", data.jackpot.ticketId);
    }

    return curBonusText;
  }

  public getGameStartTime(): number {
    return this.roundInfo.videoStartUnix;
  }
}

export abstract class GameTimerBase {
  set gameLoopLength(value: number) {
    this._gameLoopLength = value;
  }
  get gameLoopStopped(): boolean {
    return this._gameLoopStopped;
  }
  protected timer!: NodeJS.Timeout;
  protected delayTimeout!: NodeJS.Timeout;
  protected logic: LogicImplementation;
  protected gameLoopSec: number = 0;
  protected videoStartSec: number = 0;
  protected videoRefSec: number = 0;
  protected lastVideoRefSec: number = 0;
  protected lastVideoChangeTimestamp = Date.now();
  protected lastTimeSetTimestamp = 0;
  protected syncGameLoopSecPrec = 0;
  protected syncVideoStartSecPrec = 0;
  protected lastServerTimeRequestTime: number = 0;
  protected timeRequestIntevall: number = 10; // interval of server time requests in secons
  protected syncEveryNth: number = 2; // every nth server time request will cause a synchronization of game loop with server time
  protected timeRquestNthCount: number = 0;
  public roundRequestDone = true;
  protected retryTimout!: NodeJS.Timeout;
  protected countInitInterval = 0;
  protected countRaceBreakReqestInterval = 0;
  protected isFirstSynch = true;
  protected receivedResultCheck: boolean = false;
  protected testCount: number;
  protected syncTimeout: number;
  protected setUpTimeout: number;
  protected _gameLoopLength: number;
  protected _gameVideoStartMs: number;
  protected readInterval: number;
  protected serverTimeUnix: number = 0;
  protected serverTimeUnixRequestTime: number = 0;
  private _gameLoopStopped = false;

  constructor(logic: LogicImplementation, syncTimeout: number, setUpTimeout: number, gameLoopLength: number, gameVideoStartMs: number, readInterval: number) {
    this.logic = logic;
    this.testCount = 0;
    this.syncTimeout = syncTimeout;
    this.setUpTimeout = setUpTimeout;
    this._gameLoopLength = gameLoopLength;
    this._gameVideoStartMs = gameVideoStartMs;
    this.readInterval = readInterval;
  }

  public async synchronizeGameLoop(setUp: boolean): Promise<number> {
    this.timeRquestNthCount = 1;

    // TODO TEST
    // if (this.gameLoopSec === 0) {
    //   Logger.debug("DDDDDDDDDDDDDDDDDDDDDDDDDDDD: delay synch 10 seconds");
    //   await Util.sleep(10000);
    // }

    let correctionTime: number = 0;

    const result: ISockServResponseMessageTime = await ServerSocketLogic.instance.sendTimeRequest();

    // TODO TEST
    // if (this.gameLoopSec > 90 && this.gameLoopSec < 110) {

    //   result.duration = 600;
    // }

    // TODO TEST
    // if (setUp && this.testCount < 2) {
    //   this.testCount++;
    //   result.duration = 20000;
    // }

    if (result.duration > this.syncTimeout && !setUp) {
      if (result.duration > 1000) {
        // send to server logs just if delay bigger than 1000ms
        const error = Errors.TIME_REQUEST_TO_LONG;
        error.message = "Time request lasted to long, no sync, duration:" + result.duration;
        ErrorHandler.instance.normalErrorHandler(error, false);
      } else {
        Logger.error("Time request lasted to long, no sync, duration:" + result.duration);
      }

      return -1;
    }

    if (setUp) {
      this._gameLoopStopped = false;
      correctionTime = result.duration / 2 / 1000;

      if (result.duration > this.setUpTimeout) {
        const error = Errors.TIME_REQUEST_TO_LONG;
        error.message = "Time request lasted to long, no sync, duration:" + result.duration;
        ErrorHandler.instance.normalErrorHandler(error, true);

        throw error;
      }
    }

    this.serverTimeUnix = result.serverTimeUnix + correctionTime;
    this.serverTimeUnixRequestTime = Date.now();

    clearInterval(this.timer); // clear intervall emedeatly, otherwithe tick can come double (interval short before new tick)

    if (setUp) {
      const checkCurGame = this.logic.getGamesModel().getCurrentGameData();
      if (checkCurGame.getGameStartTime() > this.serverTimeUnix * 1000) {
        const newGame = Util.deepCopy(checkCurGame);

        newGame.roundInfo.fullGameId = newGame.roundInfo.fullGameId.substr(0, newGame.roundInfo.fullGameId.length - 4) + "9999";
        newGame.roundInfo.gameId = 9999;
        newGame.roundInfo.raceNumber = "9999";
        newGame.roundInfo.videoStartUnix = newGame.roundInfo.videoStartUnix - 3600 * 1000 * 24 * 100;
        newGame.roundInfo.videoStartDt = Util.formatStandardUTCSecondsScince(newGame.roundInfo.videoStartUnix);
        newGame.roundInfo.videoEndUnix = newGame.roundInfo.videoEndUnix - 3600 * 1000 * 24 * 100;
        newGame.roundInfo.videoEndDt = Util.formatStandardUTCSecondsScince(newGame.roundInfo.videoEndUnix);
        newGame.roundInfo.raceStart = Util.formatDateFromUtcStandardDateString(newGame.roundInfo.videoStartDt, Languages.instance.getText("dateTimeFormat"));
        newGame.isDummyGame = true;

        this.logic.getGamesModel().getGamesList().push(newGame);
        this.logic.getGamesModel().addIndexCurrent(1);
      }
    }

    Logger.debug("Current Index:" + this.logic.getGamesModel().getIndexCurGame());

    const curGame = this.logic.getGamesModel().getCurrentGameData();
    const curGameIndex = this.logic.getGamesModel().getIndexCurGame();
    const curGameStart = curGame.getGameStartTime();

    Logger.info("Game start time:" + Util.formatStandardUTCSecondsScince(curGameStart) + "  secondssince:" + curGameStart);

    // get seconds in game loop
    this.gameLoopSec = result.serverTimeUnix + correctionTime - curGameStart / 1000; // correctionTime for request time from server to client
    this.syncGameLoopSecPrec = this.gameLoopSec;

    let restMSec = (this.gameLoopSec * 1000) % 1000;

    Logger.trace("synchloop: rest Mili Sec:" + restMSec);

    // set to entire seconds
    this.gameLoopSec = this.gameLoopSec - restMSec / 1000;

    if (this.gameLoopSec >= this._gameLoopLength) {
      // update index current game to real current game
      // and check if its last before a break in races
      const checkMaxInfo: ICheckMaxGameNumberResult = this.logic.getGamesModel().checkMaxGameNumberReached(true, result.serverTimeUnix + correctionTime);

      if (checkMaxInfo.updatedCurIndex) {
        // calculate game loop second with real current game
        const curGameNew = this.logic.getGamesModel().getCurrentGameData();
        const curGameStartNew = curGameNew.getGameStartTime();

        restMSec = this.setGameLoopSecondsByGameStart(result.serverTimeUnix, curGameStartNew, correctionTime);
      }

      if (checkMaxInfo.isRaceBreak) {
        Logger.info("Max race number Reached --> Race Breake");

        this.logic.getGamesModel().setRaceBreak(true);

        // Race video of last game is already finished --> show race break at start up
        if (this.gameLoopSec >= this._gameLoopLength - INTRO_VIDEO_LENGTH) {
          this.logic.getGamesModel().showRaceBreakAtStart = true;
        } else {
          // last race is running
          // last game before break has no result
          if (this.logic.getGamesModel().getCurrentGameData().result === null) {
            this.logic.getGamesModel().showRaceBreakAtStart = true;
            this.logic.getGamesModel().getCurrentGameData().gotNoResult = true;
          } else {
            // show race break at next intro
            if (!Logic.isStarted) {
              // when Logic not started would be shown immediately bay Logic
              // so set show after first can play received
              this.logic.getGamesModel().showRaceBreakAfterStartVideo = true;
            } else {
              this.logic.getGamesModel().showGamePauseView(false);
            }
          }
        }

        const checkReturn: INextGameWithinCheck = this.checkNextGameWithinGameLength();

        if (checkReturn.isWithin) {
          // next race is within a gamloop length

          // update loop values as if current game is running
          this.gameLoopSec = checkReturn.calcGameLoopSec;
          this.syncGameLoopSecPrec = this.gameLoopSec + restMSec / 1000;
          this.logic.getGamesModel().setRaceBreak(false);

          // intro for next race to start should already be shown
          if (this.gameLoopSec > this._gameLoopLength - INTRO_VIDEO_LENGTH) {
            this.logic.getGamesModel().showRaceBreakAtStart = false;
            this.logic.getGamesModel().showRaceBreakAfterStartVideo = false;
          }
        }
      } else {
        // not in race break

        if (this.gameLoopSec > this._gameLoopLength) {
          this.gameLoopSec -= this._gameLoopLength;

          if (setUp) {
            // at set up race must be started because current race from init has now shifted
            Logger.info("Race started at setup because time request to late!!!!!!!!!!!!!!!!!");
            this.logic.getGamesModel().raceStarted();
          }
        }
      }
    } else if (this.logic.getGamesModel().checkIfLastBeforeABreak(curGameIndex, this.serverTimeUnix * 1000)) {
      Logger.debug("Race breake no wrong second");

      this.logic.getGamesModel().setRaceBreak(true);

      // Race video of last game is already finished --> show race break
      if (this.gameLoopSec >= this._gameLoopLength - INTRO_VIDEO_LENGTH) {
        this.logic.getGamesModel().showRaceBreakAtStart = true;
      } else {
        if (!Logic.isStarted) {
          // when Logic not started would be shown immediately bay Logic
          // so set show after first can play received
          this.logic.getGamesModel().showRaceBreakAfterStartVideo = true;
        } else {
          this.logic.getGamesModel().showGamePauseView(false);
        }
      }
      // }
    } else {
      // current game has no result and video is in race/result view
      if (curGame.result === null && this.gameLoopSec < this._gameLoopLength - INTRO_VIDEO_LENGTH && setUp) {
        // get start time of next race
        if (curGameIndex > 0) {
          this.logic.getGamesModel().nextRaceStartTime = Util.formatDateFromUtcStandardDateString(
            this.logic.getGamesModel().getGamesList()[curGameIndex - 1].roundInfo.videoStartDt,
            Languages.instance.getText("dateFormatMin")
          );
        }

        // and show race break at start
        this.logic.getGamesModel().setRaceBreak(true);
        this.logic.getGamesModel().showRaceBreakAtStart = true;
        curGame.gotNoResult = true;
      }
    }

    // first tick at full second
    const nextSyncTimeout = 1000 - restMSec;

    // set Video seconds depending on game loop seconds

    this.syncVideoStartSecPrec = this.syncGameLoopSecPrec + Util.floatNumber(this._gameVideoStartMs / 1000, 3);

    Logger.trace("Video loop Seconds precise:" + this.syncVideoStartSecPrec);
    Logger.trace("Server Time Sync:" + Util.formatStandardDate(new Date(curGameStart + this.syncGameLoopSecPrec * 1000)));

    if (this.syncVideoStartSecPrec >= this._gameLoopLength) {
      this.syncVideoStartSecPrec -= this._gameLoopLength;
    }

    this.lastTimeSetTimestamp = Date.now();
    this.videoStartSec = Util.floatNumber(this.syncVideoStartSecPrec - restMSec / 1000, 3);
    if (this.isFirstSynch) {
      this.isFirstSynch = false;
      this.lastServerTimeRequestTime = this.gameLoopSec;
      // some offset to not synchronize on action timestamps
      if (this.gameLoopSec % 5 === 0) {
        this.lastServerTimeRequestTime += 2;
      }
    }

    Logger.trace("Corrected Video loop Seconds precise:" + this.syncVideoStartSecPrec);
    Logger.info("Synchronized game loop, gameLoopSec:" + this.gameLoopSec + " delay:" + nextSyncTimeout);
    Logger.trace("Video Start Second Precise:" + this.syncVideoStartSecPrec);
    Logger.trace("Video Start Second :" + this.videoStartSec);

    this.startIntervall(nextSyncTimeout, this.gameLoopSec);

    return this.videoStartSec;
  }

  private setGameLoopSecondsByGameStart(serverTimeUnix: number, curGameStart: number, correctionTime: number): number {
    Logger.info("Game start time:" + Util.formatStandardUTCSecondsScince(curGameStart) + "  secondssince:" + curGameStart);

    // get seconds in game loop
    this.gameLoopSec = serverTimeUnix + correctionTime - curGameStart / 1000; // correctionTime for request time from server to client
    this.syncGameLoopSecPrec = this.gameLoopSec;

    const restMSec = (this.gameLoopSec * 1000) % 1000;

    Logger.debug("synchloop: rest Mili Sec:" + restMSec);

    // set to entire seconds
    this.gameLoopSec = this.gameLoopSec - restMSec / 1000;

    return restMSec;
  }

  public startIntervall(delay: number, gameLoopSec: number) {
    Logger.info("Start game loop, gameLoopSec:" + gameLoopSec + " delay:" + delay);

    this.gameLoopSec = gameLoopSec;

    clearTimeout(this.delayTimeout);

    this.delayTimeout = setTimeout(() => {
      clearInterval(this.timer);
      // Logger.debug("Call Tick first");
      this.tick(); // first tick
      this.timer = setInterval(() => {
        // Logger.debug("Call Tick inter");
        this.tick();
      }, 1000); // and every second
    }, delay);
  }

  public async sendServerTimeReuqest() {
    this.timeRquestNthCount++;
    Logger.debug("TTTTTTTTTTTTTTTTT Time Request nth count:" + this.timeRquestNthCount++);
    try {
      const __result: ISockServResponseMessageTime = await ServerSocketLogic.instance.sendTimeRequest();
    } catch (error) {}
  }

  protected abstract tick(): void;

  public resetTimes() {
    // this.gameLoopSec = 0;
    this.videoStartSec = this.videoStartSec - GAME_LOOP_LENGTH;
    if (this.videoStartSec <= -1 || this.videoStartSec >= 1) {
      Logger.warn("Video Second was reseted to 0");
      this.videoStartSec = 0;
    }
    this.roundRequestDone = false;
    this.receivedResultCheck = false;
  }

  public stopGameLoop() {
    clearTimeout(this.delayTimeout);
    clearInterval(this.timer);
    clearTimeout(this.retryTimout);
    this._gameLoopStopped = true;
  }

  public checkNextGameWithinGameLength(): INextGameWithinCheck {
    let calcGameLoopSec = 0;

    if (this.logic.getGamesModel().getIndexCurGame() - 1 < 0) {
      return { isWithin: false, calcGameLoopSec };
    }

    Logger.debug("Next Start Unix:" + this.logic.getGamesModel().getNextGameData().roundInfo.videoStartUnix);

    const currentServerTime = this.logic.getGameTimer().getCurrentServerTimeUnix();
    const nextGameStart = this.logic.getGamesModel().getNextGameData().roundInfo.videoStartUnix;

    const secondsLeft = nextGameStart - currentServerTime;

    if (secondsLeft < this._gameLoopLength * 1000) {
      calcGameLoopSec = (currentServerTime - (nextGameStart - this._gameLoopLength * 1000)) / 1000;

      calcGameLoopSec = Math.floor(calcGameLoopSec);

      this.logic.getGamesModel().calculateHistoryData();

      Logger.debug("Calculated game loop second From Next Game:" + calcGameLoopSec);
      return { isWithin: true, calcGameLoopSec };
    } else {
      return { isWithin: false, calcGameLoopSec };
    }
  }

  public correctVideoStartSec(correction: number) {
    this.videoStartSec += correction;
    Logger.info("corrected Video Start Second:" + this.videoStartSec);
  }

  public getVideoSec(): number {
    return this.videoStartSec;
  }

  public getExactVideoSec(): number {
    return Util.floatNumber(this.videoStartSec + (Date.now() - this.lastTimeSetTimestamp) / 1000, 3);
  }

  public setGameVideoStartMs(value: number) {
    this._gameVideoStartMs = value;
  }

  public getCurrentServerTimeUnix(): number {
    const now = Date.now();

    Logger.debug("Get Current Server Time, now:" + now + " request Send:" + this.serverTimeUnixRequestTime + " last server unix Time:" + this.serverTimeUnix);
    Logger.debug("Current Server Time:" + (this.serverTimeUnix * 1000 + (now - this.serverTimeUnixRequestTime)));

    return this.serverTimeUnix * 1000 + (now - this.serverTimeUnixRequestTime);
  }
}
