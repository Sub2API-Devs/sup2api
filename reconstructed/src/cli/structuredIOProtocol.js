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
import { dialogSourceOf } from "../utils/teleport/sessionCreate.js";
import { shortHash } from "../utils/shortHash.js";
import { DoctorLazy } from "./handlers/util.js";
import { generateSettingsJSONSchema } from "../utils/settings/settingsJsonSchema.js";
import { StdoutMessageSchema } from "../entrypoints/sdk/controlSchemas.js";
import { hookJSONOutputSchema } from "../types/hooks.js";
import { sanitizeDisplayText } from "../utils/resultError.js";
import { truncateToLength } from "../utils/stringUtils.js";
import { ZodError } from "../../vendor/zod/v4/classic/errors.js";

//@ chunk-na0b3c5q.js:2375-2425 placement
var isKnownControlSubtype = (e) =>
  UiClientAnswerableRequestSchema().options.some((option) => option === e.subtype);
//@ chunk-na0b3c5q.js:2425-2512 placement
var UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
//@ chunk-na0b3c5q.js:2512-2576 placement
function matchRequestId(uuid) {
  return typeof uuid === "string" && UUID_PATTERN.test(uuid) ? uuid : undefined;
}
//@ chunk-na0b3c5q.js:2576-4383 placement
/**
 * 已知的 control_request 子类型名单（interrupt、can_use_tool、initialize、set_model、get_usage 等），用于校验与分类。
 */
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
];
var CONTROL_REQUEST_SUBTYPE_SET = new Set(CONTROL_REQUEST_SUBTYPES);
//@ chunk-na0b3c5q.js:4383-4446 placement
function knownSubtypeOrUndefined(e) {
  return typeof e === "string" && CONTROL_REQUEST_SUBTYPE_SET.has(e) ? e : undefined;
}
//@ chunk-na0b3c5q.js:4446-4488 placement
function flagKey(e, s) {
  return {
    [`${e}_${s}`]: true,
  };
}
//@ chunk-na0b3c5q.js:4488-5055 placement
function permissionResponseTelemetry(response) {
  let updatedPermissions = Array.isArray(response?.updatedPermissions) ? response.updatedPermissions : [];
  let n =
    response?.behavior === "deny"
      ? "deny"
      : response?.behavior !== "allow"
        ? "other"
        : updatedPermissions.length === 0
          ? "allow_once"
          : "allow_with_updates";
  let r = (o) =>
    n === "allow_with_updates" &&
    updatedPermissions.some(
      (updatedPermission) =>
        typeof updatedPermission === "object" && updatedPermission !== null && o(updatedPermission),
    );
  return {
    answer_kind: n,
    ...flagKey("answer_kind", n),
    ...(r((o) => (o.type === "addRules" || o.type === "replaceRules") && o.behavior === "allow") && {
      answer_updates_add_allow_rule: true,
    }),
    ...(r((o) => o.type === "setMode") && {
      answer_updates_set_mode: true,
    }),
    ...(r((o) => o.type === "addDirectories") && {
      answer_updates_add_directories: true,
    }),
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
var MAX_BUFFERED_STDIN_LINES = 100;
//@ chunk-na0b3c5q.js:5170-5694 placement
function parseIntEnv(e, s) {
  let n = ENV_PARSERS.int({
    min: 1,
    digitsOnly: true,
  }).parse(s);
  if (s !== undefined && n === undefined) {
    logForDebugging(
      `CLAUDE_CODE_STREAM_EVENT_MAX_LINE_BYTES is set to ${jsonStringify(s)}, which is not a whole number of at least 1, so CLAUDE_CODE_STREAM_EVENT_HOLD_MS is ignored and stream-json lines are printed as they come. To hold lines, set CLAUDE_CODE_STREAM_EVENT_MAX_LINE_BYTES to a whole number of at least 1, or unset it for no line limit.`,
      {
        level: "warn",
      },
    );
    logFeatureSad("print_stream_event_hold", "max_line_bytes_invalid");
    return;
  }
  return new StdinLineCounter({
    ...e,
    maxLineBytes: n,
  });
}
//@ chunk-na0b3c5q.js:5694-7948 placement
/**
 * 统计 stream-json 输入行数与大小、记录首个块，在超限时停止并上报。
 */
class StdinLineCounter {
  options;
  lines = [];
  count;
  lastCountTotal;
  afterBlockStart = false;
  stopped = false;
  countedUse = false;
  reportedPrintFailure = false;
  cancelTimer;
  exitHook;
  constructor(options) {
    this.options = options;
  }
  keeps(e) {
    let afterBlockStart = this.afterBlockStart;
    if (e.type === "stream_event") this.afterBlockStart = e.event.type === "content_block_start";
    if (this.stopped || isCleanupStarted()) {
      this.release();
      return false;
    }
    if (e.type === "system" && e.subtype === "thinking_tokens") {
      let h =
        e.estimated_tokens - e.estimated_tokens_delta !== this.lastCountTotal ||
        (e.estimated_tokens_delta === e.estimated_tokens && e.estimated_tokens > 0);
      this.lastCountTotal = e.estimated_tokens;
      if (h) {
        this.release();
        return false;
      }
      this.startWaitIfIdle();
      this.count =
        this.count === undefined
          ? e
          : {
              ...e,
              estimated_tokens_delta: this.count.estimated_tokens_delta + e.estimated_tokens_delta,
            };
      return true;
    }
    if (e.type !== "stream_event" || e.event.type !== "content_block_delta" || afterBlockStart) {
      this.release();
      return false;
    }
    this.startWaitIfIdle();
    let last = this.lines.at(-1);
    let r = [];
    try {
      r = last === undefined ? [] : coalesceStreamEvents([last.message, e]);
    } catch (error) {
      logForDebugging(
        `CLAUDE_CODE_STREAM_EVENT_HOLD_MS: printing a stream_event delta on its own line, because joining it to the delta before it failed: ${errorMessage(error)}`,
      );
    }
    let o = r.length === 1 ? r[0] : undefined;
    if (last !== undefined && o !== undefined) {
      let { maxLineBytes } = this.options;
      if (maxLineBytes === undefined) {
        last.message = o;
        return true;
      }
      let m = ndjsonStringify(o);
      if (Buffer.byteLength(m) <= maxLineBytes) {
        last.message = o;
        last.text = m;
        return true;
      }
    }
    this.lines.push({
      message: e,
      text: undefined,
    });
    if (this.lines.length >= MAX_BUFFERED_STDIN_LINES) this.release();
    return true;
  }
  release() {
    this.cancelTimer?.();
    this.cancelTimer = undefined;
    this.exitHook?.();
    this.exitHook = undefined;
    let { lines, count } = this;
    this.lines = [];
    this.count = undefined;
    for (let { message, text } of lines) this.options.print(message, text ?? ndjsonStringify(message));
    if (count !== undefined) this.options.print(count, ndjsonStringify(count));
  }
  stop() {
    this.stopped = true;
    this.releaseOrLog();
  }
  releaseOrLog() {
    try {
      this.release();
    } catch (error) {
      try {
        logForDebugging(
          `CLAUDE_CODE_STREAM_EVENT_HOLD_MS: printing held stream-json lines failed, and the lines not yet printed were dropped: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
        if (!this.reportedPrintFailure) {
          this.reportedPrintFailure = true;
          logError(error);
          logFeatureSad("print_stream_event_hold", "print_threw");
        }
      } catch {}
    }
  }
  startWaitIfIdle() {
    if (this.lines.length > 0 || this.count !== undefined) return;
    if (!this.countedUse) {
      this.countedUse = true;
      logFeatureOk("print_stream_event_hold");
    }
    this.cancelTimer = this.options.clock.setTimeout(() => this.releaseOrLog(), this.options.holdMs);
    this.exitHook = registerCleanup(() => this.releaseOrLog());
  }
}
//@ chunk-na0b3c5q.js:7948-8022 placement
function dialogSourceAttr(dialogKind, payload) {
  let n = dialogSourceOf(dialogKind, payload);
  return n === undefined
    ? {}
    : {
        dialog_source: shortHash(n),
      };
}
//@ chunk-na0b3c5q.js:8022-8331 placement
/**
 * stream-json 协议常量：默认/长控制请求超时、需要刷新令牌的子类型、OAuth 令牌环境变量名、SDK 停滞超时、MCP 消息超时、SDK schema 抽样率与长度上限、设置 JSON schema 及最大行字符数。
 */
var CONTROL_TIMEOUTS = 30000;
var HOST_AUTH_REFRESH_TIMEOUT_MS = 30000;
var CONTROL_REQUEST_LONG_TIMEOUT_MS = 45000;
var TOKEN_REFRESH_SUBTYPES = new Set([
  "oauth_token_refresh",
  "host_auth_token_refresh",
  "remote_control_work_secret",
]);
var OAUTH_TOKEN_ENV_NAMES = new Set([
  "CLAUDE_CODE_SESSION_ACCESS_TOKEN",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "CLAUDE_CODE_SESSIONS_OAUTH_TOKEN",
]);
var SDK_STALL_TIMEOUT_MS = 300000;
var MCP_MESSAGE_TIMEOUT_MS = 70000;
var SDK_SCHEMA_SAMPLE_RATE = 0.01;
var MAX_SAMPLED_SDK_FRAME_CHARS = 262144;
var SDK_SCHEMA_CHECK_INTERVAL_MS = 1000;
var SETTINGS_JSON_SCHEMA = DoctorLazy(() => generateSettingsJSONSchema(StdoutMessageSchema()));
var DEFAULT_MAX_LINE_CHARS = 268435456;
//@ chunk-na0b3c5q.js:8331-8617 placement
function inputTooLargeError(maxLineChars) {
  return `Error: stream-json input carried over ${Math.round(maxLineChars / 1024 / 1024)}M characters with no newline. Each stream-json message must be a single newline-terminated JSON line: either the producer is not newline-terminating its messages, or one message exceeded this budget.`;
}
//@ chunk-na0b3c5q.js:8617-8667 placement
var STDIN_LIMITS = 64;
var MAX_STDIN_CHARS_PER_LINE = 1048576;
var CONTROL_RESPONSE_TYPE = '"control_response"';
var MAX_LIVE_DEVICE_REQUESTS = 512;
//@ chunk-na0b3c5q.js:8667-8840 placement
function parseControlResponse(e) {
  let s = hookJSONOutputSchema().safeParse(e);
  if (!s.success) return null;
  return (typeof e === "object" && e !== null ? Object.keys(e).length : 0) > 0 &&
    Object.keys(s.data).length === 0
    ? null
    : s.data;
}
//@ chunk-na0b3c5q.js:8840-8955 placement
function truncatedErrorText(e) {
  let s = sanitizeDisplayText(truncateToLength(e, 4096), {
    maxCodeUnits: 512,
  });
  return e.length > 512 ? `${s}\u2026 [${e.length} chars total]` : s;
}
//@ chunk-na0b3c5q.js:8955-9057 placement
function errorFieldText(error) {
  return typeof error === "string"
    ? sanitizeDisplayText(truncateToLength(error, 4096), {
        maxCodeUnits: 200,
      })
    : "a non-string error field";
}
//@ chunk-na0b3c5q.js:9057-9233 placement
function deliveryOutcome(delivery, s) {
  if (delivery === "delivered" || s === "accepted") return "delivered";
  if (delivery === "indeterminate" || s === "indeterminate") return "indeterminate";
  return s === "sending" ? "sending" : "queued";
}
//@ chunk-na0b3c5q.js:9233-9317 placement
function subtypeOf(request) {
  return typeof request === "object" && request !== null && "subtype" in request
    ? request.subtype
    : undefined;
}
//@ chunk-na0b3c5q.js:9317-9479 placement
function normalizeDeliveryState(delivery) {
  switch (delivery) {
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
function classifyStreamError(error, s) {
  if (error instanceof StreamClosedAbortError) return "stream_closed";
  if (error instanceof ZodError) return "parse_failed";
  return s.aborted ? "timeout" : "aborted";
}
export {
  flagKey,
  configProbeEnv,
  knownSubtypeOrUndefined,
  elapsedMs,
  matchRequestId,
  parseIntEnv,
  DEFAULT_MAX_LINE_CHARS,
  CONTROL_RESPONSE_TYPE,
  STDIN_LIMITS,
  MAX_STDIN_CHARS_PER_LINE,
  inputTooLargeError,
  dialogSourceAttr,
  errorFieldText,
  isKnownControlSubtype,
  OAUTH_TOKEN_ENV_NAMES,
  TOKEN_REFRESH_SUBTYPES,
  subtypeOf,
  truncatedErrorText,
  permissionResponseTelemetry,
  SDK_STALL_TIMEOUT_MS,
  SDK_SCHEMA_SAMPLE_RATE,
  MAX_SAMPLED_SDK_FRAME_CHARS,
  SETTINGS_JSON_SCHEMA,
  SDK_SCHEMA_CHECK_INTERVAL_MS,
  classifyStreamError,
  parseControlResponse,
  MAX_LIVE_DEVICE_REQUESTS,
  deliveryOutcome,
  normalizeDeliveryState,
  MCP_MESSAGE_TIMEOUT_MS,
  CONTROL_TIMEOUTS,
  CONTROL_REQUEST_LONG_TIMEOUT_MS,
  HOST_AUTH_REFRESH_TIMEOUT_MS,
};
