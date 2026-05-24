import { Logger } from "client/Logic/Logger";

export enum HardwareTypes {
  STANDARD = "standard",
  ODROIDM1S = "odroidm1s"
}
export class HardwareRelatedSettings {
  public static EXTRA_LOAD_TIME_ODROIDM1S = 250;

  private hardwareType: HardwareTypes = HardwareTypes.STANDARD;

  public setHardwareType(hardwareId: string) {
    this.hardwareType = hardwareId as HardwareTypes;
    Logger.info("Hardware Type is set to:" + this.hardwareType);
  }

  public getExtraLoadTime(): number {
    let extraLoadTime = 0;

    if (this.hardwareType === HardwareTypes.ODROIDM1S) {
      extraLoadTime = HardwareRelatedSettings.EXTRA_LOAD_TIME_ODROIDM1S;
    }

    return extraLoadTime;
  }
}
