/**
 * remote/tools/protocolConstants.ts
 *
 * 2.1.316 新增：远程工具协议常量（结果表、拒绝码、错误码、服务限额）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (8), chunk-k0v80sg8.js (30)
 * attribution: placement 32, layout 6
 */
import { baseIterateeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { import_baseForOwn } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { assignValueRaw } from "../../utils/git/gitSafeEnv.js";
import { parseInterfaceVersion, compareInterfaceVersions } from "./protocolNegotiation.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { shortHash } from "../../utils/shortHash.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, literal, _enum, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { CLAUDE_CODE_REMOTE } from "../../services/mcp/ccrMetaMcp.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-k0v80sg8.js:967-1054 placement
function identityMapObject(sourceObject, iteratee) {
  var result = {};
  iteratee = baseIterateeAlias(iteratee, 3);
  import_baseForOwn(sourceObject, function (value, key, object) {
    assignValueRaw(result, iteratee(value, key, object), value);
  });
  return result;
}
//@ chunk-k0v80sg8.js:1054-1064 placement
var identityMap = identityMapObject;
//@ chunk-k0v80sg8.js:1064-1189 layout
function interfaceFitOf(toolHostInterface) {
  if (toolHostInterface === undefined)
    return {
      kind: "none",
    };
  let interfaceVersion = parseInterfaceVersion(toolHostInterface);
  return interfaceVersion === undefined
    ? {
        kind: "unreadable",
      }
    : {
        kind: "stated",
        range: interfaceVersion,
      };
}
//@ chunk-k0v80sg8.js:1189-1222 layout
var DEFAULT_INTERFACE_RANGE = {
  version: 1,
  min_version: 1,
};
//@ chunk-k0v80sg8.js:1222-1283 layout
function compareWithStated(ours, theirs) {
  return compareInterfaceVersions(ours, theirs.kind === "stated" ? theirs.range : DEFAULT_INTERFACE_RANGE);
}
//@ chunk-k0v80sg8.js:1283-1362 layout
function misfitDirection(misfit) {
  return misfit === "self_too_old" ? "computer_too_old" : "session_too_old";
}
//@ chunk-k0v80sg8.js:1362-1417 layout
function misfitOfFit(fit) {
  return fit.kind === "agreed" ? undefined : fit.kind;
}
//@ chunk-k0v80sg8.js:1417-1670 layout
function interfaceTelemetry(stated, fit) {
  return {
    session_interface: fromEnum(stated.kind),
    ...(stated.kind === "stated" && {
      session_interface_version: stated.range.version,
      session_interface_min_version: stated.range.min_version,
    }),
    interface_fit: fromEnum(fit.kind),
    ...(fit.kind === "agreed" && {
      interface_agreed_version: fit.version,
    }),
  };
}
//@ chunk-k0v80sg8.js:1670-1718 placement
/**
 * 远程工具协议版本常量：协议版本 1、受支持版本列表、溢出输出字节字段名 spilledOutputBytes。
 */
var REMOTE_TOOL_PROTOCOL_VERSION = 1;
var SUPPORTED_PROTOCOL_VERSIONS = [1];
var CURRENT_PROTOCOL_VERSION = 1;
var SPILLEDOUTPUTBYTES = "spilledOutputBytes";
//@ chunk-k0v80sg8.js:1718-1770 placement
function outputTruncatedNote(targetName) {
  return `
(output truncated on ${targetName})`;
}
//@ chunk-k0v80sg8.js:1770-2182 placement
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
//@ chunk-k0v80sg8.js:2182-2301 placement
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
//@ chunk-k0v80sg8.js:2301-2329 placement
function leftStateFor(stateCode) {
  return LEFT_STATE_NAMES[stateCode];
}
//@ chunk-k0v80sg8.js:2329-2451 placement
function parseLeftState(capabilities) {
  if (capabilities === undefined) return;
  if (capabilities.includes(LEFT_STATE_NAMES.idle)) return "idle";
  if (capabilities.includes(LEFT_STATE_NAMES.released)) return "released";
  return;
}
//@ chunk-k0v80sg8.js:2451-2523 placement
/**
 * 远程宿主 id 与能力校验：still_here 文案、睡眠/探测时长、能力名正则、能力个数上限。
 */
var STILL_HERE_TEXT = "still_here";
var SLEEPING_GRACE_MS = 1e4;
var LIVENESS_PROBE_TIMEOUT_MS = 2000;
var CAPABILITY_NAME_RE = /^[a-z][a-z0-9_]{0,47}$/;
var MAX_CAPABILITIES = 32;
//@ chunk-k0v80sg8.js:2523-2619 placement
function clampServingLimit(limitKey, pendingAsksMax) {
  if (pendingAsksMax === undefined) return;
  let { min, max } = SERVING_LIMIT_BOUNDS[limitKey];
  return Math.min(Math.max(pendingAsksMax, min), max);
}
//@ chunk-k0v80sg8.js:2619-2712 placement
/**
 * 导出常量或表 `TOOL_HOST_ID_RE`：值为 /^[a-z0-9][a-z0-9+._-]{0,31}(@[0-9][0-9A-Za-z.+_-]{0,23})?$/, xXr = 96, PXr = 1e6, IXr = 2048。
 */
var TOOL_HOST_ID_RE = /^[a-z0-9][a-z0-9+._-]{0,31}(@[0-9][0-9A-Za-z.+_-]{0,23})?$/;
var MAX_INVENTORY_TOOLS = 96;
var MAX_NONNEGATIVE_INT = 1e6;
var MAX_INVENTORY_JSON_BYTES = 2048;
//@ chunk-k0v80sg8.js:2712-2819 placement (2.1.88 match: detectTerminal, 0.92)
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
//@ chunk-k0v80sg8.js:2819-2977 placement (2.1.88 match: EXTERNAL_PERMISSION_MODES, 0.908)
var SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
var SAFE_ID_WITH_BRACKETS_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._[\]-]{0,63}$/;
var PERMISSION_MODE_WIRE_ORDER = ["default", "acceptEdits", "plan", "auto", "bypassPermissions", "dontAsk"];
//@ chunk-k0v80sg8.js:2977-3481 placement
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
//@ chunk-k0v80sg8.js:3481-3611 placement
function normalizeWithdrawReason(reason) {
  return (
    (reason === "displaced" ? "superseded" : reason === "withdrawn" ? "host_withdrawn" : undefined) ??
    WITHDRAW_OR_ANSWER_GONE_REASONS.find((candidate) => candidate === reason) ??
    "unrecognized"
  );
}
//@ chunk-k0v80sg8.js:3611-3954 placement
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
//@ chunk-k0v80sg8.js:3954-4265 placement
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
//@ chunk-k0v80sg8.js:4265-8856 placement
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
//@ chunk-k0v80sg8.js:8856-8928 placement
function isUnverifiedRefusal(outcome) {
  return outcome.kind === "dropped" && outcome.why === "unverified_refusal";
}
//@ chunk-k0v80sg8.js:8928-9108 placement
function unexpectedValueFingerprint(value, listedValues) {
  let text = typeof value === "string" ? value : "";
  if (typeof value === "string" && listedValues.includes(value)) return;
  return {
    length: text.length,
    hash: shortHash(text),
    variantOfListed: listedValues.includes(text.trim().toLowerCase()),
  };
}
//@ chunk-k0v80sg8.js:9108-9366 placement
/**
 * 服务端校验结论（server_verdict）的字段名与 zod schema：匹配状态、是否标记、依据、上下文与年龄。
 */
var SERVER_VERDICT_KEY; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var serverVerdictSchema;
deferInit("chunk-k0v80sg8.js:9108", () => {
  SERVER_VERDICT_KEY = "server_verdict";
  serverVerdictSchema = DoctorLazy(() =>
    objectSchema({
      v: literal(1),
      status: _enum(["matched", "mismatch", "by_id", "id_split", "none"]),
      outcome: _enum(["flagged", "not_flagged", "unavailable"]).optional(),
      by: literal("input").optional(),
      context: literal("container_supplied").optional(),
      age_ms: numberSchema().optional(),
    }),
  );
});
//@ chunk-k0v80sg8.js:9366-9500 placement
function readServerVerdict(payload) {
  let parsed = serverVerdictSchema().safeParse(payload);
  if (!parsed.success || stampOutcomeKey(parsed.data) === undefined)
    return {
      kind: "unreadable",
    };
  return {
    kind: "stamp",
    stamp: parsed.data,
  };
}
//@ chunk-k0v80sg8.js:9500-9636 placement
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
//@ chunk-k0v80sg8.js:9636-9799 placement
function stampOutcomeKey({ status, outcome }) {
  if (status === "none" || status === "id_split") return outcome === undefined ? status : undefined;
  if (outcome === undefined) return status === "mismatch" ? "mismatch" : undefined;
  return `${status}_${outcome}`;
}
//@ chunk-7jxyna5q.js:506106-506198 placement
var CONFIRM_REPOSITORY_TRUST = "confirm_repository_trust";
var REQUEST_COMPUTER_FOLDER = "request_computer_folder";
var LIST_COMPUTER_FOLDERS = "list_computer_folders";
//@ chunk-7jxyna5q.js:506198-506245 placement (2.1.88 match: getMcpPrefix, 1)
function getMcpPrefix(actualToolName, expectedToolName) {
  return actualToolName === `mcp__${CLAUDE_CODE_REMOTE}__${expectedToolName}`;
}
//@ chunk-7jxyna5q.js:506245-506277 placement
/**
 * 导出函数 `isConfirmRepositoryTrustTool`：参数 e，返回 getMcpPrefix(e, CONFIRM_REPOSITORY_TRUST)。
 */
function isConfirmRepositoryTrustTool(toolName) {
  return getMcpPrefix(toolName, CONFIRM_REPOSITORY_TRUST);
}
//@ chunk-7jxyna5q.js:506277-506309 placement
/**
 * 导出函数 `isRequestComputerFolderTool`：参数 e，返回 getMcpPrefix(e, REQUEST_COMPUTER_FOLDER)。
 */
function isRequestComputerFolderTool(actualToolName) {
  return getMcpPrefix(actualToolName, REQUEST_COMPUTER_FOLDER);
}
//@ chunk-7jxyna5q.js:506309-506342 placement
/**
 * 导出函数 `isListComputerFoldersTool`：参数 e，返回 getMcpPrefix(e, LIST_COMPUTER_FOLDERS)。
 */
function isListComputerFoldersTool(toolName) {
  return getMcpPrefix(toolName, LIST_COMPUTER_FOLDERS);
}
//@ chunk-7jxyna5q.js:506342-506770 placement
/**
 * 把服务端工具权限请求转换为 can_use_tool 控制请求，只带上存在的可选字段。
 */
function toCanUseToolRequest(request) {
  return {
    subtype: request.subtype,
    tool_name: request.tool_name,
    input: request.input,
    tool_use_id: request.tool_use_id,
    ...(request.mcp_server !== undefined && {
      mcp_server: request.mcp_server,
    }),
    ...(request.title !== undefined && {
      title: request.title,
    }),
    ...(request.display_name !== undefined && {
      display_name: request.display_name,
    }),
    ...(request.description !== undefined && {
      description: request.description,
    }),
    ...(request.agent_id !== undefined && {
      agent_id: request.agent_id,
    }),
    suppress_always_allow_rule: true,
    default_to_no: true,
    requires_user_interaction: true,
  };
}
//@ chunk-7jxyna5q.js:506770-506931 placement
function isComputerFolderTarget(target) {
  return (
    Object.keys(target).length === 3 &&
    ["environment_id", "computer_name", "folder"].every((key) => {
      let value = target[key];
      return typeof value === "string" && value.trim() !== "";
    })
  );
}
//@ chunk-7jxyna5q.js:506931-507337 placement
/**
 * 把权限请求转换为可服务端处理的权限请求对象，只带上存在的可选字段。
 */
function toServedPermissionRequest(request) {
  return {
    subtype: request.subtype,
    tool_name: request.tool_name,
    input: request.input,
    tool_use_id: request.tool_use_id,
    ...(request.mcp_server !== undefined && {
      mcp_server: request.mcp_server,
    }),
    ...(request.agent_id !== undefined && {
      agent_id: request.agent_id,
    }),
    ...(request.server_prompt !== undefined && {
      server_prompt: request.server_prompt,
    }),
    ...(request.computer_folder !== undefined && {
      computer_folder: request.computer_folder,
    }),
    default_to_no: true,
    suppress_always_allow_rule: true,
    requires_user_interaction: true,
  };
}
export {
  isConfirmRepositoryTrustTool,
  isRequestComputerFolderTool,
  identityMap,
  REMOTE_TOOL_PROTOCOL_VERSION,
  MAX_INT32,
  RELEASED,
  isRanOutcome,
  REMOTE_TOOL_SERVING_LIMITS,
  normalizeWithdrawReason,
  STILL_HERE,
  MACHINE_PRESENCE_STATES,
  SAYS_STILL_HERE,
  STILL_HERE_TEXT,
  interfaceFitOf,
  leftStateFor,
  SAFE_ID_PATTERN,
  SERVER_VERDICT_KEY,
  compareWithStated,
  misfitOfFit,
  interfaceTelemetry,
  misfitDirection,
  LIVENESS_PROBE_TIMEOUT_MS,
  SERVING_LIMIT_BOUNDS,
  DEFAULT_SERVING_LIMITS,
  isUnverifiedRefusal,
  SPILLEDOUTPUTBYTES,
  LIST_COMPUTER_FOLDERS,
  REQUEST_COMPUTER_FOLDER,
  isListComputerFoldersTool,
  RAN_OUTCOME_KINDS,
  TOOL_HOST_ID_RE,
  MAX_INVENTORY_TOOLS,
  MAX_INVENTORY_JSON_BYTES,
  CAPABILITY_NAME_RE,
  MAX_CAPABILITIES,
  CURRENT_PROTOCOL_VERSION,
  REMOTE_TOOL_REFUSAL_CODES,
  ERROR_OUTCOME_CODES,
  WITHDRAW_REASON_CODES,
  parseLeftState,
  SLEEPING_GRACE_MS,
  SUPPORTED_PROTOCOL_VERSIONS,
  serverVerdictKind,
  isComputerFolderTarget,
  toCanUseToolRequest,
  toServedPermissionRequest,
  unexpectedValueFingerprint,
  PERMISSION_MODE_WIRE_ORDER,
  SAFE_ID_WITH_BRACKETS_PATTERN,
  MAX_NONNEGATIVE_INT,
  REMOTE_TOOL_ERROR_CODES,
  readServerVerdict,
  outputTruncatedNote,
  detectTerminal,
  SERVED_OUTCOME_TABLE,
  clampServingLimit,
};
