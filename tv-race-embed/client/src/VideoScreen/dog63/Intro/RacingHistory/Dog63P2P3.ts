import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDog63RoundHistoryP2P3 } from "client/Logic/LogicDefinitions";
import { Dog63Helper } from "../../Dog63Helper";

export class Dog63P2P3 extends Group {
  private name: PIXI.Text;
  private p2: PIXI.Text;
  private p2Quote: PIXI.Text;
  private p3: PIXI.Text;
  private p3Quote: PIXI.Text;

  private hasTwoSlots: boolean;

  public constructor(hasTwoSlots: boolean) {
    super();

    this.showDebug(settings.debug, 1, "Dog63P2P3");

    this.hasTwoSlots = hasTwoSlots;

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Regular",
        fontSize: _s(19),
        fill: Dog63Helper.getWhiteColor(),
        letterSpacing: _s(0.025),
        align: "left"
      });
      this.name = Logic.createPixiText(style);
      this.name.anchor.set(0, 0.5);
      this.add(this.name);
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(14),
        fill: Dog63Helper.getWhiteColor(),
        align: "left"
      });
      this.p2 = Logic.createPixiText(style);
      this.p2.anchor.set(0, 1);
      this.add(this.p2);
      this.p3 = Logic.createPixiText(style);
      this.p3.anchor.set(0, 1);
      this.add(this.p3);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(18),
        fill: Dog63Helper.getWhiteColor(),
        align: "left"
      });
      this.p2Quote = Logic.createPixiText(style);
      this.p2Quote.anchor.set(0, 1);
      this.add(this.p2Quote);
      this.p3Quote = Logic.createPixiText(style);
      this.p3Quote.anchor.set(0, 1);
      this.add(this.p3Quote);
    }
  }

  public fill(history: IDog63RoundHistoryP2P3): void {
    this.name.text = history.name;
    this.p2.text = _t("shortPlace") + "2";
    this.p3.text = _t("shortPlace") + "3";
    this.p2Quote.text = history.quoteP2 === undefined ? "" : Dog63Helper.formatQuote(history.quoteP2.quote, history.quoteP2.betCodeId);
    this.p3Quote.text = Dog63Helper.formatQuote(history.quoteP3.quote, history.quoteP3.betCodeId);

    Logic.autoSize(this.p2Quote, _s(40));
    Logic.autoSize(this.p3Quote, _s(40));
  }

  public onLayout(): void {
    this.name.x = _s(0);
    this.name.y = _s(4);

    const bottomLineY = 54;
    this.p2.x = _s(-2);
    this.p2.y = _s(bottomLineY);

    this.p3.x = _s(54);
    this.p3.y = _s(bottomLineY);

    this.p2Quote.x = _s(17.5);
    this.p2Quote.y = _s(bottomLineY);
    this.p3Quote.x = _s(77.2);
    this.p3Quote.y = _s(bottomLineY);

    if (!this.hasTwoSlots) {
      this.p2.visible = false;
      this.p2Quote.visible = false;
      this.p3.x = this.p2.x;
      this.p3Quote.x = this.p2Quote.x;
    }
  }

  public updateAnim(baseFactor: number, duration: number): void {}
}
