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
import { assignValueRaw } from "../../utils/git/gitSafeEnv.js";
import { shortHash } from "../../utils/shortHash.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, literal, _enum, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { CLAUDE_CODE_REMOTE } from "../../services/mcp/ccrMetaMcp.js";

//@ chunk-g54kbxqw.js:2890-2977 placement
function identityMapObject(e, n) {
  var s = {};
  n = nz(n, 3);
  FIn(e, function (r, h, y) {
    assignValueRaw(s, n(r, h, y), r);
  });
  return s;
}
//@ chunk-g54kbxqw.js:2977-2987 placement
var identityMap = identityMapObject;
//@ chunk-g54kbxqw.js:2987-3035 placement
/**
 * 远程工具协议版本常量：协议版本 1、受支持版本列表、溢出输出字节字段名 spilledOutputBytes。
 */
var REMOTE_TOOL_PROTOCOL_VERSION = 1;
var SUPPORTED_PROTOCOL_VERSIONS = [1];
var CURRENT_PROTOCOL_VERSION = 1;
var SPILLEDOUTPUTBYTES = "spilledOutputBytes";
//@ chunk-g54kbxqw.js:3035-3087 placement
function outputTruncatedNote(targetName) {
  return `
(output truncated on ${targetName})`;
}
//@ chunk-g54kbxqw.js:3087-3502 placement
/**
 * 远程工具服务端限额：截断提示正则、限额默认值（进度 20 s、2 次丢失、最长询问 120 s、对账 30 s）及各限额上下界。
 */
var REMOTE_TOOL_SERVING_LIMITS = /\n\(output truncated on [^\n()]*\)$/;
var MAX_INT32 = 2147483647;
var DEFAULT_SERVING_LIMITS = {
  progress_interval_ms: 20000,
  progress_misses: 2,
  max_ask_ms: 120000,
  reconcile_ms: 30000,
};
var SERVING_LIMIT_BOUNDS = {
  caller_sessions_max: {
    min: 1,
    max: 256,
  },
  pending_asks_max: {
    min: 1,
    max: 64,
  },
  progress_interval_ms: {
    min: 1000,
    max: 120000,
  },
  progress_misses: {
    min: 1,
    max: 10,
  },
  reconcile_ms: {
    min: 5000,
    max: 120000,
  },
  max_queue_ms: {
    min: 0,
    max: MAX_INT32,
  },
  queue_depth: {
    min: 0,
    max: 256,
  },
  max_ask_ms: {
    min: 1e4,
    max: MAX_INT32,
  },
};
//@ chunk-g54kbxqw.js:3502-3622 placement
/**
 * 机器在线状态取值：sleeping、says_still_here、still_here、released，以及 left_idle/left_released 的映射。
 */
var MACHINE_PRESENCE_STATES = "sleeping";
var SAYS_STILL_HERE = "says_still_here";
var STILL_HERE = "still_here";
var LEFT_STATE_NAMES = {
  idle: "left_idle",
  released: "left_released",
};
var RELEASED = "released";
//@ chunk-g54kbxqw.js:3622-3651 placement
function leftStateFor(leftFor) {
  return LEFT_STATE_NAMES[leftFor];
}
//@ chunk-g54kbxqw.js:3651-3775 placement
function parseLeftState(capabilities) {
  if (capabilities === undefined) return;
  if (capabilities.includes(LEFT_STATE_NAMES.idle)) return "idle";
  if (capabilities.includes(LEFT_STATE_NAMES.released)) return "released";
  return;
}
//@ chunk-g54kbxqw.js:3775-3847 placement
/**
 * 远程宿主 id 与能力校验：still_here 文案、睡眠/探测时长、能力名正则、能力个数上限。
 */
var STILL_HERE_TEXT = "still_here";
var SLEEPING_GRACE_MS = 1e4;
var LIVENESS_PROBE_TIMEOUT_MS = 2000;
var CAPABILITY_NAME_RE = /^[a-z][a-z0-9_]{0,47}$/;
var MAX_CAPABILITIES = 32;
//@ chunk-g54kbxqw.js:3847-3943 placement
function clampServingLimit(e, pendingAsksMax) {
  if (pendingAsksMax === undefined) return;
  let { min, max } = SERVING_LIMIT_BOUNDS[e];
  return Math.min(Math.max(pendingAsksMax, min), max);
}
//@ chunk-g54kbxqw.js:3943-4036 placement
/**
 * 导出常量或表 `TOOL_HOST_ID_RE`：值为 /^[a-z0-9][a-z0-9+._-]{0,31}(@[0-9][0-9A-Za-z.+_-]{0,23})?$/, xXr = 96, PXr = 1e6, IXr = 2048。
 */
var TOOL_HOST_ID_RE = /^[a-z0-9][a-z0-9+._-]{0,31}(@[0-9][0-9A-Za-z.+_-]{0,23})?$/;
var MAX_INVENTORY_TOOLS = 96;
var MAX_NONNEGATIVE_INT = 1e6;
var MAX_INVENTORY_JSON_BYTES = 2048;
//@ chunk-g54kbxqw.js:4036-4143 placement = detectTerminal (0.92)
function detectTerminal(platform) {
  switch (platform) {
    case undefined:
    case "darwin":
    case "linux":
    case "win32":
      return platform;
    default:
      return "other";
  }
}
//@ chunk-g54kbxqw.js:4143-4302 placement = EXTERNAL_PERMISSION_MODES (0.908)
var SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
var SAFE_ID_WITH_BRACKETS_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._[\]-]{0,63}$/;
var PERMISSION_MODE_WIRE_ORDER = ["default", "acceptEdits", "plan", "auto", "bypassPermissions", "dontAsk"];
//@ chunk-g54kbxqw.js:4302-4806 placement
/**
 * 远程工具拒绝/撤回/取消原因码表：拒绝码、撤回原因码、答复丢失原因码及其合并集合。
 */
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
];
var WITHDRAW_REASON_CODES = [
  "evicted",
  "tool_withdrawn",
  "host_unbound",
  "host_stopped",
  "stale_answer",
  "record_evicted",
  "replaced_by_retry",
  "unrecognized",
];
var ANSWER_GONE_REASONS = ["no_answer", "host_withdrawn", "superseded"];
var WITHDRAW_OR_ANSWER_GONE_REASONS = [...WITHDRAW_REASON_CODES, ...ANSWER_GONE_REASONS];
//@ chunk-g54kbxqw.js:4806-4936 placement
function normalizeWithdrawReason(e) {
  return (
    (e === "displaced" ? "superseded" : e === "withdrawn" ? "host_withdrawn" : undefined) ??
    WITHDRAW_OR_ANSWER_GONE_REASONS.find((s) => s === e) ??
    "unrecognized"
  );
}
//@ chunk-g54kbxqw.js:4936-5279 placement
/**
 * 远程工具错误码三个表：错误分类（in_flight/queue/sessions）、错误种类（tool_error/internal_error/cancelled/timed_out）、执行结论（ran/denied_by_* 等）。
 */
var REMOTE_TOOL_ERROR_CODES = ["in_flight", "queue", "sessions", "unrecognized"];
var ERROR_OUTCOME_CODES = ["tool_error", "internal_error", "cancelled", "timed_out", "unrecognized"];
var RAN_OUTCOME_KINDS = [
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
function isRanOutcome(disposition) {
  switch (disposition) {
    case undefined:
    case "ran":
    case "approved_by_session":
      return true;
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
      return false;
  }
}
//@ chunk-g54kbxqw.js:5590-10181 placement
var SERVED_OUTCOME_TABLE = {
  ran: {
    kind: "completed",
    wire: {
      completed: ["ran"],
    },
    bucket: "ok",
    sessionDenial: false,
    phase: "call",
  },
  approved_by_session: {
    kind: "completed",
    wire: {
      completed: ["approved_by_session"],
    },
    bucket: "ok",
    sessionDenial: false,
    phase: "call",
  },
  denied_by_rule: {
    kind: "completed",
    wire: {
      completed: ["denied_by_rule"],
    },
    bucket: "sad",
    denialKind: "permission-rule",
    sessionDenial: false,
    phase: "call",
  },
  hook_blocked: {
    kind: "completed",
    wire: {
      completed: ["hook_blocked"],
    },
    bucket: "sad",
    denialKind: "permission-rule",
    sessionDenial: false,
    phase: "call",
  },
  denied_by_user: {
    kind: "completed",
    wire: {
      completed: ["denied_by_user"],
    },
    bucket: "sad",
    denialKind: "user-rejected",
    sessionDenial: false,
    phase: "call",
  },
  ask_refused_no_surface: {
    kind: "completed",
    wire: {
      completed: ["ask_refused_no_surface"],
    },
    bucket: "sad",
    denialKind: "user-rejected",
    sessionDenial: false,
    phase: "call",
  },
  denied_by_session: {
    kind: "completed",
    wire: {
      completed: ["denied_by_session"],
    },
    bucket: "sad",
    denialKind: "user-rejected",
    sessionDenial: false,
    phase: "call",
  },
  ask_expired: {
    kind: "completed",
    wire: {
      completed: ["ask_expired"],
    },
    bucket: "sad",
    sessionDenial: true,
    phase: "call",
  },
  validation_failed: {
    kind: "completed",
    wire: {
      completed: ["validation_failed"],
    },
    bucket: "sad",
    sessionDenial: false,
    phase: "call",
  },
  duplicate_call: {
    kind: "completed",
    wire: {
      completed: ["duplicate_call"],
    },
    bucket: "sad",
    sessionDenial: false,
    phase: "call",
  },
  asked_in_session: {
    kind: "completed",
    wire: {
      completed: ["asked_in_session"],
    },
    bucket: "sad",
    sessionDenial: false,
    phase: "call",
  },
  unknown_host: {
    kind: "route",
    bucket: "sad",
    sessionDenial: false,
    phase: "route",
  },
  host_offline: {
    kind: "route",
    bucket: "bad",
    sessionDenial: false,
    phase: "route",
  },
  gate_off: {
    kind: "route",
    bucket: "none",
    sessionDenial: false,
    phase: "route",
  },
  incompatible: {
    kind: "route",
    bucket: "sad",
    sessionDenial: false,
    phase: "route",
  },
  invalid_input: {
    kind: "error",
    bucket: "sad",
    sessionDenial: false,
    phase: "route",
  },
  declined_spelling: {
    kind: "error",
    bucket: "sad",
    sessionDenial: false,
    phase: "route",
  },
  declined_magic_link: {
    kind: "error",
    bucket: "sad",
    sessionDenial: false,
    phase: "route",
  },
  not_served: {
    kind: "error",
    bucket: "sad",
    sessionDenial: false,
    phase: "route",
  },
  denied_by_session_rule: {
    kind: "error",
    bucket: "sad",
    denialKind: "permission-rule",
    sessionDenial: true,
    phase: "route",
  },
  denied_by_session_read_deny: {
    kind: "error",
    bucket: "sad",
    denialKind: "permission-rule",
    sessionDenial: true,
    phase: "route",
  },
  approval_no_longer_covers: {
    kind: "error",
    bucket: "sad",
    sessionDenial: true,
    phase: "route",
  },
  request_too_large: {
    kind: "error",
    bucket: "sad",
    sessionDenial: false,
    phase: "route",
  },
  sync_failed: {
    kind: "error",
    bucket: "bad",
    sessionDenial: false,
    phase: "route",
  },
  stalled: {
    kind: "error",
    bucket: "bad",
    sessionDenial: false,
    phase: "route",
  },
  stalled_unsent: {
    kind: "error",
    bucket: "bad",
    sessionDenial: false,
    phase: "route",
  },
  unreachable: {
    kind: "error",
    bucket: "bad",
    sessionDenial: false,
    phase: "route",
  },
  cancelled: {
    kind: "error",
    bucket: "none",
    denialKind: "cancelled",
    sessionDenial: false,
    phase: "route",
  },
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
    sessionDenial: false,
    phase: "call",
  },
  stale: {
    kind: "error",
    wire: {
      refused: ["stale"],
    },
    bucket: "sad",
    sessionDenial: false,
    phase: "call",
  },
  approval_unverified: {
    kind: "error",
    wire: {
      refused: ["no_approval"],
    },
    bucket: "bad",
    sessionDenial: false,
    phase: "call",
  },
  withdrawn: {
    kind: "error",
    wire: {
      refused: ["withdrawn"],
    },
    bucket: "sad",
    sessionDenial: true,
    phase: "call",
  },
  no_answer: {
    kind: "error",
    bucket: "sad",
    sessionDenial: true,
    phase: "call",
  },
  failed_on_host: {
    kind: "error",
    wire: {
      failed: ["tool_error", "internal_error", "cancelled", "timed_out"],
    },
    bucket: "bad",
    sessionDenial: false,
    phase: "call",
  },
  timed_out: {
    kind: "error",
    bucket: "bad",
    sessionDenial: false,
    phase: "call",
  },
  dropped: {
    kind: "error",
    bucket: "bad",
    sessionDenial: false,
    phase: "call",
  },
  host_gone: {
    kind: "error",
    bucket: "bad",
    sessionDenial: false,
    phase: "call",
  },
  host_withdrawn: {
    kind: "error",
    bucket: "sad",
    sessionDenial: false,
    phase: "call",
  },
  host_unresponsive: {
    kind: "error",
    bucket: "bad",
    sessionDenial: false,
    phase: "call",
  },
  still_running: {
    kind: "error",
    bucket: "bad",
    sessionDenial: false,
    phase: "call",
  },
  host_restarted: {
    kind: "error",
    bucket: "bad",
    sessionDenial: false,
    phase: "call",
  },
  not_received: {
    kind: "error",
    bucket: "bad",
    sessionDenial: false,
    phase: "call",
  },
  approval_not_received: {
    kind: "error",
    bucket: "bad",
    sessionDenial: false,
    phase: "call",
  },
  transport_error: {
    kind: "error",
    bucket: "bad",
    sessionDenial: false,
    phase: "call",
  },
  interrupted: {
    kind: "error",
    bucket: "none",
    denialKind: "interrupted",
    sessionDenial: false,
    phase: "call",
  },
  rejected_in_session: {
    kind: "error",
    bucket: "none",
    denialKind: "user-rejected",
    sessionDenial: true,
    phase: "call",
  },
  prompt_failed: {
    kind: "error",
    bucket: "bad",
    sessionDenial: false,
    phase: "call",
  },
};
//@ chunk-g54kbxqw.js:10181-10253 placement
function isUnverifiedRefusal(e) {
  return e.kind === "dropped" && e.why === "unverified_refusal";
}
//@ chunk-g54kbxqw.js:10253-10433 placement
function unexpectedValueFingerprint(e, n) {
  let s = typeof e === "string" ? e : "";
  if (typeof e === "string" && n.includes(e)) return;
  return {
    length: s.length,
    hash: shortHash(s),
    variantOfListed: n.includes(s.trim().toLowerCase()),
  };
}
//@ chunk-g54kbxqw.js:10433-10690 placement
/**
 * 服务端校验结论（server_verdict）的字段名与 zod schema：匹配状态、是否标记、依据、上下文与年龄。
 */
var SERVER_VERDICT_KEY = "server_verdict";
var serverVerdictSchema = DoctorLazy(() =>
  u({
    v: literal(1),
    status: _enum(["matched", "mismatch", "by_id", "id_split", "none"]),
    outcome: _enum(["flagged", "not_flagged", "unavailable"]).optional(),
    by: literal("input").optional(),
    context: literal("container_supplied").optional(),
    age_ms: E().optional(),
  }),
);
//@ chunk-g54kbxqw.js:10690-10824 placement
function readServerVerdict(e) {
  let n = serverVerdictSchema().safeParse(e);
  if (!n.success || stampOutcomeKey(n.data) === undefined)
    return {
      kind: "unreadable",
    };
  return {
    kind: "stamp",
    stamp: n.data,
  };
}
//@ chunk-g54kbxqw.js:10824-10960 placement
function serverVerdictKind(serverVerdict) {
  switch (serverVerdict.kind) {
    case "absent":
    case "unmarked":
    case "unreadable":
      return serverVerdict.kind;
    case "stamp":
      return stampOutcomeKey(serverVerdict.stamp) ?? "unreadable";
  }
}
//@ chunk-g54kbxqw.js:10960-11123 placement
function stampOutcomeKey({ status, outcome }) {
  if (status === "none" || status === "id_split") return outcome === undefined ? status : undefined;
  if (outcome === undefined) return status === "mismatch" ? "mismatch" : undefined;
  return `${status}_${outcome}`;
}
//@ chunk-s61vbvea.js:588744-588836 placement
var CONFIRM_REPOSITORY_TRUST = "confirm_repository_trust";
var REQUEST_COMPUTER_FOLDER = "request_computer_folder";
var LIST_COMPUTER_FOLDERS = "list_computer_folders";
//@ chunk-s61vbvea.js:588836-588883 placement = getMcpPrefix (1)
function getMcpPrefix(e, n) {
  return e === `mcp__${CLAUDE_CODE_REMOTE}__${n}`;
}
//@ chunk-s61vbvea.js:588883-588915 placement
/**
 * 导出函数 `isConfirmRepositoryTrustTool`：参数 e，返回 getMcpPrefix(e, CONFIRM_REPOSITORY_TRUST)。
 */
function isConfirmRepositoryTrustTool(toolName) {
  return getMcpPrefix(toolName, CONFIRM_REPOSITORY_TRUST);
}
//@ chunk-s61vbvea.js:588915-588947 placement
/**
 * 导出函数 `isRequestComputerFolderTool`：参数 e，返回 getMcpPrefix(e, REQUEST_COMPUTER_FOLDER)。
 */
function isRequestComputerFolderTool(toolName) {
  return getMcpPrefix(toolName, REQUEST_COMPUTER_FOLDER);
}
//@ chunk-s61vbvea.js:588947-588980 placement
/**
 * 导出函数 `isListComputerFoldersTool`：参数 e，返回 getMcpPrefix(e, LIST_COMPUTER_FOLDERS)。
 */
function isListComputerFoldersTool(e) {
  return getMcpPrefix(e, LIST_COMPUTER_FOLDERS);
}
//@ chunk-s61vbvea.js:588980-589408 placement
/**
 * 把服务端工具权限请求转换为 can_use_tool 控制请求，只带上存在的可选字段。
 */
function toCanUseToolRequest(e) {
  return {
    subtype: e.subtype,
    tool_name: e.tool_name,
    input: e.input,
    tool_use_id: e.tool_use_id,
    ...(e.mcp_server !== undefined && {
      mcp_server: e.mcp_server,
    }),
    ...(e.title !== undefined && {
      title: e.title,
    }),
    ...(e.display_name !== undefined && {
      display_name: e.display_name,
    }),
    ...(e.description !== undefined && {
      description: e.description,
    }),
    ...(e.agent_id !== undefined && {
      agent_id: e.agent_id,
    }),
    suppress_always_allow_rule: true,
    default_to_no: true,
    requires_user_interaction: true,
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
//@ chunk-s61vbvea.js:589569-589975 placement
/**
 * 把权限请求转换为可服务端处理的权限请求对象，只带上存在的可选字段。
 */
function toServedPermissionRequest(e) {
  return {
    subtype: e.subtype,
    tool_name: e.tool_name,
    input: e.input,
    tool_use_id: e.tool_use_id,
    ...(e.mcp_server !== undefined && {
      mcp_server: e.mcp_server,
    }),
    ...(e.agent_id !== undefined && {
      agent_id: e.agent_id,
    }),
    ...(e.server_prompt !== undefined && {
      server_prompt: e.server_prompt,
    }),
    ...(e.computer_folder !== undefined && {
      computer_folder: e.computer_folder,
    }),
    default_to_no: true,
    suppress_always_allow_rule: true,
    requires_user_interaction: true,
  };
}
export {
  REMOTE_TOOL_PROTOCOL_VERSION,
  unexpectedValueFingerprint,
  isConfirmRepositoryTrustTool,
  isRequestComputerFolderTool,
  isComputerFolderTarget,
  toCanUseToolRequest,
  toServedPermissionRequest,
  identityMap,
  SLEEPING_GRACE_MS,
  LIVENESS_PROBE_TIMEOUT_MS,
  detectTerminal,
  isRanOutcome,
  RAN_OUTCOME_KINDS,
  TOOL_HOST_ID_RE,
  MAX_INVENTORY_TOOLS,
  MAX_INVENTORY_JSON_BYTES,
  CAPABILITY_NAME_RE,
  MAX_CAPABILITIES,
  CURRENT_PROTOCOL_VERSION,
  RELEASED,
  serverVerdictKind,
  MAX_NONNEGATIVE_INT,
  DEFAULT_SERVING_LIMITS,
  outputTruncatedNote,
  SPILLEDOUTPUTBYTES,
  SUPPORTED_PROTOCOL_VERSIONS,
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
  MAX_INT32,
  SERVING_LIMIT_BOUNDS,
  REMOTE_TOOL_REFUSAL_CODES,
  WITHDRAW_REASON_CODES,
  REMOTE_TOOL_ERROR_CODES,
  ERROR_OUTCOME_CODES,
  SERVER_VERDICT_KEY,
  readServerVerdict,
  MACHINE_PRESENCE_STATES,
  STILL_HERE,
  STILL_HERE_TEXT,
  LIST_COMPUTER_FOLDERS,
  REQUEST_COMPUTER_FOLDER,
  isListComputerFoldersTool,
  parseLeftState,
};
