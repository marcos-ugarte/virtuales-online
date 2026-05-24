import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings } from "client/Logic/Logic";
import { AnimatedText } from "../common/AnimatedText";
import { IRaceInterval, IDriver, IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { MultiStyleText } from "../common/MultiStyleText";

class RaceIntervalItemKart extends Group {
  public driverName: MultiStyleText;
  public timeText: AnimatedText;

  public constructor() {
    super();
    const style = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLight",
      fontSize: _s(16),
      fill: "white",
      align: "center"
    });

    this.driverName = new MultiStyleText();
    this.driverName.anchor.set(0, 0.5);
    this.add(this.driverName);

    this.timeText = new AnimatedText("", style);
    this.timeText.anchor.set(1.0, 0.5);
    this.add(this.timeText);
  }

  public onLayout() {
    this.driverName.x = _s(8);
    this.driverName.y = _s(17);
    this.timeText.x = _s(185);
    this.timeText.y = _s(17);
  }

  public update(dt: number) {
    super.update(dt);
  }
}

export class RaceInterval extends Group {
  private headerText: AnimatedText;
  private intervalItems: RaceIntervalItemKart[] = [];
  private intervals: IRaceInterval[] = [];
  private drivers: IDriver[] = [];
  private anims: IAnimInterval[];

  public constructor() {
    super();

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(17),
        fill: "white",
        align: "center"
      });
      this.headerText = new AnimatedText("", style);
      this.headerText.anchor.set(0.0, 0.5);
      this.headerText.setText("");
      this.add(this.headerText);
    }

    this.showDebug(settings.debug, 1, "RaceInterval");

    const first = new RaceIntervalItemKart();
    this.add(first);
    this.intervalItems.push(first);
    const second = new RaceIntervalItemKart();
    this.add(second);
    this.intervalItems.push(second);

    const startTime = 0.01;
    this.anims = [{ startTime, duration: 70 }];
  }

  public fill(intervals: IRaceInterval[], drivers: IDriver[]) {
    this.intervals = intervals;
    this.drivers = drivers;
  }

  public onLayout() {
    this.headerText.x = _s(15);
    this.headerText.y = _s(17);
    for (let i = 0; i < this.intervalItems.length; i++) {
      this.intervalItems[i].x = _s(45);
      this.intervalItems[i].y = _s(30 + i * 33);
    }
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getRaceVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const baseTime = 0.45;
    const interval = Logic.getAnim(t, this.intervals, this, { offsetTime: -baseTime });
    if (interval) {
      if (this.headerText.text !== interval.title) {
        this.headerText.setText(interval.title);
        Logic.autoSize(this.headerText, _s(230));
      }

      const baseFactor = t - (baseTime + interval.startTime);
      const f1 = AnimHelper.clamp(AnimHelper.limit2(baseFactor, interval.duration, 1) * 3);
      this.headerText.alpha = f1;
      this.headerText.animateText(f1);

      for (let i = 0; i < this.intervalItems.length; i++) {
        const item = this.intervalItems[i];
        if (interval.drivers && interval.drivers.length > i) {
          const f2 = t < baseTime + interval.startTime + interval.duration ? AnimHelper.clamp((baseFactor - (0.6 + i * 0.3)) * 3) : AnimHelper.limit(baseFactor, interval.duration) * 3;
          const driverInterval = interval.drivers[i];
          const driver = this.drivers[driverInterval.driverIndex];
          item.driverName.text = driver.firstName.toUpperCase() + " <b>" + driver.lastName.toUpperCase() + "</b>";
          item.driverName.styles = {
            default: {
              fontFamily: "DIN-UltraLight",
              fill: "white",
              fontSize: _s(15),
              letterSpacing: _s(1),
              maxLines: 1,
              wordWrap: true,
              wordWrapWidth: _s(125),
              trim: true,
              padding: 10
            },
            b: {
              fontFamily: "DIN-Medium",
              trim: true,
              padding: 10,
              fill: "white",
              fontSize: _s(15),
              letterSpacing: _s(1)
            }
          };
          item.driverName.anchor.set(0, 0.5);
          item.timeText.setText(driverInterval.time);
          item.driverName.alpha = f2;
          item.driverName.animateText(f2);
          item.timeText.alpha = f2;
          // item.timeText.animateText(f2.val);
        } else {
          item.driverName.alpha = 0;
          item.timeText.alpha = 0;
        }
      }
    }
  }
}
