/**
 * utils/managedEnvSafety.ts
 *
 * 2.1.316 新增：托管环境变量安全检查（PROJECT_SCOPE_BLOCKED_ENV_VARS）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q4qb1h08.js (26)
 * attribution: placement 26
 */
import { o, u, U, M, A } from "../../vendor/zod/v4/classic/schemas.js";
import { Lt } from "./model/modelIds.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { EFFORT_LEVELS } from "./effort.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "./envUtils.js";
import { env } from "./env.js";
import {
  HOST_MANAGED_MARKER_ENV_VARS,
  che,
  qG,
  isHelperEnvVar,
  isDangerousEnvVar,
  isDisablingTelemetryEnv,
  Kps,
  zps,
  isProviderManagedEnvVar,
  Gps,
  isProxyEnvVar,
  isTlsOrCertEnvVar,
  OTEL_ENV_VARS,
  isProtectedEnvVar,
} from "./managedEnvConstants.js";
import { HOST_SKILL_CATALOG_ENV, isProviderManagedByHost } from "./entrypointKinds.js";
import { isProjectScopeBlockedEnvVar, ae, PROJECT_LEVEL_SETTING_SOURCES } from "./managedEnvApply.js";
import { logForDebugging } from "./debug.js";
import {
  ENV_ENTRY_PROBLEM_TEXT,
  envEntryProblem,
  describeEnvEntryName,
  escapeForDisplay,
} from "./envValidation.js";
import { gatewayServesManagedSettings, getGatewayAuth } from "../bootstrap/state.js";
import { getRemoteManagedSettingsSyncFromCache } from "../services/remoteManagedSettings/remoteSettingsCache.js";
import { isHttpMcpServeInvocation } from "../entrypoints/mcpServeArgs.js";
import { isChildScrubbedCredentialFamily, spellingIn } from "./subprocessEnv.js";

/**
 * 模型组合（lead/worker）配置 schema。
 */
//@ chunk-q4qb1h08.js:2261-2626 placement
var ModelIdSchema = () =>
    o()
      .trim()
      .min(1)
      .max(100)
      .refine((e) => Lt(e) === e),
  ModelMixSchema = DoctorLazy(() =>
    u({
      lead: ModelIdSchema(),
      worker: ModelIdSchema(),
      effort: U(EFFORT_LEVELS).optional(),
      coordinator: M().default(!0),
      label: o().trim().min(1).max(60).default("Mix"),
      prompt: o().trim().min(1).max(4000).optional(),
      whenToUse: o().trim().max(4000).optional(),
      removePromptStrings: A(
        o()
          .max(2000)
          .refine((e) => e.trim() !== ""),
      )
        .max(20)
        .optional(),
    }),
  );
//@ chunk-q4qb1h08.js:2626-2648 placement
function eur() {
  return;
}
//@ chunk-q4qb1h08.js:2648-2662 placement
function V() {}
//@ chunk-q4qb1h08.js:2662-2716 placement
var le = ["CLAUDE_CODE_REMOTE", "CLAUDE_CODE_IS_COWORK"];
//@ chunk-q4qb1h08.js:2716-2769 placement
function g5e(e) {
  return le.some((n) => (e ? isEnvTruthy(e[n]) : env[n]));
}
//@ chunk-q4qb1h08.js:2769-10497 placement
var MANAGED_ENV_SAFETY_LISTS = [],
  h = new Set([
    ...HOST_MANAGED_MARKER_ENV_VARS,
    "CLAUDE_CODE_HOST_GATEWAY_LINEAGE",
    "CLAUDE_CODE_HOST_CREDS_FILE",
    "CLAUDE_CODE_HOST_AUTH_ENV_VAR",
    "CLAUDE_BG_AUTH_SNAPSHOT_PATH",
    "CLAUDE_BG_SOCKET_TOKENS_PATH",
    ...che,
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
  ]),
  Re = new Set([
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
    "CLAUDE_CODE_FLAG_FETCH_WAIT_MS",
    "CLAUDE_CODE_GB_DISK_CACHE_WHEN_TELEMETRY_OFF",
    "CLAUDE_CODE_HOME_SEED_HOLD_TIMEOUT_MS",
    "CLAUDE_CODE_HOME_SEED_VERDICT_TIMEOUT_MS",
    "CLAUDE_CODE_TRANSCRIPT_SLIM_TOOL_RESULTS",
    "CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS",
    "CLAUDE_CODE_JIT_POLICY_AFTER_STARTUP",
    "CLAUDE_CODE_PLAIN_DELTA_FAST_PATH",
    "CLAUDE_CODE_UNWATCHED_REPLY_HOLD_MS",
    "CLAUDE_CODE_STREAM_EVENT_HOLD_MS",
    "CLAUDE_CODE_STREAM_EVENT_MAX_LINE_BYTES",
    "CLAUDE_CODE_DISABLE_HOOK_FORWARDING",
    "CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING",
    "CLAUDE_CODE_DISABLE_TURN_HANDOFF",
    "CLAUDE_CODE_DISABLE_HELD_MESSAGE_RECOGNITION",
    "CLAUDE_CODE_LAZY_ENV_GETTERS",
    "CLAUDE_CODE_RESTRICTED",
    "CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG",
    "CLAUDE_CODE_PERSONAL_CONFIG_FIX",
  ]),
  ce = new Set(["CLAUDE_REMOTE_WORKFLOW_SCRIPT", "CLAUDE_REMOTE_WORKFLOW_ARGS", "CLAUDE_WORKFLOW_NAME_ONLY"]),
  Le = new Set([
    "CLAUDE_CODE_ENTRYPOINT",
    "CLAUDE_CODE_ENTRYPOINT_ON_REQUESTS",
    "CLAUDE_CODE_HOST_SESSION_ID",
    "CLAUDE_CODE_HOST_WORKTREE",
    "CLAUDE_CODE_HOST_WORKTREE_FENCE",
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
  ]),
  Te = new Set(["CLAUDE_STAGE_FILE_ROOT", "CLAUDE_CODE_DIFF_COPY_ROOT", "CLAUDE_CODE_FOUND_REPOSITORY_GIT"]),
  v = new Map([
    ["CLAUDE_CHROME_CLASSIFIER_FLOOR", "1"],
    ["CLAUDE_CHROME_PERMISSION_MODE", "ask"],
    ["CLAUDE_CODE_ENABLE_CFC", "0"],
  ]);
//@ chunk-q4qb1h08.js:10497-10686 placement
function isSafeChromeEnvValue(e, n) {
  switch (e) {
    case "CLAUDE_CHROME_CLASSIFIER_FLOOR":
      return isEnvTruthy(n);
    case "CLAUDE_CHROME_PERMISSION_MODE":
      return n === "ask";
    case "CLAUDE_CODE_ENABLE_CFC":
      return isEnvDefinedFalsy(n);
    default:
      return !1;
  }
}
//@ chunk-q4qb1h08.js:10686-10720 placement
var CLAUDE_CODE_DISABLE_DIR = "CLAUDE_CODE_DISABLE_DIR_";
//@ chunk-q4qb1h08.js:10720-10927 placement
function isRestrictedEnvKey(e, n) {
  let upper = e.toUpperCase();
  return (
    Re.has(upper) ||
    upper.startsWith(CLAUDE_CODE_DISABLE_DIR) ||
    (upper === "DISABLE_COMPACT" && !isEnvTruthy(n)) ||
    ce.has(upper) ||
    Le.has(upper) ||
    Te.has(upper) ||
    (v.has(upper) && g5e() && !isSafeChromeEnvValue(upper, n)) ||
    !1 ||
    upper === "CLAUDE_CODE_REMOTE_TOOLS_FORWARD"
  );
}
//@ chunk-q4qb1h08.js:10927-10983 placement
function OTn(e, n) {
  return h.has(e.toUpperCase()) || isRestrictedEnvKey(e, n);
}
//@ chunk-q4qb1h08.js:10983-11179 placement
var PROVIDER_CREDENTIAL_ENV_VARS = new Set([
  "ANTHROPIC_UNIX_SOCKET",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "CLAUDE_CODE_OAUTH_TOKEN",
  ...qG.filter((e) => e.startsWith("CLAUDE_CODE_ARTIFACT") || isHelperEnvVar(e)),
]);
/**
 * 从项目设置环境中去掉受限变量并按变量提示一次。
 */
//@ chunk-q4qb1h08.js:17210-18297 placement
function stripProjectBlockedEnv(e, n, r, E, s) {
  if (!e || !isDangerousEnvVar(n)) return e;
  let C = !0,
    _;
  for (let a of Object.keys(e)) {
    if (
      !isProjectScopeBlockedEnvVar(a) ||
      isDisablingTelemetryEnv(a, e[a], E) ||
      (Kps.has(a) && isEnvTruthy(e[a])) ||
      ae(a.toUpperCase(), e[a])
    )
      continue;
    if (((_ ??= { ...e }), delete _[a], r?.has(a) === !1)) {
      r.add(a);
      let O = n === "localSettings" ? ".claude/settings.local.json" : ".claude/settings.json",
        D = v.get(a.toUpperCase());
      logForDebugging(
        D !== void 0
          ? `${a} in ${O} is ignored: a project's settings can only set it to "${D}". Set any other value in ~/.claude/settings.json or managed settings; in a remote or Cowork session, only in the environment Claude Code is started with.`
          : OTn(a, e[a])
            ? `${a} in ${O} is ignored: no settings file can set this key, only the environment Claude Code is started with or Claude Code itself.`
            : a.toUpperCase() === "CLAUDE_CODE_MODEL_CATALOG"
              ? `${a} in ${O} is ignored: a project's settings can only turn the model catalog off ("off"). Set any other value in ~/.claude/settings.json or managed settings.`
              : `${a} in ${O} is ignored \u2014 project-scoped settings can't set this key. Set it in ~/.claude/settings.json or managed settings instead.`,
        { level: "warn" },
      );
    }
  }
  return _ ?? e;
}
//@ chunk-q4qb1h08.js:18297-18382 placement
var he = { ...ENV_ENTRY_PROBLEM_TEXT, "non-string-value": "its value isn't a string, a number or a boolean" };
/**
 * 去掉被忽略的环境项、把数字/布尔转字符串并记 warn。
 */
//@ chunk-q4qb1h08.js:18382-18788 placement
function dropIgnoredEnvEntries(e, n, r) {
  if (!e) return e;
  let E;
  for (let [s, C] of Object.entries(e)) {
    let _ = C,
      a = typeof _ === "string" ? _ : typeof _ === "number" || typeof _ === "boolean" ? String(_) : void 0,
      O = envEntryProblem(s, a);
    if (O === void 0) {
      if (a !== void 0 && a !== _) ((E ??= { ...e }), (E[s] = a));
      continue;
    }
    ((E ??= { ...e }), delete E[s]);
    let D = he[O],
      S = describeEnvEntryName(s),
      R = `${n}:${D}:${S}`;
    if (r !== void 0 && !r.has(R))
      (r.add(R), logForDebugging(`Env key ${S} from ${n} is ignored: ${D}.`, { level: "warn" }));
  }
  return E ?? e;
}
//@ chunk-q4qb1h08.js:18788-18840 placement
var ve = new Set(["CLAUDE_CODE_TRANSCRIPT_LOCAL_GC"]);
//@ chunk-q4qb1h08.js:18840-18919 placement = _temp7 (0.791)
function Pe(e, n, r) {
  return r === "policySettings" && ve.has(e.toUpperCase()) && isEnvDefinedFalsy(n);
}
//@ chunk-q4qb1h08.js:18919-18970 placement
var me = new Set(["CLAUDE_CODE_ATTRIBUTION_HEADER"]);
//@ chunk-q4qb1h08.js:18970-19086 placement = _temp7 (0.791)
function isGatewayBackedPolicyDisable(e, n, r) {
  return (
    r === "policySettings" &&
    me.has(e.toUpperCase()) &&
    isEnvDefinedFalsy(n) &&
    isProviderManagedByHost() &&
    gatewayServesManagedSettings(getGatewayAuth()) &&
    isEnvDefinedFalsy(getRemoteManagedSettingsSyncFromCache()?.env?.[e])
  );
}
/**
 * 主机托管提供方时忽略设置中的变量（只提示一次）。
 */
//@ chunk-q4qb1h08.js:19086-19611 placement
function warnHostManagedEnvIgnored(e, n, r, E = !1) {
  if (e === void 0 || e.has(n)) return;
  e.add(n);
  let s = escapeForDisplay(n);
  logForDebugging(
    E
      ? `Ignoring ${s} from ${r} \u2014 repo-committed settings can't re-point the TLS/proxy channel of a session whose credential comes from the host. Set it in ~/.claude/settings.json or managed settings instead.`
      : `Ignoring ${s} from ${r} \u2014 this session's provider routing is managed by the host (CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST or a host-auth-callback marker), so settings-sourced provider/auth configuration does not apply.`,
    { level: "warn" },
  );
}
/**
 * 按主机托管、Cowork 云、混合连接等条件过滤设置环境变量。
 */
//@ chunk-q4qb1h08.js:19611-20486 placement
function filterHostManagedEnv(e, n, r, E) {
  if (!e) return {};
  let s = r.managedByHost || (r.desktopHost && PROJECT_LEVEL_SETTING_SOURCES.has(n)),
    C = {};
  for (let [_, a] of Object.entries(e)) {
    if (h.has(_.toUpperCase()) && !Pe(_, a, n)) continue;
    if (r.coworkCloud && zps(_)) {
      warnHostManagedEnvIgnored(E, _, n);
      continue;
    }
    if (r.hybridConnection && isDangerousEnvVar(n) && isProviderManagedEnvVar(_) && !Gps(_)) {
      if (E !== void 0 && !E.has(_))
        (E.add(_),
          logForDebugging(
            `Not setting ${escapeForDisplay(_)} from ${n} in this pass \u2014 beside your organization's connection, a repository's settings don't set provider-managed variables.`,
            { level: "warn" },
          ));
      continue;
    }
    if (!s) {
      C[_] = a;
      continue;
    }
    if (r.desktopHost && n === "policySettings" && _.toUpperCase() === "CLAUDE_CODE_CERT_STORE") {
      C[_] = a;
      continue;
    }
    if (isProviderManagedEnvVar(_) && (r.managedByHost || !Gps(_))) {
      if (r.managedByHost) warnHostManagedEnvIgnored(E, _, n);
      continue;
    }
    if (r.managedByHost && _.toUpperCase() === "ANTHROPIC_CUSTOM_HEADERS") {
      warnHostManagedEnvIgnored(E, _, n);
      continue;
    }
    if (
      r.managedByHostFlag &&
      (!r.desktopHost || isDangerousEnvVar(n)) &&
      (isProxyEnvVar(_) || isTlsOrCertEnvVar(_))
    ) {
      warnHostManagedEnvIgnored(E, _, n, r.desktopHost);
      continue;
    }
    C[_] = a;
  }
  return C;
}
/**
 * 宿主已提供的变量从设置中忽略的提示。
 */
//@ chunk-q4qb1h08.js:20921-21271 placement
function warnHostSuppliedEnv(e, n, r) {
  let filtered = e.filter((C) => {
    let _ = `${n}:${C}`;
    if (r.has(_)) return !1;
    return (r.add(_), !0);
  });
  if (filtered.length === 0) return;
  let joined = filtered.map(escapeForDisplay).join(", ");
  logForDebugging(
    `Ignoring ${joined} from ${n}: the desktop app or runner that started this session supplies ${filtered.length === 1 ? "it" : "them"}, so the settings ${filtered.length === 1 ? "value is" : "values are"} not used.`,
    { level: "warn" },
  );
}
//@ chunk-q4qb1h08.js:21271-21368 placement
var Fe = new Set(["CLAUDE_CODE_SUBPROCESS_ENV_SCRUB", "CLAUDE_CODE_PERFORCE_MODE"]),
  _e = new Set(OTEL_ENV_VARS);
//@ chunk-q4qb1h08.js:21368-21483 placement
function isServeBlockedEnv(e, n) {
  let upper = e.toUpperCase();
  return (
    isHttpMcpServeInvocation() &&
    !(
      isProtectedEnvVar(e, n) &&
      !isProviderManagedEnvVar(e) &&
      !isChildScrubbedCredentialFamily(upper) &&
      !_e.has(upper)
    ) &&
    !(Fe.has(upper) && isEnvTruthy(n))
  );
}
//@ chunk-q4qb1h08.js:21483-21538 placement
function j(e) {
  return e === "NO_COLOR" || e === "FORCE_COLOR";
}
//@ chunk-q4qb1h08.js:21538-21802 placement
function applyDirectEnvKeys(e, n, r, E) {
  if (!e) return {};
  let s = {};
  for (let [C, _] of Object.entries(e)) {
    let upper = C.toUpperCase();
    if (j(upper) || isServeBlockedEnv(C, _)) {
      let D = spellingIn(n, C);
      if (E === !0) {
        if (r?.has(D) === !1) r.set(D, n[D]);
      } else r?.delete(D);
      n[D] = _;
      continue;
    }
    let O = spellingIn(n, C);
    (delete n[O], r?.delete(O), (s[C] = _));
  }
  return s;
}
//@ chunk-q4qb1h08.js:21802-21865 placement
function Ge(e, n) {
  return e === "CLAUDE_CODE_MODEL_CATALOG" && isEnvDefinedFalsy(n);
}

export {
  PROVIDER_CREDENTIAL_ENV_VARS,
  g5e,
  isGatewayBackedPolicyDisable,
  warnHostSuppliedEnv,
  eur,
  OTn,
  isSafeChromeEnvValue,
  Ge,
  v,
  isRestrictedEnvKey,
  filterHostManagedEnv,
  stripProjectBlockedEnv,
  dropIgnoredEnvEntries,
  applyDirectEnvKeys,
  j,
  h,
  _e,
  isServeBlockedEnv,
  V,
};
