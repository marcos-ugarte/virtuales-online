import { Group } from "client/Graphics/Group";
import { _s } from "client/Logic/Logic";
import * as PIXI from "pixi.js";
import { SockServLogMessage } from "client/ServerWebSocket/base/ServerSocketLogicBase";
import { Errors } from "client/LogicImplementation/ErrorHandler";
import { ServerSocketLogic } from "client/ServerWebSocket/ServerSocketLogic";
import { Logger } from "client/Logic/Logger";

export class LayoutHelper {
  public static setScaledRectangle(group: Group, x: number, y: number, width: number, height: number) {
    if (group == null) {
      return;
    }
    group.x = _s(x);
    group.y = _s(y);
    group.width = _s(width);
    group.height = _s(height);
  }

  public static setScaledRectangleSprite(sprite: PIXI.Sprite, x: number, y: number, width: number, height: number /*, doTest?:boolean*/) {
    if (sprite == null) {
      console.error("Sprite to scale is null!");
    }
    sprite.x = _s(x);
    sprite.y = _s(y);

    //'TODO TEST
    // if(doTest === true){
    //   sprite = null;
    // }
    if (!sprite.texture.frame) {
      console.error("Sprite texture frame is null, setting to default!");
      sprite.texture.frame = new PIXI.Rectangle(0, 0, 1, 1);
      sprite.texture.updateUvs();

      let logMessage = new SockServLogMessage(Errors.SPRITE_NOT_SET_ERROR.code, "Sprite texture frame is null, setting to default!");
      ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
        Logger.error("Send log Error:" + JSON.stringify(error));
      });
    }
    sprite.width = _s(width);
    sprite.height = _s(height);
  }

  public static setScaledText(text: PIXI.Text, x: number, y: number) {
    text.x = _s(x);
    text.y = _s(y);
  }
}
