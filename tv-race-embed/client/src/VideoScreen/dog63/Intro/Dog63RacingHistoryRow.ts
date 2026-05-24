import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IAnimInterval, IDog63RoundHistory } from "client/Logic/LogicDefinitions";
//import { BonusAnnotationDog } from "./BonusAnnotationDog";
import { GameType, GameLength } from "common/Definitions";
import { Dog63Placement } from "./RacingHistory/Dog63Placement";
import { Dog63P2P3 } from "./RacingHistory/Dog63P2P3";
import { Dog63Accopiata } from "./RacingHistory/Dog63Accopiata";
import { Dog63Trio } from "./RacingHistory/Dog63Trio";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { Dog63Helper } from "../Dog63Helper";
import { BonusAnnotationDog } from "client/VideoScreen/dog/BonusAnnotationDog";

export class Dog63RacingHistoryRow extends Group {
  private raceText: PIXI.Text;
  private raceNumber: PIXI.Text;

  private placement: Dog63Placement[] = [];
  private p2p3: Dog63P2P3[] = [];
  private accopiata: Dog63Accopiata;
  private trio: Dog63Trio;
  public bonusAnnotation: BonusAnnotationDog;
  // private rows: RowItem[] = [];
  private anims: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number })[] = [];
  private gameType: GameType;
  private gameLength: GameLength;

  public constructor(gameType: GameType, gameLength: GameLength) {
    super();

    this.gameType = gameType;
    this.gameLength = gameLength;

    this.showDebug(settings.debug, undefined, "RacingHistoryRow");

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(11),
        fill: Dog63Helper.getWhiteColor(),
        align: "right",
        letterSpacing: _s(0)
      });
      this.raceText = Logic.createPixiText(style);
      this.raceText.anchor.set(1, 0);
      this.raceText.alpha = 0.7; // 70% deckkraft
      //this.titleText.roundPixels = true;
      this.add(this.raceText);
    }

    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Light",
        fontSize: _s(17),
        fill: Dog63Helper.getWhiteColor(),
        align: "right"
      });
      this.raceNumber = Logic.createPixiText(style);
      this.raceNumber.anchor.set(1, 0);
      this.raceNumber.alpha = 0.7; // 70% deckkraft?
      //this.titleText.roundPixels = true;
      this.add(this.raceNumber);
    }

    for (let i = 0; i < 3; i++) {
      const placement = new Dog63Placement();
      this.placement.push(placement);
      this.add(placement);
    }
    for (let i = 0; i < 3; i++) {
      const p2p3 = new Dog63P2P3(i < 2);
      this.p2p3.push(p2p3);
      this.add(p2p3);
    }

    this.accopiata = new Dog63Accopiata();
    this.add(this.accopiata);

    this.trio = new Dog63Trio();
    this.add(this.trio);

    this.bonusAnnotation = new BonusAnnotationDog();
    this.add(this.bonusAnnotation);
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean): IAnimInterval[] {
    return [{ startTime: 0, duration: 10 }];
  }

  public fill(row: IDog63RoundHistory, drivers: IDriver[], withBonus: boolean): void {
    this.anims = this.createAnims(this.gameType, Logic.implementation.getCurrentIntroGameLength(), withBonus);

    this.raceText.text = _t("race");
    const formattedRound = row.round.toString(10).padStart(4, "0");
    this.raceNumber.text = formattedRound;
    for (let i = 0; i < 3; i++) {
      this.placement[i].fill(row.drivers[i], drivers);
      this.p2p3[i].fill(row.p2p3[i]);
      this.accopiata.fill(row.accoppiata, drivers);
      this.trio.fill(row);
    }

    Logic.autoSize(this.raceText, _s(35));

    this.bonusAnnotation.fill(row.roundBonusType);
    this.bonusAnnotation.visible = row.roundBonusType !== undefined;
  }

  public onLayout(): void {
    this.raceText.x = _s(51);
    this.raceText.y = _s(7);

    this.raceNumber.x = _s(49.5);
    this.raceNumber.y = _s(19);

    this.bonusAnnotation.x = _s(-2);
    this.bonusAnnotation.y = _s(-6);

    const placementXSpacing = 11;
    const p2p3XSpacing = 11.5;
    for (let i = 0; i < 3; i++) {
      LayoutHelper.setScaledRectangle(this.placement[i], 78 + (34 + placementXSpacing) * i, 8, 34, 76);
      LayoutHelper.setScaledRectangle(this.p2p3[i], 221 + (110 + p2p3XSpacing) * i, 15, 110, 60);
    }
    LayoutHelper.setScaledRectangle(this.accopiata, 588, 15, 219, 56);
    LayoutHelper.setScaledRectangle(this.trio, 834, 0, 219, 76);
  }

  public updateAnims(time: number): void {}
}
