/**
 * plugins/bundled/diffPane/gitDiffRead.ts
 *
 * 2.1.316 新增：diff 面板的 git 读取：解析文件 diff 与 numstat、分支基点、HEAD 键。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wyqg6m3h.js (55)
 * attribution: placement 55
 */
import {
  MAX_LINES_PER_FILE,
  HOST_OUTPUT_CAP_BYTES,
  MAX_DIFF_BYTES,
  MAX_LISTED_DIRECTORIES,
  MAX_FILES_FOR_DETAILS,
  MAX_FILES,
  MAX_UNTRACKED_PROBES,
} from "./hooks.js";
import { TRANSIENT_STATE_FILES } from "../../../utils/gitDiff.js";

//@ chunk-wyqg6m3h.js:12004-12177 placement
var DIFF_LEADING_ARGS = [
  "--no-optional-locks",
  "-c",
  "diff.relative=false",
  "-c",
  "core.quotePath=false",
  "diff",
  "--no-ext-diff",
  "--no-textconv",
  "--ignore-submodules=dirty",
  "--submodule=short",
];
//@ chunk-wyqg6m3h.js:12177-12209 placement
var GIT_CHILD_ENV = {
  LC_ALL: "C",
  LANGUAGE: "",
};
//@ chunk-wyqg6m3h.js:12209-12287 placement
var HUNKS_ARGS = ["--no-renames", "--src-prefix=a/", "--dst-prefix=b/", "--raw", "-z", "-p"];
//@ chunk-wyqg6m3h.js:12287-12315 placement
var NO_OPTIONAL_LOCKS = "--no-optional-locks";
//@ chunk-wyqg6m3h.js:12315-12381 placement
var pinnedLeadOf = (e) => [`--git-dir=${e.gitDir}`, `--work-tree=${e.toplevel}`];
//@ chunk-wyqg6m3h.js:12381-12531 placement
function cutHunks(e) {
  let o = MAX_LINES_PER_FILE;
  let r = 0;
  return {
    hunks: e.map((s) => {
      let sliced = s.lines.slice(0, o);
      o -= sliced.length;
      r += s.lines.length;
      return {
        ...s,
        lines: sliced,
      };
    }),
    isTruncated: r > MAX_LINES_PER_FILE,
  };
}
//@ chunk-wyqg6m3h.js:12531-12908 placement
function renameDisplayOf(renamedFrom, path) {
  let r = 0;
  let s = 0;
  for (let j = 0; j < renamedFrom.length && j < path.length; j++) {
    if (renamedFrom[j] !== path[j]) break;
    if (renamedFrom[j] === "/") r = j + 1;
  }
  let n = r - (r > 0 ? 1 : 0);
  for (let j = 1; renamedFrom.length - j >= n && path.length - j >= n; j++) {
    let T = renamedFrom[renamedFrom.length - j];
    if (T !== path[path.length - j]) break;
    if (T === "/") s = j;
  }
  let a = (d) => d.slice(r, Math.max(r, d.length - s));
  let i = `${a(renamedFrom)} => ${a(path)}`;
  let p = r + s > 0;
  let sliced = renamedFrom.slice(0, r);
  let sliced_2 = renamedFrom.slice(renamedFrom.length - s);
  return p ? `${sliced}{${i}}${sliced_2}` : i;
}
//@ chunk-wyqg6m3h.js:12908-12977 placement
function displayPathOf(e) {
  let { renamedFrom, path } = e;
  return renamedFrom === null ? path : renameDisplayOf(renamedFrom, path);
}
//@ chunk-wyqg6m3h.js:12977-13036 placement
var EMPTY_FILE_HUNKS = Object.freeze({
  hunks: [],
  isTruncated: false,
  isLarge: false,
});
//@ chunk-wyqg6m3h.js:13036-13092 placement
var FAILED_RUN = Object.freeze({
  exitCode: -1,
  stdout: "",
  stderr: "",
});
//@ chunk-wyqg6m3h.js:13092-13226 placement
async function currentBranchOf(e) {
  let { exitCode, stdout } = await e([NO_OPTIONAL_LOCKS, "rev-parse", "--abbrev-ref", "HEAD"]);
  let trimmed = stdout.trim();
  return exitCode === 0 && trimmed !== "" ? trimmed : "HEAD";
}
//@ chunk-wyqg6m3h.js:13226-13251 placement
var CONVENTIONAL_DEFAULT_BRANCHES = ["main", "master"];
//@ chunk-wyqg6m3h.js:13251-13585 placement
async function defaultBranchOf(e) {
  let o = async (n) =>
    (await e([NO_OPTIONAL_LOCKS, "show-ref", "--verify", "--quiet", `refs/remotes/origin/${n}`])).exitCode ===
    0;
  let r = await e([NO_OPTIONAL_LOCKS, "symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
  let s = r.exitCode === 0 ? r.stdout.trim().replace(/^origin\//, "") : "";
  if (s !== "" && (await o(s))) return s;
  for (let n of CONVENTIONAL_DEFAULT_BRANCHES) if (await o(n)) return n;
  return "main";
}
//@ chunk-wyqg6m3h.js:13585-13639 placement
var isSha = (e) => /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(e);
//@ chunk-wyqg6m3h.js:13639-13886 placement
async function mergeBaseCandidatesOf(e, o) {
  let r = [
    await e([NO_OPTIONAL_LOCKS, "merge-base", "HEAD", `origin/${o}`]),
    await e([NO_OPTIONAL_LOCKS, "merge-base", "HEAD", o]),
  ];
  return {
    candidates: r
      .filter((s) => s.exitCode === 0)
      .map((s) => s.stdout.trim())
      .filter(isSha),
    hasNoCommonAncestor: r.some((s) => s.exitCode === 1),
  };
}
//@ chunk-wyqg6m3h.js:13886-14117 placement
async function missingBaseOf(e, o) {
  for (let r of [`refs/remotes/origin/${o}`, `refs/heads/${o}`]) {
    let { exitCode } = await e([NO_OPTIONAL_LOCKS, "show-ref", "--verify", "--quiet", r]);
    if (exitCode === 0 || exitCode === -1)
      return {
        kind: "error",
        reason: "merge_base_failed",
      };
  }
  return {
    kind: "none",
  };
}
//@ chunk-wyqg6m3h.js:14117-14691 placement
async function branchBaseOf(run) {
  let [o, r] = await Promise.all([currentBranchOf(run), defaultBranchOf(run)]);
  if (o === "HEAD" || r.startsWith("-"))
    return {
      kind: "none",
    };
  if (o === r)
    return {
      kind: "head-is-base",
      baseBranch: r,
    };
  let { candidates, hasNoCommonAncestor } = await mergeBaseCandidatesOf(run, r);
  let [i, p] = candidates;
  if (i === undefined)
    return hasNoCommonAncestor
      ? {
          kind: "none",
        }
      : missingBaseOf(run, r);
  let y =
    p !== undefined &&
    p !== i &&
    (await run([NO_OPTIONAL_LOCKS, "merge-base", "--is-ancestor", i, p])).exitCode === 0
      ? p
      : i;
  let d = await run([NO_OPTIONAL_LOCKS, "rev-parse", "HEAD"]);
  if (d.exitCode !== 0)
    return {
      kind: "error",
      reason: "head_rev_parse_failed",
    };
  return d.stdout.trim() === y
    ? {
        kind: "head-is-base",
        baseBranch: r,
      }
    : {
        kind: "merge-base",
        mergeBase: y,
        baseBranch: r,
      };
}
//@ chunk-wyqg6m3h.js:14691-14874 placement
async function stampIfFile(e, o) {
  let r = o.endsWith("/");
  let s = r ? o.slice(0, -1) : o;
  let n = await e.walk.kindOf(s);
  return n === "over-budget"
    ? "over-budget"
    : n === (r ? "dir" : "file")
      ? e.mtimeOf(`${e.base}/${s}`)
      : null;
}
//@ chunk-wyqg6m3h.js:14874-15136 placement
async function datingsOf(e, o) {
  let { sessionStartMs } = e.deps;
  let results = await Promise.all(o.map((a) => stampIfFile(e.stamps, a)));
  function n(a) {
    if (a === "over-budget") return "unlisted";
    return (a ?? Number.POSITIVE_INFINITY) < sessionStartMs ? "pre-session" : "session";
  }
  return new Map(o.map((a, i) => [a, n(results[i] ?? null)]));
}
//@ chunk-wyqg6m3h.js:15136-15157 placement
var FILE_HEADER_START = "diff --git ";
//@ chunk-wyqg6m3h.js:15157-15218 placement
var HUNK_HEADER = /^@@ -(?<old>\d+)(?:,\d+)? \+(?<new>\d+)(?:,\d+)? @@/;
//@ chunk-wyqg6m3h.js:15218-15286 placement
var isBodyLine = (e) => e.startsWith("+") || e.startsWith("-") || e.startsWith(" ");
//@ chunk-wyqg6m3h.js:15286-15295 placement
var MOST_UTF8_BYTES = 3;
//@ chunk-wyqg6m3h.js:15295-15361 placement
var isUnderUtf8Ceiling = (e, o) => e.length * MOST_UTF8_BYTES < o || new TextEncoder().encode(e).length < o;
//@ chunk-wyqg6m3h.js:15361-15419 placement
var isWholeListing = (e, o = "\x00") =>
  (e === "" || e.endsWith(o)) && isUnderUtf8Ceiling(e, HOST_OUTPUT_CAP_BYTES - MOST_UTF8_BYTES);
//@ chunk-wyqg6m3h.js:15419-15460 placement
var isWholeAnswer = (e) => e.exitCode === 0 && isWholeListing(e.stdout);
//@ chunk-wyqg6m3h.js:15460-15534 placement
var hunkOf = (groups, lines) => ({
  oldStart: Number(groups?.old),
  newStart: Number(groups?.new),
  lines,
});
//@ chunk-wyqg6m3h.js:15534-15593 placement
var LARGE_FILE_HUNKS = Object.freeze({
  hunks: [],
  isTruncated: false,
  isLarge: true,
});
//@ chunk-wyqg6m3h.js:15593-15791 placement
function parseFileDiff(text) {
  if (text.length > MAX_DIFF_BYTES) return LARGE_FILE_HUNKS;
  let lines = text.split(`
`);
  let flattened = lines.flatMap((line, n) => (HUNK_HEADER.test(line) ? [n] : []));
  return {
    ...cutHunks(
      flattened.map((s, n) =>
        hunkOf(
          HUNK_HEADER.exec(lines[s] ?? "")?.groups,
          lines.slice(s + 1, flattened[n + 1]).filter(isBodyLine),
        ),
      ),
    ),
    isLarge: false,
  };
}
//@ chunk-wyqg6m3h.js:15791-15807 placement
var QUOTED_HEADER_START = `${FILE_HEADER_START}"`;
//@ chunk-wyqg6m3h.js:15807-15819 placement
var UNMERGED_STATUS = " U";
//@ chunk-wyqg6m3h.js:15819-16605 placement
function parseFileDiffs(stdout, o) {
  let parts = stdout.split("\x00");
  let index = parts.findIndex((O, _) => _ % 2 === 0 && !O.startsWith(":"));
  let filtered = parts
    .slice(0, index)
    .filter((O, _) => _ % 2 === 1 && !parts[_ - 1]?.endsWith(UNMERGED_STATUS));
  let a = parts[index] === "";
  let lines = parts.slice(index + (a ? 1 : 0)).join("\x00").split(`
`);
  let flattened = lines.flatMap((line, _) => (line.startsWith(FILE_HEADER_START) ? [_] : []));
  let filtered_2 = flattened.filter((O, _) => lines[O] !== lines[flattened[_ - 1] ?? -1]);
  let y = isWholeListing(
    stdout,
    `
`,
  );
  let filtered_3 = filtered_2
    .map((O, _) => {
      let E = filtered_2[_ + 1];
      let A = filtered[_] ?? "";
      let k = E === undefined;
      return {
        path: A,
        isNamed:
          lines[O]?.startsWith(QUOTED_HEADER_START) === true ||
          lines[O] === `${FILE_HEADER_START}a/${A} b/${A}`,
        isCut: k && !y,
        text:
          lines.slice(O, E).join(`
`) +
          (k
            ? ""
            : `
`),
      };
    })
    .filter((O) => !O.isCut || O.text.length > MAX_DIFF_BYTES);
  if (!(
    index !== -1 &&
    filtered_2.length <= filtered.length &&
    (filtered_2.length === filtered.length || filtered_2.length === 0 || !y) &&
    filtered_3.every((O) => O.isNamed)
  ))
    return new Map();
  let w = new Map(filtered_3.map((O) => [O.path, parseFileDiff(O.text)]));
  let R = y ? [] : filtered.slice(filtered_3.length);
  return new Map(o.filter((O) => !R.includes(O)).map((O) => [O, w.get(O) ?? EMPTY_FILE_HUNKS]));
}
//@ chunk-wyqg6m3h.js:16605-16614 placement
var RENAME_RECORDS = 3;
//@ chunk-wyqg6m3h.js:16614-17135 placement
function parseNumstat(stdout, o) {
  let r = [];
  let s = {
    filesCount: 0,
    linesAdded: 0,
    linesRemoved: 0,
  };
  let parts = stdout.split("\x00");
  let a = 0;
  while (a < parts.length) {
    let [i, p, ...l] = (parts[a] ?? "").split("\t");
    let joined = l.join("\t");
    let d = l.length === 1 && joined === "";
    let renamedFrom = d ? (parts[a + 1] ?? null) : null;
    let w = d ? (parts[a + 2] ?? "") : joined;
    a += d ? RENAME_RECORDS : 1;
    if (!(i !== undefined && p !== undefined && w !== "")) continue;
    let O = i === "-" || p === "-";
    let _ = O ? 0 : Number(i) || 0;
    let E = O ? 0 : Number(p) || 0;
    s.filesCount += 1;
    s.linesAdded += _;
    s.linesRemoved += E;
    if (r.length < o)
      r.push({
        path: w,
        renamedFrom,
        added: _,
        removed: E,
        isBinary: O,
        isUntracked: false,
        isPreSession: false,
      });
  }
  return {
    stats: s,
    files: r,
  };
}
//@ chunk-wyqg6m3h.js:17135-17308 placement
var SHORTSTAT_PATTERN = new RegExp(
  [
    String.raw`(?<files>\d+) files? changed`,
    String.raw`(?:, (?<added>\d+) insertions?\(\+\))?`,
    String.raw`(?:, (?<removed>\d+) deletions?\(-\))?`,
  ].join(""),
);
//@ chunk-wyqg6m3h.js:17308-17465 placement
function parseShortstat(stdout) {
  let groups = SHORTSTAT_PATTERN.exec(stdout)?.groups;
  if (!groups) return null;
  return {
    filesCount: Number(groups.files),
    linesAdded: Number(groups.added ?? 0),
    linesRemoved: Number(groups.removed ?? 0),
  };
}
//@ chunk-wyqg6m3h.js:17465-17474 placement
var STATUS_PATH_OFFSET = 3;
//@ chunk-wyqg6m3h.js:17474-17705 placement
async function dirtyPathsOf(e) {
  let o = await e([
    NO_OPTIONAL_LOCKS,
    "status",
    "--porcelain",
    "-z",
    "--untracked-files=all",
    "--no-renames",
    "--ignore-submodules=dirty",
  ]);
  let filtered = o.stdout.split("\x00").filter((s) => s !== "");
  return isWholeAnswer(o) ? new Set(filtered.map((s) => s.slice(STATUS_PATH_OFFSET))) : null;
}
//@ chunk-wyqg6m3h.js:17705-17760 placement
/**
 * refs/ 路径正则。
 */
var SAFE_REF_PATTERN = /^refs(?:\/[A-Za-z0-9_@+-][A-Za-z0-9._@+-]*)+$/;
//@ chunk-wyqg6m3h.js:17760-17848 placement = getTaskListLockPath (1)
/**
 * refs/ 路径安全检查（切分误归）。
 */
var getTaskListLockPath = (taskListId) =>
  SAFE_REF_PATTERN.test(taskListId) &&
  !taskListId.includes("..") &&
  !taskListId.split("/").some((o) => o.endsWith(".lock"));
//@ chunk-wyqg6m3h.js:17848-18276 placement
function kindWalkOf(entryKindsOf, o, r) {
  let s = new Map();
  function n(i) {
    let p = s.get(i);
    if (p === undefined && s.size >= r) return "over-budget";
    let y = p ?? entryKindsOf(i === "" ? o : `${o}/${i}`);
    s.set(i, y);
    return y;
  }
  async function a(i) {
    let p = i === "" ? [] : i.split("/");
    let l = "";
    for (let [y, d] of p.entries()) {
      let T = n(l);
      if (T === "over-budget") return "over-budget";
      let w = (await T)?.get(d) ?? null;
      if (y === p.length - 1) return w;
      if (w !== "dir") return null;
      l = l === "" ? d : `${l}/${d}`;
    }
    return "dir";
  }
  return {
    kindOf: a,
  };
}
//@ chunk-wyqg6m3h.js:18276-18349 placement
var stampProbeOf = (e, o, r) => ({
  walk: kindWalkOf(e.entryKindsOf, o, r),
  base: o,
  mtimeOf: e.mtimeOf,
});
//@ chunk-wyqg6m3h.js:18349-18905 placement
async function headKeyOf(e, o) {
  let r = stampProbeOf(e, o.gitDir, MAX_LISTED_DIRECTORIES);
  let n = o.commonDir === o.gitDir ? r : stampProbeOf(e, o.commonDir, MAX_LISTED_DIRECTORIES);
  async function a() {
    let R = await e.run([NO_OPTIONAL_LOCKS, "rev-parse", "--verify", "--quiet", "HEAD"]);
    return `rev:${R.exitCode === 0 ? R.stdout.trim() : ""}`;
  }
  if ((await r.walk.kindOf("HEAD")) !== "file") return a();
  let i = await e.readFile(`${o.gitDir}/HEAD`).catch(() => "");
  let taskListId = i.startsWith("ref: ") ? i.slice(5).trim() : "";
  let l = taskListId !== "";
  let y = l && !getTaskListLockPath(taskListId);
  let d = y ? await stampIfFile(r, "logs/HEAD") : null;
  let T = y && typeof d !== "number";
  let w = l && !y;
  return T
    ? a()
    : [
        i,
        await stampIfFile(r, "HEAD"),
        w ? await stampIfFile(n, taskListId) : d,
        await stampIfFile(n, "packed-refs"),
      ].join("|");
}
//@ chunk-wyqg6m3h.js:18905-18962 placement
var isAbsolutePath = (e) => e.startsWith("/") || /^[A-Za-z]:[\\/]/.test(e);
//@ chunk-wyqg6m3h.js:18962-19052 placement
var REBASE_STATE_FILES = {
  head: "REBASE_HEAD",
  merge: "rebase-merge",
  apply: "rebase-apply",
  rebasing: "rebasing",
};
//@ chunk-wyqg6m3h.js:19107-19338 placement
async function isRebaseOrTransientState(entryKindsOf, gitDir) {
  let r = await entryKindsOf(gitDir);
  let s = r?.get(REBASE_STATE_FILES.head) === "file";
  let a =
    s && r?.get(REBASE_STATE_FILES.apply) === "dir"
      ? await entryKindsOf(`${gitDir}/${REBASE_STATE_FILES.apply}`)
      : null;
  return (
    (s && (r?.get(REBASE_STATE_FILES.merge) === "dir" || a?.get(REBASE_STATE_FILES.rebasing) === "file")) ||
    TRANSIENT_STATE_FILES.some((p) => r?.get(p) === "file")
  );
}
//@ chunk-wyqg6m3h.js:19338-19441 placement
async function isUnbornHead(run) {
  let { exitCode } = await run([NO_OPTIONAL_LOCKS, "rev-parse", "--verify", "--quiet", "HEAD"]);
  return exitCode === 1;
}
//@ chunk-wyqg6m3h.js:19441-19807 placement
function overlayUnstaged(e, o) {
  let r = new Map(o.files.map((file) => [file.path, file]));
  let mapped = e.files.map((file) => {
    let p = r.get(file.path);
    if (!p) return file;
    let isBinary = file.isBinary || p.isBinary;
    let added = isBinary ? 0 : Math.max(0, file.added + p.added - p.removed);
    return {
      ...file,
      added,
      removed: 0,
      isBinary,
    };
  });
  let linesAdded =
    e.stats.linesAdded +
    mapped.reduce((acc, p) => acc + p.added, 0) -
    e.files.reduce((acc, file) => acc + file.added, 0);
  return {
    stats: {
      ...e.stats,
      linesAdded,
    },
    files: mapped,
  };
}
//@ chunk-wyqg6m3h.js:19807-19816 placement
var REPOSITORY_LINES = 3;
//@ chunk-wyqg6m3h.js:19816-20095 placement
async function repositoryOf(e) {
  let { exitCode, stdout } = await e([
    NO_OPTIONAL_LOCKS,
    "rev-parse",
    "--path-format=absolute",
    "--show-toplevel",
    "--git-dir",
    "--git-common-dir",
  ]);
  let filtered = stdout
    .split(
      `
`,
    )
    .filter((line) => line !== "");
  let [n = "", a = "", i = ""] = filtered;
  return exitCode === 0 && filtered.length === REPOSITORY_LINES && filtered.every(isAbsolutePath)
    ? {
        toplevel: n,
        gitDir: a,
        commonDir: i,
      }
    : null;
}
//@ chunk-wyqg6m3h.js:20095-20600 placement
async function statsOf(e, o) {
  let run = e.run;
  let cutBases = e.deps.cutBases;
  let n = [...DIFF_LEADING_ARGS, o, "--shortstat"];
  if (cutBases?.has(o)) {
    let y = await run(n);
    if (y.exitCode !== 0) return null;
    let shortstat = parseShortstat(y.stdout);
    if (shortstat !== null && shortstat.filesCount > MAX_FILES_FOR_DETAILS)
      return {
        stats: shortstat,
        files: [],
      };
  }
  let a = await run([...DIFF_LEADING_ARGS, o, "--numstat", "-z"]);
  if (isWholeAnswer(a)) {
    cutBases?.delete(o);
    let numstat = parseNumstat(a.stdout, MAX_FILES);
    return numstat.stats.filesCount > MAX_FILES_FOR_DETAILS
      ? {
          stats: numstat.stats,
          files: [],
        }
      : numstat;
  }
  if (a.exitCode !== 0) return null;
  cutBases?.add(o);
  let i = await run(n);
  let p = i.exitCode === 0 ? parseShortstat(i.stdout) : null;
  return p !== null && p.filesCount > MAX_FILES_FOR_DETAILS
    ? {
        stats: p,
        files: [],
      }
    : null;
}
//@ chunk-wyqg6m3h.js:20600-20642 placement
var wasDirtyAtStart = (e, o) => e.deps.baseline?.has(o) ?? true;
//@ chunk-wyqg6m3h.js:20642-20787 placement
async function tagPreSession(e, files) {
  let r = await datingsOf(
    e,
    files.map((s) => s.path),
  );
  return files.map((s) => ({
    ...s,
    isPreSession: r.get(s.path) === "pre-session" && wasDirtyAtStart(e, s.path),
  }));
}
//@ chunk-wyqg6m3h.js:20787-20904 placement
async function unstagedNumstat(run) {
  let o = await run([...DIFF_LEADING_ARGS, "--numstat", "-z"]);
  return isWholeAnswer(o) ? parseNumstat(o.stdout, Number.POSITIVE_INFINITY) : null;
}
//@ chunk-wyqg6m3h.js:20904-21370 placement
async function buildUntrackedFileEntries(e, o, r) {
  let sliced = o.slice(0, MAX_UNTRACKED_PROBES);
  let n = await datingsOf(e, sliced);
  let a = (d, T) => T === "unlisted" || (T === "pre-session" && wasDirtyAtStart(e, d));
  let mapped = sliced.map((d) => ({
    path: d,
    isPreSession: a(d, n.get(d)),
  }));
  let l =
    r.scope === "with-pre-session"
      ? [
          ...mapped.filter((d) => d.isPreSession),
          ...o.slice(MAX_UNTRACKED_PROBES).map((path) => ({
            path,
            isPreSession: true,
          })),
        ]
      : [];
  return [...mapped.filter((d) => !d.isPreSession), ...l].slice(0, r.slots).map((d) => ({
    path: d.path,
    renamedFrom: null,
    added: 0,
    removed: 0,
    isBinary: false,
    isUntracked: true,
    isPreSession: d.isPreSession,
  }));
}
export {
  NO_OPTIONAL_LOCKS,
  isWholeAnswer,
  buildUntrackedFileEntries,
  CONVENTIONAL_DEFAULT_BRANCHES,
  DIFF_LEADING_ARGS,
  EMPTY_FILE_HUNKS,
  FAILED_RUN,
  FILE_HEADER_START,
  GIT_CHILD_ENV,
  HUNKS_ARGS,
  HUNK_HEADER,
  LARGE_FILE_HUNKS,
  MOST_UTF8_BYTES,
  QUOTED_HEADER_START,
  REBASE_STATE_FILES,
  RENAME_RECORDS,
  REPOSITORY_LINES,
  SAFE_REF_PATTERN,
  SHORTSTAT_PATTERN,
  STATUS_PATH_OFFSET,
  UNMERGED_STATUS,
  branchBaseOf,
  currentBranchOf,
  cutHunks,
  datingsOf,
  defaultBranchOf,
  dirtyPathsOf,
  displayPathOf,
  headKeyOf,
  hunkOf,
  isAbsolutePath,
  isBodyLine,
  getTaskListLockPath,
  isSha,
  isRebaseOrTransientState,
  isUnbornHead,
  isUnderUtf8Ceiling,
  isWholeListing,
  kindWalkOf,
  mergeBaseCandidatesOf,
  missingBaseOf,
  overlayUnstaged,
  parseFileDiff,
  parseFileDiffs,
  parseNumstat,
  parseShortstat,
  pinnedLeadOf,
  renameDisplayOf,
  repositoryOf,
  stampIfFile,
  stampProbeOf,
  statsOf,
  tagPreSession,
  unstagedNumstat,
  wasDirtyAtStart,
};
