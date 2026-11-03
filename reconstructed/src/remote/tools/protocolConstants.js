/**
 * remote/tools/protocolConstants.ts
 *
 * 2.1.316 新增：远程工具协议常量（结果表、拒绝码、错误码、服务限额）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (24), chunk-s61vbvea.js (8)
 * attribution: placement 32
 */
import { nz } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { FIn } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { Ohe } from "../../utils/git/gitSafeEnv.js";
import { gn } from "../../utils/shortHash.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, U, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { CLAUDE_CODE_REMOTE } from "../../services/mcp/ccrMetaMcp.js";

//@ chunk-g54kbxqw.js:2890-2977 placement
function Nr(e, n) {
  var s = {};
  return (
    (n = nz(n, 3)),
    FIn(e, function (r, h, y) {
      Ohe(s, n(r, h, y), r);
    }),
    s
  );
}
//@ chunk-g54kbxqw.js:2977-2987 placement
var identityMap = Nr;
//@ chunk-g54kbxqw.js:2987-3035 placement
var REMOTE_TOOL_PROTOCOL_VERSION = 1,
  sit = [1],
  zvn = 1,
  SPILLEDOUTPUTBYTES = "spilledOutputBytes";
//@ chunk-g54kbxqw.js:3035-3087 placement
function outputTruncatedNote(e) {
  return `
(output truncated on ${e})`;
}
//@ chunk-g54kbxqw.js:3087-3502 placement
var REMOTE_TOOL_SERVING_LIMITS = /\n\(output truncated on [^\n()]*\)$/,
  Ie = 2147483647,
  TFe = { progress_interval_ms: 20000, progress_misses: 2, max_ask_ms: 120000, reconcile_ms: 30000 },
  Kvn = {
    caller_sessions_max: { min: 1, max: 256 },
    pending_asks_max: { min: 1, max: 64 },
    progress_interval_ms: { min: 1000, max: 120000 },
    progress_misses: { min: 1, max: 10 },
    reconcile_ms: { min: 5000, max: 120000 },
    max_queue_ms: { min: 0, max: Ie },
    queue_depth: { min: 0, max: 256 },
    max_ask_ms: { min: 1e4, max: Ie },
  };
//@ chunk-g54kbxqw.js:3502-3622 placement
var MACHINE_PRESENCE_STATES = "sleeping",
  SAYS_STILL_HERE = "says_still_here",
  STILL_HERE = "still_here",
  Bt = { idle: "left_idle", released: "left_released" },
  RELEASED = "released";
//@ chunk-g54kbxqw.js:3622-3651 placement
function leftStateFor(e) {
  return Bt[e];
}
//@ chunk-g54kbxqw.js:3651-3775 placement
function parseLeftState(e) {
  if (e === void 0) return;
  if (e.includes(Bt.idle)) return "idle";
  if (e.includes(Bt.released)) return "released";
  return;
}
//@ chunk-g54kbxqw.js:3775-3847 placement
var STILL_HERE_TEXT = "still_here",
  ylr = 1e4,
  _lr = 2000,
  ko = /^[a-z][a-z0-9_]{0,47}$/,
  So = 32;
//@ chunk-g54kbxqw.js:3847-3943 placement
function clampServingLimit(e, n) {
  if (n === void 0) return;
  let { min: min, max: max } = Kvn[e];
  return Math.min(Math.max(n, min), max);
}
//@ chunk-g54kbxqw.js:3943-4036 placement
var TOOL_HOST_ID_RE = /^[a-z0-9][a-z0-9+._-]{0,31}(@[0-9][0-9A-Za-z.+_-]{0,23})?$/,
  xXr = 96,
  PXr = 1e6,
  IXr = 2048;
//@ chunk-g54kbxqw.js:4036-4143 placement = detectTerminal (0.92)
function detectTerminal(e) {
  switch (e) {
    case void 0:
    case "darwin":
    case "linux":
    case "win32":
      return e;
    default:
      return "other";
  }
}
//@ chunk-g54kbxqw.js:4143-4302 placement = EXTERNAL_PERMISSION_MODES (0.908)
var SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/,
  SAFE_ID_WITH_BRACKETS_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._[\]-]{0,63}$/,
  PERMISSION_MODE_WIRE_ORDER = ["default", "acceptEdits", "plan", "auto", "bypassPermissions", "dontAsk"];
//@ chunk-g54kbxqw.js:4302-4806 placement
var REMOTE_TOOL_REFUSAL_CODES = [
    "invalid_request",
    "unsupported_protocol",
    "not_served",
    "no_session",
    "unbound",
    "session_mismatch",
    "too_many_in_flight",
    "refused_field",
    "sandbox_unavailable",
    "unknown_call",
    "no_approval",
    "stale",
    "unattested_request",
    "queue_full",
    "rate_limited",
    "duplicate_call",
    "withdrawn",
    "result_lost",
    "unrecognized",
  ],
  blr = [
    "evicted",
    "tool_withdrawn",
    "host_unbound",
    "host_stopped",
    "stale_answer",
    "record_evicted",
    "replaced_by_retry",
    "unrecognized",
  ],
  Lr = ["no_answer", "host_withdrawn", "superseded"],
  Dr = [...blr, ...Lr];
//@ chunk-g54kbxqw.js:4806-4936 placement
function normalizeWithdrawReason(e) {
  return (
    (e === "displaced" ? "superseded" : e === "withdrawn" ? "host_withdrawn" : void 0) ??
    Dr.find((s) => s === e) ??
    "unrecognized"
  );
}
//@ chunk-g54kbxqw.js:4936-5279 placement
var REMOTE_TOOL_ERROR_CODES = ["in_flight", "queue", "sessions", "unrecognized"],
  MXr = ["tool_error", "internal_error", "cancelled", "timed_out", "unrecognized"],
  IYt = [
    "ran",
    "denied_by_rule",
    "denied_by_user",
    "ask_refused_no_surface",
    "hook_blocked",
    "validation_failed",
    "duplicate_call",
    "asked_in_session",
    "approved_by_session",
    "denied_by_session",
    "ask_expired",
    "unrecognized",
  ];
//@ chunk-g54kbxqw.js:5279-5590 placement
function isRanOutcome(e) {
  switch (e) {
    case void 0:
    case "ran":
    case "approved_by_session":
      return !0;
    case "duplicate_call":
    case "hook_blocked":
    case "denied_by_rule":
    case "denied_by_user":
    case "ask_refused_no_surface":
    case "validation_failed":
    case "asked_in_session":
    case "denied_by_session":
    case "ask_expired":
    case "unrecognized":
      return !1;
  }
}
//@ chunk-g54kbxqw.js:5590-10181 placement
var SERVED_OUTCOME_TABLE = {
  ran: { kind: "completed", wire: { completed: ["ran"] }, bucket: "ok", sessionDenial: !1, phase: "call" },
  approved_by_session: {
    kind: "completed",
    wire: { completed: ["approved_by_session"] },
    bucket: "ok",
    sessionDenial: !1,
    phase: "call",
  },
  denied_by_rule: {
    kind: "completed",
    wire: { completed: ["denied_by_rule"] },
    bucket: "sad",
    denialKind: "permission-rule",
    sessionDenial: !1,
    phase: "call",
  },
  hook_blocked: {
    kind: "completed",
    wire: { completed: ["hook_blocked"] },
    bucket: "sad",
    denialKind: "permission-rule",
    sessionDenial: !1,
    phase: "call",
  },
  denied_by_user: {
    kind: "completed",
    wire: { completed: ["denied_by_user"] },
    bucket: "sad",
    denialKind: "user-rejected",
    sessionDenial: !1,
    phase: "call",
  },
  ask_refused_no_surface: {
    kind: "completed",
    wire: { completed: ["ask_refused_no_surface"] },
    bucket: "sad",
    denialKind: "user-rejected",
    sessionDenial: !1,
    phase: "call",
  },
  denied_by_session: {
    kind: "completed",
    wire: { completed: ["denied_by_session"] },
    bucket: "sad",
    denialKind: "user-rejected",
    sessionDenial: !1,
    phase: "call",
  },
  ask_expired: {
    kind: "completed",
    wire: { completed: ["ask_expired"] },
    bucket: "sad",
    sessionDenial: !0,
    phase: "call",
  },
  validation_failed: {
    kind: "completed",
    wire: { completed: ["validation_failed"] },
    bucket: "sad",
    sessionDenial: !1,
    phase: "call",
  },
  duplicate_call: {
    kind: "completed",
    wire: { completed: ["duplicate_call"] },
    bucket: "sad",
    sessionDenial: !1,
    phase: "call",
  },
  asked_in_session: {
    kind: "completed",
    wire: { completed: ["asked_in_session"] },
    bucket: "sad",
    sessionDenial: !1,
    phase: "call",
  },
  unknown_host: { kind: "route", bucket: "sad", sessionDenial: !1, phase: "route" },
  host_offline: { kind: "route", bucket: "bad", sessionDenial: !1, phase: "route" },
  gate_off: { kind: "route", bucket: "none", sessionDenial: !1, phase: "route" },
  incompatible: { kind: "route", bucket: "sad", sessionDenial: !1, phase: "route" },
  invalid_input: { kind: "error", bucket: "sad", sessionDenial: !1, phase: "route" },
  declined_spelling: { kind: "error", bucket: "sad", sessionDenial: !1, phase: "route" },
  declined_magic_link: { kind: "error", bucket: "sad", sessionDenial: !1, phase: "route" },
  not_served: { kind: "error", bucket: "sad", sessionDenial: !1, phase: "route" },
  denied_by_session_rule: {
    kind: "error",
    bucket: "sad",
    denialKind: "permission-rule",
    sessionDenial: !0,
    phase: "route",
  },
  denied_by_session_read_deny: {
    kind: "error",
    bucket: "sad",
    denialKind: "permission-rule",
    sessionDenial: !0,
    phase: "route",
  },
  approval_no_longer_covers: { kind: "error", bucket: "sad", sessionDenial: !0, phase: "route" },
  request_too_large: { kind: "error", bucket: "sad", sessionDenial: !1, phase: "route" },
  sync_failed: { kind: "error", bucket: "bad", sessionDenial: !1, phase: "route" },
  stalled: { kind: "error", bucket: "bad", sessionDenial: !1, phase: "route" },
  stalled_unsent: { kind: "error", bucket: "bad", sessionDenial: !1, phase: "route" },
  unreachable: { kind: "error", bucket: "bad", sessionDenial: !1, phase: "route" },
  cancelled: { kind: "error", bucket: "none", denialKind: "cancelled", sessionDenial: !1, phase: "route" },
  refused_by_host: {
    kind: "error",
    wire: {
      refused: [
        "invalid_request",
        "unsupported_protocol",
        "not_served",
        "no_session",
        "unbound",
        "session_mismatch",
        "too_many_in_flight",
        "queue_full",
        "rate_limited",
        "refused_field",
        "sandbox_unavailable",
        "unknown_call",
        "duplicate_call",
        "result_lost",
        "unattested_request",
      ],
    },
    bucket: "sad",
    sessionDenial: !1,
    phase: "call",
  },
  stale: { kind: "error", wire: { refused: ["stale"] }, bucket: "sad", sessionDenial: !1, phase: "call" },
  approval_unverified: {
    kind: "error",
    wire: { refused: ["no_approval"] },
    bucket: "bad",
    sessionDenial: !1,
    phase: "call",
  },
  withdrawn: {
    kind: "error",
    wire: { refused: ["withdrawn"] },
    bucket: "sad",
    sessionDenial: !0,
    phase: "call",
  },
  no_answer: { kind: "error", bucket: "sad", sessionDenial: !0, phase: "call" },
  failed_on_host: {
    kind: "error",
    wire: { failed: ["tool_error", "internal_error", "cancelled", "timed_out"] },
    bucket: "bad",
    sessionDenial: !1,
    phase: "call",
  },
  timed_out: { kind: "error", bucket: "bad", sessionDenial: !1, phase: "call" },
  dropped: { kind: "error", bucket: "bad", sessionDenial: !1, phase: "call" },
  host_gone: { kind: "error", bucket: "bad", sessionDenial: !1, phase: "call" },
  host_withdrawn: { kind: "error", bucket: "sad", sessionDenial: !1, phase: "call" },
  host_unresponsive: { kind: "error", bucket: "bad", sessionDenial: !1, phase: "call" },
  still_running: { kind: "error", bucket: "bad", sessionDenial: !1, phase: "call" },
  host_restarted: { kind: "error", bucket: "bad", sessionDenial: !1, phase: "call" },
  not_received: { kind: "error", bucket: "bad", sessionDenial: !1, phase: "call" },
  approval_not_received: { kind: "error", bucket: "bad", sessionDenial: !1, phase: "call" },
  transport_error: { kind: "error", bucket: "bad", sessionDenial: !1, phase: "call" },
  interrupted: { kind: "error", bucket: "none", denialKind: "interrupted", sessionDenial: !1, phase: "call" },
  rejected_in_session: {
    kind: "error",
    bucket: "none",
    denialKind: "user-rejected",
    sessionDenial: !0,
    phase: "call",
  },
  prompt_failed: { kind: "error", bucket: "bad", sessionDenial: !1, phase: "call" },
};
//@ chunk-g54kbxqw.js:10181-10253 placement
function isUnverifiedRefusal(e) {
  return e.kind === "dropped" && e.why === "unverified_refusal";
}
//@ chunk-g54kbxqw.js:10253-10433 placement
function unexpectedValueFingerprint(e, n) {
  let s = typeof e === "string" ? e : "";
  if (typeof e === "string" && n.includes(e)) return;
  return { length: s.length, hash: gn(s), variantOfListed: n.includes(s.trim().toLowerCase()) };
}
//@ chunk-g54kbxqw.js:10433-10690 placement
var SERVER_VERDICT_KEY = "server_verdict",
  Fr = DoctorLazy(() =>
    u({
      v: T(1),
      status: U(["matched", "mismatch", "by_id", "id_split", "none"]),
      outcome: U(["flagged", "not_flagged", "unavailable"]).optional(),
      by: T("input").optional(),
      context: T("container_supplied").optional(),
      age_ms: E().optional(),
    }),
  );
//@ chunk-g54kbxqw.js:10690-10824 placement
function readServerVerdict(e) {
  let safeParse = Fr().safeParse(e);
  if (!safeParse.success || stampOutcomeKey(safeParse.data) === void 0) return { kind: "unreadable" };
  return { kind: "stamp", stamp: safeParse.data };
}
//@ chunk-g54kbxqw.js:10824-10960 placement
function serverVerdictKind(e) {
  switch (e.kind) {
    case "absent":
    case "unmarked":
    case "unreadable":
      return e.kind;
    case "stamp":
      return stampOutcomeKey(e.stamp) ?? "unreadable";
  }
}
//@ chunk-g54kbxqw.js:10960-11123 placement
function stampOutcomeKey({ status: status, outcome: outcome }) {
  if (status === "none" || status === "id_split") return outcome === void 0 ? status : void 0;
  if (outcome === void 0) return status === "mismatch" ? "mismatch" : void 0;
  return `${status}_${outcome}`;
}
//@ chunk-s61vbvea.js:588744-588836 placement
var CONFIRM_REPOSITORY_TRUST = "confirm_repository_trust",
  REQUEST_COMPUTER_FOLDER = "request_computer_folder",
  LIST_COMPUTER_FOLDERS = "list_computer_folders";
//@ chunk-s61vbvea.js:588836-588883 placement = getMcpPrefix (1)
function getMcpPrefix(e, n) {
  return e === `mcp__${CLAUDE_CODE_REMOTE}__${n}`;
}
//@ chunk-s61vbvea.js:588883-588915 placement
function KNe(e) {
  return getMcpPrefix(e, CONFIRM_REPOSITORY_TRUST);
}
//@ chunk-s61vbvea.js:588915-588947 placement
function m2(e) {
  return getMcpPrefix(e, REQUEST_COMPUTER_FOLDER);
}
//@ chunk-s61vbvea.js:588947-588980 placement
function n4o(e) {
  return getMcpPrefix(e, LIST_COMPUTER_FOLDERS);
}
/**
 * 把服务端工具权限请求转换为 can_use_tool 控制请求，只带上存在的可选字段。
 */
//@ chunk-s61vbvea.js:588980-589408 placement
function toCanUseToolRequest(e) {
  return {
    subtype: e.subtype,
    tool_name: e.tool_name,
    input: e.input,
    tool_use_id: e.tool_use_id,
    ...(e.mcp_server !== void 0 && { mcp_server: e.mcp_server }),
    ...(e.title !== void 0 && { title: e.title }),
    ...(e.display_name !== void 0 && { display_name: e.display_name }),
    ...(e.description !== void 0 && { description: e.description }),
    ...(e.agent_id !== void 0 && { agent_id: e.agent_id }),
    suppress_always_allow_rule: !0,
    default_to_no: !0,
    requires_user_interaction: !0,
  };
}
//@ chunk-s61vbvea.js:589408-589569 placement
function isComputerFolderTarget(e) {
  return (
    Object.keys(e).length === 3 &&
    ["environment_id", "computer_name", "folder"].every((r) => {
      let s = e[r];
      return typeof s === "string" && s.trim() !== "";
    })
  );
}
/**
 * 把权限请求转换为可服务端处理的权限请求对象，只带上存在的可选字段。
 */
//@ chunk-s61vbvea.js:589569-589975 placement
function toServedPermissionRequest(e) {
  return {
    subtype: e.subtype,
    tool_name: e.tool_name,
    input: e.input,
    tool_use_id: e.tool_use_id,
    ...(e.mcp_server !== void 0 && { mcp_server: e.mcp_server }),
    ...(e.agent_id !== void 0 && { agent_id: e.agent_id }),
    ...(e.server_prompt !== void 0 && { server_prompt: e.server_prompt }),
    ...(e.computer_folder !== void 0 && { computer_folder: e.computer_folder }),
    default_to_no: !0,
    suppress_always_allow_rule: !0,
    requires_user_interaction: !0,
  };
}

export {
  REMOTE_TOOL_PROTOCOL_VERSION,
  unexpectedValueFingerprint,
  KNe,
  m2,
  isComputerFolderTarget,
  toCanUseToolRequest,
  toServedPermissionRequest,
  identityMap,
  ylr,
  _lr,
  detectTerminal,
  isRanOutcome,
  IYt,
  TOOL_HOST_ID_RE,
  xXr,
  IXr,
  ko,
  So,
  zvn,
  RELEASED,
  serverVerdictKind,
  PXr,
  TFe,
  outputTruncatedNote,
  SPILLEDOUTPUTBYTES,
  sit,
  SERVED_OUTCOME_TABLE,
  clampServingLimit,
  normalizeWithdrawReason,
  isUnverifiedRefusal,
  REMOTE_TOOL_SERVING_LIMITS,
  SAFE_ID_PATTERN,
  SAYS_STILL_HERE,
  leftStateFor,
  PERMISSION_MODE_WIRE_ORDER,
  SAFE_ID_WITH_BRACKETS_PATTERN,
  Ie,
  Kvn,
  REMOTE_TOOL_REFUSAL_CODES,
  blr,
  REMOTE_TOOL_ERROR_CODES,
  MXr,
  SERVER_VERDICT_KEY,
  readServerVerdict,
  MACHINE_PRESENCE_STATES,
  STILL_HERE,
  STILL_HERE_TEXT,
  LIST_COMPUTER_FOLDERS,
  REQUEST_COMPUTER_FOLDER,
  n4o,
  parseLeftState,
};
