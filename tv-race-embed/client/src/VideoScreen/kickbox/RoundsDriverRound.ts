import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, settings, _s } from "client/Logic/Logic";
import { IAnimInterval } from "client/Logic/LogicDefinitions";
//import { AnimHelper } from "../common/Anim";
import { KickboxHelper } from "./KickboxHelper";

export class RoundsDriverRound extends Group {
  private isLeft: boolean;
  private anims: IAnimInterval[] = []; // [{startTime: 13, duration: 24}];

  private name: PIXI.Text;
  private value: PIXI.Text;

  constructor(isLeft: boolean) {
    super();
    this.showDebug(settings.debug, undefined, "DriverRound");

    this.isLeft = isLeft;

    this.name = Logic.createPixiText(
      new PIXI.TextStyle({
        ...KickboxHelper.getRoundTextStyleProperties(),
        align: isLeft ? "left" : "right",
        fontSize: _s(22)
      })
    );
    this.name.anchor.set(0.0, 0.5);
    this.add(this.name);

    this.value = Logic.createPixiText(
      new PIXI.TextStyle({
        ...KickboxHelper.getRoundValueStyleProperties(),
        align: isLeft ? "right" : "left"
      })
    );
    this.value.anchor.set(1.0, 0.5);
    this.add(this.value);
  }

  public fill(name: string, value: string, textColor: any): void {
    this.name.text = name;
    this.value.text = value;
    this.name.tint = textColor;
    this.value.tint = textColor;

    Logic.autoSize(this.name, _s(90));
  }

  public onLayout(): void {
    this.name.x = 0;
    this.name.y = this.height / 2;
    this.value.x = this.width;
    this.value.y = this.height / 2;
  }

  public update(dt: number): void {
    super.update(dt);

    // const t = Logic.getVideoTime();
    // const anim = Logic.getAnim(t, this.anims, this);
    // if (!anim) return;

    //AnimHelper.animateInOut(t, anim.startTime, anim.startTime+anim.duration, 0, 0, 1, x => this.wi = x, 0, 0);
    // // const baseFactor = t - anim.startTime;
  }

  public setColor(x: number): void {
    this.name.tint = x;
    this.value.tint = x;
  }
}
