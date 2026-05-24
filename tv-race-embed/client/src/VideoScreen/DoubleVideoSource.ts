import { IVideoSource } from "./VideoRef";
import { Logger } from "client/Logic/Logger";
import { VideoUrlInfo } from "client/Logic/LogicDefinitions";

class VideoInfo {
  public url: string;
  public startTime: number = 0;
  public length: number;

  public constructor(url: string, length: number) {
    this.url = url;
    this.length = length;
  }
}

export class DoubleVideoSource implements IVideoSource {
  private videoRefs: HTMLVideoElement[] = [];
  private currentVideoInfos: (undefined | VideoInfo)[] = [];
  private activeVideo: number = 0;
  //private ref2: HTMLVideoElement;
  private totalLength: number = 0;
  private videoInfos: VideoInfo[] = [];

  private onSwitchVideoSlot: (from: number, to: number) => void;

  public onresize: () => void = () => {};
  public oncanplay: () => void = () => {};
  public ontimeupdate: (e: any, currentTime: number) => void = () => {};
  public onended: () => void = () => {};
  public onpause: () => void = () => {};
  public onplay: () => void = () => {};
  public onseeked: () => void = () => {};
  public onseeking: () => void = () => {};

  private muted: boolean = false;

  private videoRefHeight = 720;
  //private currentTime: number = 0;

  public getInternalRef1(): HTMLVideoElement {
    return this.videoRefs[0]; // TODO: what to do with the other?
  }
  public getInternalRef2(): HTMLVideoElement {
    return this.videoRefs[1]; // TODO: what to do with the other?
  }

  constructor(ref1: HTMLVideoElement, ref2: HTMLVideoElement, onSwitchVideoSlot: (from: number, to: number) => void) {
    this.onSwitchVideoSlot = onSwitchVideoSlot;
    this.videoRefs = [ref1, ref2];

    this.videoRefHeight = ref1.height;
    ref2.height = 0;

    [ref1, ref2].forEach((ref, index) => {
      ref.onresize = () => {
        this.internalOnResize(index);
      };
      ref.oncanplay = () => {
        this.internalOnCanPlay(index);
      };
      ref.ontimeupdate = (e) => {
        this.internalOnTimeUpdate(index, e);
      };
      ref.onended = () => {
        this.internalOnEnded(index);
      };
      ref.onpause = () => {
        this.internalOnPause(index);
      };
      ref.onplay = () => {
        this.internalOnPlay(index);
      };
      ref.onseeked = () => {
        this.internalOnSeeked(index);
      };
      ref.onseeking = () => {
        this.internalOnSeeking(index);
      };
      ref.onerror = (e) => {
        if (typeof e === "string") {
          throw new Error(e);
          return;
        }

        if ("path" in e) {
          const path = (e as any).path;
          Logger.error("Error: " + path[0].error.message);
        }
      };
    });

    for (let i = 0; i < this.videoRefs.length; i++) {
      //this.currentVideoInfos.push(this.videoInfos[i]);
      this.videoRefs[i].addEventListener("timeupdate", () => {
        this.timeUpdateCallback(i);
      });
      //this.videos[i].src = this.videoInfos[i].url;
    }
  }

  private internalOnResize(videoIndex: number) {
    // if (videoIndex === this.activeVideo)
    //   this.onresize();
  }

  private internalOnCanPlay(videoIndex: number) {
    console.log("DoubleVideoSource::internalOnCanPlay, index: " + videoIndex + ", activeVideo: " + this.activeVideo);
    if (videoIndex === this.activeVideo) {
      if (this.videoRefs[this.activeVideo].duration < 6) console.error("Video too short"); // seeking kickbox video error...
      console.log("DoubleVideoSource::internalOnCanPlay: activevideo ready, propagate event");
      this.oncanplay();
    }
  }

  private internalOnTimeUpdate(videoIndex: number, e: any) {
    if (videoIndex === this.activeVideo) this.ontimeupdate(e, this.getCurrentTime());
  }

  private internalOnEnded(videoIndex: number) {
    if (videoIndex === this.activeVideo && this.currentVideoInfos[videoIndex] === this.videoInfos[this.videoInfos.length - 1]) this.onended();
  }

  private internalOnPause(videoIndex: number) {
    if (videoIndex === this.activeVideo) this.onpause();
  }

  private internalOnPlay(videoIndex: number) {
    if (videoIndex === this.activeVideo) this.onplay();
  }

  private internalOnSeeked(videoIndex: number) {
    console.log("onseeked");
    if (videoIndex === this.activeVideo) this.onseeked();
  }

  private internalOnSeeking(videoIndex: number) {
    console.log("onSeeking");
    if (videoIndex === this.activeVideo) this.onseeking();
  }

  private lastTimeUpdateCallback = new Date();

  public async timeUpdateCallback(videoIndex: number): Promise<void> {
    if (videoIndex !== this.activeVideo) return;

    const videoInfo = this.currentVideoInfos[videoIndex];
    const video = this.videoRefs[videoIndex];

    if (isNaN(video.duration)) {
      return;
    }

    // if (this.videoProgressCallback)
    // {
    //     const time = this.getCurrentTime();
    //     const percentage = time / this.totalLength;
    //     this.videoProgressCallback(percentage, time, video.currentTime/video.duration, video.currentTime);
    // }

    //end of video - switch to video end event

    if (video.currentTime / video.duration > 0.999) {
      console.warn(`DVS:timeUpdateCallback: Video ending on slot ${videoIndex}, switching to next - currentTime: ${video.currentTime}, duration: ${video.duration}, url: ${video.src}`);
      // switch video and start the next

      const curDate = new Date();
      const diffInMs = curDate.getTime() - this.lastTimeUpdateCallback.getTime();
      if (diffInMs < 4000) {
        console.error("DVS:timeUpdateCallback: Only " + diffInMs + "between video switches");
      }
      this.lastTimeUpdateCallback = curDate;

      const wasPaused = false; //video.paused;
      video.pause();

      // switch to next videoslot
      this.activeVideo = this.activeVideo === 0 ? 1 : 0;

      if (!this.currentVideoInfos[this.activeVideo]) {
        // we are done, there is no more video queued
        console.warn("DVS:timeUpdateCallback: no more video, ending here");
        return;
      }

      // following video
      const nextVideoInfo = this.getNextVideoInfo(this.currentVideoInfos[this.activeVideo]);
      if (nextVideoInfo) {
        console.log(`DVS:timeUpdateCallback: prepare next video: ${nextVideoInfo.url}/${nextVideoInfo.length}s on slot ${videoIndex}`);
        this.currentVideoInfos[videoIndex] = nextVideoInfo;
        this.videoRefs[videoIndex].pause();
        this.videoRefs[videoIndex].src = nextVideoInfo.url;
        this.videoRefs[videoIndex].currentTime = 0.0;
        this.videoRefs[videoIndex].pause();
      } else {
        console.log(`DVS:timeUpdateCallback: no next video`);
        this.currentVideoInfos[videoIndex] = undefined;
      }

      {
        // TODO: do this here
        this.videoRefs[videoIndex].height = 0;
        this.videoRefs[this.activeVideo].height = this.videoRefHeight;
        this.onSwitchVideoSlot(videoIndex, this.activeVideo);

        // if there is still a video, play it
        const nextVideo = this.currentVideoInfos[this.activeVideo];
        if (videoInfo && nextVideo) {
          console.log(`DVS:timeUpdateCallback: Do the switcheroo from ${videoIndex}-->${this.activeVideo}, to url: ${nextVideo.url}/${nextVideo.length}`);
          console.log("DVS:timeUpdateCallback: Paused: " + wasPaused);

          if (this.videoRefs[this.activeVideo].currentTime > 0) {
            console.error("DVS:timeUpdateCallback: activeVideo that will get started: videoRef currentTime is " + this.videoRefs[this.activeVideo].currentTime);
            this.videoRefs[this.activeVideo].currentTime = 0;
          }
          if (!this.videoRefs[this.activeVideo].paused) {
            console.error("DVS:timeUpdateCallback: Active video is not paused!");
          }

          if (!wasPaused) {
            try {
              await this.videoRefs[this.activeVideo].play();
            } catch (e) {
              console.log("Play failed in DoubleVideoSoruce.timeUpdatedCallback");
            }
          }
        } else {
          console.warn("curVideo or nextVideo is null");
        }
      }
    }
  }

  public getCurrentVideoInfo(): VideoInfo | undefined {
    return this.currentVideoInfos[this.activeVideo];
  }

  public getDebugNextVideoInfo(): VideoInfo | undefined {
    return this.getNextVideoInfo(this.getCurrentVideoInfo(), false);
  }

  public getNextVideoInfo(currentVideoInfo: VideoInfo | undefined, doLogging = true): VideoInfo | undefined {
    if (!currentVideoInfo) return undefined;

    if (doLogging) {
      console.log("Getting next video to: " + currentVideoInfo.url);
      console.log("VideoInfos: " + JSON.stringify(this.videoInfos));
    }
    for (let i = 0; i < this.videoInfos.length - 1; i++) {
      if (this.videoInfos[i] === currentVideoInfo) {
        if (doLogging) console.log("Found, getting: " + (i + 1) + "url: ");
        return this.videoInfos[i + 1];
      }
    }
    if (doLogging) console.log("Nothing found");
    return undefined;
  }

  public getCurrentTime(): number {
    const videoTime = this.videoRefs[this.activeVideo].currentTime;
    const videoInfo = this.currentVideoInfos[this.activeVideo];
    if (!videoInfo) return videoTime;
    return videoInfo.startTime + videoTime;
  }

  public setCurrentTime(currentTime: number): void {
    this.seek(currentTime);
  }

  public async seek(seconds: number): Promise<void> {
    // const seekTime = seconds;
    // do the seek...
    const currentVideoInfos = this.currentVideoInfos[this.activeVideo];

    console.warn(`DVS:seek me to: ${seconds} - currentVideoSlot: ${this.activeVideo}, currentVideo: ${currentVideoInfos ? currentVideoInfos.url + "/" + currentVideoInfos.startTime : "-undefined-"}`);

    const wasPaused = this.videoRefs[this.activeVideo].paused;

    if (currentVideoInfos && currentVideoInfos.startTime <= seconds && currentVideoInfos.startTime + currentVideoInfos.length > seconds) {
      console.log("DVS:seek seekin in current video to " + (seconds - currentVideoInfos.startTime) + "/" + currentVideoInfos.length + "s");
      // seek in current chunk
      const currentTime = this.videoRefs[this.activeVideo].currentTime;
      const newTime = seconds - currentVideoInfos.startTime;
      if (currentTime !== newTime) {
        this.videoRefs[this.activeVideo].pause();
        this.videoRefs[this.activeVideo].currentTime = newTime;
        if (!wasPaused) {
          try {
            await this.videoRefs[this.activeVideo].play();
          } catch (e) {
            console.log("Play failed in DoubelVideoSource.seek");
          }
        }
        const t = this.videoRefs[this.activeVideo].currentTime;
        console.log("SeekTest: " + t + " " + (seconds - currentVideoInfos.startTime));
      }
    } else {
      // load correct video
      console.log("DVS:seek load correct video for " + seconds);

      this.videoRefs[this.activeVideo].pause();

      for (let i = 0; i < this.videoInfos.length; i++) {
        const oldVideoSlot = this.activeVideo;
        const nextVideoSlot = this.activeVideo === 0 ? 1 : 0;

        const videoInfo = this.videoInfos[i];
        if (videoInfo.startTime <= seconds && videoInfo.startTime + videoInfo.length > seconds) {
          this.videoRefs[oldVideoSlot].height = 0;
          this.videoRefs[nextVideoSlot].height = this.videoRefHeight;
          const prevVideoSlot = this.activeVideo;
          this.activeVideo = nextVideoSlot;
          this.onSwitchVideoSlot(prevVideoSlot, this.activeVideo);

          this.currentVideoInfos[nextVideoSlot] = videoInfo;
          this.videoRefs[nextVideoSlot].pause();
          this.videoRefs[nextVideoSlot].src = videoInfo.url;
          this.videoRefs[nextVideoSlot].currentTime = seconds - videoInfo.startTime;
          console.log(`DVS:seek Setting seeked video in slot ${nextVideoSlot} to ${videoInfo.url} - currentTime: ${this.videoRefs[nextVideoSlot].currentTime}/${videoInfo.length}`);

          // setup next video
          if (i < this.videoInfos.length - 1) {
            //const nextVideoSlot = this.activeVideo === 0 ? 1 : 0;
            const nextVideo = this.videoInfos[i + 1];
            this.videoRefs[oldVideoSlot].pause();
            this.currentVideoInfos[oldVideoSlot] = nextVideo;
            console.log("Setting next video to: " + nextVideo.url);
            this.videoRefs[oldVideoSlot].currentTime = 0;
            this.videoRefs[oldVideoSlot].src = nextVideo.url;
            this.videoRefs[oldVideoSlot].pause();
            console.log(`DVS:seek Preparing next video slot ${oldVideoSlot} to ${nextVideo.url} - startTime: ${nextVideo.startTime}, length: ${nextVideo.length}`);
          } else {
            console.log("DVS:seek No next video");
            this.currentVideoInfos[oldVideoSlot] = undefined;
          }
          break;
        }
      }
    }
  }

  public setMuted(muted: false): void {
    this.muted = muted;
    this.videoRefs.forEach((element) => {
      element.muted = muted;
    });
  }

  pause(): void {
    console.log("Pausing video slot: " + this.activeVideo);
    return this.videoRefs[this.activeVideo].pause();
  }

  async play(): Promise<void> {
    console.log("Playing video slot: " + this.activeVideo);
    try {
      return await this.videoRefs[this.activeVideo].play();
    } catch (e) {
      console.log("Play Failed in DoubeVideoSource.play");
    }
  }

  calcVideoInfos(videoUrls: VideoUrlInfo[]): { totalLength: number; videoInfos: VideoInfo[] } {
    //this.currentUrl = 0;
    const videoInfos: VideoInfo[] = [];
    //const segments: Segment[] = [];
    let totalLength = 0;

    for (const videoUrl of videoUrls) {
      // const response = fetch(videoUrl.url);
      // const json = await(await response).json();

      if (videoUrl.length < 6) {
        console.error("Video Url with length < 6 - not allowed!"); // kickbox video bug test
      }

      const videoInfo: VideoInfo = {
        startTime: totalLength,
        url: videoUrl.url,
        length: videoUrl.length
      };
      videoInfos.push(videoInfo);
      totalLength += videoInfo.length;
    }
    return {
      totalLength,
      videoInfos
    };
  }

  public getVideoInfos(): VideoInfo[] {
    return this.videoInfos;
  }

  public setVideoUrl(urls: VideoUrlInfo[], videoStartTime: number): void {
    console.log("setVideoUrls, videoStartTime: " + videoStartTime);
    this.videoRefs.forEach((element) => {
      element.pause();
    });
    const ret = this.calcVideoInfos(urls);
    this.videoInfos = ret.videoInfos;
    console.log("Total length: " + ret.totalLength);

    if (videoStartTime > ret.totalLength) {
      Logger.warn("VideoTime higher than length: " + videoStartTime + " to " + ret.totalLength);
    }

    this.currentVideoInfos = [];
    const prevActiveVideo = this.activeVideo;
    this.activeVideo = 0;
    this.onSwitchVideoSlot(prevActiveVideo, this.activeVideo);

    for (let i = 0; i < Math.min(this.videoRefs.length, urls.length); i++) {
      this.currentVideoInfos.push(this.videoInfos[i]);
      this.videoRefs[i].src = this.videoInfos[i].url;
    }

    this.videoRefs[0].height = this.videoRefHeight;
    this.videoRefs[1].height = 0;

    // TODO: this does not work...
    // if (videoStartTime > 0)
    //   this.seek(videoStartTime);
    // else
    //    this.play();

    // // Logger.guard("VideoRef. setVideoUrl: ", () => {
    //   if (this.videoRefs[0].src !== urls[0]) {
    //     console.log("setVideoUrl: " + urls[0]);

    //     this.ref1.src = urls[0];

    //     this.ref1.onerror = (e) => {
    //         ErrorHelper.showAssetNotFoundError(urls[0]);
    //     };

    //     Logger.info("VideoRef.setVideoUrl: " + urls[0]);
    //   }
    //   this.ref1.load();
    // // });
  }
}
