import * as React from "react";
import * as ReactDOM from "react-dom";
import { Logger } from "./Logic/Logger";

export class MainHelpers {
  public static resetOnCrashHandler?: () => void;
  public static render(Component: any) {
    try {
      ReactDOM.render(<Component />, document.getElementById("root"));
    } catch (e) {
      Logger.error("MainHelpers.render: ", e);
      if (MainHelpers.resetOnCrashHandler) MainHelpers.resetOnCrashHandler();

      ReactDOM.render(<Component />, document.getElementById("root"));
    }
  }
}
