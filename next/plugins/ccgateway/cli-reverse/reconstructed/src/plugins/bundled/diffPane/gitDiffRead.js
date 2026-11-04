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
import { deferInit } from "../../../../runtime/deferred-init.js";

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
var pinnedLeadOf = (repo) => [`--git-dir=${repo.gitDir}`, `--work-tree=${repo.toplevel}`];
//@ chunk-wyqg6m3h.js:12381-12531 placement
function cutHunks(hunks) {
  let remaining = MAX_LINES_PER_FILE;
  let totalLines = 0;
  return {
    hunks: hunks.map((hunk) => {
      let sliced = hunk.lines.slice(0, remaining);
      remaining -= sliced.length;
      totalLines += hunk.lines.length;
      return {
        ...hunk,
        lines: sliced,
      };
    }),
    isTruncated: totalLines > MAX_LINES_PER_FILE,
  };
}
//@ chunk-wyqg6m3h.js:12531-12908 placement
function renameDisplayOf(renamedFrom, path) {
  let prefixLen = 0;
  let suffixLen = 0;
  for (let j = 0; j < renamedFrom.length && j < path.length; j++) {
    if (renamedFrom[j] !== path[j]) break;
    if (renamedFrom[j] === "/") prefixLen = j + 1;
  }
  let minCut = prefixLen - (prefixLen > 0 ? 1 : 0);
  for (let j = 1; renamedFrom.length - j >= minCut && path.length - j >= minCut; j++) {
    let char = renamedFrom[renamedFrom.length - j];
    if (char !== path[path.length - j]) break;
    if (char === "/") suffixLen = j;
  }
  let middleOf = (value) => value.slice(prefixLen, Math.max(prefixLen, value.length - suffixLen));
  let middleText = `${middleOf(renamedFrom)} => ${middleOf(path)}`;
  let hasCommon = prefixLen + suffixLen > 0;
  let sliced = renamedFrom.slice(0, prefixLen);
  let sliced_2 = renamedFrom.slice(renamedFrom.length - suffixLen);
  return hasCommon ? `${sliced}{${middleText}}${sliced_2}` : middleText;
}
//@ chunk-wyqg6m3h.js:12908-12977 placement
function displayPathOf(file) {
  let { renamedFrom, path } = file;
  return renamedFrom === null ? path : renameDisplayOf(renamedFrom, path);
}
//@ chunk-wyqg6m3h.js:12977-13036 placement
var EMPTY_FILE_HUNKS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wyqg6m3h.js:12977", () => {
  EMPTY_FILE_HUNKS = Object.freeze({
    hunks: [],
    isTruncated: false,
    isLarge: false,
  });
});
//@ chunk-wyqg6m3h.js:13036-13092 placement
var FAILED_RUN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wyqg6m3h.js:13036", () => {
  FAILED_RUN = Object.freeze({
    exitCode: -1,
    stdout: "",
    stderr: "",
  });
});
//@ chunk-wyqg6m3h.js:13092-13226 placement
async function currentBranchOf(run) {
  let { exitCode, stdout } = await run([NO_OPTIONAL_LOCKS, "rev-parse", "--abbrev-ref", "HEAD"]);
  let trimmed = stdout.trim();
  return exitCode === 0 && trimmed !== "" ? trimmed : "HEAD";
}
//@ chunk-wyqg6m3h.js:13226-13251 placement
var CONVENTIONAL_DEFAULT_BRANCHES = ["main", "master"];
//@ chunk-wyqg6m3h.js:13251-13585 placement
async function defaultBranchOf(run) {
  let existsOnOrigin = async (branch) =>
    (await run([NO_OPTIONAL_LOCKS, "show-ref", "--verify", "--quiet", `refs/remotes/origin/${branch}`]))
      .exitCode === 0;
  let headRef = await run([NO_OPTIONAL_LOCKS, "symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
  let originDefault = headRef.exitCode === 0 ? headRef.stdout.trim().replace(/^origin\//, "") : "";
  if (originDefault !== "" && (await existsOnOrigin(originDefault))) return originDefault;
  for (let branch of CONVENTIONAL_DEFAULT_BRANCHES) if (await existsOnOrigin(branch)) return branch;
  return "main";
}
//@ chunk-wyqg6m3h.js:13585-13639 placement
var isSha = (value) => /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(value);
//@ chunk-wyqg6m3h.js:13639-13886 placement
async function mergeBaseCandidatesOf(run, baseBranch) {
  let results = [
    await run([NO_OPTIONAL_LOCKS, "merge-base", "HEAD", `origin/${baseBranch}`]),
    await run([NO_OPTIONAL_LOCKS, "merge-base", "HEAD", baseBranch]),
  ];
  return {
    candidates: results
      .filter((result) => result.exitCode === 0)
      .map((result) => result.stdout.trim())
      .filter(isSha),
    hasNoCommonAncestor: results.some((result) => result.exitCode === 1),
  };
}
//@ chunk-wyqg6m3h.js:13886-14117 placement
async function missingBaseOf(run, baseBranch) {
  for (let ref of [`refs/remotes/origin/${baseBranch}`, `refs/heads/${baseBranch}`]) {
    let { exitCode } = await run([NO_OPTIONAL_LOCKS, "show-ref", "--verify", "--quiet", ref]);
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
  let [branch, defaultBranch] = await Promise.all([currentBranchOf(run), defaultBranchOf(run)]);
  if (branch === "HEAD" || defaultBranch.startsWith("-"))
    return {
      kind: "none",
    };
  if (branch === defaultBranch)
    return {
      kind: "head-is-base",
      baseBranch: defaultBranch,
    };
  let { candidates, hasNoCommonAncestor } = await mergeBaseCandidatesOf(run, defaultBranch);
  let [firstCandidate, secondCandidate] = candidates;
  if (firstCandidate === undefined)
    return hasNoCommonAncestor
      ? {
          kind: "none",
        }
      : missingBaseOf(run, defaultBranch);
  let mergeBase =
    secondCandidate !== undefined &&
    secondCandidate !== firstCandidate &&
    (await run([NO_OPTIONAL_LOCKS, "merge-base", "--is-ancestor", firstCandidate, secondCandidate]))
      .exitCode === 0
      ? secondCandidate
      : firstCandidate;
  let headRev = await run([NO_OPTIONAL_LOCKS, "rev-parse", "HEAD"]);
  if (headRev.exitCode !== 0)
    return {
      kind: "error",
      reason: "head_rev_parse_failed",
    };
  return headRev.stdout.trim() === mergeBase
    ? {
        kind: "head-is-base",
        baseBranch: defaultBranch,
      }
    : {
        kind: "merge-base",
        mergeBase,
        baseBranch: defaultBranch,
      };
}
//@ chunk-wyqg6m3h.js:14691-14874 placement
async function stampIfFile(stamps, relPath) {
  let isDir = relPath.endsWith("/");
  let trimmedPath = isDir ? relPath.slice(0, -1) : relPath;
  let kind = await stamps.walk.kindOf(trimmedPath);
  return kind === "over-budget"
    ? "over-budget"
    : kind === (isDir ? "dir" : "file")
      ? stamps.mtimeOf(`${stamps.base}/${trimmedPath}`)
      : null;
}
//@ chunk-wyqg6m3h.js:14874-15136 placement
async function datingsOf(context, paths) {
  let { sessionStartMs } = context.deps;
  let results = await Promise.all(paths.map((path) => stampIfFile(context.stamps, path)));
  function stampOf(stamp) {
    if (stamp === "over-budget") return "unlisted";
    return (stamp ?? Number.POSITIVE_INFINITY) < sessionStartMs ? "pre-session" : "session";
  }
  return new Map(paths.map((path, index) => [path, stampOf(results[index] ?? null)]));
}
//@ chunk-wyqg6m3h.js:15136-15157 placement
var FILE_HEADER_START = "diff --git ";
//@ chunk-wyqg6m3h.js:15157-15218 placement
var HUNK_HEADER_RE = /^@@ -(?<old>\d+)(?:,\d+)? \+(?<new>\d+)(?:,\d+)? @@/;
//@ chunk-wyqg6m3h.js:15218-15286 placement
var isBodyLine = (line) => line.startsWith("+") || line.startsWith("-") || line.startsWith(" ");
//@ chunk-wyqg6m3h.js:15286-15295 placement
var MOST_UTF8_BYTES = 3;
//@ chunk-wyqg6m3h.js:15295-15361 placement
var isUnderUtf8Ceiling = (text, limit) =>
  text.length * MOST_UTF8_BYTES < limit || new TextEncoder().encode(text).length < limit;
//@ chunk-wyqg6m3h.js:15361-15419 placement
var isWholeListing = (text, terminator = "\x00") =>
  (text === "" || text.endsWith(terminator)) &&
  isUnderUtf8Ceiling(text, HOST_OUTPUT_CAP_BYTES - MOST_UTF8_BYTES);
//@ chunk-wyqg6m3h.js:15419-15460 placement
var isWholeAnswer = (result) => result.exitCode === 0 && isWholeListing(result.stdout);
//@ chunk-wyqg6m3h.js:15460-15534 placement
var hunkOf = (groups, lines) => ({
  oldStart: Number(groups?.old),
  newStart: Number(groups?.new),
  lines,
});
//@ chunk-wyqg6m3h.js:15534-15593 placement
var LARGE_FILE_HUNKS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wyqg6m3h.js:15534", () => {
  LARGE_FILE_HUNKS = Object.freeze({
    hunks: [],
    isTruncated: false,
    isLarge: true,
  });
});
//@ chunk-wyqg6m3h.js:15593-15791 placement
function parseFileDiff(text) {
  if (text.length > MAX_DIFF_BYTES) return LARGE_FILE_HUNKS;
  let lines = text.split(`
`);
  let flattened = lines.flatMap((line, index) => (HUNK_HEADER_RE.test(line) ? [index] : []));
  return {
    ...cutHunks(
      flattened.map((lineIndex, hunkIndex) =>
        hunkOf(
          HUNK_HEADER_RE.exec(lines[lineIndex] ?? "")?.groups,
          lines.slice(lineIndex + 1, flattened[hunkIndex + 1]).filter(isBodyLine),
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
function parseFileDiffs(text, wantedPaths) {
  let parts = text.split("\x00");
  let index = parts.findIndex((part, index) => index % 2 === 0 && !part.startsWith(":"));
  let filtered = parts
    .slice(0, index)
    .filter((part, index) => index % 2 === 1 && !parts[index - 1]?.endsWith(UNMERGED_STATUS));
  let hasEmptyPath = parts[index] === "";
  let lines = parts.slice(index + (hasEmptyPath ? 1 : 0)).join("\x00").split(`
`);
  let flattened = lines.flatMap((line, index) => (line.startsWith(FILE_HEADER_START) ? [index] : []));
  let filtered_2 = flattened.filter(
    (index, position) => lines[index] !== lines[flattened[position - 1] ?? -1],
  );
  let isWhole = isWholeListing(
    text,
    `
`,
  );
  let filtered_3 = filtered_2
    .map((startIndex, index) => {
      let endIndex = filtered_2[index + 1];
      let path = filtered[index] ?? "";
      let isLast = endIndex === undefined;
      return {
        path,
        isNamed:
          lines[startIndex]?.startsWith(QUOTED_HEADER_START) === true ||
          lines[startIndex] === `${FILE_HEADER_START}a/${path} b/${path}`,
        isCut: isLast && !isWhole,
        text:
          lines.slice(startIndex, endIndex).join(`
`) +
          (isLast
            ? ""
            : `
`),
      };
    })
    .filter((part) => !part.isCut || part.text.length > MAX_DIFF_BYTES);
  if (!(
    index !== -1 &&
    filtered_2.length <= filtered.length &&
    (filtered_2.length === filtered.length || filtered_2.length === 0 || !isWhole) &&
    filtered_3.every((part) => part.isNamed)
  ))
    return new Map();
  let diffs = new Map(filtered_3.map((part) => [part.path, parseFileDiff(part.text)]));
  let unparsedPaths = isWhole ? [] : filtered.slice(filtered_3.length);
  return new Map(
    wantedPaths
      .filter((path) => !unparsedPaths.includes(path))
      .map((path) => [path, diffs.get(path) ?? EMPTY_FILE_HUNKS]),
  );
}
//@ chunk-wyqg6m3h.js:16605-16614 placement
var RENAME_RECORDS = 3;
//@ chunk-wyqg6m3h.js:16614-17135 placement
function parseNumstat(stdout, maxFiles) {
  let files = [];
  let stats = {
    filesCount: 0,
    linesAdded: 0,
    linesRemoved: 0,
  };
  let parts = stdout.split("\x00");
  let index = 0;
  while (index < parts.length) {
    let [addedText, removedText, ...pathParts] = (parts[index] ?? "").split("\t");
    let joined = pathParts.join("\t");
    let isRename = pathParts.length === 1 && joined === "";
    let renamedFrom = isRename ? (parts[index + 1] ?? null) : null;
    let path = isRename ? (parts[index + 2] ?? "") : joined;
    index += isRename ? RENAME_RECORDS : 1;
    if (!(addedText !== undefined && removedText !== undefined && path !== "")) continue;
    let isBinary = addedText === "-" || removedText === "-";
    let added = isBinary ? 0 : Number(addedText) || 0;
    let removed = isBinary ? 0 : Number(removedText) || 0;
    stats.filesCount += 1;
    stats.linesAdded += added;
    stats.linesRemoved += removed;
    if (files.length < maxFiles)
      files.push({
        path,
        renamedFrom,
        added,
        removed,
        isBinary,
        isUntracked: false,
        isPreSession: false,
      });
  }
  return {
    stats,
    files,
  };
}
//@ chunk-wyqg6m3h.js:17135-17308 placement
var SHORTSTAT_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wyqg6m3h.js:17135", () => {
  SHORTSTAT_PATTERN = new RegExp(
    [
      String.raw`(?<files>\d+) files? changed`,
      String.raw`(?:, (?<added>\d+) insertions?\(\+\))?`,
      String.raw`(?:, (?<removed>\d+) deletions?\(-\))?`,
    ].join(""),
  );
});
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
async function dirtyPathsOf(run) {
  let result = await run([
    NO_OPTIONAL_LOCKS,
    "status",
    "--porcelain",
    "-z",
    "--untracked-files=all",
    "--no-renames",
    "--ignore-submodules=dirty",
  ]);
  let filtered = result.stdout.split("\x00").filter((record) => record !== "");
  return isWholeAnswer(result) ? new Set(filtered.map((record) => record.slice(STATUS_PATH_OFFSET))) : null;
}
//@ chunk-wyqg6m3h.js:17705-17760 placement
/**
 * refs/ 路径正则。
 */
var SAFE_REF_PATTERN = /^refs(?:\/[A-Za-z0-9_@+-][A-Za-z0-9._@+-]*)+$/;
//@ chunk-wyqg6m3h.js:17760-17848 placement (2.1.88 match: getTaskListLockPath, 1)
/**
 * refs/ 路径安全检查（切分误归）。
 */
var getTaskListLockPath = (taskListId) =>
  SAFE_REF_PATTERN.test(taskListId) &&
  !taskListId.includes("..") &&
  !taskListId.split("/").some((segment) => segment.endsWith(".lock"));
//@ chunk-wyqg6m3h.js:17848-18276 placement
function kindWalkOf(entryKindsOf, base, budget) {
  let cache = new Map();
  function kindOfDir(relDir) {
    let cached = cache.get(relDir);
    if (cached === undefined && cache.size >= budget) return "over-budget";
    let entries = cached ?? entryKindsOf(relDir === "" ? base : `${base}/${relDir}`);
    cache.set(relDir, entries);
    return entries;
  }
  async function kindOfPath(relPath) {
    let segments = relPath === "" ? [] : relPath.split("/");
    let prefix = "";
    for (let [index, segment] of segments.entries()) {
      let entries = kindOfDir(prefix);
      if (entries === "over-budget") return "over-budget";
      let kind = (await entries)?.get(segment) ?? null;
      if (index === segments.length - 1) return kind;
      if (kind !== "dir") return null;
      prefix = prefix === "" ? segment : `${prefix}/${segment}`;
    }
    return "dir";
  }
  return {
    kindOf: kindOfPath,
  };
}
//@ chunk-wyqg6m3h.js:18276-18349 placement
var stampProbeOf = (deps, base, budget) => ({
  walk: kindWalkOf(deps.entryKindsOf, base, budget),
  base,
  mtimeOf: deps.mtimeOf,
});
//@ chunk-wyqg6m3h.js:18349-18905 placement
async function headKeyOf(deps, repository) {
  let gitProbe = stampProbeOf(deps, repository.gitDir, MAX_LISTED_DIRECTORIES);
  let commonProbe =
    repository.commonDir === repository.gitDir
      ? gitProbe
      : stampProbeOf(deps, repository.commonDir, MAX_LISTED_DIRECTORIES);
  async function revKey() {
    let result = await deps.run([NO_OPTIONAL_LOCKS, "rev-parse", "--verify", "--quiet", "HEAD"]);
    return `rev:${result.exitCode === 0 ? result.stdout.trim() : ""}`;
  }
  if ((await gitProbe.walk.kindOf("HEAD")) !== "file") return revKey();
  let headContent = await deps.readFile(`${repository.gitDir}/HEAD`).catch(() => "");
  let taskListId = headContent.startsWith("ref: ") ? headContent.slice(5).trim() : "";
  let hasRef = taskListId !== "";
  let canUseRef = hasRef && !getTaskListLockPath(taskListId);
  let logStamp = canUseRef ? await stampIfFile(gitProbe, "logs/HEAD") : null;
  let useRevFallback = canUseRef && typeof logStamp !== "number";
  let useRefStamp = hasRef && !canUseRef;
  return useRevFallback
    ? revKey()
    : [
        headContent,
        await stampIfFile(gitProbe, "HEAD"),
        useRefStamp ? await stampIfFile(commonProbe, taskListId) : logStamp,
        await stampIfFile(commonProbe, "packed-refs"),
      ].join("|");
}
//@ chunk-wyqg6m3h.js:18905-18962 placement
var isAbsolutePath = (path) => path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);
//@ chunk-wyqg6m3h.js:18962-19052 placement
var REBASE_STATE_FILES = {
  head: "REBASE_HEAD",
  merge: "rebase-merge",
  apply: "rebase-apply",
  rebasing: "rebasing",
};
//@ chunk-wyqg6m3h.js:19107-19338 placement
async function isRebaseOrTransientState(entryKindsOf, gitDir) {
  let entries = await entryKindsOf(gitDir);
  let hasHead = entries?.get(REBASE_STATE_FILES.head) === "file";
  let rebaseApply =
    hasHead && entries?.get(REBASE_STATE_FILES.apply) === "dir"
      ? await entryKindsOf(`${gitDir}/${REBASE_STATE_FILES.apply}`)
      : null;
  return (
    (hasHead &&
      (entries?.get(REBASE_STATE_FILES.merge) === "dir" ||
        rebaseApply?.get(REBASE_STATE_FILES.rebasing) === "file")) ||
    TRANSIENT_STATE_FILES.some((name) => entries?.get(name) === "file")
  );
}
//@ chunk-wyqg6m3h.js:19338-19441 placement
async function isUnbornHead(run) {
  let { exitCode } = await run([NO_OPTIONAL_LOCKS, "rev-parse", "--verify", "--quiet", "HEAD"]);
  return exitCode === 1;
}
//@ chunk-wyqg6m3h.js:19441-19807 placement
function overlayUnstaged(cached, unstaged) {
  let unstagedByPath = new Map(unstaged.files.map((file) => [file.path, file]));
  let mapped = cached.files.map((file) => {
    let unstagedFile = unstagedByPath.get(file.path);
    if (!unstagedFile) return file;
    let isBinary = file.isBinary || unstagedFile.isBinary;
    let added = isBinary ? 0 : Math.max(0, file.added + unstagedFile.added - unstagedFile.removed);
    return {
      ...file,
      added,
      removed: 0,
      isBinary,
    };
  });
  let linesAdded =
    cached.stats.linesAdded +
    mapped.reduce((acc, file) => acc + file.added, 0) -
    cached.files.reduce((acc, file) => acc + file.added, 0);
  return {
    stats: {
      ...cached.stats,
      linesAdded,
    },
    files: mapped,
  };
}
//@ chunk-wyqg6m3h.js:19807-19816 placement
var REPOSITORY_LINES = 3;
//@ chunk-wyqg6m3h.js:19816-20095 placement
async function repositoryOf(run) {
  let { exitCode, stdout } = await run([
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
  let [toplevel = "", gitDir = "", commonDir = ""] = filtered;
  return exitCode === 0 && filtered.length === REPOSITORY_LINES && filtered.every(isAbsolutePath)
    ? {
        toplevel,
        gitDir,
        commonDir,
      }
    : null;
}
//@ chunk-wyqg6m3h.js:20095-20600 placement
async function statsOf(context, baseRef) {
  let run = context.run;
  let cutBases = context.deps.cutBases;
  let shortstatArgs = [...DIFF_LEADING_ARGS, baseRef, "--shortstat"];
  if (cutBases?.has(baseRef)) {
    let result = await run(shortstatArgs);
    if (result.exitCode !== 0) return null;
    let shortstat = parseShortstat(result.stdout);
    if (shortstat !== null && shortstat.filesCount > MAX_FILES_FOR_DETAILS)
      return {
        stats: shortstat,
        files: [],
      };
  }
  let numstatResult = await run([...DIFF_LEADING_ARGS, baseRef, "--numstat", "-z"]);
  if (isWholeAnswer(numstatResult)) {
    cutBases?.delete(baseRef);
    let numstat = parseNumstat(numstatResult.stdout, MAX_FILES);
    return numstat.stats.filesCount > MAX_FILES_FOR_DETAILS
      ? {
          stats: numstat.stats,
          files: [],
        }
      : numstat;
  }
  if (numstatResult.exitCode !== 0) return null;
  cutBases?.add(baseRef);
  let shortstatResult = await run(shortstatArgs);
  let shortstat = shortstatResult.exitCode === 0 ? parseShortstat(shortstatResult.stdout) : null;
  return shortstat !== null && shortstat.filesCount > MAX_FILES_FOR_DETAILS
    ? {
        stats: shortstat,
        files: [],
      }
    : null;
}
//@ chunk-wyqg6m3h.js:20600-20642 placement
var wasDirtyAtStart = (context, path) => context.deps.baseline?.has(path) ?? true;
//@ chunk-wyqg6m3h.js:20642-20787 placement
async function tagPreSession(context, files) {
  let datings = await datingsOf(
    context,
    files.map((file) => file.path),
  );
  return files.map((file) => ({
    ...file,
    isPreSession: datings.get(file.path) === "pre-session" && wasDirtyAtStart(context, file.path),
  }));
}
//@ chunk-wyqg6m3h.js:20787-20904 placement
async function unstagedNumstat(run) {
  let result = await run([...DIFF_LEADING_ARGS, "--numstat", "-z"]);
  return isWholeAnswer(result) ? parseNumstat(result.stdout, Number.POSITIVE_INFINITY) : null;
}
//@ chunk-wyqg6m3h.js:20904-21370 placement
async function buildUntrackedFileEntries(context, paths, scope) {
  let paths_2 = paths.slice(0, MAX_UNTRACKED_PROBES);
  let datings = await datingsOf(context, paths_2);
  let isPreSessionPath = (path, dating) =>
    dating === "unlisted" || (dating === "pre-session" && wasDirtyAtStart(context, path));
  let mapped = paths_2.map((path) => ({
    path,
    isPreSession: isPreSessionPath(path, datings.get(path)),
  }));
  let earlyPaths =
    scope.scope === "with-pre-session"
      ? [
          ...mapped.filter((entry) => entry.isPreSession),
          ...paths.slice(MAX_UNTRACKED_PROBES).map((path) => ({
            path,
            isPreSession: true,
          })),
        ]
      : [];
  return [...mapped.filter((entry) => !entry.isPreSession), ...earlyPaths]
    .slice(0, scope.slots)
    .map((entry) => ({
      path: entry.path,
      renamedFrom: null,
      added: 0,
      removed: 0,
      isBinary: false,
      isUntracked: true,
      isPreSession: entry.isPreSession,
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
  HUNK_HEADER_RE,
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
