import { Group } from "client/Graphics/Group";
import { _s, Logic, settings } from "client/Logic/Logic";
import { MultiStyleText, IExtendedTextStyle } from "./../common/MultiStyleText";
import { AnimHelper } from "./../common/Anim";
import { IResult, IAnimInterval } from "client/Logic/LogicDefinitions";
import { UIHelper } from "../UIHelper";
import { GameType, GameLength } from "common/Definitions";
import { DrawHelper } from "../common/DrawHelper";
import { NineSlicePlane } from "pixi.js";

export class BonusInfoBarDog extends Group {
  private text: MultiStyleText;
  private hasBonus: boolean = false;
  private textBackground: NineSlicePlane;
  private anims: IAnimInterval[];

  public constructor(gameType: GameType, gameLength: GameLength) {
    super();

    this.showDebug(settings.debug);

    this.textBackground = UIHelper.createNineSlicePlane();
    this.add(this.textBackground);

    this.text = new MultiStyleText();
    this.text.anchor.set(0.5, 0.5);
    this.add(this.text);
    this.anims = this.createAnims(gameType, gameLength);
  }

  private createAnims(gameType: GameType, gameLength: GameLength): IAnimInterval[] {
    if (gameType === "dog6") {
      switch (gameLength) {
        case 240:
          return [{ startTime: 40.0, duration: 8.3 }]; // dog6
        case 300:
          return [{ startTime: 40.0, duration: 8.3 }]; // dog6
      }
    } else {
      // dog8
      switch (gameLength) {
        case 240:
          return [{ startTime: 40.0, duration: 8.3 }]; // dog6
        case 300:
          return [{ startTime: 40.0, duration: 8.3 }]; // dog6
      }
    }
    return [];
  }

  public fill(result: IResult) {
    if (result.jackpotWonText) {
      this.text.text = result.jackpotWonText;
    }
    this.hasBonus = result.jackpotWonText !== undefined;

    UIHelper.fillNineSlicePlane(this.textBackground, this.height);
    this.textBackground.position.y = 0;
    const skewedRadius = UIHelper.getSkewedRadius(this.height);
    this.textBackground.texture = DrawHelper.createSkewedRoundedRectangleTexture(_s(16), this.height, skewedRadius, 0, { type: "gradient", color: "#c51e1a", color2: "#b21d1d" });
  }

  public onLayout() {
    this.text.x = this.width * 0.5;
    this.text.y = this.height * 0.5;

    const defaultStyle: IExtendedTextStyle = {
      fontFamily: "DIN-UltraLightItalic",
      fontSize: _s(28),
      fill: "white",
      align: "center",
      valign: "middle",
      wordWrap: true,
      wordWrapWidth: this.width * 0.98,
      lineHeight: _s(25),
      maxLines: 2,
      fontStyle: "italic"
    };
    const boldStyle: IExtendedTextStyle = {
      fontFamily: "DIN-MediumItalic",
      fontSize: defaultStyle.fontSize,
      fill: "white",
      fontStyle: "italic"
    };
    this.text.styles = { default: defaultStyle, b: boldStyle };
  }

  public update(dt: number) {
    super.update(dt);

    if (!this.hasBonus) {
      this.alpha = 0.0;
      return;
    }
    this.alpha = 1.0;

    const t = Logic.getRaceVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;

    const baseFactor = t - anim.startTime;
    if (baseFactor < anim.duration - 1) {
      const f1 = AnimHelper.easeOut(AnimHelper.clamp(baseFactor - 0.3, 0, 1));
      this.textBackground.width = this.width * f1;
      this.textBackground.alpha = Math.sqrt(f1);
      this.textBackground.x = (this.width - this.width * f1) * 0.5;

      const f2 = AnimHelper.easeOut(AnimHelper.clamp((baseFactor - 0.7) * 2, 0, 1));
      this.text.alpha = f2;
    } else {
      const f1 = AnimHelper.easeOut(AnimHelper.clamp((anim.duration - baseFactor) * 3));
      this.textBackground.width = this.width * f1;
      this.textBackground.alpha = Math.sqrt(f1);
      this.textBackground.x = (this.width - this.width * f1) * 0.5;

      const f2 = AnimHelper.easeOut(AnimHelper.clamp((anim.duration - baseFactor - 0.2) * 3));
      this.text.alpha = f2;
    }
  }
}
