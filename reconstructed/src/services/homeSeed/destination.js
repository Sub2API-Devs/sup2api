/**
 * services/homeSeed/destination.ts
 *
 * 2.1.316 新增：home seed 目标位置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-twq47pff.js (11)
 * attribution: placement 11
 */
import { stat, realpath, mkdir, lstat } from "fs/promises";
import { dirname, basename, join, relative, sep, resolve, posix } from "path";
import { SETTINGS_JSON, classifyWorkingFile, RULES, OUTPUT_STYLES } from "./workingFiles.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { isSettingsToCloudAvailable } from "../../cli/remoteIO/workerAuth.js";
import { SYNCED_FILE_MODE, writeUnderSyncDir, shouldIgnore } from "../syncedFiles/syncedFileSyncer.js";
import { getErrnoCode, isENOENT } from "../../utils/errors.js";

//@ chunk-twq47pff.js:32742-32760 placement
/**
 * 表示“被闸门拒绝”的 HTTP 状态码（409）。
 */
var GATED_STATUS_CODE = 501;
var GATED_STATUS_CODE_2 = 409;
//@ chunk-twq47pff.js:32760-32925 placement
function classifyRowError(t) {
  if (t.errorKind === "auth") return "auth";
  if (t.errorKind === "gated" || t.status === GATED_STATUS_CODE || t.status === GATED_STATUS_CODE_2)
    return "refused";
  return t.retryable ? "transport" : "rejected";
}
//@ chunk-twq47pff.js:33217-33280 placement
/**
 * 判断路径是否存在（stat 成功即存在）。
 */
async function existsOnDisk(t) {
  try {
    await stat(t);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-twq47pff.js:33280-33535 placement
/**
 * 求目标路径相对于真实 home 的拼写：从最近的存在祖先求真实路径再拼回，落在 home 之外返回 null。
 */
async function resolveDestinationSpelling(homeReal, destPath) {
  try {
    let n = dirname(destPath);
    let l = [];
    while (!(await existsOnDisk(n))) {
      l.unshift(basename(n));
      let v = dirname(n);
      if (v === n) return null;
      n = v;
    }
    let d = await realpath(n);
    let u = join(d, ...l, basename(destPath));
    let w = relative(homeReal, u);
    if (w === "" || w.startsWith("..")) return null;
    return w.split(sep).join("/");
  } catch {
    return null;
  }
}
//@ chunk-twq47pff.js:33708-33965 placement
function getStorageSpaceForPath(t) {
  if (t === SETTINGS_JSON) return STORAGE_SPACES.userSettings();
  let e = classifyWorkingFile(t);
  let [, ...n] = t.split("/");
  switch (e) {
    case null:
      return null;
    case "claude_md":
      return STORAGE_SPACES.state("user-memory");
    case "rule":
      return STORAGE_SPACES.userConfigDir(RULES, n);
    case "output_style":
      return STORAGE_SPACES.userConfigDir(OUTPUT_STYLES, n);
  }
}
//@ chunk-twq47pff.js:33965-34840 placement
/**
 * 创建写 home 文件的函数：开关未开时抛 HOME_DEST_FLAG_OFF；启用存储 v5 时校验 home 一致并把可识别的文件原子写入存储后端（失败转为 HOME_STORAGE_* 错误码），其余走普通写入。
 */
function createHomeFileWriter({
  storageV5,
  flagOn,
  configHome,
  settingsToCloud = isSettingsToCloudAvailable,
}) {
  let guardFlag = (writeSyncFileReplacing) => async (v, P, E) => {
    if (!(await settingsToCloud().catch(() => false)))
      throw withErrorCode(Error("settings forwarding is not enabled for this account"), "HOME_DEST_FLAG_OFF");
    return writeSyncFileReplacing(v, P, E);
  };
  if (!flagOn || storageV5 === undefined) return guardFlag(writeSyncFileReplacing);
  let configHomeResolved = resolve(configHome);
  return guardFlag(async (w, v, P) => {
    if (resolve(w) !== configHomeResolved)
      throw withErrorCode(
        Error("destination names a config home the backend does not address"),
        "HOME_DEST_HOME_MISMATCH",
      );
    let joined = relative(w, v).split(sep).join(posix.sep);
    let space = getStorageSpaceForPath(joined);
    if (space === null) return writeSyncFileReplacing(w, v, P);
    await vetHomeDestination(w, v);
    let j = await storageV5.write(space, P, {
      publishDiscipline: "atomic",
      mode: SYNCED_FILE_MODE,
      precondition: {
        type: "none",
      },
      parent: "mustExist",
    });
    if (!j.ok) {
      let { error } = j;
      throw withErrorCode(
        Error("storage backend refused the write"),
        error.code === "Failed"
          ? `HOME_STORAGE_FAILED_${error.failureClass.toUpperCase()}${error.telemetryCode === undefined ? "" : `_${error.telemetryCode.toUpperCase()}`}`
          : `HOME_STORAGE_${error.code.toUpperCase()}`,
      );
    }
  });
}
//@ chunk-twq47pff.js:34840-34887 placement
/**
 * 以替换方式写入同步目录下的文件。
 */
function writeSyncFileReplacing(t, e, n) {
  return writeUnderSyncDir(t, e, n, "replace");
}
//@ chunk-twq47pff.js:34887-35710 placement
/**
 * 校验写入目标：名字不能被忽略，父目录真实路径必须在 config home 内，目标不能是符号链接、目录或硬链接。
 */
async function vetHomeDestination(t, e) {
  if (shouldIgnore(relative(t, e)))
    throw withErrorCode(Error("destination name is one the lane writer ignores"), "HOME_DEST_IGNORED");
  await mkdir(t).catch((error) => {
    if (getErrnoCode(error) !== "EEXIST") throw error;
  });
  let realHome = await realpath(t);
  await vetDestinationAncestors(realHome, dirname(e));
  await mkdir(dirname(e), {
    recursive: true,
  });
  let realParent = await realpath(dirname(e));
  if (
    !isPathInsideDir({
      path: realParent,
      directory: realHome,
    })
  )
    throw withErrorCode(Error("destination parent escaped the config home"), "HOME_DEST_PARENT_ESCAPE");
  if (shouldIgnore(relative(realHome, join(realParent, basename(e)))))
    throw withErrorCode(Error("destination resolves to a name the lane writer ignores"), "HOME_DEST_IGNORED");
  try {
    let d = await lstat(e);
    if (d.isSymbolicLink()) throw withErrorCode(Error("destination is a symlink"), "HOME_DEST_SYMLINK");
    if (d.isDirectory()) throw withErrorCode(Error("destination is a directory"), "HOME_DEST_IS_DIRECTORY");
    if (d.nlink > 1)
      throw withErrorCode(Error("destination is hard-linked elsewhere"), "HOME_DEST_HARD_LINKED");
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
}
//@ chunk-twq47pff.js:35710-36085 placement
/**
 * 从目标向上找第一个存在的祖先，确认其真实路径在 config home 内且名字不会被忽略。
 */
async function vetDestinationAncestors(realHome, e) {
  let n = e;
  for (;;)
    try {
      let l = await realpath(n);
      if (
        !isPathInsideDir({
          path: l,
          directory: realHome,
        })
      )
        throw withErrorCode(Error("destination ancestor escaped the config home"), "HOME_DEST_PARENT_ESCAPE");
      if (shouldIgnore(relative(realHome, l)))
        throw withErrorCode(
          Error("destination ancestor resolves to a name the lane writer ignores"),
          "HOME_DEST_IGNORED",
        );
      return;
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") throw error;
      let d = dirname(n);
      if (d === n) throw error;
      n = d;
    }
}
//@ chunk-twq47pff.js:36085-36169 placement
/**
 * 判断路径是否等于或在目录之内（考虑分隔符）。
 */
function isPathInsideDir({ path, directory }) {
  return path === directory || path.startsWith(directory.endsWith(sep) ? directory : directory + sep);
}
//@ chunk-twq47pff.js:36169-36204 placement
/**
 * 给错误对象加上 code 后返回。
 */
function withErrorCode(t, code) {
  t.code = code;
  return t;
}
export { classifyRowError, createHomeFileWriter, resolveDestinationSpelling };
