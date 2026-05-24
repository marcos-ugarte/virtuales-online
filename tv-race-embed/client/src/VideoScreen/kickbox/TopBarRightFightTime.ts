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
import { KickboxHelper } from "./KickboxHelper";
import { AnimHelper } from "../common/Anim";

export class TopBarRightFightTime extends Group {
  //private backgroundRect: DynamicMesh;
  private raceTimeText: PIXI.Text;
  //private bonusAnnotation: BonusAnnotationKart;
  private anims: IAnimInterval[];
  private totalRaceTime: number = 0;
  private gameType: GameType;
  private gameLength: GameLength;
  private language: string;
  private isFading: () => boolean;
  private getFadeTargetState: () => VideoState | undefined;

  public constructor(gameType: GameType, gameLength: GameLength, language: string, isFading: () => boolean, getFadeTargetState: () => VideoState | undefined) {
    super();
    this.showDebug(settings.debug, undefined, "TR");
    this.gameType = gameType;
    this.gameLength = gameLength;
    this.language = language;
    this.isFading = isFading;
    this.getFadeTargetState = getFadeTargetState;

    // this.backgroundRect = new DynamicMesh();
    // this.backgroundRect.setPositions([0, 0, 0, 0, 0, 0, 0, 0]);
    // this.backgroundRect.setIndices([0, 1, 2, 0, 2, 3]);
    // this.backgroundRect.setColors([0xff101010, 0xff101010, 0xff1f1f1f, 0xff1f1f1f]);
    // this.backgroundRect.color = 0xffffffff;

    // const dg = new DynamicGeometry("Pos2Color", 16, 24);
    // dg.add(this.backgroundRect);
    // this.add(dg);

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(24),
        fill: "white",
        //fill: KickboxHelper.getRedColor(),
        align: "center",
        fontStyle: "italic"
      });
      this.raceTimeText = Logic.createPixiText(style);
      this.raceTimeText.anchor.set(0.0, 0.5);
      this.add(this.raceTimeText);
    }

    this.anims = [{ startTime: 0.1, duration: Logic.getIntroLength() }];
  }

  public fill(roundInfo: IRoundInfo) {
    this.updateLayout();
  }

  public fillRace(roundInfo: IRoundInfo, result: IResult) {
    if (result.clockEndTime) {
      this.totalRaceTime = result.clockEndTime;
    } else {
      this.totalRaceTime = 0;
    }

    this.fill(roundInfo);
  }

  public onLayout() {
    const posY = _s(20);
    this.raceTimeText.x = _s(26);
    this.raceTimeText.y = posY;
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    this.showDebugTime("TR", Logic.getRaceVideoTime());

    let videoTime = Logic.getVideoTime();
    if (this.isFading() && this.getFadeTargetState && this.getFadeTargetState() === VideoState.Race) videoTime = 10;
    this.raceTimeText.alpha = videoTime < Logic.getIntroLength() ? 1 : 0;

    // isFading gives VideoTime 0 - breaks view
    const introTime = this.isFading() ? 0 : Logic.getTimeUntilRaceForTimeBar() - Logic.getVideoTime();
    this.raceTimeText.text = Logic.implementation.formatTime(introTime);

    AnimHelper.animateIn(videoTime, 0.8, 10, 0.5, 0, 1, (x) => (this.raceTimeText.alpha = x));

    if (introTime < 11) {
      const blinkColor = Math.floor(Math.max(introTime, 0)) % 2 === 0 ? KickboxHelper.getBlueColorNumber() : KickboxHelper.getRedColorNumber();
      this.raceTimeText.tint = blinkColor;
    } else if (introTime > 0) {
      this.raceTimeText.tint = KickboxHelper.getRedColorNumber();
    }

    if (Logic.getState() === VideoState.Race) this.raceTimeText.alpha = 0;
    // else
    //   this.raceTimeText.alpha = 1;
  }

  public setTimeUntilRace(timeUntilRace: number) {
    this.raceTimeText.text = Logic.implementation.formatTime(timeUntilRace);
  }
}
