import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, settings } from "client/Logic/Logic";
import { IAnimInterval } from "client/Logic/LogicDefinitions";
import { Texture } from "pixi.js";
import { UIHelper } from "../UIHelper";
import { AnimHelper } from "../common/Anim";
import { Settings } from "common/Settings";
import { KickboxHelper } from "./KickboxHelper";
import { LanguagesBase } from "client/LogicImplementation/base/LocalisationBase";
import { Util } from "common/Util";

export class HistoryRowRound extends Group {
  private number: PIXI.Text;
  private quote: PIXI.Text;
  private numberBackground: PIXI.Sprite;
  private barSize: number = 0;
  private bar: PIXI.NineSlicePlane;

  private anims: IAnimInterval[] = [{ startTime: 37, duration: 32 }];

  public constructor(ngonTexture: Texture, barTexture: Texture) {
    super();
    this.showDebug(settings.debug, undefined, "HistoryRowRound");

    this.numberBackground = new PIXI.Sprite(ngonTexture);
    this.numberBackground.anchor.set(0.5, 0.5);
    this.add(this.numberBackground);

    const numberStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Bold",
      fontSize: _s(20),
      fill: KickboxHelper.getWhiteColor()
      //fontStyle: "italic"
    });

    this.number = Logic.createPixiText(numberStyle);
    this.number.anchor.set(0.5, 0.5);
    this.add(this.number);

    const quoteStyle = new PIXI.TextStyle({
      fontFamily: "DIN-LightItalic",
      fontSize: _s(14),
      fill: KickboxHelper.getWhiteColor(),
      fontStyle: "italic"
    });

    this.quote = Logic.createPixiText(quoteStyle);
    this.quote.anchor.set(0.0, 0.5);
    this.add(this.quote);

    this.bar = UIHelper.createNineSlicePlane();
    this.bar.texture = barTexture;
    this.add(this.bar);
  }

  public fill(number: number, quote: number, background: number, numberColor: number, barSize: number): void {
    if (number <= 0 || number > 2) {
      this.number.text = "X";
      this.number.scale.set(_s(0.7), _s(0.6));
      numberColor = KickboxHelper.getGrayTextColorNumber();
    } else {
      this.number.text = "" + number;
      this.number.scale.set(_s(1), _s(1));
    }
    this.quote.text = Util.formatValue(quote, Settings.kickboxQuotaDecimalPlaces, LanguagesBase.commaSymbol);
    this.number.tint = numberColor;
    this.numberBackground.tint = background;
    this.bar.tint = background;
    this.barSize = barSize;

    this.onLayout();
  }

  // private updateText(
  //   multiText: MultiStyleText,
  //   text: string | undefined,
  //   styles?: ITextStyleSet
  // ) {
  //   if (text) {
  //     if (styles) multiText.styles = styles;
  //     multiText.text = text;
  //     multiText.visible = true;
  //   } else {
  //     multiText.visible = false;
  //   }
  // }

  public onLayout(): void {
    this.quote.x = _s(43);
    this.quote.y = _s(14);

    this.numberBackground.width = _s(30);
    this.numberBackground.height = _s(30);

    // this.number.x = _s(20);
    // if (this.number.text === "X")
    //   this.number.x = _s(19.5);
    // this.number.y = _s(19);
    this.numberBackground.x = _s(19);
    this.numberBackground.y = _s(20);
    this.number.x = this.numberBackground.x - (this.number.text === "1" ? _s(0.5) : 0);

    this.number.y = _s(20);

    this.bar.x = _s(31);
    this.bar.y = _s(24.5);
    this.bar.width = _s(this.barSize);
    this.bar.height = _s(10);
    this.bar.leftWidth = _s(10);
    this.bar.rightWidth = _s(10);

    // this.title.x = this.width/2;
    // this.title.y = _s(43);

    // LayoutHelper.setScaledRectangle(this.resultBetTables[0], 321, 122, 285, 533);
    // LayoutHelper.setScaledRectangle(this.resultBetTables[1], 681, 122, 285, 533);
  }

  public update(dt: number): void {
    super.update(dt);

    // const t = Logic.getVideoTime();
    // const anim = Logic.getAnim(t, this.anims, this);
    // if (!anim) return;

    //AnimHelper.animateInOut(t, anim.startTime, anim.startTime+anim.duration, 0, 0, 1, x => this.alpha = x, 0, 0);
    // const baseFactor = t - anim.startTime;
  }

  public updateAnims(baseFactor: number): void {
    AnimHelper.animateIn(baseFactor, 0, 1, 0.5, -Math.PI, 0, (x) => (this.numberBackground.rotation = x));
    AnimHelper.animateIn(baseFactor, 0, 1, 0.5, 0, _s(0.85), (x) => this.numberBackground.scale.set(x, x));
    const scaleFactor = 1.0; // (this.number.text === "✖") ? 0.8 : 1.0;
    AnimHelper.animateIn(baseFactor, 0, 1, 0.5, 0, 1 * scaleFactor, (x) => this.number.scale.set(x, x));

    AnimHelper.animateIn(baseFactor, 0, 1, 1, 0, _s(this.barSize * 50), (x) => (this.bar.width = x));
    AnimHelper.animateIn(baseFactor, 0, 1, 1, 0, 1, (x) => (this.quote.alpha = x));
  }
}
