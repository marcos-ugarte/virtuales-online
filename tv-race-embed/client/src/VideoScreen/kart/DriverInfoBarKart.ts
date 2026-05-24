import { MultiText } from "./../common/MultiText";
import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s } from "client/Logic/Logic";
import { IDriver } from "client/Logic/LogicDefinitions";

export class DriverInfoBarKart extends Group {
  private driverBarInfo: MultiText;
  private textStyles: { default: PIXI.TextStyle; b: PIXI.TextStyle };

  public constructor() {
    super();
    this.driverBarInfo = new MultiText();
    this.driverBarInfo.align = "center";
    // this.driverBarInfo.anchor.set(0.5);
    this.add(this.driverBarInfo);

    const defaultStyle = new PIXI.TextStyle({
      fontFamily: "DIN-UltraLight",
      fontSize: _s(17),
      fill: "#EEE",
      letterSpacing: _s(5)
    });
    const boldStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Medium",
      fontSize: _s(17),
      fill: "white",
      letterSpacing: _s(4)
    });
    this.textStyles = { default: defaultStyle, b: boldStyle };
  }

  public fill(driver: IDriver) {
    this.driverBarInfo.updateText(driver.driverBarText, this.textStyles);
  }

  public onLayout() {
    this.driverBarInfo.x = this.width * 0.5;
    this.driverBarInfo.y = _s(5);
  }

  public setFadeFactor(val: number) {
    this.driverBarInfo.animateText(val);
  }
}
