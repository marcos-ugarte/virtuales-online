import { dummyModelDog6 } from "./DummyModelDog6";
import { dummyModelDog63 } from "./DummyModelDog63";
import { dummyModelDog6C4 } from "./DummyModelDog6C4";
import { dummyModelDog8 } from "./DummyModelDog8";
import { dummyModelHorse } from "./DummyModelHorse";
import { dummyModelHorseC4 } from "./DummyModelHorseC4";
import { dummyModelKart5 } from "./DummyModelKart5";
//import { dummyModelKickBox } from "./dummyModelKickBox";
import { dummyModelKickBox } from "./dummyModelKickBox8";
import { dummyModelRouletteC4 } from "./DummyModelRouletteC4";
import { dummyModelSulky } from "./DummyModelSulky";
import { CompanyLogo, IHorseDog6C4Model, IRouletteModel } from "../Logic/LogicDefinitions";
import fightResultHexUrl from "assets/kickbox/roundresult_hexagon.png";
import resultBackgroundImageUrl from "client/assets/kickbox/Round_Result_Stilframe_Start.png";
import headerImageUrl from "client/assets/kickbox/WGP_Header.png";
import inFightImageUrl from "client/assets/kickbox/WGP_Infight_Display.png";
import inFightImageBigUrl from "client/assets/kickbox/WGP_Overlay_edBG_Big.png";
import wipeBackgroundImageUrl from "client/assets/kickbox/WipeBackground.png";
import dogLogo from "client/assets/logos/dog_logo.png";
import dogLogoBackground from "client/assets/logos/dog_logo_bg.png";
import dogLogoText from "client/assets/logos/dog_text.png";
import horseLogo from "client/assets/logos/horse_logo.png";
import horseLogoBackground from "client/assets/logos/horse_logo_bg.png";
import horseLogoText from "client/assets/logos/horse_text.png";
import logo from "client/assets/logos/roulette_logo.png";
import logoBackground from "client/assets/logos/roulette_logo_bg.png";
import logoText from "client/assets/logos/roulette_text.png";
import { Logger } from "client/Logic/Logger";
import { Logic, settings } from "client/Logic/Logic";
import { IVideoUrls, LogicBase } from "client/Logic/LogicBase";
import { IFightInfo, IFightVideo, IFightVideos, IGameInfo, IHit, ILogicImplementation, IModel, VideoState, VideoUrlInfo } from "client/Logic/LogicDefinitions";
import { GAME_LOOP_LENGTH } from "client/LogicImplementation/LogicImplementation";
import { VideoScreenDog63 } from "client/VideoScreen/dog63/VideoScreenDog63";
import { VideoScreenHorseC4 } from "client/VideoScreen/horseDog6C4/VideoScreenHorseDog6C4";
import { KickboxHelper } from "client/VideoScreen/kickbox/KickboxHelper";
import { VideoScreenKickBox } from "client/VideoScreen/kickbox/VideoScreenKickBox";
import { VideoScreenRouletteC4 } from "client/VideoScreen/rouletteC4/VideoScreenRouletteC4";
import { GameLength, GameType, IBetCodeDecimals, SkinType, SkinTypeDefinition } from "common/Definitions";
import { FadeDurations } from "common/FadeDurations";
import { Util } from "common/Util";

// const videoStartTime = 0.0;
const defaultGameType: GameType = "kart5";
const defaultGameSkin: SkinType = SkinTypeDefinition.MODERN;

export class LogicImplementationDummy extends LogicBase implements ILogicImplementation {
  private syncTime = 1.5;
  private videoStartTime: number = 0;
  private withIntro: boolean = true;

  public constructor() {
    super();
    this.videoStartTime = settings.videoStartTime;
  }

  public isRegistered(): boolean {
    return true;
  }

  // initialize general application state - called when app starts
  public async onInit(): Promise<void> {
    // const companyLogo = await this.getCompanyLogo(settings.forceGameType ? settings.forceGameType : defaultGameType, settings.forceGameSkin ? settings.forceGameSkin : defaultGameSkin);

    const gameSkin = settings.forceGameSkin ? settings.forceGameSkin : defaultGameSkin;
    const gameInfo: IGameInfo = {
      videoLanguage: settings.languageId === "it" ? "it" : "",
      // companyLogo: { image: logoTexture },
      gameType: settings.forceGameType ? settings.forceGameType : defaultGameType,
      oddsAlwaysOn: gameSkin === SkinTypeDefinition.MODERN_ODDS_ALWAYS_ON,
      // companyLogo,
      eventType: settings.forceGameType ? settings.forceGameType : defaultGameType,
      gameSkin,
      gameLength: settings.forceGameLength ? settings.forceGameLength : 240,
      currentIntroGameLength: settings.forceGameLength ? settings.forceGameLength : 240,
      performance: settings.forcePerformance ? settings.forcePerformance : "high",
      music: {
        volumeIntro: 1,
        volumeRace: 0.15,
        speakerTime: settings.forceGameType === "sulky" ? "136" : "32"
      },
      speakerTimesArray: [],
      useOverlays: settings.forceUseOverlays ?? false,
      haveDbPot: settings.showBonus
    };

    FadeDurations.setFadeDurations(gameInfo.gameType, gameInfo.gameSkin);

    if (gameInfo.gameType === "box") {
      const headerTexture = await Logic.loadTexture(headerImageUrl);
      const inFightTexture = await Logic.loadTexture(inFightImageUrl);
      const inFightTextureBig = await Logic.loadTexture(inFightImageBigUrl);
      const fightResultHexTexture = await Logic.loadTexture(fightResultHexUrl);
      const wipeBackgroundTexture = await Logic.loadTexture(wipeBackgroundImageUrl);
      const resultBackgroundTexture = await Logic.loadTexture(resultBackgroundImageUrl);
      gameInfo.additionalTextures = {
        headerImage: headerTexture,
        inFightImage: inFightTexture,
        inFightImageBig: inFightTextureBig,
        fightResultHexImage: fightResultHexTexture,
        wipeBackgroundTexture,
        resultBackgroundTexture
      };
      gameInfo.music.speakerTime = "28;5;29;5;29";
    }

    //Logic.setLanguageId("it");

    this.initGame(gameInfo);

    await this.cacheFiles(gameInfo.gameType === "box");

    this.withIntro = this.gameInfo.gameLength !== 60 || this.gameInfo.gameType === "roulette";

    // load intro texture => should be loaded before fade to intro ...
    const introInfo = this.getIntroUrls(false);
    if (this.withIntro) {
      Logger.debug("loadTexture");
      const tex = await this.loadTexture(introInfo.image, true);
      this.fillIntroTexture(tex);
    }

    if (introInfo.sound && this.isIntroSoundEnabled()) Logic.loadIntroMusic(introInfo.sound);
    if (!this.withIntro) {
      const raceInfo = this.getRaceUrls(this.getRaceVideos(), false); // this.getRaceUrls("R0001");
      const tex = await this.loadTexture(raceInfo[0].image, true);
      this.fillRaceTexture(tex);
    }
  }

  private async cacheFiles(lengthAgnosticVideos: boolean) {
    // reuse intro video/image and audio
    const files: string[] = [];
    if (this.withIntro) {
      const introInfo = this.getIntroUrls(false);
      files.push(introInfo.image);
      files.push(introInfo.video);
      const introInfoBonus = this.getIntroUrls(true);
      files.push(introInfoBonus.image);
      files.push(introInfoBonus.video);
    }
    const raceInfo = this.getRaceUrls(this.getRaceVideos(), lengthAgnosticVideos); // this.getRaceUrls("R0001");
    raceInfo.forEach((element) => {
      files.push(element.image);
      files.push(element.video);
    });

    await Logic.cacheFiles(files);
  }

  // destroy application state - called when app closes
  public onExit(): void {}

  // called when player touches the VideoOverlay -> start the video with the current server time
  public async onStarted(): Promise<void> {
    const startPaused = !settings.startImmediately;
    if (startPaused) {
      Logic.showPauseOverlay("intro");
    } else {
      Logic.startPlayingWithTime(this.videoStartTime /*+ this.syncTime*/);
    }
    return Promise.resolve();
  }

  // video is ready for playing with the given video time
  public onCanPlay(preparedVideoTime: number): void {
    Logger.info("onCanPlay: " + preparedVideoTime);
    // Video is ready to play
    // wait until server time >= preparedVideoTime (or if difference is too big, change time?)
    Util.callDelayed(async () => {
      Logic.play();
      return Promise.resolve();
    });
  }

  // it is time to fade to another video state (e.g. end of video, ...)
  public onTimeForFade(targetState: VideoState): void {
    // fill race texture and start fade
    Util.callDelayed(async () => {
      if (targetState === VideoState.Race) {
        const texturePath = this.getRaceUrls(this.getRaceVideos(), this.gameInfo.gameType === "box")[0].image;
        const tex = await this.loadTexture(texturePath, false);
        this.fillRaceTexture(tex);
        Logic.fadeTo(targetState);
      } else {
        Logic.fadeTo(targetState);
      }
    });
    // this.setState(targetState);
  }

  public getCurrentGameId(): number {
    return this.getModel().roundInfo.gameId;
  }

  // it is time to start playing
  public onTimeForPlay(targetState: VideoState): void {
    Util.callDelayed(() => {
      Logic.startPlayingWithState(targetState, targetState === VideoState.Intro ? 0.0 : 0.0);
    });
  }

  public getModel(): IModel | IRouletteModel | IHorseDog6C4Model {
    switch (this.gameInfo.gameType) {
      case "kart5":
        return dummyModelKart5;
      case "dog6":
        if (this.gameInfo.gameSkin === SkinTypeDefinition.CLASSIC) {
          return dummyModelDog6C4;
        } else {
          return dummyModelDog6;
        }
      case "dog8":
        return dummyModelDog8;
      case "dog63":
        return dummyModelDog63;
      case "horse":
        if (this.gameInfo.gameSkin === SkinTypeDefinition.CLASSIC) {
          return dummyModelHorseC4;
        } else {
          return dummyModelHorse;
        }
      case "roulette":
        return dummyModelRouletteC4;
      case "box": {
        return dummyModelKickBox;
        // const serverData = getServerData() as ISockServResponseMessageGameRound;
        // const newModel = new ModelBox("box");
        // newModel.setServerData(serverData.gamepool[0]);
        // newModel.convertFromServerOdds();
        // return newModel;
      }
      case "sulky":
        return dummyModelSulky;
    }
    throw new Error("Not supported so far!");
  }

  private async getCompanyLogo(gameType: GameType, skinType: SkinType): Promise<CompanyLogo> {
    let logoTexture;
    let logoBackgroundTexture;
    let logoTextTexture;

    if (gameType === "horse" && skinType === SkinTypeDefinition.CLASSIC) {
      logoTexture = await Logic.loadTexture(horseLogo, { mipmap: true });
      if (horseLogoBackground) logoBackgroundTexture = await Logic.loadTexture(horseLogoBackground, { mipmap: true });
      if (horseLogoText) logoTextTexture = await Logic.loadTexture(horseLogoText, { mipmap: true });

      return {
        image: logoTexture,
        imageBackground: logoBackgroundTexture,
        imageText: logoTextTexture
      };
    } else if (gameType === "dog6" && skinType === SkinTypeDefinition.CLASSIC) {
      logoTexture = await Logic.loadTexture(dogLogo, { mipmap: true });
      if (dogLogoBackground) logoBackgroundTexture = await Logic.loadTexture(dogLogoBackground, { mipmap: true });
      if (dogLogoText) logoTextTexture = await Logic.loadTexture(dogLogoText, { mipmap: true });

      return {
        image: logoTexture,
        imageBackground: logoBackgroundTexture,
        imageText: logoTextTexture
      };
    } else if (gameType === "roulette" && skinType === SkinTypeDefinition.CLASSIC) {
      logoTexture = await Logic.loadTexture(logo, { mipmap: true });
      if (logoBackground) logoBackgroundTexture = await Logic.loadTexture(logoBackground, { mipmap: true });
      if (logoText) logoTextTexture = await Logic.loadTexture(logoText, { mipmap: true });

      return {
        image: logoTexture,
        imageBackground: logoBackgroundTexture,
        imageText: logoTextTexture
      };
    } else {
      logoTexture = await Logic.loadTexture(logo, { mipmap: true });
      if (logoBackground) logoBackgroundTexture = await Logic.loadTexture(logoBackground, { mipmap: true });
      if (logoText) logoTextTexture = await Logic.loadTexture(logoText, { mipmap: true });

      return {
        image: logoTexture,
        imageBackground: logoBackgroundTexture,
        imageText: logoTextTexture
      };
    }
  }

  private getRaceVideoInfos(): VideoUrlInfo[] {
    const model = this.getModel();
    if (!this.isRouletteModel(model) && !this.isHorseC4Model(model) && model.fightVideos) {
      const raceVideos = [
        ...model.fightVideos.round1,
        model.fightVideos.round1Result,
        ...model.fightVideos.round2,
        model.fightVideos.round2Result,
        ...model.fightVideos.round3,
        model.fightVideos.round3Result,
        model.fightVideos.finalResult
      ];
      return raceVideos;
    } else if (this.gameInfo.gameType === "sulky") {
      return [{ url: "R0015", length: Logic.getRaceLength() }];
    } else {
      return [{ url: "R0001", length: Logic.getRaceLength() }];
    }
  }

  private getRaceVideos(): string[] {
    const model = this.getModel();
    if (!this.isRouletteModel(model) && !this.isHorseC4Model(model) && model.fightVideos) {
      const raceVideos = [
        ...model.fightVideos.round1.map((x) => x.url),
        model.fightVideos.round1Result.url,
        ...model.fightVideos.round2.map((x) => x.url),
        model.fightVideos.round2Result.url,
        ...model.fightVideos.round3.map((x) => x.url),
        model.fightVideos.round3Result.url,
        model.fightVideos.finalResult.url
      ];
      return raceVideos;
    } else if (this.gameInfo.gameType === "sulky") {
      return ["R0015"];
    } else {
      return ["R0001"];
    }
  }

  // get hit_json from server, get the corresponding fight segments and setup the video urls
  // get the hit timings from the hit_json file and set them to the fightInfo hits
  public prepareKickboxVideoInfos(fightVideos: IFightVideos, fightInfo: IFightInfo): void {
    const jsonVideoInfoUrl = this.getBaseUrl("box", SkinTypeDefinition.MODERN) + "/Hit_json.json";
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

    for (let roundIndex = 1; roundIndex <= 3; roundIndex++) {
      for (let i = 0; i < 2; i++) {
        const filtered = fightInfo.hits[i].filter((x) => x.round === roundIndex);
        let fists = 0;
        let kicks = 0;
        for (const hit of filtered) {
          // fightInfo.hits[i]
          fists = hit.fist + fists;
          kicks = hit.kick + kicks;
          hit.fist = fists;
          hit.kick = kicks;
        }
      }
    }
  }

  private prepareKickboxRoundInfo(jsonVideoInfo: any, fightInfo: IFightInfo, fightName: string, round: IFightVideo[], roundNumber: number, timeOffsetInSeconds: number) {
    round.forEach((element, index) => {
      const fight1Info = jsonVideoInfo[fightName];
      element.url = this.getBaseUrl("box", SkinTypeDefinition.MODERN) + element.name + ".mp4";

      if (fight1Info) {
        const jsonInfo = fight1Info.filter((jsonElement: any) => jsonElement.name === element.name)[0];

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
      }
      timeOffsetInSeconds += element.length;
    });
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

  private isHorseC4Model(object: unknown): object is IHorseDog6C4Model {
    return Object.prototype.hasOwnProperty.call(object, "prevRoundInfo");
  }
  private isRouletteModel(object: unknown): object is IRouletteModel {
    return Object.prototype.hasOwnProperty.call(object, "rouletteStats");
  }

  public onFillStateInfo(state: VideoState): VideoUrlInfo[] {
    const model = this.getModel();
    if (!settings.showBonus) model.roundInfo.jackpotValue = undefined;
    Logger.debug("onFillStateInfo: " + state);

    const kickboxScreen = Logic.videoScreen as VideoScreenKickBox;
    if (!this.isRouletteModel(model) && !this.isHorseC4Model(model) && kickboxScreen !== undefined && model.fightVideos && model.fightResult) {
      // for kickbox resolve the necessary fightvideo names with the help of hit the hit json file to their corresponding urls - additionaly parse the hits and set them up in the fightresult structure
      this.prepareKickboxVideoInfos(model.fightVideos, model.fightResult);
    }

    if (state === VideoState.Intro && this.withIntro) {
      model.roundInfo.gameId++;
      if (this.isRouletteModel(model)) {
        const rouletteScreen = Logic.videoScreen as VideoScreenRouletteC4;
        if (rouletteScreen !== undefined) {
          rouletteScreen.fillLastRoundInfo(model.lastRoundInfo);
          rouletteScreen.fillRound(model.roundInfo, model.history, model.rouletteStats);
        }
        return [
          {
            url: this.getIntroUrls(model.roundInfo.jackpotValue !== undefined).video,
            length: Logic.getIntroLength()
          }
        ];
      }

      if (this.isHorseC4Model(model)) {
        const horseC4Screen = Logic.videoScreen as VideoScreenHorseC4;
        if (horseC4Screen !== undefined) {
          horseC4Screen.fillPrevRound(model.prevRoundInfo);
          horseC4Screen.fillRound(model.roundInfo, model.odds, model.colors, model.history, model.bonus);
          horseC4Screen.fillLastRoundResult(model.result);
        }
        return [
          {
            url: this.getIntroUrls(model.roundInfo.jackpotValue !== undefined).video,
            length: Logic.getIntroLength()
          }
        ];
      }

      const videoScreen = Logic.videoScreen;

      if (!(videoScreen instanceof VideoScreenRouletteC4 || videoScreen instanceof VideoScreenHorseC4)) {
        videoScreen.fillRound(model.roundInfo, model.drivers, model.odds, model.history, model.jackpotHistory, model.track, model.colors);
      }
      // for kickbox we need some additional data
      if (kickboxScreen !== undefined && model.resultBet && model.fightQuotes && model.fightHistory && model.boxRingPresentationFacts && model.fightVideos) {
        kickboxScreen.fillRoundAdditional(model.drivers, model.resultBet, model.fightQuotes, model.fightHistory, model.boxRingPresentationFacts);
      } else if (this.gameInfo.gameType === "dog63") {
        const dog63Screen = Logic.videoScreen as VideoScreenDog63;
        if (model.dog63History && model.dog63Suprimi && model.dog63Quotes && model.dog63rd && model.dog63QuotesSide)
          dog63Screen.fillRoundAdditional(
            model.roundInfo,
            model.drivers,
            model.dog63History,
            model.dog63Suprimi,
            model.dog63Quotes,
            model.dog63rd,
            model.odds,
            model.dog63QuotesSide,
            model.oddsGridFirstTwoInOrder === true
          );
      }
      return [
        {
          url: this.getIntroUrls(model.roundInfo.jackpotValue !== undefined).video,
          length: Logic.getIntroLength()
        }
      ];
    } else {
      let resolvedUrls: string[] = [];
      if (Logic.videoScreen instanceof VideoScreenHorseC4 && this.isHorseC4Model(model)) Logic.videoScreen.fillResult(model.result);
      if (!this.isRouletteModel(model) && !this.isHorseC4Model(model) && !(Logic.videoScreen instanceof VideoScreenRouletteC4) && !(Logic.videoScreen instanceof VideoScreenHorseC4) && model.result)
        Logic.videoScreen.fillResult(model.track, model.roundInfo, model.colors, model.result, model.raceIntervals, model.drivers, model.odds);
      if (!this.isRouletteModel(model) && !this.isHorseC4Model(model) && kickboxScreen !== undefined && model.fightResult && model.fightVideos) {
        // for kickbox we need some additional data
        // additionally the videourls need to be set up correctly
        model.fightVideos.round1Result.url = this.getVideoUrl(
          model.fightVideos.round1Result.name,
          false,
          this.gameInfo.gameType,
          this.gameInfo.gameSkin,
          this.gameInfo.gameLength,
          this.gameInfo.performance,
          false,
          settings.showText,
          settings.languageId
        ).video;
        model.fightVideos.round2Result.url = this.getVideoUrl(
          model.fightVideos.round2Result.name,
          false,
          this.gameInfo.gameType,
          this.gameInfo.gameSkin,
          this.gameInfo.gameLength,
          this.gameInfo.performance,
          false,
          settings.showText,
          settings.languageId
        ).video;
        model.fightVideos.round3Result.url = this.getVideoUrl(
          model.fightVideos.round3Result.name,
          false,
          this.gameInfo.gameType,
          this.gameInfo.gameSkin,
          this.gameInfo.gameLength,
          this.gameInfo.performance,
          false,
          settings.showText,
          settings.languageId
        ).video;
        model.fightVideos.finalResult.url = this.getVideoUrl(
          model.fightVideos.finalResult.name,
          false,
          this.gameInfo.gameType,
          this.gameInfo.gameSkin,
          this.gameInfo.gameLength,
          this.gameInfo.performance,
          false,
          settings.showText,
          settings.languageId
        ).video;
        model.fightVideos.round1Result.jpg = model.fightVideos.round1Result.url.replace(".mp4", "_Stillframe_End.jpg");
        model.fightVideos.round2Result.jpg = model.fightVideos.round2Result.url.replace(".mp4", "_Stillframe_End.jpg");
        model.fightVideos.round3Result.jpg = model.fightVideos.round3Result.url.replace(".mp4", "_Stillframe_End.jpg");

        kickboxScreen.fillAdditionalResult(model.drivers, model.fightResult, model.fightVideos);

        resolvedUrls = this.getRaceVideos();
      } else resolvedUrls = this.getRaceUrls(this.getRaceVideos(), this.gameInfo.gameType === "box").map((x) => x.video);
      const raceVideoInfos = this.getRaceVideoInfos();

      const result = resolvedUrls.map((x) => {
        return {
          url: x,
          length: raceVideoInfos.filter((info) => x.includes(info.url))[0].length
        };
      });
      return result;

      //   Logic.videoScreen.fillResult(model.track, model.roundInfo, model.colors, model.result, model.raceIntervals, model.drivers, model.odds);
      // return this.getRaceUrls("R0001").video;
    }
  }

  // video time update event (fired as long as the video plays...) - videoTime may jump during fade...
  public onVideoTimeUpdate(videoTime: number): void {
    // the next round might start before the video has ended => ...
    // if (videoTime > 235)
    //   Logic.fadeTo(VideoState.Intro);
    if (settings.syncStartTimeParameter) {
      let completeUrl = window.location.href;
      if (!completeUrl.includes("videoStartTime=")) {
        // just add it
        completeUrl += "&videoStartTime=" + videoTime.toString();
      } else {
        // let newStartTime = 'www.google.com';
        completeUrl = completeUrl.replace(/(videoStartTime=).*?(&)/, "$1" + videoTime.toString() + "$2");
      }
      window.history.replaceState("page2", "title", completeUrl);
    }
  }

  // general update event -> fired more often and even if no video plays
  public onUpdate(deltaTime: number): void {
    /*const videoTimeWhenRaceStarts = Logic.getIntroLength() + VIDEO_FADE_DURATION;
    if (Logic.getState() === VideoState.Race && Logic.getVideoTime() > 230)
      Logic.onTimeForFade(VideoState.Intro);
    else if (Logic.getState() === VideoState.Intro && Logic.getVideoTime() > 160) {
      Logic.onTimeForFade(VideoState.Race);
    }*/
  }

  public checkStartNextVideoLoop(vidoeSec: number) {}

  // private basePath = "/api/proxyAsset/";
  public getRaceUrls(videoNames: string[], lengthAgnosticVideos: boolean): IVideoUrls[] {
    if (!lengthAgnosticVideos && this.gameInfo.gameLength === 300) {
      for (let i = 0; i < videoNames.length; i++) videoNames[i] = videoNames[i] + "_5";
    }

    const namesOnly = videoNames.map((x) => x.replace(this.getBaseUrl("box", SkinTypeDefinition.MODERN), "").replace(".mp4", ""));

    return this.getVideoUrls(
      namesOnly,
      lengthAgnosticVideos,
      this.gameInfo.gameType,
      this.gameInfo.gameSkin,
      this.gameInfo.gameLength,
      this.gameInfo.performance,
      false,
      settings.showText,
      settings.languageId
    );
  }

  public getIntroUrls(bonus: boolean): IVideoUrls {
    const url = this.getVideoUrl(
      "intro",
      false,
      this.gameInfo.gameType,
      this.gameInfo.gameSkin,
      this.gameInfo.gameLength,
      this.gameInfo.performance,
      bonus,
      settings.showText,
      settings.languageId,
      this.gameInfo.oddsAlwaysOn
    );
    /*console.log(settings.forceSpecificIntro);
    if (settings.forceSpecificIntro && settings.forceSpecificIntro !== "") {
      console.log(url);
      let string = "";
      const split1 = url.video.split("?");
      const split2 = split1[0].split("/");
      console.log(split2[split2.length - 1]);
      for (let i = 0; i < split2.length - 1; i++) {
        string += split2[i] + "/";
      }
      url.video = string + settings.forceSpecificIntro + ".mp4?" + split1[1];
      url.image = string + settings.forceSpecificIntro + ".jpg?" + split1[1];
    }*/
    if (settings.forceUseOverlays) {
      console.log(url);
      let string = "";
      const split1 = url.video.split("?");
      const split2 = split1[0].split("/");
      console.log(split2[split2.length - 1]);
      for (let i = 0; i < split2.length - 1; i++) {
        string += split2[i] + "/";
      }
      url.video = string + "intro_4_oao_crf27_gridcheck02" + ".mp4?" + split1[1];
      url.image = string + "intro_4_oao_crf27_gridcheck02" + ".jpg?"; // + split1[1]
    }
    return url;
  }

  public getBetTypeDecimalPlaces(): IBetCodeDecimals[] | null | undefined {
    return [
      { betCodeId: 1, decimalPlaces: 1 },
      { betCodeId: 2, decimalPlaces: 1 },
      { betCodeId: 3, decimalPlaces: 1 },
      { betCodeId: 4, decimalPlaces: 1 },
      { betCodeId: 5, decimalPlaces: 1 },
      { betCodeId: 6, decimalPlaces: 1 },
      { betCodeId: 7, decimalPlaces: 1 },
      { betCodeId: 8, decimalPlaces: 1 },
      { betCodeId: 9, decimalPlaces: 1 },
      { betCodeId: 10, decimalPlaces: 1 },
      { betCodeId: 11, decimalPlaces: 1 },
      { betCodeId: 12, decimalPlaces: 1 },
      { betCodeId: 13, decimalPlaces: 1 },
      { betCodeId: 14, decimalPlaces: 1 }
    ];
  }

  // get the localized text for a certain textid...
  public getText(textId: string): any {
    const lc = textId.toLowerCase();
    const map: any = {
      intervalcourse: "ZWISCHENZEIT",
      sendplanpre: "RACEID:",
      // timenextra: "TEMPO FINO ALLA PROSSIMA CORSA"
      timenextra: "TEMPO FINO ALLA PROSSIMA",
      sheduleid: "CODICE PALINSESTO",
      eventid: "CODICE AVVENIMENTO",
      racestart: "INIZIA GARA",
      twoerpalces: "ACCOPPIATA",
      thetrio: "TRIO",
      twointhree: "ACCOPPIATA PIAZZATA SU 3",
      oddtxt: "DISPARI",
      undertxt: "BASSO",
      sumshort: "SOMMA",
      notinorder: "A GIRARE",
      notinordersh: "N.I.O.",
      inordersh: "I.O.",
      sumplaces: "SOMMA PIAZZAMENTI",
      eventxt: "PARI",
      overtxt: "ALTO",
      weight: "PESO",
      winner: "VINCENTE",
      firsttwoinorder: "ACCOPPIATA IN ORDINE",
      twelflowq: "12 Q. PIÙ BASSE",
      twelfheighq: "12 Q. PIÙ ALTE",
      sumplacesh: "SU",
      inorder: "IN ORDINE",
      twoplacedintwo: "ACCOPPIATA PIAZZATA A GIRARE",
      twoplacedinthree: "ACCOPPIATA NON IN ORDINE",
      trionotino: "TRIO NON IN ORDINE",
      firstThreeNiOsh: "SU PRIMI 3 IN QLS. ORDINE",
      firstthreeanyorder: "I PRIMI 3 IN QUALSIASI ORDINE DI ARRIVO",
      trioinorder: "TRIO IN ORDINE",
      numbersigntwo: "2°",
      numbersignthree: "3°",
      shortplace: "P",
      thelastfive: "ULTIME 5",
      thevalue: "VAL.",
      notehead: "NOTE",
      forcastbet: "ACCOPPIATA IN ORDINE",
      racehistory: "RACE HISTORY",
      placeshort: "P.",
      placebet: "SU 2",
      showbet: "SU 3",
      racemotor: "RACE",
      racinghis: "RACING HISTORY",
      numbersign: "1st",
      trendtxt: "TREND:",
      race: "RACE",
      history: "History",
      hot_numbers: "Karsti numeriai",
      cold_numbers: "Salti skaiciai",
      oddtxtsm: "odd",
      eventxtsm: "even",
      "1_18": "1-18",
      "19_36": "19-36",
      firstrow: "first row",
      secondrow: "sec row",
      thirdrow: "third row",
      "1_12": "1-12",
      "13_24": "13-24",
      "25_36": "25-36",
      "1stplacesuffix": "st",
      "2ndplacesuffix": "nd",
      winnertxt: "Nugalėtojas"
    };

    if (map[lc]) return map[lc];
    return textId.toUpperCase();
  }

  public hasJackpotBounus(): boolean {
    return true;
  }

  public isIntroSoundEnabled(): boolean {
    if (this.gameInfo) {
      // false for game skin classic
      return this.gameInfo.gameSkin !== SkinTypeDefinition.CLASSIC;
    }
    return true;
  }

  getIsProgrammInSetup(): boolean {
    return false;
  }

  getRaceStartTime(): number {
    return 0;
  }

  raceStarted(): boolean {
    return true;
  }

  inRaceBreak(): boolean {
    return false;
  }

  updateGameLoopLength(gameLength: GameLength, beforeGameLength: GameLength, isSetUp: boolean): void {}
  getIsMultipleGameLengthes(): boolean {
    return false;
  }

  updateIntroGameLength(gameLength: GameLength): void {
    this.gameInfo.currentIntroGameLength = gameLength;
    Logger.debug("Game length set for next Intro:" + Logic.implementation.getGameInfo().currentIntroGameLength);
  }

  getCurrentRaceGameLength(): GameLength {
    return GAME_LOOP_LENGTH;
  }

  getCurrentIntroGameLength(): GameLength {
    return GAME_LOOP_LENGTH;
  }

  public getExtraLoadTime(): number {
    return 0;
  }

  reloadWindow() {
    window.location.reload();
  }
}
