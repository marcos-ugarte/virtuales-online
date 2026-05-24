import { ITrackInfo, ITrackItem } from "client/Logic/LogicDefinitions";
import { Util } from "common/Util";
import { LanguagesBase } from "./base/LocalisationBase";
import { trackKart, raceIntervalsKart } from "./ModelKart";
import { Logic } from "client/Logic/Logic";
import { raceIntervalsDog6, trackDog, raceIntervalsDog8, raceIntervalsDog63 } from "./ModelDog";
import { raceIntervalsHorse, trackHorse } from "client/LogicImplementation/ModelHorse";
import { raceIntervalsSulky, trackSulky } from "client/LogicImplementation/ModelSulky";

export class Languages extends LanguagesBase {
  private static internalInstance: Languages;
  static get instance() {
    if (this.internalInstance == null) this.internalInstance = new Languages();
    return this.internalInstance;
  }

  constructor() {
    super();
  }

  public setLangFields() {
    if (Logic.implementation.getGameInfo().gameType === "kart5") {
      trackKart.name = Languages.instance.getText("internationalRaceCircuit").replace("___LF___", "\n").replace("___LF___", "\n");
      trackKart.country = Languages.instance.getText("austria");

      let info: ITrackInfo | undefined = trackKart.facts.find((i) => i.key === "LAP LENGTH");
      if (info) info.key = Languages.instance.getText("lapLength");

      info = trackKart.facts.find((i) => i.key === "NUMBER OF LAPS");
      if (info) {
        info.key = Languages.instance.getText("numberOfLabs");
        info.value = Util.formatValue(parseFloat(info.value), 2, LanguagesBase.commaSymbol);
      }

      info = trackKart.facts.find((i) => i.key === "RACE DISTANCE");
      if (info) info.key = Languages.instance.getText("raceDistance");

      let item: ITrackItem | undefined = trackKart.items.find((i) => i.line1 === "FINISH <b>LINE</b>");
      if (item) {
        item.abbr = Languages.instance.getText("finishLineSh");
        item.line1 = Languages.instance.getText("finishLine");
      }

      item = trackKart.items.find((i) => i.line1 === "START <b>LINE</b>");
      if (item) {
        item.abbr = Languages.instance.getText("startLineSh");
        item.line1 = Languages.instance.getText("startLine");
      }

      item = trackKart.items.find((i) => i.line1 === "TURN <b>01/08</b>");
      if (item) {
        item.abbr = Languages.instance.getText("turnSh") + "1";
        item.line1 = item.line1.replace("TURN", Languages.instance.getText("turn"));
        if (item.line2) item.line2 = item.line2.replace("HAIRPIN", Languages.instance.getText("hairPin"));
        if (item.curveType) item.curveType = item.curveType.replace("U-TURN", Languages.instance.getText("uTurn"));
      }

      item = trackKart.items.find((i) => i.line1 === "TURN <b>02/09</b>");
      if (item) {
        item.abbr = Languages.instance.getText("turnSh") + "2";
        item.line1 = item.line1.replace("TURN", Languages.instance.getText("turn"));
        if (item.line2) item.line2 = item.line2.replace("CURVE", Languages.instance.getText("curve"));
        if (item.curveType) item.curveType = item.curveType.replace("LEFT", Languages.instance.getText("left"));
      }

      item = trackKart.items.find((i) => i.line1 === "TURN <b>03</b>");
      if (item) {
        item.abbr = Languages.instance.getText("turnSh") + "3";
        item.line1 = item.line1.replace("TURN", Languages.instance.getText("turn"));
        if (item.line2) item.line2 = item.line2.replace("BEND", Languages.instance.getText("bend"));
        if (item.interval) item.interval = item.interval.replace("INTERVAL", Languages.instance.getText("interval"));
      }

      item = trackKart.items.find((i) => i.line1 === "TURN <b>04</b>");
      if (item) {
        item.abbr = Languages.instance.getText("turnSh") + "4";
        item.line1 = item.line1.replace("TURN", Languages.instance.getText("turn"));
        if (item.line2) item.line2 = item.line2.replace("BEND", Languages.instance.getText("bend"));
        if (item.curveType) item.curveType = item.curveType.replace("RIGHT", Languages.instance.getText("right"));
      }

      item = trackKart.items.find((i) => i.line1 === "TURN <b>05</b>");
      if (item) {
        item.abbr = Languages.instance.getText("turnSh") + "5";
        item.line1 = item.line1.replace("TURN", Languages.instance.getText("turn"));
        if (item.interval) item.interval = item.interval.replace("INTERVAL", Languages.instance.getText("interval"));
      }

      item = trackKart.items.find((i) => i.line1 === "HIGH SPEED Section 1");
      if (item) {
        item.abbr = Languages.instance.getText("highspeedSectionSh") + "1";
        item.line1 = item.line1.replace("HIGH SPEED Section", Languages.instance.getText("highspeedSection"));
      }
      item = trackKart.items.find((i) => i.line1 === "TURN <b>06</b>");
      if (item) {
        item.abbr = Languages.instance.getText("turnSh") + "6";
        item.line1 = item.line1.replace("TURN", Languages.instance.getText("turn"));
        if (item.line2) item.line2 = item.line2.replace("HAIRPIN", Languages.instance.getText("hairPin"));
        if (item.curveType) item.curveType = item.curveType.replace("U-TURN", Languages.instance.getText("uTurn"));
      }

      item = trackKart.items.find((i) => i.line1 === "THE JUST <b>HILL</b>");
      if (item) {
        item.abbr = Languages.instance.getText("hillSh");
        if (item.line2) item.line2 = item.line2.replace("MAX Elevation", Languages.instance.getText("maxElev")).replace(".", LanguagesBase.commaSymbol);
      }

      item = trackKart.items.find((i) => i.line1 === "TURN <b>07</b>");
      if (item) {
        item.abbr = Languages.instance.getText("turnSh") + "7";
        item.line1 = item.line1.replace("TURN", Languages.instance.getText("turn"));
        if (item.line2) item.line2 = item.line2.replace("BEND", Languages.instance.getText("bend"));
        if (item.interval) item.interval = item.interval.replace("INTERVAL", Languages.instance.getText("interval"));
      }

      item = trackKart.items.find((i) => i.line1 === "HIGH SPEED Section 2");
      if (item) {
        item.abbr = Languages.instance.getText("highspeedSectionSh") + "2";
        item.line1 = item.line1.replace("HIGH SPEED Section", Languages.instance.getText("highspeedSection"));
      }
      for (const interval of raceIntervalsKart) {
        interval.title = interval.title.replace("START POSITIONS", Languages.instance.getText("startPositions"));
        interval.title = interval.title.replace("INTERVAL", Languages.instance.getText("interval"));
      }
    }

    if (Logic.isDog(Logic.implementation.getGameInfo().gameType, Logic.implementation.getGameInfo().gameSkin) || Logic.isDog63(Logic.implementation.getGameInfo().gameType)) {
      trackDog.name = Languages.instance.getText("dogRaceCircuit");
      trackDog.country = Languages.instance.getText("dogCircCoun");

      let info: ITrackInfo | undefined = trackDog.facts.find((i) => i.key === "LAP LENGTH:");
      if (info) info.key = Languages.instance.getText("lapLength") + ":";

      info = trackDog.facts.find((i) => i.key === "NUMBER OF LAPS:");
      if (info) {
        info.key = Languages.instance.getText("numberOfLabs") + ":";
        info.value = Util.formatValue(parseFloat(info.value), 2, LanguagesBase.commaSymbol);
      }

      info = trackDog.facts.find((i) => i.key === "AVG TIME:");
      if (info) {
        info.key = Languages.instance.getText("avgTime") + ":";
        info.value = Util.formatValue(parseFloat(info.value), 2, LanguagesBase.commaSymbol);
      }

      info = trackDog.facts.find((i) => i.key === "COURSE CONDITIONS:");
      if (info) {
        info.key = Languages.instance.getText("courseCond") + ":";
        info.value = Languages.instance.getText("fast");
      }

      const item: ITrackItem | undefined = trackDog.items.find((i) => i.line1 === "FINISH");
      if (item) item.line1 = Languages.instance.getText("finish");

      const items = trackDog.items.filter((i) => i.line1 === "START BOX");

      for (const startItem of items) {
        startItem.line1 = Languages.instance.getText("startBox");
      }

      for (const interval of raceIntervalsDog6) {
        interval.title = interval.title.replace("START POSITIONS", Languages.instance.getText("startPositions"));
        interval.title = interval.title.replace("INTERVAL", Languages.instance.getText("interval"));
      }
      for (const interval of raceIntervalsDog63) {
        interval.title = interval.title.replace("START POSITIONS", Languages.instance.getText("startPositions"));
        interval.title = interval.title.replace("INTERVAL", Languages.instance.getText("interval"));
      }
      for (const interval of raceIntervalsDog8) {
        interval.title = interval.title.replace("START POSITIONS", Languages.instance.getText("startPositions"));
        interval.title = interval.title.replace("INTERVAL", Languages.instance.getText("interval"));
      }
    }

    if (Logic.isHorse(Logic.implementation.getGameInfo().gameType, Logic.implementation.getGameInfo().gameSkin)) {
      trackHorse.name = Languages.instance.getText("horRacingCuiruit");
      trackHorse.country = Languages.instance.getText("horCircCoun");

      let info: ITrackInfo | undefined = trackHorse.facts.find((i) => i.key === "LAP LENGTH:");
      if (info) info.key = Languages.instance.getText("lapLength") + ":";

      info = trackHorse.facts.find((i) => i.key === "NUMBER OF LAPS:");
      if (info) {
        info.key = Languages.instance.getText("numberOfLabs") + ":";
        info.value = Util.formatValue(parseFloat(info.value), 2, LanguagesBase.commaSymbol);
      }

      info = trackHorse.facts.find((i) => i.key === "AVG TIME:");
      if (info) {
        info.key = Languages.instance.getText("avgTime") + ":";
        info.value = Util.formatValue(parseFloat(info.value), 2, LanguagesBase.commaSymbol);
      }

      info = trackHorse.facts.find((i) => i.key === "COURSE CONDITIONS:");
      if (info) {
        info.key = Languages.instance.getText("courseCond") + ":";
        info.value = Languages.instance.getText("fast");
      }

      const item: ITrackItem | undefined = trackHorse.items.find((i) => i.line1 === "FINISH");
      if (item) item.line1 = Languages.instance.getText("finish");

      const items = trackHorse.items.filter((i) => i.line1 === "START BOX");

      for (const startItem of items) {
        startItem.line1 = Languages.instance.getText("startBox");
      }

      for (const interval of raceIntervalsHorse) {
        interval.title = interval.title.replace("START POSITIONS", Languages.instance.getText("startPositions"));
        interval.title = interval.title.replace("INTERVAL", Languages.instance.getText("interval"));
      }
      for (const interval of raceIntervalsHorse) {
        interval.title = interval.title.replace("START POSITIONS", Languages.instance.getText("startPositions"));
        interval.title = interval.title.replace("INTERVAL", Languages.instance.getText("interval"));
      }
      for (const interval of raceIntervalsHorse) {
        interval.title = interval.title.replace("START POSITIONS", Languages.instance.getText("startPositions"));
        interval.title = interval.title.replace("INTERVAL", Languages.instance.getText("interval"));
      }
    }

    if (Logic.isSulky(Logic.implementation.getGameInfo().gameType)) {
      trackSulky.name = Languages.instance.getText("horRacingCuiruit");
      trackSulky.country = Languages.instance.getText("horCircCoun");

      let info: ITrackInfo | undefined = trackSulky.facts.find((i) => i.key === "LAP LENGTH:");
      if (info) info.key = Languages.instance.getText("lapLength") + ":";

      info = trackSulky.facts.find((i) => i.key === "NUMBER OF LAPS:");
      if (info) {
        info.key = Languages.instance.getText("numberOfLabs") + ":";
        info.value = Util.formatValue(parseFloat(info.value), 2, LanguagesBase.commaSymbol);
      }

      info = trackSulky.facts.find((i) => i.key === "AVG TIME:");
      if (info) {
        info.key = Languages.instance.getText("avgTime") + ":";
        info.value = Util.formatValue(parseFloat(info.value), 2, LanguagesBase.commaSymbol);
      }

      info = trackSulky.facts.find((i) => i.key === "COURSE CONDITIONS:");
      if (info) {
        info.key = Languages.instance.getText("courseCond") + ":";
        info.value = Languages.instance.getText("fast");
      }

      const item: ITrackItem | undefined = trackSulky.items.find((i) => i.line1 === "FINISH");
      if (item) item.line1 = Languages.instance.getText("finish");

      const items = trackSulky.items.filter((i) => i.line1 === "START BOX");

      for (const startItem of items) {
        startItem.line1 = Languages.instance.getText("startBox");
      }

      for (const interval of raceIntervalsSulky) {
        interval.title = interval.title.replace("START POSITIONS", Languages.instance.getText("startPositions"));
        interval.title = interval.title.replace("INTERVAL", Languages.instance.getText("interval"));
      }
    }
  }
}
