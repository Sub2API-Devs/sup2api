/**
 * utils/managedEnvApply.ts
 *
 * 2.1.316 新增：托管环境变量应用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q4qb1h08.js (49)
 * attribution: placement 49
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
import { PROCESS_WRAPPER_ENV_2 } from "./processWrapper.js";
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
import { wi } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { setHelperOutputOverride } from "./settings/policyHelper/helperRemote.js";
import {
  withEnvTake,
  setManagedOverrideProvider,
  forgetHostEnvWrites,
  snapshotHostOwnedEnv,
} from "./settings/managedSettingsFiles.js";
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
import { getGlobalConfig, PERSISTED_TRUST_IGNORED } from "./config.js";
import { applySafeConfigEnvironmentVariables_2 } from "./managedEnv.js";
import { hasDangerousEnvVars } from "../components/TrustDialog/utils.js";
import { getEnabledSettingSources, isSettingSourceEnabled } from "./settings/constants.js";
import { logForDebugging } from "./debug.js";
import { isEnvSettingOn } from "./settings/marketplaceSettingsAliases.js";
import { isHttpMcpServeInvocation } from "../entrypoints/mcpServeArgs.js";
import { invalidateCommandNames } from "./settings/commandSyncNames.js";
import { env } from "./env.js";
import { hasPossibleCredentialFromDescriptor } from "./authFileDescriptor.js";
import { clearCACertsCache, loadExtraCACerts } from "./caCerts.js";
import { hasConfiguredGlobalAgents, clearProxyCache, configureGlobalAgents } from "./proxy.js";
import { getLoadedMTLSPaths, clearMTLSCache, loadMTLSClientMaterial } from "./mtls.js";
import { logError } from "./log.js";
import { retainCacheKey } from "./memoize.js";
import { emitCredentialChange } from "./auth/credentialEpoch.js";

//@ chunk-q4qb1h08.js:11334-11486 placement
var P = Object.freeze({
  coworkCloud: false,
  managedByHost: false,
  managedByHostFlag: false,
  desktopHost: false,
  hostOrchestrated: false,
  storedLoginPinned: false,
  hybridConnection: false,
});
//@ chunk-q4qb1h08.js:11486-11804 placement
/**
 * 汇总当前环境的托管情况：云端协作托管设置、是否由宿主管理提供方（标记或认证变量）、桌面宿主、宿主编排（含 byoc）、固定存储登录、混合连接。
 */
function hostManagementFacts() {
  let e = isEnvTruthy(process.env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST);
  let n = isHostEntrypoint();
  let envClaudeCodeEnvironmentKind = process.env.CLAUDE_CODE_ENVIRONMENT_KIND;
  return {
    coworkCloud: hasManagedSettings(),
    managedByHost: e || !!process.env.CLAUDE_CODE_HOST_AUTH_ENV_VAR,
    managedByHostFlag: e,
    desktopHost: n,
    hostOrchestrated: n || envClaudeCodeEnvironmentKind === "byoc",
    storedLoginPinned: isStoredLoginPinned(),
    hybridConnection: isHybridConnectionAllowed(),
  };
}
//@ chunk-q4qb1h08.js:11804-11827 placement
function isHybridConnectionAllowed() {
  return false;
}
//@ chunk-q4qb1h08.js:11827-17123 placement
/**
 * 项目级设置不能设置的环境变量清单（宿主/会话控制、配置目录、临时目录、遥测与调试输出等），以及按前缀屏蔽的列表。
 */
var PROJECT_LEVEL_SETTING_SOURCES = new Set(["policySettings", "projectSettings", "localSettings"]);
var EXTRA_BLOCKED_ENV_VARS = [];
var EXTRA_BLOCKED_ENV_PREFIXES = [];
var BLOCKED_PREFIX_GROUPS = [];
var PROJECT_SCOPE_BLOCKED_ENV_VARS = new Set([
  PROCESS_WRAPPER_ENV_2,
  "CLAUDE_CODE_CUSTOM_OAUTH_URL",
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
  "CLAUDE_CODE_ARTIFACT_PRESENCE",
  "CLAUDE_CODE_ARTIFACT_OPEN_ACTION",
  "CLAUDE_CODE_ARTIFACT_REPL",
  "CLAUDE_CODE_ARTIFACT_PREVIEW_EMULATOR",
  "USER_TYPE",
  "CLAUDE_CODE_MESSAGING_SOCKET",
  "CLAUDE_CODE_MESSAGING_TOKEN",
  "CLAUDE_CODE_DISABLE_ADMIN_ENV_UNION",
  "CLAUDE_CODE_MANAGED_SETTINGS_PATH",
  "CLAUDE_CODE_TOASTY_THIMBLE",
  "CLAUDE_CODE_GENTLE_PARASOL",
  "CLAUDE_CODE_STREAMED_BUMBLEBEE_TEXT",
  "CLAUDE_CODE_LEGACY_BUNDLE",
  "CCR_ENABLE_BUNDLE",
  "CCR_FORCE_BUNDLE",
  ...BLOCKED_PREFIX_GROUPS.flatMap((e) => e.names),
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
  ...EXTRA_BLOCKED_ENV_VARS,
]);
var PROJECT_SCOPE_BLOCKED_PREFIXES = [
  "CLAUDE_AX_",
  ...BLOCKED_PREFIX_GROUPS.flatMap((e) => e.prefixes),
  ...EXTRA_BLOCKED_ENV_PREFIXES,
];
//@ chunk-q4qb1h08.js:17123-17210 placement
function isProjectScopeBlockedEnvVar(e) {
  let upper = e.toUpperCase();
  return (
    PROJECT_SCOPE_BLOCKED_ENV_VARS.has(upper) ||
    PROJECT_SCOPE_BLOCKED_PREFIXES.some((r) => upper.startsWith(r))
  );
}
//@ chunk-q4qb1h08.js:21865-21905 placement
/**
 * 判断某环境项的值是否允许下发（安全值或目录例外）。
 */
function isServableEnvValue(e, n) {
  return isSafeChromeEnvValue(e, n) || isCatalogDisabledByPolicy(e, n);
}
//@ chunk-q4qb1h08.js:21905-21964 placement
function purgeHostOwnedChromeVars() {
  for (let key of CHROME_ENV_VARS.keys()) delete process.env[key];
}
//@ chunk-q4qb1h08.js:21964-22069 placement
var USER_SCOPE_BLOCKED_ENV_VARS = new Set([
  "CLAUDE_CODE_PLUGIN_DIRS",
  "CLAUDE_CODE_PLUGIN_DIR_WATCH",
  "CLAUDE_CODE_PROCESS_WRAPPER",
]);
//@ chunk-q4qb1h08.js:22069-22200 placement
function stripHostOnlyEnv(e, n) {
  if (e === undefined || !isPersonalConfigRestricted() || (n !== "userSettings" && n !== "globalConfig"))
    return e;
  return wi(e, (r, E) => USER_SCOPE_BLOCKED_ENV_VARS.has(E.toUpperCase()));
}
//@ chunk-q4qb1h08.js:22200-22298 placement
function withoutRestrictedEnvKeys(e) {
  if (!e) return {};
  let n = {};
  for (let [key, value] of Object.entries(e)) if (!isRestrictedEnvKey(key, value)) n[key] = value;
  return n;
}
//@ chunk-q4qb1h08.js:22298-22348 placement
function getEnvAboveProjectSettings() {
  return managedEnvApplier.envAboveProjectSettings();
}
//@ chunk-q4qb1h08.js:22348-22399 placement
function getPreSettingsEnvSnapshot() {
  return managedEnvApplier.getPreSettingsEnvSnapshot();
}
//@ chunk-q4qb1h08.js:22399-22506 placement
function getPreSettingsEnvHonoringLiveDeletions() {
  let e = {
    ...getPreSettingsEnvSnapshot(),
  };
  for (let key of Object.keys(e)) if (process.env[key] === undefined) delete e[key];
  return e;
}
//@ chunk-q4qb1h08.js:22506-22563 placement
function isSettingsSourcedEnvValue(e, n) {
  return managedEnvApplier.isSettingsSourcedEnvValue(e, n);
}
//@ chunk-q4qb1h08.js:22563-22619 placement
function personsSettingsEnvKeeps(name, n) {
  return managedEnvApplier.personsSettingsEnvKeeps(name, n);
}
//@ chunk-q4qb1h08.js:22619-22675 placement
function putBackUnsuppliedTelemetryEnv() {
  return managedEnvApplier.putBackUnsuppliedTelemetryEnv();
}
//@ chunk-q4qb1h08.js:22675-22719 placement
function setToolServerLaunchEnv(e) {
  managedEnvApplier.setToolServerLaunchEnv(e);
}
//@ chunk-q4qb1h08.js:22719-22766 placement
function recordPersonsEnvValue(name, n) {
  managedEnvApplier.recordPersonsEnvValue(name, n);
}
//@ chunk-q4qb1h08.js:22766-22818 placement
function getLatchedPreSettingsEnvSnapshot() {
  return managedEnvApplier.peekPreSettingsEnvSnapshot();
}
//@ chunk-q4qb1h08.js:22818-22842 placement
function withLaunchValuesOfHybridConnection(env) {
  return env;
}
//@ chunk-q4qb1h08.js:22842-22884 placement
function getLegacyEnvMap() {
  return managedEnvApplier.getLegacyEnvMap();
}
//@ chunk-q4qb1h08.js:22884-22936 placement
function getAppliedGlobalConfigEnv() {
  return managedEnvApplier.getAppliedGlobalConfigEnv();
}
//@ chunk-q4qb1h08.js:22936-22944 placement
setHelperOutputOverride(getPreSettingsEnvSnapshot);
//@ chunk-q4qb1h08.js:22944-22984 placement
withEnvTake(() => managedEnvApplier.takeChildEnvFromRepository());
//@ chunk-q4qb1h08.js:22984-22992 placement
setPersonalConfigRestriction(getLatchedPreSettingsEnvSnapshot);
//@ chunk-q4qb1h08.js:22992-23031 placement = _temp7 (1)
setManagedOverrideProvider(() => getSettingsForSource("policySettings")?.env ?? {});
//@ chunk-q4qb1h08.js:23031-23037 placement
setEnvEntryProblemCheck(isSettingsSourcedEnvValue);
//@ chunk-q4qb1h08.js:23037-23092 placement
setRemoteSettingsProbes(
  (e) => managedEnvApplier.routeAfterVerdict(e),
  (e) => managedEnvApplier.launchNamed(e),
);
//@ chunk-q4qb1h08.js:23092-23204 placement
setClaimContext({
  env: () => managedEnvApplier.getHostLaunchEnv(),
  credential: () => managedEnvApplier.getLaunchCredential(),
  road: () => managedEnvApplier.getLaunchCredentialRoad(),
});
//@ chunk-q4qb1h08.js:23204-23263 placement
function resetPreSettingsEnvSnapshotForClaim(e, kept) {
  return managedEnvApplier.dropPreSettingsEnvSnapshot(e, kept);
}
//@ chunk-q4qb1h08.js:23263-23318 placement
function envKeyCase(e) {
  return getPlatform() === "windows" ? e.toUpperCase() : e;
}
//@ chunk-q4qb1h08.js:23318-23614 placement
function launchViewAtClaim(e, n, r) {
  if (e === undefined)
    return Object.freeze({
      ...process.env,
    });
  let E = new Set(n.map(envKeyCase));
  let s = new Map(Object.entries(e).map(([key, value]) => [envKeyCase(key), value]));
  let C = {};
  for (let key of Object.keys(process.env))
    if (E.has(envKeyCase(key))) C[key] = r?.[key] ?? process.env[key];
    else if (s.has(envKeyCase(key))) C[key] = s.get(envKeyCase(key));
  return Object.freeze(C);
}
//@ chunk-q4qb1h08.js:23614-23801 placement
function putBackTransport(e, n) {
  let filtered = Object.keys(process.env).filter((key) => n(key) && process.env[key] !== e[key]);
  for (let E of filtered)
    if (e[E] === undefined) delete process.env[E];
    else process.env[E] = e[E];
  return filtered.length > 0;
}
//@ chunk-q4qb1h08.js:23801-23894 placement
function filterPolicyPredicateEnv(env, n = "policySettings") {
  return managedEnvApplier.filterPolicyPredicateEnv(env, n, {
    forPolicyMatch: false,
  });
}
//@ chunk-q4qb1h08.js:23894-23988 placement
function filterEnvForPolicyPredicateMatch(env, n = "policySettings") {
  return managedEnvApplier.filterPolicyPredicateEnv(env, n, {
    forPolicyMatch: true,
  });
}
//@ chunk-q4qb1h08.js:23988-24046 placement
function withoutInvalidSettingsEnv(env, n) {
  return managedEnvApplier.withoutInvalidSettingsEnv(env, n);
}
//@ chunk-q4qb1h08.js:24046-24083 placement
function settingsEnvForHookChild(e, n) {
  return withoutRestrictedEnvKeys(withoutInvalidSettingsEnv(e, n));
}
//@ chunk-q4qb1h08.js:24083-24363 placement
var TELEMETRY_SETTING_SOURCES = ["userSettings", "flagSettings", "policySettings"];
var OTLP_SIGNALS = ["TRACES", "METRICS", "LOGS", "PROFILES"];
var OTLP_EXPORTER_PREFIX = OTEL_EXPORTER_OTLP;
var OTLP_SECRET_SUFFIXES = new Set(["HEADERS", "CLIENT_KEY", "CLIENT_CERTIFICATE"]);
var OTEL_EXPORTER_SELECTORS = new Set(["OTEL_LOGS_EXPORTER", "OTEL_TRACES_EXPORTER"]);
var CLAUDE_CODE_ENABLE_TELEMETRY = "CLAUDE_CODE_ENABLE_TELEMETRY";
var BETA_TRACING_ENDPOINT = "BETA_TRACING_ENDPOINT";
//@ chunk-q4qb1h08.js:24363-24431 placement
var OTEL_ENDPOINT_ENV_VARS = new Set([
  `${OTEL_EXPORTER_OTLP}ENDPOINT`,
  `${OTEL_EXPORTER_OTLP}HEADERS`,
  `${OTEL_EXPORTER_OTLP}PROTOCOL`,
]);
//@ chunk-q4qb1h08.js:24431-24454 placement
function identityEnvMap(hostSpawnEnvKey) {
  return hostSpawnEnvKey;
}
//@ chunk-q4qb1h08.js:24454-24525 placement
function lacksOtlpExporter(e) {
  return !e
    .split(",")
    .map((n) => n.trim())
    .includes("otlp");
}
//@ chunk-q4qb1h08.js:24525-24580 placement
function envKeyCaseUpper(e) {
  return getPlatform() === "windows" ? e.toUpperCase() : e;
}
//@ chunk-q4qb1h08.js:24580-24709 placement
function pickEnvKeys(e, n) {
  let r = {};
  for (let [key, value] of Object.entries(e ?? {}))
    if (n.includes(key.toUpperCase()) && value !== undefined) r[key] = String(value);
  return r;
}
//@ chunk-q4qb1h08.js:24709-41306 placement
/**
 * 应用托管/项目设置中的环境变量：按作用域过滤被阻止变量、剥离 provider 相关变量并告警。
 */
class ManagedEnvApplier {
  providerStripContext = P;
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
    this.preSettingsEnvSnapshot ??= this.latchPreSettingsEnvSnapshot({
      ...process.env,
    });
    return this.preSettingsEnvSnapshot;
  }
  latchPreSettingsEnvSnapshot(e) {
    let launchNamesBeforeClaim = this.launchNamesBeforeClaim;
    this.userTierNamesInSnapshot = new Set(
      launchNamesBeforeClaim === undefined
        ? []
        : Object.keys(e)
            .map((key) => key.toUpperCase())
            .filter((E) => this.userTierNames.has(E) && !launchNamesBeforeClaim.has(E)),
    );
    let claimLaunchEnv = this.claimLaunchEnv ?? e;
    this.launchCredential = hasManagedSettings() ? claimedCredential_2(claimLaunchEnv) : null;
    this.launchCredentialRoad = hasManagedSettings()
      ? credentialRoad(claimLaunchEnv, this.launchCredential)
      : "none";
    return Object.freeze(e);
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
    let n = {};
    for (let [key, value] of Object.entries(preSettingsEnvSnapshot))
      if (!this.userTierNamesInSnapshot.has(key.toUpperCase())) n[key] = value;
    return {
      ...n,
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
  dropPreSettingsEnvSnapshot(e, n) {
    let preSettingsEnvSnapshot = this.preSettingsEnvSnapshot;
    this.preSettingsEnvSnapshot = undefined;
    this.launchCredential = undefined;
    this.claimLaunchEnv = undefined;
    this.legacyEnvMapAtLaunch = undefined;
    if (e === undefined) return false;
    let E = [...e];
    if (preSettingsEnvSnapshot)
      this.launchNamesBeforeClaim = new Set(
        [...Object.keys(preSettingsEnvSnapshot), ...E].map((_) => _.toUpperCase()),
      );
    if (!hasManagedSettings()) return false;
    let s = launchViewAtClaim(preSettingsEnvSnapshot, E, n);
    this.claimLaunchEnv = s;
    let C = preSettingsEnvSnapshot !== undefined && putBackTransport(s, isNetworkEnvVar);
    this.getPreSettingsEnvSnapshot();
    return C;
  }
  reset() {
    this.providerStripContext = P;
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
  strippedSettingsEnv(e, n, r, E) {
    let s = applySafeConfigEnvironmentVariables_2(
      filterHostManagedEnv(
        withoutRestrictedEnvKeys(
          hasDangerousEnvVars(
            stripProjectBlockedEnv(
              dropIgnoredEnvEntries(
                stripHostOnlyEnv(this.asFromAFolderNobodyTrusted(e, n, E !== undefined), n),
                n,
                E && this.invalidEnvKeyWarned,
              ),
              n,
              E && this.projectScopeDropWarned,
              () => this.envAboveProjectSettings(),
              E?.onGitKeyDropped,
            ),
          ),
        ),
        n,
        r,
        E && this.hostManagedDropWarned,
      ),
      n,
      this.hostSpawnEnvKeys,
      r.desktopHost,
      E && this.hostSpawnEnvDropWarned,
    );
    if (E)
      return applyDirectEnvKeys(
        s,
        this.settingsEnvForChildren,
        this.settingsEnvForChildrenFromRepository,
        isDangerousEnvVar(n),
      );
    let C = {};
    let _ = applyDirectEnvKeys(s, C);
    for (let [key, value] of Object.entries(C)) if (isColorEnvVar(key.toUpperCase())) _[key] = value;
    return _;
  }
  keptSettingsEnv(e, n, r, E) {
    return this.withholdsEnvFrom(n, r) ? {} : this.strippedSettingsEnv(e, n, r, E);
  }
  launchEnvUnlatched() {
    return this.claimLaunchEnv ?? this.peekPreSettingsEnvSnapshot() ?? process.env;
  }
  launchNamed(e) {
    let n = new Map(
      Object.entries(pickEnvKeys(this.launchEnvUnlatched(), e)).map(([key, value]) => [
        envKeyCaseUpper(key),
        value,
      ]),
    );
    return (r) => n.get(envKeyCaseUpper(r));
  }
  routeAfterVerdict(e) {
    let n = this.providerStripContext === P ? hostManagementFacts() : this.providerStripContext;
    let r = [
      pickEnvKeys(this.launchEnvUnlatched(), e),
      this.keptSettingsEnv(pickEnvKeys(this.getLegacyEnvMap(), e), "globalConfig", n, undefined),
      ...getEnabledSettingSources()
        .filter((s) => s !== "policySettings" && !isDangerousEnvVar(s))
        .map((s) => this.keptSettingsEnv(pickEnvKeys(getSettingsForSource(s)?.env, e), s, n, undefined)),
      this.strippedSettingsEnv(pickEnvKeys(getMachineAdminPolicyEnv(), e), "policySettings", n, undefined),
    ];
    let E = new Map(r.flatMap((s) => Object.entries(s).map(([key, value]) => [envKeyCaseUpper(key), value])));
    return (s) => E.get(envKeyCaseUpper(s));
  }
  setToolServerLaunchEnv(toolServerLaunchEnv) {
    this.toolServerLaunchEnv = toolServerLaunchEnv;
  }
  assignFromAboveTheRepository(e) {
    Object.assign(process.env, e);
    for (let key of Object.keys(e)) forgetHostEnvWrites(key);
  }
  takeChildEnvFromRepository() {
    let publishedChildEnv = this.publishedChildEnv;
    let n = [];
    for (let [r, E] of this.publishedChildEnvFromRepository) {
      let s = publishedChildEnv[r];
      if (s === undefined) continue;
      n.push([r, s]);
      if (E === undefined) delete publishedChildEnv[r];
      else publishedChildEnv[r] = E;
    }
    if (n.length === 0) return;
    return () => {
      for (let [r, E] of n) publishedChildEnv[r] = E;
    };
  }
  publishChildEnv() {
    this.publishedChildEnv = this.settingsEnvForChildren;
    this.publishedChildEnvFromRepository = this.settingsEnvForChildrenFromRepository;
    setSettingsEnvForChildren(this.settingsEnvForChildren);
  }
  takenFromToolServerLaunchEnv() {
    let e = {};
    for (let [key, value] of Object.entries(
      withoutRestrictedEnvKeys(
        dropIgnoredEnvEntries(this.toolServerLaunchEnv, "globalConfig", this.invalidEnvKeyWarned),
      ),
    ))
      if (!HOST_ONLY_ENV_VARS.has(key.toUpperCase())) e[key] = value;
    return this.filterSettingsEnv(applyDirectEnvKeys(e, this.settingsEnvForChildren), "globalConfig");
  }
  filterSettingsEnv(e, n, onGitKeyDropped) {
    let E = this.keptSettingsEnv(e, n, this.providerStripContext, {
      onGitKeyDropped,
    });
    for (let [key, value] of Object.entries(E)) this.recordOfferedEnvValue(key, value);
    if (n === "globalConfig" || n === "userSettings")
      for (let key of Object.keys(E)) this.userTierNames.add(key.toUpperCase());
    return E;
  }
  withoutInvalidSettingsEnv(e, n) {
    return dropIgnoredEnvEntries(e, n, this.invalidEnvKeyWarned);
  }
  putBackUnsuppliedTelemetryEnv() {
    let preSettingsEnvSnapshot = this.preSettingsEnvSnapshot;
    if (preSettingsEnvSnapshot === undefined || this.appliedGlobalConfigEnv === undefined) return false;
    let n = false;
    let filtered = Object.keys(process.env).filter((key) => {
      let upper = key.toUpperCase();
      let C = process.env[key];
      return (
        C !== undefined &&
        C !== preSettingsEnvSnapshot[key] &&
        (OTEL_EXPORTER_PREFIXES.some((_) => upper.startsWith(_)) ||
          OTEL_DETAIL_VARS.includes(upper) ||
          OTEL_ENV_VAR_SET.has(upper)) &&
        this.settingsOfferedEnvValues.get(upper)?.has(C.trim()) === true &&
        this.personsWrittenEnvValues.get(envKeyCase(key)) !== C.trim()
      );
    });
    if (filtered.length > 0) {
      let E = new Map();
      for (let C of [
        this.toolServerLaunchEnv,
        this.appliedGlobalConfigEnv ?? {},
        ...getEnabledSettingSources().map((_) =>
          this.keptSettingsEnv(getSettingsForSource(_)?.env, _, this.providerStripContext, undefined),
        ),
      ])
        for (let [key, value] of Object.entries(C)) E.set(envKeyCase(key), value.trim());
      let filtered_2 = filtered.filter((C) => E.get(envKeyCase(C)) !== process.env[C]?.trim());
      n = putBackTransport(preSettingsEnvSnapshot, (C) => filtered_2.includes(C));
      if (n)
        logForDebugging(
          `Telemetry environment variables put back to their startup values, or removed, because no settings source still sets their current value: ${filtered_2.map(escapeForDisplay).join(", ")}`,
        );
    }
    this.enforceManagedOtelFamilyDominance();
    return n;
  }
  isSettingsSourcedEnvValue(e, n) {
    let trimmed = n.trim();
    return (
      this.settingsOfferedEnvValues.get(e.toUpperCase())?.has(trimmed) === true ||
      this.personsWrittenEnvValues.get(envKeyCase(e)) === trimmed
    );
  }
  recordPersonsEnvValue(e, n) {
    if (n === undefined) this.personsWrittenEnvValues.delete(envKeyCase(e));
    else this.personsWrittenEnvValues.set(envKeyCase(e), n.trim());
  }
  recordOfferedEnvValue(e, n) {
    let upper = e.toUpperCase();
    let trimmed = n.trim();
    let s = this.settingsOfferedEnvValues.get(upper);
    if (s) s.add(trimmed);
    else this.settingsOfferedEnvValues.set(upper, new Set([trimmed]));
  }
  personsSettingsEnvKeeps(e, n) {
    let r = this.providerStripContext === P ? hostManagementFacts() : this.providerStripContext;
    let enabledSettingSources = getEnabledSettingSources();
    let sliced = enabledSettingSources.slice(enabledSettingSources.indexOf("userSettings") + 1);
    let C = (env, a) => Object.keys(this.keptSettingsEnv(env, a, r, undefined));
    return (
      enabledSettingSources.includes("userSettings") &&
      C(
        {
          [e]: n,
        },
        "userSettings",
      ).includes(e) &&
      !sliced.some((_) => C(getSettingsForSource(_)?.env, _).some((a) => envKeyCase(a) === envKeyCase(e))) &&
      !this.otelDominates(e) &&
      !(
        n === "" &&
        envKeyCase(e) === envKeyCase(PROCESS_WRAPPER_ENV_2) &&
        this.processWrapperKeyAbove() !== undefined
      )
    );
  }
  otelDominates(e) {
    let n = new Set();
    this.otelDominatedAsked = n;
    try {
      this.enforceManagedOtelFamilyDominance();
    } finally {
      this.otelDominatedAsked = undefined;
    }
    return n.has(e.toUpperCase());
  }
  otelClaimInForce(e, n) {
    return this.otelDominatedAsked !== undefined || process.env[e] === n;
  }
  processWrapperKeyAbove() {
    return [this.processWrapperKeyFrom("policySettings"), this.processWrapperKeyFrom("flagSettings")].find(
      (e) => typeof e === "string" && e !== "",
    );
  }
  filterPolicyPredicateEnv(e, n, { forPolicyMatch }) {
    if (!forPolicyMatch && this.withholdsEnvFrom(n)) return {};
    let E = applySafeConfigEnvironmentVariables_2(
      filterHostManagedEnv(
        withoutRestrictedEnvKeys(
          hasDangerousEnvVars(
            stripProjectBlockedEnv(
              dropIgnoredEnvEntries(
                forPolicyMatch ? e : this.asFromAFolderNobodyTrusted(e, n, false),
                n,
                this.invalidEnvKeyWarned,
              ),
              n,
              this.projectScopeDropWarned,
              () => this.envAboveProjectSettings(),
            ),
          ),
        ),
        n,
        this.providerStripContext,
        this.hostManagedDropWarned,
      ),
      n,
      this.hostSpawnEnvKeys,
      this.providerStripContext.desktopHost,
    );
    let s = {};
    for (let [key, value] of Object.entries(E)) {
      let upper = key.toUpperCase();
      if (isColorEnvVar(upper)) continue;
      if (!forPolicyMatch && isServeBlockedEnv(key, value)) continue;
      s[key] = value;
    }
    return s;
  }
  withholdsEnvFrom(e, n = this.providerStripContext) {
    return n.storedLoginPinned && isSettingsTierWithheld(e);
  }
  asFromAFolderNobodyTrusted(e, n, r) {
    if (e === undefined || !isAttachServeRepoScopedSourceOrNonInteractive(n)) return e;
    let E = isAttachServeRepoScopedSource(n);
    let s = {};
    let C = [];
    for (let [key, value] of Object.entries(e)) {
      let upper = key.toUpperCase();
      if (
        typeof value === "string" &&
        (isEnvSettingOn(key, value) || (!E && isServableEnvValue(upper, value)))
      )
        s[key] = value;
      else if (r && E) this.servedFolderEnvWithheld = true;
      else if (r && !this.untrustedFolderDropWarned.has(`${n}:${key}`)) {
        this.untrustedFolderDropWarned.add(`${n}:${key}`);
        C.push(describeEnvEntryName(key));
      }
    }
    if (C.length > 0)
      logForDebugging(
        `Ignoring ${C.join(", ")} in the env block of ${n === "localSettings" ? ".claude/settings.local.json" : ".claude/settings.json"}: ${PERSISTED_TRUST_IGNORED}, and this session cannot show a trust dialog, so this folder's settings files may set only a short list of variables, each to certain values only, such as DISABLE_TELEMETRY=1. The repository's author chose the ignored values, not you. If your setup needs an ignored variable, set it yourself in user or managed settings, or in the environment that Claude Code is started with. On a self-hosted runner, user settings are settings.json in the runner host's config directory (SELF_HOSTED_RUNNER_HOST_CONFIG_DIR): restart the runner afterwards.`,
        {
          level: "warn",
        },
      );
    return s;
  }
  processWrapperKeyFrom(e) {
    return this.withholdsEnvFrom(e) ||
      isHttpMcpServeInvocation() ||
      (e === "userSettings" && isPersonalConfigRestricted())
      ? undefined
      : getSettingsForSource(e)?.processWrapper;
  }
  dropDominatedOtelKey(e, n, r, E, s = "managed settings") {
    let otelDominatedAsked = this.otelDominatedAsked;
    if (otelDominatedAsked !== undefined) {
      if (!(E.has(e) && E.get(e) === process.env[e]) && !this.hostSpawnEnvKeys?.has(e.toUpperCase()))
        otelDominatedAsked.add(e.toUpperCase());
      return;
    }
    if (E.get(e) === process.env[e]) return;
    if (this.hostSpawnEnvKeys?.has(e.toUpperCase())) return;
    if (process.env[e] === undefined) return;
    if (!this.otelDominanceDropWarned.has(e)) {
      this.otelDominanceDropWarned.add(e);
      logForDebugging(
        `Dropping ${escapeForDisplay(e)}: ${escapeForDisplay(r)} is claimed by ${s}, so lower-trust scopes cannot redirect ${n}`,
        {
          level: "warn",
        },
      );
    }
    delete process.env[e];
  }
  dropDominatedAntAlias(e, n, r, E = "managed settings") {
    return;
  }
  dropDominatedBetaTracingEndpoint(e, n, r = "managed settings") {
    this.dropDominatedOtelKey(
      BETA_TRACING_ENDPOINT,
      "the logs and traces signals through detailed beta tracing",
      e,
      n,
      r,
    );
  }
  hostSpawnOtelClaims() {
    let e = new Map();
    let hostSpawnEnvKeys = this.hostSpawnEnvKeys;
    if (!hostSpawnEnvKeys) return e;
    let any = [...hostSpawnEnvKeys].some((hostSpawnEnvKey) => {
      let s = identityEnvMap(hostSpawnEnvKey);
      return (
        ((s.startsWith(OTLP_EXPORTER_PREFIX) && s.endsWith("_ENDPOINT")) || s === BETA_TRACING_ENDPOINT) &&
        (process.env[hostSpawnEnvKey] ?? "").trim() !== ""
      );
    });
    for (let hostSpawnEnvKey of hostSpawnEnvKeys) {
      let s = identityEnvMap(hostSpawnEnvKey);
      let C = OTEL_EXPORTER_SELECTORS.has(s) || s === CLAUDE_CODE_ENABLE_TELEMETRY;
      let _ = any && s.startsWith(OTLP_EXPORTER_PREFIX);
      if (!C && !_) continue;
      let a = process.env[hostSpawnEnvKey];
      if (a !== undefined) e.set(hostSpawnEnvKey, a);
    }
    return e;
  }
  enforceManagedOtelFamilyDominance() {
    let settingsForSource = getSettingsForSource("policySettings");
    let env = settingsForSource?.env;
    let r = (settingsForSource?.otelHeadersHelper ?? "").trim() !== "";
    let E = new Map();
    for (let [key, value] of Object.entries(env ?? {})) {
      let upper = key.toUpperCase();
      if (!E.has(upper) || key === upper) E.set(upper, value);
    }
    this.applyOtelFamilyClaims(this.hostSpawnOtelClaims(), E, "the host spawn env");
    if (!env && !r) return;
    if (r) {
      for (let s of OTLP_SIGNALS)
        this.dropDominatedOtelKey(
          `${OTLP_EXPORTER_PREFIX}${s}_ENDPOINT`,
          `the ${s.toLowerCase()} signal`,
          "otelHeadersHelper",
          E,
        );
      this.dropDominatedOtelKey(
        `${OTLP_EXPORTER_PREFIX}ENDPOINT`,
        "telemetry for any signal",
        "otelHeadersHelper",
        E,
      );
      this.dropDominatedAntAlias(`${OTLP_EXPORTER_PREFIX}ENDPOINT`, "otelHeadersHelper", E);
      this.dropDominatedBetaTracingEndpoint("otelHeadersHelper", E);
    }
    this.applyOtelFamilyClaims(E, E, "managed settings");
  }
  applyOtelFamilyClaims(e, n, r) {
    for (let [E, s] of e) {
      let C = identityEnvMap(E);
      if (C === CLAUDE_CODE_ENABLE_TELEMETRY) {
        if (this.otelClaimInForce(E, s) && !isEnvTruthy(s)) this.dropDominatedBetaTracingEndpoint(E, n, r);
        continue;
      }
      if (OTEL_EXPORTER_SELECTORS.has(C)) {
        if (this.otelClaimInForce(E, s) && lacksOtlpExporter(s))
          this.dropDominatedBetaTracingEndpoint(E, n, r);
        continue;
      }
      if (!C.startsWith(OTLP_EXPORTER_PREFIX)) continue;
      if (s.trim() === "") continue;
      if (!this.otelClaimInForce(E, s)) continue;
      let found = OTLP_SIGNALS.find((S) => C.startsWith(`${OTLP_EXPORTER_PREFIX}${S}_`));
      if (found) {
        let sliced = C.slice(`${OTLP_EXPORTER_PREFIX}${found}_`.length);
        let R = found === "TRACES" || found === "LOGS";
        if (OTLP_SECRET_SUFFIXES.has(sliced)) {
          this.dropDominatedOtelKey(
            `${OTLP_EXPORTER_PREFIX}${found}_ENDPOINT`,
            `the ${found.toLowerCase()} signal`,
            E,
            n,
            r,
          );
          if (R) this.dropDominatedBetaTracingEndpoint(E, n, r);
        } else if (sliced === "ENDPOINT" && R) this.dropDominatedBetaTracingEndpoint(E, n, r);
        continue;
      }
      let sliced = C.slice(OTLP_EXPORTER_PREFIX.length);
      let O = OTLP_SECRET_SUFFIXES.has(sliced);
      let D = O ? [sliced, "ENDPOINT"] : [sliced];
      for (let S of D)
        for (let R of OTLP_SIGNALS)
          this.dropDominatedOtelKey(
            `${OTLP_EXPORTER_PREFIX}${R}_${S}`,
            `the ${R.toLowerCase()} signal`,
            E,
            n,
            r,
          );
      if (O) {
        this.dropDominatedOtelKey(`${OTLP_EXPORTER_PREFIX}ENDPOINT`, "telemetry for any signal", E, n, r);
        this.dropDominatedAntAlias(`${OTLP_EXPORTER_PREFIX}ENDPOINT`, E, n, r);
      }
      if (D.includes("ENDPOINT")) this.dropDominatedBetaTracingEndpoint(E, n, r);
      this.dropDominatedAntAlias(C, E, n, r);
    }
  }
  resetSettingsIfUserSettingsFileMoved(e) {
    if (getSettingsFilePathForSource("userSettings") !== e) invalidateCommandNames();
  }
  applySafeConfigEnvironmentVariables() {
    this.getPreSettingsEnvSnapshot();
    this.providerStripContext = hostManagementFacts();
    let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
    let NODE_EXTRA_CA_CERTS = env.NODE_EXTRA_CA_CERTS;
    let CLAUDE_CODE_CERT_STORE = env.CLAUDE_CODE_CERT_STORE;
    let E = env.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP;
    let CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP = env.CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP;
    let NODE_OPTIONS = env.NODE_OPTIONS;
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
    for (let O of TELEMETRY_SETTING_SOURCES) {
      if (O === "policySettings") continue;
      if (!isSettingSourceEnabled(O)) continue;
      this.assignFromAboveTheRepository(this.filterSettingsEnv(getSettingsForSource(O)?.env, O));
    }
    computeRemoteSettingsEligibility();
    this.providerStripContext = {
      ...this.providerStripContext,
      hybridConnection: isHybridConnectionAllowed(),
    };
    this.assignFromAboveTheRepository(
      this.filterSettingsEnv(getSettingsForSource("policySettings")?.env, "policySettings"),
    );
    let _ = new Map();
    for (let O of getEnabledSettingSources()) {
      let D = this.filterSettingsEnv(getSettingsForSource(O)?.env, O);
      for (let [key, value] of Object.entries(D))
        _.set(key.toUpperCase(), {
          key,
          value,
          source: O,
        });
    }
    for (let { key, value: D, source } of _.values()) {
      if (!isProtectedEnvVar(key, D)) continue;
      if (isDangerousEnvVar(source)) {
        let R = snapshotHostOwnedEnv(key);
        process.env[key] = D;
        R();
      } else {
        process.env[key] = D;
        forgetHostEnvWrites(key);
      }
    }
    this.publishChildEnv();
    let a = process.env[PROCESS_WRAPPER_ENV_2];
    if (!a || a === this.materializedProcessWrapper) {
      let O = isSettingSourceEnabled("userSettings") ? this.processWrapperKeyFrom("userSettings") : undefined;
      let D = this.processWrapperKeyAbove() ?? (O === "" ? undefined : O);
      if (D !== undefined) {
        process.env[PROCESS_WRAPPER_ENV_2] = D;
        this.materializedProcessWrapper = D;
      }
    }
    this.enforceManagedOtelFamilyDominance();
    this.resetSettingsIfUserSettingsFileMoved(settingsFilePathForSource);
    if (
      env.NODE_EXTRA_CA_CERTS !== NODE_EXTRA_CA_CERTS ||
      env.CLAUDE_CODE_CERT_STORE !== CLAUDE_CODE_CERT_STORE ||
      env.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP !== E ||
      env.CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP !== CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP ||
      env.NODE_OPTIONS !== NODE_OPTIONS
    ) {
      clearCACertsCache();
      if (hasConfiguredGlobalAgents()) {
        clearProxyCache();
        configureGlobalAgents();
      }
    }
  }
  applyConfigEnvironmentVariables() {
    this.getPreSettingsEnvSnapshot();
    this.providerStripContext = hostManagementFacts();
    this.settingsEnvForChildren = {};
    this.settingsEnvForChildrenFromRepository = new Map();
    let NODE_EXTRA_CA_CERTS = env.NODE_EXTRA_CA_CERTS;
    let CLAUDE_CODE_CERT_STORE = env.CLAUDE_CODE_CERT_STORE;
    let r = env.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP;
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
    for (let R of getEnabledSettingSources()) {
      let f = this.filterSettingsEnv(getSettingsForSource(R)?.env, R, () => {
        this.fullPassDroppedGitKey = true;
      });
      if (isDangerousEnvVar(R)) {
        let mapped = Object.keys(f).map((key) => snapshotHostOwnedEnv(key));
        Object.assign(process.env, f);
        for (let b of mapped) b();
      } else this.assignFromAboveTheRepository(f);
    }
    this.publishChildEnv();
    this.enforceManagedOtelFamilyDominance();
    let a =
      env.NODE_EXTRA_CA_CERTS !== NODE_EXTRA_CA_CERTS ||
      env.CLAUDE_CODE_CLIENT_CERT !== CLAUDE_CODE_CLIENT_CERT ||
      env.CLAUDE_CODE_CLIENT_KEY !== CLAUDE_CODE_CLIENT_KEY;
    if (
      env.NODE_EXTRA_CA_CERTS !== NODE_EXTRA_CA_CERTS ||
      env.CLAUDE_CODE_CERT_STORE !== CLAUDE_CODE_CERT_STORE ||
      env.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP !== r ||
      env.CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP !== CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP ||
      env.NODE_OPTIONS !== NODE_OPTIONS
    )
      clearCACertsCache();
    let { certPath, keyPath } = getLoadedMTLSPaths();
    let S =
      (env.CLAUDE_CODE_CLIENT_CERT !== certPath || env.CLAUDE_CODE_CLIENT_KEY !== keyPath) &&
      (certPath !== undefined || keyPath !== undefined);
    if (!S) clearMTLSCache();
    clearProxyCache();
    configureGlobalAgents();
    Promise.all([loadExtraCACerts(), loadMTLSClientMaterial()])
      .then(([R, f]) => {
        if (S && f.readFailed) clearMTLSCache();
        if (a || S || R || f.changed) {
          clearProxyCache();
          configureGlobalAgents();
        }
      })
      .catch(logError);
  }
}
//@ chunk-q4qb1h08.js:41306-41337 placement
var managedEnvApplier = new ManagedEnvApplier();
var preSettingsEnvLatch = retainCacheKey({
  clear: resetManagedEnvApplier,
});
//@ chunk-q4qb1h08.js:41337-41419 placement
function applySafeConfigEnvironmentVariables() {
  try {
    managedEnvApplier.applySafeConfigEnvironmentVariables();
  } finally {
    exitIfServeHelperMisconfigured();
  }
  noopEnvHook();
  emitCredentialChange();
}
//@ chunk-q4qb1h08.js:41419-41496 placement
function applyConfigEnvironmentVariables() {
  try {
    managedEnvApplier.applyConfigEnvironmentVariables();
  } finally {
    exitIfServeHelperMisconfigured();
  }
  noopEnvHook();
  emitCredentialChange();
}
//@ chunk-q4qb1h08.js:41496-41549 placement
function servedFolderEnvWasWithheld() {
  return managedEnvApplier.servedFolderEnvWasWithheld();
}
//@ chunk-q4qb1h08.js:41549-41573 placement
function resetManagedEnvApplier() {
  managedEnvApplier.reset();
}
export {
  getLatchedPreSettingsEnvSnapshot,
  getAppliedGlobalConfigEnv,
  getPreSettingsEnvSnapshot,
  filterEnvForPolicyPredicateMatch,
  getLegacyEnvMap,
  isSettingsSourcedEnvValue,
  applyConfigEnvironmentVariables,
  applySafeConfigEnvironmentVariables,
  filterPolicyPredicateEnv,
  withLaunchValuesOfHybridConnection,
  settingsEnvForHookChild,
  putBackUnsuppliedTelemetryEnv,
  getPreSettingsEnvHonoringLiveDeletions,
  setToolServerLaunchEnv,
  isProjectScopeBlockedEnvVar,
  recordPersonsEnvValue,
  personsSettingsEnvKeeps,
  servedFolderEnvWasWithheld,
  PROJECT_SCOPE_BLOCKED_ENV_VARS,
  getEnvAboveProjectSettings,
  isServableEnvValue,
  PROJECT_LEVEL_SETTING_SOURCES,
  purgeHostOwnedChromeVars,
  putBackTransport,
  launchViewAtClaim,
  resetPreSettingsEnvSnapshotForClaim,
  withoutInvalidSettingsEnv,
};
