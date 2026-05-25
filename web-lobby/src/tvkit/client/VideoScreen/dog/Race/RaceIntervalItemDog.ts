import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, settings, Logic } from "client/Logic/Logic";
import { IIntervalDriver, IDriver } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../common/Anim";

// the Elements below the map in a race
// TODO: position, additional info, clip by mask, ...
export class RaceIntervalItemDog extends Group {
  private racerNameText: PIXI.Text;
  private racerTimeText: PIXI.Text;
  private racerTimeMask: PIXI.Graphics = Logic.createPixiMask(4, 0, 224, 26, true);
  public constructor() {
    super();
    this.showDebug(settings.debug);
    const fillcolor = "white";

    const racerNameStyle = new PIXI.TextStyle({
      fontFamily: "DIN-RegularItalic",
      fontSize: _s(18),
      fill: fillcolor,
      align: "right",
      padding: 2,
      fontStyle: "italic"
    });

    const racerTimeStyle = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLIghtItalic",
      fontSize: _s(18),
      fill: fillcolor,
      align: "right",
      fontStyle: "italic"
    });

    this.racerNameText = Logic.createPixiText(racerNameStyle);
    this.racerNameText.anchor.set(0, 0.5);
    this.add(this.racerNameText);

    this.racerTimeText = Logic.createPixiText(racerTimeStyle);
    this.racerTimeText.anchor.set(1, 0.5);
    this.add(this.racerTimeText);
  }

  public fill(intervalDriver: IIntervalDriver, drivers: IDriver[]) {
    const driver = drivers[intervalDriver.driverIndex];

    this.racerNameText.text = driver.firstName.toUpperCase() + "";
    Logic.autoSize(this.racerNameText, _s(80));
    this.racerTimeText.text = intervalDriver.time;

    this.racerTimeText.mask = this.racerTimeMask;
    this.racerNameText.mask = this.racerTimeMask;

    this.racerTimeText.y = this.height / 2;
    this.racerTimeText.x = this.width - _s(8);
    this.racerNameText.y = this.height / 2;
    this.racerNameText.x = _s(62);

    this.add(this.racerTimeMask);
  }
  public onLayout() {
    this.width = _s(222);
    this.height = _s(25);
  }

  public update(dt: number) {
    super.update(dt);
  }

  public updateAnim(factor: number, duration: number): void {
    AnimHelper.animateInOutDifferentParameters(
      factor,
      1.2,
      duration - 0.1,
      0.2,
      -this.racerTimeMask.width + _s(35),
      -8,
      (val) => (this.racerTimeMask.x = val),
      0.4,
      -8,
      -this.racerTimeMask.width + _s(35),
      (val) => (this.racerTimeMask.x = val)
    );
  }
}
