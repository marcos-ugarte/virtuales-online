import * as React from "react";
import { asComponent } from "./ReactHelper";
import { IDownloadProgress } from "client/Update/LocalCache";
import { observable } from "mobx";

export interface IDownloadProgressObject {
  loading: boolean;
  files: IDownloadProgress[];
}
export const downloadObject = observable({ loading: false, files: [] } as IDownloadProgressObject);
// export const downloadObject = observable({ // just for testing purposes
//   loading: true,
//   files: [
//     {
//       filePath: "test",
//       loaded: 125,
//       total: 1000,
//       finished: false,
//       success: false
//     }
//   ]
// } as IDownloadProgressObject);

function calcBytes() {
  let loaded = 0;
  let total = 0;
  for (const d of downloadObject.files) {
    loaded += d.loaded;
    total += d.total;
  }
  return { loaded, total };
}

function formatBytes(bytes: number) {
  return Math.floor(bytes / 1024);
}

export const UpdatePage = asComponent("UpdatePage", () => {
  const dl = calcBytes();
  return (
    <div className="Overlay">
      <div className="OverlayText">UpdatePage</div>
      <progress className="pure-material-progress-linear" />
      <div className="OverlayTextSmall">{formatBytes(dl.loaded) + "Kb/" + formatBytes(dl.total) + "Kb"}</div>
    </div>
  );
});
