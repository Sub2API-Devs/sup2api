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

/**
 * WebSocket 直连：connect 时带 Bearer 头；逐行解析 NDJSON，control_request 只支持 can_use_tool（其余回 error），其余 SDK 消息交给 onMessage；提供 sendMessage、respondToPermissionRequest、sendInterrupt、disconnect。
 */
//@ chunk-18hwfzwa.js:223749-226114 fingerprint = DirectConnectSessionManager (0.762)
class DirectConnectSessionManager {
  ws = null;
  config;
  callbacks;
  constructor(h, x) {
    ((this.config = h), (this.callbacks = x));
  }
  connect() {
    let h = {};
    if (this.config.authToken) h.authorization = `Bearer ${this.config.authToken}`;
    ((this.ws = new WebSocket(this.config.wsUrl, { headers: h })),
      this.ws.addEventListener("open", () => {
        this.callbacks.onConnected?.();
      }),
      this.ws.addEventListener("message", (x) => {
        let filtered = (typeof x.data === "string" ? x.data : "")
          .split(
            `
`,
          )
          .filter((ee) => ee.trim());
        for (let ee of filtered) {
          let ke;
          try {
            ke = jsonParse(ee);
          } catch {
            continue;
          }
          if (!hasStringType_3(ke)) continue;
          safeEmit((Re) => this.routeInboundFrame(Re), ke, "DirectConnect");
        }
      }),
      this.ws.addEventListener("close", () => {
        this.callbacks.onDisconnected?.();
      }),
      this.ws.addEventListener("error", () => {
        this.callbacks.onError?.(Error("WebSocket connection error"));
      }));
  }
  routeInboundFrame(h) {
    if (h.type === "control_request") {
      let request = h.request;
      if (typeof request !== "object" || request === null || typeof h.request_id !== "string") {
        logForDebugging("[DirectConnect] Dropping control_request without a request object / request_id", {
          level: "error",
        });
        return;
      }
      if (h.request.subtype === "can_use_tool") this.callbacks.onPermissionRequest(h.request, h.request_id);
      else
        (logForDebugging(`[DirectConnect] Unsupported control request subtype: ${h.request.subtype}`),
          this.sendErrorResponse(h.request_id, `Unsupported control request subtype: ${h.request.subtype}`));
      return;
    }
    if (isControlFrame(h)) this.callbacks.onMessage(h);
  }
  async sendMessage(h) {
    if (!this.ws) return { ok: !1, reason: "not connected" };
    if (this.ws.readyState === WebSocket.CONNECTING)
      return { ok: !1, reason: "the connection is still being established" };
    if (this.ws.readyState !== WebSocket.OPEN) return { ok: !1, reason: "the connection was closed" };
    let x = jsonStringify({
      type: "user",
      message: { role: "user", content: h },
      parent_tool_use_id: null,
      session_id: "",
    });
    return (this.ws.send(x), { ok: !0 });
  }
  respondToPermissionRequest(h, x) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logForDebugging(`[DirectConnect] Dropping permission response for ${h}: socket not open`, {
        level: "error",
      });
      return;
    }
    this.ws.send(jsonStringify(buildControlResponse(h, x)));
  }
  sendInterrupt() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    let h = jsonStringify({
      type: "control_request",
      request_id: crypto.randomUUID(),
      request: { subtype: "interrupt" },
    });
    this.ws.send(h);
  }
  sendErrorResponse(h, x) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    let D = jsonStringify({
      type: "control_response",
      response: { subtype: "error", request_id: h, error: x },
    });
    this.ws.send(D);
  }
  disconnect() {
    if (this.ws) (this.ws.close(), (this.ws = null));
  }
  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export { DirectConnectSessionManager };
