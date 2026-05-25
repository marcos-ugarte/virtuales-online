/**
 * PosGoDsClient — raw WebSocket transport for the virtuales-go `/pos-go-ds`
 * protocol (plain JSON request/response, NOT SignalR).
 *
 * Protocol shape (see docs/MANUAL_PROTOCOL_POS_GO_DS.md):
 *  - The client opens a raw WebSocket and exchanges JSON objects.
 *  - Each request carries a `msgType`; the server replies with exactly ONE
 *    message of the SAME `msgType`. We correlate replies by `msgType`.
 *  - Broadcasts (gameRound / gameResult / deviceLock) arrive unsolicited and
 *    are routed to a registered broadcast handler instead of resolving a
 *    pending request.
 *
 * Phase 1 scope: only `deviceLogin` and `init` request/response are exercised
 * here. `send()` is generic so later phases (sendTicket, sendBalance, ...) can
 * reuse the same correlation machinery.
 */

export interface PosGoDsMessage {
  msgType: string
  [key: string]: unknown
}

type BroadcastHandler = (msg: PosGoDsMessage) => void
type CloseHandler = (ev: { code: number; reason: string; wasClean: boolean }) => void

interface PendingRequest {
  resolve: (msg: PosGoDsMessage) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class PosGoDsClient {
  private ws: WebSocket | null = null
  private msgIdCounter = 0

  // Pending request/response promises keyed by the expected reply `msgType`.
  // Single in-flight request per msgType is sufficient for the login flow
  // (deviceLogin → init are sequential). If a second request of the same
  // msgType is issued while one is pending, the older one is rejected.
  private pending = new Map<string, PendingRequest>()

  // Broadcast msgTypes are dispatched here rather than resolving a promise.
  private broadcastHandlers = new Map<string, BroadcastHandler>()
  private onCloseHandler: CloseHandler | null = null

  /** msgTypes that are server-initiated broadcasts, never request replies. */
  private static readonly BROADCAST_TYPES = new Set([
    'gameRound',
    'gameResult',
    'deviceLock',
  ])

  isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  nextMsgId(): number {
    return ++this.msgIdCounter
  }

  /**
   * Open a raw WebSocket to `url`. Resolves once the socket is OPEN.
   */
  connect(url: string, timeoutMs = 15000): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false
      let ws: WebSocket
      try {
        ws = new WebSocket(url)
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
        return
      }
      this.ws = ws

      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        try { ws.close() } catch { /* ignore */ }
        reject(new Error(`WebSocket connection timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      ws.onopen = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        console.log('[PosGoDs] WebSocket open:', url)
        resolve()
      }

      ws.onmessage = (ev) => this.handleMessage(ev.data)

      ws.onerror = (ev) => {
        console.warn('[PosGoDs] WebSocket error event', ev)
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(new Error('WebSocket connection failed'))
      }

      ws.onclose = (ev) => {
        clearTimeout(timer)
        // Reject any in-flight requests on close.
        for (const [msgType, p] of this.pending) {
          clearTimeout(p.timer)
          p.reject(new Error(`Connection closed before ${msgType} reply`))
        }
        this.pending.clear()
        console.warn('[PosGoDs] WebSocket closed:', ev.code, ev.reason)
        this.onCloseHandler?.({ code: ev.code, reason: ev.reason, wasClean: ev.wasClean })
      }
    })
  }

  private handleMessage(raw: unknown): void {
    let msg: PosGoDsMessage
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : String(raw))
    } catch {
      console.warn('[PosGoDs] Non-JSON message ignored:', raw)
      return
    }

    const msgType = msg.msgType
    if (!msgType) {
      console.warn('[PosGoDs] Message without msgType ignored:', msg)
      return
    }

    // Broadcasts: dispatch to handler, never resolve a pending request.
    if (PosGoDsClient.BROADCAST_TYPES.has(msgType)) {
      const handler = this.broadcastHandlers.get(msgType)
      if (handler) handler(msg)
      else console.debug('[PosGoDs] Unhandled broadcast:', msgType)
      return
    }

    // Request/response correlation by msgType.
    const pending = this.pending.get(msgType)
    if (pending) {
      this.pending.delete(msgType)
      clearTimeout(pending.timer)
      pending.resolve(msg)
      return
    }

    console.debug('[PosGoDs] Unsolicited message (no pending request):', msgType)
  }

  /**
   * Send a JSON message and await the reply with the same `msgType`.
   * @param msg request object; must contain `msgType`.
   * @param timeoutMs reply timeout.
   */
  request(msg: PosGoDsMessage, timeoutMs = 15000): Promise<PosGoDsMessage> {
    if (!this.isOpen()) {
      return Promise.reject(new Error('WebSocket not open'))
    }
    const msgType = msg.msgType

    return new Promise((resolve, reject) => {
      // Reject a previous in-flight request of the same msgType.
      const existing = this.pending.get(msgType)
      if (existing) {
        clearTimeout(existing.timer)
        existing.reject(new Error(`Superseded by newer ${msgType} request`))
      }

      const timer = setTimeout(() => {
        this.pending.delete(msgType)
        reject(new Error(`Timeout waiting for ${msgType} reply (${timeoutMs}ms)`))
      }, timeoutMs)

      this.pending.set(msgType, { resolve, reject, timer })

      try {
        this.ws!.send(JSON.stringify(msg))
      } catch (err) {
        this.pending.delete(msgType)
        clearTimeout(timer)
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    })
  }

  /** Fire-and-forget send (no reply awaited). */
  send(msg: PosGoDsMessage): void {
    if (!this.isOpen()) {
      console.warn('[PosGoDs] send() while socket not open, dropping:', msg.msgType)
      return
    }
    this.ws!.send(JSON.stringify(msg))
  }

  onBroadcast(msgType: string, handler: BroadcastHandler): void {
    this.broadcastHandlers.set(msgType, handler)
  }

  onClose(handler: CloseHandler): void {
    this.onCloseHandler = handler
  }

  close(): void {
    if (this.ws) {
      this.onCloseHandler = null // avoid firing the consumer's close handler on intentional close
      try { this.ws.close() } catch { /* ignore */ }
      this.ws = null
    }
    for (const [, p] of this.pending) clearTimeout(p.timer)
    this.pending.clear()
  }
}
