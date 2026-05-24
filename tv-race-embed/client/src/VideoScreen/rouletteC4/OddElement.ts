import { settings } from "../../Logic/Logic";
import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import { IAnimInterval, IGameInfo, IRoundInfo } from "client/Logic/LogicDefinitions";
import * as PIXI from "pixi.js";
import { RouletteHelper } from "./RouletteHelper";
import { AnimHelper } from "../common/Anim";

export enum IOddType {
  Single = "single",
  SplitRow = "splitRow",
  SplitColumn = "splitCol",
  Street = "street",
  Corner = "corner",
  DoubleStreet = "doubleStreet",
  ZeroSplit = "zeroSplit",
  Trio = "trio",
  Basket = "basket",
  Zero = "zero",
  area1_12 = "1-12",
  area13_24 = "13-24",
  area25_36 = "25-36",
  area1_18 = "1-18",
  areaEven = "even",
  areaRed = "red",
  areaBlack = "black",
  areaOdd = "odd",
  area19_36 = "19-36",
  area2to1 = "2to1"
}
export class OddElement extends Group {
  private oddElement: PIXI.Sprite = new PIXI.Sprite();
  private oddElementNumber: PIXI.Text = Logic.createPixiText();
  public anims: IAnimInterval[] = [{ startTime: 0.0, duration: 0.0 }];
  public row: number;
  public type: IOddType;
  public column: number;
  private oddNumber: number;
  public constructor(index: number, type: IOddType, row: number, column: number) {
    super();

    // this.showDebug(true, 1, row.toString());
    this.type = type;
    this.row = row;
    this.column = column;
    this.oddNumber = RouletteHelper.getChanceToWin(this.type, this.column, this.row);
    this.oddElement.anchor.set(0.5, 0.5);
    // Add text
    const oddElementNumberTextStyle = RouletteHelper.oddElementNumberTextStyle;
    this.oddElementNumber = Logic.createPixiText(oddElementNumberTextStyle);
    this.oddElementNumber.anchor.set(0.5, 0.5);

    const prerenderedETypes = [IOddType.Single, IOddType.SplitColumn, IOddType.SplitRow, IOddType.Street, IOddType.Corner, IOddType.DoubleStreet, IOddType.ZeroSplit, IOddType.Trio, IOddType.Basket];

    if (!prerenderedETypes.includes(this.type)) this.add(this.oddElement);
    this.add(this.oddElementNumber);
  }

  public onLayout(): void {
    const { x, y } = RouletteHelper.calculateCoordinates(this.row, this.column, this.type);
    const height = 35;
    const width = 29;

    // Add sprite shapes
    this.position.y = _s(y);
    this.position.x = _s(x);

    this.oddElement.width = _s(width);
    this.oddElement.height = _s(height);

    if (settings.debug) {
      this.oddElement.tint = 0x000;
      this.oddElement.alpha = 0.6;
    }
  }

  public fill(anim: IAnimInterval[]): void {
    this.anims = anim;
    this.oddElementNumber.text = this.oddNumber.toString();
  }

  public init(oddElementTexture: PIXI.Texture): void {
    const prerenderedETypes = [IOddType.Single, IOddType.SplitColumn, IOddType.SplitRow, IOddType.Street, IOddType.Corner, IOddType.DoubleStreet, IOddType.ZeroSplit, IOddType.Trio, IOddType.Basket];

    if (!prerenderedETypes.includes(this.type)) this.oddElement.texture = oddElementTexture;
  }

  public update(dt: number): void {
    super.update(dt);
    const currentTime = Logic.getVideoTime();
    const anim = Logic.getAnim(currentTime, this.anims, this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;
  }
}
