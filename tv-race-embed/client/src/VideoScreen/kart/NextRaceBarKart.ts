import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _t, _s, settings } from "client/Logic/Logic";
import { AnimHelper } from "../common/Anim";
import { IRoundInfo } from "client/Logic/LogicDefinitions";
import { Util } from "common/Util";
import { AnimatedBonusTopKart } from "./AnimatedBonusTopKart";
import { GameLength } from "common/Definitions";
import { ChangeAbleText } from "../common/ChangeAbleText";

export class NextRaceBarKart extends Group {
  private lapText: PIXI.Text;
  private timeText: ChangeAbleText;
  private timeUntilText: PIXI.Text;
  public blurFilter = new PIXI.BlurFilter();
  private animatedBonus: AnimatedBonusTopKart;
  private language: string;
  private raceIdText: PIXI.Text;
  private forPauseOverlay: boolean;
  private oddsAlwaysOn: boolean;

  public constructor(gameLength: GameLength, language: string, forPauseOverlay: boolean, oddsAlwaysOn = false) {
    super();

    this.forPauseOverlay = forPauseOverlay;
    this.oddsAlwaysOn = oddsAlwaysOn;
    this.language = language;
    this.showDebug(settings.debug, undefined, "NextRaceBarKart");

    if (language === "it") {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-UltraLight",
        fontSize: _s(18),
        fill: "white",
        align: "right"
      });
      if (this.oddsAlwaysOn) {
        style.fontSize = _s(30);
      }
      this.lapText = Logic.createPixiText(style);
      this.lapText.filters = [this.blurFilter];
      this.lapText.anchor.set(0.5, 0.5);
      this.add(this.lapText);
    } else {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(30),
        fill: "white",
        align: "center"
      });

      this.lapText = Logic.createPixiText(style);
      this.lapText.anchor.set(0.5, 0.5);
      this.lapText.filters = [this.blurFilter];
      this.add(this.lapText);
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-UltraLightItalic",
        fontSize: _s(11),
        fill: "white",
        align: "left",
        fontStyle: "italic"
      });
      if (this.oddsAlwaysOn) {
        style.fontSize = _s(18);
        style.letterSpacing = _s(0.3);
        style.fontStyle = "normal";
        style.fontFamily = "DIN-UltraLight";
      }
      this.raceIdText = Logic.createPixiText(style);
      this.raceIdText.anchor.set(1, 0.5);
      if (language === "it") this.add(this.raceIdText);
    }

    {
      this.timeText = new ChangeAbleText("");
      this.timeText.setAnchor(0.5, 0.5);
      this.timeText.pixiText.filters = [this.blurFilter];
      this.add(this.timeText);
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-UltraLight",
        fontSize: _s(18),
        fill: "#FFF",
        align: "right"
      });
      this.timeUntilText = Logic.createPixiText(style);
      this.timeUntilText.anchor.set(1, 0.5);
      this.add(this.timeUntilText);
    }

    this.animatedBonus = new AnimatedBonusTopKart(gameLength, this.oddsAlwaysOn);
    this.add(this.animatedBonus);
  }

  public fill(round: IRoundInfo | undefined, language: string) {
    if (round) this.animatedBonus.fill(round);

    if (round) {
      if (language === "it") {
        let roundId = "";
        if (round.it_code_event) {
          roundId = Logic.implementation.formatRound(parseInt(round.it_code_event, 10));
        } else {
          roundId = Logic.implementation.formatRound(round.gameId);
        }
        this.fillRound((this.oddsAlwaysOn ? "" : _t("raceMotor").toUpperCase() + " ") + roundId, _t("sendPlanPre") + " " + round.sendPlan);
        Logic.autoSize(this.raceIdText, _s(this.oddsAlwaysOn ? 155 : 110));
      } else {
        const split = round.sendPlan.split("_");
        this.fillRound(Logic.implementation.formatRound(round.gameId), split[0] + "_" + split[1] + "\n" + split[2]);
      }
    } else {
      this.fillRound("", "");
    }
  }

  private fillRound(round: string, raceId: string) {
    this.timeUntilText.text = _t("timeNextRa");
    Logic.autoSize(this.timeUntilText, _s(290));

    this.lapText.text = round;
    this.raceIdText.text = raceId;

    const style = new PIXI.TextStyle({
      fontFamily: "DIN-Bold",
      fontSize: _s(32),
      trim: true,
      padding: 10,
      fill: "white",
      align: "center"
    });

    this.timeText.setStyle(style);
  }

  public onLayout(): void {
    if (this.language === "it") this.lapText.position.y = _s(38);
    else this.lapText.position.y = _s(41);

    this.timeText.position.x = _s(253);
    this.timeText.position.y = _s(41);

    this.timeUntilText.x = _s(303); // _s(292);
    this.timeUntilText.y = _s(13);

    this.animatedBonus.x = _s(2);
    this.animatedBonus.y = _s(58);

    this.raceIdText.position.y = _s(32.0);

    if (this.oddsAlwaysOn) {
      this.lapText.position.y = _s(41);
      this.raceIdText.position.y = _s(68);
    }
  }

  public setTimeUntilRace(timeUntilRace: number) {
    const counterText = Logic.implementation.formatTime(timeUntilRace);
    if (timeUntilRace < 10) {
      this.timeText.pixiText.tint = Util.rgbToHex(0xffff290e); // colors.red);
    } else {
      this.timeText.pixiText.tint = "#ffffff"; // white color
    }
    this.timeText.setText(counterText);
  }

  private updateTextPositions(fadeFactor: number) {
    if (this.language === "it") {
      if (this.oddsAlwaysOn) {
        this.raceIdText.position.x = _s(12 + 282 * fadeFactor);
        this.lapText.position.x = _s(-65 + 147 * fadeFactor);
      } else {
        this.lapText.position.x = _s(-65 + 188 * fadeFactor);
        this.raceIdText.position.x = _s(12 + 110 * fadeFactor);
      }
    } else this.lapText.position.x = _s(-90 + 172 * fadeFactor);
  }

  public update(dt: number) {
    super.update(dt);

    if (this.forPauseOverlay) {
      this.timeText.alpha = 1.0;
      this.raceIdText.alpha = 1.0;
      this.lapText.alpha = 1.0;
      this.timeUntilText.alpha = 1.0;
      this.raceIdText.alpha = 1.0;
      this.updateTextPositions(1.0);
      this.setTimeUntilRace(10.23);
      this.blurFilter.enabled = false;
    } else {
      const startTime = 1.15;
      const duration = Logic.getIntroEndTime() - startTime + 0.001; //  168.5; // Logic.videoRef.switchToIntroAtTime !== undefined ? Logic.videoRef.switchToIntroAtTime : Logic.getIntroLength();

      const t = Logic.getVideoTime();
      const anims = [{ startTime, duration }];
      const anim = Logic.getAnim(t, anims, this);
      if (!anim || !Logic.isInIntro()) {
        this.visible = false;
        return;
      }
      this.visible = true;

      const baseFactor = t - anim.startTime;
      if (baseFactor >= anim.duration) {
        const f1 = AnimHelper.easeOut(AnimHelper.limit(baseFactor, anim.duration) * 4, 5);
        this.lapText.alpha = f1;
        this.timeText.alpha = f1;
        this.timeUntilText.alpha = f1;
        this.animatedBonus.alpha = f1;
        this.raceIdText.alpha = f1;
      } else {
        const f1 = AnimHelper.easeOut(AnimHelper.limit(baseFactor, anim.duration) * 4, 5);
        this.updateTextPositions(f1);
        this.lapText.alpha = f1;

        this.timeText.alpha = f1;
        this.raceIdText.alpha = f1;
        const newBlur = 4 * (1.0 - f1);
        if (this.blurFilter.blur !== newBlur) {
          this.blurFilter.blur = newBlur;
          this.blurFilter.enabled = newBlur > 0;
        }

        const timeUntilRace = Logic.getTimeUntilRaceForTimeBar() - Logic.getVideoTime(); // INTRO_VIDEO_LENGTH
        this.setTimeUntilRace(timeUntilRace);

        this.timeUntilText.alpha = f1;
        this.animatedBonus.alpha = f1;
      }
    }
  }
}
