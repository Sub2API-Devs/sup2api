/**
 * remote/tools/protocolSchemas.ts
 *
 * 2.1.316 新增：远程工具协议的请求/结果信封结构与解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (41)
 * attribution: placement 41
 */
import {
  HOST_TOOL_INPUT_FIELD,
  MACHINE_SLUG_PATTERN,
  isReservedMachineNameExact,
} from "../../bridge/deviceRegistration.js";
import {
  isPlainRecord,
  clampToMaxPageSize,
  asPlainRecord,
  hasDifferentProtocolVersion,
  byteLengthOf,
  sanitizeRemoteToolEnvelope,
} from "./callResults.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { stripControlChars_2, stripControlChars } from "../../utils/stripControlChars.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  string,
  u,
  literal,
  _enum,
  M,
  E,
  record,
  unknown,
  array,
  discriminatedUnion,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  SAFE_ID_PATTERN,
  REMOTE_TOOL_PROTOCOL_VERSION,
  PERMISSION_MODE_WIRE_ORDER,
  SAFE_ID_WITH_BRACKETS_PATTERN,
  MAX_INT32,
  SERVING_LIMIT_BOUNDS,
  MAX_NONNEGATIVE_INT,
  RAN_OUTCOME_KINDS,
  REMOTE_TOOL_REFUSAL_CODES,
  WITHDRAW_REASON_CODES,
  REMOTE_TOOL_ERROR_CODES,
  ERROR_OUTCOME_CODES,
  unexpectedValueFingerprint,
  SUPPORTED_PROTOCOL_VERSIONS,
  SERVER_VERDICT_KEY,
  readServerVerdict,
  CURRENT_PROTOCOL_VERSION,
  identityMap,
} from "./protocolConstants.js";
import { toolHostInterfaceSchema, MINIMAL_INTERFACE_VERSION } from "./protocolNegotiation.js";
import { Eo, ri, ti, ni, No_g54k, ei } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { DEFAULTS_PLACEHOLDER } from "../../utils/permissions/autoModeRulesPrompt.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-g54kbxqw.js:13342-13632 placement
/**
 * remote_tool_call 元数据键与别名：__remote_tool_call、协议标签 2.1、caller 字段集合，以及 anthropic/remoteToolExecution 等类型名和若干大小上限。
 */
var REMOTE_TOOL_CALL_META = "__remote_tool_call";
var REMOTE_TOOL_PROTOCOL_LABEL = "2.1";
var BASE_CALLER_FIELDS = ["session_id", "trigger_id", "ccr_card_approval"];
var CALLER_FIELDS = [...BASE_CALLER_FIELDS, "device", HOST_TOOL_INPUT_FIELD, REMOTE_TOOL_CALL_META];
var ANTHROPIC_REMOTETOOLEXECUTION = "anthropic/remoteToolExecution";
var CLAUDECODE_REMOTETOOLCALL = "claudecode/remoteToolCall";
var CLAUDECODE_TOOLUSEID = "claudecode/toolUseId";
var MAX_CALLER_BLOB_BYTES = 8192;
var MAX_CALLER_BLOB_DEPTH = 6;
var MAX_MESSAGE_CHARS = 8192;
var MAX_ACCEPT_NOTES = 32;
var MAX_TEXT_BYTES = 8192;
var MAX_REFUSAL_NOTES = 4;
var MAX_LIST_FIELD_LENGTH = 1024;
var SENDER_BELOW_FLOOR = "sender_below_floor";
//@ chunk-g54kbxqw.js:13632-13674 placement
function isRemoteToolCallMeta(e) {
  return isPlainRecord(e) && e[SENDER_BELOW_FLOOR] === true;
}
//@ chunk-g54kbxqw.js:13674-14030 placement
/**
 * 远程调用结果的大小限额与各工具保留字段：行数/行长/结果字节等上限，以及 Bash、PowerShell、Edit、Write 工具允许透传的结果字段。
 */
var REMOTE_TOOL_LIMITS = 300;
var MAX_TRUNCATED_LINES = 64;
var MAX_TAIL_LINES = 16;
var MAX_LINE_CHARS = 200;
var MAX_RESULT_BYTES = 4063232;
var KEPT_RESULT_FIELDS_BY_TOOL = new Map([
  [BASH_TOOL_NAME, new Set(["stdout", "stderr", "interrupted", "timedOutAfterMs", "noOutputExpected"])],
  [POWERSHELL_TOOL_NAME, new Set(["stdout", "stderr", "interrupted", "timedOutAfterMs"])],
  [FILE_EDIT_TOOL_NAME, new Set(["structuredPatch", "staged", "stagedWording"])],
  [FILE_WRITE_TOOL_NAME, new Set(["type", "structuredPatch", "staged", "stagedWording"])],
]);
var MAX_PERMISSION_UPDATES = 32;
var MAX_SUGGESTIONS = 16;
var MAX_SUGGESTION_CHARS = 256;
//@ chunk-g54kbxqw.js:14030-14106 placement
function clipText(e, n = MAX_MESSAGE_CHARS) {
  let s = stripControlChars_2(e);
  return s.length <= n ? s : `${truncateToLength(s, n - 1)}\u2026`;
}
//@ chunk-g54kbxqw.js:14106-14158 placement
/**
 * 远程工具字段限额：工具名 64、工作目录 1024、id 形态 8–64 位、工具名长度 128。
 */
var REMOTE_TOOL_FIELD_LIMITS = 64;
var MAX_WORKING_DIR_CHARS = 1024;
var SAFE_ID_WITH_DASH_RE = /^[A-Za-z0-9_-]{8,64}$/;
var MAX_TOOL_NAME_CHARS = 128;
//@ chunk-g54kbxqw.js:14158-14233 placement
function clipTarget(target) {
  return {
    name: clipText(target.name, REMOTE_TOOL_FIELD_LIMITS),
    working_dir: clipText(target.working_dir, MAX_WORKING_DIR_CHARS),
  };
}
//@ chunk-g54kbxqw.js:14233-15279 placement
/**
 * 远程工具（remote tools）协议的 zod 模式：调用信封、目标、caller、协议版本等。
 */
var REMOTE_TOOL_SCHEMAS = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,255}$/;
var callIdSchema = DoctorLazy(() => string().regex(REMOTE_TOOL_SCHEMAS));
var optionalSafeIdSchema = DoctorLazy(() => string().regex(SAFE_ID_PATTERN).optional().catch(undefined));
var callRequestSchema = DoctorLazy(() =>
  u({
    v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
    op: literal("call").optional(),
    call_id: callIdSchema(),
    caller: u({
      kind: _enum(["ccr_container", "local_process"]),
      permission_mode: _enum(PERMISSION_MODE_WIRE_ORDER).optional(),
      is_bypass_available: M().optional(),
      instance_id: optionalSafeIdSchema(),
      model: string().regex(SAFE_ID_WITH_BRACKETS_PATTERN).optional().catch(undefined),
      conversation_id: optionalSafeIdSchema(),
      compaction_id: optionalSafeIdSchema(),
      tool_host_interface: toolHostInterfaceSchema().optional().catch(undefined),
    }).transform(dropUndefined),
    expires_in_ms: E().int().positive(),
    approval: u({
      ask_id: askIdSchema(),
      decision: _enum(["allow", "deny"]),
      updated_input: record(string(), unknown()).optional(),
      feedback: string().max(MAX_MESSAGE_CHARS).optional(),
      permission_updates: array(unknown()).max(MAX_PERMISSION_UPDATES).optional(),
      attested: M().optional(),
    }).optional(),
    read_baseline: u({
      sha256: string().regex(/^[0-9a-f]{64}$/),
      bytes: E().int().nonnegative().max(1073741824),
    })
      .optional()
      .catch(undefined),
  }),
);
var askIdSchema = DoctorLazy(() => string().regex(REMOTE_TOOL_SCHEMAS));
var hostEpochSchema = DoctorLazy(() => string().regex(REMOTE_TOOL_SCHEMAS));
var MAX_SINCE_MS = 8640000000000000;
var callOutcomeSchema = () => ({
  replayed: M().optional(),
  served_at: E().int().nonnegative().max(MAX_SINCE_MS).optional(),
});
var servedResponseSchema = DoctorLazy(() =>
  u({
    v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
    op: literal("outcome_of"),
    call_id: callIdSchema(),
  }),
);
//@ chunk-g54kbxqw.js:15279-15398 placement
function optionalBoundedIntSchema(min = 1) {
  return unknown()
    .transform((n) =>
      typeof n === "number" && Number.isInteger(n) && n >= min && n <= MAX_INT32 ? n : undefined,
    )
    .optional();
}
//@ chunk-g54kbxqw.js:15398-15760 placement
var SERVING_LIMITS_SCHEMA = DoctorLazy(() =>
  u({
    max_call_ms: E().int().positive(),
    max_command_ms: optionalBoundedIntSchema(),
    max_request_bytes: E().int().positive(),
    max_in_flight: E().int().positive(),
    caller_sessions_max: optionalBoundedIntSchema(),
    pending_asks_max: optionalBoundedIntSchema(),
    progress_interval_ms: optionalBoundedIntSchema(),
    progress_misses: optionalBoundedIntSchema(),
    reconcile_ms: optionalBoundedIntSchema(),
    max_queue_ms: optionalBoundedIntSchema(SERVING_LIMIT_BOUNDS.max_queue_ms.min),
    queue_depth: optionalBoundedIntSchema(SERVING_LIMIT_BOUNDS.queue_depth.min),
    max_ask_ms: optionalBoundedIntSchema(),
  }).transform(dropUndefined),
);
//@ chunk-g54kbxqw.js:15760-15854 placement
function dropUndefined(e) {
  let n = {
    ...e,
  };
  for (let key of Object.keys(n)) if (n[key] === undefined) delete n[key];
  return n;
}
//@ chunk-g54kbxqw.js:15854-15966 placement
/**
 * 工具名 schema：匹配安全名字正则并排除危险名；另定义统一的 name/working_dir 目标 schema。
 */
var SAFE_NAME_SCHEMA = DoctorLazy(() =>
  string()
    .regex(MACHINE_SLUG_PATTERN)
    .refine((e) => !isReservedMachineNameExact(e)),
);
var callTargetSchema = DoctorLazy(() =>
  u({
    name: string().min(1).max(REMOTE_TOOL_FIELD_LIMITS),
    working_dir: string().max(MAX_WORKING_DIR_CHARS),
  }),
);
//@ chunk-g54kbxqw.js:15966-16031 placement
function optionalByteCount() {
  return E().int().nonnegative().max(MAX_NONNEGATIVE_INT).optional();
}
//@ chunk-g54kbxqw.js:18433-18557 placement
function optionalStringListSchema(e) {
  return unknown()
    .transform((n) => (Array.isArray(n) ? n.filter((s) => typeof s === "string").slice(0, e) : undefined))
    .optional();
}
//@ chunk-g54kbxqw.js:18557-18596 placement
var acceptNotesSchema = DoctorLazy(() => optionalStringListSchema(MAX_ACCEPT_NOTES));
var refusalNotesSchema = DoctorLazy(() => optionalStringListSchema(MAX_REFUSAL_NOTES));
//@ chunk-g54kbxqw.js:18596-18677 placement
function codeEnumSchema(e) {
  return string()
    .max(64)
    .transform((n) => (e.includes(n) ? n : "unrecognized"));
}
//@ chunk-g54kbxqw.js:18677-18847 placement
function optionalEnumOrUnrecognizedSchema(e, n = "dropped") {
  return unknown()
    .transform((s) =>
      typeof s === "string"
        ? e.includes(s)
          ? s
          : "unrecognized"
        : n === "unrecognized" && s !== undefined
          ? "unrecognized"
          : undefined,
    )
    .optional();
}
//@ chunk-g54kbxqw.js:18847-20540 placement
var CALL_RESULT_ENVELOPE_SCHEMA = DoctorLazy(() =>
  discriminatedUnion("outcome", [
    u({
      v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
      outcome: literal("completed"),
      call_id: callIdSchema().optional(),
      target: callTargetSchema(),
      is_error: M(),
      content: Eo(),
      documents: ri().optional(),
      output: unknown().optional(),
      truncated: M().optional(),
      disposition: optionalEnumOrUnrecognizedSchema(RAN_OUTCOME_KINDS, "unrecognized"),
      notes: acceptNotesSchema(),
      ...callOutcomeSchema(),
    }),
    u({
      v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
      outcome: literal("refused"),
      call_id: callIdSchema().optional(),
      target: callTargetSchema(),
      code: codeEnumSchema(REMOTE_TOOL_REFUSAL_CODES),
      reason: optionalEnumOrUnrecognizedSchema(WITHDRAW_REASON_CODES),
      limit: optionalEnumOrUnrecognizedSchema(REMOTE_TOOL_ERROR_CODES),
      message: string().max(MAX_MESSAGE_CHARS),
      host_epoch: hostEpochSchema().optional(),
      notes: acceptNotesSchema(),
      ...callOutcomeSchema(),
    }),
    u({
      v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
      outcome: literal("failed"),
      call_id: callIdSchema().optional(),
      target: callTargetSchema(),
      code: codeEnumSchema(ERROR_OUTCOME_CODES),
      message: string().max(MAX_MESSAGE_CHARS),
      content: Eo().optional(),
      output: unknown().optional(),
      truncated: M().optional(),
      notes: acceptNotesSchema(),
      ...callOutcomeSchema(),
    }),
    u({
      v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
      outcome: literal("in_progress"),
      call_id: callIdSchema().optional(),
      target: callTargetSchema(),
      state: _enum(["admitting", "running", "awaiting_approval"]),
      since_ms: E().int().nonnegative().max(MAX_SINCE_MS),
      host_epoch: hostEpochSchema().optional(),
      output_tail: u({
        text: string().refine((e) => Buffer.byteLength(e) <= MAX_TEXT_BYTES),
        truncated_head: M(),
        total_bytes: E().int().nonnegative(),
      })
        .optional()
        .catch(undefined),
    }),
    u({
      v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
      outcome: literal("needs_approval"),
      call_id: callIdSchema().optional(),
      target: callTargetSchema(),
      ask_id: askIdSchema(),
      tool: string().min(1).max(MAX_TOOL_NAME_CHARS),
      input: record(string(), unknown()),
      message: string().max(MAX_MESSAGE_CHARS),
      decision_reason: string().max(MAX_MESSAGE_CHARS).optional(),
      suggestions: array(string().max(MAX_SUGGESTION_CHARS)).max(MAX_SUGGESTIONS).optional(),
      classifier_eligible: M().optional(),
      prior_answer_ok: M().optional(),
      auto_mode: ti()
        .optional()
        .catch(() => {
          logForDebugging(
            "[remote-tools] dropped an unreadable auto_mode block from a needs_approval answer; the ask is judged without it",
          );
          return;
        }),
      elicitation: ni()
        .optional()
        .catch(() => {
          logForDebugging(
            "[remote-tools] dropped an unreadable elicitation block from a needs_approval answer; its own fields stand",
          );
          return;
        }),
      notes: refusalNotesSchema(),
    }),
    u({
      v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
      outcome: literal("acknowledged"),
      call_id: callIdSchema().optional(),
      target: callTargetSchema(),
      ask_id: askIdSchema(),
    }),
  ]),
);
//@ chunk-g54kbxqw.js:20540-21094 placement
function buildRemoteToolCallMeta({
  callId,
  expiresInMs,
  permissionMode,
  isBypassAvailable,
  callerInstanceId,
  model,
  conversationId,
  compactionId,
  approval,
  readBaseline,
}) {
  return {
    v: REMOTE_TOOL_PROTOCOL_VERSION,
    call_id: callId,
    caller: {
      kind: env.CLAUDE_CODE_REMOTE ? "ccr_container" : "local_process",
      tool_host_interface: MINIMAL_INTERFACE_VERSION,
      ...(permissionMode !== undefined && {
        permission_mode: permissionMode,
      }),
      ...(isBypassAvailable !== undefined && {
        is_bypass_available: isBypassAvailable,
      }),
      ...(callerInstanceId !== undefined && {
        instance_id: callerInstanceId,
      }),
      ...modelFieldForEnvelope(model),
      ...(conversationId !== undefined && {
        conversation_id: conversationId,
      }),
      ...(compactionId !== undefined && {
        compaction_id: compactionId,
      }),
    },
    expires_in_ms: clampToMaxPageSize(expiresInMs),
    ...(approval !== undefined && {
      approval: sanitizeApprovalForWire(approval),
    }),
    ...(readBaseline !== undefined &&
      approval === undefined && {
        read_baseline: readBaseline,
      }),
  };
}
//@ chunk-g54kbxqw.js:21094-21336 placement
function modelFieldForEnvelope(model) {
  if (model === undefined) return {};
  if (SAFE_ID_WITH_BRACKETS_PATTERN.test(model))
    return {
      model,
    };
  logForDebugging(
    `remote tools: this session's model id is not one the call envelope can carry; the serving machine will not key its model safeguards on it (length ${model.length})`,
  );
  return {};
}
//@ chunk-g54kbxqw.js:21336-21502 placement
function sanitizeApprovalForWire(approval) {
  let { attested, feedback, permission_updates: permissionUpdates, ...h } = approval;
  return {
    ...h,
    ...(feedback !== undefined && {
      feedback: clipText(feedback),
    }),
    ...(permissionUpdates !== undefined && {
      permission_updates: permissionUpdates.slice(0, MAX_PERMISSION_UPDATES),
    }),
  };
}
//@ chunk-g54kbxqw.js:21502-21612 placement
function wirePermissionMode(mode) {
  switch (mode) {
    case "bubble":
      return "default";
    case "bypassPermissions":
      return "auto";
    default:
      return mode;
  }
}
//@ chunk-g54kbxqw.js:21612-21641 placement
var UNEXPECTED_VALUE_FIELDS = ["call", "outcome_of"];
//@ chunk-g54kbxqw.js:21641-22035 placement
function parseRemoteToolRequest(e) {
  let op = asPlainRecord(e)?.op;
  if (op !== "outcome_of") {
    let callEnvelope = parseCallEnvelope(e);
    if (callEnvelope.ok)
      return {
        ...callEnvelope,
        kind: "call",
      };
    let h =
      callEnvelope.why === "malformed" && op !== undefined
        ? unexpectedValueFingerprint(op, UNEXPECTED_VALUE_FIELDS)
        : undefined;
    return h === undefined
      ? callEnvelope
      : {
          ...callEnvelope,
          unlistedOp: h,
        };
  }
  if (hasDifferentProtocolVersion(e))
    return {
      ok: false,
      why: "unsupported_protocol",
    };
  let s = servedResponseSchema().safeParse(e);
  return s.success
    ? {
        ok: true,
        kind: "outcome_query",
        value: {
          v: s.data.v,
          op: "outcome_of",
          call_id: s.data.call_id,
        },
      }
    : {
        ok: false,
        why: "malformed",
      };
}
//@ chunk-g54kbxqw.js:22035-22123 placement
function outcomeQueryEnvelope(callId) {
  return {
    v: REMOTE_TOOL_PROTOCOL_VERSION,
    op: "outcome_of",
    call_id: callId,
    caller: {
      tool_host_interface: MINIMAL_INTERFACE_VERSION,
    },
  };
}
//@ chunk-g54kbxqw.js:22123-22132 placement
var MIN_COMPATIBLE_VERSION = 1;
//@ chunk-g54kbxqw.js:22132-22336 placement
function negotiateProtocol(e) {
  if (e === undefined)
    return {
      kind: "compatible",
      version: MIN_COMPATIBLE_VERSION,
    };
  let filtered = e.filter((s) => SUPPORTED_PROTOCOL_VERSIONS.includes(s));
  return filtered.length > 0
    ? {
        kind: "compatible",
        version: Math.max(...filtered),
      }
    : {
        kind: "incompatible",
        announced: [...e],
      };
}
//@ chunk-g54kbxqw.js:22336-22474 placement
function encodeCallArgs(e) {
  let n =
    "approval" in e && e.approval !== undefined
      ? {
          ...e,
          elicit_result: approvalToElicitResult(e.approval),
        }
      : {
          ...e,
        };
  return withinDepth(n, MAX_CALLER_BLOB_DEPTH) && byteLengthOf(n) <= MAX_CALLER_BLOB_BYTES ? n : undefined;
}
//@ chunk-g54kbxqw.js:22474-22494 placement
var WITHDRAWN = "withdrawn";
//@ chunk-g54kbxqw.js:22494-22713 placement
function approvalToElicitResult(approval) {
  let _meta = {
    [ANTHROPIC_REMOTETOOLEXECUTION]: {
      ask_id: approval.ask_id,
    },
  };
  return approval.decision === "deny" && approval.feedback === WITHDRAWN
    ? {
        action: "cancel",
        _meta,
      }
    : {
        action: "accept",
        content: {
          decision: approval.decision,
          ...(approval.feedback !== undefined && {
            feedback: approval.feedback,
          }),
        },
        _meta,
      };
}
//@ chunk-g54kbxqw.js:22713-22847 placement
function withinDepth(e, n) {
  let s = Array.isArray(e) ? e : isPlainRecord(e) ? Object.values(e) : undefined;
  if (s === undefined) return true;
  return n >= 1 && s.every((r) => withinDepth(r, n - 1));
}
//@ chunk-g54kbxqw.js:22847-23237 placement
function parseCallEnvelope(e) {
  if (e === undefined || e === null)
    return {
      ok: false,
      why: "missing",
    };
  if (hasDifferentProtocolVersion(e))
    return {
      ok: false,
      why: "unsupported_protocol",
    };
  let n = callRequestSchema().safeParse(e);
  if (!n.success)
    return {
      ok: false,
      why: "malformed",
    };
  let { approval } = n.data;
  let r = asPlainRecord(asPlainRecord(e)?.caller);
  return {
    ok: true,
    value:
      approval?.feedback === undefined
        ? n.data
        : {
            ...n.data,
            approval: {
              ...approval,
              feedback: clipText(approval.feedback),
            },
          },
    ...(r !== undefined &&
      Object.hasOwn(r, SERVER_VERDICT_KEY) && {
        serverVerdict: readServerVerdict(r[SERVER_VERDICT_KEY]),
      }),
  };
}
//@ chunk-g54kbxqw.js:23237-23300 placement
function autoModeField(autoMode) {
  let n = autoModeRulesForWire(autoMode);
  return n === undefined
    ? {}
    : {
        auto_mode: n,
      };
}
//@ chunk-g54kbxqw.js:23300-23764 placement
function autoModeRulesForWire(e) {
  if (e === undefined) return;
  let n = (k, C) => {
    let filtered = (k ?? [])
      .flatMap((w) => w.split(/\r?\n/))
      .map((w) => clipText(w.replace(/\s+/g, " "), MAX_LINE_CHARS).trim())
      .filter((w) => w.length > 0 && w !== DEFAULTS_PLACEHOLDER);
    let S = C === "last" ? filtered.slice(-MAX_TAIL_LINES) : filtered.slice(0, MAX_TAIL_LINES);
    return S.length > 0 ? S : undefined;
  };
  let s = n(e.allow, "first");
  let r = n(e.soft_deny, "last");
  let h = n(e.hard_deny, "last");
  let y = n(e.environment, "first");
  return [s, r, h, y].some((k) => k !== undefined)
    ? {
        ...(s && {
          allow: s,
        }),
        ...(r && {
          soft_deny: r,
        }),
        ...(h && {
          hard_deny: h,
        }),
        ...(y && {
          environment: y,
        }),
      }
    : undefined;
}
//@ chunk-g54kbxqw.js:23764-23835 placement
function parseAnnounce(epoch) {
  let n = hostEpochSchema().safeParse(epoch);
  return n.success ? n.data : undefined;
}
//@ chunk-g54kbxqw.js:23835-23909 placement
function parseAdvert(e) {
  let n = No_g54k().safeParse(e);
  return n.success ? sanitizeDeep(n.data) : undefined;
}
//@ chunk-g54kbxqw.js:23909-24002 placement
function intList(protocolVersions) {
  return Array.isArray(protocolVersions) &&
    protocolVersions.length <= 64 &&
    protocolVersions.every((n) => Number.isInteger(n))
    ? protocolVersions
    : [];
}
//@ chunk-g54kbxqw.js:24002-24151 placement
function peerProtocolVersions(e) {
  if (e === undefined) return;
  let n = asPlainRecord(e);
  if (n === undefined) return [];
  if (n.v === CURRENT_PROTOCOL_VERSION) return;
  return "protocol_versions" in n ? intList(n.protocol_versions) : [];
}
//@ chunk-g54kbxqw.js:24151-24264 placement
function advertisedProtocolVersions(e) {
  let n = asPlainRecord(e);
  return n !== undefined && n.v === CURRENT_PROTOCOL_VERSION && "protocol_versions" in n
    ? intList(n.protocol_versions)
    : undefined;
}
//@ chunk-g54kbxqw.js:24264-24338 placement
function parseRegistration(e) {
  let n = ei().safeParse(e);
  return n.success ? sanitizeDeep(n.data) : undefined;
}
//@ chunk-g54kbxqw.js:24338-24497 placement
function sanitizeDeep(e) {
  if (typeof e === "string") return stripControlChars(e);
  if (Array.isArray(e)) return e.map(sanitizeDeep);
  if (e !== null && typeof e === "object")
    return xr(
      identityMap(e, (n, s) => sanitizeDeep(s)),
      sanitizeDeep,
    );
  return e;
}
//@ chunk-g54kbxqw.js:24497-24571 placement
function parseResultEnvelope(e) {
  let n = CALL_RESULT_ENVELOPE_SCHEMA().safeParse(e);
  return n.success ? sanitizeRemoteToolEnvelope(n.data) : undefined;
}
export {
  REMOTE_TOOL_CALL_META,
  parseRemoteToolRequest,
  encodeCallArgs,
  CLAUDECODE_TOOLUSEID,
  CLAUDECODE_REMOTETOOLCALL,
  ANTHROPIC_REMOTETOOLEXECUTION,
  peerProtocolVersions,
  advertisedProtocolVersions,
  negotiateProtocol,
  parseRegistration,
  isRemoteToolCallMeta,
  SENDER_BELOW_FLOOR,
  parseAnnounce,
  optionalByteCount,
  SAFE_NAME_SCHEMA,
  MAX_TRUNCATED_LINES,
  SERVING_LIMITS_SCHEMA,
  REMOTE_TOOL_LIMITS,
  hostEpochSchema,
  SAFE_ID_WITH_DASH_RE,
  dropUndefined,
  intList,
  MAX_LINE_CHARS,
  MAX_TAIL_LINES,
  MAX_MESSAGE_CHARS,
  askIdSchema,
  callIdSchema,
  clipText,
  autoModeRulesForWire,
  REMOTE_TOOL_PROTOCOL_LABEL,
  MAX_RESULT_BYTES,
  KEPT_RESULT_FIELDS_BY_TOOL,
  MAX_ACCEPT_NOTES,
  MAX_TEXT_BYTES,
  outcomeQueryEnvelope,
  buildRemoteToolCallMeta,
  WITHDRAWN,
  wirePermissionMode,
  CALLER_FIELDS,
  withinDepth,
  MAX_TOOL_NAME_CHARS,
  sanitizeDeep,
  REMOTE_TOOL_FIELD_LIMITS,
  MAX_SINCE_MS,
  parseResultEnvelope,
  clipTarget,
  MAX_SUGGESTIONS,
  MAX_SUGGESTION_CHARS,
  autoModeField,
  MAX_REFUSAL_NOTES,
  MAX_LIST_FIELD_LENGTH,
  MAX_PERMISSION_UPDATES,
  parseAdvert,
  BASE_CALLER_FIELDS,
};
