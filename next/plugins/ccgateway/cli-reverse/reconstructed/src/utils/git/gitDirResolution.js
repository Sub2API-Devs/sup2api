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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dgqyqzy0.js:686-697 placement
var MAX_CONFIG_VALUE_BYTES = 4096;
//@ chunk-dgqyqzy0.js:697-1050 placement
/**
 * 解析 git 配置中的 core.worktree/bare 等关键项。
 */
function parseGitConfigFlags(text) {
  let coreWorktree;
  let isSuspect =
    text.includes("\x00") ||
    text
      .split(/\r?\n/)
      .map((line) => line.replace(/^[ \t]+/, ""))
      .some((line) => !/^[#;]/.test(line) && /[\r\t]|(?:^|[^\\])(?:\\\\)*\\$/.test(line));
  parseGitConfig(
    text,
    {
      entry: (section, key, value) => {
        if (section?.name === "core" && !section.quoted && key === "worktree") {
          coreWorktree = value;
          isSuspect ||=
            value === undefined ||
            value === "" ||
            value.length > MAX_CONFIG_VALUE_BYTES ||
            /^(?:~|%\(|:\()/.test(value);
        }
      },
      malformed: () => {
        isSuspect = true;
      },
    },
    {
      maxLines: 1 / 0,
    },
  );
  return isSuspect ? null : coreWorktree;
}
//@ chunk-dgqyqzy0.js:1050-1116 placement
/**
 * 非 git 仓库占位与布尔值集合。
 */
var NOT_A_GIT_REPO_PATH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GIT_TRUE_VALUES;
deferInit("chunk-dgqyqzy0.js:1050", () => {
  NOT_A_GIT_REPO_PATH = join(devNull, "not-a-git-repository");
  GIT_TRUE_VALUES = new Set(["true", "yes", "on"]);
});
//@ chunk-dgqyqzy0.js:1116-1234 placement
function isGitConfigTrue(value) {
  let lower = value.trim().toLowerCase();
  let match = /^[+-]?(\d+)[kmg]?$/.exec(lower);
  return GIT_TRUE_VALUES.has(lower) || (match !== null && Number(match[1]) !== 0);
}
//@ chunk-dgqyqzy0.js:1234-1285 placement
var WORKTREE_CONFIG_KEY_PATTERN = /(^|\])[^\S\n\r\u2028\u2029]*worktree\s*=/im;
//@ chunk-dgqyqzy0.js:1285-1804 placement
/**
 * 解析目录的仓库布局 {gitDir, workTree, commonDir}：.git 目录、.git 文件（linked worktree，需通过回指校验）或 bare 仓库；不是仓库返回 null。
 */
function resolveGitDirs(cwd) {
  let dotGitPath = join(cwd, ".git");
  let dotGitStats;
  try {
    dotGitStats = lstatSync(dotGitPath);
  } catch (error) {
    let bareRoot = isENOENT(error) && isBareRepository(cwd) ? realpathOrNull(cwd) : null;
    return bareRoot === null
      ? null
      : {
          gitDir: bareRoot,
          workTree: null,
          commonDir: bareRoot,
        };
  }
  let realCwd = realpathOrNull(cwd);
  if (realCwd === null) return null;
  if (dotGitStats.isDirectory()) {
    let gitDir = join(realCwd, ".git");
    return getCommonDir_2(gitDir)
      ? {
          gitDir,
          workTree: realCwd,
          commonDir: gitDir,
        }
      : null;
  }
  let gitdirPointer;
  if (dotGitStats.isSymbolicLink()) gitdirPointer = readLinkTextSafe(dotGitPath);
  else if (dotGitStats.isFile()) {
    let trimmed = readBoundedSync(dotGitPath, GIT_POINTER_MAX_BYTES)?.trim();
    gitdirPointer = trimmed !== undefined && trimmed.startsWith("gitdir:") ? trimmed.slice(7).trim() : null;
  } else return null;
  if (
    gitdirPointer === null ||
    gitdirPointer === "" ||
    isOnForeignMount(gitdirPointer, cwd) ||
    rawPointerPathIsUnsafe(gitdirPointer, cwd)
  )
    return null;
  let adminDir = realpathCacheEntry(resolve(cwd, gitdirPointer));
  return adminDir === null ? null : resolveLinkedWorktreeLayout(adminDir, realCwd);
}
//@ chunk-dgqyqzy0.js:1804-2100 placement (2.1.88 match: resolveGitDir, 0.775)
function resolveGitDir(startPath) {
  let dotGitPath = join(startPath, ".git");
  let dotGitStats;
  try {
    dotGitStats = lstatSync(dotGitPath);
  } catch {
    return false;
  }
  let gitdirPointer = null;
  if (dotGitStats.isSymbolicLink()) gitdirPointer = readLinkTextSafe(dotGitPath);
  else if (dotGitStats.isFile()) {
    let content = readBoundedSync(dotGitPath, GIT_POINTER_MAX_BYTES)?.trim();
    gitdirPointer = content !== undefined && content.startsWith("gitdir:") ? content.slice(7).trim() : null;
  }
  if (
    gitdirPointer === null ||
    gitdirPointer === "" ||
    isOnForeignMount(gitdirPointer, startPath) ||
    rawPointerPathIsUnsafe(gitdirPointer, startPath)
  )
    return false;
  let cwd = realpathCacheEntry(resolve(startPath, gitdirPointer));
  return cwd !== null && isBareRepository(cwd);
}
//@ chunk-dgqyqzy0.js:2100-2144 placement
var MISSING_PATH_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dgqyqzy0.js:2100", () => {
  MISSING_PATH_ERRNOS = new Set(["ENOENT", "ENOTDIR", "ELOOP"]);
});
//@ chunk-dgqyqzy0.js:2144-2245 placement
function realpathOrNull(path) {
  let { real, code } = realpathNativeLongSync(path);
  if (real !== undefined) return real;
  return code !== undefined && MISSING_PATH_ERRNOS.has(code) ? null : resolve(path);
}
//@ chunk-dgqyqzy0.js:2245-2467 placement
function resolveLinkedWorktreeLayout(gitDir, cwd) {
  let worktreeGitdirFile = readWorktreeGitdirFile(gitDir, cwd);
  if (worktreeGitdirFile !== null) {
    let commonDir = dirname(dirname(gitDir));
    return basename(dirname(gitDir)) === "worktrees" &&
      getFileIdentity(worktreeGitdirFile, cwd) &&
      isCommondirConsistent(gitDir, commonDir, cwd)
      ? {
          gitDir,
          workTree: cwd,
          commonDir,
        }
      : null;
  }
  let coreWorktree = readCoreWorktree(gitDir);
  return coreWorktree !== null && getFileIdentity(coreWorktree, cwd) && getCommonDir_2(gitDir)
    ? {
        gitDir,
        workTree: cwd,
        commonDir: gitDir,
      }
    : null;
}
//@ chunk-dgqyqzy0.js:2467-2532 placement
/**
 * 解析 git 目录，失败时返回占位。
 */
function resolveGitDirsOrPlaceholder(startPath) {
  return (
    resolveGitDirs(startPath) ?? {
      gitDir: NOT_A_GIT_REPO_PATH,
      workTree: startPath,
      commonDir: NOT_A_GIT_REPO_PATH,
    }
  );
}
//@ chunk-dgqyqzy0.js:2532-2612 placement
/**
 * 为在某目录运行的 git 子进程构造环境：固定 GIT_DIR/GIT_WORK_TREE/GIT_COMMON_DIR（无仓库时指向 /dev/null/not-a-git-repository），防止继承的 GIT_* 变量或恶意布局改变 git 行为。
 */
function buildGitEnvForRepo(cwd, envPins, { userLocale } = {}) {
  return getRemoteHostSessionCount(envPins, {
    repository: resolveGitDirsOrPlaceholder(cwd),
    userLocale,
  });
}
//@ chunk-dgqyqzy0.js:2612-2663 placement
function buildGitEnvVarsForRepo(cwd, env) {
  return buildSafeGitEnvForRepo(env, {
    repository: resolveGitDirsOrPlaceholder(cwd),
  });
}
//@ chunk-dgqyqzy0.js:2663-2914 placement
/**
 * 清除继承的 GIT_* 环境变量并写入解析出的 GIT_DIR/GIT_WORK_TREE/GIT_COMMON_DIR。
 */
function withPinnedGitDirEnv(env, cwd) {
  let { gitDir, workTree, commonDir } = resolveGitDirsOrPlaceholder(cwd);
  let locationVars = new Set(GIT_LOCATION_ENV_VARS);
  let clearedVars = {};
  for (let key of Object.keys(env)) if (locationVars.has(key.toUpperCase())) clearedVars[key] = undefined;
  return {
    ...env,
    ...clearedVars,
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
function isBareRepository(root) {
  try {
    if (
      !lstatSync(join(root, "HEAD")).isFile() ||
      !lstatSync(join(root, "refs")).isDirectory() ||
      !lstatErrnoOrFalse(root, "commondir")
    )
      return false;
  } catch {
    return false;
  }
  let gitConfigFilesToRead = getGitConfigFilesToRead(root);
  if (
    gitConfigFilesToRead === null ||
    gitConfigFilesToRead.read.some((configText) => WORKTREE_CONFIG_KEY_PATTERN.test(configText)) ||
    (gitConfigFilesToRead.unread !== undefined &&
      (WORKTREE_CONFIG_KEY_PATTERN.test(gitConfigFilesToRead.unread) ||
        allGitConfigValues(gitConfigFilesToRead.unread, "core", null, "bare").some(
          (value) => !isGitConfigTrue(value),
        )))
  )
    return false;
  let last = gitConfigFilesToRead.read
    .flatMap((configText) => allGitConfigValues(configText, "core", null, "bare"))
    .at(-1);
  return last !== undefined && isGitConfigTrue(last);
}
//@ chunk-dgqyqzy0.js:3269-3567 placement
/**
 * 确定要读的 git config 文件：config，若 extensions.worktreeConfig 为真再加 config.worktree。
 */
function getGitConfigFilesToRead(root) {
  let gitDirFile = readGitDirFileSafe(root, "config");
  if (gitDirFile === undefined) return null;
  if (lstatErrnoOrFalse(root, "config.worktree"))
    return {
      read: [gitDirFile],
      unread: undefined,
    };
  let gitDirFile_2 = readGitDirFileSafe(root, "config.worktree");
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
function readGitDirFileSafe(root, fileName) {
  let filePath = join(root, fileName);
  let text = readPositionIsUnsafe(filePath, root)
    ? undefined
    : readBoundedSync(filePath, GIT_CONFIG_MAX_BYTES);
  return text !== undefined && hasNulByte(text) ? undefined : text;
}
//@ chunk-dgqyqzy0.js:3659-3681 placement
var GIT_CONFIG_INCLUDE_PATTERN = /\[\s*include/i;
//@ chunk-dgqyqzy0.js:3681-3870 placement
function readGitConfigTexts(root) {
  let texts = [];
  for (let fileName of ["config", "config.worktree"]) {
    let gitDirFile = readGitDirFileSafe(root, fileName);
    if (gitDirFile === undefined) {
      if (fileName === "config.worktree" && lstatErrnoOrFalse(root, fileName)) continue;
      return null;
    }
    texts.push(gitDirFile);
  }
  return texts.some((text) => GIT_CONFIG_INCLUDE_PATTERN.test(text));
}
//@ chunk-dgqyqzy0.js:3908-3970 placement
function lstatErrnoOrFalse(root, fileName) {
  try {
    lstatSync(join(root, fileName));
    return false;
  } catch (error) {
    return isENOENT(error);
  }
}
//@ chunk-dgqyqzy0.js:3970-4126 placement
function isCommondirConsistent(gitDir, commonDir, cwd) {
  let commonDirFile = join(gitDir, "commondir");
  if (pointerFileIsSuspect(commonDirFile, gitDir)) return false;
  let trimmed = readBoundedSync(commonDirFile, GIT_POINTER_MAX_BYTES)?.trim();
  if (
    trimmed === undefined ||
    trimmed === "" ||
    isOnForeignMount(trimmed, cwd) ||
    rawPointerPathIsUnsafe(trimmed, gitDir, cwd)
  )
    return false;
  return getFileIdentity(resolve(gitDir, trimmed), commonDir);
}
//@ chunk-dgqyqzy0.js:4126-4334 placement (2.1.88 match: getFileIdentity, 0.817)
function getFileIdentity(path, otherPath) {
  try {
    let pathStats = statSync(path, {
      bigint: true,
    });
    let otherStats = statSync(otherPath, {
      bigint: true,
    });
    if (!pathStats.isDirectory() || pathStats.dev !== otherStats.dev) return false;
    if (pathStats.ino !== 0n && otherStats.ino !== 0n) return pathStats.ino === otherStats.ino;
    return (
      normalizePathForPlatform(realpathSync.native(path)) ===
      normalizePathForPlatform(realpathSync.native(otherPath))
    );
  } catch {
    return false;
  }
}
//@ chunk-dgqyqzy0.js:4334-4447 placement (2.1.88 match: setCwdState, 0.757)
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
function readWorktreeGitdirFile(gitDir, cwd) {
  let gitdirFile = join(gitDir, "gitdir");
  if (pointerFileIsSuspect(gitdirFile, gitDir)) return null;
  let trimmed = readBoundedSync(gitdirFile, GIT_POINTER_MAX_BYTES)?.trim();
  if (trimmed === undefined || isOnForeignMount(trimmed, cwd) || rawPointerPathIsUnsafe(trimmed, gitDir, cwd))
    return null;
  let resolved = resolve(gitDir, trimmed);
  return basename(resolved) === ".git" ? dirname(resolved) : null;
}
//@ chunk-dgqyqzy0.js:4621-4876 placement
function readCoreWorktree(root) {
  let gitConfigFilesToRead = getGitConfigFilesToRead(root);
  let worktreeValues =
    gitConfigFilesToRead === null ||
    (gitConfigFilesToRead.unread !== undefined &&
      WORKTREE_CONFIG_KEY_PATTERN.test(gitConfigFilesToRead.unread))
      ? [null]
      : gitConfigFilesToRead.read.map((configText) => parseGitConfigFlags(configText));
  let [firstWorktree, ...otherWorktrees] = uniq(worktreeValues.filter((value) => value !== undefined)).map(
    (value) =>
      value === null || isOnForeignMount(value, root) || rawPointerPathIsUnsafe(value, root)
        ? null
        : resolve(root, value),
  );
  return typeof firstWorktree === "string" &&
    otherWorktrees.every((otherPath) => otherPath !== null && getFileIdentity(firstWorktree, otherPath))
    ? firstWorktree
    : null;
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
