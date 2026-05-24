//import * as PIXI from "pixi.js";
import { Group } from "client/Graphics/Group";
import { Logic, _s, settings, _t } from "client/Logic/Logic";
import { GameType } from "common/Definitions";
import { Point } from "pixi.js";
import * as PIXI from "pixi.js";
import { AnimHelper } from "../common/Anim";
import { DoubleVideoSource } from "../DoubleVideoSource";
import { KickboxHelper } from "./KickboxHelper";

export class TopBarLeftKickBox extends Group {
  private gameType: GameType;
  private totalTextWidth = 100;
  private titleCharacters: PIXI.Text[] = [];
  private titleCharsCenters: Point[] = [];

  private debugVideoSourceText: PIXI.Text;

  //private text: MultiStyleText;
  private isFading: () => boolean;

  private showDebugOverlay = false;

  public constructor(gameType: GameType, isFading: () => boolean) {
    super();

    this.gameType = gameType;
    this.isFading = isFading;

    this.showDebug(settings.debug);
    {
      // TODO: das measure könnt sich ändern - wenn sich die Auflösung ändert stimmts nicht mehr zusammen - kann das passieren während dem laufen?
      const style = new PIXI.TextStyle({
        fontFamily: "DIN-HeavyItalic",
        fontSize: _s(28),
        letterSpacing: _s(0),
        fill: "white",
        align: "center",
        fontStyle: "italic"
      });
      const style2 = new PIXI.TextStyle({
        fontFamily: "DIN-HeavyItalic",
        fontSize: _s(28),
        letterSpacing: _s(0),
        fill: "#3eadad",
        align: "center",
        fontStyle: "italic"
      });

      const whiteText = _t("kickboxName");
      const turquoiseText = _t("kbMania");

      const text = whiteText + turquoiseText;
      let count = 0;
      this.totalTextWidth = 0;
      for (const char of text) {
        const measure = PIXI.TextMetrics.measureText(char, style);
        this.titleCharsCenters.push(new Point(measure.width, measure.lineHeight / 2));
        this.totalTextWidth += measure.width;
        const charText = Logic.createPixiText(count < whiteText.length ? style : style2, char);
        charText.anchor.set(0.5, 0.5);
        this.add(charText);
        this.titleCharacters.push(charText);
        count++;
      }

      {
        const debugStyle = new PIXI.TextStyle({
          fontFamily: "DIN-BoldItalic",
          fontSize: _s(18),
          letterSpacing: _s(0),
          fill: "orange",
          align: "left"
        });
        this.debugVideoSourceText = Logic.createPixiText(debugStyle);
        if (this.showDebugOverlay) this.add(this.debugVideoSourceText);
      }

      // const titleText = "KICKBOX<style2>MANIA</style2>";
      // this.text = new MultiStyleText(titleText, { default: style, style2 });
      // this.text.anchor.set(0, 0.5);
      // this.add(this.text);
    }

    this.alpha = 1.0;
  }

  public fill() {}

  public onLayout() {
    let scaleFactor = 1;
    if (this.totalTextWidth > this.width) {
      scaleFactor = this.width / this.totalTextWidth;
    }

    let curXOffset = _s(2);
    for (let i = 0; i < this.titleCharacters.length; i++) {
      //curXOffset += _s(5);
      curXOffset += this.titleCharsCenters[i].x / 2;
      this.titleCharacters[i].x = curXOffset * scaleFactor;
      this.titleCharsCenters[i].y = 0;
      curXOffset += this.titleCharsCenters[i].x / 2;
      //curXOffset += _s(5);
    }

    this.debugVideoSourceText.x = _s(10);
    this.debugVideoSourceText.y = _s(100);
    // this.debugVideoSourceText.width = _s(800);
    // this.debugVideoSourceText.height = _s(700);

    // this.logo.width = _s(85.2);
    // Logic.loadSVG(this.gameType === "dog6" ? Logo6 : Logo8, { width: this.logo.width * Math.max(Engine.instance.resolution, 1.5) }).then((el) => {
    //   this.logo.texture = el;
    // });

    // UIHelper.fillNineSlicePlane(this.textBackground, this.height);
    // this.textBackground.position.y = 0;
    // const skewedRadius = UIHelper.getSkewedRadius(this.height);
    // const gradient = calcDefaultTopBarGradient(this.gameType);
    // this.textBackground.texture = DrawHelper.createSkewedRoundedRectangleTexture(UIHelper.getSkewedBorder(skewedRadius, 0) * 2, this.height, skewedRadius, 0, { type: "gradient", color: gradient.color, color2: gradient.color2 });
    // const animatedItemTex = DrawHelper.createSkewedRoundedRectangleTexture(UIHelper.getSkewedBorder(skewedRadius, 0) * 2, this.height, skewedRadius, 0, { type: "gradient", color: gradient.color, color2: gradient.color2});
    // for (const item of this.animatedItems) {
    //   item.texture = animatedItemTex;
    //   UIHelper.setPixiSkew(item, this.height);
    // }

    // this.y += _s(50);
  }

  private lastCurrentIndex = 0;
  // private timeInLastCurrentIndex = 0;
  // private dtInLastCurrentIndex = 0;
  private lastVideoTime = 0;

  private timeInVideos: number[] = [];
  private dtInVideos: number[] = [];

  public update(dt: number) {
    super.update(dt);

    const t = this.isFading() ? 10 : Logic.getVideoTime();
    const infoAnim = Logic.getAnim(t, [{ startTime: 0, duration: Logic.getRaceEndTime() - 3.2 }], this);
    //], )//, this.textBackground);

    if (this.showDebugOverlay) {
      const videoSource = Logic.videoRef.getVideoSource() as DoubleVideoSource;
      if (videoSource) {
        this.debugVideoSourceText.text = "double";

        const videoInfos = videoSource.getVideoInfos();
        if (videoInfos.length === 0) {
          this.debugVideoSourceText.text = "video infos not set";
        } else {
          const currentVideoInfo = videoSource.getCurrentVideoInfo();
          const nextVideoInfo = videoSource.getDebugNextVideoInfo();

          const mapped = videoInfos.map((x, index) => index.toString() + ": " + x.url.substring(x.url.lastIndexOf("/"), x.url.indexOf("mp4") + 3) + "/" + x.length + "s");
          if (mapped.length !== this.timeInVideos.length) {
            this.timeInVideos = [];
            this.dtInVideos = [];
            // eslint-disable-next-line @typescript-eslint/prefer-for-of
            for (let i = 0; i < mapped.length; i++) {
              this.timeInVideos.push(0);
              this.dtInVideos.push(0);
            }
            this.lastVideoTime = Logic.getVideoTime();
          }

          if (currentVideoInfo) {
            const index = videoInfos.indexOf(currentVideoInfo);

            if (index === this.lastCurrentIndex) {
              this.dtInVideos[index] += dt;
              this.timeInVideos[index] += Logic.getVideoTime() - this.lastVideoTime;
            } else {
              this.dtInVideos[index] = 0;
              this.timeInVideos[index] = 0;
            }

            if (index === this.lastCurrentIndex || index === this.lastCurrentIndex + 1 || index === 0) {
              // everything correct
              this.lastCurrentIndex = index;
            } else {
              console.error("video skipped! from " + this.lastCurrentIndex + " to " + index);
              this.lastCurrentIndex = index;
            }
            // eslint-disable-next-line @typescript-eslint/prefer-for-of
            for (let i = 0; i < mapped.length; i++) {
              mapped[i] += ` [timeInVideo: ${this.timeInVideos[i].toFixed(1)}, dt: ${this.dtInVideos[i].toFixed(1)}]`;
            }
            mapped[index] = "[Current]" + mapped[index];
          }
          if (nextVideoInfo) {
            const index = videoInfos.indexOf(nextVideoInfo);
            mapped[index] = "[Next]" + mapped[index];
          }

          this.debugVideoSourceText.text = mapped.join("\n");
        }

        this.lastVideoTime = Logic.getVideoTime();
      }
    }

    //this.textBackground.position.x = _s(66.5);
    if (infoAnim) {
      const baseFactor = t - infoAnim.startTime;

      let scaleFactor = 1;
      if (this.totalTextWidth > this.width) {
        scaleFactor = this.width / this.totalTextWidth;
      }

      const offset = 0.1;
      if (!this.isFading()) {
        for (let i = 0; i < this.titleCharacters.length; i++) {
          AnimHelper.animateIn(baseFactor, offset * i, 2, 0.1, 0, 1, (x) => (this.titleCharacters[i].alpha = x));

          AnimHelper.animateIn(baseFactor, offset * i, 2, 0.5, 2, 1 * scaleFactor, (x) => this.titleCharacters[i].scale.set(x, x));
        }
      }

      if (t > Logic.getRaceEndTime() - 7) {
        AnimHelper.animateInOut(
          baseFactor,
          Logic.getRaceEndTime() - 7,
          Logic.getRaceEndTime() - 4,
          0,
          0,
          1,
          (alpha) => {
            for (let i = 0; i < this.titleCharacters.length; i++) {
              this.titleCharacters[i].alpha = alpha;
            }
          },
          0.5,
          0
        );
      }

      //AnimHelper.animateInOut(baseFactor, 0, Logic.getRaceEndTime()-KickboxHelper.fightResultLength+3, 0, 1, 1, x => this.alpha = x, 1, 0);

      // let f = 0;
      // if (t < infoAnim.startTime + infoAnim.duration - 1) {
      //   f = t - infoAnim.startTime;
      // } else {
      //   f = (infoAnim.startTime + infoAnim.duration - t) * 2;
      // }
      //this.textBackground.width = AnimHelper.easeOut(AnimHelper.clamp(f - 0.8)) * _s(this.gameType === "dog6" ? 175 : 185);

      //this.text.position.y = this.gameType === "dog8" ? _s(15.2) : _s(17.5);
      //this.text.position.x = this.textBackground.position.x + _s(9) + (AnimHelper.easeOut(AnimHelper.clamp(f - 0.8)) - 1)  * _s(185);
      //this.text.alpha = AnimHelper.clamp(AnimHelper.easeIn(AnimHelper.clamp((f - 0.7) * 2)));

      // this.logo.position.x = _s(35);
      // this.logo.alpha = AnimHelper.easeIn(AnimHelper.clamp(f * 3));
      // this.logo.position.y = this.height * 0.5;
      // this.logo.height = this.logo.width * this.logo.texture.height / this.logo.texture.width;

      // this.animatedItems.forEach((item, index) => {
      //   const fn = AnimHelper.clamp(f - 0.2 - index * 0.2);
      //   item.x = this.textBackground.position.x + AnimHelper.easeOut(fn) * _s(181);
      //   item.scale.set(1.0 - AnimHelper.easeIn(fn), 1);
      //   item.alpha = fn > 0.001 && fn < 0.999 ? 1.0 - AnimHelper.easeIn(fn) : 0;
      // });
    }
  }
}
