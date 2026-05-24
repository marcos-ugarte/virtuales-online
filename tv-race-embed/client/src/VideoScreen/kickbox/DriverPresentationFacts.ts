import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, settings } from "client/Logic/Logic";
import { MultiStyleText, ITextStyleSet, IExtendedTextStyle } from "./../common/MultiStyleText";
import { IAnimInterval, IDriver } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { KickboxHelper } from "./KickboxHelper";

export class DriverPresentationFacts extends Group {
  private isLeft: boolean;

  private name: MultiStyleText;
  private fighterNumber: PIXI.Text;

  private driverInfos: MultiStyleText[] = [];
  private driverInfosX: number[] = [];
  private nameX: number = 0;

  private driverColor: number = 0;
  private driverColor2: number = 0;

  //private quote: PIXI.Text;

  private anims: IAnimInterval[] = [{ startTime: 2, duration: 18 }];

  public constructor(isLeft: boolean) {
    super();
    this.showDebug(settings.debug, undefined, "DriverPresentationFacts");
    this.isLeft = isLeft;

    this.name = new MultiStyleText();
    this.name.anchor.set(this.isLeft ? 1.0 : 0.0, 0.5);
    this.add(this.name);

    const fighterNumberStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Bold",
      fontSize: _s(55),
      fill: "white" // overwritten when filling in info
    });

    this.fighterNumber = Logic.createPixiText(fighterNumberStyle);
    this.fighterNumber.anchor.set(0.5, 0.5);
    this.add(this.fighterNumber);

    for (let line = 0; line < 6; line++) {
      this.driverInfos.push(new MultiStyleText());
      this.driverInfos[line].anchor.set(0, 0.5);
      this.driverInfosX.push(0);
      this.add(this.driverInfos[line]);
    }

    // this.anims = [{
    //     startTime: 2,
    //     duration: 9
    // }]
  }

  public fill(driver: IDriver): void {
    {
      this.driverColor = driver.color;
      this.driverColor2 = driver.color2 ? driver.color2 : 0;

      const driverText = `<b>${driver.firstName.toUpperCase()} ${driver.lastName.toUpperCase()}</b>`; //  (${driver.heritageShort})
      this.name.text = driverText;
      this.fighterNumber.text = this.isLeft ? "1" : "2";
      if (driver.color2 !== undefined) this.fighterNumber.tint = driver.color2;
      {
        const nameStyleDefault = new PIXI.TextStyle({
          fontFamily: "DIN-BoldItalic",
          fontSize: _s(20),
          trim: true,
          padding: 10,
          fill: driver.color
        });
        const nameStyleHeritage = new PIXI.TextStyle({
          fontFamily: "DIN-UltraLightItalic",
          fontSize: _s(20),
          trim: true,
          padding: 10,
          fill: driver.color,
          fontStyle: "italic"
        });
        this.name.styles = { default: nameStyleHeritage, b: nameStyleDefault };
        KickboxHelper.autoSizeMultiStyleText(this.name, driverText, _s(280), { default: nameStyleHeritage, b: nameStyleDefault });
      }

      let line = 0;
      for (const info of driver.driverInfos) {
        const boldStyle: IExtendedTextStyle = {
          fontFamily: "DIN-BoldItalic",
          fontSize: _s(20),
          fill: "white",
          // valign: "top",
          letterSpacing: _s(-0.5),
          align: this.isLeft ? "left" : "right",
          trim: true,
          padding: 10,
          maxLines: 1
          // wordWrap: true,
          // wordWrapWidth: _s(availableWidth) // _s(90)
        };

        const defaultStyle: IExtendedTextStyle = {
          fontFamily: "DIN-LightItalic",
          fontSize: _s(20),
          letterSpacing: _s(0),
          align: this.isLeft ? "left" : "right",
          trim: true,
          padding: 10,
          fill: "white"
          // valign: "bottom"
        };
        this.driverInfos[line].text = "<b>" + info.key + "</b>" + " " + info.value;
        this.driverInfos[line].tint = driver.color2 ? driver.color2 : 0xffffff;
        KickboxHelper.autoSizeMultiStyleText(this.driverInfos[line], "<b>" + info.key + "</b> " + info.value, _s(260), { default: defaultStyle, b: boldStyle });
        line++;
      }

      this.onLayout();
    }
  }

  /*private updateText(
    multiText: MultiStyleText,
    text: string | undefined,
    styles?: ITextStyleSet
  ) {
    if (text) {
      if (styles)
        multiText.styles = styles;
      multiText.text = text;
      multiText.visible = true;
      if (styles){

        // super hacky - resize the multitext according to the default font - working here because they have neary the same letterdistance
        // and the same fontsize
        // set the fontSize in the styleset
        Logic.autoSize(multiText, _s(260));
        styles.b.fontSize = multiText.style.fontSize;
        styles.default.fontSize = multiText.style.fontSize;
        multiText.styles = styles;
        multiText.text = text;
        //multiText.updateText();
      }
      // if (styles)
      //   styles.default.fontSize = multiText.style.fontSize;

    } else {
      multiText.visible = false;
    }
    // TODO: DOES NOT WORK


  }*/

  public onLayout(): void {
    const xOffset = this.isLeft ? 0 : this.width;

    this.name.x = xOffset + _s(this.isLeft ? 275 : -260);
    this.nameX = this.name.x;
    this.name.y = _s(-17);

    this.fighterNumber.x = xOffset + (this.isLeft ? _s(316) : _s(-302));
    this.fighterNumber.y = _s(0);

    const offsetX = this.isLeft ? 20 : -20;
    const offsetY = 34.4;
    const startX = xOffset + _s(this.isLeft ? 60 : -250);
    const startY = 0;

    let line = 0;
    for (const info of this.driverInfos) {
      info.x = startX + _s(line * offsetX);
      this.driverInfosX[line] = info.x;
      info.y = _s(startY + line * offsetY + offsetY / 2);
      line++;
    }
  }

  public update(dt: number): void {
    super.update(dt);

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const baseFactor = t - anim.startTime;

    AnimHelper.animateInOut(t, anim.startTime, anim.startTime + anim.duration, 0, 0, 1, (x) => (this.alpha = x), 0, 0);
    // const baseFactor = t - anim.startTime;

    let line = 0;
    const timeOffset = 0.31;

    const timeOffsetFadeOut = 0.1;

    const timeOffsetBlink = 0.8;
    const start = 3.0;
    const fadeDuration = 0.2;
    const end = start + 0.6;

    AnimHelper.animateInOut(baseFactor, 0.3, 9.6, 0.5, 0, 1, (x) => (this.name.alpha = x), 0.2, 0.0);
    AnimHelper.animateInOut(baseFactor, 0.3, 9.6, 0.5, _s(this.isLeft ? 100 : -100), 0, (x) => (this.name.x = this.nameX + x), 0.2, _s(this.isLeft ? 100 : -100));

    AnimHelper.animateInOut(baseFactor, 0.3, 9.7, 0.5, 0, 1, (x) => this.fighterNumber.scale.set(x, x), 0.2, 0.0);

    for (const info of this.driverInfos) {
      AnimHelper.animateInOut(
        baseFactor,
        0.8 + line * timeOffset,
        9.5 - line * timeOffsetFadeOut,
        0.8,
        _s(this.isLeft ? 30 : -30),
        0,
        (x) => (info.x = this.driverInfosX[line] + x),
        0.4,
        _s(this.isLeft ? 60 : -60)
      );
      AnimHelper.animateInOut(baseFactor, 0.8 + line * timeOffset, 9.5 - line * timeOffsetFadeOut, 0.5, 0, 1, (x) => (info.alpha = x), 0.3, 0.0);

      // let the text blink
      AnimHelper.animateColorInOut(
        baseFactor,
        start + line * timeOffsetBlink,
        end + line * timeOffsetBlink,
        fadeDuration,
        this.driverColor2,
        this.driverColor,
        (x) => (info.tint = x),
        fadeDuration,
        this.driverColor2
      );

      line++;
    }
  }
}
