import * as PIXI from "pixi.js";
import { Engine } from "client/Graphics/Engine";
import { Group } from "client/Graphics/Group";
import { _s, Logic } from "client/Logic/Logic";

import overlayImage6 from "assets/dog/6/pause.jpg";
import centerElement6 from "assets/dog/6/pauseCenter.svg";

import overlayImage8 from "assets/dog/8/pause.jpg";
import centerElement8 from "assets/dog/8/pauseCenter.svg";
import { IGameInfo, IRoundInfo } from "client/Logic/LogicDefinitions";
import { TopBarLeftDog } from "../dog/TopBarLeftDog";
import { TopBarLeftLogoDog } from "../dog/TopBarLeftLogoDog";
import { RaceBarDog } from "../dog/RaceBarDog";

import topRight from "assets/dog/6/topRight.svg";
import topRightTimeOnly from "assets/dog/6/topRightTimeOnly.svg";
import topRight8 from "assets/dog/8/topRight.svg";
import topRightTimeOnly8 from "assets/dog/8/topRightTimeOnly.svg";

export class PauseOverlayDog extends Group {
  private sprite: PIXI.Sprite;
  private centerBackground: PIXI.Sprite;
  public bottomText: PIXI.Text;
  public centerText: PIXI.Text;
  private gameInfo: IGameInfo;
  private topRightBackground: PIXI.Sprite;
  private topBarLeft: TopBarLeftDog;
  private topBarLeftLogo?: TopBarLeftLogoDog;
  private raceBar: RaceBarDog;

  public constructor(gameInfo: IGameInfo) {
    super();

    this.gameInfo = gameInfo;

    this.sprite = new PIXI.Sprite();
    this.add(this.sprite);

    this.centerBackground = new PIXI.Sprite();
    this.add(this.centerBackground);

    this.topBarLeft = new TopBarLeftDog(gameInfo, true);
    this.add(this.topBarLeft);

    if (gameInfo.companyLogo) {
      this.topBarLeftLogo = new TopBarLeftLogoDog(gameInfo.gameType, gameInfo.gameLength, true);
      this.topBarLeftLogo.fillLogo(gameInfo.companyLogo.image, gameInfo.companyLogo.color, gameInfo.companyLogo.color2);
      this.add(this.topBarLeftLogo);
    }

    this.topRightBackground = new PIXI.Sprite();
    this.add(this.topRightBackground);

    this.raceBar = new RaceBarDog(gameInfo.gameType, gameInfo.gameLength, gameInfo.videoLanguage, true);
    this.add(this.raceBar);

    const bottomTextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-MediumItalic",
      fontSize: _s(16.5),
      fill: this.gameInfo.gameType === "dog6" ? "#081E38" : "#102D1D",
      align: "center",
      letterSpacing: _s(5),
      fontStyle: "italic"
    });

    this.bottomText = Logic.createPixiText(bottomTextStyle);
    this.bottomText.anchor.set(0.5, 0.5);
    this.add(this.bottomText);

    const centerTextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(100),
      fill: "#E30613",
      align: "center",
      letterSpacing: _s(1),
      fontStyle: "italic"
    });

    this.centerText = Logic.createPixiText(centerTextStyle);
    this.centerText.anchor.set(0.5, 0.5);
    this.add(this.centerText);
  }

  public async init() {
    const tex = await Logic.loadTexture(this.gameInfo.gameType === "dog6" || this.gameInfo.gameType === "dog63" ? overlayImage6 : overlayImage8);
    this.sprite.texture = tex;

    this.topBarLeft.fill();
  }

  public onLayout() {
    this.sprite.width = this.width;
    this.sprite.height = this.height;

    this.centerBackground.width = Engine.instance.width * 0.32;
    this.centerBackground.position.x = this.width * 0.5;
    this.centerBackground.position.y = this.height * 0.5;
    this.centerBackground.anchor.set(0.5);

    this.bottomText.position.x = this.width * 0.5;
    this.bottomText.position.y = this.centerBackground.position.y + this.height * 0.116;

    this.centerText.position.x = this.width * 0.5;
    this.centerText.position.y = this.centerBackground.position.y - this.height * 0.02;

    Logic.loadSVG(this.gameInfo.gameType === "dog6" || this.gameInfo.gameType === "dog63" ? centerElement6 : centerElement8, { width: this.centerBackground.width }).then((el) => {
      this.centerBackground.texture = el;
      this.centerBackground.height = el.height;
    });

    const racerCount = Logic.getRacerCount(this.gameInfo.gameType);
    this.topBarLeft.setDefaultPos(racerCount);
    if (this.topBarLeftLogo) {
      this.topBarLeftLogo.setDefaultPos(this.topBarLeft, this.gameInfo.gameType);
    }

    this.raceBar.width = _s(185);
    this.raceBar.height = _s(61);
    this.raceBar.position.x = this.width - this.raceBar.width - _s(8);
    this.raceBar.position.y = _s(7 / 2);

    this.updateSvg(true);
  }

  public updateNextRaceTime(time: number | undefined) {
    if (time !== undefined) this.raceBar.setTimeUntilRace(Math.max(0, time));
    this.raceBar.visible = time !== undefined;
    this.topRightBackground.visible = this.raceBar.visible;
  }

  public setNextRound(round: IRoundInfo | undefined) {
    this.raceBar.fill(round, this.gameInfo.videoLanguage);
    this.updateSvg(!!round);
  }

  private updateSvg(withRound: boolean) {
    const tr = this.gameInfo.gameType === "dog6" || this.gameInfo.gameType === "dog63" ? topRight : topRight8;
    const trTimeOnly = this.gameInfo.gameType === "dog6" || this.gameInfo.gameType === "dog63" ? topRightTimeOnly : topRightTimeOnly8;
    const svg = withRound ? tr : trTimeOnly;
    this.topRightBackground.position.x = this.width * 0.816;
    this.topRightBackground.position.y = this.height * 0.01;
    this.topRightBackground.width = _s(228);
    // this.topRight.anchor.set(0.5);
    Logic.loadSVG(svg, { width: this.topRightBackground.width }).then((el) => {
      this.topRightBackground.texture = el;
      this.topRightBackground.height = el.height;
    });
  }
}
