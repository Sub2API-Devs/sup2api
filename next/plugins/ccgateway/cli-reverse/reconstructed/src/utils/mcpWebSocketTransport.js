/**
 * utils/mcpWebSocketTransport.ts
 *
 * 基于 Bun WebSocket 的 MCP 传输（ws 与 ws-ide），单条消息大小上限与状态检查。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/mcpWebSocketTransport.ts
 * pieces: chunk-323717f6.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { toError, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { MAX_STRUCTURED_RESULT_BYTES } from "../services/mcp/mcpCallConstants.js";
import { jsonParse, jsonStringify } from "./slowOperations.js";

//@ chunk-323717f6.js:2261-2274 affinity
var WS_CONNECTING = 0;
var WS_OPEN = 1;
//@ chunk-323717f6.js:2274-4274 fingerprint (2.1.88 match: WebSocketTransport, 0.856)
/**
 * WebSocketTransport：基于 Bun WebSocket 的 MCP 传输（ws 与 ws-ide），等待 open 后 start；单条消息超过上限（16 MiB）时报错并关闭；send 前检查 OPEN 状态。
 */
class WebSocketTransport {
  ws;
  parseMessage;
  started = false;
  opened;
  constructor(ws, parseMessage) {
    this.ws = ws;
    this.parseMessage = parseMessage;
    this.opened = new Promise((resolve, reject) => {
      if (this.ws.readyState === WS_OPEN) resolve();
      else {
        let nws = this.ws;
        let onOpen = () => {
          nws.removeEventListener("open", onOpen);
          nws.removeEventListener("error", onError);
          resolve();
        };
        let onError = (event) => {
          nws.removeEventListener("open", onOpen);
          nws.removeEventListener("error", onError);
          logForDiagnosticsNoPII("error", "mcp_websocket_connect_fail");
          reject(toError(event.error ?? event));
        };
        nws.addEventListener("open", onOpen);
        nws.addEventListener("error", onError);
      }
    });
    this.opened.catch(() => {});
    let nws = this.ws;
    nws.addEventListener("message", this.onBunMessage);
    nws.addEventListener("error", this.onBunError);
    nws.addEventListener("close", this.onBunClose);
  }
  onclose;
  onerror;
  onmessage;
  onBunMessage = (event) => {
    try {
      let data = typeof event.data === "string" ? event.data : String(event.data);
      if (Buffer.byteLength(data) > MAX_STRUCTURED_RESULT_BYTES) {
        this.handleError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `MCP server sent a WebSocket message over ${MAX_STRUCTURED_RESULT_BYTES / 1024 / 1024} MiB. Claude Code did not read it and closed the connection.`,
            "mcp websocket message over the cap",
          ),
        );
        this.close().catch(() => {});
        return;
      }
      let messageObj = jsonParse(data);
      let message = this.parseMessage(messageObj);
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
  handleError(error) {
    logForDiagnosticsNoPII("error", "mcp_websocket_message_fail");
    this.onerror?.(toError(error));
  }
  handleCloseCleanup() {
    this.onclose?.();
    let nws = this.ws;
    nws.removeEventListener("message", this.onBunMessage);
    nws.removeEventListener("error", this.onBunError);
    nws.removeEventListener("close", this.onBunClose);
  }
  async start() {
    if (this.started) throw Error("Start can only be called once per transport.");
    await this.opened;
    if (this.ws.readyState !== WS_OPEN) {
      logForDiagnosticsNoPII("error", "mcp_websocket_start_not_opened");
      throw Error("WebSocket is not open. Cannot start transport.");
    }
    this.started = true;
  }
  async close() {
    if (this.ws.readyState === WS_OPEN || this.ws.readyState === WS_CONNECTING) this.ws.close();
    this.handleCloseCleanup();
  }
  async send(message) {
    if (this.ws.readyState !== WS_OPEN) {
      logForDiagnosticsNoPII("error", "mcp_websocket_send_not_opened");
      throw Error("WebSocket is not open. Cannot send message.");
    }
    let json = jsonStringify(message);
    try {
      this.ws.send(json);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
}
export { WebSocketTransport };
