/* eslint-disable @typescript-eslint/no-var-requires */
import * as React from "react";
import { asComponent } from "./ReactHelper";
import { ReactProducerTools } from "./ReactProducerTools";
import { StartOverlay } from "./StartOverlay";
import { downloadObject, UpdatePage as UpdateOverlay } from "./UpdateOverlay";
import { Engine } from "../Graphics/Engine";
import { RtcLogic } from "../Rtc/RtcLogic";
import { FontLoader } from "../VideoScreen/common/FontLoader";
import { Logger } from "client/Logic/Logger";
import { Logic, settings } from "client/Logic/Logic";
import { LogicImplementation } from "client/LogicImplementation/LogicImplementation";
import { LogicImplementationDummy } from "client/LogicImplementationDummy/LogicImplementationDummy";
import { Util } from "common/Util";

let cachedFonts: ReturnType<typeof FontLoader.startLoading> | null | undefined;

function fontPath(x: any): string {
  if (typeof x === "string") return x;
  return (x?.default as string) || "";
}
const fontDescription = [
  { name: "DIN-Regular", path: fontPath(require("assets/fonts/DINNextLTPro-Regular.otf")), fontStyle: "normal" },
  { name: "DIN-RegularItalic", path: fontPath(require("assets/fonts/DINNextLTPro-Italic.otf")), fontStyle: "italic" },
  { name: "DIN-Bold", path: fontPath(require("assets/fonts/DINNextLTPro-Bold.otf")), fontStyle: "normal" },
  { name: "DIN-BoldItalic", path: fontPath(require("assets/fonts/DINNextLTPro-BoldItalic.otf")), fontStyle: "italic" },
  { name: "DIN-Heavy", path: fontPath(require("assets/fonts/DINNextLTPro-Heavy.otf")), fontStyle: "normal" },
  { name: "DIN-HeavyItalic", path: fontPath(require("assets/fonts/DINNextLTPro-HeavyItalic.otf")), fontStyle: "italic" },
  { name: "DIN-Light", path: fontPath(require("assets/fonts/DINNextLTPro-Light.otf")), fontStyle: "normal" },
  { name: "DIN-LightItalic", path: fontPath(require("assets/fonts/DINNextLTPro-LightItalic.otf")), fontStyle: "italic" },
  { name: "DIN-MediumItalic", path: fontPath(require("assets/fonts/DINNextLTPro-MediumItalic.otf")), fontStyle: "italic" },
  { name: "DIN-Medium", path: fontPath(require("assets/fonts/DINNextLTPro-Medium.otf")), fontStyle: "normal" },
  { name: "DIN-BlackItalic", path: fontPath(require("assets/fonts/DINNextLTPro-BlackItalic.otf")), fontStyle: "italic" },
  { name: "DIN-UltraLight", path: fontPath(require("assets/fonts/DINNextLTPro-UltraLight.otf")), fontStyle: "normal" },
  { name: "DIN-UltraLightItalic", path: fontPath(require("assets/fonts/DINNextLTPro-UltraLightItalic.otf")), fontStyle: "italic" },
  { name: "Roboto-Bold", path: fontPath(require("assets/fonts/Roboto-Bold.otf")), fontStyle: "normal" },
  { name: "Roboto-Light", path: fontPath(require("assets/fonts/Roboto-Light.otf")), fontStyle: "normal" },
  { name: "Roboto-Medium", path: fontPath(require("assets/fonts/Roboto-Medium.otf")), fontStyle: "normal" },
  { name: "Roboto-Regular", path: fontPath(require("assets/fonts/Roboto-Regular.otf")), fontStyle: "normal" }
];

const lf = () => {
  if (cachedFonts === undefined) {
    cachedFonts = RtcLogic.instance.isProducer() || RtcLogic.instance.isPlayer() ? FontLoader.startLoading(fontDescription) : null;
  }
  return cachedFonts;
};
// loadFonts.fontFamily
for (const fd of fontDescription) {
  const sheet = window.document.styleSheets[0];
  sheet.insertRule(
    `@font-face {
      font-family: ${fd.name};
      font-style: ${fd.fontStyle};
      font-display: block;
      src: url('${fd.path}') format('opentype');}`,
    sheet.cssRules.length
  );
}

interface IProps {}

export const ReactProducer = asComponent("ReactProducer", (props: IProps) => {
  const [isStarted, setIsStarted] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);
  const videoRef1 = React.useRef<HTMLVideoElement | null>(null);
  const videoRef2 = React.useRef<HTMLVideoElement | null>(null);
  const videoScreenRef = React.useRef<HTMLDivElement | null>(null);

  const attachVideoScreen = async (element: HTMLDivElement | null) => {
    try {
      if (element) {
        const loadFonts = lf();
        if (loadFonts) {
          try {
            await loadFonts.promise;
          } catch (e) {
            Logger.error("ReactProducer: Fonts: ", e);
          }
        }

        Engine.instance.init(element, {
          width: settings.screen.width,
          height: settings.screen.height,
          antialias: true,
          backgroundAlpha: 0
        });

        if (videoRef1.current && videoRef2.current) {
          if (settings.forceDummyLogic) {
            Logger.enableGuards(true, true);
            await Logic.init(videoRef1.current, videoRef2.current, new LogicImplementationDummy());
            setIsReady(true);
          } else if (settings.devUser === "RYZEN" || settings.devUser === "BDR-MSA" || settings.devUser === "SIEDLER") {
            // Logger.enableGuards(true, false);
            await Logic.init(videoRef1.current, videoRef2.current, new LogicImplementationDummy());
            setIsReady(true);
            // Logic.init(videoRef.current, new LogicImplementation());
          } else {
            await Logic.init(videoRef1.current, videoRef2.current, new LogicImplementation());
            setIsReady(true);
            // Logic.init(videoRef.current, new LogicImplementationDummy());
          }
          if (settings.startImmediately) startVideoScreen();
          if (settings.stopAfterSeek) Logic.getProducerTools().setStopAfterSeek();
        }
      }
    } catch (e) {
      console.error("ReactProducer: attachVideoScreen failed", e);
    }
  };

  React.useEffect(() => {
    attachVideoScreen(videoScreenRef.current);
    return () => {
      Logic.exit();
      Engine.instance.exit();
    };
  }, []);

  const startVideoScreen = () => {
    if (!isStarted) {
      if (Logic.isInitialized()) {
        Logic.startVideoScreen();
        setIsStarted(true);

        const timeParam = Util.getUrlParameter(window.location.href, "time");
        if (timeParam) {
          const time = Number(timeParam);
          Logic.setVideoTime(time);
        }
      }
    }
  };
  const handleSpace = (e: any) => {
    if (e.key === " ") {
      Logic.toggleVideoPlay();
    }
  };
  const videoWidth = RtcLogic.instance.isProducer() ? undefined : settings.viewport.width;
  const videoHeight = RtcLogic.instance.isProducer() ? undefined : settings.viewport.height;
  const isC4 = Logic.gameInfo?.gameSkin === 1;
  const videoStyle: React.CSSProperties = RtcLogic.instance.isProducer() ? { visibility: "hidden", width: settings.viewport.width + "px", height: settings.viewport.height + "px" } : {};
  const showUI = settings.showUI;

  React.useEffect(() => {
    if (settings.devUser) {
      document.body.style.overflow = "visible";
    } else {
      document.body.style.overflow = "hidden";
    }
  }, []);

  return (
    <>
      <div
        onKeyDown={handleSpace}
        className={"ProducerVideoContainer"}
        onTouchEnd={startVideoScreen}
        onClick={startVideoScreen}
        style={{ height: videoHeight, overflow: "hidden", background: (isC4 || settings.raceOnly) ? "black" : "white" }}
        tabIndex={0}
      >
        {/* <div className={styles.videoContainer}> */}
        <video
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore */}
          crossOrigin={settings.crossOrigin !== undefined ? settings.crossOrigin : undefined}
          style={videoStyle}
          width={videoWidth}
          height={videoHeight}
          playsInline
          autoPlay
          controls={false}
          ref={(element) => (videoRef1.current = element)}
        ></video>
        <video
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          crossOrigin={settings.crossOrigin !== undefined ? settings.crossOrigin : undefined}
          style={videoStyle}
          width={videoWidth}
          height={videoHeight}
          playsInline
          autoPlay
          controls={false}
          ref={(element) => (videoRef2.current = element)}
        ></video>
        {/* </div> */}
        {/* autoPlay is needed to avoid play icon on android webview */}

        <div className={"ProducerVideoScreen"} style={{ width: settings.viewport.width, height: settings.viewport.height }} id="videoScreen" ref={videoScreenRef} />
      </div>
      {isReady && showUI && <ReactProducerTools />}
      {!isStarted && !downloadObject.loading && <StartOverlay ready={isReady} onStart={startVideoScreen} />}
      {downloadObject.loading && <UpdateOverlay />}
    </>
  );
});
