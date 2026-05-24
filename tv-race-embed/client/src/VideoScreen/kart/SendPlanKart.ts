import { oddsAlwaysOnStyles, sendPlanSettings } from "./../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings, _t } from "client/Logic/Logic";
import { IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { GameLength } from "common/Definitions";

export class SendPlanKart extends Group {
  private headers: PIXI.Text[] = [];
  private sendPlanNumber: PIXI.Text;
  private raceNumber: PIXI.Text;
  private raceStart: PIXI.Text;
  private gameLength: GameLength;
  private oddsAlwaysOn = false;

  // create texts, pixi objects and so on in constructor => if possible
  public constructor(gameLength: GameLength, oddsAlwaysOn: boolean) {
    super();
    this.gameLength = gameLength;
    this.showDebug(settings.debug);
    this.oddsAlwaysOn = oddsAlwaysOn;

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(18),
        letterSpacing: _s(0),
        fill: "white",
        align: "left"
      });
      if (this.oddsAlwaysOn) {
        style.fontSize = _s(oddsAlwaysOnStyles["kart5" as keyof typeof oddsAlwaysOnStyles].sendPlan.sendPlanNumber.fontSize);
      }
      for (let i = 0; i < 3; i++) {
        const header = Logic.createPixiText(style);
        header.anchor.set(0.0, 0.5);
        this.headers.push(header);
        this.add(header);
      }
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fontSize: _s(18),
        letterSpacing: _s(0),
        fill: "white",
        align: "left"
      });
      if (this.oddsAlwaysOn) {
        style.fontSize = _s(oddsAlwaysOnStyles["kart5" as keyof typeof oddsAlwaysOnStyles].sendPlan.sendPlanNumber.fontSize);
      }
      this.sendPlanNumber = Logic.createPixiText(style);
      this.sendPlanNumber.anchor.set(0.0, 0.5);
      this.add(this.sendPlanNumber);
      this.raceNumber = Logic.createPixiText(style);
      this.raceNumber.anchor.set(0.0, 0.5);
      this.add(this.raceNumber);
      this.raceStart = Logic.createPixiText(style);
      this.raceStart.anchor.set(0.0, 0.5);
      this.add(this.raceStart);
    }
  }

  public createAnims(gameLength: GameLength): IAnimInterval[] {
    if (this.oddsAlwaysOn) {
      return [{ startTime: 0.4, duration: 8.6 }];
    }
    switch (gameLength) {
      case 300:
        return [{ startTime: 0.2, duration: 9.6 }];
      default: {
        return [{ startTime: 0.6, duration: 9.1 }];
      }
    }
  }

  // fill texts with infos from model
  public fill(sendPlan: string, raceNumber: string, raceStart: string) {
    this.anims = this.createAnims(this.gameLength);

    this.headers[0].text = _t("sheduleId") + ":";
    this.headers[1].text = _t("eventId") + ":";
    this.headers[2].text = _t("raceStart") + ":";

    this.sendPlanNumber.text = sendPlan;
    this.raceNumber.text = raceNumber;
    this.raceStart.text = raceStart;
  }

  // set positions and sizes when layout changes
  public onLayout() {
    const x = _s(35);
    const firstLineY = _s(77);
    let lineHeight = _s(40);

    if (this.oddsAlwaysOn) {
      lineHeight = _s(sendPlanSettings["kart5" as keyof typeof sendPlanSettings].lineHeight);
    }
    for (let i = 0; i < this.headers.length; i++) {
      this.headers[i].position.x = x;
      this.headers[i].position.y = firstLineY + lineHeight * i * 2;
    }

    this.sendPlanNumber.position.x = x;
    this.sendPlanNumber.position.y = firstLineY + lineHeight;

    this.raceNumber.position.x = x;
    this.raceNumber.position.y = firstLineY + lineHeight * 3;
    this.raceStart.position.x = x;
    this.raceStart.position.y = firstLineY + lineHeight * 5;
  }

  // the startTime and duration of the appearance -> can be more than one
  private anims: IAnimInterval[] = []; // = createEmptyDogAnims();

  // use update for fading, animations and so on...
  public update(dt: number) {
    super.update(dt);

    // get animation if there is one for current videotime...
    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const baseFactor = t - anim.startTime;
    // TODO: Anims

    const animStarts = [0.6, 0.7, 0.8, 0.9, 1.0, 1.1];
    let animDurationOffset = [0.3, 0.25, 0.2, 0.15, 0.1, 0.05, 0.0];

    if (this.oddsAlwaysOn) {
      animDurationOffset = [0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3];
    }

    AnimHelper.animateInOut(baseFactor, animStarts[0], anim.duration - animDurationOffset[0], 1, 0, 1, (alpha) => (this.headers[0].alpha = alpha), 0.2, 0);
    AnimHelper.animateInOut(baseFactor, animStarts[1], anim.duration - animDurationOffset[1], 1, 0, 1, (alpha) => (this.sendPlanNumber.alpha = alpha), 0.2, 0);
    AnimHelper.animateInOut(baseFactor, animStarts[2], anim.duration - animDurationOffset[2], 1, 0, 1, (alpha) => (this.headers[1].alpha = alpha), 0.2, 0);
    AnimHelper.animateInOut(baseFactor, animStarts[3], anim.duration - animDurationOffset[3], 1, 0, 1, (alpha) => (this.raceNumber.alpha = alpha), 0.2, 0);
    AnimHelper.animateInOut(baseFactor, animStarts[4], anim.duration - animDurationOffset[4], 1, 0, 1, (alpha) => (this.headers[2].alpha = alpha), 0.2, 0);
    AnimHelper.animateInOut(baseFactor, animStarts[5], anim.duration - animDurationOffset[5], 1, 0, 1, (alpha) => (this.raceStart.alpha = alpha), 0.2, 0);
  }
}
