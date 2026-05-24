import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { GameType, GameLength } from "common/Definitions";
import { DiagonalFadeHelper } from "client/VideoScreen/common/DiagonalFadeHelper";
import { WinnerDogBase } from "./WinnerDogBase";
import { IDog63QuoteInfo, IDriver } from "client/Logic/LogicDefinitions";

export class WinnerDog1 extends WinnerDogBase {
  public constructor(gameType: GameType, gameLength: GameLength) {
    super(gameType, gameLength, 12, 22, 18, 38, 28);
    this.showDebug(settings.debug, undefined, "WinnerDog1");
  }

  public override fill(withBonus: boolean, driverNumber: number, driver: IDriver, driverTime: string, quotes: IDog63QuoteInfo[]): void {
    super.fill(withBonus, driverNumber, driver, driverTime, quotes);

    this.header.text = _t("winner");
    this.header.anchor.set(0.5);
    Logic.autoSize(this.quotes[0], _s(70));
    Logic.autoSize(this.quotes[1], _s(70));
    Logic.autoSize(this.quotes[2], _s(70));

    this.quoteHeaders[0].text = "";
    this.quoteHeaders[1].text = _t("winFiSec");
    this.quoteHeaders[2].text = _t("winFiSecThi");
    Logic.autoSize(this.quoteHeaders[2], _s(82));
  }

  public override onLayout(): void {
    super.onLayout();

    this.header.y = _s(13 * this.scaleFactor);
  }

  public override updateAnim(baseFactor: number, duration: number) {
    super.updateAnim(baseFactor, duration);
    DiagonalFadeHelper.FadeDiagonal(this, baseFactor + 0.3, duration, 0.9, 0.3, 1, Logic.videoScreen.width, Logic.videoScreen.height);
  }
}
