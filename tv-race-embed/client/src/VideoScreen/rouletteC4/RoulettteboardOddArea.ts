import { RouletteHelper } from "./RouletteHelper";
import { AnimHelper } from "../common/Anim";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IAnimInterval, IGameInfo, IRoundInfo } from "client/Logic/LogicDefinitions";
import * as PIXI from "pixi.js";
import { IOddType, OddElement } from "./OddElement";
import singleOddBackgroundTexture from "../../../assets/c4/roulette/oddBackground.png";
import { RouletteBoardTimings } from "settings/C4Settings";
export class RouletteboardOddArea extends Group {
  private gameInfo: IGameInfo;
  public anims: IAnimInterval[] = [{ startTime: 0.0, duration: 0.0 }];

  private fieldText_1_12: PIXI.Text;
  private fieldText_13_24: PIXI.Text;
  private fieldText_25_36: PIXI.Text;
  private fieldText_1_18: PIXI.Text;
  private fieldText_19_36: PIXI.Text;
  private fieldText_even: PIXI.Text;
  private fieldText_odd: PIXI.Text;
  private fieldText_2to1Top: PIXI.Container;
  private fieldText_2to1Middle: PIXI.Container;
  private fieldText_2to1Bottom: PIXI.Container;
  private oddElements: OddElement[] = [];
  private fieldTexts: (PIXI.Text | PIXI.Container)[] = [];
  private oddElementContainer = new Group();
  // TODO: put texts in Rouletteboard container ??
  /**
   * container for all odds and texts for the areas
   * @param gameInfo standart gaminfo, will be passed always
   */
  public constructor(gameInfo: IGameInfo) {
    super();
    this.gameInfo = gameInfo;
    this.showDebug(settings.debug, undefined, "RouletteboardOddArea");
    // Add text
    const normalOddTextStyle = RouletteHelper.rouletteBoardNormalTextStyle;
    const narrowOddTextStyle = RouletteHelper.rouletteBoardNarrowTextStyle;

    this.fieldText_1_12 = Logic.createPixiText(normalOddTextStyle);
    this.fieldText_13_24 = Logic.createPixiText(normalOddTextStyle);
    this.fieldText_25_36 = Logic.createPixiText(normalOddTextStyle);
    this.fieldText_1_18 = Logic.createPixiText(normalOddTextStyle);
    this.fieldText_19_36 = Logic.createPixiText(normalOddTextStyle);
    this.fieldText_even = Logic.createPixiText(normalOddTextStyle);
    this.fieldText_odd = Logic.createPixiText(normalOddTextStyle);
    this.fieldText_2to1Top = Logic.createPixiText();
    this.fieldText_2to1Middle = Logic.createPixiText();
    this.fieldText_2to1Bottom = Logic.createPixiText();

    this.fieldText_2to1Top = this.createSuperScriptText();
    this.fieldText_2to1Middle = this.createSuperScriptText();
    this.fieldText_2to1Bottom = this.createSuperScriptText();

    this.fieldText_1_12.anchor.set(0.5, 0.5);
    this.fieldText_13_24.anchor.set(0.5, 0.5);
    this.fieldText_25_36.anchor.set(0.5, 0.5);
    this.fieldText_1_18.anchor.set(0.5, 0.5);
    this.fieldText_even.anchor.set(0.5, 0.5);
    this.fieldText_odd.anchor.set(0.5, 0.5);
    this.fieldText_19_36.anchor.set(0.5, 0.5);
    // this.fieldText_2to1Top.anchor.set(0.5, 0.5);
    // this.fieldText_2to1Middle.anchor.set(0.5, 0.5);
    // this.fieldText_2to1Bottom.anchor.set(0.5, 0.5);

    this.fieldTexts.push(this.fieldText_1_12);
    this.fieldTexts.push(this.fieldText_13_24);
    this.fieldTexts.push(this.fieldText_25_36);
    this.fieldTexts.push(this.fieldText_1_18);
    this.fieldTexts.push(this.fieldText_even);
    this.fieldTexts.push(this.fieldText_odd);
    this.fieldTexts.push(this.fieldText_19_36);
    this.fieldTexts.push(this.fieldText_2to1Top);
    this.fieldTexts.push(this.fieldText_2to1Middle);
    this.fieldTexts.push(this.fieldText_2to1Bottom);

    // Single
    for (let i = 0; i < 12; i++) {
      const oddEl1 = new OddElement(i, IOddType.Single, 1, i + 1);
      this.oddElements.push(oddEl1);
      const oddEl2 = new OddElement(i, IOddType.Single, 3, i + 1);
      this.oddElements.push(oddEl2);
      const oddEl3 = new OddElement(i, IOddType.Single, 5, i + 1);
      this.oddElements.push(oddEl3);
    }
    // Split Columns
    let column = 2;
    for (let i = 1; i <= 11; i++) {
      const oddEl1 = new OddElement(i, IOddType.SplitColumn, 1, column);
      this.oddElements.push(oddEl1);
      const oddEl2 = new OddElement(i, IOddType.SplitColumn, 3, column);
      this.oddElements.push(oddEl2);
      const oddEl3 = new OddElement(i, IOddType.SplitColumn, 5, column);
      this.oddElements.push(oddEl3);
      column += 1;
    }
    // Split Rows
    column = 1;
    for (let i = 0; i < 12; i++) {
      const oddEl1 = new OddElement(i, IOddType.SplitRow, 2, i + 1);
      this.oddElements.push(oddEl1);
      const oddEl2 = new OddElement(i, IOddType.SplitRow, 4, i + 1);
      this.oddElements.push(oddEl2);
    }
    // Street
    for (let i = 0; i < 12; i++) {
      const oddEl1 = new OddElement(i, IOddType.Street, 6, i + 1);
      this.oddElements.push(oddEl1);
    }
    // Corner
    column = 2;
    for (let i = 0; i < 11; i++) {
      const oddEl1 = new OddElement(i, IOddType.Corner, 2, column);
      const oddEl2 = new OddElement(i, IOddType.Corner, 4, column);
      this.oddElements.push(oddEl1);
      this.oddElements.push(oddEl2);
      column += 1;
    }
    // Double Street
    column = 2;
    for (let i = 0; i < 11; i++) {
      const oddEl1 = new OddElement(i, IOddType.DoubleStreet, 6, column);
      this.oddElements.push(oddEl1);
      column += 1;
    }
    // ZeroSplit
    let row = 1;
    for (let i = 0; i < 3; i++) {
      const oddEl1 = new OddElement(i, IOddType.ZeroSplit, row, 1);
      this.oddElements.push(oddEl1);
      row += 2;
    }
    // Trio
    {
      const oddEl1 = new OddElement(0, IOddType.Trio, 2, 1);
      this.oddElements.push(oddEl1);

      const oddEl2 = new OddElement(1, IOddType.Trio, 4, 1);
      this.oddElements.push(oddEl2);
    }
    // Basket
    {
      const oddEl1 = new OddElement(0, IOddType.Basket, 6, 1);
      this.oddElements.push(oddEl1);
    }
    // Others
    {
      const zero = new OddElement(0, IOddType.Zero, 3, 0);
      this.oddElements.push(zero);

      const area1_12 = new OddElement(0, IOddType.area1_12, 7, 3);
      this.oddElements.push(area1_12);

      const area13_24 = new OddElement(0, IOddType.area13_24, 7, 7);
      this.oddElements.push(area13_24);

      const area25_36 = new OddElement(0, IOddType.area25_36, 7, 11);
      this.oddElements.push(area25_36);

      const area1_18 = new OddElement(0, IOddType.area1_18, 8, 2);
      this.oddElements.push(area1_18);

      const areaEven = new OddElement(0, IOddType.areaEven, 8, 4);
      this.oddElements.push(areaEven);

      const areaRed = new OddElement(0, IOddType.areaRed, 8, 6);
      this.oddElements.push(areaRed);

      const areaBlack = new OddElement(0, IOddType.areaBlack, 8, 8);
      this.oddElements.push(areaBlack);

      const areaOdd = new OddElement(0, IOddType.areaOdd, 8, 10);
      this.oddElements.push(areaOdd);

      const area19_36 = new OddElement(0, IOddType.area19_36, 8, 12);
      this.oddElements.push(area19_36);

      const area2to1Top = new OddElement(0, IOddType.area2to1, 1, 13);
      this.oddElements.push(area2to1Top);

      const area2to1Middle = new OddElement(0, IOddType.area2to1, 3, 13);
      this.oddElements.push(area2to1Middle);

      const area2to1Bottom = new OddElement(0, IOddType.area2to1, 5, 13);
      this.oddElements.push(area2to1Bottom);
    }
    this.fieldTexts.forEach((fieldText) => {
      this.oddElementContainer.add(fieldText);
    });
    this.oddElementContainer.container.pivot.set(_s(762), _s(425));

    this.oddElementContainer.container.position.set(_s(762), _s(425));
    this.oddElements.forEach((el) => {
      this.oddElementContainer.add(el);
    });
    this.add(this.oddElementContainer);
  }

  public async init(): Promise<void> {
    const oddElementTexture = await Logic.loadTexture(singleOddBackgroundTexture);
    this.oddElements.forEach((oddElement) => {
      oddElement.init(oddElementTexture.clone());
    });
  }

  private createSuperScriptText() {
    const container = new PIXI.Container();
    container.pivot.x = _s(18);

    const narrowOddTextStyle = RouletteHelper.rouletteBoardNarrowTextStyle;
    const superscriptTextStyle = RouletteHelper.rouletteBoardSuperScriptTextStyle;

    const firstText = new PIXI.Text("2", narrowOddTextStyle);
    const secondText = new PIXI.Text("to", superscriptTextStyle);
    const thirdText = new PIXI.Text("1", narrowOddTextStyle);

    firstText.anchor.set(0.5, 0.5);
    secondText.anchor.set(0.5, 0.6);
    thirdText.anchor.set(0.5, 0.5);

    secondText.x = firstText.width + _s(1);
    thirdText.x = secondText.width + _s(18);

    container.addChild(firstText, secondText, thirdText);
    return container;
  }

  public onLayout(): void {
    this.oddElements.forEach((el, index) => {
      el.width = _s(29);
      el.height = _s(35);
      el.onLayout();
    });
    const firstColumnX = _s(437);
    const secondColumnX = _s(566);
    const thirdColumnX = _s(696);
    const fourthColumnX = _s(826);
    const fifthColumnX = _s(959);
    const sixthColumnX = _s(1088);

    const firstRow = _s(259);
    const secondRow = _s(345);
    const thirdRow = _s(430);
    const fourthRowY = _s(510);
    const fithRowY = _s(585);

    const distanceColumn = (secondColumnX - firstColumnX) * 0.5;
    // Add sprite shape

    this.fieldText_1_12.y = fourthRowY;
    this.fieldText_1_12.x = (firstColumnX + secondColumnX) / 2;
    this.fieldText_13_24.y = fourthRowY;
    this.fieldText_13_24.x = (fourthColumnX + thirdColumnX) / 2;
    this.fieldText_25_36.y = fourthRowY;
    this.fieldText_25_36.x = (fifthColumnX + sixthColumnX) / 2;
    this.fieldText_1_18.y = fithRowY;
    this.fieldText_1_18.x = firstColumnX;
    this.fieldText_odd.y = fithRowY;
    this.fieldText_odd.x = secondColumnX;
    this.fieldText_even.y = fithRowY;
    this.fieldText_even.x = fifthColumnX;
    this.fieldText_19_36.y = fithRowY;
    this.fieldText_19_36.x = sixthColumnX;

    this.fieldText_2to1Top.y = firstRow;
    this.fieldText_2to1Top.x = sixthColumnX + distanceColumn * 1.5;
    this.fieldText_2to1Middle.y = secondRow;
    this.fieldText_2to1Middle.x = sixthColumnX + distanceColumn * 1.5;
    this.fieldText_2to1Bottom.y = thirdRow;
    this.fieldText_2to1Bottom.x = sixthColumnX + distanceColumn * 1.5;
  }
  public createAnims(): IAnimInterval[] {
    const result = RouletteBoardTimings.getAnim(this.gameInfo.gameLength, Logic.getIntroLength());
    return result;
  }

  public fill(roundInfo: IRoundInfo): void {
    this.anims = this.createAnims();

    this.oddElements.forEach((el, index) => {
      el.fill(this.anims);
    });

    this.fieldText_1_12.text = "1-12";
    this.fieldText_13_24.text = "13-24";
    this.fieldText_25_36.text = "25-36";
    this.fieldText_1_18.text = "1-18";
    this.fieldText_19_36.text = "19-36";
    this.fieldText_even.text = _t("evenTxt");
    this.fieldText_odd.text = _t("oddTxt");

    Logic.autoSize(this.fieldText_odd, _s(125));

    // this.fieldText_2to1Top.text = "2to1";
    // this.fieldText_2to1Middle.text = "2to1";
    // this.fieldText_2to1Bottom.text = "2to1";
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
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.9, 0, 1, (val) => (this.oddElementContainer.container.scale.x = val), 0, 0);
    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0.9, 0, 1, (val) => (this.oddElementContainer.container.scale.y = val), 0, 0);
  }
}
