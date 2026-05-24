import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, settings } from "client/Logic/Logic";
import { MultiStyleText, ITextStyleSet, IExtendedTextStyle } from "../../../common/MultiStyleText";
import { ITrackItem, IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../../common/Anim";
import { DogHelper } from "../../DogHelper";

export class TurnItemDog extends Group {
  private line1: MultiStyleText;
  private line2: MultiStyleText;
  private clippingMask: PIXI.Graphics;
  private curveType: MultiStyleText;
  private interval: MultiStyleText;
  public fadeInTime: number = 0;
  public fadeOutTime: number = Number.MAX_VALUE;

  public anims: IAnimInterval[];
  private oddsAlwaysOn = false;
  public constructor(anims: IAnimInterval[], oddsAlwaysOn = false) {
    super();

    this.showDebug(settings.debug, undefined, "TurnItemDog");

    this.anims = anims;
    this.oddsAlwaysOn = oddsAlwaysOn;
    this.line1 = new MultiStyleText();
    this.add(this.line1);

    this.line2 = new MultiStyleText();
    this.add(this.line2);

    this.curveType = new MultiStyleText();
    // this.curveType.align
    this.add(this.curveType);

    this.interval = new MultiStyleText();
    this.add(this.interval);

    this.clippingMask = Logic.createPixiMask(5, 3, 85, 36, true);
    this.add(this.clippingMask);
  }

  public fill(trackItem: ITrackItem): void {
    {
      const defaultStyle: IExtendedTextStyle = {
        fontFamily: "DIN-UltraLightItalic",
        fontSize: _s(10),
        letterSpacing: _s(1),
        fill: DogHelper.getWhiteColor(),
        valign: "middle",
        maxLines: 1,
        wordWrap: true,
        wordWrapWidth: _s(90),
        fontStyle: "italic"
      };
      const boldStyle: IExtendedTextStyle = {
        fontFamily: "DIN-Medium",
        fontSize: _s(13),
        letterSpacing: _s(1),
        fill: DogHelper.getWhiteColor(),
        valign: "middle"
      };

      this.updateText(this.line1, trackItem.line1, { default: defaultStyle, b: boldStyle });
    }
    {
      const defaultStyle: IExtendedTextStyle = {
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(28),
        maxLines: 1,
        letterSpacing: _s(1),
        fill: DogHelper.getWhiteColor(),
        wordWrap: true,
        wordWrapWidth: _s(85),
        valign: "middle",
        fontStyle: "italic"
      };
      const boldStyle: IExtendedTextStyle = {
        fontFamily: "DIN-Bold",
        fontSize: _s(9),
        maxLines: 1,
        letterSpacing: _s(1),
        fill: DogHelper.getWhiteColor(),
        valign: "middle"
      };
      this.updateText(this.line2, trackItem.line2, { default: defaultStyle, b: boldStyle });
    }
    {
      const defaultStyle: IExtendedTextStyle = {
        fontFamily: "DIN-Medium",
        fontSize: _s(13),
        fill: DogHelper.getWhiteColor(),
        align: "left",
        valign: "middle",
        maxLines: 1
      };
      const boldStyle: IExtendedTextStyle = {
        fontFamily: "DIN-Black",
        fontSize: _s(13),
        fill: DogHelper.getWhiteColor(),
        align: "left",
        valign: "middle",
        maxLines: 1
      };
      this.updateText(this.interval, trackItem.interval, { default: defaultStyle, b: boldStyle });
    }
    {
      const defaultStyle: IExtendedTextStyle = {
        fontFamily: "DIN-Medium",
        fontSize: _s(9),
        fill: DogHelper.getBlackColor(),
        align: "right",
        valign: "middle"
      };
      const boldStyle: IExtendedTextStyle = {
        fontFamily: "DIN-Black",
        fontSize: _s(9),
        fill: DogHelper.getBlackColor(),
        align: "right",
        valign: "middle"
      };
      this.updateText(this.curveType, trackItem.curveType, { default: defaultStyle, b: boldStyle });
    }
    this.interval.anchor.y = 0.0;
    this.line1.anchor.y = 0.0;
    this.line2.anchor.y = 0.0;
    this.curveType.anchor.y = 0.0;
    this.curveType.anchor.x = 0.0;
    this.onLayout();
  }

  private updateText(multiText: MultiStyleText, text: string | undefined, styles?: ITextStyleSet) {
    if (text) {
      if (settings.showDebugTextColor && styles) {
        styles.default.fill = "orange";
      }
      if (styles) multiText.styles = styles;
      multiText.text = text;
      multiText.visible = true;
    } else {
      multiText.visible = false;
    }
  }

  public onLayout() {
    this.line1.x = _s(4);
    this.line1.y = _s(0);
    this.line2.x = _s(4);
    this.line2.y = _s(22);
    this.interval.x = _s(0);
    this.interval.y = _s(-17);
    this.curveType.x = _s(100);
    this.curveType.y = _s(34.5);

    this.line2.mask = this.clippingMask;
  }

  public update(dt: number) {
    super.update(dt);
    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);

    if (!anim) return;

    const baseFactor = t - anim.startTime;
    AnimHelper.animateIn(baseFactor, 0, 3, 1, 0, 1, (val) => (this.line1.alpha = val));

    const fadeInto = _s(4);

    AnimHelper.animateIn(baseFactor, 0, 3, 1, _s(-25), fadeInto, (val) => (this.line2.y = _s(val)));
  }
}
