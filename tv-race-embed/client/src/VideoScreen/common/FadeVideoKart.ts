import { Group } from "client/Graphics/Group";
import { DynamicMesh, DynamicGeometry } from "client/Graphics/DynamicMesh";
import { _s } from "client/Logic/Logic";
import { AnimHelper } from "./Anim";

export class FadeVideoKart extends Group {
  private mainBar: DynamicMesh;
  private redBar: DynamicMesh;
  private redBar2: DynamicMesh;
  private whiteBar: DynamicMesh;
  private redCenter: DynamicMesh;
  private redCenter2: DynamicMesh;

  public constructor() {
    super();

    const dg = new DynamicGeometry("Pos2Color", 24, 36);
    this.add(dg);

    this.redBar = new DynamicMesh();
    this.redBar.setIndices([0, 1, 2, 0, 2, 3]);
    this.redBar.setPositions([0, 0, 0, 0, 0, 0, 0, 0]);
    this.redBar.setColors([0xb0e51800, 0xb0e51800, 0x50e51800, 0x50e51800]);
    this.redBar.color = 0xffffffff;
    dg.add(this.redBar);

    this.redBar2 = new DynamicMesh();
    this.redBar2.setIndices([0, 1, 2, 0, 2, 3]);
    this.redBar2.setPositions([0, 0, 0, 0, 0, 0, 0, 0]);
    this.redBar2.setColors([0xb0e51800, 0xb0e51800, 0x50e51800, 0x50e51800]);
    this.redBar2.color = 0xffffffff;
    dg.add(this.redBar2);

    this.whiteBar = new DynamicMesh();
    this.whiteBar.setIndices([0, 1, 2, 0, 2, 3]);
    this.whiteBar.setPositions([0, 0, 0, 0, 0, 0, 0, 0]);
    this.whiteBar.setColors([0xffffffff, 0xffffffff, 0xb0ffffff, 0xb0ffffff]);
    this.whiteBar.color = 0xffcccccc;
    dg.add(this.whiteBar);

    this.mainBar = new DynamicMesh();
    this.mainBar.setIndices([0, 1, 2, 0, 2, 3]);
    this.mainBar.setPositions([0, 0, 0, 0, 0, 0, 0, 0]);
    this.mainBar.setColors([0xff000000, 0xff000000, 0x90000000, 0x90000000]);
    this.mainBar.color = 0xffffffff;
    dg.add(this.mainBar);

    this.redCenter = new DynamicMesh();
    this.redCenter.setIndices([0, 1, 2, 0, 2, 3]);
    this.redCenter.setPositions([0, 0, 0, 0, 0, 0, 0, 0]);
    this.redCenter.setColors([0xffe51800, 0xffe51800, 0xb0e51800, 0xb0e51800]);
    this.redCenter.color = 0xffffffff;
    dg.add(this.redCenter);

    this.redCenter2 = new DynamicMesh();
    this.redCenter2.setIndices([0, 1, 2, 0, 2, 3]);
    this.redCenter2.setPositions([0, 0, 0, 0, 0, 0, 0, 0]);
    this.redCenter2.setColors([0xffe51800, 0xffe51800, 0xb0e51800, 0xb0e51800]);
    this.redCenter2.color = 0xffffffff;
    dg.add(this.redCenter2);
  }

  public getDx() {
    return this.height * 0.5;
  }

  public onLayout() {
    const w = _s(200);
    const dx = this.getDx();
    const positionsBig = [0, 0, w, 0, w + dx, this.height, +dx, this.height];
    this.redBar.setPositions(positionsBig);
    this.redBar2.setPositions(positionsBig);
    this.mainBar.setPositions(positionsBig);
    this.whiteBar.setPositions(positionsBig);
    const w2 = _s(90);
    const h2 = this.height * 0.3;
    const dx2 = h2 * 0.5;
    const positionsSmall = [0, 0, w2, 0, w2 + dx2, h2, +dx2, h2];
    this.redCenter.setPositions(positionsSmall);
    this.redCenter2.setPositions(positionsSmall);
  }

  public setFadeX(inFactor: number, overlayImage: DynamicMesh, force?: boolean) {
    const fxFactor = this.calcEasedFactor(inFactor);
    const alpha = inFactor < 0 || inFactor > 1.0 ? 0 : 1;

    const f = 1 - fxFactor;
    this.mainBar.x = _s(fxFactor * 1280 - 50 + f * 100);
    this.mainBar.alpha = alpha;
    this.redBar.x = this.mainBar.x + _s(-10 - f * 200);
    this.redBar.alpha = alpha;
    this.redCenter.x = this.mainBar.x + _s(-50 + f * 150);
    this.redCenter.y = this.height * 0.25;
    this.redCenter.alpha = alpha;
    this.redCenter2.x = this.mainBar.x + _s(180 - f * 180);
    this.redCenter2.y = this.height * 0.55;
    this.redCenter2.alpha = alpha;
    this.redBar2.x = this.mainBar.x + _s(50 + f * 200);
    this.redBar2.y = this.height * 0.25;
    this.redBar2.alpha = alpha;
    this.whiteBar.x = this.mainBar.x + _s(600 + f * -290);
    this.whiteBar.y = this.redBar2.y;
    this.whiteBar.alpha = alpha;

    // update overlay image
    if ((this as any).lastFx !== fxFactor || force) {
      const dx = this.getDx();
      overlayImage.setPositions([fxFactor * this.width, 0, this.width, 0, Math.max(this.width, fxFactor * this.width + dx), this.height, fxFactor * this.width + dx, this.height]);
      overlayImage.setUvs([fxFactor, 0, 1, 0, 1, 1, fxFactor + dx / this.width, 1]);
      (this as any).lastFx = fxFactor;
    }
  }

  private calcEasedFactor(factor: number) {
    const tb = 0.1;
    const te = -0.83;
    const factorEased = AnimHelper.sigmoid(factor, 3.0);
    const ret = te + factorEased * (1 - te + tb);
    // if (factor > 0 && factor < 1)
    //  console.log("Factor: " + factor + " " + factorEased + " " + ret);
    return ret;
  }
}
