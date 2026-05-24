import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, _t, settings } from "client/Logic/Logic";
import { IAnimInterval, IBoxRingPresentationFact, IDriver } from "client/Logic/LogicDefinitions";
import { BoxRingPresentationFighter } from "./BoxRingPresentationFighter";
import { ScrollingText } from "./race/ScrollingText";
import { LayoutHelper } from "../Util/LayoutHelper";
import { AnimHelper } from "../common/Anim";
import { KickboxHelper } from "./KickboxHelper";
import { BoxRingPresentationFact } from "./BoxRingPresentationFact";

export class BoxRingPresentation extends Group {
  //private title: PIXI.Text;
  private fighters: BoxRingPresentationFighter[] = [];

  private factMask: PIXI.Sprite;
  // private factName: PIXI.Text;
  // private factValue: ScrollingText;
  // private factValueText: PIXI.Text;
  private startValueX = 640;

  private facts: BoxRingPresentationFact[] = [];
  private factYs: number[] = [];
  private factsData: IBoxRingPresentationFact[] = [];

  private anims: IAnimInterval[] = [{ startTime: 95, duration: 18.3 }];

  public constructor() {
    super();
    this.showDebug(settings.debug, undefined, "BoxRingPresentation");

    this.factMask = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.factMask.alpha = 1.0;
    this.add(this.factMask);

    // this.title = Logic.createPixiText(KickboxHelper.getHeaderCenterStyle());
    // this.title.anchor.set(0.5, 0.5);
    // this.add(this.title);

    for (let i = 0; i < 2; i++) {
      const fighter = new BoxRingPresentationFighter(i === 0);
      this.fighters.push(fighter);
      this.add(fighter);
    }

    for (let i = 0; i < 3; i++) {
      const fact = new BoxRingPresentationFact(this.factMask);
      this.facts.push(fact);
      this.factYs.push(0);
      this.add(fact);
    }
  }

  public fill(drivers: IDriver[], facts: IBoxRingPresentationFact[]) {
    this.fighters[0].fill(0, drivers[0], _t("blueCorner"));
    this.fighters[1].fill(1, drivers[1], _t("redCorner"));
    this.factsData = facts;

    for (let i = 0; i < this.facts.length; i++) {
      if (i < this.facts.length) {
        this.facts[i].visible = true;
        this.facts[i].fill(facts[i]);
      } else {
        this.facts[i].visible = false;
      }
    }

    this.onLayout();
  }

  private measurementsX: any = {};

  // private GetMeasurementX(text: string, style: PIXI.TextStyle): number
  // {
  //   if (this.measurementsX[text] !== undefined){
  //       return this.measurementsX[text];
  //   }

  //   const measurement = PIXI.TextMetrics.measureText(text, style);
  //   this.measurementsX[text] = measurement.width;
  //   return this.measurementsX[text];
  // }

  public onLayout() {
    {
      //const factY = _s(207);
      const factOffset = 49.5;

      // set fact positions
      for (let i = 0; i < this.facts.length; i++) {
        LayoutHelper.setScaledRectangle(this.facts[i], 1280 / 2, 192 + 15 - factOffset * (i + 1), 200, 31);
        this.factYs[i] = this.facts[i].y;
      }
    }

    LayoutHelper.setScaledRectangleSprite(this.factMask, 448, 192, 386, 31);

    LayoutHelper.setScaledRectangle(this.fighters[0], 117, 324, 223, 104);
    LayoutHelper.setScaledRectangle(this.fighters[1], 757, 324, 223, 104);
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    AnimHelper.animateInOut(t, anim.startTime, anim.startTime + anim.duration, 0, 0, 1, (x) => (this.alpha = x), 0, 0);

    const baseFactor = t - anim.startTime;
    this.showDebugTime("BoxRingPresentation", baseFactor);

    //this.updateFacts(baseFactor);

    if (this.factsData && this.factsData.length > 0) {
      let currentFact = 0;
      //let currentFactTime = 0;
      for (let i = 0; i < this.factsData.length; i++) {
        if (baseFactor > this.factsData[i].startTime) {
          currentFact = i;
          //currentFactTime = baseFactor - this.factsData[i].startTime;
        }
      }

      const factOffset = 50;
      for (let i = 0; i < this.facts.length; i++) {
        //const prevX = 192 + 15 - factOffset*(i)
        AnimHelper.animateIn(
          baseFactor,
          this.factsData[currentFact].startTime,
          this.factsData[currentFact].startTime + 1,
          1,
          currentFact,
          currentFact + 1,
          (y) => (this.facts[i].y = _s(y * factOffset) + this.factYs[i])
        );
        this.facts[i].updateAnims(baseFactor - this.factsData[i].startTime - 1);
        // if (i === currentFact && currentFactTime > 1){
        //   this.facts[currentFact].startFactAnim();
        // }
      }
    }
    // const baseFactor = t - anim.startTime;
    this.fighters[0].updateAnims(baseFactor, anim.duration);
    this.fighters[1].updateAnims(baseFactor - 1.8, anim.duration - 1.8);
  }
}
