import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IDog63RoundHistoryAccoppiataEntry } from "client/Logic/LogicDefinitions";
import { Dog63Helper } from "../../Dog63Helper";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";

export class Dog63AccopiataEntry extends Group {
  private driverFirst: PIXI.Text;
  private driverSecond: PIXI.Text;
  private quote: PIXI.Text;
  private barFirst: PIXI.Sprite;
  private barSecond: PIXI.Sprite;

  public constructor() {
    super();

    this.showDebug(settings.debug);

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Regular",
        fontSize: _s(10),
        fill: Dog63Helper.getWhiteColor(),
        align: "left"
      });
      this.driverFirst = Logic.createPixiText(style);
      this.driverFirst.anchor.set(0.5, 0);
      this.add(this.driverFirst);
      this.driverSecond = Logic.createPixiText(style);
      this.driverSecond.anchor.set(0.5, 0);
      this.add(this.driverSecond);
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(14),
        fill: Dog63Helper.getWhiteColor(),
        align: "left"
      });
      this.quote = Logic.createPixiText(style);
      this.quote.anchor.set(0.5, 0);
      this.add(this.quote);
    }

    this.barFirst = new PIXI.Sprite();
    this.barFirst.anchor.set(0.5, 0.5);
    this.add(this.barFirst);
    this.barSecond = new PIXI.Sprite();
    this.barSecond.anchor.set(0.5, 0.5);
    this.add(this.barSecond);
  }

  public fill(accopiata: IDog63RoundHistoryAccoppiataEntry, drivers: IDriver[]): void {
    this.driverFirst.text = "" + (accopiata.firstDriverIndex + 1);
    this.driverSecond.text = "" + (accopiata.secondDriverIndex + 1);
    this.quote.text = Dog63Helper.formatQuote(accopiata.quote, accopiata.betCodeId);

    const driverFirst = drivers[accopiata.firstDriverIndex];
    const driverSecond = drivers[accopiata.secondDriverIndex];
    this.barFirst.texture = DrawHelper.getCachedPattern(6, 32, 0, driverFirst.color, driverFirst.color2, driverFirst.driverPattern);
    this.barSecond.texture = DrawHelper.getCachedPattern(6, 32, 0, driverSecond.color, driverSecond.color2, driverSecond.driverPattern);

    Logic.autoSize(this.quote, _s(30));
  }

  public onLayout(): void {
    const driverY = -1;
    this.driverFirst.x = _s(6);
    this.driverFirst.y = _s(driverY);
    this.driverSecond.x = _s(19.5);
    this.driverSecond.y = _s(driverY);
    this.quote.x = _s(13);
    this.quote.y = _s(16);

    this.barFirst.rotation = (Math.PI * 90.0) / 180.0;
    LayoutHelper.setScaledRectangleSprite(this.barFirst, 6, 12, 4, 14);
    this.barSecond.rotation = (Math.PI * 90.0) / 180.0;
    LayoutHelper.setScaledRectangleSprite(this.barSecond, 6 + 14, 12, 4, 14);
  }

  public updateAnim(baseFactor: number, duration: number): void {}
}
