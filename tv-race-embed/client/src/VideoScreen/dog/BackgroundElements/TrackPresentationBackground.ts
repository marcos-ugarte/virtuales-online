import { Group } from "client/Graphics/Group";
import { _s, Logic } from "client/Logic/Logic";
import { AnimHelper } from "client/VideoScreen/common/Anim";
import { DrawHelper, Fill } from "client/VideoScreen/common/DrawHelper";
import { UIHelper } from "client/VideoScreen/UIHelper";
import { Color, ColorSource, Container, Graphics, NineSlicePlane, Sprite, Texture } from "pixi.js";
interface ITexDescription {
  type: "round";
  tex: Texture;
  radius: number;
}
export class TrackPresentationBackground extends Group {
  public fadeInTime: number = 0;
  public fadeOutTime: number = Number.MAX_VALUE;
  public anims: any[] = [];

  public mask = new Graphics();
  private topGraphics = new Sprite();
  private bottomGraphics: NineSlicePlane = UIHelper.createNineSlicePlane();

  public constructor() {
    super();
    this.container.name = "TrackPresentationBackground";
    this.mask.name = "mask";
    this.add(this.mask);
    this.add(this.topGraphics);
    this.add(this.bottomGraphics);
    this.bottomGraphics.mask = this.mask;
    this.topGraphics.mask = this.mask;
  }

  public onLayout() {
    const gameType = Logic.getGameInfo()?.gameType;
    const color: Fill[] =
      gameType === "dog8"
        ? [
            {
              type: "mixed",
              color: "#215443",
              color2: "#070f0d",
              verti: true,
              start: -0.25,
              end: 0.8,
              opacity: 0.8
            }
          ]
        : [
            /*{
              type: "gradient",
              color: "#1658e5",
              color2: "#082969",
              verti: true,
              opacity: 0.9
            },*/
            {
              type: "mixed",
              color: "#022841",
              color2: "#04172a",
              verti: true,
              start: -0.25,
              end: 0.8,
              opacity: 0.8
            }
          ];
    /*this.topGraphics.beginFill(color, 0.539); // Light blue color
    this.topGraphics.drawRect(-_s(10), -_s(10), _s(580), _s(465));
    this.topGraphics.endFill();*/
    this.topGraphics.texture = DrawHelper.createSkewedRoundedRectangleTexture(_s(580), _s(465), 0, 0, color);
    this.topGraphics.x = -_s(10);
    this.topGraphics.y = -_s(10);

    const width = _s(486);
    const height = _s(445);

    DrawHelper.createRoundedMask(this.mask, width, height, true, {
      topLeft: _s(67),
      bottomLeft: _s(0),
      bottomRight: _s(70),
      topRight: _s(0)
    });

    const texRadius70Bottom = this.createTexRoundOneCorner(width, height, _s(30), {
      topLeft: _s(8),
      bottomLeft: _s(0),
      bottomRight: _s(10),
      topRight: _s(0)
    });

    this.createRound(this.bottomGraphics, texRadius70Bottom, width, _s(40), "#ffffff", 1);
    this.mask.x = _s(74);
    this.mask.y = _s(-1);

    this.bottomGraphics.x = _s(6);
    this.bottomGraphics.y = height - _s(40);
  }

  public update(dt: number) {
    super.update(dt);
  }

  private createTexRoundOneCorner(width: number, height: number, skewX: number, config: { topLeft: number; bottomLeft: number; bottomRight: number; topRight: number }) {
    const { topLeft, bottomLeft, bottomRight, topRight } = config;
    const radiusInfo: ITexDescription = {
      type: "round",
      tex: DrawHelper.createCustomSkewedRoundedRectangleTexture(
        _s(400),
        _s(200),
        _s(30),
        {
          topLeft,
          bottomLeft,
          bottomRight,
          topRight
        },
        { type: "solid", color: "white" }
      ),
      radius: topLeft
    };
    return radiusInfo;
  }

  private createRound(item: NineSlicePlane, desc: ITexDescription, width: number, height: number, tint: ColorSource, alpha: number) {
    item.texture = desc.tex;
    item.leftWidth = desc.radius;
    item.rightWidth = desc.radius;
    item.topHeight = desc.radius;
    item.bottomHeight = desc.radius;

    item.tint = tint;
    item.width = width;
    item.height = height;
    item.transform.setFromMatrix(UIHelper.getSkewMatrix(item.height));
    item.alpha = alpha;
  }
}
