import * as PIXI from "pixi.js";
import { DynamicGeometry } from "./DynamicMesh";
import { Util } from "common/Util";
import { IAnimInterval } from "client/Logic/LogicDefinitions";

export interface IRenderable {
  update(dt: number): void;
  preRender(): void;
}

export class Group implements IRenderable {
  public container: PIXI.Container = new PIXI.Container();
  public children: IRenderable[] = [];
  private _width: number = 100;
  private _height: number = 100;
  private layoutDirty: boolean = true;
  private debugBackground: PIXI.Graphics | undefined;
  private debugText: PIXI.Text | undefined;

  public constructor() {}

  public showDebugTime(header: string, time: number): void {
    if (this.debugText) this.debugText.text = header + ": " + time.toFixed(2);
  }

  public showDebug(flag: boolean, alpha?: number, header?: string): void {
    if (alpha === undefined) alpha = 1.0;
    this.container.name = header || "";
    if (flag) {
      if (!this.debugBackground) {
        this.debugBackground = new PIXI.Graphics();
        this.add(this.debugBackground);
      }
      if (!this.debugText && header) {
        const debugTextStyle = new PIXI.TextStyle({
          fontFamily: "DIN-Light",
          fontSize: 12,
          fill: "orange"
        });
        this.debugText = new PIXI.Text(header, debugTextStyle);
        this.add(this.debugText);
      }
    } else {
      if (this.debugBackground) {
        this.remove(this.debugBackground);
        this.debugBackground = undefined;
      }
      if (this.debugText) {
        this.remove(this.debugText);
        this.debugText = undefined;
      }
    }
  }

  public setDebugFade(alpha: number) {
    if (this.debugBackground) {
      this.debugBackground.alpha = Util.clamp(alpha, 0, 1);
    }
    if (this.debugText) {
      this.debugText.alpha = Util.clamp(alpha, 0, 1);
    }
  }

  public add(obj: IRenderable | PIXI.DisplayObject | DynamicGeometry) {
    if (obj instanceof Group) {
      this.children.push(obj);
      this.container.addChild(obj.container);
    } else if (obj instanceof PIXI.DisplayObject) {
      this.container.addChild(obj);
    } else if (obj instanceof DynamicGeometry) {
      this.children.push(obj);
      this.container.addChild(obj.mesh);
    }
  }

  public remove(obj: IRenderable | PIXI.DisplayObject | DynamicGeometry | PIXI.Container) {
    if (obj instanceof Group) {
      const index = this.children.indexOf(obj);
      if (index !== -1) this.children.splice(index, 1);
      this.container.removeChild(obj.container);
    } else if (obj instanceof PIXI.DisplayObject) {
      this.container.removeChild(obj);
    } else if (obj instanceof DynamicGeometry) {
      const index = this.children.indexOf(obj);
      if (index !== -1) this.children.splice(index, 1);
      this.container.removeChild(obj.mesh as PIXI.DisplayObject);
    }
  }

  public get position() {
    return this.container.position;
  }

  public get x() {
    return this.position.x;
  }

  public set x(val: number) {
    if (this.position.x !== val) {
      this.position.x = val;
      this.layoutDirty = true;
    }
  }

  public get y() {
    return this.position.y;
  }

  public set y(val: number) {
    if (this.position.y !== val) {
      this.position.y = val;
      this.layoutDirty = true;
    }
  }

  public get width() {
    return this._width;
  }

  public set width(val: number) {
    if (this._width !== val) {
      this._width = val;
      this.layoutDirty = true;
    }
  }

  public set height(val: number) {
    if (this._height !== val) {
      this._height = val;
      this.layoutDirty = true;
    }
  }

  public get height() {
    return this._height;
  }

  public get alpha() {
    return this.container.alpha;
  }

  public set alpha(val: number) {
    this.container.alpha = val;
  }

  public get visible() {
    return this.container.visible;
  }

  public set visible(flag: boolean) {
    this.container.visible = flag;
  }

  public onLayout() {}

  public update(delta: number) {
    for (const c of this.children) {
      if (c instanceof Group) {
        if (c.layoutDirty) c.updateLayout();
      }
      c.update(delta);
    }
  }

  public preRender() {
    for (const c of this.children) {
      c.preRender();
    }
  }

  public updateLayout() {
    this.onLayout();
    if (this.debugBackground) {
      this.debugBackground.width = this.width;
      this.debugBackground.height = this.height;
      this.debugBackground.clear();
      this.debugBackground.lineStyle(1, 0xffffff, 0.5);
      this.debugBackground.beginFill(0xffffff, 0.2);
      this.debugBackground.drawRect(0, 0, this.width, this.height);
      this.debugBackground.endFill();
    }
    this.layoutDirty = false;
  }

  public transformAnim(anim: IAnimInterval, scale: number, offset: number): void {
    anim.startTime = anim.startTime * scale + offset;
    anim.duration = anim.duration * scale;
  }
}
