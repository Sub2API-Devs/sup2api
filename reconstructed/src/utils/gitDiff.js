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

//@ chunk-6vnxsn99.js:44679-44798 fingerprint = fetchGitDiffHunks (0.599)
/**
 * git diff 的固定参数与限制常量：单次超时 5000ms、按文件统计上限 50 个、超过 500 个文件只给总计、单文件 1MB 等。
 */
var GIT_DIFF_BASE_ARGS = [
  "--no-optional-locks",
  "-c",
  "diff.relative=false",
  "diff",
  ...PLAIN_PATCH_FLAGS,
  IGNORE_SUBMODULES_DIRTY_FLAG,
];
var GIT_DIFF_TIMEOUT_MS = 5000;
var MAX_DIFF_FILES = 50;
var MAX_TOTAL_FILES_FOR_PER_FILE_STATS = 500;
var MAX_SINGLE_FILE_DIFF_BYTES = 1e6;
var MAX_HUNK_LINE_COUNT = 400;
var MAX_FILES_FOR_STATS = 500;
//@ chunk-6vnxsn99.js:44798-45605 layout
/**
 * 按模式（auto/branch）计算 diff：working-tree 对 HEAD，或分支相对默认分支 merge-base 的变更；无 HEAD 时走新仓库路径。
 */
async function fetchGitDiff(e, abortSignal, r = "auto", o, s) {
  if (o === undefined && !isDiffCwdInRepoCached()) return null;
  if (await isInTransientGitOperation(abortSignal, o, s)) return null;
  if (r === "branch") {
    let branchDiff = await fetchBranchDiff(e, abortSignal, true, o, undefined, s);
    return branchDiff === "base-stats-failed" ? null : branchDiff;
  }
  let diffStats = await fetchDiffStats("HEAD", abortSignal, o, s);
  if (diffStats === null) return fetchDiffWithoutHead(abortSignal, o, s);
  if (diffStats.stats.filesCount > MAX_FILES_FOR_STATS)
    return {
      ...diffStats,
      hunks: new Map(),
      source: {
        kind: "working-tree",
      },
    };
  if (r === "session") {
    await Promise.all([
      markPreSessionFiles(diffStats, o),
      appendUntrackedToDiffStats(diffStats, abortSignal, o, undefined, true, s),
    ]);
    return {
      ...diffStats,
      hunks: new Map(),
      source: {
        kind: "working-tree",
      },
    };
  }
  let u = await appendUntrackedToDiffStats(diffStats, abortSignal, o, undefined, false, s);
  if (r === "branch-point") return fetchDiffAgainstBase(e, abortSignal, diffStats, o, s);
  if (r === "uncommitted" || diffStats.stats.filesCount > 0)
    return {
      ...diffStats,
      hunks: new Map(),
      source: {
        kind: "working-tree",
      },
    };
  let branchDiff = await fetchBranchDiff(e, abortSignal, false, o, u, s);
  let p = {
    ...diffStats,
    hunks: new Map(),
    source: {
      kind: "working-tree",
    },
  };
  if (branchDiff === "base-stats-failed") return nonEmptyDiffOrNull(p, o);
  if (branchDiff === null || branchDiff.stats.filesCount === 0) return p;
  return branchDiff;
}
//@ chunk-6vnxsn99.js:45605-45669 layout
function nonEmptyDiffOrNull(e, n) {
  return n === undefined || e.stats.filesCount > 0 ? e : null;
}
//@ chunk-6vnxsn99.js:45669-46207 layout
async function fetchBranchDiff(e, n, r, o, s, a) {
  let diffBaseLogged = await resolveDiffBaseLogged(e, n, o, undefined, a);
  if (diffBaseLogged.kind === "error") return r ? fetchDiffWithoutHead(n, o, a) : null;
  let h;
  let p;
  if (diffBaseLogged.kind !== "merge-base") {
    if (!r) return null;
    h = await fetchDiffStats("HEAD", n, o, a);
    p =
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
    h = await fetchDiffStats(diffBaseLogged.mergeBase, n, o, a);
    p = {
      kind: "branch",
      baseBranch: diffBaseLogged.baseBranch,
      baseRef: diffBaseLogged.mergeBase,
    };
  }
  if (h === null)
    return diffBaseLogged.kind === "merge-base" ? "base-stats-failed" : fetchDiffWithoutHead(n, o, a);
  if (h.stats.filesCount <= MAX_FILES_FOR_STATS) await appendUntrackedToDiffStats(h, n, o, s, false, a);
  return {
    ...h,
    hunks: new Map(),
    source: p,
  };
}
//@ chunk-6vnxsn99.js:46207-46962 layout
async function fetchDiffAgainstBase(e, n, diffStats, o, s) {
  let a = {
    ...diffStats,
    hunks: new Map(),
    source: {
      kind: "working-tree",
    },
  };
  let diffBaseRef = getDiffBaseRef(o ?? getDiffRepoRoot());
  if (diffBaseRef === null) return a;
  let diffBaseLogged = await resolveDiffBaseLogged(e, n, o, diffBaseRef, s);
  if (diffBaseLogged.kind !== "merge-base") return a;
  let diffStats_2 = await fetchDiffStats(diffBaseLogged.mergeBase, n, o, s, MAX_FILES_FOR_STATS);
  if (diffStats_2 === null) return nonEmptyDiffOrNull(a, o);
  if (diffStats_2.stats.filesCount === 0) return a;
  let S = {
    ...diffStats_2.stats,
  };
  let y = new Map();
  for (let [T, b] of diffStats.perFileStats) {
    let w = diffStats_2.perFileStats.get(T);
    if (!b.isUntracked) {
      let { previousPath, newPath, ...x } = b;
      y.set(T, w ?? (b.previousPath === undefined ? b : x));
      continue;
    }
    y.set(T, b);
    if (w === undefined) S.filesCount += 1;
    else {
      S.linesAdded -= w.added;
      S.linesRemoved -= w.removed;
    }
  }
  for (let [T, b] of diffStats_2.perFileStats) {
    if (y.size >= MAX_DIFF_FILES) break;
    if (!y.has(T)) y.set(T, b);
  }
  return {
    stats: S,
    perFileStats: y,
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
async function markPreSessionFiles(diffStats, n) {
  if (diffStats.perFileStats.size === 0) return;
  let r = n ?? getDiffRepoRoot();
  let sessionStartTime = getSessionStartTime();
  await Promise.all(
    Array.from(diffStats.perFileStats, async ([s, a]) => {
      try {
        let u = await lstat(join(r, s));
        if (Math.max(u.mtimeMs, u.ctimeMs) < sessionStartTime) a.preSession = true;
      } catch {}
    }),
  );
}
//@ chunk-6vnxsn99.js:47191-47425 layout
async function appendUntrackedToDiffStats(diffStats, abortSignal, r, o, s = false, a) {
  let maxFiles = MAX_DIFF_FILES - diffStats.perFileStats.size;
  if (maxFiles <= 0) return null;
  let h = o !== undefined ? o : await fetchUntrackedFiles(maxFiles, abortSignal, r, s, a);
  if (h)
    for (let [p, S] of h) {
      if (diffStats.perFileStats.has(p)) continue;
      diffStats.perFileStats.set(p, S);
      diffStats.stats.filesCount += 1;
    }
  return h;
}
//@ chunk-6vnxsn99.js:47425-47963 layout
async function fetchDiffWithoutHead(e, n, r) {
  if (
    (
      await execFileNoThrow(gitExe(), ["--no-optional-locks", "rev-parse", "--verify", "--quiet", "HEAD"], {
        timeout: GIT_DIFF_TIMEOUT_MS,
        preserveOutputOnError: false,
        abortSignal: e,
        ...resolveGitEnv(n, r),
        cwd: n,
      })
    ).exitCode !== 1
  )
    return null;
  let s = {
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
  let diffStats = await fetchDiffStats("--cached", e, n, r);
  if (diffStats !== null) {
    s.stats = diffStats.stats;
    s.perFileStats = diffStats.perFileStats;
    if (diffStats.stats.filesCount > MAX_FILES_FOR_STATS) return s;
    if (diffStats.stats.filesCount > 0) await parseGitNumstat(s, e, n, r);
  }
  await appendUntrackedToDiffStats(s, e, n, undefined, false, r);
  return s;
}
//@ chunk-6vnxsn99.js:47963-48319 fingerprint = parseGitNumstat (0.756)
/**
 * 解析 git diff --numstat 输出为 {path: {added, removed, isBinary}}。
 */
async function parseGitNumstat(e, n, r, o) {
  let workingTreeNumstat = await fetchWorkingTreeNumstat(n, r, o);
  if (workingTreeNumstat === null) return;
  for (let [a, u] of workingTreeNumstat.perFileStats) {
    let h = e.perFileStats.get(a);
    if (h === undefined) continue;
    let isBinary = h.isBinary || u.isBinary;
    let S = isBinary ? 0 : Math.max(0, h.added + u.added - u.removed);
    e.stats.linesAdded += S - h.added;
    e.perFileStats.set(a, {
      ...h,
      added: S,
      removed: 0,
      isBinary,
      ...(u.status === "removed" && {
        status: "removed",
      }),
    });
  }
}
//@ chunk-6vnxsn99.js:48319-48731 layout
async function fetchWorkingTreeNumstat(signal, repoDir, r) {
  if (isStorageDiffMode(r)) {
    let s =
      repoDir === undefined
        ? null
        : await readWorkTreeDiffViaIndex(
            repoDir,
            r,
            {
              from: "index",
              to: "work-tree",
            },
            GIT_DIFF_TIMEOUT_MS,
            signal,
          );
    return s === null ? null : parseRawNumstat(s, Number.POSITIVE_INFINITY, "within-root");
  }
  let o = await execFileNoThrow(gitExe(), [...GIT_DIFF_BASE_ARGS, "--raw", "--numstat"], {
    timeout: GIT_DIFF_TIMEOUT_MS,
    preserveOutputOnError: false,
    abortSignal: signal,
    ...resolveGitEnv(repoDir, r, {
      userLocale: true,
    }),
    cwd: repoDir,
  });
  if (o.code !== 0) return null;
  return parseRawNumstat(o.stdout, Number.POSITIVE_INFINITY, r === undefined ? "all" : "within-root");
}
//@ chunk-6vnxsn99.js:48731-48771 layout
function isStorageDiffMode(e) {
  return e !== undefined && hasRunnerDeclaredNestedRepoDiff();
}
//@ chunk-6vnxsn99.js:48771-49351 layout
/**
 * 对指定基准运行 git diff --shortstat/--numstat，返回总计与逐文件统计（文件过多时只给总计）。
 */
async function fetchDiffStats(e, signal, repoDir, o, s = MAX_DIFF_FILES) {
  if (o === undefined) {
    let { stdout, code } = await execGitDiffNoThrow([e, "--shortstat"], signal, repoDir, o);
    if (code === 0) {
      let shortstat = parseShortstat(stdout);
      if (shortstat && shortstat.filesCount > MAX_FILES_FOR_STATS)
        return {
          stats: shortstat,
          perFileStats: new Map(),
        };
    }
  }
  let a;
  if (isStorageDiffMode(o)) {
    let h =
      repoDir === undefined
        ? null
        : await readWorkTreeDiffViaIndex(
            repoDir,
            o,
            e === "--cached"
              ? {
                  from: "nothing",
                  to: "index",
                }
              : {
                  from: "commit",
                  revision: e,
                  to: "work-tree",
                },
            GIT_DIFF_TIMEOUT_MS,
            signal,
          );
    if (h === null) return null;
    a = h;
  } else {
    let { stdout, code } = await execGitDiffNoThrow([e, "--raw", "--numstat"], signal, repoDir, o);
    if (code !== 0) return null;
    a = stdout;
  }
  let rawNumstat = parseRawNumstat(a, s, o === undefined ? "all" : "within-root");
  if (o !== undefined && rawNumstat.stats.filesCount > MAX_FILES_FOR_STATS)
    return {
      stats: rawNumstat.stats,
      perFileStats: new Map(),
    };
  return rawNumstat;
}
//@ chunk-6vnxsn99.js:49351-49547 placement = execFileNoThrow (0.676)
/**
 * 运行 git diff 系列命令（不抛异常），给定 cwd 时附带额外环境。切分上属 utils/gitDiff。
 */
function execGitDiffNoThrow(e, abortSignal, r, o) {
  let s = [...GIT_DIFF_BASE_ARGS, ...e];
  let a = {
    timeout: GIT_DIFF_TIMEOUT_MS,
    preserveOutputOnError: false,
    abortSignal,
  };
  if (r !== undefined)
    return execFileNoThrow(gitExe(), s, {
      ...a,
      ...resolveGitEnv(r, o),
      cwd: r,
      stdin: "ignore",
    });
  return gitReadInOwnWorkTree(getFsImplementation().cwd(), s, {}, a);
}
//@ chunk-6vnxsn99.js:49547-49651 placement
function standardRepoLayout(e) {
  let gitDirs = resolveGitDirs(e);
  return gitDirs !== null && gitDirs.workTree !== null && gitDirs.gitDir === join(gitDirs.workTree, ".git")
    ? gitDirs
    : null;
}
//@ chunk-6vnxsn99.js:49651-49841 placement
function getRepoGitEnv(e) {
  return {
    env: {
      ...getRemoteHostSessionCount(GIT_FILES_REF_BACKEND_ENV, {
        base: subprocessEnv(),
        repository: standardRepoLayout(e) ?? {
          gitDir: NOT_A_GIT_REPO_PATH,
          workTree: e,
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
function resolveGitEnv(workTree, n, { userLocale: r } = {}) {
  if (workTree === undefined)
    return {
      env: getRemoteHostSessionCount(undefined, {
        userLocale: r,
      }),
    };
  return n ?? getNonRepoGitEnv(workTree);
}
//@ chunk-6vnxsn99.js:50106-50210 placement
function diffBaseRef(result) {
  if (result.noCommits) return "--cached";
  return result.source.kind === "branch" ? result.source.baseRef : "HEAD";
}
//@ chunk-6vnxsn99.js:50210-50701 fingerprint = fetchGitDiff (0.559)
/**
 * /diff 等用的工作区 diff 统计入口：合并/变基中返回 null；先 --shortstat 判断规模（超过 500 文件只给总数），再 --numstat 取最多 50 个文件的增删行，并补充未跟踪文件。
 */
async function fetchGitDiff_2(abortSignal, n = "HEAD") {
  if (!isDiffCwdInRepoCached()) return null;
  if (await isInTransientGitOperation(abortSignal, undefined, undefined)) return null;
  let { stdout: shortstatOut, code: shortstatCode } = await execGitDiffNoThrow(
    [n, "--shortstat"],
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
    [...RAW_BLOB_DIFF_FLAGS, n],
    abortSignal,
    undefined,
    undefined,
  );
  if (numstatCode !== 0) return null;
  let quickStats = parseGitDiff(numstatOut);
  if (n === "--cached" && quickStats.hunks.size > 0) {
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
  let r = diffCheckoutIsRepo.get(diffCwd);
  if (r !== undefined) return r;
  let o = findGitRootRecheckingNegative(diffCwd) !== null;
  diffCheckoutIsRepo.set(diffCwd, o);
  return o;
}
//@ chunk-6vnxsn99.js:50860-50903 layout
function getDiffRepoRoot() {
  let diffCwd = getDiffCwd();
  return findGitRoot(diffCwd) ?? diffCwd;
}
//@ chunk-6vnxsn99.js:50903-51159 layout
async function getRepoTopLevel(abortSignal, n) {
  let { stdout, code } = await execFileNoThrow(
    gitExe(),
    ["--no-optional-locks", "rev-parse", "--show-toplevel"],
    {
      timeout: GIT_DIFF_TIMEOUT_MS,
      preserveOutputOnError: false,
      abortSignal,
      ...(n === undefined
        ? {
            env: getRemoteHostSessionCount(),
          }
        : getRepoGitEnv(n)),
      cwd: n,
    },
  );
  if (code !== 0 || stdout.trim() === "") return null;
  return stdout.trim();
}
//@ chunk-6vnxsn99.js:51159-52096 layout
/**
 * 解析 git diff --raw --numstat 组合输出：raw 行给状态与路径（含重命名），numstat 行给行数。
 */
function parseRawNumstat(stdout, n = MAX_DIFF_FILES, r = "all") {
  let filtered = stdout
    .split(
      `
`,
    )
    .filter(Boolean);
  let filtered_2 = filtered.filter((w) => w.startsWith(":"));
  let filtered_3 = filtered.filter((w) => !w.startsWith(":") && countCharInString(w, "\t") + 1 >= 3);
  let u = filtered_2.length === filtered_3.length;
  let h = new Map();
  if (!u)
    for (let [w, E] of filtered_2.entries()) {
      let [, A = "", x] = E.split("\t");
      let O = x === undefined ? A : formatRenamePath(A, x);
      let R = h.get(O);
      if (R === undefined)
        h.set(O, {
          indices: [w],
          next: 0,
        });
      else R.indices.push(w);
    }
  let p = 0;
  let linesAdded = 0;
  let linesRemoved = 0;
  let T = 0;
  let b = new Map();
  for (let [w, E] of filtered_3.entries()) {
    let parts = E.split("\t");
    let joined = parts.slice(2).join("\t");
    let O = u ? filtered_2[w] : undefined;
    let R = h.get(joined);
    if (R !== undefined) {
      while (R.next < R.indices.length && R.indices[R.next] < p) R.next++;
      let B = R.indices[R.next];
      if (B !== undefined) {
        R.next++;
        p = B + 1;
        O = filtered_2[B];
      }
    }
    if (r === "within-root" && !isSafeRelativeDiffPath(joined)) continue;
    T++;
    let F = parts[0];
    let P = parts[1];
    let D = F === "-" || P === "-";
    let fileAdded = D ? 0 : parseInt(F ?? "0", 10) || 0;
    let fileRemoved = D ? 0 : parseInt(P ?? "0", 10) || 0;
    linesAdded += fileAdded;
    linesRemoved += fileRemoved;
    if (b.size < n) {
      let B = b.has(joined);
      b.set(joined, {
        added: fileAdded,
        removed: fileRemoved,
        isBinary: D,
        isUntracked: false,
        ...(O !== undefined && parseRawDiffLine(O, B)),
      });
    }
  }
  return {
    stats: {
      filesCount: T,
      linesAdded,
      linesRemoved,
    },
    perFileStats: b,
  };
}
//@ chunk-6vnxsn99.js:52096-52545 layout
function formatRenamePath(e, n) {
  if (e.startsWith('"') || n.startsWith('"')) return `${e} => ${n}`;
  let r = 0;
  for (let j = 0; j < e.length && j < n.length && e[j] === n[j]; j++) if (e[j] === "/") r = j + 1;
  let o = r === 0 ? 0 : r - 1;
  let s = 0;
  for (let S = e.length - 1, y = n.length - 1; S >= o && y >= o && e[S] === n[y]; S--, y--)
    if (e[S] === "/") s = e.length - S;
  if (r + s === 0) return `${e} => ${n}`;
  let sliced = e.slice(0, r);
  let sliced_2 = e.slice(e.length - s);
  let sliced_3 = e.slice(r, Math.max(r, e.length - s));
  let sliced_4 = n.slice(r, Math.max(r, n.length - s));
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
function parseRawDiffLine(e, n) {
  let [r, o, s] = e.split("\t");
  let a = r.slice(r.lastIndexOf(" ") + 1)[0];
  let status = DIFF_STATUS_NAMES[a] ?? "modified";
  let h = sanitizeDiffPath(s ?? o);
  if (n || h === undefined)
    return {
      status,
    };
  if (s === undefined)
    return o.startsWith('"')
      ? {
          status,
          newPath: h,
        }
      : {
          status,
        };
  let p = sanitizeDiffPath(o);
  return p === undefined
    ? {
        status,
      }
    : {
        status,
        previousPath: p,
        newPath: h,
      };
}
//@ chunk-6vnxsn99.js:52889-53064 layout
function sanitizeDiffPath(e) {
  let n = e.startsWith('"') ? unquoteGitPathBytes(e.slice(1, -1)) : e;
  return !hasUnsafePathGlyphsOrSurrogate(n) &&
    !UNSAFE_PATH_CHAR_PATTERN.test(n) &&
    !/\\|^[A-Za-z]:| => /.test(n) &&
    !isAbsolute(n) &&
    n.split("/").every((o) => stripTrailingDotsSpaces(o) !== "..")
    ? n
    : undefined;
}
//@ chunk-6vnxsn99.js:53064-53217 layout
function isSafeRelativeDiffPath(e) {
  let diffPathPair = parseDiffPathPair(e);
  return (
    diffPathPair !== null &&
    diffPathPair.every(
      (r) =>
        !isAbsolute(r) &&
        !win32.isAbsolute(r) &&
        !/^[A-Za-z]:/.test(r) &&
        r.split(/[/\\{}]/).every((o) => stripTrailingDotsSpaces(o) !== ".."),
    )
  );
}
//@ chunk-6vnxsn99.js:53217-54055 layout
function parseDiffPathPair(e) {
  if (e.startsWith('"')) {
    let closingQuote = findClosingQuote(e);
    if (closingQuote === -1) return null;
    let p = unquoteGitPathBytes(e.slice(1, closingQuote));
    let sliced = e.slice(closingQuote + 1);
    if (sliced === "") return [p];
    let y = sliced.startsWith(" => ") ? sliced.slice(4) : null;
    if (y === null) return null;
    if (!y.startsWith('"')) return y.includes('"') || y.includes(" => ") ? null : [p, y];
    return findClosingQuote(y) === y.length - 1 ? [p, unquoteGitPathBytes(y.slice(1, -1))] : null;
  }
  let index = e.indexOf(" => ");
  if (index === -1) return e.includes('"') ? null : [e];
  if (e.indexOf(" => ", index + 1) !== -1) return null;
  let sliced = e.slice(0, index);
  let sliced_2 = e.slice(index + 4);
  if (sliced.includes('"')) return null;
  if (sliced_2.startsWith('"'))
    return findClosingQuote(sliced_2) === sliced_2.length - 1
      ? [sliced, unquoteGitPathBytes(sliced_2.slice(1, -1))]
      : null;
  if (sliced_2.includes('"')) return null;
  let s = [sliced, sliced_2];
  let index_2 = sliced.indexOf("{");
  let index_3 = sliced_2.indexOf("}");
  if (sliced.indexOf("{", index_2 + 1) !== -1 || sliced_2.indexOf("}", index_3 + 1) !== -1) return null;
  if (index_2 !== -1 && index_3 !== -1) {
    let sliced_3 = sliced.slice(0, index_2);
    let sliced_4 = sliced_2.slice(index_3 + 1);
    s.push(
      `${sliced_3}${sliced.slice(index_2 + 1)}${sliced_4}`,
      `${sliced_3}${sliced_2.slice(0, index_3)}${sliced_4}`,
    );
  }
  return s;
}
//@ chunk-6vnxsn99.js:54055-54153 layout
function findClosingQuote(e) {
  for (let j = 1; j < e.length; j++)
    if (e[j] === "\\") j++;
    else if (e[j] === '"') return j;
  return -1;
}
//@ chunk-6vnxsn99.js:54153-54194 layout
var UNSAFE_PATH_CHAR_PATTERN = new RegExp(`[${INVISIBLE_CHAR_CLASS_SOURCE}\\uFFFD]`, "u");
//@ chunk-6vnxsn99.js:54194-54582 layout
/**
 * 还原 git 带引号路径中的反斜杠转义（八进制字节、\t 等）为 UTF-8 字符串。
 */
function unquoteGitPathBytes(e) {
  let n = [];
  let list = Array.from(e);
  for (let j = 0; j < list.length; j++) {
    let s = list[j];
    if (s !== "\\") {
      n.push(...Buffer.from(s, "utf8"));
      continue;
    }
    let a = list[j + 1] ?? "";
    let joined = list.slice(j + 1, j + 4).join("");
    if (/^[0-3][0-7]{2}$/.test(joined)) {
      n.push(parseInt(joined, 8));
      j += 3;
      continue;
    }
    let p = {
      n: 10,
      t: 9,
      r: 13,
      b: 8,
      a: 7,
      f: 12,
      v: 11,
      '"': 34,
      "\\": 92,
    }[a];
    if (p !== undefined) {
      n.push(p);
      j += 1;
    } else n.push(92);
  }
  return Buffer.from(n).toString("utf8");
}
//@ chunk-6vnxsn99.js:54582-55767 fingerprint = parseGitDiff (0.959)
/**
 * 把统一 diff 文本解析成按文件的 hunk 列表。
 */
function parseGitDiff(stdout) {
  let result = new Map();
  let r = new Set();
  if (!stdout.trim())
    return {
      hunks: result,
      skippedLarge: r,
    };
  let fileDiffs = stdout.split(/^diff --git /m).filter(Boolean);
  for (let fileDiff of fileDiffs) {
    if (result.size + r.size >= MAX_DIFF_FILES) break;
    let index = fileDiff.indexOf(`
`);
    let u = index === -1 ? fileDiff : fileDiff.slice(0, index);
    let match = u.match(/^a\/(.+) b\/\1$/);
    let p = match ?? u.match(/^(?:"a\/((?:[^"\\]|\\.)*)"|a\/(.+?)) (?:"b\/((?:[^"\\]|\\.)*)"|b\/(.+))$/);
    if (!p) continue;
    let filePath = match
      ? match[1]
      : p[3] !== undefined
        ? unquoteGitPathBytes(p[3])
        : (p[4] ?? (p[1] !== undefined ? unquoteGitPathBytes(p[1]) : (p[2] ?? "")));
    if (fileDiff.length > MAX_SINGLE_FILE_DIFF_BYTES) {
      r.add(filePath);
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
    skippedLarge: r,
  };
}
//@ chunk-6vnxsn99.js:55767-56289 layout
/**
 * git 是否处于临时操作中（MERGE_HEAD、REBASE_HEAD、CHERRY_PICK_HEAD、REVERT_HEAD、rebase-merge 等存在），此时跳过 diff。
 */
async function isInTransientGitOperation(abortSignal, n, r) {
  let gitDir = await getGitDir(n ?? getDiffCwd());
  if (!gitDir) return false;
  let transientFiles = [
    "MERGE_HEAD",
    "REBASE_HEAD",
    "CHERRY_PICK_HEAD",
    "REVERT_HEAD",
    "rebase-merge",
    join("rebase-apply", "rebasing"),
  ];
  let [a, u, h, p, S, y] = await Promise.all(
    transientFiles.map((file) =>
      access(join(gitDir, file))
        .then(() => true)
        .catch(() => false),
    ),
  );
  let T = S || y;
  if (a || h || p || (u && T)) return true;
  if (isStorageDiffMode(r)) return false;
  let existingRefs = await findExistingRefs(
    gitDir,
    T ? [...SEQUENCER_STATE_FILES, "REBASE_HEAD"] : SEQUENCER_STATE_FILES,
    async (w) =>
      (
        await execFileNoThrow(gitExe(), ["--no-optional-locks", ...w], {
          timeout: GIT_DIFF_TIMEOUT_MS,
          preserveOutputOnError: false,
          abortSignal,
          ...resolveGitEnv(n, r),
          cwd: n,
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
var diffBaseLogRegistry = new HostScoped(() => new DiffBaseLogState());
//@ chunk-6vnxsn99.js:56494-56778 layout
async function resolveDiffBaseLogged(e, abortSignal, r, o, s) {
  let a = diffBaseLogRegistry.of(e);
  let diffBase = await resolveDiffBase(abortSignal, r, o, s);
  if (diffBase.kind === "error") {
    if (!a.baseResolveSadLogged) {
      a.markBaseResolveSadLogged();
      logFeatureSad("diff_base_resolve", diffBase.reason);
    }
  } else if (!a.baseResolveOkLogged) {
    a.markBaseResolveOkLogged();
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
async function resolveDiffBase(abortSignal, n, r, o) {
  let s = {
    timeout: GIT_DIFF_TIMEOUT_MS,
    abortSignal,
    ...resolveGitEnv(n, o),
  };
  let [branch, defaultBranch] = await Promise.all([getBranch(n, s), getDefaultBranch(n, s)]);
  if (!branch || branch === "HEAD")
    return {
      kind: "none",
    };
  let baseBranch = r ?? defaultBranch;
  if (
    baseBranch.startsWith("-") ||
    UNSAFE_PATH_CHAR_PATTERN.test(baseBranch) ||
    (r === undefined && /\.\.|[\s~^:?*[\\]|@\{/.test(baseBranch))
  )
    return {
      kind: "none",
    };
  let p = {
    ...s,
    preserveOutputOnError: false,
    cwd: n,
  };
  if (o !== undefined && hasRunnerDeclaredNestedRepoDiff()) {
    let T = await execFileNoThrow(
      gitExe(),
      ["--no-optional-locks", "merge-base", "HEAD", `refs/remotes/origin/${baseBranch}`],
      p,
    );
    if (T.code === 0 && T.stdout.trim()) return classifyMergeBase(T.stdout.trim(), baseBranch, p);
  }
  if (branch === baseBranch)
    return {
      kind: "head-is-base",
      baseBranch,
    };
  let S = false;
  let mergeBase = await findMergeBase(baseBranch, async (T) => {
    let b = await execFileNoThrow(gitExe(), T, p);
    if (b.exitCode === 1) S = true;
    return b;
  });
  if (!mergeBase) {
    if (S)
      return {
        kind: "none",
      };
    for (let T of [`refs/remotes/origin/${baseBranch}`, `refs/heads/${baseBranch}`]) {
      let b = await execFileNoThrow(
        gitExe(),
        ["--no-optional-locks", "show-ref", "--verify", "--quiet", T],
        p,
      );
      if (b.exitCode === 0 || b.exitCode === undefined)
        return {
          kind: "error",
          reason: "merge_base_failed",
        };
    }
    return {
      kind: "none",
    };
  }
  return classifyMergeBase(mergeBase, baseBranch, p);
}
//@ chunk-6vnxsn99.js:57702-57974 layout
async function classifyMergeBase(e, baseBranch, r) {
  let o = await execFileNoThrow(gitExe(), ["--no-optional-locks", "rev-parse", "HEAD"], r);
  if (o.code !== 0)
    return {
      kind: "error",
      reason: "head_rev_parse_failed",
    };
  if (o.stdout.trim() === e)
    return {
      kind: "head-is-base",
      baseBranch,
    };
  return {
    kind: "merge-base",
    mergeBase: e,
    baseBranch,
  };
}
//@ chunk-6vnxsn99.js:57974-58839 fingerprint = fetchUntrackedFiles (0.717)
/**
 * 列出未跟踪文件并估算行数，补进 diff 统计。
 */
async function fetchUntrackedFiles(maxFiles, abortSignal, r, o = false, s) {
  let { stdout, code } = await execFileNoThrow(
    gitExe(),
    ["--no-optional-locks", "ls-files", "--others", "--exclude-standard", "--full-name"],
    {
      timeout: GIT_DIFF_TIMEOUT_MS,
      preserveOutputOnError: false,
      abortSignal,
      ...resolveGitEnv(r, s),
      cwd: r,
    },
  );
  if (code !== 0) return null;
  let untrackedPaths = stdout
    .split(
      `
`,
    )
    .filter((line) => line !== "" && (s === undefined || isSafeRelativeDiffPath(line)));
  if (untrackedPaths.length === 0) return null;
  let p = r ?? getDiffRepoRoot();
  let sessionStartTime = getSessionStartTime();
  let results = await Promise.all(
    untrackedPaths.slice(0, MAX_TOTAL_FILES_FOR_PER_FILE_STATS).map(async (untrackedPath) => {
      try {
        let E = await lstat(join(p, untrackedPath));
        return {
          filePath: untrackedPath,
          preSession: Math.max(E.mtimeMs, E.ctimeMs) < sessionStartTime,
        };
      } catch {
        return {
          filePath: untrackedPath,
          preSession: false,
        };
      }
    }),
  );
  let filtered = results.filter((w) => !w.preSession);
  if (o) filtered.push(...results.filter((w) => w.preSession));
  if (filtered.length === 0) return null;
  let perFileStats = new Map();
  for (let { filePath, preSession } of filtered.slice(0, maxFiles)) {
    let A = filePath.startsWith('"') ? sanitizeDiffPath(filePath) : undefined;
    perFileStats.set(filePath, {
      added: 0,
      removed: 0,
      isBinary: false,
      isUntracked: true,
      status: "added",
      ...(A !== undefined && {
        newPath: A,
      }),
      ...(preSession && {
        preSession,
      }),
    });
  }
  return perFileStats;
}
//@ chunk-6vnxsn99.js:58839-59093 fingerprint = parseShortstat (1)
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
//@ chunk-6vnxsn99.js:59338-60133 fingerprint = fetchSingleFileGitDiff (0.753)
/**
 * 取单个文件相对基准的 diff（工具调用后展示/上报用）。
 */
async function fetchSingleFileGitDiff(absoluteFilePath) {
  let gitRoot = findGitRoot(dirname(absoluteFilePath));
  if (!gitRoot) return null;
  let r = await realpath(gitRoot).catch(() => null);
  if (r === null) return null;
  let cwd = await realpathGitDir(r);
  if (cwd === null) return null;
  let worktreeMainRepoPath = detectWorktreeMainRepoPath(cwd);
  let a = [getOriginalCwd(), ...(env.CLAUDE_CODE_REPO_CHECKOUTS ? getRepoCheckouts().values() : [])];
  let u = null;
  for (let b of a) {
    let checkoutPath = resolveCheckoutPath(b);
    if (checkoutPath === null) continue;
    let cwd_2 = await realpathGitDir(checkoutPath);
    if (cwd_2 === null) continue;
    if (cwd_2 === cwd) {
      u = cwd_2;
      break;
    }
    let worktreeMainRepoPath_2 = detectWorktreeMainRepoPath(cwd_2);
    if (u === null && worktreeMainRepoPath_2 === worktreeMainRepoPath) u = worktreeMainRepoPath_2;
  }
  if (u === null) return null;
  let h = {
    gitDir: u,
    workTree: r,
  };
  let gitPath = relative(gitRoot, absoluteFilePath).split(sep).join("/");
  let repository = getCachedRepository();
  let { code: lsFilesCode } = await runGitWithExplicitDirs(h, [
    "--no-optional-locks",
    "ls-files",
    "--error-unmatch",
    "--",
    gitPath,
  ]);
  if (lsFilesCode === 0) {
    let diffRef = await getDiffRef(h, gitRoot);
    let { stdout, code } = await runGitWithExplicitDirs(
      h,
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
//@ chunk-6vnxsn99.js:60133-60430 fingerprint = parseRawDiffToToolUseDiff (1)
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
async function findMergeBase(e, n) {
  let r = [];
  for (let u of [`origin/${e}`, e]) {
    let { stdout, code } = await n(["--no-optional-locks", "merge-base", "HEAD", u]);
    if (code === 0 && stdout.trim()) r.push(stdout.trim());
  }
  let [o, s] = r;
  if (!o) return null;
  if (!s || o === s) return o;
  let { code } = await n(["--no-optional-locks", "merge-base", "--is-ancestor", o, s]);
  return code === 0 ? s : o;
}
//@ chunk-6vnxsn99.js:60751-60833 layout
async function realpathGitDir(e) {
  let gitDir = await getGitDir(e);
  return gitDir === null ? null : realpath(gitDir).catch(() => null);
}
//@ chunk-6vnxsn99.js:60833-60939 placement = detectWorktreeMainRepoPath (0.742)
/**
 * 若 cwd 是 <repo>.git/worktrees/<name> 形式则返回主仓库 .git 路径，否则原样返回（切分上属 utils/gitDiff 一带）。
 */
function detectWorktreeMainRepoPath(cwd) {
  let n = dirname(cwd);
  let r = dirname(n);
  return basename(cwd) !== ".git" && basename(n) === "worktrees" && basename(r).endsWith(".git") ? r : cwd;
}
//@ chunk-6vnxsn99.js:60939-61102 layout
function runGitWithExplicitDirs({ gitDir, workTree }, r, { userLocale: o } = {}) {
  return execFileNoThrowWithCwd(gitExe(), [`--git-dir=${gitDir}`, `--work-tree=${workTree}`, ...r], {
    cwd: workTree,
    timeout: GIT_EXPLICIT_DIR_TIMEOUT_MS,
    env: getRemoteHostSessionCount(undefined, {
      userLocale: o,
    }),
  });
}
//@ chunk-6vnxsn99.js:61102-61233 layout
function getDiffBaseRef(e) {
  let n = checkoutNameForPath(e);
  let r = (n !== undefined ? getRepoBaseRefs().get(n) : undefined) || env.CLAUDE_CODE_BASE_REF;
  if (!r) return;
  return r.startsWith("-") ? null : r;
}
//@ chunk-6vnxsn99.js:61233-61524 fingerprint = getDiffRef (0.888)
async function getDiffRef(e, gitRoot) {
  let diffBaseRef = getDiffBaseRef(gitRoot);
  function o(u) {
    return runGitWithExplicitDirs(e, u);
  }
  if (diffBaseRef === undefined) {
    let defaultBranch = await getDefaultBranch();
    if (defaultBranch.startsWith("-")) return "HEAD";
    return (await findMergeBase(defaultBranch, o)) ?? "HEAD";
  }
  let { stdout, code } = await o(["--no-optional-locks", "merge-base", "HEAD", diffBaseRef ?? "HEAD"]);
  if (code === 0 && stdout.trim()) return stdout.trim();
  return "HEAD";
}
//@ chunk-6vnxsn99.js:61524-61830 fingerprint = generateSyntheticDiff (1)
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
//@ chunk-wyqg6m3h.js:19052-19107 fingerprint = isInTransientGitState (0.849)
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
