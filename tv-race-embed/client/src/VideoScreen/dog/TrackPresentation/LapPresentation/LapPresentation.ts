import { Group } from "client/Graphics/Group";
import { _s, Logic, settings } from "client/Logic/Logic";
import { AnimHelper } from "client/VideoScreen/common/Anim";
import { Track, TrackTextureHelper } from "client/VideoScreen/common/TrackHelper";
import { Container, Graphics } from "pixi.js";
import { Util } from "common/Util";
import { ITrackPresentationAnims, TrackPresentation120AnimTimings, TrackPresentationAnimTimings, TrackPresentationPositions } from "settings/TrackPresentationSettings";
import { GameLength, GameType } from "common/Definitions";
import { IAnimInterval, IGameInfo, ITrack } from "client/Logic/LogicDefinitions";
import { TrackPresentationLapSegment } from "./LapPresentationItem";
export class LapPresentation extends Group {
  private trackGraphics = new Track(233, 371, 5, 0xffffff, Math.PI / 4, "counterclockwise");
  private cirlceContainer = new Container();
  private gameType: GameType;
  private oddsAlwaysOn: boolean;
  private useOverlays: boolean;
  private anims: IAnimInterval[] = [];
  private trackAnims: IAnimInterval[] | undefined;
  private circle = new Graphics();
  private circleStartingTimes: number[] = [];
  private animatedRedWhiteTrack: Track = new Track(233, 371, 5, 0xffffff, Math.PI / 4, "counterclockwise", "redwhite", true);

  private segments: TrackPresentationLapSegment[] = [];

  public constructor(gameInfo: IGameInfo) {
    super();
    this.container.name = "LapPresentation";

    this.gameType = gameInfo.gameType;
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.useOverlays = gameInfo.useOverlays;
    this.trackGraphics.drawFixedTrack();

    const startingBox = this.trackGraphics.createStartingBox("#C1272D", 0.324, undefined, "clockwise");

    const horizontalFinishLineTexture = TrackTextureHelper.createFinishLineTexture(2, 6);
    const verticalFinishLineTexture = TrackTextureHelper.createFinishLineTexture(4, 2);

    const finishLineContainer = this.trackGraphics.createStartingBox(
      0xffffff,
      0.18,
      {
        vertical: verticalFinishLineTexture,
        horizontal: horizontalFinishLineTexture
      },
      "clockwise"
    );

    //TODO: Place in settings
    const circlePlacements = [0.098, 0.815, 0.574, 0.319];

    this.add(this.trackGraphics);

    for (let i = 0; i < 4; i++) {
      const circle = new Graphics();
      circle.beginFill(0xffffff);
      circle.drawCircle(0, 0, _s(5.8));
      circle.endFill();
      const { x, y } = this.trackGraphics.getPositionOnTrack(circlePlacements[i], "clockwise");

      circle.position.set(x, y);
      circle.scale.set(1);
      this.cirlceContainer.addChild(circle);
    }

    this.trackGraphics.container.addChild(startingBox, finishLineContainer);

    this.add(this.animatedRedWhiteTrack);

    this.add(this.cirlceContainer);
    this.add(this.circle);
  }

  public fill(track: ITrack, timeOffset: number) {
    const { lapAnims, containerAnims, circlestartingTimes } = this.createAnims(Logic.implementation.getCurrentIntroGameLength(), timeOffset);
    this.anims = lapAnims;
    this.trackAnims = containerAnims;
    this.circleStartingTimes = circlestartingTimes;

    if (this.oddsAlwaysOn && Logic.implementation.getCurrentIntroGameLength() !== 120) {
      const {
        lapAnims: secondLapAnims,
        containerAnims: secondContainerAnims,
        circlestartingTimes: secondCircleStartingTimes
      } = this.createAnims(Logic.implementation.getCurrentIntroGameLength(), timeOffset);

      this.circleStartingTimes = [...this.circleStartingTimes, ...secondCircleStartingTimes];
      this.anims = [...this.anims, ...secondLapAnims];
      this.trackAnims = [...this.trackAnims, ...secondContainerAnims];
    }

    if (track.segments !== undefined) {
      let i = 0;
      while (this.segments.length < track.segments.length) {
        let anims = [this.anims[i]];
        if (this.anims.length > track.segments.length && this.oddsAlwaysOn) {
          anims = [this.anims[i], this.anims[i + track.segments.length]];
        }
        //console.log("anims ", anims);
        const segment = new TrackPresentationLapSegment(this.gameType, settings.showBonus, anims, this.oddsAlwaysOn);
        this.segments.push(segment);
        segment.fill(track.segments[i]);
        this.add(segment);
        i++;
      }
    }

    this.onLayout();
  }

  public onLayout() {
    this.trackGraphics.y = -_s(10);
    this.circle.rotation = Math.PI / 4;
    this.circle.position.set(_s(334), _s(-10));

    this.cirlceContainer.rotation = Math.PI / 4;
    this.cirlceContainer.position.set(_s(334), _s(-10));
    this.animatedRedWhiteTrack.position.y = _s(-10);

    for (const s of this.segments) {
      s.width = _s(200);
      s.height = _s(110);
    }

    let key: string = this.gameType;
    if (this.oddsAlwaysOn) key = `${this.gameType}_oao`;

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      segment.x = _s(TrackPresentationPositions[key as keyof typeof TrackPresentationPositions].segments[i].x);
      segment.y = _s(TrackPresentationPositions[key as keyof typeof TrackPresentationPositions].segments[i].y);
    }

    if (!this.useOverlays) {
      this.trackGraphics.visible = false;
      this.animatedRedWhiteTrack.visible = false;
      this.cirlceContainer.visible = false;
    }
  }

  public createAnims(gameLength: GameLength, timeOffset: number) {
    let anims: ITrackPresentationAnims;

    //TODO: Put in settings
    let circlestartingTimes = [7.67, 8.16, 8.6, 9.07];

    if (gameLength === 120) anims = TrackPresentation120AnimTimings.segments;
    else anims = TrackPresentationAnimTimings[this.gameType as keyof typeof TrackPresentationAnimTimings].segments;

    const lapAnims = Util.copyArrayOfObjects<IAnimInterval>(anims.items);
    const containerAnims = Util.copyArrayOfObjects<IAnimInterval>([anims.presentationAnim]);

    lapAnims.forEach((m) => this.transformAnim(m, 1, timeOffset));
    containerAnims.forEach((m) => this.transformAnim(m, 1, timeOffset));
    circlestartingTimes = circlestartingTimes.map((m) => m + timeOffset);
    return {
      lapAnims,
      containerAnims,
      circlestartingTimes
    };
  }

  public update(dt: number) {
    super.update(dt);
    if (!this.trackAnims) return;

    const t = Logic.getVideoTime();

    const anim = Logic.getAnim(t, this.trackAnims, this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;

    AnimHelper.animateIn(t, anim.startTime + 0.44, 580.55, 1, _s(315), _s(335), (val) => (this.trackGraphics.x = val));
    AnimHelper.animateIn(t, anim.startTime + 0.44, 580.55, 1, _s(315), _s(335), (val) => (this.animatedRedWhiteTrack.x = val));

    this.cirlceContainer.children.forEach((container, index) => {
      AnimHelper.animateIn(t, this.circleStartingTimes[index], 58.55, 0.5, 0, 1, (val) => container.scale.set(val));
    });

    const animationStartTime = anim.startTime + 0.14;
    const animationDuration = 3;
    const startProgress = 0.68;
    const endProgress = 0.86;
    const rounds = 1;
    let progress = startProgress;
    if (t >= animationStartTime && t <= animationStartTime + animationDuration) {
      const elapsed = (t - animationStartTime) / animationDuration;
      const easeInOutElapsed = easeInOutSine(elapsed, 1);
      progress = startProgress + (endProgress - startProgress + rounds) * easeInOutElapsed;
    } else if (t < animationStartTime) {
      progress = startProgress;
    } else {
      progress = endProgress;
    }

    const totalProgress = progress - startProgress;
    const clampedProgress = (progress + rounds) % 1;

    const { x, y } = this.trackGraphics.getPositionOnTrack(clampedProgress);

    this.circle.clear();

    let tDist = totalProgress;
    if (totalProgress + startProgress === endProgress) {
      tDist = 1;
    }

    if (tDist === 0 || !this.useOverlays) {
      return (this.animatedRedWhiteTrack.visible = false);
    }
    if (!this.useOverlays) {
      this.animatedRedWhiteTrack.visible = false;
    } else {
      this.circle.beginFill(0xff0000);
      this.circle.drawCircle(x, y, _s(8));
      this.circle.endFill();
      this.animatedRedWhiteTrack.visible = true;
    }

    this.animatedRedWhiteTrack.setProgress(tDist);
    this.animatedRedWhiteTrack.drawSegmentOrFullTrack(startProgress, clampedProgress, true);
  }
}
function easeInOutSine(x: number, factor: number = 1): number {
  return -(Math.cos(Math.PI * x * factor) - 1) / 2;
}
