/**
 * utils/git/gitDirResolution.ts
 *
 * 2.1.316 新增：解析目录的 gitDir、workTree、commonDir（.git 文件、worktree、bare）；目录是否为裸仓库等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dgqyqzy0.js (25)
 * attribution: placement 25
 */
import { join, resolve, dirname, basename } from "path";
import { devNull } from "os";
import { lstatSync, statSync, realpathSync } from "fs";
import { parseGitConfig, allGitConfigValues, allGitConfigValuesTrue, hasNulByte } from "./gitConfigParser.js";
import { isENOENT } from "../errors.js";
import {
  getCommonDir_2,
  readLinkTextSafe,
  readBoundedSync,
  GIT_POINTER_MAX_BYTES,
  rawPointerPathIsUnsafe,
  readPositionIsUnsafe,
  GIT_CONFIG_MAX_BYTES,
  pointerFileIsSuspect,
} from "./gitFilesystem.js";
import { isOnForeignMount } from "../networkPaths.js";
import { realpathCacheEntry } from "../permissions/protectedDirs.js";
import { realpathNativeLongSync } from "../fsJunctions.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { buildSafeGitEnvForRepo, GIT_LOCATION_ENV_VARS } from "./gitSafeEnv.js";
import { getPlatform } from "../platform.js";
import { foldCaseBasic } from "../pathIdentity.js";
import { uniq } from "../collections.js";

//@ chunk-dgqyqzy0.js:686-697 placement
var MAX_CONFIG_VALUE_BYTES = 4096;
//@ chunk-dgqyqzy0.js:697-1050 placement
/**
 * 解析 git 配置中的 core.worktree/bare 等关键项。
 */
function parseGitConfigFlags(n) {
  let t;
  let r =
    n.includes("\x00") ||
    n
      .split(/\r?\n/)
      .map((line) => line.replace(/^[ \t]+/, ""))
      .some((e) => !/^[#;]/.test(e) && /[\r\t]|(?:^|[^\\])(?:\\\\)*\\$/.test(e));
  parseGitConfig(
    n,
    {
      entry: (e, i, o) => {
        if (e?.name === "core" && !e.quoted && i === "worktree") {
          t = o;
          r ||= o === undefined || o === "" || o.length > MAX_CONFIG_VALUE_BYTES || /^(?:~|%\(|:\()/.test(o);
        }
      },
      malformed: () => {
        r = true;
      },
    },
    {
      maxLines: 1 / 0,
    },
  );
  return r ? null : t;
}
//@ chunk-dgqyqzy0.js:1050-1116 placement
/**
 * 非 git 仓库占位与布尔值集合。
 */
var NOT_A_GIT_REPO_PATH = join(devNull, "not-a-git-repository");
var GIT_TRUE_VALUES = new Set(["true", "yes", "on"]);
//@ chunk-dgqyqzy0.js:1116-1234 placement
function isGitConfigTrue(n) {
  let lower = n.trim().toLowerCase();
  let match = /^[+-]?(\d+)[kmg]?$/.exec(lower);
  return GIT_TRUE_VALUES.has(lower) || (match !== null && Number(match[1]) !== 0);
}
//@ chunk-dgqyqzy0.js:1234-1285 placement
var WORKTREE_CONFIG_KEY_PATTERN = /(^|\])[^\S\n\r\u2028\u2029]*worktree\s*=/im;
//@ chunk-dgqyqzy0.js:1285-1804 placement
/**
 * 解析目录的仓库布局 {gitDir, workTree, commonDir}：.git 目录、.git 文件（linked worktree，需通过回指校验）或 bare 仓库；不是仓库返回 null。
 */
function resolveGitDirs(n) {
  let t = join(n, ".git");
  let r;
  try {
    r = lstatSync(t);
  } catch (error) {
    let u = isENOENT(error) && isBareRepository(n) ? realpathOrNull(n) : null;
    return u === null
      ? null
      : {
          gitDir: u,
          workTree: null,
          commonDir: u,
        };
  }
  let e = realpathOrNull(n);
  if (e === null) return null;
  if (r.isDirectory()) {
    let gitDir = join(e, ".git");
    return getCommonDir_2(gitDir)
      ? {
          gitDir,
          workTree: e,
          commonDir: gitDir,
        }
      : null;
  }
  let i;
  if (r.isSymbolicLink()) i = readLinkTextSafe(t);
  else if (r.isFile()) {
    let trimmed = readBoundedSync(t, GIT_POINTER_MAX_BYTES)?.trim();
    i = trimmed !== undefined && trimmed.startsWith("gitdir:") ? trimmed.slice(7).trim() : null;
  } else return null;
  if (i === null || i === "" || isOnForeignMount(i, n) || rawPointerPathIsUnsafe(i, n)) return null;
  let o = realpathCacheEntry(resolve(n, i));
  return o === null ? null : resolveLinkedWorktreeLayout(o, e);
}
//@ chunk-dgqyqzy0.js:1804-2100 placement = resolveGitDir (0.775)
function resolveGitDir(startPath) {
  let t = join(startPath, ".git");
  let r;
  try {
    r = lstatSync(t);
  } catch {
    return false;
  }
  let e = null;
  if (r.isSymbolicLink()) e = readLinkTextSafe(t);
  else if (r.isFile()) {
    let content = readBoundedSync(t, GIT_POINTER_MAX_BYTES)?.trim();
    e = content !== undefined && content.startsWith("gitdir:") ? content.slice(7).trim() : null;
  }
  if (e === null || e === "" || isOnForeignMount(e, startPath) || rawPointerPathIsUnsafe(e, startPath))
    return false;
  let cwd = realpathCacheEntry(resolve(startPath, e));
  return cwd !== null && isBareRepository(cwd);
}
//@ chunk-dgqyqzy0.js:2100-2144 placement
var MISSING_PATH_ERRNOS = new Set(["ENOENT", "ENOTDIR", "ELOOP"]);
//@ chunk-dgqyqzy0.js:2144-2245 placement
function realpathOrNull(n) {
  let { real, code } = realpathNativeLongSync(n);
  if (real !== undefined) return real;
  return code !== undefined && MISSING_PATH_ERRNOS.has(code) ? null : resolve(n);
}
//@ chunk-dgqyqzy0.js:2245-2467 placement
function resolveLinkedWorktreeLayout(gitDir, t) {
  let worktreeGitdirFile = readWorktreeGitdirFile(gitDir, t);
  if (worktreeGitdirFile !== null) {
    let i = dirname(dirname(gitDir));
    return basename(dirname(gitDir)) === "worktrees" &&
      getFileIdentity(worktreeGitdirFile, t) &&
      isCommondirConsistent(gitDir, i, t)
      ? {
          gitDir,
          workTree: t,
          commonDir: i,
        }
      : null;
  }
  let coreWorktree = readCoreWorktree(gitDir);
  return coreWorktree !== null && getFileIdentity(coreWorktree, t) && getCommonDir_2(gitDir)
    ? {
        gitDir,
        workTree: t,
        commonDir: gitDir,
      }
    : null;
}
//@ chunk-dgqyqzy0.js:2467-2532 placement
/**
 * 解析 git 目录，失败时返回占位。
 */
function resolveGitDirsOrPlaceholder(n) {
  return (
    resolveGitDirs(n) ?? {
      gitDir: NOT_A_GIT_REPO_PATH,
      workTree: n,
      commonDir: NOT_A_GIT_REPO_PATH,
    }
  );
}
//@ chunk-dgqyqzy0.js:2532-2612 placement
/**
 * 为在某目录运行的 git 子进程构造环境：固定 GIT_DIR/GIT_WORK_TREE/GIT_COMMON_DIR（无仓库时指向 /dev/null/not-a-git-repository），防止继承的 GIT_* 变量或恶意布局改变 git 行为。
 */
function buildGitEnvForRepo(n, t, { userLocale: r } = {}) {
  return getRemoteHostSessionCount(t, {
    repository: resolveGitDirsOrPlaceholder(n),
    userLocale: r,
  });
}
//@ chunk-dgqyqzy0.js:2612-2663 placement
function buildGitEnvVarsForRepo(n, t) {
  return buildSafeGitEnvForRepo(t, {
    repository: resolveGitDirsOrPlaceholder(n),
  });
}
//@ chunk-dgqyqzy0.js:2663-2914 placement
/**
 * 清除继承的 GIT_* 环境变量并写入解析出的 GIT_DIR/GIT_WORK_TREE/GIT_COMMON_DIR。
 */
function withPinnedGitDirEnv(n, t) {
  let { gitDir, workTree, commonDir } = resolveGitDirsOrPlaceholder(t);
  let o = new Set(GIT_LOCATION_ENV_VARS);
  let s = {};
  for (let key of Object.keys(n)) if (o.has(key.toUpperCase())) s[key] = undefined;
  return {
    ...n,
    ...s,
    GIT_DIR: gitDir,
    ...(workTree !== null
      ? {
          GIT_WORK_TREE: workTree,
        }
      : {
          GIT_IMPLICIT_WORK_TREE: "0",
        }),
    GIT_COMMON_DIR: commonDir,
  };
}
//@ chunk-dgqyqzy0.js:2914-3269 placement
/**
 * 目录是否为裸仓库。
 */
function isBareRepository(n) {
  try {
    if (
      !lstatSync(join(n, "HEAD")).isFile() ||
      !lstatSync(join(n, "refs")).isDirectory() ||
      !lstatErrnoOrFalse(n, "commondir")
    )
      return false;
  } catch {
    return false;
  }
  let gitConfigFilesToRead = getGitConfigFilesToRead(n);
  if (
    gitConfigFilesToRead === null ||
    gitConfigFilesToRead.read.some((e) => WORKTREE_CONFIG_KEY_PATTERN.test(e)) ||
    (gitConfigFilesToRead.unread !== undefined &&
      (WORKTREE_CONFIG_KEY_PATTERN.test(gitConfigFilesToRead.unread) ||
        allGitConfigValues(gitConfigFilesToRead.unread, "core", null, "bare").some(
          (e) => !isGitConfigTrue(e),
        )))
  )
    return false;
  let last = gitConfigFilesToRead.read.flatMap((e) => allGitConfigValues(e, "core", null, "bare")).at(-1);
  return last !== undefined && isGitConfigTrue(last);
}
//@ chunk-dgqyqzy0.js:3269-3567 placement
/**
 * 确定要读的 git config 文件：config，若 extensions.worktreeConfig 为真再加 config.worktree。
 */
function getGitConfigFilesToRead(n) {
  let gitDirFile = readGitDirFileSafe(n, "config");
  if (gitDirFile === undefined) return null;
  if (lstatErrnoOrFalse(n, "config.worktree"))
    return {
      read: [gitDirFile],
      unread: undefined,
    };
  let gitDirFile_2 = readGitDirFileSafe(n, "config.worktree");
  if (gitDirFile_2 === undefined) return null;
  let last = allGitConfigValuesTrue(gitDirFile, "extensions", null, "worktreeConfig").at(-1);
  return last !== undefined && isGitConfigTrue(last)
    ? {
        read: [gitDirFile, gitDirFile_2],
        unread: undefined,
      }
    : {
        read: [gitDirFile],
        unread: gitDirFile_2,
      };
}
//@ chunk-dgqyqzy0.js:3567-3659 placement
function readGitDirFileSafe(n, t) {
  let r = join(n, t);
  let e = readPositionIsUnsafe(r, n) ? undefined : readBoundedSync(r, GIT_CONFIG_MAX_BYTES);
  return e !== undefined && hasNulByte(e) ? undefined : e;
}
//@ chunk-dgqyqzy0.js:3659-3681 placement
var GIT_CONFIG_INCLUDE_PATTERN = /\[\s*include/i;
//@ chunk-dgqyqzy0.js:3681-3870 placement
function readGitConfigTexts(gitDir) {
  let t = [];
  for (let r of ["config", "config.worktree"]) {
    let gitDirFile = readGitDirFileSafe(gitDir, r);
    if (gitDirFile === undefined) {
      if (r === "config.worktree" && lstatErrnoOrFalse(gitDir, r)) continue;
      return null;
    }
    t.push(gitDirFile);
  }
  return t.some((r) => GIT_CONFIG_INCLUDE_PATTERN.test(r));
}
//@ chunk-dgqyqzy0.js:3908-3970 placement
function lstatErrnoOrFalse(n, t) {
  try {
    lstatSync(join(n, t));
    return false;
  } catch (error) {
    return isENOENT(error);
  }
}
//@ chunk-dgqyqzy0.js:3970-4126 placement
function isCommondirConsistent(n, t, r) {
  let e = join(n, "commondir");
  if (pointerFileIsSuspect(e, n)) return false;
  let trimmed = readBoundedSync(e, GIT_POINTER_MAX_BYTES)?.trim();
  if (
    trimmed === undefined ||
    trimmed === "" ||
    isOnForeignMount(trimmed, r) ||
    rawPointerPathIsUnsafe(trimmed, n, r)
  )
    return false;
  return getFileIdentity(resolve(n, trimmed), t);
}
//@ chunk-dgqyqzy0.js:4126-4334 placement = getFileIdentity (0.817)
function getFileIdentity(n, t) {
  try {
    let r = statSync(n, {
      bigint: true,
    });
    let e = statSync(t, {
      bigint: true,
    });
    if (!r.isDirectory() || r.dev !== e.dev) return false;
    if (r.ino !== 0n && e.ino !== 0n) return r.ino === e.ino;
    return (
      normalizePathForPlatform(realpathSync.native(n)) === normalizePathForPlatform(realpathSync.native(t))
    );
  } catch {
    return false;
  }
}
//@ chunk-dgqyqzy0.js:4334-4447 placement = setCwdState (0.757)
function normalizePathForPlatform(cwd) {
  switch (getPlatform()) {
    case "macos":
      return foldCaseBasic(cwd.normalize("NFC"));
    case "windows":
      return foldCaseBasic(cwd);
    default:
      return cwd;
  }
}
//@ chunk-dgqyqzy0.js:4447-4621 placement
function readWorktreeGitdirFile(n, t) {
  let r = join(n, "gitdir");
  if (pointerFileIsSuspect(r, n)) return null;
  let trimmed = readBoundedSync(r, GIT_POINTER_MAX_BYTES)?.trim();
  if (trimmed === undefined || isOnForeignMount(trimmed, t) || rawPointerPathIsUnsafe(trimmed, n, t))
    return null;
  let i = resolve(n, trimmed);
  return basename(i) === ".git" ? dirname(i) : null;
}
//@ chunk-dgqyqzy0.js:4621-4876 placement
function readCoreWorktree(n) {
  let gitConfigFilesToRead = getGitConfigFilesToRead(n);
  let r =
    gitConfigFilesToRead === null ||
    (gitConfigFilesToRead.unread !== undefined &&
      WORKTREE_CONFIG_KEY_PATTERN.test(gitConfigFilesToRead.unread))
      ? [null]
      : gitConfigFilesToRead.read.map((o) => parseGitConfigFlags(o));
  let [e, ...i] = uniq(r.filter((o) => o !== undefined)).map((o) =>
    o === null || isOnForeignMount(o, n) || rawPointerPathIsUnsafe(o, n) ? null : resolve(n, o),
  );
  return typeof e === "string" && i.every((o) => o !== null && getFileIdentity(e, o)) ? e : null;
}
export {
  withPinnedGitDirEnv,
  buildGitEnvForRepo,
  resolveGitDirs,
  readGitConfigTexts,
  buildGitEnvVarsForRepo,
  resolveGitDirsOrPlaceholder,
  NOT_A_GIT_REPO_PATH,
  resolveGitDir,
  lstatErrnoOrFalse,
};
