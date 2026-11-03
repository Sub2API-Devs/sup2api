/**
 * utils/filePersistence/homeFilePublish.ts
 *
 * 2.1.316 新增：发布文件到用户主目录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jjyx5tf2.js (16)
 * attribution: placement 16
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

//@ chunk-jjyx5tf2.js:920-1376 placement
/**
 * home 目录发布用的路径工具（basename/dirname/join/relative/sep 的绑定与平台分隔符），同语句还定义了指令文件名、厂商目录名等集合。
 */
var { basename, dirname, join, relative, sep } = posix;
var INSTRUCTION_FILE_BASENAMES = new Set(["claude.md", "claude.local.md", "agent.md"]);
var VENDOR_DIR_NAMES = new Set([
  "head",
  "commondir",
  "node_modules",
  "site-packages",
  "dist-packages",
  "__pycache__",
]);
var GIT_CONFIG_FILE_NAMES = new Set(["config", "config.worktree"]);
var PYTHON_USER_CUSTOMIZE_NAMES = new Set(["sitecustomize", "usercustomize"]);
var NON_ASCII_NAME_CHARS_RE = /[^\P{ASCII}\w .()+,=@#%[\]-]/u;
var regExp = new RegExp(`^-|\\s-\\S|${NON_ASCII_NAME_CHARS_RE.source}`, "u");
var CONTROL_OR_FORMAT_CHARS_RE =
  /[\p{Cc}\p{Zl}\p{Zp}]|(?![\u200c\u200d])\p{Cf}|(?:^|\p{ASCII})[\u200c\u200d]/u;
var MAX_HOME_FILE_NAME_LENGTH = 255;
//@ chunk-jjyx5tf2.js:1376-1667 placement
function homeFileNameProblem(e, t) {
  let n = foldName(e);
  if (n.startsWith(".")) return "dot_name";
  if (INSTRUCTION_FILE_BASENAMES.has(n) || INSTRUCTION_FILE_NAMES.has(n) || e === "ARCHITECTURE.md")
    return "instruction_file";
  if (
    VENDOR_DIR_NAMES.has(n) ||
    PYTHON_USER_CUSTOMIZE_NAMES.has(firstLineOf(n, ".")) ||
    (t && (DANGEROUS_FILES_LOWER.has(n) || GIT_CONFIG_FILE_NAMES.has(n)))
  )
    return "unsafe_name";
  if (
    hasTrailingOrReservedName(e) ||
    DOS_TILDE_RE.test(e) ||
    regExp.test(e) ||
    CONTROL_OR_FORMAT_CHARS_RE.test(e)
  )
    return "odd_spelling";
  return;
}
//@ chunk-jjyx5tf2.js:1667-1786 placement
function homePathProblem(e) {
  let parts = e.split(sep);
  for (let [n, i] of parts.entries()) {
    let r = homeFileNameProblem(i, n === parts.length - 1);
    if (r !== undefined) return r;
  }
  return;
}
//@ chunk-jjyx5tf2.js:1786-1904 placement
async function realpathOfAncestor(e) {
  try {
    return await realpath(e);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT" || dirname(e) === e) throw error;
    return join(await realpathOfAncestor(dirname(e)), basename(e));
  }
}
//@ chunk-jjyx5tf2.js:1904-2090 placement
function homeTargetProblem(e, t, n, i) {
  if (!isAtOrUnderRoot(e, t)) return "outside_home";
  let r = join(t, basename(n));
  return (
    homePathProblem(relative(e, r)) ??
    (checkPathSafetyForAutoEdit(n, [n, r]).safe ? undefined : "write_would_ask") ??
    (i === undefined || i.includes(r) ? undefined : "not_as_judged")
  );
}
//@ chunk-jjyx5tf2.js:2090-2135 placement
var OCCUPIED_PATH_ERRNOS = new Set(["EEXIST", "ENOTDIR", "ENOENT"]);
//@ chunk-jjyx5tf2.js:2135-2275 placement
async function existingTargetState(e) {
  try {
    return {
      outcome: (await lstat(e)).isFile() ? "already_present" : "path_occupied",
    };
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return;
    throw error;
  }
}
//@ chunk-jjyx5tf2.js:2275-2505 placement
async function checkHomeTarget(e, t) {
  let n = join(e, t);
  let i = await realpath(e);
  try {
    let r = homePathProblem(t) ?? homeTargetProblem(i, await realpathOfAncestor(dirname(n)), n, undefined);
    return r === undefined
      ? await existingTargetState(n)
      : {
          outcome: "refused_name",
          refusal: r,
        };
  } catch (error) {
    if (getErrnoCode(error) === "ENOTDIR")
      return {
        outcome: "path_occupied",
      };
    throw error;
  }
}
//@ chunk-jjyx5tf2.js:2505-2925 placement
async function linkIntoHome(e, t, n, i) {
  try {
    await link(e, n);
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return;
    if (!isNonRetryableFsError(error) && getErrnoCode(error) !== "EXDEV") throw error;
    return await createExclusive(t, n, i);
  }
  let [r, o] = await Promise.all([t.stat(), lstat(n)]);
  if (getFileIdentity(o, r)) return r;
  let u = await statOrUndefined(lstat(e));
  if (getFileIdentity(u, r)) return;
  for (let s of [u, await statOrUndefined(stat(e))])
    if (s !== undefined && (await removeIfUnchanged(n, s))) break;
  let a = Error("the source of a home file was exchanged while it was published");
  a.code = "HOME_SOURCE_EXCHANGED";
  throw a;
}
//@ chunk-jjyx5tf2.js:2925-2978 placement = getFileIdentity (0.794)
function getFileIdentity(e, t) {
  return e?.ino === t.ino && e.dev === t.dev;
}
//@ chunk-jjyx5tf2.js:2978-3061 placement
async function statOrUndefined(e) {
  try {
    return await e;
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return;
    throw error;
  }
}
//@ chunk-jjyx5tf2.js:3061-3185 placement
async function removeIfUnchanged(e, t) {
  try {
    if (!getFileIdentity(await statOrUndefined(lstat(e)), t)) return false;
    await unlink(e);
    return true;
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") logError(error);
    return false;
  }
}
//@ chunk-jjyx5tf2.js:3185-3585 placement
async function createExclusive(e, t, n) {
  let i;
  try {
    i = await open(t, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS, n);
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return;
    throw error;
  }
  let r;
  try {
    r = await i.stat();
    try {
      await i.chmod(n);
    } catch (error) {
      if (!isUnsupportedFlagError(error)) throw error;
    }
    await pipeline(
      e.createReadStream({
        start: 0,
        autoClose: false,
      }),
      i.createWriteStream(),
    );
    return getFileIdentity(await lstat(t), r) ? r : undefined;
  } catch (error) {
    await i.close().catch(() => {});
    await (r === undefined ? unlink(t).catch(() => {}) : removeIfUnchanged(t, r));
    throw error;
  }
}
//@ chunk-jjyx5tf2.js:3585-3776 placement
async function withPinnedDirPath(e, t) {
  if (getPlatform() !== "linux") return t(e, () => realpath(e));
  let n = await open(e, constants.O_RDONLY | constants.O_DIRECTORY | READ_LIMITS);
  try {
    let i = `/proc/self/fd/${n.fd}`;
    return await t(i, () => readlink(i));
  } finally {
    await n.close();
  }
}
//@ chunk-jjyx5tf2.js:3776-3786 placement
var HOME_FILE_MODE = 420;
//@ chunk-jjyx5tf2.js:3786-4602 placement
/**
 * 把文件发布到用户主目录下的目标路径：校验路径分段、避免覆盖已变化的文件。
 */
async function publishHomeFile(e, t, n, i) {
  let r = join(t, n);
  let o = await realpath(t);
  let u;
  try {
    let a = homePathProblem(n) ?? homeTargetProblem(o, await realpathOfAncestor(dirname(r)), r, i);
    if (a !== undefined)
      return {
        outcome: "refused_name",
        refusal: a,
      };
    u = await mkdir(dirname(r), {
      recursive: true,
    });
  } catch (error) {
    if (OCCUPIED_PATH_ERRNOS.has(getErrnoCode(error)))
      return {
        outcome: "path_occupied",
      };
    throw error;
  }
  return await withPinnedDirPath(dirname(r), async (a, s) => {
    let y = homeTargetProblem(o, await s(), r, i);
    if (y !== undefined)
      return {
        outcome: "refused_name",
        refusal: y,
      };
    let p = await open(e, NOFOLLOW_NONBLOCK_FLAGS | READ_LIMITS);
    try {
      if (!(await p.stat()).isFile()) {
        let F = Error("the source of a home file is not a regular file");
        F.code = "HOME_SOURCE_NOT_REGULAR";
        throw F;
      }
      await p.chmod(HOME_FILE_MODE);
      let h = join(a, basename(r));
      let N = await linkIntoHome(e, p, h, HOME_FILE_MODE);
      if (N === undefined)
        return (
          (await existingTargetState(h)) ?? {
            outcome: "path_occupied",
          }
        );
      let T = homeTargetProblem(o, await s(), r, i);
      if (T !== undefined) {
        await removeIfUnchanged(h, N);
        return {
          outcome: "refused_name",
          refusal: T,
        };
      }
      return {
        outcome: "placed",
        ...(u !== undefined && {
          madeDirectory: u,
        }),
      };
    } finally {
      await p.close();
    }
  });
}
export {
  checkHomeTarget,
  removeIfUnchanged,
  publishHomeFile,
  NON_ASCII_NAME_CHARS_RE,
  CONTROL_OR_FORMAT_CHARS_RE,
  linkIntoHome,
  homeFileNameProblem,
  homePathProblem,
  MAX_HOME_FILE_NAME_LENGTH,
};
