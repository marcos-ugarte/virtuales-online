import { Group } from "client/Graphics/Group";
import { Logic, _s, settings } from "client/Logic/Logic";
import * as PIXI from "pixi.js";
import emptyCell from "../../../assets/c4/horse/EmptyCell.png";
import { DogHelper } from "../dog/DogHelper";
import { ColorsHelper } from "../Util/ColorsHelper";
export class QuoteCell extends Group {
  private type;
  public quoteCellSprite: PIXI.Sprite;
  public quoteText: PIXI.Text;

  public constructor(type?: "first" | "second") {
    super();
    this.type = type;

    this.quoteCellSprite = new PIXI.Sprite();
    this.add(this.quoteCellSprite);

    this.quoteText = Logic.createPixiText();
    this.add(this.quoteText);
  }

  public onLayout(): void {
    const positionY = this.height / 2;
    const positionX = this.width / 2;

    this.quoteCellSprite.anchor.x = 0.5;
    this.quoteCellSprite.anchor.y = 0.5;
    this.quoteCellSprite.position.y = _s(positionY);
    this.quoteCellSprite.position.x = _s(positionX);
    this.quoteCellSprite.height = _s(900);
    this.quoteCellSprite.width = _s(900);

    this.quoteText.anchor.x = 0.5;
    this.quoteText.anchor.y = 0.5;
    this.quoteText.position.y = _s(this.height / 2);
    this.quoteText.position.x = _s(this.width / 2);

    if (settings.debug === true) {
      this.quoteCellSprite.alpha = 0.5;
    }
  }

  public init(disabled: boolean, quoteCellSpriteTexture: PIXI.Texture<PIXI.Resource>): void {
    const clonedQuoteCellSpriteTexture = quoteCellSpriteTexture.clone();
    clonedQuoteCellSpriteTexture.frame = new PIXI.Rectangle(0, disabled ? 105 : 0, 184, 100);
    this.quoteCellSprite.texture = clonedQuoteCellSpriteTexture;
  }

  public fill(quote: number, color: number, isBlack: boolean): void {
    const style = new PIXI.TextStyle({
      fontFamily: "Roboto-Bold",
      trim: true,
      padding: 10,
      fontSize: _s(22),
      fill: isBlack ? DogHelper.getBlackColor() : DogHelper.getWhiteColor(),
      align: "center"
    });

    this.quoteText.text = Logic.implementation.formatOddsC4(quote);
    this.quoteText.style = style;
    this.quoteText.tint = ColorsHelper.toColor(color);
  }

  public update(dt: number): void {
    super.update(dt);
  }
}
