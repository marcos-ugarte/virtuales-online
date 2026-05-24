import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { AnimHelper } from "./../../common/Anim";
import { IRoundHistory, IDriver, IAnimInterval, IDog63RoundHistory, IDog63SuprimiEntry, IDog63QuoteInfo } from "client/Logic/LogicDefinitions";
import { GameType, GameLength } from "common/Definitions";
import { WinnerDogBase } from "./WinnerDogBase";
import { DiagonalFadeHelper } from "client/VideoScreen/common/DiagonalFadeHelper";

export class WinnerDog2 extends WinnerDogBase {
  //private anims: (IAnimInterval & {fadeInFactor?: number; fadeOutFactor?: number})[] = [];

  public constructor(gameType: GameType, gameLength: GameLength) {
    super(gameType, gameLength, 10, 18, 16, 24, 24, 0.86);
    this.showDebug(settings.debug, undefined, "WinnerDog2");
  }

  public override fill(withBonus: boolean, driverNumber: number, driver: IDriver, driverTime: string, quotes: IDog63QuoteInfo[]): void {
    super.fill(withBonus, driverNumber, driver, driverTime, quotes);

    Logic.autoSize(this.quotes[0], _s(60));
    Logic.autoSize(this.quotes[1], _s(60));
    Logic.autoSize(this.quotes[2], _s(60));

    this.header.text = _t("second");
    this.header.anchor.set(0.5);
    this.quoteHeaders[0].text = _t("numberSignTwo");
    this.quoteHeaders[1].text = _t("winFiSec");
    this.quoteHeaders[2].text = _t("winFiSecThi");
    Logic.autoSize(this.quoteHeaders[2], _s(68));
  }

  public override onLayout(): void {
    super.onLayout();

    this.header.y = _s(11);

    this.quoteHeaders[0].visible = true; // turn it off for dog 1
    this.quoteHeaders[0].x = _s(333);
    this.quoteHeaders[0].y = _s(48);
    this.quotes[0].x = _s(392);
    this.quotes[0].y = _s(75);
    this.quotes[1].x = _s(382);
    this.quotes[2].x = _s(376);
  }

  public override updateAnim(baseFactor: number, duration: number) {
    super.updateAnim(baseFactor, duration);
    DiagonalFadeHelper.FadeDiagonal(this, baseFactor + 0, duration, 0.9, 0.3, 1, Logic.videoScreen.width, Logic.videoScreen.height);
  }
}
