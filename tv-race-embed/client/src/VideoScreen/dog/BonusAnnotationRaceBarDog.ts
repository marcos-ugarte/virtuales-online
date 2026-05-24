import { settings } from "./../../Logic/Logic";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import { RoundBonusType } from "client/Logic/LogicDefinitions";
import { DrawHelper } from "../common/DrawHelper";
import { UIHelper } from "../UIHelper";

export class BonusAnnotationRaceBarDog extends Group {
  private cacheGroup: Group; // there is a bug related to caching, fading and PIXI...
  private background: PIXI.Sprite;
  private titleText: PIXI.Text;
  private bonusType: RoundBonusType | undefined;

  public constructor() {
    super();
    this.showDebug(settings.debug, undefined, "BarAnnotation");
    this.cacheGroup = new Group();
    this.add(this.cacheGroup);

    this.background = new PIXI.Sprite();
    this.cacheGroup.add(this.background);
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(23),
        fill: "white",
        align: "center",
        fontStyle: "italic"
      });
      this.titleText = Logic.createPixiText(style);
      this.titleText.anchor.set(0.5, 0.5);
      this.cacheGroup.add(this.titleText);
    }
    this.updateCache();
  }

  public fill(bonusType: RoundBonusType | undefined) {
    let newText = "";
    this.bonusType = bonusType;
    if (bonusType === undefined) newText = "";
    else newText = bonusType;
    this.titleText.text = newText;
    this.updateCache();
    console.log("BonusAnnotationRaceBarDog: " + bonusType);
  }

  private updateCache() {
    this.cacheGroup.container.cacheAsBitmap = false; // hack: text won't be updated otherweise...
    this.cacheGroup.container.cacheAsBitmap = true;
  }

  public onLayout() {
    const skewedRadius = UIHelper.getSkewedRadius(this.height);
    const skewedPixel = UIHelper.getSkewedPixel(this.height);
    this.background.texture = DrawHelper.createSkewedRoundedRectangleTexture(this.width, this.height, skewedRadius, skewedPixel, { type: "gradient", color: "#e00611", color2: "#bb100f" });

    this.titleText.position.x = this.width * 0.55;
    this.titleText.position.y = this.height * 0.47;

    this.updateCache();
  }

  public update(dt: number) {
    super.update(dt);

    const raceTime = Logic.getRaceVideoTime();
    const startTime = 0.1;
    const raceEnd = Logic.getRaceEndTime() - Logic.getIntroLength() - 1.0;
    const anim = Logic.getAnim(raceTime, [{ startTime, duration: raceEnd - startTime, isRace: true }], this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;

    const t = raceTime - anim.startTime;
    if (this.bonusType !== undefined && t > 0 && t < anim.duration) {
      const fadeTime = 0.3;
      const blinkDuration = anim.duration - fadeTime * 2;
      if (t > 0 && t < fadeTime) {
        const f = t / fadeTime;
        this.alpha = f;
        this.cacheGroup.x = -_s(10) * (1 - f);
      } else if (t < fadeTime + blinkDuration) {
        if (anim.isRace) this.alpha = Math.cos((t - fadeTime) * 6) > 0 ? 1 : 0;
        else this.alpha = 1;
        this.cacheGroup.x = 0;
      } else {
        const f = (anim.duration - t) / fadeTime;
        this.alpha = f;
        this.cacheGroup.x = -_s(10) * (1 - f);
      }
    } else {
      this.alpha = 0;
    }
    this.updateCache();
  }
}
