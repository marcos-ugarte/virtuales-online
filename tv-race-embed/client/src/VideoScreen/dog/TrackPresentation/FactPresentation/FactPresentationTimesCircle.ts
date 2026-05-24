import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, settings, Logic } from "client/Logic/Logic";
import { IAnimInterval, IGameInfo } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../../common/Anim";
import { DogHelper } from "../../DogHelper";
import { GameType } from "common/Definitions";

export class TrackPresentationTimesCirlce extends Group {
  public fadeInTime: number = 0;
  public fadeOutTime: number = Number.MAX_VALUE;
  private oddsAlwaysOn;
  private useOverlays;
  public times: PIXI.Text[] = [];

  private hourHand = new PIXI.Graphics();
  private minuteHand = new PIXI.Graphics();

  private innerCircle = new PIXI.Graphics();

  private anims: IAnimInterval[] = [];

  private mask = new PIXI.Graphics();
  private maskRadius: number;
  private maskAngle: number;

  private gameType: GameType;

  public constructor(gameInfo: IGameInfo) {
    super();
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.useOverlays = gameInfo.useOverlays;
    this.showDebug(settings.debug);

    this.maskRadius = 100;
    this.maskAngle = Math.PI * 2;

    this.gameType = gameInfo.gameType;
    this.mask.clear();
    this.mask.beginFill(0xffffff);

    this.mask.rotation = -Math.PI * 0.5;

    this.mask.moveTo(0, 0);
    this.mask.arc(0, 0, _s(this.maskRadius), 0, this.maskAngle);
    this.mask.lineTo(0, 0);

    this.mask.endFill();

    this.add(this.mask);

    this.container.mask = this.mask;

    const isHorse = gameInfo.gameType === "horse" || gameInfo.gameType === "sulky";

    const timesCount = 7;
    let angleSpacing = isHorse ? 0.49 : 0.48;
    const radius = isHorse ? 38 : 45;
    const startAngle = isHorse ? -2.3 : -Math.PI * 0.75;
    const endAngle = Math.PI * 0.25;

    const circleRadius = _s(29);
    angleSpacing = (endAngle - startAngle) / (timesCount - 1);

    if (this.useOverlays) {
      this.innerCircle.lineStyle(2, 0xff0000);
      this.innerCircle.drawCircle(0, 0, circleRadius);

      this.hourHand.lineStyle(3, 0xffffff);
      this.hourHand.moveTo(0, 0);
      this.hourHand.lineTo(circleRadius, 0);
      this.hourHand.rotation = -Math.PI * 0.75;
      this.add(this.hourHand);

      this.minuteHand.lineStyle(3, 0xffffff);
      this.minuteHand.moveTo(0, 0);
      this.minuteHand.lineTo(circleRadius, 0);
      this.minuteHand.rotation = Math.PI * 0.25;
      this.add(this.minuteHand);

      this.add(this.innerCircle);
    }

    const timesStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(isHorse ? 12 : 14),
      fill: DogHelper.getWhiteColor(),
      align: "right",
      fontStyle: "italic"
    });

    for (let i = 0; i < timesCount; i++) {
      const x = radius * Math.cos(startAngle + i * angleSpacing);
      const y = radius * Math.sin(startAngle + i * angleSpacing);

      const angle = startAngle + i * angleSpacing;
      const innerX = circleRadius * Math.cos(angle);
      const innerY = circleRadius * Math.sin(angle);
      const outerX = (circleRadius + _s(5)) * Math.cos(angle);
      const outerY = (circleRadius + _s(5)) * Math.sin(angle);

      this.innerCircle.moveTo(innerX, innerY);
      this.innerCircle.lineTo(outerX, outerY);

      const text = Logic.createPixiText(timesStyle);
      text.anchor.set(0.5, 0.5);

      text.text = (i * (isHorse ? 15 : 5)).toString();
      this.add(text);
      text.position.x = _s(x);
      text.position.y = _s(y);

      if (isHorse && !this.oddsAlwaysOn) {
        if (i === 3) {
          text.position.x += _s(2);
          text.position.y += _s(1);
        } else if (i === 4) {
          text.position.x += _s(1);
          text.position.y += _s(3);
        } else if (i === 5) {
          text.position.x += _s(0);
          text.position.y += _s(2);
        } else if (i === 6) {
          text.position.x += _s(0);
          text.position.y += _s(1);
        }
      }
      if (this.oddsAlwaysOn) {
        if (i === 3 || i === 4) {
          text.position.x += _s(2);
        }
      }
      this.times.push(text);
    }
  }

  public fill(anims: IAnimInterval[]) {
    // if (this.oddsAlwaysOn && secondAnims !== undefined) {
    //   startTime += isHorse ? 0 : 0.5;
    //   this.timesCircle.fill([
    //     { startTime, duration: 10 },
    //     { startTime: secondAnims.startTime + (isHorse ? -1 : 0.5), duration: 10 }
    //   ]);
    // } else if (this.oddsAlwaysOn && Logic.implementation.getCurrentIntroGameLength() === 120) {
    //   this.timesCircle.fill([{ startTime: startTime - 3.5, duration: 10 }]);
    // } else {
    //   this.timesCircle.fill([{ startTime, duration: 10 }]);
    // }
    this.anims = anims;
  }

  private drawMask() {
    this.mask.clear();
    this.mask.beginFill(0xffffff);

    this.mask.moveTo(0, 0);
    this.mask.arc(0, 0, _s(this.maskRadius), 0, this.maskAngle);
    this.mask.lineTo(0, 0);

    this.mask.endFill();
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;

    const baseFactor = t - anim.startTime;

    // TODO: das war noch in TrackPresentation Dog
    // const shortOao = this.oddsAlwaysOn && Logic.implementation.getCurrentIntroGameLength() === 120;
    // let circleStartime = shortOao ? 8 : 11;
    // if (this.gameType === "horse" || this.gameType === "sulky") {
    //   circleStartime = 9.2;
    // }

    for (let i = 0; i < this.times.length; i++) {
      AnimHelper.animateInOut(baseFactor, 0, anim.duration, 1, 0, 1, (val) => (this.times[i].alpha = val), 0, 0);
      AnimHelper.animateIn(baseFactor, 0.5 + i * (2.3 / 7), 10, 0.3, 1, 0, (val) => (this.times[i].tint = 0xff0000 | (val * 0xff) | ((val * 0xff00) & 0xff00)));
    }

    AnimHelper.animateIn(baseFactor, 0.7, 10, 3, -Math.PI * 0.75, Math.PI * 0.25, (val) => (this.hourHand.rotation = val));
    AnimHelper.animateIn(baseFactor, 3, 10, 0.5, Math.PI * 2, 0, (val) => (this.maskAngle = val));

    this.drawMask();
  }
}
