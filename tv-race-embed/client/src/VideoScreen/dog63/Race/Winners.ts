import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IDriver, IAnimInterval, IDog63QuoteInfo } from "client/Logic/LogicDefinitions";
//import { BonusAnnotationDog } from "./BonusAnnotationDog";

import { GameType, GameLength } from "common/Definitions";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { WinnerDog1 } from "./WinnerDog1";
import { WinnerDog2 } from "./WinnerDog2";
import { WinnerDog3 } from "./WinnerDog3";
import { WinnerAccoppiattaPiazzata } from "./WinnerAccopiattaPiazzata";
import { WinnerAccoppiatta } from "./WinnerAccoppiata";
import { WinnerTrio } from "./WinnerTrio";
import { WinnerBottom } from "./WinnerBottom";
import { Dog63QuotesHelper } from "client/LogicImplementation/Dog63Quotes";
import { IAccoppiataNoOrderThree } from "client/LogicImplementation/GamesModel";

export class Winners extends Group {
  private anims: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number })[] = [];
  private gameType: GameType;
  private gameLength: GameLength;

  private dog1: WinnerDog1;
  private dog2: WinnerDog2;
  private dog3: WinnerDog3;
  private accopiattaPiazzata: WinnerAccoppiattaPiazzata;
  private accopiatta: WinnerAccoppiatta;
  private trio: WinnerTrio;
  private bottom: WinnerBottom;

  public constructor(gameType: GameType, gameLength: GameLength) {
    super();

    this.gameType = gameType;
    this.gameLength = gameLength;

    this.showDebug(settings.debug, undefined, "Winners");

    this.dog1 = new WinnerDog1(gameType, gameLength);
    this.add(this.dog1);
    this.dog2 = new WinnerDog2(gameType, gameLength);
    this.add(this.dog2);
    this.dog3 = new WinnerDog3(gameType, gameLength);
    this.add(this.dog3);
    this.accopiattaPiazzata = new WinnerAccoppiattaPiazzata(gameType, gameLength);
    this.add(this.accopiattaPiazzata);
    this.accopiatta = new WinnerAccoppiatta(gameType, gameLength);
    this.add(this.accopiatta);
    this.trio = new WinnerTrio(gameType, gameLength);
    this.add(this.trio);
    this.bottom = new WinnerBottom(gameType, gameLength);
    this.add(this.bottom);
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean): IAnimInterval[] {
    {
      return [{ startTime: 40, duration: 65.8 }];
    }
  }

  public fill(
    withBonus: boolean,
    drivers: IDriver[],
    winners: number[],
    driverTimes: string[],
    quotes: IDog63QuoteInfo[][],
    odds: number[],
    firstIndex: number,
    secondIndex: number,
    thirdIndex: number
  ): void {
    this.anims = this.createAnims(this.gameType, Logic.implementation.getGameInfo().gameLength, withBonus);

    const winner1 = winners[0];
    this.dog1.fill(withBonus, winner1 + 1, drivers[winner1], driverTimes[0], quotes[0]);
    const winner2 = winners[1];
    this.dog2.fill(withBonus, winner2 + 1, drivers[winner2], driverTimes[1], quotes[1]);
    const winner3 = winners[2];
    this.dog3.fill(withBonus, winner3 + 1, drivers[winner3], driverTimes[2], quotes[2]);

    const dog63Odds = new Dog63QuotesHelper(odds);
    const accopiata: IAccoppiataNoOrderThree[] = dog63Odds.getTwoInThreeNotInOrder(firstIndex, secondIndex, thirdIndex);
    const oddEven = dog63Odds.getOddEven(firstIndex);
    const heightLow = dog63Odds.getHeighLow(firstIndex);

    this.accopiattaPiazzata.fill(
      withBonus,
      drivers,
      [accopiata[0].firstDriverIndex, accopiata[0].secondDriverIndex, accopiata[1].firstDriverIndex, accopiata[1].secondDriverIndex, accopiata[2].firstDriverIndex, accopiata[2].secondDriverIndex],
      [
        { quote: accopiata[0].quote, betCodeId: accopiata[0].betCodeId },
        { quote: accopiata[1].quote, betCodeId: accopiata[1].betCodeId },
        { quote: accopiata[2].quote, betCodeId: accopiata[2].betCodeId }
      ]
    );
    this.accopiatta.fill(
      withBonus,
      drivers,
      [firstIndex, secondIndex, secondIndex, firstIndex],
      [dog63Odds.getForcastOddWithBetCode(firstIndex, secondIndex), dog63Odds.getFirstTwoNotInOrderWithBetCodeid(firstIndex, secondIndex)]
    );
    this.trio.fill(
      [
        [firstIndex, secondIndex, thirdIndex],
        [thirdIndex, secondIndex, firstIndex]
      ],
      drivers,
      [dog63Odds.getTrioInOrderWithBetCodeId(firstIndex, secondIndex, thirdIndex), dog63Odds.getTrioNotInOrderWidthBetCodeId(firstIndex, secondIndex, thirdIndex)],
      withBonus
    );
    this.bottom.fill(
      withBonus,
      [firstIndex + 1 + secondIndex + 1, firstIndex + 1 + secondIndex + 1 + thirdIndex + 1],
      [
        { quote: oddEven.quote, betCodeId: 9 },
        { quote: heightLow.quote, betCodeId: 8 },
        { quote: dog63Odds.getQuotaSumTwo(firstIndex + 1 + (secondIndex + 1)), betCodeId: 12 },
        { quote: dog63Odds.getQuotaSumThree(firstIndex + 1 + (secondIndex + 1) + (thirdIndex + 1)), betCodeId: 11 }
      ],
      oddEven.text,
      heightLow.text
    );
  }

  public onLayout(): void {
    LayoutHelper.setScaledRectangle(this.dog1, 764, 132, 488, 217);
    LayoutHelper.setScaledRectangle(this.dog2, 372, 52, 417, 185);
    LayoutHelper.setScaledRectangle(this.dog3, 69, 256, 361, 152);
    LayoutHelper.setScaledRectangle(this.accopiattaPiazzata, 62, 506, 285, 86);
    LayoutHelper.setScaledRectangle(this.accopiatta, 364, 442, 333, 152);
    LayoutHelper.setScaledRectangle(this.trio, 701, 442, 332, 151);
    LayoutHelper.setScaledRectangle(this.bottom, 497, 628, 737, 67);
  }

  public update(dt: number): void {
    super.update(dt);

    const time = Logic.getRaceVideoTime();
    const anim = Logic.getAnim(time, this.anims, this);
    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;

    const baseFactor = time - anim.startTime;
    this.showDebugTime("Winners", baseFactor);
    //this.visible = baseFactor >= 0 && baseFactor <= anim.duration;
    this.accopiatta.updateAnim(baseFactor, anim.duration);
    this.accopiattaPiazzata.updateAnim(baseFactor, anim.duration);
    this.trio.updateAnim(baseFactor, anim.duration);
    this.bottom.updateAnim(baseFactor, anim.duration);
    this.dog1.updateAnim(baseFactor, anim.duration);
    this.dog2.updateAnim(baseFactor, anim.duration);
    this.dog3.updateAnim(baseFactor, anim.duration);
  }
}
