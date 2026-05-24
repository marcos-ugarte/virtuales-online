import * as React from "react";
import { asComponent } from "./ReactHelper";
import { RtcLogic } from "../Rtc/RtcLogic";
import { Util } from "common/Util";

interface IProps {}

export const ReactConsumer = asComponent("ReactConsumer", (props: IProps) => {
  const savedMediaStream = React.useRef<MediaStream>();

  async function setSavedMediaStream() {
    const video = document.querySelector("video");
    if (video && savedMediaStream.current) {
      if (video.srcObject !== savedMediaStream.current) video.srcObject = savedMediaStream.current;
      try {
        video.onplay = function () {
          console.log("Play Video:" + Date.now());
        };
        video.muted = false;
        await video.play();
      } catch (e) {
        console.log("setSavedMediaStream: Play muted false failed ", e);
        video.muted = true;
        try {
          await video.play();
        } catch (e2) {
          console.log("setSavedMediaStream: Play muted true failed!", e2);
        }
      }
    }
  }

  React.useEffect(() => {
    RtcLogic.instance.consumer!.consumeStreams((streams: MediaStream[]) => {
      savedMediaStream.current = streams[0];
      setSavedMediaStream();
    });

    const mount = { val: true };
    document.addEventListener("visibilitychange", () => {
      if (mount.val) {
        console.log("Visibility: " + document.hidden);
        if (document.hidden) {
          // audio.pause();
        } else {
          // audio.play();
        }
      }
    });
    return () => {
      mount.val = false;
    };
  }, []);

  const attachVideo = (element: HTMLVideoElement | null) => {
    if (element) {
      document.addEventListener("click", () => {
        setSavedMediaStream();
      });
    }
  };

  console.log("Start add Video:" + Date.now());

  let width = "100%";
  const settingsWidth = Util.getUrlParameterIntOrUndefined(window.location.href, "width");
  if (settingsWidth) width = settingsWidth + "px";

  // !!! muted !!! => autoPlay won't work otherwise!!!
  return (
    <>
      <video style={{ width }} className={"ConsumerVideo"} playsInline ref={(el) => attachVideo(el)}></video>
    </>
  );
});
