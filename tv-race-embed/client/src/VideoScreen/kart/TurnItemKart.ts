import { Logic, settings } from "./../../Logic/Logic";
import * as PIXI from "pixi.js";
import { trackPresentationKartSettings, trackPresentationKartStyles } from "./../../../settings/OddsAlwaysOnSettings";
import { Group } from "client/Graphics/Group";
import { _s } from "client/Logic/Logic";
import { MultiStyleText, ITextStyleSet, IExtendedTextStyle } from "../common/MultiStyleText";
import { ITrackItem } from "client/Logic/LogicDefinitions";

export class TurnItemKart extends Group {
  public itemAbbrevation: PIXI.Text;
  public textContainer: Group;
  public turnType: "turn" | "start_finish" | "highspeed_l" | "highspeed_r" | undefined;
  private line1: MultiStyleText;
  private line2: MultiStyleText;
  private curveType: MultiStyleText;
  private interval: MultiStyleText;
  public fadeInTime: number = 0;
  public fadeOutTime: number = Number.MAX_VALUE;
  private oddsAlwaysOn: boolean;
  public abbrPosition = { x: 0, y: 0 };

  public constructor(oddsAlwaysOn = false) {
    super();

    this.textContainer = new Group();
    this.textContainer.showDebug(settings.debug, 1, "TurnItemKart - TextContainer");
    this.oddsAlwaysOn = oddsAlwaysOn;

    this.itemAbbrevation = new PIXI.Text("");

    if (this.oddsAlwaysOn) this.add(this.itemAbbrevation);

    this.itemAbbrevation.anchor.y = 0.5;
    this.itemAbbrevation.anchor.x = 0.5;

    this.line1 = new MultiStyleText();
    this.textContainer.add(this.line1);

    this.line2 = new MultiStyleText();
    this.textContainer.add(this.line2);

    this.curveType = new MultiStyleText();
    this.textContainer.add(this.curveType);

    this.interval = new MultiStyleText();
    this.textContainer.add(this.interval);

    this.add(this.textContainer);
  }

  public fill(trackItem: ITrackItem) {
    const { line1, line2, interval, curveType } = trackPresentationKartStyles;
    {
      const defaultStyle: IExtendedTextStyle = {
        fontFamily: "DIN-UltraLight",
        fontSize: _s(13),
        letterSpacing: _s(1),
        fill: "white",
        maxLines: 1,
        wordWrap: true,
        wordWrapWidth: _s(90),
        trim: true,
        padding: 10
      };
      const boldStyle: IExtendedTextStyle = {
        fontFamily: "DIN-Medium",
        fontSize: _s(13),
        letterSpacing: _s(1),
        fill: "white",
        trim: true,
        padding: 10
      };

      this.showDebug(settings.debug, 1, "TurnItemKart - " + trackItem.line1);

      if (this.oddsAlwaysOn) {
        defaultStyle.fontSize = _s(line1.fontSize);
        boldStyle.fontSize = _s(line1.fontSize);
        defaultStyle.letterSpacing = _s(0.4);
        boldStyle.letterSpacing = _s(0.4);
        defaultStyle.wordWrap = false;
        Logic.autoSizeMultiStyleText(this.line1, trackItem.line1, _s(76), { default: defaultStyle, b: boldStyle }, true);
      } else {
        this.updateText(this.line1, trackItem.line1, { default: defaultStyle, b: boldStyle });
      }
    }
    {
      const defaultStyle: IExtendedTextStyle = {
        fontFamily: "DIN-UltraLight",
        fontSize: _s(9),
        maxLines: 1,
        letterSpacing: _s(1),
        fill: "white",
        wordWrap: true,
        wordWrapWidth: _s(85),
        lineHeight: _s(8),
        trim: true
      };
      const boldStyle: IExtendedTextStyle = {
        fontFamily: "DIN-Medium",
        fontSize: _s(9),
        maxLines: 1,
        letterSpacing: _s(1),
        fill: "white",
        padding: 10,
        trim: true
      };

      if (this.oddsAlwaysOn) {
        defaultStyle.fontSize = _s(line2.fontSize);
        boldStyle.fontSize = _s(line2.fontSize);
        defaultStyle.letterSpacing = _s(line2.letterSpacing);
        boldStyle.letterSpacing = _s(line2.letterSpacing);
        defaultStyle.wordWrap = false;

        Logic.autoSizeMultiStyleText(this.line2, trackItem.line2, _s(68), { default: defaultStyle, b: boldStyle }, true);
      } else {
        this.updateText(this.line2, trackItem.line2, { default: defaultStyle, b: boldStyle });
      }
    }
    {
      const defaultStyle: IExtendedTextStyle = {
        fontFamily: "DIN-Medium",
        fontSize: _s(13),
        fill: "white",
        align: "left",
        maxLines: 1,
        padding: 10,
        trim: true
      };
      const boldStyle: IExtendedTextStyle = {
        fontFamily: "DIN-Black",
        fontSize: _s(13),
        fill: "white",
        align: "left",
        maxLines: 1,
        padding: 10,
        trim: true
      };

      if (this.oddsAlwaysOn) {
        defaultStyle.fontSize = _s(interval.fontSize);
        boldStyle.fontSize = _s(interval.fontSize);
        defaultStyle.letterSpacing = _s(interval.letterSpacing);
        boldStyle.letterSpacing = _s(interval.letterSpacing);
      }
      this.updateText(this.interval, trackItem.interval, { default: defaultStyle, b: boldStyle });
    }
    {
      const defaultStyle: IExtendedTextStyle = {
        fontFamily: "DIN-Medium",
        fontSize: _s(9),
        fill: "black",
        align: "right",
        padding: 10,
        trim: true
      };
      const boldStyle: IExtendedTextStyle = {
        fontFamily: "DIN-Black",
        fontSize: _s(9),
        fill: "black",
        align: "right",
        padding: 10,
        trim: true
      };

      if (this.oddsAlwaysOn) {
        defaultStyle.fontSize = _s(curveType.fontSize);
        boldStyle.fontSize = _s(curveType.fontSize);
        Logic.autoSizeMultiStyleText(this.curveType, trackItem.curveType, _s(50), { default: defaultStyle, b: boldStyle }, true);
      } else {
        this.updateText(this.curveType, trackItem.curveType, { default: defaultStyle, b: boldStyle });
      }
    }
    {
      const defaultStyle: IExtendedTextStyle = {
        fontFamily: "DIN-BoldItalic",
        fontSize: _s(11),
        fill: "red",
        align: "right",
        padding: 10,
        trim: true
      };

      if (this.oddsAlwaysOn) {
        this.itemAbbrevation.style = defaultStyle;
        this.itemAbbrevation.text = trackItem.abbr!;
      }
    }
    this.interval.anchor.y = 0.5;
    this.line1.anchor.y = 0.5;
    this.line2.anchor.y = 0.5;
    this.curveType.anchor.y = 0.5;
    this.curveType.anchor.x = 1.0;
    // this.interval.setAnchor(0, 0.5);
    // this.line1.setAnchor(0, 0.5);
    // this.line2.setAnchor(0, 0.5);
    // this.curveType.align = "right";

    this.onLayout();
  }

  private updateText(multiText: MultiStyleText, text: string | undefined, styles?: ITextStyleSet) {
    if (text) {
      if (styles && settings.showDebugTextColor) {
        styles.default.fill = "orange";
        styles.b.fill = "orange";
      }
      if (styles) {
        styles.default.trim = true;
        styles.b.trim = true;
        multiText.styles = styles;
      }
      multiText.text = text;
      multiText.visible = true;
    } else {
      multiText.visible = false;
    }
  }

  public onLayout() {
    const { line2, interval, curveType } = trackPresentationKartSettings.turnItem;

    const isInterValItem = this.interval.text !== "";

    this.line1.x = _s(this.turnType === "start_finish" ? 12 : 5);
    this.line1.y = _s(9.5);

    this.line2.x = _s(5);
    this.line2.y = _s(isInterValItem ? 28 : 29);
    this.interval.x = _s(5);
    this.interval.y = _s(-8);

    this.curveType.x = this.width - _s(3);
    this.curveType.y = _s(45);

    if (this.oddsAlwaysOn) {
      this.line1.x = _s(this.turnType === "start_finish" ? 7 : 2.5);
      this.line1.y = _s(7.5);
      this.line2.x = _s(this.turnType === "start_finish" ? 7 : 2.5);
      this.line2.y = _s(line2.y);
      this.interval.y = _s(interval.y);
      this.interval.x = _s(interval.x);
      this.curveType.x = this.textContainer.width - _s(3);
      this.curveType.y = _s(curveType.y);
      this.itemAbbrevation.x = _s(this.abbrPosition.x);
      this.itemAbbrevation.y = _s(this.abbrPosition.y);
    }
  }
}
