import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { AnimHelper } from "./../../common/Anim";
import { IRoundHistory, IDriver, IAnimInterval, IDog63RoundHistory, IDog63SuprimiEntry, IDog63QuoteInfo } from "client/Logic/LogicDefinitions";
//import { BonusAnnotationDog } from "./BonusAnnotationDog";
import { MultiStyleText } from "./../../common/MultiStyleText";
import { DrawHelper } from "../../common/DrawHelper";
import { GameType, GameLength } from "common/Definitions";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { DiagonalFadeHelper } from "client/VideoScreen/common/DiagonalFadeHelper";
import { WinnerDogBase } from "./WinnerDogBase";

export class WinnerDog3 extends WinnerDogBase {
  public constructor(gameType: GameType, gameLength: GameLength) {
    super(gameType, gameLength, 9, 16, 14, 20, 20, 0.745);
    this.showDebug(settings.debug, undefined, "WinnerDog3");
  }

  public override fill(withBonus: boolean, driverNumber: number, driver: IDriver, driverTime: string, quotes: IDog63QuoteInfo[]): void {
    super.fill(withBonus, driverNumber, driver, driverTime, quotes);

    Logic.autoSize(this.quotes[0], _s(50));
    Logic.autoSize(this.quotes[1], _s(50));
    Logic.autoSize(this.quotes[2], _s(50));

    this.header.text = _t("thirdTxt");
    this.quoteHeaders[0].text = _t("numberSignThree");
    this.quoteHeaders[1].text = _t("winFiSecThi");
    Logic.autoSize(this.quoteHeaders[1], _s(62));
    this.quoteHeaders[2].visible = false;
  }

  public override onLayout(): void {
    super.onLayout();

    this.header.y = _s(6);
    this.bar.x = _s(278) * this.scaleFactor;
    this.driverNumber.x = _s(271 * this.scaleFactor);

    this.quoteHeaders[0].visible = true; // turn it off for dog 1
    this.quoteHeaders[0].x = _s(290);
    this.quoteHeaders[0].y = _s(43);
    this.quotes[0].x = _s(340);
    this.quotes[0].y = _s(65);
    this.quotes[1].x = _s(332);
  }

  public override updateAnim(baseFactor: number, duration: number) {
    super.updateAnim(baseFactor, duration);
    DiagonalFadeHelper.FadeDiagonal(this, baseFactor + 0.05, duration, 0.9, 0.3, 1, Logic.videoScreen.width, Logic.videoScreen.height);
  }
}
