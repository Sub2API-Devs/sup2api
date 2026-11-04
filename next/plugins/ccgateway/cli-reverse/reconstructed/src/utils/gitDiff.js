/**
 * utils/gitDiff.ts
 *
 * 工作区/分支 diff 统计（shortstat/numstat/raw 解析、50 文件上限、未跟踪文件、会话前文件标记、合并/变基中跳过）与单文件 diff
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/gitDiff.ts
 * pieces: chunk-6vnxsn99.js (55), chunk-wyqg6m3h.js (1)
 * attribution: fingerprint 11, layout 38, placement 7
 */
import { lstat, access, realpath, readFile } from "fs/promises";
import { join, isAbsolute, win32, dirname, relative, sep, basename } from "path";
import {
  PLAIN_PATCH_FLAGS,
  gitExe,
  RAW_BLOB_DIFF_FLAGS,
  findGitRootRecheckingNegative,
  findGitRoot,
  getGitDir,
  getBranch,
  getDefaultBranch,
} from "./git.js";
import { IGNORE_SUBMODULES_DIRTY_FLAG } from "./git/gitSafeEnv.js";
import { getSessionStartTime, getOriginalCwd } from "../bootstrap/state.js";
import { execFileNoThrow, execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { readWorkTreeDiffViaIndex, ISOLATED_GIT_CONFIG_ENV } from "./git/gitIndexReader.js";
import { hasRunnerDeclaredNestedRepoDiff, isBridgeEnvironment } from "./remoteEnvironment.js";
import { gitReadInOwnWorkTree, GIT_FILES_REF_BACKEND_ENV } from "./git/gitLanes.js";
import { getFsImplementation } from "./fsOperations.js";
import { resolveGitDirs, NOT_A_GIT_REPO_PATH } from "./git/gitDirResolution.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import { subprocessEnv } from "./subprocessEnv.js";
import {
  buildGitConfigEnv,
  getGitSafetyConfigPairs,
  CLAUDE_CODE_FOUND_REPOSITORY_GIT,
  GitStartFolderError,
} from "./gitSafeExec.js";
import { getGitRepoCache } from "./git/gitRepoCache.js";
import { countCharInString } from "./stringUtils.js";
import { hasUnsafePathGlyphsOrSurrogate } from "./unsafePathGlyphs.js";
import { stripTrailingDotsSpaces } from "./ignorePatterns.js";
import { INVISIBLE_CHAR_CLASS_SOURCE } from "./sanitization.js";
import { findExistingRefs, SEQUENCER_STATE_FILES } from "./git/gitConfigFilters.js";
import { logForDebugging } from "./debug.js";
import { HostScoped } from "./hostScoped.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { env } from "./env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import {
  getRepoCheckouts,
  resolveCheckoutPath,
  checkoutNameForPath,
  getRepoBaseRefs,
} from "./git/repoCheckouts.js";
import { getCachedRepository } from "./detectRepository.js";
import { isFileWithinSizeBound } from "./file.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-6vnxsn99.js:44679-44798 fingerprint (2.1.88 match: fetchGitDiffHunks, 0.599)
/**
 * git diff 的固定参数与限制常量：单次超时 5000ms、按文件统计上限 50 个、超过 500 个文件只给总计、单文件 1MB 等。
 */
var GIT_DIFF_BASE_ARGS; // deferred: uses RAW_BLOB_DIFF_FLAGS (./git.js) of its import cycle while loading; runs once the cycle is complete
var GIT_DIFF_TIMEOUT_MS;
var MAX_DIFF_FILES;
var MAX_TOTAL_FILES_FOR_PER_FILE_STATS;
var MAX_SINGLE_FILE_DIFF_BYTES;
var MAX_HUNK_LINE_COUNT;
var MAX_FILES_FOR_STATS;
deferInit("chunk-6vnxsn99.js:44679", () => {
  GIT_DIFF_BASE_ARGS = [
    "--no-optional-locks",
    "-c",
    "diff.relative=false",
    "diff",
    ...PLAIN_PATCH_FLAGS,
    IGNORE_SUBMODULES_DIRTY_FLAG,
  ];
  GIT_DIFF_TIMEOUT_MS = 5000;
  MAX_DIFF_FILES = 50;
  MAX_TOTAL_FILES_FOR_PER_FILE_STATS = 500;
  MAX_SINGLE_FILE_DIFF_BYTES = 1e6;
  MAX_HUNK_LINE_COUNT = 400;
  MAX_FILES_FOR_STATS = 500;
});
//@ chunk-6vnxsn99.js:44798-45605 layout
/**
 * 按模式（auto/branch）计算 diff：working-tree 对 HEAD，或分支相对默认分支 merge-base 的变更；无 HEAD 时走新仓库路径。
 */
async function fetchGitDiff(cwd, abortSignal, ref = "auto", repoDir, diffOptions) {
  if (repoDir === undefined && !isDiffCwdInRepoCached()) return null;
  if (await isInTransientGitOperation(abortSignal, repoDir, diffOptions)) return null;
  if (ref === "branch") {
    let branchDiff = await fetchBranchDiff(cwd, abortSignal, true, repoDir, undefined, diffOptions);
    return branchDiff === "base-stats-failed" ? null : branchDiff;
  }
  let diffStats = await fetchDiffStats("HEAD", abortSignal, repoDir, diffOptions);
  if (diffStats === null) return fetchDiffWithoutHead(abortSignal, repoDir, diffOptions);
  if (diffStats.stats.filesCount > MAX_FILES_FOR_STATS)
    return {
      ...diffStats,
      hunks: new Map(),
      source: {
        kind: "working-tree",
      },
    };
  if (ref === "session") {
    await Promise.all([
      markPreSessionFiles(diffStats, repoDir),
      appendUntrackedToDiffStats(diffStats, abortSignal, repoDir, undefined, true, diffOptions),
    ]);
    return {
      ...diffStats,
      hunks: new Map(),
      source: {
        kind: "working-tree",
      },
    };
  }
  let untracked = await appendUntrackedToDiffStats(
    diffStats,
    abortSignal,
    repoDir,
    undefined,
    false,
    diffOptions,
  );
  if (ref === "branch-point") return fetchDiffAgainstBase(cwd, abortSignal, diffStats, repoDir, diffOptions);
  if (ref === "uncommitted" || diffStats.stats.filesCount > 0)
    return {
      ...diffStats,
      hunks: new Map(),
      source: {
        kind: "working-tree",
      },
    };
  let branchDiff = await fetchBranchDiff(cwd, abortSignal, false, repoDir, untracked, diffOptions);
  let workingTreeDiff = {
    ...diffStats,
    hunks: new Map(),
    source: {
      kind: "working-tree",
    },
  };
  if (branchDiff === "base-stats-failed") return nonEmptyDiffOrNull(workingTreeDiff, repoDir);
  if (branchDiff === null || branchDiff.stats.filesCount === 0) return workingTreeDiff;
  return branchDiff;
}
//@ chunk-6vnxsn99.js:45605-45669 layout
function nonEmptyDiffOrNull(diffStats, repoDir) {
  return repoDir === undefined || diffStats.stats.filesCount > 0 ? diffStats : null;
}
//@ chunk-6vnxsn99.js:45669-46207 layout
async function fetchBranchDiff(cwd, abortSignal, allowHeadFallback, repoDir, untracked, diffOptions) {
  let diffBaseLogged = await resolveDiffBaseLogged(cwd, abortSignal, repoDir, undefined, diffOptions);
  if (diffBaseLogged.kind === "error")
    return allowHeadFallback ? fetchDiffWithoutHead(abortSignal, repoDir, diffOptions) : null;
  let stats;
  let source;
  if (diffBaseLogged.kind !== "merge-base") {
    if (!allowHeadFallback) return null;
    stats = await fetchDiffStats("HEAD", abortSignal, repoDir, diffOptions);
    source =
      diffBaseLogged.kind === "head-is-base"
        ? {
            kind: "branch",
            baseBranch: diffBaseLogged.baseBranch,
            baseRef: "HEAD",
          }
        : {
            kind: "working-tree",
          };
  } else {
    stats = await fetchDiffStats(diffBaseLogged.mergeBase, abortSignal, repoDir, diffOptions);
    source = {
      kind: "branch",
      baseBranch: diffBaseLogged.baseBranch,
      baseRef: diffBaseLogged.mergeBase,
    };
  }
  if (stats === null)
    return diffBaseLogged.kind === "merge-base"
      ? "base-stats-failed"
      : fetchDiffWithoutHead(abortSignal, repoDir, diffOptions);
  if (stats.stats.filesCount <= MAX_FILES_FOR_STATS)
    await appendUntrackedToDiffStats(stats, abortSignal, repoDir, untracked, false, diffOptions);
  return {
    ...stats,
    hunks: new Map(),
    source,
  };
}
//@ chunk-6vnxsn99.js:46207-46962 layout
async function fetchDiffAgainstBase(cwd, abortSignal, diffStats, repoDir, diffOptions) {
  let workingTreeDiff = {
    ...diffStats,
    hunks: new Map(),
    source: {
      kind: "working-tree",
    },
  };
  let repoDir_2 = getDiffBaseRef(repoDir ?? getDiffRepoRoot());
  if (repoDir_2 === null) return workingTreeDiff;
  let diffBaseLogged = await resolveDiffBaseLogged(cwd, abortSignal, repoDir, repoDir_2, diffOptions);
  if (diffBaseLogged.kind !== "merge-base") return workingTreeDiff;
  let diffStats_2 = await fetchDiffStats(
    diffBaseLogged.mergeBase,
    abortSignal,
    repoDir,
    diffOptions,
    MAX_FILES_FOR_STATS,
  );
  if (diffStats_2 === null) return nonEmptyDiffOrNull(workingTreeDiff, repoDir);
  if (diffStats_2.stats.filesCount === 0) return workingTreeDiff;
  let stats = {
    ...diffStats_2.stats,
  };
  let perFileStats = new Map();
  for (let [path, entry] of diffStats.perFileStats) {
    let baseEntry = diffStats_2.perFileStats.get(path);
    if (!entry.isUntracked) {
      let { previousPath, newPath, ...rest } = entry;
      perFileStats.set(path, baseEntry ?? (entry.previousPath === undefined ? entry : rest));
      continue;
    }
    perFileStats.set(path, entry);
    if (baseEntry === undefined) stats.filesCount += 1;
    else {
      stats.linesAdded -= baseEntry.added;
      stats.linesRemoved -= baseEntry.removed;
    }
  }
  for (let [path, entry] of diffStats_2.perFileStats) {
    if (perFileStats.size >= MAX_DIFF_FILES) break;
    if (!perFileStats.has(path)) perFileStats.set(path, entry);
  }
  return {
    stats,
    perFileStats,
    hunks: new Map(),
    source: {
      kind: "branch",
      baseBranch: diffBaseLogged.baseBranch,
      baseRef: diffBaseLogged.mergeBase,
    },
  };
}
//@ chunk-6vnxsn99.js:46962-47191 layout
/**
 * 把 mtime/ctime 早于会话开始的文件标记为 preSession（会话前就有的改动）。
 */
async function markPreSessionFiles(diffStats, repoDir) {
  if (diffStats.perFileStats.size === 0) return;
  let repoDir_2 = repoDir ?? getDiffRepoRoot();
  let sessionStartTime = getSessionStartTime();
  await Promise.all(
    Array.from(diffStats.perFileStats, async ([path, entry]) => {
      try {
        let stats = await lstat(join(repoDir_2, path));
        if (Math.max(stats.mtimeMs, stats.ctimeMs) < sessionStartTime) entry.preSession = true;
      } catch {}
    }),
  );
}
//@ chunk-6vnxsn99.js:47191-47425 layout
async function appendUntrackedToDiffStats(
  diffStats,
  abortSignal,
  repoDir,
  knownUntracked,
  includePreSession = false,
  diffOptions,
) {
  let maxFiles = MAX_DIFF_FILES - diffStats.perFileStats.size;
  if (maxFiles <= 0) return null;
  let untracked =
    knownUntracked !== undefined
      ? knownUntracked
      : await fetchUntrackedFiles(maxFiles, abortSignal, repoDir, includePreSession, diffOptions);
  if (untracked)
    for (let [path, entry] of untracked) {
      if (diffStats.perFileStats.has(path)) continue;
      diffStats.perFileStats.set(path, entry);
      diffStats.stats.filesCount += 1;
    }
  return untracked;
}
//@ chunk-6vnxsn99.js:47425-47963 layout
async function fetchDiffWithoutHead(abortSignal, repoDir, diffOptions) {
  if (
    (
      await execFileNoThrow(gitExe(), ["--no-optional-locks", "rev-parse", "--verify", "--quiet", "HEAD"], {
        timeout: GIT_DIFF_TIMEOUT_MS,
        preserveOutputOnError: false,
        abortSignal,
        ...resolveGitEnv(repoDir, diffOptions),
        cwd: repoDir,
      })
    ).exitCode !== 1
  )
    return null;
  let diff = {
    stats: {
      filesCount: 0,
      linesAdded: 0,
      linesRemoved: 0,
    },
    perFileStats: new Map(),
    hunks: new Map(),
    source: {
      kind: "working-tree",
    },
    noCommits: true,
  };
  let diffStats = await fetchDiffStats("--cached", abortSignal, repoDir, diffOptions);
  if (diffStats !== null) {
    diff.stats = diffStats.stats;
    diff.perFileStats = diffStats.perFileStats;
    if (diffStats.stats.filesCount > MAX_FILES_FOR_STATS) return diff;
    if (diffStats.stats.filesCount > 0) await parseGitNumstat(diff, abortSignal, repoDir, diffOptions);
  }
  await appendUntrackedToDiffStats(diff, abortSignal, repoDir, undefined, false, diffOptions);
  return diff;
}
//@ chunk-6vnxsn99.js:47963-48319 fingerprint (2.1.88 match: parseGitNumstat, 0.756)
/**
 * 解析 git diff --numstat 输出为 {path: {added, removed, isBinary}}。
 */
async function parseGitNumstat(diffStats, abortSignal, repoDir, diffOptions) {
  let workingTreeNumstat = await fetchWorkingTreeNumstat(abortSignal, repoDir, diffOptions);
  if (workingTreeNumstat === null) return;
  for (let [path, workingEntry] of workingTreeNumstat.perFileStats) {
    let stagedEntry = diffStats.perFileStats.get(path);
    if (stagedEntry === undefined) continue;
    let isBinary = stagedEntry.isBinary || workingEntry.isBinary;
    let added = isBinary ? 0 : Math.max(0, stagedEntry.added + workingEntry.added - workingEntry.removed);
    diffStats.stats.linesAdded += added - stagedEntry.added;
    diffStats.perFileStats.set(path, {
      ...stagedEntry,
      added,
      removed: 0,
      isBinary,
      ...(workingEntry.status === "removed" && {
        status: "removed",
      }),
    });
  }
}
//@ chunk-6vnxsn99.js:48319-48731 layout
async function fetchWorkingTreeNumstat(signal, repoDir, diffOptions) {
  if (isStorageDiffMode(diffOptions)) {
    let raw =
      repoDir === undefined
        ? null
        : await readWorkTreeDiffViaIndex(
            repoDir,
            diffOptions,
            {
              from: "index",
              to: "work-tree",
            },
            GIT_DIFF_TIMEOUT_MS,
            signal,
          );
    return raw === null ? null : parseRawNumstat(raw, Number.POSITIVE_INFINITY, "within-root");
  }
  let result = await execFileNoThrow(gitExe(), [...GIT_DIFF_BASE_ARGS, "--raw", "--numstat"], {
    timeout: GIT_DIFF_TIMEOUT_MS,
    preserveOutputOnError: false,
    abortSignal: signal,
    ...resolveGitEnv(repoDir, diffOptions, {
      userLocale: true,
    }),
    cwd: repoDir,
  });
  if (result.code !== 0) return null;
  return parseRawNumstat(
    result.stdout,
    Number.POSITIVE_INFINITY,
    diffOptions === undefined ? "all" : "within-root",
  );
}
//@ chunk-6vnxsn99.js:48731-48771 layout
function isStorageDiffMode(diffOptions) {
  return diffOptions !== undefined && hasRunnerDeclaredNestedRepoDiff();
}
//@ chunk-6vnxsn99.js:48771-49351 layout
/**
 * 对指定基准运行 git diff --shortstat/--numstat，返回总计与逐文件统计（文件过多时只给总计）。
 */
async function fetchDiffStats(rev, abortSignal, repoDir, diffOptions, maxFiles = MAX_DIFF_FILES) {
  if (diffOptions === undefined) {
    let { stdout, code } = await execGitDiffNoThrow([rev, "--shortstat"], abortSignal, repoDir, diffOptions);
    if (code === 0) {
      let shortstat = parseShortstat(stdout);
      if (shortstat && shortstat.filesCount > MAX_FILES_FOR_STATS)
        return {
          stats: shortstat,
          perFileStats: new Map(),
        };
    }
  }
  let raw;
  if (isStorageDiffMode(diffOptions)) {
    let raw_2 =
      repoDir === undefined
        ? null
        : await readWorkTreeDiffViaIndex(
            repoDir,
            diffOptions,
            rev === "--cached"
              ? {
                  from: "nothing",
                  to: "index",
                }
              : {
                  from: "commit",
                  revision: rev,
                  to: "work-tree",
                },
            GIT_DIFF_TIMEOUT_MS,
            abortSignal,
          );
    if (raw_2 === null) return null;
    raw = raw_2;
  } else {
    let { stdout, code } = await execGitDiffNoThrow(
      [rev, "--raw", "--numstat"],
      abortSignal,
      repoDir,
      diffOptions,
    );
    if (code !== 0) return null;
    raw = stdout;
  }
  let rawNumstat = parseRawNumstat(raw, maxFiles, diffOptions === undefined ? "all" : "within-root");
  if (diffOptions !== undefined && rawNumstat.stats.filesCount > MAX_FILES_FOR_STATS)
    return {
      stats: rawNumstat.stats,
      perFileStats: new Map(),
    };
  return rawNumstat;
}
//@ chunk-6vnxsn99.js:49351-49547 placement (2.1.88 match: execFileNoThrow, 0.676)
/**
 * 运行 git diff 系列命令（不抛异常），给定 cwd 时附带额外环境。切分上属 utils/gitDiff。
 */
function execGitDiffNoThrow(args, abortSignal, repoDir, diffOptions) {
  let fullArgs = [...GIT_DIFF_BASE_ARGS, ...args];
  let execOptions = {
    timeout: GIT_DIFF_TIMEOUT_MS,
    preserveOutputOnError: false,
    abortSignal,
  };
  if (repoDir !== undefined)
    return execFileNoThrow(gitExe(), fullArgs, {
      ...execOptions,
      ...resolveGitEnv(repoDir, diffOptions),
      cwd: repoDir,
      stdin: "ignore",
    });
  return gitReadInOwnWorkTree(getFsImplementation().cwd(), fullArgs, {}, execOptions);
}
//@ chunk-6vnxsn99.js:49547-49651 placement
function standardRepoLayout(repoRoot) {
  let gitDirs = resolveGitDirs(repoRoot);
  return gitDirs !== null && gitDirs.workTree !== null && gitDirs.gitDir === join(gitDirs.workTree, ".git")
    ? gitDirs
    : null;
}
//@ chunk-6vnxsn99.js:49651-49841 placement
function getRepoGitEnv(repoRoot) {
  return {
    env: {
      ...getRemoteHostSessionCount(GIT_FILES_REF_BACKEND_ENV, {
        base: subprocessEnv(),
        repository: standardRepoLayout(repoRoot) ?? {
          gitDir: NOT_A_GIT_REPO_PATH,
          workTree: repoRoot,
          commonDir: NOT_A_GIT_REPO_PATH,
        },
      }),
      ...ISOLATED_GIT_CONFIG_ENV,
      ...buildGitConfigEnv(undefined, getGitSafetyConfigPairs()),
      [CLAUDE_CODE_FOUND_REPOSITORY_GIT]: "1",
    },
    extendEnv: false,
    gitStartsIn: GitStartFolderError.filesystemRoot(),
  };
}
//@ chunk-6vnxsn99.js:49841-50003 placement
function getNonRepoGitEnv(workTree) {
  return {
    env: {
      ...getRemoteHostSessionCount(GIT_FILES_REF_BACKEND_ENV, {
        base: subprocessEnv(),
        repository: {
          gitDir: NOT_A_GIT_REPO_PATH,
          workTree,
          commonDir: NOT_A_GIT_REPO_PATH,
        },
      }),
      ...ISOLATED_GIT_CONFIG_ENV,
      [CLAUDE_CODE_FOUND_REPOSITORY_GIT]: "1",
    },
    extendEnv: false,
    gitStartsIn: GitStartFolderError.filesystemRoot(),
  };
}
//@ chunk-6vnxsn99.js:50003-50106 placement
function resolveGitEnv(repoDir, userLocale, { userLocale: userLocale_2 } = {}) {
  if (repoDir === undefined)
    return {
      env: getRemoteHostSessionCount(undefined, {
        userLocale: userLocale_2,
      }),
    };
  return userLocale ?? getNonRepoGitEnv(repoDir);
}
//@ chunk-6vnxsn99.js:50106-50210 placement
function diffBaseRef(result) {
  if (result.noCommits) return "--cached";
  return result.source.kind === "branch" ? result.source.baseRef : "HEAD";
}
//@ chunk-6vnxsn99.js:50210-50701 fingerprint (2.1.88 match: fetchGitDiff, 0.559)
/**
 * /diff 等用的工作区 diff 统计入口：合并/变基中返回 null；先 --shortstat 判断规模（超过 500 文件只给总数），再 --numstat 取最多 50 个文件的增删行，并补充未跟踪文件。
 */
async function fetchGitDiff_2(abortSignal, rev = "HEAD") {
  if (!isDiffCwdInRepoCached()) return null;
  if (await isInTransientGitOperation(abortSignal, undefined, undefined)) return null;
  let { stdout: shortstatOut, code: shortstatCode } = await execGitDiffNoThrow(
    [rev, "--shortstat"],
    abortSignal,
    undefined,
    undefined,
  );
  if (shortstatCode === 0) {
    let quickStats = parseShortstat(shortstatOut);
    if (quickStats && quickStats.filesCount > MAX_FILES_FOR_STATS)
      return {
        hunks: new Map(),
        skippedLarge: new Set(),
      };
  }
  let { stdout: numstatOut, code: numstatCode } = await execGitDiffNoThrow(
    [...RAW_BLOB_DIFF_FLAGS, rev],
    abortSignal,
    undefined,
    undefined,
  );
  if (numstatCode !== 0) return null;
  let quickStats = parseGitDiff(numstatOut);
  if (rev === "--cached" && quickStats.hunks.size > 0) {
    let untrackedStats = await fetchWorkingTreeNumstat(abortSignal, undefined, undefined);
    if (untrackedStats === null) return null;
    for (let key of untrackedStats.perFileStats.keys()) quickStats.hunks.delete(key);
  }
  return quickStats;
}
//@ chunk-6vnxsn99.js:50701-50734 layout
function getDiffCwd() {
  return getFsImplementation().cwd();
}
//@ chunk-6vnxsn99.js:50734-50860 layout
function isDiffCwdInRepoCached() {
  let diffCwd = getDiffCwd();
  let diffCheckoutIsRepo = getGitRepoCache().diffCheckoutIsRepo;
  let cached = diffCheckoutIsRepo.get(diffCwd);
  if (cached !== undefined) return cached;
  let isRepo = findGitRootRecheckingNegative(diffCwd) !== null;
  diffCheckoutIsRepo.set(diffCwd, isRepo);
  return isRepo;
}
//@ chunk-6vnxsn99.js:50860-50903 layout
function getDiffRepoRoot() {
  let diffCwd = getDiffCwd();
  return findGitRoot(diffCwd) ?? diffCwd;
}
//@ chunk-6vnxsn99.js:50903-51159 layout
async function getRepoTopLevel(abortSignal, repoDir) {
  let { stdout, code } = await execFileNoThrow(
    gitExe(),
    ["--no-optional-locks", "rev-parse", "--show-toplevel"],
    {
      timeout: GIT_DIFF_TIMEOUT_MS,
      preserveOutputOnError: false,
      abortSignal,
      ...(repoDir === undefined
        ? {
            env: getRemoteHostSessionCount(),
          }
        : getRepoGitEnv(repoDir)),
      cwd: repoDir,
    },
  );
  if (code !== 0 || stdout.trim() === "") return null;
  return stdout.trim();
}
//@ chunk-6vnxsn99.js:51159-52096 layout
/**
 * 解析 git diff --raw --numstat 组合输出：raw 行给状态与路径（含重命名），numstat 行给行数。
 */
function parseRawNumstat(stdout, maxFiles = MAX_DIFF_FILES, pathMode = "all") {
  let filtered = stdout
    .split(
      `
`,
    )
    .filter(Boolean);
  let filtered_2 = filtered.filter((line) => line.startsWith(":"));
  let filtered_3 = filtered.filter((line) => !line.startsWith(":") && countCharInString(line, "\t") + 1 >= 3);
  let isAligned = filtered_2.length === filtered_3.length;
  let rawLineIndex = new Map();
  if (!isAligned)
    for (let [lineIndex, line] of filtered_2.entries()) {
      let [, oldPath = "", newPath] = line.split("\t");
      let path = newPath === undefined ? oldPath : formatRenamePath(oldPath, newPath);
      let queue = rawLineIndex.get(path);
      if (queue === undefined)
        rawLineIndex.set(path, {
          indices: [lineIndex],
          next: 0,
        });
      else queue.indices.push(lineIndex);
    }
  let rawCursor = 0;
  let linesAdded = 0;
  let linesRemoved = 0;
  let filesCount = 0;
  let perFileStats = new Map();
  for (let [lineIndex, line] of filtered_3.entries()) {
    let parts = line.split("\t");
    let pathText = parts.slice(2).join("\t");
    let rawLine = isAligned ? filtered_2[lineIndex] : undefined;
    let queueEntry = rawLineIndex.get(pathText);
    if (queueEntry !== undefined) {
      while (queueEntry.next < queueEntry.indices.length && queueEntry.indices[queueEntry.next] < rawCursor)
        queueEntry.next++;
      let rawIndex = queueEntry.indices[queueEntry.next];
      if (rawIndex !== undefined) {
        queueEntry.next++;
        rawCursor = rawIndex + 1;
        rawLine = filtered_2[rawIndex];
      }
    }
    if (pathMode === "within-root" && !isSafeRelativeDiffPath(pathText)) continue;
    filesCount++;
    let added = parts[0];
    let removed = parts[1];
    let isBinary = added === "-" || removed === "-";
    let fileAdded = isBinary ? 0 : parseInt(added ?? "0", 10) || 0;
    let fileRemoved = isBinary ? 0 : parseInt(removed ?? "0", 10) || 0;
    linesAdded += fileAdded;
    linesRemoved += fileRemoved;
    if (perFileStats.size < maxFiles) {
      let hasKey = perFileStats.has(pathText);
      perFileStats.set(pathText, {
        added: fileAdded,
        removed: fileRemoved,
        isBinary,
        isUntracked: false,
        ...(rawLine !== undefined && parseRawDiffLine(rawLine, hasKey)),
      });
    }
  }
  return {
    stats: {
      filesCount,
      linesAdded,
      linesRemoved,
    },
    perFileStats,
  };
}
//@ chunk-6vnxsn99.js:52096-52545 layout
function formatRenamePath(oldPath, newPath) {
  if (oldPath.startsWith('"') || newPath.startsWith('"')) return `${oldPath} => ${newPath}`;
  let commonPrefix = 0;
  for (let j = 0; j < oldPath.length && j < newPath.length && oldPath[j] === newPath[j]; j++)
    if (oldPath[j] === "/") commonPrefix = j + 1;
  let compareFrom = commonPrefix === 0 ? 0 : commonPrefix - 1;
  let commonSuffix = 0;
  for (
    let oldIndex = oldPath.length - 1, newIndex = newPath.length - 1;
    oldIndex >= compareFrom && newIndex >= compareFrom && oldPath[oldIndex] === newPath[newIndex];
    oldIndex--, newIndex--
  )
    if (oldPath[oldIndex] === "/") commonSuffix = oldPath.length - oldIndex;
  if (commonPrefix + commonSuffix === 0) return `${oldPath} => ${newPath}`;
  let sliced = oldPath.slice(0, commonPrefix);
  let sliced_2 = oldPath.slice(oldPath.length - commonSuffix);
  let sliced_3 = oldPath.slice(commonPrefix, Math.max(commonPrefix, oldPath.length - commonSuffix));
  let sliced_4 = newPath.slice(commonPrefix, Math.max(commonPrefix, newPath.length - commonSuffix));
  return `${sliced}{${sliced_3} => ${sliced_4}}${sliced_2}`;
}
//@ chunk-6vnxsn99.js:52545-52599 layout
var DIFF_STATUS_NAMES = {
  A: "added",
  D: "removed",
  R: "renamed",
  C: "copied",
};
//@ chunk-6vnxsn99.js:52599-52889 layout
function parseRawDiffLine(line, keepStatusOnly) {
  let [meta, oldPath, newPath] = line.split("\t");
  let statusLetter = meta.slice(meta.lastIndexOf(" ") + 1)[0];
  let status = DIFF_STATUS_NAMES[statusLetter] ?? "modified";
  let safeNewPath = sanitizeDiffPath(newPath ?? oldPath);
  if (keepStatusOnly || safeNewPath === undefined)
    return {
      status,
    };
  if (newPath === undefined)
    return oldPath.startsWith('"')
      ? {
          status,
          newPath: safeNewPath,
        }
      : {
          status,
        };
  let safeOldPath = sanitizeDiffPath(oldPath);
  return safeOldPath === undefined
    ? {
        status,
      }
    : {
        status,
        previousPath: safeOldPath,
        newPath: safeNewPath,
      };
}
//@ chunk-6vnxsn99.js:52889-53064 layout
function sanitizeDiffPath(rawPath) {
  let path = rawPath.startsWith('"') ? unquoteGitPathBytes(rawPath.slice(1, -1)) : rawPath;
  return !hasUnsafePathGlyphsOrSurrogate(path) &&
    !UNSAFE_PATH_CHAR_PATTERN.test(path) &&
    !/\\|^[A-Za-z]:| => /.test(path) &&
    !isAbsolute(path) &&
    path.split("/").every((part) => stripTrailingDotsSpaces(part) !== "..")
    ? path
    : undefined;
}
//@ chunk-6vnxsn99.js:53064-53217 layout
function isSafeRelativeDiffPath(pathText) {
  let diffPathPair = parseDiffPathPair(pathText);
  return (
    diffPathPair !== null &&
    diffPathPair.every(
      (path) =>
        !isAbsolute(path) &&
        !win32.isAbsolute(path) &&
        !/^[A-Za-z]:/.test(path) &&
        path.split(/[/\\{}]/).every((part) => stripTrailingDotsSpaces(part) !== ".."),
    )
  );
}
//@ chunk-6vnxsn99.js:53217-54055 layout
function parseDiffPathPair(value) {
  if (value.startsWith('"')) {
    let closingQuote = findClosingQuote(value);
    if (closingQuote === -1) return null;
    let firstPath = unquoteGitPathBytes(value.slice(1, closingQuote));
    let sliced = value.slice(closingQuote + 1);
    if (sliced === "") return [firstPath];
    let rest = sliced.startsWith(" => ") ? sliced.slice(4) : null;
    if (rest === null) return null;
    if (!rest.startsWith('"')) return rest.includes('"') || rest.includes(" => ") ? null : [firstPath, rest];
    return findClosingQuote(rest) === rest.length - 1
      ? [firstPath, unquoteGitPathBytes(rest.slice(1, -1))]
      : null;
  }
  let index = value.indexOf(" => ");
  if (index === -1) return value.includes('"') ? null : [value];
  if (value.indexOf(" => ", index + 1) !== -1) return null;
  let sliced = value.slice(0, index);
  let text = value.slice(index + 4);
  if (sliced.includes('"')) return null;
  if (text.startsWith('"'))
    return findClosingQuote(text) === text.length - 1
      ? [sliced, unquoteGitPathBytes(text.slice(1, -1))]
      : null;
  if (text.includes('"')) return null;
  let paths = [sliced, text];
  let index_2 = sliced.indexOf("{");
  let index_3 = text.indexOf("}");
  if (sliced.indexOf("{", index_2 + 1) !== -1 || text.indexOf("}", index_3 + 1) !== -1) return null;
  if (index_2 !== -1 && index_3 !== -1) {
    let sliced_2 = sliced.slice(0, index_2);
    let sliced_3 = text.slice(index_3 + 1);
    paths.push(
      `${sliced_2}${sliced.slice(index_2 + 1)}${sliced_3}`,
      `${sliced_2}${text.slice(0, index_3)}${sliced_3}`,
    );
  }
  return paths;
}
//@ chunk-6vnxsn99.js:54055-54153 layout
function findClosingQuote(text) {
  for (let j = 1; j < text.length; j++)
    if (text[j] === "\\") j++;
    else if (text[j] === '"') return j;
  return -1;
}
//@ chunk-6vnxsn99.js:54153-54194 layout
var UNSAFE_PATH_CHAR_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6vnxsn99.js:54153", () => {
  UNSAFE_PATH_CHAR_PATTERN = new RegExp(`[${INVISIBLE_CHAR_CLASS_SOURCE}\\uFFFD]`, "u");
});
//@ chunk-6vnxsn99.js:54194-54582 layout
/**
 * 还原 git 带引号路径中的反斜杠转义（八进制字节、\t 等）为 UTF-8 字符串。
 */
function unquoteGitPathBytes(text) {
  let bytes = [];
  let list = Array.from(text);
  for (let j = 0; j < list.length; j++) {
    let char = list[j];
    if (char !== "\\") {
      bytes.push(...Buffer.from(char, "utf8"));
      continue;
    }
    let nextChar = list[j + 1] ?? "";
    let joined = list.slice(j + 1, j + 4).join("");
    if (/^[0-3][0-7]{2}$/.test(joined)) {
      bytes.push(parseInt(joined, 8));
      j += 3;
      continue;
    }
    let code = {
      n: 10,
      t: 9,
      r: 13,
      b: 8,
      a: 7,
      f: 12,
      v: 11,
      '"': 34,
      "\\": 92,
    }[nextChar];
    if (code !== undefined) {
      bytes.push(code);
      j += 1;
    } else bytes.push(92);
  }
  return Buffer.from(bytes).toString("utf8");
}
//@ chunk-6vnxsn99.js:54582-55767 fingerprint (2.1.88 match: parseGitDiff, 0.959)
/**
 * 把统一 diff 文本解析成按文件的 hunk 列表。
 */
function parseGitDiff(stdout) {
  let result = new Map();
  let skippedLarge = new Set();
  if (!stdout.trim())
    return {
      hunks: result,
      skippedLarge,
    };
  let fileDiffs = stdout.split(/^diff --git /m).filter(Boolean);
  for (let fileDiff of fileDiffs) {
    if (result.size + skippedLarge.size >= MAX_DIFF_FILES) break;
    let index = fileDiff.indexOf(`
`);
    let header = index === -1 ? fileDiff : fileDiff.slice(0, index);
    let match = header.match(/^a\/(.+) b\/\1$/);
    let match_2 =
      match ?? header.match(/^(?:"a\/((?:[^"\\]|\\.)*)"|a\/(.+?)) (?:"b\/((?:[^"\\]|\\.)*)"|b\/(.+))$/);
    if (!match_2) continue;
    let filePath = match
      ? match[1]
      : match_2[3] !== undefined
        ? unquoteGitPathBytes(match_2[3])
        : (match_2[4] ?? (match_2[1] !== undefined ? unquoteGitPathBytes(match_2[1]) : (match_2[2] ?? "")));
    if (fileDiff.length > MAX_SINGLE_FILE_DIFF_BYTES) {
      skippedLarge.add(filePath);
      continue;
    }
    let lines = fileDiff.split(`
`);
    let fileHunks = [];
    let currentHunk = null;
    let lineCount = 0;
    for (let i = 1; i < lines.length; i++) {
      let line = lines[i] ?? "";
      let hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (hunkMatch) {
        if (currentHunk) fileHunks.push(currentHunk);
        currentHunk = {
          oldStart: parseInt(hunkMatch[1] ?? "0", 10),
          oldLines: parseInt(hunkMatch[2] ?? "1", 10),
          newStart: parseInt(hunkMatch[3] ?? "0", 10),
          newLines: parseInt(hunkMatch[4] ?? "1", 10),
          lines: [],
        };
        continue;
      }
      if (
        currentHunk === null &&
        (line.startsWith("index ") ||
          line.startsWith("---") ||
          line.startsWith("+++") ||
          line.startsWith("new file") ||
          line.startsWith("deleted file") ||
          line.startsWith("old mode") ||
          line.startsWith("new mode") ||
          line.startsWith("Binary files"))
      )
        continue;
      if (
        currentHunk &&
        (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ") || line === "")
      ) {
        if (lineCount >= MAX_HUNK_LINE_COUNT) continue;
        currentHunk.lines.push("" + line);
        lineCount++;
      }
    }
    if (currentHunk) fileHunks.push(currentHunk);
    if (fileHunks.length > 0) result.set(filePath, fileHunks);
  }
  return {
    hunks: result,
    skippedLarge,
  };
}
//@ chunk-6vnxsn99.js:55767-56289 layout
/**
 * git 是否处于临时操作中（MERGE_HEAD、REBASE_HEAD、CHERRY_PICK_HEAD、REVERT_HEAD、rebase-merge 等存在），此时跳过 diff。
 */
async function isInTransientGitOperation(abortSignal, repoDir, diffOptions) {
  let gitDir = await getGitDir(repoDir ?? getDiffCwd());
  if (!gitDir) return false;
  let transientFiles = [
    "MERGE_HEAD",
    "REBASE_HEAD",
    "CHERRY_PICK_HEAD",
    "REVERT_HEAD",
    "rebase-merge",
    join("rebase-apply", "rebasing"),
  ];
  let [merge, rebaseHead, cherryPick, revert, rebaseMerge, rebaseApply] = await Promise.all(
    transientFiles.map((file) =>
      access(join(gitDir, file))
        .then(() => true)
        .catch(() => false),
    ),
  );
  let inSequencerOperation = rebaseMerge || rebaseApply;
  if (merge || cherryPick || revert || (rebaseHead && inSequencerOperation)) return true;
  if (isStorageDiffMode(diffOptions)) return false;
  let existingRefs = await findExistingRefs(
    gitDir,
    inSequencerOperation ? [...SEQUENCER_STATE_FILES, "REBASE_HEAD"] : SEQUENCER_STATE_FILES,
    async (args) =>
      (
        await execFileNoThrow(gitExe(), ["--no-optional-locks", ...args], {
          timeout: GIT_DIFF_TIMEOUT_MS,
          preserveOutputOnError: false,
          abortSignal,
          ...resolveGitEnv(repoDir, diffOptions),
          cwd: repoDir,
        })
      ).exitCode,
  );
  return existingRefs !== null && existingRefs.size > 0;
}
//@ chunk-6vnxsn99.js:56289-56469 layout
class DiffBaseLogState {
  #e = false;
  #t = false;
  get baseResolveOkLogged() {
    return this.#e;
  }
  get baseResolveSadLogged() {
    return this.#t;
  }
  markBaseResolveOkLogged() {
    this.#e = true;
  }
  markBaseResolveSadLogged() {
    this.#t = true;
  }
}
//@ chunk-6vnxsn99.js:56469-56494 layout
var diffBaseLogRegistry; // deferred: uses DiffBaseLogState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6vnxsn99.js:56469", () => {
  diffBaseLogRegistry = new HostScoped(() => new DiffBaseLogState());
});
//@ chunk-6vnxsn99.js:56494-56778 layout
async function resolveDiffBaseLogged(cwd, abortSignal, abortSignal_2, repoDir, baseRef) {
  let logState = diffBaseLogRegistry.of(cwd);
  let diffBase = await resolveDiffBase(abortSignal, abortSignal_2, repoDir, baseRef);
  if (diffBase.kind === "error") {
    if (!logState.baseResolveSadLogged) {
      logState.markBaseResolveSadLogged();
      logFeatureSad("diff_base_resolve", diffBase.reason);
    }
  } else if (!logState.baseResolveOkLogged) {
    logState.markBaseResolveOkLogged();
    logFeatureOk("diff_base_resolve", {
      outcome: fromEnum(diffBase.kind),
    });
  }
  return diffBase;
}
//@ chunk-6vnxsn99.js:56778-57702 layout
/**
 * 解析 diff 基准：当前分支与默认分支（或 CLAUDE_CODE_BASE_REF）的 merge-base；ref 名含危险字符时返回 none。
 */
async function resolveDiffBase(abortSignal, repoDir, baseRef, diffOptions) {
  let execOptions = {
    timeout: GIT_DIFF_TIMEOUT_MS,
    abortSignal,
    ...resolveGitEnv(repoDir, diffOptions),
  };
  let [branch, defaultBranch] = await Promise.all([
    getBranch(repoDir, execOptions),
    getDefaultBranch(repoDir, execOptions),
  ]);
  if (!branch || branch === "HEAD")
    return {
      kind: "none",
    };
  let baseBranch = baseRef ?? defaultBranch;
  if (
    baseBranch.startsWith("-") ||
    UNSAFE_PATH_CHAR_PATTERN.test(baseBranch) ||
    (baseRef === undefined && /\.\.|[\s~^:?*[\\]|@\{/.test(baseBranch))
  )
    return {
      kind: "none",
    };
  let runOptions = {
    ...execOptions,
    preserveOutputOnError: false,
    cwd: repoDir,
  };
  if (diffOptions !== undefined && hasRunnerDeclaredNestedRepoDiff()) {
    let result = await execFileNoThrow(
      gitExe(),
      ["--no-optional-locks", "merge-base", "HEAD", `refs/remotes/origin/${baseBranch}`],
      runOptions,
    );
    if (result.code === 0 && result.stdout.trim())
      return classifyMergeBase(result.stdout.trim(), baseBranch, runOptions);
  }
  if (branch === baseBranch)
    return {
      kind: "head-is-base",
      baseBranch,
    };
  let sawFailure = false;
  let mergeBase = await findMergeBase(baseBranch, async (args) => {
    let result = await execFileNoThrow(gitExe(), args, runOptions);
    if (result.exitCode === 1) sawFailure = true;
    return result;
  });
  if (!mergeBase) {
    if (sawFailure)
      return {
        kind: "none",
      };
    for (let refName of [`refs/remotes/origin/${baseBranch}`, `refs/heads/${baseBranch}`]) {
      let result = await execFileNoThrow(
        gitExe(),
        ["--no-optional-locks", "show-ref", "--verify", "--quiet", refName],
        runOptions,
      );
      if (result.exitCode === 0 || result.exitCode === undefined)
        return {
          kind: "error",
          reason: "merge_base_failed",
        };
    }
    return {
      kind: "none",
    };
  }
  return classifyMergeBase(mergeBase, baseBranch, runOptions);
}
//@ chunk-6vnxsn99.js:57702-57974 layout
async function classifyMergeBase(mergeBase, baseBranch, runOptions) {
  let headResult = await execFileNoThrow(gitExe(), ["--no-optional-locks", "rev-parse", "HEAD"], runOptions);
  if (headResult.code !== 0)
    return {
      kind: "error",
      reason: "head_rev_parse_failed",
    };
  if (headResult.stdout.trim() === mergeBase)
    return {
      kind: "head-is-base",
      baseBranch,
    };
  return {
    kind: "merge-base",
    mergeBase,
    baseBranch,
  };
}
//@ chunk-6vnxsn99.js:57974-58839 fingerprint (2.1.88 match: fetchUntrackedFiles, 0.717)
/**
 * 列出未跟踪文件并估算行数，补进 diff 统计。
 */
async function fetchUntrackedFiles(maxFiles, abortSignal, repoDir, includePreSession = false, diffOptions) {
  let { stdout, code } = await execFileNoThrow(
    gitExe(),
    ["--no-optional-locks", "ls-files", "--others", "--exclude-standard", "--full-name"],
    {
      timeout: GIT_DIFF_TIMEOUT_MS,
      preserveOutputOnError: false,
      abortSignal,
      ...resolveGitEnv(repoDir, diffOptions),
      cwd: repoDir,
    },
  );
  if (code !== 0) return null;
  let untrackedPaths = stdout
    .split(
      `
`,
    )
    .filter((line) => line !== "" && (diffOptions === undefined || isSafeRelativeDiffPath(line)));
  if (untrackedPaths.length === 0) return null;
  let repoRoot = repoDir ?? getDiffRepoRoot();
  let sessionStartTime = getSessionStartTime();
  let results = await Promise.all(
    untrackedPaths.slice(0, MAX_TOTAL_FILES_FOR_PER_FILE_STATS).map(async (untrackedPath) => {
      try {
        let stats = await lstat(join(repoRoot, untrackedPath));
        return {
          filePath: untrackedPath,
          preSession: Math.max(stats.mtimeMs, stats.ctimeMs) < sessionStartTime,
        };
      } catch {
        return {
          filePath: untrackedPath,
          preSession: false,
        };
      }
    }),
  );
  let filtered = results.filter((recentResult) => !recentResult.preSession);
  if (includePreSession) filtered.push(...results.filter((preSessionResult) => preSessionResult.preSession));
  if (filtered.length === 0) return null;
  let perFileStats = new Map();
  for (let { filePath, preSession } of filtered.slice(0, maxFiles)) {
    let safePath = filePath.startsWith('"') ? sanitizeDiffPath(filePath) : undefined;
    perFileStats.set(filePath, {
      added: 0,
      removed: 0,
      isBinary: false,
      isUntracked: true,
      status: "added",
      ...(safePath !== undefined && {
        newPath: safePath,
      }),
      ...(preSession && {
        preSession,
      }),
    });
  }
  return perFileStats;
}
//@ chunk-6vnxsn99.js:58839-59093 fingerprint (2.1.88 match: parseShortstat, 1)
/**
 * 解析 `N files changed, X insertions, Y deletions`。
 */
function parseShortstat(stdout) {
  let match = stdout.match(
    /(\d+)\s+files?\s+changed(?:,\s+(\d+)\s+insertions?\(\+\))?(?:,\s+(\d+)\s+deletions?\(-\))?/,
  );
  if (!match) return null;
  return {
    filesCount: parseInt(match[1] ?? "0", 10),
    linesAdded: parseInt(match[2] ?? "0", 10),
    linesRemoved: parseInt(match[3] ?? "0", 10),
  };
}
//@ chunk-6vnxsn99.js:59093-59105 layout
var GIT_EXPLICIT_DIR_TIMEOUT_MS = 3000;
//@ chunk-6vnxsn99.js:59105-59233 layout
function shouldSendToolDiff({ gitDiffRead }) {
  if (!gitDiffRead) return false;
  if (env.CLAUDE_CODE_REMOTE) return true;
  return isBridgeEnvironment() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_child_tool_diff", true);
}
//@ chunk-6vnxsn99.js:59233-59246 layout
var MAX_TOOL_DIFF_PATCH_BYTES = 65536;
//@ chunk-6vnxsn99.js:59246-59338 layout
function isPatchWithinSizeLimit(singleFileGitDiff) {
  return (
    Boolean(env.CLAUDE_CODE_REMOTE) ||
    Buffer.byteLength(singleFileGitDiff.patch, "utf8") <= MAX_TOOL_DIFF_PATCH_BYTES
  );
}
//@ chunk-6vnxsn99.js:59338-60133 fingerprint (2.1.88 match: fetchSingleFileGitDiff, 0.753)
/**
 * 取单个文件相对基准的 diff（工具调用后展示/上报用）。
 */
async function fetchSingleFileGitDiff(absoluteFilePath) {
  let gitRoot = findGitRoot(dirname(absoluteFilePath));
  if (!gitRoot) return null;
  let realRoot = await realpath(gitRoot).catch(() => null);
  if (realRoot === null) return null;
  let cwd = await realpathGitDir(realRoot);
  if (cwd === null) return null;
  let worktreeMainRepoPath = detectWorktreeMainRepoPath(cwd);
  let checkoutPaths = [
    getOriginalCwd(),
    ...(env.CLAUDE_CODE_REPO_CHECKOUTS ? getRepoCheckouts().values() : []),
  ];
  let matchedGitDir = null;
  for (let checkoutPath of checkoutPaths) {
    let startPath = resolveCheckoutPath(checkoutPath);
    if (startPath === null) continue;
    let cwd_2 = await realpathGitDir(startPath);
    if (cwd_2 === null) continue;
    if (cwd_2 === cwd) {
      matchedGitDir = cwd_2;
      break;
    }
    let worktreeMainRepoPath_2 = detectWorktreeMainRepoPath(cwd_2);
    if (matchedGitDir === null && worktreeMainRepoPath_2 === worktreeMainRepoPath)
      matchedGitDir = worktreeMainRepoPath_2;
  }
  if (matchedGitDir === null) return null;
  let dirs = {
    gitDir: matchedGitDir,
    workTree: realRoot,
  };
  let gitPath = relative(gitRoot, absoluteFilePath).split(sep).join("/");
  let repository = getCachedRepository();
  let { code: lsFilesCode } = await runGitWithExplicitDirs(dirs, [
    "--no-optional-locks",
    "ls-files",
    "--error-unmatch",
    "--",
    gitPath,
  ]);
  if (lsFilesCode === 0) {
    let diffRef = await getDiffRef(dirs, gitRoot);
    let { stdout, code } = await runGitWithExplicitDirs(
      dirs,
      [...GIT_DIFF_BASE_ARGS, ...RAW_BLOB_DIFF_FLAGS, diffRef, "--", gitPath],
      {
        userLocale: true,
      },
    );
    if (code !== 0) return null;
    if (!stdout) return null;
    return {
      ...parseRawDiffToToolUseDiff(gitPath, stdout, "modified"),
      repository,
    };
  }
  let syntheticDiff = await generateSyntheticDiff(gitPath, absoluteFilePath);
  if (!syntheticDiff) return null;
  return {
    ...syntheticDiff,
    repository,
  };
}
//@ chunk-6vnxsn99.js:60133-60430 fingerprint (2.1.88 match: parseRawDiffToToolUseDiff, 1)
function parseRawDiffToToolUseDiff(filename, rawDiff, status) {
  let lines = rawDiff.split(`
`);
  let patchLines = [];
  let inHunks = false;
  let additions = 0;
  let deletions = 0;
  for (let line of lines) {
    if (line.startsWith("@@")) inHunks = true;
    if (inHunks) {
      patchLines.push(line);
      if (line.startsWith("+") && !line.startsWith("+++")) additions++;
      else if (line.startsWith("-") && !line.startsWith("---")) deletions++;
    }
  }
  return {
    filename,
    status,
    additions,
    deletions,
    changes: additions + deletions,
    patch: patchLines.join(`
`),
  };
}
//@ chunk-6vnxsn99.js:60430-60751 layout
async function findMergeBase(baseBranch, runGit) {
  let candidates = [];
  for (let refName of [`origin/${baseBranch}`, baseBranch]) {
    let { stdout, code } = await runGit(["--no-optional-locks", "merge-base", "HEAD", refName]);
    if (code === 0 && stdout.trim()) candidates.push(stdout.trim());
  }
  let [originMergeBase, localMergeBase] = candidates;
  if (!originMergeBase) return null;
  if (!localMergeBase || originMergeBase === localMergeBase) return originMergeBase;
  let { code } = await runGit([
    "--no-optional-locks",
    "merge-base",
    "--is-ancestor",
    originMergeBase,
    localMergeBase,
  ]);
  return code === 0 ? localMergeBase : originMergeBase;
}
//@ chunk-6vnxsn99.js:60751-60833 layout
async function realpathGitDir(startPath) {
  let gitDir = await getGitDir(startPath);
  return gitDir === null ? null : realpath(gitDir).catch(() => null);
}
//@ chunk-6vnxsn99.js:60833-60939 placement (2.1.88 match: detectWorktreeMainRepoPath, 0.742)
/**
 * 若 cwd 是 <repo>.git/worktrees/<name> 形式则返回主仓库 .git 路径，否则原样返回（切分上属 utils/gitDiff 一带）。
 */
function detectWorktreeMainRepoPath(cwd) {
  let worktreesDir = dirname(cwd);
  let gitDirName = dirname(worktreesDir);
  return basename(cwd) !== ".git" &&
    basename(worktreesDir) === "worktrees" &&
    basename(gitDirName).endsWith(".git")
    ? gitDirName
    : cwd;
}
//@ chunk-6vnxsn99.js:60939-61102 layout
function runGitWithExplicitDirs({ gitDir, workTree }, args, { userLocale } = {}) {
  return execFileNoThrowWithCwd(gitExe(), [`--git-dir=${gitDir}`, `--work-tree=${workTree}`, ...args], {
    cwd: workTree,
    timeout: GIT_EXPLICIT_DIR_TIMEOUT_MS,
    env: getRemoteHostSessionCount(undefined, {
      userLocale,
    }),
  });
}
//@ chunk-6vnxsn99.js:61102-61233 layout
function getDiffBaseRef(checkoutPath) {
  let checkoutName = checkoutNameForPath(checkoutPath);
  let baseRef =
    (checkoutName !== undefined ? getRepoBaseRefs().get(checkoutName) : undefined) ||
    env.CLAUDE_CODE_BASE_REF;
  if (!baseRef) return;
  return baseRef.startsWith("-") ? null : baseRef;
}
//@ chunk-6vnxsn99.js:61233-61524 fingerprint (2.1.88 match: getDiffRef, 0.888)
async function getDiffRef(dirs, checkoutPath) {
  let diffBaseRef = getDiffBaseRef(checkoutPath);
  function runGit(args) {
    return runGitWithExplicitDirs(dirs, args);
  }
  if (diffBaseRef === undefined) {
    let baseBranch = await getDefaultBranch();
    if (baseBranch.startsWith("-")) return "HEAD";
    return (await findMergeBase(baseBranch, runGit)) ?? "HEAD";
  }
  let { stdout, code } = await runGit(["--no-optional-locks", "merge-base", "HEAD", diffBaseRef ?? "HEAD"]);
  if (code === 0 && stdout.trim()) return stdout.trim();
  return "HEAD";
}
//@ chunk-6vnxsn99.js:61524-61830 fingerprint (2.1.88 match: generateSyntheticDiff, 1)
async function generateSyntheticDiff(gitPath, absoluteFilePath) {
  try {
    if (!(await isFileWithinSizeBound(absoluteFilePath, MAX_SINGLE_FILE_DIFF_BYTES))) return null;
    let lines = (await readFile(absoluteFilePath, "utf-8")).split(`
`);
    if (lines.length > 0 && lines.at(-1) === "") lines.pop();
    let lineCount = lines.length;
    let addedLines = lines.map((line) => `+${line}`).join(`
`);
    let patch = `@@ -0,0 +1,${lineCount} @@
${addedLines}`;
    return {
      filename: gitPath,
      status: "added",
      additions: lineCount,
      deletions: 0,
      changes: lineCount,
      patch,
    };
  } catch {
    return null;
  }
}
//@ chunk-wyqg6m3h.js:19052-19107 fingerprint (2.1.88 match: isInTransientGitState, 0.849)
var TRANSIENT_STATE_FILES = ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD"];
export {
  getDiffRepoRoot,
  getDiffCwd,
  fetchGitDiff,
  fetchGitDiff_2,
  diffBaseRef,
  isDiffCwdInRepoCached,
  getRepoTopLevel,
  standardRepoLayout,
  shouldSendToolDiff,
  fetchSingleFileGitDiff,
  isPatchWithinSizeLimit,
  unquoteGitPathBytes,
  parseGitDiff,
  MAX_HUNK_LINE_COUNT,
  GIT_DIFF_TIMEOUT_MS,
  isSafeRelativeDiffPath,
  UNSAFE_PATH_CHAR_PATTERN,
  MAX_SINGLE_FILE_DIFF_BYTES,
  parseShortstat,
  parseRawNumstat,
  TRANSIENT_STATE_FILES,
};
