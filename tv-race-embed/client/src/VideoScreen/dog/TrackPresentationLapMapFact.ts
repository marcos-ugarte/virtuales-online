import { Graphics, NineSlicePlane, Text, TextMetrics } from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, settings, Logic } from "client/Logic/Logic";
import { MultiStyleText, ITextStyleSet, IExtendedTextStyle } from "../common/MultiStyleText";
import { AnimHelper } from "../common/Anim";
import { IAnimInterval } from "client/Logic/LogicDefinitions";
import { DogHelper } from "./DogHelper";
import { UIHelper } from "../UIHelper";
import { DrawHelper } from "../common/DrawHelper";
// top right lap info for trackpresentation
// TODO: fade in/out
// TODO: change Text accordingly
// TODO: clip with roundedskewedRectangle mask?
export class TrackPresentationLapMapFact extends Group {
  private line1: MultiStyleText;
  public fadeInTime: number = 0;
  public fadeOutTime: number = Number.MAX_VALUE;
  private anims: IAnimInterval[] = [];
  private alignLeft: boolean;
  private pixiMask: Graphics = new Graphics();
  private background: NineSlicePlane = UIHelper.createNineSlicePlane();
  private availableWidth: number;
  private useOverlays: boolean = true;
  public constructor(anims: IAnimInterval[], alignLeft: boolean, availablewidth: number, oddsAlwaysOn = false) {
    super();
    this.alignLeft = alignLeft;
    this.anims = anims;
    this.availableWidth = availablewidth;
    this.showDebug(settings.debug, undefined, "TrackPresentationLapMapFact");
    this.line1 = new MultiStyleText();
    this.add(this.background);

    this.add(this.line1);

    const texture2 = DrawHelper.createSkewedRoundedRectangleTexture(_s(306), _s(20), _s(2), _s(0), { type: "gradient", verti: true, color: "#E0272D", color2: "#991F24" });
    // { type: "solid", color: "green" }

    this.background.texture = texture2;
    this.background.alpha = 1;
  }
  public fill(lapMapFact: string, availableWidth: number, useOverlays: boolean) {
    UIHelper.fillNineSlicePlane(this.background, this.height);
    this.useOverlays = useOverlays;

    const showDebugTextCol = settings.showDebugTextColor;

    const { default: defaultStyle, b: boldStyle } = TrackPresentationLapMapFactStyles.textStyles(!!showDebugTextCol);

    this.background.scale.x = 0;
    this.updateText(this.line1, lapMapFact, { default: defaultStyle, b: boldStyle });

    this.background.width = this.line1.width + _s(20);

    this.pixiMask = Logic.createPixiMask(0, -4, (this.background.width + _s(20)) / settings.scaleFactor, 40, true);
    this.add(this.pixiMask);
    this.container.mask = this.pixiMask;
    if (!useOverlays) {
      this.background.visible = false;
    }
  }

  private updateText(multiText: MultiStyleText, text: string | undefined, styles?: ITextStyleSet) {
    if (text) {
      if (styles) multiText.styles = styles;
      multiText.textSteps = 30;
      multiText.text = text;
      multiText.visible = true;
      this.showDebug(settings.debug, undefined, "TrackPresentationLapMapFact - " + text);
    } else {
      multiText.visible = false;
    }
  }

  public onLayout(): void {
    this.line1.x = this.alignLeft ? _s(0) : this.line1.width + _s(10);
    this.line1.y = _s(15);

    this.background.pivot.set(this.alignLeft ? 0 : this.line1.width + _s(20), 0.5);
    this.pixiMask.pivot.set(this.alignLeft ? 0 : this.line1.width + _s(40), 0.5);
    this.line1.anchor.set(this.alignLeft ? 0.0 : 1.0, 0.5);

    this.alignLeft ? (this.background.x = -_s(4)) : (this.background.x = this.line1.width + _s(24));
    this.background.height = _s(31);
  }

  public update(dt: number): void {
    super.update(dt);

    const currentVideoTime = Logic.getVideoTime();
    const anim = Logic.getAnim(currentVideoTime, this.anims, this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.background.visible = this.useOverlays;
    this.visible = true;

    const relativeStartTime = currentVideoTime - anim.startTime;
    AnimHelper.animateIn(relativeStartTime, 0, anim.duration, 0.5, 0, 1, (val) => (this.background.scale.x = val));
    AnimHelper.animateIn(relativeStartTime, 0, anim.duration, 0.6, 0, 1, (val) => (this.line1.alpha = val));

    if (this.alignLeft) {
      AnimHelper.animateIn(relativeStartTime, anim.duration, anim.duration, 0.4, -_s(20), -this.line1.width - _s(60), (val) => (this.pixiMask.x = val));
    } else {
      AnimHelper.animateIn(relativeStartTime, anim.duration, anim.duration, 0.6, this.pixiMask.width, -_s(10), (val) => (this.pixiMask.x = val));
    }

    if (currentVideoTime < anim.startTime + anim.duration - 1) {
      AnimHelper.animateIn(relativeStartTime, 0, anim.duration, 0.5, 0, 1, (val) => (this.line1.scale.x = val));
    }
  }
}

export const TrackPresentationLapMapFactStyles = {
  textStyles(showDebug: boolean) {
    return {
      default: this.defaultTextStyle(showDebug),
      b: this.boldTextStyle(showDebug)
    };
  },
  defaultTextStyle(showDebug: boolean): IExtendedTextStyle {
    return {
      fontFamily: "DIN-UltraLightItalic",
      fontSize: _s(20),
      fill: showDebug ? "orange" : DogHelper.getWhiteColor(),
      align: "center",
      maxLines: 1,
      fontStyle: "italic"
    };
  },
  boldTextStyle(showDebug: boolean): IExtendedTextStyle {
    return {
      fontFamily: "DIN-Bold",
      fontSize: _s(20),
      trim: true,
      padding: _s(5),
      letterSpacing: _s(1),
      align: "center",
      fill: showDebug ? "orange" : DogHelper.getWhiteColor()
    };
  }
};
