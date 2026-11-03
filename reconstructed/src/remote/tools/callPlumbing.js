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
import { lqe, iie } from "../../services/remoteTools/backgroundCommands.js";
import { AJ, iv } from "./callResults.js";
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
import { CCR_NEEDS_APPROVAL_CODE, rY } from "../../services/mcp/mcpResultErrors.js";
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
import { _4 } from "../../bridge/deviceRegistration.js";

//@ chunk-25sm7c4g.js:1282-1351 placement
function isBridgePlumbingEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_scroll", !1);
  } catch {
    return !1;
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
    return (this.#e.set(e, r), r);
  }
}
//@ chunk-25sm7c4g.js:1579-1593 placement
var Ae = -32000;
//@ chunk-25sm7c4g.js:1593-1815 placement
async function callWithSessionRecovery(e, n, r) {
  let o = await callBridgeTool(e, n, r);
  if (o.kind !== "session_expired") return evictFailedConnectMemo(e, o);
  await n.recovery.reinitialize(o.connection);
  let u = await callBridgeTool(e, n, r);
  return u.kind === "session_expired" ? { kind: "expired_twice" } : evictFailedConnectMemo(e, u);
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
async function callBridgeTool(e, { deadlineAt: deadlineAt, signal: signal, idempotent: idempotent = !1 }, u) {
  let s = mcpClientModule(),
    m;
  try {
    m = await s.ensureConnectedClient(e, {
      signal: signal,
      timeoutMs: Math.max(1, deadlineAt - Date.now()),
      context: "remote tool execution",
    });
  } catch (error) {
    return { kind: "connect_failed", error: error };
  }
  let p = deadlineAt - Date.now();
  if (p <= 0)
    return { kind: "connect_failed", error: Error("deadline reached before the request could be sent") };
  try {
    return { kind: "ok", value: await u(m, p) };
  } catch (error) {
    return error instanceof Error &&
      (s.isMcpSessionExpiredError(error) || (idempotent && isHttpConnectionClosedError(error, m)))
      ? { kind: "session_expired", connection: m }
      : { kind: "failed", error: error };
  }
}
//@ chunk-25sm7c4g.js:2498-2678 placement
function isHttpConnectionClosedError(e, n) {
  return (
    (("code" in e && e.code === Ae && e.message.includes("Connection closed")) ||
      getErrnoCode(e) === "CONNECTION_CLOSED") &&
    (n.config.type === "http" || n.config.type === "claudeai-proxy")
  );
}
//@ chunk-25sm7c4g.js:2678-3084 placement
var BRIDGE_CALL_LIMITS = { maxRequestBytes: 4128768, defaultDeadlineMs: 58000 },
  Pe = -32001,
  OFFICE_BRIDGE_KIND = "office_bridge.kind",
  OFFICE_BRIDGE_BOUND_MISS = "office_bridge.bound_miss",
  Le = new Set(["not_connected", "send_failed", "contested", "unsupported_on_bound"]),
  He = new Set(["disconnected", "cancelled"]),
  Ie = new Set(["timeout"]),
  Be = /not connected|not reachable|offline/i,
  xe = /disconnected before responding|connection may be closing/i,
  Ne = /did not respond within/i,
  Fe = 200;
//@ chunk-25sm7c4g.js:3084-3201 placement
function createBridgeTransport(e, n) {
  return {
    kind: "bridge",
    limits: BRIDGE_CALL_LIMITS,
    call: (r, o, u, s) => callRemoteToolOverBridge(e, n, r, o, u, s),
    callPlumbing: (r, o, u) => callBridgePlumbingTool(e, n, r, o, u),
  };
}
/**
 * 通过设备桥（office/device bridge）MCP 调用远程管道工具：超时、会话过期重初始化、结果信封解析。
 */
//@ chunk-25sm7c4g.js:3201-4041 placement
async function callBridgePlumbingTool(e, n, r, o, u) {
  if (!lqe.has(r)) throw Error("callPlumbing: not a bridge plumbing tool");
  let now = Date.now(),
    m = AJ(u.deadlineMs),
    p = await callWithSessionRecovery(
      e,
      { deadlineAt: now + m, recovery: n, signal: u.signal, idempotent: u.idempotent },
      (f, _) => callMcpTool(f, { name: r, arguments: { ...o } }, { signal: u.signal, timeout: _ }),
    );
  if (p.kind === "ok") {
    let f = readCallResult(p.value),
      _ = ce(f.content),
      g = f.isError && f.envelope.status === "absent" ? classifyBridgeError(p.value, _, m) : void 0;
    if (g !== void 0) return normalizeTransportFailure(g);
    return { kind: "result", structuredContent: p.value.structuredContent, text: _, isError: f.isError };
  }
  if (u.signal.aborted) return { kind: "cancelled" };
  switch (p.kind) {
    case "connect_failed":
      return { kind: "unreachable", detail: normalizeMcpServerName(errorMessage(p.error)) };
    case "expired_twice":
      return {
        kind: "unreachable",
        detail: "the device bridge rejected the session again right after re-initializing it; nothing ran",
      };
    case "failed":
      return normalizeTransportFailure(classifyBridgeTransportError(p.error, m, void 0));
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
      return { kind: "transport_error", detail: `unexpected: ${e.kind}` };
  }
}
//@ chunk-25sm7c4g.js:4237-4944 placement
async function callRemoteToolOverBridge(e, n, r, o, u, s) {
  let now = Date.now(),
    p = AJ(s.deadlineMs),
    f = encodeCallArgs(u),
    _ = await callWithSessionRecovery(e, { deadlineAt: now + p, recovery: n, signal: s.signal }, (g, w) =>
      callMcpTool(
        g,
        {
          name: r,
          arguments: { ...o, [REMOTE_TOOL_CALL_META]: u },
          _meta: {
            [CLAUDECODE_TOOLUSEID]: s.toolUseId,
            ...(f !== void 0 && { [CLAUDECODE_REMOTETOOLCALL]: f }),
          },
        },
        { signal: s.signal, timeout: w },
      ),
    );
  if (_.kind === "ok") {
    let g = readBridgeResultEnvelope(_.value, Date.now() - now, p);
    return g.kind === "result" ? { ...g, metaCopy: f === void 0 ? "omitted" : "attached" } : g;
  }
  if (s.signal.aborted) return { kind: "cancelled" };
  switch (_.kind) {
    case "connect_failed":
      return { kind: "unreachable", detail: normalizeMcpServerName(errorMessage(_.error)) };
    case "expired_twice":
      return {
        kind: "unreachable",
        detail: "the device bridge rejected the session again right after re-initializing it; nothing ran",
      };
    case "failed":
      return classifyBridgeTransportError(_.error, p, s.toolUseId);
  }
}
//@ chunk-25sm7c4g.js:4944-5423 placement
function readBridgeResultEnvelope(e, n, r) {
  let o = readCallResult(e);
  switch (o.envelope.status) {
    case "malformed":
      return { kind: "transport_error", detail: "malformed result envelope", unreadableResult: !0 };
    case "present":
      return {
        kind: "result",
        content: o.content,
        isError: o.isError,
        envelope: o.envelope.envelope,
        elapsedMs: n,
        responseBytes: iv(e),
        ...{},
      };
    case "absent": {
      let u = o.isError ? classifyBridgeError(e, ce(o.content), r) : void 0;
      if (u) return u;
      return {
        kind: "result",
        content: o.content,
        isError: o.isError,
        envelope: void 0,
        elapsedMs: n,
        responseBytes: iv(e),
      };
    }
  }
}
//@ chunk-25sm7c4g.js:5423-6054 placement
function classifyBridgeError(e, n, r) {
  let o = readOfficeBridgeKind(e);
  if (o !== void 0 && Ie.has(o)) return { kind: "timed_out", capMs: r };
  if (o !== void 0 && He.has(o)) return { kind: "dropped", detail: `bridge: ${o}` };
  if (o !== void 0 && Le.has(o))
    return {
      kind: "unreachable",
      detail: `bridge: ${o}`,
      ...(o === "not_connected" && { machineNotAnswering: !0 }),
    };
  if (o === "malformed_result")
    return { kind: "transport_error", detail: "bridge: malformed result", unreadableResult: !0 };
  if (n.length > Fe) return;
  if (Ne.test(n)) return { kind: "timed_out", capMs: r };
  if (xe.test(n)) return { kind: "dropped", detail: "bridge: disconnected" };
  if (Be.test(n)) return { kind: "unreachable", detail: "bridge: not connected", machineNotAnswering: !0 };
  return;
}
//@ chunk-25sm7c4g.js:6054-6266 placement
function readOfficeBridgeKind(e) {
  let n = e !== null && typeof e === "object" && "_meta" in e ? e._meta : void 0;
  if (n === null || typeof n !== "object") return;
  let r = n,
    o = r[OFFICE_BRIDGE_KIND];
  if (typeof o === "string") return o;
  return r[OFFICE_BRIDGE_BOUND_MISS] !== void 0 ? "not_connected" : void 0;
}
//@ chunk-25sm7c4g.js:6266-6587 placement
function classifyBridgeTransportError(e, n, r) {
  if (getNumericErrorCode(e) === Pe || getErrnoCode(e) === "REQUEST_TIMEOUT")
    return { kind: "timed_out", capMs: n };
  let o = normalizeMcpServerName(errorMessage(e));
  if (getNumericErrorCode(e) === CCR_NEEDS_APPROVAL_CODE && isArgsTooLargeError(e, r))
    return { kind: "approval_unverified" };
  if (rY(e) !== "downstream_unreachable") return { kind: "transport_error", detail: o };
  return UNREACHABLE_ERROR_CODES.has(getErrnoCode(e) ?? "")
    ? { kind: "unreachable", detail: o }
    : { kind: "dropped", detail: o };
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
  let r = e !== null && typeof e === "object" && "data" in e ? e.data : void 0;
  if (typeof r !== "object" || r === null) return !1;
  let o = r;
  return (
    typeof o.args_sha256 === "string" &&
    typeof o.tool_name === "string" &&
    typeof o.tool_use_id === "string" &&
    n !== void 0 &&
    o.tool_use_id === n
  );
}
//@ chunk-25sm7c4g.js:6962-7066 placement = isConnectionError (1)
function getNumericErrorCode(err) {
  return err !== null && typeof err === "object" && "code" in err && typeof err.code === "number"
    ? err.code
    : void 0;
}
//@ chunk-25sm7c4g.js:7066-7164 placement
function ce(e) {
  return typeof e === "string"
    ? e
    : e.flatMap((n) => (n.type === "text" ? [n.text] : [])).join(`
`);
}
//@ chunk-25sm7c4g.js:7164-7190 placement
var ATTACHED_MACHINE = "attached-machine";
//@ chunk-25sm7c4g.js:7190-8728 placement
function adoptBridgeTargets(e, n, r) {
  let mapped = n.map((h) => ({ ...h, name: recursivelySanitizeUnicode(h.name) })),
    mapped_2 = mapped
      .filter((h) => iie.has(h.name))
      .map((h) => ({
        toolName: h.name,
        meta: readRemoteToolRegistration(h),
        raw: h._meta?.[ANTHROPIC_REMOTETOOLEXECUTION],
      })),
    filtered = mapped.filter(
      (h) => !iie.has(h.name) && mayBePassthroughTool(h.name) && h._meta?.[PASSTHROUGH_MARKER_KEY] !== void 0,
    ),
    flattened = filtered.flatMap((h) => {
      let O = readPassthroughMarker(h);
      return O === void 0 ? [] : [{ bridgeName: h.name, marker: O }];
    }),
    p = new Set(flattened.map((h) => h.bridgeName)),
    f = new Set(filtered.filter((h) => !p.has(h.name)).map((h) => h.name)),
    size = f.size,
    g = count(mapped_2, (h) => h.meta === void 0),
    w = new Set(mapped_2.map((h) => h.toolName)),
    S = new Set(mapped.filter((h) => lqe.has(h.name)).map((h) => h.name)),
    R = new Map(
      flattened.map(({ bridgeName: bridgeName, marker: marker }) => [bridgeName, { localName: marker.tool }]),
    ),
    T = new Set([
      ...mapped_2.flatMap((h) => (h.meta ? [h.meta.target.name] : [])),
      ...flattened.map(({ marker: marker }) => marker.target.name),
    ]),
    reduced = mapped.reduce((h, O) => {
      let C = normalizeNameForMCP(O.name);
      return (h.set(C, (h.get(C) ?? 0) + 1), h);
    }, new Map()),
    any = filtered.some((h) => (reduced.get(normalizeNameForMCP(h.name)) ?? 0) > 1),
    y = T.size > 1 ? "two_names" : w.size < mapped_2.length || any ? "duplicate_tool" : void 0;
  if (mapped_2.length === 0 && flattened.length === 0 && size === 0)
    return { hosts: [], invalid: y, unreadable: 0, unreadableMarkers: size };
  let x = mapped_2.find((h) => h.meta)?.meta,
    q = x?.target ?? flattened[0]?.marker.target,
    P = x === void 0 ? mapped_2.map((h) => h.raw) : [],
    found = P.map(peerProtocolVersions).find((h) => h !== void 0),
    found_2 = P.map(advertisedProtocolVersions).find((h) => h !== void 0);
  return {
    hosts: [
      {
        kind: "remote",
        source: "bridge",
        name: q?.name ?? ATTACHED_MACHINE,
        status: y === void 0 ? "online" : "offline",
        enforcement: "self",
        description: q,
        servedTools: w,
        passthroughTools: R,
        rejectedPassthroughTools: f,
        plumbingTools: S,
        protocol:
          found !== void 0
            ? { kind: "incompatible", announced: found }
            : negotiateProtocol(
                x?.protocol_versions ??
                  found_2 ??
                  (mapped_2.length === 0 ? [REMOTE_TOOL_PROTOCOL_VERSION] : void 0),
              ),
        transport: createBridgeTransport(e, r),
      },
    ],
    invalid: y,
    unreadable: g,
    unreadableMarkers: size,
  };
}
//@ chunk-25sm7c4g.js:8728-8847 placement
function readPassthroughMarker(e) {
  let n = parsePassthroughMarker(recursivelySanitizeUnicode(e._meta?.[PASSTHROUGH_MARKER_KEY]));
  return n !== void 0 && n.tool === buildMcpToolName(...Ge(e.name)) && _4(n.target.name) ? n : void 0;
}
//@ chunk-25sm7c4g.js:8847-8930 placement
function Ge(e) {
  let index = e.indexOf("__");
  return index < 0 ? ["", e] : [e.slice(0, index), e.slice(index + 2)];
}
//@ chunk-25sm7c4g.js:8930-9037 placement
function readRemoteToolRegistration(e) {
  let n = parseRegistration(recursivelySanitizeUnicode(e._meta?.[ANTHROPIC_REMOTETOOLEXECUTION]));
  return n !== void 0 && n.tool === e.name && _4(n.target.name) ? n : void 0;
}
//@ chunk-25sm7c4g.js:9037-9997 placement
async function callPlumbingOverSession(e, n, r, o, u) {
  if (!lqe.has(r)) throw Error("callPlumbing: not a plumbing tool");
  if (u.signal.aborted) return { kind: "cancelled" };
  let s = AJ(u.deadlineMs),
    m = {
      subtype: "remote_plumbing_call",
      ...buildPlumbingRequest({
        instanceId: n.instanceId,
        host: n.host,
        name: r,
        args: o,
        issuedAt: Date.now(),
        deadlineMs: s,
      }),
    },
    p;
  try {
    p = e.sendServedCallRequest({ request: m, accepts: Je, signal: u.signal });
  } catch (error) {
    return { kind: "transport_error", detail: `send failed: ${errorMessage(error)}` };
  }
  if (!p.sent)
    return (
      p.reply.catch(() => {}),
      { kind: "unreachable", detail: "the session stream is closed; nothing was sent" }
    );
  let f = !1,
    _ = setTimeout(() => {
      ((f = !0), p.cancel());
    }, s);
  try {
    let reply = await p.reply;
    return (
      toPlumbingCallResult(reply) ?? { kind: "transport_error", detail: "the answer was not a tool result" }
    );
  } catch (error) {
    if (f) return { kind: "timed_out", capMs: s };
    if (u.signal.aborted) return { kind: "cancelled" };
    if (error instanceof StreamClosedAbortError)
      return { kind: "dropped", detail: "the session stream closed after the request left" };
    return { kind: "transport_error", detail: errorMessage(error) };
  } finally {
    clearTimeout(_);
  }
}
/**
 * 从对象里取出 result 字段，只有它是带 content 数组的对象时才返回。
 */
//@ chunk-25sm7c4g.js:9997-10159 placement = _temp (1)
function getMcpResultWithContent(r) {
  let n = typeof r === "object" && r !== null && "result" in r ? r.result : void 0;
  if (typeof n !== "object" || n === null) return;
  return Array.isArray(n.content) ? n : void 0;
}
//@ chunk-25sm7c4g.js:10159-10235 affinity
function Je(e) {
  try {
    if (isRemoteToolCallMeta(e)) return !1;
    return getMcpResultWithContent(e) !== void 0;
  } catch {
    return !1;
  }
}
//@ chunk-25sm7c4g.js:10235-10503 affinity
function toPlumbingCallResult(e) {
  let n = getMcpResultWithContent(e);
  if (n === void 0) return;
  let { content: content, structuredContent: structuredContent, isError: isError } = n;
  return {
    kind: "result",
    structuredContent: structuredContent,
    text: content.flatMap((s) =>
      typeof s === "object" && s !== null && s.type === "text" && typeof s.text === "string" ? [s.text] : [],
    ).join(`
`),
    isError: isError === !0,
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
