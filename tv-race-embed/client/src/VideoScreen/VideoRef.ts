import { makeObservable, observable } from "mobx";
import { DoubleVideoSource } from "./DoubleVideoSource";
import { ErrorHelper } from "client/Logic/ErrorHelper";
import { Logger } from "client/Logic/Logger";
import { Logic, settings } from "client/Logic/Logic";
import { VideoState, VideoUrlInfo } from "client/Logic/LogicDefinitions";
import { LocalCache } from "client/Update/LocalCache";
import { FadeDurations } from "common/FadeDurations";
import { SockServLogMessage } from "client/ServerWebSocket/base/ServerSocketLogicBase";
import { Errors } from "client/LogicImplementation/ErrorHandler";
import { Util } from "common/Util";
import { ServerSocketLogic } from "client/ServerWebSocket/ServerSocketLogic";

// eslint-disable-next-line no-shadow
enum PlayState {
  Stopped,
  Starting,
  Playing,
  Stopping
}

export interface IVideoSource {
  getInternalRef1(): HTMLVideoElement;
  getInternalRef2(): HTMLVideoElement;
  pause(): void;
  getCurrentTime(): number;
  setCurrentTime(currentTime: number): void;
  onresize: () => void;
  oncanplay: () => void;
  ontimeupdate: (e: any, currentTime: number) => void;
  onended: () => void;
  onpause: () => void;
  onplay: () => void;
  play(): Promise<void>;
  onseeked: () => void;
  setMuted(muted: boolean): void;
  onseeking: () => void;
  setVideoUrl(urls: VideoUrlInfo[], videoStartTime: number): void;
}

export class SimpleVideoSource implements IVideoSource {
  private ref1: HTMLVideoElement;
  private ref2: HTMLVideoElement;

  public onresize: () => void = () => {};
  public oncanplay: () => void = () => {};
  public ontimeupdate: (e: any, currentTime: number) => void = () => {};
  public onended: () => void = () => {};
  public onpause: () => void = () => {};
  public onplay: () => void = () => {};
  public onseeked: () => void = () => {};
  public onseeking: () => void = () => {};

  private muted: boolean = false;
  //private currentTime: number = 0;

  public getInternalRef1(): HTMLVideoElement {
    return this.ref1;
  }
  public getInternalRef2(): HTMLVideoElement {
    return this.ref2;
  }

  constructor(ref1: HTMLVideoElement, ref2: HTMLVideoElement) {
    this.ref1 = ref1;
    this.ref2 = ref2;

    [ref1, ref2].forEach((ref) => {
      ref.onresize = () => {
        this.onresize();
      };
      ref.oncanplay = () => {
        this.oncanplay();
      };
      ref.ontimeupdate = (e) => {
        this.ontimeupdate(e, this.getCurrentTime());
      }; // TODO: handle self for 2 videos
      ref.onended = () => {
        this.onended();
      }; // TODO: handle self for 2 videos
      ref.onpause = () => {
        this.onpause();
      };
      ref.onplay = () => {
        this.onplay();
      }; // TODO: handle self for 2 videos
      ref.onseeked = () => {
        this.onseeked();
      }; // TODO: handle self for 2 videos
      ref.onseeking = () => {
        this.onseeking();
      }; // TODO: handle self for 2 videos
    });
  }

  public getCurrentTime(): number {
    return this.ref1.currentTime;
  }

  public setCurrentTime(currentTime: number): void {
    this.ref1.currentTime = currentTime;
  }

  public setMuted(muted: false): void {
    this.muted = muted;
    this.ref1.muted = muted;
    this.ref2.muted = muted;
  }

  pause(): void {
    this.ref1.pause();
  }

  async play(): Promise<void> {
    try {
      return await this.ref1.play();
    } catch (e) {
      console.log("Play failed in VideoRef ", e);
    }
  }

  public setVideoUrl(urls: VideoUrlInfo[], videoStartTime: number): void {
    // Logger.guard("VideoRef. setVideoUrl: ", () => {
    if (this.ref1.src !== urls[0].url) {
      console.log("setVideoUrl: " + urls[0].url);

      this.ref1.src = urls[0].url;

      this.ref1.onerror = (e) => {
        ErrorHelper.showAssetNotFoundError(urls[0].url, e);
      };

      Logger.info("VideoRef.setVideoUrl: " + urls[0].url);
    }
    this.ref1.load();
    // });
  }
}

export class VideoRef {
  private internalRef: IVideoSource | undefined;

  //private videoSource: IVideoSource;

  private state = VideoState.None;
  public switchToIntroAtTime: number | undefined;
  public switchToRaceAtTime: number | undefined;
  public stopAfterSeek: boolean = false;
  private inOnCanPlay = false;
  public playState: PlayState = PlayState.Stopped;
  public observableTime: number = 0;
  private _horseMuteTime: number = -1;
  //private onSwitchVideoSlot: (from: number, to: number) => void;

  public constructor(videoRef1: HTMLVideoElement, videoRef2: HTMLVideoElement, onSwitchVideoSlot: (from: number, to: number) => void) {
    // this.internalRef = new SimpleVideoSource(videoRef1, videoRef2);
    //this.onSwitchVideoSlot = onSwitchVideoSlot;
    this.internalRef = new DoubleVideoSource(videoRef1, videoRef2, onSwitchVideoSlot);

    this.bindVideoRef(this.internalRef);
    makeObservable(this, { playState: observable, observableTime: observable });
  }

  get horseMuteTime(): number {
    return this._horseMuteTime;
  }
  set horseMuteTime(value: number) {
    this._horseMuteTime = value;
  }

  public getInternalRef(): HTMLVideoElement | undefined {
    return this.internalRef?.getInternalRef1(); // this.internalRef;
  }

  public getInternalRef2(): HTMLVideoElement | undefined {
    return this.internalRef?.getInternalRef2(); // this.internalRef;
  }

  public getVideoSource(): IVideoSource | undefined {
    return this.internalRef;
  }

  public getState(): VideoState {
    return this.state;
  }

  public setState(state: VideoState, videoStartTime: number, force: boolean): void {
    console.log("setState: " + state + " " + videoStartTime);
    if (!this.internalRef) return;
    if (this.state !== state || force) {
      if (this.inOnCanPlay) Logger.warn("VideoRef.setState: !!! Switching state in onCanPlay!!!!");
      // const vst = videoStartTime > 0 ? "#t=" + videoStartTime : "";
      switch (state) {
        case VideoState.Intro: {
          this.switchToIntroAtTime = undefined;
          this.state = VideoState.Intro;
          if (Logic.timeForFadeTarget === VideoState.Race) {
            console.log("TimeForFadeTarget was changed from: " + Logic.timeForFadeTarget + " to " + VideoState.None);
            Logic.timeForFadeTarget = VideoState.None;
          }
          Logger.guard("VideoRef.setState: onFillStateInfo: " + state, () => {
            const introUrls = Logic.implementation.onFillStateInfo(state);
            introUrls[0].length = this.getIntroEndTime();
            this.setVideoUrl(introUrls, videoStartTime);
          });
          this.stopInternal();
          break;
        }
        case VideoState.Race: {
          this.switchToRaceAtTime = undefined;
          this.state = VideoState.Race;
          if (Logic.timeForFadeTarget === VideoState.Intro) {
            console.log("TimeForFadeTarget was changed from: " + Logic.timeForFadeTarget + " to " + VideoState.None);
            Logic.timeForFadeTarget = VideoState.None;
          }
          Logger.guard("VideoRef.setState: onFillStateInfo: " + state, () => {
            const raceUrls = Logic.implementation.onFillStateInfo(state);
            this.setVideoUrl(raceUrls, videoStartTime);
          });
          this.stopInternal();
        }
      }
    }
  }

  public async playChecked(): Promise<void> {
    if (!this.internalRef) return;
    try {
      this.playState = PlayState.Starting;
      await this.internalRef.play();
    } catch (e: any) {
      if (e.name === "NotAllowedError") {
        this.internalRef.setMuted(true);
        Logger.warn("Can't play with sound - try muted...", e);
        this.playState = PlayState.Starting;
        await this.internalRef.play();
      } else {
        // else rethrow...
        this.playState = PlayState.Stopped;
        throw e;
      }
    }
  }

  public async play(): Promise<void> {
    console.log("play");
    if (this.internalRef /* && !this._isPlaying*/) {
      if (this.state === VideoState.Intro) this.internalRef.setMuted(true);
      else this.internalRef.setMuted(false);
      await Logger.guardAsync("VideoRef.play", () => this.playChecked());
    }
  }

  private stopInternal() {
    const ref = this.internalRef;
    if (ref) {
      this.playState = PlayState.Stopping;
      try {
        console.log("stopInternal");
        ref.pause();
      } catch (e) {
        this.playState = PlayState.Stopped;
      }
    }
  }

  public stop(): void {
    Logger.guard("VideoRef.stop", () => {
      this.stopInternal();
    });
  }

  public exit(): void {
    this.stop();
    this.internalRef = undefined;
  }

  public getRefTime(): number {
    return this.internalRef ? this.internalRef.getCurrentTime() : 0;
  }

  public getTime(): number {
    return this.calcTime(this.getRefTime(), this.state);
  }

  public setStateTime(time: number): void {
    if (!this.internalRef) return;
    const raceVideoLength = this.internalRef.getInternalRef1().duration;
    this.internalRef.setCurrentTime(Logic.gameInfo?.gameType === "roulette" && this.state === VideoState.Race && time > raceVideoLength ? raceVideoLength - 0.1 : time); // when over video length at roulette => show last frame
  }

  public isPlaying(): boolean {
    return this.playState === PlayState.Playing;
  }

  private bindVideoRef(videoRef: IVideoSource) {
    if (videoRef) {
      videoRef.onseeking = () => {
        videoRef.setMuted(true);
      };
      videoRef.onseeked = () => {
        if (videoRef) {
          videoRef.setMuted(true);
          try {
            if (this.stopAfterSeek) {
              this.playState = PlayState.Stopped;
            } else {
              this.playState = PlayState.Starting;
              videoRef.play().then(() => (this.playState = PlayState.Playing)); // .then((v) => this.stopInternal())
            }
          } catch (e) {
            this.playState = PlayState.Stopped;
          }
        }
      };
      videoRef.onplay = () => {
        console.log("onPlay");
        this.playState = PlayState.Playing;
        Logic.videoScreen.pauseOverlay.visible = false;
      };
      videoRef.onpause = () => {
        console.log("onpause");
        this.playState = PlayState.Stopped;
      };
      videoRef.onended = () => {
        Logger.debug("VideoRef.onVideoEnded: " + this.state + " " + Logic.timeForFadeTarget);
        this.playState = PlayState.Stopped;
        const noIntro = Logic.getGameInfo()?.gameLength === 60 && Logic.getGameInfo()?.gameType !== "roulette";
        if (noIntro) {
          Logic.implementation.checkStartNextVideoLoop(Logic.getVideoTime());
        } else {
          Logic.onVideoEnded();
        }
      };
      videoRef.ontimeupdate = async (e, currentTime) => {
        if (settings.playbackSpeed !== 1) {
          e.currentTarget.playbackRate = settings.playbackSpeed;
        }
        if (!Logic.implementation) return;
        const time = this.calcTime(currentTime, this.state);
        this.observableTime = time;
        const noIntro = Logic.getGameInfo()?.gameLength === 60 && Logic.getGameInfo()?.gameType !== "roulette";
        if (noIntro) {
          Logic.implementation.checkStartNextVideoLoop(time);
        } else if (this.state === VideoState.Race) {
          const videoDuration = e.currentTarget.duration;
          if (Math.abs(videoDuration - Logic.getRaceLength()) >= 0.1 && settings.devUser !== "BDR-MSA" && Logic.getGameInfo()?.gameType !== "box")
            Logger.error("VideoRef.ontimeupdate: Race video duration must match this.raceLength: " + videoDuration + "  should length:" + Logic.getRaceLength());
          Logic.implementation.onVideoTimeUpdate(time);
          if (time >= this.getRaceEndTime() - FadeDurations.fadeDuration - Logic.implementation.getExtraLoadTime() / 1000) {
            Logger.debug("onTimeForFade to Intro: " + time);
            Logic.onTimeForFade(VideoState.Intro);
          }
        } else {
          const videoDuration = e.currentTarget.duration;
          if (Math.abs(videoDuration - Logic.getIntroLength()) >= 0.1 && Logic.getGameInfo()?.gameType !== "roulette")
            //Logger.error("VideoRef.ontimeupdate: Intro video duration must match this.introLength: " + videoDuration + " should length:" + Logic.getIntroLength());
            Logic.implementation.onVideoTimeUpdate(time);
          if (time >= this.getIntroEndTime() - FadeDurations.fadeDuration - Logic.implementation.getExtraLoadTime() / 1000) {
            Logger.debug("onTimeForFade to Race: " + time);
            Logic.onTimeForFade(VideoState.Race);
          }
        }

        if (Logic.introMusic) {
          if (Logic.introMusic.paused) {
            const m = Logic.introMusic;
            try {
              await m.play();
            } catch (ePlay: any) {
              console.log("Play failed in VideoRef.onTimeUpdate", ePlay);
              if (ePlay.name === "NotAllowedError" || ePlay.name === "NotSupportedError") {
              } else throw ePlay;
            }
          }
          const imAny: any = Logic.introMusic;
          const gameInfo = Logic.gameInfo;
          const raceVolume = gameInfo ? gameInfo.music.volumeRace : 0.2;
          const introVolume = gameInfo ? gameInfo.music.volumeIntro : 1.0;
          const secondsMutedArray: number[] = gameInfo ? gameInfo.speakerTimesArray : [40];

          let targetVol = introVolume;

          // For Kickbox mute for each round
          if (secondsMutedArray.length === 5) {
            if (time > Logic.getIntroLength() - 3 && time < Logic.getIntroLength() + secondsMutedArray[0]) {
              targetVol = raceVolume;
            } else if (
              time >= Logic.getIntroLength() + secondsMutedArray[0] + secondsMutedArray[1] &&
              time < Logic.getIntroLength() + secondsMutedArray[0] + secondsMutedArray[1] + secondsMutedArray[2]
            ) {
              targetVol = raceVolume;
            } else if (
              time >= Logic.getIntroLength() + secondsMutedArray[0] + secondsMutedArray[1] + secondsMutedArray[2] + secondsMutedArray[3] &&
              time < Logic.getIntroLength() + secondsMutedArray[0] + secondsMutedArray[1] + secondsMutedArray[2] + secondsMutedArray[3] + secondsMutedArray[4]
            ) {
              targetVol = raceVolume;
            } else {
              targetVol = introVolume;
            }
          } else if (this.horseMuteTime > 0) {
            // at horse video mute time depends on finish1 time
            targetVol = time > Logic.getIntroLength() - 3 && time < Logic.getIntroLength() + this.horseMuteTime + 1 ? raceVolume : introVolume;
          } else if (secondsMutedArray.length >= 1) {
            // other games one mute
            const secondsMuted = secondsMutedArray[0];
            targetVol = time > Logic.getIntroLength() - 3 && time < Logic.getIntroLength() + secondsMuted ? raceVolume : introVolume;
          }

          if (imAny._targetVol === undefined) {
            // Logic.introMusic.volume(targetVol);
            // Logic.introMusic.fade(0, targetVol, 3000);
            Logic.fadeMusic(Logic.introMusic, targetVol, 3000);
            imAny._targetVol = targetVol;
          } else if (imAny._targetVol !== targetVol) {
            // Logic.introMusic.volume(targetVol);
            // Logic.introMusic.fade(imAny._targetVol, targetVol, 3000);
            Logic.fadeMusic(Logic.introMusic, targetVol, 3000);
            imAny._targetVol = targetVol;
          }
        }
      };
      videoRef.oncanplay = () => {
        console.log("VideoRef::oncanplay");
        // Logic.updateVideoSpriteSize();
        this.onCanPlay();
        // Logic.updateVideoSpriteSize();
        if (Logic.getGameInfo()?.gameLength === 60 && Logic.getGameInfo()?.gameType !== "roulette") {
          // Watchdog zur Überprüfung auf hängende Videos
          if (window._videoWatchdogStarted) return;
          window._videoWatchdogStarted = true;

          let tries = 0;
          const watchdog = setInterval(() => {
            const video = Logic.videoRef?.getInternalRef?.();

            const isInvalid = !video || video.paused || video.ended;
            if (isInvalid && ++tries > 10) {
              clearInterval(watchdog);
              window._videoWatchdogStarted = false;
              return;
            }
            if (isInvalid) return;

            console.log("check video freeze", video.currentTime, tries);

            if (video.currentTime >= 1.5) {
              // video running -> perfect
              clearInterval(watchdog);
              window._videoWatchdogStarted = false;
              return;
            }

            if (tries >= 6 && (video.currentTime < 1.5 || video.currentTime > video?.duration + 5 || video.currentTime > 65)) {
              Logger.error("video stuck in first second or running far over video length -> reload!", {
                currentTime: video.currentTime,
                readyState: video.readyState,
                paused: video.paused,
                src: video.src
              });
              const logMessage = new SockServLogMessage(
                Errors.FREEZE_ON_START.code,
                Errors.FREEZE_ON_START.message,
                JSON.stringify({
                  currentTime: video.currentTime,
                  readyState: video.readyState,
                  paused: video.paused,
                  src: video.src
                })
              );
              ServerSocketLogic.instance.sendLogRequest(logMessage).catch((errorData) => {
                Logger.error("Send log Error:" + JSON.stringify(errorData));
              });
              clearInterval(watchdog);
              Logic.implementation.reloadWindow();
              return;
            }

            tries++;
          }, 1000);
        }
      };
      videoRef.onresize = () => {
        console.log("OnResize");
        // Logic.updateVideoSpriteSize(); // needed when switching to new video with different size...
      };
    }
  }

  public fadeTo(targetState: VideoState): void {
    Logger.guard("fadeTo: " + targetState, () => {
      if (Logic.videoScreen.pauseOverlay.visible) {
        if (Logic.videoScreen.pauseOverlay.raceCanceled) {
          // when result comes after race break shown
          // fade to race
          Logic.onTimeForPlay(targetState);
        } else {
          Logic.onTimeForPlay(VideoState.Intro);
        }
      } else {
        if (targetState === VideoState.Intro) {
          Logic.videoScreen.startFading(targetState);
          if (this.switchToIntroAtTime === undefined) {
            this.switchToIntroAtTime = Math.min(this.getTime() + FadeDurations.fadeDuration, Logic.getIntroLength() + Logic.getRaceLength() - 0.0001);
          }
        } else if (targetState === VideoState.Race) {
          Logic.videoScreen.startFading(targetState);
          if (this.switchToRaceAtTime === undefined) {
            this.switchToRaceAtTime = Math.min(this.getTime() + FadeDurations.fadeDuration, Logic.getIntroLength() - 0.0001);
          }
        } else if (targetState === VideoState.Paused) {
          Logic.videoScreen.pauseOverlay.visible = true;
        }
      }
    });
  }

  public getRaceEndTime(): number {
    const endTime = Logic.getIntroLength() + Logic.getRaceLength();
    if (this.switchToIntroAtTime !== undefined) return Math.min(this.switchToIntroAtTime, endTime);
    return endTime;
  }

  public getIntroEndTime(): number {
    if (this.switchToRaceAtTime !== undefined) return this.switchToRaceAtTime;
    return Logic.getIntroLength();
  }

  public setTime(time: number, force: boolean): void {
    Logger.guard("VideoRef.setTime: " + time, () => {
      const state = Logic.getStateForTime(time);
      const playingTime = Logic.calcStateTime(state, time);
      this.setState(state, playingTime, force);
      this.setStateTime(playingTime);
    });
    // this.play();
  }

  private calcTime(time: number, state: VideoState): number {
    switch (state) {
      case VideoState.Intro:
        return time;
      case VideoState.Race:
        return Logic.getIntroLength() + time;
    }
    return 0;
  }

  private setVideoUrl(urls: VideoUrlInfo[], videoStartTime: number) {
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const ret = LocalCache.get(url.url);
      if (ret) urls[i].url = ret;
    }

    this.setVideoUrlInternal(urls, videoStartTime);

    // if (videoStartTime > 0)
    //   this.setTime(videoStartTime, true);
  }

  private setVideoUrlInternal(urls: VideoUrlInfo[], videoStartTime: number) {
    const ref = this.internalRef;
    if (!ref) return;

    Logger.guard("VideoRef. setVideoUrl: ", () => {
      ref.setVideoUrl(urls, videoStartTime);
      //   if (ref.src !== url) {
      //     console.log("setVideUrl: " + url);
      //     ref.onerror = (e) => {
      //       ErrorHelper.showAssetNotFoundError(url);
      //     };
      //     ref.src = url;
      //     Logger.info("VideoRef.setVideoUrl: " + url);
      //   }
      //   ref.load();
    });
  }

  private onCanPlay() {
    if (this.stopAfterSeek === false) {
      Logger.guard("VideoRef.onCanPlay", () => {
        this.inOnCanPlay = true;
        const t = this.getTime();
        console.log("OnCanPlay: " + t + " " + this.getRefTime() + " " + this.state);
        Logic.implementation.onCanPlay(t);
        this.inOnCanPlay = false;
      });
    }
  }
}
