import { Group } from "client/Graphics/Group";
import { RunningNumber } from "./RunningNumber";
import { _s, Logic } from "client/Logic/Logic";
import { Util } from "common/Util";
import { Text, TextStyle } from "pixi.js";

export class AnimatedNumber extends Group {
  private preCommaText: Text;
  private runningNumber: RunningNumber[] = [];
  private bonusValue: number | undefined = 0;
  private oldBonusValue: number = 0;
  private lastValues: number[] = [0, 0];
  private lastScroll: number[] = [0, 0];
  private oddsAlwaysOn;

  public constructor(style?: TextStyle, oddsAlwaysOn = false) {
    super();
    this.oddsAlwaysOn = oddsAlwaysOn;
    {
      {
        if (style === undefined) {
          style = new TextStyle({
            fontFamily: "DIN-Medium",
            fontSize: _s(13),
            trim: false,
            fill: "white",
            align: "right"
          });
        }

        this.preCommaText = Logic.createPixiText(style);
        this.preCommaText.anchor.set(1, 0.5);
        // this.text1.filters = [this.blurFilter];
        this.add(this.preCommaText);
      }

      for (let i = 0; i < 2; i++) {
        this.runningNumber.push(new RunningNumber());
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
  }

  public onLayout() {
    this.preCommaText.position.x = _s(114);
    this.preCommaText.position.y = _s(0.0);

    for (let i = 0; i < 2; i++) {
      this.runningNumber[i].position.x = this.preCommaText.position.x + 0.04 * Logic.getFontSize(this.preCommaText) - 1.0 + i * 0.5 * (1 + Logic.getFontSize(this.preCommaText));
      this.runningNumber[i].position.y = this.preCommaText.position.y;
      // this.runningNumber[i].filters = [this.blurFilter];
    }

    this.container.pivot.y = 0; // this.container.height * 0.5;
  }

  public getFactor(current: number, startTime: number, endTime: number) {
    const factor = (current - startTime) / (endTime - startTime);
    return Util.clamp(factor, 0, 1);
  }

  private easeFunction(t: number) {
    const m0 = 3;
    const m1 = 3;
    const t2 = t * t;
    const t3 = t2 * t;
    return (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) + (t3 - t2) * m1;
  }

  public update(dt: number) {
    super.update(dt);

    const maxSpeed = 0.2;
    if (this.bonusValue === undefined) {
      this.visible = false;
    } else {
      this.visible = true;
      const t = Logic.getVideoTime();
      const rt = Logic.getTimeUntilRaceForTimeBar();
      const oldBonusTime = this.oldBonusValue > 0 ? 10.0 : 0.0; // if there is an oldBonus -> fade fast to oldBonusTime and then slow...

      const oldBonusFactor = this.getFactor(t, 0, oldBonusTime);
      const oldBonusValueToShow = oldBonusFactor * this.oldBonusValue + 0.00001; // AnimFactor.fromTime(oldBonusFactor).sigmoid(10).val * this.oldBonusValue + 0.0001;
      const bonusFactor = this.getFactor(t, oldBonusTime, rt);
      // const bonusValueToShow = this.oldBonusValue + bonusFactor * (this.bonusValue - this.oldBonusValue) + 0.0001;
      const bonusValueToShow = bonusFactor >= 1.0 ? this.bonusValue : this.oldBonusValue + this.easeFunction(bonusFactor) * (this.bonusValue - this.oldBonusValue) + 0.00001;
      const lerpFactor = Util.clamp(t - oldBonusTime + 1.0, 0, 1);
      const currentValueToShow = Util.lerp(oldBonusValueToShow, bonusValueToShow, lerpFactor);

      const numberString = Logic.implementation.formatNumber(Math.floor(currentValueToShow), 1);
      this.preCommaText.text = numberString.substring(0, numberString.length - 1);

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
