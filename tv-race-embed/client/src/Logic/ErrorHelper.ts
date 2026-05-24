import { ErrorHandler } from "client/LogicImplementation/ErrorHandler";
import { ErrorObj, ErrorsBase } from "client/LogicImplementation/base/ErrorHandlerBase";
import { Logger } from "./Logger";

export class ErrorHelper {
  public static showError(text: string): void {
    const error = new ErrorObj(ErrorsBase.ASSET_LOAD.code, text);
    ErrorHandler.instance.normalErrorHandler(error, true);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public static showAssetNotFoundError(url: string, e: any): void {
    Logger.error("Couldn't load asset: " + url + " " + e);
    this.showError("Couldn't load asset: <br/>" + url);
  }
}
