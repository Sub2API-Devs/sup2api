/**
 * plugins/bundled/diffPane/diffSources.ts
 *
 * 2.1.316 新增：diff 面板的数据来源：git 后端、分支层级、合并未跟踪文件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c7hntn0y.js (24)
 * attribution: placement 24
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-c7hntn0y.js:21934-22179 placement
function branchSourceOf(base) {
  switch (base.kind) {
    case "merge-base":
      return {
        kind: "branch",
        baseBranch: base.baseBranch,
        baseRef: base.mergeBase,
      };
    case "head-is-base":
      return {
        kind: "branch",
        baseBranch: base.baseBranch,
        baseRef: "HEAD",
      };
    case "none":
      return {
        kind: "working-tree",
        base: "HEAD",
      };
  }
}
//@ chunk-c7hntn0y.js:22179-22383 placement
var diffDataOf = (context, result, source) => ({
  repository: context.repository,
  mode: context.mode,
  stats: result.stats,
  files: result.files,
  source: source.source,
  baseRef: source.baseRef,
  isUnborn: source.isUnborn,
  stalePaths: source.stalePaths,
  isUntrackedWithheld: result.isUntrackedWithheld,
});
//@ chunk-c7hntn0y.js:22383-22495 placement
var EMPTY_NUMSTAT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c7hntn0y.js:22383", () => {
  EMPTY_NUMSTAT = Object.freeze({
    stats: Object.freeze({
      filesCount: 0,
      linesAdded: 0,
      linesRemoved: 0,
    }),
    files: Object.freeze([]),
  });
});
//@ chunk-c7hntn0y.js:22495-22523 placement
var mergedResultOf = (result, extra) => ({
  ...result,
  ...extra,
});
//@ chunk-c7hntn0y.js:22523-22784 placement
function mergedWithUntracked(result, untracked) {
  if (!untracked)
    return mergedResultOf(result, {
      isUntrackedWithheld: true,
    });
  let seenPaths = new Set(result.files.map((file) => file.path));
  let filtered = untracked.filter((file) => !seenPaths.has(file.path));
  let filesCount = result.stats.filesCount + filtered.length;
  let stats = {
    ...result.stats,
    filesCount,
  };
  return mergedResultOf(
    {
      stats,
      files: [...result.files, ...filtered],
    },
    {
      isUntrackedWithheld: false,
    },
  );
}
//@ chunk-c7hntn0y.js:22784-22818 placement
var isPastDetails = (result) => result.stats.filesCount > MAX_FILES_FOR_DETAILS;
//@ chunk-c7hntn0y.js:22818-22939 placement
async function withUntracked(context, result, scope) {
  return isPastDetails(result)
    ? mergedResultOf(result, {
        isUntrackedWithheld: false,
      })
    : mergedWithUntracked(
        result,
        await untrackedFiles(context, {
          slots: MAX_FILES - result.files.length,
          scope,
        }),
      );
}
//@ chunk-c7hntn0y.js:22939-23333 placement
async function unbornTier(context) {
  let { run } = context;
  if (!(await isUnbornHead(run)))
    return {
      kind: "unavailable",
    };
  let cached = await statsOf(context, "--cached");
  if (!cached)
    return {
      kind: "unavailable",
    };
  let unstaged = cached.files.length > 0 ? await unstagedNumstat(run) : EMPTY_NUMSTAT;
  if (!unstaged)
    return {
      kind: "unavailable",
    };
  let overlaid = await withUntracked(context, overlayUnstaged(cached, unstaged), "session-only");
  return {
    kind: "data",
    data: diffDataOf(context, overlaid, {
      source: {
        kind: "working-tree",
        base: "HEAD",
      },
      baseRef: "--cached",
      isUnborn: true,
      stalePaths: unstaged.files.map((file) => file.path),
    }),
  };
}
//@ chunk-c7hntn0y.js:23333-23692 placement
async function branchTier(context) {
  let { deps, run } = context;
  let base = await branchBaseOf(run);
  deps.onBranchBase(base);
  if (base.kind === "error") return unbornTier(context);
  let source = branchSourceOf(base);
  let baseRef = source.kind === "branch" ? source.baseRef : "HEAD";
  let stats = await statsOf(context, baseRef);
  if (stats === null && base.kind === "merge-base")
    return {
      kind: "unavailable",
    };
  if (!stats) return unbornTier(context);
  return {
    kind: "data",
    data: diffDataOf(context, await withUntracked(context, stats, "session-only"), {
      source,
      baseRef,
      isUnborn: false,
      stalePaths: [],
    }),
  };
}
//@ chunk-c7hntn0y.js:23692-23796 placement
var fetchContextOf = (deps, mode) => ({
  deps,
  run: deps.run,
  repository: deps.repository,
  mode,
  stamps: stampProbeOf(deps, deps.repository.toplevel, MAX_LISTED_DIRECTORIES),
});
//@ chunk-c7hntn0y.js:23796-23932 placement
var WORKING_TREE_BASIS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c7hntn0y.js:23796", () => {
  WORKING_TREE_BASIS = Object.freeze({
    source: Object.freeze({
      kind: "working-tree",
      base: "HEAD",
    }),
    baseRef: "HEAD",
    isUnborn: false,
    stalePaths: Object.freeze([]),
  });
});
//@ chunk-c7hntn0y.js:23932-24160 placement
async function workingTreeTier(context) {
  let head = await statsOf(context, "HEAD");
  if (!head) return unbornTier(context);
  let isSessionMode = context.mode === "session";
  let files = isSessionMode ? await tagPreSession(context, head.files) : head.files;
  return {
    kind: "data",
    data: diffDataOf(
      context,
      await withUntracked(
        context,
        {
          stats: head.stats,
          files,
        },
        isSessionMode ? "with-pre-session" : "session-only",
      ),
      WORKING_TREE_BASIS,
    ),
  };
}
//@ chunk-c7hntn0y.js:24160-24304 placement
async function fetchDiff(deps, mode) {
  if (await isRebaseOrTransientState(deps.entryKindsOf, deps.repository.gitDir))
    return {
      kind: "unavailable",
    };
  let contextOf = fetchContextOf(deps, mode);
  return mode === "branch" ? branchTier(contextOf) : workingTreeTier(contextOf);
}
//@ chunk-c7hntn0y.js:24304-24376 placement
var isLastOfDiff = (context, file) =>
  context.files.filter((file) => !file.isUntracked).at(-1)?.path === file.path;
//@ chunk-c7hntn0y.js:24376-24516 placement
function withClosingLine(fileHunks) {
  let last = fileHunks.hunks.at(-1);
  return last !== undefined && !fileHunks.isTruncated
    ? {
        ...fileHunks,
        hunks: [
          ...fileHunks.hunks.slice(0, -1),
          {
            ...last,
            lines: [...last.lines, " "],
          },
        ],
      }
    : fileHunks;
}
//@ chunk-c7hntn0y.js:24516-25113 placement
async function fetchHunks(runGit, context, files) {
  let filtered = files.filter(
    (file) =>
      !file.isUntracked &&
      !file.isBinary &&
      file.renamedFrom === null &&
      !context.stalePaths.includes(file.path),
  );
  let mapped = files.filter((file) => !filtered.includes(file)).map((file) => [file.path, EMPTY_FILE_HUNKS]);
  if (filtered.length === 0) return new Map(mapped);
  let charsUsed = 0;
  let wantedPaths = filtered
    .map((file) => file.path)
    .filter((path, index) => {
      charsUsed += path.length;
      return index === 0 || charsUsed <= MAX_PATHSPEC_CHARS;
    });
  let { exitCode, stdout } = await runGit([
    "--literal-pathspecs",
    ...DIFF_LEADING_ARGS,
    ...HUNKS_ARGS,
    context.baseRef,
    "--",
    ...wantedPaths,
  ]);
  let parsed = exitCode === 0 ? parseFileDiffs(stdout, wantedPaths) : new Map();
  let files_2 = filtered.filter((file) => !parsed.has(file.path));
  let retried =
    parsed.size === 0 ? files_2.map((file) => [file.path, null]) : await fetchHunks(runGit, context, files_2);
  return new Map([
    ...mapped,
    ...filtered.flatMap((file) => {
      let hunks = parsed.get(file.path);
      let isLast = isLastOfDiff(context, file);
      return hunks ? [[file.path, isLast ? hunks : withClosingLine(hunks)]] : [];
    }),
    ...retried,
  ]);
}
//@ chunk-c7hntn0y.js:25113-25170 placement
var GIT_BASE_MODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c7hntn0y.js:25113", () => {
  GIT_BASE_MODES = Object.freeze(["session", "uncommitted", "branch"]);
});
//@ chunk-c7hntn0y.js:25170-25385 placement
var GIT_WORDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c7hntn0y.js:25170", () => {
  GIT_WORDS = Object.freeze({
    base: "HEAD",
    diffCommand: "git diff",
    lister: "git",
    untrackedNoteOf: (path, isSafePathspec) => [
      "New file not yet staged.",
      isSafePathspec
        ? `Run \`git add :/${path}\` to see line counts.`
        : "Stage it with git add to see line counts.",
    ],
  });
});
//@ chunk-c7hntn0y.js:25385-25943 placement
async function gitBackendOf(deps) {
  let runnerFor = (repo) => async (args) => {
    try {
      return await deps.run(["git", ...(repo ? pinnedLeadOf(repo) : []), ...args], {
        timeoutMs: GIT_TIMEOUT_MS,
        env: GIT_CHILD_ENV,
        ...(repo && {
          cwd: repo.toplevel,
        }),
      });
    } catch {
      return FAILED_RUN;
    }
  };
  let repo = await repositoryOf(runnerFor(null));
  if (!repo) return null;
  let runGit = runnerFor(repo);
  let baseline = null;
  let cutBases = new Set();
  let makeContext = (baseline) => ({
    run: runGit,
    repository: repo,
    mtimeOf: deps.mtimeOf,
    entryKindsOf: deps.entryKindsOf,
    sessionStartMs: deps.sessionStartMsOf(),
    baseline,
    cutBases,
    onBranchBase: deps.onBranchBase,
  });
  return {
    repository: repo,
    baseModes: GIT_BASE_MODES,
    words: GIT_WORDS,
    fetchDiff: async (mode) => {
      baseline ??= dirtyPathsOf(runGit);
      return fetchDiff(makeContext(await baseline), mode);
    },
    fetchHunks: (context, files) => fetchHunks(runGit, context, files),
    headKeyOf: () =>
      headKeyOf(
        {
          ...makeContext(null),
          readFile: deps.readFile,
        },
        repo,
      ),
  };
}
//@ chunk-c7hntn0y.js:25943-25988 placement
/**
 * 数组中满足条件的元素个数。
 */
var countWhere = (items, predicate) => items.reduce((acc, item) => acc + (predicate(item) ? 1 : 0), 0);
//@ chunk-c7hntn0y.js:25988-26159 placement (2.1.88 match: adjustHunkLineNumbers, 0.844)
/**
 * 从 hunk 的第 offset 行起切出子 hunk 并修正起始行号。
 */
function adjustHunkLineNumbers(hunks, offset) {
  let sliced = hunks.lines.slice(0, offset);
  return {
    oldStart: hunks.oldStart + countWhere(sliced, (line) => !line.startsWith("+")),
    newStart: hunks.newStart + countWhere(sliced, (line) => !line.startsWith("-")),
    lines: hunks.lines.slice(offset),
  };
}
//@ chunk-c7hntn0y.js:26159-26242 placement
async function backendOf(deps, probes) {
  for (let probe of probes) {
    let backend = await probe(deps);
    if (backend) return backend;
  }
  return gitBackendOf(deps);
}
//@ chunk-c7hntn0y.js:26242-26257 placement
var INSTALLED_BACKEND_PROBES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c7hntn0y.js:26242", () => {
  INSTALLED_BACKEND_PROBES = new Set();
});
//@ chunk-c7hntn0y.js:26257-26292 placement
var baseNameOf = (path) => path.split("/").at(-1) ?? path;
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
