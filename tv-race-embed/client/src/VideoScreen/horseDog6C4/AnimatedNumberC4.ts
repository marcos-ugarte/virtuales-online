import { Group } from "client/Graphics/Group";
import { _s, Logic } from "client/Logic/Logic";
import { Util } from "common/Util";
import { Text, TextStyle } from "pixi.js";
import { RunningNumber } from "../common/RunningNumber";
import { AnimHelper } from "../common/Anim";

export class AnimatedNumberC4 extends Group {
  private preCommaText: Text;
  private runningNumber: RunningNumber[] = [];
  private bonusValue: number | undefined = 0;
  private oldBonusValue: number = 0;
  private lastValues: number[] = [0, 0];
  private lastScroll: number[] = [0, 0];
  private startTime: number;

  public constructor(style?: TextStyle, startTime: number = 0) {
    super();
    this.startTime = startTime;
    {
      {
        if (style === undefined) {
          style = new TextStyle({
            fontFamily: "DIN-Medium",
            fontSize: _s(13),
            fill: "white",
            align: "right"
          });
        }
        this.preCommaText = Logic.createPixiText(style);
        this.preCommaText.anchor.set(1, 0.5);
        // this.text1.filters = [this.blurFilter];
        this.add(this.preCommaText);
      }

      const runningNumberStyle = new TextStyle({
        fontFamily: "DIN-Medium",
        fill: "#cbdccb",
        align: "left"
      });
      for (let i = 0; i < 2; i++) {
        this.runningNumber.push(new RunningNumber(runningNumberStyle));
        this.add(this.runningNumber[i]);
      }
    }
  }

  public setFontSize(size: number) {
    this.preCommaText.style.fontSize = size;
    for (let i = 0; i < 2; i++) this.runningNumber[i].setFontSize(size);
  }

  public fill(bonusValue: number | undefined, oldBonusValue: number | undefined) {
    this.bonusValue = bonusValue ? Util.round(bonusValue, 2) : bonusValue;
    this.oldBonusValue = oldBonusValue ? Util.round(oldBonusValue, 2) : 0;
    this.lastValues = [0, 0];
    this.lastScroll = [0, 0];
    const digitsCount = bonusValue?.toString().split(".")[0].length ?? 0;
    this.preCommaText.position.y = _s(0.0);
    for (let i = 0; i < 2; i++) {
      this.runningNumber[i].position.x = this.preCommaText.position.x + 0.04 * Logic.getFontSize(this.preCommaText) - 1.0 + i * 0.5 * (1 + Logic.getFontSize(this.preCommaText));
      this.runningNumber[i].position.y = this.preCommaText.position.y;
    }
    this.position.x = _s(170 + digitsCount * 8);
  }

  public easeOut(time: number, beginningValue: number, changeInValue: number, duration: number, endvalue: number): number {
    let t = time;
    const b = beginningValue;
    const c = changeInValue;
    const d = duration;

    if (t >= d) return endvalue;
    return -c * (t /= d) * (t - 2) + b;
  }

  public onLayout() {
    this.container.pivot.y = 0; // this.container.height * 0.5;
  }

  public getFactor(current: number, startTime: number, endTime: number) {
    const factor = (current - startTime) / (endTime - startTime);
    return Util.clamp(factor, 0, 1);
  }

  public update(dt: number) {
    super.update(dt);

    const maxSpeed = 0.2;
    if (this.bonusValue === undefined) {
      this.visible = false;
    } else {
      this.visible = true;
      const t = Logic.getVideoTime();
      const rt = Logic.getIntroLength();
      const digitsCount = this.bonusValue.toString().split(".")[0].length;
      const currentValueToShow = this.easeOut(t, this.oldBonusValue, this.bonusValue - this.oldBonusValue, rt - 3, this.bonusValue);
      const numberString = Util.formatValueC4(Math.floor(currentValueToShow), 1);
      this.preCommaText.text = numberString.substring(0, numberString.length - 1).padStart(digitsCount + 1, "0");

      let v = currentValueToShow;
      let delta = this.bonusValue - currentValueToShow;

      for (let i = 0; i < 2; i++) {
        v = v * 10;
        const l = Math.floor(v % 10);
        let r = (v % 10) - l;

        delta = delta * 10;
        if (Math.abs(delta) <= 0.1) r = r * (delta * 10);

        if (v - this.lastValues[i] > maxSpeed) r = (this.lastScroll[i] + maxSpeed) % 1;

        this.runningNumber[i].setValue(l, r);
        this.lastScroll[i] = r;
        this.lastValues[i] = v;
      }
    }
  }
}
