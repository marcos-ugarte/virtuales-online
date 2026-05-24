import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, settings } from "client/Logic/Logic";
import { IAnimInterval, IDriver } from "client/Logic/LogicDefinitions";
import { IExtendedTextStyle, MultiStyleText } from "../common/MultiStyleText";
import { AnimHelper } from "../common/Anim";
import { KickboxHelper } from "./KickboxHelper";

export class BoxRingPresentationFighter extends Group {
  private fighterName: MultiStyleText;
  private fighterNumber: PIXI.Text;
  private corner: PIXI.Text;

  private isLeft: boolean;

  private anims: IAnimInterval[] = [{ startTime: 37, duration: 32 }];

  public constructor(isLeft: boolean) {
    super();
    this.showDebug(settings.debug, undefined, "BoxRingPresentationFighter");

    this.isLeft = isLeft;

    {
      this.fighterName = new MultiStyleText();
      this.fighterName.anchor.set(isLeft ? 1.0 : 0.0, 0.5);
      const defaultStyle: IExtendedTextStyle = {
        fontFamily: "DIN-LightItalic",
        fontSize: _s(19),
        fill: "white",
        maxLines: 1,
        // wordWrap: true,
        // wordWrapWidth: _s(availableWidth) // _s(90),
        fontStyle: "italic"
      };
      const boldStyle: IExtendedTextStyle = {
        fontFamily: "DIN-HeavyItalic",
        fontSize: _s(19),
        fill: "white",
        letterSpacing: _s(1),
        fontStyle: "italic"
      };
      this.fighterName.styles = { default: defaultStyle, b: boldStyle };
      this.add(this.fighterName);
    }

    {
      const fighterNumberStyle = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(54),
        fill: "white"
      });

      this.fighterNumber = Logic.createPixiText(fighterNumberStyle);
      this.fighterNumber.anchor.set(0.5, 0.5);
      this.add(this.fighterNumber);
    }

    {
      const cornerStyle = new PIXI.TextStyle({
        fontFamily: "DIN-LightItalic",
        fontSize: _s(20),
        fill: this.isLeft ? "black" : "white",
        fontStyle: "italic"
      });
      this.corner = Logic.createPixiText(cornerStyle);
      this.corner.anchor.set(isLeft ? 1.0 : 0.0, 0.5);
      this.add(this.corner);
    }
  }

  public fill(driverIndex: number, driver: IDriver, cornerText: string) {
    this.fighterNumber.text = (driverIndex + 1).toString();

    const heritageShort = driver.heritageShort ? driver.heritageShort : "";
    this.fighterName.text = `<b>${driver.firstName.toUpperCase()} ${driver.lastName.toUpperCase()}</b> (${heritageShort})`;
    {
      const defaultStyle: IExtendedTextStyle = {
        fontFamily: "DIN-LightItalic",
        fontSize: _s(19),
        fill: "white",
        maxLines: 1,
        trim: true,
        padding: 10,
        // wordWrap: true,
        // wordWrapWidth: _s(availableWidth) // _s(90),
        fontStyle: "italic"
      };
      const boldStyle: IExtendedTextStyle = {
        fontFamily: "DIN-HeavyItalic",
        fontSize: _s(19),
        fill: "white",
        letterSpacing: _s(1),
        trim: true,
        padding: 10,
        fontStyle: "italic"
      };
      KickboxHelper.autoSizeMultiStyleText(this.fighterName, this.fighterName.text, _s(280), { default: defaultStyle, b: boldStyle });
    }

    this.fighterName.tint = driver.color;
    this.corner.text = cornerText;

    if (driver.color2 !== undefined) this.fighterNumber.tint = driver.color2;

    this.onLayout();
  }

  public onLayout() {
    this.fighterNumber.x = _s(this.isLeft ? 320 : 84);
    this.fighterNumber.y = _s(32);

    this.fighterName.x = _s(this.isLeft ? 266 : 132);
    this.fighterName.y = _s(49);

    this.corner.x = _s(this.isLeft ? 282 : 121);
    this.corner.y = _s(88);

    Logic.autoSize(this.corner, _s(135));
  }

  public update(dt: number) {
    super.update(dt);

    // const t = Logic.getVideoTime();
    // const anim = Logic.getAnim(t, this.anims, this);
    // if (!anim) return;

    //AnimHelper.animateInOut(t, anim.startTime, anim.startTime+anim.duration, 0, 0, 1, x => this.alpha = x, 0, 0);
    // const baseFactor = t - anim.startTime;
  }

  public updateAnims(baseFactor: number, duration: number) {
    AnimHelper.animateInOut(baseFactor, 0, duration - 0.3, 1, 0, 1, (x) => this.fighterNumber.scale.set(x, x), 0.3, 0);

    const fighterNameX = this.isLeft ? 266 : 132;
    const cornerX = this.isLeft ? 282 : 121;

    AnimHelper.animateIn(baseFactor, 0, duration, 0.8, _s((this.isLeft ? 150 : -150) + fighterNameX), _s(fighterNameX), (x) => (this.fighterName.x = x));
    AnimHelper.animateInOut(baseFactor, 0, duration - 0.3, 1.0, 0, 1, (alpha) => (this.fighterName.alpha = alpha), 0.5, 0);

    AnimHelper.animateIn(baseFactor, 0.4, duration, 0.7, _s((this.isLeft ? 150 : -150) + cornerX), _s(cornerX), (x) => (this.corner.x = x));
    AnimHelper.animateInOut(baseFactor, 0.4, duration - 0.3, 0.7, 0, 1, (alpha) => (this.corner.alpha = alpha), 0.5, 0);
  }
}
