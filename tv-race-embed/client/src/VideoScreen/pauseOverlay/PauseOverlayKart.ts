import * as PIXI from "pixi.js";
import { Engine } from "client/Graphics/Engine";
import { Group } from "client/Graphics/Group";
import { _s, Logic } from "client/Logic/Logic";

import overlayImage from "assets/kart/5/pause.jpg";
import centerElement from "assets/kart/5/pauseCenter.svg";
import topRight from "assets/kart/5/topRight.svg";
import { IGameInfo, IRoundInfo } from "client/Logic/LogicDefinitions";
import { TopBarLeftKart } from "../kart/TopBarLeftKart";
import { NextRaceBarKart } from "../kart/NextRaceBarKart";

export class PauseOverlayKart extends Group {
  private sprite: PIXI.Sprite;
  private centerBackground: PIXI.Sprite;
  public bottomText: PIXI.Text;
  public centerText: PIXI.Text;
  private topBarLeft: TopBarLeftKart;
  private topRightBackground: PIXI.Sprite;
  public nextRaceBar: NextRaceBarKart;
  private gameInfo: IGameInfo;

  public constructor(gameInfo: IGameInfo) {
    super();

    this.gameInfo = gameInfo;

    this.sprite = new PIXI.Sprite();
    this.add(this.sprite);

    this.centerBackground = new PIXI.Sprite();
    this.add(this.centerBackground);

    this.topRightBackground = new PIXI.Sprite();
    this.add(this.topRightBackground);

    const bottomTextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Medium",
      fontSize: _s(16.5),
      fill: "#14171A",
      align: "center",
      letterSpacing: _s(5)
    });

    this.bottomText = Logic.createPixiText(bottomTextStyle);
    this.bottomText.anchor.set(0.5, 0.5);
    this.add(this.bottomText);

    const centerTextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Bold",
      fontSize: _s(100),
      fill: "#E30613",
      align: "center",
      letterSpacing: _s(1)
    });

    this.centerText = Logic.createPixiText(centerTextStyle);
    this.centerText.anchor.set(0.5, 0.5);
    this.add(this.centerText);

    this.topBarLeft = new TopBarLeftKart(gameInfo, true);
    this.add(this.topBarLeft);
    this.topBarLeft.fill();

    this.nextRaceBar = new NextRaceBarKart(gameInfo.gameLength, gameInfo.videoLanguage, true);
    this.add(this.nextRaceBar);
  }

  public async init() {
    const tex = await Logic.loadTexture(overlayImage);
    this.sprite.texture = tex;
  }

  public onLayout() {
    this.sprite.width = this.width;
    this.sprite.height = this.height;

    this.centerBackground.width = Engine.instance.width * 0.3;
    this.centerBackground.position.x = this.width * 0.5;
    this.centerBackground.position.y = this.height * 0.5;
    this.centerBackground.anchor.set(0.5);

    this.bottomText.position.x = this.width * 0.5;
    this.bottomText.position.y = this.centerBackground.position.y + this.height * 0.121;

    this.centerText.position.x = this.width * 0.5;
    this.centerText.position.y = this.centerBackground.position.y - this.height * 0.0;

    this.topBarLeft.setDefaultPos();

    this.nextRaceBar.width = _s(310);
    this.nextRaceBar.height = _s(63);
    this.nextRaceBar.position.x = this.width - this.nextRaceBar.width - _s(8);
    this.nextRaceBar.position.y = _s(34);
    this.nextRaceBar.onLayout();

    Logic.loadSVG(centerElement, { width: this.centerBackground.width }).then((el) => {
      this.centerBackground.texture = el;
      this.centerBackground.height = el.height;
    });

    this.topRightBackground.position.x = this.width * 0.753;
    this.topRightBackground.position.y = this.height * 0.05;
    this.topRightBackground.width = _s(310);
    // this.topRight.anchor.set(0.5);
    Logic.loadSVG(topRight, { width: this.topRightBackground.width }).then((el) => {
      this.topRightBackground.texture = el;
      this.topRightBackground.height = el.height;
    });
  }

  public updateNextRaceTime(time: number | undefined) {
    if (time !== undefined) this.nextRaceBar.setTimeUntilRace(Math.max(0, time));
    this.nextRaceBar.visible = time !== undefined;
    this.topRightBackground.visible = this.nextRaceBar.visible;
  }

  public setNextRound(round: IRoundInfo | undefined) {
    this.nextRaceBar.fill(round, this.gameInfo.videoLanguage);
  }
}
