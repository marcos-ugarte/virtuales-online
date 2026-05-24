import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IDog63RoundHistoryAccoppiata } from "client/Logic/LogicDefinitions";
import { Dog63AccopiataEntry } from "./Dog63AccopiataEntry";
import { Dog63Helper } from "../../Dog63Helper";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";

export class Dog63Accopiata extends Group {
  private accopiata: PIXI.Text;
  private accopiataDescription: PIXI.Text;
  private nio: PIXI.Text;
  private nioQuote: PIXI.Text;
  private io: PIXI.Text;
  private ioQuote: PIXI.Text;
  private entries: Dog63AccopiataEntry[] = [];

  public constructor() {
    super();

    this.showDebug(settings.debug);

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(18),
        fill: Dog63Helper.getWhiteColor(),
        align: "left"
      });
      this.accopiata = Logic.createPixiText(style);
      this.add(this.accopiata);
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(9.5),
        fill: Dog63Helper.getWhiteColor(),
        align: "center"
      });
      this.accopiataDescription = Logic.createPixiText(style);
      this.add(this.accopiataDescription);
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Regular",
        fontSize: _s(10),
        fill: Dog63Helper.getWhiteColor(),
        align: "center"
      });
      this.nio = Logic.createPixiText(style);
      this.nio.anchor.set(0.5, 0);
      this.add(this.nio);
      this.io = Logic.createPixiText(style);
      this.io.anchor.set(0.5, 0);
      this.add(this.io);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(18),
        fill: Dog63Helper.getWhiteColor(),
        align: "center"
      });
      this.nioQuote = Logic.createPixiText(style);
      this.nioQuote.anchor.set(0.5, 0);
      this.nioQuote.tint = Dog63Helper.getBlueColorNumber();
      this.add(this.nioQuote);
      this.ioQuote = Logic.createPixiText(style);
      this.ioQuote.anchor.set(0.5, 0);
      this.add(this.ioQuote);
    }

    for (let i = 0; i < 3; i++) {
      const entry = new Dog63AccopiataEntry();
      this.entries.push(entry);
      this.add(entry);
    }
  }

  public fill(accopiata: IDog63RoundHistoryAccoppiata, drivers: IDriver[]): void {
    this.accopiata.text = _t("twoerPalces");
    this.accopiataDescription.text = _t("twoInThree");
    this.nio.text = _t("notInOrderSh");
    this.io.text = _t("inOrderSh");

    this.nioQuote.text = Dog63Helper.formatQuote(accopiata.nioio.nio.quote, accopiata.nioio.nio.betCodeId);
    this.ioQuote.text = Dog63Helper.formatQuote(accopiata.nioio.io.quote, accopiata.nioio.io.betCodeId);

    for (let i = 0; i < 3; i++) {
      this.entries[i].fill(accopiata.entries[i], drivers);
    }
  }

  public onLayout(): void {
    this.accopiata.x = _s(-1);
    this.accopiata.y = _s(-1.2);

    this.accopiataDescription.x = _s(103);
    this.accopiataDescription.y = _s(5);

    const nioX = 16;
    const ioX = 67;
    const nioY = 27;
    const nioQuoteY = 41;

    this.nio.x = _s(nioX);
    this.nio.y = _s(nioY);
    this.io.x = _s(ioX);
    this.io.y = _s(nioY);
    this.nioQuote.x = _s(nioX);
    this.ioQuote.x = _s(ioX + 1);
    this.ioQuote.y = _s(nioQuoteY);
    this.nioQuote.y = _s(nioQuoteY);

    for (let i = 0; i < 3; i++) {
      LayoutHelper.setScaledRectangle(this.entries[i], 104 + (26 + 17.5) * i, 28, 26, 28);
    }
  }

  public updateAnim(baseFactor: number, duration: number): void {}
}
