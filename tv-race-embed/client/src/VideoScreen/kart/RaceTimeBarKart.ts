import * as PIXI from "pixi.js";
import { DynamicGeometry, DynamicMesh } from "client/Graphics/DynamicMesh";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { AnimHelper } from "./../common/Anim";
import { AnimatedText } from "./../common/AnimatedText";
import { IRoundInfo, IAnimInterval, IResult } from "client/Logic/LogicDefinitions";
import { BonusAnnotationKart } from "./BonusAnnotationKart";
import { Util } from "common/Util";
import { Color } from "common/Color";
import { GameType, GameLength } from "common/Definitions";
import { ChangeAbleText } from "../common/ChangeAbleText";

export class RaceTimeBarKart extends Group {
  private backgroundRect: DynamicMesh;
  private raceNumberText: AnimatedText;
  private raceIdText: PIXI.Text;
  private raceTimeText: ChangeAbleText;
  private bonusAnnotation: BonusAnnotationKart;
  private anims: IAnimInterval[];
  private totalRaceTime: number = 0;
  private gameType: GameType;
  private isIt = false;

  public constructor(gameType: GameType, gameLength: GameLength, language: string) {
    super();
    this.gameType = gameType;
    this.backgroundRect = new DynamicMesh();
    this.isIt = language === "it";
    this.backgroundRect.setPositions([0, 0, 0, 0, 0, 0, 0, 0]);
    this.backgroundRect.setIndices([0, 1, 2, 0, 2, 3]);
    this.backgroundRect.setColors([0xff101010, 0xff101010, 0xff1f1f1f, 0xff1f1f1f]);
    this.backgroundRect.color = 0xffffffff;
    this.showDebug(settings.debug, undefined, "RaceTimeBarKart");
    const dg = new DynamicGeometry("Pos2Color", 16, 24);
    dg.add(this.backgroundRect);
    this.add(dg);

    const maxFontSize = _s(28);
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-UltraLight",
        fontSize: maxFontSize,
        fill: "white",
        align: "center"
      });
      this.raceNumberText = new AnimatedText("", style);
      this.raceNumberText.anchor.set(0.0, 0.5);
      this.add(this.raceNumberText);
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-UltraLightItalic",
        fontSize: _s(11),
        fill: "white",
        align: "center",
        fontStyle: "italic"
      });
      this.raceIdText = Logic.createPixiText(style);
      this.raceIdText.anchor.set(0, 0.5);
      if (language === "it") this.add(this.raceIdText);
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Medium",
        fontSize: maxFontSize,
        fill: "white",
        align: "center"
      });
      this.raceTimeText = new ChangeAbleText("", style);
      this.raceTimeText.setAnchor(0.5, 0.5);
      this.add(this.raceTimeText);
    }

    this.bonusAnnotation = new BonusAnnotationKart("RaceTimeBar");
    this.add(this.bonusAnnotation);

    this.anims = [{ startTime: 0.1, duration: Logic.getRaceLength() }];
  }

  public fill(roundInfo: IRoundInfo) {
    this.raceIdText.text = _t("sendPlanPre") + " " + roundInfo.sendPlan;
    this.raceNumberText.setText(_t("raceMotor") + " " + Logic.implementation.formatRound(roundInfo.gameId));
    Logic.autoSize(this.raceNumberText, _s(140));
    this.updateLayout();
  }

  public fillRace(result: IResult) {
    if (result.clockEndTime) {
      this.totalRaceTime = result.clockEndTime;
    } else {
      this.totalRaceTime = 0;
    }

    this.bonusAnnotation.fill(result.roundBonusType);
    this.bonusAnnotation.visible = result.roundBonusType !== undefined;
  }

  public onLayout() {
    const trafficPositions = [0, 0, this.width, 0, this.width, this.height, _s(-27), this.height];
    this.backgroundRect.setPositions(trafficPositions);

    const posY = _s(this.isIt ? 30 : 26);
    this.raceNumberText.x = 0;
    this.raceNumberText.y = posY;

    this.raceTimeText.x = _s(221 - this.raceTimeText.width * 0.5);
    this.raceTimeText.y = posY;

    this.bonusAnnotation.x = _s(-17);
    this.bonusAnnotation.y = _s(0);

    this.raceIdText.position.x = _s(0);
    this.raceIdText.position.y = _s(9);
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getRaceVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const raceTime = Logic.getRaceVideoTime();
    const inGameRaceTime = Logic.getInGameRaceTime(this.gameType);
    this.raceTimeText.setText(Logic.implementation.formatTime(Math.min(inGameRaceTime, this.totalRaceTime + 0.001)));

    const baseFactor = AnimHelper.limit(t - anim.startTime, anim.duration);
    const f1 = AnimHelper.clamp(baseFactor * 3);
    const trafficPositions = [0, 0, this.width * f1, 0, this.width * f1, this.height, _s(-27), this.height];
    this.backgroundRect.setPositions(trafficPositions);
    this.backgroundRect.alpha = baseFactor;

    const tf = baseFactor * 3 - 0.2;
    this.raceNumberText.alpha = tf;
    this.raceNumberText.animateText(tf);
    this.raceTimeText.pixiText.tint = Color.blendARGB(0x00ffffff, 0x00f4cb42, inGameRaceTime - 45.1);
    this.raceTimeText.alpha = tf;
    this.bonusAnnotation.alpha = baseFactor;
    this.raceIdText.alpha = tf;
    if (raceTime > 0 && raceTime < 46) this.bonusAnnotation.alpha = Util.clamp(0.6 + Math.cos(raceTime * 5) * 0.55, 0, 1);
    else this.bonusAnnotation.alpha = 0.0;
  }
}
