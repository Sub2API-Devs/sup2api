/**
 * utils/tempDirRealpaths.ts
 *
 * 2.1.316 新增：临时目录真实路径
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (5)
 * attribution: placement 5
 */
import { sep as sep_2, join as join_2, join as join_3, join as join_4 } from "path";
import { getSessionPathsCache } from "./sessionPathsCache.js";
import { isDiskless, getOriginalCwd } from "../bootstrap/state.js";
import { claudeTempDir, childProcessTmpDir } from "./tempDir.js";
import { getFsImplementation, findIntermediateUncJunction, NodeFsOperations } from "./fsOperations.js";
import { sanitizePath } from "./sessionStoragePortable.js";
import { ai, yl } from "./networkPaths.js";

/**
 * 取 Claude 临时目录的真实路径（带分隔符结尾），有盘时缓存。
 */
//@ chunk-g54kbxqw.js:46174-46353 placement
function getClaudeTempDirRealpath() {
  let e = getSessionPathsCache();
  if (e.claudeTempDir !== void 0 && !isDiskless()) return e.claudeTempDir;
  let n = claudeTempDir(),
    s = getFsImplementation(),
    r = n;
  try {
    r = s.realpathSync(n);
  } catch {}
  return ((e.claudeTempDir = r + sep_2), e.claudeTempDir);
}
/**
 * 取子进程临时目录的真实路径（带分隔符结尾），有盘时缓存。
 */
//@ chunk-g54kbxqw.js:46353-46554 placement
function getChildProcessTmpDirRealpath() {
  let e = getSessionPathsCache();
  if (e.childProcessTmpDir !== void 0 && !isDiskless()) return e.childProcessTmpDir;
  let n = childProcessTmpDir(),
    s = getFsImplementation(),
    r = n;
  try {
    r = s.realpathSync(n);
  } catch {}
  return ((e.childProcessTmpDir = r + sep_2), e.childProcessTmpDir);
}
//@ chunk-g54kbxqw.js:46554-46585 placement
function Sx() {
  return nkn(getOriginalCwd());
}
//@ chunk-g54kbxqw.js:46585-46626 placement
function nkn(e) {
  return join_3(getClaudeTempDirRealpath(), sanitizePath(e)) + sep_2;
}
//@ chunk-g54kbxqw.js:46626-46742 placement = normalizeFilePath (1)
function normalizeFilePath(filePath) {
  if (ai(filePath) || yl(filePath) || findIntermediateUncJunction(NodeFsOperations, filePath) !== void 0)
    return filePath;
  let fs = getFsImplementation();
  try {
    return fs.realpathSync(filePath);
  } catch {
    return filePath;
  }
}

export { Sx, getClaudeTempDirRealpath, nkn, normalizeFilePath, getChildProcessTmpDirRealpath };
