import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { _s, Logic, _t, settings } from "client/Logic/Logic";
import { IAnimInterval, IDriver, IFightInfo, IFightRoundResult, IFightVideo, IFightVideos, VideoState } from "client/Logic/LogicDefinitions";
import { AnimHelper } from "../../common/Anim";
import { LayoutHelper } from "../../Util/LayoutHelper";
import { HalfTypes, RoundFighterInfo } from "./RoundFighterInfo";
import { KickboxHelper } from "../KickboxHelper";

export class RoundInfo extends Group {
  private background: PIXI.Sprite;
  private background2: PIXI.Sprite;
  //private backgroundHeader: PIXI.Sprite;

  private roundText: PIXI.Text;
  private roundNumber: PIXI.Text;

  private roundFighterInfos: RoundFighterInfo[] = [];

  private anims: IAnimInterval[] = [{ startTime: 0, duration: KickboxHelper.fightRoundLength * 3 + KickboxHelper.fightRoundResultLength * 3 }];
  private roundResults: IFightRoundResult[] = [];

  private roundResultHexIcons: PIXI.Sprite[] = [];

  private videos: IFightVideos | undefined;
  private drivers: IDriver[] | undefined;

  private isFading: () => boolean;
  private fadeFx: () => number;
  private getFadeTargetState: () => VideoState;

  public constructor(isFading: () => boolean, getFadeTargetState: () => VideoState, fadeFx: () => number) {
    super();
    this.showDebug(settings.debug, undefined, "RoundInfo");

    this.isFading = isFading;
    this.getFadeTargetState = getFadeTargetState;
    this.fadeFx = fadeFx;

    // this.backgroundHeader = new PIXI.Sprite(Logic.gameInfo?.additionalTextures?.headerImage);
    // this.backgroundHeader.zIndex = -10000;
    // this.add(this.backgroundHeader);

    this.background = new PIXI.Sprite(Logic.gameInfo?.additionalTextures?.inFightImageBig);
    this.add(this.background);

    this.background2 = new PIXI.Sprite(Logic.gameInfo?.additionalTextures?.inFightImage);
    //this.add(this.background2);

    const roundTextStyle = new PIXI.TextStyle({
      fontFamily: "DIN-BoldItalic",
      fontSize: _s(14),
      fill: "white",
      fontStyle: "italic"
    });

    this.roundText = Logic.createPixiText(roundTextStyle);
    this.roundText.anchor.set(0.5, 0.5);
    this.add(this.roundText);

    const roundNumberStyle = new PIXI.TextStyle({
      fontFamily: "DIN-Bold",
      fill: "white",
      fontSize: _s(58)
    });
    this.roundNumber = Logic.createPixiText(roundNumberStyle);
    this.roundNumber.anchor.set(0.5, 0.5);
    this.add(this.roundNumber);

    for (let i = 0; i < 2; i++) {
      const roundFighter = new RoundFighterInfo();
      this.add(roundFighter);
      this.roundFighterInfos.push(roundFighter);
    }

    for (let i = 0; i < 3; i++) {
      const hexIcon = new PIXI.Sprite(Logic.gameInfo?.additionalTextures?.fightResultHexImage);
      this.add(hexIcon);
      this.roundResultHexIcons.push(hexIcon);
    }
  }

  public fill(fightInfo: IFightInfo, drivers: IDriver[], videos: IFightVideos): void {
    this.drivers = drivers;
    this.roundResults = fightInfo.roundResults;
    this.videos = videos;
    //this.anims = [{ startTime: 0, duration: fightInfo.result.startTime}];

    this.roundText.text = _t("round");
    this.roundNumber.text = "1"; // set in updateAnims

    this.roundFighterInfos[0].fill(fightInfo.hits[0], 0, fightInfo.result, drivers[0]);
    this.roundFighterInfos[1].fill(fightInfo.hits[1], 1, fightInfo.result, drivers[1]);
    this.onLayout();
  }

  public onLayout(): void {
    this.background.width = _s(1163 * 0.664);
    this.background.height = _s(293 * 0.664);
    this.background.x = _s(13 * 0.666) - this.x;
    this.background.y = _s(779 * 0.6595) - this.y;

    this.background2.width = _s(1143 * 0.66);
    this.background2.height = _s(133 * 0.66);
    this.background2.x = _s(41 * 0.666) - this.x;
    this.background2.y = _s(863 * 0.66) - this.y;

    // this.backgroundHeader.width = _s(1917*0.66);
    // this.backgroundHeader.height = _s(171*0.66);
    // this.backgroundHeader.x = -this.x;
    // this.backgroundHeader.y = -this.y;

    this.roundNumber.x = _s(82);
    this.roundNumber.y = _s(49);

    this.roundText.x = _s(84);
    this.roundText.y = _s(20);

    LayoutHelper.setScaledRectangle(this.roundFighterInfos[0], 148, 17, 262, 60);
    LayoutHelper.setScaledRectangle(this.roundFighterInfos[1], 448, 17, 262, 60);

    // console.log("RoundInfo scale hexicon0");
    LayoutHelper.setScaledRectangleSprite(this.roundResultHexIcons[0], 16 - 0.5, 22.5, 22.5, 20.5);
    // console.log("RoundInfo scale hexicon1");
    LayoutHelper.setScaledRectangleSprite(this.roundResultHexIcons[1], 16 - 0.5, 45, 22.5, 20.5);
    // console.log("RoundInfo scale hexicon2");
    LayoutHelper.setScaledRectangleSprite(this.roundResultHexIcons[2], -3.5, 33.5, 22.5, 20.5);
  }

  private getRoundLength(videos: IFightVideos, round: number): number {
    let roundVideos: IFightVideo[] = [];
    if (round === 1) roundVideos = videos.round1;
    if (round === 2) roundVideos = videos.round2;
    if (round === 3) roundVideos = videos.round3;
    let roundLength = 0;
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < roundVideos.length; i++) {
      roundLength += roundVideos[i].length;
    }
    return roundLength;
  }

  private getRoundEnd(videos: IFightVideos, round: number): number {
    let end = 0;
    if (round === 1) end = this.getRoundLength(videos, 1); // + videos.round1Result.length;
    if (round === 2) end = this.getRoundLength(videos, 1) + videos.round1Result.length + this.getRoundLength(videos, 2); // + videos.round2Result.length;
    if (round === 3) end = this.getRoundLength(videos, 1) + videos.round1Result.length + this.getRoundLength(videos, 2) + videos.round2Result.length + this.getRoundLength(videos, 3); // + videos.round3Result.length;
    return end;
  }

  private getRoundWithResultEnd(videos: IFightVideos, round: number): number {
    let end = 0;
    if (round === 1) end = this.getRoundLength(videos, 1) + videos.round1Result.length;
    if (round === 2) end = this.getRoundLength(videos, 1) + videos.round1Result.length + this.getRoundLength(videos, 2) + videos.round2Result.length;
    if (round === 3)
      end = this.getRoundLength(videos, 1) + videos.round1Result.length + this.getRoundLength(videos, 2) + videos.round2Result.length + this.getRoundLength(videos, 3) + videos.round3Result.length;
    return end;
  }

  private static getFightResultColor(roundResult: IFightRoundResult, drivers: IDriver[]): number {
    if (this.isTie(roundResult)) return KickboxHelper.getGrayBackgroundColor();
    return drivers[roundResult.fighter].color;
  }

  private static isTie(roundResult: IFightRoundResult): boolean {
    return roundResult.fighter < 0 || roundResult.fighter > 1;
  }

  private lastRound: number = 0;
  private lastRoundWithResult: number = 0;

  private wasInFadeToRace = false;

  private lastFadeToState: VideoState = VideoState.None;

  private lastTBeforeFading = 0;

  public update(dt: number): void {
    super.update(dt);

    // const logicState = Logic.getState();
    // const refState = Logic.videoRef.getState();
    // const refTime = Logic.videoRef.getTime();
    // const logicTimeForFade = Logic.timeForFadeTarget;
    // const logicTimeForPlay = Logic.timeForPlayTarget;

    let t = Logic.getRaceVideoTime();
    // if (!this.isFading() && t !== 0 && !this.wasInFadeToRace){
    //   this.lastTBeforeFading = t;
    //   //console.log("t: " + t);
    // }

    // if (this.wasInFadeToRace && Logic.getVideoTime() > 1 && Logic.getState() === VideoState.Intro){
    //   Logger.warn("videotime: " + Logic.getVideoTime() + " no in wasInFadeToRace anymore");
    //   this.wasInFadeToRace = false;
    //   // this.visible = false;
    //   // this.alpha = 0;
    //   //return;
    // }

    if (Logic.timeForFadeTarget === VideoState.Intro) {
      this.visible = false;
      this.alpha = 0;
      return;
    }

    // if (this.isFading() && Logic.getState() === VideoState.Race && t > 10){ // is fading and was in race  this.getFadeTargetState() !== VideoState.Race
    //   Logger.warn("isFading, TBeforeFading: " + this.lastTBeforeFading + ", setting wasInFadeToRace");
    //     this.wasInFadeToRace = true;
    // }

    //if (this.isFading()){
    // if (Logic.getState() === VideoState.Race)
    //   this.lastFadeToState = VideoState.Race;
    // if (Logic.getState() ===  VideoState.Intro)
    //   this.lastFadeToState = VideoState.Intro;
    //}

    // if in state intro -> return
    if (Logic.getState() === VideoState.Intro) {
      this.visible = false;
      this.alpha = 0;
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < this.roundFighterInfos.length; i++) {
        this.roundFighterInfos[i].resetToZero();
      }
      return;
    }

    // if fading to intro -> return
    if (this.isFading() && this.getFadeTargetState() !== VideoState.Race) {
      this.visible = false;
      this.alpha = 0;
      return;
    }

    // if fading to race but at first part while intro is visible -> return
    if (this.isFading() && this.fadeFx() > 0.5) {
      this.visible = false;
      this.alpha = 0;
      return;
    }

    // if outside anim duration (0 - vor kampf) -> return

    if (t < 0 || t > this.anims[0].duration) {
      this.visible = false;
      this.alpha = 0;
      return;
    }

    if (this.wasInFadeToRace) {
      this.visible = false;
      this.alpha = 0;
      return;
    }

    // if (this.lastFadeToState === VideoState.Intro){
    //   //this.lastFadeToState = VideoState.None;
    //   this.visible = false;
    //   this.alpha = 0;
    //   return;
    // }

    // showing bar
    this.visible = true;

    // if fading in second half -> fade it in instantly
    if (this.isFading() && this.fadeFx() <= 0.5)
      // only show bar when fully faded out
      t = 0.1;

    t = Math.max(t, 0);

    //console.log("showing roundinfo visible, t: " + t);

    const anim = Logic.getAnim(t, this.anims, this);
    if (!anim) {
      return;
    }

    const baseFactor = t - anim.startTime;
    this.showDebugTime("RoundInfo", baseFactor);

    // if (this.roundResults.length > 0){
    //   let currentRow = this.roundResults.length-1;
    //   for (let i = this.roundResults.length-1; i >= 0; i--){

    //     if (t >= this.roundResults[i]+this.roundResults[i].)
    //       break;
    //     else
    //       currentRow = i;
    //   }
    //   this.roundNumber.text = "" + this.roundResults[currentRow].round;
    // }

    if (this.videos && this.drivers) {
      let round = 1;
      if (t < 0) round = 0;
      else if (t < this.getRoundEnd(this.videos, 1)) round = 1;
      else if (t < this.getRoundEnd(this.videos, 2)) round = 2;
      else if (t < this.getRoundEnd(this.videos, 3)) round = 3;
      else round = 4;

      let roundWithResult = 1;
      if (t < 0) roundWithResult = 0;
      else if (t < this.getRoundWithResultEnd(this.videos, 1)) roundWithResult = 1;
      else if (t < this.getRoundWithResultEnd(this.videos, 2)) roundWithResult = 2;
      else if (t < this.getRoundWithResultEnd(this.videos, 3)) roundWithResult = 3;
      else roundWithResult = 4;

      if (round !== this.lastRound) {
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let i = 0; i < this.roundFighterInfos.length; i++) {
          this.roundFighterInfos[i].switchToNewRound(round, roundWithResult);
        }
      }

      this.roundNumber.text = "" + roundWithResult;

      const round1Color = RoundInfo.getFightResultColor(this.roundResults[0], this.drivers);
      const round2Color = RoundInfo.getFightResultColor(this.roundResults[1], this.drivers);
      const round3Color = RoundInfo.getFightResultColor(this.roundResults[2], this.drivers);
      this.roundResultHexIcons[0].visible = round > 1;
      this.roundResultHexIcons[0].tint = round1Color;

      this.roundResultHexIcons[1].visible = round > 2;
      this.roundResultHexIcons[1].tint = round2Color;

      this.roundResultHexIcons[2].visible = round > 3;
      this.roundResultHexIcons[2].tint = round3Color;
    }

    AnimHelper.animateIn(baseFactor, -0.1, anim.duration, 0.0, 0, 1, (x) => (this.background.alpha = x));

    AnimHelper.animateInOut(baseFactor, -0.1, anim.duration, 0.0, 0, 1, (x) => (this.alpha = x), 1, 0);
    // const baseFactor = t - anim.startTime;

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    let maxHits = 0;
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < this.roundFighterInfos.length; i++) {
      this.roundFighterInfos[i].updateAnims(baseFactor, anim.duration);
      maxHits = Math.max(maxHits, this.roundFighterInfos[i].currentHitCount);
    }

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < this.roundFighterInfos.length; i++) {
      let halfType: HalfTypes = HalfTypes.FULL;
      if (maxHits <= 8) halfType = HalfTypes.FULL;
      else if (maxHits <= 16) halfType = HalfTypes.HALF;
      else if (maxHits <= 32) halfType = HalfTypes.QUARTER;
      else halfType = HalfTypes.EIGHTH;
      this.roundFighterInfos[i].SetWidth(halfType);
    }
  }
}
