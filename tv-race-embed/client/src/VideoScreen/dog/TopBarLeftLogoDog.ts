import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { GameType, GameLength } from "common/Definitions";
import { TopBarLeftPanelDog } from "./TopBarLeftPanelDog";
import { Logic, _s } from "client/Logic/Logic";
import { calcDefaultTopBarGradient, TopBarLeftDog } from "./TopBarLeftDog";
import { Fill } from "../common/DrawHelper";
import { Engine } from "client/Graphics/Engine";
import { VideoState } from "client/Logic/LogicDefinitions";

export class TopBarLeftLogoDog extends Group {
  public panel: TopBarLeftPanelDog;
  //private getAnims = Util.memoize(_getAnims, () => ({ lang: Logic.languageId, gameType: this.gameType }));
  private gameType: GameType;
  private gameLength: GameLength;
  private forPauseOverlay: boolean;

  public constructor(gameType: GameType, gameLength: GameLength, forPauseOverlay: boolean) {
    super();

    this.gameType = gameType;
    this.gameLength = gameLength;
    this.forPauseOverlay = forPauseOverlay;

    this.panel = new TopBarLeftPanelDog(gameType);
    this.add(this.panel);
  }

  public fillLogo(logo: PIXI.Texture, color: string | undefined, color2: string | undefined) {
    if (color === undefined) {
      const gradient = calcDefaultTopBarGradient(this.gameType);
      color = gradient.color;
      color2 = gradient.color2;
    }
    let fill1: Fill;
    if (color2) fill1 = { type: "gradient", color, color2 };
    else fill1 = { type: "solid", color };
    const startTime = this.forPauseOverlay ? -10 : 4.3;
    this.panel.setAnims([
      {
        startTime,
        duration: Logic.getRaceEndTime() - startTime - 0.5,
        texture: logo,
        fill: [fill1]
      }
    ]);
  }

  public setVisible(flag: boolean) {
    this.visible = flag;
  }

  public onLayout() {
    this.panel.position.y = 0;
    this.panel.height = this.height;
  }

  public update(dt: number) {
    this.visible = !(Logic.isFading && Logic.fadeTarget === VideoState.Intro);
    super.update(dt);
  }

  public setDefaultPos(topBarLeft: TopBarLeftDog, gameType: GameType) {
    this.height = topBarLeft.height;
    this.y = topBarLeft.y;
    this.width = _s(192);
    this.x = topBarLeft.getNextX(gameType);
  }
}
