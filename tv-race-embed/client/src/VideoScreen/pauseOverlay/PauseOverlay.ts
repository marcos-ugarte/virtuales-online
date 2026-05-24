import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import { IGameInfo, IRoundInfo } from "client/Logic/LogicDefinitions";
import { PauseOverlayDog } from "./PauseOverlayDog";
import { PauseOverlayKart } from "./PauseOverlayKart";
import { PauseOverlayKickbox } from "./PauseOverlayKickbox";
import { PauseOverlayHorse } from "./PauseOverlayHorse";

export class PauseOverlay extends Group {
  private pauseOverlay: PauseOverlayDog | PauseOverlayKart | PauseOverlayKickbox | PauseOverlayHorse;
  private nextRaceTime: Date | undefined;
  public raceCanceled = false;

  public constructor(gameInfo: IGameInfo) {
    super();

    if (gameInfo.gameType === "dog6" || gameInfo.gameType === "dog8" || gameInfo.gameType === "dog63") {
      this.pauseOverlay = new PauseOverlayDog(gameInfo);
    } else if (gameInfo.gameType === "box") {
      this.pauseOverlay = new PauseOverlayKickbox();
    } else if (gameInfo.gameType === "horse" || gameInfo.gameType === "sulky") {
      this.pauseOverlay = new PauseOverlayHorse(gameInfo);
    } else {
      this.pauseOverlay = new PauseOverlayKart(gameInfo);
    }
    this.pauseOverlay.centerText.text = "09:00";
    this.pauseOverlay.bottomText.text = "PROSSIMA PARTENZA";
    this.add(this.pauseOverlay);

    this.setNextRaceTime(undefined);
  }

  public async init() {
    await this.pauseOverlay.init();
  }

  public onLayout() {
    this.pauseOverlay.width = this.width;
    this.pauseOverlay.height = this.height;
  }

  public update(dt: number) {
    super.update(dt);
    if (this.visible) {
      if (this.nextRaceTime) this.pauseOverlay.updateNextRaceTime((this.nextRaceTime.valueOf() - Date.now()) / 1000);
    }
  }

  public setTimeText(text: string) {
    this.pauseOverlay.centerText.text = text;
    Logic.autoSize(this.pauseOverlay.centerText, _s(360));
  }

  public setBottomText(text: string) {
    this.pauseOverlay.bottomText.text = text;
    Logic.autoSize(this.pauseOverlay.bottomText, _s(360));
  }

  public setNextRaceTime(time: Date | undefined) {
    this.nextRaceTime = time;
    if (time === undefined) this.pauseOverlay.updateNextRaceTime(undefined);
  }

  public setNextRound(round: IRoundInfo | undefined) {
    this.pauseOverlay.setNextRound(round);
  }
}
