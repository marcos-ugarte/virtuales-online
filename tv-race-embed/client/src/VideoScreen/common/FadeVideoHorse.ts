import { Group } from "client/Graphics/Group";
import { _s } from "client/Logic/Logic";
import { UIHelper } from "../UIHelper";
import { DrawHelper } from "./DrawHelper";
import { NineSlicePlane, Sprite, Texture } from "pixi.js";
import { AnimHelper } from "./Anim";
import { DynamicMesh } from "client/Graphics/DynamicMesh";
import { GameType } from "common/Definitions";

interface ITexDescription {
  type: "round";
  tex: Texture;
  radius: number;
}

export class FadeVideoHorse extends Group {
  private gameType: GameType;
  private whiteBig: NineSlicePlane;
  private greenBig: NineSlicePlane;
  private transparentBar: Sprite;
  private transparentBar2: Sprite;
  private greenBar: NineSlicePlane;
  private whiteBar: Sprite;
  private redBar: Sprite;
  private redBar2: Sprite;
  private greenBar2: NineSlicePlane;

  public constructor(gameType: GameType) {
    super();

    this.gameType = gameType;

    this.whiteBig = UIHelper.createNineSlicePlane();
    this.add(this.whiteBig);

    this.greenBig = UIHelper.createNineSlicePlane();
    this.add(this.greenBig);

    this.transparentBar = new Sprite(Texture.WHITE);
    this.add(this.transparentBar);

    this.transparentBar2 = new Sprite(Texture.WHITE);
    this.add(this.transparentBar2);

    this.redBar = new Sprite(Texture.WHITE);
    this.add(this.redBar);

    this.whiteBar = new Sprite(Texture.WHITE);
    this.add(this.whiteBar);

    this.greenBar = UIHelper.createNineSlicePlane();
    this.add(this.greenBar);

    this.redBar2 = new Sprite(Texture.WHITE);
    this.add(this.redBar2);

    this.greenBar2 = UIHelper.createNineSlicePlane();
    this.add(this.greenBar2);
  }

  public getDx() {
    return -this.height * 0.17;
  }

  private createTexRound(radius: number) {
    const radiusInfo: ITexDescription = {
      type: "round",
      tex: DrawHelper.createSkewedRoundedRectangleTexture(_s(radius * 2) + 16, _s(radius * 2) + 16, _s(radius), 0, { type: "solid", color: "white" }),
      radius
    };
    return radiusInfo;
  }

  private createRound(item: NineSlicePlane, desc: ITexDescription, width: number, height: number, tint: number, alpha: number) {
    item.texture = desc.tex;
    item.leftWidth = desc.radius;
    item.rightWidth = desc.radius;
    item.topHeight = desc.radius;
    item.bottomHeight = desc.radius;

    item.tint = tint;
    item.width = width;
    item.height = height;
    item.transform.setFromMatrix(UIHelper.getSkewMatrix(item.height));
    item.alpha = alpha;
  }

  private createBar(item: Sprite, width: number, height: number, tint: number, alpha: number) {
    item.tint = tint;
    item.transform.setFromMatrix(UIHelper.getSkewMatrix(this.height));
    item.width = width;
    item.height = height;
    item.alpha = alpha;
  }

  public onLayout() {
    const texRadius100 = this.createTexRound(_s(100));
    const texRadius30 = this.createTexRound(_s(30));
    let greenColor = this.gameType === "dog8" ? 0x339e6a : 0x345cb4;
    let barColor = 0x02351c;
    let redBar = 0xff0000;
    let whiteBarBig = 0xffffff;
    let whiteBarAlpha = 1.0;
    let barAlpha = 0.3;

    if (this.gameType === "horse") {
      greenColor = 0x502d0d;
      barColor = 0xab9c81; // transparent bar
      redBar = 0xb78e37;
    } else if (this.gameType === "sulky") {
      greenColor = 0xad3e73;
      barColor = 0x3f0833; // transparent bar
      redBar = 0xc1272d;
      whiteBarBig = 0xad3e73;
      barAlpha = 0.5;
      whiteBarAlpha = 0.39;
    }

    this.createRound(this.whiteBig, texRadius100, this.width * 0.5, this.height, whiteBarBig, whiteBarAlpha);
    this.createRound(this.greenBig, texRadius100, this.width * 0.5, this.height, greenColor, 1.0);

    this.createBar(this.transparentBar, this.width * 0.2, this.height * 1.04, barColor, barAlpha);
    this.createBar(this.transparentBar2, this.width * 0.4, this.height * 0.7, barColor, barAlpha);

    this.createRound(this.greenBar, texRadius30, this.width * 0.5, this.height * 0.3, greenColor, 1.0);
    this.createBar(this.redBar, this.width * 0.4, this.height * 0.2, redBar, 1.0);
    this.createBar(this.whiteBar, this.width * 0.4, this.height * 0.2, 0xffffff, 1.0);
    this.createBar(this.redBar2, this.width * 0.4, this.height * 0.2, redBar, this.gameType === "sulky" ? 0.87 : 1.0);
    this.createRound(this.greenBar2, texRadius30, this.width * 0.5, this.height * 0.3, greenColor, 1.0);
  }

  public setFadeX(inFactor: number, overlayImage: DynamicMesh, force?: boolean) {
    const fxFactor = this.calcEasedFactor(inFactor);
    const visible = inFactor < 0 || inFactor > 1.0 ? false : true;

    const f = 1 - fxFactor;
    this.greenBig.x = _s(-1280 + f * 3000);
    this.greenBig.visible = visible;

    this.whiteBig.x = _s(-700 + f * 2150);
    this.whiteBig.visible = visible;

    this.transparentBar.x = _s(200 + f * 200);
    this.transparentBar.width = _s(Math.max(f - 0.05, 0) * 600);
    this.transparentBar.alpha = Math.pow(1 - f, 1.0) * 0.6 - 0.1;
    this.transparentBar.visible = visible;
    this.transparentBar2.x = _s(-500 + f * 3200);

    this.greenBar.visible = true;
    this.greenBar.x = _s(-300 + f * 2600);
    this.greenBar.width = _s(Math.max(Math.sin((f - 0.1) * Math.PI * 2) * 300, 0));
    this.greenBar.y = _s(50);

    this.whiteBar.visible = visible;
    this.whiteBar.x = _s(200 + f * 1280);
    this.whiteBar.width = _s(Math.max(Math.sin((f - 0.05) * Math.PI * 1.8) * 300, 0));
    this.whiteBar.y = _s(300);

    this.redBar.visible = visible;
    this.redBar.x = _s(-100 + f * 1400);
    this.redBar.width = _s(Math.max(Math.sin((f - 0.2) * Math.PI * 2.2) * 300, 0));
    this.redBar.y = _s(500);

    this.redBar2.visible = visible;
    this.redBar2.x = _s(-250 + f * 1250);
    this.redBar2.width = _s(Math.max(Math.sin((f - 0.45) * Math.PI * 2.2) * 300, 0));
    this.redBar2.y = _s(200);
    this.redBar2.alpha = 1 - Math.pow(f, 4);

    this.greenBar2.visible = visible;
    this.greenBar2.x = _s(-200 + f * 950);
    this.greenBar2.width = _s(Math.max(Math.sin((f - 0.6) * Math.PI * 3.0) * 300, 0));
    this.greenBar2.y = _s(450);
    this.greenBar2.alpha = 1 - Math.pow(f, 5);

    // update overlay image
    const fo = Math.max((1.0 - fxFactor) * 1.25 - 0.1); // * 0.8 + 0.1;
    if ((this as any).lastFx !== fo || force) {
      const dx = this.getDx();
      overlayImage.setPositions([0, 0, fo * this.width, 0, fo * this.width + dx, this.height, 0, this.height]);
      overlayImage.setUvs([0, 0, fo, 0, fo + dx / this.width, 1, 0, 1]);
      (this as any).lastFx = fo;
    }
  }

  private calcEasedFactor(factor: number) {
    const tb = 0.0;
    const te = 0.0;
    const factorEased = AnimHelper.sigmoid(factor, 3.0);
    const ret = te + factorEased * (1 - te + tb);
    // if (factor > 0 && factor < 1)
    //  console.log("Factor: " + factor + " " + factorEased + " " + ret);
    return ret;
  }
}
