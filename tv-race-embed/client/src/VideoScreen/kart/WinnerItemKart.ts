import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings, _t } from "client/Logic/Logic";
import { AnimatedText } from "../common/AnimatedText";
import { IResult, IDriver, IAnimInterval } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../common/Anim";
import { MultiStyleText } from "../common/MultiStyleText";
import { DynamicMesh, DynamicGeometry } from "client/Graphics/DynamicMesh";

export class WinnerItemKart extends Group {
  private driverName: MultiStyleText;
  private dg = new DynamicGeometry("Pos2Color", 4, 6);
  private textBackground: DynamicMesh;
  public winnerDescription: PIXI.Text;

  private timeText: AnimatedText;
  private driverName2?: MultiStyleText;
  private timeText2?: AnimatedText;
  private oddsText: PIXI.Text;
  private anims: IAnimInterval[] = [];
  private type: "Center" | "Left" | "Right";

  public constructor(type: WinnerItemKart["type"], language: string) {
    super();
    this.type = type;

    this.showDebug(settings.debug, undefined, "WinnerItemKart");

    const oddsStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Heavy",
      fontSize: _s(28),
      fill: "white",
      align: "center"
    });
    this.oddsText = Logic.createPixiText(oddsStyle);
    this.oddsText.anchor.set(0.5);
    this.oddsText.roundPixels = true;
    this.add(this.oddsText);

    this.driverName = new MultiStyleText();
    this.driverName.anchor.set(0.0, 0.5);
    this.add(this.driverName);

    if (this.type === "Right") {
      this.driverName2 = new MultiStyleText();
      this.driverName2.anchor.set(0.0, 0.5);
      this.add(this.driverName2);
    }

    const timeStyle = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLight",
      fontSize: _s(21),
      fill: "white",
      align: "center"
    });
    this.timeText = new AnimatedText("", timeStyle);
    this.timeText.anchor.set(1.0, 0.5);
    this.add(this.timeText);

    if (this.type === "Right") {
      this.timeText2 = new AnimatedText("", timeStyle);
      this.timeText2.anchor.set(1.0, 0.5);
      this.add(this.timeText2);
    }

    {
      this.add(this.dg);

      this.textBackground = new DynamicMesh();
      this.textBackground.setPositions([0, 0, 0, 0, 0, 0, 0, 0]);
      this.textBackground.setIndices([0, 1, 2, 0, 2, 3]);
      this.textBackground.setColors([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff]);
      if (language === "it") this.dg.add(this.textBackground);
    }
    {
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-Heavy",
        fontSize: _s(20),
        letterSpacing: _s(0.6),
        fill: "black",
        align: "center"
      });
      this.winnerDescription = Logic.createPixiText(style);
      this.winnerDescription.anchor.set(0.5, 0.5);
      if (language === "it") this.add(this.winnerDescription);
    }
  }

  public setAnims(anims: IAnimInterval[]) {
    this.anims = anims;
  }

  public fill(result: IResult, drivers: IDriver[], odds: number[]) {
    const first = result.first;
    const second = result.second;
    const firstDriver = drivers[first.driverIndex];
    const secondDriver = drivers[second.driverIndex];
    this.winnerDescription.text = this.type !== "Right" ? _t("winner") : _t("forcastBet");

    const oddsForDriver = Logic.getOddsForDriver(odds, first.driverIndex, this.type !== "Right" ? first.driverIndex : second.driverIndex, drivers.length);
    const afterDigitsOverwrite = Logic.getOddsForDriverDigits(odds, first.driverIndex, this.type !== "Right" ? first.driverIndex : second.driverIndex, drivers.length);
    if (afterDigitsOverwrite === null) {
      this.oddsText.text = Logic.implementation.formatOdds(oddsForDriver);
    } else {
      this.oddsText.text = Logic.implementation.formatOdds(oddsForDriver, afterDigitsOverwrite);
    }

    Logic.autoSize(this.oddsText, _s(70));

    this.driverName.text = firstDriver.firstName.toLocaleUpperCase() + " <b>" + firstDriver.lastName.toLocaleUpperCase() + "</b>";
    this.driverName.styles = {
      default: {
        fontFamily: "DIN-UltraLight",
        fill: "white",
        fontSize: _s(23),
        trim: true,
        padding: 10,
        letterSpacing: _s(1),
        maxLines: 1,
        wordWrap: true,
        wordWrapWidth: _s(190)
      },
      b: {
        fontFamily: "DIN-Medium",
        fill: "white",
        trim: true,
        padding: 10,
        fontSize: _s(24),
        letterSpacing: _s(1)
      }
    };
    this.timeText.setText(result.first.time + " " + _t("sec"));
    if (this.driverName2) {
      this.driverName2.text = secondDriver.firstName.toLocaleUpperCase() + " <b>" + secondDriver.lastName.toLocaleUpperCase() + "</b>";
      this.driverName2.styles = {
        default: {
          fontFamily: "DIN-UltraLight",
          fill: "white",
          fontSize: _s(23),
          trim: true,
          padding: 10,
          letterSpacing: _s(1),
          maxLines: 1,
          wordWrap: true,
          wordWrapWidth: _s(190)
        },
        b: {
          fontFamily: "DIN-Medium",
          trim: true,
          padding: 10,
          fill: "white",
          fontSize: _s(24),
          letterSpacing: _s(1)
        }
      };
      if (this.timeText2) this.timeText2.setText(result.second.time + " " + _t("sec"));
    }
  }

  public onLayout() {
    this.oddsText.position.x = _s(this.type === "Right" ? 370 : 250);
    this.oddsText.position.y = _s(42);

    this.driverName.position.x = _s(112);
    this.driverName.position.y = _s(this.type === "Center" ? 227 : 214);

    this.timeText.position.x = this.width;
    this.timeText.position.y = this.driverName.position.y; // + _s(1);

    this.winnerDescription.x = _s(300);
    this.winnerDescription.y = _s(this.type === "Center" ? -130 : -125);

    this.textBackground.color = 0xfff4cb42;
    this.textBackground.alpha = 1;

    if (this.driverName2 && this.timeText2) {
      const dx = _s(0);
      const dy = _s(30);
      this.driverName2.position.x = this.driverName.position.x - dx;
      this.driverName2.position.y = this.driverName.position.y + dy;

      this.timeText2.position.x = this.timeText.position.x - dx;
      this.timeText2.position.y = this.timeText.position.y + dy;
    }
  }

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getRaceVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    let wt = _s(255);

    let bf = t - anim.startTime;
    if (bf > anim.duration - 1) {
      bf = AnimHelper.limit2(bf, anim.duration, 1) * 3;
      this.oddsText.alpha = bf;
      this.timeText.alpha = bf;
      this.driverName.alpha = bf;
      this.winnerDescription.alpha = bf;
      this.textBackground.alpha = bf;
      if (this.driverName2) this.driverName2.alpha = bf;
      if (this.timeText2) this.timeText2.alpha = bf;
      wt = _s(255) * AnimHelper.clamp(bf * 2, 0.0, 1.0);
    } else {
      this.oddsText.alpha = bf;
      this.driverName.animateText(bf * 3);
      this.driverName.alpha = bf;
      this.winnerDescription.alpha = AnimHelper.clamp(bf - 0.3, 0.0, 1.0);
      this.textBackground.alpha = bf;
      this.timeText.animateText((bf - 0.5) * 3);
      this.timeText.alpha = bf;
      if (this.driverName2) {
        this.driverName2.animateText((bf - 0.4) * 3);
        this.driverName2.alpha = bf;
      }
      if (this.timeText2) {
        this.timeText2.animateText((bf - 0.7) * 3);
        this.timeText2.alpha = bf;
      }
      wt = _s(255) * AnimHelper.clamp(bf * 2, 0.0, 1.0);
    }

    const rightBg = _s(this.type === "Center" ? 173 : 174);
    const bgY = _s(this.type === "Center" ? -145 : -140);
    const trafficPositions = [rightBg, bgY, rightBg + wt, bgY, rightBg + wt, bgY + _s(30), rightBg + _s(-14), bgY + _s(30)];
    this.textBackground.setPositions(trafficPositions);
  }
}
