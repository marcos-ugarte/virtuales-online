import * as PIXI from "pixi.js";
import { DynamicGeometry, DynamicMesh } from "client/Graphics/DynamicMesh";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings, _t } from "client/Logic/Logic";
import { AnimHelper } from "../common/Anim";
import Logo from "assets/kart/5/Logo.svg";
import { Engine } from "client/Graphics/Engine";
import { IGameInfo, VideoState } from "client/Logic/LogicDefinitions";
import { calcDefaultTopBarGradient } from "../dog/TopBarLeftDog";
import { calcLogoDisplaySize } from "../dog/TopBarLeftPanelDog";

const offsetX = 27;

export class TopBarLeftKart extends Group {
  private text1: PIXI.Text;
  private text2: PIXI.Text;
  private logo!: PIXI.Sprite;
  private textMetrics: PIXI.TextMetrics;
  private blurFilter = new PIXI.BlurFilter();
  private dg = new DynamicGeometry("Pos2Color", 16, 24);
  private logoBackground: DynamicMesh;
  private textBackground: DynamicMesh;
  private rightBackground: DynamicMesh;
  private companyLogo?: PIXI.Sprite;
  private cache: Record<string, number> = {};
  private forPauseOverlay: boolean;

  public constructor(gameInfo: IGameInfo, forPauseOverlay: boolean) {
    super();

    this.forPauseOverlay = forPauseOverlay;
    this.showDebug(settings.debug);

    this.logoBackground = new DynamicMesh();
    this.logoBackground.setPositions(_s([0, 0, 103 + offsetX, 0, 103, 50, -offsetX, 50]));
    this.logoBackground.setIndices([0, 1, 2, 0, 2, 3]);
    this.logoBackground.setColors([0xff1f2225, 0xff2f353a, 0xff2f353a, 0xff1f2225]);
    this.dg.add(this.logoBackground);

    this.textBackground = new DynamicMesh();
    this.textBackground.setPositions(_s([0, 0, 270 + offsetX, 0, 270, 50, -offsetX, 50]));
    this.textBackground.setIndices([0, 1, 2, 0, 2, 3]);
    this.textBackground.setColors([0xff1f2225, 0xff2f353a, 0xff2f353a, 0xff1f2225]);
    this.dg.add(this.textBackground);

    this.rightBackground = new DynamicMesh();
    this.rightBackground.setPositions(_s([0, 0, 30 + offsetX, 0, 30, 50, -offsetX, 50]));
    this.rightBackground.setIndices([0, 1, 2, 0, 2, 3]);
    if (gameInfo.companyLogo) {
      let color: string;
      let color2: string;
      if (gameInfo.companyLogo.color === undefined) {
        const gradient = calcDefaultTopBarGradient(gameInfo.gameType);
        color = gradient.color;
        color2 = gradient.color2;
      } else {
        color = gameInfo.companyLogo.color;
        color2 = gameInfo.companyLogo.color2 || gameInfo.companyLogo.color;
      }
      if (color.startsWith("#")) color = color.substr(1);
      if (color.length === 6) color = "ff" + color;
      if (color2.startsWith("#")) color2 = color2.substr(1);
      if (color2.length === 6) color2 = "ff" + color2;
      const colorHex = parseInt(color, 16);
      const colorHex2 = parseInt(color2, 16);

      this.rightBackground.setColors([colorHex, colorHex2, colorHex2, colorHex]);
    } else {
      this.rightBackground.setColors([0xff1f2225, 0xff2f353a, 0xff2f353a, 0xff1f2225]);
    }
    this.dg.add(this.rightBackground);
    this.add(this.dg);

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-LightItalic",
        fontSize: _s(30),
        fill: "white",
        align: "center",
        fontStyle: "italic"
      });
      this.text1 = Logic.createPixiText(style);
      this.text1.anchor.set(0, 0.5);
      this.text1.filters = [this.blurFilter];
      this.add(this.text1);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(30),
        fill: "white",
        align: "center",
        fontStyle: "italic"
      });
      this.text2 = Logic.createPixiText(style);
      this.text2.anchor.set(0, 0.5);
      this.text2.filters = [this.blurFilter];
      this.add(this.text2);
    }
    this.textMetrics = PIXI.TextMetrics.measureText(this.text1.text, this.text1.style);

    this.logo = new PIXI.Sprite();
    this.add(this.logo);

    if (gameInfo.companyLogo) {
      this.companyLogo = new PIXI.Sprite();
      this.companyLogo.anchor.set(0.5, 0.5);
      this.companyLogo.texture = gameInfo.companyLogo.image;
      this.add(this.companyLogo);
    }
  }

  public fill() {
    this.text1.text = _t("racing");
    this.text2.text = _t("karts");
    this.textMetrics = PIXI.TextMetrics.measureText(this.text1.text, this.text1.style);
  }

  public onLayout() {
    this.text1.position.y = _s(24);
    this.text2.position.y = this.text1.position.y;

    {
      /*const tempImage = new Image();
      const canvas = document.createElement("canvas");
      canvas.width = _s(82);
      canvas.height = _s(82);
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#f0f";
        context.clearRect(0, 0, 50, 50);
        context.drawImage(tempImage, 0, 0, 50, 50, 0, 0, 50, 50);
        this.logo = PIXI.Sprite.from(canvas);
        // this.logo = PIXI.Sprite.from(Logo, {resourceOptions: {width: 82}});
        this.add(this.logo);
      }*/
    }

    this.logoBackground.x = _s(0);
    this.textBackground.x = _s(133);
    this.rightBackground.x = _s(433);

    this.logo.width = _s(70);
    Logic.loadSVG(Logo, { width: this.logo.width * Math.max(Engine.instance.resolution, 1.5) }).then((el) => {
      this.logo.texture = el;
    });
  }

  public update(dt: number) {
    super.update(dt);

    this.logo.height = (this.logo.width * this.logo.texture.height) / this.logo.texture.width;
    let t = this.forPauseOverlay ? 10 : Logic.getVideoTime();

    if (Logic.isFading && Logic.fadeTarget === VideoState.Race) {
      t = Logic.getIntroLength();
    }

    let baseFactor = t - 0.72;
    const startFadeOut = Logic.getRaceEndTime() - 1.5;
    if (t > startFadeOut) baseFactor = 1.0 - (t - startFadeOut);
    const lbf = AnimHelper.easeOut((baseFactor - 0) * 4, 5);
    this.logoBackground.alpha = lbf;
    this.logoBackground.x = _s(-200 + 200 * lbf);
    const tbf = AnimHelper.easeOut((baseFactor - 0.15) * 4, 5);
    this.textBackground.alpha = tbf;
    this.textBackground.x = _s(-200 + 133 + 200 * lbf);
    const rba = AnimHelper.easeOut((baseFactor - 0.3) * 4, 5);
    this.rightBackground.alpha = rba;
    this.rightBackground.x = _s(-200 + 433 + 200 * lbf);

    const f1 = AnimHelper.easeOut((baseFactor - 0.15) * 4, 5);
    this.text1.position.x = _s(-200 + (200 + 160) * f1);
    this.text1.alpha = f1;

    const f2 = AnimHelper.easeOut((baseFactor - 0) * 4, 5);
    this.text2.position.x = _s(-200 + (200 + 160 + 14 + (this.textMetrics as any).width / settings.scaleFactor) * f2);
    this.text2.alpha = f2;
    this.logo.position.x = _s(-100 + 120 * f2);
    this.logo.position.y = (this.height - this.logo.height) * 0.5;

    const newBlur = 4 * (1.0 - f1);
    if (this.blurFilter.blur !== newBlur) {
      this.blurFilter.blur = newBlur;
      this.blurFilter.enabled = newBlur > 0;
    }

    if (this.companyLogo) {
      const displaySize = this.calcLogoDisplaySize()!;
      this.companyLogo.width = displaySize.width;
      this.companyLogo.height = displaySize.height;
      this.companyLogo.position.x = this.rightBackground.x + displaySize.width * 0.5;
      this.companyLogo.position.y = this.height * 0.5;
      this.companyLogo.alpha = this.rightBackground.alpha;

      const clw = displaySize.width / _s(1);
      if (this.cache.clw !== clw) {
        this.rightBackground.setPositions(_s([0, 0, clw + offsetX, 0, clw, 50, -offsetX, 50]));
        this.cache.clw = clw;
      }
    }
  }

  public calcLogoDisplaySize() {
    if (this.companyLogo) {
      const displaySize = calcLogoDisplaySize(this.companyLogo.texture.width, this.companyLogo.texture.height, this.height);
      return displaySize;
    }
    return {
      width: _s(30),
      height: _s(50)
    };
  }

  public setDefaultPos() {
    this.position.x = _s(0);
    this.position.y = _s(34);
    this.width = _s(490);
    this.height = _s(50);
  }
}
