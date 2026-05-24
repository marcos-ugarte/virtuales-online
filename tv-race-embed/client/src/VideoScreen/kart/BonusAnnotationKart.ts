import * as PIXI from "pixi.js";
import { DynamicGeometry, DynamicMesh } from "client/Graphics/DynamicMesh";
import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import { RoundBonusType } from "client/Logic/LogicDefinitions";

type PositionType = "RaceTimeBar" | "RaceHistory";

export class BonusAnnotationKart extends Group {
  private background: DynamicMesh;
  private titleText: PIXI.Text;
  private dg = new DynamicGeometry("Pos2Color", 16, 24);
  private type: PositionType;

  public constructor(type: PositionType) {
    super();
    this.type = type;
    this.background = new DynamicMesh();
    this.background.setPositions(_s([-50, 0, 10, 0, 0, 50, -50, 50]));
    this.background.setIndices([0, 1, 2, 0, 2, 3]);
    this.background.setColors([0xff1f2225, 0xff2f353a, 0xff2f353a, 0xff1f2225]);
    this.dg.add(this.background);
    this.add(this.dg);
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Bold",
        fill: "white",
        align: "center"
      });
      this.titleText = Logic.createPixiText(style);
      this.titleText.anchor.set(0, 0.5);
      // this.text1.filters = [this.blurFilter];
      this.add(this.titleText);
    }
    this.container.cacheAsBitmap = true; // alpha blend text and background together
  }

  public fill(bonusType: RoundBonusType) {
    let newText = "";
    if (bonusType === undefined) newText = "";
    else newText = "" + bonusType;
    if (this.titleText.text !== newText) {
      this.titleText.text = newText;
      this.container.cacheAsBitmap = false; // hack: text won't be updated otherweise...
      this.container.cacheAsBitmap = true;
    }
  }

  public onLayout() {
    const topY = 0;
    if (this.type === "RaceHistory") {
      const bottomY = 67 - 31;
      this.background.setPositions(_s([-50, topY, 17, topY, -1, bottomY, -50, bottomY]));
      this.titleText.style.fontSize = _s(26);

      this.titleText.position.x = _s(-33);
      this.titleText.position.y = _s(16);
    } else {
      const bottomY = 50;
      this.background.setPositions(_s([-60, topY, 17, topY, -9.5, bottomY, -60, bottomY]));
      this.titleText.style.fontSize = _s(35);

      this.titleText.position.x = _s(-47);
      this.titleText.position.y = _s(22);
    }
    this.background.setIndices([0, 1, 2, 0, 2, 3]);
    this.background.setColors([0xffca290e, 0xffca290e, 0xffca290e, 0xffca290e]);
  }

  public update(dt: number) {
    super.update(dt);
  }
}
