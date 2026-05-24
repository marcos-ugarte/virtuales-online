import { StatOddArea } from "./StatOddArea";
import { UIHelper } from "client/VideoScreen/UIHelper";
import { IColors, RouletteHelper } from "./RouletteHelper";
import { AnimHelper } from "./../common/Anim";
import { IAnimInterval, IRouletteGeneralStats } from "./../../Logic/LogicDefinitions";
import { settings, _t } from "../../Logic/Logic";
import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import { IGameInfo, IRoundInfo } from "client/Logic/LogicDefinitions";
import * as PIXI from "pixi.js";
import { StatOddNumber } from "./StatOddNumber";
import { RouletteNumberStatsTimings } from "settings/C4Settings";

export class GeneralStats extends Group {
  private gameInfo: IGameInfo;
  private hotSprite: PIXI.Sprite = new PIXI.Sprite();
  private coldSprite: PIXI.Sprite = new PIXI.Sprite();
  private hotNumbers: StatOddNumber[] = [];
  private coldNumbers: StatOddNumber[] = [];
  private areaOdds: StatOddArea[] = [];
  private hotNumberText: PIXI.Text = Logic.createPixiText();
  private coldNumberText: PIXI.Text = Logic.createPixiText();
  private redStats: StatOddNumber;
  private blackStats: StatOddNumber;
  private anims: IAnimInterval[] = [{ startTime: 0.0, duration: 0.0 }];
  private combinedBgSprite: PIXI.Sprite = new PIXI.Sprite();

  public constructor(gameInfo: IGameInfo) {
    super();
    this.gameInfo = gameInfo;

    this.showDebug(settings.debug, undefined, "GeneralStats");
    this.hotSprite.anchor.set(0.5, 0.5);
    this.coldSprite.anchor.set(0.5, 0.5);

    this.redStats = new StatOddNumber(gameInfo, 1, true, false, true, false);
    this.blackStats = new StatOddNumber(gameInfo, 2, true, false, true, false);

    const allAreas = RouletteHelper.allAreas;

    this.add(this.combinedBgSprite);
    this.add(this.redStats);
    this.add(this.blackStats);
    // this.add(this.hotSprite);
    // this.add(this.coldSprite);

    for (const area of allAreas) {
      const ar = new StatOddArea(area, false);
      this.areaOdds.push(ar);
      this.add(ar);
    }

    for (let index = 0; index < 6; index++) {
      const nu = new StatOddNumber(gameInfo, index, false, true, true);
      this.hotNumbers.push(nu);
      this.add(nu);
    }

    for (let index = 0; index < 6; index++) {
      const nu = new StatOddNumber(gameInfo, index, false, true, true);
      this.coldNumbers.push(nu);
      this.add(nu);
    }

    this.hotNumberText.anchor.set(0, 0.5);
    this.coldNumberText.anchor.set(0, 0.5);

    const normalOddTextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Regular",
      fontSize: _s(18.75),
      fill: 0x000000
    });

    this.hotNumberText.style = normalOddTextStyle;
    this.coldNumberText.style = normalOddTextStyle;

    this.add(this.hotNumberText);
    this.add(this.coldNumberText);
  }

  public init(numberTexture: PIXI.Texture, hotNColdTexture: PIXI.Texture, combinedBgTexture: PIXI.Texture): void {
    this.hotNumbers.forEach((oddElement) => oddElement.init(numberTexture.clone()));
    this.coldNumbers.forEach((oddElement) => oddElement.init(numberTexture.clone()));
    this.redStats.init(numberTexture.clone());
    this.blackStats.init(numberTexture.clone());

    this.combinedBgSprite.texture = combinedBgTexture;

    const originalWidth = this.combinedBgSprite.texture.width;
    const originalHeight = this.combinedBgSprite.texture.height;
    const aspectRatio = originalWidth / originalHeight;

    this.combinedBgSprite.width = _s(875);
    this.combinedBgSprite.height = this.combinedBgSprite.width / aspectRatio;

    const hotTexture = hotNColdTexture.clone();
    const coldTexture = hotNColdTexture.clone();
    hotTexture.frame = new PIXI.Rectangle(0, 87, 1140, 87);
    coldTexture.frame = new PIXI.Rectangle(0, 0, 1140, 87);

    this.hotSprite.texture = hotTexture;
    this.coldSprite.texture = coldTexture;
  }

  public onLayout(): void {
    const startX = _s(269);
    this.hotNumbers.forEach((number, index) => {
      number.onLayout();
      number.position.x = startX + index * _s(95.5);
      number.position.y = _s(20);
    });
    this.coldNumbers.forEach((number, index) => {
      number.position.x = startX + index * _s(95.5);
      number.width = _s(32);
      number.position.y = _s(95);
      number.onLayout();
    });
    let column = 0;
    let row = 0;
    this.areaOdds.forEach((area, index) => {
      area.position.y = _s(177) + row * _s(53.5);
      area.position.x = _s(290) + _s(300) * column;
      area.onLayout();
      row += 1;
      if (index === 4) {
        column += 1;
        row = 0;
      }
    });
    this.hotSprite.position.x = _s(415);
    this.hotSprite.position.y = _s(17);
    this.hotSprite.height = _s(65);
    this.hotSprite.width = _s(873);

    this.coldSprite.position.x = _s(415);
    this.coldSprite.position.y = _s(94);
    this.coldSprite.height = _s(65);
    this.coldSprite.width = _s(873);

    this.hotNumberText.position.x = _s(35);
    this.hotNumberText.position.y = _s(21);

    this.coldNumberText.position.x = _s(35);
    this.coldNumberText.position.y = _s(97);

    this.redStats.position.y = _s(275);
    this.redStats.position.x = _s(14);

    this.blackStats.position.y = _s(330);
    this.blackStats.position.x = _s(14);

    this.combinedBgSprite.x = _s(-20);
    this.combinedBgSprite.y = _s(-13);

    if (settings.debug) {
      this.hotSprite.alpha = 0.6;
      this.coldSprite.alpha = 0.6;
    }
  }

  public fill(roundInfo: IRoundInfo, generalStats: IRouletteGeneralStats): void {
    this.anims = this.createAnims();

    const hotNumbers = generalStats.hotNumbers;
    const coldNumbers = generalStats.coldNumbers;
    let highestOdd: number = 0;

    this.hotNumbers.forEach((number, index) => {
      const updatedNumber = hotNumbers[index];
      number.fill(undefined, updatedNumber);
    });
    this.coldNumbers.forEach((number, index) => {
      const updatedNumber = coldNumbers[index];
      number.fill(undefined, updatedNumber);
    });

    this.areaOdds.forEach((area, index) => {
      const areaOdds = generalStats.areas;
      const oddNumber = areaOdds[index];
      if (oddNumber > highestOdd) {
        highestOdd = oddNumber;
      }
    });

    this.areaOdds.forEach((area, index) => {
      const areaOdds = generalStats.areas;
      const oddNumber = areaOdds[index];
      area.fill(oddNumber, this.gameInfo.gameLength, highestOdd);
    });

    const highestColorStat = generalStats.red > generalStats.black ? generalStats.red : generalStats.black;

    this.redStats.fill(generalStats.red, undefined, highestColorStat);
    this.blackStats.fill(generalStats.black, undefined, highestColorStat);

    this.hotNumberText.text = _t("hot_numbers");
    this.coldNumberText.text = _t("cold_numbers");
  }

  public createAnims() {
    const result = [RouletteNumberStatsTimings[this.gameInfo.gameLength as 60 | 120 | 240][1]] as IAnimInterval[];
    return result;
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
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 2, 0, 1, (val) => (this.alpha = val), 0.5, 0);
  }
}
