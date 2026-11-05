/**
 * utils/filePersistence/homeFilePublish.ts
 *
 * 2.1.316 新增：发布文件到用户主目录
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5x3jy2xm.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { posix } from "path";
import { realpath, lstat, link, stat, unlink, open, readlink, mkdir } from "fs/promises";
import { constants } from "fs";
import { pipeline } from "stream/promises";
import { foldName } from "../permissions/protectedDirNames.js";
import { INSTRUCTION_FILE_NAMES } from "../../services/agentImport/importItemOrder.js";
import { firstLineOf } from "../stringUtils.js";
import { DANGEROUS_FILES_LOWER, checkPathSafetyForAutoEdit } from "../permissions/filesystem.js";
import { hasTrailingOrReservedName, DOS_TILDE_RE } from "../windowsProfileFolders.js";
import { getErrnoCode } from "../errors.js";
import { isAtOrUnderRoot } from "../stageFileRoots.js";
import { isNonRetryableFsError } from "../../services/memorySync/syncFiles.js";
import { logError } from "../log.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { isUnsupportedFlagError } from "../atomicPublishWrite.js";
import { getPlatform } from "../platform.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../fsFlags.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5x3jy2xm.js:854-1310 placement
/**
 * home 目录发布用的路径工具（basename/dirname/join/relative/sep 的绑定与平台分隔符），同语句还定义了指令文件名、厂商目录名等集合。
 */
var basename; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var dirname;
var join;
var relative;
var sep;
var INSTRUCTION_FILE_BASENAMES;
var VENDOR_DIR_NAMES;
var GIT_CONFIG_FILE_NAMES;
var PYTHON_USER_CUSTOMIZE_NAMES;
var NON_ASCII_NAME_CHARS_RE;
var regExp;
var CONTROL_OR_FORMAT_CHARS_RE;
var MAX_HOME_FILE_NAME_LENGTH;
deferInit("chunk-5x3jy2xm.js:854", () => {
  ({ basename, dirname, join, relative, sep } = posix);
  INSTRUCTION_FILE_BASENAMES = new Set(["claude.md", "claude.local.md", "agent.md"]);
  VENDOR_DIR_NAMES = new Set([
    "head",
    "commondir",
    "node_modules",
    "site-packages",
    "dist-packages",
    "__pycache__",
  ]);
  GIT_CONFIG_FILE_NAMES = new Set(["config", "config.worktree"]);
  PYTHON_USER_CUSTOMIZE_NAMES = new Set(["sitecustomize", "usercustomize"]);
  NON_ASCII_NAME_CHARS_RE = /[^\P{ASCII}\w .()+,=@#%[\]-]/u;
  regExp = new RegExp(`^-|\\s-\\S|${NON_ASCII_NAME_CHARS_RE.source}`, "u");
  CONTROL_OR_FORMAT_CHARS_RE = /[\p{Cc}\p{Zl}\p{Zp}]|(?![\u200c\u200d])\p{Cf}|(?:^|\p{ASCII})[\u200c\u200d]/u;
  MAX_HOME_FILE_NAME_LENGTH = 255;
});
//@ chunk-5x3jy2xm.js:1310-1601 placement
function homeFileNameProblem(name, isLastSegment) {
  let folded = foldName(name);
  if (folded.startsWith(".")) return "dot_name";
  if (
    INSTRUCTION_FILE_BASENAMES.has(folded) ||
    INSTRUCTION_FILE_NAMES.has(folded) ||
    name === "ARCHITECTURE.md"
  )
    return "instruction_file";
  if (
    VENDOR_DIR_NAMES.has(folded) ||
    PYTHON_USER_CUSTOMIZE_NAMES.has(firstLineOf(folded, ".")) ||
    (isLastSegment && (DANGEROUS_FILES_LOWER.has(folded) || GIT_CONFIG_FILE_NAMES.has(folded)))
  )
    return "unsafe_name";
  if (
    hasTrailingOrReservedName(name) ||
    DOS_TILDE_RE.test(name) ||
    regExp.test(name) ||
    CONTROL_OR_FORMAT_CHARS_RE.test(name)
  )
    return "odd_spelling";
  return;
}
//@ chunk-5x3jy2xm.js:1601-1720 placement
function homePathProblem(relativePath) {
  let parts = relativePath.split(sep);
  for (let [index, segment] of parts.entries()) {
    let problem = homeFileNameProblem(segment, index === parts.length - 1);
    if (problem !== undefined) return problem;
  }
  return;
}
//@ chunk-5x3jy2xm.js:1720-1838 placement
async function realpathOfAncestor(path) {
  try {
    return await realpath(path);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT" || dirname(path) === path) throw error;
    return join(await realpathOfAncestor(dirname(path)), basename(path));
  }
}
//@ chunk-5x3jy2xm.js:1838-2024 placement
function homeTargetProblem(realHome, realParent, targetPath, judgedPaths) {
  if (!isAtOrUnderRoot(realHome, realParent)) return "outside_home";
  let expectedPath = join(realParent, basename(targetPath));
  return (
    homePathProblem(relative(realHome, expectedPath)) ??
    (checkPathSafetyForAutoEdit(targetPath, [targetPath, expectedPath]).safe
      ? undefined
      : "write_would_ask") ??
    (judgedPaths === undefined || judgedPaths.includes(expectedPath) ? undefined : "not_as_judged")
  );
}
//@ chunk-5x3jy2xm.js:2024-2069 placement
var OCCUPIED_PATH_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5x3jy2xm.js:2024", () => {
  OCCUPIED_PATH_ERRNOS = new Set(["EEXIST", "ENOTDIR", "ENOENT"]);
});
//@ chunk-5x3jy2xm.js:2069-2209 placement
async function existingTargetState(targetPath) {
  try {
    return {
      outcome: (await lstat(targetPath)).isFile() ? "already_present" : "path_occupied",
    };
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return;
    throw error;
  }
}
//@ chunk-5x3jy2xm.js:2209-2439 placement
async function checkHomeTarget(homeDir, relativePath) {
  let targetPath = join(homeDir, relativePath);
  let realHome = await realpath(homeDir);
  try {
    let problem =
      homePathProblem(relativePath) ??
      homeTargetProblem(realHome, await realpathOfAncestor(dirname(targetPath)), targetPath, undefined);
    return problem === undefined
      ? await existingTargetState(targetPath)
      : {
          outcome: "refused_name",
          refusal: problem,
        };
  } catch (error) {
    if (getErrnoCode(error) === "ENOTDIR")
      return {
        outcome: "path_occupied",
      };
    throw error;
  }
}
//@ chunk-5x3jy2xm.js:2439-2859 placement
async function linkIntoHome(sourcePath, sourceHandle, targetPath, mode) {
  try {
    await link(sourcePath, targetPath);
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return;
    if (!isNonRetryableFsError(error) && getErrnoCode(error) !== "EXDEV") throw error;
    return await createExclusive(sourceHandle, targetPath, mode);
  }
  let [sourceStats, targetStats] = await Promise.all([sourceHandle.stat(), lstat(targetPath)]);
  if (getFileIdentity(targetStats, sourceStats)) return sourceStats;
  let currentSource = await statOrUndefined(lstat(sourcePath));
  if (getFileIdentity(currentSource, sourceStats)) return;
  for (let identity of [currentSource, await statOrUndefined(stat(sourcePath))])
    if (identity !== undefined && (await removeIfUnchanged(targetPath, identity))) break;
  let error = Error("the source of a home file was exchanged while it was published");
  error.code = "HOME_SOURCE_EXCHANGED";
  throw error;
}
//@ chunk-5x3jy2xm.js:2859-2912 placement (2.1.88 match: getFileIdentity, 0.795)
function getFileIdentity(left, right) {
  return left?.ino === right.ino && left.dev === right.dev;
}
//@ chunk-5x3jy2xm.js:2912-2995 placement
async function statOrUndefined(promise) {
  try {
    return await promise;
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return;
    throw error;
  }
}
//@ chunk-5x3jy2xm.js:2995-3119 placement
async function removeIfUnchanged(targetPath, identity) {
  try {
    if (!getFileIdentity(await statOrUndefined(lstat(targetPath)), identity)) return false;
    await unlink(targetPath);
    return true;
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") logError(error);
    return false;
  }
}
//@ chunk-5x3jy2xm.js:3119-3519 placement
async function createExclusive(sourceHandle, targetPath, mode) {
  let handle;
  try {
    handle = await open(
      targetPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS,
      mode,
    );
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return;
    throw error;
  }
  let written;
  try {
    written = await handle.stat();
    try {
      await handle.chmod(mode);
    } catch (error) {
      if (!isUnsupportedFlagError(error)) throw error;
    }
    await pipeline(
      sourceHandle.createReadStream({
        start: 0,
        autoClose: false,
      }),
      handle.createWriteStream(),
    );
    return getFileIdentity(await lstat(targetPath), written) ? written : undefined;
  } catch (error) {
    await handle.close().catch(() => {});
    await (written === undefined
      ? unlink(targetPath).catch(() => {})
      : removeIfUnchanged(targetPath, written));
    throw error;
  }
}
//@ chunk-5x3jy2xm.js:3519-3710 placement
async function withPinnedDirPath(dirPath, fn) {
  if (getPlatform() !== "linux") return fn(dirPath, () => realpath(dirPath));
  let dirHandle = await open(dirPath, constants.O_RDONLY | constants.O_DIRECTORY | READ_LIMITS);
  try {
    let fdPath = `/proc/self/fd/${dirHandle.fd}`;
    return await fn(fdPath, () => readlink(fdPath));
  } finally {
    await dirHandle.close();
  }
}
//@ chunk-5x3jy2xm.js:3710-3720 placement
var HOME_FILE_MODE = 420;
//@ chunk-5x3jy2xm.js:3720-4536 placement
/**
 * 把文件发布到用户主目录下的目标路径：校验路径分段、避免覆盖已变化的文件。
 */
async function publishHomeFile(sourcePath, homeDir, relativePath, judgedPaths) {
  let targetPath = join(homeDir, relativePath);
  let realHome = await realpath(homeDir);
  let mkdirResult;
  try {
    let problem =
      homePathProblem(relativePath) ??
      homeTargetProblem(realHome, await realpathOfAncestor(dirname(targetPath)), targetPath, judgedPaths);
    if (problem !== undefined)
      return {
        outcome: "refused_name",
        refusal: problem,
      };
    mkdirResult = await mkdir(dirname(targetPath), {
      recursive: true,
    });
  } catch (error) {
    if (OCCUPIED_PATH_ERRNOS.has(getErrnoCode(error)))
      return {
        outcome: "path_occupied",
      };
    throw error;
  }
  return await withPinnedDirPath(dirname(targetPath), async (pinnedDir, resolveDir) => {
    let problem = homeTargetProblem(realHome, await resolveDir(), targetPath, judgedPaths);
    if (problem !== undefined)
      return {
        outcome: "refused_name",
        refusal: problem,
      };
    let sourceHandle = await open(sourcePath, NOFOLLOW_NONBLOCK_FLAGS | READ_LIMITS);
    try {
      if (!(await sourceHandle.stat()).isFile()) {
        let error = Error("the source of a home file is not a regular file");
        error.code = "HOME_SOURCE_NOT_REGULAR";
        throw error;
      }
      await sourceHandle.chmod(HOME_FILE_MODE);
      let targetPath_2 = join(pinnedDir, basename(targetPath));
      let identity = await linkIntoHome(sourcePath, sourceHandle, targetPath_2, HOME_FILE_MODE);
      if (identity === undefined)
        return (
          (await existingTargetState(targetPath_2)) ?? {
            outcome: "path_occupied",
          }
        );
      let problem = homeTargetProblem(realHome, await resolveDir(), targetPath, judgedPaths);
      if (problem !== undefined) {
        await removeIfUnchanged(targetPath_2, identity);
        return {
          outcome: "refused_name",
          refusal: problem,
        };
      }
      return {
        outcome: "placed",
        ...(mkdirResult !== undefined && {
          madeDirectory: mkdirResult,
        }),
      };
    } finally {
      await sourceHandle.close();
    }
  });
}
export {
  homePathProblem,
  MAX_HOME_FILE_NAME_LENGTH,
  removeIfUnchanged,
  checkHomeTarget,
  publishHomeFile,
  NON_ASCII_NAME_CHARS_RE,
  CONTROL_OR_FORMAT_CHARS_RE,
  linkIntoHome,
  homeFileNameProblem,
};
