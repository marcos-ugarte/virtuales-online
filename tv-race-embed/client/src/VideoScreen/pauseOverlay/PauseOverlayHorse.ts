import * as PIXI from "pixi.js";
import { Engine } from "client/Graphics/Engine";
import { Group } from "client/Graphics/Group";
import { _s, Logic } from "client/Logic/Logic";

import overlayImageHorse from "assets/horse/pause_HORSE_bg.jpg";
import overlayImageSulky from "assets/sulky/pause_HARNESS_bg.jpg";

import centerElementHorse from "assets/horse/pauseCenter_horse.svg";
import centerElementSulky from "assets/sulky/pauseCenter_sulky.svg";

import { IGameInfo, IRoundInfo } from "client/Logic/LogicDefinitions";
import { TopBarLeftDog } from "../dog/TopBarLeftDog";
import { TopBarLeftLogoDog } from "../dog/TopBarLeftLogoDog";
import { RaceBarDog } from "../dog/RaceBarDog";

import topRightHorse from "assets/horse/topRight_horse.svg";
import topRightTimeOnlyHorse from "assets/horse/topRightTimeOnly_horse.svg";

import topRightSulky from "assets/sulky/topRight_sulky.svg";
import topRightTimeOnlySulky from "assets/sulky/topRightTimeOnly_sulky.svg";

export class PauseOverlayHorse extends Group {
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
    const tex = await Logic.loadTexture((this.gameInfo.gameType === "horse" ? overlayImageHorse : overlayImageSulky) as string);
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

    Logic.loadSVG(this.gameInfo.gameType === "horse" ? centerElementHorse : (centerElementSulky as string), { width: this.centerBackground.width }).then((el) => {
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
    const tr = this.gameInfo.gameType === "horse" ? topRightHorse : topRightSulky;
    const trTimeOnly = this.gameInfo.gameType === "horse" ? topRightTimeOnlyHorse : topRightTimeOnlySulky;
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
