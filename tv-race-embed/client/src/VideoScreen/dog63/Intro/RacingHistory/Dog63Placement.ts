import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { DriverPattern, IDriver, IHistoryDriver, IHistoryDriverDog63 } from "client/Logic/LogicDefinitions";
import { Dog63Helper } from "../../Dog63Helper";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";

export class Dog63Placement extends Group {
  private topText: PIXI.Text;
  private bar: PIXI.Sprite;
  // TODO: bar
  private bottomText: PIXI.Text;

  public constructor() {
    super();
    this.showDebug(settings.debug, 1, "Dog63Placement");
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(22),
        fill: Dog63Helper.getWhiteColor(),
        align: "center"
      });
      this.topText = Logic.createPixiText(style);
      this.topText.anchor.set(0.5, 1);
      this.add(this.topText);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(17),
        fill: Dog63Helper.getWhiteColor(),
        align: "left",
        letterSpacing: _s(0)
      });
      this.bottomText = Logic.createPixiText(style);
      this.bottomText.anchor.set(0.5, 1);
      this.add(this.bottomText);
    }

    this.bar = new PIXI.Sprite();
    this.bar.anchor.set(0.5, 0.5);
    this.add(this.bar);
  }

  public fill(historyDriver: IHistoryDriverDog63, drivers: IDriver[]): void {
    this.topText.text = "" + (historyDriver.driverIndex + 1);
    this.bottomText.text = Dog63Helper.formatQuote(historyDriver.quote, historyDriver.betCodeId);

    const driver = drivers[historyDriver.driverIndex];
    this.bar.texture = DrawHelper.getCachedPattern(6, 32, 0, driver.color, driver.color2, driver.driverPattern);

    Logic.autoSize(this.bottomText, _s(35));
  }

  public onLayout(): void {
    this.topText.x = _s(17.5);
    this.topText.y = _s(15);
    this.bottomText.x = _s(17.5);
    this.bottomText.y = _s(60.5);

    this.bar.rotation = (Math.PI * 90.0) / 180.0;
    LayoutHelper.setScaledRectangleSprite(this.bar, 16, 19 + 3, 5, 32);
  }

  public updateAnim(baseFactor: number, duration: number): void {}
}
