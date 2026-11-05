/**
 * utils/git.ts
 *
 * git 根/主仓库根查找（不 spawn，带缓存）、gitExe、分支/默认分支/远程 URL、git config 读取、危险命令前的 status 摘要、teleport stash、worktree 分支状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/git.ts
 * pieces: chunk-5xgkngpb.js (19), chunk-85eyj5gy.js (60), chunk-c7hntn0y.js (1), chunk-deax24jz.js (4), chunk-hma1b5gv.js (1), chunk-nh1pvp1m.js (1), chunk-s4mtq5zk.js (1)
 * attribution: affinity 1, fingerprint 11, placement 14, layout 16, facade-exports 44, sole-consumer 1
 */
import { resolve, sep, join, dirname, basename, isAbsolute, relative } from "path";
import { lstat, realpath } from "fs/promises";
import { readFileSync, realpathSync, lstatSync, statSync, accessSync, constants } from "fs";
import { homedir, networkInterfaces } from "os";
import { createHash } from "crypto";
import { isDiskless, getRootSession, getSessionId } from "../bootstrap/state.js";
import {
  REPO_NEGATIVE_RESULT,
  isUsableGitEntry,
  memoizeMap,
  getGitRepoCache,
  REPO_UNREADABLE_RESULT,
} from "./git/gitRepoCache.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { identity, isUncOrDevicePath } from "./pathClassification.js";
import { PathSpace, describeUrlScheme } from "./resultError.js";
import { isPathWithin } from "./fsJunctions.js";
import { isOnForeignMount, isForeignMountPath, isNetworkMountPath, isWslUncPath } from "./networkPaths.js";
import {
  rawPointerPathIsUnsafe,
  pointerFileIsSuspect,
  resolveGitDir,
  getCachedHead,
  getCachedBranch,
  getCachedDefaultBranch,
  CONVENTIONAL_DEFAULT_BRANCH_NAMES,
  getCachedRemoteUrl,
  getCachedDefaultBranchIfKnown,
  getRemoteUrlForDir_2,
  readPositionIsUnsafe,
  getWorktreeCountFromFs,
} from "./git/gitFilesystem.js";
import { logForDebugging } from "./debug.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { bunWhichSync } from "./which.js";
import { logError } from "./log.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { getCwdOrNull, getCwd } from "./cwd.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import { execFileNoThrowWithCwd, execFileNoThrow } from "./execFileNoThrow.js";
import {
  GIT_SAFE_GLOBAL_ARGS,
  IGNORE_SUBMODULES_DIRTY_FLAG,
  SAFE_GIT_REPO_ARGS,
  GIT_CONFIG_PARAMETERS_LIMIT,
} from "./git/gitSafeEnv.js";
import { stripCheckoutBaseRule, bashAndPowerShellRules } from "./permissions/gitCommandRules.js";
import { isSuspiciousUrl, hasEncodedPathChars } from "./fsBoundRead.js";
import { firstLineOf } from "./stringUtils.js";
import { isGithubDotCom, GITHUB_HOST } from "./git/githubUrl.js";
import { isENOENT } from "./errors.js";
import { hasNulByte } from "./git/gitConfigParser.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { env, antEnv } from "./env.js";
import { isSelfAddressableSessionId } from "../bridge/sessionIdCompat.js";
import { getFsImplementation } from "./fsOperations.js";
import { getPlatform } from "./platform.js";
import {
  stripWin32DevicePrefix,
  WIN32_DEVICE_NAMESPACE_RE,
  POSIX_SEP,
  WIN32_UNC_HOST_RE,
  caseFoldKey,
  normalizeWindowsPathForCompare,
} from "./hooks/hookCommandAnalysis.js";
import { getOwn } from "./objectSafety.js";
import {
  GIT_SUBCOMMAND_EXCLUSIONS,
  isSubcommandExclusionEnabled,
  PYTHON_SUBCOMMAND_EXCLUSIONS,
  normalizeConfigKey,
  SUBCOMMAND_PROGRAMS_2,
  GIT_UNSAFE_CONFIG_KEYS,
  optionMatchesRule,
  findGitSubcommandIndex,
  GIT_LONG_GLOBAL_OPTIONS,
} from "../tools/BashTool/sandboxExclusions.js";
import { withGitNoPromptEnv, readSshCommandConfig } from "./gitSafeExec.js";
import { withPinnedGitDirEnv } from "./git/gitDirResolution.js";
import { TTY_ACQUIRE_TIMEOUT_MS, hasControllingTty } from "./bgControllingTty.js";
import { getAutoModeConfigOrDefault } from "./permissions/permissionSetup.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../tools/PowerShellTool/toolName.js";
import { isRemoteOnlyCheck } from "./permissions/checkRegistry.js";
import { getDestructiveTargetCategory } from "../tools/BashTool/destructiveTargets.js";
import { getPowerShellDestructiveCategory } from "../tools/PowerShellTool/destructiveCommandWarning.js";
import { runGitInWorktree } from "./worktree.js";
import {
  NO_OPTIONAL_LOCKS,
  isWholeAnswer,
  buildUntrackedFileEntries,
} from "../plugins/bundled/diffPane/gitDiffRead.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-85eyj5gy.js:72385-72916 fingerprint (2.1.88 match: findGitRootImpl, 0.914)
/**
 * 从起始路径逐级向上 lstat `.git`（目录、文件或指向安全位置的符号链接）找 git 根，不 spawn git；diskless 时直接返回负结果。打 find_git_root_started/completed 诊断日志（耗时、stat 次数）。
 */
function findGitRootImpl(startPath) {
  if (isDiskless()) return REPO_NEGATIVE_RESULT;
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "find_git_root_started");
  let current = resolve(startPath);
  let root = current.substring(0, current.indexOf(sep) + 1) || sep;
  let statCount = 0;
  while (current !== root) {
    let gitPath = join(current, ".git");
    statCount++;
    if (isUsableGitEntry(gitPath, current)) {
      logForDiagnosticsNoPII("info", "find_git_root_completed", {
        duration_ms: Date.now() - startTime,
        stat_count: statCount,
        found: true,
      });
      return identity(current);
    }
    let parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  statCount++;
  if (isUsableGitEntry(join(root, ".git"), root)) {
    logForDiagnosticsNoPII("info", "find_git_root_completed", {
      duration_ms: Date.now() - startTime,
      stat_count: statCount,
      found: true,
    });
    return identity(root);
  }
  logForDiagnosticsNoPII("info", "find_git_root_completed", {
    duration_ms: Date.now() - startTime,
    stat_count: statCount,
    found: false,
  });
  return REPO_NEGATIVE_RESULT;
}
//@ chunk-85eyj5gy.js:72916-72985 facade-exports
/**
 * findGitRoot：带 rootByPath 缓存的 git 根查找，未找到返回 null。
 */
function findGitRoot(startPath) {
  let root = memoizeMap(getGitRepoCache().rootByPath, startPath, findGitRootImpl);
  return root === REPO_NEGATIVE_RESULT ? null : root;
}
//@ chunk-85eyj5gy.js:72985-73034 facade-exports
function findGitRootUncached(startPath) {
  let result = findGitRootImpl(startPath);
  return result === REPO_NEGATIVE_RESULT ? null : result;
}
//@ chunk-85eyj5gy.js:73034-73389 facade-exports
async function findGitRootThroughBackendUncached(hostFiles, startPath) {
  if (isDiskless())
    return {
      gitRoot: null,
    };
  let absolutePath = resolve(startPath);
  let stopPath = absolutePath.substring(0, absolutePath.indexOf(sep) + 1) || sep;
  for (;;) {
    let stats = await hostFiles.stat(PathSpace.workspace(join(absolutePath, ".git")), {
      follow: false,
    });
    if (!stats.ok || stats.value.kind === "link") return;
    if (stats.value.kind === "directory" || stats.value.kind === "file")
      return {
        gitRoot: identity(absolutePath),
        entry: stats.value.kind,
      };
    if (absolutePath === stopPath)
      return {
        gitRoot: null,
      };
    let parentPath = dirname(absolutePath);
    absolutePath = parentPath === absolutePath ? stopPath : parentPath;
  }
}
//@ chunk-85eyj5gy.js:73389-73470 facade-exports
function findGitRootRecheckingNegative(startPath) {
  let rootByPath = getGitRepoCache().rootByPath;
  if (rootByPath.peek(startPath) === REPO_NEGATIVE_RESULT) rootByPath.delete(startPath);
  return findGitRoot(startPath);
}
//@ chunk-85eyj5gy.js:73470-73666 facade-exports
async function findGitRootVerifyingPositive(startPath) {
  let gitRootRecheckingNegative = findGitRootRecheckingNegative(startPath);
  if (gitRootRecheckingNegative === null) return null;
  try {
    await lstat(join(gitRootRecheckingNegative, ".git"));
    return gitRootRecheckingNegative;
  } catch (error) {
    let code = error?.code;
    if (code !== "ENOENT" && code !== "ENOTDIR") return gitRootRecheckingNegative;
    getGitRepoCache().rootByPath.delete(startPath);
    return findGitRootRecheckingNegative(startPath);
  }
}
//@ chunk-85eyj5gy.js:73666-73988 facade-exports
/**
 * 删除位于某目录下的所有 git 相关缓存（git 根、canonical 根、remote slug、monorepo 判定、gitDir、repository 等），在目录被移动/删除后调用。
 */
function forgetGitRootsUnder(dirPath) {
  let resolvedDir = identity(resolve(dirPath));
  let gitRepoCache = getGitRepoCache();
  for (let cacheMap of [
    gitRepoCache.rootByPath,
    gitRepoCache.canonicalRootByRoot,
    gitRepoCache.remoteSlugByRoot,
    gitRepoCache.monorepoRuledOutByRoot,
    gitRepoCache.monorepoVerdictByDir,
    gitRepoCache.gitDirByCwd,
    gitRepoCache.markersByRoot,
    gitRepoCache.repositoryByCwd,
    gitRepoCache.repoClassByCanonicalRoot,
    gitRepoCache.wcRootByPath,
    gitRepoCache.wcWorktreesByRoot,
  ])
    for (let key of [...cacheMap.keys()])
      if (isPathWithin(resolvedDir, identity(resolve(key)))) cacheMap.delete(key);
}
//@ chunk-85eyj5gy.js:73988-74060 layout
function getCanonicalRootUncached(gitRoot) {
  try {
    return resolveCanonicalRoot(gitRoot, readFileSync(join(gitRoot, ".git"), "utf-8"));
  } catch {
    return gitRoot;
  }
}
//@ chunk-85eyj5gy.js:74060-74693 fingerprint (2.1.88 match: resolveCanonicalRoot, 0.904)
/**
 * 解析 worktree 的 `.git` 文件内容（gitdir:），校验 commondir、worktrees/<name>/gitdir 回指与 realpath 一致后返回主仓库根；任何一步不可信都退回原根，防止伪造 .git 文件把路径引到别处。
 */
function resolveCanonicalRoot(gitRoot, gitContent) {
  try {
    let gitContent_2 = gitContent.trim();
    if (!gitContent_2.startsWith("gitdir:")) return gitRoot;
    let trimmed = gitContent_2.slice(7).trim();
    if (isOnForeignMount(trimmed, gitRoot)) return gitRoot;
    if (rawPointerPathIsUnsafe(trimmed, gitRoot)) return gitRoot;
    let worktreeGitDir = resolve(gitRoot, trimmed);
    if (pointerFileIsSuspect(join(worktreeGitDir, "commondir"), worktreeGitDir)) return gitRoot;
    let trimmed_2 = readFileSync(join(worktreeGitDir, "commondir"), "utf-8").trim();
    if (isOnForeignMount(trimmed_2, worktreeGitDir)) return gitRoot;
    if (rawPointerPathIsUnsafe(trimmed_2, worktreeGitDir)) return gitRoot;
    let commonDir = resolve(worktreeGitDir, trimmed_2);
    if (resolve(dirname(worktreeGitDir)) !== join(commonDir, "worktrees")) return gitRoot;
    if (pointerFileIsSuspect(join(worktreeGitDir, "gitdir"), worktreeGitDir)) return gitRoot;
    let trimmed_3 = readFileSync(join(worktreeGitDir, "gitdir"), "utf-8").trim();
    if (isOnForeignMount(trimmed_3, gitRoot)) return gitRoot;
    if (rawPointerPathIsUnsafe(trimmed_3, worktreeGitDir, gitRoot)) return gitRoot;
    if (sep === "/" && [gitRoot, worktreeGitDir, trimmed_3, commonDir].some((path) => path.includes("\\")))
      return gitRoot;
    if (realpathSync(resolve(worktreeGitDir, trimmed_3)) !== join(realpathSync(gitRoot), ".git"))
      return gitRoot;
    if (basename(commonDir) !== ".git") {
      if (isUsableGitEntry(join(commonDir, ".git"), commonDir)) return gitRoot;
      return identity(commonDir);
    }
    return identity(dirname(commonDir));
  } catch {
    return gitRoot;
  }
}
//@ chunk-85eyj5gy.js:74693-74825 layout
async function resolveCanonicalRootOnHost(hostFiles, gitRoot) {
  let text = await hostFiles.readText(PathSpace.workspace(join(gitRoot, ".git")));
  if (!text.ok || !text.value.found) return;
  return resolveCanonicalRoot(gitRoot, text.value.value);
}
//@ chunk-85eyj5gy.js:74825-74912 facade-exports
/**
 * findCanonicalGitRoot：git 根若是 linked worktree，则经 .git 文件的 gitdir/commondir 解析出主仓库根；结果缓存在 canonicalRootByRoot。
 */
function findCanonicalGitRoot(startPath) {
  let gitRoot = findGitRoot(startPath);
  if (!gitRoot) return null;
  return memoizeMap(getGitRepoCache().canonicalRootByRoot, gitRoot, getCanonicalRootUncached);
}
//@ chunk-85eyj5gy.js:74912-74970 facade-exports
function findCanonicalGitRootUncached(startPath) {
  let gitRoot = findGitRootUncached(startPath);
  if (!gitRoot) return null;
  return getCanonicalRootUncached(gitRoot);
}
//@ chunk-85eyj5gy.js:74970-75441 facade-exports
async function primeGitRootMemo(context, startPath) {
  if (context.hostFiles.serving("workspace") !== "host") return;
  let gitRepoCache = getGitRepoCache();
  let cachedRoot = gitRepoCache.rootByPath.peek(startPath);
  if (cachedRoot !== undefined) {
    let gitRoot = cachedRoot === REPO_NEGATIVE_RESULT ? null : cachedRoot;
    return {
      gitRoot,
      canonicalRoot: gitRoot === null ? null : gitRepoCache.canonicalRootByRoot.peek(gitRoot),
    };
  }
  let gitRootThroughBackendUncached = await findGitRootThroughBackendUncached(context.hostFiles, startPath);
  if (gitRootThroughBackendUncached === undefined) return;
  let seeded =
    gitRootThroughBackendUncached.gitRoot === null
      ? {
          gitRoot: null,
          canonicalRoot: null,
        }
      : {
          gitRoot: gitRootThroughBackendUncached.gitRoot,
          canonicalRoot:
            gitRootThroughBackendUncached.entry === "directory"
              ? gitRootThroughBackendUncached.gitRoot
              : await resolveCanonicalRootOnHost(context.hostFiles, gitRootThroughBackendUncached.gitRoot),
        };
  seedGitRootMemo(startPath, seeded.gitRoot, seeded.canonicalRoot);
  return seeded;
}
//@ chunk-85eyj5gy.js:75441-75939 facade-exports
/**
 * 用已知结果预填 git 根缓存（findGitRoot 与 canonical 根）；已有不同答案时保留旧值并告警。
 */
function seedGitRootMemo(startPath, gitRoot, canonicalRoot) {
  let gitRepoCache = getGitRepoCache();
  let cachedValue = gitRoot ?? REPO_NEGATIVE_RESULT;
  let existing = gitRepoCache.rootByPath.peek(startPath);
  if (existing === undefined) gitRepoCache.rootByPath.set(startPath, cachedValue);
  else if (existing !== cachedValue) {
    logForDebugging(
      "git root prime: findGitRoot already holds a different answer for the start path; keeping the first",
      {
        level: "warn",
      },
    );
    return;
  }
  if (gitRoot === null || canonicalRoot === undefined || canonicalRoot === null) return;
  let existingCanonical = gitRepoCache.canonicalRootByRoot.peek(gitRoot);
  if (existingCanonical === undefined) gitRepoCache.canonicalRootByRoot.set(gitRoot, canonicalRoot);
  else if (existingCanonical !== canonicalRoot)
    logForDebugging(
      "git root prime: findCanonicalGitRoot already holds a different answer for the root; keeping the first",
      {
        level: "warn",
      },
    );
}
//@ chunk-85eyj5gy.js:75939-75993 facade-exports
/**
 * 当前路径是否在 linked worktree 中（git 根与 canonical 根不同）。
 */
function isLinkedWorktree(startPath) {
  let gitRoot = findGitRoot(startPath);
  return gitRoot !== null && findCanonicalGitRoot(startPath) !== gitRoot;
}
//@ chunk-85eyj5gy.js:75993-76048 facade-exports
function isLinkedWorktreeUncached(canonical) {
  let gitRoot = findGitRootUncached(canonical);
  return gitRoot !== null && getCanonicalRootUncached(gitRoot) !== gitRoot;
}
//@ chunk-85eyj5gy.js:76048-76180 facade-exports
/**
 * 若 git dir 位于 <common>/worktrees/<name> 下，返回 worktree 名。
 */
async function getGitWorktreeName(startPath) {
  if (isRemoteSessionAvailable()) return null;
  let gitDir = await resolveGitDir(startPath);
  if (!gitDir || basename(gitDir) === ".git" || basename(dirname(gitDir)) !== "worktrees") return null;
  return basename(gitDir);
}
//@ chunk-85eyj5gy.js:76180-76297 facade-exports
var RAW_BLOB_DIFF_FLAGS = ["--no-ext-diff", "--no-textconv"];
var PLAIN_PATCH_FLAGS = ["--no-color", "--src-prefix=a/", "--dst-prefix=b/", "--submodule=short"];
//@ chunk-85eyj5gy.js:76297-76670 facade-exports
/**
 * gitExe：返回要执行的 git 可执行文件（which git 结果缓存，Windows 下识别启动器后的真实程序），diskless 时为 "git"。
 */
function gitExe() {
  if (isDiskless()) return "git";
  let gitRepoCache = getGitRepoCache();
  gitRepoCache.gitExecutable ??= bunWhichSync("git") || "git";
  if (gitRepoCache.gitLauncherProbe === null) {
    let gitExecutable = gitRepoCache.gitExecutable;
    let probePromise = probeGitLauncher(gitExecutable).then((programPath) => {
      if (programPath !== null && gitRepoCache.gitLauncherProbe === probePromise)
        gitRepoCache.gitBehindLauncher = {
          launcher: gitExecutable,
          program: programPath,
        };
    }, logError);
    gitRepoCache.gitLauncherProbe = probePromise;
  }
  let gitBehindLauncher = gitRepoCache.gitBehindLauncher;
  return gitBehindLauncher?.launcher === gitRepoCache.gitExecutable && process.env.MSYSTEM === undefined
    ? gitBehindLauncher.program
    : gitRepoCache.gitExecutable;
}
//@ chunk-85eyj5gy.js:76670-76698 layout
var MSYS_GIT_SUBDIRS = ["mingw64", "ucrt64"];
//@ chunk-85eyj5gy.js:76698-76731 layout
async function probeGitLauncher(gitExecutable) {
  return null;
}
//@ chunk-85eyj5gy.js:76731-76758 layout
var isGitCacheBySession; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-85eyj5gy.js:76731", () => {
  isGitCacheBySession = new SessionRootSlot(() => new Map());
});
//@ chunk-85eyj5gy.js:76758-76944 fingerprint (2.1.88 match: getIsGit, 1)
/**
 * 当前 cwd 是否在 git 仓库内（基于 findGitRoot，不 spawn），打 is_git_check_* 诊断日志。
 */
async function getIsGit_2() {
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "is_git_check_started");
  let cwdOrNull = getCwdOrNull();
  let isGit = cwdOrNull !== null && findGitRoot(cwdOrNull) !== null;
  logForDiagnosticsNoPII("info", "is_git_check_completed", {
    duration_ms: Date.now() - startTime,
    is_git: isGit,
  });
  return isGit;
}
//@ chunk-85eyj5gy.js:76944-76969 layout
function getCurrentHost() {
  return getRootSession();
}
//@ chunk-85eyj5gy.js:76969-77072 facade-exports
/**
 * 按会话缓存 getIsGit() 的 promise。
 */
function getIsGit() {
  let cache = isGitCacheBySession.of(getCurrentHost());
  let sessionId = getSessionId();
  let cached = cache.get(sessionId);
  if (cached !== undefined) return cached;
  let isGit = getIsGit_2();
  cache.set(sessionId, isGit);
  return isGit;
}
//@ chunk-85eyj5gy.js:77072-77137 facade-exports
function clearIsGitMemoFor(host) {
  isGitCacheBySession.of(host).clear();
  getGitRepoCache().diffCheckoutIsRepo.clear();
}
//@ chunk-85eyj5gy.js:77137-77162 facade-exports
function clearIsGitMemo() {
  clearIsGitMemoFor(getCurrentHost());
}
//@ chunk-85eyj5gy.js:77162-77191 facade-exports
function getGitDir(startPath) {
  return resolveGitDir(startPath);
}
//@ chunk-85eyj5gy.js:77191-77449 facade-exports (2.1.88 match: preserveGitStateForIssue, 0.511)
/**
 * dirIsInGitRepo 及同语句的 getHead（读缓存的 HEAD sha）、getBranch（git rev-parse --abbrev-ref HEAD，失败为 "HEAD"）。
 */
var dirIsInGitRepo = async (cwd) => findGitRoot(cwd) !== null;
var getHead = async () => getCachedHead();
var getBranch = async (
  cwd,
  execOptions = {
    env: getRemoteHostSessionCount(),
  },
) => {
  if (cwd === undefined) return getCachedBranch();
  let { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--abbrev-ref", "HEAD"],
    {
      cwd,
      preserveOutputOnError: false,
      ...execOptions,
    },
  );
  return code === 0 ? stdout.trim() || "HEAD" : "HEAD";
};
//@ chunk-85eyj5gy.js:77449-77620 facade-exports
async function isBranchOnOrigin(branch, cwd) {
  return (
    (
      await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "show-ref", "--verify", "--quiet", `refs/remotes/origin/${branch}`],
        {
          cwd: cwd ?? getCwd(),
          preserveOutputOnError: false,
          env: getRemoteHostSessionCount(),
        },
      )
    ).code === 0
  );
}
//@ chunk-85eyj5gy.js:77620-78318 facade-exports
/**
 * getDefaultBranch：先读 refs/remotes/origin/HEAD 指向的分支并确认存在，否则依次尝试 main/master 的远程分支，最后默认 "main"。不带目录时读 GitFileWatcher 的缓存。
 */
var getDefaultBranch = async (
  cwd,
  execOptions = {
    env: getRemoteHostSessionCount(),
  },
) => {
  if (cwd === undefined) return getCachedDefaultBranch();
  let defaultBranchIfKnown = await getDefaultBranchIfKnown(cwd, execOptions);
  if (defaultBranchIfKnown) return defaultBranchIfKnown;
  for (let branchName of CONVENTIONAL_DEFAULT_BRANCH_NAMES)
    if (
      (
        await execFileNoThrowWithCwd(
          gitExe(),
          [...GIT_SAFE_GLOBAL_ARGS, "show-ref", "--verify", "--quiet", `refs/remotes/origin/${branchName}`],
          {
            cwd,
            preserveOutputOnError: false,
            ...execOptions,
          },
        )
      ).code === 0
    )
      return branchName;
  return "main";
};
var getDefaultBranchIfKnown = async (
  cwd,
  execOptions = {
    env: getRemoteHostSessionCount(),
  },
) => {
  let { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "symbolic-ref", "--short", "refs/remotes/origin/HEAD"],
    {
      cwd: cwd ?? getCwd(),
      preserveOutputOnError: false,
      ...execOptions,
    },
  );
  if (code !== 0) return null;
  let replaced = stdout.trim().replace(/^origin\//, "");
  if (!replaced) return null;
  return (
    await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "show-ref", "--verify", "--quiet", `refs/remotes/origin/${replaced}`],
      {
        cwd: cwd ?? getCwd(),
        preserveOutputOnError: false,
        ...execOptions,
      },
    )
  ).code === 0
    ? replaced
    : null;
};
var BRANCH_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
//@ chunk-85eyj5gy.js:78318-78510 facade-exports
/**
 * git config --get <key>（cwd 仓库），无值返回 null。
 */
async function readGitConfigValue(key) {
  let { stdout, code } = await execFileNoThrow(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "config", "--get", key], {
    preserveOutputOnError: false,
    useCwd: true,
    env: getRemoteHostSessionCount(),
  });
  if (code !== 0) return null;
  let trimmed = stdout.trim();
  return trimmed.length > 0 ? trimmed : null;
}
//@ chunk-85eyj5gy.js:78510-78706 facade-exports
/**
 * git config --global --includes --get <key>。
 */
async function readGlobalGitConfigValue(key, cwd) {
  let { stdout, code } = await execFileNoThrow(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "config", "--global", "--includes", "--get", key],
    {
      preserveOutputOnError: false,
      cwd,
      env: getRemoteHostSessionCount(),
    },
  );
  let trimmed = stdout.trim();
  return code === 0 && trimmed.length > 0 ? trimmed : null;
}
//@ chunk-85eyj5gy.js:78706-78840 layout
async function getPushRemote(remotes) {
  let gitConfigValue = await readGitConfigValue("remote.pushDefault");
  if (gitConfigValue && remotes.includes(gitConfigValue)) return gitConfigValue;
  if (remotes.length === 1) return remotes[0] ?? null;
  return null;
}
//@ chunk-85eyj5gy.js:78840-79139 facade-exports
/**
 * 列出可推送的远程：origin 与 remote.pushDefault（或唯一远程），用于生成 git push 权限规则。
 */
async function getGitPushRemotes() {
  let { stdout, code } = await execFileNoThrow(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "remote"], {
    preserveOutputOnError: false,
    useCwd: true,
    env: getRemoteHostSessionCount(),
  });
  if (code !== 0) return [];
  let remotes = stdout
    .split(
      `
`,
    )
    .map((line) => line.trim())
    .filter(Boolean);
  let result = new Set();
  if (remotes.includes("origin")) result.add("origin");
  let pushRemote = await getPushRemote(remotes);
  if (pushRemote && BRANCH_NAME_RE.test(pushRemote)) result.add(pushRemote);
  return [...result];
}
//@ chunk-85eyj5gy.js:79139-79219 facade-exports
/**
 * 为远程生成 `git push <r> *`、`git push -u <r> *` 权限规则模式。
 */
function gitPushShellPatternsForRemotes(gitPushRemotes) {
  return gitPushRemotes.flatMap((remote) => [`git push ${remote} *`, `git push -u ${remote} *`]);
}
//@ chunk-85eyj5gy.js:79219-79294 facade-exports
function toPowerShellRules(rules) {
  return stripCheckoutBaseRule(bashAndPowerShellRules(rules)).filter((rule) =>
    rule.startsWith("PowerShell("),
  );
}
//@ chunk-85eyj5gy.js:79294-79416 facade-exports
/**
 * getRemoteUrl：GitFileWatcher 缓存的 origin URL；同语句 $lo 在仓库根是 home 目录时返回 null（避免把 dotfiles 仓库当项目）。
 */
var getRemoteUrl = async () => getCachedRemoteUrl();
var getRemoteUrlForBridge = async () => {
  let cwdOrNull = getCwdOrNull();
  let gitRoot = cwdOrNull === null ? null : findGitRoot(cwdOrNull);
  if (gitRoot === null || (await isHomeDirectoryGitRoot(gitRoot))) return null;
  return getCachedRemoteUrl();
};
//@ chunk-85eyj5gy.js:79416-79578 facade-exports
/**
 * 路径是否就是 home 目录（含 realpath 比较）。
 */
async function isHomeDirectoryGitRoot(gitRoot) {
  let homeDir;
  try {
    homeDir = homedir();
  } catch {
    return false;
  }
  if (!homeDir) return false;
  if (gitRoot === identity(resolve(homeDir))) return true;
  let realHome = await realpath(homeDir).then(
    (realPath) => identity(realPath),
    () => null,
  );
  return realHome !== null && gitRoot === realHome;
}
//@ chunk-85eyj5gy.js:79578-79692 facade-exports
var snapshotGitEvidenceForBridge = async () => {
  let [branch, remoteUrlForBridge, cachedDefaultBranchIfKnown] = await Promise.all([
    getBranch(),
    getRemoteUrlForBridge(),
    getCachedDefaultBranchIfKnown(),
  ]);
  return {
    branch,
    gitRepoUrl: remoteUrlForBridge,
    defaultBranch: cachedDefaultBranchIfKnown,
  };
};
//@ chunk-85eyj5gy.js:79692-79760 facade-exports
/**
 * 把 URL 中的 user:pass@ 凭证替换为 ***@，用于日志。
 */
function redactGitRemoteCredentials(remoteUrl) {
  return remoteUrl == null ? remoteUrl : remoteUrl.replace(/:\/\/[^/]*@/, "://***@");
}
//@ chunk-85eyj5gy.js:79760-80304 facade-exports (2.1.88 match: normalizeGitRemoteUrl, 1)
/**
 * 把 ssh/https/git 等多种远程 URL 归一化为 host/owner/repo 形式，用于比较与遥测。
 */
function normalizeGitRemoteUrl(url) {
  let trimmed = url.trim();
  if (!trimmed || describeUrlScheme(trimmed) || isSuspiciousUrl(trimmed)) return null;
  let sshMatch = trimmed.match(/^git@([^:/@]+):(.+?)(?:\.git)?$/);
  if (sshMatch && sshMatch[1] && sshMatch[2]) {
    if (hasEncodedPathChars(sshMatch[2])) return null;
    return `${sshMatch[1]}/${sshMatch[2]}`.toLowerCase();
  }
  let urlMatch = trimmed.match(/^(?:https?|ssh):\/\/(?:[^@/?#]*@)?([^/?#@]+)\/(.+?)(?:\.git)?$/);
  if (urlMatch && urlMatch[1] && urlMatch[2]) {
    let host = urlMatch[1];
    let path = urlMatch[2];
    if (hasEncodedPathChars(path)) return null;
    if (isCcrGitProxySession() && isLocalHost(host) && path.startsWith("git/")) {
      let proxyPath = path.slice(4);
      let segments = proxyPath.split("/");
      if (segments.length >= 3 && segments[0].includes(".")) return proxyPath.toLowerCase();
      return `github.com/${proxyPath}`.toLowerCase();
    }
    return `${host}/${path}`.toLowerCase();
  }
  return null;
}
//@ chunk-85eyj5gy.js:80304-80739 layout
/**
 * 按远程 URL 的主机名把 git 托管平台归类为 github、ghe、gitlab、bitbucket、azure、other 或 none。
 */
function classifyGitHost(remoteUrl) {
  let host = remoteUrl ? firstLineOf(remoteUrl, ":").toLowerCase() : null;
  if (!host) return "none";
  if (isGithubDotCom(host) || host.endsWith(`.${GITHUB_HOST}`)) return "github";
  if (host.endsWith(".ghe.com") || host.includes("github")) return "ghe";
  if (host === "gitlab.com" || host.includes("gitlab")) return "gitlab";
  if (host === "bitbucket.org" || host.includes("bitbucket")) return "bitbucket";
  if (
    host === "dev.azure.com" ||
    host === "ssh.dev.azure.com" ||
    host.endsWith(".visualstudio.com") ||
    host.endsWith(".azure.com")
  )
    return "azure";
  return "other";
}
//@ chunk-85eyj5gy.js:80739-80934 facade-exports
async function getGitPresenceForAnalytics() {
  if (isRemoteSessionAvailable()) return null;
  let [isGit, remoteUrl] = await Promise.all([getIsGit(), getRemoteUrl()]).catch(() => [false, null]);
  let normalizedRemote = remoteUrl ? normalizeGitRemoteUrl(remoteUrl) : null;
  return {
    is_git: isGit,
    has_remote: normalizedRemote !== null,
    remote_host_class: classifyGitHost(normalizedRemote ? firstLineOf(normalizedRemote, "/") : null),
  };
}
//@ chunk-85eyj5gy.js:81388-81442 sole-consumer
function getRemoteUrlForDirCached(dirPath) {
  return memoizeMap(getGitRepoCache().remoteSlugByRoot, dirPath, getRemoteUrlForDir_2);
}
//@ chunk-85eyj5gy.js:81442-81504 facade-exports
function findRepoRemoteSlug(dirPath) {
  let remoteUrlForDir = getRemoteUrlForDirCached(dirPath);
  return typeof remoteUrlForDir === "string" ? remoteUrlForDir : null;
}
//@ chunk-85eyj5gy.js:81504-81538 facade-exports
function isRepoConfigUnreadable(dirPath) {
  return getRemoteUrlForDirCached(dirPath) === REPO_UNREADABLE_RESULT;
}
//@ chunk-85eyj5gy.js:81538-81552 layout
var MAX_REPO_CONFIG_BYTES = 128000;
//@ chunk-85eyj5gy.js:81552-81824 facade-exports
function readRepoConfig(gitRoot, maxBytes) {
  try {
    let useDotGitDir = true;
    try {
      if (lstatSync(join(gitRoot, ".git")).isFile())
        return {
          ok: false,
          cause: "pointer_file",
        };
    } catch (error) {
      if (!isENOENT(error))
        return {
          ok: false,
          cause: "read_failed",
        };
      useDotGitDir = false;
    }
    let gitDirPath = useDotGitDir ? join(gitRoot, ".git") : gitRoot;
    let smallTextFile = readSmallTextFile(join(gitDirPath, "config"), gitRoot, maxBytes);
    return smallTextFile.ok
      ? {
          ...smallTextFile,
          gitDir: gitDirPath,
        }
      : smallTextFile;
  } catch {
    return {
      ok: false,
      cause: "read_failed",
    };
  }
}
//@ chunk-85eyj5gy.js:81824-82065 layout
function readSmallTextFile(filePath, gitRoot, maxBytes) {
  if (readPositionIsUnsafe(filePath, gitRoot))
    return {
      ok: false,
      cause: "unsafe_path",
    };
  let stats = statSync(filePath);
  if (!stats.isFile())
    return {
      ok: false,
      cause: "not_a_file",
    };
  if (stats.size > maxBytes)
    return {
      ok: false,
      cause: "oversize",
    };
  let file = readFileSync(filePath, "utf-8");
  return hasNulByte(file)
    ? {
        ok: false,
        cause: "nul_byte",
      }
    : {
        ok: true,
        text: file,
      };
}
//@ chunk-85eyj5gy.js:82065-82147 facade-exports
function readRepoConfigText(gitRoot) {
  let repoConfig = readRepoConfig(gitRoot, MAX_REPO_CONFIG_BYTES);
  return repoConfig.ok && !repoConfig.text.includes("\x00") ? repoConfig.text : null;
}
//@ chunk-85eyj5gy.js:82147-82419 facade-exports (2.1.88 match: getServerKey, 0.82)
async function getRepoRemoteHash() {
  let remoteUrl = await getRemoteUrl();
  let gitRepoCache = getGitRepoCache();
  if (!remoteUrl) {
    gitRepoCache.lastRemoteHash = undefined;
    return null;
  }
  let cacheKey = `${isCcrGitProxySession()} ${remoteUrl}`;
  if (gitRepoCache.lastRemoteHash?.key !== cacheKey) {
    let configJson = normalizeGitRemoteUrl(remoteUrl);
    gitRepoCache.lastRemoteHash = {
      key: cacheKey,
      hash: configJson ? createHash("sha256").update(configJson).digest("hex").substring(0, 16) : null,
    };
  }
  return gitRepoCache.lastRemoteHash.hash;
}
//@ chunk-85eyj5gy.js:82419-83380 facade-exports
var getIsHeadOnRemote = async () => {
  let { code } = await execFileNoThrow(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "@{u}"], {
    preserveOutputOnError: false,
    env: getRemoteHostSessionCount(),
  });
  return code === 0;
};
var hasUnpushedCommits = async (cwd) => {
  let { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-list", "--count", "@{u}..HEAD"],
    {
      cwd,
      preserveOutputOnError: false,
      env: getRemoteHostSessionCount(),
    },
  );
  return code === 0 && parseInt(stdout.trim(), 10) > 0;
};
var getIsClean = async (options) => {
  let args = [
    ...GIT_SAFE_GLOBAL_ARGS,
    "--no-optional-locks",
    "status",
    "--porcelain",
    IGNORE_SUBMODULES_DIRTY_FLAG,
  ];
  if (options?.ignoreUntracked) args.push("-uno");
  let { stdout } = await execFileNoThrow(gitExe(), args, {
    preserveOutputOnError: false,
    env: getRemoteHostSessionCount(undefined, {
      userLocale: true,
    }),
  });
  return stdout.trim().length === 0;
};
var getFileStatus = async (
  cwd,
  env = getRemoteHostSessionCount(undefined, {
    userLocale: true,
  }),
) => {
  let args = [
    ...GIT_SAFE_GLOBAL_ARGS,
    "--no-optional-locks",
    "status",
    "--porcelain",
    IGNORE_SUBMODULES_DIRTY_FLAG,
  ];
  let { stdout } =
    cwd === undefined
      ? await execFileNoThrow(gitExe(), args, {
          preserveOutputOnError: false,
          env,
        })
      : await execFileNoThrowWithCwd(gitExe(), args, {
          cwd,
          preserveOutputOnError: false,
          env,
        });
  let tracked = [];
  let untracked = [];
  stdout
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .forEach((line) => {
      let statusCode = line.substring(0, 2);
      let filePath = line.substring(3);
      if (statusCode === "??") untracked.push(filePath);
      else if (filePath) tracked.push(filePath);
    });
  return {
    tracked,
    untracked,
  };
};
var getWorktreeCount = async () => getWorktreeCountFromFs();
//@ chunk-85eyj5gy.js:83380-83660 facade-exports (2.1.88 match: getGitState, 0.748)
/**
 * 汇总 git 状态（提交、分支、远程、是否 dirty 等）用于 issue/反馈附带信息。
 */
async function getGitState() {
  try {
    let [commitHash, branchName, remoteUrl, isHeadOnRemote, isClean, worktreeCount] = await Promise.all([
      getHead(),
      getBranch(),
      getRemoteUrl(),
      getIsHeadOnRemote(),
      getIsClean(),
      getWorktreeCount(),
    ]);
    logFeatureOk("git_status_fetch");
    return {
      commitHash,
      branchName,
      remoteUrl,
      isHeadOnRemote,
      isClean,
      worktreeCount,
    };
  } catch (error) {
    logFeatureBad("git_status_fetch", "git_status_fetch_failed");
    return null;
  }
}
//@ chunk-85eyj5gy.js:83660-83943 facade-exports (2.1.88 match: getGithubRepo, 0.763)
/**
 * 从 origin URL 解析 GitHub owner/repo，非 GitHub 返回 null。
 */
async function getGithubRepo() {
  let { parseGitRemote } = await import("./detectRepository.js");
  let remoteUrl = await getRemoteUrl();
  if (!remoteUrl) {
    logForDebugging("Local GitHub repo: unknown");
    return null;
  }
  let parsed = parseGitRemote(remoteUrl);
  if (parsed && isGithubDotCom(parsed.host)) {
    let result = `${parsed.owner}/${parsed.name}`;
    logForDebugging(`Local GitHub repo: ${result}`);
    return result;
  }
  logForDebugging("Local GitHub repo: unknown");
  return null;
}
//@ chunk-85eyj5gy.js:83943-84068 facade-exports
function isCcrGitProxySession() {
  return (
    env.CLAUDE_CODE_REMOTE ||
    (isSelfAddressableSessionId(env.CLAUDE_CODE_REMOTE_SESSION_ID ?? "") &&
      env.CLAUDE_CODE_ENVIRONMENT_KIND === undefined)
  );
}
//@ chunk-85eyj5gy.js:84068-84258 facade-exports (2.1.88 match: isLocalHost, 1)
function isLocalHost(host) {
  let index = host.indexOf(":");
  let hostPart = index === -1 ? host : host.slice(0, index);
  let portPart = index === -1 ? "" : host.slice(index + 1);
  if (portPart !== "" && !/^\d+$/.test(portPart)) return false;
  return hostPart === "localhost" || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostPart);
}
//@ chunk-85eyj5gy.js:84258-84270 layout
var MAX_LINK_TARGET_BYTES = 4096;
//@ chunk-85eyj5gy.js:84270-84834 layout
/**
 * 逐段解析路径并展开符号链接（最多 64 次，处理 . 与 ..），遇到不安全位置、读取失败或链接目标不安全时返回 null，返回最终真实路径。
 */
function resolvePathWithoutSymlinks(fs, path, roots) {
  let separatorRe = /\/+/;
  let parts = path.split(separatorRe);
  let resolved = parts[0] === "" ? sep : parts[0] + sep;
  let linkCount = 0;
  for (let index = 1; index < parts.length; index++) {
    let segment = parts[index];
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      resolved = dirname(resolved);
      continue;
    }
    let candidate = resolved.endsWith(sep) ? resolved + segment : resolved + sep + segment;
    if (roots !== undefined ? isForeignMountPath(candidate, roots) : isNetworkMountPath(candidate))
      return null;
    let stats;
    try {
      stats = fs.lstatSync(candidate);
    } catch {
      return null;
    }
    if (!stats.isSymbolicLink()) {
      resolved = candidate;
      continue;
    }
    if (++linkCount > 64) return null;
    let linkTarget;
    try {
      linkTarget = fs.readlinkSync(candidate);
    } catch {
      return null;
    }
    if (isUncOrDevicePath(linkTarget)) return null;
    if (roots !== undefined ? isForeignMountPath(linkTarget, roots) : isNetworkMountPath(linkTarget))
      return null;
    let linkParts = linkTarget.split(separatorRe);
    if (isAbsolute(linkTarget)) {
      parts.splice(0, index + 1, ...linkParts);
      resolved = linkParts[0] === "" ? sep : linkParts[0] + sep;
      index = 0;
    } else {
      parts.splice(index, 1, ...linkParts);
      index--;
    }
  }
  return resolved;
}
//@ chunk-85eyj5gy.js:84834-87370 facade-exports
function isCurrentDirectoryBareGitRepo() {
  let fsImplementation = getFsImplementation();
  let cwd = getCwd();
  let canonicalCwd = resolvePathWithoutSymlinks(fsImplementation, cwd, cwd) ?? cwd;
  canonicalCwd = canonicalCwd.normalize("NFC").toLowerCase();
  let cwdWithSep = canonicalCwd.endsWith(sep) ? canonicalCwd : canonicalCwd + sep;
  let isUnderCwd = (path) => {
    let lower = path.toLowerCase();
    return lower === canonicalCwd || lower.startsWith(cwdWithSep);
  };
  function canonicalize(path) {
    if (isForeignMountPath(path, cwd)) return null;
    if (isUncOrDevicePath(path)) {
      if (!isWslUncPath(path)) return null;
      if (!isUncOrDevicePath(cwd))
        return {
          canonical: path.normalize("NFC"),
          crossOs: true,
        };
    }
    let pathWithoutSymlinks = resolvePathWithoutSymlinks(fsImplementation, path, cwd);
    if (pathWithoutSymlinks === null) return null;
    return {
      canonical: pathWithoutSymlinks.normalize("NFC"),
      crossOs: false,
    };
  }
  function hasNoGitSegment(path, crossOs) {
    if (!crossOs && isUnderCwd(path)) return true;
    for (let segment of path.split(crossOs ? /[\\/]+/ : sep))
      if (segment.toLowerCase() === ".git") return false;
    return true;
  }
  function isTrustedPointerTarget(canonical) {
    try {
      let headStats = fsImplementation.lstatSync(join(canonical, "HEAD"));
      if (!headStats.isFile() || headStats.size > 4096) return false;
      let sliced = readFileSync(join(canonical, "HEAD"), "utf8").slice(0, 255);
      return /^ref:[ \t]*refs\//.test(sliced) || /^[0-9a-f]{40}([0-9a-f]{24})?[ \t\n\r]*$/.test(sliced);
    } catch {
      return false;
    }
  }
  function isBareGitDir(dirPath) {
    try {
      let headPath = join(dirPath, "HEAD");
      let headStats = fsImplementation.lstatSync(headPath);
      if (!headStats.isFile() || headStats.size > 4096) return false;
      let sliced = readFileSync(headPath, "utf8").slice(0, 255);
      if (!/^ref:[ \t]*refs\//.test(sliced) && !/^[0-9a-f]{40}([0-9a-f]{24})?[ \t\n\r]*$/.test(sliced))
        return false;
      for (let subDirName of ["objects", "refs"]) {
        let subDirPath = join(dirPath, subDirName);
        if (!fsImplementation.statSync(subDirPath).isDirectory()) return false;
        accessSync(subDirPath, constants.X_OK);
      }
      try {
        fsImplementation.statSync(join(dirPath, "commondir"));
        return false;
      } catch {}
      return true;
    } catch {
      return false;
    }
  }
  function hasBareIndicators(dirPath) {
    try {
      let headStats = fsImplementation.lstatSync(join(dirPath, "HEAD"));
      if (headStats.isFile() || headStats.isSymbolicLink()) return true;
    } catch {}
    for (let subDirName of ["objects", "refs"])
      try {
        fsImplementation.statSync(join(dirPath, subDirName));
        return true;
      } catch {}
    return false;
  }
  function classifyGitRedirect(dirPath) {
    let classifyTarget = (targetPath) => {
      let canonical = canonicalize(targetPath);
      if (canonical === null) {
        logFeatureSad("git_bare_repo_gate", "gitdir_target_uncanonical");
        return "plantable";
      }
      if (hasNoGitSegment(canonical.canonical, canonical.crossOs)) {
        logFeatureSad("git_bare_repo_gate", "gitdir_target_plantable");
        return "plantable";
      }
      return isTrustedPointerTarget(canonical.canonical) ? "trusted" : "none";
    };
    try {
      let dotGitStats = fsImplementation.lstatSync(join(dirPath, ".git"));
      if (dotGitStats.isSymbolicLink()) {
        let linkTarget;
        try {
          linkTarget = fsImplementation.readlinkSync(join(dirPath, ".git"));
        } catch {
          return "plantable";
        }
        return classifyTarget(isAbsolute(linkTarget) ? linkTarget : dirPath + sep + linkTarget);
      }
      if (dotGitStats.isFile()) {
        if (dotGitStats.size > MAX_LINK_TARGET_BYTES) return "oversized";
        try {
          let file = readFileSync(join(dirPath, ".git"), "utf8");
          if (file.includes("\x00")) return "plantable";
          if (!file.startsWith("gitdir: ")) return "none";
          let replaced = file.slice(8).replace(/[\r\n]+$/, "");
          return classifyTarget(isAbsolute(replaced) ? replaced : dirPath + sep + replaced);
        } catch {
          return "none";
        }
      }
      if (dotGitStats.isDirectory()) return isBareGitDir(join(dirPath, ".git")) ? "trusted" : "none";
    } catch {}
    return "none";
  }
  switch (classifyGitRedirect(cwd)) {
    case "plantable":
      return "gitdir-redirect-plantable";
    case "oversized":
      return "gitdir-file-oversized";
    case "trusted":
      logFeatureOk("git_bare_repo_gate");
      return false;
    case "none":
      break;
  }
  let currentPath = cwd;
  for (;;) {
    if (hasBareIndicators(currentPath)) {
      logFeatureSad("git_bare_repo_gate", "bare_indicators");
      return "bare-indicators";
    }
    let parentPath = dirname(currentPath);
    if (parentPath === currentPath) break;
    switch (classifyGitRedirect(parentPath)) {
      case "trusted":
        logFeatureOk("git_bare_repo_gate");
        return false;
      case "plantable":
        return "gitdir-redirect-plantable";
      case "oversized":
        return "gitdir-file-oversized";
      case "none":
        break;
    }
    currentPath = parentPath;
  }
  logFeatureOk("git_bare_repo_gate");
  return false;
}
//@ chunk-deax24jz.js:8191-8416 placement
function getLocalInterfaceAddresses() {
  let networkInterfaces = getNetworkInterfacesSafe();
  if (networkInterfaces === null) return null;
  return new Set(
    Object.values(networkInterfaces).flatMap((interfaces) =>
      (interfaces ?? []).flatMap(({ address }) => [
        address.toLowerCase(),
        `${address.toLowerCase().replaceAll(":", "-").replaceAll("%", "s")}.ipv6-literal.net`,
      ]),
    ),
  );
}
//@ chunk-deax24jz.js:8416-8465 placement
function getNetworkInterfacesSafe() {
  try {
    return networkInterfaces();
  } catch {
    return null;
  }
}
//@ chunk-deax24jz.js:8465-8581 placement
/**
 * 判断路径在当前平台是否为绝对路径（Windows 下识别盘符与 UNC 形式）。
 */
function isAbsolutePlatformPath(filePath) {
  if (getPlatform() !== "windows") return filePath.startsWith("/");
  let strippedPath = stripWin32DevicePrefix(filePath);
  return (
    !WIN32_DEVICE_NAMESPACE_RE.test(strippedPath) &&
    (POSIX_SEP.test(strippedPath) || WIN32_UNC_HOST_RE.test(strippedPath))
  );
}
//@ chunk-deax24jz.js:8581-8678 placement (2.1.88 match: getReservedShortcuts, 1)
function normalizeCommandForPlatform(cwd) {
  switch (getPlatform()) {
    case "macos":
      return caseFoldKey(cwd);
    case "windows":
      return normalizeWindowsPathForCompare(cwd);
    default:
      return cwd;
  }
}
//@ chunk-5xgkngpb.js:1255022-1255203 affinity
function getGitSubcommandPath(args) {
  let subcommandPath = [];
  let sliced = args.slice(1);
  for (let [index, arg] of sliced.entries()) {
    if (arg.startsWith("-")) continue;
    let previousArg = index === 0 ? undefined : sliced[index - 1];
    subcommandPath.push(arg);
    if (previousArg === undefined || !previousArg.startsWith("-")) break;
  }
  return subcommandPath;
}
//@ chunk-5xgkngpb.js:1255203-1255541 fingerprint (2.1.88 match: gitExe, 1)
function isGitArgMatchingFlagRule(programName, args) {
  let exclusions = getOwn(GIT_SUBCOMMAND_EXCLUSIONS, programName);
  if (exclusions === undefined) return false;
  let activeExclusions =
    programName === "git" && isSubcommandExclusionEnabled()
      ? [...exclusions, PYTHON_SUBCOMMAND_EXCLUSIONS]
      : exclusions;
  let mapped = getGitSubcommandPath(args).map(normalizeConfigKey);
  let isSubcommandProgram = SUBCOMMAND_PROGRAMS_2.has(programName);
  return activeExclusions.some(([flag, subcommands]) => {
    let found = mapped.find((subcommand) => subcommands.includes(subcommand));
    if (found === undefined) return false;
    let isCodeFlag = /^-[A-Za-z]$/.test(flag);
    let unsafeConfigKeys = getOwn(GIT_UNSAFE_CONFIG_KEYS, found) ?? [];
    return args.some(
      (arg) =>
        arg === flag ||
        (flag.startsWith("-") &&
          (arg.startsWith(flag) ||
            optionMatchesRule(arg, flag, false, isCodeFlag, unsafeConfigKeys, isSubcommandProgram))),
    );
  });
}
//@ chunk-5xgkngpb.js:1258324-1258532 fingerprint (2.1.88 match: getIsHeadOnRemote, 0.487)
function hasDangerousGitGlobalOption(args, commandText) {
  let gitSubcommandIndex = findGitSubcommandIndex(args);
  return (
    args[gitSubcommandIndex] === "rev-parse" &&
    getGitSubcommandPath(args)[0] === "rev-parse" &&
    args.slice(1, gitSubcommandIndex).every((globalFlag) => SAFE_GIT_GLOBAL_FLAGS.has(globalFlag)) &&
    !/[$`]/.test(commandText)
      ? args.slice(1, gitSubcommandIndex)
      : args.slice(1)
  ).some((globalArg) =>
    GIT_LONG_GLOBAL_OPTIONS.some((longOption) =>
      optionMatchesRule(globalArg, longOption, false, false, [], true),
    ),
  );
}
//@ chunk-5xgkngpb.js:1258532-1258817 placement
var SAFE_GIT_GLOBAL_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1258532", () => {
  SAFE_GIT_GLOBAL_FLAGS = new Set([
    "-p",
    "-P",
    "--paginate",
    "--no-pager",
    "--bare",
    "--no-replace-objects",
    "--literal-pathspecs",
    "--glob-pathspecs",
    "--noglob-pathspecs",
    "--icase-pathspecs",
    "--no-optional-locks",
    "--no-lazy-fetch",
    "--no-advice",
    "--html-path",
    "--man-path",
    "--info-path",
    "--version",
    "--help",
  ]);
});
//@ chunk-5xgkngpb.js:1952999-1953413 placement
/**
 * 为 git 网络操作构建环境：固定 git 目录、读取 sshCommand 配置；非 Windows 且未显式设置时禁止 SSH_ASKPASS，始终脱离控制终端。
 */
async function getGitSshEnv(cwd) {
  if (isDiskless())
    return {
      env: withGitNoPromptEnv(),
      withoutControllingTerminal: true,
    };
  let baseEnv = withPinnedGitDirEnv(withGitNoPromptEnv(), cwd);
  let sshCommandConfig = await readSshCommandConfig(baseEnv, async (args) => {
    let { code, stdout } = await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...args], {
      cwd,
      env: baseEnv,
      stdin: "ignore",
      timeout: TTY_ACQUIRE_TIMEOUT_MS,
    });
    return {
      exitCode: code,
      stdout,
    };
  });
  let trimmed = sshCommandConfig.SSH_ASKPASS_REQUIRE?.trim();
  return {
    env:
      Boolean(trimmed) || getPlatform() === "windows" || !(await hasControllingTty())
        ? sshCommandConfig
        : {
            ...sshCommandConfig,
            SSH_ASKPASS_REQUIRE: "never",
            SSH_ASKPASS: "false",
          },
    withoutControllingTerminal: true,
  };
}
//@ chunk-5xgkngpb.js:2902255-2902769 placement
/**
 * 以只读方式运行 git（无可选锁、有超时与 1MB 输出上限），返回 {ok, stdout} 或失败信息（退出码、是否超时、是否溢出）；受限评估环境直接失败。
 */
async function runGitReadOnly(cwd, args, { abortSignal, userLocale } = {}) {
  if (env.CLAUDE_CODE_EVAL_CONFINED)
    return {
      ok: false,
      code: null,
      timedOut: false,
      overflowed: false,
    };
  try {
    let result = await execFileNoThrowWithCwd(
      gitExe(),
      [...SAFE_GIT_REPO_ARGS, "--no-optional-locks", ...args],
      {
        cwd,
        env: getRemoteHostSessionCount(undefined, {
          userLocale,
        }),
        timeout: GIT_CONFIG_PARAMETERS_LIMIT,
        abortSignal,
        maxBuffer: 1e6,
        preserveOutputOnError: false,
        useToolMemoryCgroup: false,
      },
    );
    return result.code === 0
      ? {
          ok: true,
          stdout: result.stdout,
        }
      : {
          ok: false,
          code: result.exitCode ?? null,
          timedOut: result.timedOut === true,
          overflowed: result.maxBufferExceeded === true,
        };
  } catch {
    return {
      ok: false,
      code: null,
      timedOut: false,
      overflowed: false,
    };
  }
}
//@ chunk-5xgkngpb.js:2902769-2902803 placement
/**
 * 读取"自动模式 git status 开关"的设置值。
 */
function autoModeGitStatusSettingValue() {
  return getAutoModeGitStatusSetting().value;
}
//@ chunk-5xgkngpb.js:2902803-2902998 placement
function getAutoModeGitStatusSetting() {
  let CLAUDE_CODE_AUTO_MODE_GIT_STATUS = antEnv.CLAUDE_CODE_AUTO_MODE_GIT_STATUS;
  if (CLAUDE_CODE_AUTO_MODE_GIT_STATUS !== undefined)
    return {
      value: CLAUDE_CODE_AUTO_MODE_GIT_STATUS,
      src: "env",
    };
  let gitStatusType = getAutoModeConfigOrDefault()?.gitStatusType;
  return typeof gitStatusType === "boolean"
    ? {
        value: gitStatusType,
        src: "gb",
      }
    : {
        value: false,
        src: "default",
      };
}
//@ chunk-5xgkngpb.js:2902998-2903032 placement
/**
 * 读取"自动模式 git status 上传开关"的设置值。
 */
function autoModeGitStatusUploadsValue() {
  return getAutoModeGitStatusUploads().value;
}
//@ chunk-5xgkngpb.js:2903032-2903238 placement
function getAutoModeGitStatusUploads() {
  let CLAUDE_CODE_AUTO_MODE_GIT_STATUS_UPLOADS = antEnv.CLAUDE_CODE_AUTO_MODE_GIT_STATUS_UPLOADS;
  if (CLAUDE_CODE_AUTO_MODE_GIT_STATUS_UPLOADS !== undefined)
    return {
      value: CLAUDE_CODE_AUTO_MODE_GIT_STATUS_UPLOADS,
      src: "env",
    };
  let gitStatusUploads = getAutoModeConfigOrDefault()?.gitStatusUploads;
  return typeof gitStatusUploads === "boolean"
    ? {
        value: gitStatusUploads,
        src: "gb",
      }
    : {
        value: false,
        src: "default",
      };
}
//@ chunk-5xgkngpb.js:2903238-2903251 placement
var DEFAULT_GIT_STATUS_LIMIT = 2000;
//@ chunk-5xgkngpb.js:2903251-2903285 placement
/**
 * 读取"自动模式 git status 输出上限"的设置值。
 */
function autoModeGitStatusLimitValue() {
  return getAutoModeGitStatusLimit().value;
}
//@ chunk-5xgkngpb.js:2903285-2903517 placement
function getAutoModeGitStatusLimit() {
  let CLAUDE_CODE_AUTO_MODE_GIT_STATUS_LIMIT = antEnv.CLAUDE_CODE_AUTO_MODE_GIT_STATUS_LIMIT;
  if (CLAUDE_CODE_AUTO_MODE_GIT_STATUS_LIMIT !== undefined)
    return {
      value: CLAUDE_CODE_AUTO_MODE_GIT_STATUS_LIMIT,
      src: "env",
    };
  let gitStatusTruncationLimit = getAutoModeConfigOrDefault()?.gitStatusTruncationLimit;
  return typeof gitStatusTruncationLimit === "number" && Number.isFinite(gitStatusTruncationLimit)
    ? {
        value: gitStatusTruncationLimit,
        src: "gb",
      }
    : {
        value: DEFAULT_GIT_STATUS_LIMIT,
        src: "default",
      };
}
//@ chunk-5xgkngpb.js:2903517-2903793 layout
var DESTRUCTIVE_COMMAND_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GIT_STAGE_COMMIT_PUSH_PATTERN;
deferInit("chunk-5xgkngpb.js:2903517", () => {
  DESTRUCTIVE_COMMAND_KINDS = new Set([
    "git_reset_hard",
    "git_checkout_dot",
    "git_restore_dot",
    "git_clean_force",
    "rm_recursive_force",
    "rm_recursive",
    "rm_force",
    "remove_item_recursive_force",
    "remove_item_recursive",
    "remove_item_force",
    "clear_content_glob",
  ]);
  GIT_STAGE_COMMIT_PUSH_PATTERN = /\bgit\s+(?:add|stage|commit|push)\b/i;
});
//@ chunk-5xgkngpb.js:2903793-2903864 layout
function isGitStageCommitPushCommand(command) {
  let head = command.length > 1e4 ? command.slice(0, 1e4) : command;
  return GIT_STAGE_COMMIT_PUSH_PATTERN.test(head);
}
//@ chunk-5xgkngpb.js:2903864-2904077 layout
/**
 * 统计 porcelain 输出中的 staged、modified、untracked 文件数。
 */
function countPorcelainStatus(stdout) {
  let stagedCount = 0;
  let modifiedCount = 0;
  let untrackedCount = 0;
  for (let line of stdout.split(`
`)) {
    if (line.length < 2) continue;
    let indexStatus = line[0];
    let worktreeStatus = line[1];
    if (indexStatus === "?" && worktreeStatus === "?") {
      untrackedCount++;
      continue;
    }
    if (indexStatus !== " " && indexStatus !== "?") stagedCount++;
    if (worktreeStatus !== " ") modifiedCount++;
  }
  return {
    staged: stagedCount,
    modified: modifiedCount,
    untracked: untrackedCount,
  };
}
//@ chunk-5xgkngpb.js:2904077-2904356 layout
function truncateLinesToChars(text, maxChars) {
  let filtered = text
    .split(
      `
`,
    )
    .filter((line) => line.length > 0);
  if (maxChars <= 0)
    return filtered.join(`
`);
  let kept = "";
  let index = 0;
  for (; index < filtered.length; index++) {
    let lineWithNewline =
      (kept === ""
        ? ""
        : `
`) + filtered[index];
    if (kept.length + lineWithNewline.length > maxChars) break;
    kept += lineWithNewline;
  }
  let remainingLines = filtered.length - index;
  if (remainingLines === 0) return kept;
  let moreMarker = `\u2026[+${remainingLines} more lines]`;
  return kept === ""
    ? moreMarker
    : `${kept}
${moreMarker}`;
}
//@ chunk-5xgkngpb.js:2904356-2905255 fingerprint (2.1.88 match: getFileStatus, 0.353)
/**
 * Bash/PowerShell 工具执行破坏性命令（git reset --hard、rm -rf 等）或 git add/commit/push 时，取 git status --porcelain 摘要（clean / staged+modified+untracked 计数 / 截断的 porcelain 文本），随工具结果一起给模型；受两个开关控制。
 */
async function getGitStatusForDestructiveCommand(name, toolInput, abortSignal) {
  try {
    let statusEnabled = autoModeGitStatusSettingValue();
    let uploadsEnabled = autoModeGitStatusUploadsValue();
    if (!statusEnabled && !uploadsEnabled) return null;
    let isBash = name === BASH_TOOL_NAME;
    if ((!isBash && name !== POWERSHELL_TOOL_NAME) || isRemoteOnlyCheck(name)) return null;
    if (
      toolInput === null ||
      typeof toolInput !== "object" ||
      !("command" in toolInput) ||
      typeof toolInput.command !== "string"
    )
      return null;
    let destructiveKind = isBash
      ? getDestructiveTargetCategory(toolInput.command)
      : getPowerShellDestructiveCategory(toolInput.command);
    let wantsStatus =
      statusEnabled && destructiveKind !== null && DESTRUCTIVE_COMMAND_KINDS.has(destructiveKind);
    let wantsUpload = uploadsEnabled && isGitStageCommitPushCommand(toolInput.command);
    if (!wantsStatus && !wantsUpload) return null;
    let cwd = getCwd();
    if (findGitRoot(cwd) === null) return null;
    let statusResult = await runGitReadOnly(
      cwd,
      [
        "status",
        "--porcelain",
        IGNORE_SUBMODULES_DIRTY_FLAG,
        wantsUpload ? "--untracked-files=all" : "--untracked-files=normal",
      ],
      {
        abortSignal,
        userLocale: true,
      },
    );
    if (!statusResult.ok) return null;
    let stdout = statusResult.stdout;
    if (wantsUpload) {
      if (stdout.trim() === "")
        return wantsStatus
          ? {
              clean: true,
            }
          : null;
      let filtered = stdout
        .split(
          `
`,
        )
        .filter((line) => line.length > 0);
      let text = [
        ...filtered.filter((line) => line.startsWith("??")),
        ...filtered.filter((line) => !line.startsWith("??")),
      ].join(`
`);
      return {
        porcelain: truncateLinesToChars(text, autoModeGitStatusLimitValue()),
      };
    }
    let { staged, modified, untracked } = countPorcelainStatus(stdout);
    if (staged === 0 && modified === 0 && untracked === 0)
      return {
        clean: true,
      };
    return {
      staged,
      modified,
      untracked,
    };
  } catch {
    return null;
  }
}
//@ chunk-5xgkngpb.js:3746863-3747031 fingerprint (2.1.88 match: hasUnpushedCommits, 0.699)
/**
 * git rev-list --count <refs> ^<bases>，返回提交数或 null。
 */
async function hasUnpushedCommits_2(worktreePath, baseRefs, excludeRefs) {
  let countResult = await runGitInWorktree(worktreePath, [
    "rev-list",
    "--count",
    ...baseRefs,
    ...excludeRefs.map((ref) => `^${ref}`),
    "--",
  ]);
  let trimmed = countResult.stdout.trim();
  return countResult.code === 0 && /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}
//@ chunk-nh1pvp1m.js:127645-127841 fingerprint (2.1.88 match: getIsClean, 0.581)
var GIT_STATUS_CLEAN_ARGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GIT_STATUS_CLEAN_IGNORING_DIRTY_ARGS;
deferInit("chunk-nh1pvp1m.js:127645", () => {
  GIT_STATUS_CLEAN_ARGS = [
    "--no-optional-locks",
    "status",
    "--porcelain",
    "-z",
    "-uno",
    "--no-renames",
    "--ignore-submodules=all",
  ];
  GIT_STATUS_CLEAN_IGNORING_DIRTY_ARGS = [
    ...GIT_STATUS_CLEAN_ARGS.filter((arg) => !arg.startsWith("--ignore-submodules")),
    "--ignore-submodules=dirty",
  ];
});
//@ chunk-c7hntn0y.js:21734-21934 fingerprint (2.1.88 match: captureUntrackedFiles, 0.534)
/**
 * git ls-files --others --exclude-standard 列未跟踪文件，生成 diff 条目（区分会话前已存在的文件）。
 */
async function untrackedFiles(gitRunner, limits) {
  if (limits.slots <= 0) return [];
  let result = await gitRunner.run([
    NO_OPTIONAL_LOCKS,
    "ls-files",
    "-z",
    "--others",
    "--exclude-standard",
    "--full-name",
  ]);
  return isWholeAnswer(result)
    ? buildUntrackedFileEntries(
        gitRunner,
        result.stdout.split("\x00").filter((name) => name !== ""),
        limits,
      )
    : null;
}
//@ chunk-hma1b5gv.js:4121-4294 fingerprint (2.1.88 match: isCurrentDirectoryBareGitRepo, 0.806)
async function isCurrentDirectoryBareGitRepo_2(gitDir) {
  try {
    let [headStats, objectsStats, refsStats] = await Promise.all([
      lstat(join(gitDir, "HEAD")),
      lstat(join(gitDir, "objects")),
      lstat(join(gitDir, "refs")),
    ]);
    return headStats.isFile() && objectsStats.isDirectory() && refsStats.isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-s4mtq5zk.js:15480-15762 fingerprint (2.1.88 match: getChangedFiles, 0.79)
/**
 * git status --porcelain 限定给定路径，返回变更文件列表。
 */
async function getChangedFiles(gitRoot, paths) {
  let mapped = paths.map((path) => relative(gitRoot, path) || ".");
  let result = await execFileNoThrow(
    gitExe(),
    [
      "-C",
      gitRoot,
      "--no-optional-locks",
      "status",
      "--porcelain",
      IGNORE_SUBMODULES_DIRTY_FLAG,
      "--",
      ...mapped,
    ],
    {
      env: getRemoteHostSessionCount(undefined, {
        userLocale: true,
      }),
      useCwd: true,
    },
  );
  if (result.code !== 0) return [];
  return result.stdout
    .split(
      `
`,
    )
    .map((line) => line.slice(3).trim())
    .filter((line) => line.length > 0);
}
export {
  gitExe,
  findGitRoot,
  PLAIN_PATCH_FLAGS,
  RAW_BLOB_DIFF_FLAGS,
  findGitRootRecheckingNegative,
  getGitDir,
  getBranch,
  getDefaultBranch,
  getRepoRemoteHash,
  snapshotGitEvidenceForBridge,
  getGitPresenceForAnalytics,
  getIsGit,
  getWorktreeCount,
  findCanonicalGitRoot,
  isAbsolutePlatformPath,
  findGitRootUncached,
  findCanonicalGitRootUncached,
  normalizeCommandForPlatform,
  clearIsGitMemo,
  getGithubRepo,
  getFileStatus,
  getRemoteUrl,
  dirIsInGitRepo,
  forgetGitRootsUnder,
  isLinkedWorktree,
  readGitConfigValue,
  normalizeGitRemoteUrl,
  isCurrentDirectoryBareGitRepo,
  isGitArgMatchingFlagRule,
  hasDangerousGitGlobalOption,
  getGitSubcommandPath,
  SAFE_GIT_GLOBAL_FLAGS,
  getGitStatusForDestructiveCommand,
  isLinkedWorktreeUncached,
  toPowerShellRules,
  getGitPushRemotes,
  gitPushShellPatternsForRemotes,
  getLocalInterfaceAddresses,
  getIsClean,
  getGitSshEnv,
  redactGitRemoteCredentials,
  getDefaultBranchIfKnown,
  hasUnpushedCommits_2,
  findGitRootVerifyingPositive,
  readGlobalGitConfigValue,
  isBranchOnOrigin,
  getGitWorktreeName,
  isCcrGitProxySession,
  isLocalHost,
  findRepoRemoteSlug,
  primeGitRootMemo,
  seedGitRootMemo,
  getRemoteUrlForBridge,
  clearIsGitMemoFor,
  getGitState,
  untrackedFiles,
  findGitRootThroughBackendUncached,
  getHead,
  hasUnpushedCommits,
  isCurrentDirectoryBareGitRepo_2,
  runGitReadOnly,
  getChangedFiles,
  autoModeGitStatusSettingValue,
  autoModeGitStatusUploadsValue,
  autoModeGitStatusLimitValue,
  truncateLinesToChars,
  countPorcelainStatus,
  isHomeDirectoryGitRoot,
  getIsHeadOnRemote,
  isRepoConfigUnreadable,
  readRepoConfig,
  readRepoConfigText,
};
