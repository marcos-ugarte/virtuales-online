import { settings } from "./../../Logic/Logic";
import { oddScreenSettings } from "./../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { BottomBarKart } from "./BottomBarKart";
import { TopBarLeftKart } from "./TopBarLeftKart";
import { TrafficLightsKart } from "./TrafficLightsKart";
import { TrafficLightsTextKart } from "./TrafficLightsTextKart";
import { NextRaceBarKart } from "./NextRaceBarKart";
import { RaceTimeBarKart } from "./RaceTimeBarKart";
import { RaceInterval } from "./RaceIntervalItemKart";
import { RacingHistoryKart } from "./RacingHistoryKart";
import { BonusHistoryKart } from "./BonusHistoryKart";
import { DriverPresentationKart } from "./DriverPresentationKart";
import { TrackNameKart } from "./TrackNameKart";
import { TrackFactsKart } from "./TrackFactsKart";
import { TrackPresentationKart } from "./TrackPresentationKart";
import { FadeVideo } from "../common/FadeVideo";
import { WinnerItemKart } from "./WinnerItemKart";
import { BonusInfoBarKart } from "./BonusInfoBarKart";
import { AnimatedBonusBarKart } from "./AnimatedBonusBarKart";
import { OddsScreenKart } from "./OddsScreenKart";
import { RtcLogic } from "client/Rtc/RtcLogic";
import { _s, Logic } from "client/Logic/Logic";
import { IResult, IRaceInterval, IDriver, IRoundInfo, IRoundHistory, IJackpotHistory, ITrack, IColors, VideoState, IGameInfo } from "client/Logic/LogicDefinitions";
import { GameLength } from "common/Definitions";
import { FadeVideoKart } from "../common/FadeVideoKart";
import { SendPlanKart } from "./SendPlanKart";
import { PauseOverlay } from "../pauseOverlay/PauseOverlay";
import { mainElementPositionSizes } from "../../../../client/settings/OddsAlwaysOnSettings";

export class VideoScreenKart extends Group {
  // required
  public videoSprite?: PIXI.Sprite;
  public videoSprite2?: PIXI.Sprite;
  public fadeVideo: FadeVideo;
  public pauseOverlay: PauseOverlay;
  // game components
  public sendPlan: SendPlanKart;
  public bottomBar: BottomBarKart;
  public topBarLeft: TopBarLeftKart;
  public trafficLight: TrafficLightsKart;
  public trafficText: TrafficLightsTextKart;
  public nextRaceBar: NextRaceBarKart;
  public raceTimeBar: RaceTimeBarKart;
  public raceInterval: RaceInterval;
  public racingHistory: RacingHistoryKart;
  public bonusHistory: BonusHistoryKart;
  public driverPresentation: DriverPresentationKart;
  public trackName: TrackNameKart;
  public trackFacts: TrackFactsKart;
  public trackPresentation: TrackPresentationKart;
  public winnerItem: WinnerItemKart;
  public winnerItem21: WinnerItemKart;
  public winnerItem22: WinnerItemKart;
  public jackpotInfoBar: BonusInfoBarKart;
  public animatedBonusBar: AnimatedBonusBarKart;
  public oddsScreen: OddsScreenKart;
  public gameInfo: IGameInfo;
  public oddsAlwaysOn?: boolean;
  private language: string;

  public constructor(gameInfo: IGameInfo) {
    super();

    this.gameInfo = gameInfo;
    const { gameType, gameLength, videoLanguage: language } = gameInfo;

    const racerCount = Logic.getRacerCount(gameType);

    if (RtcLogic.instance.isProducer()) {
      this.videoSprite = new PIXI.Sprite();
      this.add(this.videoSprite);
    }

    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;

    this.sendPlan = new SendPlanKart(gameLength, this.oddsAlwaysOn);
    if (language === "it") this.add(this.sendPlan);
    this.language = language;
    this.oddsScreen = new OddsScreenKart(racerCount, gameLength, language, this.oddsAlwaysOn);
    this.add(this.oddsScreen);

    this.jackpotInfoBar = new BonusInfoBarKart();
    this.add(this.jackpotInfoBar);

    this.animatedBonusBar = new AnimatedBonusBarKart(gameLength, this.oddsAlwaysOn);
    this.add(this.animatedBonusBar);

    this.bottomBar = new BottomBarKart(racerCount, gameLength, language, this.oddsAlwaysOn);
    this.add(this.bottomBar);

    this.nextRaceBar = new NextRaceBarKart(gameLength, language, false, this.oddsAlwaysOn);
    this.add(this.nextRaceBar);

    this.raceTimeBar = new RaceTimeBarKart(gameType, gameLength, language);
    this.add(this.raceTimeBar);

    this.raceInterval = new RaceInterval();
    this.add(this.raceInterval);

    this.racingHistory = new RacingHistoryKart(racerCount, gameLength, this.oddsAlwaysOn);
    this.add(this.racingHistory);

    this.bonusHistory = new BonusHistoryKart(gameLength, this.oddsAlwaysOn);
    this.add(this.bonusHistory);

    this.driverPresentation = new DriverPresentationKart(racerCount, gameLength);
    if (!this.oddsAlwaysOn) this.add(this.driverPresentation);

    this.trackPresentation = new TrackPresentationKart(gameLength, this.oddsAlwaysOn);
    this.trackName = new TrackNameKart(gameLength, this.oddsAlwaysOn);
    this.trackFacts = new TrackFactsKart(gameLength, this.oddsAlwaysOn);

    if (gameLength > 120 || (this.oddsAlwaysOn && gameLength === 120 && !gameInfo.haveDbPot)) {
      this.add(this.trackPresentation);
      this.add(this.trackName);
      this.add(this.trackFacts);
    }

    this.winnerItem = new WinnerItemKart("Center", language);
    this.add(this.winnerItem);

    this.winnerItem21 = new WinnerItemKart("Left", language);
    this.add(this.winnerItem21);

    this.winnerItem22 = new WinnerItemKart("Right", language);
    this.add(this.winnerItem22);

    this.setWinnerAnims(gameLength);

    this.fadeVideo = new FadeVideo(new FadeVideoKart());
    this.add(this.fadeVideo);

    this.trafficLight = new TrafficLightsKart();
    this.add(this.trafficLight);

    this.trafficText = new TrafficLightsTextKart(gameLength);
    this.add(this.trafficText);

    this.topBarLeft = new TopBarLeftKart(gameInfo, false);
    this.add(this.topBarLeft);

    const fi = this.fadeVideo.fadeItems;
    if (fi) this.add(fi);

    this.pauseOverlay = new PauseOverlay(gameInfo);
    this.pauseOverlay.visible = false;
    this.add(this.pauseOverlay);
  }

  public async init() {
    await this.pauseOverlay.init();
  }

  private setWinnerAnims(gameLength: GameLength) {
    const raceLength = Logic.getRaceLength();
    this.winnerItem.setAnims([{ startTime: 51, duration: 3.5 }]);
    this.winnerItem21.setAnims([{ startTime: 55, duration: raceLength - 55 + 0.1 }]);
    this.winnerItem22.setAnims([{ startTime: 55.7, duration: raceLength - 55.7 + 0.1 }]);
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

    // this.videoSprite2.width = this.width * 0.5;
    // this.videoSprite2.height = this.height * 0.5;
    // this.driverSprite.position.x = (this.width - 300);
    // this.driverSprite.position.y = (this.height - 465);

    this.sendPlan.position.x = _s(230);
    this.sendPlan.position.y = _s(210);
    this.sendPlan.width = _s(815);
    this.sendPlan.height = _s(320);

    this.oddsScreen.position.x = _s(236);
    this.oddsScreen.position.y = _s(210);
    this.oddsScreen.width = this.width * 0.63;
    this.oddsScreen.height = this.height * 0.415;
    this.topBarLeft.setDefaultPos();
    const logoDisplaySize = this.topBarLeft.calcLogoDisplaySize();
    this.trafficLight.position.x = _s(463) + logoDisplaySize.width;
    this.trafficLight.position.y = this.topBarLeft.position.y;
    this.trafficLight.width = _s(297);
    this.trafficLight.height = _s(50);
    this.trafficText.position.x = this.trafficLight.position.x;
    this.trafficText.position.y = this.trafficLight.position.y;
    this.trafficText.width = this.trafficLight.width;
    this.trafficText.height = this.trafficLight.height;
    this.nextRaceBar.width = _s(310);
    this.nextRaceBar.height = _s(63);
    this.nextRaceBar.position.x = this.width - this.nextRaceBar.width - _s(8);
    this.nextRaceBar.position.y = _s(34);
    this.raceTimeBar.width = _s(226);
    this.raceTimeBar.height = _s(50);
    this.raceTimeBar.position.x = this.width - _s(266);
    this.raceTimeBar.position.y = _s(34);
    this.raceInterval.position.x = this.width - _s(293);
    this.raceInterval.position.y = _s(280);
    this.raceInterval.width = _s(226);
    this.raceInterval.height = _s(40);
    this.racingHistory.width = _s(890);
    this.racingHistory.height = _s(430);
    this.racingHistory.position.x = _s(195);
    this.racingHistory.position.y = _s(195);
    this.bonusHistory.width = _s(890);
    this.bonusHistory.height = _s(430);
    this.bonusHistory.position.x = _s(196);
    this.bonusHistory.position.y = _s(339);
    this.driverPresentation.position.x = _s(600);
    this.driverPresentation.position.y = _s(305);
    this.driverPresentation.width = _s(410);
    this.driverPresentation.height = _s(245);
    this.trackPresentation.position.x = 0;
    this.trackPresentation.position.y = 0;
    this.trackPresentation.width = this.width;
    this.trackPresentation.height = this.height;
    this.trackName.position.x = _s(0);
    this.trackName.position.y = _s(85);
    this.trackName.width = _s(200);
    this.trackName.height = _s(120);
    this.trackFacts.position.x = _s(1080);
    this.trackFacts.position.y = _s(550);
    this.trackFacts.width = _s(200);
    this.trackFacts.height = _s(170);
    this.winnerItem.position.x = _s(480);
    this.winnerItem.position.y = _s(370);
    this.winnerItem.width = _s(410);
    this.winnerItem.height = _s(250);
    this.winnerItem21.position.x = _s(165);
    this.winnerItem21.position.y = _s(280);
    this.winnerItem21.width = this.winnerItem.width;
    this.winnerItem21.height = this.winnerItem.height;
    this.winnerItem22.position.x = _s(735);
    this.winnerItem22.position.y = this.winnerItem21.position.y;
    this.winnerItem22.width = this.winnerItem.width;
    this.winnerItem22.height = this.winnerItem.height;
    this.jackpotInfoBar.width = _s(1000);
    this.jackpotInfoBar.height = _s(58);
    this.jackpotInfoBar.position.x = this.width * 0.5 - this.jackpotInfoBar.width * 0.5;
    this.jackpotInfoBar.position.y = _s(650) - this.jackpotInfoBar.height * 0.5;

    this.animatedBonusBar.width = _s(595);
    this.animatedBonusBar.height = _s(47);
    this.animatedBonusBar.position.x = _s(350);
    this.animatedBonusBar.position.y = _s(252) - this.animatedBonusBar.height * 0.5;
    if (this.oddsAlwaysOn) {
      const { oddsScreen, racingHistory, bonusHistory, animatedBonusBar, sendPlan } = mainElementPositionSizes["kart5" as keyof typeof mainElementPositionSizes];
      const { oddsScreenPosXTo, oddsScreenPosYTo, oddsScreenScaleTo } = oddScreenSettings["kart5" as keyof typeof oddScreenSettings];

      this.trackPresentation.position.x = _s(2);
      this.trackPresentation.position.y = _s(139);
      this.trackPresentation.width = _s(475);
      this.trackPresentation.height = _s(345);

      this.trackName.position.x = _s(0);
      this.trackName.position.y = _s(175);
      this.trackName.width = _s(81);
      this.trackName.height = _s(48);

      this.trackFacts.position.x = _s(350);
      this.trackFacts.position.y = _s(356);
      this.trackFacts.width = _s(113);
      this.trackFacts.height = _s(83);

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

      if (this.language === "it") {
        this.oddsScreen.container.scale.x = oddsScreenScaleTo;
        this.oddsScreen.container.scale.y = oddsScreenScaleTo;

        this.oddsScreen.position.x = _s(oddsScreenPosXTo);
        this.oddsScreen.position.y = _s(oddsScreenPosYTo);
      }
    }
  }

  public update(dt: number) {
    const fadeX = this.fadeVideo.updateFade(dt);
    Logic.fadeX = fadeX;
    super.update(dt);
  }

  private fillTrack(track: ITrack, withBonus: boolean) {
    this.trackPresentation.fill(track, withBonus);
    this.trackFacts.fill(track, withBonus);
    this.trackName.fill(track, withBonus);
  }

  private fillDriverInfos(round: IRoundInfo, drivers: IDriver[], odds: number[], history: IRoundHistory[], bonusHistory: IJackpotHistory[] | undefined, colors: IColors, withBonus: boolean) {
    this.oddsScreen.fill(drivers, odds, withBonus, colors);
    this.racingHistory.fill(history, drivers, withBonus);
    this.bonusHistory.fill(bonusHistory ? bonusHistory : [], withBonus);
    this.driverPresentation.fill(drivers, odds, withBonus);
    this.bottomBar.fill(drivers, colors, withBonus);
  }

  private fillRoundNumber(roundInfo: IRoundInfo, colors: IColors, language: string) {
    this.nextRaceBar.fill(roundInfo, language);
    this.raceTimeBar.fill(roundInfo);
    this.trafficText.fill();
    this.topBarLeft.fill();
  }

  // **** public methods called from outside ****
  public fillRound(round: IRoundInfo, drivers: IDriver[], odds: number[], history: IRoundHistory[], bonusHistory: IJackpotHistory[] | undefined, track: ITrack, colors: IColors) {
    const language = this.gameInfo.videoLanguage;
    // Logger.info("fillRound", JSON.stringify(round), JSON.stringify(drivers), JSON.stringify(odds));
    const withBonus = round.jackpotValue !== undefined;
    this.sendPlan.fill(round.sendPlan, round.raceNumber, round.raceStart);
    this.fillRoundNumber(round, colors, language);
    this.fillDriverInfos(round, drivers, odds, history, bonusHistory, colors, withBonus);
    this.animatedBonusBar.fill(round);
    this.fillTrack(track, withBonus);
  }

  public fillResult(track: ITrack, round: IRoundInfo, colors: IColors, result: IResult, intervals: IRaceInterval[], drivers: IDriver[], odds: number[]) {
    if (this.gameInfo.gameLength === 60) {
      const language = this.gameInfo.videoLanguage;

      this.sendPlan.fill(round.sendPlan, round.raceNumber, round.raceStart);
      this.fillRoundNumber(round, colors, language);
    }

    this.winnerItem.fill(result, drivers, odds);
    this.winnerItem21.fill(result, drivers, odds);
    this.winnerItem22.fill(result, drivers, odds);
    this.raceInterval.fill(intervals, drivers);
    this.raceTimeBar.fillRace(result);
    this.jackpotInfoBar.fill(result);
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
