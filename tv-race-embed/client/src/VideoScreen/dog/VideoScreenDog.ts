import { settings } from "./../../Logic/Logic";
import { DriverInfoBarDog } from "./DriverInfoBarDog";
import * as PIXI from "pixi.js";
import { OddsScreenDog } from "./OddsScreenDog";
import { BottomBarDog } from "./BottomBarDog";
import { Group } from "client/Graphics/Group";
import { RtcLogic } from "client/Rtc/RtcLogic";
import { _s, Logic } from "client/Logic/Logic";
import { IAnimInterval, IColors, IDriver, IGameInfo, IJackpotHistory, IRaceInterval, IResult, IRoundHistory, IRoundInfo, ITrack, VideoState } from "client/Logic/LogicDefinitions";
import { FadeVideo } from "../common/FadeVideo";
import { RaceBarDog } from "./RaceBarDog";
import { DriverPresentationDog } from "./DriverPresentationDog";
import { RacingHistoryDog } from "./RacingHistoryDog";
import { TopBarLeftDog } from "./TopBarLeftDog";
import { BonusInfoBarDog } from "./BonusInfoBarDog";
import { BonusHistoryDog } from "./BonusHistoryDog";
import { AnimatedBonusBarDog } from "./AnimatedBonusBarDog";
import { TrackPresentationDog } from "./TrackPresentationDog";
import { RaceIntervalsDog } from "./Race/RaceIntervalsDog";
import { WinnerDog } from "./Race/WinnerDog";
import { GameLength, GameType } from "common/Definitions";
import { FadeVideoDog } from "../common/FadeVideoDog";
import { TopBarLeftInfoDog } from "./TopBarLeftInfoDog";
import { TopBarLeftLogoDog } from "./TopBarLeftLogoDog";
import { Logger } from "client/Logic/Logger";
import { SendPlan } from "./SendPlan";
import { PauseOverlay } from "../pauseOverlay/PauseOverlay";
import { DogHelper } from "./DogHelper";
import { mainElementPositionSizes, oddScreenSettings } from "../../../settings/OddsAlwaysOnSettings";
import { OddsUIDog } from "client/VideoScreen/dog/OddsUIDog";
import { TopBarRight } from "client/VideoScreen/dog/TopBarRight";
import { VideoRef } from "client/VideoScreen/VideoRef";
import { IRoundInfoEx } from "client/LogicImplementation/GamesModel";
import { FadeDurations } from "common/FadeDurations";

interface IExtendedAnimInterval extends IAnimInterval {
  isRight: boolean;
}

export class VideoScreenDog extends Group {
  // required
  public videoSprite?: PIXI.Sprite;
  public videoSprite2?: PIXI.Sprite;
  public fadeVideo: FadeVideo;
  public pauseOverlay: PauseOverlay;
  public racerCount: number;
  public gameInfo: IGameInfo;
  // game components
  public oddsUI: OddsUIDog | undefined;
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
  public topBarRight: TopBarRight | undefined = undefined;
  public trackPresentation: TrackPresentationDog | undefined = undefined;
  public raceIntervals: RaceIntervalsDog;
  public winnerDogs: WinnerDog[] = [];
  public oddsAlwaysOn = false;
  public raceStart: string | undefined;
  public raceStartUnix: number | undefined;

  public createWinnerDogAnims(gameType: GameType, gameLength: GameLength): IExtendedAnimInterval[][] {
    return [
      [{ startTime: 32.0, duration: 7.5, isRight: false }],
      [{ startTime: 40.5, duration: Logic.getRaceLength(), isRight: false }],
      [{ startTime: 40.5, duration: Logic.getRaceLength(), isRight: true }]
    ];
  }

  // add game components here
  public constructor(gameInfo: IGameInfo) {
    super();

    const gameType = gameInfo.gameType;
    const gameLength = gameInfo.gameLength;

    const dogHelper = new DogHelper();

    const racerCount = Logic.getRacerCount(gameType);
    this.gameInfo = gameInfo;

    this.oddsAlwaysOn = this.gameInfo.oddsAlwaysOn;
    this.racerCount = racerCount;

    if (RtcLogic.instance.isProducer()) {
      this.videoSprite = new PIXI.Sprite();
      this.add(this.videoSprite);
    }

    if (gameInfo.useOverlays) {
      this.topBarRight = new TopBarRight(gameInfo);
      this.add(this.topBarRight);
    }

    this.sendPlan = new SendPlan(gameInfo);
    if (gameInfo.videoLanguage === "it") this.add(this.sendPlan);

    this.racingHistory = new RacingHistoryDog(gameInfo, dogHelper);
    if (!settings.raceOnly) this.add(this.racingHistory);              // intro-phase, hidden in raceOnly

    this.driverPresentation = new DriverPresentationDog(gameInfo, dogHelper);
    if (!settings.raceOnly) this.add(this.driverPresentation);         // intro-phase

    this.driverInfoBar = new DriverInfoBarDog(gameInfo, dogHelper);
    if (!this.oddsAlwaysOn && !settings.raceOnly) {                    // intro-phase
      this.add(this.driverInfoBar);
    }

    this.bonusInfoBar = new BonusInfoBarDog(gameType, gameLength);
    this.add(this.bonusInfoBar);                                       // race-phase, keep

    this.bonusHistory = new BonusHistoryDog(gameInfo, true); // MS TODO: WITH BONUS?
    if (!settings.raceOnly) this.add(this.bonusHistory);               // intro-phase

    this.animatedBonusBar = new AnimatedBonusBarDog(gameInfo);
    this.add(this.animatedBonusBar);                                   // race-phase, keep (x2/x3 badge)

    if (gameInfo.useOverlays && !settings.raceOnly) {                  // intro-phase
      this.oddsUI = new OddsUIDog(gameType, gameLength, gameInfo.videoLanguage, gameInfo.oddsAlwaysOn);
      this.add(this.oddsUI);
    }

    if ((gameLength > 120 || (this.oddsAlwaysOn && gameLength === 120 && !gameInfo.haveDbPot)) && !settings.raceOnly) {
      this.trackPresentation = new TrackPresentationDog(gameInfo, dogHelper);   // intro-phase
      this.add(this.trackPresentation);
    }

    this.oddsScreen = new OddsScreenDog(gameInfo);
    if (!settings.raceOnly) this.add(this.oddsScreen);                 // intro-phase, hidden in raceOnly

    this.bottomBar = new BottomBarDog(gameInfo, dogHelper);
    if (!settings.raceOnly) this.add(this.bottomBar);                  // intro-phase

    this.raceIntervals = new RaceIntervalsDog(gameType);
    this.add(this.raceIntervals);

    const winnerDogAnims = this.createWinnerDogAnims(gameType, gameInfo.gameLength);
    const types = ["winner", "winner", "firstTwo"] as const;
    for (let i = 0; i < 3; i++) {
      const winner = new WinnerDog(gameType, gameInfo.gameLength, winnerDogAnims[i], types[i], gameInfo.videoLanguage);
      this.winnerDogs.push(winner);
      this.add(winner);
    }

    this.fadeVideo = new FadeVideo(new FadeVideoDog(gameType), gameInfo.useOverlays);
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
    // this.fadeVideo.visible = false;

    this.pauseOverlay.position.x = _s(0);
    this.pauseOverlay.position.y = _s(0);
    this.pauseOverlay.width = this.width;
    this.pauseOverlay.height = this.height;

    if (this.oddsUI) {
      this.oddsUI.position.x = _s(280);
      this.oddsUI.position.y = _s(151);
      this.oddsUI.width = this.width * 0.63;
      this.oddsUI.height = this.height * 0.415;
    }

    this.sendPlan.position.x = _s(230);
    this.sendPlan.position.y = _s(210);
    this.sendPlan.width = _s(815);
    this.sendPlan.height = _s(320);

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

    this.driverInfoBar.position.x = _s(60);
    this.driverInfoBar.position.y = settings.screen.height - _s(80 + (this.gameInfo.useOverlays ? 0 : -9));
    this.driverInfoBar.width = settings.screen.width - _s(120);
    this.driverInfoBar.height = _s(25);

    this.bonusInfoBar.width = _s(1000);
    this.bonusInfoBar.height = _s(58);
    this.bonusInfoBar.position.x = this.width * 0.5 - this.bonusInfoBar.width * 0.5;
    this.bonusInfoBar.position.y = _s(680) - this.bonusInfoBar.height * 0.5; // - _s(200);

    if (this.topBarRight) {
      this.topBarRight.position.x = _s(1040);
      this.topBarRight.position.y = _s(9);
      this.topBarRight.width = _s(200);
      this.topBarRight.height = _s(100);
    }

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

    if (this.trackPresentation !== undefined) {
      this.trackPresentation.position.x = _s(358);
      this.trackPresentation.position.y = _s(167);
      this.trackPresentation.width = _s(563);
      this.trackPresentation.height = _s(443);

      if (this.oddsAlwaysOn) {
        this.trackPresentation.position.x = _s(43);
        this.trackPresentation.position.y = _s(174);
        this.trackPresentation.width = _s(574);
        this.trackPresentation.height = _s(445);
      }
    }

    this.raceIntervals.position.x = _s(1008);
    this.raceIntervals.position.y = _s(44);
    this.raceIntervals.width = _s(253);
    this.raceIntervals.height = _s(202);
    if (this.oddsAlwaysOn) {
      const { oddsScreen, racingHistory, bonusHistory, animatedBonusBar, sendPlan } = this.getOddsAlwaysOnPositionsSizes();
      const { oddsScreenPosXTo, oddsScreenPosYTo, oddsScreenScaleTo } = oddScreenSettings[this.gameInfo.gameType as keyof typeof oddScreenSettings];

      if (this.oddsUI) {
        this.oddsUI.position.x = _s(oddsScreen.x);
        this.oddsUI.position.y = _s(oddsScreen.y);
        this.oddsUI.width = _s(oddsScreen.width);
        this.oddsUI.height = _s(oddsScreen.height);
      }

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
        if (this.oddsUI) {
          this.oddsUI.container.scale.x = oddsScreenScaleTo;
          this.oddsUI.container.scale.y = oddsScreenScaleTo;

          this.oddsUI.position.x = _s(oddsScreenPosXTo);
          this.oddsUI.position.y = _s(oddsScreenPosYTo);
        }

        this.oddsScreen.container.scale.x = oddsScreenScaleTo;
        this.oddsScreen.container.scale.y = oddsScreenScaleTo;

        this.oddsScreen.position.x = _s(oddsScreenPosXTo);
        this.oddsScreen.position.y = _s(oddsScreenPosYTo);
      }
    }

    const winnerDogSettings: { x: number; y: number; height: number; width: number }[] = [
      { x: 62, y: 152, width: 648, height: 296 },
      { x: 62, y: 152, width: 648, height: 296 },
      { x: 485, y: 208.5, width: 566, height: 274 }
    ];

    for (let i = 0; i < this.winnerDogs.length; i++) {
      this.winnerDogs[i].position.x = _s(winnerDogSettings[i].x);
      this.winnerDogs[i].position.y = _s(winnerDogSettings[i].y);
      this.winnerDogs[i].width = _s(winnerDogSettings[i].width);
      this.winnerDogs[i].height = _s(winnerDogSettings[i].height);
    }
  }

  public update(dt: number): void {
    const fadeX = this.fadeVideo.updateFade(dt);
    Logic.fadeX = fadeX;
    super.update(dt);

    if (
      Logic.getState() !== VideoState.Race &&
      this.gameInfo.gameType === "dog6" &&
      this.raceStartUnix &&
      Logic.getExactTimeUntilRace(this.raceStartUnix) + Logic.showZeroTime(this.gameInfo.gameType) <= 0
    ) {
      Logic.fadeToRace();
    }
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
  public fillRound(
    roundInfo: IRoundInfoEx | IRoundInfo,
    drivers: IDriver[],
    odds: number[],
    history: IRoundHistory[],
    bonusHistory: IJackpotHistory[] | undefined,
    track: ITrack,
    colors: IColors
  ): void {
    Logger.info("*** RoundInfo: " + roundInfo.gameId + "  J: " + roundInfo.jackpotValue);
    const language = this.gameInfo.videoLanguage;
    this.raceStart = roundInfo.raceStart;
    this.raceStartUnix = "videoStartUnix" in roundInfo ? roundInfo.videoStartUnix : undefined;

    if (this.oddsUI) this.oddsUI.fill(drivers, roundInfo.jackpotValue !== undefined);

    this.sendPlan.fill(roundInfo.sendPlan, roundInfo.raceNumber, roundInfo.raceStart);
    this.oddsScreen.fill(drivers, odds, colors, roundInfo.jackpotValue !== undefined);
    this.raceBar.fill(roundInfo, language, this.raceStartUnix);
    this.bottomBar.fill(drivers, colors, roundInfo.jackpotValue !== undefined, language);
    this.racingHistory.fill(history, drivers, roundInfo.jackpotValue !== undefined);
    this.topBarLeft.fill();
    if (this.topBarRight) this.topBarRight.fill(roundInfo.jackpotValue !== undefined, this.raceStartUnix);
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

  // information for race should be filled (race will sent before race starts...)
  public fillResult(track: ITrack, roundInfo: IRoundInfo, colors: IColors, result: IResult, intervals: IRaceInterval[], drivers: IDriver[], odds: number[]): void {
    // TODO: Start Position
    Logger.info("**** RoundInfo: " + roundInfo.gameId + "  J: " + roundInfo.jackpotValue + "  BT: " + result.roundBonusType);

    if (this.gameInfo.gameLength === 60) {
      const language = this.gameInfo.videoLanguage;

      this.sendPlan.fill(roundInfo.sendPlan, roundInfo.raceNumber, roundInfo.raceStart);
      this.raceBar.fill(roundInfo, language);
      this.topBarLeftInfo.fill(roundInfo.jackpotValue !== undefined);
    } else {
      this.raceBar.fillRace(result);
    }

    this.raceIntervals.fill(track, intervals, drivers);

    // this.raceTimeBar.fillRace(result);
    this.bonusInfoBar.fill(result);

    this.winnerDogs[0].fill(result, drivers, odds);
    this.winnerDogs[1].fill(result, drivers, odds);
    this.winnerDogs[2].fill(result, drivers, odds);
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
