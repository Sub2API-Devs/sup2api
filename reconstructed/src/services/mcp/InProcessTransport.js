/**
 * services/mcp/InProcessTransport.ts
 *
 * 进程内 MCP 传输：一对互为对端的 Transport，用微任务互投消息，供 Chrome/Computer Use 等内置服务器在同进程运行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/InProcessTransport.ts
 * pieces: chunk-rzwvw294.js (2)
 * attribution: fingerprint 1, facade-exports 1
 */

/**
 * 进程内 MCP 传输：一对互为 peer 的传输，send 用 queueMicrotask 把消息投给对端 onmessage；close 同时关闭对端。
 */
//@ chunk-rzwvw294.js:191-534 fingerprint = InProcessTransport (1)
class InProcessTransport {
  peer;
  closed = !1;
  onclose;
  onerror;
  onmessage;
  _setPeer(e) {
    this.peer = e;
  }
  async start() {}
  async send(e) {
    if (this.closed) throw Error("Transport is closed");
    queueMicrotask(() => {
      this.peer?.onmessage?.(e);
    });
  }
  async close() {
    if (this.closed) return;
    if (((this.closed = !0), this.onclose?.(), this.peer && !this.peer.closed))
      ((this.peer.closed = !0), this.peer.onclose?.());
  }
}
/**
 * createLinkedTransportPair：创建并互相绑定两个 InProcessTransport，返回 [clientSide, serverSide]，用于 Chrome/Computer Use 等进程内 MCP 服务器。
 */
//@ chunk-rzwvw294.js:534-610 facade-exports = createLinkedTransportPair (1)
function createLinkedTransportPair() {
  let e = new InProcessTransport(),
    s = new InProcessTransport();
  return (e._setPeer(s), s._setPeer(e), [e, s]);
}

export { createLinkedTransportPair };
