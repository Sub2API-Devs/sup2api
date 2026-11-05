/**
 * utils/teleport/gitBundleLayout.ts
 *
 * 2.1.316 新增：上传前检查检出布局（git 根位置、gitlink、不写的文件模式、伪造/别名路径）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sfy2wa1e.js (9)
 * attribution: placement 9
 */
import { lstat } from "fs/promises";
import { join } from "path";
import { findGitRoot } from "../git.js";
import { getCwd } from "../cwd.js";
import {
  runGitForAudit,
  auditEnvironment,
  UNSET_REFERENCE_BACKEND_ENV,
  listGitRefs,
} from "../git/builderGit/gitConfigAudit.js";
import { GIT_SAFE_GLOBAL_ARGS, IGNORE_SUBMODULES_DIRTY_FLAG } from "../git/gitSafeEnv.js";
import { GIT_READ_CONFIG_ARGS, GIT_LIST_ENV } from "../git/builderGit/gitEnv.js";
import { splitIndexOffArgs, indexFileEnv } from "../git/builderGit/repoCopy.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { isSensitiveNameOrVariant } from "../permissions/sensitivePaths.js";
import {
  isCaseFoldingFileSystem,
  isSafeRepoRelativePath,
  hasDosShortNameSegment,
} from "./gitBundleVerify.js";
import { isNotPlainDirectory, lstatOrAbsent } from "./wipStash.js";
import { getErrnoCode } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-sfy2wa1e.js:109657-110397 placement
/**
 * git 根位置不安全时的拒绝文案（家目录、文件系统根、根含配置等）。
 */
var GIT_ROOT_REFUSALS = {
  folder_is_home:
    "Not uploading this working tree: this checkout\u2019s git root is your home directory, or a folder above it (a repository rooted there makes every folder under it part of it, so the upload would carry your tracked home files). Start from a project folder that is its own repository, or work on these files from a separate clone.",
  folder_is_root:
    "Not uploading this working tree: this checkout\u2019s git root is the filesystem root. Start from a project folder that is its own repository.",
  folder_holds_config:
    "Not uploading this working tree: this checkout\u2019s git root holds (or sits inside) Claude Code\u2019s own configuration directory. Start from a project folder that is its own repository.",
};
var GIT_PROBE_MAX_BUFFER = 268435456;
//@ chunk-sfy2wa1e.js:110397-111217 placement
async function checkGitRootLocation(cwd, signal, opts) {
  let gitRoot = findGitRoot(cwd ?? getCwd());
  if (!gitRoot)
    return {
      gitRoot: "",
      paths: [],
      added: new Set(),
      deleted: [],
      gitlinks: [],
      unwrittenModes: [],
    };
  let runGit = (args) =>
    runGitForAudit([...GIT_SAFE_GLOBAL_ARGS, ...GIT_READ_CONFIG_ARGS, ...splitIndexOffArgs(opts), ...args], {
      cwd: gitRoot,
      abortSignal: signal,
      env: {
        ...getRemoteHostSessionCount(
          {
            ...GIT_LIST_ENV,
            ...indexFileEnv(opts),
          },
          {
            base: auditEnvironment(),
            userLocale: true,
          },
        ),
        ...UNSET_REFERENCE_BACKEND_ENV,
      },
      maxBuffer: GIT_PROBE_MAX_BUFFER,
    });
  let [headCommit, unusualModes] = await Promise.all([
    runGit(["rev-parse", "--verify", "--quiet", "HEAD^{commit}"]),
    listUnusualIndexModes(gitRoot, signal, opts),
  ]);
  if (unusualModes === null) return null;
  if (unusualModes.unwrittenModes.length > 0)
    return {
      gitRoot,
      paths: [],
      added: new Set(),
      deleted: [],
      ...unusualModes,
    };
  if (headCommit.exitCode === 1)
    return {
      gitRoot,
      paths: [],
      added: new Set(),
      deleted: [],
      ...unusualModes,
    };
  let [worktreeDiff, cachedDiff] = await Promise.all([
    runGit(["diff", "--name-status", "-z", "--no-renames", IGNORE_SUBMODULES_DIRTY_FLAG, "HEAD", "--"]),
    runGit([
      "diff",
      "--cached",
      "--name-status",
      "-z",
      "--no-renames",
      IGNORE_SUBMODULES_DIRTY_FLAG,
      "HEAD",
      "--",
    ]),
  ]);
  if (headCommit.code !== 0 || worktreeDiff.code !== 0 || cachedDiff.code !== 0) return null;
  return {
    ...summarizeStatusEntries(
      parseNameStatusZ(worktreeDiff.stdout),
      parseNameStatusZ(cachedDiff.stdout),
      gitRoot,
    ),
    ...unusualModes,
  };
}
//@ chunk-sfy2wa1e.js:111217-111511 placement
function summarizeStatusEntries(nameStatusZ, nameStatusZ_2, gitRoot) {
  let pathsWhere = (entries, test) =>
    entries.filter(({ status, path }) => test(status) && path !== "").map(({ path }) => path);
  let allPaths = normalizeCaseForComparison_2([
    ...pathsWhere(nameStatusZ, (status) => status !== "D"),
    ...pathsWhere(nameStatusZ_2, (status) => status !== "D"),
  ]);
  let pathSet = new Set(allPaths);
  return {
    gitRoot,
    paths: allPaths,
    added: new Set(pathsWhere(nameStatusZ_2, (status) => status === "A")),
    deleted: normalizeCaseForComparison_2([
      ...pathsWhere(nameStatusZ, (status) => status === "D"),
      ...pathsWhere(nameStatusZ_2, (status) => status === "D"),
    ]).filter((path) => !pathSet.has(path)),
  };
}
//@ chunk-sfy2wa1e.js:111511-111638 placement
function parseNameStatusZ(stdout) {
  let parts = stdout.split("\x00");
  return Array.from(
    {
      length: Math.floor(parts.length / 2),
    },
    (index, index_2) => ({
      status: parts[2 * index_2],
      path: parts[2 * index_2 + 1],
    }),
  );
}
//@ chunk-sfy2wa1e.js:111638-111698 placement
var ORDINARY_FILE_MODE_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var INDEX_MODE_TYPE_MASK;
var GITLINK_MODE;
deferInit("chunk-sfy2wa1e.js:111638", () => {
  ORDINARY_FILE_MODE_SET = new Set([33188, 33261, 40960, 57344]);
  INDEX_MODE_TYPE_MASK = 61440;
  GITLINK_MODE = 57344;
});
//@ chunk-sfy2wa1e.js:111698-111970 placement
function classifyIndexMode(line) {
  let match = /^([0-7]{1,11}) [0-9a-f]+ \d\t(.*)$/s.exec(line);
  if (match === null)
    return {
      kind: "unwritten_mode",
      path: line.slice(line.indexOf("\t") + 1),
    };
  let mode = Number.parseInt(match[1], 8);
  let path = match[2];
  return (mode & INDEX_MODE_TYPE_MASK) === GITLINK_MODE
    ? {
        kind: "gitlink",
        path,
      }
    : {
        kind: ORDINARY_FILE_MODE_SET.has(mode) ? "ordinary" : "unwritten_mode",
        path,
      };
}
//@ chunk-sfy2wa1e.js:111970-112315 placement
async function listUnusualIndexModes(cwd, signal, opts) {
  let result = await listGitRefs(
    cwd,
    [...GIT_READ_CONFIG_ARGS, ...splitIndexOffArgs(opts), "ls-files", "-s", "-z"],
    {
      hardened: false,
      signal,
      env: {
        ...GIT_LIST_ENV,
        ...indexFileEnv(opts),
      },
      maxBuffer: GIT_PROBE_MAX_BUFFER,
    },
  );
  if (result.code !== 0) return null;
  let mapped = result.stdout
    .split("\x00")
    .filter((record) => record !== "")
    .map(classifyIndexMode);
  let pathsOfKind = (kind) =>
    normalizeCaseForComparison_2(mapped.filter((entry) => entry.kind === kind).map(({ path }) => path));
  return {
    gitlinks: pathsOfKind("gitlink"),
    unwrittenModes: pathsOfKind("unwritten_mode"),
  };
}
//@ chunk-sfy2wa1e.js:112315-112881 placement
async function classifyPathIdentity(root, paths, added, extraSensitive, deleted = []) {
  let isSensitive = (path) => isSensitiveNameOrVariant(path) || extraSensitive?.(path) === true;
  let caseFold = await isCaseFoldingFileSystem(root);
  let classify = async (path, mode) => {
    if (!isSafeRepoRelativePath(path, caseFold))
      return {
        path,
        why: "forged",
      };
    if (hasDosShortNameSegment(path))
      return {
        path,
        why: "alias",
      };
    let examined = await describeUnexaminedPath(root, path);
    if (examined === "linked")
      return {
        path,
        why: "hardlinked",
      };
    if (isSensitive(path)) {
      if (mode === "changed")
        return {
          path,
          why: added.has(path) ? "added" : "changed",
        };
      if (await isNotPlainDirectory(root, path))
        return {
          path,
          why: "resurrected",
        };
    }
    return examined === "unexamined"
      ? {
          path,
          why: "unexamined",
        }
      : null;
  };
  return (
    await Promise.all([
      ...deleted.map((path) => classify(path, "deleted")),
      ...paths.map((path) => classify(path, "changed")),
    ])
  )
    .filter((finding) => finding !== null)
    .sort((left, right) => left.path.localeCompare(right.path));
}
//@ chunk-sfy2wa1e.js:112881-113178 placement
async function describeUnexaminedPath(root, path) {
  if (path.includes("\uFFFD")) return "unexamined";
  let stats = await lstatOrAbsent(root, path);
  if (stats !== "clear") return stats === "symlink" ? "single" : "unexamined";
  try {
    let stats = await lstat(join(root, path));
    return stats.isFile() && stats.nlink > 1 ? "linked" : "single";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "single" : "unexamined";
  }
}
export {
  GIT_PROBE_MAX_BUFFER,
  summarizeStatusEntries,
  parseNameStatusZ,
  classifyPathIdentity,
  checkGitRootLocation,
  GIT_ROOT_REFUSALS,
};
