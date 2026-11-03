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
import { lstat, lstat as lstat_2, access, realpath, readFile } from "fs/promises";
import {
  join,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  win32,
  dirname,
  relative,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  basename,
} from "path";
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
import { lb } from "./git/gitSafeEnv.js";
import { getSessionStartTime, getOriginalCwd } from "../bootstrap/state.js";
import { execFileNoThrow, execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { readWorkTreeDiffViaIndex, ISOLATED_GIT_CONFIG_ENV } from "./git/gitIndexReader.js";
import { ere, vS } from "./remoteEnvironment.js";
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
import { Lee } from "./unsafePathGlyphs.js";
import { stripTrailingDotsSpaces } from "./ignorePatterns.js";
import { RS } from "./sanitization.js";
import { findExistingRefs, qot } from "./git/gitConfigFilters.js";
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
import { QSr } from "./file.js";

/**
 * git diff 的固定参数与限制常量：单次超时 5000ms、按文件统计上限 50 个、超过 500 个文件只给总计、单文件 1MB 等。
 */
//@ chunk-6vnxsn99.js:44679-44798 fingerprint = fetchGitDiffHunks (0.599)
var GIT_DIFF_BASE_ARGS = [
    "--no-optional-locks",
    "-c",
    "diff.relative=false",
    "diff",
    ...PLAIN_PATCH_FLAGS,
    lb,
  ],
  GIT_DIFF_TIMEOUT_MS = 5000,
  MAX_DIFF_FILES = 50,
  to = 500,
  OVr = 1e6,
  $hn = 400,
  J = 500;
/**
 * 按模式（auto/branch）计算 diff：working-tree 对 HEAD，或分支相对默认分支 merge-base 的变更；无 HEAD 时走新仓库路径。
 */
//@ chunk-6vnxsn99.js:44798-45605 layout
async function fetchGitDiff(e, n, r = "auto", o, s) {
  if (o === void 0 && !isDiffCwdInRepoCached()) return null;
  if (await isInTransientGitOperation(n, o, s)) return null;
  if (r === "branch") {
    let S = await fetchBranchDiff(e, n, !0, o, void 0, s);
    return S === "base-stats-failed" ? null : S;
  }
  let a = await fetchDiffStats("HEAD", n, o, s);
  if (a === null) return fetchDiffWithoutHead(n, o, s);
  if (a.stats.filesCount > J) return { ...a, hunks: new Map(), source: { kind: "working-tree" } };
  if (r === "session")
    return (
      await Promise.all([markPreSessionFiles(a, o), appendUntrackedToDiffStats(a, n, o, void 0, !0, s)]),
      { ...a, hunks: new Map(), source: { kind: "working-tree" } }
    );
  let u = await appendUntrackedToDiffStats(a, n, o, void 0, !1, s);
  if (r === "branch-point") return fetchDiffAgainstBase(e, n, a, o, s);
  if (r === "uncommitted" || a.stats.filesCount > 0)
    return { ...a, hunks: new Map(), source: { kind: "working-tree" } };
  let h = await fetchBranchDiff(e, n, !1, o, u, s),
    p = { ...a, hunks: new Map(), source: { kind: "working-tree" } };
  if (h === "base-stats-failed") return nonEmptyDiffOrNull(p, o);
  if (h === null || h.stats.filesCount === 0) return p;
  return h;
}
//@ chunk-6vnxsn99.js:45605-45669 layout
function nonEmptyDiffOrNull(e, n) {
  return n === void 0 || e.stats.filesCount > 0 ? e : null;
}
//@ chunk-6vnxsn99.js:45669-46207 layout
async function fetchBranchDiff(e, n, r, o, s, a) {
  let u = await resolveDiffBaseLogged(e, n, o, void 0, a);
  if (u.kind === "error") return r ? fetchDiffWithoutHead(n, o, a) : null;
  let h, p;
  if (u.kind !== "merge-base") {
    if (!r) return null;
    ((h = await fetchDiffStats("HEAD", n, o, a)),
      (p =
        u.kind === "head-is-base"
          ? { kind: "branch", baseBranch: u.baseBranch, baseRef: "HEAD" }
          : { kind: "working-tree" }));
  } else
    ((h = await fetchDiffStats(u.mergeBase, n, o, a)),
      (p = { kind: "branch", baseBranch: u.baseBranch, baseRef: u.mergeBase }));
  if (h === null) return u.kind === "merge-base" ? "base-stats-failed" : fetchDiffWithoutHead(n, o, a);
  if (h.stats.filesCount <= J) await appendUntrackedToDiffStats(h, n, o, s, !1, a);
  return { ...h, hunks: new Map(), source: p };
}
//@ chunk-6vnxsn99.js:46207-46962 layout
async function fetchDiffAgainstBase(e, n, r, o, s) {
  let a = { ...r, hunks: new Map(), source: { kind: "working-tree" } },
    u = getDiffBaseRef(o ?? getDiffRepoRoot());
  if (u === null) return a;
  let h = await resolveDiffBaseLogged(e, n, o, u, s);
  if (h.kind !== "merge-base") return a;
  let p = await fetchDiffStats(h.mergeBase, n, o, s, J);
  if (p === null) return nonEmptyDiffOrNull(a, o);
  if (p.stats.filesCount === 0) return a;
  let S = { ...p.stats },
    y = new Map();
  for (let [T, b] of r.perFileStats) {
    let w = p.perFileStats.get(T);
    if (!b.isUntracked) {
      let { previousPath: previousPath, newPath: newPath, ...x } = b;
      y.set(T, w ?? (b.previousPath === void 0 ? b : x));
      continue;
    }
    if ((y.set(T, b), w === void 0)) S.filesCount += 1;
    else ((S.linesAdded -= w.added), (S.linesRemoved -= w.removed));
  }
  for (let [T, b] of p.perFileStats) {
    if (y.size >= MAX_DIFF_FILES) break;
    if (!y.has(T)) y.set(T, b);
  }
  return {
    stats: S,
    perFileStats: y,
    hunks: new Map(),
    source: { kind: "branch", baseBranch: h.baseBranch, baseRef: h.mergeBase },
  };
}
/**
 * 把 mtime/ctime 早于会话开始的文件标记为 preSession（会话前就有的改动）。
 */
//@ chunk-6vnxsn99.js:46962-47191 layout
async function markPreSessionFiles(e, n) {
  if (e.perFileStats.size === 0) return;
  let r = n ?? getDiffRepoRoot(),
    o = getSessionStartTime();
  await Promise.all(
    Array.from(e.perFileStats, async ([s, a]) => {
      try {
        let u = await lstat(join(r, s));
        if (Math.max(u.mtimeMs, u.ctimeMs) < o) a.preSession = !0;
      } catch {}
    }),
  );
}
//@ chunk-6vnxsn99.js:47191-47425 layout
async function appendUntrackedToDiffStats(e, n, r, o, s = !1, a) {
  let u = MAX_DIFF_FILES - e.perFileStats.size;
  if (u <= 0) return null;
  let h = o !== void 0 ? o : await fetchUntrackedFiles(u, n, r, s, a);
  if (h)
    for (let [p, S] of h) {
      if (e.perFileStats.has(p)) continue;
      (e.perFileStats.set(p, S), (e.stats.filesCount += 1));
    }
  return h;
}
//@ chunk-6vnxsn99.js:47425-47963 layout
async function fetchDiffWithoutHead(e, n, r) {
  if (
    (
      await execFileNoThrow(gitExe(), ["--no-optional-locks", "rev-parse", "--verify", "--quiet", "HEAD"], {
        timeout: GIT_DIFF_TIMEOUT_MS,
        preserveOutputOnError: !1,
        abortSignal: e,
        ...resolveGitEnv(n, r),
        cwd: n,
      })
    ).exitCode !== 1
  )
    return null;
  let s = {
      stats: { filesCount: 0, linesAdded: 0, linesRemoved: 0 },
      perFileStats: new Map(),
      hunks: new Map(),
      source: { kind: "working-tree" },
      noCommits: !0,
    },
    a = await fetchDiffStats("--cached", e, n, r);
  if (a !== null) {
    if (((s.stats = a.stats), (s.perFileStats = a.perFileStats), a.stats.filesCount > J)) return s;
    if (a.stats.filesCount > 0) await parseGitNumstat(s, e, n, r);
  }
  return (await appendUntrackedToDiffStats(s, e, n, void 0, !1, r), s);
}
/**
 * 解析 git diff --numstat 输出为 {path: {added, removed, isBinary}}。
 */
//@ chunk-6vnxsn99.js:47963-48319 fingerprint = parseGitNumstat (0.756)
async function parseGitNumstat(e, n, r, o) {
  let s = await fetchWorkingTreeNumstat(n, r, o);
  if (s === null) return;
  for (let [a, u] of s.perFileStats) {
    let h = e.perFileStats.get(a);
    if (h === void 0) continue;
    let isBinary = h.isBinary || u.isBinary,
      S = isBinary ? 0 : Math.max(0, h.added + u.added - u.removed);
    ((e.stats.linesAdded += S - h.added),
      e.perFileStats.set(a, {
        ...h,
        added: S,
        removed: 0,
        isBinary: isBinary,
        ...(u.status === "removed" && { status: "removed" }),
      }));
  }
}
//@ chunk-6vnxsn99.js:48319-48731 layout
async function fetchWorkingTreeNumstat(e, n, r) {
  if (isStorageDiffMode(r)) {
    let s =
      n === void 0
        ? null
        : await readWorkTreeDiffViaIndex(n, r, { from: "index", to: "work-tree" }, GIT_DIFF_TIMEOUT_MS, e);
    return s === null ? null : parseRawNumstat(s, Number.POSITIVE_INFINITY, "within-root");
  }
  let o = await execFileNoThrow(gitExe(), [...GIT_DIFF_BASE_ARGS, "--raw", "--numstat"], {
    timeout: GIT_DIFF_TIMEOUT_MS,
    preserveOutputOnError: !1,
    abortSignal: e,
    ...resolveGitEnv(n, r, { userLocale: !0 }),
    cwd: n,
  });
  if (o.code !== 0) return null;
  return parseRawNumstat(o.stdout, Number.POSITIVE_INFINITY, r === void 0 ? "all" : "within-root");
}
//@ chunk-6vnxsn99.js:48731-48771 layout
function isStorageDiffMode(e) {
  return e !== void 0 && ere();
}
/**
 * 对指定基准运行 git diff --shortstat/--numstat，返回总计与逐文件统计（文件过多时只给总计）。
 */
//@ chunk-6vnxsn99.js:48771-49351 layout
async function fetchDiffStats(e, n, r, o, s = MAX_DIFF_FILES) {
  if (o === void 0) {
    let { stdout: stdout, code: code } = await execGitDiffNoThrow([e, "--shortstat"], n, r, o);
    if (code === 0) {
      let S = parseShortstat(stdout);
      if (S && S.filesCount > J) return { stats: S, perFileStats: new Map() };
    }
  }
  let a;
  if (isStorageDiffMode(o)) {
    let h =
      r === void 0
        ? null
        : await readWorkTreeDiffViaIndex(
            r,
            o,
            e === "--cached"
              ? { from: "nothing", to: "index" }
              : { from: "commit", revision: e, to: "work-tree" },
            GIT_DIFF_TIMEOUT_MS,
            n,
          );
    if (h === null) return null;
    a = h;
  } else {
    let { stdout: stdout, code: code } = await execGitDiffNoThrow([e, "--raw", "--numstat"], n, r, o);
    if (code !== 0) return null;
    a = stdout;
  }
  let u = parseRawNumstat(a, s, o === void 0 ? "all" : "within-root");
  if (o !== void 0 && u.stats.filesCount > J) return { stats: u.stats, perFileStats: new Map() };
  return u;
}
/**
 * 运行 git diff 系列命令（不抛异常），给定 cwd 时附带额外环境。切分上属 utils/gitDiff。
 */
//@ chunk-6vnxsn99.js:49351-49547 placement = execFileNoThrow (0.676)
function execGitDiffNoThrow(e, n, r, o) {
  let s = [...GIT_DIFF_BASE_ARGS, ...e],
    a = { timeout: GIT_DIFF_TIMEOUT_MS, preserveOutputOnError: !1, abortSignal: n };
  if (r !== void 0)
    return execFileNoThrow(gitExe(), s, { ...a, ...resolveGitEnv(r, o), cwd: r, stdin: "ignore" });
  return gitReadInOwnWorkTree(getFsImplementation().cwd(), s, {}, a);
}
//@ chunk-6vnxsn99.js:49547-49651 placement
function standardRepoLayout(e) {
  let n = resolveGitDirs(e);
  return n !== null && n.workTree !== null && n.gitDir === join(n.workTree, ".git") ? n : null;
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
      ...buildGitConfigEnv(void 0, getGitSafetyConfigPairs()),
      [CLAUDE_CODE_FOUND_REPOSITORY_GIT]: "1",
    },
    extendEnv: !1,
    gitStartsIn: GitStartFolderError.filesystemRoot(),
  };
}
//@ chunk-6vnxsn99.js:49841-50003 placement
function getNonRepoGitEnv(e) {
  return {
    env: {
      ...getRemoteHostSessionCount(GIT_FILES_REF_BACKEND_ENV, {
        base: subprocessEnv(),
        repository: { gitDir: NOT_A_GIT_REPO_PATH, workTree: e, commonDir: NOT_A_GIT_REPO_PATH },
      }),
      ...ISOLATED_GIT_CONFIG_ENV,
      [CLAUDE_CODE_FOUND_REPOSITORY_GIT]: "1",
    },
    extendEnv: !1,
    gitStartsIn: GitStartFolderError.filesystemRoot(),
  };
}
//@ chunk-6vnxsn99.js:50003-50106 placement
function resolveGitEnv(e, n, { userLocale: r } = {}) {
  if (e === void 0) return { env: getRemoteHostSessionCount(void 0, { userLocale: r }) };
  return n ?? getNonRepoGitEnv(e);
}
//@ chunk-6vnxsn99.js:50106-50210 placement
function diffBaseRef(e) {
  if (e.noCommits) return "--cached";
  return e.source.kind === "branch" ? e.source.baseRef : "HEAD";
}
/**
 * /diff 等用的工作区 diff 统计入口：合并/变基中返回 null；先 --shortstat 判断规模（超过 500 文件只给总数），再 --numstat 取最多 50 个文件的增删行，并补充未跟踪文件。
 */
//@ chunk-6vnxsn99.js:50210-50701 fingerprint = fetchGitDiff (0.559)
async function fetchGitDiff_2(e, n = "HEAD") {
  if (!isDiffCwdInRepoCached()) return null;
  if (await isInTransientGitOperation(e, void 0, void 0)) return null;
  let { stdout: stdout, code: code } = await execGitDiffNoThrow([n, "--shortstat"], e, void 0, void 0);
  if (code === 0) {
    let h = parseShortstat(stdout);
    if (h && h.filesCount > J) return { hunks: new Map(), skippedLarge: new Set() };
  }
  let { stdout: stdout_2, code: code_2 } = await execGitDiffNoThrow(
    [...RAW_BLOB_DIFF_FLAGS, n],
    e,
    void 0,
    void 0,
  );
  if (code_2 !== 0) return null;
  let quickStats = parseGitDiff(stdout_2);
  if (n === "--cached" && quickStats.hunks.size > 0) {
    let h = await fetchWorkingTreeNumstat(e, void 0, void 0);
    if (h === null) return null;
    for (let p of h.perFileStats.keys()) quickStats.hunks.delete(p);
  }
  return quickStats;
}
//@ chunk-6vnxsn99.js:50701-50734 layout
function getDiffCwd() {
  return getFsImplementation().cwd();
}
//@ chunk-6vnxsn99.js:50734-50860 layout
function isDiffCwdInRepoCached() {
  let e = getDiffCwd(),
    diffCheckoutIsRepo = getGitRepoCache().diffCheckoutIsRepo,
    r = diffCheckoutIsRepo.get(e);
  if (r !== void 0) return r;
  let o = findGitRootRecheckingNegative(e) !== null;
  return (diffCheckoutIsRepo.set(e, o), o);
}
//@ chunk-6vnxsn99.js:50860-50903 layout
function getDiffRepoRoot() {
  let e = getDiffCwd();
  return findGitRoot(e) ?? e;
}
//@ chunk-6vnxsn99.js:50903-51159 layout
async function getRepoTopLevel(e, n) {
  let { stdout: stdout, code: code } = await execFileNoThrow(
    gitExe(),
    ["--no-optional-locks", "rev-parse", "--show-toplevel"],
    {
      timeout: GIT_DIFF_TIMEOUT_MS,
      preserveOutputOnError: !1,
      abortSignal: e,
      ...(n === void 0 ? { env: getRemoteHostSessionCount() } : getRepoGitEnv(n)),
      cwd: n,
    },
  );
  if (code !== 0 || stdout.trim() === "") return null;
  return stdout.trim();
}
/**
 * 解析 git diff --raw --numstat 组合输出：raw 行给状态与路径（含重命名），numstat 行给行数。
 */
//@ chunk-6vnxsn99.js:51159-52096 layout
function parseRawNumstat(e, n = MAX_DIFF_FILES, r = "all") {
  let filtered = e
      .split(
        `
`,
      )
      .filter(Boolean),
    filtered_2 = filtered.filter((w) => w.startsWith(":")),
    filtered_3 = filtered.filter((w) => !w.startsWith(":") && countCharInString(w, "\t") + 1 >= 3),
    u = filtered_2.length === filtered_3.length,
    h = new Map();
  if (!u)
    for (let [w, E] of filtered_2.entries()) {
      let [, A = "", x] = E.split("\t"),
        O = x === void 0 ? A : formatRenamePath(A, x),
        R = h.get(O);
      if (R === void 0) h.set(O, { indices: [w], next: 0 });
      else R.indices.push(w);
    }
  let p = 0,
    S = 0,
    y = 0,
    T = 0,
    b = new Map();
  for (let [w, E] of filtered_3.entries()) {
    let parts = E.split("\t"),
      joined = parts.slice(2).join("\t"),
      O = u ? filtered_2[w] : void 0,
      R = h.get(joined);
    if (R !== void 0) {
      while (R.next < R.indices.length && R.indices[R.next] < p) R.next++;
      let B = R.indices[R.next];
      if (B !== void 0) (R.next++, (p = B + 1), (O = filtered_2[B]));
    }
    if (r === "within-root" && !isSafeRelativeDiffPath(joined)) continue;
    T++;
    let F = parts[0],
      P = parts[1],
      D = F === "-" || P === "-",
      M = D ? 0 : parseInt(F ?? "0", 10) || 0,
      G = D ? 0 : parseInt(P ?? "0", 10) || 0;
    if (((S += M), (y += G), b.size < n)) {
      let B = b.has(joined);
      b.set(joined, {
        added: M,
        removed: G,
        isBinary: D,
        isUntracked: !1,
        ...(O !== void 0 && parseRawDiffLine(O, B)),
      });
    }
  }
  return { stats: { filesCount: T, linesAdded: S, linesRemoved: y }, perFileStats: b };
}
//@ chunk-6vnxsn99.js:52096-52545 layout
function formatRenamePath(e, n) {
  if (e.startsWith('"') || n.startsWith('"')) return `${e} => ${n}`;
  let r = 0;
  for (let S = 0; S < e.length && S < n.length && e[S] === n[S]; S++) if (e[S] === "/") r = S + 1;
  let o = r === 0 ? 0 : r - 1,
    s = 0;
  for (let S = e.length - 1, y = n.length - 1; S >= o && y >= o && e[S] === n[y]; S--, y--)
    if (e[S] === "/") s = e.length - S;
  if (r + s === 0) return `${e} => ${n}`;
  let sliced = e.slice(0, r),
    sliced_2 = e.slice(e.length - s),
    sliced_3 = e.slice(r, Math.max(r, e.length - s)),
    sliced_4 = n.slice(r, Math.max(r, n.length - s));
  return `${sliced}{${sliced_3} => ${sliced_4}}${sliced_2}`;
}
//@ chunk-6vnxsn99.js:52545-52599 layout
var DIFF_STATUS_NAMES = { A: "added", D: "removed", R: "renamed", C: "copied" };
//@ chunk-6vnxsn99.js:52599-52889 layout
function parseRawDiffLine(e, n) {
  let [r, o, s] = e.split("\t"),
    a = r.slice(r.lastIndexOf(" ") + 1)[0],
    u = DIFF_STATUS_NAMES[a] ?? "modified",
    h = sanitizeDiffPath(s ?? o);
  if (n || h === void 0) return { status: u };
  if (s === void 0) return o.startsWith('"') ? { status: u, newPath: h } : { status: u };
  let p = sanitizeDiffPath(o);
  return p === void 0 ? { status: u } : { status: u, previousPath: p, newPath: h };
}
//@ chunk-6vnxsn99.js:52889-53064 layout
function sanitizeDiffPath(e) {
  let n = e.startsWith('"') ? unquoteGitPathBytes(e.slice(1, -1)) : e;
  return !Lee(n) &&
    !UNSAFE_PATH_CHAR_PATTERN.test(n) &&
    !/\\|^[A-Za-z]:| => /.test(n) &&
    !isAbsolute(n) &&
    n.split("/").every((o) => stripTrailingDotsSpaces(o) !== "..")
    ? n
    : void 0;
}
//@ chunk-6vnxsn99.js:53064-53217 layout
function isSafeRelativeDiffPath(e) {
  let n = parseDiffPathPair(e);
  return (
    n !== null &&
    n.every(
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
    let h = findClosingQuote(e);
    if (h === -1) return null;
    let p = unquoteGitPathBytes(e.slice(1, h)),
      sliced = e.slice(h + 1);
    if (sliced === "") return [p];
    let y = sliced.startsWith(" => ") ? sliced.slice(4) : null;
    if (y === null) return null;
    if (!y.startsWith('"')) return y.includes('"') || y.includes(" => ") ? null : [p, y];
    return findClosingQuote(y) === y.length - 1 ? [p, unquoteGitPathBytes(y.slice(1, -1))] : null;
  }
  let index = e.indexOf(" => ");
  if (index === -1) return e.includes('"') ? null : [e];
  if (e.indexOf(" => ", index + 1) !== -1) return null;
  let sliced = e.slice(0, index),
    sliced_2 = e.slice(index + 4);
  if (sliced.includes('"')) return null;
  if (sliced_2.startsWith('"'))
    return findClosingQuote(sliced_2) === sliced_2.length - 1
      ? [sliced, unquoteGitPathBytes(sliced_2.slice(1, -1))]
      : null;
  if (sliced_2.includes('"')) return null;
  let s = [sliced, sliced_2],
    index_2 = sliced.indexOf("{"),
    index_3 = sliced_2.indexOf("}");
  if (sliced.indexOf("{", index_2 + 1) !== -1 || sliced_2.indexOf("}", index_3 + 1) !== -1) return null;
  if (index_2 !== -1 && index_3 !== -1) {
    let sliced_3 = sliced.slice(0, index_2),
      sliced_4 = sliced_2.slice(index_3 + 1);
    s.push(
      `${sliced_3}${sliced.slice(index_2 + 1)}${sliced_4}`,
      `${sliced_3}${sliced_2.slice(0, index_3)}${sliced_4}`,
    );
  }
  return s;
}
//@ chunk-6vnxsn99.js:54055-54153 layout
function findClosingQuote(e) {
  for (let n = 1; n < e.length; n++)
    if (e[n] === "\\") n++;
    else if (e[n] === '"') return n;
  return -1;
}
//@ chunk-6vnxsn99.js:54153-54194 layout
var UNSAFE_PATH_CHAR_PATTERN = new RegExp(`[${RS}\\uFFFD]`, "u");
/**
 * 还原 git 带引号路径中的反斜杠转义（八进制字节、\t 等）为 UTF-8 字符串。
 */
//@ chunk-6vnxsn99.js:54194-54582 layout
function unquoteGitPathBytes(e) {
  let n = [],
    list = Array.from(e);
  for (let o = 0; o < list.length; o++) {
    let s = list[o];
    if (s !== "\\") {
      n.push(...Buffer.from(s, "utf8"));
      continue;
    }
    let a = list[o + 1] ?? "",
      joined = list.slice(o + 1, o + 4).join("");
    if (/^[0-3][0-7]{2}$/.test(joined)) {
      (n.push(parseInt(joined, 8)), (o += 3));
      continue;
    }
    let p = { n: 10, t: 9, r: 13, b: 8, a: 7, f: 12, v: 11, '"': 34, "\\": 92 }[a];
    if (p !== void 0) (n.push(p), (o += 1));
    else n.push(92);
  }
  return Buffer.from(n).toString("utf8");
}
/**
 * 把统一 diff 文本解析成按文件的 hunk 列表。
 */
//@ chunk-6vnxsn99.js:54582-55767 fingerprint = parseGitDiff (0.959)
function parseGitDiff(stdout) {
  let result = new Map(),
    r = new Set();
  if (!stdout.trim()) return { hunks: result, skippedLarge: r };
  let fileDiffs = stdout.split(/^diff --git /m).filter(Boolean);
  for (let fileDiff of fileDiffs) {
    if (result.size + r.size >= MAX_DIFF_FILES) break;
    let index = fileDiff.indexOf(`
`),
      u = index === -1 ? fileDiff : fileDiff.slice(0, index),
      match = u.match(/^a\/(.+) b\/\1$/),
      p = match ?? u.match(/^(?:"a\/((?:[^"\\]|\\.)*)"|a\/(.+?)) (?:"b\/((?:[^"\\]|\\.)*)"|b\/(.+))$/);
    if (!p) continue;
    let S = match
      ? match[1]
      : p[3] !== void 0
        ? unquoteGitPathBytes(p[3])
        : (p[4] ?? (p[1] !== void 0 ? unquoteGitPathBytes(p[1]) : (p[2] ?? "")));
    if (fileDiff.length > OVr) {
      r.add(S);
      continue;
    }
    let parts = fileDiff.split(`
`),
      fileHunks = [],
      currentHunk = null,
      lineCount = 0;
    for (let E = 1; E < parts.length; E++) {
      let A = parts[E] ?? "",
        hunkMatch = A.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
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
        (A.startsWith("index ") ||
          A.startsWith("---") ||
          A.startsWith("+++") ||
          A.startsWith("new file") ||
          A.startsWith("deleted file") ||
          A.startsWith("old mode") ||
          A.startsWith("new mode") ||
          A.startsWith("Binary files"))
      )
        continue;
      if (currentHunk && (A.startsWith("+") || A.startsWith("-") || A.startsWith(" ") || A === "")) {
        if (lineCount >= $hn) continue;
        (currentHunk.lines.push("" + A), lineCount++);
      }
    }
    if (currentHunk) fileHunks.push(currentHunk);
    if (fileHunks.length > 0) result.set(S, fileHunks);
  }
  return { hunks: result, skippedLarge: r };
}
/**
 * git 是否处于临时操作中（MERGE_HEAD、REBASE_HEAD、CHERRY_PICK_HEAD、REVERT_HEAD、rebase-merge 等存在），此时跳过 diff。
 */
//@ chunk-6vnxsn99.js:55767-56289 layout
async function isInTransientGitOperation(e, n, r) {
  let o = await getGitDir(n ?? getDiffCwd());
  if (!o) return !1;
  let s = [
      "MERGE_HEAD",
      "REBASE_HEAD",
      "CHERRY_PICK_HEAD",
      "REVERT_HEAD",
      "rebase-merge",
      join("rebase-apply", "rebasing"),
    ],
    [a, u, h, p, S, y] = await Promise.all(
      s.map((w) =>
        access(join(o, w))
          .then(() => !0)
          .catch(() => !1),
      ),
    ),
    T = S || y;
  if (a || h || p || (u && T)) return !0;
  if (isStorageDiffMode(r)) return !1;
  let b = await findExistingRefs(
    o,
    T ? [...qot, "REBASE_HEAD"] : qot,
    async (w) =>
      (
        await execFileNoThrow(gitExe(), ["--no-optional-locks", ...w], {
          timeout: GIT_DIFF_TIMEOUT_MS,
          preserveOutputOnError: !1,
          abortSignal: e,
          ...resolveGitEnv(n, r),
          cwd: n,
        })
      ).exitCode,
  );
  return b !== null && b.size > 0;
}
//@ chunk-6vnxsn99.js:56289-56469 layout
class DiffBaseLogState {
  #e = !1;
  #t = !1;
  get baseResolveOkLogged() {
    return this.#e;
  }
  get baseResolveSadLogged() {
    return this.#t;
  }
  markBaseResolveOkLogged() {
    this.#e = !0;
  }
  markBaseResolveSadLogged() {
    this.#t = !0;
  }
}
//@ chunk-6vnxsn99.js:56469-56494 layout
var po = new HostScoped(() => new DiffBaseLogState());
//@ chunk-6vnxsn99.js:56494-56778 layout
async function resolveDiffBaseLogged(e, n, r, o, s) {
  let of = po.of(e),
    u = await resolveDiffBase(n, r, o, s);
  if (u.kind === "error") {
    if (!of.baseResolveSadLogged)
      (of.markBaseResolveSadLogged(), logFeatureSad("diff_base_resolve", u.reason));
  } else if (!of.baseResolveOkLogged)
    (of.markBaseResolveOkLogged(), logFeatureOk("diff_base_resolve", { outcome: fromEnum(u.kind) }));
  return u;
}
/**
 * 解析 diff 基准：当前分支与默认分支（或 CLAUDE_CODE_BASE_REF）的 merge-base；ref 名含危险字符时返回 none。
 */
//@ chunk-6vnxsn99.js:56778-57702 layout
async function resolveDiffBase(e, n, r, o) {
  let s = { timeout: GIT_DIFF_TIMEOUT_MS, abortSignal: e, ...resolveGitEnv(n, o) },
    [a, u] = await Promise.all([getBranch(n, s), getDefaultBranch(n, s)]);
  if (!a || a === "HEAD") return { kind: "none" };
  let h = r ?? u;
  if (
    h.startsWith("-") ||
    UNSAFE_PATH_CHAR_PATTERN.test(h) ||
    (r === void 0 && /\.\.|[\s~^:?*[\\]|@\{/.test(h))
  )
    return { kind: "none" };
  let p = { ...s, preserveOutputOnError: !1, cwd: n };
  if (o !== void 0 && ere()) {
    let T = await execFileNoThrow(
      gitExe(),
      ["--no-optional-locks", "merge-base", "HEAD", `refs/remotes/origin/${h}`],
      p,
    );
    if (T.code === 0 && T.stdout.trim()) return classifyMergeBase(T.stdout.trim(), h, p);
  }
  if (a === h) return { kind: "head-is-base", baseBranch: h };
  let S = !1,
    y = await findMergeBase(h, async (T) => {
      let b = await execFileNoThrow(gitExe(), T, p);
      if (b.exitCode === 1) S = !0;
      return b;
    });
  if (!y) {
    if (S) return { kind: "none" };
    for (let T of [`refs/remotes/origin/${h}`, `refs/heads/${h}`]) {
      let b = await execFileNoThrow(
        gitExe(),
        ["--no-optional-locks", "show-ref", "--verify", "--quiet", T],
        p,
      );
      if (b.exitCode === 0 || b.exitCode === void 0) return { kind: "error", reason: "merge_base_failed" };
    }
    return { kind: "none" };
  }
  return classifyMergeBase(y, h, p);
}
//@ chunk-6vnxsn99.js:57702-57974 layout
async function classifyMergeBase(e, n, r) {
  let o = await execFileNoThrow(gitExe(), ["--no-optional-locks", "rev-parse", "HEAD"], r);
  if (o.code !== 0) return { kind: "error", reason: "head_rev_parse_failed" };
  if (o.stdout.trim() === e) return { kind: "head-is-base", baseBranch: n };
  return { kind: "merge-base", mergeBase: e, baseBranch: n };
}
/**
 * 列出未跟踪文件并估算行数，补进 diff 统计。
 */
//@ chunk-6vnxsn99.js:57974-58839 fingerprint = fetchUntrackedFiles (0.717)
async function fetchUntrackedFiles(e, n, r, o = !1, s) {
  let { stdout: stdout, code: code } = await execFileNoThrow(
    gitExe(),
    ["--no-optional-locks", "ls-files", "--others", "--exclude-standard", "--full-name"],
    {
      timeout: GIT_DIFF_TIMEOUT_MS,
      preserveOutputOnError: !1,
      abortSignal: n,
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
    .filter((w) => w !== "" && (s === void 0 || isSafeRelativeDiffPath(w)));
  if (untrackedPaths.length === 0) return null;
  let p = r ?? getDiffRepoRoot(),
    S = getSessionStartTime(),
    results = await Promise.all(
      untrackedPaths.slice(0, to).map(async (w) => {
        try {
          let E = await lstat(join(p, w));
          return { filePath: w, preSession: Math.max(E.mtimeMs, E.ctimeMs) < S };
        } catch {
          return { filePath: w, preSession: !1 };
        }
      }),
    ),
    filtered = results.filter((w) => !w.preSession);
  if (o) filtered.push(...results.filter((w) => w.preSession));
  if (filtered.length === 0) return null;
  let perFileStats = new Map();
  for (let { filePath: filePath, preSession: preSession } of filtered.slice(0, e)) {
    let A = filePath.startsWith('"') ? sanitizeDiffPath(filePath) : void 0;
    perFileStats.set(filePath, {
      added: 0,
      removed: 0,
      isBinary: !1,
      isUntracked: !0,
      status: "added",
      ...(A !== void 0 && { newPath: A }),
      ...(preSession && { preSession: preSession }),
    });
  }
  return perFileStats;
}
/**
 * 解析 `N files changed, X insertions, Y deletions`。
 */
//@ chunk-6vnxsn99.js:58839-59093 fingerprint = parseShortstat (1)
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
function shouldSendToolDiff({ gitDiffRead: gitDiffRead }) {
  if (!gitDiffRead) return !1;
  if (env.CLAUDE_CODE_REMOTE) return !0;
  return vS() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_child_tool_diff", !0);
}
//@ chunk-6vnxsn99.js:59233-59246 layout
var MAX_TOOL_DIFF_PATCH_BYTES = 65536;
//@ chunk-6vnxsn99.js:59246-59338 layout
function isPatchWithinSizeLimit(e) {
  return Boolean(env.CLAUDE_CODE_REMOTE) || Buffer.byteLength(e.patch, "utf8") <= MAX_TOOL_DIFF_PATCH_BYTES;
}
/**
 * 取单个文件相对基准的 diff（工具调用后展示/上报用）。
 */
//@ chunk-6vnxsn99.js:59338-60133 fingerprint = fetchSingleFileGitDiff (0.753)
async function fetchSingleFileGitDiff(absoluteFilePath) {
  let gitRoot = findGitRoot(dirname(absoluteFilePath));
  if (!gitRoot) return null;
  let r = await realpath(gitRoot).catch(() => null);
  if (r === null) return null;
  let o = await nn(r);
  if (o === null) return null;
  let s = detectWorktreeMainRepoPath(o),
    a = [getOriginalCwd(), ...(env.CLAUDE_CODE_REPO_CHECKOUTS ? getRepoCheckouts().values() : [])],
    u = null;
  for (let b of a) {
    let w = resolveCheckoutPath(b);
    if (w === null) continue;
    let E = await nn(w);
    if (E === null) continue;
    if (E === o) {
      u = E;
      break;
    }
    let A = detectWorktreeMainRepoPath(E);
    if (u === null && A === s) u = A;
  }
  if (u === null) return null;
  let h = { gitDir: u, workTree: r },
    gitPath = relative(gitRoot, absoluteFilePath).split(sep_3).join("/"),
    repository = getCachedRepository(),
    { code: code } = await runGitWithExplicitDirs(h, [
      "--no-optional-locks",
      "ls-files",
      "--error-unmatch",
      "--",
      gitPath,
    ]);
  if (code === 0) {
    let b = await getDiffRef(h, gitRoot),
      { stdout: stdout, code: code } = await runGitWithExplicitDirs(
        h,
        [...GIT_DIFF_BASE_ARGS, ...RAW_BLOB_DIFF_FLAGS, b, "--", gitPath],
        { userLocale: !0 },
      );
    if (code !== 0) return null;
    if (!stdout) return null;
    return { ...parseRawDiffToToolUseDiff(gitPath, stdout, "modified"), repository: repository };
  }
  let syntheticDiff = await generateSyntheticDiff(gitPath, absoluteFilePath);
  if (!syntheticDiff) return null;
  return { ...syntheticDiff, repository: repository };
}
//@ chunk-6vnxsn99.js:60133-60430 fingerprint = parseRawDiffToToolUseDiff (1)
function parseRawDiffToToolUseDiff(filename, rawDiff, status) {
  let parts = rawDiff.split(`
`),
    patchLines = [],
    a = !1,
    u = 0,
    h = 0;
  for (let line of parts) {
    if (line.startsWith("@@")) a = !0;
    if (a) {
      if ((patchLines.push(line), line.startsWith("+") && !line.startsWith("+++"))) u++;
      else if (line.startsWith("-") && !line.startsWith("---")) h++;
    }
  }
  return {
    filename: filename,
    status: status,
    additions: u,
    deletions: h,
    changes: u + h,
    patch: patchLines.join(`
`),
  };
}
//@ chunk-6vnxsn99.js:60430-60751 layout
async function findMergeBase(e, n) {
  let r = [];
  for (let u of [`origin/${e}`, e]) {
    let { stdout: stdout, code: code } = await n(["--no-optional-locks", "merge-base", "HEAD", u]);
    if (code === 0 && stdout.trim()) r.push(stdout.trim());
  }
  let [o, s] = r;
  if (!o) return null;
  if (!s || o === s) return o;
  let { code: code } = await n(["--no-optional-locks", "merge-base", "--is-ancestor", o, s]);
  return code === 0 ? s : o;
}
//@ chunk-6vnxsn99.js:60751-60833 layout
async function nn(e) {
  let n = await getGitDir(e);
  return n === null ? null : realpath(n).catch(() => null);
}
/**
 * 若 cwd 是 <repo>.git/worktrees/<name> 形式则返回主仓库 .git 路径，否则原样返回（切分上属 utils/gitDiff 一带）。
 */
//@ chunk-6vnxsn99.js:60833-60939 placement = detectWorktreeMainRepoPath (0.742)
function detectWorktreeMainRepoPath(cwd) {
  let n = dirname(cwd),
    r = dirname(n);
  return basename(cwd) !== ".git" && basename(n) === "worktrees" && basename(r).endsWith(".git") ? r : cwd;
}
//@ chunk-6vnxsn99.js:60939-61102 layout
function runGitWithExplicitDirs({ gitDir: gitDir, workTree: workTree }, r, { userLocale: o } = {}) {
  return execFileNoThrowWithCwd(gitExe(), [`--git-dir=${gitDir}`, `--work-tree=${workTree}`, ...r], {
    cwd: workTree,
    timeout: GIT_EXPLICIT_DIR_TIMEOUT_MS,
    env: getRemoteHostSessionCount(void 0, { userLocale: o }),
  });
}
//@ chunk-6vnxsn99.js:61102-61233 layout
function getDiffBaseRef(e) {
  let n = checkoutNameForPath(e),
    r = (n !== void 0 ? getRepoBaseRefs().get(n) : void 0) || env.CLAUDE_CODE_BASE_REF;
  if (!r) return;
  return r.startsWith("-") ? null : r;
}
//@ chunk-6vnxsn99.js:61233-61524 fingerprint = getDiffRef (0.888)
async function getDiffRef(e, n) {
  let r = getDiffBaseRef(n);
  function o(u) {
    return runGitWithExplicitDirs(e, u);
  }
  if (r === void 0) {
    let u = await getDefaultBranch();
    if (u.startsWith("-")) return "HEAD";
    return (await findMergeBase(u, o)) ?? "HEAD";
  }
  let { stdout: stdout, code: code } = await o(["--no-optional-locks", "merge-base", "HEAD", r ?? "HEAD"]);
  if (code === 0 && stdout.trim()) return stdout.trim();
  return "HEAD";
}
//@ chunk-6vnxsn99.js:61524-61830 fingerprint = generateSyntheticDiff (1)
async function generateSyntheticDiff(gitPath, absoluteFilePath) {
  try {
    if (!(await QSr(absoluteFilePath, OVr))) return null;
    let parts = (await readFile(absoluteFilePath, "utf-8")).split(`
`);
    if (parts.length > 0 && parts.at(-1) === "") parts.pop();
    let lineCount = parts.length,
      joined = parts.map((line) => `+${line}`).join(`
`),
      patch = `@@ -0,0 +1,${lineCount} @@
${joined}`;
    return {
      filename: gitPath,
      status: "added",
      additions: lineCount,
      deletions: 0,
      changes: lineCount,
      patch: patch,
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
  getRepoTopLevel,
  isDiffCwdInRepoCached,
  standardRepoLayout,
  shouldSendToolDiff,
  fetchSingleFileGitDiff,
  isPatchWithinSizeLimit,
  unquoteGitPathBytes,
  parseGitDiff,
  $hn,
  GIT_DIFF_TIMEOUT_MS,
  isSafeRelativeDiffPath,
  UNSAFE_PATH_CHAR_PATTERN,
  fetchGitDiff,
  diffBaseRef,
  OVr,
  fetchGitDiff_2,
  parseShortstat,
  parseRawNumstat,
  TRANSIENT_STATE_FILES,
};
