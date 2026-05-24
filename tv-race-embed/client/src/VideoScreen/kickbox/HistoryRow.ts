import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, _t, settings } from "client/Logic/Logic";
import { IAnimInterval, IDriver, IFightHistoryRow } from "client/Logic/LogicDefinitions";
import { KickboxHelper } from "./KickboxHelper";
import { Texture } from "pixi.js";
import { HistoryRowRound } from "./HistoryRowRound";
import { AnimHelper } from "../common/Anim";
import { Settings } from "common/Settings";
import { Util } from "common/Util";
import { LanguagesBase } from "client/LogicImplementation/base/LocalisationBase";

export class HistoryRow extends Group {
  private fightRound: PIXI.Text;
  private historyRowRound: HistoryRowRound[] = [];
  private resultNumber: PIXI.Text;
  private resultBackground: PIXI.Sprite;
  private resultName: PIXI.Text;
  private winningBet: PIXI.Text;
  private combiBet: PIXI.Text;

  private anims: IAnimInterval[] = [{ startTime: 37, duration: 32 }];

  public constructor(
    ngonTexture: Texture,
    barTexture: Texture,
    fightRoundMask: PIXI.Sprite | null,
    resultNameMask: PIXI.Sprite | null,
    winningBetMask: PIXI.Sprite | null,
    combiBetMask: PIXI.Sprite | null
  ) {
    super();
    this.showDebug(settings.debug, undefined, "HistoryRow");

    const fightRoundStyle = new PIXI.TextStyle({
      fontFamily: "DIN-LightItalic",
      fontSize: _s(11),
      fill: KickboxHelper.getWhiteColor(),
      fontStyle: "italic"
    });

    this.fightRound = Logic.createPixiText(fightRoundStyle);
    this.fightRound.anchor.set(0.0, 0.5);
    //this.fightRound.mask = fightRoundMask;
    this.add(this.fightRound);

    for (let i = 0; i < 3; i++) {
      const round = new HistoryRowRound(ngonTexture, barTexture);
      this.historyRowRound.push(round);
      this.add(round);
    }

    const resultNumberStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Bold",
      fontSize: _s(16),
      fill: KickboxHelper.getWhiteColor()
      //fontStyle: "italic"
    });

    this.resultBackground = new PIXI.Sprite(ngonTexture);
    this.resultBackground.anchor.set(0.5, 0.5);
    this.add(this.resultBackground);
    this.resultNumber = Logic.createPixiText(resultNumberStyle);
    this.resultNumber.anchor.set(0.5, 0.5);
    this.add(this.resultNumber);

    const resultNameStyle = new PIXI.TextStyle({
      fontFamily: "DIN-LightItalic",
      fontSize: _s(18),
      fill: KickboxHelper.getWhiteColor(),
      fontStyle: "italic"
    });

    this.resultName = Logic.createPixiText(resultNameStyle);
    //this.resultName.mask = resultNameMask;
    this.resultName.anchor.set(0.0, 0.5);
    this.add(this.resultName);
    this.winningBet = Logic.createPixiText(resultNameStyle);
    //this.winningBet.mask = winningBetMask;
    this.winningBet.anchor.set(0.5, 0.5);
    this.add(this.winningBet);
    this.combiBet = Logic.createPixiText(resultNameStyle);
    //this.combiBet.mask = combiBetMask;
    this.combiBet.anchor.set(0.5, 0.5);
    this.add(this.combiBet);
  }

  public fill(drivers: IDriver[], historyRow: IFightHistoryRow): void {
    this.fightRound.text = _t("fight") + " " + historyRow.fightNumber;
    Logic.autoSize(this.fightRound, _s(54));

    for (let i = 0; i < this.historyRowRound.length; i++) {
      const roundInfo = historyRow.rounds[i];
      let color2 = 0x0;
      let color = 0x999999;
      if (roundInfo.fighterIndex >= 0 && roundInfo.fighterIndex < 2) {
        const getColor2 = drivers[roundInfo.fighterIndex].color2;
        if (getColor2 !== undefined) {
          color2 = getColor2; //?.toString();
        }
        const getColor = drivers[roundInfo.fighterIndex].color;
        if (getColor !== undefined) {
          color = getColor; //?.toString();
        }
      }
      this.historyRowRound[i].fill(roundInfo.fighterIndex + 1, roundInfo.quote, roundInfo.fighterIndex < 0 ? KickboxHelper.getGrayBackgroundColor() : color, color2, roundInfo.bar);
      this.resultNumber.tint = color2;
    }

    const resultDriver = historyRow.resultFighter;

    this.resultNumber.text = "" + (historyRow.resultFighterIndex + 1);

    if (resultDriver.color2 !== undefined) {
      this.resultNumber.tint = resultDriver.color2;
    }
    this.resultBackground.tint = resultDriver.color;
    this.resultName.text = (resultDriver.firstName + " " + resultDriver.lastName).toUpperCase();
    Logic.autoSize(this.resultName, _s(137));
    this.winningBet.text = Util.formatValue(historyRow.winningBet, Settings.kickboxQuotaDecimalPlaces, LanguagesBase.commaSymbol);
    this.combiBet.text = Util.formatValue(historyRow.combiBet, Settings.kickboxQuotaDecimalPlaces, LanguagesBase.commaSymbol);

    this.onLayout();
  }

  public onLayout(): void {
    const halfHeight = _s(20);

    this.fightRound.x = _s(16);
    this.fightRound.y = _s(20);

    this.historyRowRound[0].x = _s(84);
    this.historyRowRound[1].x = _s(230);
    this.historyRowRound[2].x = _s(377);

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < this.historyRowRound.length; i++) {
      this.historyRowRound[i].width = _s(115);
      this.historyRowRound[i].height = _s(44);
    }

    this.resultNumber.x = _s(550);
    this.resultNumber.y = halfHeight;
    this.resultBackground.x = _s(550);
    this.resultBackground.y = halfHeight;
    this.resultBackground.width = _s(22);
    this.resultBackground.height = _s(20);

    this.resultName.x = _s(572);
    this.resultName.y = halfHeight;

    this.winningBet.x = _s(744);
    this.winningBet.y = halfHeight;

    this.combiBet.x = _s(823);
    this.combiBet.y = halfHeight;
  }

  public update(dt: number): void {
    super.update(dt);

    // const t = Logic.getVideoTime();
    // const anim = Logic.getAnim(t, this.anims, this);
    // if (!anim) return;

    //AnimHelper.animateInOut(t, anim.startTime, anim.startTime+anim.duration, 0, 0, 1, x => this.alpha = x, 0, 0);
    // const baseFactor = t - anim.startTime;
  }

  public updateAnims(baseFactor: number, duration: number, rowIndex: number, columnDurations: number[]): void {
    const fadeOutDuration = 0.5;

    AnimHelper.animateIn(baseFactor, rowIndex * 0.1, columnDurations[0], 1, _s(-150 + 16), _s(16), (x) => (this.fightRound.x = x));
    AnimHelper.animateInOut(baseFactor, rowIndex * 0.1 + 0.4, columnDurations[0] - 0.4, 0.3, 0, 1, (x) => (this.fightRound.alpha = x), fadeOutDuration, 0);

    AnimHelper.animateIn(baseFactor, rowIndex * 0.1, columnDurations[4], 1, _s(-150 + 572), _s(572), (x) => (this.resultName.x = x));
    AnimHelper.animateInOut(baseFactor, rowIndex * 0.1 + 0.4, columnDurations[4] - 0.4, 0.3, 0, 1, (x) => (this.resultName.alpha = x), fadeOutDuration, 0);

    AnimHelper.animateIn(baseFactor, rowIndex * 0.1, columnDurations[5], 1, _s(-100 + 744), _s(0 + 744), (x) => (this.winningBet.x = x));
    AnimHelper.animateInOut(baseFactor, rowIndex * 0.1 + 0.4, columnDurations[6] - 0.4, 0.4, 0, 1, (x) => (this.winningBet.alpha = x), fadeOutDuration, 0);

    AnimHelper.animateIn(baseFactor, rowIndex * 0.1, columnDurations[6], 1, _s(-100 + 823), _s(0 + 823), (x) => (this.combiBet.x = x));
    AnimHelper.animateInOut(baseFactor, rowIndex * 0.1 + 0.4, columnDurations[6] - 0.4, 0.3, 0, 1, (x) => (this.combiBet.alpha = x), fadeOutDuration, 0);

    const columnOffset = 0.1;
    for (let i = 0; i < this.historyRowRound.length; i++) {
      this.historyRowRound[i].updateAnims(baseFactor + rowIndex * 0.1 + columnOffset * i - 0.5);
      AnimHelper.animateInOut(baseFactor, 0, columnDurations[i + 1], 0, 1, 1, (alpha) => (this.historyRowRound[i].alpha = alpha), fadeOutDuration, 0);
    }

    AnimHelper.animateIn(baseFactor, rowIndex * 0.1, columnDurations[4], 1, 0, _s(0.7), (x) => this.resultBackground.scale.set(x, x));
    AnimHelper.animateInOut(baseFactor, rowIndex * 0.1, columnDurations[4], 0, 0, 1, (x) => (this.resultBackground.alpha = x), fadeOutDuration, 0);

    AnimHelper.animateIn(baseFactor, rowIndex * 0.1, columnDurations[4], 1, 0, 1, (x) => this.resultNumber.scale.set(x, x));
    AnimHelper.animateInOut(baseFactor, rowIndex * 0.1, columnDurations[4], 0, 0, 1, (x) => (this.resultNumber.alpha = x), fadeOutDuration, 0);

    AnimHelper.animateIn(baseFactor, rowIndex * 0.1, columnDurations[4], 1, Math.PI, 0, (x) => (this.resultBackground.rotation = x));

    // fade out by starting to fadeout the alpha from the columns at the side to the center
  }
}
