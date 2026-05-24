import { Group } from "client/Graphics/Group";
import { _s, Logic } from "client/Logic/Logic";
import { AnimHelper } from "client/VideoScreen/common/Anim";
import { Track, TrackTextureHelper } from "client/VideoScreen/common/TrackHelper";
import { Container, Graphics } from "pixi.js";
import { Util } from "common/Util";
import { ITrackPresentationAnims, TrackPresentation120AnimTimings, TrackPresentationAnimTimings, TrackPresentationPositions } from "settings/TrackPresentationSettings";
import { GameLength, GameType } from "common/Definitions";
import { IAnimInterval, IGameInfo, ITrack } from "client/Logic/LogicDefinitions";
import { TrackPresentationLapMapFact } from "../../TrackPresentationLapMapFact";
import { TrackPresentationTimesCirlce } from "./FactPresentationTimesCircle";
import { TrackPresentationWeatherCircle } from "./FactPresentationWeatherCircle";
function transformAnim(anim: IAnimInterval, scale: number, offset: number) {
  anim.startTime = anim.startTime * scale + offset;
  anim.duration = anim.duration * scale;
}

export interface IFactPresentationAnims {
  factAnims: IAnimInterval[];
  containerAnims: IAnimInterval[];
}

export class FactPresentation extends Group {
  public trackGraphics = new Track(233, 371, 4.5, 0xffffff, Math.PI / 4, "clockwise", undefined, true);
  public cirlceContainer = new Container();

  public maskContainer = new Group();

  private gameType: GameType;
  private oddsAlwaysOn: boolean;
  private useOverlays: boolean;
  private anims: IAnimInterval[] = [];
  private containerAnims: IAnimInterval[] | undefined;
  private circle = new Graphics();
  private lapMapFacts: TrackPresentationLapMapFact[] = [];

  private timesCircle: TrackPresentationTimesCirlce;
  private weatherCircle: TrackPresentationWeatherCircle;
  private innerCircleTimes: IAnimInterval[] = [];
  private circleStartTimes: number[] = [];

  private animatedRedWhiteTrack: Track = new Track(233, 371, 5, 0xffffff, Math.PI / 4, "counterclockwise", "redwhite", false);

  public constructor(gameInfo: IGameInfo) {
    super();
    this.container.name = "LapPresentation";
    this.gameType = gameInfo.gameType;
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.useOverlays = gameInfo.useOverlays;
    this.trackGraphics.drawFixedTrack();

    //TODO: place in settings
    const circlePlacements = [0.002, 0.754, 0.508, 0.247];

    for (let i = 0; i < 4; i++) {
      const circle = new Graphics();
      circle.beginFill(0xff0000);
      circle.drawCircle(0, 0, _s(5.8));
      circle.endFill();
      const { x, y } = this.trackGraphics.getPositionOnTrack(circlePlacements[i]);

      circle.position.set(x, y);
      circle.scale.set(1);
      this.cirlceContainer.addChild(circle);
    }

    this.trackGraphics.drawCenterLine(_s(54));

    this.maskContainer.add(this.trackGraphics);
    this.maskContainer.add(this.animatedRedWhiteTrack);
    this.maskContainer.add(this.circle);
    this.maskContainer.add(this.cirlceContainer);

    this.add(this.maskContainer);

    this.timesCircle = new TrackPresentationTimesCirlce(gameInfo);
    this.weatherCircle = new TrackPresentationWeatherCircle(gameInfo);

    if (this.useOverlays) {
      const startingBox = this.trackGraphics.createStartingBox("#C1272D", 0.324);

      const horizontalFinishLineTexture = TrackTextureHelper.createFinishLineTexture(2, 6);
      const verticalFinishLineTexture = TrackTextureHelper.createFinishLineTexture(4, 2);

      const finishLineContainer = this.trackGraphics.createStartingBox(0xffffff, 0.18, {
        vertical: verticalFinishLineTexture,
        horizontal: horizontalFinishLineTexture
      });

      this.trackGraphics.container.addChild(startingBox, finishLineContainer);
    }
    this.trackGraphics.add(this.weatherCircle);
    this.trackGraphics.add(this.timesCircle);
  }

  public fill(track: ITrack, timeOffset: number) {
    const { factAnims, containerAnims, circlestartingTimes } = this.createAnims(Logic.implementation.getCurrentIntroGameLength(), timeOffset);
    this.containerAnims = containerAnims;
    this.anims = factAnims;
    this.circleStartTimes = circlestartingTimes;

    if (this.oddsAlwaysOn && Logic.implementation.getCurrentIntroGameLength() !== 120) {
      const {
        factAnims: secondFactAnims,
        containerAnims: secondContainerAnims,
        circlestartingTimes: secondCircleStartTimes
      } = this.createAnims(Logic.implementation.getCurrentIntroGameLength(), timeOffset);

      this.circleStartTimes = [...this.circleStartTimes, ...secondCircleStartTimes];
      this.anims = [...this.anims, ...secondFactAnims];
      this.containerAnims = [...this.containerAnims, ...secondContainerAnims];
    }
    {
      // weather, temp, humidity, wind
      let vailableWidths: number[] = [138, 108, 136, 122];
      if (this.oddsAlwaysOn) vailableWidths = [90, 72, 98, 84];
      const alignLeft: boolean[] = [true, false, false, true];
      if (track.lapMapFacts !== undefined) {
        let i = 0;
        while (this.lapMapFacts.length < track.lapMapFacts.length) {
          let anims = [this.anims[i]];
          if (this.anims.length > track.lapMapFacts.length && this.oddsAlwaysOn) {
            anims = [this.anims[i], this.anims[i + track.lapMapFacts.length]];
          }

          const lapMapFact = new TrackPresentationLapMapFact(anims, alignLeft[i], vailableWidths[i] - 10, this.oddsAlwaysOn);
          this.lapMapFacts.push(lapMapFact);
          lapMapFact.fill(track.lapMapFacts[i], vailableWidths[i] - 10, this.useOverlays);
          this.add(lapMapFact);
          i++;
        }
      }
    }

    this.innerCircleTimes = [
      { startTime: containerAnims[0].startTime, duration: 3.4 },
      { startTime: containerAnims[0].startTime + 3.4, duration: 10 }
    ];

    this.timesCircle.fill([this.innerCircleTimes[0]]);
    this.weatherCircle.fill([this.innerCircleTimes[1]]);

    this.onLayout();
  }

  public onLayout() {
    this.trackGraphics.y = -_s(10);
    this.circle.rotation = Math.PI / 4;
    this.circle.position.set(_s(334), _s(-10));

    this.cirlceContainer.rotation = Math.PI / 4;
    this.cirlceContainer.position.set(_s(334), _s(-10));
    this.animatedRedWhiteTrack.position.y = _s(-10);

    let key: string = this.gameType;
    if (this.oddsAlwaysOn) key = `${this.gameType}_oao`;
    for (let i = 0; i < this.lapMapFacts.length; i++) {
      const lapMapFact = this.lapMapFacts[i];
      lapMapFact.x = _s(TrackPresentationPositions[key as keyof typeof TrackPresentationPositions].lapMapFacts[i].x);
      lapMapFact.y = _s(TrackPresentationPositions[key as keyof typeof TrackPresentationPositions].lapMapFacts[i].y);
      // lapMapFact.width = _s(TrackPresentationPositions[key as keyof typeof TrackPresentationPositions].lapMapFacts[i].width!)
      lapMapFact.height = _s(30);
    }

    const { x, y } = this.trackGraphics.getCenterOfTrack();

    if (this.useOverlays) {
      this.weatherCircle.position.x = this.timesCircle.position.x = x;
      this.weatherCircle.position.y = this.timesCircle.position.y = y;
    } else {
      this.weatherCircle.position.x = this.timesCircle.position.x = _s(TrackPresentationPositions[key as keyof typeof TrackPresentationPositions].timesCircle.x);
      this.weatherCircle.position.y = this.timesCircle.position.y = _s(TrackPresentationPositions[key as keyof typeof TrackPresentationPositions].timesCircle.y);
    }

    this.weatherCircle.container.rotation = this.timesCircle.container.rotation = -Math.PI / 4;

    if (!this.useOverlays) {
      this.trackGraphics.setTrackVisibility(false);
      this.animatedRedWhiteTrack.visible = false;
      this.cirlceContainer.visible = false;
    }
  }

  public createAnims(gameLength: GameLength, timeOffset: number) {
    let anims: ITrackPresentationAnims;

    //TODO: place in settings
    let circlestartingTimes = [15.42, 15.82, 16.23, 16.93];

    if (gameLength === 120) anims = TrackPresentation120AnimTimings.lapMapFacts;
    else anims = TrackPresentationAnimTimings[this.gameType as keyof typeof TrackPresentationAnimTimings].lapMapFacts;

    const factAnims = Util.copyArrayOfObjects<IAnimInterval>(anims.items);
    const containerAnims = Util.copyArrayOfObjects<IAnimInterval>([anims.presentationAnim]);

    factAnims.forEach((m) => transformAnim(m, 1, timeOffset));
    containerAnims.forEach((m) => transformAnim(m, 1, timeOffset));
    circlestartingTimes = circlestartingTimes.map((m) => m + timeOffset);

    return {
      factAnims,
      containerAnims,
      circlestartingTimes
    };
  }

  private drawLeadingCircle(progress: number) {
    const { x, y } = this.trackGraphics.getPositionOnTrack(progress, "counterclockwise");
    this.circle.clear();
    this.circle.beginFill(0xff0000);
    this.circle.drawCircle(x, y, _s(8));
    this.circle.endFill();
  }

  private trackAnim = {
    startTime: 0.7,
    duration: 4.8,
    startProgress: 0.68,
    shrinkStartProgress: 0.32,
    endProgress: 0.815,
    rounds: 2
  };

  public update(dt: number) {
    super.update(dt);
    if (!this.containerAnims) return;

    const t = Logic.getVideoTime();

    const anim = Logic.getAnim(t, this.containerAnims, this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;

    AnimHelper.animateIn(t, anim.startTime + 0.24, 0, 1, _s(315), _s(336), (val) => (this.trackGraphics.x = val));
    AnimHelper.animateIn(t, anim.startTime + 0.24, 0, 1, _s(315), _s(336), (val) => (this.animatedRedWhiteTrack.x = val));
    AnimHelper.animateIn(t, anim.startTime + this.trackAnim.duration + 0.3, 0, 1, 1, 0, (val) => (this.circle.alpha = val));

    this.cirlceContainer.children.forEach((container, index) => {
      AnimHelper.animateIn(t, this.circleStartTimes[index], 0, 0.5, 0, 1, (val) => container.scale.set(val));
    });

    const { startTime: s, duration, startProgress, shrinkStartProgress, endProgress, rounds } = this.trackAnim;

    const startTime = anim.startTime + s;
    let progress = startProgress;
    let shrinkProgress = shrinkStartProgress;

    if (t >= startTime && t <= startTime + duration) {
      const elapsed = (t - startTime) / duration;
      const easeInOutElapsed = easeInOutSine(elapsed, 1);
      progress = startProgress + (endProgress - startProgress + rounds) * easeInOutElapsed;
      shrinkProgress = shrinkStartProgress - (0.15 + rounds) * easeInOutElapsed;
    } else if (t < startTime) {
      progress = startProgress;
      shrinkProgress = shrinkStartProgress;
    } else {
      progress = rounds + endProgress;
      shrinkProgress = rounds + shrinkStartProgress;
    }

    const totalProgress = progress - startProgress;
    const clampedProgress = (progress + rounds) % 1;
    const clampedShrinkProgress = (shrinkProgress + rounds) % 1;
    const totalShrinkProcess = Math.abs(Math.min(shrinkProgress + startProgress, 0));

    if (this.useOverlays) this.drawLeadingCircle(clampedProgress);

    if (totalProgress === 0 || totalShrinkProcess > 1) {
      return (this.animatedRedWhiteTrack.visible = false);
    }
    this.animatedRedWhiteTrack.visible = this.useOverlays;

    if (totalProgress > 1) {
      this.animatedRedWhiteTrack.direction = "clockwise";
      this.animatedRedWhiteTrack.setProgress(clampedShrinkProgress);

      this.animatedRedWhiteTrack.drawSegmentOrFullTrack(0.32, clampedShrinkProgress);
    } else {
      this.animatedRedWhiteTrack.direction = "counterclockwise";
      this.animatedRedWhiteTrack.setProgress(totalProgress);
      this.animatedRedWhiteTrack.drawSegmentOrFullTrack(startProgress, clampedProgress, true);
    }

    if (t > this.innerCircleTimes[0].startTime - 2 && t < this.innerCircleTimes[0].startTime + this.innerCircleTimes[0].duration) {
      this.trackGraphics.drawCenterLine(_s(54));
    } else if (t > this.innerCircleTimes[1].startTime && t < this.innerCircleTimes[1].startTime + this.innerCircleTimes[1].duration) {
      this.trackGraphics.drawCenterLine(_s(32));
    }
  }
}
function easeInOutSine(x: number, factor: number = 1): number {
  return -(Math.cos(Math.PI * x * factor) - 1) / 2;
}
