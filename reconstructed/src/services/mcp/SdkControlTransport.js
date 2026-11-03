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
import { SWALLOW_SYMBOL } from "./client.js";
import { isPlainObject } from "../../utils/isPlainObject.js";

//@ chunk-mdk8a5r0.js:226-284 placement
/**
 * 判断消息是否为带非空 id 的 JSON-RPC 请求。
 */
function isJsonRpcRequest(e) {
  return "method" in e && "id" in e && e.id !== null;
}
//@ chunk-mdk8a5r0.js:480-2760 fingerprint = SdkControlClientTransport (0.329)
/**
 * SdkControlClientTransport：CLI 侧连接 SDK 宿主进程内 MCP 服务器的传输，消息经 control 通道 sendMcpMessage 转发。可带 manifest（initializeResult/toolsListResult）在本地重放 initialize 与首个 tools/list，不匹配时 dropManifest 并记录原因（outcome）。
 */
class SdkControlClientTransport {
  serverName;
  sendMcpMessage;
  isClosed = false;
  manifestInitializeResult;
  manifestToolsListResult;
  swallowNextInitializedNotification = false;
  outcome;
  onclose;
  onerror;
  onmessage;
  constructor(serverName, sendMcpMessage, manifest) {
    this.serverName = serverName;
    this.sendMcpMessage = sendMcpMessage;
    this.manifestInitializeResult = manifest?.initializeResult;
    this.manifestToolsListResult = manifest?.toolsListResult;
    this.outcome = manifest === undefined ? "none" : "pending";
  }
  get manifestOutcome() {
    return this.outcome;
  }
  async start() {}
  async send(message) {
    if (this.isClosed) throw Error("Transport is closed");
    let t = this.answerFromManifest(message);
    if (t === SWALLOW_SYMBOL) return;
    if (t !== undefined) {
      queueMicrotask(() => this.onmessage?.(t));
      return;
    }
    let response = await this.sendMcpMessage(this.serverName, message);
    if (this.onmessage) this.onmessage(response);
  }
  async close() {
    if (this.isClosed) return;
    this.isClosed = true;
    this.onclose?.();
  }
  answerFromManifest(e) {
    if (
      this.manifestInitializeResult === undefined &&
      this.manifestToolsListResult === undefined &&
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
        if (manifestInitializeResult === undefined || !("id" in e)) {
          this.dropManifest("unexpected_message");
          return;
        }
        this.manifestInitializeResult = undefined;
        let params = e.params;
        if (
          params === undefined ||
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
        this.swallowNextInitializedNotification = true;
        this.outcome = "replayed";
        return {
          jsonrpc: "2.0",
          id: e.id,
          result: manifestInitializeResult,
        };
      }
      case "notifications/initialized": {
        if (!this.swallowNextInitializedNotification) {
          this.dropManifest("unexpected_message");
          return;
        }
        this.swallowNextInitializedNotification = false;
        return SWALLOW_SYMBOL;
      }
      case "tools/list": {
        let manifestToolsListResult = this.manifestToolsListResult;
        if (
          manifestToolsListResult === undefined ||
          !("id" in e) ||
          this.swallowNextInitializedNotification ||
          (e.params !== undefined && e.params.cursor !== undefined)
        ) {
          this.dropManifest("unexpected_message");
          return;
        }
        this.manifestToolsListResult = undefined;
        if (!isValidResultMeta(manifestToolsListResult)) return;
        return {
          jsonrpc: "2.0",
          id: e.id,
          result: manifestToolsListResult,
        };
      }
      default: {
        this.dropManifest("unexpected_message");
        return;
      }
    }
  }
  dropManifest(outcome) {
    this.manifestInitializeResult = undefined;
    this.manifestToolsListResult = undefined;
    this.swallowNextInitializedNotification = false;
    if (this.outcome === "pending") this.outcome = outcome;
  }
}
//@ chunk-mdk8a5r0.js:2760-2813 layout
function isEmptyCapabilities(capabilities) {
  return isPlainObject(capabilities) && Object.keys(capabilities).length === 0;
}
//@ chunk-mdk8a5r0.js:2813-3070 layout
/**
 * isValidResultMeta：校验结果 _meta（progressToken 类型、io.modelcontextprotocol/related-task.taskId）以决定 manifest 结果能否直接重放。
 */
function isValidResultMeta(e) {
  let _meta = e._meta;
  if (_meta === undefined) return true;
  if (!isPlainObject(_meta)) return false;
  let { progressToken } = _meta;
  if (progressToken !== undefined && typeof progressToken !== "string" && typeof progressToken !== "number")
    return false;
  let s = _meta["io.modelcontextprotocol/related-task"];
  return s === undefined || (isPlainObject(s) && typeof s.taskId === "string");
}
//@ chunk-mdk8a5r0.js:3070-3347 fingerprint = SdkControlServerTransport (1)
/**
 * SdkControlServerTransport：SDK 宿主侧的服务器传输，send 直接调用 sendMcpMessage。
 */
class SdkControlServerTransport {
  sendMcpMessage;
  isClosed = false;
  constructor(sendMcpMessage) {
    this.sendMcpMessage = sendMcpMessage;
  }
  onclose;
  onerror;
  onmessage;
  async start() {}
  async send(message) {
    if (this.isClosed) throw Error("Transport is closed");
    this.sendMcpMessage(message);
  }
  async close() {
    if (this.isClosed) return;
    this.isClosed = true;
    this.onclose?.();
  }
}
export { SdkControlClientTransport, isJsonRpcRequest, SdkControlServerTransport };
