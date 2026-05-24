import { Group } from "client/Graphics/Group";
import { _s, Logic } from "client/Logic/Logic";
import { DynamicGeometry, DynamicMesh } from "client/Graphics/DynamicMesh";
import { MultiStyleText, IExtendedTextStyle } from "../common/MultiStyleText";
import { AnimHelper } from "../common/Anim";
import { IResult } from "client/Logic/LogicDefinitions";

export class BonusInfoBarKart extends Group {
  private dg = new DynamicGeometry("Pos2Color", 16, 24);
  private background: DynamicMesh;
  private text: MultiStyleText;
  private hasBonus: boolean = false;

  public constructor() {
    super();

    this.background = new DynamicMesh();
    this.background.setPositions(_s([-50, 0, 10, 0, 0, 50, -50, 50]));
    this.background.setIndices([0, 1, 2, 0, 2, 3]);
    this.background.setColors([0xffca290e, 0xffca290e, 0xffca290e, 0xffca290e]);
    this.dg.add(this.background);
    this.add(this.dg);

    this.text = new MultiStyleText();
    this.text.anchor.set(0.5, 0.5);
    this.add(this.text);
  }

  public fill(result: IResult) {
    if (result.jackpotWonText) {
      this.text.text = result.jackpotWonText;
    }
    this.hasBonus = result.jackpotWonText !== undefined;
  }

  public onLayout() {
    this.text.x = this.width * 0.5;
    this.text.y = this.height * 0.5;

    const defaultStyle: IExtendedTextStyle = {
      fontFamily: "DIN-UltraLight",
      fontSize: _s(28),
      fill: "white",
      align: "center",
      valign: "middle",
      wordWrap: true,
      wordWrapWidth: this.width * 0.98,
      lineHeight: _s(25),
      maxLines: 2
    };
    const boldStyle: IExtendedTextStyle = {
      fontFamily: "DIN-Medium",
      fontSize: defaultStyle.fontSize,
      fill: "white"
    };
    this.text.styles = { default: defaultStyle, b: boldStyle };
  }

  private anims = [{ startTime: 55.0, duration: 15.0 }];

  public update(dt: number) {
    super.update(dt);

    if (!this.hasBonus) {
      this.alpha = 0.0;
      return;
    }
    this.alpha = 1.0;

    const t = Logic.getRaceVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const baseFactor = t - anim.startTime;
    const f2 = AnimHelper.easeOut(AnimHelper.clamp(baseFactor - 0.3, 0, 1));
    const f1 = AnimHelper.easeOut(AnimHelper.clamp(baseFactor * 2));

    const w = this.height * 0.5;
    this.background.setPositions([(w * 1) / 3, 0, (w * 1) / 3 + (this.width - (w * 1) / 3) * f1, 0, (-w * 2) / 3 + (this.width + (w * 2) / 3) * f1, this.height, (-w * 2) / 3, this.height]);

    this.alpha = f2;
  }
}
