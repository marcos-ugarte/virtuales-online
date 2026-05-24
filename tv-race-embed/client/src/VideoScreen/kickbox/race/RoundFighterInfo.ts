import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, _t, settings } from "client/Logic/Logic";
import { IDriver, IFightResult, IHit } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../common/Anim";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { ScrollingText } from "./ScrollingText";
import { TextStyle } from "pixi.js";

export enum HalfTypes {
  FULL = 1,
  HALF = 2,
  QUARTER = 4,
  EIGHTH = 8
}

export class RoundFighterInfo extends Group {
  private fighterName: PIXI.Text;
  private fistText: PIXI.Text;
  private fistCount: ScrollingText;
  private kickText: PIXI.Text;
  private kickCount: ScrollingText;
  private hitMarker: PIXI.Sprite[] = [];
  private halfWidth: HalfTypes = HalfTypes.FULL;
  public currentHitCount: number = 0;

  //private anims: IAnimInterval[] = [{startTime: 120, duration: 32}];

  private hits: IHit[] = [];
  private currentRound: number = 0;
  private currentRoundWithResult: number = 0;

  public constructor() {
    super();
    this.showDebug(settings.debug, undefined, "RoundFighterInfo");

    const fighterNameStyle = new PIXI.TextStyle({
      fontFamily: "DIN-HeavyItalic",
      fontSize: _s(22),
      fill: "pink", // overwritten when filling in infos
      fontStyle: "italic"
    });
    this.fighterName = Logic.createPixiText(fighterNameStyle);
    this.fighterName.anchor.set(0.0, 0.5);
    this.add(this.fighterName);

    const hitTextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-LightItalic",
      fontSize: _s(20),
      fill: "white",
      fontStyle: "italic"
    });
    this.fistText = Logic.createPixiText(hitTextStyle);
    this.fistText.anchor.set(0.0, 0.5);
    this.add(this.fistText);

    const countTextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(20),
      fill: "white",
      fontStyle: "italic"
    });
    this.fistCount = new ScrollingText(countTextStyle, 13, 0.3, () => Logic.getRaceVideoTime(), undefined, 0, -12, 40, 20, 0, 0, 25);
    this.add(this.fistCount);

    this.kickText = Logic.createPixiText(hitTextStyle);
    this.kickText.anchor.set(0.0, 0.5);
    this.add(this.kickText);
    this.kickCount = new ScrollingText(countTextStyle, 13, 0.3, () => Logic.getRaceVideoTime(), undefined, 0, -12, 40, 20, 0, 0, 25);
    this.add(this.kickCount);

    const markerTexture = DrawHelper.createSkewedRoundedRectangleTexture(34, 8, 0, 5, { type: "solid", color: "white" });

    for (let i = 0; i < 64; i++) {
      const marker = new PIXI.Sprite(undefined);
      marker.texture = markerTexture;
      this.hitMarker.push(marker);
      this.add(marker);
    }
    // this.anims = [{
    //     startTime: 3,
    //     duration: 9
    // }]
  }

  public fill(hits: IHit[], fighterIndex: number, result: IFightResult, driver: IDriver): void {
    this.hits = hits;

    const valueStrings: string[] = [];
    for (let i = 0; i <= 60; i++) {
      valueStrings.push(i.toString());
    }

    this.fistCount.setValues(valueStrings);
    this.kickCount.setValues(valueStrings);

    //const curStartTime = 0;
    //this.anims = [];
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    // for (let i = 0; i<  roundResults.length; i++){
    //   this.anims.push({ startTime: curStartTime, duration: roundResults[i].startTime - curStartTime });
    //   curStartTime = roundResults[i].startTime + roundResults[i].duration;
    // }
    //this.anims.push({ startTime: curStartTime, duration: result.startTime - curStartTime});

    this.fighterName.text = fighterIndex + 1 + " " + driver.firstName.toUpperCase() + " " + driver.lastName.toUpperCase();
    this.fighterName.style.fill = driver.color;

    this.fistText.text = _t("wgpFist");
    this.kickText.text = _t("wgpKick");

    this.fistCount.fill();
    this.kickCount.fill();
    // this.fistCount.text = "4";
    // this.kickCount.text = "5";

    for (const marker of this.hitMarker) marker.tint = driver.color;

    this.onLayout();
  }

  public onLayout(): void {
    this.fighterName.x = _s(8);
    this.fighterName.y = _s(10);

    const hitInfoY = _s(32);

    this.fistText.x = _s(4);
    this.fistText.y = hitInfoY;

    this.fistCount.x = _s(53);
    this.fistCount.y = _s(32);

    this.kickText.x = _s(80);
    this.kickText.y = hitInfoY;

    this.kickCount.x = _s(130);
    this.kickCount.y = _s(32);

    let measureFistText = PIXI.TextMetrics.measureText(this.fistText.text, this.fistText.style);
    let measureHitText = PIXI.TextMetrics.measureText(this.kickText.text, this.kickText.style);

    const totalWidthAvailable = _s(300);
    const scrollNumberSpace = _s(50);
    const minSizeText = _s(48);

    const availableWidth = totalWidthAvailable - scrollNumberSpace * 2;

    if (availableWidth < measureFistText.width + measureHitText.width) {
      const factor = availableWidth / (measureFistText.width + measureHitText.width);
      Logic.autoSize(this.fistText, measureFistText.width * factor);
      Logic.autoSize(this.kickText, measureHitText.width * factor);
      measureFistText = PIXI.TextMetrics.measureText(this.fistText.text, this.fistText.style);
      measureHitText = PIXI.TextMetrics.measureText(this.kickText.text, this.kickText.style);
    }

    Logic.autoSize(this.fighterName, _s(240));

    this.fistText.x = _s(4);
    const fistCountStart = Math.max(minSizeText, measureFistText.width) + _s(7);
    this.fistCount.x = fistCountStart;
    this.kickText.x = fistCountStart + _s(27);
    const kickCountStart = fistCountStart + _s(27) + Math.max(minSizeText, measureHitText.width) + _s(7);
    this.kickCount.x = kickCountStart;

    // Logic.autoSize(this.fistText, _s(48));
    // Logic.autoSize(this.kickText, _s(48));

    this.SetWidth(HalfTypes.HALF);
  }

  public SetWidth(half: HalfTypes): void {
    if (this.halfWidth === half) return;

    this.halfWidth = half;
    const hitMarkerX = _s(255);
    const hitMarkerY = _s(52);
    const hitMarkerWidth = _s(34 / half); // half ? _s(17) : _s(34);
    const hitMarkerHeight = _s(8);

    const hitMarkerOffset = _s(34 / half); // half ? _s(17) : _s(34);
    for (let i = 0; i < this.hitMarker.length; i++) {
      const marker = this.hitMarker[i];

      marker.x = hitMarkerX - _s(34) - i * hitMarkerOffset;
      marker.y = hitMarkerY;
      marker.width = hitMarkerWidth;
      marker.height = hitMarkerHeight;
    }
  }

  public resetToZero(): void {
    this.fistCount.setNumbersY(0, true);
    this.kickCount.setNumbersY(0, true);
    this.currentRoundWithResult = 0;
  }

  public switchToNewRound(round: number, roundWithResult: number): void {
    if (this.currentRound !== round) {
      // this.fistCount.setNumbersY(0, false);
      // this.kickCount.setNumbersY(0, false);
      this.currentRound = round;
    }
    if (this.currentRoundWithResult !== roundWithResult) {
      this.fistCount.setNumbersY(0, false);
      this.kickCount.setNumbersY(0, false);
      this.currentRoundWithResult = roundWithResult;
    }
  }

  public updateAnims(baseFactor: number, duration: number): void {
    //super.update(dt);

    // const t = Logic.getRaceVideoTime();
    // const anim = Logic.getAnim(t, this.anims, this);
    // if (!anim) return;

    //const baseFactor = t - anim.startTime;
    AnimHelper.animateInOut(baseFactor, 0, duration, 0, 0, 1, (x) => (this.alpha = x), 0, 0);

    // filter hits for round
    const currentHits = this.hits.filter((x) => x.round === this.currentRoundWithResult);

    if (currentHits.length > 0) {
      //let currentRow = currentHits.length-1;

      let currentRow = -1;
      for (let i = 0; i < currentHits.length; i++) {
        if (currentHits[i].timestamp <= baseFactor) {
          currentRow = i;
        } else {
          break;
        }
      }

      // for (let i = currentHits.length-1; i >= 0; i--){

      //   if (this.hits[i].timestamp <= baseFactor)
      //     break;
      //   else
      //     currentRow = i;
      // }
      if (currentRow < 0) {
        this.fistCount.setNumbersY(0, false);
        this.kickCount.setNumbersY(0, false);
        this.currentHitCount = 0;
        for (let i = 0; i < this.hitMarker.length; i++) {
          this.hitMarker[i].visible = i < this.currentHitCount;
        }
      } else {
        const currentHit = currentHits[currentRow];
        this.fistCount.setNumbersY(currentHit.fist, false);
        this.kickCount.setNumbersY(currentHit.kick, false);
        this.currentHitCount = currentHit.fist + currentHit.kick;
        for (let i = 0; i < this.hitMarker.length; i++) {
          this.hitMarker[i].visible = i < this.currentHitCount;
        }
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      this.fistCount.setNumbersY(0, false);
      this.kickCount.setNumbersY(0, false);

      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < this.hitMarker.length; i++) {
        this.hitMarker[i].visible = false;
      }
    }

    // const baseFactor = t - anim.startTime;

    // const t = Logic.getRaceVideoTime();
    // const anim = Logic.getAnim(t, this.anims, this);
  }
}
