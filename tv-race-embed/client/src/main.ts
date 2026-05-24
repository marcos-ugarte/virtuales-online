import { App } from "./App";
import * as ReactDOM from "react-dom";

let currentApp: App | undefined;
function recreate() {
  if (currentApp) currentApp.exit();
  currentApp = undefined;
  if (document.getElementById("root")) ReactDOM.unmountComponentAtNode(document.getElementById("root")!);
  const MyApp = require("./App").App;
  currentApp = new MyApp();
}

recreate();

const hm = module as any;
if (hm.hot) {
  hm.hot.accept("./client/src/App.tsx", () => {
    console.log("HOT RENDER!");
    recreate();
  });
}
