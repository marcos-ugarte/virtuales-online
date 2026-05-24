import { RouletteNumberStatsTimings } from "settings/C4Settings";
import { GeneralStats } from "./GeneralStats";
import { AnimHelper } from "./../common/Anim";
import { IAnimInterval, IRouletteStats } from "./../../Logic/LogicDefinitions";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings } from "client/Logic/Logic";
import { IGameInfo, IRoundInfo } from "client/Logic/LogicDefinitions";
import * as PIXI from "pixi.js";
import { AllNumberStats } from "./AllNumberStats";
import rouletteBallTexture from "../../../assets/c4/roulette/NumbersLeft.png";
import hotNColdBackgroundTexture from "../../../assets/c4/roulette/hotCold.png";
import statBackgroundTexture from "../../../assets/c4/roulette/GridBackgroundBig.png";
import AllStatsCombined from "../../../assets/c4/roulette/combined/AllStats.png";
import GeneralStatsCombined from "../../../assets/c4/roulette/combined/GeneralStats.png";

export class NumberStats extends Group {
  private allNumbers: AllNumberStats;
  private generalStats: GeneralStats;
  private statBackground = new PIXI.Sprite();
  private gameInfo: IGameInfo;
  private anims: IAnimInterval[] = [{ startTime: 0.0, duration: 0.0 }];

  public constructor(gameInfo: IGameInfo) {
    super();
    this.gameInfo = gameInfo;
    this.showDebug(settings.debug, undefined, "NumberStats");
    this.allNumbers = new AllNumberStats(gameInfo);
    this.generalStats = new GeneralStats(gameInfo);
    this.add(this.statBackground);
    this.add(this.allNumbers);
    this.add(this.generalStats);
  }

  public onLayout(): void {
    this.allNumbers.position.x = _s(353);
    this.allNumbers.position.y = _s(211.5);

    this.generalStats.position.x = _s(353);
    this.generalStats.position.y = _s(210);

    this.statBackground.position.x = _s(305);
    this.statBackground.position.y = _s(174);
    this.statBackground.height = _s(520);
    this.statBackground.width = _s(930);
  }

  public fill(roundInfo: IRoundInfo, rouletteStats: IRouletteStats): void {
    this.anims = this.createAnims();
    this.allNumbers.fill(roundInfo, rouletteStats.allNumbers);
    this.generalStats.fill(roundInfo, rouletteStats.generalStats);
  }
  public createAnims(): IAnimInterval[] {
    const result = RouletteNumberStatsTimings[this.gameInfo.gameLength as 60 | 120 | 240] as IAnimInterval[];
    return result;
  }

  public async init(): Promise<void> {
    const numberTexture = await Logic.loadTexture(rouletteBallTexture);
    const hotNColdTexture = await Logic.loadTexture(hotNColdBackgroundTexture);
    const statBackground = await Logic.loadTexture(statBackgroundTexture);
    const allStatsCombined = await Logic.loadTexture(AllStatsCombined);
    const generalStatsCombined = await Logic.loadTexture(GeneralStatsCombined);

    this.statBackground.texture = statBackground;
    this.allNumbers.init(numberTexture, allStatsCombined);
    this.generalStats.init(numberTexture, hotNColdTexture, generalStatsCombined);
  }

  public update(dt: number): void {
    super.update(dt);
    const currentTime = Logic.getVideoTime();
    const anim = Logic.getAnim(currentTime, this.anims, this);

    if (!anim) {
      this.visible = false;
      return;
    }
    this.visible = true;
    const baseFactor = currentTime - anim.startTime;
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 2, 0, 0.64, (val) => (this.statBackground.alpha = val), 0.5, 0);
  }
}
