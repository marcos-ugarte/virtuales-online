/**
 * TRIMMED HorseHelper — WinnerDog imports `HorseHelper.getWhiteColor()` for the
 * winner quote / description text fill. In streaming_kit, HorseHelper delegates
 * to DogHelper.getWhiteColor(), which returns the constant `whiteColor`
 * ("white") for every non-"BDR-MSA" dev user — i.e. always "white" in
 * production. WinnerDog uses NOTHING else from HorseHelper, so we vendor just
 * this one method rather than pull in the whole HorseHelper/DogHelper graph.
 */
export class HorseHelper {
  private static whiteColor = "white";

  public static getWhiteColor(): string {
    return this.whiteColor;
  }
}
