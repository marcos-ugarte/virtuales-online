import { settings } from "./../../Logic/Logic";
import { DriverInfoBarDog } from "./../dog/DriverInfoBarDog";
import * as PIXI from "pixi.js";
// import { OddsScreenDog } from "./OddsScreenDog";
// import { BottomBarDog } from "./BottomBarDog";
import { Group } from "client/Graphics/Group";
import { RtcLogic } from "client/Rtc/RtcLogic";
import { _s, Logic } from "client/Logic/Logic";
import { IRoundInfo, IDriver, IRoundHistory, IJackpotHistory, ITrack, IColors, IResult, IRaceInterval, VideoState, IGameInfo, IAnimInterval } from "client/Logic/LogicDefinitions";
import { FadeVideo } from "../common/FadeVideo";
import { Logger } from "client/Logic/Logger";
//import { SendPlan } from "./SendPlan";
import { PauseOverlay } from "../pauseOverlay/PauseOverlay";
import { FadeVideoHorse } from "../common/FadeVideoHorse";
import { OddsScreenDog } from "../dog/OddsScreenDog";
import { BottomBarDog } from "../dog/BottomBarDog";
import { TopBarLeftDog } from "../dog/TopBarLeftDog";
import { TopBarLeftInfoDog } from "../dog/TopBarLeftInfoDog";
import { TopBarLeftLogoDog } from "../dog/TopBarLeftLogoDog";
import { RaceBarDog } from "../dog/RaceBarDog";
import { RacingHistoryDog } from "../dog/RacingHistoryDog";
import { HorseHelper } from "./HorseHelper";
import { DriverPresentationDog } from "../dog/DriverPresentationDog";
import { TrackPresentationDog } from "../dog/TrackPresentationDog";
import { RaceIntroBottomBar } from "./race/RaceIntroBottomBar";
import { RaceIntervalsDog } from "../dog/Race/RaceIntervalsDog";
import { WinnerHorse } from "./race/WinnerHorse";
import { RaceElementPositions } from "../../../settings/RaceElementsSettings";
import { GameLength, GameType } from "common/Definitions";
import { BonusInfoBarDog } from "../dog/BonusInfoBarDog";
import { BonusHistoryDog } from "../dog/BonusHistoryDog";
import { AnimatedBonusBarDog } from "../dog/AnimatedBonusBarDog";
import { mainElementPositionSizes } from "../../../settings/OddsAlwaysOnSettings";
import { SendPlan } from "../dog/SendPlan";

interface IExtendedAnimInterval extends IAnimInterval {
  isRight: boolean;
}

export class VideoScreenHorse extends Group {
  // required
  public videoSprite?: PIXI.Sprite;
  public videoSprite2?: PIXI.Sprite;
  public fadeVideo: FadeVideo;
  public pauseOverlay: PauseOverlay;
  public racerCount: number;
  public gameInfo: IGameInfo;
  // game components
  public sendPlan: SendPlan;
  public oddsScreen: OddsScreenDog;
  public raceBar: RaceBarDog;
  public bottomBar: BottomBarDog;
  public racingHistory: RacingHistoryDog;
  public topBarLeft: TopBarLeftDog;
  public topBarLeftInfo: TopBarLeftInfoDog;
  public topBarLeftLogo?: TopBarLeftLogoDog;
  public driverPresentation: DriverPresentationDog;
  public driverInfoBar: DriverInfoBarDog;
  public bonusInfoBar: BonusInfoBarDog;
  public bonusHistory: BonusHistoryDog;
  public animatedBonusBar: AnimatedBonusBarDog;
  public trackPresentation: TrackPresentationDog | undefined = undefined;
  public raceIntervals: RaceIntervalsDog;
  public winnerDogs: WinnerHorse[] = [];
  public oddsAlwaysOn = false;

  public createWinnerDogAnims(finishStart: number): IExtendedAnimInterval[][] {
    return [
      [{ startTime: finishStart + 2.8, duration: 6.3, isRight: true }],
      [{ startTime: finishStart + 9.7, duration: Logic.getRaceLength(), isRight: false }],
      [{ startTime: finishStart + 9.7, duration: Logic.getRaceLength(), isRight: true }]
    ];
  }

  public raceIntro: RaceIntroBottomBar;

  // add game components here
  public constructor(gameInfo: IGameInfo) {
    super();

    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    const gameType = gameInfo.gameType;
    const gameLength = gameInfo.gameLength;
    const helper = new HorseHelper();

    const racerCount = Logic.getRacerCount(gameType);
    this.gameInfo = gameInfo;
    this.racerCount = racerCount;

    if (RtcLogic.instance.isProducer()) {
      this.videoSprite = new PIXI.Sprite();
      this.add(this.videoSprite);
    }

    this.oddsScreen = new OddsScreenDog(gameInfo);
    this.add(this.oddsScreen);

    this.bottomBar = new BottomBarDog(gameInfo, helper);
    this.add(this.bottomBar);

    this.racingHistory = new RacingHistoryDog(gameInfo, helper);
    this.add(this.racingHistory);

    this.driverPresentation = new DriverPresentationDog(gameInfo, helper);
    this.add(this.driverPresentation);

    this.driverInfoBar = new DriverInfoBarDog(gameInfo, helper);

    if (!this.oddsAlwaysOn) {
      this.add(this.driverInfoBar);
    }

    this.sendPlan = new SendPlan(gameInfo);
    if (gameInfo.videoLanguage === "it") {
      this.add(this.sendPlan);
    }

    this.bonusInfoBar = new BonusInfoBarDog(gameType, gameLength);
    this.add(this.bonusInfoBar);

    this.bonusHistory = new BonusHistoryDog(gameInfo, true); // MS TODO: WITH BONUS?
    this.add(this.bonusHistory);

    this.animatedBonusBar = new AnimatedBonusBarDog(gameInfo);
    this.add(this.animatedBonusBar);

    if (gameLength > 120) {
      this.trackPresentation = new TrackPresentationDog(gameInfo, helper);
      this.add(this.trackPresentation);
    }

    this.raceIntervals = new RaceIntervalsDog(gameType);
    this.add(this.raceIntervals);

    const winnerDogAnims = this.createWinnerDogAnims(0);
    const types = ["winner", "winner", "firstTwo"] as const;
    const screens = ["winnerJust", "Two", "Two"] as const;

    for (let i = 0; i < 3; i++) {
      const winner = new WinnerHorse(gameType, gameInfo.gameLength, winnerDogAnims[i], types[i], gameInfo.videoLanguage, screens[i]);
      this.winnerDogs.push(winner);
      this.add(winner);
    }

    this.raceIntro = new RaceIntroBottomBar();
    this.add(this.raceIntro);

    this.fadeVideo = new FadeVideo(new FadeVideoHorse(gameType));
    this.add(this.fadeVideo);

    this.raceBar = new RaceBarDog(gameType, gameLength, gameInfo.videoLanguage, false, this.oddsAlwaysOn);
    this.add(this.raceBar);

    this.topBarLeftInfo = new TopBarLeftInfoDog(gameType, gameLength, this.oddsAlwaysOn);
    this.add(this.topBarLeftInfo);

    if (gameInfo.companyLogo) {
      this.topBarLeftLogo = new TopBarLeftLogoDog(gameType, gameLength, false);
      this.topBarLeftLogo.fillLogo(gameInfo.companyLogo.image, gameInfo.companyLogo.color, gameInfo.companyLogo.color2);
      this.add(this.topBarLeftLogo);
    }

    this.topBarLeft = new TopBarLeftDog(gameInfo, false);
    this.add(this.topBarLeft);

    const fi = this.fadeVideo.fadeItems; // alles hinterm Wischer 20.4.2020
    if (fi) this.add(fi);

    this.pauseOverlay = new PauseOverlay(gameInfo);
    this.pauseOverlay.visible = false;
    this.add(this.pauseOverlay);
  }

  public async init(): Promise<void> {
    await this.pauseOverlay.init();
  }

  // position and resize when layout changes (usually on resize)
  public onLayout(): void {
    Logic.updateVideoSpriteSize();
    this.fadeVideo.position.x = _s(0);
    this.fadeVideo.position.y = _s(0);
    this.fadeVideo.width = this.width;
    this.fadeVideo.height = this.height;
    //this.fadeVideo.visible = false;

    this.pauseOverlay.position.x = _s(0);
    this.pauseOverlay.position.y = _s(0);
    this.pauseOverlay.width = this.width;
    this.pauseOverlay.height = this.height;

    this.oddsScreen.position.x = _s(280);
    this.oddsScreen.position.y = _s(151);
    this.oddsScreen.width = this.width * 0.63;
    this.oddsScreen.height = this.height * 0.415;

    this.raceBar.width = _s(185);
    this.raceBar.height = _s(61);
    this.raceBar.position.x = this.width - this.raceBar.width - _s(8);
    this.raceBar.position.y = _s(7 / 2);

    this.racingHistory.width = _s(819);
    this.racingHistory.height = _s(459);
    this.racingHistory.position.x = _s(230);
    this.racingHistory.position.y = _s(126);

    this.topBarLeft.setDefaultPos(this.racerCount);

    if (this.topBarLeftLogo) {
      this.topBarLeftLogo.setDefaultPos(this.topBarLeft, this.gameInfo.gameType);
    }

    this.topBarLeftInfo.x = this.topBarLeft.getNextX(this.gameInfo.gameType); // might get overruled in update...
    this.topBarLeftInfo.height = this.topBarLeft.height;
    this.topBarLeftInfo.y = this.topBarLeft.y;
    this.topBarLeftInfo.width = _s(192);

    this.driverPresentation.position.x = _s(620);
    this.driverPresentation.position.y = _s(208);
    this.driverPresentation.width = _s(263);
    this.driverPresentation.height = _s(392);

    this.sendPlan.position.x = _s(230);
    this.sendPlan.position.y = _s(210);
    this.sendPlan.width = _s(815);
    this.sendPlan.height = _s(320);

    this.driverInfoBar.position.x = _s(60);
    this.driverInfoBar.position.y = settings.screen.height - _s(80 + (this.gameInfo.useOverlays ? 0 : -9));
    this.driverInfoBar.width = settings.screen.width - _s(120);
    this.driverInfoBar.height = _s(25);

    this.bonusInfoBar.width = _s(1000);
    this.bonusInfoBar.height = _s(58);
    this.bonusInfoBar.position.x = this.width * 0.5 - this.bonusInfoBar.width * 0.5;
    this.bonusInfoBar.position.y = _s(680) - this.bonusInfoBar.height * 0.5; // - _s(200);

    this.bonusHistory.width = _s(818);
    this.bonusHistory.height = _s(229);
    this.bonusHistory.position.x = _s(232);
    this.bonusHistory.position.y = _s(293);

    // this.raceTimeBar.width = _s(226);
    // this.raceTimeBar.height = _s(50);
    // this.raceTimeBar.position.x = this.width - _s(266);
    // this.raceTimeBar.position.y = _s(34);

    this.animatedBonusBar.width = _s(455);
    this.animatedBonusBar.height = _s(44);
    this.animatedBonusBar.position.x = _s(414);
    this.animatedBonusBar.position.y = _s(214); // - this.animatedBonusBar.height * 0.5;

    //this.raceIntro.y = _s(470);
    if (this.oddsAlwaysOn) {
      const { oddsScreen, racingHistory, bonusHistory, sendPlan, animatedBonusBar } = this.getOddsAlwaysOnPositionsSizes();

      this.oddsScreen.position.x = _s(oddsScreen.x);
      this.oddsScreen.position.y = _s(oddsScreen.y);
      this.oddsScreen.width = _s(oddsScreen.width);
      this.oddsScreen.height = _s(oddsScreen.height);

      this.racingHistory.width = _s(racingHistory.width);
      this.racingHistory.height = _s(racingHistory.height);
      this.racingHistory.position.x = _s(racingHistory.x);
      this.racingHistory.position.y = _s(racingHistory.y);

      this.bonusHistory.width = _s(bonusHistory.width);
      this.bonusHistory.height = _s(bonusHistory.height);
      this.bonusHistory.position.x = _s(bonusHistory.x);
      this.bonusHistory.position.y = _s(bonusHistory.y);

      this.animatedBonusBar.width = _s(animatedBonusBar.width);
      this.animatedBonusBar.height = _s(animatedBonusBar.height);
      this.animatedBonusBar.position.x = _s(animatedBonusBar.x);
      this.animatedBonusBar.position.y = _s(animatedBonusBar.y);

      this.sendPlan.position.x = _s(sendPlan.x);
      this.sendPlan.position.y = _s(sendPlan.y);
      this.sendPlan.width = _s(sendPlan.width);
      this.sendPlan.height = _s(sendPlan.heigth);

      if (settings.languageId === "it") {
        this.oddsScreen.container.scale.x = 0.695;
        this.oddsScreen.container.scale.y = 0.695;
      }
    }

    if (this.trackPresentation !== undefined) {
      this.trackPresentation.position.x = _s(358);
      this.trackPresentation.position.y = _s(167);
      this.trackPresentation.width = _s(563);
      this.trackPresentation.height = _s(443);

      if (this.oddsAlwaysOn) {
        this.trackPresentation.position.x = _s(42);
        this.trackPresentation.position.y = _s(174);
        this.trackPresentation.width = _s(574);
        this.trackPresentation.height = _s(445);
      }
    }

    this.raceIntervals.position.x = _s(1008);
    this.raceIntervals.position.y = _s(44);
    this.raceIntervals.width = _s(253);
    this.raceIntervals.height = _s(202);

    const winnerDogSettings: any[] = [
      //{ x: 462, y: 260, width: 648, height: 296 },
      { x: 60, y: 155, width: 648, height: 296 },
      { x: 73, y: 167, width: 648, height: 296 },
      { x: 496, y: 223.5, width: 566, height: 274 }
    ];

    for (let i = 0; i < this.winnerDogs.length; i++) {
      this.winnerDogs[i].position.x = _s(RaceElementPositions.horse.winnerItems[i].x);
      this.winnerDogs[i].position.y = _s(RaceElementPositions.horse.winnerItems[i].y);
      this.winnerDogs[i].width = _s(RaceElementPositions.horse.winnerItems[i].width!);
      this.winnerDogs[i].height = _s(RaceElementPositions.horse.winnerItems[i].height!);
    }
  }

  public update(dt: number): void {
    const fadeX = this.fadeVideo.updateFade(dt);
    Logic.fadeX = fadeX;
    super.update(dt);
    if (this.topBarLeftLogo) {
      this.topBarLeftInfo.x = this.topBarLeftLogo.position.x + this.topBarLeftLogo.panel.calcContentWidth(1.0) + _s(3);
    }
  }

  private getOddsAlwaysOnPositionsSizes = () => {
    const gameType = this.gameInfo.gameType;
    return mainElementPositionSizes[gameType as keyof typeof mainElementPositionSizes];
  };

  // **** public methods called from outside ****
  // general information for round should be filled
  public fillRound(roundInfo: IRoundInfo, drivers: IDriver[], odds: number[], history: IRoundHistory[], bonusHistory: IJackpotHistory[] | undefined, track: ITrack, colors: IColors): void {
    Logger.info("*** RoundInfo: " + roundInfo.gameId + "  J: " + roundInfo.jackpotValue);
    const language = this.gameInfo.videoLanguage;

    this.sendPlan.fill(roundInfo.sendPlan, roundInfo.raceNumber, roundInfo.raceStart);
    this.oddsScreen.fill(drivers, odds, colors, roundInfo.jackpotValue !== undefined);
    this.raceBar.fill(roundInfo, language);
    this.bottomBar.fill(drivers, colors, roundInfo.jackpotValue !== undefined, language);
    this.racingHistory.fill(history, drivers, roundInfo.jackpotValue !== undefined);
    this.topBarLeft.fill();
    this.driverPresentation.fill(drivers, odds, roundInfo.jackpotValue !== undefined);
    this.driverInfoBar.fill(drivers, roundInfo.jackpotValue !== undefined);
    this.bonusHistory.fill(bonusHistory ? bonusHistory : [], roundInfo.jackpotValue !== undefined);
    this.topBarLeftInfo.fill(roundInfo.jackpotValue !== undefined);
    // this.raceTimeBar.fill(roundInfo);
    this.animatedBonusBar.fill(roundInfo);
    if (this.trackPresentation !== undefined) {
      this.trackPresentation.fill(track, roundInfo.jackpotValue !== undefined);
    }
  }

  private static getSeconds(time: string) {
    const arr = time.split(":");
    return +Number.parseInt(arr[0], 10) * 3600 + +Number.parseInt(arr[1], 10) * 60 + +Number.parseFloat(arr[2]);
  }

  // information for race should be filled (race will sent before race starts...)
  public fillResult(track: ITrack, roundInfo: IRoundInfo, colors: IColors, result: IResult, intervals: IRaceInterval[], drivers: IDriver[], odds: number[]): void {
    // TODO: Start Position
    Logger.info("**** RoundInfo: " + roundInfo.gameId + "  J: " + roundInfo.jackpotValue + "  BT: " + result.roundBonusType);
    this.raceIntervals.fill(track, intervals, drivers);

    // this.raceTimeBar.fillRace(result);
    this.bonusInfoBar.fill(result);

    // calculate the anim lengths
    const overlayStartFromServer = (result.overlayStart ? VideoScreenHorse.getSeconds(result.overlayStart) : 1.5) + 0.8;
    const overlayEndFromServer = result.overlayEnd ? VideoScreenHorse.getSeconds(result.overlayEnd) : 12.4; // overlayEndFromServer - overlayStartFromServer muss immer >= 5 sein - von Franz so vorgegeben
    const overlayStart = Math.max(0.0, overlayStartFromServer - 1.5);
    const overlayFadeInDuration = overlayStartFromServer >= 1.5 ? 1.5 : overlayStart;
    const overlayEndBegin = overlayEndFromServer;
    const overlayFadeOutDuration = 1.5;
    let offset = result.resultOffsetTime;
    if (typeof offset === "undefined") {
      offset = 60;
      Logger.error("Offset time not given for Horse game!!!");
    }

    this.topBarLeftInfo.setForceReplayStartTime(offset + 2, roundInfo.jackpotValue !== undefined);

    const winnerDogAnims = this.createWinnerDogAnims(offset);

    const switchTimeStart = (Logic.getRaceLength() - (offset + 11.0)) / 2.0;
    for (let i = 0; i < 3; i++) {
      this.winnerDogs[i].setAnims(winnerDogAnims[i], switchTimeStart);
    }

    this.raceIntro.fill(drivers, overlayStart, overlayFadeInDuration, overlayEndBegin, overlayFadeOutDuration);

    this.raceBar.fillRace(result, [offset + 1, offset + 7.55]);

    this.winnerDogs[0].fill(result, drivers, odds);
    this.winnerDogs[1].fill(result, drivers, odds);
    this.winnerDogs[2].fill(result, drivers, odds);
    this.raceIntro.fill(drivers, overlayStart, overlayFadeInDuration, overlayEndBegin, overlayFadeOutDuration);
    this.raceBar.fillRace(result, [offset + 1, offset + 7.55]);

    for (const winnerHorse of this.winnerDogs) {
      winnerHorse.fill(result, drivers, odds);
    }
  }

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
