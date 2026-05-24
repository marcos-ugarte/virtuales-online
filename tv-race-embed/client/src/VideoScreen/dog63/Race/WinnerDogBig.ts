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

export class WinnerDogBig extends WinnerDogBase {
  private anims: (IAnimInterval & { fadeInFactor?: number; fadeOutFactor?: number })[] = [];
  //private withBonus: boolean;

  public constructor(gameType: GameType, gameLength: GameLength) {
    super(gameType, gameLength, 9, 22, 18, 38, 28);
    this.showDebug(settings.debug, undefined, "WinnerDogBig");
    this.driverName.style.fontWeight = "bold";
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean): IAnimInterval[] {
    {
      return [{ startTime: 32.4, duration: 7.2 }];
    }
  }

  public override fill(withBonus: boolean, driverNumber: number, driver: IDriver, driverTime: string, quotes: IDog63QuoteInfo[]): void {
    super.fill(withBonus, driverNumber, driver, driverTime, quotes);

    this.anims = this.createAnims(this.gameType, Logic.implementation.getGameInfo().gameLength, withBonus);
    this.header.text = _t("winner");
    Logic.autoSize(this.quotes[0], _s(70));

    this.quoteHeaders[0].text = "";
    this.quoteHeaders[1].text = "";
    this.quoteHeaders[2].text = "";
  }

  public override onLayout(): void {
    super.onLayout();

    this.driverName.x = _s(300);
    this.header.y = _s(10);

    // this.header.x = _s(392);
    // this.header.y = _s(7);

    // const driverInfoY = 24;
    // this.driverNumber.x = _s(255);
    // this.driverNumber.y = _s(driverInfoY);
    // this.driverName.x = _s(296);
    // this.driverName.y = _s(driverInfoY);
    // this.driverTime.x = _s(401);
    // this.driverTime.y = _s(driverInfoY);

    // this.quoteHeaders[0].visible = false; // turn it off for dog 1
    // this.quotes[0].x = _s(392);
    // this.quotes[0].y = _s(59);

    // this.quoteHeaders[1].x = _s(380);
    // this.quoteHeaders[1].y = _s(111);
    // this.quotes[1].x = _s(401);
    // this.quotes[1].y = _s(129);

    // this.quoteHeaders[2].x = _s(370);
    // this.quoteHeaders[2].y = _s(168);
    // this.quotes[2].x = _s(392);
    // this.quotes[2].y = _s(186);
  }

  public override updateAnim(baseFactor: number, duration: number) {
    super.updateAnim(baseFactor, duration);
    DiagonalFadeHelper.FadeDiagonal(this, baseFactor + 0.3, duration, 0.9, 0.3, 1, Logic.videoScreen.width, Logic.videoScreen.height);
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

    if (baseFactor > anim.duration) {
      this.visible = false;
      return;
    }

    this.showDebugTime("WinnerDogBig", baseFactor);

    this.updateAnim(baseFactor, anim.duration);
  }
}
