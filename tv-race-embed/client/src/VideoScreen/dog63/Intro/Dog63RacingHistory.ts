import * as PIXI from "pixi.js";
import { Dog63RacingHistoryRow } from "./Dog63RacingHistoryRow";
import { oddsAlwaysOnRaceHistoryTimings } from "../../../../settings/OddsAlwaysOnSettings";
import { Dog63Helper } from "../Dog63Helper";
import { Group } from "client/Graphics/Group";
import { _s, _t, Logic, settings } from "client/Logic/Logic";
import { IAnimInterval, IDog63RoundHistory, IDriver } from "client/Logic/LogicDefinitions";
import { DiagonalFadeHelper } from "client/VideoScreen/common/DiagonalFadeHelper";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
//import { BonusAnnotationDog } from "./BonusAnnotationDog";
import { GameLength, GameType } from "common/Definitions";

export class Dog63RacingHistory extends Group {
  private titleText: PIXI.Text;
  // private rows: RowItem[] = [];
  private anims: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number })[] = [];
  private gameType: GameType;
  private gameLength: GameLength;
  private language: string;
  private oddsAlwaysOn;

  private rows: Dog63RacingHistoryRow[] = [];

  public constructor(gameType: GameType, gameLength: GameLength, language: string, oddsAlwaysOn = false) {
    super();

    this.gameType = gameType;
    this.gameLength = gameLength;
    this.language = language;
    this.oddsAlwaysOn = oddsAlwaysOn;

    this.showDebug(settings.debug, undefined, "RacingHistory");

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Medium",
        fontSize: _s(22),
        fill: Dog63Helper.getWhiteColor(),
        align: "center",
        letterSpacing: _s(0.25)
      });
      this.titleText = Logic.createPixiText(style);
      this.titleText.roundPixels = true;
      this.add(this.titleText);
    }

    for (let i = 0; i < 5; i++) {
      const row = new Dog63RacingHistoryRow(gameType, gameLength);
      this.rows.push(row);
      this.add(row);
    }
  }

  public createAnims(): IAnimInterval[] {
    if (this.oddsAlwaysOn) {
      return oddsAlwaysOnRaceHistoryTimings.dog63[300];
    }
    {
      return [this.language === "it" ? { startTime: 15.9, duration: 17.8 } : { startTime: 0.5, duration: 33 }, { startTime: 137.9, duration: 17.4 }];
    }
  }

  public fill(history: IDog63RoundHistory[], drivers: IDriver[], withBonus: boolean): void {
    this.anims = this.createAnims();
    for (let i = 0; i < Math.min(history.length, this.rows.length); i++) {
      this.rows[i].fill(history[i], drivers, withBonus);
    }

    this.titleText.text = _t("raceHistory");
    this.titleText.x = _s(70);
    this.titleText.y = _s(12);
  }

  public onLayout(): void {
    for (let i = 0; i < this.rows.length; i++) {
      LayoutHelper.setScaledRectangle(this.rows[i], 0, 39.5 + 82.82 * i, 1063, 82);
    }
  }

  public update(dt: number): void {
    super.update(dt);

    const time = Logic.getVideoTime();
    const anim = Logic.getAnim(time, this.anims, this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;

    let baseFactor = time - anim.startTime;
    //this.visible = baseFactor >= 0 && baseFactor < anim.duration;

    this.showDebugTime("RacingHistory", baseFactor);

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < this.rows.length; i++) {
      this.rows[i].updateAnims(baseFactor);
    }

    DiagonalFadeHelper.FadeDiagonal(this, baseFactor, anim.duration, 2, 0.5, 2, Logic.videoScreen.width, Logic.videoScreen.height);

    if (baseFactor >= anim.duration - 1.5) {
      baseFactor = -0 - (baseFactor - anim.duration);
      const sf = anim.fadeOutFactor ? anim.fadeOutFactor : 1.0;
      let rowIndex = 0;
      for (const row of this.rows) {
        row.bonusAnnotation.alpha = ff(rowIndex, 0, 0, baseFactor, sf);
        rowIndex++;
      }
    } else {
      const sf = 0.4;
      let rowIndex = 0;
      for (const row of this.rows) {
        row.bonusAnnotation.alpha = ff2(rowIndex, 0, 0, baseFactor, sf);
        rowIndex++;
      }
    }
  }
}

function ff(row: number, subRow: number, col: number, baseFactor: number, sf: number) {
  return (baseFactor - (row * 2 + subRow) * 0.08 * sf - col * 0.05 * sf) * 3;
}

function ff2(row: number, subRow: number, col: number, baseFactor: number, sf: number) {
  return (baseFactor - 0.44 - (row * 2 + subRow) * 0.14 * sf - col * 0.06 * sf) * 3;
}
