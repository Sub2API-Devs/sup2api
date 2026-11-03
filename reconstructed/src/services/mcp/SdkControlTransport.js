/**
 * services/mcp/SdkControlTransport.ts
 *
 * 并入旧版已有路径：SDK 控制传输。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/SdkControlTransport.ts
 * pieces: chunk-mdk8a5r0.js (5)
 * attribution: placement 1, fingerprint 2, layout 2
 */
import { n_mdk8 } from "./client.js";
import { isPlainObject } from "../../utils/isPlainObject.js";

//@ chunk-mdk8a5r0.js:226-284 placement
function R4n(e) {
  return "method" in e && "id" in e && e.id !== null;
}
/**
 * SdkControlClientTransport：CLI 侧连接 SDK 宿主进程内 MCP 服务器的传输，消息经 control 通道 sendMcpMessage 转发。可带 manifest（initializeResult/toolsListResult）在本地重放 initialize 与首个 tools/list，不匹配时 dropManifest 并记录原因（outcome）。
 */
//@ chunk-mdk8a5r0.js:480-2760 fingerprint = SdkControlClientTransport (0.329)
class SdkControlClientTransport {
  serverName;
  sendMcpMessage;
  isClosed = !1;
  manifestInitializeResult;
  manifestToolsListResult;
  swallowNextInitializedNotification = !1;
  outcome;
  onclose;
  onerror;
  onmessage;
  constructor(serverName, sendMcpMessage, manifest) {
    this.serverName = serverName;
    this.sendMcpMessage = sendMcpMessage;
    ((this.manifestInitializeResult = manifest?.initializeResult),
      (this.manifestToolsListResult = manifest?.toolsListResult),
      (this.outcome = manifest === void 0 ? "none" : "pending"));
  }
  get manifestOutcome() {
    return this.outcome;
  }
  async start() {}
  async send(e) {
    if (this.isClosed) throw Error("Transport is closed");
    let answerFromManifest = this.answerFromManifest(e);
    if (answerFromManifest === n_mdk8) return;
    if (answerFromManifest !== void 0) {
      queueMicrotask(() => this.onmessage?.(answerFromManifest));
      return;
    }
    let sendMcpMessage = await this.sendMcpMessage(this.serverName, e);
    if (this.onmessage) this.onmessage(sendMcpMessage);
  }
  async close() {
    if (this.isClosed) return;
    ((this.isClosed = !0), this.onclose?.());
  }
  answerFromManifest(e) {
    if (
      this.manifestInitializeResult === void 0 &&
      this.manifestToolsListResult === void 0 &&
      !this.swallowNextInitializedNotification
    )
      return;
    if (!("method" in e)) {
      this.dropManifest("unexpected_message");
      return;
    }
    switch (e.method) {
      case "initialize": {
        let manifestInitializeResult = this.manifestInitializeResult;
        if (manifestInitializeResult === void 0 || !("id" in e)) {
          this.dropManifest("unexpected_message");
          return;
        }
        this.manifestInitializeResult = void 0;
        let params = e.params;
        if (
          params === void 0 ||
          typeof params.protocolVersion !== "string" ||
          params.protocolVersion !== manifestInitializeResult.protocolVersion
        ) {
          this.dropManifest("protocol_version_mismatch");
          return;
        }
        if (!isEmptyCapabilities(params.capabilities)) {
          this.dropManifest("client_capabilities_declared");
          return;
        }
        if (!isValidResultMeta(manifestInitializeResult)) {
          this.dropManifest("malformed_result");
          return;
        }
        return (
          (this.swallowNextInitializedNotification = !0),
          (this.outcome = "replayed"),
          { jsonrpc: "2.0", id: e.id, result: manifestInitializeResult }
        );
      }
      case "notifications/initialized": {
        if (!this.swallowNextInitializedNotification) {
          this.dropManifest("unexpected_message");
          return;
        }
        return ((this.swallowNextInitializedNotification = !1), n_mdk8);
      }
      case "tools/list": {
        let manifestToolsListResult = this.manifestToolsListResult;
        if (
          manifestToolsListResult === void 0 ||
          !("id" in e) ||
          this.swallowNextInitializedNotification ||
          (e.params !== void 0 && e.params.cursor !== void 0)
        ) {
          this.dropManifest("unexpected_message");
          return;
        }
        if (((this.manifestToolsListResult = void 0), !isValidResultMeta(manifestToolsListResult))) return;
        return { jsonrpc: "2.0", id: e.id, result: manifestToolsListResult };
      }
      default: {
        this.dropManifest("unexpected_message");
        return;
      }
    }
  }
  dropManifest(e) {
    if (
      ((this.manifestInitializeResult = void 0),
      (this.manifestToolsListResult = void 0),
      (this.swallowNextInitializedNotification = !1),
      this.outcome === "pending")
    )
      this.outcome = e;
  }
}
//@ chunk-mdk8a5r0.js:2760-2813 layout
function isEmptyCapabilities(e) {
  return isPlainObject(e) && Object.keys(e).length === 0;
}
/**
 * isValidResultMeta：校验结果 _meta（progressToken 类型、io.modelcontextprotocol/related-task.taskId）以决定 manifest 结果能否直接重放。
 */
//@ chunk-mdk8a5r0.js:2813-3070 layout
function isValidResultMeta(e) {
  let _meta = e._meta;
  if (_meta === void 0) return !0;
  if (!isPlainObject(_meta)) return !1;
  let { progressToken: progressToken } = _meta;
  if (progressToken !== void 0 && typeof progressToken !== "string" && typeof progressToken !== "number")
    return !1;
  let s = _meta["io.modelcontextprotocol/related-task"];
  return s === void 0 || (isPlainObject(s) && typeof s.taskId === "string");
}
/**
 * SdkControlServerTransport：SDK 宿主侧的服务器传输，send 直接调用 sendMcpMessage。
 */
//@ chunk-mdk8a5r0.js:3070-3347 fingerprint = SdkControlServerTransport (1)
class SdkControlServerTransport {
  sendMcpMessage;
  isClosed = !1;
  constructor(e) {
    this.sendMcpMessage = e;
  }
  onclose;
  onerror;
  onmessage;
  async start() {}
  async send(e) {
    if (this.isClosed) throw Error("Transport is closed");
    this.sendMcpMessage(e);
  }
  async close() {
    if (this.isClosed) return;
    ((this.isClosed = !0), this.onclose?.());
  }
}

export { SdkControlClientTransport, R4n, SdkControlServerTransport };
