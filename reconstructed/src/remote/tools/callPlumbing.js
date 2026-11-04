/**
 * remote/tools/callPlumbing.ts
 *
 * 2.1.316 新增：远程工具调用管道（经桥接/会话通道调用、错误分类、重试与服务器重新初始化）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-25sm7c4g.js (30)
 * attribution: placement 28, affinity 2
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getErrnoCode, errorMessage, StreamClosedAbortError } from "../../utils/errors.js";
import {
  DEVICE_SYNC_FILES_TOOLS,
  DEVICE_PASSTHROUGH_TOOL_NAMES,
} from "../../services/remoteTools/backgroundCommands.js";
import { clampToMaxPageSize, byteLengthOf } from "./callResults.js";
import { callMcpTool } from "../../services/mcp/mcpWireUtils.js";
import { readCallResult, buildPlumbingRequest } from "./toolDescriptors.js";
import { normalizeMcpServerName } from "../../services/api/deferredToolsState.js";
import {
  encodeCallArgs,
  REMOTE_TOOL_CALL_META,
  CLAUDECODE_TOOLUSEID,
  CLAUDECODE_REMOTETOOLCALL,
  ANTHROPIC_REMOTETOOLEXECUTION,
  peerProtocolVersions,
  advertisedProtocolVersions,
  negotiateProtocol,
  parseRegistration,
  isRemoteToolCallMeta,
} from "./protocolSchemas.js";
import {
  CCR_NEEDS_APPROVAL_CODE,
  classifyMcpErrorSourceCategory,
} from "../../services/mcp/mcpResultErrors.js";
import { recursivelySanitizeUnicode } from "../../utils/sanitization.js";
import {
  mayBePassthroughTool,
  PASSTHROUGH_MARKER_KEY,
  parsePassthroughMarker,
} from "../../services/deviceBridge/passthroughMarker.js";
import { count } from "../../utils/collections.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "./protocolConstants.js";
import { buildMcpToolName } from "../../services/mcp/mcpStringUtils.js";
import { isValidMachineSlug } from "../../bridge/deviceRegistration.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-25sm7c4g.js:1282-1351 placement
function isBridgePlumbingEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_scroll", false);
  } catch {
    return false;
  }
}
//@ chunk-25sm7c4g.js:1351-1420 placement
function mcpClientModule() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-25sm7c4g.js:1420-1579 placement
class BridgeSessionRecovery {
  #e = new WeakMap();
  reinitialize(connection) {
    let existing = this.#e.get(connection);
    if (existing) return existing;
    let resetPromise = mcpClientModule()
      .clearServerCache(connection.name, connection.config)
      .catch(() => {});
    this.#e.set(connection, resetPromise);
    return resetPromise;
  }
}
//@ chunk-25sm7c4g.js:1579-1593 placement
var CONNECTION_CLOSED_ERROR_CODE = -32000;
//@ chunk-25sm7c4g.js:1593-1815 placement
async function callWithSessionRecovery(connection, options, run) {
  let result = await callBridgeTool(connection, options, run);
  if (result.kind !== "session_expired") return evictFailedConnectMemo(connection, result);
  await options.recovery.reinitialize(result.connection);
  let retryResult = await callBridgeTool(connection, options, run);
  return retryResult.kind === "session_expired"
    ? {
        kind: "expired_twice",
      }
    : evictFailedConnectMemo(connection, retryResult);
}
//@ chunk-25sm7c4g.js:1815-1953 placement
async function evictFailedConnectMemo(connection, result) {
  if (result.kind === "connect_failed")
    await mcpClientModule()
      .evictStaleFailedConnectMemoForServe(connection.name, connection.config)
      .catch(() => {});
  return result;
}
//@ chunk-25sm7c4g.js:1953-2498 placement
async function callBridgeTool(connection, { deadlineAt, signal, idempotent = false }, run) {
  let mcpModule = mcpClientModule();
  let client;
  try {
    client = await mcpModule.ensureConnectedClient(connection, {
      signal,
      timeoutMs: Math.max(1, deadlineAt - Date.now()),
      context: "remote tool execution",
    });
  } catch (error) {
    return {
      kind: "connect_failed",
      error,
    };
  }
  let remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0)
    return {
      kind: "connect_failed",
      error: Error("deadline reached before the request could be sent"),
    };
  try {
    return {
      kind: "ok",
      value: await run(client, remainingMs),
    };
  } catch (error) {
    return error instanceof Error &&
      (mcpModule.isMcpSessionExpiredError(error) ||
        (idempotent && isHttpConnectionClosedError(error, client)))
      ? {
          kind: "session_expired",
          connection: client,
        }
      : {
          kind: "failed",
          error,
        };
  }
}
//@ chunk-25sm7c4g.js:2498-2678 placement
function isHttpConnectionClosedError(error, client) {
  return (
    (("code" in error &&
      error.code === CONNECTION_CLOSED_ERROR_CODE &&
      error.message.includes("Connection closed")) ||
      getErrnoCode(error) === "CONNECTION_CLOSED") &&
    (client.config.type === "http" || client.config.type === "claudeai-proxy")
  );
}
//@ chunk-25sm7c4g.js:2678-3084 placement
/**
 * 远程调用/Office bridge 的错误归类表：请求超时与连接关闭错误码、bridge 状态码到 unreachable/dropped/timed_out 的分组、三类错误消息正则、可分类消息长度上限 200。
 */
var BRIDGE_CALL_LIMITS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REQUEST_TIMEOUT_ERROR_CODE;
var OFFICE_BRIDGE_KIND;
var OFFICE_BRIDGE_BOUND_MISS;
var UNREACHABLE_BRIDGE_KINDS;
var DROPPED_BRIDGE_KINDS;
var TIMED_OUT_BRIDGE_KINDS;
var NOT_CONNECTED_MESSAGE_RE;
var DISCONNECTED_MESSAGE_RE;
var TIMEOUT_MESSAGE_RE;
var MAX_CLASSIFIABLE_MESSAGE_LENGTH;
deferInit("chunk-25sm7c4g.js:2678", () => {
  BRIDGE_CALL_LIMITS = {
    maxRequestBytes: 4128768,
    defaultDeadlineMs: 58000,
  };
  REQUEST_TIMEOUT_ERROR_CODE = -32001;
  OFFICE_BRIDGE_KIND = "office_bridge.kind";
  OFFICE_BRIDGE_BOUND_MISS = "office_bridge.bound_miss";
  UNREACHABLE_BRIDGE_KINDS = new Set(["not_connected", "send_failed", "contested", "unsupported_on_bound"]);
  DROPPED_BRIDGE_KINDS = new Set(["disconnected", "cancelled"]);
  TIMED_OUT_BRIDGE_KINDS = new Set(["timeout"]);
  NOT_CONNECTED_MESSAGE_RE = /not connected|not reachable|offline/i;
  DISCONNECTED_MESSAGE_RE = /disconnected before responding|connection may be closing/i;
  TIMEOUT_MESSAGE_RE = /did not respond within/i;
  MAX_CLASSIFIABLE_MESSAGE_LENGTH = 200;
});
//@ chunk-25sm7c4g.js:3084-3201 placement
function createBridgeTransport(chromeClient, recovery) {
  return {
    kind: "bridge",
    limits: BRIDGE_CALL_LIMITS,
    call: (name, toolName, args, options) =>
      callRemoteToolOverBridge(chromeClient, recovery, name, toolName, args, options),
    callPlumbing: (name, args, options) =>
      callBridgePlumbingTool(chromeClient, recovery, name, args, options),
  };
}
//@ chunk-25sm7c4g.js:3201-4041 placement
/**
 * 通过设备桥（office/device bridge）MCP 调用远程管道工具：超时、会话过期重初始化、结果信封解析。
 */
async function callBridgePlumbingTool(chromeClient, recovery, name, args, options) {
  if (!DEVICE_SYNC_FILES_TOOLS.has(name)) throw Error("callPlumbing: not a bridge plumbing tool");
  let now = Date.now();
  let capMs = clampToMaxPageSize(options.deadlineMs);
  let callOutcome = await callWithSessionRecovery(
    chromeClient,
    {
      deadlineAt: now + capMs,
      recovery,
      signal: options.signal,
      idempotent: options.idempotent,
    },
    (client, timeout) =>
      callMcpTool(
        client,
        {
          name,
          arguments: {
            ...args,
          },
        },
        {
          signal: options.signal,
          timeout,
        },
      ),
  );
  if (callOutcome.kind === "ok") {
    let callResult = readCallResult(callOutcome.value);
    let text = flattenContentText(callResult.content);
    let classified =
      callResult.isError && callResult.envelope.status === "absent"
        ? classifyBridgeError(callOutcome.value, text, capMs)
        : undefined;
    if (classified !== undefined) return normalizeTransportFailure(classified);
    return {
      kind: "result",
      structuredContent: callOutcome.value.structuredContent,
      text,
      isError: callResult.isError,
    };
  }
  if (options.signal.aborted)
    return {
      kind: "cancelled",
    };
  switch (callOutcome.kind) {
    case "connect_failed":
      return {
        kind: "unreachable",
        detail: normalizeMcpServerName(errorMessage(callOutcome.error)),
      };
    case "expired_twice":
      return {
        kind: "unreachable",
        detail: "the device bridge rejected the session again right after re-initializing it; nothing ran",
      };
    case "failed":
      return normalizeTransportFailure(classifyBridgeTransportError(callOutcome.error, capMs, undefined));
  }
}
//@ chunk-25sm7c4g.js:4041-4237 placement
function normalizeTransportFailure(failure) {
  switch (failure.kind) {
    case "timed_out":
    case "unreachable":
    case "dropped":
    case "transport_error":
    case "cancelled":
      return failure;
    default:
      return {
        kind: "transport_error",
        detail: `unexpected: ${failure.kind}`,
      };
  }
}
//@ chunk-25sm7c4g.js:4237-4944 placement
async function callRemoteToolOverBridge(chromeClient, recovery, name, args, callMeta, options) {
  let now = Date.now();
  let capMs = clampToMaxPageSize(options.deadlineMs);
  let encodedMeta = encodeCallArgs(callMeta);
  let callOutcome = await callWithSessionRecovery(
    chromeClient,
    {
      deadlineAt: now + capMs,
      recovery,
      signal: options.signal,
    },
    (client, timeout) =>
      callMcpTool(
        client,
        {
          name,
          arguments: {
            ...args,
            [REMOTE_TOOL_CALL_META]: callMeta,
          },
          _meta: {
            [CLAUDECODE_TOOLUSEID]: options.toolUseId,
            ...(encodedMeta !== undefined && {
              [CLAUDECODE_REMOTETOOLCALL]: encodedMeta,
            }),
          },
        },
        {
          signal: options.signal,
          timeout,
        },
      ),
  );
  if (callOutcome.kind === "ok") {
    let bridgeResultEnvelope = readBridgeResultEnvelope(callOutcome.value, Date.now() - now, capMs);
    return bridgeResultEnvelope.kind === "result"
      ? {
          ...bridgeResultEnvelope,
          metaCopy: encodedMeta === undefined ? "omitted" : "attached",
        }
      : bridgeResultEnvelope;
  }
  if (options.signal.aborted)
    return {
      kind: "cancelled",
    };
  switch (callOutcome.kind) {
    case "connect_failed":
      return {
        kind: "unreachable",
        detail: normalizeMcpServerName(errorMessage(callOutcome.error)),
      };
    case "expired_twice":
      return {
        kind: "unreachable",
        detail: "the device bridge rejected the session again right after re-initializing it; nothing ran",
      };
    case "failed":
      return classifyBridgeTransportError(callOutcome.error, capMs, options.toolUseId);
  }
}
//@ chunk-25sm7c4g.js:4944-5423 placement
function readBridgeResultEnvelope(value, elapsedMs, capMs) {
  let callResult = readCallResult(value);
  switch (callResult.envelope.status) {
    case "malformed":
      return {
        kind: "transport_error",
        detail: "malformed result envelope",
        unreadableResult: true,
      };
    case "present":
      return {
        kind: "result",
        content: callResult.content,
        isError: callResult.isError,
        envelope: callResult.envelope.envelope,
        elapsedMs,
        responseBytes: byteLengthOf(value),
        ...{},
      };
    case "absent": {
      let classified = callResult.isError
        ? classifyBridgeError(value, flattenContentText(callResult.content), capMs)
        : undefined;
      if (classified) return classified;
      return {
        kind: "result",
        content: callResult.content,
        isError: callResult.isError,
        envelope: undefined,
        elapsedMs,
        responseBytes: byteLengthOf(value),
      };
    }
  }
}
//@ chunk-25sm7c4g.js:5423-6054 placement
function classifyBridgeError(value, messageText, capMs) {
  let officeBridgeKind = readOfficeBridgeKind(value);
  if (officeBridgeKind !== undefined && TIMED_OUT_BRIDGE_KINDS.has(officeBridgeKind))
    return {
      kind: "timed_out",
      capMs,
    };
  if (officeBridgeKind !== undefined && DROPPED_BRIDGE_KINDS.has(officeBridgeKind))
    return {
      kind: "dropped",
      detail: `bridge: ${officeBridgeKind}`,
    };
  if (officeBridgeKind !== undefined && UNREACHABLE_BRIDGE_KINDS.has(officeBridgeKind))
    return {
      kind: "unreachable",
      detail: `bridge: ${officeBridgeKind}`,
      ...(officeBridgeKind === "not_connected" && {
        machineNotAnswering: true,
      }),
    };
  if (officeBridgeKind === "malformed_result")
    return {
      kind: "transport_error",
      detail: "bridge: malformed result",
      unreadableResult: true,
    };
  if (messageText.length > MAX_CLASSIFIABLE_MESSAGE_LENGTH) return;
  if (TIMEOUT_MESSAGE_RE.test(messageText))
    return {
      kind: "timed_out",
      capMs,
    };
  if (DISCONNECTED_MESSAGE_RE.test(messageText))
    return {
      kind: "dropped",
      detail: "bridge: disconnected",
    };
  if (NOT_CONNECTED_MESSAGE_RE.test(messageText))
    return {
      kind: "unreachable",
      detail: "bridge: not connected",
      machineNotAnswering: true,
    };
  return;
}
//@ chunk-25sm7c4g.js:6054-6266 placement
function readOfficeBridgeKind(value) {
  let _meta = value !== null && typeof value === "object" && "_meta" in value ? value._meta : undefined;
  if (_meta === null || typeof _meta !== "object") return;
  let meta = _meta;
  let kind = meta[OFFICE_BRIDGE_KIND];
  if (typeof kind === "string") return kind;
  return meta[OFFICE_BRIDGE_BOUND_MISS] !== undefined ? "not_connected" : undefined;
}
//@ chunk-25sm7c4g.js:6266-6587 placement
function classifyBridgeTransportError(error, capMs, toolUseId) {
  if (getNumericErrorCode(error) === REQUEST_TIMEOUT_ERROR_CODE || getErrnoCode(error) === "REQUEST_TIMEOUT")
    return {
      kind: "timed_out",
      capMs,
    };
  let detail = normalizeMcpServerName(errorMessage(error));
  if (getNumericErrorCode(error) === CCR_NEEDS_APPROVAL_CODE && isArgsTooLargeError(error, toolUseId))
    return {
      kind: "approval_unverified",
    };
  if (classifyMcpErrorSourceCategory(error) !== "downstream_unreachable")
    return {
      kind: "transport_error",
      detail,
    };
  return UNREACHABLE_ERROR_CODES.has(getErrnoCode(error) ?? "")
    ? {
        kind: "unreachable",
        detail,
      }
    : {
        kind: "dropped",
        detail,
      };
}
//@ chunk-25sm7c4g.js:6587-6699 placement
var UNREACHABLE_ERROR_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-25sm7c4g.js:6587", () => {
  UNREACHABLE_ERROR_CODES = new Set([
    "ECONNREFUSED",
    "ConnectionRefused",
    "ENOTFOUND",
    "ENETUNREACH",
    "EAI_AGAIN",
    "FailedToOpenSocket",
  ]);
});
//@ chunk-25sm7c4g.js:6699-6962 placement
function isArgsTooLargeError(error, toolUseId) {
  let data = error !== null && typeof error === "object" && "data" in error ? error.data : undefined;
  if (typeof data !== "object" || data === null) return false;
  let record = data;
  return (
    typeof record.args_sha256 === "string" &&
    typeof record.tool_name === "string" &&
    typeof record.tool_use_id === "string" &&
    toolUseId !== undefined &&
    record.tool_use_id === toolUseId
  );
}
//@ chunk-25sm7c4g.js:6962-7066 placement = isConnectionError (1)
function getNumericErrorCode(err) {
  return err !== null && typeof err === "object" && "code" in err && typeof err.code === "number"
    ? err.code
    : undefined;
}
//@ chunk-25sm7c4g.js:7066-7164 placement
function flattenContentText(content) {
  return typeof content === "string"
    ? content
    : content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(`
`);
}
//@ chunk-25sm7c4g.js:7164-7190 placement
var ATTACHED_MACHINE = "attached-machine";
//@ chunk-25sm7c4g.js:7190-8728 placement
function adoptBridgeTargets(chromeClient, tools, recovery) {
  let mapped = tools.map((tool) => ({
    ...tool,
    name: recursivelySanitizeUnicode(tool.name),
  }));
  let mapped_2 = mapped
    .filter((tool) => DEVICE_PASSTHROUGH_TOOL_NAMES.has(tool.name))
    .map((tool) => ({
      toolName: tool.name,
      meta: readRemoteToolRegistration(tool),
      raw: tool._meta?.[ANTHROPIC_REMOTETOOLEXECUTION],
    }));
  let filtered = mapped.filter(
    (tool) =>
      !DEVICE_PASSTHROUGH_TOOL_NAMES.has(tool.name) &&
      mayBePassthroughTool(tool.name) &&
      tool._meta?.[PASSTHROUGH_MARKER_KEY] !== undefined,
  );
  let flattened = filtered.flatMap((tool) => {
    let passthroughMarker = readPassthroughMarker(tool);
    return passthroughMarker === undefined
      ? []
      : [
          {
            bridgeName: tool.name,
            marker: passthroughMarker,
          },
        ];
  });
  let markedNames = new Set(flattened.map((entry) => entry.bridgeName));
  let rejectedNames = new Set(
    filtered.filter((tool) => !markedNames.has(tool.name)).map((tool) => tool.name),
  );
  let size = rejectedNames.size;
  let unreadable = count(mapped_2, (entry) => entry.meta === undefined);
  let servedNames = new Set(mapped_2.map((entry) => entry.toolName));
  let plumbingTools = new Set(
    mapped.filter((tool) => DEVICE_SYNC_FILES_TOOLS.has(tool.name)).map((tool) => tool.name),
  );
  let passthroughTools = new Map(
    flattened.map(({ bridgeName, marker }) => [
      bridgeName,
      {
        localName: marker.tool,
      },
    ]),
  );
  let targetNames = new Set([
    ...mapped_2.flatMap((entry) => (entry.meta ? [entry.meta.target.name] : [])),
    ...flattened.map(({ marker }) => marker.target.name),
  ]);
  let reduced = mapped.reduce((acc, tool) => {
    let normalizedName = normalizeNameForMCP(tool.name);
    acc.set(normalizedName, (acc.get(normalizedName) ?? 0) + 1);
    return acc;
  }, new Map());
  let any = filtered.some((tool) => (reduced.get(normalizeNameForMCP(tool.name)) ?? 0) > 1);
  let invalidReason =
    targetNames.size > 1
      ? "two_names"
      : servedNames.size < mapped_2.length || any
        ? "duplicate_tool"
        : undefined;
  if (mapped_2.length === 0 && flattened.length === 0 && size === 0)
    return {
      hosts: [],
      invalid: invalidReason,
      unreadable: 0,
      unreadableMarkers: size,
    };
  let meta = mapped_2.find((entry) => entry.meta)?.meta;
  let target = meta?.target ?? flattened[0]?.marker.target;
  let rawMetas = meta === undefined ? mapped_2.map((entry) => entry.raw) : [];
  let found = rawMetas.map(peerProtocolVersions).find((versions) => versions !== undefined);
  let found_2 = rawMetas.map(advertisedProtocolVersions).find((versions) => versions !== undefined);
  return {
    hosts: [
      {
        kind: "remote",
        source: "bridge",
        name: target?.name ?? ATTACHED_MACHINE,
        status: invalidReason === undefined ? "online" : "offline",
        enforcement: "self",
        description: target,
        servedTools: servedNames,
        passthroughTools,
        rejectedPassthroughTools: rejectedNames,
        plumbingTools,
        protocol:
          found !== undefined
            ? {
                kind: "incompatible",
                announced: found,
              }
            : negotiateProtocol(
                meta?.protocol_versions ??
                  found_2 ??
                  (mapped_2.length === 0 ? [REMOTE_TOOL_PROTOCOL_VERSION] : undefined),
              ),
        transport: createBridgeTransport(chromeClient, recovery),
      },
    ],
    invalid: invalidReason,
    unreadable,
    unreadableMarkers: size,
  };
}
//@ chunk-25sm7c4g.js:8728-8847 placement
function readPassthroughMarker(tool) {
  let passthroughMarker = parsePassthroughMarker(
    recursivelySanitizeUnicode(tool._meta?.[PASSTHROUGH_MARKER_KEY]),
  );
  return passthroughMarker !== undefined &&
    passthroughMarker.tool === buildMcpToolName(...splitBridgeToolName(tool.name)) &&
    isValidMachineSlug(passthroughMarker.target.name)
    ? passthroughMarker
    : undefined;
}
//@ chunk-25sm7c4g.js:8847-8930 placement
function splitBridgeToolName(name) {
  let index = name.indexOf("__");
  return index < 0 ? ["", name] : [name.slice(0, index), name.slice(index + 2)];
}
//@ chunk-25sm7c4g.js:8930-9037 placement
function readRemoteToolRegistration(tool) {
  let registration = parseRegistration(
    recursivelySanitizeUnicode(tool._meta?.[ANTHROPIC_REMOTETOOLEXECUTION]),
  );
  return registration !== undefined &&
    registration.tool === tool.name &&
    isValidMachineSlug(registration.target.name)
    ? registration
    : undefined;
}
//@ chunk-25sm7c4g.js:9037-9997 placement
async function callPlumbingOverSession(sender, target, name, args, options) {
  if (!DEVICE_SYNC_FILES_TOOLS.has(name)) throw Error("callPlumbing: not a plumbing tool");
  if (options.signal.aborted)
    return {
      kind: "cancelled",
    };
  let deadlineMs = clampToMaxPageSize(options.deadlineMs);
  let request = {
    subtype: "remote_plumbing_call",
    ...buildPlumbingRequest({
      instanceId: target.instanceId,
      host: target.host,
      name,
      args,
      issuedAt: Date.now(),
      deadlineMs,
    }),
  };
  let call;
  try {
    call = sender.sendServedCallRequest({
      request,
      accepts: acceptsServedCallResult,
      signal: options.signal,
    });
  } catch (error) {
    return {
      kind: "transport_error",
      detail: `send failed: ${errorMessage(error)}`,
    };
  }
  if (!call.sent) {
    call.reply.catch(() => {});
    return {
      kind: "unreachable",
      detail: "the session stream is closed; nothing was sent",
    };
  }
  let timedOut = false;
  let timer = setTimeout(() => {
    timedOut = true;
    call.cancel();
  }, deadlineMs);
  try {
    let reply = await call.reply;
    return (
      toPlumbingCallResult(reply) ?? {
        kind: "transport_error",
        detail: "the answer was not a tool result",
      }
    );
  } catch (error) {
    if (timedOut)
      return {
        kind: "timed_out",
        capMs: deadlineMs,
      };
    if (options.signal.aborted)
      return {
        kind: "cancelled",
      };
    if (error instanceof StreamClosedAbortError)
      return {
        kind: "dropped",
        detail: "the session stream closed after the request left",
      };
    return {
      kind: "transport_error",
      detail: errorMessage(error),
    };
  } finally {
    clearTimeout(timer);
  }
}
//@ chunk-25sm7c4g.js:9997-10159 placement = _temp (1)
/**
 * 从对象里取出 result 字段，只有它是带 content 数组的对象时才返回。
 */
function getMcpResultWithContent(r) {
  let result = typeof r === "object" && r !== null && "result" in r ? r.result : undefined;
  if (typeof result !== "object" || result === null) return;
  return Array.isArray(result.content) ? result : undefined;
}
//@ chunk-25sm7c4g.js:10159-10235 affinity
function acceptsServedCallResult(reply) {
  try {
    if (isRemoteToolCallMeta(reply)) return false;
    return getMcpResultWithContent(reply) !== undefined;
  } catch {
    return false;
  }
}
//@ chunk-25sm7c4g.js:10235-10503 affinity
function toPlumbingCallResult(reply) {
  let mcpResultWithContent = getMcpResultWithContent(reply);
  if (mcpResultWithContent === undefined) return;
  let { content, structuredContent, isError } = mcpResultWithContent;
  return {
    kind: "result",
    structuredContent,
    text: content.flatMap((block) =>
      typeof block === "object" && block !== null && block.type === "text" && typeof block.text === "string"
        ? [block.text]
        : [],
    ).join(`
`),
    isError: isError === true,
  };
}
export {
  callPlumbingOverSession,
  BridgeSessionRecovery,
  mcpClientModule,
  callWithSessionRecovery,
  adoptBridgeTargets,
  isBridgePlumbingEnabled,
};
