/**
 * services/mcp/InProcessTransport.ts
 *
 * 进程内 MCP 传输：一对互为对端的 Transport，用微任务互投消息，供 Chrome/Computer Use 等内置服务器在同进程运行。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/InProcessTransport.ts
 * pieces: chunk-sf59dqsf.js (2)
 * attribution: fingerprint 1, facade-exports 1
 */

//@ chunk-sf59dqsf.js:191-534 fingerprint (2.1.88 match: InProcessTransport, 1)
/**
 * 进程内 MCP 传输：一对互为 peer 的传输，send 用 queueMicrotask 把消息投给对端 onmessage；close 同时关闭对端。
 */
class InProcessTransport {
  peer;
  closed = false;
  onclose;
  onerror;
  onmessage;
  _setPeer(peer) {
    this.peer = peer;
  }
  async start() {}
  async send(message) {
    if (this.closed) throw Error("Transport is closed");
    queueMicrotask(() => {
      this.peer?.onmessage?.(message);
    });
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    this.onclose?.();
    if (this.peer && !this.peer.closed) {
      this.peer.closed = true;
      this.peer.onclose?.();
    }
  }
}
//@ chunk-sf59dqsf.js:534-610 facade-exports (2.1.88 match: createLinkedTransportPair, 1)
/**
 * createLinkedTransportPair：创建并互相绑定两个 InProcessTransport，返回 [clientSide, serverSide]，用于 Chrome/Computer Use 等进程内 MCP 服务器。
 */
function createLinkedTransportPair() {
  let clientSide = new InProcessTransport();
  let serverSide = new InProcessTransport();
  clientSide._setPeer(serverSide);
  serverSide._setPeer(clientSide);
  return [clientSide, serverSide];
}
export { createLinkedTransportPair };
