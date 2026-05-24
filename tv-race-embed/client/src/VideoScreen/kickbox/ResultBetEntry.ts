import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, settings, _s } from "client/Logic/Logic";
import { IAnimInterval, IDriver } from "client/Logic/LogicDefinitions";
//import { AnimHelper } from "../common/Anim";
import { KickboxHelper } from "./KickboxHelper";
import { Texture } from "pixi.js";

export class ResultBetEntry extends Group {
  private anims: IAnimInterval[] = []; // [{startTime: 13, duration: 24}];

  private name: PIXI.Text;
  private background: PIXI.Sprite;

  constructor(backgroundTexture: Texture, mask: PIXI.Sprite | undefined) {
    super();
    this.showDebug(settings.debug, undefined);

    this.background = new PIXI.Sprite();
    // if (mask)
    //   this.background.mask = mask;
    this.add(this.background);
    this.background.texture = backgroundTexture;
    this.background.anchor.set(0.5, 0.5);

    const style = new PIXI.TextStyle({
      fontFamily: "DIN-Heavy",
      fontSize: _s(22),
      align: "center"
    });
    this.name = Logic.createPixiText(style);
    if (mask) this.name.mask = mask;
    this.name.anchor.set(0.5, 0.5);
    this.add(this.name);

    this.name.roundPixels = false;
  }

  public fill(value: number, drivers: IDriver[]) {
    if (value === 0) {
      this.name.text = "X";
      this.name.style.fill = "black";
      this.background.tint = KickboxHelper.getGrayBackgroundColor(); // TODO: correct gray tint
    } else {
      this.name.text = value.toString();
      const driver = drivers[value - 1];
      if (driver && driver.color2 !== undefined) {
        this.name.style.fill = driver.color2;
        this.background.tint = driver.color;
      }
    }

    this.name.x = this.width / 2; // +  _s((this.name.text === "X" ? 0.5 : 1)); // MS there is a slight offset to get it in the middle
    if (this.name.text === "X") this.name.x += _s(0.5);
  }

  public scaleText(scale: number) {
    const nameScale = this.name.text === "X" ? scale / 1.5 : scale / 1.5;
    this.name.scale.set(nameScale, nameScale);
  }

  public scaleBackground(scale: number) {
    this.background.scale.set(scale / 2.0, scale / 2.0);
  }

  public onLayout() {
    this.name.x = this.width / 2; // +  _s((this.name.text === "X" ? 0.5 : 1)); // MS there is a slight offset to get it in the middle
    this.name.y = this.height / 2; //-_s(1.0);
    this.background.x = this.width / 2;
    this.background.y = this.width / 2;
    this.background.width = this.width;
    this.background.height = this.height;
  }

  public update(dt: number) {
    super.update(dt);

    // const t = Logic.getVideoTime();
    // const anim = Logic.getAnim(t, this.anims, this);
    // if (!anim) return;

    // AnimHelper.animateInOut(t, anim.startTime, anim.startTime+anim.duration, 0, 0, 1, x => this.alpha = x, 0, 0);
    // // const baseFactor = t - anim.startTime;
  }
}
