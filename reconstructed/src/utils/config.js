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
import { resolve, join, dirname, basename } from "path";
import { homedir } from "os";
import { unwatchFile, readFileSync } from "fs";
import { randomBytes, randomUUID } from "crypto";
import { HostScoped } from "./hostScoped.js";
import {
  GlobalConfigStore,
  isValidGlobalConfigValue,
  textDecoder,
  isTimestampedValue,
  readTimestampedData,
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
import { ignoresPersistedTrust as ignoresPersistedTrust_2 } from "../cli/headlessCloud/attachServe.js";
import { normalizePathForConfigKey } from "./path.js";
import {
  uncachedStorageRootFor,
  storageRootFor,
  noUncachedRoot,
  findNearestRoot,
  isHomeDirRoot,
} from "./settings/settingsStorage.js";
import { identity } from "./pathClassification.js";
import { findGitRootUncached, findGitRootThroughBackendUncached } from "./git.js";
import { logError } from "./log.js";
import { resolveLocalSettingsStoreRoot } from "./settings/settingsFileParsing.js";
import { getFsImplementation } from "./fsOperations.js";
import { getClaudeConfigDir, isEnvTruthy } from "./envUtils.js";
import { isENOENT, getErrnoCode, ConfigParseError } from "./errors.js";
import { isDisklessSession } from "./disklessSession.js";
import { importMetaRequire } from "../../runtime/bun-runtime.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import { isGitMissingMessageSupported } from "./git/gitMissingMessage.js";
import { GIT_SAFE_GLOBAL_ARGS, pickByHelper } from "./git/gitSafeEnv.js";
import { env, getGlobalClaudeFile } from "./env.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { stripBom, safeParseJSON } from "./json.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { registerWriteQueueDrain } from "./settings/writeQueues.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";
import { registerCleanup, isCleanupStarted } from "./cleanupRegistry.js";
import { shouldShowProjectOnboarding } from "../projectOnboardingState.js";
import { isConfigWatchEventsEnabled, watchFileSafe } from "./fsSafety/guardedFileRead.js";
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
import { bi1KeyCache } from "./plugins/pluginDirectories.js";
import { registerJuniperShoalReader } from "../services/analytics/juniperShoalConfig.js";
import { registerSteerClientData } from "./model/subagentSteer.js";
import {
  AgentApiErrorTerminationError,
  TRANSIENT_API_ERROR_KINDS,
  extractAgentFinalText,
  partialResultPreamble,
} from "../tools/AgentTool/agentToolUtils.js";
import { cleanupOldFilesMatching } from "./cleanup.js";
import { arrayField } from "../services/artifacts/capabilityDeclaration.js";

//@ chunk-aepeg2w5.js:76946-77163 facade-majority = DEFAULT_PROJECT_CONFIG (0.927)
var DEFAULT_PROJECT_CONFIG = {
  allowedTools: [],
  mcpContextUris: [],
  mcpServers: {},
  enabledMcpjsonServers: [],
  disabledMcpjsonServers: [],
  hasTrustDialogAccepted: false,
  hasClaudeMdExternalIncludesApproved: false,
  hasClaudeMdExternalIncludesWarningShown: false,
};
//@ chunk-aepeg2w5.js:77163-77945 fingerprint = createDefaultGlobalConfig (0.948)
/**
 * 全局配置默认值（numStartups、theme=dark、autoCompactEnabled 等），读盘时与文件内容合并。
 */
function createDefaultGlobalConfig() {
  return {
    numStartups: 0,
    installMethod: undefined,
    autoUpdates: undefined,
    theme: "dark",
    preferredNotifChannel: "auto",
    verbose: false,
    editorMode: "normal",
    autoCompactEnabled: true,
    autoScrollEnabled: true,
    showTurnDuration: true,
    externalEditorContext: false,
    showMessageTimestamps: false,
    hasSeenTasksHint: false,
    hasUsedStash: false,
    hasUsedBackgroundTask: false,
    queuedCommandUpHintCount: 0,
    diffTool: "auto",
    customApiKeyResponses: {
      approved: [],
      rejected: [],
    },
    env: {},
    tipsHistory: {},
    memoryUsageCount: 0,
    promptQueueUseCount: 0,
    btwUseCount: 0,
    todoFeatureEnabled: true,
    showExpandedTodos: false,
    briefTranscript: false,
    messageIdleNotifThresholdMs: 60000,
    autoConnectIde: false,
    autoInstallIdeExtension: true,
    fileCheckpointingEnabled: true,
    terminalProgressBarEnabled: true,
    cachedDynamicConfigs: {},
    cachedGrowthBookFeatures: {},
    respectGitignore: true,
    copyFullResponse: false,
  };
}
//@ chunk-aepeg2w5.js:77945-78062 facade-majority = TEST_GLOBAL_CONFIG_FOR_TESTING (0.483)
var DEFAULT_GLOBAL_CONFIG = createDefaultGlobalConfig();
var globalConfigStores = new HostScoped(
  () =>
    new GlobalConfigStore({
      now: Date.now,
      testGlobalConfig: {
        ...DEFAULT_GLOBAL_CONFIG,
        autoUpdates: false,
      },
      testProjectConfig: {
        ...DEFAULT_PROJECT_CONFIG,
      },
    }),
);
//@ chunk-aepeg2w5.js:78062-78091 layout
/**
 * 取当前宿主的全局配置运行时状态（内存缓存、写队列、freshness 监视、测试配置），所有 config 读写都经过它。
 */
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
  getConfigState().setTrustAccepted(false);
}
//@ chunk-aepeg2w5.js:79276-79394 facade-majority
/**
 * 判断当前项目的信任对话框是否已接受（CLAUDE_CODE_SANDBOXED、会话信任、projects[key].hasTrustDialogAccepted 或父目录已信任），结果在进程内记住。
 */
function checkHasTrustDialogAccepted() {
  if (hasNoProjectDir()) return false;
  let configState = getConfigState();
  if (configState.trustAccepted) return true;
  let trustDialogAccepted = computeTrustDialogAccepted_2();
  if (trustDialogAccepted) configState.setTrustAccepted(true);
  return trustDialogAccepted;
}
//@ chunk-aepeg2w5.js:79394-79437 facade-majority
function isProjectScopeTrustAccepted() {
  if (getIsNonInteractiveSession()) return true;
  return checkHasTrustDialogAccepted();
}
//@ chunk-aepeg2w5.js:79437-79490 placement
function isWorkspacePersistedTrusted(cwd) {
  let n = cwd ?? getOriginalCwdOrNull();
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
  return ignoresPersistedTrust_2();
}
//@ chunk-aepeg2w5.js:79776-79866 facade-majority = computeTrustDialogAccepted (1)
function isTrustKeyPersistedTrusted(e) {
  if (isRestrictedWorkspaceTrustKey(e)) return false;
  return getGlobalConfigForTrust().projects?.[e]?.hasTrustDialogAccepted === true;
}
//@ chunk-aepeg2w5.js:79866-79901 placement
function getWorkspacePersistedTrustKey(e) {
  return getPersistedTrustKeyForPath(e ?? getOriginalCwd());
}
//@ chunk-aepeg2w5.js:79901-79945 facade-majority
function getPersistedTrustKeyForPath(e) {
  return normalizePathForConfigKey(uncachedStorageRootFor(e) ?? identity(resolve(e)));
}
//@ chunk-aepeg2w5.js:79945-80005 facade-majority
function isPathPersistedTrustedCwdExact(e) {
  if (findGitRootUncached(e) !== null) return false;
  return isTrustKeyPersistedTrusted(getPersistedTrustKeyForExactPath(e));
}
//@ chunk-aepeg2w5.js:80005-80042 facade-majority
function getPersistedTrustKeyForExactPath(e) {
  return normalizePathForConfigKey(identity(resolve(e)));
}
//@ chunk-aepeg2w5.js:80042-80265 facade-majority
async function persistedTrustKeyThroughBackend(e, originalCwdOrNull) {
  if (e.hostFiles.serving("workspace") !== "host") return;
  let startPath = resolve(originalCwdOrNull);
  let gitRootThroughBackendUncached = await findGitRootThroughBackendUncached(e.hostFiles, startPath);
  if (gitRootThroughBackendUncached === undefined) return;
  if (gitRootThroughBackendUncached.gitRoot === null) return normalizePathForConfigKey(identity(startPath));
  return gitRootThroughBackendUncached.entry === "directory"
    ? normalizePathForConfigKey(gitRootThroughBackendUncached.gitRoot)
    : undefined;
}
//@ chunk-aepeg2w5.js:80265-80398 facade-majority
async function workspacePersistedTrustThroughBackend(storageV5) {
  try {
    let originalCwdOrNull = getOriginalCwdOrNull();
    if (originalCwdOrNull === null) return false;
    let r = await persistedTrustKeyThroughBackend(storageV5, originalCwdOrNull);
    return r === undefined ? undefined : isTrustKeyPersistedTrusted(r);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-aepeg2w5.js:80398-80626 facade-majority
function isLocalSettingsGitTracked({ onIndeterminate }) {
  if (hasNoProjectDir() || isDiskless()) return true;
  if (!checkHasTrustDialogAccepted()) {
    if (
      isCwdHomeOrConfigDir() &&
      getProjectConfigRoot() === null &&
      resolveLocalSettingsStoreRoot(getOriginalCwd(), storageRootFor) === resolve(getOriginalCwd())
    )
      return false;
    return true;
  }
  let localSettingsGitTrackedStatus = getLocalSettingsGitTrackedStatus();
  if (localSettingsGitTrackedStatus === "indeterminate") return onIndeterminate === "tracked";
  return localSettingsGitTrackedStatus === "tracked" || localSettingsGitTrackedStatus === "tracked_in_index";
}
//@ chunk-aepeg2w5.js:80626-80697 facade-majority
function isLocalSettingsGitTrackedInIndex() {
  if (isDiskless() || !checkHasTrustDialogAccepted()) return false;
  return getLocalSettingsGitTrackedStatus() === "tracked_in_index";
}
//@ chunk-aepeg2w5.js:80697-80881 layout
function getLocalSettingsGitTrackedStatus() {
  let configState = getConfigState();
  let originalCwd = getOriginalCwd();
  let r =
    configState.localSettingsGitTracked?.cwd === originalCwd
      ? configState.localSettingsGitTracked.value
      : undefined;
  if (r === undefined) {
    r = computeLocalSettingsGitTracked();
    configState.setLocalSettingsGitTracked({
      cwd: originalCwd,
      value: r,
    });
  }
  return r;
}
//@ chunk-aepeg2w5.js:80881-80936 facade-majority
function resetLocalSettingsGitTrackedCache() {
  getConfigState().setLocalSettingsGitTracked(undefined);
}
//@ chunk-aepeg2w5.js:80936-81074 layout
function isCwdHomeOrConfigDir() {
  let originalCwd = getOriginalCwd();
  let fsImplementation = getFsImplementation();
  try {
    if (fsImplementation.realpathSync(resolve(originalCwd)) === fsImplementation.realpathSync(homedir()))
      return true;
  } catch {}
  return resolve(getClaudeConfigDir()) === resolve(join(originalCwd, ".claude"));
}
//@ chunk-aepeg2w5.js:81074-81357 layout
function computeLocalSettingsGitTracked() {
  let originalCwd = getOriginalCwd();
  let projectConfigRoot = getProjectConfigRoot();
  let r = projectConfigRoot ?? originalCwd;
  let s = [r];
  let h = projectConfigRoot ?? resolveLocalSettingsStoreRoot(originalCwd, storageRootFor);
  if (h !== resolve(r)) s.push(h);
  let y = false;
  let S = false;
  for (let w of s) {
    let R = checkLocalSettingsTrackedAt(w);
    if (R === "tracked_in_index") return "tracked_in_index";
    if (R === "tracked") y = true;
    if (R === "indeterminate") S = true;
  }
  if (y) return "tracked";
  return S ? "indeterminate" : "untracked";
}
//@ chunk-aepeg2w5.js:81357-82524 layout
function checkLocalSettingsTrackedAt(e) {
  let fsImplementation = getFsImplementation();
  try {
    if (fsImplementation.realpathSync(resolve(e)) === fsImplementation.realpathSync(homedir()))
      return "untracked";
  } catch {}
  if (resolve(getClaudeConfigDir()) === resolve(join(e, ".claude"))) return "untracked";
  for (let r of [join(e, ".claude"), join(e, ".claude", "settings.local.json")])
    try {
      if (fsImplementation.lstatSync(r).isSymbolicLink()) return "tracked";
    } catch (error) {
      if (!isENOENT(error)) return "tracked";
    }
  try {
    fsImplementation.lstatSync(join(e, ".claude", ".git"));
    return "tracked";
  } catch (error) {
    if (!isENOENT(error)) return "tracked";
  }
  if (
    noUncachedRoot(e, {
      uncached: true,
    }) !== null
  )
    return "tracked";
  if (isDisklessSession()) return "tracked";
  try {
    let r = importMetaRequire("child_process");
    let s = require("./chunk-qnq0c0a0.js");
    let executableSafely = s.resolveExecutableSafely("git");
    let remoteHostSessionCount = getRemoteHostSessionCount({
      GIT_LITERAL_PATHSPECS: "",
      GIT_TRACE2: "0",
      GIT_TRACE2_PERF: "0",
      GIT_TRACE2_EVENT: "0",
    });
    if (executableSafely === null || isGitMissingMessageSupported(executableSafely, remoteHostSessionCount))
      return "untracked";
    let S = r.spawnSync(
      executableSafely,
      [
        ...GIT_SAFE_GLOBAL_ARGS,
        "-C",
        e,
        "ls-files",
        "--error-unmatch",
        "--",
        ":(icase).claude/settings.local.json",
      ],
      {
        cwd: e,
        encoding: "utf8",
        timeout: 2000,
        windowsHide: true,
        env: remoteHostSessionCount,
      },
    );
    if (S.error && isENOENT(S.error)) return "untracked";
    if (S.signal !== null || S.error) return "tracked";
    if (S.status === 128)
      return /^fatal: not a git repository/.test(S.stderr ?? "") ? "indeterminate" : "tracked";
    if (S.status === 0) return "tracked_in_index";
    if (S.status === 1) return "untracked";
    return "tracked";
  } catch {
    return "untracked";
  }
}
//@ chunk-aepeg2w5.js:82524-82688 layout = computeTrustDialogAccepted (0.778)
function computeTrustDialogAccepted_2() {
  if (env.CLAUDE_CODE_SANDBOXED) return true;
  if (getSessionTrustAccepted()) return true;
  let config = getGlobalConfigForTrust();
  let projectPath = getProjectPathForConfig();
  if (config.projects?.[projectPath]?.hasTrustDialogAccepted) return true;
  return findTrustedAncestor(config, getOriginalCwd()) !== null;
}
//@ chunk-aepeg2w5.js:82688-82870 file-local
function findTrustedAncestor(config, n) {
  let r = identity(resolve(n));
  let currentPath = persistedTrustBoundary(r);
  if (currentPath?.rootOnly) {
    let parentPath = normalizePathForConfigKey(resolve(currentPath.root));
    return config.projects?.[parentPath]?.hasTrustDialogAccepted === true ? parentPath : null;
  }
  return computeTrustDialogAccepted(
    config,
    r,
    currentPath !== null ? normalizePathForConfigKey(resolve(currentPath.root)) : null,
  );
}
//@ chunk-aepeg2w5.js:82870-83055 facade-majority
function persistedTrustBoundary(e) {
  let n = identity(resolve(e));
  let nearestRoot = findNearestRoot(n, {
    uncached: true,
  });
  if (
    nearestRoot !== null &&
    isHomeDirRoot(nearestRoot.root, {
      uncached: true,
    }) !== true
  )
    return {
      root: nearestRoot.root,
      rootOnly: true,
    };
  let gitRootUncached = findGitRootUncached(n);
  return gitRootUncached !== null
    ? {
        root: gitRootUncached,
        rootOnly: false,
      }
    : null;
}
//@ chunk-aepeg2w5.js:83055-83289 layout = computeTrustDialogAccepted (1)
function computeTrustDialogAccepted(e, n, r) {
  let currentPath = normalizePathForConfigKey(n);
  while (true) {
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
function isPathTrusted(e, { advisoryNoFsProbe: n = false } = {}) {
  let globalConfigForTrust = getGlobalConfigForTrust();
  if (n) return computeTrustDialogAccepted(globalConfigForTrust, identity(resolve(e)), null) !== null;
  return findPersistedTrustKey(e) !== null;
}
//@ chunk-aepeg2w5.js:83404-83511 facade-majority = computeTrustDialogAccepted (1)
function findPersistedTrustKey(e) {
  let config = getGlobalConfigForTrust();
  let currentPath = getWorkspacePersistedTrustKey(e);
  if (config.projects?.[currentPath]?.hasTrustDialogAccepted === true) return currentPath;
  return findTrustedAncestor(config, e);
}
//@ chunk-aepeg2w5.js:83511-83579 facade-majority
function isPathTrustedForSession(e) {
  if (env.CLAUDE_CODE_SANDBOXED) return checkHasTrustDialogAccepted();
  return isPathTrusted(e);
}
//@ chunk-aepeg2w5.js:83579-83620 facade-majority
function setPathTrusted(dir, storageV5) {
  return saveGlobalConfig(makeTrustAcceptedUpdater(getWorkspacePersistedTrustKey(dir)), storageV5);
}
//@ chunk-aepeg2w5.js:83620-83661 facade-majority
function setPathTrustedDurably(e, n) {
  return saveGlobalConfigDurably(makeTrustAcceptedUpdater(getWorkspacePersistedTrustKey(e)), n);
}
//@ chunk-aepeg2w5.js:83661-83835 layout = computeTrustDialogAccepted (1)
function makeTrustAcceptedUpdater(workspacePersistedTrustKey) {
  return (n) => {
    if (n.projects?.[workspacePersistedTrustKey]?.hasTrustDialogAccepted) return n;
    return {
      ...n,
      projects: {
        ...n.projects,
        [workspacePersistedTrustKey]: {
          ...(n.projects?.[workspacePersistedTrustKey] ?? DEFAULT_PROJECT_CONFIG),
          hasTrustDialogAccepted: true,
        },
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
  return false;
}
//@ chunk-aepeg2w5.js:83910-83949 facade-majority
function isProjectConfigKey(key) {
  return PROJECT_CONFIG_KEYS.includes(key);
}
//@ chunk-aepeg2w5.js:83949-84133 fingerprint = wouldLoseAuthState (0.837)
/**
 * 新读到的配置相对缓存是否丢失了 oauthAccount 或 hasCompletedOnboarding（防止并发写抹掉登录态）。
 */
function wouldLoseAuthState(fresh) {
  let cached = getConfigState().cache.config;
  if (!cached) return false;
  let lostOauth = cached.oauthAccount !== undefined && fresh.oauthAccount === undefined;
  let lostOnboarding = cached.hasCompletedOnboarding === true && fresh.hasCompletedOnboarding !== true;
  return lostOauth || lostOnboarding;
}
//@ chunk-aepeg2w5.js:84133-85853 layout
/**
 * 低风险的全局配置键集合（启动次数、使用计数、提示次数等），变化时不需要严格处理。
 */
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
]);
var LOW_STAKES_PROJECT_CONFIG_KEYS = new Set([
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
  let r = new Set([...Object.keys(e), ...Object.keys(n)]);
  let s = [];
  for (let h of r) if (jsonStringify(e[h]) !== jsonStringify(n[h])) s.push(h);
  return s;
}
//@ chunk-aepeg2w5.js:85983-86045 layout
/**
 * 判断项目配置的改动是否都属低风险键。
 */
function isLowStakesProjectConfigChange(e, n) {
  return changedConfigKeys(e ?? {}, n ?? {}).every((r) => LOW_STAKES_PROJECT_CONFIG_KEYS.has(r));
}
//@ chunk-aepeg2w5.js:86045-86188 layout
function isOnlyCrashMarkerChange(e, n) {
  let r = changedConfigKeys(e, n);
  return (
    n.lastGracefulShutdown === false &&
    r.length > 0 &&
    r.every((s) => s === "lastGracefulShutdown" || s === "lastVersionBase")
  );
}
//@ chunk-aepeg2w5.js:86188-86211 facade-majority
var CONFIG_CRASH_MARKER_REENQUEUE_DELAYS_MS = [30000, 120000];
//@ chunk-aepeg2w5.js:86211-86415 layout = getProjectsDir (0.798)
/**
 * 判断全局配置的改动是否只涉及低风险键：projects 下逐个项目比较，其余键必须都在 LOW_STAKES_GLOBAL_CONFIG_KEYS 里。
 */
function isLowStakesConfigChange(config, n) {
  return changedConfigKeys(config, n).every((r) => {
    if (r === "projects") {
      let projects = config.projects ?? {};
      let projects_2 = n.projects ?? {};
      return [...new Set([...Object.keys(projects), ...Object.keys(projects_2)])].every((S) =>
        isLowStakesProjectConfigChange(projects[S], projects_2[S]),
      );
    }
    return LOW_STAKES_GLOBAL_CONFIG_KEYS.has(r);
  });
}
//@ chunk-aepeg2w5.js:86415-86870 layout
/**
 * 经存储层读取全局配置，失败时记录并以默认值继续。
 */
async function readGlobalConfigFromStorage(e) {
  let configState = getConfigState();
  let text = await e.readText([STORAGE_SPACES.globalConfig()]);
  if (!text.ok) {
    logForDebugging(
      `Config read through storage failed; continuing from defaults: ${formatStorageError(text.error)}`,
      {
        level: "error",
      },
    );
    configState.setLastGetConfigOutcome("enoent");
    return createDefaultGlobalConfig();
  }
  let s = text.value.items[0];
  if (!s?.found) {
    configState.setLastGetConfigOutcome("enoent");
    return createDefaultGlobalConfig();
  }
  try {
    let h = jsonParse(stripBom(s.value));
    configState.setLastGetConfigOutcome("parsed");
    return {
      ...createDefaultGlobalConfig(),
      ...h,
    };
  } catch {
    configState.setLastGetConfigOutcome("parse-error");
    return createDefaultGlobalConfig();
  }
}
//@ chunk-aepeg2w5.js:86870-87306 layout
/**
 * 回退写配置时取基准配置：最近一次读取为解析错误或读错误时改用调用方给的或缓存的配置（标记 cacheDerived/readRejected），否则用新读到的配置。
 */
async function readConfigForFallbackWrite(e, n) {
  let configState = getConfigState();
  let config =
    isStorageV5Enabled() && n !== undefined
      ? await readGlobalConfigFromStorage(n)
      : await readGlobalConfigWithRetry();
  let readRejected = configState.lastGetConfigOutcome === "read-error";
  if (
    configState.lastGetConfigOutcome === "parse-error" ||
    configState.lastGetConfigOutcome === "read-error"
  ) {
    if (e)
      return {
        config: {
          ...e,
        },
        cacheDerived: true,
        readRejected,
      };
    if (configState.cache.config)
      return {
        config: {
          ...configState.cache.config,
        },
        cacheDerived: true,
        readRejected,
      };
    return {
      config,
      cacheDerived: true,
      readRejected,
    };
  }
  return {
    config,
    cacheDerived: false,
    readRejected: false,
  };
}
//@ chunk-aepeg2w5.js:87306-87351 layout
var GLOBAL_CONFIG = "global-config";
var EXTERNAL_REFRESH = "external-refresh";
//@ chunk-aepeg2w5.js:87351-87415 layout
/**
 * 把“从磁盘刷新全局配置”排入写队列执行。
 */
function scheduleGlobalConfigRefresh(e) {
  getConfigState().writeQueues.run(EXTERNAL_REFRESH, () => refreshGlobalConfigFromDisk(e).catch(() => {}));
}
//@ chunk-aepeg2w5.js:87415-87637 layout
function runQueuedConfigWrite(e) {
  let configState = getConfigState();
  configState.beginPendingWrite();
  return configState.writeQueues.run(GLOBAL_CONFIG, async () => {
    try {
      return await e();
    } finally {
      if (configState.endPendingWrite() === 0) {
        let r = configState.takePendingExternalRefresh();
        if (r === "storage") scheduleExternalConfigRefresh();
        else if (r) scheduleGlobalConfigRefresh(r);
      }
    }
  });
}
//@ chunk-aepeg2w5.js:87637-87684 facade-majority
function drainConfigWrites() {
  return getConfigState().writeQueues.drain();
}
//@ chunk-aepeg2w5.js:87684-87693 layout
registerWriteQueueDrain(drainConfigWrites);
//@ chunk-aepeg2w5.js:87693-87828 layout
function applyOptimisticConfigUpdate(e) {
  let configState = getConfigState();
  let config = configState.cache.config;
  if (!config) return null;
  try {
    let s = e(config);
    if (s === config) return config;
    configState.applyOptimistic(stripRetiredConfigKeys(s));
  } catch {}
  return config;
}
//@ chunk-aepeg2w5.js:87828-88364 layout
/**
 * 判断配置写入是否只能留在内存（存储 V5 下未交接的写入者）。
 */
function isConfigWriteMemoryOnly(e, n) {
  if (isStorageV5Enabled() && e !== undefined) return false;
  if (isStorageV5Enabled() && getConfigState().unhandedWritesInMemory) {
    logFeatureSad("storage_v5_backend", "unhanded_config_writer");
    logForDebugging(
      `config: ${n} ran without the storage backend in a process whose config record has no file behind it; the change is in memory only and is replaced when a backend-handed save or refresh rebuilds the config from the record`,
      {
        level: "warn",
      },
    );
    return true;
  }
  if (isDiskless()) {
    logForDebugging(
      `config: ${n} ran in a diskless process with no storage backend to write through; the change is in memory only`,
      {
        level: "warn",
      },
    );
    return true;
  }
  return false;
}
//@ chunk-aepeg2w5.js:88364-88415 facade-majority
/**
 * 在文件锁下读-改-写 ~/.claude.json；锁失败时走回退写，但若重读结果丢失了缓存里有的 oauthAccount/hasCompletedOnboarding 则拒绝写入（tengu_config_auth_loss_prevented，见 GH #3117）。
 */
function saveGlobalConfig(e, n) {
  return saveGlobalConfigQueued(e, n).then(() => {
    return;
  });
}
//@ chunk-aepeg2w5.js:88415-88461 facade-majority
function saveGlobalConfigDurably(e, n) {
  return saveGlobalConfigQueued(e, n).catch(() => false);
}
//@ chunk-aepeg2w5.js:88461-88825 layout
/**
 * 保存全局配置：先在内存缓存上乐观应用更新函数，再在 global-config 写队列中加锁写盘（saveGlobalConfig）；diskless/无后端时只改内存。
 */
function saveGlobalConfigQueued(e, n) {
  let configState = getConfigState();
  if (isTestConfigMode()) {
    let y = e(configState.testGlobalConfig);
    if (y === configState.testGlobalConfig) return Promise.resolve(true);
    configState.overwriteTestGlobalConfig(y);
    return Promise.resolve(true);
  }
  let s = applyOptimisticConfigUpdate((y) => {
    let S = e(y);
    if (S === y) return y;
    return {
      ...S,
      projects: mergeProjectsForSave(y.projects, S.projects),
    };
  });
  if (isConfigWriteMemoryOnly(n, "saveGlobalConfig")) return Promise.resolve(false);
  let lockRetrySignal = getBootSaveRetrySignal(configState);
  return runQueuedConfigWrite(() => saveGlobalConfig_2(e, s, n, lockRetrySignal));
}
//@ chunk-aepeg2w5.js:88825-90196 fingerprint = saveGlobalConfig (0.49)
async function saveGlobalConfig_2(e, n, r, lockRetrySignal) {
  let configState = getConfigState();
  let written = null;
  let S = false;
  let w = false;
  try {
    let R = await saveConfigWithLock(
      (current) => {
        let config = e(current);
        if (config === current) {
          S = true;
          return current;
        }
        written = stripRetiredConfigKeys({
          ...config,
          projects: mergeProjectsForSave(current.projects, config.projects),
        });
        return written;
      },
      n,
      {
        onCompromised: () => (w = true),
        lockRetrySignal,
      },
      r,
    );
    if (R && written) writeThroughConfigCache(written);
    return (R || S) && !w;
  } catch (error) {
    logForDebugging(`Failed to save config with lock: ${error}`, {
      level: "error",
    });
    let configForFallbackWrite = await readConfigForFallbackWrite(n, r);
    if (configForFallbackWrite.readRejected) {
      logConfigFallbackSuppressedUnreadable("save_global");
      return false;
    }
    let config = configForFallbackWrite.config;
    let config_2 = e(config);
    if (config_2 === config) return true;
    let L = {
      ...config_2,
      projects: mergeProjectsForSave(config.projects, config_2.projects),
    };
    written = stripRetiredConfigKeys(L);
    if (
      isLockContentionError(error) &&
      !configForFallbackWrite.cacheDerived &&
      isLowStakesConfigChange(config, L)
    ) {
      logConfigFallbackSkippedContention("save_global");
      return false;
    }
    if (wouldLoseAuthState(config) && wouldLoseAuthState(written)) {
      let G = configState.pendingWriteCount();
      if (G > 1 && isLockContentionError(error))
        logForDebugging(
          "saveGlobalConfig fallback under contention: proceeding on the base as-is (fresh disk on a clean read; the snapshot copy on a torn read); the write queued behind carries the pending auth. See GH #3117 / gh-73364.",
        );
      else if (G > 1 && n) {
        logForDebugging(
          "saveGlobalConfig fallback: merge base is missing auth the cache has, but an in-process write is queued behind this one; re-basing on the enqueue-time cache snapshot so the pending auth and this write both land. See GH #3117.",
        );
        config = {
          ...n,
        };
        config_2 = e(config);
        if (config_2 === config) return true;
        written = stripRetiredConfigKeys({
          ...config_2,
          projects: mergeProjectsForSave(config.projects, config_2.projects),
        });
      } else {
        logForDebugging(
          "saveGlobalConfig fallback: re-read config is missing auth that cache has; refusing to write. See GH #3117.",
          {
            level: "error",
          },
        );
        logEvent("tengu_config_auth_loss_prevented", {});
        return false;
      }
    }
    await saveConfig(written, "save_global", r);
    return false;
  }
}
//@ chunk-aepeg2w5.js:90196-90339 fingerprint = reportConfigCacheStats (0.798)
function reportConfigCacheStats() {
  let { hits, misses } = getConfigState().takeCacheStats();
  let total = hits + misses;
  if (total > 0)
    logEvent("tengu_config_cache_stats", {
      cache_hits: hits,
      cache_misses: misses,
      hit_rate: hits / total,
    });
}
//@ chunk-aepeg2w5.js:90339-90359 layout
registerCleanup(async () => {
  reportConfigCacheStats();
});
//@ chunk-aepeg2w5.js:90359-90653 fingerprint = migrateConfigFields (0.723)
/**
 * 旧字段迁移：删 showSpinnerTree；由 autoUpdaterStatus 推出 installMethod/autoUpdates。
 */
function migrateConfigFields(config) {
  delete config.showSpinnerTree;
  if (config.installMethod !== undefined) return config;
  let legacy = config;
  let installMethod = "unknown";
  let autoUpdates = config.autoUpdates ?? true;
  switch (legacy.autoUpdaterStatus) {
    case "migrated":
      installMethod = "local";
      break;
    case "disabled":
      autoUpdates = false;
      break;
    case "enabled":
      installMethod = "global";
      break;
    case undefined:
      break;
  }
  return {
    ...config,
    installMethod,
    autoUpdates,
  };
}
//@ chunk-aepeg2w5.js:90653-91282 affinity
/**
 * 写盘前删除已退役的键（opus1mMergeNoticeSeenCount、speculationEnabled、prideFlag 等），没有时原样返回。
 */
function stripRetiredConfigKeys(e) {
  let n = e;
  if (
    n.opus1mMergeNoticeSeenCount === undefined &&
    n.voiceNoticeSeenCount === undefined &&
    n.opus47LaunchSeenCount === undefined &&
    n.opus48LaunchSeenCount === undefined &&
    n.speculationEnabled === undefined &&
    n.fleetViewPeakConcurrent === undefined &&
    n.pluginUsageLspGraceApplied === undefined &&
    n.autoModeOptInDismissed === undefined &&
    n.prideFlag === undefined &&
    n.routineFiredWatermark === undefined
  )
    return e;
  let {
    opus1mMergeNoticeSeenCount,
    voiceNoticeSeenCount,
    opus47LaunchSeenCount,
    opus48LaunchSeenCount,
    speculationEnabled,
    fleetViewPeakConcurrent,
    pluginUsageLspGraceApplied,
    autoModeOptInDismissed,
    prideFlag,
    routineFiredWatermark,
    ...L
  } = n;
  return L;
}
//@ chunk-aepeg2w5.js:91688-91843 sole-consumer
function mergeProjectsForSave(projects, projects_2) {
  if (projects_2 === projects || !projects) return shouldShowProjectOnboarding(projects_2);
  if (!projects_2) return shouldShowProjectOnboarding(projects);
  let r = projects_2;
  for (let [key, value] of Object.entries(projects))
    if (!(key in projects_2)) {
      if (r === projects_2)
        r = {
          ...projects_2,
        };
      r[key] = value;
    }
  return shouldShowProjectOnboarding(r);
}
//@ chunk-aepeg2w5.js:91843-91871 sole-consumer
/**
 * 配置监视的回退轮询间隔（1 秒，也用作最大观测延迟）。
 */
var CONFIG_WATCH_FALLBACK_POLL_MS = 1000;
var CONFIG_WATCH_SAFETY_POLL_MS = 60000;
var CONFIG_WATCH_SETTLE_MS = 200;
//@ chunk-aepeg2w5.js:91871-92291 affinity
/**
 * 启动对 ~/.claude.json 的外部修改监视（事件监视或 fs.watchFile 轮询）：文件更新且无待写入时刷新内存配置，有待写入时延后刷新。
 */
function startGlobalConfigFreshnessWatcher() {
  let configState = getConfigState();
  if (configState.freshnessWatcherStarted) return;
  if (isConfigFileWatchDisabled()) return;
  configState.setFreshnessWatcherStarted(true);
  let file = getGlobalClaudeFile();
  let onStat = (s) => {
    if (s.mtimeMs <= configState.cache.mtime) return;
    if (configState.pendingWriteCount() > 0) {
      configState.deferExternalRefresh(s);
      return;
    }
    scheduleGlobalConfigRefresh(s);
  };
  if (isConfigWatchEventsEnabled())
    configState.setFreshnessEventWatch(
      new FileStatWatcher(
        file,
        {
          fallbackPollMs: CONFIG_WATCH_FALLBACK_POLL_MS,
          safetyPollMs: CONFIG_WATCH_SAFETY_POLL_MS,
          settleMs: CONFIG_WATCH_SETTLE_MS,
        },
        onStat,
      ),
    );
  else
    watchFileSafe(
      file,
      {
        interval: CONFIG_WATCH_FALLBACK_POLL_MS,
        persistent: false,
      },
      onStat,
    );
  registerCleanup(async () => {
    stopGlobalConfigFreshnessWatcher(configState);
    configState.setFreshnessBackend(undefined);
  });
}
//@ chunk-aepeg2w5.js:92291-92446 facade-majority
function rechooseGlobalConfigFreshnessWatcher() {
  let configState = getConfigState();
  if (
    !configState.freshnessWatcherStarted ||
    isConfigWatchEventsEnabled() === (configState.freshnessEventWatch !== undefined)
  )
    return;
  stopGlobalConfigFreshnessWatcher(configState);
  startGlobalConfigFreshnessWatcher();
  if (configState.freshnessEventWatch === undefined) scheduleExternalConfigRefresh();
}
//@ chunk-aepeg2w5.js:92446-92567 layout
function stopGlobalConfigFreshnessWatcher(configState) {
  configState.freshnessEventWatch?.close();
  configState.setFreshnessEventWatch(undefined);
  unwatchFile(getGlobalClaudeFile());
  configState.setFreshnessWatcherStarted(false);
}
//@ chunk-aepeg2w5.js:92567-92622 layout
/**
 * 无盘或启用 v5 存储且无回退时，不做配置文件监视。
 */
function isConfigFileWatchDisabled() {
  return isDiskless() || (isStorageV5Enabled() && !getConfigState().fileWatchFallback);
}
//@ chunk-aepeg2w5.js:92622-92791 layout
function logGlobalConfigUnwatched() {
  logForDebugging(
    "Not watching ~/.claude.json for other processes: the fs.watchFile fallback is off for this process",
    {
      level: "warn",
    },
  );
  logForDiagnosticsNoPII("warn", "global_config_unwatched");
}
//@ chunk-aepeg2w5.js:92791-92974 layout
async function refreshGlobalConfigFromDisk(e) {
  let configState = getConfigState();
  let globalClaudeFile = getGlobalClaudeFile();
  let s;
  try {
    s = await getFsImplementation().readFile(globalClaudeFile, {
      encoding: "utf-8",
    });
  } catch {
    return;
  }
  if (
    isStorageV5Enabled() &&
    configState.freshnessBackend !== undefined &&
    !configState.freshnessWatcherStarted
  )
    return;
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
  let h = safeParseJSON(stripBom(e), false);
  if (h === null || typeof h !== "object") return;
  file.installDiskRead(
    migrateConfigFields({
      ...createDefaultGlobalConfig(),
      ...h,
    }),
    n,
  );
}
//@ chunk-aepeg2w5.js:93199-93550 layout
async function checkGlobalConfigFreshness() {
  let freshnessBackend = getConfigState().freshnessBackend;
  if (isStorageV5Enabled() && freshnessBackend !== undefined) {
    let text = await freshnessBackend.readText([STORAGE_SPACES.globalConfig()]);
    if (!text.ok) return;
    let s = text.value.items[0];
    if (!s?.found) return;
    installGlobalConfigFromDisk(
      s.value,
      {
        mtimeMs: s.mtimeMs,
        size: s.totalBytes,
      },
      "storage",
    );
    return;
  }
  if (isConfigFileWatchDisabled()) return;
  let n;
  try {
    let stats = await getFsImplementation().stat(getGlobalClaudeFile());
    n = {
      mtimeMs: stats.mtimeMs,
      size: stats.size,
    };
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
  let configState = getConfigState();
  if (e === undefined) {
    if (configState.freshnessBackend !== undefined) detachGlobalConfigStorageBackend();
    return;
  }
  if (
    isStorageV5Enabled() &&
    configState.freshnessBackend === undefined &&
    configState.freshnessWatcherStarted
  ) {
    configState.setFreshnessBackend(e);
    let r = await subscribeGlobalConfigViaStorage(e);
    if (configState.freshnessBackend !== e) {
      r?.unsubscribe();
      return;
    }
    if (!r) {
      configState.setFreshnessBackend(undefined);
      return;
    }
    configState.setFreshnessSubscription(r);
    stopGlobalConfigFreshnessWatcher(configState);
  }
}
//@ chunk-aepeg2w5.js:93941-94293 layout
function detachGlobalConfigStorageBackend() {
  let configState = getConfigState();
  let freshnessSubscription = configState.freshnessSubscription;
  configState.setFreshnessBackend(undefined);
  configState.setFreshnessSubscription(undefined);
  configState.setLoadedVersion(undefined);
  startGlobalConfigWatcher();
  freshnessSubscription?.unsubscribe();
  logForDebugging(
    isConfigFileWatchDisabled()
      ? "The startup storage backend was withdrawn; ~/.claude.json is now unwatched"
      : "The startup storage backend was withdrawn; watching ~/.claude.json with the fs.watchFile poll again",
  );
}
//@ chunk-aepeg2w5.js:94293-94695 layout
async function subscribeGlobalConfigViaStorage(e) {
  let n;
  try {
    let s = await e.subscribe(
      {
        target: "key",
        key: STORAGE_SPACES.globalConfig(),
      },
      onGlobalConfigStorageEvent,
      {
        maxObservationLagMs: CONFIG_WATCH_FALLBACK_POLL_MS,
      },
    );
    if (s.ok) {
      logForDebugging("Watching ~/.claude.json for other processes through the storage interface");
      return s.value;
    }
    n = formatStorageError(s.error);
  } catch (error) {
    n = String(error);
  }
  let r = isConfigFileWatchDisabled() ? "" : "; using the fs.watchFile poll";
  logForDebugging(`Watching ~/.claude.json through the storage interface failed${r}: ${n}`, {
    level: "warn",
  });
  return;
}
//@ chunk-aepeg2w5.js:94695-94832 layout
function startGlobalConfigWatcher() {
  let configState = getConfigState();
  if (isCleanupStarted()) return;
  if (isConfigFileWatchDisabled()) {
    logGlobalConfigUnwatched();
    if (configState.freshnessBackend !== undefined) scheduleExternalConfigRefresh();
    return;
  }
  configState.setFreshnessBackend(undefined);
  startGlobalConfigFreshnessWatcher();
  scheduleExternalConfigRefresh();
}
//@ chunk-aepeg2w5.js:94832-95618 layout
function onGlobalConfigStorageEvent(e) {
  let configState = getConfigState();
  let freshnessBackend = configState.freshnessBackend;
  if (!isStorageV5Enabled() || freshnessBackend === undefined) return;
  if (!e.ok) {
    if (isCleanupStarted()) return;
    logForDebugging(
      `Watching ~/.claude.json through the storage interface ended: ${formatStorageError(e.error)}`,
      {
        level: "warn",
      },
    );
    configState.setFreshnessSubscription(undefined);
    if (configState.claimFreshnessResubscribe())
      subscribeGlobalConfigViaStorage(freshnessBackend).then((h) => {
        if (configState.freshnessBackend !== freshnessBackend) h?.unsubscribe();
        else if (h) configState.setFreshnessSubscription(h);
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
      if (s.kind === "snapshot" && configState.loadedVersion !== undefined) {
        let loadedVersion = configState.loadedVersion;
        configState.setLoadedVersion(undefined);
        if ("version" in s && s.version === loadedVersion) return;
      }
      if (configState.pendingWriteCount() > 0) {
        configState.deferExternalRefresh("storage");
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
  let configState = getConfigState();
  if (configState.pendingWriteCount() > 1) {
    configState.advanceFreshnessCursor();
    return;
  }
  configState.writeThrough(e);
}
//@ chunk-aepeg2w5.js:95724-95774 facade-majority
function subscribeGlobalConfigInstalled(e) {
  return getConfigState().installed.subscribe(e);
}
//@ chunk-aepeg2w5.js:95774-95950 facade-majority = getGlobalConfig (0)
/**
 * 返回内存中的全局配置（~/.claude.json），未启用配置前访问会抛 Config accessed before allowed；测试模式返回测试配置。
 */
function getGlobalConfig() {
  let configState = getConfigState();
  if (isTestConfigMode()) return configState.testGlobalConfig;
  let cache = configState.readCache();
  if (cache) return cache;
  if (!configState.enableSettled) throw Error("Config accessed before allowed.");
  return migrateConfigFields(createDefaultGlobalConfig());
}
//@ chunk-aepeg2w5.js:95950-96009 facade-majority
async function readFreshOauthAccountFromDisk(storageV5) {
  try {
    return await readOauthAccountFromDiskOrThrow(storageV5);
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:96009-96370 facade-majority
async function readOauthAccountFromDiskOrThrow(e) {
  let globalConfigFromDiskOrThrow = await readGlobalConfigFromDiskOrThrow(e);
  if (
    typeof globalConfigFromDiskOrThrow !== "object" ||
    globalConfigFromDiskOrThrow === null ||
    !("oauthAccount" in globalConfigFromDiskOrThrow)
  )
    return;
  let oauthAccount = globalConfigFromDiskOrThrow.oauthAccount;
  if (oauthAccount === null || typeof oauthAccount !== "object") return;
  return {
    accountUuid:
      "accountUuid" in oauthAccount && typeof oauthAccount.accountUuid === "string"
        ? oauthAccount.accountUuid
        : undefined,
    organizationUuid:
      "organizationUuid" in oauthAccount && typeof oauthAccount.organizationUuid === "string"
        ? oauthAccount.organizationUuid
        : undefined,
  };
}
//@ chunk-aepeg2w5.js:96370-96809 facade-majority
async function readGlobalConfigFromDiskOrThrow(e) {
  if (isTestConfigMode()) return getConfigState().testGlobalConfig;
  let n;
  if (isStorageV5Enabled() && e !== undefined) {
    let text = await e.readText([STORAGE_SPACES.globalConfig()]);
    if (!text.ok) throw Error("global config not readable through storage");
    let h = text.value.items[0];
    if (!h?.found) return;
    n = h.value;
  } else if (isDiskless()) return;
  else
    try {
      n = await getFsImplementation().readFile(getGlobalClaudeFile(), {
        encoding: "utf-8",
      });
    } catch (error) {
      if (isENOENT(error)) return;
      throw error;
    }
  let r = safeParseJSON(stripBom(n), false);
  if (r === null) throw Error("global config not parseable");
  return r;
}
//@ chunk-aepeg2w5.js:96809-96843 facade-majority
function getExplicitRemoteControlAtStartup() {
  return resolveExplicitRemoteControlAtStartup().value;
}
//@ chunk-aepeg2w5.js:96843-97696 facade-majority
function resolveExplicitRemoteControlAtStartup() {
  let e = require("./chunk-0crvnfjy.js");
  let remoteControlAtStartup = e.projectSettingsAliasesUserSettings()
    ? undefined
    : e.getSettingsForSourceTightenOnly("projectSettings")?.remoteControlAtStartup;
  let remoteControlAtStartup_2 = e.getSettingsForSourceTightenOnly("localSettings")?.remoteControlAtStartup;
  if (remoteControlAtStartup === false || remoteControlAtStartup_2 === false)
    return {
      value: false,
      source: "project_or_local_false",
    };
  let s = e.getSecuritySensitiveSettingWithSources("remoteControlAtStartup")[0];
  let h =
    s === undefined
      ? isValidGlobalConfigValue("remoteControlAtStartup", getGlobalConfig().remoteControlAtStartup)
      : undefined;
  let y =
    s !== undefined
      ? {
          value: s.value,
          source: TRUSTED_SOURCE_SHORT_NAMES[s.source],
        }
      : h !== undefined
        ? {
            value: h,
            source: "legacy_global_config",
          }
        : {
            value: undefined,
            source: "none",
          };
  if (y.value !== true && (remoteControlAtStartup === true || remoteControlAtStartup_2 === true))
    logForDebugging(
      `remoteControlAtStartup: true in ${remoteControlAtStartup === true && remoteControlAtStartup_2 === true ? "project and local" : remoteControlAtStartup === true ? "project" : "local"} settings ignored \u2014 repo-scoped settings cannot enable Remote Control; set it at user scope (/config)`,
    );
  return y;
}
//@ chunk-aepeg2w5.js:97696-97769 layout
var TRUSTED_SOURCE_SHORT_NAMES = {
  policySettings: "policy",
  flagSettings: "flag",
  userSettings: "user",
};
//@ chunk-aepeg2w5.js:97769-97804 facade-majority
/**
 * 某个自定义 API key（截断形式）在 customApiKeyResponses 中是 approved、rejected 还是 new。
 */
function getCustomApiKeyStatus(e) {
  return customApiKeyStatusOf(getGlobalConfig(), e);
}
//@ chunk-aepeg2w5.js:97804-97935 facade-majority = getCustomApiKeyStatus (0.918)
function customApiKeyStatusOf(globalConfig, n) {
  let { approved, rejected } = customApiKeyResponsesOf(globalConfig);
  if (approved.includes(n)) return "approved";
  if (rejected.includes(n)) return "rejected";
  return "new";
}
//@ chunk-aepeg2w5.js:97935-98038 facade-majority = isCustomApiKeyApproved (0.816)
/**
 * 返回 customApiKeyResponses（approved/rejected 截断 key 列表）。
 */
function customApiKeyResponsesOf(apiKey) {
  let customApiKeyResponses = apiKey.customApiKeyResponses;
  return {
    approved: stringArray(customApiKeyResponses?.approved),
    rejected: stringArray(customApiKeyResponses?.rejected),
  };
}
//@ chunk-aepeg2w5.js:98038-98093 facade-majority
/**
 * 启动阶段仍视为“打开”的时间预算（30 秒）。
 */
var CONFIG_LOCK_RETRY_DELAYS_MS = [200, 400, 800, 1600, 3200, 4000];
var CONFIG_LOCK_BOOT_SAVE_RETRY_BUDGET_MS = 1500;
var CONFIG_LOCK_BOOT_PHASE_BUDGET_MS = 30000;
//@ chunk-aepeg2w5.js:98093-98130 facade-majority
function markConfigBootPhaseComplete() {
  getConfigState().closeBootPhase();
}
//@ chunk-aepeg2w5.js:98130-98341 layout
function getBootSaveRetrySignal(configState) {
  if (configState.bootPhaseSignalForTesting !== undefined) return configState.bootPhaseSignalForTesting;
  if (!configState.bootPhaseStillOpen(CONFIG_LOCK_BOOT_PHASE_BUDGET_MS)) return;
  let abortController = new AbortController();
  setTimeout((s) => s.abort(), CONFIG_LOCK_BOOT_SAVE_RETRY_BUDGET_MS, abortController).unref?.();
  return abortController.signal;
}
//@ chunk-aepeg2w5.js:98341-98362 facade-majority
var CONFIG_READ_RETRY_DELAYS_MS = [50, 150, 450];
//@ chunk-aepeg2w5.js:98362-98536 layout
async function readGlobalConfigWithRetry(e) {
  let configState = getConfigState();
  let configWithOutcome = await getConfigWithOutcome(e);
  let lastGetConfigOutcome = configState.lastGetConfigOutcome;
  for (let h of CONFIG_READ_RETRY_DELAYS_MS) {
    if (lastGetConfigOutcome !== "read-error") break;
    await sleep(h);
    configWithOutcome = await getConfigWithOutcome(e);
    lastGetConfigOutcome = configState.lastGetConfigOutcome;
  }
  return configWithOutcome;
}
//@ chunk-aepeg2w5.js:98536-98575 layout
/**
 * 判断错误是否为 ELOCKED 锁竞争。
 */
function isLockContentionError(error) {
  return getErrnoCode(error) === "ELOCKED";
}
//@ chunk-aepeg2w5.js:98575-98586 facade-majority
var _isLockContentionErrorForTesting = isLockContentionError;
//@ chunk-aepeg2w5.js:98586-98906 layout
function logConfigFallbackSkippedContention(e, n = false) {
  logForDebugging(
    `Config lock still held by a live process after retries; skipping the unlocked fallback write (${e}) to avoid clobbering the lock holder${n ? " and re-enqueueing it through the locked path" : ""}. See gh-73364.`,
    {
      level: "error",
    },
  );
  logEvent("tengu_config_fallback_skipped_contention", {
    caller: fromEnum(e),
    reenqueued: n,
  });
}
//@ chunk-aepeg2w5.js:98906-99209 layout
function logConfigFallbackSuppressedUnreadable(e) {
  logForDebugging(
    `Config re-read was rejected (disk unreadable); suppressing the unlocked fallback write (${e}) \u2014 a memory-derived base may not be written without the lock. See the decision table at GetConfigOutcome.`,
    {
      level: "error",
    },
  );
  logEvent("tengu_config_fallback_suppressed_unreadable", {
    caller: fromEnum(e),
  });
}
//@ chunk-aepeg2w5.js:99209-99834 callgraph-witnessed = saveConfig (0.182)
async function saveConfig(file, config, defaultConfig) {
  writeThroughConfigCache(file);
  let s = false;
  try {
    let filteredConfig = pickByHelper(
      file,
      (value, key) => jsonStringify(value) !== jsonStringify(DEFAULT_GLOBAL_CONFIG[key]),
    );
    if (isStorageV5Enabled() && defaultConfig !== undefined) {
      if (!isDiskless()) await getFsImplementation().mkdir(dirname(getGlobalClaudeFile()));
      let y = await defaultConfig.write(
        STORAGE_SPACES.globalConfig(),
        jsonStringify(filteredConfig, null, 2),
        {
          publishDiscipline: "followAtomic",
          mode: 384,
          precondition: {
            type: "none",
          },
        },
      );
      if (!y.ok)
        throw Error("Config fallback write through storage failed", {
          cause: formatStorageError(y.error),
        });
    } else {
      let globalClaudeFile = getGlobalClaudeFile();
      await getFsImplementation().mkdir(dirname(globalClaudeFile));
      await writeFileAtomic_2(globalClaudeFile, jsonStringify(filteredConfig, null, 2), {
        encoding: "utf-8",
        mode: 384,
        allowSymlink: true,
      });
    }
    s = true;
  } catch (error) {
    logForDebugging(`Config fallback write also failed; continuing without persisting: ${error}`, {
      level: "error",
    });
  }
  logEvent("tengu_config_fallback_write", {
    caller: fromEnum(config),
    disk_ok: s,
  });
  return s;
}
//@ chunk-aepeg2w5.js:99834-99852 layout
/**
 * 保留的配置备份份数（5）。
 */
var CONFIG_BACKUP_MIN_INTERVAL_MS = 60000;
var MAX_CONFIG_BACKUPS = 5;
//@ chunk-aepeg2w5.js:99852-100634 layout
async function backupGlobalConfig(e, n) {
  if (isStorageV5Enabled() && n !== undefined) {
    let h = await backupGlobalConfigViaStorage(n.backend, n.replaced, e).catch((error) => String(error));
    if (h !== undefined)
      logForDebugging(`Failed to backup config: ${h}`, {
        level: "error",
      });
    return;
  }
  let globalClaudeFile = getGlobalClaudeFile();
  let fsImplementation = getFsImplementation();
  try {
    let h = basename(globalClaudeFile);
    let configBackupDir = getConfigBackupDir_2();
    try {
      await fsImplementation.mkdir(configBackupDir);
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
    let S = (await fsImplementation.readdir(configBackupDir))
      .map((L) => L.name)
      .filter((L) => L.startsWith(`${h}.backup.`))
      .sort()
      .reverse();
    let w = S[0];
    let R = w ? Number(w.split(".backup.").pop()) : 0;
    let P = (Number.isNaN(R) || Date.now() - R >= CONFIG_BACKUP_MIN_INTERVAL_MS) && !e;
    if (P) {
      let L = join(configBackupDir, `${h}.backup.${Date.now()}`);
      await fsImplementation.copyFile(globalClaudeFile, L);
    }
    let F = P
      ? (await fsImplementation.readdir(configBackupDir))
          .map((L) => L.name)
          .filter((L) => L.startsWith(`${h}.backup.`))
          .sort()
          .reverse()
      : S;
    for (let L of F.slice(MAX_CONFIG_BACKUPS))
      try {
        await fsImplementation.unlink(join(configBackupDir, L));
      } catch {}
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      logForDebugging(`Failed to backup config: ${error}`, {
        level: "error",
      });
  }
}
//@ chunk-aepeg2w5.js:100634-100749 layout
async function getGlobalConfigFileMode(e) {
  let n = await e.statMeta(STORAGE_SPACES.globalConfig());
  return n.ok && n.value.mode !== undefined ? n.value.mode : 384;
}
//@ chunk-aepeg2w5.js:100749-101164 layout
/**
 * 经存储层备份全局配置，按最小间隔控制备份频率。
 */
async function backupGlobalConfigViaStorage(backend, replaced, r) {
  let s = await listGlobalConfigBackups(backend);
  if (!s.ok) return s.error;
  let h = s.value;
  let last = h.sort().at(-1);
  let S = last ? Number(last) : 0;
  if ((Number.isNaN(S) || Date.now() - S >= CONFIG_BACKUP_MIN_INTERVAL_MS) && !r) {
    if (replaced === undefined) return;
    let R = String(Date.now());
    let x = await backend.write(STORAGE_SPACES.globalConfigCopy("backup", R), replaced, {
      exactMode: await getGlobalConfigFileMode(backend),
    });
    if (!x.ok) return formatStorageError(x.error);
    h.push(R);
  }
  for (let R of h.sort().reverse().slice(MAX_CONFIG_BACKUPS))
    await backend.delete(STORAGE_SPACES.globalConfigCopy("backup", R));
  return;
}
//@ chunk-aepeg2w5.js:101164-101571 layout
/**
 * 列出存储层中全局配置的各个副本键。
 */
async function listGlobalConfigCopies(e, n, skipKeyStats) {
  let s = [];
  let allPages = await readAllPages(
    (cursor) =>
      e.listEntries(
        {
          namespace: "globalConfig",
          kind: n,
        },
        {
          cursor,
          skipKeyStats,
        },
      ),
    (y) => {
      for (let S of y)
        if (S.kind === "key" && S.key.namespace === "globalConfig" && "kind" in S.key && S.key.kind === n)
          s.push({
            stamp: S.key.stamp,
            size: S.size,
          });
    },
  );
  switch (allPages.status) {
    case "done":
      return ok_2(s);
    case "error":
      return err(formatStorageError(allPages.error));
    case "capped":
      return err(`more than ${DEFAULT_MAX_PAGES} pages of copies`);
  }
}
//@ chunk-aepeg2w5.js:101571-101666 layout
async function listGlobalConfigBackups(e) {
  let n = await listGlobalConfigCopies(e, "backup", true);
  return n.ok ? ok_2(n.value.map((r) => r.stamp)) : n;
}
//@ chunk-aepeg2w5.js:101666-104445 fingerprint = saveConfigWithLock (0.489)
/**
 * 对 ~/.claude.json 加 .lock 文件锁后读-改-写；锁等待过长记日志，锁被抢占时报 compromised；写前按间隔备份到 ~/.claude/backups。
 */
async function saveConfigWithLock(updater, n, r, lockStore) {
  let defaultConfig = getConfigState();
  if (isStorageV5Enabled() && lockStore !== undefined)
    return saveConfigWithLockViaStorage(lockStore, updater, n);
  let globalClaudeFile = getGlobalClaudeFile();
  let defaultGlobalConfig = createDefaultGlobalConfig();
  let dir = dirname(globalClaudeFile);
  let fs = getFsImplementation();
  await fs.mkdir(dir);
  let release;
  try {
    let lockFilePath = `${globalClaudeFile}.lock`;
    let startTime = Date.now();
    for (let idx = 0; ; idx++)
      try {
        release = await lock(globalClaudeFile, {
          lockfilePath: lockFilePath,
          onCompromised: (err) => {
            r?.onCompromised?.();
            logForDebugging(`Config lock compromised: ${err}`, {
              level: "error",
            });
          },
        });
        break;
      } catch (error) {
        let lockRetrySignal = r?.lockRetrySignal;
        if (
          !isLockContentionError(error) ||
          idx >= CONFIG_LOCK_RETRY_DELAYS_MS.length ||
          lockRetrySignal?.aborted
        )
          throw error;
        await sleep(CONFIG_LOCK_RETRY_DELAYS_MS[idx] * (1 + Math.random()), lockRetrySignal);
      }
    let lockTime = Date.now() - startTime;
    if (lockTime > 100) {
      logForDebugging("Lock acquisition took longer than expected - another Claude instance may be running");
      logEvent("tengu_config_lock_contention", {
        lock_time_ms: lockTime,
      });
    }
    if (defaultConfig.lastReadFileStats)
      try {
        let currentStats = await fs.stat(globalClaudeFile);
        if (
          currentStats.mtimeMs !== defaultConfig.lastReadFileStats.mtime ||
          currentStats.size !== defaultConfig.lastReadFileStats.size
        )
          logEvent("tengu_config_stale_write", {
            read_mtime: defaultConfig.lastReadFileStats.mtime,
            write_mtime: currentStats.mtimeMs,
            read_size: defaultConfig.lastReadFileStats.size,
            write_size: currentStats.size,
          });
      } catch (error) {
        logForDebugging(`Config stale-write stat failed: ${error}`);
      }
    let globalConfigWithRetry = await readGlobalConfigWithRetry();
    let j = false;
    let ee = false;
    let config = defaultConfig.cache.config;
    let Q = n ?? config;
    if (defaultConfig.lastGetConfigOutcome === "parse-error" && Q) {
      let fileSizeBefore = 0;
      try {
        fileSizeBefore = (await fs.stat(globalClaudeFile)).size;
      } catch {}
      logForDebugging(
        "saveConfigWithLock: re-read hit a parse error; auto-repairing from cached config under lock. See GH #3117.",
        {
          level: "error",
        },
      );
      logEvent("tengu_config_auto_repaired", {
        file_size_before: fileSizeBefore,
        had_cached_auth:
          defaultConfig.cache.config?.oauthAccount !== undefined ||
          defaultConfig.cache.config?.hasCompletedOnboarding === true,
      });
      globalConfigWithRetry = {
        ...Q,
      };
      j = true;
    } else if (wouldLoseAuthState(globalConfigWithRetry)) ee = true;
    let code = updater(globalConfigWithRetry);
    if (code === globalConfigWithRetry && !j) return false;
    if (ee && (wouldLoseAuthState(code) || defaultConfig.lastGetConfigOutcome === "read-error")) {
      let Se = defaultConfig.pendingWriteCount();
      if (
        Se > 1 &&
        (defaultConfig.lastGetConfigOutcome === "parsed" || defaultConfig.lastGetConfigOutcome === "enoent")
      )
        logForDebugging(
          "saveConfigWithLock: merge base is missing auth the cache has; an in-process write queued behind this one carries it and will land it under its own lock. Proceeding on the under-lock read. See GH #3117 / gh-73364.",
        );
      else if (Se > 1) {
        let ae = n ?? defaultConfig.cache.config;
        if (!ae) {
          logForDebugging(
            "saveConfigWithLock: under-lock re-read was rejected and no re-base exists; refusing to write. See GH #3117.",
            {
              level: "error",
            },
          );
          logEvent("tengu_config_auth_loss_prevented", {});
          return false;
        }
        logForDebugging(
          "saveConfigWithLock: under-lock re-read was rejected (read-error) with a write queued behind; re-basing on the enqueue-time cache snapshot instead of the defaults base. See GH #3117 / gh-73364.",
        );
        globalConfigWithRetry = {
          ...ae,
        };
        code = updater(globalConfigWithRetry);
      } else {
        logForDebugging(
          "saveConfigWithLock: re-read config is missing auth that cache has; refusing to write to avoid wiping ~/.claude.json. See GH #3117.",
          {
            level: "error",
          },
        );
        logEvent("tengu_config_auth_loss_prevented", {});
        return false;
      }
    }
    let currentConfig = pickByHelper(
      code,
      (value, key) => jsonStringify(value) !== jsonStringify(defaultGlobalConfig[key]),
    );
    await backupGlobalConfig(j);
    await writeFileAtomic_2(globalClaudeFile, jsonStringify(currentConfig, null, 2), {
      encoding: "utf-8",
      mode: 384,
      allowSymlink: true,
    });
    return true;
  } finally {
    if (release)
      try {
        await release();
      } catch (mkdirErr) {
        let mkdirCode = getErrnoCode(mkdirErr);
        if (mkdirCode === "ERELEASED" || mkdirCode === "ENOTACQUIRED" || mkdirCode === "ECOMPROMISED")
          r?.onCompromised?.();
        logForDebugging(`Config lock release failed: ${mkdirErr}`, {
          level: "error",
        });
      }
  }
}
//@ chunk-aepeg2w5.js:104445-105146 layout
async function backupCorruptedConfig(e, n) {
  let r = `${basename(getGlobalClaudeFile())}.corrupted.`;
  let s = await listGlobalConfigCopies(e, "corrupted", false);
  if (!s.ok) {
    logForDebugging(`Could not back up corrupted config (${s.error}); continuing.`, {
      level: "error",
    });
    return;
  }
  for (let { stamp, size } of s.value) {
    if (size !== undefined && size !== n.bytes.byteLength) continue;
    let text = await e.readText([STORAGE_SPACES.globalConfigCopy("corrupted", stamp)]);
    let x = text.ok ? text.value.items[0] : undefined;
    if (x?.found && x.value === n.text) {
      process.stderr.write(CONFIG_ALREADY_BACKED_UP_TEXT);
      return;
    }
  }
  let h = String(Date.now());
  let y = await e.write(STORAGE_SPACES.globalConfigCopy("corrupted", h), n.bytes, {
    exactMode: await getGlobalConfigFileMode(e),
  });
  if (y.ok) {
    let S = join(getConfigBackupDir_2(), r + h);
    logForDebugging(configBackedUpLog(S), {
      level: "error",
    });
    process.stderr.write(configBackedUpStderr(S));
  } else
    logForDebugging(`Could not back up corrupted config (${formatStorageError(y.error)}); continuing.`, {
      level: "error",
    });
}
//@ chunk-aepeg2w5.js:105146-106042 layout
async function handleCorruptedConfig(file, n, r = false) {
  let configState = getConfigState();
  try {
    let globalClaudeFile = getGlobalClaudeFile();
    logForDebugging(configCorruptedLog(n.message), {
      level: "error",
    });
    process.stderr.write(formatConfigCorruptedMessage(globalClaudeFile, n.message));
    await backupCorruptedConfig(file, n).catch((error) =>
      logForDebugging(`Could not back up corrupted config (${error}); continuing.`, {
        level: "error",
      }),
    );
    let mostRecentBackup = await findMostRecentBackup(file);
    if (mostRecentBackup)
      process.stderr.write(
        getConfig(globalClaudeFile, mostRecentBackup) +
          `
`,
      );
    else
      process.stderr.write(`
`);
    if (r) {
      if (configState.claimParseErrorLog())
        setImmediate(
          (fileSize, hasTimestampedBackup) => {
            try {
              logEvent("tengu_config_parse_error", {
                file_size: fileSize,
                had_cached_auth: false,
                has_timestamped_backup: hasTimestampedBackup,
              });
            } catch {}
          },
          n.text.length,
          mostRecentBackup !== null,
        );
      return;
    }
    if (!configState.insideParseErrorTelemetry && configState.claimParseErrorLog()) {
      configState.setInsideParseErrorTelemetry(true);
      try {
        let config = configState.cache.config;
        logEvent("tengu_config_parse_error", {
          file_size: n.text.length,
          had_cached_auth: config?.oauthAccount !== undefined || config?.hasCompletedOnboarding === true,
          has_timestamped_backup: mostRecentBackup !== null,
        });
      } finally {
        configState.setInsideParseErrorTelemetry(false);
      }
    }
  } catch (error) {
    logForDebugging(`Could not report the corrupt config: ${error}`, {
      level: "error",
    });
  }
}
//@ chunk-aepeg2w5.js:106042-106122 layout
/**
 * 处理损坏的配置文件并做备份。
 */
async function handleCorruptedConfigAndBackup(lockStore, corrupt, repairingFromCache) {
  await handleCorruptedConfig(lockStore, corrupt);
  await backupGlobalConfig(repairingFromCache, {
    backend: lockStore,
    replaced: corrupt.bytes,
  });
}
//@ chunk-aepeg2w5.js:106122-106131 layout
/**
 * 损坏配置的修复重试次数（3）。
 */
var MAX_CONFIG_REPAIR_ATTEMPTS = 3;
//@ chunk-aepeg2w5.js:106131-109376 layout
/**
 * 存储 v5 下的 saveConfigWithLock：在存储后端原子 update 中读取 ~/.claude.json（记录读后被他人改写的遥测），解析失败时用缓存配置自动修复，会丢失登录态时拒绝写入，应用变更并写回；之后按需备份。
 */
async function saveConfigWithLockViaStorage(lockStore, updater, r) {
  let configState = getConfigState();
  let defaultGlobalConfig = createDefaultGlobalConfig();
  let now = Date.now();
  let S;
  let w = (L) =>
    lockStore.update(
      STORAGE_SPACES.globalConfig(),
      (G) => {
        let j = [];
        let ee = G === undefined ? undefined : textDecoder.decode(G.value);
        if (configState.lastReadFileStats && G !== undefined) {
          let lastReadFileStats = configState.lastReadFileStats;
          let byteLength = G.value.byteLength;
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
        let q;
        let Q = false;
        let message = "";
        if (ee === undefined) q = createDefaultGlobalConfig();
        else
          try {
            q = {
              ...createDefaultGlobalConfig(),
              ...jsonParse(stripBom(ee)),
            };
          } catch (error) {
            Q = true;
            message = error instanceof Error ? error.message : String(error);
            q = createDefaultGlobalConfig();
          }
        j.push(() =>
          configState.setLastGetConfigOutcome(Q ? "parse-error" : G === undefined ? "enoent" : "parsed"),
        );
        let se = G !== undefined && G.version === S;
        let Se = G !== undefined && !se ? new Uint8Array(G.value) : undefined;
        let ae =
          Q && ee !== undefined && Se !== undefined
            ? {
                text: ee,
                bytes: Se,
                message,
              }
            : undefined;
        let ie = false;
        let Z = false;
        let config = configState.cache.config;
        let fe = r ?? config;
        if (Q && fe) {
          let fileSizeBefore = G === undefined ? 0 : G.value.byteLength;
          j.push(() => {
            logForDebugging(
              "saveConfigWithLock: re-read hit a parse error; auto-repairing from cached config under lock. See GH #3117.",
              {
                level: "error",
              },
            );
            logEvent("tengu_config_auto_repaired", {
              file_size_before: fileSizeBefore,
              had_cached_auth:
                configState.cache.config?.oauthAccount !== undefined ||
                configState.cache.config?.hasCompletedOnboarding === true,
            });
          });
          q = {
            ...fe,
          };
          ie = true;
        } else if (wouldLoseAuthState(q)) Z = true;
        let Ae = updater(q);
        if (Ae === q && !ie)
          return {
            skip: true,
            result: {
              didWrite: false,
              after: j,
              corrupt: ae,
              ...(G === undefined && {
                missing: true,
              }),
            },
          };
        if (ae !== undefined && G !== undefined && L < MAX_CONFIG_REPAIR_ATTEMPTS - 1)
          return {
            skip: true,
            result: {
              didWrite: false,
              after: [],
              restart: {
                version: G.version,
                repairingFromCache: ie,
                corrupt: ae,
              },
            },
          };
        if (Z && wouldLoseAuthState(Ae)) {
          let xe = configState.pendingWriteCount();
          let Ie = r ?? configState.cache.config;
          if (xe > 1 && Ie) {
            j.push(() =>
              logForDebugging(
                "saveConfigWithLock: merge base is missing auth the cache has, but an in-process write is queued behind this one; re-basing on the enqueue-time cache snapshot so the pending auth and this write both land. See GH #3117.",
              ),
            );
            q = {
              ...Ie,
            };
            Ae = updater(q);
          } else {
            j.push(() => {
              logForDebugging(
                "saveConfigWithLock: re-read config is missing auth that cache has; refusing to write to avoid wiping ~/.claude.json. See GH #3117.",
                {
                  level: "error",
                },
              );
              logEvent("tengu_config_auth_loss_prevented", {});
            });
            return {
              skip: true,
              result: {
                didWrite: false,
                after: j,
                corrupt: ae,
                ...(G === undefined && {
                  missing: true,
                }),
              },
            };
          }
        }
        let Me = pickByHelper(Ae, (xe, Ie) => jsonStringify(xe) !== jsonStringify(defaultGlobalConfig[Ie]));
        return {
          write: jsonStringify(Me, null, 2),
          result: {
            didWrite: true,
            after: j,
            corrupt: ae,
            ...(G !== undefined && {
              backup: {
                replaced: Se,
                repairingFromCache: ie,
              },
            }),
            ...(G === undefined && {
              missing: true,
            }),
          },
        };
      },
      {
        publishDiscipline: "followAtomic",
        mode: 384,
        acquireTimeoutMs: 0,
      },
    );
  let R = await w(0);
  for (let j = 1; R.ok; j++) {
    let restart = R.value.result?.restart;
    if (restart === undefined) break;
    await handleCorruptedConfigAndBackup(lockStore, restart.corrupt, restart.repairingFromCache);
    S = restart.version;
    R = await w(j);
  }
  let lockTimeMs = Date.now() - now;
  if (!R.ok) {
    if (
      R.error.code === "Unavailable" &&
      (R.error.telemetryCode === "LockContended" || R.error.telemetryCode === "LockSuspect")
    )
      logEvent("tengu_config_lock_contention", {
        lock_time_ms: lockTimeMs,
      });
    throw Error("Config update through storage failed", {
      cause: formatStorageError(R.error),
    });
  }
  let P = R.value.result;
  if (P === undefined) return false;
  if (P.missing)
    try {
      let mostRecentBackup = await findMostRecentBackup(lockStore);
      if (mostRecentBackup)
        process.stderr.write(formatConfigNotFoundMessage(getGlobalClaudeFile(), mostRecentBackup));
    } catch (error) {
      logForDebugging(`Could not report the missing config file: ${error}`, {
        level: "error",
      });
    }
  if (P.corrupt !== undefined) await handleCorruptedConfig(lockStore, P.corrupt);
  let F = P.backup !== undefined && P.backup.replaced === undefined;
  if (P.didWrite && !F)
    await backupGlobalConfig(P.backup?.repairingFromCache ?? false, {
      backend: lockStore,
      replaced: P.backup?.replaced,
    });
  for (let L of P.after)
    try {
      L();
    } catch (error) {
      logForDebugging(`Config save after-effect failed: ${error}`, {
        level: "error",
      });
    }
  return P.didWrite;
}
//@ chunk-aepeg2w5.js:109376-110337 layout
async function reloadGlobalConfigFromStorage(file, n = false) {
  let configState = getConfigState();
  let s = await file.read([STORAGE_SPACES.globalConfig()]).then(
    (R) => (R.ok ? R : formatStorageError(R.error)),
    (error) => String(error),
  );
  if (typeof s === "string") {
    let R = isDiskless() && !n;
    logForDebugging(
      `Startup config read through storage failed; ${R ? "using the defaults" : n ? "keeping the config already read" : "reading the file directly"}: ${s}`,
      {
        level: "warn",
      },
    );
    if (!R) return null;
    configState.setLastGetConfigOutcome("enoent");
    return {
      config: createDefaultGlobalConfig(),
      stats: null,
      version: undefined,
    };
  }
  let h = s.value.items[0];
  if (!h?.found) {
    if (!n) configState.setLastGetConfigOutcome("enoent");
    let R = n ? null : await findMostRecentBackup(file);
    if (R) process.stderr.write(formatConfigNotFoundMessage(getGlobalClaudeFile(), R));
    return {
      config: createDefaultGlobalConfig(),
      stats: null,
      version: undefined,
    };
  }
  let y = textDecoder.decode(h.value);
  let stats = {
    mtimeMs: h.mtimeMs,
    size: h.totalBytes,
  };
  let w;
  try {
    w = jsonParse(stripBom(y));
  } catch (error) {
    let x = error instanceof Error ? error.message : String(error);
    if (!n) {
      configState.setLastGetConfigOutcome("parse-error");
      await handleCorruptedConfig(
        file,
        {
          text: y,
          bytes: h.value,
          message: x,
        },
        true,
      );
    }
    throw new ConfigParseError(x, getGlobalClaudeFile(), createDefaultGlobalConfig());
  }
  if (!n) configState.setLastGetConfigOutcome("parsed");
  return {
    config: {
      ...createDefaultGlobalConfig(),
      ...w,
    },
    stats,
    version: h.version,
  };
}
//@ chunk-aepeg2w5.js:110337-110500 layout
function attachGlobalConfigStorageBackend(e) {
  let configState = getConfigState();
  configState.setFreshnessBackend(e);
  subscribeGlobalConfigViaStorage(e).then((r) => {
    if (configState.freshnessBackend !== e) r?.unsubscribe();
    else if (r) configState.setFreshnessSubscription(r);
    else startGlobalConfigWatcher();
  });
}
//@ chunk-aepeg2w5.js:110500-110639 facade-majority
/**
 * 启动时允许读取配置：读入 ~/.claude.json（损坏则备份并提示），装入缓存，此后 getGlobalConfig 才可用。
 */
function enableConfigs(backend, n) {
  let configState = getConfigState();
  let s = configState.enable(() => enableConfigs_2(backend, n));
  if (!isStorageV5Enabled() || backend === undefined) return s;
  return s.then(() => configState.reloadThroughStorageOnce(() => reloadGlobalConfigViaStorage(backend)));
}
//@ chunk-aepeg2w5.js:110639-110829 layout
function reloadGlobalConfigViaStorage(e) {
  let configState = getConfigState();
  return configState.writeQueues.run(EXTERNAL_REFRESH, async () => {
    let writeGeneration = configState.writeGeneration;
    let record = await reloadGlobalConfigFromStorage(e, true).catch((error) => {
      if (error instanceof ConfigParseError) return "unparseable";
      throw error;
    });
    if (record !== null) installStorageConfigRead(e, record, writeGeneration);
  });
}
//@ chunk-aepeg2w5.js:110829-111647 layout
/**
 * 安装经存储层读取的配置：记录缺失或无法解析等情况并决定保留哪份。
 */
function installStorageConfigRead(e, record, writeGeneration) {
  let configState = getConfigState();
  let h;
  if (record === "unparseable" || record.stats === null)
    h = `its record is ${record === "unparseable" ? "unparseable" : "missing"}, so the config read directly is kept`;
  else if (configState.loadedVersion !== undefined && configState.loadedVersion === record.version)
    h = "that version is already the in-memory config";
  else if (configState.pendingWriteCount() > 0) {
    configState.deferExternalRefresh("storage");
    h = "a config write is pending, so the record is left to the queue-drain replay";
  } else if (configState.writeGeneration !== writeGeneration)
    h = "a save landed while it was read, so the record is not installed over it";
  else {
    configState.installDiskRead(migrateConfigFields(record.config), record.stats);
    configState.setLoadedVersion(record.version);
    h = "its record is now the in-memory config";
  }
  logForDebugging(
    `Re-read ~/.claude.json through the storage interface after the direct start-up read: ${h}`,
  );
  if (configState.freshnessBackend === undefined) {
    if (configState.freshnessWatcherStarted) stopGlobalConfigFreshnessWatcher(configState);
    attachGlobalConfigStorageBackend(e);
  }
}
//@ chunk-aepeg2w5.js:111647-112513 fingerprint = enableConfigs (0.435)
async function enableConfigs_2(e, n) {
  let configState = getConfigState();
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "enable_configs_started");
  if (e !== undefined && n?.fileWatchFallback === false) configState.setFileWatchFallback(false);
  if (isStorageV5Enabled() && e !== undefined && n?.writersWithoutBackend === "memory")
    configState.setUnhandedWritesInMemory(true);
  configState.allowReading();
  try {
    let h = isStorageV5Enabled() && e !== undefined ? await reloadGlobalConfigFromStorage(e) : null;
    if (h && e !== undefined) {
      let y = migrateConfigFields(h.config);
      configState.installDiskRead(y, h.stats);
      configState.setLoadedVersion(h.version);
      attachGlobalConfigStorageBackend(e);
    } else if (isDiskless())
      throw Error(
        "A diskless session can only load its config through a storage backend (none was handed in, or CLAUDE_CODE_HOVER_REST is off)",
      );
    else {
      let globalClaudeFile = getGlobalClaudeFile();
      let S = null;
      try {
        S = await getFsImplementation().stat(globalClaudeFile);
      } catch {}
      let w = migrateConfigFields(await readGlobalConfigWithRetry(true));
      configState.installDiskRead(w, S);
      if (e !== undefined && isConfigFileWatchDisabled()) attachGlobalConfigStorageBackend(e);
      else startGlobalConfigFreshnessWatcher();
      if (e === undefined) configState.oweReloadThroughStorage();
    }
  } catch (error) {
    configState.recordEnableError(error);
    throw error;
  } finally {
    configState.markEnableSettled();
  }
  logForDiagnosticsNoPII("info", "enable_configs_completed", {
    duration_ms: Date.now() - startTime,
  });
}
//@ chunk-aepeg2w5.js:112513-112553 layout = getConfigBackupDir (1)
function getConfigBackupDir_2() {
  return join(getClaudeConfigDir(), "backups");
}
//@ chunk-aepeg2w5.js:112553-112633 layout
function formatConfigCorruptedMessage(globalClaudeFile, message) {
  return `
Claude configuration file at ${globalClaudeFile} is corrupted: ${message}
`;
}
//@ chunk-aepeg2w5.js:112633-112684 layout
/**
 * “配置文件损坏”的日志文本。
 */
function configCorruptedLog(message) {
  return `Config file corrupted: ${message}`;
}
//@ chunk-aepeg2w5.js:112684-112743 layout
/**
 * “损坏配置已备份到”的日志文本。
 */
function configBackedUpLog(e) {
  return `Corrupted config backed up to: ${e}`;
}
//@ chunk-aepeg2w5.js:112743-112814 layout
/**
 * 向 stderr 输出的“损坏文件已备份”提示。
 */
function configBackedUpStderr(e) {
  return `The corrupted file has been backed up to: ${e}
`;
}
//@ chunk-aepeg2w5.js:112814-112871 layout
/**
 * 向 stderr 输出的“损坏文件已备份过”提示。
 */
var CONFIG_ALREADY_BACKED_UP_TEXT = `The corrupted file has already been backed up.
`;
//@ chunk-aepeg2w5.js:112871-112984 fingerprint = getConfig (0.309)
function getConfig(globalClaudeFile, mostRecentBackup) {
  return `A backup file exists at: ${mostRecentBackup}
You can manually restore it by running: cp "${mostRecentBackup}" "${globalClaudeFile}"
`;
}
//@ chunk-aepeg2w5.js:112984-113068 layout
function formatConfigNotFoundMessage(globalClaudeFile, n) {
  return (
    `
Claude configuration file not found at: ${globalClaudeFile}
` +
    getConfig(globalClaudeFile, n) +
    `
`
  );
}
//@ chunk-aepeg2w5.js:113068-113629 fingerprint = findMostRecentBackup (0.793)
/**
 * 在备份目录中找最近的 .claude.json.backup.<ts>，用于提示恢复。
 */
async function findMostRecentBackup(file) {
  let fs = getGlobalClaudeFile();
  let fsImplementation = getFsImplementation();
  let fileBase = basename(fs);
  let backupDir = getConfigBackupDir_2();
  if (isStorageV5Enabled() && file !== undefined) {
    let S = await listGlobalConfigBackups(file).catch(() => {
      return;
    });
    let w = S?.ok ? S.value.sort().at(-1) : undefined;
    if (w) return join(backupDir, `${fileBase}.backup.${w}`);
  } else if (!isDiskless())
    try {
      let last = (await fsImplementation.readdir(backupDir))
        .map((R) => R.name)
        .filter((R) => R.startsWith(`${fileBase}.backup.`))
        .sort()
        .at(-1);
      if (last) return join(backupDir, last);
    } catch {}
  if (isDiskless()) return null;
  let fileDir = dirname(fs);
  try {
    let mostRecent = (await fsImplementation.readdir(fileDir))
      .map((x) => x.name)
      .filter((x) => x.startsWith(`${fileBase}.backup.`))
      .sort()
      .at(-1);
    if (mostRecent) return join(fileDir, mostRecent);
    let legacyBackup = `${fs}.backup`;
    try {
      await fsImplementation.stat(legacyBackup);
      return legacyBackup;
    } catch {}
  } catch {}
  return null;
}
//@ chunk-aepeg2w5.js:113629-115427 layout
async function getConfigWithOutcome(e) {
  let configState = getConfigState();
  if (!configState.readingAllowed) throw Error("Config accessed before allowed.");
  let globalClaudeFile = getGlobalClaudeFile();
  let fsImplementation = getFsImplementation();
  try {
    let fileContent = await fsImplementation.readFile(globalClaudeFile, {
      encoding: "utf-8",
    });
    try {
      let parsedConfig = jsonParse(stripBom(fileContent));
      configState.setLastGetConfigOutcome("parsed");
      return {
        ...createDefaultGlobalConfig(),
        ...parsedConfig,
      };
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      throw new ConfigParseError(errorMessage, globalClaudeFile, createDefaultGlobalConfig());
    }
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    configState.setLastGetConfigOutcome(
      error instanceof ConfigParseError ? "parse-error" : errnoCode === "ENOENT" ? "enoent" : "read-error",
    );
    if (errnoCode === "ENOENT") {
      let backupPath = await findMostRecentBackup();
      if (backupPath) process.stderr.write(formatConfigNotFoundMessage(globalClaudeFile, backupPath));
      return createDefaultGlobalConfig();
    }
    if (error instanceof ConfigParseError) {
      logForDebugging(configCorruptedLog(error.message), {
        level: "error",
      });
      process.stderr.write(formatConfigCorruptedMessage(globalClaudeFile, error.message));
      let S = 0;
      try {
        if (isDiskless()) throw Error("this process writes nothing to disk");
        let fileBase = basename(globalClaudeFile);
        let corruptedBackupDir = getConfigBackupDir_2();
        await fsImplementation.mkdir(corruptedBackupDir);
        let filtered = (await fsImplementation.readdir(corruptedBackupDir))
          .map((j) => j.name)
          .filter((j) => j.startsWith(`${fileBase}.corrupted.`));
        let corruptedBackupPath;
        let alreadyBackedUp = false;
        let currentContent = await fsImplementation.readFile(globalClaudeFile, {
          encoding: "utf-8",
        });
        S = currentContent.length;
        for (let backup of filtered)
          try {
            let backupContent = await fsImplementation.readFile(join(corruptedBackupDir, backup), {
              encoding: "utf-8",
            });
            if (currentContent === backupContent) {
              alreadyBackedUp = true;
              break;
            }
          } catch {}
        if (!alreadyBackedUp) {
          corruptedBackupPath = join(corruptedBackupDir, `${fileBase}.corrupted.${Date.now()}`);
          await fsImplementation.copyFile(globalClaudeFile, corruptedBackupPath);
          logForDebugging(configBackedUpLog(corruptedBackupPath), {
            level: "error",
          });
        }
        if (corruptedBackupPath) process.stderr.write(configBackedUpStderr(corruptedBackupPath));
        else if (alreadyBackedUp) process.stderr.write(CONFIG_ALREADY_BACKED_UP_TEXT);
      } catch (error) {
        logForDebugging(`Could not back up corrupted config (${getErrnoCode(error) ?? error}); continuing.`, {
          level: "error",
        });
      }
      let mostRecentBackup = await findMostRecentBackup();
      if (mostRecentBackup)
        process.stderr.write(
          getConfig(globalClaudeFile, mostRecentBackup) +
            `
`,
        );
      else
        process.stderr.write(`
`);
      if (e) {
        if (configState.claimParseErrorLog())
          setImmediate(
            (fileSize, hasTimestampedBackup) => {
              try {
                logEvent("tengu_config_parse_error", {
                  file_size: fileSize,
                  had_cached_auth: false,
                  has_timestamped_backup: hasTimestampedBackup,
                });
              } catch {}
            },
            S,
            mostRecentBackup !== null,
          );
        throw error;
      }
      if (!configState.insideParseErrorTelemetry && configState.claimParseErrorLog()) {
        configState.setInsideParseErrorTelemetry(true);
        try {
          let config = configState.cache.config;
          logEvent("tengu_config_parse_error", {
            file_size: S,
            had_cached_auth: config?.oauthAccount !== undefined || config?.hasCompletedOnboarding === true,
            has_timestamped_backup: mostRecentBackup !== null,
          });
        } finally {
          configState.setInsideParseErrorTelemetry(false);
        }
      }
    }
    return createDefaultGlobalConfig();
  }
}
//@ chunk-aepeg2w5.js:115427-115604 facade-majority
/**
 * 计算 projects 字典的键：原始 cwd 所在 git 根（无则 realpath），统一路径分隔符，进程内缓存。
 */
function getProjectPathForConfig() {
  let configState = getConfigState();
  if (configState.projectPathForConfig !== null && !hasNoProjectDir())
    return configState.projectPathForConfig;
  let originalCwd = getOriginalCwd();
  let r = storageRootFor(originalCwd);
  let s = r ? normalizePathForConfigKey(r) : normalizePathForConfigKey(identity(resolve(originalCwd)));
  configState.setProjectPathForConfig(s);
  return s;
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
  return hasNoProjectDir() ? undefined : getGlobalConfig().projects?.[getProjectPathForConfig()];
}
//@ chunk-aepeg2w5.js:115744-115968 facade-majority = getCurrentProjectConfig (0.469)
/**
 * 当前项目在 ~/.claude.json projects 字典里的配置（键为原始 cwd 的 git 根或 realpath），不存在时返回 DEFAULT_PROJECT_CONFIG；兼容 allowedTools 曾经是 JSON 字符串。
 */
function getCurrentProjectConfig() {
  if (isTestConfigMode()) return getConfigState().testProjectConfig;
  if (hasNoProjectDir()) return DEFAULT_PROJECT_CONFIG;
  let absolutePath = getProjectPathForConfig();
  let config = getGlobalConfig();
  if (!config.projects) return DEFAULT_PROJECT_CONFIG;
  let projectConfig = config.projects[absolutePath] ?? DEFAULT_PROJECT_CONFIG;
  if (typeof projectConfig.allowedTools === "string")
    projectConfig.allowedTools = safeParseJSON(projectConfig.allowedTools) ?? [];
  return projectConfig;
}
//@ chunk-aepeg2w5.js:115968-116019 facade-majority
/**
 * 在全局配置的 projects[当前项目键] 上应用更新函数并加锁保存，失败回退与 saveGlobalConfig 相同的防丢认证逻辑。
 */
function saveCurrentProjectConfig(e, n) {
  return enqueueProjectConfigSave(e, n).then(() => {
    return;
  });
}
//@ chunk-aepeg2w5.js:116019-116066 facade-majority
function saveCurrentProjectConfigDurably(e, n) {
  return enqueueProjectConfigSave(e, n).catch(() => false);
}
//@ chunk-aepeg2w5.js:116066-116723 layout
function enqueueProjectConfigSave(e, n) {
  let configState = getConfigState();
  if (isTestConfigMode()) {
    let y = e(configState.testProjectConfig);
    if (y === configState.testProjectConfig) return Promise.resolve(true);
    configState.overwriteTestProjectConfig(y);
    return Promise.resolve(true);
  }
  let projectPathForConfig = getProjectPathForConfig();
  let h = applyOptimisticConfigUpdate((current) => {
    let S = current.projects?.[projectPathForConfig] ?? DEFAULT_PROJECT_CONFIG;
    let w = e(S);
    if (w === S) return current;
    if (
      w.lastGracefulShutdown === true &&
      (S.lastGracefulShutdown !== true ||
        e({
          ...S,
          lastGracefulShutdown: false,
        }).lastGracefulShutdown === true)
    )
      configState.gracefulExitStampedProjects.add(projectPathForConfig);
    else if (w.lastGracefulShutdown === false && S.lastGracefulShutdown !== false)
      configState.gracefulExitStampedProjects.delete(projectPathForConfig);
    return {
      ...current,
      projects: {
        ...current.projects,
        [projectPathForConfig]: w,
      },
    };
  });
  if (isConfigWriteMemoryOnly(n, "saveCurrentProjectConfig")) return Promise.resolve(false);
  return runQueuedConfigWrite(() => saveCurrentProjectConfig_2(e, projectPathForConfig, h, n, 0));
}
//@ chunk-aepeg2w5.js:116723-118337 fingerprint = saveCurrentProjectConfig (0.436)
async function saveCurrentProjectConfig_2(e, n, r, s, h) {
  let absolutePath = getConfigState();
  let written = null;
  let w = false;
  let R = false;
  try {
    let didWrite = await saveConfigWithLock(
      (current) => {
        let currentProjectConfig = current.projects?.[n] ?? DEFAULT_PROJECT_CONFIG;
        let newProjectConfig = e(currentProjectConfig);
        if (newProjectConfig === currentProjectConfig) {
          w = true;
          return current;
        }
        written = stripRetiredConfigKeys({
          ...current,
          projects: {
            ...current.projects,
            [n]: newProjectConfig,
          },
        });
        return written;
      },
      r,
      {
        onCompromised: () => (R = true),
      },
      s,
    );
    if (didWrite && written) writeThroughConfigCache(written);
    return (didWrite || w) && !R;
  } catch (error) {
    logForDebugging(`Failed to save config with lock: ${error}`, {
      level: "error",
    });
    let configForFallbackWrite = await readConfigForFallbackWrite(r, s);
    if (configForFallbackWrite.readRejected) {
      logConfigFallbackSuppressedUnreadable("save_project");
      return false;
    }
    let config = configForFallbackWrite.config;
    if (isLockContentionError(error) && !configForFallbackWrite.cacheDerived) {
      let j = config.projects?.[n] ?? DEFAULT_PROJECT_CONFIG;
      let ee = e(j);
      if (ee === j) return true;
      if (isLowStakesProjectConfigChange(j, ee)) {
        let q = isOnlyCrashMarkerChange(j, ee) ? CONFIG_CRASH_MARKER_REENQUEUE_DELAYS_MS[h] : undefined;
        logConfigFallbackSkippedContention("save_project", q !== undefined);
        if (q !== undefined)
          sleep(q, undefined, {
            unref: true,
          })
            .then(() => {
              if (absolutePath.gracefulExitStampedProjects.has(n)) return;
              let config = absolutePath.cache.config;
              return runQueuedConfigWrite(() => saveCurrentProjectConfig_2(e, n, config, s, h + 1));
            })
            .catch((error) =>
              logForDebugging(`Crash-marker config re-enqueue failed: ${error}`, {
                level: "error",
              }),
            );
        return false;
      }
    }
    if (wouldLoseAuthState(config)) {
      let j = absolutePath.pendingWriteCount();
      if (j > 1 && isLockContentionError(error))
        logForDebugging(
          "saveCurrentProjectConfig fallback under contention: proceeding on the base as-is (fresh disk on a clean read; the snapshot copy on a torn read); the write queued behind carries the pending auth. See GH #3117 / gh-73364.",
        );
      else if (j > 1 && r) {
        logForDebugging(
          "saveCurrentProjectConfig fallback: merge base is missing auth the cache has, but an in-process write is queued behind this one; re-basing on the enqueue-time cache snapshot. See GH #3117.",
        );
        config = {
          ...r,
        };
      } else {
        logForDebugging(
          "saveCurrentProjectConfig fallback: re-read config is missing auth that cache has; refusing to write. See GH #3117.",
          {
            level: "error",
          },
        );
        logEvent("tengu_config_auth_loss_prevented", {});
        return false;
      }
    }
    let currentProjectConfig = config.projects?.[n] ?? DEFAULT_PROJECT_CONFIG;
    let newProjectConfig = e(currentProjectConfig);
    if (newProjectConfig === currentProjectConfig) return true;
    written = stripRetiredConfigKeys({
      ...config,
      projects: {
        ...config.projects,
        [n]: newProjectConfig,
      },
    });
    await saveConfig(written, "save_project", s);
    return false;
  }
}
//@ chunk-aepeg2w5.js:118337-118865 facade-majority
function saveCurrentProjectConfigSyncForExit(e) {
  let configState = getConfigState();
  if (isTestConfigMode()) {
    let r = e(configState.testProjectConfig);
    if (r !== configState.testProjectConfig) configState.overwriteTestProjectConfig(r);
    return;
  }
  if ((isStorageV5Enabled() && configState.unhandedWritesInMemory) || isDiskless()) return;
  try {
    let filePath = getGlobalClaudeFile();
    let projectPathForConfig = getProjectPathForConfig();
    let h = null;
    try {
      h = readFileSync(filePath, {
        encoding: "utf-8",
      });
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
    let defaultGlobalConfig = createDefaultGlobalConfig();
    if (h !== null)
      defaultGlobalConfig = {
        ...defaultGlobalConfig,
        ...jsonParse(stripBom(h)),
      };
    let S = defaultGlobalConfig.projects?.[projectPathForConfig] ?? DEFAULT_PROJECT_CONFIG;
    let w = e(S);
    if (w === S) return;
    let R = stripRetiredConfigKeys({
      ...defaultGlobalConfig,
      projects: {
        ...defaultGlobalConfig.projects,
        [projectPathForConfig]: w,
      },
    });
    if (wouldLoseAuthState(R)) return;
    let x = pickByHelper(R, (P, F) => jsonStringify(P) !== jsonStringify(DEFAULT_GLOBAL_CONFIG[F]));
    writeFileSyncAndFlush_DEPRECATED(filePath, jsonStringify(x, null, 2), {
      encoding: "utf-8",
      mode: 384,
      allowSymlink: true,
    });
  } catch {}
}
//@ chunk-aepeg2w5.js:118865-119363 facade-majority
function saveGlobalConfigSyncForExit(e) {
  let configState = getConfigState();
  if (isTestConfigMode()) {
    let r = e(configState.testGlobalConfig);
    if (r !== configState.testGlobalConfig) configState.overwriteTestGlobalConfig(r);
    return;
  }
  if ((isStorageV5Enabled() && configState.unhandedWritesInMemory) || isDiskless()) return;
  try {
    let filePath = getGlobalClaudeFile();
    let s = null;
    try {
      s = readFileSync(filePath, {
        encoding: "utf-8",
      });
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
    let defaultGlobalConfig = createDefaultGlobalConfig();
    if (s !== null)
      defaultGlobalConfig = {
        ...defaultGlobalConfig,
        ...jsonParse(stripBom(s)),
      };
    let y = e(defaultGlobalConfig);
    if (y === defaultGlobalConfig) return;
    let S = stripRetiredConfigKeys({
      ...y,
      projects: mergeProjectsForSave(defaultGlobalConfig.projects, y.projects),
    });
    if (wouldLoseAuthState(S)) return;
    let w = pickByHelper(S, (R, x) => jsonStringify(R) !== jsonStringify(DEFAULT_GLOBAL_CONFIG[x]));
    writeFileSyncAndFlush_DEPRECATED(filePath, jsonStringify(w, null, 2), {
      encoding: "utf-8",
      mode: 384,
      allowSymlink: true,
    });
  } catch {}
}
//@ chunk-aepeg2w5.js:119363-119648 facade-majority
function deleteProjectConfig(projectPath, n) {
  if (isTestConfigMode()) return Promise.resolve(true);
  let configState = getConfigState();
  if (isConfigWriteMemoryOnly(n, "deleteProjectConfig")) {
    let h = configState.cache.config?.projects?.[projectPath] !== undefined;
    if (h)
      applyOptimisticConfigUpdate((y) => {
        let { [projectPath]: S, ...w } = y.projects ?? {};
        return {
          ...y,
          projects: w,
        };
      });
    return Promise.resolve(!h);
  }
  let config = configState.cache.config;
  return runQueuedConfigWrite(() => deleteProjectConfigLocked(projectPath, config, n));
}
//@ chunk-aepeg2w5.js:119648-120594 layout
/**
 * 在配置锁内删除指定项目的配置记录，返回是否删除及错误。
 */
async function deleteProjectConfigLocked(projectPath, config, r) {
  let configState = getConfigState();
  let h = null;
  let y = null;
  try {
    let S = await saveConfigWithLock(
      (w) => {
        if (!w.projects?.[projectPath]) {
          y = false;
          return w;
        }
        y = true;
        let { [projectPath]: R, ...x } = w.projects;
        h = stripRetiredConfigKeys({
          ...w,
          projects: x,
        });
        return h;
      },
      config,
      undefined,
      r,
    );
    if (S && h) writeThroughConfigCache(h);
    return S || y === false;
  } catch (error) {
    logForDebugging(`Failed to save config with lock: ${error}`, {
      level: "error",
    });
    if (isLockContentionError(error)) {
      logConfigFallbackSkippedContention("delete_project");
      return false;
    }
    let configForFallbackWrite = await readConfigForFallbackWrite(config, r);
    if (configForFallbackWrite.readRejected) {
      logConfigFallbackSuppressedUnreadable("delete_project");
      return false;
    }
    let config_2 = configForFallbackWrite.config;
    if (wouldLoseAuthState(config_2))
      if (configState.pendingWriteCount() > 1 && config) {
        logForDebugging(
          "deleteProjectConfig fallback: merge base is missing auth the cache has, but an in-process write is queued behind this one; re-basing on the enqueue-time cache snapshot. See GH #3117.",
        );
        config_2 = {
          ...config,
        };
      } else {
        logForDebugging(
          "deleteProjectConfig fallback: re-read config is missing auth that cache has; refusing to write. See GH #3117.",
          {
            level: "error",
          },
        );
        logEvent("tengu_config_auth_loss_prevented", {});
        return false;
      }
    if (!config_2.projects?.[projectPath]) return true;
    let { [projectPath]: x, ...P } = config_2.projects;
    h = stripRetiredConfigKeys({
      ...config_2,
      projects: P,
    });
    return saveConfig(h, "delete_project", r);
  }
}
//@ chunk-aepeg2w5.js:120594-121179 facade-majority
function deleteCurrentProjectConfigFields(e, n) {
  let configState = getConfigState();
  if (isTestConfigMode()) {
    configState.deleteTestProjectConfigFields(e);
    return Promise.resolve(true);
  }
  if (isConfigWriteMemoryOnly(n, "deleteCurrentProjectConfigFields")) {
    let projectPathForConfig = getProjectPathForConfig();
    let y = configState.cache.config?.projects?.[projectPathForConfig];
    let S = y !== undefined && e.some((w) => w in y);
    if (S)
      applyOptimisticConfigUpdate((w) => ({
        ...w,
        projects: {
          ...w.projects,
          [projectPathForConfig]: omitKeys(y, e),
        },
      }));
    return Promise.resolve(!S);
  }
  let config = configState.cache.config;
  return runQueuedConfigWrite(() =>
    deleteProjectFieldsLocked(e, {
      projectPath: getProjectPathForConfig,
      saveWithLock: (h) => saveConfigWithLock(h, config, undefined, n),
      writeCache: writeThroughConfigCache,
      readConfigFallback: () => readConfigForFallbackWrite(config, n),
      wouldLoseAuth: wouldLoseAuthState,
      fallbackSave: (h) => saveConfig(h, "delete_project_fields", n),
      pendingWriteCount: () => configState.pendingWriteCount(),
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
  let r = {
    ...e,
  };
  for (let s of n) delete r[s];
  return r;
}
//@ chunk-aepeg2w5.js:121278-122536 layout
async function deleteProjectFieldsLocked(e, n) {
  let r = (R) => omitKeys(R, e);
  let s = n.projectPath();
  let configFallback = await n.readConfigFallback();
  let y = configFallback.config.projects?.[s];
  if (!configFallback.cacheDerived && (!y || !e.some((R) => R in y))) return true;
  let S = null;
  let w = null;
  try {
    let R = await n.saveWithLock((current) => {
      let P = current.projects?.[s];
      if (!P || !e.some((F) => F in P)) {
        w = false;
        return current;
      }
      w = true;
      S = stripRetiredConfigKeys({
        ...current,
        projects: {
          ...current.projects,
          [s]: r(P),
        },
      });
      return S;
    });
    if (R && S) n.writeCache(S);
    return R || w === false;
  } catch (error) {
    logForDebugging(`Failed to save config with lock: ${error}`, {
      level: "error",
    });
    if (isLockContentionError(error)) {
      logConfigFallbackSkippedContention("delete_project_fields");
      return false;
    }
    let configFallback = await n.readConfigFallback();
    if (configFallback.readRejected) {
      logConfigFallbackSuppressedUnreadable("delete_project_fields");
      return false;
    }
    let config = configFallback.config;
    if (n.wouldLoseAuth(config))
      if (n.pendingWriteCount() > 1 && n.enqueueCacheSnapshot) {
        logForDebugging(
          "deleteCurrentProjectConfigFields fallback: merge base is missing auth the cache has, but an in-process write is queued behind this one; re-basing on the enqueue-time cache snapshot. See GH #3117.",
        );
        config = {
          ...n.enqueueCacheSnapshot,
        };
      } else {
        logForDebugging(
          "deleteCurrentProjectConfigFields fallback: re-read config is missing auth that cache has; refusing to write. See GH #3117.",
          {
            level: "error",
          },
        );
        logEvent("tengu_config_auth_loss_prevented", {});
        return false;
      }
    let F = config.projects?.[s];
    if (!F || !e.some((L) => L in F)) return true;
    S = stripRetiredConfigKeys({
      ...config,
      projects: {
        ...config.projects,
        [s]: r(F),
      },
    });
    return n.fallbackSave(S);
  }
}
//@ chunk-aepeg2w5.js:122536-122571 facade-majority
function isAutoUpdaterDisabled() {
  return getAutoUpdaterDisabledReason() !== null;
}
//@ chunk-aepeg2w5.js:122571-122877 facade-majority = shouldSkipPluginAutoupdate (0.253)
function shouldSkipPluginAutoupdate() {
  if (env.FORCE_AUTOUPDATE_PLUGINS) return false;
  if (!env.CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST) return isAutoUpdaterDisabled();
  let e = require("./chunk-t9wvryrs.js");
  if (getAutoUpdaterDisabledReason_2(false) !== null) return true;
  let n = e.findSkipReasonUnderHostPin(getGlobalConfig().env);
  if (n !== null) logForDebugging(`Plugin autoupdate: off under the host's pin (${n})`);
  return n !== null;
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
//@ chunk-aepeg2w5.js:123023-123085 facade-majority
/**
 * 自动更新被禁用的原因：DISABLE_UPDATES、DISABLE_AUTOUPDATER、非必要流量关闭（隐私级别）、或配置 autoUpdates=false（native 安装且 autoUpdatesProtectedForNative 时除外）。
 */
function getAutoUpdaterDisabledReason() {
  return getAutoUpdaterDisabledReason_2(isEnvTruthy(process.env.DISABLE_AUTOUPDATER));
}
//@ chunk-aepeg2w5.js:123085-123398 fingerprint = getAutoUpdaterDisabledReason (0.736)
function getAutoUpdaterDisabledReason_2(e) {
  if (env.DISABLE_UPDATES)
    return {
      type: "env",
      envVar: "DISABLE_UPDATES",
    };
  if (e)
    return {
      type: "env",
      envVar: "DISABLE_AUTOUPDATER",
    };
  let essentialTrafficEnvVar = getEssentialTrafficOnlyReason();
  if (essentialTrafficEnvVar)
    return {
      type: "env",
      envVar: essentialTrafficEnvVar,
    };
  let config = getGlobalConfig();
  if (
    config.autoUpdates === false &&
    (config.installMethod !== "native" || config.autoUpdatesProtectedForNative !== true)
  )
    return {
      type: "config",
    };
  return null;
}
//@ chunk-aepeg2w5.js:123398-123422 layout
var HEX64_ID_PATTERN = /^[0-9a-f]{64}$/;
//@ chunk-aepeg2w5.js:123422-123684 facade-majority = getOrCreateUserID (0.664)
/**
 * 读取或生成 userID（64 位 hex 随机串）并写回 ~/.claude.json；用于遥测 device_id 与 metadata.user_id。
 */
function getOrCreateUserID(e, n) {
  let config = getConfigState();
  let globalConfig = getGlobalConfig();
  if (typeof globalConfig.userID === "string" && HEX64_ID_PATTERN.test(globalConfig.userID))
    return globalConfig.userID;
  if (config.generatedUserID) return config.generatedUserID;
  let userID = n !== undefined && HEX64_ID_PATTERN.test(n) ? n : randomBytes(32).toString("hex");
  config.setGeneratedUserID(userID);
  saveGlobalConfig(
    (current) => ({
      ...current,
      userID,
    }),
    e,
  );
  return userID;
}
//@ chunk-aepeg2w5.js:123684-123941 facade-majority
/**
 * 读取或生成 machineID（64 位 hex）并写回全局配置。
 */
function getOrCreateMachineID(e) {
  let configState = getConfigState();
  let globalConfig = getGlobalConfig();
  if (typeof globalConfig.machineID === "string" && HEX64_ID_PATTERN.test(globalConfig.machineID))
    return globalConfig.machineID;
  if (configState.generatedMachineID) return configState.generatedMachineID;
  let str = randomBytes(32).toString("hex");
  configState.setGeneratedMachineID(str);
  saveGlobalConfig(
    (current) => ({
      ...current,
      machineID: str,
    }),
    e,
  );
  return str;
}
//@ chunk-aepeg2w5.js:123941-123988 facade-majority
async function seedInstallIDs(e) {
  getOrCreateUserID(e);
  getOrCreateMachineID(e);
  await drainConfigWrites();
}
//@ chunk-aepeg2w5.js:123988-124266 facade-majority
function getOrCreateSummonSidKey(e) {
  let configState = getConfigState();
  let globalConfig = getGlobalConfig();
  if (typeof globalConfig.summonSidKey === "string" && HEX64_ID_PATTERN.test(globalConfig.summonSidKey))
    return globalConfig.summonSidKey;
  if (configState.generatedSummonSidKey) return configState.generatedSummonSidKey;
  let str = randomBytes(32).toString("hex");
  configState.setGeneratedSummonSidKey(str);
  saveGlobalConfig(
    (current) => ({
      ...current,
      summonSidKey: str,
    }),
    e,
  );
  return str;
}
//@ chunk-aepeg2w5.js:124266-124338 layout
var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-aepeg2w5.js:124338-124392 layout
/**
 * 判断字符串是否为合法的 UUID（远程控制机器 id）。
 */
function isValidMachineId(remoteControlMachineId) {
  return typeof remoteControlMachineId === "string" && UUID_PATTERN.test(remoteControlMachineId);
}
//@ chunk-aepeg2w5.js:124392-124462 facade-majority
function getOrCreateRemoteControlMachineId(e) {
  return getConfigState().remoteControlMachineIdOnceFrom(() => ensureRemoteControlMachineId(e));
}
//@ chunk-aepeg2w5.js:124462-124717 layout
/**
 * 获取或生成 Remote Control 的机器 id（UUID）并保存到全局配置；保存失败且未被其他进程写入时返回 null。
 */
async function ensureRemoteControlMachineId(e) {
  let globalConfig = getGlobalConfig();
  if (isValidMachineId(globalConfig.remoteControlMachineId)) return globalConfig.remoteControlMachineId;
  let r = randomUUID();
  let s = r;
  return (await saveGlobalConfigQueued((y) => {
    s = isValidMachineId(y.remoteControlMachineId) ? y.remoteControlMachineId : s;
    return {
      ...y,
      remoteControlMachineId: s,
    };
  }, e).catch(() => false)) || s !== r
    ? s
    : null;
}
//@ chunk-aepeg2w5.js:124717-124810 facade-majority = recordFirstStartTime (1)
/**
 * 首次启动时写 firstStartTime 与 firstStartVersion。
 */
function recordFirstStartTime(e) {
  if (!getGlobalConfig().firstStartTime) {
    let firstStartTime = new Date().toISOString();
    saveGlobalConfig((current) => stampFirstStart(current, firstStartTime), e);
  }
}
//@ chunk-aepeg2w5.js:124810-125392 facade-majority
function stampFirstStart(e, firstStartTime) {
  if (e.firstStartTime) return e;
  return {
    ...e,
    firstStartTime,
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
//@ chunk-aepeg2w5.js:125392-125613 facade-majority = getMemoryPath (1)
/**
 * 记忆文件路径：User=<配置目录>/CLAUDE.md，Project=<cwd>/CLAUDE.md，Local=<cwd>/CLAUDE.local.md，Managed=<托管目录>/CLAUDE.md，AutoMem=自动记忆入口。
 */
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
var _getConfigForTesting = getConfigWithOutcome;
var _wouldLoseAuthStateForTesting = wouldLoseAuthState;
var _saveConfigWithLockForTesting = saveConfigWithLock;
var _refreshGlobalConfigCacheFromExternalWriteForTesting = refreshGlobalConfigFromDisk;
var _refreshGlobalConfigCacheThroughStorageForTesting = checkGlobalConfigFreshness;
var _onGlobalConfigStorageEventForTesting = onGlobalConfigStorageEvent;
var _subscribeGlobalConfigFreshnessForTesting = subscribeGlobalConfigViaStorage;
var _loadGlobalConfigThroughStorageForTesting = reloadGlobalConfigFromStorage;
var _startGlobalConfigFreshnessThroughStorageForTesting = attachGlobalConfigStorageBackend;
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
var _installGlobalConfigReloadedThroughStorageForTesting = installStorageConfigRead;
var _readGlobalConfigForFallbackForTesting = readConfigForFallbackWrite;
var _takeTimestampedConfigBackupForTesting = backupGlobalConfig;
var _findMostRecentBackupForTesting = findMostRecentBackup;
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
var _saveGlobalConfigForTesting = saveGlobalConfig;
var _saveGlobalConfigDurablyForTesting = saveGlobalConfigDurably;
var _saveCurrentProjectConfigForTesting = saveCurrentProjectConfig;
var _saveCurrentProjectConfigDurablyForTesting = saveCurrentProjectConfigDurably;
var _getGlobalConfigForTesting = getGlobalConfig;
var _getCurrentProjectConfigForTesting = getCurrentProjectConfig;
var _getOrCreateMachineIDForTesting = getOrCreateMachineID;
var _getOrCreateUserIDForTesting = getOrCreateUserID;
var _removeProjectHistoryForTesting = shouldShowProjectOnboarding;
//@ chunk-aepeg2w5.js:126512-126556 facade-majority
function _getTestGlobalConfigForTesting() {
  return getConfigState().testGlobalConfig;
}
//@ chunk-aepeg2w5.js:126556-126629 facade-majority
function _setGlobalConfigCacheForTesting(e) {
  let configState = getConfigState();
  if (e) configState.applyOptimistic(e);
  else configState.clearCache();
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
function seedClientDataForCurrentKey(data, { forContextWindow: n = false } = {}) {
  let configState = getConfigState();
  let s = configState.clientDataCacheKeyGetter?.();
  configState.setClientDataWindowSeed(
    s === undefined
      ? null
      : {
          key: s,
          data,
          forContextWindow: n,
        },
  );
}
//@ chunk-aepeg2w5.js:127039-127145 facade-majority
function clearClientDataSeed(e) {
  let configState = getConfigState();
  if (e === undefined || configState.clientDataWindowSeed?.key === e)
    configState.setClientDataWindowSeed(null);
}
//@ chunk-aepeg2w5.js:127145-127186 facade-majority
function getCachedClientData(e) {
  return getCachedClientDataSlot(e)?.data ?? null;
}
//@ chunk-aepeg2w5.js:127186-127412 facade-majority
function getCachedClientDataSlot(e) {
  let configState = getConfigState();
  if (configState.clientDataReadGate && !configState.clientDataReadGate()) return null;
  let clientDataCacheSlot = readClientDataCacheSlot(configState, e);
  if (!configState.clientDataOverride) return clientDataCacheSlot;
  let s = clientDataCacheSlot?.data ?? null;
  let h = configState.clientDataOverride(s, e);
  return h === s
    ? clientDataCacheSlot
    : {
        data: h,
        model: clientDataCacheSlot?.model ?? e,
      };
}
//@ chunk-aepeg2w5.js:127412-127524 facade-majority
function getFetchedClientData() {
  let configState = getConfigState();
  if (configState.clientDataReadGate && !configState.clientDataReadGate()) return null;
  return readClientDataCacheSlot(configState)?.data ?? null;
}
//@ chunk-aepeg2w5.js:127524-127966 layout
/**
 * 读取客户端数据缓存槽中当前键对应的数据。
 */
function readClientDataCacheSlot(configState, n) {
  if (!configState.clientDataCacheKeyGetter) return null;
  let globalConfig = getGlobalConfig();
  let s = configState.clientDataCacheKeyGetter(n);
  let clientDataCacheSlots = globalConfig.clientDataCacheSlots;
  if (clientDataCacheSlots != null && Object.hasOwn(clientDataCacheSlots, s)) {
    let w = clientDataCacheSlots[s];
    return isTimestampedValue(w)
      ? {
          data: w.data ?? null,
          model: w.model,
        }
      : null;
  }
  if (n !== undefined && (s === bi1KeyCache || s !== configState.clientDataCacheKeyGetter())) return null;
  let clientDataWindowSeed = configState.clientDataWindowSeed;
  if (clientDataWindowSeed !== null && clientDataWindowSeed.key === s)
    return {
      data: clientDataWindowSeed.data,
    };
  let clientDataCache = globalConfig.clientDataCache;
  return typeof clientDataCache === "object" && clientDataCache !== null
    ? {
        data: clientDataCache,
      }
    : null;
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
function readStrictClientData(globalConfig, clientDataStrictReadGate, clientDataCacheKeyGetter) {
  if (!clientDataStrictReadGate || !clientDataStrictReadGate()) return null;
  if (!clientDataCacheKeyGetter) return null;
  let s = clientDataCacheKeyGetter();
  let clientDataCacheSlots = globalConfig.clientDataCacheSlots;
  if (clientDataCacheSlots != null && Object.hasOwn(clientDataCacheSlots, s))
    return readTimestampedData(clientDataCacheSlots, s);
  return null;
}
//@ chunk-aepeg2w5.js:128265-128362 facade-majority
function getCachedClientDataStrict() {
  let configState = getConfigState();
  return readStrictClientData(
    getGlobalConfig(),
    configState.clientDataStrictReadGate,
    configState.clientDataCacheKeyGetter,
  );
}
//@ chunk-aepeg2w5.js:128362-128416 facade-majority
function setClientDataStaleMatchGetter(e) {
  getConfigState().setClientDataStaleMatchGetter(e);
}
//@ chunk-aepeg2w5.js:128416-128569 facade-majority
function getCachedClientDataForContextWindow() {
  let configState = getConfigState();
  if (configState.clientDataReadGate && !configState.clientDataReadGate()) return null;
  let cachedClientDataForWindow = getCachedClientDataForWindow(configState);
  return configState.clientDataOverride
    ? configState.clientDataOverride(cachedClientDataForWindow)
    : cachedClientDataForWindow;
}
//@ chunk-aepeg2w5.js:128569-128991 layout
/**
 * 读取当前窗口对应的客户端数据缓存。
 */
function getCachedClientDataForWindow(configState) {
  if (!configState.clientDataCacheKeyGetter) return null;
  let globalConfig = getGlobalConfig();
  let clientDataCacheSlots = globalConfig.clientDataCacheSlots;
  let s = configState.clientDataCacheKeyGetter();
  if (clientDataCacheSlots != null && Object.hasOwn(clientDataCacheSlots, s)) {
    let timestampedEntry = readTimestampedEntry(clientDataCacheSlots, s);
    if (timestampedEntry) return timestampedEntry.data;
  }
  let h = configState.clientDataStaleMatchGetter?.();
  if (h) {
    let matchingUsageSnapshot = findMatchingUsageSnapshot(clientDataCacheSlots, h);
    if (matchingUsageSnapshot) return matchingUsageSnapshot.data;
  }
  let clientDataWindowSeed = configState.clientDataWindowSeed;
  if (
    clientDataWindowSeed !== null &&
    clientDataWindowSeed.key === s &&
    clientDataWindowSeed.forContextWindow
  )
    return clientDataWindowSeed.data;
  let clientDataCache = globalConfig.clientDataCache;
  return typeof clientDataCache === "object" && clientDataCache !== null ? clientDataCache : null;
}
//@ chunk-aepeg2w5.js:128991-129047 facade-majority
function clientDataSlotKey() {
  return getConfigState().clientDataCacheKeyGetter?.();
}
//@ chunk-aepeg2w5.js:129047-129194 facade-majority
function hasClientDataCacheSlot() {
  let configState = getConfigState();
  if (!configState.clientDataCacheKeyGetter) return false;
  let clientDataCacheSlots = getGlobalConfig().clientDataCacheSlots;
  return readTimestampedEntry(clientDataCacheSlots, configState.clientDataCacheKeyGetter()) !== null;
}
//@ chunk-aepeg2w5.js:129194-129207 placement
registerJuniperShoalReader(() => getCachedClientData());
//@ chunk-aepeg2w5.js:129207-129220 placement
registerSteerClientData(() => getCachedClientData());
//@ chunk-0h4e7gnq.js:157679-157918 fingerprint = removeProjectHistory (0.392)
function removeProjectHistory(e, n) {
  if (!(e instanceof AgentApiErrorTerminationError)) return null;
  if (!e.errorKind || !TRANSIENT_API_ERROR_KINDS.has(e.errorKind)) return null;
  let filtered = n.filter((y) => y.type !== "assistant" || !y.isApiErrorMessage);
  if (extractAgentFinalText(filtered) === undefined) return null;
  return {
    history: filtered,
    cutoffNote: partialResultPreamble(e.message),
  };
}
//@ chunk-23fm9f0d.js:32645-32693 fingerprint = getConfigBackupDir (1)
function getConfigBackupDir() {
  return cleanupOldFilesMatching(join(getClaudeConfigDir(), "backups"), "", false);
}
//@ chunk-99h01h55.js:4844-4881 fingerprint = getUserClaudeRulesDir (1)
function getUserClaudeRulesDir_2(e) {
  return arrayField(e, "rules");
}
//@ chunk-byfs7td2.js:191-965 facade-majority
/**
 * 通知事件类型（权限询问、空闲提醒等）。
 */
var NOTIFICATION_CHANNELS = [
  "auto",
  "iterm2",
  "terminal_bell",
  "iterm2_with_bell",
  "kitty",
  "ghostty",
  "notifications_disabled",
];
var NOTIFICATION_EVENT_KINDS = [
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
];
var EDITOR_MODES = ["normal", "vim"];
var IDE_KIND_LABELS = ["forward", "keep_local"];
var AUTO_CONNECT_LABELS = ["auto", "12-hour", "24-hour", "24-hour-utc"];
var DISABLE_REASON_LABELS = ["auto", "tmux", "iterm2", "in-process"];
var SETTING_FIELD_LABELS = [
  "dark",
  "light",
  "light-daltonized",
  "dark-daltonized",
  "light-ansi",
  "dark-ansi",
];
var CONFIG_SOURCE_LABELS = ["auto", ...SETTING_FIELD_LABELS];
var CONFIG_BACKEND_LABELS = ["auto", "alwaysAsk", "disabled"];
var TRANSPORT_LABELS = 1e5;
var GLOBAL_CONFIG_FIELD_KINDS = 1e6;
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
  TRANSPORT_LABELS,
  GLOBAL_CONFIG_FIELD_KINDS,
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
  CONFIG_SOURCE_LABELS,
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
  NOTIFICATION_EVENT_KINDS,
  getUserClaudeRulesDir,
  getMemoryPath,
  getManagedClaudeRulesDir,
  workspacePersistedTrustThroughBackend,
  getCachedClientDataStrict,
  deleteProjectConfig,
  CONFIG_BACKEND_LABELS,
  AUTO_CONNECT_LABELS,
  EDITOR_MODES,
  DISABLE_REASON_LABELS,
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
  IDE_KIND_LABELS,
  isTrustKeyPersistedTrusted,
  getPersistedTrustKeyForPath,
  SETTING_FIELD_LABELS,
  getCachedClientDataSlot,
  rechooseGlobalConfigFreshnessWatcher,
  getOrCreateSummonSidKey,
};
