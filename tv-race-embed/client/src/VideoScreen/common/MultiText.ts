import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Util } from "common/Util";
import { IPointLike } from "common/Definitions";
import { TextStyle } from "pixi.js";
import { settings } from "client/Logic/Logic";

export interface IMultiTextStyles {
  default: PIXI.TextStyle;
  [key: string]: PIXI.TextStyle;
}

export type MultiTextAlign = "left" | "center" | "right";

export class MultiText extends Group {
  private pixiTexts: PIXI.Text[] = [];
  private texts: string[] = [];
  private styles: PIXI.TextStyle[] = [];
  private offsets: number[] = [];
  private totalLetters: number = 0;
  public align: MultiTextAlign = "left";
  private _anchor: IPointLike = { x: 0, y: 0 };

  public constructor(texts?: string[], styles?: PIXI.TextStyle[], align?: MultiTextAlign) {
    super();

    if (align === undefined) align = "left";
    if (styles === undefined) styles = [];
    if (texts === undefined) texts = [];

    this.align = align;
    this.styles = styles;

    if (settings.showDebugTextColor) {
      for (const style of this.styles) {
        style.fill = "orange";
      }
    }

    for (const __ of texts) {
      this.appendPixiText();
    }
    this.offsets.push(0);
    this.updateTexts(texts, styles);
  }

  private appendPixiText() {
    this.offsets.push(0);
    const text = new PIXI.Text("");
    text.anchor.set(this._anchor.x, this._anchor.y);
    text.roundPixels = true;
    this.container.addChild(text);
    this.pixiTexts.push(text);
    return text;
  }

  public static empty() {
    return new MultiText([], [], "left");
  }

  public static fromName(texts: string[], fontSize?: number) {
    if (!fontSize) fontSize = 22;
    const style1 = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLight",
      fontSize,
      fill: "white",
      trim: true,
      padding: 10
    });
    const style2 = new PIXI.TextStyle({
      fontFamily: "DIN-Medium",
      fontSize,
      fill: "white",
      trim: true,
      padding: 10
    });
    return new MultiText(texts, [style1, style2], "left");
  }

  public updateName(texts: string[], fontSize?: number) {
    if (!fontSize) fontSize = 22;
    const style1 = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLight",
      fontSize,
      fill: "white"
    });
    const style2 = new PIXI.TextStyle({
      fontFamily: "DIN-Medium",
      fontSize,
      fill: "white"
    });
    this.updateTexts(texts, [style1, style2]);
  }

  public static fromText(text: string, styles: IMultiTextStyles, align?: MultiTextAlign) {
    if (!align) align = "left";
    const mt = new MultiText();
    mt.align = align;
    mt.updateText(text, styles);
    return mt;
  }

  public updateText(text: string, styles: IMultiTextStyles) {
    const retTexts: string[] = [];
    const retStyles: PIXI.TextStyle[] = [];
    const stylesStack: PIXI.TextStyle[] = [styles.default];

    let textStart = 0;
    let tagItemStart: number = -1;
    let parsedTag = "";
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      switch (ch) {
        case "<": {
          const subText = text.substr(textStart, i - textStart);
          if (subText.length > 0) {
            retTexts.push(subText);
            retStyles.push(stylesStack[stylesStack.length - 1]);
          }
          tagItemStart = i;
          break;
        }
        case ">": {
          textStart = i + 1;
          parsedTag = text.substr(tagItemStart + 1, i - tagItemStart - 1);
          parsedTag.trim();
          if (parsedTag.startsWith("/")) {
            parsedTag = parsedTag.substr(1);
            parsedTag.trim();
            stylesStack.pop();
          } else {
            if (styles[parsedTag]) stylesStack.push(styles[parsedTag]);
            else stylesStack.push(stylesStack[stylesStack.length - 1]);
          }
          break;
        }
      }
    }

    {
      const subText = text.substr(textStart);
      if (subText.length > 0) {
        retTexts.push(subText);
        retStyles.push(stylesStack[stylesStack.length - 1]);
      }
    }
    this.updateTexts(retTexts, retStyles);
  }

  public setAnchor(x: number, y: number) {
    this._anchor = { x, y };
    for (const pt of this.pixiTexts) {
      pt.anchor.set(x, y);
    }
  }

  public updateTexts(texts: string[], styles?: PIXI.TextStyle[]) {
    this.texts = [...texts];
    if (styles !== undefined) this.styles = styles;

    if (settings.showDebugTextColor && styles) {
      styles.forEach((style) => {
        style.fill = "orange";
      });
    }

    this.totalLetters = 0;
    let offset = 0;
    for (let i = 0; i < this.texts.length; i++) {
      this.totalLetters += this.texts[i].length;
      this.texts[i] = this.texts[i].toLocaleUpperCase();

      const pixiText = i < this.pixiTexts.length ? this.pixiTexts[i] : this.appendPixiText();
      pixiText.visible = true;
      pixiText.text = this.texts[i];
      pixiText.style = this.styles[i < this.styles.length ? i : this.styles.length - 1];

      const textMetrics = PIXI.TextMetrics.measureText(pixiText.text, pixiText.style);
      this.offsets[i] = offset;
      offset += Math.round(5 + (textMetrics as any).width);
    }
    for (let i = this.texts.length; i < this.pixiTexts.length; i++) this.pixiTexts[i].visible = false;
    this.offsets[this.texts.length] = offset;

    this.onLayout();
  }

  public onLayout() {
    let a = 0;
    switch (this.align) {
      case "left":
        break;
      case "center":
        a = this.offsets[this.texts.length] * 0.5;
        break;
      case "right":
        a = this.offsets[this.texts.length];
        break;
    }

    for (let i = 0; i < this.texts.length; i++) {
      this.pixiTexts[i].position.x = this.offsets[i] - a;
    }
  }

  public animateText(factor: number) {
    factor = Util.clamp(factor, 0, 1);
    if (this.totalLetters > 0) {
      const lettersToShow = Math.round(this.totalLetters * factor);
      let lettersLeft = lettersToShow;
      for (let i = 0; i < this.texts.length; i++) {
        const lettersToShowForText = Util.clamp(this.texts[i].length, 0, lettersLeft);
        if (lettersToShowForText !== this.pixiTexts[i].text.length) {
          this.pixiTexts[i].text = this.texts[i].substr(0, lettersToShowForText);
        }
        lettersLeft -= lettersToShowForText;
      }
    }
  }
}
