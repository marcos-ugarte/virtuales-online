import { Group } from "client/Graphics/Group";
import { Logger } from "client/Logic/Logger";
import { Logic, _s } from "client/Logic/Logic";
import { IAnimInterval, IColors, IGameInfo, IHorseC4Bonus, IResult, IRoundHistory, IRoundInfo, VideoState } from "client/Logic/LogicDefinitions";
import { RtcLogic } from "client/Rtc/RtcLogic";
import { FadeVideoClassic } from "client/VideoScreen/common/C4/FadeVideoClassic";
import * as PIXI from "pixi.js";
import { HistoryBar } from "../common/C4/HistoryBar";
import { RaceInfo } from "../common/C4/RaceInfo";
import { TimerBar } from "../common/C4/TimerBar";
import { TopInfoBar } from "../common/C4/TopInfoBar";
import { FadeVideo } from "../common/FadeVideo";
import { TrackPresentationDog } from "../dog/TrackPresentationDog";
import { PauseOverlay } from "../pauseOverlay/PauseOverlay";
import { BottomBarC4 } from "./BottomBarC4";
import { QuotesGrid } from "./QuotesC4";
import { ResultsC4 } from "./ResultsC4";
import { RaceIntroBottomBar } from "./race/RaceIntroBottomBar";
import { WinnerHorse } from "./race/WinnerHorse";
import { BonusBarC4 } from "./BonusBarC4";
import { RaceInfoTimings } from "settings/C4Settings";

export class VideoScreenHorseC4 extends Group {
  private prevGameLength = 15;
  private gameLength = Logic.getIntroEndTime() - this.prevGameLength;

  // required
  public videoSprite?: PIXI.Sprite;
  public videoSprite2?: PIXI.Sprite;
  public fadeVideo: FadeVideo;
  public pauseOverlay: PauseOverlay;
  public racerCount: number;
  public gameInfo: IGameInfo;

  // game components
  public bottomBarC4: BottomBarC4;
  public bonusBar: BonusBarC4;
  public topInfoBar: TopInfoBar;
  public prevRaceInfo: RaceInfo;
  public raceInfo: RaceInfo;
  public historyBar: HistoryBar;
  public quotesGrid: QuotesGrid;
  public timerBar: TimerBar;
  public resultsGrid: ResultsC4;

  public trackPresentation: TrackPresentationDog | undefined = undefined;
  public winnerDogs: WinnerHorse[] = [];
  public raceIntro: RaceIntroBottomBar;

  // add game components here
  public constructor(gameInfo: IGameInfo) {
    super();
    const withBonus = gameInfo.haveDbPot;
    const gameType = gameInfo.gameType;
    const racerCount = Logic.getRacerCount(gameType);
    const raceInfoAnims = RaceInfoTimings.getAnim(Logic.getIntroLength(), gameType);

    this.gameInfo = gameInfo;
    this.racerCount = racerCount;

    if (RtcLogic.instance.isProducer()) {
      this.videoSprite = new PIXI.Sprite();
      this.add(this.videoSprite);
    }

    this.topInfoBar = new TopInfoBar(gameInfo, withBonus);
    this.add(this.topInfoBar);

    this.bottomBarC4 = new BottomBarC4(gameInfo);
    this.add(this.bottomBarC4);

    this.bonusBar = new BonusBarC4(0, Logic.getIntroEndTime(), true, true, withBonus);
    this.add(this.bonusBar);

    this.historyBar = new HistoryBar(gameInfo, true);
    this.historyBar.anims = [{ startTime: 0, duration: Logic.getIntroEndTime() }];
    this.add(this.historyBar);

    this.prevRaceInfo = new RaceInfo(gameInfo, withBonus, [raceInfoAnims[0]] as IAnimInterval[], true);
    this.add(this.prevRaceInfo);

    this.raceInfo = new RaceInfo(gameInfo, withBonus, [raceInfoAnims[1]] as IAnimInterval[]);
    this.add(this.raceInfo);

    this.quotesGrid = new QuotesGrid(gameInfo);
    this.quotesGrid.anims = [{ startTime: this.prevGameLength, duration: this.gameLength }];
    this.add(this.quotesGrid);

    this.timerBar = new TimerBar(gameInfo, gameType, withBonus ? true : false);
    this.add(this.timerBar);

    this.raceIntro = new RaceIntroBottomBar();
    this.add(this.raceIntro);

    this.fadeVideo = new FadeVideo(new FadeVideoClassic(this.gameInfo.gameType));
    this.add(this.fadeVideo);

    this.resultsGrid = new ResultsC4(gameInfo);
    this.resultsGrid.anims = [{ startTime: 0, duration: this.prevGameLength }];
    this.add(this.resultsGrid);

    const fi = this.fadeVideo.fadeItems; // alles hinterm Wischer 20.4.2020
    if (fi) this.add(fi);

    this.pauseOverlay = new PauseOverlay(gameInfo);
    this.pauseOverlay.visible = false;
    this.add(this.pauseOverlay);
  }

  public async init(): Promise<void> {
    await this.pauseOverlay.init();
    await this.topInfoBar.init();
    await this.prevRaceInfo.init();
    await this.raceInfo.init();
    await this.historyBar.init();
    await this.timerBar.init();
    await this.quotesGrid.init();
    await this.resultsGrid.init();
  }

  // position and resize when layout changes (usually on resize)
  public onLayout(): void {
    Logic.updateVideoSpriteSize();
    this.fadeVideo.position.x = _s(0);
    this.fadeVideo.position.y = _s(0);
    this.fadeVideo.width = this.width;
    this.fadeVideo.height = this.height;

    this.pauseOverlay.position.x = _s(0);
    this.pauseOverlay.position.y = _s(0);
    this.pauseOverlay.width = this.width;
    this.pauseOverlay.height = this.height;
  }

  public update(dt: number): void {
    const fadeX = this.fadeVideo.updateFade(dt);
    Logic.fadeX = fadeX;
    super.update(dt);
  }

  // **** public methods called from outside ****
  // general information for previous round should be filled
  public fillPrevRound(roundInfo: IRoundInfo): void {
    this.prevRaceInfo.fill(roundInfo);
  }

  // **** public methods called from outside ****
  // general information for round should be filled
  public fillRound(roundInfo: IRoundInfo, odds: number[], colors: IColors, history: IRoundHistory[], bonus: IHorseC4Bonus): void {
    Logger.info("*** RoundInfo: " + roundInfo.gameId + "  J: " + roundInfo.jackpotValue);
    this.raceInfo.fill(roundInfo);
    this.bottomBarC4.fill(roundInfo, bonus, colors);
    this.bonusBar.fill(roundInfo, colors);
    this.historyBar.fill(history, "history");
    this.quotesGrid.fill(odds, colors);
  }

  public fillLastRoundResult(result: IResult): void {
    this.resultsGrid.fill(result.first, result.second, result.roundBonusType);
  }

  public fillResult(result: IResult): void {
    this.topInfoBar.fillRace(result);
  }

  public startFading(targetState: VideoState): void {
    this.fadeVideo.startFading(targetState);
  }

  public stopFading(): void {
    this.fadeVideo.stopFading();
  }

  public fillIntroTexture(tex: PIXI.Texture | undefined): void {
    this.fadeVideo.introTexture = tex;
  }

  public fillRaceTexture(tex: PIXI.Texture | undefined): void {
    this.fadeVideo.raceTexture = tex;
  }
}
