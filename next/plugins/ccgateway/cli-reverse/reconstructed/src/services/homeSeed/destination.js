/**
 * services/homeSeed/destination.ts
 *
 * 2.1.316 新增：home seed 目标位置
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9x09krra.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { stat, realpath, mkdir, lstat } from "fs/promises";
import { dirname, basename, join, relative, sep, resolve, posix } from "path";
import { SETTINGS_JSON, classifyWorkingFile, RULES, OUTPUT_STYLES } from "./workingFiles.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { isSettingsToCloudAvailable } from "../../cli/remoteIO/workerAuth.js";
import { SYNCED_FILE_MODE, writeUnderSyncDir, shouldIgnore } from "../syncedFiles/syncedFileSyncer.js";
import { getErrnoCode, isENOENT } from "../../utils/errors.js";

//@ chunk-9x09krra.js:33905-33923 placement
/**
 * 表示“被闸门拒绝”的 HTTP 状态码（409）。
 */
var GATED_STATUS_CODE = 501;
var GATED_STATUS_CODE_2 = 409;
//@ chunk-9x09krra.js:33923-34088 placement
function classifyRowError(row) {
  if (row.errorKind === "auth") return "auth";
  if (row.errorKind === "gated" || row.status === GATED_STATUS_CODE || row.status === GATED_STATUS_CODE_2)
    return "refused";
  return row.retryable ? "transport" : "rejected";
}
//@ chunk-9x09krra.js:34380-34443 placement
/**
 * 判断路径是否存在（stat 成功即存在）。
 */
async function existsOnDisk(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-9x09krra.js:34443-34698 placement
/**
 * 求目标路径相对于真实 home 的拼写：从最近的存在祖先求真实路径再拼回，落在 home 之外返回 null。
 */
async function resolveDestinationSpelling(homeReal, destPath) {
  try {
    let dir = dirname(destPath);
    let missingParts = [];
    while (!(await existsOnDisk(dir))) {
      missingParts.unshift(basename(dir));
      let parent = dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
    let realDir = await realpath(dir);
    let resolved = join(realDir, ...missingParts, basename(destPath));
    let rel = relative(homeReal, resolved);
    if (rel === "" || rel.startsWith("..")) return null;
    return rel.split(sep).join("/");
  } catch {
    return null;
  }
}
//@ chunk-9x09krra.js:34871-35128 placement
function getStorageSpaceForPath(relPath) {
  if (relPath === SETTINGS_JSON) return STORAGE_SPACES.userSettings();
  let entry = classifyWorkingFile(relPath);
  let [, ...spaces] = relPath.split("/");
  switch (entry) {
    case null:
      return null;
    case "claude_md":
      return STORAGE_SPACES.state("user-memory");
    case "rule":
      return STORAGE_SPACES.userConfigDir(RULES, spaces);
    case "output_style":
      return STORAGE_SPACES.userConfigDir(OUTPUT_STYLES, spaces);
  }
}
//@ chunk-9x09krra.js:35128-36003 placement
/**
 * 创建写 home 文件的函数：开关未开时抛 HOME_DEST_FLAG_OFF；启用存储 v5 时校验 home 一致并把可识别的文件原子写入存储后端（失败转为 HOME_STORAGE_* 错误码），其余走普通写入。
 */
function createHomeFileWriter({
  storageV5,
  flagOn,
  configHome,
  settingsToCloud = isSettingsToCloudAvailable,
}) {
  let guardFlag = (writeSyncFileReplacing) => async (home, filePath, data) => {
    if (!(await settingsToCloud().catch(() => false)))
      throw withErrorCode(Error("settings forwarding is not enabled for this account"), "HOME_DEST_FLAG_OFF");
    return writeSyncFileReplacing(home, filePath, data);
  };
  if (!flagOn || storageV5 === undefined) return guardFlag(writeSyncFileReplacing);
  let configHomeResolved = resolve(configHome);
  return guardFlag(async (home, filePath, data) => {
    if (resolve(home) !== configHomeResolved)
      throw withErrorCode(
        Error("destination names a config home the backend does not address"),
        "HOME_DEST_HOME_MISMATCH",
      );
    let relPath = relative(home, filePath).split(sep).join(posix.sep);
    let space = getStorageSpaceForPath(relPath);
    if (space === null) return writeSyncFileReplacing(home, filePath, data);
    await vetHomeDestination(home, filePath);
    let writeResult = await storageV5.write(space, data, {
      publishDiscipline: "atomic",
      mode: SYNCED_FILE_MODE,
      precondition: {
        type: "none",
      },
      parent: "mustExist",
    });
    if (!writeResult.ok) {
      let { error } = writeResult;
      throw withErrorCode(
        Error("storage backend refused the write"),
        error.code === "Failed"
          ? `HOME_STORAGE_FAILED_${error.failureClass.toUpperCase()}${error.telemetryCode === undefined ? "" : `_${error.telemetryCode.toUpperCase()}`}`
          : `HOME_STORAGE_${error.code.toUpperCase()}`,
      );
    }
  });
}
//@ chunk-9x09krra.js:36003-36050 placement
/**
 * 以替换方式写入同步目录下的文件。
 */
function writeSyncFileReplacing(configHome, relPath, content) {
  return writeUnderSyncDir(configHome, relPath, content, "replace");
}
//@ chunk-9x09krra.js:36050-36873 placement
/**
 * 校验写入目标：名字不能被忽略，父目录真实路径必须在 config home 内，目标不能是符号链接、目录或硬链接。
 */
async function vetHomeDestination(configHome, dest) {
  if (shouldIgnore(relative(configHome, dest)))
    throw withErrorCode(Error("destination name is one the lane writer ignores"), "HOME_DEST_IGNORED");
  await mkdir(configHome).catch((error) => {
    if (getErrnoCode(error) !== "EEXIST") throw error;
  });
  let realHome = await realpath(configHome);
  await vetDestinationAncestors(realHome, dirname(dest));
  await mkdir(dirname(dest), {
    recursive: true,
  });
  let realParent = await realpath(dirname(dest));
  if (
    !isPathInsideDir({
      path: realParent,
      directory: realHome,
    })
  )
    throw withErrorCode(Error("destination parent escaped the config home"), "HOME_DEST_PARENT_ESCAPE");
  if (shouldIgnore(relative(realHome, join(realParent, basename(dest)))))
    throw withErrorCode(Error("destination resolves to a name the lane writer ignores"), "HOME_DEST_IGNORED");
  try {
    let err = await lstat(dest);
    if (err.isSymbolicLink()) throw withErrorCode(Error("destination is a symlink"), "HOME_DEST_SYMLINK");
    if (err.isDirectory()) throw withErrorCode(Error("destination is a directory"), "HOME_DEST_IS_DIRECTORY");
    if (err.nlink > 1)
      throw withErrorCode(Error("destination is hard-linked elsewhere"), "HOME_DEST_HARD_LINKED");
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
}
//@ chunk-9x09krra.js:36873-37248 placement
/**
 * 从目标向上找第一个存在的祖先，确认其真实路径在 config home 内且名字不会被忽略。
 */
async function vetDestinationAncestors(realHome, startPath) {
  let current = startPath;
  for (;;)
    try {
      let realPath = await realpath(current);
      if (
        !isPathInsideDir({
          path: realPath,
          directory: realHome,
        })
      )
        throw withErrorCode(Error("destination ancestor escaped the config home"), "HOME_DEST_PARENT_ESCAPE");
      if (shouldIgnore(relative(realHome, realPath)))
        throw withErrorCode(
          Error("destination ancestor resolves to a name the lane writer ignores"),
          "HOME_DEST_IGNORED",
        );
      return;
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") throw error;
      let parent = dirname(current);
      if (parent === current) throw error;
      current = parent;
    }
}
//@ chunk-9x09krra.js:37248-37332 placement
/**
 * 判断路径是否等于或在目录之内（考虑分隔符）。
 */
function isPathInsideDir({ path, directory }) {
  return path === directory || path.startsWith(directory.endsWith(sep) ? directory : directory + sep);
}
//@ chunk-9x09krra.js:37332-37367 placement
/**
 * 给错误对象加上 code 后返回。
 */
function withErrorCode(error, code) {
  error.code = code;
  return error;
}
export { classifyRowError, createHomeFileWriter, resolveDestinationSpelling };
