import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, settings, _s } from "client/Logic/Logic";
import { IBoxRingPresentationFact } from "client/Logic/LogicDefinitions";
import { ScrollingText } from "./race/ScrollingText";
import { KickboxHelper } from "./KickboxHelper";
import { ITextStyle } from "pixi.js";

export class BoxRingPresentationFact extends Group {
  private factName: PIXI.Text;
  private factValue: ScrollingText;
  private factValueText: PIXI.Text;
  private factData?: IBoxRingPresentationFact;

  //private anims: IAnimInterval[] = [{startTime: 95, duration: 18.3}];

  public constructor(factMask: PIXI.Sprite) {
    super();
    this.showDebug(settings.debug);

    // this.factMask = new PIXI.Sprite(PIXI.Texture.WHITE);
    // this.factMask.alpha = 1.0;
    // this.add(this.factMask);

    // this.title = Logic.createPixiText(KickboxHelper.getHeaderCenterStyle());
    // this.title.anchor.set(0.5, 0.5);
    // this.add(this.title);
    {
      const factNameStyle = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(18),
        fill: KickboxHelper.getGrayBackgroundColor(),
        fontStyle: "italic"
      });
      this.factName = Logic.createPixiText(factNameStyle);
      this.factName.mask = factMask;
      this.factName.anchor.set(0, 0.5);
      this.add(this.factName);
    }

    {
      const factValueStyle = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(18),
        fill: "white",
        fontStyle: "italic"
      });
      this.factValue = new ScrollingText(factValueStyle, 5, 1.5, () => Logic.getVideoTime(), factMask, 0, 0, 100, 20, 0, 0, 26);
      this.add(this.factValue);

      this.factValueText = Logic.createPixiText(factValueStyle);
      this.factValueText.mask = factMask;
      this.factValueText.anchor.set(0, 0.5);
      this.add(this.factValueText);
    }
  }

  public fill(fact: IBoxRingPresentationFact) {
    //this.facts = facts;
    this.factValue.fill();
    //this.factValue.fillExternalMask(0, 0, 20);
    this.factData = fact;

    this.factName.visible = true;
    // check if we have the same fact as before
    this.factName.text = this.factData.title + ": ";

    if (fact.values) {
      this.factValue.setValues(fact.values);
      this.factValue.alpha = 1;
      this.factValue.setNumbersY(0, true);
    } else {
      this.factValue.alpha = 0;
    }

    //this.factValue.setNumbersY(this.factData.values, false);
    this.factValueText.text = this.factData.postfix;

    this.CenterFactText();
    this.onLayout();
  }

  private measurementsX: any = {};

  private GetMeasurementX(text: string, style: PIXI.TextStyle): number {
    if (this.measurementsX[text] !== undefined) {
      return this.measurementsX[text] as number;
    }

    const measurement = PIXI.TextMetrics.measureText(text, style);
    this.measurementsX[text] = measurement.width;
    return this.measurementsX[text] as number;
  }

  private CenterFactText(): void {
    const factValueEntry = this.factData === undefined || this.factData.values.length === 0 ? "" : this.factData.values[this.factData.values.length - 1];
    if (this.factName.style instanceof PIXI.TextStyle && this.factValueText.style instanceof PIXI.TextStyle) {
      const widthFactName = this.GetMeasurementX(this.factName.text, this.factName.style);
      const widthValue = this.GetMeasurementX(factValueEntry, this.factValue.getStyle()); // just measure a zero here
      const widthValueText = this.GetMeasurementX(this.factValueText.text, this.factValueText.style);
      const totalWidth = widthFactName + widthValue + widthValueText;
      const startX = -totalWidth / 2; // _s(this.startValueX)

      const padding = 2;

      this.factName.x = startX;
      this.factValue.x = startX + padding + widthFactName;
      this.factValueText.x = startX + padding + widthFactName + padding + widthValue;
    }
  }

  public onLayout() {
    {
      const factY = _s(0);
      this.factName.y = factY;
      this.factValueText.y = factY;
      this.factValue.y = factY;

      this.CenterFactText();
    }

    //LayoutHelper.setScaledRectangleSprite(this.factMask, 578, 192, 126, 31);
  }

  public startFactAnim() {}

  // public updateFacts(baseFactor: number){

  //   // let currentFact: undefined | IBoxRingPresentationFact;
  //   // for (const fact of this.facts){
  //   //   if (baseFactor > fact.startTime && baseFactor < fact.startTime + fact.duration){
  //   //     currentFact = fact;
  //   //     break;
  //   //   }
  //   // }
  //   if (!this.factData)
  //   {
  //     return;
  //     // disable all the things
  //     // this.factName.visible = false;
  //     // this.factValue.visible = false;
  //     // this.factValueText.visible = false;
  //     // return;
  //   }
  //   // else {
  //   //   this.factName.visible = true;
  //   //   this.factValue.visible = true;
  //   //   this.factValueText.visible = true;
  //   // }

  //   this.factName.visible = true;
  //   // check if we have the same fact as before
  //   if (this.factName.text !== this.factData.title + ": "){
  //     // different -> set it
  //     this.factName.text = this.factData.title + ": ";

  //     this.CenterFactText();

  //     if (typeof(this.factData.value) === "number"){
  //       this.factValue.setNumbersY(0, true);
  //       this.factValue.setNumbersY(this.factData.value, false);
  //       this.factValueText.text = "";
  //     }
  //     else {
  //       this.factValueText.text = this.factData.value.toString();
  //     }
  //   }

  //   const fadeTime = 0.5;
  //   let posY = _s(207);
  //   if (baseFactor - this.factData.startTime < fadeTime){
  //     // fade in
  //     const fadeInFactor = (baseFactor - this.factData.startTime)/fadeTime;
  //     posY = posY + (1.0 - fadeInFactor) * _s(-20);
  //   }
  //   else if ((this.factData.startTime + this.factData.duration) - baseFactor < fadeTime){
  //     // fade out
  //     const fadeOutFactor = ((this.factData.startTime + this.factData.duration) - baseFactor)/fadeTime;
  //     posY = posY + (1.0 - fadeOutFactor) * _s(20);
  //   }
  //   else {
  //     // fully faded in
  //   }

  //   this.factName.y = posY;
  //   this.factValueText.y = posY;
  //   this.factValue.y = posY - _s(10);
  // }

  public updateAnims(baseFactor: number) {
    if (baseFactor > 0 && this.factData && this.factData.values.length > 0 && this.factValue.targetY === 0) {
      this.factValue.setNumbersY(this.factData?.values.length - 1, false);
    } else if (baseFactor <= 0) {
      this.factValue.setNumbersY(0, true);
    }

    if (this.factData) this.visible = baseFactor > -1 && baseFactor < this.factData.duration;

    //AnimHelper.animateInOut(t, anim.startTime, anim.startTime+anim.duration, 0, 0, 1, x => this.alpha = x, 0, 0);

    // const baseFactor = t - anim.startTime;
    // this.showDebugTime("BoxRingPresentation", baseFactor);

    //this.updateFacts(baseFactor);
  }
}
