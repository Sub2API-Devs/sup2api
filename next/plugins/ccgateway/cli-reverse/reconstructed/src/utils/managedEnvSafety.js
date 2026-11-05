/**
 * utils/managedEnvSafety.ts
 *
 * 2.1.316 新增：托管环境变量安全检查（PROJECT_SCOPE_BLOCKED_ENV_VARS）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-71parphm.js (26)
 * attribution: placement 26
 */
import {
  stringSchema,
  objectSchema,
  _enum,
  booleanSchema,
  array,
} from "../../vendor/zod/v4/classic/schemas.js";
import { strip1mSuffix } from "./model/modelIds.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { EFFORT_LEVELS } from "./effort.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "./envUtils.js";
import { env } from "./env.js";
import {
  HOST_MANAGED_MARKER_ENV_VARS,
  TOKEN_FD_ENV_VARS,
  BASE_URL_ENV_VARS,
  isHelperEnvVar,
  isDangerousEnvVar,
  isDisablingTelemetryEnv,
  PRIVACY_ENV_VARS,
  isNetworkEnvVar,
  isProviderManagedEnvVar,
  isAwsProfileEnvVar,
  isProxyEnvVar,
  isTlsOrCertEnvVar,
  OTEL_ENV_VARS,
  isProtectedEnvVar,
} from "./managedEnvConstants.js";
import { HOST_SKILL_CATALOG_ENV, isProviderManagedByHost } from "./entrypointKinds.js";
import {
  isProjectScopeBlockedEnvVar,
  isServableEnvValue,
  PROJECT_LEVEL_SETTING_SOURCES,
} from "./managedEnvApply.js";
import { logForDebugging } from "./debug.js";
import {
  ENV_ENTRY_PROBLEM_TEXT,
  envEntryProblem_2,
  describeEnvEntryName,
  escapeForDisplay,
} from "./envValidation.js";
import { gatewayServesManagedSettings, getGatewayAuth } from "../bootstrap/state.js";
import { getRemoteManagedSettingsSyncFromCache } from "../services/remoteManagedSettings/remoteSettingsCache.js";
import { isHttpMcpServeInvocation } from "../entrypoints/mcpServeArgs.js";
import { isChildScrubbedCredentialFamily, spellingIn } from "./subprocessEnv.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-71parphm.js:2276-2641 placement
/**
 * 模型组合（lead/worker）配置 schema。
 */
var ModelIdSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ModelMixSchema;
deferInit("chunk-71parphm.js:2276", () => {
  ModelIdSchema = () =>
    stringSchema()
      .trim()
      .min(1)
      .max(100)
      .refine((modelId) => strip1mSuffix(modelId) === modelId);
  ModelMixSchema = DoctorLazy(() =>
    objectSchema({
      lead: ModelIdSchema(),
      worker: ModelIdSchema(),
      effort: _enum(EFFORT_LEVELS).optional(),
      coordinator: booleanSchema().default(true),
      label: stringSchema().trim().min(1).max(60).default("Mix"),
      prompt: stringSchema().trim().min(1).max(4000).optional(),
      whenToUse: stringSchema().trim().max(4000).optional(),
      removePromptStrings: array(
        stringSchema()
          .max(2000)
          .refine((promptString) => promptString.trim() !== ""),
      )
        .max(20)
        .optional(),
    }),
  );
});
//@ chunk-71parphm.js:2641-2663 placement
/**
 * 个人作用域阻断的占位实现（不返回任何内容）。
 */
function noPersonalScopeBlock() {
  return;
}
//@ chunk-71parphm.js:2663-2677 placement
/**
 * 空的环境处理钩子。
 */
function noopEnvHook() {}
//@ chunk-71parphm.js:2677-2731 placement
var REMOTE_LIKE_ENV_VARS = ["CLAUDE_CODE_REMOTE", "CLAUDE_CODE_IS_COWORK"];
//@ chunk-71parphm.js:2731-2784 placement
/**
 * 判断环境中是否带有远程/协作会话标记。
 */
function isRemoteLikeEnv(env_2) {
  return REMOTE_LIKE_ENV_VARS.some((varName) => (env_2 ? isEnvTruthy(env_2[varName]) : env[varName]));
}
//@ chunk-71parphm.js:2784-11213 placement
/**
 * 只能由宿主设置的环境变量名单（宿主凭据、会话令牌、沙箱与后台进程相关等）。
 */
var MANAGED_ENV_SAFETY_LISTS; // deferred: uses HOST_MANAGED_MARKER_ENV_VARS (./managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
var HOST_ONLY_ENV_VARS;
var REMOTE_ENV_VARS;
var CHROME_RELATED_ENV_VARS;
var HOSTED_ENV_VARS;
var BRIDGE_ENV_VARS;
var CHROME_ENV_VARS;
deferInit("chunk-71parphm.js:2784", () => {
  MANAGED_ENV_SAFETY_LISTS = [];
  HOST_ONLY_ENV_VARS = new Set([
    ...HOST_MANAGED_MARKER_ENV_VARS,
    "CLAUDE_CODE_HOST_GATEWAY_LINEAGE",
    "CLAUDE_CODE_HOST_CREDS_FILE",
    "CLAUDE_CODE_HOST_AUTH_ENV_VAR",
    "CLAUDE_BG_AUTH_SNAPSHOT_PATH",
    "CLAUDE_BG_SOCKET_TOKENS_PATH",
    ...TOKEN_FD_ENV_VARS,
    "CLAUDE_CODE_MESSAGING_SOCKET",
    "CLAUDE_CODE_MESSAGING_TOKEN",
    "CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION",
    "CLAUDE_CODE_DISABLE_DANGEROUS_RM_TIMEOUT",
    "CLAUDE_CODE_DISABLE_SUBSTITUTION_RM_PROMPT",
    "CLAUDE_CODE_DISABLE_INLINE_SHELL_RM_PROMPT",
    "CLAUDE_CODE_STRICT_INLINE_SHELL_RM_PROMPT",
    "CLAUDE_CODE_DISABLE_MOUNTED_DRIVE_RM_PROMPT",
    "CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS",
    "CLAUDE_CODE_DISABLE_POWERSHELL_CMD_RM_DENY",
    "CLAUDE_CODE_DISABLE_ULTRAREVIEW_TRUST_CHECK",
    "CLAUDE_CODE_SANDBOX_LEAVE_PARENT_FOLDERS_ALONE",
    "CLAUDE_CODE_TRANSCRIPT_LOCAL_GC",
    "CLAUDE_CODE_MANAGED_SETTINGS_PATH",
    "CLAUDE_CODE_EVAL_CONFINED",
    "CLAUDE_CODE_TELEPORT_MOVE",
    "CLAUDE_CODE_SANDBOX_LEAVE_DENIES_TO_SRT_WIN",
    "CLAUDE_CODE_TUI_TRIAL",
    "CLAUDE_RELAUNCH_SESSION_ADD_DIRS",
    "CLAUDE_BG_SESSION_PERMISSION_RULES",
    "CLAUDE_BG_GATEWAY_WITHHELD",
    "CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR",
    "CLAUDE_SESSION_INGRESS_TOKEN_FILE",
    "CLAUDE_CODE_SESSION_ACCESS_TOKEN",
    "CLAUDE_CODE_SESSIONS_OAUTH_TOKEN",
    "CLAUDE_CODE_SESSION_KIND",
    "CLAUDE_CODE_SANDBOXED",
    "CLAUDE_BG_WORKSPACE_TRUSTED",
    "CLAUDE_BG_CARRIED_PROMPTS_SHA256",
    "CLAUDE_CODE_RELAUNCH_HOME_TRUST",
    "CLAUDE_CODE_RELAUNCH_RESUME_HINT_FLAGS",
    "CLAUDE_BRIDGE_REATTACH_SESSION",
    "CLAUDE_CODE_IGNORE_PERSISTED_TRUST",
    "CLAUDE_CODE_PROJECT_DIR_NAME",
    "CLAUDE_PTY_HOST_EXEC",
    "CLAUDE_BG_PTY_AUTH",
    "CLAUDE_BG_RV_AUTH",
    "CLAUDE_BG_CLAIM_AUTH",
    "CLAUDE_BG_RENDEZVOUS_SOCK",
    "CLAUDE_BG_BACKEND",
    "CLAUDE_BG_TCC_DISCLAIMED",
    "CLAUDE_PTY_HOST_NO_STABLE_PATH",
    "CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS",
    "CLAUDE_BG_SILENT_PEER_TIMEOUT_MS",
    "CLAUDE_CODE_DISABLE_LAUNCHER_SIGN_IN",
  ]);
  REMOTE_ENV_VARS = new Set([
    "CLAUDE_CODE_REMOTE",
    "CLAUDE_CODE_ATTRIBUTION_PROJECT",
    "CLAUDE_CODE_REMOTE_HERMETIC_MODE",
    "CLAUDE_CODE_HOSTED_DESKTOP",
    "CLAUDE_CODE_ENVIRONMENT_KIND",
    "CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE",
    "CLAUDE_RUNNER_ACTIVITY_FD",
    "CLAUDE_RUNNER_UPDATE_BIN",
    "CLAUDE_CODE_WARN_DISK_FREE_GIB",
    "CLAUDE_CODE_WARN_MEMORY_FREE_GIB",
    "CCR_BYOC_RESOURCE_WATCHDOG_TELEMETRY",
    "CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT",
    "CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT",
    "CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS",
    "CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT",
    "CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT",
    "CLAUDE_CODE_BRIDGE_MCP_CARRIER",
    "CLAUDE_CODE_BRIDGE_PROMPT_SHA256",
    "CLAUDE_CODE_APPEND_PROMPT_HEAD",
    "CLAUDE_CODE_BRIDGE_OWNER_ACCOUNT_UUID",
    "CLAUDE_CODE_BRIDGE_OWNER_ORG_UUID",
    "CLAUDE_CODE_BRIDGE_SOURCE_DIR",
    "VOICE_STREAM_BASE_URL",
    "CLAUDE_CODE_POLL_EVENTS",
    "CLAUDE_CODE_POLL_EVENT_DECLARATIONS",
    "CLAUDE_CODE_REPLY_GATE_POLICY",
    "CLAUDE_CODE_ACCOUNT_UUID",
    "CLAUDE_CODE_ORGANIZATION_UUID",
    "CLAUDE_CODE_USER_EMAIL",
    "CLAUDE_CODE_CONTAINER_ID",
    "CLAUDE_CODE_SESSION_ID",
    "CLAUDE_CODE_SYNC_SESSION_REFS",
    "CLAUDE_CODE_SKILL_PROPOSALS",
    "CLAUDE_CODE_REMOTE_SESSION_ID",
    "CLAUDE_CODE_REMOTE_MCP_CONFIG",
    "CLAUDE_CODE_HOVER_REST",
    "CCR_AGENT_PROXY_ENABLED",
    "CCR_AGENT_PROXY_RELAY_MODE",
    "CCR_AGENT_PROXY_INCLUDE_HOSTS",
    "CCR_AGENT_PROXY_RECEIVE_GATE_DISABLED",
    "CCR_AGENT_PROXY_UPLOAD_GATE_DISABLED",
    "CCR_AGENT_PROXY_MAX_BUSY_TUNNELS",
    "CCR_AGENT_PROXY_JAVA_STORE_DIRECT_DISABLED",
    "CCR_AGENT_PROXY_NO_PROXY_LOCAL_ONLY",
    "CCR_AGENT_PROXY_CA_WATCH_ENABLED",
    "CCR_AGENT_PROXY_NSS_RECORDS_DISABLED",
    "CCR_AGENT_PROXY_CA_CERT_B64",
    "CCR_AGENT_PROXY_FRAME_HOSTS",
    "SELF_HOSTED_RUNNER_AGENT_PROXY_URL",
    "CCR_AGENT_PROXY_STANDALONE_URL",
    "AGENT_PROXY_URL",
    "AGENT_PROXY_AUTH_TOKEN",
    "CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN",
    "CLAUDE_CODE_MCP_SERVE_SETTINGS",
    "CLAUDE_CODE_MCP_SERVE_WORKSPACE_ROOT",
    "CLAUDE_CODE_MCP_SERVE_TOOL_OUTPUT",
    "CLAUDE_CODE_MCP_SERVE_INTERFACE_MIN_VERSION",
    "CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS",
    "CLAUDE_CODE_MCP_SERVE_TUNNEL_BINARY_FRAMES",
    ...[],
    "CLAUDE_CODE_AGENT_PROXY_GIT_CONFIG",
    "CLAUDE_CODE_AGENT_PROXY_GH_SHIM",
    "CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS",
    "SESSION_INGRESS_URL",
    "CLAUDE_CODE_REMOTE_SDK_URL",
    "CCR_SESSION_PROFILE",
    "CLAUDE_CODE_REMOTE_SESSION_ORIGIN",
    "CLAUDE_CODE_DISABLE_WORKING_SYNC_WATCH",
    "CLAUDE_CODE_WORKER_EPOCH",
    "CLAUDE_CODE_DISABLE_WORKING_SYNC",
    ...[],
    "CLAUDE_CODE_CCR_EARLY_HYDRATE_PREFETCH",
    "CLAUDE_CODE_CCR_EARLY_REMOTE_CONNECT",
    "CLAUDE_CODE_CCR_WORKER_SOCKET",
    "CLAUDE_CODE_CCR_OWN_CONNECTION_POOL",
    "CLAUDE_CODE_CCR_EARLY_PLUGINS_SYNC",
    "CLAUDE_CODE_CCR_EARLY_SKILLS_SYNC",
    "CLAUDE_CODE_CCR_EARLY_SYNC_AFTER_SETTINGS_REFUSAL",
    "CLAUDE_CODE_SYNC_REUSE_WITHIN_MS",
    "CLAUDE_CODE_SYNC_PLUGINS_DOWNLOAD_CONCURRENCY",
    "CLAUDE_CODE_CCR_FOLD_FIRST_TURN_RESCAN",
    "CLAUDE_CODE_CCR_ONE_PLUGIN_LOAD_PER_RELOAD",
    "CLAUDE_CODE_CCR_SLOW_SKILLS_WATCH",
    "CLAUDE_CODE_MCP_REGISTRY_FETCH_AT_STARTUP",
    "CLAUDE_CODE_MCP_ALWAYS_LOAD_JOIN_BEFORE_INPUT",
    "CLAUDE_CODE_CHROME_LATE_MCP_SERVER",
    "CLAUDE_CODE_MCP_SKIP_UNCHANGED_RELIST",
    "CLAUDE_CODE_GROWTHBOOK_KICK_FROM_INIT",
    "CLAUDE_CODE_GROWTHBOOK_KICK_ON_WARM_CACHE",
    "CLAUDE_CODE_SKIP_MCP_DEBUG_LOG_FILES",
    "CLAUDE_CODE_MCP_NO_REDIAL_AFTER_POLICY_REFUSAL",
    "CLAUDE_CODE_SLEEP_COMPACT",
    "CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS",
    "CLAUDE_CODE_CCR_SKIP_FRESH_MIGRATIONS",
    "CLAUDE_CODE_ATTACHMENTS_IN_USER_DATA",
    "CLAUDE_CODE_MANAGED_CONFIG_PREFETCH",
    "CLAUDE_CODE_CONFIG_WATCH_EVENTS",
    "CLAUDE_CODE_SPARE_KEEPS_BOOT_SESSION_ID",
    "CLAUDE_CODE_FLAG_FETCH_WAIT_MS",
    "CLAUDE_CODE_GB_DISK_CACHE_WHEN_TELEMETRY_OFF",
    "CLAUDE_CODE_HOME_SEED_HOLD_TIMEOUT_MS",
    "CLAUDE_CODE_HOME_SEED_VERDICT_TIMEOUT_MS",
    "CLAUDE_CODE_TRANSCRIPT_SLIM_TOOL_RESULTS",
    "CLAUDE_CODE_DISABLE_STOP_OF_HELD_MESSAGES",
    "CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS",
    "CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP",
    "CLAUDE_CODE_PLAIN_DELTA_FAST_PATH",
    "CLAUDE_CODE_PLAIN_DELTA_DIRECT_WRITE",
    "CLAUDE_CODE_PLAIN_DELTA_TAKE_AT_SOURCE",
    "CLAUDE_CODE_STREAM_TIMER_SLACK_MS",
    "CLAUDE_CODE_UNWATCHED_REPLY_HOLD_MS",
    "CLAUDE_CODE_MAIN_REPLY_HOLD_MS",
    "CLAUDE_CODE_REMOTE_STALL_CHECK_INTERVAL_MS",
    "CLAUDE_CODE_STREAM_EVENT_HOLD_MS",
    "CLAUDE_CODE_STREAM_EVENT_MAX_LINE_BYTES",
    "CLAUDE_CODE_DISABLE_HOOK_FORWARDING",
    "CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING",
    "CLAUDE_CODE_DISABLE_TURN_HANDOFF",
    "CLAUDE_CODE_DISABLE_HELD_MESSAGE_RECOGNITION",
    "CLAUDE_CODE_RESTRICTED",
    "CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG",
    "CLAUDE_CODE_PERSONAL_CONFIG_FIX",
    "CLAUDE_CODE_PERSONAL_HOOKS_OFF",
  ]);
  CHROME_RELATED_ENV_VARS = new Set([
    "CLAUDE_REMOTE_WORKFLOW_SCRIPT",
    "CLAUDE_REMOTE_WORKFLOW_ARGS",
    "CLAUDE_WORKFLOW_NAME_ONLY",
  ]);
  HOSTED_ENV_VARS = new Set([
    "CLAUDE_CODE_ENTRYPOINT",
    "CLAUDE_CODE_PROGRAM_USE_CASE_ID",
    "CLAUDE_CODE_PROGRAM_USE_CASE_STAMPED",
    "CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS",
    "CLAUDE_CODE_HOST_SESSION_ID",
    "CLAUDE_CODE_HOST_WORKTREE",
    "CLAUDE_CODE_HOST_WORKTREE_FENCE",
    "CLAUDE_CODE_HOST_SHORT_TEMP_DIRS",
    "CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST",
    "CLAUDE_CODE_IS_COWORK",
    "CLAUDE_CODE_COWORK_FRAME_ARTIFACTS",
    "CLAUDE_CODE_HOST_SCHEDULED_RUN",
    "CLAUDE_CODE_ARTIFACT_SHARE",
    "CLAUDE_CODE_ARTIFACT_VERSIONS",
    "CLAUDE_CODE_HOST_GUARDS_ARTIFACTS_MCP",
    "CLAUDE_CODE_CCR_SURFACE",
    "CLAUDE_CODE_SESSION_ORIGIN",
    "CLAUDE_CODE_SESSION_BEGAN_AS_COPY",
    "CLAUDE_CODE_WITTY_DEWDROP",
    "CLAUDE_CODE_FIZZY_GROVE",
    "CLAUDE_CODE_DEEP_TWILIGHT",
    "CLAUDE_CODE_CCR_EVENT_FLUSH_POLICY",
    "SYSTEM_REMINDER_MEMORY_CONTEXT",
    "CLAUDE_CODE_MEMORY_CONTEXT_NO_WAIT",
    "CLAUDE_CODE_MEMORY_SUBAGENT_APPEND",
    "CLAUDE_CODE_POST_TURN_MEMORY",
    "CLAUDE_CODE_POST_TURN_MEMORY_CONFIG",
    "CLAUDE_CODE_POST_TURN_MEMORY_SYNC",
    "CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS",
    "CLAUDE_CODE_UPFRONT_TOOLS",
    ...MANAGED_ENV_SAFETY_LISTS,
    "CLAUDE_CODE_QUESTION_EXTENDED",
    "CLAUDE_CODE_QUESTION_OPTIONAL_DESCRIPTIONS",
    "CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES",
    "CLAUDE_CODE_ATTACHMENTS_BY_PATH",
    "CLAUDE_CODE_MCP_APPS_HOST",
    "CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD",
    "CLAUDE_CODE_REMOTE_TOOLS_PIN_STORED_LOGIN",
    "CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED",
    "CLAUDE_CODE_REMOTE_TOOLS_HOST_IDLE_RELEASE_MINUTES",
    "CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH",
    "CLAUDE_CODE_SDK_HAS_SESSIONS_OAUTH_REFRESH",
    "CLAUDE_CODE_SDK_READS_SESSION_STATE",
    "CLAUDE_CODE_SDK_READS_STARTUP_MARKS",
    "CLAUDE_CODE_EMIT_USER_PROMPT_SUBMIT_HOOK_EVENTS",
    "CLAUDE_CHROME_PAIRED_DEVICE_ID",
    "CLAUDE_CHROME_TAB_GROUP_KEY",
    HOST_SKILL_CATALOG_ENV,
    "CLAUDE_CODE_DESKTOP_SKILLS_PLUGIN_DIR",
    "CLAUDE_CODE_DESKTOP_CONNECTOR_NAMES",
    "CLAUDE_CODE_SANDBOXED",
    "CLAUDE_CODE_ATTRIBUTION_STATUS_TIMEOUT_MS",
    "CLAUDE_CODE_TOOL_USE_ID",
    "CLAUDE_CODE_DISABLE_ATTRIBUTION_CROSS_REPO",
    "CLAUDE_CODE_CONFIG_PROBE",
    "CLAUDE_RUNNER_ALIVE_EVERY_MS",
  ]);
  BRIDGE_ENV_VARS = new Set([
    "CLAUDE_STAGE_FILE_ROOT",
    "CLAUDE_CODE_DIFF_COPY_ROOT",
    "CLAUDE_CODE_FOUND_REPOSITORY_GIT",
    "CLAUDE_CODE_ULTRAREVIEW_LAUNCH_RECORD",
  ]);
  CHROME_ENV_VARS = new Map([
    ["CLAUDE_CHROME_CLASSIFIER_FLOOR", "1"],
    ["CLAUDE_CHROME_PERMISSION_MODE", "ask"],
    ["CLAUDE_CODE_ENABLE_CFC", "0"],
  ]);
});
//@ chunk-71parphm.js:11213-11402 placement
function isSafeChromeEnvValue(key, value) {
  switch (key) {
    case "CLAUDE_CHROME_CLASSIFIER_FLOOR":
      return isEnvTruthy(value);
    case "CLAUDE_CHROME_PERMISSION_MODE":
      return value === "ask";
    case "CLAUDE_CODE_ENABLE_CFC":
      return isEnvDefinedFalsy(value);
    default:
      return false;
  }
}
//@ chunk-71parphm.js:11402-11436 placement
var CLAUDE_CODE_DISABLE_DIR = "CLAUDE_CODE_DISABLE_DIR_";
//@ chunk-71parphm.js:11436-11647 placement
function isRestrictedEnvKey(key, value) {
  let key_2 = key.toUpperCase();
  return (
    REMOTE_ENV_VARS.has(key_2) ||
    key_2.startsWith(CLAUDE_CODE_DISABLE_DIR) ||
    (key_2 === "DISABLE_COMPACT" && !isEnvTruthy(value)) ||
    CHROME_RELATED_ENV_VARS.has(key_2) ||
    HOSTED_ENV_VARS.has(key_2) ||
    BRIDGE_ENV_VARS.has(key_2) ||
    (CHROME_ENV_VARS.has(key_2) && isRemoteLikeEnv() && !isSafeChromeEnvValue(key_2, value)) ||
    false ||
    key_2 === "CLAUDE_CODE_REMOTE_TOOLS_FORWARD" ||
    false
  );
}
//@ chunk-71parphm.js:11647-11703 placement
/**
 * 判断某环境变量是否只能由宿主提供。
 */
function isHostOnlyEnvKey(key, value) {
  return HOST_ONLY_ENV_VARS.has(key.toUpperCase()) || isRestrictedEnvKey(key, value);
}
//@ chunk-71parphm.js:11703-11899 placement
var PROVIDER_CREDENTIAL_ENV_VARS; // deferred: uses ARTIFACT_PROVIDER_ENV_VARS (./managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-71parphm.js:11703", () => {
  PROVIDER_CREDENTIAL_ENV_VARS = new Set([
    "ANTHROPIC_UNIX_SOCKET",
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "CLAUDE_CODE_OAUTH_TOKEN",
    ...BASE_URL_ENV_VARS.filter(
      (varName) => varName.startsWith("CLAUDE_CODE_ARTIFACT") || isHelperEnvVar(varName),
    ),
  ]);
});
//@ chunk-71parphm.js:18280-19368 placement
/**
 * 从项目设置环境中去掉受限变量并按变量提示一次。
 */
function stripProjectBlockedEnv(env, source, warnedKeys, hostContext, onGitKeyDropped) {
  if (!env || !isDangerousEnvVar(source)) return env;
  let changed = true;
  let filteredEnv;
  for (let key of Object.keys(env)) {
    if (
      !isProjectScopeBlockedEnvVar(key) ||
      isDisablingTelemetryEnv(key, env[key], hostContext) ||
      (PRIVACY_ENV_VARS.has(key) && isEnvTruthy(env[key])) ||
      isServableEnvValue(key.toUpperCase(), env[key])
    )
      continue;
    filteredEnv ??= {
      ...env,
    };
    delete filteredEnv[key];
    if (warnedKeys?.has(key) === false) {
      warnedKeys.add(key);
      let settingsFileLabel =
        source === "localSettings" ? ".claude/settings.local.json" : ".claude/settings.json";
      let onlyAllowedValue = CHROME_ENV_VARS.get(key.toUpperCase());
      logForDebugging(
        onlyAllowedValue !== undefined
          ? `${key} in ${settingsFileLabel} is ignored: a project's settings can only set it to "${onlyAllowedValue}". Set any other value in ~/.claude/settings.json or managed settings; in a remote or Cowork session, only in the environment Claude Code is started with.`
          : isHostOnlyEnvKey(key, env[key])
            ? `${key} in ${settingsFileLabel} is ignored: no settings file can set this key, only the environment Claude Code is started with or Claude Code itself.`
            : key.toUpperCase() === "CLAUDE_CODE_MODEL_CATALOG"
              ? `${key} in ${settingsFileLabel} is ignored: a project's settings can only turn the model catalog off ("off"). Set any other value in ~/.claude/settings.json or managed settings.`
              : `${key} in ${settingsFileLabel} is ignored \u2014 project-scoped settings can't set this key. Set it in ~/.claude/settings.json or managed settings instead.`,
        {
          level: "warn",
        },
      );
    }
  }
  return filteredEnv ?? env;
}
//@ chunk-71parphm.js:19368-19453 placement
var ENV_ENTRY_PROBLEM_TEXT_ALL; // deferred: uses ENV_ENTRY_PROBLEM_TEXT (./envValidation.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-71parphm.js:19368", () => {
  ENV_ENTRY_PROBLEM_TEXT_ALL = {
    ...ENV_ENTRY_PROBLEM_TEXT,
    "non-string-value": "its value isn't a string, a number or a boolean",
  };
});
//@ chunk-71parphm.js:19453-19859 placement
/**
 * 去掉被忽略的环境项、把数字/布尔转字符串并记 warn。
 */
function dropIgnoredEnvEntries(env, source, invalidEnvKeyWarned) {
  if (!env) return env;
  let filteredEnv;
  for (let [key, value] of Object.entries(env)) {
    let rawValue = value;
    let normalizedValue =
      typeof rawValue === "string"
        ? rawValue
        : typeof rawValue === "number" || typeof rawValue === "boolean"
          ? String(rawValue)
          : undefined;
    let problem = envEntryProblem_2(key, normalizedValue);
    if (problem === undefined) {
      if (normalizedValue !== undefined && normalizedValue !== rawValue) {
        filteredEnv ??= {
          ...env,
        };
        filteredEnv[key] = normalizedValue;
      }
      continue;
    }
    filteredEnv ??= {
      ...env,
    };
    delete filteredEnv[key];
    let problemText = ENV_ENTRY_PROBLEM_TEXT_ALL[problem];
    let displayName = describeEnvEntryName(key);
    let warnKey = `${source}:${problemText}:${displayName}`;
    if (invalidEnvKeyWarned !== undefined && !invalidEnvKeyWarned.has(warnKey)) {
      invalidEnvKeyWarned.add(warnKey);
      logForDebugging(`Env key ${displayName} from ${source} is ignored: ${problemText}.`, {
        level: "warn",
      });
    }
  }
  return filteredEnv ?? env;
}
//@ chunk-71parphm.js:19859-19911 placement
var POLICY_FALSY_ALLOWED_ENV_VARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-71parphm.js:19859", () => {
  POLICY_FALSY_ALLOWED_ENV_VARS = new Set(["CLAUDE_CODE_TRANSCRIPT_LOCAL_GC"]);
});
//@ chunk-71parphm.js:19911-19990 placement (2.1.88 match: _temp7, 0.791)
function isPolicyFalsyAllowedEnv(key, value, source) {
  return (
    source === "policySettings" &&
    POLICY_FALSY_ALLOWED_ENV_VARS.has(key.toUpperCase()) &&
    isEnvDefinedFalsy(value)
  );
}
//@ chunk-71parphm.js:19990-20041 placement
var ATTRIBUTION_HEADER_ENV; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-71parphm.js:19990", () => {
  ATTRIBUTION_HEADER_ENV = new Set(["CLAUDE_CODE_ATTRIBUTION_HEADER"]);
});
//@ chunk-71parphm.js:20041-20157 placement (2.1.88 match: _temp7, 0.791)
function isGatewayBackedPolicyDisable(envName, value, source) {
  return (
    source === "policySettings" &&
    ATTRIBUTION_HEADER_ENV.has(envName.toUpperCase()) &&
    isEnvDefinedFalsy(value) &&
    isProviderManagedByHost() &&
    gatewayServesManagedSettings(getGatewayAuth()) &&
    isEnvDefinedFalsy(getRemoteManagedSettingsSyncFromCache()?.env?.[envName])
  );
}
//@ chunk-71parphm.js:20157-20682 placement
/**
 * 主机托管提供方时忽略设置中的变量（只提示一次）。
 */
function warnHostManagedEnvIgnored(warned, envName, source, desktopHost = false) {
  if (warned === undefined || warned.has(envName)) return;
  warned.add(envName);
  let displayName = escapeForDisplay(envName);
  logForDebugging(
    desktopHost
      ? `Ignoring ${displayName} from ${source} \u2014 repo-committed settings can't re-point the TLS/proxy channel of a session whose credential comes from the host. Set it in ~/.claude/settings.json or managed settings instead.`
      : `Ignoring ${displayName} from ${source} \u2014 this session's provider routing is managed by the host (CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST or a host-auth-callback marker), so settings-sourced provider/auth configuration does not apply.`,
    {
      level: "warn",
    },
  );
}
//@ chunk-71parphm.js:20682-21557 placement
/**
 * 按主机托管、Cowork 云、混合连接等条件过滤设置环境变量。
 */
function filterHostManagedEnv(env, source, facts, warned) {
  if (!env) return {};
  let hostManaged = facts.managedByHost || (facts.desktopHost && PROJECT_LEVEL_SETTING_SOURCES.has(source));
  let kept = {};
  for (let [key, value] of Object.entries(env)) {
    if (HOST_ONLY_ENV_VARS.has(key.toUpperCase()) && !isPolicyFalsyAllowedEnv(key, value, source)) continue;
    if (facts.coworkCloud && isNetworkEnvVar(key)) {
      warnHostManagedEnvIgnored(warned, key, source);
      continue;
    }
    if (
      facts.hybridConnection &&
      isDangerousEnvVar(source) &&
      isProviderManagedEnvVar(key) &&
      !isAwsProfileEnvVar(key)
    ) {
      if (warned !== undefined && !warned.has(key)) {
        warned.add(key);
        logForDebugging(
          `Not setting ${escapeForDisplay(key)} from ${source} in this pass \u2014 beside your organization's connection, a repository's settings don't set provider-managed variables.`,
          {
            level: "warn",
          },
        );
      }
      continue;
    }
    if (!hostManaged) {
      kept[key] = value;
      continue;
    }
    if (facts.desktopHost && source === "policySettings" && key.toUpperCase() === "CLAUDE_CODE_CERT_STORE") {
      kept[key] = value;
      continue;
    }
    if (isProviderManagedEnvVar(key) && (facts.managedByHost || !isAwsProfileEnvVar(key))) {
      if (facts.managedByHost) warnHostManagedEnvIgnored(warned, key, source);
      continue;
    }
    if (facts.managedByHost && key.toUpperCase() === "ANTHROPIC_CUSTOM_HEADERS") {
      warnHostManagedEnvIgnored(warned, key, source);
      continue;
    }
    if (
      facts.managedByHostFlag &&
      (!facts.desktopHost || isDangerousEnvVar(source)) &&
      (isProxyEnvVar(key) || isTlsOrCertEnvVar(key))
    ) {
      warnHostManagedEnvIgnored(warned, key, source, facts.desktopHost);
      continue;
    }
    kept[key] = value;
  }
  return kept;
}
//@ chunk-71parphm.js:21992-22342 placement
/**
 * 宿主已提供的变量从设置中忽略的提示。
 */
function warnHostSuppliedEnv(envNames, source, warned) {
  let filtered = envNames.filter((envName) => {
    let warnKey = `${source}:${envName}`;
    if (warned.has(warnKey)) return false;
    warned.add(warnKey);
    return true;
  });
  if (filtered.length === 0) return;
  let joined = filtered.map(escapeForDisplay).join(", ");
  logForDebugging(
    `Ignoring ${joined} from ${source}: the desktop app or runner that started this session supplies ${filtered.length === 1 ? "it" : "them"}, so the settings ${filtered.length === 1 ? "value is" : "values are"} not used.`,
    {
      level: "warn",
    },
  );
}
//@ chunk-71parphm.js:22342-22439 placement
/**
 * 需要清理的子进程环境变量，以及 OTEL 环境变量集合。
 */
var SUBPROCESS_SCRUB_ENV_VARS; // deferred: uses OTEL_ENV_VARS (./managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
var OTEL_ENV_VAR_SET;
deferInit("chunk-71parphm.js:22342", () => {
  SUBPROCESS_SCRUB_ENV_VARS = new Set(["CLAUDE_CODE_SUBPROCESS_ENV_SCRUB", "CLAUDE_CODE_PERFORCE_MODE"]);
  OTEL_ENV_VAR_SET = new Set(OTEL_ENV_VARS);
});
//@ chunk-71parphm.js:22439-22554 placement
function isServeBlockedEnv(envName, value) {
  let upper = envName.toUpperCase();
  return (
    isHttpMcpServeInvocation() &&
    !(
      isProtectedEnvVar(envName, value) &&
      !isProviderManagedEnvVar(envName) &&
      !isChildScrubbedCredentialFamily(upper) &&
      !OTEL_ENV_VAR_SET.has(upper)
    ) &&
    !(SUBPROCESS_SCRUB_ENV_VARS.has(upper) && isEnvTruthy(value))
  );
}
//@ chunk-71parphm.js:22554-22609 placement
/**
 * 判断是否为颜色控制环境变量（NO_COLOR/FORCE_COLOR）。
 */
function isColorEnvVar(envName) {
  return envName === "NO_COLOR" || envName === "FORCE_COLOR";
}
//@ chunk-71parphm.js:22609-22873 placement
function applyDirectEnvKeys(env, targetEnv, settingsEnvForChildrenFromRepository, fromRepository) {
  if (!env) return {};
  let applied = {};
  for (let [key, value] of Object.entries(env)) {
    let envName = key.toUpperCase();
    if (isColorEnvVar(envName) || isServeBlockedEnv(key, value)) {
      let existingKey = spellingIn(targetEnv, key);
      if (fromRepository === true) {
        if (settingsEnvForChildrenFromRepository?.has(existingKey) === false)
          settingsEnvForChildrenFromRepository.set(existingKey, targetEnv[existingKey]);
      } else settingsEnvForChildrenFromRepository?.delete(existingKey);
      targetEnv[existingKey] = value;
      continue;
    }
    let existingKey = spellingIn(targetEnv, key);
    delete targetEnv[existingKey];
    settingsEnvForChildrenFromRepository?.delete(existingKey);
    applied[key] = value;
  }
  return applied;
}
//@ chunk-71parphm.js:22873-22936 placement
/**
 * 判断是否被策略显式关掉了模型目录环境开关。
 */
function isCatalogDisabledByPolicy(envName, value) {
  return envName === "CLAUDE_CODE_MODEL_CATALOG" && isEnvDefinedFalsy(value);
}
export {
  PROVIDER_CREDENTIAL_ENV_VARS,
  noPersonalScopeBlock,
  isHostOnlyEnvKey,
  isSafeChromeEnvValue,
  isCatalogDisabledByPolicy,
  CHROME_ENV_VARS,
  isRestrictedEnvKey,
  filterHostManagedEnv,
  stripProjectBlockedEnv,
  dropIgnoredEnvEntries,
  applyDirectEnvKeys,
  isColorEnvVar,
  HOST_ONLY_ENV_VARS,
  OTEL_ENV_VAR_SET,
  isServeBlockedEnv,
  noopEnvHook,
  isGatewayBackedPolicyDisable,
  warnHostSuppliedEnv,
  isRemoteLikeEnv,
};
