import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { oddsAlwaysOnTrackPresentationTimings } from "./../../../settings/OddsAlwaysOnSettings";
import { TrackPresentation120AnimTimings, TrackPresentationAnimTimings, TrackPresentationPositions } from "./../../../settings/TrackPresentationSettings";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings } from "client/Logic/Logic";
import { ITrack, IAnimInterval, IGameInfo } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "./../common/Anim";
import * as PIXI from "pixi.js";
import { TrackPresentationLapInfo } from "./TrackPresentationLapInfo";
import { GameType, GameLength } from "common/Definitions";
import { DogHelper } from "./DogHelper";
import { Util } from "../../../../common/src/Util";
import { TrackPresentationFade } from "./FadeAnimations/TrackPresentationFade";
import { TrackPresentationBackground } from "./BackgroundElements/TrackPresentationBackground";
import { TurnPresentation } from "./TrackPresentation/TurnPresentation/TurnPresentation";
import { LapPresentation } from "./TrackPresentation/LapPresentation/LapPresentation";
import { FactPresentation } from "./TrackPresentation/FactPresentation/FactPresentation";

type TrackPresentationAnim = IAnimInterval & {
  times: IAnimInterval[];
};

export class TrackPresentationAnims {
  public anims: TrackPresentationAnim[] = [];
  public startTime: number = 0;
  public circleStartTime: number = 0;
  public circleLetterOffset: number = 0;
  public lapInfoAnims: IAnimInterval[] = [];
  public backgroundAnims: IAnimInterval[] = [];
}

export class TrackPresentationDog extends Group {
  private trackName: PIXI.Text;
  private gameTypeCheck: "horse" | "sulky" | "default";
  //private anims: IAnimInterval[];
  private bgAnims: IAnimInterval[] = [];

  private lapInfo: TrackPresentationLapInfo;
  private trackAnims: TrackPresentationAnims | undefined = undefined;
  private trackPresentationAnims: TrackPresentationAnim[] = [];
  private gameType: GameType;
  private gameLength: GameLength;
  private helper: DogHelper;
  private oddsAlwaysOn: boolean;
  private useOverlays: boolean;

  private timeOffset: number = 0;

  private trackPresentationBG: TrackPresentationBackground = new TrackPresentationBackground();
  private trackPresentationMask = new PIXI.Graphics();

  private turnPresentation: TurnPresentation[] = [];
  private lapPresentation: LapPresentation[] = [];
  private factPresentation: FactPresentation[] = [];

  private fadeVideo: TrackPresentationFade;

  public constructor(gameInfo: IGameInfo, helper: DogHelper) {
    super();
    this.helper = helper;
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.gameType = gameInfo.gameType;
    this.useOverlays = gameInfo.useOverlays;
    this.turnPresentation[0] = new TurnPresentation(gameInfo);
    this.lapPresentation[0] = new LapPresentation(gameInfo);
    this.factPresentation[0] = new FactPresentation(gameInfo);
    if (this.oddsAlwaysOn) {
      this.turnPresentation[1] = new TurnPresentation(gameInfo);
      this.lapPresentation[1] = new LapPresentation(gameInfo);
      this.factPresentation[1] = new FactPresentation(gameInfo);
    }

    if (this.useOverlays) {
      this.add(this.trackPresentationMask);
      this.add(this.trackPresentationBG);
    }

    this.add(this.turnPresentation[0]);
    this.add(this.lapPresentation[0]);
    this.add(this.factPresentation[0]);
    if (this.oddsAlwaysOn) {
      this.add(this.turnPresentation[1]);
      this.add(this.lapPresentation[1]);
      this.add(this.factPresentation[1]);
    }

    if (this.oddsAlwaysOn) {
      this.container.scale.set(0.7, 0.7);
    }

    if (this.useOverlays) {
      this.trackPresentationBG.container.mask = this.trackPresentationMask;
      this.turnPresentation[0].container.mask = this.trackPresentationMask;
      this.lapPresentation[0].container.mask = this.trackPresentationMask;
      this.factPresentation[0].maskContainer.container.mask = this.trackPresentationMask;

      if (this.oddsAlwaysOn) {
        this.turnPresentation[1].container.mask = this.trackPresentationMask;
        this.lapPresentation[1].container.mask = this.trackPresentationMask;
        this.factPresentation[1].maskContainer.container.mask = this.trackPresentationMask;
      }
    }

    this.fadeVideo = new TrackPresentationFade(this.gameType);
    this.add(this.fadeVideo);

    this.gameLength = gameInfo.gameLength;
    this.showDebug(settings.debug, undefined, "TrackPresentation");

    this.trackName = Logic.createPixiText(this.helper.getTrackNameStyle());
    this.trackName.anchor.set(0.5, 0.5);

    this.add(this.trackName);

    if (this.gameType !== "horse" && this.gameType !== "sulky") this.gameTypeCheck = "default";
    else this.gameTypeCheck = this.gameType;

    this.lapInfo = new TrackPresentationLapInfo(gameInfo);
    this.add(this.lapInfo);
  }

  private calcTimeOffset(gameType: GameType, gameLength: GameLength, withBonus: boolean, second = false) {
    if (gameType === "horse" || gameType === "sulky") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnTrackPresentationTimings.horse[384][second ? "second" : "first"];
      return 51.0;
    }
    if (gameType === "dog63") {
      if (this.oddsAlwaysOn) {
        return oddsAlwaysOnTrackPresentationTimings.dog63[this.gameLength as 120 | 240 | 300 | 360][second ? "second" : "first"];
      }

      return 116.8;
    } else if (gameType === "dog6" || gameType === "dog8") {
      if (this.oddsAlwaysOn) return oddsAlwaysOnTrackPresentationTimings.dog[this.gameLength as 120 | 240 | 300][second ? "second" : "first"];
      switch (this.gameLength) {
        case 180:
          return withBonus ? 41.5 : 51.5;
        case 240:
          return 50;
        case 300:
          return withBonus ? 51.5 : 61.5;
      }
    }
    return 0;
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean, second = false): TrackPresentationAnims {
    const result = new TrackPresentationAnims();
    this.timeOffset = this.calcTimeOffset(gameType, gameLength, withBonus, second);
    const isHorse = gameType === "horse" || gameType === "sulky";
    const totalAnimDuration = gameType === "dog63" ? 20 : 20.97;
    result.anims = [
      {
        startTime: 0,
        duration: isHorse ? 20 : totalAnimDuration,
        times: gameLength === 120 ? TrackPresentation120AnimTimings.trackName : TrackPresentationAnimTimings[this.gameType as keyof typeof TrackPresentationAnimTimings].trackName
      }
    ];

    result.startTime = second ? 10.5 : 9.6;
    if (this.oddsAlwaysOn) {
      result.anims[0].duration = 20;
    }

    if (gameLength === 120) {
      result.lapInfoAnims = Util.copyArrayOfObjects<IAnimInterval>(TrackPresentation120AnimTimings.lapInfo);
      result.backgroundAnims = Util.copyArrayOfObjects<IAnimInterval>(TrackPresentation120AnimTimings.background);
    } else {
      result.lapInfoAnims = Util.copyArrayOfObjects<IAnimInterval>(TrackPresentationAnimTimings[this.gameType as keyof typeof TrackPresentationAnimTimings].lapInfo);
      result.backgroundAnims = Util.copyArrayOfObjects<IAnimInterval>(TrackPresentationAnimTimings[this.gameType as keyof typeof TrackPresentationAnimTimings].background);
    }

    result.startTime += this.timeOffset;

    result.backgroundAnims.forEach((m) => this.transformAnim(m, 1, this.timeOffset));
    result.lapInfoAnims.forEach((m) => this.transformAnim(m, 1, this.timeOffset));
    result.anims.forEach((m) => {
      this.transformAnim(m, 1, this.timeOffset);
      m.times.forEach((t) => this.transformAnim(t, 1, 0));
    });

    return result;
  }

  public fill(track: ITrack, withBonus: boolean): void {
    let secondAnims: TrackPresentationAnims | undefined;
    this.trackAnims = this.createAnims(this.gameType, Logic.implementation.getCurrentIntroGameLength(), withBonus);

    this.turnPresentation[0].fill(track, this.timeOffset);
    this.lapPresentation[0].fill(track, this.timeOffset);
    this.factPresentation[0].fill(track, this.timeOffset);

    if (this.oddsAlwaysOn && Logic.implementation.getCurrentIntroGameLength() !== 120) {
      secondAnims = this.createAnims(this.gameType, Logic.implementation.getCurrentIntroGameLength(), withBonus, true);
      this.turnPresentation[1].fill(track, this.timeOffset);
      this.lapPresentation[1].fill(track, this.timeOffset);
      this.factPresentation[1].fill(track, this.timeOffset);
      this.trackPresentationAnims = [...this.trackAnims.anims, ...secondAnims.anims];
      this.trackAnims.lapInfoAnims = [...this.trackAnims.lapInfoAnims, ...secondAnims.lapInfoAnims];
      this.bgAnims = [...this.trackAnims.backgroundAnims, ...secondAnims.backgroundAnims];
    } else {
      this.trackPresentationAnims = this.trackAnims.anims;
      this.bgAnims = this.trackAnims.backgroundAnims;
    }

    // spacing between trackname and country
    const spacer = this.gameType === "horse" || this.gameType === "sulky" ? " - " : "-";

    this.trackName.text = (track.name + spacer + track.country).toUpperCase();
    Logic.autoSize(this.trackName, _s(400));

    // MS hardcoded for now - if we need to change that dynamically the animtimes need to move into the provided data as well?
    const tempTrack = track;
    const lapInfoAnims: any[] = [];
    lapInfoAnims.push({ startTime: this.trackAnims.lapInfoAnims[0].startTime, duration: this.trackAnims.lapInfoAnims[0].duration, key: tempTrack.facts[0].key, value: tempTrack.facts[0].value });
    lapInfoAnims.push({ startTime: this.trackAnims.lapInfoAnims[1].startTime, duration: this.trackAnims.lapInfoAnims[1].duration, key: tempTrack.facts[1].key, value: tempTrack.facts[1].value });
    lapInfoAnims.push({ startTime: this.trackAnims.lapInfoAnims[2].startTime, duration: this.trackAnims.lapInfoAnims[2].duration, key: tempTrack.facts[2].key, value: tempTrack.facts[2].value });
    lapInfoAnims.push({ startTime: this.trackAnims.lapInfoAnims[3].startTime, duration: this.trackAnims.lapInfoAnims[3].duration, key: tempTrack.facts[3].key, value: tempTrack.facts[3].value });

    if (this.oddsAlwaysOn && secondAnims !== undefined) {
      lapInfoAnims.push({ startTime: secondAnims.lapInfoAnims[0].startTime, duration: secondAnims.lapInfoAnims[0].duration, key: tempTrack.facts[0].key, value: tempTrack.facts[0].value });
      lapInfoAnims.push({ startTime: secondAnims.lapInfoAnims[1].startTime, duration: secondAnims.lapInfoAnims[1].duration, key: tempTrack.facts[1].key, value: tempTrack.facts[1].value });
      lapInfoAnims.push({ startTime: secondAnims.lapInfoAnims[2].startTime, duration: secondAnims.lapInfoAnims[2].duration, key: tempTrack.facts[2].key, value: tempTrack.facts[2].value });
      lapInfoAnims.push({ startTime: secondAnims.lapInfoAnims[3].startTime, duration: secondAnims.lapInfoAnims[3].duration, key: tempTrack.facts[3].key, value: tempTrack.facts[3].value });
    }

    this.lapInfo.anims = lapInfoAnims;

    this.onLayout();
  }

  public onLayout(): void {
    this.fadeVideo.position.x = _s(0);
    this.fadeVideo.position.y = _s(0);
    this.fadeVideo.width = this.width;
    this.fadeVideo.height = this.height;
    if (!this.useOverlays) this.fadeVideo.alpha = 0;

    DrawHelper.createRoundedMask(this.trackPresentationMask, _s(546), _s(485), true, {
      topLeft: _s(0),
      bottomLeft: _s(0),
      bottomRight: _s(0),
      topRight: _s(0)
    });
    this.trackPresentationMask.y = _s(-20);

    let key: string = this.gameType;
    if (this.oddsAlwaysOn) key = `${this.gameType}_oao`;

    // get trackName Y position for gametype
    this.trackName.y = _s(TrackPresentationPositions[key as keyof typeof TrackPresentationPositions].trackName.y);

    // fixed for all gametypes
    this.lapInfo.position.x = _s(422);
    this.lapInfo.position.y = _s(-50);
    this.lapInfo.width = _s(152);
    this.lapInfo.height = _s(50);
  }

  public update(dt: number): void {
    super.update(dt);
    const t = Logic.getVideoTime();

    const anim: TrackPresentationAnim | undefined = Logic.getAnim(t, this.trackPresentationAnims, this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;

    const baseFactor = t - anim.startTime;
    this.backgroundUpdate(t);
    if (t > anim.startTime + anim.duration && !this.fadeVideo.onFinalFade) {
      this.fadeVideo.setToFinalFade();
    }

    /*console.log(
      "1: " +
        (anim.startTime + anim.times[0].startTime + anim.times[0].duration - 0.63) +
        " 2: " +
        (anim.startTime + anim.times[1].startTime + anim.times[1].duration - 0.63) +
        " 3: " +
        (anim.startTime + anim.duration)
    );*/
    //this.fadeVideo.setTestFadeX(t, [{ start: 50.07 }, { start: 55.4, skipTrackAnim: true }, { start: 60.9, skipTrackAnim: true }, { start: 68.97, skipTrackAnim: true }]);
    //if (this.useOverlays) {
    this.fadeVideo.setTestFadeX(t, [
      { start: anim.startTime },
      { start: anim.startTime + anim.times[0].startTime + anim.times[0].duration - 0.63, skipTrackAnim: true },
      { start: anim.startTime + anim.times[1].startTime + anim.times[1].duration - 0.63, skipTrackAnim: true },
      { start: anim.startTime + anim.times[2].startTime + anim.times[2].duration - 0.63, skipTrackAnim: true }
    ]);
    //}

    if (!this.useOverlays) {
      this.turnPresentation[0].visible = t >= anim.startTime + anim.times[0].startTime && t < anim.startTime + anim.times[0].startTime + anim.times[0].duration - 0.2;
      this.lapPresentation[0].visible = t >= anim.startTime + anim.times[1].startTime && t < anim.startTime + anim.times[1].startTime + anim.times[1].duration - 0.2;
      //this.factPresentation[0].visible = t >= anim.startTime + anim.times[2].startTime && t < anim.startTime + anim.times[2].startTime + anim.times[2].duration;
      if (this.oddsAlwaysOn && this.gameLength > 120) {
        this.turnPresentation[1].visible = t >= anim.startTime + anim.times[0].startTime && t < anim.startTime + anim.times[0].startTime + anim.times[0].duration - 0.2;
        this.lapPresentation[1].visible = t >= anim.startTime + anim.times[1].startTime && t < anim.startTime + anim.times[1].startTime + anim.times[1].duration - 0.2;
        //this.factPresentation[1].visible = t >= anim.startTime + anim.times[2].startTime && t < anim.startTime + anim.times[2].startTime + anim.times[2].duration;
      }
    }

    // trackname - fades in/out some times
    if (baseFactor > 0 && baseFactor < anim.times[1].startTime) {
      AnimHelper.animateInOut(baseFactor, anim.times[0].startTime, anim.times[0].startTime + anim.times[0].duration, 0.5, 0, 1, (val) => this.fadeTrackName(this.trackName, val), 0.4, 0.0);
    } else if (baseFactor < anim.times[2].startTime)
      AnimHelper.animateInOut(baseFactor, anim.times[1].startTime, anim.times[1].startTime + anim.times[1].duration, 0.5, 0.0, 1, (val) => this.fadeTrackName(this.trackName, val), 0.4, 0.0);
    else AnimHelper.animateInOut(baseFactor, anim.times[2].startTime, anim.times[2].startTime + anim.times[2].duration, 0.5, 0.0, 1, (val) => this.fadeTrackName(this.trackName, val), 0.4, 0.0);
  }

  backgroundUpdate(currentTime: number) {
    const bgAnim = Logic.getAnim(currentTime, this.bgAnims, this.trackPresentationBG);

    if (!bgAnim) {
      this.trackPresentationMask.visible = false;
      this.trackPresentationBG.visible = false;
      return;
    }

    this.trackPresentationMask.visible = true;
    this.trackPresentationBG.visible = true;

    AnimHelper.animateInOut(currentTime, bgAnim.startTime, bgAnim.startTime + bgAnim.duration, 1, -_s(124), 0, (x) => (this.trackPresentationBG.position.x = x), 1, _s(-124));
    AnimHelper.animateInOut(currentTime, bgAnim.startTime, bgAnim.startTime + bgAnim.duration, 1, -_s(600), _s(40), (x) => (this.trackPresentationMask.x = x), 1, _s(-600));
  }

  fadeTrackName(trackName: PIXI.Text, val: number): void {
    const isHorse = this.gameType === "horse" || this.gameType === "sulky";

    let fadeToX = 227;
    if (isHorse && !this.oddsAlwaysOn) fadeToX = 236;

    const f = 100;
    trackName.x = _s(fadeToX - f + f * val);
    trackName.alpha = val;
  }
}
