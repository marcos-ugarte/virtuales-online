import * as PIXI from "pixi.js";
import { Engine, ShaderType } from "./Engine";
import { IRenderable } from "./Group";
import { IPointLike } from "common/Definitions";
import { IColorValues, Color } from "common/Color";

type INewable<T> = new (...params: any[]) => T;

type PossibleTypes = Float32Array | Uint16Array | Uint32Array | Uint8Array;
export class GeometryBuffer<T extends PossibleTypes> {
  public buffer: T;
  public vertexCount: number;
  public elementSize: number;
  public nativeBuffer: any;

  private constructor(buffer: T, vertexCount: number, elementSize: number) {
    this.buffer = buffer;
    this.vertexCount = vertexCount;
    this.elementSize = elementSize;
  }

  public static create<T extends PossibleTypes>(type: INewable<T>, vertexCount: number, elementSize: number) {
    const b = new type(vertexCount * elementSize);
    return new GeometryBuffer(b, vertexCount, elementSize);
  }

  public subarray(vertexIndex: number, vertexCount: number) {
    const b = this.buffer.subarray(vertexIndex * this.elementSize, (vertexIndex + vertexCount) * this.elementSize) as T;
    const gb = new GeometryBuffer(b, vertexCount, this.elementSize);
    return gb;
  }

  public set(array: ArrayLike<number>, offset?: number) {
    if (!offset) offset = 0;
    this.buffer.set(array, offset * this.elementSize);
    this.dirtyfy();
  }

  public setARGB(argb: number, offset?: number, premul?: boolean) {
    this.setColor(argb, offset, premul);
  }

  public setRGBA(rgba: number, offset?: number, premul?: boolean) {
    const argb = Color.RGBAtoARGB(rgba);
    this.setColor(argb, offset, premul);
  }

  public setColor(argb: number, offset?: number, premul?: boolean) {
    if (offset === undefined) offset = 0;
    const val = { r: 0, g: 0, b: 0, a: 0 };
    Color.fillARGB(argb, val);
    val.a = val.a / 255.0;

    if (premul) this.buffer.set([(val.r * val.a) / 255, (val.g * val.a) / 255, (val.b * val.a) / 255, val.a], offset * 4);
    else this.buffer.set([val.r / 255, val.g / 255, val.b / 255, val.a], offset * 4);
    this.dirtyfy();
  }

  public dirtyfy() {
    if (this.nativeBuffer) this.nativeBuffer._updateID++;
  }
}

export class DynamicGeometry implements IRenderable {
  public geometry!: PIXI.Geometry;
  public positions!: GeometryBuffer<Float32Array>;
  public uvs?: GeometryBuffer<Float32Array>;
  public colors!: GeometryBuffer<Float32Array>;
  public indices!: GeometryBuffer<Uint16Array>;
  public mesh!: PIXI.Mesh;
  public vertexCount: number = 0;
  public vertexCapacity: number = 0;
  public indexCount: number = 0;
  public indexCapacity: number = 0;
  public subMeshes: DynamicMeshBase[] = [];
  public shader!: PIXI.Shader;

  public constructor(shaderType: ShaderType, vertexCapacity?: number, indexCapacity?: number) {
    if (!vertexCapacity) vertexCapacity = 16;
    if (!indexCapacity) indexCapacity = 16;
    this.resize(vertexCapacity, indexCapacity, shaderType);
  }

  public resize(vertexCapacity: number, indexCapacity: number, shaderType: ShaderType) {
    this.vertexCapacity = vertexCapacity;
    this.indexCapacity = indexCapacity;
    if (this.geometry !== undefined) this.geometry.dispose();
    this.geometry = new PIXI.Geometry();

    this.positions = GeometryBuffer.create(Float32Array, vertexCapacity, 2);
    const ret = this.geometry.addAttribute("pos2", this.positions.buffer as any, this.positions.elementSize) as any;
    this.positions.nativeBuffer = ret.buffers[ret.buffers.length - 1];

    this.colors = GeometryBuffer.create(Float32Array, vertexCapacity, 4);
    this.geometry.addAttribute("color", this.colors.buffer as any, this.colors.elementSize);
    this.colors.nativeBuffer = ret.buffers[ret.buffers.length - 1];

    if (shaderType === "Pos2ColorTexture") {
      this.uvs = GeometryBuffer.create(Float32Array, vertexCapacity, 2);
      this.geometry.addAttribute("uv2", this.uvs.buffer as any, this.uvs.elementSize);
      this.uvs.nativeBuffer = ret.buffers[ret.buffers.length - 1];
    }

    this.indices = GeometryBuffer.create(Uint16Array, indexCapacity, 1);
    this.geometry.addIndex(this.indices.buffer as any);
    this.indices.nativeBuffer = ret.buffers[ret.buffers.length - 1];

    const uniforms = shaderType === "Pos2ColorTexture" ? { tex: null } : {};
    this.shader = new PIXI.Shader(Engine.instance.getProgram(shaderType), uniforms);
    if (this.mesh !== undefined) this.mesh.destroy();
    this.mesh = new PIXI.Mesh(this.geometry, this.shader as PIXI.MeshMaterial); // !!!!!
  }

  public reserveVertices(count: number) {
    if (this.vertexCount + count > this.vertexCapacity) throw new Error("VertexBuffer to small!");
    const current = this.vertexCount;
    this.vertexCount += count;
    return current;
  }

  public reserveIndices(count: number) {
    if (this.indexCount + count > this.indexCapacity) throw new Error("IndexBuffer to small!");
    const current = this.indexCount;
    this.indexCount += count;
    return current;
  }

  public add(rect: DynamicMeshBase) {
    rect.attach(this);
    this.subMeshes.push(rect);
  }

  public update(dt: number) {}

  public preRender() {
    for (const sm of this.subMeshes) {
      sm.preRender();
    }
  }
}

export class DynamicMeshBase {
  protected dm?: DynamicGeometry;
  protected vertexOffset: number = 0;
  protected indexOffset: number = 0;
  protected dirtyPosition: boolean = true;
  protected dirtyColor: boolean = false;
  protected dirtyIndices: boolean = false;
  protected dirtyUvs: boolean = false;

  protected _x = 0;
  public get x() {
    return this._x;
  }
  public set x(val: number) {
    if (this._x !== val) {
      this._x = val;
      this.dirtyPosition = true;
    }
  }

  protected _y = 0;
  public get y() {
    return this._y;
  }
  public set y(val: number) {
    if (this._y !== val) {
      this._y = val;
      this.dirtyPosition = true;
    }
  }

  protected _color: number = 0xffffffff;
  public set color(val: number) {
    if (this._color !== val) {
      this._color = val;
      this.dirtyColor = true;
    }
  }

  public get color() {
    return this._color;
  }

  public set alpha(a: number) {
    const newColor = Color.updateAlpha(this._color, a);
    this.color = newColor;
  }

  public get alpha() {
    return Color.a(this._color) / 255.0;
  }

  protected preRenderColor(argb: number, vertexOffset: number, count: number) {
    if (this.dirtyColor && this.dm) {
      for (let i = 0; i < count; i++) this.dm.colors.setARGB(argb, vertexOffset + i, true);
      this.dirtyColor = false;
    }
  }

  protected preRenderColors(colors: number[], color: number, vertexOffset: number) {
    if (this.dirtyColor && this.dm) {
      const mulColorValues: IColorValues = { r: 0.0, g: 0.0, b: 0.0, a: 0.0 };
      Color.fillARGB(color, mulColorValues);
      const colorValues: IColorValues = { r: 0.0, g: 0.0, b: 0.0, a: 0.0 };
      for (let i = 0; i < colors.length; i++) {
        Color.fillARGB(colors[i], colorValues);
        const fc = Color.mulValues(colorValues, mulColorValues);
        this.dm.colors.setColor(fc, vertexOffset + i, true);
      }
      this.dirtyColor = false;
    }
  }

  protected preRenderPositions(positions: number[], vertexOffset: number, offset?: IPointLike) {
    if (this.dirtyPosition && this.dm) {
      if (offset === undefined) this.dm.positions.set(positions, vertexOffset);
      else {
        const pos = [...positions];
        for (let i = 0; i < pos.length; i += 2) {
          pos[i] = pos[i] + offset.x;
          pos[i + 1] = pos[i + 1] + offset.y;
        }
        this.dm.positions.set(pos, vertexOffset);
      }
      this.dirtyPosition = false;
    }
  }

  protected preRenderUvs(uvs: number[], vertexOffset: number) {
    if (this.dirtyUvs && this.dm && uvs.length > 0 && this.dm.uvs) {
      this.dm.uvs.set(uvs, vertexOffset);
      this.dirtyUvs = false;
    }
  }

  protected preRenderIndices(indices: number[], indexOffset: number, vertexOffset: number) {
    if (this.dirtyIndices && this.dm) {
      const ind: number[] = [...indices];
      for (let i = 0; i < indices.length; i++) {
        ind[i] += vertexOffset;
      }
      this.dm.indices.set(ind, indexOffset);
      this.dirtyIndices = false;
    }
  }

  protected onAttached() {}

  public attach(dm: DynamicGeometry) {
    this.dm = dm;
    this.onAttached();
  }

  public preRender() {}
}

export class DynamicMesh extends DynamicMeshBase {
  private uvs: number[] = [];
  private positions: number[] = [];
  private indices: number[] = [];
  private colors: number[] = [];

  public constructor() {
    super();
  }

  public onAttached() {
    if (this.dm) {
      this.vertexOffset = this.dm.reserveVertices(this.positions.length / 2);
      this.indexOffset = this.dm.reserveIndices(this.indices.length);
    }
  }

  public preRender() {
    if (this.dm) {
      this.preRenderIndices(this.indices, this.indexOffset, this.vertexOffset);
      this.preRenderPositions(this.positions, this.vertexOffset, { x: this.x, y: this.y });
      this.preRenderColors(this.colors, this.color, this.vertexOffset);
      this.preRenderUvs(this.uvs, this.vertexOffset);
    }
  }

  public setPositions(positions: number[]) {
    if (this.dm && this.positions.length !== positions.length) throw new Error("Already attached!");
    this.positions = positions;
    this.dirtyPosition = true;
  }

  public setIndices(indices: number[]) {
    if (this.dm && this.indices.length !== indices.length) throw new Error("Already attached!");
    this.indices = indices;
    this.dirtyIndices = true;
  }

  public setUvs(uvs: number[]) {
    if (this.dm && this.uvs.length !== uvs.length) throw new Error("Already attached!");
    this.uvs = uvs;
    this.dirtyUvs = true;
  }

  public setColors(colors: number[]) {
    if (this.dm && this.colors.length !== colors.length) throw new Error("Alreay attached!");
    this.colors = colors;
    this.dirtyColor = true;
  }
}

export class DynamicMeshRect extends DynamicMeshBase {
  private _width = 100;
  public get width() {
    return this._width;
  }
  public set width(val: number) {
    if (this._width !== val) {
      this._width = val;
      this.dirtyPosition = true;
    }
  }

  private _height = 100;
  public get height() {
    return this._height;
  }
  public set height(val: number) {
    if (this._height !== val) {
      this._height = val;
      this.dirtyPosition = true;
    }
  }

  public constructor() {
    super();
  }

  public onAttached() {
    if (this.dm) {
      this.vertexOffset = this.dm.reserveVertices(4);
      this.indexOffset = this.dm.reserveIndices(6);
      this.dm.indices.set([this.vertexOffset + 0, this.vertexOffset + 1, this.vertexOffset + 2, this.vertexOffset + 0, this.vertexOffset + 2, this.vertexOffset + 3], this.indexOffset);
    }
  }

  public preRender() {
    if (this.dm) {
      this.preRenderPositions([this._x, this._y, this._x + this._width, this._y, this._x + this._width, this._y + this._height, this._x, this._y + this._height], this.vertexOffset);
      this.preRenderColor(this._color, this.vertexOffset, 4);
    }
  }
}
