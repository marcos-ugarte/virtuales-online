import { Group } from "client/Graphics/Group";
import { BottomBarItemKart } from "./BottomBarItemKart";
import { _s } from "client/Logic/Logic";
import { IDriver, IColors } from "client/Logic/LogicDefinitions";
import { GameLength } from "common/Definitions";

export class BottomBarKart extends Group {
  private racerCount: number;
  private items: BottomBarItemKart[] = [];
  private oddsAlwaysOn: boolean;
  public constructor(racerCount: number, gameLength: GameLength, language: string, oddsAlwaysOn = false) {
    super();
    this.racerCount = racerCount;
    this.oddsAlwaysOn = oddsAlwaysOn;

    for (let i = 0; i < racerCount; i++) {
      const bbi = new BottomBarItemKart(i, gameLength, language, this.oddsAlwaysOn);
      bbi.position.x = _s(6 + i * 254);
      bbi.position.y = _s(682);
      bbi.width = _s(254);
      bbi.height = _s(25);
      this.items.push(bbi);
      this.add(bbi);
    }
  }

  public fill(drivers: IDriver[], colors: IColors, withBonus: boolean) {
    for (let i = 0; i < this.racerCount; i++) this.items[i].fill(drivers[i], colors, withBonus);
  }

  public update(dt: number) {
    super.update(dt);
  }
}
