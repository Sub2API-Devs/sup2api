/**
 * utils/mcpWebSocketTransport.ts
 *
 * 基于 Bun WebSocket 的 MCP 传输（ws 与 ws-ide），单条消息大小上限与状态检查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/mcpWebSocketTransport.ts
 * pieces: chunk-29pqxdaf.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { toError, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { z2 } from "../services/mcp/mcpCallConstants.js";
import { jsonParse, jsonStringify } from "./slowOperations.js";

//@ chunk-29pqxdaf.js:1914-1927 affinity
var WS_CONNECTING = 0,
  WS_OPEN = 1;
/**
 * WebSocketTransport：基于 Bun WebSocket 的 MCP 传输（ws 与 ws-ide），等待 open 后 start；单条消息超过上限（16 MiB）时报错并关闭；send 前检查 OPEN 状态。
 */
//@ chunk-29pqxdaf.js:1927-3927 fingerprint = WebSocketTransport (0.856)
class WebSocketTransport {
  ws;
  parseMessage;
  started = !1;
  opened;
  constructor(e, n) {
    this.ws = e;
    this.parseMessage = n;
    ((this.opened = new Promise((r, s) => {
      if (this.ws.readyState === WS_OPEN) r();
      else {
        let ws = this.ws,
          i = () => {
            (ws.removeEventListener("open", i), ws.removeEventListener("error", d), r());
          },
          d = (p) => {
            (ws.removeEventListener("open", i),
              ws.removeEventListener("error", d),
              logForDiagnosticsNoPII("error", "mcp_websocket_connect_fail"),
              s(toError(p.error ?? p)));
          };
        (ws.addEventListener("open", i), ws.addEventListener("error", d));
      }
    })),
      this.opened.catch(() => {}));
    let ws = this.ws;
    (ws.addEventListener("message", this.onBunMessage),
      ws.addEventListener("error", this.onBunError),
      ws.addEventListener("close", this.onBunClose));
  }
  onclose;
  onerror;
  onmessage;
  onBunMessage = (e) => {
    try {
      let n = typeof e.data === "string" ? e.data : String(e.data);
      if (Buffer.byteLength(n) > z2) {
        (this.handleError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `MCP server sent a WebSocket message over ${z2 / 1024 / 1024} MiB. Claude Code did not read it and closed the connection.`,
            "mcp websocket message over the cap",
          ),
        ),
          this.close().catch(() => {}));
        return;
      }
      let o = jsonParse(n),
        message = this.parseMessage(o);
      this.onmessage?.(message);
    } catch (error) {
      this.handleError(error);
    }
  };
  onBunError = () => {
    this.handleError(Error("WebSocket error"));
  };
  onBunClose = () => {
    this.handleCloseCleanup();
  };
  handleError(e) {
    (logForDiagnosticsNoPII("error", "mcp_websocket_message_fail"), this.onerror?.(toError(e)));
  }
  handleCloseCleanup() {
    this.onclose?.();
    let ws = this.ws;
    (ws.removeEventListener("message", this.onBunMessage),
      ws.removeEventListener("error", this.onBunError),
      ws.removeEventListener("close", this.onBunClose));
  }
  async start() {
    if (this.started) throw Error("Start can only be called once per transport.");
    if ((await this.opened, this.ws.readyState !== WS_OPEN))
      throw (
        logForDiagnosticsNoPII("error", "mcp_websocket_start_not_opened"),
        Error("WebSocket is not open. Cannot start transport.")
      );
    this.started = !0;
  }
  async close() {
    if (this.ws.readyState === WS_OPEN || this.ws.readyState === WS_CONNECTING) this.ws.close();
    this.handleCloseCleanup();
  }
  async send(e) {
    if (this.ws.readyState !== WS_OPEN)
      throw (
        logForDiagnosticsNoPII("error", "mcp_websocket_send_not_opened"),
        Error("WebSocket is not open. Cannot send message.")
      );
    let n = jsonStringify(e);
    try {
      this.ws.send(n);
    } catch (error) {
      throw (this.handleError(error), error);
    }
  }
}

export { WebSocketTransport };
