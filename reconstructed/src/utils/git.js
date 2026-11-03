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
import {
  resolve,
  resolve as resolve_2,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  relative,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
} from "fs/promises";
import {
  readFileSync,
  realpathSync,
  realpathSync as realpathSync_2,
  lstatSync,
  lstatSync as lstatSync_2,
  statSync,
  statSync as statSync_2,
  accessSync,
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
} from "fs";
import { homedir, hostname, networkInterfaces } from "os";
import { createHash } from "crypto";
import { isDiskless, getRootSession, getSessionId } from "../bootstrap/state.js";
import { lde, isUsableGitEntry, uut, getGitRepoCache, Ae } from "./git/gitRepoCache.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { Mn, Qn } from "./pathClassification.js";
import { PathSpace, describeUrlScheme } from "./resultError.js";
import { isPathWithin } from "./fsJunctions.js";
import { isOnForeignMount, isForeignMountPath, Ya, isWslUncPath } from "./networkPaths.js";
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
import { wt } from "../remote/remoteMode.js";
import { w0 } from "./which.js";
import { logError } from "./log.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { gl, getCwd } from "./cwd.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import { execFileNoThrowWithCwd, execFileNoThrow } from "./execFileNoThrow.js";
import { freeze, lb, freeze as freeze_23, freeze_7 as freeze_7_2, USr } from "./git/gitSafeEnv.js";
import { er, bashAndPowerShellRules } from "./permissions/gitCommandRules.js";
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
  OLo,
  LLo,
  ILo,
  iq,
  SUBCOMMAND_PROGRAMS,
  GIT_UNSAFE_CONFIG_KEYS,
  optionMatchesRule,
  findGitSubcommandIndex,
  JLo,
} from "../tools/BashTool/sandboxExclusions.js";
import { withGitNoPromptEnv, readSshCommandConfig } from "./gitSafeExec.js";
import { withPinnedGitDirEnv } from "./git/gitDirResolution.js";
import { mZo, hasControllingTty } from "./bgControllingTty.js";
import { getPlatform } from "./platform.js";
import { getAutoModeConfigOrDefault } from "./permissions/permissionSetup.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../tools/PowerShellTool/toolName.js";
import { isRemoteOnlyCheck } from "./permissions/checkRegistry.js";
import { XCe } from "../tools/BashTool/destructiveTargets.js";
import { WSt } from "../tools/PowerShellTool/destructiveCommandWarning.js";
import { runGitInWorktree } from "./worktree.js";
import {
  foldWindowsPathComponent,
  w,
  Q3r,
  te,
  Re,
  xe,
  caseFoldKey,
  normalizeWindowsPathForCompare,
} from "./hooks/hookCommandAnalysis.js";
import {
  NO_OPTIONAL_LOCKS,
  isWholeAnswer,
  buildUntrackedFileEntries,
} from "../plugins/bundled/diffPane/gitDiffRead.js";

/**
 * 从起始路径逐级向上 lstat `.git`（目录、文件或指向安全位置的符号链接）找 git 根，不 spawn git；diskless 时直接返回负结果。打 find_git_root_started/completed 诊断日志（耗时、stat 次数）。
 */
//@ chunk-t0gq9gyw.js:71536-72067 fingerprint = findGitRootImpl (0.914)
function findGitRootImpl(startPath) {
  if (isDiskless()) return lde;
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "find_git_root_started");
  let current = resolve_2(startPath),
    root = current.substring(0, current.indexOf(sep_4) + 1) || sep_4,
    statCount = 0;
  while (current !== root) {
    let gitPath = join_6(current, ".git");
    if ((statCount++, isUsableGitEntry(gitPath, current)))
      return (
        logForDiagnosticsNoPII("info", "find_git_root_completed", {
          duration_ms: Date.now() - startTime,
          stat_count: statCount,
          found: !0,
        }),
        Mn(current)
      );
    let stat = dirname_9(current);
    if (stat === current) break;
    current = stat;
  }
  if ((statCount++, isUsableGitEntry(join_6(root, ".git"), root)))
    return (
      logForDiagnosticsNoPII("info", "find_git_root_completed", {
        duration_ms: Date.now() - startTime,
        stat_count: statCount,
        found: !0,
      }),
      Mn(root)
    );
  return (
    logForDiagnosticsNoPII("info", "find_git_root_completed", {
      duration_ms: Date.now() - startTime,
      stat_count: statCount,
      found: !1,
    }),
    lde
  );
}
/**
 * findGitRoot：带 rootByPath 缓存的 git 根查找，未找到返回 null。
 */
//@ chunk-t0gq9gyw.js:72067-72136 facade-exports
function findGitRoot(e) {
  let n = uut(getGitRepoCache().rootByPath, e, findGitRootImpl);
  return n === lde ? null : n;
}
//@ chunk-t0gq9gyw.js:72136-72185 facade-exports
function findGitRootUncached(e) {
  let n = findGitRootImpl(e);
  return n === lde ? null : n;
}
//@ chunk-t0gq9gyw.js:72185-72540 facade-exports
async function findGitRootThroughBackendUncached(hostFiles, startPath) {
  if (isDiskless()) return { gitRoot: null };
  let r = resolve_2(startPath),
    o = r.substring(0, r.indexOf(sep_4) + 1) || sep_4;
  for (;;) {
    let stats = await hostFiles.stat(PathSpace.workspace(join_6(r, ".git")), { follow: !1 });
    if (!stats.ok || stats.value.kind === "link") return;
    if (stats.value.kind === "directory" || stats.value.kind === "file")
      return { gitRoot: Mn(r), entry: stats.value.kind };
    if (r === o) return { gitRoot: null };
    let a = dirname_9(r);
    r = a === r ? o : a;
  }
}
//@ chunk-t0gq9gyw.js:72540-72621 facade-exports
function findGitRootRecheckingNegative(e) {
  let rootByPath = getGitRepoCache().rootByPath;
  if (rootByPath.peek(e) === lde) rootByPath.delete(e);
  return findGitRoot(e);
}
//@ chunk-t0gq9gyw.js:72621-72817 facade-exports
async function findGitRootVerifyingPositive(e) {
  let n = findGitRootRecheckingNegative(e);
  if (n === null) return null;
  try {
    return (await lstat_6(join_6(n, ".git")), n);
  } catch (error) {
    let o = error?.code;
    if (o !== "ENOENT" && o !== "ENOTDIR") return n;
    return (getGitRepoCache().rootByPath.delete(e), findGitRootRecheckingNegative(e));
  }
}
/**
 * 删除位于某目录下的所有 git 相关缓存（git 根、canonical 根、remote slug、monorepo 判定、gitDir、repository 等），在目录被移动/删除后调用。
 */
//@ chunk-t0gq9gyw.js:72817-73139 facade-exports
function forgetGitRootsUnder(e) {
  let n = Mn(resolve_2(e)),
    r = getGitRepoCache();
  for (let o of [
    r.rootByPath,
    r.canonicalRootByRoot,
    r.remoteSlugByRoot,
    r.monorepoRuledOutByRoot,
    r.monorepoVerdictByDir,
    r.gitDirByCwd,
    r.markersByRoot,
    r.repositoryByCwd,
    r.repoClassByCanonicalRoot,
    r.wcRootByPath,
    r.wcWorktreesByRoot,
  ])
    for (let s of [...o.keys()]) if (isPathWithin(n, Mn(resolve_2(s)))) o.delete(s);
}
//@ chunk-t0gq9gyw.js:73139-73211 layout
function getCanonicalRootUncached(gitRoot) {
  try {
    return resolveCanonicalRoot(gitRoot, readFileSync(join_6(gitRoot, ".git"), "utf-8"));
  } catch {
    return gitRoot;
  }
}
/**
 * 解析 worktree 的 `.git` 文件内容（gitdir:），校验 commondir、worktrees/<name>/gitdir 回指与 realpath 一致后返回主仓库根；任何一步不可信都退回原根，防止伪造 .git 文件把路径引到别处。
 */
//@ chunk-t0gq9gyw.js:73211-73844 fingerprint = resolveCanonicalRoot (0.904)
function resolveCanonicalRoot(e, n) {
  try {
    let gitContent = n.trim();
    if (!gitContent.startsWith("gitdir:")) return e;
    let trimmed = gitContent.slice(7).trim();
    if (isOnForeignMount(trimmed, e)) return e;
    if (rawPointerPathIsUnsafe(trimmed, e)) return e;
    let worktreeGitDir = resolve_2(e, trimmed);
    if (pointerFileIsSuspect(join_6(worktreeGitDir, "commondir"), worktreeGitDir)) return e;
    let trimmed_2 = readFileSync(join_6(worktreeGitDir, "commondir"), "utf-8").trim();
    if (isOnForeignMount(trimmed_2, worktreeGitDir)) return e;
    if (rawPointerPathIsUnsafe(trimmed_2, worktreeGitDir)) return e;
    let commonDir = resolve_2(worktreeGitDir, trimmed_2);
    if (resolve_2(dirname_9(worktreeGitDir)) !== join_6(commonDir, "worktrees")) return e;
    if (pointerFileIsSuspect(join_6(worktreeGitDir, "gitdir"), worktreeGitDir)) return e;
    let trimmed_3 = readFileSync(join_6(worktreeGitDir, "gitdir"), "utf-8").trim();
    if (isOnForeignMount(trimmed_3, e)) return e;
    if (rawPointerPathIsUnsafe(trimmed_3, worktreeGitDir, e)) return e;
    if (sep_4 === "/" && [e, worktreeGitDir, trimmed_3, commonDir].some((y) => y.includes("\\"))) return e;
    if (realpathSync_2(resolve_2(worktreeGitDir, trimmed_3)) !== join_6(realpathSync_2(e), ".git")) return e;
    if (basename_7(commonDir) !== ".git") {
      if (isUsableGitEntry(join_6(commonDir, ".git"), commonDir)) return e;
      return Mn(commonDir);
    }
    return Mn(dirname_9(commonDir));
  } catch {
    return e;
  }
}
//@ chunk-t0gq9gyw.js:73844-73976 layout
async function resolveCanonicalRootOnHost(e, n) {
  let text = await e.readText(PathSpace.workspace(join_6(n, ".git")));
  if (!text.ok || !text.value.found) return;
  return resolveCanonicalRoot(n, text.value.value);
}
/**
 * findCanonicalGitRoot：git 根若是 linked worktree，则经 .git 文件的 gitdir/commondir 解析出主仓库根；结果缓存在 canonicalRootByRoot。
 */
//@ chunk-t0gq9gyw.js:73976-74063 facade-exports
function findCanonicalGitRoot(e) {
  let n = findGitRoot(e);
  if (!n) return null;
  return uut(getGitRepoCache().canonicalRootByRoot, n, getCanonicalRootUncached);
}
//@ chunk-t0gq9gyw.js:74063-74121 facade-exports
function findCanonicalGitRootUncached(e) {
  let n = findGitRootUncached(e);
  if (!n) return null;
  return getCanonicalRootUncached(n);
}
//@ chunk-t0gq9gyw.js:74121-74592 facade-exports
async function primeGitRootMemo(e, n) {
  if (e.hostFiles.serving("workspace") !== "host") return;
  let r = getGitRepoCache(),
    peek = r.rootByPath.peek(n);
  if (peek !== void 0) {
    let c = peek === lde ? null : peek;
    return { gitRoot: c, canonicalRoot: c === null ? null : r.canonicalRootByRoot.peek(c) };
  }
  let s = await findGitRootThroughBackendUncached(e.hostFiles, n);
  if (s === void 0) return;
  let a =
    s.gitRoot === null
      ? { gitRoot: null, canonicalRoot: null }
      : {
          gitRoot: s.gitRoot,
          canonicalRoot:
            s.entry === "directory" ? s.gitRoot : await resolveCanonicalRootOnHost(e.hostFiles, s.gitRoot),
        };
  return (seedGitRootMemo(n, a.gitRoot, a.canonicalRoot), a);
}
/**
 * 用已知结果预填 git 根缓存（findGitRoot 与 canonical 根）；已有不同答案时保留旧值并告警。
 */
//@ chunk-t0gq9gyw.js:74592-75090 facade-exports
function seedGitRootMemo(e, n, r) {
  let o = getGitRepoCache(),
    s = n ?? lde,
    peek = o.rootByPath.peek(e);
  if (peek === void 0) o.rootByPath.set(e, s);
  else if (peek !== s) {
    logForDebugging(
      "git root prime: findGitRoot already holds a different answer for the start path; keeping the first",
      { level: "warn" },
    );
    return;
  }
  if (n === null || r === void 0 || r === null) return;
  let peek_2 = o.canonicalRootByRoot.peek(n);
  if (peek_2 === void 0) o.canonicalRootByRoot.set(n, r);
  else if (peek_2 !== r)
    logForDebugging(
      "git root prime: findCanonicalGitRoot already holds a different answer for the root; keeping the first",
      { level: "warn" },
    );
}
/**
 * 当前路径是否在 linked worktree 中（git 根与 canonical 根不同）。
 */
//@ chunk-t0gq9gyw.js:75090-75144 facade-exports
function isLinkedWorktree(e) {
  let n = findGitRoot(e);
  return n !== null && findCanonicalGitRoot(e) !== n;
}
//@ chunk-t0gq9gyw.js:75144-75199 facade-exports
function isLinkedWorktreeUncached(e) {
  let n = findGitRootUncached(e);
  return n !== null && getCanonicalRootUncached(n) !== n;
}
/**
 * 若 git dir 位于 <common>/worktrees/<name> 下，返回 worktree 名。
 */
//@ chunk-t0gq9gyw.js:75199-75331 facade-exports
async function getGitWorktreeName(e) {
  if (wt()) return null;
  let n = await resolveGitDir(e);
  if (!n || basename_7(n) === ".git" || basename_7(dirname_9(n)) !== "worktrees") return null;
  return basename_7(n);
}
//@ chunk-t0gq9gyw.js:75331-75448 facade-exports
var RAW_BLOB_DIFF_FLAGS = ["--no-ext-diff", "--no-textconv"],
  PLAIN_PATCH_FLAGS = ["--no-color", "--src-prefix=a/", "--dst-prefix=b/", "--submodule=short"];
/**
 * gitExe：返回要执行的 git 可执行文件（which git 结果缓存，Windows 下识别启动器后的真实程序），diskless 时为 "git"。
 */
//@ chunk-t0gq9gyw.js:75448-75821 facade-exports
function gitExe() {
  if (isDiskless()) return "git";
  let e = getGitRepoCache();
  if (((e.gitExecutable ??= w0("git") || "git"), e.gitLauncherProbe === null)) {
    let gitExecutable = e.gitExecutable,
      o = probeGitLauncher(gitExecutable).then((s) => {
        if (s !== null && e.gitLauncherProbe === o)
          e.gitBehindLauncher = { launcher: gitExecutable, program: s };
      }, logError);
    e.gitLauncherProbe = o;
  }
  let gitBehindLauncher = e.gitBehindLauncher;
  return gitBehindLauncher?.launcher === e.gitExecutable && process.env.MSYSTEM === void 0
    ? gitBehindLauncher.program
    : e.gitExecutable;
}
//@ chunk-t0gq9gyw.js:75821-75849 layout
var MSYS_GIT_SUBDIRS = ["mingw64", "ucrt64"];
//@ chunk-t0gq9gyw.js:75849-75882 layout
async function probeGitLauncher(e) {
  return null;
}
//@ chunk-t0gq9gyw.js:75882-75909 layout
var isGitCacheBySession = new SessionRootSlot(() => new Map());
/**
 * 当前 cwd 是否在 git 仓库内（基于 findGitRoot，不 spawn），打 is_git_check_* 诊断日志。
 */
//@ chunk-t0gq9gyw.js:75909-76095 fingerprint = getIsGit (1)
async function getIsGit_2() {
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "is_git_check_started");
  let n = gl(),
    r = n !== null && findGitRoot(n) !== null;
  return (
    logForDiagnosticsNoPII("info", "is_git_check_completed", {
      duration_ms: Date.now() - startTime,
      is_git: r,
    }),
    r
  );
}
//@ chunk-t0gq9gyw.js:76095-76120 layout
function getCurrentHost() {
  return getRootSession();
}
/**
 * 按会话缓存 getIsGit() 的 promise。
 */
//@ chunk-t0gq9gyw.js:76120-76223 facade-exports
function getIsGit() {
  let of = isGitCacheBySession.of(getCurrentHost()),
    n = getSessionId(),
    r = of.get(n);
  if (r !== void 0) return r;
  let o = getIsGit_2();
  return (of.set(n, o), o);
}
//@ chunk-t0gq9gyw.js:76223-76288 facade-exports
function clearIsGitMemoFor(e) {
  (isGitCacheBySession.of(e).clear(), getGitRepoCache().diffCheckoutIsRepo.clear());
}
//@ chunk-t0gq9gyw.js:76288-76313 facade-exports
function clearIsGitMemo() {
  clearIsGitMemoFor(getCurrentHost());
}
//@ chunk-t0gq9gyw.js:76313-76341 facade-exports
function getGitDir(e) {
  return resolveGitDir(e);
}
/**
 * dirIsInGitRepo 及同语句的 getHead（读缓存的 HEAD sha）、getBranch（git rev-parse --abbrev-ref HEAD，失败为 "HEAD"）。
 */
//@ chunk-t0gq9gyw.js:76341-76599 facade-exports = preserveGitStateForIssue (0.512)
var dirIsInGitRepo = async (e) => findGitRoot(e) !== null,
  getHead = async () => getCachedHead(),
  getBranch = async (e, n = { env: getRemoteHostSessionCount() }) => {
    if (e === void 0) return getCachedBranch();
    let { stdout: stdout, code: code } = await execFileNoThrowWithCwd(
      gitExe(),
      [...freeze, "rev-parse", "--abbrev-ref", "HEAD"],
      { cwd: e, preserveOutputOnError: !1, ...n },
    );
    return code === 0 ? stdout.trim() || "HEAD" : "HEAD";
  };
//@ chunk-t0gq9gyw.js:76599-76770 facade-exports
async function isBranchOnOrigin(e, n) {
  return (
    (
      await execFileNoThrowWithCwd(
        gitExe(),
        [...freeze, "show-ref", "--verify", "--quiet", `refs/remotes/origin/${e}`],
        { cwd: n ?? getCwd(), preserveOutputOnError: !1, env: getRemoteHostSessionCount() },
      )
    ).code === 0
  );
}
/**
 * getDefaultBranch：先读 refs/remotes/origin/HEAD 指向的分支并确认存在，否则依次尝试 main/master 的远程分支，最后默认 "main"。不带目录时读 GitFileWatcher 的缓存。
 */
//@ chunk-t0gq9gyw.js:76770-77468 facade-exports
var getDefaultBranch = async (e, n = { env: getRemoteHostSessionCount() }) => {
    if (e === void 0) return getCachedDefaultBranch();
    let r = await getDefaultBranchIfKnown(e, n);
    if (r) return r;
    for (let o of CONVENTIONAL_DEFAULT_BRANCH_NAMES)
      if (
        (
          await execFileNoThrowWithCwd(
            gitExe(),
            [...freeze, "show-ref", "--verify", "--quiet", `refs/remotes/origin/${o}`],
            { cwd: e, preserveOutputOnError: !1, ...n },
          )
        ).code === 0
      )
        return o;
    return "main";
  },
  getDefaultBranchIfKnown = async (e, n = { env: getRemoteHostSessionCount() }) => {
    let { stdout: stdout, code: code } = await execFileNoThrowWithCwd(
      gitExe(),
      [...freeze, "symbolic-ref", "--short", "refs/remotes/origin/HEAD"],
      { cwd: e ?? getCwd(), preserveOutputOnError: !1, ...n },
    );
    if (code !== 0) return null;
    let replaced = stdout.trim().replace(/^origin\//, "");
    if (!replaced) return null;
    return (
      await execFileNoThrowWithCwd(
        gitExe(),
        [...freeze, "show-ref", "--verify", "--quiet", `refs/remotes/origin/${replaced}`],
        { cwd: e ?? getCwd(), preserveOutputOnError: !1, ...n },
      )
    ).code === 0
      ? replaced
      : null;
  },
  Ls = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
/**
 * git config --get <key>（cwd 仓库），无值返回 null。
 */
//@ chunk-t0gq9gyw.js:77468-77660 facade-exports
async function readGitConfigValue(e) {
  let { stdout: stdout, code: code } = await execFileNoThrow(gitExe(), [...freeze, "config", "--get", e], {
    preserveOutputOnError: !1,
    useCwd: !0,
    env: getRemoteHostSessionCount(),
  });
  if (code !== 0) return null;
  let trimmed = stdout.trim();
  return trimmed.length > 0 ? trimmed : null;
}
/**
 * git config --global --includes --get <key>。
 */
//@ chunk-t0gq9gyw.js:77660-77856 facade-exports
async function readGlobalGitConfigValue(e, n) {
  let { stdout: stdout, code: code } = await execFileNoThrow(
      gitExe(),
      [...freeze, "config", "--global", "--includes", "--get", e],
      { preserveOutputOnError: !1, cwd: n, env: getRemoteHostSessionCount() },
    ),
    trimmed = stdout.trim();
  return code === 0 && trimmed.length > 0 ? trimmed : null;
}
//@ chunk-t0gq9gyw.js:77856-77990 layout
async function getPushRemote(e) {
  let n = await readGitConfigValue("remote.pushDefault");
  if (n && e.includes(n)) return n;
  if (e.length === 1) return e[0] ?? null;
  return null;
}
/**
 * 列出可推送的远程：origin 与 remote.pushDefault（或唯一远程），用于生成 git push 权限规则。
 */
//@ chunk-t0gq9gyw.js:77990-78289 facade-exports
async function getGitPushRemotes() {
  let { stdout: stdout, code: code } = await execFileNoThrow(gitExe(), [...freeze, "remote"], {
    preserveOutputOnError: !1,
    useCwd: !0,
    env: getRemoteHostSessionCount(),
  });
  if (code !== 0) return [];
  let filtered = stdout
      .split(
        `
`,
      )
      .map((a) => a.trim())
      .filter(Boolean),
    o = new Set();
  if (filtered.includes("origin")) o.add("origin");
  let s = await getPushRemote(filtered);
  if (s && Ls.test(s)) o.add(s);
  return [...o];
}
/**
 * 为远程生成 `git push <r> *`、`git push -u <r> *` 权限规则模式。
 */
//@ chunk-t0gq9gyw.js:78289-78369 facade-exports
function gitPushShellPatternsForRemotes(e) {
  return e.flatMap((n) => [`git push ${n} *`, `git push -u ${n} *`]);
}
//@ chunk-t0gq9gyw.js:78369-78444 facade-exports
function toPowerShellRules(e) {
  return er(bashAndPowerShellRules(e)).filter((n) => n.startsWith("PowerShell("));
}
/**
 * getRemoteUrl：GitFileWatcher 缓存的 origin URL；同语句 $lo 在仓库根是 home 目录时返回 null（避免把 dotfiles 仓库当项目）。
 */
//@ chunk-t0gq9gyw.js:78444-78566 facade-exports
var getRemoteUrl = async () => getCachedRemoteUrl(),
  getRemoteUrlForBridge = async () => {
    let e = gl(),
      n = e === null ? null : findGitRoot(e);
    if (n === null || (await isHomeDirectoryGitRoot(n))) return null;
    return getCachedRemoteUrl();
  };
/**
 * 路径是否就是 home 目录（含 realpath 比较）。
 */
//@ chunk-t0gq9gyw.js:78566-78728 facade-exports
async function isHomeDirectoryGitRoot(e) {
  let n;
  try {
    n = homedir();
  } catch {
    return !1;
  }
  if (!n) return !1;
  if (e === Mn(resolve_2(n))) return !0;
  let r = await realpath_4(n).then(
    (o) => Mn(o),
    () => null,
  );
  return r !== null && e === r;
}
//@ chunk-t0gq9gyw.js:78728-78842 facade-exports
var snapshotGitEvidenceForBridge = async () => {
  let [e, n, r] = await Promise.all([getBranch(), getRemoteUrlForBridge(), getCachedDefaultBranchIfKnown()]);
  return { branch: e, gitRepoUrl: n, defaultBranch: r };
};
/**
 * 把 URL 中的 user:pass@ 凭证替换为 ***@，用于日志。
 */
//@ chunk-t0gq9gyw.js:78842-78910 facade-exports
function redactGitRemoteCredentials(e) {
  return e == null ? e : e.replace(/:\/\/[^/]*@/, "://***@");
}
/**
 * 把 ssh/https/git 等多种远程 URL 归一化为 host/owner/repo 形式，用于比较与遥测。
 */
//@ chunk-t0gq9gyw.js:78910-79453 facade-exports = normalizeGitRemoteUrl (1)
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
    let s = urlMatch[1],
      a = urlMatch[2];
    if (hasEncodedPathChars(a)) return null;
    if (isCcrGitProxySession() && isLocalHost(s) && a.startsWith("git/")) {
      let proxyPath = a.slice(4),
        segments = proxyPath.split("/");
      if (segments.length >= 3 && segments[0].includes(".")) return proxyPath.toLowerCase();
      return `github.com/${proxyPath}`.toLowerCase();
    }
    return `${s}/${a}`.toLowerCase();
  }
  return null;
}
/**
 * 按远程 URL 的主机名把 git 托管平台归类为 github、ghe、gitlab、bitbucket、azure、other 或 none。
 */
//@ chunk-t0gq9gyw.js:79453-79888 layout
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
  if (wt()) return null;
  let [e, n] = await Promise.all([getIsGit(), getRemoteUrl()]).catch(() => [!1, null]),
    r = n ? normalizeGitRemoteUrl(n) : null;
  return {
    is_git: e,
    has_remote: r !== null,
    remote_host_class: classifyGitHost(r ? firstLineOf(r, "/") : null),
  };
}
//@ chunk-t0gq9gyw.js:80537-80591 sole-consumer
function getRemoteUrlForDirCached(e) {
  return uut(getGitRepoCache().remoteSlugByRoot, e, getRemoteUrlForDir_2);
}
//@ chunk-t0gq9gyw.js:80591-80653 facade-exports
function findRepoRemoteSlug(e) {
  let n = getRemoteUrlForDirCached(e);
  return typeof n === "string" ? n : null;
}
//@ chunk-t0gq9gyw.js:80653-80687 facade-exports
function isRepoConfigUnreadable(e) {
  return getRemoteUrlForDirCached(e) === Ae;
}
//@ chunk-t0gq9gyw.js:80687-80701 layout
var Bs = 128000;
//@ chunk-t0gq9gyw.js:80701-80973 facade-exports
function readRepoConfig(e, n) {
  try {
    let r = !0;
    try {
      if (lstatSync_2(join_6(e, ".git")).isFile()) return { ok: !1, cause: "pointer_file" };
    } catch (error) {
      if (!isENOENT(error)) return { ok: !1, cause: "read_failed" };
      r = !1;
    }
    let o = r ? join_6(e, ".git") : e,
      s = readSmallTextFile(join_6(o, "config"), e, n);
    return s.ok ? { ...s, gitDir: o } : s;
  } catch {
    return { ok: !1, cause: "read_failed" };
  }
}
//@ chunk-t0gq9gyw.js:80973-81214 layout
function readSmallTextFile(e, n, r) {
  if (readPositionIsUnsafe(e, n)) return { ok: !1, cause: "unsafe_path" };
  let o = statSync_2(e);
  if (!o.isFile()) return { ok: !1, cause: "not_a_file" };
  if (o.size > r) return { ok: !1, cause: "oversize" };
  let s = readFileSync(e, "utf-8");
  return hasNulByte(s) ? { ok: !1, cause: "nul_byte" } : { ok: !0, text: s };
}
//@ chunk-t0gq9gyw.js:81214-81296 facade-exports
function readRepoConfigText(e) {
  let n = readRepoConfig(e, Bs);
  return n.ok && !n.text.includes("\x00") ? n.text : null;
}
//@ chunk-t0gq9gyw.js:81296-81444 facade-exports = getServerKey (1)
async function getRepoRemoteHash() {
  let e = await getRemoteUrl();
  if (!e) return null;
  let configJson = normalizeGitRemoteUrl(e);
  if (!configJson) return null;
  return createHash("sha256").update(configJson).digest("hex").substring(0, 16);
}
//@ chunk-t0gq9gyw.js:81444-82405 facade-exports
var getIsHeadOnRemote = async () => {
    let { code: code } = await execFileNoThrow(gitExe(), [...freeze, "rev-parse", "@{u}"], {
      preserveOutputOnError: !1,
      env: getRemoteHostSessionCount(),
    });
    return code === 0;
  },
  hasUnpushedCommits = async (e) => {
    let { stdout: stdout, code: code } = await execFileNoThrowWithCwd(
      gitExe(),
      [...freeze, "rev-list", "--count", "@{u}..HEAD"],
      { cwd: e, preserveOutputOnError: !1, env: getRemoteHostSessionCount() },
    );
    return code === 0 && parseInt(stdout.trim(), 10) > 0;
  },
  getIsClean = async (e) => {
    let n = [...freeze, "--no-optional-locks", "status", "--porcelain", lb];
    if (e?.ignoreUntracked) n.push("-uno");
    let { stdout: stdout } = await execFileNoThrow(gitExe(), n, {
      preserveOutputOnError: !1,
      env: getRemoteHostSessionCount(void 0, { userLocale: !0 }),
    });
    return stdout.trim().length === 0;
  },
  getFileStatus = async (e, n = getRemoteHostSessionCount(void 0, { userLocale: !0 })) => {
    let r = [...freeze, "--no-optional-locks", "status", "--porcelain", lb],
      { stdout: stdout } =
        e === void 0
          ? await execFileNoThrow(gitExe(), r, { preserveOutputOnError: !1, env: n })
          : await execFileNoThrowWithCwd(gitExe(), r, { cwd: e, preserveOutputOnError: !1, env: n }),
      s = [],
      a = [];
    return (
      stdout
        .split(/\r?\n/)
        .filter((c) => c.length > 0)
        .forEach((c) => {
          let substring = c.substring(0, 2),
            substring_2 = c.substring(3);
          if (substring === "??") a.push(substring_2);
          else if (substring_2) s.push(substring_2);
        }),
      { tracked: s, untracked: a }
    );
  },
  getWorktreeCount = async () => getWorktreeCountFromFs();
/**
 * 汇总 git 状态（提交、分支、远程、是否 dirty 等）用于 issue/反馈附带信息。
 */
//@ chunk-t0gq9gyw.js:82405-82685 facade-exports = getGitState (0.748)
async function getGitState() {
  try {
    let [e, n, r, o, s, a] = await Promise.all([
      getHead(),
      getBranch(),
      getRemoteUrl(),
      getIsHeadOnRemote(),
      getIsClean(),
      getWorktreeCount(),
    ]);
    return (
      logFeatureOk("git_status_fetch"),
      { commitHash: e, branchName: n, remoteUrl: r, isHeadOnRemote: o, isClean: s, worktreeCount: a }
    );
  } catch (error) {
    return (logFeatureBad("git_status_fetch", "git_status_fetch_failed"), null);
  }
}
/**
 * 从 origin URL 解析 GitHub owner/repo，非 GitHub 返回 null。
 */
//@ chunk-t0gq9gyw.js:82685-82968 facade-exports = getGithubRepo (0.763)
async function getGithubRepo() {
  let { parseGitRemote: parseGitRemote } = await import("./chunk-zqrznfbt.js"),
    remoteUrl = await getRemoteUrl();
  if (!remoteUrl) return (logForDebugging("Local GitHub repo: unknown"), null);
  let parsed = parseGitRemote(remoteUrl);
  if (parsed && isGithubDotCom(parsed.host)) {
    let result = `${parsed.owner}/${parsed.name}`;
    return (logForDebugging(`Local GitHub repo: ${result}`), result);
  }
  return (logForDebugging("Local GitHub repo: unknown"), null);
}
//@ chunk-t0gq9gyw.js:82968-83093 facade-exports
function isCcrGitProxySession() {
  return (
    env.CLAUDE_CODE_REMOTE ||
    (isSelfAddressableSessionId(env.CLAUDE_CODE_REMOTE_SESSION_ID ?? "") &&
      env.CLAUDE_CODE_ENVIRONMENT_KIND === void 0)
  );
}
//@ chunk-t0gq9gyw.js:83093-83283 facade-exports = isLocalHost (1)
function isLocalHost(host) {
  let index = host.indexOf(":"),
    r = index === -1 ? host : host.slice(0, index),
    o = index === -1 ? "" : host.slice(index + 1);
  if (o !== "" && !/^\d+$/.test(o)) return !1;
  return r === "localhost" || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(r);
}
//@ chunk-t0gq9gyw.js:83283-83295 layout
var Ks = 4096;
/**
 * 逐段解析路径并展开符号链接（最多 64 次，处理 . 与 ..），遇到不安全位置、读取失败或链接目标不安全时返回 null，返回最终真实路径。
 */
//@ chunk-t0gq9gyw.js:83295-83859 layout
function resolvePathWithoutSymlinks(fs, path, roots) {
  let separatorRe = /\/+/,
    parts = path.split(separatorRe),
    resolved = parts[0] === "" ? sep_4 : parts[0] + sep_4,
    linkCount = 0;
  for (let index = 1; index < parts.length; index++) {
    let segment = parts[index];
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      resolved = dirname_9(resolved);
      continue;
    }
    let candidate = resolved.endsWith(sep_4) ? resolved + segment : resolved + sep_4 + segment;
    if (roots !== void 0 ? isForeignMountPath(candidate, roots) : Ya(candidate)) return null;
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
    if (Qn(linkTarget)) return null;
    if (roots !== void 0 ? isForeignMountPath(linkTarget, roots) : Ya(linkTarget)) return null;
    let linkParts = linkTarget.split(separatorRe);
    if (isAbsolute_6(linkTarget))
      (parts.splice(0, index + 1, ...linkParts),
        (resolved = linkParts[0] === "" ? sep_4 : linkParts[0] + sep_4),
        (index = 0));
    else (parts.splice(index, 1, ...linkParts), index--);
  }
  return resolved;
}
//@ chunk-t0gq9gyw.js:83859-86395 facade-exports
function isCurrentDirectoryBareGitRepo() {
  let e = getFsImplementation(),
    n = getCwd(),
    r = resolvePathWithoutSymlinks(e, n, n) ?? n;
  r = r.normalize("NFC").toLowerCase();
  let o = r.endsWith(sep_4) ? r : r + sep_4,
    s = (h) => {
      let lower = h.toLowerCase();
      return lower === r || lower.startsWith(o);
    };
  function a(h) {
    if (isForeignMountPath(h, n)) return null;
    if (Qn(h)) {
      if (!isWslUncPath(h)) return null;
      if (!Qn(n)) return { canonical: h.normalize("NFC"), crossOs: !0 };
    }
    let b = resolvePathWithoutSymlinks(e, h, n);
    if (b === null) return null;
    return { canonical: b.normalize("NFC"), crossOs: !1 };
  }
  function c(h, b) {
    if (!b && s(h)) return !0;
    for (let v of h.split(b ? /[\\/]+/ : sep_4)) if (v.toLowerCase() === ".git") return !1;
    return !0;
  }
  function u(h) {
    try {
      let lstatSync = e.lstatSync(join_6(h, "HEAD"));
      if (!lstatSync.isFile() || lstatSync.size > 4096) return !1;
      let sliced = readFileSync(join_6(h, "HEAD"), "utf8").slice(0, 255);
      return /^ref:[ \t]*refs\//.test(sliced) || /^[0-9a-f]{40}([0-9a-f]{24})?[ \t\n\r]*$/.test(sliced);
    } catch {
      return !1;
    }
  }
  function p(h) {
    try {
      let b = join_6(h, "HEAD"),
        lstatSync = e.lstatSync(b);
      if (!lstatSync.isFile() || lstatSync.size > 4096) return !1;
      let sliced = readFileSync(b, "utf8").slice(0, 255);
      if (!/^ref:[ \t]*refs\//.test(sliced) && !/^[0-9a-f]{40}([0-9a-f]{24})?[ \t\n\r]*$/.test(sliced))
        return !1;
      for (let R of ["objects", "refs"]) {
        let L = join_6(h, R);
        if (!e.statSync(L).isDirectory()) return !1;
        accessSync(L, constants_7.X_OK);
      }
      try {
        return (e.statSync(join_6(h, "commondir")), !1);
      } catch {}
      return !0;
    } catch {
      return !1;
    }
  }
  function y(h) {
    try {
      let lstatSync = e.lstatSync(join_6(h, "HEAD"));
      if (lstatSync.isFile() || lstatSync.isSymbolicLink()) return !0;
    } catch {}
    for (let b of ["objects", "refs"])
      try {
        return (e.statSync(join_6(h, b)), !0);
      } catch {}
    return !1;
  }
  function w(h) {
    let b = (v) => {
      let _ = a(v);
      if (_ === null) return (logFeatureSad("git_bare_repo_gate", "gitdir_target_uncanonical"), "plantable");
      if (c(_.canonical, _.crossOs))
        return (logFeatureSad("git_bare_repo_gate", "gitdir_target_plantable"), "plantable");
      return u(_.canonical) ? "trusted" : "none";
    };
    try {
      let lstatSync = e.lstatSync(join_6(h, ".git"));
      if (lstatSync.isSymbolicLink()) {
        let _;
        try {
          _ = e.readlinkSync(join_6(h, ".git"));
        } catch {
          return "plantable";
        }
        return b(isAbsolute_6(_) ? _ : h + sep_4 + _);
      }
      if (lstatSync.isFile()) {
        if (lstatSync.size > Ks) return "oversized";
        try {
          let _ = readFileSync(join_6(h, ".git"), "utf8");
          if (_.includes("\x00")) return "plantable";
          if (!_.startsWith("gitdir: ")) return "none";
          let replaced = _.slice(8).replace(/[\r\n]+$/, "");
          return b(isAbsolute_6(replaced) ? replaced : h + sep_4 + replaced);
        } catch {
          return "none";
        }
      }
      if (lstatSync.isDirectory()) return p(join_6(h, ".git")) ? "trusted" : "none";
    } catch {}
    return "none";
  }
  switch (w(n)) {
    case "plantable":
      return "gitdir-redirect-plantable";
    case "oversized":
      return "gitdir-file-oversized";
    case "trusted":
      return (logFeatureOk("git_bare_repo_gate"), !1);
    case "none":
      break;
  }
  let E = n;
  for (;;) {
    if (y(E)) return (logFeatureSad("git_bare_repo_gate", "bare_indicators"), "bare-indicators");
    let h = dirname_9(E);
    if (h === E) break;
    switch (w(h)) {
      case "trusted":
        return (logFeatureOk("git_bare_repo_gate"), !1);
      case "plantable":
        return "gitdir-redirect-plantable";
      case "oversized":
        return "gitdir-file-oversized";
      case "none":
        break;
    }
    E = h;
  }
  return (logFeatureOk("git_bare_repo_gate"), !1);
}
//@ chunk-e6aww6q8.js:1257182-1257363 affinity
function getGitSubcommandPath(e) {
  let n = [],
    sliced = e.slice(1);
  for (let [s, h] of sliced.entries()) {
    if (h.startsWith("-")) continue;
    let y = s === 0 ? void 0 : sliced[s - 1];
    if ((n.push(h), y === void 0 || !y.startsWith("-"))) break;
  }
  return n;
}
//@ chunk-e6aww6q8.js:1257363-1257695 fingerprint = gitExe (1)
function isGitArgMatchingFlagRule(e, n) {
  let r = getOwn(OLo, e);
  if (r === void 0) return !1;
  let s = e === "git" && LLo() ? [...r, ILo] : r,
    mapped = getGitSubcommandPath(n).map(iq),
    y = SUBCOMMAND_PROGRAMS.has(e);
  return s.some(([S, w]) => {
    let found = mapped.find((Z) => w.includes(Z));
    if (found === void 0) return !1;
    let matches = /^-[A-Za-z]$/.test(S),
      q = getOwn(GIT_UNSAFE_CONFIG_KEYS, found) ?? [];
    return n.some(
      (Z) =>
        Z === S || (S.startsWith("-") && (Z.startsWith(S) || optionMatchesRule(Z, S, !1, matches, q, y))),
    );
  });
}
//@ chunk-e6aww6q8.js:1260478-1260686 fingerprint = getIsHeadOnRemote (0.489)
function hasDangerousGitGlobalOption(e, n) {
  let r = findGitSubcommandIndex(e);
  return (
    e[r] === "rev-parse" &&
    getGitSubcommandPath(e)[0] === "rev-parse" &&
    e.slice(1, r).every((y) => SAFE_GIT_GLOBAL_FLAGS.has(y)) &&
    !/[$`]/.test(n)
      ? e.slice(1, r)
      : e.slice(1)
  ).some((y) => JLo.some((S) => optionMatchesRule(y, S, !1, !1, [], !0)));
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
/**
 * 为 git 网络操作构建环境：固定 git 目录、读取 sshCommand 配置；非 Windows 且未显式设置时禁止 SSH_ASKPASS，始终脱离控制终端。
 */
//@ chunk-e6aww6q8.js:1874180-1874593 placement
async function getGitSshEnv(e) {
  if (isDiskless()) return { env: withGitNoPromptEnv(), withoutControllingTerminal: !0 };
  let n = withPinnedGitDirEnv(withGitNoPromptEnv(), e),
    r = await readSshCommandConfig(n, async (y) => {
      let { code: code, stdout: stdout } = await execFileNoThrowWithCwd(gitExe(), [...freeze_23, ...y], {
        cwd: e,
        env: n,
        stdin: "ignore",
        timeout: mZo,
      });
      return { exitCode: code, stdout: stdout };
    }),
    s = r.SSH_ASKPASS_REQUIRE?.trim();
  return {
    env:
      Boolean(s) || getPlatform() === "windows" || !(await hasControllingTty())
        ? r
        : { ...r, SSH_ASKPASS_REQUIRE: "never", SSH_ASKPASS: "false" },
    withoutControllingTerminal: !0,
  };
}
/**
 * 以只读方式运行 git（无可选锁、有超时与 1MB 输出上限），返回 {ok, stdout} 或失败信息（退出码、是否超时、是否溢出）；受限评估环境直接失败。
 */
//@ chunk-e6aww6q8.js:2833370-2833884 placement
async function runGitReadOnly(cwd, args, { abortSignal: abortSignal, userLocale: userLocale } = {}) {
  if (env.CLAUDE_CODE_EVAL_CONFINED) return { ok: !1, code: null, timedOut: !1, overflowed: !1 };
  try {
    let result = await execFileNoThrowWithCwd(gitExe(), [...freeze_7_2, "--no-optional-locks", ...args], {
      cwd: cwd,
      env: getRemoteHostSessionCount(void 0, { userLocale: userLocale }),
      timeout: USr,
      abortSignal: abortSignal,
      maxBuffer: 1e6,
      preserveOutputOnError: !1,
      useToolMemoryCgroup: !1,
    });
    return result.code === 0
      ? { ok: !0, stdout: result.stdout }
      : {
          ok: !1,
          code: result.exitCode ?? null,
          timedOut: result.timedOut === !0,
          overflowed: result.maxBufferExceeded === !0,
        };
  } catch {
    return { ok: !1, code: null, timedOut: !1, overflowed: !1 };
  }
}
//@ chunk-e6aww6q8.js:2833884-2833918 placement
function UUo() {
  return getAutoModeGitStatusSetting().value;
}
//@ chunk-e6aww6q8.js:2833918-2834113 placement
function getAutoModeGitStatusSetting() {
  let CLAUDE_CODE_AUTO_MODE_GIT_STATUS = antEnv.CLAUDE_CODE_AUTO_MODE_GIT_STATUS;
  if (CLAUDE_CODE_AUTO_MODE_GIT_STATUS !== void 0)
    return { value: CLAUDE_CODE_AUTO_MODE_GIT_STATUS, src: "env" };
  let r = getAutoModeConfigOrDefault()?.gitStatusType;
  return typeof r === "boolean" ? { value: r, src: "gb" } : { value: !1, src: "default" };
}
//@ chunk-e6aww6q8.js:2834113-2834147 placement
function BUo() {
  return getAutoModeGitStatusUploads().value;
}
//@ chunk-e6aww6q8.js:2834147-2834353 placement
function getAutoModeGitStatusUploads() {
  let CLAUDE_CODE_AUTO_MODE_GIT_STATUS_UPLOADS = antEnv.CLAUDE_CODE_AUTO_MODE_GIT_STATUS_UPLOADS;
  if (CLAUDE_CODE_AUTO_MODE_GIT_STATUS_UPLOADS !== void 0)
    return { value: CLAUDE_CODE_AUTO_MODE_GIT_STATUS_UPLOADS, src: "env" };
  let r = getAutoModeConfigOrDefault()?.gitStatusUploads;
  return typeof r === "boolean" ? { value: r, src: "gb" } : { value: !1, src: "default" };
}
//@ chunk-e6aww6q8.js:2834353-2834366 placement
var Bkr = 2000;
//@ chunk-e6aww6q8.js:2834366-2834400 placement
function jUo() {
  return getAutoModeGitStatusLimit().value;
}
//@ chunk-e6aww6q8.js:2834400-2834632 placement
function getAutoModeGitStatusLimit() {
  let CLAUDE_CODE_AUTO_MODE_GIT_STATUS_LIMIT = antEnv.CLAUDE_CODE_AUTO_MODE_GIT_STATUS_LIMIT;
  if (CLAUDE_CODE_AUTO_MODE_GIT_STATUS_LIMIT !== void 0)
    return { value: CLAUDE_CODE_AUTO_MODE_GIT_STATUS_LIMIT, src: "env" };
  let r = getAutoModeConfigOrDefault()?.gitStatusTruncationLimit;
  return typeof r === "number" && Number.isFinite(r)
    ? { value: r, src: "gb" }
    : { value: Bkr, src: "default" };
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
  ]),
  GIT_STAGE_COMMIT_PUSH_PATTERN = /\bgit\s+(?:add|stage|commit|push)\b/i;
//@ chunk-e6aww6q8.js:2834908-2834979 layout
function isGitStageCommitPushCommand(e) {
  let n = e.length > 1e4 ? e.slice(0, 1e4) : e;
  return GIT_STAGE_COMMIT_PUSH_PATTERN.test(n);
}
/**
 * 统计 porcelain 输出中的 staged、modified、untracked 文件数。
 */
//@ chunk-e6aww6q8.js:2834979-2835192 layout
function countPorcelainStatus(e) {
  let n = 0,
    r = 0,
    s = 0;
  for (let h of e.split(`
`)) {
    if (h.length < 2) continue;
    let y = h[0],
      S = h[1];
    if (y === "?" && S === "?") {
      s++;
      continue;
    }
    if (y !== " " && y !== "?") n++;
    if (S !== " ") r++;
  }
  return { staged: n, modified: r, untracked: s };
}
//@ chunk-e6aww6q8.js:2835192-2835471 layout
function truncateLinesToChars(e, n) {
  let filtered = e
    .split(
      `
`,
    )
    .filter((w) => w.length > 0);
  if (n <= 0)
    return filtered.join(`
`);
  let s = "",
    h = 0;
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
/**
 * Bash/PowerShell 工具执行破坏性命令（git reset --hard、rm -rf 等）或 git add/commit/push 时，取 git status --porcelain 摘要（clean / staged+modified+untracked 计数 / 截断的 porcelain 文本），随工具结果一起给模型；受两个开关控制。
 */
//@ chunk-e6aww6q8.js:2835471-2836366 fingerprint = getFileStatus (0.353)
async function getGitStatusForDestructiveCommand(e, n, r) {
  try {
    let s = UUo(),
      h = BUo();
    if (!s && !h) return null;
    let y = e === BASH_TOOL_NAME;
    if ((!y && e !== POWERSHELL_TOOL_NAME) || isRemoteOnlyCheck(e)) return null;
    if (n === null || typeof n !== "object" || !("command" in n) || typeof n.command !== "string")
      return null;
    let S = y ? XCe(n.command) : WSt(n.command),
      w = s && S !== null && DESTRUCTIVE_COMMAND_KINDS.has(S),
      L = h && isGitStageCommitPushCommand(n.command);
    if (!w && !L) return null;
    let G = getCwd();
    if (findGitRoot(G) === null) return null;
    let q = await runGitReadOnly(
      G,
      ["status", "--porcelain", lb, L ? "--untracked-files=all" : "--untracked-files=normal"],
      { abortSignal: r, userLocale: !0 },
    );
    if (!q.ok) return null;
    let stdout = q.stdout;
    if (L) {
      if (stdout.trim() === "") return w ? { clean: !0 } : null;
      let filtered = stdout
          .split(
            `
`,
          )
          .filter((Ie) => Ie.length > 0),
        joined = [
          ...filtered.filter((line) => line.startsWith("??")),
          ...filtered.filter((line) => !line.startsWith("??")),
        ].join(`
`);
      return { porcelain: truncateLinesToChars(joined, jUo()) };
    }
    let { staged: staged, modified: modified, untracked: untracked } = countPorcelainStatus(stdout);
    if (staged === 0 && modified === 0 && untracked === 0) return { clean: !0 };
    return { staged: staged, modified: modified, untracked: untracked };
  } catch {
    return null;
  }
}
/**
 * git rev-list --count <refs> ^<bases>，返回提交数或 null。
 */
//@ chunk-e6aww6q8.js:3651488-3651656 fingerprint = hasUnpushedCommits (0.699)
async function hasUnpushedCommits_2(e, n, r) {
  let s = await runGitInWorktree(e, ["rev-list", "--count", ...n, ...r.map((y) => `^${y}`), "--"]),
    trimmed = s.stdout.trim();
  return s.code === 0 && /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}
/**
 * 判断主机名是否指向本机（localhost、127.x、本机 hostname 及其短名、本机网卡 IP/ipv6-literal.net 形式）。
 */
//@ chunk-qmzcskz6.js:7821-8135 fingerprint = isLocalHost (1)
function isLocalHost_2(e, t = !0) {
  let replaced = e.toLowerCase().replace(/\.$/, ""),
    r = getPlatform() === "windows",
    l = r && t ? foldWindowsPathComponent : (i) => i.toLowerCase(),
    s = l(hostname()),
    o = firstLineOf(s, ".");
  return (
    replaced === "localhost" ||
    /^127(?:\.\d{1,3}){3}$/.test(replaced) ||
    replaced === s ||
    (r &&
      (replaced === o ||
        (t && (replaced === o.slice(0, w) || replaced === l(firstLineOf(hostname(), ".").slice(0, w)))))) ||
    replaced.startsWith(`${o}.`) ||
    (IP_LITERAL_PATTERN.test(replaced) && (getLocalInterfaceAddresses()?.has(replaced) ?? t))
  );
}
//@ chunk-qmzcskz6.js:8135-8191 layout
var IP_LITERAL_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$|\.ipv6-literal\.net$/;
//@ chunk-qmzcskz6.js:8191-8416 placement
function getLocalInterfaceAddresses() {
  let e = getNetworkInterfacesSafe();
  if (e === null) return null;
  return new Set(
    Object.values(e).flatMap((t) =>
      (t ?? []).flatMap(({ address: address }) => [
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
/**
 * 判断路径在当前平台是否为绝对路径（Windows 下识别盘符与 UNC 形式）。
 */
//@ chunk-qmzcskz6.js:8465-8581 placement
function isAbsolutePlatformPath(e) {
  if (getPlatform() !== "windows") return e.startsWith("/");
  let t = Q3r(e);
  return !te.test(t) && (Re.test(t) || xe.test(t));
}
//@ chunk-qmzcskz6.js:8581-8678 placement = getReservedShortcuts (1)
function normalizeCommandForPlatform(e) {
  switch (getPlatform()) {
    case "macos":
      return caseFoldKey(e);
    case "windows":
      return normalizeWindowsPathForCompare(e);
    default:
      return e;
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
  ],
  YT = [
    ...GIT_STATUS_CLEAN_ARGS.filter((e) => !e.startsWith("--ignore-submodules")),
    "--ignore-submodules=dirty",
  ];
//@ chunk-1r5nz6dk.js:2902-3074 fingerprint = isCurrentDirectoryBareGitRepo (0.807)
async function isCurrentDirectoryBareGitRepo_2(e) {
  try {
    let [r, n, o] = await Promise.all([
      lstat(join(e, "HEAD")),
      lstat(join(e, "objects")),
      lstat(join(e, "refs")),
    ]);
    return r.isFile() && n.isDirectory() && o.isDirectory();
  } catch {
    return !1;
  }
}
/**
 * git status --porcelain 限定给定路径，返回变更文件列表。
 */
//@ chunk-ca06bv0t.js:15476-15758 fingerprint = getChangedFiles (0.789)
async function getChangedFiles(r, n) {
  let mapped = n.map((s) => relative(r, s) || "."),
    a = await execFileNoThrow(
      gitExe(),
      ["-C", r, "--no-optional-locks", "status", "--porcelain", lb, "--", ...mapped],
      { env: getRemoteHostSessionCount(void 0, { userLocale: !0 }), useCwd: !0 },
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
/**
 * git ls-files --others --exclude-standard 列未跟踪文件，生成 diff 条目（区分会话前已存在的文件）。
 */
//@ chunk-wyqg6m3h.js:21370-21570 fingerprint = captureUntrackedFiles (0.54)
async function untrackedFiles(e, o) {
  if (o.slots <= 0) return [];
  let run = await e.run([
    NO_OPTIONAL_LOCKS,
    "ls-files",
    "-z",
    "--others",
    "--exclude-standard",
    "--full-name",
  ]);
  return isWholeAnswer(run)
    ? buildUntrackedFileEntries(
        e,
        run.stdout.split("\x00").filter((s) => s !== ""),
        o,
      )
    : null;
}

export {
  clearIsGitMemo,
  findGitRoot,
  runGitReadOnly,
  findGitRootUncached,
  findGitRootThroughBackendUncached,
  getBranch,
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
  getLocalInterfaceAddresses,
  readGlobalGitConfigValue,
  UUo,
  BUo,
  jUo,
  truncateLinesToChars,
  countPorcelainStatus,
  getRemoteUrlForBridge,
  dirIsInGitRepo,
  isLocalHost_2,
  isCcrGitProxySession,
  isLocalHost,
  untrackedFiles,
};
