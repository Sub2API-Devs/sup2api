/**
 * utils/git.ts
 *
 * git 根/主仓库根查找（不 spawn，带缓存）、gitExe、分支/默认分支/远程 URL、git config 读取、危险命令前的 status 摘要、teleport stash、worktree 分支状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/git.ts
 * pieces: chunk-0sfjpx19.js (1), chunk-1r5nz6dk.js (1), chunk-ca06bv0t.js (1), chunk-e6aww6q8.js (19), chunk-qmzcskz6.js (6), chunk-t0gq9gyw.js (60), chunk-wyqg6m3h.js (1)
 * attribution: fingerprint 12, affinity 1, placement 14, layout 17, facade-exports 44, sole-consumer 1
 */
import { resolve, sep, join, dirname, basename, isAbsolute, relative } from "path";
import { lstat, realpath } from "fs/promises";
import { readFileSync, realpathSync, lstatSync, statSync, accessSync, constants } from "fs";
import { homedir, hostname, networkInterfaces } from "os";
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
  BMt,
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
import { getPlatform } from "./platform.js";
import { getAutoModeConfigOrDefault } from "./permissions/permissionSetup.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../tools/PowerShellTool/toolName.js";
import { isRemoteOnlyCheck } from "./permissions/checkRegistry.js";
import { getDestructiveTargetCategory } from "../tools/BashTool/destructiveTargets.js";
import { getPowerShellDestructiveCategory } from "../tools/PowerShellTool/destructiveCommandWarning.js";
import { runGitInWorktree } from "./worktree.js";
import {
  foldWindowsPathComponent,
  SHORT_WINDOWS_PATH_CHARS,
  stripWin32DevicePrefix,
  WIN32_DEVICE_NAMESPACE_RE,
  POSIX_SEP,
  WIN32_UNC_HOST_RE,
  caseFoldKey,
  normalizeWindowsPathForCompare,
} from "./hooks/hookCommandAnalysis.js";
import {
  NO_OPTIONAL_LOCKS,
  isWholeAnswer,
  buildUntrackedFileEntries,
} from "../plugins/bundled/diffPane/gitDiffRead.js";

//@ chunk-t0gq9gyw.js:71536-72067 fingerprint = findGitRootImpl (0.914)
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
//@ chunk-t0gq9gyw.js:72067-72136 facade-exports
/**
 * findGitRoot：带 rootByPath 缓存的 git 根查找，未找到返回 null。
 */
function findGitRoot(e) {
  let n = memoizeMap(getGitRepoCache().rootByPath, e, findGitRootImpl);
  return n === REPO_NEGATIVE_RESULT ? null : n;
}
//@ chunk-t0gq9gyw.js:72136-72185 facade-exports
function findGitRootUncached(startPath) {
  let result = findGitRootImpl(startPath);
  return result === REPO_NEGATIVE_RESULT ? null : result;
}
//@ chunk-t0gq9gyw.js:72185-72540 facade-exports
async function findGitRootThroughBackendUncached(hostFiles, startPath) {
  if (isDiskless())
    return {
      gitRoot: null,
    };
  let r = resolve(startPath);
  let o = r.substring(0, r.indexOf(sep) + 1) || sep;
  for (;;) {
    let stats = await hostFiles.stat(PathSpace.workspace(join(r, ".git")), {
      follow: false,
    });
    if (!stats.ok || stats.value.kind === "link") return;
    if (stats.value.kind === "directory" || stats.value.kind === "file")
      return {
        gitRoot: identity(r),
        entry: stats.value.kind,
      };
    if (r === o)
      return {
        gitRoot: null,
      };
    let a = dirname(r);
    r = a === r ? o : a;
  }
}
//@ chunk-t0gq9gyw.js:72540-72621 facade-exports
function findGitRootRecheckingNegative(e) {
  let rootByPath = getGitRepoCache().rootByPath;
  if (rootByPath.peek(e) === REPO_NEGATIVE_RESULT) rootByPath.delete(e);
  return findGitRoot(e);
}
//@ chunk-t0gq9gyw.js:72621-72817 facade-exports
async function findGitRootVerifyingPositive(e) {
  let gitRootRecheckingNegative = findGitRootRecheckingNegative(e);
  if (gitRootRecheckingNegative === null) return null;
  try {
    await lstat(join(gitRootRecheckingNegative, ".git"));
    return gitRootRecheckingNegative;
  } catch (error) {
    let code = error?.code;
    if (code !== "ENOENT" && code !== "ENOTDIR") return gitRootRecheckingNegative;
    getGitRepoCache().rootByPath.delete(e);
    return findGitRootRecheckingNegative(e);
  }
}
//@ chunk-t0gq9gyw.js:72817-73139 facade-exports
/**
 * 删除位于某目录下的所有 git 相关缓存（git 根、canonical 根、remote slug、monorepo 判定、gitDir、repository 等），在目录被移动/删除后调用。
 */
function forgetGitRootsUnder(e) {
  let n = identity(resolve(e));
  let gitRepoCache = getGitRepoCache();
  for (let o of [
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
    for (let key of [...o.keys()]) if (isPathWithin(n, identity(resolve(key)))) o.delete(key);
}
//@ chunk-t0gq9gyw.js:73139-73211 layout
function getCanonicalRootUncached(gitRoot) {
  try {
    return resolveCanonicalRoot(gitRoot, readFileSync(join(gitRoot, ".git"), "utf-8"));
  } catch {
    return gitRoot;
  }
}
//@ chunk-t0gq9gyw.js:73211-73844 fingerprint = resolveCanonicalRoot (0.904)
/**
 * 解析 worktree 的 `.git` 文件内容（gitdir:），校验 commondir、worktrees/<name>/gitdir 回指与 realpath 一致后返回主仓库根；任何一步不可信都退回原根，防止伪造 .git 文件把路径引到别处。
 */
function resolveCanonicalRoot(e, n) {
  try {
    let gitContent = n.trim();
    if (!gitContent.startsWith("gitdir:")) return e;
    let trimmed = gitContent.slice(7).trim();
    if (isOnForeignMount(trimmed, e)) return e;
    if (rawPointerPathIsUnsafe(trimmed, e)) return e;
    let worktreeGitDir = resolve(e, trimmed);
    if (pointerFileIsSuspect(join(worktreeGitDir, "commondir"), worktreeGitDir)) return e;
    let trimmed_2 = readFileSync(join(worktreeGitDir, "commondir"), "utf-8").trim();
    if (isOnForeignMount(trimmed_2, worktreeGitDir)) return e;
    if (rawPointerPathIsUnsafe(trimmed_2, worktreeGitDir)) return e;
    let commonDir = resolve(worktreeGitDir, trimmed_2);
    if (resolve(dirname(worktreeGitDir)) !== join(commonDir, "worktrees")) return e;
    if (pointerFileIsSuspect(join(worktreeGitDir, "gitdir"), worktreeGitDir)) return e;
    let trimmed_3 = readFileSync(join(worktreeGitDir, "gitdir"), "utf-8").trim();
    if (isOnForeignMount(trimmed_3, e)) return e;
    if (rawPointerPathIsUnsafe(trimmed_3, worktreeGitDir, e)) return e;
    if (sep === "/" && [e, worktreeGitDir, trimmed_3, commonDir].some((y) => y.includes("\\"))) return e;
    if (realpathSync(resolve(worktreeGitDir, trimmed_3)) !== join(realpathSync(e), ".git")) return e;
    if (basename(commonDir) !== ".git") {
      if (isUsableGitEntry(join(commonDir, ".git"), commonDir)) return e;
      return identity(commonDir);
    }
    return identity(dirname(commonDir));
  } catch {
    return e;
  }
}
//@ chunk-t0gq9gyw.js:73844-73976 layout
async function resolveCanonicalRootOnHost(hostFiles, gitRoot) {
  let text = await hostFiles.readText(PathSpace.workspace(join(gitRoot, ".git")));
  if (!text.ok || !text.value.found) return;
  return resolveCanonicalRoot(gitRoot, text.value.value);
}
//@ chunk-t0gq9gyw.js:73976-74063 facade-exports
/**
 * findCanonicalGitRoot：git 根若是 linked worktree，则经 .git 文件的 gitdir/commondir 解析出主仓库根；结果缓存在 canonicalRootByRoot。
 */
function findCanonicalGitRoot(e) {
  let gitRoot = findGitRoot(e);
  if (!gitRoot) return null;
  return memoizeMap(getGitRepoCache().canonicalRootByRoot, gitRoot, getCanonicalRootUncached);
}
//@ chunk-t0gq9gyw.js:74063-74121 facade-exports
function findCanonicalGitRootUncached(e) {
  let gitRoot = findGitRootUncached(e);
  if (!gitRoot) return null;
  return getCanonicalRootUncached(gitRoot);
}
//@ chunk-t0gq9gyw.js:74121-74592 facade-exports
async function primeGitRootMemo(e, startPath) {
  if (e.hostFiles.serving("workspace") !== "host") return;
  let gitRepoCache = getGitRepoCache();
  let o = gitRepoCache.rootByPath.peek(startPath);
  if (o !== undefined) {
    let c = o === REPO_NEGATIVE_RESULT ? null : o;
    return {
      gitRoot: c,
      canonicalRoot: c === null ? null : gitRepoCache.canonicalRootByRoot.peek(c),
    };
  }
  let gitRootThroughBackendUncached = await findGitRootThroughBackendUncached(e.hostFiles, startPath);
  if (gitRootThroughBackendUncached === undefined) return;
  let a =
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
              : await resolveCanonicalRootOnHost(e.hostFiles, gitRootThroughBackendUncached.gitRoot),
        };
  seedGitRootMemo(startPath, a.gitRoot, a.canonicalRoot);
  return a;
}
//@ chunk-t0gq9gyw.js:74592-75090 facade-exports
/**
 * 用已知结果预填 git 根缓存（findGitRoot 与 canonical 根）；已有不同答案时保留旧值并告警。
 */
function seedGitRootMemo(e, gitRoot, canonicalRoot) {
  let gitRepoCache = getGitRepoCache();
  let s = gitRoot ?? REPO_NEGATIVE_RESULT;
  let a = gitRepoCache.rootByPath.peek(e);
  if (a === undefined) gitRepoCache.rootByPath.set(e, s);
  else if (a !== s) {
    logForDebugging(
      "git root prime: findGitRoot already holds a different answer for the start path; keeping the first",
      {
        level: "warn",
      },
    );
    return;
  }
  if (gitRoot === null || canonicalRoot === undefined || canonicalRoot === null) return;
  let c = gitRepoCache.canonicalRootByRoot.peek(gitRoot);
  if (c === undefined) gitRepoCache.canonicalRootByRoot.set(gitRoot, canonicalRoot);
  else if (c !== canonicalRoot)
    logForDebugging(
      "git root prime: findCanonicalGitRoot already holds a different answer for the root; keeping the first",
      {
        level: "warn",
      },
    );
}
//@ chunk-t0gq9gyw.js:75090-75144 facade-exports
/**
 * 当前路径是否在 linked worktree 中（git 根与 canonical 根不同）。
 */
function isLinkedWorktree(e) {
  let gitRoot = findGitRoot(e);
  return gitRoot !== null && findCanonicalGitRoot(e) !== gitRoot;
}
//@ chunk-t0gq9gyw.js:75144-75199 facade-exports
function isLinkedWorktreeUncached(canonical) {
  let gitRoot = findGitRootUncached(canonical);
  return gitRoot !== null && getCanonicalRootUncached(gitRoot) !== gitRoot;
}
//@ chunk-t0gq9gyw.js:75199-75331 facade-exports
/**
 * 若 git dir 位于 <common>/worktrees/<name> 下，返回 worktree 名。
 */
async function getGitWorktreeName(e) {
  if (isRemoteSessionAvailable()) return null;
  let gitDir = await resolveGitDir(e);
  if (!gitDir || basename(gitDir) === ".git" || basename(dirname(gitDir)) !== "worktrees") return null;
  return basename(gitDir);
}
//@ chunk-t0gq9gyw.js:75331-75448 facade-exports
var RAW_BLOB_DIFF_FLAGS = ["--no-ext-diff", "--no-textconv"];
var PLAIN_PATCH_FLAGS = ["--no-color", "--src-prefix=a/", "--dst-prefix=b/", "--submodule=short"];
//@ chunk-t0gq9gyw.js:75448-75821 facade-exports
/**
 * gitExe：返回要执行的 git 可执行文件（which git 结果缓存，Windows 下识别启动器后的真实程序），diskless 时为 "git"。
 */
function gitExe() {
  if (isDiskless()) return "git";
  let gitRepoCache = getGitRepoCache();
  gitRepoCache.gitExecutable ??= bunWhichSync("git") || "git";
  if (gitRepoCache.gitLauncherProbe === null) {
    let gitExecutable = gitRepoCache.gitExecutable;
    let o = probeGitLauncher(gitExecutable).then((s) => {
      if (s !== null && gitRepoCache.gitLauncherProbe === o)
        gitRepoCache.gitBehindLauncher = {
          launcher: gitExecutable,
          program: s,
        };
    }, logError);
    gitRepoCache.gitLauncherProbe = o;
  }
  let gitBehindLauncher = gitRepoCache.gitBehindLauncher;
  return gitBehindLauncher?.launcher === gitRepoCache.gitExecutable && process.env.MSYSTEM === undefined
    ? gitBehindLauncher.program
    : gitRepoCache.gitExecutable;
}
//@ chunk-t0gq9gyw.js:75821-75849 layout
var MSYS_GIT_SUBDIRS = ["mingw64", "ucrt64"];
//@ chunk-t0gq9gyw.js:75849-75882 layout
async function probeGitLauncher(gitExecutable) {
  return null;
}
//@ chunk-t0gq9gyw.js:75882-75909 layout
var isGitCacheBySession = new SessionRootSlot(() => new Map());
//@ chunk-t0gq9gyw.js:75909-76095 fingerprint = getIsGit (1)
/**
 * 当前 cwd 是否在 git 仓库内（基于 findGitRoot，不 spawn），打 is_git_check_* 诊断日志。
 */
async function getIsGit_2() {
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "is_git_check_started");
  let cwdOrNull = getCwdOrNull();
  let r = cwdOrNull !== null && findGitRoot(cwdOrNull) !== null;
  logForDiagnosticsNoPII("info", "is_git_check_completed", {
    duration_ms: Date.now() - startTime,
    is_git: r,
  });
  return r;
}
//@ chunk-t0gq9gyw.js:76095-76120 layout
function getCurrentHost() {
  return getRootSession();
}
//@ chunk-t0gq9gyw.js:76120-76223 facade-exports
/**
 * 按会话缓存 getIsGit() 的 promise。
 */
function getIsGit() {
  let e = isGitCacheBySession.of(getCurrentHost());
  let sessionId = getSessionId();
  let r = e.get(sessionId);
  if (r !== undefined) return r;
  let isGit = getIsGit_2();
  e.set(sessionId, isGit);
  return isGit;
}
//@ chunk-t0gq9gyw.js:76223-76288 facade-exports
function clearIsGitMemoFor(e) {
  isGitCacheBySession.of(e).clear();
  getGitRepoCache().diffCheckoutIsRepo.clear();
}
//@ chunk-t0gq9gyw.js:76288-76313 facade-exports
function clearIsGitMemo() {
  clearIsGitMemoFor(getCurrentHost());
}
//@ chunk-t0gq9gyw.js:76313-76341 facade-exports
function getGitDir(e) {
  return resolveGitDir(e);
}
//@ chunk-t0gq9gyw.js:76341-76599 facade-exports = preserveGitStateForIssue (0.512)
/**
 * dirIsInGitRepo 及同语句的 getHead（读缓存的 HEAD sha）、getBranch（git rev-parse --abbrev-ref HEAD，失败为 "HEAD"）。
 */
var dirIsInGitRepo = async (cwd) => findGitRoot(cwd) !== null;
var getHead = async () => getCachedHead();
var getBranch = async (
  e,
  n = {
    env: getRemoteHostSessionCount(),
  },
) => {
  if (e === undefined) return getCachedBranch();
  let { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--abbrev-ref", "HEAD"],
    {
      cwd: e,
      preserveOutputOnError: false,
      ...n,
    },
  );
  return code === 0 ? stdout.trim() || "HEAD" : "HEAD";
};
//@ chunk-t0gq9gyw.js:76599-76770 facade-exports
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
//@ chunk-t0gq9gyw.js:76770-77468 facade-exports
/**
 * getDefaultBranch：先读 refs/remotes/origin/HEAD 指向的分支并确认存在，否则依次尝试 main/master 的远程分支，最后默认 "main"。不带目录时读 GitFileWatcher 的缓存。
 */
var getDefaultBranch = async (
  e,
  n = {
    env: getRemoteHostSessionCount(),
  },
) => {
  if (e === undefined) return getCachedDefaultBranch();
  let defaultBranchIfKnown = await getDefaultBranchIfKnown(e, n);
  if (defaultBranchIfKnown) return defaultBranchIfKnown;
  for (let o of CONVENTIONAL_DEFAULT_BRANCH_NAMES)
    if (
      (
        await execFileNoThrowWithCwd(
          gitExe(),
          [...GIT_SAFE_GLOBAL_ARGS, "show-ref", "--verify", "--quiet", `refs/remotes/origin/${o}`],
          {
            cwd: e,
            preserveOutputOnError: false,
            ...n,
          },
        )
      ).code === 0
    )
      return o;
  return "main";
};
var getDefaultBranchIfKnown = async (
  e,
  n = {
    env: getRemoteHostSessionCount(),
  },
) => {
  let { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "symbolic-ref", "--short", "refs/remotes/origin/HEAD"],
    {
      cwd: e ?? getCwd(),
      preserveOutputOnError: false,
      ...n,
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
        cwd: e ?? getCwd(),
        preserveOutputOnError: false,
        ...n,
      },
    )
  ).code === 0
    ? replaced
    : null;
};
var BRANCH_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
//@ chunk-t0gq9gyw.js:77468-77660 facade-exports
/**
 * git config --get <key>（cwd 仓库），无值返回 null。
 */
async function readGitConfigValue(e) {
  let { stdout, code } = await execFileNoThrow(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "config", "--get", e], {
    preserveOutputOnError: false,
    useCwd: true,
    env: getRemoteHostSessionCount(),
  });
  if (code !== 0) return null;
  let trimmed = stdout.trim();
  return trimmed.length > 0 ? trimmed : null;
}
//@ chunk-t0gq9gyw.js:77660-77856 facade-exports
/**
 * git config --global --includes --get <key>。
 */
async function readGlobalGitConfigValue(e, cwd) {
  let { stdout, code } = await execFileNoThrow(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "config", "--global", "--includes", "--get", e],
    {
      preserveOutputOnError: false,
      cwd,
      env: getRemoteHostSessionCount(),
    },
  );
  let trimmed = stdout.trim();
  return code === 0 && trimmed.length > 0 ? trimmed : null;
}
//@ chunk-t0gq9gyw.js:77856-77990 layout
async function getPushRemote(e) {
  let gitConfigValue = await readGitConfigValue("remote.pushDefault");
  if (gitConfigValue && e.includes(gitConfigValue)) return gitConfigValue;
  if (e.length === 1) return e[0] ?? null;
  return null;
}
//@ chunk-t0gq9gyw.js:77990-78289 facade-exports
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
  let filtered = stdout
    .split(
      `
`,
    )
    .map((line) => line.trim())
    .filter(Boolean);
  let o = new Set();
  if (filtered.includes("origin")) o.add("origin");
  let pushRemote = await getPushRemote(filtered);
  if (pushRemote && BRANCH_NAME_RE.test(pushRemote)) o.add(pushRemote);
  return [...o];
}
//@ chunk-t0gq9gyw.js:78289-78369 facade-exports
/**
 * 为远程生成 `git push <r> *`、`git push -u <r> *` 权限规则模式。
 */
function gitPushShellPatternsForRemotes(gitPushRemotes) {
  return gitPushRemotes.flatMap((n) => [`git push ${n} *`, `git push -u ${n} *`]);
}
//@ chunk-t0gq9gyw.js:78369-78444 facade-exports
function toPowerShellRules(e) {
  return stripCheckoutBaseRule(bashAndPowerShellRules(e)).filter((n) => n.startsWith("PowerShell("));
}
//@ chunk-t0gq9gyw.js:78444-78566 facade-exports
/**
 * getRemoteUrl：GitFileWatcher 缓存的 origin URL；同语句 $lo 在仓库根是 home 目录时返回 null（避免把 dotfiles 仓库当项目）。
 */
var getRemoteUrl = async () => getCachedRemoteUrl();
var getRemoteUrlForBridge = async () => {
  let cwdOrNull = getCwdOrNull();
  let n = cwdOrNull === null ? null : findGitRoot(cwdOrNull);
  if (n === null || (await isHomeDirectoryGitRoot(n))) return null;
  return getCachedRemoteUrl();
};
//@ chunk-t0gq9gyw.js:78566-78728 facade-exports
/**
 * 路径是否就是 home 目录（含 realpath 比较）。
 */
async function isHomeDirectoryGitRoot(e) {
  let n;
  try {
    n = homedir();
  } catch {
    return false;
  }
  if (!n) return false;
  if (e === identity(resolve(n))) return true;
  let r = await realpath(n).then(
    (o) => identity(o),
    () => null,
  );
  return r !== null && e === r;
}
//@ chunk-t0gq9gyw.js:78728-78842 facade-exports
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
//@ chunk-t0gq9gyw.js:78842-78910 facade-exports
/**
 * 把 URL 中的 user:pass@ 凭证替换为 ***@，用于日志。
 */
function redactGitRemoteCredentials(remoteUrl) {
  return remoteUrl == null ? remoteUrl : remoteUrl.replace(/:\/\/[^/]*@/, "://***@");
}
//@ chunk-t0gq9gyw.js:78910-79453 facade-exports = normalizeGitRemoteUrl (1)
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
//@ chunk-t0gq9gyw.js:79453-79888 layout
/**
 * 按远程 URL 的主机名把 git 托管平台归类为 github、ghe、gitlab、bitbucket、azure、other 或 none。
 */
function classifyGitHost(e) {
  let n = e ? firstLineOf(e, ":").toLowerCase() : null;
  if (!n) return "none";
  if (isGithubDotCom(n) || n.endsWith(`.${GITHUB_HOST}`)) return "github";
  if (n.endsWith(".ghe.com") || n.includes("github")) return "ghe";
  if (n === "gitlab.com" || n.includes("gitlab")) return "gitlab";
  if (n === "bitbucket.org" || n.includes("bitbucket")) return "bitbucket";
  if (
    n === "dev.azure.com" ||
    n === "ssh.dev.azure.com" ||
    n.endsWith(".visualstudio.com") ||
    n.endsWith(".azure.com")
  )
    return "azure";
  return "other";
}
//@ chunk-t0gq9gyw.js:79888-80083 facade-exports
async function getGitPresenceForAnalytics() {
  if (isRemoteSessionAvailable()) return null;
  let [e, n] = await Promise.all([getIsGit(), getRemoteUrl()]).catch(() => [false, null]);
  let r = n ? normalizeGitRemoteUrl(n) : null;
  return {
    is_git: e,
    has_remote: r !== null,
    remote_host_class: classifyGitHost(r ? firstLineOf(r, "/") : null),
  };
}
//@ chunk-t0gq9gyw.js:80537-80591 sole-consumer
function getRemoteUrlForDirCached(e) {
  return memoizeMap(getGitRepoCache().remoteSlugByRoot, e, getRemoteUrlForDir_2);
}
//@ chunk-t0gq9gyw.js:80591-80653 facade-exports
function findRepoRemoteSlug(canonicalGitRoot) {
  let remoteUrlForDir = getRemoteUrlForDirCached(canonicalGitRoot);
  return typeof remoteUrlForDir === "string" ? remoteUrlForDir : null;
}
//@ chunk-t0gq9gyw.js:80653-80687 facade-exports
function isRepoConfigUnreadable(e) {
  return getRemoteUrlForDirCached(e) === REPO_UNREADABLE_RESULT;
}
//@ chunk-t0gq9gyw.js:80687-80701 layout
var MAX_REPO_CONFIG_BYTES = 128000;
//@ chunk-t0gq9gyw.js:80701-80973 facade-exports
function readRepoConfig(e, n) {
  try {
    let r = true;
    try {
      if (lstatSync(join(e, ".git")).isFile())
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
      r = false;
    }
    let o = r ? join(e, ".git") : e;
    let smallTextFile = readSmallTextFile(join(o, "config"), e, n);
    return smallTextFile.ok
      ? {
          ...smallTextFile,
          gitDir: o,
        }
      : smallTextFile;
  } catch {
    return {
      ok: false,
      cause: "read_failed",
    };
  }
}
//@ chunk-t0gq9gyw.js:80973-81214 layout
function readSmallTextFile(e, n, r) {
  if (readPositionIsUnsafe(e, n))
    return {
      ok: false,
      cause: "unsafe_path",
    };
  let o = statSync(e);
  if (!o.isFile())
    return {
      ok: false,
      cause: "not_a_file",
    };
  if (o.size > r)
    return {
      ok: false,
      cause: "oversize",
    };
  let file = readFileSync(e, "utf-8");
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
//@ chunk-t0gq9gyw.js:81214-81296 facade-exports
function readRepoConfigText(e) {
  let repoConfig = readRepoConfig(e, MAX_REPO_CONFIG_BYTES);
  return repoConfig.ok && !repoConfig.text.includes("\x00") ? repoConfig.text : null;
}
//@ chunk-t0gq9gyw.js:81296-81444 facade-exports = getServerKey (1)
async function getRepoRemoteHash() {
  let remoteUrl = await getRemoteUrl();
  if (!remoteUrl) return null;
  let configJson = normalizeGitRemoteUrl(remoteUrl);
  if (!configJson) return null;
  return createHash("sha256").update(configJson).digest("hex").substring(0, 16);
}
//@ chunk-t0gq9gyw.js:81444-82405 facade-exports
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
var getIsClean = async (e) => {
  let n = [
    ...GIT_SAFE_GLOBAL_ARGS,
    "--no-optional-locks",
    "status",
    "--porcelain",
    IGNORE_SUBMODULES_DIRTY_FLAG,
  ];
  if (e?.ignoreUntracked) n.push("-uno");
  let { stdout } = await execFileNoThrow(gitExe(), n, {
    preserveOutputOnError: false,
    env: getRemoteHostSessionCount(undefined, {
      userLocale: true,
    }),
  });
  return stdout.trim().length === 0;
};
var getFileStatus = async (
  e,
  env = getRemoteHostSessionCount(undefined, {
    userLocale: true,
  }),
) => {
  let r = [
    ...GIT_SAFE_GLOBAL_ARGS,
    "--no-optional-locks",
    "status",
    "--porcelain",
    IGNORE_SUBMODULES_DIRTY_FLAG,
  ];
  let { stdout } =
    e === undefined
      ? await execFileNoThrow(gitExe(), r, {
          preserveOutputOnError: false,
          env,
        })
      : await execFileNoThrowWithCwd(gitExe(), r, {
          cwd: e,
          preserveOutputOnError: false,
          env,
        });
  let s = [];
  let a = [];
  stdout
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .forEach((line) => {
      let u = line.substring(0, 2);
      let p = line.substring(3);
      if (u === "??") a.push(p);
      else if (p) s.push(p);
    });
  return {
    tracked: s,
    untracked: a,
  };
};
var getWorktreeCount = async () => getWorktreeCountFromFs();
//@ chunk-t0gq9gyw.js:82405-82685 facade-exports = getGitState (0.748)
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
//@ chunk-t0gq9gyw.js:82685-82968 facade-exports = getGithubRepo (0.763)
/**
 * 从 origin URL 解析 GitHub owner/repo，非 GitHub 返回 null。
 */
async function getGithubRepo() {
  let { parseGitRemote } = await import("./chunk-zqrznfbt.js");
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
//@ chunk-t0gq9gyw.js:82968-83093 facade-exports
function isCcrGitProxySession() {
  return (
    env.CLAUDE_CODE_REMOTE ||
    (isSelfAddressableSessionId(env.CLAUDE_CODE_REMOTE_SESSION_ID ?? "") &&
      env.CLAUDE_CODE_ENVIRONMENT_KIND === undefined)
  );
}
//@ chunk-t0gq9gyw.js:83093-83283 facade-exports = isLocalHost (1)
function isLocalHost(host) {
  let index = host.indexOf(":");
  let r = index === -1 ? host : host.slice(0, index);
  let o = index === -1 ? "" : host.slice(index + 1);
  if (o !== "" && !/^\d+$/.test(o)) return false;
  return r === "localhost" || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(r);
}
//@ chunk-t0gq9gyw.js:83283-83295 layout
var MAX_LINK_TARGET_BYTES = 4096;
//@ chunk-t0gq9gyw.js:83295-83859 layout
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
//@ chunk-t0gq9gyw.js:83859-86395 facade-exports
function isCurrentDirectoryBareGitRepo() {
  let fsImplementation = getFsImplementation();
  let cwd = getCwd();
  let r = resolvePathWithoutSymlinks(fsImplementation, cwd, cwd) ?? cwd;
  r = r.normalize("NFC").toLowerCase();
  let o = r.endsWith(sep) ? r : r + sep;
  let s = (h) => {
    let lower = h.toLowerCase();
    return lower === r || lower.startsWith(o);
  };
  function a(path) {
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
  function c(canonical, crossOs) {
    if (!crossOs && s(canonical)) return true;
    for (let v of canonical.split(crossOs ? /[\\/]+/ : sep)) if (v.toLowerCase() === ".git") return false;
    return true;
  }
  function u(canonical) {
    try {
      let b = fsImplementation.lstatSync(join(canonical, "HEAD"));
      if (!b.isFile() || b.size > 4096) return false;
      let sliced = readFileSync(join(canonical, "HEAD"), "utf8").slice(0, 255);
      return /^ref:[ \t]*refs\//.test(sliced) || /^[0-9a-f]{40}([0-9a-f]{24})?[ \t\n\r]*$/.test(sliced);
    } catch {
      return false;
    }
  }
  function p(h) {
    try {
      let b = join(h, "HEAD");
      let v = fsImplementation.lstatSync(b);
      if (!v.isFile() || v.size > 4096) return false;
      let sliced = readFileSync(b, "utf8").slice(0, 255);
      if (!/^ref:[ \t]*refs\//.test(sliced) && !/^[0-9a-f]{40}([0-9a-f]{24})?[ \t\n\r]*$/.test(sliced))
        return false;
      for (let R of ["objects", "refs"]) {
        let L = join(h, R);
        if (!fsImplementation.statSync(L).isDirectory()) return false;
        accessSync(L, constants.X_OK);
      }
      try {
        fsImplementation.statSync(join(h, "commondir"));
        return false;
      } catch {}
      return true;
    } catch {
      return false;
    }
  }
  function y(h) {
    try {
      let b = fsImplementation.lstatSync(join(h, "HEAD"));
      if (b.isFile() || b.isSymbolicLink()) return true;
    } catch {}
    for (let b of ["objects", "refs"])
      try {
        fsImplementation.statSync(join(h, b));
        return true;
      } catch {}
    return false;
  }
  function w(h) {
    let b = (v) => {
      let _ = a(v);
      if (_ === null) {
        logFeatureSad("git_bare_repo_gate", "gitdir_target_uncanonical");
        return "plantable";
      }
      if (c(_.canonical, _.crossOs)) {
        logFeatureSad("git_bare_repo_gate", "gitdir_target_plantable");
        return "plantable";
      }
      return u(_.canonical) ? "trusted" : "none";
    };
    try {
      let v = fsImplementation.lstatSync(join(h, ".git"));
      if (v.isSymbolicLink()) {
        let _;
        try {
          _ = fsImplementation.readlinkSync(join(h, ".git"));
        } catch {
          return "plantable";
        }
        return b(isAbsolute(_) ? _ : h + sep + _);
      }
      if (v.isFile()) {
        if (v.size > MAX_LINK_TARGET_BYTES) return "oversized";
        try {
          let file = readFileSync(join(h, ".git"), "utf8");
          if (file.includes("\x00")) return "plantable";
          if (!file.startsWith("gitdir: ")) return "none";
          let replaced = file.slice(8).replace(/[\r\n]+$/, "");
          return b(isAbsolute(replaced) ? replaced : h + sep + replaced);
        } catch {
          return "none";
        }
      }
      if (v.isDirectory()) return p(join(h, ".git")) ? "trusted" : "none";
    } catch {}
    return "none";
  }
  switch (w(cwd)) {
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
  let E = cwd;
  for (;;) {
    if (y(E)) {
      logFeatureSad("git_bare_repo_gate", "bare_indicators");
      return "bare-indicators";
    }
    let h = dirname(E);
    if (h === E) break;
    switch (w(h)) {
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
    E = h;
  }
  logFeatureOk("git_bare_repo_gate");
  return false;
}
//@ chunk-e6aww6q8.js:1257182-1257363 affinity
function getGitSubcommandPath(e) {
  let n = [];
  let sliced = e.slice(1);
  for (let [s, h] of sliced.entries()) {
    if (h.startsWith("-")) continue;
    let y = s === 0 ? undefined : sliced[s - 1];
    n.push(h);
    if (y === undefined || !y.startsWith("-")) break;
  }
  return n;
}
//@ chunk-e6aww6q8.js:1257363-1257695 fingerprint = gitExe (1)
function isGitArgMatchingFlagRule(e, n) {
  let r = getOwn(GIT_SUBCOMMAND_EXCLUSIONS, e);
  if (r === undefined) return false;
  let s = e === "git" && isSubcommandExclusionEnabled() ? [...r, PYTHON_SUBCOMMAND_EXCLUSIONS] : r;
  let mapped = getGitSubcommandPath(n).map(normalizeConfigKey);
  let y = SUBCOMMAND_PROGRAMS_2.has(e);
  return s.some(([S, w]) => {
    let found = mapped.find((Z) => w.includes(Z));
    if (found === undefined) return false;
    let matches = /^-[A-Za-z]$/.test(S);
    let q = getOwn(GIT_UNSAFE_CONFIG_KEYS, found) ?? [];
    return n.some(
      (Z) =>
        Z === S || (S.startsWith("-") && (Z.startsWith(S) || optionMatchesRule(Z, S, false, matches, q, y))),
    );
  });
}
//@ chunk-e6aww6q8.js:1260478-1260686 fingerprint = getIsHeadOnRemote (0.489)
function hasDangerousGitGlobalOption(e, n) {
  let gitSubcommandIndex = findGitSubcommandIndex(e);
  return (
    e[gitSubcommandIndex] === "rev-parse" &&
    getGitSubcommandPath(e)[0] === "rev-parse" &&
    e.slice(1, gitSubcommandIndex).every((y) => SAFE_GIT_GLOBAL_FLAGS.has(y)) &&
    !/[$`]/.test(n)
      ? e.slice(1, gitSubcommandIndex)
      : e.slice(1)
  ).some((y) => GIT_LONG_GLOBAL_OPTIONS.some((S) => optionMatchesRule(y, S, false, false, [], true)));
}
//@ chunk-e6aww6q8.js:1260686-1260971 placement
var SAFE_GIT_GLOBAL_FLAGS = new Set([
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
//@ chunk-e6aww6q8.js:1874180-1874593 placement
/**
 * 为 git 网络操作构建环境：固定 git 目录、读取 sshCommand 配置；非 Windows 且未显式设置时禁止 SSH_ASKPASS，始终脱离控制终端。
 */
async function getGitSshEnv(e) {
  if (isDiskless())
    return {
      env: withGitNoPromptEnv(),
      withoutControllingTerminal: true,
    };
  let n = withPinnedGitDirEnv(withGitNoPromptEnv(), e);
  let sshCommandConfig = await readSshCommandConfig(n, async (y) => {
    let { code, stdout } = await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...y], {
      cwd: e,
      env: n,
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
//@ chunk-e6aww6q8.js:2833370-2833884 placement
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
    let result = await execFileNoThrowWithCwd(gitExe(), [...BMt, "--no-optional-locks", ...args], {
      cwd,
      env: getRemoteHostSessionCount(undefined, {
        userLocale,
      }),
      timeout: GIT_CONFIG_PARAMETERS_LIMIT,
      abortSignal,
      maxBuffer: 1e6,
      preserveOutputOnError: false,
      useToolMemoryCgroup: false,
    });
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
//@ chunk-e6aww6q8.js:2833884-2833918 placement
/**
 * 读取"自动模式 git status 开关"的设置值。
 */
function autoModeGitStatusSettingValue() {
  return getAutoModeGitStatusSetting().value;
}
//@ chunk-e6aww6q8.js:2833918-2834113 placement
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
//@ chunk-e6aww6q8.js:2834113-2834147 placement
/**
 * 读取"自动模式 git status 上传开关"的设置值。
 */
function autoModeGitStatusUploadsValue() {
  return getAutoModeGitStatusUploads().value;
}
//@ chunk-e6aww6q8.js:2834147-2834353 placement
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
//@ chunk-e6aww6q8.js:2834353-2834366 placement
var DEFAULT_GIT_STATUS_LIMIT = 2000;
//@ chunk-e6aww6q8.js:2834366-2834400 placement
/**
 * 读取"自动模式 git status 输出上限"的设置值。
 */
function autoModeGitStatusLimitValue() {
  return getAutoModeGitStatusLimit().value;
}
//@ chunk-e6aww6q8.js:2834400-2834632 placement
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
//@ chunk-e6aww6q8.js:2834632-2834908 layout
var DESTRUCTIVE_COMMAND_KINDS = new Set([
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
var GIT_STAGE_COMMIT_PUSH_PATTERN = /\bgit\s+(?:add|stage|commit|push)\b/i;
//@ chunk-e6aww6q8.js:2834908-2834979 layout
function isGitStageCommitPushCommand(command) {
  let n = command.length > 1e4 ? command.slice(0, 1e4) : command;
  return GIT_STAGE_COMMIT_PUSH_PATTERN.test(n);
}
//@ chunk-e6aww6q8.js:2834979-2835192 layout
/**
 * 统计 porcelain 输出中的 staged、modified、untracked 文件数。
 */
function countPorcelainStatus(stdout) {
  let n = 0;
  let r = 0;
  let s = 0;
  for (let line of stdout.split(`
`)) {
    if (line.length < 2) continue;
    let y = line[0];
    let S = line[1];
    if (y === "?" && S === "?") {
      s++;
      continue;
    }
    if (y !== " " && y !== "?") n++;
    if (S !== " ") r++;
  }
  return {
    staged: n,
    modified: r,
    untracked: s,
  };
}
//@ chunk-e6aww6q8.js:2835192-2835471 layout
function truncateLinesToChars(e, n) {
  let filtered = e
    .split(
      `
`,
    )
    .filter((line) => line.length > 0);
  if (n <= 0)
    return filtered.join(`
`);
  let s = "";
  let h = 0;
  for (; h < filtered.length; h++) {
    let w =
      (s === ""
        ? ""
        : `
`) + filtered[h];
    if (s.length + w.length > n) break;
    s += w;
  }
  let y = filtered.length - h;
  if (y === 0) return s;
  let S = `\u2026[+${y} more lines]`;
  return s === ""
    ? S
    : `${s}
${S}`;
}
//@ chunk-e6aww6q8.js:2835471-2836366 fingerprint = getFileStatus (0.353)
/**
 * Bash/PowerShell 工具执行破坏性命令（git reset --hard、rm -rf 等）或 git add/commit/push 时，取 git status --porcelain 摘要（clean / staged+modified+untracked 计数 / 截断的 porcelain 文本），随工具结果一起给模型；受两个开关控制。
 */
async function getGitStatusForDestructiveCommand(name, n, abortSignal) {
  try {
    let s = autoModeGitStatusSettingValue();
    let h = autoModeGitStatusUploadsValue();
    if (!s && !h) return null;
    let y = name === BASH_TOOL_NAME;
    if ((!y && name !== POWERSHELL_TOOL_NAME) || isRemoteOnlyCheck(name)) return null;
    if (n === null || typeof n !== "object" || !("command" in n) || typeof n.command !== "string")
      return null;
    let S = y ? getDestructiveTargetCategory(n.command) : getPowerShellDestructiveCategory(n.command);
    let w = s && S !== null && DESTRUCTIVE_COMMAND_KINDS.has(S);
    let L = h && isGitStageCommitPushCommand(n.command);
    if (!w && !L) return null;
    let cwd = getCwd();
    if (findGitRoot(cwd) === null) return null;
    let q = await runGitReadOnly(
      cwd,
      [
        "status",
        "--porcelain",
        IGNORE_SUBMODULES_DIRTY_FLAG,
        L ? "--untracked-files=all" : "--untracked-files=normal",
      ],
      {
        abortSignal,
        userLocale: true,
      },
    );
    if (!q.ok) return null;
    let stdout = q.stdout;
    if (L) {
      if (stdout.trim() === "")
        return w
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
      let joined = [
        ...filtered.filter((line) => line.startsWith("??")),
        ...filtered.filter((line) => !line.startsWith("??")),
      ].join(`
`);
      return {
        porcelain: truncateLinesToChars(joined, autoModeGitStatusLimitValue()),
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
//@ chunk-e6aww6q8.js:3651488-3651656 fingerprint = hasUnpushedCommits (0.699)
/**
 * git rev-list --count <refs> ^<bases>，返回提交数或 null。
 */
async function hasUnpushedCommits_2(worktreePath, n, r) {
  let s = await runGitInWorktree(worktreePath, ["rev-list", "--count", ...n, ...r.map((y) => `^${y}`), "--"]);
  let trimmed = s.stdout.trim();
  return s.code === 0 && /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}
//@ chunk-qmzcskz6.js:7821-8135 fingerprint = isLocalHost (1)
/**
 * 判断主机名是否指向本机（localhost、127.x、本机 hostname 及其短名、本机网卡 IP/ipv6-literal.net 形式）。
 */
function isLocalHost_2(e, t = true) {
  let replaced = e.toLowerCase().replace(/\.$/, "");
  let r = getPlatform() === "windows";
  let l = r && t ? foldWindowsPathComponent : (i) => i.toLowerCase();
  let s = l(hostname());
  let o = firstLineOf(s, ".");
  return (
    replaced === "localhost" ||
    /^127(?:\.\d{1,3}){3}$/.test(replaced) ||
    replaced === s ||
    (r &&
      (replaced === o ||
        (t &&
          (replaced === o.slice(0, SHORT_WINDOWS_PATH_CHARS) ||
            replaced === l(firstLineOf(hostname(), ".").slice(0, SHORT_WINDOWS_PATH_CHARS)))))) ||
    replaced.startsWith(`${o}.`) ||
    (IP_LITERAL_PATTERN.test(replaced) && (getLocalInterfaceAddresses()?.has(replaced) ?? t))
  );
}
//@ chunk-qmzcskz6.js:8135-8191 layout
var IP_LITERAL_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$|\.ipv6-literal\.net$/;
//@ chunk-qmzcskz6.js:8191-8416 placement
function getLocalInterfaceAddresses() {
  let networkInterfaces = getNetworkInterfacesSafe();
  if (networkInterfaces === null) return null;
  return new Set(
    Object.values(networkInterfaces).flatMap((t) =>
      (t ?? []).flatMap(({ address }) => [
        address.toLowerCase(),
        `${address.toLowerCase().replaceAll(":", "-").replaceAll("%", "s")}.ipv6-literal.net`,
      ]),
    ),
  );
}
//@ chunk-qmzcskz6.js:8416-8465 placement
function getNetworkInterfacesSafe() {
  try {
    return networkInterfaces();
  } catch {
    return null;
  }
}
//@ chunk-qmzcskz6.js:8465-8581 placement
/**
 * 判断路径在当前平台是否为绝对路径（Windows 下识别盘符与 UNC 形式）。
 */
function isAbsolutePlatformPath(e) {
  if (getPlatform() !== "windows") return e.startsWith("/");
  let t = stripWin32DevicePrefix(e);
  return !WIN32_DEVICE_NAMESPACE_RE.test(t) && (POSIX_SEP.test(t) || WIN32_UNC_HOST_RE.test(t));
}
//@ chunk-qmzcskz6.js:8581-8678 placement = getReservedShortcuts (1)
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
//@ chunk-0sfjpx19.js:132639-132835 fingerprint = getIsClean (0.581)
var GIT_STATUS_CLEAN_ARGS = [
  "--no-optional-locks",
  "status",
  "--porcelain",
  "-z",
  "-uno",
  "--no-renames",
  "--ignore-submodules=all",
];
var GIT_STATUS_CLEAN_IGNORING_DIRTY_ARGS = [
  ...GIT_STATUS_CLEAN_ARGS.filter((e) => !e.startsWith("--ignore-submodules")),
  "--ignore-submodules=dirty",
];
//@ chunk-1r5nz6dk.js:2902-3074 fingerprint = isCurrentDirectoryBareGitRepo (0.807)
async function isCurrentDirectoryBareGitRepo_2(gitDir) {
  try {
    let [r, n, o] = await Promise.all([
      lstat(join(gitDir, "HEAD")),
      lstat(join(gitDir, "objects")),
      lstat(join(gitDir, "refs")),
    ]);
    return r.isFile() && n.isDirectory() && o.isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-ca06bv0t.js:15476-15758 fingerprint = getChangedFiles (0.789)
/**
 * git status --porcelain 限定给定路径，返回变更文件列表。
 */
async function getChangedFiles(gitRoot, n) {
  let mapped = n.map((s) => relative(gitRoot, s) || ".");
  let a = await execFileNoThrow(
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
  if (a.code !== 0) return [];
  return a.stdout
    .split(
      `
`,
    )
    .map((line) => line.slice(3).trim())
    .filter((line) => line.length > 0);
}
//@ chunk-wyqg6m3h.js:21370-21570 fingerprint = captureUntrackedFiles (0.54)
/**
 * git ls-files --others --exclude-standard 列未跟踪文件，生成 diff 条目（区分会话前已存在的文件）。
 */
async function untrackedFiles(e, o) {
  if (o.slots <= 0) return [];
  let r = await e.run([NO_OPTIONAL_LOCKS, "ls-files", "-z", "--others", "--exclude-standard", "--full-name"]);
  return isWholeAnswer(r)
    ? buildUntrackedFileEntries(
        e,
        r.stdout.split("\x00").filter((s) => s !== ""),
        o,
      )
    : null;
}
export {
  getBranch,
  clearIsGitMemo,
  findGitRoot,
  runGitReadOnly,
  findGitRootUncached,
  findGitRootThroughBackendUncached,
  findGitRootRecheckingNegative,
  findCanonicalGitRoot,
  isBranchOnOrigin,
  gitExe,
  getIsGit,
  getWorktreeCount,
  getGitPresenceForAnalytics,
  isLinkedWorktree,
  getGitWorktreeName,
  getRemoteUrl,
  getHead,
  getIsClean,
  getGitSshEnv,
  getFileStatus,
  redactGitRemoteCredentials,
  getDefaultBranch,
  getDefaultBranchIfKnown,
  snapshotGitEvidenceForBridge,
  getRepoRemoteHash,
  normalizeGitRemoteUrl,
  isCurrentDirectoryBareGitRepo_2,
  clearIsGitMemoFor,
  getGitStatusForDestructiveCommand,
  findCanonicalGitRootUncached,
  getGitState,
  primeGitRootMemo,
  seedGitRootMemo,
  getGitDir,
  normalizeCommandForPlatform,
  isAbsolutePlatformPath,
  readGitConfigValue,
  hasUnpushedCommits,
  getGithubRepo,
  PLAIN_PATCH_FLAGS,
  RAW_BLOB_DIFF_FLAGS,
  isCurrentDirectoryBareGitRepo,
  findRepoRemoteSlug,
  hasUnpushedCommits_2,
  findGitRootVerifyingPositive,
  getChangedFiles,
  getLocalInterfaceAddresses,
  forgetGitRootsUnder,
  toPowerShellRules,
  isHomeDirectoryGitRoot,
  isGitArgMatchingFlagRule,
  hasDangerousGitGlobalOption,
  getGitSubcommandPath,
  SAFE_GIT_GLOBAL_FLAGS,
  isLinkedWorktreeUncached,
  getGitPushRemotes,
  gitPushShellPatternsForRemotes,
  readGlobalGitConfigValue,
  autoModeGitStatusSettingValue,
  autoModeGitStatusUploadsValue,
  autoModeGitStatusLimitValue,
  truncateLinesToChars,
  countPorcelainStatus,
  getRemoteUrlForBridge,
  dirIsInGitRepo,
  isLocalHost_2,
  isCcrGitProxySession,
  isLocalHost,
  untrackedFiles,
};
