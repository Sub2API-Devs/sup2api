/**
 * cli/structuredIOProtocol.ts
 *
 * 2.1.316 新增：结构化 IO（stream-json）协议常量、控制请求子类型、stdin 行计数与超限处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-na0b3c5q.js (23)
 * attribution: placement 23
 */
import { UiClientAnswerableRequestSchema } from "../entrypoints/sdk/uiControlSchemas.js";
import { env } from "../utils/env.js";
import { ENV_PARSERS } from "../utils/envSchema.js";
import { logForDebugging } from "../utils/debug.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { isCleanupStarted, registerCleanup } from "../utils/cleanupRegistry.js";
import { coalesceStreamEvents } from "./transports/streamEventCoalescing.js";
import { errorMessage, StreamClosedAbortError } from "../utils/errors.js";
import { ndjsonStringify } from "./ndjsonSafeStringify.js";
import { logError } from "../utils/log.js";
import { Isr } from "../utils/teleport/sessionCreate.js";
import { gn } from "../utils/shortHash.js";
import { DoctorLazy } from "./handlers/util.js";
import { generateSettingsJSONSchema } from "../utils/settings/settingsJsonSchema.js";
import { jls } from "../entrypoints/sdk/controlSchemas.js";
import { hookJSONOutputSchema } from "../types/hooks.js";
import { sanitizeDisplayText } from "../utils/resultError.js";
import { truncateToLength } from "../utils/stringUtils.js";
import { kR } from "../../vendor/zod/v4/classic/errors.js";

//@ chunk-na0b3c5q.js:2375-2425 placement
var isKnownControlSubtype = (e) =>
  UiClientAnswerableRequestSchema().options.some((option) => option === e.subtype);
//@ chunk-na0b3c5q.js:2425-2512 placement
var ee = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
//@ chunk-na0b3c5q.js:2512-2576 placement
function matchRequestId(e) {
  return typeof e === "string" && ee.test(e) ? e : void 0;
}
//@ chunk-na0b3c5q.js:2576-4383 placement
var CONTROL_REQUEST_SUBTYPES = [
    "interrupt",
    "can_use_tool",
    "initialize",
    "set_permission_mode",
    "set_model",
    "set_max_thinking_tokens",
    "rename_session",
    "set_color",
    "mcp_status",
    "get_context_usage",
    "get_session_cost",
    "list_models",
    "get_usage",
    "get_memory_dialog",
    "get_skills_dialog",
    "get_chrome_dialog",
    "get_chrome_browsers",
    "select_chrome_browser",
    "get_sandbox_dialog",
    "get_status",
    "export_conversation",
    "list_cloud_sessions",
    "get_cloud_session",
    "get_cloud_session_transcript",
    "get_binary_version",
    "mcp_call",
    "file_suggestions",
    "hook_callback",
    "mcp_message",
    "rewind_files",
    "cancel_async_message",
    "read_file",
    "list_directory",
    "get_workspace_diff",
    "get_plan",
    "seed_read_state",
    "mcp_set_servers",
    "register_repo_root",
    "reload_plugins",
    "reload_skills",
    "reload_output_styles",
    "mcp_reconnect",
    "mcp_toggle",
    "set_mcp_permission_mode_override",
    "set_chrome_browser_hints",
    "set_prompt_suggestions_paused",
    "set_cwd",
    "claim_session",
    "register_device_hooks",
    "upload_device_hook_template",
    "message_rated",
    "oauth_token_refresh",
    "host_auth_token_refresh",
    "stop_task",
    "start_shell_task",
    "background_tasks",
    "get_task_output",
    "apply_flag_settings",
    "get_settings",
    "get_hooks_listing",
    "update_settings",
    "elicitation",
    "request_user_dialog",
    "submit_feedback",
    "submit_survey_feedback",
    "remote_tools_announce",
    "remote_tool_call",
    "remote_plumbing_call",
    "remote_tools_probe",
    "remote_tools_reannounce",
    "ui_attach",
    "ui_detach",
    "ui_render",
    "ui_press",
    "ui_client_module",
    "ui_client_press",
    "ui_message",
    "ui_client_fault",
    "remote_control_work_secret",
    "turn_handoff",
    "list_permission_rules",
    "mcp_read_resource",
    "ui_input",
    "ui_select",
    "ui_panes",
    "ui_pane_show",
    "ui_pane_focus",
    "ui_close",
    "ui_scroll",
    "ui_focus",
    "ui_prompt_edit",
    "ui_prompt_autocomplete",
    "ui_copy",
    "ui_prompt_read",
    "ui_prompt_fill",
    "ui_prompt_paint",
    "ui_prompt_suggest",
    "ui_read_selection",
  ],
  re = new Set(CONTROL_REQUEST_SUBTYPES);
//@ chunk-na0b3c5q.js:4383-4446 placement
function knownSubtypeOrUndefined(e) {
  return typeof e === "string" && re.has(e) ? e : void 0;
}
//@ chunk-na0b3c5q.js:4446-4488 placement
function flagKey(e, s) {
  return { [`${e}_${s}`]: !0 };
}
//@ chunk-na0b3c5q.js:4488-5055 placement
function permissionResponseTelemetry(e) {
  let s = Array.isArray(e?.updatedPermissions) ? e.updatedPermissions : [],
    n =
      e?.behavior === "deny"
        ? "deny"
        : e?.behavior !== "allow"
          ? "other"
          : s.length === 0
            ? "allow_once"
            : "allow_with_updates",
    r = (o) => n === "allow_with_updates" && s.some((h) => typeof h === "object" && h !== null && o(h));
  return {
    answer_kind: n,
    ...flagKey("answer_kind", n),
    ...(r((o) => (o.type === "addRules" || o.type === "replaceRules") && o.behavior === "allow") && {
      answer_updates_add_allow_rule: !0,
    }),
    ...(r((o) => o.type === "setMode") && { answer_updates_set_mode: !0 }),
    ...(r((o) => o.type === "addDirectories") && { answer_updates_add_directories: !0 }),
  };
}
//@ chunk-na0b3c5q.js:5055-5110 placement
function elapsedMs(e) {
  return Math.round(performance.now() - e);
}
//@ chunk-na0b3c5q.js:5110-5159 placement
function configProbeEnv() {
  return env.CLAUDE_CODE_CONFIG_PROBE;
}
//@ chunk-na0b3c5q.js:5159-5170 placement
var ie = 100;
//@ chunk-na0b3c5q.js:5170-5694 placement
function parseIntEnv(e, s) {
  let parse = ENV_PARSERS.int({ min: 1, digitsOnly: !0 }).parse(s);
  if (s !== void 0 && parse === void 0) {
    (logForDebugging(
      `CLAUDE_CODE_STREAM_EVENT_MAX_LINE_BYTES is set to ${jsonStringify(s)}, which is not a whole number of at least 1, so CLAUDE_CODE_STREAM_EVENT_HOLD_MS is ignored and stream-json lines are printed as they come. To hold lines, set CLAUDE_CODE_STREAM_EVENT_MAX_LINE_BYTES to a whole number of at least 1, or unset it for no line limit.`,
      { level: "warn" },
    ),
      logFeatureSad("print_stream_event_hold", "max_line_bytes_invalid"));
    return;
  }
  return new StdinLineCounter({ ...e, maxLineBytes: parse });
}
/**
 * 统计 stream-json 输入行数与大小、记录首个块，在超限时停止并上报。
 */
//@ chunk-na0b3c5q.js:5694-7948 placement
class StdinLineCounter {
  options;
  lines = [];
  count;
  lastCountTotal;
  afterBlockStart = !1;
  stopped = !1;
  countedUse = !1;
  reportedPrintFailure = !1;
  cancelTimer;
  exitHook;
  constructor(e) {
    this.options = e;
  }
  keeps(e) {
    let afterBlockStart = this.afterBlockStart;
    if (e.type === "stream_event") this.afterBlockStart = e.event.type === "content_block_start";
    if (this.stopped || isCleanupStarted()) return (this.release(), !1);
    if (e.type === "system" && e.subtype === "thinking_tokens") {
      let h =
        e.estimated_tokens - e.estimated_tokens_delta !== this.lastCountTotal ||
        (e.estimated_tokens_delta === e.estimated_tokens && e.estimated_tokens > 0);
      if (((this.lastCountTotal = e.estimated_tokens), h)) return (this.release(), !1);
      return (
        this.startWaitIfIdle(),
        (this.count =
          this.count === void 0
            ? e
            : { ...e, estimated_tokens_delta: this.count.estimated_tokens_delta + e.estimated_tokens_delta }),
        !0
      );
    }
    if (e.type !== "stream_event" || e.event.type !== "content_block_delta" || afterBlockStart)
      return (this.release(), !1);
    this.startWaitIfIdle();
    let at = this.lines.at(-1),
      r = [];
    try {
      r = at === void 0 ? [] : coalesceStreamEvents([at.message, e]);
    } catch (error) {
      logForDebugging(
        `CLAUDE_CODE_STREAM_EVENT_HOLD_MS: printing a stream_event delta on its own line, because joining it to the delta before it failed: ${errorMessage(error)}`,
      );
    }
    let o = r.length === 1 ? r[0] : void 0;
    if (at !== void 0 && o !== void 0) {
      let { maxLineBytes: maxLineBytes } = this.options;
      if (maxLineBytes === void 0) return ((at.message = o), !0);
      let m = ndjsonStringify(o);
      if (Buffer.byteLength(m) <= maxLineBytes) return ((at.message = o), (at.text = m), !0);
    }
    if ((this.lines.push({ message: e, text: void 0 }), this.lines.length >= ie)) this.release();
    return !0;
  }
  release() {
    (this.cancelTimer?.(), (this.cancelTimer = void 0), this.exitHook?.(), (this.exitHook = void 0));
    let { lines: lines, count: count } = this;
    ((this.lines = []), (this.count = void 0));
    for (let { message: message, text: text } of lines)
      this.options.print(message, text ?? ndjsonStringify(message));
    if (count !== void 0) this.options.print(count, ndjsonStringify(count));
  }
  stop() {
    ((this.stopped = !0), this.releaseOrLog());
  }
  releaseOrLog() {
    try {
      this.release();
    } catch (error) {
      try {
        if (
          (logForDebugging(
            `CLAUDE_CODE_STREAM_EVENT_HOLD_MS: printing held stream-json lines failed, and the lines not yet printed were dropped: ${errorMessage(error)}`,
            { level: "warn" },
          ),
          !this.reportedPrintFailure)
        )
          ((this.reportedPrintFailure = !0),
            logError(error),
            logFeatureSad("print_stream_event_hold", "print_threw"));
      } catch {}
    }
  }
  startWaitIfIdle() {
    if (this.lines.length > 0 || this.count !== void 0) return;
    if (!this.countedUse) ((this.countedUse = !0), logFeatureOk("print_stream_event_hold"));
    ((this.cancelTimer = this.options.clock.setTimeout(() => this.releaseOrLog(), this.options.holdMs)),
      (this.exitHook = registerCleanup(() => this.releaseOrLog())));
  }
}
//@ chunk-na0b3c5q.js:7948-8022 placement
function dialogSourceAttr(e, s) {
  let n = Isr(e, s);
  return n === void 0 ? {} : { dialog_source: gn(n) };
}
//@ chunk-na0b3c5q.js:8022-8331 placement
var CONTROL_TIMEOUTS = 30000,
  ue = 30000,
  le = 45000,
  ce = new Set(["oauth_token_refresh", "host_auth_token_refresh", "remote_control_work_secret"]),
  W = new Set([
    "CLAUDE_CODE_SESSION_ACCESS_TOKEN",
    "CLAUDE_CODE_OAUTH_TOKEN",
    "CLAUDE_CODE_SESSIONS_OAUTH_TOKEN",
  ]),
  F = 300000,
  pe = 70000,
  fe = 0.01,
  he = 262144,
  me = 1000,
  _e = DoctorLazy(() => generateSettingsJSONSchema(jls())),
  ge = 268435456;
//@ chunk-na0b3c5q.js:8331-8617 placement
function inputTooLargeError(e) {
  return `Error: stream-json input carried over ${Math.round(e / 1024 / 1024)}M characters with no newline. Each stream-json message must be a single newline-terminated JSON line: either the producer is not newline-terminating its messages, or one message exceeded this budget.`;
}
//@ chunk-na0b3c5q.js:8617-8667 placement
var STDIN_LIMITS = 64,
  ke = 1048576,
  M = '"control_response"',
  z = 512;
//@ chunk-na0b3c5q.js:8667-8840 placement
function parseControlResponse(e) {
  let safeParse = hookJSONOutputSchema().safeParse(e);
  if (!safeParse.success) return null;
  return (typeof e === "object" && e !== null ? Object.keys(e).length : 0) > 0 &&
    Object.keys(safeParse.data).length === 0
    ? null
    : safeParse.data;
}
//@ chunk-na0b3c5q.js:8840-8955 placement
function truncatedErrorText(e) {
  let s = sanitizeDisplayText(truncateToLength(e, 4096), { maxCodeUnits: 512 });
  return e.length > 512 ? `${s}\u2026 [${e.length} chars total]` : s;
}
//@ chunk-na0b3c5q.js:8955-9057 placement
function errorFieldText(e) {
  return typeof e === "string"
    ? sanitizeDisplayText(truncateToLength(e, 4096), { maxCodeUnits: 200 })
    : "a non-string error field";
}
//@ chunk-na0b3c5q.js:9057-9233 placement
function deliveryOutcome(e, s) {
  if (e === "delivered" || s === "accepted") return "delivered";
  if (e === "indeterminate" || s === "indeterminate") return "indeterminate";
  return s === "sending" ? "sending" : "queued";
}
//@ chunk-na0b3c5q.js:9233-9317 placement
function subtypeOf(e) {
  return typeof e === "object" && e !== null && "subtype" in e ? e.subtype : void 0;
}
//@ chunk-na0b3c5q.js:9317-9479 placement
function normalizeDeliveryState(e) {
  switch (e) {
    case "delivered":
      return "delivered";
    case "queued":
      return "queued";
    case "sending":
      return "in_flight";
    case "indeterminate":
      return "indeterminate";
  }
}
//@ chunk-na0b3c5q.js:9479-9613 placement
function classifyStreamError(e, s) {
  if (e instanceof StreamClosedAbortError) return "stream_closed";
  if (e instanceof kR) return "parse_failed";
  return s.aborted ? "timeout" : "aborted";
}

export {
  flagKey,
  configProbeEnv,
  knownSubtypeOrUndefined,
  elapsedMs,
  matchRequestId,
  parseIntEnv,
  ge,
  M,
  STDIN_LIMITS,
  ke,
  inputTooLargeError,
  dialogSourceAttr,
  errorFieldText,
  isKnownControlSubtype,
  W,
  ce,
  subtypeOf,
  truncatedErrorText,
  permissionResponseTelemetry,
  F,
  fe,
  he,
  _e,
  me,
  classifyStreamError,
  parseControlResponse,
  z,
  deliveryOutcome,
  normalizeDeliveryState,
  pe,
  CONTROL_TIMEOUTS,
  le,
  ue,
};
