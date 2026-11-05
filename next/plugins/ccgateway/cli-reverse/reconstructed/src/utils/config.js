/**
 * utils/config.ts
 *
 * 全局配置 ~/.claude.json：默认值、读取与迁移、带文件锁的保存（防并发丢失登录态）、备份与损坏恢复、projects[路径] 项目配置、工作区信任判定、userID/machineID、自动更新禁用原因。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/config.ts
 * pieces: chunk-chhd9p2w.js (1), chunk-exfmq47h.js (227), chunk-frs14hy1.js (1), chunk-tpdzrq49.js (1)
 * attribution: fingerprint 13, facade-majority 117, layout 88, placement 4, file-local 1, affinity 2, sole-consumer 2, callgraph-witnessed 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve, join, dirname, basename } from "path";
import { homedir } from "os";
import { writeSync, unwatchFile, readFileSync } from "fs";
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
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import {
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  isDiskFullErrno,
  ConfigParseError,
  isPathAbsent,
} from "./errors.js";
import { isDisklessSession } from "./disklessSession.js";
import { importMetaRequire } from "../../runtime/bun-runtime.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import { isGitMissingMessageSupported } from "./git/gitMissingMessage.js";
import { GIT_SAFE_GLOBAL_ARGS, pickByHelper } from "./git/gitSafeEnv.js";
import { env, getGlobalClaudeFile } from "./env.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { logForDebugging } from "./debug.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { formatStorageError, storageErrorCode } from "./storage/storageErrors.js";
import { stripBom, safeParseJSON } from "./json.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { registerWriteQueueDrain } from "./settings/writeQueues.js";
import { isDisklessWithoutState } from "../services/orgMemory/memoryStores.js";
import { logEvent } from "../services/analytics/index.js";
import { registerCleanup, isCleanupStarted } from "./cleanupRegistry.js";
import { shouldShowProjectOnboarding } from "../projectOnboardingState.js";
import { isConfigWatchEventsEnabled, watchFileSafe } from "./fsSafety/guardedFileRead.js";
import { FileStatWatcher } from "./fileStatWatcher.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { stringArray } from "./collections.js";
import { sleep } from "./sleep.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { readJsonFile_2 } from "./file.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "./pagedRead.js";
import { ok as ok_2, err } from "./resultError.js";
import { lock } from "./lockfile.js";
import { isPlainObject } from "./objectUtils.js";
import { filePath } from "./atomicPublishWrite.js";
import { readJsonFile } from "../tools/AgentTool/agentMemorySnapshot.js";
import { isEnvTruthy } from "./envUtils.js";
import { getEssentialTrafficOnlyReason } from "./privacyLevel.js";
import { getManagedFilePath } from "./settings/managedPath.js";
import { getAutoMemEntrypoint } from "../memdir/paths.js";
import { BI_KEY_UNAVAILABLE } from "./plugins/pluginDirectories.js";
import { registerJuniperShoalReader } from "../services/analytics/juniperShoalConfig.js";
import { registerSteerClientData } from "./model/subagentSteer.js";
import { arrayField } from "../services/artifacts/capabilityDeclaration.js";
import {
  AgentApiErrorTerminationError,
  TRANSIENT_API_ERROR_KINDS,
  extractAgentFinalText,
  partialResultPreamble,
} from "../tools/AgentTool/agentToolUtils.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-tpdzrq49.js:191-965 facade-majority
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
//@ chunk-exfmq47h.js:78081-78298 facade-majority (2.1.88 match: DEFAULT_PROJECT_CONFIG, 0.927)
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
//@ chunk-exfmq47h.js:78298-79080 fingerprint (2.1.88 match: createDefaultGlobalConfig, 0.948)
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
//@ chunk-exfmq47h.js:79080-79197 facade-majority (2.1.88 match: TEST_GLOBAL_CONFIG_FOR_TESTING, 0.483)
var DEFAULT_GLOBAL_CONFIG; // deferred: uses createDefaultGlobalConfig of its import cycle while loading; runs once the cycle is complete
var globalConfigStores;
deferInit("chunk-exfmq47h.js:79080", () => {
  DEFAULT_GLOBAL_CONFIG = createDefaultGlobalConfig();
  globalConfigStores = new HostScoped(
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
});
//@ chunk-exfmq47h.js:79197-79226 layout
/**
 * 取当前宿主的全局配置运行时状态（内存缓存、写队列、freshness 监视、测试配置），所有 config 读写都经过它。
 */
function getConfigState() {
  return onProcessRootHost(globalConfigStores);
}
//@ chunk-exfmq47h.js:79226-80281 facade-majority (2.1.88 match: GLOBAL_CONFIG_KEYS, 0.88)
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
//@ chunk-exfmq47h.js:80281-80320 facade-majority
function isGlobalConfigKey(key) {
  return GLOBAL_CONFIG_KEYS.includes(key);
}
//@ chunk-exfmq47h.js:80320-80370 facade-majority (2.1.88 match: PROJECT_CONFIG_KEYS, 0.79)
var PROJECT_CONFIG_KEYS = ["allowedTools", "hasTrustDialogAccepted"];
//@ chunk-exfmq47h.js:80370-80411 facade-majority
function resetTrustDialogAcceptedCache() {
  getConfigState().setTrustAccepted(false);
}
//@ chunk-exfmq47h.js:80411-80529 facade-majority
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
//@ chunk-exfmq47h.js:80529-80572 facade-majority
function isProjectScopeTrustAccepted() {
  if (getIsNonInteractiveSession()) return true;
  return checkHasTrustDialogAccepted();
}
//@ chunk-exfmq47h.js:80572-80625 placement
function isWorkspacePersistedTrusted(cwd) {
  let cwd_2 = cwd ?? getOriginalCwdOrNull();
  return cwd_2 !== null && isPathPersistedTrusted(cwd_2);
}
//@ chunk-exfmq47h.js:80625-80660 facade-majority
function isPathPersistedTrusted(path) {
  return isTrustKeyPersistedTrusted(getPersistedTrustKeyForPath(path));
}
//@ chunk-exfmq47h.js:80660-80700 layout
function getGlobalConfigForTrust() {
  return isDiskless() || ignoresPersistedTrust() ? {} : getGlobalConfig();
}
//@ chunk-exfmq47h.js:80700-80949 facade-majority
var PERSISTED_TRUST_IGNORED =
  "no workspace trust record counts in this process, because CLAUDE_CODE_IGNORE_PERSISTED_TRUST is set (a self-hosted runner sets it when started with --trust-workspace false, and for a session that starts without the project setting source)";
//@ chunk-exfmq47h.js:80949-80977 facade-majority
function ignoresPersistedTrust() {
  return ignoresPersistedTrust_2();
}
//@ chunk-exfmq47h.js:80977-81067 facade-majority (2.1.88 match: computeTrustDialogAccepted, 1)
function isTrustKeyPersistedTrusted(key) {
  if (isRestrictedWorkspaceTrustKey(key)) return false;
  return getGlobalConfigForTrust().projects?.[key]?.hasTrustDialogAccepted === true;
}
//@ chunk-exfmq47h.js:81067-81102 placement
function getWorkspacePersistedTrustKey(path) {
  return getPersistedTrustKeyForPath(path ?? getOriginalCwd());
}
//@ chunk-exfmq47h.js:81102-81146 facade-majority
function getPersistedTrustKeyForPath(path) {
  return normalizePathForConfigKey(uncachedStorageRootFor(path) ?? identity(resolve(path)));
}
//@ chunk-exfmq47h.js:81146-81206 facade-majority
function isPathPersistedTrustedCwdExact(path) {
  if (findGitRootUncached(path) !== null) return false;
  return isTrustKeyPersistedTrusted(getPersistedTrustKeyForExactPath(path));
}
//@ chunk-exfmq47h.js:81206-81243 facade-majority
function getPersistedTrustKeyForExactPath(path) {
  return normalizePathForConfigKey(identity(resolve(path)));
}
//@ chunk-exfmq47h.js:81243-81466 facade-majority
async function persistedTrustKeyThroughBackend(storageV5, originalCwdOrNull) {
  if (storageV5.hostFiles.serving("workspace") !== "host") return;
  let startPath = resolve(originalCwdOrNull);
  let gitRootThroughBackendUncached = await findGitRootThroughBackendUncached(storageV5.hostFiles, startPath);
  if (gitRootThroughBackendUncached === undefined) return;
  if (gitRootThroughBackendUncached.gitRoot === null) return normalizePathForConfigKey(identity(startPath));
  return gitRootThroughBackendUncached.entry === "directory"
    ? normalizePathForConfigKey(gitRootThroughBackendUncached.gitRoot)
    : undefined;
}
//@ chunk-exfmq47h.js:81466-81599 facade-majority
async function workspacePersistedTrustThroughBackend(storageV5) {
  try {
    let originalCwdOrNull = getOriginalCwdOrNull();
    if (originalCwdOrNull === null) return false;
    let key = await persistedTrustKeyThroughBackend(storageV5, originalCwdOrNull);
    return key === undefined ? undefined : isTrustKeyPersistedTrusted(key);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-exfmq47h.js:81599-81827 facade-majority
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
//@ chunk-exfmq47h.js:81827-81898 facade-majority
function isLocalSettingsGitTrackedInIndex() {
  if (isDiskless() || !checkHasTrustDialogAccepted()) return false;
  return getLocalSettingsGitTrackedStatus() === "tracked_in_index";
}
//@ chunk-exfmq47h.js:81898-82082 layout
function getLocalSettingsGitTrackedStatus() {
  let configState = getConfigState();
  let originalCwd = getOriginalCwd();
  let trustKey =
    configState.localSettingsGitTracked?.cwd === originalCwd
      ? configState.localSettingsGitTracked.value
      : undefined;
  if (trustKey === undefined) {
    trustKey = computeLocalSettingsGitTracked();
    configState.setLocalSettingsGitTracked({
      cwd: originalCwd,
      value: trustKey,
    });
  }
  return trustKey;
}
//@ chunk-exfmq47h.js:82082-82137 facade-majority
function resetLocalSettingsGitTrackedCache() {
  getConfigState().setLocalSettingsGitTracked(undefined);
}
//@ chunk-exfmq47h.js:82137-82275 layout
function isCwdHomeOrConfigDir() {
  let originalCwd = getOriginalCwd();
  let fsImplementation = getFsImplementation();
  try {
    if (fsImplementation.realpathSync(resolve(originalCwd)) === fsImplementation.realpathSync(homedir()))
      return true;
  } catch {}
  return resolve(getClaudeConfigDir()) === resolve(join(originalCwd, ".claude"));
}
//@ chunk-exfmq47h.js:82275-82558 layout
function computeLocalSettingsGitTracked() {
  let originalCwd = getOriginalCwd();
  let projectConfigRoot = getProjectConfigRoot();
  let configRoot = projectConfigRoot ?? originalCwd;
  let doneDirs = [configRoot];
  let settingsRoot = projectConfigRoot ?? resolveLocalSettingsStoreRoot(originalCwd, storageRootFor);
  if (settingsRoot !== resolve(configRoot)) doneDirs.push(settingsRoot);
  let dirty = false;
  let tracked = false;
  for (let dir of doneDirs) {
    let trackedResult = checkLocalSettingsTrackedAt(dir);
    if (trackedResult === "tracked_in_index") return "tracked_in_index";
    if (trackedResult === "tracked") dirty = true;
    if (trackedResult === "indeterminate") tracked = true;
  }
  if (dirty) return "tracked";
  return tracked ? "indeterminate" : "untracked";
}
//@ chunk-exfmq47h.js:82558-83725 layout
function checkLocalSettingsTrackedAt(dir) {
  let fsImplementation = getFsImplementation();
  try {
    if (fsImplementation.realpathSync(resolve(dir)) === fsImplementation.realpathSync(homedir()))
      return "untracked";
  } catch {}
  if (resolve(getClaudeConfigDir()) === resolve(join(dir, ".claude"))) return "untracked";
  for (let target of [join(dir, ".claude"), join(dir, ".claude", "settings.local.json")])
    try {
      if (fsImplementation.lstatSync(target).isSymbolicLink()) return "tracked";
    } catch (error) {
      if (!isENOENT(error)) return "tracked";
    }
  try {
    fsImplementation.lstatSync(join(dir, ".claude", ".git"));
    return "tracked";
  } catch (error) {
    if (!isENOENT(error)) return "tracked";
  }
  if (
    noUncachedRoot(dir, {
      uncached: true,
    }) !== null
  )
    return "tracked";
  if (isDisklessSession()) return "tracked";
  try {
    let childProcess = importMetaRequire("child_process");
    let gitModule = require("./findExecutableWindows.js");
    let executableSafely = gitModule.resolveExecutableSafely("git");
    let remoteHostSessionCount = getRemoteHostSessionCount({
      GIT_LITERAL_PATHSPECS: "",
      GIT_TRACE2: "0",
      GIT_TRACE2_PERF: "0",
      GIT_TRACE2_EVENT: "0",
    });
    if (executableSafely === null || isGitMissingMessageSupported(executableSafely, remoteHostSessionCount))
      return "untracked";
    let spawnResult = childProcess.spawnSync(
      executableSafely,
      [
        ...GIT_SAFE_GLOBAL_ARGS,
        "-C",
        dir,
        "ls-files",
        "--error-unmatch",
        "--",
        ":(icase).claude/settings.local.json",
      ],
      {
        cwd: dir,
        encoding: "utf8",
        timeout: 2000,
        windowsHide: true,
        env: remoteHostSessionCount,
      },
    );
    if (spawnResult.error && isENOENT(spawnResult.error)) return "untracked";
    if (spawnResult.signal !== null || spawnResult.error) return "tracked";
    if (spawnResult.status === 128)
      return /^fatal: not a git repository/.test(spawnResult.stderr ?? "") ? "indeterminate" : "tracked";
    if (spawnResult.status === 0) return "tracked_in_index";
    if (spawnResult.status === 1) return "untracked";
    return "tracked";
  } catch {
    return "untracked";
  }
}
//@ chunk-exfmq47h.js:83725-83889 layout (2.1.88 match: computeTrustDialogAccepted, 0.778)
function computeTrustDialogAccepted_2() {
  if (env.CLAUDE_CODE_SANDBOXED) return true;
  if (getSessionTrustAccepted()) return true;
  let config = getGlobalConfigForTrust();
  let projectPath = getProjectPathForConfig();
  if (config.projects?.[projectPath]?.hasTrustDialogAccepted) return true;
  return findTrustedAncestor(config, getOriginalCwd()) !== null;
}
//@ chunk-exfmq47h.js:83889-84071 file-local
function findTrustedAncestor(config, path) {
  let resolvedPath = identity(resolve(path));
  let currentPath = persistedTrustBoundary(resolvedPath);
  if (currentPath?.rootOnly) {
    let parentPath = normalizePathForConfigKey(resolve(currentPath.root));
    return config.projects?.[parentPath]?.hasTrustDialogAccepted === true ? parentPath : null;
  }
  return computeTrustDialogAccepted(
    config,
    resolvedPath,
    currentPath !== null ? normalizePathForConfigKey(resolve(currentPath.root)) : null,
  );
}
//@ chunk-exfmq47h.js:84071-84256 facade-majority
function persistedTrustBoundary(path) {
  let resolvedPath = identity(resolve(path));
  let nearestRoot = findNearestRoot(resolvedPath, {
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
  let gitRootUncached = findGitRootUncached(resolvedPath);
  return gitRootUncached !== null
    ? {
        root: gitRootUncached,
        rootOnly: false,
      }
    : null;
}
//@ chunk-exfmq47h.js:84256-84490 layout (2.1.88 match: computeTrustDialogAccepted, 1)
function computeTrustDialogAccepted(config, path, identityFn) {
  let currentPath = normalizePathForConfigKey(path);
  while (true) {
    if (!(
      identityFn === null ||
      currentPath === identityFn ||
      currentPath.startsWith(identityFn.endsWith("/") ? identityFn : identityFn + "/")
    ))
      return null;
    if (config.projects?.[currentPath]?.hasTrustDialogAccepted) return currentPath;
    if (currentPath === identityFn) return null;
    let parentPath = normalizePathForConfigKey(resolve(currentPath, ".."));
    if (parentPath === currentPath) return null;
    currentPath = parentPath;
  }
}
//@ chunk-exfmq47h.js:84490-84605 facade-majority
function isPathTrusted(path, { advisoryNoFsProbe = false } = {}) {
  let config = getGlobalConfigForTrust();
  if (advisoryNoFsProbe) return computeTrustDialogAccepted(config, identity(resolve(path)), null) !== null;
  return findPersistedTrustKey(path) !== null;
}
//@ chunk-exfmq47h.js:84605-84712 facade-majority (2.1.88 match: computeTrustDialogAccepted, 1)
function findPersistedTrustKey(path) {
  let config = getGlobalConfigForTrust();
  let currentPath = getWorkspacePersistedTrustKey(path);
  if (config.projects?.[currentPath]?.hasTrustDialogAccepted === true) return currentPath;
  return findTrustedAncestor(config, path);
}
//@ chunk-exfmq47h.js:84712-84780 facade-majority
function isPathTrustedForSession(path) {
  if (env.CLAUDE_CODE_SANDBOXED) return checkHasTrustDialogAccepted();
  return isPathTrusted(path);
}
//@ chunk-exfmq47h.js:84780-84821 facade-majority
function setPathTrusted(dir, storageV5) {
  return saveGlobalConfig(makeTrustAcceptedUpdater(getWorkspacePersistedTrustKey(dir)), storageV5);
}
//@ chunk-exfmq47h.js:84821-84862 facade-majority
function setPathTrustedDurably(path, trusted) {
  return saveGlobalConfigDurably(makeTrustAcceptedUpdater(getWorkspacePersistedTrustKey(path)), trusted);
}
//@ chunk-exfmq47h.js:84862-85036 layout (2.1.88 match: computeTrustDialogAccepted, 1)
function makeTrustAcceptedUpdater(workspacePersistedTrustKey) {
  return (value) => {
    if (value.projects?.[workspacePersistedTrustKey]?.hasTrustDialogAccepted) return value;
    return {
      ...value,
      projects: {
        ...value.projects,
        [workspacePersistedTrustKey]: {
          ...(value.projects?.[workspacePersistedTrustKey] ?? DEFAULT_PROJECT_CONFIG),
          hasTrustDialogAccepted: true,
        },
      },
    };
  };
}
//@ chunk-exfmq47h.js:85036-85088 facade-majority
function _setUseRealConfigPipelineForTesting(enabled) {
  getConfigState().setUseRealPipelineUnderTest(enabled);
}
//@ chunk-exfmq47h.js:85088-85111 layout
function isTestConfigMode() {
  return false;
}
//@ chunk-exfmq47h.js:85111-85150 facade-majority
function isProjectConfigKey(key) {
  return PROJECT_CONFIG_KEYS.includes(key);
}
//@ chunk-exfmq47h.js:85150-85334 fingerprint (2.1.88 match: wouldLoseAuthState, 0.837)
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
//@ chunk-exfmq47h.js:85334-87054 layout
/**
 * 低风险的全局配置键集合（启动次数、使用计数、提示次数等），变化时不需要严格处理。
 */
var LOW_STAKES_GLOBAL_CONFIG_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LOW_STAKES_PROJECT_CONFIG_KEYS;
deferInit("chunk-exfmq47h.js:85334", () => {
  LOW_STAKES_GLOBAL_CONFIG_KEYS = new Set([
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
});
//@ chunk-exfmq47h.js:87054-87184 layout
function changedConfigKeys(before, after) {
  let allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  let changed = [];
  for (let key of allKeys) if (jsonStringify(before[key]) !== jsonStringify(after[key])) changed.push(key);
  return changed;
}
//@ chunk-exfmq47h.js:87184-87246 layout
/**
 * 判断项目配置的改动是否都属低风险键。
 */
function isLowStakesProjectConfigChange(before, after) {
  return changedConfigKeys(before ?? {}, after ?? {}).every((key) => LOW_STAKES_PROJECT_CONFIG_KEYS.has(key));
}
//@ chunk-exfmq47h.js:87246-87389 layout
function isOnlyCrashMarkerChange(before, after) {
  let changedKeys = changedConfigKeys(before, after);
  return (
    after.lastGracefulShutdown === false &&
    changedKeys.length > 0 &&
    changedKeys.every((key) => key === "lastGracefulShutdown" || key === "lastVersionBase")
  );
}
//@ chunk-exfmq47h.js:87389-87412 facade-majority
var CONFIG_CRASH_MARKER_REENQUEUE_DELAYS_MS = [30000, 120000];
//@ chunk-exfmq47h.js:87412-87613 layout (2.1.88 match: getProjectsDir, 0.797)
function getProjectsDir(before, after, isLowStakesKey) {
  return changedConfigKeys(before, after).every((key) => {
    if (key === "projects") {
      let projects = before.projects ?? {};
      let projects_2 = after.projects ?? {};
      return [...new Set([...Object.keys(projects), ...Object.keys(projects_2)])].every((projectPath) =>
        isLowStakesProjectConfigChange(projects[projectPath], projects_2[projectPath]),
      );
    }
    return isLowStakesKey(key);
  });
}
//@ chunk-exfmq47h.js:87613-88051 layout
var LOW_STAKES_SESSION_CACHE_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:87613", () => {
  LOW_STAKES_SESSION_CACHE_KEYS = new Set([
    "clientDataCacheSlots",
    "additionalModelOptionsCache",
    "additionalModelOptionsAnsweredAt",
    "additionalModelCostsCache",
    "modelAccessCache",
    "orgModelDefaultCache",
    "autoCompactWindowsCache",
    "penguinModeOrgEnabled",
    "cachedExtraUsageDisabledReason",
    "cachedUsageUtilization",
    "metricsStatusCacheByPrincipal",
    "metricsStatusCache",
    "groveConfigCache",
    "passesEligibilityCache",
    "claudeAiMcpEverConnected",
    "gzipRequestBodiesLatchedOff",
  ]);
});
//@ chunk-exfmq47h.js:88051-88314 layout
function isLowStakesGlobalChange(before, after) {
  return getProjectsDir(before, after, (key) => {
    if (key === "oauthAccount")
      return (
        before.oauthAccount != null &&
        after.oauthAccount != null &&
        before.oauthAccount.accountUuid === after.oauthAccount.accountUuid &&
        before.oauthAccount.organizationUuid === after.oauthAccount.organizationUuid
      );
    return LOW_STAKES_GLOBAL_CONFIG_KEYS.has(key) || LOW_STAKES_SESSION_CACHE_KEYS.has(key);
  });
}
//@ chunk-exfmq47h.js:88314-88398 layout
/**
 * 判断全局配置的改动是否只涉及低风险键：projects 下逐个项目比较，其余键必须都在 LOW_STAKES_GLOBAL_CONFIG_KEYS 里。
 */
function isLowStakesConfigChange(config, updater, isLowStakes) {
  let working = {
    ...(config ?? createDefaultGlobalConfig()),
  };
  let projectPath = updater(working);
  return (
    projectPath === working ||
    (changedConfigKeys(working, projectPath).length > 0 && isLowStakes(working, projectPath))
  );
}
//@ chunk-exfmq47h.js:88398-88497 layout
function isLowStakesProjectSave(projectConfig, projectPath, updater) {
  let before = {
    ...(projectConfig?.projects?.[projectPath] ?? DEFAULT_PROJECT_CONFIG),
  };
  let after = updater(before);
  return (
    after === before ||
    (changedConfigKeys(before, after).length > 0 && isLowStakesProjectConfigChange(before, after))
  );
}
//@ chunk-exfmq47h.js:88497-88752 layout
async function isConfigBehindSymlinkChain(globalClaudeFile) {
  let fsImplementation = getFsImplementation();
  try {
    let linkTarget = await fsImplementation.readlink(globalClaudeFile);
    let resolvedLink = resolve(await fsImplementation.realpath(dirname(globalClaudeFile)), linkTarget);
    if (!(await fsImplementation.lstat(resolvedLink)).isSymbolicLink()) return false;
    logForDebugging("The config is behind a chain of symlinks: this save publishes as after any read.");
    return true;
  } catch {
    return false;
  }
}
//@ chunk-exfmq47h.js:88752-89207 layout
/**
 * 经存储层读取全局配置，失败时记录并以默认值继续。
 */
async function readGlobalConfigFromStorage(storageV5) {
  let configState = getConfigState();
  let text = await storageV5.readText([STORAGE_SPACES.globalConfig()]);
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
  let item = text.value.items[0];
  if (!item?.found) {
    configState.setLastGetConfigOutcome("enoent");
    return createDefaultGlobalConfig();
  }
  try {
    let parsed = jsonParse(stripBom(item.value));
    configState.setLastGetConfigOutcome("parsed");
    return {
      ...createDefaultGlobalConfig(),
      ...parsed,
    };
  } catch {
    configState.setLastGetConfigOutcome("parse-error");
    return createDefaultGlobalConfig();
  }
}
//@ chunk-exfmq47h.js:89207-89867 layout
/**
 * 回退写配置时取基准配置：最近一次读取为解析错误或读错误时改用调用方给的或缓存的配置（标记 cacheDerived/readRejected），否则用新读到的配置。
 */
async function readConfigForFallbackWrite(storageV5, reason) {
  let configState = getConfigState();
  let config =
    isStorageV5Enabled() && reason !== undefined
      ? await readGlobalConfigFromStorage(reason)
      : await readGlobalConfigWithRetry();
  configState.queuedReadFoundNoFile = configState.lastGetConfigOutcome === "enoent";
  configState.fallbackReadFoundNoFile =
    configState.queuedReadFoundNoFile && !(isStorageV5Enabled() && reason !== undefined);
  let readRejected = configState.lastGetConfigOutcome === "read-error";
  if (
    configState.lastGetConfigOutcome === "parse-error" ||
    configState.lastGetConfigOutcome === "read-error"
  ) {
    if (storageV5)
      return {
        config: {
          ...storageV5,
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
  if (configState.fallbackReadFoundNoFile && (await isConfigBehindSymlinkChain(getGlobalClaudeFile()))) {
    configState.fallbackReadFoundNoFile = false;
    configState.doubtsNoFile = true;
  }
  return {
    config,
    cacheDerived: false,
    readRejected: false,
  };
}
//@ chunk-exfmq47h.js:89867-89912 layout
var GLOBAL_CONFIG = "global-config";
var EXTERNAL_REFRESH = "external-refresh";
//@ chunk-exfmq47h.js:89912-89976 layout
/**
 * 把“从磁盘刷新全局配置”排入写队列执行。
 */
function scheduleGlobalConfigRefresh(config) {
  getConfigState().writeQueues.run(EXTERNAL_REFRESH, () =>
    refreshGlobalConfigFromDisk(config).catch(() => {}),
  );
}
//@ chunk-exfmq47h.js:89976-89985 layout
var MAX_CREATE_REFUSED_RETRIES = 4;
//@ chunk-exfmq47h.js:89985-91139 layout
function runQueuedConfigWrite(task, isSkipSafe) {
  let configState = getConfigState();
  configState.beginPendingWrite();
  return configState.writeQueues.run(GLOBAL_CONFIG, async () => {
    try {
      configState.configCreateRefused = false;
      let result = await task();
      if (!configState.configCreateRefused) return result;
      configState.createRefusedThisProcess = true;
      configState.doubtsNoFile = true;
      for (let j = 1; j < MAX_CREATE_REFUSED_RETRIES && configState.configCreateRefused; j++) {
        logForDebugging("A create was refused, so the file is there: saving once more, onto it.");
        configState.configCreateRefused = false;
        result = await task();
      }
      try {
        if (configState.configCreateRefused) {
          logForDebugging(`A create was refused ${MAX_CREATE_REFUSED_RETRIES} times: this save is dropped.`);
          logFeatureBad("config_missing_read", "refused_again");
          let skipSafe = false;
          try {
            skipSafe = isSkipSafe?.() ?? false;
          } catch (error) {
            logForDebugging(`Could not judge a dropped save: ${error}`, {
              level: "error",
            });
          }
          if (!skipSafe) {
            logError(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                "A config save that is not skip-safe was dropped",
              ),
            );
            if (!configState.droppedSaveNoticeShown) {
              configState.droppedSaveNoticeShown = true;
              let notice = `
Make this change again later: ${getGlobalClaudeFile()} could not be updated, so it applies to this session only.
`;
              if (getIsNonInteractiveSession()) process.stderr.write(notice);
              else
                process.once("exit", () => {
                  try {
                    writeSync(2, notice);
                  } catch {}
                });
            }
          }
        } else logFeatureSad("config_missing_read", "create_refused");
      } catch (error) {
        logForDebugging(`Could not count a refused create: ${error}`, {
          level: "error",
        });
      }
      return result;
    } finally {
      if (configState.endPendingWrite() === 0) {
        let externalRefresh = configState.takePendingExternalRefresh();
        if (externalRefresh === "storage") scheduleExternalConfigRefresh();
        else if (externalRefresh) scheduleGlobalConfigRefresh(externalRefresh);
      }
    }
  });
}
//@ chunk-exfmq47h.js:91139-91186 facade-majority
function drainConfigWrites() {
  return getConfigState().writeQueues.drain();
}
//@ chunk-exfmq47h.js:91186-91195 layout
// deferred: uses registerWriteQueueDrain (./settings/writeQueues.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:91186", () => {
  registerWriteQueueDrain(drainConfigWrites);
});
//@ chunk-exfmq47h.js:91195-91239 facade-majority
function getConfigSaveFullDiskCode() {
  return getConfigState().fullDiskSaveCode;
}
//@ chunk-exfmq47h.js:91239-91374 layout
function applyOptimisticConfigUpdate(updater) {
  let configState = getConfigState();
  let config = configState.cache.config;
  if (!config) return null;
  try {
    let nextConfig = updater(config);
    if (nextConfig === config) return config;
    configState.applyOptimistic(stripRetiredConfigKeys(nextConfig));
  } catch {}
  return config;
}
//@ chunk-exfmq47h.js:91374-92117 layout
/**
 * 判断配置写入是否只能留在内存（存储 V5 下未交接的写入者）。
 */
function isConfigWriteMemoryOnly(config, reason) {
  if (getConfigState().unparseableFileLeftAlone) {
    logForDebugging(
      `config: ${reason} ran in a process that is ending because the global config file does not parse; the change is dropped and the file is left as it is`,
      {
        level: "warn",
      },
    );
    return true;
  }
  if (isStorageV5Enabled() && config !== undefined) return false;
  if (isStorageV5Enabled() && getConfigState().unhandedWritesInMemory) {
    logFeatureSad("storage_v5_backend", "unhanded_config_writer");
    logForDebugging(
      `config: ${reason} ran without the storage backend in a process whose config record has no file behind it; the change is in memory only and is replaced when a backend-handed save or refresh rebuilds the config from the record`,
      {
        level: "warn",
      },
    );
    return true;
  }
  if (isDiskless()) {
    logForDebugging(
      `config: ${reason} ran in a diskless process with no storage backend to write through; the change is in memory only`,
      {
        level: "warn",
      },
    );
    return true;
  }
  return false;
}
//@ chunk-exfmq47h.js:92117-92168 facade-majority
/**
 * 在文件锁下读-改-写 ~/.claude.json；锁失败时走回退写，但若重读结果丢失了缓存里有的 oauthAccount/hasCompletedOnboarding 则拒绝写入（tengu_config_auth_loss_prevented，见 GH #3117）。
 */
function saveGlobalConfig(updater, storageV5) {
  return saveGlobalConfigQueued(updater, storageV5).then(() => {
    return;
  });
}
//@ chunk-exfmq47h.js:92168-92244 facade-majority
function saveGlobalConfigDurably(updater, storageV5, options) {
  return saveGlobalConfigQueued(updater, storageV5, options?.writesOnlyUnderLock === true).catch(() => false);
}
//@ chunk-exfmq47h.js:92244-92529 facade-majority
async function configMayStillHold(storageV5) {
  try {
    let globalConfigFromDiskOrThrow = await readGlobalConfigFromDiskOrThrow(storageV5);
    if (globalConfigFromDiskOrThrow === undefined)
      return isDisklessWithoutState(storageV5) ? undefined : "key";
    if (typeof globalConfigFromDiskOrThrow !== "object" || globalConfigFromDiskOrThrow === null) return "key";
    return "primaryApiKey" in globalConfigFromDiskOrThrow
      ? "key"
      : "oauthAccount" in globalConfigFromDiskOrThrow
        ? "account"
        : undefined;
  } catch (error) {
    logForDebugging(`Could not read the config file back: ${getErrnoCode(error) ?? "not JSON"}`);
    return "key";
  }
}
//@ chunk-exfmq47h.js:92529-92924 layout
/**
 * 保存全局配置：先在内存缓存上乐观应用更新函数，再在 global-config 写队列中加锁写盘（saveGlobalConfig）；diskless/无后端时只改内存。
 */
function saveGlobalConfigQueued(updater, storageV5, lockOnly = false) {
  let configState = getConfigState();
  if (isTestConfigMode()) {
    let testConfig = updater(configState.testGlobalConfig);
    if (testConfig === configState.testGlobalConfig) return Promise.resolve(true);
    configState.overwriteTestGlobalConfig(testConfig);
    return Promise.resolve(true);
  }
  let optimisticConfig = applyOptimisticConfigUpdate((config) => {
    let nextConfig = updater(config);
    if (nextConfig === config) return config;
    return {
      ...nextConfig,
      projects: mergeProjectsForSave(config.projects, nextConfig.projects),
    };
  });
  if (isConfigWriteMemoryOnly(storageV5, "saveGlobalConfig")) return Promise.resolve(false);
  let lockRetrySignal = lockOnly ? undefined : getBootSaveRetrySignal(configState);
  return runQueuedConfigWrite(
    () => saveGlobalConfig_2(updater, optimisticConfig, storageV5, lockRetrySignal, lockOnly),
    () => isLowStakesConfigChange(optimisticConfig, updater, isLowStakesGlobalChange),
  );
}
//@ chunk-exfmq47h.js:92924-94499 fingerprint (2.1.88 match: saveGlobalConfig, 0.455)
async function saveGlobalConfig_2(updater, storageV5, reason, lockRetrySignal, lockOnly = false) {
  let configState = getConfigState();
  let written = null;
  let dirty = false;
  let writeFailed = false;
  try {
    let writeResult = await saveConfigWithLock(
      (current) => {
        let config = updater(current);
        if (config === current) {
          dirty = true;
          return current;
        }
        written = stripRetiredConfigKeys({
          ...config,
          projects: mergeProjectsForSave(current.projects, config.projects),
        });
        return written;
      },
      storageV5,
      {
        onCompromised: () => (writeFailed = true),
        lockRetrySignal,
        lockOnlyCaller: lockOnly ? "save_global" : undefined,
      },
      reason,
    );
    if (writeResult && written) writeThroughConfigCache(written, lockOnly);
    return (writeResult || dirty) && !writeFailed;
  } catch (error) {
    logForDebugging(`Failed to save config with lock: ${error}`, {
      level: "error",
    });
    let configForFallbackWrite = await readConfigForFallbackWrite(storageV5, reason);
    if (configForFallbackWrite.readRejected) {
      logConfigFallbackSuppressedUnreadable("save_global");
      return false;
    }
    let config = configForFallbackWrite.config;
    let config_2 = updater(config);
    if (config_2 === config) return true;
    let mergedConfig = {
      ...config_2,
      projects: mergeProjectsForSave(config.projects, config_2.projects),
    };
    written = stripRetiredConfigKeys(mergedConfig);
    if (
      isLockContentionError(error) &&
      !configForFallbackWrite.cacheDerived &&
      (!configState.fallbackReadFoundNoFile ||
        isLowStakesConfigChange(storageV5, updater, (current, next) =>
          getProjectsDir(current, next, (key) => LOW_STAKES_GLOBAL_CONFIG_KEYS.has(key)),
        )) &&
      getProjectsDir(config, mergedConfig, (key) => LOW_STAKES_GLOBAL_CONFIG_KEYS.has(key))
    ) {
      logConfigFallbackSkippedContention("save_global");
      return false;
    }
    let lowStakes = !configForFallbackWrite.cacheDerived && isLowStakesGlobalChange(config, mergedConfig);
    if (wouldLoseAuthState(config) && wouldLoseAuthState(written)) {
      let pendingCount = configState.pendingWriteCount();
      if (pendingCount > 1 && isLockContentionError(error))
        logForDebugging(
          "saveGlobalConfig fallback under contention: proceeding on the base as-is (fresh disk on a clean read; the snapshot copy on a torn read); the write queued behind carries the pending auth. See GH #3117 / gh-73364.",
        );
      else if (pendingCount > 1 && storageV5) {
        logForDebugging(
          "saveGlobalConfig fallback: merge base is missing auth the cache has, but an in-process write is queued behind this one; re-basing on the enqueue-time cache snapshot so the pending auth and this write both land. See GH #3117.",
        );
        config = {
          ...storageV5,
        };
        config_2 = updater(config);
        if (config_2 === config) return true;
        written = stripRetiredConfigKeys({
          ...config_2,
          projects: mergeProjectsForSave(config.projects, config_2.projects),
        });
        lowStakes = false;
      } else if (!configState.fallbackReadFoundNoFile) {
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
    await saveConfig(written, "save_global", lowStakes, reason);
    return false;
  }
}
//@ chunk-exfmq47h.js:94499-94642 fingerprint (2.1.88 match: reportConfigCacheStats, 0.798)
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
//@ chunk-exfmq47h.js:94642-94662 layout
// deferred: uses registerCleanup (./cleanupRegistry.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:94642", () => {
  registerCleanup(async () => {
    reportConfigCacheStats();
  });
});
//@ chunk-exfmq47h.js:94662-94956 fingerprint (2.1.88 match: migrateConfigFields, 0.723)
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
//@ chunk-exfmq47h.js:94956-95585 affinity
/**
 * 写盘前删除已退役的键（opus1mMergeNoticeSeenCount、speculationEnabled、prideFlag 等），没有时原样返回。
 */
function stripRetiredConfigKeys(config) {
  let stripped = config;
  if (
    stripped.opus1mMergeNoticeSeenCount === undefined &&
    stripped.voiceNoticeSeenCount === undefined &&
    stripped.opus47LaunchSeenCount === undefined &&
    stripped.opus48LaunchSeenCount === undefined &&
    stripped.speculationEnabled === undefined &&
    stripped.fleetViewPeakConcurrent === undefined &&
    stripped.pluginUsageLspGraceApplied === undefined &&
    stripped.autoModeOptInDismissed === undefined &&
    stripped.prideFlag === undefined &&
    stripped.routineFiredWatermark === undefined
  )
    return config;
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
    ...project
  } = stripped;
  return project;
}
//@ chunk-exfmq47h.js:95991-96146 sole-consumer
function mergeProjectsForSave(projects, projects_2) {
  if (projects_2 === projects || !projects) return shouldShowProjectOnboarding(projects_2);
  if (!projects_2) return shouldShowProjectOnboarding(projects);
  let projects_3 = projects_2;
  for (let [key, value] of Object.entries(projects))
    if (!(key in projects_2)) {
      if (projects_3 === projects_2)
        projects_3 = {
          ...projects_2,
        };
      projects_3[key] = value;
    }
  return shouldShowProjectOnboarding(projects_3);
}
//@ chunk-exfmq47h.js:96146-96174 sole-consumer
/**
 * 配置监视的回退轮询间隔（1 秒，也用作最大观测延迟）。
 */
var CONFIG_WATCH_FALLBACK_POLL_MS = 1000;
var CONFIG_WATCH_SAFETY_POLL_MS = 60000;
var CONFIG_WATCH_SETTLE_MS = 200;
//@ chunk-exfmq47h.js:96174-96616 affinity
/**
 * 启动对 ~/.claude.json 的外部修改监视（事件监视或 fs.watchFile 轮询）：文件更新且无待写入时刷新内存配置，有待写入时延后刷新。
 */
function startGlobalConfigFreshnessWatcher() {
  let configState = getConfigState();
  if (configState.freshnessWatcherStarted) return;
  if (isConfigFileWatchDisabled()) return;
  configState.setFreshnessWatcherStarted(true);
  let globalClaudeFile = getGlobalClaudeFile();
  let onConfigStat = (stat) => {
    if (stat.mtimeMs <= configState.cache.mtime) return;
    if (configState.pendingWriteCount() > 0) {
      configState.deferExternalRefresh(stat);
      return;
    }
    scheduleGlobalConfigRefresh(stat);
  };
  if (isConfigWatchEventsEnabled())
    configState.setFreshnessEventWatch(
      new FileStatWatcher(
        globalClaudeFile,
        {
          fallbackPollMs: CONFIG_WATCH_FALLBACK_POLL_MS,
          safetyPollMs: CONFIG_WATCH_SAFETY_POLL_MS,
          settleMs: CONFIG_WATCH_SETTLE_MS,
          label: "global_config",
        },
        onConfigStat,
      ),
    );
  else
    watchFileSafe(
      globalClaudeFile,
      {
        interval: CONFIG_WATCH_FALLBACK_POLL_MS,
        persistent: false,
      },
      onConfigStat,
    );
  registerCleanup(async () => {
    stopGlobalConfigFreshnessWatcher(configState);
    configState.setFreshnessBackend(undefined);
  });
}
//@ chunk-exfmq47h.js:96616-96771 facade-majority
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
//@ chunk-exfmq47h.js:96771-96892 layout
function stopGlobalConfigFreshnessWatcher(configState) {
  configState.freshnessEventWatch?.close();
  configState.setFreshnessEventWatch(undefined);
  unwatchFile(getGlobalClaudeFile());
  configState.setFreshnessWatcherStarted(false);
}
//@ chunk-exfmq47h.js:96892-96947 layout
/**
 * 无盘或启用 v5 存储且无回退时，不做配置文件监视。
 */
function isConfigFileWatchDisabled() {
  return isDiskless() || (isStorageV5Enabled() && !getConfigState().fileWatchFallback);
}
//@ chunk-exfmq47h.js:96947-97116 layout
function logGlobalConfigUnwatched() {
  logForDebugging(
    "Not watching ~/.claude.json for other processes: the fs.watchFile fallback is off for this process",
    {
      level: "warn",
    },
  );
  logForDiagnosticsNoPII("warn", "global_config_unwatched");
}
//@ chunk-exfmq47h.js:97116-97299 layout
async function refreshGlobalConfigFromDisk(storageV5) {
  let configState = getConfigState();
  let globalClaudeFile = getGlobalClaudeFile();
  let priorStats;
  try {
    priorStats = await getFsImplementation().readFile(globalClaudeFile, {
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
  installGlobalConfigFromDisk(priorStats, storageV5, storageV5);
}
//@ chunk-exfmq47h.js:97299-97524 callgraph-witnessed (2.1.88 match: startGlobalConfigFreshnessWatcher, 0.212)
function installGlobalConfigFromDisk(text, outcome, stats) {
  let file = getConfigState();
  if (outcome.mtimeMs <= file.cache.mtime) return;
  if (file.pendingWriteCount() > 0) {
    file.deferExternalRefresh(stats);
    return;
  }
  let parsed = safeParseJSON(stripBom(text), false);
  if (parsed === null || typeof parsed !== "object") return;
  file.installDiskRead(
    migrateConfigFields({
      ...createDefaultGlobalConfig(),
      ...parsed,
    }),
    outcome,
  );
}
//@ chunk-exfmq47h.js:97524-97875 layout
async function checkGlobalConfigFreshness() {
  let freshnessBackend = getConfigState().freshnessBackend;
  if (isStorageV5Enabled() && freshnessBackend !== undefined) {
    let text = await freshnessBackend.readText([STORAGE_SPACES.globalConfig()]);
    if (!text.ok) return;
    let item = text.value.items[0];
    if (!item?.found) return;
    installGlobalConfigFromDisk(
      item.value,
      {
        mtimeMs: item.mtimeMs,
        size: item.totalBytes,
      },
      "storage",
    );
    return;
  }
  if (isConfigFileWatchDisabled()) return;
  let parsed;
  try {
    let stats = await getFsImplementation().stat(getGlobalClaudeFile());
    parsed = {
      mtimeMs: stats.mtimeMs,
      size: stats.size,
    };
  } catch {
    return;
  }
  return refreshGlobalConfigFromDisk(parsed);
}
//@ chunk-exfmq47h.js:97875-97937 layout
function scheduleExternalConfigRefresh() {
  getConfigState().writeQueues.run(EXTERNAL_REFRESH, () => checkGlobalConfigFreshness().catch(() => {}));
}
//@ chunk-exfmq47h.js:97937-98266 facade-majority
async function watchGlobalConfigThroughStorage(storageV5) {
  let configState = getConfigState();
  if (storageV5 === undefined) {
    if (configState.freshnessBackend !== undefined) detachGlobalConfigStorageBackend();
    return;
  }
  if (
    isStorageV5Enabled() &&
    configState.freshnessBackend === undefined &&
    configState.freshnessWatcherStarted
  ) {
    configState.setFreshnessBackend(storageV5);
    let subscription = await subscribeGlobalConfigViaStorage(storageV5);
    if (configState.freshnessBackend !== storageV5) {
      subscription?.unsubscribe();
      return;
    }
    if (!subscription) {
      configState.setFreshnessBackend(undefined);
      return;
    }
    configState.setFreshnessSubscription(subscription);
    stopGlobalConfigFreshnessWatcher(configState);
  }
}
//@ chunk-exfmq47h.js:98266-98618 layout
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
//@ chunk-exfmq47h.js:98618-99020 layout
async function subscribeGlobalConfigViaStorage(storageV5) {
  let subscription;
  try {
    let subscribed = await storageV5.subscribe(
      {
        target: "key",
        key: STORAGE_SPACES.globalConfig(),
      },
      onGlobalConfigStorageEvent,
      {
        maxObservationLagMs: CONFIG_WATCH_FALLBACK_POLL_MS,
      },
    );
    if (subscribed.ok) {
      logForDebugging("Watching ~/.claude.json for other processes through the storage interface");
      return subscribed.value;
    }
    subscription = formatStorageError(subscribed.error);
  } catch (error) {
    subscription = String(error);
  }
  let note = isConfigFileWatchDisabled() ? "" : "; using the fs.watchFile poll";
  logForDebugging(`Watching ~/.claude.json through the storage interface failed${note}: ${subscription}`, {
    level: "warn",
  });
  return;
}
//@ chunk-exfmq47h.js:99020-99157 layout
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
//@ chunk-exfmq47h.js:99157-99943 layout
function onGlobalConfigStorageEvent(event) {
  let configState = getConfigState();
  let freshnessBackend = configState.freshnessBackend;
  if (!isStorageV5Enabled() || freshnessBackend === undefined) return;
  if (!event.ok) {
    if (isCleanupStarted()) return;
    logForDebugging(
      `Watching ~/.claude.json through the storage interface ended: ${formatStorageError(event.error)}`,
      {
        level: "warn",
      },
    );
    configState.setFreshnessSubscription(undefined);
    if (configState.claimFreshnessResubscribe())
      subscribeGlobalConfigViaStorage(freshnessBackend).then((lateSubscription) => {
        if (configState.freshnessBackend !== freshnessBackend) lateSubscription?.unsubscribe();
        else if (lateSubscription) configState.setFreshnessSubscription(lateSubscription);
        else startGlobalConfigWatcher();
      });
    else startGlobalConfigWatcher();
    return;
  }
  let changeKind = event.value;
  switch (changeKind.kind) {
    case "snapshot":
    case "created":
    case "updated":
      if (changeKind.kind !== "snapshot" && changeKind.origin === "self") return;
      if (changeKind.kind === "snapshot" && configState.loadedVersion !== undefined) {
        let loadedVersion = configState.loadedVersion;
        configState.setLoadedVersion(undefined);
        if ("version" in changeKind && changeKind.version === loadedVersion) return;
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
//@ chunk-exfmq47h.js:99943-100064 layout
function writeThroughConfigCache(config, lockOnly = false) {
  let configState = getConfigState();
  if (configState.pendingWriteCount() > 1 || (lockOnly && wouldLoseAuthState(config))) {
    configState.advanceFreshnessCursor();
    return;
  }
  configState.writeThrough(config);
}
//@ chunk-exfmq47h.js:100064-100114 facade-majority
function subscribeGlobalConfigInstalled(listener) {
  return getConfigState().installed.subscribe(listener);
}
//@ chunk-exfmq47h.js:100114-100290 facade-majority (2.1.88 match: getGlobalConfig, 0)
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
//@ chunk-exfmq47h.js:100290-100349 facade-majority
async function readFreshOauthAccountFromDisk(storageV5) {
  try {
    return await readOauthAccountFromDiskOrThrow(storageV5);
  } catch {
    return;
  }
}
//@ chunk-exfmq47h.js:100349-100396 facade-majority
async function readOauthAccountFromDiskOrThrow(storageV5) {
  return oauthAccountIn(await readGlobalConfigFromDiskOrThrow(storageV5));
}
//@ chunk-exfmq47h.js:100396-100732 facade-majority
function oauthAccountIn(config) {
  if (typeof config !== "object" || config === null || !("oauthAccount" in config)) return;
  let oauthAccount = config.oauthAccount;
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
//@ chunk-exfmq47h.js:100732-101287 facade-majority
async function readGlobalConfigFromDiskOrThrow(storageV5) {
  if (isTestConfigMode()) return getConfigState().testGlobalConfig;
  let text;
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let text_2 = await storageV5.readText([STORAGE_SPACES.globalConfig()]);
    if (!text_2.ok) throw Error("global config not readable through storage");
    let item = text_2.value.items[0];
    if (!item?.found) {
      if (getConfigState().doubtsNoFile)
        throw Error("global config not found though there is reason to doubt it");
      return;
    }
    text = item.value;
  } else if (isDiskless()) return;
  else
    try {
      text = await getFsImplementation().readFile(getGlobalClaudeFile(), {
        encoding: "utf-8",
      });
    } catch (error) {
      if (isENOENT(error) && !getConfigState().doubtsNoFile) return;
      throw error;
    }
  let parsed = safeParseJSON(stripBom(text), false);
  if (parsed === null) throw Error("global config not parseable");
  return parsed;
}
//@ chunk-exfmq47h.js:101287-101321 facade-majority
function getExplicitRemoteControlAtStartup() {
  return resolveExplicitRemoteControlAtStartup().value;
}
//@ chunk-exfmq47h.js:101321-102174 facade-majority
function resolveExplicitRemoteControlAtStartup() {
  let settingsModule = require("./settings/settings.js");
  let remoteControlAtStartup = settingsModule.projectSettingsAliasesUserSettings()
    ? undefined
    : settingsModule.getSettingsForSourceTightenOnly("projectSettings")?.remoteControlAtStartup;
  let remoteControlAtStartup_2 =
    settingsModule.getSettingsForSourceTightenOnly("localSettings")?.remoteControlAtStartup;
  if (remoteControlAtStartup === false || remoteControlAtStartup_2 === false)
    return {
      value: false,
      source: "project_or_local_false",
    };
  let setting = settingsModule.getSecuritySensitiveSettingWithSources("remoteControlAtStartup")[0];
  let remoteEnabled =
    setting === undefined
      ? isValidGlobalConfigValue("remoteControlAtStartup", getGlobalConfig().remoteControlAtStartup)
      : undefined;
  let remoteSource =
    setting !== undefined
      ? {
          value: setting.value,
          source: TRUSTED_SOURCE_SHORT_NAMES[setting.source],
        }
      : remoteEnabled !== undefined
        ? {
            value: remoteEnabled,
            source: "legacy_global_config",
          }
        : {
            value: undefined,
            source: "none",
          };
  if (remoteSource.value !== true && (remoteControlAtStartup === true || remoteControlAtStartup_2 === true))
    logForDebugging(
      `remoteControlAtStartup: true in ${remoteControlAtStartup === true && remoteControlAtStartup_2 === true ? "project and local" : remoteControlAtStartup === true ? "project" : "local"} settings ignored \u2014 repo-scoped settings cannot enable Remote Control; set it at user scope (/config)`,
    );
  return remoteSource;
}
//@ chunk-exfmq47h.js:102174-102247 layout
var TRUSTED_SOURCE_SHORT_NAMES = {
  policySettings: "policy",
  flagSettings: "flag",
  userSettings: "user",
};
//@ chunk-exfmq47h.js:102247-102282 facade-majority
/**
 * 某个自定义 API key（截断形式）在 customApiKeyResponses 中是 approved、rejected 还是 new。
 */
function getCustomApiKeyStatus(globalConfig) {
  return customApiKeyStatusOf(getGlobalConfig(), globalConfig);
}
//@ chunk-exfmq47h.js:102282-102413 facade-majority (2.1.88 match: getCustomApiKeyStatus, 0.917)
function customApiKeyStatusOf(globalConfig, globalConfig_2) {
  let { approved, rejected } = customApiKeyResponsesOf(globalConfig);
  if (approved.includes(globalConfig_2)) return "approved";
  if (rejected.includes(globalConfig_2)) return "rejected";
  return "new";
}
//@ chunk-exfmq47h.js:102413-102516 facade-majority (2.1.88 match: isCustomApiKeyApproved, 0.816)
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
//@ chunk-exfmq47h.js:102516-102571 facade-majority
/**
 * 启动阶段仍视为“打开”的时间预算（30 秒）。
 */
var CONFIG_LOCK_RETRY_DELAYS_MS = [200, 400, 800, 1600, 3200, 4000];
var CONFIG_LOCK_BOOT_SAVE_RETRY_BUDGET_MS = 1500;
var CONFIG_LOCK_BOOT_PHASE_BUDGET_MS = 30000;
//@ chunk-exfmq47h.js:102571-102608 facade-majority
function markConfigBootPhaseComplete() {
  getConfigState().closeBootPhase();
}
//@ chunk-exfmq47h.js:102608-102819 layout
function getBootSaveRetrySignal(configState) {
  if (configState.bootPhaseSignalForTesting !== undefined) return configState.bootPhaseSignalForTesting;
  if (!configState.bootPhaseStillOpen(CONFIG_LOCK_BOOT_PHASE_BUDGET_MS)) return;
  let abortController = new AbortController();
  setTimeout(
    (controller) => controller.abort(),
    CONFIG_LOCK_BOOT_SAVE_RETRY_BUDGET_MS,
    abortController,
  ).unref?.();
  return abortController.signal;
}
//@ chunk-exfmq47h.js:102819-102840 facade-majority
var CONFIG_READ_RETRY_DELAYS_MS = [50, 150, 450];
//@ chunk-exfmq47h.js:102840-103014 layout
async function readGlobalConfigWithRetry(storageV5) {
  let configState = getConfigState();
  let configWithOutcome = await getConfigWithOutcome(storageV5);
  let lastGetConfigOutcome = configState.lastGetConfigOutcome;
  for (let delayMs of CONFIG_READ_RETRY_DELAYS_MS) {
    if (lastGetConfigOutcome !== "read-error") break;
    await sleep(delayMs);
    configWithOutcome = await getConfigWithOutcome(storageV5);
    lastGetConfigOutcome = configState.lastGetConfigOutcome;
  }
  return configWithOutcome;
}
//@ chunk-exfmq47h.js:103014-103053 layout
/**
 * 判断错误是否为 ELOCKED 锁竞争。
 */
function isLockContentionError(error) {
  return getErrnoCode(error) === "ELOCKED";
}
//@ chunk-exfmq47h.js:103053-103064 facade-majority
var _isLockContentionErrorForTesting = isLockContentionError;
//@ chunk-exfmq47h.js:103064-103384 layout
function logConfigFallbackSkippedContention(reason, isRetry = false) {
  logForDebugging(
    `Config lock still held by a live process after retries; skipping the unlocked fallback write (${reason}) to avoid clobbering the lock holder${isRetry ? " and re-enqueueing it through the locked path" : ""}. See gh-73364.`,
    {
      level: "error",
    },
  );
  logEvent("tengu_config_fallback_skipped_contention", {
    caller: fromEnum(reason),
    reenqueued: isRetry,
  });
}
//@ chunk-exfmq47h.js:103384-103477 layout
var IGNORABLE_LOCK_ONLY_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:103384", () => {
  IGNORABLE_LOCK_ONLY_ERRNOS = new Set([
    "EACCES",
    "EPERM",
    "EROFS",
    "ENOTDIR",
    "ENOTEMPTY",
    "ENOSYS",
    "ENOTSUP",
    "EINVAL",
  ]);
});
//@ chunk-exfmq47h.js:103477-103801 layout
function logConfigFallbackSuppressedUnreadable(reason) {
  getConfigState().doubtsNoFile = true;
  logForDebugging(
    `Config re-read was rejected (disk unreadable); suppressing the unlocked fallback write (${reason}) \u2014 a memory-derived base may not be written without the lock. See the decision table at GetConfigOutcome.`,
    {
      level: "error",
    },
  );
  logEvent("tengu_config_fallback_suppressed_unreadable", {
    caller: fromEnum(reason),
  });
}
//@ chunk-exfmq47h.js:103801-104728 callgraph-witnessed (2.1.88 match: saveConfig, 0.131)
async function saveConfig(config, caller, cacheDerived, storageV5) {
  let fallbackReadFoundNoFile = getConfigState().fallbackReadFoundNoFile;
  if (!fallbackReadFoundNoFile) writeThroughConfigCache(config);
  let wrote = false;
  try {
    let filteredConfig = pickByHelper(
      config,
      (value, key) => jsonStringify(value) !== jsonStringify(DEFAULT_GLOBAL_CONFIG[key]),
    );
    if (isStorageV5Enabled() && storageV5 !== undefined) {
      if (!isDiskless()) await getFsImplementation().mkdir(dirname(getGlobalClaudeFile()));
      let writeResult = await storageV5.write(
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
      if (!writeResult.ok) {
        let errorCode = storageErrorCode(writeResult.error);
        throw Object.assign(
          Error("Config fallback write through storage failed", {
            cause: formatStorageError(writeResult.error),
          }),
          errorCode === undefined
            ? {}
            : {
                code: errorCode,
              },
        );
      }
    } else {
      let globalClaudeFile = getGlobalClaudeFile();
      await getFsImplementation().mkdir(dirname(globalClaudeFile));
      await readJsonFile_2(globalClaudeFile, jsonStringify(filteredConfig, null, 2), {
        encoding: "utf-8",
        mode: 384,
        allowSymlink: true,
        createOnly: fallbackReadFoundNoFile,
      });
      if (fallbackReadFoundNoFile) getConfigState().advanceFreshnessCursor();
    }
    wrote = true;
  } catch (error) {
    let configState = getConfigState();
    if (fallbackReadFoundNoFile && getErrnoCode(error) === "EEXIST") {
      configState.configCreateRefused = true;
      return false;
    }
    configState.doubtsNoFile = true;
    logForDebugging(`Config fallback write also failed; continuing without persisting: ${error}`, {
      level: "error",
    });
    if (!cacheDerived && configState.fullDiskSaveCode === undefined && isDiskFullErrno(error))
      configState.fullDiskSaveCode = getErrnoCode(error);
  }
  logEvent("tengu_config_fallback_write", {
    caller: fromEnum(caller),
    disk_ok: wrote,
  });
  return wrote;
}
//@ chunk-exfmq47h.js:104728-104746 layout
/**
 * 保留的配置备份份数（5）。
 */
var CONFIG_BACKUP_MIN_INTERVAL_MS = 60000;
var MAX_CONFIG_BACKUPS = 5;
//@ chunk-exfmq47h.js:104746-105528 layout
async function backupGlobalConfig(repairingFromCache, backupTarget) {
  if (isStorageV5Enabled() && backupTarget !== undefined) {
    let errorText = await backupGlobalConfigViaStorage(
      backupTarget.backend,
      backupTarget.replaced,
      repairingFromCache,
    ).catch((error) => String(error));
    if (errorText !== undefined)
      logForDebugging(`Failed to backup config: ${errorText}`, {
        level: "error",
      });
    return;
  }
  let globalClaudeFile = getGlobalClaudeFile();
  let fsImplementation = getFsImplementation();
  try {
    let configFileName = basename(globalClaudeFile);
    let configBackupDir = getConfigBackupDir();
    try {
      await fsImplementation.mkdir(configBackupDir);
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
    let backupNames = (await fsImplementation.readdir(configBackupDir))
      .map((entry) => entry.name)
      .filter((name) => name.startsWith(`${configFileName}.backup.`))
      .sort()
      .reverse();
    let latestName = backupNames[0];
    let latestStamp = latestName ? Number(latestName.split(".backup.").pop()) : 0;
    let shouldBackup =
      (Number.isNaN(latestStamp) || Date.now() - latestStamp >= CONFIG_BACKUP_MIN_INTERVAL_MS) &&
      !repairingFromCache;
    if (shouldBackup) {
      let backupPath = join(configBackupDir, `${configFileName}.backup.${Date.now()}`);
      await fsImplementation.copyFile(globalClaudeFile, backupPath);
    }
    let namesForPrune = shouldBackup
      ? (await fsImplementation.readdir(configBackupDir))
          .map((entry) => entry.name)
          .filter((name) => name.startsWith(`${configFileName}.backup.`))
          .sort()
          .reverse()
      : backupNames;
    for (let nameToPrune of namesForPrune.slice(MAX_CONFIG_BACKUPS))
      try {
        await fsImplementation.unlink(join(configBackupDir, nameToPrune));
      } catch {}
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      logForDebugging(`Failed to backup config: ${error}`, {
        level: "error",
      });
  }
}
//@ chunk-exfmq47h.js:105528-105643 layout
async function getGlobalConfigFileMode(backend) {
  let statResult = await backend.statMeta(STORAGE_SPACES.globalConfig());
  return statResult.ok && statResult.value.mode !== undefined ? statResult.value.mode : 384;
}
//@ chunk-exfmq47h.js:105643-106058 layout
/**
 * 经存储层备份全局配置，按最小间隔控制备份频率。
 */
async function backupGlobalConfigViaStorage(backend, replaced, repairingFromCache) {
  let backupList = await listGlobalConfigBackups(backend);
  if (!backupList.ok) return backupList.error;
  let stamps = backupList.value;
  let last = stamps.sort().at(-1);
  let latestStamp = last ? Number(last) : 0;
  if (
    (Number.isNaN(latestStamp) || Date.now() - latestStamp >= CONFIG_BACKUP_MIN_INTERVAL_MS) &&
    !repairingFromCache
  ) {
    if (replaced === undefined) return;
    let stamp = String(Date.now());
    let writeResult = await backend.write(STORAGE_SPACES.globalConfigCopy("backup", stamp), replaced, {
      exactMode: await getGlobalConfigFileMode(backend),
    });
    if (!writeResult.ok) return formatStorageError(writeResult.error);
    stamps.push(stamp);
  }
  for (let stampToPrune of stamps.sort().reverse().slice(MAX_CONFIG_BACKUPS))
    await backend.delete(STORAGE_SPACES.globalConfigCopy("backup", stampToPrune));
  return;
}
//@ chunk-exfmq47h.js:106058-106465 layout
/**
 * 列出存储层中全局配置的各个副本键。
 */
async function listGlobalConfigCopies(backend, kind, skipKeyStats) {
  let copies = [];
  let allPages = await readAllPages(
    (cursor) =>
      backend.listEntries(
        {
          namespace: "globalConfig",
          kind,
        },
        {
          cursor,
          skipKeyStats,
        },
      ),
    (entries) => {
      for (let entry of entries)
        if (
          entry.kind === "key" &&
          entry.key.namespace === "globalConfig" &&
          "kind" in entry.key &&
          entry.key.kind === kind
        )
          copies.push({
            stamp: entry.key.stamp,
            size: entry.size,
          });
    },
  );
  switch (allPages.status) {
    case "done":
      return ok_2(copies);
    case "error":
      return err(formatStorageError(allPages.error));
    case "capped":
      return err(`more than ${DEFAULT_MAX_PAGES} pages of copies`);
  }
}
//@ chunk-exfmq47h.js:106465-106560 layout
async function listGlobalConfigBackups(backend) {
  let copyList = await listGlobalConfigCopies(backend, "backup", true);
  return copyList.ok ? ok_2(copyList.value.map((copy) => copy.stamp)) : copyList;
}
//@ chunk-exfmq47h.js:106560-110293 fingerprint (2.1.88 match: saveConfigWithLock, 0.443)
/**
 * 对 ~/.claude.json 加 .lock 文件锁后读-改-写；锁等待过长记日志，锁被抢占时报 compromised；写前按间隔备份到 ~/.claude/backups。
 */
async function saveConfigWithLock(updater, baseConfig, options, lockStore) {
  let defaultConfig = getConfigState();
  if (isStorageV5Enabled() && lockStore !== undefined)
    return saveConfigWithLockViaStorage(lockStore, updater, baseConfig);
  let globalClaudeFile = getGlobalClaudeFile();
  let defaultGlobalConfig = createDefaultGlobalConfig();
  let dir = dirname(globalClaudeFile);
  let fs = getFsImplementation();
  let release;
  let sparedByLockOnly = false;
  try {
    await fs.mkdir(dir);
    let lockFilePath = `${globalClaudeFile}.lock`;
    let startTime = Date.now();
    for (let idx = 0; ; idx++)
      try {
        release = await lock(globalClaudeFile, {
          lockfilePath: lockFilePath,
          realpath: options?.lockOnlyCaller === undefined,
          onCompromised: (err) => {
            sparedByLockOnly = true;
            options?.onCompromised?.();
            logForDebugging(`Config lock compromised: ${err}`, {
              level: "error",
            });
          },
        });
        break;
      } catch (error) {
        let lockRetrySignal = options?.lockRetrySignal;
        let lastRetryIndex = CONFIG_LOCK_RETRY_DELAYS_MS.length - 1;
        let isLockOnlyCaller =
          options?.lockOnlyCaller !== undefined &&
          Date.now() - startTime < (env.CLAUDE_CODE_CONFIG_LOCK_WAIT_MS ?? 0);
        if (
          !isLockContentionError(error) ||
          (idx > lastRetryIndex && !isLockOnlyCaller) ||
          lockRetrySignal?.aborted
        )
          throw error;
        await sleep(
          CONFIG_LOCK_RETRY_DELAYS_MS[Math.min(idx, lastRetryIndex)] * (1 + Math.random()),
          lockRetrySignal,
        );
      }
    let elapsedMs = Date.now() - startTime;
    if (elapsedMs > 100) {
      logForDebugging("Lock acquisition took longer than expected - another Claude instance may be running");
      logEvent("tengu_config_lock_contention", {
        lock_time_ms: elapsedMs,
      });
    }
    if (defaultConfig.lastReadFileStats)
      try {
        let stats = await fs.stat(globalClaudeFile);
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
    let globalConfigWithRetry = await readGlobalConfigWithRetry();
    let readFoundNoFile = defaultConfig.lastGetConfigOutcome === "enoent";
    defaultConfig.queuedReadFoundNoFile = readFoundNoFile;
    let createOnly = readFoundNoFile && !(await isConfigBehindSymlinkChain(globalClaudeFile));
    let skipAuthGuard = options?.lockOnlyCaller !== undefined && createOnly;
    if (
      options?.lockOnlyCaller !== undefined &&
      (defaultConfig.lastGetConfigOutcome === "read-error" ||
        defaultConfig.lastGetConfigOutcome === "parse-error" ||
        (readFoundNoFile && !skipAuthGuard && wouldLoseAuthState(globalConfigWithRetry)))
    ) {
      logForDebugging(
        "saveConfigWithLock: a lock-only save could not read the file under the lock; writing nothing.",
        {
          level: "error",
        },
      );
      defaultConfig.doubtsNoFile ||= readFoundNoFile;
      return false;
    }
    let repairingFromCache = false;
    let wouldLoseAuth = false;
    let config = defaultConfig.cache.config;
    let workingConfig = baseConfig ?? config;
    if (defaultConfig.lastGetConfigOutcome === "parse-error" && workingConfig) {
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
        ...workingConfig,
      };
      repairingFromCache = true;
    } else if (wouldLoseAuthState(globalConfigWithRetry)) wouldLoseAuth = true;
    let code = updater(globalConfigWithRetry);
    if (code === globalConfigWithRetry && !repairingFromCache) return false;
    if (
      wouldLoseAuth &&
      !skipAuthGuard &&
      (wouldLoseAuthState(code) || defaultConfig.lastGetConfigOutcome === "read-error")
    ) {
      let pendingCount = defaultConfig.pendingWriteCount();
      if (
        pendingCount > 1 &&
        (defaultConfig.lastGetConfigOutcome === "parsed" || defaultConfig.lastGetConfigOutcome === "enoent")
      )
        logForDebugging(
          "saveConfigWithLock: merge base is missing auth the cache has; an in-process write queued behind this one carries it and will land it under its own lock. Proceeding on the under-lock read. See GH #3117 / gh-73364.",
        );
      else if (pendingCount > 1) {
        let cachedConfig = baseConfig ?? defaultConfig.cache.config;
        if (!cachedConfig) {
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
          ...cachedConfig,
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
        defaultConfig.doubtsNoFile = true;
        return false;
      }
    }
    let currentConfig = pickByHelper(
      code,
      (value, key) => jsonStringify(value) !== jsonStringify(defaultGlobalConfig[key]),
    );
    await backupGlobalConfig(repairingFromCache);
    try {
      await readJsonFile_2(globalClaudeFile, jsonStringify(currentConfig, null, 2), {
        encoding: "utf-8",
        mode: 384,
        allowSymlink: true,
        createOnly,
        beforeRename: () => {
          if (sparedByLockOnly && options?.lockOnlyCaller !== undefined)
            throw Error("Lost the config lock before renaming");
        },
      });
    } catch (error) {
      if (!createOnly || getErrnoCode(error) !== "EEXIST") throw error;
      defaultConfig.configCreateRefused = true;
      return false;
    }
    return true;
  } catch (mkdirErr) {
    if (
      options?.lockOnlyCaller === undefined ||
      (release === undefined && IGNORABLE_LOCK_ONLY_ERRNOS.has(getErrnoCode(mkdirErr) ?? ""))
    )
      throw mkdirErr;
    logForDebugging(`A lock-only config save wrote nothing: ${mkdirErr}`, {
      level: "error",
    });
    if (isLockContentionError(mkdirErr)) logConfigFallbackSkippedContention(options.lockOnlyCaller);
    return false;
  } finally {
    if (release)
      try {
        await release();
      } catch (error) {
        let code = getErrnoCode(error);
        if (code === "ERELEASED" || code === "ENOTACQUIRED" || code === "ECOMPROMISED")
          options?.onCompromised?.();
        logForDebugging(`Config lock release failed: ${error}`, {
          level: "error",
        });
      }
  }
}
//@ chunk-exfmq47h.js:110293-110994 layout
async function backupCorruptedConfig(backend, corrupt) {
  let prefix = `${basename(getGlobalClaudeFile())}.corrupted.`;
  let copies = await listGlobalConfigCopies(backend, "corrupted", false);
  if (!copies.ok) {
    logForDebugging(`Could not back up corrupted config (${copies.error}); continuing.`, {
      level: "error",
    });
    return;
  }
  for (let { stamp, size } of copies.value) {
    if (size !== undefined && size !== corrupt.bytes.byteLength) continue;
    let text = await backend.readText([STORAGE_SPACES.globalConfigCopy("corrupted", stamp)]);
    let item = text.ok ? text.value.items[0] : undefined;
    if (item?.found && item.value === corrupt.text) {
      process.stderr.write(CONFIG_ALREADY_BACKED_UP_TEXT);
      return;
    }
  }
  let stamp = String(Date.now());
  let writeResult = await backend.write(STORAGE_SPACES.globalConfigCopy("corrupted", stamp), corrupt.bytes, {
    exactMode: await getGlobalConfigFileMode(backend),
  });
  if (writeResult.ok) {
    let backupPath = join(getConfigBackupDir(), prefix + stamp);
    logForDebugging(configBackedUpLog(backupPath), {
      level: "error",
    });
    process.stderr.write(configBackedUpStderr(backupPath));
  } else
    logForDebugging(
      `Could not back up corrupted config (${formatStorageError(writeResult.error)}); continuing.`,
      {
        level: "error",
      },
    );
}
//@ chunk-exfmq47h.js:110994-111957 layout
async function handleCorruptedConfig(configBackend, corrupt, silent = false) {
  let configState = getConfigState();
  try {
    if (!silent && (await isConfigEmptyAndBackupless(corrupt.text, configBackend))) return;
    let globalClaudeFile = getGlobalClaudeFile();
    logForDebugging(configCorruptedLog(corrupt.message), {
      level: "error",
    });
    process.stderr.write(formatConfigCorruptedMessage(globalClaudeFile, corrupt.message));
    await backupCorruptedConfig(configBackend, corrupt).catch((error) =>
      logForDebugging(`Could not back up corrupted config (${error}); continuing.`, {
        level: "error",
      }),
    );
    let mostRecentBackup = await findMostRecentBackup(configBackend);
    if (mostRecentBackup)
      process.stderr.write(
        backupRestoreHint(globalClaudeFile, mostRecentBackup) +
          `
`,
      );
    else
      process.stderr.write(`
`);
    if (silent) {
      configState.setStartupParseErrorBackupPath(mostRecentBackup);
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
          corrupt.text.length,
          mostRecentBackup != null,
        );
      return;
    }
    if (!configState.insideParseErrorTelemetry && configState.claimParseErrorLog()) {
      configState.setInsideParseErrorTelemetry(true);
      try {
        let config = configState.cache.config;
        logEvent("tengu_config_parse_error", {
          file_size: corrupt.text.length,
          had_cached_auth: config?.oauthAccount !== undefined || config?.hasCompletedOnboarding === true,
          has_timestamped_backup: mostRecentBackup != null,
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
//@ chunk-exfmq47h.js:111957-112037 layout
/**
 * 处理损坏的配置文件并做备份。
 */
async function handleCorruptedConfigAndBackup(configBackend, corrupt, repairingFromCache) {
  await handleCorruptedConfig(configBackend, corrupt);
  await backupGlobalConfig(repairingFromCache, {
    backend: configBackend,
    replaced: corrupt.bytes,
  });
}
//@ chunk-exfmq47h.js:112037-112046 layout
/**
 * 损坏配置的修复重试次数（3）。
 */
var MAX_CONFIG_REPAIR_ATTEMPTS = 3;
//@ chunk-exfmq47h.js:112046-115294 layout
/**
 * 存储 v5 下的 saveConfigWithLock：在存储后端原子 update 中读取 ~/.claude.json（记录读后被他人改写的遥测），解析失败时用缓存配置自动修复，会丢失登录态时拒绝写入，应用变更并写回；之后按需备份。
 */
async function saveConfigWithLockViaStorage(lockStore, updater, baseConfig) {
  let configState = getConfigState();
  let defaultGlobalConfig = createDefaultGlobalConfig();
  let now = Date.now();
  let expectedVersion;
  let attemptSave = (attempt) =>
    lockStore.update(
      STORAGE_SPACES.globalConfig(),
      (current) => {
        let afterHooks = [];
        let text = current === undefined ? undefined : textDecoder.decode(current.value);
        if (configState.lastReadFileStats && current !== undefined) {
          let lastReadFileStats = configState.lastReadFileStats;
          let byteLength = current.value.byteLength;
          if (current.mtimeMs !== lastReadFileStats.mtime || byteLength !== lastReadFileStats.size)
            afterHooks.push(() =>
              logEvent("tengu_config_stale_write", {
                read_mtime: lastReadFileStats.mtime,
                write_mtime: current.mtimeMs,
                read_size: lastReadFileStats.size,
                write_size: byteLength,
              }),
            );
        }
        let nextConfig;
        let hadParseError = false;
        let message = "";
        if (text === undefined) nextConfig = createDefaultGlobalConfig();
        else
          try {
            nextConfig = {
              ...createDefaultGlobalConfig(),
              ...jsonParse(stripBom(text)),
            };
          } catch (error) {
            hadParseError = true;
            message = error instanceof Error ? error.message : String(error);
            nextConfig = createDefaultGlobalConfig();
          }
        afterHooks.push(() =>
          configState.setLastGetConfigOutcome(
            hadParseError ? "parse-error" : current === undefined ? "enoent" : "parsed",
          ),
        );
        let versionMatches = current !== undefined && current.version === expectedVersion;
        let corruptBytes =
          current !== undefined && !versionMatches ? new Uint8Array(current.value) : undefined;
        let corruptInfo =
          hadParseError && text !== undefined && corruptBytes !== undefined
            ? {
                text,
                bytes: corruptBytes,
                message,
              }
            : undefined;
        let usedCacheBase = false;
        let reReadLosesAuth = false;
        let config = configState.cache.config;
        let cacheConfig = baseConfig ?? config;
        if (hadParseError && cacheConfig) {
          let fileSizeBefore = current === undefined ? 0 : current.value.byteLength;
          afterHooks.push(() => {
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
          nextConfig = {
            ...cacheConfig,
          };
          usedCacheBase = true;
        } else if (wouldLoseAuthState(nextConfig)) reReadLosesAuth = true;
        let updatedConfig = updater(nextConfig);
        if (updatedConfig === nextConfig && !usedCacheBase)
          return {
            skip: true,
            result: {
              didWrite: false,
              after: afterHooks,
              corrupt: corruptInfo,
              ...(current === undefined && {
                missing: true,
              }),
            },
          };
        if (corruptInfo !== undefined && current !== undefined && attempt < MAX_CONFIG_REPAIR_ATTEMPTS - 1)
          return {
            skip: true,
            result: {
              didWrite: false,
              after: [],
              restart: {
                version: current.version,
                repairingFromCache: usedCacheBase,
                corrupt: corruptInfo,
              },
            },
          };
        if (reReadLosesAuth && wouldLoseAuthState(updatedConfig)) {
          let pendingCount = configState.pendingWriteCount();
          let cachedConfig = baseConfig ?? configState.cache.config;
          if (pendingCount > 1 && cachedConfig) {
            afterHooks.push(() =>
              logForDebugging(
                "saveConfigWithLock: merge base is missing auth the cache has, but an in-process write is queued behind this one; re-basing on the enqueue-time cache snapshot so the pending auth and this write both land. See GH #3117.",
              ),
            );
            nextConfig = {
              ...cachedConfig,
            };
            updatedConfig = updater(nextConfig);
          } else {
            afterHooks.push(() => {
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
                after: afterHooks,
                corrupt: corruptInfo,
                ...(current === undefined && {
                  missing: true,
                }),
              },
            };
          }
        }
        let changedConfig = pickByHelper(
          updatedConfig,
          (value, key) => jsonStringify(value) !== jsonStringify(defaultGlobalConfig[key]),
        );
        return {
          write: jsonStringify(changedConfig, null, 2),
          result: {
            didWrite: true,
            after: afterHooks,
            corrupt: corruptInfo,
            ...(current !== undefined && {
              backup: {
                replaced: corruptBytes,
                repairingFromCache: usedCacheBase,
              },
            }),
            ...(current === undefined && {
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
  let saveResult = await attemptSave(0);
  for (let idx = 1; saveResult.ok; idx++) {
    let restart = saveResult.value.result?.restart;
    if (restart === undefined) break;
    await handleCorruptedConfigAndBackup(lockStore, restart.corrupt, restart.repairingFromCache);
    expectedVersion = restart.version;
    saveResult = await attemptSave(idx);
  }
  let lockTimeMs = Date.now() - now;
  if (!saveResult.ok) {
    if (
      saveResult.error.code === "Unavailable" &&
      (saveResult.error.telemetryCode === "LockContended" || saveResult.error.telemetryCode === "LockSuspect")
    )
      logEvent("tengu_config_lock_contention", {
        lock_time_ms: lockTimeMs,
      });
    throw Error("Config update through storage failed", {
      cause: formatStorageError(saveResult.error),
    });
  }
  let result = saveResult.value.result;
  if (result === undefined) return false;
  if (result.missing)
    try {
      let backupStamp = await findMostRecentBackup(lockStore);
      if (backupStamp) process.stderr.write(formatConfigNotFoundMessage(getGlobalClaudeFile(), backupStamp));
    } catch (error) {
      logForDebugging(`Could not report the missing config file: ${error}`, {
        level: "error",
      });
    }
  if (result.corrupt !== undefined) await handleCorruptedConfig(lockStore, result.corrupt);
  let isNewFile = result.backup !== undefined && result.backup.replaced === undefined;
  if (result.didWrite && !isNewFile)
    await backupGlobalConfig(result.backup?.repairingFromCache ?? false, {
      backend: lockStore,
      replaced: result.backup?.replaced,
    });
  for (let afterHook of result.after)
    try {
      afterHook();
    } catch (error) {
      logForDebugging(`Config save after-effect failed: ${error}`, {
        level: "error",
      });
    }
  return result.didWrite;
}
//@ chunk-exfmq47h.js:115294-116394 layout
async function reloadGlobalConfigFromStorage(backend, keepExisting = false) {
  let configState = getConfigState();
  let readResult = await backend.read([STORAGE_SPACES.globalConfig()]).then(
    (result) => (result.ok ? result : formatStorageError(result.error)),
    (error) => String(error),
  );
  if (typeof readResult === "string") {
    let isDisklessNoOverride = isDiskless() && !keepExisting;
    logForDebugging(
      `Startup config read through storage failed; ${isDisklessNoOverride ? "using the defaults" : keepExisting ? "keeping the config already read" : "reading the file directly"}: ${readResult}`,
      {
        level: "warn",
      },
    );
    if (!isDisklessNoOverride) return null;
    configState.setLastGetConfigOutcome("enoent");
    return {
      config: createDefaultGlobalConfig(),
      stats: null,
      version: undefined,
    };
  }
  let item = readResult.value.items[0];
  if (!item?.found) {
    if (!keepExisting) configState.setLastGetConfigOutcome("enoent");
    let backupStamp = keepExisting ? null : await findMostRecentBackup(backend);
    if (backupStamp) process.stderr.write(formatConfigNotFoundMessage(getGlobalClaudeFile(), backupStamp));
    return {
      config: createDefaultGlobalConfig(),
      stats: null,
      version: undefined,
    };
  }
  let text = textDecoder.decode(item.value);
  let stats = {
    mtimeMs: item.mtimeMs,
    size: item.totalBytes,
  };
  if (!keepExisting && (await isConfigEmptyAndBackupless(text, backend))) {
    process.stderr.write(configEmptyNoBackupNotice(getGlobalClaudeFile()));
    configState.setLastGetConfigOutcome("enoent");
    return {
      config: createDefaultGlobalConfig(),
      stats,
      version: item.version,
    };
  }
  let parsed;
  try {
    parsed = jsonParse(stripBom(text));
  } catch (error) {
    let message = error instanceof Error ? error.message : String(error);
    if (!keepExisting) {
      configState.setLastGetConfigOutcome("parse-error");
      await handleCorruptedConfig(
        backend,
        {
          text,
          bytes: item.value,
          message,
        },
        true,
      );
    }
    throw new ConfigParseError(message, getGlobalClaudeFile(), createDefaultGlobalConfig());
  }
  if (!keepExisting) configState.setLastGetConfigOutcome("parsed");
  return {
    config: {
      ...createDefaultGlobalConfig(),
      ...parsed,
    },
    stats,
    version: item.version,
  };
}
//@ chunk-exfmq47h.js:116394-116557 layout
function attachGlobalConfigStorageBackend(backend) {
  let configState = getConfigState();
  configState.setFreshnessBackend(backend);
  subscribeGlobalConfigViaStorage(backend).then((subscription) => {
    if (configState.freshnessBackend !== backend) subscription?.unsubscribe();
    else if (subscription) configState.setFreshnessSubscription(subscription);
    else startGlobalConfigWatcher();
  });
}
//@ chunk-exfmq47h.js:116557-116696 facade-majority
/**
 * 启动时允许读取配置：读入 ~/.claude.json（损坏则备份并提示），装入缓存，此后 getGlobalConfig 才可用。
 */
function enableConfigs(backend, options) {
  let configState = getConfigState();
  let enablePromise = configState.enable(() => enableConfigs_2(backend, options));
  if (!isStorageV5Enabled() || backend === undefined) return enablePromise;
  return enablePromise.then(() =>
    configState.reloadThroughStorageOnce(() => reloadGlobalConfigViaStorage(backend)),
  );
}
//@ chunk-exfmq47h.js:116696-116886 layout
function reloadGlobalConfigViaStorage(backend) {
  let configState = getConfigState();
  return configState.writeQueues.run(EXTERNAL_REFRESH, async () => {
    let writeGeneration = configState.writeGeneration;
    let record = await reloadGlobalConfigFromStorage(backend, true).catch((error) => {
      if (error instanceof ConfigParseError) return "unparseable";
      throw error;
    });
    if (record !== null) installStorageConfigRead(backend, record, writeGeneration);
  });
}
//@ chunk-exfmq47h.js:116886-117704 layout
/**
 * 安装经存储层读取的配置：记录缺失或无法解析等情况并决定保留哪份。
 */
function installStorageConfigRead(backend, record, writeGeneration) {
  let configState = getConfigState();
  let note;
  if (record === "unparseable" || record.stats === null)
    note = `its record is ${record === "unparseable" ? "unparseable" : "missing"}, so the config read directly is kept`;
  else if (configState.loadedVersion !== undefined && configState.loadedVersion === record.version)
    note = "that version is already the in-memory config";
  else if (configState.pendingWriteCount() > 0) {
    configState.deferExternalRefresh("storage");
    note = "a config write is pending, so the record is left to the queue-drain replay";
  } else if (configState.writeGeneration !== writeGeneration)
    note = "a save landed while it was read, so the record is not installed over it";
  else {
    configState.installDiskRead(migrateConfigFields(record.config), record.stats);
    configState.setLoadedVersion(record.version);
    note = "its record is now the in-memory config";
  }
  logForDebugging(
    `Re-read ~/.claude.json through the storage interface after the direct start-up read: ${note}`,
  );
  if (configState.freshnessBackend === undefined) {
    if (configState.freshnessWatcherStarted) stopGlobalConfigFreshnessWatcher(configState);
    attachGlobalConfigStorageBackend(backend);
  }
}
//@ chunk-exfmq47h.js:117704-118570 fingerprint (2.1.88 match: enableConfigs, 0.435)
async function enableConfigs_2(backend, options) {
  let configState = getConfigState();
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "enable_configs_started");
  if (backend !== undefined && options?.fileWatchFallback === false) configState.setFileWatchFallback(false);
  if (isStorageV5Enabled() && backend !== undefined && options?.writersWithoutBackend === "memory")
    configState.setUnhandedWritesInMemory(true);
  configState.allowReading();
  try {
    let diskRecord =
      isStorageV5Enabled() && backend !== undefined ? await reloadGlobalConfigFromStorage(backend) : null;
    if (diskRecord && backend !== undefined) {
      let migratedConfig = migrateConfigFields(diskRecord.config);
      configState.installDiskRead(migratedConfig, diskRecord.stats);
      configState.setLoadedVersion(diskRecord.version);
      attachGlobalConfigStorageBackend(backend);
    } else if (isDiskless())
      throw Error(
        "A diskless session can only load its config through a storage backend (none was handed in, or CLAUDE_CODE_HOVER_REST is off)",
      );
    else {
      let globalClaudeFile = getGlobalClaudeFile();
      let stats = null;
      try {
        stats = await getFsImplementation().stat(globalClaudeFile);
      } catch {}
      let directConfig = migrateConfigFields(await readGlobalConfigWithRetry(true));
      configState.installDiskRead(directConfig, stats);
      if (backend !== undefined && isConfigFileWatchDisabled()) attachGlobalConfigStorageBackend(backend);
      else startGlobalConfigFreshnessWatcher();
      if (backend === undefined) configState.oweReloadThroughStorage();
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
//@ chunk-exfmq47h.js:118570-118610 fingerprint (2.1.88 match: getConfigBackupDir, 1)
function getConfigBackupDir() {
  return join(getClaudeConfigDir(), "backups");
}
//@ chunk-exfmq47h.js:118610-118690 layout
function formatConfigCorruptedMessage(globalClaudeFile, message) {
  return `
Claude configuration file at ${globalClaudeFile} is corrupted: ${message}
`;
}
//@ chunk-exfmq47h.js:118690-118741 layout
/**
 * “配置文件损坏”的日志文本。
 */
function configCorruptedLog(message) {
  return `Config file corrupted: ${message}`;
}
//@ chunk-exfmq47h.js:118741-118800 layout
/**
 * “损坏配置已备份到”的日志文本。
 */
function configBackedUpLog(backupPath) {
  return `Corrupted config backed up to: ${backupPath}`;
}
//@ chunk-exfmq47h.js:118800-118871 layout
/**
 * 向 stderr 输出的“损坏文件已备份”提示。
 */
function configBackedUpStderr(backupPath) {
  return `The corrupted file has been backed up to: ${backupPath}
`;
}
//@ chunk-exfmq47h.js:118871-118928 layout
/**
 * 向 stderr 输出的“损坏文件已备份过”提示。
 */
var CONFIG_ALREADY_BACKED_UP_TEXT = `The corrupted file has already been backed up.
`;
//@ chunk-exfmq47h.js:118928-119044 layout
function backupRestoreHint(globalClaudeFile, backupPath) {
  return `A backup file exists at: ${backupPath}
You can manually restore it by running: cp -f "${backupPath}" "${globalClaudeFile}"
`;
}
//@ chunk-exfmq47h.js:119044-119400 facade-majority
function leaveUnparseableGlobalConfigAlone() {
  if (isTestConfigMode())
    return {
      advice: "",
      advicePrinted: true,
    };
  let configState = getConfigState();
  configState.leaveUnparseableFileAlone();
  let globalClaudeFile = getGlobalClaudeFile();
  let startupParseErrorBackupPath = configState.startupParseErrorBackupPath;
  if (startupParseErrorBackupPath != null)
    return {
      advice: backupRestoreHint(globalClaudeFile, startupParseErrorBackupPath),
      advicePrinted: true,
    };
  return {
    advice:
      (startupParseErrorBackupPath === null
        ? `No backup of this file was found.
`
        : "") +
      `Fix the JSON in ${globalClaudeFile}, or move the file aside to start with default settings.
`,
    advicePrinted: false,
  };
}
//@ chunk-exfmq47h.js:119400-119522 layout
function configEmptyNoBackupNotice(globalClaudeFile) {
  return `Claude configuration file at ${globalClaudeFile} was empty and no backup holds anything: starting with defaults.
`;
}
//@ chunk-exfmq47h.js:119522-119606 layout
function formatConfigNotFoundMessage(globalClaudeFile, backupStamp) {
  return (
    `
Claude configuration file not found at: ${globalClaudeFile}
` +
    backupRestoreHint(globalClaudeFile, backupStamp) +
    `
`
  );
}
//@ chunk-exfmq47h.js:119606-119647 layout
var BACKUP_STAMP_RE = /^\d+$/;
var BLANK_TEXT_RE = /^[\s\0]*$/;
var MAX_CONFIG_BYTES = 8388608;
//@ chunk-exfmq47h.js:119647-119799 layout (2.1.88 match: readAndUnzipFile, 0.752)
async function readAndUnzipFile(filePath) {
  let fs = getFsImplementation();
  try {
    return (await fs.stat(filePath)).isFile()
      ? (await fs.readFileBytes(filePath, MAX_CONFIG_BYTES)).toString("utf8")
      : "";
  } catch (error) {
    return isPathAbsent(error) ? "" : undefined;
  }
}
//@ chunk-exfmq47h.js:119799-119871 layout
var IMPORTANT_CONFIG_FIELDS = ["numStartups", "hasCompletedOnboarding", "mcpServers", "projects"];
//@ chunk-exfmq47h.js:119871-120270 layout
async function findUsefulBackup(backupPaths, readAndUnzipFile, skipEmpty = false) {
  let latestNonEmpty;
  let latestParsed;
  let latestNonEmptyPath;
  for (let backupPath of backupPaths.toReversed()) {
    let text = await readAndUnzipFile(backupPath);
    if (text !== undefined && BLANK_TEXT_RE.test(text)) continue;
    if (text !== undefined && Buffer.byteLength(text) >= MAX_CONFIG_BYTES) return backupPath;
    let parsed = safeParseJSON(text, false);
    if (!isPlainObject(parsed)) {
      latestNonEmptyPath ??= backupPath;
      continue;
    }
    for (let field of IMPORTANT_CONFIG_FIELDS) {
      let value = parsed[field];
      if (typeof value === "object" && value !== null ? Object.keys(value).length > 0 : Boolean(value))
        return backupPath;
    }
    if ("oauthAccount" in parsed) latestNonEmpty ??= backupPath;
    if (Object.keys(parsed).length > 0) latestParsed ??= backupPath;
  }
  return skipEmpty ? undefined : (latestNonEmpty ?? latestParsed ?? latestNonEmptyPath);
}
//@ chunk-exfmq47h.js:120270-120928 facade-majority
async function renewGlobalConfigBackup(config) {
  let globalClaudeFile = getGlobalClaudeFile();
  let fsImplementation = getFsImplementation();
  let backupPrefix = `${basename(globalClaudeFile)}.backup.`;
  let configBackupDir = getConfigBackupDir();
  try {
    let entries = await fsImplementation.readdir(configBackupDir).catch((error) => {
      if (isPathAbsent(error)) return [];
      throw error;
    });
    let candidates = [];
    for (let entry of entries) {
      if (
        !entry.name.startsWith(backupPrefix) ||
        !BACKUP_STAMP_RE.test(entry.name.slice(backupPrefix.length))
      )
        continue;
      let backupPath = join(configBackupDir, entry.name);
      if (
        !entry.isFile() ||
        (await fsImplementation.stat(backupPath).then(
          (stats) => stats.mtime >= config,
          () => false,
        ))
      )
        candidates.push(backupPath);
    }
    if (await findUsefulBackup(candidates.sort(), readAndUnzipFile, true)) return;
    let fileBytes = await fsImplementation.readFileBytes(globalClaudeFile, MAX_CONFIG_BYTES);
    let str = fileBytes.toString("utf8");
    if (Buffer.byteLength(str) >= MAX_CONFIG_BYTES) return;
    if (!(await findUsefulBackup([globalClaudeFile], async () => str, true))) return;
    let stamp = Math.floor(Date.now() / CONFIG_BACKUP_MIN_INTERVAL_MS) * CONFIG_BACKUP_MIN_INTERVAL_MS;
    await fsImplementation.mkdir(configBackupDir);
    await filePath(join(configBackupDir, `${backupPrefix}${stamp}`), fileBytes, {
      mode: 384,
      flush: true,
    });
  } catch (error) {
    if (!isPathAbsent(error))
      logForDebugging(`Failed to renew config backup: ${error}`, {
        level: "error",
      });
  }
}
//@ chunk-exfmq47h.js:120928-121786 fingerprint (2.1.88 match: findMostRecentBackup, 0.533)
/**
 * 在备份目录中找最近的 .claude.json.backup.<ts>，用于提示恢复。
 */
async function findMostRecentBackup(file) {
  let fs = getGlobalClaudeFile();
  let fsImplementation = getFsImplementation();
  let backupPrefix = `${basename(fs)}.backup.`;
  let backupDir = getConfigBackupDir();
  let sawReadError = false;
  if (isStorageV5Enabled() && file !== undefined) {
    let backupList = await listGlobalConfigBackups(file).catch(() => {
      return;
    });
    let latestStamp = backupList?.ok
      ? await findUsefulBackup(
          backupList.value.filter((stamp) => BACKUP_STAMP_RE.test(stamp)).sort(),
          async (stamp) => {
            let read = await file
              .readText([
                {
                  key: STORAGE_SPACES.globalConfigCopy("backup", stamp),
                  offset: 0,
                  length: MAX_CONFIG_BYTES,
                },
              ])
              .catch(() => {
                return;
              });
            let item = read?.ok ? read.value.items[0] : undefined;
            return item?.found === false ? "" : item?.value;
          },
        )
      : undefined;
    if (latestStamp) return join(backupDir, backupPrefix + latestStamp);
    sawReadError = !backupList?.ok;
  } else if (!isDiskless())
    try {
      let mapped = (await fsImplementation.readdir(backupDir))
        .map((entry) => entry.name)
        .filter(
          (name) => name.startsWith(backupPrefix) && BACKUP_STAMP_RE.test(name.slice(backupPrefix.length)),
        )
        .sort()
        .map((name) => join(backupDir, name));
      let latest = await findUsefulBackup(mapped, readAndUnzipFile);
      if (latest) return latest;
    } catch (error) {
      sawReadError = !isPathAbsent(error);
    }
  if (isDiskless()) return sawReadError ? undefined : null;
  let fileDir = dirname(fs);
  try {
    let mapped = (await fsImplementation.readdir(fileDir))
      .map((entry) => entry.name)
      .filter(
        (name) => name.startsWith(backupPrefix) && BACKUP_STAMP_RE.test(name.slice(backupPrefix.length)),
      )
      .sort()
      .map((name) => join(fileDir, name));
    let latest = await findUsefulBackup([`${fs}.backup`, ...mapped], readAndUnzipFile);
    if (latest) return latest;
  } catch (error) {
    sawReadError ||= !isPathAbsent(error);
  }
  return sawReadError ? undefined : null;
}
//@ chunk-exfmq47h.js:121786-121847 layout
async function isConfigEmptyAndBackupless(text, configDir) {
  return BLANK_TEXT_RE.test(text) && (await findMostRecentBackup(configDir)) === null;
}
//@ chunk-exfmq47h.js:121847-124250 callgraph-witnessed (2.1.88 match: getConfig, 0.191)
async function getConfigWithOutcome(storageV5) {
  let fs = getConfigState();
  if (!fs.readingAllowed) throw Error("Config accessed before allowed.");
  let globalClaudeFile = getGlobalClaudeFile();
  let fsImplementation = getFsImplementation();
  try {
    let text;
    try {
      text = await fsImplementation.readFile(globalClaudeFile, {
        encoding: "utf-8",
      });
    } catch (error) {
      if (!storageV5 || !isENOENT(error) || !fs.claimSecondLookForMissingFile()) throw error;
      logForDebugging("Config file read as missing at start-up: looking again.");
      await fsImplementation.readdir(dirname(globalClaudeFile)).catch(() => {});
      text = await fsImplementation.readFile(globalClaudeFile, {
        encoding: "utf-8",
      });
      logForDebugging("Config file found on the second read.");
      setImmediate(() => {
        try {
          logFeatureSad("config_missing_read", "found_on_second_look");
        } catch (error) {
          logForDebugging(`Could not count a second look: ${error}`, {
            level: "error",
          });
        }
      });
    }
    if (await isConfigEmptyAndBackupless(text)) {
      fs.setLastGetConfigOutcome(storageV5 ? "enoent" : "parse-error");
      if (storageV5) process.stderr.write(configEmptyNoBackupNotice(globalClaudeFile));
      return createDefaultGlobalConfig();
    }
    try {
      let parsedConfig = jsonParse(stripBom(text));
      fs.setLastGetConfigOutcome("parsed");
      return {
        ...createDefaultGlobalConfig(),
        ...parsedConfig,
      };
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      throw new ConfigParseError(errorMessage, globalClaudeFile, createDefaultGlobalConfig());
    }
  } catch (error) {
    let errCode = getErrnoCode(error);
    fs.setLastGetConfigOutcome(
      error instanceof ConfigParseError ? "parse-error" : errCode === "ENOENT" ? "enoent" : "read-error",
    );
    if (errCode === "ENOENT") {
      let backupStamp = await findMostRecentBackup();
      fs.setLastGetConfigOutcome("enoent");
      if (backupStamp && !fs.createRefusedThisProcess)
        process.stderr.write(formatConfigNotFoundMessage(globalClaudeFile, backupStamp));
      return createDefaultGlobalConfig();
    }
    if (error instanceof ConfigParseError) {
      logForDebugging(configCorruptedLog(error.message), {
        level: "error",
      });
      process.stderr.write(formatConfigCorruptedMessage(globalClaudeFile, error.message));
      let fileSize = 0;
      try {
        if (isDiskless()) throw Error("this process writes nothing to disk");
        let fileBase = basename(globalClaudeFile);
        let corruptedBackupDir = getConfigBackupDir();
        await fsImplementation.mkdir(corruptedBackupDir);
        let existingCorruptedBackups = (await fsImplementation.readdir(corruptedBackupDir))
          .map((entry) => entry.name)
          .filter((name) => name.startsWith(`${fileBase}.corrupted.`));
        let corruptedBackupPath;
        let alreadyBackedUp = false;
        let content = await fsImplementation.readFile(globalClaudeFile, {
          encoding: "utf-8",
        });
        fileSize = content.length;
        for (let backup of existingCorruptedBackups)
          try {
            let backupContent = await fsImplementation.readFile(join(corruptedBackupDir, backup), {
              encoding: "utf-8",
            });
            if (content === backupContent) {
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
          backupRestoreHint(globalClaudeFile, mostRecentBackup) +
            `
`,
        );
      else
        process.stderr.write(`
`);
      if (storageV5) {
        fs.setStartupParseErrorBackupPath(mostRecentBackup);
        if (fs.claimParseErrorLog())
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
            fileSize,
            mostRecentBackup != null,
          );
        throw error;
      }
      if (!fs.insideParseErrorTelemetry && fs.claimParseErrorLog()) {
        fs.setInsideParseErrorTelemetry(true);
        try {
          let config = fs.cache.config;
          logEvent("tengu_config_parse_error", {
            file_size: fileSize,
            had_cached_auth: config?.oauthAccount !== undefined || config?.hasCompletedOnboarding === true,
            has_timestamped_backup: mostRecentBackup != null,
          });
        } finally {
          fs.setInsideParseErrorTelemetry(false);
        }
      }
    }
    return createDefaultGlobalConfig();
  }
}
//@ chunk-exfmq47h.js:124250-124427 facade-majority
/**
 * 计算 projects 字典的键：原始 cwd 所在 git 根（无则 realpath），统一路径分隔符，进程内缓存。
 */
function getProjectPathForConfig() {
  let configState = getConfigState();
  if (configState.projectPathForConfig !== null && !hasNoProjectDir())
    return configState.projectPathForConfig;
  let originalCwd = getOriginalCwd();
  let storageRoot = storageRootFor(originalCwd);
  let projectKey = storageRoot
    ? normalizePathForConfigKey(storageRoot)
    : normalizePathForConfigKey(identity(resolve(originalCwd)));
  configState.setProjectPathForConfig(projectKey);
  return projectKey;
}
//@ chunk-exfmq47h.js:124427-124460 layout
function hasNoProjectDir() {
  return getOriginalCwdOrNull() === null;
}
//@ chunk-exfmq47h.js:124460-124510 facade-majority
function clearProjectPathForConfigCache() {
  getConfigState().setProjectPathForConfig(null);
}
//@ chunk-exfmq47h.js:124510-124567 facade-majority
function getRawCurrentProjectConfigEntry() {
  return hasNoProjectDir() ? undefined : getGlobalConfig().projects?.[getProjectPathForConfig()];
}
//@ chunk-exfmq47h.js:124567-124791 facade-majority (2.1.88 match: getCurrentProjectConfig, 0.468)
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
//@ chunk-exfmq47h.js:124791-124842 facade-majority
/**
 * 在全局配置的 projects[当前项目键] 上应用更新函数并加锁保存，失败回退与 saveGlobalConfig 相同的防丢认证逻辑。
 */
function saveCurrentProjectConfig(updater, storageV5) {
  return enqueueProjectConfigSave(updater, storageV5).then(() => {
    return;
  });
}
//@ chunk-exfmq47h.js:124842-124919 facade-majority
function saveCurrentProjectConfigDurably(updater, storageV5, projectPath) {
  return enqueueProjectConfigSave(updater, storageV5, projectPath?.writesOnlyUnderLock === true).catch(
    () => false,
  );
}
//@ chunk-exfmq47h.js:124919-125597 layout
function enqueueProjectConfigSave(updater, storageV5, lockOnly = false) {
  let configState = getConfigState();
  if (isTestConfigMode()) {
    let testResult = updater(configState.testProjectConfig);
    if (testResult === configState.testProjectConfig) return Promise.resolve(true);
    configState.overwriteTestProjectConfig(testResult);
    return Promise.resolve(true);
  }
  let projectPath = getProjectPathForConfig();
  let optimisticConfig = applyOptimisticConfigUpdate((current) => {
    let currentProjectConfig = current.projects?.[projectPath] ?? DEFAULT_PROJECT_CONFIG;
    let nextProjectConfig = updater(currentProjectConfig);
    if (nextProjectConfig === currentProjectConfig) return current;
    if (
      nextProjectConfig.lastGracefulShutdown === true &&
      (currentProjectConfig.lastGracefulShutdown !== true ||
        updater({
          ...currentProjectConfig,
          lastGracefulShutdown: false,
        }).lastGracefulShutdown === true)
    )
      configState.gracefulExitStampedProjects.add(projectPath);
    else if (
      nextProjectConfig.lastGracefulShutdown === false &&
      currentProjectConfig.lastGracefulShutdown !== false
    )
      configState.gracefulExitStampedProjects.delete(projectPath);
    return {
      ...current,
      projects: {
        ...current.projects,
        [projectPath]: nextProjectConfig,
      },
    };
  });
  if (isConfigWriteMemoryOnly(storageV5, "saveCurrentProjectConfig")) return Promise.resolve(false);
  return runQueuedConfigWrite(
    () => saveCurrentProjectConfig_2(updater, projectPath, optimisticConfig, storageV5, 0, lockOnly),
    () => isLowStakesProjectSave(optimisticConfig, projectPath, updater),
  );
}
//@ chunk-exfmq47h.js:125597-127382 fingerprint (2.1.88 match: saveCurrentProjectConfig, 0.408)
async function saveCurrentProjectConfig_2(
  updater,
  projectPath,
  baseConfig,
  storageV5,
  attempt,
  lockOnly = false,
) {
  let absolutePath = getConfigState();
  let written = null;
  let sawNoChange = false;
  let lockCompromised = false;
  try {
    let writeResult = await saveConfigWithLock(
      (current) => {
        let currentProjectConfig = current.projects?.[projectPath] ?? DEFAULT_PROJECT_CONFIG;
        let newProjectConfig = updater(currentProjectConfig);
        if (newProjectConfig === currentProjectConfig) {
          sawNoChange = true;
          return current;
        }
        written = stripRetiredConfigKeys({
          ...current,
          projects: {
            ...current.projects,
            [projectPath]: newProjectConfig,
          },
        });
        return written;
      },
      baseConfig,
      {
        onCompromised: () => (lockCompromised = true),
        lockOnlyCaller: lockOnly ? "save_project" : undefined,
      },
      storageV5,
    );
    if (writeResult && written) writeThroughConfigCache(written, lockOnly);
    return (writeResult || sawNoChange) && !lockCompromised;
  } catch (error) {
    logForDebugging(`Failed to save config with lock: ${error}`, {
      level: "error",
    });
    let configForFallbackWrite = await readConfigForFallbackWrite(baseConfig, storageV5);
    if (configForFallbackWrite.readRejected) {
      logConfigFallbackSuppressedUnreadable("save_project");
      return false;
    }
    let config = configForFallbackWrite.config;
    let retried = false;
    if (isLockContentionError(error) && !configForFallbackWrite.cacheDerived) {
      let currentProjectConfig = config.projects?.[projectPath] ?? DEFAULT_PROJECT_CONFIG;
      let newProjectConfig = updater(currentProjectConfig);
      if (newProjectConfig === currentProjectConfig) return true;
      if (
        (!absolutePath.fallbackReadFoundNoFile || isLowStakesProjectSave(baseConfig, projectPath, updater)) &&
        isLowStakesProjectConfigChange(currentProjectConfig, newProjectConfig)
      ) {
        let retryDelayMs = isOnlyCrashMarkerChange(currentProjectConfig, newProjectConfig)
          ? CONFIG_CRASH_MARKER_REENQUEUE_DELAYS_MS[attempt]
          : undefined;
        logConfigFallbackSkippedContention("save_project", retryDelayMs !== undefined);
        if (retryDelayMs !== undefined)
          sleep(retryDelayMs, undefined, {
            unref: true,
          })
            .then(() => {
              if (absolutePath.gracefulExitStampedProjects.has(projectPath)) return;
              let config = absolutePath.cache.config;
              return runQueuedConfigWrite(
                () => saveCurrentProjectConfig_2(updater, projectPath, config, storageV5, attempt + 1),
                () => true,
              );
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
      let pendingCount = absolutePath.pendingWriteCount();
      if (pendingCount > 1 && isLockContentionError(error))
        logForDebugging(
          "saveCurrentProjectConfig fallback under contention: proceeding on the base as-is (fresh disk on a clean read; the snapshot copy on a torn read); the write queued behind carries the pending auth. See GH #3117 / gh-73364.",
        );
      else if (pendingCount > 1 && baseConfig) {
        logForDebugging(
          "saveCurrentProjectConfig fallback: merge base is missing auth the cache has, but an in-process write is queued behind this one; re-basing on the enqueue-time cache snapshot. See GH #3117.",
        );
        config = {
          ...baseConfig,
        };
        retried = true;
      } else if (!absolutePath.fallbackReadFoundNoFile) {
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
    let currentProjectConfig = config.projects?.[projectPath] ?? DEFAULT_PROJECT_CONFIG;
    let newProjectConfig = updater(currentProjectConfig);
    if (newProjectConfig === currentProjectConfig) return true;
    written = stripRetiredConfigKeys({
      ...config,
      projects: {
        ...config.projects,
        [projectPath]: newProjectConfig,
      },
    });
    await saveConfig(
      written,
      "save_project",
      !configForFallbackWrite.cacheDerived &&
        !retried &&
        isLowStakesProjectConfigChange(currentProjectConfig, newProjectConfig),
      storageV5,
    );
    return false;
  }
}
//@ chunk-exfmq47h.js:127382-127917 facade-majority
function saveCurrentProjectConfigSyncForExit(updater) {
  let configState = getConfigState();
  if (isTestConfigMode()) {
    let testResult = updater(configState.testProjectConfig);
    if (testResult !== configState.testProjectConfig) configState.overwriteTestProjectConfig(testResult);
    return;
  }
  if ((isStorageV5Enabled() && configState.unhandedWritesInMemory) || isDiskless()) return;
  try {
    let globalClaudeFile = getGlobalClaudeFile();
    let projectPathForConfig = getProjectPathForConfig();
    let diskText = null;
    try {
      diskText = readFileSync(globalClaudeFile, {
        encoding: "utf-8",
      });
    } catch (error) {
      if (!isENOENT(error)) throw error;
      return;
    }
    let defaultGlobalConfig = createDefaultGlobalConfig();
    if (diskText !== null)
      defaultGlobalConfig = {
        ...defaultGlobalConfig,
        ...jsonParse(stripBom(diskText)),
      };
    let currentProjectConfig = defaultGlobalConfig.projects?.[projectPathForConfig] ?? DEFAULT_PROJECT_CONFIG;
    let nextProjectConfig = updater(currentProjectConfig);
    if (nextProjectConfig === currentProjectConfig) return;
    let strippedConfig = stripRetiredConfigKeys({
      ...defaultGlobalConfig,
      projects: {
        ...defaultGlobalConfig.projects,
        [projectPathForConfig]: nextProjectConfig,
      },
    });
    if (wouldLoseAuthState(strippedConfig)) return;
    let changedConfig = pickByHelper(
      strippedConfig,
      (value, key) => jsonStringify(value) !== jsonStringify(DEFAULT_GLOBAL_CONFIG[key]),
    );
    readJsonFile(globalClaudeFile, jsonStringify(changedConfig, null, 2), {
      encoding: "utf-8",
      mode: 384,
      allowSymlink: true,
    });
  } catch {}
}
//@ chunk-exfmq47h.js:127917-128422 facade-majority
function saveGlobalConfigSyncForExit(updater) {
  let configState = getConfigState();
  if (isTestConfigMode()) {
    let testResult = updater(configState.testGlobalConfig);
    if (testResult !== configState.testGlobalConfig) configState.overwriteTestGlobalConfig(testResult);
    return;
  }
  if ((isStorageV5Enabled() && configState.unhandedWritesInMemory) || isDiskless()) return;
  try {
    let globalClaudeFile = getGlobalClaudeFile();
    let diskText = null;
    try {
      diskText = readFileSync(globalClaudeFile, {
        encoding: "utf-8",
      });
    } catch (error) {
      if (!isENOENT(error)) throw error;
      return;
    }
    let defaultGlobalConfig = createDefaultGlobalConfig();
    if (diskText !== null)
      defaultGlobalConfig = {
        ...defaultGlobalConfig,
        ...jsonParse(stripBom(diskText)),
      };
    let nextConfig = updater(defaultGlobalConfig);
    if (nextConfig === defaultGlobalConfig) return;
    let strippedConfig = stripRetiredConfigKeys({
      ...nextConfig,
      projects: mergeProjectsForSave(defaultGlobalConfig.projects, nextConfig.projects),
    });
    if (wouldLoseAuthState(strippedConfig)) return;
    let changedConfig = pickByHelper(
      strippedConfig,
      (value, key) => jsonStringify(value) !== jsonStringify(DEFAULT_GLOBAL_CONFIG[key]),
    );
    readJsonFile(globalClaudeFile, jsonStringify(changedConfig, null, 2), {
      encoding: "utf-8",
      mode: 384,
      allowSymlink: true,
    });
  } catch {}
}
//@ chunk-exfmq47h.js:128422-128773 facade-majority
function deleteProjectConfig(projectPath, storageV5) {
  if (isTestConfigMode()) return Promise.resolve(true);
  let configState = getConfigState();
  if (isConfigWriteMemoryOnly(storageV5, "deleteProjectConfig")) {
    let hadOnDisk = configState.cache.config?.projects?.[projectPath] !== undefined;
    if (hadOnDisk)
      applyOptimisticConfigUpdate((config) => {
        let { [projectPath]: removedConfig, ...remainingProjects } = config.projects ?? {};
        return {
          ...config,
          projects: remainingProjects,
        };
      });
    return Promise.resolve(!hadOnDisk);
  }
  let config = configState.cache.config;
  return runQueuedConfigWrite(
    async () =>
      (await deleteProjectConfigLocked(projectPath, config, storageV5)) &&
      !(config?.projects?.[projectPath] !== undefined && configState.queuedReadFoundNoFile),
  );
}
//@ chunk-exfmq47h.js:128773-129722 layout
/**
 * 在配置锁内删除指定项目的配置记录，返回是否删除及错误。
 */
async function deleteProjectConfigLocked(projectPath, config, storageV5) {
  let configState = getConfigState();
  let baseConfig = null;
  let baseProjects = null;
  try {
    let writeResult = await saveConfigWithLock(
      (config) => {
        if (!config.projects?.[projectPath]) {
          baseProjects = false;
          return config;
        }
        baseProjects = true;
        let { [projectPath]: removedConfig, ...remainingProjects } = config.projects;
        baseConfig = stripRetiredConfigKeys({
          ...config,
          projects: remainingProjects,
        });
        return baseConfig;
      },
      config,
      undefined,
      storageV5,
    );
    if (writeResult && baseConfig) writeThroughConfigCache(baseConfig);
    return writeResult || baseProjects === false;
  } catch (error) {
    logForDebugging(`Failed to save config with lock: ${error}`, {
      level: "error",
    });
    if (isLockContentionError(error)) {
      logConfigFallbackSkippedContention("delete_project");
      return false;
    }
    let configForFallbackWrite = await readConfigForFallbackWrite(config, storageV5);
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
    let { [projectPath]: removedConfig, ...remainingProjects } = config_2.projects;
    baseConfig = stripRetiredConfigKeys({
      ...config_2,
      projects: remainingProjects,
    });
    return saveConfig(baseConfig, "delete_project", false, storageV5);
  }
}
//@ chunk-exfmq47h.js:129722-130424 facade-majority
function deleteCurrentProjectConfigFields(fields, store) {
  let configState = getConfigState();
  if (isTestConfigMode()) {
    configState.deleteTestProjectConfigFields(fields);
    return Promise.resolve(true);
  }
  if (isConfigWriteMemoryOnly(store, "deleteCurrentProjectConfigFields")) {
    let projectPathForConfig = getProjectPathForConfig();
    let cachedProject = configState.cache.config?.projects?.[projectPathForConfig];
    let hasField = cachedProject !== undefined && fields.some((field) => field in cachedProject);
    if (hasField)
      applyOptimisticConfigUpdate((config) => ({
        ...config,
        projects: {
          ...config.projects,
          [projectPathForConfig]: omitKeys(cachedProject, fields),
        },
      }));
    return Promise.resolve(!hasField);
  }
  let config = configState.cache.config;
  return runQueuedConfigWrite(async () => {
    let diskConfig = await deleteProjectFieldsLocked(fields, {
      projectPath: getProjectPathForConfig,
      saveWithLock: (current) => saveConfigWithLock(current, config, undefined, store),
      writeCache: writeThroughConfigCache,
      readConfigFallback: () => readConfigForFallbackWrite(config, store),
      wouldLoseAuth: wouldLoseAuthState,
      fallbackSave: (nextConfig) => saveConfig(nextConfig, "delete_project_fields", false, store),
      pendingWriteCount: () => configState.pendingWriteCount(),
      enqueueCacheSnapshot: config,
    });
    let projects = config?.projects?.[getProjectPathForConfig()];
    return (
      diskConfig &&
      !(
        projects !== undefined &&
        fields.some((field) => field in projects) &&
        configState.queuedReadFoundNoFile
      )
    );
  });
}
//@ chunk-exfmq47h.js:130424-130457 facade-majority
function _deleteCurrentProjectConfigFieldsForTesting(fields, store) {
  return deleteProjectFieldsLocked(fields, store);
}
//@ chunk-exfmq47h.js:130457-130523 layout
function omitKeys(object, keys) {
  let copy = {
    ...object,
  };
  for (let key of keys) delete copy[key];
  return copy;
}
//@ chunk-exfmq47h.js:130523-131781 layout
async function deleteProjectFieldsLocked(fields, store) {
  let omitFields = (projectConfig) => omitKeys(projectConfig, fields);
  let projectPath = store.projectPath();
  let configFallback = await store.readConfigFallback();
  let fallbackProject = configFallback.config.projects?.[projectPath];
  if (!configFallback.cacheDerived && (!fallbackProject || !fields.some((field) => field in fallbackProject)))
    return true;
  let nextConfig = null;
  let didChange = null;
  try {
    let saveOk = await store.saveWithLock((current) => {
      let projectConfig = current.projects?.[projectPath];
      if (!projectConfig || !fields.some((field) => field in projectConfig)) {
        didChange = false;
        return current;
      }
      didChange = true;
      nextConfig = stripRetiredConfigKeys({
        ...current,
        projects: {
          ...current.projects,
          [projectPath]: omitFields(projectConfig),
        },
      });
      return nextConfig;
    });
    if (saveOk && nextConfig) store.writeCache(nextConfig);
    return saveOk || didChange === false;
  } catch (error) {
    logForDebugging(`Failed to save config with lock: ${error}`, {
      level: "error",
    });
    if (isLockContentionError(error)) {
      logConfigFallbackSkippedContention("delete_project_fields");
      return false;
    }
    let configFallback = await store.readConfigFallback();
    if (configFallback.readRejected) {
      logConfigFallbackSuppressedUnreadable("delete_project_fields");
      return false;
    }
    let config = configFallback.config;
    if (store.wouldLoseAuth(config))
      if (store.pendingWriteCount() > 1 && store.enqueueCacheSnapshot) {
        logForDebugging(
          "deleteCurrentProjectConfigFields fallback: merge base is missing auth the cache has, but an in-process write is queued behind this one; re-basing on the enqueue-time cache snapshot. See GH #3117.",
        );
        config = {
          ...store.enqueueCacheSnapshot,
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
    let projectConfig = config.projects?.[projectPath];
    if (!projectConfig || !fields.some((field) => field in projectConfig)) return true;
    nextConfig = stripRetiredConfigKeys({
      ...config,
      projects: {
        ...config.projects,
        [projectPath]: omitFields(projectConfig),
      },
    });
    return store.fallbackSave(nextConfig);
  }
}
//@ chunk-exfmq47h.js:131781-131816 facade-majority
function isAutoUpdaterDisabled() {
  return getAutoUpdaterDisabledReason() !== null;
}
//@ chunk-exfmq47h.js:131816-132122 facade-majority (2.1.88 match: shouldSkipPluginAutoupdate, 0.253)
function shouldSkipPluginAutoupdate() {
  if (env.FORCE_AUTOUPDATE_PLUGINS) return false;
  if (!env.CLAUDE_CODE_AUTOUPDATER_DISABLED_BY_HOST) return isAutoUpdaterDisabled();
  let hostPinModule = require("./findSkipReasonUnderHostPin.lazy.js");
  if (getAutoUpdaterDisabledReason_2(false) !== null) return true;
  let skipReason = hostPinModule.findSkipReasonUnderHostPin(getGlobalConfig().env);
  if (skipReason !== null) logForDebugging(`Plugin autoupdate: off under the host's pin (${skipReason})`);
  return skipReason !== null;
}
//@ chunk-exfmq47h.js:132122-132268 facade-majority (2.1.88 match: formatAutoUpdaterDisabledReason, 0.807)
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
//@ chunk-exfmq47h.js:132268-132330 facade-majority
/**
 * 自动更新被禁用的原因：DISABLE_UPDATES、DISABLE_AUTOUPDATER、非必要流量关闭（隐私级别）、或配置 autoUpdates=false（native 安装且 autoUpdatesProtectedForNative 时除外）。
 */
function getAutoUpdaterDisabledReason() {
  return getAutoUpdaterDisabledReason_2(isEnvTruthy(process.env.DISABLE_AUTOUPDATER));
}
//@ chunk-exfmq47h.js:132330-132643 fingerprint (2.1.88 match: getAutoUpdaterDisabledReason, 0.736)
function getAutoUpdaterDisabledReason_2(env_2) {
  if (env.DISABLE_UPDATES)
    return {
      type: "env",
      envVar: "DISABLE_UPDATES",
    };
  if (env_2)
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
//@ chunk-exfmq47h.js:132643-132667 layout
var HEX64_ID_PATTERN = /^[0-9a-f]{64}$/;
//@ chunk-exfmq47h.js:132667-132975 facade-majority (2.1.88 match: getOrCreateUserID, 0.664)
/**
 * 读取或生成 userID（64 位 hex 随机串）并写回 ~/.claude.json；用于遥测 device_id 与 metadata.user_id。
 */
function getOrCreateUserID(globalConfig, generate) {
  let config = getConfigState();
  let globalConfig_2 = getGlobalConfig();
  if (typeof globalConfig_2.userID === "string" && HEX64_ID_PATTERN.test(globalConfig_2.userID))
    return globalConfig_2.userID;
  if (config.generatedUserID) return config.generatedUserID;
  let userID =
    generate !== undefined && HEX64_ID_PATTERN.test(generate) ? generate : randomBytes(32).toString("hex");
  config.setGeneratedUserID(userID);
  saveGlobalConfig(
    (current) =>
      typeof current.userID === "string" && HEX64_ID_PATTERN.test(current.userID)
        ? current
        : {
            ...current,
            userID,
          },
    globalConfig,
  );
  return userID;
}
//@ chunk-exfmq47h.js:132975-133284 facade-majority
/**
 * 读取或生成 machineID（64 位 hex）并写回全局配置。
 */
function getOrCreateMachineID(globalConfig) {
  let configState = getConfigState();
  let globalConfig_2 = getGlobalConfig();
  if (typeof globalConfig_2.machineID === "string" && HEX64_ID_PATTERN.test(globalConfig_2.machineID))
    return globalConfig_2.machineID;
  if (configState.generatedMachineID) return configState.generatedMachineID;
  let str = randomBytes(32).toString("hex");
  configState.setGeneratedMachineID(str);
  saveGlobalConfig(
    (config) =>
      typeof config.machineID === "string" && HEX64_ID_PATTERN.test(config.machineID)
        ? config
        : {
            ...config,
            machineID: str,
          },
    globalConfig,
  );
  return str;
}
//@ chunk-exfmq47h.js:133284-133331 facade-majority
async function seedInstallIDs(storageV5) {
  getOrCreateUserID(storageV5);
  getOrCreateMachineID(storageV5);
  await drainConfigWrites();
}
//@ chunk-exfmq47h.js:133331-133667 facade-majority
function getOrCreateSummonSidKey(globalConfig) {
  let configState = getConfigState();
  let globalConfig_2 = getGlobalConfig();
  if (typeof globalConfig_2.summonSidKey === "string" && HEX64_ID_PATTERN.test(globalConfig_2.summonSidKey))
    return globalConfig_2.summonSidKey;
  if (configState.generatedSummonSidKey) return configState.generatedSummonSidKey;
  let str = randomBytes(32).toString("hex");
  configState.setGeneratedSummonSidKey(str);
  saveGlobalConfig(
    (config) =>
      typeof config.summonSidKey === "string" && HEX64_ID_PATTERN.test(config.summonSidKey)
        ? config
        : {
            ...config,
            summonSidKey: str,
          },
    globalConfig,
  );
  return str;
}
//@ chunk-exfmq47h.js:133667-133739 layout
var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-exfmq47h.js:133739-133793 layout
/**
 * 判断字符串是否为合法的 UUID（远程控制机器 id）。
 */
function isValidMachineId(remoteControlMachineId) {
  return typeof remoteControlMachineId === "string" && UUID_PATTERN.test(remoteControlMachineId);
}
//@ chunk-exfmq47h.js:133793-133863 facade-majority
function getOrCreateRemoteControlMachineId(globalConfig) {
  return getConfigState().remoteControlMachineIdOnceFrom(() => ensureRemoteControlMachineId(globalConfig));
}
//@ chunk-exfmq47h.js:133863-134118 layout
/**
 * 获取或生成 Remote Control 的机器 id（UUID）并保存到全局配置；保存失败且未被其他进程写入时返回 null。
 */
async function ensureRemoteControlMachineId(storageV5) {
  let globalConfig = getGlobalConfig();
  if (isValidMachineId(globalConfig.remoteControlMachineId)) return globalConfig.remoteControlMachineId;
  let newId = randomUUID();
  let machineId = newId;
  return (await saveGlobalConfigQueued((config) => {
    machineId = isValidMachineId(config.remoteControlMachineId) ? config.remoteControlMachineId : machineId;
    return {
      ...config,
      remoteControlMachineId: machineId,
    };
  }, storageV5).catch(() => false)) || machineId !== newId
    ? machineId
    : null;
}
//@ chunk-exfmq47h.js:134118-134211 facade-majority (2.1.88 match: recordFirstStartTime, 1)
/**
 * 首次启动时写 firstStartTime 与 firstStartVersion。
 */
function recordFirstStartTime(globalConfig) {
  if (!getGlobalConfig().firstStartTime) {
    let firstStartTime = new Date().toISOString();
    saveGlobalConfig((current) => stampFirstStart(current, firstStartTime), globalConfig);
  }
}
//@ chunk-exfmq47h.js:134211-134793 facade-majority
function stampFirstStart(globalConfig, firstStartTime) {
  if (globalConfig.firstStartTime) return globalConfig;
  return {
    ...globalConfig,
    firstStartTime,
    firstStartVersion: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
  };
}
//@ chunk-exfmq47h.js:134793-135015 facade-majority (2.1.88 match: getMemoryPath, 1)
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
//@ chunk-exfmq47h.js:135015-135064 facade-majority (2.1.88 match: getManagedClaudeRulesDir, 1)
function getManagedClaudeRulesDir() {
  return join(getManagedFilePath(), ".claude", "rules");
}
//@ chunk-exfmq47h.js:135064-135103 facade-majority (2.1.88 match: getUserClaudeRulesDir, 1)
function getUserClaudeRulesDir() {
  return join(getClaudeConfigDir(), "rules");
}
//@ chunk-exfmq47h.js:135103-135177 facade-majority
var _getConfigForTesting = getConfigWithOutcome;
var _wouldLoseAuthStateForTesting = wouldLoseAuthState;
var _isFullDiskIgnorableGlobalWriteForTesting = isLowStakesGlobalChange;
var _saveConfigWithLockForTesting = saveConfigWithLock;
var _refreshGlobalConfigCacheFromExternalWriteForTesting = refreshGlobalConfigFromDisk;
var _refreshGlobalConfigCacheThroughStorageForTesting = checkGlobalConfigFreshness;
var _onGlobalConfigStorageEventForTesting = onGlobalConfigStorageEvent;
var _subscribeGlobalConfigFreshnessForTesting = subscribeGlobalConfigViaStorage;
var _loadGlobalConfigThroughStorageForTesting = reloadGlobalConfigFromStorage;
var _startGlobalConfigFreshnessThroughStorageForTesting = attachGlobalConfigStorageBackend;
//@ chunk-exfmq47h.js:135177-135221 facade-majority
function _getFreshnessBackendForTesting() {
  return getConfigState().freshnessBackend;
}
//@ chunk-exfmq47h.js:135221-135262 facade-majority
function _setLoadedVersionForTesting(version) {
  getConfigState().setLoadedVersion(version);
}
//@ chunk-exfmq47h.js:135262-135306 facade-majority
function _setFreshnessBackendForTesting(backend) {
  getConfigState().setFreshnessBackend(backend);
}
//@ chunk-exfmq47h.js:135306-135357 facade-majority
function _setFreshnessWatcherStartedForTesting(started) {
  getConfigState().setFreshnessWatcherStarted(started);
}
//@ chunk-exfmq47h.js:135357-135404 facade-majority
function _setFreshnessEventWatchForTesting(watch) {
  getConfigState().setFreshnessEventWatch(watch);
}
//@ chunk-exfmq47h.js:135404-135455 facade-majority
function _getFreshnessWatcherStartedForTesting() {
  return getConfigState().freshnessWatcherStarted;
}
//@ chunk-exfmq47h.js:135455-135500 facade-majority
function _setFileWatchFallbackForTesting(enabled) {
  getConfigState().setFileWatchFallback(enabled);
}
//@ chunk-exfmq47h.js:135500-135561 facade-majority
function _setWritersWithoutBackendForTesting(mode) {
  getConfigState().setUnhandedWritesInMemory(mode === "memory");
}
//@ chunk-exfmq47h.js:135561-135604 facade-majority
function _getConfigWriteGenerationForTesting() {
  return getConfigState().writeGeneration;
}
//@ chunk-exfmq47h.js:135604-135636 facade-majority
var _installGlobalConfigReloadedThroughStorageForTesting = installStorageConfigRead;
var _readGlobalConfigForFallbackForTesting = readConfigForFallbackWrite;
var _takeTimestampedConfigBackupForTesting = backupGlobalConfig;
var _findMostRecentBackupForTesting = findMostRecentBackup;
//@ chunk-exfmq47h.js:135636-135674 facade-majority
function _resetEnableConfigsForTesting() {
  getConfigState().resetEnableGate();
}
//@ chunk-exfmq47h.js:135674-135717 facade-majority
function _resetParseErrorDedupForTesting() {
  getConfigState().clearParseErrorDedup();
}
//@ chunk-exfmq47h.js:135717-135781 facade-majority
function _getLastGetConfigWasParseErrorForTesting() {
  return getConfigState().lastGetConfigOutcome === "parse-error";
}
//@ chunk-exfmq47h.js:135781-135852 facade-majority
function _setLastGetConfigWasParseErrorForTesting(value) {
  getConfigState().setLastGetConfigOutcome(value ? "parse-error" : "parsed");
}
//@ chunk-exfmq47h.js:135852-135921 facade-majority
var _saveGlobalConfigForTesting = saveGlobalConfig;
var _saveGlobalConfigDurablyForTesting = saveGlobalConfigDurably;
var _saveCurrentProjectConfigForTesting = saveCurrentProjectConfig;
var _saveCurrentProjectConfigDurablyForTesting = saveCurrentProjectConfigDurably;
var _getGlobalConfigForTesting = getGlobalConfig;
var _getCurrentProjectConfigForTesting = getCurrentProjectConfig;
var _getOrCreateMachineIDForTesting = getOrCreateMachineID;
var _getOrCreateUserIDForTesting = getOrCreateUserID;
var _removeProjectHistoryForTesting = shouldShowProjectOnboarding;
//@ chunk-exfmq47h.js:135921-135965 facade-majority
function _getTestGlobalConfigForTesting() {
  return getConfigState().testGlobalConfig;
}
//@ chunk-exfmq47h.js:135965-136114 facade-majority
function _setGlobalConfigCacheForTesting(config) {
  let configState = getConfigState();
  if (config) configState.applyOptimistic(config);
  else {
    configState.clearCache();
    configState.createRefusedThisProcess = false;
    configState.doubtsNoFile = false;
    configState.droppedSaveNoticeShown = false;
  }
}
//@ chunk-exfmq47h.js:136114-136159 facade-majority
function _setLastReadFileStatsForTesting(stats) {
  getConfigState().setLastReadFileStats(stats);
}
//@ chunk-exfmq47h.js:136159-136213 facade-majority
function _resetRemoteControlMachineIdForTesting() {
  getConfigState().clearRemoteControlMachineIdOnce();
}
//@ chunk-exfmq47h.js:136213-136259 facade-majority
function _resetGeneratedMachineIDForTesting() {
  getConfigState().clearGeneratedMachineID();
}
//@ chunk-exfmq47h.js:136259-136308 facade-majority
function _resetGeneratedSummonSidKeyForTesting() {
  getConfigState().clearGeneratedSummonSidKey();
}
//@ chunk-exfmq47h.js:136308-136360 facade-majority
function setClientDataCacheKeyGetter(getter) {
  getConfigState().setClientDataCacheKeyGetter(getter);
}
//@ chunk-exfmq47h.js:136360-136524 facade-majority
function seedClientDataForCurrentKey(data, { forContextWindow = false } = {}) {
  let configState = getConfigState();
  let cacheKey = configState.clientDataCacheKeyGetter?.();
  configState.setClientDataWindowSeed(
    cacheKey === undefined
      ? null
      : {
          key: cacheKey,
          data,
          forContextWindow,
        },
  );
}
//@ chunk-exfmq47h.js:136524-136630 facade-majority
function clearClientDataSeed(cacheKey) {
  let configState = getConfigState();
  if (cacheKey === undefined || configState.clientDataWindowSeed?.key === cacheKey)
    configState.setClientDataWindowSeed(null);
}
//@ chunk-exfmq47h.js:136630-136671 facade-majority
function getCachedClientData(cacheKey) {
  return getCachedClientDataSlot(cacheKey)?.data ?? null;
}
//@ chunk-exfmq47h.js:136671-136897 facade-majority
function getCachedClientDataSlot(cacheKey) {
  let configState = getConfigState();
  if (configState.clientDataReadGate && !configState.clientDataReadGate()) return null;
  let clientDataCacheSlot = readClientDataCacheSlot(configState, cacheKey);
  if (!configState.clientDataOverride) return clientDataCacheSlot;
  let slotData = clientDataCacheSlot?.data ?? null;
  let overridden = configState.clientDataOverride(slotData, cacheKey);
  return overridden === slotData
    ? clientDataCacheSlot
    : {
        data: overridden,
        model: clientDataCacheSlot?.model ?? cacheKey,
      };
}
//@ chunk-exfmq47h.js:136897-137009 facade-majority
function getFetchedClientData() {
  let configState = getConfigState();
  if (configState.clientDataReadGate && !configState.clientDataReadGate()) return null;
  return readClientDataCacheSlot(configState)?.data ?? null;
}
//@ chunk-exfmq47h.js:137009-137451 layout
/**
 * 读取客户端数据缓存槽中当前键对应的数据。
 */
function readClientDataCacheSlot(configState, cacheKey) {
  if (!configState.clientDataCacheKeyGetter) return null;
  let globalConfig = getGlobalConfig();
  let slotKey = configState.clientDataCacheKeyGetter(cacheKey);
  let clientDataCacheSlots = globalConfig.clientDataCacheSlots;
  if (clientDataCacheSlots != null && Object.hasOwn(clientDataCacheSlots, slotKey)) {
    let slot = clientDataCacheSlots[slotKey];
    return isTimestampedValue(slot)
      ? {
          data: slot.data ?? null,
          model: slot.model,
        }
      : null;
  }
  if (
    cacheKey !== undefined &&
    (slotKey === BI_KEY_UNAVAILABLE || slotKey !== configState.clientDataCacheKeyGetter())
  )
    return null;
  let clientDataWindowSeed = configState.clientDataWindowSeed;
  if (clientDataWindowSeed !== null && clientDataWindowSeed.key === slotKey)
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
//@ chunk-exfmq47h.js:137451-137497 facade-majority
function setClientDataReadGate(gate) {
  getConfigState().setClientDataReadGate(gate);
}
//@ chunk-exfmq47h.js:137497-137549 facade-majority
function setClientDataStrictReadGate(gate) {
  getConfigState().setClientDataStrictReadGate(gate);
}
//@ chunk-exfmq47h.js:137549-137595 facade-majority
function setClientDataOverride(override) {
  getConfigState().setClientDataOverride(override);
}
//@ chunk-exfmq47h.js:137595-137750 facade-majority
function readStrictClientData(globalConfig, clientDataStrictReadGate, clientDataCacheKeyGetter) {
  if (!clientDataStrictReadGate || !clientDataStrictReadGate()) return null;
  if (!clientDataCacheKeyGetter) return null;
  let cacheKey = clientDataCacheKeyGetter();
  let clientDataCacheSlots = globalConfig.clientDataCacheSlots;
  if (clientDataCacheSlots != null && Object.hasOwn(clientDataCacheSlots, cacheKey))
    return readTimestampedData(clientDataCacheSlots, cacheKey);
  return null;
}
//@ chunk-exfmq47h.js:137750-137847 facade-majority
function getCachedClientDataStrict() {
  let configState = getConfigState();
  return readStrictClientData(
    getGlobalConfig(),
    configState.clientDataStrictReadGate,
    configState.clientDataCacheKeyGetter,
  );
}
//@ chunk-exfmq47h.js:137847-137901 facade-majority
function setClientDataStaleMatchGetter(getter) {
  getConfigState().setClientDataStaleMatchGetter(getter);
}
//@ chunk-exfmq47h.js:137901-138054 facade-majority
function getCachedClientDataForContextWindow() {
  let configState = getConfigState();
  if (configState.clientDataReadGate && !configState.clientDataReadGate()) return null;
  let cachedClientDataForWindow = getCachedClientDataForWindow(configState);
  return configState.clientDataOverride
    ? configState.clientDataOverride(cachedClientDataForWindow)
    : cachedClientDataForWindow;
}
//@ chunk-exfmq47h.js:138054-138476 layout
/**
 * 读取当前窗口对应的客户端数据缓存。
 */
function getCachedClientDataForWindow(configState) {
  if (!configState.clientDataCacheKeyGetter) return null;
  let globalConfig = getGlobalConfig();
  let clientDataCacheSlots = globalConfig.clientDataCacheSlots;
  let cacheKey = configState.clientDataCacheKeyGetter();
  if (clientDataCacheSlots != null && Object.hasOwn(clientDataCacheSlots, cacheKey)) {
    let timestampedEntry = readTimestampedEntry(clientDataCacheSlots, cacheKey);
    if (timestampedEntry) return timestampedEntry.data;
  }
  let staleMatch = configState.clientDataStaleMatchGetter?.();
  if (staleMatch) {
    let matchingUsageSnapshot = findMatchingUsageSnapshot(clientDataCacheSlots, staleMatch);
    if (matchingUsageSnapshot) return matchingUsageSnapshot.data;
  }
  let clientDataWindowSeed = configState.clientDataWindowSeed;
  if (
    clientDataWindowSeed !== null &&
    clientDataWindowSeed.key === cacheKey &&
    clientDataWindowSeed.forContextWindow
  )
    return clientDataWindowSeed.data;
  let clientDataCache = globalConfig.clientDataCache;
  return typeof clientDataCache === "object" && clientDataCache !== null ? clientDataCache : null;
}
//@ chunk-exfmq47h.js:138476-138532 facade-majority
function clientDataSlotKey() {
  return getConfigState().clientDataCacheKeyGetter?.();
}
//@ chunk-exfmq47h.js:138532-138679 facade-majority
function hasClientDataCacheSlot() {
  let configState = getConfigState();
  if (!configState.clientDataCacheKeyGetter) return false;
  let clientDataCacheSlots = getGlobalConfig().clientDataCacheSlots;
  return readTimestampedEntry(clientDataCacheSlots, configState.clientDataCacheKeyGetter()) !== null;
}
//@ chunk-exfmq47h.js:138679-138692 placement
// deferred: uses getCachedClientData of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:138679", () => {
  registerJuniperShoalReader(() => getCachedClientData());
});
//@ chunk-exfmq47h.js:138692-138705 placement
// deferred: uses registerSteerClientData (./model/subagentSteer.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:138692", () => {
  registerSteerClientData(() => getCachedClientData());
});
//@ chunk-chhd9p2w.js:4897-4934 fingerprint (2.1.88 match: getUserClaudeRulesDir, 1)
function getUserClaudeRulesDir_2(config) {
  return arrayField(config, "rules");
}
//@ chunk-frs14hy1.js:168993-169232 fingerprint (2.1.88 match: removeProjectHistory, 0.393)
function removeProjectHistory(error, messages) {
  if (!(error instanceof AgentApiErrorTerminationError)) return null;
  if (!error.errorKind || !TRANSIENT_API_ERROR_KINDS.has(error.errorKind)) return null;
  let agentMessages = messages.filter(
    (message) => message.type !== "assistant" || !message.isApiErrorMessage,
  );
  if (extractAgentFinalText(agentMessages) === undefined) return null;
  return {
    history: agentMessages,
    cutoffNote: partialResultPreamble(error.message),
  };
}
export {
  getCachedClientData,
  resetLocalSettingsGitTrackedCache,
  getGlobalConfig,
  saveGlobalConfig,
  getOrCreateUserID,
  saveGlobalConfigDurably,
  checkHasTrustDialogAccepted,
  readFreshOauthAccountFromDisk,
  getExplicitRemoteControlAtStartup,
  getWorkspacePersistedTrustKey,
  isWorkspacePersistedTrusted,
  isLocalSettingsGitTracked,
  markConfigBootPhaseComplete,
  TRANSPORT_LABELS,
  GLOBAL_CONFIG_FIELD_KINDS,
  subscribeGlobalConfigInstalled,
  drainConfigWrites,
  getConfigSaveFullDiskCode,
  getPersistedTrustKeyForPath,
  isTrustKeyPersistedTrusted,
  DEFAULT_GLOBAL_CONFIG,
  resolveExplicitRemoteControlAtStartup,
  isAutoUpdaterDisabled,
  CONFIG_SOURCE_LABELS,
  getCachedClientDataStrict,
  workspacePersistedTrustThroughBackend,
  getUserClaudeRulesDir_2,
  isPathPersistedTrusted,
  renewGlobalConfigBackup,
  getCurrentProjectConfig,
  NOTIFICATION_CHANNELS,
  isProjectScopeTrustAccepted,
  hasClientDataCacheSlot,
  getCachedClientDataForContextWindow,
  getCustomApiKeyStatus,
  customApiKeyResponsesOf,
  removeProjectHistory,
  shouldSkipPluginAutoupdate,
  saveCurrentProjectConfig,
  saveCurrentProjectConfigSyncForExit,
  saveCurrentProjectConfigDurably,
  getProjectPathForConfig,
  readGlobalConfigFromDiskOrThrow,
  CONFIG_READ_RETRY_DELAYS_MS,
  getUserClaudeRulesDir,
  getMemoryPath,
  getManagedClaudeRulesDir,
  ignoresPersistedTrust,
  getFetchedClientData,
  IDE_KIND_LABELS,
  PERSISTED_TRUST_IGNORED,
  AUTO_CONNECT_LABELS,
  deleteProjectConfig,
  saveGlobalConfigSyncForExit,
  setClientDataCacheKeyGetter,
  setClientDataReadGate,
  setClientDataStrictReadGate,
  setClientDataOverride,
  setClientDataStaleMatchGetter,
  clearClientDataSeed,
  isLocalSettingsGitTrackedInIndex,
  DEFAULT_PROJECT_CONFIG,
  isPathTrusted,
  configMayStillHold,
  clearProjectPathForConfigCache,
  resetTrustDialogAcceptedCache,
  seedClientDataForCurrentKey,
  clientDataSlotKey,
  getOrCreateSummonSidKey,
  watchGlobalConfigThroughStorage,
  seedInstallIDs,
  enableConfigs,
  recordFirstStartTime,
  getOrCreateMachineID,
  leaveUnparseableGlobalConfigAlone,
  oauthAccountIn,
  setPathTrustedDurably,
  NOTIFICATION_EVENT_KINDS,
  findPersistedTrustKey,
  persistedTrustBoundary,
  getRawCurrentProjectConfigEntry,
  deleteCurrentProjectConfigFields,
  SETTING_FIELD_LABELS,
  GLOBAL_CONFIG_KEYS,
  getAutoUpdaterDisabledReason,
  formatAutoUpdaterDisabledReason,
  setPathTrusted,
  getCachedClientDataSlot,
  rechooseGlobalConfigFreshnessWatcher,
  CONFIG_BACKEND_LABELS,
  EDITOR_MODES,
  DISABLE_REASON_LABELS,
  CONFIG_CRASH_MARKER_REENQUEUE_DELAYS_MS,
  CONFIG_LOCK_BOOT_SAVE_RETRY_BUDGET_MS,
  CONFIG_LOCK_RETRY_DELAYS_MS,
  PROJECT_CONFIG_KEYS,
  _deleteCurrentProjectConfigFieldsForTesting,
  _findMostRecentBackupForTesting,
  _getConfigForTesting,
  _getConfigWriteGenerationForTesting,
  _getCurrentProjectConfigForTesting,
  _getFreshnessBackendForTesting,
  _getFreshnessWatcherStartedForTesting,
  _getGlobalConfigForTesting,
  _getLastGetConfigWasParseErrorForTesting,
  _getOrCreateMachineIDForTesting,
  _getOrCreateUserIDForTesting,
  _getTestGlobalConfigForTesting,
  _installGlobalConfigReloadedThroughStorageForTesting,
  _isFullDiskIgnorableGlobalWriteForTesting,
  _isLockContentionErrorForTesting,
  _loadGlobalConfigThroughStorageForTesting,
  _onGlobalConfigStorageEventForTesting,
  _readGlobalConfigForFallbackForTesting,
  _refreshGlobalConfigCacheFromExternalWriteForTesting,
  _refreshGlobalConfigCacheThroughStorageForTesting,
  _removeProjectHistoryForTesting,
  _resetEnableConfigsForTesting,
  _resetGeneratedMachineIDForTesting,
  _resetGeneratedSummonSidKeyForTesting,
  _resetParseErrorDedupForTesting,
  _resetRemoteControlMachineIdForTesting,
  _saveConfigWithLockForTesting,
  _saveCurrentProjectConfigDurablyForTesting,
  _saveCurrentProjectConfigForTesting,
  _saveGlobalConfigDurablyForTesting,
  _saveGlobalConfigForTesting,
  _setFileWatchFallbackForTesting,
  _setFreshnessBackendForTesting,
  _setFreshnessEventWatchForTesting,
  _setFreshnessWatcherStartedForTesting,
  _setGlobalConfigCacheForTesting,
  _setLastGetConfigWasParseErrorForTesting,
  _setLastReadFileStatsForTesting,
  _setLoadedVersionForTesting,
  _setUseRealConfigPipelineForTesting,
  _setWritersWithoutBackendForTesting,
  _startGlobalConfigFreshnessThroughStorageForTesting,
  _subscribeGlobalConfigFreshnessForTesting,
  _takeTimestampedConfigBackupForTesting,
  _wouldLoseAuthStateForTesting,
  customApiKeyStatusOf,
  getOrCreateRemoteControlMachineId,
  getPersistedTrustKeyForExactPath,
  globalConfigStores,
  isGlobalConfigKey,
  isPathPersistedTrustedCwdExact,
  isPathTrustedForSession,
  isProjectConfigKey,
  persistedTrustKeyThroughBackend,
  readOauthAccountFromDiskOrThrow,
  readStrictClientData,
  stampFirstStart,
};
