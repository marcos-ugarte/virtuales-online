import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, settings, _t } from "client/Logic/Logic";
import { IAnimInterval, IDriver, IIntervalDriver } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../common/Anim";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { UIHelper } from "client/VideoScreen/UIHelper";

export class WinnerDogLine extends Group {
  public winnerNumberSprite: PIXI.Sprite;
  public winnerNameSprite: PIXI.Sprite;
  public winnerOddSprite: PIXI.Sprite;
  public winnerDogSprite: PIXI.Sprite;
  public winnerDogShadowSprite: PIXI.Sprite;
  public winnerNumberSlice: PIXI.Sprite;
  public winnerPlaceSprite: PIXI.Sprite;
  public winnerNumber: PIXI.Text;
  public winnerName: PIXI.Text;
  public winnerTime: PIXI.Text;
  public secText: PIXI.Text;

  public widthDog = 0;
  public heightDog = 0;
  public widthOdd = 0;
  public heightOdd = 0;
  public widthNumber = 0;
  public heightNumber = 0;
  public widthName = 0;
  public heightName = 0;
  public widthLabel = 0;
  public heightLabel = 0;
  public widthSlice = 0;
  public heightSlice = 0;
  public margin = 0;
  public shadowOffset = 0;
  public dogOffset = 0;
  public type = 0;

  public anims: IAnimInterval[] = [];
  public useOverlays: boolean;

  public constructor(anims: IAnimInterval[], useOverlays: boolean) {
    super();

    this.anims = anims;
    this.useOverlays = useOverlays;
    this.showDebug(settings.debug, 0.4, "WinnerDogLine");

    this.widthDog = _s(390);
    this.heightDog = _s(157);
    this.widthOdd = _s(110);
    this.heightOdd = _s(57);
    this.widthNumber = _s(57);
    this.heightNumber = _s(30);
    this.widthName = _s(205);
    this.heightName = _s(30);
    this.widthLabel = _s(111);
    this.heightLabel = _s(18);
    this.widthSlice = _s(7);
    this.heightSlice = _s(21);
    this.margin = _s(1.5);
    this.shadowOffset = _s(17);

    this.winnerDogShadowSprite = new PIXI.Sprite();
    this.add(this.winnerDogShadowSprite);
    this.winnerNumberSprite = new PIXI.Sprite();
    this.add(this.winnerNumberSprite);
    this.winnerNameSprite = new PIXI.Sprite();
    this.add(this.winnerNameSprite);
    this.winnerOddSprite = new PIXI.Sprite();
    this.add(this.winnerOddSprite);
    this.winnerDogSprite = new PIXI.Sprite();
    this.add(this.winnerDogSprite);
    this.winnerPlaceSprite = new PIXI.Sprite();
    this.add(this.winnerPlaceSprite);

    this.winnerNumberSlice = new PIXI.Sprite();
    this.add(this.winnerNumberSlice);

    this.winnerDogShadowSprite.visible = false;
    this.winnerNumberSprite.visible = false;
    this.winnerNameSprite.visible = false;
    this.winnerOddSprite.visible = false;
    this.winnerDogSprite.visible = false;
    this.winnerPlaceSprite.visible = false;
    this.winnerNumberSlice.visible = false;

    const fillColor = "white";

    {
      const numberStyle = new PIXI.TextStyle({
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(20),
        fill: fillColor,
        align: "right",
        fontStyle: "italic"
      });
      this.winnerNumber = Logic.createPixiText(numberStyle);
      this.winnerNumber.anchor.set(0, 0.52);
      this.add(this.winnerNumber);
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
      this.secText = Logic.createPixiText(style);
      this.secText.anchor.set(1, 1.0);
      this.add(this.secText);
    }
    this.winnerNumber.visible = false;
  }

  public fill(driverResult: IIntervalDriver, driver: IDriver, type: number) {
    this.type = type;

    if (type !== 0) {
      this.widthDog = _s(339);
      this.heightDog = _s(136);
      this.widthOdd = _s(98);
      this.heightOdd = _s(51);
      this.shadowOffset = _s(15);
    }

    switch (type) {
      case 0:
        this.dogOffset = _s(0);
        break;
      case 1:
        this.dogOffset = this.heightName + this.margin;
        break;
      case 2:
        this.dogOffset = this.heightDog + this.shadowOffset;
        break;
      default:
        this.dogOffset = _s(0);
        break;
    }

    this.winnerName.text = driver.firstName.toUpperCase();
    Logic.autoSize(this.winnerName, _s(100));
    this.winnerNumber.text = "" + (driverResult.driverIndex + 1);
    this.winnerTime.text = driverResult.time;

    this.secText.text = _t("sec");

    this.winnerNumberSlice.texture = DrawHelper.drawPatternTexture(
      this.widthSlice,
      this.heightSlice,
      UIHelper.getSkewedPixel(this.heightSlice),
      driver.color,
      driver.color2,
      driver.driverPattern,
      false
    );

    this.winnerNumberSprite.texture = DrawHelper.createSkewedRoundedRectangleTexture(
      this.widthNumber,
      this.heightNumber,
      UIHelper.getSkewedRadius(this.heightNumber),
      UIHelper.getSkewedPixel(this.heightNumber),
      [
        {
          type: "gradient",
          color: "#04172a",
          color2: "#022841"
        }
      ]
    );
    this.winnerNameSprite.texture = DrawHelper.createSkewedRoundedRectangleTexture(
      this.widthName,
      this.heightName,
      UIHelper.getSkewedRadius(this.heightName),
      UIHelper.getSkewedPixel(this.heightName),
      [
        {
          type: "mixed",
          color: "#04172a",
          color2: "#042c46",
          start: 0.95,
          end: 1.5,
          opacity: 0.9
        },
        {
          type: "mixed",
          verti: true,
          color: "#355cb5",
          color2: "#08294c",
          opacity: 0.85
        }
      ]
    );
    this.winnerOddSprite.texture = DrawHelper.createSkewedRoundedRectangleTexture(this.widthOdd, this.heightOdd, UIHelper.getSkewedRadius(this.heightOdd), UIHelper.getSkewedPixel(this.heightOdd), [
      {
        type: "mixed",
        color: "#04172a",
        color2: "#022841",
        start: 0.2,
        end: 1.5
      }
    ]);
    this.winnerDogSprite.texture = DrawHelper.createSkewedRoundedRectangleTexture(this.widthDog, this.heightDog, UIHelper.getSkewedRadius(this.heightDog), UIHelper.getSkewedPixel(this.heightDog), [
      {
        type: "gradient",
        color: "#04172a",
        color2: "#022841"
      }
    ]);
    this.winnerDogShadowSprite.texture = DrawHelper.createSkewedRoundedRectangleTexture(
      this.widthDog,
      this.heightDog,
      UIHelper.getSkewedRadius(this.heightDog),
      UIHelper.getSkewedPixel(this.heightDog),
      [
        {
          type: "gradient",
          color: "#04172a",
          color2: "#022841",
          opacity: 0.5
        }
      ]
    );

    this.onLayout();
  }

  public onLayout() {
    const skewedName = UIHelper.getSkewedPixel(this.heightName);
    const oddOffset = this.type === 1 ? this.heightName + this.margin : 0;
    const skewedOddOffset = this.type === 1 ? UIHelper.getSkewedPixel(this.heightName) : 0;
    const skewedDogOffset = this.type === 2 ? UIHelper.getSkewedPixel(this.dogOffset) : 0;
    // top right
    const right = this.width;
    const top = 3;

    if (this.useOverlays) {
      this.winnerNumber.x = right - this.widthName - this.widthNumber + this.widthNumber * (1 / 3);
      this.winnerNumber.y = _s(15);
      this.winnerNumberSlice.width = this.widthSlice;
      this.winnerNumberSlice.height = this.heightSlice;
      this.winnerNumberSlice.anchor.set(0, 0.5);
      this.winnerNumberSlice.x = right - this.widthName - this.widthNumber + this.widthNumber * (2 / 3);
      this.winnerNumberSlice.y = _s(15);
      this.winnerNumberSprite.width = this.widthNumber;
      this.winnerNumberSprite.height = this.heightNumber;
      this.winnerNumberSprite.anchor.set(0, 0.5);
      this.winnerNumberSprite.x = right - this.widthName - this.widthNumber + skewedName - this.margin;
      this.winnerNumberSprite.y = _s(15);

      this.winnerName.x = right - this.widthName + _s(10);
      this.winnerName.y = _s(15);
      this.winnerNameSprite.width = this.widthName;
      this.winnerNameSprite.height = this.heightName;
      this.winnerNameSprite.x = right - this.widthName;
      this.winnerNameSprite.y = _s(15);
      this.winnerNameSprite.anchor.set(0, 0.5);
      this.winnerTime.x = right - _s(28);
      this.winnerTime.y = _s(15);

      this.winnerOddSprite.width = this.widthOdd;
      this.winnerOddSprite.height = this.heightOdd;
      this.winnerOddSprite.x = right - this.widthOdd - this.margin - skewedName - skewedOddOffset;
      this.winnerOddSprite.y = _s(15) + this.heightName / 2 + this.margin + oddOffset;
      this.winnerOddSprite.anchor.set(0, 0);

      this.winnerDogSprite.width = this.widthDog;
      this.winnerDogSprite.height = this.heightDog;
      this.winnerDogSprite.x = right - this.widthDog - this.widthOdd - skewedOddOffset - skewedDogOffset;
      this.winnerDogSprite.y = _s(15) + this.heightName / 2 + this.margin + this.dogOffset;
      this.winnerDogSprite.anchor.set(0, 0);

      this.winnerDogShadowSprite.width = this.widthDog;
      this.winnerDogShadowSprite.height = this.heightDog;
      this.winnerDogShadowSprite.x = right - this.widthDog - this.widthOdd - skewedOddOffset - skewedDogOffset + this.shadowOffset;
      this.winnerDogShadowSprite.y = _s(15) + this.heightName / 2 + this.margin + this.shadowOffset + this.dogOffset;
      this.winnerDogShadowSprite.anchor.set(0, 0);

      this.secText.x = right - _s(12);
      this.secText.y = _s(23);
    } else {
      this.winnerNumber.x = right - _s(230);
      this.winnerNumber.y = _s(top + 1);
      this.winnerName.x = right - _s(184);
      this.winnerName.y = _s(top + 12);
      this.winnerTime.x = right - _s(28);
      this.winnerTime.y = _s(top + 12);

      this.secText.x = right - _s(12);
      this.secText.y = _s(top + 20);
    }
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
    AnimHelper.animateInOut(baseFactor, 0.6, anim.duration - 0.5, 0.5, 0, 1, (val) => (this.secText.alpha = val), 0.5, 0);

    AnimHelper.animateIn(baseFactor, 0.3, anim.duration, 0.5, 0, 1, (val) => (this.winnerName.scale.x = val));
    AnimHelper.animateIn(baseFactor, 0.0, anim.duration, 0.5, 0, 1, (val) => (this.winnerNumber.scale.x = val));

    if (this.type !== 0) {
      if (Logic.implementation.getGameInfo().gameLength === 300) {
        if (this.type === 1) {
          AnimHelper.animateInOut(baseFactor, 0.0, 32.6, 0.9, 0, 1, (val) => (this.winnerNumber.alpha = val), 1, 0.2);
          AnimHelper.animateInOut(baseFactor, 0.0, 32.6, 0.9, 0, 1, (val) => (this.winnerNumberSlice.alpha = val), 1, 0.2);
          AnimHelper.animateInOut(baseFactor, 0.0, 32.6, 0.9, 0, 1, (val) => (this.winnerName.alpha = val), 1, 0.2);
          AnimHelper.animateInOut(baseFactor, 0.0, 32.6, 0.9, 0, 1, (val) => (this.winnerTime.alpha = val), 1, 0.2);
          AnimHelper.animateInOut(baseFactor, 0.0, 32.6, 0.9, 0, 1, (val) => (this.secText.alpha = val), 1, 0.2);
        } else {
          AnimHelper.animateInOut(baseFactor, 32.5, anim.duration - 0.6, 0.9, 0.2, 1, (val) => (this.winnerNumber.alpha = val), 1, 0.2);
          AnimHelper.animateInOut(baseFactor, 32.5, anim.duration - 0.6, 0.9, 0.2, 1, (val) => (this.winnerNumberSlice.alpha = val), 1, 0.2);
          AnimHelper.animateInOut(baseFactor, 32.5, anim.duration - 0.6, 0.9, 0.2, 1, (val) => (this.winnerName.alpha = val), 1, 0.2);
          AnimHelper.animateInOut(baseFactor, 32.5, anim.duration - 0.6, 0.9, 0.2, 1, (val) => (this.winnerTime.alpha = val), 1, 0.2);
          AnimHelper.animateInOut(baseFactor, 32.5, anim.duration - 0.6, 0.9, 0.2, 1, (val) => (this.secText.alpha = val), 1, 0.2);
        }
      } else {
        if (this.type === 1) {
          this.winnerNumber.alpha = Math.max((9.1 - baseFactor) * 4, 0.2);
          this.winnerNumberSlice.alpha = Math.max((9.1 - baseFactor) * 4, 0.2);
          this.winnerName.alpha = Math.max((9.1 - baseFactor) * 4, 0.2);
          this.winnerTime.alpha = Math.max((9.1 - baseFactor) * 4, 0.2);
          this.secText.alpha = Math.max((9.1 - baseFactor) * 4, 0.2);
        } else {
          this.winnerNumber.alpha = Math.max((baseFactor - 9.1) * 3, 0.2);
          this.winnerNumberSlice.alpha = Math.max((baseFactor - 9.1) * 3, 0.2);
          this.winnerName.alpha = Math.max((baseFactor - 9.1) * 3, 0.2);
          this.winnerTime.alpha = Math.max((baseFactor - 9.1) * 3, 0.2);
          this.secText.alpha = Math.max((baseFactor - 9.1) * 3, 0.2);
        }
      }
    }
  }
}
