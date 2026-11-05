/**
 * cli/structuredIOProtocol.ts
 *
 * 2.1.316 新增：结构化 IO（stream-json）协议常量、控制请求子类型、stdin 行计数与超限处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1m58gz0q.js (23)
 * attribution: placement 23
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-1m58gz0q.js:2504-2554 placement
var isKnownControlSubtype = (request) =>
  UiClientAnswerableRequestSchema().options.some((option) => option === request.subtype);
//@ chunk-1m58gz0q.js:2554-2641 placement
var UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
//@ chunk-1m58gz0q.js:2641-2705 placement
function matchRequestId(uuid) {
  return typeof uuid === "string" && UUID_PATTERN.test(uuid) ? uuid : undefined;
}
//@ chunk-1m58gz0q.js:2705-4512 placement
/**
 * 已知的 control_request 子类型名单（interrupt、can_use_tool、initialize、set_model、get_usage 等），用于校验与分类。
 */
var CONTROL_REQUEST_SUBTYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CONTROL_REQUEST_SUBTYPE_SET;
deferInit("chunk-1m58gz0q.js:2705", () => {
  CONTROL_REQUEST_SUBTYPES = [
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
  CONTROL_REQUEST_SUBTYPE_SET = new Set(CONTROL_REQUEST_SUBTYPES);
});
//@ chunk-1m58gz0q.js:4512-4575 placement
function knownSubtypeOrUndefined(subtype) {
  return typeof subtype === "string" && CONTROL_REQUEST_SUBTYPE_SET.has(subtype) ? subtype : undefined;
}
//@ chunk-1m58gz0q.js:4575-4618 placement
function flagKey(prefix, value) {
  return {
    [`${prefix}_${value}`]: true,
  };
}
//@ chunk-1m58gz0q.js:4618-5186 placement
function permissionResponseTelemetry(response) {
  let updatedPermissions = Array.isArray(response?.updatedPermissions) ? response.updatedPermissions : [];
  let kind =
    response?.behavior === "deny"
      ? "deny"
      : response?.behavior !== "allow"
        ? "other"
        : updatedPermissions.length === 0
          ? "allow_once"
          : "allow_with_updates";
  let hasUpdate = (predicate) =>
    kind === "allow_with_updates" &&
    updatedPermissions.some(
      (updatedPermission) =>
        typeof updatedPermission === "object" && updatedPermission !== null && predicate(updatedPermission),
    );
  return {
    answer_kind: kind,
    ...flagKey("answer_kind", kind),
    ...(hasUpdate(
      (update) =>
        (update.type === "addRules" || update.type === "replaceRules") && update.behavior === "allow",
    ) && {
      answer_updates_add_allow_rule: true,
    }),
    ...(hasUpdate((update) => update.type === "setMode") && {
      answer_updates_set_mode: true,
    }),
    ...(hasUpdate((update) => update.type === "addDirectories") && {
      answer_updates_add_directories: true,
    }),
  };
}
//@ chunk-1m58gz0q.js:5186-5241 placement
function elapsedMs(startedAt) {
  return Math.round(performance.now() - startedAt);
}
//@ chunk-1m58gz0q.js:5241-5290 placement
function configProbeEnv() {
  return env.CLAUDE_CODE_CONFIG_PROBE;
}
//@ chunk-1m58gz0q.js:5290-5301 placement
var MAX_BUFFERED_STDIN_LINES = 100;
//@ chunk-1m58gz0q.js:5301-5825 placement
function parseIntEnv(options, value) {
  let maxLineBytes = ENV_PARSERS.int({
    min: 1,
    digitsOnly: true,
  }).parse(value);
  if (value !== undefined && maxLineBytes === undefined) {
    logForDebugging(
      `CLAUDE_CODE_STREAM_EVENT_MAX_LINE_BYTES is set to ${jsonStringify(value)}, which is not a whole number of at least 1, so CLAUDE_CODE_STREAM_EVENT_HOLD_MS is ignored and stream-json lines are printed as they come. To hold lines, set CLAUDE_CODE_STREAM_EVENT_MAX_LINE_BYTES to a whole number of at least 1, or unset it for no line limit.`,
      {
        level: "warn",
      },
    );
    logFeatureSad("print_stream_event_hold", "max_line_bytes_invalid");
    return;
  }
  return new StdinLineCounter({
    ...options,
    maxLineBytes,
  });
}
//@ chunk-1m58gz0q.js:5825-8079 placement
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
  keeps(message) {
    let afterBlockStart = this.afterBlockStart;
    if (message.type === "stream_event") this.afterBlockStart = message.event.type === "content_block_start";
    if (this.stopped || isCleanupStarted()) {
      this.release();
      return false;
    }
    if (message.type === "system" && message.subtype === "thinking_tokens") {
      let discontinuity =
        message.estimated_tokens - message.estimated_tokens_delta !== this.lastCountTotal ||
        (message.estimated_tokens_delta === message.estimated_tokens && message.estimated_tokens > 0);
      this.lastCountTotal = message.estimated_tokens;
      if (discontinuity) {
        this.release();
        return false;
      }
      this.startWaitIfIdle();
      this.count =
        this.count === undefined
          ? message
          : {
              ...message,
              estimated_tokens_delta: this.count.estimated_tokens_delta + message.estimated_tokens_delta,
            };
      return true;
    }
    if (message.type !== "stream_event" || message.event.type !== "content_block_delta" || afterBlockStart) {
      this.release();
      return false;
    }
    this.startWaitIfIdle();
    let last = this.lines.at(-1);
    let coalesced = [];
    try {
      coalesced = last === undefined ? [] : coalesceStreamEvents([last.message, message]);
    } catch (error) {
      logForDebugging(
        `CLAUDE_CODE_STREAM_EVENT_HOLD_MS: printing a stream_event delta on its own line, because joining it to the delta before it failed: ${errorMessage(error)}`,
      );
    }
    let merged = coalesced.length === 1 ? coalesced[0] : undefined;
    if (last !== undefined && merged !== undefined) {
      let { maxLineBytes } = this.options;
      if (maxLineBytes === undefined) {
        last.message = merged;
        return true;
      }
      let text = ndjsonStringify(merged);
      if (Buffer.byteLength(text) <= maxLineBytes) {
        last.message = merged;
        last.text = text;
        return true;
      }
    }
    this.lines.push({
      message,
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
//@ chunk-1m58gz0q.js:8079-8153 placement
function dialogSourceAttr(dialogKind, payload) {
  let source = dialogSourceOf(dialogKind, payload);
  return source === undefined
    ? {}
    : {
        dialog_source: shortHash(source),
      };
}
//@ chunk-1m58gz0q.js:8153-8498 placement
/**
 * stream-json 协议常量：默认/长控制请求超时、需要刷新令牌的子类型、OAuth 令牌环境变量名、SDK 停滞超时、MCP 消息超时、SDK schema 抽样率与长度上限、设置 JSON schema 及最大行字符数。
 */
var CONTROL_TIMEOUTS; // deferred: uses DoctorLazy (./handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var HOST_AUTH_REFRESH_TIMEOUT_MS;
var CONTROL_REQUEST_LONG_TIMEOUT_MS;
var TOKEN_REFRESH_SUBTYPES;
var OAUTH_TOKEN_ENV_NAMES;
var CLAUDE_CODE_PROGRAM_USE_CASE_ID;
var SDK_STALL_TIMEOUT_MS;
var MCP_MESSAGE_TIMEOUT_MS;
var SDK_SCHEMA_SAMPLE_RATE;
var MAX_SAMPLED_SDK_FRAME_CHARS;
var SDK_SCHEMA_CHECK_INTERVAL_MS;
var SETTINGS_JSON_SCHEMA;
var DEFAULT_MAX_LINE_CHARS;
deferInit("chunk-1m58gz0q.js:8153", () => {
  CONTROL_TIMEOUTS = 30000;
  HOST_AUTH_REFRESH_TIMEOUT_MS = 30000;
  CONTROL_REQUEST_LONG_TIMEOUT_MS = 45000;
  TOKEN_REFRESH_SUBTYPES = new Set([
    "oauth_token_refresh",
    "host_auth_token_refresh",
    "remote_control_work_secret",
  ]);
  OAUTH_TOKEN_ENV_NAMES = new Set([
    "CLAUDE_CODE_SESSION_ACCESS_TOKEN",
    "CLAUDE_CODE_OAUTH_TOKEN",
    "CLAUDE_CODE_SESSIONS_OAUTH_TOKEN",
  ]);
  CLAUDE_CODE_PROGRAM_USE_CASE_ID = "CLAUDE_CODE_PROGRAM_USE_CASE_ID";
  SDK_STALL_TIMEOUT_MS = 300000;
  MCP_MESSAGE_TIMEOUT_MS = 70000;
  SDK_SCHEMA_SAMPLE_RATE = 0.01;
  MAX_SAMPLED_SDK_FRAME_CHARS = 262144;
  SDK_SCHEMA_CHECK_INTERVAL_MS = 1000;
  SETTINGS_JSON_SCHEMA = DoctorLazy(() => generateSettingsJSONSchema(StdoutMessageSchema()));
  DEFAULT_MAX_LINE_CHARS = 268435456;
});
//@ chunk-1m58gz0q.js:8498-8784 placement
function inputTooLargeError(maxLineChars) {
  return `Error: stream-json input carried over ${Math.round(maxLineChars / 1024 / 1024)}M characters with no newline. Each stream-json message must be a single newline-terminated JSON line: either the producer is not newline-terminating its messages, or one message exceeded this budget.`;
}
//@ chunk-1m58gz0q.js:8784-8834 placement
var STDIN_LIMITS = 64;
var MAX_STDIN_CHARS_PER_LINE = 1048576;
var CONTROL_RESPONSE_TYPE = '"control_response"';
var MAX_LIVE_DEVICE_REQUESTS = 512;
//@ chunk-1m58gz0q.js:8834-9007 placement
function parseControlResponse(value) {
  let parsed = hookJSONOutputSchema().safeParse(value);
  if (!parsed.success) return null;
  return (typeof value === "object" && value !== null ? Object.keys(value).length : 0) > 0 &&
    Object.keys(parsed.data).length === 0
    ? null
    : parsed.data;
}
//@ chunk-1m58gz0q.js:9007-9121 placement
function truncatedErrorText(text) {
  let safe = sanitizeDisplayText(truncateToLength(text, 4096), {
    maxCodeUnits: 512,
  });
  return text.length > 512 ? `${safe}\u2026 [${text.length} chars total]` : safe;
}
//@ chunk-1m58gz0q.js:9121-9222 placement
function errorFieldText(error) {
  return typeof error === "string"
    ? sanitizeDisplayText(truncateToLength(error, 4096), {
        maxCodeUnits: 200,
      })
    : "a non-string error field";
}
//@ chunk-1m58gz0q.js:9222-9398 placement
function deliveryOutcome(delivery, uploadState) {
  if (delivery === "delivered" || uploadState === "accepted") return "delivered";
  if (delivery === "indeterminate" || uploadState === "indeterminate") return "indeterminate";
  return uploadState === "sending" ? "sending" : "queued";
}
//@ chunk-1m58gz0q.js:9398-9482 placement
function subtypeOf(request) {
  return typeof request === "object" && request !== null && "subtype" in request
    ? request.subtype
    : undefined;
}
//@ chunk-1m58gz0q.js:9482-9644 placement
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
//@ chunk-1m58gz0q.js:9644-9778 placement
function classifyStreamError(error, signal) {
  if (error instanceof StreamClosedAbortError) return "stream_closed";
  if (error instanceof ZodError) return "parse_failed";
  return signal.aborted ? "timeout" : "aborted";
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
  CLAUDE_CODE_PROGRAM_USE_CASE_ID,
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
