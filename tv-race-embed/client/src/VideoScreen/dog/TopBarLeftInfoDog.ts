import { oddsAlwaysOnTopLeftInfoBarTimings } from "./../../../settings/OddsAlwaysOnSettings";
import { settings } from "./../../Logic/Logic";
import { Group } from "client/Graphics/Group";
import { Logic, _s, _t } from "client/Logic/Logic";
import { GameType, GameLength } from "common/Definitions";
import { IAnimInterval } from "client/Logic/LogicDefinitions";
import { TopBarLeftPanelDog, TopBarPanelAnim } from "./TopBarLeftPanelDog";

export class TopBarLeftInfoDog extends Group {
  private panel: TopBarLeftPanelDog;
  //private getAnims = Util.memoize(_getAnims, () => ({ lang: Logic.languageId, gameType: this.gameType }));
  private gameType: GameType;
  private gameLength: GameLength;
  private oddsAlwaysOn;

  public constructor(gameType: GameType, gameLength: GameLength, oddsAlwaysOn = false) {
    super();
    this.showDebug(settings.debug, 1, "TopbarLeftInfoDOg");
    this.gameType = gameType;
    this.gameLength = gameLength;
    this.oddsAlwaysOn = oddsAlwaysOn;
    this.panel = new TopBarLeftPanelDog(gameType);
    this.add(this.panel);
  }

  public fill(withBonus: boolean) {
    const anims = this.createAnims(this.gameType, Logic.implementation.getCurrentIntroGameLength(), withBonus);
    this.panel.setAnims(anims);
  }

  public setForceReplayStartTime(forceReplayStartTime: number, withBonus: boolean) {
    const anims = this.createAnims(this.gameType, Logic.implementation.getCurrentIntroGameLength(), withBonus, forceReplayStartTime);
    this.panel.setAnims(anims);
  }

  public createAnims(gameType: GameType, gameLength: GameLength, withBonus: boolean, forceReplayStartTime?: number): TopBarPanelAnim[] {
    const introLength = Logic.getIntroLength();

    let track: IAnimInterval | undefined;
    let dogInfo: IAnimInterval | undefined;
    const anims: TopBarPanelAnim[] = [];

    let goStartTime = introLength - 5.0;

    if (gameType === "dog6" || gameType === "dog63") {
      if (gameType === "dog6") {
        switch (gameLength) {
          case 60: // no track/driver presentation
            break;
          case 120: // no track/driver presentation
            break;
          case 180:
            track = { startTime: withBonus ? 40.5 : 50.5, duration: 18.5 };
            dogInfo = { startTime: withBonus ? 60.5 : 70.5, duration: 19.5 };
            break;
          case 240:
            track = { startTime: 50.5, duration: 18.5 };
            dogInfo = { startTime: 70.5, duration: 19.5 };
            break;
          case 300:
            track = { startTime: withBonus ? 50.5 : 60.5, duration: 18.5 };
            dogInfo = { startTime: withBonus ? 70.5 : 80.5, duration: 19.5 };
            break;
        }
      } else if (gameType === "dog63") {
        switch (gameLength) {
          case 60: // no track/driver presentation
            break;
          case 120: // no track/driver presentation
            break;
          case 180:
            track = track = { startTime: withBonus ? 40.5 : 50.5, duration: 18.5 };
            dogInfo = undefined;
            break;
          case 240:
            track = { startTime: 50.5, duration: 18.5 };
            dogInfo = undefined;
            break;
          case 300:
            track = { startTime: withBonus ? 117.0 : 117.0, duration: 18.5 };
            dogInfo = undefined;
            break;
        }
      }

      if (this.oddsAlwaysOn) {
        dogInfo = undefined;
        const showInfo = !((gameLength === 120 || gameLength === 60) && withBonus);
        const { anims: raceCourseAnims, goOffset } = oddsAlwaysOnTopLeftInfoBarTimings[this.gameType as "dog6" | "dog63"][gameLength as 60 | 120 | 240 | 300];
        const oaoAnims: TopBarPanelAnim[] = raceCourseAnims;
        goStartTime = introLength - goOffset;

        oaoAnims.map((anim) => {
          anim.text = _t("raceCourse");
          anim.fill = [{ type: "gradient", color: "#23919c", color2: "#316573" }];
        });

        if (showInfo) anims.push(...oaoAnims);
      } else if (track) anims.push({ ...track, text: _t("raceCourse"), fill: [{ type: "gradient", color: "#23919c", color2: "#316573" }] });

      if (dogInfo) anims.push({ ...dogInfo, text: _t("dogRunInfo"), fill: [{ type: "gradient", color: "#3a5292", color2: "#183153" }] });

      anims.push(
        {
          startTime: goStartTime,
          duration: introLength - goStartTime,
          text: _t("goTxt"),
          fill: [
            { type: "gradient", color: "#3a5292", color2: "#183153" },
            { type: "gradient", color: "#0f854a", color2: "#125346" }
          ]
        },
        { startTime: introLength, duration: 30.0, text: _t("activeRace"), fill: [{ type: "gradient", color: "#0f854a", color2: "#125346" }] },
        { startTime: introLength + 31.2, duration: 8.0, text: _t("replay"), fill: [{ type: "gradient", color: "#D43734", color2: "#A22D2C" }] },
        { startTime: introLength + 39.5, duration: Logic.getRaceEndTime() - introLength - 39.5 - 15, text: _t("result"), fill: [{ type: "gradient", color: "#d9c45a", color2: "#bb9e3f" }] }
      );
    } else if (gameType === "horse") {
      //horse

      const goStartTime = introLength - 3.2;

      switch (gameLength) {
        case 320:
          track = { startTime: /*withBonus ? */ 50.2 /*: 60.5*/, duration: 19.2 };
          dogInfo = { startTime: /*withBonus ?*/ 70.2 /*: 80.5*/, duration: 29.2 };
          break;
        case 384:
          track = { startTime: /*withBonus ? */ 50.2 /*: 60.5*/, duration: 19.2 };
          dogInfo = { startTime: /*withBonus ?*/ 70.2 /*: 80.5*/, duration: 29.2 };
      }
      if (this.oddsAlwaysOn) {
        dogInfo = undefined;
        anims.push(
          {
            startTime: 43,
            duration: 18.5,
            text: _t("raceCourse"),
            fill: [{ type: "gradient", color: "#BA8500", color2: "#8C7718" }]
          },
          {
            startTime: 106,
            duration: 18.5,
            text: _t("raceCourse"),
            fill: [{ type: "gradient", color: "#BA8500", color2: "#8C7718" }]
          }
        );
      } else if (track)
        anims.push({ ...track, text: _t("raceCourse"), fill: [{ type: "gradient", color: gameType === "horse" ? "#BA8500" : "#863A64", color2: gameType === "horse" ? "#8C7718" : "441634" }] });

      if (dogInfo) anims.push({ ...dogInfo, text: _t("horRunnerInfo"), fill: [{ type: "gradient", color: "#987825", color2: "#4C2D09" }] });

      const showResultStartTime = forceReplayStartTime ? forceReplayStartTime + 7 : 90.5;

      anims.push(
        {
          startTime: goStartTime,
          duration: introLength - goStartTime,
          text: _t("goTxt"),
          fill: [
            { type: "gradient", color: "#987825", color2: "#4A2C08" },
            { type: "gradient", color: "#27aa65", color2: "#268d58" }
          ]
        },
        { startTime: introLength, duration: 83.1, text: _t("activeRace"), fill: [{ type: "gradient", color: "#2A7B39", color2: "#1D6135" }] },
        { startTime: introLength + (forceReplayStartTime ? forceReplayStartTime : 83.35), duration: 6.5, text: _t("replay"), fill: [{ type: "gradient", color: "#CC2A23", color2: "#8E2F23" }] },
        {
          startTime: introLength + showResultStartTime,
          duration: Logic.getRaceEndTime() - introLength - showResultStartTime - 0.5,
          text: _t("result"),
          fill: [{ type: "gradient", color: "#D5C851", color2: "#B89D2A" }]
        }
      );
    } else if (gameType === "sulky") {
      // sulky
      const goStartTime = introLength - 3.2;

      switch (gameLength) {
        case 320:
          track = { startTime: /*withBonus ? */ 50.2 /*: 60.5*/, duration: 19.2 };
          dogInfo = { startTime: /*withBonus ?*/ 70.2 /*: 80.5*/, duration: 29.2 };
          break;
        case 384:
          track = { startTime: /*withBonus ? */ 50.2 /*: 60.5*/, duration: 19.2 };
          dogInfo = { startTime: /*withBonus ?*/ 70.2 /*: 80.5*/, duration: 29.2 };
      }
      if (this.oddsAlwaysOn) {
        dogInfo = undefined;
        anims.push(
          {
            startTime: 43,
            duration: 18.5,
            text: _t("raceCourse"),
            fill: [{ type: "gradient", color: "#c50161", color2: "#8f2653" }]
          },
          {
            startTime: 106,
            duration: 18.5,
            text: _t("raceCourse"),
            fill: [{ type: "gradient", color: "#c50161", color2: "#8f2653" }]
          }
        );
      } else if (track) anims.push({ ...track, text: _t("raceCourse"), fill: [{ type: "gradient", color: "#c50161", color2: "#8f2653" }] });
      if (dogInfo) anims.push({ ...dogInfo, text: _t("horRunnerInfo"), fill: [{ type: "gradient", color: "#933563", color2: "#480f36" }] });

      const showResultStartTime = forceReplayStartTime ? forceReplayStartTime + 7 : 90.5;

      anims.push(
        {
          startTime: goStartTime,
          duration: introLength - goStartTime,
          text: _t("goTxt"),
          fill: [
            { type: "gradient", color: "#933563", color2: "#480f36" },
            { type: "gradient", color: "#27aa65", color2: "#268d58" }
          ]
        },
        { startTime: introLength, duration: this.gameType === "horse" ? 83.1 : 135, text: _t("activeRace"), fill: [{ type: "gradient", color: "#2A7B39", color2: "#1D6135" }] },
        { startTime: introLength + (forceReplayStartTime ? forceReplayStartTime : 83.35), duration: 6.5, text: _t("replay"), fill: [{ type: "gradient", color: "#CC2A23", color2: "#8E2F23" }] },
        {
          startTime: introLength + showResultStartTime,
          duration: Logic.getRaceEndTime() - introLength - showResultStartTime - 0.5,
          text: _t("result"),
          fill: [{ type: "gradient", color: "#D5C851", color2: "#B89D2A" }]
        }
      );
    } else {
      // dog8
      switch (gameLength) {
        case 120: // no track/driver presentation
          break;
        case 180:
          track = { startTime: withBonus ? 40.5 : 50.5, duration: 18.5 };
          dogInfo = { startTime: withBonus ? 60.5 : 70.5, duration: 19.5 };
          break;
        case 240:
          track = { startTime: 50.5, duration: 18.5 };
          dogInfo = { startTime: 70.5, duration: 29.5 };
          break;
        case 300:
          track = { startTime: withBonus ? 50.5 : 60.5, duration: 18.5 };
          dogInfo = { startTime: withBonus ? 70.5 : 80.5, duration: 29.5 };
          break;
      }
      if (this.oddsAlwaysOn) {
        dogInfo = undefined;
        const showInfo = !(gameLength === 120 && withBonus);

        const { anims: raceCourseAnims, goOffset } = oddsAlwaysOnTopLeftInfoBarTimings.dog8[gameLength as 120 | 240 | 300];
        const oaoAnims: TopBarPanelAnim[] = raceCourseAnims;

        goStartTime = introLength - goOffset;

        oaoAnims.map((anim) => {
          anim.text = _t("raceCourse");
          anim.fill = [{ type: "gradient", color: "#d7b046", color2: "#aa6f29" }];
        });

        if (showInfo) anims.push(...oaoAnims);
      } else if (track) anims.push({ ...track, text: _t("raceCourse"), fill: [{ type: "gradient", color: "#C8A64E", color2: "#966A3C" }] });

      if (dogInfo) anims.push({ ...dogInfo, text: _t("dogRunInfo"), fill: [{ type: "gradient", color: "#40926B", color2: "#125346" }] });

      anims.push(
        {
          startTime: goStartTime,
          duration: introLength - goStartTime,
          text: _t("goTxt"),
          fill: [
            { type: "gradient", color: "#158348", color2: "#066335" },
            { type: "gradient", color: "#27aa65", color2: "#268d58" }
          ]
        },
        { startTime: introLength, duration: 36.0, text: _t("activeRace"), fill: [{ type: "gradient", color: "#40926B", color2: "#125346" }] },
        { startTime: introLength + 31.2, duration: 8.0, text: _t("replay"), fill: [{ type: "gradient", color: "#D43734", color2: "#A22D2C" }] },
        { startTime: introLength + 39.5, duration: Logic.getRaceEndTime() - introLength - 39.5 - 2, text: _t("result"), fill: [{ type: "gradient", color: "#d9c45a", color2: "#bb9e3f" }] }
      );
    }
    return anims;
  }

  public onLayout() {
    this.panel.position.y = 0;
    //this.panel.position.y = _s(50);
    this.panel.height = this.height;
  }

  public update(dt: number) {
    super.update(dt);
  }
}
