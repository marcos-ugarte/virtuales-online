import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, _t, Logic } from "client/Logic/Logic";
import { IGameInfo, IRoundInfo } from "client/Logic/LogicDefinitions";
import { LayoutHelper } from "../Util/LayoutHelper";

// import overlayImage from "assets/kickbox/pause_KIBO_hg.jpg";
import overlayImage from "assets/kickbox/pause_KIBO_hg.png";
import centerElement from "assets/kickbox/pauseCenter_KIBO.svg";
import topLeftSVG from "assets/kickbox/header_left_logo_KIBO.svg";

import topRightSVG from "assets/kickbox/topRight_KIBO.svg";

export class PauseOverlayKickbox extends Group {
  private sprite: PIXI.Sprite;
  private centerBackground: PIXI.Sprite;
  public bottomText: PIXI.Text;
  public centerText: PIXI.Text;
  private topRightBackground: PIXI.Sprite;
  private topLeftBackground: PIXI.Sprite;
  private topRightText: PIXI.Text;
  private fightTime: PIXI.Text;
  private raceNumber: PIXI.Text;

  public constructor() {
    super();

    this.sprite = new PIXI.Sprite();
    this.add(this.sprite);

    this.centerBackground = new PIXI.Sprite();
    this.add(this.centerBackground);

    this.topRightBackground = new PIXI.Sprite();
    this.topRightBackground.anchor.set(1, 0);
    this.add(this.topRightBackground);

    this.topLeftBackground = new PIXI.Sprite();
    this.topLeftBackground.anchor.set(0, 0);
    this.add(this.topLeftBackground);

    const fightTimeStyle = new PIXI.TextStyle({
      fontFamily: "DIN-HeavyItalic",
      fontSize: _s(30),
      fill: "red",
      align: "left",
      letterSpacing: _s(0),
      fontStyle: "italic"
    });

    this.fightTime = Logic.createPixiText(fightTimeStyle);
    this.fightTime.text = "00:24";
    this.fightTime.anchor.set(0, 1);
    this.add(this.fightTime);

    const raceNumberStyle = new PIXI.TextStyle({
      fontFamily: "DIN-HeavyItalic",
      fontSize: _s(30),
      fill: "white",
      align: "right",
      letterSpacing: _s(0),
      fontStyle: "italic"
    });
    this.raceNumber = Logic.createPixiText(raceNumberStyle);
    this.raceNumber.anchor.set(1, 1);
    this.add(this.raceNumber);

    // if (gameInfo.companyLogo) {
    //   this.topBarLeftLogo = new TopBarLeftLogoDog(gameInfo.gameType, gameInfo.gameLength, true);
    //   this.topBarLeftLogo.fillLogo(gameInfo.companyLogo.image, gameInfo.companyLogo.color, gameInfo.companyLogo.color2);
    //   this.add(this.topBarLeftLogo);
    // }

    const bottomTextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-MediumItalic",
      fontSize: _s(24),
      fill: "black",
      align: "center",
      letterSpacing: _s(3),
      fontStyle: "italic"
    });

    this.bottomText = Logic.createPixiText(bottomTextStyle);
    this.bottomText.anchor.set(0.5, 0.5);
    this.add(this.bottomText);

    const centerTextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(120),
      fill: "white",
      align: "center",
      letterSpacing: _s(0),
      fontStyle: "italic"
    });

    this.centerText = Logic.createPixiText(centerTextStyle);
    this.centerText.anchor.set(0.5, 0.5);
    this.add(this.centerText);

    const topRightTextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-MediumItalic",
      fontSize: _s(18),
      fill: "white",
      align: "right",
      letterSpacing: _s(0.65),
      fontStyle: "italic"
    });
    this.topRightText = Logic.createPixiText(topRightTextStyle);
    this.topRightText.anchor.set(1, 1);
    this.add(this.topRightText);
  }

  public async init() {
    const tex = await Logic.loadTexture(overlayImage as string);
    this.sprite.texture = tex;

    this.topRightText.text = _t("timeNextRound");
  }

  public onLayout() {
    this.sprite.width = this.width;
    this.sprite.height = this.height;

    this.centerBackground.width = _s(400);
    this.centerBackground.height = _s(206);

    this.centerBackground.position.x = this.width * 0.5;
    this.centerBackground.position.y = this.height * 0.5;
    this.centerBackground.anchor.set(0.5, 0.5);

    this.topLeftBackground.position.x = _s(18);
    this.topLeftBackground.position.y = _s(8);
    this.topLeftBackground.width = _s(334.375);

    LayoutHelper.setScaledRectangleSprite(this.topRightBackground, 1280, 10, 200, 105);

    Logic.loadSVG(topRightSVG as string, { width: this.topRightBackground.width }).then((el) => {
      this.topRightBackground.texture = el;
      this.topRightBackground.height = el.height;
    });
    Logic.loadSVG(topLeftSVG as string, { width: this.topLeftBackground.width }).then((el) => {
      this.topLeftBackground.texture = el;
      this.topLeftBackground.height = el.height;
    });
    Logic.loadSVG(centerElement as string, { width: this.centerBackground.width }).then((el) => {
      this.centerBackground.texture = el;
      this.centerBackground.height = el.height;
    });

    this.bottomText.position.x = this.width * 0.5;
    this.bottomText.position.y = this.centerBackground.position.y + this.height * 0.116;

    this.centerText.position.x = this.width * 0.5;
    this.centerText.position.y = this.centerBackground.position.y - this.height * 0.02;

    this.topRightText.position.x = this.width - _s(14);
    this.topRightText.position.y = _s(27);

    this.raceNumber.x = this.width - _s(195);
    this.raceNumber.y = _s(67.5);
    this.fightTime.x = this.width - _s(165);
    this.fightTime.y = _s(67.5);
  }

  public updateNextRaceTime(time: number | undefined) {
    if (time !== undefined) this.fightTime.text = Logic.implementation.formatTime(time);

    this.fightTime.visible = time !== undefined;
    this.topRightBackground.visible = this.fightTime.visible;
    this.topRightText.visible = this.fightTime.visible;
  }

  public setNextRound(round: IRoundInfo | undefined) {
    if (round && round.gameId) this.raceNumber.text = round.gameId.toString();
    else this.raceNumber.text = "";
  }
}
