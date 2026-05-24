import { dog63_6QuoteTimings, dog63QuoteTimings } from "./../../../settings/OddsAlwaysOnSettings";
import { Dog63Trio } from "./Intro/RacingHistory/Dog63Trio";
import { Dog63QuotesMiddle } from "./Intro/Dog63QuotesMiddle";
import { DiagonalFadeHelper } from "./../common/DiagonalFadeHelper";
import { Dog63Quotes3Side } from "./Intro/Dog63Quotes3Side";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { RtcLogic } from "client/Rtc/RtcLogic";
import { _s, Logic } from "client/Logic/Logic";
import {
  IRoundInfo,
  IDriver,
  IRoundHistory,
  IJackpotHistory,
  ITrack,
  IColors,
  IResult,
  IRaceInterval,
  VideoState,
  IGameInfo,
  IAnimInterval,
  IDog63RoundHistory,
  IDog63Suprimi,
  IDog63Quotes,
  IDog633rd,
  IDog63SuprimiEntry,
  IDog63QuoteInfo
} from "client/Logic/LogicDefinitions";
import { FadeVideo } from "../common/FadeVideo";
import { RaceBarDog } from "./../dog/RaceBarDog";
import { TopBarLeftDog } from "./../dog/TopBarLeftDog";
import { BonusInfoBarDog } from "./../dog/BonusInfoBarDog";
import { BonusHistoryDog } from "./../dog/BonusHistoryDog";
import { AnimatedBonusBarDog } from "./../dog/AnimatedBonusBarDog";
import { TrackPresentationDog } from "./../dog/TrackPresentationDog";
import { RaceIntervalsDog } from "./../dog/Race/RaceIntervalsDog";
import { GameType, GameLength } from "common/Definitions";
import { FadeVideoDog } from "../common/FadeVideoDog";
import { TopBarLeftInfoDog } from "./../dog/TopBarLeftInfoDog";
import { TopBarLeftLogoDog } from "./../dog/TopBarLeftLogoDog";
import { Logger } from "client/Logic/Logger";
import { SendPlan } from "./../dog/SendPlan";
import { PauseOverlay } from "../pauseOverlay/PauseOverlay";
import { Dog63Quotes } from "./Intro/Dog63Quotes";
import { Dog63RacingHistory } from "./Intro/Dog63RacingHistory";
import { Dog63Quotes3 } from "./Intro/Dog63Quotes3";
import { Dog63SuPrimi3 } from "./Intro/Dog63SuPrimi3";
import { Dog633rd } from "./Intro/Dog633rd";
import { Winners } from "./Race/Winners";
import { LayoutHelper } from "../Util/LayoutHelper";
import { WinnerDogBig } from "./Race/WinnerDogBig";
import { Dog63QuotesHelper } from "client/LogicImplementation/Dog63Quotes";
import { DogHelper } from "../dog/DogHelper";
import { OddsScreenDog } from "../dog/OddsScreenDog";
import { BottomBarDog } from "../dog/BottomBarDog";
import { Dog63SuPrimiSmall } from "./Intro/OddsAlwaysOn/Dog63SuPrimiSmall";
import { Dog63QuotesBottom } from "./Intro/Dog63QuotesBottom";

interface IExtendedAnimInterval extends IAnimInterval {
  isRight: boolean;
}

export enum oddsScreenMode {
  THREE_IN_THREE = 0,
  TWO_IN_TWO = 1,
  TWO_IN_THREE = 2
}
export class VideoScreenDog63 extends Group {
  // required
  public videoSprite?: PIXI.Sprite;
  public videoSprite2?: PIXI.Sprite;
  public fadeVideo: FadeVideo;
  public pauseOverlay: PauseOverlay;
  public racerCount: number;
  public gameInfo: IGameInfo;
  // game components
  public sendPlan: SendPlan;

  public raceBar: RaceBarDog;
  //public bottomBar: BottomBarDog;
  //public driverPresentation: DriverPresentationDog;
  public quotes: Dog63Quotes;
  public racingHistory: Dog63RacingHistory;
  public quotes3: Dog63Quotes3;
  public suprimi3: Dog63SuPrimi3;
  public dog633rd: Dog633rd;
  public topBarLeft: TopBarLeftDog;
  public topBarLeftInfo: TopBarLeftInfoDog;
  public topBarLeftLogo?: TopBarLeftLogoDog;
  public bonusInfoBar: BonusInfoBarDog;
  public bonusHistory: BonusHistoryDog;
  public animatedBonusBar: AnimatedBonusBarDog;
  public trackPresentation: TrackPresentationDog | undefined = undefined;
  public raceIntervals: RaceIntervalsDog;
  public winners: Winners;
  public winnerDogBig: WinnerDogBig;
  public oddsScreen: OddsScreenDog;
  public bottomBar: BottomBarDog;

  public threeInThree: Dog63SuPrimiSmall;
  public twoInTwo: Dog63SuPrimiSmall;
  public twoInThree: Dog63SuPrimiSmall;

  public quotesSide: Dog63Quotes3Side;
  public quotesMiddle: Dog63QuotesMiddle;
  public quotesBottom: Dog63QuotesBottom;

  private dogHelper: DogHelper;
  public oddsAlwaysOn = false;

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

    this.dogHelper = new DogHelper();

    const racerCount = Logic.getRacerCount(gameType);
    this.gameInfo = gameInfo;
    this.racerCount = racerCount;
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;

    if (RtcLogic.instance.isProducer()) {
      this.videoSprite = new PIXI.Sprite();
      this.add(this.videoSprite);
    }

    this.sendPlan = new SendPlan(gameInfo);
    if (gameInfo.videoLanguage === "it") this.add(this.sendPlan);

    this.oddsScreen = new OddsScreenDog(gameInfo);
    this.threeInThree = new Dog63SuPrimiSmall(oddsScreenMode.THREE_IN_THREE, gameLength);
    this.twoInTwo = new Dog63SuPrimiSmall(oddsScreenMode.TWO_IN_TWO, gameLength);
    this.twoInThree = new Dog63SuPrimiSmall(oddsScreenMode.TWO_IN_THREE, gameLength);

    this.quotesSide = new Dog63Quotes3Side(gameType, gameLength, true);
    this.quotesBottom = new Dog63QuotesBottom(this.oddsAlwaysOn);

    this.bottomBar = new BottomBarDog(gameInfo, this.dogHelper, this.oddsAlwaysOn);

    // this.racingHistory = new RacingHistoryDog(gameType, gameLength);
    // this.add(this.racingHistory);

    // this.driverPresentation = new DriverPresentationDog(gameType, gameLength);
    // this.add(this.driverPresentation);

    this.bonusInfoBar = new BonusInfoBarDog(gameType, gameLength);
    // this.add(this.bonusInfoBar);

    this.bonusHistory = new BonusHistoryDog(gameInfo, true); // MS TODO: WITH BONUS?
    this.add(this.bonusHistory);

    this.animatedBonusBar = new AnimatedBonusBarDog(gameInfo);
    this.add(this.animatedBonusBar);

    if (gameLength > 120) {
      this.trackPresentation = new TrackPresentationDog(gameInfo, this.dogHelper);
      this.add(this.trackPresentation);
    }

    this.quotes = new Dog63Quotes(gameType, gameLength);

    this.racingHistory = new Dog63RacingHistory(gameType, gameLength, gameInfo.videoLanguage, this.oddsAlwaysOn);
    this.add(this.racingHistory);

    this.quotes3 = new Dog63Quotes3(gameType, gameLength);

    this.suprimi3 = new Dog63SuPrimi3(gameType, gameLength);

    this.dog633rd = new Dog633rd(gameType, gameLength);

    this.quotesMiddle = new Dog63QuotesMiddle(this.oddsAlwaysOn);

    this.raceIntervals = new RaceIntervalsDog(gameType);
    this.add(this.raceIntervals);

    if (!this.oddsAlwaysOn) {
      this.add(this.quotes3);
      this.add(this.quotes);
      this.add(this.suprimi3);
      this.add(this.dog633rd);
    } else {
      this.add(this.threeInThree);
      this.add(this.twoInTwo);
      this.add(this.twoInThree);
      this.add(this.oddsScreen);
      this.add(this.quotesSide);
      this.add(this.quotesMiddle);
      this.add(this.quotesBottom);
      this.add(this.bottomBar);
    }
    // const winnerDogAnims = this.createWinnerDogAnims(gameType, gameInfo.gameLength);
    // const types = ["winner", "winner", "firstTwo"] as const;
    // for (let i = 0; i < 3; i++) {
    //   const winner = new WinnerDog(gameType, gameInfo.gameLength, winnerDogAnims[i], types[i], gameInfo.videoLanguage);
    //   this.winnerDogs.push(winner);
    //   this.add(winner);
    // }
    this.winnerDogBig = new WinnerDogBig(gameType, gameLength);
    this.add(this.winnerDogBig);
    this.winners = new Winners(gameType, gameLength);
    this.add(this.winners);

    this.fadeVideo = new FadeVideo(new FadeVideoDog(gameType));
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

    this.sendPlan.position.x = _s(268);
    this.sendPlan.position.y = _s(210);
    this.sendPlan.width = _s(815);
    this.sendPlan.height = _s(320);

    this.oddsScreen.position.x = _s(145);
    this.oddsScreen.position.y = _s(122);
    this.oddsScreen.width = this.width * 0.772;
    this.oddsScreen.height = this.height * 0.74;

    LayoutHelper.setScaledRectangle(this.quotes, 0, 0, 1280, 720);
    LayoutHelper.setScaledRectangle(this.racingHistory, 108, 133, 1063, 452);
    LayoutHelper.setScaledRectangle(this.quotes3, 0, 0, 13, 720);
    LayoutHelper.setScaledRectangle(this.suprimi3, 49, 105, 1280, 720);
    LayoutHelper.setScaledRectangle(this.dog633rd, 0, 0, 1280, 720);

    LayoutHelper.setScaledRectangle(this.threeInThree, 45, 110, 385, 390);
    LayoutHelper.setScaledRectangle(this.twoInTwo, 87, 110, 295, 393);
    LayoutHelper.setScaledRectangle(this.twoInThree, 87, 110, 295, 393);
    LayoutHelper.setScaledRectangle(this.quotesSide, 30, 110, 426, 390);
    LayoutHelper.setScaledRectangle(this.quotesMiddle, 144, 536, 995, 148);
    LayoutHelper.setScaledRectangle(this.quotesBottom, 490, 558, 580, 102);

    this.raceBar.width = _s(185);
    this.raceBar.height = _s(61);
    this.raceBar.position.x = this.width - this.raceBar.width - _s(8);
    this.raceBar.position.y = _s(7 / 2);

    this.topBarLeft.setDefaultPos(this.racerCount);
    if (this.topBarLeftLogo) {
      this.topBarLeftLogo.setDefaultPos(this.topBarLeft, this.gameInfo.gameType);
    }

    this.topBarLeftInfo.x = this.topBarLeft.getNextX(this.gameInfo.gameType); // might get overruled in update...
    this.topBarLeftInfo.height = this.topBarLeft.height;
    this.topBarLeftInfo.y = this.topBarLeft.y;
    this.topBarLeftInfo.width = _s(192);

    this.bonusInfoBar.width = _s(1000);
    this.bonusInfoBar.height = _s(58);
    this.bonusInfoBar.position.x = this.width * 0.5 - this.bonusInfoBar.width * 0.5;
    this.bonusInfoBar.position.y = _s(680) - this.bonusInfoBar.height * 0.5; // - _s(200);

    this.bonusHistory.width = _s(818);
    this.bonusHistory.height = _s(229);
    this.bonusHistory.position.x = _s(232);
    this.bonusHistory.position.y = _s(293);

    this.animatedBonusBar.width = _s(455);
    this.animatedBonusBar.height = _s(44);
    this.animatedBonusBar.position.x = _s(414);
    this.animatedBonusBar.position.y = _s(214); // - this.animatedBonusBar.height * 0.5;

    if (this.trackPresentation !== undefined) {
      this.trackPresentation.position.x = _s(358);
      this.trackPresentation.position.y = _s(167);
      this.trackPresentation.width = _s(563);
      this.trackPresentation.height = _s(443);
    }

    if (this.oddsAlwaysOn) {
      this.bonusHistory.width = _s(370);
      this.bonusHistory.height = _s(315);
      this.bonusHistory.position.x = _s(65);
      this.bonusHistory.position.y = _s(170);

      this.animatedBonusBar.width = _s(360);
      this.animatedBonusBar.height = _s(35);
      this.animatedBonusBar.position.x = _s(69);
      this.animatedBonusBar.position.y = _s(120); // -

      this.sendPlan.position.x = _s(80);
      this.sendPlan.position.y = _s(165);
      this.sendPlan.width = _s(340);
      this.sendPlan.height = _s(325);

      if (this.trackPresentation !== undefined) {
        this.trackPresentation.position.x = _s(43);
        this.trackPresentation.position.y = _s(178);
        this.trackPresentation.width = _s(574);
        this.trackPresentation.height = _s(445);
      }
    }

    this.raceIntervals.position.x = _s(1008);
    this.raceIntervals.position.y = _s(44);
    this.raceIntervals.width = _s(253);
    this.raceIntervals.height = _s(202);

    this.winnerDogBig.position.x = _s(224);
    this.winnerDogBig.position.y = _s(148);
    this.winnerDogBig.width = _s(470);
    this.winnerDogBig.height = _s(230);

    this.winners.position.x = _s(0);
    this.winners.position.y = _s(0);
    this.winners.width = this.width;
    this.winners.height = this.height;
  }

  public update(dt: number): void {
    const fadeX = this.fadeVideo.updateFade(dt);
    Logic.fadeX = fadeX;
    super.update(dt);

    if (this.topBarLeftLogo) {
      this.topBarLeftInfo.x = this.topBarLeftLogo.position.x + this.topBarLeftLogo.panel.calcContentWidth(1.0) + _s(3);
    }

    if (this.oddsAlwaysOn) {
      this.updateSideQuotes();
      this.updateMiddleQuotes();
      this.updateQuotesBottom();
    }
  }

  public updateSideQuotes() {
    const time = Logic.getVideoTime();

    let animArr = dog63QuoteTimings.side;
    if (this.gameInfo.currentIntroGameLength === 360) {
      animArr = dog63_6QuoteTimings.side;
    }

    const anim = Logic.getAnim(time, animArr, this.quotesSide);

    if (!anim) return (this.quotesSide.visible = false);
    this.quotesSide.visible = true;

    const baseFactor = time - anim.startTime;
    //this.visible = baseFactor >= 0 && baseFactor <= anim.duration;

    DiagonalFadeHelper.FadeDiagonal(this.quotesSide, baseFactor, anim.duration, 2, 0.5, 2, Logic.videoScreen.width, Logic.videoScreen.height);
  }

  public updateMiddleQuotes() {
    const time = Logic.getVideoTime();

    let animArr = dog63QuoteTimings.middle;
    if (this.gameInfo.currentIntroGameLength === 360) {
      animArr = dog63_6QuoteTimings.middle;
    }

    const anim = Logic.getAnim(time, animArr, this.quotesMiddle);

    if (!anim) return (this.quotesMiddle.visible = false);
    this.quotesMiddle.visible = true;

    const baseFactor = time - anim.startTime;
    //this.visible = baseFactor >= 0 && baseFactor <= anim.duration;
    DiagonalFadeHelper.FadeDiagonal(this.quotesMiddle, baseFactor, anim.duration, 2, 0.5, 2, Logic.videoScreen.width, Logic.videoScreen.height);
  }

  public updateQuotesBottom() {
    const time = Logic.getVideoTime();

    let animArr = dog63QuoteTimings.bottom;
    if (this.gameInfo.currentIntroGameLength === 360) {
      animArr = dog63_6QuoteTimings.bottom;
    }

    const anim = Logic.getAnim(time, animArr, this.quotesBottom);

    if (!anim) return (this.quotesBottom.visible = false);
    this.quotesBottom.visible = true;

    const baseFactor = time - anim.startTime;
    DiagonalFadeHelper.FadeDiagonal(this.quotesBottom, baseFactor, anim.duration, 2, 0.5, 2, Logic.videoScreen.width, Logic.videoScreen.height);
  }

  // **** public methods called from outside ****
  // general information for round should be filled
  public fillRound(roundInfo: IRoundInfo, drivers: IDriver[], odds: number[], history: IRoundHistory[], bonusHistory: IJackpotHistory[] | undefined, track: ITrack, colors: IColors): void {
    Logger.info("*** RoundInfo: " + roundInfo.gameId + "  J: " + roundInfo.jackpotValue);
    const language = this.gameInfo.videoLanguage;
    this.oddsScreen.fill(drivers, odds, colors, roundInfo.jackpotValue !== undefined);
    this.sendPlan.fill(roundInfo.sendPlan, roundInfo.raceNumber, roundInfo.raceStart);
    //this.oddsScreen.fill(drivers, odds, colors, roundInfo.jackpotValue !== undefined);
    this.raceBar.fill(roundInfo, language);
    this.bottomBar.fill(drivers, colors, roundInfo.jackpotValue !== undefined, language);
    //this.racingHistory.fill(history, drivers, roundInfo.jackpotValue !== undefined);
    this.topBarLeft.fill();
    //this.driverPresentation.fill(drivers, odds, roundInfo.jackpotValue !== undefined);
    this.bonusHistory.fill(bonusHistory ? bonusHistory : [], roundInfo.jackpotValue !== undefined);
    this.topBarLeftInfo.fill(roundInfo.jackpotValue !== undefined);
    // this.raceTimeBar.fill(roundInfo);
    this.animatedBonusBar.fill(roundInfo);
    if (this.trackPresentation !== undefined) {
      this.trackPresentation.fill(track, roundInfo.jackpotValue !== undefined);
    }
  }

  public fillRoundAdditional(
    roundInfo: IRoundInfo,
    driver: IDriver[],
    history: IDog63RoundHistory[],
    suprimi: IDog63Suprimi,
    quotes: IDog63Quotes,
    quotes3rd: IDog633rd,
    odds: number[],
    oddsSide: IDog63SuprimiEntry[][],
    oddsGridFirstTwoInOrder: boolean
  ): void {
    const withBonus = roundInfo.jackpotValue !== undefined;
    this.quotesSide.fill(driver, oddsSide); // TODO: FILL
    this.quotesMiddle.fill(quotes.middleEntries); // TODO: FILL
    this.quotesBottom.fill(quotes.bottomEntries); // TODO: FILL
    this.bottomBar.fillAdditionalInformation(quotes, driver);

    this.racingHistory.fill(history, driver, withBonus);
    this.suprimi3.fill(driver, suprimi, withBonus);
    this.twoInThree.fill(driver, suprimi, withBonus);
    this.twoInTwo.fill(driver, suprimi, withBonus);
    this.threeInThree.fill(driver, suprimi, withBonus);
    this.dog633rd.fill(driver, quotes3rd, withBonus);
    this.quotes3.fill(driver, odds, oddsSide, withBonus, oddsGridFirstTwoInOrder);
    this.quotes.fill(driver, quotes, withBonus);
  }

  // how is this called?
  // private fillDriverInfos(round: IRoundInfo, drivers: IDriver[], odds: number[], history: IHistory[], bonusHistory: IBonusHistory[] | undefined, colors: IColors, withBonus: boolean) {
  //   this.oddsScreen.fill(drivers, odds, colors);
  //   // this.racingHistory.fill(history, withBonus);
  //   // this.bonusHistory.fill(bonusHistory ? bonusHistory : [], withBonus);
  //   // this.driverPresentation.fill(drivers, odds);

  // }

  // information for race should be filled (race will sent before race starts...)
  public fillResult(track: ITrack, roundInfo: IRoundInfo, colors: IColors, result: IResult, intervals: IRaceInterval[], drivers: IDriver[], odds: number[]): void {
    // TODO: Start Position
    Logger.info("**** RoundInfo: " + roundInfo.gameId + "  J: " + roundInfo.jackpotValue + "  BT: " + result.roundBonusType);

    if (this.gameInfo.gameLength === 60) {
      const language = this.gameInfo.videoLanguage;

      this.sendPlan.fill(roundInfo.sendPlan, roundInfo.raceNumber, roundInfo.raceStart);
      this.raceBar.fill(roundInfo, language);
      this.topBarLeftInfo.fill(roundInfo.jackpotValue !== undefined);
    }

    this.raceIntervals.fill(track, intervals, drivers);

    // this.raceTimeBar.fillRace(result);
    this.bonusInfoBar.fill(result);

    this.raceBar.fillRace(result);

    const dog63Quotes = new Dog63QuotesHelper(odds);

    const first = result.first;
    const second = result.second;
    //const thirdIndex = result.third ? result.third : 0;
    const thirdTime = result.third ? result.third.time : "0";
    const driverIndexThird = result.third ? result.third.driverIndex : 0;
    const oddsForFirstDriver: IDog63QuoteInfo = { quote: odds[first.driverIndex], betCodeId: 1 };
    const oddsForSecondDriver: IDog63QuoteInfo = dog63Quotes.getSecondOddWithBetCodeId(result.second.driverIndex);
    let oddsForThirdDriver: IDog63QuoteInfo = { quote: 0, betCodeId: 14 };
    if (result.third) {
      oddsForThirdDriver = dog63Quotes.getThirdOddWithBetCodeId(result.third.driverIndex);
    }

    this.winners.fill(
      roundInfo.jackpotValue !== undefined,
      drivers,
      [first.driverIndex, second.driverIndex, driverIndexThird],
      [first.time, second.time, thirdTime],
      [
        [oddsForFirstDriver, dog63Quotes.getInFirstTwoWithBetId(first.driverIndex), dog63Quotes.getInFirstThreeWithBetId(first.driverIndex)],
        [oddsForSecondDriver, dog63Quotes.getInFirstTwoWithBetId(second.driverIndex), dog63Quotes.getInFirstThreeWithBetId(second.driverIndex)],
        [oddsForThirdDriver, dog63Quotes.getInFirstThreeWithBetId(driverIndexThird)]
      ],
      odds,
      first.driverIndex,
      result.second.driverIndex,
      driverIndexThird
    );

    {
      this.winnerDogBig.fill(false, first.driverIndex + 1, drivers[first.driverIndex], first.time, [oddsForFirstDriver]);
    }

    // this.winnerDogs[0].fill(result, drivers, odds);
    // this.winnerDogs[1].fill(result, drivers, odds);
    // this.winnerDogs[2].fill(result, drivers, odds);
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
