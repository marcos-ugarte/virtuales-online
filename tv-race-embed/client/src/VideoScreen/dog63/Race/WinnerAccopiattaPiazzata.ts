import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { AnimHelper } from "./../../common/Anim";
import { IDriver, IDog63QuoteInfo } from "client/Logic/LogicDefinitions";
import { GameType, GameLength } from "common/Definitions";
import { LayoutHelper } from "client/VideoScreen/Util/LayoutHelper";
import { DiagonalFadeHelper } from "client/VideoScreen/common/DiagonalFadeHelper";
import { WinnerAccoppiattaPiazzataPlace } from "./WinnerAccopiattaPiazzataPlace";
import { Dog63Helper } from "../Dog63Helper";

export class WinnerAccoppiattaPiazzata extends Group {
  private header: PIXI.Text;
  private subHeader: PIXI.Text;
  private places: WinnerAccoppiattaPiazzataPlace[] = [];

  public constructor(gameType: GameType, gameLength: GameLength) {
    super();

    this.showDebug(settings.debug, undefined, "AccoppiattaPiazzata");

    this.header = Logic.createPixiText(Dog63Helper.getRaceResultHeaderStyle());
    this.header.anchor.set(0.5);
    this.add(this.header);

    this.subHeader = Logic.createPixiText(Dog63Helper.getRaceResultSubHeaderStyle());
    this.subHeader.anchor.set(0, 0.5);
    this.add(this.subHeader);

    for (let i = 0; i < 3; i++) {
      const place = new WinnerAccoppiattaPiazzataPlace(gameType, gameLength, i);
      this.add(place);
      this.places.push(place);
    }
  }

  public fill(withBonus: boolean, drivers: IDriver[], places: number[], quotes: IDog63QuoteInfo[]): void {
    this.header.text = _t("forcastBet3");
    this.subHeader.text = _t("inTwoShortRes");

    this.places[0].fill([places[0], places[1]], drivers, quotes[0]);
    this.places[1].fill([places[2], places[3]], drivers, quotes[1]);
    this.places[2].fill([places[4], places[5]], drivers, quotes[2]);
  }

  public onLayout(): void {
    this.header.x = _s(168);
    this.header.y = _s(10);

    this.subHeader.x = _s(17);
    this.subHeader.y = _s(60);

    for (let i = 0; i < 3; i++) {
      LayoutHelper.setScaledRectangle(this.places[i], 72 + i * 70, 25, 47, 41);
    }
  }

  public updateAnim(baseFactor: number, duration: number): void {
    DiagonalFadeHelper.FadeDiagonal(this, baseFactor, duration, 0.9, 0.3, 1, Logic.videoScreen.width, Logic.videoScreen.height);
    AnimHelper.animateIn(baseFactor, 0.3, 1, 0.5, -30, 0, (x) => {
      for (let i = 0; i < 3; i++) {
        this.places[i].x = _s(72 + i * 70 + x);
        this.subHeader.x = _s(17 + x);
        this.header.x = _s(168 + x);
      }
    });

    for (const place of this.places) place.updateAnim(baseFactor);
  }
}
