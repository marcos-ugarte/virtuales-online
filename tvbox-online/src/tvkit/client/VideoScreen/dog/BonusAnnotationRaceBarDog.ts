/**
 * STUB BonusAnnotationRaceBarDog — for the tvbox RaceBarDog port (v1).
 *
 * The real component draws the "x2"/"x3" round-bonus badge, depending on
 * DrawHelper → Engine and UIHelper. Our race-only feed carries no
 * roundBonusType, so the badge is always empty/invisible. This stub exposes
 * the surface RaceBarDog touches: `fill(roundBonusType)` plus Group-inherited
 * width/height/x/y/update. It stays invisible.
 */
import { Group } from "client/Graphics/Group";
import { RoundBonusType } from "client/Logic/LogicDefinitions";

export class BonusAnnotationRaceBarDog extends Group {
  public constructor() {
    super();
    this.container.name = "BonusAnnotationRaceBarDog";
    this.visible = false;
    this.alpha = 0;
  }

  public fill(_bonusType: RoundBonusType | undefined) {
    // no-op: no round-bonus in v1 scope.
  }

  public onLayout() {}

  public update(dt: number) {
    super.update(dt);
    this.visible = false;
    this.alpha = 0;
  }
}
