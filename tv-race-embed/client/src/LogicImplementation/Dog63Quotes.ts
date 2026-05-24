import { GamesModel, IAccoppiataNoOrderThree } from "client/LogicImplementation/GamesModel";
import { Languages } from "client/LogicImplementation/Localisation";
import { IDog63QuoteInfo } from "client/Logic/LogicDefinitions";

export class Dog63QuotesHelper {
  private serverOdds: number[] = [];

  constructor(odds: number[]) {
    this.serverOdds = odds;
  }

  public getForcastOdd(winIndex: number, secondIndex: number): number {
    let odd: number = 0.0;
    let countSec = GamesModel.RASTER_SIZE;

    for (let i = 0; i < GamesModel.RASTER_SIZE; i++) {
      for (let n = 0; n < GamesModel.RASTER_SIZE; n++) {
        if (i === n) {
          // winbet
          continue;
        }

        if (i === winIndex && n === secondIndex) {
          odd = this.serverOdds[countSec];
          break;
        }
        countSec++;
      }
    }

    return odd;
  }

  public getForcastOddWithBetCode(winIndex: number, secondIndex: number): IDog63QuoteInfo {
    return { quote: this.getForcastOdd(winIndex, secondIndex), betCodeId: 2 };
  }

  public getSecondOdd(secondIndex: number): number {
    let odd: number = 0.0;

    odd = this.serverOdds[241 + secondIndex];

    return odd;
  }
  public getSecondOddWithBetCodeId(secondIndex: number): IDog63QuoteInfo {
    return { quote: this.getSecondOdd(secondIndex), betCodeId: 13 };
  }
  public getThirdOdd(thirdIndex: number): number {
    let odd: number = 0.0;

    odd = this.serverOdds[247 + thirdIndex];

    return odd;
  }
  public getThirdOddWithBetCodeId(secondIndex: number): IDog63QuoteInfo {
    return { quote: this.getThirdOdd(secondIndex), betCodeId: 14 };
  }
  public getInFirstTwo(driverIndex: number): number {
    return this.serverOdds[36 + driverIndex];
  }
  public getInFirstTwoWithBetId(driverIndex: number): IDog63QuoteInfo {
    return { quote: this.getInFirstTwo(driverIndex), betCodeId: 3 };
  }
  public getInFirstThree(driverIndex: number): number {
    return this.serverOdds[42 + driverIndex];
  }
  public getInFirstThreeWithBetId(driverIndex: number): IDog63QuoteInfo {
    return { quote: this.getInFirstThree(driverIndex), betCodeId: 4 };
  }
  public getFirstTwoNotInOrder(firstIndex: number, secondIndex: number): number {
    let odd: number = 0.0;

    if ((firstIndex === 0 && secondIndex === 1) || (firstIndex === 1 && secondIndex === 0)) {
      odd = this.serverOdds[48];
    } else if ((firstIndex === 0 && secondIndex === 2) || (firstIndex === 2 && secondIndex === 0)) {
      odd = this.serverOdds[49];
    } else if ((firstIndex === 0 && secondIndex === 3) || (firstIndex === 3 && secondIndex === 0)) {
      odd = this.serverOdds[50];
    } else if ((firstIndex === 0 && secondIndex === 4) || (firstIndex === 4 && secondIndex === 0)) {
      odd = this.serverOdds[51];
    } else if ((firstIndex === 0 && secondIndex === 5) || (firstIndex === 5 && secondIndex === 0)) {
      odd = this.serverOdds[52];
    } else if ((firstIndex === 1 && secondIndex === 2) || (firstIndex === 2 && secondIndex === 1)) {
      odd = this.serverOdds[53];
    } else if ((firstIndex === 1 && secondIndex === 3) || (firstIndex === 3 && secondIndex === 1)) {
      odd = this.serverOdds[54];
    } else if ((firstIndex === 1 && secondIndex === 4) || (firstIndex === 4 && secondIndex === 1)) {
      odd = this.serverOdds[55];
    } else if ((firstIndex === 1 && secondIndex === 5) || (firstIndex === 5 && secondIndex === 1)) {
      odd = this.serverOdds[56];
    } else if ((firstIndex === 2 && secondIndex === 3) || (firstIndex === 3 && secondIndex === 2)) {
      odd = this.serverOdds[57];
    } else if ((firstIndex === 2 && secondIndex === 4) || (firstIndex === 4 && secondIndex === 2)) {
      odd = this.serverOdds[58];
    } else if ((firstIndex === 2 && secondIndex === 5) || (firstIndex === 5 && secondIndex === 2)) {
      odd = this.serverOdds[59];
    } else if ((firstIndex === 3 && secondIndex === 4) || (firstIndex === 4 && secondIndex === 3)) {
      odd = this.serverOdds[60];
    } else if ((firstIndex === 3 && secondIndex === 5) || (firstIndex === 5 && secondIndex === 3)) {
      odd = this.serverOdds[61];
    } else if ((firstIndex === 4 && secondIndex === 5) || (firstIndex === 5 && secondIndex === 4)) {
      odd = this.serverOdds[62];
    }

    return odd;
  }

  public getFirstTwoNotInOrderWithBetCodeid(firstIndex: number, secondIndex: number): IDog63QuoteInfo {
    return { quote: this.getFirstTwoNotInOrder(firstIndex, secondIndex), betCodeId: 5 };
  }

  public getTwoInThreeNotInOrder(firstIndex: number, secondIndex: number, thirdIndex: number): IAccoppiataNoOrderThree[] {
    const accoppiataList: IAccoppiataNoOrderThree[] = [];

    if ((firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) && (firstIndex === 1 || secondIndex === 1 || thirdIndex === 1)) {
      accoppiataList.push({ firstDriverIndex: 0, secondDriverIndex: 1, quote: this.serverOdds[207], betCodeId: 10 });
    }
    if ((firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) && (firstIndex === 2 || secondIndex === 2 || thirdIndex === 2)) {
      accoppiataList.push({ firstDriverIndex: 0, secondDriverIndex: 2, quote: this.serverOdds[208], betCodeId: 10 });
    }
    if ((firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) && (firstIndex === 3 || secondIndex === 3 || thirdIndex === 3)) {
      accoppiataList.push({ firstDriverIndex: 0, secondDriverIndex: 3, quote: this.serverOdds[209], betCodeId: 10 });
    }
    if ((firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) && (firstIndex === 4 || secondIndex === 4 || thirdIndex === 4)) {
      accoppiataList.push({ firstDriverIndex: 0, secondDriverIndex: 4, quote: this.serverOdds[210], betCodeId: 10 });
    }
    if ((firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) && (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)) {
      accoppiataList.push({ firstDriverIndex: 0, secondDriverIndex: 5, quote: this.serverOdds[211], betCodeId: 10 });
    }

    if ((firstIndex === 1 || secondIndex === 1 || thirdIndex === 1) && (firstIndex === 2 || secondIndex === 2 || thirdIndex === 2)) {
      accoppiataList.push({ firstDriverIndex: 1, secondDriverIndex: 2, quote: this.serverOdds[212], betCodeId: 10 });
    }
    if ((firstIndex === 1 || secondIndex === 1 || thirdIndex === 1) && (firstIndex === 3 || secondIndex === 3 || thirdIndex === 3)) {
      accoppiataList.push({ firstDriverIndex: 1, secondDriverIndex: 3, quote: this.serverOdds[213], betCodeId: 10 });
    }
    if ((firstIndex === 1 || secondIndex === 1 || thirdIndex === 1) && (firstIndex === 4 || secondIndex === 4 || thirdIndex === 4)) {
      accoppiataList.push({ firstDriverIndex: 1, secondDriverIndex: 4, quote: this.serverOdds[214], betCodeId: 10 });
    }
    if ((firstIndex === 1 || secondIndex === 1 || thirdIndex === 1) && (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)) {
      accoppiataList.push({ firstDriverIndex: 1, secondDriverIndex: 5, quote: this.serverOdds[215], betCodeId: 10 });
    }
    if ((firstIndex === 2 || secondIndex === 2 || thirdIndex === 2) && (firstIndex === 3 || secondIndex === 3 || thirdIndex === 3)) {
      accoppiataList.push({ firstDriverIndex: 2, secondDriverIndex: 3, quote: this.serverOdds[216], betCodeId: 10 });
    }
    if ((firstIndex === 2 || secondIndex === 2 || thirdIndex === 2) && (firstIndex === 4 || secondIndex === 4 || thirdIndex === 4)) {
      accoppiataList.push({ firstDriverIndex: 2, secondDriverIndex: 4, quote: this.serverOdds[217], betCodeId: 10 });
    }
    if ((firstIndex === 2 || secondIndex === 2 || thirdIndex === 2) && (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)) {
      accoppiataList.push({ firstDriverIndex: 2, secondDriverIndex: 5, quote: this.serverOdds[218], betCodeId: 10 });
    }
    if ((firstIndex === 3 || secondIndex === 3 || thirdIndex === 3) && (firstIndex === 4 || secondIndex === 4 || thirdIndex === 4)) {
      accoppiataList.push({ firstDriverIndex: 3, secondDriverIndex: 4, quote: this.serverOdds[219], betCodeId: 10 });
    }
    if ((firstIndex === 3 || secondIndex === 3 || thirdIndex === 3) && (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)) {
      accoppiataList.push({ firstDriverIndex: 3, secondDriverIndex: 5, quote: this.serverOdds[220], betCodeId: 10 });
    }
    if ((firstIndex === 4 || secondIndex === 4 || thirdIndex === 4) && (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)) {
      accoppiataList.push({ firstDriverIndex: 4, secondDriverIndex: 5, quote: this.serverOdds[221], betCodeId: 10 });
    }

    return accoppiataList;
  }

  public getTrioNotInOrder(firstIndex: number, secondIndex: number, thirdIndex: number): number {
    let odd: number = 0.0;

    if ((firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) && (firstIndex === 1 || secondIndex === 1 || thirdIndex === 1) && (firstIndex === 2 || secondIndex === 2 || thirdIndex === 2)) {
      odd = this.serverOdds[183];
    } else if (
      (firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) &&
      (firstIndex === 1 || secondIndex === 1 || thirdIndex === 1) &&
      (firstIndex === 3 || secondIndex === 3 || thirdIndex === 3)
    ) {
      odd = this.serverOdds[184];
    } else if (
      (firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) &&
      (firstIndex === 1 || secondIndex === 1 || thirdIndex === 1) &&
      (firstIndex === 4 || secondIndex === 4 || thirdIndex === 4)
    ) {
      odd = this.serverOdds[185];
    } else if (
      (firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) &&
      (firstIndex === 1 || secondIndex === 1 || thirdIndex === 1) &&
      (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)
    ) {
      odd = this.serverOdds[186];
    } else if (
      (firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) &&
      (firstIndex === 2 || secondIndex === 2 || thirdIndex === 2) &&
      (firstIndex === 3 || secondIndex === 3 || thirdIndex === 3)
    ) {
      odd = this.serverOdds[187];
    } else if (
      (firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) &&
      (firstIndex === 2 || secondIndex === 2 || thirdIndex === 2) &&
      (firstIndex === 4 || secondIndex === 4 || thirdIndex === 4)
    ) {
      odd = this.serverOdds[188];
    } else if (
      (firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) &&
      (firstIndex === 2 || secondIndex === 2 || thirdIndex === 2) &&
      (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)
    ) {
      odd = this.serverOdds[189];
    } else if (
      (firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) &&
      (firstIndex === 3 || secondIndex === 3 || thirdIndex === 3) &&
      (firstIndex === 4 || secondIndex === 4 || thirdIndex === 4)
    ) {
      odd = this.serverOdds[190];
    } else if (
      (firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) &&
      (firstIndex === 3 || secondIndex === 3 || thirdIndex === 3) &&
      (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)
    ) {
      odd = this.serverOdds[191];
    } else if (
      (firstIndex === 0 || secondIndex === 0 || thirdIndex === 0) &&
      (firstIndex === 4 || secondIndex === 4 || thirdIndex === 4) &&
      (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)
    ) {
      odd = this.serverOdds[192];
    } else if (
      (firstIndex === 1 || secondIndex === 1 || thirdIndex === 1) &&
      (firstIndex === 2 || secondIndex === 2 || thirdIndex === 2) &&
      (firstIndex === 3 || secondIndex === 3 || thirdIndex === 3)
    ) {
      odd = this.serverOdds[193];
    } else if (
      (firstIndex === 1 || secondIndex === 1 || thirdIndex === 1) &&
      (firstIndex === 2 || secondIndex === 2 || thirdIndex === 2) &&
      (firstIndex === 4 || secondIndex === 4 || thirdIndex === 4)
    ) {
      odd = this.serverOdds[194];
    } else if (
      (firstIndex === 1 || secondIndex === 1 || thirdIndex === 1) &&
      (firstIndex === 2 || secondIndex === 2 || thirdIndex === 2) &&
      (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)
    ) {
      odd = this.serverOdds[195];
    } else if (
      (firstIndex === 1 || secondIndex === 1 || thirdIndex === 1) &&
      (firstIndex === 3 || secondIndex === 3 || thirdIndex === 3) &&
      (firstIndex === 4 || secondIndex === 4 || thirdIndex === 4)
    ) {
      odd = this.serverOdds[196];
    } else if (
      (firstIndex === 1 || secondIndex === 1 || thirdIndex === 1) &&
      (firstIndex === 3 || secondIndex === 3 || thirdIndex === 3) &&
      (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)
    ) {
      odd = this.serverOdds[197];
    } else if (
      (firstIndex === 1 || secondIndex === 1 || thirdIndex === 1) &&
      (firstIndex === 4 || secondIndex === 4 || thirdIndex === 4) &&
      (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)
    ) {
      odd = this.serverOdds[198];
    } else if (
      (firstIndex === 2 || secondIndex === 2 || thirdIndex === 2) &&
      (firstIndex === 3 || secondIndex === 3 || thirdIndex === 3) &&
      (firstIndex === 4 || secondIndex === 4 || thirdIndex === 4)
    ) {
      odd = this.serverOdds[199];
    } else if (
      (firstIndex === 2 || secondIndex === 2 || thirdIndex === 2) &&
      (firstIndex === 3 || secondIndex === 3 || thirdIndex === 3) &&
      (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)
    ) {
      odd = this.serverOdds[200];
    } else if (
      (firstIndex === 2 || secondIndex === 2 || thirdIndex === 2) &&
      (firstIndex === 4 || secondIndex === 4 || thirdIndex === 4) &&
      (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)
    ) {
      odd = this.serverOdds[201];
    } else if (
      (firstIndex === 3 || secondIndex === 3 || thirdIndex === 3) &&
      (firstIndex === 4 || secondIndex === 4 || thirdIndex === 4) &&
      (firstIndex === 5 || secondIndex === 5 || thirdIndex === 5)
    ) {
      odd = this.serverOdds[202];
    }

    return odd;
  }
  public getTrioNotInOrderWidthBetCodeId(firstIndex: number, secondIndex: number, thirdIndex: number): IDog63QuoteInfo {
    return { quote: this.getTrioNotInOrder(firstIndex, secondIndex, thirdIndex), betCodeId: 7 };
  }

  public getTrioInOrder(firstIndex: number, secondIndex: number, thirdIndex: number): number {
    let odd: number = 0.0;

    if (firstIndex === 0 && secondIndex === 1 && thirdIndex === 2) {
      odd = this.serverOdds[63];
    } else if (firstIndex === 0 && secondIndex === 1 && thirdIndex === 3) {
      odd = this.serverOdds[64];
    } else if (firstIndex === 0 && secondIndex === 1 && thirdIndex === 4) {
      odd = this.serverOdds[65];
    } else if (firstIndex === 0 && secondIndex === 1 && thirdIndex === 5) {
      odd = this.serverOdds[66];
    } else if (firstIndex === 0 && secondIndex === 2 && thirdIndex === 1) {
      odd = this.serverOdds[67];
    } else if (firstIndex === 0 && secondIndex === 2 && thirdIndex === 3) {
      odd = this.serverOdds[68];
    } else if (firstIndex === 0 && secondIndex === 2 && thirdIndex === 4) {
      odd = this.serverOdds[69];
    } else if (firstIndex === 0 && secondIndex === 2 && thirdIndex === 5) {
      odd = this.serverOdds[70];
    } else if (firstIndex === 0 && secondIndex === 3 && thirdIndex === 1) {
      odd = this.serverOdds[71];
    } else if (firstIndex === 0 && secondIndex === 3 && thirdIndex === 2) {
      odd = this.serverOdds[72];
    } else if (firstIndex === 0 && secondIndex === 3 && thirdIndex === 4) {
      odd = this.serverOdds[73];
    } else if (firstIndex === 0 && secondIndex === 3 && thirdIndex === 5) {
      odd = this.serverOdds[74];
    } else if (firstIndex === 0 && secondIndex === 4 && thirdIndex === 1) {
      odd = this.serverOdds[75];
    } else if (firstIndex === 0 && secondIndex === 4 && thirdIndex === 2) {
      odd = this.serverOdds[76];
    } else if (firstIndex === 0 && secondIndex === 4 && thirdIndex === 3) {
      odd = this.serverOdds[77];
    } else if (firstIndex === 0 && secondIndex === 4 && thirdIndex === 5) {
      odd = this.serverOdds[78];
    } else if (firstIndex === 0 && secondIndex === 5 && thirdIndex === 1) {
      odd = this.serverOdds[79];
    } else if (firstIndex === 0 && secondIndex === 5 && thirdIndex === 2) {
      odd = this.serverOdds[80];
    } else if (firstIndex === 0 && secondIndex === 5 && thirdIndex === 3) {
      odd = this.serverOdds[81];
    } else if (firstIndex === 0 && secondIndex === 5 && thirdIndex === 4) {
      odd = this.serverOdds[82];
    } else if (firstIndex === 1 && secondIndex === 0 && thirdIndex === 2) {
      odd = this.serverOdds[83];
    } else if (firstIndex === 1 && secondIndex === 0 && thirdIndex === 3) {
      odd = this.serverOdds[84];
    } else if (firstIndex === 1 && secondIndex === 0 && thirdIndex === 4) {
      odd = this.serverOdds[85];
    } else if (firstIndex === 1 && secondIndex === 0 && thirdIndex === 5) {
      odd = this.serverOdds[86];
    } else if (firstIndex === 1 && secondIndex === 2 && thirdIndex === 0) {
      odd = this.serverOdds[87];
    } else if (firstIndex === 1 && secondIndex === 2 && thirdIndex === 3) {
      odd = this.serverOdds[88];
    } else if (firstIndex === 1 && secondIndex === 2 && thirdIndex === 4) {
      odd = this.serverOdds[89];
    } else if (firstIndex === 1 && secondIndex === 2 && thirdIndex === 5) {
      odd = this.serverOdds[90];
    } else if (firstIndex === 1 && secondIndex === 3 && thirdIndex === 0) {
      odd = this.serverOdds[91];
    } else if (firstIndex === 1 && secondIndex === 3 && thirdIndex === 2) {
      odd = this.serverOdds[92];
    } else if (firstIndex === 1 && secondIndex === 3 && thirdIndex === 4) {
      odd = this.serverOdds[93];
    } else if (firstIndex === 1 && secondIndex === 3 && thirdIndex === 5) {
      odd = this.serverOdds[94];
    } else if (firstIndex === 1 && secondIndex === 4 && thirdIndex === 0) {
      odd = this.serverOdds[95];
    } else if (firstIndex === 1 && secondIndex === 4 && thirdIndex === 2) {
      odd = this.serverOdds[96];
    } else if (firstIndex === 1 && secondIndex === 4 && thirdIndex === 3) {
      odd = this.serverOdds[97];
    } else if (firstIndex === 1 && secondIndex === 4 && thirdIndex === 5) {
      odd = this.serverOdds[98];
    } else if (firstIndex === 1 && secondIndex === 5 && thirdIndex === 0) {
      odd = this.serverOdds[99];
    } else if (firstIndex === 1 && secondIndex === 5 && thirdIndex === 2) {
      odd = this.serverOdds[100];
    } else if (firstIndex === 1 && secondIndex === 5 && thirdIndex === 3) {
      odd = this.serverOdds[101];
    } else if (firstIndex === 1 && secondIndex === 5 && thirdIndex === 4) {
      odd = this.serverOdds[102];
    } else if (firstIndex === 2 && secondIndex === 0 && thirdIndex === 1) {
      odd = this.serverOdds[103];
    } else if (firstIndex === 2 && secondIndex === 0 && thirdIndex === 3) {
      odd = this.serverOdds[104];
    } else if (firstIndex === 2 && secondIndex === 0 && thirdIndex === 4) {
      odd = this.serverOdds[105];
    } else if (firstIndex === 2 && secondIndex === 0 && thirdIndex === 5) {
      odd = this.serverOdds[106];
    } else if (firstIndex === 2 && secondIndex === 1 && thirdIndex === 0) {
      odd = this.serverOdds[107];
    } else if (firstIndex === 2 && secondIndex === 1 && thirdIndex === 3) {
      odd = this.serverOdds[108];
    } else if (firstIndex === 2 && secondIndex === 1 && thirdIndex === 4) {
      odd = this.serverOdds[109];
    } else if (firstIndex === 2 && secondIndex === 1 && thirdIndex === 5) {
      odd = this.serverOdds[110];
    } else if (firstIndex === 2 && secondIndex === 3 && thirdIndex === 0) {
      odd = this.serverOdds[111];
    } else if (firstIndex === 2 && secondIndex === 3 && thirdIndex === 1) {
      odd = this.serverOdds[112];
    } else if (firstIndex === 2 && secondIndex === 3 && thirdIndex === 4) {
      odd = this.serverOdds[113];
    } else if (firstIndex === 2 && secondIndex === 3 && thirdIndex === 5) {
      odd = this.serverOdds[114];
    } else if (firstIndex === 2 && secondIndex === 4 && thirdIndex === 0) {
      odd = this.serverOdds[115];
    } else if (firstIndex === 2 && secondIndex === 4 && thirdIndex === 1) {
      odd = this.serverOdds[116];
    } else if (firstIndex === 2 && secondIndex === 4 && thirdIndex === 3) {
      odd = this.serverOdds[117];
    } else if (firstIndex === 2 && secondIndex === 4 && thirdIndex === 5) {
      odd = this.serverOdds[118];
    } else if (firstIndex === 2 && secondIndex === 5 && thirdIndex === 0) {
      odd = this.serverOdds[119];
    } else if (firstIndex === 2 && secondIndex === 5 && thirdIndex === 1) {
      odd = this.serverOdds[120];
    } else if (firstIndex === 2 && secondIndex === 5 && thirdIndex === 3) {
      odd = this.serverOdds[121];
    } else if (firstIndex === 2 && secondIndex === 5 && thirdIndex === 4) {
      odd = this.serverOdds[122];
    } else if (firstIndex === 3 && secondIndex === 0 && thirdIndex === 1) {
      odd = this.serverOdds[123];
    } else if (firstIndex === 3 && secondIndex === 0 && thirdIndex === 2) {
      odd = this.serverOdds[124];
    } else if (firstIndex === 3 && secondIndex === 0 && thirdIndex === 4) {
      odd = this.serverOdds[125];
    } else if (firstIndex === 3 && secondIndex === 0 && thirdIndex === 5) {
      odd = this.serverOdds[126];
    } else if (firstIndex === 3 && secondIndex === 1 && thirdIndex === 0) {
      odd = this.serverOdds[127];
    } else if (firstIndex === 3 && secondIndex === 1 && thirdIndex === 2) {
      odd = this.serverOdds[128];
    } else if (firstIndex === 3 && secondIndex === 1 && thirdIndex === 4) {
      odd = this.serverOdds[129];
    } else if (firstIndex === 3 && secondIndex === 1 && thirdIndex === 5) {
      odd = this.serverOdds[130];
    } else if (firstIndex === 3 && secondIndex === 2 && thirdIndex === 0) {
      odd = this.serverOdds[131];
    } else if (firstIndex === 3 && secondIndex === 2 && thirdIndex === 1) {
      odd = this.serverOdds[132];
    } else if (firstIndex === 3 && secondIndex === 2 && thirdIndex === 4) {
      odd = this.serverOdds[133];
    } else if (firstIndex === 3 && secondIndex === 2 && thirdIndex === 5) {
      odd = this.serverOdds[134];
    } else if (firstIndex === 3 && secondIndex === 4 && thirdIndex === 0) {
      odd = this.serverOdds[135];
    } else if (firstIndex === 3 && secondIndex === 4 && thirdIndex === 1) {
      odd = this.serverOdds[136];
    } else if (firstIndex === 3 && secondIndex === 4 && thirdIndex === 2) {
      odd = this.serverOdds[137];
    } else if (firstIndex === 3 && secondIndex === 4 && thirdIndex === 5) {
      odd = this.serverOdds[138];
    } else if (firstIndex === 3 && secondIndex === 5 && thirdIndex === 0) {
      odd = this.serverOdds[139];
    } else if (firstIndex === 3 && secondIndex === 5 && thirdIndex === 1) {
      odd = this.serverOdds[140];
    } else if (firstIndex === 3 && secondIndex === 5 && thirdIndex === 2) {
      odd = this.serverOdds[141];
    } else if (firstIndex === 3 && secondIndex === 5 && thirdIndex === 4) {
      odd = this.serverOdds[142];
    } else if (firstIndex === 4 && secondIndex === 0 && thirdIndex === 1) {
      odd = this.serverOdds[143];
    } else if (firstIndex === 4 && secondIndex === 0 && thirdIndex === 2) {
      odd = this.serverOdds[144];
    } else if (firstIndex === 4 && secondIndex === 0 && thirdIndex === 3) {
      odd = this.serverOdds[145];
    } else if (firstIndex === 4 && secondIndex === 0 && thirdIndex === 5) {
      odd = this.serverOdds[146];
    } else if (firstIndex === 4 && secondIndex === 1 && thirdIndex === 0) {
      odd = this.serverOdds[147];
    } else if (firstIndex === 4 && secondIndex === 1 && thirdIndex === 2) {
      odd = this.serverOdds[148];
    } else if (firstIndex === 4 && secondIndex === 1 && thirdIndex === 3) {
      odd = this.serverOdds[149];
    } else if (firstIndex === 4 && secondIndex === 1 && thirdIndex === 5) {
      odd = this.serverOdds[150];
    } else if (firstIndex === 4 && secondIndex === 2 && thirdIndex === 0) {
      odd = this.serverOdds[151];
    } else if (firstIndex === 4 && secondIndex === 2 && thirdIndex === 1) {
      odd = this.serverOdds[152];
    } else if (firstIndex === 4 && secondIndex === 2 && thirdIndex === 3) {
      odd = this.serverOdds[153];
    } else if (firstIndex === 4 && secondIndex === 2 && thirdIndex === 5) {
      odd = this.serverOdds[154];
    } else if (firstIndex === 4 && secondIndex === 3 && thirdIndex === 0) {
      odd = this.serverOdds[155];
    } else if (firstIndex === 4 && secondIndex === 3 && thirdIndex === 1) {
      odd = this.serverOdds[156];
    } else if (firstIndex === 4 && secondIndex === 3 && thirdIndex === 2) {
      odd = this.serverOdds[157];
    } else if (firstIndex === 4 && secondIndex === 3 && thirdIndex === 5) {
      odd = this.serverOdds[158];
    } else if (firstIndex === 4 && secondIndex === 5 && thirdIndex === 0) {
      odd = this.serverOdds[159];
    } else if (firstIndex === 4 && secondIndex === 5 && thirdIndex === 1) {
      odd = this.serverOdds[160];
    } else if (firstIndex === 4 && secondIndex === 5 && thirdIndex === 2) {
      odd = this.serverOdds[161];
    } else if (firstIndex === 4 && secondIndex === 5 && thirdIndex === 3) {
      odd = this.serverOdds[162];
    } else if (firstIndex === 5 && secondIndex === 0 && thirdIndex === 1) {
      odd = this.serverOdds[163];
    } else if (firstIndex === 5 && secondIndex === 0 && thirdIndex === 2) {
      odd = this.serverOdds[164];
    } else if (firstIndex === 5 && secondIndex === 0 && thirdIndex === 3) {
      odd = this.serverOdds[165];
    } else if (firstIndex === 5 && secondIndex === 0 && thirdIndex === 4) {
      odd = this.serverOdds[166];
    } else if (firstIndex === 5 && secondIndex === 1 && thirdIndex === 0) {
      odd = this.serverOdds[167];
    } else if (firstIndex === 5 && secondIndex === 1 && thirdIndex === 2) {
      odd = this.serverOdds[168];
    } else if (firstIndex === 5 && secondIndex === 1 && thirdIndex === 3) {
      odd = this.serverOdds[169];
    } else if (firstIndex === 5 && secondIndex === 1 && thirdIndex === 4) {
      odd = this.serverOdds[170];
    } else if (firstIndex === 5 && secondIndex === 2 && thirdIndex === 0) {
      odd = this.serverOdds[171];
    } else if (firstIndex === 5 && secondIndex === 2 && thirdIndex === 1) {
      odd = this.serverOdds[172];
    } else if (firstIndex === 5 && secondIndex === 2 && thirdIndex === 3) {
      odd = this.serverOdds[173];
    } else if (firstIndex === 5 && secondIndex === 2 && thirdIndex === 4) {
      odd = this.serverOdds[174];
    } else if (firstIndex === 5 && secondIndex === 3 && thirdIndex === 0) {
      odd = this.serverOdds[175];
    } else if (firstIndex === 5 && secondIndex === 3 && thirdIndex === 1) {
      odd = this.serverOdds[176];
    } else if (firstIndex === 5 && secondIndex === 3 && thirdIndex === 2) {
      odd = this.serverOdds[177];
    } else if (firstIndex === 5 && secondIndex === 3 && thirdIndex === 4) {
      odd = this.serverOdds[178];
    } else if (firstIndex === 5 && secondIndex === 4 && thirdIndex === 0) {
      odd = this.serverOdds[179];
    } else if (firstIndex === 5 && secondIndex === 4 && thirdIndex === 1) {
      odd = this.serverOdds[180];
    } else if (firstIndex === 5 && secondIndex === 4 && thirdIndex === 2) {
      odd = this.serverOdds[181];
    } else if (firstIndex === 5 && secondIndex === 4 && thirdIndex === 3) {
      odd = this.serverOdds[182];
    }

    return odd;
  }
  public getTrioInOrderWithBetCodeId(firstIndex: number, secondIndex: number, thirdIndex: number): IDog63QuoteInfo {
    return { quote: this.getTrioInOrder(firstIndex, secondIndex, thirdIndex), betCodeId: 6 };
  }

  public getOddEven(driverIndex: number): ITextAndQuote {
    const retData: ITextAndQuote = {
      text: "",
      quote: 0
    };

    if ((driverIndex + 1) % 2 === 0) {
      retData.text = Languages.instance.getText("evenTxt");
      retData.quote = this.serverOdds["206"];
    } else {
      retData.text = Languages.instance.getText("oddTxt");
      retData.quote = this.serverOdds["205"];
    }

    return retData;
  }

  public getHeighLow(driverIndex: number): ITextAndQuote {
    const retData: ITextAndQuote = {
      text: "",
      quote: 0
    };

    if (driverIndex + 1 > 3.5) {
      retData.text = Languages.instance.getText("overTxt");
      retData.quote = this.serverOdds["204"];
    } else {
      retData.text = Languages.instance.getText("underTxt");
      retData.quote = this.serverOdds["203"];
    }

    return retData;
  }

  public getQuotaSumTwo(somma2Number: number): number {
    return this.serverOdds[232 + somma2Number - 3];
  }
  public getQuotaSumThree(somma3Number: number): number {
    return this.serverOdds[222 + somma3Number - 6];
  }
}

export interface ITextAndQuote {
  text: string;
  quote: number;
}
