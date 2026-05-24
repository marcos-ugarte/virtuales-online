import { ServerSocketLogic } from "client/ServerWebSocket/ServerSocketLogic";
import { Errors } from "../ErrorHandler";
import { ILanguageText, ILanguageToken } from "common/Definitions";
import { Logger } from "client/Logic/Logger";
import { SockServLogMessage } from "client/ServerWebSocket/base/ServerSocketLogicBase";

export abstract class LanguagesBase {
  public static commaSymbol: string = ".";
  public static timeMillisecSymbol: string = ".";

  private setLanguage: string = "en";
  private translations: ILanguageText[] | null = null;

  private defaultTokens: ILanguageToken[] = [
    {
      id: "err_comm",
      value: "There was an error in communication. Please check the stability of your internet. The software tries to reconect.",
      fontSize: 10,
      charSpace: 1
    },
    {
      id: "err_setup",
      value: "There was an error during set up.",
      fontSize: 10,
      charSpace: 1
    },
    {
      id: "dateTimeFormat",
      value: "dd/mm/yyyy HH:MM:ss",
      fontSize: 10,
      charSpace: 1
    }
  ];

  constructor() {}

  public getText(tokenId: string): string {
    let readText: string = "_" + tokenId;

    if (this.translations === null) {
      const langTocken = this.defaultTokens.find((item) => item.id === tokenId);

      if (langTocken) {
        readText = langTocken.value;
      } else {
        Logger.error("Language Token not found, language:" + this.setLanguage + " token:" + tokenId);

        const logMessage = new SockServLogMessage(Errors.LOCALISATION.code, "Language Token not found, language:" + this.setLanguage + " token:" + tokenId);
        ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
          Logger.error("Send log Error:" + JSON.stringify(error));
        });
      }
    } else {
      const translation = this.translations.find((item) => item.langId === this.setLanguage);

      if (translation) {
        const langTocken = translation.tokens.find((item) => item.id === tokenId);

        if (langTocken) {
          readText = langTocken.value;
        } else {
          Logger.error("Language Token not found, language:" + this.setLanguage + " token:" + tokenId);

          const logMessage = new SockServLogMessage(Errors.LOCALISATION.code, "Language Token not found, language:" + this.setLanguage + " token:" + tokenId);
          ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
            Logger.error("Send log Error:" + JSON.stringify(error));
          });

          // take english token instead
          readText = this.getEnglishToken(tokenId);
        }
      } else {
        Logger.error("Language not found:" + this.setLanguage);

        const logMessage = new SockServLogMessage(Errors.LOCALISATION.code, "Language not found:" + this.setLanguage);
        ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
          Logger.error("Send log Error:" + JSON.stringify(error));
        });

        // take english token instead
        readText = this.getEnglishToken(tokenId);
      }
    }

    return readText;
  }

  public getEnglishToken(tokenId: string) {
    let readText = tokenId;

    if (this.translations) {
      // take english token instead
      const translationEn = this.translations.find((item) => item.langId === "en");
      if (translationEn) {
        const langTocken = translationEn.tokens.find((item) => item.id === tokenId);

        if (langTocken) {
          readText = langTocken.value;
        }
      }
    }

    return readText;
  }

  public updateLanguage(language: string, setLanguageFields: boolean) {
    this.setLanguage = language;

    // TODO TEST
    //this.setLanguage = "it";

    LanguagesBase.commaSymbol = this.getText("commaSym");
    LanguagesBase.timeMillisecSymbol = this.getText("hundrSym");

    if (setLanguageFields) {
      this.setLangFields();
    }
  }

  public setTranslations(translations: ILanguageText[]) {
    this.translations = translations;
  }

  public getTranslations(): ILanguageText[] | null {
    return this.translations;
  }

  public abstract setLangFields(): void;
}
