/**
 * bridge/deviceRegistration.ts
 *
 * 2.1.316 新增：把本机注册为可附着设备（远程工具执行目标）：WebSocket 心跳、连接/错误码、工具元数据
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-msyt5t42.js (39)
 * attribution: placement 38, layout 1
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  looseObject,
  stringSchema,
  objectSchema,
  unknown,
  numberSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
import { jsonParse } from "../utils/slowOperations.js";
import { truncateToLength, firstLineOf } from "../utils/stringUtils.js";
import { env } from "../utils/env.js";
import { stripControlChars } from "../utils/stripControlChars.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-msyt5t42.js:416-1011 placement
/**
 * 设备连接的心跳、超时、重连常量。
 */
var DEVICE_PROTOCOL_VERSION; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEVICE_HEARTBEAT_FRAME;
var HANDSHAKE_TIMEOUT_MS;
var RECONNECT_BACKOFF_BASE_MS;
var RECONNECT_BACKOFF_CAP_MS;
var MAX_DEVICE_RECONNECT_ATTEMPTS;
var DEVICE_STABLE_QUALIFY_MS;
var WS_CLOSE_CODE_SUPERSEDED;
var SLOT_CONTENTION_FAST_RETRY_MS;
var STALENESS_MARGIN_MS;
var CONTENTION_RETRY_LONG_MS;
var RECONNECT_JITTER_RATIO;
var DEVICE;
var REANNOUNCE_DELAYS_MS;
var DEFAULT_DEVICE_TIMINGS;
var DEVICE_TIMING_BOUNDS;
var PONG_TIMEOUT_SLACK_MS;
var STALENESS_PONG_MARGIN_MS;
var DEVICE_ERROR_CODES;
deferInit("chunk-msyt5t42.js:416", () => {
  DEVICE_PROTOCOL_VERSION = 2;
  DEVICE_HEARTBEAT_FRAME = '{"type":"hb"}';
  HANDSHAKE_TIMEOUT_MS = 15000;
  RECONNECT_BACKOFF_BASE_MS = 1000;
  RECONNECT_BACKOFF_CAP_MS = 30000;
  MAX_DEVICE_RECONNECT_ATTEMPTS = 100;
  DEVICE_STABLE_QUALIFY_MS = 1e4;
  WS_CLOSE_CODE_SUPERSEDED = 4000;
  SLOT_CONTENTION_FAST_RETRY_MS = 5000;
  STALENESS_MARGIN_MS = 20000;
  CONTENTION_RETRY_LONG_MS = 300000;
  RECONNECT_JITTER_RATIO = 0.2;
  DEVICE = "device";
  REANNOUNCE_DELAYS_MS = {
    tools_settled: 250,
    tools_changed: 5000,
    connected_stale: 250,
  };
  DEFAULT_DEVICE_TIMINGS = {
    hbIntervalMs: 1e4,
    stalenessMs: 25000,
    rpcTimeoutMs: 60000,
  };
  DEVICE_TIMING_BOUNDS = {
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
  PONG_TIMEOUT_SLACK_MS = 6000;
  STALENESS_PONG_MARGIN_MS = 1000;
  DEVICE_ERROR_CODES = Object.freeze([
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
});
//@ chunk-msyt5t42.js:1011-1102 placement
function normalizeDeviceErrorCode(reason) {
  if (typeof reason !== "string" || reason.length === 0) return;
  return DEVICE_ERROR_CODES.includes(reason) ? reason : "unknown";
}
//@ chunk-msyt5t42.js:1102-1205 placement
/**
 * 错误码为 duplicate_device_id / device_name_in_use / device_session_limit 之一时为真（不应重试的身份冲突）。
 */
function isDeviceIdentityConflict(errorCode) {
  return (
    errorCode === "duplicate_device_id" ||
    errorCode === "device_name_in_use" ||
    errorCode === "device_session_limit"
  );
}
//@ chunk-msyt5t42.js:1205-1392 placement
/**
 * 工具元数据 _meta 键名表：anthropic/searchHint、alwaysLoad、maxResultSizeChars、requiresUserInteraction。
 */
var TOOL_META_KEYS = {
  searchHint: "anthropic/searchHint",
  alwaysLoad: "anthropic/alwaysLoad",
  maxResultSizeChars: "anthropic/maxResultSizeChars",
  requiresUserInteraction: "anthropic/requiresUserInteraction",
};
//@ chunk-msyt5t42.js:1392-1668 placement
function buildConnectMessage(options) {
  let hasDeviceId = options.deviceId !== undefined && options.deviceId !== "";
  return {
    type: "connect",
    oauth_token: options.oauthToken,
    tools: options.tools,
    rtb_protocol_version: DEVICE_PROTOCOL_VERSION,
    hb_capable: true,
    cancel_capable: true,
    ...(hasDeviceId && {
      device_id: options.deviceId,
    }),
    ...(hasDeviceId &&
      options.sessionId !== undefined &&
      options.sessionId !== "" && {
        session_id: options.sessionId,
      }),
  };
}
//@ chunk-msyt5t42.js:1668-2042 placement
/**
 * 设备通道帧解析用的常量与 schema：长度上限、帧外壳 schema（type 可选）、connected 帧（协议版本与心跳计时）和 error 帧（reason/status/error，解析失败置空）。
 */
var MAX_FRAME_TYPE_CHARS; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_ERROR_DETAIL_CHARS;
var deviceFrameEnvelopeSchema;
var connectedFrameSchema;
var errorFrameSchema;
deferInit("chunk-msyt5t42.js:1668", () => {
  MAX_FRAME_TYPE_CHARS = 64;
  MAX_ERROR_DETAIL_CHARS = 1024;
  deviceFrameEnvelopeSchema = DoctorLazy(() =>
    looseObject({
      type: stringSchema().optional(),
    }),
  );
  connectedFrameSchema = DoctorLazy(() =>
    objectSchema({
      rtb_protocol_version: unknown().optional(),
      hb_supported: unknown().optional(),
      timings: unknown().optional(),
    }).transform((frame) => ({
      protocolVersion: negotiateProtocolVersion(frame.rtb_protocol_version, frame.hb_supported),
      timings: parseDeviceTimings(frame.timings),
    })),
  );
  errorFrameSchema = DoctorLazy(() =>
    objectSchema({
      reason: stringSchema().optional().catch(undefined),
      status: numberSchema().optional().catch(undefined),
      error: stringSchema().optional().catch(undefined),
    }),
  );
});
//@ chunk-msyt5t42.js:2042-2667 placement
function parseDeviceFrame(text) {
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    return {
      kind: "ignored",
    };
  }
  if (typeof parsed === "object" && parsed !== null) {
    if (Object.prototype.hasOwnProperty.call(parsed, "__proto__")) delete parsed.__proto__;
  }
  let envelope = deviceFrameEnvelopeSchema().safeParse(parsed);
  if (!envelope.success)
    return {
      kind: "ignored",
    };
  let frame = envelope.data;
  let frameType = frame.type;
  if (frameType === undefined)
    return {
      kind: "rpc",
      message: frame,
    };
  if (typeof frameType !== "string")
    return {
      kind: "ignored",
    };
  switch (frameType) {
    case "connected":
      return {
        kind: "connected",
        ...connectedFrameSchema().parse(frame),
      };
    case "hb_ack":
      return {
        kind: "hb_ack",
      };
    case "error": {
      let errorFrame = errorFrameSchema().parse(frame);
      return {
        kind: "error",
        reason: normalizeDeviceErrorCode(errorFrame.reason),
        status: errorFrame.status,
        detail:
          errorFrame.error === undefined
            ? undefined
            : truncateToLength(errorFrame.error, MAX_ERROR_DETAIL_CHARS),
      };
    }
    default:
      return {
        kind: "unknown",
        frameType: truncateToLength(frameType, MAX_FRAME_TYPE_CHARS),
      };
  }
}
//@ chunk-msyt5t42.js:2667-2770 placement
function negotiateProtocolVersion(rtbProtocolVersion, hbSupported) {
  let reportedVersion =
    typeof rtbProtocolVersion === "number" && Number.isInteger(rtbProtocolVersion) && rtbProtocolVersion >= 0
      ? rtbProtocolVersion
      : 0;
  return Math.max(reportedVersion, hbSupported === true ? 1 : 0);
}
//@ chunk-msyt5t42.js:2770-2992 placement
function parseDeviceTimings(timings) {
  let object = typeof timings === "object" && timings !== null && !Array.isArray(timings) ? timings : {};
  return {
    hbIntervalMs: clampDeviceTiming(object.hb_interval_ms, "hbIntervalMs"),
    stalenessMs: clampDeviceTiming(object.staleness_ms, "stalenessMs"),
    rpcTimeoutMs: clampDeviceTiming(object.rpc_timeout_ms, "rpcTimeoutMs"),
  };
}
//@ chunk-msyt5t42.js:2992-3139 placement
function clampDeviceTiming(value, fieldName) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    return DEFAULT_DEVICE_TIMINGS[fieldName];
  let { min, max } = DEVICE_TIMING_BOUNDS[fieldName];
  return Math.round(Math.min(Math.max(value, min), max));
}
//@ chunk-msyt5t42.js:3139-3409 placement
function describeDeviceError(timings) {
  let min = Math.min(
    timings.hbIntervalMs,
    Math.max(Math.floor(timings.stalenessMs / 2), DEVICE_TIMING_BOUNDS.hbIntervalMs.min),
  );
  return {
    keepaliveIntervalMs: min,
    pongTimeoutMs: Math.max(2 * min + PONG_TIMEOUT_SLACK_MS, timings.stalenessMs + STALENESS_PONG_MARGIN_MS),
    rotateDrainMaxMs: timings.rpcTimeoutMs,
    slotContentionFastAttempts: Math.ceil(
      (timings.stalenessMs + STALENESS_MARGIN_MS) / SLOT_CONTENTION_FAST_RETRY_MS,
    ),
  };
}
//@ chunk-msyt5t42.js:3409-3559 placement
/**
 * 设备注册断线重连的等待时间：已有成功连接时按次数选短/长基准加抖动；否则指数退避（1.5^n，有上限）乘 0.5–1 随机因子。
 */
function computeReconnectDelayMs(
  attempt,
  slotContentionCount,
  slotContentionFastAttempts,
  random = Math.random,
) {
  if (slotContentionCount > 0) {
    let baseMs =
      slotContentionCount <= slotContentionFastAttempts
        ? SLOT_CONTENTION_FAST_RETRY_MS
        : CONTENTION_RETRY_LONG_MS;
    let jitterFactor = 1 - RECONNECT_JITTER_RATIO + random() * (2 * RECONNECT_JITTER_RATIO);
    return Math.round(baseMs * jitterFactor);
  }
  return Math.round(
    Math.min(RECONNECT_BACKOFF_BASE_MS * 1.5 ** attempt, RECONNECT_BACKOFF_CAP_MS) * (0.5 + random() * 0.5),
  );
}
//@ chunk-msyt5t42.js:3559-3674 placement
/**
 * 转小写、非字母数字换成 -、去首尾 -，截到 n 个字符。
 */
function slugifyName(name, maxLength) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, maxLength)
    .replace(/-+$/, "");
}
//@ chunk-msyt5t42.js:3674-3714 placement
/**
 * 把用户给的机器名规范成 slug（截断到 48），空时回退为 "device"。
 */
function deviceSlugOrFallback(name, maxLength = 48) {
  return slugifyName(name, maxLength) || DEVICE;
}
//@ chunk-msyt5t42.js:3714-3776 placement
/**
 * 是否开启跨机器工具转发（CLAUDE_CODE_REMOTE_TOOLS_FORWARD 为真）。
 */
function isRemoteToolsForwardEnabled() {
  return env.CLAUDE_CODE_REMOTE_TOOLS_FORWARD === true;
}
//@ chunk-msyt5t42.js:3776-3803 layout
function isRemoteToolsForwardEnabled2() {
  return isRemoteToolsForwardEnabled();
}
//@ chunk-msyt5t42.js:3803-3829 placement
/**
 * 本会话能否在本机执行工具调用：与 Z2 同义的包装，供 runsOnMachine 判断。
 */
function canRunToolsOnThisMachine() {
  return isRemoteToolsForwardEnabled2();
}
//@ chunk-msyt5t42.js:3829-3878 placement
/**
 * 工具输入里的机器字段名 "_host" 与随行元数据键 "_host_context"。
 */
var HOST_TOOL_INPUT_FIELD; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HOST_CONTEXT_META_FIELD;
var weakMap;
deferInit("chunk-msyt5t42.js:3829", () => {
  HOST_TOOL_INPUT_FIELD = "_host";
  HOST_CONTEXT_META_FIELD = "_host_context";
  weakMap = new WeakMap();
});
//@ chunk-msyt5t42.js:3878-3916 placement
/**
 * 把 host 上下文记到 WeakMap 并原样返回输入对象，供后续 $Fe 取回。
 */
function rememberHostContext(session, context) {
  weakMap.set(session, context);
  return session;
}
//@ chunk-msyt5t42.js:3916-3978 placement
/**
 * 取随工具调用携带的 host 上下文元数据（{_host_context: …}，没有时返回空对象）。
 */
function hostContextMeta(session) {
  let context = weakMap.get(session);
  return context === undefined
    ? {}
    : {
        [HOST_CONTEXT_META_FIELD]: context,
      };
}
//@ chunk-msyt5t42.js:3978-4078 placement
/**
 * 机器名相关常量：保留名 container/this-machine、机器 slug 正则（1–40，小写字母数字与连字符）与名字截断长度 40。
 */
var DEVICE_2 = "device";
var RESERVED_MACHINE_NAMES = ["container", "this-machine"];
var MACHINE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
var MAX_MACHINE_NAME_CHARS = 40;
//@ chunk-msyt5t42.js:4078-4119 placement
/**
 * 判断是否合法的非保留机器 slug。
 */
function isValidMachineSlug(slug) {
  return !isReservedMachineNameExact(slug) && MACHINE_SLUG_PATTERN.test(slug);
}
//@ chunk-msyt5t42.js:4119-4138 placement
var OFFLINE_SUFFIX = " (offline)";
//@ chunk-msyt5t42.js:4138-4183 placement
function isPrintableAscii(text) {
  return /^[\x20-\x7e]+$/.test(text);
}
//@ chunk-msyt5t42.js:4183-4331 placement
/**
 * 把用户给的机器名规范成 slug：去掉 "(offline)" 后缀、取第一段、slugify；非法或空返回 undefined。
 */
function normalizeMachineName(name) {
  let text = name.trim();
  if (!isPrintableAscii(text)) return;
  let base = text.toLowerCase().endsWith(OFFLINE_SUFFIX) ? text.slice(0, -OFFLINE_SUFFIX.length) : text;
  let slug = slugifyName(firstLineOf(base, "."), MAX_MACHINE_NAME_CHARS);
  return slug === "" ? undefined : slug;
}
//@ chunk-msyt5t42.js:4331-4509 placement
/**
 * 判断工具输入里的机器名是否指向 n：完全相等为真，保留名/本机别名为假，否则比较规范化 slug。
 */
function machineNameMatches(candidate, name) {
  let text = candidate.trim();
  if (!isPrintableAscii(text)) return false;
  let lower = text.toLowerCase();
  if (isReservedMachineNameExact(lower)) return false;
  if (lower === name) return true;
  if (isValidMachineSlug(lower)) return false;
  let normalized = normalizeMachineName(text);
  return (
    normalized !== undefined &&
    !isReservedMachineNameExact(normalized) &&
    normalized === normalizeMachineName(name)
  );
}
//@ chunk-msyt5t42.js:4509-4591 placement
/**
 * 判断给定机器名（或其规范化形式）是否落在保留名里。
 */
function isReservedMachineName(name) {
  let normalized = normalizeMachineName(name);
  return (
    isReservedMachineNameExact(name.trim().toLowerCase()) ||
    (normalized !== undefined && isReservedMachineNameExact(normalized))
  );
}
//@ chunk-msyt5t42.js:4591-4660 placement
/**
 * 当前机器在工具输入里应写的标签：容器内为 "container"，否则为 "this-machine"。
 */
function currentMachineLabel() {
  return env.CLAUDE_CODE_REMOTE ? "container" : "this-machine";
}
//@ chunk-msyt5t42.js:4660-4701 placement
/**
 * 精确判断机器名是否为保留名（container/this-machine）。
 */
function isReservedMachineNameExact(name) {
  return RESERVED_MACHINE_NAMES.some((reserved) => reserved === name);
}
//@ chunk-msyt5t42.js:4701-5117 placement
/**
 * 在工具输入模式中加入可选的"在某台附着机器上运行"字段。
 */
function attachedMachineInputField() {
  return canRunToolsOnThisMachine()
    ? {
        [HOST_TOOL_INPUT_FIELD]: stringSchema()
          .optional()
          .describe(
            "Optional. Name of an attached machine to run this tool call on; omit it to run in this session's own environment (the default). Use only a name this session listed as attached; the result says where it ran. Choose per call by which machine the command or file path concerns; the attached-machines note says what lives where and which are reachable now.",
          ),
      }
    : {};
}
//@ chunk-msyt5t42.js:5117-5126 placement
var MAX_MACHINE_LABEL_CHARS = 40;
//@ chunk-msyt5t42.js:5126-5280 placement
/**
 * 从工具输入里拆出 _host 字段：返回 {requested, input}，requested 为去空白后的机器名（空或保留名为 undefined），input 为去掉该字段的输入。
 */
function splitHostField(input) {
  let { [HOST_TOOL_INPUT_FIELD]: hostField, ...rest } = input;
  if (typeof hostField !== "string")
    return {
      requested: undefined,
      input,
    };
  let trimmed = hostField.trim();
  return {
    requested: trimmed === "" || isReservedMachineNameExact(trimmed) ? undefined : trimmed,
    input: rest,
  };
}
//@ chunk-msyt5t42.js:5280-5392 placement
/**
 * 权限对话框用：返回请求的机器名，以及（设备工具已启用且是附着机器时）实际运行的机器。
 */
function getRequestedMachineForPrompt(input) {
  let requested = splitHostField(input).requested;
  return {
    requestedMachine: requested,
    runsOnMachine:
      canRunToolsOnThisMachine() && requested !== undefined && isValidMachineSlug(requested)
        ? requested
        : undefined,
  };
}
//@ chunk-msyt5t42.js:5392-5425 placement
/**
 * 把机器名取首行并截断到 40 列，用于提示文案。
 */
function machineLabelForMessage(name) {
  return truncateToLength(stripControlChars(name), MAX_MACHINE_LABEL_CHARS);
}
//@ chunk-msyt5t42.js:5425-5540 placement
/**
 * 工具调用带了 _host 但没有转发到该机器时的报错文本。
 */
function hostFieldNotForwardedMessage() {
  return `This call named a machine ("${HOST_TOOL_INPUT_FIELD}") but was not forwarded to it; omit the field to run here.`;
}
//@ chunk-msyt5t42.js:5540-5663 placement
/**
 * 本会话未启用附着机器执行时的报错文本，提示去掉 _host。
 */
function remoteToolCallsDisabledMessage() {
  return `Running tool calls on an attached machine is not enabled in this session; omit "${HOST_TOOL_INPUT_FIELD}" to run here.`;
}
//@ chunk-msyt5t42.js:5663-5699 placement
/**
 * 判断工具输入里是否带了 _host 字段。
 */
function hasHostField(input) {
  return readHostField(input) !== undefined;
}
//@ chunk-msyt5t42.js:5699-5765 placement
/**
 * 取工具输入里请求的目标机器名并做有界截断；未指定时返回 undefined。
 */
function requestedMachineLabel(input) {
  let hostField = readHostField(input);
  return hostField === undefined ? undefined : machineLabelForMessage(hostField) || undefined;
}
//@ chunk-msyt5t42.js:5765-5918 placement
function readHostField(input) {
  if (typeof input !== "object" || input === null || !(HOST_TOOL_INPUT_FIELD in input)) return;
  let value = input[HOST_TOOL_INPUT_FIELD];
  if (typeof value !== "string") return;
  let trimmed = value.trim();
  return trimmed === "" || isReservedMachineNameExact(trimmed) ? undefined : trimmed;
}
export {
  DEVICE_2,
  HOST_TOOL_INPUT_FIELD,
  machineNameMatches,
  hasHostField,
  hostContextMeta,
  canRunToolsOnThisMachine,
  hostFieldNotForwardedMessage,
  machineLabelForMessage,
  isRemoteToolsForwardEnabled,
  splitHostField,
  isReservedMachineName,
  remoteToolCallsDisabledMessage,
  normalizeMachineName,
  isValidMachineSlug,
  TOOL_META_KEYS,
  REANNOUNCE_DELAYS_MS,
  MACHINE_SLUG_PATTERN,
  isReservedMachineNameExact,
  currentMachineLabel,
  attachedMachineInputField,
  isRemoteToolsForwardEnabled2,
  requestedMachineLabel,
  deviceSlugOrFallback,
  describeDeviceError,
  DEFAULT_DEVICE_TIMINGS,
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
  MAX_MACHINE_NAME_CHARS,
  getRequestedMachineForPrompt,
  HOST_CONTEXT_META_FIELD,
  rememberHostContext,
};
