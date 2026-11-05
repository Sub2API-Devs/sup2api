/**
 * utils/tempDirRealpaths.ts
 *
 * 2.1.316 新增：临时目录真实路径
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (5)
 * attribution: placement 5
 */
import { sep as sep_2, join as join_2 } from "path";
import { getSessionPathsCache } from "./sessionPathsCache.js";
import { isDiskless, getOriginalCwd } from "../bootstrap/state.js";
import { claudeTempDir, childProcessTmpDir, projectTempDirName } from "./tempDir.js";
import { getFsImplementation, findIntermediateUncJunction, NodeFsOperations } from "./fsOperations.js";
import { sanitizePath } from "./sessionStoragePortable.js";
import { isNonWslUncPath, isNetworkMountRoot } from "./networkPaths.js";

//@ chunk-a2q0x549.js:229935-230114 placement
/**
 * 取 Claude 临时目录的真实路径（带分隔符结尾），有盘时缓存。
 */
function getClaudeTempDirRealpath() {
  let sessionPathsCache = getSessionPathsCache();
  if (sessionPathsCache.claudeTempDir !== undefined && !isDiskless()) return sessionPathsCache.claudeTempDir;
  let tempDir = claudeTempDir();
  let fsImplementation = getFsImplementation();
  let realTempDir = tempDir;
  try {
    realTempDir = fsImplementation.realpathSync(tempDir);
  } catch {}
  sessionPathsCache.claudeTempDir = realTempDir + sep_2;
  return sessionPathsCache.claudeTempDir;
}
//@ chunk-a2q0x549.js:230114-230315 placement
/**
 * 取子进程临时目录的真实路径（带分隔符结尾），有盘时缓存。
 */
function getChildProcessTmpDirRealpath() {
  let sessionPathsCache = getSessionPathsCache();
  if (sessionPathsCache.childProcessTmpDir !== undefined && !isDiskless())
    return sessionPathsCache.childProcessTmpDir;
  let tempDir = childProcessTmpDir();
  let fsImplementation = getFsImplementation();
  let realTempDir = tempDir;
  try {
    realTempDir = fsImplementation.realpathSync(tempDir);
  } catch {}
  sessionPathsCache.childProcessTmpDir = realTempDir + sep_2;
  return sessionPathsCache.childProcessTmpDir;
}
//@ chunk-a2q0x549.js:230315-230346 placement
/**
 * 会话临时目录的真实路径。
 */
function sessionTempDirRealpath() {
  return taskRootUnderTemp(getOriginalCwd());
}
//@ chunk-a2q0x549.js:230346-230392 placement
/**
 * 临时目录下按路径分目录的任务输出根。
 */
function taskRootUnderTemp(id) {
  return join_2(getClaudeTempDirRealpath(), projectTempDirName(sanitizePath(id))) + sep_2;
}
//@ chunk-a2q0x549.js:230392-230508 placement (2.1.88 match: normalizeFilePath, 1)
function normalizeFilePath(filePath) {
  if (
    isNonWslUncPath(filePath) ||
    isNetworkMountRoot(filePath) ||
    findIntermediateUncJunction(NodeFsOperations, filePath) !== undefined
  )
    return filePath;
  let fs = getFsImplementation();
  try {
    return fs.realpathSync(filePath);
  } catch {
    return filePath;
  }
}
export {
  sessionTempDirRealpath,
  getClaudeTempDirRealpath,
  taskRootUnderTemp,
  normalizeFilePath,
  getChildProcessTmpDirRealpath,
};
