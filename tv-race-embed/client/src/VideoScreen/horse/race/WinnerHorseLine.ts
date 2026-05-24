import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, settings, _t } from "client/Logic/Logic";
import { IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../common/Anim";
import { HorseHelper } from "../HorseHelper";

export class WinnerHorseLine extends Group {
  public winnerNumber: PIXI.Text;
  public winnerName: PIXI.Text;
  public winnerTime: PIXI.Text;
  //public secText: PIXI.Text;

  public anims: IAnimInterval[] = [];

  public constructor(anims: IAnimInterval[]) {
    super();

    this.anims = anims;
    //this.showDebug(settings.debug, undefined, "WinnerHorseLine");

    const fillColor = HorseHelper.getWhiteColor();

    {
      const numberStyle = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(20),
        fill: fillColor,
        align: "right",
        fontStyle: "italic"
      });
      this.winnerNumber = Logic.createPixiText(numberStyle);
      // this.add(this.winnerNumber); // in video
    }
    {
      const nameStyle = new PIXI.TextStyle({
        fontFamily: "DIN-RegularItalic",
        fontSize: _s(20),
        fill: fillColor,
        padding: 1,
        align: "center",
        fontStyle: "italic"
      });
      this.winnerName = Logic.createPixiText(nameStyle);
      this.winnerName.anchor.set(0, 0.52);
      this.add(this.winnerName);
    }
    {
      const timeStyle = new PIXI.TextStyle({
        fontFamily: "DIN-UltraLightItalic",
        fontSize: _s(20),
        fill: fillColor,
        align: "center",
        fontStyle: "italic"
      });
      this.winnerTime = Logic.createPixiText(timeStyle);
      this.winnerTime.anchor.set(1, 0.52);
      this.add(this.winnerTime);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-UltraLightItalic",
        fontSize: _s(8),
        fill: fillColor,
        align: "center",
        fontStyle: "italic"
      });
      // this.secText = Logic.createPixiText(style);
      // this.secText.anchor.set(1, 1.0);
      // this.add(this.secText);
    }
  }

  private static formatWinnerTime(sec_num: number): string {
    if (sec_num < 60) return sec_num.toString();
    const minutes = Math.floor(sec_num / 60);
    let seconds = sec_num - Math.round(minutes * 60);
    seconds = Math.round(seconds * 100) / 100;
    return "" + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  }

  public fill(name: string, time: string) {
    this.winnerName.text = name;
    Logic.autoSize(this.winnerName, _s(100));
    // this.winnerNumber.text = "" + (driverIndex + 1);

    // if the time is > 1 minute - needs to be reformatted
    // const parsedTime = Number.parseFloat(time);
    // time = WinnerHorseLine.formatWinnerTime(parsedTime);
    this.winnerTime.text = time;

    //this.secText.text = _t("sec");

    this.onLayout();
  }

  public onLayout() {
    // top right
    const right = this.width;
    const top = 3;
    this.winnerNumber.x = right - _s(230);
    this.winnerNumber.y = _s(top + 1);
    this.winnerName.x = right - _s(180);
    this.winnerName.y = _s(top + 12);
    this.winnerTime.x = right - _s(10);
    this.winnerTime.y = _s(top + 12);

    // this.secText.x = right - _s(10);
    // this.secText.y = _s(top+20);
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getRaceVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    const baseFactor = t - anim.startTime;

    AnimHelper.animateInOut(baseFactor, 0.5, anim.duration - 0.5, 0.5, 0, 1, (val) => (this.winnerNumber.alpha = val), 0.5, 0);
    AnimHelper.animateInOut(baseFactor, 0.3, anim.duration - 0.4, 0.5, 0, 1, (val) => (this.winnerName.alpha = val), 0.5, 0);
    AnimHelper.animateInOut(baseFactor, 0.6, anim.duration - 0.5, 0.5, 0, 1, (val) => (this.winnerTime.alpha = val), 0.5, 0);
    //AnimHelper.animateInOut(baseFactor, 0.6, anim.duration - 0.5, 0.5, 0, 1, (val) => this.secText.alpha = val, 0.5, 0);

    AnimHelper.animateIn(baseFactor, 0.3, anim.duration, 0.5, 0, 1, (val) => (this.winnerName.scale.x = val));
    AnimHelper.animateIn(baseFactor, 0.0, anim.duration, 0.5, 0, 1, (val) => (this.winnerNumber.scale.x = val));
  }
}
