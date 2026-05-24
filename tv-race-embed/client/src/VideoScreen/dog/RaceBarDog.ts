import { oddsAlwaysOnStyles } from "./../../../settings/OddsAlwaysOnSettings";
import { raceBarSettings } from "../../../settings/OddsAlwaysOnSettings";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _t, _s, settings } from "client/Logic/Logic";
import { AnimHelper } from "../common/Anim";
import { IRoundInfo, IResult, IAnimInterval, VideoState } from "client/Logic/LogicDefinitions";
import { MultiStyleText } from "../common/MultiStyleText";
import { AnimatedBonusTopDog } from "./AnimatedBonusTopDog";
import { BonusAnnotationRaceBarDog } from "./BonusAnnotationRaceBarDog";
import { FadeDurations } from "common/FadeDurations";
import { GameLength, GameType } from "common/Definitions";
import { ChangeAbleText } from "../common/ChangeAbleText";
import { Logger } from "client/Logic/Logger";
import { IRoundInfoEx } from "client/LogicImplementation/GamesModel";

// Top Right Race number and timing
export class RaceBarDog extends Group {
  private gameType: GameType;
  private gameLength: GameLength;
  private raceStart: number | undefined;

  private raceIdText: PIXI.Text;
  private countDownText: PIXI.Text;

  private raceText: ChangeAbleText;
  private lapText: ChangeAbleText;
  private timeText: ChangeAbleText;

  private animatedBonus: AnimatedBonusTopDog;
  private bonusAnnotation: BonusAnnotationRaceBarDog;
  private totalRaceTime: number = 0;
  private anims: IAnimInterval[] = [];
  private language: string;
  private forPauseOverlay: boolean;

  private oddsAlwaysOn;
  public constructor(gameType: GameType, gameLength: GameLength, language: string, forPauseOverlay: boolean, oddsAlwaysOn = false) {
    super();
    this.showDebug(settings.debug, undefined, "RaceBar");
    this.container.name = "RaceBar";
    this.oddsAlwaysOn = oddsAlwaysOn;
    this.language = language;
    this.gameType = gameType;
    this.gameLength = gameLength;

    this.forPauseOverlay = forPauseOverlay;
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-UltraLightItalic",
        fontSize: _s(20),
        fill: "gray",
        align: "center",
        trim: true,
        fontStyle: "italic"
      });
      this.raceText = new ChangeAbleText("", style);
      this.raceText.setAnchor(0, 0.5);
      this.add(this.raceText);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(10.6),
        fill: "white",
        align: "center",
        fontStyle: "italic"
      });

      if (this.oddsAlwaysOn) {
        const { fontSize: size, fontFamily: family } = oddsAlwaysOnStyles[this.gameType as keyof typeof oddsAlwaysOnStyles].raceBar.raceId;

        style.fontFamily = family;
        style.fontSize = _s(size);
      }

      const styleRaceId = new PIXI.TextStyle({
        fontFamily: "DIN-LightItalic",
        fontSize: _s(8.6),
        fill: "white",
        align: "center",
        fontStyle: "italic"
      });

      this.raceIdText = Logic.createPixiText(styleRaceId);
      this.raceIdText.anchor.set(1, 0.5);
      if (language === "it") this.add(this.raceIdText);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-LightItalic",
        fontSize: _s(10),
        fill: "black",
        letterSpacing: _s(7),
        align: "center",
        fontStyle: "italic"
      });

      if (this.oddsAlwaysOn) {
        const { letterSpacing: spacing, fontFamily: family } = oddsAlwaysOnStyles[this.gameType as keyof typeof oddsAlwaysOnStyles].raceBar.countDownText;

        style.fontFamily = family;
        style.letterSpacing = _s(spacing);
      }
      this.countDownText = Logic.createPixiText(style, "");
      this.countDownText.anchor.set(0.5, 0.5);
      this.add(this.countDownText);
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-LightItalic",
        fontSize: _s(20),
        fill: "white",
        align: "center",
        trim: true,
        fontStyle: "italic"
      });

      if (this.oddsAlwaysOn) {
        const { fontFamily: family, letterSpacing: spacing } = oddsAlwaysOnStyles[this.gameType as keyof typeof oddsAlwaysOnStyles].raceBar.lapText;
        style.letterSpacing = spacing;
        style.fontFamily = family;
      }

      this.lapText = new ChangeAbleText("", style);
      this.lapText.setAnchor(0, 0.5);
      this.add(this.lapText);
    }

    {
      this.timeText = new ChangeAbleText("");
      this.timeText.setAnchor(0.5, 0.5);
      this.add(this.timeText);
    }

    this.animatedBonus = new AnimatedBonusTopDog(this.gameType, gameLength);
    this.add(this.animatedBonus);

    this.bonusAnnotation = new BonusAnnotationRaceBarDog();
    this.add(this.bonusAnnotation);
  }

  public fill(round: IRoundInfo | undefined, language: string, videoStartUnix?: number) {
    this.raceStart = videoStartUnix;
    if (round) {
      this.animatedBonus.fill(this.gameType, Logic.implementation.getCurrentIntroGameLength(), round, this.oddsAlwaysOn);

      if (language === "it" && round.it_code_event) {
        this.fillRound(Logic.implementation.formatRound(parseInt(round.it_code_event, 10)) + " ", _t("sendPlanPre") + " " + round.it_code_schedule);
      } else {
        this.fillRound(Logic.implementation.formatRound(round.gameId) + " ", _t("sendPlanPre") + " " + round.sendPlan);
      }
    } else {
      this.fillRound("", "");
    }

    this.anims = [{ startTime: 1.0, duration: Logic.getRaceEndTime() - 2 }];

    this.anims = this.addBreak(this.anims, Logic.getIntroLength() + 30.2, 2.2);
    this.anims = this.addBreak(this.anims, Logic.getIntroLength() + 38.0, 2.2);
  }

  private fillRound(round: string, raceId: string) {
    this.raceText.setText(round ? _t("race") : "");
    Logic.autoSize(this.raceText.pixiText, _s(45));

    this.raceIdText.text = raceId; // _t("sendPlanPre") + " " + round.sendPlan;
    this.lapText.setText(round); // Logic.implementation.formatRound(round.gameId) + " "

    const style = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(20),
      fill: "white",
      trim: true,
      fontStyle: "italic"
    });

    this.timeText.setStyle(style);
    this.countDownText.text = round ? _t("countdown") : "";
    this.updateLayout();
  }

  public fillRace(result: IResult, forceBreakTimings?: number[]) {
    if (result.clockEndTime) {
      this.totalRaceTime = result.clockEndTime;
    } else {
      this.totalRaceTime = 0;
    }

    this.bonusAnnotation.fill(result.roundBonusType);
    this.updateLayout();

    if (this.anims.length === 0) {
      this.anims = [{ startTime: 1.0, duration: Logic.getRaceEndTime() - 2 }];

      this.anims = this.addBreak(this.anims, Logic.getIntroLength() + 30.2, 2.2);
      this.anims = this.addBreak(this.anims, Logic.getIntroLength() + 38.0, 2.2);
    }

    if (forceBreakTimings) {
      // setup the anims new
      this.anims = [{ startTime: 1.0, duration: Logic.getRaceEndTime() - 2 }];
      if (forceBreakTimings) {
        for (const timing of forceBreakTimings) {
          this.anims = this.addBreak(this.anims, Logic.getIntroLength() + timing, 2.2);
        }
      }
    }
  }

  private addBreak(anims: IAnimInterval[], breakTime: number, breakLength: number): IAnimInterval[] {
    let animIndex = -1;

    for (let i = 0; i < anims.length; i++) {
      const a = anims[i];
      const aStart = a.startTime;
      const aEnd = a.startTime + a.duration;

      if (aStart < breakTime && aEnd > breakTime) {
        animIndex = i;
        break;
      }
    }

    if (animIndex === -1) {
      Logger.warn(`No anim found to break at time ${breakTime}. Skipping break.`);
      return anims;
    }

    const original = anims[animIndex];
    const preDuration = breakTime - original.startTime;
    const postStart = breakTime + breakLength;
    const postDuration = original.startTime + original.duration - postStart;

    if (preDuration < 0.05 || postDuration < 0.05) {
      Logger.warn(`Break at ${breakTime} creates too small segment(s). Skipped. Pre: ${preDuration}, Post: ${postDuration}`);
      return anims;
    }

    anims[animIndex].duration = preDuration;

    anims.splice(animIndex + 1, 0, {
      startTime: postStart,
      duration: postDuration
    });

    return anims;
  }

  public onLayout() {
    const posY = this.language === "it" ? 24 : 21;
    this.raceText.position.x = _s(-30);
    this.raceText.position.y = _s(posY);

    this.raceIdText.position.x = _s(68);
    this.raceIdText.position.y = _s(10);

    this.lapText.position.x = _s(24);
    this.lapText.position.y = _s(posY);

    this.timeText.position.x = _s(140);
    this.timeText.position.y = _s(21);

    this.animatedBonus.x = _s(0);
    this.animatedBonus.y = _s(58);

    // this.countDownText.x = _s(-32);
    this.countDownText.x = _s(32);
    this.countDownText.y = _s(50);

    this.bonusAnnotation.width = _s(55);
    this.bonusAnnotation.height = _s(35);
    this.bonusAnnotation.x = _s(-38) - this.bonusAnnotation.width;
    this.bonusAnnotation.y = _s(4);

    Logic.autoSize(this.countDownText, _s(130));

    if (this.oddsAlwaysOn) {
      const { x: raceIdX, y: raceIdY } = raceBarSettings[this.gameType as keyof typeof raceBarSettings].raceIdText;
      const { x: raceTextX, y: raceTextY } = raceBarSettings[this.gameType as keyof typeof raceBarSettings].raceText;
      const { x: lapTextX, y: lapTextY } = raceBarSettings[this.gameType as keyof typeof raceBarSettings].lapText;
      const { x: timeTextX, y: timeTextY } = raceBarSettings[this.gameType as keyof typeof raceBarSettings].timeText;

      if (Logic.getState() !== VideoState.Race) {
        const { fontSize: size } = oddsAlwaysOnStyles[this.gameType as keyof typeof oddsAlwaysOnStyles].raceBar.raceId;

        this.raceIdText.style.fontSize = _s(size);
        this.raceIdText.position.x = _s(raceIdX);
        this.raceIdText.position.y = _s(raceIdY);
      }

      this.timeText.position.x = _s(timeTextX);
      this.timeText.position.y = _s(timeTextY);

      this.raceText.position.x = _s(raceTextX);
      this.raceText.position.y = _s(raceTextY);

      this.lapText.position.x = _s(lapTextX);
      this.lapText.position.y = _s(lapTextY);

      Logic.autoSize(this.countDownText, _s(140));
    }
  }

  public update(dt: number) {
    const raceEndTime = Logic.getRaceLength() + Logic.getIntroLength();
    super.update(dt);
    this.showDebugTime("RaceBar", Logic.getVideoTime());
    if (this.forPauseOverlay) {
      this.lapText.alpha = 1.0;
      this.timeText.alpha = 1.0;
      this.raceText.alpha = 1.0;
      this.raceIdText.alpha = 1.0;
      this.countDownText.alpha = 1.0;
      this.animatedBonus.alpha = 0.0;
      this.setTimeUntilRace(10.23);
    } else {
      const introLength = Logic.getIntroLength();
      let t = Logic.getVideoTime();
      if (!Number.isFinite(t)) {
        Logger.error("Invalid Logic.getVideoTime():", t);
        Logic.implementation.reloadWindow();
      }
      if (Logic.isFading && Logic.fadeTarget === VideoState.Race) {
        t = introLength;
      }
      const anim = Logic.getAnim(t, this.anims, this);
      if (!anim) return;

      if (anim === this.anims[this.anims.length - 1]) anim.duration = raceEndTime - anim.startTime - 1;
      if (Logic.getRaceEndTime() !== raceEndTime)
        Logger.error("RaceEndTime is false: Maybe time or logo bar is not shown! Race End Correct: " + raceEndTime + ", Logic.getRaceEndTime():" + Logic.getRaceEndTime());

      const baseFactor = t - anim.startTime;

      if (baseFactor >= anim.duration) {
        const f1 = AnimHelper.easeOut(AnimHelper.limit(baseFactor, anim.duration) * 4, 5);
        this.lapText.alpha = f1;
        this.timeText.alpha = f1;
        this.raceText.alpha = f1;
        // this.timeUntilText.alpha = f1;
        this.countDownText.alpha = 0;
        this.animatedBonus.alpha = 0;

        this.raceIdText.alpha = f1;
      } else {
        const f1 = AnimHelper.easeOut(baseFactor, 5);
        const f2 = AnimHelper.easeOut(baseFactor - 0.5, 5);
        this.lapText.position.x = _s(23 * f1);
        this.lapText.alpha = f1;
        this.raceText.alpha = f1;
        this.raceIdText.alpha = f1;
        this.timeText.alpha = f1;

        if (t < introLength - FadeDurations.fadeDuration) {
          /*if (this.raceStart && this.gameType === "dog6") this.setTimeUntilRaceNEW(Logic.getExactTimeUntilRace(this.raceStart));
          else this.setTimeUntilRace(Logic.getTimeUntilRaceForTimeBar() - Logic.getVideoTime()); // INTRO_VIDEO_LENGTH*/
          this.setTimeUntilRace(Logic.getTimeUntilRaceForTimeBar() - Logic.getVideoTime()); // INTRO_VIDEO_LENGTH
        } else {
          this.setTimeUntilRace(Math.min(Logic.getInGameRaceTime(this.gameType), this.totalRaceTime + 0.001));
        }

        const fadeX = Logic.fadeX;
        const fadeVisible = Logic.isInIntro() && fadeX < 0.6 ? 1 : 0;

        this.animatedBonus.alpha = f2 * fadeVisible;
        this.countDownText.alpha = f1 * fadeVisible;

        this.updateOaoRaceId(fadeX, f1);
      }
    }
  }

  private updateOaoRaceId(fadeX: number, f1: number) {
    if (!this.oddsAlwaysOn || this.language !== "it") return;

    if (Logic.getRaceVideoTime() > 3) {
      this.raceIdText.alpha = f1;
      return;
    }

    if (Logic.isFading && Logic.fadeTime >= 1.3) {
      this.raceIdText.position.x = _s(68);
      this.raceIdText.position.y = _s(9);
      this.raceIdText.style.fontSize = _s(10);
      Logic.autoSize(this.raceIdText, _s(95));
    }

    if (Logic.isInIntro() && fadeX < 0.6 ? 1 : 0) {
      this.raceIdText.alpha = 1;
    }
  }

  public setTimeUntilRace(timeUntilRace: number) {
    this.timeText.setText(Logic.implementation.formatTime(timeUntilRace));
  }
}
