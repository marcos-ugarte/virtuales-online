import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDog63RoundHistory } from "client/Logic/LogicDefinitions";
import { Dog63Helper } from "../../Dog63Helper";

export class Dog63Trio extends Group {
  private trio: PIXI.Text;
  private nio: PIXI.Text;
  private io: PIXI.Text;
  private nioQuote: PIXI.Text;
  private ioQuote: PIXI.Text;

  private dispari: PIXI.Text;
  private basso: PIXI.Text;
  private somma2: PIXI.Text;
  private somma3: PIXI.Text;
  private disparyQuote: PIXI.Text;
  private bassoQuote: PIXI.Text;
  private somma2Number: PIXI.Text;
  private somma2Quote: PIXI.Text;
  private somma3Number: PIXI.Text;
  private somma3Quote: PIXI.Text;

  private oddsAlwaysOn: boolean;

  public constructor(oddsAlwaysOn = false) {
    super();

    this.oddsAlwaysOn = oddsAlwaysOn;
    this.showDebug(settings.debug, 1, "Dog63Trio");

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(18),
        fill: Dog63Helper.getWhiteColor(),
        align: "left"
      });
      this.trio = Logic.createPixiText(style);
      this.add(this.trio);
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Regular",
        fontSize: _s(10),
        fill: Dog63Helper.getWhiteColor(),
        align: "center"
        //letterSpacing: _s(-1
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
        fontFamily: "DIN-Light",
        fontSize: _s(10),
        fill: Dog63Helper.getWhiteColor(),
        align: "center"
      });
      this.dispari = Logic.createPixiText(style);
      this.dispari.anchor.set(0.5, 0);
      this.add(this.dispari);
      this.basso = Logic.createPixiText(style);
      this.basso.anchor.set(0.5, 0);
      this.add(this.basso);
      this.somma2 = Logic.createPixiText(style);
      this.somma2.anchor.set(0.5, 0);
      this.add(this.somma2);
      this.somma3 = Logic.createPixiText(style);
      this.somma3.anchor.set(0.5, 0);
      this.add(this.somma3);
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(18),
        fill: Dog63Helper.getWhiteColor(),
        align: "center",
        letterSpacing: _s(0)
      });
      this.nioQuote = Logic.createPixiText(style);
      this.nioQuote.anchor.set(0.5, 0.5);
      this.nioQuote.tint = Dog63Helper.getBlueColorNumber();
      this.add(this.nioQuote);
      this.ioQuote = Logic.createPixiText(style);
      this.ioQuote.anchor.set(0.5, 0.5);
      this.add(this.ioQuote);

      this.disparyQuote = Logic.createPixiText(style);
      this.disparyQuote.anchor.set(0.5, 0.5);
      this.add(this.disparyQuote);
      this.bassoQuote = Logic.createPixiText(style);
      this.bassoQuote.anchor.set(0.5, 0.5);
      this.add(this.bassoQuote);
      this.somma2Number = Logic.createPixiText(style);
      this.somma2Number.anchor.set(0, 0.5);
      this.somma2Number.tint = Dog63Helper.getBlueColorNumber();
      this.add(this.somma2Number);
      this.somma2Quote = Logic.createPixiText(style);
      this.somma2Quote.anchor.set(0.5, 0.5);
      this.add(this.somma2Quote);
      this.somma3Number = Logic.createPixiText(style);
      this.somma3Number.anchor.set(0, 0.5);
      this.somma3Number.tint = Dog63Helper.getBlueColorNumber();
      this.add(this.somma3Number);
      this.somma3Quote = Logic.createPixiText(style);
      this.somma3Quote.anchor.set(0.5, 0.5);
      this.add(this.somma3Quote);
    }
  }

  public fill(row: IDog63RoundHistory): void {
    this.trio.text = _t("theTrio");
    this.nio.text = _t("notInOrderSh");
    this.io.text = _t("inOrderSh");

    this.nioQuote.text = Dog63Helper.formatQuote(row.trio.nio.quote, row.trio.nio.betCodeId);
    this.ioQuote.text = Dog63Helper.formatQuote(row.trio.io.quote, row.trio.io.betCodeId);

    this.dispari.text = row.disparyText;
    this.basso.text = row.bassoText;
    this.somma2.text = _t("sumShort") + " 2";
    this.somma3.text = _t("sumShort") + " 3";
    this.disparyQuote.text = Dog63Helper.formatQuote(row.disparyQuote.quote, row.disparyQuote.betCodeId) + " ";
    this.bassoQuote.text = Dog63Helper.formatQuote(row.bassoQuote.quote, row.bassoQuote.betCodeId) + " ";
    this.somma2Number.text = "" + row.somma2Number;
    this.somma2Quote.text = Dog63Helper.formatQuote(row.somma2Quote.quote, row.somma2Quote.betCodeId) + " ";
    this.somma3Number.text = "" + row.somma3Number;
    this.somma3Quote.text = Dog63Helper.formatQuote(row.somma3Quote.quote, row.somma3Quote.betCodeId) + " ";

    // Logic.autoSize(this.disparyQuote, _s(45));
    // Logic.autoSize(this.bassoQuote, _s(45));
    Logic.autoSize(this.somma2Quote, _s(35));
    Logic.autoSize(this.somma3Quote, _s(35));
  }

  public onLayout(): void {
    this.trio.x = _s(-1);
    this.trio.y = _s(13);

    const nioX = 15;
    const ioX = 60;
    const nioY = 42;
    const nioQuoteY = 63;

    this.nio.x = _s(nioX);
    this.nio.y = _s(nioY);
    this.io.x = _s(ioX);
    this.io.y = _s(nioY);
    this.nioQuote.x = _s(nioX);
    this.ioQuote.x = _s(ioX);
    this.ioQuote.y = _s(nioQuoteY);
    this.nioQuote.y = _s(nioQuoteY);

    const dispariY = 4.5;
    const quote1Y = 15;
    const column1X = 121;
    const column2X = 189;

    this.dispari.x = _s(column1X);
    this.dispari.y = _s(dispariY);
    this.somma2.x = _s(column1X - 3.5);
    this.somma2.y = _s(nioY + 1);
    this.basso.x = _s(column2X);
    this.basso.y = _s(dispariY);
    this.somma3.x = _s(column2X - 1);
    this.somma3.y = _s(nioY + 1);

    const quoteOffset = 10;

    this.disparyQuote.x = _s(column1X + 1);
    this.disparyQuote.y = _s(quote1Y + quoteOffset);
    this.bassoQuote.x = _s(column2X) + 3.5;
    this.bassoQuote.y = _s(quote1Y + quoteOffset);

    this.somma2Number.x = _s(96);
    this.somma2Number.y = _s(nioQuoteY);
    this.somma2Quote.x = _s(133);
    this.somma2Quote.y = _s(nioQuoteY);
    this.somma3Number.x = _s(165);
    this.somma3Number.y = _s(nioQuoteY);
    this.somma3Quote.x = _s(202);
    this.somma3Quote.y = _s(nioQuoteY);
  }

  public updateAnim(baseFactor: number, duration: number): void {}
}
