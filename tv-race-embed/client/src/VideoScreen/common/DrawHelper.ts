import * as PIXI from "pixi.js";
import { DriverPattern } from "client/Logic/LogicDefinitions";
import { Util } from "common/Util";
import { Engine } from "client/Graphics/Engine";
import { UIHelper } from "../UIHelper";

interface ITableDefinition {
  row: number;
  count: number;
}

interface IPositionDetails {
  visible?: boolean;
  singleRow?: boolean;
  position: number;
}

interface IStrokeLine {
  verti: boolean;
  solid?: boolean;
  color: string;
  color2?: string;
  width: number;
  opacity?: number;
  it?: boolean;
  it_width?: number;
  count?: number;
  start?: number;
  end?: number;
  position?: IPositionDetails[];
  table?: ITableDefinition;
  //start?: number;
  //end?: number;
}

interface ISolidFill {
  type: "solid";
  color: string;
  opacity?: number;
  stroke?: IStrokeLine[];
  margin?: {
    r: number;
    l: number;
    t: number;
    b: number;
  };
}

interface IGradientFill {
  type: "gradient";
  color: string;
  color2: string;
  verti?: boolean;
  segments?: number;
  stops?: number[];
  stroke?: IStrokeLine[];
  margin?: {
    r: number;
    l: number;
    t: number;
    b: number;
  };
  opacity?: number;
}

interface IMixedFill {
  // used for gradients that start/end above visible area or don't start/end at 0/1 point
  type: "mixed";
  color: string;
  color2: string;
  verti?: boolean;
  stroke?: IStrokeLine[];
  margin?: {
    r: number;
    l: number;
    t: number;
    b: number;
  };
  start?: number;
  end?: number;
  opacity?: number;
}

export type Fill = ISolidFill | IGradientFill | IMixedFill;

export class DrawHelper {
  public static cachedPatterns: Record<string, PIXI.Texture> = {};
  public static cachedTextures: Record<string, PIXI.Texture> = {};
  public static cachedRenderTextures: Record<string, PIXI.RenderTexture> = {};

  public static dispose() {
    for (const c in this.cachedPatterns) {
      if (c && this.cachedPatterns[c] !== undefined) {
        this.cachedPatterns[c].destroy();
      }
    }
    DrawHelper.cachedPatterns = {};

    for (const c in this.cachedTextures) {
      if (c && this.cachedTextures[c] !== undefined) {
        this.cachedTextures[c].destroy();
      }
    }
    DrawHelper.cachedTextures = {};

    for (const c in this.cachedRenderTextures) {
      if (c && this.cachedRenderTextures[c] !== undefined) {
        this.cachedRenderTextures[c].destroy();
      }
    }
    DrawHelper.cachedRenderTextures = {};
  }

  public static getCachedRenderTexture(id: number, width: number, height: number): PIXI.RenderTexture {
    const key = [id, width, height].join("_");

    let texture = this.cachedRenderTextures[key];
    if (texture === undefined) {
      texture = PIXI.RenderTexture.create({ width, height });
      this.cachedRenderTextures[key] = texture;
    }
    return texture;
  }

  public static getCachedTriangleTexture(width: number, height: number, color: string, flipped: boolean, triangleWidth: number): PIXI.Texture {
    const key = ["triangle", width, height, color, flipped, triangleWidth].join("_");

    let texture = this.cachedTextures[key];
    if (texture === undefined) {
      texture = DrawHelper.createTriangleTexture(width, height, color, flipped, triangleWidth);
      this.cachedTextures[key] = texture;
    }
    return texture;
  }

  public static getCachedHausTexture(width: number, height: number, color: string, flipped: boolean): PIXI.Texture {
    const key = ["haus", width, height, color, flipped].join("_");

    let texture = this.cachedTextures[key];
    if (texture === undefined) {
      texture = DrawHelper.createHausTexture(width, height, color, flipped);
      this.cachedTextures[key] = texture;
    }
    return texture;
  }

  public static createTriangleTexture(width: number, height: number, color: string, flipped: boolean, triangleWidth: number): PIXI.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "transparent";
    ctx.fill();
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.fillStyle = color;

    const xOffset = triangleWidth;
    const yOffset = (flipped ? -triangleWidth : triangleWidth) * 2;

    const top = flipped ? height : 0;
    const bottom = flipped ? 0 : height;
    ctx.moveTo(0, bottom);
    ctx.lineTo(xOffset, bottom);
    ctx.lineTo(width / 2, top + yOffset);
    ctx.lineTo(width - xOffset, bottom);
    ctx.lineTo(width, bottom);
    ctx.lineTo(width / 2, top);
    ctx.lineTo(0, bottom);
    ctx.closePath();
    ctx.fill();

    const baseTexture = new PIXI.BaseTexture(canvas); // don't cache
    const maskTexture = new PIXI.Texture(baseTexture);
    return maskTexture;
  }

  public static getCachedFilledTriangleTexture(width: number, height: number, color: string): PIXI.Texture {
    const key = ["filledTriangle", width, height, color].join("_");

    let texture = this.cachedTextures[key];
    if (texture === undefined) {
      texture = DrawHelper.createFilledTriangleTexture(width, height, color);
      this.cachedTextures[key] = texture;
    }
    return texture;
  }

  public static createFilledTriangleTexture(width: number, height: number, color: string): PIXI.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      const path = new Path2D();
      path.moveTo(0, 0);
      path.lineTo(width, height / 2);
      path.lineTo(0, height);

      ctx.fillStyle = color;
      ctx.fill(path);
    }

    const baseTexture = new PIXI.BaseTexture(canvas); // don't cache
    const maskTexture = new PIXI.Texture(baseTexture);
    return maskTexture;
  }

  public static createHausTexture(width: number, height: number, color: string, flipped: boolean): PIXI.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    ctx.beginPath();
    ctx.fillStyle = color;

    const top = flipped ? height : 0;
    const bottom = flipped ? 0 : height;

    ctx.moveTo(0, bottom);
    ctx.lineTo(width, bottom);
    ctx.lineTo(width, height / 2);
    ctx.lineTo(width / 2, top);
    ctx.lineTo(0, height / 2);
    ctx.lineTo(0, bottom);
    ctx.closePath();
    ctx.fill();

    // const texture = PIXI.Texture.from(canvas);
    const baseTexture = new PIXI.BaseTexture(canvas); // don't cache
    const maskTexture = new PIXI.Texture(baseTexture);
    return maskTexture;
  }

  public static getCachedPattern(width: number, height: number, skewed: number, color: number, color2?: number, pattern?: number, verti?: boolean) {
    const key = [width, height, skewed, color, color2, pattern, verti].join("_");

    let texture = this.cachedPatterns[key];
    if (texture === undefined) {
      texture = DrawHelper.drawPatternTexture(width, height, skewed, color, color2, pattern, verti);
      this.cachedPatterns[key] = texture;
    }
    return texture;
  }

  public static drawPatternTexture(width: number, height: number, skewed: number, color: number, color2?: number, pattern?: DriverPattern, verti?: boolean) {
    if (pattern === undefined) pattern = DriverPattern.COLOR_ONLY;
    if (verti === true && pattern === DriverPattern.BLACK_WHITE_6) pattern = DriverPattern.BLACK_WHITE_6_b;
    if (color2 === undefined) color2 = 0xff000000;

    switch (pattern) {
      case DriverPattern.COLOR_ONLY:
        return DrawHelper.createSkewedRoundedRectangleTexture(width, height, 0, skewed, { type: "solid", color: Util.rgbToHex(color) });
      case DriverPattern.YELLOW_BLACK_2:
        return DrawHelper.createSkewedRoundedRectangleTexture(width, height, 0, skewed, { type: "gradient", color: Util.rgbToHex(color), color2: Util.rgbToHex(color2), segments: 2, verti });
      case DriverPattern.BLACK_WHITE_6:
        return DrawHelper.createSkewedRoundedRectangleTexture(width, height, 0, skewed, { type: "gradient", color: Util.rgbToHex(color), color2: Util.rgbToHex(color2), segments: 5, verti });
      case DriverPattern.BLACK_WHITE_6_b:
        return DrawHelper.createSkewedRoundedRectangleTexture(width, height, 0, skewed, { type: "gradient", color: Util.rgbToHex(color), color2: Util.rgbToHex(color2), segments: 8, verti });
    }
  }

  public static createSkewedRoundedRectangleTexture(width: number, height: number, radius: number, skewPixels: number, fillStyle: Fill | Fill[], options?: PIXI.IBaseTextureOptions) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    let fill: string | CanvasGradient | CanvasPattern;
    const fills: Fill[] = Array.isArray(fillStyle) ? fillStyle : [fillStyle];

    fills.forEach((fs, index) => {
      ctx.globalAlpha = fs.opacity ? fs.opacity : 1.0;
      if (fs.type === "gradient" && fs.segments) {
        // pattern
        if (fs.verti) {
          if (fs.color2) {
            DrawHelper.drawPatternTextureToContext(ctx, 0, 0, width, height, fs.color, fs.type === "gradient" ? fs.color2 : "", fs.type === "gradient" ? fs.segments : 1, skewPixels, true);
          }
        } else {
          if (fs.color2) {
            DrawHelper.drawPatternTextureToContext(ctx, 0, 0, width, height, fs.color, fs.type === "gradient" ? fs.color2 : "", fs.type === "gradient" ? fs.segments : 1, skewPixels);
          }
        }
      } else if (fs.type === "mixed") {
        let col = this.calculateGradientStops(fs.color, fs.color2, 0, 1, fs.start, fs.end);
        const start = fs.start && fs.start >= 0 ? fs.start : 0;
        const end = fs.end && fs.end <= 1 ? fs.end : 1;
        if (start > end) col = col.reverse();

        if (fs.verti) fill = DrawHelper.createGradient(ctx, 0, ctx.canvas.height * start, 0, ctx.canvas.height * end, col[0], col[1]);
        else fill = DrawHelper.createGradient(ctx, skewPixels * 0.5 + ctx.canvas.width * start, ctx.canvas.height, ctx.canvas.width * end, ctx.canvas.height, col[0], col[1]);

        DrawHelper.drawSkewedRoundedRectangle(ctx, 0, 0, width, height, radius, skewPixels, fill, index);
      } else {
        if (fs.type === "gradient") {
          // gradient
          if (fs.verti) fill = DrawHelper.createGradient(ctx, 0, 0, 0, ctx.canvas.height, fs.color, fs.color2);
          else fill = DrawHelper.createGradient(ctx, skewPixels * 0.5, ctx.canvas.height, ctx.canvas.width, ctx.canvas.height, fs.color, fs.color2);
        } else {
          // solid fill
          fill = fs.color;
        }
        DrawHelper.drawSkewedRoundedRectangle(ctx, 0, 0, width, height, radius, skewPixels, fill, index);
      }

      if (fs.stroke) {
        fs.stroke.forEach((line, index) => {
          if (line.color) {
            const line_col = this.calculateGradientStops(
              line.color,
              line.color2 ? line.color2 : line.solid ? line.color : fs.color,
              (line.table && line.table.row) ?? 0,
              (line.table && line.table.count) ?? 1,
              line.start ?? 0.7,
              line.end ?? 1.25
            );
            const skewLine = line.width / (height - (fs.margin?.b ?? 0));
            ctx.fillStyle = line.color;
            if (line.verti) {
              const count = line.count ? line.count : line.position ? line.position.length : 1;
              const cell_width = (width - (fs.margin?.l ?? 0) - (fs.margin?.r ?? 0)) / count;
              fill = DrawHelper.createGradient(ctx, line.width, (width - radius) * ((line.start && line.start >= 0 ? line.start : 0) ?? 0.7), width, line.width, line_col[0], line_col[1]);
              for (let i = 0; i < count; i++) {
                let factor = i * cell_width;
                let opacity = line.opacity ?? 0.75;
                if (line.position && line.position[i]) {
                  factor = width - width * line.position[i].position;
                  opacity = line.position[i].visible ? opacity : 0;
                  fill = line.position[i].singleRow
                    ? DrawHelper.createGradient(
                        ctx,
                        line.width,
                        (width - radius) * ((line.start && line.start >= 0 ? line.start : 0) ?? 0.7),
                        width,
                        line.width,
                        line.color,
                        line.color2 ? line.color2 : line.solid ? line.color : fs.color
                      )
                    : fill;
                }

                ctx.save();
                DrawHelper.drawSkewedStroke(
                  ctx,
                  Math.floor(skewPixels + width - (fs.margin?.r ?? 0) - line.width - factor),
                  0,
                  line.width,
                  height, //height - (fs.margin?.b ?? 0),
                  radius,
                  skewLine,
                  opacity,
                  line.it_width ?? 0,
                  fill,
                  index
                );
                ctx.restore();
              }
            } else {
              fill = DrawHelper.createGradient(ctx, (width - radius) * ((line.start && line.start >= 0 ? line.start : 0) ?? 0.7), line.width, width, line.width, line_col[0], line_col[1]);
              ctx.save();
              DrawHelper.drawSkewedStroke(
                ctx,
                skewPixels,
                height - (fs.margin?.b ?? 0) - line.width,
                width - skewPixels,
                line.width,
                radius,
                skewLine,
                line.opacity ?? 0.75,
                line.it_width ?? 0,
                fill,
                index
              );
              ctx.restore();
            }
          }
        });
      }
      ctx.globalAlpha = 1.0;
    });
    // const texture = PIXI.Texture.from(canvas);
    const baseTexture = new PIXI.BaseTexture(canvas, { mipmap: options?.mipmap ? options.mipmap : PIXI.MIPMAP_MODES.POW2 }); // don't cache
    const texture = new PIXI.Texture(baseTexture);
    return texture;
  }
  public static createCircleTexture(radius: number, fillStyle: Fill, options?: PIXI.IBaseTextureOptions): PIXI.Texture {
    const diameter = radius * 2;
    const canvas = document.createElement("canvas");
    canvas.width = diameter;
    canvas.height = diameter;
    const ctx = canvas.getContext("2d")!;

    let fill: string | CanvasGradient | CanvasPattern;
    if (fillStyle.type === "gradient" && fillStyle.color2) {
      // Create a vertical gradient from (0,0) to (0,diameter)
      fill = DrawHelper.createGradientWithStops(ctx, 0, 0, 0, diameter, fillStyle.color, fillStyle.color2, fillStyle.stops!);
    } else {
      fill = fillStyle.color;
    }

    ctx.beginPath();
    // Center the circle at (radius, radius), not (50, 50).
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    const baseTexture = new PIXI.BaseTexture(canvas, {
      mipmap: options?.mipmap ? options.mipmap : PIXI.MIPMAP_MODES.POW2
    });
    const texture = new PIXI.Texture(baseTexture);
    return texture;
  }

  public static drawSkewedRoundedRectangle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    skewPixels: number,
    fillStyle: string | CanvasGradient | CanvasPattern,
    layer?: number
  ) {
    const skewFactor = skewPixels / height;
    ctx.beginPath();

    ctx.fillStyle = fillStyle;

    // const oldTransform = ctx.getTransform(); // not supported on n2
    if (!layer || layer === 0) ctx.transform(1, 0, -skewFactor, 1, x, y);
    ctx.moveTo(skewPixels, radius);
    ctx.lineTo(skewPixels + radius, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, height - radius);
    ctx.lineTo(width - radius, height);
    ctx.lineTo(skewPixels, height);
    ctx.closePath();
    ctx.arc(skewPixels + radius, radius, radius, 0, Math.PI * 2);
    ctx.arc(width - radius, height - radius, radius, 0, Math.PI * 2);
    ctx.fill();
    // ctx.setTransform(oldTransform);
  }

  public static drawSkewedStroke(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    skewPixels: number,
    alpha: number,
    it_width: number,
    fillStyle: string | CanvasGradient | CanvasPattern,
    layer?: number
  ) {
    const skewFactor = skewPixels / height;

    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip(); // everything outside this rect is invisible -> radius higher than height makes shape blurry
    ctx.closePath();

    ctx.beginPath();

    ctx.fillStyle = fillStyle;

    // const oldTransform = ctx.getTransform(); // not supported on n2
    if (!layer || layer === 0) ctx.transform(1, 0, -skewFactor, 1, x, y);
    else ctx.translate(x, y);

    ctx.globalAlpha = alpha;

    ctx.lineTo(skewPixels + it_width, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, height - radius);
    ctx.lineTo(width - radius, height);
    ctx.lineTo(skewPixels, height);
    ctx.closePath();
    ctx.arc(width - radius, height - radius, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  /**
   * Create a texture of a skewable rectangle with independently rounded corners.
   *
   * @param {number} width - The width of the rectangle.
   * @param {number} height - The height of the rectangle.
   * @param {number} skewX - Horizontal skew amount. Positive/negative values tilt the shape.
   * @param {{ topLeft: number, topRight: number, bottomRight: number, bottomLeft: number }} cornerRadii - Object specifying corner radius for each corner.
   * @param {{ type: string, color: string }} fillStyle - Fill style object. Example: { type: "solid", color: "white" }.
   * @param {PIXI.Renderer} renderer - Your PIXI Renderer (e.g. `app.renderer`).
   * @returns {PIXI.Texture} - The generated texture.
   */
  public static createCustomSkewedRoundedRectangleTexture(
    width: number,
    height: number,
    skewX: number,
    cornerRadii: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number },
    fillStyle: { type: string; color: string | string[]; verti?: boolean }
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const { topLeft = 0, topRight = 0, bottomRight = 0, bottomLeft = 0 } = cornerRadii;

    const graphics = new PIXI.Graphics();

    if (fillStyle.type === "solid" && !Array.isArray(fillStyle.color)) {
      graphics.beginFill(fillStyle.color);
    } else if (fillStyle.type === "gradient" && Array.isArray(fillStyle.color)) {
      const gradient = new PIXI.Graphics();
      if (fillStyle.verti) {
        gradient
          .beginFill(fillStyle.color[0])
          .drawRect(0, 0, width, height / 2)
          .beginFill(fillStyle.color[1])
          .drawRect(0, height / 2, width, height / 2);
      } else {
        gradient
          .beginFill(fillStyle.color[0])
          .drawRect(0, 0, width / 2, height)
          .beginFill(fillStyle.color[1])
          .drawRect(width / 2, 0, width / 2, height);
      }
      const texture = Engine.instance.getPixiApp().renderer.generateTexture(gradient);
      graphics.beginTextureFill({ texture });
    } else {
      graphics.beginFill(0xffffff);
    }

    graphics.moveTo(topLeft, 0);

    graphics.lineTo(width - topRight, 0);
    if (topRight > 0) {
      graphics.arcTo(width, 0, width, topRight, topRight);
    } else {
      graphics.lineTo(width, 0);
    }

    graphics.lineTo(width, height - bottomRight);
    if (bottomRight > 0) {
      graphics.arcTo(width, height, width - bottomRight, height, bottomRight);
    } else {
      graphics.lineTo(width, height);
    }

    graphics.lineTo(bottomLeft, height);
    if (bottomLeft > 0) {
      graphics.arcTo(0, height, 0, height - bottomLeft, bottomLeft);
    } else {
      graphics.lineTo(0, height);
    }

    graphics.lineTo(0, topLeft);
    if (topLeft > 0) {
      graphics.arcTo(0, 0, topLeft, 0, topLeft);
    } else {
      graphics.lineTo(0, 0);
    }

    graphics.endFill();
    graphics.skew.set(skewX / height, 0);
    return Engine.instance.getPixiApp().renderer.generateTexture(graphics);
  }

  public static createCustomSkewedRoundedRectangleGraphics(
    x: number,
    y: number,
    width: number,
    height: number,
    skewX: number,
    cornerRadii: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number }
  ) {
    const skewFactor = skewX / height;
    const { topLeft = 0, topRight = 0, bottomRight = 0, bottomLeft = 0 } = cornerRadii;

    const gfx = new PIXI.Graphics();
    const m = new PIXI.Matrix(1, 0, -skewFactor, 1, x, y);
    gfx.transform.setFromMatrix(m);
    gfx.beginFill(0x555555);
    gfx.moveTo(topLeft, 0);

    gfx.lineTo(width - topRight, 0);
    if (topRight > 0) {
      gfx.arcTo(width, 0, width, topRight, topRight);
    } else {
      gfx.lineTo(width, 0);
    }

    gfx.lineTo(width, height - bottomRight);
    if (bottomRight > 0) {
      gfx.arcTo(width, height, width - bottomRight, height, bottomRight);
    } else {
      gfx.lineTo(width, height);
    }

    gfx.lineTo(bottomLeft, height);
    if (bottomLeft > 0) {
      gfx.arcTo(0, height, 0, height - bottomLeft, bottomLeft);
    } else {
      gfx.lineTo(0, height);
    }

    gfx.lineTo(0, topLeft);
    if (topLeft > 0) {
      gfx.arcTo(0, 0, topLeft, 0, topLeft);
    } else {
      gfx.lineTo(0, 0);
    }
    gfx.endFill();
    return gfx;
  }

  public static createSkewedRoundedRectangleGraphics(x: number, y: number, width: number, height: number, radius: number, skewPixels: number) {
    const skewFactor = skewPixels / height;

    const gfx = new PIXI.Graphics();
    const m = new PIXI.Matrix(1, 0, -skewFactor, 1, x, y);
    gfx.transform.setFromMatrix(m);
    gfx.beginFill(0x555555);
    gfx.drawPolygon([
      new PIXI.Point(skewPixels, radius),
      new PIXI.Point(skewPixels + radius, 0),
      new PIXI.Point(width, 0),
      new PIXI.Point(width, height - radius),
      new PIXI.Point(width - radius, height),
      new PIXI.Point(skewPixels, height)
    ]);

    gfx.drawCircle(skewPixels + radius, radius, radius);
    gfx.drawCircle(width - radius, height - radius, radius);
    gfx.endFill();
    return gfx;
  }

  public static createGradientWithStops(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color1: string, color2: string, stops: number[]) {
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((stop, i) => gradient.addColorStop(stop, i % 2 === 0 ? color1 : color2));
    return gradient;
  }

  public static createGradient(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color1: string, color2: string) {
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  }

  public static drawPatternTextureToContext(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color1: string,
    color2: string,
    segments: number,
    skewPixels: number,
    vertical: boolean = false
  ) {
    const skewFactor = -skewPixels / height;
    // const oldTransform = ctx.getTransform(); // not supported on n2
    const segmentHeight = vertical ? (width - skewPixels) / segments : height / segments;

    ctx.transform(1, 0, skewFactor, 1, x, y);
    for (let s = 0; s < segments; s++) {
      const currentColor = s % 2 === 0 ? color1 : color2;
      ctx.fillStyle = currentColor;
      if (vertical) ctx.fillRect(x + skewPixels + segmentHeight * s, y, segmentHeight, height);
      else ctx.fillRect(x + skewPixels, y + segmentHeight * s, width - skewPixels, segmentHeight);
    }
    // ctx.setTransform(oldTransform);
  }

  public static createNGonGraphics(x: number, y: number, radius: number, corners: number) {
    const gfx = new PIXI.Graphics();
    gfx.beginFill(0x555555);

    const vertices: PIXI.Point[] = [];
    for (let i = 0; i < corners; i++) {
      const vx = x + radius * Math.cos((2 * Math.PI * i) / corners);
      const vy = y + radius * Math.sin((2 * Math.PI * i) / corners);
      vertices.push(new PIXI.Point(vx, vy));
    }

    gfx.drawPolygon(vertices);
    gfx.endFill();
    return gfx;
  }

  public static drawNGonGraphics(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    corners: number,
    startAngle: number,
    fillStyle: string | CanvasGradient | CanvasPattern
  ) {
    ctx.beginPath();
    ctx.fillStyle = fillStyle;

    // const oldTransform = ctx.getTransform(); // not supported on n2
    //ctx.transform(1, 0, -skewFactor, 1, x, y);

    for (let i = 0; i < corners; i++) {
      const vx = x + radius * Math.cos((2 * Math.PI * i + startAngle) / corners);
      const vy = y + radius * Math.sin((2 * Math.PI * i + startAngle) / corners);
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }

    ctx.closePath();
    ctx.fill();
    // ctx.setTransform(oldTransform);
  }

  public static createRoundedMask(
    g: PIXI.Graphics,
    width: number,
    height: number,
    skew: boolean,
    radii: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number }
  ): PIXI.Graphics {
    const { topLeft, topRight, bottomRight, bottomLeft } = radii;
    g.beginFill(0x39ff14, 1);
    g.moveTo(0, topLeft);
    g.arcTo(0, 0, topLeft, 0, topLeft);
    g.lineTo(width - topRight, 0);
    g.arcTo(width, 0, width, topRight, topRight);
    g.lineTo(width, height - bottomRight);
    g.arcTo(width, height, width - bottomRight, height, bottomRight);
    g.lineTo(bottomLeft, height);
    g.arcTo(0, height, 0, height - bottomLeft, bottomLeft);
    g.lineTo(0, topLeft);
    g.endFill();

    // Apply skew transformation
    if (skew) {
      const skewMatrix = UIHelper.getSkewMatrix(height);
      g.transform.setFromMatrix(skewMatrix);
    }

    return g;
  }

  public static createNGonTexture(radius: number, corners: number, fill: string, startAngle: number = 0) {
    const canvas = document.createElement("canvas");
    canvas.width = radius * 2;
    canvas.height = radius * 2;
    const ctx = canvas.getContext("2d")!;
    DrawHelper.drawNGonGraphics(ctx, radius, radius, radius * 2, radius * 2, radius, corners, startAngle, fill);
    // const texture = PIXI.Texture.from(canvas);
    const baseTexture = new PIXI.BaseTexture(canvas); // don't cache
    const texture = new PIXI.Texture(baseTexture);
    return texture;
  }

  public static calculateGradientStops(color1: string, color2: string, row: number, rowcount: number, gradientStart = 0, gradientEnd = 1, marginFactor = 1) {
    function hexToRgb(hex: string) {
      const bigint = parseInt(hex.replace("#", ""), 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    }

    function rgbToHex(r: number, g: number, b: number) {
      return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
    }

    function interpolateColor(color1: number[], color2: number[], factor: number) {
      return color1.map((c, i) => Math.round(c + factor * (color2[i] - c)));
    }

    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    const rowHeights = Array(rowcount).fill(1);
    rowHeights[rowcount - 1] = marginFactor;

    const totalHeight = rowHeights.reduce((a: number, b: number) => a + b, 0);

    // **Gradient Start & End Umrechnung**
    const startPos = Math.max(0, (row / rowcount - gradientStart) / (gradientEnd - gradientStart));
    const endPos = Math.max(0, ((row + 1) / rowcount - gradientStart) / (gradientEnd - gradientStart));

    // Start & End Position normalisieren
    const clampedStart = Math.min(1, Math.max(0, startPos));
    const clampedEnd = Math.min(1, Math.max(0, endPos));

    // Farben interpolieren
    const startColor = interpolateColor(rgb1, rgb2, clampedStart);
    const endColor = interpolateColor(rgb1, rgb2, clampedEnd);

    return [rgbToHex(startColor[0], startColor[1], startColor[2]), rgbToHex(endColor[0], endColor[1], endColor[2])];
  }
}

const hm = module as any;
if (hm.hot) {
  hm.hot.dispose((d: any) => {
    DrawHelper.dispose();
  });
}
