import { GameType, SkinType, SkinTypeDefinition } from "common/Definitions";
export class FadeDurations {
  public static totalFadeDuration: number = 2.0; // the total fade duration
  public static fadeDuration: number = this.totalFadeDuration * 0.5; // the time the video should be played during fade
  public static startVideoFactorRace: number = 0.0; // Race Video, when in second half of fade to be started (0 at end and 0.99 at begin)
  public static startVideoFactorIntro: number = 0.0; // Race Video, when in second half of fade to be started (0 at end and 0.99 at begin)

  public static setFadeDurations(gameType: GameType, skinType: SkinType) {
    this.totalFadeDuration = 2.0;

    if (skinType === SkinTypeDefinition.CLASSIC) {
      this.startVideoFactorIntro = 0.4;
      this.startVideoFactorRace = 0.9;
    } else {
      this.totalFadeDuration = 2.0;
    }

    this.fadeDuration = this.totalFadeDuration * 0.5;
  }
}
