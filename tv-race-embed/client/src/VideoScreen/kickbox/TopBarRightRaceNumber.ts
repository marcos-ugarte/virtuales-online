import * as PIXI from "pixi.js";
//import { DynamicGeometry, DynamicMesh } from "client/Graphics/DynamicMesh";
import { Group } from "client/Graphics/Group";
import { Logic, settings, _s, _t } from "client/Logic/Logic";
// import { AnimHelper } from "./../common/Anim";
// import { AnimatedText } from "./../common/AnimatedText";
import { IRoundInfo, IAnimInterval, IResult, VideoState } from "client/Logic/LogicDefinitions";
// //import { BonusAnnotationKart } from "./BonusAnnotationKart";
// import { Util } from "common/Util";
// import { Color } from "common/Color";
import { GameType, GameLength } from "common/Definitions";
//import { LogicImplementation } from "client/LogicImplementation/LogicImplementation";
import { IExtendedTextStyle, MultiStyleText } from "../common/MultiStyleText";
import { KickboxHelper } from "./KickboxHelper";
import { AnimHelper } from "../common/Anim";
import { LayoutHelper } from "../Util/LayoutHelper";

export class TopBarRightRaceNumber extends Group {
  private fightText: PIXI.Text;
  private numberText: PIXI.Text;
  //private raceNumberText: MultiStyleText;
  private anims: IAnimInterval[];
  private topHudSprite: PIXI.Sprite;
  private isFading: () => boolean;
  private getFadeTargetState: () => VideoState | undefined;

  public constructor(gameType: GameType, gameLength: GameLength, language: string, isFading: () => boolean, getFadeTargetState: () => VideoState | undefined) {
    super();
    this.showDebug(settings.debug, undefined, "TR");

    this.isFading = isFading;
    this.getFadeTargetState = getFadeTargetState;
    this.topHudSprite = new PIXI.Sprite(Logic.gameInfo?.additionalTextures?.headerImage);
    this.add(this.topHudSprite);

    {
      const fightStyle = new PIXI.TextStyle({
        fontFamily: "DIN-RegularItalic",
        fontSize: _s(24),
        fill: "white",
        fontStyle: "italic"
      });
      this.fightText = Logic.createPixiText(fightStyle);
      this.add(this.fightText);
      this.fightText.anchor.set(0, 0.5);
    }

    {
      const numberStyle = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(24),
        fontWeight: "bold",
        //letterSpacing: _s(1),
        fill: KickboxHelper.getBlueColor(),
        fontStyle: "italic",
        align: "right"
      });
      this.numberText = Logic.createPixiText(numberStyle);
      this.add(this.numberText);
      this.numberText.anchor.set(1, 0.5);
    }

    // {
    //   this.raceNumberText = new MultiStyleText();
    //   this.raceNumberText.anchor.set(0.0, 0.5);
    //   this.add(this.raceNumberText);
    // }
    this.anims = [{ startTime: 1, duration: Logic.getRaceLength() + Logic.getIntroLength() }];
  }

  public fill(roundInfo: IRoundInfo | undefined) {
    // {
    //   const defaultStyle: IExtendedTextStyle = {
    //     fontFamily: "DIN-RegularItalic",
    //     fontSize: _s(24),
    //     fill: "white",
    //     valign: "middle",
    //     fontStyle: "italic"
    //   };

    //   const boldStyle: IExtendedTextStyle = {
    //     fontFamily: "DIN-BoldItalic",
    //     fontSize: _s(24),
    //     fontWeight: "bold",
    //     //letterSpacing: _s(1),
    //     fill: KickboxHelper.getBlueColor(),
    //     valign: "middle",
    //     fontStyle: "italic"
    //   };

    this.fightText.text = _t("fight");
    if (roundInfo) this.numberText.text = "" + roundInfo.gameId;

    // const driverText = roundInfo ?  `${_t("fight")}<b>${roundInfo.gameId}</b>` : "";
    // this.raceNumberText.styles = {default: defaultStyle, b: boldStyle };
    // this.raceNumberText.text = driverText;
    // Logic.autoSize(this.raceNumberText, _s(140));

    Logic.autoSize(this.fightText, _s(70));
    //}
    this.updateLayout();
  }

  public fillRace(roundInfo: IRoundInfo, result: IResult) {
    this.fill(roundInfo);
  }

  public onLayout() {
    const posY = _s(20 + 24);
    //986, 24
    this.numberText.y = posY;
    this.fightText.y = posY;
    this.numberText.x = _s(125 + 986 + 106);
    this.fightText.x = _s(125 + 983);
    // this.raceNumberText.x = _s(125 + 986);
    // this.raceNumberText.y = posY;
    // console.log("TopBarRightRaceNumber scale topHudSprite");
    LayoutHelper.setScaledRectangleSprite(this.topHudSprite, -this.x, -this.y, 1280, 114);
  }

  public update(dt: number) {
    super.update(dt);

    let t = Logic.getVideoTime();
    if (this.isFading()) t = 1;
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    this.showDebugTime("TR", Logic.getRaceVideoTime());

    if (this.numberText.alpha === 0) {
      this.showDebugTime("TR", Logic.getRaceVideoTime());
    }

    let videoTime = Logic.getVideoTime();
    // fading kills the videotime
    if (this.isFading()) videoTime = 1;

    //if (videoTime < 10){
    if (!this.isFading()) {
      AnimHelper.animateIn(videoTime, 2.2, anim.duration, 0.5, 0, 1, (x) => (this.topHudSprite.alpha = x));
      AnimHelper.animateIn(videoTime, 0.5, 100, 0.5, 0, 1, (x) => (this.numberText.alpha = x));
      AnimHelper.animateIn(videoTime, 0.5, 100, 0.5, 0, 1, (x) => (this.fightText.alpha = x));
    }
    // if (this.isFading())
    //   this.topHudSprite.alpha = 1;
    // }
    // else {
    // }

    // const baseFactor = Logic.getVideoTime();
    // AnimHelper.animateInOut(baseFactor, 0, Logic.getRaceEndTime()-KickboxHelper.fightResultLength+3, 0, 1, 1, x => this.alpha = x, 1, 0);

    if (t > Logic.getRaceEndTime() - 7) {
      AnimHelper.animateInOut(
        t,
        Logic.getRaceEndTime() - 7,
        Logic.getRaceEndTime() - 4,
        0,
        1,
        1,
        (alpha) => {
          this.fightText.alpha = alpha;
          this.numberText.alpha = alpha;
          this.topHudSprite.alpha = alpha;
        },
        0.5,
        0
      );
    }
  }
}
