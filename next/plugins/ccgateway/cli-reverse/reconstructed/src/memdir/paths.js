/**
 * memdir/paths.ts
 *
 * 自动记忆目录的解析与开关：环境变量覆盖、autoMemoryDirectory 设置、默认 <记忆根>/projects/<项目>/memory/。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/memdir/paths.ts
 * pieces: chunk-exfmq47h.js (41)
 * attribution: placement 34, fingerprint 2, file-local 1, callgraph-fingerprint 2, layout 1, callgraph-witnessed 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, sep, normalize, isAbsolute } from "path";
import { homedir } from "os";
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
  getInitialSettings,
  policySettingUnreadable,
  getSettingsForSource,
} from "../utils/settings/settings.js";
import { isSafeMode, isEnvTruthy, isEnvDefinedFalsy } from "../utils/envUtils.js";
import { env } from "../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { includesAnyIgnoreCase } from "../utils/toolErrors.js";
import { getHostedPostTurnMemoryConfig } from "./memoryTool.js";
import { getClaudeConfigDir } from "../utils/markdownConfigLoader.js";
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

//@ chunk-exfmq47h.js:60005-60049 placement
function isAutoMemoryEnabled() {
  if (isAutoMemoryHeldForSession()) return false;
  return isAutoMemoryEnabledIgnoringPause();
}
//@ chunk-exfmq47h.js:60049-60082 placement
function isAutoMemoryHeldForSession() {
  return getMemoryToggledOff() || getAutoMemoryOffThisSession();
}
//@ chunk-exfmq47h.js:60082-60202 placement
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
//@ chunk-exfmq47h.js:60202-60238 placement
function isAutoMemoryEnabledByExplicitSwitches() {
  return getAutoMemoryDisabledReason() === undefined;
}
//@ chunk-exfmq47h.js:60238-60420 placement
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
//@ chunk-exfmq47h.js:60420-60513 placement
/**
 * 设置里的自动记忆开关
 */
function isAutoMemoryEnabledBySettings() {
  let initialSettings = getInitialSettings();
  if (initialSettings.autoMemoryEnabled !== undefined) return initialSettings.autoMemoryEnabled;
  return true;
}
//@ chunk-exfmq47h.js:60513-60559 placement
/**
 * 判断 autoMemoryEnabled 策略设置是否不可读（不可读时记忆功能按未决处理）。
 */
function isAutoMemoryPolicyUnreadable() {
  return policySettingUnreadable("autoMemoryEnabled");
}
//@ chunk-exfmq47h.js:60559-60756 placement
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
//@ chunk-exfmq47h.js:60756-60923 fingerprint (2.1.88 match: isAutoMemoryEnabled, 0.611)
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
//@ chunk-exfmq47h.js:60923-60971 placement
function isIndexRecallEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_mill_orange", false);
}
//@ chunk-exfmq47h.js:60971-61036 placement (2.1.88 match: filterInjectedMemoryFiles, 0.724)
/**
 * tengu_moth_copse 开启或设置了 CLAUDE_MEMORY_STORES 时，记忆文件由外部注入（不自己读 MEMORY.md）。
 */
function isMemoryRecallEnabled() {
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_moth_copse", false)) return true;
  return isStoreMountedRecall();
}
//@ chunk-exfmq47h.js:61036-61100 placement
/**
 * 是否设置了 CLAUDE_MEMORY_STORES（多 store 记忆同步）。
 */
function isStoreMountedRecall() {
  return !!process.env.CLAUDE_MEMORY_STORES?.trim();
}
//@ chunk-exfmq47h.js:61100-61305 placement
function isAutoMemoryDisabledForCurrentMainLoopModel() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_sepia_cormorant", null);
  if (!Array.isArray(featureValue_CACHED_MAY_BE_STALE) || featureValue_CACHED_MAY_BE_STALE.length === 0)
    return false;
  let mainLoopModelOverride = getMainLoopModelOverride();
  let model = mainLoopModelOverride !== undefined ? mainLoopModelOverride : getInitialMainLoopModel();
  if (typeof model !== "string" || !includesAnyIgnoreCase(model, featureValue_CACHED_MAY_BE_STALE))
    return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_umber_petrel", false);
}
//@ chunk-exfmq47h.js:61305-61428 placement (2.1.88 match: isExtractModeActive, 1)
/**
 * 是否走"提取"模式写记忆：有 hosted post-turn 配置，或 tengu_passport_quail 开且（交互式或 tengu_slate_thimble）。
 */
function isExtractModeActive() {
  if (getHostedPostTurnMemoryConfig() !== null) return true;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_passport_quail", false)) return false;
  return !getIsNonInteractiveSession() || getFeatureValue_CACHED_MAY_BE_STALE("tengu_slate_thimble", false);
}
//@ chunk-exfmq47h.js:61428-61549 placement (2.1.88 match: getMemoryBaseDir, 1)
/**
 * 记忆根目录：CLAUDE_CODE_REMOTE_MEMORY_DIR 或配置目录。
 */
function getMemoryBaseDir() {
  if (process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR) return process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR;
  return getClaudeConfigDir();
}
//@ chunk-exfmq47h.js:61549-61586 placement
function getMemoryBaseDirOrNull() {
  return isDiskless() ? null : getMemoryBaseDir();
}
//@ chunk-exfmq47h.js:61586-61617 file-local
var AUTO_MEM_DIRNAME = "memory";
var MEMORY_MD = "MEMORY.md";
//@ chunk-exfmq47h.js:61617-61689 placement
/**
 * account 作用域个人记忆目录 <配置目录>/memory/personal/。
 */
function getAccountMemoryMirrorPath() {
  return (join(getClaudeConfigDir(), "memory", "personal") + sep).normalize("NFC");
}
//@ chunk-exfmq47h.js:61689-61996 callgraph-fingerprint (2.1.88 match: validateMemoryPath, 0.503)
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
//@ chunk-exfmq47h.js:61996-62087 placement
function isDangerousMemoryRoot(dir) {
  return (
    !isAbsolute(dir) ||
    dir.length < 3 ||
    /^[A-Za-z]:$/.test(dir) ||
    isUntouchableSpelling(dir) ||
    dir.includes("\x00")
  );
}
//@ chunk-exfmq47h.js:62087-62152 fingerprint (2.1.88 match: getAutoMemPathOverride, 1)
/**
 * CLAUDE_COWORK_MEMORY_PATH_OVERRIDE 指定的自动记忆目录（经 validateMemoryPath 校验）。
 */
function getAutoMemPathOverride() {
  return validateMemoryPath(env.CLAUDE_COWORK_MEMORY_PATH_OVERRIDE, false);
}
//@ chunk-exfmq47h.js:62152-62189 layout
/**
 * 校验后的 autoMemoryDirectory 设置值。
 */
function getValidatedAutoMemDirSetting() {
  return validateMemoryPath(getAutoMemPathSetting().dir, true);
}
//@ chunk-exfmq47h.js:62189-62440 callgraph-fingerprint (2.1.88 match: getAutoMemPathSetting, 0.905)
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
//@ chunk-exfmq47h.js:62440-62489 placement
function getAutoMemPathSettingSource() {
  return getAutoMemPathState().resolveEntry().source;
}
//@ chunk-exfmq47h.js:62489-62525 placement
function hasAutoMemPathOverride() {
  return getAutoMemPathOverride() !== undefined;
}
//@ chunk-exfmq47h.js:62525-63849 callgraph-witnessed (2.1.88 match: getAutoMemPath, 0.242)
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
//@ chunk-exfmq47h.js:63849-63874 placement
var autoMemPathResolverByHost; // deferred: uses AutoMemPathResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:63849", () => {
  autoMemPathResolverByHost = new HostScoped(() => new AutoMemPathResolver());
});
//@ chunk-exfmq47h.js:63874-64076 placement
let NullAutoMemPathResolver; // deferred: uses AutoMemPathResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:63874", () => {
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
//@ chunk-exfmq47h.js:64076-64090 placement
var nullAutoMemPathResolver; // deferred: uses NullAutoMemPathResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:64076", () => {
  nullAutoMemPathResolver = new NullAutoMemPathResolver();
});
//@ chunk-exfmq47h.js:64090-64134 placement
function getAutoMemPathState() {
  return isDiskless() ? nullAutoMemPathResolver : autoMemPathResolverByHost.of(getRootSession().host);
}
//@ chunk-exfmq47h.js:64134-64206 placement
function hasNoAutoMemPath() {
  let autoMemPathState = getAutoMemPathState();
  return autoMemPathState.canLackAFolder() && autoMemPathState.resolve() === null;
}
//@ chunk-exfmq47h.js:64206-64243 placement
function getAutoMemPathOrNull() {
  return hasNoAutoMemPath() ? null : getAutoMemPath();
}
//@ chunk-exfmq47h.js:64243-64312 placement
function getAutoMemPath() {
  let resolved = getAutoMemPathState().resolve();
  if (resolved === null) throw new NoProjectDirectoryError();
  return resolved;
}
//@ chunk-exfmq47h.js:64312-64321 placement
/**
 * 8
 */
var SHORT_SESSION_ID_CHARS = 8;
//@ chunk-exfmq47h.js:64321-64511 placement
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
//@ chunk-exfmq47h.js:64511-64544 placement
function getAutoMemEntrypoint() {
  return join(getAutoMemPath(), MEMORY_MD);
}
//@ chunk-exfmq47h.js:64544-64607 placement
function isAutoMemPath(absolutePath) {
  let normalizedPath = getAutoMemPathOrNull();
  return normalizedPath !== null && normalize(absolutePath).startsWith(normalizedPath);
}
//@ chunk-exfmq47h.js:64607-64643 placement
function mayBeAutoMemPath(filePath) {
  return hasNoAutoMemPath() || isAutoMemPath(filePath);
}
//@ chunk-exfmq47h.js:64643-64695 placement
var AUTO_MEM_WRITE_ALLOW_REASON = "auto memory files are allowed for writing";
//@ chunk-exfmq47h.js:64695-64843 placement
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
//@ chunk-exfmq47h.js:64843-64938 placement
function isOwnProjectAutoMemPathSafeForCarveout(filePath) {
  let ownProjectDir = getAutoMemPathState().resolveOwnProjectDir();
  if (ownProjectDir === undefined) return false;
  return isAutoMemPathSafeForCarveout(filePath, ownProjectDir) && isAutoMemoryEnabled();
}
export {
  isExtractModeActive,
  isAutoMemoryEnabled,
  isIndexRecallEnabled,
  hasAutoMemPathOverride,
  getAutoMemPathState,
  isAutoMemoryHeldForSession,
  getMemoryBaseDirOrNull,
  hasNoAutoMemPath,
  isAutoMemPath,
  mayBeAutoMemPath,
  isAutoMemPathSafeForCarveout,
  isOwnProjectAutoMemPathSafeForCarveout,
  AUTO_MEM_WRITE_ALLOW_REASON,
  getAutoMemPath,
  activeSessionLogExcluder,
  isMemoryRecallEnabled,
  getAutoMemEntrypoint,
  getMemoryBaseDir,
  getAutoMemPathOrNull,
  isAutoMemoryEnabledIgnoringPause,
  isAutoMemoryDisabledForCurrentMainLoopModel,
  isDangerousMemoryRoot,
  isStoreMountedRecall,
  getAutoMemPathSettingSource,
  getAccountMemoryMirrorPath,
  isAutoMemoryEnabledByExplicitSwitches,
};
