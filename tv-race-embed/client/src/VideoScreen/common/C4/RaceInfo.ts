import { AnimHelper } from "client/VideoScreen/common/Anim";
import { _t, settings } from "./../../../Logic/Logic";
import { Group } from "client/Graphics/Group";
import { Logic, _s } from "client/Logic/Logic";
import { IAnimInterval, IGameInfo, IRoundInfo, VideoState } from "client/Logic/LogicDefinitions";
import * as PIXI from "pixi.js";
import RaceInfoBackground from "../../../../assets/c4/RaceNumberBackground.png";
import RaceInfoBackgroundS from "../../../../assets/c4/RaceNumberBackground_s.png";
import { ChangeAbleText } from "../ChangeAbleText";
export class RaceInfo extends Group {
  private isSmall: boolean;
  private animation: IAnimInterval[];
  private withTransition: boolean;

  private raceInfoSprite: PIXI.Sprite = new PIXI.Sprite();
  private raceInfoTexture: PIXI.Texture | undefined;
  private raceInfoText: PIXI.Text = Logic.createPixiText();
  private raceNumberText: PIXI.Text;

  private gameInfo: IGameInfo;

  public constructor(gameInfo: IGameInfo, isSmall = false, animation = [{ startTime: 0, duration: Logic.getIntroLength() }], withTransition = false) {
    super();
    this.gameInfo = gameInfo;
    this.isSmall = isSmall;
    this.width = 245.25;
    this.height = this.isSmall ? 85 : 135.5;
    this.animation = animation;
    this.withTransition = withTransition;
    this.add(this.raceInfoSprite);
    this.showDebug(settings.debug, undefined, "RaceInfo");
    // Add text
    const raceInfoTextStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Light",
      fontSize: _s(30),
      trim: true,
      padding: 10,
      fill: 0xffffff
    });

    const raceNumberTextStyle = new PIXI.TextStyle({
      fontFamily: "Roboto-Medium",
      fontSize: this.isSmall ? _s(63) : _s(60.5),
      fill: 0xffffff,
      letterSpacing: _s(1)
    });

    this.raceNumberText = Logic.createPixiText(raceNumberTextStyle);
    this.raceInfoText.style = raceInfoTextStyle;

    this.add(this.raceInfoText);
    this.add(this.raceNumberText);
  }

  public onLayout(): void {
    const positionY = 26.25;
    const positionX = 45.25;
    const height = this.isSmall ? 85 : 136;
    const width = 245;
    // Add sprite shapes
    this.raceInfoSprite.anchor.x = 0.5;
    this.raceInfoSprite.anchor.y = 0.5;
    this.raceInfoSprite.position.y = _s(positionY + this.height / 2);
    this.raceInfoSprite.position.x = _s(positionX + this.width / 2);
    this.raceInfoSprite.width = _s(width);
    this.raceInfoSprite.height = _s(height);

    if (settings.debug) {
      // this.raceInfoSprite.tint = 0x000;
      this.raceInfoSprite.alpha = 0.4;
    }

    this.raceInfoText.anchor.x = 0;
    this.raceInfoText.anchor.y = 0.5;

    this.raceNumberText.anchor.set(0, 0.5);

    if (this.isSmall) {
      this.raceInfoText.rotation = (Math.PI * -90.0) / 180.0;
      this.raceInfoText.position.y = _s(positionY + height * 0.83);
      this.raceInfoText.position.x = _s(positionX + width * 0.2);

      this.raceNumberText.position.y = _s(positionY + height * 0.55);
      this.raceNumberText.position.x = _s(positionX + width * 0.27);
    } else {
      this.raceInfoText.position.y = _s(positionY + height * 0.32);
      this.raceInfoText.position.x = _s(positionX + width * 0.15);

      this.raceNumberText.position.y = _s(positionY + height * 0.68);
      this.raceNumberText.position.x = _s(positionX + width * 0.15);
    }
  }

  public async init(): Promise<void> {
    this.raceInfoTexture = await Logic.loadTexture(this.isSmall ? RaceInfoBackgroundS : RaceInfoBackground);
    this.raceInfoSprite.texture = this.raceInfoTexture;
  }

  public fill(roundInfo: IRoundInfo): void {
    if (this.gameInfo.gameType === "roulette") {
      this.raceInfoText.text = _t("round");
    } else {
      this.raceInfoText.text = _t("raceCl");
      this.raceInfoText.pivot.y = 0.5;
      if (this.isSmall) {
        Logic.autoSize(this.raceInfoText, _s(50));
      } else {
        Logic.autoSize(this.raceInfoText, _s(180));
      }
    }

    let raceNumber = roundInfo.raceNumber.toString();
    if (roundInfo.raceNumber.length < 4) raceNumber = "0" + raceNumber;
    this.raceNumberText.text = raceNumber;
  }

  public update(dt: number): void {
    super.update(dt);
    const currentTime = Logic.getVideoTime();
    const anim = Logic.getAnim(currentTime, this.animation, this);

    if (!anim || (Logic.isFading && Logic.fadeTarget === VideoState.Race)) {
      this.visible = false;
      return;
    }

    this.visible = true;
    const baseFactor = currentTime - anim.startTime;

    AnimHelper.animateInOut(baseFactor, 0, anim.duration, 0, 0, 1, (val) => (this.alpha = val), 0.00001, 0);

    if (this.withTransition) {
      AnimHelper.animateIn(baseFactor, 0, anim.duration, 0.2, 0, 1, (val) => {
        this.raceInfoSprite.height = _s(this.height) * val;
        this.raceInfoSprite.width = _s(this.width) * val;
      });

      AnimHelper.animateIn(baseFactor, 0, anim.duration, 0.7, 0, 1, (val) => {
        this.raceNumberText.alpha = val;
        this.raceInfoText.alpha = val;
      });
    }
  }
}
