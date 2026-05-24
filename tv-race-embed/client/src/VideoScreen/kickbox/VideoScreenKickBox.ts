import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { FadeVideo } from "../common/FadeVideo";
import { RtcLogic } from "client/Rtc/RtcLogic";
import { _s, Logic } from "client/Logic/Logic";
import {
  IResult,
  IRaceInterval,
  IDriver,
  IRoundInfo,
  IRoundHistory,
  IJackpotHistory,
  ITrack,
  IColors,
  VideoState,
  IGameInfo,
  IResultBet,
  IQuotes,
  IFightInfo,
  IFightHistoryRow,
  IBoxRingPresentationFact,
  IFightVideos
} from "client/Logic/LogicDefinitions";
import { GameLength } from "common/Definitions";
import { DriverPresentationFacts } from "./DriverPresentationFacts";
import { Rounds } from "./Rounds";
import { ResultBet } from "./ResultBet";
import { TopBarLeftKickBox } from "./TopBarLeftKickBox";
import { TopBarRightFightTime } from "./TopBarRightFightTime";
import { MiniDriverPresentationKickBox } from "./MiniDriverPresentationKickBox";
import { LayoutHelper } from "../Util/LayoutHelper";
import { RoundInfo } from "./race/RoundInfo";
import { FightResult } from "./race/FightResult";
import { FightHistory } from "./FightHistory";
import { BoxRingPresentation } from "./BoxRingPresentation";
import { WinningBet } from "./WinningBet";
import { RoundResultContainer } from "./race/RoundResultContainer";
import { FadeVideoKickBox } from "../common/FadeVideoKickBox";
import { FadeToResult } from "./race/FadeToResult";
import { TopBarRightRaceNumber } from "./TopBarRightRaceNumber";
import { FadeResultToRace } from "./race/FadeResultToRace";
import { PauseOverlay } from "../pauseOverlay/PauseOverlay";

export class VideoScreenKickBox extends Group {
  // required
  public videoSprite?: PIXI.Sprite;
  public videoSprite2?: PIXI.Sprite;
  public fadeVideo: FadeVideo;
  private fadeToResult: FadeToResult;
  private fadeResultToRace: FadeResultToRace;

  public pauseOverlay: PauseOverlay;

  // top bar
  public topBarLeft: TopBarLeftKickBox;
  public topBarRightRaceNumber: TopBarRightRaceNumber;
  public topBarRight: TopBarRightFightTime;

  public driverPresentationLeft: DriverPresentationFacts;
  public driverPresentationRight: DriverPresentationFacts;
  public driverPresentationRounds: Rounds;
  public driverPresentationWinningBet: WinningBet;

  public miniDriverPresentationLeft: MiniDriverPresentationKickBox;
  public miniDriverPresentationRight: MiniDriverPresentationKickBox;

  public resultBet: ResultBet;

  public history: FightHistory;
  public boxRingPresentation: BoxRingPresentation;

  public raceRoundInfo: RoundInfo;
  public raceRoundResult: RoundResultContainer;
  public fightResult: FightResult;

  //public wipeAnim: WipeAnim;

  public constructor(gameInfo: IGameInfo) {
    super();

    const { gameType, gameLength, videoLanguage: language } = gameInfo;

    //const racerCount = Logic.getRacerCount(gameType);

    if (RtcLogic.instance.isProducer()) {
      this.videoSprite = new PIXI.Sprite();
      this.add(this.videoSprite);
      this.videoSprite2 = new PIXI.Sprite();
      this.add(this.videoSprite2);
    }

    this.driverPresentationLeft = new DriverPresentationFacts(true);
    this.add(this.driverPresentationLeft);
    this.driverPresentationRight = new DriverPresentationFacts(false);
    this.add(this.driverPresentationRight);

    this.driverPresentationRounds = new Rounds();
    this.add(this.driverPresentationRounds);
    this.driverPresentationWinningBet = new WinningBet();
    this.add(this.driverPresentationWinningBet);

    this.miniDriverPresentationLeft = new MiniDriverPresentationKickBox(true);
    this.add(this.miniDriverPresentationLeft);
    this.miniDriverPresentationRight = new MiniDriverPresentationKickBox(false);
    this.add(this.miniDriverPresentationRight);

    this.resultBet = new ResultBet();
    this.add(this.resultBet);

    this.history = new FightHistory();
    this.add(this.history);

    this.boxRingPresentation = new BoxRingPresentation();
    this.add(this.boxRingPresentation);

    this.raceRoundResult = new RoundResultContainer();
    this.add(this.raceRoundResult);

    this.fightResult = new FightResult();
    this.add(this.fightResult);

    this.setWinnerAnims(gameLength);

    //const addDebugWipeAnim = false;
    //if (addDebugWipeAnim){
    // this.wipeAnim = new WipeAnim(true);ö
    // this.add(this.wipeAnim);
    //}

    this.fadeToResult = new FadeToResult();
    this.add(this.fadeToResult);

    this.fadeResultToRace = new FadeResultToRace();
    this.add(this.fadeResultToRace);

    this.topBarRight = new TopBarRightFightTime(
      gameType,
      gameLength,
      language,
      () => this.fadeVideo.isFading,
      () => this.fadeVideo.targetState
    );
    this.add(this.topBarRight);

    this.fadeVideo = new FadeVideo(new FadeVideoKickBox());
    this.add(this.fadeVideo);

    this.raceRoundInfo = new RoundInfo(
      () => this.fadeVideo.isFading,
      () => this.fadeVideo.targetState,
      () => this.fadeVideo.getFx()
    );
    this.add(this.raceRoundInfo);

    const fi = this.fadeVideo.fadeItems;
    if (fi) {
      this.add(fi);
    }

    // needs to be over fade
    this.topBarRightRaceNumber = new TopBarRightRaceNumber(
      gameType,
      gameLength,
      language,
      () => this.fadeVideo.isFading,
      () => this.fadeVideo.targetState
    );
    this.add(this.topBarRightRaceNumber);
    this.topBarLeft = new TopBarLeftKickBox(gameType, () => this.fadeVideo.isFading);
    this.add(this.topBarLeft);

    this.pauseOverlay = new PauseOverlay(gameInfo);
    this.pauseOverlay.visible = false;
    this.add(this.pauseOverlay);
  }

  public async init() {
    await this.pauseOverlay.init();
  }

  private setWinnerAnims(gameLength: GameLength) {
    //const raceLength = Logic.getRaceLength();
    // this.winnerItem.setAnims([{ startTime: 51, duration: 3.5 }]);
    // this.winnerItem21.setAnims([{ startTime: 55, duration: raceLength - 55 + 0.1 }]);
    // this.winnerItem22.setAnims([{ startTime: 55.7, duration: raceLength - 55.7 + 0.1 }]);
  }

  public onLayout() {
    Logic.updateVideoSpriteSize();
    this.fadeVideo.position.x = _s(0);
    this.fadeVideo.position.y = _s(0);
    this.fadeVideo.width = this.width;
    this.fadeVideo.height = this.height;

    this.pauseOverlay.position.x = _s(0);
    this.pauseOverlay.position.y = _s(0);
    this.pauseOverlay.width = this.width;
    this.pauseOverlay.height = this.height;

    LayoutHelper.setScaledRectangle(this.topBarLeft, 136, 44, 207, 16);
    LayoutHelper.setScaledRectangle(this.topBarRight, 984, 24, 253, 41);
    LayoutHelper.setScaledRectangle(this.topBarRightRaceNumber, 0, 0, 253, 41);

    LayoutHelper.setScaledRectangle(this.driverPresentationLeft, 226, 414, 398, 209);
    LayoutHelper.setScaledRectangle(this.driverPresentationRight, 1052 - 414, 414, 398, 209);

    LayoutHelper.setScaledRectangle(this.miniDriverPresentationLeft, 60, 457, 230, 186);
    LayoutHelper.setScaledRectangle(this.miniDriverPresentationRight, 987, 457, 230, 186);

    this.driverPresentationRounds.width = this.width;
    this.driverPresentationRounds.height = this.height;
    this.driverPresentationWinningBet.width = this.width;
    this.driverPresentationWinningBet.height = this.height;

    this.resultBet.width = this.width;
    this.resultBet.height = this.height;

    this.history.width = this.width;
    this.history.height = this.height;

    this.boxRingPresentation.width = this.width;
    this.boxRingPresentation.height = this.height;

    this.fightResult.width = this.width;
    this.fightResult.height = this.height;

    this.raceRoundResult.x = this.width / 2;
    this.raceRoundResult.y = this.height / 2;

    this.fadeToResult.width = this.width;
    this.fadeToResult.height = this.height;

    this.fadeResultToRace.width = this.width;
    this.fadeResultToRace.height = this.height;

    //LayoutHelper.setScaledRectangle(this.raceRoundResult, 148, 79, 795, 426);
    this.raceRoundInfo.width = this.width;
    this.raceRoundInfo.height = this.height;
    LayoutHelper.setScaledRectangle(this.raceRoundInfo, 36, 568, 797, 90);

    // if (this.wipeAnim)
    //   this.wipeAnim.onLayout();
  }

  public update(dt: number) {
    const fadeX = this.fadeVideo.updateFade(dt);
    Logic.fadeX = fadeX;
    super.update(dt);
  }

  private fillTrack(track: ITrack, withBonus: boolean) {
    // this.trackPresentation.fill(track, withBonus);
    // this.trackFacts.fill(track, withBonus);
    // this.trackName.fill(track, withBonus);
  }

  private fillDriverInfos(round: IRoundInfo, drivers: IDriver[], odds: number[], history: IRoundHistory[], bonusHistory: IJackpotHistory[] | undefined, colors: IColors, withBonus: boolean) {
    // this.oddsScreen.fill(drivers, odds, withBonus, colors);
    // this.racingHistory.fill(history, drivers, withBonus);
    // this.bonusHistory.fill(bonusHistory ? bonusHistory : [], withBonus);
    // this.driverPresentation.fill(drivers, odds, withBonus);
    // this.bottomBar.fill(drivers, colors, withBonus);
    this.driverPresentationLeft.fill(drivers[0]);
    this.driverPresentationRight.fill(drivers[1]);
    this.miniDriverPresentationLeft.fill(drivers[0]);
    this.miniDriverPresentationRight.fill(drivers[1]);
  }

  private fillRoundNumber(roundInfo: IRoundInfo, colors: IColors) {
    // this.nextRaceBar.fill(roundInfo, colors);
    // this.raceTimeBar.fill(roundInfo);
    this.topBarRight.fill(roundInfo);
    this.topBarRightRaceNumber.fill(roundInfo);
    // this.trafficText.fill();
    // this.topBarLeft.fill();
    this.topBarLeft.fill();
  }

  // **** public methods called from outside ****
  public fillRound(round: IRoundInfo, drivers: IDriver[], odds: number[], history: IRoundHistory[], bonusHistory: IJackpotHistory[] | undefined, track: ITrack, colors: IColors) {
    // Logger.info("fillRound", JSON.stringify(round), JSON.stringify(drivers), JSON.stringify(odds));
    const withBonus = round.jackpotValue !== undefined;
    //this.sendPlan.fill(round.sendPlan, round.raceNumber, round.raceStart);
    this.fillRoundNumber(round, colors);
    this.fillDriverInfos(round, drivers, odds, history, bonusHistory, colors, withBonus);
    //this.animatedBonusBar.fill(round);
    this.fillTrack(track, withBonus);
  }

  fillRoundAdditional(drivers: IDriver[], resultBet: IResultBet[][], fighterQuotes: IQuotes, fightHistory: IFightHistoryRow[], boxRingPresentationFacts: IBoxRingPresentationFact[]) {
    this.resultBet.fill(drivers, resultBet);
    this.driverPresentationRounds.fill("resultBet", drivers, fighterQuotes);
    this.driverPresentationWinningBet.fill("winBet", drivers, fighterQuotes);
    this.history.fill(drivers, fightHistory);
    this.boxRingPresentation.fill(drivers, boxRingPresentationFacts);
  }

  public fillResult(track: ITrack, round: IRoundInfo, colors: IColors, result: IResult, intervals: IRaceInterval[], drivers: IDriver[], odds: number[]) {
    this.topBarRightRaceNumber.fill(round);
    // this.winnerItem.fill(result, drivers, odds);
    // this.winnerItem21.fill(result, drivers, odds);
    // this.winnerItem22.fill(result, drivers, odds);
    // this.raceInterval.fill(intervals, drivers);
    // this.raceTimeBar.fillRace(result);
    // this.jackpotInfoBar.fill(result);

    // this.raceRoundInfo.fill();
    // this.raceRoundPause.fill();
    // this.raceRoundInfo.fill(drivers);
    // this.raceRoundResult.fill(drivers);
    // this.fightResult.fill(drivers);
  }

  fillAdditionalResult(drivers: IDriver[], fightResult: IFightInfo, videos: IFightVideos) {
    this.raceRoundInfo.fill(fightResult, drivers, videos);
    this.raceRoundResult.fill(fightResult, drivers);
    this.fightResult.fill(fightResult, drivers);
    this.fadeToResult.fill();
    this.fadeResultToRace.fill(videos);
  }

  public startFading(targetState: VideoState) {
    this.fadeVideo.startFading(targetState);
  }

  public stopFading() {
    this.fadeVideo.stopFading();
  }

  public fillIntroTexture(tex: PIXI.Texture | undefined) {
    this.fadeVideo.introTexture = tex;
  }

  public fillRaceTexture(tex: PIXI.Texture | undefined) {
    this.fadeVideo.raceTexture = tex;
  }
}
