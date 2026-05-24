import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, settings, _t } from "client/Logic/Logic";
import { MultiStyleText, ITextStyleSet, IExtendedTextStyle } from "./../common/MultiStyleText";
import { IAnimInterval, IDriver } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { KickboxHelper } from "./KickboxHelper";
import { Color } from "common/Color";

export class MiniDriverPresentationKickBox extends Group {
  private isLeft: boolean;

  private name: MultiStyleText;
  private nameX: number = 0;
  private fighterNumber: PIXI.Text;
  private winsText: PIXI.Text;
  private winsTextX: number = 0;

  private anims: IAnimInterval[] = [
    { startTime: 37, duration: 33.03 },
    { startTime: 138.8, duration: 33.03 },
    { startTime: 219.0, duration: 30.5 }
  ];

  public constructor(isLeft: boolean) {
    super();
    this.showDebug(settings.debug, undefined, "MiniDriverPresentation");
    this.isLeft = isLeft;

    this.name = new MultiStyleText();
    this.name.anchor.set(this.isLeft ? 1.0 : 0.0, 0.5);
    this.add(this.name);

    const fighterNumberStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Bold",
      fontSize: _s(40),
      fill: "pink" // overwritten when filling in infos
    });

    this.fighterNumber = Logic.createPixiText(fighterNumberStyle);
    this.fighterNumber.anchor.set(0.5, 0.5);
    this.add(this.fighterNumber);

    const winsTextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(14),
      fill: "pink", // overwritten when filling in infos
      fontStyle: "italic"
    });

    this.winsText = Logic.createPixiText(winsTextStyle);
    this.winsText.anchor.set(this.isLeft ? 1.0 : 0.0, 0.5);
    this.add(this.winsText);

    // this.anims = [{
    //     startTime: 3,
    //     duration: 9
    // }]
  }

  public fill(driver: IDriver): void {
    {
      this.name.text = driver.firstName.toUpperCase() + " " + driver.lastName.toUpperCase();
      this.fighterNumber.text = this.isLeft ? "1" : "2";
      if (driver.color2 !== undefined) {
        driver.color2 = driver.color2 === 0 ? 0x000000 : driver.color2;
        this.fighterNumber.style.fill = driver.color2;
        this.winsText.style.fill = driver.color2;
      }

      this.winsText.text = this.isLeft ? _t("blueWins") : _t("redWins");
      const defaultStyle: IExtendedTextStyle = {
        fontFamily: "DIN-LightItalic",
        fontSize: _s(12),
        fill: driver.color,
        // valign: "top",
        align: this.isLeft ? "left" : "right",
        trim: true,
        padding: 10,
        maxLines: 1,
        // wordWrap: true,
        // wordWrapWidth: _s(availableWidth) // _s(90)
        fontStyle: "italic"
      };

      const boldStyle: IExtendedTextStyle = {
        fontFamily: "DIN-HeavyItalic",
        fontSize: _s(12),
        letterSpacing: _s(1),
        align: this.isLeft ? "left" : "right",
        trim: true,
        padding: 10,
        fill: driver.color,
        // valign: "bottom",
        fontStyle: "italic"
      };

      const heritageShort = driver.heritageShort ? driver.heritageShort : "";
      const driverText = `<b>${driver.firstName.toUpperCase()} ${driver.lastName.toUpperCase()}</b> (${heritageShort})`;
      this.updateText(this.name, driverText, { default: defaultStyle, b: boldStyle });
      KickboxHelper.autoSizeMultiStyleText(this.name, driverText, _s(180), { default: defaultStyle, b: boldStyle });
      this.onLayout();
    }
  }

  private updateText(multiText: MultiStyleText, text: string | undefined, styles?: ITextStyleSet) {
    if (text) {
      if (styles) multiText.styles = styles;
      multiText.text = text;
      multiText.visible = true;
    } else {
      multiText.visible = false;
    }
  }

  public onLayout(): void {
    this.name.x = _s(this.isLeft ? 170 : 56);
    this.name.y = _s(158);
    this.nameX = this.name.x;
    this.fighterNumber.x = this.isLeft ? _s(201.5) : _s(28);
    this.fighterNumber.y = _s(170);

    this.winsText.x = this.isLeft ? _s(172) : _s(59);
    this.winsText.y = this.isLeft ? _s(182) : _s(181); // for some reason left needs to be 1 pixel down according to franz & severin - MS checked with video in different resolutions - this needs to be the same y coordinate for sure
    this.winsTextX = this.winsText.x;
    Logic.autoSize(this.winsText, _s(85));
  }

  public update(dt: number): void {
    super.update(dt);

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const baseFactor = t - anim.startTime;

    AnimHelper.animateInOut(t, anim.startTime, anim.startTime + anim.duration, 0, 0, 1, (x) => (this.alpha = x), 0, 0);
    // const baseFactor = t - anim.startTime;
    AnimHelper.animateInOut(baseFactor, 0.93, anim.duration - 0.4, 0.5, _s(this.isLeft ? 200 : -200), 0, (x) => (this.name.x = x + this.nameX), 0.5, 0);
    AnimHelper.animateInOut(baseFactor, 0.93, anim.duration - 0.4, 0.5, 0, 1, (x) => (this.name.alpha = x), 0.5, 0);
    AnimHelper.animateInOut(baseFactor, 1.4, anim.duration - 0.5, 0.5, _s(this.isLeft ? 100 : -100), 0, (x) => (this.winsText.x = x + this.winsTextX), 0.5, 0);
    AnimHelper.animateInOut(baseFactor, 1.4, anim.duration - 0.5, 0.5, 0, 1, (x) => (this.winsText.alpha = x), 0.5, 0);

    AnimHelper.animateInOut(baseFactor, 1.0, anim.duration - 0.4, 1.5, 0, 1, (x) => this.fighterNumber.scale.set(x, x), 0.5, 0);
  }
}
