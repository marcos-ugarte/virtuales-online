import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import { IAnimInterval, IColors, IGameInfo } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "client/VideoScreen/common/Anim";
import { GameType } from "common/Definitions";
import * as PIXI from "pixi.js";
import firstSideBar from "../../../assets/c4/FirstSideBar.png";
import oddsScreenBox from "../../../assets/c4/OddsScreenBox.png";
import secondSideBar from "../../../assets/c4/SecondSideBar.png";
import emptyCellDog6 from "../../../assets/c4/dog6/EmptyCell.png";
import resultNumbersDog6 from "../../../assets/c4/dog6/ResultNumbers.png";
import emptyCellHorse from "../../../assets/c4/horse/EmptyCell.png";
import resultNumbersHorse from "../../../assets/c4/horse/ResultNumbers.png";
import winnerCell from "../../../assets/c4/horse/WinnerCell.png";
import arrow from "../../../assets/c4/horse/arrow.png";
import { QuoteCell } from "./QuoteCell";
import { ResultItem } from "./ResultItem";

const wrapperWidth = 894;
const wrapperHeight = 512;
export class QuotesGrid extends Group {
  private gameType: GameType;
  private withBonus: boolean;

  public anims: IAnimInterval[] = [];
  private backgroundSprite: PIXI.Sprite = new PIXI.Sprite();
  private firstSideBarSprite: PIXI.Sprite = new PIXI.Sprite();
  private secondSideBarSprite: PIXI.Sprite = new PIXI.Sprite();
  private firstSideBarText: PIXI.Text;
  private secondSideBarText: PIXI.Text;
  private winnerCellSprite: PIXI.Sprite = new PIXI.Sprite();
  private winnerCellText: PIXI.Text;
  private firstResultItems: ResultItem[] = [];
  private secondResultItems: ResultItem[] = [];
  private quoteCells: QuoteCell[] = [];
  private racerCount: number;
  private cellWidth: number;
  private cellHeight: number;

  public constructor(gameInfo: IGameInfo) {
    super();
    this.gameType = gameInfo.gameType;
    this.withBonus = gameInfo.haveDbPot;
    this.racerCount = Logic.getRacerCount(this.gameType);
    this.cellWidth = this.gameType === "dog6" ? 119 : 103;
    this.cellHeight = this.gameType === "dog6" ? 65 : 56;
    this.showDebug(settings.debug, undefined, "QuotesGrid");
    // Init components
    const sideBarTextStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(12),
      fill: this.gameType === "dog6" ? 0xdc061b : 0x0373aa
    });
    this.firstSideBarText = Logic.createPixiText(sideBarTextStyle);
    this.secondSideBarText = Logic.createPixiText(sideBarTextStyle);
    const winnerCellTextStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(14),
      fill: 0xffffff
    });
    this.winnerCellText = Logic.createPixiText(winnerCellTextStyle);

    // Add components
    this.add(this.backgroundSprite);
    this.add(this.firstSideBarSprite);
    this.add(this.secondSideBarSprite);
    this.add(this.firstSideBarText);
    this.add(this.secondSideBarText);
    this.add(this.winnerCellSprite);
    this.add(this.winnerCellText);

    // Add first rsult items
    for (let index = 0; index < this.racerCount; index++) {
      const resultItem = new ResultItem("first");
      this.add(resultItem);
      this.firstResultItems.push(resultItem);
    }

    // Add second rsult items
    for (let index = 0; index < this.racerCount; index++) {
      const resultItem = new ResultItem("second");
      this.add(resultItem);
      this.secondResultItems.push(resultItem);
    }

    // Add quote cells
    for (let index = 0; index < Math.pow(this.racerCount, 2); index++) {
      const qouteCell = new QuoteCell();
      this.add(qouteCell);
      this.quoteCells.push(qouteCell);
    }
  }

  public onLayout(): void {
    // Layout background graphic
    this.backgroundSprite.position.y = _s(this.withBonus ? 142 : 192);
    this.backgroundSprite.position.x = _s(335);
    this.backgroundSprite.width = _s(wrapperWidth);
    this.backgroundSprite.height = _s(wrapperHeight);

    // Layout first side bar components
    const firstSideBarSpritePositionY = this.withBonus ? 196 : 245;
    const firstSideBarSpritePositionX = 318;

    this.firstSideBarSprite.position.y = _s(firstSideBarSpritePositionY);
    this.firstSideBarSprite.position.x = _s(firstSideBarSpritePositionX);
    this.firstSideBarSprite.width = _s(25);
    this.firstSideBarSprite.height = _s(405);

    this.firstSideBarText.position.y = _s(firstSideBarSpritePositionY + 77);
    this.firstSideBarText.position.x = _s(firstSideBarSpritePositionX + 6);
    this.firstSideBarText.rotation = (Math.PI * -90.0) / 180.0;

    // Layout second side bar components
    const secondSideBarSpritePositionY = this.withBonus ? 124 : 173;
    const secondSideBarSpritePositionX = 442;

    this.secondSideBarSprite.position.y = _s(secondSideBarSpritePositionY);
    this.secondSideBarSprite.position.x = _s(secondSideBarSpritePositionX);
    this.secondSideBarSprite.width = _s(740);
    this.secondSideBarSprite.height = _s(25);

    this.secondSideBarText.position.y = _s(secondSideBarSpritePositionY + 6);
    this.secondSideBarText.position.x = _s(secondSideBarSpritePositionX + 53);

    // Layout cells
    const cellY = this.withBonus ? (this.gameType === "dog6" ? 154 : 156) : 207;
    const cellX = this.gameType === "dog6" ? 349 : 353;
    const cellXGap = this.gameType === "dog6" ? 5 : 4;
    const cellYGap = 4;

    this.winnerCellSprite.position.y = _s(cellY);
    this.winnerCellSprite.position.x = _s(cellX);
    this.winnerCellSprite.width = _s(this.cellWidth);
    this.winnerCellSprite.height = _s(this.cellHeight);

    this.winnerCellText.anchor.x = 0.5;
    this.winnerCellText.anchor.y = 0.5;
    this.winnerCellText.position.y = _s(cellY + this.cellHeight / 2);
    this.winnerCellText.position.x = _s(cellX + this.cellWidth / 2 - 8);

    // Layout first result items
    this.firstResultItems.forEach((resultItem, index) => {
      resultItem.position.y = index * _s(this.cellHeight + cellYGap) + _s(cellY + this.cellHeight + cellYGap);
      resultItem.position.x = _s(cellX);
      resultItem.width = this.cellWidth;
      resultItem.height = this.cellHeight;
    });

    // Layout second result items
    this.secondResultItems.forEach((resultItem, index) => {
      resultItem.position.x = _s(cellX + this.cellWidth + cellXGap) + index * _s(this.cellWidth + cellXGap);
      resultItem.position.y = _s(cellY);
      resultItem.width = this.cellWidth;
      resultItem.height = this.cellHeight;
    });

    // Layout quote cells
    const fixPositionY = cellY + this.cellHeight + cellYGap;
    const positionX = this.cellWidth + cellXGap;
    let positionY = 0;
    let incrementX = 0;
    let incrementY = 0;

    this.quoteCells.forEach((quoteCell, index) => {
      let disabled = false;
      // Check if cell with this index is disabled
      if (index === 0 || index % 8 === 0) {
        disabled = true;
      }
      if (index % this.racerCount === 0) {
        incrementX = 0;
        positionY = incrementY * _s(this.cellHeight + cellYGap) + _s(fixPositionY);
        incrementY++;
      }
      quoteCell.position.x = incrementX * _s(positionX) + _s(cellX + this.cellWidth + cellXGap);
      quoteCell.position.y = positionY;
      quoteCell.height = this.cellHeight;
      quoteCell.width = this.cellWidth;

      incrementX++;
    });

    if (settings.debug) {
      // Debug settings
      this.firstSideBarSprite.tint = 0x000;
      this.secondSideBarSprite.tint = 0x000;
    }
  }

  public async init(): Promise<void> {
    // Init background sprite texture
    const backgroundTexture = await Logic.loadTexture(oddsScreenBox);
    this.backgroundSprite.texture = backgroundTexture;

    // Init first side bar sprite texture
    const firstSideBarTexture = await Logic.loadTexture(firstSideBar);
    this.firstSideBarSprite.texture = firstSideBarTexture;

    // Init secund side bar sprite texture
    const secondSideBarTexture = await Logic.loadTexture(secondSideBar);
    this.secondSideBarSprite.texture = secondSideBarTexture;

    // Init winner cell
    const winnerCellTexture = await Logic.loadTexture(winnerCell);
    this.winnerCellSprite.texture = winnerCellTexture;

    // Init first result items
    const resultItemSpriteTexture = await Logic.loadTexture(this.gameType === "dog6" ? resultNumbersDog6 : resultNumbersHorse);
    const arrowSpriteTrexture = await Logic.loadTexture(arrow);

    this.firstResultItems.forEach((resultItem, index) => {
      resultItem.init(index, resultItemSpriteTexture.clone(), arrowSpriteTrexture.clone());
    });

    // Init second result items
    this.secondResultItems.forEach((resultItem, index) => {
      resultItem.init(index, resultItemSpriteTexture.clone(), arrowSpriteTrexture.clone());
    });

    // Init quote cells
    const quoteCellSpriteTexture = await Logic.loadTexture(this.gameType === "dog6" ? emptyCellDog6 : emptyCellHorse);
    this.quoteCells.forEach((qouteCell, index) => {
      let disabled = false;
      // Check if cell with this index is disabled
      if (index === 0 || index % (this.racerCount + 1) === 0) {
        disabled = true;
      }
      qouteCell.init(disabled, quoteCellSpriteTexture.clone());
    });
  }

  public fill(odds: number[], colors: IColors): void {
    // Get odds colors
    const racerCount = Logic.getRacerCount(this.gameType);
    const minMax = Logic.calcOddsMinMax(odds, racerCount);

    // Fill texts
    this.firstSideBarText.text = _t("first");
    this.secondSideBarText.text = _t("second");
    this.winnerCellText.text = _t("winnerTxt");

    // Fill quote cells
    for (let iRow = 0; iRow < racerCount; iRow++) {
      for (let iCol = 0; iCol < racerCount; iCol++) {
        const val = Logic.getOddsForDriver(odds, iRow, iCol, racerCount);
        const oddsColor = Logic.getOddsColor(minMax, val, iRow, iCol);
        const text = odds[iCol + iRow * racerCount];
        const isBlack = oddsColor === "white";
        const color = colors[oddsColor];
        this.quoteCells[iCol + iRow * racerCount].fill(text, color, isBlack);
      }
    }
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

    // Background sprite animation
    const deltaBackgroundSprite = 0.1;
    AnimHelper.animateInOut(
      baseFactor,
      deltaBackgroundSprite,
      anim.duration,
      0.5,
      0,
      1,
      (val) => {
        this.backgroundSprite.height = _s(wrapperHeight) * val;
        this.backgroundSprite.width = _s(wrapperWidth) * val;
      },
      0.7,
      0
    );

    // First sidebar sprite animation
    AnimHelper.animateInOut(
      baseFactor,
      deltaBackgroundSprite,
      anim.duration,
      0.5,
      0,
      1,
      (val) => {
        this.firstSideBarSprite.alpha = val;
        this.firstSideBarText.alpha = val;
        this.secondSideBarSprite.alpha = val;
        this.secondSideBarText.alpha = val;
        this.winnerCellSprite.alpha = val;
        this.winnerCellText.alpha = val;
      },
      0.7,
      0
    );

    // Quote cells animations
    this.quoteCells.forEach((cell, index) => {
      const delta = 0.016;
      AnimHelper.animateInOut(
        baseFactor,
        delta * index,
        anim.duration,
        0.7,
        0,
        1,
        (val) => {
          cell.quoteCellSprite.height = _s(this.cellHeight) * val;
          cell.quoteCellSprite.width = _s(this.cellWidth) * val;
        },
        0.7,
        0
      );
      AnimHelper.animateInOut(
        baseFactor,
        delta * index + 0.3,
        anim.duration,
        0.7,
        0,
        1,
        (val) => {
          cell.quoteText.alpha = val;
        },
        0.7,
        0
      );
    });

    // First result items animations
    this.firstResultItems.forEach((cell, index) => {
      const delta = 0.03;
      AnimHelper.animateInOut(
        baseFactor,
        delta * index,
        anim.duration,
        0.7,
        0,
        1,
        (val) => {
          cell.resultItemSprite.height = _s(this.cellHeight) * val;
          cell.resultItemSprite.width = _s(this.cellWidth) * val;
        },
        0.7,
        0
      );
      AnimHelper.animateInOut(
        baseFactor,
        delta * index + 0.3,
        anim.duration,
        0.7,
        0,
        1,
        (val) => {
          cell.arrowSprite.alpha = val;
          cell.textSpriteNumber.alpha = val;
          cell.textSpriteAddition.alpha = val;
        },
        0.7,
        0
      );
    });

    // Second result items animations
    this.secondResultItems.forEach((cell, index) => {
      const delta = 0.03;
      AnimHelper.animateInOut(
        baseFactor,
        delta * index,
        anim.duration,
        0.7,
        0,
        1,
        (val) => {
          cell.resultItemSprite.height = _s(this.cellHeight) * val;
          cell.resultItemSprite.width = _s(this.cellWidth) * val;
        },
        0.7,
        0
      );
      AnimHelper.animateInOut(
        baseFactor,
        delta * index + 0.3,
        anim.duration,
        0.7,
        0,
        1,
        (val) => {
          cell.arrowSprite.alpha = val;
          cell.textSpriteNumber.alpha = val;
          cell.textSpriteAddition.alpha = val;
        },
        0.7,
        0
      );
    });
  }
}
