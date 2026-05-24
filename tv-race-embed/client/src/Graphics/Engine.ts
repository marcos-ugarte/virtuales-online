import { Logger } from "client/Logic/Logger";
import { Logic } from "client/Logic/Logic";
import { Errors } from "client/LogicImplementation/ErrorHandler";
import { ServerSocketLogic } from "client/ServerWebSocket/ServerSocketLogic";
import { SockServLogMessage } from "client/ServerWebSocket/base/ServerSocketLogicBase";
import { DrawHelper } from "client/VideoScreen/common/DrawHelper";
import { KickboxHelper } from "client/VideoScreen/kickbox/KickboxHelper";
import * as PIXI from "pixi.js";
import { settings } from "./../Logic/Logic";
import { Group } from "./Group";

import { VERSION } from "@pixi/core";
import { Util } from "common/Util";

export type ShaderType = "Pos2Color" | "Pos2ColorTexture";

declare const globalThis: {
  [key: string]: any;
};
export class Engine {
  private pixiApp!: PIXI.Application;
  private rootGroup!: Group;
  private programCache: any = {};

  private constructor() {
    const bla = KickboxHelper.getBlueColor();
  }

  private static internalInstance: Engine;
  static get instance(): Engine {
    if (this.internalInstance == null) this.internalInstance = new Engine();
    return this.internalInstance;
  }

  public getPixiApp(): PIXI.Application {
    return this.pixiApp;
  }

  // register pixi dev chrome extensions
  registerPixiInspector(): void {
    // eslint-disable-next-line no-unused-expressions
    (window as any).__PIXI_INSPECTOR_GLOBAL_HOOK__ && (window as any).__PIXI_INSPECTOR_GLOBAL_HOOK__.register({ PIXI });
    globalThis.__PIXI_APP__ = this.pixiApp;
  }

  public init(
    frameDiv: Element,
    options: {
      width: number;
      height: number;
      antialias: boolean;
      backgroundAlpha: number;
    }
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    Logger.info("Engine.init " + this.pixiApp, "verion: ", VERSION);
    Logger.info("Screen: inner " + window.innerWidth + "x" + window.innerHeight + " dpr:" + window.devicePixelRatio);
    // const o = { ...options };
    // o.width = o.width * window.devicePixelRatio;
    // o.height = o.height * window.devicePixelRatio;
    if (this.pixiApp) this.pixiApp.destroy();
    this.pixiApp = new PIXI.Application<HTMLCanvasElement>(options);
    //
    if (settings.devUser) {
      this.registerPixiInspector();
    }

    if (settings.playbackSpeed !== 1) {
      this.pixiApp.ticker.speed = settings.playbackSpeed;
    }

    // this.pixiApp.stage.scale.set(0.33333333);
    if (settings.devUser !== undefined) globalThis.__PIXI_APP__ = this.pixiApp;

    const canvas = this.pixiApp.view as HTMLCanvasElement;
    PIXI.Ticker.targetFPMS = 0.03;
    // this.pixiApp.stage.scale.set(1 / window.devicePixelRatio);
    // this.rootGroup.container.scale.set(0.5);
    this.rootGroup = new Group();
    this.pixiApp.stage.addChild(this.rootGroup.container);
    frameDiv.appendChild(this.view as HTMLCanvasElement);

    // Correct for non-16:9 screens: stretch stage vertically so content fills the full canvas height.
    // For a 16:9 screen this evaluates to exactly 1.0 (no change).
    const stageScaleY = options.height / (720 * settings.scaleFactor);
    this.pixiApp.stage.scale.y = stageScaleY;
    Logger.info("Engine W: " + this.pixiApp.renderer.width + " H: " + this.pixiApp.renderer.height
    );

    // polyfill usedJSHeapSize
    const performance = window.performance as any;
    if (performance && !performance.memory) {
      performance.memory = { usedJSHeapSize: 0, totalJSHeapSize: 0 };
    }

    this.pixiApp.ticker.minFPS = 20;
    this.pixiApp.ticker.maxFPS = 30;

    let heartBeat = 0;
    this.pixiApp.ticker.add(() => {
      const d = this.pixiApp.ticker.deltaMS / 1000.0;
      heartBeat -= d;
      if (heartBeat <= 0) {
        Logger.info("HeartBeat: ", performance.memory);
        heartBeat = 10; // seconds
      }
      Logic.update(d);
      this.rootGroup.update(d);
      this.rootGroup.preRender();
    });

    const canvasView = this.pixiApp.renderer.view;
    if (canvasView && canvasView.addEventListener) {
      canvasView.addEventListener("webglcontextlost", (e) => {
        try {
          Logger.error(Errors.LOST_WEBGL_CONTEXT_ERROR.code + ":" + Errors.LOST_WEBGL_CONTEXT_ERROR.message);
          const logMessage = new SockServLogMessage(Errors.LOST_WEBGL_CONTEXT_ERROR.code, Errors.LOST_WEBGL_CONTEXT_ERROR.message);
          if (ServerSocketLogic.instance && ServerSocketLogic.instance.sendLogRequest) {
            ServerSocketLogic.instance.sendLogRequest(logMessage).catch((error) => {
              Logger.error("Send log Error:" + JSON.stringify(error));
            });
          }
        } catch (e) {}

        // reload window
        const reloadUrl = Util.addParameterToUrl(window.location.href, "reloadType", "contextLoss");
        Logger.info("Reload Window context Error");
        window.location.href = reloadUrl;
      });
    }
  }

  public exit(): void {
    Logger.info("Engine.exit2");
    DrawHelper.dispose();
    Object.keys(PIXI.utils.TextureCache).forEach((texture) => {
      const tex = PIXI.utils.TextureCache[texture];
      if (tex) tex.destroy(true);
      delete PIXI.utils.TextureCache[texture];
    });
    if (this.pixiApp)
      this.pixiApp.destroy(true, {
        children: true,
        texture: true,
        baseTexture: true
      });
    (this.pixiApp as any) = null;
  }

  public get stage(): PIXI.Container {
    return this.pixiApp.stage;
  }

  public get view(): PIXI.ICanvas {
    return this.pixiApp.view;
  }

  public get width(): number {
    return this.pixiApp.renderer.width;
  }

  public get height(): number {
    return this.pixiApp.renderer.height;
  }

  public get resolution(): number {
    return this.pixiApp.renderer.resolution;
  }

  public resize(width: number, height: number): void {
    this.pixiApp.renderer.resize(width, height);
    Logger.info("Resize: " + width + " " + height);
  }

  public add(group: Group): void {
    this.rootGroup.add(group);
  }

  public remove(group: Group): void {
    this.rootGroup.remove(group);
  }

  public getProgram(shaderType: ShaderType): any {
    if (!this.programCache[shaderType]) this.programCache[shaderType] = this.createProgram(shaderType);
    return this.programCache[shaderType];
  }

  public createProgram(shaderType: ShaderType): any {
    if (shaderType === "Pos2Color") {
      return PIXI.Program.from(
        `
      precision mediump float;
      attribute vec2 pos2;
      attribute vec4 color;

      uniform mat3 translationMatrix;
      uniform mat3 projectionMatrix;

      varying vec4 vColor;

      void main() {

          vColor = color;
          gl_Position = vec4((projectionMatrix * translationMatrix * vec3(pos2, 1.0)).xy, 0.0, 1.0);

      }`,

        `precision mediump float;

      varying vec4 vColor;

      void main() {
          gl_FragColor = vec4(vColor);
      }
    `
      );
    } else if (shaderType === "Pos2ColorTexture") {
      return PIXI.Program.from(
        `
      precision mediump float;
      attribute vec2 pos2;
      attribute vec2 uv2;
      attribute vec4 color;

      uniform mat3 translationMatrix;
      uniform mat3 projectionMatrix;

      varying vec2 vUv2;
      varying vec4 vColor;

      void main() {

          vColor = color;
          vUv2 = uv2;
          gl_Position = vec4((projectionMatrix * translationMatrix * vec3(pos2, 1.0)).xy, 0.0, 1.0);

      }`,

        `precision mediump float;

      varying vec4 vColor;
      varying vec2 vUv2;
      uniform sampler2D tex;

      void main() {
          gl_FragColor = (texture2D(tex, vUv2)) * vec4(vColor);
      }
    `
      );
    }
  }
}
