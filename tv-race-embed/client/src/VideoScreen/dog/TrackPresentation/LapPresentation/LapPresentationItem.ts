import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, settings, Logic, _t } from "client/Logic/Logic";
import { ITrackSegment, IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../../common/Anim";
import { DogHelper } from "../../DogHelper";
import { GameType } from "common/Definitions";

// track segment - e.g. 200
// TODO: position, additional info, clip by mask, ...
export class TrackPresentationLapSegment extends Group {
  private line1: PIXI.Text;
  private lapText: PIXI.Text;
  private lapNumberText: PIXI.Text;
  private mask: PIXI.Graphics = new PIXI.Graphics();
  private clippingMask: PIXI.Graphics;
  public fadeInTime: number = 0;
  public fadeOutTime: number = Number.MAX_VALUE;
  public anims: IAnimInterval[];
  public targetAlpha: number = 0.5; // some segments fade to 0.5, some not
  private oddsAlwaysOn: boolean;
  public constructor(gameType: GameType, withBonus: boolean, anims: IAnimInterval[], oddsAlwaysOn = false) {
    super();
    this.anims = anims;
    this.oddsAlwaysOn = oddsAlwaysOn;
    const fillcolor = DogHelper.getWhiteColor();

    const line1Style = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(18),
      fill: fillcolor,
      align: "right",
      fontStyle: "italic"
    });

    if (this.oddsAlwaysOn) line1Style.fontSize = _s(14);

    const lapTextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-RegularItalic",
      fontSize: _s(9),
      fill: fillcolor,
      align: "right",
      fontStyle: "italic"
    });

    const lapNumberTextStale = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(26),
      fill: fillcolor,
      align: "left",
      fontStyle: "italic"
    });

    this.line1 = Logic.createPixiText(line1Style);
    this.line1.anchor.set(1, 1);
    this.add(this.line1);

    this.lapText = Logic.createPixiText(lapTextStyle, _t("lapTxt"));
    this.lapText.anchor.set(1, 1);
    // this.add(this.lapText);

    this.lapNumberText = Logic.createPixiText(lapNumberTextStale);
    this.lapNumberText.anchor.set(0, 1);
    this.add(this.lapNumberText);

    this.clippingMask = new PIXI.Graphics();

    if (gameType === "horse" && withBonus) {
      // Dont add clipingMask
    } else {
      this.line1.mask = this.clippingMask;
      this.add(this.clippingMask);
    }
  }

  public fill(trackItem: ITrackSegment) {
    this.line1.text = trackItem.line1;
    this.showDebug(settings.debug, undefined, "TrackPresentationLapSegment - " + trackItem.line1);

    if (trackItem.lapNumber !== "") this.lapText.text = _t("lapTxt");
    this.lapNumberText.text = trackItem.lapNumber;
    this.mask = Logic.createPixiMask(-15, 0, this.line1.width + 25, 26);
    this.line1.mask = this.mask;
    this.add(this.mask);
  }

  public onLayout() {
    this.width = _s(81);
    this.height = _s(46);

    this.line1.x = _s(-2);
    this.line1.y = _s(-2);

    this.lapText.x = _s(53);
    this.lapText.y = _s(33);

    this.lapNumberText.x = _s(52);
    this.lapNumberText.y = _s(35);
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;

    const baseFactor = t - anim.startTime;
    AnimHelper.animateIn(baseFactor, 0, 2, 0.8, 0, 20, (val) => (this.line1.y = _s(val)));
    AnimHelper.animateIn(baseFactor, 0, 2, 0.6, anim.fromRight ? 80 : 0, 40, (val) => (this.line1.x = _s(val)));
    AnimHelper.animateIn(baseFactor, 0, 2, 0.5, 0, 1, (val) => (this.line1.scale.x = val));
    AnimHelper.animateIn(baseFactor, 0, 2, 1, 0, 1, (val) => (this.line1.alpha = val));
    AnimHelper.animateIn(baseFactor, 0, 3, 0.4, 0, 1, (val) => (this.lapText.alpha = val));
    AnimHelper.animateIn(baseFactor, 0, 3, 0.4, 0, 1, (val) => (this.lapNumberText.alpha = val));
  }
}
