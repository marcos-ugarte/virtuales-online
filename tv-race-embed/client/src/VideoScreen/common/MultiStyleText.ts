import * as PIXI from "pixi.js";
import { Util } from "common/Util";

const DEFAULT_TAG_STYLE: IExtendedTextStyle = {
  align: "left",
  breakWords: false,
  dropShadow: false,
  dropShadowAlpha: 1,
  dropShadowAngle: Math.PI / 6,
  dropShadowBlur: 0,
  dropShadowColor: "black",
  dropShadowDistance: 5,
  fill: "black",
  fillGradientType: PIXI.TEXT_GRADIENT.LINEAR_VERTICAL,
  fillGradientStops: [],
  fontFamily: "Arial",
  fontSize: 26,
  fontStyle: "normal",
  fontVariant: "normal",
  fontWeight: "normal",
  letterSpacing: 0,
  lineHeight: 0,
  lineJoin: "miter",
  miterLimit: 10,
  padding: 0,
  stroke: "black",
  strokeThickness: 0,
  textBaseline: "alphabetic",
  trim: false,
  whiteSpace: "pre",
  wordWrap: false,
  wordWrapWidth: 100,
  leading: 0
};

export interface IExtendedTextStyle {
  align?: PIXI.TextStyleAlign;
  breakWords?: boolean;
  dropShadow?: boolean;
  dropShadowAlpha?: number;
  dropShadowAngle?: number;
  dropShadowBlur?: number;
  dropShadowColor?: string | number;
  dropShadowDistance?: number;
  fill?: string | string[] | number | number[] | CanvasGradient | CanvasPattern;
  fillGradientType?: number;
  fillGradientStops?: number[];
  fontFamily?: string | string[];
  fontSize?: number | string;
  fontStyle?: PIXI.TextStyleFontStyle;
  fontVariant?: PIXI.TextStyleFontVariant;
  fontWeight?: PIXI.TextStyleFontWeight;
  leading?: number;
  letterSpacing?: number;
  lineHeight?: number;
  lineJoin?: PIXI.TextStyleLineJoin;
  miterLimit?: number;
  padding?: number;
  stroke?: string | number;
  strokeThickness?: number;
  trim?: boolean;
  textBaseline?: PIXI.TextStyleTextBaseline;
  whiteSpace?: PIXI.TextStyleWhiteSpace;
  wordWrap?: boolean;
  wordWrapWidth?: number;
  // new
  valign?: "top" | "middle" | "bottom" | "baseline" | number;
  debug?: boolean;
  maxLines?: number;
}

export interface ITextStyleSet {
  default: IExtendedTextStyle;
  [key: string]: IExtendedTextStyle;
}

interface IFontProperties {
  ascent: number;
  descent: number;
  fontSize: number;
}

interface ITextData {
  text: string;
  style: IExtendedTextStyle;
  width: number;
  height: number;
  fontProperties: IFontProperties;
  tag: ITagData;
}

interface ITextDrawingData {
  text: string;
  style: IExtendedTextStyle;
  x: number;
  y: number;
  width: number;
  ascent: number;
  descent: number;
  tag: ITagData;
}

export interface IMstDebugOptions {
  spans: {
    enabled?: boolean;
    baseline?: string;
    top?: string;
    bottom?: string;
    bounding?: string;
    text?: boolean;
  };
  objects: {
    enabled?: boolean;
    bounding?: string;
    text?: boolean;
  };
}

export interface ITagData {
  name: string;
  properties: { [key: string]: string };
}

interface ILineData {
  initialLines: number;
  lineWidths: number[];
  lineYMins: number[];
  lineYMaxs: number[];
  maxLineWidth: number;
  outputTextData: ITextData[][];
}

export class MultiStyleText extends PIXI.Text {
  public static debugOptions: IMstDebugOptions = {
    spans: {
      enabled: false,
      baseline: "#44BB44",
      top: "#BB4444",
      bottom: "#4444BB",
      bounding: "rgba(255, 255, 255, 0.1)",
      text: true
    },
    objects: {
      enabled: false,
      bounding: "rgba(255, 255, 255, 0.05)",
      text: true
    }
  };

  private textStyles: ITextStyleSet = { default: DEFAULT_TAG_STYLE };

  private hitboxes: { tag: ITagData; hitbox: PIXI.Rectangle }[] = [];

  public textSteps = 10;

  constructor(text?: string, styles?: ITextStyleSet) {
    super(text ? text : "");

    this.roundPixels = true;
    this.styles = styles ? styles : { default: DEFAULT_TAG_STYLE };
  }

  private getBase(): Omit<PIXI.Text, "_generateFillStyle"> & {
    _style: PIXI.TextStyle;
    dirty: boolean;
    _texture: PIXI.Texture;
    _onTextureUpdate: () => void;
    _generateFillStyle: any;
  } {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this as any;
  }

  public set styles(styles: ITextStyleSet) {
    this.textStyles = { default: DEFAULT_TAG_STYLE };

    this.textStyles.default = MultiStyleText.assign({}, DEFAULT_TAG_STYLE);

    for (const style in styles) {
      if (style === "default") {
        MultiStyleText.assign(this.textStyles.default, styles[style]);
      } else {
        this.textStyles[style] = MultiStyleText.assign({}, styles[style]);
      }
    }

    this.getBase()._style = new PIXI.TextStyle(this.textStyles.default);
    this.getBase().dirty = true;
  }

  public setTagStyle(tag: string, style: IExtendedTextStyle): void {
    if (tag in this.textStyles) {
      MultiStyleText.assign(this.textStyles[tag], style);
    } else {
      this.textStyles[tag] = MultiStyleText.assign({}, style);
    }

    this.getBase()._style = new PIXI.TextStyle(this.textStyles.default);
    this.getBase().dirty = true;
  }

  public deleteTagStyle(tag: string): void {
    if (tag === "default") {
      this.textStyles.default = MultiStyleText.assign({}, DEFAULT_TAG_STYLE);
    } else {
      delete this.textStyles[tag];
    }

    this.getBase()._style = new PIXI.TextStyle(this.textStyles.default);
    this.getBase().dirty = true;
  }

  private static getTagRegex(textStyles: ITextStyleSet, captureName: boolean, captureMatch: boolean): RegExp {
    let tagAlternation = Object.keys(textStyles).join("|");

    if (captureName) {
      tagAlternation = `(${tagAlternation})`;
    } else {
      tagAlternation = `(?:${tagAlternation})`;
    }

    let reStr = `<${tagAlternation}(?:\\s+[A-Za-z0-9_\\-]+=(?:"(?:[^"]+|\\\\")*"|'(?:[^']+|\\\\')*'))*\\s*>|</${tagAlternation}\\s*>`;

    if (captureMatch) {
      reStr = `(${reStr})`;
    }

    return new RegExp(reStr, "g");
  }

  private static getPropertyRegex(): RegExp {
    return new RegExp(`([A-Za-z0-9_\\-]+)=(?:"((?:[^"]+|\\\\")*)"|'((?:[^']+|\\\\')*)')`, "g");
  }

  private static _getTextDataPerLine(textStyles: ITextStyleSet, lines: string[]) {
    const outputTextData: ITextData[][] = [];
    const re = MultiStyleText.getTagRegex(textStyles, true, false);

    const styleStack = [MultiStyleText.assign({}, textStyles.default)];
    const tagStack: ITagData[] = [{ name: "default", properties: {} }];

    // determine the group of word for each line
    for (const line of lines) {
      const lineTextData: ITextData[] = [];

      // find tags inside the string
      const matches: RegExpExecArray[] = [];
      let matchArray: RegExpExecArray | null;

      // eslint-disable-next-line no-cond-assign
      while ((matchArray = re.exec(line))) {
        matches.push(matchArray);
      }

      // if there is no match, we still need to add the line with the default style
      if (matches.length === 0) {
        lineTextData.push(MultiStyleText.createTextData(line, styleStack[styleStack.length - 1], tagStack[tagStack.length - 1]));
      } else {
        // We got a match! add the text with the needed style
        let currentSearchIdx = 0;
        for (const match of matches) {
          // if index > 0, it means we have characters before the match,
          // so we need to add it with the default style
          if (match.index > currentSearchIdx) {
            lineTextData.push(MultiStyleText.createTextData(line.substring(currentSearchIdx, match.index), styleStack[styleStack.length - 1], tagStack[tagStack.length - 1]));
          }

          if (match[0][1] === "/") {
            // reset the style if end of tag
            if (styleStack.length > 1) {
              styleStack.pop();
              tagStack.pop();
            }
          } else {
            // set the current style
            styleStack.push(MultiStyleText.assign({}, styleStack[styleStack.length - 1], textStyles[match[1]]));

            const properties: { [key: string]: string } = {};
            const propertyRegex = MultiStyleText.getPropertyRegex();
            let propertyMatch: RegExpMatchArray | null;

            // eslint-disable-next-line no-cond-assign
            while ((propertyMatch = propertyRegex.exec(match[0]))) {
              properties[propertyMatch[1]] = propertyMatch[2] || propertyMatch[3];
            }

            tagStack.push({ name: match[1], properties });
          }

          // update the current search index
          currentSearchIdx = match.index + match[0].length;
        }

        // is there any character left?
        if (currentSearchIdx < line.length) {
          lineTextData.push(MultiStyleText.createTextData(line.substring(currentSearchIdx), styleStack[styleStack.length - 1], tagStack[tagStack.length - 1]));
        }
      }

      outputTextData.push(lineTextData);
    }

    return outputTextData;
  }

  private static getFontString(style: IExtendedTextStyle): string {
    return new PIXI.TextStyle(style).toFontString();
  }

  private static createTextData(text: string, style: IExtendedTextStyle, tag: ITagData): ITextData {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
      text,
      style,
      width: 0,
      height: 0,
      fontProperties: undefined,
      tag
    } as any;
  }

  private static getDropShadowPadding(textStyles: ITextStyleSet): number {
    let maxDistance = 0;
    let maxBlur = 0;

    if (!textStyles) return 0;

    Object.keys(textStyles).forEach((styleKey) => {
      const { dropShadowDistance, dropShadowBlur } = textStyles[styleKey];
      maxDistance = Math.max(maxDistance, dropShadowDistance || 0);
      maxBlur = Math.max(maxBlur, dropShadowBlur || 0);
    });

    return maxDistance + maxBlur;
  }

  private static calcLines(context: PIXI.ICanvasRenderingContext2D, styles: ITextStyleSet, text: string): ILineData {
    let outputText = text;

    let initialLines = 0;
    if (styles && styles.default && styles.default.wordWrap) {
      const wwRet = MultiStyleText.wordWrap(context, styles, text, styles.default.wordWrapWidth ? styles.default.wordWrapWidth : 100, styles.default.breakWords ? styles.default.breakWords : false);
      outputText = wwRet.result;
      initialLines = wwRet.lines.length;
    }

    // split text into lines
    const lines = outputText.split(/(?:\r\n|\r|\n)/);

    // get the text data with specific styles
    const outputTextData = MultiStyleText._getTextDataPerLine(styles, lines);

    // calculate text width and height
    const lineWidths: number[] = [];
    const lineYMins: number[] = [];
    const lineYMaxs: number[] = [];
    let maxLineWidth = 0;

    for (let i = 0; i < lines.length; i++) {
      let lineWidth = 0;
      let lineYMin = 0;
      let lineYMax = 0;
      for (let j = 0; j < outputTextData[i].length; j++) {
        const sty = outputTextData[i][j].style;
        const letterSpacing = sty.letterSpacing ? sty.letterSpacing : 0;

        context.font = MultiStyleText.getFontString(sty);

        // save the width
        outputTextData[i][j].width = context.measureText(outputTextData[i][j].text).width;

        if (outputTextData[i][j].text.length !== 0) {
          outputTextData[i][j].width += (outputTextData[i][j].text.length - 1) * letterSpacing;

          if (j > 0) {
            lineWidth += letterSpacing / 2; // spacing before first character
          }

          if (j < outputTextData[i].length - 1) {
            lineWidth += letterSpacing / 2; // spacing after last character
          }
        }

        lineWidth += outputTextData[i][j].width;

        // save the font properties
        outputTextData[i][j].fontProperties = PIXI.TextMetrics.measureFont(context.font);

        // save the height
        outputTextData[i][j].height = outputTextData[i][j].fontProperties.fontSize;

        if (typeof sty.valign === "number") {
          lineYMin = Math.min(lineYMin, sty.valign - outputTextData[i][j].fontProperties.descent);
          lineYMax = Math.max(lineYMax, sty.valign + outputTextData[i][j].fontProperties.ascent);
        } else {
          lineYMin = Math.min(lineYMin, -outputTextData[i][j].fontProperties.descent);
          lineYMax = Math.max(lineYMax, sty.lineHeight ? -outputTextData[i][j].fontProperties.descent + sty.lineHeight : outputTextData[i][j].fontProperties.ascent);
        }
      }

      lineWidths[i] = lineWidth;
      lineYMins[i] = lineYMin;
      lineYMaxs[i] = lineYMax;
      maxLineWidth = Math.max(maxLineWidth, lineWidth);
    }
    return { initialLines, lineWidths, lineYMins, lineYMaxs, maxLineWidth, outputTextData };
  }

  private calcText() {
    this.texture.baseTexture.resolution = this.resolution;

    const originalStyles = this.textStyles;
    const textStyles = {} as ITextStyleSet;
    for (const s in originalStyles) {
      if (s) {
        textStyles[s] = { ...originalStyles[s] };
      }
    }

    const style = textStyles && textStyles.default ? textStyles.default : ({} as ITextStyleSet);
    const wordWrapWidth = style.wordWrapWidth ? (style.wordWrapWidth as number) : false;
    const maxLines = style.maxLines ? (style.maxLines as number) : 0;
    let lineData = MultiStyleText.calcLines(this.context, textStyles, this.text);
    if (!style.wordWrap && wordWrapWidth && lineData.maxLineWidth > wordWrapWidth) {
      // console.log("HERE1!");
      /*while (lineData.maxLineWidth > wordWrapWidth) {
				console.log("HERE1!");
			}*/
    }
    if (maxLines && lineData.initialLines <= maxLines) {
      let index = 1;
      while (lineData.lineWidths.length > maxLines && index < this.textSteps) {
        for (const s in textStyles) {
          if (s) {
            const n = originalStyles[s].fontSize;
            if (Util.isNumber(n)) textStyles[s].fontSize = (n * (this.textSteps - index)) / this.textSteps;
          }
        }
        lineData = MultiStyleText.calcLines(this.context as any, textStyles, this.text); // typescript/pixi bug: Interface 'ModernContext2D' incorrectly extends interface 'CanvasRenderingContext2D'.ts(2430)
        index++;
      }
    }
    const tsi = MultiStyleText.calcTextSizeInfos(lineData, textStyles);

    const drawingData: ITextDrawingData[] = this.calcDrawingData(lineData, tsi.dropShadowPadding, tsi.maxStrokeThickness);
    return { tsi, drawingData };
  }

  private static calcTextSizeInfos(lineData: ILineData, textStyles: ITextStyleSet) {
    const stylesArray = Object.keys(textStyles).map((key) => textStyles[key]);
    const maxStrokeThickness = stylesArray.reduce((prev, cur) => Math.max(prev, cur.strokeThickness || 0), 0);
    const dropShadowPadding = MultiStyleText.getDropShadowPadding(textStyles);

    const totalHeight = lineData.lineYMaxs.reduce((prev, cur) => prev + cur, 0) - lineData.lineYMins.reduce((prev, cur) => prev + cur, 0);
    const width = lineData.maxLineWidth + 2 * maxStrokeThickness + 2 * dropShadowPadding;
    const height = totalHeight + 2 * maxStrokeThickness + 2 * dropShadowPadding;
    return { width, height, maxStrokeThickness, dropShadowPadding };
  }

  private calcDrawingData(lineData: ILineData, dropShadowPadding: number, maxStrokeThickness: number) {
    let basePositionY = dropShadowPadding + maxStrokeThickness;

    const drawingData: ITextDrawingData[] = [];

    // Compute the drawing data
    for (let i = 0; i < lineData.outputTextData.length; i++) {
      const line = lineData.outputTextData[i];
      let linePositionX: number = 0;

      switch (this.getBase()._style.align) {
        case "left":
          linePositionX = dropShadowPadding + maxStrokeThickness;
          break;

        case "center":
          linePositionX = dropShadowPadding + maxStrokeThickness + (lineData.maxLineWidth - lineData.lineWidths[i]) / 2;
          break;

        case "right":
          linePositionX = dropShadowPadding + maxStrokeThickness + lineData.maxLineWidth - lineData.lineWidths[i];
          break;
      }

      for (let j = 0; j < line.length; j++) {
        const { style, text, fontProperties, width, tag } = line[j];

        let linePositionY = basePositionY + fontProperties.ascent;

        switch (style.valign) {
          case "top":
            // no need to do anything
            break;

          case "baseline":
            linePositionY += lineData.lineYMaxs[i] - fontProperties.ascent;
            break;

          case "middle":
            linePositionY += (lineData.lineYMaxs[i] - lineData.lineYMins[i] - fontProperties.ascent - fontProperties.descent) / 2;
            break;

          case "bottom":
            linePositionY += lineData.lineYMaxs[i] - lineData.lineYMins[i] - fontProperties.ascent - fontProperties.descent;
            break;

          default:
            // A number - offset from baseline, positive is higher
            linePositionY += lineData.lineYMaxs[i] - fontProperties.ascent - (style.valign ? style.valign : 0);
            break;
        }

        if (style.letterSpacing === 0) {
          drawingData.push({
            text,
            style,
            x: linePositionX,
            y: linePositionY,
            width,
            ascent: fontProperties.ascent,
            descent: fontProperties.descent,
            tag
          });

          linePositionX += line[j].width;
        } else {
          this.context.font = MultiStyleText.getFontString(line[j].style);

          for (let k = 0; k < text.length; k++) {
            if (k > 0 || j > 0) {
              linePositionX += (style.letterSpacing ? style.letterSpacing : 0) / 2;
            }

            const charWidth = this.context.measureText(text.charAt(k)).width;

            drawingData.push({
              text: text.charAt(k),
              style,
              x: linePositionX,
              y: linePositionY,
              width: charWidth,
              ascent: fontProperties.ascent,
              descent: fontProperties.descent,
              tag
            });

            linePositionX += charWidth;

            if (k < text.length - 1 || j < line.length - 1) {
              linePositionX += (style.letterSpacing ? style.letterSpacing : 0) / 2;
            }
          }
        }
      }

      basePositionY += lineData.lineYMaxs[i] - lineData.lineYMins[i];
    }
    return drawingData;
  }

  public updateText(): void {
    if (!this.getBase().dirty) {
      return;
    }

    const { tsi, drawingData } = this.calcText();

    this.canvas.width = tsi.width * this.resolution;
    this.canvas.height = tsi.height * this.resolution;

    this.context.scale(this.resolution, this.resolution);

    this.context.textBaseline = "alphabetic";
    this.context.lineJoin = "round";

    this.hitboxes = [];

    // this.context.save();
    const saved = {
      font: this.context.font,
      shadowColor: this.context.shadowColor,
      shadowBlur: this.context.shadowBlur,
      shadowOffsetX: this.context.shadowOffsetX,
      shadowOffsetY: this.context.shadowOffsetY
    };

    // First pass: draw the shadows only
    drawingData.forEach(({ style, text, x, y }) => {
      if (!style.dropShadow) {
        return; // This text doesn't have a shadow
      }

      this.context.font = MultiStyleText.getFontString(style);

      let dropFillStyle = style.dropShadowColor ? style.dropShadowColor : 0;
      if (typeof dropFillStyle === "number") {
        dropFillStyle = new PIXI.Color(dropFillStyle).toHex();
      }
      this.context.shadowColor = dropFillStyle;
      this.context.shadowBlur = style.dropShadowBlur ? style.dropShadowBlur : 0;
      const dropShadowAngle = style.dropShadowAngle ? style.dropShadowAngle : 0;
      const dropShadowDistance = style.dropShadowDistance ? style.dropShadowDistance : 0;
      this.context.shadowOffsetX = Math.cos(dropShadowAngle) * dropShadowDistance * this.resolution;
      this.context.shadowOffsetY = Math.sin(dropShadowAngle) * dropShadowDistance * this.resolution;

      this.context.fillText(text, x, y);
    });

    this.context.font = saved.font;
    this.context.shadowColor = saved.shadowColor;
    this.context.shadowBlur = saved.shadowBlur;
    this.context.shadowOffsetX = saved.shadowOffsetX;
    this.context.shadowOffsetY = saved.shadowOffsetY;
    // this.context.restore();

    // Second pass: draw the strokes only
    drawingData.forEach(({ style, text, x, y, width, ascent, descent, tag }) => {
      if (style.stroke === undefined || !style.strokeThickness) {
        return; // Skip this step if we have no stroke
      }

      this.context.font = MultiStyleText.getFontString(style);

      let strokeStyle = style.stroke;
      if (typeof strokeStyle === "number") {
        strokeStyle = new PIXI.Color(strokeStyle).toHex();
      }

      this.context.strokeStyle = strokeStyle;
      this.context.lineWidth = style.strokeThickness;

      this.context.strokeText(text, x, y);
    });

    // Third pass: draw the fills only
    drawingData.forEach(({ style, text, x, y, width, ascent, descent, tag }) => {
      if (style.fill === undefined) {
        return; // Skip this step if we have no fill
      }

      this.context.font = MultiStyleText.getFontString(style);

      // set canvas text styles
      let fillStyle = style.fill;
      if (typeof fillStyle === "number") {
        fillStyle = new PIXI.Color(fillStyle).toHex();
      } else if (Array.isArray(fillStyle)) {
        for (let i = 0; i < fillStyle.length; i++) {
          const fill = fillStyle[i];
          if (typeof fill === "number") {
            fillStyle[i] = new PIXI.Color(fill).toHex();
          }
        }
      }
      this.context.fillStyle = this.getBase()._generateFillStyle(new PIXI.TextStyle(style), [text]) as string | CanvasGradient;
      // Typecast required for proper typechecking

      this.context.fillText(text, x, y);
    });

    // Fourth pass: collect the bounding boxes and draw the debug information
    drawingData.forEach(({ style, text, x, y, width, ascent, descent, tag }) => {
      const offset = -this.getBase()._style.padding - MultiStyleText.getDropShadowPadding(this.styles);

      this.hitboxes.push({
        tag,
        hitbox: new PIXI.Rectangle(x + offset, y - ascent + offset, width, ascent + descent)
      });

      const debugSpan = style.debug === undefined ? MultiStyleText.debugOptions.spans.enabled : style.debug;

      if (debugSpan) {
        this.context.lineWidth = 1;

        if (MultiStyleText.debugOptions.spans.bounding) {
          this.context.fillStyle = MultiStyleText.debugOptions.spans.bounding;
          this.context.strokeStyle = MultiStyleText.debugOptions.spans.bounding;
          this.context.beginPath();
          this.context.rect(x, y - ascent, width, ascent + descent);
          this.context.fill();
          this.context.stroke();
          this.context.stroke(); // yes, twice
        }

        if (MultiStyleText.debugOptions.spans.baseline) {
          this.context.strokeStyle = MultiStyleText.debugOptions.spans.baseline;
          this.context.beginPath();
          this.context.moveTo(x, y);
          this.context.lineTo(x + width, y);
          this.context.closePath();
          this.context.stroke();
        }

        if (MultiStyleText.debugOptions.spans.top) {
          this.context.strokeStyle = MultiStyleText.debugOptions.spans.top;
          this.context.beginPath();
          this.context.moveTo(x, y - ascent);
          this.context.lineTo(x + width, y - ascent);
          this.context.closePath();
          this.context.stroke();
        }

        if (MultiStyleText.debugOptions.spans.bottom) {
          this.context.strokeStyle = MultiStyleText.debugOptions.spans.bottom;
          this.context.beginPath();
          this.context.moveTo(x, y + descent);
          this.context.lineTo(x + width, y + descent);
          this.context.closePath();
          this.context.stroke();
        }

        if (MultiStyleText.debugOptions.spans.text) {
          this.context.fillStyle = "#ffffff";
          this.context.strokeStyle = "#000000";
          this.context.lineWidth = 2;
          this.context.font = "8px monospace";
          this.context.strokeText(tag.name, x, y - ascent + 8);
          this.context.fillText(tag.name, x, y - ascent + 8);
          this.context.strokeText(`${width.toFixed(2)}x${(ascent + descent).toFixed(2)}`, x, y - ascent + 16);
          this.context.fillText(`${width.toFixed(2)}x${(ascent + descent).toFixed(2)}`, x, y - ascent + 16);
        }
      }
    });

    if (MultiStyleText.debugOptions.objects.enabled) {
      if (MultiStyleText.debugOptions.objects.bounding) {
        this.context.fillStyle = MultiStyleText.debugOptions.objects.bounding;
        this.context.beginPath();
        this.context.rect(0, 0, tsi.width, tsi.height);
        this.context.fill();
      }

      if (MultiStyleText.debugOptions.objects.text) {
        this.context.fillStyle = "#ffffff";
        this.context.strokeStyle = "#000000";
        this.context.lineWidth = 2;
        this.context.font = "8px monospace";
        this.context.strokeText(`${tsi.width.toFixed(2)}x${tsi.height.toFixed(2)}`, 0, 8, tsi.width);
        this.context.fillText(`${tsi.width.toFixed(2)}x${tsi.height.toFixed(2)}`, 0, 8, tsi.width);
      }
    }

    (this as any).updateTexture();
  }

  protected static wordWrap(context: PIXI.ICanvasRenderingContext2D, styles: ITextStyleSet, text: string, wordWrapWidth: number, breakWords: boolean) {
    // Greedy wrapping algorithm that will wrap words as the line grows longer than its horizontal bounds.
    let result = "";
    const re = MultiStyleText.getTagRegex(styles, true, true);

    const lines = text.split("\n");
    const styleStack = [MultiStyleText.assign({}, styles.default)];
    context.font = this.getFontString(styles.default);

    for (let i = 0; i < lines.length; i++) {
      let spaceLeft = wordWrapWidth;
      const tagSplit = lines[i].split(re);
      let firstWordOfLine = true;

      for (let j = 0; j < tagSplit.length; j++) {
        if (re.test(tagSplit[j])) {
          result += tagSplit[j];
          if (tagSplit[j][1] === "/") {
            j += 2;
            styleStack.pop();
          } else {
            j++;
            styleStack.push(MultiStyleText.assign({}, styleStack[styleStack.length - 1], styles[tagSplit[j]]));
            j++;
          }
          context.font = this.getFontString(styleStack[styleStack.length - 1]);
        } else {
          const words = tagSplit[j].split(" ");

          for (let k = 0; k < words.length; k++) {
            const wordWidth = context.measureText(words[k]).width;

            if (breakWords && wordWidth > spaceLeft) {
              // Part should be split in the middle
              const characters = words[k].split("");

              if (k > 0) {
                result += " ";
                spaceLeft -= context.measureText(" ").width;
              }

              for (const c of characters) {
                const characterWidth = context.measureText(c).width;

                if (characterWidth > spaceLeft) {
                  result += `\n${c}`;
                  spaceLeft = wordWrapWidth - characterWidth;
                } else {
                  result += c;
                  spaceLeft -= characterWidth;
                }
              }
            } else if (breakWords) {
              result += words[k];
              spaceLeft -= wordWidth;
            } else {
              const paddedWordWidth = wordWidth + (k > 0 ? context.measureText(" ").width : 0);

              if (paddedWordWidth > spaceLeft) {
                // Skip printing the newline if it's the first word of the line that is
                // greater than the word wrap width.
                if (!firstWordOfLine) {
                  result += "\n";
                }

                result += words[k];
                spaceLeft = wordWrapWidth - wordWidth;
              } else {
                spaceLeft -= paddedWordWidth;

                if (k > 0) {
                  result += " ";
                }

                result += words[k];
              }
            }
            firstWordOfLine = false;
          }
        }
      }

      if (i < lines.length - 1) {
        result += "\n";
      }
    }

    return { lines, result };
  }

  // Lazy fill for Object.assign
  private static assign(destination: any, ...sources: any[]): any {
    for (const source of sources) {
      for (const key in source) {
        if (key) destination[key] = source[key];
      }
    }

    return destination;
  }

  public animateText(factor: number) {
    /*factor = Util.clamp(factor, 0, 1);
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
    }*/
  }
}
