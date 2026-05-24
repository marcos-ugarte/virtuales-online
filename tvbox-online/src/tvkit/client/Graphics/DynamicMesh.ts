/**
 * STUB vendored DynamicMesh — for the tvbox RaceBarDog port.
 *
 * The real DynamicMesh pulls in the Engine/Shader stack which RaceBarDog never
 * touches. Group.ts only references `DynamicGeometry` for `instanceof` checks
 * in add()/remove(); since RaceBarDog never adds a DynamicGeometry, an empty
 * class with a `mesh` field is enough to keep those checks compiling and
 * never matching.
 */
import * as PIXI from "pixi.js";

export class DynamicGeometry {
  public mesh: PIXI.DisplayObject = new PIXI.Container();
  public update(_dt: number): void {}
  public preRender(): void {}
}
