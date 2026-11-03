/**
 * plugins/bundled/diffPane/diffSources.ts
 *
 * 2.1.316 新增：diff 面板的数据来源：git 后端、分支层级、合并未跟踪文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wyqg6m3h.js (24)
 * attribution: placement 24
 */
import {
  MAX_FILES_FOR_DETAILS,
  MAX_FILES,
  MAX_LISTED_DIRECTORIES,
  MAX_PATHSPEC_CHARS,
  GIT_TIMEOUT_MS,
} from "./hooks.js";
import { untrackedFiles } from "../../../utils/git.js";
import {
  isUnbornHead,
  statsOf,
  unstagedNumstat,
  overlayUnstaged,
  branchBaseOf,
  stampProbeOf,
  tagPreSession,
  isRebaseOrTransientState,
  EMPTY_FILE_HUNKS,
  DIFF_LEADING_ARGS,
  HUNKS_ARGS,
  parseFileDiffs,
  pinnedLeadOf,
  GIT_CHILD_ENV,
  FAILED_RUN,
  repositoryOf,
  dirtyPathsOf,
  headKeyOf,
} from "./gitDiffRead.js";

//@ chunk-wyqg6m3h.js:21570-21815 placement
function branchSourceOf(e) {
  switch (e.kind) {
    case "merge-base":
      return {
        kind: "branch",
        baseBranch: e.baseBranch,
        baseRef: e.mergeBase,
      };
    case "head-is-base":
      return {
        kind: "branch",
        baseBranch: e.baseBranch,
        baseRef: "HEAD",
      };
    case "none":
      return {
        kind: "working-tree",
        base: "HEAD",
      };
  }
}
//@ chunk-wyqg6m3h.js:21815-22019 placement
var diffDataOf = (e, o, r) => ({
  repository: e.repository,
  mode: e.mode,
  stats: o.stats,
  files: o.files,
  source: r.source,
  baseRef: r.baseRef,
  isUnborn: r.isUnborn,
  stalePaths: r.stalePaths,
  isUntrackedWithheld: o.isUntrackedWithheld,
});
//@ chunk-wyqg6m3h.js:22019-22131 placement
var EMPTY_NUMSTAT = Object.freeze({
  stats: Object.freeze({
    filesCount: 0,
    linesAdded: 0,
    linesRemoved: 0,
  }),
  files: Object.freeze([]),
});
//@ chunk-wyqg6m3h.js:22131-22159 placement
var mergedResultOf = (e, o) => ({
  ...e,
  ...o,
});
//@ chunk-wyqg6m3h.js:22159-22420 placement
function mergedWithUntracked(e, o) {
  if (!o)
    return mergedResultOf(e, {
      isUntrackedWithheld: true,
    });
  let r = new Set(e.files.map((file) => file.path));
  let filtered = o.filter((i) => !r.has(i.path));
  let filesCount = e.stats.filesCount + filtered.length;
  let stats = {
    ...e.stats,
    filesCount,
  };
  return mergedResultOf(
    {
      stats,
      files: [...e.files, ...filtered],
    },
    {
      isUntrackedWithheld: false,
    },
  );
}
//@ chunk-wyqg6m3h.js:22420-22454 placement
var isPastDetails = (e) => e.stats.filesCount > MAX_FILES_FOR_DETAILS;
//@ chunk-wyqg6m3h.js:22454-22575 placement
async function withUntracked(e, o, scope) {
  return isPastDetails(o)
    ? mergedResultOf(o, {
        isUntrackedWithheld: false,
      })
    : mergedWithUntracked(
        o,
        await untrackedFiles(e, {
          slots: MAX_FILES - o.files.length,
          scope,
        }),
      );
}
//@ chunk-wyqg6m3h.js:22575-22969 placement
async function unbornTier(e) {
  let { run } = e;
  if (!(await isUnbornHead(run)))
    return {
      kind: "unavailable",
    };
  let r = await statsOf(e, "--cached");
  if (!r)
    return {
      kind: "unavailable",
    };
  let n = r.files.length > 0 ? await unstagedNumstat(run) : EMPTY_NUMSTAT;
  if (!n)
    return {
      kind: "unavailable",
    };
  let a = await withUntracked(e, overlayUnstaged(r, n), "session-only");
  return {
    kind: "data",
    data: diffDataOf(e, a, {
      source: {
        kind: "working-tree",
        base: "HEAD",
      },
      baseRef: "--cached",
      isUnborn: true,
      stalePaths: n.files.map((file) => file.path),
    }),
  };
}
//@ chunk-wyqg6m3h.js:22969-23328 placement
async function branchTier(contextOf) {
  let { deps, run } = contextOf;
  let s = await branchBaseOf(run);
  deps.onBranchBase(s);
  if (s.kind === "error") return unbornTier(contextOf);
  let n = branchSourceOf(s);
  let baseRef = n.kind === "branch" ? n.baseRef : "HEAD";
  let i = await statsOf(contextOf, baseRef);
  if (i === null && s.kind === "merge-base")
    return {
      kind: "unavailable",
    };
  if (!i) return unbornTier(contextOf);
  return {
    kind: "data",
    data: diffDataOf(contextOf, await withUntracked(contextOf, i, "session-only"), {
      source: n,
      baseRef,
      isUnborn: false,
      stalePaths: [],
    }),
  };
}
//@ chunk-wyqg6m3h.js:23328-23432 placement
var fetchContextOf = (e, mode) => ({
  deps: e,
  run: e.run,
  repository: e.repository,
  mode,
  stamps: stampProbeOf(e, e.repository.toplevel, MAX_LISTED_DIRECTORIES),
});
//@ chunk-wyqg6m3h.js:23432-23568 placement
var WORKING_TREE_BASIS = Object.freeze({
  source: Object.freeze({
    kind: "working-tree",
    base: "HEAD",
  }),
  baseRef: "HEAD",
  isUnborn: false,
  stalePaths: Object.freeze([]),
});
//@ chunk-wyqg6m3h.js:23568-23796 placement
async function workingTreeTier(contextOf) {
  let o = await statsOf(contextOf, "HEAD");
  if (!o) return unbornTier(contextOf);
  let r = contextOf.mode === "session";
  let files = r ? await tagPreSession(contextOf, o.files) : o.files;
  return {
    kind: "data",
    data: diffDataOf(
      contextOf,
      await withUntracked(
        contextOf,
        {
          stats: o.stats,
          files,
        },
        r ? "with-pre-session" : "session-only",
      ),
      WORKING_TREE_BASIS,
    ),
  };
}
//@ chunk-wyqg6m3h.js:23796-23940 placement
async function fetchDiff(e, mode) {
  if (await isRebaseOrTransientState(e.entryKindsOf, e.repository.gitDir))
    return {
      kind: "unavailable",
    };
  let contextOf = fetchContextOf(e, mode);
  return mode === "branch" ? branchTier(contextOf) : workingTreeTier(contextOf);
}
//@ chunk-wyqg6m3h.js:23940-24012 placement
var isLastOfDiff = (e, o) => e.files.filter((file) => !file.isUntracked).at(-1)?.path === o.path;
//@ chunk-wyqg6m3h.js:24012-24152 placement
function withClosingLine(e) {
  let last = e.hunks.at(-1);
  return last !== undefined && !e.isTruncated
    ? {
        ...e,
        hunks: [
          ...e.hunks.slice(0, -1),
          {
            ...last,
            lines: [...last.lines, " "],
          },
        ],
      }
    : e;
}
//@ chunk-wyqg6m3h.js:24152-24749 placement
async function fetchHunks(e, o, r) {
  let filtered = r.filter(
    (O) => !O.isUntracked && !O.isBinary && O.renamedFrom === null && !o.stalePaths.includes(O.path),
  );
  let mapped = r.filter((O) => !filtered.includes(O)).map((O) => [O.path, EMPTY_FILE_HUNKS]);
  if (filtered.length === 0) return new Map(mapped);
  let a = 0;
  let filtered_2 = filtered
    .map((O) => O.path)
    .filter((O, _) => {
      a += O.length;
      return _ === 0 || a <= MAX_PATHSPEC_CHARS;
    });
  let { exitCode, stdout } = await e([
    "--literal-pathspecs",
    ...DIFF_LEADING_ARGS,
    ...HUNKS_ARGS,
    o.baseRef,
    "--",
    ...filtered_2,
  ]);
  let d = exitCode === 0 ? parseFileDiffs(stdout, filtered_2) : new Map();
  let filtered_3 = filtered.filter((O) => !d.has(O.path));
  let R = d.size === 0 ? filtered_3.map((O) => [O.path, null]) : await fetchHunks(e, o, filtered_3);
  return new Map([
    ...mapped,
    ...filtered.flatMap((O) => {
      let _ = d.get(O.path);
      let E = isLastOfDiff(o, O);
      return _ ? [[O.path, E ? _ : withClosingLine(_)]] : [];
    }),
    ...R,
  ]);
}
//@ chunk-wyqg6m3h.js:24749-24806 placement
var GIT_BASE_MODES = Object.freeze(["session", "uncommitted", "branch"]);
//@ chunk-wyqg6m3h.js:24806-25021 placement
var GIT_WORDS = Object.freeze({
  base: "HEAD",
  diffCommand: "git diff",
  lister: "git",
  untrackedNoteOf: (e, o) => [
    "New file not yet staged.",
    o ? `Run \`git add :/${e}\` to see line counts.` : "Stage it with git add to see line counts.",
  ],
});
//@ chunk-wyqg6m3h.js:25021-25579 placement
async function gitBackendOf(e) {
  let o = (p) => async (l) => {
    try {
      return await e.run(["git", ...(p ? pinnedLeadOf(p) : []), ...l], {
        timeoutMs: GIT_TIMEOUT_MS,
        env: GIT_CHILD_ENV,
        ...(p && {
          cwd: p.toplevel,
        }),
      });
    } catch {
      return FAILED_RUN;
    }
  };
  let r = await repositoryOf(o(null));
  if (!r) return null;
  let s = o(r);
  let baseline = null;
  let cutBases = new Set();
  let i = (baseline) => ({
    run: s,
    repository: r,
    mtimeOf: e.mtimeOf,
    entryKindsOf: e.entryKindsOf,
    sessionStartMs: e.sessionStartMsOf(),
    baseline,
    cutBases,
    onBranchBase: e.onBranchBase,
  });
  return {
    repository: r,
    baseModes: GIT_BASE_MODES,
    words: GIT_WORDS,
    fetchDiff: async (p) => {
      baseline ??= dirtyPathsOf(s);
      return fetchDiff(i(await baseline), p);
    },
    fetchHunks: (p, l) => fetchHunks(s, p, l),
    headKeyOf: () =>
      headKeyOf(
        {
          ...i(null),
          readFile: e.readFile,
        },
        r,
      ),
  };
}
//@ chunk-wyqg6m3h.js:25579-25624 placement
/**
 * 数组中满足条件的元素个数。
 */
var countWhere = (e, o) => e.reduce((acc, s) => acc + (o(s) ? 1 : 0), 0);
//@ chunk-wyqg6m3h.js:25624-25795 placement = adjustHunkLineNumbers (0.843)
/**
 * 从 hunk 的第 offset 行起切出子 hunk 并修正起始行号。
 */
function adjustHunkLineNumbers(hunks, offset) {
  let sliced = hunks.lines.slice(0, offset);
  return {
    oldStart: hunks.oldStart + countWhere(sliced, (s) => !s.startsWith("+")),
    newStart: hunks.newStart + countWhere(sliced, (s) => !s.startsWith("-")),
    lines: hunks.lines.slice(offset),
  };
}
//@ chunk-wyqg6m3h.js:25795-25878 placement
async function backendOf(e, o) {
  for (let r of o) {
    let s = await r(e);
    if (s) return s;
  }
  return gitBackendOf(e);
}
//@ chunk-wyqg6m3h.js:25878-25893 placement
var INSTALLED_BACKEND_PROBES = new Set();
//@ chunk-wyqg6m3h.js:25893-25928 placement
var baseNameOf = (e) => e.split("/").at(-1) ?? e;
export {
  countWhere,
  EMPTY_NUMSTAT,
  GIT_BASE_MODES,
  GIT_WORDS,
  INSTALLED_BACKEND_PROBES,
  WORKING_TREE_BASIS,
  backendOf,
  baseNameOf,
  branchSourceOf,
  branchTier,
  diffDataOf,
  fetchContextOf,
  fetchDiff,
  fetchHunks,
  gitBackendOf,
  adjustHunkLineNumbers,
  isLastOfDiff,
  isPastDetails,
  mergedResultOf,
  mergedWithUntracked,
  unbornTier,
  withClosingLine,
  withUntracked,
  workingTreeTier,
};
