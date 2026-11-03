/**
 * utils/worktree.ts
 *
 * worktree 生命周期：在 .claude/worktrees/<slug> 创建（git worktree add 或 WorktreeCreate hook）、加锁（pid 锁原因）、.worktreeinclude 复制、进入/退出校验、清理陈旧 worktree 与锁、tmux 会话
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/worktree.ts
 * pieces: chunk-aepeg2w5.js (7), chunk-dcmhvw5a.js (6), chunk-e6aww6q8.js (125)
 * attribution: placement 12, facade-exports 49, affinity 9, sole-consumer 14, fingerprint 4, layout 48, file-local 1, callgraph-witnessed 1
 */
import {
  join,
  isAbsolute,
  dirname,
  basename,
  resolve as resolve_2,
  sep,
  relative,
  normalize,
  win32,
} from "path";
import {
  realpath,
  lstat,
  symlink,
  readdir,
  writeFile,
  unlink,
  copyFile,
  readFile,
  rm as rm_2,
  readlink,
  stat,
  utimes,
  mkdir,
} from "fs/promises";
import { availableParallelism, homedir } from "os";
import {
  parseSettingsFileUncached,
  getInitialSettings_2,
  getRelativeSettingsFilePathForSource,
} from "./settings/settings.js";
import { saveCurrentProjectConfig, checkHasTrustDialogAccepted } from "./config.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { env } from "./env.js";
import {
  isDiskless,
  getOriginalCwd,
  getSessionId,
  getProjectRoot,
  onProcessRootHost,
} from "../bootstrap/state.js";
import { containsPathTraversal } from "./path.js";
import { getErrnoCode, errorMessage, isENOENT, withTelemetryMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import {
  findCanonicalGitRoot,
  gitExe,
  getDefaultBranch,
  findGitRoot,
  getGitSshEnv,
  getBranch,
  isLinkedWorktree,
  hasUnpushedCommits_2,
  findGitRootUncached,
  findCanonicalGitRootUncached,
  findGitRootVerifyingPositive,
} from "./git.js";
import {
  getClaudeWorktreesDir,
  checkWorktreePath,
  candidateWorktreeDirs,
  worktreesDirSpec,
  checkWorktreeIsolation,
  gitRootsForPath,
  parseWorktreeAddError,
  describeRepoRelativeLocation,
  worktreesDirSpecs,
  CONTROL_CHAR_RE,
  CONTROL_OR_FORMAT_CHAR_RE,
  worktreeLocationOf,
  getWorktreesDirSpec,
} from "./worktreeIsolation.js";
import {
  readWorktreeHeadSha,
  resolveGitDir,
  resolveRef,
  resolveGitDir_2,
  isValidGitSha,
  getCommonDir,
  pointerFileIsSuspect,
  rawPointerPathIsUnsafe,
} from "./git/gitFilesystem.js";
import { hasDotSegment, identity, uncHostOf } from "./pathClassification.js";
import {
  stripTrailingSeparators,
  findSamePath,
  symlinkVerdictForPath,
  foldCaseForCompare as foldCaseForCompare_2,
  isPathSymlinkClear,
  findWorktreeMatchingPaths,
  findUniqueWorktreeForBranch,
  containsSamePath,
  isRemovableWorktreeDir,
  toForwardSlashesOnWindows,
  normalizePathKey,
  clearReparsePoints,
  foldCaseBasic,
} from "./pathIdentity.js";
import {
  writeIfMissing,
  retryFsOp,
  copyIntoTemp,
  assertSafeThenWrite,
  writeNewFile,
} from "./atomicPublishWrite.js";
import { getPlatform } from "./platform.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { TRANSIENT_FS_ERRORS as TRANSIENT_FS_ERRORS_2 } from "./plugins/safeCopy.js";
import {
  isWorktreeMadeElsewhereStub,
  vetWorktreeRegistration,
  verifyPinnedGitDir,
  stripProgressLines,
  micromatch,
  pruneWorktreeRegistrations,
  installRepoDetectionGuards,
} from "./worktree/worktreeRegistrations.js";
import { execFileNoThrowWithCwd, execFileNoThrow } from "./execFileNoThrow.js";
import { GIT_SAFE_GLOBAL_ARGS, SAFE_GIT_ENV_CONSTANTS } from "./git/gitSafeEnv.js";
import {
  buildGitEnvForRepo,
  resolveGitDirsOrPlaceholder,
  NOT_A_GIT_REPO_PATH,
  resolveGitDirs,
  resolveGitDir as resolveGitDir_3,
} from "./git/gitDirResolution.js";
import {
  isStrictSandboxFilesystem,
  readSparseCheckoutConfig,
  hasMissingSparseObjects,
  minimalSparseDirs,
} from "./worktree/sparseCheckout.js";
import {
  inspectPartialClone,
  explainPartialCloneFailure,
  partialCloneFetchEnv,
  gitSupportsPartialCloneFetch,
  explainOnDemandFetchOff,
} from "./worktree/partialClone.js";
import { inspectSubmodules, submoduleChanges, describeSubmoduleChanges } from "./git/submoduleInspection.js";
import { withSafeGitConfig } from "./git/gitLanes.js";
import { hideUnsafePath, hideUnsafeText, hasUnsafePathGlyphsOrSurrogate } from "./unsafePathGlyphs.js";
import { printableLabel, printableNameOrPlaceholder } from "./printableName.js";
import { getFirstLine, truncateToLength, firstLineOf, countCharInString } from "./stringUtils.js";
import { isOnForeignMount, isNetworkMountPath, isForeignMountPath } from "./networkPaths.js";
import { isSentinelInode } from "./slowOperations.js";
import { isSameRepository, vetRepoForWorktrees } from "./git/worktreeVetting.js";
import { deregisterWorktree, pruneWorktreeRegistration } from "./git/worktreeRegistrations.js";
import { removeWorktreeSafely, worktreeRemovalText } from "./git/worktreeRemoval.js";
import { ENTER_WORKTREE_TOOL_NAME } from "../tools/EnterWorktreeTool/constants.js";
import { resolveRemoteUrl } from "./detectRepository.js";
import { ghIsDangerousCallback as ghIsDangerousCallback_2, getGitHostKind } from "./gitHosts.js";
import { SAFE_UPLOAD_PACK_ARG_2 } from "./gitSafeExec.js";
import { truncateMiddle as truncateMiddle_2 } from "../memdir/memoryTool.js";
import { filterUsableIgnorePatterns, splitNonEmptyLines } from "./ignorePatterns.js";
import { resolveLocalSettingsStoreRoot } from "./settings/settingsFileParsing.js";
import { storageRootFor } from "./settings/settingsStorage.js";
import { readGitConfigValueAsync } from "./git/gitConfigParser.js";
import { getPreSettingsEnvHonoringLiveDeletions } from "./managedEnvApply.js";
import { isProcessRunning as isProcessRunning_2 } from "./genericProcessUtils.js";
import {
  isSameProcessAsync,
  procIdentityFields,
  ownProcStartAsync,
  isProcessProvablyGone,
} from "./processIdentity.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { getCwd } from "./cwd.js";
import { dispatchesWorktreeCreate, executeWorktreeCreateHook, executeWorktreeRemoveHook } from "./hooks.js";
import { markIsolationUnavailableForCwd, clearResumeHintWorktree } from "./concurrentSessions.js";
import { containsVulnerableUncPath } from "./shell/readOnlyCommandValidation.js";
import {
  hasUntouchableRecordSpelling,
  processChdir,
  resolveDeepestExistingAncestorSync,
  getFsImplementation,
  UNVERIFIED_ANCESTRY,
} from "./fsOperations.js";
import { getRepoRootForWorktreePath } from "./permissions/protectedDirs.js";
import { sleep } from "./sleep.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import { R8o, buildFilterNeutralizingArgs, describeGitConfigUnreadable } from "./git/gitConfigFilters.js";
import { foldPathCase } from "./pathCaseFolding.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { isDirectlyUnderClaudeWorktreesDir } from "../daemon/jobs/killJob.js";
import { hasInode } from "./fsSafety/hardenedRead.js";
import { preferRemoteValue } from "../remote/remoteMode.js";
import { VARIADIC_VALUE_FLAGS, lastValueSlot, looksLikeOption } from "./cliArgs.js";
import { isHomeRelativePath } from "../cli/earlyArgs.js";
import { isPersonalConfigRestricted, getPersonalConfigFixHint } from "./personalConfigRestriction.js";
import { isRestrictedMode } from "./envUtils.js";
import { isInITerm2 } from "./swarm/backends/detection.js";
import { sequential } from "./sequential.js";
import { safeExecFile } from "./safeSpawn.js";
import { HostScoped } from "./hostScoped.js";

//@ chunk-e6aww6q8.js:3594932-3595112 placement = isClaudeSettingsPath (0.871)
function hasSandboxEnabledInProjectSettings(dir) {
  return ["settings.json", "settings.local.json"].some((n) => {
    let expandedPath = parseSettingsFileUncached(join(dir, ".claude", n));
    return expandedPath.settings === null
      ? expandedPath.errors.length > 0
      : expandedPath.settings.sandbox?.enabled === true;
  });
}
//@ chunk-e6aww6q8.js:3595112-3595272 facade-exports
function persistWorktreeSession(e, n) {
  setCurrentWorktreeSession(e);
  let activeWorktreeSession =
    e !== null
      ? (() => {
          let { liveLaunchAnchor, originalChangeset, ...y } = e;
          return y;
        })()
      : undefined;
  saveCurrentProjectConfig(
    (s) => ({
      ...s,
      activeWorktreeSession,
    }),
    n,
  );
}
//@ chunk-e6aww6q8.js:3595272-3595355 facade-exports
class WorktreeIsolationError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorktreeIsolationError";
  }
}
//@ chunk-e6aww6q8.js:3595355-3595657 facade-exports
function throwAgentWorktreeNotGitRefusal() {
  logFeatureBad("git_worktree_create", "git_worktree_create_not_git_repo");
  throw new WorktreeIsolationError(
    "Cannot create agent worktree: not in a git repository and no WorktreeCreate hooks are configured. Configure WorktreeCreate/WorktreeRemove hooks in settings.json to use worktree isolation with other VCS systems.",
  );
}
//@ chunk-e6aww6q8.js:3595657-3596040 facade-exports
function refuseUnavailableWorktree(e) {
  if (env.CLAUDE_CODE_EVAL_CONFINED) {
    logFeatureBad("git_worktree_create", "git_worktree_create_eval_confined");
    throw new WorktreeIsolationError(
      `Cannot create ${e}: worktree isolation is unavailable in this session (plugin evaluation harness)`,
    );
  }
  if (isDiskless()) {
    logFeatureBad("git_worktree_create", "git_worktree_create_diskless");
    throw new WorktreeIsolationError(
      `Cannot create ${e}: worktree isolation is unavailable in a session without a disk`,
    );
  }
}
//@ chunk-e6aww6q8.js:3596040-3596127 layout
class WorktreeGitTransientError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorktreeGitTransientError";
  }
}
//@ chunk-e6aww6q8.js:3596127-3596185 facade-exports
function validateWorktreeSlug(slug) {
  let n = validateWorktreeSlug_2(slug);
  if (n !== undefined) throw Error(n);
}
//@ chunk-e6aww6q8.js:3596185-3596273 layout
function isUnsafeWorktreeSlugPath(dir) {
  return (
    containsPathTraversal(dir) || isAbsolute(dir) || dir.split(/[/\\]/).some((n) => /^\.\.[ .]*$/.test(n))
  );
}
//@ chunk-e6aww6q8.js:3596273-3596601 layout
async function hasUnsafeAncestor(destPath, n) {
  let r = dirname(destPath);
  for (;;)
    try {
      let s = await realpath(r);
      if (!(await isPathUnderIdentity(n, s))) return true;
      break;
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") return true;
      if ((await lstat(r).catch((error) => (getErrnoCode(error) === "ENOENT" ? null : error))) != null)
        return true;
      let y = dirname(r);
      if (y === r) return true;
      r = y;
    }
  try {
    if ((await lstat(destPath)).isSymbolicLink()) return true;
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:3596601-3597450 fingerprint = symlinkDirectories (0.642)
/**
 * 把仓库中的指定目录（如 node_modules）以符号链接方式挂到 worktree，避免重复安装。
 */
async function symlinkDirectories(repoRootPath, worktreePath, dirsToSymlink) {
  let s;
  try {
    s = await realpath(worktreePath);
  } catch (error) {
    logForDebugging(`Skipping symlinkDirectories: realpath(${worktreePath}) failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  }
  for (let dir of dirsToSymlink) {
    if (isUnsafeWorktreeSlugPath(dir)) {
      logForDebugging(`Skipping symlink for "${dir}": path traversal or absolute path`, {
        level: "warn",
      });
      continue;
    }
    let sourcePath = join(repoRootPath, dir);
    let destPath = join(worktreePath, dir);
    if (await hasUnsafeAncestor(destPath, s)) {
      logForDebugging(`Skipping symlink for "${dir}": destination escapes worktree via committed symlink`, {
        level: "warn",
      });
      continue;
    }
    try {
      await lstat(sourcePath);
    } catch (error) {
      if (isENOENT(error))
        logForDebugging(`Skipping symlink for "${dir}": source does not exist in main repository`);
      else
        logForDebugging(
          `Skipping symlink for "${dir}": lstat failed (${getErrnoCode(error) ?? "unknown"}): ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      continue;
    }
    try {
      await symlink(sourcePath, destPath, "dir");
      logForDebugging(`Symlinked ${dir} from main repository to worktree to avoid disk bloat`);
    } catch (error) {
      let code = getErrnoCode(error);
      if (code !== "ENOENT" && code !== "EEXIST")
        logForDebugging(`Failed to symlink ${dir} (${code ?? "unknown"}): ${errorMessage(error)}`, {
          level: "warn",
        });
    }
  }
}
//@ chunk-e6aww6q8.js:3597450-3597473 facade-exports
function restoreWorktreeSession(e) {
  setCurrentWorktreeSession(e);
}
//@ chunk-e6aww6q8.js:3597473-3597534 facade-exports
function generateTmuxSessionName(repoPath, branch) {
  return `${basename(repoPath)}_${branch}`.replace(/[/.]/g, "_");
}
//@ chunk-e6aww6q8.js:3597534-3597612 facade-exports
function resolveWorktreeCleanupRoot(worktreePath, originCwd) {
  let canonicalGitRoot = findCanonicalGitRoot(worktreePath);
  if (canonicalGitRoot && isAgentWorktreeOf(worktreePath, canonicalGitRoot)) return canonicalGitRoot;
  return (originCwd ? findCanonicalGitRoot(originCwd) : null) ?? canonicalGitRoot;
}
//@ chunk-e6aww6q8.js:3597612-3597660 facade-exports
function isAgentWorktreeOf(e, n) {
  return resolve_2(dirname(e)) === resolve_2(getClaudeWorktreesDir(n));
}
//@ chunk-e6aww6q8.js:3597660-3597705 file-local
function flattenSlug(slug) {
  return slug.replaceAll("/", "+");
}
//@ chunk-e6aww6q8.js:3597705-3597748 facade-exports = worktreeBranchName (1)
function worktreeBranchName(slug) {
  return `worktree-${flattenSlug(slug)}`;
}
//@ chunk-e6aww6q8.js:3597748-3597790 affinity
function getWorktreePathForSlug(e, slug) {
  return join(e.dir, flattenSlug(slug));
}
//@ chunk-e6aww6q8.js:3597790-3597994 affinity
async function assertWorktreeDirNotSymlink(e, worktreePath) {
  let r = await checkWorktreePath(e, worktreePath);
  if (r.ok) return;
  logFeatureBad(
    "git_worktree_create",
    r.reason === "symlink" ? "git_worktree_create_symlink_rejected" : "git_worktree_create_lstat_failed",
  );
  throw new WorktreeIsolationError(r.message);
}
//@ chunk-e6aww6q8.js:3597994-3598005 affinity
var MAX_WORKTREE_SLUG_RETRIES = 20;
//@ chunk-e6aww6q8.js:3598005-3598575 affinity
async function allocateWorktreeSlug(e, slug, { isGiven, hasSessionHad }) {
  let h = candidateWorktreeDirs(e);
  for (let L of h) await assertWorktreeDirNotSymlink(L, getWorktreePathForSlug(L, slug));
  if (
    isGiven &&
    (!hasSessionHad(slug) ||
      (await Promise.all(h.map((L) => readWorktreeHeadSha(getWorktreePathForSlug(L, slug))))).some(
        (L) => L !== null,
      ))
  )
    return {
      slug,
      number: 1,
    };
  let y = new Set(
    (
      await Promise.all(
        h.map((L) =>
          readdir(L.dir).then(
            (G) => G.map((q) => q.toLowerCase()),
            (error) => {
              if (isENOENT(error)) return [];
              throw error;
            },
          ),
        ),
      )
    ).flat(),
  );
  let gitDir = await resolveGitDir(e);
  let w = isEphemeralWorktreeSlug(slug);
  for (let idx = 1; idx <= MAX_WORKTREE_SLUG_RETRIES; idx++) {
    let slug_2 = idx === 1 ? slug : suffixWorktreeSlug(slug, idx);
    if (
      !hasSessionHad(slug_2) &&
      (w || !isEphemeralWorktreeSlug(slug_2)) &&
      !y.has(flattenSlug(slug_2).toLowerCase()) &&
      (gitDir === null || (await resolveRef(gitDir, `refs/heads/${worktreeBranchName(slug_2)}`)) === null)
    )
      return {
        slug: slug_2,
        number: idx,
      };
  }
  return {
    slug,
    number: 0,
  };
}
//@ chunk-e6aww6q8.js:3598575-3599093 affinity
/**
 * 检查 worktree 路径相对仓库根的每一段是否为符号链接或无法验证，防止仓库内提交的符号链接把 worktree 引到仓库外。
 */
async function findSymlinkInWorktreeAncestry(worktreePath, n) {
  if (hasDotSegment(worktreePath) || hasDotSegment(n))
    return {
      component: worktreePath,
      kind: "unverifiable",
    };
  worktreePath = identity(worktreePath);
  n = identity(n);
  let r = (y) => !y || y === ".." || y.startsWith(`..${sep}`) || isAbsolute(y);
  let s = relative(n, worktreePath);
  if (r(s)) {
    let y = relative(comparablePath(n, "foldingPlatforms"), comparablePath(worktreePath, "foldingPlatforms"));
    if (r(y)) return null;
    s = stripTrailingSeparators(normalize(worktreePath)).split(sep).slice(-y.split(sep).length).join(sep);
  }
  let h = n;
  for (let y of s.split(sep)) {
    h = join(h, y);
    let S;
    try {
      S = await lstat(h);
    } catch (error) {
      if (isENOENT(error)) return null;
      return {
        component: h,
        kind: "unverifiable",
      };
    }
    if (S.isSymbolicLink())
      return {
        component: h,
        kind: "symlink",
      };
  }
  return null;
}
//@ chunk-e6aww6q8.js:3599093-3599115 affinity
var CLAUDE_BASE_ENV = "CLAUDE_BASE";
//@ chunk-e6aww6q8.js:3599365-3599839 sole-consumer
/**
 * 移除 agent worktree 时把 .git 指针文件（gitdir: …）写回目录；目录已不存在或 inode/dev 与核验时不一致则不写。EEXIST/ENOENT 之外的失败记 warn。
 */
async function restoreWorktreeGitPointer(e, n, r) {
  let s = await lstat(e).catch(() => null);
  if (s === null || !s.isDirectory() || s.ino !== r.ino || s.dev !== r.dev) {
    logForDebugging(
      `removeAgentWorktree: not restoring the .git pointer of ${e} \u2014 the directory is gone or no longer the one that was vetted`,
      {
        level: "warn",
      },
    );
    return;
  }
  await writeFile(
    join(e, ".git"),
    `gitdir: ${n}
`,
    {
      flag: "wx",
    },
  ).catch((error) => {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "EEXIST" && errnoCode !== "ENOENT")
      logForDebugging(
        `removeAgentWorktree: could not restore the .git pointer of ${e}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
  });
}
//@ chunk-e6aww6q8.js:3599839-3600295 sole-consumer
/**
 * 把 worktree 的基准提交写到 gitdir 下的 CLAUDE_BASE 文件（先写临时文件再独占创建）；原文件不是普通文件或有多个硬链接时记埋点并替换。
 */
async function writeWorktreeBaseline(worktreePath, n) {
  let gitDir = await resolveGitDir_2(worktreePath);
  if (!gitDir) {
    logForDebugging(`[worktree] cannot write baseline: gitdir unresolvable for ${worktreePath}`);
    return;
  }
  let s = join(gitDir, CLAUDE_BASE_ENV);
  try {
    let h = false;
    try {
      let S = await lstat(s);
      h = !S.isFile() || S.nlink !== 1;
    } catch {}
    let y = await writeIfMissing(s, n);
    await tryCreateExclusive(y, s);
    if (h) {
      logFeatureSad("git_worktree_create", "git_worktree_baseline_plant_replaced");
      logForDebugging(`[worktree] replaced a non-regular or multi-link CLAUDE_BASE leaf at ${s}`);
    }
  } catch (error) {
    logForDebugging(`[worktree] failed to write baseline to ${gitDir}: ${error}`);
  }
}
//@ chunk-e6aww6q8.js:3600295-3600472 sole-consumer = tryCreateExclusive (0.782)
async function tryCreateExclusive(e, n) {
  try {
    try {
      await retryFsOp(e, n);
    } catch (error) {
      if (getPlatform() === "windows" && getErrnoCode(error) === "EEXIST") {
        await unlink(n);
        await retryFsOp(e, n);
      } else throw error;
    }
  } catch (error) {
    await unlink(e).catch(() => {});
    throw error;
  }
}
//@ chunk-e6aww6q8.js:3600472-3600825 sole-consumer
/**
 * 复制 .worktreeinclude 文件：开关 tengu_squishy_spring 关闭时直接 copyFile；否则复制到临时文件再独占改名，遇到瞬时 FS 错误退回为独占创建。
 */
async function copyIncludedFileSafely(e, platform) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_squishy_spring", true)) {
    await copyFile(e, platform);
    return;
  }
  let r = await copyIntoTemp(e, platform);
  try {
    await tryCreateExclusive(r, platform);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== undefined && TRANSIENT_FS_ERRORS_2.has(errnoCode)) {
      logForDebugging(
        `[worktree] rename of the staged copy onto ${platform} failed (${errorMessage(error)}); creating it exclusively instead`,
        {
          level: "warn",
        },
      );
      try {
        await assertSafeThenWrite(e, platform);
      } finally {
        await unlink(r).catch(() => {});
      }
      return;
    }
    throw error;
  }
}
//@ chunk-e6aww6q8.js:3600825-3601052 affinity
async function readWorktreeBaseline_2(e) {
  let gitDir = await resolveGitDir_2(e);
  if (!gitDir)
    return {
      kind: "unreadable",
    };
  try {
    let trimmed = (await readFile(join(gitDir, CLAUDE_BASE_ENV), "utf-8")).trim();
    return isValidGitSha(trimmed)
      ? {
          kind: "recorded",
          sha: trimmed,
        }
      : {
          kind: "unreadable",
        };
  } catch (error) {
    return {
      kind: isENOENT(error) ? "absent" : "unreadable",
    };
  }
}
//@ chunk-e6aww6q8.js:3601052-3601119 facade-exports
async function isWorktreeMadeElsewhere(e) {
  return isWorktreeMadeElsewhereStub() && (await readWorktreeBaseline_2(e)).kind === "absent";
}
//@ chunk-e6aww6q8.js:3601119-3601198 facade-exports
async function readWorktreeBaseline(e) {
  let worktreeBaseline = await readWorktreeBaseline_2(e);
  return worktreeBaseline.kind === "recorded" ? worktreeBaseline.sha : null;
}
//@ chunk-e6aww6q8.js:3601198-3601314 layout
var WORKTREE_STALE_AGE_MS = 86400000;
var WORKTREE_GIT_TIMEOUT_MS = 5000;
var WORKTREE_FETCH_TIMEOUT_MS = 120000;
var MISSING_REMOTE_REF_RE = /^fatal: couldn't find remote ref /im;
var FETCH_FROM_LINE_RE = /(?:^|\n)From ([^\r\n]+)/;
var MAX_CHECKOUT_WORKERS = 16;
//@ chunk-e6aww6q8.js:3601314-3601507 layout
async function checkoutWorkersArgs(worktreePath) {
  if (
    (
      await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "config", "--get-all", "checkout.workers"],
        {
          cwd: worktreePath,
          env: buildGitEnvForRepo(worktreePath),
        },
      )
    ).code === 0
  )
    return [];
  return ["-c", `checkout.workers=${Math.min(MAX_CHECKOUT_WORKERS, Math.max(1, availableParallelism()))}`];
}
//@ chunk-e6aww6q8.js:3601507-3601783 layout = isRealPathWithinTeamDir (0.762)
async function isNotFoundErrno_2(e, n, r) {
  if (
    isStrictSandboxFilesystem() ||
    hasSandboxEnabledInProjectSettings(e) ||
    (n !== null && hasSandboxEnabledInProjectSettings(n)) ||
    (r !== null && hasSandboxEnabledInProjectSettings(r))
  )
    return true;
  for (let { dir } of candidateWorktreeDirs(e))
    try {
      if (
        (
          await readdir(dir, {
            withFileTypes: true,
          })
        ).some((h) => h.isDirectory() && hasSandboxEnabledInProjectSettings(join(dir, h.name)))
      )
        return true;
    } catch (error) {
      let code = getErrnoCode(error);
      if (code !== "ENOENT" && code !== "ENOTDIR") return true;
    }
  return false;
}
//@ chunk-e6aww6q8.js:3601783-3601831 layout
function inspectRepoPartialClone(e, n) {
  return inspectPartialClone(e, (r) => isNotFoundErrno_2(e, n, r));
}
//@ chunk-e6aww6q8.js:3601831-3601841 layout
var MAX_BASELINE_MISMATCH = 2;
//@ chunk-e6aww6q8.js:3601841-3602246 layout
/**
 * 重新核验 worktree：状态干净、HEAD 仍是 s、分支仍是 refs/heads/r，且锁不被另一个同启动时间的存活进程持有。
 */
async function isWorktreeCleanOnBranch(worktreePath, repoRoot, branch, headSha) {
  let filterNeutralizingArgs = await getFilterNeutralizingArgs(worktreePath);
  if (filterNeutralizingArgs === null) return false;
  let [y, S] = await Promise.all([
    execFileNoThrowWithCwd(
      gitExe(),
      [...filterNeutralizingArgs, ...GIT_SAFE_GLOBAL_ARGS, "--no-optional-locks", ...SAFE_GIT_ENV_CONSTANTS],
      {
        cwd: worktreePath,
        env: buildGitEnvForRepo(worktreePath),
      },
    ),
    execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "HEAD", "--symbolic-full-name", "HEAD"],
      {
        cwd: worktreePath,
        env: buildGitEnvForRepo(worktreePath),
      },
    ),
  ]);
  if (
    y.code !== 0 ||
    y.stdout.trim().length > 0 ||
    S.code !== 0 ||
    S.stdout.trim() !==
      `${headSha}
refs/heads/${branch}`
  )
    return false;
  try {
    return !(await isLockHeldByLiveSameStartProcess(await readWorktreeLockReason(worktreePath, repoRoot)));
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:3602246-3604218 layout
/**
 * 恢复已有 worktree 时尝试把它快进重置到 origin 默认分支的新基准：要求分支未变、工作区干净、子模块无改动、上游已 gone 且无独有提交、无他人持锁，
 * 必要时先补取部分克隆缺的对象，再 reset。任何前提不满足都返回 null（保留旧基准）。
 */
async function fastResumeResetToNewBase(repoRoot, worktreePath, branch, headSha, baselineSha) {
  let [defaultBranch, gitDir] = await Promise.all([getDefaultBranch(), resolveGitDir(repoRoot)]);
  let w = defaultBranch && !defaultBranch.startsWith("-") ? defaultBranch : null;
  let L = w && gitDir ? await resolveRef(gitDir, `refs/remotes/origin/${w}`) : null;
  if (!L || L === headSha) return null;
  let G = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "symbolic-ref", "--short", "-q", "HEAD"],
    {
      cwd: worktreePath,
      env: buildGitEnvForRepo(worktreePath),
    },
  );
  if (G.code !== 0 || G.stdout.trim() !== branch) return null;
  let filterNeutralizingArgs = await getFilterNeutralizingArgs(worktreePath);
  if (filterNeutralizingArgs === null) return null;
  let Z = await execFileNoThrowWithCwd(
    gitExe(),
    [...filterNeutralizingArgs, ...GIT_SAFE_GLOBAL_ARGS, ...SAFE_GIT_ENV_CONSTANTS],
    {
      cwd: worktreePath,
      env: buildGitEnvForRepo(worktreePath, undefined, {
        userLocale: true,
      }),
    },
  );
  if (Z.code !== 0 || Z.stdout.trim().length > 0) {
    logForDebugging(
      `[worktree] fast-resume reset skipped for ${worktreePath}: ` +
        (Z.code !== 0 ? `status failed (code ${Z.code})` : "tree read dirty under filter-driver-off pins"),
    );
    return null;
  }
  let Se = await inspectSubmodules(worktreePath);
  if (Se.kind !== "verified" || submoduleChanges(Se) !== undefined) return null;
  if (!(baselineSha !== null && headSha === baselineSha)) {
    let defaultRemoteRef = await getDefaultRemoteRef(repoRoot);
    if (defaultRemoteRef === null || !(await isUpstreamGoneAndMerged(worktreePath, defaultRemoteRef)))
      return null;
  }
  try {
    if (await isLockHeldByLiveSameStartProcess(await readWorktreeLockReason(worktreePath, repoRoot)))
      return null;
  } catch {
    return null;
  }
  let we = await inspectRepoPartialClone(repoRoot, worktreePath);
  let Ee = await explainPartialCloneFailure(
    repoRoot,
    L,
    we,
    () => readSparseCheckoutConfig(worktreePath),
    MAX_BASELINE_MISMATCH,
  ).catch((error) => ({
    failure: errorMessage(error),
    fetches: 0,
  }));
  if (Ee.failure !== null) {
    logForDebugging(
      `[worktree] resumed worktree ${worktreePath} keeps its old base; the objects its new base ${L} needs were not fetched: ${Ee.failure}`,
    );
    return null;
  }
  if (
    we.inForce &&
    (await readSparseCheckoutConfig(worktreePath)
      .then((sparseCheckoutConfig) => hasMissingSparseObjects(repoRoot, L, sparseCheckoutConfig))
      .catch(() => true))
  ) {
    logForDebugging(
      `[worktree] resumed worktree ${worktreePath} keeps its old base: moving it to ${L} needs objects this repository does not have (or they could not be listed)`,
    );
    return null;
  }
  let Ae = await checkoutWorkersArgs(worktreePath);
  if (we.inForce && !(await isWorktreeCleanOnBranch(worktreePath, repoRoot, branch, headSha))) {
    logForDebugging(
      `[worktree] fast-resume reset skipped for ${worktreePath}: after listing or fetching the objects for ${L}, a re-check found the worktree dirty, off its commit or branch, claimed by another session, or unreadable`,
    );
    return null;
  }
  let filterNeutralizingArgs_2 = await getFilterNeutralizingArgs(worktreePath);
  if (filterNeutralizingArgs_2 === null) return null;
  if (
    (
      await execFileNoThrowWithCwd(
        gitExe(),
        [...filterNeutralizingArgs_2, ...GIT_SAFE_GLOBAL_ARGS, ...Ae, "reset", "--hard", L, "--"],
        {
          cwd: worktreePath,
          env: withSafeGitConfig(worktreePath, partialCloneFetchEnv(we)),
        },
      )
    ).code !== 0
  ) {
    logForDebugging(
      `[worktree] could not reset resumed worktree ${worktreePath} to ${L}; resuming it unchanged`,
    );
    return null;
  }
  await writeWorktreeBaseline(worktreePath, L);
  logForDebugging(
    `[worktree] reset resumed worktree ${worktreePath} to ${L} \u2014 its previous work was fully upstream`,
  );
  return L;
}
//@ chunk-e6aww6q8.js:3604218-3606147 layout
/**
 * 目录存在但 gitdir 已不存在的孤儿 worktree：确认 .git 指向本仓库的 worktrees 目录、分支没有未推送提交后删除该目录；任一 git 命令失败都拒绝自愈并抛错。
 */
async function selfHealOrphanedWorktreeDir(repoRoot, worktreesDir, worktreePath, branch) {
  let gitDir = await resolveGitDir_2(worktreePath);
  if (!gitDir) return;
  let y = false;
  try {
    await readdir(gitDir);
  } catch (error) {
    y = isENOENT(error);
  }
  if (!y) return;
  let gitDir_2 = await resolveGitDir(repoRoot);
  if (gitDir_2) {
    let G = identity(resolve_2(dirname(gitDir)));
    let q = identity(resolve_2(join(gitDir_2, "worktrees")));
    let Z = await realpath(gitDir_2).then(
      (Se) => identity(join(Se, "worktrees")),
      () => null,
    );
    if (G !== q && G !== Z)
      throw new WorktreeIsolationError(
        `The folder ${hideUnsafePath(worktreePath)} is a leftover worktree whose .git file points to another location, so it was left as is. Remove it if it has no work to keep, or choose a different worktree name.`,
      );
  }
  let w = await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "remote"], {
    cwd: repoRoot,
    env: buildGitEnvForRepo(repoRoot),
  });
  if (w.code !== 0)
    throw Error(
      `Orphaned worktree dir at ${hideUnsafePath(worktreePath)} but \`git remote\` failed (git said ${
        printableLabel(getFirstLine(w.stderr.trim()), {
          head: 60,
          tail: 120,
        }) || "nothing"
      }) \u2014 refusing to self-heal. Remove ${hideUnsafePath(worktreePath)} manually if it has no work to keep.`,
    );
  let L = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--verify", "--quiet", branch],
    {
      cwd: repoRoot,
      env: buildGitEnvForRepo(repoRoot),
    },
  );
  if (L.code !== 0 && L.stderr.trim().length > 0)
    throw Error(
      `Orphaned worktree dir at ${hideUnsafePath(worktreePath)} but rev-parse on ${branch} failed (git said ${
        printableLabel(getFirstLine(L.stderr.trim()), {
          head: 60,
          tail: 120,
        }) || "nothing"
      }) \u2014 refusing to self-heal. Remove ${hideUnsafePath(worktreePath)} manually if it has no work to keep.`,
    );
  if (w.stdout.trim().length > 0 && L.code === 0) {
    let G = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "rev-list", "--max-count=1", branch, "--not", "--remotes"],
      {
        cwd: repoRoot,
        env: buildGitEnvForRepo(repoRoot),
      },
    );
    if (G.code !== 0)
      throw Error(
        `Orphaned worktree dir at ${hideUnsafePath(worktreePath)} but rev-list on ${branch} failed (git said ${
          printableLabel(getFirstLine(G.stderr.trim()), {
            head: 60,
            tail: 120,
          }) || "nothing"
        }) \u2014 refusing to self-heal. Remove ${hideUnsafePath(worktreePath)} manually if it has no work to keep.`,
      );
    if (G.stdout.trim().length > 0)
      throw Error(
        `Orphaned worktree dir at ${hideUnsafePath(worktreePath)} but branch ${branch} has unpushed commits \u2014 refusing to self-heal. Push or delete the branch, then retry.`,
      );
  }
  await assertWorktreeDirNotSymlink(worktreesDir, worktreePath);
  try {
    await rm_2(worktreePath, {
      recursive: true,
      force: true,
    });
    logForDebugging(`[worktree] removed orphaned worktree directory at ${worktreePath}`);
  } catch (error) {
    throw Error(
      `Cannot self-heal orphaned worktree at ${hideUnsafePath(worktreePath)}: it could not be removed${getErrnoCode(error) ? ` (${getErrnoCode(error)})` : ""}. Remove manually to proceed.`,
    );
  }
}
//@ chunk-e6aww6q8.js:3606147-3606276 layout
async function candidateWorktreePaths(e, worktreePath) {
  let r = await realpath(e.anchor).catch(() => null);
  return [
    join(e.dir, basename(worktreePath)),
    ...(r === null ? [] : [join(worktreesDirSpec(e, r).dir, basename(worktreePath))]),
  ];
}
//@ chunk-e6aww6q8.js:3606276-3606391 layout
async function isSameRegisteredPath(pathA, onlyIfRegisteredAt, above) {
  let pathB = findSamePath(pathA, onlyIfRegisteredAt);
  if (pathB === null) return false;
  if (isOnForeignMount(pathA, pathB)) return false;
  return (await comparePathIdentity(pathA, pathB, above)) === "same";
}
//@ chunk-e6aww6q8.js:3606391-3607352 layout
/**
 * 比较两个路径是否指向同一目录/文件：两侧祖先都无链接（P1 为 clear）后用 bigint lstat 比较 dev/ino，前后两次检查防竞态；
 * 返回 same / different / unknown / unreadable / untrusted（inode 不可信）。
 */
async function comparePathIdentity(pathA, pathB, above, kind = "directory") {
  let h = stripTrailingSeparators(normalize(pathA));
  let y = stripTrailingSeparators(normalize(pathB));
  let [S, w] = await Promise.all([
    symlinkVerdictForPath(kind === "file" ? dirname(h) : h, above),
    symlinkVerdictForPath(kind === "file" ? dirname(y) : y, above),
  ]);
  if (S === "unknown" || w === "unknown") return "unknown";
  if (S !== "clear" || w !== "clear") return "different";
  let [L, G] = await Promise.all([
    lstat(h, {
      bigint: true,
    }).catch(() => null),
    lstat(y, {
      bigint: true,
    }).catch(() => null),
  ]);
  if (L === null || G === null) return "unreadable";
  let [q, Z] = await Promise.all([
    symlinkVerdictForPath(kind === "file" ? dirname(h) : h, above),
    symlinkVerdictForPath(kind === "file" ? dirname(y) : y, above),
  ]);
  if (q !== "clear" || Z !== "clear") return q === "unknown" || Z === "unknown" ? "unknown" : "different";
  if (!(kind === "file" ? L.isFile() && G.isFile() : L.isDirectory() && G.isDirectory())) return "different";
  if (isSentinelInode(L.ino) !== isSentinelInode(G.ino)) return "different";
  if (L.dev !== 0n && G.dev !== 0n && L.dev !== G.dev) return "different";
  if (isSentinelInode(L.ino) || L.dev === 0n || G.dev === 0n) return "untrusted";
  let ke = await lstat(dirname(h), {
    bigint: true,
  }).catch(() => null);
  if (ke !== null && L.dev === ke.dev && L.ino === ke.ino) return "untrusted";
  return L.dev === G.dev && L.ino === G.ino ? "same" : "different";
}
//@ chunk-e6aww6q8.js:3607352-3607411 layout = getReservedShortcuts (1)
function isCaseInsensitivePlatform() {
  let platform = getPlatform();
  return platform === "windows" || platform === "macos";
}
//@ chunk-e6aww6q8.js:3607411-3607487 layout
function comparablePath(e, n) {
  let r = stripTrailingSeparators(identity(e));
  return n === "everyPlatform" || isCaseInsensitivePlatform() ? foldCaseForCompare_2(r) : r;
}
//@ chunk-e6aww6q8.js:3607487-3607591 layout
function isIdentityMatch(e, foldOn, r, s) {
  return (
    e === "same" ||
    (e === "untrusted" &&
      (foldOn === "everyPlatform" || isCaseInsensitivePlatform()) &&
      foldCaseForCompare(r) === foldCaseForCompare(s))
  );
}
//@ chunk-e6aww6q8.js:3607591-3607727 layout
function foldCaseForCompare(e) {
  return stripTrailingSeparators(identity(e)).replace(/\p{Lu}/gu, (n) => {
    if (n.length > 1) return n;
    let lower = n.toLowerCase();
    return lower.toUpperCase() === n ? lower : n;
  });
}
//@ chunk-e6aww6q8.js:3607727-3607891 layout
async function isSamePathIdentity(pathA, pathB, r = {}) {
  if (stripTrailingSeparators(normalize(pathA)) === stripTrailingSeparators(normalize(pathB))) return true;
  let foldOn = r.foldOn ?? "foldingPlatforms";
  return (
    comparablePath(pathA, foldOn) === comparablePath(pathB, foldOn) &&
    isIdentityMatch(await comparePathIdentity(pathA, pathB, r.above, r.kind), foldOn, pathA, pathB)
  );
}
//@ chunk-e6aww6q8.js:3607891-3608241 layout
/**
 * 判断 n 是否在 e 之下（strictly 时不含相等）：先按规范化字符串，再在大小写折叠平台上按前缀段的 inode 身份比较。
 */
async function isPathUnderIdentity(e, n, r = {}) {
  let strictly = r.strictly ?? false;
  let pathB = stripTrailingSeparators(normalize(e));
  let y = stripTrailingSeparators(normalize(n));
  if (y.startsWith(pathB + sep)) return true;
  if (y === pathB) return !strictly;
  let foldOn = r.foldOn ?? "foldingPlatforms";
  let w = comparablePath(pathB, foldOn);
  let L = comparablePath(y, foldOn);
  let G = pathB.split(sep).length;
  let parts = y.split(sep);
  if (parts.length < G || (strictly && parts.length === G) || (L !== w && !L.startsWith(w + sep)))
    return false;
  let pathA = parts.slice(0, G).join(sep);
  return isIdentityMatch(await comparePathIdentity(pathA, pathB, r.above), foldOn, pathA, pathB);
}
//@ chunk-e6aww6q8.js:3608241-3611558 layout
/**
 * 撤销一次 worktree add 的结果：核验注册信息与仓库一致、从 git worktree list 找到该分支（或按 byPathIn 路径）的 worktree，
 * 排除主 worktree、他机、含链接或不完整的路径后安全删除；不能删除时视情况删掉 .git 指针并记 "Kept worktree registration"。返回是否已删除。
 */
async function removeWorktreeRegistration(repoRoot, branch, worktreePath, options = {}) {
  let h = options.onlyIfRegisteredAt === undefined;
  let y = await realpath(repoRoot).catch(() => null);
  let S = async (
    reason,
    { deregister: Ee = options.deregisterOnKeep === "ifOwned" ? h : (options.deregisterOnKeep ?? true) } = {},
  ) => {
    logForDebugging(`Kept worktree registration for ${branch}: ${reason}`, {
      level: "warn",
    });
    if (
      Ee &&
      (await isPathSymlinkClear(worktreePath, repoRoot)) &&
      (await readlink(worktreePath).then(
        () => false,
        (error) => getErrnoCode(error) === "EINVAL",
      ))
    )
      await unlink(join(worktreePath, ".git")).catch(() => {});
    return false;
  };
  let pinned = await vetWorktreeRegistration(repoRoot);
  if (!pinned.ok)
    return S(pinned.reason, {
      ...(pinned.outcome === "unlisted" && {
        deregister: false,
      }),
    });
  let L = await isSameRepository(pinned.root, pinned.gitDir);
  if ("refused" in L)
    return S(L.refused, {
      deregister: false,
    });
  let G = ["--git-dir", pinned.gitDir];
  let q = async (we) => {
    let Ee = await verifyPinnedGitDir(pinned, resolveGitDirsOrPlaceholder(repoRoot));
    return "refused" in Ee
      ? Ee
      : execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...G, ...we], {
          cwd: repoRoot,
          env: Ee.env,
        });
  };
  let Z = await q(["worktree", "list", "--porcelain", "-z"]);
  if ("refused" in Z)
    return S(Z.reason, {
      deregister: false,
    });
  let Se;
  if (Z.code === 0) {
    let we;
    if (options.byPathIn) {
      let byPathIn = options.byPathIn;
      let Me = basename(worktreePath);
      let We = byPathIn.anchor === repoRoot ? y : await realpath(byPathIn.anchor).catch(() => null);
      let ze = [
        ...(We === null ? [] : [join(worktreesDirSpec(byPathIn, We).dir, Me)]),
        join(byPathIn.dir, Me),
      ];
      we = findWorktreeMatchingPaths(Z.stdout, ze);
      if (we === null) return S(`git lists no worktree at ${ze.join(" or ")}`);
    } else {
      we = findUniqueWorktreeForBranch(Z.stdout, branch);
      if (we === null) return S("git lists no worktree checked out on it");
    }
    if (
      options.onlyIfRegisteredAt !== undefined &&
      !containsSamePath(we, options.onlyIfRegisteredAt) &&
      !(await isSameRegisteredPath(we, options.onlyIfRegisteredAt, repoRoot))
    ) {
      logForDebugging(
        `Kept worktree registration for ${branch}: ${we} is not at ${options.onlyIfRegisteredAt.join(" or ")}, so this add did not create it`,
        {
          level: "warn",
        },
      );
      return false;
    }
    h = true;
    if (findSamePath(we, [repoRoot, ...(y === null ? [] : [y])]) !== null) {
      logForDebugging(`Kept worktree registration for ${branch}: it names the main worktree`, {
        level: "warn",
      });
      return false;
    }
    if (isOnForeignMount(we, repoRoot)) {
      logForDebugging(`Kept worktree registration for ${branch}: ${we} is on another host`, {
        level: "warn",
      });
      return false;
    }
    let Ee = await symlinkVerdictForPath(we, repoRoot);
    if (Ee === "missing") {
      let Ie = await isSameRepository(pinned.root, pinned.gitDir);
      if ("refused" in Ie)
        logForDebugging(`Kept worktree registration for ${branch}: ${Ie.refused}`, {
          level: "warn",
        });
      return (
        ("refused" in Ie
          ? {
              outcome: "kept",
              reason: Ie.refused,
            }
          : await deregisterWorktree(
              Ie.gitDir,
              {
                worktreePath: we,
                repoSpelled: pinned.root,
              },
              {
                locked: "keep",
              },
            )
        ).outcome === "dropped"
      );
    }
    if (Ee !== "clear") return S(`${we} has a link in a component, or one that cannot be probed`);
    let Ae = await realpath(we).catch(() => null);
    if (Ae === null) return S(`${we} does not resolve`);
    if (y !== null && stripTrailingSeparators(Ae) === stripTrailingSeparators(y)) {
      logForDebugging(`Kept worktree registration for ${branch}: it resolves to the main worktree`, {
        level: "warn",
      });
      return false;
    }
    if (!(await isRemovableWorktreeDir(we, Ae, repoRoot)))
      return S(`${we} is not intact (a link may have been introduced)`);
    Se = toForwardSlashesOnWindows(we);
  } else if (await gitSupportsPartialCloneFetch(repoRoot))
    return S("could not read git's worktree list", {
      deregister: false,
    });
  else {
    if (!(await isPathSymlinkClear(worktreePath, repoRoot)))
      return S(`${worktreePath} has a link in a component`);
    let we = await realpath(worktreePath).catch(() => null);
    if (we === null || !(await isRemovableWorktreeDir(worktreePath, we, repoRoot)))
      return S(`${worktreePath} is not intact`);
    Se = worktreePath;
  }
  let ke = await removeWorktreeSafely(repoRoot, Se, {
    git: {
      dir: L.gitDir,
      root: pinned.root,
    },
    deregisterIfStopped: options.dropIfStopped === true,
  });
  if (ke.outcome === "unanchored") {
    let we = await q(["worktree", "remove", "--force", Se]);
    if ("refused" in we)
      return S(we.reason, {
        deregister: false,
      });
    if (we.code !== 0)
      logForDebugging(`Kept worktree registration for ${branch}: git could not remove ${Se}`, {
        level: "warn",
      });
    return we.code === 0;
  }
  if (ke.outcome === "delete_failed") {
    if (ke.deregistered) {
      logForDebugging(
        `Worktree for ${branch} not fully deleted, its registration dropped: ${worktreeRemovalText(ke)}`,
        {
          level: "warn",
        },
      );
      return false;
    }
    return S(
      worktreeRemovalText(ke),
      ke.started
        ? {
            deregister: true,
          }
        : {},
    );
  }
  if (ke.outcome !== "removed")
    logForDebugging(
      `Removing the worktree for ${branch} at ${Se} did not finish: ${worktreeRemovalText(ke)}`,
      {
        level: "warn",
      },
    );
  return ke.outcome === "removed";
}
//@ chunk-e6aww6q8.js:3611558-3614484 layout
/**
 * 用 git rev-parse（或 exactRef 时 show-ref）解析 worktree 的基准提交；失败时按退出码/超时/输出分类原因、记埋点，并抛出带诊断建议的错误。
 */
async function resolveWorktreeBaseSha({ base, kind, failure, cwd, root, exactRef }) {
  let gitEnvForRepo = buildGitEnvForRepo(root);
  let w = exactRef === true ? "show-ref" : "rev-parse";
  let { stdout, stderr, code, exitCode, timedOut } = await execFileNoThrowWithCwd(
    gitExe(),
    exactRef === true
      ? [...GIT_SAFE_GLOBAL_ARGS, "show-ref", "--verify", "--hash", base]
      : [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--verify", "--quiet", base],
    {
      cwd,
      env: gitEnvForRepo,
    },
  );
  let trimmed = stdout.trim();
  if (code === 0 && trimmed !== "") return trimmed;
  logFeatureBad("git_worktree_create", "git_worktree_create_revparse_failed");
  let trimmed_2 = stderr.trim();
  let Ee = exactRef === true && exitCode === 128 && trimmed_2 === `fatal: '${base}' - not a valid ref`;
  let Ae =
    code === 0
      ? "empty_answer"
      : timedOut
        ? "timed_out"
        : exitCode === undefined
          ? "not_completed"
          : exitCode === 1
            ? trimmed_2 === "" && trimmed === ""
              ? "name_missing"
              : "exit_1_with_output"
            : Ee
              ? "name_missing"
              : exitCode === 128
                ? "git_refused"
                : "other_exit";
  let Ie = gitEnvForRepo.GIT_DIR === NOT_A_GIT_REPO_PATH ? "no" : "yes";
  let mapped = truncateToLength(trimmed_2, 65536)
    .split(
      `
`,
    )
    .map((line) => truncateToLength(line, 4096));
  let We =
    mapped.find((yt) => /^(fatal|error):/.test(yt)) ??
    mapped.find((yt) => yt.startsWith("warning:")) ??
    mapped.find((yt) => printableLabel(yt) !== "") ??
    "";
  let ze = `git ${w} failed, and its output is not shown.`;
  let lt = "the git that Claude Code runs (which may not be the one in your shell)";
  let Je = `or that ${lt} is not working. Running git status in this repository may show which.`;
  let nt = `It may also be that ${lt} is not working. Running git status in this repository may show more.`;
  let pt =
    'To start worktrees from your current HEAD instead, set worktree.baseRef to "head" in Claude Code settings.';
  let Et =
    Ae === "empty_answer"
      ? `git ${w} succeeded but printed no commit id.`
      : Ae === "timed_out"
        ? `git ${w} timed out.`
        : Ae === "not_completed"
          ? "git failed to start, or was stopped before it finished."
          : Ie === "no"
            ? "Claude Code could not confirm that this repository's .git entry belongs to the folder it is in (for example a symlinked .git, or a .git file that points elsewhere), so no worktree can be made from it."
            : Ae === "exit_1_with_output"
              ? kind === "origin_default"
                ? `${ze} The fetch from origin succeeded, so it may be that this repository has no such ref afterwards (for example a single-branch clone of another branch, or a bare clone without a fetch refspec), ${Je} ${pt}`
                : kind === "fetch_head"
                  ? `${ze} The fetch of the PR/MR succeeded, so it may be that FETCH_HEAD names no commit afterwards, ${Je}`
                  : `${ze} It may be that HEAD does not point to a commit (for example a new repository, or a branch without a commit yet), ${Je}`
              : Ae !== "name_missing"
                ? `git ${w} failed (git said ${
                    printableLabel(We, {
                      head: 60,
                      tail: 120,
                    }) || (trimmed_2 === "" && trimmed === "" ? "nothing" : "nothing that can be shown here")
                  }).`
                : kind === "origin_default"
                  ? `the fetch from origin succeeded, but git ${w} found no such ref afterwards (for example in a single-branch clone of another branch, or a bare clone without a fetch refspec). ${pt} ${nt}`
                  : kind === "fetch_head"
                    ? `the fetch of the PR/MR succeeded, but git rev-parse returned no commit for FETCH_HEAD afterwards. ${nt}`
                    : `git rev-parse returned no commit for HEAD (for example in a new repository, or on a branch without a commit yet), so Claude Code has nothing to base a worktree on. ${nt}`;
  throw withTelemetryMessage(
    Error(`${failure}: ${Et}`),
    `worktree base not resolved (base=${kind}, cause=${Ae}, repo_confirmed=${Ie})`,
  );
}
//@ chunk-e6aww6q8.js:3614484-3614710 layout
function resolveHeadAsBase({ repoRoot, fromCwd, kind }) {
  let s = fromCwd ?? repoRoot;
  return resolveWorktreeBaseSha({
    base: "HEAD",
    kind,
    failure:
      kind === "head_requested"
        ? `Failed to resolve HEAD in ${hideUnsafePath(s)}`
        : 'Failed to resolve base branch "HEAD"',
    cwd: s,
    root: fromCwd === undefined ? repoRoot : (findGitRoot(fromCwd) ?? fromCwd),
  });
}
//@ chunk-e6aww6q8.js:3614710-3615195 layout
async function readFetchHeadForRef(gitDir, n, r) {
  let s;
  try {
    s = await readFile(join(gitDir, "FETCH_HEAD"), "utf-8");
  } catch {
    return null;
  }
  let h = new Set([
    `'refs/${n}' of ${r}`,
    `tag '${n}' of ${r}`,
    `branch '${n}' of ${r}`,
    `remote-tracking branch '${n}' of ${r}`,
    `remote-tracking branch '${n}/HEAD' of ${r}`,
  ]);
  let y;
  let S = false;
  for (let line of s.split(/\r?\n/)) {
    let [L = "", , G = ""] = line.split("\t");
    if (!isValidGitSha(L)) continue;
    if (G === `'${n}' of ${r}`) {
      if (y !== undefined && y !== L) return null;
      y = L;
    } else if (h.has(G)) S = true;
  }
  if (y !== undefined)
    return {
      sha: y,
    };
  return S ? "absent" : null;
}
//@ chunk-e6aww6q8.js:3615195-3625933 callgraph-witnessed = getOrCreateWorktree (0.265)
/**
 * 创建或复用 <repo>/.claude/worktrees/<slug>（分支 worktree-<slug>）：已存在则校验属于本仓库、未被符号链接重定向并按需刷新到基准；否则清理陈旧锁、按 worktree.baseRef（head 或默认远程分支）git worktree add。
 */
async function getOrCreateWorktree(e, worktreesDir, r, s) {
  refuseUnavailableWorktree("a worktree");
  let worktreePath = getWorktreePathForSlug(worktreesDir, r);
  let worktreeBranch = worktreeBranchName(r);
  let S = s?.fromHead ?? (!s?.prNumber && getInitialSettings_2().worktree?.baseRef === "head");
  await assertWorktreeDirNotSymlink(worktreesDir, worktreePath);
  let existingHead = await readWorktreeHeadSha(worktreePath);
  if (existingHead && s?.isBranchNew) {
    logFeatureBad("git_worktree_create", "git_worktree_create_numbered_name_taken");
    throw new WorktreeIsolationError(
      `a worktree named "${r}" appeared while Claude Code was about to create it, so it was left as it is. Call ${ENTER_WORKTREE_TOOL_NAME} again, or pass a different name.`,
    );
  }
  if (existingHead) {
    let gitDir = await resolveGitDir_2(worktreePath);
    let gitDir_2 = await resolveGitDir(e);
    if (gitDir && gitDir_2) {
      let It = join(gitDir_2, "worktrees");
      let [Yt, qt] = await Promise.all([
        stat(dirname(gitDir)).catch(() => null),
        stat(It).catch((error) => (isENOENT(error) ? "enoent" : null)),
      ]);
      if (Yt !== null && qt !== null && (qt === "enoent" || Yt.dev !== qt.dev || Yt.ino !== qt.ino)) {
        logFeatureBad("git_worktree_create", "git_worktree_resume_foreign_repo");
        throw new WorktreeIsolationError(
          `The worktree directory at ${hideUnsafePath(worktreePath)} belongs to a different repository. Remove it if it has no work to keep, or choose a different worktree name.`,
        );
      }
    }
    let pt = await checkWorktreeIsolation(worktreePath, [], gitRootsForPath(getOriginalCwd(), e));
    if (!pt.ok) {
      logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected");
      throw new WorktreeIsolationError(pt.message);
    }
    let worktreeBaseline = await readWorktreeBaseline_2(worktreePath);
    let sha = worktreeBaseline.kind === "recorded" ? worktreeBaseline.sha : null;
    let gt = worktreeBaseline.kind === "absent" && isWorktreeMadeElsewhereStub();
    let date = new Date();
    await utimes(worktreePath, date, date).catch(() => {});
    if (!S && !s?.prNumber && !s?.resumeAsIs && !gt) {
      let It = await fastResumeResetToNewBase(e, worktreePath, worktreeBranch, existingHead, sha);
      if (It)
        return {
          worktreePath,
          worktreeBranch,
          headCommit: It,
          existed: true,
          refreshed: true,
          madeElsewhere: false,
        };
    }
    return {
      worktreePath,
      worktreeBranch,
      headCommit: sha ?? existingHead,
      existed: true,
      madeElsewhere: gt,
    };
  }
  if (resolveGitDirs(e) === null && resolveGitDir_3(e)) {
    logFeatureBad("git_worktree_create", "git_worktree_create_bare_layout_root");
    throw new WorktreeIsolationError(
      `The .git in ${hideUnsafePath(e)} points to a bare repository, so Claude Code can't create a worktree from this directory. Start Claude Code in one of that repository's worktrees instead (git worktree add makes one).`,
    );
  }
  await selfHealOrphanedWorktreeDir(e, worktreesDir, worktreePath, worktreeBranch);
  let L = await readWorktreeLockReason(worktreePath, e).catch((error) => {
    logForDebugging(
      `[worktree] skipped the stale-lock self-heal for ${worktreePath}: ${errorMessage(error)}`,
    );
    return;
  });
  if (
    L !== undefined &&
    CLAUDE_WORKTREE_LOCK_REASON_PATTERN.test(L) &&
    (await readdir(worktreePath).then(
      (Je) => Je.length === 0,
      (error) => isENOENT(error),
    )) &&
    !(await isLockHeldByLiveSameStartProcess(L))
  )
    await pruneWorktreeRegistration(e, worktreePath, {
      locked: {
        unlockIf: (Je) => CLAUDE_WORKTREE_LOCK_REASON_PATTERN.test(Je.trim()) && Je.trim() === L.trim(),
      },
    });
  await mkdir(worktreesDir.dir, {
    recursive: true,
  });
  let G;
  let baseSha = null;
  if (S) {
    baseSha = await resolveHeadAsBase({
      repoRoot: e,
      fromCwd: s?.fromCwd,
      kind: "head_requested",
    });
    G = `${baseSha}^{commit}`;
  } else if (s?.prNumber) {
    let remoteUrl = await resolveRemoteUrl(e);
    let nt = remoteUrl ? ghIsDangerousCallback_2(remoteUrl) : null;
    let pt = nt ? getGitHostKind(nt) : "other";
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_melodic_octopus", true);
    let yt;
    let gt;
    if (featureValue_CACHED_MAY_BE_STALE) {
      let hn = `refs/pull/${s.prNumber}/head`;
      let ho = `refs/merge-requests/${s.prNumber}/head`;
      if (pt === "github") yt = [hn];
      else if (pt === "gitlab") yt = [ho];
      else {
        gt = s.prForge === "gitlab" ? ho : s.prForge === "github" ? hn : undefined;
        yt = gt === ho ? [ho, hn] : [hn, ho];
      }
    } else {
      let hn = `pull/${s.prNumber}/head`;
      let ho = `merge-requests/${s.prNumber}/head`;
      yt = pt === "gitlab" ? [ho] : pt === "github" ? [hn] : [hn, ho];
    }
    let gitDir = featureValue_CACHED_MAY_BE_STALE ? resolveGitDirsOrPlaceholder(e).gitDir : "";
    let It = [];
    let Yt;
    let qt = 1;
    let Zt = "git_worktree_create_pr_fetch_failed";
    let rn = "";
    let gitSshEnv = await getGitSshEnv(e);
    for (let hn of yt) {
      let {
        code: prFetchCode,
        stderr: prFetchStderr,
        timedOut,
      } = await execFileNoThrowWithCwd(gitExe(), ["fetch", SAFE_UPLOAD_PACK_ARG_2, "origin", hn], {
        cwd: e,
        stdin: "ignore",
        ...gitSshEnv,
        env: {
          ...gitSshEnv.env,
          LC_ALL: "C",
        },
        timeout: WORKTREE_FETCH_TIMEOUT_MS,
      });
      qt = prFetchCode;
      if (prFetchCode === 0) {
        if (!featureValue_CACHED_MAY_BE_STALE) break;
        let Xn = FETCH_FROM_LINE_RE.exec(prFetchStderr)?.[1];
        let fo = Xn === undefined ? null : await readFetchHeadForRef(gitDir, hn, Xn);
        if (fo && fo !== "absent")
          It.push({
            refspec: hn,
            sha: fo.sha,
          });
        else {
          qt = 1;
          if (!gt || hn === gt || !rn) {
            Zt = "git_worktree_create_pr_ref_unverified";
            rn =
              fo === "absent"
                ? `origin has no ref ${hn}; a branch, tag or other ref named like it was fetched instead, which is not pull or merge request #${s.prNumber}. Check the number, and that origin is the repository #${s.prNumber} belongs to; if both are right, that ref has to be deleted from origin first.`
                : Xn === undefined
                  ? `the fetch of ${hn} succeeded, but git did not print the "From <url>" line that says where it fetched from, so the result could not be checked. Run the command again.`
                  : `the fetch succeeded, but FETCH_HEAD does not record ${hn} from ${Xn}, most likely because another git fetch in this repository overwrote it at the same moment. Run the command again.`;
          }
          if (fo === null)
            Yt ??= {
              refspec: hn,
              why:
                Xn === undefined
                  ? "git did not print where it fetched from"
                  : "FETCH_HEAD did not record that fetch",
            };
        }
        continue;
      }
      if (!rn) rn = prFetchStderr || (timedOut ? `the fetch of ${hn} timed out` : "");
      if (featureValue_CACHED_MAY_BE_STALE && !Yt && !MISSING_REMOTE_REF_RE.test(prFetchStderr)) {
        let filtered = stripProgressLines(prFetchStderr)
          .split(
            `
`,
          )
          .filter(Boolean);
        let replaced = (filtered.find((To) => /^(fatal|error):/i.test(To)) ?? filtered.at(-1) ?? "").replace(
          /^(fatal|error|warning):\s*/i,
          "",
        );
        Yt = {
          refspec: hn,
          why: timedOut
            ? "that fetch timed out"
            : replaced
              ? `that fetch failed: ${replaced}`
              : `that fetch failed with exit status ${prFetchCode}`,
        };
      }
    }
    let no = It[0];
    if (no && gt && no.refspec !== gt) {
      qt = 1;
      no = undefined;
    } else if (no && It[1] && It[1].sha !== no.sha) {
      qt = 1;
      Zt = "git_worktree_create_pr_ref_ambiguous";
      rn = `origin has both ${no.refspec} and ${It[1].refspec}, at different commits. GitHub and GitHub-compatible servers create only refs/pull/${s.prNumber}/head and GitLab only refs/merge-requests/${s.prNumber}/head, so the other one was pushed to origin, or copied there from another server, and could be mistaken for #${s.prNumber}. Delete from origin the ref your server does not create, then retry.`;
      no = undefined;
    } else if (no && Yt) {
      qt = 1;
      Zt = "git_worktree_create_pr_other_ref_unchecked";
      rn = `fetched ${no.refspec}, but could not check whether origin also has ${Yt.refspec} (${Yt.why}). Because origin was not recognised as github.com or gitlab.com, both refs are checked before either is used, so that a pushed look-alike cannot be mistaken for #${s.prNumber}. Retry.`;
      no = undefined;
    }
    if (!no && qt !== 0) {
      logFeatureBad("git_worktree_create", Zt);
      let hn =
        truncateMiddle_2(hideUnsafeText(stripProgressLines(rn.trim()), "git's error")) ||
        'it may not exist, the fetch may have timed out, or the repository may not have a remote named "origin"';
      throw Error(
        Zt === "git_worktree_create_pr_fetch_failed"
          ? `Failed to fetch PR/MR #${s.prNumber}: ${hn}`
          : `Cannot use PR/MR #${s.prNumber}: ${hn}`,
      );
    }
    baseSha = no?.sha ?? null;
    G = baseSha === null ? "FETCH_HEAD" : `${baseSha}^{commit}`;
  } else {
    let defaultBranch = await getDefaultBranch();
    let gitDir = resolveGitDirs(e)?.gitDir ?? null;
    let pt = defaultBranch && !defaultBranch.startsWith("-") ? defaultBranch : "HEAD";
    let originRef = `origin/${pt}`;
    let yt = gitDir ? await resolveRef(gitDir, `refs/remotes/origin/${pt}`) : null;
    if (yt && gitDir) {
      G = originRef;
      baseSha = yt;
      let gt = await stat(join(gitDir, "FETCH_HEAD")).then(
        (At) => At.mtimeMs,
        () => 0,
      );
      if (Date.now() - gt > WORKTREE_STALE_AGE_MS) {
        await execFileNoThrowWithCwd(gitExe(), ["fetch", SAFE_UPLOAD_PACK_ARG_2, "origin", pt], {
          cwd: e,
          stdin: "ignore",
          ...(await getGitSshEnv(e)),
          timeout: WORKTREE_GIT_TIMEOUT_MS,
        });
        let ref = await resolveRef(gitDir, `refs/remotes/origin/${pt}`);
        if (ref) baseSha = ref;
      }
    } else {
      let { code: fetchCode } = await execFileNoThrowWithCwd(
        gitExe(),
        ["fetch", SAFE_UPLOAD_PACK_ARG_2, "origin", pt],
        {
          cwd: e,
          stdin: "ignore",
          ...(await getGitSshEnv(e)),
        },
      );
      if (fetchCode === 0) {
        G = originRef;
        baseSha = await resolveWorktreeBaseSha({
          base: `refs/remotes/${originRef}`,
          exactRef: true,
          kind: "origin_default",
          failure: `Failed to resolve base branch "${originRef}"`,
          cwd: e,
          root: e,
        });
      } else {
        logForDebugging(`[worktree] fetch of origin/${pt} failed \u2014 basing worktree on local HEAD`, {
          level: "warn",
        });
        baseSha = await resolveHeadAsBase({
          repoRoot: e,
          fromCwd: s?.fromCwd,
          kind: "head_fallback",
        });
        G = `${baseSha}^{commit}`;
      }
    }
  }
  if (!baseSha)
    baseSha = await resolveWorktreeBaseSha({
      base: G,
      kind: "fetch_head",
      failure: `Failed to resolve base branch "${G}"`,
      cwd: e,
      root: e,
    });
  let sparsePaths = getInitialSettings_2().worktree?.sparsePaths;
  let addArgs = ["worktree", "add"];
  if (sparsePaths?.length) addArgs.push("--no-checkout");
  let ke = `${baseSha}^{commit}`;
  addArgs.push("--no-track", s?.isBranchNew ? "-b" : "-B", worktreeBranch, worktreePath, ke);
  let we = await checkoutWorkersArgs(e);
  let Ee = await inspectRepoPartialClone(e, null);
  let failure = (
    await explainPartialCloneFailure(e, baseSha, Ee, async () =>
      sparsePaths?.length
        ? minimalSparseDirs(sparsePaths)
        : (await gitSupportsPartialCloneFetch(e))
          ? readSparseCheckoutConfig(e)
          : null,
    )
  ).failure;
  let Ie = (coErr) =>
    failure !== null
      ? `
${failure}`
      : Ee.inForce
        ? explainOnDemandFetchOff(coErr, Ee, baseSha)
        : "";
  await assertWorktreeDirNotSymlink(worktreesDir, worktreePath);
  let filterNeutralizingArgsOrRefusal = await getFilterNeutralizingArgsOrRefusal(e);
  if ("refusal" in filterNeutralizingArgsOrRefusal)
    throw new WorktreeIsolationError(filterNeutralizingArgsOrRefusal.refusal);
  let { code: createCode, stderr: createStderr } = await execFileNoThrowWithCwd(
    gitExe(),
    [...filterNeutralizingArgsOrRefusal.args, ...we, ...addArgs],
    {
      cwd: e,
      env: withSafeGitConfig(e, {
        LC_ALL: "C",
        ...partialCloneFetchEnv(Ee),
      }),
    },
  );
  if (createCode !== 0) {
    logFeatureBad("git_worktree_create", "git_worktree_create_add_failed");
    let Je = stripProgressLines(createStderr);
    if (parseWorktreeAddError(createStderr, worktreeBranch))
      throw new WorktreeIsolationError(
        `branch "${worktreeBranch}" for worktree "${r}" is already checked out elsewhere in this repository. Pass a different --worktree name.`,
      );
    if (s?.isBranchNew && /^fatal: a branch named .* already exists/im.test(Je))
      throw new WorktreeIsolationError(
        `branch "${worktreeBranch}" already exists, so the numbered name "${r}" could not be used. The branch was left as it is. Pass a different worktree name.`,
      );
    if (/^fatal: .* already exists/m.test(Je))
      throw new WorktreeIsolationError(
        `worktree "${r}" already exists at ${hideUnsafePath(worktreePath)} but cannot be reused (${truncateMiddle_2(hideUnsafeText(Je, "git's error"))}). Remove that directory (with \`git worktree remove\` if it's a registered worktree, or by deleting it if it's a stray directory) or pass a different --worktree name.`,
      );
    let nt = `Failed to create worktree: ${truncateMiddle_2(hideUnsafeText(Je, "git's error"))}${Ie(Je)}`;
    if (await readWorktreeHeadSha(worktreePath)) {
      if (
        !(await removeWorktreeRegistration(e, worktreeBranch, worktreePath, {
          onlyIfRegisteredAt: await candidateWorktreePaths(worktreesDir, worktreePath),
          deregisterOnKeep: "ifOwned",
        }))
      )
        throw new WorktreeIsolationError(`${nt} ${worktreeRegistrationKeptMessage(worktreeBranch)}`);
    }
    throw new WorktreeIsolationError(nt);
  }
  let lt = async (Je, nt) => {
    if (nt === "redirected") {
      logForDebugging(
        `Removed nothing for ${worktreeBranch}: containment failed, so the tree cannot be identified safely`,
        {
          level: "warn",
        },
      );
      throw new WorktreeIsolationError(
        `${Je} Nothing was removed: the checkout was written wherever the link at that path pointed at the time, so before removing anything, check the sensitive locations it could have reached, such as .git/hooks (a hook checked out there runs on the next git command) and ~/.claude/skills. ` +
          worktreeRegistrationKeptMessage(worktreeBranch),
      );
    }
    let pt = await removeWorktreeRegistration(e, worktreeBranch, worktreePath, {
      onlyIfRegisteredAt: await candidateWorktreePaths(worktreesDir, worktreePath),
      deregisterOnKeep: "ifOwned",
    });
    throw new WorktreeIsolationError(pt ? Je : `${Je} ${worktreeRegistrationKeptMessage(worktreeBranch)}`);
  };
  try {
    let [Je, nt] = await Promise.all([realpath(worktreePath), realpath(worktreesDir.anchor)]);
    let pt = join(worktreesDirSpec(worktreesDir, nt).dir, basename(worktreePath));
    if (
      !(await isSamePathIdentity(Je, pt, {
        above: nt,
      }))
    ) {
      logFeatureBad("git_worktree_create", "git_worktree_create_containment_failed");
      await lt(
        `Cannot create worktree: ${hideUnsafePath(worktreePath)} resolved to ${describeRepoRelativeLocation(Je, nt)}, which is not the expected worktree location ${hideUnsafePath(pt)}.`,
        "redirected",
      );
    }
  } catch (error) {
    if (error instanceof WorktreeIsolationError) throw error;
    logFeatureBad("git_worktree_create", "git_worktree_create_realpath_failed");
    await lt(
      `Cannot create worktree: failed to verify containment of ${hideUnsafePath(worktreePath)}: ${hasUnsafePathGlyphsOrSurrogate(errorMessage(error)) ? "it could not be resolved" : errorMessage(error)}. The path no longer resolves, so the checkout may have been written ` +
        "through a since-removed link to a location outside the repository \u2014 " +
        "check ~/.claude/skills and other sensitive locations for unexpected content.",
      "unresolved",
    );
  }
  if (sparsePaths?.length) {
    let tearDown = async (msg) => {
      await removeWorktreeRegistration(e, worktreeBranch, worktreePath, {
        onlyIfRegisteredAt: await candidateWorktreePaths(worktreesDir, worktreePath),
      });
      await restoreWorktreeConfigExtension(e);
      throw new WorktreeIsolationError(msg);
    };
    if (
      (
        await execFileNoThrowWithCwd(
          gitExe(),
          [...GIT_SAFE_GLOBAL_ARGS, "config", "--local", "--get", "extensions.worktreeConfig"],
          {
            cwd: e,
            env: buildGitEnvForRepo(e),
          },
        )
      ).exitCode === 1
    )
      await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "config", "--local", CLAUDE_WORKTREE_CONFIG_KEY, "true"],
        {
          cwd: e,
          env: buildGitEnvForRepo(e),
        },
      );
    let filterNeutralizingArgsOrRefusal = await getFilterNeutralizingArgsOrRefusal(worktreePath);
    let Et =
      "refusal" in filterNeutralizingArgsOrRefusal
        ? await tearDown(filterNeutralizingArgsOrRefusal.refusal)
        : filterNeutralizingArgsOrRefusal.args;
    let { code: sparseCode, stderr: sparseErr } = await execFileNoThrowWithCwd(
      gitExe(),
      [...Et, ...GIT_SAFE_GLOBAL_ARGS, "sparse-checkout", "set", "--cone", "--", ...sparsePaths],
      {
        cwd: worktreePath,
        env: withSafeGitConfig(worktreePath, partialCloneFetchEnv(Ee)),
      },
    );
    if (sparseCode !== 0) {
      logFeatureBad("git_worktree_create", "git_worktree_create_sparse_set_failed");
      await tearDown(
        `Failed to configure sparse-checkout: ${truncateMiddle_2(hideUnsafeText(stripProgressLines(sparseErr), "git's error"))}`,
      );
    }
    let At = await checkoutWorkersArgs(worktreePath);
    let filterNeutralizingArgsOrRefusal_2 = await getFilterNeutralizingArgsOrRefusal(worktreePath);
    let Yt =
      "refusal" in filterNeutralizingArgsOrRefusal_2
        ? await tearDown(filterNeutralizingArgsOrRefusal_2.refusal)
        : filterNeutralizingArgsOrRefusal_2.args;
    let { code: coCode, stderr: coErr } = await execFileNoThrowWithCwd(
      gitExe(),
      [...Yt, ...At, "checkout", "--no-recurse-submodules", "HEAD"],
      {
        cwd: worktreePath,
        env: withSafeGitConfig(worktreePath, {
          ...(Ee.inForce && {
            LC_ALL: "C",
          }),
          ...partialCloneFetchEnv(Ee),
        }),
      },
    );
    let rn = Ee.inForce && explainOnDemandFetchOff(coErr, Ee, baseSha) !== "";
    if (coCode !== 0 || rn) {
      logFeatureBad("git_worktree_create", "git_worktree_create_sparse_checkout_failed");
      await tearDown(
        coCode !== 0
          ? `Failed to checkout sparse worktree: ${truncateMiddle_2(hideUnsafeText(stripProgressLines(coErr), "git's error"))}${Ie(coErr)}`
          : `Failed to checkout sparse worktree: git left out files whose contents it could not read, so the new worktree was removed.${Ie(coErr)}`,
      );
    }
  }
  await writeWorktreeBaseline(worktreePath, baseSha);
  return {
    worktreePath,
    worktreeBranch,
    headCommit: baseSha,
    baseBranch: G,
    existed: false,
  };
}
//@ chunk-e6aww6q8.js:3625933-3627962 fingerprint = copyWorktreeIncludeFiles (0.781)
/**
 * 按仓库根 .worktreeinclude（gitignore 语法）把被忽略但需要的文件（如 .env）复制到新 worktree。
 */
async function copyWorktreeIncludeFiles(repoRoot, worktreePath) {
  let includeContent;
  try {
    includeContent = await readFile(join(repoRoot, ".worktreeinclude"), "utf-8");
  } catch {
    return [];
  }
  let patterns = includeContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  if (patterns.length === 0) return [];
  let gitignored = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "ls-files", "--others", "--ignored", "--exclude-standard", "--directory"],
    {
      cwd: repoRoot,
      env: buildGitEnvForRepo(repoRoot),
    },
  );
  let entries =
    gitignored.code === 0
      ? gitignored.stdout
          .split(
            `
`,
          )
          .filter((line) => line !== "")
      : [];
  if (entries.length === 0) return [];
  let matcher = micromatch
    .default()
    .add(filterUsableIgnorePatterns(splitNonEmptyLines(includeContent), "worktreeinclude"));
  let collapsedDirs = entries.filter((e) => e.endsWith("/"));
  let files = entries.filter((e) => !e.endsWith("/") && matcher.ignores(e));
  let dirsToExpand = collapsedDirs.filter((dir) => {
    if (
      patterns.some((pattern) => {
        let normalized = pattern.startsWith("/") ? pattern.slice(1) : pattern;
        if (normalized.startsWith(dir)) return true;
        let globIdx = normalized.search(/[*?[]/);
        if (globIdx > 0) {
          let literalPrefix = normalized.slice(0, globIdx);
          if (dir.startsWith(literalPrefix)) return true;
        }
        let Ae = normalized;
        while (Ae.startsWith("**/")) Ae = Ae.slice(3);
        if (Ae !== normalized) {
          let Ie = firstLineOf(Ae, "/");
          let Me = Ie.search(/[*?[]/);
          let lower = (Me === -1 ? Ie : Ie.slice(0, Me)).replace(/\\/g, "").toLowerCase();
          if (lower.length > 0) {
            let mapped = dir
              .slice(0, -1)
              .split("/")
              .map((Je) => Je.toLowerCase());
            if (Me === -1 ? mapped.includes(lower) : mapped.some((Je) => Je.startsWith(lower))) return true;
          }
        }
        return false;
      })
    )
      return true;
    if (matcher.ignores(dir.slice(0, -1)) || matcher.ignores(dir)) return true;
    return false;
  });
  if (dirsToExpand.length > 0) {
    let expanded = await execFileNoThrowWithCwd(
      gitExe(),
      [
        ...GIT_SAFE_GLOBAL_ARGS,
        "ls-files",
        "--others",
        "--ignored",
        "--exclude-standard",
        "--",
        ...dirsToExpand,
      ],
      {
        cwd: repoRoot,
        env: buildGitEnvForRepo(repoRoot),
      },
    );
    if (expanded.code === 0) {
      for (let line of expanded.stdout
        .split(
          `
`,
        )
        .filter((line) => line !== ""))
        if (matcher.ignores(line)) files.push(line);
    }
  }
  let copied = [];
  let Z;
  try {
    Z = await realpath(worktreePath);
  } catch (error) {
    logForDebugging(
      `Skipping .worktreeinclude copy: realpath(${worktreePath}) failed: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return copied;
  }
  for (let relativePath of files) {
    let srcPath = join(repoRoot, relativePath);
    let destPath = join(worktreePath, relativePath);
    try {
      if ((await lstat(srcPath)).isSymbolicLink()) {
        logForDebugging(`Skipping symlink in .worktreeinclude: ${relativePath}`, {
          level: "warn",
        });
        continue;
      }
      if (await hasUnsafeAncestor(destPath, Z)) {
        logForDebugging(
          `Skipping .worktreeinclude entry: destination escapes worktree via committed symlink: ${relativePath}`,
          {
            level: "warn",
          },
        );
        continue;
      }
      await mkdir(dirname(destPath), {
        recursive: true,
      });
      await copyIncludedFileSafely(srcPath, destPath);
      copied.push(relativePath);
    } catch (e) {
      logForDebugging(`Failed to copy ${relativePath} to worktree: ${errorMessage(e)}`, {
        level: "warn",
      });
    }
  }
  if (copied.length > 0)
    logForDebugging(`Copied ${copied.length} files from .worktreeinclude: ${copied.join(", ")}`);
  return copied;
}
//@ chunk-e6aww6q8.js:3627962-3628683 layout
async function copyLocalSettingsIntoWorktree(repoRoot, worktreePath, localSettingsRelativePath) {
  if (resolveLocalSettingsStoreRoot(worktreePath, storageRootFor) !== resolve_2(worktreePath)) {
    logForDebugging(
      `Skipping settings.local.json copy into ${worktreePath}: it resolves localSettings to the canonical repo root, so a copy would become a stale, revocation-resurrecting legacy overlay`,
    );
    return;
  }
  let relativeSettingsFilePathForSource = getRelativeSettingsFilePathForSource("localSettings");
  let h = join(repoRoot, relativeSettingsFilePathForSource);
  try {
    if ((await lstat(h)).isSymbolicLink()) {
      logForDebugging(`Skipping symlinked settings.local.json: ${h}`, {
        level: "warn",
      });
      return;
    }
    let S = join(worktreePath, relativeSettingsFilePathForSource);
    if (localSettingsRelativePath == null || (await hasUnsafeAncestor(S, localSettingsRelativePath))) {
      logForDebugging(
        "Skipping settings.local.json copy: destination escapes worktree via committed symlink",
        {
          level: "warn",
        },
      );
      return;
    }
    await mkdir(dirname(S), {
      recursive: true,
    });
    await copyIncludedFileSafely(h, S);
    logForDebugging(`Copied settings.local.json to worktree: ${S}`);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      logForDebugging(`Failed to copy settings.local.json: ${errorMessage(error)}`, {
        level: "warn",
      });
  }
}
//@ chunk-e6aww6q8.js:3628683-3629223 fingerprint = performPostCreationSetup (0.787)
/**
 * worktree 创建后的设置：复制 settings.local.json、.worktreeinclude 文件、配置的符号链接目录等。
 */
async function performPostCreationSetup(repoRoot, worktreePath) {
  let localSettingsRelativePath = await realpath(worktreePath).catch(() => null);
  await copyLocalSettingsIntoWorktree(repoRoot, worktreePath, localSettingsRelativePath);
  let code = join(repoRoot, ".husky");
  let gitDir = await resolveGitDir(repoRoot);
  let configDir = gitDir ? ((await getCommonDir(gitDir)) ?? gitDir) : null;
  let S = configDir ? await readGitConfigValueAsync(configDir, "core", null, "hooksPath") : null;
  let w = null;
  if (S) {
    w = isAbsolute(S) ? S : resolve_2(repoRoot, S);
    if (S !== w) {
      let { code: configCode, stderr: configError } = await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "config", "core.hooksPath", w],
        {
          cwd: worktreePath,
          env: buildGitEnvForRepo(worktreePath),
        },
      );
      if (configCode === 0) logForDebugging(`Configured worktree to use hooks from main repository: ${w}`);
      else
        logForDebugging(`Failed to configure hooks path: ${configError}`, {
          level: "error",
        });
    }
  }
  let dirsToSymlink = getInitialSettings_2().worktree?.symlinkDirectories ?? [];
  if (dirsToSymlink.length > 0) await symlinkDirectories(repoRoot, worktreePath, dirsToSymlink);
  await copyWorktreeIncludeFiles(repoRoot, worktreePath);
}
//@ chunk-e6aww6q8.js:3629223-3629610 facade-exports
function parsePRReference(e) {
  let match = e.match(/^https?:\/\/[^/]+\/[^/]+\/[^/]+\/pull\/(\d+)\/?(?:[?#].*)?$/i);
  if (match?.[1])
    return {
      number: parseInt(match[1], 10),
      forge: "github",
    };
  let match_2 = e.match(/^https?:\/\/[^/]+\/[^?#]+\/-\/merge_requests\/(\d+)\/?(?:[?#].*)?$/i);
  if (match_2?.[1])
    return {
      number: parseInt(match_2[1], 10),
      forge: "gitlab",
    };
  let match_3 = e.match(/^#(\d+)$/);
  if (match_3?.[1])
    return {
      number: parseInt(match_3[1], 10),
      forge: null,
    };
  return null;
}
//@ chunk-e6aww6q8.js:3629610-3629656 layout
function getIsolatedGitExecOptions() {
  return {
    env: getPreSettingsEnvHonoringLiveDeletions(),
    extendEnv: false,
  };
}
//@ chunk-e6aww6q8.js:3629656-3629732 facade-exports = TMUX_COMMAND (1)
/**
 * 检查 tmux 是否可用（tmux -V 退出码 0）。
 */
async function isTmuxAvailable() {
  let { code } = await execFileNoThrowWithCwd("tmux", ["-V"], getIsolatedGitExecOptions());
  return code === 0;
}
//@ chunk-e6aww6q8.js:3629732-3630102 facade-exports = getTmuxInstallInstructions (1)
function getTmuxInstallInstructions() {
  switch (getPlatform()) {
    case "macos":
      return "Install tmux with: brew install tmux";
    case "linux":
    case "wsl":
      return "Install tmux with: sudo apt install tmux (Debian/Ubuntu) or sudo dnf install tmux (Fedora/RHEL)";
    case "windows":
      return "tmux is not natively available on Windows. Consider using WSL or Cygwin.";
    default:
      return "Install tmux using your system package manager.";
  }
}
//@ chunk-e6aww6q8.js:3630102-3630288 facade-exports = createTmuxSessionForWorktree (0.91)
async function createTmuxSessionForWorktree(sessionName, worktreePath) {
  let { code, stderr } = await execFileNoThrowWithCwd(
    "tmux",
    ["new-session", "-d", "-s", sessionName, "-c", worktreePath],
    {
      ...getIsolatedGitExecOptions(),
      useToolMemoryCgroup: false,
    },
  );
  if (code !== 0)
    return {
      created: false,
      error: stderr,
    };
  return {
    created: true,
  };
}
//@ chunk-e6aww6q8.js:3630288-3630382 facade-exports = killTmuxSession (1)
async function killTmuxSession(sessionName) {
  let { code } = await execFileNoThrowWithCwd(
    "tmux",
    ["kill-session", "-t", sessionName],
    getIsolatedGitExecOptions(),
  );
  return code === 0;
}
//@ chunk-e6aww6q8.js:3630382-3630468 layout
var CLAUDE_WORKTREE_LOCK_REASON_PATTERN =
  /^claude (?:agent|session) .{1,255} \(pid (\d{1,10})(?: start (.{1,255}))?\)$/;
//@ chunk-e6aww6q8.js:3630468-3630530 facade-exports
function claudeWorktreeLockPid(input) {
  let match = input?.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN);
  return match ? Number(match[1]) : null;
}
//@ chunk-e6aww6q8.js:3630530-3630650 layout
async function isLockHeldByLiveOtherProcess(e) {
  let match = e?.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN);
  if (!match) return false;
  let r = Number(match[1]);
  if (r === process.pid || !isProcessRunning_2(r)) return false;
  return true;
}
//@ chunk-e6aww6q8.js:3630650-3630773 layout
async function isLockHeldByLiveSameStartProcess(e) {
  let match = e?.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN);
  if (!match) return false;
  let r = Number(match[1]);
  return r !== process.pid && isProcessRunning_2(r) && (await isSameProcessAsync(r, match[2]));
}
//@ chunk-e6aww6q8.js:3630773-3630862 facade-exports
async function mayReleaseWorktreeLock(e) {
  if (e === undefined) return true;
  if (!CLAUDE_WORKTREE_LOCK_REASON_PATTERN.test(e)) return false;
  return !(await isLockHeldByLiveOtherProcess(e));
}
//@ chunk-e6aww6q8.js:3630862-3631053 facade-exports
async function releaseOwnWorktreeLock(worktreePath, n) {
  try {
    if (await mayReleaseWorktreeLock(await readWorktreeLockReason(worktreePath, n)))
      await unlockAgentWorktree(worktreePath, n);
  } catch (error) {
    logForDebugging(
      `[worktree] left the lock on ${worktreePath} \u2014 cannot read the worktree registry to verify ownership (${errorMessage(error)})`,
    );
  }
}
//@ chunk-e6aww6q8.js:3631053-3631345 facade-exports
async function readWorktreeLockReason(e, n) {
  let r = resolve_2(await realpath(e).catch(() => e));
  let s = comparablePath(r, "everyPlatform");
  let h;
  for (let y of await listRegisteredWorktrees(n)) {
    let S = resolve_2(await realpath(y.worktreePath).catch(() => y.worktreePath));
    if (S === r) return y.lockReason;
    if (h === undefined && comparablePath(S, "everyPlatform") === s)
      h = {
        lockReason: y.lockReason,
      };
  }
  return h?.lockReason;
}
//@ chunk-e6aww6q8.js:3631345-3633066 facade-exports
/**
 * 用 git worktree lock --reason 'claude <agent|session> <id> (pid N start T)' 给 worktree 加锁，标明持有进程，供陈旧锁清理判断。
 */
async function lockClaudeWorktree(e, n, r, s) {
  try {
    let procStart = procIdentityFields(await ownProcStartAsync()).procStart;
    let y = procStart
      ? `claude ${s} ${r} (pid ${process.pid} start ${procStart})`
      : `claude ${s} ${r} (pid ${process.pid})`;
    let S = async () => {
      if (
        !readFlagWithOverride("tengu_mighty_sprout", {
          safe: true,
        })
      )
        return execFileNoThrowWithCwd(
          gitExe(),
          [...GIT_SAFE_GLOBAL_ARGS, "worktree", "lock", "--reason", y, e],
          {
            cwd: n,
            env: buildGitEnvForRepo(n),
          },
        );
      try {
        let gitDirs = resolveGitDirs(n);
        let gitDirs_2 = resolveGitDirs(e);
        if (
          gitDirs === null ||
          gitDirs_2 === null ||
          gitDirs_2.workTree === null ||
          gitDirs_2.gitDir === gitDirs_2.commonDir ||
          gitDirs_2.commonDir !== gitDirs.commonDir
        ) {
          logFeatureSad("git_worktree_create", "git_worktree_lock_unvetted");
          return {
            code: 1,
            stderr: `no lock marker written: could not confirm from the .git files of this worktree and ${n} that this is a linked worktree of that repository`,
          };
        }
        await writeNewFile(
          join(gitDirs.commonDir, "worktrees", basename(gitDirs_2.gitDir), "locked"),
          `${y}
`,
        );
        return {
          code: 0,
          stderr: "",
        };
      } catch (error) {
        switch (getErrnoCode(error)) {
          case "EEXIST":
            break;
          case "EACCES":
          case "EPERM":
          case "EROFS":
            logFeatureSad("git_worktree_create", "git_worktree_lock_entry_unwritable");
            break;
          default:
            logFeatureSad("git_worktree_create", "git_worktree_lock_create_failed");
        }
        return {
          code: 1,
          stderr: errorMessage(error),
        };
      }
    };
    let w = await S();
    if (w.code === 0) return true;
    let L;
    try {
      L = await readWorktreeLockReason(e, n);
    } catch (error) {
      logForDebugging(
        `[worktree] failed to lock ${s} worktree ${e} and could not read the registry (${errorMessage(error)}); treating this session as a guest`,
      );
      return false;
    }
    if (L === undefined) {
      logForDebugging(`[worktree] failed to lock ${s} worktree ${e}: ${w.stderr.trim()}`);
      return true;
    }
    if (!CLAUDE_WORKTREE_LOCK_REASON_PATTERN.test(L) || (await isLockHeldByLiveOtherProcess(L))) {
      logForDebugging(
        `[worktree] ${e} is already locked (${L || "no reason"}); leaving the existing lock in place \u2014 this session is a guest, not the owner`,
      );
      return false;
    }
    if (Number(L.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN)?.[1]) === process.pid) return true;
    await unlockAgentWorktree(e, n);
    let G = await S();
    if (G.code !== 0)
      logForDebugging(
        `[worktree] failed to re-lock ${s} worktree ${e} after clearing a stale lock: ${G.stderr.trim()}`,
      );
    return true;
  } catch (error) {
    logForDebugging(`[worktree] failed to lock ${s} worktree ${e}: ${errorMessage(error)}`);
    return true;
  }
}
//@ chunk-e6aww6q8.js:3633066-3636445 facade-exports = createWorktreeForSession (0.402)
/**
 * --worktree 启动：要求已信任工作区，校验 slug；配置了 WorktreeCreate hook 时用 hook 返回的目录（拒绝点段路径与符号链接祖先），否则 getOrCreateWorktree，随后复制 .worktreeinclude 文件、settings.local.json 并可创建 tmux 会话。
 */
async function createWorktreeForSession(sessionId, slug, tmuxSessionName, options) {
  refuseUnavailableWorktree("a worktree");
  if (!checkHasTrustDialogAccepted())
    throw Error(
      "Workspace trust not yet accepted. Run `claude` once in this directory and accept the trust dialog, then retry with --worktree.",
    );
  validateWorktreeSlug(slug);
  let h = options.fromCwd ?? getCwd();
  let originalCwd = getOriginalCwd();
  let S;
  let w = dispatchesWorktreeCreate()
    ? await executeWorktreeCreateHook(
        {
          id: getSessionId(),
          project: {
            originalCwd: getOriginalCwd(),
            projectRoot: getProjectRoot(),
          },
        },
        slug,
        {
          storageV5: options.storageV5,
          credentials: options.credentials,
        },
      ).catch((error) => {
        if (!findGitRoot(h)) {
          markIsolationUnavailableForCwd(h);
          logFeatureBad("git_worktree_create", "hook_failed_not_git_repo");
        }
        throw error;
      })
    : undefined;
  if (w) {
    {
      if (hasDotSegment(w.worktreePath)) {
        logFeatureBad("git_worktree_create", "git_worktree_create_hook_ancestry_rejected");
        throw new WorktreeIsolationError(
          `Cannot use the WorktreeCreate hook's worktree: the hook emitted a path with dot segments (${w.worktreePath}). The ` +
            "symlink screen cannot verify a dotted spelling \u2014 have the " +
            "hook emit a normalized (dot-free) absolute path and retry.",
        );
      }
      for (let G of new Set([findCanonicalGitRoot(h), findGitRoot(h)].filter((q) => Boolean(q)))) {
        let symlinkInWorktreeAncestry = await findSymlinkInWorktreeAncestry(w.worktreePath, G);
        if (symlinkInWorktreeAncestry) {
          logFeatureBad("git_worktree_create", "git_worktree_create_hook_ancestry_rejected");
          throw new WorktreeIsolationError(
            `Cannot use the WorktreeCreate hook's worktree: ${symlinkInWorktreeAncestry.component} ` +
              (symlinkInWorktreeAncestry.kind === "symlink" ? "is a symlink. " : "could not be verified. ") +
              "A repository-committed symlink below the checkout root could redirect the worktree outside the repository. Remove the symlink (or emit a path outside the repository) and retry.",
          );
        }
      }
    }
    logForDebugging(`Created hook-based worktree at: ${w.worktreePath}`);
    S = {
      originalCwd: h,
      preEnterOriginalCwd: originalCwd,
      worktreePath: w.worktreePath,
      worktreeName: slug,
      sessionId,
      tmuxSessionName,
      hookBased: true,
    };
  } else {
    let repoRoot = options.repoRoot ?? findCanonicalGitRoot(h);
    if (!repoRoot) {
      logFeatureBad("git_worktree_create", "git_worktree_create_not_git_repo");
      throw new WorktreeIsolationError(
        "Cannot create a worktree: not in a git repository and no WorktreeCreate hooks are configured. Configure WorktreeCreate/WorktreeRemove hooks in settings.json to use worktree isolation with other VCS systems.",
      );
    }
    let originalBranch = await getBranch();
    let Z =
      options.slugPick === undefined
        ? {
            slug,
            number: undefined,
          }
        : await allocateWorktreeSlug(repoRoot, slug, options.slugPick);
    validateWorktreeSlug(Z.slug);
    if (Z.number === 0) {
      logFeatureBad("git_worktree_create", "git_worktree_create_no_numbered_name");
      throw new WorktreeIsolationError(
        `no name from "${slug}" to "${suffixWorktreeSlug(slug, MAX_WORKTREE_SLUG_RETRIES)}" could be used for a new worktree: each is a name this session has already used, is held by a folder or a branch, or is one that Claude Code keeps for itself. Nothing was changed. Pass a different worktree name.`,
      );
    }
    let createStart = Date.now();
    let ke = await getOrCreateWorktree(repoRoot, worktreesDirSpecs(repoRoot), Z.slug, {
      ...options,
      isBranchNew: (Z.number ?? 0) >= 2,
    });
    let { worktreePath, worktreeBranch, headCommit, existed } = ke;
    let refreshed = ke.existed ? ke.refreshed : undefined;
    let creationDurationMs;
    if (existed)
      logForDebugging(
        refreshed
          ? `Reset existing worktree to the current base at: ${worktreePath}`
          : `Resuming existing worktree at: ${worktreePath}`,
      );
    else {
      logForDebugging(`Created worktree at: ${worktreePath} on branch: ${worktreeBranch}`);
      await performPostCreationSetup(repoRoot, worktreePath);
      creationDurationMs = Date.now() - createStart;
    }
    let ze = await lockClaudeWorktree(worktreePath, repoRoot, Z.slug, "session");
    let madeElsewhere = ke.existed && ke.madeElsewhere;
    S = {
      originalCwd: h,
      preEnterOriginalCwd: originalCwd,
      worktreePath,
      worktreeName: Z.slug,
      slugNumber: Z.number,
      worktreeBranch,
      originalBranch,
      originalHeadCommit: headCommit,
      sessionId,
      tmuxSessionName,
      creationDurationMs,
      enteredExisting: ze && !madeElsewhere ? undefined : true,
      madeElsewhere: madeElsewhere ? "resumedByName" : undefined,
      resumedExisting: existed || undefined,
      resetToFreshBase: refreshed || undefined,
      usedSparsePaths: (getInitialSettings_2().worktree?.sparsePaths?.length ?? 0) > 0,
    };
  }
  let L = await checkWorktreeIsolation(S.worktreePath, [], gitRootsForPath(h, options.repoRoot));
  if (!L.ok) {
    logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected");
    throw new WorktreeIsolationError(L.message);
  }
  if (S.hookBased) {
    let hookWorktreeHead = await getHookWorktreeHead(S.worktreePath, h);
    if (hookWorktreeHead !== undefined) S.originalChangeset = hookWorktreeHead;
  }
  persistWorktreeSession(S, options.storageV5);
  logFeatureOk("git_worktree_create");
  return S;
}
//@ chunk-e6aww6q8.js:3636445-3637534 facade-exports
/**
 * git worktree list --porcelain 并解析每个 worktree 的路径、分支与锁原因；可要求先确认 git 目录可信。
 */
async function listRegisteredWorktrees(e, { vetted: pinned } = {}) {
  let r = async (Se) => {
    let ke =
      pinned === undefined
        ? {
            env: buildGitEnvForRepo(e),
          }
        : await verifyPinnedGitDir(pinned, resolveGitDirsOrPlaceholder(e));
    if ("refused" in ke)
      throw Error(
        "git was not run: the repository's git directory could not be confirmed as the one whose worktree registrations were checked",
      );
    return execFileNoThrow(
      gitExe(),
      [
        ...GIT_SAFE_GLOBAL_ARGS,
        "-C",
        e,
        ...(pinned === undefined ? [] : ["--git-dir", pinned.gitDir]),
        "worktree",
        "list",
        "--porcelain",
        ...(Se === null ? [] : [Se]),
      ],
      {
        timeout: 1e4,
        env: ke.env,
      },
    );
  };
  let s = await gitSupportsPartialCloneFetch(e);
  let h = await r(s ? "-z" : null);
  let y = s
    ? "\x00"
    : `
`;
  let { code, stdout, stderr, error } = h;
  if (code !== 0) {
    let trimmed = stderr.trim();
    let message = `\`git -C ${e} worktree list\` failed: ${trimmed || (error !== undefined ? errorMessage(error) : "") || `exit ${code}`}`;
    if (trimmed === "" && error !== undefined && /premature close\s*$/i.test(error))
      throw new WorktreeGitTransientError(message);
    throw Error(message);
  }
  let q = [];
  let Z = null;
  for (let Se of stdout.split(y))
    if (Se.startsWith("worktree ")) {
      if (Z) q.push(Z);
      Z = {
        worktreePath: Se.slice(9),
      };
    } else if (Se.startsWith("branch ") && Z) Z.worktreeBranch = Se.slice(7).replace(/^refs\/heads\//, "");
    else if ((Se === "locked" || Se.startsWith("locked ")) && Z) Z.lockReason = Se.slice(6).trim();
    else if ((Se === "prunable" || Se.startsWith("prunable ")) && Z) Z.prunable = true;
  if (Z) q.push(Z);
  return q;
}
//@ chunk-e6aww6q8.js:3637534-3637607 layout
function isNetworkOrOutsidePath(e, cwd) {
  let normalized = win32.normalize(e);
  return (
    isWindowsUncPath(normalized) || containsVulnerableUncPath(normalized, true) || isOnForeignMount(e, cwd)
  );
}
//@ chunk-e6aww6q8.js:3637607-3637675 layout
function isNetworkOrUnsafePath(worktreePath) {
  let normalized = win32.normalize(worktreePath);
  return (
    isWindowsUncPath(normalized) ||
    containsVulnerableUncPath(normalized, true) ||
    isNetworkMountPath(worktreePath)
  );
}
//@ chunk-e6aww6q8.js:3637675-3638308 facade-exports
async function listRepoWorktrees(e) {
  let canonicalGitRoot = findCanonicalGitRoot(e);
  if (canonicalGitRoot === null) return {};
  let r = await listRegisteredWorktrees(canonicalGitRoot).catch(() => null);
  if (r === null) return null;
  let s;
  try {
    s = identity(await realpath(canonicalGitRoot));
  } catch {
    return null;
  }
  let h = {};
  for (let y of r.slice(1)) {
    let S = basename(y.worktreePath);
    let worktreeBranch = y.worktreeBranch ?? "";
    if (
      y.prunable === true ||
      !S ||
      /\s/.test(S) ||
      CONTROL_CHAR_RE.test(y.worktreePath) ||
      CONTROL_OR_FORMAT_CHAR_RE.test(S) ||
      CONTROL_OR_FORMAT_CHAR_RE.test(worktreeBranch) ||
      isEphemeralWorktreeSlug(S) ||
      isNetworkOrUnsafePath(y.worktreePath) ||
      containsPathTraversal(y.worktreePath) ||
      y.worktreePath.split(/[/\\]/).some((G) => /^\.\.[ .]*$/.test(G)) ||
      h[S] !== undefined
    )
      continue;
    let L;
    try {
      L = identity(await realpath(y.worktreePath));
    } catch {
      continue;
    }
    if (
      isNetworkOrUnsafePath(L) ||
      !(await isPathUnderIdentity(s, L, {
        strictly: true,
      })) ||
      CONTROL_OR_FORMAT_CHAR_RE.test(L.slice(s.length))
    )
      continue;
    h[S] = {
      path: L,
      branch: worktreeBranch,
    };
  }
  return h;
}
//@ chunk-e6aww6q8.js:3638308-3638367 layout
function isWindowsUncPath(e) {
  return getPlatform() === "windows" && /^[\\/]{2}/.test(e);
}
//@ chunk-e6aww6q8.js:3638367-3641891 facade-exports
/**
 * 校验要进入的 worktree 路径：拒绝 UNC/网络自动挂载路径，要求位于本仓库 .claude/worktrees/ 下并属于同一 git 仓库。
 */
async function resolveExistingWorktreeTarget(e, { requireManagedLocation, requireCwdInsideRepo = false }) {
  let normalized = win32.normalize(e);
  if (isWindowsUncPath(normalized) || containsVulnerableUncPath(normalized, true))
    throw new WorktreeIsolationError(`Cannot enter worktree: ${e} is a UNC network path.`);
  let cwd = getCwd();
  if (isForeignMountPath(e, cwd) || isForeignMountPath(resolve_2(cwd, e), cwd))
    throw new WorktreeIsolationError(`Cannot enter worktree: ${e} is a network automount path.`);
  let canonicalGitRoot = findCanonicalGitRoot(cwd);
  let S = canonicalGitRoot === null ? getWorkingCopyRootFallback(cwd) : null;
  let w = canonicalGitRoot ?? S?.workingCopyRoot;
  if (!w)
    throw new WorktreeIsolationError(
      "Cannot enter an existing worktree: the current directory is not in a git repository.",
    );
  let L;
  let G;
  let q;
  try {
    L = await realpath(resolve_2(cwd, e));
    G = await realpath(w);
    q = await realpath(cwd);
  } catch (error) {
    throw new WorktreeIsolationError(`Cannot enter worktree: ${e}: ${errorMessage(error)}`);
  }
  let Z = uncHostOf(L);
  if (
    (isWindowsUncPath(L) || containsVulnerableUncPath(L, true)) &&
    (Z === null || /^[\\/]{2}[?.][\\/]/.test(L) || (Z !== uncHostOf(G) && Z !== uncHostOf(q)))
  )
    throw new WorktreeIsolationError(`Cannot enter worktree: ${e} resolves to a UNC network path (${L}).`);
  if (isForeignMountPath(L, G) && isForeignMountPath(L, q))
    throw new WorktreeIsolationError(
      `Cannot enter worktree: ${e} resolves to a network automount path (${L}).`,
    );
  if (L === G) {
    let Me = `Cannot enter worktree: ${e} is the main working tree, not a linked worktree.`;
    throw new WorktreeIsolationError(Me);
  }
  if (L === q)
    throw new WorktreeIsolationError(`Cannot enter worktree: ${e} is the current working directory.`);
  if (false) {
    if (S !== null) {
      if (!("wcRoot" in lt))
        switch (lt.refusal) {
          case "session-untrusted":
          case "not-a-working-copy-root":
          case "not-a-worktree":
          case "other-checkout":
          case "no-answer":
        }
    }
  }
  if (requireCwdInsideRepo) {
    let Me = await isPathUnderIdentity(G, q, {
      foldOn: "everyPlatform",
      strictly: true,
    });
    let We =
      !Me &&
      (await isSamePathIdentity(q, G, {
        foldOn: "everyPlatform",
      }));
    if (!Me)
      throw new WorktreeIsolationError(
        We
          ? `Cannot enter worktree: the current working directory ${cwd} is the repository root, not an isolated worktree \u2014 switching is only available to sessions whose working directory is inside a worktree of this repository.`
          : `Cannot enter worktree: the current working directory ${cwd} is not inside the repository at ${w}.`,
      );
  }
  if (requireManagedLocation) {
    let dir = candidateWorktreeDirs(G)[0].dir;
    let We;
    try {
      We = await realpath(dir);
    } catch {
      throw new WorktreeIsolationError(
        `Cannot enter worktree: ${dir} does not exist, so ${e} cannot be a worktree managed by Claude Code.`,
      );
    }
    if (!(await isSamePathIdentity(We, dir)))
      throw new WorktreeIsolationError(
        `Cannot enter worktree: ${dir} resolves to ${We}; the managed worktrees directory must not be a symlink.`,
      );
    if (
      !(await isPathUnderIdentity(dir, L, {
        strictly: true,
      }))
    )
      throw new WorktreeIsolationError(
        `Cannot enter worktree: ${e} is not under ${dir}. Switching from this session is limited to worktrees managed by Claude Code (created under .claude/worktrees/ of this repository).`,
      );
    let ze = join(G, ".git", "worktrees");
    let gitDir = await resolveGitDir_2(L);
    let Je = null;
    let nt = null;
    if (gitDir)
      try {
        Je = await realpath(gitDir);
        if (pointerFileIsSuspect(join(Je, "gitdir"), Je)) throw Error("gitdir back-link is a symlink");
        let trimmed = (await readFile(join(Je, "gitdir"), "utf-8")).trim();
        if (!isOnForeignMount(trimmed, L) && !rawPointerPathIsUnsafe(trimmed, Je, L))
          nt = await realpath(resolve_2(Je, trimmed));
      } catch {}
    if (
      !Je ||
      !nt ||
      !(await isSamePathIdentity(dirname(Je), ze, {
        foldOn: "everyPlatform",
      })) ||
      !(await isSamePathIdentity(nt, join(L, ".git"), {
        foldOn: "everyPlatform",
        kind: "file",
      }))
    )
      throw new WorktreeIsolationError(`Cannot enter worktree: ${e} is not a linked worktree of ${w}.`);
  }
  let canonicalGitRoot_2 = findCanonicalGitRoot(L);
  let ke = null;
  if (canonicalGitRoot_2 !== null && isLinkedWorktree(L))
    try {
      ke = await realpath(canonicalGitRoot_2);
    } catch {}
  let we = ke !== null && ke.startsWith(G + sep) ? ke : w;
  let ownerRepoRoot = we === w ? G : we;
  let Ae = await listRegisteredWorktrees(we);
  let Ie;
  for (let Me of Ae)
    try {
      if ((await realpath(Me.worktreePath)) === L) {
        Ie = Me;
        break;
      }
    } catch {}
  if (!Ie)
    throw new WorktreeIsolationError(
      `Cannot enter worktree: ${e} is not a registered worktree of ${we}. Run 'git -C ${we} worktree list' to see registered worktrees.`,
    );
  if (Ie.prunable)
    throw new WorktreeIsolationError(
      `Cannot enter worktree: ${e} is marked prunable by git (its directory or administrative files are missing or broken).`,
    );
  if (await isLockHeldByLiveSameStartProcess(Ie.lockReason))
    throw new WorktreeIsolationError(
      `Cannot enter worktree: ${e} belongs to another running Claude Code session (locked: ${printableNameOrPlaceholder(Ie.lockReason ?? "")}). Wait for that session to finish or choose a different worktree.`,
    );
  return {
    worktreePath: L,
    worktreeBranch: Ie.worktreeBranch,
    ownerRepoRoot,
  };
}
//@ chunk-e6aww6q8.js:3641891-3642776 facade-exports
async function enterExistingWorktreeForSession(sessionId, path, r) {
  let currentWorktreeSession = getCurrentWorktreeSession();
  let originalCwd = currentWorktreeSession?.originalCwd ?? getCwd();
  let y =
    currentWorktreeSession?.preEnterOriginalCwd ?? currentWorktreeSession?.originalCwd ?? getOriginalCwd();
  let { worktreePath, worktreeBranch, ownerRepoRoot } = await resolveExistingWorktreeTarget(path, {
    requireManagedLocation: r.requireManagedLocation ?? currentWorktreeSession != null,
  });
  let nestedRepoRoot = ownerRepoRoot;
  try {
    let canonicalGitRoot = findCanonicalGitRoot(y);
    if (canonicalGitRoot !== null && (await realpath(canonicalGitRoot)) === ownerRepoRoot)
      nestedRepoRoot = undefined;
  } catch {}
  let q = await checkWorktreeIsolation(worktreePath, [], gitRootsForPath(y, ownerRepoRoot));
  if (!q.ok) {
    logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected");
    throw new WorktreeIsolationError(q.message);
  }
  let Z =
    currentWorktreeSession && isOwnedWorktreeSession(currentWorktreeSession)
      ? await realpath(currentWorktreeSession.worktreePath).catch(() => currentWorktreeSession.worktreePath)
      : undefined;
  if (currentWorktreeSession && Z !== undefined && worktreePath !== Z)
    await releaseOwnWorktreeLock(
      currentWorktreeSession.worktreePath,
      resolveWorktreeCwdForRemoval(currentWorktreeSession.originalCwd, currentWorktreeSession.worktreePath),
    );
  let madeElsewhere =
    worktreePath === Z && currentWorktreeSession?.madeElsewhere
      ? currentWorktreeSession.madeElsewhere
      : (await isWorktreeMadeElsewhere(worktreePath))
        ? "enteredByPath"
        : undefined;
  let ke = {
    originalCwd,
    preEnterOriginalCwd: y,
    worktreePath,
    worktreeName: basename(worktreePath),
    worktreeBranch,
    sessionId,
    enteredExisting: true,
    madeElsewhere,
    nestedRepoRoot,
    liveLaunchAnchor: currentWorktreeSession?.liveLaunchAnchor,
  };
  persistWorktreeSession(ke, r.storageV5);
  return ke;
}
//@ chunk-e6aww6q8.js:3642776-3643394 facade-exports
async function resolveManagedWorktreePath(path) {
  try {
    let normalized = win32.normalize(path);
    if (isWindowsUncPath(normalized) || containsVulnerableUncPath(normalized, true)) return null;
    let cwd = getCwd();
    if (isForeignMountPath(path, cwd) || isForeignMountPath(resolve_2(cwd, path), cwd)) return null;
    let canonicalGitRoot = findCanonicalGitRoot(cwd);
    let y = canonicalGitRoot ?? null?.workingCopyRoot;
    if (!y) return null;
    let S = await realpath(resolve_2(cwd, path));
    let w = await realpath(y);
    let L = await realpath(cwd);
    let G = uncHostOf(S);
    if (
      (isWindowsUncPath(S) || containsVulnerableUncPath(S, true)) &&
      (G === null || /^[\\/]{2}[?.][\\/]/.test(S) || (G !== uncHostOf(w) && G !== uncHostOf(L)))
    )
      return null;
    if (isForeignMountPath(S, w) && isForeignMountPath(S, L)) return null;
    if (canonicalGitRoot === null)
      return {
        targetReal: S,
        managed: false,
      };
    for (let { dir } of candidateWorktreeDirs(w)) {
      let Z = await realpath(dir).catch(() => null);
      if (
        Z !== null &&
        (await isSamePathIdentity(Z, dir)) &&
        (await isPathUnderIdentity(dir, S, {
          strictly: true,
        }))
      )
        return {
          targetReal: S,
          managed: true,
        };
    }
    return {
      targetReal: S,
      managed: false,
    };
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:3643394-3643572 facade-exports
async function isPathUnderManagedWorktreesDir(e) {
  try {
    let canonicalGitRoot = findCanonicalGitRoot(getCwd());
    if (!canonicalGitRoot) return false;
    return candidateWorktreeDirs(await realpath(canonicalGitRoot)).some(({ dir }) =>
      comparablePath(e, "foldingPlatforms").startsWith(comparablePath(dir, "foldingPlatforms") + sep),
    );
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:3643572-3643640 layout
function resolveWorktreeCwdForRemoval(originalCwd, worktreePath) {
  if (!hasUntouchableRecordSpelling(originalCwd)) return originalCwd;
  return worktreeLocationOf(worktreePath)?.checkout ?? homedir();
}
//@ chunk-e6aww6q8.js:3643640-3644074 facade-exports = keepWorktree (0.829)
/**
 * 保留 worktree（退出时选择保留），解除本进程的锁。
 */
async function keepWorktree(storageV5) {
  let currentWorktreeSession = getCurrentWorktreeSession();
  if (!currentWorktreeSession) return;
  try {
    let { worktreePath, originalCwd, worktreeBranch } = currentWorktreeSession;
    let worktreeCwdForRemoval = resolveWorktreeCwdForRemoval(originalCwd, worktreePath);
    let S = findGitRoot(worktreeCwdForRemoval) ?? worktreeCwdForRemoval;
    try {
      processChdir(worktreeCwdForRemoval);
    } catch (error) {
      logForDebugging(`Could not chdir to original directory while keeping worktree: ${error}`);
    }
    if (isOwnedWorktreeSession(currentWorktreeSession)) await releaseOwnWorktreeLock(worktreePath, S);
    persistWorktreeSession(null, storageV5);
    logForDebugging(
      `Linked worktree preserved at: ${worktreePath}${worktreeBranch ? ` on branch: ${worktreeBranch}` : ""}`,
    );
    logForDebugging(`You can continue working there by running: cd ${worktreePath}`);
  } catch (error) {
    logForDebugging(`Error keeping worktree: ${error}`, {
      level: "error",
    });
  }
}
//@ chunk-e6aww6q8.js:3644074-3647459 facade-exports = cleanupWorktree (0.347)
/**
 * 退出时清理会话 worktree：无改动则 git worktree remove 并删除分支，有改动保留并提示；hook 创建的走 WorktreeRemove hook。
 */
async function cleanupWorktree(storageV5, credentials) {
  let currentWorktreeSession = getCurrentWorktreeSession();
  if (!currentWorktreeSession) return true;
  try {
    let { worktreePath, originalCwd, worktreeBranch, hookBased } = currentWorktreeSession;
    let worktreeCwdForRemoval = resolveWorktreeCwdForRemoval(originalCwd, worktreePath);
    let L = findGitRoot(worktreeCwdForRemoval) ?? worktreeCwdForRemoval;
    try {
      processChdir(worktreeCwdForRemoval);
    } catch (error) {
      logForDebugging(`Could not chdir to original directory while cleaning up worktree: ${error}`);
    }
    if (currentWorktreeSession.enteredExisting) {
      if (isOwnedWorktreeSession(currentWorktreeSession)) await releaseOwnWorktreeLock(worktreePath, L);
      persistWorktreeSession(null, storageV5);
      return true;
    }
    let G = false;
    if (hookBased) {
      let q = await executeWorktreeRemoveHook(
        {
          id: getSessionId(),
          project: {
            originalCwd: getOriginalCwd(),
            projectRoot: getProjectRoot(),
          },
        },
        worktreePath,
        {
          storageV5,
          credentials,
        },
      );
      switch (q.kind) {
        case "removed":
          G = true;
          logForDebugging(`Removed hook-based worktree at: ${worktreePath}`);
          break;
        case "not_configured":
          logForDebugging(
            `No WorktreeRemove hook configured; falling back to removing the git worktree at: ${worktreePath}`,
          );
          break;
        case "failed":
          logForDebugging(`WorktreeRemove hook ${q.summary}; kept worktree at: ${worktreePath}`, {
            level: "warn",
          });
          clearResumeHintWorktree();
          persistWorktreeSession(null, storageV5);
          return false;
      }
    }
    if (!G) {
      let q;
      try {
        q = await readWorktreeLockReason(worktreePath, L);
      } catch (error) {
        if (
          await lstat(worktreePath).then(
            () => true,
            () => false,
          )
        ) {
          logForDebugging(
            `cleanupWorktree: kept ${worktreePath} \u2014 cannot read the worktree registry to verify lock ownership (${errorMessage(error)})`,
            {
              level: "warn",
            },
          );
          clearResumeHintWorktree();
          persistWorktreeSession(null, storageV5);
          return false;
        }
        logForDebugging(
          `cleanupWorktree: worktree registry unreadable and ${worktreePath} is already gone (${errorMessage(error)}); continuing to the already-removed path`,
        );
      }
      if (!(await mayReleaseWorktreeLock(q))) {
        logForDebugging(
          `cleanupWorktree: kept ${worktreePath} \u2014 locked by another live Claude Code process, or with a reason we did not write (${q || "no reason"})`,
          {
            level: "warn",
          },
        );
        clearResumeHintWorktree();
        persistWorktreeSession(null, storageV5);
        return false;
      }
      await unlockAgentWorktree(worktreePath, L);
      let Z = hookBased ? null : worktreeLocationOf(worktreePath);
      let Se = stripTrailingSeparators(worktreePath);
      let repoRootForWorktreePath = getRepoRootForWorktreePath(Se);
      if (Z === null && hasDotSegment(Se)) {
        logForDebugging(`Kept worktree \u2014 ${worktreePath} carries a dot segment`, {
          level: "warn",
        });
        clearResumeHintWorktree();
        persistWorktreeSession(null, storageV5);
        return false;
      }
      let we = normalize(Se);
      let Ee = stripTrailingSeparators(normalize(worktreeCwdForRemoval));
      let Ae = [];
      let gitRoot = findGitRoot(worktreeCwdForRemoval);
      while (gitRoot !== null) {
        Ae.push(gitRoot);
        let gt = dirname(gitRoot);
        let At = gt === gitRoot ? null : findGitRoot(gt);
        gitRoot =
          At !== null && At.length < gitRoot.length && gitRoot.startsWith(At.endsWith(sep) ? At : At + sep)
            ? At
            : null;
      }
      let sorted = [
        ...new Set(
          [findCanonicalGitRoot(worktreeCwdForRemoval), ...Ae]
            .filter((gt) => gt !== null)
            .map((gt) => stripTrailingSeparators(normalize(gt))),
        ),
        Ee,
      ].sort((gt, At) => gt.length - At.length);
      let We =
        repoRootForWorktreePath === null ? null : stripTrailingSeparators(normalize(repoRootForWorktreePath));
      let any = sorted.some((gt) => normalizePathKey(we).startsWith(normalizePathKey(gt) + sep));
      let found = sorted.find((current) => we.startsWith(current + sep));
      let Je =
        repoRootForWorktreePath !== null &&
        We !== null &&
        (found === undefined ? !any : found.startsWith(We + sep))
          ? repoRootForWorktreePath
          : found;
      let nt =
        Z !== null
          ? "clear"
          : await symlinkVerdictForPath(
              Je === repoRootForWorktreePath ? Se : we,
              Je !== undefined
                ? Je === repoRootForWorktreePath && found === undefined
                  ? dirname(Je)
                  : Je
                : any
                  ? undefined
                  : dirname(we),
            );
      if (nt !== "clear" && nt !== "missing") {
        logForDebugging(`Kept linked worktree \u2014 ${worktreePath} is a link, or cannot be probed`, {
          level: "warn",
        });
        clearResumeHintWorktree();
        persistWorktreeSession(null, storageV5);
        return false;
      }
      let pt = false;
      if (hookBased && getPlatform() === "windows") {
        let gt = await listRegisteredWorktrees(L).catch(() => null);
        if (gt != null) {
          pt = true;
          let At = await realpath(worktreePath).catch(() => worktreePath);
          for (let It of gt)
            if (At === (await realpath(It.worktreePath).catch(() => It.worktreePath))) {
              pt = false;
              break;
            }
        }
      }
      let Et;
      let yt = "";
      if (Z !== null)
        Et = await removeWorktreeRegistration(
          Z.checkout,
          worktreeBranch ?? basename(worktreePath),
          worktreePath,
          {
            byPathIn: Z.home,
            deregisterOnKeep: false,
            dropIfStopped: true,
          },
        );
      else if (nt === "missing")
        Et = (await pruneWorktreeRegistration(findCanonicalGitRoot(L) ?? L, Se)).outcome === "dropped";
      else {
        if (!pt && !(await clearReparsePoints(Se))) {
          logForDebugging(`Kept linked worktree \u2014 unremovable reparse point in ${worktreePath}`, {
            level: "warn",
          });
          clearResumeHintWorktree();
          persistWorktreeSession(null, storageV5);
          return false;
        }
        let gt = await removeWorktreeSafely(L, Se, {
          resolveAboveParent: true,
        });
        if (gt.outcome === "unanchored") {
          let At = await execFileNoThrowWithCwd(
            gitExe(),
            [...GIT_SAFE_GLOBAL_ARGS, "worktree", "remove", "--force", Se],
            {
              cwd: L,
              env: buildGitEnvForRepo(L),
            },
          );
          Et = At.code === 0;
          yt = At.stderr;
        } else {
          Et = gt.outcome === "removed";
          yt = Et ? "" : worktreeRemovalText(gt);
        }
      }
      if (
        !Et &&
        (await lstat(worktreePath).then(
          () => true,
          () => false,
        ))
      ) {
        logForDebugging(
          `Failed to remove linked worktree, kept ${worktreePath}${yt.trim() ? `: ${yt.trim()}` : ""}`,
          {
            level: "warn",
          },
        );
        clearResumeHintWorktree();
        persistWorktreeSession(null, storageV5);
        return false;
      }
      logForDebugging(`Removed linked worktree at: ${worktreePath}`);
      await restoreWorktreeConfigExtension(L);
    }
    clearResumeHintWorktree();
    persistWorktreeSession(null, storageV5);
    if (!hookBased && worktreeBranch) {
      await sleep(100);
      await deleteWorktreeBranch(L, worktreeBranch, {
        logSuccess: true,
      });
    }
    logForDebugging("Linked worktree cleaned up completely");
    return true;
  } catch (error) {
    logForDebugging(`Error cleaning up worktree: ${error}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-e6aww6q8.js:3647459-3647914 layout
async function assertWorktreeDirExists(worktreePath, n) {
  let r = false;
  try {
    r = (await stat(worktreePath)).isDirectory();
  } catch {}
  if (!r) {
    logFeatureBad("git_worktree_create", "git_worktree_create_path_missing");
    throw new WorktreeIsolationError(
      n
        ? `WorktreeCreate hook returned a path that is not a directory: ${worktreePath}. The hook must create the directory before echoing its path.`
        : `Worktree directory does not exist at ${worktreePath} after creation. ` +
            "Refusing to launch agent in parent repo \u2014 check for concurrent worktree cleanup or filesystem errors.",
    );
  }
}
//@ chunk-e6aww6q8.js:3647914-3650083 facade-exports = createAgentWorktree (0.429)
/**
 * 为子代理创建隔离 worktree（slug 形如 agent-a<hex>），优先 WorktreeCreate hook，否则在 .claude/worktrees 下创建并加锁。
 */
async function createAgentWorktree(name, n) {
  validateWorktreeSlug(name);
  refuseUnavailableWorktree("agent worktree");
  let r = dispatchesWorktreeCreate()
    ? await executeWorktreeCreateHook(
        {
          id: getSessionId(),
          project: {
            originalCwd: getOriginalCwd(),
            projectRoot: getProjectRoot(),
          },
        },
        name,
        {
          storageV5: n?.storageV5,
          credentials: n?.credentials,
        },
      )
    : undefined;
  if (r) {
    if (hasDotSegment(r.worktreePath)) {
      logFeatureBad("git_worktree_create", "git_worktree_create_hook_ancestry_rejected");
      throw new WorktreeIsolationError(
        `Cannot use the WorktreeCreate hook's worktree: the hook emitted a path with dot segments (${r.worktreePath}). The ` +
          "symlink screen cannot verify a dotted spelling \u2014 have the " +
          "hook emit a normalized (dot-free) absolute path and retry.",
      );
    }
    let q = n?.fromCwd ?? getCwd();
    for (let Ee of new Set([findCanonicalGitRoot(q), findGitRoot(q)].filter((Ae) => Boolean(Ae)))) {
      let symlinkInWorktreeAncestry = await findSymlinkInWorktreeAncestry(r.worktreePath, Ee);
      if (symlinkInWorktreeAncestry) {
        logFeatureBad("git_worktree_create", "git_worktree_create_hook_ancestry_rejected");
        throw new WorktreeIsolationError(
          `Cannot use the WorktreeCreate hook's worktree: ${symlinkInWorktreeAncestry.component} ` +
            (symlinkInWorktreeAncestry.kind === "symlink" ? "is a symlink. " : "could not be verified. ") +
            "A repository-committed symlink below the checkout root could redirect the worktree outside the repository. Remove the symlink (or emit a path outside the repository) and retry.",
        );
      }
    }
    await assertWorktreeDirExists(r.worktreePath, true);
    logForDebugging(`Created hook-based agent worktree at: ${r.worktreePath}`);
    let Z = await checkWorktreeIsolation(r.worktreePath, [], gitRootsForPath(q));
    if (!Z.ok) {
      logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected");
      throw new WorktreeIsolationError(Z.message);
    }
    let Se = await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "HEAD"], {
      cwd: r.worktreePath,
      env: buildGitEnvForRepo(r.worktreePath),
    });
    let ke = Se.code === 0 ? Se.stdout.trim() : undefined;
    let we = ke === undefined ? await getHookWorktreeHead(r.worktreePath, q) : undefined;
    logFeatureOk("git_worktree_create");
    return {
      worktreePath: r.worktreePath,
      hookBased: true,
      headCommit: ke,
      ...(ke === undefined && {
        sessionDir: q,
      }),
      ...(we !== undefined && {
        baseChangeset: we,
      }),
    };
  }
  let s = n?.fromCwd ?? getCwd();
  let gitRoot = findCanonicalGitRoot(s);
  if (!gitRoot) throwAgentWorktreeNotGitRefusal();
  let { worktreePath, worktreeBranch, headCommit, existed } = await getOrCreateWorktree(
    gitRoot,
    getWorktreesDirSpec(gitRoot),
    name,
    {
      fromHead: n?.fromHead,
      fromCwd: s,
    },
  );
  if (!existed) {
    logForDebugging(`Created agent worktree at: ${worktreePath} on branch: ${worktreeBranch}`);
    await performPostCreationSetup(gitRoot, worktreePath);
  } else logForDebugging(`Resuming existing agent worktree at: ${worktreePath}`);
  await lockClaudeWorktree(worktreePath, gitRoot, name, "agent");
  await assertWorktreeDirExists(worktreePath, false);
  let G = await checkWorktreeIsolation(worktreePath, [], gitRootsForPath(s, gitRoot));
  if (!G.ok) {
    logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected");
    throw new WorktreeIsolationError(G.message);
  }
  logFeatureOk("git_worktree_create");
  return {
    worktreePath,
    worktreeBranch,
    headCommit,
    gitRoot,
  };
}
//@ chunk-e6aww6q8.js:3650083-3650375 layout
async function isNestedInOtherRepo(e) {
  if (resolveGitDirs(e) !== null) return false;
  let n = await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--show-toplevel"], {
    cwd: e,
    env: getRemoteHostSessionCount(),
  });
  let trimmed = n.stdout.trim();
  if (n.code !== 0 || !trimmed) return false;
  let s = resolve_2(await realpath(trimmed).catch(() => trimmed));
  let h = resolve_2(await realpath(e).catch(() => e));
  if (s === h) return false;
  return getPlatform() === "windows" ? foldCaseBasic(s) !== foldCaseBasic(h) : true;
}
//@ chunk-e6aww6q8.js:3650375-3651154 facade-exports = hasWorktreeChanges (0.49)
/**
 * worktree 是否 dirty 以及相对创建提交领先的提交数。
 */
async function getAgentWorktreeChanges(worktreePath, n, r) {
  let filterNeutralizingArgs = await getFilterNeutralizingArgs(worktreePath);
  if (filterNeutralizingArgs === null)
    return {
      dirty: true,
      trackedChanges: true,
      commitsAhead: 0,
      gitError: await isGitDirMissing(worktreePath),
    };
  let h = await execFileNoThrowWithCwd(
    gitExe(),
    [...filterNeutralizingArgs, ...GIT_SAFE_GLOBAL_ARGS, ...SAFE_GIT_ENV_CONSTANTS],
    {
      cwd: worktreePath,
      env: buildGitEnvForRepo(worktreePath, undefined, {
        userLocale: true,
      }),
    },
  );
  if (h.code !== 0)
    return {
      dirty: true,
      trackedChanges: true,
      commitsAhead: 0,
      gitError: true,
    };
  let y = await inspectSubmodules(worktreePath);
  let S = submoduleChanges(y);
  let dirty = h.stdout.trim().length > 0 || S !== undefined;
  let trackedChanges =
    hasNonIgnoredChanges(h.stdout) || y.kind === "unverifiable" || y.withTrackedChanges.length > 0;
  if (!n)
    return {
      dirty,
      trackedChanges,
      commitsAhead: 0,
      ...(S !== undefined && {
        submoduleWork: S,
      }),
    };
  let G = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-list", "--count", `${n}..HEAD`],
    {
      cwd: worktreePath,
      env: buildGitEnvForRepo(worktreePath),
    },
  );
  if (G.code !== 0)
    return {
      dirty: true,
      trackedChanges: true,
      commitsAhead: 0,
      gitError: true,
    };
  return {
    dirty,
    trackedChanges,
    commitsAhead: parseInt(G.stdout.trim(), 10) || 0,
    ...(S !== undefined && {
      submoduleWork: S,
    }),
  };
}
//@ chunk-e6aww6q8.js:3651154-3651185 layout
async function getHookWorktreeHead(worktreePath, n) {
  return;
}
//@ chunk-e6aww6q8.js:3651185-3651213 layout
function getWorkingCopyRootFallback(cwd) {
  return null;
}
//@ chunk-e6aww6q8.js:3651213-3651253 facade-exports
async function getWorkingCopyWorktreeChanges(worktreePath, originalChangeset, originalCwd, s) {
  return null;
}
//@ chunk-e6aww6q8.js:3651253-3651332 layout
function hasNonIgnoredChanges(stdout) {
  return stdout
    .split(
      `
`,
    )
    .some((line) => line.length > 0 && !line.startsWith("??"));
}
//@ chunk-e6aww6q8.js:3651332-3651419 facade-exports
async function unlockAgentWorktree(worktreePath, n) {
  await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "worktree", "unlock", worktreePath], {
    cwd: n,
    env: buildGitEnvForRepo(n),
  });
}
//@ chunk-e6aww6q8.js:3651419-3651488 placement
function runGitInWorktree(e, n) {
  return execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...n], {
    cwd: e,
    env: buildGitEnvForRepo(e, R8o),
  });
}
//@ chunk-e6aww6q8.js:3651656-3651830 sole-consumer
async function isLocalBranchMissing(worktreePath, worktreeBranch) {
  let r = await runGitInWorktree(worktreePath, [
    "for-each-ref",
    "--count=1",
    "--format=%(refname)",
    `refs/heads/${worktreeBranch}`,
  ]);
  return r.code === 0 && r.stdout.trim() === "" && r.stderr.trim() === "";
}
//@ chunk-e6aww6q8.js:3651830-3652603 sole-consumer
/**
 * 判断 worktree 当前 HEAD 状态（its_branch/another_branch/detached/unreadable）及相对创建时提交的新增提交数，退出 worktree 时决定是否提示保留。
 */
async function getWorktreeBranchState({ worktreePath, worktreeBranch, originalHeadCommit, hookBased }) {
  if (hookBased || !worktreeBranch) return null;
  let h = `refs/heads/${worktreeBranch}`;
  let y = await runGitInWorktree(worktreePath, ["symbolic-ref", "-q", "HEAD"]);
  let [, S] = /^refs\/heads\/(.+)$/.exec(y.stdout.replace(/\r?\n$/, "")) ?? [];
  let isDetached = y.exitCode === 1 && y.stdout.trim() === "" && y.stderr.trim() === "";
  if (S === undefined && !isDetached)
    return {
      head: "unreadable",
      commits: null,
    };
  if (S !== undefined && S !== worktreeBranch && foldPathCase(S) === foldPathCase(worktreeBranch))
    return {
      head: "like_its_branch",
      commits: null,
    };
  let L = originalHeadCommit;
  if (S === worktreeBranch)
    return {
      head: "its_branch",
      commits: L ? await hasUnpushedCommits_2(worktreePath, [h], [L]) : null,
    };
  if (S !== undefined) {
    let commits = L
      ? ((await hasUnpushedCommits_2(worktreePath, [h], [`refs/heads/${S}`, L])) ??
        ((await isLocalBranchMissing(worktreePath, worktreeBranch)) ? 0 : null))
      : null;
    return {
      head: "another_branch",
      branch: S,
      commits,
    };
  }
  return {
    head: "detached",
    commits: L
      ? ((await hasUnpushedCommits_2(worktreePath, [h, "HEAD"], [L])) ??
        ((await isLocalBranchMissing(worktreePath, worktreeBranch))
          ? await hasUnpushedCommits_2(worktreePath, ["HEAD"], [L])
          : null))
      : null,
  };
}
//@ chunk-e6aww6q8.js:3652603-3652841 facade-exports
function describeWhereCommitsAre(e, n, r) {
  switch (e.head) {
    case "another_branch":
    case "like_its_branch":
      return `on ${n} that ${r} doesn't have`;
    case "detached":
      return `on ${n} or at the detached HEAD`;
    case "its_branch":
    case "unreadable":
    case "not_read":
      return `on ${n}`;
  }
}
//@ chunk-e6aww6q8.js:3652841-3653222 facade-exports
async function countCommitsAtStake(e, n) {
  let { worktreePath, originalHeadCommit } = e;
  let h =
    n ||
    readFlagWithOverride("tengu_wary_ladle", {
      safe: true,
    })
      ? await getWorktreeBranchState(e)
      : null;
  if (h === null)
    return {
      head: "not_read",
      commits: originalHeadCommit
        ? await hasUnpushedCommits_2(worktreePath, ["HEAD"], [originalHeadCommit])
        : null,
    };
  if (n || h.head !== "another_branch" || h.commits !== 0) return h;
  let y = originalHeadCommit
    ? await hasUnpushedCommits_2(worktreePath, [`refs/heads/${h.branch}`], [originalHeadCommit])
    : null;
  return y === 0
    ? h
    : {
        head: h.head,
        branch: h.branch,
        commits: 0,
        onKeptBranch: y,
      };
}
//@ chunk-e6aww6q8.js:3653222-3653505 layout
async function deleteWorktreeBranch(e, n, r) {
  let { code, stderr } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "branch", "-D", "--end-of-options", n],
    {
      cwd: e,
      env: buildGitEnvForRepo(e),
    },
  );
  if (code !== 0) {
    logForDebugging(`${r?.errorLabel ?? "Could not delete worktree branch"}: ${stderr}`, {
      level: "error",
    });
    return false;
  }
  if (r?.logSuccess) logForDebugging(`Deleted worktree branch: ${n}`);
  return true;
}
//@ chunk-e6aww6q8.js:3653505-3653770 facade-exports
/**
 * worktree 已不存在的 git 错误正则，以及 worktree 清理时的几类摘要文案（解析变化、文件未核对、无法删除的重解析点）。
 */
var WORKTREE_GONE_RE =
  /is not a working tree|validation failed|not a git repository: .*[\\/]\.git[\\/]worktrees[\\/]/;
var IDENTITY_CHANGED_SUMMARY = "resolution changed since ownership verification";
var UNCHECKED_FILES_SUMMARY = "has files that were not checked against a repository";
var UNREMOVABLE_REPARSE_SUMMARY = "unremovable reparse point in the worktree";
//@ chunk-e6aww6q8.js:3653770-3653847 facade-exports
function carriesDiscardConsent(e) {
  return e === "job_delete_force" || e === "job_delete_force_remove";
}
//@ chunk-e6aww6q8.js:3653847-3653976 facade-exports
function repositoryVouchedByWorktree(e) {
  let n = identity(resolve_2(e));
  let gitRootUncached = findGitRootUncached(e);
  if (gitRootUncached === null || identity(resolve_2(gitRootUncached)) !== n) return null;
  let canonicalGitRootUncached = findCanonicalGitRootUncached(e);
  return canonicalGitRootUncached !== null && identity(resolve_2(canonicalGitRootUncached)) !== n
    ? canonicalGitRootUncached
    : null;
}
//@ chunk-e6aww6q8.js:3653976-3654790 facade-exports
async function worktreeDeregisteredByRemoval(e, n) {
  let gitDir = await resolveGitDir_2(e);
  if (gitDir === null) return false;
  let s = basename(gitDir);
  if (s === "" || s === "." || s === "..") return false;
  let h = await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--git-common-dir"], {
    cwd: n,
    env: buildGitEnvForRepo(n),
  });
  let trimmed = h.stdout.trim();
  if (h.code !== 0 || !trimmed) return false;
  let S = resolve_2(n, trimmed);
  let w = await realpath(S).catch(() => S);
  let L = (Se, ke) => (getPlatform() === "windows" ? foldCaseBasic(Se) === foldCaseBasic(ke) : Se === ke);
  let G = dirname(gitDir);
  if (!L(G, join(S, "worktrees")) && !L(G, join(w, "worktrees"))) return false;
  try {
    await lstat(join(w, "worktrees", s));
    return false;
  } catch (error) {
    if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR") return false;
  }
  let q = await vetWorktreeRegistration(n);
  if (!q.ok) return false;
  let Z = await listRegisteredWorktrees(n, {
    vetted: q,
  }).catch(() => null);
  if (Z === null) return false;
  for (let Se of Z) {
    if (L(resolve_2(Se.worktreePath), e)) return false;
    if (isNetworkOrUnsafePath(Se.worktreePath)) continue;
    let ke;
    try {
      ke = await realpath(Se.worktreePath);
    } catch (error) {
      if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR") return false;
      continue;
    }
    if (!isNetworkOrUnsafePath(ke) && L(ke, e)) return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:3654875-3658413 sole-consumer
/**
 * 不经 git 直接删除 agent worktree 目录（无仓库根 / hook 创建 / 强制删除三条路径）：必须是绝对、本地、无可疑链接、身份未变且直接位于 .claude/worktrees 下；
 * 强制删除时还要核对 .git 形态。记 tengu_worktree_removed 埋点，返回 {outcome, errorSummary?}。
 */
async function removeWorktreeDirWithoutGit(
  worktreePath,
  source,
  { vettedReal: r, via: s = "no_root", forced: h = false, changedFiles: y = 0 } = {},
) {
  let S = (Ie) => {
    logForDebugging(
      `removeAgentWorktree: refused ${h ? "forced" : "no-root"} removal of ${worktreePath} \u2014 ${Ie}`,
      {
        level: "warn",
      },
    );
    return {
      outcome: "failed",
      errorSummary: Ie,
    };
  };
  let w = (Ie) => {
    logEvent("tengu_worktree_removed", {
      source: fromEnum(source),
      changed_files: Ie === "deleted_forced" ? y : 0,
      commits: 0,
      ...(s === "hook" && {
        hook_based: true,
      }),
      ...((Ie === "deleted_no_root" || (Ie === "already_gone" && s === "no_root")) && {
        no_root: 1,
      }),
      ...(Ie === "already_gone" && {
        already_gone: 1,
      }),
      ...(Ie === "deleted_forced" && {
        forced_rm: 1,
      }),
    });
    return Ie === "deleted_forced"
      ? {
          outcome: "removed",
          forcedDirectoryRemoval: {},
        }
      : {
          outcome: "removed",
        };
  };
  if (!isAbsolute(worktreePath)) return S("path is not absolute");
  let cwd = getCwd();
  let G = (Ie) => isNetworkOrOutsidePath(Ie, cwd);
  if (G(worktreePath)) return S("network path (UNC or automount)");
  if (hasDotSegment(worktreePath)) return S("unverifiable symlinked ancestor");
  let deepestExistingAncestor = resolveDeepestExistingAncestorSync(getFsImplementation(), worktreePath, {
    surfaceNetworkRaw: true,
    anchor: cwd,
  });
  if (deepestExistingAncestor === UNVERIFIED_ANCESTRY) return S("unverifiable symlinked ancestor");
  if (deepestExistingAncestor !== undefined && G(deepestExistingAncestor))
    return S("network path (UNC or automount)");
  if (deepestExistingAncestor !== undefined && hasDotSegment(deepestExistingAncestor))
    return S("unverifiable symlinked ancestor");
  let Z;
  try {
    Z = await lstat(worktreePath);
  } catch (error) {
    if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR")
      return S(`cannot stat the directory (${getErrnoCode(error) ?? "unknown error"})`);
    logForDebugging(
      s === "no_root"
        ? `removeAgentWorktree: ${worktreePath} already gone and no git root resolves \u2014 nothing left to remove`
        : `removeAgentWorktree: ${worktreePath} already gone \u2014 nothing left to remove (${s} lane)`,
    );
    return w("already_gone");
  }
  if (!Z.isDirectory()) return S("not a directory");
  let path = await realpath(worktreePath).catch(() => null);
  if (path === null) return S("could not canonicalize the path");
  if (G(path)) return S("network path (UNC or automount)");
  if (r !== undefined && path !== r) return S(IDENTITY_CHANGED_SUMMARY);
  if (!isDirectlyUnderClaudeWorktreesDir(path))
    return S("it isn't directly under a .claude/worktrees directory, so it is never deleted automatically");
  if (h) {
    let Ie;
    try {
      let Me = await lstat(join(path, ".git"));
      Ie = Me.isDirectory() ? "directory" : Me.isFile() ? "file" : "unverifiable";
    } catch (error) {
      Ie = isENOENT(error) || getErrnoCode(error) === "ENOTDIR" ? "none" : "unverifiable";
    }
    switch (Ie) {
      case "file":
        break;
      case "directory":
        return S(
          "it is a standalone git repository, and deleting it would destroy the only copy of its history",
        );
      case "none":
        return S(
          "it has no .git file of its own linking it to a repository, so it is never deleted by force",
        );
      case "unverifiable":
        return S("its .git entry couldn't be verified");
    }
  } else if ((await findGitRootVerifyingPositive(path)) !== null) return S("still resolves to a repository");
  let ke = await readdir(path).catch(() => null);
  if (ke === null) return S("unreadable directory");
  if (!h && ke.length > 0 && !carriesDiscardConsent(source)) {
    logForDebugging(
      `removeAgentWorktree: kept rootless ${worktreePath} \u2014 ${ke.length} unverifiable file(s); only an explicit discard may remove them`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_worktree_removed", {
      source: fromEnum(source),
      changed_files: 0,
      commits: 0,
      no_root: 1,
      aborted: 1,
    });
    return {
      outcome: "failed",
      errorSummary: UNCHECKED_FILES_SUMMARY,
      needsForce: true,
    };
  }
  if ((await realpath(path).catch(() => null)) !== path) return S(IDENTITY_CHANGED_SUMMARY);
  if (!(await clearReparsePoints(path))) {
    logForDebugging(
      `removeAgentWorktree: aborted ${source} removal \u2014 unremovable reparse point in ${worktreePath}`,
      {
        level: "warn",
      },
    );
    return {
      outcome: "failed",
      errorSummary: UNREMOVABLE_REPARSE_SUMMARY,
    };
  }
  if ((await realpath(path).catch((error) => (isENOENT(error) ? path : null))) !== path)
    return S(IDENTITY_CHANGED_SUMMARY);
  let Ae = h ? await resolveGitDir_2(path) : null;
  try {
    if (h) {
      for (let Ie of ke)
        if (Ie !== ".git")
          await rm_2(join(path, Ie), {
            recursive: true,
            force: true,
          });
    }
    await rm_2(path, {
      recursive: true,
      force: true,
    });
  } catch (error) {
    if (Ae !== null) await restoreWorktreeGitPointer(path, Ae, Z);
    logForDebugging(`removeAgentWorktree: could not delete ${worktreePath}: ${errorMessage(error)}`, {
      level: "warn",
    });
    return {
      outcome: "failed",
      errorSummary: `the directory could not be deleted (${getErrnoCode(error) ?? "unknown error"})`,
      ...(h && {
        forceRemovable: "rm_failed",
      }),
    };
  }
  logForDebugging(
    h
      ? `Removed agent worktree by force (${s} lane) at: ${worktreePath}`
      : `Removed agent worktree with no git root at: ${worktreePath}`,
  );
  return w(h ? "deleted_forced" : "deleted_no_root");
}
//@ chunk-e6aww6q8.js:3658413-3658678 sole-consumer
async function compareInodeIdentity(e, n) {
  let [r, s] = await Promise.all([
    stat(e, {
      bigint: true,
    }).catch(() => null),
    stat(n, {
      bigint: true,
    }).catch(() => null),
  ]);
  if (r === null || s === null || !hasInode(r.ino) || !hasInode(s.ino) || r.dev === 0n || s.dev === 0n)
    return "unknown";
  return r.dev === s.dev && r.ino === s.ino ? "same" : "different";
}
//@ chunk-e6aww6q8.js:3658678-3659510 sole-consumer
/**
 * 计算存储路径的真实身份路径：在仓库根下直接拼接；经祖先链接进入时按 inode 找到对应祖先；若从外部链接进入仓库则拒绝（inside_root）。
 */
async function resolveWorktreeIdentity(storedPath, repoRoot) {
  let r = stripTrailingSeparators(normalize(storedPath));
  let s = [];
  for (let y = dirname(r); dirname(y) !== y; y = dirname(y)) s.push(y);
  if (repoRoot !== undefined) {
    let y = stripTrailingSeparators(normalize(repoRoot));
    let S = await realpath(y).catch(() => null);
    if (S === null)
      return {
        refused: "unreadable",
      };
    let w = stripTrailingSeparators(S);
    if (r.startsWith(y + sep))
      return {
        identity: w + r.slice(y.length),
      };
    let L = null;
    for (let q of s) {
      let Z = await compareInodeIdentity(q, w);
      if (Z === "unknown")
        return {
          refused: "unreadable",
        };
      if (Z === "same") L = q;
    }
    if (L !== null)
      return {
        identity: w + r.slice(L.length),
      };
    let G = null;
    for (let q of s) {
      let Z = await realpath(q).catch(() => null);
      if (Z === null)
        return {
          refused: "unreadable",
        };
      G ??= Z;
      for (let Se = stripTrailingSeparators(Z); dirname(Se) !== Se; Se = dirname(Se)) {
        let ke = await compareInodeIdentity(Se, w);
        if (ke !== "different")
          return {
            refused: ke === "same" ? "inside_root" : "unreadable",
          };
      }
    }
    return G === null
      ? {
          refused: "unreadable",
        }
      : {
          identity: join(G, basename(r)),
        };
  }
  let h = await realpath(dirname(r)).catch(() => null);
  return h === null
    ? {
        refused: "unreadable",
      }
    : {
        identity: join(h, basename(r)),
      };
}
//@ chunk-e6aww6q8.js:3659510-3662869 sole-consumer
/**
 * 强制删除 agent worktree：身份必须与核验一致、.git 必须链接到该仓库，已跟踪文件需无改动（git status 校验），再删除目录并处理分支。失败返回 {outcome:"failed", errorSummary}。
 */
async function forceRemoveAgentWorktree(
  worktreePath,
  vettedIdentity,
  repoRoot,
  { via, source, changedFiles = 0, keptBranch },
) {
  let worktreeIdentity = await resolveWorktreeIdentity(worktreePath, repoRoot);
  if ("refused" in worktreeIdentity) {
    logForDebugging(
      `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 ${worktreeIdentity.refused === "inside_root" ? "the stored path reaches into the repository through a link from outside it" : "the directory at the stored path could not be identified"}`,
      {
        level: "warn",
      },
    );
    return {
      outcome: "failed",
      errorSummary:
        worktreeIdentity.refused === "inside_root"
          ? "the path reaches into the repository through a link from outside it, so nothing was deleted by force; remove the link or the directory by hand"
          : "the directory at this path could not be identified, so nothing was deleted by force; remove it by hand",
    };
  }
  if (vettedIdentity !== worktreeIdentity.identity) {
    logForDebugging(
      `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 the vetted identity is not the stored path's own`,
      {
        level: "warn",
      },
    );
    return {
      outcome: "failed",
      errorSummary:
        "the directory that was checked is not the one at this path, so nothing was deleted by force; retry, or remove the link or the directory by hand",
    };
  }
  let L = repositoryVouchedByWorktree(vettedIdentity);
  let G =
    repoRoot !== undefined &&
    L !== null &&
    (await realpath(L).catch(() => L)) === (await realpath(repoRoot).catch(() => repoRoot));
  if (repoRoot === undefined || (!G && !(await worktreeDeregisteredByRemoval(vettedIdentity, repoRoot)))) {
    logForDebugging(
      `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 its .git does not link it to ${repoRoot ?? "any repository"}`,
      {
        level: "warn",
      },
    );
    return {
      outcome: "failed",
      errorSummary:
        "its own .git doesn't link it to the repository it would be pruned from, so it is never deleted by force",
    };
  }
  let q = keptBranch;
  if (G) {
    let filterNeutralizingArgs = await getFilterNeutralizingArgs(vettedIdentity);
    let env = buildGitEnvForRepo(vettedIdentity, undefined, {
      userLocale: true,
    });
    let Ae = filterNeutralizingArgs
      ? await execFileNoThrowWithCwd(
          gitExe(),
          [...filterNeutralizingArgs, ...GIT_SAFE_GLOBAL_ARGS, ...SAFE_GIT_ENV_CONSTANTS],
          {
            cwd: vettedIdentity,
            env,
          },
        )
      : null;
    if (Ae === null || Ae.code !== 0) {
      logForDebugging(
        `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 git status failed, cannot verify tracked files are unchanged`,
        {
          level: "warn",
        },
      );
      return {
        outcome: "failed",
        errorSummary:
          "its tracked files couldn't be checked for uncommitted changes (git status failed there)",
      };
    }
    if (hasNonIgnoredChanges(Ae.stdout)) {
      logForDebugging(
        `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 uncommitted changes to tracked files`,
        {
          level: "warn",
        },
      );
      return {
        outcome: "failed",
        errorSummary: "it has uncommitted changes to tracked files, so it is never deleted by force",
      };
    }
    let Ie = await inspectSubmodules(vettedIdentity);
    let Me =
      Ie.kind === "unverifiable"
        ? Ie
        : Ie.withTrackedChanges.length > 0
          ? {
              kind: "changes",
              paths: Ie.withTrackedChanges,
            }
          : undefined;
    if (Me !== undefined) {
      logForDebugging(
        `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 submodule work unverified or uncommitted`,
        {
          level: "warn",
        },
      );
      return {
        outcome: "failed",
        errorSummary: `${Me.kind === "changes" ? "it has uncommitted " : ""}${describeSubmoduleChanges(Me)}, so it is never deleted by force`,
      };
    }
    let We = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "symbolic-ref", "--short", "-q", "HEAD"],
      {
        cwd: vettedIdentity,
        env,
      },
    );
    if (We.code === 0 && We.stdout.trim()) q = We.stdout.trim();
  } else
    logForDebugging(
      `removeAgentWorktree: ${worktreePath} is no longer registered with ${repoRoot} though its own .git still names it \u2014 deleting it as asked, nothing left to verify its contents against`,
      {
        level: "warn",
      },
    );
  let Z = await removeWorktreeDirWithoutGit(worktreePath, source, {
    vettedReal: vettedIdentity,
    via,
    forced: true,
    changedFiles,
  });
  if (Z.outcome !== "removed") return Z;
  let Se = await pruneWorktreeRegistration(repoRoot, [worktreePath, vettedIdentity]);
  if (Se.outcome !== "dropped")
    logForDebugging(
      `removeAgentWorktree: the registration of ${worktreePath} in ${repoRoot} was not dropped after the forced removal (${Se.outcome === "kept" ? Se.reason : "no registration names it"})`,
      {
        level: "warn",
      },
    );
  await restoreWorktreeConfigExtension(repoRoot);
  return Z.forcedDirectoryRemoval !== undefined &&
    q !== undefined &&
    (
      await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "show-ref", "--verify", "--quiet", `refs/heads/${q}`],
        {
          cwd: repoRoot,
          env: buildGitEnvForRepo(repoRoot),
        },
      )
    ).code === 0
    ? {
        outcome: "removed",
        forcedDirectoryRemoval: {
          keptBranch: q,
        },
      }
    : Z;
}
//@ chunk-e6aww6q8.js:3662869-3670830 facade-exports
async function removeAgentWorktree(
  worktreePath,
  worktreeBranch,
  repoRoot,
  s,
  h = "unknown",
  vettedIdentity,
  S,
  { storageV5: w, credentials: L, forceRemoveRequested: G = false, keepsWorktreesInside: q } = {},
) {
  if (s) {
    if (
      !isAbsolute(worktreePath) ||
      hasDotSegment(worktreePath) ||
      isNetworkOrOutsidePath(worktreePath, getCwd())
    )
      return removeWorktreeDirWithoutGit(worktreePath, h, {
        vettedReal: vettedIdentity,
        via: "hook",
      });
    let gt = worktreePath;
    if (vettedIdentity !== undefined) {
      let cwd = getCwd();
      let deepestExistingAncestor = resolveDeepestExistingAncestorSync(getFsImplementation(), worktreePath, {
        surfaceNetworkRaw: true,
        anchor: cwd,
      });
      if (
        deepestExistingAncestor === UNVERIFIED_ANCESTRY ||
        (deepestExistingAncestor !== undefined &&
          (isNetworkOrOutsidePath(deepestExistingAncestor, cwd) || hasDotSegment(deepestExistingAncestor)))
      )
        return removeWorktreeDirWithoutGit(worktreePath, h, {
          vettedReal: vettedIdentity,
          via: "hook",
        });
      let Zt;
      try {
        Zt = await lstat(worktreePath);
      } catch (error) {
        if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR")
          return removeWorktreeDirWithoutGit(worktreePath, h, {
            vettedReal: vettedIdentity,
            via: "hook",
          });
        return {
          outcome: "failed",
          errorSummary: `cannot stat the worktree path (${getErrnoCode(error) ?? "unknown error"})`,
        };
      }
      if (Zt.isSymbolicLink()) {
        logForDebugging(
          `removeAgentWorktree: refused hook removal of ${worktreePath} \u2014 stored worktree path is a symlink`,
          {
            level: "warn",
          },
        );
        return {
          outcome: "failed",
          errorSummary:
            "the stored worktree path is a symlink \u2014 remove the link itself to clear this session",
        };
      }
      for (let pn of new Set([repoRoot, S].filter((no) => Boolean(no)))) {
        let symlinkInWorktreeAncestry = await findSymlinkInWorktreeAncestry(worktreePath, pn);
        if (symlinkInWorktreeAncestry) {
          logForDebugging(
            `removeAgentWorktree: refused hook removal of ${worktreePath} \u2014 ${symlinkInWorktreeAncestry.kind} at ${symlinkInWorktreeAncestry.component}`,
            {
              level: "warn",
            },
          );
          return {
            outcome: "failed",
            errorSummary:
              symlinkInWorktreeAncestry.kind === "symlink"
                ? "a component of the stored worktree path is a symlink \u2014 remove the worktree at its resolved location (or the link, if the worktree is already gone), then retry"
                : "a component of the stored worktree path could not be verified \u2014 check its permissions, then retry",
          };
        }
      }
      if (!carriesDiscardConsent(h)) {
        let pn = await readdir(worktreePath).catch(() => null);
        if (pn === null)
          return {
            outcome: "failed",
            errorSummary: "unreadable directory",
          };
        if (pn.length > 0) {
          logForDebugging(
            `removeAgentWorktree: kept hook worktree ${worktreePath} \u2014 ${pn.length} unverifiable file(s); only an explicit discard may dispatch the remove hook`,
            {
              level: "warn",
            },
          );
          logEvent("tengu_worktree_removed", {
            source: fromEnum(h),
            changed_files: 0,
            commits: 0,
            hook_based: true,
            aborted: 1,
          });
          return {
            outcome: "failed",
            errorSummary: UNCHECKED_FILES_SUMMARY,
            needsForce: true,
          };
        }
      }
      let rn;
      try {
        rn = await realpath(worktreePath);
      } catch (error) {
        if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR")
          return removeWorktreeDirWithoutGit(worktreePath, h, {
            vettedReal: vettedIdentity,
            via: "hook",
          });
        return {
          outcome: "failed",
          errorSummary: `cannot resolve the worktree path (${getErrnoCode(error) ?? "unknown error"})`,
        };
      }
      if (rn !== vettedIdentity) {
        logForDebugging(
          `removeAgentWorktree: refused hook removal of ${worktreePath} \u2014 ${IDENTITY_CHANGED_SUMMARY}`,
          {
            level: "warn",
          },
        );
        return {
          outcome: "failed",
          errorSummary: IDENTITY_CHANGED_SUMMARY,
        };
      }
      if (isNetworkOrOutsidePath(rn, cwd))
        return removeWorktreeDirWithoutGit(worktreePath, h, {
          vettedReal: vettedIdentity,
          via: "hook",
        });
      gt = vettedIdentity;
    }
    let At = await executeWorktreeRemoveHook(
      {
        id: getSessionId(),
        project: {
          originalCwd: getOriginalCwd(),
          projectRoot: getProjectRoot(),
        },
      },
      gt,
      {
        storageV5: w,
        credentials: L,
      },
    );
    if (At.kind === "removed") {
      logEvent("tengu_worktree_removed", {
        source: fromEnum(h),
        changed_files: 0,
        commits: 0,
        hook_based: true,
      });
      logForDebugging(`Removed hook-based agent worktree at: ${worktreePath}`);
      return {
        outcome: "removed",
      };
    }
    let It =
      At.kind === "failed"
        ? `the WorktreeRemove hook ${At.summary}`
        : "no WorktreeRemove hook is enabled here (hooks are disabled, or the repo defines only WorktreeCreate)";
    if (h === "job_delete_force_remove" && vettedIdentity !== undefined) {
      logForDebugging(`removeAgentWorktree: ${It} \u2014 removing ${worktreePath} by force`, {
        level: "warn",
      });
      return forceRemoveAgentWorktree(worktreePath, vettedIdentity, repoRoot, {
        via: "hook",
        source: h,
        keptBranch: worktreeBranch,
      });
    }
    logForDebugging(`removeAgentWorktree: kept hook-based worktree ${worktreePath} \u2014 ${It}`, {
      level: "warn",
    });
    return {
      outcome: "failed",
      errorSummary: It,
      forceRemovable: At.kind === "failed" ? "hook_failed" : "hook_not_enabled",
    };
  }
  if (!repoRoot)
    return removeWorktreeDirWithoutGit(worktreePath, h, {
      vettedReal: vettedIdentity,
    });
  await unlockAgentWorktree(worktreePath, repoRoot);
  let filterNeutralizingArgs = await getFilterNeutralizingArgs(worktreePath);
  let Se = filterNeutralizingArgs
    ? await execFileNoThrowWithCwd(
        gitExe(),
        [...filterNeutralizingArgs, ...GIT_SAFE_GLOBAL_ARGS, ...SAFE_GIT_ENV_CONSTANTS],
        {
          cwd: worktreePath,
          env: buildGitEnvForRepo(worktreePath, undefined, {
            userLocale: true,
          }),
        },
      )
    : null;
  let ke = Se?.code !== 0 && !(await isGitDirMissing(worktreePath));
  let we =
    Se?.code === 0 && Se.stdout.trim()
      ? countCharInString(
          Se.stdout.trim(),
          `
`,
        ) + 1
      : 0;
  if (Se?.code === 0) {
    let gt = submoduleChanges(await inspectSubmodules(worktreePath));
    if (gt !== undefined) we += gt.kind === "changes" ? gt.paths.length : 1;
  }
  if (ke && (await isNestedInOtherRepo(worktreePath))) ke = false;
  if ((we > 0 || ke) && h !== "exit_tool" && h !== "exit_dialog" && !carriesDiscardConsent(h)) {
    let gt = ke
      ? "could not verify the worktree is clean (git status failed or repository git config unpinnable)"
      : `${we} changed file(s) would be lost`;
    logForDebugging(`removeAgentWorktree: aborted ${h} removal \u2014 ${gt}, kept ${worktreePath}`, {
      level: "warn",
    });
    logEvent("tengu_worktree_removed", {
      source: fromEnum(h),
      changed_files: we,
      commits: 0,
      aborted: 1,
    });
    return {
      outcome: "failed",
      errorSummary: gt,
    };
  }
  let Ae = false;
  if (vettedIdentity !== undefined) {
    let gt = await realpath(worktreePath).catch((error) =>
      isENOENT(error) || getErrnoCode(error) === "ENOTDIR" ? null : undefined,
    );
    if (gt === null) Ae = true;
    else if (gt === undefined || gt !== vettedIdentity)
      return {
        outcome: "failed",
        errorSummary: IDENTITY_CHANGED_SUMMARY,
      };
  }
  if (!Ae && !(await clearReparsePoints(worktreePath))) {
    logForDebugging(
      `removeAgentWorktree: aborted ${h} removal \u2014 unremovable reparse point in ${worktreePath}`,
      {
        level: "warn",
      },
    );
    return {
      outcome: "failed",
      errorSummary: UNREMOVABLE_REPARSE_SUMMARY,
    };
  }
  let Ie = null;
  if (worktreeBranch) {
    let gt = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "symbolic-ref", "--short", "-q", "HEAD"],
      {
        cwd: worktreePath,
        env: buildGitEnvForRepo(worktreePath),
      },
    );
    Ie = gt.code === 0 ? gt.stdout.trim() : null;
  }
  let Me = h === "job_delete_force_remove" && vettedIdentity !== undefined;
  let We = vettedIdentity !== undefined ? await lstat(vettedIdentity).catch(() => null) : null;
  let ze = We !== null && vettedIdentity !== undefined ? await resolveGitDir_2(vettedIdentity) : null;
  let lt = await pruneWorktreeRegistrations(repoRoot, worktreePath, {
    forceTwice: Me,
    pinRepository: true,
    deregisterIfStopped: true,
  });
  let Je = lt.outcome === "removed" ? 0 : 1;
  let nt = lt.outcome === "failed" ? lt.stderr : lt.outcome === "removed" ? "" : lt.reason;
  let checkout = lt.outcome === "failed" ? lt.checkout : undefined;
  let Et =
    lt.outcome === "unregistered" ||
    checkout === "not_pointing_back" ||
    (checkout === undefined &&
      (lt.outcome === "failed" || lt.outcome === "unlisted") &&
      WORKTREE_GONE_RE.test(nt));
  let yt = false;
  if (
    Je !== 0 &&
    (await lstat(worktreePath).then(
      () => true,
      () => false,
    ))
  ) {
    if (lt.outcome === "kept") {
      let qt = await isPathSymlinkClear(worktreePath, repoRoot);
      if (!Me || !qt)
        return {
          outcome: "failed",
          errorSummary: `refused before anything was deleted (${printableLabel(lt.reason, {
            head: 60,
            tail: 120,
          })})${qt ? "" : "; remove it by hand"}`,
          ...(qt && {
            forceRemovable: "git_refused",
          }),
        };
    }
    if (ze !== null && We !== null && vettedIdentity !== undefined)
      await restoreWorktreeGitPointer(vettedIdentity, ze, We);
    let gt = {
      via: "git",
      source: h,
      changedFiles: we,
      keptBranch: Ie ?? worktreeBranch,
    };
    if (Me) {
      logForDebugging(
        `removeAgentWorktree: the removal refused or the registration vet kept ${worktreePath} (${nt.trim()}) \u2014 deleting the directory`,
        {
          level: "warn",
        },
      );
      return forceRemoveAgentWorktree(worktreePath, vettedIdentity, repoRoot, gt);
    }
    let At = printableLabel(getFirstLine(nt.trim()).replace(/^(fatal|error|warning):\s*/, ""), {
      head: 40,
      tail: 100,
    });
    let It = vettedIdentity !== undefined && (await worktreeDeregisteredByRemoval(vettedIdentity, repoRoot));
    if (Et) {
      if (It || G) {
        logForDebugging(
          `removeAgentWorktree: git's registration no longer matches ${worktreePath} (${nt.trim()}) \u2014 ${It ? "its own .git still names the dropped registration" : "a forced retry was asked for"}, kept with its record`,
          {
            level: "warn",
          },
        );
        return {
          outcome: "failed",
          errorSummary: It
            ? "git no longer has it registered as a worktree (its own .git still points at that repository, the way a removal that failed partway leaves it), so nothing can check its files any more"
            : checkout === "not_pointing_back"
              ? "its .git file is missing or does not point to git's record of it"
              : `git no longer has it registered as a worktree (${At})`,
          forceRemovable: "git_refused",
        };
      }
      let qt = await deregisterWorktreeEntry(
        repoRoot,
        ze,
        vettedIdentity === undefined ? [worktreePath] : [worktreePath, vettedIdentity],
      );
      await restoreWorktreeConfigExtension(repoRoot);
      logForDebugging(
        qt
          ? `removeAgentWorktree: git's registration no longer matches ${worktreePath} (${nt.trim()}) \u2014 dropped the stale registration, left the directory in place`
          : `removeAgentWorktree: git's registration no longer matches ${worktreePath} (${nt.trim()}) \u2014 no stale registration of it was dropped from ${repoRoot}, left the directory in place`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_worktree_removed", {
        source: fromEnum(h),
        changed_files: we,
        commits: 0,
        left_in_place: 1,
        ...(qt && {
          deregistered_stale: 1,
        }),
      });
      return {
        outcome: "left_in_place",
      };
    }
    if (!It || vettedIdentity === undefined || checkout !== undefined) {
      logForDebugging(`removeAgentWorktree: removal failed, kept ${worktreePath}: ${nt.trim()}`, {
        level: "warn",
      });
      return {
        outcome: "failed",
        errorSummary: `${checkout === undefined ? "git" : "Claude Code"} couldn't remove it${At ? ` (${At})` : ""}`,
        forceRemovable: checkout === "delete_failed" ? "rm_failed" : "git_refused",
      };
    }
    logForDebugging(
      `removeAgentWorktree: git worktree remove deregistered ${worktreePath} but could not delete it (${nt.trim()}) \u2014 deleting what it left`,
      {
        level: "warn",
      },
    );
    let Yt = await forceRemoveAgentWorktree(worktreePath, vettedIdentity, repoRoot, gt);
    if (Yt.outcome !== "removed")
      return Yt.outcome === "failed" && Yt.forceRemovable === "rm_failed"
        ? {
            outcome: "failed",
            errorSummary: `git gave up its registration but couldn't delete the directory (${At}); Claude Code then tried, and ${Yt.errorSummary ?? "could not either"}`,
            forceRemovable: "rm_failed",
          }
        : Yt;
    yt = true;
  }
  if (lt.outcome === "kept" || lt.outcome === "unlisted")
    await pruneWorktreeRegistration(
      repoRoot,
      vettedIdentity === undefined ? worktreePath : [worktreePath, vettedIdentity],
      {
        locked: Me ? "drop" : "keep",
      },
    );
  logForDebugging(`Removed agent worktree at: ${worktreePath}`);
  if (!yt) {
    await restoreWorktreeConfigExtension(repoRoot);
    logEvent("tengu_worktree_removed", {
      source: fromEnum(h),
      changed_files: we,
      commits: 0,
    });
  }
  if (!worktreeBranch)
    return {
      outcome: "removed",
    };
  if (Ie !== worktreeBranch) {
    logForDebugging(
      `removeAgentWorktree: kept branch ${worktreeBranch} \u2014 not the checked-out branch (${Ie ?? "detached or dir gone"}), so no safety check ever verified it`,
    );
    return {
      outcome: "removed",
    };
  }
  await deleteWorktreeBranch(repoRoot, worktreeBranch, {
    errorLabel: "Could not delete agent worktree branch",
  });
  return {
    outcome: "removed",
  };
}
//@ chunk-e6aww6q8.js:3670830-3670904 layout
var CLAUDE = "claude";
var ENABLEDWORKTREECONFIGEXTENSION = "enabledWorktreeConfigExtension";
var CLAUDE_WORKTREE_CONFIG_KEY = `${CLAUDE}.${ENABLEDWORKTREECONFIGEXTENSION}`;
//@ chunk-e6aww6q8.js:3670904-3671717 layout
/**
 * 删除最后一个 linked worktree 后，若 extensions.worktreeConfig 是 Claude Code 开启的且 config.worktree 为空，则 unset 该扩展与配套键。
 */
async function restoreWorktreeConfigExtension(e) {
  try {
    let gitDir = await resolveGitDir(e);
    let r = gitDir ? ((await getCommonDir(gitDir)) ?? gitDir) : null;
    if (!r || (await readGitConfigValueAsync(r, CLAUDE, null, ENABLEDWORKTREECONFIGEXTENSION)) === null)
      return;
    try {
      if ((await lstat(join(r, "config.worktree"))).size > 0) return;
    } catch (error) {
      if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR") return;
    }
    let s = 0;
    for (let y of await listRegisteredWorktrees(e)) {
      if (isNetworkOrUnsafePath(y.worktreePath)) {
        s++;
        continue;
      }
      if (
        (await lstat(y.worktreePath).then(
          () => false,
          (error) => isENOENT(error) || getErrnoCode(error) === "ENOTDIR",
        )) &&
        (await mayReleaseWorktreeLock(y.lockReason))
      )
        continue;
      s++;
    }
    if (s > 1) return;
    let h = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "config", "--local", "--unset-all", "extensions.worktreeConfig"],
      {
        cwd: e,
        env: buildGitEnvForRepo(e),
      },
    );
    if (h.exitCode !== 0 && h.exitCode !== 5) return;
    await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "config", "--local", "--unset-all", CLAUDE_WORKTREE_CONFIG_KEY],
      {
        cwd: e,
        env: buildGitEnvForRepo(e),
      },
    );
    logForDebugging(`Restored extensions.worktreeConfig in ${e} after removing its last linked worktree`);
  } catch (error) {
    logForDebugging(`Could not restore extensions.worktreeConfig for ${e}: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-e6aww6q8.js:3671717-3672191 layout
/**
 * 当前分支上游已 gone 且相对 n 没有独有（cherry-pick 后）提交时返回 true。
 */
async function isUpstreamGoneAndMerged(e, n) {
  let r = await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "symbolic-ref", "-q", "HEAD"], {
    cwd: e,
    env: buildGitEnvForRepo(e),
  });
  let trimmed = r.stdout.trim();
  if (r.code !== 0 || !trimmed) return false;
  let h = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "for-each-ref", "--format=%(upstream:track,nobracket)", trimmed],
    {
      cwd: e,
      env: buildGitEnvForRepo(e),
    },
  );
  if (h.code !== 0 || h.stdout.trim() !== "gone") return false;
  let y = await execFileNoThrowWithCwd(
    gitExe(),
    [
      ...GIT_SAFE_GLOBAL_ARGS,
      "rev-list",
      "--cherry-pick",
      "--right-only",
      "--no-merges",
      "--max-count=1",
      `${n}...HEAD`,
    ],
    {
      cwd: e,
      env: buildGitEnvForRepo(e),
    },
  );
  return y.code === 0 && y.stdout.trim().length === 0;
}
//@ chunk-e6aww6q8.js:3672191-3672521 facade-exports = findRemoteBase (0.434)
/**
 * 找远程基准分支：origin/HEAD 指向，否则 origin/main、origin/master。
 */
async function getDefaultRemoteRef(e) {
  let n = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "symbolic-ref", "-q", "--short", "refs/remotes/origin/HEAD"],
    {
      cwd: e,
      env: buildGitEnvForRepo(e),
    },
  );
  if (n.code === 0 && n.stdout.trim()) return n.stdout.trim();
  for (let r of ["origin/main", "origin/master"])
    if (
      (
        await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--verify", "-q", r], {
          cwd: e,
          env: buildGitEnvForRepo(e),
        })
      ).code === 0
    )
      return r;
  return null;
}
//@ chunk-e6aww6q8.js:3672521-3673044 facade-exports = cleanupStaleAgentWorktrees (0.477)
/**
 * 清理超过截止时间、无改动、锁持有进程已退出的代理 worktree。
 */
async function passesCommitSafetyChecks(e, n, { primaryCheckoutVouches }) {
  let s = [...GIT_SAFE_GLOBAL_ARGS, "rev-list", "--max-count=1", "HEAD", "--not", "--remotes"];
  let h = await execFileNoThrowWithCwd(gitExe(), s, {
    cwd: e,
    env: buildGitEnvForRepo(e),
  });
  if (h.code !== 0) return false;
  if (h.stdout.trim().length === 0) return true;
  if (primaryCheckoutVouches) {
    let upstreamBranchRef = await getUpstreamBranchRef(e, n);
    if (upstreamBranchRef) {
      let G = await execFileNoThrowWithCwd(gitExe(), [...s, upstreamBranchRef, "--"], {
        cwd: e,
        env: buildGitEnvForRepo(e),
      });
      if (G.code === 0 && !G.stdout.trim()) return true;
    }
  }
  let [y, worktreeBaseline] = await Promise.all([
    execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "HEAD"], {
      cwd: e,
      env: buildGitEnvForRepo(e),
    }),
    readWorktreeBaseline(e),
  ]);
  if (y.code === 0 && worktreeBaseline !== null && y.stdout.trim() === worktreeBaseline) return true;
  return n !== null && (await isUpstreamGoneAndMerged(e, n));
}
//@ chunk-e6aww6q8.js:3673044-3673758 layout
async function getUpstreamBranchRef(e, n) {
  if (!n?.startsWith("origin/")) return null;
  let r = `refs/heads/${n.slice(7)}`;
  let s = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--git-dir", "--git-common-dir", "--symbolic-full-name", "HEAD"],
    {
      cwd: e,
      env: buildGitEnvForRepo(e),
    },
  );
  let lines = s.stdout.trim().split(`
`);
  let [y, S, w] = lines;
  if (
    s.code !== 0 ||
    lines.length !== 3 ||
    !y ||
    !S ||
    !w ||
    lines.some((line) => line.startsWith("-")) ||
    (w !== "HEAD" && !w.startsWith("refs/heads/")) ||
    resolve_2(e, y) === resolve_2(e, S)
  )
    return null;
  let [L, G] = await Promise.all([
    execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "config", "--bool", "--get", "core.bare"], {
      cwd: e,
      env: buildGitEnvForRepo(e),
    }),
    execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--verify", "-q", "--symbolic-full-name", "main-worktree/HEAD"],
      {
        cwd: e,
        env: buildGitEnvForRepo(e),
      },
    ),
  ]);
  let trimmed = G.stdout.trim();
  if (L.code !== 0 || L.stdout.trim() !== "false" || G.code !== 0 || trimmed !== r || trimmed === w)
    return null;
  return trimmed;
}
//@ chunk-e6aww6q8.js:3673758-3674063 layout
async function cleanupStaleAgentWorktreesIfClean(e, defaultRemoteRef) {
  let filterNeutralizingArgs = await getFilterNeutralizingArgs(e);
  if (filterNeutralizingArgs === null) return false;
  let s = await execFileNoThrowWithCwd(
    gitExe(),
    [...filterNeutralizingArgs, ...GIT_SAFE_GLOBAL_ARGS, ...SAFE_GIT_ENV_CONSTANTS],
    {
      cwd: e,
      env: buildGitEnvForRepo(e, undefined, {
        userLocale: true,
      }),
    },
  );
  if (s.code !== 0 || s.stdout.trim().length > 0) return false;
  let h = await inspectSubmodules(e);
  if (h.kind !== "verified" || submoduleChanges(h) !== undefined) return false;
  return passesCommitSafetyChecks(e, defaultRemoteRef, {
    primaryCheckoutVouches: false,
  });
}
//@ chunk-e6aww6q8.js:3674063-3674934 facade-exports
async function cleanupStaleAgentWorktrees(cutoffDate, n, keepsWorktreesInside = false) {
  let canonicalGitRoot = findCanonicalGitRoot(preferRemoteValue(getCwd(), getOriginalCwd()));
  if (!canonicalGitRoot) return 0;
  await releaseStaleClaudeWorktreeLocks(canonicalGitRoot);
  let dir = getClaudeWorktreesDir(canonicalGitRoot);
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    await restoreWorktreeConfigExtension(canonicalGitRoot);
    return 0;
  }
  let cutoffMs = cutoffDate.getTime();
  let currentPath = getCurrentWorktreeSession()?.worktreePath;
  let defaultRemoteRef = await getDefaultRemoteRef(canonicalGitRoot);
  let removed = 0;
  for (let entry of entries) {
    if (!isEphemeralWorktreeSlug(entry)) continue;
    let Z = join(dir, entry);
    if (currentPath === Z) continue;
    let mtimeMs;
    try {
      mtimeMs = (await stat(Z)).mtimeMs;
    } catch {
      continue;
    }
    if (mtimeMs >= cutoffMs) continue;
    if (!(await cleanupStaleAgentWorktreesIfClean(Z, defaultRemoteRef))) continue;
    try {
      if (!(await mayReleaseWorktreeLock(await readWorktreeLockReason(Z, canonicalGitRoot)))) {
        logForDebugging(
          `cleanupStaleAgentWorktrees: kept ${Z} \u2014 locked by a live Claude Code process, or with a reason we did not write`,
        );
        continue;
      }
    } catch (error) {
      logForDebugging(
        `cleanupStaleAgentWorktrees: kept ${Z} \u2014 cannot read the worktree registry to verify lock ownership (${errorMessage(error)})`,
      );
      continue;
    }
    if (
      (
        await removeAgentWorktree(
          Z,
          worktreeBranchName(entry),
          canonicalGitRoot,
          false,
          "stale_cleanup",
          undefined,
          undefined,
          {
            keepsWorktreesInside,
          },
        )
      ).outcome !== "failed"
    )
      removed++;
  }
  if (removed > 0) logForDebugging(`cleanupStaleAgentWorktrees: removed ${removed} stale worktree(s)`);
  await restoreWorktreeConfigExtension(canonicalGitRoot);
  return removed;
}
//@ chunk-e6aww6q8.js:3674934-3675966 facade-exports
async function reapJobWorktreeIfSafe(e) {
  let { worktreePath, worktreeBranch, originCwd, hookBased, cutoff } = e;
  if (hookBased) return false;
  let worktreeCleanupRoot = resolveWorktreeCleanupRoot(worktreePath, originCwd);
  if (!worktreeCleanupRoot || !isAgentWorktreeOf(worktreePath, worktreeCleanupRoot)) return false;
  let w;
  try {
    w = (await stat(worktreePath)).mtimeMs;
  } catch {
    return false;
  }
  let L = w >= cutoff.getTime();
  if (L) return false;
  if ((await readWorktreeBaseline(worktreePath)) === null) {
    logForDebugging(
      `reapJobWorktreeIfSafe: kept ${worktreePath} \u2014 no Claude Code creation marker (${CLAUDE_BASE_ENV}) in its git admin dir, so Claude Code did not create it; not ours to remove`,
      {
        level: "warn",
      },
    );
    return false;
  }
  let G = await realpath(worktreePath).catch(() => worktreePath);
  let worktreePath_2 = getCurrentWorktreeSession()?.worktreePath;
  if (worktreePath_2 && G === (await realpath(worktreePath_2).catch(() => worktreePath_2))) return false;
  let Z = await listRegisteredWorktrees(worktreeCleanupRoot).catch(() => null);
  let Se;
  for (let ke of Z ?? [])
    if (G === (await realpath(ke.worktreePath).catch(() => ke.worktreePath))) {
      Se = ke;
      break;
    }
  if (!(await mayReleaseWorktreeLock(Se?.lockReason))) {
    logForDebugging(
      `reapJobWorktreeIfSafe: kept ${worktreePath} \u2014 locked by a live Claude Code process, or with a reason we did not write (${Se?.lockReason})`,
    );
    return false;
  }
  if (L) return false;
  if (
    !(await cleanupStaleAgentWorktreesIfClean(worktreePath, await getDefaultRemoteRef(worktreeCleanupRoot)))
  )
    return false;
  return (
    (
      await removeAgentWorktree(
        worktreePath,
        worktreeBranch,
        worktreeCleanupRoot,
        false,
        "job_retention_sweep",
        undefined,
        undefined,
        {
          keepsWorktreesInside: e.keepsWorktreesInside === true,
        },
      )
    ).outcome !== "failed"
  );
}
//@ chunk-e6aww6q8.js:3675966-3675977 layout
var MAX_STALE_WORKTREE_SWEEP = 50;
//@ chunk-e6aww6q8.js:3675977-3676087 layout
function isClaudeLockFromRunningPid(lockReason) {
  if (lockReason === undefined || lockReason.length > 512) return false;
  let match = lockReason.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN);
  if (!match) return false;
  return isProcessProvablyGone(Number(match[1]));
}
//@ chunk-e6aww6q8.js:3676087-3677257 layout
/**
 * releaseStaleClaudeWorktreeLocks：读 worktree 注册表，解除持有进程已不存在的 Claude 锁（不碰当前会话的 worktree）。
 */
async function releaseStaleClaudeWorktreeLocks(canonicalGitRoot) {
  let n = await listRegisteredWorktrees(canonicalGitRoot).catch((error) => {
    logForDebugging(
      `releaseStaleClaudeWorktreeLocks: skipped \u2014 cannot read the worktree registry for ${canonicalGitRoot} (${errorMessage(error)})`,
    );
    return [];
  });
  let worktreePath = getCurrentWorktreeSession()?.worktreePath;
  let s =
    worktreePath === undefined
      ? undefined
      : foldCaseBasic(resolve_2(await realpath(worktreePath).catch(() => worktreePath)));
  let h = 0;
  for (let y of n) {
    if (s !== undefined && foldCaseBasic(resolve_2(y.worktreePath)) === s) continue;
    if (isNetworkOrUnsafePath(y.worktreePath)) continue;
    if (!isClaudeLockFromRunningPid(y.lockReason)) continue;
    if (
      !(await lstat(join(y.worktreePath, ".git")).then(
        () => true,
        () => false,
      ))
    )
      continue;
    if (h >= MAX_STALE_WORKTREE_SWEEP) {
      logForDebugging(
        `releaseStaleClaudeWorktreeLocks: per-sweep cap of ${MAX_STALE_WORKTREE_SWEEP} reached for ${canonicalGitRoot}; remaining stale locks will be reconciled on later sweeps`,
      );
      break;
    }
    let w;
    try {
      w = await realpath(y.worktreePath);
    } catch {
      continue;
    }
    if (isNetworkOrUnsafePath(w)) continue;
    if (s !== undefined && foldCaseBasic(resolve_2(w)) === s) continue;
    let found = (
      await listRegisteredWorktrees(canonicalGitRoot).catch((error) => {
        logForDebugging(
          `releaseStaleClaudeWorktreeLocks: kept ${y.worktreePath} \u2014 cannot re-read the worktree registry at release time (${errorMessage(error)})`,
        );
        return [];
      })
    ).find((q) => q.worktreePath === y.worktreePath);
    if (!isClaudeLockFromRunningPid(found?.lockReason) || !(await mayReleaseWorktreeLock(found?.lockReason)))
      continue;
    await unlockAgentWorktree(y.worktreePath, canonicalGitRoot);
    h++;
  }
  if (h > 0) {
    logForDebugging(
      `releaseStaleClaudeWorktreeLocks: attempted release of ${h} stale liveness lock(s) in ${canonicalGitRoot}`,
    );
    logEvent("tengu_worktree_stale_lock_released", {
      attempted: h,
    });
  }
  return h;
}
//@ chunk-e6aww6q8.js:3677257-3677338 facade-exports
async function hasWorktreeChanges(worktreePath, headCommit) {
  let { dirty, commitsAhead } = await getAgentWorktreeChanges(worktreePath, headCommit);
  return dirty || commitsAhead > 0;
}
//@ chunk-e6aww6q8.js:3677338-3678494 layout
/**
 * 切换到 worktree 重新启动时，把 --settings/--mcp-config/--add-dir/--plugin-dir 等参数中的相对路径改写为基于原 cwd 的绝对路径。
 */
function rewriteCliPathArgsForWorktree(e, n = (r) => resolve_2(r)) {
  let r = new Map([
    [
      "--settings",
      {
        json: true,
      },
    ],
    [
      "--mcp-config",
      {
        json: true,
      },
    ],
    [
      "--agents",
      {
        json: true,
      },
    ],
    [
      "--add-dir",
      {
        tilde: true,
      },
    ],
    ["--plugin-dir", {}],
    ["--plugin-dir-no-mcp", {}],
    ["--system-prompt-file", {}],
    ["--append-system-prompt-file", {}],
    ["--append-subagent-system-prompt-file", {}],
    ["--debug-file", {}],
  ]);
  let s = new Set(["--setting-sources", "--managed-settings"]);
  let h = [];
  for (let idx = 0; idx < e.length; idx++) {
    let S = e[idx];
    if (S === undefined) continue;
    if (S === "--") {
      h.push(...e.slice(idx));
      break;
    }
    if (S === "--tmux" || S === "--tmux=classic") continue;
    if (S === "-w" || S === "--worktree") {
      let ke = e[idx + 1];
      if (ke !== undefined && !ke.startsWith("-")) idx++;
      continue;
    }
    if (S.startsWith("--worktree=")) continue;
    let index = S.indexOf("=");
    let L = index === -1 ? S : S.slice(0, index);
    let G = r.get(L);
    let q = VARIADIC_VALUE_FLAGS.has(L);
    if (G === undefined && !q && !s.has(L)) {
      let min = Math.min(lastValueSlot(e, idx), e.length - 1);
      h.push(...e.slice(idx, min + 1));
      idx = min;
      continue;
    }
    let Z = (ke) =>
      `${L}=${G !== undefined && ke !== "" && !(G.json && ke.trimStart().startsWith("{")) && !(G.tilde && isHomeRelativePath(ke)) ? n(ke) : ke}`;
    if (index !== -1) {
      h.push(Z(S.slice(index + 1)));
      continue;
    }
    let Se = e[idx + 1];
    if (Se === undefined || looksLikeOption(Se)) {
      h.push(S);
      continue;
    }
    h.push(Z(Se));
    idx++;
    while (q) {
      let ke = e[idx + 1];
      if (ke === undefined || looksLikeOption(ke)) break;
      h.push(Z(ke));
      idx++;
    }
  }
  return h;
}
//@ chunk-e6aww6q8.js:3678494-3683997 facade-exports = execIntoTmuxWorktree (0.795)
/**
 * --tmux 模式：创建/附着 tmux 会话并在 worktree 中重新执行 claude。
 */
async function execIntoTmuxWorktree(args, storageV5, credentials) {
  if (!checkHasTrustDialogAccepted())
    return {
      handled: false,
      error:
        "Workspace trust not yet accepted. Run `claude` once in this directory and accept the trust dialog, then retry with --worktree.",
    };
  installRepoDetectionGuards();
  let env_2 = getIsolatedGitExecOptions().env;
  let h = (Zt, rn = {}) =>
    execFileNoThrowWithCwd("tmux", Zt, {
      ...rn,
      env: env_2,
      extendEnv: false,
    });
  let y = await h(["-V"]);
  if (y.code !== 0)
    return {
      handled: false,
      error: "Error: tmux is not installed. Install tmux with: sudo apt install tmux",
    };
  let worktreeName;
  let forceClassicTmux = false;
  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    if (!arg) continue;
    if (arg === "--") break;
    if (arg === "-w" || arg === "--worktree") {
      let next = args[i + 1];
      if (next && !next.startsWith("-")) worktreeName = next;
    } else if (arg.startsWith("--worktree=")) worktreeName = arg.slice(11);
    else if (arg === "--tmux=classic") forceClassicTmux = true;
    i = lastValueSlot(args, i);
  }
  let prNumber = null;
  if (worktreeName) {
    prNumber = parsePRReference(worktreeName);
    if (prNumber !== null) worktreeName = `pr-${prNumber.number}`;
  }
  if (!worktreeName) {
    let adjectives = ["swift", "bright", "calm", "keen", "bold"];
    let nouns = ["fox", "owl", "elm", "oak", "ray"];
    let adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    let noun = nouns[Math.floor(Math.random() * nouns.length)];
    let suffix = Math.random().toString(36).slice(2, 6);
    worktreeName = `${adj}-${noun}-${suffix}`;
  }
  try {
    validateWorktreeSlug(worktreeName);
  } catch (e) {
    return {
      handled: false,
      error: `Error: ${errorMessage(e)}`,
    };
  }
  let worktreeDir;
  let q;
  let Z;
  try {
    Z = dispatchesWorktreeCreate()
      ? await executeWorktreeCreateHook(
          {
            id: getSessionId(),
            project: {
              originalCwd: getOriginalCwd(),
              projectRoot: getProjectRoot(),
            },
          },
          worktreeName,
          {
            storageV5,
            credentials,
          },
        )
      : undefined;
  } catch (error) {
    return {
      handled: false,
      error: `Error: ${errorMessage(error)}`,
    };
  }
  if (Z) {
    try {
      if (hasDotSegment(Z.worktreePath))
        throw new WorktreeIsolationError(
          `the WorktreeCreate hook emitted a path with dot segments (${Z.worktreePath}) \u2014 the symlink screen cannot ` +
            "verify a dotted spelling; have the hook emit a normalized (dot-free) absolute path",
        );
      let cwd = getCwd();
      for (let rn of new Set([findCanonicalGitRoot(cwd), findGitRoot(cwd)].filter((pn) => Boolean(pn)))) {
        let symlinkInWorktreeAncestry = await findSymlinkInWorktreeAncestry(Z.worktreePath, rn);
        if (symlinkInWorktreeAncestry)
          throw new WorktreeIsolationError(
            `the WorktreeCreate hook's worktree path component ${symlinkInWorktreeAncestry.component} ` +
              (symlinkInWorktreeAncestry.kind === "symlink" ? "is a symlink" : "could not be verified") +
              " \u2014 a repository-committed symlink below the checkout root " +
              "could redirect the worktree outside the repository",
          );
      }
      worktreeDir = Z.worktreePath;
    } catch (error) {
      return {
        handled: false,
        error: `Error: ${errorMessage(error)}`,
      };
    }
    q = basename(findCanonicalGitRoot(getCwd()) ?? getCwd());
    console.log(`Using worktree via hook: ${worktreeDir}`);
  } else {
    let cwd = getCwd();
    let repoRoot = findCanonicalGitRoot(cwd);
    if (!repoRoot)
      return {
        handled: false,
        error: "Error: --worktree requires a git repository",
      };
    q = basename(repoRoot);
    try {
      let result = await getOrCreateWorktree(
        repoRoot,
        worktreesDirSpecs(repoRoot),
        worktreeName,
        prNumber !== null
          ? {
              prNumber: prNumber.number,
              prForge: prNumber.forge,
              fromCwd: cwd,
            }
          : {
              fromCwd: cwd,
            },
      );
      worktreeDir = result.worktreePath;
      if (!result.existed) {
        console.log(
          `Created worktree: ${worktreeDir} (based on ${prNumber !== null || result.baseBranch.endsWith("^{commit}") ? result.headCommit : result.baseBranch})`,
        );
        await performPostCreationSetup(repoRoot, worktreeDir);
      }
    } catch (error) {
      return {
        handled: false,
        error: `Error: ${errorMessage(error)}`,
      };
    }
  }
  let tmuxSessionName = `${q}_${worktreeBranchName(worktreeName)}`.replace(/[/.]/g, "_");
  let ke = isPersonalConfigRestricted()
    ? ["env", "CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG=1", process.execPath]
    : [process.execPath];
  let we = [...(isRestrictedMode() ? ["--restricted"] : []), ...[], ...rewriteCliPathArgsForWorktree(args)];
  let tmuxPrefix = "C-b";
  let prefixResult = await h(["show-options", "-g", "prefix"]);
  if (prefixResult.code === 0 && prefixResult.stdout) {
    let match = prefixResult.stdout.match(/prefix\s+(\S+)/);
    if (match?.[1]) tmuxPrefix = match[1];
  }
  let prefixConflicts = ["C-b", "C-c", "C-d", "C-t", "C-o", "C-r", "C-s", "C-g", "C-e"].includes(tmuxPrefix);
  let We = {
    CLAUDE_CODE_TMUX_SESSION: tmuxSessionName,
    CLAUDE_CODE_TMUX_PREFIX: tmuxPrefix,
    CLAUDE_CODE_TMUX_PREFIX_CONFLICTS: prefixConflicts ? "1" : "",
    ...(isPersonalConfigRestricted() && {
      CLAUDE_CODE_PERSONAL_CONFIG_FIX: getPersonalConfigFixHint() ?? "",
    }),
  };
  let match = y.stdout.match(/(\d+)\.(\d+)/);
  let lt = match !== null && (Number(match[1]) > 3 || (Number(match[1]) === 3 && Number(match[2]) >= 2));
  let Je = lt
    ? Object.entries(We).flatMap(([key, value]) => [
        "-e",
        `${key}=${value.endsWith(";") ? `${value.slice(0, -1)}\\;` : value}`,
      ])
    : [];
  if (!lt)
    env_2 = {
      ...env_2,
      ...We,
    };
  let nt = {
    stdio: "inherit",
    env: env_2,
    extendEnv: false,
  };
  let sessionExists = (await h(["has-session", "-t", tmuxSessionName])).code === 0;
  let isAlreadyInTmux = Boolean(env.TMUX);
  let useControlMode = isInITerm2() && !forceClassicTmux && !isAlreadyInTmux;
  let tmuxGlobalArgs = useControlMode ? ["-CC"] : [];
  if (useControlMode && !sessionExists) {
    let y = sequential.yellow;
    console.log(`
${y("\u256D\u2500 iTerm2 Tip \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E")}
${y("\u2502")} To open as a tab instead of a new window:                           ${y("\u2502")}
${y("\u2502")} iTerm2 > Settings > General > tmux > "Tabs in attaching window"     ${y("\u2502")}
${y("\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F")}
`);
  }
  let It = null;
  let Yt = It === null ? null : join(worktreeDir, It);
  let qt =
    Yt !== null &&
    (await stat(Yt).then(
      (Zt) => Zt.isDirectory(),
      () => false,
    ))
      ? Yt
      : null;
  if (qt !== null) {
    await h(["new-session", "-d", "-s", tmuxSessionName, ...Je, "-c", qt, "--", ...ke, ...we], {
      cwd: worktreeDir,
      useToolMemoryCgroup: false,
    });
    await h(["split-window", "-h", "-t", tmuxSessionName, "-c", qt], {
      cwd: worktreeDir,
    });
    await h(["send-keys", "-t", tmuxSessionName, "bun run watch", "Enter"], {
      cwd: worktreeDir,
    });
    await h(["split-window", "-v", "-t", tmuxSessionName, "-c", qt], {
      cwd: worktreeDir,
    });
    await h(["send-keys", "-t", tmuxSessionName, "bun run start"], {
      cwd: worktreeDir,
    });
    await h(["select-pane", "-t", `${tmuxSessionName}:0.0`], {
      cwd: worktreeDir,
    });
    if (isAlreadyInTmux)
      await safeExecFile("tmux", ["switch-client", "-t", tmuxSessionName], {
        ...nt,
        cwd: worktreeDir,
        reject: false,
      });
    else
      await safeExecFile("tmux", [...tmuxGlobalArgs, "attach-session", "-t", tmuxSessionName], {
        ...nt,
        cwd: worktreeDir,
        reject: false,
        useToolMemoryCgroup: false,
      });
  } else if (isAlreadyInTmux) {
    if (sessionExists)
      await safeExecFile("tmux", ["switch-client", "-t", tmuxSessionName], {
        ...nt,
        cwd: worktreeDir,
        reject: false,
      });
    else {
      await h(["new-session", "-d", "-s", tmuxSessionName, ...Je, "-c", worktreeDir, "--", ...ke, ...we], {
        cwd: worktreeDir,
        useToolMemoryCgroup: false,
      });
      await safeExecFile("tmux", ["switch-client", "-t", tmuxSessionName], {
        ...nt,
        cwd: worktreeDir,
        reject: false,
      });
    }
  } else {
    let tmuxArgs = [
      ...tmuxGlobalArgs,
      "new-session",
      "-A",
      "-s",
      tmuxSessionName,
      ...Je,
      "-c",
      worktreeDir,
      "--",
      ...ke,
      ...we,
    ];
    await safeExecFile("tmux", tmuxArgs, {
      ...nt,
      cwd: worktreeDir,
      reject: false,
      useToolMemoryCgroup: false,
    });
  }
  return {
    handled: true,
  };
}
//@ chunk-e6aww6q8.js:3683997-3684863 placement
async function getFilterNeutralizingArgsOrRefusal(worktreePath) {
  let filterNeutralizingArgs = await buildFilterNeutralizingArgs(worktreePath);
  if (filterNeutralizingArgs.ok)
    return {
      args: filterNeutralizingArgs.args,
    };
  switch (filterNeutralizingArgs.reason) {
    case "config_unreadable":
      logFeatureBad("git_worktree_create", "git_worktree_create_config_unreadable");
      return {
        refusal: "Could not read the repository git config to neutralize filter drivers",
      };
    case "filter_name_unrepresentable":
      logFeatureBad("git_worktree_create", "git_worktree_create_filter_name_unrepresentable");
      return {
        refusal:
          'The repository git config defines a filter driver whose name cannot be neutralized (contains "=" or a newline)',
      };
    case "conditional_include":
      logFeatureBad("git_worktree_create", "git_worktree_create_conditional_include");
      return {
        refusal:
          "The repository git config has a conditional include (includeIf), so the filter drivers a checkout would load cannot be determined",
      };
    case "unsafe_key":
      logFeatureBad("git_worktree_create", "git_worktree_create_unsafe_key");
      return {
        refusal: `Git was not run: ${describeGitConfigUnreadable(filterNeutralizingArgs)}`,
      };
  }
}
//@ chunk-e6aww6q8.js:3684863-3684926 placement
async function getFilterNeutralizingArgs(e) {
  let filterNeutralizingArgs = await buildFilterNeutralizingArgs(e);
  return filterNeutralizingArgs.ok ? filterNeutralizingArgs.args : null;
}
//@ chunk-e6aww6q8.js:3684926-3685211 placement
async function deregisterWorktreeEntry(e, n, worktreePath) {
  let s = await vetRepoForWorktrees(e);
  let h = (S) => (getPlatform() === "windows" ? S.toLowerCase() : S);
  if (
    s === null ||
    (n !== null && h(stripTrailingSeparators(normalize(dirname(n)))) !== h(join(s, "worktrees")))
  )
    return false;
  return (
    (
      await deregisterWorktree(
        s,
        n === null
          ? {
              worktreePath,
              repoSpelled: e,
            }
          : {
              entryId: basename(n),
              repoSpelled: e,
            },
        {
          locked: "keep",
        },
      )
    ).outcome === "dropped"
  );
}
//@ chunk-e6aww6q8.js:3685211-3685337 placement
async function isGitDirMissing(e) {
  let gitDir = await resolveGitDir_2(e);
  try {
    await (gitDir ? stat(gitDir) : lstat(join(e, ".git")));
    return false;
  } catch (error) {
    return isENOENT(error) || getErrnoCode(error) === "ENOTDIR";
  }
}
//@ chunk-e6aww6q8.js:3685337-3685449 placement
function worktreeRegistrationKeptMessage(worktreeBranch) {
  return `The worktree registration for ${worktreeBranch} was left in place; pass a different --worktree name.`;
}
//@ chunk-aepeg2w5.js:834957-835049 placement
function isOwnedWorktreeSession(currentWorktreeSession) {
  return (
    !currentWorktreeSession.hookBased &&
    (!currentWorktreeSession.enteredExisting || currentWorktreeSession.madeElsewhere === "resumedByName")
  );
}
//@ chunk-aepeg2w5.js:835049-835243 placement
/**
 * 代理隔离证据
 */
class AgentIsolationEvidence {
  spawned = new Set();
  cleanlyRemoved = new Set();
  recordSpawned(e) {
    this.spawned.add(e);
  }
  recordCleanlyRemoved(e) {
    this.cleanlyRemoved.add(e);
  }
  clear() {
    this.spawned.clear();
    this.cleanlyRemoved.clear();
  }
}
//@ chunk-aepeg2w5.js:835243-835866 placement
/**
 * worktree 会话状态
 */
class WorktreeSessionState {
  currentSession = null;
  resumeHintWorktreeName = null;
  hasBeenInWorktree = false;
  bgTakeover = null;
  agentIsolationEvidence = new AgentIsolationEvidence();
  isolationUnavailableCwd = null;
  setCurrentSession(e) {
    this.currentSession = e;
    this.hasBeenInWorktree ||= e !== null;
    if (e && !e.enteredExisting) this.resumeHintWorktreeName = e.worktreeName;
  }
  getResumeHintWorktreeName() {
    if (this.currentSession)
      return this.currentSession.enteredExisting ? null : this.currentSession.worktreeName;
    return this.resumeHintWorktreeName;
  }
  clearResumeHintWorktreeName() {
    this.resumeHintWorktreeName = null;
  }
  setBgTakeover(bgTakeover) {
    this.bgTakeover = bgTakeover;
  }
  markIsolationUnavailable(isolationUnavailableCwd) {
    this.isolationUnavailableCwd = isolationUnavailableCwd;
  }
}
//@ chunk-aepeg2w5.js:835866-835891 placement
var worktreeSessionSlot = new HostScoped(() => new WorktreeSessionState());
//@ chunk-aepeg2w5.js:835891-835919 placement
function getWorktreeSessionState() {
  return onProcessRootHost(worktreeSessionSlot);
}
//@ chunk-aepeg2w5.js:835919-835960 facade-exports
function getCurrentWorktreeSession() {
  return getWorktreeSessionState().currentSession;
}
//@ chunk-aepeg2w5.js:835960-836002 affinity
/**
 * 设置当前 worktree 会话。
 */
function setCurrentWorktreeSession(e) {
  getWorktreeSessionState().setCurrentSession(e);
}
//@ chunk-dcmhvw5a.js:13922-14013 sole-consumer
var AGENT_WORKTREE_SLUG_PATTERNS = [
  /^agent-a[0-9a-f]{16}$/,
  /^agent-a[0-9a-f]{7}$/,
  /^wf_[0-9a-f]{8}-[0-9a-f]{3}-\d+$/,
];
//@ chunk-dcmhvw5a.js:14013-14162 sole-consumer
var EPHEMERAL_WORKTREE_SLUG_PATTERNS = [
  ...AGENT_WORKTREE_SLUG_PATTERNS,
  /^wf-\d+$/,
  /^bridge-[A-Za-z0-9_]+(-[A-Za-z0-9_]+)*$/,
  /^job-[a-zA-Z0-9._-]{1,55}-[0-9a-f]{8}$/,
  /^bg-[a-zA-Z0-9._-]{1,55}-[0-9a-f]{8}$/,
];
//@ chunk-dcmhvw5a.js:14162-14209 sole-consumer
function isEphemeralWorktreeSlug(e) {
  return EPHEMERAL_WORKTREE_SLUG_PATTERNS.some((n) => n.test(e));
}
//@ chunk-dcmhvw5a.js:14209-14242 sole-consumer
var WORKTREE_SLUG_SEGMENT_PATTERN = /^[a-zA-Z0-9._-]+$/;
var MAX_WORKTREE_SLUG_CHARS = 64;
//@ chunk-dcmhvw5a.js:14242-14312 affinity
function suffixWorktreeSlug(e, n) {
  let r = `-${n}`;
  return `${e.slice(0, MAX_WORKTREE_SLUG_CHARS - r.length)}${r}`;
}
//@ chunk-dcmhvw5a.js:14312-14849 fingerprint = validateWorktreeSlug (0.807)
/**
 * 校验 worktree slug：每段只允许字母数字 ._-，总长 ≤64，不能含 . 或 .. 段。
 */
function validateWorktreeSlug_2(slug) {
  if (slug.length > MAX_WORKTREE_SLUG_CHARS)
    return `Invalid worktree name: must be ${MAX_WORKTREE_SLUG_CHARS} characters or fewer (got ${slug.length})`;
  for (let segment of slug.split("/")) {
    if (segment === "." || segment === "..")
      return `Invalid worktree name "${slug}": must not contain "." or ".." path segments`;
    if (segment.toLowerCase().replace(/\.+$/, "") === ".git")
      return `Invalid worktree name "${slug}": "${segment}" is a reserved git directory name`;
    if (!WORKTREE_SLUG_SEGMENT_PATTERN.test(segment))
      return `Invalid worktree name "${slug}": each "/"-separated segment must be non-empty and contain only letters, digits, dots, underscores, and dashes`;
  }
  return;
}
export {
  getCurrentWorktreeSession,
  restoreWorktreeSession,
  createAgentWorktree,
  getAgentWorktreeChanges,
  unlockAgentWorktree,
  removeAgentWorktree,
  runGitInWorktree,
  releaseOwnWorktreeLock,
  refuseUnavailableWorktree,
  throwAgentWorktreeNotGitRefusal,
  hasWorktreeChanges,
  isOwnedWorktreeSession,
  setCurrentWorktreeSession,
  killTmuxSession,
  keepWorktree,
  cleanupWorktree,
  getWorkingCopyWorktreeChanges,
  persistWorktreeSession,
  countCommitsAtStake,
  describeWhereCommitsAre,
  parsePRReference,
  isTmuxAvailable,
  getTmuxInstallInstructions,
  reapJobWorktreeIfSafe,
  cleanupStaleAgentWorktrees,
  getWorktreeSessionState,
  listRepoWorktrees,
  validateWorktreeSlug_2,
  resolveWorktreeCleanupRoot,
  listRegisteredWorktrees,
  repositoryVouchedByWorktree,
  worktreeDeregisteredByRemoval,
  carriesDiscardConsent,
  claudeWorktreeLockPid,
  mayReleaseWorktreeLock,
  passesCommitSafetyChecks,
  getDefaultRemoteRef,
  IDENTITY_CHANGED_SUMMARY,
  isAgentWorktreeOf,
  validateWorktreeSlug,
  isWorktreeMadeElsewhere,
  lockClaudeWorktree,
  worktreeBranchName,
  readWorktreeBaseline,
  readWorktreeLockReason,
  generateTmuxSessionName,
  createWorktreeForSession,
  createTmuxSessionForWorktree,
  resolveManagedWorktreePath,
  WorktreeIsolationError,
  resolveExistingWorktreeTarget,
  enterExistingWorktreeForSession,
  isPathUnderManagedWorktreesDir,
};
