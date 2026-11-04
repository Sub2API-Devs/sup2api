/**
 * entrypoints/sdk/coreSchemas.ts
 *
 * 并入已有模块：SDK 核心消息与数据结构的 zod schema（system/assistant/result/限额事件、权限显示、模型用量、钩子输入等），316 增加了 away summary 等新消息类型。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/entrypoints/sdk/coreSchemas.ts
 * pieces: chunk-0h4e7gnq.js (1), chunk-0sfjpx19.js (2), chunk-18hwfzwa.js (1), chunk-54xbtc53.js (3), chunk-55ht3bcx.js (2), chunk-583vs41k.js (1), chunk-61a1pjwa.js (1), chunk-ah34pb7m.js (1), chunk-bfnfj4kx.js (1), chunk-bwbq4xvm.js (44), chunk-bzb0qnrm.js (15), chunk-dcmhvw5a.js (1), chunk-e5gvqyfh.js (1), chunk-e6aww6q8.js (13), chunk-hwmsct5x.js (1), chunk-hyjyj8hj.js (4), chunk-jy3v56kg.js (1), chunk-spwda8nt.js (1), chunk-tyg7f3ek.js (2), chunk-w5ndchqs.js (1)
 * attribution: fingerprint 32, sole-consumer 3, placement 45, layout 13, file-local 2, affinity 2
 */
import { randomUUID } from "crypto";
import { isAbsolute, sep } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  looseObject,
  literal,
  _enum,
  union,
  array,
  booleanSchema,
  unknown,
  record,
  numberSchema,
  preprocess,
  discriminatedUnion,
  lazy,
  nullSchema,
  zodStrictObject,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { parseToolPolicyEntry } from "../../services/mcp/serverIdentity.js";
import {
  normalizePermissionModeAlias,
  PERMISSION_DECISION_REASON_TYPES,
  DECISION_REASON_CODES,
  parsePermissionMode,
} from "../../types/permissions.js";
import { TRANSPORT_LABELS, GLOBAL_CONFIG_FIELD_KINDS } from "../../utils/config.js";
import {
  CAPABILITY_BLOCK_KINDS,
  AUTH_PROVIDER_VALUES,
  BLOCKABLE_FEATURES,
  FEATURE_DISABLED_CAUSES,
  POLICY_DENIAL_KINDS,
} from "../../services/policyLimits/capabilityBlocks.js";
import { getClaudeAIOAuthTokens, getSubscriptionType, getUsageCreditsCommand } from "../../utils/auth.js";
import { tokenDigest } from "../../services/policyLimits/cacheStamp.js";
import { getPolicyLimitsState, getPolicyPrincipal } from "../../services/policyLimits/policyState.js";
import { getDefaultMainLoopModel } from "../../utils/model/modelFallback.js";
import { parseUserSpecifiedModel, isUsageCreditsOnlyModel } from "../../utils/model/modelDisplay.js";
import {
  modelSupportsEffort,
  EFFORT_LEVELS,
  modelSupportsMaxEffort,
  modelSupportsXhighEffort,
} from "../../utils/effort.js";
import { modelSupportsAdaptiveThinkingByCatalog, isThinkingAlwaysOn } from "../../utils/thinking.js";
import { supportsFastMode } from "../../utils/fastMode.js";
import { modelSupportsAutoMode } from "../../utils/betas.js";
import {
  isUsageBasedBilling,
  isConsumerPlan,
  isModelBilledOrRequired,
  usesPayAsYouGo,
} from "../../utils/planTiers.js";
import { formatResetTimeWithLocale } from "../../utils/format.js";
import {
  getLimitReachedText,
  rateLimitWindowLabel,
  formatLimitReachedText,
  getAskAdminSuffix,
} from "../../services/rateLimitMessages.js";
import {
  ORG_SPEND_CAP_REASONS,
  CHANNEL_SPEND_LIMIT_TEXT,
  ORG_RAISE_HINT,
  INDIVIDUAL_SPEND_LIMIT_TEXT,
  isVellumAnchorEnabled,
  CHANNEL_USAGE_LIMIT_TEXT,
  INDIVIDUAL_USAGE_LIMIT_TEXT,
} from "../../services/api/usage.js";
import { HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE, USAGE_SETTINGS_URL } from "../../services/claudeAiLimits.js";
import {
  SUBSCRIPTION_PAYMENT_ISSUE_MESSAGE,
  VERIFICATION_REQUIRED_NEEDS,
} from "../../services/sessionStatus/sessionStateClassifier.js";
import { omitUndefined } from "../../plugins/functionHooks/classicHookBridge.js";
import { shouldEmitHookEvent } from "../../utils/hooks/hookEvents.js";
import { getHookEventEmitState } from "../../utils/hooks/hookEventHelpers.js";
import { enqueueTaskNotification as enqueueTaskNotification_2 } from "../../utils/task/taskNotifications.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { MAX_OUTPUT_TOKENS_CAP } from "../../services/compact/autoCompactWindow.js";
import { sendKeepaliveNow } from "../../utils/sessionActivity.js";
import { hasWorktreeRemoveHook as hasWorktreeRemoveHook_2 } from "../../utils/hooks/worktreeHooks.js";
import { hasClassicHookSite } from "../../plugins/functionHooks/toolCallHooks.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { fileEditOutputSchema } from "../../../vendor/diff/lib/index.mjs";
import { fileWriteOutputSchemaExtension } from "../../tools/FileWriteTool/FileWriteTool.js";
import { formatOrgSpendCapError } from "../../services/api/errors.js";
import { looksLikeSlashInput } from "../../commands.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  getSessionId,
  getProjectRoot,
  getAdditionalDirectoriesForClaudeMd,
  getOriginalCwd,
} from "../../bootstrap/state.js";
import { notifyProactivityChanged } from "../../cli/print/proactivityControl.js";
import { apiMessageIdField } from "../../cli/print/sdkMessageStream.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { isBlockingHookOutput } from "../../utils/hooks/hookSpecificOutput.js";
import { ownValue, hasAnswer } from "../../components/FeedbackSurvey/OrgSurveyDialog.js";
import { writeToStdout } from "../../utils/process.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { firstErrorText } from "../../cli/headlessCloud/cloudPrint.js";
import { sanitizeCloudText } from "../../cli/cloudSession/headlessCloudClient.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import {
  remoteHookCallerSchema,
  jsonInputSchema,
  PATH_FIELD_NAME_REGEX,
  PATH_LIKE_FIELDS,
  PluginHookServedCallError,
  HOOK_CONDITION_UNKNOWN_TEXT,
  fitHookResult,
  shrinkHookStdout,
  RemotePluginHookError,
  POLICY_UNREADABLE_TEXT,
  HOOKS_DISABLED_TEXT,
  policyLoadFailureRefusesPluginHooks,
  POLICY_BLOCKS_START_TEXT,
  PLUGINS_NOT_SETTLED_TEXT,
  HOOK_OUTPUT_MAX_CHARS,
  HOOK_OUTPUT_CUT_TEXT,
  HOOK_DROPPED_FIELDS,
  HOOK_TEXT_FIELDS,
  HOOK_UPDATED_OUTPUT_FIELDS,
  withDroppedOutputNote,
} from "../../services/remoteTools/runPluginHook.js";
import { getCwd } from "../../utils/cwd.js";
import { isSubpathOf } from "../../utils/pathPrefix.js";
import { findToolByName } from "../../Tool.js";
import {
  serveModeTools,
  coerceServedInput,
  SERVE_MODE_VALUE,
  serveModeInput,
} from "../mcpServe/serveModeInput.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { pickAlias, import_mapValues, import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { claudeEnvContextFrom } from "../../utils/claudeSubprocessEnv.js";
import { getAllBaseTools } from "../../tools.js";
import {
  evaluateHookIfPattern,
  execPluginCommandHook,
  GUARD_AND_FEEDBACK_EVENTS,
  HOOK_CHECK_UNAVAILABLE_MESSAGE,
  isHookSourceAllowed,
  shouldSkipHookDueToTrust,
} from "../../utils/hooks.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { invalidateSessionEnvCache } from "../../utils/sessionEnvironment.js";
import { isHookPolicyUnanswered } from "../../commands/goal/goal.js";
import { logError } from "../../utils/log.js";
import { withDeadline } from "../../utils/sleep.js";
import { waitForOrganizationHookPolicy, DENY } from "../../utils/hooks/hookPolicyHold.js";
import {
  ORGANIZATION_ANSWER_TIMEOUT_MS,
  askOrganizationOnce,
  organizationAnswerState,
} from "../../utils/plugins/commandSource.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { policySettingsUnreadable } from "../../utils/hooks/hooksConfigSnapshot.js";
import { syncedPluginFolderId, loadAllPluginsCacheOnly } from "../../utils/plugins/pluginLoader.js";
import { syncedItemPath } from "../../utils/plugins/syncedItems.js";
import { marketplaceSuffix } from "../../utils/plugins/pluginIdentifier.js";
import { SYNCED } from "../../utils/telemetry/pluginTelemetry.js";
import { isPluginsSyncVetoed, isSyncPaused } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:11101-11729 fingerprint (2.1.88 match: HOOK_EVENTS, 0.829)
/**
 * 全部钩子事件名（33 个，含 316 新增的 PostToolBatch、UserPromptExpansion、StopFailure、PreModelSwitch/PostModelSwitch、DirectoryAdded、MessageDisplay 等）、SessionEnd 原因、系统提示词动态边界标记。
 */
var HOOK_EVENTS = [
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PostToolBatch",
  "Notification",
  "UserPromptSubmit",
  "UserPromptExpansion",
  "SessionStart",
  "SessionEnd",
  "Stop",
  "StopFailure",
  "SubagentStart",
  "SubagentStop",
  "PreCompact",
  "PostCompact",
  "PreModelSwitch",
  "PostModelSwitch",
  "PermissionRequest",
  "PermissionDenied",
  "Setup",
  "TeammateIdle",
  "TaskCreated",
  "TaskCompleted",
  "Elicitation",
  "ElicitationResult",
  "ConfigChange",
  "WorktreeCreate",
  "WorktreeRemove",
  "InstructionsLoaded",
  "CwdChanged",
  "FileChanged",
  "DirectoryAdded",
  "MessageDisplay",
];
var SESSION_END_REASONS_2 = ["clear", "resume", "logout", "prompt_input_exit", "other"];
var SYSTEM_PROMPT_DYNAMIC_BOUNDARY = "__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__";
//@ chunk-bwbq4xvm.js:176170-176794 placement
/**
 * SDK 错误码清单：模型不可用、权限模式、Remote Control、worker epoch、MCP 客户端注册、读取拒绝等错误子类，pA 汇总为全集。
 */
var MODEL_UNAVAILABLE_REASONS = [
  "invalid_request",
  "catalog_unknown",
  "not_found",
  "restricted_by_org",
  "unavailable_for_account",
  "not_offered",
  "alias_1m_disabled",
  "alias_1m_unsupported",
  "blocked_by_hook",
  "check_failed",
  "check_rejected",
  "credits_required",
  "rate_limit",
  "auth_failed",
  "model_not_current",
  "verdict_pending",
  "internal_error",
];
var PERMISSION_MODE_ERROR_CODES = [
  "invalid_mode",
  "bypass_restricted",
  "bypass_disabled",
  "bypass_not_launched",
  "auto_mode_settings",
  "auto_mode_circuit_breaker",
  "auto_mode_fast_mode",
  "auto_mode_model",
  "auto_mode_unavailable",
];
var REMOTE_CONTROL_ERROR_CODES = [
  "remote_control_auth",
  "remote_control_terminal",
  "remote_control_ended_elsewhere",
  "remote_control_policy_disabled",
];
//@ chunk-bwbq4xvm.js:176794-176989 placement
function remoteControlErrorCode(info) {
  switch (info) {
    case "auth":
      return "remote_control_auth";
    case "ended_elsewhere":
      return "remote_control_ended_elsewhere";
    case "terminal":
      return "remote_control_terminal";
    case "network":
      return;
  }
}
//@ chunk-bwbq4xvm.js:176989-177182 placement
var WORKSPACE_ERROR_CODES; // deferred: uses MODEL_UNAVAILABLE_REASONS of its import cycle while loading; runs once the cycle is complete
var WORKER_EPOCH_ERROR_CODES;
var MCP_REGISTRATION_ERROR_CODES;
var READ_ERROR_CODES;
var SDK_ERROR_CODES;
deferInit("chunk-bwbq4xvm.js:176989", () => {
  WORKSPACE_ERROR_CODES = ["workspace_diff_pending"];
  WORKER_EPOCH_ERROR_CODES = ["stale_worker_epoch", "invalid_worker_epoch"];
  MCP_REGISTRATION_ERROR_CODES = ["mcp_client_registration_unavailable"];
  READ_ERROR_CODES = ["read_denied"];
  SDK_ERROR_CODES = [
    ...MODEL_UNAVAILABLE_REASONS,
    ...PERMISSION_MODE_ERROR_CODES,
    ...REMOTE_CONTROL_ERROR_CODES,
    ...WORKSPACE_ERROR_CODES,
    ...WORKER_EPOCH_ERROR_CODES,
    ...MCP_REGISTRATION_ERROR_CODES,
    ...READ_ERROR_CODES,
  ];
});
//@ chunk-bwbq4xvm.js:177182-177228 placement
var THINKING_DISPLAY_MODES = ["summarized", "omitted", "highlights"];
//@ chunk-bwbq4xvm.js:177228-177267 placement
function isThinkingDisplayMode(thinkingDisplay) {
  return THINKING_DISPLAY_MODES.includes(thinkingDisplay);
}
//@ chunk-bwbq4xvm.js:177304-177444 placement
var MESSAGE_DELIVERY_MODES = ["durable_post", "ephemeral_post", "retry_backoff", "hold", "none"];
var DEFERRED_KINDS = ["orphaned_permission", "turn_handoff", "deferred_tool_use", "none"];
//@ chunk-bwbq4xvm.js:177444-177913 placement
/**
 * 给 result 消息补充 subagent_stats 等附加统计字段（非 result 消息原样返回）。
 */
function withResultExtras(message, extras) {
  if (message.type !== "result") return message;
  let subagentStats =
    extras.subagentStats !== undefined
      ? {
          subagent_stats: extras.subagentStats,
        }
      : {};
  let withExtras =
    message.safety_stops !== undefined
      ? {
          safety_stops: Math.max(message.safety_stops, extras.safetyStops),
        }
      : {};
  if (message.total_cost_usd !== undefined && extras.totalCostUsd < message.total_cost_usd)
    return {
      ...message,
      ...subagentStats,
      ...withExtras,
    };
  return {
    ...message,
    total_cost_usd: extras.totalCostUsd,
    duration_api_ms: message.duration_api_ms === 0 ? message.duration_api_ms : extras.durationApiMs,
    modelUsage: extras.modelUsage,
    ...(extras.usage !== undefined && {
      usage: extras.usage,
    }),
    ...subagentStats,
    ...withExtras,
  };
}
//@ chunk-bwbq4xvm.js:177913-178053 placement
function normalizeCustomSubtype(localCommand) {
  let replaced = localCommand
    .toLowerCase()
    .replace(/[^a-z]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64)
    .replace(/_+$/, "");
  return replaced === "" ? "custom" : replaced;
}
//@ chunk-bwbq4xvm.js:178053-178211 placement
/**
 * 按开始时间、公共字段和变体构造 SDK result 消息（duration_ms 等计时字段）。
 */
function buildResultMessage({ startedAt, common, variant }) {
  let message = {
    type: "result",
    duration_ms: Math.max(0, Math.round(performance.now() - startedAt)),
    uuid: randomUUID(),
  };
  return {
    ...common,
    ...variant,
    ...message,
  };
}
//@ chunk-bwbq4xvm.js:178211-178610 placement
/**
 * 查询循环终止原因：错误类（blocking_limit、prompt_too_long、model_error、api_error…）与其他类（budget_exhausted、结构化输出重试耗尽…），_A 为全集。
 */
var TERMINAL_ERROR_REASONS = [
  "blocking_limit",
  "rapid_refill_breaker",
  "prompt_too_long",
  "image_error",
  "model_error",
  "api_error",
  "malformed_tool_use_exhausted",
  "aborted_streaming",
  "aborted_tools",
  "stop_hook_prevented",
  "hook_stopped",
  "tool_deferred",
  "max_turns",
  "background_requested",
  "completed",
];
var TERMINAL_OTHER_REASONS = [
  "budget_exhausted",
  "structured_output_retry_exhausted",
  "tool_deferred_unavailable",
  "turn_setup_failed",
];
var TERMINAL_REASONS = [...TERMINAL_ERROR_REASONS, ...TERMINAL_OTHER_REASONS];
//@ chunk-bwbq4xvm.js:178610-178677 placement
function isAbortedTerminalReason(terminalReason) {
  return terminalReason === "aborted_streaming" || terminalReason === "aborted_tools";
}
//@ chunk-bwbq4xvm.js:178677-179206 placement
function isErrorTerminalReason(reason) {
  if (reason === undefined) return false;
  switch (reason) {
    case "blocking_limit":
    case "rapid_refill_breaker":
    case "prompt_too_long":
    case "image_error":
    case "model_error":
    case "api_error":
    case "malformed_tool_use_exhausted":
    case "budget_exhausted":
    case "structured_output_retry_exhausted":
    case "tool_deferred_unavailable":
    case "turn_setup_failed":
      return true;
    case "aborted_streaming":
    case "aborted_tools":
    case "stop_hook_prevented":
    case "hook_stopped":
    case "tool_deferred":
    case "max_turns":
    case "background_requested":
    case "completed":
      return false;
    default:
      return false;
  }
}
//@ chunk-bwbq4xvm.js:179206-179299 placement
function terminalReasonTag(reason) {
  return reason.reason === "api_error" ? `api_error_${reason.errorKind ?? "unknown"}` : reason.reason;
}
//@ chunk-bwbq4xvm.js:179299-179336 placement
function isAbnormalTerminalReason(reason) {
  return isAbortedTerminalReason(reason) || isErrorTerminalReason(reason);
}
//@ chunk-bwbq4xvm.js:179336-179406 placement
/**
 * 某状态 kind 枚举（unavailable_headless/unknown/failed/restart_required）（归属疑似错误）。
 */
var UNAVAILABLE_KINDS = ["unavailable_headless", "unknown", "failed", "restart_required"];
//@ chunk-bwbq4xvm.js:179406-179497 placement (2.1.88 match: extractMarkupText, 1)
/**
 * 对象的 kind 是否属于上述枚举（误配名 extractMarkupText）。
 */
function isKnownMessageKind(contents) {
  return (
    typeof contents === "object" &&
    contents !== null &&
    "kind" in contents &&
    UNAVAILABLE_KINDS.some((item) => item === contents.kind)
  );
}
//@ chunk-bwbq4xvm.js:179497-179844 placement
var PROMPT_HOOK_ENDINGS = [
  "blocked_by_hook",
  "stopped_by_hook",
  "dropped_by_hook",
  "not_passed_on",
  "no_verdict",
];
var PROMPT_NO_VERDICT_KINDS = [
  "remote_run_failed",
  "remote_run_timed_out",
  "interrupted",
  "remote_runner_refused",
  "unsupported_in_cloud_session",
  "output_distrusted",
  "callback_timed_out",
  "hook_failed",
  "hook_timed_out",
  "hooks_never_ran",
  "personal_config_refused",
  "rewrite_unplaceable",
];
//@ chunk-bwbq4xvm.js:179844-179991 placement
/**
 * UserPromptSubmit 钩子结果转成 promptEnding 字段（noVerdict 或阻断原因），其他事件返回 {}。
 */
function promptEndingFields(hookEvent, hookEvent_2) {
  if (hookEvent !== "UserPromptSubmit") return {};
  if ("noVerdict" in hookEvent_2)
    return {
      promptEnding: hookEvent_2,
    };
  return hookEvent_2.reason
    ? {
        promptEnding: {
          reason: hookEvent_2.reason,
        },
      }
    : {};
}
//@ chunk-bwbq4xvm.js:179991-180429 placement
var SUBAGENT_REPORT_DISPOSITIONS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var HandbackReportSchema;
deferInit("chunk-bwbq4xvm.js:179991", () => {
  SUBAGENT_REPORT_DISPOSITIONS = ["send", "flagged", "withheld"];
  HandbackReportSchema = DoctorLazy(() =>
    objectSchema({
      text: stringSchema().describe(
        "The subagent's whole report, never truncated, with a backslash inserted into text that imitates harness markup, such as a system tag (`<system-reminder>`), a `[harness:` line or a turn marker (`Human:` at the start of a line)",
      ),
      warning: stringSchema()
        .optional()
        .describe(
          "Auto mode's warning to show above `text`: a SECURITY WARNING, or a note that the review could not run",
        ),
    }),
  );
});
//@ chunk-bwbq4xvm.js:180429-180637 placement
var MOBILE_APP_KINDS = ["ios_app", "android_app"];
var MOBILE_DEV_SIGNALS = [
  "swift_edit",
  "uikit_import",
  "xcode_project",
  "ios_command",
  "kotlin_edit",
  "java_edit",
  "android_import",
  "android_manifest",
  "gradle_plugin",
  "android_command",
  "project_scan",
];
//@ chunk-bwbq4xvm.js:180637-180698 placement
function trueOrUndefined(textNotTyped) {
  return textNotTyped === undefined || textNotTyped === null || textNotTyped === false ? undefined : true;
}
//@ chunk-bwbq4xvm.js:180698-180768 placement
function isTextNotTyped(input) {
  return "text_not_typed" in input && trueOrUndefined(input.text_not_typed) === true;
}
//@ chunk-bwbq4xvm.js:180768-181101 placement
var SERVER_TOOL_BLOCK_TYPES = [
  "server_tool_use",
  "web_search_tool_result",
  "web_fetch_tool_result",
  "advisor_tool_result",
  "code_execution_tool_result",
  "bash_code_execution_tool_result",
  "text_editor_code_execution_tool_result",
  "tool_search_tool_result",
  "mcp_tool_use",
  "mcp_tool_result",
  "container_upload",
  "compaction",
  "fallback",
];
var NON_USER_BLOCK_TYPES = [...SERVER_TOOL_BLOCK_TYPES, "mid_conv_system"];
//@ chunk-bwbq4xvm.js:181101-181139 placement
function literalTypeSchema(literal_2) {
  return looseObject({
    type: literal(literal_2),
  });
}
//@ chunk-bwbq4xvm.js:181139-186487 placement
var EphemeralBlockSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var cacheControlField;
var Base64BlockSchema;
var UrlBlockSchema;
var FileBlockSchema;
var ImageSourceSchema;
var ImageBlockSchema;
var Base64Block2Schema;
var TextBlockSchema;
var UrlBlock2Schema;
var FileBlock2Schema;
var TextOrImageBlockSchema;
var TextOrImageBlockListSchema;
var ContentBlockSchema;
var DocumentSourceSchema;
var CitationsEnabledSchema;
var DocumentBlockSchema;
var TextBlock2Schema;
var SearchResultBlockSchema;
var ToolUseBlockSchema;
var ToolReferenceBlockSchema;
var DocumentContentBlockSchema;
var DocumentContentBlocksSchema;
var ToolResultBlockSchema;
var RequestContentBlockSchema;
var RequestContentBlocksSchema;
var RequestContentSchema;
var UserMessageParamSchema;
var TextBlock3Schema;
var ToolUseBlock2Schema;
var ThinkingBlockSchema;
var RedactedThinkingBlockSchema;
var ResponseContentBlockSchema;
var CacheCreationUsageSchema;
var ServerToolUseUsageSchema;
var ThinkingUsageSchema;
var UsageSchema;
var MessageBlockSchema;
deferInit("chunk-bwbq4xvm.js:181139", () => {
  EphemeralBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("ephemeral"),
      ttl: _enum(["5m", "1h"]).optional(),
    }),
  );
  cacheControlField = () =>
    EphemeralBlockSchema().nullable().optional().describe("Cache breakpoint at this block.");
  Base64BlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("base64"),
      media_type: stringSchema().describe("image/jpeg, image/png, image/gif or image/webp."),
      data: stringSchema(),
    }),
  );
  UrlBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("url"),
      url: stringSchema(),
    }),
  );
  FileBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("file"),
      file_id: stringSchema(),
    }).describe("A Files API upload (beta surface)."),
  );
  ImageSourceSchema = DoctorLazy(() =>
    union([Base64BlockSchema(), UrlBlockSchema(), FileBlockSchema()]).describe(
      "Where the image bytes come from (inline base64, a URL, or a file upload).",
    ),
  );
  ImageBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("image"),
      source: ImageSourceSchema(),
      cache_control: cacheControlField(),
    }),
  );
  Base64Block2Schema = DoctorLazy(() =>
    objectSchema({
      type: literal("base64"),
      media_type: stringSchema().describe("application/pdf."),
      data: stringSchema(),
    }),
  );
  TextBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("text"),
      media_type: stringSchema().describe("text/plain."),
      data: stringSchema(),
    }),
  );
  UrlBlock2Schema = DoctorLazy(() =>
    objectSchema({
      type: literal("url"),
      url: stringSchema(),
    }),
  );
  FileBlock2Schema = DoctorLazy(() =>
    objectSchema({
      type: literal("file"),
      file_id: stringSchema(),
    }).describe("A Files API upload (beta surface)."),
  );
  TextOrImageBlockSchema = DoctorLazy(() => union([TextBlock2Schema(), ImageBlockSchema()]));
  TextOrImageBlockListSchema = DoctorLazy(() => array(TextOrImageBlockSchema()));
  ContentBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("content"),
      content: union([stringSchema(), TextOrImageBlockListSchema()]),
    }).describe("Document content given inline as text and image blocks."),
  );
  DocumentSourceSchema = DoctorLazy(() =>
    union([
      Base64Block2Schema(),
      TextBlockSchema(),
      ContentBlockSchema(),
      UrlBlock2Schema(),
      FileBlock2Schema(),
    ]).describe(
      "Where the document comes from (inline base64 PDF, inline text, inline blocks, a URL, or a file upload).",
    ),
  );
  CitationsEnabledSchema = DoctorLazy(() =>
    objectSchema({
      enabled: booleanSchema().optional(),
    }),
  );
  DocumentBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("document"),
      source: DocumentSourceSchema(),
      title: stringSchema().nullable().optional(),
      context: stringSchema().nullable().optional(),
      citations: CitationsEnabledSchema().nullable().optional(),
      cache_control: cacheControlField(),
    }),
  );
  TextBlock2Schema = DoctorLazy(() =>
    objectSchema({
      type: literal("text"),
      text: stringSchema(),
      citations: array(unknown())
        .nullable()
        .optional()
        .describe(
          "Citation locations (char_location, page_location, content_block_location, web_search_result_location, search_result_location), as the API defines them.",
        ),
      cache_control: cacheControlField(),
    }),
  );
  SearchResultBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("search_result"),
      source: stringSchema(),
      title: stringSchema(),
      content: array(TextBlock2Schema()),
      citations: CitationsEnabledSchema().optional(),
      cache_control: cacheControlField(),
    }),
  );
  ToolUseBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("tool_use"),
      id: stringSchema(),
      name: stringSchema(),
      input: record(stringSchema(), unknown()).describe(
        "The tool's input object; its shape is the named tool's input schema.",
      ),
      cache_control: cacheControlField(),
    }),
  );
  ToolReferenceBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("tool_reference"),
      tool_name: stringSchema(),
    }),
  );
  DocumentContentBlockSchema = DoctorLazy(() =>
    union([
      TextBlock2Schema(),
      ImageBlockSchema(),
      SearchResultBlockSchema(),
      DocumentBlockSchema(),
      ToolReferenceBlockSchema(),
    ]),
  );
  DocumentContentBlocksSchema = DoctorLazy(() => array(DocumentContentBlockSchema()));
  ToolResultBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("tool_result"),
      tool_use_id: stringSchema(),
      content: union([stringSchema(), DocumentContentBlocksSchema()])
        .optional()
        .describe("The tool output: a string, or text / image / search_result / document blocks."),
      is_error: booleanSchema().optional(),
      cache_control: cacheControlField(),
    }),
  );
  RequestContentBlockSchema = DoctorLazy(() =>
    union([
      TextBlock2Schema(),
      ImageBlockSchema(),
      DocumentBlockSchema(),
      SearchResultBlockSchema(),
      ToolUseBlockSchema(),
      ToolResultBlockSchema(),
      ThinkingBlockSchema(),
      RedactedThinkingBlockSchema(),
      ...NON_USER_BLOCK_TYPES.map(literalTypeSchema),
    ]).describe(
      "A request content block. text, image, document, search_result, tool_use, tool_result and thinking blocks are modelled; the other API block types are accepted by type tag only, and consumers must tolerate types newer than this list.",
    ),
  );
  RequestContentBlocksSchema = DoctorLazy(() => array(RequestContentBlockSchema()));
  RequestContentSchema = DoctorLazy(() =>
    union([stringSchema(), RequestContentBlocksSchema()]).describe(
      "A bare string (shorthand for one text block) or a list of content blocks.",
    ),
  );
  UserMessageParamSchema = DoctorLazy(() =>
    objectSchema({
      role: literal("user"),
      content: RequestContentSchema(),
    }).describe('A Messages API MessageParam with role "user", as SDK user messages carry it.'),
  );
  TextBlock3Schema = DoctorLazy(() =>
    objectSchema({
      type: literal("text"),
      text: stringSchema(),
      citations: array(unknown())
        .nullable()
        .optional()
        .describe("Citation locations backing the text, as the API defines them."),
    }),
  );
  ToolUseBlock2Schema = DoctorLazy(() =>
    objectSchema({
      type: literal("tool_use"),
      id: stringSchema(),
      name: stringSchema(),
      input: record(stringSchema(), unknown()).describe(
        "The tool's input object; its shape is the named tool's input schema.",
      ),
      caller: unknown()
        .optional()
        .describe("Which caller invoked the tool (direct, or a server tool), when reported."),
    }),
  );
  ThinkingBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("thinking"),
      thinking: stringSchema(),
      signature: stringSchema(),
    }),
  );
  RedactedThinkingBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("redacted_thinking"),
      data: stringSchema(),
    }),
  );
  ResponseContentBlockSchema = DoctorLazy(() =>
    union([
      TextBlock3Schema(),
      ToolUseBlock2Schema(),
      ThinkingBlockSchema(),
      RedactedThinkingBlockSchema(),
      ...SERVER_TOOL_BLOCK_TYPES.map(literalTypeSchema),
    ]).describe(
      "A response content block. text, tool_use and thinking blocks are modelled; the other API block types (server tool use and results, MCP tool blocks, container_upload, compaction, ...) are accepted by type tag only, and consumers must tolerate types newer than this list.",
    ),
  );
  CacheCreationUsageSchema = DoctorLazy(() =>
    objectSchema({
      ephemeral_1h_input_tokens: numberSchema().int(),
      ephemeral_5m_input_tokens: numberSchema().int(),
    }),
  );
  ServerToolUseUsageSchema = DoctorLazy(() =>
    objectSchema({
      web_search_requests: numberSchema().int(),
      web_fetch_requests: numberSchema().int(),
    }),
  );
  ThinkingUsageSchema = DoctorLazy(() =>
    objectSchema({
      thinking_tokens: numberSchema().int().optional(),
    }),
  );
  UsageSchema = DoctorLazy(() =>
    objectSchema({
      input_tokens: numberSchema().int(),
      output_tokens: numberSchema().int(),
      cache_creation_input_tokens: numberSchema().int().nullable(),
      cache_read_input_tokens: numberSchema().int().nullable(),
      cache_creation: CacheCreationUsageSchema().nullable().describe("Cache writes by TTL."),
      server_tool_use: ServerToolUseUsageSchema().nullable(),
      service_tier: stringSchema().nullable().describe("standard, priority or batch."),
      inference_geo: stringSchema().nullable().optional(),
      speed: stringSchema().nullable().optional().describe("standard or fast."),
      iterations: unknown()
        .optional()
        .describe("Per-iteration usage when the request ran several sampling iterations."),
      output_tokens_details: ThinkingUsageSchema().nullable().optional(),
      fallback_credit: unknown()
        .optional()
        .describe("Outcome of a fallback-credit token the request presented, or null."),
    }),
  );
  MessageBlockSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema().optional(),
      type: literal("message").optional(),
      role: literal("assistant"),
      model: stringSchema(),
      content: array(ResponseContentBlockSchema()),
      stop_reason: stringSchema()
        .nullable()
        .describe(
          "end_turn, max_tokens, stop_sequence, tool_use, pause_turn, refusal, ...; null while the message is still streaming.",
        ),
      stop_sequence: stringSchema().nullable().optional(),
      stop_details: unknown().optional().describe("Structured refusal details, when stop_reason is refusal."),
      usage: UsageSchema(),
      container: unknown().optional().describe("The code-execution container used by the request, if any."),
      context_management: unknown()
        .optional()
        .describe("Context-management edits applied during the request, if any."),
    }).describe(
      "A Messages API Message (a BetaMessage, possibly one streamed block of it), as SDK assistant messages carry it.",
    ),
  );
});
//@ chunk-bwbq4xvm.js:186487-186605 placement
var MCP_AUTH_ERROR_CODES = [
  "CLAUDEAI_BEARER_REJECTED",
  "FIRST_PARTY_AUTH_REJECTED",
  "APPROVAL_REQUIRED",
  "CLIENT_REGISTRATION_UNAVAILABLE",
];
//@ chunk-bwbq4xvm.js:186605-186785 placement
function mcpAuthErrorCode(error) {
  if (error.type !== "failed" && error.type !== "needs-auth") return;
  return (
    MCP_AUTH_ERROR_CODES.find((code) => code === error.errorCode) ??
    (error.clientRegistrationUnavailable ? "CLIENT_REGISTRATION_UNAVAILABLE" : undefined)
  );
}
//@ chunk-bwbq4xvm.js:186785-186824 placement
var ELICITATION_ACTIONS = ["accept", "reject", "cancelled"];
//@ chunk-bwbq4xvm.js:186824-187015 placement
/**
 * 导出值：同一声明里的多个绑定：USER_REJECTED_KIND（仅 user-rejected 的旧取值）；NON_EXECUTION_KINDS（tool_result_meta.non_execution_kind 取值）；位于「并入已有模块：SDK 核心消息与数据结构的 zod schema（system/assistant/result/限额事件、权限显示、模型用量、钩子输入等），316 增加了 away summary 等新消息类型」模块。
 */
var INTERRUPTED_TOOL_STATUSES = ["interrupted", "cancelled"];
var USER_REJECTED_KIND = ["user-rejected"];
var NON_EXECUTION_KINDS = [
  "user-rejected",
  "permission-rule",
  "automode-blocked",
  "automode-unavailable",
  "automode-parsing-error",
  "interrupted",
  "cancelled",
];
//@ chunk-bwbq4xvm.js:187015-187227 placement
function toolRejectionKind(toolDenialKind) {
  switch (toolDenialKind) {
    case "automode-blocked":
    case "automode-unavailable":
    case "automode-parsing-error":
      return true;
    case "user-rejected":
    case "permission-rule":
    case "interrupted":
    case "cancelled":
    case undefined:
      return false;
  }
}
//@ chunk-bwbq4xvm.js:187227-197743 placement
/**
 * SDK 模型用量 schema（inputTokens/outputTokens/thinkingTokens/缓存读写 5m/1h…）及同一声明里的统计、权限更新、MCP 配置等子 schema。
 */
var ModelUsageSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var JsonSchemaTypeName;
var JsonSchemaContentSchema;
var SDKJsonSchemaMessageSchema;
var JsonSchemaMessageSchema;
var ApiKeySourceSchema;
var ConfigScopeSchema;
var ContextOneMillionBetaLiteral;
var SDKAdaptiveMessageSchema;
var SDKEnabledMessageSchema;
var SDKDisabledMessageSchema;
var ThinkingConfigSchema;
var CoordinatorRoleSchema;
var MCP_TOOL_TIMEOUT_DESCRIPTION;
var McpToolTimeoutSchema;
var McpRequestTimeoutSchema;
var SDKStdioMessageSchema;
var McpToolPolicySchema;
var SDKSseMessageSchema;
var SDKHttpMessageSchema;
var SDKSdkMessageSchema;
deferInit("chunk-bwbq4xvm.js:187227", () => {
  ModelUsageSchema = DoctorLazy(() =>
    objectSchema({
      inputTokens: numberSchema().int(),
      outputTokens: numberSchema().int(),
      thinkingTokens: numberSchema()
        .int()
        .optional()
        .describe(
          "Thinking tokens, already counted inside outputTokens. Counts only turns run on CLI versions that record this field: absent when none did, and partial for a resumed session that began on an older version.",
        ),
      cacheReadInputTokens: numberSchema().int(),
      cacheCreationInputTokens: numberSchema().int(),
      cacheCreationEphemeral5mInputTokens: numberSchema()
        .int()
        .optional()
        .describe(
          "Cache writes with a 5-minute lifetime, already counted inside cacheCreationInputTokens. This and cacheCreationEphemeral1hInputTokens can add up to less than cacheCreationInputTokens, because a response that does not report how long its cache writes live adds to neither. costUSD prices those writes at the 5-minute rate. Counts only turns run on CLI versions that record this field: absent when none did, and an undercount when part of the session ran on an older version.",
        ),
      cacheCreationEphemeral1hInputTokens: numberSchema()
        .int()
        .optional()
        .describe(
          "Cache writes with a 1-hour lifetime, already counted inside cacheCreationInputTokens. costUSD prices them at the 1-hour rate when the model's price table has one. The built-in list prices do. A managed-settings modelPricing row does not: its one cache-write rate applies to both lifetimes. costUSD never uses the 1-hour rate for a response that a fallback model served after a refusal. Absent or an undercount in the same cases as cacheCreationEphemeral5mInputTokens.",
        ),
      webSearchRequests: numberSchema().int(),
      costUSD: numberSchema(),
      contextWindow: numberSchema().int(),
      maxOutputTokens: numberSchema().int(),
      canonicalModel: stringSchema()
        .optional()
        .describe(
          "Canonical model id used for the pricing lookup (e.g. 'claude-opus-4-7'). May differ from the raw model string this entry is keyed by (provider-specific ids, aliases).",
        ),
      provider: stringSchema()
        .optional()
        .describe(
          "API provider that served this model (e.g. 'firstParty', 'bedrock', 'vertex', 'foundry', 'anthropicAws', 'mantle', 'gateway').",
        ),
      costBasis: _enum(["list", "managed", "unknown"])
        .optional()
        .describe(
          "Which price table the most recent request for this model was priced at: Claude Code's built-in list prices ('list'), the organization's managed-settings modelPricing rates or multiplier ('managed'), or neither ('unknown' \u2014 no pricing row and no built-in price matched the model ID, so costUSD is a guess at the default model's rate). Overwritten per request like canonicalModel, so a consumer that differences the cumulative costUSD per turn gets that turn's basis. Absent until this process has priced a request for the model (e.g. right after --resume) and on builds that predate the field; treat as 'list'.",
        ),
    }),
  );
  JsonSchemaTypeName = DoctorLazy(() => literal("json_schema"));
  JsonSchemaContentSchema = DoctorLazy(() =>
    objectSchema({
      type: JsonSchemaTypeName(),
    }),
  );
  SDKJsonSchemaMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("json_schema"),
      schema: record(stringSchema(), unknown()),
    }),
  );
  JsonSchemaMessageSchema = DoctorLazy(() => SDKJsonSchemaMessageSchema());
  ApiKeySourceSchema = DoctorLazy(() =>
    _enum([
      "ANTHROPIC_API_KEY",
      "apiKeyHelper",
      "/login managed key",
      "none",
      "user",
      "project",
      "org",
      "temporary",
      "oauth",
    ]).describe(
      "Where the credential used for API requests came from: 'ANTHROPIC_API_KEY' (environment variable), 'apiKeyHelper' (the configured helper command), '/login managed key' (an API key created and stored by /login with an Anthropic Console account), or 'none' (no API key in use - e.g. claude.ai OAuth login, a bearer token, or a third-party cloud provider). 'user' | 'project' | 'org' | 'temporary' | 'oauth' are legacy members that current CLIs never emit; they remain only so the type stays backward compatible.",
    ),
  );
  ConfigScopeSchema = DoctorLazy(() =>
    _enum(["local", "user", "project"]).describe("Config scope for settings."),
  );
  ContextOneMillionBetaLiteral = DoctorLazy(() => literal("context-1m-2025-08-07"));
  SDKAdaptiveMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("adaptive"),
      display: _enum(["summarized", "omitted"]).optional(),
    }).describe("Claude decides when and how much to think (Opus 4.6+)."),
  );
  SDKEnabledMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("enabled"),
      budgetTokens: numberSchema().optional(),
      display: _enum(["summarized", "omitted"]).optional(),
    }).describe("Fixed thinking token budget (older models)"),
  );
  SDKDisabledMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("disabled"),
    }).describe("No extended thinking"),
  );
  ThinkingConfigSchema = DoctorLazy(() =>
    union([SDKAdaptiveMessageSchema(), SDKEnabledMessageSchema(), SDKDisabledMessageSchema()]).describe(
      "Controls Claude's thinking/reasoning behavior. When set, takes precedence over the deprecated maxThinkingTokens.",
    ),
  );
  CoordinatorRoleSchema = DoctorLazy(() =>
    literal("comms")
      .optional()
      .catch(undefined)
      .describe(
        "@internal Coordinator-mode role for this MCP server. 'comms' marks the server the coordinator uses to address the user; the coordinator tool filter lets comms-roled servers' tools through. Claude Code extension to .mcp.json \u2014 host-side config, not part of the MCP wire protocol. Coordinator mode is activated via the CLAUDE_CODE_COORDINATOR_MODE environment variable; this field only takes effect when coordinator mode is active.",
      ),
  );
  MCP_TOOL_TIMEOUT_DESCRIPTION =
    "Per-server tool-call timeout in milliseconds. Overrides the MCP_TOOL_TIMEOUT environment variable for this server. Hard wall-clock limit per call; progress notifications do not extend it. Values below 1000ms are ignored (falls through to MCP_TOOL_TIMEOUT or the default).";
  McpToolTimeoutSchema = DoctorLazy(() =>
    numberSchema().int().positive().optional().describe(MCP_TOOL_TIMEOUT_DESCRIPTION),
  );
  McpRequestTimeoutSchema = DoctorLazy(() =>
    numberSchema()
      .int()
      .positive()
      .optional()
      .describe(
        "Per-server HTTP request timeout in milliseconds, set by the host on the mcp_set_servers control event. Raises the per-request fetch first-byte budget and the tool-call watchdog for this server. Capped at 5 minutes. Ignored when `timeout` is also set.\n@internal",
      ),
  );
  SDKStdioMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("stdio").optional(),
      command: stringSchema(),
      args: array(stringSchema()).optional(),
      env: record(stringSchema(), stringSchema()).optional(),
      timeout: McpToolTimeoutSchema(),
      alwaysLoad: booleanSchema()
        .optional()
        .describe(
          "When true, all tools from this server are always included in the prompt and never deferred behind tool search, except a tool the server itself lists with _meta anthropic/alwaysLoad set to false. Equivalent to setting defer_loading: false on the API. When false, all tools from this server are deferred behind tool search. Default: tools are deferred when tool search is enabled. As a side effect, true also blocks startup until the server is connected (capped at the standard 5s connect timeout) even though MCP startup is otherwise non-blocking by default, since the tools must be present when the turn-1 prompt is built.",
        ),
      role: CoordinatorRoleSchema(),
    }),
  );
  McpToolPolicySchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema(),
      permission_policy: _enum(["always_allow", "always_ask", "always_deny"]).optional(),
      org_max_permission: _enum(["allow", "ask", "blocked"])
        .optional()
        .describe(
          "Org admin's per-tool ceiling. Drives the auto-mode isOrgAskCeiling gate so an admin 'ask' cap forces a user prompt even in auto mode.",
        ),
    }).describe(
      "Per-tool permission policy for an MCP server: carried on mcp_set_servers for remote (http/sse) servers, and on mcp_set_servers or initialize (sdkMcpServerConfigs) for host-registered sdk servers, where only always_ask and always_deny take effect.",
    ),
  );
  SDKSseMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("sse"),
      url: stringSchema(),
      headers: record(stringSchema(), stringSchema()).optional(),
      tools: array(McpToolPolicySchema()).optional(),
      timeout: McpToolTimeoutSchema(),
      request_timeout_ms: McpRequestTimeoutSchema(),
      alwaysLoad: booleanSchema()
        .optional()
        .describe(
          "When true, all tools from this server are always included in the prompt and never deferred behind tool search, except a tool the server itself lists with _meta anthropic/alwaysLoad set to false. Equivalent to setting defer_loading: false on the API. When false, all tools from this server are deferred behind tool search. Default: tools are deferred when tool search is enabled. As a side effect, true also blocks startup until the server is connected (capped at the standard 5s connect timeout) even though MCP startup is otherwise non-blocking by default, since the tools must be present when the turn-1 prompt is built.",
        ),
      role: CoordinatorRoleSchema(),
    }),
  );
  SDKHttpMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("http"),
      url: stringSchema(),
      headers: record(stringSchema(), stringSchema()).optional(),
      tools: array(McpToolPolicySchema()).optional(),
      timeout: McpToolTimeoutSchema(),
      request_timeout_ms: McpRequestTimeoutSchema(),
      alwaysLoad: booleanSchema()
        .optional()
        .describe(
          "When true, all tools from this server are always included in the prompt and never deferred behind tool search, except a tool the server itself lists with _meta anthropic/alwaysLoad set to false. Equivalent to setting defer_loading: false on the API. When false, all tools from this server are deferred behind tool search. Default: tools are deferred when tool search is enabled. As a side effect, true also blocks startup until the server is connected (capped at the standard 5s connect timeout) even though MCP startup is otherwise non-blocking by default, since the tools must be present when the turn-1 prompt is built.",
        ),
      role: CoordinatorRoleSchema(),
    }),
  );
  SDKSdkMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("sdk"),
      name: stringSchema(),
      timeout: McpToolTimeoutSchema()
        .catch(undefined)
        .describe(
          `${MCP_TOOL_TIMEOUT_DESCRIPTION} Applies when the server is first registered; changing it for an already-registered server has no effect until it is removed and re-added.`,
        ),
      disableAutoBackground: booleanSchema()
        .optional()
        .catch(undefined)
        .describe(
          "@internal When true, the CLI never moves a call to this server's tools to a background task on its own: not after the auto-background delay, and not early for a priority 'now' message, which instead interrupts the turn and so ends the call. Meant for a server whose calls wait on a person. The turn waits for the call's own result, up to the server's timeout, so set timeout too. A tool that advertises MCP task support can still run as a task. Any value but true counts as unset. Read when the server is first registered, from initialize, mcp_set_servers or --mcp-config.",
        ),
      connectorId: stringSchema()
        .min(1)
        .optional()
        .catch(undefined)
        .describe(
          "@internal The id of the claude.ai connector this server proxies, for a host that keys the server by another name. The server must declare the same id in its own capabilities for the CLI to treat it as that connector. Read from initialize and mcp_set_servers, not --mcp-config, when the server is first registered.",
        ),
      tools: preprocess(normalizePolicyEntries, array(McpToolPolicySchema()))
        .optional()
        .catch(undefined)
        .describe(
          "Per-tool permission policy the host declares for this server's tools (not the tool definitions passed to createSdkMcpServer). always_ask: the CLI asks the host (canUseTool or the permission prompt tool) before each call, even where an allow rule or allowedTools covers the tool, and under bypassPermissions outside a hosted remote session (CLAUDE_CODE_REMOTE); under dontAsk the call is denied; in auto mode the classifier decides, except that by default a tool annotated destructiveHint still asks. always_deny: calls are denied. always_allow and org_max_permission are ignored on sdk servers; grant allows with allowedTools or canUseTool. Read from initialize (sdkMcpServerConfigs) and from each mcp_set_servers entry that names the server. On the wire an entry without tools states no policy: on initialize the stored list and the rules stand; on mcp_set_servers the rules are replaced without them. The Agent SDK always re-sends the registered list. An entry whose policy is not one of the three asks; an entry without a string name is dropped and the rest apply; a value that is not a list reads as absent.",
        ),
    }),
  );
});
//@ chunk-bwbq4xvm.js:197743-197858 placement
function normalizePolicyEntries(entries) {
  if (!Array.isArray(entries)) return entries;
  return entries.flatMap((entry) => {
    let toolPolicyEntry = parseToolPolicyEntry(entry);
    return toolPolicyEntry === undefined ? [] : [toolPolicyEntry.policy];
  });
}
//@ chunk-bwbq4xvm.js:197858-205704 placement
/**
 * MCP 服务器配置与状态 schema（stdio/sse/http/sdk/claudeai-proxy、status、serverInfo、错误码）。
 */
var McpServerConfigSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var McpClaudeaiProxyServerConfigSchema;
var McpServerConfigUnionSchema;
var McpServerStatusSchema;
var SetMcpServersResultSchema;
var RuleDestinationSchema;
var RuleBehaviorSchema;
var PermissionDecisionSchema;
var ToolRuleSchema;
var McpAddRulesServerConfigSchema;
var DecisionClassificationSchema;
var CanUseToolResultSchema;
var PermissionModeSchema;
var HOOK_EVENT_NAMES;
var HookEventNameSchema;
deferInit("chunk-bwbq4xvm.js:197858", () => {
  McpServerConfigSchema = DoctorLazy(() =>
    union([SDKStdioMessageSchema(), SDKSseMessageSchema(), SDKHttpMessageSchema(), SDKSdkMessageSchema()]),
  );
  McpClaudeaiProxyServerConfigSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("claudeai-proxy"),
      url: stringSchema(),
      id: stringSchema(),
      timeout: McpToolTimeoutSchema(),
    }),
  );
  McpServerConfigUnionSchema = DoctorLazy(() =>
    union([McpServerConfigSchema(), McpClaudeaiProxyServerConfigSchema()]),
  );
  McpServerStatusSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().describe("Server name as configured"),
      status: _enum(["connected", "failed", "needs-auth", "pending", "disabled"]).describe(
        "Current connection status",
      ),
      serverInfo: objectSchema({
        name: stringSchema(),
        version: stringSchema(),
      })
        .optional()
        .describe("Server information (available when connected)"),
      error: stringSchema().optional().describe("Error message (available when status is 'failed')"),
      error_code: _enum(MCP_AUTH_ERROR_CODES)
        .optional()
        .describe(
          "@internal Why a row is not connected, where a host can act on it. On a 'failed' row: CLAUDEAI_BEARER_REJECTED (a claude.ai connector rejected the claude.ai login \u2014 sign in again), FIRST_PARTY_AUTH_REJECTED (a first-party Anthropic server rejected its credential \u2014 the claude.ai login, or for the Claude Design server its /design-login authorization; the row's error names which sign-in fixes it), APPROVAL_REQUIRED (a project-scoped server awaiting the user's approval). On a 'failed' or a 'needs-auth' row: CLIENT_REGISTRATION_UNAVAILABLE (the last look at the server's authorization server, under 30 days ago, found no way to register a client, so mcp_authenticate is expected to fail; the row keeps this value until the server is dialed again, for example by mcp_reconnect or a completed sign-in, so keep sign-in and reconnect available). Absent in every other case; new values are additive.",
        ),
      config: McpServerConfigUnionSchema()
        .optional()
        .describe("Server configuration (includes URL for HTTP/SSE servers)"),
      transport: stringSchema()
        .optional()
        .describe(
          "@internal The server's transport as configured (stdio, sse, http, ws, sdk, claudeai-proxy \u2026), reported even where `config` is withheld. Absent on CLIs that predate the field.",
        ),
      sessionProxied: booleanSchema()
        .optional()
        .describe(
          "@internal True when the server is reached through the cloud session's own MCP proxy, or is a claude.ai connector the session mounted: its sign-in is held there, never in this process, so a client offers no OAuth sign-in for it. Absent when false and on CLIs that predate the field.",
        ),
      cloudServiceProvided: booleanSchema()
        .optional()
        .describe(
          "@internal True for an http or sse server that Claude Code's cloud service itself added to the session, not a claude.ai connector: a client shows it as coming with the session and offers no claude.ai connector actions for it. The session judges this by the server's address and may miss one. Set only when `sessionProxied` is true. Absent when false and on CLIs that predate the field.",
        ),
      urlHost: stringSchema()
        .optional()
        .describe(
          "@internal Host and port of an http or sse server's URL as its settings file wrote it, for display where `config` is withheld. Absent for other transports, for a server with no settings file (dynamic, plugin, sdk, agent, claudeai), for a server the session proxies (its host would be the session's own), when the file's host holds an environment-variable placeholder or the file can't be re-read, and on CLIs that predate the field.",
        ),
      scope: stringSchema()
        .optional()
        .describe("Configuration scope (e.g., project, user, local, claudeai, managed)"),
      source: stringSchema()
        .optional()
        .describe(
          "Where the server definition came from: sdk (an in-process server the SDK host registered \u2014 only the host can register one), plugin (a server a plugin ships or registers at runtime), or the config scope (user, project, local, dynamic, managed, enterprise, claudeai, agent). Key trust on this, not on the name. Absent on CLIs that predate the field.",
        ),
      tools: array(
        objectSchema({
          name: stringSchema(),
          description: stringSchema().optional(),
          annotations: objectSchema({
            readOnly: booleanSchema().optional(),
            destructive: booleanSchema().optional(),
            openWorld: booleanSchema().optional(),
          }).optional(),
          _meta: record(stringSchema(), unknown())
            .optional()
            .describe(
              "The MCP Apps (SEP-1865) members of the tool's `_meta`, for a host that renders the tool's `ui://` resource, under the keys the server used: `ui` (an object: `resourceUri`, a `ui://` string; `visibility`, an array of 'model' | 'app'; and any other member the server sent) and the deprecated flat `ui/resourceUri` (a `ui://` string). Each is validated and size-bounded, and withheld if it fails. Of a `ui` that fails, only `visibility` still arrives: the 'model' and 'app' entries the server listed, or `[]` (neither audience) if `ui` is not an object or `visibility` not an array; `null` counts as absent. So a tool with no `visibility` declared none. A CLI that does not advertise `mcp_call_result_not_for_model_v1` may withhold a failed `ui` whole. Every other `_meta` key is withheld. Present only on a tool that declares one, from CLIs that advertise `mcp_tool_ui_meta_v1`.",
            ),
        }),
      )
        .optional()
        .describe("Tools provided by this server (available when connected)"),
      capabilities: objectSchema({
        experimental: record(stringSchema(), unknown()).optional(),
      })
        .optional()
        .describe(
          "@internal Server capabilities (available when connected). experimental['claude/channel'] is only present if the server's plugin is on the approved channels allowlist \u2014 use its presence to decide whether to show an Enable-channel prompt.",
        ),
    }).describe("Status information for an MCP server connection."),
  );
  SetMcpServersResultSchema = DoctorLazy(() =>
    objectSchema({
      added: array(stringSchema()).describe("Names of servers that were added"),
      removed: array(stringSchema()).describe("Names of servers that were removed"),
      errors: record(stringSchema(), stringSchema()).describe(
        "Map of server names to error messages for servers that failed to connect",
      ),
    }).describe("Result of a setMcpServers operation."),
  );
  RuleDestinationSchema = DoctorLazy(() =>
    _enum(["userSettings", "projectSettings", "localSettings", "session", "cliArg"]),
  );
  RuleBehaviorSchema = DoctorLazy(() => _enum(["allow", "deny", "ask"]));
  PermissionDecisionSchema = DoctorLazy(() => _enum(["allow", "deny", "ask", "defer"]));
  ToolRuleSchema = DoctorLazy(() =>
    objectSchema({
      toolName: stringSchema(),
      ruleContent: stringSchema().optional(),
    }),
  );
  McpAddRulesServerConfigSchema = DoctorLazy(() =>
    discriminatedUnion("type", [
      objectSchema({
        type: literal("addRules"),
        rules: array(ToolRuleSchema()),
        behavior: RuleBehaviorSchema(),
        destination: RuleDestinationSchema(),
      }),
      objectSchema({
        type: literal("replaceRules"),
        rules: array(ToolRuleSchema()),
        behavior: RuleBehaviorSchema(),
        destination: RuleDestinationSchema(),
      }),
      objectSchema({
        type: literal("removeRules"),
        rules: array(ToolRuleSchema()),
        behavior: RuleBehaviorSchema(),
        destination: RuleDestinationSchema(),
      }),
      objectSchema({
        type: literal("setMode"),
        mode: lazy(() => PermissionModeSchema()),
        destination: RuleDestinationSchema(),
      }),
      objectSchema({
        type: literal("addDirectories"),
        directories: array(stringSchema()),
        destination: RuleDestinationSchema(),
      }),
      objectSchema({
        type: literal("removeDirectories"),
        directories: array(stringSchema()),
        destination: RuleDestinationSchema(),
      }),
    ]),
  );
  DecisionClassificationSchema = DoctorLazy(() =>
    _enum(["user_temporary", "user_permanent", "user_reject"]).describe(
      "Classification of this permission decision for telemetry. SDK hosts that prompt users (desktop apps, IDEs) should set this to reflect what actually happened: user_temporary for allow-once, user_permanent for always-allow (both the click and later cache hits), user_reject for deny. If unset, the CLI infers conservatively (temporary for allow, reject for deny). The vocabulary matches tool_decision OTel events (monitoring-usage docs).",
    ),
  );
  CanUseToolResultSchema = DoctorLazy(() =>
    union([
      objectSchema({
        behavior: literal("allow"),
        updatedInput: record(stringSchema(), unknown()).optional(),
        updatedPermissions: array(McpAddRulesServerConfigSchema()).optional(),
        toolUseID: stringSchema().optional(),
        decisionClassification: DecisionClassificationSchema().optional(),
      }),
      objectSchema({
        behavior: literal("deny"),
        message: stringSchema(),
        interrupt: booleanSchema().optional(),
        toolUseID: stringSchema().optional(),
        decisionClassification: DecisionClassificationSchema().optional(),
      }),
    ]),
  );
  PermissionModeSchema = DoctorLazy(() =>
    preprocess(
      normalizePermissionModeAlias,
      _enum(["default", "acceptEdits", "bypassPermissions", "plan", "dontAsk", "auto"]),
    ).describe(
      "Permission mode for controlling how tool executions are handled. 'default' - Standard behavior, prompts for dangerous operations. 'acceptEdits' - Auto-accept file edit operations. 'bypassPermissions' - Bypass all permission checks (requires allowDangerouslySkipPermissions). 'plan' - Planning mode, no actual tool execution. 'dontAsk' - Don't prompt for permissions, deny if not pre-approved. 'auto' - Use a model classifier to approve/deny permission prompts.",
    ),
  );
  HOOK_EVENT_NAMES = [
    "PreToolUse",
    "PostToolUse",
    "PostToolUseFailure",
    "PostToolBatch",
    "Notification",
    "UserPromptSubmit",
    "UserPromptExpansion",
    "SessionStart",
    "SessionEnd",
    "Stop",
    "StopFailure",
    "SubagentStart",
    "SubagentStop",
    "PreCompact",
    "PostCompact",
    "PreModelSwitch",
    "PostModelSwitch",
    "PermissionRequest",
    "PermissionDenied",
    "Setup",
    "TeammateIdle",
    "TaskCreated",
    "TaskCompleted",
    "Elicitation",
    "ElicitationResult",
    "ConfigChange",
    "WorktreeCreate",
    "WorktreeRemove",
    "InstructionsLoaded",
    "CwdChanged",
    "FileChanged",
    "DirectoryAdded",
    "MessageDisplay",
  ];
  HookEventNameSchema = DoctorLazy(() => _enum(HOOK_EVENT_NAMES));
});
//@ chunk-bwbq4xvm.js:205704-215408 placement
/**
 * 工具来源与钩子公共输入 schema（MCP 工具所属服务器、session_id、transcript_path、cwd 等基础字段 C）。
 */
var McpToolSourceSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var HookBaseInputSchema;
var PreToolUseHookInputSchema;
var PermissionRequestHookInputSchema;
var PostToolUseHookInputSchema;
var PostToolUseFailureHookInputSchema;
var ToolCallSchema;
var PostToolBatchHookInputSchema;
var PermissionDeniedHookInputSchema;
var NotificationHookInputSchema;
var UserPromptSubmitHookInputSchema;
var UserPromptExpansionHookInputSchema;
var SessionStartHookInputSchema;
var SetupHookInputSchema;
var BackgroundTaskSchema;
var SessionCronSchema;
var StopHookInputSchema;
var StopFailureHookInputSchema;
var SubagentStartHookInputSchema;
var SubagentStopHookInputSchema;
var PreCompactHookInputSchema;
var PostCompactHookInputSchema;
var ModelSwitchSourceDescriptions;
deferInit("chunk-bwbq4xvm.js:205704", () => {
  McpToolSourceSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema(),
      source: stringSchema().describe(
        "sdk | plugin | user | project | local | dynamic | managed | enterprise | claudeai | agent \u2014 an open set; treat unknown values as an unrecognized configured source, never as sdk.",
      ),
    }).describe(
      'The MCP server serving this tool, for `mcp__*` tools: `name` is the server\'s config key (for `source: "sdk"`, exactly the name the SDK host registered in `sdkMcpServers` / `mcp_set_servers`; for any other source, the key as authored in that configuration \u2014 untrusted text, the same value `mcp_status` and system/init report, to be escaped before display), `source` is where its definition came from \u2014 `sdk` (an in-process server the SDK host runs; only the host can register one, so a configured server of the same name never reads `sdk`), `plugin` (a server a plugin ships or registers at runtime), or a config scope (`user`, `project`, `local`, `dynamic` for --mcp-config / `mcp_set_servers` process servers, `managed`, `enterprise`, `claudeai`, `agent`). Key trust on `source`, not on the name or the tool-name prefix. Absent for non-MCP tools.',
    ),
  );
  HookBaseInputSchema = DoctorLazy(() =>
    objectSchema({
      session_id: stringSchema(),
      transcript_path: stringSchema(),
      cwd: stringSchema(),
      prompt_id: stringSchema()
        .optional()
        .describe(
          "UUID correlating a user prompt with all subsequent events until the next prompt. Same value emitted on OpenTelemetry events as the `prompt.id` attribute, so hook output can be joined to OTel events at prompt grain. Absent until the first user input of the process lifetime.",
        ),
      permission_mode: stringSchema().optional(),
      agent_id: stringSchema()
        .optional()
        .describe(
          "Subagent identifier. Present only when the hook fires from within a subagent (e.g., a tool called by an AgentTool worker). Absent for the main thread, even in --agent sessions. Use this field (not agent_type) to distinguish subagent calls from main-thread calls.",
        ),
      agent_type: stringSchema()
        .optional()
        .describe(
          'Agent type name (e.g., "general-purpose", "code-reviewer"). Present when the hook fires from within a subagent (alongside agent_id), or on the main thread of a session started with --agent (without agent_id).',
        ),
      effort: objectSchema({
        level: stringSchema().describe(
          'Active effort level for the current turn (e.g., "low", "medium", "high", "xhigh", "max"), after any silent downgrade for the selected model. Also exposed to hook commands and Bash as the CLAUDE_EFFORT env var.',
        ),
      })
        .optional()
        .describe(
          "Reasoning effort applied to the current turn. Same shape as StatusLineCommandInput.effort. Present for hooks that fire within a tool-use context (PreToolUse, PostToolUse, Stop, SubagentStop, etc.) on a model that supports the effort parameter; absent for session-lifecycle hooks and models without effort support.",
        ),
    }),
  );
  PreToolUseHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("PreToolUse"),
        tool_name: stringSchema(),
        tool_input: unknown(),
        tool_use_id: stringSchema(),
        mcp_server: McpToolSourceSchema().optional(),
      }),
    ),
  );
  PermissionRequestHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("PermissionRequest"),
        tool_name: stringSchema(),
        tool_input: unknown(),
        permission_suggestions: array(McpAddRulesServerConfigSchema()).optional(),
        mcp_server: McpToolSourceSchema().optional(),
      }),
    ),
  );
  PostToolUseHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("PostToolUse"),
        tool_name: stringSchema(),
        tool_input: unknown(),
        tool_response: unknown(),
        tool_use_id: stringSchema(),
        duration_ms: numberSchema()
          .optional()
          .describe("Tool execution time in milliseconds. Excludes permission-prompt and hook time."),
        mcp_server: McpToolSourceSchema().optional(),
      }),
    ),
  );
  PostToolUseFailureHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("PostToolUseFailure"),
        tool_name: stringSchema(),
        tool_input: unknown(),
        tool_use_id: stringSchema(),
        error: stringSchema(),
        is_interrupt: booleanSchema().optional(),
        duration_ms: numberSchema()
          .optional()
          .describe("Tool execution time in milliseconds. Excludes permission-prompt and hook time."),
        mcp_server: McpToolSourceSchema().optional(),
      }),
    ),
  );
  ToolCallSchema = DoctorLazy(() =>
    objectSchema({
      tool_name: stringSchema(),
      tool_input: unknown(),
      tool_use_id: stringSchema(),
      tool_response: unknown().optional(),
    }),
  );
  PostToolBatchHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema()
      .and(
        objectSchema({
          hook_event_name: literal("PostToolBatch"),
          tool_calls: array(ToolCallSchema()),
        }),
      )
      .describe(
        "Hook input for the PostToolBatch event. Fired once after every tool call in a batch has resolved, before the next model request. PostToolUse fires per-tool and may run concurrently for parallel tool calls; PostToolBatch fires exactly once with the full batch.",
      ),
  );
  PermissionDeniedHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("PermissionDenied"),
        tool_name: stringSchema(),
        tool_input: unknown(),
        tool_use_id: stringSchema(),
        reason: stringSchema(),
        mcp_server: McpToolSourceSchema().optional(),
      }),
    ),
  );
  NotificationHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("Notification"),
        message: stringSchema(),
        title: stringSchema().optional(),
        notification_type: stringSchema(),
      }),
    ),
  );
  UserPromptSubmitHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("UserPromptSubmit"),
        prompt: stringSchema(),
        source: _enum(["user", "sdk", "system", "loop_wakeup", "schedule_wakeup", "poll_event"])
          .optional()
          .describe(
            "Who authored/injected the prompt: `user` = submitted from the interactive composer, `sdk` = non-interactive entrypoint (`-p` / Agent SDK), `loop_wakeup` = dynamic /loop wakeup, `schedule_wakeup` = scheduled-task fire (CronCreate or a cloud scheduled task), `system` = other machine-injected turns (peer/channel messages, task notifications, auto-continuation), `poll_event` = the poll-event channel enqueue-time pass (the hook fires when the host submits an event, before its delivery ack exists \u2014 a blocking verdict rejects the event). Payloads may omit it while the field rolls out.",
          ),
        session_title: stringSchema().optional(),
      }),
    ),
  );
  UserPromptExpansionHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("UserPromptExpansion"),
        expansion_type: _enum(["slash_command", "mcp_prompt"]),
        command_name: stringSchema(),
        command_args: stringSchema(),
        command_source: stringSchema().optional(),
        prompt: stringSchema(),
      }),
    ),
  );
  SessionStartHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("SessionStart"),
        source: _enum(["startup", "resume", "clear", "compact", "fork"]),
        agent_type: stringSchema().optional(),
        model: stringSchema().optional(),
        session_title: stringSchema().optional(),
        seconds_since_last_response: numberSchema()
          .optional()
          .describe("resume/fork: seconds since the resumed transcript's last assistant response"),
        context_tokens: numberSchema()
          .optional()
          .describe(
            "resume/fork: the resumed transcript's last response input + cache_read + cache_creation + output tokens (for a server-side tool loop, its last iteration's window, not the summed totals)",
          ),
        prompt_cache_likely_expired: booleanSchema()
          .optional()
          .describe(
            "resume/fork: seconds_since_last_response exceeds the prompt-cache TTL, so the first request re-caches context_tokens",
          ),
        estimated_cache_write_usd: numberSchema()
          .optional()
          .describe(
            "resume/fork: estimated cost of re-caching context_tokens on the session model \u2014 the managed modelPricing when set, otherwise list price; excludes the response",
          ),
      }),
    ),
  );
  SetupHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("Setup"),
        trigger: _enum(["init", "maintenance"]),
      }),
    ),
  );
  BackgroundTaskSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema(),
      type: stringSchema().describe(
        "Friendly task-type label (e.g. 'shell', 'subagent', 'monitor', 'workflow'). Falls back to the raw discriminant for unknown types.",
      ),
      status: stringSchema(),
      description: stringSchema().describe(
        "Free-text description. Capped at 1000 chars; clipped values append " +
          'an in-string "\u2026 [+N chars]" marker.',
      ),
      command: stringSchema()
        .optional()
        .describe(
          "Shell command line. Only present for 'shell' tasks. Capped at 1000 " +
            'chars with the same "\u2026 [+N chars]" marker.',
        ),
      agent_type: stringSchema()
        .optional()
        .describe("Subagent type name. Only present for 'subagent' tasks."),
      server: stringSchema()
        .optional()
        .describe("MCP server name. Only present for 'monitor' / 'MCP task' tasks."),
      tool: stringSchema()
        .optional()
        .describe("MCP tool name. Only present for 'monitor' / 'MCP task' tasks."),
      name: stringSchema().optional().describe("Workflow name. Only present for 'workflow' tasks."),
    }),
  );
  SessionCronSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema(),
      schedule: stringSchema().describe('Cron expression, e.g. "0 9 * * 1-5".'),
      recurring: booleanSchema().describe(
        "False for one-shot wakeups whose cron field encodes a single fire time; true for tasks that re-fire on every match.",
      ),
      prompt: stringSchema().describe(
        "Prompt text submitted when the cron fires. Capped at 1000 chars; " +
          'clipped values append an in-string "\u2026 [+N chars]" marker.',
      ),
    }),
  );
  StopHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("Stop"),
        stop_hook_active: booleanSchema(),
        last_assistant_message: stringSchema()
          .optional()
          .describe(
            "Text content of the last assistant message before stopping. Avoids the need to read and parse the transcript file.",
          ),
        background_tasks: array(BackgroundTaskSchema())
          .optional()
          .describe(
            'In-flight background work (running/pending + backgrounded) registered in this session. Lets hooks distinguish "session is done" from "session is paused waiting for background work to wake it". Empty array when nothing is in flight.',
          ),
        session_crons: array(SessionCronSchema())
          .optional()
          .describe(
            "Session-scoped cron tasks (CronCreate, ScheduleWakeup, /loop) that will wake this session later. Empty array when none are scheduled.",
          ),
      }),
    ),
  );
  StopFailureHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("StopFailure"),
        error: ApiErrorCodeSchema(),
        error_details: stringSchema().optional(),
        last_assistant_message: stringSchema().optional(),
      }),
    ),
  );
  SubagentStartHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("SubagentStart"),
        agent_id: stringSchema(),
        agent_type: stringSchema(),
      }),
    ),
  );
  SubagentStopHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("SubagentStop"),
        stop_hook_active: booleanSchema(),
        agent_id: stringSchema(),
        agent_transcript_path: stringSchema(),
        agent_type: stringSchema(),
        last_assistant_message: stringSchema()
          .optional()
          .describe(
            "Text content of the last assistant message before stopping. Avoids the need to read and parse the transcript file.",
          ),
        background_tasks: array(BackgroundTaskSchema())
          .optional()
          .describe(
            'In-flight background work (running/pending + backgrounded) registered in this session. Lets hooks distinguish "session is done" from "session is paused waiting for background work to wake it". Empty array when nothing is in flight.',
          ),
        session_crons: array(SessionCronSchema())
          .optional()
          .describe(
            "Session-scoped cron tasks (CronCreate, ScheduleWakeup, /loop) that will wake this session later. Empty array when none are scheduled.",
          ),
      }),
    ),
  );
  PreCompactHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("PreCompact"),
        trigger: _enum(["manual", "auto"]),
        custom_instructions: stringSchema().nullable(),
      }),
    ),
  );
  PostCompactHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("PostCompact"),
        trigger: _enum(["manual", "auto"]),
        compact_summary: stringSchema().describe("The conversation summary produced by compaction"),
      }),
    ),
  );
  ModelSwitchSourceDescriptions = {
    command:
      "command: /model <name>, the /config Model row, or enabling fast mode when that promotes the model",
    picker: "picker: an interactive model picker",
    sdk: "sdk: headless set_model (SDK, Remote Control, IDE)",
    auto: "auto: automatic fallback or other programmatic change",
    resume: "resume: model restored while resuming a session",
  };
});
//@ chunk-bwbq4xvm.js:215408-216584 placement
/**
 * Pre/PostModelSwitch 钩子输入的公共字段：from_model、to_model、requested、重发 token 数等。
 */
function modelSwitchFields(sources) {
  return objectSchema({
    from_model: stringSchema().describe("Resolved model id the session was running before the switch"),
    to_model: stringSchema().describe("Resolved model id the session runs after the switch"),
    requested_model: stringSchema()
      .nullable()
      .describe('What was asked for (alias such as "opus", a full id, or null for "default")'),
    source: _enum(sources).describe(
      sources.map((source) => ModelSwitchSourceDescriptions[source]).join("; "),
    ),
    context_tokens: numberSchema().describe(
      "Prompt tokens the next request re-sends: the last main-thread response's input + cache_read + cache_creation + output tokens (0 before the first response; for a server-side tool loop, its last iteration's window, not the summed totals)",
    ),
    prompt_cache_warm: booleanSchema().describe(
      "Whether the current model's prompt cache is likely still warm (a switch then forfeits it)",
    ),
    cache_ttl: _enum(["5m", "1h"]),
    estimated_cache_write_usd: numberSchema().describe(
      "Estimated cost of re-caching context_tokens on to_model at its cache-write rate \u2014 the managed modelPricing when set, otherwise list price; excludes the response",
    ),
    pricing: _enum(["configured", "catalog", "default"]).describe(
      "configured: priced at the managed modelPricing setting; catalog: list price; default: to_model unknown, the default tier was assumed",
    ),
  });
}
//@ chunk-bwbq4xvm.js:216584-220911 placement
/**
 * 模型切换钩子（PreModelSwitch/PostModelSwitch）及其他钩子事件输入 schema 定义。
 */
var PreModelSwitchHookInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PostModelSwitchHookInputSchema;
var TeammateIdleHookInputSchema;
var TaskCreatedHookInputSchema;
var TaskCompletedHookInputSchema;
var ElicitationHookInputSchema;
var ElicitationResultHookInputSchema;
var CONFIG_CHANGE_SOURCES;
var ConfigChangeHookInputSchema;
var INSTRUCTIONS_LOAD_REASONS;
var INSTRUCTIONS_MEMORY_TYPES;
var InstructionsLoadedHookInputSchema;
var WorktreeCreateHookInputSchema;
var WorktreeRemoveHookInputSchema;
var CwdChangedHookInputSchema;
var FileChangedHookInputSchema;
var DirectoryAddedHookInputSchema;
var MessageDisplayHookInputSchema;
var SESSION_END_REASONS;
var SessionEndReasonSchema;
var SessionEndHookInputSchema;
var HookInputUnionSchema;
var AsyncHookInputSchema;
deferInit("chunk-bwbq4xvm.js:216584", () => {
  PreModelSwitchHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema()
      .and(
        objectSchema({
          hook_event_name: literal("PreModelSwitch"),
        }),
      )
      .and(modelSwitchFields(["command", "picker", "sdk"])),
  );
  PostModelSwitchHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema()
      .and(
        objectSchema({
          hook_event_name: literal("PostModelSwitch"),
        }),
      )
      .and(modelSwitchFields(["command", "picker", "sdk", "auto", "resume"])),
  );
  TeammateIdleHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("TeammateIdle"),
        teammate_name: stringSchema(),
        team_name: stringSchema().describe(
          "@deprecated Sessions have a single implicit team; this carries the session-derived team name and will be removed in a future release.",
        ),
      }),
    ),
  );
  TaskCreatedHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("TaskCreated"),
        task_id: stringSchema(),
        task_subject: stringSchema(),
        task_description: stringSchema().optional(),
        teammate_name: stringSchema().optional(),
        team_name: stringSchema()
          .optional()
          .describe(
            "@deprecated Sessions have a single implicit team; this carries the session-derived team name and will be removed in a future release.",
          ),
      }),
    ),
  );
  TaskCompletedHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("TaskCompleted"),
        task_id: stringSchema(),
        task_subject: stringSchema(),
        task_description: stringSchema().optional(),
        teammate_name: stringSchema().optional(),
        team_name: stringSchema()
          .optional()
          .describe(
            "@deprecated Sessions have a single implicit team; this carries the session-derived team name and will be removed in a future release.",
          ),
      }),
    ),
  );
  ElicitationHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema()
      .and(
        objectSchema({
          hook_event_name: literal("Elicitation"),
          mcp_server_name: stringSchema(),
          message: stringSchema(),
          mode: _enum(["form", "url"]).optional(),
          url: stringSchema().optional(),
          elicitation_id: stringSchema().optional(),
          requested_schema: record(stringSchema(), unknown()).optional(),
        }),
      )
      .describe(
        "Hook input for the Elicitation event. Fired when an MCP server requests user input. Hooks can auto-respond (accept/decline) instead of showing the dialog.",
      ),
  );
  ElicitationResultHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema()
      .and(
        objectSchema({
          hook_event_name: literal("ElicitationResult"),
          mcp_server_name: stringSchema(),
          elicitation_id: stringSchema().optional(),
          mode: _enum(["form", "url"]).optional(),
          action: _enum(["accept", "decline", "cancel"]),
          content: record(stringSchema(), unknown()).optional(),
        }),
      )
      .describe(
        "Hook input for the ElicitationResult event. Fired after the user responds to an MCP elicitation. Hooks can observe or override the response before it is sent to the server.",
      ),
  );
  CONFIG_CHANGE_SOURCES = [
    "user_settings",
    "project_settings",
    "local_settings",
    "policy_settings",
    "skills",
  ];
  ConfigChangeHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("ConfigChange"),
        source: _enum(CONFIG_CHANGE_SOURCES),
        file_path: stringSchema().optional(),
      }),
    ),
  );
  INSTRUCTIONS_LOAD_REASONS = ["session_start", "nested_traversal", "path_glob_match", "include", "compact"];
  INSTRUCTIONS_MEMORY_TYPES = ["User", "Project", "Local", "Managed"];
  InstructionsLoadedHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("InstructionsLoaded"),
        file_path: stringSchema(),
        memory_type: _enum(INSTRUCTIONS_MEMORY_TYPES),
        load_reason: _enum(INSTRUCTIONS_LOAD_REASONS),
        globs: array(stringSchema()).optional(),
        trigger_file_path: stringSchema().optional(),
        parent_file_path: stringSchema().optional(),
      }),
    ),
  );
  WorktreeCreateHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("WorktreeCreate"),
        name: stringSchema(),
      }),
    ),
  );
  WorktreeRemoveHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("WorktreeRemove"),
        worktree_path: stringSchema(),
      }),
    ),
  );
  CwdChangedHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("CwdChanged"),
        old_cwd: stringSchema(),
        new_cwd: stringSchema(),
      }),
    ),
  );
  FileChangedHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("FileChanged"),
        file_path: stringSchema(),
        event: _enum(["change", "add", "unlink"]),
      }),
    ),
  );
  DirectoryAddedHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("DirectoryAdded"),
        directory: stringSchema().describe("Absolute path of the directory that was added."),
        source: _enum(["slash_command", "register_repo_root"]).describe(
          'How the directory was added: "slash_command" for /add-dir, "register_repo_root" for the SDK control_request.',
        ),
      }),
    ),
  );
  MessageDisplayHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema()
      .and(
        objectSchema({
          hook_event_name: literal("MessageDisplay"),
          turn_id: stringSchema().describe("UUID of the current turn."),
          message_id: stringSchema().describe(
            "UUID of the assistant message being displayed. Stable across " +
              "every flush of the same message. Not the API msg_\u2026 id.",
          ),
          index: numberSchema()
            .int()
            .describe("Zero-based index of this delta within the message. Increments by one per flush."),
          final: booleanSchema().describe(
            "True on the message's last flush. Exactly one flush per message has it.",
          ),
          delta: stringSchema().describe(
            "The newly completed lines since the prior flush. Always whole lines, except on the final flush which may end mid-line. The delta of the final flush is empty when the message ends on a newline; treat final as the end-of-message signal regardless.",
          ),
        }),
      )
      .describe(
        "Hook input for the MessageDisplay event. Fired with each batch of newly completed lines while an assistant message streams. Display-only: the stored message and what the model sees are untouched.",
      ),
  );
  SESSION_END_REASONS = ["clear", "resume", "logout", "prompt_input_exit", "other"];
  SessionEndReasonSchema = DoctorLazy(() => _enum(SESSION_END_REASONS));
  SessionEndHookInputSchema = DoctorLazy(() =>
    HookBaseInputSchema().and(
      objectSchema({
        hook_event_name: literal("SessionEnd"),
        reason: SessionEndReasonSchema(),
      }),
    ),
  );
  HookInputUnionSchema = DoctorLazy(() =>
    union([
      PreToolUseHookInputSchema(),
      PostToolUseHookInputSchema(),
      PostToolUseFailureHookInputSchema(),
      PostToolBatchHookInputSchema(),
      PermissionDeniedHookInputSchema(),
      NotificationHookInputSchema(),
      UserPromptSubmitHookInputSchema(),
      UserPromptExpansionHookInputSchema(),
      SessionStartHookInputSchema(),
      SessionEndHookInputSchema(),
      StopHookInputSchema(),
      StopFailureHookInputSchema(),
      SubagentStartHookInputSchema(),
      SubagentStopHookInputSchema(),
      PreCompactHookInputSchema(),
      PostCompactHookInputSchema(),
      PreModelSwitchHookInputSchema(),
      PostModelSwitchHookInputSchema(),
      PermissionRequestHookInputSchema(),
      SetupHookInputSchema(),
      TeammateIdleHookInputSchema(),
      TaskCreatedHookInputSchema(),
      TaskCompletedHookInputSchema(),
      ElicitationHookInputSchema(),
      ElicitationResultHookInputSchema(),
      ConfigChangeHookInputSchema(),
      InstructionsLoadedHookInputSchema(),
      WorktreeCreateHookInputSchema(),
      WorktreeRemoveHookInputSchema(),
      CwdChangedHookInputSchema(),
      FileChangedHookInputSchema(),
      DirectoryAddedHookInputSchema(),
      MessageDisplayHookInputSchema(),
    ]),
  );
  AsyncHookInputSchema = DoctorLazy(() =>
    objectSchema({
      async: literal(true),
      asyncTimeout: numberSchema().optional(),
    }),
  );
});
//@ chunk-bwbq4xvm.js:220911-220963 placement
function isSingleLineNonBlank(text) {
  return (
    !text.includes(`
`) && /\S/.test(text)
  );
}
//@ chunk-bwbq4xvm.js:220963-309065 placement
/**
 * 钩子输出 schema 总表：PreToolUse permissionDisplay、各事件的 hookSpecificOutput、同步/异步钩子 JSON 输出等。
 */
var PermissionDisplaySchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PreToolUseHookSpecificOutputSchema;
var UserPromptSubmitHookSpecificOutputSchema;
var UserPromptExpansionHookSpecificOutputSchema;
var SessionStartHookSpecificOutputSchema;
var SetupHookSpecificOutputSchema;
var PreModelSwitchHookSpecificOutputSchema;
var PostModelSwitchHookSpecificOutputSchema;
var SubagentStartHookSpecificOutputSchema;
var PostToolUseHookSpecificOutputSchema;
var PostToolBatchHookSpecificOutputSchema;
var PostToolUseFailureHookSpecificOutputSchema;
var StopHookSpecificOutputSchema;
var SubagentStopHookSpecificOutputSchema;
var PermissionDeniedHookSpecificOutputSchema;
var NotificationHookSpecificOutputSchema;
var PermissionRequestHookSpecificOutputSchema;
var CwdChangedHookSpecificOutputSchema;
var FileChangedHookSpecificOutputSchema;
var MessageDisplayHookSpecificOutputSchema;
var SyncHookOutputSchema;
var ElicitationHookSpecificOutputSchema;
var ElicitationResultHookSpecificOutputSchema;
var WorktreeCreateHookSpecificOutputSchema;
var HookOutputSchema;
var SkillCommandSchema;
var AgentDefinitionSchema;
var ModelOptionSchema;
var AccountInfoSchema;
var McpServerRefSchema;
var SubagentDefinitionSchema;
var SettingsSourceSchema;
var SDKLocalMessageSchema;
var SKIPPED_LINKS_DESCRIPTION;
var RewindFilesResultSchema;
var SDKUserMessageSchema;
var AssistantContentSchema;
var SDKAssistantMessageSchema;
var StreamEventSchema;
var _;
var MainLoopUsageSchema;
var ApiErrorCodeSchema;
var CompactStatusSchema;
var ResourceLinkSchema;
var ToolResultRemedySchema;
var MessageOriginSchema;
var SDKUserMessageSchema_2;
var SDKUserMessageBaseSchema;
var SDKReplayMessageSchema;
var SDKBashCommandMessageSchema;
var RateLimitInfoSchema;
var MAX_DISPLAY_NAME_CHARS;
var MAX_MODEL_ID_CHARS;
var UsageReportSchema;
var CONTEXT_CATEGORY_KINDS;
var CONTEXT_CATEGORY_ORDER;
var ContextUsageCategorySchema;
var ContextUsageSchema;
var SDKAssistantMessageSchema_2;
deferInit("chunk-bwbq4xvm.js:220963", () => {
  PermissionDisplaySchema = DoctorLazy(() =>
    objectSchema({
      title: stringSchema().max(200).refine(isSingleLineNonBlank),
      description: stringSchema().max(2000).regex(/\S/),
      displayName: stringSchema().max(64).refine(isSingleLineNonBlank),
    }).describe(
      "@internal Desktop host only: the words an SDK host puts on an ask's permission card (PreToolUse permissionDisplay).",
    ),
  );
  PreToolUseHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("PreToolUse"),
      permissionDecision: PermissionDecisionSchema().optional(),
      permissionDecisionReason: stringSchema().optional(),
      updatedInput: record(stringSchema(), unknown()).optional(),
      additionalContext: stringSchema().optional(),
      permissionDisplay: PermissionDisplaySchema()
        .optional()
        .catch(undefined)
        .describe(
          "@internal Desktop host only: the words for this ask's permission card. Read only beside permissionDecision 'ask' from the hook the SDK host registered in its stdio initialize; send it only when the initialize response carried host_worded_asks. Only an answer on a card approves such an ask: no one-tap approve, allow rule, permission mode, PermissionRequest hook allow or plugin tool.check allow does. The CLI may send the ask without these words (another hook also asked, or the input changed), or refuse the call (its own permission check also asks or cannot run, or the ask reached a path with no card that can show the words, such as an in-process teammate). Ignored whole when malformed, blank, over length (title 200, description 2000, displayName 64 UTF-16 code units), or holding a control or invisible character other than a line feed in description.",
        ),
    }),
  );
  UserPromptSubmitHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("UserPromptSubmit"),
      additionalContext: stringSchema().optional(),
      sessionTitle: stringSchema().optional(),
      suppressOriginalPrompt: booleanSchema()
        .optional()
        .describe('When decision is "block", omit the original prompt from the block message'),
    }),
  );
  UserPromptExpansionHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("UserPromptExpansion"),
      additionalContext: stringSchema().optional(),
      suppressOriginalPrompt: booleanSchema()
        .optional()
        .describe('When decision is "block", omit the original prompt from the block message'),
    }),
  );
  SessionStartHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("SessionStart"),
      additionalContext: stringSchema().optional(),
      initialUserMessage: stringSchema().optional(),
      sessionTitle: stringSchema().optional(),
      watchPaths: array(stringSchema()).optional(),
      reloadSkills: booleanSchema()
        .optional()
        .describe(
          "Re-scan skill and command directories after SessionStart hooks complete, so skills installed by the hook are available in the same session",
        ),
    }),
  );
  SetupHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("Setup"),
      additionalContext: stringSchema().optional(),
    }),
  );
  PreModelSwitchHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("PreModelSwitch"),
      permissionDecision: _enum(["allow", "deny", "ask"])
        .optional()
        .describe(
          "Same contract as PreToolUse: allow proceeds (skipping the interactive cache-miss confirm), deny cancels the switch, ask asks the user to confirm (a headless session refuses instead)",
        ),
      permissionDecisionReason: stringSchema().optional(),
    }),
  );
  PostModelSwitchHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("PostModelSwitch"),
      additionalContext: stringSchema()
        .optional()
        .describe("Reaches the model with the next request the new model serves"),
    }),
  );
  SubagentStartHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("SubagentStart"),
      additionalContext: stringSchema().optional(),
    }),
  );
  PostToolUseHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("PostToolUse"),
      additionalContext: stringSchema().optional(),
      classifierContext: stringSchema()
        .optional()
        .describe(
          "Host-asserted context shown to the auto-mode permission classifier alongside this tool call's result. In the live session the classifier may weigh a user statement relayed here as user intent (it can satisfy a consent bar a user turn would satisfy, never a hard boundary); values restored from saved session state are treated as unverified context only. Relay discipline is the host's obligation: put ONLY genuine user statements in intent-bearing positions \u2014 never tool output or model text dressed as one. Capped at 2000 UTF-16 code units, a budget shared across all hooks that contribute to one call (surrogate-pair-safe; emoji and other astral characters count as two). Honored on synchronous hook responses only: an async hook's late response arrives after the result message is frozen and this field in it is silently ignored. Security note: do not copy untrusted tool output or third-party text into it blindly \u2014 content placed here reaches the permission classifier with host-application framing. Applies only to calls the classifier transcript shows: read-only lookups the transcript omits (file reads, searches) and remote-engine shells produce no per-result line, and context attached to them is silently unused. Not a delivery channel: it is bound to a single call id and sized for a short assertion, not for relaying messages or events. Rewrite integrity: if this assertion describes output you are rewriting, return it in the SAME hook result as the rewrite \u2014 it is then dropped automatically if your rewrite is rejected or superseded by a later hook's rewrite; assertions returned without a rewrite are never invalidated by other hooks' rewrites, so a non-rewriting hook should assert only what holds regardless of other hooks' rewrites \u2014 hosts that need an assertion bound to exact output bytes should make it in the hook that produces those bytes. (Do NOT return an identity rewrite just to pair an assertion: hooks run in parallel on the ORIGINAL output, so an identity rewrite competes last-write-wins with sibling rewrites and can clobber a real redaction.)",
        ),
      updatedToolOutput: unknown()
        .optional()
        .describe("Replaces the tool output before it is sent to the model"),
      updatedMCPToolOutput: unknown()
        .optional()
        .describe(
          "Replaces the output for MCP tools only. Prefer updatedToolOutput, which works for all tools",
        ),
    }),
  );
  PostToolBatchHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("PostToolBatch"),
      additionalContext: stringSchema().optional(),
    }),
  );
  PostToolUseFailureHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("PostToolUseFailure"),
      additionalContext: stringSchema().optional(),
    }),
  );
  StopHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("Stop"),
      additionalContext: stringSchema().optional(),
    }).describe(
      "Hook-specific output for the Stop event. additionalContext is non-error feedback delivered to the model; the conversation continues so the model can act on it.",
    ),
  );
  SubagentStopHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("SubagentStop"),
      additionalContext: stringSchema().optional(),
    }).describe(
      "Hook-specific output for the SubagentStop event. additionalContext is non-error feedback delivered to the subagent; the subagent continues so it can act on it.",
    ),
  );
  PermissionDeniedHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("PermissionDenied"),
      retry: booleanSchema().optional(),
    }),
  );
  NotificationHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("Notification"),
      additionalContext: stringSchema().optional(),
    }),
  );
  PermissionRequestHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("PermissionRequest"),
      decision: union([
        objectSchema({
          behavior: literal("allow"),
          updatedInput: record(stringSchema(), unknown()).optional(),
          updatedPermissions: array(McpAddRulesServerConfigSchema()).optional(),
        }),
        objectSchema({
          behavior: literal("deny"),
          message: stringSchema().optional(),
          interrupt: booleanSchema().optional(),
        }),
      ]),
    }),
  );
  CwdChangedHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("CwdChanged"),
      watchPaths: array(stringSchema()).optional(),
    }),
  );
  FileChangedHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("FileChanged"),
      watchPaths: array(stringSchema()).optional(),
    }),
  );
  MessageDisplayHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("MessageDisplay"),
      displayContent: stringSchema()
        .optional()
        .describe(
          "Text displayed in place of the delta. Omit (or return the delta unchanged) to display the original.",
        ),
    }).describe(
      "Hook-specific output for the MessageDisplay event. Display-only: replaces the delta on screen without changing the stored message.",
    ),
  );
  SyncHookOutputSchema = DoctorLazy(() =>
    objectSchema({
      continue: booleanSchema().optional(),
      suppressOutput: booleanSchema().optional(),
      stopReason: stringSchema().optional(),
      decision: _enum(["approve", "block"]).optional(),
      systemMessage: stringSchema().optional(),
      terminalSequence: stringSchema()
        .optional()
        .describe(
          "A terminal escape sequence (e.g. OSC 9 / OSC 777 desktop-notification) for Claude Code to emit on your behalf. Only notification/title OSCs (0, 1, 2, 9, 99, 777) and BEL are permitted; anything else is dropped.",
        ),
      reason: stringSchema().optional(),
      hookSpecificOutput: union([
        PreToolUseHookSpecificOutputSchema(),
        UserPromptSubmitHookSpecificOutputSchema(),
        UserPromptExpansionHookSpecificOutputSchema(),
        SessionStartHookSpecificOutputSchema(),
        SetupHookSpecificOutputSchema(),
        PreModelSwitchHookSpecificOutputSchema(),
        PostModelSwitchHookSpecificOutputSchema(),
        SubagentStartHookSpecificOutputSchema(),
        PostToolUseHookSpecificOutputSchema(),
        PostToolUseFailureHookSpecificOutputSchema(),
        PostToolBatchHookSpecificOutputSchema(),
        StopHookSpecificOutputSchema(),
        SubagentStopHookSpecificOutputSchema(),
        PermissionDeniedHookSpecificOutputSchema(),
        NotificationHookSpecificOutputSchema(),
        PermissionRequestHookSpecificOutputSchema(),
        ElicitationHookSpecificOutputSchema(),
        ElicitationResultHookSpecificOutputSchema(),
        CwdChangedHookSpecificOutputSchema(),
        FileChangedHookSpecificOutputSchema(),
        WorktreeCreateHookSpecificOutputSchema(),
        MessageDisplayHookSpecificOutputSchema(),
      ]).optional(),
    }),
  );
  ElicitationHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("Elicitation"),
      action: _enum(["accept", "decline", "cancel"]).optional(),
      content: record(stringSchema(), unknown()).optional(),
    }).describe(
      "Hook-specific output for the Elicitation event. Return this to programmatically accept or decline an MCP elicitation request.",
    ),
  );
  ElicitationResultHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("ElicitationResult"),
      action: _enum(["accept", "decline", "cancel"]).optional(),
      content: record(stringSchema(), unknown()).optional(),
    }).describe(
      "Hook-specific output for the ElicitationResult event. Return this to override the action or content before the response is sent to the MCP server.",
    ),
  );
  WorktreeCreateHookSpecificOutputSchema = DoctorLazy(() =>
    objectSchema({
      hookEventName: literal("WorktreeCreate"),
      worktreePath: stringSchema(),
    }).describe(
      "Hook-specific output for the WorktreeCreate event. Provides the absolute path to the created worktree directory. Command hooks print the path on stdout instead.",
    ),
  );
  HookOutputSchema = DoctorLazy(() => union([AsyncHookInputSchema(), SyncHookOutputSchema()]));
  SkillCommandSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().describe("Skill name (without the leading slash)"),
      description: stringSchema().describe("Description of what the skill does"),
      argumentHint: stringSchema().describe('Hint for skill arguments (e.g., "<file>")'),
      aliases: array(stringSchema())
        .optional()
        .describe(
          "Alternate names that resolve to this command (e.g., /cost and /stats both resolve to /usage)",
        ),
      builtin: booleanSchema()
        .optional()
        .describe(
          "True when the command is Claude Code's own; absent for a command defined by a user, project, plugin or MCP server. Rows can share a name: when a marked row carries it, /name runs that one, and an unmarked row is the one /name runs only when no marked row shares its name. The marker describes the row's name, not its aliases: a typed alias runs a command that has it as its name, when one exists, whatever this marker says.",
        ),
      plugin: stringSchema()
        .optional()
        .describe(
          "@internal The plugin that registered the command through `$.command.register`, by name, so a client can say whose it is: the name and description are the plugin's own words. Absent for every other command, one a plugin the binary carries registered included. Untrusted text: escape it before display.",
        ),
    }).describe("Information about an available skill (invoked via /command syntax)."),
  );
  AgentDefinitionSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().describe('Agent type identifier (e.g., "Explore")'),
      description: stringSchema().describe("Description of when to use this agent"),
      model: stringSchema()
        .optional()
        .describe(
          "Model this agent uses: an alias or model ID, or 'inherit' for the parent's model. If omitted, uses the default subagent model when one is configured, else the parent's model",
        ),
    }).describe("Information about an available subagent that can be invoked via the Task tool."),
  );
  ModelOptionSchema = DoctorLazy(() =>
    objectSchema({
      value: stringSchema().describe("Model identifier to use in API calls"),
      resolvedModel: stringSchema()
        .optional()
        .describe(
          "Canonical wire model id this row's `value` resolves to (e.g. 'sonnet' \u2192 'claude-sonnet-5'). Lets hosts match a persisted explicit id against the alias row that covers it.",
        ),
      displayName: stringSchema().describe("Human-readable display name"),
      description: stringSchema().describe("Description of the model's capabilities"),
      supportsEffort: booleanSchema().optional().describe("Whether this model supports effort levels"),
      supportedEffortLevels: array(_enum(["low", "medium", "high", "xhigh", "max"]))
        .optional()
        .describe("Available effort levels for this model"),
      supportsAdaptiveThinking: booleanSchema()
        .optional()
        .describe(
          "Whether this model supports adaptive thinking (Claude decides when and how much to think)",
        ),
      supportsFastMode: booleanSchema().optional().describe("Whether this model supports fast mode"),
      supportsAutoMode: booleanSchema().optional().describe("Whether this model supports auto mode"),
      supportsThinkingOff: booleanSchema()
        .optional()
        .describe("@internal Whether thinking can be turned off for this model"),
      disabled: booleanSchema()
        .optional()
        .describe(
          "@internal Model is visible but not selectable (e.g. a model the org's Zero Data Retention setting excludes). The human-readable reason is folded into `description`; a structured disabledReason field is the extension point if a consumer ever needs the reason separately.",
        ),
      promoListPrice: stringSchema()
        .optional()
        .describe(
          "@internal List price (e.g. `$3/$15`) for a model currently on a launch promo. `description` carries only the promo price so plain-text consumers read it unambiguously; rich pickers prepend this struck-through before the first `$X/$Y` in `description`. Absent when no promo is active.",
        ),
    }).describe("Information about an available model."),
  );
  AccountInfoSchema = DoctorLazy(() =>
    objectSchema({
      email: stringSchema().optional(),
      organization: stringSchema().optional(),
      subscriptionType: stringSchema().optional(),
      tokenSource: stringSchema().optional(),
      apiKeySource: stringSchema().optional(),
      apiProvider: _enum([
        "firstParty",
        "bedrock",
        "vertex",
        "foundry",
        "anthropicAws",
        "anthropicGoogleCloud",
        "mantle",
        "gateway",
      ])
        .optional()
        .describe(
          'Active API backend. Anthropic OAuth login only applies when "firstParty"; for 3P providers the other fields are absent and auth is external (AWS creds, gcloud ADC, etc.). "gateway" means the CLI is authenticated against an enterprise gateway.',
        ),
    }).describe("Information about the logged in user's account."),
  );
  McpServerRefSchema = DoctorLazy(() =>
    union([stringSchema(), record(stringSchema(), McpServerConfigSchema())]),
  );
  SubagentDefinitionSchema = DoctorLazy(() =>
    objectSchema({
      description: stringSchema().describe("Natural language description of when to use this agent"),
      tools: array(stringSchema())
        .optional()
        .describe(
          "Array of allowed tool names. If omitted, inherits all tools from parent. Note: passing 'Skill' here is deprecated \u2014 use the `skills` field instead.",
        ),
      disallowedTools: array(stringSchema())
        .optional()
        .describe(
          "Array of tool names to explicitly disallow for this agent. MCP server-level specs (mcp__server, mcp__server__*, mcp__*) remove every tool from the named server (or all MCP tools).",
        ),
      prompt: stringSchema().describe("The agent's system prompt"),
      model: stringSchema()
        .optional()
        .describe(
          "Model alias (e.g. 'fable', 'opus', 'sonnet', 'haiku') or full model ID (e.g. 'claude-fable-5'). 'inherit' uses the main model; if omitted, uses the default subagent model when one is configured, else the main model",
        ),
      mcpServers: array(McpServerRefSchema()).optional(),
      criticalSystemReminder_EXPERIMENTAL: stringSchema()
        .optional()
        .describe("Experimental: Critical reminder added to system prompt"),
      skills: array(stringSchema())
        .optional()
        .describe("Array of skill names to preload into the agent context"),
      initialPrompt: stringSchema()
        .optional()
        .describe(
          "Auto-submitted as the first user turn when this agent is the main thread agent. Slash commands are processed. Prepended to any user-provided prompt.",
        ),
      maxTurns: numberSchema()
        .int()
        .positive()
        .optional()
        .describe("Maximum number of agentic turns (API round-trips) before stopping"),
      autoCompactWindow: numberSchema()
        .int()
        .min(TRANSPORT_LABELS)
        .max(GLOBAL_CONFIG_FIELD_KINDS)
        .optional()
        .describe(
          "Token count at which this agent compacts its own conversation when it runs as a subagent. It only lowers the window the subagent would otherwise inherit. No effect on the main session agent.",
        ),
      background: booleanSchema()
        .optional()
        .describe("Run this agent as a background task (non-blocking, fire-and-forget) when invoked"),
      omitClaudeMd: booleanSchema()
        .optional()
        .describe(
          "Run this agent without the user, project and local CLAUDE.md instruction files when it runs as a subagent; managed policy files are kept. For agents that take everything they need from the delegation prompt. No effect on the main session agent.",
        ),
      memory: _enum(["user", "project", "local"])
        .optional()
        .describe(
          "Scope for auto-loading agent memory files. 'user' - ~/.claude/agent-memory/<agentType>/, 'project' - .claude/agent-memory/<agentType>/, 'local' - .claude/agent-memory-local/<agentType>/",
        ),
      effort: union([_enum(["low", "medium", "high", "xhigh", "max"]), numberSchema().int()])
        .optional()
        .describe("Reasoning effort level for this agent. Either a named level or an integer"),
      permissionMode: PermissionModeSchema()
        .optional()
        .describe("Permission mode controlling how tool executions are handled"),
      observer: stringSchema()
        .optional()
        .describe(
          "Agent type auto-spawned as a background observer whenever this agent runs. The observer receives read-only activity digests and reports via the ObserverReport tool; it never participates in the task.",
        ),
      observerMessage: stringSchema()
        .optional()
        .describe(
          "Supplemental postamble appended (after the harness-owned default) to each activity digest sent to the observer. Blank values are ignored.",
        ),
    }).describe("Definition for a custom subagent that can be invoked via the Agent tool."),
  );
  SettingsSourceSchema = DoctorLazy(() =>
    _enum(["user", "project", "local"]).describe(
      "Source for loading filesystem-based settings. 'user' - Global user settings (~/.claude/settings.json). 'project' - Project settings (.claude/settings.json). 'local' - Local settings (.claude/settings.local.json).",
    ),
  );
  SDKLocalMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("local").describe("Plugin type. Currently only 'local' is supported"),
      path: stringSchema().describe("Absolute or relative path to the plugin directory"),
      skipMcpDiscovery: booleanSchema()
        .optional()
        .describe(
          "When true, the engine loads skills/hooks/agents/commands from this plugin but does NOT read its .mcp.json or manifest mcpServers. Use when the SDK host owns this plugin's MCP connections.",
        ),
    }).describe("Configuration for loading a plugin."),
  );
  SKIPPED_LINKS_DESCRIPTION =
    "Count of tracked files NOT restored or deleted because a symlink, hard link, or other non-regular file was detected at the tracked path, its parent directory no longer resolves to where it pointed when the checkpoint was taken, or its backup could not be safely read. Only populated by a real (non-dryRun) rewind \u2014 on a dryRun response the field is never set and the preview counts do not reflect link-safety refusals. Absent or 0 on a real rewind means no link-safety refusals occurred; other per-file failures (for example a missing backup file) are not counted here; they are reported in telemetry, and when every differing file fails to restore the rewind itself fails (canRewind: false).";
  RewindFilesResultSchema = DoctorLazy(() =>
    objectSchema({
      canRewind: booleanSchema(),
      error: stringSchema().optional(),
      filesChanged: array(stringSchema()).optional(),
      insertions: numberSchema().int().optional(),
      deletions: numberSchema().int().optional(),
      skippedLinks: numberSchema().optional().describe(SKIPPED_LINKS_DESCRIPTION),
    }).describe("Result of a rewindFiles operation."),
  );
  SDKUserMessageSchema = DoctorLazy(() =>
    UserMessageParamSchema().describe(
      'An Anthropic Messages API user message: a MessageParam with role "user" whose content is a string or an array of content blocks (text, image, document, tool_result, ...). See the Messages API reference for the block types.',
    ),
  );
  AssistantContentSchema = DoctorLazy(() => RequestContentSchema());
  SDKAssistantMessageSchema = DoctorLazy(() =>
    MessageBlockSchema().describe(
      'Shaped like an Anthropic Messages API Message object (role "assistant"): id, model, content blocks (text, thinking, tool_use, ...), stop_reason and usage. When streamed, content typically holds the single block this message delivers and stop_reason is still null \u2014 see SDKAssistantMessage. See the Messages API reference for the block types.',
    ),
  );
  StreamEventSchema = DoctorLazy(() =>
    unknown().describe(
      "One Anthropic Messages API streaming event (message_start, content_block_start, content_block_delta, content_block_stop, message_delta, message_stop) as defined for the streaming Messages API.",
    ),
  );
  _ = DoctorLazy(() => stringSchema());
  MainLoopUsageSchema = DoctorLazy(() =>
    UsageSchema().describe(
      "MAIN AGENT LOOP ONLY \u2014 excludes Task subagent, sidechain, and auxiliary model calls, and is per-turn in streaming-input sessions. Prefer modelUsage for token/cost accounting.",
    ),
  );
  ApiErrorCodeSchema = DoctorLazy(() =>
    _enum([
      "authentication_failed",
      "oauth_org_not_allowed",
      "account_on_hold",
      "verification_required",
      "billing_error",
      "rate_limit",
      "overloaded",
      "invalid_request",
      "model_not_found",
      "server_error",
      "unknown",
      "max_output_tokens",
      "cloud_credential_error",
    ]),
  );
  CompactStatusSchema = DoctorLazy(() => union([literal("compacting"), literal("requesting"), nullSchema()]));
  ResourceLinkSchema = DoctorLazy(() =>
    objectSchema({
      uri: stringSchema(),
      name: stringSchema(),
      title: stringSchema().optional(),
      description: stringSchema().optional(),
      mimeType: stringSchema().optional(),
      size: numberSchema().optional(),
      annotations: record(stringSchema(), unknown()).optional(),
    }),
  );
  ToolResultRemedySchema = DoctorLazy(() =>
    objectSchema({
      kind: _enum(CAPABILITY_BLOCK_KINDS),
      servers: array(stringSchema())
        .optional()
        .describe(
          "mcp_needs_auth / mcp_disabled: the server names as configured. mcp_required_missing: the name patterns the agent definition requires that no connected server matches.",
        ),
      provider: _enum(AUTH_PROVIDER_VALUES)
        .optional()
        .describe(
          "auth_expired / auth_overridden / auth_missing_scope / design_needs_authorization: whose login the fix names \u2014 'claude_ai' (the claude.ai account, /login) or 'claude_design' (Claude Design's own authorization, /design login).",
        ),
      path: stringSchema()
        .optional()
        .describe(
          "outside_reads_blocked: the path the read block refused, when the refusal names one. staged_for_review: the settings file the write was held for.",
        ),
      managed: booleanSchema()
        .optional()
        .describe(
          "outside_reads_blocked: an organization policy sets the block, so the user cannot remove it. auth_overridden: the overriding credential was injected by the host environment, so nothing in this session can unset it.",
        ),
      feature: _enum(BLOCKABLE_FEATURES)
        .optional()
        .describe("feature_disabled / policy_denied: the feature that is off."),
      cause: _enum(FEATURE_DISABLED_CAUSES)
        .optional()
        .describe(
          "feature_disabled: why the feature is off \u2014 'managed_settings' (CLAUDE_CODE_DISABLE_WORKFLOWS, or disableWorkflows or enableWorkflows: false set by a layer above the user's own settings), 'org_policy', 'unavailable' (not launched for this account), 'user_setting' (the user's /config setting is off, including a disableWorkflows in their own settings, and nothing the user cannot clear also keeps them off), or 'unsupported_runtime' (this Claude Code process is not running on Bun, the runtime its binary is built with, and workflow scripts run only there).",
        ),
      policy_kind: _enum(POLICY_DENIAL_KINDS)
        .optional()
        .describe(
          "policy_denied: the verdict \u2014 'org_denied' (the organization's policy turns the feature off) or 'latched' (a HIPAA-regulated organization signed in earlier in this process; restarting clears it).",
        ),
    }).describe(
      "@internal The fix a host can offer for a tool result, stamped from structured producer state (never parsed from the result text). Kinds: mcp_needs_auth, mcp_disabled, mcp_required_missing, auth_expired, auth_overridden, auth_missing_scope, design_needs_authorization, sandbox_violation, outside_reads_blocked, memory_paused, feature_disabled, policy_denied, spawn_arg_limit (the command's exec image exceeded the OS argument limit), staged_for_review (a settings-file write held for the machine owner's review). New kinds are additive; treat an unknown kind as absent.",
    ),
  );
  MessageOriginSchema = DoctorLazy(() =>
    discriminatedUnion("kind", [
      objectSchema({
        kind: literal("human"),
      }),
      objectSchema({
        kind: literal("channel"),
        server: stringSchema(),
      }),
      objectSchema({
        kind: literal("peer"),
        from: stringSchema(),
        fromMode: _enum(["bypass", "prompting"])
          .optional()
          .describe(
            "The SENDING session's permission class as declared by the host that injects this message on local stdin ('bypass' for sessions that run tools without asking, 'prompting' otherwise). Lets the recipient deliver a same-class message immediately while a cross-class or undeclared sender is still held at a recipient that runs without asking. Honored only from the injecting host on local stdin; absent when the host does not declare it.",
          ),
        name: stringSchema()
          .optional()
          .describe(
            "Sender display name, normalized by the harness: Unicode control, format, surrogate, and line/paragraph-separator code points stripped (categories Cc/Cf/Cs/Zl/Zp \u2014 covers bidi controls, zero-width characters, and tag characters), trimmed, at most 64 code points (+ ellipsis, never splitting a surrogate pair). Sender-asserted display text (the addressable identity is `from`) \u2014 render it as reported speech, but no client-side character sanitization is needed. Absent when the wire is not exactly one harness-formed envelope and on messages from older senders.",
          ),
        fromSession: stringSchema()
          .optional()
          .describe(
            "The sender's host-openable session id (the envelope's `from-session` attribute \u2014 e.g. a desktop `local_<uuid>` or a cloud session `session_`/`ses_` id), set by the sender's host so a receiving UI can link this message back to the sending session. Sender-asserted like `from`: a navigation target only, never authority. Absent when the sender's host provides none and on messages from older senders.",
          ),
        inbound_origin: stringSchema()
          .optional()
          .describe(
            "@internal Server-asserted ingest path of the demoted delivery, copied at classification from the message-level `inbound_origin`.",
          ),
        senderTaskId: stringSchema()
          .optional()
          .describe(
            "Task id of the in-process background subagent that sent this message, stamped by the harness from the sending loop (never from tool input). Absent for cross-session peers.",
          ),
        body: stringSchema()
          .optional()
          .describe(
            "Decoded message body with the peer envelope stripped \u2014 byte-exact with what the model sees. Present only when the turn is exactly one harness-formed envelope (or an in-process agent message); render this instead of re-parsing the message text.",
          ),
        verifiedPeerPid: numberSchema()
          .optional()
          .describe(
            "Kernel-verified pid of the process that connected to this session's cross-session messaging socket, read from the connection (SO_PEERCRED / LOCAL_PEERPID) \u2014 never from the payload. This identifies the CONNECTING process, which for relayed traffic (e.g. a daemon forwarding on another session's behalf) is the relay, not the message's author. Key sender identity on this, never on `from`: `from` is sender-authored and kept only for reply routing, so it is forgeable by any same-user process. Absent when unverifiable (Windows, non-UDS ingress) \u2014 never a wrong value. Pids are recyclable: provenance, not an authentication token.",
          ),
        handback: literal(true)
          .optional()
          .describe(
            "@internal Present, and always true, when the message is a subagent's final report to the agent that launched it, delivered through the SubagentHandback tool. Stamped by the harness, never from tool input. `body` is then the hand-back frame line with the indented report under it, and any harness note above it; `handbackReportText` and `handbackNote` carry those two parts for display. A boolean mark: not the `handback` state string of a task notification or of an Agent tool result. A hand-back is never joined, so neither this mark nor `flagged` appears beside `members`.",
          ),
        flagged: literal(true)
          .optional()
          .describe(
            "@internal Present, and always true, on a hand-back that auto mode's review blocked, or that it could not judge because a safety filter refused the review request: the report was delivered all the same, under the SECURITY WARNING that `handbackNote` carries. Never cap or fold such a message: show the note and the report in full. Absent on a hand-back that was not flagged, including one delivered under the note that the review was unavailable.",
          ),
        handbackNote: stringSchema()
          .optional()
          .describe(
            "@internal On a hand-back: the note the harness composed above the frame line in `body`, without the indent. On a blocked report it quotes the review's reason, which can quote the report, so show it as untrusted text. Absent when there is no note.",
          ),
        handbackReportText: stringSchema()
          .optional()
          .describe(
            "@internal On a hand-back: the subagent's report as the model reads it, under the frame line in `body`, without the indent. Draw it as a separate element from `handbackNote`: the two fields are their only boundary. Absent wherever `body` is and on a message that is not a hand-back.",
          ),
        members: array(
          objectSchema({
            body: stringSchema(),
          }),
        )
          .optional()
          .describe(
            "@internal On a prompt that joins several queued messages from this sender: the joined messages in the order the model reads them, each with its own `body`. The origin's `body` is then absent. Absent on a message that was not joined and when any joined message had no `body`.",
          ),
      }),
      objectSchema({
        kind: literal("task-notification"),
        subkind: _enum(["scheduled-trigger", "peer-send-message", "projects-relay", "session-inbox"])
          .optional()
          .describe(
            "Present when the delivery is the fired stored prompt of a scheduled task ('scheduled-trigger', stamped from server-asserted provenance, or declared by a local host for its own scheduled runs; the schedule attests storage, not authorship) or a coordinator co-member SendMessage delivery ('peer-send-message': model-authored text from another of the same user's sessions, verified by the server-stamped receiver co-membership \u2014 task-notification for prompt authority, but distinguishable so the receive-side crossSessionInbound setting can apply to it). The harness frames a scheduled-trigger delivery as the session's assigned task instead of the generic background-notification frame. Absent on webhook, PR-steward, plugin, and background-event deliveries.",
          ),
        fireReason: stringSchema()
          .optional()
          .describe(
            "On a 'scheduled-trigger' delivery, why it fired: a short lowercase token such as 'scheduled', 'manual', 'retry', 'catch_up' or 'api'. Set by the server for cloud scheduled tasks, or declared by a local host for its own scheduled runs, which is honored only in a process the host started with CLAUDE_CODE_HOST_SCHEDULED_RUN=1 (a local host's value is kept only if it is 1 to 32 lowercase letters or underscores); absent when neither sent one.",
          ),
        producer: literal("session-task")
          .optional()
          .describe(
            "@internal Present ('session-task') when the notification reports on work this session itself launched: a background agent, shell command, workflow, monitor, MCP or remote task settling, a detached tool call, or a hook rewake or worker check-in following up on such work. Absent on webhook, artifact and other externally-authored deliveries.",
          ),
        runId: stringSchema()
          .optional()
          .describe(
            "On a background task's own notification: the run_id its task_* events carried, as of when the notification was queued. Not part of the text the model reads.",
          ),
        taskKind: literal("mcp-task")
          .optional()
          .describe(
            "@internal Present ('mcp-task') only on a notification that an MCP server's own task has ended, and not on every one. Narrower than task_type 'mcp_task', which also covers an MCP tool call moved to the background.",
          ),
      }),
      objectSchema({
        kind: literal("coordinator"),
      }),
      objectSchema({
        kind: literal("unclassified"),
      }).describe(
        "Injected turn whose ingress classification found no provenance. Framed by the harness as a non-user source in both drains; never presumed human, never host-replayed.",
      ),
      objectSchema({
        kind: literal("observer"),
        from: stringSchema(),
        senderTaskId: stringSchema(),
      }).describe(
        "Report from a background observer agent to the agent it observes. One-way by construction \u2014 the observed agent must not reply.",
      ),
      objectSchema({
        kind: literal("auto-continuation"),
      }),
      objectSchema({
        kind: literal("observer-activity"),
      }).describe(
        "Activity digest delivered to an observer agent. The message body is the self-framing digest (envelope + postamble); observed content is data, not instructions.",
      ),
    ]).describe(
      "Provenance of a user-role message (peer session, team lead, channel). A host wrapping keyboard input must stamp {kind:'human'} explicitly \u2014 absent origin is treated as unattributed and fails closed at strict isHuman() trust gates.",
    ),
  );
  SDKUserMessageSchema_2 = DoctorLazy(() =>
    objectSchema({
      type: literal("user"),
      message: SDKUserMessageSchema(),
      parent_tool_use_id: stringSchema().nullable(),
      isSynthetic: booleanSchema().optional(),
      tool_use_result: unknown()
        .optional()
        .describe(
          "Structured tool output \u2014 the tool's full Output object, not the string content sent to the model. The shape is per-tool, keyed by the matching tool_use block's name (see the *Output types in toolTypes); MCP and dynamic tools carry their own shapes, so the field stays unknown-typed. For the Agent/Task tool the completed shape is the subagent's final report without the model-directed agentId/usage trailer, plus run totals \u2014 render from it instead of parsing the tool_result text. A call that stepped aside for a message the user sent (today a WebFetch or WebSearch call) carries `{ detachedToolCall: true }` in place of its Output: the call is still running, and its result reaches the model in a later turn.",
        ),
      priority: _enum(["now", "next", "later"]).optional(),
      requeue_if_interrupted_within_ms: numberSchema()
        .int()
        .positive()
        .optional()
        .describe(
          "@internal Input only. Asks the CLI to put this prompt back in its queue, instead of losing it, when an interrupt crosses with a running turn taking the prompt in: the interrupt was sent while its sender still believed the prompt was waiting. The value says for how long an interrupt is taken to have been sent so: a whole number of milliseconds from 1, and above 10000 it counts as 10000. The time runs from the moment the turn announces the model request that carries the prompt (system/status 'requesting', which is on the wire only with partial messages); until then it has not begun. The prompt is put back when an interrupt control request without cancel_queued stops that turn within the time and before the model's next reply has begun to arrive. It goes back to the front of the queue under the same uuid and runs in a later turn of its own, after any queued prompt of higher priority; prompts queued behind it are not merged into that turn's prompt, though the turn can take them in as any turn does. The interrupt's response lists it under still_queued and under put_back, and from then on cancel_async_message can withdraw it. The stopped turn reports no 'cancelled' for it, counts it in its result's queued_turn_count (if its origin is stamped user-driven, as for any queued prompt) and leaves it out of that result's user_message_uuids (on an error result an empty list, with no user_message_uuid, if nothing else is listed). On stdout it reports command_lifecycle 'queued' a second time; over a remote transport its delivery is not reported 'processed' until its later turn ends. With cancel_queued:true it stays with the stopped turn and is not listed under the response's cancelled. The row the stopped turn wrote for it (a queued_command attachment) leaves the conversation and is never stored, so the model sees the prompt once; until the prompt can no longer be put back, that row and the rows after it are kept out of the stored transcript. UserPromptSubmit hooks run for it twice, and what they added to the stopped turn stays. If a compaction begins while that row is kept out, the row is stored at once and stays in the conversation, so the prompt, if an interrupt puts it back or has just done so, is seen twice. A prompt is put back at most once, and never after the host's own cancel_async_message for it answered cancelled:false. Of several prompts taken in since the model last spoke, only the last can be put back; the others stay with the stopped turn. The field is ignored when it is not such a number, when the message has no uuid or has shouldQuery:false, and when the message is not a person's own typing: a synthetic, hidden, client-composed, seeded, peer or relayed message, one that declares a non-human origin, or one whose client_platform names no app or keyboard that a person types in. claude-code-server also needs a client_platform, and one that names an app. A CLI that does not advertise interrupt_requeue_taken_v1 on system/init ignores the field too.",
        ),
      origin: MessageOriginSchema().optional(),
      client_platform: stringSchema()
        .optional()
        .describe(
          "@internal The `anthropic-client-platform` value of the client that sent this message (e.g. `ios`, `android`, `web_claude_ai`, `desktop_app`). Injected server-side by CCR ingress from the request header.",
        ),
      inbound_origin: stringSchema()
        .optional()
        .describe(
          "@internal Server-asserted ingest path that produced this message. Not settable by clients.",
        ),
      server_received_wall_ms: numberSchema()
        .optional()
        .describe(
          "@internal Epoch ms on the session server's clock when it received the HTTP request that delivered this message. Written by the session server; the CLI copies it to the turn's result as user_message_server_received_wall_ms.",
        ),
      historical: booleanSchema()
        .optional()
        .describe(
          "@internal Replayed history rather than a live message: the Remote Control bridge stamps it on the messages it flushes to the session server, which also stamps it on deliveries it replays.",
        ),
      shouldQuery: booleanSchema()
        .optional()
        .describe(
          "When false, the message is appended to the transcript without triggering an assistant turn. It will be merged into the next user message that does query.",
        ),
      timestamp: stringSchema()
        .optional()
        .describe(
          "ISO timestamp when the message was created on the originating process. Older emitters omit it; consumers should fall back to receive time.",
        ),
      is_meta: literal(true)
        .optional()
        .describe(
          "@internal True when the message was synthesized by the loop (not user keyboard input). From internal UserMessage.isMeta.",
        ),
      seeded_summon: literal(true)
        .optional()
        .describe("@internal Desktop host only: the host's own seeded summon."),
      client_composed: literal(true)
        .optional()
        .describe(
          "The client composed this turn from content the user did not type; the CLI delivers its text as written, with no `@path` file-mention expansion and no slash-command dispatch. On current CLIs the turn-start attachment pass is skipped as a whole: `@server:resource` MCP mentions are not expanded either, and the prompt is sent without the context the CLI normally attaches alongside it (nested `CLAUDE.md` and rules files, skill and tool listings, reminders); the pass the CLI runs between tool calls is unaffected.",
        ),
      text_not_typed: preprocess(trueOrUndefined, literal(true).optional()).describe(
        "@internal No person typed this message's text in this session (a server or an app composed it). The text is delivered as written and is not treated as typing: no slash-command dispatch, no at-mention expansion beyond the message's own uploaded files, no reminder or command from keywords in it, and a skill named in it does not count as typed by the user. Who sent the message, and whether a person is present, stays with its origin. The checks of whether a message's words are the user's own do not read this mark yet: they too go by the origin. Unlike client_composed, the turn-start attachment pass still runs. Any value other than false or null is read as true.",
      ),
      initiator: stringSchema()
        .optional()
        .describe(
          "@internal The host's own label for what started this turn (e.g. the desktop app's `scheduled-task`, `sleep-auto-resume`); `user` or absent means a person sent it. Usage attribution only; it does not change how the turn runs.",
        ),
      is_visible_in_transcript_only: literal(true)
        .optional()
        .describe(
          "@internal True when the message is stored in the transcript but not rendered in the live UI.",
        ),
      is_virtual: literal(true)
        .optional()
        .describe("@internal Display-only: rendered in the UI but filtered before API send."),
      is_compact_summary: literal(true)
        .optional()
        .describe("@internal True when this user message is a compact-summary synthetic message."),
      summarize_metadata: objectSchema({
        messages_summarized: numberSchema().int(),
        user_context: stringSchema().optional(),
        direction: _enum(["from", "up_to"]).optional(),
      })
        .optional()
        .describe(
          '@internal Metadata for "Summarize from here" / "Summarize up to here" summaries (from internal UserMessage.summarizeMetadata).',
        ),
      mcp_meta: objectSchema({
        _meta: record(stringSchema(), unknown()).optional(),
        structured_content: record(stringSchema(), unknown()).optional(),
        resource_links: array(ResourceLinkSchema())
          .optional()
          .describe(
            "CLI-owned: the `resource_link` content blocks the MCP tool returned, collected from the raw result before the CLI rewrites each into the `[Resource link: NAME] URI` text line the model reads \u2014 so a host renders the files without parsing that line. At most 50 links and 64 KiB serialized; absent when the result had none, and absent on a subagent's tool results (parent_tool_use_id set), whose mcpMeta carries `_meta` only. On today's wire this rides the mcpMeta spread as `tool_use_result.resourceLinks`. A sibling of `_meta`, never inside it: a server cannot supply it, and server `_meta` keys under the CLI-reserved `com.anthropic/` prefix are dropped before this message.",
          ),
      })
        .optional()
        .describe(
          "@internal MCP protocol metadata passed through to SDK consumers, never sent to the model (from internal UserMessage.mcpMeta).",
        ),
      tool_result_meta: array(
        objectSchema({
          id: stringSchema(),
          non_execution_kind: _enum(NON_EXECUTION_KINDS).optional(),
          user_feedback: stringSchema().optional(),
          remedy: ToolResultRemedySchema().optional(),
          permission_decision: objectSchema({
            decision: _enum(ELICITATION_ACTIONS),
            source: stringSchema(),
            reason_type: _enum(PERMISSION_DECISION_REASON_TYPES).optional().catch(undefined),
          })
            .optional()
            .catch(undefined),
        }),
      )
        .optional()
        .describe(
          "@internal Display metadata for this message's tool_result blocks, keyed by tool_use_id. non_execution_kind is the harness-stamped reason an is_error:true result did not carry the tool's own execution output (user-rejected / permission-rule / automode-* / interrupted / cancelled); absent means the tool ran to completion. remedy is the fix a host can offer for what the result reports (see SDKToolResultRemedy). An entry may carry a remedy alone, on a result that did run (a staged write, a sandbox violation on exit 0), so whether a call ran is read from non_execution_kind, never from an entry's presence. On a subagent's messages (parent_tool_use_id set), entries carry only permission_decision, so those messages do not say whether a call ran. permission_decision is how the call's permission check ended, as Claude Code's claude_code.tool.blocked_on_user trace span reports it. decision is accept, reject or cancelled. source names what decided: config, classifier, hook, user_temporary, user_permanent, user_reject, user_abort, or invalid_input, permission_updated_input_invalid or server_fallback_tombstone when bad input or the server ended the wait. Which label a rule gets depends on the session: in SDK sessions a rule for this session or in the user's own settings reports user_temporary, user_permanent or user_reject and other rules report config, while interactive sessions report every rule as config. reason_type is the kind of reason the check gave when it decided by itself, such as 'rule' whenever a rule decided, or 'classifier' for an auto-mode allow, which reports source config. reason_type is absent when a person or the SDK host answered the question, when the check's outcome was still a question, and for user_abort and the last three sources above. permission_decision is absent when the call ended before its permission check, and on some results built apart from the call's own run, such as a plugin hook's refusal, a hook's rewrite of a denied result, or the result the tool executor writes for a queued call that a stop cancelled. user_feedback is the deny comment a human typed at a permission prompt (the local dialog or a bridge client's deny UI), before the CLI's reject-message framing \u2014 absent when the deny was resolved by a coordinator, channel relay, or hook rather than a human. A deny answered through the SDK control protocol (can_use_tool / --permission-prompt-tool) currently reports as 'permission-rule' with no user_feedback, because that wire carries no human-provenance signal. Wrapper-level sibling \u2014 never inside `message.content` \u2014 so it is not replayed to the model. Clients read this instead of string-matching the result prose.",
        ),
      source_tool_use_id: stringSchema()
        .optional()
        .describe(
          "@internal When this message was generated by a tool via newMessages, links it to that tool_use id.",
        ),
      source_tool_assistant_uuid: stringSchema()
        .optional()
        .describe(
          "@internal For tool_result messages: UUID of the assistant message containing the matching tool_use block. Used for parentUuid assignment in transcript.",
        ),
      image_paste_ids: array(numberSchema().int())
        .optional()
        .describe(
          "@internal Paste IDs for images in this message, in order of appearance. REPL-local state \u2014 candidate for surface-side if daemon has no use for it.",
        ),
      plan_content: stringSchema()
        .optional()
        .describe(
          "@internal Plan to implement (cleared-context flow). When set, the message is rendered with plan styling.",
        ),
      permission_mode: PermissionModeSchema()
        .optional()
        .describe("@internal Permission mode active when this message was sent (for rewind restoration)."),
      interrupted_message_id: stringSchema()
        .optional()
        .describe(
          "@internal For [Request interrupted by user] markers only: the API msg_* id that Esc cancelled.",
        ),
      refused_message_id: stringSchema()
        .optional()
        .describe(
          "@internal Only on the synthetic message that re-asks the same model after a refusal: the API msg_* id of the refused response. Absent when the CLI has no well-formed id for it.",
        ),
    }),
  );
  SDKUserMessageBaseSchema = DoctorLazy(() =>
    SDKUserMessageSchema_2()
      .extend({
        uuid: _().optional(),
        pasted_content: array(AssistantContentSchema())
          .optional()
          .describe(
            "Content the user pasted into the prompt rather than typed: each entry a string or an array of content blocks. The CLI appends the text of each entry after the typed text, in order, and may wrap it in `<pasted_content>` tags. Blocks other than text are ignored; send images and documents in `message.content`. A list of over 1,000 entries and blocks in all is ignored.",
          ),
        inline_pastes: array(stringSchema())
          .optional()
          .describe(
            "Text the user pasted that is still in `message.content` where they put it: each entry one paste. The prompt is not changed by the host; the CLI may wrap each entry in `<pasted_content>` tags where it still stands in the last text block. It looks for the first 100 entries that are not blank. For a paste the host took out of `message`, use `pasted_content` instead.",
          ),
        session_id: stringSchema().optional(),
        agent_id: stringSchema()
          .optional()
          .describe(
            "ID of the subagent that produced this message: the `task_id` of its task events, unchanged when the subagent is resumed. Absent on main-thread messages.",
          ),
        subagent_type: stringSchema().optional().describe("Subagent type that produced this message."),
        task_description: stringSchema()
          .optional()
          .describe("Description of the subagent task that produced this message."),
        file_attachments: array(unknown())
          .optional()
          .describe(
            "@internal Files a remote client attached to this prompt (each {file_uuid, file_name, is_image?, sha256?, file_size?}; src/bridge/inboundAttachmentSchema.ts reads them). Typed like SDKUserMessageReplay.file_attachments so the two message types stay assignable.",
          ),
      })
      .describe(
        "A user-role message. A client writes one to the CLI to submit a prompt (this starts a turn); the CLI emits them for user-role content it adds to the conversation itself, chiefly the tool_result blocks answering the assistant's tool_use blocks.",
      ),
  );
  SDKReplayMessageSchema = DoctorLazy(() =>
    SDKUserMessageSchema_2().extend({
      uuid: _(),
      session_id: stringSchema(),
      isReplay: literal(true),
      file_attachments: array(unknown()).optional(),
    }),
  );
  SDKBashCommandMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("bash_command"),
      command: stringSchema().describe(
        "Shell command run verbatim, without the model and without permission checks. Trust model matches the local TUI `!cmd` path (no sandbox, no per-command prompt). By default it runs in a one-shot `/bin/sh -c` (or `pwsh`) beside the conversation, which never sees it; on a cloud worker with tengu_cloud_session_shell on it runs as the TUI's `!cmd` does, through the Bash tool (its working directory carries over to later commands and to the model's Bash calls), as a turn of its own, so the model sees the command and its output. The worker refuses some commands with a row saying why (for example a stale one, one over 65,536 characters, one containing control characters, or one sent to a host that does not run them) and skips a duplicate silently (cli/headlessHost/bashCommand.ts).",
      ),
      cwd: stringSchema()
        .optional()
        .describe(
          "Working directory for the command. Falls back to the session cwd when omitted. With tengu_cloud_session_shell on, the command runs in the session's current directory and one naming any other directory is refused.",
        ),
      uuid: _().optional(),
      session_id: stringSchema().optional(),
    }).describe(
      "@internal A user-initiated shell command. Input-only \u2014 sent by CCR clients that surface a dedicated terminal UI; never emitted on stdout. Acknowledged on arrival and, unless blank, too long or a duplicate, echoed at once as a `<bash-input>` replay row; then answered with exactly one more row: its output (a replay frame when run beside the conversation; a plain user message after its own turn when it joins the conversation, possibly followed by the model replying) or a `<bash-stderr>Not run: \u2026</bash-stderr>` replay row saying why it was refused or dropped. A blank or too-long command gets only its Not run row; a duplicate gets nothing. Other rows can come between the echo and that row.",
    ),
  );
  RateLimitInfoSchema = DoctorLazy(() =>
    objectSchema({
      status: _enum(["allowed", "allowed_warning", "rejected"]),
      resetsAt: numberSchema().int().optional(),
      rateLimitType: _enum([
        "five_hour",
        "seven_day",
        "seven_day_opus",
        "seven_day_sonnet",
        "seven_day_overage_included",
        "overage",
      ]).optional(),
      utilization: numberSchema().optional(),
      unifiedWindows: objectSchema({
        five_hour: objectSchema({
          utilization: numberSchema(),
          resetsAt: numberSchema().int(),
          status: _enum(["allowed", "allowed_warning", "rejected"]).optional().catch(undefined),
          surpassedThreshold: numberSchema().optional().catch(undefined),
        }).optional(),
        seven_day: objectSchema({
          utilization: numberSchema(),
          resetsAt: numberSchema().int(),
          status: _enum(["allowed", "allowed_warning", "rejected"]).optional().catch(undefined),
          surpassedThreshold: numberSchema().optional().catch(undefined),
        }).optional(),
        seven_day_overage_included: objectSchema({
          utilization: numberSchema(),
          resetsAt: numberSchema().int(),
          status: _enum(["allowed", "allowed_warning", "rejected"]).optional().catch(undefined),
          surpassedThreshold: numberSchema().optional().catch(undefined),
        }).optional(),
      })
        .optional()
        .describe(
          "@internal Per-window usage for the session (5-hour), weekly (7-day), and overage-included weekly (per-model bucket; present only for accounts whose responses carry that window) subscription rate-limit windows, as read from the anthropic-ratelimit-unified-* response headers. utilization is the fraction of the window used (usually 0-1, same scale as the top-level utilization field; values above 1 occur when usage legitimately runs past a window's cap, e.g. lower-priority episodes past the 5-hour limit); resetsAt is unix epoch seconds. status is the status the server sent for the window: allowed_warning once past a warning threshold, rejected at or past its limit. A rejected window alone does not mean requests are refused; the top-level status says whether they are. surpassedThreshold is the highest warning threshold passed, as a fraction of the limit (1 once rejected). Each is absent when the server sent none or a value this version cannot read. Unlike the top-level status/utilization fields, which describe the currently limiting window, every window is tracked on every observation, and events are emitted when a window's rounded percentage, reset time, status or threshold moves, not only on status transitions. Windows absent from the account state are absent here. Absent until the first response carrying these headers is observed, and always absent for API-key, Bedrock, and Vertex sessions, whose responses do not carry them.",
        ),
      overageStatus: _enum(["allowed", "allowed_warning", "rejected"]).optional(),
      overageResetsAt: numberSchema().int().optional(),
      overageDisabledReason: _enum([
        "overage_not_provisioned",
        "org_level_disabled",
        "org_level_disabled_until",
        "out_of_credits",
        "seat_tier_level_disabled",
        "member_level_disabled",
        "seat_tier_zero_credit_limit",
        "group_zero_credit_limit",
        "member_zero_credit_limit",
        "org_service_level_disabled",
        "no_limits_configured",
        "fetch_error",
        "unknown",
      ]).optional(),
      isUsingOverage: booleanSchema().optional(),
      overageInUse: booleanSchema().optional(),
      overageEnabled: booleanSchema().optional(),
      surpassedThreshold: numberSchema().optional(),
      rateLimitGraceActive: booleanSchema()
        .optional()
        .describe(
          "@internal Usage-limit grace signal. Follows the latest served main-loop or subagent response: set when it reports grace-zone utilization > 0 (the server reports that only to a request that sent `anthropic-usage-limit: extended`, tengu_lantern_spool), cleared when a response the limiter ran on reports none or, if the latest in-zone response named the grace window's reset, once that reset passes on this machine's clock. Side calls, and responses with no `anthropic-ratelimit-unified-status` (the limiter did not run), are not read. A refused request's 429 is not read either, so while requests are refused the last value persists: still expire any UI derived from this field via resetsAt. While set, overageStatus allowed / allowed_warning means paid extra usage covers the overflow (nothing will be cut off). Stays true at hard exhaustion (status rejected); combine with status instead of reading this field alone as \"still usable\".",
        ),
      overagePeriodMonthly: objectSchema({
        utilization: numberSchema(),
      })
        .optional()
        .describe(
          "@internal Monthly service spend-cap telemetry for the Claude-in-Slack surface (CLAUDE_IN_SLACK_V2): utilization is fraction-of-cap.",
        ),
      overagePeriodChannel: objectSchema({
        utilization: numberSchema(),
      })
        .optional()
        .describe(
          "@internal Per-Slack-channel spend-cap telemetry for the Claude-in-Slack surface (CLAUDE_IN_SLACK_V2): utilization is fraction-of-cap. Absent when the channel has no individual cap.",
        ),
      limitScope: _enum(["service", "channel", "group_pool"])
        .optional()
        .describe(
          "Which spend limit blocked the request when it is not the member's own cap: 'group_pool' means a pooled group budget shared by the member's team is used up (the denial otherwise looks like the member's own monthly cap). Absent on a plain member denial and from older CLIs.",
        ),
      errorCode: _enum(["credits_required"]).optional(),
      canUserPurchaseCredits: booleanSchema().optional(),
      hasChargeableSavedPaymentMethod: booleanSchema().optional(),
      usageCreditOffer: objectSchema({
        kind: _enum(["pct_off", "extra_credit"]),
        headlinePct: numberSchema().int(),
        daysLeft: numberSchema().int(),
        label: stringSchema(),
      })
        .optional()
        .describe(
          "@internal A limited-time offer on usage credits the account holds at this limit, for the IDE extension's limit banner: the kind (a steeper discount, or extra credit for the same price), the headline percent every credit pack meets or beats, whole days left in the account's offer window, and the ready-made banner text. Present only on a rejected frame from a session the VS Code extension owns, once the server has answered that the account holds an active offer; absent otherwise. The prices themselves apply wherever the credits are bought.",
        ),
      adminRequestOffer: objectSchema({
        state: _enum(["can_ask", "pending", "sending", "sent"]),
        label: stringSchema(),
        doneLabel: stringSchema(),
        confirm: booleanSchema(),
        confirmPrompt: stringSchema(),
        lastFileFailed: booleanSchema().optional(),
        revision: numberSchema().int().optional(),
      })
        .optional()
        .describe(
          "@internal The IDE limit banner's offer to ask the member's admin for a higher spend limit: its state (can ask, already pending, sending, sent), its copy, whether the last filing failed, and a counter that moves when a click could not be acted on. Present only on a rejected frame from a VS Code extension session for a Team or Enterprise member at their own spend limit, while tengu_tallow_quoit serves it, its kill switch is on and the organization's requests are not switched off.",
        ),
    }).describe("Rate limit information for claude.ai subscription users."),
  );
  MAX_DISPLAY_NAME_CHARS = 128;
  MAX_MODEL_ID_CHARS = 64;
  UsageReportSchema = DoctorLazy(() =>
    objectSchema({
      session: objectSchema({
        total_cost_usd: numberSchema(),
        total_api_duration_ms: numberSchema().int(),
        total_duration_ms: numberSchema().int(),
        total_lines_added: numberSchema().int(),
        total_lines_removed: numberSchema().int(),
        model_usage: record(stringSchema(), ModelUsageSchema()),
      }).describe("Cost and usage accumulated by the current session."),
      rate_limits: objectSchema({
        limits: array(
          objectSchema({
            kind: stringSchema()
              .max(MAX_DISPLAY_NAME_CHARS)
              .describe(
                "The server's meter kind, e.g. 'session', 'weekly_all' or 'weekly_scoped'. Classify a row on this, never on a label.",
              ),
            group: stringSchema()
              .max(MAX_DISPLAY_NAME_CHARS)
              .describe(
                "The server's row group, e.g. 'session' or 'weekly'; rows render grouped under it, in the server's order.",
              ),
            percent: numberSchema().describe("Share of the window used, 0-100."),
            resets_at: stringSchema()
              .max(MAX_DISPLAY_NAME_CHARS)
              .nullable()
              .describe("ISO 8601 timestamp when the window resets."),
            scope: objectSchema({
              model: objectSchema({
                display_name: stringSchema().max(MAX_DISPLAY_NAME_CHARS),
              })
                .nullable()
                .optional(),
              surface: objectSchema({
                display_name: stringSchema().max(MAX_DISPLAY_NAME_CHARS),
              })
                .nullable()
                .optional(),
            })
              .nullable()
              .optional()
              .describe("What a scoped row is for, a model or a surface, with the server's display label."),
            severity: stringSchema()
              .max(MAX_DISPLAY_NAME_CHARS)
              .describe(
                "The server's reading of the row for a meter's colour, e.g. 'normal', 'warning' or 'critical'. Every row here is the server's, so a client never grades a row itself.",
              ),
            is_active: booleanSchema().describe(
              "The server's headline pick: the row a single-value indicator shows.",
            ),
          }),
        )
          .max(MAX_MODEL_ID_CHARS)
          .nullable()
          .describe(
            "The server's usage rows (the usage endpoint's limits[]), as sent: which meters apply, their scope, labels, severity and order are the server's, so a client renders them verbatim and a new meter needs no client release. Empty when the server reported no meters; null when the body carried no rows at all (a server that predates them). Null too while the usage fetch is failing: the rows here are only ever the server's current reply, so neither the row the CLI builds from rate-limit response headers for its own screen nor its snapshot of an earlier reply appears here.",
          ),
        extra_usage: objectSchema({
          is_enabled: booleanSchema(),
          monthly_limit: numberSchema().nullable(),
          used_credits: numberSchema().nullable(),
          utilization: numberSchema().nullable(),
          currency: stringSchema().max(MAX_DISPLAY_NAME_CHARS).nullable().optional(),
        })
          .nullable()
          .optional()
          .describe(
            "Extra-usage (overage) spend for the billing period, when the plan has it. Amounts are in minor units of `currency` (cents for USD); is_enabled is false while extra usage cannot cover sends.",
          ),
      })
        .nullable()
        .describe(
          "The plan's usage rows and extra-usage spend from the claude.ai usage endpoint; null when the CLI could not fetch them (no plan on this lane, or a token without the profile scope).",
        ),
    }).describe(
      "Structured twin of a /usage result, carried beside its text: the session's totals, the plan's usage rows as the server sent them and the extra-usage spend, and nothing else from the usage body (the get_usage control reply carries the rest). Experimental \u2014 the shape may change.",
    ),
  );
  CONTEXT_CATEGORY_KINDS = ["used", "free", "buffer", "deferred"];
  CONTEXT_CATEGORY_ORDER = [
    "system_prompt",
    "system_tools",
    "mcp_tools",
    "mcp_instructions",
    "mcp_tools_deferred",
    "system_tools_deferred",
    "custom_agents",
    "memory_files",
    "skills",
    "messages",
    "autocompact_buffer",
    "compact_buffer",
    "free_space",
  ];
  ContextUsageCategorySchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().describe(
        'Display name of the row as the CLI renders it, e.g. "Messages" or "MCP tools (deferred)". Use `kind` (not this name) to classify the row.',
      ),
      tokens: numberSchema().int(),
      kind: _enum(CONTEXT_CATEGORY_KINDS).describe(
        "What the row is: 'used' content occupies the window; 'free' is the remaining window; 'buffer' is the compaction reserve (autocompact or manual); 'deferred' rows are out-of-window tool schemas \u2014 listed for awareness, excluded from usage math.",
      ),
    }).describe(
      "One row of the /context usage-by-category breakdown. Rows may carry zero tokens; renderers typically hide those.",
    ),
  );
  ContextUsageSchema = DoctorLazy(() =>
    objectSchema({
      model: stringSchema().describe("Main-loop model the usage was computed for."),
      total_tokens: numberSchema()
        .int()
        .describe("Estimated tokens in use, unclamped \u2014 may exceed raw_max_tokens when over limit."),
      raw_max_tokens: numberSchema()
        .int()
        .describe(
          "The window usage is measured against: the resolved autocompact window \u2014 the model's believed limit, or a smaller compaction-policy window (a configured value, or e.g. the 200K boundary on 1M-window models).",
        ),
      percentage: numberSchema().int().describe("Rounded total_tokens / raw_max_tokens, 0-100+."),
      over_limit: objectSchema({
        tokens_over: numberSchema().int(),
        kind: _enum(["hard_limit", "compaction_window"]),
      })
        .optional()
        .describe(
          "Present when total_tokens exceeds raw_max_tokens. kind says how the window was resolved, not whether the API will accept the next request: 'hard_limit' means the window is the model's believed limit (the API will refuse past it); 'compaction_window' means a compaction-policy window, which may or may not coincide with the model's hard limit.",
        ),
      categories: array(ContextUsageCategorySchema()),
      mcp_tools: array(
        objectSchema({
          name: stringSchema().describe('Wire name, e.g. "mcp__linear__create_issue".'),
          server_name: stringSchema(),
          tokens: numberSchema().int(),
        }),
      ),
      memory_files: array(
        objectSchema({
          path: stringSchema(),
          type: stringSchema().describe('Display label of the memory-file source, e.g. "Project" or "User".'),
          tokens: numberSchema().int(),
        }),
      ),
      agents: array(
        objectSchema({
          agent_type: stringSchema(),
          source: stringSchema().describe(
            "Raw source identifier, e.g. 'projectSettings', 'userSettings', 'plugin'. Built-in agents are excluded by the producer. Display labels are the renderer's concern.",
          ),
          tokens: numberSchema().int(),
        }),
      ),
      skills: array(
        objectSchema({
          name: stringSchema(),
          source: stringSchema().describe(
            "Raw source identifier, e.g. 'userSettings', 'plugin', 'syncedSkills'.",
          ),
          plugin_name: stringSchema().optional(),
          tokens: numberSchema().int(),
        }),
      )
        .optional()
        .describe("Omitted when no skills contribute tokens."),
    }).describe(
      "Structured twin of the /context report \u2014 the data a client needs to render the context-usage card without parsing the markdown table. Evolves additively (new optional fields); a breaking reshape would ship as a sibling field, so consumers can trust the fields they know.",
    ),
  );
  SDKAssistantMessageSchema_2 = DoctorLazy(() =>
    objectSchema({
      type: literal("assistant"),
      message: SDKAssistantMessageSchema(),
      parent_tool_use_id: stringSchema().nullable(),
      error: ApiErrorCodeSchema().optional(),
      uuid: _(),
      historical: booleanSchema()
        .optional()
        .describe(
          "@internal Replayed history rather than a live message (stamped by the Remote Control bridge when it flushes history to the session server).",
        ),
      session_id: stringSchema(),
      request_id: stringSchema().optional(),
      refused_message_id: stringSchema()
        .optional()
        .describe(
          "@internal Only on the assistant message that reports a refusal: the API msg_* id of the refused response (message.id on this message is a local UUID). Absent when the CLI has no well-formed id for it.",
        ),
      user_message_uuid: stringSchema()
        .optional()
        .describe(
          "Client uuid of the user message this turn is answering (submitMessage options.uuid), stamped on an assistant message each time that send changes \u2014 the turn's FIRST top-level assistant message (which may carry only a thinking block, or be a synthetic API-error message), and then, for a turn started by a synthetic (meta) prompt, the first assistant message after each queued user message folded in mid-turn (the fold takes the echo over); with --include-partial-messages the turn's first non-ping stream event is stamped too, independently (see SDKPartialAssistantMessage), so the same uuid may appear on both \u2014 either binds the reply to the send it answers without waiting for the result; the server keeps the first stamp it sees per uuid. A turn started by a typed prompt keeps that uuid for its whole turn, so it stamps once per frame kind. A meta turn's own uuid is stamped only when the host vouches it is the client event's own (on a hosted session, the uuid the session server persisted: delivered content such as a Slack owner ping, a Slack-bot observation or a client-injected synthetic turn), never for a prompt the CLI minted itself \u2014 except that a turn carrying resume_reason, such as the boot-time rescue turn re-running a turn a worker restart interrupted mid-way, stamps the interrupted turn's own last user prompt, the send it answers, where that can be vouched for (a turn that goes on from a permission answer or from in-flight tool calls may first re-send, unstamped, the assistant message that made those calls); either way a user message folded into a meta turn takes the echo over from it (the rescue turn absorbing messages sent while the session was down; a bot-observation turn absorbing a human's post), and the first reply frame of each kind after that fold carries the folded message's uuid \u2014 the first reply that message got. Wrapper-level sibling \u2014 never inside `message.content` \u2014 so it is not replayed to the model. Absent on every other frame of the turn, on subagent frames (parent_tool_use_id set), on turns that neither had a client uuid nor folded a user message in, and from older producers.",
        ),
      user_message_uuids: array(stringSchema())
        .optional()
        .describe(
          "Client uuids of every user message whose prompt this turn has consumed so far, in consumption order \u2014 all members of a prompt batch the host merged into this one turn (several messages sent close together run as one turn whose user_message_uuid is the LAST member's), then any user message folded into the turn before this frame \u2014 so a consumer that sent any of them can bind this reply to its own send by finding its uuid anywhere in the list. Always contains user_message_uuid; at most 64 entries. Present exactly when user_message_uuid is, on the same frames; absent from older producers (fall back to user_message_uuid).",
        ),
      resume_reason: stringSchema()
        .optional()
        .describe(
          "Why this frame's turn continues one that a worker restart interrupted. Such a turn is the automatic re-run of the interrupted turn (CLAUDE_CODE_RESUME_INTERRUPTED_TURN), or one that goes on from the answer to the permission prompt the new worker took over, or from that turn's tool calls still in flight. The value is the host's CLAUDE_CODE_RESUME_REASON when it set one (host_draining, checkpoint_restore, container_recreated, \u2026), else 'interrupted_turn'. Stamped on the same reply frames as user_message_uuid (which on such a turn names the interrupted turn's own last user prompt), so a consumer can tell its first reply from the interrupted attempt's. Absent on every other turn (also one that goes on from the answer to any other permission prompt), on thinking_tokens frames, and from older producers.",
        ),
      resumed_from_incomplete_thinking: literal(true)
        .optional()
        .describe(
          "This turn continued the preceding truncated assistant turn inside its trailing signed thinking block (max-output-tokens recovery). Its thinking signatures are cumulative over that preceding thinking-only turn, so a history replayed through the bridge must carry this flag back for the normalizer to keep the run's prefix on the wire. Wrapper-level sibling \u2014 never inside `message.content` \u2014 so it is not replayed to the model.",
        ),
      supersedes: array(_())
        .optional()
        .describe(
          "Wire uuids of previously-delivered messages that this message replaces (refusal-fallback supersede). The list can include tombstoned tool_result frames from the refused leg, not only assistant frames. Evict the named messages on arrival and treat this frame as their canonical replacement. Idempotent with the end-of-turn model_refusal_fallback notice, whose retracted_message_uuids remains the complete audit record for the turn.",
        ),
      aborted: literal(true)
        .optional()
        .describe(
          "True when this assistant message was truncated by an interrupt/abort before the stream completed: stop_reason was never received and the content may end mid-word. Absent on normally completed messages.",
        ),
      agent_id: stringSchema()
        .optional()
        .describe(
          "ID of the subagent that produced this message: the `task_id` of its task events, unchanged when the subagent is resumed. Absent on main-thread messages.",
        ),
      subagent_type: stringSchema().optional().describe("Subagent type that produced this message."),
      task_description: stringSchema()
        .optional()
        .describe("Description of the subagent task that produced this message."),
      tool_use_meta: array(
        objectSchema({
          id: stringSchema(),
          display_name: stringSchema(),
          server_display_name: stringSchema().optional(),
          icon_url: stringSchema().optional(),
          server_id: stringSchema().optional(),
          server_id_stamp: stringSchema().optional(),
          tool_name: stringSchema().optional(),
        }),
      )
        .optional()
        .describe(
          "@internal Display metadata for this message's tool_use blocks, keyed by block id. display_name is the MCP server's `tool.annotations.title` when provided, otherwise a readable transform of the wire name; server_display_name is the MCP server's own display name; icon_url is the MCP server's directory icon URL (claude.ai connectors only); server_id is the mcpsrv_ connector id of a server provisioned by claude.ai, set by the CLI from claude.ai's own connector listing, so a client may show the call as that connector's. server_id_stamp is the X-MCP-Server-ID header value, lower-cased, of an http entry in the dynamic scope (passed in at launch or by a later mcp_set_servers push). Claude Code Remote writes the connector's uuid there when the session has one, otherwise an id it generates; the CLI checks only its shape (at most 128 characters of letters, digits, '.', '_', ':' and '-'; anything else yields no stamp), not whose it is, since a --mcp-config or SDK-host entry can write anything. A client may look it up in its own server list, treat a miss as a server it does not know (never as an error), and show a hit as the entry's claim to be that server, not as proof. They are separate fields: a server provisioned by claude.ai carries server_id, a dynamic-scope http entry server_id_stamp. Both absent for a plugin's, a repo's, a settings or an agent entry. Neither is a permission grant. tool_name is the tool's name as its server lists it, without the mcp__<server>__ prefix. Omitted for blocks whose display label equals the wire name (built-in tools). Wrapper-level sibling \u2014 never inside `message.content` \u2014 so it is not replayed to the model.",
        ),
      narration_block_indexes: array(numberSchema().int().nonnegative())
        .optional()
        .describe(
          "@internal Ascending zero-based indexes into this frame's `message.content` of the thinking blocks whose signature the server tagged block_kind 'narration' (server summaries of the prose between tool calls, not the model's own reasoning), so a renderer can label them as summaries without decoding the signature envelope. Fail-closed: an unparseable or legacy signature is not listed. A listed block can have empty thinking text when the request returned no thinking text; give those ordinary thinking treatment. Omitted when the frame has no such block, and by CLI versions before this field existed; treat unlisted thinking blocks as ordinary thinking. Wrapper-level sibling \u2014 never inside `message.content` \u2014 so it is not replayed to the model.",
        ),
      narration_hint: _enum(["hidden", "faint"])
        .optional()
        .describe(
          "@internal Display-only, for this frame's narration_block_indexes blocks: how to draw their trailing ' \xB7 summarized' hint, by the same rule Claude Code's terminal UI uses for the model that produced the frame. 'hidden': draw no hint. 'faint': draw ' \xB7 summary'. Omitted: draw ' \xB7 summarized'. Sent only to the VS Code extension and only on frames that have such a block; older CLI versions never send it. Wrapper-level sibling \u2014 never inside `message.content` \u2014 so it is not replayed to the model.",
        ),
      thinking_duration_ms: numberSchema()
        .int()
        .positive()
        .optional()
        .catch(undefined)
        .describe(
          "@internal How long the thinking block in this frame took to stream, in whole milliseconds (at least 1): from its content_block_start to its content_block_stop, so the wait for the response's first token is not counted. For display only. Sent only on a frame whose one content block is a thinking block that was streamed. Older CLI versions never send it, and a CLI that rebuilt its history from SDK frames does not send it when it replays that history, so be ready to show the block without a duration. Wrapper-level sibling \u2014 never inside `message.content` \u2014 so it is not replayed to the model.",
        ),
      thinking_display: stringSchema()
        .optional()
        .catch(undefined)
        .describe(
          "@internal The thinking.display that Claude Code put in the API request body for the response that streamed this frame's thinking block. It has the same source and meaning as `thinking_display` on a stream event. Sent only on a frame whose one content block is a thinking block that was streamed, and only when the body had a display. Older CLI versions never send it, and a CLI that rebuilt its history from SDK frames does not send it when it replays that history. An absent key states nothing. Wrapper-level sibling \u2014 never inside `message.content` \u2014 so it is not replayed to the model.",
        ),
      timestamp: stringSchema()
        .optional()
        .describe(
          "ISO timestamp of when this content block finished on the originating process. One API assistant turn may produce several assistant messages sharing a message.id, each with its own timestamp. Uses the originating host's clock, so it's for display only; do not order messages by this field. Older emitters omit it; consumers should fall back to receive time.",
        ),
      is_meta: literal(true)
        .optional()
        .describe("@internal True when the message was synthesized by the loop (not a model response)."),
      context_usage: ContextUsageSchema()
        .optional()
        .describe(
          "Structured twin of the /context report, carried on the synthetic assistant message that delivers the markdown table. Present only on /context results from CLIs new enough to attach it; the markdown in message.content remains the canonical fallback. Wrapper-level sibling \u2014 never inside `message.content` \u2014 so it is not replayed to the model.",
        ),
      usage_report: UsageReportSchema()
        .optional()
        .describe(
          "Structured twin of the /usage report, carried on the synthetic assistant message that delivers its text: the session totals, the plan's usage rows and extra-usage spend, for remote clients that render a card from data. Present only on /usage results from CLIs new enough to attach it and from claude.ai-subscriber sessions; the text in message.content remains the canonical fallback. Wrapper-level sibling \u2014 never inside `message.content` \u2014 so it is not replayed to the model.",
        ),
      local_command_source: stringSchema()
        .optional()
        .describe(
          "@internal The originating system local_command row's wire-form content (escaped frames), carried on the loop-synthesized local-command twin. Round-tripped so toInternalMessages rebuilds the internal system row on a bridge/SDK history replay \u2014 replay then matches the live session, where that row is model-visible \u2014 instead of dropping the output or replaying the twin's decoded display text. Wrapper-level sibling \u2014 never inside `message.content`.",
        ),
      local_command_run: objectSchema({
        command: stringSchema(),
        args: stringSchema(),
        plugin: stringSchema().optional(),
      })
        .optional()
        .describe(
          "@internal On the local-command twin, the run that printed the row: the command's name as `command.run` carried it (no slash), its arguments as the echo shows them (`***` when the command marks them sensitive) and, for a command a plugin registered, that plugin's name, or, for a row whose text plugins' `command.run` hooks answered or retold, the names the text is led by (untrusted text; absent for the binary's own command in its own words). Present when a `local` command's dispatch printed the row or a `command.run` hook answered it, absent on a never-ran notice. A surface that draws the hooks engine's `CommandOutput` site asks ui_render with these, the twin's text and its uuid as instance_id; toInternalMessages round-trips it onto the rebuilt row. Wrapper-level sibling \u2014 never inside `message.content`.",
        ),
      local_command_outcome: objectSchema({
        kind: _enum(UNAVAILABLE_KINDS),
        suggestion: stringSchema()
          .optional()
          .describe("unknown: the registered command closest to the typed name, no slash."),
      })
        .optional()
        .catch(undefined)
        .describe(
          "@internal On the local-command twin, what the row reports, so a host can offer a fix instead of relaying the text: 'unavailable_headless' (an interactive-panel command this session cannot open), 'unknown' (no command has the typed name), 'failed' (the command ran and failed), 'restart_required' (the change applies after Claude Code restarts). Absent when the row reports none of these; new kinds are additive, so treat an unknown one as absent. toInternalMessages round-trips it onto the rebuilt row. Wrapper-level sibling \u2014 never inside `message.content`.",
        ),
      is_virtual: literal(true)
        .optional()
        .describe("@internal Display-only: rendered in the UI but filtered before API send."),
      batch_tool_uses: array(
        zodStrictObject({
          id: stringSchema(),
          name: stringSchema(),
        }),
      )
        .optional()
        .describe(
          "@internal `{id, name}` of the original Batch* tool_use block(s) for a message whose content was decomposed into synthetic v1 tool_use blocks. Round-tripped so a replayed history reassembles the batch block on the wire (not N synthetics). Input is reassembled from the synthetics in `message.content` \u2014 never carried here. Wrapper-level sibling \u2014 never inside `message.content` \u2014 so it is not replayed to the model.",
        ),
      wire_tool_inputs: record(stringSchema(), unknown())
        .optional()
        .describe(
          "@internal `tool_use.input` exactly as the API produced it, keyed by tool_use id, for a message whose `message.content` carries the client-normalized input. Round-tripped so a replayed history echoes each earlier tool call back to the API as the API emitted it (the server may hold its own copy of the turn). Wrapper-level sibling \u2014 never inside `message.content`.",
        ),
      wire_ingest_context: record(stringSchema(), unknown())
        .optional()
        .describe(
          "@internal What the client-side input normalization read from process state (the working directory a leading `cd` was stripped against, the stamp applied to a Slack send) for the inputs in `wire_tool_inputs`, keyed by the same tool_use ids. Round-tripped with `wire_tool_inputs` so a replayed history can verify each recorded input against the normalized one exactly. Wrapper-level sibling \u2014 never inside `message.content`.",
        ),
      is_api_error_message: booleanSchema()
        .optional()
        .describe(
          "@internal True when this assistant message wraps an API error (from internal AssistantMessage.isApiErrorMessage).",
        ),
      api_error_status: numberSchema()
        .int()
        .optional()
        .describe("@internal HTTP status code of the API error when is_api_error_message is true."),
      api_error: _enum([
        "max_output_tokens",
        "dlp_request_denied",
        "claude_code_version_too_old",
        "safety_monitor_blocked",
        "effort_requires_thinking",
        "advisor_incompatible",
        "tool_history_mismatch",
        "autocompact_thrashing",
        "pdf_too_large",
        "pdf_password_protected",
        "stored_login_refused",
        "media_removed",
        "no_response",
        "tls_untrusted_ca",
        "gateway_content_type",
        "connection_failed",
        "stream_idle_timeout",
        "computer_slept",
        "provider_credentials",
        "gateway_signin_required",
        "gateway_session_expired",
        "api_key_auth_disabled",
        "org_disabled_credential",
        "invalid_credential_header",
        "model_requires_usage_credits",
        "long_context_credits_required",
        "consent_unanswered",
        "no_allowed_fallback",
        "model_substitution_disabled",
        "field_not_granted",
        "usage_limit_reached",
        "empty_completion",
        "unattended_start_limit",
        "unattended_start_unconfirmed",
      ])
        .optional()
        .catch(undefined)
        .describe(
          "@internal Typed kind of the API error when is_api_error_message is true, for consumers that key on the cause instead of the message text (the text stays the fallback and may change). Absent when the error has no typed kind; new values are added over time, so treat an unknown value as absent. dlp_request_denied: the request was refused by the organization's data-loss-prevention policy \u2014 terminal for that request body; a consumer replaying history must not re-send it. claude_code_version_too_old: the API refused the request because this Claude Code build is below a required minimum version \u2014 the selected model's minimum, or an organization-policy floor; only the message text says which and names the versions, and the remedy is updating Claude Code. safety_monitor_blocked: a server-side safety monitor blocked the model's response for this turn; terminal for the turn, so a consumer replaying history must not re-send the prompt that led to it. effort_requires_thinking: the model refuses the requested effort level while thinking is off; api_error_params.effort names the level. advisor_incompatible: the configured advisor model cannot be paired with this request's model. tool_history_mismatch: the API rejected the conversation's tool_use/tool_result pairing (a tool_use without its result, an orphaned tool_result, a duplicate tool_use id); re-sending the same history fails the same way, and rewinding the conversation is the remedy. autocompact_thrashing: the context refilled to the limit right after each automatic compaction, repeatedly, so the turn stopped; something in context is too large for the window. pdf_too_large: a PDF is over the API's page or size limit. pdf_password_protected: a PDF is encrypted. stored_login_refused: the stored claude.ai login was about to go out while the API key helper set by the machine's administrator or the organization's settings isn't in effect, or its settings couldn't be confirmed; no request was sent, and the message text says who can clear it. media_removed: the API refused an image or a document in the conversation, so Claude Code leaves it out of the requests that follow. The frame comes either before the answer of a retry that already left it out, or as the error that ended the turn (the result then repeats this value). api_error_params.media_reason says why, and api_error_params.media which kind of block. Other kinds (pdf_too_large, pdf_password_protected) and some untyped errors also leave the block out, so the absence of this value does not mean that nothing was left out. no_response: no response arrived before the first-byte deadline on any attempt, usually a proxy or gateway that holds responses until they complete. tls_untrusted_ca: the API's TLS certificate comes from an authority this process does not trust, usually a TLS-inspecting proxy or a gateway signed by a private CA. gateway_content_type: a proxy between Claude Code and Amazon Bedrock rewrote Bedrock's event-stream response. connection_failed: Claude Code could not reach the API host (DNS, a refused connection, no route, a proxy that refused the tunnel) or lost the connection (an open connection was cut, or the response body ended early). An error with a TLS error code never carries it: the untrusted-authority codes are tls_untrusted_ca, and the other certificate and handshake codes (for example an expired, revoked or wrong-host certificate) have no typed kind. A connection that is cut during the TLS handshake arrives with a socket code such as ECONNRESET and carries it. The client's own request timeout and a connection error whose cause Claude Code cannot tell have no typed kind either. stream_idle_timeout: Claude Code's own idle timer gave up waiting for more of the response on an open stream. It says that the timer fired, not that the server stalled: a long gap in a slow answer, a proxy that holds the response back, or a sleep that the timer cannot tell from a stall (a short one, for example) fires it too. computer_slept: a Claude Code timer found that the machine slept through its wait for the response. A claude-code-server session never sends it, because its process is not the person's computer; there the same failure has no typed kind. provider_credentials: a third-party cloud provider (api_error_params.provider) refused the request's credentials or access; api_error_params.remedy says what fixes it. gateway_signin_required: the Cloud gateway provider is configured and nobody is signed in to it; no request was sent. gateway_session_expired: the Cloud gateway session expired; no request was sent; api_error_params.remedy is gateway_token when the token came from the environment, which signing in does not replace. api_key_auth_disabled: the organization turned off API key authentication and the active credential is an API key. org_disabled_credential: the ANTHROPIC_API_KEY environment variable belongs to a disabled organization and overrides the account sign-in. invalid_credential_header: a credential or header value (from the environment, a helper, or the saved sign-in) cannot be sent as an HTTP header; caught before the request was sent. model_requires_usage_credits: the model runs on usage credits for this account, and credits are off or the included allowance is used up. long_context_credits_required: a request over the 200K-token context boundary needs usage credits. consent_unanswered: the model now uses usage credits and the prompt to confirm went unanswered; nothing was sent. no_allowed_fallback: switching off the model was needed (the usage-credits prompt was declined) and the model policy allows no other model. model_substitution_disabled: switching off the model was needed and CLAUDE_CODE_NO_MODEL_FALLBACK forbids it. field_not_granted: the organization is not allowed to send a field in the request, and the message text says what to do. usage_limit_reached: the request was refused by the account's own usage limit, a plan limit (session, weekly or per-model) or a spend cap on usage credits; api_error_params.rate_limit_info says which and when it resets. The other refusals that share error rate_limit never carry it: an organization policy that turned the service off (no limit was reached, and no reset clears it), a temporary server throttle, a capacity switch-off, an entitlement refusal shown in the server's own words, or a 429 on an API key or a third-party cloud provider. empty_completion: the model ended its turn with no visible text, and its one retry had no content block, on a person's own prompt with no reply and no tool result after it; the turn ends as an error so that a host shows a failure and not a blank reply. unattended_start_limit: a cloud session's process that starts where an earlier one died carries on what that one left unfinished; by the session's record, as many processes as are allowed (a number that is configured; with none there is no limit) had already done so within 24 hours with no message from a person in between, and this one did not; no request was sent; terminal for the turn, so a consumer replaying history must not re-send the prompt that led to it; anything new sent to the session runs as usual; a person's message allows it again, and so does time, as earlier starts pass out of the 24 hours. unattended_start_unconfirmed: a cloud session's process did not carry on what an earlier one left unfinished, because it could not check whether it was allowed to: the session's record of such starts could not be read or written, or the check failed; no request was sent; not terminal: a later process may carry the turn on.",
        ),
      api_error_params: objectSchema({
        effort: stringSchema().optional(),
        provider: _enum([
          "bedrock",
          "anthropicAws",
          "mantle",
          "anthropicGoogleCloud",
          "vertex",
          "foundry",
          "gateway",
        ]).optional(),
        remedy: _enum([
          "refresh_command",
          "refresh_credentials",
          "adc",
          "gateway_token",
          "host_managed",
          "model_access",
        ]).optional(),
        media: _enum(["image", "document"]).optional().catch(undefined),
        media_reason: _enum(["unprocessable", "unsupported_by_model", "media_budget"])
          .optional()
          .catch(undefined),
        rate_limit_info: RateLimitInfoSchema().optional().catch(undefined),
      })
        .optional()
        .describe(
          "@internal Parameters of api_error, present only for the kinds that have any. effort: the effort level the API refused (effort_requires_thinking). media (media_removed): the kind of block the API refused; absent for media_budget. media_reason (media_removed): unsupported_by_model \u2014 the API said that the model does not accept PDF documents; media_budget \u2014 the request's images and documents together exceed the API's limit, and the requests that follow may leave out blocks of either kind; unprocessable \u2014 every other refusal, a gateway's report of a model's refusal among them. provider: the API provider whose credentials failed (provider_credentials, gateway_session_expired). remedy (provider_credentials, gateway_session_expired): refresh_command \u2014 a configured refresh command (awsAuthRefresh / gcpAuthRefresh) refreshes the credentials; refresh_credentials \u2014 refresh the provider's credentials by hand, no command is configured; adc \u2014 refresh the Google application default credentials or the GOOGLE_APPLICATION_CREDENTIALS key file; gateway_token \u2014 replace the gateway token supplied through ANTHROPIC_AUTH_TOKEN or ANTHROPIC_CUSTOM_HEADERS; host_managed \u2014 the host application owns these credentials; model_access \u2014 the credentials work but the model is not enabled for this account and region (Amazon Bedrock). rate_limit_info (usage_limit_reached): what the refused request's own response said about the limit, in the shape rate_limit_event carries. It is read from the same values as the message text, so its status, limit and reset are the text's: status is rejected and isUsingOverage false, rateLimitType names the limit, resetsAt is when it resets, and overageStatus, overageResetsAt, overageDisabledReason and limitScope say whose spend cap it is (the person's own cap arrives as org_level_disabled_until, as on rate_limit_event); no other member is sent. It is that refusal's record and is never updated, so compare resetsAt with the clock before calling the limit current. rate_limit_info (model_requires_usage_credits): that refusal's record, read from the same headers as the message text: status is rejected and isUsingOverage false; rateLimitType is the response's claim (seven_day_overage_included when an included allowance was used up) and is absent when it named none; resetsAt, overageStatus, overageResetsAt and limitScope come when the response had them; errorCode is credits_required when the body said so; overageDisabledReason is the disabled-reason header's when that header came with a claim or overage status, else the body's (the message text can also fall back to a reason cached from an earlier response, which the record does not carry); canUserPurchaseCredits and hasChargeableSavedPaymentMethod come from the body; the person's own cap arrives as org_level_disabled_until, as on rate_limit_event; no other member is sent.",
        ),
      api_error_code: stringSchema()
        .optional()
        .describe(
          "@internal The server's error.details.error_code for this API error, copied through when it is an identifier (^[a-z][a-z0-9_]{0,63}$) and dropped otherwise. Carries server gate codes this build has no api_error value for, so a host can key on a new gate without a Claude Code release. Absent when the response carried no code.",
        ),
      api_error_origin: _enum(["first_party"])
        .optional()
        .catch(undefined)
        .describe(
          "@internal first_party when this API error was built from a response Anthropic's own API sent: the request used the firstParty provider, went to https://api.anthropic.com on the default port and was answered from there, not redirected, over TLS verified with no added CA (NODE_EXTRA_CA_CERTS), no verification override and no unix-socket tunnel. Absent in every other case: an ANTHROPIC_BASE_URL or WIF base_url override, a gateway, a third-party provider, a connection error, an error Claude Code raised itself, and any frame replayed from the transcript, SDK input or a remote session. Treat absence as unknown origin. It says which endpoint answered, not that the message text is the server's verbatim, and a CA installed in the system trust store can still intercept. An invalid-request message (400 or 422) can quote request values, so it is stamped only when it is one of the known Anthropic wordings, and no message is stamped that quotes the request's model id; render stamped text as plain text. New values may be added; treat an unknown value as absent.",
        ),
      error_details: stringSchema()
        .optional()
        .describe(
          "@internal Raw API error message \u2014 preserves details (e.g. prompt-too-long token counts) that user-facing content discards.",
        ),
      advisor_model: stringSchema()
        .optional()
        .describe("@internal Advisor model that produced this message, when applicable."),
      attribution_agent: stringSchema()
        .optional()
        .describe(
          "@internal Attribution stamp: agent name parsed from querySource (see messageAttribution.ts). May overlap with subagent_type.",
        ),
      attribution_skill: stringSchema().optional().describe("@internal Skill that produced this message."),
      attribution_plugin: stringSchema().optional().describe("@internal Plugin that produced this message."),
      attribution_mcp_server: stringSchema()
        .optional()
        .describe("@internal MCP server that produced this message."),
      attribution_mcp_tool: stringSchema()
        .optional()
        .describe("@internal MCP tool that produced this message."),
    }).describe(
      "An assistant message. While a response streams the CLI emits one assistant message per completed content block, so several consecutive assistant messages can share message.id and each carries just that block in message.content; on those, message.stop_reason is null and message.usage is not final \u2014 the turn's stop reason and total usage arrive on the result message. parent_tool_use_id is non-null when the message was produced inside a subagent started by that tool_use.",
    ),
  );
});
//@ chunk-bwbq4xvm.js:309065-323128 placement
/**
 * SDK rate_limit_event 消息与结果统计（终止原因、子代理统计）等 schema。
 */
var SDKRateLimitEventMessageSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PermissionDenialSchema;
var DeferredToolUseSchema;
var TerminalReasonSchema;
var SubagentStatsSchema;
var MODEL_USAGE_DESCRIPTION;
var MODEL_USAGE_SINCE_LAST_DESCRIPTION;
var SUBAGENT_STATS_DESCRIPTION;
var SAFETY_STOPS_DESCRIPTION;
var QUEUED_TURN_COUNT_DESCRIPTION;
var TOTAL_COST_DESCRIPTION;
var RESULT_INDEX_DESCRIPTION;
var INTERRUPTED_BY_SHUTDOWN_DESCRIPTION;
var RunnerExitSchema;
var StartupFailureReasonSchema;
deferInit("chunk-bwbq4xvm.js:309065", () => {
  SDKRateLimitEventMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("rate_limit_event"),
      rate_limit_info: RateLimitInfoSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe("Rate limit event emitted when rate limit info changes."),
  );
  PermissionDenialSchema = DoctorLazy(() =>
    objectSchema({
      tool_name: stringSchema(),
      tool_use_id: stringSchema(),
      tool_input: record(stringSchema(), unknown()),
    }),
  );
  DeferredToolUseSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema(),
      name: stringSchema(),
      input: record(stringSchema(), unknown()),
    }),
  );
  TerminalReasonSchema = DoctorLazy(() =>
    _enum(TERMINAL_REASONS).describe(
      "Why the query loop terminated. Unset when the loop was bypassed (local slash command).",
    ),
  );
  SubagentStatsSchema = DoctorLazy(() =>
    objectSchema({
      spawned: numberSchema()
        .int()
        .describe(
          "Subagents actually started (one tengu_agent_tool_selected each); a refused or failed launch is not counted.",
        ),
      requested: objectSchema({
        background: numberSchema().int(),
        foreground: numberSchema().int(),
        unset: numberSchema().int(),
      }).describe(
        "Spawns by the run_in_background value the model passed; all count as unset while the parameter is not offered (background tasks disabled, or subagents forced into the background: in a terminal, the desktop app or the VS Code extension, or with CLAUDE_CODE_FORK_SUBAGENT=1).",
      ),
      started_in_background: numberSchema()
        .int()
        .describe(
          "Spawns that started in the background after defaults and session settings (tengu_agent_tool_selected.is_async); the rest blocked the spawning tool call.",
        ),
      by_type: record(stringSchema(), numberSchema().int()).describe("Spawns by agent type."),
      max_depth: numberSchema()
        .int()
        .describe("Deepest spawn: 1 = started by the main thread, 2 = by a depth-1 subagent."),
      spawned_by_subagents: numberSchema()
        .int()
        .describe("Spawns made from inside another subagent (depth > 1)."),
      completed: numberSchema().int(),
      failed: numberSchema().int(),
      killed: objectSchema({
        parent: numberSchema().int(),
        user: numberSchema().int(),
        system: numberSchema().int(),
      }).describe(
        "Stopped before finishing: parent = by another agent through TaskStop; system = by Claude Code itself (the --max-budget-usd halt, the sweep of background subagents when an SDK or IDE client interrupts, or -p giving up on a background subagent still running at its wait ceiling); user = any other stop, including a foreground subagent cancelled just as it finished (counted here, not as completed).",
      ),
      refused: objectSchema({
        depth_limit: numberSchema().int(),
        concurrency_limit: numberSchema().int(),
        budget: numberSchema().int(),
      }).describe(
        "Agent tool calls turned down because one of these limits was reached (other denials, such as an unknown agent type, are not counted). depth_limit stays near zero in practice: a subagent at the nesting limit is normally not offered the tool at all.",
      ),
    }).describe(
      "@internal Subagents started through the Agent tool in this session, as running totals (forked skills, workflows, teammates and other internal agents are not counted; two sessions in one process keep separate counts). Cumulative like modelUsage: read the latest result rather than summing across results; a resumed session starts fresh and a mid-session /clear zeroes it, though a background subagent that outlives the /clear still records its outcome, so completed, failed and killed can then exceed spawned. A result that was held back while background subagents finished carries the counts as of when it is written to the stream, as do its total_cost_usd, duration_api_ms and modelUsage (and usage where that is a running total; a per-turn main-loop usage keeps its turn-end value). Omitted by hosts without a local Agent tool and on crash/startup-error results; all zeros until the Agent tool starts or refuses a subagent. A remote (isolation: remote) launch counts as spawned but never reports an outcome. Per-subagent detail is on the task_started / task_notification events.",
    ),
  );
  MODEL_USAGE_DESCRIPTION =
    "Per-model totals for every model call made through the query pipeline during this query() call \u2014 main loop, Task subagents, sidechains, and internal calls such as compaction and Workflow agents. Cumulative across turns in streaming-input sessions: each result carries the running total so far, so read the latest result rather than summing across results. Internal helper calls outside the query pipeline (e.g. the permission classifier, token-count probes) are excluded; crash/startup-error results may carry zeroed usage, a resumed or forked session continues from the totals its transcript saved, when it has them (so the first result already carries the earlier turns), and a mid-session /clear resets the running total. The correct field for token/cost accounting; treat it as an estimate, not a billing statement.";
  MODEL_USAGE_SINCE_LAST_DESCRIPTION =
    "@internal Per-model usage and cost of the calls this process counted since it wrote its previous result (since it started, for its first), keyed and shaped like modelUsage and covering the same calls. Sum it over a conversation's results instead of subtracting modelUsage totals: within a conversation each call is stated on at most one result, whatever a resume or a kill does to modelUsage. Calls that finish after a result (a background subagent, a late title call) are stated on the next result, and a /clear's own result states what was counted before it. Nothing is carried from one process to the next, so what a process counted after its last result is stated nowhere. That includes the finished calls of a turn in flight when the process is shut down or killed, even where another process carries the turn on and writes its result. A result whose write fails loses its usage too (result_index shows the gap). A Workflow agent that runs as a cloud session of its own is counted here, as in modelUsage, and that session's own results state it too. costBasis, canonicalModel and provider are the latest request's. A model with nothing counted is left out; {} means nothing was counted. Set by a stream-json or --sdk-url run on the results it numbers as it writes them; a result relayed from another process keeps what that process set. Not set on error results numbered by hand (a start-up failure, an error that escapes the run), by --output-format json and text runs, or by older versions. Absent is not {}.";
  SUBAGENT_STATS_DESCRIPTION =
    "@internal Running totals of the subagents the Agent tool started this session; see SDKSubagentStats.";
  SAFETY_STOPS_DESCRIPTION =
    "@internal How many times a safety system has stopped one of this session's model calls made through the query pipeline (main loop, subagents, forked skills, compaction and other internal calls), as a running total since the session started in this process; two sessions in one process keep separate counts. Counted: a response that ends on stop_reason refusal, whether Claude Code then shows it, retries it or re-sends it to another model; a refusal that the API itself answered on a fallback model; output that the API's content filter stopped for good (the stop ends the call); and, where the build can recognise it (public builds cannot), a server-side safety monitor's block (api_error safety_monitor_blocked). It counts these events, not calls: one call can add a refusal answered on a fallback model and then that model's own refusal. 0 means that none of these was seen; a kind of stop that this version does not know is not counted. Never sum across results. It is never saved, so a resumed session starts at 0 again, and a mid-session /clear zeroes it: over a stored log that spans a restart, a resume or a /clear, any result above 0 means a stop happened, and a later 0 does not cancel it. Present, 0 included, on every result that carries a turn's measured totals. Absent on the zeroed results that stand in for a crashed, cut or never-started turn, on Remote Control's results and from older producers, where it says nothing: absent is not 0. A call still running when a result is written (a background subagent's) shows on the next result; a result held back while background subagents finished carries the count as of when it is written to the stream, never less than it was built with. Not counted inside the pipeline: a stop of the API's content filter that Claude Code answers by streaming the request again (so 0 does not rule one out), an organization's data-loss-prevention denial (api_error dlp_request_denied), a block by a cloud provider's own guardrail, an advisor's refusal inside a reply that ends normally. Not counted at all: model calls outside the query pipeline (e.g. the permission classifier, token-count probes) and work in other processes.";
  QUEUED_TURN_COUNT_DESCRIPTION =
    "User-initiated sends still waiting in the command queue when this result was produced. Greater than 0 means at least one more user turn (and result) follows without further input, barring cancellation; 0 means none is pending, or the session is ending (end_session or a shutdown latched mid-turn discards the backlog). Queued sends may coalesce into fewer turns, so this counts pending sends, not remaining results. System-generated queue entries are not counted. Absent on fatal startup results and on surfaces without a command queue.";
  TOTAL_COST_DESCRIPTION =
    "Cumulative estimated cost in USD for this query() call, covering the same query-pipeline calls as modelUsage and sharing its lifecycle: cumulative across turns in streaming-input sessions \u2014 each result carries the running total so far, so read the latest result rather than summing across results. Crash/startup-error results may carry zeroed values, a resumed or forked session continues from the total its transcript saved, when it has one (so the first result already carries the earlier turns; maxBudgetUsd counts only the spend since this query() call started or last /clear), and a mid-session /clear resets the running total. An estimate, not a billing statement.";
  RESULT_INDEX_DESCRIPTION =
    "Delivery sequence of this result within the run: how many results the run numbered before this one, starting at 0, in the order the process writes them. A result held back while background work finishes is numbered when it is finally written, not when its text was produced; a result whose write fails still consumes its number, so a gap in a stream-json sequence means a result was lost. Distinct from num_turns, which counts model round-trips within one turn. Numbered by the process that hosts the run (`claude -p`, stream-json): a local client relaying a cloud session passes the cloud session's numbering through and its own locally built error results carry none; the in-process engine surface does not number yet. Absent from older producers.";
  INTERRUPTED_BY_SHUTDOWN_DESCRIPTION =
    "@internal The host of a multi-tenant worker shut the worker down while this turn ran. The shutdown was the first thing to abort the turn, and the turn is left for the session's next worker. The other frames of the ending, and terminal_reason, are the same as for a Stop from a client. Read this member to tell the two apart. A success result can have it, when the shutdown falls in a Stop hook. A result without it can also be the result of a shutdown. A shutdown that makes the turn write no interrupt marker does not set it, and older producers never set it.";
  RunnerExitSchema = DoctorLazy(() =>
    objectSchema({
      phase: _enum(["setup", "run"]).describe(
        "@internal 'setup' when the session process never started, 'run' when it exited.",
      ),
      exit_code: numberSchema().int().nullable().optional(),
      signal: stringSchema().nullable().optional(),
    }).describe(
      "@internal How a self-hosted runner's session process ended, on the result the runner synthesizes for it.",
    ),
  );
  StartupFailureReasonSchema = DoctorLazy(() =>
    _enum([
      "org_pin_api_key_conflict",
      "provider_not_allowed",
      "org_verify_failed",
      "org_pin_mismatch",
      "managed_settings_invalid",
      "remote_settings_required_unavailable",
      "gateway_signin_required",
      "gateway_access_denied",
      "proxy_invalid",
      "temp_dir_unusable",
      "cwd_unavailable",
      "shell_tool_missing",
      "session_held_by_background",
      "worktree_resume_refused",
      "worktree_unverified",
      "cli_version_too_old",
      "bypass_root",
      "org_config_required_unavailable",
      "org_config_refused",
      "sandbox_required_unavailable",
    ]).describe(
      "Why Claude Code refused to start, so a host can offer the fix instead of a retry. org_pin_api_key_conflict: managed settings pin a first-party or Cloud gateway sign-in, and an Anthropic API key or auth token is configured instead. provider_not_allowed: managed settings list the API providers this machine may use (allowedProviders), and the session is set up for one that is not listed. org_verify_failed: the sign-in's organization could not be verified against the pin (network, or a revoked token). org_pin_mismatch: the sign-in belongs to an organization the pin does not allow. managed_settings_invalid: managed policy settings could not be read, the pin names no organization, or managed model settings (deniedModels, or an availableModels list matched exactly) block the default model and leave no allowed model to use instead. remote_settings_required_unavailable: managed settings the organization requires could not be loaded. gateway_signin_required: the Cloud gateway ended this sign-in. gateway_access_denied: the Cloud gateway refused managed settings for this account. proxy_invalid: a proxy setting is not a complete URL. temp_dir_unusable: the per-user temp directory is unsafe or could not be created. cwd_unavailable: the working directory was deleted, moved or cannot be read. shell_tool_missing: Windows has no shell tool: Git Bash is missing, and PowerShell is missing or turned off by CLAUDE_CODE_USE_POWERSHELL_TOOL. session_held_by_background: the conversation to resume or continue is running as a background session. worktree_resume_refused: the resume was refused because the session's worktree failed its safety checks or the resume was launched from inside it; errors says whether a re-run continues without the worktree. worktree_unverified: the session's worktree could not be verified right now; retrying may succeed. cli_version_too_old: this Claude Code version is below the minimum Anthropic requires. bypass_root: bypass permissions mode was requested while running as root. org_config_required_unavailable: the organization requires its policy limits and managed settings before a session starts, and they could not be loaded (network, proxy, or an Anthropic error); retrying may succeed. org_config_refused: the organization requires its policy limits and managed settings, and Anthropic refused them for this sign-in (expired or revoked session, or the organization does not allow Claude Code for this account); signing in again or an admin's change is the fix, not a retry. sandbox_required_unavailable: a working sandbox is required and it cannot run in this session, for example because bubblewrap is missing or the platform is not supported; make the sandbox available or have the requirement changed.",
    ),
  );
});
//@ chunk-bwbq4xvm.js:323128-323297 placement
function gcStatsSchema() {
  let stats = objectSchema({
    eden: numberSchema().int(),
    full: numberSchema().int(),
    wall_ms: numberSchema().int(),
    heap_after_mib: numberSchema().int().optional(),
  });
  return objectSchema({
    to_first_message: stats.optional(),
    to_first_result: stats,
  });
}
//@ chunk-bwbq4xvm.js:323297-371479 placement
/**
 * SDK result 消息 schema（success/error 变体，含 ttft、time_to_request 分阶段、usage、cost 等内部遥测字段）。
 */
var SDKResultSuccessMessageSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SDKResultMessageSchema;
var ResultMessageSchema;
var SettingsValidationErrorSchema;
var PLUGIN_VERSION_DESCRIPTION;
deferInit("chunk-bwbq4xvm.js:323297", () => {
  SDKResultSuccessMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("result"),
      subtype: literal("success"),
      duration_ms: numberSchema().int(),
      duration_api_ms: numberSchema().int(),
      ttft_ms: numberSchema().int().optional(),
      ttft_stream_ms: numberSchema().int().optional(),
      time_to_request_ms: numberSchema().int().optional(),
      time_to_request_phases_ms: record(stringSchema(), numberSchema().int())
        .optional()
        .describe(
          "@internal How time_to_request_ms was spent, in integer ms per phase, summing to it exactly: system_prompt, resume_other (settling, before the turn's own prompt, tool calls that an earlier run left open or the session's client handed over, see turn_start_resume_kind; excluding four parts of it that have keys of their own: resume_store_confirm, writing a handed-over turn's lines to the transcript and waiting for the store to confirm them; resume_staged_files_wait, that turn's wait for files its client is still staging; resume_connector_wait, an orphaned permission's wait for its tool's MCP server to connect; turn_start_tool_run, the calls' permission checks, a person's time at a prompt included, and their runs, which are work the user asked for, not preparation; older producers report these five as one key, turn_start_resume), process_user_input (excluding four parts of it that have keys of their own: input_images, input_attachments, input_command, input_hooks), conversation_append (from the end of process_user_input to the start of tool_pool_refresh, less transcript_persist: running the host's callback that comes before the turn's input, which can add messages of its own; labelling the turn's messages and adding them to the conversation, first waiting for any messages the host is still adding, and through any hooks that see messages as they are added; carrying over a typed /compact's task list; on a claude-code-server tenant, sending an early request for the IP address of the person who sent the message, waiting until it has left but not for the answer; starting the transcript write; and building the copies of the turn's messages that are echoed back to the client), transcript_persist, tool_pool_refresh, system_prompt_rebuild (a second assembly of the system prompt, run when the tool pool re-read after the message was handled differs from the turn-start pool; older producers report it inside system_prompt), init_message, init_frame_send (from the end of init_message to the start of engine_pickup: sending the system/init frame and the host's handling of it, where the host can start generating the session's title; then sending hook notices and a local command's output, the once-per-session checks of the instruction files' size (CLAUDE.md and the like) and of missing settings, and raising the turn.start event for plugins; a turn that sends its init before resume_other, which is a handed-over turn or, after a worker restart, a re-run of calls that run on another machine, counts that frame's sending here too and times the rest from where an ordinary turn would send its init), engine_pickup, loop_entry (from the end of engine_pickup to the start of message_prep, less memory_recall_wait and memory_context_wait: a wait of at most 1.5 s for the list of Artifact tool actions the account may use, when the turn offers that tool and no list is saved for the account; deciding whether the session's context, such as instruction files, is written into the start of the request or sent as messages of its own; starting the memory fetches; delivering events and messages queued for the turn's start; and the host's handling of each message these steps and the memory waits add), memory_recall_wait, memory_context_wait, message_prep, model_config_wait, autocompact, request_announcements (from the end of autocompact to the start of query_setup, less the model choice made in this stretch, whose wait is counted in model_config_wait: right after a compaction, the context announced again and the compaction's own messages; any work queued to run between the model's tool calls; PostModelSwitch hook output; git status and project docs read for the announcements, the docs only after any PreToolUse hooks have allowed the read; the notices and announcements put ahead of the request, about usage limits, the session's files, credentials, commit and PR attribution, the advisor tool and the context itself; the system prompt's copy recorded in the transcript; and the host's handling of each message these add and of the rows for events delivered at the turn's start), query_setup, auto_mode_context_wait (the wait at dispatch for the auto-mode context, on a request that started one), model_gates, tool_schema_build, message_normalization, client_creation, request_build, then at most one of redrive_reactive_compact, redrive_fallback_model, redrive_non_streaming and redrive_other (present when the first model request of the turn never began streaming, or was answered without streaming, so time_to_request_ms runs to the send time of a later request: the time between the two sends, named for the reason; after a reply without streaming it includes that reply and any tool calls), and other (the remainder no phase covers). A phase that did not run on the turn is absent; other is always present. Producers that predate conversation_append, init_frame_send, loop_entry and request_announcements count that time in other. Present where time_to_request_ms is, on CLAUDE_CODE_REMOTE sessions and hosts that set CLAUDE_CODE_EMIT_STARTUP_TIMING; absent elsewhere and from older producers.",
        ),
      turn_start_resume_kind: _enum(DEFERRED_KINDS)
        .optional()
        .describe(
          "@internal What the turn was given to settle before its own prompt (the resume_ phases and turn_start_tool_run in time_to_request_phases_ms say how long that took): orphaned_permission (a permission answer whose pending request was lost, as when a worker restarts, so the tool call is settled with that answer), turn_handoff (a turn in progress that the session's client handed over), deferred_tool_use (a call a PreToolUse hook deferred), or none (resume_other is still reported, at about 0). A turn given more than one reports the first in that order. Present where time_to_request_phases_ms is.",
        ),
      handoff_intake_phases_ms: record(stringSchema(), numberSchema().int())
        .optional()
        .describe(
          "@internal On a turn that the session's client handed over (turn_start_resume_kind is turn_handoff), how long its turn_handoff control request waited from its arrival on the session server's SSE stream (--sdk-url) until the input loop read it, in integer ms on the monotonic clock, split into parts that frame_intake_phases_ms explains: startup_wait, control_requests_ahead and user_frames_ahead, each absent when 0, and before_read (the rest), always present. The values sum to the wait. Present only on results that carry turn_start_resume_kind. Absent on a claude-code-server tenant, when the host had handled too much since the arrival to say what the request waited behind, and from older producers.",
        ),
      process_turn_index: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal Number of earlier turns of this CLI process that sent a main-conversation model request: 0 is the process's first turn to reach the model, not the conversation's first. Turns that sent a request and then were stopped, deferred a tool or failed with an error subtype count but carry no value, so values can skip. Where one process hosts several sessions, each has its own count, from 0 each time the process starts hosting it. Present where time_to_request_phases_ms is. A worker that Anthropic hosts, with telemetry on, also sends it when a model turn ends in a result of this subtype with is_error true (an API error, a refused structured output). That result has none of the time_to_request_ or process_ fields beside it. If that turn sent no request, the value is the one its request would have had, so the next turn repeats it.",
        ),
      time_to_request_cpu_ms: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal CPU time (user plus system) the CLI process used from turn start until it sent the turn's first main-conversation model request. Normally that is the time_to_request_ms window; if that request was abandoned for a new call (not an ordinary retry), time_to_request_ms runs on to the new one and this does not. Near time_to_request_ms, the window was mostly computing; near 0, mostly waiting. It adds up all threads, so it can exceed the window, and leaves out child processes, such as a command a tool runs. Unrelated work counts, such as the request that names the session (usually in its first turn). On a virtual machine, time the host spends restoring memory can count as CPU time, so a high value alone does not mean JavaScript work. Present where time_to_request_phases_ms is, unless the runtime reports no resource usage or the process hosts other sessions too.",
        ),
      time_to_request_loop_lag_ms: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal The longest single stall of the session's thread between turn start and the turn's first main-conversation model request, measured as how late a 50 ms timer fired: the real stall can be up to 50 ms longer, so one under 50 ms can read 0, and a few ms is timer noise. JavaScript ran without a break, or the thread waited inside a blocking call (a synchronous file read or child process), or the whole process was paused; time_to_request_cpu_ms below this value means one of the last two, though on a virtual machine a pause while the host restores memory can look like CPU time. Any work on the thread counts: the request that names the session (usually in its first turn), or another session's where several share the thread. Only the first two minutes are measured. Present where time_to_request_phases_ms is.",
        ),
      time_to_request_major_faults: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal Major page faults (waits for memory to be read from disk) by the process in the time_to_request_cpu_ms window; Windows also counts faults needing no disk read. On a virtual machine, memory the host restores is not counted: the machine never sees those faults. Present where time_to_request_cpu_ms is.",
        ),
      process_rss_mib_turn_start: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal Resident memory of the CLI process at turn start, in whole MiB, as its kernel counts it (VmRSS in /proc/self/status). From the process's second turn on, it shows what stayed resident through the idle time since the turn before. Child processes, such as a command a tool runs or an MCP server, are left out. On a virtual machine it is the guest kernel's count, not what the host holds for the machine. Sent only by a worker that Anthropic hosts (never by a self-hosted runner, a BYOC environment, a session that Claude Desktop starts or a local run), and only with telemetry on. On such a worker it is present, always with process_rss_mib_result, where time_to_request_loop_lag_ms is, on Linux (not WSL), unless /proc/self/status cannot be read or lacks VmRSS, or the process hosts other sessions too.",
        ),
      process_anon_mib_turn_start: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal The anonymous part of process_rss_mib_turn_start (RssAnon): memory with no file behind it, such as heaps, stacks and code the JavaScript engine compiles while running. Mapped files, such as the executable, are left out. Present where process_rss_mib_turn_start is, if the kernel gives it.",
        ),
      process_rss_mib_result: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal As process_rss_mib_turn_start, read again after the turn, just before this result is built: the level the turn leaves behind.",
        ),
      process_anon_mib_result: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal The anonymous part of process_rss_mib_result; see process_anon_mib_turn_start. Present where process_rss_mib_result is, if the kernel gives it.",
        ),
      process_peak_rss_mib: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal The most memory the process has had resident from its start until this result (VmHWM), in whole MiB. It is not the peak of this turn alone: a later turn repeats an earlier peak unless it went higher. Present where process_rss_mib_result is, if the kernel gives it.",
        ),
      process_cpu_ms_between_turns: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal CPU time (user plus system, all threads, without child processes) the CLI process used from the end of its previous turn to this turn's start: mostly what it costs while no turn runs. A turn ends after its last frame and its turn-end hooks. Work it left running in the background counts here, as do this turn's steps ahead of turn start, such as re-reading the tool list. To get CPU time per second, add these up over many results and divide by the sum of their process_wall_ms_between_turns, which always comes with it. Present where process_cpu_ms_turn is, from the process's second turn of any kind on (process_turn_index can still be 0), unless the previous turn was abandoned midway and so never ended.",
        ),
      process_wall_ms_between_turns: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal The time that passed in the process_cpu_ms_between_turns stretch, by a clock that never runs backward. Time while the process is stopped counts; time while its virtual machine is paused may not.",
        ),
      process_cpu_ms_turn: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal CPU time, counted as in process_cpu_ms_between_turns, from this turn's start until just before this result is built, so what the turn does after that is in neither stretch. The stretch includes the waits for the model and for tools. It always comes with process_wall_ms_turn. Sent only by the workers named under process_rss_mib_turn_start. On them it is present where time_to_request_loop_lag_ms is, unless the runtime reports no resource usage or the process hosts other sessions too.",
        ),
      process_wall_ms_turn: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal The time that passed in the process_cpu_ms_turn stretch, by the same clock as process_wall_ms_between_turns.",
        ),
      shell_cpu_ms_turn: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal How far the counter of a CPU accounting group moved in the process_cpu_ms_turn stretch: CPU time (user plus system) of the programs in that group. The shells of the Bash and Monitor tools join the group just before each command runs, so it holds those shells, everything they start, and any program that an earlier command, or an earlier Claude Code process that used the same group, left running there. It is not part of process_cpu_ms_turn, which leaves out child processes. A shell's own start-up is not counted. Nor is a command whose shell could not join the group, as can happen under Claude Code's command sandbox or CLAUDE_CODE_SHELL_PREFIX: the figure then reads lower, or 0, rather than being absent. Programs the CLI starts itself, such as hooks, MCP and LSP servers and plugin monitors, and a ! command that a person sends from the client, do not join the group. A command that the session sends to another machine, such as a linked computer, is in no field. Present where process_cpu_ms_turn is, if the CLI could make the group when its process started and could read its counter at the start and the end of the stretch, the second reading not lower than the first. The CLI makes the group only on Linux, where its process has a CPU accounting group of its own on a cgroup v1 hierarchy that carries cpuacct alone. Absent, never 0, otherwise.",
        ),
      shell_cpu_ms_since_last_result: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal CPU time, counted as in shell_cpu_ms_turn, from just before the previous result of this process that carried shell_cpu_ms_turn was built until this turn's start, so it includes any turn in between that gave no result or a result without shell_cpu_ms_turn. process_cpu_ms_between_turns starts later, at the end of the previous turn. Added up over a process's results, shell_cpu_ms_turn and this field never count a millisecond twice. It always comes with shell_wall_ms_since_last_result. Present where shell_cpu_ms_turn is, except on the process's first such result, and on any other where, since the one before it, a result had time_to_request_phases_ms but not process_cpu_ms_turn (as when telemetry was off), a turn began while the process's figures were withheld (this result's own turn included), or the group's counter read lower at the end of a stretch than at its start. Where a result has shell_cpu_ms_turn but not this field, what ran from the previous result that carried shell_cpu_ms_turn to this turn's start is in neither field.",
        ),
      shell_wall_ms_since_last_result: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal The time that passed in the shell_cpu_ms_since_last_result stretch, by the same clock as process_wall_ms_turn. Present exactly where shell_cpu_ms_since_last_result is.",
        ),
      process_cpu_ms_streaming: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal CPU time, counted as in process_cpu_ms_between_turns, that the process used inside process_wall_ms_streaming. It is part of process_cpu_ms_turn. It holds what handling the streamed replies cost while they streamed, but not what the CLI does with a reply once its stream has ended. It also holds whatever else the process did meanwhile, such as a tool that starts before the reply ends, a subagent, a side request, telemetry or garbage collection. It always comes with process_wall_ms_streaming, main_stream_count and main_stream_event_count; main_stream_chunk_count can be missing. Sent only by the workers named under process_rss_mib_turn_start. On them it is present where process_cpu_ms_turn is, if a stream opened on the turn and each of its windows could be measured.",
        ),
      process_wall_ms_streaming: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal How long, within the process_cpu_ms_turn stretch and by its clock, a response stream of a main-conversation model request was open: from the stream's first event until the CLI stopped reading it, whether it ended, failed or was aborted. The wait for the first event is not in it. Summed over the turn's requests; time in which two such streams were open counts once. The stream of a subagent, of a side request or of a compaction opens nothing.",
        ),
      main_stream_count: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal How many streams process_wall_ms_streaming covers: one for each attempt of a main-conversation model request that brought a first event, so a retry after that counts again.",
        ),
      main_stream_event_count: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal How many stream events the API sent on those streams, as tengu_api_success's streamEventCount counts them: keepalive pings that the CLI makes up itself are left out. A stream still open when this result is built adds none.",
        ),
      main_stream_chunk_count: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal In how many chunks the runtime's fetch handed over the bodies of those streams. It is not the number of socket reads, several of which can make one chunk. Against main_stream_event_count it shows how the API's events arrive grouped, though the two do not divide evenly: a chunk can end inside an event, keepalive comments and pings are chunks that bring no event, and a stream that failed or was aborted can count one chunk whose events were never read. Absent, never 0, when a stream's chunks were not counted, as on Bedrock, Vertex, Foundry and Mantle, with the byte watchdog off, or for a stream still open when this result is built.",
        ),
      input_attachments_detail: objectSchema({
        slowest_producer: stringSchema().optional(),
        slowest_producer_ms: numberSchema().int().optional(),
        cpu_ms: numberSchema().int().optional(),
        major_faults: numberSchema().int().optional(),
        changed_files_reread: numberSchema().int().optional(),
        touch_compare: objectSchema({
          same: numberSchema().int().optional(),
          differs: numberSchema().int().optional(),
          via_outputs_link: numberSchema().int().optional(),
          partial_view: numberSchema().int().optional(),
          already_compared: numberSchema().int().optional(),
          link_on_path: numberSchema().int().optional(),
          leaf_link: numberSchema().int().optional(),
          nlink: numberSchema().int().optional(),
          not_regular: numberSchema().int().optional(),
          oversize: numberSchema().int().optional(),
          enoent: numberSchema().int().optional(),
          other: numberSchema().int().optional(),
        }).optional(),
        setup_ms: numberSchema().int().optional(),
        prompt_producers_ms: numberSchema().int().optional(),
        ambient_start_ms: numberSchema().int().optional(),
        ambient_wait_ms: numberSchema().int().optional(),
        render_ms: numberSchema().int().optional(),
        producers: numberSchema().int().optional(),
        token_counts: numberSchema().int().optional(),
        token_count_ms: numberSchema().int().optional(),
        changed_files_read_ms: numberSchema().int().optional(),
        differs_files: objectSchema({
          size_under_25_kb: numberSchema().int().optional(),
          size_25_to_50_kb: numberSchema().int().optional(),
          size_50_to_256_kb: numberSchema().int().optional(),
          size_over_256_kb: numberSchema().int().optional(),
          hash_only: numberSchema().int().optional(),
        }).optional(),
      })
        .optional()
        .describe(
          "@internal What the input_attachments phase of time_to_request_phases_ms did on the turn, to tell a wait inside one attachment producer from a process that was busy. The producers are the calls of maybe() in getAttachments; their labels are a closed list. A pass starts them in two groups, first those that read the prompt's own text and then all the others, each group one producer after another without a break, and then waits for the group. slowest_producer is the label of the one whose result came longest after the last of its group had been started (or after its own start, where that was later), among those that began within the phase, and slowest_producer_ms is that time: it is the producer a pass waited on longest, and where every producer finished almost at once it says little; a background agent's pass that begins within the phase is timed with the turn's own (a new process's first turn has none), and its re-reads are not counted. Where slowest_producer_ms is well above cpu_ms that producer most likely waited (on a file, the network or a child process); a time_to_request_loop_lag_ms near slowest_producer_ms says instead that the thread itself stood still about that long (a blocking call, or a paused process). Where it is not well above cpu_ms the label tells little. cpu_ms and major_faults are time_to_request_cpu_ms's and time_to_request_major_faults's counters over this phase alone and are read the same way: cpu_ms far below the phase's time means the process was not computing; at or above it means computing, without saying whose. Where cpu_ms is absent, the phase's own time is what there is to compare slowest_producer_ms with. changed_files_reread is how many files the changed_files producer set out to read again in full because their modification time was later than the one recorded when the conversation last wrote or edited them (0 when it read none again, whether or not any file was a candidate; absent when the conversation's record of files was empty or the producer did not run). Present on turns where the input_attachments phase started, unless nothing of it is known. cpu_ms and major_faults are absent wherever time_to_request_cpu_ms is absent, and when the turn's first model request went out before the phase ended. touch_compare counts how the changed_files producer's compares ended in the main thread's pass (a subagent's are not counted). A compare checks a touched file against what the conversation last saw (its size, then its bytes), before deciding whether to read it again. same: the text had not changed, so it was not read again. differs: it had, so it was read again. partial_view and already_compared: the file was not compared (the conversation has seen only part of it or an older copy, or it was compared once already since the conversation last read or wrote it) and was read again. The rest are why a compare declined and the file was read again: link_on_path (the file could not be shown to be the one its path names: on Linux a symbolic link on the way, or a landing through the outputs link that the read check did not judge; or the file swapped or removed meanwhile), leaf_link (the open met a symbolic link: at the file, or on macOS anywhere on the way), nlink (the file has a second hard link), not_regular, oversize, enoent (the file was gone) and other (anything else, errors included). via_outputs_link counts those of same and differs that were reached through the hosted container's outputs link, from /mnt/user-data/outputs to /mnt/attach/outputs. Whole numbers; a zero count is left out, and touch_compare is absent when nothing was counted. The remaining members add up what the main thread's attachment passes (each time Claude Code gathers a turn's attachments) measured of themselves. Only a pass that began and ended within one run of the phase, before the turn's first model request went out, adds to them: not a subagent's or a background agent's (though slowest_producer can come from one), and not a pass with attachments switched off. setup_ms, prompt_producers_ms, ambient_start_ms, ambient_wait_ms and render_ms split each pass in order, each rounded down, so their sum is at most the phase's time: setup_ms, the work before any producer starts (such as working out which tools the tool announcements list and, on a conversation's first pass in the process, reading that list's earlier state from the transcript); prompt_producers_ms, starting the producers that read the prompt's own text (at-mentioned files, MCP resources, mentions of agents, skills and peers) and waiting for them; ambient_start_ms, starting every other producer, each one's work up to its first wait included, with no wait between starts, so the thread ran code throughout (computing, or a blocking call); ambient_wait_ms, waiting for those; render_ms, the rest: merging the producers' results, logging the attachments with their token estimates, and making each attachment into a message, the caller's time between messages included. producers is how many producers the passes started. token_counts is how many times the passes asked the API to count a file's tokens (an at-mentioned file, a text file that came with the message, or a changed file), which happens only for text estimated above a quarter of the Read tool's token limit. Both are present, 0 included, whenever a pass was kept. token_count_ms is the time at least one such count was under way, so counts that overlap are not added twice; it is absent when token_counts is 0, and on claude-code-server no request is made, so it stays near 0. changed_files_read_ms is the time at least one of the changed_files producer's Read calls was under way, their token counts included (absent when it made none). differs_files sorts the files counted under touch_compare's differs by their size on disk when compared, counting only the passes kept here, so the bands can add up to less than differs: size_under_25_kb, size_25_to_50_kb, size_50_to_256_kb and size_over_256_kb (1 KB is 1,024 bytes; a size on a boundary is in the band above it, except exactly 256 KB, which is in size_50_to_256_kb; size_over_256_kb only where the Read size limit has been raised). hash_only counts those of them for which the conversation kept only a hash of the earlier text, so that the model, if told, gets the file's name without a diff. In differs_files a zero count is left out, and it is absent when no compare in a kept pass ended in differs.",
        ),
      resume_store_confirm_detail: objectSchema({
        write_ms: numberSchema().int(),
        ahead_ms: numberSchema().int(),
        post_ms: numberSchema().int(),
        other_ms: numberSchema().int(),
        posts: numberSchema().int(),
        failed_posts: numberSchema().int(),
        rows_ahead: numberSchema().int(),
        rows: numberSchema().int(),
      })
        .optional()
        .describe(
          "@internal How the resume_store_confirm phase of time_to_request_phases_ms was spent. Present where that phase is, in a session whose transcript goes to a hosted store: on the result of a handed-off turn whose lines were confirmed and that went on to a model request. A wait that ends its turn (the lines not stored, or the turn stopped meanwhile) is therefore not in the measure. The four _ms values sum to that phase exactly. write_ms: the transcript write, until the carried lines are in the queue of the lane that uploads transcript rows (POST /worker/internal-events, one POST out at a time); a POST that is out during the write is counted in posts and rows, but that part of its time is in write_ms only. The other three split the wait for that lane to empty. ahead_ms: a POST was out that held only rows queued before the hand-off's write began, one already out at that moment included. post_ms: any other POST was out, timed by the client from before the body is encoded to the response, each retry included. other_ms: no POST was out (a backoff between retries, picking and sizing the next batch, a busy event loop), plus rounding, any POST still out when the wait was cut short, and the time of POSTs after the 64th. posts: POST attempts that ended between the start of the write and the end of the wait; failed_posts: those that did not go through. rows_ahead: rows the lane had accepted and the store had not yet confirmed when the write began, queued or in a POST already out; rows written earlier but kept back for a compaction's summary count from when they are queued. rows: rows queued since then that a POST delivered, the carried lines among them.",
        ),
      user_message_uuid: stringSchema().optional(),
      user_message_uuids: array(stringSchema()).optional(),
      resume_reason: stringSchema().optional(),
      local_command: stringSchema().optional(),
      request_sent_wall_ms: numberSchema().optional(),
      first_request_input_tokens: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal Input tokens of the model call whose send time is request_sent_wall_ms: input_tokens + cache_read_input_tokens + cache_creation_input_tokens from that call's message_start. Lets a consumer group turn latency by prompt size. Present only with request_sent_wall_ms, and only when the sum is above zero; absent from older producers.",
        ),
      user_message_server_received_wall_ms: numberSchema()
        .optional()
        .describe(
          "@internal The server_received_wall_ms of the user message that user_message_uuid names, copied unchanged, so the session server can measure from its own receipt to request_sent_wall_ms (two machines' clocks) without keeping the receipt time. Present only with request_sent_wall_ms, and only when that message carried a positive finite number there; absent from older producers.",
        ),
      first_content_frame_ms: numberSchema().int().optional(),
      first_stream_post_ms: numberSchema().int().optional(),
      first_stream_post_ack_ms: numberSchema().int().optional(),
      first_stream_post_queue_wait_ms: numberSchema().int().optional(),
      first_stream_post_queued_behind: _enum(MESSAGE_DELIVERY_MODES).optional(),
      first_stream_post_wall_ms: numberSchema().optional(),
      frame_received_wall_ms: numberSchema()
        .optional()
        .describe(
          "@internal Date.now() (epoch ms) when the triggering send's frame arrived on a session reading its input from the session server's SSE stream (--sdk-url), before the input loop read it. With frame_enqueued_wall_ms and turn_started_wall_ms it splits the stretch between the server's persist and request_sent_wall_ms into transit, the input loop's handling of the frame, its wait on the command queue, and the turn's own work. Present only together with request_sent_wall_ms, and only when the transport recorded the receipt; absent on a local stdin host and from older producers.",
        ),
      frame_enqueued_wall_ms: numberSchema()
        .optional()
        .describe(
          "@internal Date.now() (epoch ms) when the input loop put the triggering send's frame on the command queue. Present exactly when frame_received_wall_ms is.",
        ),
      turn_started_wall_ms: numberSchema()
        .optional()
        .describe(
          "@internal Date.now() (epoch ms) when the turn's clock started: the anchor duration_ms, ttft_ms, ttft_stream_ms, time_to_request_ms, first_content_frame_ms, first_stream_post_ms and first_stream_post_ack_ms are measured from. Present exactly when frame_received_wall_ms is.",
        ),
      frame_intake_phases_ms: record(stringSchema(), numberSchema().int())
        .optional()
        .describe(
          "@internal How the triggering send's frame spent the time from frame_received_wall_ms to frame_enqueued_wall_ms, in integer ms per step: before_read (until the input loop read the frame; a frame received more than once counts from the earliest receipt no earlier copy already took), and, carved out of before_read where the loop could tell them apart, startup_wait (the part before the input loop existed, the worker still starting), control_requests_ahead (the part the loop spent handling control requests before it read the frame) and user_frames_ahead (the part it spent on earlier user frames, each from its read until the loop moved on, at its delivery or its parking), so that before_read keeps only the rest (frames handled without being noted, and everything when no split could be made); then dedup, flag_settle, receive_hook, attachments, admission_wait (held behind a pending model switch, a pending MCP server-set change, start-up work the worker still owed its first turn, or an earlier held frame), admit_check (the host's decision whether to queue the frame, when it had to be awaited), and other (the rest). Steps that did not run are absent; before_read and other are always present. The values sum to frame_enqueued_wall_ms minus frame_received_wall_ms, unless other or before_read came out negative and was set to 0. Present exactly when frame_received_wall_ms is, except from older producers.",
        ),
      turn_start_phases_ms: record(stringSchema(), numberSchema().int())
        .optional()
        .describe(
          "@internal How the time from frame_enqueued_wall_ms to turn_started_wall_ms was spent, in integer ms per step of the host's work through its message queue. Each step is where the host was at the time, which for part of the stretch may be an earlier message's turn. The steps: idle (the host was not working through its queue), earlier_turn (an earlier turn still running, including its work after its result), after_turn (the host's work after an earlier turn ended and before it took the next message: recording the outcome, writing the transcript and acknowledgements, and releasing the queue; also its handling of a crash), background_wait (waiting on background tasks before looking at the queue again), entry_joins (other waits when the host starts on its queue, before it may take a message), sdk_mcp_update (the claude -p host updating its SDK MCP servers when it starts on its queue), loop_top (reloading plugins that changed, at the start of each pass over the queue), session_start_wait (waiting for the plugins' first session.start hook, and taking the message off the queue), first_command (the claude -p host's waits for its plugin registry and a Projects mount before the first message it takes each time it starts on its queue), mcp_prewait (waiting for MCP servers still connecting, before that same first message), repo_wait (a claude-code-server session waiting for its repository before a turn), turn_joins (before every turn: waiting for a Projects mount and for SDK or newly added MCP servers), tool_pool (building the turn's tools), commit (marking the message taken and setting up its turn), after_arm (waiting for a cleared permission prompt's record to be written, and the host's other work once the turn is set up), turn_gate (work the host requires before every turn), turn_open (the host's turn-start hook and other turn setup), engine_setup (getting the engine for the turn; on the claude -p host's first turn, building its session), tool_reread (re-reading tools, MCP clients and settings for the turn), cwd (switching to the turn's working directory), and other (the rest: rounding, and the wall clock running ahead of the monotonic one). Values are rounded so that they add up: each is within 1 ms of its step's time, a step that comes out as 0 is absent, and other is always present. The values sum to turn_started_wall_ms minus frame_enqueued_wall_ms, except that they can exceed it, usually by 1 ms from rounding and by more if the wall clock stepped back. Present only when frame_received_wall_ms is, and absent from older producers.",
        ),
      turn_start_control_requests_ms: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal Of the time from frame_enqueued_wall_ms to turn_started_wall_ms, the integer ms in which the claude -p host's message reader was held by control requests (such as mcp_set_servers or set_permission_mode) instead of reading the next message; for a request handled in the background, only its start counts. The host can keep working toward the turn meanwhile, so this overlaps turn_start_phases_ms and is not part of its sum. Absent when 0. A claude-code-server tenant does not time control requests, so its results never have this field.",
        ),
      first_text_post_ms: numberSchema().int().optional(),
      first_text_post_queue_wait_ms: numberSchema().int().optional(),
      first_text_post_queued_behind: _enum(MESSAGE_DELIVERY_MODES).optional(),
      first_text_post_wall_ms: numberSchema().optional(),
      text_post_count: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal How many uploads carrying new visible reply text (as first_text_post_ms defines it) the remote transport sent during the turn, counting from the upload that first_text_post_ms measures until this result was built. Uploads still queued at that point are not counted, and a retry counts only if it carries text that no earlier upload did. Present only when first_text_post_ms is, and never in a claude-code-server tenant.",
        ),
      text_post_gap_over_500ms_count: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal Of the uploads in text_post_count, how many were dispatched more than 500 ms after the one before. It shows how evenly the reply's text leaves this process. A tool call, thinking or a pause of the model between two pieces of text makes such a gap too, so compare groups of turns with each other, not with 0. Present where text_post_count is.",
        ),
      text_post_flush_timer_max_late_ms: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal The largest delay, in whole ms, between the remote transport's stream-event flush timer falling due and its buffer being emptied, from the turn's first frame of visible reply text until this result was built. This is a lower bound on how late that timer fired. It is read on the wall clock, so a clock set forward adds to it. Capped at 60000. Absent when text_post_count is absent, or when the buffer was never emptied at or after a due time.",
        ),
      time_to_request_from_spawn_ms: numberSchema().int().optional(),
      warm_spare_claimed: booleanSchema().optional(),
      flag_fetch_kick: stringSchema()
        .optional()
        .describe(
          "@internal One of FLAG_FETCH_KICKS, a string here so that list can change: whether this process started its start-up feature-flag fetch before the wait for it, or why not: the same value as system:init's startup_timing.flag_fetch_kick. started_in_init_* and started_after_init_*: it did, inside init() or right after. not_asked_warm: the flag cache was warm and nothing asked for an early start. settings_pending_*: settings that could change the fetch were still to be applied. launch_excluded: not a launch that starts it early. not_eligible: interactive, or no wait is budgeted. An _empty or _warm ending is the flag cache at that moment. Present only where time_to_request_from_spawn_ms is, and only when start-up judged it.",
        ),
      time_origin_ms: numberSchema().optional(),
      process_start_tuning: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal Which runtime tuning variables the CLI process was started with, one bit for each that was set and not empty: 1 BUN_GC_TIMER_INTERVAL, 2 MIMALLOC_PURGE_HOLES_MIN_INTERVAL, 4 BUN_IDLE_GC_SECONDS, 8 MIMALLOC_PURGE_DELAY, 16 BUN_JSC_useFTLJIT, 32 BUN_JSC_percentCPUPerMBForEdenTimer, 64 BUN_JSC_percentCPUPerMBForFullTimer. It says that a name was set, never to what. It is taken once, as the process starts, because that is when the runtime reads them: a worker adopted from a warm spare reports the spare's own variables, not the ones its claim brought. Sent only by the workers named under process_rss_mib_turn_start, unless the process hosts other sessions too. They put it on a session's results as they write them, whatever the subtype and whether or not the turn sent a request. A result that reports a failed start or a fatal error is written raw and has none.",
        ),
      process_start_purge_delay_ms: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal MIMALLOC_PURGE_DELAY, in milliseconds, as the CLI process was started with it. Taken with process_start_tuning and sent only beside it. Absent where the variable was unset or empty, and where its text is anything but one to seven digits, so no text can travel: bit 8 of process_start_tuning still says that it was set.",
        ),
      process_garbage_collections: gcStatsSchema()
        .optional()
        .describe(
          "@internal Garbage collections on the CLI process's main thread, counted from early start-up, before its main modules load. to_first_message: up to the start of the process's first turn, whether a message or start-up itself (a resumed turn, say) began it; absent if no turn began first or its count failed. to_first_result: up to this result, including to_first_message's. A worker claimed from a warm spare counts from the spare's own start, so both include its wait for the claim. Each gives eden (collections of young objects only; under Bun the process's first also marks the whole heap), full (collections of the whole heap), wall_ms (their summed wall-clock time, not CPU time) and heap_after_mib (heap in use after the last one; absent if none ran). A collection still running at either moment is not in that count. Only on the process's first numbered result (result_index 0) within an hour of its start, only when the process, or the warm spare it was claimed from, started with CLAUDE_CODE_COUNT_GARBAGE_COLLECTIONS=1, and only from cloud workers that Anthropic hosts, with telemetry on, never from a process that hosts other sessions.",
        ),
      is_error: booleanSchema(),
      api_error_status: numberSchema().int().nullable().optional(),
      api_error_code: stringSchema()
        .optional()
        .describe(
          "@internal The api_error_code of the API error that ended the turn (see SDKAssistantMessage.api_error_code): the server's error.details.error_code when it is an identifier. Absent when the turn did not end on an API error or the response carried no code.",
        ),
      api_error_origin: _enum(["first_party"])
        .optional()
        .catch(undefined)
        .describe(
          "@internal The api_error_origin of the API error that ended the turn (see SDKAssistantMessage.api_error_origin): first_party when Anthropic's own API sent the response. Absent when the turn did not end on an API error or the origin is anything else; treat an unknown value as absent.",
        ),
      api_error: SDKAssistantMessageSchema_2().shape.api_error.describe(
        "@internal The api_error of the API error that ended the turn (see SDKAssistantMessage.api_error). Absent when the turn did not end on an API error or the error has no typed kind; treat an unknown value as absent.",
      ),
      num_turns: numberSchema().int(),
      result: stringSchema(),
      stop_reason: stringSchema().nullable(),
      total_cost_usd: numberSchema().describe(TOTAL_COST_DESCRIPTION),
      usage: MainLoopUsageSchema(),
      modelUsage: record(stringSchema(), ModelUsageSchema()).describe(MODEL_USAGE_DESCRIPTION),
      model_usage_since_last_result: record(stringSchema(), ModelUsageSchema())
        .optional()
        .describe(MODEL_USAGE_SINCE_LAST_DESCRIPTION),
      subagent_stats: SubagentStatsSchema().optional().describe(SUBAGENT_STATS_DESCRIPTION),
      safety_stops: numberSchema().int().nonnegative().optional().describe(SAFETY_STOPS_DESCRIPTION),
      permission_denials: array(PermissionDenialSchema()),
      queued_turn_count: numberSchema().int().optional().describe(QUEUED_TURN_COUNT_DESCRIPTION),
      structured_output: unknown().optional(),
      deferred_tool_use: DeferredToolUseSchema().optional(),
      terminal_reason: TerminalReasonSchema().optional(),
      interrupted_by_shutdown: literal(true).optional().describe(INTERRUPTED_BY_SHUTDOWN_DESCRIPTION),
      result_index: numberSchema().int().nonnegative().optional().describe(RESULT_INDEX_DESCRIPTION),
      fast_mode_state: FastModeStateSchema().optional(),
      fast_mode_disabled_reason: FastModeBlockedReasonSchema().optional(),
      origin: MessageOriginSchema().optional(),
      uuid: _(),
      session_id: stringSchema(),
    }),
  );
  SDKResultMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("result"),
      subtype: _enum([
        "error_during_execution",
        "error_max_turns",
        "error_max_budget_usd",
        "error_max_structured_output_retries",
      ]),
      duration_ms: numberSchema().int(),
      duration_api_ms: numberSchema().int(),
      is_error: booleanSchema(),
      num_turns: numberSchema().int(),
      stop_reason: stringSchema().nullable(),
      total_cost_usd: numberSchema().describe(TOTAL_COST_DESCRIPTION),
      usage: MainLoopUsageSchema(),
      modelUsage: record(stringSchema(), ModelUsageSchema()).describe(MODEL_USAGE_DESCRIPTION),
      model_usage_since_last_result: record(stringSchema(), ModelUsageSchema())
        .optional()
        .describe(MODEL_USAGE_SINCE_LAST_DESCRIPTION),
      subagent_stats: SubagentStatsSchema().optional().describe(SUBAGENT_STATS_DESCRIPTION),
      safety_stops: numberSchema().int().nonnegative().optional().describe(SAFETY_STOPS_DESCRIPTION),
      permission_denials: array(PermissionDenialSchema()),
      queued_turn_count: numberSchema().int().optional().describe(QUEUED_TURN_COUNT_DESCRIPTION),
      errors: array(stringSchema()),
      runner_exit: RunnerExitSchema()
        .optional()
        .describe(
          "@internal Set by the self-hosted runner on the result it synthesizes when the session process fails to start or exits abnormally (src/self-hosted-runner/failureResult.ts buildFailureEvents).",
        ),
      startup_failure_reason: StartupFailureReasonSchema()
        .optional()
        .describe(
          "Set on the zeroed error_during_execution result a stream-json run writes before exiting on a known startup failure; errors carries the failure message. Failures that otherwise end with stderr alone write that result only when the host sets CLAUDE_CODE_STARTUP_FAILURE_RESULTS. Absent on every other result, on startup failures without a known cause, and from older producers.",
        ),
      user_message_uuid: stringSchema()
        .optional()
        .describe(
          "Client uuid of the user message that triggered this turn (submitMessage options.uuid), echoed back so a consumer can link this error result to the send it answers \u2014 the same join key the success variant echoes, carried alone (error turns have no request_sent_wall_ms to report). A delivery-failure result from the remote-session client echoes the failed send's queue key, which is client-minted when the host sent no uuid of its own. A synthetic/scheduled (meta) turn's own uuid is echoed only when the host vouches it is the client event's own (delivered content such as a Slack owner ping or a Slack-bot observation); a meta turn that folded queued user messages in mid-turn, vouched or not, echoes the LAST of them. Absent on turns that neither had a client uuid nor folded a user message in, on session-scoped failures with no single triggering send (a crashed worker's zeroed result), and from older producers.",
        ),
      user_message_uuids: array(stringSchema())
        .optional()
        .describe(
          "Client uuids of every user message whose prompt this turn consumed, in consumption order \u2014 all members of a prompt batch the host merged into this one turn (several messages sent close together run as one turn whose user_message_uuid is the LAST member's), then any queued user message folded into the running turn between tool rounds, once taken off the queue \u2014 so a consumer that sent any of them can bind this result to its own send by finding its uuid anywhere in the list. Always contains user_message_uuid; at most 64 entries; can be longer than the list on the turn's first reply frame. Present when a headless turn that ran echoes user_message_uuid; absent on delivery-failure and zeroed results and from older producers (fall back to user_message_uuid).",
        ),
      resume_reason: stringSchema()
        .optional()
        .describe(
          "Why this turn continued one that a worker restart interrupted. Such a turn is the automatic re-run of the interrupted turn (CLAUDE_CODE_RESUME_INTERRUPTED_TURN), or one that goes on from the answer to the permission prompt the new worker took over, or from that turn's tool calls still in flight. The value is the host's CLAUDE_CODE_RESUME_REASON when it set one (host_draining, checkpoint_restore, container_recreated, \u2026), else 'interrupted_turn'. Present on such a headless turn's result, success or error, with or without an echo (a turn whose opening user prompt could not be vouched for still carries the reason); absent on every other turn (also one that goes on from the answer to any other permission prompt), on the Remote Control bridge's per-turn synthetic results, and from older producers.",
        ),
      process_start_tuning: numberSchema()
        .int()
        .optional()
        .describe("@internal As process_start_tuning on the success result."),
      process_start_purge_delay_ms: numberSchema()
        .int()
        .optional()
        .describe("@internal As process_start_purge_delay_ms on the success result."),
      process_garbage_collections: gcStatsSchema()
        .optional()
        .describe("@internal As process_garbage_collections on the success result."),
      terminal_reason: TerminalReasonSchema().optional(),
      interrupted_by_shutdown: literal(true).optional().describe(INTERRUPTED_BY_SHUTDOWN_DESCRIPTION),
      result_index: numberSchema().int().nonnegative().optional().describe(RESULT_INDEX_DESCRIPTION),
      fast_mode_state: FastModeStateSchema().optional(),
      fast_mode_disabled_reason: FastModeBlockedReasonSchema().optional(),
      origin: MessageOriginSchema().optional(),
      uuid: _(),
      session_id: stringSchema(),
    }),
  );
  ResultMessageSchema = DoctorLazy(() =>
    union([SDKResultSuccessMessageSchema(), SDKResultMessageSchema()]).describe(
      `The outcome of a turn. The CLI emits exactly one result message per turn, after that turn's assistant, user and stream_event messages; treat it as the turn-complete signal (informational system messages such as task notifications, session state changes or prompt suggestions may still follow it). subtype "success" carries the final assistant text in result \u2014 or, with is_error true, the error text when the turn ended on an API error; the error subtypes say why the turn stopped early. In single-prompt (non-streaming-input) mode the process exits after the turn.`,
    ),
  );
  SettingsValidationErrorSchema = DoctorLazy(() =>
    objectSchema({
      file: stringSchema().optional().describe("Path to the settings file that failed to parse or validate."),
      path: stringSchema().describe(
        "Dot-notation path to the field with the error, or empty string for whole-file errors.",
      ),
      message: stringSchema().describe("Human-readable error message."),
    }).describe(
      "A settings file parse or validation error. When a settings.json file fails to parse (invalid JSON, JSON comments, schema mismatch), the file is skipped and any rules it contained \u2014 including permission allow/deny lists \u2014 are not applied.",
    ),
  );
  PLUGIN_VERSION_DESCRIPTION =
    "The plugin's version as declared in its plugin.json manifest, emitted verbatim (plugin-author-controlled \u2014 validate before trusting). Omitted when the manifest declares no version.";
});
//@ chunk-bwbq4xvm.js:371479-372962 placement
function attachedDeviceSchema() {
  return objectSchema({
    id: stringSchema(),
    view_url: stringSchema(),
    device: discriminatedUnion("status", [
      objectSchema({
        status: literal("bound"),
        device_id: stringSchema(),
        display_name: stringSchema().optional(),
      }),
      objectSchema({
        status: literal("unbound"),
        reason: stringSchema(),
        message: stringSchema(),
      }),
    ]),
    directory_sync: objectSchema({
      state: _enum(["off", "seeding", "armed", "stopped"]),
      reason: stringSchema().optional(),
      message: stringSchema().optional(),
      first_upload: stringSchema().optional(),
      synced_files: numberSchema().int().nonnegative().optional(),
      other_window: booleanSchema().optional(),
      muted: booleanSchema().optional(),
      started_from_upload: booleanSchema().optional(),
      direction: _enum(["two_way", "upload_only"]).optional().catch(undefined),
      file_mode: _enum(["container_sync", "device_tools", "unspecified"]),
      file_mode_source: _enum(["stored"]),
    }),
    client_version: literal(1),
    not_applied: array(
      objectSchema({
        name: stringSchema(),
        kind: _enum(["lost", "kept", "preference"]),
      }),
    ).optional(),
    host: objectSchema({
      handle: stringSchema(),
      working_dir: stringSchema(),
      platform: stringSchema(),
      cli_version: stringSchema().optional(),
    }).optional(),
    serving: objectSchema({
      state: _enum(["on", "off", "pending", "revoked"]).catch("off"),
      reason: stringSchema().optional().catch(undefined),
      policy: _enum(["parity", "interim"]).catch("interim"),
      channel: _enum(["session", "bridge_only"]).catch("bridge_only"),
    }).optional(),
    connection: _enum(["connecting", "live", "reconnecting"]).optional().catch(undefined),
    calls: objectSchema({
      live: array(
        objectSchema({
          call_id: stringSchema(),
          tool: stringSchema(),
          state: _enum(["running", "asked"]).catch("running"),
          since: numberSchema(),
          ask_id: stringSchema().optional(),
          lapses_at: numberSchema().optional(),
          classifier_eligible: booleanSchema().optional(),
        }),
      ),
      recent: array(
        objectSchema({
          call_id: stringSchema(),
          tool: stringSchema(),
          ended: _enum(["completed", "denied", "withdrawn", "refused", "failed"]).catch("failed"),
          code: stringSchema().optional(),
          at: numberSchema(),
        }),
      ),
    }).optional(),
    notices: array(
      objectSchema({
        key: stringSchema(),
        text: stringSchema(),
      }),
    )
      .optional()
      .catch(undefined),
  });
}
//@ chunk-bwbq4xvm.js:372962-412402 placement
/**
 * SDK system/init 消息 schema（agents、apiKeySource、betas、cwd、tools、mcp_servers、slash_commands、startup_timing…）。
 */
var SDKSystemInitMessageSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SDKStreamEventMessageSchema;
var SDKSystemCompactBoundaryMessageSchema;
var SDKSystemStatusMessageSchema;
var SDKSystemPostTurnSummaryMessageSchema;
var SDKSystemTaskSummaryMessageSchema;
var SDKSystemSessionMetadataMessageSchema;
var SDKSystemInformationalMessageSchema;
var SDKSystemPermissionRetryMessageSchema;
var SDKSystemStopHookSummaryMessageSchema;
var SDKSystemMemorySavedMessageSchema;
var SDKSystemAgentsKilledMessageSchema;
var SDKSystemInstructionSizeWarningMessageSchema;
deferInit("chunk-bwbq4xvm.js:372962", () => {
  SDKSystemInitMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("init"),
      agents: array(stringSchema()).optional(),
      apiKeySource: ApiKeySourceSchema(),
      startup_timing: record(stringSchema(), unknown())
        .optional()
        .describe(
          "@internal Cold-start telemetry for hosted (CCR) sessions: named startup phases and resume-hydration counters (StartupTiming in src/utils/startupTiming.ts). Absent elsewhere.",
        ),
      betas: array(stringSchema()).optional(),
      claude_code_version: stringSchema(),
      cwd: stringSchema(),
      tools: array(stringSchema()),
      mcp_servers: array(
        objectSchema({
          name: stringSchema(),
          status: stringSchema(),
          source: stringSchema()
            .optional()
            .describe(
              "Where the server definition came from \u2014 same values as McpServerStatus.source (sdk | plugin | a config scope). Absent on CLIs that predate the field.",
            ),
        }),
      ),
      model: stringSchema(),
      permissionMode: PermissionModeSchema(),
      slash_commands: array(stringSchema()),
      terminal_slash_commands: array(stringSchema())
        .optional()
        .describe(
          "Subset of slash_commands whose UX is bound to the local terminal (e.g. exit, statusline). Phone/remote UIs should hide these from command menus; desktop surfaces may keep them. Present only when non-empty; absent on CLIs that predate the field, and on sessions where no advertised command carries the tag.",
        ),
      output_style: stringSchema(),
      skills: array(stringSchema()),
      plugins: array(
        objectSchema({
          name: stringSchema(),
          path: stringSchema(),
          source: stringSchema()
            .optional()
            .describe(
              '@internal Plugin source identifier in "name\\@marketplace" format. Sentinels: "name\\@inline" for --plugin-dir, "name\\@skills-dir" for .claude/skills plugins, "name\\@synced" for plugins synced from claude.ai, "name\\@builtin" for built-in plugins.',
            ),
          version: stringSchema().optional().describe(PLUGIN_VERSION_DESCRIPTION),
        }),
      ),
      plugin_errors: array(
        objectSchema({
          plugin: stringSchema(),
          type: stringSchema(),
          message: stringSchema(),
          path: stringSchema()
            .optional()
            .describe(
              "Present only when a --plugin-dir, SDK `plugins` or synced directory entry did not load at all: the path of that entry, resolved against the cwd (for a directory, the value its `plugins[]` row would have carried; for a .zip, the archive; a --plugin-url entry carries none). `plugin` is then the positional `inline[N]` / `synced[N]` tag, so a host that mounts several directories pairs the error to its own by this path.",
            ),
        }),
      )
        .optional()
        .describe(
          "Plugin load-time errors. A plugin that did not load (an unmet dependency, a --plugin-dir entry that failed) is absent from `plugins[]`; a plugin that loaded without one of its components keeps its row and gets an entry here too. `plugin` is `name@marketplace`, or the positional `inline[N]` / `synced[N]` tag for a directory entry that failed before it had a name; `type` is a category from an open set (path-not-found, generic-error, manifest-validation-error, dependency-unsatisfied, hook-load-failed, \u2026) \u2014 treat a value you do not recognize as a generic failure; `message` is display text. The key is omitted when there are no errors; CI can fail on `(plugin_errors?.length ?? 0) > 0`. A session whose frames are persisted server-side (a Remote Control worker) always omits this key \u2014 plugin diagnostics stay in the local log there, so an omitted key does not assert a clean load.",
        ),
      plugin_warnings: array(
        objectSchema({
          plugin: stringSchema(),
          type: stringSchema(),
          message: stringSchema(),
        }),
      )
        .optional()
        .describe(
          "@internal Plugin authoring feedback (e.g., a default folder shadowed by a manifest key). When `plugin` matches an entry in `plugins[]`, that plugin loaded and the warning is advisory; warnings with a synthetic `plugin` source (no matching `plugins[]` entry, e.g. workspace-level suppression notices) describe content that did NOT load. The key is omitted when there are no warnings. On connections that persist frames server-side (the local bridge-worker lane) this key is always omitted \u2014 plugin diagnostics stay in the local log, so an omitted key there does NOT assert a clean load.",
        ),
      mcp_server_errors: array(
        objectSchema({
          name: stringSchema(),
          type: stringSchema(),
          message: stringSchema(),
        }),
      )
        .optional()
        .describe(
          "@internal MCP server config entries from --mcp-config that failed validation and were skipped (e.g. a `url` entry with no `type`). Affected servers are absent from `mcp_servers[]`. `type` is a stable category from an open set \u2014 currently unknown_type, url_missing_type, invalid_config, reserved_name, or (Remote Control child only) bridge_carrier_foreign_entry, bridge_carrier_not_http, bridge_carrier_url_mismatch, bridge_carrier_no_ingress_origin, bridge_carrier_no_session_id; treat values you do not recognize as a generic skip. The key is omitted when there are no errors; CI can fail on `(mcp_server_errors?.length ?? 0) > 0`. On connections that persist frames server-side (the local bridge-worker lane) this key is always omitted \u2014 the skipped-entry detail stays in the local log, so an omitted key there does NOT assert every entry validated.",
        ),
      fast_mode_state: FastModeStateSchema().optional(),
      fast_mode_disabled_reason: FastModeBlockedReasonSchema().optional(),
      footer_indicator: FooterIndicatorSchema()
        .optional()
        .describe(
          `@internal The terminal's configured "\u25C6 <text>" footer pill \u2014 see SDKFooterIndicator. Absent when nothing is configured.`,
        ),
      effort: _enum(["low", "medium", "high", "xhigh", "max"])
        .nullable()
        .optional()
        .describe(
          "The effort level set for the session's next message \u2014 after env overrides, session state, org caps and model-support downgrades; the same value get_settings reports as applied.effort. null when no effort parameter will be sent (a model without effort, CLAUDE_CODE_EFFORT_LEVEL=unset, or an internal numeric budget). Present on Remote Control bridge init frames (terminal- and Desktop/VS Code-hosted sessions); absent on hosts that do not publish it and on CLIs that predate the field. Re-emitted inits carry the current value \u2014 the newest frame wins.",
        ),
      per_turn_effort_active: booleanSchema()
        .optional()
        .describe(
          "@internal Whether per-turn effort is active for this frame's `model`. true: an effort change keeps the prompt cache, because the effort is sent inside the conversation, at the turn where it changes. false: the effort is sent only as the top-level parameter, so a change rewrites the cached prefix. Mid-session the CLI reports only a change to false (system/per_turn_effort_changed), and true comes only from an init. After a fresh process, or after the conversation's refusals are cleared (for example by /clear or a compaction), a true is provisional: a refusal on any later request sends system/per_turn_effort_changed before the retry, so a host keeps listening for it all session. Absent means unknown. Sent by the stream-json (Agent SDK) host.",
        ),
      ultrathink_available: booleanSchema()
        .optional()
        .describe(
          "@internal True when typing `ultrathink` runs the turn at xhigh effort on this frame's `model`, and when the session is already at xhigh or max, where the turn stays as it is. The terminal colors the word by this rule, and a host colors it only while this is true. After system/per_turn_effort_changed, treat this as false until the next init. Absent means unknown: a host with no answer yet colors nothing. The same answer as get_settings' applied.ultrathinkAvailable. Sent by the stream-json (Agent SDK) host.",
        ),
      view_mode: _enum(["focus", "default"])
        .optional()
        .describe(
          "Whether the session's transcript is in focus view ('focus': the model is told the user sees only its final message per turn, so clients may collapse each turn to the prompt and the final response; 'default' otherwise). Toggled by /focus, including over Remote Control. Present on Remote Control bridge init frames and on the per-turn init of headless stream-json runs (`claude rc` workers, -p, the SDK's subprocess transport); absent on hosts that do not publish it (the in-process engine) and on CLIs that predate the field. Re-emitted inits carry the current value \u2014 the newest frame wins.",
        ),
      capabilities: array(stringSchema())
        .optional()
        .describe(
          "Protocol capabilities this CLI supports, so SDK consumers can feature-detect instead of version-sniffing. Open set \u2014 ignore unknown values; check each capability for exactly the behavior you use. 'interrupt_receipt_v1' = the interrupt control_response success payload carries still_queued (uuids of async user messages that survive the interrupt). 'interrupt_cancel_queued_v1' = the interrupt control_request honors cancel_queued:true (queued and pending-dispatch commands are cancelled alongside the abort, listed on the response's cancelled field; still_queued is then empty \u2014 including any uuid that was mid-fold at the interrupt instant, since this request also aborts and the fold never delivers it \u2014 except that a client driving a hosted session lists there what it can no longer recall: a send already in flight to that session, or the first prompt the session was created with). 'queued_notifications' = the CLI accepts inbound queued_notification stream messages and drains them via ReadNotifications (the cloud session backend reads this from the persisted init event to decide whether it may send them). 'ask_user_question_unanswered_v1' = an AskUserQuestion answer may set annotations[question].unanswered ('skipped' | 'replied_in_chat' | 'dismissed'), which the tool result echoes; send it only to a session that advertises this, since an older CLI on a strict host refuses the whole answer. A strict host also refuses an answer with a value outside these three; a new value will come with a new capability. Absent on older CLIs.",
        ),
      analytics_disabled: booleanSchema()
        .optional()
        .describe(
          "@internal True when the CLI has analytics/telemetry disabled (privacy level, DO_NOT_TRACK, or 3P provider). IDE clients use this to hide per-message thumbs feedback UI since the rating event would be a no-op.",
        ),
      product_feedback_disabled: booleanSchema()
        .optional()
        .describe(
          "@internal True when the org's allow_product_feedback policy is false (ZDR/HIPAA). IDE clients use this to hide feedback surfaces (thumbs, session survey) whose events the CLI would drop at the proxy boundary anyway.",
        ),
      memory_paths: objectSchema({
        auto: stringSchema().optional(),
        team: stringSchema().optional(),
      })
        .optional()
        .describe(
          "@internal Absolute directory paths for the auto-memory and team-memory stores. Lets SDK renderers classify Read/Write/Edit tool calls on these paths as memory operations without re-implementing CLI path detection.",
        ),
      scratchpad_path: stringSchema()
        .optional()
        .describe(
          "@internal Absolute path of this session's scratchpad directory, for clients that read files from the session. Omitted when the scratchpad is disabled, and from the redacted init sent over the Remote Control bridge and by the hosted worker.",
        ),
      original_cwd: stringSchema()
        .optional()
        .describe(
          "@internal Absolute path of the folder the session's file permission checks are anchored at, for clients that read files from the session. Unlike cwd it does not follow the shell: it moves only on /cd, on entering or leaving a worktree, and on a session restore. Omitted on the lanes that redact system/init's local paths: the init sent over the Remote Control bridge and by the claude-code-server tenant worker. Omitted too in a session that has no directory, where cwd is the empty string, and, on every lane, for an organization that is under HIPAA or whose policy the session fetches but does not hold.",
        ),
      additional_directories: array(stringSchema())
        .optional()
        .describe(
          "@internal Absolute paths of the folders added to the session (--add-dir, the SDK additionalDirectories option, settings, a grant or a host's request made mid-session), in no particular order; an empty array when there are none. Re-read for every init message. Left out: a folder that only a settings file the repository delivers adds (.claude/settings.json, and .claude/settings.local.json unless git is known not to track it), so that a branch cannot widen what a client fetches; and an entry not stored as an absolute path. Entries are not all symlink-resolved, and one can be the symlinked spelling of the start folder. It grants nothing: the CLI's own check decides every read. Absent means not told, not none: omitted on the lanes that redact system/init's local paths and for an organization that is under HIPAA or whose policy the session fetches but does not hold, like original_cwd, and by a host that has not wired it. A session that has no directory still sends it.",
        ),
      worker_epoch: numberSchema()
        .int()
        .min(1)
        .optional()
        .describe(
          "@internal This cloud worker's life (CLAUDE_CODE_WORKER_EPOCH): a new number each time the session's worker is started. A claude --cloud client that latched an acknowledged epoch (remote_tools_announce) re-registers only when this differs. Emitted on workers where the account's remote-tools gate (tengu_violin_wood) is on, and by every claude-code-server worker whatever that gate reads; absent outside cloud workers and on CLIs that predate the field.",
        ),
      powershell_path: stringSchema()
        .nullable()
        .optional()
        .describe(
          "@internal Windows only: the absolute path of the PowerShell binary this session runs PowerShell commands with (PowerShell 7 when installed, including Microsoft Store installs, else Windows PowerShell 5.1), or null when none was found. Lets a desktop host open its own terminal with the same shell instead of re-implementing the detection. Present on stream-json (Agent SDK) init frames; absent on other platforms, wherever the init ambient is redacted (the Remote Control bridge), and on CLIs that predate the field.",
        ),
      cloud_session: attachedDeviceSchema()
        .optional()
        .describe(
          "@internal Only on init frames written by the headless stream-json client of a cloud-hosted session (agent loop in the cloud container; this machine may be bound to it as a device): a snapshot per frame, absent in every other mode; no user, assistant or result frame precedes the first such init (informational system frames may; so may a worker's result that no init preceded, after all that was held ahead of it; on a re-attach so may frames of a turn already in progress, other clients' prompts, and the echo of this host's own prompt when the session already had it or it joins a turn in progress). `id` is the cloud session id, always in its `session_\u2026` spelling (the producer normalizes the service's `cse_\u2026` spelling of the same session); hosts store it and pass it back verbatim to re-attach. The frame-level `session_id` is instead the cloud worker's id, a uuidv5 of the session id in its `cse_` form: the same for the life of the cloud session across worker restarts and re-attaches until a /clear in the session, and passed through by the client unchanged. When `device.status` is `unbound`, `reason` is one of the client's unbound-reason keys and `message` its phrase: one line, at most 200 characters, no ANSI or trailing newline, worded to follow `Laptop tools unavailable: `. `directory_sync`: see docs/cloud-session-block.md. `not_applied`, when present, lists what the host passed that this session does not apply \u2014 `name` is a flag as `--flag`, a key inside --settings / --managed-settings as `settings.<key>` / `managed-settings.<key>`, or a field of the opening initialize as `initialize.<field>` (at most 40, lost first, each one line of about 64 characters at most); `kind` says what it costs: `lost` (the session does without something this invocation asked for \u2014 the informational warning names these), `kept` (an attach: the existing session keeps what it was created with) or `preference` (a display or host preference nobody would miss \u2014 the informational notice names these two), so a host may show them itself once or never; absent when nothing was left unapplied. `host`, when present, is what this machine announces as to the session: `handle` is the name the model addresses it by (and a client shows), `working_dir` the absolute directory served calls run in (that machine's separators), `platform` its platform word, `cli_version` its Claude Code version; each one line of at most 200 characters; present once this machine has built an announce for the session (bound, with something or an explicit nothing to serve), absent otherwise and on clients that predate it. `serving`, when present, says whether this machine serves its tools (Bash, Read, Write, Edit) to the session over the session's channel: `state` is `pending` while bound and about to announce, `on` once the session holds this machine's tools, `off` when it serves nothing, `revoked` when it stopped mid-session; `reason` (present when `state` is not `on` and the cause is known) is one of the client's serving-off keys \u2014 `not_bound` (see `device.reason`), `external_build`, `windows`, `muted` (Anthropic's emergency switch turned serving off; it comes back when the switch does), `switch_off`, `launched_from_home`, `channel_off`, `egress`, `policy_org` (the organization does not allow remote sessions), `flag_off`, `flag_stale`, `announce_refused`, `announce_unverified`, `superseded` \u2014 an open set: render an unrecognized value as a generic not-serving state; `policy` is the serving policy in effect (`parity`, or the stricter `interim` fallback); `channel` is `session`, or `bridge_only` when the session channel is switched off on this machine and served calls (if any) ride only the legacy device bridge, whose state this block does not describe. Absent on clients that predate it: feature-detect the key. `connection`, when present, is this client's stream to the session: `connecting` before it first connects, `live` while it is up, `reconnecting` while it is lost and being re-dialled (this machine is offline to the session meanwhile). `calls`, when present (once this machine has served a call this attach), is what it serves right now and how its last calls ended, by id and tool name only \u2014 never a call's input or output: `live` lists, oldest first, each call admitted here and not yet ended, `state` `running` while this machine executes it or `asked` while it waits on the session's approval (`ask_id` names the question; `since` is when it entered that state and `lapses_at` about when the session gives an unanswered question up, both epoch milliseconds on this machine's clock \u2014 the session's own timer decides); `recent` lists, newest last, at most 20 calls that ended here, `ended` being `completed`, `denied` (the session said no), `withdrawn` (the session took the question back unanswered \u2014 its patience ran out or the turn moved on), `refused` or `failed`, with `code` the result's disposition, refusal or failure word when it has one, and `at` when. `notices`, when present, is what this machine's serving has told the person during this attach that a host should show, at most 8: `key` is the notice's stable name (an open set \u2014 `device-mcp-consent`: this machine has MCP servers a cloud session could use and none are offered until the person allows it; `device-mcp-reconsent`: a server it offers changed the tools it lists and is withheld until re-approved, or this machine's record of what its servers list could not be read and none are offered \u2014 `text` says which; `device-mcp-policy`: a deny list in this machine's Claude Code settings lists remote-devices, so none of its MCP servers are offered; `device-mcp-dropped`; `served-hooks-not-run`; `served-hook-errors`; `served-bash-launched-from-home`; `served-tools-muted` / `served-tools-unmuted`; `announce_unverified`) and `text` its one line (at most 200 characters, no ANSI or newline) \u2014 this machine's own words with names from its own configuration, to be shown as plain text; written only by a serve-only helper (`--attach-serve`) and absent when nothing was said. `calls`, `connection` and `notices` are pushed between inits on `cloud_session_delta` frames. `client_version` rises only on a breaking change to this block \u2014 warn and continue on a higher value, never refuse; `not_applied[].kind`, `serving.state`, `connection`, `calls[].state` / `ended` and reason keys may gain values without it changing, so treat unrecognized values neutrally (an unrecognized `serving.state` as not serving \u2014 this schema itself parses an unrecognized `serving.state` as `off`, `policy` as `interim`, `channel` as `bridge_only`).",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "Session metadata the CLI emits at the start of each turn, normally ahead of every other message of that turn: session_id, model, working directory, tools, MCP servers, slash commands, permission mode, and the capabilities list for feature detection.",
    ),
  );
  SDKStreamEventMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("stream_event"),
      event: StreamEventSchema(),
      parent_tool_use_id: stringSchema().nullable(),
      uuid: _(),
      session_id: stringSchema(),
      ttft_ms: numberSchema().int().optional(),
      thinking_display: stringSchema()
        .optional()
        .describe(
          "@internal The thinking.display Claude Code put in the API request body for the response this event belongs to. If anything rewrites the request on its way to the API, this value still states what Claude Code sent, not what the API received. Two responses of one turn can differ. Set on `message_start`, on a thinking block's `content_block_start` and on `thinking_delta` events when the body had a display; absent on every other event, on Remote Control (interactive terminal) sessions and from older producers. An event that the API did not send as it stands can lack the key. The key states which display the text was requested with, and nothing about how to show it. An absent key states nothing: neither which display was requested, nor that none was.",
        ),
      api_message_id: stringSchema()
        .optional()
        .describe(
          "@internal The API's id (`msg_\u2026`) of the response this event belongs to: `event.message.id` on its `message_start`, `message.id` on its assistant messages. Not a message `uuid`. Set on every event from a response's `message_start` to its `message_stop`, so that a consumer that missed the `message_start` can still tell responses apart. Two responses can share an id, as when a `message_start` is replayed; the key does not tell those apart. Absent on pings, when the `message_start` had no id or an empty one, on Remote Control (interactive terminal) sessions and from older producers. The events that Claude Code produces itself to close a response cut short carry it too. Events that a plugin produced or rewrote, and those that Claude Code builds in their place or to close them, can lack it. An absent key states nothing about which response the event belongs to.",
        ),
      abandoned_blocks: objectSchema({
        api_message_id: stringSchema().describe(
          "The API's id (`msg_\u2026`) of the response that was cut short: `event.message.id` on its `message_start`, `message.id` on its assistant messages. Not a message `uuid`. Should two responses share an id, the one meant is the one this `message_stop` closes.",
        ),
        from_block_index: numberSchema()
          .int()
          .nonnegative()
          .describe(
            "Blocks of the response at this index and above have no assistant message and never will. It is an `event.index` as on the response's `content_block_*` events, not a count of assistant messages. 0 means the whole response. Can be higher than every index the consumer has seen, and then there is nothing to remove.",
          ),
      })
        .optional()
        .describe(
          "@internal Set on a `message_stop` that Claude Code produced itself, after it stopped reading the response that `message_stop` closes because the API's stream failed, stalled or ended early, or because the turn was interrupted. That response's content blocks at index `from_block_index` and above have no assistant message and will never get one, so a consumer that drew or stored them from stream events, and holds no assistant message for them, can remove them, even a block that has had its `content_block_stop`. Nothing is stated about lower blocks: some may have no assistant message, and what follows may repeat or replace them. What follows can be, among others, a retry (a new `message_start`), the same request without streaming (assistant messages under another id, with no `message_start` before them), an assistant message that reports the error, or nothing. A plugin can add content blocks of its own to a response, and those do get assistant messages under the same id, emitted before this event. Absent on every other `message_stop` (the API's own, one produced for a response that had arrived whole, one where Claude Code cannot be sure), on Remote Control (interactive terminal) sessions and from older producers. An absent key states nothing: a block with no assistant message yet may still get one.",
        ),
      text_runs_joined: literal(true)
        .optional()
        .describe(
          "@internal Set on the `message_start` of a response when CLAUDE_CODE_WEBSEARCH_CITATIONS is on in a non-interactive session. Each run of adjacent text blocks of that response gets one assistant message with one text block, which holds the joined text. Each entry of its `citations`, except a `web_search_result_location`, has `span_start` and `span_end`: the place of the cited block in the joined text, in Unicode code points, end exclusive. The `content_block_*` events still show each block of the run by its own index. A response that came without streaming has no `message_start`, and it is joined too.",
        ),
      user_message_uuid: stringSchema()
        .optional()
        .describe(
          "Client uuid of the user message this turn is answering (submitMessage options.uuid), stamped on a non-ping stream event each time that send changes: the turn's FIRST non-ping stream event (normally the frame that triggers the turn's initial ack), and, for a turn started by a synthetic (meta) prompt, the first non-ping stream event after each queued user message folded in mid-turn takes the echo over (see SDKAssistantMessage.user_message_uuid for the rule) \u2014 so a consumer can bind the reply stream to the send it answers without waiting for the result. A turn started by a typed prompt stamps only its first non-ping stream event; independently, its first complete assistant message is stamped as well (see SDKAssistantMessage.user_message_uuid), so the same uuid may appear on both. Absent on every other stream event of the turn, on turns that neither had a client uuid nor folded a user message in, and from older producers.",
        ),
      user_message_uuids: array(stringSchema())
        .optional()
        .describe(
          "Client uuids of every user message whose prompt this turn has consumed so far, in consumption order \u2014 all members of a prompt batch the host merged into this one turn (several messages sent close together run as one turn whose user_message_uuid is the LAST member's), then any user message folded into the turn before this frame \u2014 so a consumer that sent any of them can bind this reply to its own send by finding its uuid anywhere in the list. Always contains user_message_uuid; at most 64 entries. Present exactly when user_message_uuid is, on the same frames; absent from older producers (fall back to user_message_uuid).",
        ),
      resume_reason: stringSchema()
        .optional()
        .describe(
          "Why this frame's turn continues one that a worker restart interrupted. Such a turn is the automatic re-run of the interrupted turn (CLAUDE_CODE_RESUME_INTERRUPTED_TURN), or one that goes on from the answer to the permission prompt the new worker took over, or from that turn's tool calls still in flight. The value is the host's CLAUDE_CODE_RESUME_REASON when it set one (host_draining, checkpoint_restore, container_recreated, \u2026), else 'interrupted_turn'. Stamped on the same reply frames as user_message_uuid (which on such a turn names the interrupted turn's own last user prompt), so a consumer can tell its first reply from the interrupted attempt's. Absent on every other turn (also one that goes on from the answer to any other permission prompt), on thinking_tokens frames, and from older producers.",
        ),
    }).describe(
      "An incremental streaming event for the assistant message being generated, emitted only when partial messages are requested (--include-partial-messages). The complete assistant message still follows as its own message.",
    ),
  );
  SDKSystemCompactBoundaryMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("compact_boundary"),
      compact_metadata: objectSchema({
        trigger: _enum(["manual", "auto"]),
        pre_tokens: numberSchema().int(),
        post_tokens: numberSchema().int().optional(),
        cumulative_dropped_tokens: numberSchema()
          .int()
          .optional()
          .describe(
            "@internal Running total of context tokens compaction has removed so far, across this and every earlier compaction. " +
              "Each contribution is approximately pre_tokens \u2212 post_tokens.",
          ),
        duration_ms: numberSchema().int().optional(),
        user_context: stringSchema()
          .optional()
          .describe('@internal User-provided focus text for manual "summarize from here".'),
        messages_summarized: numberSchema()
          .int()
          .optional()
          .describe("@internal Count of messages the compaction summarized."),
        precomputed: booleanSchema()
          .optional()
          .describe(
            "@internal The summary was generated in the background at the autocompact threshold and swapped in when prompt-too-long fired; duration_ms measures user-wait from that point.",
          ),
        pre_compact_discovered_tools: array(stringSchema())
          .optional()
          .describe(
            "@internal Deferred-tool names discovered before this compaction. extractDiscoveredToolNames reads this back on the next turn so the tool-schema filter keeps including them after the tool_reference-carrying messages were summarized away.",
          ),
        pre_compact_artifact_read_versions: array(
          objectSchema({
            slug: stringSchema(),
            ver: stringSchema(),
          }),
        )
          .optional()
          .describe(
            "@internal The artifact versions the conversation held before this compaction (slug is the artifact id, ver the version read or published), most recently changed first; empty when it held none. A resumed session replays these so it can update those artifacts without reading them again.",
          ),
        preserved_segment: objectSchema({
          head_uuid: _(),
          anchor_uuid: _(),
          tail_uuid: _(),
        })
          .optional()
          .describe(
            "Relink info for messagesToKeep. Loaders splice the preserved segment at anchor_uuid (summary for suffix-preserving, boundary for prefix-preserving partial compact) so resume includes preserved content. Unset when compaction summarizes everything (no messagesToKeep).",
          ),
        preserved_messages: objectSchema({
          anchor_uuid: _(),
          uuids: array(_()),
          all_uuids: array(_())
            .optional()
            .describe(
              "@internal Unfiltered messagesToKeep UUIDs. uuids is the on-disk subset (messages recordTranscript writes); all_uuids is the in-memory superset including non-loggable messages an in-process surface still holds for the next turn's API input. Absent from older producers.",
            ),
        })
          .optional()
          .describe(
            "Ordered messagesToKeep UUIDs. Supersedes preserved_segment \u2014 " +
              "readers look up each UUID directly and relink uuids[i] to uuids[i-1] (uuids[0] to anchor_uuid) instead of walking the parentUuid chain. Unset when compaction summarizes everything.",
          ),
      }),
      logical_parent_uuid: _()
        .nullable()
        .optional()
        .describe(
          "@internal uuid of the last pre-compact message \u2014 the backpointer " +
            "forkSession follows across the compaction break. Distinct from the session-file chain parent (which is the post-compact summary). Absent from older producers.",
        ),
      uuid: _(),
      session_id: stringSchema(),
      historical: booleanSchema()
        .optional()
        .describe(
          "@internal Replayed history rather than a live message (stamped by the Remote Control bridge when it flushes history to the session server).",
        ),
    }),
  );
  SDKSystemStatusMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("status"),
      status: CompactStatusSchema(),
      permissionMode: PermissionModeSchema().optional(),
      compact_result: _enum(["success", "failed"]).optional(),
      compact_error: stringSchema().optional(),
      compact_output_chars: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal On the 'compacting' statuses of an automatic compaction (absent on a typed /compact): characters of the summary streamed so far (text and tool-input deltas, not thinking). Returns to 0 at each new attempt at the summary (a request retried inside an attempt adds to what the dropped try streamed), and stays 0 while waiting for a summary written in the background. A rising count shows that the summary is being written; a still one proves nothing, and it is not a share of the final length, which is not known in advance.",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }),
  );
  SDKSystemPostTurnSummaryMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("post_turn_summary"),
      summarizes_uuid: stringSchema(),
      status_category: stringSchema(),
      status_detail: stringSchema(),
      needs_action: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Background post-turn summary emitted after each assistant turn. summarizes_uuid points to the assistant message this summarizes.",
    ),
  );
  SDKSystemTaskSummaryMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("task_summary"),
      detail: stringSchema().nullable(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Mid-turn progress line from the debounced classifier. Mirrors external_metadata.task_summary so non-CCR consumers (desktop LocalSessionManager) see the same live phrase. detail is null on the idle clear.",
    ),
  );
  SDKSystemSessionMetadataMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("session_metadata"),
      metadata: objectSchema({
        artifacts: array(
          objectSchema({
            url: stringSchema(),
            title: stringSchema().optional(),
            favicon: stringSchema().optional(),
            kind: literal("frame"),
            updated_at: stringSchema(),
          }),
        )
          .nullable()
          .optional(),
      }),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal The same external_metadata patch a cloud worker sends the session server, for the keys a local host needs: today `artifacts` (the session's published-artifact list, whole list on each change, null once empty). Lets an SDK host keep the per-session summary a cloud session gets, without reading transcript rows.",
    ),
  );
  SDKSystemInformationalMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("informational"),
      content: stringSchema(),
      level: _enum(["info", "notice", "suggestion", "warning"]).describe(
        "Render level. 'info' shows only in transcript mode; 'notice' renders in inactive gray; 'suggestion' and 'warning' are more prominent.",
      ),
      tool_use_id: stringSchema().optional().describe("Dedupes progress messages for the same tool use."),
      prevent_continuation: booleanSchema()
        .optional()
        .describe("When true, execution stops after this message (e.g. a Stop hook denied continuation)."),
      tag: stringSchema()
        .optional()
        .describe(
          "Opaque feature tag on a line a host may treat specially; absent on ordinary lines. Hosts ignore values they do not know.",
        ),
      prompt_submit_outcome: objectSchema({
        kind: _enum(PROMPT_HOOK_ENDINGS).optional().catch(undefined),
        no_verdict_kind: _enum(PROMPT_NO_VERDICT_KINDS)
          .optional()
          .catch(undefined)
          .describe(
            "Sent with kind 'no_verdict', and says why: 'remote_run_failed' (the hook runs on another machine, and the run failed or gave no usable answer), 'remote_run_timed_out' (the wait for that run timed out; the hook may never have been sent), 'interrupted' (the turn was aborted during that wait), 'remote_runner_refused' (Claude Code does not send this hook to that machine; a retry does not help), 'unsupported_in_cloud_session' (a cloud session cannot run this type of hook), 'output_distrusted' (Claude Code could not prove that it read all of the hook's output), 'callback_timed_out' (a callback hook did not answer in time), 'hook_failed' and 'hook_timed_out' (for this hook a failure blocks), 'hooks_never_ran' (an internal fault: the hooks did not run over the submitted text), 'personal_config_refused' (the session restricts personal config, and part of the person's own settings did not load or is off), 'rewrite_unplaceable' (a plugin's code module changed the prompt's text, and Claude Code has no place to put the change).",
          ),
        prompt_kept: booleanSchema(),
        reason: stringSchema().optional(),
      })
        .optional()
        .catch(undefined)
        .describe(
          "@internal Present on the line that ends a submitted prompt before a model call. It says how the prompt ended, so a host can write its own message or count endings and does not match `content`. kind: 'blocked_by_hook' (a hook answered with a block), 'stopped_by_hook' (a hook answered continue:false), 'dropped_by_hook' (a plugin's code module dropped the prompt), 'not_passed_on' (a plugin's code module answered and did not pass the prompt on), 'no_verdict' (no hook gave a verdict, and Claude Code ended the prompt itself). prompt_kept: true when the prompt stays in the conversation, where the model reads it on the next turn. Do not infer it from kind. reason: the hook's text as Claude Code got it, with nothing added here; a model writes it for a prompt or agent hook. It is never sent with no_verdict. It is absent when Claude Code got no text, and for a plugin's code module that blocks on the UserPromptSubmit hook event. ANSI codes are removed, control and invisible characters are replaced, line feeds stay, and long text is cut. It is untrusted and can quote the prompt, so render it as plain text. A cloud session can run the hook on another machine: its tool container, where any program can write reason, or the person's own machine. reason is then what that machine sent, for a block and for a stop. The person's own machine puts a label before the stderr of an exit 2, or before 'No stderr output' when there is none. Either machine makes the block itself when it could not read all of the hook's output, and the person's own machine can do so when its timeout fires. Each reads 'blocked_by_hook', with that machine's sentence as reason. Claude Code's own block for an SDK host that reconnected before its hook answered reads the same way, with Claude Code's sentence as reason. New values can appear: treat an unknown value as absent, and ignore reason beside an unknown kind. A slash command that runs as a fork does not send this key when a hook ends it. A follow-up that a hook blocks while a turn runs carries this key too, so read it as the end of a turn only when the next result has num_turns 0.",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "Generic text banner emitted by the loop \u2014 non-error status lines, hook feedback (e.g. a UserPromptSubmit hook's block reason), slash-command output. Hosts render `content` as plaintext at the given level.",
    ),
  );
  SDKSystemPermissionRetryMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("permission_retry"),
      content: stringSchema(),
      commands: array(stringSchema()).describe("Display names of the commands that were allowed."),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Emitted when tool execution retries after a permission-mode change allowed previously-denied commands. REPL renders a 'retrying with <commands>' banner. From internal SystemMessage 'permission_retry'.",
    ),
  );
  SDKSystemStopHookSummaryMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("stop_hook_summary"),
      hook_count: numberSchema().int(),
      hook_infos: array(
        objectSchema({
          command: stringSchema(),
          prompt_text: stringSchema().optional(),
          duration_ms: numberSchema().int().optional(),
        }),
      ),
      hook_errors: array(stringSchema()),
      hook_additional_context: array(stringSchema())
        .optional()
        .describe(
          "Non-error feedback from hookSpecificOutput.additionalContext \u2014 kept separate from hook_errors so the sanctioned feedback channel is not labeled an error. Absent in sessions persisted before this field existed.",
        ),
      prevented_continuation: booleanSchema(),
      stop_reason: stringSchema().optional(),
      has_output: booleanSchema(),
      level: _enum(["info", "notice", "suggestion", "warning"]),
      tool_use_id: stringSchema().optional(),
      hook_label: stringSchema().optional(),
      total_duration_ms: numberSchema().int().optional(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Summary of Stop/SubagentStop hook execution at turn end \u2014 which hooks ran, their output, and whether any prevented continuation. From internal SystemMessage 'stop_hook_summary'.",
    ),
  );
  SDKSystemMemorySavedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("memory_saved"),
      written_paths: array(stringSchema()),
      team_count: numberSchema().int().optional(),
      verb: stringSchema().optional().describe('Renders as "<verb> N memories". Defaults to "Saved".'),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Confirmation that the memory subsystem wrote to the listed paths. REPL renders a '<verb> N memories' banner. From internal SystemMessage 'memory_saved'.",
    ),
  );
  SDKSystemAgentsKilledMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("agents_killed"),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Emitted when background agents are terminated (e.g. on interrupt). REPL renders an 'agents killed' banner. From internal SystemMessage 'agents_killed'.",
    ),
  );
  SDKSystemInstructionSizeWarningMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("instruction_size_warning"),
      total_chars: numberSchema()
        .int()
        .describe(
          "Combined length, in characters, of the instruction files in the session prompt: CLAUDE.md files, rules files and the files they import. Always over total_limit_chars.",
        ),
      total_limit_chars: numberSchema()
        .int()
        .describe("The recommended limit for total_chars on the turn's model, in characters."),
      file_count: numberSchema()
        .int()
        .describe(
          "Number of files counted in total_chars. When it is 1, word the warning for a single file rather than a total.",
        ),
      largest_chars: numberSchema()
        .int()
        .optional()
        .describe(
          "Length of the largest file, in characters. Present only when the warning should mention it: there are several files and this one by itself is over total_limit_chars.",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal The session's instruction files add up to more than the recommended limit. Numbers only: the host words the warning in the person's language. Sent to Claude Desktop's Code tab alone, at most once per process, on a conversation's first turn after system/init; never stored in the transcript. Safe to ignore: a host that does not recognize this subtype shows nothing.",
    ),
  );
});
//@ chunk-bwbq4xvm.js:412402-501647 placement
/**
 * SDK 系统消息全集 schema（away_summary、thinking、compact_boundary、status、hook_*、task_*、ui_* 等数十种 subtype）与 SDKMessage 联合。
 */
var SDKSystemAwaySummaryMessageSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SDKSystemThinkingMessageSchema;
var SDKTranscriptMirrorMessageSchema;
var SDKSystemMirrorErrorMessageSchema;
var SDKSystemApiRetryMessageSchema;
var SDKSystemControlRequestProgressMessageSchema;
var SDKSystemModelRefusalFallbackMessageSchema;
var SDKSystemModelRefusalNoFallbackMessageSchema;
var SDKSystemModelFallbackMessageSchema;
var SDKSystemModelConsentFallbackMessageSchema;
var SDKSystemFileSnapshotMessageSchema;
var SDKSystemScheduledTaskFireMessageSchema;
var SDKSystemPeerMessageHoldMessageSchema;
var SDKSystemTurnDurationMessageSchema;
var SDKSystemApiErrorMessageSchema;
var SDKSystemLocalCommandOutputMessageSchema;
var SDKSystemHookStartedMessageSchema;
var SDKSystemHookProgressMessageSchema;
var SDKSystemHookResponseMessageSchema;
var SDKSystemPluginInstallMessageSchema;
var SDKToolProgressMessageSchema;
var SDKAuthStatusMessageSchema;
var SDKSystemFilesPersistedMessageSchema;
var AMBIENT_TASK_DESCRIPTION;
var AWAITED_RESUMED_RUN_DESCRIPTION;
var PARENT_TASK_ID_DESCRIPTION;
var RUN_ID_DESCRIPTION;
var SDKSystemTaskNotificationMessageSchema;
var SDKSystemTaskStartedMessageSchema;
var SDKSystemTaskUpdatedMessageSchema;
var SDKSystemBackgroundTasksChangedMessageSchema;
var SDKSystemFeedbackDraftQueuedMessageSchema;
var SDKSystemSessionStateChangedMessageSchema;
var SDKSystemSessionTitleChangedMessageSchema;
var SDKSystemWorkerShuttingDownMessageSchema;
var SDKSystemInheritedAsksSettledMessageSchema;
var SDKSystemTurnHandoffAvailableMessageSchema;
var SDKSystemUiInvalidateMessageSchema;
var SDKSystemUiLogMessageSchema;
var SDKSystemUiToastMessageSchema;
var SDKSystemUiStatusMessageSchema;
var PANE_ID_RE;
var PaneIdSchema;
var PaneSchema;
var PanesSchema;
var SDKSystemUiPlacedMessageSchema;
var SDKSystemUiPanesMessageSchema;
var SDKSystemUiScrollMessageSchema;
var SDKSystemUiFocusMessageSchema;
var SDKSystemCommandsChangedMessageSchema;
var SDKSystemNotificationMessageSchema;
var SDKSystemTaskProgressMessageSchema;
var SDKSystemThinkingTokensMessageSchema;
var SDKToolUseSummaryMessageSchema;
var SDKSystemMemoryRecallMessageSchema;
var SDKSystemElicitationCompleteMessageSchema;
var SDKSystemPermissionDeniedMessageSchema;
var SDKSystemPermissionCheckStatusMessageSchema;
var SDKPromptSuggestionMessageSchema;
var SDKAttachmentMessageSchema;
var SDKTombstoneMessageSchema;
var SDKConversationResetMessageSchema;
var SDKApiMetricsMessageSchema;
var SDKOsNotificationMessageSchema;
var SDKApplyFlagSettingsMessageSchema;
var SDKCommandLifecycleMessageSchema;
var SDKSystemCodeChangePublishedMessageSchema;
var SDKSystemVcsStateChangedMessageSchema;
var SDKSystemDevIntentMessageSchema;
var SDKSystemTurnPreemptedMessageSchema;
var SDKSystemPerTurnEffortChangedMessageSchema;
var SDKSystemFileAttachmentsMissingMessageSchema;
var SDKSystemCloudSessionDeltaMessageSchema;
var SDKSetExpandedViewMessageSchema;
var SDKActiveGoalMessageSchema;
var SDKAutocompactStateMessageSchema;
var SDKSetInProgressToolUseIdsMessageSchema;
var SDKHintClearsMessageSchema;
var SDKOpenMessageSelectorMessageSchema;
var SDKCompactProgressMessageSchema;
var SDKStreamModeMessageSchema;
var SDKResponseLengthMessageSchema;
var SDKRefusalContinuationMessageSchema;
var SDKSessionInfoSchema;
var SDKMessageSchema;
var FastModeStateSchema;
var FastModeBlockedReasonSchema;
var FooterIndicatorSchema;
deferInit("chunk-bwbq4xvm.js:412402", () => {
  SDKSystemAwaySummaryMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("away_summary"),
      content: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Summary of what happened while the user was away (background tasks completed, notifications accumulated). From internal SystemMessage 'away_summary'.",
    ),
  );
  SDKSystemThinkingMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("thinking"),
      content: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Rendered thinking content (the text itself, not the running token estimate \u2014 that is SDKThinkingTokensMessage). From internal SystemMessage 'thinking'.",
    ),
  );
  SDKTranscriptMirrorMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("transcript_mirror"),
      filePath: stringSchema(),
      entries: array(unknown()),
    }).describe(
      "@internal Emitted after each successful local transcript write. The parent peels these off the stdout stream and batches them to the SessionStore adapter. Not exposed to public SDK consumers.",
    ),
  );
  SDKSystemMirrorErrorMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("mirror_error"),
      error: stringSchema(),
      key: objectSchema({
        projectKey: stringSchema(),
        sessionId: stringSchema(),
        subpath: stringSchema().optional(),
      }),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "Emitted when SessionStore.append() rejects or times out for a transcript-mirror batch after bounded retry (3 attempts with short backoff; timeouts are not retried). The batch is then dropped; this surfaces the failure so consumers are not silent on data loss.",
    ),
  );
  SDKSystemApiRetryMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("api_retry"),
      attempt: numberSchema().int(),
      max_retries: numberSchema().int(),
      retry_delay_ms: numberSchema().int(),
      error_status: numberSchema().int().nullable(),
      error: ApiErrorCodeSchema(),
      no_response: objectSchema({
        waited_ms: numberSchema().int(),
        retry_wait_ms: numberSchema().int(),
      })
        .optional()
        .describe(
          "Present only when the API sent no response headers within the first-byte window (CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS): waited_ms is how long the failed attempt waited for headers, retry_wait_ms how long the retry will wait for them. For this cause max_retries is its own cap (normally one retry), not the session budget.",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "Emitted when an API request fails with a retryable error and will be retried after a delay. error_status is null for connection errors (e.g. timeouts) that had no HTTP response.",
    ),
  );
  SDKSystemControlRequestProgressMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("control_request_progress"),
      request_id: stringSchema().describe(
        "request_id of the in-flight control_request this progress belongs to.",
      ),
      status: _enum(["started", "api_retry"]),
      attempt: numberSchema().int().optional(),
      max_retries: numberSchema().int().optional(),
      retry_delay_ms: numberSchema().int().optional(),
      error_status: numberSchema().int().nullable().optional(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "Progress for a long-running client-originated control_request (currently only side_question), correlated by request_id. status 'started' means the worker accepted the request and launched the work; 'api_retry' carries the same retry counters as SDKAPIRetryMessage and is present only for that status.",
    ),
  );
  SDKSystemModelRefusalFallbackMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("model_refusal_fallback"),
      trigger: literal("refusal"),
      direction: _enum(["retry", "revert", "sticky"]),
      scope: _enum(["session", "local"])
        .optional()
        .describe(
          "'session': the main thread fell back and the session model is swapped. 'local': a subagent / side-question (/btw) / background fork fell back \u2014 only that response came from the fallback model and the session model is unchanged. Absent from older CLIs (treat as 'session').",
        ),
      original_model: stringSchema(),
      fallback_model: stringSchema(),
      request_id: stringSchema().nullable(),
      api_refusal_category: stringSchema()
        .nullable()
        .optional()
        .describe(
          "The refusal category ('cyber', 'bio', \u2026): stop_details.category from the refused API response (client lane), or the fallback block's server-gated trigger.category (server lane). Open string \u2014 new categories ship on the wire ahead of schema updates. null when neither source carried a category (normal, not an error). Absent when emitted by an older CLI.",
        ),
      saw_cyber_refusal: literal(true)
        .optional()
        .describe(
          "@internal Present when ANY hop of this banner's multi-hop episode was a cyber refusal \u2014 not only the origin hop that api_refusal_category describes (the banner keeps first-hop category semantics for display). Re-arm evidence for the CLI's cyber-exclusion header on session restore; never rendered, not part of the public SDK contract. Absent on cyber-free episodes and when emitted by an older CLI.",
        ),
      api_refusal_explanation: stringSchema()
        .nullable()
        .optional()
        .describe(
          "stop_details.explanation from the refused API response (client lane only \u2014 the server-lane trigger carries no explanation). Unstable human prose \u2014 display only, never parse. null/absent when the response carried none, and always null on server-lane banners.",
        ),
      retracted_message_uuids: array(stringSchema())
        .optional()
        .describe(
          "Wire uuids of the messages this fallback retracted \u2014 the refused partial as the consumer received it (one uuid per normalized SDK message; multi-block messages carry per-block derived uuids) plus any tombstoned tool_results. Emitted AFTER the retraction, so this is a resolution-time eviction signal: remove these messages from transcript state on receipt. Eviction is idempotent \u2014 unknown or already-removed uuids are a no-op. Absent when emitted by an older CLI.",
        ),
      refused_user_message_uuid: stringSchema()
        .nullable()
        .optional()
        .describe(
          "UUID of the user message the refused request was for \u2014 the rewind target and composer prefill for edit-and-retry. This is the message's own uuid as delivered on the replay ack (not a per-block normalized uuid). null when the refused turn was not human-authored (e.g. a background task notification or auto-continuation \u2014 nothing to edit-and-retry) or otherwise cannot be identified; absent from older CLIs.",
        ),
      content: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      'Emitted when the primary model ends the stream with stop_reason "refusal" and the turn is retried once on a fallback model (direction: "retry"). When `scope` is "session" (or absent \u2014 older CLIs), the swap is made persistent for the session; when `scope` is "local", only that subagent/side-question response came from the fallback model and the session model is unchanged. "revert" and "sticky" are retained in the enum for SDK-consumer compat and are no longer emitted.',
    ),
  );
  SDKSystemModelRefusalNoFallbackMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("model_refusal_no_fallback"),
      original_model: stringSchema(),
      request_id: stringSchema().nullable(),
      api_refusal_category: stringSchema().nullable().optional(),
      api_refusal_explanation: stringSchema().nullable().optional(),
      refused_user_message_uuid: stringSchema().nullable().optional(),
      content: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      'Emitted when the model ends the stream with stop_reason "refusal" and no retry runs: no fallback model is configured, or per-category routing declined the retry (the mapped fallback target is unresolvable, or CLAUDE_CODE_REFUSAL_FALLBACK_CATCH_ALL is explicitly disabled and the refusal category has no fallback map entry). The structured counterpart to detecting stop_reason "refusal" on the assistant error frame. Not emitted when the retry ran or the user declined the retry dialog (model_refusal_fallback covers the retry case). Absent from older CLIs.',
    ),
  );
  SDKSystemModelFallbackMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("model_fallback"),
      trigger: _enum([
        "model_not_found",
        "permission_denied",
        "overloaded",
        "server_error",
        "last_resort",
        "model_blocked",
      ]),
      original_model: stringSchema(),
      fallback_model: stringSchema(),
      content: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      '@internal Emitted when the current turn is switched to the configured fallback model because the primary model failed (trigger "model_not_found": model retired/unknown; "permission_denied": org lacks access; "overloaded": repeated 529s; "server_error": retryable 5xx pivot; "last_resort": non-retryable error on the primary; "model_blocked": primary disabled by the per-model kill switch). Turn-scoped \u2014 the primary is re-tried on the next user turn. Not yet in the public SDKMessage union.',
    ),
  );
  SDKSystemModelConsentFallbackMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("model_consent_fallback"),
      choice: _enum(["consent", "switch_default", "cancelled"]).describe(
        "The consent-prompt answer (or no-dialog collapse) that produced the swap. 'consent' appears here only when the gate could not honor it (e.g. usage credits did not end up provisioned \u2014 the loop never enables billing from a bare wire reply).",
      ),
      original_model: stringSchema(),
      original_model_name: stringSchema()
        .optional()
        .describe(
          `The name the CLI's usage-credit copy uses for original_model ("Fable 5"), for a host that renders its own notice; "Fable" when absent.`,
        ),
      fallback_model: stringSchema(),
      persisted_as_default: booleanSchema().describe(
        "True when the decline also rewrote the saved default model (explicit switch_default with the consent-gated model as the saved default).",
      ),
      content: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Emitted when a pre-send model consent gate swaps the session off the requested model (consent declined, dismissed, or given without the required entitlement ending up provisioned). Currently emitted by the Fable 5 usage-credit gate (`fable_overage_consent_prompt`). Session-scoped \u2014 the swap persists for the session, and additionally as the saved default when persisted_as_default is true. Absence of this message after the consent dialog resolves means the session stayed on the requested model. Not yet in the public SDKMessage union.",
    ),
  );
  SDKSystemFileSnapshotMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("file_snapshot"),
      content: stringSchema(),
      snapshot_files: array(
        objectSchema({
          key: stringSchema().describe("Identifier for the file type (e.g. 'plan', 'todo')."),
          path: stringSchema().describe("Original file path (for debugging)."),
          content: stringSchema(),
        }),
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Snapshot of session files (plan, todo) captured for rewind. From internal SystemMessage 'file_snapshot'.",
    ),
  );
  SDKSystemScheduledTaskFireMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("scheduled_task_fire"),
      content: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Emitted when a scheduled task (cron) fires. content is the render text. From internal SystemMessage 'scheduled_task_fire'.",
    ),
  );
  SDKSystemPeerMessageHoldMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("peer_message_hold"),
      state: _enum(["held", "released", "dropped"]).describe(
        "'held' when the receive-side policy parks the message instead of queueing it (once per message per hold cause \u2014 a re-announcement under a different cause emits again); then at most one of 'released' (the policy now accepts it: it enters the queue \u2014 its command_lifecycle 'queued' and, when it drains, its user replay echo follow under message_uuid) or 'dropped' (it will never reach the model in this session; see outcome).",
      ),
      message_uuid: stringSchema()
        .optional()
        .describe(
          "The parked command's uuid \u2014 the value its later command_lifecycle frames and user replay echo carry. For lane 'bridge'/'stdin' it is the id the host (or its bridge) supplied on the inbound message; for lane 'socket' it was chosen by the SENDING session, so a host must correlate it only within peer_message_hold / peer replay frames, never against its own prompts' lifecycle.",
        ),
      lane: _enum(["bridge", "stdin", "socket"]).describe(
        "Which ingress delivered it: the Remote Control bridge, the host's own stdin stream, or the local cross-session socket.",
      ),
      from: stringSchema().describe(
        "The sender's address as the envelope will show it (the cross-session-message `from`) \u2014 an address-shaped token with control and invisible code points scrubbed; empty when the sender supplied none or an unshaped one. Sender-asserted on the socket lane: a label, not an identity proof.",
      ),
      from_name: stringSchema()
        .optional()
        .describe(
          "The sender's display name when it supplied one, normalized and scrubbed the same way. A claim, like `from`.",
        ),
      cause: _enum([
        "explicit-setting",
        "managed-setting",
        "repo-setting",
        "invalid-setting",
        "bypass-default",
        "mode-unknown",
        "mode-mismatch",
        "no-mode-asserted",
      ])
        .optional()
        .describe(
          "state 'held' only: why the policy parked it. 'mode-mismatch' / 'no-mode-asserted' are the permission-mode parity holds (the sender runs in a different permission class, or asserted none while this session bypasses permissions); the *-setting causes are a standing crossSessionInbound:'hold'.",
        ),
      outcome: _enum(["expired", "refused", "dropped", "discarded"])
        .optional()
        .describe(
          "state 'dropped' only: 'expired' \u2014 no one approved it before the approval deadline (a headless host has no approval surface, so every parity hold ends this way unless the mode changes first); 'refused' \u2014 the policy turned to refuse while it waited; 'dropped' \u2014 released or approved but the ingress guard (rate limit, duplicate, queue cap) discarded it; 'discarded' \u2014 the session ended with it still parked.",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal A cross-session (peer) message this session's receive-side policy HELD rather than queued, and how that hold resolved. Lets a host show the human that a message arrived but has not reached the model (and may never) instead of nothing at all; the sending session is told separately over its own transport where one exists. Informational only \u2014 there is no host-side approval through this frame. Emitted on the stdout stream in -p/SDK sessions.",
    ),
  );
  SDKSystemTurnDurationMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("turn_duration"),
      duration_ms: numberSchema().int(),
      budget_tokens: numberSchema()
        .int()
        .optional()
        .describe("Output tokens spent this turn toward the token budget."),
      budget_limit: numberSchema().int().optional().describe("Turn token-budget ceiling."),
      budget_nudges: numberSchema().int().optional().describe("Budget-nudge count this turn."),
      message_count: numberSchema()
        .int()
        .optional()
        .describe(
          "In-memory message count at turn end; used by resume-consistency telemetry to detect write\u2192load round-trip drift.",
        ),
      pending_background_agent_count: numberSchema()
        .int()
        .optional()
        .describe("Background Agent-tool runs still in flight when the turn finished."),
      pending_workflow_count: numberSchema()
        .int()
        .optional()
        .describe("Workflow-tool runs still in flight when the turn finished."),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Per-turn wall-clock duration plus budget and pending-background-work counts. REPL renders the 'Done in Ns' / 'Waiting for N agents' line. From internal SystemMessage 'turn_duration'.",
    ),
  );
  SDKSystemApiErrorMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("api_error"),
      error: objectSchema({
        message: stringSchema(),
        status: numberSchema().int().optional(),
        request_id: stringSchema().optional(),
        formatted: stringSchema().describe("Human-readable display string for the error."),
        connection: objectSchema({
          code: stringSchema(),
          message: stringSchema(),
          is_ssl_error: booleanSchema(),
        })
          .nullable()
          .describe("errno/SSL code extracted from the cause chain; null when absent."),
        is_network_down: booleanSchema(),
        rate_limits: objectSchema({
          resets_at: numberSchema().int().optional(),
          rate_limit_type: stringSchema().optional(),
        })
          .nullable()
          .describe("Quota-429 headers surfaced by the retry banner; null when not a quota 429."),
      }).describe("Plain-data snapshot of the APIError \u2014 the class instance cannot cross the wire."),
      retry_in_ms: numberSchema().int(),
      retry_attempt: numberSchema().int(),
      max_retries: numberSchema().int(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Retryable-API-error frame carrying the plain-data error snapshot and retry counters. REPL renders the retry banner from this. Wire twin is SDKAPIRetryMessage ('api_retry'). From internal SystemMessage 'api_error'.",
    ),
  );
  SDKSystemLocalCommandOutputMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("local_command_output"),
      content: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "Output from a local slash command (e.g. /voice, /usage). Displayed as assistant-style text in the transcript.",
    ),
  );
  SDKSystemHookStartedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("hook_started"),
      hook_id: stringSchema(),
      hook_name: stringSchema(),
      hook_event: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }),
  );
  SDKSystemHookProgressMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("hook_progress"),
      hook_id: stringSchema(),
      hook_name: stringSchema(),
      hook_event: stringSchema(),
      stdout: stringSchema(),
      stderr: stringSchema(),
      output: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }),
  );
  SDKSystemHookResponseMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("hook_response"),
      hook_id: stringSchema(),
      hook_name: stringSchema(),
      hook_event: stringSchema(),
      output: stringSchema(),
      stdout: stringSchema(),
      stderr: stringSchema(),
      exit_code: numberSchema().int().optional(),
      outcome: _enum(["success", "error", "cancelled"]),
      uuid: _(),
      session_id: stringSchema(),
    }),
  );
  SDKSystemPluginInstallMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("plugin_install"),
      status: _enum(["started", "installed", "failed", "completed"]),
      name: stringSchema().optional(),
      error: stringSchema().optional(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "Headless plugin installation progress (CLAUDE_CODE_SYNC_PLUGIN_INSTALL). started/completed bracket the whole install; installed/failed carry a per-marketplace name.",
    ),
  );
  SDKToolProgressMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("tool_progress"),
      tool_use_id: stringSchema(),
      tool_name: stringSchema(),
      parent_tool_use_id: stringSchema().nullable(),
      elapsed_time_seconds: numberSchema().int(),
      task_id: stringSchema().optional(),
      uuid: _(),
      session_id: stringSchema(),
      heartbeat: booleanSchema().optional(),
      subagent_type: stringSchema().optional(),
      subagent_retry: objectSchema({
        agent_id: stringSchema(),
        attempt: numberSchema().int(),
        max_retries: numberSchema().int(),
        retry_delay_ms: numberSchema().int(),
        error_status: numberSchema().int().nullable(),
        error_category: stringSchema(),
      }).optional(),
    }),
  );
  SDKAuthStatusMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("auth_status"),
      isAuthenticating: booleanSchema(),
      output: array(stringSchema()),
      error: stringSchema().optional(),
      uuid: _(),
      session_id: stringSchema(),
    }),
  );
  SDKSystemFilesPersistedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("files_persisted"),
      files: array(
        objectSchema({
          filename: stringSchema(),
          file_id: stringSchema(),
        }),
      ),
      failed: array(
        objectSchema({
          filename: stringSchema(),
          error: stringSchema(),
        }),
      ),
      processed_at: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }),
  );
  AMBIENT_TASK_DESCRIPTION =
    "True for tasks that are not activity (every skip_transcript task, plus every live-update watcher, requested or auto-started); hosts should exclude them from activity indicators.";
  AWAITED_RESUMED_RUN_DESCRIPTION =
    "@internal True for a run of a resumed subagent (local_agent) that the tool call which resumed it waits for, as SendMessage does when background tasks are disabled; its task_started, if one is sent, names that call in tool_use_id. The run has ended by the time that call returns or throws, even when the wait is aborted. Its report goes into that call's result, so expect no follow-up turn when it ends. A later resume that nothing waits for starts a new run without the field.";
  PARENT_TASK_ID_DESCRIPTION =
    "task_id of the subagent (local_agent) task whose agent launched this subagent, shell, monitor or workflow task. Absent when the launcher is the main thread, has no task_id of its own (a teammate, an agent inside a workflow), or is no longer tracked. A resumed subagent keeps its original parent. The parent may be a foreground or already-ended task, so treat an unknown id as no parent.";
  RUN_ID_DESCRIPTION =
    "Id of one run of the task: equal on every task_* event, background_tasks_changed entry and saved notification (its origin.runId) of that run. A resumed task keeps its task_id and gets a new one. The run ids of one task sort, by plain string comparison, in the order the runs opened; a frame that names a run sorting before the one a reader shows is late. Nothing else about the format is promised. Absent for a task this process did not register, and from CLIs that predate it.";
  SDKSystemTaskNotificationMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("task_notification"),
      task_id: stringSchema(),
      run_id: stringSchema().optional().describe(RUN_ID_DESCRIPTION),
      tool_use_id: stringSchema().optional(),
      status: _enum(["completed", "failed", "stopped"]),
      reason: _enum(["worker_restart"])
        .optional()
        .describe(
          "Machine-readable cause, set only when the task did not end through an ordinary completion, failure, or stop. 'worker_restart': the worker process restarted and the resumed process found the task orphaned (always with status 'stopped').",
        ),
      output_file: stringSchema(),
      summary: stringSchema(),
      usage: objectSchema({
        total_tokens: numberSchema().int(),
        tool_uses: numberSchema().int(),
        duration_ms: numberSchema().int(),
      }).optional(),
      resource_links: array(ResourceLinkSchema())
        .optional()
        .describe(
          "CLI-owned: for a backgrounded MCP task (task_type mcp_task) that completed, the `resource_link` content blocks of its final result \u2014 the files it returned by reference \u2014 collected from the raw result before the CLI renders it as the text the model reads. A backgrounded task's tool_result is the placeholder text and its real result arrives as this notification, so this is where a host learns which files that tool call produced; join to the originating call via tool_use_id. Same fields and caps as tool_use_result.resourceLinks (at most 50 links, 64 KiB serialized), absent when the result had none or the task is any other type. Never populated from the server's _meta.",
        ),
      handback: _enum(SUBAGENT_REPORT_DISPOSITIONS)
        .optional()
        .describe(
          "@internal Present on a 'completed' notification of a subagent that reports through the SubagentHandback tool: how its report reached its caller, with the values and meaning of `handback` on AgentToolCompletedOutput. Left out when the subagent failed, was stopped, is waiting on agents it started, or is waiting on its own background work with nothing delivered yet; for such a subagent, `summary` is then not a report. When present, `summary` holds harness notes written for the model. Any notification can be followed by a later one for the same task_id when the agent is resumed or finishes its wait; the later one replaces what the earlier one showed.",
        ),
      handback_report: HandbackReportSchema()
        .optional()
        .describe(
          "@internal The report a 'send' or 'flagged' hand-back delivered, the same shape as `handbackReport` on AgentToolCompletedOutput: when present, render it instead of `summary`, with its `warning`, if it has one, above its `text`. Absent for 'withheld'; if it is absent for another value too, show `summary`.",
        ),
      skip_transcript: booleanSchema().optional(),
      ambient: booleanSchema().optional().describe(AMBIENT_TASK_DESCRIPTION),
      uuid: _(),
      session_id: stringSchema(),
    }),
  );
  SDKSystemTaskStartedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("task_started"),
      task_id: stringSchema(),
      run_id: stringSchema().optional().describe(RUN_ID_DESCRIPTION),
      tool_use_id: stringSchema().optional(),
      description: stringSchema(),
      subagent_type: stringSchema().optional().describe("Subagent type for Task tool subagents."),
      is_backgrounded: booleanSchema()
        .optional()
        .describe(
          "Whether the task was registered in the background (true) or in the foreground with the spawning tool call blocking on it (false). A resumed subagent is always registered in the background. A later move to the background arrives as task_updated patch.is_backgrounded. Set for local_agent and local_bash tasks.",
        ),
      awaited: booleanSchema().optional().describe(AWAITED_RESUMED_RUN_DESCRIPTION),
      spawn_depth: numberSchema()
        .int()
        .optional()
        .describe(
          "Nesting depth of a spawned subagent (local_agent) task: 1 for a top-level spawn, N+1 when spawned from inside a depth-N agent. Not set on other tasks.",
        ),
      parent_task_id: stringSchema().optional().describe(PARENT_TASK_ID_DESCRIPTION),
      task_type: stringSchema().optional(),
      workflow_name: stringSchema()
        .optional()
        .describe(
          "meta.name from the workflow script (e.g. 'spec'). Only set when task_type is 'local_workflow'.",
        ),
      prompt: stringSchema().optional(),
      skip_transcript: booleanSchema()
        .optional()
        .describe(
          "Ambient/housekeeping task. Consumers should hide this from the inline transcript; it may still appear in a tasks panel.",
        ),
      ambient: booleanSchema().optional().describe(AMBIENT_TASK_DESCRIPTION),
      uuid: _(),
      session_id: stringSchema(),
    }),
  );
  SDKSystemTaskUpdatedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("task_updated"),
      task_id: stringSchema(),
      run_id: stringSchema().optional().describe(RUN_ID_DESCRIPTION),
      patch: objectSchema({
        status: _enum(["pending", "running", "completed", "failed", "killed", "paused"]).optional(),
        description: stringSchema().optional(),
        end_time: numberSchema().int().optional(),
        total_paused_ms: numberSchema().int().optional(),
        error: stringSchema().optional(),
        is_backgrounded: booleanSchema().optional(),
      }).describe(
        "Wire-safe subset of TaskState fields that changed. Excludes abortController, messages, result. Clients merge into their local task map.",
      ),
      uuid: _(),
      session_id: stringSchema(),
    }),
  );
  SDKSystemBackgroundTasksChangedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("background_tasks_changed"),
      tasks: array(
        objectSchema({
          task_id: stringSchema(),
          run_id: stringSchema().optional().describe(RUN_ID_DESCRIPTION),
          task_type: stringSchema(),
          subagent_type: stringSchema()
            .optional()
            .describe(
              `Agent type of a local_agent task, such as "general-purpose" or a custom agent's name; "main-session" for a backgrounded main session. Not set on other tasks.`,
            ),
          description: stringSchema(),
          parent_task_id: stringSchema().optional().describe(PARENT_TASK_ID_DESCRIPTION),
          ambient: booleanSchema().optional().describe(AMBIENT_TASK_DESCRIPTION),
          awaited: booleanSchema().optional().describe(AWAITED_RESUMED_RUN_DESCRIPTION),
        }),
      ).describe(
        "Every live background task after the change. REPLACE semantics: swap your set for this payload.",
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "The full set of live background tasks, emitted whenever membership changes (start, completion, kill, a foreground agent being backgrounded) or an entry's `ambient` flag or `parent_task_id` changes. A level signal, unlike the task_started/task_notification edge bookends: consumers that only need 'is background work running' should replace their set with each payload rather than pairing edges, so a missed bookend cannot wedge a stale running indicator. Ordering relative to the bookends for the same transition is unspecified (in practice a task that starts in the background joins the level before its task_started, and a finishing task leaves it after its task_updated and task_notification), so do not correlate it with the edge stream. The level is per-process: nothing is emitted at startup, so consumers must reset to the empty set whenever the session's CLI process (re)starts and let the next membership change repopulate it. A host that re-initializes an already-running process (a repeated `initialize` control request, e.g. after reconnecting) is sent a snapshot of the current set right behind the success response to that request, even when it is empty, so it need not wait for a change; CLIs that predate this send nothing there.",
    ),
  );
  SDKSystemFeedbackDraftQueuedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("feedback_draft_queued"),
      draft_id: stringSchema().describe(
        "UUID of the on-disk draft file under ~/.claude/feedback/drafts/ \u2014 the identity for discard and submit.",
      ),
      draft_type: _enum(["bug", "idea", "missing_capability"]),
      title: stringSchema().describe("Sanitized one-line summary from the SendFeedback tool call."),
      details_preview: stringSchema().describe(
        "First ~200 chars of the sanitized details, for the host UI's three-line card preview. The full draft stays on disk and is read when the user opens the review form.",
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Emitted by the SendFeedback tool after it writes a local draft to ~/.claude/feedback/drafts/, so a connected host UI can surface a review card without polling the filesystem. Carries only the card's display fields; nothing is sent anywhere without the user's explicit action on the review form.",
    ),
  );
  SDKSystemSessionStateChangedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("session_state_changed"),
      state: _enum(["idle", "running", "requires_action"]),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "Mirrors notifySessionStateChanged. 'idle' fires after heldBackResult flushes and the bg-agent do-while exits \u2014 authoritative turn-over signal.",
    ),
  );
  SDKSystemSessionTitleChangedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("session_title_changed"),
      title: stringSchema().describe(
        "The session's current name. Control, bidirectional and zero-width characters are replaced with single spaces, the ends are trimmed, and the name is at most 200 Unicode code points. When another session already has the name, a suffix can make it unique.",
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal The session's name, for a host that shows it, such as an IDE editor tab. A headless (print mode) session sends it at startup when the session already has a name, and again after each change to the name (not an AI-generated title), including a rename the host itself sent with `rename_session`. A name that another process writes to the transcript arrives when this process next reads the end of its transcript: after about 32 KB of its own transcript writes, or at a compaction. A cleared name is not sent. The same name can arrive more than once, for example when it is set again, so a host should treat a repeated name as no change. The frame can arrive before the system/init message that first names its session_id, for example at startup or after /clear. A host that learns the session id from system/init can hold the name until then.",
    ),
  );
  SDKSystemWorkerShuttingDownMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("worker_shutting_down"),
      reason: stringSchema().describe(
        "Short snake_case reason set by the host CLI (not user input), e.g. 'host_exit', 'remote_control_disabled'.",
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "Emitted by the bridge on opt-in graceful worker teardown (only when the teardown caller supplied a reason), before the heartbeat stops, so remote clients can show why the worker went away instead of waiting for heartbeat timeout. Absence is NOT a dead-host signal: handoffs (/update, /teleport, respawn), auto-disable, mode transitions, and internal fatal-error paths emit nothing by design. A dead host (battery, OOM, kill -9) never reaches teardown and never sends this either. NOTE: this event lands in the durable per-session event stream \u2014 a session that is later resumed may carry historical instances mid-stream. Clients MUST treat it as a live-tail signal only (honored when no further activity follows), not a one-shot session-lifetime fact.",
    ),
  );
  SDKSystemInheritedAsksSettledMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("inherited_asks_settled"),
      kept_request_ids: array(stringSchema()).describe(
        "The request ids of the earlier worker's asks that this worker keeps answerable.",
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal A cloud worker's report, before its first turn, of which asks it inherited and keeps. Any ask stored before this event that it does not name is over.",
    ),
  );
  SDKSystemTurnHandoffAvailableMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("turn_handoff_available"),
      v: literal(1),
      tools: array(stringSchema()),
      worker_epoch: numberSchema(),
      uuid: _(),
      session_id: stringSchema(),
      staged_files: literal(true)
        .optional()
        .describe(
          "@internal Present, and true, when this worker starts a handed-off turn's calls only after every stage_file control request it received earlier has finished or failed, or a wait limit has passed; a worker that omits it may start them while files are still downloading. Exception: a request with filestore_path set (a synced file) is not waited for, so a call that names that file may start before it is synced.",
        ),
      no_query_first: literal(true)
        .optional()
        .describe(
          "@internal True when user messages with shouldQuery false that reach this worker before a turn_handoff request are appended, and acknowledged, before the handed-off turn produces any output. Exception: a request that continues a turn whose leading lines an earlier request appended; that turn goes first. A worker that omits it may run the turn first.",
        ),
      shared_message_id: literal(true)
        .optional()
        .describe(
          "@internal True when this worker accepts a turn_handoff request in which an assistant message repeats the message id of the assistant message before it, as the messages member of that request describes. A worker that omits it refuses such a request (invalid_handoff), so a client gives each message an id of its own there.",
        ),
      relay_marker: literal(true)
        .optional()
        .describe(
          "@internal Present, and true, only when this worker uses the relay_marker member of a turn_handoff request; a client sends that member to no other worker.",
        ),
      home_files: literal(true)
        .optional()
        .describe(
          "@internal Present, and true, only on a worker that takes a stage_file control request whose mount_path is /uploads/.home/<path> as a file for /home/claude/<path>: it writes the file there, answers ok with a noop (already_present, path_occupied, refused_name, home_files_off, unchecked_announcement, resent_announcement) and writes nothing, or answers an error. Any other worker treats that path as an ordinary upload.",
        ),
      file_names: literal(true)
        .optional()
        .describe(
          "@internal Present, and true, only when this worker uses the file_names member of a turn_handoff request; a client sends that member to no other worker.",
        ),
      carried_writes: literal(true)
        .optional()
        .describe(
          `@internal Present, and true, only on a worker that writes the files of the Write calls a turn_handoff request brings already answered, where their paths are under /home/claude. Before it appends a turn that has calls to run, it writes each such call's content to its path, replacing nothing. If it cannot write them all, it appends and runs nothing: the request is refused with an error that starts "invalid_handoff: carried_writes_", or it is accepted and the turn ends in a result with num_turns 0. Any other worker writes no file for these calls.`,
        ),
      hydrates_carried_lines: literal(true)
        .optional()
        .describe(
          `@internal Present, and true, only on a worker that rebuilt the conversation from the session's stored transcript before it read any request, and would not have started without it. A client may send this worker again a turn_handoff request that an earlier worker accepted, if the request names no calls (tool_use_ids empty), is not stopped, and its messages hold no tool call. A request whose turn had not ended when an earlier worker with this key stopped is left unacknowledged, so the session service sends it to this worker by itself; a second request for the same turn is answered "duplicate" while the first waits or runs. The worker appends only the messages of the turn that its conversation lacks and, once the store has confirmed every message of the turn, sends the turn's last message back as an assistant event (the echo); a turn it already holds whole is echoed on the same condition. The request can still be accepted, or refused ("invalid_handoff:"), with no echo, and the turn may then not be stored. That happens, for example, when the conversation has moved on past the part of the turn it holds, when a rewind has removed the turn, when a compaction has summarised part of it (or all of it, if the compaction was this worker's own), when a Stop clears the queue first, or when the store does not confirm the messages. A request sent again waits again for messages not yet confirmed. When a delivery finds that the store refused a message of the turn, it sends no echo and removes the turn from the conversation, and the same request sent again to that worker gets no echo. If another row has followed the turn, the turn stays, also with no echo. Exception: after 512 later refused rows the worker forgets a refusal and reads the message as confirmed. Confirmed means that the store answered the upload with success. A turn that an earlier worker's compaction summarised whole is appended a second time. The key promises nothing for a turn that holds a tool call, or whose first message is stored with no answer but with another row behind it (a hook's output, say): the worker may already have continued such a turn itself when it started. A worker without the key may have started with none of the turn's messages.`,
        ),
      requires_rewind_request_id: literal(true)
        .optional()
        .describe(
          "@internal Present, and true, only on a worker that reads the requires_rewind_request_id member of a turn_handoff request; a worker without this key ignores the member and appends the turn whether or not the rewind was made.",
        ),
    }).describe(
      "@internal Emitted once by a cloud worker that accepts the turn_handoff control request, after it registers, carrying what it wrote to external_metadata.turn_handoff: the version, the tools whose calls it would accept, the worker life (worker_epoch) announcing it, whether handed-off calls wait for files still being staged (staged_files), whether user messages that make no model call are appended before a handed-off turn (no_query_first), whether two assistant messages of a turn may share a message id (shared_message_id), whether a turn_handoff request may name a rewind it depends on (requires_rewind_request_id), and relay_marker, home_files, file_names, carried_writes and hydrates_carried_lines when set. Lets a session client learn the capability from the event stream instead of reading worker state. Durable in the stream: a reader keeps the entry with the newest worker_epoch it has seen and ignores older ones; a worker life that does not accept turn_handoff emits nothing (its registration writes turn_handoff: null).",
    ),
  );
  SDKSystemUiInvalidateMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("ui_invalidate"),
      event: literal("ui.render").describe(
        "@internal The render event whose version moved; the engine versions `ui.render` as one event, so no component or instance is named.",
      ),
      prompts_screened: literal(true)
        .optional()
        .describe(
          "@internal Present while a mod may change what is recorded of a typed line (a hook on `prompt.submit`, `command.run`, `session.append` or, for a line sent to the session, `session.receive`; mods not yet known; or an organization policy that lists a plugin or cannot be read): what the `prompts_screened_v1` capability says on `system/init`, said as soon as a plugin load or reload makes it so. Absent says nothing: the next `system/init` does.",
        ),
      instances: array(
        objectSchema({
          surface: stringSchema().describe("@internal The surface that drew the instance."),
          component: stringSchema().describe("@internal The component of the instance."),
          instance_id: stringSchema().describe(
            "@internal The engine's requestId of the instance, as the ui_render that drew it named it.",
          ),
        }),
      )
        .optional()
        .describe(
          "@internal Present when a plugin wrote state (`$.state.set`) that these instances read while they were drawn, or a `Client` drawn in them failed and its plugin heard it (`ui.fault`), and nothing else moved: only they are stale, and the surface may re-ask them alone. Absent, every mounted instance may be stale, as before. A surface that ignores the field re-asks everything and stays correct.",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      '@internal Fire-and-forget push from the hooks engine when a plugin called `$.ui.invalidate("ui.render")` or a plugin loaded or reloaded: every tree a remote surface drew through ui_render may be stale. The surface re-asks each mounted instance; the engine dedups the evaluations. Bumps from one plugin fold to at most one per 100 ms. With `instances`, a state write or a `Client` that failed made only those stale.',
    ),
  );
  SDKSystemUiLogMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("ui_log"),
      plugin: stringSchema().describe(
        "@internal The calling plugin's registry name, as the hooks engine knows it (never plugin-settable).",
      ),
      text: stringSchema().describe(
        "@internal The line the plugin gave: be ready for up to 10000 characters of it and then an ellipsis. Plain text: draw it as a text node, never as markup.",
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Fire-and-forget push from a headless session for one `$.ui.log(text)` line: what the REPL appends to its transcript as a dim notice under the plugin's name. Not sent to the model. Lines are not counted across the session: a plugin's lines are the plugin's to write, however long the session runs; ones logged before the stream opened are delivered first, in order.",
    ),
  );
  SDKSystemUiToastMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("ui_toast"),
      plugin: stringSchema().describe(
        "@internal The calling plugin's registry name, as the hooks engine knows it (never plugin-settable).",
      ),
      text: stringSchema().describe(
        "@internal The line the plugin gave: be ready for up to 10000 characters of it and then an ellipsis. Plain text: draw it as a text node, never as markup.",
      ),
      timeout_ms: numberSchema()
        .int()
        .describe(
          "@internal How long the REPL would keep it on the notification bar: the plugin's `timeoutMs`, or the engine's default (4000).",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Fire-and-forget push from a headless session for one `$.ui.toast(text)`: what the REPL shows on the notification bar under the prompt for a few seconds, under the plugin's name. Be ready for a plugin's toasts at no fixed rate; nothing counts how many a plugin has shown.",
    ),
  );
  SDKSystemUiStatusMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("ui_status"),
      plugin: stringSchema().describe(
        "@internal The calling plugin's registry name, as the hooks engine knows it (never plugin-settable). One status line per plugin.",
      ),
      text: stringSchema()
        .nullable()
        .describe(
          "@internal The plugin's pinned line, replacing its previous one; null removes it. Be ready for up to 10000 characters of it and then an ellipsis. Plain text: draw it as a text node, never as markup.",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Fire-and-forget push from a headless session for one `$.ui.status(text)`: the line the REPL pins under the prompt beside the engine's own notices until the plugin's next call replaces or clears it.",
    ),
  );
  PANE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
  PaneIdSchema = DoctorLazy(() =>
    stringSchema()
      .regex(PANE_ID_RE)
      .describe(
        "@internal A pane's id as the plugin opened it (`$.ui.open({ id })`): 1 to 64 of letters, digits, `_`, `-`. What a ui_render for `Pane` carries as `instance_id`.",
      ),
  );
  PaneSchema = DoctorLazy(() =>
    objectSchema({
      id: PaneIdSchema(),
      title: stringSchema().describe(
        "@internal The pane's tab label: the `title` its latest open gave, else its id. Plugin-authored text the engine bounded and freed of control characters: draw it as a text node, never as markup.",
      ),
      plugin: stringSchema().describe(
        "@internal The registry name of the plugin that opened it, as the engine knows it; a `$.ui.scroll` or `$.ui.focus` of the pane is that plugin's alone.",
      ),
      close_on_escape: literal(true)
        .optional()
        .describe(
          "@internal Escape while the pane holds the keyboard, or at an idle empty composer, closes it as the person's close does (send ui_close); absent, Escape only returns the keyboard.",
        ),
      hold_toasts: literal(true)
        .optional()
        .describe(
          "@internal The surface holds its transient toasts while this pane is the one shown, and shows them once it closes.",
        ),
      background_color: stringSchema()
        .optional()
        .describe(
          "@internal What the surface paints under this pane's body while it is the one shown: a theme key, a raw color, or `transparent` for nothing; checked at open, yet parse it, never write it into a style. Absent, the surface's own look stands.",
        ),
      rows: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal The body rows its content asked for while seated inline; a request the person's own sizing overrides.",
        ),
      columns: numberSchema()
        .int()
        .optional()
        .describe(
          "@internal The body columns its content asked for while docked; a request the person's own sizing overrides.",
        ),
    }).describe(
      "@internal One placed pane as the engine holds it (plugins/functionHooks/panes/): which, its tab, its opener, and the manners and size its latest open asked for.",
    ),
  );
  PanesSchema = DoctorLazy(() =>
    objectSchema({
      panes: array(PaneSchema()).describe(
        "@internal The placed open panes in open order (an open appends, a close removes); a pane waiting unplaced is not listed. The surface draws one container for them: tabs when several, the shown one visible.",
      ),
      shown_id: PaneIdSchema()
        .nullable()
        .describe(
          "@internal The pane the surface shows: the last opened or focused, never displacing one the person holds; null with none open.",
        ),
      focused_id: PaneIdSchema()
        .nullable()
        .describe(
          "@internal The pane the person gave the keyboard (ui_pane_focus); null while the composer has it.",
        ),
      focus_requested_id: PaneIdSchema()
        .nullable()
        .describe(
          "@internal A standing `$.ui.open({ focus: true })` the surface has yet to judge: honour it (focus the pane, send ui_pane_focus with its id) only while the composer is empty and idle and no dialog is up, else refuse it (ui_pane_focus with null).",
        ),
    }).describe(
      "@internal The session's panes as a remote surface draws them: what ui_panes answers and the ui_panes push carries.",
    ),
  );
  SDKSystemUiPlacedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("ui_placed"),
      rows: array(
        objectSchema({
          plugin: stringSchema().describe("@internal The plugin that placed the row."),
          id: stringSchema().describe("@internal The row's id among that plugin's rows."),
          request_id: stringSchema().describe(
            '@internal The `instance_id` of the `ui_render` ask, with `component: "Placed"`, that draws it.',
          ),
          after_uuid: stringSchema()
            .optional()
            .describe(
              "@internal The conversation message the row follows; absent at the conversation's start. Rows sharing it stand in roster order.",
            ),
        }),
      ).describe("@internal The main conversation's placed rows, in order."),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Fire-and-forget push from a headless session when a plugin places a row with `$.ui.place`, and to a client as it joins: a surface inserts each row after `after_uuid` and asks `ui_render` for it. Display only: no message carries these rows. A surface drops the rows it holds with the conversation it resets, and a row whose `after_uuid` it no longer holds. A compaction ends the rows before it, and no push says so. A surface that does not know the subtype drops it, and the rows are not drawn there.",
    ),
  );
  SDKSystemUiPanesMessageSchema = DoctorLazy(() =>
    PanesSchema()
      .extend({
        type: literal("system"),
        subtype: literal("ui_panes"),
        uuid: _(),
        session_id: stringSchema(),
      })
      .describe(
        "@internal Fire-and-forget push from a headless session whenever the pane roster a remote surface draws changes: a plugin opened, retitled or closed a pane, the person showed, focused or closed one, a placing client attached. Deduplicated: an unchanged roster is not pushed. A pane opened before the stream armed produces none; read the roster with ui_panes on mount.",
      ),
  );
  SDKSystemUiScrollMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("ui_scroll"),
      client_id: stringSchema().describe("@internal The client drawing the site, as it attached."),
      component: _enum(["Pane", "AbovePrompt"]).describe("@internal Which site: a pane's body or the band."),
      instance_id: stringSchema().describe("@internal The pane's id, or `above-prompt` for the band."),
      offset: numberSchema()
        .int()
        .describe(
          "@internal The first content row the window is to show, 0 at the top, clamped to the tree as the surface last reported it.",
        ),
      follow_end: booleanSchema()
        .optional()
        .describe(
          "@internal True: keep the window on the tree's last rows through the draws to come, until the person or a plugin next moves it.",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Fire-and-forget push when a plugin's `$.ui.scroll` (through the `ui.scroll` chain) moved the window of a site a remote surface draws: the surface scrolls the site's body there. The person's own scrolls (ui_scroll requests) are never pushed back.",
    ),
  );
  SDKSystemUiFocusMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("ui_focus"),
      client_id: stringSchema().describe("@internal The client drawing the site, as it attached."),
      component: _enum(["Pane", "AbovePrompt"]).describe("@internal Which site: a pane's body or the band."),
      instance_id: stringSchema().describe("@internal The pane's id, or `above-prompt` for the band."),
      plugin: stringSchema().describe("@internal Whose element takes the ring: its `press.plugin`."),
      key: stringSchema().describe("@internal The element's `props.key`, as ui.press names it."),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Fire-and-forget push when a plugin's `$.ui.focus` (through the `ui.focus` chain) moved the focus ring of a site a remote surface draws onto one of its Buttons, Inputs or Selects: the surface focuses that element if it still draws it. The person's own moves (ui_focus requests) are never pushed back.",
    ),
  );
  SDKSystemCommandsChangedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("commands_changed"),
      commands: array(SkillCommandSchema()),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "Fire-and-forget push of the full slash-command list after a mid-session change (e.g. skills discovered dynamically as the agent works in a subdirectory). Clients should REPLACE their cached command list with this payload; supportedCommands() tracks the latest push, so a re-fetch returns the same fresh list.",
    ),
  );
  SDKSystemNotificationMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("notification"),
      key: stringSchema(),
      text: stringSchema(),
      priority: _enum(["low", "medium", "high", "immediate"]),
      color: stringSchema().optional(),
      timeout_ms: numberSchema().int().optional(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "Loop-side text notification. Mirrors the interactive REPL notification queue (key/priority/timeout). JSX notifications are not emitted on this channel.",
    ),
  );
  SDKSystemTaskProgressMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("task_progress"),
      task_id: stringSchema(),
      run_id: stringSchema().optional().describe(RUN_ID_DESCRIPTION),
      tool_use_id: stringSchema().optional(),
      description: stringSchema(),
      subagent_type: stringSchema().optional().describe("Subagent type for Task tool subagents."),
      usage: objectSchema({
        total_tokens: numberSchema().int(),
        tool_uses: numberSchema().int(),
        duration_ms: numberSchema().int(),
      }),
      last_tool_name: stringSchema().optional(),
      summary: stringSchema()
        .optional()
        .describe(
          "A one-line status for the task's row. For a local_agent task it is the model-generated progress summary (only when the agentProgressSummaries option is on); for a backgrounded mcp_task it is the MCP server's own bounded status message, emitted once per change without any option. Render it when present regardless of task type.",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }),
  );
  SDKSystemThinkingTokensMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("thinking_tokens"),
      estimated_tokens: numberSchema().int(),
      estimated_tokens_delta: numberSchema().int(),
      user_message_uuid: stringSchema()
        .optional()
        .describe(
          "Client uuid of the user message that triggered this turn (submitMessage options.uuid), stamped on every thinking_tokens frame of a headless (stream-json / Agent SDK) turn so a consumer can attribute thinking progress to the send it answers before any reply frame arrives. On a synthetic/scheduled (meta) turn it names the last user message folded into the turn so far once one has been, else the turn's own uuid when the host vouches it is the client event's own (delivered content such as a Slack owner ping). Absent on turns that neither had a client uuid nor folded a user message in, on Remote Control (interactive terminal) sessions, and from older producers.",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "Live thinking-token estimate, digested from thinking_delta.estimated_tokens during the redacted-thinking phase (where the API otherwise streams only pings). estimated_tokens is the running total for the current thinking block; estimated_tokens_delta is the increment carried by this frame. Approximate progress for spinners/pills, not the authoritative billed output_tokens.",
    ),
  );
  SDKToolUseSummaryMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("tool_use_summary"),
      summary: stringSchema(),
      preceding_tool_use_ids: array(stringSchema()),
      uuid: _(),
      session_id: stringSchema(),
      timestamp: stringSchema()
        .optional()
        .describe(
          "@internal ISO timestamp when the summary was created on the originating process. From internal ToolUseSummaryMessage.timestamp.",
        ),
    }),
  );
  SDKSystemMemoryRecallMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("memory_recall"),
      mode: _enum(["select", "synthesize"]).describe(
        "How memories were surfaced: 'select' returns full file bodies chosen by the parallel selector; 'synthesize' returns a Sonnet-authored paragraph distilled from many tiny memories.",
      ),
      memories: array(
        objectSchema({
          path: stringSchema().describe(
            "Absolute path to the memory file, a synthesis sentinel of the form `<synthesis:DIR>` when mode is 'synthesize', or an https URL when scope is 'organization'.",
          ),
          scope: _enum(["personal", "team", "organization"]),
          content: stringSchema()
            .optional()
            .describe(
              "The surfaced memory body. Always present for 'synthesize' mode and 'organization' scope (neither has an on-disk path to lazy-load from); absent for file-backed 'select' entries (renderers lazy-load from path).",
            ),
        }),
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      'Emitted when the memory recall supervisor surfaces relevant memories into the turn. Mirrors the CLI relevant_memories attachment so SDK renderers can show "Recalled from memory" inline.',
    ),
  );
  SDKSystemElicitationCompleteMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("elicitation_complete"),
      mcp_server_name: stringSchema(),
      elicitation_id: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe("Emitted when an MCP server confirms that a URL-mode elicitation is complete."),
  );
  SDKSystemPermissionDeniedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("permission_denied"),
      tool_name: stringSchema(),
      tool_use_id: stringSchema(),
      agent_id: stringSchema()
        .optional()
        .describe(
          "Subagent ID when the denied tool call originated inside a subagent. Mirrors can_use_tool for host-side routing.",
        ),
      decision_reason_type: stringSchema()
        .optional()
        .describe(
          "Discriminator from PermissionDecisionReason (e.g. 'classifier', 'asyncAgent', 'mode', 'rule').",
        ),
      decision_reason_code: _enum(DECISION_REASON_CODES)
        .optional()
        .describe(
          "@internal A closed-set code for a reason a host can act on, beside decision_reason_type (whose values are unchanged): 'outside_reads_blocked' (permissions.blockReadsOutsideWorkingDirectories refused the path), 'memory_paused' (memory is paused for the session), 'classifier_transcript_too_long' (the auto-mode classifier's transcript exceeded its context window). Absent for every other reason; new values are additive.",
        ),
      decision_reason: stringSchema()
        .optional()
        .describe("Human-readable reason from the deciding component, when available."),
      message: stringSchema().describe("The rejection message returned to the model in the tool_result."),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "Emitted when a tool call is auto-denied without an interactive permission prompt (e.g. auto-mode classifier, dontAsk mode, headless-agent auto-deny, or a deny rule). With a permission prompt surface (stdio/SDK canUseTool), the 'ask' path surfaces via a can_use_tool control_request and this event covers the 'deny' short-circuit. Without one (bare -p / SDK query() with no canUseTool), 'ask' decisions are terminal, so this event also covers those implicit denials. Best-effort advisory: in rare races a denial can book without a frame or a frame can lack a booking twin \u2014 result.permission_denials is the authoritative record. Denials that resolve before canUseTool runs \u2014 PreToolUse hook denies, deny-rule overrides of hook allow/ask decisions, and file-tool calls (Read, Edit, Write) refused by a path-scoped deny rule \u2014 are not covered here, and neither is the MCP --permission-prompt-tool surface (the prompt tool is the host there).",
    ),
  );
  SDKSystemPermissionCheckStatusMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("permission_check_status"),
      tool_use_id: stringSchema(),
      agent_id: stringSchema()
        .optional()
        .describe("Subagent ID when the tool call originated inside a subagent, as on permission_denied."),
      status: _enum(["checking", "done"]).describe(
        "'checking': the call has waited about four seconds on its check and is still waiting. 'done': that wait is over.",
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal A tool call has been waiting on its automatic permission check (the auto-mode classifier) for longer than usual. It lets a host say that the step is being checked, where it would otherwise show a silent pause that looks like a running tool. Most checks answer within about four seconds and send nothing. The wait can include the rest of the model's streaming reply, or a dialog the host is showing about the check: prefer those indicators. Every 'checking' is followed by a 'done' for the same tool_use_id. 'done' does not say whether the call was allowed: the tool's result, permission_denied or a can_use_tool request does. One call can send more than one pair. Display-only and best-effort: a frame can be lost, so also stop showing it at any other frame for this tool_use_id or at the end of the turn. Emitted on the output stream of -p/SDK sessions.",
    ),
  );
  SDKPromptSuggestionMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("prompt_suggestion"),
      suggestion: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe("Predicted next user prompt, emitted after each turn when promptSuggestions is enabled."),
  );
  SDKAttachmentMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("attachment"),
      attachment: unknown().describe(
        "Internal Attachment discriminated union (at-mentioned files, IDE selections, pasted images, structured output, deferred tool-use). Wire shape pending a dedicated SDKAttachment schema.",
      ),
      timestamp: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Emitted when the engine yields an AttachmentMessage into the turn stream. Carries user-attached content (at-mentioned files, IDE selections, pasted media) and loop-attached data (structured output, deferred tool-use payloads). SDKResultMessage.structured_output and .deferred_tool_use are derived from these frames. From internal QueryEvent 'attachment'.",
    ),
  );
  SDKTombstoneMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("tombstone"),
      message: unknown().describe(
        "The internal Message being tombstoned. Wire shape pending a dedicated schema.",
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Emitted when a previously-yielded message is superseded or removed from the transcript (e.g., streaming\u2192non-streaming fallback removes a partial orphan). Consumers that render or persist the stream should remove the referenced message. From internal QueryEvent 'tombstone'.",
    ),
  );
  SDKConversationResetMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("conversation_reset"),
      new_conversation_id: _(),
      uuid: _(),
      session_id: stringSchema(),
      trigger: _enum(["clear", "plan_mode_exit", "fresh_session", "onboarding"])
        .optional()
        .describe(
          "What discarded the conversation: 'clear' is the /clear command (or its /reset and /new aliases), 'plan_mode_exit' is leaving plan mode with the clear-context option, 'fresh_session' is a flow that starts a fresh session to implement an approved plan, 'onboarding' is an onboarding flow re-run inside an existing session. Informational: a consumer should reset on every conversation_reset frame whatever this says, and treat an absent (older emitter) or unrecognized value as an unspecified reset.",
        ),
      user_message_uuid: stringSchema()
        .optional()
        .describe(
          "Only with trigger 'clear': the uuid of the user message whose /clear was executed (the client's own uuid for that message when it came from a Remote Control or stream-json client, otherwise the uuid the CLI assigned to the typed command). Lets a consumer match this frame to a /clear message it has already seen, wiping once whichever arrives first, instead of relying on arrival order. Absent for the other triggers, when that uuid is not a canonical UUID, and from older emitters.",
        ),
      timestamp: stringSchema()
        .optional()
        .describe(
          'When the reset happened, as an ISO 8601 string in UTC read from the clock of the process that performed it. Meant for display, such as the time on a "conversation cleared" row, not for ordering frames. Absent from older emitters; a consumer can fall back to the time it received the frame.',
        ),
    }).describe(
      "Emitted by /clear, plan-mode exit, fresh-session, and onboarding flows. The surface should mount a fresh transcript under new_conversation_id and reset any cached session title. From internal QueryEvent 'conversation_reset'.",
    ),
  );
  SDKApiMetricsMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("api_metrics"),
      event: discriminatedUnion("type", [
        objectSchema({
          type: literal("start"),
          ttft_ms: numberSchema().int(),
          id: stringSchema().optional(),
          message_id: stringSchema().optional(),
        }),
        objectSchema({
          type: literal("end"),
          output_tokens: numberSchema().int(),
          id: stringSchema().optional(),
        }),
        objectSchema({
          type: literal("content_block_start"),
          id: stringSchema().optional(),
        }),
        objectSchema({
          type: literal("thinking_progress"),
          estimated_tokens_delta: numberSchema().int(),
          id: stringSchema().optional(),
        }),
        objectSchema({
          type: literal("thinking_signature"),
          chars: numberSchema().int(),
          id: stringSchema().optional(),
        }),
      ]).describe(
        "Per-API-call OTPS/TTFT lifecycle event. Optional id correlates parallel subagent start/end; serial callers omit it.",
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Emitted when a subagent's API call reports TTFT or output_tokens for OTPS (output-tokens-per-second) metering. From internal QueryEvent 'api_metrics' (ApiMetricsLifecycleEvent).",
    ),
  );
  SDKOsNotificationMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("os_notification"),
      message: stringSchema(),
      notification_type: stringSchema(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Emitted when a tool (PushNotificationTool, the Computer Use wrapper) or turn-end cleanup requests a native OS notification. The surface dispatches to its platform notification channel (iTerm2/Kitty/Ghostty/bell in the terminal; native IPC for desktop/IDE). From internal QueryEvent 'os_notification'.",
    ),
  );
  SDKApplyFlagSettingsMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("apply_flag_settings"),
      settings: record(stringSchema(), unknown()).describe(
        "Shallow-merge flag-settings patch \u2014 same shape as SDKControlApplyFlagSettingsRequest.settings.",
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Output-direction counterpart to SDKControlApplyFlagSettingsRequest. Emitted when slash commands that toggle flag settings request a batched write that the surface applies to its AppState. From internal QueryEvent 'apply_flag_settings'.",
    ),
  );
  SDKCommandLifecycleMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("command_lifecycle"),
      command_uuid: stringSchema().describe(
        "The queued command's uuid \u2014 the client-supplied uuid on the inbound message. Commands enqueued without a uuid (e.g. the one-shot `-p \"prompt\"` string path) emit no lifecycle events. Renamed from Engine 'uuid' to avoid collision with the universal message uuid field.",
      ),
      state: _enum(["queued", "started", "completed", "cancelled", "discarded", "refused"]),
      wakeup_source: _enum(["loop_wakeup", "schedule_wakeup"])
        .optional()
        .describe(
          "Only on 'started', and only when the command being started is a scheduler fire. `loop_wakeup`: a ScheduleWakeup (dynamic /loop) wakeup has fired; `scheduled_for` gives the time it was set for. `schedule_wakeup`: any other scheduled-task fire, such as a CronCreate job or the notice for scheduled tasks that were missed. The values match the UserPromptSubmit hook's `source`. A fire removed from the queue without being started (for example by an interrupt with cancel_queued, or by end_session) gets only its terminal state, without this key. Advertised by the `lifecycle_wakeup_source_v1` capability on system/init.",
        ),
      scheduled_for: numberSchema()
        .optional()
        .describe(
          "Only beside `loop_wakeup`: the time, in epoch milliseconds, that the fired wakeup was set for; when a ScheduleWakeup call armed it, this equals the `scheduledFor` in that call's result. The fire itself can come earlier or later than that time. A host that keeps an idle session alive for a wakeup should stop waiting only when this equals the time it is waiting for: while this fire sat in the queue, a turn may have armed a newer wakeup, which is still pending. A fire that never starts (its prompt could not be prepared, the input had closed, or it was removed from the queue) sends no such frame, so the host also needs a time limit of its own past this time.",
        ),
      ran_ahead: literal(true)
        .optional()
        .describe(
          "@internal Only on a repeated 'queued' frame, written only to the VS Code panel: the plugin hooks of this `immediate` command, typed during a turn, have run and answered ahead of its turn. The command is still queued, and its own turn prints the answer.",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Fate of a queued command (slash command or queued user prompt). 'queued' when the inbound message enters the command queue; 'started' when it drains into a turn; then exactly one terminal state: 'completed' \u2014 the turn that consumed it ended cleanly; 'cancelled' \u2014 removed by cancel_async_message (the host's own, or \u2014 with Remote Control enabled (remote_control) \u2014 a remote client withdrawing a prompt that a remote client queued: such a uuid was never sent by the host, so there is nothing to resend and the frame is informational), swept by an interrupt with cancel_queued:true, caught by a pending cancel just before dispatch, or consumed into a turn that was aborted (interrupt) or died on a hard failure (model_error, prompt_too_long, ...) \u2014 cancelled-over-completed is deliberate dup-over-loss for exactly-once resenders, so a fold answered earlier in a failed turn may be re-sent (a per-fold ledger refinement is tracked separately) \u2014 but resenders must not blindly resend on 'cancelled': user-requested removals arrive as the same state, so correlate against your own cancel_async_message responses AND against any interrupt receipt's `cancelled` list (interrupt_cancel_queued_v1) and resend only cancels neither source accounts for; 'discarded' \u2014 the session ended (end_session) with the command still queued, or with a peer message still held by the receive-side policy (not preceded by 'queued' then); 'refused' \u2014 declined by the session's receive-side policy before entering the queue (outright, or after being held): not preceded by 'queued', and it will not run in this session. Known gap: folds consumed by turns ending via max_turns / hook_stopped / tool_deferred / background_requested report 'completed' even though their content may only be answered on continuation/resume. A prompt sent with requeue_if_interrupted_within_ms that an interrupt puts back reports 'queued' again (after its 'started', if that was reported), then goes on as any queued prompt does. 'completed' means the consuming turn ended, not that the result frame was delivered. Ordering relative to the result frame is per-path: a command that starts a fresh turn emits 'completed' AFTER that turn's result frame (later still when the result is held back for background tasks); a command folded into an already-in-flight turn emits 'completed' BEFORE that turn's result frame. Not a strict pairing: a terminal state may arrive for a command_uuid that never emitted 'started' (control-request ACKs, duplicate deliveries); internally-enqueued commands (cron triggers, teammate shutdown prompts, deferred-turn resume) mint a fresh uuid at enqueue and emit started/terminal without 'queued'; a turn that fails by throwing can leave 'started' without a terminal state; and a peer message the queue's own admission guard drops after acceptance (rate limit, duplicate collapse, loop guard, queued-peer cap) currently leaves 'queued' without a terminal state \u2014 on process exit a wrapper should synthesize 'discarded' for uuids it has not seen reach a terminal state. The exactly-one-terminal guarantee is per worker process, not per uuid lifetime: after CCR redelivery a 'discarded' uuid legitimately re-emits queued\u2192\u2026\u2192terminal on the next worker. Emitted on the stdout stream in -p/SDK sessions; remote transports (mobile/desktop bridge) receive the equivalent signal via delivery ACKs instead. A host driving a cloud-hosted session through the headless `--cloud` client also receives 'cancelled' (and only that state) after its interrupt with cancel_queued:true, synthesized from the session's receipt: for a uuid the host sent and did not cancel itself it means the cloud session dropped that command \u2014 it will not run; do not resend it; the frames follow the interrupt's success response, are not ordered against the interrupted turn's result, and unknown uuids (another client's prompt) may appear. From internal QueryEvent 'command_lifecycle'.",
    ),
  );
  SDKSystemCodeChangePublishedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("code_change_published"),
      provider: stringSchema().describe(
        "Forge classification derived from the URL's shape: 'github', 'github-enterprise', 'gitlab', or 'bitbucket' for pull/merge requests, 'gerrit' for a change on a googlesource.com Gerrit host, and other values for other review systems in internal builds. A naming hint, not host trust \u2014 an unrecognized host with a PR-shaped path classifies as 'github-enterprise'. Open set; treat an unknown value as a valid provider you don't recognize, never as an error.",
      ),
      url: stringSchema().describe(
        "Web URL of the published change, as printed in the command output. Unverified \u2014 do not route authenticated requests to this host without your own validation.",
      ),
      repo: stringSchema().describe(
        "Repository path from the URL (owner/name on GitHub; may carry more segments on GitLab). Shape-validated (forge path segments only; exactly owner/name except on GitLab) but not verified against any forge \u2014 on GitLab a leading segment can be a nested group, so never interpret it as a host.",
      ),
      identifier: stringSchema().describe(
        "Provider-native change identifier \u2014 the PR/MR (or other change) number as a string.",
      ),
      action: _enum([
        "created",
        "edited",
        "merged",
        "commented",
        "closed",
        "reopened",
        "ready",
        "draft",
        "auto-merge-enabled",
        "auto-merge-disabled",
        "pushed",
        "checked-out",
        "started",
      ])
        .optional()
        .describe(
          "What the session did that produced this announcement: the flag-aware gh pr verb it ran ('created', 'closed', 'auto-merge-enabled', \u2026), 'pushed' for a push to a branch that has a PR (or a push that opened or updated a Gerrit change), 'checked-out' for gh pr checkout, or 'started' for the open change on the branch the session's working directory was on when a Claude Desktop session started or resumed (sent once, at the first initialize) \u2014 always sent by current producers, absent only from older ones.",
        ),
      branch: stringSchema()
        .optional()
        .describe(
          "The session's working branch when it produced the change. Sent for providers whose changes have no head branch of their own ('gerrit'), so a host can place the change on that checkout, and with 'created' on any provider: the branch the create was opened from (its --head / --source-branch flag, else the working branch), so a host can show the new change before its own forge lookup answers. Absent otherwise.",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal A code change from this session went out for review (a pull/merge request, or another provider's change in internal builds). Fires when the harness sees the change published or links the session to a PR \u2014 on creation, and also when the session contributes to an existing one (gh pr edit/close/ready, gh pr checkout, a push to a branch that has an open PR) \u2014 so bind on every event, not just the first; re-emission for the same URL is possible and idempotent. Provenance: values are scraped from the command's captured output (the last PR-shaped URL printed) or a gh pr view lookup. Captured output is not only the forge CLI's own text \u2014 hook output or files printed by the same command can contribute \u2014 so treat the fields as a binding hint: display them, but verify against the forge with your own credential-scoped lookup before routing authenticated requests or trusting the host. Best-effort, not exhaustive: a crash before the link, gh printing no URL to a piped capture (gh pr merge), or an unrecognized forge means no event \u2014 keep your provider-API lookup as the source of truth and treat this as the trigger.",
    ),
  );
  SDKSystemVcsStateChangedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("vcs_state_changed"),
      kind: _enum(["commit", "push", "merge", "rebase"]).describe(
        "What class of mutation was observed. New kinds may be added \u2014 treat an unrecognized kind exactly like a recognized one (something changed, go look).",
      ),
      cwd: stringSchema().describe(
        "The directory the shell was in when the command finished (so an inner cd is reflected; a git -C target is not) \u2014 a hint about where to look, never proof of what moved: confirm against the repository itself.",
      ),
      branch: stringSchema()
        .optional()
        .describe(
          "The branch a commit landed on (from the commit summary line git prints per commit) or a push updated (from the ref-update line git prints per pushed ref, e.g. `HEAD -> other`). Commit and push events carry it; a command that pushed several branches emits one push event per branch. A best-effort hint: absent whenever attribution is uncertain (a push whose output was redirected still emits, with no branch; a push that also updated a ref whose name could not be carried emits a nameless event beside the named ones), and never a required key.",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal A harness-observed shell command mutated repository state (git commit/cherry-pick, push, merge, rebase \u2014 dry runs excluded). A cache-invalidation signal with a deliberately minimal payload: beyond classification it carries the branch acted on and the directory the shell finished in, both hints about where to look, so consumers still re-read state (head, PR status) from the repository instead of decoding the event. Derived from the same detection as the tool result's structured gitOperation data, so the two agree on what happened; only a push's `branch` is attributed more strictly here (from the push's own output section) than in that data. A compound command can emit more than one kind (a merge and a rebase in one command collapse to the latter), and a push of several branches emits one push event per branch; coalesce freely. Best-effort, not exhaustive: only foreground mutations run through the Bash/PowerShell tools are observed \u2014 a backgrounded command whose confirming output had not printed at capture time emits nothing. A foreground push whose ref lines were redirected or silenced still emits, on the invoking command's zero exit code alone (so a compound that swallows a failed push's code also emits; the event is a prompt to look, never a claim).",
    ),
  );
  SDKSystemDevIntentMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("dev_intent"),
      kind: _enum(MOBILE_APP_KINDS).describe(
        "What kind of development the evidence shows. 'ios_app' from the conversation (in the main thread or a subagent): Claude ran one of Apple's tools for an iOS SDK, an iOS destination or the Simulator (xcodebuild, xcrun or swift for an iOS SDK, destination or target, simctl, devicectl), wrote iOS source into a Swift or Objective-C file (import UIKit, an import of a UIKit header, or an .iOS platform in a package manifest), or wrote or read build settings that name an iOS SDK or target iPhone or iPad; no Swift edit is needed for these. A command counts only where the shell would run it, so one that is quoted, in a here-document or in a comment does not. Weaker evidence (an iOS deployment target, any other TARGETED_DEVICE_FAMILY setting, iOS source written into another kind of file, an iOS tool named inside a quoted script) counts only beside a .swift file that Claude wrote or edited. A macOS-only app or server-side Swift package never qualifies. 'ios_app' from the project scan: the session's git repository has an Xcode project, at its root or in its ios/, iosApp/, macos/ or apple/ folder, whose build settings name an iOS SDK or target iPhone or iPad. 'android_app' from the conversation: Claude wrote or edited a .kt, .kts or .java file and something it wrote, read, or ran is Android-specific (a manifest, the Android Gradle plugin, an android.* import, adb, a Gradle variant task such as assembleDebug, the emulator), so a Kotlin server or a multiplatform module with no Android target never qualifies. 'android_app' from the project scan: the session's git repository has an AndroidManifest.xml, or the Android Gradle plugin in a build script or version catalog, at its root or in its android/ folder. More kinds will be added; ignore a kind you do not recognize.",
      ),
      trigger: _enum(MOBILE_DEV_SIGNALS)
        .optional()
        .describe(
          "The evidence the detection fired on, for a host's own analytics. From the conversation, it is the first platform-specific evidence seen, whichever order it and a file edit the rule required arrived in; an 'ios_app' detection with no Swift edit names the first evidence that is enough alone. 'ios_app': 'uikit_import' (import UIKit or .iOS( in text Claude wrote), 'xcode_project' (iOS build settings written, or seen in a tool result such as a pbxproj or xcconfig read), 'ios_command' (an iOS SDK, an iOS destination or target, or the Simulator's tools, in a command Claude ran). 'android_app': 'android_import' (import android. in text Claude wrote), 'android_manifest' (a manifest path or body written, or seen in a tool result), 'gradle_plugin' (the Android Gradle plugin written, or seen in a tool result), 'android_command' (adb, the emulator, sdkmanager, avdmanager, react-native run-android or a Gradle variant task). The edit values 'swift_edit', 'kotlin_edit' and 'java_edit' are reserved for rules that need no other evidence; no rule sends them yet. 'project_scan', for any kind: a scan of the session's git repository. The CLI scans when the process starts and sends the result. After each conversation_reset, it sends the latest scan's result again. A conversation whose scan did not find every kind scans again, uncached, when its first message arrives, so a kind that scan missed can come after that message. A client that needs to tell project evidence from conversation evidence checks for 'project_scan'. More values will be added; ignore one you do not recognize. Absent from CLI versions that predate the field, which send only conversation evidence.",
        ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal The conversation, or the git repository it runs in, shows a known kind of development work, for hosts that key tooling on it (Claude Code Desktop opens its iOS Simulator entry point on ios_app). Sent with trigger as its only other payload. Per conversation per process, each kind is sent at most once from conversation evidence and at most once from the project scan. Conversation evidence is sent when it first completes, or at startup when a resumed conversation already has it. Project evidence comes from a CLI process in print mode (-p), which is how the Agent SDK and Claude Code Desktop start it. It is sent at startup, after each conversation_reset, and at the first message of a conversation whose earlier scan did not find every kind. Either can arrive before system/init. A rewind or compaction never retracts it and only a conversation_reset starts over. Treat each kind as a sticky fact about the conversation: a client that needs only the kind can ignore repeats, and one that needs to know what set it off reads trigger.",
    ),
  );
  SDKSystemTurnPreemptedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("turn_preempted"),
      reason: stringSchema().describe(
        "Why the turn was stopped. 'rapid_followup': the user's next message arrived before the running turn showed any output. More reasons may be added; treat an unknown one the same way.",
      ),
      preempted_by_uuid: stringSchema().describe(
        "The client-supplied uuid of the queued user message the turn was stopped for. It runs next, together with any messages queued behind it.",
      ),
      preempted_message_uuids: array(stringSchema()).describe(
        "The client-supplied uuids of the user messages the stopped turn was running (uuid-less members omitted; may be empty).",
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal The CLI itself stopped the running turn so a user's rapid follow-up message is answered at once, exactly as a priority 'now' message would have (running shell commands are backgrounded, not killed). Sent at the moment of the stop, so it precedes the stopped turn's result frame (terminal_reason aborted_streaming or aborted_tools) and its members' 'cancelled' command_lifecycle frames (it can also precede the follow-up's own 'queued' command_lifecycle frame): a host renders that turn as superseded by the follow-up rather than as interrupted, does not resend its messages, and treats only preempted_by_uuid as picked up. At most one per burst: the turn the follow-up starts is never preempted this way. Emitted on the stdout stream in -p/SDK sessions only, and only to a consumer that declared rapidFollowupPreempt on its initialize request, while the feature's rollout flag is on: without both, the turn is not stopped at all. Explicit 'now' and 'later' priorities never produce it.",
    ),
  );
  SDKSystemPerTurnEffortChangedMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("per_turn_effort_changed"),
      per_turn_effort_active: booleanSchema().describe(
        "Always false: a change to true is reported only by system/init.",
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      `@internal The conversation stopped sending effort per turn, because the server refused its per-turn effort message or a role:"system" message. From the retried request on, an effort change rewrites the cached prefix, for every model, until a later system/init says otherwise. Sent once, when the conversation first turns per-turn effort off, before the retried request's output, on the output stream of -p/SDK sessions; sent again only if the server refuses again after the conversation's refusals are cleared (for example by /clear or a compaction). It can repeat a false the host already holds. Pairs with system/init's per_turn_effort_active.`,
    ),
  );
  SDKSystemFileAttachmentsMissingMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("file_attachments_missing"),
      message_uuid: stringSchema().describe(
        "The uuid of the inbound user message whose file_attachments named the files.",
      ),
      sent_count: numberSchema()
        .int()
        .describe("How many well-formed file_attachments entries that message had."),
      missing: array(
        objectSchema({
          file_uuid: stringSchema().describe("The file_uuid of the message's file_attachments entry."),
          reason: stringSchema().describe(
            "Why, as a short code. 'download': it could not be downloaded. 'too_large': the file is over the size a session accepts, so sending it again cannot help. 'not_found': the files route answered 404 or 410: the file is most likely deleted, or is not this session's to read, so sending it again rarely helps. 'write': it was downloaded and could not be saved. 'no_token': the session had no credential to download with. 'not_finished': the step that fetches a message's files was cut short or threw, so all its files are listed, though some may have been saved. 'count_cap': the message named more files than a session fetches, and this one was over the limit. More codes may be added; read an unknown one as 'did not arrive'.",
          ),
        }),
      ).describe("The files Claude was told did not arrive, each once. Never empty."),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Some files a user message sent by reference (file_attachments) did not arrive where Claude can read them, and Claude was told so in that message's text or in a later note; the turn runs on without them. A host can use it to tell the person who sent them; a session with Remote Control on also sends it to its Remote Control clients itself. Sent once the message is queued, or later when a download or a save that runs beside its turn fails, or both; only for a message that reached the session through Claude Code Remote or over Remote Control, never for input a local host writes; whenever Claude is told, and for the same files. Queued counts as told: a message that a Stop then clears from the queue, or that a UserPromptSubmit hook then blocks, still sends it, though Claude never reads that message. Nothing is sent when every file arrives, when the message is refused or has no uuid (over Remote Control, one not in UUID form counts as none), for another session's message that was first held for approval, when the only files lost are those over the count limit of a message in which an entry carries a sha256 digest, or for a picture that reached Claude inside the message and whose saved copy alone was lost; on claude-code-server the same holds for a text file whose copy was to be written late, at a use of the tool container. A file whose entry carries a sha256 (another session's transfer) is reported to Claude by name instead, and is listed here only under 'not_finished'. Each event states the whole list for its message: a save lost after the message was queued, or a delivery to a new worker, states it again, so keep the last one per message_uuid. If its files all arrive that time nothing is sent, and the earlier event stands. One exception: a worker that takes over a turn already begun, or is sent again a message that its transcript already holds, may fetch and save the message's files again, except pictures and files with a sha256. Its event lists only those it could not fetch or save, so it can leave out a picture an earlier event listed, and can list a file the earlier worker did save.",
    ),
  );
  SDKSystemCloudSessionDeltaMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("system"),
      subtype: literal("cloud_session_delta"),
      seq: numberSchema()
        .int()
        .positive()
        .describe(
          "Rises by one with each of these frames this client writes (1 for the first); never reset by an init. A reader keeps the highest it has applied and drops a lower one.",
        ),
      changed: array(stringSchema()).describe(
        'The top-level keys of `cloud_session` whose value differs from the last block this client wrote (on an init or one of these frames), e.g. ["serving"] or ["calls", "connection"]; never empty. A hint for what to redraw: the block below is complete either way.',
      ),
      cloud_session: attachedDeviceSchema().describe(
        "The whole block exactly as the next init would carry it (see SDKSystemMessage.cloud_session): replace the held copy, do not merge.",
      ),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Written by the headless stream-json client of a cloud-hosted session (the same client that puts `cloud_session` on its init frames), and by nothing else: the session's status changed between two inits \u2014 for instance this machine's serving word or its reason, its stream to the session (`connection`), a call it serves starting, waiting on the session's approval or ending (`calls`), a serving notice said (`notices`). Only after the first init \u2014 except from a serve-only helper (`--attach-serve`), whose stream to the session carries no init: it writes these from the start, its first (`seq` 1) listing every key of the block in `changed`, so a host that has read no init takes that frame's block as its first snapshot. At most a few per second (changes within a quarter second are written as one frame carrying the latest block); none when nothing differs. An init is always a complete snapshot, so a host that (re)attaches resynchronises from the first init it reads and applies these on top. Display-only; ignore it if you do not draw session status.",
    ),
  );
  SDKSetExpandedViewMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("set_expanded_view"),
      expanded_view: _enum(["none", "tasks", "teammates"]),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Hint to expand a side panel. Enum is a superset of AppState.expandedView for back-compat; do not narrow.",
    ),
  );
  SDKActiveGoalMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("active_goal"),
      value: objectSchema({
        condition: stringSchema(),
        iterations: numberSchema().int(),
        set_at: numberSchema().int(),
        tokens_at_start: numberSchema().int(),
        last_reason: stringSchema().optional(),
      }).nullable(),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "Emitted when the user's /goal Stop hook reports met (clears) or not-yet-met (bumps iterations + last_reason). Any surface with a goal indicator re-renders from this. value is null when the goal is cleared. From internal QueryEvent 'active_goal'.",
    ),
  );
  SDKAutocompactStateMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("autocompact_state"),
      value: objectSchema({
        enabled: booleanSchema().describe(
          "Whether auto-compact is enabled on the worker (autoCompactEnabled setting + DISABLE_AUTO_COMPACT / DISABLE_COMPACT env; DISABLE_COMPACT also disables manual /compact).",
        ),
        effective_window: numberSchema()
          .int()
          .describe(
            "The worker's resolved auto-compact window in tokens \u2014 resolveAutoCompactWindow output clamped to the model window, honoring /autocompact, CLAUDE_CODE_AUTO_COMPACT_WINDOW, clientdata and experiment overrides.",
          ),
        threshold: numberSchema()
          .int()
          .describe(
            "The token count where threshold-triggered compaction fires on the worker \u2014 effective_window minus the summary buffer, lowered further by CLAUDE_AUTOCOMPACT_PCT_OVERRIDE when set.",
          ),
        enforced: booleanSchema().describe(
          "Whether threshold-triggered compaction will actually fire at `threshold`. False when the worker defers to the API's prompt-too-long (reactive mode) or context collapse owns headroom \u2014 clients then show % of window used instead of a countdown to a compaction that won't happen.",
        ),
        source: _enum([
          "env",
          "settings",
          "clientdata",
          "experiment",
          "model-default",
          "unknown-model",
          "auto",
        ]).describe("Which input decided the window (resolveAutoCompactWindow precedence order)."),
      }),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      `@internal Worker-resolved auto-compact state, emitted by CCR workers at boot, whenever the resolved state changes (/autocompact, model switch, settings change), re-checked at each turn start, and re-emitted after a conversation reset. Thin clients adopt it so the "% until auto-compact" indicator counts down to the worker's real compaction trigger instead of re-resolving against client-local state. Turn-scoped divergence is accepted: a turn running under a skill/command frontmatter model override compacts against that model's window while the frame keeps the resting model's (the local indicator shares this limitation). From sessionState.onAutocompactInputsChanged.`,
    ),
  );
  SDKSetInProgressToolUseIdsMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("set_in_progress_tool_use_ids"),
      op: objectSchema({
        action: _enum(["add", "remove"]),
        ids: array(stringSchema()),
      }),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Emitted when tool execution adds/removes tool_use ids from the mid-execution set (after permission grant, before result). Surfaces use this to show which tools are running. From internal QueryEvent 'set_in_progress_tool_use_ids'.",
    ),
  );
  SDKHintClearsMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("hint_clears"),
      ids: array(stringSchema()),
      content_by_id: record(stringSchema(), stringSchema()),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Emitted when the server-side context-hint reject path reports cleared tool_use ids after a retry/fallback. The surface re-runs clearToolResultsById on its message list so subsequent turns match the API's view. From internal QueryEvent 'hint_clears'.",
    ),
  );
  SDKOpenMessageSelectorMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("open_message_selector"),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Emitted by /rewind to open the message-selector overlay. Fire-and-forget \u2014 the user's selection returns through a separate channel. From internal QueryEvent 'open_message_selector'.",
    ),
  );
  SDKCompactProgressMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("compact_progress"),
      event: discriminatedUnion("type", [
        objectSchema({
          type: literal("hooks_start"),
          hook_type: _enum(["pre_compact", "post_compact", "session_start"]),
        }),
        objectSchema({
          type: literal("compact_start"),
          hint_text: stringSchema().nullable().optional(),
        }),
        objectSchema({
          type: literal("compact_end"),
        }),
      ]).describe("In-progress compaction lifecycle event."),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Emitted while compaction is running (hook phase, compact start, compact end). Distinct from system/compact_boundary, which reports the post-compaction transcript boundary after completion. From internal QueryEvent 'compact_progress' (CompactEvent Delta-track arm).",
    ),
  );
  SDKStreamModeMessageSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("stream_mode"),
      mode: _enum(["tool-input", "tool-use", "requesting", "responding", "thinking"]),
      uuid: _(),
      session_id: stringSchema(),
    }).describe(
      "@internal Emitted when the engine's spinner phase changes during compaction. From internal QueryEvent 'stream_mode' (CompactEvent Delta-track arm).",
    ),
  );
  SDKResponseLengthMessageSchema = DoctorLazy(() =>
    discriminatedUnion("op", [
      objectSchema({
        type: literal("response_length"),
        op: literal("add"),
        delta: numberSchema().int(),
        uuid: _(),
        session_id: stringSchema(),
      }),
      objectSchema({
        type: literal("response_length"),
        op: literal("reset"),
        uuid: _(),
        session_id: stringSchema(),
      }),
    ]).describe(
      "@internal Emitted to drive the streaming-output character counter in the spinner ('add' accumulates, 'reset' zeroes on compaction-boundary swap). From internal QueryEvent 'response_length' (Delta-track).",
    ),
  );
  SDKRefusalContinuationMessageSchema = DoctorLazy(() =>
    discriminatedUnion("phase", [
      objectSchema({
        type: literal("refusal_continuation"),
        phase: literal("begin"),
        salvage_text: stringSchema(),
        uuid: _(),
        session_id: stringSchema(),
      }),
      objectSchema({
        type: literal("refusal_continuation"),
        phase: literal("end"),
        uuid: _(),
        session_id: stringSchema(),
      }),
    ]).describe(
      "@internal Emitted when a silent refusal-continuation retry begins ('begin' with salvage_text to keep visible in the streaming preview) or ends ('end'). From internal QueryEvent 'refusal_continuation'.",
    ),
  );
  SDKSessionInfoSchema = DoctorLazy(() =>
    objectSchema({
      sessionId: stringSchema().describe("Unique session identifier (UUID)."),
      summary: stringSchema().describe(
        "Display title for the session: custom title, auto-generated summary, or first prompt.",
      ),
      lastModified: numberSchema().int().describe("Last modified time in integer milliseconds since epoch."),
      fileSize: numberSchema()
        .int()
        .optional()
        .describe("File size in bytes. Only populated for local JSONL storage."),
      customTitle: stringSchema().optional().describe("User-set session title via /rename."),
      firstPrompt: stringSchema().optional().describe("First meaningful user prompt in the session."),
      gitBranch: stringSchema().optional().describe("Git branch at the end of the session."),
      cwd: stringSchema().optional().describe("Working directory for the session."),
      tag: stringSchema().optional().describe("User-set session tag."),
      createdAt: numberSchema()
        .int()
        .optional()
        .describe(
          "Creation time in integer milliseconds since epoch, extracted from the first entry's timestamp.",
        ),
    }).describe("Session metadata returned by listSessions and getSessionInfo."),
  );
  SDKMessageSchema = DoctorLazy(() =>
    union([
      SDKAssistantMessageSchema_2(),
      SDKUserMessageBaseSchema(),
      SDKReplayMessageSchema(),
      ResultMessageSchema(),
      SDKSystemInitMessageSchema(),
      SDKStreamEventMessageSchema(),
      SDKSystemCompactBoundaryMessageSchema(),
      SDKSystemStatusMessageSchema(),
      SDKSystemApiRetryMessageSchema(),
      SDKSystemControlRequestProgressMessageSchema(),
      SDKSystemModelRefusalFallbackMessageSchema(),
      SDKSystemModelRefusalNoFallbackMessageSchema(),
      SDKSystemLocalCommandOutputMessageSchema(),
      SDKSystemHookStartedMessageSchema(),
      SDKSystemHookProgressMessageSchema(),
      SDKSystemHookResponseMessageSchema(),
      SDKSystemPluginInstallMessageSchema(),
      SDKToolProgressMessageSchema(),
      SDKAuthStatusMessageSchema(),
      SDKSystemTaskNotificationMessageSchema(),
      SDKSystemTaskStartedMessageSchema(),
      SDKSystemTaskUpdatedMessageSchema(),
      SDKSystemTaskProgressMessageSchema(),
      SDKSystemBackgroundTasksChangedMessageSchema(),
      SDKSystemThinkingTokensMessageSchema(),
      SDKSystemSessionStateChangedMessageSchema(),
      SDKSystemWorkerShuttingDownMessageSchema(),
      SDKSystemInheritedAsksSettledMessageSchema(),
      SDKSystemCommandsChangedMessageSchema(),
      SDKSystemNotificationMessageSchema(),
      SDKSystemFilesPersistedMessageSchema(),
      SDKToolUseSummaryMessageSchema(),
      SDKSystemMemoryRecallMessageSchema(),
      SDKRateLimitEventMessageSchema(),
      SDKSystemElicitationCompleteMessageSchema(),
      SDKSystemPermissionDeniedMessageSchema(),
      SDKPromptSuggestionMessageSchema(),
      SDKSystemMirrorErrorMessageSchema(),
      SDKSystemInformationalMessageSchema(),
      SDKConversationResetMessageSchema(),
      SDKCommandLifecycleMessageSchema(),
      SDKSystemCodeChangePublishedMessageSchema(),
      SDKSystemVcsStateChangedMessageSchema(),
      SDKSystemFeedbackDraftQueuedMessageSchema(),
      SDKSystemUiInvalidateMessageSchema(),
      SDKSystemUiLogMessageSchema(),
      SDKSystemUiToastMessageSchema(),
      SDKSystemUiStatusMessageSchema(),
      SDKSystemCloudSessionDeltaMessageSchema(),
      SDKSystemDevIntentMessageSchema(),
      SDKSystemSessionTitleChangedMessageSchema(),
      SDKSystemTurnHandoffAvailableMessageSchema(),
      SDKSystemTurnPreemptedMessageSchema(),
      SDKSystemPeerMessageHoldMessageSchema(),
      SDKSystemPerTurnEffortChangedMessageSchema(),
      SDKSystemPermissionCheckStatusMessageSchema(),
      SDKSystemUiPanesMessageSchema(),
      SDKSystemUiPlacedMessageSchema(),
      SDKSystemUiScrollMessageSchema(),
      SDKSystemUiFocusMessageSchema(),
      SDKSystemInstructionSizeWarningMessageSchema(),
      SDKSystemFileAttachmentsMissingMessageSchema(),
    ]).describe(
      "Every conversational and informational message the CLI emits on its output stream, discriminated by type (and subtype for system/result messages). Consumers should ignore types and subtypes they do not recognize: the set grows over time.",
    ),
  );
  FastModeStateSchema = DoctorLazy(() =>
    _enum(["off", "cooldown", "on"]).describe(
      "Fast mode state: off, in cooldown after rate limit, or actively enabled.",
    ),
  );
  FastModeBlockedReasonSchema = DoctorLazy(() =>
    _enum([
      "free",
      "preference",
      "extra_usage_disabled",
      "network_error",
      "unknown",
      "not_first_party",
      "disabled_by_env",
      "model_not_allowed",
      "sdk_opt_in_required",
      "pending",
    ]).describe(
      "Why fast mode can't serve right now. Absent when nothing blocks it (a request may still choose standard speed). A paused-after-rate-limit run is not here; it rides fast_mode_state as 'cooldown'.",
    ),
  );
  FooterIndicatorSchema = DoctorLazy(() =>
    objectSchema({
      text: stringSchema().describe(
        "The label to show \u2014 already sanitized to a single line of plain text and capped at 6 columns, exactly as the terminal footer renders it after its \u25C6 glyph.",
      ),
    }).describe(
      '@internal The session indicator (the CLAUDE_CODE_FOOTER_INDICATOR environment variable, else the footer_indicator_<text> capability of the main model, else bootstrap client_data.footer_indicator) that the terminal renders as a "\u25C6 <text>" pill in the prompt footer \u2014 an opaque status note operators set per cohort (e.g. to prove a test config reached the session). Carried on `system/init` and the `initialize` response so a host UI (Claude Desktop, IDE webviews) can render the same pill. Absent when nothing is configured; hosts should then render nothing. The client_data source is read from the CLI\'s cached bootstrap data, so a label configured there after that cache was last written first appears on a later `system/init`.',
    ),
  );
});
//@ chunk-55ht3bcx.js:22629-22687 placement
function currentAccessTokenHash() {
  let accessToken = getClaudeAIOAuthTokens()?.accessToken;
  return accessToken ? tokenDigest(accessToken) : null;
}
//@ chunk-55ht3bcx.js:22687-22780 fingerprint (2.1.88 match: ApiKeySourceSchema, 0.32)
function ApiKeySourceSchema_2() {
  let policyLimitsState = getPolicyLimitsState();
  try {
    getPolicyPrincipal();
  } catch {
    return null;
  }
  return policyLimitsState.principalRung === "oauth" ? currentAccessTokenHash() : null;
}
//@ chunk-hwmsct5x.js:221838-222410 fingerprint (2.1.88 match: ModelInfoSchema, 0.311)
/**
 * 把模型选项列表转成 SDK 的模型信息（value、resolvedModel、displayName、支持的 effort 等级、adaptive thinking、fast mode、auto mode 等）。
 */
function toSdkModelInfos(options) {
  return options.map((option) => {
    let value = option.value === null ? "default" : option.value;
    let resolvedModel = value === "default" ? getDefaultMainLoopModel() : parseUserSpecifiedModel(value);
    let supportsEffort = modelSupportsEffort(resolvedModel);
    let supportsAdaptiveThinking = modelSupportsAdaptiveThinkingByCatalog(resolvedModel);
    let supportsFast = supportsFastMode(option.value);
    let supportsAutoMode = modelSupportsAutoMode(resolvedModel);
    return {
      value,
      resolvedModel,
      displayName: option.label,
      description: option.description,
      ...(option.promoListPrice !== undefined && {
        promoListPrice: option.promoListPrice,
      }),
      ...(supportsEffort && {
        supportsEffort: true,
        supportedEffortLevels: EFFORT_LEVELS.filter((effortLevel) => {
          if (effortLevel === "max" && !modelSupportsMaxEffort(resolvedModel)) return false;
          if (effortLevel === "xhigh" && !modelSupportsXhighEffort(resolvedModel)) return false;
          return true;
        }),
      }),
      ...(supportsAdaptiveThinking && {
        supportsAdaptiveThinking: true,
      }),
      ...(supportsFast && {
        supportsFastMode: true,
      }),
      ...(supportsAutoMode && {
        supportsAutoMode: true,
      }),
      supportsThinkingOff: !isThinkingAlwaysOn(resolvedModel),
      ...(option.disabled && {
        disabled: true,
      }),
    };
  });
}
//@ chunk-bfnfj4kx.js:51583-51666 fingerprint (2.1.88 match: BaseOutputFormatSchema, 0.369)
var BaseOutputFormatSchema = (outputFormat, options) =>
  outputFormat?.type === "MemberExpression" &&
  outputFormat.object === options &&
  !outputFormat.computed &&
  !outputFormat.optional;
//@ chunk-w5ndchqs.js:21455-24419 fingerprint (2.1.88 match: SDKRateLimitInfoSchema, 0.358)
/**
 * 生成额度/速率限制提示文本（5 小时/7 天/超额/组织限额等分支）。
 */
function formatRateLimitMessage(limits, model) {
  let isUsageBased = isUsageBasedBilling();
  let isConsumer = isConsumerPlan();
  let adminSuffix = isConsumer ? "" : " \xB7 contact your admin to increase it";
  let resetsAt = limits.resetsAt;
  let resetText = resetsAt ? formatResetTimeWithLocale(resetsAt, true) : undefined;
  let overageResetText = limits.overageResetsAt
    ? formatResetTimeWithLocale(limits.overageResetsAt, true)
    : undefined;
  let resetSuffix = resetText ? ` \xB7 resets ${resetText}` : "";
  let limitReachedText;
  let getLimitReachedText_ = () => {
    if (limitReachedText === undefined) limitReachedText = getLimitReachedText(limits, resetSuffix, model);
    return limitReachedText;
  };
  let isWindowedLimit =
    limits.rateLimitType === "five_hour" ||
    limits.rateLimitType === "seven_day" ||
    limits.rateLimitType === "seven_day_opus" ||
    limits.rateLimitType === "seven_day_sonnet" ||
    limits.rateLimitType === "seven_day_overage_included";
  let showsWindowReset = () =>
    limits.rateLimitType === "seven_day_overage_included" ||
    !(isUsageCreditsOnlyModel(model) && isModelBilledOrRequired(model) && !usesPayAsYouGo());
  if (
    !isUsageBased &&
    limits.overageDisabledReason &&
    isWindowedLimit &&
    !ORG_SPEND_CAP_REASONS.has(limits.overageDisabledReason) &&
    showsWindowReset()
  ) {
    let text = getLimitReachedText_();
    if (text !== null) return text;
  }
  if (!isUsageBased && limits.overageScope === "group_pool") {
    let windowLabel = rateLimitWindowLabel(limits);
    let windowResetSuffix =
      windowLabel && showsWindowReset()
        ? ` \xB7 your ${windowLabel.limitName} resets ${windowLabel.resetTime}`
        : "";
    let raiseSuffix = isConsumer
      ? ` \xB7 raise it at ${HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE}`
      : ` \xB7 ask your admin to raise it at ${HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE}`;
    return formatLimitReachedText("team's shared budget", `${raiseSuffix}${windowResetSuffix}`, model);
  }
  if (
    !isUsageBased &&
    limits.overageDisabledReason &&
    ORG_SPEND_CAP_REASONS.has(limits.overageDisabledReason)
  ) {
    let isSpendCap = limits.overageDisabledReason === "org_spend_cap_reached";
    let subscriptionType = getSubscriptionType();
    let isTeamPlan = subscriptionType === "team" || subscriptionType === "enterprise";
    let windowLabel = rateLimitWindowLabel(limits);
    let windowInfo = windowLabel && showsWindowReset() ? windowLabel : null;
    let windowSuffix = windowInfo ? ` \xB7 your ${windowInfo.limitName} resets ${windowInfo.resetTime}` : "";
    if (limits.overageScope === "channel")
      return formatLimitReachedText(CHANNEL_SPEND_LIMIT_TEXT, `${ORG_RAISE_HINT}${windowSuffix}`, model);
    if (isTeamPlan) {
      let usageCreditsCommand = getUsageCreditsCommand();
      let raiseHint = isConsumer
        ? usageCreditsCommand
          ? ` \xB7 run ${usageCreditsCommand} to raise it, or visit ${HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE}`
          : ` \xB7 visit ${HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE} to raise it`
        : getAskAdminSuffix();
      return formatLimitReachedText(
        isSpendCap ? INDIVIDUAL_SPEND_LIMIT_TEXT : "org's monthly spend limit",
        `${raiseHint}${windowSuffix}`,
        model,
      );
    }
    let limitName = isConsumer
      ? "monthly spend limit"
      : isSpendCap
        ? INDIVIDUAL_SPEND_LIMIT_TEXT
        : "org's monthly spend limit";
    let raiseHint = isConsumer
      ? ` \xB7 raise it at ${USAGE_SETTINGS_URL}`
      : ` \xB7 ask your admin to raise it at ${HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE}`;
    return formatLimitReachedText(limitName, `${raiseHint}${windowSuffix}`, model);
  }
  if (limits.overageStatus === "rejected") {
    let resetSuffix = "";
    if (resetsAt && limits.overageResetsAt) {
      if (resetsAt < limits.overageResetsAt) resetSuffix = ` \xB7 resets ${resetText}`;
      else resetSuffix = ` \xB7 resets ${overageResetText}`;
    } else if (resetText) resetSuffix = ` \xB7 resets ${resetText}`;
    else if (overageResetText) resetSuffix = ` \xB7 resets ${overageResetText}`;
    if (limits.overageDisabledReason === "out_of_credits") {
      if (isUsageBased)
        return isConsumer
          ? "Your org is out of usage \xB7 add funds to continue"
          : "Your org is out of usage \xB7 contact your admin";
      let progressSavedSuffix = resetSuffix !== "" && isVellumAnchorEnabled() ? " \xB7 progress saved" : "";
      return `You're out of usage credits${resetSuffix}${progressSavedSuffix}`;
    }
    if (limits.overageDisabledReason && ORG_SPEND_CAP_REASONS.has(limits.overageDisabledReason)) {
      let overageResetSuffix = overageResetText ? ` \xB7 resets ${overageResetText}` : "";
      if (limits.overageScope === "channel")
        return formatLimitReachedText(
          CHANNEL_USAGE_LIMIT_TEXT,
          `${ORG_RAISE_HINT}${overageResetSuffix}`,
          model,
        );
      return formatLimitReachedText(
        limits.overageDisabledReason === "org_spend_cap_reached"
          ? INDIVIDUAL_USAGE_LIMIT_TEXT
          : "org's monthly usage limit",
        overageResetSuffix,
        model,
      );
    }
    if (
      limits.overageDisabledReason === "seat_tier_level_disabled" ||
      limits.overageDisabledReason === "seat_tier_zero_credit_limit"
    )
      return `Your seat type doesn't include ${isUsageBased ? "usage" : "usage credits"}`;
    if (limits.overageDisabledReason === "org_service_level_disabled")
      return "This service is disabled for your org";
    if (
      limits.overageDisabledReason === "member_level_disabled" ||
      limits.overageDisabledReason === "member_zero_credit_limit"
    )
      return `Your usage allocation has been disabled by your admin${getAskAdminSuffix()}`;
    if (limits.overageDisabledReason === "group_zero_credit_limit")
      return `Your group's usage limit is set to $0${getAskAdminSuffix()}`;
    if (isUsageBased) return formatLimitReachedText("usage limit", adminSuffix, model);
    return formatLimitReachedText("limit", resetSuffix, model, {
      progressSavedSuffix: resetSuffix !== "" && isVellumAnchorEnabled(),
    });
  }
  if (isWindowedLimit) {
    let text = getLimitReachedText_();
    if (text !== null) return text;
  }
  if (isUsageBased) return formatLimitReachedText("usage limit", adminSuffix, model);
  return formatLimitReachedText("usage limit", resetSuffix, model, {
    progressSavedSuffix: resetSuffix !== "" && isVellumAnchorEnabled(),
  });
}
//@ chunk-spwda8nt.js:2561-4008 fingerprint (2.1.88 match: SDKAssistantMessageErrorSchema, 0.314)
/**
 * API 错误类型 → 轮后摘要的 {state: blocked/failed, needs: 提示}（登录、组织禁用 OAuth、限额、过载、请求过大等）。
 */
function classifyApiErrorForSummary(error, message = "", reason) {
  if (reason === "dlp_request_denied" || reason === "safety_monitor_blocked")
    return {
      state: "failed",
      needs: "API error",
    };
  switch (error) {
    case "authentication_failed":
      return {
        state: "blocked",
        needs: "login required \u2014 run /login",
      };
    case "oauth_org_not_allowed":
      return message === SUBSCRIPTION_PAYMENT_ISSUE_MESSAGE
        ? {
            state: "blocked",
            needs: "can't use subscription \u2014 pay or renew, or use API key",
          }
        : {
            state: "blocked",
            needs: "org disabled OAuth \u2014 use API key or ask admin",
          };
    case "account_on_hold":
      return {
        state: "blocked",
        needs: "account on hold \u2014 see detail",
      };
    case "cloud_credential_error":
      return {
        state: "blocked",
        needs: "cloud credentials unavailable \u2014 check or refresh them",
      };
    case "verification_required":
      return {
        state: "blocked",
        needs: VERIFICATION_REQUIRED_NEEDS,
      };
    case "billing_error":
      return {
        state: "blocked",
        needs: "usage limit reached \u2014 check plan",
      };
    case "rate_limit":
      return {
        state: "blocked",
        needs: "rate limited \u2014 wait and retry",
      };
    case "overloaded":
      return {
        state: "blocked",
        needs: "API overloaded \u2014 wait and retry",
      };
    case "server_error":
      return {
        state: "blocked",
        needs: "API unavailable \u2014 retry",
      };
    case "invalid_request":
      return /\b(too long|too large|exceeds|token limit|prompt is too long)\b/i.test(message)
        ? {
            state: "blocked",
            needs: "request too large \u2014 /compact or trim",
          }
        : {
            state: "blocked",
            needs: "invalid API request \u2014 see detail",
          };
    case "max_output_tokens":
      return null;
    case undefined:
      return {
        state: "blocked",
        needs: "API error \u2014 see detail",
      };
    case "unknown":
    default:
      return {
        state: "failed",
        needs: "API error",
      };
  }
}
//@ chunk-e6aww6q8.js:38175-38502 affinity
/**
 * 合并两个钩子的权限决定（deny>ask>allow），原因跟随胜者。
 */
function mergePermissionDecisions(left, right) {
  let decisionRank = {
    allow: 1,
    ask: 2,
    deny: 3,
  };
  let rankOf = (permissionDecision) =>
    permissionDecision === undefined ? 0 : decisionRank[permissionDecision];
  let rightIsStronger = rankOf(right.permissionDecision) > rankOf(left.permissionDecision);
  let [winner, loser] = rightIsStronger ? [right, left] : [left, right];
  let isSameDecision = winner.permissionDecision === loser.permissionDecision;
  return {
    permissionDecision: winner.permissionDecision,
    permissionDecisionReason:
      winner.permissionDecisionReason ?? (isSameDecision ? loser.permissionDecisionReason : undefined),
  };
}
//@ chunk-e6aww6q8.js:38502-38761 fingerprint (2.1.88 match: SessionStartHookSpecificOutputSchema, 0.343)
/**
 * 合并两个钩子聚合结果（additionalContext、watchPaths 拼接，权限决定取更严格者）。
 */
function mergeHookAggregates_2(left, right) {
  let mergedContext = [...(left.additionalContext ?? []), ...(right.additionalContext ?? [])];
  let mergedWatchPaths = [...(left.watchPaths ?? []), ...(right.watchPaths ?? [])];
  return omitUndefined({
    ...left,
    ...right,
    ...mergePermissionDecisions(left, right),
    decision: left.decision ?? right.decision,
    additionalContext: mergedContext.length > 0 ? mergedContext : undefined,
    watchPaths: mergedWatchPaths.length > 0 ? mergedWatchPaths : undefined,
  });
}
//@ chunk-e6aww6q8.js:935924-936020 sole-consumer
function shouldEmitHookLifecycle(hookEvent) {
  return (
    shouldEmitHookEvent(hookEvent) ||
    (hookEvent === "UserPromptSubmit" && getHookEventEmitState().userPromptSubmitStartAndEndEnabled)
  );
}
//@ chunk-e6aww6q8.js:936020-936136 fingerprint (2.1.88 match: SDKHookStartedMessageSchema, 0.775)
/**
 * 发出 system/hook_started SDK 消息（受开关控制）。
 */
function emitHookStarted(hookId, hookName, hookEvent) {
  if (!shouldEmitHookLifecycle(hookEvent)) return;
  enqueueTaskNotification_2({
    type: "system",
    subtype: "hook_started",
    hook_id: hookId,
    hook_name: hookName,
    hook_event: hookEvent,
  });
}
//@ chunk-e6aww6q8.js:936136-936333 fingerprint (2.1.88 match: SDKHookProgressMessageSchema, 0.665)
/**
 * 发出 system/hook_progress SDK 消息。
 */
function emitHookProgress(progress) {
  if (!shouldEmitHookEvent(progress.hookEvent)) return;
  enqueueTaskNotification_2({
    type: "system",
    subtype: "hook_progress",
    hook_id: progress.hookId,
    hook_name: progress.hookName,
    hook_event: progress.hookEvent,
    stdout: progress.stdout,
    stderr: progress.stderr,
    output: progress.output,
  });
}
//@ chunk-e6aww6q8.js:936636-937271 fingerprint (2.1.88 match: SDKHookResponseMessageSchema, 0.436)
/**
 * 记录钩子结果日志，并发出 system/hook_response SDK 消息（含 exit_code、outcome）。
 */
function emitHookResponse(result) {
  let isNotSuccess = result.outcome !== "success";
  let stdoutText = result.stdout.trimEnd();
  let stderrText = result.stderr.trimEnd();
  let displayOutput =
    isNotSuccess || stderrText
      ? [
          stdoutText &&
            `stdout:
${stdoutText}`,
          stderrText &&
            `stderr:
${stderrText}`,
        ].filter(Boolean).join(`
`) || result.output
      : result.stdout || result.output;
  if (displayOutput || isNotSuccess) {
    let statusSuffix =
      result.outcome === "error" && result.exitCode !== undefined ? ` status code ${result.exitCode}` : "";
    logForDebugging(
      `Hook ${result.hookName} (${result.hookEvent}) ${result.outcome}:${statusSuffix}${
        displayOutput &&
        `
${displayOutput}`
      }`,
      {
        level: result.outcome === "error" ? "error" : "debug",
      },
    );
  }
  if (!shouldEmitHookLifecycle(result.hookEvent)) return;
  enqueueTaskNotification_2({
    type: "system",
    subtype: "hook_response",
    hook_id: result.hookId,
    hook_name: result.hookName,
    hook_event: result.hookEvent,
    output: result.output,
    stdout: result.stdout,
    stderr: result.stderr,
    ...(result.exitCode !== undefined && {
      exit_code: result.exitCode,
    }),
    outcome: result.outcome,
  });
}
//@ chunk-e6aww6q8.js:1349223-1349300 fingerprint (2.1.88 match: INSTRUCTIONS_MEMORY_TYPES, 1)
function isInstructionsMemoryType(type) {
  return type === "User" || type === "Project" || type === "Local" || type === "Managed";
}
//@ chunk-e6aww6q8.js:1468907-1469041 fingerprint (2.1.88 match: PostToolUseHookSpecificOutputSchema, 0.486)
function buildPostToolUseContextOutput(eventName, contextOutput, extraFields) {
  logEvent(eventName, {
    over_cap: contextOutput.overCap,
    ...extraFields,
  });
  return {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: contextOutput.text,
    },
  };
}
//@ chunk-e6aww6q8.js:1551908-1551987 fingerprint (2.1.88 match: ModelUsageSchema, 0.357)
/**
 * 有效上下文窗口：contextWindow 减去（maxOutputTokens 与上限的较小值）。
 */
function getEffectiveContextWindow(limits) {
  let min = Math.min(limits.maxOutputTokens, MAX_OUTPUT_TOKENS_CAP);
  return limits.contextWindow - min;
}
//@ chunk-e6aww6q8.js:2085394-2085461 fingerprint (2.1.88 match: SDKStatusSchema, 0.44)
function emitCompactingStatus(onStatus) {
  sendKeepaliveNow();
  onStatus?.({
    type: "sdk_status",
    status: "compacting",
  });
}
//@ chunk-e6aww6q8.js:3446035-3446085 fingerprint (2.1.88 match: WorktreeRemoveHookInputSchema, 0.419)
function hasWorktreeRemoveHook() {
  return hasWorktreeRemoveHook_2() || hasClassicHookSite("WorktreeRemove");
}
//@ chunk-e6aww6q8.js:3516372-3516433 fingerprint (2.1.88 match: SessionEndHookInputSchema, 0.513)
function shouldRunSessionEndHook(hookEvent, signal) {
  return hookEvent !== "SessionEnd" && isTerminalShutdown() && !signal?.aborted;
}
//@ chunk-e6aww6q8.js:4648972-4649110 fingerprint (2.1.88 match: SDKUserMessageSchema, 0.313)
var SDKUserMessageSchema_3; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:4648972", () => {
  SDKUserMessageSchema_3 = DoctorLazy(() =>
    fileEditOutputSchema().extend({
      staleRecovered: booleanSchema().optional().catch(undefined),
      contentNotInModelContext: booleanSchema().optional().catch(undefined),
      ...fileWriteOutputSchemaExtension(),
    }),
  );
});
//@ chunk-0h4e7gnq.js:46946-47070 fingerprint (2.1.88 match: SDKRateLimitEventSchema, 0.573)
/**
 * 构造 rate_limit_event SDK 消息（无可报告信息时返回 undefined）。
 */
function createRateLimitEvent(limits, sessionId, options = {}) {
  let rateLimitInfo = formatOrgSpendCapError(limits, options);
  if (!rateLimitInfo) return;
  return {
    type: "rate_limit_event",
    rate_limit_info: rateLimitInfo,
    uuid: randomUUID(),
    session_id: sessionId,
  };
}
//@ chunk-0sfjpx19.js:15811-15971 fingerprint (2.1.88 match: SDKUserMessageContentSchema, 0.377)
/**
 * 决定新输入的投递优先级：now / next / later（tengu_pencil_farmer 控制默认 next）。
 */
function resolveQueuePriority(priority, content, forceLater) {
  if (looksLikeSlashInput(content)) return "later";
  if (priority === "now") return "now";
  if (forceLater) return "later";
  if (priority !== undefined) return priority;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_pencil_farmer", false) ? "next" : "later";
}
//@ chunk-0sfjpx19.js:126752-126790 fingerprint (2.1.88 match: EXIT_REASONS, 0.599)
var isNonResetExitReason = (reason) => reason !== "clear" && reason !== "resume";
//@ chunk-ah34pb7m.js:51889-51952 fingerprint (2.1.88 match: PreCompactHookInputSchema, 0.315)
function PreCompactHookInputSchema_2(compactMetadata, compactMetadata_2) {
  return compactMetadata !== undefined && !(compactMetadata_2 && compactMetadata.trigger === "manual");
}
//@ chunk-tyg7f3ek.js:89024-89213 fingerprint (2.1.88 match: SDKStatusMessageSchema, 0.454)
/**
 * 往出站队列推一条 system/status 消息（status=null，带 permissionMode），返回其 uuid。
 */
function emitStatusMessage({ io, getAppState }, permissionMode) {
  let messageUuid = randomUUID();
  io.outbound.enqueue({
    type: "system",
    subtype: "status",
    status: null,
    permissionMode,
    ...{},
    uuid: messageUuid,
    session_id: getSessionId(),
  });
  notifyProactivityChanged(io.sessionState, getAppState());
  return messageUuid;
}
//@ chunk-tyg7f3ek.js:244160-244305 fingerprint (2.1.88 match: SDKPartialAssistantMessageSchema, 0.558)
/**
 * 构造一个 content_block_stop 的 stream_event SDK 消息。
 */
function createContentBlockStopEvent(apiMessageId, index) {
  return {
    type: "stream_event",
    event: {
      type: "content_block_stop",
      index,
    },
    session_id: getSessionId(),
    parent_tool_use_id: null,
    uuid: randomUUID(),
    ...apiMessageIdField(apiMessageId),
  };
}
//@ chunk-jy3v56kg.js:33118-33238 fingerprint (2.1.88 match: PreToolUseHookInputSchema, 0.566)
var PreToolUseHookInputSchema_2 = {
  session_id: "",
  transcript_path: "",
  cwd: "",
  hook_event_name: "PreToolUse",
  tool_name: FILE_READ_TOOL_NAME,
  tool_input: {},
  tool_use_id: "",
};
//@ chunk-e5gvqyfh.js:10272-10395 fingerprint (2.1.88 match: PreToolUseHookSpecificOutputSchema, 0.569)
function PreToolUseHookSpecificOutputSchema_2(permissionDecisionReason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason,
    },
  };
}
//@ chunk-hyjyj8hj.js:7042-7185 file-local
var MAX_PAUSE_ANNOUNCEMENTS = 3;
var MAX_SUBAGENT_ANNOUNCEMENTS = 64;
var CONTEXT_HOOK_EVENTS = ["PreToolUse", "PostToolUse", "PostToolUseFailure", "UserPromptSubmit"];
var TURN_HOOK_EVENTS = [...CONTEXT_HOOK_EVENTS, "PostToolBatch", "UserPromptExpansion", "Stop"];
//@ chunk-hyjyj8hj.js:7185-8381 layout
/**
 * 远程机器钩子暂停/恢复时向模型与用户发提示的状态机（skipped/answered）。
 */
function createRemoteHookPauseNotifier() {
  let isPaused = false;
  let lastPausedMachine = null;
  let pauseAnnouncements = 0;
  let announcedThisPause = false;
  let subagentAnnouncements = 0;
  let announcedAgents = new Set();
  return {
    skipped({ event, agentId, machine, inTurn }, machineTurn) {
      if (!isPaused) {
        isPaused = true;
        announcedThisPause = false;
        subagentAnnouncements = 0;
      }
      let agentKey = agentId ?? "main";
      let shouldAnnouncePause =
        inTurn &&
        lastPausedMachine !== machineTurn &&
        agentId === undefined &&
        TURN_HOOK_EVENTS.includes(event);
      let contextOutput =
        inTurn &&
        (announcedThisPause || pauseAnnouncements < MAX_PAUSE_ANNOUNCEMENTS) &&
        !announcedAgents.has(agentKey) &&
        (agentId === undefined || subagentAnnouncements < MAX_SUBAGENT_ANNOUNCEMENTS) &&
        buildHookContextOutput(
          event,
          "Hooks that run on the user's own machine are paused because it did not answer in time. Tool calls proceed without them. If the user asks whether their hooks ran, say they were paused.",
        );
      if (shouldAnnouncePause) lastPausedMachine = machineTurn;
      if (contextOutput) {
        announcedAgents.add(agentKey);
        subagentAnnouncements += agentId === undefined ? 0 : 1;
        pauseAnnouncements += announcedThisPause ? 0 : 1;
        announcedThisPause = true;
      }
      return {
        ...(shouldAnnouncePause && {
          systemMessage: `Paused hooks from "${machine}" because it did not answer in time. Tool calls continue without them.`,
        }),
        ...(contextOutput && {
          hookSpecificOutput: contextOutput,
        }),
      };
    },
    answered({ event, agentId, machine, inTurn }, output) {
      isPaused = false;
      if (!inTurn || isBlockingHookOutput(output)) return output;
      let agentKey = agentId ?? "main";
      let shouldAnnounceResume =
        lastPausedMachine !== null && agentId === undefined && TURN_HOOK_EVENTS.includes(event);
      let contextOutput =
        announcedAgents.has(agentKey) &&
        buildHookContextOutput(
          event,
          `Hooks from a machine the user attached are running.${pauseAnnouncements >= MAX_PAUSE_ANNOUNCEMENTS ? " Later changes are not announced." : ""}`,
        );
      if (!shouldAnnounceResume && !contextOutput) return output;
      if (shouldAnnounceResume) lastPausedMachine = null;
      if (contextOutput) announcedAgents.delete(agentKey);
      let hookSpecificOutput = output.hookSpecificOutput;
      let additionalContext =
        hookSpecificOutput !== undefined && "additionalContext" in hookSpecificOutput
          ? hookSpecificOutput.additionalContext
          : undefined;
      return {
        ...output,
        ...(shouldAnnounceResume && {
          systemMessage: joinLines(output.systemMessage, `Resumed hooks from "${machine}".`),
        }),
        ...(contextOutput && {
          hookSpecificOutput: {
            ...contextOutput,
            ...hookSpecificOutput,
            additionalContext: joinLines(additionalContext, contextOutput.additionalContext),
          },
        }),
      };
    },
  };
}
//@ chunk-hyjyj8hj.js:8381-8472 fingerprint (2.1.88 match: UserPromptSubmitHookSpecificOutputSchema, 0.481)
function buildHookContextOutput(event, additionalContext) {
  let found = CONTEXT_HOOK_EVENTS.find((name) => name === event);
  return (
    found && {
      hookEventName: found,
      additionalContext,
    }
  );
}
//@ chunk-hyjyj8hj.js:8472-8521 affinity
function joinLines(existing, added) {
  return existing === undefined
    ? added
    : `${existing}
${added}`;
}
//@ chunk-18hwfzwa.js:1069699-1070020 fingerprint (2.1.88 match: PromptResponseSchema, 0.356)
function collectQuestionAnswers(questions, answers) {
  let collected = [];
  for (let question of questions) {
    let answer = ownValue(answers, question.id);
    if (!hasAnswer(answer)) continue;
    if (question.kind === "text")
      collected.push({
        questionId: question.id,
        text: typeof answer === "string" ? answer.trim() : "",
      });
    else {
      let selectedValues = typeof answer === "string" ? [answer] : (answer ?? []);
      collected.push({
        questionId: question.id,
        selected: question.options
          .filter((option) => selectedValues.includes(option.value))
          .map((option) => option.value),
      });
    }
  }
  return collected;
}
//@ chunk-61a1pjwa.js:31942-32072 fingerprint (2.1.88 match: CONFIG_CHANGE_SOURCES, 0.599)
var CONFIG_CHANGE_SOURCES_2 = {
  own: "user_settings",
  own_cowork: "user_settings",
  project: "project_settings",
  local: "local_settings",
  legacy: "local_settings",
};
//@ chunk-583vs41k.js:23544-23844 fingerprint (2.1.88 match: SDKAPIRetryMessageSchema, 0.503)
/**
 * 从 api_retry 状态帧提取 {retryAttempt, maxRetries, retryInMs, status, retryAt}。
 */
function parseApiRetryStatus(message) {
  if (
    message.status !== "api_retry" ||
    typeof message.attempt !== "number" ||
    typeof message.max_retries !== "number" ||
    typeof message.retry_delay_ms !== "number"
  )
    return null;
  return {
    retryAttempt: message.attempt,
    maxRetries: message.max_retries,
    retryInMs: message.retry_delay_ms,
    status: message.error_status ?? undefined,
    retryAt: Date.now() + message.retry_delay_ms,
  };
}
//@ chunk-54xbtc53.js:27985-28637 fingerprint (2.1.88 match: SDKResultErrorSchema, 0.34)
/**
 * -p 模式输出最终结果：json 格式直接写 JSON，否则 success 写结果文本，各类错误写对应提示。
 */
function writePrintResult(resultMessage, outputFormat, write = writeToStdout) {
  if (outputFormat === "json") {
    write(
      escapeC1Chars(jsonStringify(resultMessage)) +
        `
`,
    );
    return;
  }
  switch (resultMessage.subtype) {
    case "success": {
      let resultText = stripControlChars(
        typeof resultMessage.result === "string" ? resultMessage.result : "",
      );
      write(
        resultText.endsWith(`
`)
          ? resultText
          : resultText +
              `
`,
      );
      return;
    }
    case "error_during_execution":
      write("Execution error");
      return;
    case "error_max_turns": {
      let maxTurnsMatch = /^Reached maximum number of turns \((\d+)\)$/.exec(
        firstErrorText(resultMessage) ?? "",
      )?.[1];
      write(`Error: Reached max turns${maxTurnsMatch === undefined ? "" : ` (${maxTurnsMatch})`}`);
      return;
    }
    case "error_max_budget_usd":
      write("Error: Exceeded USD budget");
      return;
    case "error_max_structured_output_retries":
      write(
        `Error: ${firstErrorText(resultMessage) ?? "Failed to provide valid structured output after maximum retries"}`,
      );
      return;
    default: {
      let message = resultMessage;
      write(`Error: ${firstErrorText(resultMessage) ?? sanitizeCloudText(String(message.subtype))}`);
    }
  }
}
//@ chunk-54xbtc53.js:28637-28757 sole-consumer
function stripControlChars(text) {
  return stripAnsi(text)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .replace(/\r(?!\n)/g, "");
}
//@ chunk-54xbtc53.js:28757-28866 sole-consumer
function escapeC1Chars(text) {
  return text.replace(/[\u007F-\u009F]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
//@ chunk-bzb0qnrm.js:6622-6980 fingerprint (2.1.88 match: SDKPermissionDenialSchema, 0.352)
/**
 * 解析远程发来的钩子 stdin JSON：补本地 cwd、清理敏感路径字段、修复工具输入，返回 {envContext, cwd, stdin, repairedInput}。
 */
function parseRemoteHookInput(jsonInput) {
  let parsed = JSON.parse(jsonInput);
  let caller = remoteHookCallerSchema().parse(parsed);
  let cwd = getCwd();
  let stdin = redactHookInputPaths(
    jsonInputSchema().parse(parsed),
    (inProjectRoot) => isAbsolute(inProjectRoot) && isSubpathOf(getProjectRoot(), inProjectRoot, false),
    (inAdditionalDir) => getAdditionalDirectoriesForClaudeMd().includes(inAdditionalDir),
  );
  stdin.cwd = cwd;
  let tool =
    typeof stdin.tool_name === "string" ? findToolByName(serveModeTools(true), stdin.tool_name) : undefined;
  let toolInput = isPlainObject(stdin.tool_input) ? stdin.tool_input : {};
  let coerced = tool && coerceServedInput(tool, toolInput);
  let repairedInput = isPlainObject(coerced)
    ? {
        ...coerced,
        ...pickAlias(toolInput, SERVE_MODE_VALUE),
      }
    : undefined;
  if (repairedInput) stdin.tool_input = repairedInput;
  return {
    envContext: claudeEnvContextFrom(caller),
    cwd,
    stdin,
    repairedInput,
  };
}
//@ chunk-bzb0qnrm.js:6980-7374 layout
/**
 * 清空钩子输入里不应外泄的路径类字段（transcript_path 等），按事件类型保留允许的项目内路径。
 */
function redactHookInputPaths(
  { scratchpad_dir: scratchpadDir, ...pathFields },
  keepInProject,
  keepInAdditional,
) {
  let redacted = {
    ...pathFields,
    transcript_path: "",
  };
  let isLocalMemory =
    pathFields.hook_event_name === "InstructionsLoaded" &&
    (pathFields.memory_type === "Project" || pathFields.memory_type === "Local");
  for (let [key, value] of Object.entries(pathFields))
    if (
      PATH_FIELD_NAME_REGEX.test(key) &&
      !(isLocalMemory && PATH_LIKE_FIELDS.has(key) && typeof value === "string" && keepInProject(value)) &&
      !(
        pathFields.hook_event_name === "DirectoryAdded" &&
        key === "directory" &&
        typeof value === "string" &&
        keepInAdditional(value)
      )
    )
      redacted[key] = "";
  if (!redacted.file_path) redacted.globs = undefined;
  return redacted;
}
//@ chunk-bzb0qnrm.js:7374-7661 layout
/**
 * 计算钩子的 if 条件：用工具定义校验钩子输入后求值，无法求值时抛错。
 */
async function evaluateHookCondition(condition, { stdin, cwd }) {
  let tools = [...serveModeTools(true), ...getAllBaseTools()];
  let tool = typeof stdin.tool_name === "string" ? findToolByName(tools, stdin.tool_name) : undefined;
  let parsed = HookInputUnionSchema().safeParse(
    tool !== undefined && isPlainObject(stdin.tool_input)
      ? {
          ...stdin,
          tool_input: serveModeInput(tool, stdin.tool_input),
        }
      : stdin,
  );
  let matched = parsed.success ? await evaluateHookIfPattern(condition, parsed.data, tools, cwd) : null;
  if (matched === null) throw new PluginHookServedCallError(HOOK_CONDITION_UNKNOWN_TEXT);
  return matched;
}
//@ chunk-bzb0qnrm.js:7661-8243 layout
/**
 * 带超时运行一个命令钩子并整理输出（SessionStart/Setup/CwdChanged/FileChanged 后清会话 env 缓存）。
 */
async function runCommandHookWithTimeout(
  hook,
  hookEvent,
  { envContext, cwd, stdin, repairedInput },
  hookIndex,
  { abortController, storageV5, credentials },
  plugin,
  managed = false,
  skillRoot,
  inBackground = false,
) {
  let combinedAbortSignal = createCombinedAbortSignal(abortController.signal, {
    timeoutMs: hook.timeout ? hook.timeout * 1000 : undefined,
  });
  let result = await execPluginCommandHook({
    hook,
    hookEvent,
    jsonInput: jsonStringify(stdin),
    envContext,
    project: {
      originalCwd: getOriginalCwd(),
      projectRoot: getProjectRoot(),
    },
    cwd,
    hookIndex,
    signal: combinedAbortSignal.signal,
    plugin,
    skillRoot,
    managed,
    fitted: (stdout) => ({
      ...fitHookResult(shrinkHookStdout(stdout, hookEvent), hookEvent),
      ...(inBackground && {
        stdioIncomplete: false,
        stdioClosedWithoutEnd: false,
      }),
    }),
    storageV5,
    credentials,
  }).finally(combinedAbortSignal.cleanup);
  if (SetupHookSpecificOutputSchema_2.has(hookEvent)) invalidateSessionEnvCache();
  return {
    summary: `exit ${result.status}`,
    output: fitHookResult(
      {
        ...result,
        repairedInput,
      },
      hookEvent,
    ),
  };
}
//@ chunk-bzb0qnrm.js:8243-9140 layout
/**
 * 组织托管设置尚未读取时对远程钩子的处理：PreToolUse/SessionStart/Setup 等先等待设置；仍未读到时 PreToolUse 返回 ask/deny 决定，其余事件报错。
 */
async function holdHookUntilManagedSettings(hookEvent, stdin, timeoutSeconds, signal, isReady, event) {
  if (!isHookPolicyUnanswered()) return;
  try {
    if (isReady()) return;
  } catch (error) {
    logError(error);
  }
  if (
    hookEvent === "PreToolUse" ||
    hookEvent === "SessionStart" ||
    hookEvent === "Setup" ||
    GUARD_AND_FEEDBACK_EVENTS.has(hookEvent)
  ) {
    await withDeadline(
      waitForOrganizationHookPolicy(signal),
      Math.min((timeoutSeconds ?? 1 / 0) * 1000, ORGANIZATION_ANSWER_TIMEOUT_MS),
    );
    if (!isHookPolicyUnanswered()) {
      logFeatureOk("hooks_organization_served_hold");
      return "answered";
    }
  }
  try {
    askOrganizationOnce();
    logFeatureSad(
      "hooks_organization_served_hold",
      organizationAnswerState.fetches?.() === true ? "settings_unread" : "never_asks",
    );
  } catch (error) {
    logError(error);
  }
  logForDebugging(
    `a person's ${hookEvent} hook that another machine sent was not run: this machine has not read its organization's managed settings yet`,
    {
      level: "warn",
    },
  );
  if (hookEvent !== "PreToolUse") throw new RemotePluginHookError(event);
  let permissionMode =
    stdin.permission_mode === "bubble" ? "default" : parsePermissionMode(stdin.permission_mode);
  let json = jsonStringify({
    hookSpecificOutput: {
      hookEventName: hookEvent,
      permissionDecision:
        permissionMode === undefined || permissionMode === "bypassPermissions" ? DENY : "ask",
      permissionDecisionReason: HOOK_CHECK_UNAVAILABLE_MESSAGE,
    },
  });
  return {
    summary: "not run: the organization's managed settings have not been read yet",
    output: {
      stdout: json,
      stderr: "",
      output: json,
      status: 0,
      notStarted: true,
    },
  };
}
//@ chunk-bzb0qnrm.js:9140-9178 layout
/**
 * 钩子被全局禁用时抛错。
 */
function assertHooksNotDisabled() {
  if (policySettingsUnreadable()) throw new RemotePluginHookError(POLICY_UNREADABLE_TEXT);
}
//@ chunk-bzb0qnrm.js:9178-9236 layout
function assertPluginHooksAllowed(hookScope) {
  assertHooksNotDisabled();
  assertHooksPolicyReady();
  if (!isHookSourceAllowed(hookScope) || shouldSkipHookDueToTrust())
    throw new PluginHookServedCallError(HOOKS_DISABLED_TEXT);
}
//@ chunk-bzb0qnrm.js:9236-9283 layout
/**
 * 钩子策略尚未就绪（托管设置未读）时抛错。
 */
function assertHooksPolicyReady() {
  if (policyLoadFailureRefusesPluginHooks())
    throw new RemotePluginHookError(
      policySettingsUnreadable() ? POLICY_UNREADABLE_TEXT : POLICY_BLOCKS_START_TEXT,
    );
}
//@ chunk-bzb0qnrm.js:9283-9504 layout
/**
 * 插件找不到时，若插件同步尚未完成或该插件同步出错，则抛"稍后再试"错误。
 */
function assertPluginSyncSettled(folderId, hasPending, session) {
  let { accountListing, syncErrors } = session.pluginsSync;
  if (
    !hasPending ||
    accountListing === "pending" ||
    syncErrors.some((syncError) => {
      if (!("plugin" in syncError) || syncError.plugin === undefined) return false;
      try {
        return syncedPluginFolderId(syncedItemPath(syncError.plugin, sep)) === folderId;
      } catch {
        return false;
      }
    })
  )
    throw new RemotePluginHookError(PLUGINS_NOT_SETTLED_TEXT);
}
//@ chunk-bzb0qnrm.js:9504-9642 layout
/**
 * 同步插件且本机设置暂时持有账户插件时拒绝运行其钩子。
 */
function assertSyncedPluginUsable(plugin) {
  if (marketplaceSuffix(plugin.source) === SYNCED && isPluginsSyncVetoed()) {
    if (isSyncPaused()) throw new PluginHookServedCallError(HOOKS_DISABLED_TEXT);
    throw Error("this machine's settings hold account plugins for now");
  }
}
//@ chunk-bzb0qnrm.js:9642-9710 file-local
var SetupHookSpecificOutputSchema_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bzb0qnrm.js:9642", () => {
  SetupHookSpecificOutputSchema_2 = new Set(["SessionStart", "Setup", "CwdChanged", "FileChanged"]);
});
//@ chunk-bzb0qnrm.js:9710-9887 layout
/**
 * 按插件 ID 找已启用插件（同步插件按路径哈希匹配），附带加载警告。
 */
async function findEnabledPlugin(pluginSource, storageV5, credentials) {
  let { enabled, warnings } = await loadAllPluginsCacheOnly(storageV5, credentials);
  return {
    plugin:
      marketplaceSuffix(pluginSource) === SYNCED
        ? enabled.find(
            (plugin) =>
              marketplaceSuffix(plugin.source) === SYNCED &&
              syncedPluginFolderId(plugin.path) === pluginSource,
          )
        : enabled.find((plugin) => plugin.source === pluginSource),
    warnings,
  };
}
//@ chunk-bzb0qnrm.js:9887-9940 layout
function truncateHookField(stdout) {
  return stdout.length <= HOOK_OUTPUT_MAX_CHARS
    ? stdout
    : `${truncateToLength(stdout, HOOK_OUTPUT_MAX_CHARS)}
${HOOK_OUTPUT_CUT_TEXT}`;
}
//@ chunk-bzb0qnrm.js:9940-10173 layout
function truncateHookOutput(output) {
  let filtered = Object.entries(output).filter(
    ([key, value]) => !HOOK_DROPPED_FIELDS.has(key) || jsonStringify(value).length <= HOOK_OUTPUT_MAX_CHARS,
  );
  return import_mapValues(Object.fromEntries(filtered), (value, key) => {
    if (typeof value === "string") return HOOK_TEXT_FIELDS.has(key) ? truncateHookField(value) : value;
    return (key === "hookSpecificOutput" || key === "decision") && isPlainObject(value)
      ? truncateHookOutput(value)
      : value;
  });
}
//@ chunk-bzb0qnrm.js:10173-10468 fingerprint (2.1.88 match: SyncHookJSONOutputSchema, 0.405)
function SyncHookJSONOutputSchema(output) {
  let hookSpecificOutput = output.hookSpecificOutput;
  if (!isPlainObject(hookSpecificOutput)) return output;
  let keptOutput = import_reject(hookSpecificOutput, (value, key) => HOOK_UPDATED_OUTPUT_FIELDS.has(key));
  if (Object.keys(keptOutput).length === Object.keys(hookSpecificOutput).length) return output;
  let { classifierContext, ...keptFields } = keptOutput;
  return {
    ...output,
    hookSpecificOutput: keptFields,
    systemMessage: withDroppedOutputNote(output.systemMessage),
    ...(output.continue === false && {
      stopReason: withDroppedOutputNote(output.stopReason),
    }),
  };
}
export {
  SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
  HookEventNameSchema,
  SDKSdkMessageSchema,
  SubagentDefinitionSchema,
  SDKLocalMessageSchema,
  SkillCommandSchema,
  AgentDefinitionSchema,
  ModelOptionSchema,
  AccountInfoSchema,
  PermissionModeSchema,
  FastModeStateSchema,
  FastModeBlockedReasonSchema,
  FooterIndicatorSchema,
  McpToolSourceSchema,
  McpAddRulesServerConfigSchema,
  THINKING_DISPLAY_MODES,
  McpServerStatusSchema,
  ModelUsageSchema,
  CONTEXT_CATEGORY_ORDER,
  CONTEXT_CATEGORY_KINDS,
  SKIPPED_LINKS_DESCRIPTION,
  HookInputUnionSchema,
  SDKUserMessageBaseSchema,
  SDKAssistantMessageSchema_2,
  McpServerConfigSchema,
  PLUGIN_VERSION_DESCRIPTION,
  SettingsValidationErrorSchema,
  CanUseToolResultSchema,
  HookOutputSchema,
  PanesSchema,
  SDK_ERROR_CODES,
  SDKMessageSchema,
  SDKSystemPostTurnSummaryMessageSchema,
  SDKSystemTaskSummaryMessageSchema,
  SDKSystemSessionMetadataMessageSchema,
  SDKTranscriptMirrorMessageSchema,
  SDKActiveGoalMessageSchema,
  SDKAutocompactStateMessageSchema,
  SDKBashCommandMessageSchema,
  HOOK_EVENTS,
  SUBAGENT_REPORT_DISPOSITIONS,
  HandbackReportSchema,
  mcpAuthErrorCode,
  NON_EXECUTION_KINDS,
  isKnownMessageKind,
  isTextNotTyped,
  createRateLimitEvent,
  isAbortedTerminalReason,
  isNonResetExitReason,
  toSdkModelInfos,
  emitStatusMessage,
  resolveQueuePriority,
  remoteControlErrorCode,
  collectQuestionAnswers,
  emitHookResponse,
  isErrorTerminalReason,
  buildResultMessage,
  normalizeCustomSubtype,
  isThinkingDisplayMode,
  MODEL_UNAVAILABLE_REASONS,
  isAbnormalTerminalReason,
  terminalReasonTag,
  RateLimitInfoSchema,
  SESSION_END_REASONS_2,
  isInstructionsMemoryType,
  hasWorktreeRemoveHook,
  promptEndingFields,
  emitHookStarted,
  shouldRunSessionEndHook,
  writePrintResult,
  ApiKeySourceSchema_2,
  currentAccessTokenHash,
  parseApiRetryStatus,
  CONFIG_CHANGE_SOURCES_2,
  emitHookProgress,
  formatRateLimitMessage,
  UsageReportSchema,
  getEffectiveContextWindow,
  emitCompactingStatus,
  PreCompactHookInputSchema_2,
  USER_REJECTED_KIND,
  INTERRUPTED_TOOL_STATUSES,
  toolRejectionKind,
  BaseOutputFormatSchema,
  PaneIdSchema,
  truncateHookOutput,
  SyncHookJSONOutputSchema,
  truncateHookField,
  assertPluginHooksAllowed,
  findEnabledPlugin,
  assertPluginSyncSettled,
  assertSyncedPluginUsable,
  parseRemoteHookInput,
  evaluateHookCondition,
  holdHookUntilManagedSettings,
  runCommandHookWithTimeout,
  SDKHttpMessageSchema,
  PreToolUseHookSpecificOutputSchema_2,
  mergeHookAggregates_2,
  buildPostToolUseContextOutput,
  PermissionDisplaySchema,
  SDKUserMessageSchema_3,
  createRemoteHookPauseNotifier,
  PreToolUseHookInputSchema_2,
  withResultExtras,
  createContentBlockStopEvent,
  classifyApiErrorForSummary,
  assertHooksPolicyReady,
  assertHooksNotDisabled,
  SDKSystemCodeChangePublishedMessageSchema,
  SDKSystemVcsStateChangedMessageSchema,
  MOBILE_APP_KINDS,
};
