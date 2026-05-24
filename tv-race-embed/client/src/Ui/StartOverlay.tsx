import * as React from "react";
import { asComponent } from "./ReactHelper";
import { Settings } from "common/Settings";

export const StartOverlay = asComponent("StartOverlay", (props: { ready: boolean; onStart: () => void }) => {
  return (
    <div className="Overlay" onClick={props.ready ? props.onStart : () => console.log("Not ready yet")}>
      <div className="OverlayText">Start Overlay</div>
      <div className="OverlayTextSmall">{props.ready ? "Touch screen to start" : "Please wait..."}</div>
      <br />
      <div className="OverlayTextSmall">Version: {Settings.versionNumber}</div>
    </div>
  );
});
