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
import { qEr, VEr } from "../windowsProfileFolders.js";
import { getErrnoCode } from "../errors.js";
import { isAtOrUnderRoot } from "../stageFileRoots.js";
import { R7s } from "../../services/memorySync/syncFiles.js";
import { logError } from "../log.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { isUnsupportedFlagError } from "../atomicPublishWrite.js";
import { getPlatform } from "../platform.js";
import { ws } from "../fsFlags.js";

//@ chunk-jjyx5tf2.js:920-1376 placement
var { basename: basename, dirname: dirname, join: join, relative: relative, sep: sep } = posix,
  X = new Set(["claude.md", "claude.local.md", "agent.md"]),
  W = new Set(["head", "commondir", "node_modules", "site-packages", "dist-packages", "__pycache__"]),
  Y = new Set(["config", "config.worktree"]),
  v = new Set(["sitecustomize", "usercustomize"]),
  qAo = /[^\P{ASCII}\w .()+,=@#%[\]-]/u,
  regExp = new RegExp(`^-|\\s-\\S|${qAo.source}`, "u"),
  YAo = /[\p{Cc}\p{Zl}\p{Zp}]|(?![\u200c\u200d])\p{Cf}|(?:^|\p{ASCII})[\u200c\u200d]/u,
  PGn = 255;
//@ chunk-jjyx5tf2.js:1376-1667 placement
function homeFileNameProblem(e, t) {
  let n = foldName(e);
  if (n.startsWith(".")) return "dot_name";
  if (X.has(n) || INSTRUCTION_FILE_NAMES.has(n) || e === "ARCHITECTURE.md") return "instruction_file";
  if (W.has(n) || v.has(firstLineOf(n, ".")) || (t && (DANGEROUS_FILES_LOWER.has(n) || Y.has(n))))
    return "unsafe_name";
  if (qEr(e) || VEr.test(e) || regExp.test(e) || YAo.test(e)) return "odd_spelling";
  return;
}
//@ chunk-jjyx5tf2.js:1667-1786 placement
function homePathProblem(e) {
  let parts = e.split(sep);
  for (let [n, i] of parts.entries()) {
    let r = homeFileNameProblem(i, n === parts.length - 1);
    if (r !== void 0) return r;
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
    (checkPathSafetyForAutoEdit(n, [n, r]).safe ? void 0 : "write_would_ask") ??
    (i === void 0 || i.includes(r) ? void 0 : "not_as_judged")
  );
}
//@ chunk-jjyx5tf2.js:2090-2135 placement
var z = new Set(["EEXIST", "ENOTDIR", "ENOENT"]);
//@ chunk-jjyx5tf2.js:2135-2275 placement
async function existingTargetState(e) {
  try {
    return { outcome: (await lstat(e)).isFile() ? "already_present" : "path_occupied" };
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return;
    throw error;
  }
}
//@ chunk-jjyx5tf2.js:2275-2505 placement
async function checkHomeTarget(e, t) {
  let n = join(e, t),
    i = await realpath(e);
  try {
    let r = homePathProblem(t) ?? homeTargetProblem(i, await realpathOfAncestor(dirname(n)), n, void 0);
    return r === void 0 ? await existingTargetState(n) : { outcome: "refused_name", refusal: r };
  } catch (error) {
    if (getErrnoCode(error) === "ENOTDIR") return { outcome: "path_occupied" };
    throw error;
  }
}
//@ chunk-jjyx5tf2.js:2505-2925 placement
async function linkIntoHome(e, t, n, i) {
  try {
    await link(e, n);
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return;
    if (!R7s(error) && getErrnoCode(error) !== "EXDEV") throw error;
    return await createExclusive(t, n, i);
  }
  let [r, o] = await Promise.all([t.stat(), lstat(n)]);
  if (getFileIdentity(o, r)) return r;
  let u = await S(lstat(e));
  if (getFileIdentity(u, r)) return;
  for (let s of [u, await S(stat(e))]) if (s !== void 0 && (await removeIfUnchanged(n, s))) break;
  let a = Error("the source of a home file was exchanged while it was published");
  throw ((a.code = "HOME_SOURCE_EXCHANGED"), a);
}
//@ chunk-jjyx5tf2.js:2925-2978 placement = getFileIdentity (0.794)
function getFileIdentity(e, t) {
  return e?.ino === t.ino && e.dev === t.dev;
}
//@ chunk-jjyx5tf2.js:2978-3061 placement
async function S(e) {
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
    if (!getFileIdentity(await S(lstat(e)), t)) return !1;
    return (await unlink(e), !0);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") logError(error);
    return !1;
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
    return (
      await pipeline(e.createReadStream({ start: 0, autoClose: !1 }), i.createWriteStream()),
      getFileIdentity(await lstat(t), r) ? r : void 0
    );
  } catch (error) {
    throw (
      await i.close().catch(() => {}),
      await (r === void 0 ? unlink(t).catch(() => {}) : removeIfUnchanged(t, r)),
      error
    );
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
var H = 420;
/**
 * 把文件发布到用户主目录下的目标路径：校验路径分段、避免覆盖已变化的文件。
 */
//@ chunk-jjyx5tf2.js:3786-4602 placement
async function publishHomeFile(e, t, n, i) {
  let r = join(t, n),
    o = await realpath(t),
    u;
  try {
    let a = homePathProblem(n) ?? homeTargetProblem(o, await realpathOfAncestor(dirname(r)), r, i);
    if (a !== void 0) return { outcome: "refused_name", refusal: a };
    u = await mkdir(dirname(r), { recursive: !0 });
  } catch (error) {
    if (z.has(getErrnoCode(error))) return { outcome: "path_occupied" };
    throw error;
  }
  return await withPinnedDirPath(dirname(r), async (a, s) => {
    let y = homeTargetProblem(o, await s(), r, i);
    if (y !== void 0) return { outcome: "refused_name", refusal: y };
    let p = await open(e, ws | READ_LIMITS);
    try {
      if (!(await p.stat()).isFile()) {
        let F = Error("the source of a home file is not a regular file");
        throw ((F.code = "HOME_SOURCE_NOT_REGULAR"), F);
      }
      await p.chmod(H);
      let h = join(a, basename(r)),
        N = await linkIntoHome(e, p, h, H);
      if (N === void 0) return (await existingTargetState(h)) ?? { outcome: "path_occupied" };
      let T = homeTargetProblem(o, await s(), r, i);
      if (T !== void 0) return (await removeIfUnchanged(h, N), { outcome: "refused_name", refusal: T });
      return { outcome: "placed", ...(u !== void 0 && { madeDirectory: u }) };
    } finally {
      await p.close();
    }
  });
}

export {
  checkHomeTarget,
  removeIfUnchanged,
  publishHomeFile,
  qAo,
  YAo,
  linkIntoHome,
  homeFileNameProblem,
  homePathProblem,
  PGn,
};
