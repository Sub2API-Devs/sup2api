/**
 * services/analytics/datadog.ts
 *
 * Datadog 日志上报：端点 us5 http-intake、公开客户端 token、243 个白名单事件、按事件字段白名单、批量 15 秒刷新。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/analytics/datadog.ts
 * pieces: chunk-12wyw8h8.js (1), chunk-9cjx5pnm.js (1), chunk-w6mc5gr3.js (26)
 * attribution: fingerprint 4, placement 2, facade-exports 4, layout 15, file-local 1, affinity 1, sole-consumer 1
 */
import { gzipSync } from "zlib";
import { promises, ADDRCONFIG } from "dns";
import { createHash } from "crypto";
import { Resolver } from "dns/promises";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import { isMcpFamilyToolName, getEventMetadata } from "./metadata.js";
import { env } from "../../utils/env.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { externalHttp } from "../http/externalHttp.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { findProxyError, getUsableProxyUrl, shouldBypassProxy } from "../../utils/proxy.js";
import { isAllowlistBlockedResponse } from "../../utils/sandbox/proxyDenial.js";
import { getErrnoCode } from "../../utils/errors.js";
import { logFeatureSad, logFeatureOk } from "./featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { isHipaaModeCurrent } from "./privacyLevel.js";
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { isFirstPartyTelemetryBlocked, isByocDatadogDisabled } from "../../utils/hostEnvironment.js";
import { getOrCreateUserID } from "../../utils/config.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { CONFIDENTIAL_MODEL_ID } from "../../utils/model/modelCatalog/catalogEntries.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { strip1mSuffix } from "../../utils/model/modelIds.js";
import { MODEL_COSTS } from "../../utils/modelCost.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./growthbook.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { rollSampleRate } from "./firstPartyEventLogger.js";
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from "../../utils/model/providers.js";
import { sanitizeCommonFields } from "./eventSerialization.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-w6mc5gr3.js:1072-1500 placement
function scheduleFlush({ maxBatchSize, getFlushIntervalMs, post }) {
  let queue = [];
  let timer = null;
  async function flush() {
    if (queue.length === 0) return;
    let batch = queue;
    queue = [];
    await post(batch);
  }
  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }
  function flushQuietly() {
    flush().catch(() => {});
  }
  function schedule() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      flushQuietly();
    }, getFlushIntervalMs()).unref();
  }
  return {
    enqueue(entry) {
      queue.push(entry);
      if (queue.length >= maxBatchSize) {
        clearTimer();
        flushQuietly();
      } else schedule();
    },
    flush,
    async shutdown() {
      clearTimer();
      await flush();
    },
    drainForTesting() {
      clearTimer();
      let drained = queue;
      queue = [];
      return drained;
    },
  };
}
//@ chunk-w6mc5gr3.js:1500-10735 facade-exports (2.1.88 match: DATADOG_ALLOWED_EVENTS, 0.243)
/**
 * Datadog 常量：端点 https://http-intake.logs.us5.datadoghq.com/api/v2/logs、客户端 token pubea5604404508cdd34afb69e6f42a05bc、白名单事件集合与按事件的字段白名单。
 */
var DATADOG_LOGS_ENDPOINT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DATADOG_CLIENT_TOKEN;
var DEFAULT_FLUSH_INTERVAL_MS;
var MAX_BATCH_SIZE;
var REQUEST_TIMEOUT_MS;
var MAX_SHUTDOWN_WAIT_MS;
var DATADOG_ALLOWED_EVENTS;
var DATADOG_EVENT_FIELD_ALLOWLIST;
deferInit("chunk-w6mc5gr3.js:1500", () => {
  DATADOG_LOGS_ENDPOINT = "https://http-intake.logs.us5.datadoghq.com/api/v2/logs";
  DATADOG_CLIENT_TOKEN = "pubea5604404508cdd34afb69e6f42a05bc";
  DEFAULT_FLUSH_INTERVAL_MS = 15000;
  MAX_BATCH_SIZE = 100;
  REQUEST_TIMEOUT_MS = 5000;
  MAX_SHUTDOWN_WAIT_MS = 300000;
  DATADOG_ALLOWED_EVENTS = new Set([
    "tengu_feature_ok",
    "tengu_feature_bad",
    "tengu_feature_sad",
    "tengu_teleport_menu",
    "tengu_teleport_permission_mode_refused",
    "tengu_tether_decision",
    "tengu_tether_live_outcome",
    "tengu_tether_echo_audit",
    "tengu_tether_unrecognised_400",
    "chrome_bridge_connection_succeeded",
    "chrome_bridge_connection_failed",
    "chrome_bridge_disconnected",
    "chrome_bridge_tool_call_completed",
    "chrome_bridge_tool_call_disconnected",
    "chrome_bridge_tool_call_error",
    "chrome_bridge_tool_call_lost",
    "chrome_bridge_tool_call_started",
    "chrome_bridge_tool_call_timeout",
    "tengu_api_error",
    "tengu_api_fallback_last_resort",
    "tengu_api_success",
    "tengu_artifact_disabled_session",
    "tengu_artifact_reject_breaker",
    "tengu_artifact_tool_recovered",
    "tengu_artifact_tool_withheld",
    "tengu_auto_mode_decision",
    "tengu_auto_mode_local_classifier_call",
    "tengu_auto_mode_local_classifier_switched_off",
    "tengu_auto_mode_denial_limit_exceeded",
    "tengu_auto_mode_destructive_mcp_rule_allow",
    "tengu_auto_mode_fallback_to_ask",
    "tengu_auto_mode_malformed_tool_input",
    "tengu_auto_mode_reissue_exempt",
    "tengu_auto_mode_env_onboarding_accept",
    "tengu_auto_mode_env_onboarding_dismiss",
    "tengu_auto_mode_env_onboarding_later",
    "tengu_auto_mode_env_onboarding_shown",
    "tengu_auto_mode_outcome",
    "tengu_auto_mode_setup_wizard_answers",
    "tengu_auto_mode_setup_wizard_resolved",
    "tengu_auto_mode_setup_wizard_shown",
    "tengu_auto_mode_subsequent_approval",
    "tengu_bridge_token_absence_classified",
    "tengu_insights_auto_mode_recommendation",
    "tengu_brief_mode_enabled",
    "tengu_brief_mode_toggled",
    "tengu_brief_send",
    "tengu_cancel",
    "tengu_compact_after_prompt_too_long",
    "tengu_compact_failed",
    "tengu_copper_lantern",
    "tengu_deferred_tools_pool_change",
    "tengu_mcp_instructions_pool_change",
    "tengu_exit",
    "tengu_flicker",
    "tengu_headless_mcp_first_turn_join",
    "tengu_headless_mcp_launch_named_wait",
    "tengu_headless_mcp_prewait",
    "tengu_init",
    "tengu_mcp_degraded",
    "tengu_mcp_drive_file_reference_upload",
    "tengu_mcp_drive_file_reference_availability",
    "tengu_mcp_first_tools_list",
    "tengu_mcp_list_changed",
    "tengu_mcp_listen_reopen",
    "tengu_mcp_message_stream_outcome",
    "tengu_mcp_listing_prior_rejected",
    "tengu_mcp_project_servers_approved",
    "tengu_mcp_sdk_generation",
    "tengu_mcp_server_connection_failed",
    "tengu_mcp_server_connection_succeeded",
    "tengu_mcp_tools_refreshed_mid_turn",
    "tengu_mcp_tripwire",
    "tengu_model_catalog_compare",
    "tengu_model_fallback_triggered",
    "tengu_live_model_switch",
    "tengu_refusal_fallback_triggered",
    "tengu_refusal_fallback_prompt_shown",
    "tengu_refusal_fallback_prompt_choice",
    "tengu_refusal_fallback_preference_prompt",
    "tengu_refusal_fallback_setting_changed",
    "tengu_refusal_fallback_suppressed",
    "tengu_refusal_fallback_dialog_suppressed",
    "tengu_refusal_fallback_supersedes",
    "tengu_refusal_fallback_route_declined",
    "tengu_refusal_fallback_notice_collapsed",
    "tengu_convolute_arcades_retry",
    "tengu_convolute_arcades_retry_outcome",
    "tengu_rotunda_pennant_applied",
    "tengu_rotunda_pennant_malformed",
    "tengu_rotunda_pennant_strip",
    "tengu_rotunda_pennant_credit_echoed",
    "tengu_rotunda_pennant_tools",
    "tengu_rotunda_pennant_chain_exhausted",
    "tengu_rotunda_pennant_esc",
    "tengu_refusal_retraction_evicted",
    "tengu_refusal_retraction_late_drop",
    "tengu_refusal_retraction_history_dropped",
    "tengu_refusal_retraction_orphan_tool_result",
    "tengu_refusal_retraction_truncation_harvest",
    "tengu_refusal_retraction_unauthenticated_signal",
    "tengu_propose_skills",
    "tengu_propose_skills_kept_lines",
    "tengu_propose_skills_read_check",
    "tengu_oauth_error",
    "tengu_oauth_success",
    "tengu_oauth_token_refresh_failure",
    "tengu_oauth_token_refresh_success",
    "tengu_oauth_token_refresh_lock_acquiring",
    "tengu_oauth_token_refresh_lock_acquired",
    "tengu_oauth_token_refresh_starting",
    "tengu_oauth_token_refresh_completed",
    "tengu_oauth_token_refresh_lock_releasing",
    "tengu_oauth_token_refresh_lock_released",
    "tengu_oauth_token_refresh_lock_dead_holder_takeover",
    "tengu_policy_limits_cache_state_at_first_prompt",
    "tengu_policy_limits_fetch",
    "tengu_policy_limits_verdict_recovered",
    "tengu_projects_write_text_in_view",
    "tengu_ptl_surfaced_to_user",
    "tengu_query_error",
    "tengu_remote_tool_targets",
    "tengu_remote_tool_forward",
    "tengu_remote_tool_serve",
    "tengu_remote_tool_restart_adoption",
    "tengu_remote_tool_restart_adoption_dropped",
    "tengu_remote_tool_restart_adoption_unroutable",
    "tengu_remote_stream_regained",
    "tengu_sdk_oauth_refresh_unfulfilled",
    "tengu_rc_pill_clicked",
    "tengu_ranch_rc_shown",
    "tengu_ranch_rc_link_shown",
    "tengu_ccr_init_park_report",
    "tengu_orphaned_permission_applied",
    "tengu_orphaned_permission_closed_unrun",
    "tengu_orphaned_permission_unapplied_turn_end",
    "tengu_orphaned_permission_unapplied_turn_resumed",
    "tengu_turn_handoff_run",
    "tengu_turn_handoff_flag_wait",
    "tengu_turn_handoff_files_by_name",
    "tengu_turn_handoff_files_by_name_refresh",
    "tengu_turn_handoff_carried_writes",
    "tengu_turn_handoff_expired",
    "tengu_rewind_conversation_expired",
    "tengu_pending_action_republished",
    "tengu_resume_interrupted_turn",
    "tengu_resume_parked_permission",
    "tengu_resume_rescue_yield",
    "tengu_resume_stale_prompt_cancel",
    "tengu_resume_stale_turn_suppressed",
    "tengu_unattended_start",
    "tengu_request_user_dialog_implicit_cancel",
    "tengu_request_user_dialog_late_answer",
    "tengu_request_user_dialog_left_up",
    "tengu_request_user_dialog_requires_action",
    "tengu_request_user_dialog_response_ignored",
    "tengu_request_user_dialog_timeout",
    "tengu_chrome_setup_offered",
    "tengu_review_remote_teleport_failed",
    "tengu_supported_dialog_kinds_restored",
    "tengu_sdk_init_handshake",
    "tengu_sdk_mcp_false_unavailable",
    "tengu_sdk_result",
    "tengu_shutdown_pending_state",
    "tengu_sdk_schema_violation",
    "tengu_sdk_session_crash",
    "tengu_sdk_stall",
    "tengu_sdk_ttft",
    "tengu_session_file_read",
    "tengu_started",
    "tengu_tool_use_error",
    "tengu_tool_use_granted_in_prompt_permanent",
    "tengu_transcript_write_failed",
    "tengu_transcript_writer_recovered",
    "tengu_persistence_suppressed",
    "tengu_tool_use_granted_in_prompt_temporary",
    "tengu_tool_use_not_loaded",
    "tengu_tool_use_not_loaded_check_failed",
    "tengu_tool_use_rejected_in_prompt",
    "tengu_tool_use_success",
    "tengu_bash_tool_command_executed",
    "tengu_bash_tool_command_failed",
    "tengu_background_shell_settled",
    "tengu_uncaught_exception",
    "tengu_uncaught_exception_loop",
    "tengu_unhandled_rejection",
    "tengu_voice_recording_started",
    "tengu_voice_toggled",
    "tengu_vscode_sdk_stream_ended_no_result",
    "tengu_team_mem_sync_started",
    "tengu_timer",
    "tengu_bg_adopt",
    "tengu_bg_agent_action",
    "tengu_bg_agent_dispatch",
    "tengu_bg_agent_notification",
    "tengu_bg_agent_terminal",
    "tengu_bg_attach",
    "tengu_bg_attach_first_frame",
    "tengu_bg_attach_legacy_autorespawn",
    "tengu_bg_attach_outcome",
    "tengu_bg_classify",
    "tengu_bg_daemon_cold_start_ask",
    "tengu_bg_daemon_cold_start_ask_answer",
    "tengu_bg_daemon_install",
    "tengu_bg_daemon_service_poll_fallthrough",
    "tengu_bg_daemon_service_stale_exec",
    "tengu_bg_daemon_spawn_failed",
    "tengu_bg_daemon_wmi_fallback",
    "tengu_bg_daemon_zombie_false_positive",
    "tengu_bg_daemon_zombie_restart",
    "tengu_bg_dispatch",
    "tengu_bg_dispatch_fallback",
    "tengu_bg_dispatch_low_mem",
    "tengu_bg_dispatch_rescued",
    "tengu_bg_dispatch_sigkill_escalate",
    "tengu_bg_dispatch_stale_drop",
    "tengu_bg_exec_no_lastline",
    "tengu_bg_killjob_ctrl_fallback",
    "tengu_bg_orphan_reap",
    "tengu_bg_proto_mismatch",
    "tengu_bg_pty_unavailable",
    "tengu_bg_reply_outcome",
    "tengu_bg_respawn",
    "tengu_bg_respawn_downgrade_refused",
    "tengu_bg_respawn_exhausted",
    "tengu_bg_respawn_resume_conflict",
    "tengu_bg_prewarm_burst",
    "tengu_bg_respawn_stale",
    "tengu_bg_respawn_unconfirmed_bail",
    "tengu_bg_retired",
    "tengu_bg_roster_parse_failed",
    "tengu_bg_skew_nudge",
    "tengu_bg_spare_claim",
    "tengu_bg_spare_claim_fail",
    "tengu_bg_spare_spawn",
    "tengu_bg_worker_exit",
    "tengu_bg_worker_spawn",
    "tengu_daemon_cold_start_prompt",
    "tengu_daemon_config_reload",
    "tengu_daemon_exit",
    "tengu_daemon_idle_exit",
    "tengu_daemon_install_prompt_answer",
    "tengu_daemon_lease",
    "tengu_daemon_peer_uid_reject",
    "tengu_daemon_self_restart_on_upgrade",
    "tengu_daemon_start",
    "tengu_daemon_startup_crash",
    "tengu_daemon_upgrade_refused_stale_binary",
    "tengu_daemon_worker_crash",
    "tengu_daemon_worker_permanent_exit",
    "tengu_daemon_yield",
    "tengu_daemon_yield_takeover",
  ]);
  DATADOG_EVENT_FIELD_ALLOWLIST = new Map([
    [
      "tengu_background_shell_settled",
      new Set([
        "outcome",
        "stop_cause",
        "stopped_by",
        "trigger",
        "subagent_owned",
        "unwanted",
        "elapsed_ms",
        "requested_timeout_ms",
        "deadline_ms",
        "duration_ms",
        "command_cpu_user_ms",
        "command_cpu_system_ms",
        "command_proc_cpu_ms",
        "command_cgroup_cpu_ms",
        "command_cgroup_shared",
        "command_cgroup_shared_left_running_only",
        "left_process_running",
      ]),
    ],
    [
      "tengu_remote_tool_forward",
      new Set([
        "outcome",
        "transport",
        "host_kind",
        "host_platform",
        "approval",
        "approved_by",
        "adoption",
        "reconcile_trigger",
        "reconcile_result",
        "duration_ms",
        "time_to_terminal_ms",
        "asking_ms",
      ]),
    ],
    [
      "tengu_remote_tool_serve",
      new Set([
        "outcome",
        "op",
        "transport",
        "policy",
        "refusal_code",
        "failure_code",
        "disposition",
        "second_leg",
      ]),
    ],
    ["tengu_remote_tool_restart_adoption", new Set(["journaled", "adoptable", "adopted", "park_adopted"])],
    ["tengu_remote_tool_restart_adoption_dropped", new Set(["dropped"])],
    ["tengu_remote_tool_restart_adoption_unroutable", new Set(["where", "route_code", "parked_at_restart"])],
  ]);
});
//@ chunk-w6mc5gr3.js:10735-10837 layout
function filterDatadogEventFields(eventName, fields) {
  let allowlist = DATADOG_EVENT_FIELD_ALLOWLIST.get(eventName);
  if (allowlist === undefined) return fields;
  return pickByHelper(fields, (value, key) => key === "sample_rate" || allowlist.has(key));
}
//@ chunk-w6mc5gr3.js:10837-11351 fingerprint (2.1.88 match: TAG_FIELDS, 0.532)
var TAG_FIELDS = [
  "arch",
  "attach_cold",
  "daemon_booted",
  "first_frame_kind",
  "surface",
  "via",
  "classifierModel",
  "classifierStage",
  "clientType",
  "decision",
  "entrypoint",
  "errorKind",
  "errorType",
  "failureKind",
  "fastPath",
  "sessionKind",
  "http_status_range",
  "http_status",
  "model",
  "op",
  "outcome",
  "platform",
  "projectsRole",
  "remoteControlLane",
  "projectsSession",
  "provider",
  "reason",
  "coachMode",
  "server_reason",
  "server_type",
  "source",
  "subscriptionType",
  "toolName",
  "uncoveredTailReason",
  "userBucket",
  "userType",
  "version",
  "versionBase",
  ...[],
];
//@ chunk-w6mc5gr3.js:11351-11419 file-local
function camelToSnakeCase(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
//@ chunk-w6mc5gr3.js:11419-12190 layout
/**
 * Datadog 允许的哈希/名称字段（及其 snake_case 集合）。
 */
var HASHED_FIELD_NAMES; // deferred: uses camelToSnakeCase of its import cycle while loading; runs once the cycle is complete
var HASHED_FIELD_NAMES_SNAKE;
var DROPPED_FIELD_NAMES;
deferInit("chunk-w6mc5gr3.js:11419", () => {
  HASHED_FIELD_NAMES = [
    "mcpServerName",
    "mcpServerBaseUrl",
    "mcpServerId",
    "toolUseContentLengths",
    "toolSchemaCharLengths",
    "toolSchemasHash",
    "errorMessageHash",
    "mcpServerKeyHash",
    "mcpToolName",
    "attributionMcpServer",
    "attributionMcpTool",
    "attributionSkill",
    "attributionMcpServerHash",
    "attributionMcpToolHash",
    "attributionSkillHash",
    "attributionAgentHash",
    "attributionPluginHash",
    "mcpServerNameHash",
    "mcpToolNameHash",
    "toolNameHash",
    "errorDetailsHash",
    "mcp_server_sha12",
    "rh",
    "baseUrl",
    "skill_name_hash",
    "plugin_id_hash",
    "plugin_name_redacted",
    "marketplace_name_redacted",
    "plugin_name_previous",
    "plugin_id_hash_previous",
    "plugin_version_sha",
    "skill_name_hashes",
    "parent_skill_name_hash",
    "item_name_hash",
    "pluginHookCountsByHash",
    "attachmentTypesSeen",
    ...[],
  ];
  HASHED_FIELD_NAMES_SNAKE = new Set(HASHED_FIELD_NAMES.map(camelToSnakeCase));
  DROPPED_FIELD_NAMES = new Set([]);
});
//@ chunk-w6mc5gr3.js:12190-12281 layout
function dropHashedFields(allData, toSnakeCase) {
  for (let key of Object.keys(allData)) {
    let snakeKey = toSnakeCase(key);
    if (HASHED_FIELD_NAMES_SNAKE.has(snakeKey) || DROPPED_FIELD_NAMES.has(snakeKey)) delete allData[key];
  }
}
//@ chunk-w6mc5gr3.js:12281-12370 placement (2.1.88 match: sanitizeToolName, 1)
/**
 * 遥测用工具名：MCP 工具一律 mcp。旧版名 sanitizeToolName 尚可，但归属应在 services/analytics。
 */
function toolNameForAnalytics(name, knownNames) {
  if (name.startsWith("mcp__")) return "mcp";
  if (knownNames && !isMcpFamilyToolName(name)) return "mcp";
  return name;
}
//@ chunk-w6mc5gr3.js:12370-12592 layout
/**
 * 需要按服务器限速转发的 MCP 事件。
 */
var MCP_RATE_LIMITED_EVENTS = [
  "tengu_mcp_list_changed",
  "tengu_mcp_degraded",
  "tengu_mcp_server_connection_succeeded",
  "tengu_mcp_server_connection_failed",
  "tengu_mcp_first_tools_list",
  "tengu_mcp_listen_reopen",
  "tengu_mcp_message_stream_outcome",
];
//@ chunk-w6mc5gr3.js:12592-12629 layout
function isMcpRateLimitedEvent(eventName) {
  return MCP_RATE_LIMITED_EVENTS.includes(eventName);
}
//@ chunk-w6mc5gr3.js:12629-12655 layout
/**
 * 按（事件, 服务器）的限速窗口：60 s 内最多放行 10 条，最多记 200 个窗口。
 */
var RATE_LIMIT_PER_WINDOW = 10;
var RATE_LIMIT_WINDOW_MS = 60000;
var MAX_RATE_WINDOWS = 200;
//@ chunk-w6mc5gr3.js:12655-13156 layout
/**
 * 按（事件, 服务器）滑动窗口限速，返回是否放行与上次放行后丢弃数。
 */
function admitRateLimited(peerRateWindows, eventName, serverKey, nowMs) {
  let windowKey = `${eventName}\x00${serverKey ?? "(no-server)"}`;
  let rateWindow = peerRateWindows.get(windowKey);
  if (!rateWindow) {
    if (peerRateWindows.size >= MAX_RATE_WINDOWS) {
      let oldestKey = peerRateWindows.keys().next().value;
      if (oldestKey !== undefined) peerRateWindows.delete(oldestKey);
    }
    rateWindow = {
      windowStartMs: 0,
      forwardedInWindow: 0,
      droppedSinceForward: 0,
    };
    peerRateWindows.set(windowKey, rateWindow);
  }
  if (nowMs - rateWindow.windowStartMs >= RATE_LIMIT_WINDOW_MS) {
    rateWindow.windowStartMs = nowMs;
    rateWindow.forwardedInWindow = 0;
  }
  if (rateWindow.forwardedInWindow >= RATE_LIMIT_PER_WINDOW) {
    rateWindow.droppedSinceForward++;
    return {
      admitted: false,
      droppedSinceLastForward: 0,
    };
  }
  rateWindow.forwardedInWindow++;
  let droppedSinceLastForward = rateWindow.droppedSinceForward;
  rateWindow.droppedSinceForward = 0;
  return {
    admitted: true,
    droppedSinceLastForward,
  };
}
//@ chunk-w6mc5gr3.js:13156-14504 layout
/**
 * 发送 Datadog 日志（可 gzip）；代理拒绝或 DNS 无解析时暂停一段时间，gzip 被拒时改为不压缩重发。
 */
async function postDatadogLogs(logs, options) {
  if (options.isPausedByEgressRefusal()) return false;
  let shouldGzip =
    options.gzip !== "refused" && (env.CLAUDE_CODE_GZIP_DATADOG_LOGS ?? isRemoteManagedEnvironment());
  try {
    await externalHttp.post(DATADOG_LOGS_ENDPOINT, shouldGzip ? gzipSync(jsonStringify(logs)) : logs, {
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": DATADOG_CLIENT_TOKEN,
        ...(shouldGzip && {
          "Content-Encoding": "gzip",
        }),
      },
      timeout: REQUEST_TIMEOUT_MS,
    });
  } catch (error) {
    logForDebugging(`Failed to flush logs to Datadog: ${error}`, {
      level: "error",
    });
    let response = isAxiosError(error) ? error.response : undefined;
    let proxyError = findProxyError(error);
    if (
      (response && isAllowlistBlockedResponse(response.status, response.headers)) ||
      (response?.status === 403 && response.headers["x-proxy-error"] !== undefined) ||
      (proxyError?.connectStatus === 403 &&
        (proxyError.headers["x-deny-reason"] ?? "host_not_allowed") === "host_not_allowed") ||
      (isRemoteManagedEnvironment() &&
        getErrnoCode(error) === "ENOTFOUND" &&
        (await isLogsHostUnresolvable()))
    ) {
      logForDebugging(
        `Logs are paused for ${MAX_SHUTDOWN_WAIT_MS / 60000} minutes and dropped unsent until then: a proxy refused the post to the logs host, or the host's name was not found on a second lookup`,
        {
          level: "warn",
        },
      );
      options.egressRefusalUnconfirmed = false;
      options.egressRefusedAt = Date.now();
      return false;
    }
    let status = response?.status;
    if (!shouldGzip || status === 429) return false;
    let outcome = status === undefined ? "no_response" : `http_${status}`;
    logForDebugging(
      `Datadog did not take a gzipped log batch (${outcome}); resending it uncompressed, and sending later batches from this process uncompressed`,
      {
        level: "error",
      },
    );
    options.gzip = "refused";
    options.unreportedGzipFailure ??= outcome;
    return options.postCurrent(logs);
  }
  if (options.unreportedGzipFailure !== undefined) {
    let unreportedGzipFailure = options.unreportedGzipFailure;
    options.unreportedGzipFailure = undefined;
    logFeatureSad("datadog_logs_gzip", unreportedGzipFailure);
  }
  if (shouldGzip && options.gzip === "untried") {
    options.gzip = "accepted";
    logFeatureOk("datadog_logs_gzip");
  }
  return true;
}
//@ chunk-w6mc5gr3.js:14504-14522 layout
var USER_BUCKET_COUNT = 30;
var MAX_SNAKE_CASE_CACHE = 2048;
//@ chunk-w6mc5gr3.js:14522-16346 layout
/**
 * Datadog 发送状态：批量发送器、出口拒绝暂停、gzip 协商、用户分桶、键名缓存等。
 */
class DatadogState {
  datadogInitialized = null;
  egressRefusedAt = -1 / 0;
  egressRefusalUnconfirmed = false;
  lookAheadStarted = false;
  gzip = "untried";
  unreportedGzipFailure;
  builtUnredacted = new WeakSet();
  sender = scheduleFlush({
    maxBatchSize: MAX_BATCH_SIZE,
    getFlushIntervalMs,
    post: async (batch) => {
      try {
        await this.postCurrent(batch);
      } catch (error) {
        logForDebugging(`Datadog log flush threw: ${error}`, {
          level: "error",
        });
      }
    },
  });
  isPausedByEgressRefusal() {
    let sinceRefusalMs = Date.now() - this.egressRefusedAt;
    if (sinceRefusalMs < 0) {
      this.egressRefusedAt = -1 / 0;
      return false;
    }
    return (
      sinceRefusalMs < (this.egressRefusalUnconfirmed ? getDatadogShutdownTimeoutMs() : MAX_SHUTDOWN_WAIT_MS)
    );
  }
  async askResolverAheadOfLogs() {
    if ((this.lookAheadStarted && this.egressRefusedAt === -1 / 0) || this.isPausedByEgressRefusal()) return;
    let egressRefused = this.egressRefusedAt !== -1 / 0;
    let egressRefusalUnconfirmed = egressRefused && this.egressRefusalUnconfirmed;
    this.lookAheadStarted = true;
    this.egressRefusedAt = -1 / 0;
    try {
      if (!isRemoteManagedEnvironment() || !canReachDatadog()) return;
      let [lookup, recheck] = await Promise.all([
        promises
          .lookup(new URL(DATADOG_LOGS_ENDPOINT).hostname, {
            hints: ADDRCONFIG,
          })
          .then(() => "found", getErrnoCode),
        isLogsHostUnresolvable(),
      ]);
      if (!canReachDatadog() || this.isPausedByEgressRefusal()) return;
      if (lookup !== "ENOTFOUND" || !recheck) {
        if (egressRefusalUnconfirmed)
          logFeatureSad("logs_host_lookup", lookup === "found" ? "name_found" : "no_clear_answer");
        return;
      }
      this.egressRefusalUnconfirmed = !egressRefused;
      this.egressRefusedAt = Date.now();
      let waitText = egressRefused
        ? `${MAX_SHUTDOWN_WAIT_MS / 60000} minutes`
        : `${getDatadogShutdownTimeoutMs() / 1000} seconds`;
      logForDebugging(
        `Logs are paused for ${waitText} and dropped until then: DNS gives no address for the logs host`,
        {
          level: "warn",
        },
      );
    } catch (error) {
      logError(error);
    }
  }
  postCurrent(batch) {
    let sendable = isHipaaModeCurrent() ? batch.filter((entry) => !this.builtUnredacted.has(entry)) : batch;
    return sendable.length > 0 ? postDatadogLogs(sendable, this) : Promise.resolve(false);
  }
  initializeDatadog = memoizeAlias(async () => {
    if (isFirstPartyTelemetryBlocked() || isByocDatadogDisabled()) {
      this.datadogInitialized = false;
      return false;
    }
    try {
      this.datadogInitialized = true;
      return true;
    } catch (error) {
      logError(error);
      this.datadogInitialized = false;
      return false;
    }
  });
  getUserBucket = memoizeAlias(() => {
    let userId = getOrCreateUserID();
    let hash = createHash("sha256").update(userId).digest("hex");
    return parseInt(hash.slice(0, 8), 16) % USER_BUCKET_COUNT;
  });
  peerRateWindows = new Map();
  #e = new Map();
  get snakeCaseKeyCount() {
    return this.#e.size;
  }
  toSnakeCase = (key) => {
    let cached = this.#e.get(key);
    if (cached === undefined) {
      cached = camelToSnakeCase(key);
      if (this.#e.size < MAX_SNAKE_CASE_CACHE) this.#e.set(key, cached);
    }
    return cached;
  };
}
//@ chunk-w6mc5gr3.js:16346-16369 layout
var datadogStateSlot; // deferred: uses DatadogState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-w6mc5gr3.js:16346", () => {
  datadogStateSlot = new HostScoped(() => new DatadogState());
});
//@ chunk-w6mc5gr3.js:16369-16468 facade-exports
function resetDatadogInit() {
  let state = datadogStateSlot.of(getRootSession().host);
  state.initializeDatadog.cache?.clear?.();
  state.datadogInitialized = null;
}
//@ chunk-w6mc5gr3.js:16468-16528 facade-exports
async function shutdownDatadog() {
  await datadogStateSlot.of(getRootSession().host).sender.shutdown();
}
//@ chunk-w6mc5gr3.js:16528-16632 layout
/**
 * 去掉开发版本号中的 .t/sha 构建后缀。
 */
function stripBuildSuffix(version) {
  return version.replace(/^(\d+\.\d+\.\d+-(?:dev|engine|aot)\.\d{8})\.t\d+\.sha[a-f0-9]+$/, "$1");
}
//@ chunk-w6mc5gr3.js:16632-16860 layout
/**
 * 模型名脱敏：非 Claude 模型为 null，已知模型取规范名，其余为 other。
 */
function sanitizeModelName(model, { isTrustedAnt, onAnthropicHost }) {
  if (typeof model !== "string") return null;
  if (isTrustedAnt) return model;
  if (model === CONFIDENTIAL_MODEL_ID && onAnthropicHost) return model;
  if (!model.toLowerCase().includes("claude")) return null;
  let canonicalName = getCanonicalName(strip1mSuffix(model), {
    identity: true,
  });
  return canonicalName in MODEL_COSTS ? canonicalName : "other";
}
//@ chunk-w6mc5gr3.js:16860-17167 layout
/**
 * 按 tengu_agile_glade 为 tengu_feature_ok 事件抽样（可能丢弃）。
 */
function applyFeatureSampling(eventName, properties) {
  let featureName = properties.feature_name;
  if (eventName !== "tengu_feature_ok" || featureName === undefined) return properties;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_agile_glade", null);
  let rateTable = isPlainObject(featureValue_CACHED_MAY_BE_STALE)
    ? featureValue_CACHED_MAY_BE_STALE[featureName]
    : undefined;
  if (typeof rateTable !== "number") return properties;
  let sampleRate = properties.sample_rate;
  let sampleRate_2 = typeof sampleRate === "number" && sampleRate > 0 && sampleRate < 1 ? sampleRate : 1;
  let rolled = rollSampleRate(rateTable / sampleRate_2);
  if (rolled === null) return properties;
  if (rolled === 0) return null;
  return {
    ...properties,
    sample_rate: rateTable,
  };
}
//@ chunk-w6mc5gr3.js:17167-18699 facade-exports (2.1.88 match: trackDatadogEvent, 0.503)
/**
 * 发送 Datadog 日志：仅第一方 API、事件在 243 个白名单内、未被出口拒绝暂停；合并事件元数据与 envContext，字段转 snake_case、工具名和模型名脱敏，ddtags 取 TAG_FIELDS，service=claude-code env=external，进入批量发送器（默认 15 秒刷新）。
 */
async function trackDatadogEvent(eventName, properties) {
  if (getAPIProvider() !== "firstParty") return;
  let state = datadogStateSlot.of(getRootSession().host);
  let datadogInitialized = state.datadogInitialized;
  if (datadogInitialized === null) datadogInitialized = await state.initializeDatadog();
  if (!datadogInitialized || !DATADOG_ALLOWED_EVENTS.has(eventName)) return;
  if (state.isPausedByEgressRefusal()) return;
  let properties_2 = applyFeatureSampling(eventName, properties);
  if (properties_2 === null) return;
  let droppedSinceLastForward;
  if (isMcpRateLimitedEvent(eventName)) {
    let mcpKey = properties_2.mcpServerKeyHash ?? properties_2.mcpServerBaseUrl;
    let admission = admitRateLimited(
      state.peerRateWindows,
      eventName,
      mcpKey === undefined ? undefined : String(mcpKey),
      Date.now(),
    );
    if (!admission.admitted) return;
    if (admission.droppedSinceLastForward > 0) droppedSinceLastForward = admission.droppedSinceLastForward;
  }
  state.askResolverAheadOfLogs();
  try {
    let metadata = await getEventMetadata({
      model: properties_2.model,
      betas: properties_2.betas,
    });
    let {
      envContext,
      head_sha: headSha,
      is_clean_tree_at_start: isCleanTreeAtStart,
      changed_file_count_at_start: changedFileCountAtStart,
      untracked_file_count_at_start: untrackedFileCountAtStart,
      ...restMetadata
    } = metadata;
    let allData = {
      ...restMetadata,
      ...envContext,
      ...filterDatadogEventFields(eventName, properties_2),
      userBucket: state.getUserBucket(),
      ...(droppedSinceLastForward !== undefined && {
        droppedSinceLastForward,
      }),
    };
    dropHashedFields(allData, state.toSnakeCase);
    if (typeof allData.toolName === "string")
      allData.toolName = toolNameForAnalytics(allData.toolName, allData.isMcp === true);
    if (allData.model !== undefined) {
      let onAnthropicHost = isFirstPartyAnthropicBaseUrl();
      let model = sanitizeModelName(allData.model, {
        isTrustedAnt: false,
        onAnthropicHost,
      });
      if (model === null) return;
      allData.model = model;
    }
    if (typeof allData.version === "string") allData.version = stripBuildSuffix(allData.version);
    if (allData.status !== undefined && allData.status !== null) {
      let statusCode = String(allData.status);
      allData.http_status = statusCode;
      let firstDigit = statusCode.charAt(0);
      if (firstDigit >= "1" && firstDigit <= "5") allData.http_status_range = `${firstDigit}xx`;
      delete allData.status;
    }
    let hipaa = isHipaaModeCurrent();
    let sanitized = hipaa ? sanitizeCommonFields(allData) : allData;
    let payload = {
      ddsource: "nodejs",
      ddtags: [
        `event:${eventName}`,
        ...TAG_FIELDS.filter((field) => sanitized[field] !== undefined && sanitized[field] !== null).map(
          (field) => `${state.toSnakeCase(field)}:${sanitized[field]}`,
        ),
      ].join(","),
      message: eventName,
      service: "claude-code",
      hostname: "claude-code",
      env: "external",
    };
    for (let [key, value] of Object.entries(sanitized))
      if (value !== undefined && value !== null) payload[state.toSnakeCase(key)] = value;
    if (!hipaa) state.builtUnredacted.add(payload);
    state.sender.enqueue(payload);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-w6mc5gr3.js:18699-18728 layout
function getDatadogShutdownTimeoutMs() {
  return getFlushIntervalMs() + 5000;
}
//@ chunk-w6mc5gr3.js:18728-18791 fingerprint (2.1.88 match: getFlushIntervalMs, 1)
/**
 * Datadog 批量刷新间隔：CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS 或 15000。
 */
function getFlushIntervalMs() {
  return env.CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS || DEFAULT_FLUSH_INTERVAL_MS;
}
//@ chunk-w6mc5gr3.js:18791-18926 affinity
/**
 * 二次解析 Datadog 主机名，ENOTFOUND 时为 true。
 */
async function isLogsHostUnresolvable() {
  try {
    await new Resolver({
      timeout: 1000,
      tries: 1,
    }).resolve4(new URL(DATADOG_LOGS_ENDPOINT).hostname);
    return false;
  } catch (error) {
    return getErrnoCode(error) === "ENOTFOUND";
  }
}
//@ chunk-w6mc5gr3.js:18926-18967 sole-consumer
function canReachDatadog() {
  return getUsableProxyUrl() === undefined || shouldBypassProxy(DATADOG_LOGS_ENDPOINT);
}
//@ chunk-9cjx5pnm.js:19928-19986 fingerprint (2.1.88 match: flushLogs, 0.586)
var flushLogs; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9cjx5pnm.js:19928", () => {
  flushLogs = Object.freeze({
    "Content-Type": "application/json",
  });
});
//@ chunk-12wyw8h8.js:8193-8261 fingerprint (2.1.88 match: getUserBucket, 1)
function getUserBucket(userId) {
  return createHash("sha256").update(jsonStringify(userId), "utf8").digest("hex");
}
export {
  getUserBucket,
  flushLogs,
  shutdownDatadog,
  DATADOG_CLIENT_TOKEN,
  scheduleFlush,
  trackDatadogEvent,
  resetDatadogInit,
};
