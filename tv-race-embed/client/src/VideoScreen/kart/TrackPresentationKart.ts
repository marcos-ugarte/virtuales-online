import { oddsAlwaysOnTrackPresentationTimings, trackPresentationKart120Timings, trackPresentationKartSettings, trackPresentationKartTimings } from "./../../../settings/OddsAlwaysOnSettings";
import { TurnItemKart } from "./TurnItemKart";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings } from "client/Logic/Logic";
import { ITrack, IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { GameLength } from "common/Definitions";
import { KartTrackPresentationSettings } from "settings/TrackPresentationSettings";
import { Graphics } from "pixi.js";

export class TrackPresentationKart extends Group {
  private turns: TurnItemKart[] = [];
  private gameLength: GameLength;
  private withBonus = true;
  private anims: IAnimInterval[] = [];
  private oddsAlwaysOn: boolean;

  public constructor(gameLength: GameLength, oddsAlwaysOn = false) {
    super();

    this.gameLength = gameLength;
    this.oddsAlwaysOn = oddsAlwaysOn;

    this.showDebug(settings.debug, undefined, "TrackPresentationKart");
  }

  public fill(track: ITrack, withBonus: boolean) {
    while (this.turns.length < track.items.length) {
      const turn = new TurnItemKart(this.oddsAlwaysOn);
      this.turns.push(turn);
      this.add(turn);
    }

    for (let i = 0; i < track.items.length; i++) {
      this.turns[i].fill(track.items[i]);
      this.turns[i].visible = true;
    }
    for (let i = track.items.length; i < this.turns.length; i++) {
      this.turns[i].visible = false;
    }

    this.anims = this.createAnims(this.gameLength, withBonus);

    this.onLayout();
  }

  public onLayout() {
    this.updateTurns(this.gameLength, this.withBonus);
  }

  private createAnims(gameLength: GameLength, withBonus: boolean): IAnimInterval[] {
    if (this.oddsAlwaysOn) return oddsAlwaysOnTrackPresentationTimings.kart[gameLength as 120 | 240 | 300];
    this.withBonus = withBonus;
    switch (gameLength) {
      case 120:
        return [];
      case 180:
        return [withBonus ? { startTime: 40.0, duration: 20.0 } : { startTime: 50.0, duration: 20.0 }];
      case 240:
        return [{ startTime: 50.0, duration: 20.0 }];
      case 300:
        return [withBonus ? { startTime: 50.3, duration: 20.0 } : { startTime: 61.0, duration: 20.0 }];
    }

    this.updateTurns(this.gameLength, this.withBonus);
    return [];
  }

  private createTurnAnims(gameLength: GameLength, withBonus: boolean): IAnimInterval[] {
    if (this.oddsAlwaysOn && gameLength === 120) return trackPresentationKart120Timings;
    else if (this.oddsAlwaysOn) return trackPresentationKartTimings;
    switch (gameLength) {
      case 300:
        if (withBonus)
          return [
            { startTime: 0.5, duration: 17.2 }, // finish line
            { startTime: 0.5, duration: 17.2 }, // start line
            { startTime: 2.92, duration: 1.1 }, // turn 01
            { startTime: 3.3, duration: 1.1 }, // turn 02
            { startTime: 4.96, duration: 1.1 }, // turn 03
            { startTime: 6.5, duration: 1.1 }, // turn 04
            { startTime: 9.45, duration: 1.1 }, // turn 05
            { startTime: 9.95, duration: 2.6 }, // Highspeed Section 1
            { startTime: 13, duration: 1.1 }, // turn 06
            { startTime: 13.6, duration: 1.1 }, // H
            { startTime: 15.3, duration: 1.1 }, // Turn 07
            { startTime: 15.8, duration: 1.1 }
          ];
        else
          return [
            { startTime: 0.5, duration: 17.2 }, // finish line
            { startTime: 0.5, duration: 17.2 }, // start line
            { startTime: 2.2, duration: 1.1 }, // turn 01
            { startTime: 2.8, duration: 1.1 }, // turn 02
            { startTime: 4.4, duration: 1.1 }, // turn 03
            { startTime: 5.7, duration: 1.1 }, // turn 04
            { startTime: 8.5, duration: 1.2 }, // turn 05
            { startTime: 9.3, duration: 2.6 }, // Highspeed Section 1
            { startTime: 12.3, duration: 1.1 }, // turn 06
            { startTime: 13.1, duration: 1.1 }, // H
            { startTime: 14.7, duration: 1.1 }, // Turn 07
            { startTime: 15.5, duration: 1.1 }
          ];
      default:
        return [
          { startTime: 1, duration: 17.6 }, // finish line
          { startTime: 1, duration: 17.6 }, // start line
          { startTime: 3, duration: 1.2 }, // turn 01
          { startTime: 3.65, duration: 1.2 }, // turn 02
          { startTime: 5.3, duration: 1.2 }, // turn 03
          { startTime: 6.9, duration: 1.2 }, // turn 04
          { startTime: 9.7, duration: 1.2 }, // turn 05
          { startTime: 10.3, duration: 2.3 }, // Highspeed Section 1
          { startTime: 13.1, duration: 1.2 }, // turn 06
          { startTime: 14.1, duration: 1.0 }, // H
          { startTime: 15.6, duration: 1.2 }, // Turn 07
          { startTime: 16.2, duration: 1.3 }
        ];
    }
  }

  private updateTurns(gameLength: GameLength, withBonus: boolean) {
    if (!this.turns || this.turns.length === 0) {
      return;
    }
    const f = 1;
    const anims = this.createTurnAnims(gameLength, withBonus);
    const { finishLine, turnItemDimensions, startLine, turn1, turn2, turn3, turn4, turn5, turn6, highspeed1, hill, turn7, highspeed2 } = trackPresentationKartSettings;

    let index = 0;
    {
      // Finish Line
      const turn = this.turns[index++];
      turn.turnType = "start_finish";
      turn.x = _s(186);
      turn.y = _s(374.5);

      turn.width = turn.textContainer.width = _s(114);
      turn.height = turn.textContainer.height = _s(20);

      if (this.oddsAlwaysOn) {
        turn.x = _s(finishLine.x);
        turn.y = _s(finishLine.y);
        turn.width = _s(turnItemDimensions.start_finish.width);
        turn.height = _s(turnItemDimensions.start_finish.height);
        turn.textContainer.x = _s(turnItemDimensions.start_finish.textContainerOffset);
        turn.textContainer.width = _s(turnItemDimensions.start_finish.width - turnItemDimensions.start_finish.textContainerOffset);
        turn.textContainer.height = turn.height;
        turn.abbrPosition = {
          x: 13,
          y: 7
        };
      }
      turn.textContainer.container.y = turn.height / 2;

      turn.fadeInTime = anims[0].startTime * f;
      turn.fadeOutTime = anims[0].duration * f;
    }
    {
      // Start Line
      const turn = this.turns[index++];
      turn.x = _s(529);
      turn.y = _s(563);

      turn.width = turn.textContainer.width = _s(114);
      turn.height = turn.textContainer.height = _s(20);

      turn.turnType = "start_finish";
      if (this.oddsAlwaysOn) {
        turn.x = _s(startLine.x);
        turn.y = _s(startLine.y);
        turn.width = _s(turnItemDimensions.start_finish.width);
        turn.height = _s(turnItemDimensions.start_finish.height);
        turn.textContainer.x = _s(turnItemDimensions.start_finish.textContainerOffset);
        turn.textContainer.width = _s(turnItemDimensions.start_finish.width - turnItemDimensions.start_finish.textContainerOffset);
        turn.textContainer.height = turn.height;
        turn.abbrPosition = {
          x: 13,
          y: 7
        };
      }
      turn.textContainer.container.y = turn.height / 2;

      turn.fadeInTime = anims[1].startTime * f;
      turn.fadeOutTime = anims[1].duration * f;
    }
    {
      // Turn 01
      const turn = this.turns[index++];
      turn.x = _s(138);
      turn.y = _s(599);

      turn.width = turn.textContainer.width = _s(108);
      turn.height = turn.textContainer.height = _s(52);

      turn.turnType = "turn";
      if (this.oddsAlwaysOn) {
        turn.y = _s(turn1.y);
        turn.x = _s(turn1.x);

        turn.width = _s(turnItemDimensions.turn.width);
        turn.height = _s(turnItemDimensions.turn.height);

        turn.textContainer.width = _s(turnItemDimensions.turn.width - turnItemDimensions.turn.textContainerOffset);

        turn.textContainer.x = _s(turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.height = turn.height;

        turn.abbrPosition = {
          x: 58,
          y: turnItemDimensions.turn.height / 2
        };
      }
      turn.textContainer.container.y = turn.height / 2;

      turn.fadeInTime = anims[2].startTime * f;
      turn.fadeOutTime = anims[2].duration * f;
    }
    {
      // Turn 02
      const turn = this.turns[index++];
      turn.x = _s(244);
      turn.y = _s(461);

      turn.width = turn.textContainer.width = _s(108);
      turn.height = turn.textContainer.height = _s(52);

      turn.turnType = "turn";
      if (this.oddsAlwaysOn) {
        turn.width = _s(turnItemDimensions.turn.width);
        turn.height = _s(turnItemDimensions.turn.height);

        turn.textContainer.y = _s(1);
        turn.textContainer.x = _s(turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.width = _s(turnItemDimensions.turn.width - turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.height = turn.height;

        turn.x = _s(turn2.x);
        turn.y = _s(turn2.y);

        turn.abbrPosition = {
          x: 60,
          y: turnItemDimensions.turn.height / 2
        };
      }
      turn.textContainer.container.y = turn.height / 2;

      turn.fadeInTime = anims[3].startTime * f;
      turn.fadeOutTime = anims[3].duration * f;
    }
    {
      // Turn 03
      const turn = this.turns[index++];
      turn.x = _s(258);
      turn.y = _s(220);

      turn.width = turn.textContainer.width = _s(108);
      turn.height = turn.textContainer.height = _s(38);

      turn.turnType = "turn";
      if (this.oddsAlwaysOn) {
        turn.x = _s(turn3.x);
        turn.y = _s(turn3.y);

        turn.width = _s(turnItemDimensions.turn.width);
        turn.height = _s(turnItemDimensions.turn.height);

        turn.textContainer.y = _s(1.5);
        turn.textContainer.x = _s(turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.width = _s(turnItemDimensions.turn.width - turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.height = turn.height;

        turn.abbrPosition = {
          x: 60,
          y: turnItemDimensions.turn.height / 2
        };
      }
      turn.textContainer.container.y = turn.height / 2;

      turn.fadeInTime = anims[4].startTime * f;
      turn.fadeOutTime = anims[4].duration * f;
    }
    {
      // Turn 04
      const turn = this.turns[index++];
      turn.x = _s(766);
      turn.y = _s(89);

      turn.width = turn.textContainer.width = _s(108);
      turn.height = turn.textContainer.height = _s(52);

      turn.turnType = "turn";
      if (this.oddsAlwaysOn) {
        turn.x = _s(turn4.x);
        turn.y = _s(turn4.y);

        turn.width = _s(turnItemDimensions.turn.width);
        turn.height = _s(turnItemDimensions.turn.height);

        turn.textContainer.x = _s(turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.width = _s(turnItemDimensions.turn.width - turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.height = turn.height;

        turn.abbrPosition = {
          x: 60,
          y: turnItemDimensions.turn.height / 2
        };
      }
      turn.textContainer.container.y = turn.height / 2;

      turn.fadeInTime = anims[5].startTime * f;
      turn.fadeOutTime = anims[5].duration * f;
    }
    {
      // Turn 05
      const turn = this.turns[index++];
      turn.x = _s(587);
      turn.y = _s(438.5);

      turn.width = turn.textContainer.width = _s(108);
      turn.height = turn.textContainer.height = _s(38);

      turn.turnType = "turn";
      if (this.oddsAlwaysOn) {
        turn.x = _s(turn5.x);
        turn.y = _s(turn5.y);

        turn.width = _s(turnItemDimensions.turn.longWidth);
        turn.height = _s(turnItemDimensions.turn.height);

        turn.textContainer.y = _s(1);
        turn.textContainer.x = _s(turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.width = _s(turnItemDimensions.turn.longWidth - turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.height = turn.height;

        turn.abbrPosition = {
          x: 60,
          y: turnItemDimensions.turn.height / 2
        };
      }
      turn.textContainer.container.y = turn.height / 2;

      turn.fadeInTime = anims[6].startTime * f;
      turn.fadeOutTime = anims[6].duration * f;
    }
    {
      // Highspeed Section 1
      const turn = this.turns[index++];
      turn.x = _s(678);
      turn.y = _s(334.5);

      turn.width = turn.textContainer.width = _s(115);
      turn.height = turn.textContainer.height = _s(18);

      turn.turnType = "highspeed_r";
      if (this.oddsAlwaysOn) {
        turn.x = _s(highspeed1.x);
        turn.y = _s(highspeed1.y);

        turn.width = _s(turnItemDimensions.highspeed.width);
        turn.height = _s(turnItemDimensions.highspeed.height);

        turn.textContainer.x = _s(turnItemDimensions.highspeed.textContainerOffset);
        turn.textContainer.width = _s(turnItemDimensions.highspeed.width - turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.height = turn.height;

        turn.abbrPosition = {
          x: turnItemDimensions.highspeed.width - 18,
          y: turnItemDimensions.highspeed.height / 2
        };
      }
      turn.textContainer.container.y = turn.height / 2;

      turn.fadeInTime = anims[7].startTime * f;
      turn.fadeOutTime = anims[7].duration * f;
    }
    {
      // Turn 06
      const turn = this.turns[index++];
      turn.x = _s(1065);
      turn.y = _s(194);

      turn.width = turn.textContainer.width = _s(108);
      turn.height = turn.textContainer.height = _s(52);

      turn.turnType = "turn";
      if (this.oddsAlwaysOn) {
        turn.x = _s(turn6.x);
        turn.y = _s(turn6.y);

        turn.width = _s(turnItemDimensions.turn.width);
        turn.height = _s(turnItemDimensions.turn.height);

        turn.textContainer.y = _s(1);
        turn.textContainer.x = _s(turnItemDimensions.turn.textContainerOffset);

        turn.textContainer.width = _s(turnItemDimensions.turn.width - turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.height = turn.height;

        turn.abbrPosition = {
          x: 60,
          y: turnItemDimensions.turn.height / 2
        };
      }
      turn.textContainer.container.y = turn.height / 2;

      turn.fadeInTime = anims[8].startTime * f;
      turn.fadeOutTime = anims[8].duration * f;
    }
    {
      // H
      const turn = this.turns[index++];
      turn.x = _s(978);
      turn.y = _s(364);

      turn.width = turn.textContainer.width = _s(108);
      turn.height = turn.textContainer.height = _s(38);

      turn.turnType = "turn";
      if (this.oddsAlwaysOn) {
        turn.x = _s(hill.x);
        turn.y = _s(hill.y);

        turn.width = _s(turnItemDimensions.turn.width);
        turn.height = _s(turnItemDimensions.turn.height);

        turn.textContainer.y = _s(0.5);
        turn.textContainer.x = _s(turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.width = _s(turnItemDimensions.turn.width - turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.height = turn.height;

        turn.abbrPosition = {
          x: 60,
          y: turnItemDimensions.turn.height / 2
        };
      }
      turn.textContainer.container.y = turn.height / 2;

      turn.fadeInTime = anims[9].startTime * f;
      turn.fadeOutTime = anims[9].duration * f;
    }
    {
      // Turn 07
      const turn = this.turns[index++];
      turn.x = _s(790);
      turn.y = _s(641);

      turn.width = turn.textContainer.width = _s(118);
      turn.height = turn.textContainer.height = _s(38);

      turn.turnType = "turn";
      if (this.oddsAlwaysOn) {
        turn.x = _s(turn7.x);
        turn.y = _s(turn7.y);

        turn.width = _s(turnItemDimensions.turn.longWidth);
        turn.height = _s(turnItemDimensions.turn.height);

        turn.textContainer.x = _s(turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.width = _s(turnItemDimensions.turn.longWidth - turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.height = turn.height;

        turn.abbrPosition = {
          x: 60,
          y: turnItemDimensions.turn.height / 2
        };
      }
      turn.textContainer.container.y = turn.height / 2;

      turn.fadeInTime = anims[10].startTime * f;
      turn.fadeOutTime = anims[10].duration * f;
    }
    {
      // HS2
      const turn = this.turns[index++];
      turn.x = _s(623);
      turn.y = _s(664);

      turn.width = turn.textContainer.width = _s(115);
      turn.height = turn.textContainer.height = _s(18);

      turn.turnType = "highspeed_l";
      if (this.oddsAlwaysOn) {
        turn.x = _s(highspeed2.x);
        turn.y = _s(highspeed2.y);

        turn.width = _s(turnItemDimensions.highspeed.width);
        turn.height = _s(turnItemDimensions.highspeed.height);

        turn.textContainer.y = _s(1);
        turn.textContainer.x = _s(turnItemDimensions.highspeed.textContainerOffset);
        turn.textContainer.width = _s(turnItemDimensions.highspeed.width - turnItemDimensions.turn.textContainerOffset);
        turn.textContainer.height = turn.height;

        turn.abbrPosition = {
          x: 14,
          y: turnItemDimensions.highspeed.height / 2
        };
      }
      turn.textContainer.container.y = turn.height / 2;

      turn.fadeInTime = anims[11].startTime * f;
      turn.fadeOutTime = anims[11].duration * f;
    }

    this.turns.forEach((turn) => {
      turn.container.pivot.y = turn.textContainer.container.pivot.y = turn.height / 2;
    });
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) {
      this.visible = false;
      return;
    } else {
      this.visible = true;
    }

    const fadeInTimeFactor = this.gameLength === 300 ? 2 : 1;

    const baseFactor = t - anim.startTime;
    this.setDebugFade(AnimHelper.limit(baseFactor, anim.duration));

    for (const turn of this.turns) {
      const f = baseFactor - turn.fadeInTime;

      AnimHelper.animateInOut(baseFactor, 1, anim.duration, 0.5, 0, 1, (val) => (turn.itemAbbrevation.alpha = val), 0.5, 0);
      if (turn.turnType === "turn") AnimHelper.animateInOut(f, -0.25, turn.fadeOutTime + 0.35, 0.85, turn.itemAbbrevation.x, _s(12), (val) => (turn.itemAbbrevation.x = val), 0.28, _s(60));
      if (turn.turnType === "highspeed_r") AnimHelper.animateInOut(f, -0.42, turn.fadeOutTime + 0.2, 0.4, turn.itemAbbrevation.x, _s(12), (val) => (turn.itemAbbrevation.x = val), 0.3, _s(102));

      if (f >= turn.fadeOutTime) {
        if (turn.turnType === "start_finish") turn.itemAbbrevation.alpha = 1.0 - (f - turn.fadeOutTime) * 4;
        turn.textContainer.alpha = 1.0 - (f - turn.fadeOutTime) * 4;
      } else {
        if (turn.turnType === "start_finish") turn.itemAbbrevation.alpha = AnimHelper.clamp(f * 2 * fadeInTimeFactor);
        turn.textContainer.alpha = AnimHelper.clamp(f * 2 * fadeInTimeFactor);
      }
    }
  }
}
