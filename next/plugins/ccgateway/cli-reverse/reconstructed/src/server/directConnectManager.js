/**
 * server/directConnectManager.ts
 *
 * 直连会话管理器：经 WebSocket 连接 claude 服务端会话，收 SDK 帧、处理 can_use_tool 权限请求、发送用户消息/中断
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/server/directConnectManager.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { jsonParse, jsonStringify } from "../utils/slowOperations.js";
import { hasStringType_3 } from "../bridge/controlRequests.js";
import { safeEmit } from "../utils/telemetry/memorySummary.js";
import { logForDebugging } from "../utils/debug.js";
import { isControlFrame } from "../remote/sdkMessageAdapter.js";
import { buildControlResponse } from "../utils/teleport/api.js";

//@ chunk-18hwfzwa.js:223749-226114 fingerprint (2.1.88 match: DirectConnectSessionManager, 0.762)
/**
 * WebSocket 直连：connect 时带 Bearer 头；逐行解析 NDJSON，control_request 只支持 can_use_tool（其余回 error），其余 SDK 消息交给 onMessage；提供 sendMessage、respondToPermissionRequest、sendInterrupt、disconnect。
 */
class DirectConnectSessionManager {
  ws = null;
  config;
  callbacks;
  constructor(config, callbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }
  connect() {
    let headers = {};
    if (this.config.authToken) headers.authorization = `Bearer ${this.config.authToken}`;
    this.ws = new WebSocket(this.config.wsUrl, {
      headers,
    });
    this.ws.addEventListener("open", () => {
      this.callbacks.onConnected?.();
    });
    this.ws.addEventListener("message", (event) => {
      let filtered = (typeof event.data === "string" ? event.data : "")
        .split(
          `
`,
        )
        .filter((line) => line.trim());
      for (let line of filtered) {
        let raw;
        try {
          raw = jsonParse(line);
        } catch {
          continue;
        }
        if (!hasStringType_3(raw)) continue;
        safeEmit((frame) => this.routeInboundFrame(frame), raw, "DirectConnect");
      }
    });
    this.ws.addEventListener("close", () => {
      this.callbacks.onDisconnected?.();
    });
    this.ws.addEventListener("error", () => {
      this.callbacks.onError?.(Error("WebSocket connection error"));
    });
  }
  routeInboundFrame(parsed) {
    if (parsed.type === "control_request") {
      let request = parsed.request;
      if (typeof request !== "object" || request === null || typeof parsed.request_id !== "string") {
        logForDebugging("[DirectConnect] Dropping control_request without a request object / request_id", {
          level: "error",
        });
        return;
      }
      if (parsed.request.subtype === "can_use_tool")
        this.callbacks.onPermissionRequest(parsed.request, parsed.request_id);
      else {
        logForDebugging(`[DirectConnect] Unsupported control request subtype: ${parsed.request.subtype}`);
        this.sendErrorResponse(
          parsed.request_id,
          `Unsupported control request subtype: ${parsed.request.subtype}`,
        );
      }
      return;
    }
    if (isControlFrame(parsed)) this.callbacks.onMessage(parsed);
  }
  async sendMessage(content) {
    if (!this.ws)
      return {
        ok: false,
        reason: "not connected",
      };
    if (this.ws.readyState === WebSocket.CONNECTING)
      return {
        ok: false,
        reason: "the connection is still being established",
      };
    if (this.ws.readyState !== WebSocket.OPEN)
      return {
        ok: false,
        reason: "the connection was closed",
      };
    let message = jsonStringify({
      type: "user",
      message: {
        role: "user",
        content,
      },
      parent_tool_use_id: null,
      session_id: "",
    });
    this.ws.send(message);
    return {
      ok: true,
    };
  }
  respondToPermissionRequest(requestId, response) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logForDebugging(`[DirectConnect] Dropping permission response for ${requestId}: socket not open`, {
        level: "error",
      });
      return;
    }
    this.ws.send(jsonStringify(buildControlResponse(requestId, response)));
  }
  sendInterrupt() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    let request = jsonStringify({
      type: "control_request",
      request_id: crypto.randomUUID(),
      request: {
        subtype: "interrupt",
      },
    });
    this.ws.send(request);
  }
  sendErrorResponse(requestId, error) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    let response = jsonStringify({
      type: "control_response",
      response: {
        subtype: "error",
        request_id: requestId,
        error,
      },
    });
    this.ws.send(response);
  }
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
export { DirectConnectSessionManager };
