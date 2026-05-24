import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic } from "client/Logic/Logic";
import { DynamicGeometry, DynamicMesh } from "client/Graphics/DynamicMesh";
import { VideoState } from "client/Logic/LogicDefinitions";
import { Logger } from "client/Logic/Logger";
import { FadeVideoKart } from "./FadeVideoKart";
import { FadeVideoDog } from "./FadeVideoDog";
import { FadeVideoKickBox } from "./FadeVideoKickBox";
import { FadeVideoHorse } from "./FadeVideoHorse";
import { FadeVideoClassic } from "./C4/FadeVideoClassic";
import { FadeDurations } from "common/FadeDurations";

export class FadeVideo extends Group {
  private overlayImageGeometry: DynamicGeometry;
  private overlayImage: DynamicMesh;
  public currentTime = 0;
  public isFading = false;
  public useOverlays: boolean;
  public targetState: VideoState = VideoState.None;
  public raceTexture: PIXI.Texture | undefined;
  public introTexture: PIXI.Texture | undefined;
  public fadeItems: FadeVideoKart | FadeVideoDog | FadeVideoKickBox | FadeVideoHorse | FadeVideoClassic | undefined;

  public constructor(gameFade: FadeVideoKart | FadeVideoDog | FadeVideoKickBox | FadeVideoHorse | FadeVideoClassic, useOverlays = false) {
    super();

    this.useOverlays = useOverlays;

    this.overlayImageGeometry = new DynamicGeometry("Pos2ColorTexture", 4, 6);
    this.add(this.overlayImageGeometry);

    this.overlayImage = new DynamicMesh();
    this.overlayImage.setIndices([0, 1, 2, 0, 2, 3]);
    this.overlayImage.setPositions([0, 0, 0, 0, 0, 0, 0, 0]);
    this.overlayImage.setColors([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff]);
    this.overlayImage.setUvs([0, 0, 1, 0, 1, 1, 0, 1]);
    this.overlayImageGeometry.add(this.overlayImage);

    this.fadeItems = gameFade;
  }

  public onLayout() {
    if (this.fadeItems) {
      this.fadeItems.width = this.width;
      this.fadeItems.height = this.height;

      this.overlayImage.setPositions([0, 0, this.width, 0, this.width, this.height, 0, this.height]);
      this.overlayImage.setUvs([0, 0, 1, 0, 1, 1, 0, 1]);
    }
  }

  private setFadeX(factor: number, force?: boolean) {
    if (this.fadeItems) this.fadeItems.setFadeX(factor, this.overlayImage, force);
  }

  private getFadeDuration() {
    const asKickboxVideo = this.fadeItems instanceof FadeVideoKickBox;
    if (asKickboxVideo === true) {
      return (this.fadeItems as FadeVideoKickBox).getTotalFadeDuration();
    }

    return FadeDurations.totalFadeDuration;
  }

  public update(dt: number) {
    super.update(dt);
  }

  public getFx(): number {
    const fx = Math.max(1.0 - this.currentTime / this.getFadeDuration(), 0.0);
    return fx;
  }

  public updateFade(dt: number) {
    const fadeDuration = this.getFadeDuration();

    if (this.isFading) {
      this.currentTime += dt;
      //console.log(this.currentTime);
      const fx = Math.max(1.0 - this.currentTime / fadeDuration, 0.0);

      // if (fx < 0.501)
      //   fx = 0.501;

      const isKickboxVideo = this.fadeItems instanceof FadeVideoKickBox;
      if (isKickboxVideo === true) {
        const fadeVideoKickbox = this.fadeItems as FadeVideoKickBox;
        if (this.targetState === VideoState.Intro) {
          if (fx <= 0.51) this.overlayImage.alpha = 1;
          fadeVideoKickbox.visible = false; // do not show fadeanimation on transition from race to intro - bug hold overlayImage visible
        } else fadeVideoKickbox.visible = true;

        // kickbox - trigger video start when closed doors - middle of fade animation
        if (fx <= 0.5) {
          if (Logic.timeForPlayTarget !== this.targetState) {
            Logic.onTimeForPlay(this.targetState);
          }
          if (Logic.isVideoPlaying()) {
            this.overlayImage.alpha = 0;
          }
        }
        if (fx <= 0.0) {
          // stop the fader when fading is finished and the video is playing
          if (Logic.isVideoPlaying()) this.stopFading();
        }

        if (fadeVideoKickbox.visible) this.setFadeX(fx);
      } else {
        let fadeReferenceTime = this.useOverlays ? 0.2 : 0.0;

        if (this.targetState === VideoState.Intro) {
          fadeReferenceTime += FadeDurations.startVideoFactorIntro;
        } else if (this.targetState === VideoState.Race) {
          fadeReferenceTime = FadeDurations.startVideoFactorRace;
        }

        if (fx <= fadeReferenceTime) {
          Logic.onTimeForPlay(this.targetState);
          if (Logic.isVideoPlaying()) this.stopFading();
        }

        this.setFadeX(fx);
      }

      return 1.0 - fx;
    } else {
      this.setFadeX(0.0, undefined);
      if (this.overlayImage.alpha !== 0) {
        this.overlayImage.alpha = 0;
        console.log("Fading Alpha === 0");
      }
      return 0;
    }
  }

  public startFading(toState: VideoState) {
    if (this.isFading && this.targetState === toState) return;
    this.targetState = toState;
    this.overlayImageGeometry.shader.uniforms.tex = toState === VideoState.Intro ? this.introTexture : this.raceTexture;
    this.currentTime = 0.0;
    this.overlayImage.alpha = 1;
    this.isFading = true;
  }

  public isFadeFinished() {
    return this.currentTime >= this.getFadeDuration();
  }

  public stopFading() {
    if (this.isFading) Logger.debug("StopFading");
    this.targetState = VideoState.None;
    this.currentTime = this.getFadeDuration();
    this.isFading = false;
  }
}
