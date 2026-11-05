/**
 * utils/managedEnvApply.ts
 *
 * 2.1.316 新增：托管环境变量应用
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-71parphm.js (49)
 * attribution: placement 49
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isEnvTruthy } from "./envUtils.js";
import { isHostEntrypoint } from "./entrypointKinds.js";
import { hasManagedSettings } from "./settings/managedRestrictionKeys.js";
import {
  isStoredLoginPinned,
  isAttachServeRepoScopedSourceOrNonInteractive,
  isAttachServeRepoScopedSource,
  exitIfServeHelperMisconfigured,
} from "../cli/headlessCloud/attachServe.js";
import { PROCESS_WRAPPER_ENV } from "./processWrapper.js";
import {
  BG_DISPATCHER_IDENTITY_ENV_VARS,
  setSettingsEnvForChildren,
  holdsDaemonForceColor,
} from "./subprocessEnv.js";
import {
  OAUTH_ENV_VARS,
  OTEL_ENV_VARS,
  OTEL_EXPORTER_OTLP,
  isNetworkEnvVar,
  isDangerousEnvVar,
  OTEL_EXPORTER_PREFIXES,
  OTEL_DETAIL_VARS,
  isProtectedEnvVar,
} from "./managedEnvConstants.js";
import {
  CLAUDE_CODE_EXPERIMENTAL_CODE_MODE,
  CODE_MODE_RESTART_ENV,
  CODE_MODE_RESTARTED_FROM_ENV,
} from "../constants/codeMode.js";
import {
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
} from "./managedEnvSafety.js";
import { isPersonalConfigRestricted, setPersonalConfigRestriction } from "./personalConfigRestriction.js";
import { import_reject } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { setHelperOutputOverride } from "./settings/policyHelper/helperRemote.js";
import {
  withEnvTake,
  setManagedOverrideProvider,
  forgetHostEnvWrites,
  snapshotHostOwnedEnv,
} from "./settings/hostEnvWrites.js";
import {
  getSettingsForSource,
  getMachineAdminPolicyEnv,
  isSettingsTierWithheld,
  getSettingsFilePathForSource,
} from "./settings/settings.js";
import { setEnvEntryProblemCheck, escapeForDisplay, describeEnvEntryName } from "./envValidation.js";
import {
  setRemoteSettingsProbes,
  computeRemoteSettingsEligibility,
} from "../services/cloudSessions/eligibility.js";
import {
  setClaimContext,
  claimedCredential_2,
  credentialRoad,
} from "../entrypoints/warmSpare/claimCredentials.js";
import { getPlatform } from "./platform.js";
import { env } from "./env.js";
import { getGlobalConfig, PERSISTED_TRUST_IGNORED } from "./config.js";
import { applySafeConfigEnvironmentVariables_2 } from "./managedEnv.js";
import { hasDangerousEnvVars } from "../components/TrustDialog/utils.js";
import { getEnabledSettingSources, isSettingSourceEnabled } from "./settings/constants.js";
import { logForDebugging } from "./debug.js";
import { isEnvSettingOn } from "./settings/marketplaceSettingsAliases.js";
import { isHttpMcpServeInvocation } from "../entrypoints/mcpServeArgs.js";
import { invalidateCommandNames } from "./settings/commandSyncNames.js";
import {
  proxyEnvFingerprint,
  hasConfiguredGlobalAgents,
  clearProxyCache,
  configureGlobalAgents,
} from "./proxy.js";
import { hasPossibleCredentialFromDescriptor } from "./authFileDescriptor.js";
import { clearCACertsCache, loadExtraCACerts } from "./caCerts.js";
import { getLoadedMTLSPaths, clearMTLSCache, loadMTLSClientMaterial } from "./mtls.js";
import { logError } from "./log.js";
import { retainCacheKey } from "./memoize.js";
import { emitCredentialChange } from "./auth/credentialEpoch.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-71parphm.js:12054-12206 placement
var HOST_MANAGED_STRIP_CONTEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-71parphm.js:12054", () => {
  HOST_MANAGED_STRIP_CONTEXT = Object.freeze({
    coworkCloud: false,
    managedByHost: false,
    managedByHostFlag: false,
    desktopHost: false,
    hostOrchestrated: false,
    storedLoginPinned: false,
    hybridConnection: false,
  });
});
//@ chunk-71parphm.js:12206-12524 placement
/**
 * 汇总当前环境的托管情况：云端协作托管设置、是否由宿主管理提供方（标记或认证变量）、桌面宿主、宿主编排（含 byoc）、固定存储登录、混合连接。
 */
function hostManagementFacts() {
  let managedByHostFlag = isEnvTruthy(process.env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST);
  let isHostEntry = isHostEntrypoint();
  let envClaudeCodeEnvironmentKind = process.env.CLAUDE_CODE_ENVIRONMENT_KIND;
  return {
    coworkCloud: hasManagedSettings(),
    managedByHost: managedByHostFlag || !!process.env.CLAUDE_CODE_HOST_AUTH_ENV_VAR,
    managedByHostFlag,
    desktopHost: isHostEntry,
    hostOrchestrated: isHostEntry || envClaudeCodeEnvironmentKind === "byoc",
    storedLoginPinned: isStoredLoginPinned(),
    hybridConnection: isHybridConnectionAllowed(),
  };
}
//@ chunk-71parphm.js:12524-12547 placement
function isHybridConnectionAllowed() {
  return false;
}
//@ chunk-71parphm.js:12547-18193 placement
/**
 * 项目级设置不能设置的环境变量清单（宿主/会话控制、配置目录、临时目录、遥测与调试输出等），以及按前缀屏蔽的列表。
 */
var PROJECT_LEVEL_SETTING_SOURCES; // deferred: uses BG_DISPATCHER_IDENTITY_ENV_VARS (./subprocessEnv.js) of its import cycle while loading; runs once the cycle is complete
var EXTRA_BLOCKED_ENV_VARS;
var EXTRA_BLOCKED_ENV_PREFIXES;
var BLOCKED_PREFIX_GROUPS;
var PROJECT_SCOPE_BLOCKED_ENV_VARS;
var PROJECT_SCOPE_BLOCKED_PREFIXES;
deferInit("chunk-71parphm.js:12547", () => {
  PROJECT_LEVEL_SETTING_SOURCES = new Set(["policySettings", "projectSettings", "localSettings"]);
  EXTRA_BLOCKED_ENV_VARS = [];
  EXTRA_BLOCKED_ENV_PREFIXES = [];
  BLOCKED_PREFIX_GROUPS = [];
  PROJECT_SCOPE_BLOCKED_ENV_VARS = new Set([
    PROCESS_WRAPPER_ENV,
    "CLAUDE_CODE_CUSTOM_OAUTH_URL",
    "CLAUDE_CODE_DISABLE_SUBAGENT_HANDBACK",
    "CLAUDE_CODE_SYNC_SKILLS",
    "CLAUDE_CODE_SYNC_PLUGINS",
    "CLAUDE_CODE_TRANSCRIPT_LOCAL_GC",
    "CLAUDE_CODE_CCR_SURFACE",
    "CLAUDE_CODE_INCREMENTAL_REQUEST_BODY",
    "CLAUDE_CODE_GZIP_REQUEST_BODY_BLOCKS",
    "CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS",
    "CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES",
    "CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS_EXCEPT",
    "CLAUDE_CODE_RELAUNCH_PROACTIVITY_BASELINE",
    "CLAUDE_CODE_RELAUNCH_PROACTIVITY_DECIDED",
    "CLAUDE_CODE_RELAUNCH_PROACTIVITY_EVER_ON",
    "CLAUDE_CODE_RELAUNCH_PROACTIVITY_LEVEL",
    "CLAUDE_CODE_DISABLE_PROACTIVITY",
    "CLAUDE_CODE_DISABLE_ATTACHMENTS",
    "CLAUDE_CODE_TETHER_LIVE",
    "CLAUDE_CODE_PROGRAM_USE_CASE_ID",
    "CLAUDE_CODE_PROGRAM_USE_CASE_STAMPED",
    "CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT",
    "CLAUDE_CODE_BRIDGE_CHILD_ARTIFACT",
    "CLAUDE_CODE_BRIDGE_CHILD_MACHINE_SETTINGS",
    "CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT",
    "CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT",
    "CLAUDE_CODE_MCP_APPS_HOST",
    "CLAUDE_CODE_COORDINATOR_MODE",
    "CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS",
    "CLAUDE_CODE_UPFRONT_TOOLS",
    "CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD",
    "CLAUDE_CODE_REMOTE_TOOLS_PIN_STORED_LOGIN",
    "CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED",
    "CLAUDE_CODE_REMOTE_TOOLS_HOST_IDLE_RELEASE_MINUTES",
    "CLAUDE_CODE_3P_PROBE_WROTE_SONNET_DEFAULT",
    "CLAUDE_CODE_3P_PROBE_WROTE_OPUS_DEFAULT",
    "CLAUDE_CODE_3P_PROBE_WROTE_HAIKU_DEFAULT",
    "CLAUDE_CODE_3P_SEEDED_SONNET_DEFAULT",
    "CLAUDE_CODE_3P_SEEDED_OPUS_DEFAULT",
    "CLAUDE_CODE_SANDBOXED",
    "CLAUDE_CODE_ATTRIBUTION_STATUS_TIMEOUT_MS",
    "CLAUDE_CODE_TOOL_USE_ID",
    "CLAUDE_CODE_DISABLE_ATTRIBUTION_CROSS_REPO",
    "CLAUDE_CODE_DISABLE_WEB_FETCH",
    "CLAUDE_CODE_DISABLE_RESPONSE_COMPARISON",
    "CLAUDE_CODE_DISABLE_MCP_TASKS",
    "CLAUDE_CODE_DISABLE_AGENT_PROGRESS_SUMMARIES",
    "CLAUDE_CODE_DISABLE_ULTRATHINK",
    "CLAUDE_CODE_DISABLE_FILE_MENTIONS",
    "CCR_SESSION_PROFILE",
    "CLAUDE_CODE_MCP_STARTUP_WAIT_MS",
    "CLAUDE_CODE_MCP_CONNECTOR_PREWAIT_MS",
    "CLAUDE_CODE_MCP_PREWAIT_SERVERS",
    "CLAUDE_CODE_MCP_PREWAIT_SERVERS_MS",
    "CLAUDE_CODE_SORTED_OTTER",
    "CLAUDE_CODE_SKILL_PROPOSALS",
    "CLAUDE_CODE_PLUGIN_CACHE_DIR",
    "CLAUDE_CODE_PLUGIN_SEED_DIR",
    "CLAUDE_CODE_PLUGIN_DIRS",
    "CLAUDE_CODE_PLUGIN_DIR_WATCH",
    "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS",
    "CLAUDE_CODE_PLUGIN_ATTRIBUTION",
    "CLAUDE_CODE_SKILL_ATTRIBUTION",
    "CLAUDE_CODE_MODEL_CATALOG_URL",
    "CLAUDE_CODE_MODEL_CATALOG",
    "CLAUDE_CODE_CLIENT_DATA_URL",
    "CLAUDE_CODE_ALLOW_OTHER_MODELS",
    "CLAUDE_CODE_REMOVE_PROMPT_STRINGS",
    ...BG_DISPATCHER_IDENTITY_ENV_VARS,
    "CLAUDE_CODE_SUBSCRIPTION_TYPE",
    "CLAUDE_CODE_RATE_LIMIT_TIER",
    ...OAUTH_ENV_VARS,
    "CLAUDE_CODE_SANDBOX_LEAVE_DENIES_TO_SRT_WIN",
    "CLAUDE_CODE_SANDBOX_LEAVE_PARENT_FOLDERS_ALONE",
    "CLAUDE_CODE_NANKEEN_KESTREL",
    "CLAUDE_CODE_DISABLE_DANGEROUS_RM_TIMEOUT",
    "CLAUDE_CODE_DISABLE_SUBSTITUTION_RM_PROMPT",
    "CLAUDE_CODE_DISABLE_INLINE_SHELL_RM_PROMPT",
    "CLAUDE_CODE_STRICT_INLINE_SHELL_RM_PROMPT",
    "CLAUDE_CODE_IGNORE_PERSISTED_TRUST",
    "CLAUDE_CODE_DISABLE_MOUNTED_DRIVE_RM_PROMPT",
    "CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS",
    "CLAUDE_CODE_DISABLE_POWERSHELL_CMD_RM_DENY",
    "CLAUDE_CODE_DISABLE_ULTRAREVIEW_TRUST_CHECK",
    "CLAUDE_CODE_FEDERATION_CACHE_DIR",
    "ANTHROPIC_CONFIG_DIR",
    "XDG_CONFIG_HOME",
    "HOME",
    "APPDATA",
    "USERPROFILE",
    "HOMEDRIVE",
    "HOMEPATH",
    "PROGRAMDATA",
    "ALLUSERSPROFILE",
    "SYSTEMROOT",
    "WINDIR",
    "COMSPEC",
    "SYSTEMDRIVE",
    "PROGRAMFILES",
    "PROGRAMFILES(X86)",
    "PROGRAMW6432",
    "LOCALAPPDATA",
    "PATHEXT",
    "COMMONPROGRAMFILES",
    "COMMONPROGRAMFILES(X86)",
    "COMMONPROGRAMW6432",
    "PSMODULEPATH",
    "HOMESHARE",
    "ONEDRIVE",
    "ONEDRIVECONSUMER",
    "ONEDRIVECOMMERCIAL",
    "CDPATH",
    "PWD",
    "XDG_DATA_HOME",
    "XDG_CACHE_HOME",
    "XDG_STATE_HOME",
    "CLAUDE_CODE_SAFE_MODE",
    "CLAUDE_CODE_SIMPLE",
    "CLAUDE_CODE_HARBOR_KITE",
    "CLAUDE_CODE_HARBOR_KITE_CLOUD",
    "CLAUDE_CODE_HARBOR_KITE_PACING_OFF",
    "CLAUDE_CODE_SILENT_TURN_REMINDER",
    "CLAUDE_CODE_SILENT_TURN_REMINDER_TURNS",
    "CLAUDE_CODE_SILENT_TURN_REMINDER_SECONDS",
    "CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT",
    "CLAUDE_CODE_MODEL_CAPABILITIES",
    "CLAUDE_CODE_ARTIFACT_ROOM",
    "CLAUDE_CODE_BASH_EDIT_DIFF",
    "CLAUDE_CODE_FORWARD_USER_INTENT",
    "CLAUDE_CODE_WHIMSICAL_ELEPHANT",
    "CLAUDE_CODE_PARSED_WILLOW",
    "CLAUDE_CODE_DAPPER_CUPCAKE",
    "CLAUDE_CODE_DEEP_TWILIGHT",
    "CLAUDE_CODE_ARTIFACT_PRESENCE",
    "CLAUDE_CODE_ARTIFACT_OPEN_ACTION",
    "CLAUDE_CODE_ARTIFACT_REPL",
    "CLAUDE_CODE_RESUME_CACHE_WARM",
    "CLAUDE_CODE_ARTIFACT_PREVIEW_EMULATOR",
    "USER_TYPE",
    "CLAUDE_CODE_MESSAGING_SOCKET",
    "CLAUDE_CODE_MESSAGING_TOKEN",
    "CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION",
    "CLAUDE_CODE_MANAGED_SETTINGS_PATH",
    "CLAUDE_CODE_TOASTY_THIMBLE",
    "CLAUDE_CODE_GENTLE_PARASOL",
    "CLAUDE_CODE_STREAMED_BUMBLEBEE_TEXT",
    "CLAUDE_CODE_CURRIED_TRINKET",
    "CLAUDE_CODE_LEGACY_BUNDLE",
    "CCR_ENABLE_BUNDLE",
    "CCR_FORCE_BUNDLE",
    ...BLOCKED_PREFIX_GROUPS.flatMap((prefixGroup) => prefixGroup.names),
    "GITHUB_ACTIONS",
    "RUNNER_ENVIRONMENT",
    "CLAUDE_CODE_SUBPROCESS_ENV_SCRUB",
    "ENABLE_BETA_TRACING_DETAILED",
    "BETA_TRACING_ENDPOINT",
    "OTEL_LOG_RAW_API_BODIES",
    ...OTEL_ENV_VARS,
    "CLAUDE_PTY_RECORD",
    "CLAUDE_CODE_DEBUG_LOGS_DIR",
    "CLAUDE_CODE_DIAGNOSTICS_FILE",
    "CLAUDE_CODE_PERFETTO_TRACE",
    "CLAUDE_CODE_FRAME_TIMING_LOG",
    "CLAUDE_CODE_REMOTE_MEMORY_DIR",
    "CLAUDE_COWORK_MEMORY_PATH_OVERRIDE",
    "AUTOMODE_DECISION_LOG",
    "CLAUDE_CONFIG_DIR",
    "CLAUDE_SECURESTORAGE_CONFIG_DIR",
    "CLAUDE_CODE_TMPDIR",
    "CLAUDE_TMPDIR",
    "TMPDIR",
    "TMP",
    "TEMP",
    "XDG_RUNTIME_DIR",
    "CLAUDE_JOB_DIR",
    "CLAUDE_CODE_DISABLE_BG_STABLE_PATH",
    "CLAUDE_CODE_REMOTE_TOOLS_FORWARD",
    "CLAUDE_CODE_USER_DIALOG_TIMEOUT_MS",
    "CLAUDE_AFK_TIMEOUT_MS",
    "CLAUDE_AFK_COUNTDOWN_MS",
    "CLAUDE_AX_SCREEN_READER",
    "INK_SCREEN_READER",
    "CLAUDE_CHROME_CLASSIFIER_FLOOR",
    "CLAUDE_CHROME_PERMISSION_MODE",
    "CLAUDE_CODE_ENABLE_CFC",
    "CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL",
    CLAUDE_CODE_EXPERIMENTAL_CODE_MODE,
    CODE_MODE_RESTART_ENV,
    CODE_MODE_RESTARTED_FROM_ENV,
    ...EXTRA_BLOCKED_ENV_VARS,
  ]);
  PROJECT_SCOPE_BLOCKED_PREFIXES = [
    "CLAUDE_AX_",
    ...BLOCKED_PREFIX_GROUPS.flatMap((prefixGroup) => prefixGroup.prefixes),
    ...EXTRA_BLOCKED_ENV_PREFIXES,
  ];
});
//@ chunk-71parphm.js:18193-18280 placement
function isProjectScopeBlockedEnvVar(envName) {
  let upper = envName.toUpperCase();
  return (
    PROJECT_SCOPE_BLOCKED_ENV_VARS.has(upper) ||
    PROJECT_SCOPE_BLOCKED_PREFIXES.some((prefix) => upper.startsWith(prefix))
  );
}
//@ chunk-71parphm.js:22936-22976 placement
/**
 * 判断某环境项的值是否允许下发（安全值或目录例外）。
 */
function isServableEnvValue(name, value) {
  return isSafeChromeEnvValue(name, value) || isCatalogDisabledByPolicy(name, value);
}
//@ chunk-71parphm.js:22976-23035 placement
function purgeHostOwnedChromeVars() {
  for (let key of CHROME_ENV_VARS.keys()) delete process.env[key];
}
//@ chunk-71parphm.js:23035-23140 placement
var USER_SCOPE_BLOCKED_ENV_VARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-71parphm.js:23035", () => {
  USER_SCOPE_BLOCKED_ENV_VARS = new Set([
    "CLAUDE_CODE_PLUGIN_DIRS",
    "CLAUDE_CODE_PLUGIN_DIR_WATCH",
    "CLAUDE_CODE_PROCESS_WRAPPER",
  ]);
});
//@ chunk-71parphm.js:23140-23271 placement
function stripHostOnlyEnv(env, source) {
  if (
    env === undefined ||
    !isPersonalConfigRestricted() ||
    (source !== "userSettings" && source !== "globalConfig")
  )
    return env;
  return import_reject(env, (value, key) => USER_SCOPE_BLOCKED_ENV_VARS.has(key.toUpperCase()));
}
//@ chunk-71parphm.js:23271-23369 placement
function withoutRestrictedEnvKeys(env) {
  if (!env) return {};
  let filtered = {};
  for (let [key, value] of Object.entries(env)) if (!isRestrictedEnvKey(key, value)) filtered[key] = value;
  return filtered;
}
//@ chunk-71parphm.js:23369-23419 placement
function getEnvAboveProjectSettings() {
  return managedEnvApplier.envAboveProjectSettings();
}
//@ chunk-71parphm.js:23419-23470 placement
function getPreSettingsEnvSnapshot() {
  return managedEnvApplier.getPreSettingsEnvSnapshot();
}
//@ chunk-71parphm.js:23470-23577 placement
function getPreSettingsEnvHonoringLiveDeletions() {
  let env = {
    ...getPreSettingsEnvSnapshot(),
  };
  for (let key of Object.keys(env)) if (process.env[key] === undefined) delete env[key];
  return env;
}
//@ chunk-71parphm.js:23577-23634 placement
function isSettingsSourcedEnvValue(key, value) {
  return managedEnvApplier.isSettingsSourcedEnvValue(key, value);
}
//@ chunk-71parphm.js:23634-23690 placement
function personsSettingsEnvKeeps(name, value) {
  return managedEnvApplier.personsSettingsEnvKeeps(name, value);
}
//@ chunk-71parphm.js:23690-23746 placement
function putBackUnsuppliedTelemetryEnv() {
  return managedEnvApplier.putBackUnsuppliedTelemetryEnv();
}
//@ chunk-71parphm.js:23746-23790 placement
function setToolServerLaunchEnv(env) {
  managedEnvApplier.setToolServerLaunchEnv(env);
}
//@ chunk-71parphm.js:23790-23837 placement
function recordPersonsEnvValue(name, value) {
  managedEnvApplier.recordPersonsEnvValue(name, value);
}
//@ chunk-71parphm.js:23837-23889 placement
function getLatchedPreSettingsEnvSnapshot() {
  return managedEnvApplier.peekPreSettingsEnvSnapshot();
}
//@ chunk-71parphm.js:23889-23913 placement
function withLaunchValuesOfHybridConnection(env) {
  return env;
}
//@ chunk-71parphm.js:23913-23955 placement
function getLegacyEnvMap() {
  return managedEnvApplier.getLegacyEnvMap();
}
//@ chunk-71parphm.js:23955-24006 placement
function getAppliedGlobalConfigEnv() {
  return managedEnvApplier.getAppliedGlobalConfigEnv();
}
//@ chunk-71parphm.js:24006-24014 placement
// deferred: uses setHelperOutputOverride (./settings/policyHelper/helperRemote.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-71parphm.js:24006", () => {
  setHelperOutputOverride(getPreSettingsEnvSnapshot);
});
//@ chunk-71parphm.js:24014-24054 placement
// deferred: uses withEnvTake (./settings/hostEnvWrites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-71parphm.js:24014", () => {
  withEnvTake(() => managedEnvApplier.takeChildEnvFromRepository());
});
//@ chunk-71parphm.js:24054-24062 placement
// deferred: uses setPersonalConfigRestriction (./personalConfigRestriction.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-71parphm.js:24054", () => {
  setPersonalConfigRestriction(getLatchedPreSettingsEnvSnapshot);
});
//@ chunk-71parphm.js:24062-24101 placement (2.1.88 match: _temp7, 1)
// deferred: uses setManagedOverrideProvider (./settings/hostEnvWrites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-71parphm.js:24062", () => {
  setManagedOverrideProvider(() => getSettingsForSource("policySettings")?.env ?? {});
});
//@ chunk-71parphm.js:24101-24107 placement
// deferred: uses setEnvEntryProblemCheck (./envValidation.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-71parphm.js:24101", () => {
  setEnvEntryProblemCheck(isSettingsSourcedEnvValue);
});
//@ chunk-71parphm.js:24107-24162 placement
// deferred: uses setRemoteSettingsProbes (../services/cloudSessions/eligibility.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-71parphm.js:24107", () => {
  setRemoteSettingsProbes(
    (verdict) => managedEnvApplier.routeAfterVerdict(verdict),
    (name) => managedEnvApplier.launchNamed(name),
  );
});
//@ chunk-71parphm.js:24162-24274 placement
// deferred: uses setClaimContext (../entrypoints/warmSpare/claimCredentials.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-71parphm.js:24162", () => {
  setClaimContext({
    env: () => managedEnvApplier.getHostLaunchEnv(),
    credential: () => managedEnvApplier.getLaunchCredential(),
    road: () => managedEnvApplier.getLaunchCredentialRoad(),
  });
});
//@ chunk-71parphm.js:24274-24333 placement
function resetPreSettingsEnvSnapshotForClaim(claimId, kept) {
  return managedEnvApplier.dropPreSettingsEnvSnapshot(claimId, kept);
}
//@ chunk-71parphm.js:24333-24388 placement
function envKeyCase(key) {
  return getPlatform() === "windows" ? key.toUpperCase() : key;
}
//@ chunk-71parphm.js:24388-24684 placement
function launchViewAtClaim(claimedEnv, nameList, overrides) {
  if (claimedEnv === undefined)
    return Object.freeze({
      ...process.env,
    });
  let claimedKeys = new Set(nameList.map(envKeyCase));
  let claimedByName = new Map(Object.entries(claimedEnv).map(([key, value]) => [envKeyCase(key), value]));
  let view = {};
  for (let key of Object.keys(process.env))
    if (claimedKeys.has(envKeyCase(key))) view[key] = overrides?.[key] ?? process.env[key];
    else if (claimedByName.has(envKeyCase(key))) view[key] = claimedByName.get(envKeyCase(key));
  return Object.freeze(view);
}
//@ chunk-71parphm.js:24684-24871 placement
function putBackTransport(snapshot, shouldRestore) {
  let filtered = Object.keys(process.env).filter(
    (key) => shouldRestore(key) && process.env[key] !== snapshot[key],
  );
  for (let key of filtered)
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  return filtered.length > 0;
}
//@ chunk-71parphm.js:24871-24964 placement
function filterPolicyPredicateEnv(env, sourceName = "policySettings") {
  return managedEnvApplier.filterPolicyPredicateEnv(env, sourceName, {
    forPolicyMatch: false,
  });
}
//@ chunk-71parphm.js:24964-25058 placement
function filterEnvForPolicyPredicateMatch(env, sourceName = "policySettings") {
  return managedEnvApplier.filterPolicyPredicateEnv(env, sourceName, {
    forPolicyMatch: true,
  });
}
//@ chunk-71parphm.js:25058-25116 placement
function withoutInvalidSettingsEnv(env, settings) {
  return managedEnvApplier.withoutInvalidSettingsEnv(env, settings);
}
//@ chunk-71parphm.js:25116-25153 placement
function settingsEnvForHookChild(env, settings) {
  return withoutRestrictedEnvKeys(withoutInvalidSettingsEnv(env, settings));
}
//@ chunk-71parphm.js:25153-25433 placement
var TELEMETRY_SETTING_SOURCES; // deferred: uses PROVIDER_ENV_VARS (./managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
var OTLP_SIGNALS;
var OTLP_EXPORTER_PREFIX;
var OTLP_SECRET_SUFFIXES;
var OTEL_EXPORTER_SELECTORS;
var CLAUDE_CODE_ENABLE_TELEMETRY;
var BETA_TRACING_ENDPOINT;
deferInit("chunk-71parphm.js:25153", () => {
  TELEMETRY_SETTING_SOURCES = ["userSettings", "flagSettings", "policySettings"];
  OTLP_SIGNALS = ["TRACES", "METRICS", "LOGS", "PROFILES"];
  OTLP_EXPORTER_PREFIX = OTEL_EXPORTER_OTLP;
  OTLP_SECRET_SUFFIXES = new Set(["HEADERS", "CLIENT_KEY", "CLIENT_CERTIFICATE"]);
  OTEL_EXPORTER_SELECTORS = new Set(["OTEL_LOGS_EXPORTER", "OTEL_TRACES_EXPORTER"]);
  CLAUDE_CODE_ENABLE_TELEMETRY = "CLAUDE_CODE_ENABLE_TELEMETRY";
  BETA_TRACING_ENDPOINT = "BETA_TRACING_ENDPOINT";
});
//@ chunk-71parphm.js:25433-25501 placement
var OTEL_ENDPOINT_ENV_VARS; // deferred: uses PROVIDER_ENV_VARS (./managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-71parphm.js:25433", () => {
  OTEL_ENDPOINT_ENV_VARS = new Set([
    `${OTEL_EXPORTER_OTLP}ENDPOINT`,
    `${OTEL_EXPORTER_OTLP}HEADERS`,
    `${OTEL_EXPORTER_OTLP}PROTOCOL`,
  ]);
});
//@ chunk-71parphm.js:25501-25524 placement
function identityEnvMap(envKey) {
  return envKey;
}
//@ chunk-71parphm.js:25524-25595 placement
function lacksOtlpExporter(exporters) {
  return !exporters
    .split(",")
    .map((exporter) => exporter.trim())
    .includes("otlp");
}
//@ chunk-71parphm.js:25595-25650 placement
function envKeyCaseUpper(envName) {
  return getPlatform() === "windows" ? envName.toUpperCase() : envName;
}
//@ chunk-71parphm.js:25650-25779 placement
function pickEnvKeys(env, wantedNames) {
  let picked = {};
  for (let [key, value] of Object.entries(env ?? {}))
    if (wantedNames.includes(key.toUpperCase()) && value !== undefined) picked[key] = String(value);
  return picked;
}
//@ chunk-71parphm.js:25779-42486 placement
/**
 * 应用托管/项目设置中的环境变量：按作用域过滤被阻止变量、剥离 provider 相关变量并告警。
 */
class ManagedEnvApplier {
  providerStripContext = HOST_MANAGED_STRIP_CONTEXT;
  projectScopeDropWarned = new Set();
  fullPassDroppedGitKey = false;
  hostManagedDropWarned = new Set();
  invalidEnvKeyWarned = new Set();
  hostSpawnEnvKeys = undefined;
  settingsEnvForChildren = {};
  settingsEnvForChildrenFromRepository = new Map();
  publishedChildEnv = {};
  publishedChildEnvFromRepository = new Map();
  toolServerLaunchEnv = {};
  materializedProcessWrapper = undefined;
  preSettingsEnvSnapshot = undefined;
  userTierNames = new Set();
  launchNamesBeforeClaim = undefined;
  userTierNamesInSnapshot = new Set();
  claimLaunchEnv = undefined;
  launchCredentialRoad = "none";
  launchCredential = undefined;
  otelDominanceDropWarned = new Set();
  hostSpawnEnvDropWarned = new Set();
  untrustedFolderDropWarned = new Set();
  servedFolderEnvWithheld = false;
  getPreSettingsEnvSnapshot() {
    if (this.preSettingsEnvSnapshot === undefined) {
      this.preSettingsEnvSnapshot = this.latchPreSettingsEnvSnapshot({
        ...process.env,
      });
      env.unset("CLAUDE_CODE_PERSONAL_HOOKS_OFF");
    }
    return this.preSettingsEnvSnapshot;
  }
  latchPreSettingsEnvSnapshot(envSnapshot) {
    let launchNamesBeforeClaim = this.launchNamesBeforeClaim;
    this.userTierNamesInSnapshot = new Set(
      launchNamesBeforeClaim === undefined
        ? []
        : Object.keys(envSnapshot)
            .map((key) => key.toUpperCase())
            .filter((envName) => this.userTierNames.has(envName) && !launchNamesBeforeClaim.has(envName)),
    );
    let claimLaunchEnv = this.claimLaunchEnv ?? envSnapshot;
    this.launchCredential = hasManagedSettings() ? claimedCredential_2(claimLaunchEnv) : null;
    this.launchCredentialRoad = hasManagedSettings()
      ? credentialRoad(claimLaunchEnv, this.launchCredential)
      : "none";
    return Object.freeze(envSnapshot);
  }
  getLaunchCredentialRoad() {
    this.getPreSettingsEnvSnapshot();
    return this.launchCredentialRoad;
  }
  getLaunchCredential() {
    this.getPreSettingsEnvSnapshot();
    return this.launchCredential ?? null;
  }
  getHostLaunchEnv() {
    let preSettingsEnvSnapshot = this.getPreSettingsEnvSnapshot();
    return this.claimLaunchEnv ?? preSettingsEnvSnapshot;
  }
  envAboveProjectSettings() {
    let preSettingsEnvSnapshot = this.getPreSettingsEnvSnapshot();
    let filtered = {};
    for (let [key, value] of Object.entries(preSettingsEnvSnapshot))
      if (!this.userTierNamesInSnapshot.has(key.toUpperCase())) filtered[key] = value;
    return {
      ...filtered,
      ...getSettingsForSource("flagSettings")?.env,
      ...getSettingsForSource("policySettings")?.env,
    };
  }
  peekPreSettingsEnvSnapshot() {
    return this.preSettingsEnvSnapshot;
  }
  appliedGlobalConfigEnv = undefined;
  legacyEnvMapAtLaunch = undefined;
  settingsOfferedEnvValues = new Map();
  personsWrittenEnvValues = new Map();
  otelDominatedAsked = undefined;
  getAppliedGlobalConfigEnv() {
    return this.appliedGlobalConfigEnv;
  }
  getLegacyEnvMap() {
    return this.legacyEnvMapAtLaunch ?? getGlobalConfig().env;
  }
  dropPreSettingsEnvSnapshot(source, warn) {
    let preSettingsEnvSnapshot = this.preSettingsEnvSnapshot;
    this.preSettingsEnvSnapshot = undefined;
    this.launchCredential = undefined;
    this.claimLaunchEnv = undefined;
    this.legacyEnvMapAtLaunch = undefined;
    if (source === undefined) return false;
    let sourceNames = [...source];
    if (preSettingsEnvSnapshot)
      this.launchNamesBeforeClaim = new Set(
        [...Object.keys(preSettingsEnvSnapshot), ...sourceNames].map((name) => name.toUpperCase()),
      );
    if (!hasManagedSettings()) return false;
    let launchEnv = launchViewAtClaim(preSettingsEnvSnapshot, sourceNames, warn);
    this.claimLaunchEnv = launchEnv;
    let restored = preSettingsEnvSnapshot !== undefined && putBackTransport(launchEnv, isNetworkEnvVar);
    this.getPreSettingsEnvSnapshot();
    return restored;
  }
  reset() {
    this.providerStripContext = HOST_MANAGED_STRIP_CONTEXT;
    this.projectScopeDropWarned.clear();
    this.hostManagedDropWarned.clear();
    this.invalidEnvKeyWarned.clear();
    this.hostSpawnEnvKeys = undefined;
    this.settingsEnvForChildren = {};
    this.settingsEnvForChildrenFromRepository = new Map();
    this.toolServerLaunchEnv = {};
    this.materializedProcessWrapper = undefined;
    this.preSettingsEnvSnapshot = undefined;
    this.userTierNames.clear();
    this.launchNamesBeforeClaim = undefined;
    this.userTierNamesInSnapshot = new Set();
    this.claimLaunchEnv = undefined;
    this.launchCredential = undefined;
    this.launchCredentialRoad = "none";
    this.appliedGlobalConfigEnv = undefined;
    this.legacyEnvMapAtLaunch = undefined;
    this.settingsOfferedEnvValues.clear();
    this.personsWrittenEnvValues.clear();
    this.otelDominanceDropWarned.clear();
    this.hostSpawnEnvDropWarned.clear();
    this.untrustedFolderDropWarned.clear();
    this.servedFolderEnvWithheld = false;
    this.fullPassDroppedGitKey = false;
  }
  lastFullPassDroppedProjectGitKey() {
    return this.fullPassDroppedGitKey;
  }
  servedFolderEnvWasWithheld() {
    return this.servedFolderEnvWithheld;
  }
  strippedSettingsEnv(env, source, hostContext, warnContext) {
    let strippedEnv = applySafeConfigEnvironmentVariables_2(
      filterHostManagedEnv(
        withoutRestrictedEnvKeys(
          hasDangerousEnvVars(
            stripProjectBlockedEnv(
              dropIgnoredEnvEntries(
                stripHostOnlyEnv(
                  this.asFromAFolderNobodyTrusted(env, source, warnContext !== undefined),
                  source,
                ),
                source,
                warnContext && this.invalidEnvKeyWarned,
              ),
              source,
              warnContext && this.projectScopeDropWarned,
              () => this.envAboveProjectSettings(),
              warnContext?.onGitKeyDropped,
            ),
          ),
        ),
        source,
        hostContext,
        warnContext && this.hostManagedDropWarned,
      ),
      source,
      this.hostSpawnEnvKeys,
      hostContext.desktopHost,
      warnContext && this.hostSpawnEnvDropWarned,
    );
    if (warnContext)
      return applyDirectEnvKeys(
        strippedEnv,
        this.settingsEnvForChildren,
        this.settingsEnvForChildrenFromRepository,
        isDangerousEnvVar(source),
      );
    let directChildEnv = {};
    let filteredEnv = applyDirectEnvKeys(strippedEnv, directChildEnv);
    for (let [key, value] of Object.entries(directChildEnv))
      if (isColorEnvVar(key.toUpperCase())) filteredEnv[key] = value;
    return filteredEnv;
  }
  keptSettingsEnv(env, source, hostContext, warnContext) {
    return this.withholdsEnvFrom(source, hostContext)
      ? {}
      : this.strippedSettingsEnv(env, source, hostContext, warnContext);
  }
  launchEnvUnlatched() {
    return this.claimLaunchEnv ?? this.peekPreSettingsEnvSnapshot() ?? process.env;
  }
  launchNamed(names) {
    let valuesByUpperKey = new Map(
      Object.entries(pickEnvKeys(this.launchEnvUnlatched(), names)).map(([key, value]) => [
        envKeyCaseUpper(key),
        value,
      ]),
    );
    return (key) => valuesByUpperKey.get(envKeyCaseUpper(key));
  }
  routeAfterVerdict(names) {
    let hostContext =
      this.providerStripContext === HOST_MANAGED_STRIP_CONTEXT
        ? hostManagementFacts()
        : this.providerStripContext;
    let layers = [
      pickEnvKeys(this.launchEnvUnlatched(), names),
      this.keptSettingsEnv(
        pickEnvKeys(this.getLegacyEnvMap(), names),
        "globalConfig",
        hostContext,
        undefined,
      ),
      ...getEnabledSettingSources()
        .filter((source) => source !== "policySettings" && !isDangerousEnvVar(source))
        .map((source) =>
          this.keptSettingsEnv(
            pickEnvKeys(getSettingsForSource(source)?.env, names),
            source,
            hostContext,
            undefined,
          ),
        ),
      this.strippedSettingsEnv(
        pickEnvKeys(getMachineAdminPolicyEnv(), names),
        "policySettings",
        hostContext,
        undefined,
      ),
    ];
    let merged = new Map(
      layers.flatMap((layer) => Object.entries(layer).map(([key, value]) => [envKeyCaseUpper(key), value])),
    );
    return (key) => merged.get(envKeyCaseUpper(key));
  }
  setToolServerLaunchEnv(toolServerLaunchEnv) {
    this.toolServerLaunchEnv = toolServerLaunchEnv;
  }
  assignFromAboveTheRepository(env) {
    Object.assign(process.env, env);
    for (let key of Object.keys(env)) forgetHostEnvWrites(key);
  }
  takeChildEnvFromRepository() {
    let publishedChildEnv = this.publishedChildEnv;
    let changedEntries = [];
    for (let [key, previousValue] of this.publishedChildEnvFromRepository) {
      let currentValue = publishedChildEnv[key];
      if (currentValue === undefined) continue;
      changedEntries.push([key, currentValue]);
      if (previousValue === undefined) delete publishedChildEnv[key];
      else publishedChildEnv[key] = previousValue;
    }
    if (changedEntries.length === 0) return;
    return () => {
      for (let [entryKey, previousValue] of changedEntries) publishedChildEnv[entryKey] = previousValue;
    };
  }
  publishChildEnv() {
    this.publishedChildEnv = this.settingsEnvForChildren;
    this.publishedChildEnvFromRepository = this.settingsEnvForChildrenFromRepository;
    setSettingsEnvForChildren(this.settingsEnvForChildren);
  }
  takenFromToolServerLaunchEnv() {
    let env = {};
    for (let [key, value] of Object.entries(
      withoutRestrictedEnvKeys(
        dropIgnoredEnvEntries(this.toolServerLaunchEnv, "globalConfig", this.invalidEnvKeyWarned),
      ),
    ))
      if (!HOST_ONLY_ENV_VARS.has(key.toUpperCase())) env[key] = value;
    return this.filterSettingsEnv(applyDirectEnvKeys(env, this.settingsEnvForChildren), "globalConfig");
  }
  filterSettingsEnv(env, source, onGitKeyDropped) {
    let keptEnv = this.keptSettingsEnv(env, source, this.providerStripContext, {
      onGitKeyDropped,
    });
    for (let [key, value] of Object.entries(keptEnv)) this.recordOfferedEnvValue(key, value);
    if (source === "globalConfig" || source === "userSettings")
      for (let key of Object.keys(keptEnv)) this.userTierNames.add(key.toUpperCase());
    return keptEnv;
  }
  withoutInvalidSettingsEnv(env, source) {
    return dropIgnoredEnvEntries(env, source, this.invalidEnvKeyWarned);
  }
  putBackUnsuppliedTelemetryEnv() {
    let preSettingsEnvSnapshot = this.preSettingsEnvSnapshot;
    if (preSettingsEnvSnapshot === undefined || this.appliedGlobalConfigEnv === undefined) return false;
    let restored = false;
    let filtered = Object.keys(process.env).filter((key) => {
      let upper = key.toUpperCase();
      let currentValue = process.env[key];
      return (
        currentValue !== undefined &&
        currentValue !== preSettingsEnvSnapshot[key] &&
        (OTEL_EXPORTER_PREFIXES.some((prefix) => upper.startsWith(prefix)) ||
          OTEL_DETAIL_VARS.includes(upper) ||
          OTEL_ENV_VAR_SET.has(upper)) &&
        this.settingsOfferedEnvValues.get(upper)?.has(currentValue.trim()) === true &&
        this.personsWrittenEnvValues.get(envKeyCase(key)) !== currentValue.trim()
      );
    });
    if (filtered.length > 0) {
      let latestValues = new Map();
      for (let envSource of [
        this.toolServerLaunchEnv,
        this.appliedGlobalConfigEnv ?? {},
        ...getEnabledSettingSources().map((source) =>
          this.keptSettingsEnv(
            getSettingsForSource(source)?.env,
            source,
            this.providerStripContext,
            undefined,
          ),
        ),
      ])
        for (let [key, value] of Object.entries(envSource)) latestValues.set(envKeyCase(key), value.trim());
      let filtered_2 = filtered.filter(
        (key) => latestValues.get(envKeyCase(key)) !== process.env[key]?.trim(),
      );
      restored = putBackTransport(preSettingsEnvSnapshot, (key) => filtered_2.includes(key));
      if (restored)
        logForDebugging(
          `Telemetry environment variables put back to their startup values, or removed, because no settings source still sets their current value: ${filtered_2.map(escapeForDisplay).join(", ")}`,
        );
    }
    this.enforceManagedOtelFamilyDominance();
    return restored;
  }
  isSettingsSourcedEnvValue(key, value) {
    let trimmed = value.trim();
    return (
      this.settingsOfferedEnvValues.get(key.toUpperCase())?.has(trimmed) === true ||
      this.personsWrittenEnvValues.get(envKeyCase(key)) === trimmed
    );
  }
  recordPersonsEnvValue(key, value) {
    if (value === undefined) this.personsWrittenEnvValues.delete(envKeyCase(key));
    else this.personsWrittenEnvValues.set(envKeyCase(key), value.trim());
  }
  recordOfferedEnvValue(key, value) {
    let upper = key.toUpperCase();
    let trimmed = value.trim();
    let knownValues = this.settingsOfferedEnvValues.get(upper);
    if (knownValues) knownValues.add(trimmed);
    else this.settingsOfferedEnvValues.set(upper, new Set([trimmed]));
  }
  personsSettingsEnvKeeps(key, value) {
    let hostContext =
      this.providerStripContext === HOST_MANAGED_STRIP_CONTEXT
        ? hostManagementFacts()
        : this.providerStripContext;
    let enabledSettingSources = getEnabledSettingSources();
    let sliced = enabledSettingSources.slice(enabledSettingSources.indexOf("userSettings") + 1);
    let keptKeysFor = (env, settingsEnv) =>
      Object.keys(this.keptSettingsEnv(env, settingsEnv, hostContext, undefined));
    return (
      enabledSettingSources.includes("userSettings") &&
      keptKeysFor(
        {
          [key]: value,
        },
        "userSettings",
      ).includes(key) &&
      !sliced.some((source) =>
        keptKeysFor(getSettingsForSource(source)?.env, source).some(
          (keptKey) => envKeyCase(keptKey) === envKeyCase(key),
        ),
      ) &&
      !this.otelDominates(key) &&
      !(
        value === "" &&
        envKeyCase(key) === envKeyCase(PROCESS_WRAPPER_ENV) &&
        this.processWrapperKeyAbove() !== undefined
      )
    );
  }
  otelDominates(key) {
    let dominated = new Set();
    this.otelDominatedAsked = dominated;
    try {
      this.enforceManagedOtelFamilyDominance();
    } finally {
      this.otelDominatedAsked = undefined;
    }
    return dominated.has(key.toUpperCase());
  }
  otelClaimInForce(key, value) {
    return this.otelDominatedAsked !== undefined || process.env[key] === value;
  }
  processWrapperKeyAbove() {
    return [this.processWrapperKeyFrom("policySettings"), this.processWrapperKeyFrom("flagSettings")].find(
      (wrapperKey) => typeof wrapperKey === "string" && wrapperKey !== "",
    );
  }
  filterPolicyPredicateEnv(env, source, { forPolicyMatch }) {
    if (!forPolicyMatch && this.withholdsEnvFrom(source)) return {};
    let filteredEnv = applySafeConfigEnvironmentVariables_2(
      filterHostManagedEnv(
        withoutRestrictedEnvKeys(
          hasDangerousEnvVars(
            stripProjectBlockedEnv(
              dropIgnoredEnvEntries(
                forPolicyMatch ? env : this.asFromAFolderNobodyTrusted(env, source, false),
                source,
                this.invalidEnvKeyWarned,
              ),
              source,
              this.projectScopeDropWarned,
              () => this.envAboveProjectSettings(),
            ),
          ),
        ),
        source,
        this.providerStripContext,
        this.hostManagedDropWarned,
      ),
      source,
      this.hostSpawnEnvKeys,
      this.providerStripContext.desktopHost,
    );
    let result = {};
    for (let [key, value] of Object.entries(filteredEnv)) {
      let envName = key.toUpperCase();
      if (isColorEnvVar(envName)) continue;
      if (!forPolicyMatch && isServeBlockedEnv(key, value)) continue;
      result[key] = value;
    }
    return result;
  }
  withholdsEnvFrom(source, hostContext = this.providerStripContext) {
    return hostContext.storedLoginPinned && isSettingsTierWithheld(source);
  }
  asFromAFolderNobodyTrusted(env, source, warnOnDrop) {
    if (env === undefined || !isAttachServeRepoScopedSourceOrNonInteractive(source)) return env;
    let isRepoScoped = isAttachServeRepoScopedSource(source);
    let keptEnv = {};
    let ignoredNames = [];
    for (let [key, value] of Object.entries(env)) {
      let name = key.toUpperCase();
      if (
        typeof value === "string" &&
        (isEnvSettingOn(key, value) || (!isRepoScoped && isServableEnvValue(name, value)))
      )
        keptEnv[key] = value;
      else if (warnOnDrop && isRepoScoped) this.servedFolderEnvWithheld = true;
      else if (warnOnDrop && !this.untrustedFolderDropWarned.has(`${source}:${key}`)) {
        this.untrustedFolderDropWarned.add(`${source}:${key}`);
        ignoredNames.push(describeEnvEntryName(key));
      }
    }
    if (ignoredNames.length > 0)
      logForDebugging(
        `Ignoring ${ignoredNames.join(", ")} in the env block of ${source === "localSettings" ? ".claude/settings.local.json" : ".claude/settings.json"}: ${PERSISTED_TRUST_IGNORED}, and this session cannot show a trust dialog, so this folder's settings files may set only a short list of variables, each to certain values only, such as DISABLE_TELEMETRY=1. The repository's author chose the ignored values, not you. If your setup needs an ignored variable, set it yourself in user or managed settings, or in the environment that Claude Code is started with. On a self-hosted runner, user settings are settings.json in the runner host's config directory (SELF_HOSTED_RUNNER_HOST_CONFIG_DIR): restart the runner afterwards.`,
        {
          level: "warn",
        },
      );
    return keptEnv;
  }
  processWrapperKeyFrom(source) {
    return this.withholdsEnvFrom(source) ||
      isHttpMcpServeInvocation() ||
      (source === "userSettings" && isPersonalConfigRestricted())
      ? undefined
      : getSettingsForSource(source)?.processWrapper;
  }
  dropDominatedOtelKey(key, description, claimer, claims, sourceLabel = "managed settings") {
    let otelDominatedAsked = this.otelDominatedAsked;
    if (otelDominatedAsked !== undefined) {
      if (
        !(claims.has(key) && claims.get(key) === process.env[key]) &&
        !this.hostSpawnEnvKeys?.has(key.toUpperCase())
      )
        otelDominatedAsked.add(key.toUpperCase());
      return;
    }
    if (claims.get(key) === process.env[key]) return;
    if (this.hostSpawnEnvKeys?.has(key.toUpperCase())) return;
    if (process.env[key] === undefined) return;
    if (!this.otelDominanceDropWarned.has(key)) {
      this.otelDominanceDropWarned.add(key);
      logForDebugging(
        `Dropping ${escapeForDisplay(key)}: ${escapeForDisplay(claimer)} is claimed by ${sourceLabel}, so lower-trust scopes cannot redirect ${description}`,
        {
          level: "warn",
        },
      );
    }
    delete process.env[key];
  }
  dropDominatedAntAlias(alias, claimer, claims, sourceLabel = "managed settings") {
    return;
  }
  dropDominatedBetaTracingEndpoint(claimer, claims, sourceLabel = "managed settings") {
    this.dropDominatedOtelKey(
      BETA_TRACING_ENDPOINT,
      "the logs and traces signals through detailed beta tracing",
      claimer,
      claims,
      sourceLabel,
    );
  }
  hostSpawnOtelClaims() {
    let claims = new Map();
    let hostSpawnEnvKeys = this.hostSpawnEnvKeys;
    if (!hostSpawnEnvKeys) return claims;
    let any = [...hostSpawnEnvKeys].some((hostSpawnEnvKey) => {
      let envKey = identityEnvMap(hostSpawnEnvKey);
      return (
        ((envKey.startsWith(OTLP_EXPORTER_PREFIX) && envKey.endsWith("_ENDPOINT")) ||
          envKey === BETA_TRACING_ENDPOINT) &&
        (process.env[hostSpawnEnvKey] ?? "").trim() !== ""
      );
    });
    for (let hostSpawnEnvKey of hostSpawnEnvKeys) {
      let envKey = identityEnvMap(hostSpawnEnvKey);
      let isOtelSelector = OTEL_EXPORTER_SELECTORS.has(envKey) || envKey === CLAUDE_CODE_ENABLE_TELEMETRY;
      let isAnyOtel = any && envKey.startsWith(OTLP_EXPORTER_PREFIX);
      if (!isOtelSelector && !isAnyOtel) continue;
      let value = process.env[hostSpawnEnvKey];
      if (value !== undefined) claims.set(hostSpawnEnvKey, value);
    }
    return claims;
  }
  enforceManagedOtelFamilyDominance() {
    let settingsForSource = getSettingsForSource("policySettings");
    let env = settingsForSource?.env;
    let hasHeadersHelper = (settingsForSource?.otelHeadersHelper ?? "").trim() !== "";
    let claims = new Map();
    for (let [key, value] of Object.entries(env ?? {})) {
      let upper = key.toUpperCase();
      if (!claims.has(upper) || key === upper) claims.set(upper, value);
    }
    this.applyOtelFamilyClaims(this.hostSpawnOtelClaims(), claims, "the host spawn env");
    if (!env && !hasHeadersHelper) return;
    if (hasHeadersHelper) {
      for (let signal of OTLP_SIGNALS)
        this.dropDominatedOtelKey(
          `${OTLP_EXPORTER_PREFIX}${signal}_ENDPOINT`,
          `the ${signal.toLowerCase()} signal`,
          "otelHeadersHelper",
          claims,
        );
      this.dropDominatedOtelKey(
        `${OTLP_EXPORTER_PREFIX}ENDPOINT`,
        "telemetry for any signal",
        "otelHeadersHelper",
        claims,
      );
      this.dropDominatedAntAlias(`${OTLP_EXPORTER_PREFIX}ENDPOINT`, "otelHeadersHelper", claims);
      this.dropDominatedBetaTracingEndpoint("otelHeadersHelper", claims);
    }
    this.applyOtelFamilyClaims(claims, claims, "managed settings");
  }
  applyOtelFamilyClaims(sourceClaims, claims, sourceLabel) {
    for (let [key, value] of sourceClaims) {
      let envKey = identityEnvMap(key);
      if (envKey === CLAUDE_CODE_ENABLE_TELEMETRY) {
        if (this.otelClaimInForce(key, value) && !isEnvTruthy(value))
          this.dropDominatedBetaTracingEndpoint(key, claims, sourceLabel);
        continue;
      }
      if (OTEL_EXPORTER_SELECTORS.has(envKey)) {
        if (this.otelClaimInForce(key, value) && lacksOtlpExporter(value))
          this.dropDominatedBetaTracingEndpoint(key, claims, sourceLabel);
        continue;
      }
      if (!envKey.startsWith(OTLP_EXPORTER_PREFIX)) continue;
      if (value.trim() === "") continue;
      if (!this.otelClaimInForce(key, value)) continue;
      let found = OTLP_SIGNALS.find((signal) => envKey.startsWith(`${OTLP_EXPORTER_PREFIX}${signal}_`));
      if (found) {
        let sliced = envKey.slice(`${OTLP_EXPORTER_PREFIX}${found}_`.length);
        let isLogsOrTraces = found === "TRACES" || found === "LOGS";
        if (OTLP_SECRET_SUFFIXES.has(sliced)) {
          this.dropDominatedOtelKey(
            `${OTLP_EXPORTER_PREFIX}${found}_ENDPOINT`,
            `the ${found.toLowerCase()} signal`,
            key,
            claims,
            sourceLabel,
          );
          if (isLogsOrTraces) this.dropDominatedBetaTracingEndpoint(key, claims, sourceLabel);
        } else if (sliced === "ENDPOINT" && isLogsOrTraces)
          this.dropDominatedBetaTracingEndpoint(key, claims, sourceLabel);
        continue;
      }
      let sliced = envKey.slice(OTLP_EXPORTER_PREFIX.length);
      let isSecret = OTLP_SECRET_SUFFIXES.has(sliced);
      let suffixes = isSecret ? [sliced, "ENDPOINT"] : [sliced];
      for (let suffix of suffixes)
        for (let signal of OTLP_SIGNALS)
          this.dropDominatedOtelKey(
            `${OTLP_EXPORTER_PREFIX}${signal}_${suffix}`,
            `the ${signal.toLowerCase()} signal`,
            key,
            claims,
            sourceLabel,
          );
      if (isSecret) {
        this.dropDominatedOtelKey(
          `${OTLP_EXPORTER_PREFIX}ENDPOINT`,
          "telemetry for any signal",
          key,
          claims,
          sourceLabel,
        );
        this.dropDominatedAntAlias(`${OTLP_EXPORTER_PREFIX}ENDPOINT`, key, claims, sourceLabel);
      }
      if (suffixes.includes("ENDPOINT")) this.dropDominatedBetaTracingEndpoint(key, claims, sourceLabel);
      this.dropDominatedAntAlias(envKey, key, claims, sourceLabel);
    }
  }
  resetSettingsIfUserSettingsFileMoved(settingsPath) {
    if (getSettingsFilePathForSource("userSettings") !== settingsPath) invalidateCommandNames();
  }
  applySafeConfigEnvironmentVariables() {
    this.getPreSettingsEnvSnapshot();
    this.providerStripContext = hostManagementFacts();
    let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
    let NODE_EXTRA_CA_CERTS = env.NODE_EXTRA_CA_CERTS;
    let CLAUDE_CODE_CERT_STORE = env.CLAUDE_CODE_CERT_STORE;
    let previousDisableLoopedCrossCertDrop = env.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP;
    let CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP = env.CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP;
    let NODE_OPTIONS = env.NODE_OPTIONS;
    let platformEnv = proxyEnvFingerprint();
    if (this.hostSpawnEnvKeys === undefined) {
      this.hostSpawnEnvKeys = this.providerStripContext.hostOrchestrated
        ? new Set(Object.keys(process.env).map((key) => key.toUpperCase()))
        : null;
      if (
        this.hostSpawnEnvKeys &&
        hasPossibleCredentialFromDescriptor("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR")
      )
        this.hostSpawnEnvKeys.add("CLAUDE_CODE_OAUTH_TOKEN");
      if (holdsDaemonForceColor()) this.hostSpawnEnvKeys?.delete("FORCE_COLOR");
    }
    this.settingsEnvForChildren = {};
    this.settingsEnvForChildrenFromRepository = new Map();
    Object.assign(process.env, this.takenFromToolServerLaunchEnv());
    this.appliedGlobalConfigEnv = this.filterSettingsEnv(this.getLegacyEnvMap(), "globalConfig");
    this.assignFromAboveTheRepository(this.appliedGlobalConfigEnv);
    for (let source of TELEMETRY_SETTING_SOURCES) {
      if (source === "policySettings") continue;
      if (!isSettingSourceEnabled(source)) continue;
      this.assignFromAboveTheRepository(this.filterSettingsEnv(getSettingsForSource(source)?.env, source));
    }
    computeRemoteSettingsEligibility();
    this.providerStripContext = {
      ...this.providerStripContext,
      hybridConnection: isHybridConnectionAllowed(),
    };
    this.assignFromAboveTheRepository(
      this.filterSettingsEnv(getSettingsForSource("policySettings")?.env, "policySettings"),
    );
    let claimedEnv = new Map();
    for (let enabledSource of getEnabledSettingSources()) {
      let filteredEnv = this.filterSettingsEnv(getSettingsForSource(enabledSource)?.env, enabledSource);
      for (let [key, value] of Object.entries(filteredEnv))
        claimedEnv.set(key.toUpperCase(), {
          key,
          value,
          source: enabledSource,
        });
    }
    for (let { key, value, source } of claimedEnv.values()) {
      if (!isProtectedEnvVar(key, value)) continue;
      if (isDangerousEnvVar(source)) {
        let restoreHostEnv = snapshotHostOwnedEnv(key);
        process.env[key] = value;
        restoreHostEnv();
      } else {
        process.env[key] = value;
        forgetHostEnvWrites(key);
      }
    }
    this.publishChildEnv();
    let currentWrapper = process.env[PROCESS_WRAPPER_ENV];
    if (!currentWrapper || currentWrapper === this.materializedProcessWrapper) {
      let userWrapperKey = isSettingSourceEnabled("userSettings")
        ? this.processWrapperKeyFrom("userSettings")
        : undefined;
      let wrapperKey = this.processWrapperKeyAbove() ?? (userWrapperKey === "" ? undefined : userWrapperKey);
      if (wrapperKey !== undefined) {
        process.env[PROCESS_WRAPPER_ENV] = wrapperKey;
        this.materializedProcessWrapper = wrapperKey;
      }
    }
    this.enforceManagedOtelFamilyDominance();
    this.resetSettingsIfUserSettingsFileMoved(settingsFilePathForSource);
    let extraCerts =
      env.NODE_EXTRA_CA_CERTS !== NODE_EXTRA_CA_CERTS ||
      env.CLAUDE_CODE_CERT_STORE !== CLAUDE_CODE_CERT_STORE ||
      env.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP !== previousDisableLoopedCrossCertDrop ||
      env.CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP !== CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP ||
      env.NODE_OPTIONS !== NODE_OPTIONS;
    if (extraCerts) clearCACertsCache();
    if ((extraCerts || proxyEnvFingerprint() !== platformEnv) && hasConfiguredGlobalAgents()) {
      clearProxyCache();
      configureGlobalAgents();
    }
  }
  applyConfigEnvironmentVariables() {
    this.getPreSettingsEnvSnapshot();
    this.providerStripContext = hostManagementFacts();
    this.settingsEnvForChildren = {};
    this.settingsEnvForChildrenFromRepository = new Map();
    let NODE_EXTRA_CA_CERTS = env.NODE_EXTRA_CA_CERTS;
    let CLAUDE_CODE_CERT_STORE = env.CLAUDE_CODE_CERT_STORE;
    let previousDisableLoopedCrossCertDrop = env.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP;
    let CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP = env.CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP;
    let NODE_OPTIONS = env.NODE_OPTIONS;
    let CLAUDE_CODE_CLIENT_CERT = env.CLAUDE_CODE_CLIENT_CERT;
    let CLAUDE_CODE_CLIENT_KEY = env.CLAUDE_CODE_CLIENT_KEY;
    this.legacyEnvMapAtLaunch ??= {
      ...getGlobalConfig().env,
    };
    Object.assign(process.env, this.takenFromToolServerLaunchEnv());
    this.appliedGlobalConfigEnv = this.filterSettingsEnv(this.getLegacyEnvMap(), "globalConfig");
    this.assignFromAboveTheRepository(this.appliedGlobalConfigEnv);
    this.fullPassDroppedGitKey = false;
    for (let source of getEnabledSettingSources()) {
      let filteredEnv = this.filterSettingsEnv(getSettingsForSource(source)?.env, source, () => {
        this.fullPassDroppedGitKey = true;
      });
      if (isDangerousEnvVar(source)) {
        let mapped = Object.keys(filteredEnv).map((key) => snapshotHostOwnedEnv(key));
        Object.assign(process.env, filteredEnv);
        for (let restoreHostEnv of mapped) restoreHostEnv();
      } else this.assignFromAboveTheRepository(filteredEnv);
    }
    this.publishChildEnv();
    this.enforceManagedOtelFamilyDominance();
    let clientCertsChanged =
      env.NODE_EXTRA_CA_CERTS !== NODE_EXTRA_CA_CERTS ||
      env.CLAUDE_CODE_CLIENT_CERT !== CLAUDE_CODE_CLIENT_CERT ||
      env.CLAUDE_CODE_CLIENT_KEY !== CLAUDE_CODE_CLIENT_KEY;
    if (
      env.NODE_EXTRA_CA_CERTS !== NODE_EXTRA_CA_CERTS ||
      env.CLAUDE_CODE_CERT_STORE !== CLAUDE_CODE_CERT_STORE ||
      env.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP !== previousDisableLoopedCrossCertDrop ||
      env.CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP !== CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP ||
      env.NODE_OPTIONS !== NODE_OPTIONS
    )
      clearCACertsCache();
    let { certPath, keyPath } = getLoadedMTLSPaths();
    let mtlsPathsChanged =
      (env.CLAUDE_CODE_CLIENT_CERT !== certPath || env.CLAUDE_CODE_CLIENT_KEY !== keyPath) &&
      (certPath !== undefined || keyPath !== undefined);
    if (!mtlsPathsChanged) clearMTLSCache();
    clearProxyCache();
    configureGlobalAgents();
    Promise.all([loadExtraCACerts(), loadMTLSClientMaterial()])
      .then(([extraCertsReloaded, mtlsMaterial]) => {
        if (mtlsPathsChanged && mtlsMaterial.readFailed) clearMTLSCache();
        if (clientCertsChanged || mtlsPathsChanged || extraCertsReloaded || mtlsMaterial.changed) {
          clearProxyCache();
          configureGlobalAgents();
        }
      })
      .catch(logError);
  }
}
//@ chunk-71parphm.js:42486-42517 placement
var managedEnvApplier; // deferred: uses ManagedEnvApplier of its import cycle while loading; runs once the cycle is complete
var preSettingsEnvLatch;
deferInit("chunk-71parphm.js:42486", () => {
  managedEnvApplier = new ManagedEnvApplier();
  preSettingsEnvLatch = retainCacheKey({
    clear: resetManagedEnvApplier,
  });
});
//@ chunk-71parphm.js:42517-42599 placement
function applySafeConfigEnvironmentVariables() {
  try {
    managedEnvApplier.applySafeConfigEnvironmentVariables();
  } finally {
    exitIfServeHelperMisconfigured();
  }
  noopEnvHook();
  emitCredentialChange();
}
//@ chunk-71parphm.js:42599-42676 placement
function applyConfigEnvironmentVariables() {
  try {
    managedEnvApplier.applyConfigEnvironmentVariables();
  } finally {
    exitIfServeHelperMisconfigured();
  }
  noopEnvHook();
  emitCredentialChange();
}
//@ chunk-71parphm.js:42676-42729 placement
function servedFolderEnvWasWithheld() {
  return managedEnvApplier.servedFolderEnvWasWithheld();
}
//@ chunk-71parphm.js:42729-42753 placement
function resetManagedEnvApplier() {
  managedEnvApplier.reset();
}
export {
  getPreSettingsEnvSnapshot,
  getLatchedPreSettingsEnvSnapshot,
  getAppliedGlobalConfigEnv,
  applyConfigEnvironmentVariables,
  applySafeConfigEnvironmentVariables,
  filterPolicyPredicateEnv,
  settingsEnvForHookChild,
  isSettingsSourcedEnvValue,
  isProjectScopeBlockedEnvVar,
  withLaunchValuesOfHybridConnection,
  getPreSettingsEnvHonoringLiveDeletions,
  filterEnvForPolicyPredicateMatch,
  getLegacyEnvMap,
  recordPersonsEnvValue,
  personsSettingsEnvKeeps,
  isServableEnvValue,
  PROJECT_LEVEL_SETTING_SOURCES,
  getEnvAboveProjectSettings,
  putBackUnsuppliedTelemetryEnv,
  servedFolderEnvWasWithheld,
  withoutInvalidSettingsEnv,
  purgeHostOwnedChromeVars,
  putBackTransport,
  launchViewAtClaim,
  resetPreSettingsEnvSnapshotForClaim,
  PROJECT_SCOPE_BLOCKED_ENV_VARS,
  setToolServerLaunchEnv,
};
