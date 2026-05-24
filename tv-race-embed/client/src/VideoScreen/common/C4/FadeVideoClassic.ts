import { AnimHelper } from "./../Anim";
import { Group } from "client/Graphics/Group";
import { Logic } from "client/Logic/Logic";
import { DynamicMesh } from "client/Graphics/DynamicMesh";
import { GameType } from "common/Definitions";
import { VideoState } from "client/Logic/LogicDefinitions";

export class FadeVideoClassic extends Group {
  private gameType: GameType;
  public constructor(gameType: GameType) {
    super();
    this.gameType = gameType;
  }

  public setFadeX(inFactor: number, overlayImage: DynamicMesh, force?: boolean) {
    const fxFactor = this.calcEasedFactor(inFactor);
    const fo = Math.max((1.0 - fxFactor) * 1.4 - 0.01); // * 0.8 + 0.1;
    if (((this as any).lastFx !== fo || force) && Logic.fadeTarget === VideoState.Intro) {
      overlayImage.alpha = fo;
    }
  }

  private calcEasedFactor(factor: number) {
    const tb = 0.0;
    const te = 0.0;
    const factorEased = AnimHelper.sigmoid(factor, 3.0);
    const ret = te + factorEased * (1 - te + tb);
    if (factor > 0 && factor < 1) console.log("Factor: " + factor + " " + factorEased + " " + ret);
    return ret;
  }
}
