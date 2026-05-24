import { Group } from "client/Graphics/Group";
import { _s, Logic } from "client/Logic/Logic";
import { AnimHelper } from "client/VideoScreen/common/Anim";
import { Track, TrackTextureHelper } from "client/VideoScreen/common/TrackHelper";
import { Container } from "pixi.js";
import { TurnItemDog } from "./TurnPresentationItem";
import { Util } from "common/Util";
import { ITrackPresentationAnims, TrackPresentation120AnimTimings, TrackPresentationAnimTimings, TrackPresentationPositions } from "settings/TrackPresentationSettings";
import { GameLength, GameType } from "common/Definitions";
import { IAnimInterval, IGameInfo, ITrack } from "client/Logic/LogicDefinitions";

export class TurnPresentation extends Group {
  private startingBoxContainer: Container = new Container();
  private turnTexts: TurnItemDog[] = [];
  private gameType: GameType;
  private oddsAlwaysOn: boolean;
  private useOverlays: boolean;
  private anims: IAnimInterval[] = [];
  private containerAnims: IAnimInterval[] | undefined;
  private boxStartingTimes: number[] = [];
  private track = new Track(210, 334, 5, 0xffffff, Math.PI / 4, "clockwise", undefined, true);

  public constructor(gameInfo: IGameInfo) {
    super();

    this.gameType = gameInfo.gameType;
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.useOverlays = gameInfo.useOverlays;

    this.container.name = "TurnPresentation";

    const container1 = this.track.createStartingBox("#C1272D", 0.324);
    const container2 = this.track.createStartingBox("#398032", 0.8);
    const container3 = this.track.createStartingBox("#F3A300", 0.714);
    const container4 = this.track.createStartingBox("#018AD6", 0.39);

    const horizontalFinishLineTexture = TrackTextureHelper.createFinishLineTexture(2, 6);
    const verticalFinishLineTexture = TrackTextureHelper.createFinishLineTexture(4, 2);

    const finishLineContainer = this.track.createStartingBox(0xffffff, 0.18, {
      vertical: verticalFinishLineTexture,
      horizontal: horizontalFinishLineTexture
    });

    this.add(this.track);

    this.startingBoxContainer.rotation = Math.PI / 4;
    this.startingBoxContainer.addChild(container4, container3, container2, container1, finishLineContainer);
    this.add(this.startingBoxContainer);
  }

  public fill(track: ITrack, timeOffset: number) {
    const { turnAnims, containerAnims, boxStartingTimes } = this.createAnims(Logic.implementation.getCurrentIntroGameLength(), timeOffset);

    this.anims = turnAnims;
    this.containerAnims = containerAnims;
    this.boxStartingTimes = boxStartingTimes;

    if (this.oddsAlwaysOn && Logic.implementation.getCurrentIntroGameLength() !== 120) {
      const { turnAnims: secondTurnAnims, containerAnims: secondContainerAnims } = this.createAnims(Logic.implementation.getCurrentIntroGameLength(), timeOffset);

      this.anims = [...this.anims, ...secondTurnAnims];
      this.containerAnims = [...this.containerAnims, ...secondContainerAnims];
    }

    {
      let i = 0;
      while (this.turnTexts.length < track.items.length) {
        let anims = [this.anims[i]];
        if (this.anims.length > track.items.length && this.oddsAlwaysOn) {
          anims = [this.anims[i], this.anims[i + track.items.length]];
        }
        const turn = new TurnItemDog(anims, this.oddsAlwaysOn);
        this.turnTexts.push(turn);
        this.add(turn);
        i++;
      }
    }

    for (let i = 0; i < track.items.length; i++) {
      this.turnTexts[i].fill(track.items[i]);
      this.turnTexts[i].visible = true;
    }
    for (let i = track.items.length; i < this.turnTexts.length; i++) {
      this.turnTexts[i].visible = false;
    }
    this.onLayout();
  }

  public onLayout() {
    this.container.y = -_s(6);
    let key: string = this.gameType;
    if (this.oddsAlwaysOn) key = `${this.gameType}_oao`;
    for (let i = 0; i < this.turnTexts.length; i++) {
      const turn = this.turnTexts[i];
      turn.x = _s(TrackPresentationPositions[key as keyof typeof TrackPresentationPositions].turns[i].x);
      turn.y = _s(TrackPresentationPositions[key as keyof typeof TrackPresentationPositions].turns[i].y);
    }

    if (!this.useOverlays) {
      this.track.visible = false;
      this.startingBoxContainer.visible = false;
    }
  }

  public createAnims(gameLength: GameLength, timeOffset: number) {
    let anims: ITrackPresentationAnims;
    // TODO: in den settings setzen
    let boxStartingTimes = [2.33, 2.86, 2.88, 3.13, 3.83];

    if (gameLength === 120) anims = TrackPresentation120AnimTimings.turns;
    else anims = TrackPresentationAnimTimings[this.gameType as keyof typeof TrackPresentationAnimTimings].turns;

    const containerAnims = Util.copyArrayOfObjects<IAnimInterval>([anims.presentationAnim]);
    const turnAnims = Util.copyArrayOfObjects<IAnimInterval>(anims.items);
    turnAnims.forEach((m) => this.transformAnim(m, 1, timeOffset));
    containerAnims.forEach((m) => this.transformAnim(m, 1, timeOffset));
    boxStartingTimes = boxStartingTimes.map((m) => m + timeOffset);
    return {
      turnAnims,
      containerAnims,
      boxStartingTimes
    };
  }

  public update(dt: number) {
    super.update(dt);
    const currentVideoTime = Logic.getVideoTime();

    const anim = Logic.getAnim(currentVideoTime, this.containerAnims, this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;

    if (this.useOverlays) {
      AnimHelper.animateIn(currentVideoTime, anim.startTime, 580.55, 1, _s(315), _s(330), (val) => (this.startingBoxContainer.x = val));
      AnimHelper.animateIn(currentVideoTime, anim.startTime, 580.55, 1, _s(315), _s(331), (val) => (this.track.x = val));

      this.startingBoxContainer.children.forEach((container, index) => {
        AnimHelper.animateIn(currentVideoTime, this.boxStartingTimes[index], 580.55, 0.8, 0, 0.76, (val) => (container.alpha = val));
      });

      if (this.track.progress !== 1) {
        this.track.drawAnimatedTrack(
          {
            start: anim.startTime + 0.2,
            end: 580.55
          },
          currentVideoTime,
          {
            trackStartsAt: 0.4,
            speedOfTrackAnim: 0.5,
            growAnimation: true,
            speedOfGrowAnim: 0.25,
            initialTrackLength: 0.8,
            stopWhenDone: true
          }
        );
      } else {
        this.track.drawFixedTrack();
      }
    }
  }
}
