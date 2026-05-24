import * as PIXI from "pixi.js";
import { DynamicGeometry, DynamicMesh } from "client/Graphics/DynamicMesh";
import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import { RoundBonusType } from "client/Logic/LogicDefinitions";

export class BonusAnnotationDog extends Group {
  private cacheGroup: Group; // there is a bug related to caching, fading and PIXI...
  private background: DynamicMesh;
  private titleText: PIXI.Text;
  private dg = new DynamicGeometry("Pos2Color", 16, 24);
  private oddsAlwaysOn: boolean;
  private size = 32;
  public constructor(oddsAlwaysOn = false) {
    super();
    this.oddsAlwaysOn = oddsAlwaysOn;
    this.cacheGroup = new Group();
    this.add(this.cacheGroup);
    if (oddsAlwaysOn) this.size = 28;

    this.background = new DynamicMesh();
    this.background.setPositions(_s([-this.size, 0, 0, 0, 0, this.size, -this.size, this.size]));
    this.background.setIndices([0, 1, 2, 0, 2, 3]);
    this.background.setColors([0xffd21b15, 0xffb71f1d, 0xffab2118, 0xffce1c18]);
    this.dg.add(this.background);
    this.cacheGroup.add(this.dg);
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(12),
        fill: "white",
        align: "center",
        fontStyle: "italic"
      });

      this.titleText = Logic.createPixiText(style);
      this.titleText.anchor.set(0.5, 0.5);
      // this.text1.filters = [this.blurFilter];
      this.cacheGroup.add(this.titleText);
    }
    // this.cacheGroup.container.cacheAsBitmap = true; // alpha blend text and background together
  }

  public fill(bonusType: RoundBonusType) {
    let newText = "";
    if (bonusType === undefined) newText = "";
    else newText = bonusType;
    this.titleText.text = newText;
  }

  private updateCache() {
    this.cacheGroup.container.cacheAsBitmap = false; // hack: text won't be updated otherweise...
    this.cacheGroup.container.cacheAsBitmap = true;
  }

  public onLayout() {
    const topY = 0;
    const offsetX = 19;
    const offsetY = 49;
    const bottomY = this.size;
    this.background.setPositions(_s([offsetX, topY + offsetY, this.size + offsetX, topY + offsetY, this.size + offsetX, bottomY + offsetY, 0 + offsetX, bottomY + offsetY]));
    this.titleText.style.fontSize = _s(22);
    // this.titleText.scale.y = 1.5; // sieht in die Länge gezogen aus
    if (this.oddsAlwaysOn) this.titleText.style.fontSize = _s(18);

    this.titleText.position.x = _s(this.size / 2 + offsetX);
    this.titleText.position.y = _s(this.size / 2 + offsetY);

    this.background.setIndices([0, 1, 2, 0, 2, 3]);
    this.background.setColors([0xffd21b15, 0xffb71f1d, 0xffab2118, 0xffce1c18]);
  }

  public update(dt: number) {
    super.update(dt);
  }
}
