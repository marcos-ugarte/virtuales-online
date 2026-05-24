import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, settings, _s } from "client/Logic/Logic";
import { Util } from "common/Util";

export class ScrollingText extends Group {
  private numbers: PIXI.Text[] = [];
  private clippingMask: PIXI.Sprite;
  private externalMask: boolean = false;
  private maskSize: PIXI.Rectangle = new PIXI.Rectangle();
  private textX: number = 0;
  private textY: number = 0;
  private vSpacing: number = 0;

  private animStart: number | undefined = 0;
  private animEnd: number = 0;
  public targetY: number = 0;
  private startY: number = 0;
  private scrollDuration: number;
  private style: PIXI.TextStyle;
  private getCurrentTime: () => number;

  public constructor(
    style: PIXI.TextStyle,
    valueCount: number,
    scrollDuration: number,
    getCurrentTime: () => number,
    externalMask: PIXI.Sprite | undefined,
    maskX: number,
    maskY: number,
    maskWidth: number,
    maskHeight: number,
    textX: number,
    textY: number,
    vSpacing: number
  ) {
    super();

    super.showDebug(settings.debug, undefined, "ST");

    this.style = style;
    if (externalMask) {
      this.externalMask = true;
      this.clippingMask = externalMask;
    } else {
      this.clippingMask = new PIXI.Sprite(PIXI.Texture.WHITE);
      this.add(this.clippingMask);
    }
    this.scrollDuration = scrollDuration;
    this.getCurrentTime = getCurrentTime;

    if (!this.externalMask) {
      this.maskSize.x = maskX;
      this.maskSize.y = maskY;
      this.maskSize.width = maskWidth;
      this.maskSize.height = maskHeight;

      this.clippingMask.x = this.maskSize.x;
      this.clippingMask.y = this.maskSize.y;
      this.clippingMask.width = this.maskSize.width;
      this.clippingMask.height = this.maskSize.height;
    }
    this.textX = textX;
    this.textY = textY;
    this.vSpacing = vSpacing;

    {
      for (let i = 0; i < valueCount; i++) {
        const numberText = Logic.createPixiText(style);
        numberText.anchor.set(0, 0.5);
        this.numbers.push(numberText);

        numberText.text = "" + i;
        this.add(numberText);
        numberText.mask = this.clippingMask;
      }
    }
  }

  public setValues(values: string[]) {
    if (values === undefined) values = ["0"];
    for (let i = 0; i < values.length; i++) {
      if (i >= this.numbers.length) {
        const numberText = Logic.createPixiText(this.style);
        this.numbers.push(numberText);
        numberText.text = values[i];
        this.add(numberText);
        numberText.mask = this.clippingMask;
      } else {
        this.numbers[i].text = values[i];
      }
    }
    for (let i = values.length; i < this.numbers.length; i++) {
      this.numbers[i].text = "";
    }
    this.setNumbersY(0, true, true);
  }

  public getStyle(): PIXI.TextStyle {
    return this.style;
  }

  public setFontSize(size: number) {
    for (const number of this.numbers) number.style.fontSize = size;
  }

  public fill() {}

  public fillExternalMask(textX: number, textY: number, vSpacing: number) {
    this.textX = textX;
    this.textY = textY;
    this.vSpacing = vSpacing;
  }

  public onLayout() {
    this.container.pivot.y = 0;
    if (!this.externalMask) {
      this.clippingMask.x = _s(this.maskSize.x);
      this.clippingMask.y = _s(this.maskSize.y);
      this.clippingMask.width = _s(this.maskSize.width);
      this.clippingMask.height = _s(this.maskSize.height);
    }

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < this.numbers.length; i++) {
      const number = this.numbers[i];
      number.x = _s(this.textX);
    }
    this.setNumbersY(0, true, true);
  }

  public setNumbersY(target: number, immediate: boolean, force?: boolean) {
    if (immediate) {
      if (this.targetY === target && !force) return;
      this.startY = target;
      for (let i = 0; i < this.numbers.length; i++) {
        const y = _s(this.textY) + (-target + i) * -_s(this.vSpacing);
        this.numbers[i].y = y;
      }
      this.targetY = target;

      // otherwise the mask is broken..
      this.animStart = this.getCurrentTime();
      this.animEnd = this.animStart + this.scrollDuration;
      this.targetY = target;
    } else if (target !== this.targetY || force) {
      this.animStart = this.getCurrentTime();
      this.animEnd = this.animStart + this.scrollDuration;
      this.targetY = target;
    }
    this.fixVisibility();
  }

  public getFactor(current: number, startTime: number, endTime: number) {
    const factor = (current - startTime) / (endTime - startTime);
    return Util.clamp(factor, 0, 1);
  }

  private fixVisibility(): void {
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < this.numbers.length; i++) {
      const mask = this.clippingMask;
      const globalMaskY = mask.getGlobalPosition().y;
      const globalNumberY = this.numbers[i].getGlobalPosition().y;

      if (globalNumberY < globalMaskY - mask.height || globalNumberY > globalMaskY + mask.height) this.numbers[i].visible = false;
      else this.numbers[i].visible = true;
    }
  }

  public update(dt: number) {
    super.update(dt);

    if (this.animStart) {
      const currentTime = this.getCurrentTime();
      const factor = this.getFactor(currentTime, this.animStart, this.animEnd);
      if (factor >= 1.0 || currentTime < this.animStart) {
        // something skipped the current time, fix this by setting the numbers direcly
        // we are done
        this.setNumbersY(this.targetY, true, true);
        this.animStart = undefined;
        this.fixVisibility();
      } else {
        for (let i = 0; i < this.numbers.length; i++) {
          const factorDiff = (this.targetY - this.startY) * factor + this.startY;
          const y = _s(this.textY) + (-factorDiff + i) * -_s(this.vSpacing); //*0.1
          //   const y = this.textY + (((this.targetY-this.startY)*factor) + this.startY + i)*this.vSpacing - (this.vSpacing*this.numbers.length-1);
          this.numbers[i].y = y;
        }
        this.fixVisibility();
      }
    }

    // const maxSpeed = 0.2;

    // let v = 0.1;
    // let delta = dt;

    // for (let i = 0; i < 2; i++) {
    //   v = v * 10;
    //   const l = Math.floor(v % 10);
    //   let r = (v % 10) - l;

    //   delta = delta * 10;
    //   if (Math.abs(delta) <= 0.1)
    //     r = r * (delta * 10);

    //   if ((v - this.lastValues[i]) > maxSpeed)
    //     r = (this.lastScroll[i] + maxSpeed) % 1;

    //   this.runningNumber[i].setValue(l, r);
    //   this.lastScroll[i] = r;
    //   this.lastValues[i] = v;
    // }
  }
}
