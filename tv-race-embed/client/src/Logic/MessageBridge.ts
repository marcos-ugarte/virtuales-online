import { Logger } from "./Logger";

// MessageBridge for React to WebView and back

export interface ICallbackMessage {
  type: "__callback__";
  data: any;
  exception?: any;
}

export interface IMessagePacket<T> {
  message: T | ICallbackMessage;
  id: number;
  callbackId?: number;
}

type PostPacketCallback<T> = (packet: IMessagePacket<T>) => boolean;
type OnReceiveCallback<T> = (message: T) => Promise<any>;
export class MessageBridge<T> {
  private messageId: number = 1;
  private callbacks: any = {};
  private postPacketCallback: PostPacketCallback<T>;
  private onReceiveCallback: OnReceiveCallback<T>;
  private active = false;

  public constructor(init: (messageBridge: MessageBridge<T>) => boolean, postPacket: PostPacketCallback<T>, onReceive: OnReceiveCallback<T>) {
    this.postPacketCallback = postPacket;
    this.onReceiveCallback = onReceive;
    if (init) this.active = init(this);
    Logger.info("MessageBridge: " + this.active);
  }

  private getNextMessageId() {
    return this.messageId++;
  }

  private createPacket(message: T | ICallbackMessage, callbackId?: number) {
    const packet: IMessagePacket<T> = {
      id: this.getNextMessageId(),
      message,
      callbackId
    };
    return packet;
  }

  public onReceive(packet: any) {
    const p = packet as IMessagePacket<T>;
    if (p.callbackId !== undefined) {
      const callback = this.callbacks[p.callbackId];
      delete this.callbacks[p.callbackId];
      if (callback) {
        const cm = p.message as ICallbackMessage;
        if (cm.exception) callback.reject(cm.exception);
        else callback.resolve(cm.data);
      }
    } else {
      this.onReceiveCallback(packet.message)
        .then((result) => {
          const resultPacket: ICallbackMessage = {
            type: "__callback__",
            data: result
          };
          this.sendInternal(resultPacket, packet.id);
        })
        .catch((exception) => {
          const resultPacket: ICallbackMessage = {
            type: "__callback__",
            data: undefined,
            exception
          };
          this.sendInternal(resultPacket, packet.id);
        });
    }
  }

  public async send(message: T) {
    if (!this.active) return Promise.resolve();
    const promise = new Promise((resolve, reject) => {
      const packet = this.sendInternal(message);
      if (packet) this.callbacks[packet.id] = { resolve, reject };
      else reject("Couldn't send!");
    });
    return promise;
  }

  private sendInternal(message: T | ICallbackMessage, callbackId?: number) {
    const packet = this.createPacket(message, callbackId);
    if (!this.active) return packet;
    if (!this.postPacketCallback(packet)) return undefined;
    return packet;
  }
}
