import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, settings, Logic } from "client/Logic/Logic";
import { IRaceInterval, IDriver, ITrack } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../common/Anim";
import { RaceIntervalItemDog as RaceIntervalItemDog } from "./RaceIntervalItemDog";
import { GameType } from "common/Definitions";
import { RaceElementPositions, RaceElementAnimTimings } from "../../../../settings/RaceElementsSettings";
export class RaceIntervalsDog extends Group {
  private intervals: IRaceInterval[] = [];
  private drivers: IDriver[] = [];
  private lastAnim: IRaceInterval | undefined;

  private intervalText: PIXI.Text;
  private clippingMaskInterval: PIXI.Graphics = Logic.createPixiMask(0, 187, this.width + 120, 12, true);
  public intervallItems: RaceIntervalItemDog[] = [];
  private gameType: GameType;

  public constructor(gameType: GameType) {
    super();
    this.showDebug(settings.debug, undefined, "RaceIntervalsDog");

    this.gameType = gameType;
    const fillcolor = "white";

    const intervalStyle = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLightItalic",
      fontSize: _s(9),
      letterSpacing: _s(4.37),
      fill: fillcolor,
      align: "right",
      fontStyle: "italic"
    });

    this.intervalText = Logic.createPixiText(intervalStyle);
    this.intervalText.anchor.set(0, 0);
    this.add(this.intervalText);

    const dog1 = new RaceIntervalItemDog();
    this.intervallItems.push(dog1);
    this.add(dog1);

    const dog2 = new RaceIntervalItemDog();
    this.intervallItems.push(dog2);
    this.add(dog2);

    const dog3 = new RaceIntervalItemDog();
    this.intervallItems.push(dog3);
    this.add(dog3);
  }

  public fill(track: ITrack, raceIntervals: IRaceInterval[], drivers: IDriver[]) {
    this.intervals = raceIntervals;
    this.drivers = drivers;
  }

  public onLayout() {
    for (let index = 0; index < this.intervallItems.length; index++) {
      const intervalItem = this.intervallItems[index];
      intervalItem.x = _s(RaceElementPositions[this.gameType as keyof typeof RaceElementPositions].intervalItems[index].x);
      intervalItem.y = _s(RaceElementPositions[this.gameType as keyof typeof RaceElementPositions].intervalItems[index].y);
    }

    this.intervalText.mask = this.clippingMaskInterval;
    this.add(this.clippingMaskInterval);
  }

  public update(dt: number): void {
    super.update(dt);

    const currentVideoTime = Logic.getRaceVideoTime();

    // get interval
    const anim = Logic.getAnim(currentVideoTime, this.intervals, this);
    if (!anim) return;
    this.showDebugTime("RaceIntervalsDog", currentVideoTime);

    // todo
    this.intervalText.text = anim.title;

    // if interval is different from last => fill interval items (lines)
    if (anim.drivers && anim !== this.lastAnim) {
      this.intervallItems[0].fill(anim.drivers[0], this.drivers);
      this.intervallItems[1].fill(anim.drivers[1], this.drivers);
      if (anim.drivers.length > 2) this.intervallItems[2].fill(anim.drivers[2], this.drivers);
      else this.intervallItems[2].visible = false;
      this.lastAnim = anim;
    }
    // update interval items => itemDuration may be tweaked per interveral?
    const itemDuration = anim.duration;
    //

    for (let index = 0; index < this.intervallItems.length; index++) {
      const intervalItem = this.intervallItems[index];

      const startOffset = RaceElementAnimTimings[this.gameType as keyof typeof RaceElementAnimTimings].intervalItems[index].startTime;
      const durOffset = RaceElementAnimTimings[this.gameType as keyof typeof RaceElementAnimTimings].intervalItems[index].duration;

      // Dog 8 has upside down animations
      let individualDuration = itemDuration;
      if (this.gameType === "dog8" && index <= 0) {
        // so for dog 8 first driver needs to be faded out later
        individualDuration = itemDuration + 0.5;
      }

      intervalItem.updateAnim(currentVideoTime - anim.startTime - startOffset, individualDuration - durOffset);

      intervalItem.alpha = anim.drivers ? 1 : 0;
    }

    const intervalTextY = 189;

    this.intervalText.x = _s(11);
    this.intervalText.y = _s(intervalTextY);
    this.intervalText.tint = anim.drivers ? 0xffffff : 0x000000;

    const baseFactor = currentVideoTime - anim.startTime;

    const intervalTestStartOffset = this.gameType === "dog6" ? 0.0 : 0.2;
    const durationOffset = anim.drivers ? (this.gameType === "dog6" ? -0.2 : -1.1) : 0.0;

    if (baseFactor < anim.duration - 1) {
      if (anim.drivers) {
        AnimHelper.animateInOut(baseFactor, intervalTestStartOffset, anim.duration, 0.5, 20, 0, (val) => (this.clippingMaskInterval.y = val), 0.5, _s(189 + 20));
      } else {
        AnimHelper.animateInOut(baseFactor, intervalTestStartOffset, anim.duration, 0.5, _s(-200), _s(11), (val) => (this.intervalText.x = val), 0.5, _s(-200));
      }
    } else {
      // fade out
      this.intervalText.y = _s(intervalTextY + 20 * (anim.duration - baseFactor + durationOffset) * 2.5);
    }
    // todo: check other games --> Dog6 ok
    AnimHelper.animateInOut(baseFactor, intervalTestStartOffset, anim.duration + durationOffset, 0.5, _s(intervalTextY), _s(intervalTextY), (val) => (this.intervalText.y = val), 0.5, _s(187 + 20));
  }
}
