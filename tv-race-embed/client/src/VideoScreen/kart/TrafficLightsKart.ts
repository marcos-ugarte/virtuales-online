import * as PIXI from "pixi.js";
import { DynamicGeometry, DynamicMesh } from "client/Graphics/DynamicMesh";
import { Group } from "client/Graphics/Group";
import trafficLight from "client/assets/trafficLight.png";
import { Logic, _s } from "client/Logic/Logic";
import { AnimHelper } from "../common/Anim";
import { IAnimInterval, VideoState } from "client/Logic/LogicDefinitions";

export class TrafficLightsKart extends Group {
  private dg = new DynamicGeometry("Pos2Color", 64, 96);
  private trafficBackground: DynamicMesh;
  private lightBackgrounds: DynamicMesh[] = [];
  private lights: PIXI.Sprite[] = [];
  private anims: IAnimInterval[];

  public constructor() {
    super();
    this.trafficBackground = new DynamicMesh();
    this.trafficBackground.setPositions(_s([0, 0, 0, 0, 0, 0, 0, 0]));
    this.trafficBackground.setIndices([0, 1, 2, 0, 2, 3]);
    this.trafficBackground.setColors([0xff1f2225, 0xff2f353a, 0xff2f353a, 0xff1f2225]);
    this.dg.add(this.trafficBackground);

    this.add(this.dg);

    for (let i = 0; i < 5; i++) {
      const lightBackground = new DynamicMesh();
      lightBackground.setPositions(_s([0, 0, 0, 0, 0, 0, 0, 0]));
      lightBackground.setIndices([0, 1, 2, 0, 2, 3]);
      lightBackground.setColors([0xff1f2225, 0xff2f353a, 0xff2f353a, 0xff1f2225]);
      this.lightBackgrounds.push(lightBackground);
      this.dg.add(lightBackground);

      this.lights.push(PIXI.Sprite.from(trafficLight));
      this.lights[i].anchor.set(0.5);
      this.add(this.lights[i]);
    }

    const startTime = 0.1;
    this.anims = [{ startTime, duration: 10.0 }];
  }

  public onLayout() {
    const w = 53;
    const h = 40;
    const offsetX = 57;
    for (let i = 0; i < this.lightBackgrounds.length; i++) {
      const lb = this.lightBackgrounds[i];
      lb.setPositions(_s([0, 0, w, 0, w - 22, h, -22, h]));
      lb.y = 5;

      this.lights[i].x = _s(20 + i * offsetX);
      this.lights[i].y = this.height * 0.5;
      this.lights[i].scale.set(_s(0.5));
    }
  }

  public update(dt: number) {
    super.update(dt);

    let t = Logic.getRaceVideoTime();
    if (Logic.isFading && Logic.fadeTarget === VideoState.Race) {
      t = Logic.getIntroLength();
    }
    const rt = Logic.getInGameRaceTime("kart5");
    const anim = Logic.getAnim(t, this.anims, this);
    // const isFading = Logic.isFading;
    if (!anim) return;

    const baseFactor = AnimHelper.limit((t - anim.startTime) * 2.5, anim.duration);
    this.trafficBackground.alpha = baseFactor;
    const w = this.width * AnimHelper.clamp((baseFactor - 0.2) * 2);
    const positions = [0, 0, w, 0, w - _s(27), this.height, _s(-27), this.height];
    this.trafficBackground.setPositions(positions);

    for (let i = 0; i < this.lightBackgrounds.length; i++) {
      const offsetX = 57;
      const a = AnimHelper.easeOut((baseFactor - (0.1 + i * 0.1)) * 3);
      this.lightBackgrounds[i].alpha = a;
      this.lightBackgrounds[i].x = _s(5 + i * offsetX + 50 - 50 * a);

      this.lights[i].alpha = (baseFactor - (0.3 + i * 0.1)) * 2;
      let tintColor = 0x00ff0000;
      if (rt > 0 - (i + 1) * 0.25) {
        if (rt > 0) tintColor = 0x0011cb1f;
        else tintColor = 0x007f0000;
      }
      this.lights[i].tint = tintColor;
    }
  }
}
