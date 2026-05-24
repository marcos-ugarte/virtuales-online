import { RouletteHelper } from "./RouletteHelper";
import { settings, _t } from "../../Logic/Logic";
import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import * as PIXI from "pixi.js";
import { GameLength } from "common/Definitions";

export class StatOddArea extends Group {
  private area: string;
  private areaText: PIXI.Text;
  private areaOddText: PIXI.Text;
  private oddBar: PIXI.Graphics;

  public constructor(area: string, renderRect: boolean = true) {
    super();
    this.area = area;
    const rec = new PIXI.Graphics();

    if (renderRect) {
      rec.beginFill(0x7ebd19);
      rec.drawRect(0, 0, _s(90), _s(30));
      rec.endFill();
      this.add(rec);
    }

    this.oddBar = new PIXI.Graphics();
    // Add text
    this.areaText = Logic.createPixiText();
    this.areaText.anchor.set(0.5, 0.5);
    this.areaOddText = Logic.createPixiText();
    this.areaOddText.anchor.set(0.5, 0.5);
    this.areaText.anchor.set(0.5, 0.5);

    const areaNameStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Light",
      fontSize: _s(16),
      trim: true,
      padding: 10,
      fill: 0xffffff
    });
    const oddStyle = RouletteHelper.smallOddTextStyle;
    this.areaOddText.style = oddStyle;
    this.areaText.style = areaNameStyle;
    this.add(this.areaText);
    this.add(this.areaOddText);
    this.add(this.oddBar);
  }

  public onLayout(): void {
    this.areaText.position.x = _s(45);
    this.areaText.position.y = _s(15);

    this.oddBar.lineStyle(_s(13), 0xaaaaaa);
    this.oddBar.position.x = _s(95);
    this.oddBar.position.y = _s(15);

    this.areaOddText.position.y = _s(15);
    if (settings.debug) {
    }
  }

  public resetOddBar(): void {
    this.oddBar.clear();
    this.oddBar.lineStyle(_s(13), 0xaaaaaa);
  }

  public fill(oddNumber: number, gameLength: GameLength, highestOdd: number): void {
    const maxOdd = gameLength === 120 ? (highestOdd > 400 ? highestOdd : 400) : highestOdd > 200 ? highestOdd : 200;
    const maxWidth = _s(121.5);
    const width = (maxWidth / maxOdd) * oddNumber;

    this.areaOddText.position.x = _s(115) + width;
    this.areaOddText.text = oddNumber.toString();

    this.resetOddBar();
    this.oddBar.lineTo(width, 0);
    this.areaText.text = _t(this.area);
  }

  public update(dt: number): void {
    super.update(dt);
  }
}
