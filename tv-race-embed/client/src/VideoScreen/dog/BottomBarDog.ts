import { IDog63QuoteEntry, IDog63Quotes } from "./../../Logic/LogicDefinitions";
import { bottomBarSettings } from "./../../../settings/OddsAlwaysOnSettings";
import { settings } from "./../../Logic/Logic";
import { Group } from "client/Graphics/Group";
import { BottomBarItemDog } from "./BottomBarItemDog";
import { _s, Logic } from "client/Logic/Logic";
import { IDriver, IColors, IGameInfo } from "client/Logic/LogicDefinitions";
import { DogHelper } from "./DogHelper";
import { BottomItemDog } from "client/VideoScreen/dog/BottomItemDog";

export enum bottomBarMode {
  DRIVER_INFO = 0,
  CHANCE_INFO = 1,
  QUOTE_INFO = 2
}

export interface IMinMaxQuote {
  quote: number;
  driverIndex: number;
}

export interface IMinMaxGes {
  smallest: IMinMaxQuote;
  biggest: IMinMaxQuote;
}

export class BottomBarDog extends Group {
  private driverItems: BottomBarItemDog[] = [];
  private driverItemsUI: BottomItemDog[] = [];
  private chanceItems: BottomBarItemDog[] = [];
  private quoteItems: BottomBarItemDog[] = [];

  private gameInfo: IGameInfo;
  private helper: DogHelper;
  private oddsAlwaysOn: boolean;
  private useOverlays: boolean;

  public constructor(gameInfo: IGameInfo, helper: DogHelper, showAdditionalInformation = false) {
    super();

    this.gameInfo = gameInfo;
    this.helper = helper;
    this.oddsAlwaysOn = gameInfo.oddsAlwaysOn;
    this.useOverlays = gameInfo.useOverlays;

    const gameType = gameInfo.gameType;
    this.showDebug(settings.debug, 1, "BottomBarDog");

    const racerCount = Logic.getRacerCount(gameType);
    this.createBottomBarItems(racerCount, bottomBarMode.DRIVER_INFO, this.driverItems, this.driverItemsUI);

    if (showAdditionalInformation) {
      this.createBottomBarItems(racerCount, bottomBarMode.CHANCE_INFO, this.chanceItems, this.driverItemsUI, 3);
      this.createBottomBarItems(racerCount, bottomBarMode.QUOTE_INFO, this.quoteItems, this.driverItemsUI, 5);
    }
  }

  public createBottomBarItems(racerCount: number, mode: bottomBarMode, itemArr: BottomBarItemDog[], itemArrUI: BottomItemDog[], fieldCount?: number) {
    const gameType = this.gameInfo.gameType;

    let left = 42;
    let itemSize = 205.5;

    if (gameType === "dog8") {
      left = 22;
      itemSize = 153.66;
    } else if (gameType === "horse" || gameType === "sulky") {
      itemSize = 170.86;
    }

    if (this.oddsAlwaysOn) {
      if (gameType === "horse") left = 41;
      itemSize = bottomBarSettings[gameType as keyof typeof bottomBarSettings][mode].itemSize;
    }

    for (let i = 0; i < racerCount; i++) {
      const yOffset = gameType === "dog8" ? 20 : 0;
      const xOffset = gameType === "dog8" ? left - 4 : left;
      if (this.useOverlays) {
        const bottomItemDog = new BottomItemDog(i, this.gameInfo, this.helper, this.oddsAlwaysOn, mode, fieldCount);
        if (this.oddsAlwaysOn) {
          bottomItemDog.position.x = _s(xOffset + i * itemSize + 36);
          bottomItemDog.position.y = _s(564 + yOffset);
        } else {
          bottomItemDog.position.x = _s(xOffset + i * itemSize + 33);
          bottomItemDog.position.y = _s(586 + yOffset);
        }
        bottomItemDog.width = _s(itemSize);
        bottomItemDog.height = _s(22);
        itemArrUI.push(bottomItemDog);
        this.add(bottomItemDog);
      }
      const bottomBarItem = new BottomBarItemDog(i, this.gameInfo, this.helper, this.oddsAlwaysOn, mode, fieldCount);
      bottomBarItem.position.x = _s(left + i * itemSize);
      bottomBarItem.position.y = _s(673);
      bottomBarItem.width = _s(itemSize);
      bottomBarItem.height = _s(22);
      itemArr.push(bottomBarItem);
      this.add(bottomBarItem);
    }
  }

  public fill(drivers: IDriver[], colors: IColors, withBonus: boolean, language: string) {
    for (let i = 0; i < this.driverItems.length; i++) {
      this.driverItems[i].fill(drivers[i], colors, withBonus, language);
      if (this.useOverlays) this.driverItemsUI[i].fill(drivers[i], colors, withBonus, language);
    }
  }

  // TODO: refactor to properly group the quotes per row
  private findSmallestNumbersByRow(QuoteEntry: IDog63QuoteEntry[]): IMinMaxGes[] {
    const rowCount = QuoteEntry[0].quotes.length;
    const minMaxPerRow: IMinMaxGes[] = [];

    for (let row = 0; row < rowCount; row++) {
      const currentRow = QuoteEntry.map((arr, index) => {
        return {
          quote: arr.quotes[row].quote,
          driverIndex: index
        };
      });
      const smallest = currentRow.reduce(function (prev, curr) {
        return prev.quote < curr.quote ? prev : curr;
      });
      const biggest = currentRow.reduce(function (prev, curr) {
        return prev.quote > curr.quote ? prev : curr;
      });
      minMaxPerRow.push({ smallest, biggest });
    }

    return minMaxPerRow;
  }

  public fillAdditionalInformation(quotes: IDog63Quotes, drivers: IDriver[]) {
    const minMaxQuotes = this.findSmallestNumbersByRow(quotes.entries);
    for (const [index, item] of this.chanceItems.entries()) {
      const quoteEntry = quotes.entries[index];
      item.fillAdditionalChanceInformation(quoteEntry.peso, quoteEntry.ultime5, quoteEntry.val, drivers[index]);
    }
    for (const [index, item] of this.quoteItems.entries()) {
      const quoteEntry = quotes.entries[index];

      const minMaxThisRow = minMaxQuotes
        .map((el, i) => {
          if (el.biggest.driverIndex === index) return { big: el.biggest.quote, i };
          if (el.smallest.driverIndex === index) return { small: el.smallest.quote, i };
        })
        .filter((e) => !!e);

      item.fillAdditionalQuoteInformation(quoteEntry.quotes, minMaxThisRow, drivers[index]);
    }
  }

  public update(dt: number) {
    super.update(dt);
  }
}
