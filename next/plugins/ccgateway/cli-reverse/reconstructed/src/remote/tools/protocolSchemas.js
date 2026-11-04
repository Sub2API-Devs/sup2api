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
  stringSchema,
  objectSchema,
  literal,
  _enum,
  booleanSchema,
  numberSchema,
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
import {
  toolResultContentSchema,
  pdfPagesSchema,
  filePolicySchema,
  askRequestSchema,
  toolHostTargetSchema,
  toolInvocationRequestSchema,
} from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { DEFAULTS_PLACEHOLDER } from "../../utils/permissions/autoModeRulesPrompt.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g54kbxqw.js:13342-13632 placement
/**
 * remote_tool_call 元数据键与别名：__remote_tool_call、协议标签 2.1、caller 字段集合，以及 anthropic/remoteToolExecution 等类型名和若干大小上限。
 */
var REMOTE_TOOL_CALL_META; // deferred: uses HOST_TOOL_INPUT_FIELD (../../bridge/deviceRegistration.js) of its import cycle while loading; runs once the cycle is complete
var REMOTE_TOOL_PROTOCOL_LABEL;
var BASE_CALLER_FIELDS;
var CALLER_FIELDS;
var ANTHROPIC_REMOTETOOLEXECUTION;
var CLAUDECODE_REMOTETOOLCALL;
var CLAUDECODE_TOOLUSEID;
var MAX_CALLER_BLOB_BYTES;
var MAX_CALLER_BLOB_DEPTH;
var MAX_MESSAGE_CHARS;
var MAX_ACCEPT_NOTES;
var MAX_TEXT_BYTES;
var MAX_REFUSAL_NOTES;
var MAX_LIST_FIELD_LENGTH;
var SENDER_BELOW_FLOOR;
deferInit("chunk-g54kbxqw.js:13342", () => {
  REMOTE_TOOL_CALL_META = "__remote_tool_call";
  REMOTE_TOOL_PROTOCOL_LABEL = "2.1";
  BASE_CALLER_FIELDS = ["session_id", "trigger_id", "ccr_card_approval"];
  CALLER_FIELDS = [...BASE_CALLER_FIELDS, "device", HOST_TOOL_INPUT_FIELD, REMOTE_TOOL_CALL_META];
  ANTHROPIC_REMOTETOOLEXECUTION = "anthropic/remoteToolExecution";
  CLAUDECODE_REMOTETOOLCALL = "claudecode/remoteToolCall";
  CLAUDECODE_TOOLUSEID = "claudecode/toolUseId";
  MAX_CALLER_BLOB_BYTES = 8192;
  MAX_CALLER_BLOB_DEPTH = 6;
  MAX_MESSAGE_CHARS = 8192;
  MAX_ACCEPT_NOTES = 32;
  MAX_TEXT_BYTES = 8192;
  MAX_REFUSAL_NOTES = 4;
  MAX_LIST_FIELD_LENGTH = 1024;
  SENDER_BELOW_FLOOR = "sender_below_floor";
});
//@ chunk-g54kbxqw.js:13632-13674 placement
function isRemoteToolCallMeta(value) {
  return isPlainRecord(value) && value[SENDER_BELOW_FLOOR] === true;
}
//@ chunk-g54kbxqw.js:13674-14030 placement
/**
 * 远程调用结果的大小限额与各工具保留字段：行数/行长/结果字节等上限，以及 Bash、PowerShell、Edit、Write 工具允许透传的结果字段。
 */
var REMOTE_TOOL_LIMITS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_TRUNCATED_LINES;
var MAX_TAIL_LINES;
var MAX_LINE_CHARS;
var MAX_RESULT_BYTES;
var KEPT_RESULT_FIELDS_BY_TOOL;
var MAX_PERMISSION_UPDATES;
var MAX_SUGGESTIONS;
var MAX_SUGGESTION_CHARS;
deferInit("chunk-g54kbxqw.js:13674", () => {
  REMOTE_TOOL_LIMITS = 300;
  MAX_TRUNCATED_LINES = 64;
  MAX_TAIL_LINES = 16;
  MAX_LINE_CHARS = 200;
  MAX_RESULT_BYTES = 4063232;
  KEPT_RESULT_FIELDS_BY_TOOL = new Map([
    [BASH_TOOL_NAME, new Set(["stdout", "stderr", "interrupted", "timedOutAfterMs", "noOutputExpected"])],
    [POWERSHELL_TOOL_NAME, new Set(["stdout", "stderr", "interrupted", "timedOutAfterMs"])],
    [FILE_EDIT_TOOL_NAME, new Set(["structuredPatch", "staged", "stagedWording"])],
    [FILE_WRITE_TOOL_NAME, new Set(["type", "structuredPatch", "staged", "stagedWording"])],
  ]);
  MAX_PERMISSION_UPDATES = 32;
  MAX_SUGGESTIONS = 16;
  MAX_SUGGESTION_CHARS = 256;
});
//@ chunk-g54kbxqw.js:14030-14106 placement
function clipText(text, maxChars = MAX_MESSAGE_CHARS) {
  let stripped = stripControlChars_2(text);
  return stripped.length <= maxChars ? stripped : `${truncateToLength(stripped, maxChars - 1)}\u2026`;
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
var REMOTE_TOOL_SCHEMAS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var callIdSchema;
var optionalSafeIdSchema;
var callRequestSchema;
var askIdSchema;
var hostEpochSchema;
var MAX_SINCE_MS;
var callOutcomeSchema;
var servedResponseSchema;
deferInit("chunk-g54kbxqw.js:14233", () => {
  REMOTE_TOOL_SCHEMAS = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,255}$/;
  callIdSchema = DoctorLazy(() => stringSchema().regex(REMOTE_TOOL_SCHEMAS));
  optionalSafeIdSchema = DoctorLazy(() => stringSchema().regex(SAFE_ID_PATTERN).optional().catch(undefined));
  callRequestSchema = DoctorLazy(() =>
    objectSchema({
      v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
      op: literal("call").optional(),
      call_id: callIdSchema(),
      caller: objectSchema({
        kind: _enum(["ccr_container", "local_process"]),
        permission_mode: _enum(PERMISSION_MODE_WIRE_ORDER).optional(),
        is_bypass_available: booleanSchema().optional(),
        instance_id: optionalSafeIdSchema(),
        model: stringSchema().regex(SAFE_ID_WITH_BRACKETS_PATTERN).optional().catch(undefined),
        conversation_id: optionalSafeIdSchema(),
        compaction_id: optionalSafeIdSchema(),
        tool_host_interface: toolHostInterfaceSchema().optional().catch(undefined),
      }).transform(dropUndefined),
      expires_in_ms: numberSchema().int().positive(),
      approval: objectSchema({
        ask_id: askIdSchema(),
        decision: _enum(["allow", "deny"]),
        updated_input: record(stringSchema(), unknown()).optional(),
        feedback: stringSchema().max(MAX_MESSAGE_CHARS).optional(),
        permission_updates: array(unknown()).max(MAX_PERMISSION_UPDATES).optional(),
        attested: booleanSchema().optional(),
      }).optional(),
      read_baseline: objectSchema({
        sha256: stringSchema().regex(/^[0-9a-f]{64}$/),
        bytes: numberSchema().int().nonnegative().max(1073741824),
      })
        .optional()
        .catch(undefined),
    }),
  );
  askIdSchema = DoctorLazy(() => stringSchema().regex(REMOTE_TOOL_SCHEMAS));
  hostEpochSchema = DoctorLazy(() => stringSchema().regex(REMOTE_TOOL_SCHEMAS));
  MAX_SINCE_MS = 8640000000000000;
  callOutcomeSchema = () => ({
    replayed: booleanSchema().optional(),
    served_at: numberSchema().int().nonnegative().max(MAX_SINCE_MS).optional(),
  });
  servedResponseSchema = DoctorLazy(() =>
    objectSchema({
      v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
      op: literal("outcome_of"),
      call_id: callIdSchema(),
    }),
  );
});
//@ chunk-g54kbxqw.js:15279-15398 placement
function optionalBoundedIntSchema(min = 1) {
  return unknown()
    .transform((value) =>
      typeof value === "number" && Number.isInteger(value) && value >= min && value <= MAX_INT32
        ? value
        : undefined,
    )
    .optional();
}
//@ chunk-g54kbxqw.js:15398-15760 placement
var SERVING_LIMITS_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g54kbxqw.js:15398", () => {
  SERVING_LIMITS_SCHEMA = DoctorLazy(() =>
    objectSchema({
      max_call_ms: numberSchema().int().positive(),
      max_command_ms: optionalBoundedIntSchema(),
      max_request_bytes: numberSchema().int().positive(),
      max_in_flight: numberSchema().int().positive(),
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
});
//@ chunk-g54kbxqw.js:15760-15854 placement
function dropUndefined(value) {
  let copy = {
    ...value,
  };
  for (let key of Object.keys(copy)) if (copy[key] === undefined) delete copy[key];
  return copy;
}
//@ chunk-g54kbxqw.js:15854-15966 placement
/**
 * 工具名 schema：匹配安全名字正则并排除危险名；另定义统一的 name/working_dir 目标 schema。
 */
var SAFE_NAME_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var callTargetSchema;
deferInit("chunk-g54kbxqw.js:15854", () => {
  SAFE_NAME_SCHEMA = DoctorLazy(() =>
    stringSchema()
      .regex(MACHINE_SLUG_PATTERN)
      .refine((name) => !isReservedMachineNameExact(name)),
  );
  callTargetSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().min(1).max(REMOTE_TOOL_FIELD_LIMITS),
      working_dir: stringSchema().max(MAX_WORKING_DIR_CHARS),
    }),
  );
});
//@ chunk-g54kbxqw.js:15966-16031 placement
function optionalByteCount() {
  return numberSchema().int().nonnegative().max(MAX_NONNEGATIVE_INT).optional();
}
//@ chunk-g54kbxqw.js:18433-18557 placement
function optionalStringListSchema(maxEntries) {
  return unknown()
    .transform((value) =>
      Array.isArray(value)
        ? value.filter((entry) => typeof entry === "string").slice(0, maxEntries)
        : undefined,
    )
    .optional();
}
//@ chunk-g54kbxqw.js:18557-18596 placement
var acceptNotesSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var refusalNotesSchema;
deferInit("chunk-g54kbxqw.js:18557", () => {
  acceptNotesSchema = DoctorLazy(() => optionalStringListSchema(MAX_ACCEPT_NOTES));
  refusalNotesSchema = DoctorLazy(() => optionalStringListSchema(MAX_REFUSAL_NOTES));
});
//@ chunk-g54kbxqw.js:18596-18677 placement
function codeEnumSchema(allowed) {
  return stringSchema()
    .max(64)
    .transform((value) => (allowed.includes(value) ? value : "unrecognized"));
}
//@ chunk-g54kbxqw.js:18677-18847 placement
function optionalEnumOrUnrecognizedSchema(allowed, unknownMode = "dropped") {
  return unknown()
    .transform((value) =>
      typeof value === "string"
        ? allowed.includes(value)
          ? value
          : "unrecognized"
        : unknownMode === "unrecognized" && value !== undefined
          ? "unrecognized"
          : undefined,
    )
    .optional();
}
//@ chunk-g54kbxqw.js:18847-20540 placement
var CALL_RESULT_ENVELOPE_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g54kbxqw.js:18847", () => {
  CALL_RESULT_ENVELOPE_SCHEMA = DoctorLazy(() =>
    discriminatedUnion("outcome", [
      objectSchema({
        v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
        outcome: literal("completed"),
        call_id: callIdSchema().optional(),
        target: callTargetSchema(),
        is_error: booleanSchema(),
        content: toolResultContentSchema(),
        documents: pdfPagesSchema().optional(),
        output: unknown().optional(),
        truncated: booleanSchema().optional(),
        disposition: optionalEnumOrUnrecognizedSchema(RAN_OUTCOME_KINDS, "unrecognized"),
        notes: acceptNotesSchema(),
        ...callOutcomeSchema(),
      }),
      objectSchema({
        v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
        outcome: literal("refused"),
        call_id: callIdSchema().optional(),
        target: callTargetSchema(),
        code: codeEnumSchema(REMOTE_TOOL_REFUSAL_CODES),
        reason: optionalEnumOrUnrecognizedSchema(WITHDRAW_REASON_CODES),
        limit: optionalEnumOrUnrecognizedSchema(REMOTE_TOOL_ERROR_CODES),
        message: stringSchema().max(MAX_MESSAGE_CHARS),
        host_epoch: hostEpochSchema().optional(),
        notes: acceptNotesSchema(),
        ...callOutcomeSchema(),
      }),
      objectSchema({
        v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
        outcome: literal("failed"),
        call_id: callIdSchema().optional(),
        target: callTargetSchema(),
        code: codeEnumSchema(ERROR_OUTCOME_CODES),
        message: stringSchema().max(MAX_MESSAGE_CHARS),
        content: toolResultContentSchema().optional(),
        output: unknown().optional(),
        truncated: booleanSchema().optional(),
        notes: acceptNotesSchema(),
        ...callOutcomeSchema(),
      }),
      objectSchema({
        v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
        outcome: literal("in_progress"),
        call_id: callIdSchema().optional(),
        target: callTargetSchema(),
        state: _enum(["admitting", "running", "awaiting_approval"]),
        since_ms: numberSchema().int().nonnegative().max(MAX_SINCE_MS),
        host_epoch: hostEpochSchema().optional(),
        output_tail: objectSchema({
          text: stringSchema().refine((text) => Buffer.byteLength(text) <= MAX_TEXT_BYTES),
          truncated_head: booleanSchema(),
          total_bytes: numberSchema().int().nonnegative(),
        })
          .optional()
          .catch(undefined),
      }),
      objectSchema({
        v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
        outcome: literal("needs_approval"),
        call_id: callIdSchema().optional(),
        target: callTargetSchema(),
        ask_id: askIdSchema(),
        tool: stringSchema().min(1).max(MAX_TOOL_NAME_CHARS),
        input: record(stringSchema(), unknown()),
        message: stringSchema().max(MAX_MESSAGE_CHARS),
        decision_reason: stringSchema().max(MAX_MESSAGE_CHARS).optional(),
        suggestions: array(stringSchema().max(MAX_SUGGESTION_CHARS)).max(MAX_SUGGESTIONS).optional(),
        classifier_eligible: booleanSchema().optional(),
        prior_answer_ok: booleanSchema().optional(),
        auto_mode: filePolicySchema()
          .optional()
          .catch(() => {
            logForDebugging(
              "[remote-tools] dropped an unreadable auto_mode block from a needs_approval answer; the ask is judged without it",
            );
            return;
          }),
        elicitation: askRequestSchema()
          .optional()
          .catch(() => {
            logForDebugging(
              "[remote-tools] dropped an unreadable elicitation block from a needs_approval answer; its own fields stand",
            );
            return;
          }),
        notes: refusalNotesSchema(),
      }),
      objectSchema({
        v: literal(REMOTE_TOOL_PROTOCOL_VERSION),
        outcome: literal("acknowledged"),
        call_id: callIdSchema().optional(),
        target: callTargetSchema(),
        ask_id: askIdSchema(),
      }),
    ]),
  );
});
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
  let { attested, feedback, permission_updates: permissionUpdates, ...rest } = approval;
  return {
    ...rest,
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
function parseRemoteToolRequest(value) {
  let op = asPlainRecord(value)?.op;
  if (op !== "outcome_of") {
    let callEnvelope = parseCallEnvelope(value);
    if (callEnvelope.ok)
      return {
        ...callEnvelope,
        kind: "call",
      };
    let unlistedOp =
      callEnvelope.why === "malformed" && op !== undefined
        ? unexpectedValueFingerprint(op, UNEXPECTED_VALUE_FIELDS)
        : undefined;
    return unlistedOp === undefined
      ? callEnvelope
      : {
          ...callEnvelope,
          unlistedOp,
        };
  }
  if (hasDifferentProtocolVersion(value))
    return {
      ok: false,
      why: "unsupported_protocol",
    };
  let parsed = servedResponseSchema().safeParse(value);
  return parsed.success
    ? {
        ok: true,
        kind: "outcome_query",
        value: {
          v: parsed.data.v,
          op: "outcome_of",
          call_id: parsed.data.call_id,
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
function negotiateProtocol(announced) {
  if (announced === undefined)
    return {
      kind: "compatible",
      version: MIN_COMPATIBLE_VERSION,
    };
  let filtered = announced.filter((version) => SUPPORTED_PROTOCOL_VERSIONS.includes(version));
  return filtered.length > 0
    ? {
        kind: "compatible",
        version: Math.max(...filtered),
      }
    : {
        kind: "incompatible",
        announced: [...announced],
      };
}
//@ chunk-g54kbxqw.js:22336-22474 placement
function encodeCallArgs(args) {
  let normalized =
    "approval" in args && args.approval !== undefined
      ? {
          ...args,
          elicit_result: approvalToElicitResult(args.approval),
        }
      : {
          ...args,
        };
  return withinDepth(normalized, MAX_CALLER_BLOB_DEPTH) && byteLengthOf(normalized) <= MAX_CALLER_BLOB_BYTES
    ? normalized
    : undefined;
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
function withinDepth(value, depth) {
  let children = Array.isArray(value) ? value : isPlainRecord(value) ? Object.values(value) : undefined;
  if (children === undefined) return true;
  return depth >= 1 && children.every((child) => withinDepth(child, depth - 1));
}
//@ chunk-g54kbxqw.js:22847-23237 placement
function parseCallEnvelope(value) {
  if (value === undefined || value === null)
    return {
      ok: false,
      why: "missing",
    };
  if (hasDifferentProtocolVersion(value))
    return {
      ok: false,
      why: "unsupported_protocol",
    };
  let parsed = callRequestSchema().safeParse(value);
  if (!parsed.success)
    return {
      ok: false,
      why: "malformed",
    };
  let { approval } = parsed.data;
  let caller = asPlainRecord(asPlainRecord(value)?.caller);
  return {
    ok: true,
    value:
      approval?.feedback === undefined
        ? parsed.data
        : {
            ...parsed.data,
            approval: {
              ...approval,
              feedback: clipText(approval.feedback),
            },
          },
    ...(caller !== undefined &&
      Object.hasOwn(caller, SERVER_VERDICT_KEY) && {
        serverVerdict: readServerVerdict(caller[SERVER_VERDICT_KEY]),
      }),
  };
}
//@ chunk-g54kbxqw.js:23237-23300 placement
function autoModeField(rules) {
  let wireRules = autoModeRulesForWire(rules);
  return wireRules === undefined
    ? {}
    : {
        auto_mode: wireRules,
      };
}
//@ chunk-g54kbxqw.js:23300-23764 placement
function autoModeRulesForWire(rules) {
  if (rules === undefined) return;
  let clipLines = (lines, side) => {
    let filtered = (lines ?? [])
      .flatMap((entry) => entry.split(/\r?\n/))
      .map((line) => clipText(line.replace(/\s+/g, " "), MAX_LINE_CHARS).trim())
      .filter((line) => line.length > 0 && line !== DEFAULTS_PLACEHOLDER);
    let kept = side === "last" ? filtered.slice(-MAX_TAIL_LINES) : filtered.slice(0, MAX_TAIL_LINES);
    return kept.length > 0 ? kept : undefined;
  };
  let allow = clipLines(rules.allow, "first");
  let softDeny = clipLines(rules.soft_deny, "last");
  let hardDeny = clipLines(rules.hard_deny, "last");
  let environment = clipLines(rules.environment, "first");
  return [allow, softDeny, hardDeny, environment].some((list) => list !== undefined)
    ? {
        ...(allow && {
          allow,
        }),
        ...(softDeny && {
          soft_deny: softDeny,
        }),
        ...(hardDeny && {
          hard_deny: hardDeny,
        }),
        ...(environment && {
          environment,
        }),
      }
    : undefined;
}
//@ chunk-g54kbxqw.js:23764-23835 placement
function parseAnnounce(epoch) {
  let parsed = hostEpochSchema().safeParse(epoch);
  return parsed.success ? parsed.data : undefined;
}
//@ chunk-g54kbxqw.js:23835-23909 placement
function parseAdvert(value) {
  let parsed = toolHostTargetSchema().safeParse(value);
  return parsed.success ? sanitizeDeep(parsed.data) : undefined;
}
//@ chunk-g54kbxqw.js:23909-24002 placement
function intList(protocolVersions) {
  return Array.isArray(protocolVersions) &&
    protocolVersions.length <= 64 &&
    protocolVersions.every((version) => Number.isInteger(version))
    ? protocolVersions
    : [];
}
//@ chunk-g54kbxqw.js:24002-24151 placement
function peerProtocolVersions(value) {
  if (value === undefined) return;
  let record = asPlainRecord(value);
  if (record === undefined) return [];
  if (record.v === CURRENT_PROTOCOL_VERSION) return;
  return "protocol_versions" in record ? intList(record.protocol_versions) : [];
}
//@ chunk-g54kbxqw.js:24151-24264 placement
function advertisedProtocolVersions(value) {
  let record = asPlainRecord(value);
  return record !== undefined && record.v === CURRENT_PROTOCOL_VERSION && "protocol_versions" in record
    ? intList(record.protocol_versions)
    : undefined;
}
//@ chunk-g54kbxqw.js:24264-24338 placement
function parseRegistration(value) {
  let parsed = toolInvocationRequestSchema().safeParse(value);
  return parsed.success ? sanitizeDeep(parsed.data) : undefined;
}
//@ chunk-g54kbxqw.js:24338-24497 placement
function sanitizeDeep(value) {
  if (typeof value === "string") return stripControlChars(value);
  if (Array.isArray(value)) return value.map(sanitizeDeep);
  if (value !== null && typeof value === "object")
    return import_mapValues(
      identityMap(value, (key, item) => sanitizeDeep(item)),
      sanitizeDeep,
    );
  return value;
}
//@ chunk-g54kbxqw.js:24497-24571 placement
function parseResultEnvelope(value) {
  let parsed = CALL_RESULT_ENVELOPE_SCHEMA().safeParse(value);
  return parsed.success ? sanitizeRemoteToolEnvelope(parsed.data) : undefined;
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
