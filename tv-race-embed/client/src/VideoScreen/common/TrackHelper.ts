import { Engine } from "client/Graphics/Engine";
import { Group } from "client/Graphics/Group";
import { _s } from "client/Logic/Logic";
import { ColorSource, Container, Graphics, Matrix, Sprite, Texture, WRAP_MODES } from "pixi.js";
import { DashedLineHelper } from "./DashedLine";

export class Track extends Group {
  private trackWidth: number;
  private trackHeight: number;
  private lineWidth: number;
  private color: number;
  private texture: Texture | undefined;
  public direction: "clockwise" | "counterclockwise";
  private track: Graphics;
  public progress: number | undefined;
  private textureContainer: Container | undefined;
  private innerTrack = new Graphics();
  private outerTrack = new Graphics();

  private _lastStartT?: number;
  private _lastEndT?: number;
  private _lastSegmentStart?: number;
  private _lastSegmentEnd?: number;

  public middleline = new Graphics();
  public boxContainer = new Container();

  constructor(
    trackWidth: number,
    trackHeight: number,
    lineWidth: number,
    color: number,
    rotation: number = 0,
    direction: "clockwise" | "counterclockwise" = "clockwise",
    texture?: Texture | "redwhite",
    showTrackGuideLines: boolean = false
  ) {
    super();

    this.container.name = "Track";
    this.trackWidth = _s(trackWidth);
    this.trackHeight = _s(trackHeight);

    this.lineWidth = _s(lineWidth);

    this.color = color;
    this.container.rotation = rotation;

    this.direction = direction;
    this.track = new Graphics();

    if (texture === "redwhite") {
      this.textureContainer = TrackTextureHelper.createRedWhiteTexture(this.trackWidth, this.trackHeight, this.lineWidth);
      this.add(this.textureContainer);
      this.textureContainer.mask = this.track;
      console.log("height ", this.textureContainer.height);
    } else {
      this.texture = texture;
    }

    if (showTrackGuideLines) {
      this.drawTrack(this.innerTrack, true, 42);
      this.drawTrack(this.outerTrack, false, -17);
      this.drawCenterLine();

      this.add(this.innerTrack);
      this.add(this.middleline);
      this.add(this.outerTrack);
    }
    this.add(this.track);
  }

  public getCenterOfTrack() {
    return { x: this.trackWidth / 2, y: this.trackHeight / 2 };
  }

  public drawCenterLine(size?: number) {
    const midY = this.trackHeight / 2;
    this.middleline.cacheAsBitmap = false;
    this.middleline.clear();

    this.middleline.lineStyle(1, 0xffffff, 0.5);
    this.middleline.moveTo(0, midY);
    if (size) {
      this.middleline.lineTo(this.trackWidth / 2 - size, midY);
      this.middleline.moveTo(this.trackWidth / 2 + size, midY);
    }
    this.middleline.lineTo(this.trackWidth, midY);
    this.middleline.cacheAsBitmap = true;
  }

  public drawTrack(track: Graphics, dashed: boolean = false, offset: number = 0) {
    const off = offset;
    const effectiveWidth = this.trackWidth - off * 2;
    const effectiveHeight = this.trackHeight - off * 2;
    const r = effectiveWidth / 2;

    track.clear();
    track.lineStyle(off ? _s(1) : this.lineWidth, this.color, off ? 0.2 : 1, 0.5);

    if (!dashed) {
      track.moveTo(off + r, off);
      track.lineTo(off + effectiveWidth - r, off);
      track.arcTo(off + effectiveWidth, off, off + effectiveWidth, off + r, r);
      track.lineTo(off + effectiveWidth, off + effectiveHeight - r);
      track.arcTo(off + effectiveWidth, off + effectiveHeight, off + effectiveWidth - r, off + effectiveHeight, r);
      track.lineTo(off + r, off + effectiveHeight);
      track.arcTo(off, off + effectiveHeight, off, off + effectiveHeight - r, r);
      track.lineTo(off, off + r);
      track.arcTo(off, off, off + r, off, r);
    } else {
      // DASHED TRACK
      const AMOUNT_OF_DASHES = 53;

      const perimeter = 2 * (effectiveHeight - effectiveWidth) + Math.PI * effectiveWidth;
      const patternSegmentLength = perimeter / AMOUNT_OF_DASHES;
      const dashRatio = 0.5;
      const dashLength = patternSegmentLength * dashRatio;
      const gapLength = patternSegmentLength * (1 - dashRatio);
      const patternLength = dashLength + gapLength;

      let patternOffset = 0;
      // Top edge
      patternOffset = DashedLineHelper.drawDashedLine(track, off + r, off, off + effectiveWidth - r, off, patternOffset, dashLength, patternLength);
      // Top-right arc
      patternOffset = DashedLineHelper.drawDashedArc(track, off + effectiveWidth - r, off + r, r, -Math.PI / 2, 0, patternOffset, dashLength, patternLength);
      // Right edge
      patternOffset = DashedLineHelper.drawDashedLine(track, off + effectiveWidth, off + r, off + effectiveWidth, off + effectiveHeight - r, patternOffset, dashLength, patternLength);
      // Bottom-right arc
      patternOffset = DashedLineHelper.drawDashedArc(track, off + effectiveWidth - r, off + effectiveHeight - r, r, 0, Math.PI / 2, patternOffset, dashLength, patternLength);
      // Bottom edge
      patternOffset = DashedLineHelper.drawDashedLine(track, off + effectiveWidth - r, off + effectiveHeight, off + r, off + effectiveHeight, patternOffset, dashLength, patternLength);
      // Bottom-left arc
      patternOffset = DashedLineHelper.drawDashedArc(track, off + r, off + effectiveHeight - r, r, Math.PI / 2, Math.PI, patternOffset, dashLength, patternLength);
      // Left edge
      patternOffset = DashedLineHelper.drawDashedLine(track, off, off + effectiveHeight - r, off, off + r, patternOffset, dashLength, patternLength);
      // Top-left arc
      patternOffset = DashedLineHelper.drawDashedArc(track, off + r, off + r, r, Math.PI, (3 * Math.PI) / 2, patternOffset, dashLength, patternLength);
    }

    if (this.texture) {
      track.beginTextureFill({ texture: this.texture });
    }
    track.endFill();
  }

  public drawFixedTrack(dashed: boolean = false) {
    this.drawTrack(this.track, dashed);
  }

  public drawAnimatedTrack(
    anim: {
      start: number;
      end?: number;
    },
    currentTime: number,
    trackInfo?: {
      trackStartsAt?: number;
      speedOfTrackAnim?: number;
      shrinkAnimation?: boolean;
      growAnimation?: boolean;
      speedOfGrowAnim?: number;
      speedOfShrinkAnim?: number;
      initialTrackLength?: number;
      stopWhenDone?: boolean;
    }
  ) {
    if (trackInfo?.growAnimation && trackInfo?.shrinkAnimation) {
      console.error("Track can't grow and shrink at the same time");
    }

    const trackStartsAt = trackInfo?.trackStartsAt || 0;
    const speedOfTrackAnim = trackInfo?.speedOfTrackAnim || 1;
    const speedOfShrinkAnim = trackInfo?.speedOfShrinkAnim || 1;
    const speedOfGrowAnim = trackInfo?.speedOfGrowAnim || 1;

    const fx = trackStartsAt + this.getFactorForElement(anim.start, currentTime, anim.end) * speedOfTrackAnim;
    const initialTrackLength = trackInfo?.initialTrackLength || 0.25;
    let visibleLength = initialTrackLength;

    if (trackInfo?.shrinkAnimation) {
      const lengthFx = this.getFactorForElement(anim.start, currentTime, anim.end) * speedOfShrinkAnim;
      visibleLength = initialTrackLength - lengthFx * initialTrackLength;
    }

    if (trackInfo?.growAnimation) {
      const lengthFx = this.getFactorForElement(anim.start, currentTime, anim.end) * speedOfGrowAnim;
      visibleLength = initialTrackLength + lengthFx * initialTrackLength;

      if (trackInfo.stopWhenDone && visibleLength >= 0.98 && this.progress === undefined) {
        this.setProgress(1);
      }

      if (trackInfo.stopWhenDone && visibleLength >= 0.98) {
        this.track.emit("animationDone");
      }
    }

    const visible = fx > trackStartsAt;
    const endParam = fx + visibleLength;

    this.track.visible = visible;

    // 💡 Nur neu zeichnen, wenn sich etwas geändert hat
    if (this._lastStartT !== fx || this._lastEndT !== endParam) {
      this.track.clear();
      this.drawThickTrackSegmentMask(fx, endParam);
      this._lastStartT = fx;
      this._lastEndT = endParam;
    }
  }

  private getFactorForElement(startTime: number, currentTime: number, endTime?: number) {
    if (currentTime < startTime) return 0;
    if (endTime && currentTime > endTime) return 0;
    const baseFactor = currentTime - startTime;
    return Math.max(0, baseFactor);
  }

  public update(dt: number) {
    super.update(dt);
  }

  public setProgress(progress: number) {
    this.progress = progress;
  }

  public onLayout(): void {
    if (this.textureContainer) {
      this.textureContainer.position.set(-this.lineWidth / 2, -this.lineWidth / 2);
    }
  }

  public setTrackVisibility(visible: boolean = false): void {
    console.log("TRYING SETTING VISIBLE");
    if (this.textureContainer) {
      console.log("SETTING VISIBLE textureContainer");
      this.textureContainer.visible = visible;
    }
    this.middleline.visible = visible;
    this.innerTrack.visible = visible;
    this.outerTrack.visible = visible;
    this.track.visible = visible;
  }

  public drawSegmentOrFullTrack(startProgress: number, endProgress: number, endWhenClose = false) {
    if (this.progress === undefined) return console.error("Progress is not set");

    if (endWhenClose && this.progress >= 0.98) {
      this.progress = 1;
      this.drawFixedTrack();
    } else {
      // 💡 Nur neu zeichnen, wenn sich Segmentgrenzen geändert haben
      if (this._lastSegmentStart !== startProgress || this._lastSegmentEnd !== endProgress) {
        this.track.clear();
        this.drawThickTrackSegmentMask(startProgress, endProgress, this.texture);
        this._lastSegmentStart = startProgress;
        this._lastSegmentEnd = endProgress;
      }
    }
  }

  public getPerpendicularAngleOnTrack(progress: number): number {
    const point = this.getPositionOnTrack(progress);
    const nextPoint = this.getPositionOnTrack((progress + 0.001) % 1);

    const dx = nextPoint.x - point.x;
    const dy = nextPoint.y - point.y;

    return Math.atan2(dy, dx);
  }

  public drawThickTrackSegmentMask(startT: number, endT: number, texture?: Texture) {
    this.track.clear();

    startT = ((startT % 1) + 1) % 1;
    endT = ((endT % 1) + 1) % 1;

    let tDist: number;
    if (startT === endT) {
      tDist = 1;
    } else if (endT > startT) {
      tDist = endT - startT;
    } else {
      tDist = 1 - startT + endT;
    }

    const steps = 100;
    const halfW = this.lineWidth / 2;
    const points = [];

    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
      let tt = startT + fraction * tDist;
      tt = ((tt % 1) + 1) % 1;
      const p = this.getPositionOnTrack(tt);
      points.push(p);
    }

    const upper = [];
    const lower = [];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let tangentX;
      let tangentY;
      if (i === 0) {
        const p2 = points[i + 1];
        tangentX = p2.x - p.x;
        tangentY = p2.y - p.y;
      } else if (i === points.length - 1) {
        const p1 = points[i - 1];
        tangentX = p.x - p1.x;
        tangentY = p.y - p1.y;
      } else {
        const pPrev = points[i - 1];
        const pNext = points[i + 1];
        tangentX = pNext.x - pPrev.x;
        tangentY = pNext.y - pPrev.y;
      }

      const len = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
      if (len === 0) continue;
      const tx = tangentX / len;
      const ty = tangentY / len;
      const nx = -ty;
      const ny = tx;

      upper.push({ x: p.x + nx * halfW, y: p.y + ny * halfW });
      lower.push({ x: p.x - nx * halfW, y: p.y - ny * halfW });
    }

    const polygonPoints = [];
    for (const el of upper) {
      polygonPoints.push(el.x, el.y);
    }

    for (let i = lower.length - 1; i >= 0; i--) {
      polygonPoints.push(lower[i].x, lower[i].y);
    }

    if (texture) {
      texture.baseTexture.wrapMode = WRAP_MODES.REPEAT;
      const matrix = new Matrix();
      matrix.tx = -this.trackWidth / 2;
      this.track.beginTextureFill({ texture, matrix });
    } else {
      this.track.beginFill(0xffffff, 1);
    }
    this.track.drawPolygon(polygonPoints);
    this.track.endFill();
  }

  public getAngleOnTrack(progress: number, width: number, height: number): number {
    const point = this.getPositionOnTrack(progress);
    const centerX = width / 2;
    const centerY = height / 2;
    return Math.atan2(point.y - centerY, point.x - centerX);
  }

  public getPositionOnTrack(progress: number, direction?: "clockwise" | "counterclockwise"): { x: number; y: number } {
    const clampedProgress = Math.max(0, Math.min(progress, 1));
    const adjustedProgress = (direction || this.direction) === "clockwise" ? clampedProgress : 1 - clampedProgress;
    return this.getPointOnTrackWithProgress(adjustedProgress);
  }

  public getPointOnTrackWithProgress(t: number) {
    const r = (this.trackWidth - this.lineWidth) / 2;
    const straightLen = this.trackHeight - 2 * r;
    const arcLen = Math.PI * r;
    const perimeter = 2 * arcLen + 2 * straightLen;

    // Normalize t to [0,1)
    t = ((t % 1) + 1) % 1;

    const dist = t * perimeter;

    return this._getPointOnTrackParam(dist);
  }
  public _getPointOnTrackParam(dist: number) {
    const width = this.trackWidth;
    const height = this.trackHeight;

    const r = (this.trackWidth - this.lineWidth) / 2;
    const straightLen = height - 2 * r;
    const arcLen = (Math.PI / 2) * r; // Quarter-circle arc length
    const perimeter = 200 * straightLen + 4 * arcLen; // topLineLen and bottomLineLen =0 if width is exactly equal to the top arc diam.

    const segments = [
      {
        len: arcLen,
        f: (d: number) => {
          // top-right arc: center=(width-r,r), start angle=-90°, end=0°
          const angle = -Math.PI / 2 + (d / arcLen) * (Math.PI / 2);
          return { x: width - r + Math.cos(angle) * r, y: r + Math.sin(angle) * r };
        }
      },
      { len: straightLen, f: (d: number) => ({ x: width, y: r + d }) },
      {
        len: arcLen,
        f: (d: number) => {
          // bottom-right arc: center=(width-r,height-r), start angle=0°, end=90°
          const angle = 0 + (d / arcLen) * (Math.PI / 2);
          return { x: width - r + Math.cos(angle) * r, y: height - r + Math.sin(angle) * r };
        }
      },
      {
        len: arcLen,
        f: (d: number) => {
          // bottom-left arc: center=(r,height-r), start angle=90°, end=180°
          const angle = Math.PI / 2 + (d / arcLen) * (Math.PI / 2);
          return { x: r + Math.cos(angle) * r, y: height - r + Math.sin(angle) * r };
        }
      },
      { len: straightLen, f: (d: number) => ({ x: 0, y: height - r - d }) },
      {
        len: arcLen,
        f: (d: number) => {
          // top-left arc: center=(r,r), start angle=180°, end=270°
          const angle = Math.PI + (d / arcLen) * (Math.PI / 2);
          return { x: r + Math.cos(angle) * r, y: r + Math.sin(angle) * r };
        }
      }
    ];

    let dLeft = dist % perimeter;
    for (const seg of segments) {
      if (dLeft <= seg.len) {
        return seg.f(dLeft);
      }
      dLeft -= seg.len;
    }

    // Fallback (shouldn't happen)
    return { x: r, y: 0 };
  }

  public createStartingBox(
    color: ColorSource,
    progress: number,
    textures?: {
      vertical: Texture;
      horizontal: Texture;
    },
    direction?: "clockwise" | "counterclockwise"
  ) {
    const { x, y } = this.getPositionOnTrack(progress, direction);
    const angle = this.getPerpendicularAngleOnTrack(progress);

    const container = new Container();

    const verticalBox = new Graphics();
    const horizontalBox = new Graphics();

    if (textures) {
      const texture = textures.vertical;
      const verticalSprite = new Sprite(texture);
      verticalSprite.width = _s(8);
      verticalSprite.height = _s(14);
      verticalSprite.position.set(_s(-4), _s(6));

      const horizontalTexture = textures.horizontal;
      const horizontalSprite = new Sprite(horizontalTexture);
      horizontalSprite.width = _s(22);
      horizontalSprite.height = _s(8);
      horizontalSprite.position.set(_s(-18), _s(-16));

      container.addChild(verticalSprite);
      container.addChild(horizontalSprite);
    } else {
      verticalBox.beginFill(color, 1);
      verticalBox.drawRect(_s(-4), _s(6), _s(8), _s(14));
      verticalBox.endFill();

      horizontalBox.beginFill(color, 1);
      horizontalBox.drawRect(_s(-20), _s(-16), _s(22), _s(8));
      horizontalBox.endFill();

      container.addChild(verticalBox);
      container.addChild(horizontalBox);
    }

    container.position.set(x, y);
    container.rotation = angle;

    return container;
  }
}

export class TrackTextureHelper {
  static createFinishLineTexture(rows: number, cols: number): Texture {
    const squareSize = _s(2);
    const graphics = new Graphics();

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        graphics.beginFill((i + j) % 2 === 0 ? 0xffffff : 0x000000);
        graphics.drawRect(j * squareSize, i * squareSize, squareSize, squareSize);
        graphics.endFill();
      }
    }

    return Engine.instance.getPixiApp().renderer.generateTexture(graphics);
  }
  static createRedWhiteTexture(trackWidth: number, trackHeight: number, lineWidth: number): Container {
    const container = new Container();

    const width = trackWidth + lineWidth;
    const height = trackHeight + lineWidth;

    const circle = new Graphics();
    const circle2 = new Graphics();

    const stripeWidth = 5;
    let numStripes = Math.ceil(width / 2 / stripeWidth);
    if (numStripes % 2 === 0) {
      numStripes++;
    }

    const stripeAngle = _s(Math.PI / numStripes);
    for (let i = 0; i < numStripes; i++) {
      const angleStart = i * stripeAngle;
      const angleEnd = (i + 1) * stripeAngle;

      circle.beginFill(i % 2 === 0 ? 0xffffff : 0xff0000);
      circle.moveTo(0, height - width);
      circle.arc(0, height - width, width / 2, angleStart, angleEnd);
      circle.lineTo(0, height - width);
      circle.endFill();

      const angleStart2 = Math.PI - i * stripeAngle;
      const angleEnd2 = Math.PI - (i + 1) * stripeAngle;

      circle2.beginFill(i % 2 === 0 ? 0xffffff : 0xff0000);
      circle2.moveTo(0, 0);
      circle2.arc(0, 0, width / 2, angleStart2, angleEnd2, true);
      circle2.lineTo(0, 0);
      circle2.endFill();
    }

    circle2.rotation = Math.PI;

    const rectangle = new Graphics();
    let stripeCount = 9;
    const totalHeight = height - width;

    if (stripeCount % 2 === 0) {
      stripeCount++;
    }

    const stripeHeight = totalHeight / stripeCount;
    const graphics = new Graphics();
    for (let i = 0; i < stripeCount; i++) {
      graphics.beginFill(i % 2 === 0 ? 0xff0000 : 0xffffff);
      graphics.drawRect(0, i * stripeHeight, width, stripeHeight);
      graphics.endFill();
    }
    const stripeTexture = Engine.instance.getPixiApp().renderer.generateTexture(graphics);
    rectangle.beginTextureFill({ texture: stripeTexture });
    rectangle.drawRect(-width / 2, 0, width, totalHeight);
    rectangle.endFill();

    container.addChild(circle, circle2, rectangle);

    container.pivot.set(-width / 2, -width / 2);

    return container;
  }
}
