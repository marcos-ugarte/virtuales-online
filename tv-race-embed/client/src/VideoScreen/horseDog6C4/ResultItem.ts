import { Group } from "client/Graphics/Group";
import { Logic, _s, _t, settings } from "client/Logic/Logic";
import * as PIXI from "pixi.js";

export class ResultItem extends Group {
  private type;

  public resultItemSprite: PIXI.Sprite;
  public arrowSprite: PIXI.Sprite;
  public textSpriteNumber: PIXI.Text;
  public textSpriteAddition: PIXI.Text;

  public constructor(type?: "first" | "second") {
    super();
    this.type = type;

    // Result item sprite
    this.resultItemSprite = new PIXI.Sprite();
    this.add(this.resultItemSprite);

    // Arrow sprite
    this.arrowSprite = new PIXI.Sprite();
    this.add(this.arrowSprite);

    // Text sprite
    const textSpriteNumberStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(12),
      fill: 0xffffff
    });
    const textSpriteAdditionStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: _s(8),
      fill: 0xffffff
    });
    this.textSpriteNumber = Logic.createPixiText(textSpriteNumberStyle);
    this.textSpriteAddition = Logic.createPixiText(textSpriteAdditionStyle);
    if (this.type === "first") {
      this.textSpriteNumber.text = "1";
      this.textSpriteAddition.text = _t("1stPlaceSuffix");
      this.add(this.textSpriteNumber);
      this.add(this.textSpriteAddition);
    }
    if (this.type === "second") {
      this.textSpriteNumber.text = "2";
      this.textSpriteAddition.text = _t("2ndPlaceSuffix");
      this.add(this.textSpriteNumber);
      this.add(this.textSpriteAddition);
    }
  }

  public onLayout(): void {
    const positionY = 0;
    const positionX = 0;

    // Result item sprite
    this.resultItemSprite.anchor.x = 0.5;
    this.resultItemSprite.anchor.y = 0.5;
    this.resultItemSprite.position.y = _s(this.height / 2);
    this.resultItemSprite.position.x = _s(this.width / 2);
    this.resultItemSprite.height = _s(this.height);
    this.resultItemSprite.width = _s(this.width);

    // Arrow sprite
    this.arrowSprite.height = _s(15);
    this.arrowSprite.width = _s(13);

    if (this.type === "first") {
      this.arrowSprite.position.y = _s(positionY + 10);
      this.arrowSprite.position.x = _s(positionX + 20);
    }

    if (this.type === "second") {
      this.arrowSprite.rotation = (Math.PI * 90.0) / 180.0;
      this.arrowSprite.position.y = _s(positionY + 22);
      this.arrowSprite.position.x = _s(positionX + 28);
    }

    // Text
    if (this.type === "first") {
      this.textSpriteNumber.position.y = _s(positionY + 9);
      this.textSpriteNumber.position.x = _s(positionX + 5);
      this.textSpriteAddition.position.y = _s(positionY + 9);
      this.textSpriteAddition.position.x = _s(positionX + 11);
    }
    if (this.type === "second") {
      this.textSpriteNumber.position.y = _s(positionY + 9);
      this.textSpriteNumber.position.x = _s(positionX + 10);
      this.textSpriteAddition.position.y = _s(positionY + 9);
      this.textSpriteAddition.position.x = _s(positionX + 17);
    }

    if (settings.debug === true) {
      this.resultItemSprite.alpha = 0.5;
    }
  }

  public init(index: number, resultItemTexture: PIXI.Texture<PIXI.Resource>, arrowSpriteTrexture: PIXI.Texture<PIXI.Resource>): void {
    // Inti result item sprite
    const clonedResultItemSpriteTexture = resultItemTexture;
    clonedResultItemSpriteTexture.frame = new PIXI.Rectangle(0, index * 101, 180, 100);
    this.resultItemSprite.texture = clonedResultItemSpriteTexture;

    // Init result item arrow
    const clonedArrowSpriteTrexture = arrowSpriteTrexture;
    this.arrowSprite.texture = clonedArrowSpriteTrexture;
  }

  public fill(): void {}

  public update(dt: number): void {
    super.update(dt);
  }
}
