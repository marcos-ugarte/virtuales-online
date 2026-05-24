import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, _t } from "client/Logic/Logic";
import { IAnimInterval, IDriver, IResultBet } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { ResultBetTable } from "./ResultBetTable";
import { LayoutHelper } from "../Util/LayoutHelper";
import { KickboxHelper } from "./KickboxHelper";
import { DrawHelper } from "../common/DrawHelper";

export class ResultBet extends Group {
  private title: PIXI.Text;
  private resultBetTables: ResultBetTable[] = [];

  //private mask: PIXI.Sprite;

  private anims: IAnimInterval[] = [
    { startTime: 37, duration: 33.03 },
    { startTime: 138.2, duration: 33.03 },
    { startTime: 218.5, duration: 32.0 }
  ];

  public constructor() {
    super();
    //this.showDebug(settings.debug);
    //const maskTexture = DrawHelper.createNGonTexture(100, 3, "white", Math.PI/2);
    {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "white";
      ctx.fill();
      ctx.fillRect(0, 0, 512, 1024);

      //DrawHelper.drawNGonGraphics(ctx, 256, 256, 512, 512, 256, 4, Math.PI, "white");

      DrawHelper.drawNGonGraphics(ctx, 256, 512, 256 * 1.5, 256 * 1.5, 128 * 1.5, 3, Math.PI / 2, "black");
      // ctx.fillStyle = "black";
      ctx.fillRect(90, 602, 330, 256 + 512);

      // const texture = PIXI.Texture.from(canvas);
      const baseTexture = new PIXI.BaseTexture(canvas); // don't cache
      //const maskTexture = new PIXI.Texture(baseTexture);
      //this.mask = new PIXI.Sprite(maskTexture);
      //this.mask.alpha = 0.4;

      //this.mask.anchor.set(0.5, 0.0);
    }

    //this.mask.rotation = -45/2;

    this.title = Logic.createPixiText(KickboxHelper.getHeaderCenterStyle());
    this.title.anchor.set(0.5, 0.5);
    //this.add(this.title);

    for (let i = 0; i < 2; i++) {
      const table = new ResultBetTable(i === 0, undefined); // this.mask
      this.resultBetTables.push(table);
      this.add(table);
    }

    //this.add(this.mask);

    // this.anims = [{
    //     startTime: 3,
    //     duration: 9
    // }]
  }

  public fill(drivers: IDriver[], resultBet: IResultBet[][]) {
    this.title.text = _t("resultBet");

    {
      this.resultBetTables[0].fill(drivers, resultBet[0]);
      this.resultBetTables[1].fill(drivers, resultBet[1]);
    }

    this.onLayout();
  }

  // private updateText(
  //   multiText: MultiStyleText,
  //   text: string | undefined,
  //   styles?: ITextStyleSet
  // ) {
  //   if (text) {
  //     if (styles) multiText.styles = styles;
  //     multiText.text = text;
  //     multiText.visible = true;
  //   } else {
  //     multiText.visible = false;
  //   }
  // }

  public onLayout() {
    this.title.x = this.width / 2;
    this.title.y = _s(43);

    LayoutHelper.setScaledRectangle(this.resultBetTables[0], 321, 122, 285, 533);
    LayoutHelper.setScaledRectangle(this.resultBetTables[1], 681, 122, 285, 533);

    // this.mask.x = this.width/2;
    // //this.mask.y = this.height/2;
    // this.mask.width = _s(1024);
    // this.mask.height = _s(1024*2);
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    if (t >= Logic.getIntroLength()) {
      this.alpha = 0;
      return;
    }

    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const doNotFadeOut = anim === this.anims[2];

    AnimHelper.animateInOut(t, anim.startTime, anim.startTime + anim.duration, 0, 0, 1, (x) => (this.alpha = x), 0, 0);

    const baseFactor = t - anim.startTime;

    // AnimHelper.animateInOut(baseFactor, 0, anim.duration,  0, _s(0), _s(0),
    //  y => {
    //    this.mask.y = y;
    // }, 1.2, _s(-1200));

    for (const table of this.resultBetTables) table.updateAnims(baseFactor, anim.duration, doNotFadeOut);
  }
}
