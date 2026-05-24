import { IAnimInterval, IRouletteRoundHistory, IRouletteStats } from "./../../Logic/LogicDefinitions";
import { FadeVideoClassic } from "../common/C4/FadeVideoClassic";
import { HistoryBar } from "./../common/C4/HistoryBar";
import { RouletteBoard } from "./RouletteBoard";
import { TimerBar } from "./../common/C4/TimerBar";
import { RaceInfo } from "./../common/C4/RaceInfo";
import { TopInfoBar } from "./../common/C4/TopInfoBar";
import { Group } from "client/Graphics/Group";
import { Logger } from "client/Logic/Logger";
import { Logic, _s } from "client/Logic/Logic";
import { IGameInfo, IRoundInfo, VideoState } from "client/Logic/LogicDefinitions";
import { RtcLogic } from "client/Rtc/RtcLogic";
import * as PIXI from "pixi.js";
import { FadeVideo } from "../common/FadeVideo";
import { PauseOverlay } from "../pauseOverlay/PauseOverlay";
import { LastWinner } from "./LastWinner";
import { NumberStats } from "./NumberStats";
import { RaceInfoTimings } from "settings/C4Settings";

export class VideoScreenRouletteC4 extends Group {
  // required
  public videoSprite?: PIXI.Sprite;
  public videoSprite2?: PIXI.Sprite;
  public fadeVideo: FadeVideo;
  public pauseOverlay: PauseOverlay;
  public racerCount: number;
  public gameInfo: IGameInfo;

  // game components
  public topInfoBar: TopInfoBar;
  public prevRaceInfo: RaceInfo;
  public raceInfo: RaceInfo;
  public timerBar: TimerBar;
  public rouletteBoard: RouletteBoard;
  public historyBar: HistoryBar;
  public lastWinner: LastWinner;
  public numberStats: NumberStats;

  // add game components here
  public constructor(gameInfo: IGameInfo) {
    super();

    const gameType = gameInfo.gameType;
    const racerCount = Logic.getRacerCount(gameType);
    const raceInfoAnims = RaceInfoTimings.getAnim(Logic.getIntroLength(), gameType);

    this.gameInfo = gameInfo;
    this.racerCount = racerCount;

    if (RtcLogic.instance.isProducer()) {
      this.videoSprite = new PIXI.Sprite();
      this.add(this.videoSprite);
    }

    this.topInfoBar = new TopInfoBar(gameInfo);
    this.add(this.topInfoBar);

    this.timerBar = new TimerBar(gameInfo, "roulette");
    this.add(this.timerBar);

    this.rouletteBoard = new RouletteBoard(gameInfo);
    this.add(this.rouletteBoard);

    this.fadeVideo = new FadeVideo(new FadeVideoClassic(this.gameInfo.gameType));
    this.add(this.fadeVideo);

    this.historyBar = new HistoryBar(gameInfo, true);
    this.add(this.historyBar);

    this.lastWinner = new LastWinner(gameInfo);
    this.add(this.lastWinner);

    this.numberStats = new NumberStats(gameInfo);
    this.add(this.numberStats);

    this.prevRaceInfo = new RaceInfo(gameInfo, false, [raceInfoAnims[0]] as IAnimInterval[], true);
    this.add(this.prevRaceInfo);

    this.raceInfo = new RaceInfo(gameInfo, false, [raceInfoAnims[1]] as IAnimInterval[]);
    this.add(this.raceInfo);

    const fi = this.fadeVideo.fadeItems; // alles hinterm Wischer 20.4.2020
    if (fi) this.add(fi);

    this.pauseOverlay = new PauseOverlay(gameInfo);
    this.pauseOverlay.visible = false;
    this.add(this.pauseOverlay);
  }

  public async init(): Promise<void> {
    await this.lastWinner.init();
    await this.pauseOverlay.init();
    await this.numberStats.init();
    await this.rouletteBoard.init();
    await this.topInfoBar.init();
    await this.timerBar.init();
    await this.historyBar.init();
    await this.prevRaceInfo.init();
    await this.raceInfo.init();
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

  public fillLastRoundInfo(lastRoundInfo: IRoundInfo): void {
    if (lastRoundInfo.winningNumber !== undefined) this.lastWinner.fill(lastRoundInfo.winningNumber);
    this.prevRaceInfo.fill(lastRoundInfo);
  }

  // **** public methods called from outside ****
  // general information for round should be filled
  public fillRound(roundInfo: IRoundInfo, history: IRouletteRoundHistory[], rouletteStats: IRouletteStats): void {
    Logger.info("*** RoundInfo: ", roundInfo);
    this.raceInfo.fill(roundInfo);
    this.timerBar.fill();
    this.rouletteBoard.fill(roundInfo);
    this.numberStats.fill(roundInfo, rouletteStats);
    this.historyBar.fill(history, "history");
  }

  // information for race should be filled (race will sent before race starts...)
  public fillResult(): void {}

  // fading between intro and race...
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
