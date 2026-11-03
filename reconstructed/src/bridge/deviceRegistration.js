/**
 * bridge/deviceRegistration.ts
 *
 * 2.1.316 新增：把本机注册为可附着设备（远程工具执行目标）：WebSocket 心跳、连接/错误码、工具元数据
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-efc34qfz.js (38)
 * attribution: placement 38
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { looseObject, string, u, unknown, E } from "../../vendor/zod/v4/classic/schemas.js";
import { jsonParse } from "../utils/slowOperations.js";
import { truncateToLength, firstLineOf } from "../utils/stringUtils.js";
import { env } from "../utils/env.js";
import { stripControlChars } from "../utils/stripControlChars.js";

//@ chunk-efc34qfz.js:417-1012 placement
/**
 * 设备连接的心跳、超时、重连常量。
 */
var DEVICE_PROTOCOL_VERSION = 2;
var DEVICE_HEARTBEAT_FRAME = '{"type":"hb"}';
var HANDSHAKE_TIMEOUT_MS = 15000;
var RECONNECT_BACKOFF_BASE_MS = 1000;
var RECONNECT_BACKOFF_CAP_MS = 30000;
var MAX_DEVICE_RECONNECT_ATTEMPTS = 100;
var DEVICE_STABLE_QUALIFY_MS = 1e4;
var WS_CLOSE_CODE_SUPERSEDED = 4000;
var _ = 5000;
var STALENESS_MARGIN_MS = 20000;
var CONTENTION_RETRY_LONG_MS = 300000;
var RECONNECT_JITTER_RATIO = 0.2;
var DEVICE = "device";
var REANNOUNCE_DELAYS_MS = {
  tools_settled: 250,
  tools_changed: 5000,
  connected_stale: 250,
};
var DEFAULT_DEVICE_TIMINGS = {
  hbIntervalMs: 1e4,
  stalenessMs: 25000,
  rpcTimeoutMs: 60000,
};
var DEVICE_TIMING_BOUNDS = {
  hbIntervalMs: {
    min: 2000,
    max: 120000,
  },
  stalenessMs: {
    min: 5000,
    max: 600000,
  },
  rpcTimeoutMs: {
    min: 5000,
    max: 600000,
  },
};
var PONG_TIMEOUT_SLACK_MS = 6000;
var STALENESS_PONG_MARGIN_MS = 1000;
var y = Object.freeze([
  "no_credential",
  "user_mismatch",
  "upstream_401",
  "upstream_403",
  "upstream_4xx",
  "upstream_529",
  "upstream_error",
  "network_error",
  "malformed_response",
  "duplicate_device_id",
  "device_name_in_use",
  "device_session_limit",
]);
//@ chunk-efc34qfz.js:1012-1103 placement
function normalizeDeviceErrorCode(reason) {
  if (typeof reason !== "string" || reason.length === 0) return;
  return y.includes(reason) ? reason : "unknown";
}
//@ chunk-efc34qfz.js:1103-1206 placement
/**
 * 错误码为 duplicate_device_id / device_name_in_use / device_session_limit 之一时为真（不应重试的身份冲突）。
 */
function isDeviceIdentityConflict(e) {
  return e === "duplicate_device_id" || e === "device_name_in_use" || e === "device_session_limit";
}
//@ chunk-efc34qfz.js:1206-1393 placement
/**
 * 工具元数据 _meta 键名表：anthropic/searchHint、alwaysLoad、maxResultSizeChars、requiresUserInteraction。
 */
var TOOL_META_KEYS = {
  searchHint: "anthropic/searchHint",
  alwaysLoad: "anthropic/alwaysLoad",
  maxResultSizeChars: "anthropic/maxResultSizeChars",
  requiresUserInteraction: "anthropic/requiresUserInteraction",
};
//@ chunk-efc34qfz.js:1393-1669 placement
function buildConnectMessage(e) {
  let n = e.deviceId !== undefined && e.deviceId !== "";
  return {
    type: "connect",
    oauth_token: e.oauthToken,
    tools: e.tools,
    rtb_protocol_version: DEVICE_PROTOCOL_VERSION,
    hb_capable: true,
    cancel_capable: true,
    ...(n && {
      device_id: e.deviceId,
    }),
    ...(n &&
      e.sessionId !== undefined &&
      e.sessionId !== "" && {
        session_id: e.sessionId,
      }),
  };
}
//@ chunk-efc34qfz.js:1669-2043 placement
/**
 * 设备通道帧解析用的常量与 schema：长度上限、帧外壳 schema（type 可选）、connected 帧（协议版本与心跳计时）和 error 帧（reason/status/error，解析失败置空）。
 */
var MAX_FRAME_TYPE_CHARS = 64;
var MAX_ERROR_DETAIL_CHARS = 1024;
var deviceFrameEnvelopeSchema = DoctorLazy(() =>
  looseObject({
    type: string().optional(),
  }),
);
var connectedFrameSchema = DoctorLazy(() =>
  u({
    rtb_protocol_version: unknown().optional(),
    hb_supported: unknown().optional(),
    timings: unknown().optional(),
  }).transform((e) => ({
    protocolVersion: negotiateProtocolVersion(e.rtb_protocol_version, e.hb_supported),
    timings: parseDeviceTimings(e.timings),
  })),
);
var errorFrameSchema = DoctorLazy(() =>
  u({
    reason: string().optional().catch(undefined),
    status: E().optional().catch(undefined),
    error: string().optional().catch(undefined),
  }),
);
//@ chunk-efc34qfz.js:2043-2670 placement
function parseDeviceFrame(text) {
  let n;
  try {
    n = jsonParse(text);
  } catch {
    return {
      kind: "ignored",
    };
  }
  if (typeof n === "object" && n !== null) {
    if (Object.prototype.hasOwnProperty.call(n, "__proto__")) delete n.__proto__;
  }
  let t = deviceFrameEnvelopeSchema().safeParse(n);
  if (!t.success)
    return {
      kind: "ignored",
    };
  let r = t.data;
  let s = r.type;
  if (s === undefined)
    return {
      kind: "rpc",
      message: r,
    };
  if (typeof s !== "string")
    return {
      kind: "ignored",
    };
  switch (s) {
    case "connected":
      return {
        kind: "connected",
        ...connectedFrameSchema().parse(r),
      };
    case "hb_ack":
      return {
        kind: "hb_ack",
      };
    case "error": {
      let a = errorFrameSchema().parse(r);
      return {
        kind: "error",
        reason: normalizeDeviceErrorCode(a.reason),
        status: a.status,
        detail: a.error === undefined ? undefined : truncateToLength(a.error, MAX_ERROR_DETAIL_CHARS),
      };
    }
    default:
      return {
        kind: "unknown",
        frameType: truncateToLength(s, MAX_FRAME_TYPE_CHARS),
      };
  }
}
//@ chunk-efc34qfz.js:2670-2773 placement
function negotiateProtocolVersion(rtbProtocolVersion, hbSupported) {
  let t =
    typeof rtbProtocolVersion === "number" && Number.isInteger(rtbProtocolVersion) && rtbProtocolVersion >= 0
      ? rtbProtocolVersion
      : 0;
  return Math.max(t, hbSupported === true ? 1 : 0);
}
//@ chunk-efc34qfz.js:2773-2995 placement
function parseDeviceTimings(timings) {
  let n = typeof timings === "object" && timings !== null && !Array.isArray(timings) ? timings : {};
  return {
    hbIntervalMs: clampDeviceTiming(n.hb_interval_ms, "hbIntervalMs"),
    stalenessMs: clampDeviceTiming(n.staleness_ms, "stalenessMs"),
    rpcTimeoutMs: clampDeviceTiming(n.rpc_timeout_ms, "rpcTimeoutMs"),
  };
}
//@ chunk-efc34qfz.js:2995-3142 placement
function clampDeviceTiming(e, n) {
  if (typeof e !== "number" || !Number.isFinite(e) || e <= 0) return DEFAULT_DEVICE_TIMINGS[n];
  let { min, max } = DEVICE_TIMING_BOUNDS[n];
  return Math.round(Math.min(Math.max(e, min), max));
}
//@ chunk-efc34qfz.js:3142-3412 placement
function describeDeviceError(e) {
  let min = Math.min(
    e.hbIntervalMs,
    Math.max(Math.floor(e.stalenessMs / 2), DEVICE_TIMING_BOUNDS.hbIntervalMs.min),
  );
  return {
    keepaliveIntervalMs: min,
    pongTimeoutMs: Math.max(2 * min + PONG_TIMEOUT_SLACK_MS, e.stalenessMs + STALENESS_PONG_MARGIN_MS),
    rotateDrainMaxMs: e.rpcTimeoutMs,
    slotContentionFastAttempts: Math.ceil((e.stalenessMs + STALENESS_MARGIN_MS) / _),
  };
}
//@ chunk-efc34qfz.js:3412-3562 placement
/**
 * 设备注册断线重连的等待时间：已有成功连接时按次数选短/长基准加抖动；否则指数退避（1.5^n，有上限）乘 0.5–1 随机因子。
 */
function computeReconnectDelayMs(e, n, slotContentionFastAttempts, random = Math.random) {
  if (n > 0) {
    let s = n <= slotContentionFastAttempts ? _ : CONTENTION_RETRY_LONG_MS;
    let a = 1 - RECONNECT_JITTER_RATIO + random() * (2 * RECONNECT_JITTER_RATIO);
    return Math.round(s * a);
  }
  return Math.round(
    Math.min(RECONNECT_BACKOFF_BASE_MS * 1.5 ** e, RECONNECT_BACKOFF_CAP_MS) * (0.5 + random() * 0.5),
  );
}
//@ chunk-efc34qfz.js:3562-3677 placement
/**
 * 转小写、非字母数字换成 -、去首尾 -，截到 n 个字符。
 */
function slugifyName(e, n) {
  return e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, n)
    .replace(/-+$/, "");
}
//@ chunk-efc34qfz.js:3677-3717 placement
/**
 * 把用户给的机器名规范成 slug（截断到 48），空时回退为 "device"。
 */
function deviceSlugOrFallback(e, n = 48) {
  return slugifyName(e, n) || DEVICE;
}
//@ chunk-efc34qfz.js:3717-3778 placement
/**
 * 是否开启跨机器工具转发（CLAUDE_CODE_REMOTE_TOOLS_FORWARD 为真）。
 */
function isRemoteToolsForwardEnabled() {
  return env.CLAUDE_CODE_REMOTE_TOOLS_FORWARD === true;
}
//@ chunk-efc34qfz.js:3778-3804 placement
/**
 * 本会话能否在本机执行工具调用：与 Z2 同义的包装，供 runsOnMachine 判断。
 */
function canRunToolsOnThisMachine() {
  return isRemoteToolsForwardEnabled();
}
//@ chunk-efc34qfz.js:3804-3853 placement
/**
 * 工具输入里的机器字段名 "_host" 与随行元数据键 "_host_context"。
 */
var HOST_TOOL_INPUT_FIELD = "_host";
var HOST_CONTEXT_META_FIELD = "_host_context";
var weakMap = new WeakMap();
//@ chunk-efc34qfz.js:3853-3891 placement
/**
 * 把 host 上下文记到 WeakMap 并原样返回输入对象，供后续 $Fe 取回。
 */
function rememberHostContext(e, n) {
  weakMap.set(e, n);
  return e;
}
//@ chunk-efc34qfz.js:3891-3953 placement
/**
 * 取随工具调用携带的 host 上下文元数据（{_host_context: …}，没有时返回空对象）。
 */
function hostContextMeta(e) {
  let n = weakMap.get(e);
  return n === undefined
    ? {}
    : {
        [HOST_CONTEXT_META_FIELD]: n,
      };
}
//@ chunk-efc34qfz.js:3953-4053 placement
/**
 * 机器名相关常量：保留名 container/this-machine、机器 slug 正则（1–40，小写字母数字与连字符）与名字截断长度 40。
 */
var DEVICE_2 = "device";
var RESERVED_MACHINE_NAMES = ["container", "this-machine"];
var MACHINE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
var MAX_MACHINE_NAME_CHARS = 40;
//@ chunk-efc34qfz.js:4053-4094 placement
/**
 * 判断是否合法的非保留机器 slug。
 */
function isValidMachineSlug(e) {
  return !isReservedMachineNameExact(e) && MACHINE_SLUG_PATTERN.test(e);
}
//@ chunk-efc34qfz.js:4094-4113 placement
var OFFLINE_SUFFIX = " (offline)";
//@ chunk-efc34qfz.js:4113-4158 placement
function isPrintableAscii(e) {
  return /^[\x20-\x7e]+$/.test(e);
}
//@ chunk-efc34qfz.js:4158-4306 placement
/**
 * 把用户给的机器名规范成 slug：去掉 "(offline)" 后缀、取第一段、slugify；非法或空返回 undefined。
 */
function normalizeMachineName(e) {
  let trimmed = e.trim();
  if (!isPrintableAscii(trimmed)) return;
  let t = trimmed.toLowerCase().endsWith(OFFLINE_SUFFIX) ? trimmed.slice(0, -OFFLINE_SUFFIX.length) : trimmed;
  let r = slugifyName(firstLineOf(t, "."), MAX_MACHINE_NAME_CHARS);
  return r === "" ? undefined : r;
}
//@ chunk-efc34qfz.js:4306-4484 placement
/**
 * 判断工具输入里的机器名是否指向 n：完全相等为真，保留名/本机别名为假，否则比较规范化 slug。
 */
function machineNameMatches(e, name) {
  let trimmed = e.trim();
  if (!isPrintableAscii(trimmed)) return false;
  let lower = trimmed.toLowerCase();
  if (isReservedMachineNameExact(lower)) return false;
  if (lower === name) return true;
  if (isValidMachineSlug(lower)) return false;
  let s = normalizeMachineName(trimmed);
  return s !== undefined && !isReservedMachineNameExact(s) && s === normalizeMachineName(name);
}
//@ chunk-efc34qfz.js:4484-4566 placement
/**
 * 判断给定机器名（或其规范化形式）是否落在保留名里。
 */
function isReservedMachineName(e) {
  let n = normalizeMachineName(e);
  return (
    isReservedMachineNameExact(e.trim().toLowerCase()) || (n !== undefined && isReservedMachineNameExact(n))
  );
}
//@ chunk-efc34qfz.js:4566-4635 placement
/**
 * 当前机器在工具输入里应写的标签：容器内为 "container"，否则为 "this-machine"。
 */
function currentMachineLabel() {
  return env.CLAUDE_CODE_REMOTE ? "container" : "this-machine";
}
//@ chunk-efc34qfz.js:4635-4676 placement
/**
 * 精确判断机器名是否为保留名（container/this-machine）。
 */
function isReservedMachineNameExact(e) {
  return RESERVED_MACHINE_NAMES.some((n) => n === e);
}
//@ chunk-efc34qfz.js:4676-5092 placement
/**
 * 在工具输入模式中加入可选的"在某台附着机器上运行"字段。
 */
function attachedMachineInputField() {
  return canRunToolsOnThisMachine()
    ? {
        [HOST_TOOL_INPUT_FIELD]: string()
          .optional()
          .describe(
            "Optional. Name of an attached machine to run this tool call on; omit it to run in this session's own environment (the default). Use only a name this session listed as attached; the result says where it ran. Choose per call by which machine the command or file path concerns; the attached-machines note says what lives where and which are reachable now.",
          ),
      }
    : {};
}
//@ chunk-efc34qfz.js:5092-5101 placement
var MAX_MACHINE_LABEL_CHARS = 40;
//@ chunk-efc34qfz.js:5101-5256 placement
/**
 * 从工具输入里拆出 _host 字段：返回 {requested, input}，requested 为去空白后的机器名（空或保留名为 undefined），input 为去掉该字段的输入。
 */
function splitHostField(e) {
  let { [HOST_TOOL_INPUT_FIELD]: n, ...t } = e;
  if (typeof n !== "string")
    return {
      requested: undefined,
      input: e,
    };
  let trimmed = n.trim();
  return {
    requested: trimmed === "" || isReservedMachineNameExact(trimmed) ? undefined : trimmed,
    input: t,
  };
}
//@ chunk-efc34qfz.js:5256-5369 placement
/**
 * 权限对话框用：返回请求的机器名，以及（设备工具已启用且是附着机器时）实际运行的机器。
 */
function getRequestedMachineForPrompt(e) {
  let requested = splitHostField(e).requested;
  return {
    requestedMachine: requested,
    runsOnMachine:
      canRunToolsOnThisMachine() && requested !== undefined && isValidMachineSlug(requested)
        ? requested
        : undefined,
  };
}
//@ chunk-efc34qfz.js:5369-5403 placement
/**
 * 把机器名取首行并截断到 40 列，用于提示文案。
 */
function machineLabelForMessage(e) {
  return truncateToLength(stripControlChars(e), MAX_MACHINE_LABEL_CHARS);
}
//@ chunk-efc34qfz.js:5403-5518 placement
/**
 * 工具调用带了 _host 但没有转发到该机器时的报错文本。
 */
function hostFieldNotForwardedMessage() {
  return `This call named a machine ("${HOST_TOOL_INPUT_FIELD}") but was not forwarded to it; omit the field to run here.`;
}
//@ chunk-efc34qfz.js:5518-5641 placement
/**
 * 本会话未启用附着机器执行时的报错文本，提示去掉 _host。
 */
function remoteToolCallsDisabledMessage() {
  return `Running tool calls on an attached machine is not enabled in this session; omit "${HOST_TOOL_INPUT_FIELD}" to run here.`;
}
//@ chunk-efc34qfz.js:5641-5677 placement
/**
 * 判断工具输入里是否带了 _host 字段。
 */
function hasHostField(e) {
  return readHostField(e) !== undefined;
}
//@ chunk-efc34qfz.js:5677-5743 placement
/**
 * 取工具输入里请求的目标机器名并做有界截断；未指定时返回 undefined。
 */
function requestedMachineLabel(e) {
  let hostField = readHostField(e);
  return hostField === undefined ? undefined : machineLabelForMessage(hostField) || undefined;
}
//@ chunk-efc34qfz.js:5743-5896 placement
function readHostField(e) {
  if (typeof e !== "object" || e === null || !(HOST_TOOL_INPUT_FIELD in e)) return;
  let n = e[HOST_TOOL_INPUT_FIELD];
  if (typeof n !== "string") return;
  let trimmed = n.trim();
  return trimmed === "" || isReservedMachineNameExact(trimmed) ? undefined : trimmed;
}
export {
  DEVICE_2,
  HOST_TOOL_INPUT_FIELD,
  machineNameMatches,
  hasHostField,
  machineLabelForMessage,
  isRemoteToolsForwardEnabled,
  getRequestedMachineForPrompt,
  TOOL_META_KEYS,
  isValidMachineSlug,
  requestedMachineLabel,
  attachedMachineInputField,
  deviceSlugOrFallback,
  canRunToolsOnThisMachine,
  hostFieldNotForwardedMessage,
  MAX_MACHINE_NAME_CHARS,
  hostContextMeta,
  currentMachineLabel,
  splitHostField,
  isReservedMachineName,
  remoteToolCallsDisabledMessage,
  normalizeMachineName,
  HOST_CONTEXT_META_FIELD,
  rememberHostContext,
  isReservedMachineNameExact,
  MACHINE_SLUG_PATTERN,
  describeDeviceError,
  DEFAULT_DEVICE_TIMINGS,
  REANNOUNCE_DELAYS_MS,
  DEVICE_STABLE_QUALIFY_MS,
  DEVICE_HEARTBEAT_FRAME,
  computeReconnectDelayMs,
  MAX_DEVICE_RECONNECT_ATTEMPTS,
  HANDSHAKE_TIMEOUT_MS,
  buildConnectMessage,
  parseDeviceFrame,
  isDeviceIdentityConflict,
  WS_CLOSE_CODE_SUPERSEDED,
  slugifyName,
};
