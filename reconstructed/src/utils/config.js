/**
 * utils/config.ts
 *
 * 全局配置 ~/.claude.json：默认值、读取与迁移、带文件锁的保存（防并发丢失登录态）、备份与损坏恢复、projects[路径] 项目配置、工作区信任判定、userID/machineID、自动更新禁用原因。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/config.ts
 * pieces: chunk-0h4e7gnq.js (1), chunk-23fm9f0d.js (1), chunk-99h01h55.js (1), chunk-aepeg2w5.js (209), chunk-byfs7td2.js (1)
 * attribution: fingerprint 14, facade-majority 112, layout 76, placement 4, file-local 1, affinity 2, sole-consumer 2, callgraph-witnessed 2
 */
import {
  resolve,
  resolve as resolve_2,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  dirname,
  dirname as dirname_2,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
} from "path";
import { homedir, homedir as homedir_2, homedir as homedir_3, homedir as homedir_4 } from "os";
import {
  unwatchFile,
  readFileSync,
  readFileSync as readFileSync_2,
  readFileSync as readFileSync_3,
} from "fs";
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
  randomBytes as randomBytes_6,
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
} from "crypto";
import { HostScoped } from "./hostScoped.js";
import {
  GlobalConfigStore,
  n9t,
  textDecoder,
  isTimestampedValue,
  kh,
  readTimestampedEntry,
  findMatchingUsageSnapshot,
} from "./config/globalConfigValidation.js";
import {
  onProcessRootHost,
  getIsNonInteractiveSession,
  getOriginalCwdOrNull,
  isDiskless,
  isRestrictedWorkspaceTrustKey,
  getOriginalCwd,
  getProjectConfigRoot,
  getSessionTrustAccepted,
} from "../bootstrap/state.js";
import { Kso } from "../cli/headlessCloud/attachServe.js";
import { normalizePathForConfigKey } from "./path.js";
import { eA, GD, dY, findNearestRoot, isHomeDirRoot } from "./settings/settingsStorage.js";
import { Mn } from "./pathClassification.js";
import { findGitRootUncached, findGitRootThroughBackendUncached } from "./git.js";
import { logError } from "./log.js";
import { resolveLocalSettingsStoreRoot } from "./settings/settingsFileParsing.js";
import { getFsImplementation } from "./fsOperations.js";
import { getClaudeConfigDir, isEnvTruthy } from "./envUtils.js";
import { isENOENT, getErrnoCode, ConfigParseError } from "./errors.js";
import { Tv } from "./disklessSession.js";
import { importMetaRequire } from "../../runtime/bun-runtime.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import { fje } from "./git/gitMissingMessage.js";
import { freeze as freeze_4, Do } from "./git/gitSafeEnv.js";
import { env, getGlobalClaudeFile } from "./env.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { Wo, safeParseJSON } from "./json.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { registerWriteQueueDrain } from "./settings/writeQueues.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";
import { registerCleanup, isCleanupStarted } from "./cleanupRegistry.js";
import { shouldShowProjectOnboarding } from "../projectOnboardingState.js";
import { uQt, NMn } from "./fsSafety/guardedFileRead.js";
import { FileStatWatcher } from "./fileStatWatcher.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { stringArray } from "./collections.js";
import { sleep } from "./sleep.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { writeFileAtomic as writeFileAtomic_2, writeFileSyncAndFlush_DEPRECATED } from "./file.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "./pagedRead.js";
import { ok as ok_2, err } from "./resultError.js";
import { lock } from "./lockfile.js";
import { getEssentialTrafficOnlyReason } from "./privacyLevel.js";
import { getManagedFilePath } from "./settings/managedPath.js";
import { getAutoMemEntrypoint } from "../memdir/paths.js";
import { eoo } from "./plugins/pluginDirectories.js";
import { Hh } from "../services/analytics/juniperShoalConfig.js";
import { Oh } from "./model/subagentSteer.js";
import {
  AgentApiErrorTerminationError,
  zu,
  extractAgentFinalText,
  partialResultPreamble,
} from "../tools/AgentTool/agentToolUtils.js";
import { cleanupOldFilesMatching } from "./cleanup.js";
import { Se } from "../services/artifacts/capabilityDeclaration.js";

//@ chunk-aepeg2w5.js:76946-77163 facade-majority = DEFAULT_PROJECT_CONFIG (0.927)
var DEFAULT_PROJECT_CONFIG = {
  allowedTools: [],
  mcpContextUris: [],
  mcpServers: {},
  enabledMcpjsonServers: [],
  disabledMcpjsonServers: [],
  hasTrustDialogAccepted: !1,
  hasClaudeMdExternalIncludesApproved: !1,
  hasClaudeMdExternalIncludesWarningShown: !1,
};
/**
 * 全局配置默认值（numStartups、theme=dark、autoCompactEnabled 等），读盘时与文件内容合并。
 */
//@ chunk-aepeg2w5.js:77163-77945 fingerprint = createDefaultGlobalConfig (0.948)
function createDefaultGlobalConfig() {
  return {
    numStartups: 0,
    installMethod: void 0,
    autoUpdates: void 0,
    theme: "dark",
    preferredNotifChannel: "auto",
    verbose: !1,
    editorMode: "normal",
    autoCompactEnabled: !0,
    autoScrollEnabled: !0,
    showTurnDuration: !0,
    externalEditorContext: !1,
    showMessageTimestamps: !1,
    hasSeenTasksHint: !1,
    hasUsedStash: !1,
    hasUsedBackgroundTask: !1,
    queuedCommandUpHintCount: 0,
    diffTool: "auto",
    customApiKeyResponses: { approved: [], rejected: [] },
    env: {},
    tipsHistory: {},
    memoryUsageCount: 0,
    promptQueueUseCount: 0,
    btwUseCount: 0,
    todoFeatureEnabled: !0,
    showExpandedTodos: !1,
    briefTranscript: !1,
    messageIdleNotifThresholdMs: 60000,
    autoConnectIde: !1,
    autoInstallIdeExtension: !0,
    fileCheckpointingEnabled: !0,
    terminalProgressBarEnabled: !0,
    cachedDynamicConfigs: {},
    cachedGrowthBookFeatures: {},
    respectGitignore: !0,
    copyFullResponse: !1,
  };
}
//@ chunk-aepeg2w5.js:77945-78062 facade-majority = TEST_GLOBAL_CONFIG_FOR_TESTING (0.483)
var DEFAULT_GLOBAL_CONFIG = createDefaultGlobalConfig(),
  globalConfigStores = new HostScoped(
    () =>
      new GlobalConfigStore({
        now: Date.now,
        testGlobalConfig: { ...DEFAULT_GLOBAL_CONFIG, autoUpdates: !1 },
        testProjectConfig: { ...DEFAULT_PROJECT_CONFIG },
      }),
  );
/**
 * 取当前宿主的全局配置运行时状态（内存缓存、写队列、freshness 监视、测试配置），所有 config 读写都经过它。
 */
//@ chunk-aepeg2w5.js:78062-78091 layout
function getConfigState() {
  return onProcessRootHost(globalConfigStores);
}
//@ chunk-aepeg2w5.js:78091-79146 facade-majority = GLOBAL_CONFIG_KEYS (0.88)
var GLOBAL_CONFIG_KEYS = [
  "apiKeyHelper",
  "installMethod",
  "autoUpdates",
  "autoUpdatesProtectedForNative",
  "theme",
  "verbose",
  "preferredNotifChannel",
  "shiftEnterKeyBindingInstalled",
  "editorMode",
  "hasUsedBackslashReturn",
  "autoCompactEnabled",
  "autoScrollEnabled",
  "showTurnDuration",
  "externalEditorContext",
  "showMessageTimestamps",
  "diffTool",
  "env",
  "tipsHistory",
  "todoFeatureEnabled",
  "showExpandedTodos",
  "briefTranscript",
  "diffSidebarOpen",
  "messageIdleNotifThresholdMs",
  "autoConnectIde",
  "autoInstallIdeExtension",
  "fileCheckpointingEnabled",
  "terminalProgressBarEnabled",
  "showStatusInTerminalTab",
  "taskCompleteNotifEnabled",
  "inputNeededNotifEnabled",
  "agentPushNotifEnabled",
  "respectGitignore",
  "claudeInChromeDefaultEnabled",
  "hasCompletedClaudeInChromeOnboarding",
  "lspRecommendationDisabled",
  "lspRecommendationNeverPlugins",
  "lspRecommendationIgnoredCount",
  "copyFullResponse",
  "copyOnSelect",
  "leftArrowOpensAgents",
  "defaultToAgentsView",
  "prStatusFooterEnabled",
  "remoteControlAtStartup",
  "autoUploadSessions",
  "autoAddRemoteControlDaemonWorker",
  "remoteDialogSeen",
  "workflowSizeGuideline",
];
//@ chunk-aepeg2w5.js:79146-79185 facade-majority
function isGlobalConfigKey(key) {
  return GLOBAL_CONFIG_KEYS.includes(key);
}
//@ chunk-aepeg2w5.js:79185-79235 facade-majority = PROJECT_CONFIG_KEYS (0.79)
var PROJECT_CONFIG_KEYS = ["allowedTools", "hasTrustDialogAccepted"];
//@ chunk-aepeg2w5.js:79235-79276 facade-majority
function resetTrustDialogAcceptedCache() {
  getConfigState().setTrustAccepted(!1);
}
/**
 * 判断当前项目的信任对话框是否已接受（CLAUDE_CODE_SANDBOXED、会话信任、projects[key].hasTrustDialogAccepted 或父目录已信任），结果在进程内记住。
 */
//@ chunk-aepeg2w5.js:79276-79394 facade-majority
function checkHasTrustDialogAccepted() {
  if (hasNoProjectDir()) return !1;
  let e = getConfigState();
  if (e.trustAccepted) return !0;
  let n = computeTrustDialogAccepted_2();
  if (n) e.setTrustAccepted(!0);
  return n;
}
//@ chunk-aepeg2w5.js:79394-79437 facade-majority
function isProjectScopeTrustAccepted() {
  if (getIsNonInteractiveSession()) return !0;
  return checkHasTrustDialogAccepted();
}
//@ chunk-aepeg2w5.js:79437-79490 placement
function isWorkspacePersistedTrusted(e) {
  let n = e ?? getOriginalCwdOrNull();
  return n !== null && isPathPersistedTrusted(n);
}
//@ chunk-aepeg2w5.js:79490-79525 facade-majority
function isPathPersistedTrusted(e) {
  return isTrustKeyPersistedTrusted(getPersistedTrustKeyForPath(e));
}
//@ chunk-aepeg2w5.js:79525-79565 layout
function getGlobalConfigForTrust() {
  return isDiskless() || ignoresPersistedTrust() ? {} : getGlobalConfig();
}
//@ chunk-aepeg2w5.js:79565-79748 facade-majority
var PERSISTED_TRUST_IGNORED =
  "no workspace trust record counts in this process, because CLAUDE_CODE_IGNORE_PERSISTED_TRUST is set (a self-hosted runner sets it when started with --trust-workspace false)";
//@ chunk-aepeg2w5.js:79748-79776 facade-majority
function ignoresPersistedTrust() {
  return Kso();
}
//@ chunk-aepeg2w5.js:79776-79866 facade-majority = computeTrustDialogAccepted (1)
function isTrustKeyPersistedTrusted(e) {
  if (isRestrictedWorkspaceTrustKey(e)) return !1;
  return getGlobalConfigForTrust().projects?.[e]?.hasTrustDialogAccepted === !0;
}
//@ chunk-aepeg2w5.js:79866-79901 placement
function getWorkspacePersistedTrustKey(e) {
  return getPersistedTrustKeyForPath(e ?? getOriginalCwd());
}
//@ chunk-aepeg2w5.js:79901-79945 facade-majority
function getPersistedTrustKeyForPath(e) {
  return normalizePathForConfigKey(eA(e) ?? Mn(resolve(e)));
}
//@ chunk-aepeg2w5.js:79945-80005 facade-majority
function isPathPersistedTrustedCwdExact(e) {
  if (findGitRootUncached(e) !== null) return !1;
  return isTrustKeyPersistedTrusted(getPersistedTrustKeyForExactPath(e));
}
//@ chunk-aepeg2w5.js:80005-80042 facade-majority
function getPersistedTrustKeyForExactPath(e) {
  return normalizePathForConfigKey(Mn(resolve(e)));
}
//@ chunk-aepeg2w5.js:80042-80265 facade-majority
async function persistedTrustKeyThroughBackend(e, n) {
  if (e.hostFiles.serving("workspace") !== "host") return;
  let r = resolve(n),
    s = await findGitRootThroughBackendUncached(e.hostFiles, r);
  if (s === void 0) return;
  if (s.gitRoot === null) return normalizePathForConfigKey(Mn(r));
  return s.entry === "directory" ? normalizePathForConfigKey(s.gitRoot) : void 0;
}
//@ chunk-aepeg2w5.js:80265-80398 facade-majority
async function workspacePersistedTrustThroughBackend(e) {
  try {
    let n = getOriginalCwdOrNull();
    if (n === null) return !1;
    let r = await persistedTrustKeyThroughBackend(e, n);
    return r === void 0 ? void 0 : isTrustKeyPersistedTrusted(r);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-aepeg2w5.js:80398-80626 facade-majority
function isLocalSettingsGitTracked({ onIndeterminate: onIndeterminate }) {
  if (hasNoProjectDir() || isDiskless()) return !0;
  if (!checkHasTrustDialogAccepted()) {
    if (
      isCwdHomeOrConfigDir() &&
      getProjectConfigRoot() === null &&
      resolveLocalSettingsStoreRoot(getOriginalCwd(), GD) === resolve(getOriginalCwd())
    )
      return !1;
    return !0;
  }
  let n = getLocalSettingsGitTrackedStatus();
  if (n === "indeterminate") return onIndeterminate === "tracked";
  return n === "tracked" || n === "tracked_in_index";
}
//@ chunk-aepeg2w5.js:80626-80697 facade-majority
function isLocalSettingsGitTrackedInIndex() {
  if (isDiskless() || !checkHasTrustDialogAccepted()) return !1;
  return getLocalSettingsGitTrackedStatus() === "tracked_in_index";
}
//@ chunk-aepeg2w5.js:80697-80881 layout
function getLocalSettingsGitTrackedStatus() {
  let e = getConfigState(),
    n = getOriginalCwd(),
    r = e.localSettingsGitTracked?.cwd === n ? e.localSettingsGitTracked.value : void 0;
  if (r === void 0)
    ((r = computeLocalSettingsGitTracked()), e.setLocalSettingsGitTracked({ cwd: n, value: r }));
  return r;
}
//@ chunk-aepeg2w5.js:80881-80936 facade-majority
function resetLocalSettingsGitTrackedCache() {
  getConfigState().setLocalSettingsGitTracked(void 0);
}
//@ chunk-aepeg2w5.js:80936-81074 layout
function isCwdHomeOrConfigDir() {
  let e = getOriginalCwd(),
    n = getFsImplementation();
  try {
    if (n.realpathSync(resolve(e)) === n.realpathSync(homedir())) return !0;
  } catch {}
  return resolve(getClaudeConfigDir()) === resolve(join(e, ".claude"));
}
//@ chunk-aepeg2w5.js:81074-81357 layout
function computeLocalSettingsGitTracked() {
  let e = getOriginalCwd(),
    n = getProjectConfigRoot(),
    r = n ?? e,
    s = [r],
    h = n ?? resolveLocalSettingsStoreRoot(e, GD);
  if (h !== resolve(r)) s.push(h);
  let y = !1,
    S = !1;
  for (let w of s) {
    let R = checkLocalSettingsTrackedAt(w);
    if (R === "tracked_in_index") return "tracked_in_index";
    if (R === "tracked") y = !0;
    if (R === "indeterminate") S = !0;
  }
  if (y) return "tracked";
  return S ? "indeterminate" : "untracked";
}
//@ chunk-aepeg2w5.js:81357-82524 layout
function checkLocalSettingsTrackedAt(e) {
  let n = getFsImplementation();
  try {
    if (n.realpathSync(resolve(e)) === n.realpathSync(homedir())) return "untracked";
  } catch {}
  if (resolve(getClaudeConfigDir()) === resolve(join(e, ".claude"))) return "untracked";
  for (let r of [join(e, ".claude"), join(e, ".claude", "settings.local.json")])
    try {
      if (n.lstatSync(r).isSymbolicLink()) return "tracked";
    } catch (error) {
      if (!isENOENT(error)) return "tracked";
    }
  try {
    return (n.lstatSync(join(e, ".claude", ".git")), "tracked");
  } catch (error) {
    if (!isENOENT(error)) return "tracked";
  }
  if (dY(e, { uncached: !0 }) !== null) return "tracked";
  if (Tv()) return "tracked";
  try {
    let r = importMetaRequire("child_process"),
      s = require("./chunk-qnq0c0a0.js"),
      executableSafely = s.resolveExecutableSafely("git"),
      y = getRemoteHostSessionCount({
        GIT_LITERAL_PATHSPECS: "",
        GIT_TRACE2: "0",
        GIT_TRACE2_PERF: "0",
        GIT_TRACE2_EVENT: "0",
      });
    if (executableSafely === null || fje(executableSafely, y)) return "untracked";
    let spawnSync = r.spawnSync(
      executableSafely,
      [...freeze_4, "-C", e, "ls-files", "--error-unmatch", "--", ":(icase).claude/settings.local.json"],
      { cwd: e, encoding: "utf8", timeout: 2000, windowsHide: !0, env: y },
    );
    if (spawnSync.error && isENOENT(spawnSync.error)) return "untracked";
    if (spawnSync.signal !== null || spawnSync.error) return "tracked";
    if (spawnSync.status === 128)
      return /^fatal: not a git repository/.test(spawnSync.stderr ?? "") ? "indeterminate" : "tracked";
    if (spawnSync.status === 0) return "tracked_in_index";
    if (spawnSync.status === 1) return "untracked";
    return "tracked";
  } catch {
    return "untracked";
  }
}
//@ chunk-aepeg2w5.js:82524-82688 layout = computeTrustDialogAccepted (0.778)
function computeTrustDialogAccepted_2() {
  if (env.CLAUDE_CODE_SANDBOXED) return !0;
  if (getSessionTrustAccepted()) return !0;
  let config = getGlobalConfigForTrust(),
    projectPath = getProjectPathForConfig();
  if (config.projects?.[projectPath]?.hasTrustDialogAccepted) return !0;
  return findTrustedAncestor(config, getOriginalCwd()) !== null;
}
//@ chunk-aepeg2w5.js:82688-82870 file-local
function findTrustedAncestor(e, n) {
  let r = Mn(resolve(n)),
    currentPath = persistedTrustBoundary(r);
  if (currentPath?.rootOnly) {
    let parentPath = normalizePathForConfigKey(resolve(currentPath.root));
    return e.projects?.[parentPath]?.hasTrustDialogAccepted === !0 ? parentPath : null;
  }
  return computeTrustDialogAccepted(
    e,
    r,
    currentPath !== null ? normalizePathForConfigKey(resolve(currentPath.root)) : null,
  );
}
//@ chunk-aepeg2w5.js:82870-83055 facade-majority
function persistedTrustBoundary(e) {
  let n = Mn(resolve(e)),
    r = findNearestRoot(n, { uncached: !0 });
  if (r !== null && isHomeDirRoot(r.root, { uncached: !0 }) !== !0) return { root: r.root, rootOnly: !0 };
  let s = findGitRootUncached(n);
  return s !== null ? { root: s, rootOnly: !1 } : null;
}
//@ chunk-aepeg2w5.js:83055-83289 layout = computeTrustDialogAccepted (1)
function computeTrustDialogAccepted(e, n, r) {
  let currentPath = normalizePathForConfigKey(n);
  while (!0) {
    if (!(r === null || currentPath === r || currentPath.startsWith(r.endsWith("/") ? r : r + "/")))
      return null;
    if (e.projects?.[currentPath]?.hasTrustDialogAccepted) return currentPath;
    if (currentPath === r) return null;
    let parentPath = normalizePathForConfigKey(resolve(currentPath, ".."));
    if (parentPath === currentPath) return null;
    currentPath = parentPath;
  }
}
//@ chunk-aepeg2w5.js:83289-83404 facade-majority
function isPathTrusted(e, { advisoryNoFsProbe: n = !1 } = {}) {
  let r = getGlobalConfigForTrust();
  if (n) return computeTrustDialogAccepted(r, Mn(resolve(e)), null) !== null;
  return findPersistedTrustKey(e) !== null;
}
//@ chunk-aepeg2w5.js:83404-83511 facade-majority = computeTrustDialogAccepted (1)
function findPersistedTrustKey(e) {
  let config = getGlobalConfigForTrust(),
    currentPath = getWorkspacePersistedTrustKey(e);
  if (config.projects?.[currentPath]?.hasTrustDialogAccepted === !0) return currentPath;
  return findTrustedAncestor(config, e);
}
//@ chunk-aepeg2w5.js:83511-83579 facade-majority
function isPathTrustedForSession(e) {
  if (env.CLAUDE_CODE_SANDBOXED) return checkHasTrustDialogAccepted();
  return isPathTrusted(e);
}
//@ chunk-aepeg2w5.js:83579-83620 facade-majority
function setPathTrusted(e, n) {
  return saveGlobalConfig(makeTrustAcceptedUpdater(getWorkspacePersistedTrustKey(e)), n);
}
//@ chunk-aepeg2w5.js:83620-83661 facade-majority
function setPathTrustedDurably(e, n) {
  return saveGlobalConfigDurably(makeTrustAcceptedUpdater(getWorkspacePersistedTrustKey(e)), n);
}
//@ chunk-aepeg2w5.js:83661-83835 layout = computeTrustDialogAccepted (1)
function makeTrustAcceptedUpdater(e) {
  return (n) => {
    if (n.projects?.[e]?.hasTrustDialogAccepted) return n;
    return {
      ...n,
      projects: {
        ...n.projects,
        [e]: { ...(n.projects?.[e] ?? DEFAULT_PROJECT_CONFIG), hasTrustDialogAccepted: !0 },
      },
    };
  };
}
//@ chunk-aepeg2w5.js:83835-83887 facade-majority
function _setUseRealConfigPipelineForTesting(e) {
  getConfigState().setUseRealPipelineUnderTest(e);
}
//@ chunk-aepeg2w5.js:83887-83910 layout
function isTestConfigMode() {
  return !1;
}
//@ chunk-aepeg2w5.js:83910-83949 facade-majority
function isProjectConfigKey(key) {
  return PROJECT_CONFIG_KEYS.includes(key);
}
/**
 * 新读到的配置相对缓存是否丢失了 oauthAccount 或 hasCompletedOnboarding（防止并发写抹掉登录态）。
 */
//@ chunk-aepeg2w5.js:83949-84133 fingerprint = wouldLoseAuthState (0.837)
function wouldLoseAuthState(fresh) {
  let cached = getConfigState().cache.config;
  if (!cached) return !1;
  let r = cached.oauthAccount !== void 0 && fresh.oauthAccount === void 0,
    s = cached.hasCompletedOnboarding === !0 && fresh.hasCompletedOnboarding !== !0;
  return r || s;
}
/**
 * 低风险的全局配置键集合（启动次数、使用计数、提示次数等），变化时不需要严格处理。
 */
//@ chunk-aepeg2w5.js:84133-85853 layout
var LOW_STAKES_GLOBAL_CONFIG_KEYS = new Set([
    "numStartups",
    "skillUsage",
    "pluginUsage",
    "memoryUsageCount",
    "promptQueueUseCount",
    "btwUseCount",
    "queuedCommandUpHintCount",
    "lspRecommendationIgnoredCount",
    "promptSuggestionUnusedStreak",
    "tipsHistory",
    "tipLifetimeShownCounts",
    "tipsHistoryByCommand",
    "seenNotifications",
    "announcementImpressions",
    "savedModelSuccessorShown",
    "seenSecurityWarnings",
    "subagentConfigWarningShown",
    "subagentConfigChecks",
    "subagentConfigClassifierCalls",
    "lastShownEmergencyTip",
    "subscriptionNoticeCount",
    "subscriptionUpsellShownCount",
    "passesUpsellSeenCount",
    "fullscreenUpsellSeenCount",
    "fullscreenDownsellSeenCount",
    "voiceLangHintShownCount",
    "voiceFooterHintSeenCount",
    "experimentNoticesSeenCount",
    "cachedGrowthBookFeatures",
    "cachedGrowthBookFeaturesAt",
    "cachedArtifactRoster",
    "artifactRosterDenied",
    "promoStartupStatusCache",
    "groveChoiceSeenAt",
    "unusedLimitResetStatusCache",
    "apiCreditLinkStatusCache",
    "cachedDynamicConfigs",
    "cachedExperimentFeatures",
    "cachedExperimentData",
    "mcpLegacyKeyOwners",
    "firstStartTime",
    "claudeCodeFirstTokenDate",
    "startupPrefetchedAt",
    ...[],
  ]),
  LOW_STAKES_PROJECT_CONFIG_KEYS = new Set([
    "lastCost",
    "lastAPIDuration",
    "lastAPIDurationWithoutRetries",
    "lastToolDuration",
    "lastDuration",
    "lastStartTime",
    "lastLinesAdded",
    "lastLinesRemoved",
    "lastTotalInputTokens",
    "lastTotalOutputTokens",
    "lastTotalCacheCreationInputTokens",
    "lastTotalCacheReadInputTokens",
    "lastTotalWebSearchRequests",
    "lastFpsAverage",
    "lastFpsLow1Pct",
    "lastSessionId",
    "lastGracefulShutdown",
    "lastVersionBase",
    "lastModelUsage",
    "lastSessionMetrics",
    "exampleFiles",
    "exampleFilesGeneratedAt",
    "seenTeamArtifactPaths",
    "hasUnseenTeamArtifacts",
    "hasClaudeMdExternalIncludesWarningShown",
    "history",
    "projectOnboardingSeenCount",
    "hasCompletedProjectOnboarding",
    "devIntentsDetected",
  ]);
//@ chunk-aepeg2w5.js:85853-85983 layout
function changedConfigKeys(e, n) {
  let r = new Set([...Object.keys(e), ...Object.keys(n)]),
    s = [];
  for (let h of r) if (jsonStringify(e[h]) !== jsonStringify(n[h])) s.push(h);
  return s;
}
//@ chunk-aepeg2w5.js:85983-86045 layout
function Xh(e, n) {
  return changedConfigKeys(e ?? {}, n ?? {}).every((r) => LOW_STAKES_PROJECT_CONFIG_KEYS.has(r));
}
//@ chunk-aepeg2w5.js:86045-86188 layout
function isOnlyCrashMarkerChange(e, n) {
  let r = changedConfigKeys(e, n);
  return (
    n.lastGracefulShutdown === !1 &&
    r.length > 0 &&
    r.every((s) => s === "lastGracefulShutdown" || s === "lastVersionBase")
  );
}
//@ chunk-aepeg2w5.js:86188-86211 facade-majority
var CONFIG_CRASH_MARKER_REENQUEUE_DELAYS_MS = [30000, 120000];
/**
 * 判断全局配置的改动是否只涉及低风险键：projects 下逐个项目比较，其余键必须都在 LOW_STAKES_GLOBAL_CONFIG_KEYS 里。
 */
//@ chunk-aepeg2w5.js:86211-86415 layout = getProjectsDir (0.798)
function isLowStakesConfigChange(e, n) {
  return changedConfigKeys(e, n).every((r) => {
    if (r === "projects") {
      let s = e.projects ?? {},
        h = n.projects ?? {};
      return [...new Set([...Object.keys(s), ...Object.keys(h)])].every((S) => Xh(s[S], h[S]));
    }
    return LOW_STAKES_GLOBAL_CONFIG_KEYS.has(r);
  });
}
/**
 * 经存储层读取全局配置，失败时记录并以默认值继续。
 */
//@ chunk-aepeg2w5.js:86415-86870 layout
async function readGlobalConfigFromStorage(e) {
  let n = getConfigState(),
    text = await e.readText([STORAGE_SPACES.globalConfig()]);
  if (!text.ok)
    return (
      logForDebugging(
        `Config read through storage failed; continuing from defaults: ${formatStorageError(text.error)}`,
        { level: "error" },
      ),
      n.setLastGetConfigOutcome("enoent"),
      createDefaultGlobalConfig()
    );
  let s = text.value.items[0];
  if (!s?.found) return (n.setLastGetConfigOutcome("enoent"), createDefaultGlobalConfig());
  try {
    let h = jsonParse(Wo(s.value));
    return (n.setLastGetConfigOutcome("parsed"), { ...createDefaultGlobalConfig(), ...h });
  } catch {
    return (n.setLastGetConfigOutcome("parse-error"), createDefaultGlobalConfig());
  }
}
/**
 * 回退写配置时取基准配置：最近一次读取为解析错误或读错误时改用调用方给的或缓存的配置（标记 cacheDerived/readRejected），否则用新读到的配置。
 */
//@ chunk-aepeg2w5.js:86870-87306 layout
async function readConfigForFallbackWrite(e, n) {
  let r = getConfigState(),
    s =
      isStorageV5Enabled() && n !== void 0
        ? await readGlobalConfigFromStorage(n)
        : await readGlobalConfigWithRetry(),
    h = r.lastGetConfigOutcome === "read-error";
  if (r.lastGetConfigOutcome === "parse-error" || r.lastGetConfigOutcome === "read-error") {
    if (e) return { config: { ...e }, cacheDerived: !0, readRejected: h };
    if (r.cache.config) return { config: { ...r.cache.config }, cacheDerived: !0, readRejected: h };
    return { config: s, cacheDerived: !0, readRejected: h };
  }
  return { config: s, cacheDerived: !1, readRejected: !1 };
}
//@ chunk-aepeg2w5.js:87306-87351 layout
var GLOBAL_CONFIG = "global-config",
  EXTERNAL_REFRESH = "external-refresh";
//@ chunk-aepeg2w5.js:87351-87415 layout
function Jh(e) {
  getConfigState().writeQueues.run(EXTERNAL_REFRESH, () => refreshGlobalConfigFromDisk(e).catch(() => {}));
}
//@ chunk-aepeg2w5.js:87415-87637 layout
function runQueuedConfigWrite(e) {
  let n = getConfigState();
  return (
    n.beginPendingWrite(),
    n.writeQueues.run(GLOBAL_CONFIG, async () => {
      try {
        return await e();
      } finally {
        if (n.endPendingWrite() === 0) {
          let takePendingExternalRefresh = n.takePendingExternalRefresh();
          if (takePendingExternalRefresh === "storage") scheduleExternalConfigRefresh();
          else if (takePendingExternalRefresh) Jh(takePendingExternalRefresh);
        }
      }
    })
  );
}
//@ chunk-aepeg2w5.js:87637-87684 facade-majority
function drainConfigWrites() {
  return getConfigState().writeQueues.drain();
}
//@ chunk-aepeg2w5.js:87684-87693 layout
registerWriteQueueDrain(drainConfigWrites);
//@ chunk-aepeg2w5.js:87693-87828 layout
function applyOptimisticConfigUpdate(e) {
  let n = getConfigState(),
    config = n.cache.config;
  if (!config) return null;
  try {
    let s = e(config);
    if (s === config) return config;
    n.applyOptimistic(stripRetiredConfigKeys(s));
  } catch {}
  return config;
}
/**
 * 判断配置写入是否只能留在内存（存储 V5 下未交接的写入者）。
 */
//@ chunk-aepeg2w5.js:87828-88364 layout
function isConfigWriteMemoryOnly(e, n) {
  if (isStorageV5Enabled() && e !== void 0) return !1;
  if (isStorageV5Enabled() && getConfigState().unhandedWritesInMemory)
    return (
      logFeatureSad("storage_v5_backend", "unhanded_config_writer"),
      logForDebugging(
        `config: ${n} ran without the storage backend in a process whose config record has no file behind it; the change is in memory only and is replaced when a backend-handed save or refresh rebuilds the config from the record`,
        { level: "warn" },
      ),
      !0
    );
  if (isDiskless())
    return (
      logForDebugging(
        `config: ${n} ran in a diskless process with no storage backend to write through; the change is in memory only`,
        { level: "warn" },
      ),
      !0
    );
  return !1;
}
/**
 * 在文件锁下读-改-写 ~/.claude.json；锁失败时走回退写，但若重读结果丢失了缓存里有的 oauthAccount/hasCompletedOnboarding 则拒绝写入（tengu_config_auth_loss_prevented，见 GH #3117）。
 */
//@ chunk-aepeg2w5.js:88364-88415 facade-majority
function saveGlobalConfig(e, n) {
  return saveGlobalConfigQueued(e, n).then(() => {
    return;
  });
}
//@ chunk-aepeg2w5.js:88415-88461 facade-majority
function saveGlobalConfigDurably(e, n) {
  return saveGlobalConfigQueued(e, n).catch(() => !1);
}
/**
 * 保存全局配置：先在内存缓存上乐观应用更新函数，再在 global-config 写队列中加锁写盘（saveGlobalConfig）；diskless/无后端时只改内存。
 */
//@ chunk-aepeg2w5.js:88461-88825 layout
function saveGlobalConfigQueued(e, n) {
  let r = getConfigState();
  if (isTestConfigMode()) {
    let y = e(r.testGlobalConfig);
    if (y === r.testGlobalConfig) return Promise.resolve(!0);
    return (r.overwriteTestGlobalConfig(y), Promise.resolve(!0));
  }
  let s = applyOptimisticConfigUpdate((y) => {
    let S = e(y);
    if (S === y) return y;
    return { ...S, projects: mergeProjectsForSave(y.projects, S.projects) };
  });
  if (isConfigWriteMemoryOnly(n, "saveGlobalConfig")) return Promise.resolve(!1);
  let h = getBootSaveRetrySignal(r);
  return runQueuedConfigWrite(() => saveGlobalConfig_2(e, s, n, h));
}
//@ chunk-aepeg2w5.js:88825-90196 fingerprint = saveGlobalConfig (0.49)
async function saveGlobalConfig_2(e, n, r, s) {
  let h = getConfigState(),
    written = null,
    S = !1,
    w = !1;
  try {
    let R = await saveConfigWithLock(
      (current) => {
        let config = e(current);
        if (config === current) return ((S = !0), current);
        return (
          (written = stripRetiredConfigKeys({
            ...config,
            projects: mergeProjectsForSave(current.projects, config.projects),
          })),
          written
        );
      },
      n,
      { onCompromised: () => (w = !0), lockRetrySignal: s },
      r,
    );
    if (R && written) writeThroughConfigCache(written);
    return (R || S) && !w;
  } catch (error) {
    logForDebugging(`Failed to save config with lock: ${error}`, { level: "error" });
    let x = await readConfigForFallbackWrite(n, r);
    if (x.readRejected) return (logConfigFallbackSuppressedUnreadable("save_global"), !1);
    let config = x.config,
      config_2 = e(config);
    if (config_2 === config) return !0;
    let L = { ...config_2, projects: mergeProjectsForSave(config.projects, config_2.projects) };
    if (
      ((written = stripRetiredConfigKeys(L)),
      Jn(error) && !x.cacheDerived && isLowStakesConfigChange(config, L))
    )
      return (logConfigFallbackSkippedContention("save_global"), !1);
    if (wouldLoseAuthState(config) && wouldLoseAuthState(written)) {
      let pendingWriteCount = h.pendingWriteCount();
      if (pendingWriteCount > 1 && Jn(error))
        logForDebugging(
          "saveGlobalConfig fallback under contention: proceeding on the base as-is (fresh disk on a clean read; the snapshot copy on a torn read); the write queued behind carries the pending auth. See GH #3117 / gh-73364.",
        );
      else if (pendingWriteCount > 1 && n) {
        if (
          (logForDebugging(
            "saveGlobalConfig fallback: merge base is missing auth the cache has, but an in-process write is queued behind this one; re-basing on the enqueue-time cache snapshot so the pending auth and this write both land. See GH #3117.",
          ),
          (config = { ...n }),
          (config_2 = e(config)),
          config_2 === config)
        )
          return !0;
        written = stripRetiredConfigKeys({
          ...config_2,
          projects: mergeProjectsForSave(config.projects, config_2.projects),
        });
      } else
        return (
          logForDebugging(
            "saveGlobalConfig fallback: re-read config is missing auth that cache has; refusing to write. See GH #3117.",
            { level: "error" },
          ),
          logEvent("tengu_config_auth_loss_prevented", {}),
          !1
        );
    }
    return (await saveConfig(written, "save_global", r), !1);
  }
}
//@ chunk-aepeg2w5.js:90196-90339 fingerprint = reportConfigCacheStats (0.798)
function reportConfigCacheStats() {
  let { hits: hits, misses: misses } = getConfigState().takeCacheStats(),
    total = hits + misses;
  if (total > 0)
    logEvent("tengu_config_cache_stats", { cache_hits: hits, cache_misses: misses, hit_rate: hits / total });
}
//@ chunk-aepeg2w5.js:90339-90359 layout
registerCleanup(async () => {
  reportConfigCacheStats();
});
/**
 * 旧字段迁移：删 showSpinnerTree；由 autoUpdaterStatus 推出 installMethod/autoUpdates。
 */
//@ chunk-aepeg2w5.js:90359-90653 fingerprint = migrateConfigFields (0.723)
function migrateConfigFields(config) {
  if ((delete config.showSpinnerTree, config.installMethod !== void 0)) return config;
  let legacy = config,
    installMethod = "unknown",
    autoUpdates = config.autoUpdates ?? !0;
  switch (legacy.autoUpdaterStatus) {
    case "migrated":
      installMethod = "local";
      break;
    case "disabled":
      autoUpdates = !1;
      break;
    case "enabled":
      installMethod = "global";
      break;
    case void 0:
      break;
  }
  return { ...config, installMethod: installMethod, autoUpdates: autoUpdates };
}
/**
 * 写盘前删除已退役的键（opus1mMergeNoticeSeenCount、speculationEnabled、prideFlag 等），没有时原样返回。
 */
//@ chunk-aepeg2w5.js:90653-91282 affinity
function stripRetiredConfigKeys(e) {
  let n = e;
  if (
    n.opus1mMergeNoticeSeenCount === void 0 &&
    n.voiceNoticeSeenCount === void 0 &&
    n.opus47LaunchSeenCount === void 0 &&
    n.opus48LaunchSeenCount === void 0 &&
    n.speculationEnabled === void 0 &&
    n.fleetViewPeakConcurrent === void 0 &&
    n.pluginUsageLspGraceApplied === void 0 &&
    n.autoModeOptInDismissed === void 0 &&
    n.prideFlag === void 0 &&
    n.routineFiredWatermark === void 0
  )
    return e;
  let {
    opus1mMergeNoticeSeenCount: opus1mMergeNoticeSeenCount,
    voiceNoticeSeenCount: voiceNoticeSeenCount,
    opus47LaunchSeenCount: opus47LaunchSeenCount,
    opus48LaunchSeenCount: opus48LaunchSeenCount,
    speculationEnabled: speculationEnabled,
    fleetViewPeakConcurrent: fleetViewPeakConcurrent,
    pluginUsageLspGraceApplied: pluginUsageLspGraceApplied,
    autoModeOptInDismissed: autoModeOptInDismissed,
    prideFlag: prideFlag,
    routineFiredWatermark: routineFiredWatermark,
    ...L
  } = n;
  return L;
}
//@ chunk-aepeg2w5.js:91688-91843 sole-consumer
function mergeProjectsForSave(e, n) {
  if (n === e || !e) return shouldShowProjectOnboarding(n);
  if (!n) return shouldShowProjectOnboarding(e);
  let r = n;
  for (let [s, h] of Object.entries(e))
    if (!(s in n)) {
      if (r === n) r = { ...n };
      r[s] = h;
    }
  return shouldShowProjectOnboarding(r);
}
//@ chunk-aepeg2w5.js:91843-91871 sole-consumer
var fc = 1000,
  VI = 60000,
  YI = 200;
/**
 * 启动对 ~/.claude.json 的外部修改监视（事件监视或 fs.watchFile 轮询）：文件更新且无待写入时刷新内存配置，有待写入时延后刷新。
 */
//@ chunk-aepeg2w5.js:91871-92291 affinity
function startGlobalConfigFreshnessWatcher() {
  let e = getConfigState();
  if (e.freshnessWatcherStarted) return;
  if (uo()) return;
  e.setFreshnessWatcherStarted(!0);
  let n = getGlobalClaudeFile(),
    r = (s) => {
      if (s.mtimeMs <= e.cache.mtime) return;
      if (e.pendingWriteCount() > 0) {
        e.deferExternalRefresh(s);
        return;
      }
      Jh(s);
    };
  if (uQt())
    e.setFreshnessEventWatch(
      new FileStatWatcher(n, { fallbackPollMs: fc, safetyPollMs: VI, settleMs: YI }, r),
    );
  else NMn(n, { interval: fc, persistent: !1 }, r);
  registerCleanup(async () => {
    (stopGlobalConfigFreshnessWatcher(e), e.setFreshnessBackend(void 0));
  });
}
//@ chunk-aepeg2w5.js:92291-92446 facade-majority
function rechooseGlobalConfigFreshnessWatcher() {
  let e = getConfigState();
  if (!e.freshnessWatcherStarted || uQt() === (e.freshnessEventWatch !== void 0)) return;
  if (
    (stopGlobalConfigFreshnessWatcher(e),
    startGlobalConfigFreshnessWatcher(),
    e.freshnessEventWatch === void 0)
  )
    scheduleExternalConfigRefresh();
}
//@ chunk-aepeg2w5.js:92446-92567 layout
function stopGlobalConfigFreshnessWatcher(e) {
  (e.freshnessEventWatch?.close(),
    e.setFreshnessEventWatch(void 0),
    unwatchFile(getGlobalClaudeFile()),
    e.setFreshnessWatcherStarted(!1));
}
//@ chunk-aepeg2w5.js:92567-92622 layout
function uo() {
  return isDiskless() || (isStorageV5Enabled() && !getConfigState().fileWatchFallback);
}
//@ chunk-aepeg2w5.js:92622-92791 layout
function logGlobalConfigUnwatched() {
  (logForDebugging(
    "Not watching ~/.claude.json for other processes: the fs.watchFile fallback is off for this process",
    { level: "warn" },
  ),
    logForDiagnosticsNoPII("warn", "global_config_unwatched"));
}
//@ chunk-aepeg2w5.js:92791-92974 layout
async function refreshGlobalConfigFromDisk(e) {
  let n = getConfigState(),
    r = getGlobalClaudeFile(),
    s;
  try {
    s = await getFsImplementation().readFile(r, { encoding: "utf-8" });
  } catch {
    return;
  }
  if (isStorageV5Enabled() && n.freshnessBackend !== void 0 && !n.freshnessWatcherStarted) return;
  installGlobalConfigFromDisk(s, e, e);
}
//@ chunk-aepeg2w5.js:92974-93199 callgraph-witnessed = startGlobalConfigFreshnessWatcher (0.213)
function installGlobalConfigFromDisk(e, n, r) {
  let file = getConfigState();
  if (n.mtimeMs <= file.cache.mtime) return;
  if (file.pendingWriteCount() > 0) {
    file.deferExternalRefresh(r);
    return;
  }
  let h = safeParseJSON(Wo(e), !1);
  if (h === null || typeof h !== "object") return;
  file.installDiskRead(migrateConfigFields({ ...createDefaultGlobalConfig(), ...h }), n);
}
//@ chunk-aepeg2w5.js:93199-93550 layout
async function checkGlobalConfigFreshness() {
  let freshnessBackend = getConfigState().freshnessBackend;
  if (isStorageV5Enabled() && freshnessBackend !== void 0) {
    let text = await freshnessBackend.readText([STORAGE_SPACES.globalConfig()]);
    if (!text.ok) return;
    let s = text.value.items[0];
    if (!s?.found) return;
    installGlobalConfigFromDisk(s.value, { mtimeMs: s.mtimeMs, size: s.totalBytes }, "storage");
    return;
  }
  if (uo()) return;
  let n;
  try {
    let stats = await getFsImplementation().stat(getGlobalClaudeFile());
    n = { mtimeMs: stats.mtimeMs, size: stats.size };
  } catch {
    return;
  }
  return refreshGlobalConfigFromDisk(n);
}
//@ chunk-aepeg2w5.js:93550-93612 layout
function scheduleExternalConfigRefresh() {
  getConfigState().writeQueues.run(EXTERNAL_REFRESH, () => checkGlobalConfigFreshness().catch(() => {}));
}
//@ chunk-aepeg2w5.js:93612-93941 facade-majority
async function watchGlobalConfigThroughStorage(e) {
  let n = getConfigState();
  if (e === void 0) {
    if (n.freshnessBackend !== void 0) detachGlobalConfigStorageBackend();
    return;
  }
  if (isStorageV5Enabled() && n.freshnessBackend === void 0 && n.freshnessWatcherStarted) {
    n.setFreshnessBackend(e);
    let r = await subscribeGlobalConfigViaStorage(e);
    if (n.freshnessBackend !== e) {
      r?.unsubscribe();
      return;
    }
    if (!r) {
      n.setFreshnessBackend(void 0);
      return;
    }
    (n.setFreshnessSubscription(r), stopGlobalConfigFreshnessWatcher(n));
  }
}
//@ chunk-aepeg2w5.js:93941-94293 layout
function detachGlobalConfigStorageBackend() {
  let e = getConfigState(),
    freshnessSubscription = e.freshnessSubscription;
  (e.setFreshnessBackend(void 0),
    e.setFreshnessSubscription(void 0),
    e.setLoadedVersion(void 0),
    startGlobalConfigWatcher(),
    freshnessSubscription?.unsubscribe(),
    logForDebugging(
      uo()
        ? "The startup storage backend was withdrawn; ~/.claude.json is now unwatched"
        : "The startup storage backend was withdrawn; watching ~/.claude.json with the fs.watchFile poll again",
    ));
}
//@ chunk-aepeg2w5.js:94293-94695 layout
async function subscribeGlobalConfigViaStorage(e) {
  let n;
  try {
    let subscribe = await e.subscribe(
      { target: "key", key: STORAGE_SPACES.globalConfig() },
      onGlobalConfigStorageEvent,
      { maxObservationLagMs: fc },
    );
    if (subscribe.ok)
      return (
        logForDebugging("Watching ~/.claude.json for other processes through the storage interface"),
        subscribe.value
      );
    n = formatStorageError(subscribe.error);
  } catch (error) {
    n = String(error);
  }
  let r = uo() ? "" : "; using the fs.watchFile poll";
  logForDebugging(`Watching ~/.claude.json through the storage interface failed${r}: ${n}`, {
    level: "warn",
  });
  return;
}
//@ chunk-aepeg2w5.js:94695-94832 layout
function startGlobalConfigWatcher() {
  let e = getConfigState();
  if (isCleanupStarted()) return;
  if (uo()) {
    if ((logGlobalConfigUnwatched(), e.freshnessBackend !== void 0)) scheduleExternalConfigRefresh();
    return;
  }
  (e.setFreshnessBackend(void 0), startGlobalConfigFreshnessWatcher(), scheduleExternalConfigRefresh());
}
//@ chunk-aepeg2w5.js:94832-95618 layout
function onGlobalConfigStorageEvent(e) {
  let n = getConfigState(),
    freshnessBackend = n.freshnessBackend;
  if (!isStorageV5Enabled() || freshnessBackend === void 0) return;
  if (!e.ok) {
    if (isCleanupStarted()) return;
    if (
      (logForDebugging(
        `Watching ~/.claude.json through the storage interface ended: ${formatStorageError(e.error)}`,
        { level: "warn" },
      ),
      n.setFreshnessSubscription(void 0),
      n.claimFreshnessResubscribe())
    )
      subscribeGlobalConfigViaStorage(freshnessBackend).then((h) => {
        if (n.freshnessBackend !== freshnessBackend) h?.unsubscribe();
        else if (h) n.setFreshnessSubscription(h);
        else startGlobalConfigWatcher();
      });
    else startGlobalConfigWatcher();
    return;
  }
  let s = e.value;
  switch (s.kind) {
    case "snapshot":
    case "created":
    case "updated":
      if (s.kind !== "snapshot" && s.origin === "self") return;
      if (s.kind === "snapshot" && n.loadedVersion !== void 0) {
        let loadedVersion = n.loadedVersion;
        if ((n.setLoadedVersion(void 0), "version" in s && s.version === loadedVersion)) return;
      }
      if (n.pendingWriteCount() > 0) {
        n.deferExternalRefresh("storage");
        return;
      }
      scheduleExternalConfigRefresh();
      return;
    case "deleted":
    case "appended":
    case "tombstoned":
      return;
  }
}
//@ chunk-aepeg2w5.js:95618-95724 layout
function writeThroughConfigCache(e) {
  let n = getConfigState();
  if (n.pendingWriteCount() > 1) {
    n.advanceFreshnessCursor();
    return;
  }
  n.writeThrough(e);
}
//@ chunk-aepeg2w5.js:95724-95774 facade-majority
function subscribeGlobalConfigInstalled(e) {
  return getConfigState().installed.subscribe(e);
}
/**
 * 返回内存中的全局配置（~/.claude.json），未启用配置前访问会抛 Config accessed before allowed；测试模式返回测试配置。
 */
//@ chunk-aepeg2w5.js:95774-95950 facade-majority = getGlobalConfig (0)
function getGlobalConfig() {
  let e = getConfigState();
  if (isTestConfigMode()) return e.testGlobalConfig;
  let cache = e.readCache();
  if (cache) return cache;
  if (!e.enableSettled) throw Error("Config accessed before allowed.");
  return migrateConfigFields(createDefaultGlobalConfig());
}
//@ chunk-aepeg2w5.js:95950-96009 facade-majority
async function readFreshOauthAccountFromDisk(e) {
  try {
    return await readOauthAccountFromDiskOrThrow(e);
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:96009-96370 facade-majority
async function readOauthAccountFromDiskOrThrow(e) {
  let n = await readGlobalConfigFromDiskOrThrow(e);
  if (typeof n !== "object" || n === null || !("oauthAccount" in n)) return;
  let oauthAccount = n.oauthAccount;
  if (oauthAccount === null || typeof oauthAccount !== "object") return;
  return {
    accountUuid:
      "accountUuid" in oauthAccount && typeof oauthAccount.accountUuid === "string"
        ? oauthAccount.accountUuid
        : void 0,
    organizationUuid:
      "organizationUuid" in oauthAccount && typeof oauthAccount.organizationUuid === "string"
        ? oauthAccount.organizationUuid
        : void 0,
  };
}
//@ chunk-aepeg2w5.js:96370-96809 facade-majority
async function readGlobalConfigFromDiskOrThrow(e) {
  if (isTestConfigMode()) return getConfigState().testGlobalConfig;
  let n;
  if (isStorageV5Enabled() && e !== void 0) {
    let text = await e.readText([STORAGE_SPACES.globalConfig()]);
    if (!text.ok) throw Error("global config not readable through storage");
    let h = text.value.items[0];
    if (!h?.found) return;
    n = h.value;
  } else if (isDiskless()) return;
  else
    try {
      n = await getFsImplementation().readFile(getGlobalClaudeFile(), { encoding: "utf-8" });
    } catch (error) {
      if (isENOENT(error)) return;
      throw error;
    }
  let r = safeParseJSON(Wo(n), !1);
  if (r === null) throw Error("global config not parseable");
  return r;
}
//@ chunk-aepeg2w5.js:96809-96843 facade-majority
function getExplicitRemoteControlAtStartup() {
  return resolveExplicitRemoteControlAtStartup().value;
}
//@ chunk-aepeg2w5.js:96843-97696 facade-majority
function resolveExplicitRemoteControlAtStartup() {
  let e = require("./chunk-0crvnfjy.js"),
    n = e.projectSettingsAliasesUserSettings()
      ? void 0
      : e.getSettingsForSourceTightenOnly("projectSettings")?.remoteControlAtStartup,
    r = e.getSettingsForSourceTightenOnly("localSettings")?.remoteControlAtStartup;
  if (n === !1 || r === !1) return { value: !1, source: "project_or_local_false" };
  let s = e.getSecuritySensitiveSettingWithSources("remoteControlAtStartup")[0],
    h = s === void 0 ? n9t("remoteControlAtStartup", getGlobalConfig().remoteControlAtStartup) : void 0,
    y =
      s !== void 0
        ? { value: s.value, source: TRUSTED_SOURCE_SHORT_NAMES[s.source] }
        : h !== void 0
          ? { value: h, source: "legacy_global_config" }
          : { value: void 0, source: "none" };
  if (y.value !== !0 && (n === !0 || r === !0))
    logForDebugging(
      `remoteControlAtStartup: true in ${n === !0 && r === !0 ? "project and local" : n === !0 ? "project" : "local"} settings ignored \u2014 repo-scoped settings cannot enable Remote Control; set it at user scope (/config)`,
    );
  return y;
}
//@ chunk-aepeg2w5.js:97696-97769 layout
var TRUSTED_SOURCE_SHORT_NAMES = { policySettings: "policy", flagSettings: "flag", userSettings: "user" };
/**
 * 某个自定义 API key（截断形式）在 customApiKeyResponses 中是 approved、rejected 还是 new。
 */
//@ chunk-aepeg2w5.js:97769-97804 facade-majority
function getCustomApiKeyStatus(e) {
  return customApiKeyStatusOf(getGlobalConfig(), e);
}
//@ chunk-aepeg2w5.js:97804-97935 facade-majority = getCustomApiKeyStatus (0.918)
function customApiKeyStatusOf(e, n) {
  let { approved: approved, rejected: rejected } = customApiKeyResponsesOf(e);
  if (approved.includes(n)) return "approved";
  if (rejected.includes(n)) return "rejected";
  return "new";
}
/**
 * 返回 customApiKeyResponses（approved/rejected 截断 key 列表）。
 */
//@ chunk-aepeg2w5.js:97935-98038 facade-majority = isCustomApiKeyApproved (0.816)
function customApiKeyResponsesOf(apiKey) {
  let customApiKeyResponses = apiKey.customApiKeyResponses;
  return {
    approved: stringArray(customApiKeyResponses?.approved),
    rejected: stringArray(customApiKeyResponses?.rejected),
  };
}
//@ chunk-aepeg2w5.js:98038-98093 facade-majority
var CONFIG_LOCK_RETRY_DELAYS_MS = [200, 400, 800, 1600, 3200, 4000],
  CONFIG_LOCK_BOOT_SAVE_RETRY_BUDGET_MS = 1500,
  QI = 30000;
//@ chunk-aepeg2w5.js:98093-98130 facade-majority
function markConfigBootPhaseComplete() {
  getConfigState().closeBootPhase();
}
//@ chunk-aepeg2w5.js:98130-98341 layout
function getBootSaveRetrySignal(e) {
  if (e.bootPhaseSignalForTesting !== void 0) return e.bootPhaseSignalForTesting;
  if (!e.bootPhaseStillOpen(QI)) return;
  let abortController = new AbortController();
  return (
    setTimeout((s) => s.abort(), CONFIG_LOCK_BOOT_SAVE_RETRY_BUDGET_MS, abortController).unref?.(),
    abortController.signal
  );
}
//@ chunk-aepeg2w5.js:98341-98362 facade-majority
var CONFIG_READ_RETRY_DELAYS_MS = [50, 150, 450];
//@ chunk-aepeg2w5.js:98362-98536 layout
async function readGlobalConfigWithRetry(e) {
  let n = getConfigState(),
    r = await getConfigWithOutcome(e),
    lastGetConfigOutcome = n.lastGetConfigOutcome;
  for (let h of CONFIG_READ_RETRY_DELAYS_MS) {
    if (lastGetConfigOutcome !== "read-error") break;
    (await sleep(h), (r = await getConfigWithOutcome(e)), (lastGetConfigOutcome = n.lastGetConfigOutcome));
  }
  return r;
}
//@ chunk-aepeg2w5.js:98536-98575 layout
function Jn(e) {
  return getErrnoCode(e) === "ELOCKED";
}
//@ chunk-aepeg2w5.js:98575-98586 facade-majority
var _isLockContentionErrorForTesting = Jn;
//@ chunk-aepeg2w5.js:98586-98906 layout
function logConfigFallbackSkippedContention(e, n = !1) {
  (logForDebugging(
    `Config lock still held by a live process after retries; skipping the unlocked fallback write (${e}) to avoid clobbering the lock holder${n ? " and re-enqueueing it through the locked path" : ""}. See gh-73364.`,
    { level: "error" },
  ),
    logEvent("tengu_config_fallback_skipped_contention", { caller: fromEnum(e), reenqueued: n }));
}
//@ chunk-aepeg2w5.js:98906-99209 layout
function logConfigFallbackSuppressedUnreadable(e) {
  (logForDebugging(
    `Config re-read was rejected (disk unreadable); suppressing the unlocked fallback write (${e}) \u2014 a memory-derived base may not be written without the lock. See the decision table at GetConfigOutcome.`,
    { level: "error" },
  ),
    logEvent("tengu_config_fallback_suppressed_unreadable", { caller: fromEnum(e) }));
}
//@ chunk-aepeg2w5.js:99209-99834 callgraph-witnessed = saveConfig (0.182)
async function saveConfig(file, config, defaultConfig) {
  writeThroughConfigCache(file);
  let s = !1;
  try {
    let filteredConfig = Do(
      file,
      (value, key) => jsonStringify(value) !== jsonStringify(DEFAULT_GLOBAL_CONFIG[key]),
    );
    if (isStorageV5Enabled() && defaultConfig !== void 0) {
      if (!isDiskless()) await getFsImplementation().mkdir(dirname(getGlobalClaudeFile()));
      let write = await defaultConfig.write(
        STORAGE_SPACES.globalConfig(),
        jsonStringify(filteredConfig, null, 2),
        { publishDiscipline: "followAtomic", mode: 384, precondition: { type: "none" } },
      );
      if (!write.ok)
        throw Error("Config fallback write through storage failed", {
          cause: formatStorageError(write.error),
        });
    } else {
      let y = getGlobalClaudeFile();
      (await getFsImplementation().mkdir(dirname(y)),
        await writeFileAtomic_2(y, jsonStringify(filteredConfig, null, 2), {
          encoding: "utf-8",
          mode: 384,
          allowSymlink: !0,
        }));
    }
    s = !0;
  } catch (error) {
    logForDebugging(`Config fallback write also failed; continuing without persisting: ${error}`, {
      level: "error",
    });
  }
  return (logEvent("tengu_config_fallback_write", { caller: fromEnum(config), disk_ok: s }), s);
}
//@ chunk-aepeg2w5.js:99834-99852 layout
var CONFIG_BACKUP_MIN_INTERVAL_MS = 60000,
  ny = 5;
//@ chunk-aepeg2w5.js:99852-100634 layout
async function backupGlobalConfig(e, n) {
  if (isStorageV5Enabled() && n !== void 0) {
    let h = await backupGlobalConfigViaStorage(n.backend, n.replaced, e).catch((y) => String(y));
    if (h !== void 0) logForDebugging(`Failed to backup config: ${h}`, { level: "error" });
    return;
  }
  let r = getGlobalClaudeFile(),
    s = getFsImplementation();
  try {
    let h = basename(r),
      y = getConfigBackupDir_2();
    try {
      await s.mkdir(y);
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
    let reverse = (await s.readdir(y))
        .map((L) => L.name)
        .filter((L) => L.startsWith(`${h}.backup.`))
        .sort()
        .reverse(),
      w = reverse[0],
      R = w ? Number(w.split(".backup.").pop()) : 0,
      P = (Number.isNaN(R) || Date.now() - R >= CONFIG_BACKUP_MIN_INTERVAL_MS) && !e;
    if (P) {
      let L = join(y, `${h}.backup.${Date.now()}`);
      await s.copyFile(r, L);
    }
    let F = P
      ? (await s.readdir(y))
          .map((L) => L.name)
          .filter((L) => L.startsWith(`${h}.backup.`))
          .sort()
          .reverse()
      : reverse;
    for (let L of F.slice(ny))
      try {
        await s.unlink(join(y, L));
      } catch {}
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      logForDebugging(`Failed to backup config: ${error}`, { level: "error" });
  }
}
//@ chunk-aepeg2w5.js:100634-100749 layout
async function getGlobalConfigFileMode(e) {
  let statMeta = await e.statMeta(STORAGE_SPACES.globalConfig());
  return statMeta.ok && statMeta.value.mode !== void 0 ? statMeta.value.mode : 384;
}
/**
 * 经存储层备份全局配置，按最小间隔控制备份频率。
 */
//@ chunk-aepeg2w5.js:100749-101164 layout
async function backupGlobalConfigViaStorage(e, n, r) {
  let s = await listGlobalConfigBackups(e);
  if (!s.ok) return s.error;
  let h = s.value,
    at = h.sort().at(-1),
    S = at ? Number(at) : 0;
  if ((Number.isNaN(S) || Date.now() - S >= CONFIG_BACKUP_MIN_INTERVAL_MS) && !r) {
    if (n === void 0) return;
    let R = String(Date.now()),
      write = await e.write(STORAGE_SPACES.globalConfigCopy("backup", R), n, {
        exactMode: await getGlobalConfigFileMode(e),
      });
    if (!write.ok) return formatStorageError(write.error);
    h.push(R);
  }
  for (let R of h.sort().reverse().slice(ny)) await e.delete(STORAGE_SPACES.globalConfigCopy("backup", R));
  return;
}
/**
 * 列出存储层中全局配置的各个副本键。
 */
//@ chunk-aepeg2w5.js:101164-101571 layout
async function listGlobalConfigCopies(e, n, r) {
  let s = [],
    h = await readAllPages(
      (y) => e.listEntries({ namespace: "globalConfig", kind: n }, { cursor: y, skipKeyStats: r }),
      (y) => {
        for (let S of y)
          if (S.kind === "key" && S.key.namespace === "globalConfig" && "kind" in S.key && S.key.kind === n)
            s.push({ stamp: S.key.stamp, size: S.size });
      },
    );
  switch (h.status) {
    case "done":
      return ok_2(s);
    case "error":
      return err(formatStorageError(h.error));
    case "capped":
      return err(`more than ${DEFAULT_MAX_PAGES} pages of copies`);
  }
}
//@ chunk-aepeg2w5.js:101571-101666 layout
async function listGlobalConfigBackups(e) {
  let n = await listGlobalConfigCopies(e, "backup", !0);
  return n.ok ? ok_2(n.value.map((r) => r.stamp)) : n;
}
/**
 * 对 ~/.claude.json 加 .lock 文件锁后读-改-写；锁等待过长记日志，锁被抢占时报 compromised；写前按间隔备份到 ~/.claude/backups。
 */
//@ chunk-aepeg2w5.js:101666-104445 fingerprint = saveConfigWithLock (0.489)
async function saveConfigWithLock(e, n, r, s) {
  let defaultConfig = getConfigState();
  if (isStorageV5Enabled() && s !== void 0) return saveConfigWithLockViaStorage(s, e, n);
  let y = getGlobalClaudeFile(),
    S = createDefaultGlobalConfig(),
    dir = dirname(y),
    fs = getFsImplementation();
  await fs.mkdir(dir);
  let release;
  try {
    let lockFilePath = `${y}.lock`,
      startTime = Date.now();
    for (let Se = 0; ; Se++)
      try {
        release = await lock(y, {
          lockfilePath: lockFilePath,
          onCompromised: (err) => {
            (r?.onCompromised?.(), logForDebugging(`Config lock compromised: ${err}`, { level: "error" }));
          },
        });
        break;
      } catch (error) {
        let ie = r?.lockRetrySignal;
        if (!Jn(error) || Se >= CONFIG_LOCK_RETRY_DELAYS_MS.length || ie?.aborted) throw error;
        await sleep(CONFIG_LOCK_RETRY_DELAYS_MS[Se] * (1 + Math.random()), ie);
      }
    let lockTime = Date.now() - startTime;
    if (lockTime > 100)
      (logForDebugging("Lock acquisition took longer than expected - another Claude instance may be running"),
        logEvent("tengu_config_lock_contention", { lock_time_ms: lockTime }));
    if (defaultConfig.lastReadFileStats)
      try {
        let stats = await fs.stat(y);
        if (
          stats.mtimeMs !== defaultConfig.lastReadFileStats.mtime ||
          stats.size !== defaultConfig.lastReadFileStats.size
        )
          logEvent("tengu_config_stale_write", {
            read_mtime: defaultConfig.lastReadFileStats.mtime,
            write_mtime: stats.mtimeMs,
            read_size: defaultConfig.lastReadFileStats.size,
            write_size: stats.size,
          });
      } catch (error) {
        logForDebugging(`Config stale-write stat failed: ${error}`);
      }
    let G = await readGlobalConfigWithRetry(),
      j = !1,
      ee = !1,
      config = defaultConfig.cache.config,
      Q = n ?? config;
    if (defaultConfig.lastGetConfigOutcome === "parse-error" && Q) {
      let Se = 0;
      try {
        Se = (await fs.stat(y)).size;
      } catch {}
      (logForDebugging(
        "saveConfigWithLock: re-read hit a parse error; auto-repairing from cached config under lock. See GH #3117.",
        { level: "error" },
      ),
        logEvent("tengu_config_auto_repaired", {
          file_size_before: Se,
          had_cached_auth:
            defaultConfig.cache.config?.oauthAccount !== void 0 ||
            defaultConfig.cache.config?.hasCompletedOnboarding === !0,
        }),
        (G = { ...Q }),
        (j = !0));
    } else if (wouldLoseAuthState(G)) ee = !0;
    let code = e(G);
    if (code === G && !j) return !1;
    if (ee && (wouldLoseAuthState(code) || defaultConfig.lastGetConfigOutcome === "read-error")) {
      let pendingWriteCount = defaultConfig.pendingWriteCount();
      if (
        pendingWriteCount > 1 &&
        (defaultConfig.lastGetConfigOutcome === "parsed" || defaultConfig.lastGetConfigOutcome === "enoent")
      )
        logForDebugging(
          "saveConfigWithLock: merge base is missing auth the cache has; an in-process write queued behind this one carries it and will land it under its own lock. Proceeding on the under-lock read. See GH #3117 / gh-73364.",
        );
      else if (pendingWriteCount > 1) {
        let ae = n ?? defaultConfig.cache.config;
        if (!ae)
          return (
            logForDebugging(
              "saveConfigWithLock: under-lock re-read was rejected and no re-base exists; refusing to write. See GH #3117.",
              { level: "error" },
            ),
            logEvent("tengu_config_auth_loss_prevented", {}),
            !1
          );
        (logForDebugging(
          "saveConfigWithLock: under-lock re-read was rejected (read-error) with a write queued behind; re-basing on the enqueue-time cache snapshot instead of the defaults base. See GH #3117 / gh-73364.",
        ),
          (G = { ...ae }),
          (code = e(G)));
      } else
        return (
          logForDebugging(
            "saveConfigWithLock: re-read config is missing auth that cache has; refusing to write to avoid wiping ~/.claude.json. See GH #3117.",
            { level: "error" },
          ),
          logEvent("tengu_config_auth_loss_prevented", {}),
          !1
        );
    }
    let currentConfig = Do(code, (value, key) => jsonStringify(value) !== jsonStringify(S[key]));
    return (
      await backupGlobalConfig(j),
      await writeFileAtomic_2(y, jsonStringify(currentConfig, null, 2), {
        encoding: "utf-8",
        mode: 384,
        allowSymlink: !0,
      }),
      !0
    );
  } finally {
    if (release)
      try {
        await release();
      } catch (mkdirErr) {
        let mkdirCode = getErrnoCode(mkdirErr);
        if (mkdirCode === "ERELEASED" || mkdirCode === "ENOTACQUIRED" || mkdirCode === "ECOMPROMISED")
          r?.onCompromised?.();
        logForDebugging(`Config lock release failed: ${mkdirErr}`, { level: "error" });
      }
  }
}
//@ chunk-aepeg2w5.js:104445-105146 layout
async function backupCorruptedConfig(e, n) {
  let r = `${basename(getGlobalClaudeFile())}.corrupted.`,
    s = await listGlobalConfigCopies(e, "corrupted", !1);
  if (!s.ok) {
    logForDebugging(`Could not back up corrupted config (${s.error}); continuing.`, { level: "error" });
    return;
  }
  for (let { stamp: stamp, size: size } of s.value) {
    if (size !== void 0 && size !== n.bytes.byteLength) continue;
    let text = await e.readText([STORAGE_SPACES.globalConfigCopy("corrupted", stamp)]),
      x = text.ok ? text.value.items[0] : void 0;
    if (x?.found && x.value === n.text) {
      process.stderr.write(cy);
      return;
    }
  }
  let h = String(Date.now()),
    write = await e.write(STORAGE_SPACES.globalConfigCopy("corrupted", h), n.bytes, {
      exactMode: await getGlobalConfigFileMode(e),
    });
  if (write.ok) {
    let S = join(getConfigBackupDir_2(), r + h);
    (logForDebugging(ly(S), { level: "error" }), process.stderr.write(dy(S)));
  } else
    logForDebugging(`Could not back up corrupted config (${formatStorageError(write.error)}); continuing.`, {
      level: "error",
    });
}
//@ chunk-aepeg2w5.js:105146-106042 layout
async function handleCorruptedConfig(e, n, r = !1) {
  let s = getConfigState();
  try {
    let h = getGlobalClaudeFile();
    (logForDebugging(uy(n.message), { level: "error" }),
      process.stderr.write(formatConfigCorruptedMessage(h, n.message)),
      await backupCorruptedConfig(e, n).catch((S) =>
        logForDebugging(`Could not back up corrupted config (${S}); continuing.`, { level: "error" }),
      ));
    let y = await findMostRecentBackup(e);
    if (y)
      process.stderr.write(
        getConfig(h, y) +
          `
`,
      );
    else
      process.stderr.write(`
`);
    if (r) {
      if (s.claimParseErrorLog())
        setImmediate(
          (S, w) => {
            try {
              logEvent("tengu_config_parse_error", {
                file_size: S,
                had_cached_auth: !1,
                has_timestamped_backup: w,
              });
            } catch {}
          },
          n.text.length,
          y !== null,
        );
      return;
    }
    if (!s.insideParseErrorTelemetry && s.claimParseErrorLog()) {
      s.setInsideParseErrorTelemetry(!0);
      try {
        let config = s.cache.config;
        logEvent("tengu_config_parse_error", {
          file_size: n.text.length,
          had_cached_auth: config?.oauthAccount !== void 0 || config?.hasCompletedOnboarding === !0,
          has_timestamped_backup: y !== null,
        });
      } finally {
        s.setInsideParseErrorTelemetry(!1);
      }
    }
  } catch (error) {
    logForDebugging(`Could not report the corrupt config: ${error}`, { level: "error" });
  }
}
//@ chunk-aepeg2w5.js:106042-106122 layout
async function nD(e, n, r) {
  (await handleCorruptedConfig(e, n), await backupGlobalConfig(r, { backend: e, replaced: n.bytes }));
}
//@ chunk-aepeg2w5.js:106122-106131 layout
var rD = 3;
/**
 * 存储 v5 下的 saveConfigWithLock：在存储后端原子 update 中读取 ~/.claude.json（记录读后被他人改写的遥测），解析失败时用缓存配置自动修复，会丢失登录态时拒绝写入，应用变更并写回；之后按需备份。
 */
//@ chunk-aepeg2w5.js:106131-109376 layout
async function saveConfigWithLockViaStorage(lockStore, updater, r) {
  let s = getConfigState(),
    h = createDefaultGlobalConfig(),
    now = Date.now(),
    S,
    w = (L) =>
      lockStore.update(
        STORAGE_SPACES.globalConfig(),
        (G) => {
          let j = [],
            ee = G === void 0 ? void 0 : textDecoder.decode(G.value);
          if (s.lastReadFileStats && G !== void 0) {
            let lastReadFileStats = s.lastReadFileStats,
              byteLength = G.value.byteLength;
            if (G.mtimeMs !== lastReadFileStats.mtime || byteLength !== lastReadFileStats.size)
              j.push(() =>
                logEvent("tengu_config_stale_write", {
                  read_mtime: lastReadFileStats.mtime,
                  write_mtime: G.mtimeMs,
                  read_size: lastReadFileStats.size,
                  write_size: byteLength,
                }),
              );
          }
          let q,
            Q = !1,
            re = "";
          if (ee === void 0) q = createDefaultGlobalConfig();
          else
            try {
              q = { ...createDefaultGlobalConfig(), ...jsonParse(Wo(ee)) };
            } catch (error) {
              ((Q = !0),
                (re = error instanceof Error ? error.message : String(error)),
                (q = createDefaultGlobalConfig()));
            }
          j.push(() => s.setLastGetConfigOutcome(Q ? "parse-error" : G === void 0 ? "enoent" : "parsed"));
          let se = G !== void 0 && G.version === S,
            Se = G !== void 0 && !se ? new Uint8Array(G.value) : void 0,
            ae = Q && ee !== void 0 && Se !== void 0 ? { text: ee, bytes: Se, message: re } : void 0,
            ie = !1,
            Z = !1,
            config = s.cache.config,
            fe = r ?? config;
          if (Q && fe) {
            let xe = G === void 0 ? 0 : G.value.byteLength;
            (j.push(() => {
              (logForDebugging(
                "saveConfigWithLock: re-read hit a parse error; auto-repairing from cached config under lock. See GH #3117.",
                { level: "error" },
              ),
                logEvent("tengu_config_auto_repaired", {
                  file_size_before: xe,
                  had_cached_auth:
                    s.cache.config?.oauthAccount !== void 0 || s.cache.config?.hasCompletedOnboarding === !0,
                }));
            }),
              (q = { ...fe }),
              (ie = !0));
          } else if (wouldLoseAuthState(q)) Z = !0;
          let Ae = updater(q);
          if (Ae === q && !ie)
            return {
              skip: !0,
              result: { didWrite: !1, after: j, corrupt: ae, ...(G === void 0 && { missing: !0 }) },
            };
          if (ae !== void 0 && G !== void 0 && L < rD - 1)
            return {
              skip: !0,
              result: {
                didWrite: !1,
                after: [],
                restart: { version: G.version, repairingFromCache: ie, corrupt: ae },
              },
            };
          if (Z && wouldLoseAuthState(Ae)) {
            let pendingWriteCount = s.pendingWriteCount(),
              Ie = r ?? s.cache.config;
            if (pendingWriteCount > 1 && Ie)
              (j.push(() =>
                logForDebugging(
                  "saveConfigWithLock: merge base is missing auth the cache has, but an in-process write is queued behind this one; re-basing on the enqueue-time cache snapshot so the pending auth and this write both land. See GH #3117.",
                ),
              ),
                (q = { ...Ie }),
                (Ae = updater(q)));
            else
              return (
                j.push(() => {
                  (logForDebugging(
                    "saveConfigWithLock: re-read config is missing auth that cache has; refusing to write to avoid wiping ~/.claude.json. See GH #3117.",
                    { level: "error" },
                  ),
                    logEvent("tengu_config_auth_loss_prevented", {}));
                }),
                {
                  skip: !0,
                  result: { didWrite: !1, after: j, corrupt: ae, ...(G === void 0 && { missing: !0 }) },
                }
              );
          }
          let Me = Do(Ae, (xe, Ie) => jsonStringify(xe) !== jsonStringify(h[Ie]));
          return {
            write: jsonStringify(Me, null, 2),
            result: {
              didWrite: !0,
              after: j,
              corrupt: ae,
              ...(G !== void 0 && { backup: { replaced: Se, repairingFromCache: ie } }),
              ...(G === void 0 && { missing: !0 }),
            },
          };
        },
        { publishDiscipline: "followAtomic", mode: 384, acquireTimeoutMs: 0 },
      ),
    R = await w(0);
  for (let L = 1; R.ok; L++) {
    let G = R.value.result?.restart;
    if (G === void 0) break;
    (await nD(lockStore, G.corrupt, G.repairingFromCache), (S = G.version), (R = await w(L)));
  }
  let x = Date.now() - now;
  if (!R.ok) {
    if (
      R.error.code === "Unavailable" &&
      (R.error.telemetryCode === "LockContended" || R.error.telemetryCode === "LockSuspect")
    )
      logEvent("tengu_config_lock_contention", { lock_time_ms: x });
    throw Error("Config update through storage failed", { cause: formatStorageError(R.error) });
  }
  let P = R.value.result;
  if (P === void 0) return !1;
  if (P.missing)
    try {
      let L = await findMostRecentBackup(lockStore);
      if (L) process.stderr.write(formatConfigNotFoundMessage(getGlobalClaudeFile(), L));
    } catch (error) {
      logForDebugging(`Could not report the missing config file: ${error}`, { level: "error" });
    }
  if (P.corrupt !== void 0) await handleCorruptedConfig(lockStore, P.corrupt);
  let F = P.backup !== void 0 && P.backup.replaced === void 0;
  if (P.didWrite && !F)
    await backupGlobalConfig(P.backup?.repairingFromCache ?? !1, {
      backend: lockStore,
      replaced: P.backup?.replaced,
    });
  for (let L of P.after)
    try {
      L();
    } catch (error) {
      logForDebugging(`Config save after-effect failed: ${error}`, { level: "error" });
    }
  return P.didWrite;
}
//@ chunk-aepeg2w5.js:109376-110337 layout
async function reloadGlobalConfigFromStorage(e, n = !1) {
  let r = getConfigState(),
    s = await e.read([STORAGE_SPACES.globalConfig()]).then(
      (R) => (R.ok ? R : formatStorageError(R.error)),
      (R) => String(R),
    );
  if (typeof s === "string") {
    let R = isDiskless() && !n;
    if (
      (logForDebugging(
        `Startup config read through storage failed; ${R ? "using the defaults" : n ? "keeping the config already read" : "reading the file directly"}: ${s}`,
        { level: "warn" },
      ),
      !R)
    )
      return null;
    return (
      r.setLastGetConfigOutcome("enoent"),
      { config: createDefaultGlobalConfig(), stats: null, version: void 0 }
    );
  }
  let h = s.value.items[0];
  if (!h?.found) {
    if (!n) r.setLastGetConfigOutcome("enoent");
    let R = n ? null : await findMostRecentBackup(e);
    if (R) process.stderr.write(formatConfigNotFoundMessage(getGlobalClaudeFile(), R));
    return { config: createDefaultGlobalConfig(), stats: null, version: void 0 };
  }
  let decode = textDecoder.decode(h.value),
    S = { mtimeMs: h.mtimeMs, size: h.totalBytes },
    w;
  try {
    w = jsonParse(Wo(decode));
  } catch (error) {
    let x = error instanceof Error ? error.message : String(error);
    if (!n)
      (r.setLastGetConfigOutcome("parse-error"),
        await handleCorruptedConfig(e, { text: decode, bytes: h.value, message: x }, !0));
    throw new ConfigParseError(x, getGlobalClaudeFile(), createDefaultGlobalConfig());
  }
  if (!n) r.setLastGetConfigOutcome("parsed");
  return { config: { ...createDefaultGlobalConfig(), ...w }, stats: S, version: h.version };
}
//@ chunk-aepeg2w5.js:110337-110500 layout
function attachGlobalConfigStorageBackend(e) {
  let n = getConfigState();
  (n.setFreshnessBackend(e),
    subscribeGlobalConfigViaStorage(e).then((r) => {
      if (n.freshnessBackend !== e) r?.unsubscribe();
      else if (r) n.setFreshnessSubscription(r);
      else startGlobalConfigWatcher();
    }));
}
/**
 * 启动时允许读取配置：读入 ~/.claude.json（损坏则备份并提示），装入缓存，此后 getGlobalConfig 才可用。
 */
//@ chunk-aepeg2w5.js:110500-110639 facade-majority
function enableConfigs(e, n) {
  let r = getConfigState(),
    enable = r.enable(() => enableConfigs_2(e, n));
  if (!isStorageV5Enabled() || e === void 0) return enable;
  return enable.then(() => r.reloadThroughStorageOnce(() => reloadGlobalConfigViaStorage(e)));
}
//@ chunk-aepeg2w5.js:110639-110829 layout
function reloadGlobalConfigViaStorage(e) {
  let n = getConfigState();
  return n.writeQueues.run(EXTERNAL_REFRESH, async () => {
    let writeGeneration = n.writeGeneration,
      s = await reloadGlobalConfigFromStorage(e, !0).catch((h) => {
        if (h instanceof ConfigParseError) return "unparseable";
        throw h;
      });
    if (s !== null) installStorageConfigRead(e, s, writeGeneration);
  });
}
/**
 * 安装经存储层读取的配置：记录缺失或无法解析等情况并决定保留哪份。
 */
//@ chunk-aepeg2w5.js:110829-111647 layout
function installStorageConfigRead(e, record, r) {
  let s = getConfigState(),
    h;
  if (record === "unparseable" || record.stats === null)
    h = `its record is ${record === "unparseable" ? "unparseable" : "missing"}, so the config read directly is kept`;
  else if (s.loadedVersion !== void 0 && s.loadedVersion === record.version)
    h = "that version is already the in-memory config";
  else if (s.pendingWriteCount() > 0)
    (s.deferExternalRefresh("storage"),
      (h = "a config write is pending, so the record is left to the queue-drain replay"));
  else if (s.writeGeneration !== r)
    h = "a save landed while it was read, so the record is not installed over it";
  else
    (s.installDiskRead(migrateConfigFields(record.config), record.stats),
      s.setLoadedVersion(record.version),
      (h = "its record is now the in-memory config"));
  if (
    (logForDebugging(
      `Re-read ~/.claude.json through the storage interface after the direct start-up read: ${h}`,
    ),
    s.freshnessBackend === void 0)
  ) {
    if (s.freshnessWatcherStarted) stopGlobalConfigFreshnessWatcher(s);
    attachGlobalConfigStorageBackend(e);
  }
}
//@ chunk-aepeg2w5.js:111647-112513 fingerprint = enableConfigs (0.435)
async function enableConfigs_2(e, n) {
  let r = getConfigState(),
    startTime = Date.now();
  if ((logForDiagnosticsNoPII("info", "enable_configs_started"), e !== void 0 && n?.fileWatchFallback === !1))
    r.setFileWatchFallback(!1);
  if (isStorageV5Enabled() && e !== void 0 && n?.writersWithoutBackend === "memory")
    r.setUnhandedWritesInMemory(!0);
  r.allowReading();
  try {
    let h = isStorageV5Enabled() && e !== void 0 ? await reloadGlobalConfigFromStorage(e) : null;
    if (h && e !== void 0) {
      let y = migrateConfigFields(h.config);
      (r.installDiskRead(y, h.stats), r.setLoadedVersion(h.version), attachGlobalConfigStorageBackend(e));
    } else if (isDiskless())
      throw Error(
        "A diskless session can only load its config through a storage backend (none was handed in, or CLAUDE_CODE_HOVER_REST is off)",
      );
    else {
      let y = getGlobalClaudeFile(),
        S = null;
      try {
        S = await getFsImplementation().stat(y);
      } catch {}
      let w = migrateConfigFields(await readGlobalConfigWithRetry(!0));
      if ((r.installDiskRead(w, S), e !== void 0 && uo())) attachGlobalConfigStorageBackend(e);
      else startGlobalConfigFreshnessWatcher();
      if (e === void 0) r.oweReloadThroughStorage();
    }
  } catch (error) {
    throw (r.recordEnableError(error), error);
  } finally {
    r.markEnableSettled();
  }
  logForDiagnosticsNoPII("info", "enable_configs_completed", { duration_ms: Date.now() - startTime });
}
//@ chunk-aepeg2w5.js:112513-112553 layout = getConfigBackupDir (1)
function getConfigBackupDir_2() {
  return join(getClaudeConfigDir(), "backups");
}
//@ chunk-aepeg2w5.js:112553-112633 layout
function formatConfigCorruptedMessage(e, n) {
  return `
Claude configuration file at ${e} is corrupted: ${n}
`;
}
//@ chunk-aepeg2w5.js:112633-112684 layout
function uy(e) {
  return `Config file corrupted: ${e}`;
}
//@ chunk-aepeg2w5.js:112684-112743 layout
function ly(e) {
  return `Corrupted config backed up to: ${e}`;
}
//@ chunk-aepeg2w5.js:112743-112814 layout
function dy(e) {
  return `The corrupted file has been backed up to: ${e}
`;
}
//@ chunk-aepeg2w5.js:112814-112871 layout
var cy = `The corrupted file has already been backed up.
`;
//@ chunk-aepeg2w5.js:112871-112984 fingerprint = getConfig (0.309)
function getConfig(e, n) {
  return `A backup file exists at: ${n}
You can manually restore it by running: cp "${n}" "${e}"
`;
}
//@ chunk-aepeg2w5.js:112984-113068 layout
function formatConfigNotFoundMessage(e, n) {
  return (
    `
Claude configuration file not found at: ${e}
` +
    getConfig(e, n) +
    `
`
  );
}
/**
 * 在备份目录中找最近的 .claude.json.backup.<ts>，用于提示恢复。
 */
//@ chunk-aepeg2w5.js:113068-113629 fingerprint = findMostRecentBackup (0.793)
async function findMostRecentBackup(file) {
  let fs = getGlobalClaudeFile(),
    r = getFsImplementation(),
    fileBase = basename(fs),
    backupDir = getConfigBackupDir_2();
  if (isStorageV5Enabled() && file !== void 0) {
    let S = await listGlobalConfigBackups(file).catch(() => {
        return;
      }),
      w = S?.ok ? S.value.sort().at(-1) : void 0;
    if (w) return join(backupDir, `${fileBase}.backup.${w}`);
  } else if (!isDiskless())
    try {
      let at = (await r.readdir(backupDir))
        .map((R) => R.name)
        .filter((R) => R.startsWith(`${fileBase}.backup.`))
        .sort()
        .at(-1);
      if (at) return join(backupDir, at);
    } catch {}
  if (isDiskless()) return null;
  let y = dirname(fs);
  try {
    let mostRecent = (await r.readdir(y))
      .map((x) => x.name)
      .filter((x) => x.startsWith(`${fileBase}.backup.`))
      .sort()
      .at(-1);
    if (mostRecent) return join(y, mostRecent);
    let legacyBackup = `${fs}.backup`;
    try {
      return (await r.stat(legacyBackup), legacyBackup);
    } catch {}
  } catch {}
  return null;
}
//@ chunk-aepeg2w5.js:113629-115427 layout
async function getConfigWithOutcome(e) {
  let n = getConfigState();
  if (!n.readingAllowed) throw Error("Config accessed before allowed.");
  let r = getGlobalClaudeFile(),
    s = getFsImplementation();
  try {
    let content = await s.readFile(r, { encoding: "utf-8" });
    try {
      let y = jsonParse(Wo(content));
      return (n.setLastGetConfigOutcome("parsed"), { ...createDefaultGlobalConfig(), ...y });
    } catch (error) {
      let S = error instanceof Error ? error.message : String(error);
      throw new ConfigParseError(S, r, createDefaultGlobalConfig());
    }
  } catch (error) {
    let y = getErrnoCode(error);
    if (
      (n.setLastGetConfigOutcome(
        error instanceof ConfigParseError ? "parse-error" : y === "ENOENT" ? "enoent" : "read-error",
      ),
      y === "ENOENT")
    ) {
      let S = await findMostRecentBackup();
      if (S) process.stderr.write(formatConfigNotFoundMessage(r, S));
      return createDefaultGlobalConfig();
    }
    if (error instanceof ConfigParseError) {
      (logForDebugging(uy(error.message), { level: "error" }),
        process.stderr.write(formatConfigCorruptedMessage(r, error.message)));
      let S = 0;
      try {
        if (isDiskless()) throw Error("this process writes nothing to disk");
        let R = basename(r),
          x = getConfigBackupDir_2();
        await s.mkdir(x);
        let filtered = (await s.readdir(x)).map((j) => j.name).filter((j) => j.startsWith(`${R}.corrupted.`)),
          F,
          L = !1,
          content = await s.readFile(r, { encoding: "utf-8" });
        S = content.length;
        for (let j of filtered)
          try {
            let content_2 = await s.readFile(join(x, j), { encoding: "utf-8" });
            if (content === content_2) {
              L = !0;
              break;
            }
          } catch {}
        if (!L)
          ((F = join(x, `${R}.corrupted.${Date.now()}`)),
            await s.copyFile(r, F),
            logForDebugging(ly(F), { level: "error" }));
        if (F) process.stderr.write(dy(F));
        else if (L) process.stderr.write(cy);
      } catch (error) {
        logForDebugging(`Could not back up corrupted config (${getErrnoCode(error) ?? error}); continuing.`, {
          level: "error",
        });
      }
      let w = await findMostRecentBackup();
      if (w)
        process.stderr.write(
          getConfig(r, w) +
            `
`,
        );
      else
        process.stderr.write(`
`);
      if (e) {
        if (n.claimParseErrorLog())
          setImmediate(
            (R, x) => {
              try {
                logEvent("tengu_config_parse_error", {
                  file_size: R,
                  had_cached_auth: !1,
                  has_timestamped_backup: x,
                });
              } catch {}
            },
            S,
            w !== null,
          );
        throw error;
      }
      if (!n.insideParseErrorTelemetry && n.claimParseErrorLog()) {
        n.setInsideParseErrorTelemetry(!0);
        try {
          let config = n.cache.config;
          logEvent("tengu_config_parse_error", {
            file_size: S,
            had_cached_auth: config?.oauthAccount !== void 0 || config?.hasCompletedOnboarding === !0,
            has_timestamped_backup: w !== null,
          });
        } finally {
          n.setInsideParseErrorTelemetry(!1);
        }
      }
    }
    return createDefaultGlobalConfig();
  }
}
/**
 * 计算 projects 字典的键：原始 cwd 所在 git 根（无则 realpath），统一路径分隔符，进程内缓存。
 */
//@ chunk-aepeg2w5.js:115427-115604 facade-majority
function getProjectPathForConfig() {
  let e = getConfigState();
  if (e.projectPathForConfig !== null && !hasNoProjectDir()) return e.projectPathForConfig;
  let n = getOriginalCwd(),
    r = GD(n),
    s = r ? normalizePathForConfigKey(r) : normalizePathForConfigKey(Mn(resolve(n)));
  return (e.setProjectPathForConfig(s), s);
}
//@ chunk-aepeg2w5.js:115604-115637 layout
function hasNoProjectDir() {
  return getOriginalCwdOrNull() === null;
}
//@ chunk-aepeg2w5.js:115637-115687 facade-majority
function clearProjectPathForConfigCache() {
  getConfigState().setProjectPathForConfig(null);
}
//@ chunk-aepeg2w5.js:115687-115744 facade-majority
function getRawCurrentProjectConfigEntry() {
  return hasNoProjectDir() ? void 0 : getGlobalConfig().projects?.[getProjectPathForConfig()];
}
/**
 * 当前项目在 ~/.claude.json projects 字典里的配置（键为原始 cwd 的 git 根或 realpath），不存在时返回 DEFAULT_PROJECT_CONFIG；兼容 allowedTools 曾经是 JSON 字符串。
 */
//@ chunk-aepeg2w5.js:115744-115968 facade-majority = getCurrentProjectConfig (0.469)
function getCurrentProjectConfig() {
  if (isTestConfigMode()) return getConfigState().testProjectConfig;
  if (hasNoProjectDir()) return DEFAULT_PROJECT_CONFIG;
  let absolutePath = getProjectPathForConfig(),
    config = getGlobalConfig();
  if (!config.projects) return DEFAULT_PROJECT_CONFIG;
  let projectConfig = config.projects[absolutePath] ?? DEFAULT_PROJECT_CONFIG;
  if (typeof projectConfig.allowedTools === "string")
    projectConfig.allowedTools = safeParseJSON(projectConfig.allowedTools) ?? [];
  return projectConfig;
}
/**
 * 在全局配置的 projects[当前项目键] 上应用更新函数并加锁保存，失败回退与 saveGlobalConfig 相同的防丢认证逻辑。
 */
//@ chunk-aepeg2w5.js:115968-116019 facade-majority
function saveCurrentProjectConfig(e, n) {
  return enqueueProjectConfigSave(e, n).then(() => {
    return;
  });
}
//@ chunk-aepeg2w5.js:116019-116066 facade-majority
function saveCurrentProjectConfigDurably(e, n) {
  return enqueueProjectConfigSave(e, n).catch(() => !1);
}
//@ chunk-aepeg2w5.js:116066-116723 layout
function enqueueProjectConfigSave(e, n) {
  let r = getConfigState();
  if (isTestConfigMode()) {
    let y = e(r.testProjectConfig);
    if (y === r.testProjectConfig) return Promise.resolve(!0);
    return (r.overwriteTestProjectConfig(y), Promise.resolve(!0));
  }
  let s = getProjectPathForConfig(),
    h = applyOptimisticConfigUpdate((y) => {
      let S = y.projects?.[s] ?? DEFAULT_PROJECT_CONFIG,
        w = e(S);
      if (w === S) return y;
      if (
        w.lastGracefulShutdown === !0 &&
        (S.lastGracefulShutdown !== !0 || e({ ...S, lastGracefulShutdown: !1 }).lastGracefulShutdown === !0)
      )
        r.gracefulExitStampedProjects.add(s);
      else if (w.lastGracefulShutdown === !1 && S.lastGracefulShutdown !== !1)
        r.gracefulExitStampedProjects.delete(s);
      return { ...y, projects: { ...y.projects, [s]: w } };
    });
  if (isConfigWriteMemoryOnly(n, "saveCurrentProjectConfig")) return Promise.resolve(!1);
  return runQueuedConfigWrite(() => saveCurrentProjectConfig_2(e, s, h, n, 0));
}
//@ chunk-aepeg2w5.js:116723-118337 fingerprint = saveCurrentProjectConfig (0.436)
async function saveCurrentProjectConfig_2(e, n, r, s, h) {
  let absolutePath = getConfigState(),
    written = null,
    w = !1,
    R = !1;
  try {
    let x = await saveConfigWithLock(
      (current) => {
        let F = current.projects?.[n] ?? DEFAULT_PROJECT_CONFIG,
          newProjectConfig = e(F);
        if (newProjectConfig === F) return ((w = !0), current);
        return (
          (written = stripRetiredConfigKeys({
            ...current,
            projects: { ...current.projects, [n]: newProjectConfig },
          })),
          written
        );
      },
      r,
      { onCompromised: () => (R = !0) },
      s,
    );
    if (x && written) writeThroughConfigCache(written);
    return (x || w) && !R;
  } catch (error) {
    logForDebugging(`Failed to save config with lock: ${error}`, { level: "error" });
    let P = await readConfigForFallbackWrite(r, s);
    if (P.readRejected) return (logConfigFallbackSuppressedUnreadable("save_project"), !1);
    let config = P.config;
    if (Jn(error) && !P.cacheDerived) {
      let j = config.projects?.[n] ?? DEFAULT_PROJECT_CONFIG,
        ee = e(j);
      if (ee === j) return !0;
      if (Xh(j, ee)) {
        let q = isOnlyCrashMarkerChange(j, ee) ? CONFIG_CRASH_MARKER_REENQUEUE_DELAYS_MS[h] : void 0;
        if ((logConfigFallbackSkippedContention("save_project", q !== void 0), q !== void 0))
          sleep(q, void 0, { unref: !0 })
            .then(() => {
              if (absolutePath.gracefulExitStampedProjects.has(n)) return;
              let config = absolutePath.cache.config;
              return runQueuedConfigWrite(() => saveCurrentProjectConfig_2(e, n, config, s, h + 1));
            })
            .catch((Q) => logForDebugging(`Crash-marker config re-enqueue failed: ${Q}`, { level: "error" }));
        return !1;
      }
    }
    if (wouldLoseAuthState(config)) {
      let pendingWriteCount = absolutePath.pendingWriteCount();
      if (pendingWriteCount > 1 && Jn(error))
        logForDebugging(
          "saveCurrentProjectConfig fallback under contention: proceeding on the base as-is (fresh disk on a clean read; the snapshot copy on a torn read); the write queued behind carries the pending auth. See GH #3117 / gh-73364.",
        );
      else if (pendingWriteCount > 1 && r)
        (logForDebugging(
          "saveCurrentProjectConfig fallback: merge base is missing auth the cache has, but an in-process write is queued behind this one; re-basing on the enqueue-time cache snapshot. See GH #3117.",
        ),
          (config = { ...r }));
      else
        return (
          logForDebugging(
            "saveCurrentProjectConfig fallback: re-read config is missing auth that cache has; refusing to write. See GH #3117.",
            { level: "error" },
          ),
          logEvent("tengu_config_auth_loss_prevented", {}),
          !1
        );
    }
    let L = config.projects?.[n] ?? DEFAULT_PROJECT_CONFIG,
      newProjectConfig = e(L);
    if (newProjectConfig === L) return !0;
    return (
      (written = stripRetiredConfigKeys({
        ...config,
        projects: { ...config.projects, [n]: newProjectConfig },
      })),
      await saveConfig(written, "save_project", s),
      !1
    );
  }
}
//@ chunk-aepeg2w5.js:118337-118865 facade-majority
function saveCurrentProjectConfigSyncForExit(e) {
  let n = getConfigState();
  if (isTestConfigMode()) {
    let r = e(n.testProjectConfig);
    if (r !== n.testProjectConfig) n.overwriteTestProjectConfig(r);
    return;
  }
  if ((isStorageV5Enabled() && n.unhandedWritesInMemory) || isDiskless()) return;
  try {
    let r = getGlobalClaudeFile(),
      s = getProjectPathForConfig(),
      h = null;
    try {
      h = readFileSync(r, { encoding: "utf-8" });
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
    let y = createDefaultGlobalConfig();
    if (h !== null) y = { ...y, ...jsonParse(Wo(h)) };
    let S = y.projects?.[s] ?? DEFAULT_PROJECT_CONFIG,
      w = e(S);
    if (w === S) return;
    let R = stripRetiredConfigKeys({ ...y, projects: { ...y.projects, [s]: w } });
    if (wouldLoseAuthState(R)) return;
    let x = Do(R, (P, F) => jsonStringify(P) !== jsonStringify(DEFAULT_GLOBAL_CONFIG[F]));
    writeFileSyncAndFlush_DEPRECATED(r, jsonStringify(x, null, 2), {
      encoding: "utf-8",
      mode: 384,
      allowSymlink: !0,
    });
  } catch {}
}
//@ chunk-aepeg2w5.js:118865-119363 facade-majority
function saveGlobalConfigSyncForExit(e) {
  let n = getConfigState();
  if (isTestConfigMode()) {
    let r = e(n.testGlobalConfig);
    if (r !== n.testGlobalConfig) n.overwriteTestGlobalConfig(r);
    return;
  }
  if ((isStorageV5Enabled() && n.unhandedWritesInMemory) || isDiskless()) return;
  try {
    let r = getGlobalClaudeFile(),
      s = null;
    try {
      s = readFileSync(r, { encoding: "utf-8" });
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
    let h = createDefaultGlobalConfig();
    if (s !== null) h = { ...h, ...jsonParse(Wo(s)) };
    let y = e(h);
    if (y === h) return;
    let S = stripRetiredConfigKeys({ ...y, projects: mergeProjectsForSave(h.projects, y.projects) });
    if (wouldLoseAuthState(S)) return;
    let w = Do(S, (R, x) => jsonStringify(R) !== jsonStringify(DEFAULT_GLOBAL_CONFIG[x]));
    writeFileSyncAndFlush_DEPRECATED(r, jsonStringify(w, null, 2), {
      encoding: "utf-8",
      mode: 384,
      allowSymlink: !0,
    });
  } catch {}
}
//@ chunk-aepeg2w5.js:119363-119648 facade-majority
function deleteProjectConfig(e, n) {
  if (isTestConfigMode()) return Promise.resolve(!0);
  let r = getConfigState();
  if (isConfigWriteMemoryOnly(n, "deleteProjectConfig")) {
    let h = r.cache.config?.projects?.[e] !== void 0;
    if (h)
      applyOptimisticConfigUpdate((y) => {
        let { [e]: S, ...w } = y.projects ?? {};
        return { ...y, projects: w };
      });
    return Promise.resolve(!h);
  }
  let config = r.cache.config;
  return runQueuedConfigWrite(() => deleteProjectConfigLocked(e, config, n));
}
/**
 * 在配置锁内删除指定项目的配置记录，返回是否删除及错误。
 */
//@ chunk-aepeg2w5.js:119648-120594 layout
async function deleteProjectConfigLocked(projectPath, n, r) {
  let s = getConfigState(),
    h = null,
    y = null;
  try {
    let S = await saveConfigWithLock(
      (w) => {
        if (!w.projects?.[projectPath]) return ((y = !1), w);
        y = !0;
        let { [projectPath]: R, ...x } = w.projects;
        return ((h = stripRetiredConfigKeys({ ...w, projects: x })), h);
      },
      n,
      void 0,
      r,
    );
    if (S && h) writeThroughConfigCache(h);
    return S || y === !1;
  } catch (error) {
    if ((logForDebugging(`Failed to save config with lock: ${error}`, { level: "error" }), Jn(error)))
      return (logConfigFallbackSkippedContention("delete_project"), !1);
    let w = await readConfigForFallbackWrite(n, r);
    if (w.readRejected) return (logConfigFallbackSuppressedUnreadable("delete_project"), !1);
    let config = w.config;
    if (wouldLoseAuthState(config))
      if (s.pendingWriteCount() > 1 && n)
        (logForDebugging(
          "deleteProjectConfig fallback: merge base is missing auth the cache has, but an in-process write is queued behind this one; re-basing on the enqueue-time cache snapshot. See GH #3117.",
        ),
          (config = { ...n }));
      else
        return (
          logForDebugging(
            "deleteProjectConfig fallback: re-read config is missing auth that cache has; refusing to write. See GH #3117.",
            { level: "error" },
          ),
          logEvent("tengu_config_auth_loss_prevented", {}),
          !1
        );
    if (!config.projects?.[projectPath]) return !0;
    let { [projectPath]: x, ...P } = config.projects;
    return ((h = stripRetiredConfigKeys({ ...config, projects: P })), saveConfig(h, "delete_project", r));
  }
}
//@ chunk-aepeg2w5.js:120594-121179 facade-majority
function deleteCurrentProjectConfigFields(e, n) {
  let r = getConfigState();
  if (isTestConfigMode()) return (r.deleteTestProjectConfigFields(e), Promise.resolve(!0));
  if (isConfigWriteMemoryOnly(n, "deleteCurrentProjectConfigFields")) {
    let h = getProjectPathForConfig(),
      y = r.cache.config?.projects?.[h],
      S = y !== void 0 && e.some((w) => w in y);
    if (S) applyOptimisticConfigUpdate((w) => ({ ...w, projects: { ...w.projects, [h]: omitKeys(y, e) } }));
    return Promise.resolve(!S);
  }
  let config = r.cache.config;
  return runQueuedConfigWrite(() =>
    deleteProjectFieldsLocked(e, {
      projectPath: getProjectPathForConfig,
      saveWithLock: (h) => saveConfigWithLock(h, config, void 0, n),
      writeCache: writeThroughConfigCache,
      readConfigFallback: () => readConfigForFallbackWrite(config, n),
      wouldLoseAuth: wouldLoseAuthState,
      fallbackSave: (h) => saveConfig(h, "delete_project_fields", n),
      pendingWriteCount: () => r.pendingWriteCount(),
      enqueueCacheSnapshot: config,
    }),
  );
}
//@ chunk-aepeg2w5.js:121179-121212 facade-majority
function _deleteCurrentProjectConfigFieldsForTesting(e, n) {
  return deleteProjectFieldsLocked(e, n);
}
//@ chunk-aepeg2w5.js:121212-121278 layout
function omitKeys(e, n) {
  let r = { ...e };
  for (let s of n) delete r[s];
  return r;
}
//@ chunk-aepeg2w5.js:121278-122536 layout
async function deleteProjectFieldsLocked(e, n) {
  let r = (R) => omitKeys(R, e),
    projectPath = n.projectPath(),
    configFallback = await n.readConfigFallback(),
    y = configFallback.config.projects?.[projectPath];
  if (!configFallback.cacheDerived && (!y || !e.some((R) => R in y))) return !0;
  let S = null,
    w = null;
  try {
    let saveWithLock = await n.saveWithLock((x) => {
      let P = x.projects?.[projectPath];
      if (!P || !e.some((F) => F in P)) return ((w = !1), x);
      return (
        (w = !0),
        (S = stripRetiredConfigKeys({ ...x, projects: { ...x.projects, [projectPath]: r(P) } })),
        S
      );
    });
    if (saveWithLock && S) n.writeCache(S);
    return saveWithLock || w === !1;
  } catch (error) {
    if ((logForDebugging(`Failed to save config with lock: ${error}`, { level: "error" }), Jn(error)))
      return (logConfigFallbackSkippedContention("delete_project_fields"), !1);
    let configFallback = await n.readConfigFallback();
    if (configFallback.readRejected)
      return (logConfigFallbackSuppressedUnreadable("delete_project_fields"), !1);
    let config = configFallback.config;
    if (n.wouldLoseAuth(config))
      if (n.pendingWriteCount() > 1 && n.enqueueCacheSnapshot)
        (logForDebugging(
          "deleteCurrentProjectConfigFields fallback: merge base is missing auth the cache has, but an in-process write is queued behind this one; re-basing on the enqueue-time cache snapshot. See GH #3117.",
        ),
          (config = { ...n.enqueueCacheSnapshot }));
      else
        return (
          logForDebugging(
            "deleteCurrentProjectConfigFields fallback: re-read config is missing auth that cache has; refusing to write. See GH #3117.",
            { level: "error" },
          ),
          logEvent("tengu_config_auth_loss_prevented", {}),
          !1
        );
    let F = config.projects?.[projectPath];
    if (!F || !e.some((L) => L in F)) return !0;
    return (
      (S = stripRetiredConfigKeys({ ...config, projects: { ...config.projects, [projectPath]: r(F) } })),
      n.fallbackSave(S)
    );
  }
}
//@ chunk-aepeg2w5.js:122536-122571 facade-majority
function isAutoUpdaterDisabled() {
  return getAutoUpdaterDisabledReason() !== null;
}
//@ chunk-aepeg2w5.js:122571-122877 facade-majority = shouldSkipPluginAutoupdate (0.253)
function shouldSkipPluginAutoupdate() {
  if (env.FORCE_AUTOUPDATE_PLUGINS) return !1;
  if (!env.CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST) return isAutoUpdaterDisabled();
  let e = require("./chunk-t9wvryrs.js");
  if (getAutoUpdaterDisabledReason_2(!1) !== null) return !0;
  let skipReasonUnderHostPin = e.findSkipReasonUnderHostPin(getGlobalConfig().env);
  if (skipReasonUnderHostPin !== null)
    logForDebugging(`Plugin autoupdate: off under the host's pin (${skipReasonUnderHostPin})`);
  return skipReasonUnderHostPin !== null;
}
//@ chunk-aepeg2w5.js:122877-123023 facade-majority = formatAutoUpdaterDisabledReason (0.808)
function formatAutoUpdaterDisabledReason(reason) {
  switch (reason.type) {
    case "development":
      return "development build";
    case "env":
      return `set by env: ${reason.envVar}`;
    case "config":
      return "config";
  }
}
/**
 * 自动更新被禁用的原因：DISABLE_UPDATES、DISABLE_AUTOUPDATER、非必要流量关闭（隐私级别）、或配置 autoUpdates=false（native 安装且 autoUpdatesProtectedForNative 时除外）。
 */
//@ chunk-aepeg2w5.js:123023-123085 facade-majority
function getAutoUpdaterDisabledReason() {
  return getAutoUpdaterDisabledReason_2(isEnvTruthy(process.env.DISABLE_AUTOUPDATER));
}
//@ chunk-aepeg2w5.js:123085-123398 fingerprint = getAutoUpdaterDisabledReason (0.736)
function getAutoUpdaterDisabledReason_2(e) {
  if (env.DISABLE_UPDATES) return { type: "env", envVar: "DISABLE_UPDATES" };
  if (e) return { type: "env", envVar: "DISABLE_AUTOUPDATER" };
  let essentialTrafficEnvVar = getEssentialTrafficOnlyReason();
  if (essentialTrafficEnvVar) return { type: "env", envVar: essentialTrafficEnvVar };
  let config = getGlobalConfig();
  if (
    config.autoUpdates === !1 &&
    (config.installMethod !== "native" || config.autoUpdatesProtectedForNative !== !0)
  )
    return { type: "config" };
  return null;
}
//@ chunk-aepeg2w5.js:123398-123422 layout
var HEX64_ID_PATTERN = /^[0-9a-f]{64}$/;
/**
 * 读取或生成 userID（64 位 hex 随机串）并写回 ~/.claude.json；用于遥测 device_id 与 metadata.user_id。
 */
//@ chunk-aepeg2w5.js:123422-123684 facade-majority = getOrCreateUserID (0.664)
function getOrCreateUserID(e, n) {
  let config = getConfigState(),
    s = getGlobalConfig();
  if (typeof s.userID === "string" && HEX64_ID_PATTERN.test(s.userID)) return s.userID;
  if (config.generatedUserID) return config.generatedUserID;
  let h = n !== void 0 && HEX64_ID_PATTERN.test(n) ? n : randomBytes(32).toString("hex");
  return (config.setGeneratedUserID(h), saveGlobalConfig((current) => ({ ...current, userID: h }), e), h);
}
/**
 * 读取或生成 machineID（64 位 hex）并写回全局配置。
 */
//@ chunk-aepeg2w5.js:123684-123941 facade-majority
function getOrCreateMachineID(e) {
  let n = getConfigState(),
    r = getGlobalConfig();
  if (typeof r.machineID === "string" && HEX64_ID_PATTERN.test(r.machineID)) return r.machineID;
  if (n.generatedMachineID) return n.generatedMachineID;
  let str = randomBytes(32).toString("hex");
  return (n.setGeneratedMachineID(str), saveGlobalConfig((h) => ({ ...h, machineID: str }), e), str);
}
//@ chunk-aepeg2w5.js:123941-123988 facade-majority
async function seedInstallIDs(e) {
  (getOrCreateUserID(e), getOrCreateMachineID(e), await drainConfigWrites());
}
//@ chunk-aepeg2w5.js:123988-124266 facade-majority
function getOrCreateSummonSidKey(e) {
  let n = getConfigState(),
    r = getGlobalConfig();
  if (typeof r.summonSidKey === "string" && HEX64_ID_PATTERN.test(r.summonSidKey)) return r.summonSidKey;
  if (n.generatedSummonSidKey) return n.generatedSummonSidKey;
  let str = randomBytes(32).toString("hex");
  return (n.setGeneratedSummonSidKey(str), saveGlobalConfig((h) => ({ ...h, summonSidKey: str }), e), str);
}
//@ chunk-aepeg2w5.js:124266-124338 layout
var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-aepeg2w5.js:124338-124392 layout
function Bh(e) {
  return typeof e === "string" && UUID_PATTERN.test(e);
}
//@ chunk-aepeg2w5.js:124392-124462 facade-majority
function getOrCreateRemoteControlMachineId(e) {
  return getConfigState().remoteControlMachineIdOnceFrom(() => ensureRemoteControlMachineId(e));
}
/**
 * 获取或生成 Remote Control 的机器 id（UUID）并保存到全局配置；保存失败且未被其他进程写入时返回 null。
 */
//@ chunk-aepeg2w5.js:124462-124717 layout
async function ensureRemoteControlMachineId(e) {
  let n = getGlobalConfig();
  if (Bh(n.remoteControlMachineId)) return n.remoteControlMachineId;
  let r = randomUUID_2(),
    s = r;
  return (await saveGlobalConfigQueued(
    (y) => (
      (s = Bh(y.remoteControlMachineId) ? y.remoteControlMachineId : s),
      { ...y, remoteControlMachineId: s }
    ),
    e,
  ).catch(() => !1)) || s !== r
    ? s
    : null;
}
/**
 * 首次启动时写 firstStartTime 与 firstStartVersion。
 */
//@ chunk-aepeg2w5.js:124717-124810 facade-majority = recordFirstStartTime (1)
function recordFirstStartTime(e) {
  if (!getGlobalConfig().firstStartTime) {
    let firstStartTime = new Date().toISOString();
    saveGlobalConfig((current) => stampFirstStart(current, firstStartTime), e);
  }
}
//@ chunk-aepeg2w5.js:124810-125392 facade-majority
function stampFirstStart(e, n) {
  if (e.firstStartTime) return e;
  return {
    ...e,
    firstStartTime: n,
    firstStartVersion: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
  };
}
/**
 * 记忆文件路径：User=<配置目录>/CLAUDE.md，Project=<cwd>/CLAUDE.md，Local=<cwd>/CLAUDE.local.md，Managed=<托管目录>/CLAUDE.md，AutoMem=自动记忆入口。
 */
//@ chunk-aepeg2w5.js:125392-125613 facade-majority = getMemoryPath (1)
function getMemoryPath(memoryType) {
  switch (memoryType) {
    case "User":
      return join(getClaudeConfigDir(), "CLAUDE.md");
    case "Local":
      return join(getOriginalCwd(), "CLAUDE.local.md");
    case "Project":
      return join(getOriginalCwd(), "CLAUDE.md");
    case "Managed":
      return join(getManagedFilePath(), "CLAUDE.md");
    case "AutoMem":
      return getAutoMemEntrypoint();
  }
}
//@ chunk-aepeg2w5.js:125613-125662 facade-majority = getManagedClaudeRulesDir (1)
function getManagedClaudeRulesDir() {
  return join(getManagedFilePath(), ".claude", "rules");
}
//@ chunk-aepeg2w5.js:125662-125701 facade-majority = getUserClaudeRulesDir (1)
function getUserClaudeRulesDir() {
  return join(getClaudeConfigDir(), "rules");
}
//@ chunk-aepeg2w5.js:125701-125768 facade-majority
var _getConfigForTesting = getConfigWithOutcome,
  _wouldLoseAuthStateForTesting = wouldLoseAuthState,
  _saveConfigWithLockForTesting = saveConfigWithLock,
  _refreshGlobalConfigCacheFromExternalWriteForTesting = refreshGlobalConfigFromDisk,
  _refreshGlobalConfigCacheThroughStorageForTesting = checkGlobalConfigFreshness,
  _onGlobalConfigStorageEventForTesting = onGlobalConfigStorageEvent,
  _subscribeGlobalConfigFreshnessForTesting = subscribeGlobalConfigViaStorage,
  _loadGlobalConfigThroughStorageForTesting = reloadGlobalConfigFromStorage,
  _startGlobalConfigFreshnessThroughStorageForTesting = attachGlobalConfigStorageBackend;
//@ chunk-aepeg2w5.js:125768-125812 facade-majority
function _getFreshnessBackendForTesting() {
  return getConfigState().freshnessBackend;
}
//@ chunk-aepeg2w5.js:125812-125853 facade-majority
function _setLoadedVersionForTesting(e) {
  getConfigState().setLoadedVersion(e);
}
//@ chunk-aepeg2w5.js:125853-125897 facade-majority
function _setFreshnessBackendForTesting(e) {
  getConfigState().setFreshnessBackend(e);
}
//@ chunk-aepeg2w5.js:125897-125948 facade-majority
function _setFreshnessWatcherStartedForTesting(e) {
  getConfigState().setFreshnessWatcherStarted(e);
}
//@ chunk-aepeg2w5.js:125948-125995 facade-majority
function _setFreshnessEventWatchForTesting(e) {
  getConfigState().setFreshnessEventWatch(e);
}
//@ chunk-aepeg2w5.js:125995-126046 facade-majority
function _getFreshnessWatcherStartedForTesting() {
  return getConfigState().freshnessWatcherStarted;
}
//@ chunk-aepeg2w5.js:126046-126091 facade-majority
function _setFileWatchFallbackForTesting(e) {
  getConfigState().setFileWatchFallback(e);
}
//@ chunk-aepeg2w5.js:126091-126152 facade-majority
function _setWritersWithoutBackendForTesting(e) {
  getConfigState().setUnhandedWritesInMemory(e === "memory");
}
//@ chunk-aepeg2w5.js:126152-126195 facade-majority
function _getConfigWriteGenerationForTesting() {
  return getConfigState().writeGeneration;
}
//@ chunk-aepeg2w5.js:126195-126227 facade-majority
var _installGlobalConfigReloadedThroughStorageForTesting = installStorageConfigRead,
  _readGlobalConfigForFallbackForTesting = readConfigForFallbackWrite,
  _takeTimestampedConfigBackupForTesting = backupGlobalConfig,
  _findMostRecentBackupForTesting = findMostRecentBackup;
//@ chunk-aepeg2w5.js:126227-126265 facade-majority
function _resetEnableConfigsForTesting() {
  getConfigState().resetEnableGate();
}
//@ chunk-aepeg2w5.js:126265-126308 facade-majority
function _resetParseErrorDedupForTesting() {
  getConfigState().clearParseErrorDedup();
}
//@ chunk-aepeg2w5.js:126308-126372 facade-majority
function _getLastGetConfigWasParseErrorForTesting() {
  return getConfigState().lastGetConfigOutcome === "parse-error";
}
//@ chunk-aepeg2w5.js:126372-126443 facade-majority
function _setLastGetConfigWasParseErrorForTesting(e) {
  getConfigState().setLastGetConfigOutcome(e ? "parse-error" : "parsed");
}
//@ chunk-aepeg2w5.js:126443-126512 facade-majority
var _saveGlobalConfigForTesting = saveGlobalConfig,
  _saveGlobalConfigDurablyForTesting = saveGlobalConfigDurably,
  _saveCurrentProjectConfigForTesting = saveCurrentProjectConfig,
  _saveCurrentProjectConfigDurablyForTesting = saveCurrentProjectConfigDurably,
  _getGlobalConfigForTesting = getGlobalConfig,
  _getCurrentProjectConfigForTesting = getCurrentProjectConfig,
  _getOrCreateMachineIDForTesting = getOrCreateMachineID,
  _getOrCreateUserIDForTesting = getOrCreateUserID,
  _removeProjectHistoryForTesting = shouldShowProjectOnboarding;
//@ chunk-aepeg2w5.js:126512-126556 facade-majority
function _getTestGlobalConfigForTesting() {
  return getConfigState().testGlobalConfig;
}
//@ chunk-aepeg2w5.js:126556-126629 facade-majority
function _setGlobalConfigCacheForTesting(e) {
  let n = getConfigState();
  if (e) n.applyOptimistic(e);
  else n.clearCache();
}
//@ chunk-aepeg2w5.js:126629-126674 facade-majority
function _setLastReadFileStatsForTesting(e) {
  getConfigState().setLastReadFileStats(e);
}
//@ chunk-aepeg2w5.js:126674-126728 facade-majority
function _resetRemoteControlMachineIdForTesting() {
  getConfigState().clearRemoteControlMachineIdOnce();
}
//@ chunk-aepeg2w5.js:126728-126774 facade-majority
function _resetGeneratedMachineIDForTesting() {
  getConfigState().clearGeneratedMachineID();
}
//@ chunk-aepeg2w5.js:126774-126823 facade-majority
function _resetGeneratedSummonSidKeyForTesting() {
  getConfigState().clearGeneratedSummonSidKey();
}
//@ chunk-aepeg2w5.js:126823-126875 facade-majority
function setClientDataCacheKeyGetter(e) {
  getConfigState().setClientDataCacheKeyGetter(e);
}
//@ chunk-aepeg2w5.js:126875-127039 facade-majority
function seedClientDataForCurrentKey(e, { forContextWindow: n = !1 } = {}) {
  let r = getConfigState(),
    s = r.clientDataCacheKeyGetter?.();
  r.setClientDataWindowSeed(s === void 0 ? null : { key: s, data: e, forContextWindow: n });
}
//@ chunk-aepeg2w5.js:127039-127145 facade-majority
function clearClientDataSeed(e) {
  let n = getConfigState();
  if (e === void 0 || n.clientDataWindowSeed?.key === e) n.setClientDataWindowSeed(null);
}
//@ chunk-aepeg2w5.js:127145-127186 facade-majority
function getCachedClientData(e) {
  return getCachedClientDataSlot(e)?.data ?? null;
}
//@ chunk-aepeg2w5.js:127186-127412 facade-majority
function getCachedClientDataSlot(e) {
  let n = getConfigState();
  if (n.clientDataReadGate && !n.clientDataReadGate()) return null;
  let r = readClientDataCacheSlot(n, e);
  if (!n.clientDataOverride) return r;
  let s = r?.data ?? null,
    clientDataOverride = n.clientDataOverride(s, e);
  return clientDataOverride === s ? r : { data: clientDataOverride, model: r?.model ?? e };
}
//@ chunk-aepeg2w5.js:127412-127524 facade-majority
function getFetchedClientData() {
  let e = getConfigState();
  if (e.clientDataReadGate && !e.clientDataReadGate()) return null;
  return readClientDataCacheSlot(e)?.data ?? null;
}
/**
 * 读取客户端数据缓存槽中当前键对应的数据。
 */
//@ chunk-aepeg2w5.js:127524-127966 layout
function readClientDataCacheSlot(e, n) {
  if (!e.clientDataCacheKeyGetter) return null;
  let r = getGlobalConfig(),
    clientDataCacheKeyGetter = e.clientDataCacheKeyGetter(n),
    clientDataCacheSlots = r.clientDataCacheSlots;
  if (clientDataCacheSlots != null && Object.hasOwn(clientDataCacheSlots, clientDataCacheKeyGetter)) {
    let w = clientDataCacheSlots[clientDataCacheKeyGetter];
    return isTimestampedValue(w) ? { data: w.data ?? null, model: w.model } : null;
  }
  if (
    n !== void 0 &&
    (clientDataCacheKeyGetter === eoo || clientDataCacheKeyGetter !== e.clientDataCacheKeyGetter())
  )
    return null;
  let clientDataWindowSeed = e.clientDataWindowSeed;
  if (clientDataWindowSeed !== null && clientDataWindowSeed.key === clientDataCacheKeyGetter)
    return { data: clientDataWindowSeed.data };
  let clientDataCache = r.clientDataCache;
  return typeof clientDataCache === "object" && clientDataCache !== null ? { data: clientDataCache } : null;
}
//@ chunk-aepeg2w5.js:127966-128012 facade-majority
function setClientDataReadGate(e) {
  getConfigState().setClientDataReadGate(e);
}
//@ chunk-aepeg2w5.js:128012-128064 facade-majority
function setClientDataStrictReadGate(e) {
  getConfigState().setClientDataStrictReadGate(e);
}
//@ chunk-aepeg2w5.js:128064-128110 facade-majority
function setClientDataOverride(e) {
  getConfigState().setClientDataOverride(e);
}
//@ chunk-aepeg2w5.js:128110-128265 facade-majority
function readStrictClientData(e, n, r) {
  if (!n || !n()) return null;
  if (!r) return null;
  let s = r(),
    clientDataCacheSlots = e.clientDataCacheSlots;
  if (clientDataCacheSlots != null && Object.hasOwn(clientDataCacheSlots, s))
    return kh(clientDataCacheSlots, s);
  return null;
}
//@ chunk-aepeg2w5.js:128265-128362 facade-majority
function getCachedClientDataStrict() {
  let e = getConfigState();
  return readStrictClientData(getGlobalConfig(), e.clientDataStrictReadGate, e.clientDataCacheKeyGetter);
}
//@ chunk-aepeg2w5.js:128362-128416 facade-majority
function setClientDataStaleMatchGetter(e) {
  getConfigState().setClientDataStaleMatchGetter(e);
}
//@ chunk-aepeg2w5.js:128416-128569 facade-majority
function getCachedClientDataForContextWindow() {
  let e = getConfigState();
  if (e.clientDataReadGate && !e.clientDataReadGate()) return null;
  let n = getCachedClientDataForWindow(e);
  return e.clientDataOverride ? e.clientDataOverride(n) : n;
}
/**
 * 读取当前窗口对应的客户端数据缓存。
 */
//@ chunk-aepeg2w5.js:128569-128991 layout
function getCachedClientDataForWindow(e) {
  if (!e.clientDataCacheKeyGetter) return null;
  let n = getGlobalConfig(),
    clientDataCacheSlots = n.clientDataCacheSlots,
    clientDataCacheKeyGetter = e.clientDataCacheKeyGetter();
  if (clientDataCacheSlots != null && Object.hasOwn(clientDataCacheSlots, clientDataCacheKeyGetter)) {
    let w = readTimestampedEntry(clientDataCacheSlots, clientDataCacheKeyGetter);
    if (w) return w.data;
  }
  let h = e.clientDataStaleMatchGetter?.();
  if (h) {
    let w = findMatchingUsageSnapshot(clientDataCacheSlots, h);
    if (w) return w.data;
  }
  let clientDataWindowSeed = e.clientDataWindowSeed;
  if (
    clientDataWindowSeed !== null &&
    clientDataWindowSeed.key === clientDataCacheKeyGetter &&
    clientDataWindowSeed.forContextWindow
  )
    return clientDataWindowSeed.data;
  let clientDataCache = n.clientDataCache;
  return typeof clientDataCache === "object" && clientDataCache !== null ? clientDataCache : null;
}
//@ chunk-aepeg2w5.js:128991-129047 facade-majority
function clientDataSlotKey() {
  return getConfigState().clientDataCacheKeyGetter?.();
}
//@ chunk-aepeg2w5.js:129047-129194 facade-majority
function hasClientDataCacheSlot() {
  let e = getConfigState();
  if (!e.clientDataCacheKeyGetter) return !1;
  let clientDataCacheSlots = getGlobalConfig().clientDataCacheSlots;
  return readTimestampedEntry(clientDataCacheSlots, e.clientDataCacheKeyGetter()) !== null;
}
//@ chunk-aepeg2w5.js:129194-129207 placement
Hh(() => getCachedClientData());
//@ chunk-aepeg2w5.js:129207-129220 placement
Oh(() => getCachedClientData());
//@ chunk-0h4e7gnq.js:157679-157918 fingerprint = removeProjectHistory (0.392)
function removeProjectHistory(e, n) {
  if (!(e instanceof AgentApiErrorTerminationError)) return null;
  if (!e.errorKind || !zu.has(e.errorKind)) return null;
  let filtered = n.filter((y) => y.type !== "assistant" || !y.isApiErrorMessage);
  if (extractAgentFinalText(filtered) === void 0) return null;
  return { history: filtered, cutoffNote: partialResultPreamble(e.message) };
}
//@ chunk-23fm9f0d.js:32645-32693 fingerprint = getConfigBackupDir (1)
function getConfigBackupDir() {
  return cleanupOldFilesMatching(join(getClaudeConfigDir(), "backups"), "", !1);
}
//@ chunk-99h01h55.js:4844-4881 fingerprint = getUserClaudeRulesDir (1)
function getUserClaudeRulesDir_2(e) {
  return Se(e, "rules");
}
//@ chunk-byfs7td2.js:191-965 facade-majority
var NOTIFICATION_CHANNELS = [
    "auto",
    "iterm2",
    "terminal_bell",
    "iterm2_with_bell",
    "kitty",
    "ghostty",
    "notifications_disabled",
  ],
  UPi = [
    "permission_prompt",
    "idle_prompt",
    "auth_success",
    "elicitation_dialog",
    "agent_needs_input",
    "agent_completed",
    "elicitation_url_dialog",
    "worker_permission_prompt",
    "push_notification",
    "computer_use_enter",
    "computer_use_exit",
    "quota_auto_resume_fired",
    "quota_auto_resume_stale",
    "quota_auto_resume_disabled",
    "model_refusal_fallback",
    "auth_storage_failure",
    "plugin_notification",
  ],
  EDITOR_MODES = ["normal", "vim"],
  Obr = ["forward", "keep_local"],
  Uct = ["auto", "12-hour", "24-hour", "24-hour-utc"],
  BPi = ["auto", "tmux", "iterm2", "in-process"],
  cgs = ["dark", "light", "light-daltonized", "dark-daltonized", "light-ansi", "dark-ansi"],
  P1e = ["auto", ...cgs],
  OOn = ["auto", "alwaysAsk", "disabled"],
  Kx = 1e5,
  d0 = 1e6;

export {
  getCachedClientData,
  getGlobalConfig,
  saveGlobalConfig,
  getUserClaudeRulesDir_2,
  isPathPersistedTrusted,
  checkHasTrustDialogAccepted,
  removeProjectHistory,
  isWorkspacePersistedTrusted,
  getCurrentProjectConfig,
  saveGlobalConfigDurably,
  saveCurrentProjectConfigDurably,
  getProjectPathForConfig,
  readGlobalConfigFromDiskOrThrow,
  CONFIG_READ_RETRY_DELAYS_MS,
  saveCurrentProjectConfig,
  Kx,
  d0,
  getFetchedClientData,
  seedClientDataForCurrentKey,
  clientDataSlotKey,
  hasClientDataCacheSlot,
  shouldSkipPluginAutoupdate,
  readFreshOauthAccountFromDisk,
  isLocalSettingsGitTracked,
  getOrCreateUserID,
  resolveExplicitRemoteControlAtStartup,
  isAutoUpdaterDisabled,
  P1e,
  DEFAULT_GLOBAL_CONFIG,
  resetLocalSettingsGitTrackedCache,
  ignoresPersistedTrust,
  PERSISTED_TRUST_IGNORED,
  getWorkspacePersistedTrustKey,
  drainConfigWrites,
  getCustomApiKeyStatus,
  subscribeGlobalConfigInstalled,
  isProjectScopeTrustAccepted,
  customApiKeyResponsesOf,
  NOTIFICATION_CHANNELS,
  getExplicitRemoteControlAtStartup,
  clearProjectPathForConfigCache,
  resetTrustDialogAcceptedCache,
  setPathTrustedDurably,
  isPathTrusted,
  markConfigBootPhaseComplete,
  getConfigBackupDir,
  enableConfigs,
  GLOBAL_CONFIG_KEYS,
  UPi,
  getUserClaudeRulesDir,
  getMemoryPath,
  getManagedClaudeRulesDir,
  workspacePersistedTrustThroughBackend,
  getCachedClientDataStrict,
  deleteProjectConfig,
  OOn,
  Uct,
  EDITOR_MODES,
  BPi,
  getAutoUpdaterDisabledReason,
  formatAutoUpdaterDisabledReason,
  clearClientDataSeed,
  setClientDataCacheKeyGetter,
  setClientDataReadGate,
  setClientDataStrictReadGate,
  setClientDataOverride,
  setClientDataStaleMatchGetter,
  watchGlobalConfigThroughStorage,
  recordFirstStartTime,
  getOrCreateMachineID,
  getCachedClientDataForContextWindow,
  saveGlobalConfigSyncForExit,
  isLocalSettingsGitTrackedInIndex,
  DEFAULT_PROJECT_CONFIG,
  seedInstallIDs,
  setPathTrusted,
  findPersistedTrustKey,
  persistedTrustBoundary,
  getRawCurrentProjectConfigEntry,
  deleteCurrentProjectConfigFields,
  saveCurrentProjectConfigSyncForExit,
  Obr,
  isTrustKeyPersistedTrusted,
  getPersistedTrustKeyForPath,
  cgs,
  getCachedClientDataSlot,
  rechooseGlobalConfigFreshnessWatcher,
  getOrCreateSummonSidKey,
};
