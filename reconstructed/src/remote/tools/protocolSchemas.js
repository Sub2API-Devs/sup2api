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
import { $r, VYe, xH } from "../../bridge/deviceRegistration.js";
import { $e, AJ, be, $o, iv, sanitizeRemoteToolEnvelope } from "./callResults.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { stripControlChars, I1 } from "../../utils/stripControlChars.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { o, u, T, U, M, E, pe, oe, A, Ir } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  SAFE_ID_PATTERN,
  REMOTE_TOOL_PROTOCOL_VERSION,
  PERMISSION_MODE_WIRE_ORDER,
  SAFE_ID_WITH_BRACKETS_PATTERN,
  Ie,
  Kvn,
  PXr,
  IYt,
  REMOTE_TOOL_REFUSAL_CODES,
  blr,
  REMOTE_TOOL_ERROR_CODES,
  MXr,
  unexpectedValueFingerprint,
  sit,
  SERVER_VERDICT_KEY,
  readServerVerdict,
  zvn,
  identityMap,
} from "./protocolConstants.js";
import { zYt, dkn } from "./protocolNegotiation.js";
import { Eo, ri, ti, ni, No_g54k, ei } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { DEFAULTS_PLACEHOLDER } from "../../utils/permissions/autoModeRulesPrompt.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-g54kbxqw.js:13342-13632 placement
var REMOTE_TOOL_CALL_META = "__remote_tool_call",
  DYt = "2.1",
  ZQo = ["session_id", "trigger_id", "ccr_card_approval"],
  qvn = [...ZQo, "device", $r, REMOTE_TOOL_CALL_META],
  ANTHROPIC_REMOTETOOLEXECUTION = "anthropic/remoteToolExecution",
  CLAUDECODE_REMOTETOOLCALL = "claudecode/remoteToolCall",
  CLAUDECODE_TOOLUSEID = "claudecode/toolUseId",
  jr = 8192,
  zr = 6,
  NPe = 8192,
  HXr = 32,
  e7o = 8192,
  xo = 4,
  Wr = 1024,
  SENDER_BELOW_FLOOR = "sender_below_floor";
//@ chunk-g54kbxqw.js:13632-13674 placement
function isRemoteToolCallMeta(e) {
  return $e(e) && e[SENDER_BELOW_FLOOR] === !0;
}
//@ chunk-g54kbxqw.js:13674-14030 placement
var REMOTE_TOOL_LIMITS = 300,
  t7o = 64,
  Qt = 16,
  NXr = 200,
  wlr = 4063232,
  Elr = new Map([
    [BASH_TOOL_NAME, new Set(["stdout", "stderr", "interrupted", "timedOutAfterMs", "noOutputExpected"])],
    [POWERSHELL_TOOL_NAME, new Set(["stdout", "stderr", "interrupted", "timedOutAfterMs"])],
    [FILE_EDIT_TOOL_NAME, new Set(["structuredPatch", "staged", "stagedWording"])],
    [FILE_WRITE_TOOL_NAME, new Set(["type", "structuredPatch", "staged", "stagedWording"])],
  ]),
  $Xr = 32,
  Mo = 16,
  Po = 256;
//@ chunk-g54kbxqw.js:14030-14106 placement
function clipText(e, n = NPe) {
  let s = stripControlChars(e);
  return s.length <= n ? s : `${truncateToLength(s, n - 1)}\u2026`;
}
//@ chunk-g54kbxqw.js:14106-14158 placement
var REMOTE_TOOL_FIELD_LIMITS = 64,
  Oo = 1024,
  Kr = /^[A-Za-z0-9_-]{8,64}$/,
  Jt = 128;
//@ chunk-g54kbxqw.js:14158-14233 placement
function clipTarget(e) {
  return { name: clipText(e.name, REMOTE_TOOL_FIELD_LIMITS), working_dir: clipText(e.working_dir, Oo) };
}
/**
 * 远程工具（remote tools）协议的 zod 模式：调用信封、目标、caller、协议版本等。
 */
//@ chunk-g54kbxqw.js:14233-15279 placement
var REMOTE_TOOL_SCHEMAS = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,255}$/,
  Se = DoctorLazy(() => o().regex(REMOTE_TOOL_SCHEMAS)),
  $t = DoctorLazy(() =>
    o()
      .regex(SAFE_ID_PATTERN)
      .optional()
      .catch(void 0),
  ),
  Vr = DoctorLazy(() =>
    u({
      v: T(REMOTE_TOOL_PROTOCOL_VERSION),
      op: T("call").optional(),
      call_id: Se(),
      caller: u({
        kind: U(["ccr_container", "local_process"]),
        permission_mode: U(PERMISSION_MODE_WIRE_ORDER).optional(),
        is_bypass_available: M().optional(),
        instance_id: $t(),
        model: o()
          .regex(SAFE_ID_WITH_BRACKETS_PATTERN)
          .optional()
          .catch(void 0),
        conversation_id: $t(),
        compaction_id: $t(),
        tool_host_interface: zYt()
          .optional()
          .catch(void 0),
      }).transform(dropUndefined),
      expires_in_ms: E().int().positive(),
      approval: u({
        ask_id: rt(),
        decision: U(["allow", "deny"]),
        updated_input: pe(o(), oe()).optional(),
        feedback: o().max(NPe).optional(),
        permission_updates: A(oe()).max($Xr).optional(),
        attested: M().optional(),
      }).optional(),
      read_baseline: u({
        sha256: o().regex(/^[0-9a-f]{64}$/),
        bytes: E().int().nonnegative().max(1073741824),
      })
        .optional()
        .catch(void 0),
    }),
  ),
  rt = DoctorLazy(() => o().regex(REMOTE_TOOL_SCHEMAS)),
  it = DoctorLazy(() => o().regex(REMOTE_TOOL_SCHEMAS)),
  lt = 8640000000000000,
  Kt = () => ({ replayed: M().optional(), served_at: E().int().nonnegative().max(lt).optional() }),
  Yr = DoctorLazy(() => u({ v: T(REMOTE_TOOL_PROTOCOL_VERSION), op: T("outcome_of"), call_id: Se() }));
//@ chunk-g54kbxqw.js:15279-15398 placement
function optionalBoundedIntSchema(e = 1) {
  return oe()
    .transform((n) => (typeof n === "number" && Number.isInteger(n) && n >= e && n <= Ie ? n : void 0))
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
    max_queue_ms: optionalBoundedIntSchema(Kvn.max_queue_ms.min),
    queue_depth: optionalBoundedIntSchema(Kvn.queue_depth.min),
    max_ask_ms: optionalBoundedIntSchema(),
  }).transform(dropUndefined),
);
//@ chunk-g54kbxqw.js:15760-15854 placement
function dropUndefined(e) {
  let n = { ...e };
  for (let s of Object.keys(n)) if (n[s] === void 0) delete n[s];
  return n;
}
//@ chunk-g54kbxqw.js:15854-15966 placement
var SAFE_NAME_SCHEMA = DoctorLazy(() =>
    o()
      .regex(VYe)
      .refine((e) => !xH(e)),
  ),
  Be = DoctorLazy(() => u({ name: o().min(1).max(REMOTE_TOOL_FIELD_LIMITS), working_dir: o().max(Oo) }));
//@ chunk-g54kbxqw.js:15966-16031 placement
function optionalByteCount() {
  return E().int().nonnegative().max(PXr).optional();
}
//@ chunk-g54kbxqw.js:18433-18557 placement
function optionalStringListSchema(e) {
  return oe()
    .transform((n) => (Array.isArray(n) ? n.filter((s) => typeof s === "string").slice(0, e) : void 0))
    .optional();
}
//@ chunk-g54kbxqw.js:18557-18596 placement
var qt = DoctorLazy(() => optionalStringListSchema(HXr)),
  ii = DoctorLazy(() => optionalStringListSchema(xo));
//@ chunk-g54kbxqw.js:18596-18677 placement
function vo(e) {
  return o()
    .max(64)
    .transform((n) => (e.includes(n) ? n : "unrecognized"));
}
//@ chunk-g54kbxqw.js:18677-18847 placement
function optionalEnumOrUnrecognizedSchema(e, n = "dropped") {
  return oe()
    .transform((s) =>
      typeof s === "string"
        ? e.includes(s)
          ? s
          : "unrecognized"
        : n === "unrecognized" && s !== void 0
          ? "unrecognized"
          : void 0,
    )
    .optional();
}
//@ chunk-g54kbxqw.js:18847-20540 placement
var CALL_RESULT_ENVELOPE_SCHEMA = DoctorLazy(() =>
  Ir("outcome", [
    u({
      v: T(REMOTE_TOOL_PROTOCOL_VERSION),
      outcome: T("completed"),
      call_id: Se().optional(),
      target: Be(),
      is_error: M(),
      content: Eo(),
      documents: ri().optional(),
      output: oe().optional(),
      truncated: M().optional(),
      disposition: optionalEnumOrUnrecognizedSchema(IYt, "unrecognized"),
      notes: qt(),
      ...Kt(),
    }),
    u({
      v: T(REMOTE_TOOL_PROTOCOL_VERSION),
      outcome: T("refused"),
      call_id: Se().optional(),
      target: Be(),
      code: vo(REMOTE_TOOL_REFUSAL_CODES),
      reason: optionalEnumOrUnrecognizedSchema(blr),
      limit: optionalEnumOrUnrecognizedSchema(REMOTE_TOOL_ERROR_CODES),
      message: o().max(NPe),
      host_epoch: it().optional(),
      notes: qt(),
      ...Kt(),
    }),
    u({
      v: T(REMOTE_TOOL_PROTOCOL_VERSION),
      outcome: T("failed"),
      call_id: Se().optional(),
      target: Be(),
      code: vo(MXr),
      message: o().max(NPe),
      content: Eo().optional(),
      output: oe().optional(),
      truncated: M().optional(),
      notes: qt(),
      ...Kt(),
    }),
    u({
      v: T(REMOTE_TOOL_PROTOCOL_VERSION),
      outcome: T("in_progress"),
      call_id: Se().optional(),
      target: Be(),
      state: U(["admitting", "running", "awaiting_approval"]),
      since_ms: E().int().nonnegative().max(lt),
      host_epoch: it().optional(),
      output_tail: u({
        text: o().refine((e) => Buffer.byteLength(e) <= e7o),
        truncated_head: M(),
        total_bytes: E().int().nonnegative(),
      })
        .optional()
        .catch(void 0),
    }),
    u({
      v: T(REMOTE_TOOL_PROTOCOL_VERSION),
      outcome: T("needs_approval"),
      call_id: Se().optional(),
      target: Be(),
      ask_id: rt(),
      tool: o().min(1).max(Jt),
      input: pe(o(), oe()),
      message: o().max(NPe),
      decision_reason: o().max(NPe).optional(),
      suggestions: A(o().max(Po)).max(Mo).optional(),
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
      notes: ii(),
    }),
    u({
      v: T(REMOTE_TOOL_PROTOCOL_VERSION),
      outcome: T("acknowledged"),
      call_id: Se().optional(),
      target: Be(),
      ask_id: rt(),
    }),
  ]),
);
//@ chunk-g54kbxqw.js:20540-21094 placement
function buildRemoteToolCallMeta({
  callId: callId,
  expiresInMs: expiresInMs,
  permissionMode: permissionMode,
  isBypassAvailable: isBypassAvailable,
  callerInstanceId: callerInstanceId,
  model: model,
  conversationId: conversationId,
  compactionId: compactionId,
  approval: approval,
  readBaseline: readBaseline,
}) {
  return {
    v: REMOTE_TOOL_PROTOCOL_VERSION,
    call_id: callId,
    caller: {
      kind: env.CLAUDE_CODE_REMOTE ? "ccr_container" : "local_process",
      tool_host_interface: dkn,
      ...(permissionMode !== void 0 && { permission_mode: permissionMode }),
      ...(isBypassAvailable !== void 0 && { is_bypass_available: isBypassAvailable }),
      ...(callerInstanceId !== void 0 && { instance_id: callerInstanceId }),
      ...modelFieldForEnvelope(model),
      ...(conversationId !== void 0 && { conversation_id: conversationId }),
      ...(compactionId !== void 0 && { compaction_id: compactionId }),
    },
    expires_in_ms: AJ(expiresInMs),
    ...(approval !== void 0 && { approval: sanitizeApprovalForWire(approval) }),
    ...(readBaseline !== void 0 && approval === void 0 && { read_baseline: readBaseline }),
  };
}
//@ chunk-g54kbxqw.js:21094-21336 placement
function modelFieldForEnvelope(e) {
  if (e === void 0) return {};
  if (SAFE_ID_WITH_BRACKETS_PATTERN.test(e)) return { model: e };
  return (
    logForDebugging(
      `remote tools: this session's model id is not one the call envelope can carry; the serving machine will not key its model safeguards on it (length ${e.length})`,
    ),
    {}
  );
}
//@ chunk-g54kbxqw.js:21336-21502 placement
function sanitizeApprovalForWire(e) {
  let { attested: attested, feedback: feedback, permission_updates: permission_updates, ...h } = e;
  return {
    ...h,
    ...(feedback !== void 0 && { feedback: clipText(feedback) }),
    ...(permission_updates !== void 0 && { permission_updates: permission_updates.slice(0, $Xr) }),
  };
}
//@ chunk-g54kbxqw.js:21502-21612 placement
function wirePermissionMode(e) {
  switch (e) {
    case "bubble":
      return "default";
    case "bypassPermissions":
      return "auto";
    default:
      return e;
  }
}
//@ chunk-g54kbxqw.js:21612-21641 placement
var ci = ["call", "outcome_of"];
//@ chunk-g54kbxqw.js:21641-22035 placement
function parseRemoteToolRequest(e) {
  let n = be(e)?.op;
  if (n !== "outcome_of") {
    let r = parseCallEnvelope(e);
    if (r.ok) return { ...r, kind: "call" };
    let h = r.why === "malformed" && n !== void 0 ? unexpectedValueFingerprint(n, ci) : void 0;
    return h === void 0 ? r : { ...r, unlistedOp: h };
  }
  if ($o(e)) return { ok: !1, why: "unsupported_protocol" };
  let safeParse = Yr().safeParse(e);
  return safeParse.success
    ? {
        ok: !0,
        kind: "outcome_query",
        value: { v: safeParse.data.v, op: "outcome_of", call_id: safeParse.data.call_id },
      }
    : { ok: !1, why: "malformed" };
}
//@ chunk-g54kbxqw.js:22035-22123 placement
function outcomeQueryEnvelope(e) {
  return {
    v: REMOTE_TOOL_PROTOCOL_VERSION,
    op: "outcome_of",
    call_id: e,
    caller: { tool_host_interface: dkn },
  };
}
//@ chunk-g54kbxqw.js:22123-22132 placement
var pi = 1;
//@ chunk-g54kbxqw.js:22132-22336 placement
function negotiateProtocol(e) {
  if (e === void 0) return { kind: "compatible", version: pi };
  let filtered = e.filter((s) => sit.includes(s));
  return filtered.length > 0
    ? { kind: "compatible", version: Math.max(...filtered) }
    : { kind: "incompatible", announced: [...e] };
}
//@ chunk-g54kbxqw.js:22336-22474 placement
function encodeCallArgs(e) {
  let n =
    "approval" in e && e.approval !== void 0
      ? { ...e, elicit_result: approvalToElicitResult(e.approval) }
      : { ...e };
  return withinDepth(n, zr) && iv(n) <= jr ? n : void 0;
}
//@ chunk-g54kbxqw.js:22474-22494 placement
var WITHDRAWN = "withdrawn";
//@ chunk-g54kbxqw.js:22494-22713 placement
function approvalToElicitResult(e) {
  let n = { [ANTHROPIC_REMOTETOOLEXECUTION]: { ask_id: e.ask_id } };
  return e.decision === "deny" && e.feedback === WITHDRAWN
    ? { action: "cancel", _meta: n }
    : {
        action: "accept",
        content: { decision: e.decision, ...(e.feedback !== void 0 && { feedback: e.feedback }) },
        _meta: n,
      };
}
//@ chunk-g54kbxqw.js:22713-22847 placement
function withinDepth(e, n) {
  let s = Array.isArray(e) ? e : $e(e) ? Object.values(e) : void 0;
  if (s === void 0) return !0;
  return n >= 1 && s.every((r) => withinDepth(r, n - 1));
}
//@ chunk-g54kbxqw.js:22847-23237 placement
function parseCallEnvelope(e) {
  if (e === void 0 || e === null) return { ok: !1, why: "missing" };
  if ($o(e)) return { ok: !1, why: "unsupported_protocol" };
  let safeParse = Vr().safeParse(e);
  if (!safeParse.success) return { ok: !1, why: "malformed" };
  let { approval: approval } = safeParse.data,
    r = be(be(e)?.caller);
  return {
    ok: !0,
    value:
      approval?.feedback === void 0
        ? safeParse.data
        : { ...safeParse.data, approval: { ...approval, feedback: clipText(approval.feedback) } },
    ...(r !== void 0 &&
      Object.hasOwn(r, SERVER_VERDICT_KEY) && { serverVerdict: readServerVerdict(r[SERVER_VERDICT_KEY]) }),
  };
}
//@ chunk-g54kbxqw.js:23237-23300 placement
function autoModeField(e) {
  let n = autoModeRulesForWire(e);
  return n === void 0 ? {} : { auto_mode: n };
}
//@ chunk-g54kbxqw.js:23300-23764 placement
function autoModeRulesForWire(e) {
  if (e === void 0) return;
  let n = (k, C) => {
      let filtered = (k ?? [])
          .flatMap((w) => w.split(/\r?\n/))
          .map((w) => clipText(w.replace(/\s+/g, " "), NXr).trim())
          .filter((w) => w.length > 0 && w !== DEFAULTS_PLACEHOLDER),
        S = C === "last" ? filtered.slice(-Qt) : filtered.slice(0, Qt);
      return S.length > 0 ? S : void 0;
    },
    s = n(e.allow, "first"),
    r = n(e.soft_deny, "last"),
    h = n(e.hard_deny, "last"),
    y = n(e.environment, "first");
  return [s, r, h, y].some((k) => k !== void 0)
    ? {
        ...(s && { allow: s }),
        ...(r && { soft_deny: r }),
        ...(h && { hard_deny: h }),
        ...(y && { environment: y }),
      }
    : void 0;
}
//@ chunk-g54kbxqw.js:23764-23835 placement
function parseAnnounce(e) {
  let safeParse = it().safeParse(e);
  return safeParse.success ? safeParse.data : void 0;
}
//@ chunk-g54kbxqw.js:23835-23909 placement
function parseAdvert(e) {
  let safeParse = No_g54k().safeParse(e);
  return safeParse.success ? sanitizeDeep(safeParse.data) : void 0;
}
//@ chunk-g54kbxqw.js:23909-24002 placement
function intList(e) {
  return Array.isArray(e) && e.length <= 64 && e.every((n) => Number.isInteger(n)) ? e : [];
}
//@ chunk-g54kbxqw.js:24002-24151 placement
function peerProtocolVersions(e) {
  if (e === void 0) return;
  let n = be(e);
  if (n === void 0) return [];
  if (n.v === zvn) return;
  return "protocol_versions" in n ? intList(n.protocol_versions) : [];
}
//@ chunk-g54kbxqw.js:24151-24264 placement
function advertisedProtocolVersions(e) {
  let n = be(e);
  return n !== void 0 && n.v === zvn && "protocol_versions" in n ? intList(n.protocol_versions) : void 0;
}
//@ chunk-g54kbxqw.js:24264-24338 placement
function parseRegistration(e) {
  let safeParse = ei().safeParse(e);
  return safeParse.success ? sanitizeDeep(safeParse.data) : void 0;
}
//@ chunk-g54kbxqw.js:24338-24497 placement
function sanitizeDeep(e) {
  if (typeof e === "string") return I1(e);
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
  let safeParse = CALL_RESULT_ENVELOPE_SCHEMA().safeParse(e);
  return safeParse.success ? sanitizeRemoteToolEnvelope(safeParse.data) : void 0;
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
  t7o,
  SERVING_LIMITS_SCHEMA,
  REMOTE_TOOL_LIMITS,
  it,
  Kr,
  dropUndefined,
  intList,
  NXr,
  Qt,
  NPe,
  rt,
  Se,
  clipText,
  autoModeRulesForWire,
  DYt,
  wlr,
  Elr,
  HXr,
  e7o,
  outcomeQueryEnvelope,
  buildRemoteToolCallMeta,
  WITHDRAWN,
  wirePermissionMode,
  qvn,
  withinDepth,
  Jt,
  sanitizeDeep,
  REMOTE_TOOL_FIELD_LIMITS,
  lt,
  parseResultEnvelope,
  clipTarget,
  Mo,
  Po,
  autoModeField,
  xo,
  Wr,
  $Xr,
  parseAdvert,
  ZQo,
};
