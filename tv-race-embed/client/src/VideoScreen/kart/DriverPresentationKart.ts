import { MultiText } from "./../common/MultiText";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, settings } from "client/Logic/Logic";
import { Util } from "common/Util";
import { DriverInfoBarKart } from "./DriverInfoBarKart";
import { Logic } from "client/Logic/Logic";
import { IDriver, IAnimInterval } from "client/Logic/LogicDefinitions";
import { GameLength } from "common/Definitions";
import { Color } from "common/Color";

type Anim = IAnimInterval & { pause: number };
interface ICombinedAnim {
  driver: Anim;
  bar: Anim;
}

export class DriverPresentationKart extends Group {
  private racerCount: number;
  private driverName: MultiText;
  private oddsNumberMain!: PIXI.Text;
  private driverOdds: PIXI.Text[] = [];
  private currentDriverIndex: number = -1;
  private currentBarIndex: number = -1;
  private driverInfoBar: DriverInfoBarKart;
  private drivers: IDriver[] = [];
  private odds: number[] = [];
  private anim: ICombinedAnim | undefined;
  private gameLength: GameLength;

  public constructor(racerCount: number, gameLength: GameLength) {
    super();
    this.racerCount = racerCount;
    this.gameLength = gameLength;
    this.showDebug(settings.debug);

    this.driverName = MultiText.fromName(["", ""], _s(26));
    this.add(this.driverName);

    const styleOdds = new PIXI.TextStyle({
      fontFamily: "DIN-Medium",
      fontSize: _s(22),
      fill: "white",
      align: "center"
    });
    this.oddsNumberMain = Logic.createPixiText(styleOdds);
    this.oddsNumberMain.anchor.set(0.5);
    this.oddsNumberMain.roundPixels = true;
    this.add(this.oddsNumberMain);

    for (let i = 0; i < racerCount - 1; i++) {
      const oddText = Logic.createPixiText(styleOdds);
      this.driverOdds.push(oddText);
      this.driverOdds[i].anchor.set(0.5);
      this.driverOdds[i].roundPixels = true;
      this.add(this.driverOdds[i]);
    }

    this.driverInfoBar = new DriverInfoBarKart();
    this.add(this.driverInfoBar);
  }

  public fill(drivers: IDriver[], odds: number[], withBonus: boolean) {
    this.drivers = drivers;
    this.odds = odds;
    this.anim = this.createAnim(this.gameLength, withBonus);
  }

  private createAnim(gameLength: GameLength, withBonus: boolean): ICombinedAnim | undefined {
    switch (gameLength) {
      case 120:
        return undefined;
      case 180:
        return {
          driver: withBonus ? { startTime: 60.0, duration: 3.8, pause: 0.1 } : { startTime: 70.0, duration: 3.8, pause: 0.1 },
          bar: withBonus ? { startTime: 60.3, duration: 3.35, pause: 0.68 } : { startTime: 70.4, duration: 3.34, pause: 0.67 }
        };
      case 240:
        return {
          driver: { startTime: 70.0, duration: 3.85, pause: 0.05 },
          bar: { startTime: 70.35, duration: 3.25, pause: 0.75 }
        };
      case 300:
        return {
          driver: withBonus ? { startTime: 69.8, duration: 3.75, pause: 0.2 } : { startTime: 79.9, duration: 3.94, pause: 0.0 },
          bar: withBonus ? { startTime: 70.5, duration: 3.1, pause: 0.85 } : { startTime: 80.6, duration: 2.94, pause: 1.0 }
        };
    }
  }

  public updateDriverTexts(index: number) {
    const odds = this.odds;
    const drivers = this.drivers;
    if (!drivers || !drivers[index]) {
      return false;
    }
    const driver = drivers[index];
    this.driverName.updateTexts([driver.firstName, driver.lastName]);

    const oddsMainDriver = Logic.getOddsForDriver(odds, index, index, drivers.length);
    const afterDigitsOverwrite = Logic.getOddsForDriverDigits(odds, index, index, drivers.length);
    if (afterDigitsOverwrite === null) {
      this.oddsNumberMain.text = Logic.implementation.formatOdds(oddsMainDriver);
    } else {
      this.oddsNumberMain.text = Logic.implementation.formatOdds(oddsMainDriver, afterDigitsOverwrite);
    }

    for (let i = 0; i < this.racerCount - 1; i++) {
      const otherDriverIndex = i + (index <= i ? 1 : 0);
      const oddsCurrentDriver = Logic.getOddsForDriver(odds, index, otherDriverIndex, drivers.length);
      const afterDigitsOverwrite2 = Logic.getOddsForDriverDigits(odds, index, otherDriverIndex, drivers.length);
      if (afterDigitsOverwrite2 === null) {
        this.driverOdds[i].text = Logic.implementation.formatOdds(oddsCurrentDriver);
      } else {
        this.driverOdds[i].text = Logic.implementation.formatOdds(oddsCurrentDriver, afterDigitsOverwrite2);
      }
    }

    return true;
  }

  public updateBarTexts(index: number) {
    const drivers = this.drivers;
    if (!drivers || !drivers[index]) {
      return false;
    }
    const driver = drivers[index];
    this.driverInfoBar.fill(driver);
    return true;
  }

  public onLayout() {
    this.driverName.position.x = _s(50);
    this.driverName.position.y = _s(13);

    this.oddsNumberMain.position.x = _s(315);
    this.oddsNumberMain.position.y = _s(65);

    for (let i = 0; i < this.racerCount - 1; i++) {
      this.driverOdds[i].x = _s(316);
      this.driverOdds[i].y = _s(104 + i * 40);
    }

    this.driverInfoBar.position.x = -this.position.x;
    this.driverInfoBar.position.y = -this.position.y + _s(655);
    this.driverInfoBar.width = settings.screen.width;
    this.driverInfoBar.height = _s(25);
  }

  private calcAnim(anim: Anim, t: number): [IAnimInterval, number] {
    const index = Util.clamp(Math.floor((t - anim.startTime) / (anim.duration + anim.pause)), 0, this.racerCount - 1);
    const resultAnim = {
      startTime: anim.startTime + index * (anim.duration + anim.pause),
      duration: anim.duration
    };
    return [resultAnim, index];
  }

  public update(dt: number) {
    super.update(dt);

    if (!this.anim) return;

    const t = Logic.getVideoTime();
    const [driverAnim, driverIndex] = this.calcAnim(this.anim.driver, t);
    const [barAnim, barIndex] = this.calcAnim(this.anim.bar, t);
    const dAnim = Logic.getAnim(t, [driverAnim], this);
    if (!dAnim) return;

    if (driverIndex !== this.currentDriverIndex) {
      if (this.updateDriverTexts(driverIndex)) this.currentDriverIndex = driverIndex;
    }

    if (barIndex !== this.currentBarIndex) {
      if (this.updateBarTexts(barIndex)) this.currentBarIndex = barIndex;
    }

    {
      const anim = dAnim;
      let baseFactor = t - anim.startTime;
      if (baseFactor < anim.duration - 0.4) {
        this.setDebugFade(baseFactor);
        this.driverName.alpha = baseFactor;
        this.driverName.animateText(baseFactor * 2 - 0.5);

        this.oddsNumberMain.alpha = baseFactor - 0.6;
        for (let i = 0; i < this.racerCount - 1; i++) {
          this.driverOdds[i].alpha = baseFactor - (0.7 + (i + 1) * 0.1);
        }
      } else {
        baseFactor = (anim.duration - baseFactor) * 5;
        this.setDebugFade(baseFactor);
        this.driverName.alpha = baseFactor;
        this.driverName.animateText(baseFactor);

        this.oddsNumberMain.alpha = baseFactor;
        for (let i = 0; i < this.racerCount - 1; i++) {
          this.driverOdds[i].alpha = baseFactor;
        }
      }
    }
    {
      const anim = barAnim;
      let baseFactor = t - anim.startTime;
      if (baseFactor < anim.duration - 0.4) {
        this.driverInfoBar.setFadeFactor(baseFactor * 2);
      } else {
        baseFactor = (anim.duration - baseFactor) * 5;
        this.driverInfoBar.setFadeFactor(baseFactor);
      }
    }
  }
}
