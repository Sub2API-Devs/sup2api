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
import { kt, o, u, oe, E } from "../../vendor/zod/v4/classic/schemas.js";
import { jsonParse } from "../utils/slowOperations.js";
import { truncateToLength, firstLineOf } from "../utils/stringUtils.js";
import { env } from "../utils/env.js";
import { I1 } from "../utils/stripControlChars.js";

/**
 * 设备连接的心跳、超时、重连常量。
 */
//@ chunk-efc34qfz.js:417-1012 placement
var DEVICE_PROTOCOL_VERSION = 2,
  hgi = '{"type":"hb"}',
  kZo = 15000,
  O = 1000,
  M = 30000,
  ygi = 100,
  _gi = 1e4,
  bgi = 4000,
  _ = 5000,
  x = 20000,
  N = 300000,
  d = 0.2,
  DEVICE = "device",
  Hdr = { tools_settled: 250, tools_changed: 5000, connected_stale: 250 },
  TZo = { hbIntervalMs: 1e4, stalenessMs: 25000, rpcTimeoutMs: 60000 },
  m = {
    hbIntervalMs: { min: 2000, max: 120000 },
    stalenessMs: { min: 5000, max: 600000 },
    rpcTimeoutMs: { min: 5000, max: 600000 },
  },
  S = 6000,
  I = 1000,
  freeze = Object.freeze([
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
function normalizeDeviceErrorCode(e) {
  if (typeof e !== "string" || e.length === 0) return;
  return freeze.includes(e) ? e : "unknown";
}
/**
 * 错误码为 duplicate_device_id / device_name_in_use / device_session_limit 之一时为真（不应重试的身份冲突）。
 */
//@ chunk-efc34qfz.js:1103-1206 placement
function isDeviceIdentityConflict(e) {
  return e === "duplicate_device_id" || e === "device_name_in_use" || e === "device_session_limit";
}
/**
 * 工具元数据 _meta 键名表：anthropic/searchHint、alwaysLoad、maxResultSizeChars、requiresUserInteraction。
 */
//@ chunk-efc34qfz.js:1206-1393 placement
var TOOL_META_KEYS = {
  searchHint: "anthropic/searchHint",
  alwaysLoad: "anthropic/alwaysLoad",
  maxResultSizeChars: "anthropic/maxResultSizeChars",
  requiresUserInteraction: "anthropic/requiresUserInteraction",
};
//@ chunk-efc34qfz.js:1393-1669 placement
function buildConnectMessage(e) {
  let n = e.deviceId !== void 0 && e.deviceId !== "";
  return {
    type: "connect",
    oauth_token: e.oauthToken,
    tools: e.tools,
    rtb_protocol_version: DEVICE_PROTOCOL_VERSION,
    hb_capable: !0,
    cancel_capable: !0,
    ...(n && { device_id: e.deviceId }),
    ...(n && e.sessionId !== void 0 && e.sessionId !== "" && { session_id: e.sessionId }),
  };
}
/**
 * 设备通道帧解析用的常量与 schema：长度上限、帧外壳 schema（type 可选）、connected 帧（协议版本与心跳计时）和 error 帧（reason/status/error，解析失败置空）。
 */
//@ chunk-efc34qfz.js:1669-2043 placement
var MAX_FRAME_TYPE_CHARS = 64,
  MAX_ERROR_DETAIL_CHARS = 1024,
  deviceFrameEnvelopeSchema = DoctorLazy(() => kt({ type: o().optional() })),
  connectedFrameSchema = DoctorLazy(() =>
    u({
      rtb_protocol_version: oe().optional(),
      hb_supported: oe().optional(),
      timings: oe().optional(),
    }).transform((e) => ({
      protocolVersion: negotiateProtocolVersion(e.rtb_protocol_version, e.hb_supported),
      timings: parseDeviceTimings(e.timings),
    })),
  ),
  errorFrameSchema = DoctorLazy(() =>
    u({
      reason: o()
        .optional()
        .catch(void 0),
      status: E()
        .optional()
        .catch(void 0),
      error: o()
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-efc34qfz.js:2043-2670 placement
function parseDeviceFrame(e) {
  let n;
  try {
    n = jsonParse(e);
  } catch {
    return { kind: "ignored" };
  }
  if (typeof n === "object" && n !== null) {
    if (Object.prototype.hasOwnProperty.call(n, "__proto__")) delete n.__proto__;
  }
  let safeParse = deviceFrameEnvelopeSchema().safeParse(n);
  if (!safeParse.success) return { kind: "ignored" };
  let r = safeParse.data,
    s = r.type;
  if (s === void 0) return { kind: "rpc", message: r };
  if (typeof s !== "string") return { kind: "ignored" };
  switch (s) {
    case "connected":
      return { kind: "connected", ...connectedFrameSchema().parse(r) };
    case "hb_ack":
      return { kind: "hb_ack" };
    case "error": {
      let parse = errorFrameSchema().parse(r);
      return {
        kind: "error",
        reason: normalizeDeviceErrorCode(parse.reason),
        status: parse.status,
        detail: parse.error === void 0 ? void 0 : truncateToLength(parse.error, MAX_ERROR_DETAIL_CHARS),
      };
    }
    default:
      return { kind: "unknown", frameType: truncateToLength(s, MAX_FRAME_TYPE_CHARS) };
  }
}
//@ chunk-efc34qfz.js:2670-2773 placement
function negotiateProtocolVersion(e, n) {
  let t = typeof e === "number" && Number.isInteger(e) && e >= 0 ? e : 0;
  return Math.max(t, n === !0 ? 1 : 0);
}
//@ chunk-efc34qfz.js:2773-2995 placement
function parseDeviceTimings(e) {
  let n = typeof e === "object" && e !== null && !Array.isArray(e) ? e : {};
  return {
    hbIntervalMs: clampDeviceTiming(n.hb_interval_ms, "hbIntervalMs"),
    stalenessMs: clampDeviceTiming(n.staleness_ms, "stalenessMs"),
    rpcTimeoutMs: clampDeviceTiming(n.rpc_timeout_ms, "rpcTimeoutMs"),
  };
}
//@ chunk-efc34qfz.js:2995-3142 placement
function clampDeviceTiming(e, n) {
  if (typeof e !== "number" || !Number.isFinite(e) || e <= 0) return TZo[n];
  let { min: min, max: max } = m[n];
  return Math.round(Math.min(Math.max(e, min), max));
}
//@ chunk-efc34qfz.js:3142-3412 placement
function describeDeviceError(e) {
  let min = Math.min(e.hbIntervalMs, Math.max(Math.floor(e.stalenessMs / 2), m.hbIntervalMs.min));
  return {
    keepaliveIntervalMs: min,
    pongTimeoutMs: Math.max(2 * min + S, e.stalenessMs + I),
    rotateDrainMaxMs: e.rpcTimeoutMs,
    slotContentionFastAttempts: Math.ceil((e.stalenessMs + x) / _),
  };
}
/**
 * 设备注册断线重连的等待时间：已有成功连接时按次数选短/长基准加抖动；否则指数退避（1.5^n，有上限）乘 0.5–1 随机因子。
 */
//@ chunk-efc34qfz.js:3412-3562 placement
function computeReconnectDelayMs(e, n, t, r = Math.random) {
  if (n > 0) {
    let s = n <= t ? _ : N,
      a = 1 - d + r() * (2 * d);
    return Math.round(s * a);
  }
  return Math.round(Math.min(O * 1.5 ** e, M) * (0.5 + r() * 0.5));
}
/**
 * 转小写、非字母数字换成 -、去首尾 -，截到 n 个字符。
 */
//@ chunk-efc34qfz.js:3562-3677 placement
function slugifyName(e, n) {
  return e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, n)
    .replace(/-+$/, "");
}
//@ chunk-efc34qfz.js:3677-3717 placement
function FCt(e, n = 48) {
  return slugifyName(e, n) || DEVICE;
}
//@ chunk-efc34qfz.js:3717-3778 placement
function Z2() {
  return env.CLAUDE_CODE_REMOTE_TOOLS_FORWARD === !0;
}
//@ chunk-efc34qfz.js:3778-3804 placement
function yO() {
  return Z2();
}
//@ chunk-efc34qfz.js:3804-3853 placement
var $r = "_host",
  YJr = "_host_context",
  weakMap = new WeakMap();
//@ chunk-efc34qfz.js:3853-3891 placement
function vgi(e, n) {
  return (weakMap.set(e, n), e);
}
//@ chunk-efc34qfz.js:3891-3953 placement
function $Fe(e) {
  let n = weakMap.get(e);
  return n === void 0 ? {} : { [YJr]: n };
}
//@ chunk-efc34qfz.js:3953-4053 placement
var DEVICE_2 = "device",
  D = ["container", "this-machine"],
  VYe = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/,
  CZo = 40;
//@ chunk-efc34qfz.js:4053-4094 placement
function _4(e) {
  return !xH(e) && VYe.test(e);
}
//@ chunk-efc34qfz.js:4094-4113 placement
var l = " (offline)";
//@ chunk-efc34qfz.js:4113-4158 placement
function T(e) {
  return /^[\x20-\x7e]+$/.test(e);
}
/**
 * 把用户给的机器名规范成 slug：去掉 "(offline)" 后缀、取第一段、slugify；非法或空返回 undefined。
 */
//@ chunk-efc34qfz.js:4158-4306 placement
function normalizeMachineName(e) {
  let trimmed = e.trim();
  if (!T(trimmed)) return;
  let t = trimmed.toLowerCase().endsWith(l) ? trimmed.slice(0, -l.length) : trimmed,
    r = slugifyName(firstLineOf(t, "."), CZo);
  return r === "" ? void 0 : r;
}
/**
 * 判断工具输入里的机器名是否指向 n：完全相等为真，保留名/本机别名为假，否则比较规范化 slug。
 */
//@ chunk-efc34qfz.js:4306-4484 placement
function machineNameMatches(e, n) {
  let trimmed = e.trim();
  if (!T(trimmed)) return !1;
  let lower = trimmed.toLowerCase();
  if (xH(lower)) return !1;
  if (lower === n) return !0;
  if (_4(lower)) return !1;
  let s = normalizeMachineName(trimmed);
  return s !== void 0 && !xH(s) && s === normalizeMachineName(n);
}
//@ chunk-efc34qfz.js:4484-4566 placement
function UFe(e) {
  let n = normalizeMachineName(e);
  return xH(e.trim().toLowerCase()) || (n !== void 0 && xH(n));
}
//@ chunk-efc34qfz.js:4566-4635 placement
function b4() {
  return env.CLAUDE_CODE_REMOTE ? "container" : "this-machine";
}
//@ chunk-efc34qfz.js:4635-4676 placement
function xH(e) {
  return D.some((n) => n === e);
}
/**
 * 在工具输入模式中加入可选的"在某台附着机器上运行"字段。
 */
//@ chunk-efc34qfz.js:4676-5092 placement
function attachedMachineInputField() {
  return yO()
    ? {
        [$r]: o()
          .optional()
          .describe(
            "Optional. Name of an attached machine to run this tool call on; omit it to run in this session's own environment (the default). Use only a name this session listed as attached; the result says where it ran. Choose per call by which machine the command or file path concerns; the attached-machines note says what lives where and which are reachable now.",
          ),
      }
    : {};
}
//@ chunk-efc34qfz.js:5092-5101 placement
var j = 40;
/**
 * 从工具输入里拆出 _host 字段：返回 {requested, input}，requested 为去空白后的机器名（空或保留名为 undefined），input 为去掉该字段的输入。
 */
//@ chunk-efc34qfz.js:5101-5256 placement
function splitHostField(e) {
  let { [$r]: n, ...t } = e;
  if (typeof n !== "string") return { requested: void 0, input: e };
  let trimmed = n.trim();
  return { requested: trimmed === "" || xH(trimmed) ? void 0 : trimmed, input: t };
}
/**
 * 权限对话框用：返回请求的机器名，以及（设备工具已启用且是附着机器时）实际运行的机器。
 */
//@ chunk-efc34qfz.js:5256-5369 placement
function getRequestedMachineForPrompt(e) {
  let requested = splitHostField(e).requested;
  return {
    requestedMachine: requested,
    runsOnMachine: yO() && requested !== void 0 && _4(requested) ? requested : void 0,
  };
}
//@ chunk-efc34qfz.js:5369-5403 placement
function HT(e) {
  return truncateToLength(I1(e), j);
}
/**
 * 工具调用带了 _host 但没有转发到该机器时的报错文本。
 */
//@ chunk-efc34qfz.js:5403-5518 placement
function hostFieldNotForwardedMessage() {
  return `This call named a machine ("${$r}") but was not forwarded to it; omit the field to run here.`;
}
/**
 * 本会话未启用附着机器执行时的报错文本，提示去掉 _host。
 */
//@ chunk-efc34qfz.js:5518-5641 placement
function remoteToolCallsDisabledMessage() {
  return `Running tool calls on an attached machine is not enabled in this session; omit "${$r}" to run here.`;
}
//@ chunk-efc34qfz.js:5641-5677 placement
function Cf(e) {
  return readHostField(e) !== void 0;
}
//@ chunk-efc34qfz.js:5677-5743 placement
function $kn(e) {
  let n = readHostField(e);
  return n === void 0 ? void 0 : HT(n) || void 0;
}
//@ chunk-efc34qfz.js:5743-5896 placement
function readHostField(e) {
  if (typeof e !== "object" || e === null || !($r in e)) return;
  let n = e[$r];
  if (typeof n !== "string") return;
  let trimmed = n.trim();
  return trimmed === "" || xH(trimmed) ? void 0 : trimmed;
}

export {
  DEVICE_2,
  $r,
  machineNameMatches,
  Cf,
  HT,
  Z2,
  getRequestedMachineForPrompt,
  TOOL_META_KEYS,
  _4,
  $kn,
  attachedMachineInputField,
  FCt,
  yO,
  hostFieldNotForwardedMessage,
  CZo,
  $Fe,
  b4,
  splitHostField,
  UFe,
  remoteToolCallsDisabledMessage,
  normalizeMachineName,
  YJr,
  vgi,
  xH,
  VYe,
  describeDeviceError,
  TZo,
  Hdr,
  _gi,
  hgi,
  computeReconnectDelayMs,
  ygi,
  kZo,
  buildConnectMessage,
  parseDeviceFrame,
  isDeviceIdentityConflict,
  bgi,
  slugifyName,
};
