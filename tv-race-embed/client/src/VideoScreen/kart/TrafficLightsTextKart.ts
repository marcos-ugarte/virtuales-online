import * as PIXI from "pixi.js";
import { DynamicGeometry, DynamicMesh } from "client/Graphics/DynamicMesh";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t } from "client/Logic/Logic";
import { AnimatedText } from "../common/AnimatedText";
import { AnimHelper } from "../common/Anim";
import { IAnimInterval } from "client/Logic/LogicDefinitions";
import { GameLength } from "common/Definitions";
import { Color } from "common/Color";

interface ITrafficLightAnim extends IAnimInterval {
  text: string;
  color: number;
  textColor: number;
}

export class TrafficLightsTextKart extends Group {
  private dg = new DynamicGeometry("Pos2Color", 4, 6);
  private textBackground: DynamicMesh;
  private text: AnimatedText;
  private anims: ITrafficLightAnim[] = [];
  private gameLength: GameLength;

  public constructor(gameLength: GameLength) {
    super();
    this.gameLength = gameLength;

    this.add(this.dg);

    this.textBackground = new DynamicMesh();
    this.textBackground.setPositions([0, 0, 0, 0, 0, 0, 0, 0]);
    this.textBackground.setIndices([0, 1, 2, 0, 2, 3]);
    this.textBackground.setColors([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff]);
    this.dg.add(this.textBackground);

    const style = new PIXI.TextStyle({
      fontFamily: "DIN-Bold",
      fontSize: _s(32),
      fill: "white",
      align: "center"
    });
    this.text = new AnimatedText("", style);
    this.text.anchor.set(0.5);
    this.add(this.text);
  }

  public fill() {
    this.anims = [
      { startTime: 4.0, duration: 43.0, text: _t("activeRaceMotor"), color: 0xff11cb1f, textColor: 0xffffffff },
      { startTime: 48.0, duration: 7.0, text: _t("replay"), color: 0xffff0000, textColor: 0xffffffff },
      { startTime: 54.5, duration: this.gameLength === 300 ? 57.0 : this.gameLength === 60 ? 3 : 18.5, text: _t("result"), color: 0xfff4cb42, textColor: 0x00000000 }
    ];
  }

  public onLayout() {
    this.text.position.y = this.height * 0.5;
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getRaceVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    this.text.setText(anim.text);
    Logic.autoSize(this.text, _s(290));

    let baseFactor = AnimHelper.limit(t - anim.startTime, anim.duration);
    const startFadeOut = Logic.getRaceEndTime() - Logic.getIntroLength() - 1.3;
    if (t > startFadeOut) baseFactor = Math.min(baseFactor, 1.0 - (t - startFadeOut));

    const wta = AnimHelper.easeIn(AnimHelper.clamp(baseFactor * 2));
    const wt = this.width * wta;
    const trafficPositions = [0, 0, wt, 0, wt - _s(27), this.height, _s(-27), this.height];
    this.textBackground.setPositions(trafficPositions);
    this.textBackground.color = anim.color;
    this.textBackground.alpha = wta;

    const wta2 = AnimHelper.easeIn(AnimHelper.clamp((baseFactor - 0.2) * 2));
    this.text.position.x = this.width * 0.5 + _s(-14 - 50 + wta2 * 50);
    this.text.alpha = wta2;
    this.text.tint = Color.ARGBtoHex(anim.textColor);
  }
}
