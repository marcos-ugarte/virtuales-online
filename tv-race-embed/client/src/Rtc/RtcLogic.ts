import { IMediaSoupClientMeta, MediaSoupConsumer, MediaSoupProducer } from "rtclib";
import { Logger } from "client/Logic/Logger";

export class RtcLogic {
  public id!: string;
  public roomId!: string;
  public consumer?: MediaSoupConsumer;
  public producer?: MediaSoupProducer;
  public meta!: IMediaSoupClientMeta;

  private constructor() {}

  public init(id: string, roomId: string | undefined, type: string | undefined, meta: IMediaSoupClientMeta): void {
    this.id = id;
    this.meta = meta;
    if (!roomId) roomId = "room1";
    this.roomId = roomId;
    if (type === "producer") this.producer = new MediaSoupProducer(id, roomId, meta);
    else this.consumer = new MediaSoupConsumer(id, roomId, meta);
  }

  private static internalInstance: RtcLogic;
  static get instance(): RtcLogic {
    if (this.internalInstance == null) this.internalInstance = new RtcLogic();
    return this.internalInstance;
  }

  public async connectRtcClient(): Promise<boolean> {
    const client = this.consumer || this.producer;
    if (!client) return false;

    let wsUrl = "";
    try {
      const ip4 = window.location.hostname;
      const port = window.location.port ? window.location.port : 443;
      const wsProtocol = window.location.protocol.startsWith("https:") ? "wss:" : "ws:";
      // const port = window.location.protocol.startsWith("http:") ? 65336 : 65336;
      wsUrl = wsProtocol + "//" + ip4 + ":" + port + "/ws";
      console.log("RtcLogic: WS: " + wsUrl);

      // if (wsUrl === "ws://:443/ws") {
      //   wsUrl = "";
      //   console.log("RtcLogic: WSb: " + wsUrl);
      // }
    } catch (e) {
      console.log("RtcLogic: connectRtcClient: ", e);
    }

    try {
      await client.open(wsUrl);
    } catch (e: any) {
      console.log("RtcLogic: rtcClient.open", e);
      Logger.error("RtcLogic: rtcClient.open: ", e);
      return this.connectRtcClient();
    }
    return false;
  }

  public isProducer(): boolean | undefined {
    return !!this.producer;
  }

  public isPlayer(): boolean {
    return !this.producer && !this.consumer;
  }

  public isConsumer(): boolean | undefined {
    return !!this.consumer;
  }
}
