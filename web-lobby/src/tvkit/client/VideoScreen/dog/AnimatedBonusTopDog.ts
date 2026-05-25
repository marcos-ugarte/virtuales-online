/**
 * STUB AnimatedBonusTopDog — for the tvbox RaceBarDog port (v1).
 *
 * The real component renders the jackpot/bonus animated number, which depends
 * on AnimatedNumber → RunningNumber → DrawHelper → Engine. Our race-only feed
 * never carries a jackpotValue (round.jackpotValue === undefined), so the real
 * component would keep itself invisible anyway (`hasBonus` false). This stub
 * exposes the exact surface RaceBarDog touches: the `fill(...)` method plus the
 * Group-inherited alpha/x/y/update/onLayout. It stays invisible.
 */
import { Group } from "client/Graphics/Group";
import { IRoundInfo } from "client/Logic/LogicDefinitions";
import { GameType, GameLength } from "common/Definitions";

export class AnimatedBonusTopDog extends Group {
  public constructor(_gameType: GameType, _gameLength: GameLength) {
    super();
    this.container.name = "AnimatedBonusTopDog";
    this.visible = false;
    this.alpha = 0;
  }

  public fill(_gameType: GameType, _gameLength: GameLength, _round: IRoundInfo, _oddsAlwaysOn = false) {
    // no-op: bonus rendering is out of v1 scope; our feed has no jackpotValue.
  }

  public onLayout() {}

  public update(dt: number) {
    super.update(dt);
    this.visible = false;
    this.alpha = 0;
  }
}
