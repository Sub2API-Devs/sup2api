/**
 * memdir/paths.ts
 *
 * 自动记忆目录的解析与开关：环境变量覆盖、autoMemoryDirectory 设置、默认 <记忆根>/projects/<项目>/memory/。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/memdir/paths.ts
 * pieces: chunk-4vzb3taj.js (1), chunk-aepeg2w5.js (41)
 * attribution: fingerprint 3, placement 34, file-local 1, callgraph-fingerprint 2, layout 1, callgraph-witnessed 1
 */
import { join, sep, normalize, isAbsolute } from "path";
import { homedir } from "os";
import { isSelfHostedRemoteEnvironment } from "../utils/remoteEnvironment.js";
import {
  getMemoryToggledOff,
  getAutoMemoryOffThisSession,
  isRestrictedSession,
  isDiskless,
  getMainLoopModelOverride,
  getInitialMainLoopModel,
  getIsNonInteractiveSession,
  getProjectRootOrNull,
  getOriginalCwd,
  getRootSession,
  getSessionId,
} from "../bootstrap/state.js";
import {
  getInitialSettings_2,
  policySettingUnreadable,
  getSettingsForSource,
} from "../utils/settings/settings.js";
import { isSafeMode, isEnvTruthy, isEnvDefinedFalsy, getClaudeConfigDir } from "../utils/envUtils.js";
import { env } from "../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { includesAnyIgnoreCase } from "../utils/toolErrors.js";
import { getHostedPostTurnMemoryConfig } from "./memoryTool.js";
import { isUntouchableSpelling } from "../utils/networkPaths.js";
import { isProjectScopeTrustAccepted } from "../utils/config.js";
import { isSettingSourceEnabled, getEnabledSettingSources } from "../utils/settings/constants.js";
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { getProjectKey, sanitizePath, getProjectDir } from "../utils/sessionStoragePortable.js";
import { findCanonicalGitRoot } from "../utils/git.js";
import { HostScoped } from "../utils/hostScoped.js";
import { NoProjectDirectoryError } from "../bootstrap/sessionSlices.js";
import { isProtectedDirPath } from "../utils/permissions/protectedDirNames.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-4vzb3taj.js:993-1052 fingerprint = AUTO_MEM_DIRNAME (1)
function AUTO_MEM_DIRNAME_2(appendSystemPromptHead) {
  return isSelfHostedRemoteEnvironment() && appendSystemPromptHead === undefined ? ["memory"] : undefined;
}
//@ chunk-aepeg2w5.js:59531-59574 placement
function isAutoMemoryEnabled() {
  if (isAutoMemoryHeldForSession()) return false;
  return isAutoMemoryEnabledIgnoringPause();
}
//@ chunk-aepeg2w5.js:59574-59607 placement
function isAutoMemoryHeldForSession() {
  return getMemoryToggledOff() || getAutoMemoryOffThisSession();
}
//@ chunk-aepeg2w5.js:59607-59726 placement
function isAutoMemoryEnabledIgnoringPause() {
  switch (getAutoMemoryState()) {
    case "off":
      return false;
    case "forced_on":
      return true;
    case "unset":
      break;
  }
  if (isAutoMemoryDisabledForCurrentMainLoopModel()) return false;
  return isAutoMemoryEnabledBySettings();
}
//@ chunk-aepeg2w5.js:59726-59762 placement
function isAutoMemoryEnabledByExplicitSwitches() {
  return getAutoMemoryDisabledReason() === undefined;
}
//@ chunk-aepeg2w5.js:59762-59944 placement
function getAutoMemoryDisabledReason() {
  switch (getAutoMemoryState()) {
    case "off":
      return "switch";
    case "forced_on":
      if (isAutoMemoryOffByEnvironment()) return "switch";
      return isAutoMemoryPolicyUnreadable() ? "policy_unreadable" : undefined;
    case "unset":
      return isAutoMemoryPolicyUnreadable() ? "policy_unreadable" : undefined;
  }
}
//@ chunk-aepeg2w5.js:59944-60037 placement
/**
 * 设置里的自动记忆开关
 */
function isAutoMemoryEnabledBySettings() {
  let initialSettings = getInitialSettings_2();
  if (initialSettings.autoMemoryEnabled !== undefined) return initialSettings.autoMemoryEnabled;
  return true;
}
//@ chunk-aepeg2w5.js:60037-60083 placement
/**
 * 判断 autoMemoryEnabled 策略设置是否不可读（不可读时记忆功能按未决处理）。
 */
function isAutoMemoryPolicyUnreadable() {
  return policySettingUnreadable("autoMemoryEnabled");
}
//@ chunk-aepeg2w5.js:60083-60280 placement
/**
 * 自动记忆总开关：--safe-mode、lk()、diskless、CLAUDE_CODE_DISABLE_AUTO_MEMORY=真 → off；该变量为假 → forced_on；SIMPLE/REMOTE 环境 → off；否则 unset（再看 autoMemoryEnabled 设置）。
 */
function getAutoMemoryState() {
  if (isSafeMode()) return "off";
  if (isRestrictedSession()) return "off";
  if (isDiskless()) return "off";
  let envClaudeCodeDisableAutoMemory = process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY;
  if (isEnvTruthy(envClaudeCodeDisableAutoMemory)) return "off";
  if (isEnvDefinedFalsy(envClaudeCodeDisableAutoMemory)) return "forced_on";
  return isAutoMemoryOffByEnvironment() ? "off" : "unset";
}
//@ chunk-aepeg2w5.js:60280-60447 fingerprint = isAutoMemoryEnabled (0.611)
/**
 * CLAUDE_CODE_SIMPLE，或 CLAUDE_CODE_REMOTE 且未给 REMOTE_MEMORY_DIR/cowork 覆盖时返回 true（这些环境默认关自动记忆）。
 */
function isAutoMemoryOffByEnvironment() {
  if (env.CLAUDE_CODE_SIMPLE) return true;
  return (
    Boolean(env.CLAUDE_CODE_REMOTE) &&
    !process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR &&
    !env.CLAUDE_COWORK_MEMORY_PATH_OVERRIDE
  );
}
//@ chunk-aepeg2w5.js:60447-60495 placement
function isIndexRecallEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mill_orange", false);
}
//@ chunk-aepeg2w5.js:60495-60560 placement = filterInjectedMemoryFiles (0.724)
/**
 * tengu_moth_copse 开启或设置了 CLAUDE_MEMORY_STORES 时，记忆文件由外部注入（不自己读 MEMORY.md）。
 */
function isMemoryRecallEnabled() {
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_moth_copse", false)) return true;
  return isStoreMountedRecall();
}
//@ chunk-aepeg2w5.js:60560-60624 placement
/**
 * 是否设置了 CLAUDE_MEMORY_STORES（多 store 记忆同步）。
 */
function isStoreMountedRecall() {
  return !!process.env.CLAUDE_MEMORY_STORES?.trim();
}
//@ chunk-aepeg2w5.js:60624-60829 placement
function isAutoMemoryDisabledForCurrentMainLoopModel() {
  let needles = getFeatureValue_CACHED_MAY_BE_STALE("tengu_sepia_cormorant", null);
  if (!Array.isArray(needles) || needles.length === 0) return false;
  let mainLoopModelOverride = getMainLoopModelOverride();
  let model = mainLoopModelOverride !== undefined ? mainLoopModelOverride : getInitialMainLoopModel();
  if (typeof model !== "string" || !includesAnyIgnoreCase(model, needles)) return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_umber_petrel", false);
}
//@ chunk-aepeg2w5.js:60829-60952 placement = isExtractModeActive (1)
/**
 * 是否走"提取"模式写记忆：有 hosted post-turn 配置，或 tengu_passport_quail 开且（交互式或 tengu_slate_thimble）。
 */
function isExtractModeActive() {
  if (getHostedPostTurnMemoryConfig() !== null) return true;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_passport_quail", false)) return false;
  return !getIsNonInteractiveSession() || getFeatureValue_CACHED_MAY_BE_STALE("tengu_slate_thimble", false);
}
//@ chunk-aepeg2w5.js:60952-61073 placement = getMemoryBaseDir (1)
/**
 * 记忆根目录：CLAUDE_CODE_REMOTE_MEMORY_DIR 或配置目录。
 */
function getMemoryBaseDir() {
  if (process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR) return process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR;
  return getClaudeConfigDir();
}
//@ chunk-aepeg2w5.js:61073-61110 placement
function getMemoryBaseDirOrNull() {
  return isDiskless() ? null : getMemoryBaseDir();
}
//@ chunk-aepeg2w5.js:61110-61141 file-local
var AUTO_MEM_DIRNAME = "memory";
var MEMORY_MD = "MEMORY.md";
//@ chunk-aepeg2w5.js:61141-61213 placement
/**
 * account 作用域个人记忆目录 <配置目录>/memory/personal/。
 */
function getAccountMemoryMirrorPath() {
  return (join(getClaudeConfigDir(), "memory", "personal") + sep).normalize("NFC");
}
//@ chunk-aepeg2w5.js:61213-61520 callgraph-fingerprint = validateMemoryPath (0.503)
/**
 * 校验记忆目录路径（可展开 ~），拒绝相对路径、裸盘符、NUL 等，返回带结尾分隔符的 NFC 路径。
 */
function validateMemoryPath(raw, expandTilde) {
  if (!raw) return;
  let candidate = raw;
  if (expandTilde && (candidate.startsWith("~/") || candidate.startsWith("~\\"))) {
    let rest = candidate.slice(2);
    let restNorm = normalize(rest || ".");
    if (
      restNorm === "." ||
      restNorm === ".." ||
      restNorm.startsWith(`..${sep}`) ||
      restNorm.startsWith("../") ||
      restNorm.startsWith("..\\")
    )
      return;
    candidate = join(homedir(), rest);
  }
  let normalized = normalize(candidate).replace(/[/\\]+$/, "");
  if (isDangerousMemoryRoot(normalized)) return;
  return (normalized + sep).normalize("NFC");
}
//@ chunk-aepeg2w5.js:61520-61611 placement
function isDangerousMemoryRoot(dir) {
  return (
    !isAbsolute(dir) ||
    dir.length < 3 ||
    /^[A-Za-z]:$/.test(dir) ||
    isUntouchableSpelling(dir) ||
    dir.includes("\x00")
  );
}
//@ chunk-aepeg2w5.js:61611-61676 fingerprint = getAutoMemPathOverride (1)
/**
 * CLAUDE_COWORK_MEMORY_PATH_OVERRIDE 指定的自动记忆目录（经 validateMemoryPath 校验）。
 */
function getAutoMemPathOverride() {
  return validateMemoryPath(env.CLAUDE_COWORK_MEMORY_PATH_OVERRIDE, false);
}
//@ chunk-aepeg2w5.js:61676-61713 layout
/**
 * 校验后的 autoMemoryDirectory 设置值。
 */
function getValidatedAutoMemDirSetting() {
  return validateMemoryPath(getAutoMemPathSetting().dir, true);
}
//@ chunk-aepeg2w5.js:61713-61964 callgraph-fingerprint = getAutoMemPathSetting (0.905)
/**
 * 按 policy→flag→(信任后)local/project→user 顺序取第一个设置了 autoMemoryDirectory 的来源。
 */
function getAutoMemPathSetting() {
  let sources = [
    "policySettings",
    "flagSettings",
    ...(isProjectScopeTrustAccepted() ? ["localSettings", "projectSettings"] : []),
    "userSettings",
  ];
  for (let source of sources) {
    if (!isSettingSourceEnabled(source)) continue;
    let autoMemoryDirectory = getSettingsForSource(source)?.autoMemoryDirectory;
    if (autoMemoryDirectory != null)
      return {
        dir: autoMemoryDirectory,
        source,
      };
  }
  return {
    dir: undefined,
    source: undefined,
  };
}
//@ chunk-aepeg2w5.js:61964-62013 placement
function getAutoMemPathSettingSource() {
  return getAutoMemPathState().resolveEntry().source;
}
//@ chunk-aepeg2w5.js:62013-62049 placement
function hasAutoMemPathOverride() {
  return getAutoMemPathOverride() !== undefined;
}
//@ chunk-aepeg2w5.js:62049-63373 callgraph-witnessed = getAutoMemPath (0.243)
/**
 * 自动记忆目录解析器：CLAUDE_COWORK_MEMORY_PATH_OVERRIDE → autoMemoryDirectory 设置 → <记忆根>/projects/<清洗后的工作副本/git 根/项目根>/memory/；结果按项目根、信任状态、设置来源 memo。
 */
class AutoMemPathResolver {
  canonicalWcRoot;
  canonicalWcRootFor;
  wcWarmPromise;
  canonicalWcRootForProject(projectRoot) {
    return this.canonicalWcRootFor === projectRoot ? this.canonicalWcRoot : undefined;
  }
  clearWcWarmLatch() {
    this.canonicalWcRoot = undefined;
    this.canonicalWcRootFor = undefined;
    this.wcWarmPromise = undefined;
  }
  resolveEntry = memoizeAlias(
    () => {
      let autoMemPathOverride = getAutoMemPathOverride();
      if (autoMemPathOverride)
        return {
          path: autoMemPathOverride,
          source: undefined,
        };
      let autoMemPathSetting = getAutoMemPathSetting();
      let dir = validateMemoryPath(autoMemPathSetting.dir, true);
      if (dir)
        return {
          path: dir,
          source: autoMemPathSetting.source,
        };
      let projectRootOrNull = getProjectRootOrNull();
      if (projectRootOrNull === null)
        return {
          path: null,
          source: undefined,
        };
      let key = this.defaultKey(projectRootOrNull);
      let memoryBaseDir = getMemoryBaseDir();
      let projectKey =
        memoryBaseDir === getClaudeConfigDir() ? getProjectKey(key.base) : sanitizePath(key.base);
      return {
        path: (join(memoryBaseDir, "projects", projectKey, AUTO_MEM_DIRNAME) + sep).normalize("NFC"),
        source: undefined,
        keyedBy: key,
      };
    },
    () => this.memoKey(),
  );
  resolve = memoizeAlias(
    () => this.resolveEntry().path,
    () => this.memoKey(),
  );
  canLackAFolder() {
    return getProjectRootOrNull() === null;
  }
  memoKey() {
    let projectRootOrNull = getProjectRootOrNull();
    let canonicalRoot = projectRootOrNull === null ? null : this.canonicalWcRootForProject(projectRootOrNull);
    return `${projectRootOrNull ?? ""}|${isProjectScopeTrustAccepted()}|${canonicalRoot ?? ""}|${getEnabledSettingSources().join(",")}`;
  }
  defaultKey(projectRoot) {
    let canonicalRoot = this.canonicalWcRootForProject(projectRoot);
    if (canonicalRoot != null)
      return {
        base: canonicalRoot,
        via: "working_copy",
      };
    let canonicalGitRoot = findCanonicalGitRoot(projectRoot);
    return canonicalGitRoot !== null
      ? {
          base: canonicalGitRoot,
          via: "git",
        }
      : {
          base: projectRoot,
          via: "project_root",
        };
  }
  resolveOwnProjectDir = memoizeAlias(
    () => {
      if (getAutoMemPathOverride() ?? getValidatedAutoMemDirSetting()) return;
      if (getMemoryBaseDir() !== getClaudeConfigDir()) return;
      return (join(getProjectDir(getOriginalCwd()), AUTO_MEM_DIRNAME) + sep).normalize("NFC");
    },
    () => `${getOriginalCwd()}|${isProjectScopeTrustAccepted()}`,
  );
  warmCanonicalWcRoot() {
    return Promise.resolve();
  }
  reset() {
    this.resolve.cache.clear?.();
    this.resolveOwnProjectDir.cache.clear?.();
    this.resolveEntry.cache.clear?.();
    this.clearWcWarmLatch();
  }
}
//@ chunk-aepeg2w5.js:63373-63398 placement
var autoMemPathResolverByHost; // deferred: uses AutoMemPathResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:63373", () => {
  autoMemPathResolverByHost = new HostScoped(() => new AutoMemPathResolver());
});
//@ chunk-aepeg2w5.js:63398-63600 placement
let NullAutoMemPathResolver; // deferred: uses AutoMemPathResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:63398", () => {
  NullAutoMemPathResolver = class NullAutoMemPathResolver extends AutoMemPathResolver {
    resolveEntry = memoizeAlias(() => ({
      path: null,
      source: undefined,
    }));
    resolve = memoizeAlias(() => null);
    resolveOwnProjectDir = memoizeAlias(() => {
      return;
    });
    canLackAFolder() {
      return true;
    }
    warmCanonicalWcRoot() {
      return Promise.resolve();
    }
  };
});
//@ chunk-aepeg2w5.js:63600-63614 placement
var nullAutoMemPathResolver; // deferred: uses NullAutoMemPathResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:63600", () => {
  nullAutoMemPathResolver = new NullAutoMemPathResolver();
});
//@ chunk-aepeg2w5.js:63614-63658 placement
function getAutoMemPathState() {
  return isDiskless() ? nullAutoMemPathResolver : autoMemPathResolverByHost.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:63658-63730 placement
function hasNoAutoMemPath() {
  let autoMemPathState = getAutoMemPathState();
  return autoMemPathState.canLackAFolder() && autoMemPathState.resolve() === null;
}
//@ chunk-aepeg2w5.js:63730-63767 placement
function getAutoMemPathOrNull() {
  return hasNoAutoMemPath() ? null : getAutoMemPath();
}
//@ chunk-aepeg2w5.js:63767-63836 placement
function getAutoMemPath() {
  let resolved = getAutoMemPathState().resolve();
  if (resolved === null) throw new NoProjectDirectoryError();
  return resolved;
}
//@ chunk-aepeg2w5.js:63836-63845 placement
/**
 * 8
 */
var SHORT_SESSION_ID_CHARS = 8;
//@ chunk-aepeg2w5.js:63845-64035 placement
function activeSessionLogExcluder(date) {
  let sessionIdShort;
  try {
    sessionIdShort = (date ?? getSessionId()).slice(0, SHORT_SESSION_ID_CHARS);
  } catch {
    return;
  }
  return (relativePath) => {
    if (!relativePath.startsWith("logs/")) return false;
    let sliced = relativePath.slice(relativePath.lastIndexOf("/") + 1);
    return sliced === `${sessionIdShort}.md` || sliced.startsWith(`${sessionIdShort}-`);
  };
}
//@ chunk-aepeg2w5.js:64035-64068 placement
function getAutoMemEntrypoint() {
  return join(getAutoMemPath(), MEMORY_MD);
}
//@ chunk-aepeg2w5.js:64068-64131 placement
function isAutoMemPath(absolutePath) {
  let normalizedPath = getAutoMemPathOrNull();
  return normalizedPath !== null && normalize(absolutePath).startsWith(normalizedPath);
}
//@ chunk-aepeg2w5.js:64131-64167 placement
function mayBeAutoMemPath(filePath) {
  return hasNoAutoMemPath() || isAutoMemPath(filePath);
}
//@ chunk-aepeg2w5.js:64167-64219 placement
var AUTO_MEM_WRITE_ALLOW_REASON = "auto memory files are allowed for writing";
//@ chunk-aepeg2w5.js:64219-64366 placement
function isAutoMemPathSafeForCarveout(filePath, autoMemPath = getAutoMemPathOrNull()) {
  if (
    autoMemPath === null ||
    !autoMemPath.endsWith(sep) ||
    isDangerousMemoryRoot(autoMemPath.replace(/[/\\]+$/, ""))
  )
    return false;
  let normalizedPath = normalize(filePath);
  if (!normalizedPath.startsWith(autoMemPath)) return false;
  return !isProtectedDirPath(normalizedPath, autoMemPath);
}
//@ chunk-aepeg2w5.js:64366-64460 placement
function isOwnProjectAutoMemPathSafeForCarveout(filePath) {
  let ownProjectDir = getAutoMemPathState().resolveOwnProjectDir();
  if (ownProjectDir === undefined) return false;
  return isAutoMemPathSafeForCarveout(filePath, ownProjectDir) && isAutoMemoryEnabled();
}
export {
  isAutoMemoryEnabled,
  isIndexRecallEnabled,
  getAutoMemEntrypoint,
  isAutoMemoryHeldForSession,
  getMemoryBaseDirOrNull,
  hasNoAutoMemPath,
  isAutoMemPath,
  mayBeAutoMemPath,
  hasAutoMemPathOverride,
  isAutoMemPathSafeForCarveout,
  isOwnProjectAutoMemPathSafeForCarveout,
  AUTO_MEM_WRITE_ALLOW_REASON,
  isMemoryRecallEnabled,
  isAutoMemoryEnabledIgnoringPause,
  isAutoMemoryDisabledForCurrentMainLoopModel,
  isExtractModeActive,
  AUTO_MEM_DIRNAME_2,
  getAutoMemPath,
  getAutoMemPathState,
  getMemoryBaseDir,
  getAutoMemPathOrNull,
  isDangerousMemoryRoot,
  isStoreMountedRecall,
  getAutoMemPathSettingSource,
  getAccountMemoryMirrorPath,
  activeSessionLogExcluder,
  isAutoMemoryEnabledByExplicitSwitches,
};
