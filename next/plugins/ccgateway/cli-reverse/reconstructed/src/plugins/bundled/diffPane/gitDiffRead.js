/**
 * plugins/bundled/diffPane/gitDiffRead.ts
 *
 * 2.1.316 新增：diff 面板的 git 读取：解析文件 diff 与 numstat、分支基点、HEAD 键。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c7hntn0y.js (55)
 * attribution: placement 55
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-c7hntn0y.js:12368-12541 placement
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
//@ chunk-c7hntn0y.js:12541-12573 placement
var GIT_CHILD_ENV = {
  LC_ALL: "C",
  LANGUAGE: "",
};
//@ chunk-c7hntn0y.js:12573-12651 placement
var HUNKS_ARGS = ["--no-renames", "--src-prefix=a/", "--dst-prefix=b/", "--raw", "-z", "-p"];
//@ chunk-c7hntn0y.js:12651-12679 placement
var NO_OPTIONAL_LOCKS = "--no-optional-locks";
//@ chunk-c7hntn0y.js:12679-12745 placement
var pinnedLeadOf = (repo) => [`--git-dir=${repo.gitDir}`, `--work-tree=${repo.toplevel}`];
//@ chunk-c7hntn0y.js:12745-12895 placement
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
//@ chunk-c7hntn0y.js:12895-13272 placement
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
//@ chunk-c7hntn0y.js:13272-13341 placement
function displayPathOf(file) {
  let { renamedFrom, path } = file;
  return renamedFrom === null ? path : renameDisplayOf(renamedFrom, path);
}
//@ chunk-c7hntn0y.js:13341-13400 placement
var EMPTY_FILE_HUNKS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c7hntn0y.js:13341", () => {
  EMPTY_FILE_HUNKS = Object.freeze({
    hunks: [],
    isTruncated: false,
    isLarge: false,
  });
});
//@ chunk-c7hntn0y.js:13400-13456 placement
var FAILED_RUN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c7hntn0y.js:13400", () => {
  FAILED_RUN = Object.freeze({
    exitCode: -1,
    stdout: "",
    stderr: "",
  });
});
//@ chunk-c7hntn0y.js:13456-13590 placement
async function currentBranchOf(run) {
  let { exitCode, stdout } = await run([NO_OPTIONAL_LOCKS, "rev-parse", "--abbrev-ref", "HEAD"]);
  let trimmed = stdout.trim();
  return exitCode === 0 && trimmed !== "" ? trimmed : "HEAD";
}
//@ chunk-c7hntn0y.js:13590-13615 placement
var CONVENTIONAL_DEFAULT_BRANCHES = ["main", "master"];
//@ chunk-c7hntn0y.js:13615-13949 placement
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
//@ chunk-c7hntn0y.js:13949-14003 placement
var isSha = (value) => /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(value);
//@ chunk-c7hntn0y.js:14003-14250 placement
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
//@ chunk-c7hntn0y.js:14250-14481 placement
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
//@ chunk-c7hntn0y.js:14481-15055 placement
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
//@ chunk-c7hntn0y.js:15055-15238 placement
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
//@ chunk-c7hntn0y.js:15238-15500 placement
async function datingsOf(context, paths) {
  let { sessionStartMs } = context.deps;
  let results = await Promise.all(paths.map((path) => stampIfFile(context.stamps, path)));
  function stampOf(stamp) {
    if (stamp === "over-budget") return "unlisted";
    return (stamp ?? Number.POSITIVE_INFINITY) < sessionStartMs ? "pre-session" : "session";
  }
  return new Map(paths.map((path, index) => [path, stampOf(results[index] ?? null)]));
}
//@ chunk-c7hntn0y.js:15500-15521 placement
var FILE_HEADER_START = "diff --git ";
//@ chunk-c7hntn0y.js:15521-15582 placement
var HUNK_HEADER_RE = /^@@ -(?<old>\d+)(?:,\d+)? \+(?<new>\d+)(?:,\d+)? @@/;
//@ chunk-c7hntn0y.js:15582-15650 placement
var isBodyLine = (line) => line.startsWith("+") || line.startsWith("-") || line.startsWith(" ");
//@ chunk-c7hntn0y.js:15650-15659 placement
var MOST_UTF8_BYTES = 3;
//@ chunk-c7hntn0y.js:15659-15725 placement
var isUnderUtf8Ceiling = (text, limit) =>
  text.length * MOST_UTF8_BYTES < limit || new TextEncoder().encode(text).length < limit;
//@ chunk-c7hntn0y.js:15725-15783 placement
var isWholeListing = (text, terminator = "\x00") =>
  (text === "" || text.endsWith(terminator)) &&
  isUnderUtf8Ceiling(text, HOST_OUTPUT_CAP_BYTES - MOST_UTF8_BYTES);
//@ chunk-c7hntn0y.js:15783-15824 placement
var isWholeAnswer = (result) => result.exitCode === 0 && isWholeListing(result.stdout);
//@ chunk-c7hntn0y.js:15824-15898 placement
var hunkOf = (groups, lines) => ({
  oldStart: Number(groups?.old),
  newStart: Number(groups?.new),
  lines,
});
//@ chunk-c7hntn0y.js:15898-15957 placement
var LARGE_FILE_HUNKS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c7hntn0y.js:15898", () => {
  LARGE_FILE_HUNKS = Object.freeze({
    hunks: [],
    isTruncated: false,
    isLarge: true,
  });
});
//@ chunk-c7hntn0y.js:15957-16155 placement
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
//@ chunk-c7hntn0y.js:16155-16171 placement
var QUOTED_HEADER_START = `${FILE_HEADER_START}"`;
//@ chunk-c7hntn0y.js:16171-16183 placement
var UNMERGED_STATUS = " U";
//@ chunk-c7hntn0y.js:16183-16969 placement
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
//@ chunk-c7hntn0y.js:16969-16978 placement
var RENAME_RECORDS = 3;
//@ chunk-c7hntn0y.js:16978-17499 placement
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
//@ chunk-c7hntn0y.js:17499-17672 placement
var SHORTSTAT_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-c7hntn0y.js:17499", () => {
  SHORTSTAT_PATTERN = new RegExp(
    [
      String.raw`(?<files>\d+) files? changed`,
      String.raw`(?:, (?<added>\d+) insertions?\(\+\))?`,
      String.raw`(?:, (?<removed>\d+) deletions?\(-\))?`,
    ].join(""),
  );
});
//@ chunk-c7hntn0y.js:17672-17829 placement
function parseShortstat(stdout) {
  let groups = SHORTSTAT_PATTERN.exec(stdout)?.groups;
  if (!groups) return null;
  return {
    filesCount: Number(groups.files),
    linesAdded: Number(groups.added ?? 0),
    linesRemoved: Number(groups.removed ?? 0),
  };
}
//@ chunk-c7hntn0y.js:17829-17838 placement
var STATUS_PATH_OFFSET = 3;
//@ chunk-c7hntn0y.js:17838-18069 placement
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
//@ chunk-c7hntn0y.js:18069-18124 placement
/**
 * refs/ 路径正则。
 */
var SAFE_REF_PATTERN = /^refs(?:\/[A-Za-z0-9_@+-][A-Za-z0-9._@+-]*)+$/;
//@ chunk-c7hntn0y.js:18124-18212 placement (2.1.88 match: getTaskListLockPath, 1)
/**
 * refs/ 路径安全检查（切分误归）。
 */
var getTaskListLockPath = (taskListId) =>
  SAFE_REF_PATTERN.test(taskListId) &&
  !taskListId.includes("..") &&
  !taskListId.split("/").some((segment) => segment.endsWith(".lock"));
//@ chunk-c7hntn0y.js:18212-18640 placement
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
//@ chunk-c7hntn0y.js:18640-18713 placement
var stampProbeOf = (deps, base, budget) => ({
  walk: kindWalkOf(deps.entryKindsOf, base, budget),
  base,
  mtimeOf: deps.mtimeOf,
});
//@ chunk-c7hntn0y.js:18713-19269 placement
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
//@ chunk-c7hntn0y.js:19269-19326 placement
var isAbsolutePath = (path) => path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);
//@ chunk-c7hntn0y.js:19326-19416 placement
var REBASE_STATE_FILES = {
  head: "REBASE_HEAD",
  merge: "rebase-merge",
  apply: "rebase-apply",
  rebasing: "rebasing",
};
//@ chunk-c7hntn0y.js:19471-19702 placement
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
//@ chunk-c7hntn0y.js:19702-19805 placement
async function isUnbornHead(run) {
  let { exitCode } = await run([NO_OPTIONAL_LOCKS, "rev-parse", "--verify", "--quiet", "HEAD"]);
  return exitCode === 1;
}
//@ chunk-c7hntn0y.js:19805-20171 placement
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
//@ chunk-c7hntn0y.js:20171-20180 placement
var REPOSITORY_LINES = 3;
//@ chunk-c7hntn0y.js:20180-20459 placement
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
//@ chunk-c7hntn0y.js:20459-20964 placement
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
//@ chunk-c7hntn0y.js:20964-21006 placement
var wasDirtyAtStart = (context, path) => context.deps.baseline?.has(path) ?? true;
//@ chunk-c7hntn0y.js:21006-21151 placement
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
//@ chunk-c7hntn0y.js:21151-21268 placement
async function unstagedNumstat(run) {
  let result = await run([...DIFF_LEADING_ARGS, "--numstat", "-z"]);
  return isWholeAnswer(result) ? parseNumstat(result.stdout, Number.POSITIVE_INFINITY) : null;
}
//@ chunk-c7hntn0y.js:21268-21734 placement
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
