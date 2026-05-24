import { Group } from "client/Graphics/Group";
import { _s, Logic, settings } from "client/Logic/Logic";
import { IAnimInterval, IDriver, IFightInfo, IFightRoundResult } from "client/Logic/LogicDefinitions";
import { RoundResult } from "./RoundResult";
import { AnimHelper } from "client/VideoScreen/common/Anim";
import { KickboxHelper } from "../KickboxHelper";

export class RoundResultContainer extends Group {
  private scalingGroup: RoundResult;

  private anims: IAnimInterval[] = [
    { startTime: KickboxHelper.fightRoundLength, duration: KickboxHelper.fightRoundResultLength },
    { startTime: KickboxHelper.fightRoundLength * 2 + KickboxHelper.fightRoundResultLength, duration: KickboxHelper.fightRoundResultLength },
    { startTime: KickboxHelper.fightRoundLength * 3 + KickboxHelper.fightRoundResultLength * 2, duration: KickboxHelper.fightRoundResultLength }
  ];
  // private roundResults: IFightRoundResult[] = [];
  // private drivers: IDriver[] = [];

  public constructor() {
    super();
    this.showDebug(settings.debug);

    const roundResult = new RoundResult();
    this.scalingGroup = roundResult;
    this.add(roundResult);
  }

  public fill(fightInfo: IFightInfo, drivers: IDriver[]) {
    // this.roundResults = fightInfo.roundResults;
    // this.drivers = drivers;

    //this.anims = this.roundResults.map(x => { return { startTime: x.startTime, duration: x.duration }});

    this.scalingGroup.fill(fightInfo, drivers);
    this.onLayout();
  }

  public onLayout() {
    this.scalingGroup.x = 0; // _s(1024/2);
    this.scalingGroup.y = 0; // _s(768/2);
  }

  private currentRound = 0;

  public update(dt: number) {
    super.update(dt);

    const t = Logic.getRaceVideoTime();
    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) return;

    //const baseFactor = t - anim.startTime;
    AnimHelper.animateInOut(t, anim.startTime, anim.startTime + anim.duration, 0, 0, 1, (x) => (this.alpha = x), 0, 0);
    // const baseFactor = t - anim.startTime;

    //--------------------------------------------------------------------------------------------
    // TODO: This is bullshit
    if (anim.startTime === this.anims[2].startTime) {
      if (this.currentRound !== 2) {
        this.currentRound = 2;
        this.scalingGroup.setRoundInfo(2);
      }
    } else if (anim.startTime === this.anims[1].startTime) {
      if (this.currentRound !== 1) {
        this.currentRound = 1;
        this.scalingGroup.setRoundInfo(1);
      }
    } else {
      if (this.currentRound !== 0) {
        this.currentRound = 0;
        this.scalingGroup.setRoundInfo(0);
      }
    }

    this.scalingGroup.updateAnims(t - anim.startTime, anim.duration);

    // check in which round we are
    // if (this.roundResults.length > 0){
    //   let currentRow = this.roundResults.length-1;
    //   for (let i = this.roundResults.length-1; i >= 0; i--){

    //     if (t >= this.roundResults[i].startTime+this.roundResults[i].duration)
    //       break;
    //     else
    //       currentRow = i;
    //   }

    // const currentRound = this.roundResults[currentRow];
    // const driver = this.drivers[currentRound.fighter];
    //}
  }
}
