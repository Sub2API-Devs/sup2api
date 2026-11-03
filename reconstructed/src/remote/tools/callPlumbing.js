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
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-25sm7c4g.js:1420-1579 placement
class BridgeSessionRecovery {
  #e = new WeakMap();
  reinitialize(e) {
    let n = this.#e.get(e);
    if (n) return n;
    let r = mcpClientModule()
      .clearServerCache(e.name, e.config)
      .catch(() => {});
    this.#e.set(e, r);
    return r;
  }
}
//@ chunk-25sm7c4g.js:1579-1593 placement
var CONNECTION_CLOSED_ERROR_CODE = -32000;
//@ chunk-25sm7c4g.js:1593-1815 placement
async function callWithSessionRecovery(e, n, r) {
  let o = await callBridgeTool(e, n, r);
  if (o.kind !== "session_expired") return evictFailedConnectMemo(e, o);
  await n.recovery.reinitialize(o.connection);
  let u = await callBridgeTool(e, n, r);
  return u.kind === "session_expired"
    ? {
        kind: "expired_twice",
      }
    : evictFailedConnectMemo(e, u);
}
//@ chunk-25sm7c4g.js:1815-1953 placement
async function evictFailedConnectMemo(e, n) {
  if (n.kind === "connect_failed")
    await mcpClientModule()
      .evictStaleFailedConnectMemoForServe(e.name, e.config)
      .catch(() => {});
  return n;
}
//@ chunk-25sm7c4g.js:1953-2498 placement
async function callBridgeTool(e, { deadlineAt, signal, idempotent = false }, u) {
  let s = mcpClientModule();
  let m;
  try {
    m = await s.ensureConnectedClient(e, {
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
  let p = deadlineAt - Date.now();
  if (p <= 0)
    return {
      kind: "connect_failed",
      error: Error("deadline reached before the request could be sent"),
    };
  try {
    return {
      kind: "ok",
      value: await u(m, p),
    };
  } catch (error) {
    return error instanceof Error &&
      (s.isMcpSessionExpiredError(error) || (idempotent && isHttpConnectionClosedError(error, m)))
      ? {
          kind: "session_expired",
          connection: m,
        }
      : {
          kind: "failed",
          error,
        };
  }
}
//@ chunk-25sm7c4g.js:2498-2678 placement
function isHttpConnectionClosedError(error, n) {
  return (
    (("code" in error &&
      error.code === CONNECTION_CLOSED_ERROR_CODE &&
      error.message.includes("Connection closed")) ||
      getErrnoCode(error) === "CONNECTION_CLOSED") &&
    (n.config.type === "http" || n.config.type === "claudeai-proxy")
  );
}
//@ chunk-25sm7c4g.js:2678-3084 placement
/**
 * 远程调用/Office bridge 的错误归类表：请求超时与连接关闭错误码、bridge 状态码到 unreachable/dropped/timed_out 的分组、三类错误消息正则、可分类消息长度上限 200。
 */
var BRIDGE_CALL_LIMITS = {
  maxRequestBytes: 4128768,
  defaultDeadlineMs: 58000,
};
var REQUEST_TIMEOUT_ERROR_CODE = -32001;
var OFFICE_BRIDGE_KIND = "office_bridge.kind";
var OFFICE_BRIDGE_BOUND_MISS = "office_bridge.bound_miss";
var UNREACHABLE_BRIDGE_KINDS = new Set(["not_connected", "send_failed", "contested", "unsupported_on_bound"]);
var DROPPED_BRIDGE_KINDS = new Set(["disconnected", "cancelled"]);
var TIMED_OUT_BRIDGE_KINDS = new Set(["timeout"]);
var NOT_CONNECTED_MESSAGE_RE = /not connected|not reachable|offline/i;
var DISCONNECTED_MESSAGE_RE = /disconnected before responding|connection may be closing/i;
var TIMEOUT_MESSAGE_RE = /did not respond within/i;
var MAX_CLASSIFIABLE_MESSAGE_LENGTH = 200;
//@ chunk-25sm7c4g.js:3084-3201 placement
function createBridgeTransport(e, recovery) {
  return {
    kind: "bridge",
    limits: BRIDGE_CALL_LIMITS,
    call: (name, o, u, s) => callRemoteToolOverBridge(e, recovery, name, o, u, s),
    callPlumbing: (r, o, u) => callBridgePlumbingTool(e, recovery, r, o, u),
  };
}
//@ chunk-25sm7c4g.js:3201-4041 placement
/**
 * 通过设备桥（office/device bridge）MCP 调用远程管道工具：超时、会话过期重初始化、结果信封解析。
 */
async function callBridgePlumbingTool(e, recovery, r, o, u) {
  if (!DEVICE_SYNC_FILES_TOOLS.has(r)) throw Error("callPlumbing: not a bridge plumbing tool");
  let now = Date.now();
  let capMs = clampToMaxPageSize(u.deadlineMs);
  let p = await callWithSessionRecovery(
    e,
    {
      deadlineAt: now + capMs,
      recovery,
      signal: u.signal,
      idempotent: u.idempotent,
    },
    (f, timeout) =>
      callMcpTool(
        f,
        {
          name: r,
          arguments: {
            ...o,
          },
        },
        {
          signal: u.signal,
          timeout,
        },
      ),
  );
  if (p.kind === "ok") {
    let callResult = readCallResult(p.value);
    let _ = flattenContentText(callResult.content);
    let g =
      callResult.isError && callResult.envelope.status === "absent"
        ? classifyBridgeError(p.value, _, capMs)
        : undefined;
    if (g !== undefined) return normalizeTransportFailure(g);
    return {
      kind: "result",
      structuredContent: p.value.structuredContent,
      text: _,
      isError: callResult.isError,
    };
  }
  if (u.signal.aborted)
    return {
      kind: "cancelled",
    };
  switch (p.kind) {
    case "connect_failed":
      return {
        kind: "unreachable",
        detail: normalizeMcpServerName(errorMessage(p.error)),
      };
    case "expired_twice":
      return {
        kind: "unreachable",
        detail: "the device bridge rejected the session again right after re-initializing it; nothing ran",
      };
    case "failed":
      return normalizeTransportFailure(classifyBridgeTransportError(p.error, capMs, undefined));
  }
}
//@ chunk-25sm7c4g.js:4041-4237 placement
function normalizeTransportFailure(e) {
  switch (e.kind) {
    case "timed_out":
    case "unreachable":
    case "dropped":
    case "transport_error":
    case "cancelled":
      return e;
    default:
      return {
        kind: "transport_error",
        detail: `unexpected: ${e.kind}`,
      };
  }
}
//@ chunk-25sm7c4g.js:4237-4944 placement
async function callRemoteToolOverBridge(e, recovery, name, o, u, s) {
  let now = Date.now();
  let capMs = clampToMaxPageSize(s.deadlineMs);
  let f = encodeCallArgs(u);
  let _ = await callWithSessionRecovery(
    e,
    {
      deadlineAt: now + capMs,
      recovery,
      signal: s.signal,
    },
    (g, timeout) =>
      callMcpTool(
        g,
        {
          name,
          arguments: {
            ...o,
            [REMOTE_TOOL_CALL_META]: u,
          },
          _meta: {
            [CLAUDECODE_TOOLUSEID]: s.toolUseId,
            ...(f !== undefined && {
              [CLAUDECODE_REMOTETOOLCALL]: f,
            }),
          },
        },
        {
          signal: s.signal,
          timeout,
        },
      ),
  );
  if (_.kind === "ok") {
    let bridgeResultEnvelope = readBridgeResultEnvelope(_.value, Date.now() - now, capMs);
    return bridgeResultEnvelope.kind === "result"
      ? {
          ...bridgeResultEnvelope,
          metaCopy: f === undefined ? "omitted" : "attached",
        }
      : bridgeResultEnvelope;
  }
  if (s.signal.aborted)
    return {
      kind: "cancelled",
    };
  switch (_.kind) {
    case "connect_failed":
      return {
        kind: "unreachable",
        detail: normalizeMcpServerName(errorMessage(_.error)),
      };
    case "expired_twice":
      return {
        kind: "unreachable",
        detail: "the device bridge rejected the session again right after re-initializing it; nothing ran",
      };
    case "failed":
      return classifyBridgeTransportError(_.error, capMs, s.toolUseId);
  }
}
//@ chunk-25sm7c4g.js:4944-5423 placement
function readBridgeResultEnvelope(e, elapsedMs, capMs) {
  let callResult = readCallResult(e);
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
        responseBytes: byteLengthOf(e),
        ...{},
      };
    case "absent": {
      let u = callResult.isError
        ? classifyBridgeError(e, flattenContentText(callResult.content), capMs)
        : undefined;
      if (u) return u;
      return {
        kind: "result",
        content: callResult.content,
        isError: callResult.isError,
        envelope: undefined,
        elapsedMs,
        responseBytes: byteLengthOf(e),
      };
    }
  }
}
//@ chunk-25sm7c4g.js:5423-6054 placement
function classifyBridgeError(e, n, capMs) {
  let officeBridgeKind = readOfficeBridgeKind(e);
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
  if (n.length > MAX_CLASSIFIABLE_MESSAGE_LENGTH) return;
  if (TIMEOUT_MESSAGE_RE.test(n))
    return {
      kind: "timed_out",
      capMs,
    };
  if (DISCONNECTED_MESSAGE_RE.test(n))
    return {
      kind: "dropped",
      detail: "bridge: disconnected",
    };
  if (NOT_CONNECTED_MESSAGE_RE.test(n))
    return {
      kind: "unreachable",
      detail: "bridge: not connected",
      machineNotAnswering: true,
    };
  return;
}
//@ chunk-25sm7c4g.js:6054-6266 placement
function readOfficeBridgeKind(e) {
  let _meta = e !== null && typeof e === "object" && "_meta" in e ? e._meta : undefined;
  if (_meta === null || typeof _meta !== "object") return;
  let r = _meta;
  let o = r[OFFICE_BRIDGE_KIND];
  if (typeof o === "string") return o;
  return r[OFFICE_BRIDGE_BOUND_MISS] !== undefined ? "not_connected" : undefined;
}
//@ chunk-25sm7c4g.js:6266-6587 placement
function classifyBridgeTransportError(err, capMs, r) {
  if (getNumericErrorCode(err) === REQUEST_TIMEOUT_ERROR_CODE || getErrnoCode(err) === "REQUEST_TIMEOUT")
    return {
      kind: "timed_out",
      capMs,
    };
  let detail = normalizeMcpServerName(errorMessage(err));
  if (getNumericErrorCode(err) === CCR_NEEDS_APPROVAL_CODE && isArgsTooLargeError(err, r))
    return {
      kind: "approval_unverified",
    };
  if (classifyMcpErrorSourceCategory(err) !== "downstream_unreachable")
    return {
      kind: "transport_error",
      detail,
    };
  return UNREACHABLE_ERROR_CODES.has(getErrnoCode(err) ?? "")
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
var UNREACHABLE_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ConnectionRefused",
  "ENOTFOUND",
  "ENETUNREACH",
  "EAI_AGAIN",
  "FailedToOpenSocket",
]);
//@ chunk-25sm7c4g.js:6699-6962 placement
function isArgsTooLargeError(e, n) {
  let r = e !== null && typeof e === "object" && "data" in e ? e.data : undefined;
  if (typeof r !== "object" || r === null) return false;
  let o = r;
  return (
    typeof o.args_sha256 === "string" &&
    typeof o.tool_name === "string" &&
    typeof o.tool_use_id === "string" &&
    n !== undefined &&
    o.tool_use_id === n
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
    : content.flatMap((n) => (n.type === "text" ? [n.text] : [])).join(`
`);
}
//@ chunk-25sm7c4g.js:7164-7190 placement
var ATTACHED_MACHINE = "attached-machine";
//@ chunk-25sm7c4g.js:7190-8728 placement
function adoptBridgeTargets(chromeClient, tools, recovery) {
  let mapped = tools.map((h) => ({
    ...h,
    name: recursivelySanitizeUnicode(h.name),
  }));
  let mapped_2 = mapped
    .filter((h) => DEVICE_PASSTHROUGH_TOOL_NAMES.has(h.name))
    .map((h) => ({
      toolName: h.name,
      meta: readRemoteToolRegistration(h),
      raw: h._meta?.[ANTHROPIC_REMOTETOOLEXECUTION],
    }));
  let filtered = mapped.filter(
    (h) =>
      !DEVICE_PASSTHROUGH_TOOL_NAMES.has(h.name) &&
      mayBePassthroughTool(h.name) &&
      h._meta?.[PASSTHROUGH_MARKER_KEY] !== undefined,
  );
  let flattened = filtered.flatMap((h) => {
    let passthroughMarker = readPassthroughMarker(h);
    return passthroughMarker === undefined
      ? []
      : [
          {
            bridgeName: h.name,
            marker: passthroughMarker,
          },
        ];
  });
  let p = new Set(flattened.map((h) => h.bridgeName));
  let f = new Set(filtered.filter((h) => !p.has(h.name)).map((h) => h.name));
  let size = f.size;
  let unreadable = count(mapped_2, (h) => h.meta === undefined);
  let w = new Set(mapped_2.map((h) => h.toolName));
  let plumbingTools = new Set(mapped.filter((h) => DEVICE_SYNC_FILES_TOOLS.has(h.name)).map((h) => h.name));
  let passthroughTools = new Map(
    flattened.map(({ bridgeName, marker }) => [
      bridgeName,
      {
        localName: marker.tool,
      },
    ]),
  );
  let T = new Set([
    ...mapped_2.flatMap((h) => (h.meta ? [h.meta.target.name] : [])),
    ...flattened.map(({ marker }) => marker.target.name),
  ]);
  let reduced = mapped.reduce((acc, O) => {
    let C = normalizeNameForMCP(O.name);
    acc.set(C, (acc.get(C) ?? 0) + 1);
    return acc;
  }, new Map());
  let any = filtered.some((h) => (reduced.get(normalizeNameForMCP(h.name)) ?? 0) > 1);
  let y = T.size > 1 ? "two_names" : w.size < mapped_2.length || any ? "duplicate_tool" : undefined;
  if (mapped_2.length === 0 && flattened.length === 0 && size === 0)
    return {
      hosts: [],
      invalid: y,
      unreadable: 0,
      unreadableMarkers: size,
    };
  let meta = mapped_2.find((h) => h.meta)?.meta;
  let target = meta?.target ?? flattened[0]?.marker.target;
  let P = meta === undefined ? mapped_2.map((h) => h.raw) : [];
  let found = P.map(peerProtocolVersions).find((h) => h !== undefined);
  let found_2 = P.map(advertisedProtocolVersions).find((h) => h !== undefined);
  return {
    hosts: [
      {
        kind: "remote",
        source: "bridge",
        name: target?.name ?? ATTACHED_MACHINE,
        status: y === undefined ? "online" : "offline",
        enforcement: "self",
        description: target,
        servedTools: w,
        passthroughTools,
        rejectedPassthroughTools: f,
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
    invalid: y,
    unreadable,
    unreadableMarkers: size,
  };
}
//@ chunk-25sm7c4g.js:8728-8847 placement
function readPassthroughMarker(e) {
  let passthroughMarker = parsePassthroughMarker(
    recursivelySanitizeUnicode(e._meta?.[PASSTHROUGH_MARKER_KEY]),
  );
  return passthroughMarker !== undefined &&
    passthroughMarker.tool === buildMcpToolName(...splitBridgeToolName(e.name)) &&
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
function readRemoteToolRegistration(e) {
  let registration = parseRegistration(recursivelySanitizeUnicode(e._meta?.[ANTHROPIC_REMOTETOOLEXECUTION]));
  return registration !== undefined &&
    registration.tool === e.name &&
    isValidMachineSlug(registration.target.name)
    ? registration
    : undefined;
}
//@ chunk-25sm7c4g.js:9037-9997 placement
async function callPlumbingOverSession(sender, n, r, args, u) {
  if (!DEVICE_SYNC_FILES_TOOLS.has(r)) throw Error("callPlumbing: not a plumbing tool");
  if (u.signal.aborted)
    return {
      kind: "cancelled",
    };
  let s = clampToMaxPageSize(u.deadlineMs);
  let request = {
    subtype: "remote_plumbing_call",
    ...buildPlumbingRequest({
      instanceId: n.instanceId,
      host: n.host,
      name: r,
      args,
      issuedAt: Date.now(),
      deadlineMs: s,
    }),
  };
  let p;
  try {
    p = sender.sendServedCallRequest({
      request,
      accepts: acceptsServedCallResult,
      signal: u.signal,
    });
  } catch (error) {
    return {
      kind: "transport_error",
      detail: `send failed: ${errorMessage(error)}`,
    };
  }
  if (!p.sent) {
    p.reply.catch(() => {});
    return {
      kind: "unreachable",
      detail: "the session stream is closed; nothing was sent",
    };
  }
  let f = false;
  let timer = setTimeout(() => {
    f = true;
    p.cancel();
  }, s);
  try {
    let reply = await p.reply;
    return (
      toPlumbingCallResult(reply) ?? {
        kind: "transport_error",
        detail: "the answer was not a tool result",
      }
    );
  } catch (error) {
    if (f)
      return {
        kind: "timed_out",
        capMs: s,
      };
    if (u.signal.aborted)
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
  let n = typeof r === "object" && r !== null && "result" in r ? r.result : undefined;
  if (typeof n !== "object" || n === null) return;
  return Array.isArray(n.content) ? n : undefined;
}
//@ chunk-25sm7c4g.js:10159-10235 affinity
function acceptsServedCallResult(e) {
  try {
    if (isRemoteToolCallMeta(e)) return false;
    return getMcpResultWithContent(e) !== undefined;
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
    text: content.flatMap((s) =>
      typeof s === "object" && s !== null && s.type === "text" && typeof s.text === "string" ? [s.text] : [],
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
