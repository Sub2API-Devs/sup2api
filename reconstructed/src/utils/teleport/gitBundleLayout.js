/**
 * utils/teleport/gitBundleLayout.ts
 *
 * 2.1.316 新增：上传前检查检出布局（git 根位置、gitlink、不写的文件模式、伪造/别名路径）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gjx0rh1b.js (9)
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
import { uniq } from "../collections.js";
import { isSensitiveNameOrVariant } from "../permissions/sensitivePaths.js";
import {
  isCaseFoldingFileSystem,
  isSafeRepoRelativePath,
  hasDosShortNameSegment,
} from "./gitBundleVerify.js";
import { isNotPlainDirectory, lstatOrAbsent } from "./wipStash.js";
import { getErrnoCode } from "../errors.js";

//@ chunk-gjx0rh1b.js:109556-110296 placement
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
//@ chunk-gjx0rh1b.js:110296-111116 placement
async function checkGitRootLocation(cwd, signal, r) {
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
  let s = (w) =>
    runGitForAudit([...GIT_SAFE_GLOBAL_ARGS, ...GIT_READ_CONFIG_ARGS, ...splitIndexOffArgs(r), ...w], {
      cwd: gitRoot,
      abortSignal: signal,
      env: {
        ...getRemoteHostSessionCount(
          {
            ...GIT_LIST_ENV,
            ...indexFileEnv(r),
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
  let [l, h] = await Promise.all([
    s(["rev-parse", "--verify", "--quiet", "HEAD^{commit}"]),
    listUnusualIndexModes(gitRoot, signal, r),
  ]);
  if (h === null) return null;
  if (h.unwrittenModes.length > 0)
    return {
      gitRoot,
      paths: [],
      added: new Set(),
      deleted: [],
      ...h,
    };
  if (l.exitCode === 1)
    return {
      gitRoot,
      paths: [],
      added: new Set(),
      deleted: [],
      ...h,
    };
  let [u, p] = await Promise.all([
    s(["diff", "--name-status", "-z", "--no-renames", IGNORE_SUBMODULES_DIRTY_FLAG, "HEAD", "--"]),
    s([
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
  if (l.code !== 0 || u.code !== 0 || p.code !== 0) return null;
  return {
    ...summarizeStatusEntries(parseNameStatusZ(u.stdout), parseNameStatusZ(p.stdout), gitRoot),
    ...h,
  };
}
//@ chunk-gjx0rh1b.js:111116-111410 placement
function summarizeStatusEntries(nameStatusZ, nameStatusZ_2, gitRoot) {
  let o = (h, u) => h.filter(({ status, path }) => u(status) && path !== "").map(({ path }) => path);
  let s = uniq([...o(nameStatusZ, (h) => h !== "D"), ...o(nameStatusZ_2, (h) => h !== "D")]);
  let l = new Set(s);
  return {
    gitRoot,
    paths: s,
    added: new Set(o(nameStatusZ_2, (h) => h === "A")),
    deleted: uniq([...o(nameStatusZ, (h) => h === "D"), ...o(nameStatusZ_2, (h) => h === "D")]).filter(
      (h) => !l.has(h),
    ),
  };
}
//@ chunk-gjx0rh1b.js:111410-111537 placement
function parseNameStatusZ(stdout) {
  let parts = stdout.split("\x00");
  return Array.from(
    {
      length: Math.floor(parts.length / 2),
    },
    (r, o) => ({
      status: parts[2 * o],
      path: parts[2 * o + 1],
    }),
  );
}
//@ chunk-gjx0rh1b.js:111537-111597 placement
var ORDINARY_FILE_MODE_SET = new Set([33188, 33261, 40960, 57344]);
var INDEX_MODE_TYPE_MASK = 61440;
var GITLINK_MODE = 57344;
//@ chunk-gjx0rh1b.js:111597-111869 placement
function classifyIndexMode(e) {
  let match = /^([0-7]{1,11}) [0-9a-f]+ \d\t(.*)$/s.exec(e);
  if (match === null)
    return {
      kind: "unwritten_mode",
      path: e.slice(e.indexOf("\t") + 1),
    };
  let r = Number.parseInt(match[1], 8);
  let path = match[2];
  return (r & INDEX_MODE_TYPE_MASK) === GITLINK_MODE
    ? {
        kind: "gitlink",
        path,
      }
    : {
        kind: ORDINARY_FILE_MODE_SET.has(r) ? "ordinary" : "unwritten_mode",
        path,
      };
}
//@ chunk-gjx0rh1b.js:111869-112214 placement
async function listUnusualIndexModes(e, signal, r) {
  let o = await listGitRefs(e, [...GIT_READ_CONFIG_ARGS, ...splitIndexOffArgs(r), "ls-files", "-s", "-z"], {
    hardened: false,
    signal,
    env: {
      ...GIT_LIST_ENV,
      ...indexFileEnv(r),
    },
    maxBuffer: GIT_PROBE_MAX_BUFFER,
  });
  if (o.code !== 0) return null;
  let mapped = o.stdout
    .split("\x00")
    .filter((h) => h !== "")
    .map(classifyIndexMode);
  let l = (h) => uniq(mapped.filter((u) => u.kind === h).map(({ path }) => path));
  return {
    gitlinks: l("gitlink"),
    unwrittenModes: l("unwritten_mode"),
  };
}
//@ chunk-gjx0rh1b.js:112214-112780 placement
async function classifyPathIdentity(e, paths, added, o, deleted = []) {
  let l = (w) => isSensitiveNameOrVariant(w) || o?.(w) === true;
  let h = await isCaseFoldingFileSystem(e);
  let u = async (w, _) => {
    if (!isSafeRepoRelativePath(w, h))
      return {
        path: w,
        why: "forged",
      };
    if (hasDosShortNameSegment(w))
      return {
        path: w,
        why: "alias",
      };
    let y = await describeUnexaminedPath(e, w);
    if (y === "linked")
      return {
        path: w,
        why: "hardlinked",
      };
    if (l(w)) {
      if (_ === "changed")
        return {
          path: w,
          why: added.has(w) ? "added" : "changed",
        };
      if (await isNotPlainDirectory(e, w))
        return {
          path: w,
          why: "resurrected",
        };
    }
    return y === "unexamined"
      ? {
          path: w,
          why: "unexamined",
        }
      : null;
  };
  return (await Promise.all([...deleted.map((w) => u(w, "deleted")), ...paths.map((w) => u(w, "changed"))]))
    .filter((w) => w !== null)
    .sort((w, _) => w.path.localeCompare(_.path));
}
//@ chunk-gjx0rh1b.js:112780-113077 placement
async function describeUnexaminedPath(e, n) {
  if (n.includes("\uFFFD")) return "unexamined";
  let r = await lstatOrAbsent(e, n);
  if (r !== "clear") return r === "symlink" ? "single" : "unexamined";
  try {
    let o = await lstat(join(e, n));
    return o.isFile() && o.nlink > 1 ? "linked" : "single";
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
