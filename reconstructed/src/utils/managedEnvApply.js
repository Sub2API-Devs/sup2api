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
  Vso,
  zso,
  exitIfServeHelperMisconfigured,
} from "../cli/headlessCloud/attachServe.js";
import { PROCESS_WRAPPER_ENV } from "./processWrapper.js";
import { HIt, setSettingsEnvForChildren, holdsDaemonForceColor } from "./subprocessEnv.js";
import {
  Q_r,
  OTEL_ENV_VARS,
  OTEL_EXPORTER_OTLP,
  zps,
  isDangerousEnvVar,
  rao,
  X_r,
  isProtectedEnvVar,
} from "./managedEnvConstants.js";
import {
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
} from "./managedEnvSafety.js";
import { isPersonalConfigRestricted, c_i } from "./personalConfigRestriction.js";
import { wi } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { txi } from "./settings/policyHelper/helperRemote.js";
import { MRi, DRi, Eus, snapshotHostOwnedEnv } from "./settings/managedSettingsFiles.js";
import {
  getSettingsForSource,
  getMachineAdminPolicyEnv,
  isSettingsTierWithheld,
  getSettingsFilePathForSource,
} from "./settings/settings.js";
import { J, escapeForDisplay, describeEnvEntryName } from "./envValidation.js";
import { r_i, computeRemoteSettingsEligibility } from "../services/cloudSessions/eligibility.js";
import { q_i, claimedCredential, credentialRoad } from "../entrypoints/warmSpare/claimCredentials.js";
import { getPlatform } from "./platform.js";
import { getGlobalConfig, PERSISTED_TRUST_IGNORED } from "./config.js";
import { applySafeConfigEnvironmentVariables_2 } from "./managedEnv.js";
import { hasDangerousEnvVars } from "../components/TrustDialog/utils.js";
import { getEnabledSettingSources, isSettingSourceEnabled } from "./settings/constants.js";
import { logForDebugging } from "./debug.js";
import { gPi } from "./settings/marketplaceSettingsAliases.js";
import { isHttpMcpServeInvocation } from "../entrypoints/mcpServeArgs.js";
import { or } from "./settings/commandSyncNames.js";
import { env } from "./env.js";
import { v$ } from "./authFileDescriptor.js";
import { clearCACertsCache, loadExtraCACerts } from "./caCerts.js";
import { hasConfiguredGlobalAgents, clearProxyCache, configureGlobalAgents } from "./proxy.js";
import { getLoadedMTLSPaths, clearMTLSCache, loadMTLSClientMaterial } from "./mtls.js";
import { logError } from "./log.js";
import { aV } from "./memoize.js";
import { emitCredentialChange } from "./auth/credentialEpoch.js";

//@ chunk-q4qb1h08.js:11334-11486 placement
var freeze = Object.freeze({
  coworkCloud: !1,
  managedByHost: !1,
  managedByHostFlag: !1,
  desktopHost: !1,
  hostOrchestrated: !1,
  storedLoginPinned: !1,
  hybridConnection: !1,
});
/**
 * 汇总当前环境的托管情况：云端协作托管设置、是否由宿主管理提供方（标记或认证变量）、桌面宿主、宿主编排（含 byoc）、固定存储登录、混合连接。
 */
//@ chunk-q4qb1h08.js:11486-11804 placement
function hostManagementFacts() {
  let e = isEnvTruthy(process.env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST),
    n = isHostEntrypoint(),
    envClaudeCodeEnvironmentKind = process.env.CLAUDE_CODE_ENVIRONMENT_KIND;
  return {
    coworkCloud: hasManagedSettings(),
    managedByHost: e || !!process.env.CLAUDE_CODE_HOST_AUTH_ENV_VAR,
    managedByHostFlag: e,
    desktopHost: n,
    hostOrchestrated: n || envClaudeCodeEnvironmentKind === "byoc",
    storedLoginPinned: isStoredLoginPinned(),
    hybridConnection: Ee(),
  };
}
//@ chunk-q4qb1h08.js:11804-11827 placement
function Ee() {
  return !1;
}
/**
 * 项目级设置不能设置的环境变量清单（宿主/会话控制、配置目录、临时目录、遥测与调试输出等），以及按前缀屏蔽的列表。
 */
//@ chunk-q4qb1h08.js:11827-17123 placement
var PROJECT_LEVEL_SETTING_SOURCES = new Set(["policySettings", "projectSettings", "localSettings"]),
  EXTRA_BLOCKED_ENV_VARS = [],
  EXTRA_BLOCKED_ENV_PREFIXES = [],
  BLOCKED_PREFIX_GROUPS = [],
  PROJECT_SCOPE_BLOCKED_ENV_VARS = new Set([
    PROCESS_WRAPPER_ENV,
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
    ...HIt,
    "CLAUDE_CODE_SUBSCRIPTION_TYPE",
    "CLAUDE_CODE_RATE_LIMIT_TIER",
    ...Q_r,
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
  ]),
  PROJECT_SCOPE_BLOCKED_PREFIXES = [
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
function ae(e, n) {
  return isSafeChromeEnvValue(e, n) || Ge(e, n);
}
//@ chunk-q4qb1h08.js:21905-21964 placement
function purgeHostOwnedChromeVars() {
  for (let e of v.keys()) delete process.env[e];
}
//@ chunk-q4qb1h08.js:21964-22069 placement
var USER_SCOPE_BLOCKED_ENV_VARS = new Set([
  "CLAUDE_CODE_PLUGIN_DIRS",
  "CLAUDE_CODE_PLUGIN_DIR_WATCH",
  "CLAUDE_CODE_PROCESS_WRAPPER",
]);
//@ chunk-q4qb1h08.js:22069-22200 placement
function stripHostOnlyEnv(e, n) {
  if (e === void 0 || !isPersonalConfigRestricted() || (n !== "userSettings" && n !== "globalConfig"))
    return e;
  return wi(e, (r, E) => USER_SCOPE_BLOCKED_ENV_VARS.has(E.toUpperCase()));
}
//@ chunk-q4qb1h08.js:22200-22298 placement
function H(e) {
  if (!e) return {};
  let n = {};
  for (let [r, E] of Object.entries(e)) if (!isRestrictedEnvKey(r, E)) n[r] = E;
  return n;
}
//@ chunk-q4qb1h08.js:22298-22348 placement
function getEnvAboveProjectSettings() {
  return d.envAboveProjectSettings();
}
//@ chunk-q4qb1h08.js:22348-22399 placement
function getPreSettingsEnvSnapshot() {
  return d.getPreSettingsEnvSnapshot();
}
//@ chunk-q4qb1h08.js:22399-22506 placement
function getPreSettingsEnvHonoringLiveDeletions() {
  let e = { ...getPreSettingsEnvSnapshot() };
  for (let n of Object.keys(e)) if (process.env[n] === void 0) delete e[n];
  return e;
}
//@ chunk-q4qb1h08.js:22506-22563 placement
function isSettingsSourcedEnvValue(e, n) {
  return d.isSettingsSourcedEnvValue(e, n);
}
//@ chunk-q4qb1h08.js:22563-22619 placement
function personsSettingsEnvKeeps(e, n) {
  return d.personsSettingsEnvKeeps(e, n);
}
//@ chunk-q4qb1h08.js:22619-22675 placement
function putBackUnsuppliedTelemetryEnv() {
  return d.putBackUnsuppliedTelemetryEnv();
}
//@ chunk-q4qb1h08.js:22675-22719 placement
function setToolServerLaunchEnv(e) {
  d.setToolServerLaunchEnv(e);
}
//@ chunk-q4qb1h08.js:22719-22766 placement
function recordPersonsEnvValue(e, n) {
  d.recordPersonsEnvValue(e, n);
}
//@ chunk-q4qb1h08.js:22766-22818 placement
function getLatchedPreSettingsEnvSnapshot() {
  return d.peekPreSettingsEnvSnapshot();
}
//@ chunk-q4qb1h08.js:22818-22842 placement
function withLaunchValuesOfHybridConnection(e) {
  return e;
}
//@ chunk-q4qb1h08.js:22842-22884 placement
function getLegacyEnvMap() {
  return d.getLegacyEnvMap();
}
//@ chunk-q4qb1h08.js:22884-22936 placement
function getAppliedGlobalConfigEnv() {
  return d.getAppliedGlobalConfigEnv();
}
//@ chunk-q4qb1h08.js:22936-22944 placement
txi(getPreSettingsEnvSnapshot);
//@ chunk-q4qb1h08.js:22944-22984 placement
MRi(() => d.takeChildEnvFromRepository());
//@ chunk-q4qb1h08.js:22984-22992 placement
c_i(getLatchedPreSettingsEnvSnapshot);
//@ chunk-q4qb1h08.js:22992-23031 placement = _temp7 (1)
DRi(() => getSettingsForSource("policySettings")?.env ?? {});
//@ chunk-q4qb1h08.js:23031-23037 placement
J(isSettingsSourcedEnvValue);
//@ chunk-q4qb1h08.js:23037-23092 placement
r_i(
  (e) => d.routeAfterVerdict(e),
  (e) => d.launchNamed(e),
);
//@ chunk-q4qb1h08.js:23092-23204 placement
q_i({
  env: () => d.getHostLaunchEnv(),
  credential: () => d.getLaunchCredential(),
  road: () => d.getLaunchCredentialRoad(),
});
//@ chunk-q4qb1h08.js:23204-23263 placement
function resetPreSettingsEnvSnapshotForClaim(e, n) {
  return d.dropPreSettingsEnvSnapshot(e, n);
}
//@ chunk-q4qb1h08.js:23263-23318 placement
function c(e) {
  return getPlatform() === "windows" ? e.toUpperCase() : e;
}
//@ chunk-q4qb1h08.js:23318-23614 placement
function launchViewAtClaim(e, n, r) {
  if (e === void 0) return Object.freeze({ ...process.env });
  let E = new Set(n.map(c)),
    s = new Map(Object.entries(e).map(([_, a]) => [c(_), a])),
    C = {};
  for (let _ of Object.keys(process.env))
    if (E.has(c(_))) C[_] = r?.[_] ?? process.env[_];
    else if (s.has(c(_))) C[_] = s.get(c(_));
  return Object.freeze(C);
}
//@ chunk-q4qb1h08.js:23614-23801 placement
function putBackTransport(e, n) {
  let filtered = Object.keys(process.env).filter((E) => n(E) && process.env[E] !== e[E]);
  for (let E of filtered)
    if (e[E] === void 0) delete process.env[E];
    else process.env[E] = e[E];
  return filtered.length > 0;
}
//@ chunk-q4qb1h08.js:23801-23894 placement
function filterPolicyPredicateEnv(e, n = "policySettings") {
  return d.filterPolicyPredicateEnv(e, n, { forPolicyMatch: !1 });
}
//@ chunk-q4qb1h08.js:23894-23988 placement
function filterEnvForPolicyPredicateMatch(e, n = "policySettings") {
  return d.filterPolicyPredicateEnv(e, n, { forPolicyMatch: !0 });
}
//@ chunk-q4qb1h08.js:23988-24046 placement
function withoutInvalidSettingsEnv(e, n) {
  return d.withoutInvalidSettingsEnv(e, n);
}
//@ chunk-q4qb1h08.js:24046-24083 placement
function settingsEnvForHookChild(e, n) {
  return H(withoutInvalidSettingsEnv(e, n));
}
//@ chunk-q4qb1h08.js:24083-24363 placement
var TELEMETRY_SETTING_SOURCES = ["userSettings", "flagSettings", "policySettings"],
  OTLP_SIGNALS = ["TRACES", "METRICS", "LOGS", "PROFILES"],
  OTLP_EXPORTER_PREFIX = OTEL_EXPORTER_OTLP,
  OTLP_SECRET_SUFFIXES = new Set(["HEADERS", "CLIENT_KEY", "CLIENT_CERTIFICATE"]),
  OTEL_EXPORTER_SELECTORS = new Set(["OTEL_LOGS_EXPORTER", "OTEL_TRACES_EXPORTER"]),
  CLAUDE_CODE_ENABLE_TELEMETRY = "CLAUDE_CODE_ENABLE_TELEMETRY",
  BETA_TRACING_ENDPOINT = "BETA_TRACING_ENDPOINT";
//@ chunk-q4qb1h08.js:24363-24431 placement
var xt = new Set([
  `${OTEL_EXPORTER_OTLP}ENDPOINT`,
  `${OTEL_EXPORTER_OTLP}HEADERS`,
  `${OTEL_EXPORTER_OTLP}PROTOCOL`,
]);
//@ chunk-q4qb1h08.js:24431-24454 placement
function x(e) {
  return e;
}
//@ chunk-q4qb1h08.js:24454-24525 placement
function Ke(e) {
  return !e
    .split(",")
    .map((n) => n.trim())
    .includes("otlp");
}
//@ chunk-q4qb1h08.js:24525-24580 placement
function G(e) {
  return getPlatform() === "windows" ? e.toUpperCase() : e;
}
//@ chunk-q4qb1h08.js:24580-24709 placement
function pickEnvKeys(e, n) {
  let r = {};
  for (let [E, s] of Object.entries(e ?? {}))
    if (n.includes(E.toUpperCase()) && s !== void 0) r[E] = String(s);
  return r;
}
/**
 * 应用托管/项目设置中的环境变量：按作用域过滤被阻止变量、剥离 provider 相关变量并告警。
 */
//@ chunk-q4qb1h08.js:24709-41306 placement
class ManagedEnvApplier {
  providerStripContext = freeze;
  projectScopeDropWarned = new Set();
  fullPassDroppedGitKey = !1;
  hostManagedDropWarned = new Set();
  invalidEnvKeyWarned = new Set();
  hostSpawnEnvKeys = void 0;
  settingsEnvForChildren = {};
  settingsEnvForChildrenFromRepository = new Map();
  publishedChildEnv = {};
  publishedChildEnvFromRepository = new Map();
  toolServerLaunchEnv = {};
  materializedProcessWrapper = void 0;
  preSettingsEnvSnapshot = void 0;
  userTierNames = new Set();
  launchNamesBeforeClaim = void 0;
  userTierNamesInSnapshot = new Set();
  claimLaunchEnv = void 0;
  launchCredentialRoad = "none";
  launchCredential = void 0;
  otelDominanceDropWarned = new Set();
  hostSpawnEnvDropWarned = new Set();
  untrustedFolderDropWarned = new Set();
  servedFolderEnvWithheld = !1;
  getPreSettingsEnvSnapshot() {
    return (
      (this.preSettingsEnvSnapshot ??= this.latchPreSettingsEnvSnapshot({ ...process.env })),
      this.preSettingsEnvSnapshot
    );
  }
  latchPreSettingsEnvSnapshot(e) {
    let launchNamesBeforeClaim = this.launchNamesBeforeClaim;
    this.userTierNamesInSnapshot = new Set(
      launchNamesBeforeClaim === void 0
        ? []
        : Object.keys(e)
            .map((E) => E.toUpperCase())
            .filter((E) => this.userTierNames.has(E) && !launchNamesBeforeClaim.has(E)),
    );
    let r = this.claimLaunchEnv ?? e;
    return (
      (this.launchCredential = hasManagedSettings() ? claimedCredential(r) : null),
      (this.launchCredentialRoad = hasManagedSettings() ? credentialRoad(r, this.launchCredential) : "none"),
      Object.freeze(e)
    );
  }
  getLaunchCredentialRoad() {
    return (this.getPreSettingsEnvSnapshot(), this.launchCredentialRoad);
  }
  getLaunchCredential() {
    return (this.getPreSettingsEnvSnapshot(), this.launchCredential ?? null);
  }
  getHostLaunchEnv() {
    let preSettingsEnvSnapshot = this.getPreSettingsEnvSnapshot();
    return this.claimLaunchEnv ?? preSettingsEnvSnapshot;
  }
  envAboveProjectSettings() {
    let preSettingsEnvSnapshot = this.getPreSettingsEnvSnapshot(),
      n = {};
    for (let [r, E] of Object.entries(preSettingsEnvSnapshot))
      if (!this.userTierNamesInSnapshot.has(r.toUpperCase())) n[r] = E;
    return {
      ...n,
      ...getSettingsForSource("flagSettings")?.env,
      ...getSettingsForSource("policySettings")?.env,
    };
  }
  peekPreSettingsEnvSnapshot() {
    return this.preSettingsEnvSnapshot;
  }
  appliedGlobalConfigEnv = void 0;
  legacyEnvMapAtLaunch = void 0;
  settingsOfferedEnvValues = new Map();
  personsWrittenEnvValues = new Map();
  otelDominatedAsked = void 0;
  getAppliedGlobalConfigEnv() {
    return this.appliedGlobalConfigEnv;
  }
  getLegacyEnvMap() {
    return this.legacyEnvMapAtLaunch ?? getGlobalConfig().env;
  }
  dropPreSettingsEnvSnapshot(e, n) {
    let preSettingsEnvSnapshot = this.preSettingsEnvSnapshot;
    if (
      ((this.preSettingsEnvSnapshot = void 0),
      (this.launchCredential = void 0),
      (this.claimLaunchEnv = void 0),
      (this.legacyEnvMapAtLaunch = void 0),
      e === void 0)
    )
      return !1;
    let E = [...e];
    if (preSettingsEnvSnapshot)
      this.launchNamesBeforeClaim = new Set(
        [...Object.keys(preSettingsEnvSnapshot), ...E].map((_) => _.toUpperCase()),
      );
    if (!hasManagedSettings()) return !1;
    let s = launchViewAtClaim(preSettingsEnvSnapshot, E, n);
    this.claimLaunchEnv = s;
    let C = preSettingsEnvSnapshot !== void 0 && putBackTransport(s, zps);
    return (this.getPreSettingsEnvSnapshot(), C);
  }
  reset() {
    ((this.providerStripContext = freeze),
      this.projectScopeDropWarned.clear(),
      this.hostManagedDropWarned.clear(),
      this.invalidEnvKeyWarned.clear(),
      (this.hostSpawnEnvKeys = void 0),
      (this.settingsEnvForChildren = {}),
      (this.settingsEnvForChildrenFromRepository = new Map()),
      (this.toolServerLaunchEnv = {}),
      (this.materializedProcessWrapper = void 0),
      (this.preSettingsEnvSnapshot = void 0),
      this.userTierNames.clear(),
      (this.launchNamesBeforeClaim = void 0),
      (this.userTierNamesInSnapshot = new Set()),
      (this.claimLaunchEnv = void 0),
      (this.launchCredential = void 0),
      (this.launchCredentialRoad = "none"),
      (this.appliedGlobalConfigEnv = void 0),
      (this.legacyEnvMapAtLaunch = void 0),
      this.settingsOfferedEnvValues.clear(),
      this.personsWrittenEnvValues.clear(),
      this.otelDominanceDropWarned.clear(),
      this.hostSpawnEnvDropWarned.clear(),
      this.untrustedFolderDropWarned.clear(),
      (this.servedFolderEnvWithheld = !1),
      (this.fullPassDroppedGitKey = !1));
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
        H(
          hasDangerousEnvVars(
            stripProjectBlockedEnv(
              dropIgnoredEnvEntries(
                stripHostOnlyEnv(this.asFromAFolderNobodyTrusted(e, n, E !== void 0), n),
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
    let C = {},
      _ = applyDirectEnvKeys(s, C);
    for (let [a, O] of Object.entries(C)) if (j(a.toUpperCase())) _[a] = O;
    return _;
  }
  keptSettingsEnv(e, n, r, E) {
    return this.withholdsEnvFrom(n, r) ? {} : this.strippedSettingsEnv(e, n, r, E);
  }
  launchEnvUnlatched() {
    return this.claimLaunchEnv ?? this.peekPreSettingsEnvSnapshot() ?? process.env;
  }
  launchNamed(e) {
    let n = new Map(Object.entries(pickEnvKeys(this.launchEnvUnlatched(), e)).map(([r, E]) => [G(r), E]));
    return (r) => n.get(G(r));
  }
  routeAfterVerdict(e) {
    let n = this.providerStripContext === freeze ? hostManagementFacts() : this.providerStripContext,
      r = [
        pickEnvKeys(this.launchEnvUnlatched(), e),
        this.keptSettingsEnv(pickEnvKeys(this.getLegacyEnvMap(), e), "globalConfig", n, void 0),
        ...getEnabledSettingSources()
          .filter((s) => s !== "policySettings" && !isDangerousEnvVar(s))
          .map((s) => this.keptSettingsEnv(pickEnvKeys(getSettingsForSource(s)?.env, e), s, n, void 0)),
        this.strippedSettingsEnv(pickEnvKeys(getMachineAdminPolicyEnv(), e), "policySettings", n, void 0),
      ],
      E = new Map(r.flatMap((s) => Object.entries(s).map(([C, _]) => [G(C), _])));
    return (s) => E.get(G(s));
  }
  setToolServerLaunchEnv(e) {
    this.toolServerLaunchEnv = e;
  }
  assignFromAboveTheRepository(e) {
    Object.assign(process.env, e);
    for (let n of Object.keys(e)) Eus(n);
  }
  takeChildEnvFromRepository() {
    let publishedChildEnv = this.publishedChildEnv,
      n = [];
    for (let [r, E] of this.publishedChildEnvFromRepository) {
      let s = publishedChildEnv[r];
      if (s === void 0) continue;
      if ((n.push([r, s]), E === void 0)) delete publishedChildEnv[r];
      else publishedChildEnv[r] = E;
    }
    if (n.length === 0) return;
    return () => {
      for (let [r, E] of n) publishedChildEnv[r] = E;
    };
  }
  publishChildEnv() {
    ((this.publishedChildEnv = this.settingsEnvForChildren),
      (this.publishedChildEnvFromRepository = this.settingsEnvForChildrenFromRepository),
      setSettingsEnvForChildren(this.settingsEnvForChildren));
  }
  takenFromToolServerLaunchEnv() {
    let e = {};
    for (let [n, r] of Object.entries(
      H(dropIgnoredEnvEntries(this.toolServerLaunchEnv, "globalConfig", this.invalidEnvKeyWarned)),
    ))
      if (!h.has(n.toUpperCase())) e[n] = r;
    return this.filterSettingsEnv(applyDirectEnvKeys(e, this.settingsEnvForChildren), "globalConfig");
  }
  filterSettingsEnv(e, n, r) {
    let keptSettingsEnv = this.keptSettingsEnv(e, n, this.providerStripContext, { onGitKeyDropped: r });
    for (let [s, C] of Object.entries(keptSettingsEnv)) this.recordOfferedEnvValue(s, C);
    if (n === "globalConfig" || n === "userSettings")
      for (let s of Object.keys(keptSettingsEnv)) this.userTierNames.add(s.toUpperCase());
    return keptSettingsEnv;
  }
  withoutInvalidSettingsEnv(e, n) {
    return dropIgnoredEnvEntries(e, n, this.invalidEnvKeyWarned);
  }
  putBackUnsuppliedTelemetryEnv() {
    let preSettingsEnvSnapshot = this.preSettingsEnvSnapshot;
    if (preSettingsEnvSnapshot === void 0 || this.appliedGlobalConfigEnv === void 0) return !1;
    let n = !1,
      filtered = Object.keys(process.env).filter((E) => {
        let upper = E.toUpperCase(),
          C = process.env[E];
        return (
          C !== void 0 &&
          C !== preSettingsEnvSnapshot[E] &&
          (rao.some((_) => upper.startsWith(_)) || X_r.includes(upper) || _e.has(upper)) &&
          this.settingsOfferedEnvValues.get(upper)?.has(C.trim()) === !0 &&
          this.personsWrittenEnvValues.get(c(E)) !== C.trim()
        );
      });
    if (filtered.length > 0) {
      let E = new Map();
      for (let C of [
        this.toolServerLaunchEnv,
        this.appliedGlobalConfigEnv ?? {},
        ...getEnabledSettingSources().map((_) =>
          this.keptSettingsEnv(getSettingsForSource(_)?.env, _, this.providerStripContext, void 0),
        ),
      ])
        for (let [_, a] of Object.entries(C)) E.set(c(_), a.trim());
      let filtered_2 = filtered.filter((C) => E.get(c(C)) !== process.env[C]?.trim());
      if (((n = putBackTransport(preSettingsEnvSnapshot, (C) => filtered_2.includes(C))), n))
        logForDebugging(
          `Telemetry environment variables put back to their startup values, or removed, because no settings source still sets their current value: ${filtered_2.map(escapeForDisplay).join(", ")}`,
        );
    }
    return (this.enforceManagedOtelFamilyDominance(), n);
  }
  isSettingsSourcedEnvValue(e, n) {
    let trimmed = n.trim();
    return (
      this.settingsOfferedEnvValues.get(e.toUpperCase())?.has(trimmed) === !0 ||
      this.personsWrittenEnvValues.get(c(e)) === trimmed
    );
  }
  recordPersonsEnvValue(e, n) {
    if (n === void 0) this.personsWrittenEnvValues.delete(c(e));
    else this.personsWrittenEnvValues.set(c(e), n.trim());
  }
  recordOfferedEnvValue(e, n) {
    let upper = e.toUpperCase(),
      trimmed = n.trim(),
      s = this.settingsOfferedEnvValues.get(upper);
    if (s) s.add(trimmed);
    else this.settingsOfferedEnvValues.set(upper, new Set([trimmed]));
  }
  personsSettingsEnvKeeps(e, n) {
    let r = this.providerStripContext === freeze ? hostManagementFacts() : this.providerStripContext,
      E = getEnabledSettingSources(),
      sliced = E.slice(E.indexOf("userSettings") + 1),
      C = (_, a) => Object.keys(this.keptSettingsEnv(_, a, r, void 0));
    return (
      E.includes("userSettings") &&
      C({ [e]: n }, "userSettings").includes(e) &&
      !sliced.some((_) => C(getSettingsForSource(_)?.env, _).some((a) => c(a) === c(e))) &&
      !this.otelDominates(e) &&
      !(n === "" && c(e) === c(PROCESS_WRAPPER_ENV) && this.processWrapperKeyAbove() !== void 0)
    );
  }
  otelDominates(e) {
    let n = new Set();
    this.otelDominatedAsked = n;
    try {
      this.enforceManagedOtelFamilyDominance();
    } finally {
      this.otelDominatedAsked = void 0;
    }
    return n.has(e.toUpperCase());
  }
  otelClaimInForce(e, n) {
    return this.otelDominatedAsked !== void 0 || process.env[e] === n;
  }
  processWrapperKeyAbove() {
    return [this.processWrapperKeyFrom("policySettings"), this.processWrapperKeyFrom("flagSettings")].find(
      (e) => typeof e === "string" && e !== "",
    );
  }
  filterPolicyPredicateEnv(e, n, { forPolicyMatch: r }) {
    if (!r && this.withholdsEnvFrom(n)) return {};
    let E = applySafeConfigEnvironmentVariables_2(
        filterHostManagedEnv(
          H(
            hasDangerousEnvVars(
              stripProjectBlockedEnv(
                dropIgnoredEnvEntries(
                  r ? e : this.asFromAFolderNobodyTrusted(e, n, !1),
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
      ),
      s = {};
    for (let [C, _] of Object.entries(E)) {
      let upper = C.toUpperCase();
      if (j(upper)) continue;
      if (!r && isServeBlockedEnv(C, _)) continue;
      s[C] = _;
    }
    return s;
  }
  withholdsEnvFrom(e, n = this.providerStripContext) {
    return n.storedLoginPinned && isSettingsTierWithheld(e);
  }
  asFromAFolderNobodyTrusted(e, n, r) {
    if (e === void 0 || !Vso(n)) return e;
    let E = zso(n),
      s = {},
      C = [];
    for (let [_, a] of Object.entries(e)) {
      let upper = _.toUpperCase();
      if (typeof a === "string" && (gPi(_, a) || (!E && ae(upper, a)))) s[_] = a;
      else if (r && E) this.servedFolderEnvWithheld = !0;
      else if (r && !this.untrustedFolderDropWarned.has(`${n}:${_}`))
        (this.untrustedFolderDropWarned.add(`${n}:${_}`), C.push(describeEnvEntryName(_)));
    }
    if (C.length > 0)
      logForDebugging(
        `Ignoring ${C.join(", ")} in the env block of ${n === "localSettings" ? ".claude/settings.local.json" : ".claude/settings.json"}: ${PERSISTED_TRUST_IGNORED}, and this session cannot show a trust dialog, so this folder's settings files may set only a short list of variables, each to certain values only, such as DISABLE_TELEMETRY=1. The repository's author chose the ignored values, not you. If your setup needs an ignored variable, set it yourself in user or managed settings, or in the environment that Claude Code is started with. On a self-hosted runner, user settings are settings.json in the runner host's config directory (SELF_HOSTED_RUNNER_HOST_CONFIG_DIR): restart the runner afterwards.`,
        { level: "warn" },
      );
    return s;
  }
  processWrapperKeyFrom(e) {
    return this.withholdsEnvFrom(e) ||
      isHttpMcpServeInvocation() ||
      (e === "userSettings" && isPersonalConfigRestricted())
      ? void 0
      : getSettingsForSource(e)?.processWrapper;
  }
  dropDominatedOtelKey(e, n, r, E, s = "managed settings") {
    let otelDominatedAsked = this.otelDominatedAsked;
    if (otelDominatedAsked !== void 0) {
      if (!(E.has(e) && E.get(e) === process.env[e]) && !this.hostSpawnEnvKeys?.has(e.toUpperCase()))
        otelDominatedAsked.add(e.toUpperCase());
      return;
    }
    if (E.get(e) === process.env[e]) return;
    if (this.hostSpawnEnvKeys?.has(e.toUpperCase())) return;
    if (process.env[e] === void 0) return;
    if (!this.otelDominanceDropWarned.has(e))
      (this.otelDominanceDropWarned.add(e),
        logForDebugging(
          `Dropping ${escapeForDisplay(e)}: ${escapeForDisplay(r)} is claimed by ${s}, so lower-trust scopes cannot redirect ${n}`,
          { level: "warn" },
        ));
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
    let e = new Map(),
      hostSpawnEnvKeys = this.hostSpawnEnvKeys;
    if (!hostSpawnEnvKeys) return e;
    let any = [...hostSpawnEnvKeys].some((E) => {
      let s = x(E);
      return (
        ((s.startsWith(OTLP_EXPORTER_PREFIX) && s.endsWith("_ENDPOINT")) || s === BETA_TRACING_ENDPOINT) &&
        (process.env[E] ?? "").trim() !== ""
      );
    });
    for (let E of hostSpawnEnvKeys) {
      let s = x(E),
        C = OTEL_EXPORTER_SELECTORS.has(s) || s === CLAUDE_CODE_ENABLE_TELEMETRY,
        _ = any && s.startsWith(OTLP_EXPORTER_PREFIX);
      if (!C && !_) continue;
      let a = process.env[E];
      if (a !== void 0) e.set(E, a);
    }
    return e;
  }
  enforceManagedOtelFamilyDominance() {
    let e = getSettingsForSource("policySettings"),
      n = e?.env,
      r = (e?.otelHeadersHelper ?? "").trim() !== "",
      E = new Map();
    for (let [s, C] of Object.entries(n ?? {})) {
      let upper = s.toUpperCase();
      if (!E.has(upper) || s === upper) E.set(upper, C);
    }
    if ((this.applyOtelFamilyClaims(this.hostSpawnOtelClaims(), E, "the host spawn env"), !n && !r)) return;
    if (r) {
      for (let s of OTLP_SIGNALS)
        this.dropDominatedOtelKey(
          `${OTLP_EXPORTER_PREFIX}${s}_ENDPOINT`,
          `the ${s.toLowerCase()} signal`,
          "otelHeadersHelper",
          E,
        );
      (this.dropDominatedOtelKey(
        `${OTLP_EXPORTER_PREFIX}ENDPOINT`,
        "telemetry for any signal",
        "otelHeadersHelper",
        E,
      ),
        this.dropDominatedAntAlias(`${OTLP_EXPORTER_PREFIX}ENDPOINT`, "otelHeadersHelper", E),
        this.dropDominatedBetaTracingEndpoint("otelHeadersHelper", E));
    }
    this.applyOtelFamilyClaims(E, E, "managed settings");
  }
  applyOtelFamilyClaims(e, n, r) {
    for (let [E, s] of e) {
      let C = x(E);
      if (C === CLAUDE_CODE_ENABLE_TELEMETRY) {
        if (this.otelClaimInForce(E, s) && !isEnvTruthy(s)) this.dropDominatedBetaTracingEndpoint(E, n, r);
        continue;
      }
      if (OTEL_EXPORTER_SELECTORS.has(C)) {
        if (this.otelClaimInForce(E, s) && Ke(s)) this.dropDominatedBetaTracingEndpoint(E, n, r);
        continue;
      }
      if (!C.startsWith(OTLP_EXPORTER_PREFIX)) continue;
      if (s.trim() === "") continue;
      if (!this.otelClaimInForce(E, s)) continue;
      let found = OTLP_SIGNALS.find((S) => C.startsWith(`${OTLP_EXPORTER_PREFIX}${S}_`));
      if (found) {
        let sliced = C.slice(`${OTLP_EXPORTER_PREFIX}${found}_`.length),
          R = found === "TRACES" || found === "LOGS";
        if (OTLP_SECRET_SUFFIXES.has(sliced)) {
          if (
            (this.dropDominatedOtelKey(
              `${OTLP_EXPORTER_PREFIX}${found}_ENDPOINT`,
              `the ${found.toLowerCase()} signal`,
              E,
              n,
              r,
            ),
            R)
          )
            this.dropDominatedBetaTracingEndpoint(E, n, r);
        } else if (sliced === "ENDPOINT" && R) this.dropDominatedBetaTracingEndpoint(E, n, r);
        continue;
      }
      let sliced = C.slice(OTLP_EXPORTER_PREFIX.length),
        O = OTLP_SECRET_SUFFIXES.has(sliced),
        D = O ? [sliced, "ENDPOINT"] : [sliced];
      for (let S of D)
        for (let R of OTLP_SIGNALS)
          this.dropDominatedOtelKey(
            `${OTLP_EXPORTER_PREFIX}${R}_${S}`,
            `the ${R.toLowerCase()} signal`,
            E,
            n,
            r,
          );
      if (O)
        (this.dropDominatedOtelKey(`${OTLP_EXPORTER_PREFIX}ENDPOINT`, "telemetry for any signal", E, n, r),
          this.dropDominatedAntAlias(`${OTLP_EXPORTER_PREFIX}ENDPOINT`, E, n, r));
      if (D.includes("ENDPOINT")) this.dropDominatedBetaTracingEndpoint(E, n, r);
      this.dropDominatedAntAlias(C, E, n, r);
    }
  }
  resetSettingsIfUserSettingsFileMoved(e) {
    if (getSettingsFilePathForSource("userSettings") !== e) or();
  }
  applySafeConfigEnvironmentVariables() {
    (this.getPreSettingsEnvSnapshot(), (this.providerStripContext = hostManagementFacts()));
    let e = getSettingsFilePathForSource("userSettings"),
      NODE_EXTRA_CA_CERTS = env.NODE_EXTRA_CA_CERTS,
      CLAUDE_CODE_CERT_STORE = env.CLAUDE_CODE_CERT_STORE,
      E = env.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP,
      CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP = env.CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP,
      NODE_OPTIONS = env.NODE_OPTIONS;
    if (this.hostSpawnEnvKeys === void 0) {
      if (
        ((this.hostSpawnEnvKeys = this.providerStripContext.hostOrchestrated
          ? new Set(Object.keys(process.env).map((O) => O.toUpperCase()))
          : null),
        this.hostSpawnEnvKeys && v$("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"))
      )
        this.hostSpawnEnvKeys.add("CLAUDE_CODE_OAUTH_TOKEN");
      if (holdsDaemonForceColor()) this.hostSpawnEnvKeys?.delete("FORCE_COLOR");
    }
    ((this.settingsEnvForChildren = {}),
      (this.settingsEnvForChildrenFromRepository = new Map()),
      Object.assign(process.env, this.takenFromToolServerLaunchEnv()),
      (this.appliedGlobalConfigEnv = this.filterSettingsEnv(this.getLegacyEnvMap(), "globalConfig")),
      this.assignFromAboveTheRepository(this.appliedGlobalConfigEnv));
    for (let O of TELEMETRY_SETTING_SOURCES) {
      if (O === "policySettings") continue;
      if (!isSettingSourceEnabled(O)) continue;
      this.assignFromAboveTheRepository(this.filterSettingsEnv(getSettingsForSource(O)?.env, O));
    }
    (computeRemoteSettingsEligibility(),
      (this.providerStripContext = { ...this.providerStripContext, hybridConnection: Ee() }),
      this.assignFromAboveTheRepository(
        this.filterSettingsEnv(getSettingsForSource("policySettings")?.env, "policySettings"),
      ));
    let _ = new Map();
    for (let O of getEnabledSettingSources()) {
      let filterSettingsEnv = this.filterSettingsEnv(getSettingsForSource(O)?.env, O);
      for (let [S, R] of Object.entries(filterSettingsEnv))
        _.set(S.toUpperCase(), { key: S, value: R, source: O });
    }
    for (let { key: key, value: D, source: source } of _.values()) {
      if (!isProtectedEnvVar(key, D)) continue;
      if (isDangerousEnvVar(source)) {
        let R = snapshotHostOwnedEnv(key);
        ((process.env[key] = D), R());
      } else ((process.env[key] = D), Eus(key));
    }
    this.publishChildEnv();
    let a = process.env[PROCESS_WRAPPER_ENV];
    if (!a || a === this.materializedProcessWrapper) {
      let O = isSettingSourceEnabled("userSettings") ? this.processWrapperKeyFrom("userSettings") : void 0,
        D = this.processWrapperKeyAbove() ?? (O === "" ? void 0 : O);
      if (D !== void 0) ((process.env[PROCESS_WRAPPER_ENV] = D), (this.materializedProcessWrapper = D));
    }
    if (
      (this.enforceManagedOtelFamilyDominance(),
      this.resetSettingsIfUserSettingsFileMoved(e),
      env.NODE_EXTRA_CA_CERTS !== NODE_EXTRA_CA_CERTS ||
        env.CLAUDE_CODE_CERT_STORE !== CLAUDE_CODE_CERT_STORE ||
        env.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP !== E ||
        env.CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP !== CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP ||
        env.NODE_OPTIONS !== NODE_OPTIONS)
    ) {
      if ((clearCACertsCache(), hasConfiguredGlobalAgents())) (clearProxyCache(), configureGlobalAgents());
    }
  }
  applyConfigEnvironmentVariables() {
    (this.getPreSettingsEnvSnapshot(),
      (this.providerStripContext = hostManagementFacts()),
      (this.settingsEnvForChildren = {}),
      (this.settingsEnvForChildrenFromRepository = new Map()));
    let NODE_EXTRA_CA_CERTS = env.NODE_EXTRA_CA_CERTS,
      CLAUDE_CODE_CERT_STORE = env.CLAUDE_CODE_CERT_STORE,
      r = env.CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP,
      CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP = env.CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP,
      NODE_OPTIONS = env.NODE_OPTIONS,
      CLAUDE_CODE_CLIENT_CERT = env.CLAUDE_CODE_CLIENT_CERT,
      CLAUDE_CODE_CLIENT_KEY = env.CLAUDE_CODE_CLIENT_KEY;
    ((this.legacyEnvMapAtLaunch ??= { ...getGlobalConfig().env }),
      Object.assign(process.env, this.takenFromToolServerLaunchEnv()),
      (this.appliedGlobalConfigEnv = this.filterSettingsEnv(this.getLegacyEnvMap(), "globalConfig")),
      this.assignFromAboveTheRepository(this.appliedGlobalConfigEnv),
      (this.fullPassDroppedGitKey = !1));
    for (let R of getEnabledSettingSources()) {
      let filterSettingsEnv = this.filterSettingsEnv(getSettingsForSource(R)?.env, R, () => {
        this.fullPassDroppedGitKey = !0;
      });
      if (isDangerousEnvVar(R)) {
        let mapped = Object.keys(filterSettingsEnv).map((b) => snapshotHostOwnedEnv(b));
        Object.assign(process.env, filterSettingsEnv);
        for (let b of mapped) b();
      } else this.assignFromAboveTheRepository(filterSettingsEnv);
    }
    (this.publishChildEnv(), this.enforceManagedOtelFamilyDominance());
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
    let { certPath: certPath, keyPath: keyPath } = getLoadedMTLSPaths(),
      S =
        (env.CLAUDE_CODE_CLIENT_CERT !== certPath || env.CLAUDE_CODE_CLIENT_KEY !== keyPath) &&
        (certPath !== void 0 || keyPath !== void 0);
    if (!S) clearMTLSCache();
    (clearProxyCache(),
      configureGlobalAgents(),
      Promise.all([loadExtraCACerts(), loadMTLSClientMaterial()])
        .then(([R, f]) => {
          if (S && f.readFailed) clearMTLSCache();
          if (a || S || R || f.changed) (clearProxyCache(), configureGlobalAgents());
        })
        .catch(logError));
  }
}
//@ chunk-q4qb1h08.js:41306-41337 placement
var d = new ManagedEnvApplier(),
  jt = aV({ clear: We });
//@ chunk-q4qb1h08.js:41337-41419 placement
function applySafeConfigEnvironmentVariables() {
  try {
    d.applySafeConfigEnvironmentVariables();
  } finally {
    exitIfServeHelperMisconfigured();
  }
  (V(), emitCredentialChange());
}
//@ chunk-q4qb1h08.js:41419-41496 placement
function applyConfigEnvironmentVariables() {
  try {
    d.applyConfigEnvironmentVariables();
  } finally {
    exitIfServeHelperMisconfigured();
  }
  (V(), emitCredentialChange());
}
//@ chunk-q4qb1h08.js:41496-41549 placement
function servedFolderEnvWasWithheld() {
  return d.servedFolderEnvWasWithheld();
}
//@ chunk-q4qb1h08.js:41549-41573 placement
function We() {
  d.reset();
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
  ae,
  PROJECT_LEVEL_SETTING_SOURCES,
  purgeHostOwnedChromeVars,
  putBackTransport,
  launchViewAtClaim,
  resetPreSettingsEnvSnapshotForClaim,
  withoutInvalidSettingsEnv,
};
