import { ErrorsBase, ErrorObj, ErrorHandlerBase } from "./base/ErrorHandlerBase";

export class Errors extends ErrorsBase {}

export class ErrorHandler extends ErrorHandlerBase {
  static get instance() {
    if (this.internalInstance == null) this.internalInstance = new ErrorHandler();
    return this.internalInstance;
  }

  private constructor() {
    super();
  }

  public isFatalError(errObj: ErrorObj): boolean {
    return false;
  }

  public setMessageText(errObj: ErrorObj, mesgText: string): string {
    return mesgText;
  }

  public okAction() {
    if (ErrorHandler.instance.callBackFuntion !== undefined) {
      ErrorHandler.instance.callBackFuntion();
    }
  }
}
