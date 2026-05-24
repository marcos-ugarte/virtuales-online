import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings, _t } from "client/Logic/Logic";
import { AnimHelper } from "../common/Anim";
import Logo6 from "assets/dog/6/Logo.svg";
import Logo8 from "assets/dog/8/Logo.svg";
import Logo63 from "assets/dog/63/Logo_pro.svg";
import LogoHorse from "assets/horse/Logo.svg";
import LogoSulky from "assets/sulky/Logo.svg";
import { Engine } from "client/Graphics/Engine";
import { DrawHelper } from "../common/DrawHelper";
import { MultiStyleText, IExtendedTextStyle } from "../common/MultiStyleText";
import { UIHelper } from "../UIHelper";
import { GameType } from "common/Definitions";
import { IGameInfo, VideoState } from "client/Logic/LogicDefinitions";
import { Dog63Helper } from "../dog63/Dog63Helper";

export function calcDefaultTopBarGradient(gameType: GameType) {
  if (gameType === "dog8") {
    return {
      color: "#0F241C",
      color2: "#234C3D"
    };
  }
  if (gameType === "dog6" || gameType === "dog63") {
    return {
      color: "#172439",
      color2: "#2a3d5a"
    };
  } else if (gameType === "kart5") {
    return {
      color: "#1f2225",
      color2: "#2f353a"
    };
  } else if (gameType === "horse") {
    return {
      color: "#2C1907",
      color2: "#4F3416"
    };
  } else if (gameType === "sulky") {
    return {
      color: "#2B0B21",
      color2: "#4E1F3E"
    };
  }
  return {
    color: "#ff00ff00",
    color2: "#ffff00ff"
  };
}

export class TopBarLeftDog extends Group {
  private gameType: GameType;
  private text: MultiStyleText;
  private logo!: PIXI.Sprite;
  private textBackground: PIXI.NineSlicePlane;
  private animatedItems: PIXI.Sprite[] = [];
  private forPauseOverlay: boolean;
  private proText: PIXI.Text | undefined;
  private oddsAlwaysOn: boolean = false;

  public constructor(gameInfo: IGameInfo, forPauseOverlay: boolean) {
    super();
    this.forPauseOverlay = forPauseOverlay;
    this.gameType = gameInfo.gameType;
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;

    this.showDebug(settings.debug, 1, "TopbarLeftDOg");
    // this.showDebug(true);

    for (let i = 0; i < 3; i++) {
      const item = new PIXI.Sprite();
      item.x = i * _s(50) + _s(300);
      this.animatedItems.push(item);
      this.add(item);
    }

    this.textBackground = UIHelper.createNineSlicePlane();
    this.add(this.textBackground);

    {
      const style: IExtendedTextStyle = {
        fontFamily: "DIN-UltraLightItalic",
        fontSize: _s(25),
        letterSpacing: _s(-1),
        fill: "white",
        trim: true,
        padding: 10,
        align: "center"
      };
      const style2: IExtendedTextStyle = {
        fontFamily: "DIN-MediumItalic",
        fontSize: _s(25),
        letterSpacing: _s(-1),
        trim: true,
        padding: 10,
        fill: this.gameType === "dog8" ? "#C1A101" : "#209dce",
        align: "center"
      };
      if (this.gameType === "horse") style2.fill = "#D59953";
      else if (this.gameType === "sulky") style2.fill = "#c46ca5";

      const style2Sup: IExtendedTextStyle = {
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(25),
        letterSpacing: _s(5),
        trim: true,
        padding: 10,
        fill: this.gameType === "horse" || this.gameType === "sulky" ? "#D59953" : "#C1A101",
        align: "center",
        valign: _s(4)
      };

      let titleText = "RACING <style2>DOGS</style2>";
      if (this.gameType === "horse") titleText = "RACING <style2>HORSES</style2>";
      else if (this.gameType === "sulky") titleText = "RACING <style2>HARNESS</style2>";
      if (this.gameType === "dog8") titleText += "<sup>+</sup>";

      //const titleText = this.gameType === "dog8" ? "RACING <style2>DOGS</style2><sup>+</sup>" : "RACING <style2>DOGS</style2>";
      this.text = new MultiStyleText(titleText, { default: style, style2, sup: style2Sup });
      this.text.anchor.set(0, 0.5);
      this.add(this.text);
    }

    if (this.gameType === "dog63") {
      const proStyle = new PIXI.TextStyle({
        fontFamily: "DIN-HeavyItalic",
        fontSize: _s(12),
        fill: 0xed001f, //Dog63Helper.getRedColorNumber(),
        //letterSpacing: _s(0.5),
        align: "left"
      });
      this.proText = Logic.createPixiText(proStyle);
      this.add(this.proText);
    }

    this.logo = new PIXI.Sprite();
    this.logo.anchor.set(0.5, 0.5);
    this.add(this.logo);

    this.alpha = 1.0;
  }

  public fill() {}

  public onLayout() {
    this.logo.width = _s(85.2);
    let logo: string = Logo6;
    if (this.gameType === "dog63") logo = Logo63;
    else if (this.gameType === "dog8") logo = Logo8;
    else if (this.gameType === "horse") logo = LogoHorse;
    else if (this.gameType === "sulky") logo = LogoSulky;

    if (this.proText) {
      this.proText.text = _t("pro");
      this.proText.x = _s(214);
      this.proText.y = _s(4);
      Logic.autoSize(this.proText, _s(100));
    }

    Logic.loadSVG(logo, { width: this.logo.width * Math.max(Engine.instance.resolution, 1.5), mipmap: PIXI.MIPMAP_MODES.OFF }).then((el) => {
      this.logo.texture = el;
    });

    UIHelper.fillNineSlicePlane(this.textBackground, this.height);
    this.textBackground.position.y = 0;
    const skewedRadius = UIHelper.getSkewedRadius(this.height);
    const gradient = calcDefaultTopBarGradient(this.gameType);
    this.textBackground.texture = DrawHelper.createSkewedRoundedRectangleTexture(
      UIHelper.getSkewedBorder(skewedRadius, 0) * 2,
      this.height,
      skewedRadius,
      0,
      {
        type: "gradient",
        color: gradient.color,
        color2: gradient.color2
      },
      { mipmap: PIXI.MIPMAP_MODES.OFF }
    );
    const animtedItemTex = DrawHelper.createSkewedRoundedRectangleTexture(
      UIHelper.getSkewedBorder(skewedRadius, 0) * 2,
      this.height,
      skewedRadius,
      0,
      {
        type: "gradient",
        color: gradient.color,
        color2: gradient.color2
      },
      { mipmap: PIXI.MIPMAP_MODES.OFF }
    );
    for (const item of this.animatedItems) {
      item.texture = animtedItemTex;
      UIHelper.setPixiSkew(item, this.height);
    }

    // this.y += _s(50);
  }

  public update(dt: number) {
    super.update(dt);
    let t = this.forPauseOverlay ? 15 : Logic.getVideoTime();
    const raceEndTime = Logic.getRaceLength() + Logic.getIntroLength();

    if (Logic.isFading && Logic.fadeTarget === VideoState.Race) {
      t = Logic.getIntroLength();
    }

    const infoAnim = Logic.getAnim(
      t,
      [
        {
          startTime: this.gameType === "horse" || this.gameType === "sulky" || this.oddsAlwaysOn ? 0.0 : 3.2,
          duration: raceEndTime - (this.gameType === "horse" || this.gameType === "sulky" ? -1.0 : 1.2)
        }
      ],
      this.textBackground
    );

    this.textBackground.position.x = _s(66.5);
    if (infoAnim) {
      let f = 0;
      if (t < infoAnim.startTime + infoAnim.duration - 1) {
        f = t - infoAnim.startTime;
      } else {
        f = (infoAnim.startTime + infoAnim.duration - t) * 2;
      }
      let backgroundWidth = 175;
      if (this.gameType === "dog63") backgroundWidth = 185;
      else if (this.gameType === "horse") backgroundWidth = 195;
      else if (this.gameType === "sulky") backgroundWidth = 205;
      this.textBackground.width = AnimHelper.easeOut(AnimHelper.clamp(f - 0.8)) * _s(backgroundWidth);

      this.text.position.y = _s(17.5);
      this.text.position.x = this.textBackground.position.x + _s(9) + (AnimHelper.easeOut(AnimHelper.clamp(f - 0.8)) - 1) * _s(185);
      this.text.alpha = AnimHelper.clamp(AnimHelper.easeIn(AnimHelper.clamp((f - 0.7) * 2)));

      this.logo.position.x = _s(35);
      this.logo.alpha = AnimHelper.easeIn(AnimHelper.clamp(f * 3));
      this.logo.position.y = this.height * 0.5;
      this.logo.height = (this.logo.width * this.logo.texture.height) / this.logo.texture.width;

      if (this.proText) {
        this.proText.position.x = this.textBackground.position.x + _s(214 - 65) + (AnimHelper.easeOut(AnimHelper.clamp(f - 0.8)) - 1) * _s(185);
        this.proText.alpha = this.text.alpha;
      }

      this.animatedItems.forEach((item, index) => {
        const fn = AnimHelper.clamp(f - 0.2 - index * 0.2);
        item.x = this.textBackground.position.x + AnimHelper.easeOut(fn) * _s(181);
        item.scale.set(1.0 - AnimHelper.easeIn(fn), 1);
        item.alpha = fn > 0.001 && fn < 0.999 ? 1.0 - AnimHelper.easeIn(fn) : 0;
      });
    } else {
      if (this.gameType === "dog63" || this.gameType === "horse" || this.gameType === "sulky") {
        this.logo.alpha = 0;
        this.text.alpha = 0;
        if (this.proText) this.proText.alpha = 0;
      }
    }
  }

  public setDefaultPos(racerCount: number) {
    this.position.x = _s(racerCount === 6 ? 10 : 0);
    this.position.y = _s(7);
    this.width = _s(racerCount === 6 ? 470 : 490);
    this.height = _s(36);
  }

  public getNextX(gameType: GameType) {
    let offset = _s(gameType === "dog6" || gameType === "dog8" ? 244.5 : 254.5);
    if (gameType === "horse") offset = _s(264.5);
    else if (gameType === "sulky") {
      offset = _s(275);
    }
    return this.position.x + offset;
  }
}
